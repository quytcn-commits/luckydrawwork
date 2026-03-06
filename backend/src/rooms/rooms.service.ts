import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room, RoomStatus } from './room.entity';
import { Prize } from '../draws/prize.entity';
import { Participant } from '../participants/participant.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(Prize) private prizeRepo: Repository<Prize>,
    @InjectRepository(Participant) private participantRepo: Repository<Participant>,
  ) {}

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async create(dto: any, adminId: string) {
    const code = this.generateCode();

    const room = this.roomRepo.create({
      code,
      eventName: dto.eventName,
      roomName: dto.roomName,
      description: dto.description,
      createdBy: dto.createdBy || 'Admin',
      formFields: dto.formFields || [
        { name: 'fullName', label: 'Họ và tên', type: 'text', required: true },
        { name: 'agency', label: 'Đại lý', type: 'text', required: true },
        { name: 'lastFourId', label: '4 số cuối CCCD', type: 'text', required: true },
      ],
      theme: dto.theme || null,
      logoUrl: dto.logoUrl,
      kvImageUrl: dto.kvImageUrl,
      adminId,
    });

    const savedRoom = await this.roomRepo.save(room);

    if (dto.prizes && dto.prizes.length > 0) {
      const prizes = dto.prizes.map((p: any, index: number) => {
        return this.prizeRepo.create({
          roomId: savedRoom.id,
          name: p.name,
          order: p.order ?? index + 1,
          winnerCount: p.winnerCount ?? 1,
          imageUrl: p.imageUrl,
        });
      });
      await this.prizeRepo.save(prizes);
    }

    return this.findById(savedRoom.id);
  }

  async findAll(adminId: string) {
    return this.roomRepo.find({
      where: { adminId },
      order: { createdAt: 'DESC' },
      relations: ['prizes'],
    });
  }

  async findByCode(code: string) {
    const room = await this.roomRepo.findOne({
      where: { code },
      relations: ['participants', 'prizes'],
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async findById(id: string) {
    const room = await this.roomRepo.findOne({
      where: { id },
      relations: ['participants', 'prizes'],
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async updateStatus(id: string, status: RoomStatus) {
    await this.roomRepo.update(id, { status });
    return this.findById(id);
  }

  async closeRegistration(id: string) {
    return this.updateStatus(id, RoomStatus.CLOSED);
  }

  async openRegistration(id: string) {
    return this.updateStatus(id, RoomStatus.OPEN);
  }

  async startDraw(id: string) {
    return this.updateStatus(id, RoomStatus.DRAWING);
  }

  async update(id: string, dto: any) {
    const room = await this.findById(id);
    if (dto.eventName !== undefined) room.eventName = dto.eventName;
    if (dto.roomName !== undefined) room.roomName = dto.roomName;
    if (dto.description !== undefined) room.description = dto.description;
    if (dto.logoUrl !== undefined) room.logoUrl = dto.logoUrl;
    if (dto.kvImageUrl !== undefined) room.kvImageUrl = dto.kvImageUrl;
    if (dto.theme !== undefined) room.theme = dto.theme;
    if (dto.formFields !== undefined) room.formFields = dto.formFields;
    await this.roomRepo.save(room);
    return this.findById(id);
  }

  async resetRoom(id: string) {
    await this.findById(id); // verify exists

    // Delete all participants
    await this.participantRepo.delete({ roomId: id });

    // Reset all prizes (clear winners, keep config)
    await this.prizeRepo
      .createQueryBuilder()
      .update(Prize)
      .set({ drawn: false, winnerId: () => 'NULL', winnerIds: () => 'NULL' })
      .where('roomId = :id', { id })
      .execute();

    // Reset room status to open
    await this.roomRepo.update(id, { status: RoomStatus.OPEN });

    return this.findById(id);
  }

  async resetDraws(id: string) {
    await this.findById(id); // verify exists

    // Reset winner status on participants (keep them in the room)
    await this.participantRepo
      .createQueryBuilder()
      .update(Participant)
      .set({ isWinner: false, prizeId: () => 'NULL' })
      .where('roomId = :id', { id })
      .execute();

    // Reset all prizes (clear winners, keep config)
    await this.prizeRepo
      .createQueryBuilder()
      .update(Prize)
      .set({ drawn: false, winnerId: () => 'NULL', winnerIds: () => 'NULL' })
      .where('roomId = :id', { id })
      .execute();

    // Reset room status to drawing (participants still registered)
    await this.roomRepo.update(id, { status: RoomStatus.DRAWING });

    return this.findById(id);
  }

  // Public endpoint: lightweight query, no participant loading
  async getPublicRoom(code: string) {
    const room = await this.roomRepo.findOne({
      where: { code },
      relations: ['prizes'],
    });
    if (!room) throw new NotFoundException('Room not found');

    const participantCount = await this.participantRepo.count({
      where: { roomId: room.id },
    });

    return {
      id: room.id,
      code: room.code,
      eventName: room.eventName,
      roomName: room.roomName,
      description: room.description,
      status: room.status,
      formFields: room.formFields,
      theme: room.theme,
      logoUrl: room.logoUrl,
      kvImageUrl: room.kvImageUrl,
      participantCount,
      prizes: room.prizes?.sort((a, b) => a.order - b.order),
    };
  }
}
