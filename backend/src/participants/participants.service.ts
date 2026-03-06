import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from './participant.entity';
import { Room, RoomStatus } from '../rooms/room.entity';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(Participant) private participantRepo: Repository<Participant>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
  ) {}

  async register(roomCode: string, data: Record<string, any>) {
    const room = await this.roomRepo.findOne({
      where: { code: roomCode },
    });

    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== RoomStatus.OPEN) {
      throw new BadRequestException('Đăng ký đã đóng');
    }

    // Validate required fields
    if (room.formFields) {
      for (const field of room.formFields) {
        if (field.required && !data[field.name]) {
          throw new BadRequestException(`${field.label} is required`);
        }
        // Validate 4-digit CCCD
        if ((field.name === 'lastFourId' || field.name.toLowerCase().includes('cccd')) && data[field.name]) {
          if (!/^\d{4}$/.test(String(data[field.name]))) {
            throw new BadRequestException('Vui lòng nhập đúng 4 số cuối CCCD (chỉ số, đúng 4 ký tự)');
          }
        }
      }
    }

    // Validate unique fields via DB query (not in-memory)
    if (room.formFields) {
      for (const field of room.formFields) {
        if (field.unique && data[field.name]) {
          const duplicate = await this.participantRepo
            .createQueryBuilder('p')
            .where('p.roomId = :roomId', { roomId: room.id })
            .andWhere("p.data ->> :fieldName = :value", {
              fieldName: field.name,
              value: String(data[field.name]),
            })
            .getOne();

          if (duplicate) {
            throw new BadRequestException(
              `${field.label} "${data[field.name]}" đã được đăng ký`,
            );
          }
        }
      }
    }

    const displayName = data.fullName || data.name || Object.values(data)[0] || 'Unknown';

    const participant = this.participantRepo.create({
      roomId: room.id,
      data,
      displayName: String(displayName),
    });

    return this.participantRepo.save(participant);
  }

  async getByRoom(roomId: string) {
    return this.participantRepo.find({
      where: { roomId },
      order: { createdAt: 'DESC' },
    });
  }

  async getCount(roomId: string) {
    return this.participantRepo.count({ where: { roomId } });
  }
}
