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
      relations: ['participants'],
    });

    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== RoomStatus.OPEN) {
      throw new BadRequestException('Registration is closed');
    }

    // Validate unique fields
    if (room.formFields) {
      for (const field of room.formFields) {
        if (field.unique && data[field.name]) {
          const duplicate = room.participants.find(
            (p) => p.data[field.name] === data[field.name],
          );
          if (duplicate) {
            throw new BadRequestException(
              `${field.label} "${data[field.name]}" already registered`,
            );
          }
        }
        if (field.required && !data[field.name]) {
          throw new BadRequestException(`${field.label} is required`);
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
