import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prize } from './prize.entity';
import { Participant } from '../participants/participant.entity';
import { Room, RoomStatus } from '../rooms/room.entity';
import * as crypto from 'crypto';

@Injectable()
export class DrawsService {
  constructor(
    @InjectRepository(Prize) private prizeRepo: Repository<Prize>,
    @InjectRepository(Participant) private participantRepo: Repository<Participant>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
  ) {}

  async drawPrize(roomId: string, prizeId: string) {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== RoomStatus.DRAWING && room.status !== RoomStatus.CLOSED) {
      throw new BadRequestException('Room is not in draw mode');
    }

    const prize = await this.prizeRepo.findOne({ where: { id: prizeId, roomId } });
    if (!prize) throw new NotFoundException('Prize not found');
    if (prize.drawn) throw new BadRequestException('Prize already drawn');

    // Get eligible participants (not yet winners)
    const eligible = await this.participantRepo.find({
      where: { roomId, isWinner: false },
    });

    if (eligible.length === 0) {
      throw new BadRequestException('No eligible participants');
    }

    const winnersNeeded = Math.min(prize.winnerCount, eligible.length);
    const winners: Participant[] = [];

    // Cryptographically secure random selection
    const pool = [...eligible];
    for (let i = 0; i < winnersNeeded; i++) {
      const randomBytes = crypto.randomBytes(4);
      const randomIndex = randomBytes.readUInt32BE(0) % pool.length;
      const winner = pool.splice(randomIndex, 1)[0];
      winners.push(winner);
    }

    // Update winners
    for (const winner of winners) {
      await this.participantRepo.update(winner.id, {
        isWinner: true,
        prizeId: prize.id,
      });
    }

    // Update prize
    await this.prizeRepo.update(prize.id, {
      drawn: true,
      winnerIds: winners.map((w) => w.id),
      winnerId: winners[0]?.id,
    });

    // Check if all prizes drawn
    const undrawnCount = await this.prizeRepo.count({
      where: { roomId, drawn: false },
    });
    if (undrawnCount === 0) {
      await this.roomRepo.update(roomId, { status: RoomStatus.FINISHED });
    }

    return {
      prize: { ...prize, drawn: true },
      winners: winners.map((w) => ({
        id: w.id,
        displayName: w.displayName,
        data: w.data,
      })),
    };
  }

  async getResults(roomId: string) {
    const prizes = await this.prizeRepo.find({
      where: { roomId },
      order: { order: 'ASC' },
    });

    const results: any[] = [];
    for (const prize of prizes) {
      let winners: Participant[] = [];
      if (prize.winnerIds && prize.winnerIds.length > 0) {
        winners = await this.participantRepo.find({
          where: prize.winnerIds.map((id) => ({ id })),
        });
      }
      results.push({
        prize: { id: prize.id, name: prize.name, order: prize.order, imageUrl: prize.imageUrl },
        winners: winners.map((w) => ({
          id: w.id,
          displayName: w.displayName,
          data: w.data,
        })),
      });
    }

    return results;
  }
}
