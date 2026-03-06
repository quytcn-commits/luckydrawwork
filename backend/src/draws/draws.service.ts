import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
    if (prize.drawn) throw new BadRequestException('Prize already fully drawn');

    const currentWinnerIds = prize.winnerIds || [];
    if (currentWinnerIds.length >= prize.winnerCount) {
      throw new BadRequestException('Prize already fully drawn');
    }

    // Get eligible participants (not yet winners)
    const eligible = await this.participantRepo.find({
      where: { roomId, isWinner: false },
    });

    if (eligible.length === 0) {
      throw new BadRequestException('No eligible participants');
    }

    // Cryptographically secure random selection - pick exactly 1 winner
    const randomBytes = crypto.randomBytes(4);
    const randomIndex = randomBytes.readUInt32BE(0) % eligible.length;
    const winner = eligible[randomIndex];

    // Update winner
    await this.participantRepo.update(winner.id, {
      isWinner: true,
      prizeId: prize.id,
    });

    // Update prize - append to winnerIds
    const updatedWinnerIds = [...currentWinnerIds, winner.id];
    const isFullyDrawn = updatedWinnerIds.length >= prize.winnerCount;

    await this.prizeRepo.update(prize.id, {
      winnerIds: updatedWinnerIds,
      winnerId: updatedWinnerIds[0],
      drawn: isFullyDrawn,
    });

    // Check if all prizes fully drawn
    if (isFullyDrawn) {
      const undrawnCount = await this.prizeRepo.count({
        where: { roomId, drawn: false },
      });
      if (undrawnCount === 0) {
        await this.roomRepo.update(roomId, { status: RoomStatus.FINISHED });
      }
    }

    return {
      prize: {
        ...prize,
        winnerIds: updatedWinnerIds,
        drawn: isFullyDrawn,
      },
      winner: {
        id: winner.id,
        displayName: winner.displayName,
        data: winner.data,
      },
      drawnCount: updatedWinnerIds.length,
      totalCount: prize.winnerCount,
    };
  }

  async getResults(roomId: string) {
    const prizes = await this.prizeRepo.find({
      where: { roomId },
      order: { order: 'ASC' },
    });

    // Collect all winner IDs across all prizes
    const allWinnerIds: string[] = [];
    for (const prize of prizes) {
      if (prize.winnerIds && prize.winnerIds.length > 0) {
        allWinnerIds.push(...prize.winnerIds);
      }
    }

    // Single query to fetch all winners
    let winnersMap = new Map<string, Participant>();
    if (allWinnerIds.length > 0) {
      const allWinners = await this.participantRepo.find({
        where: { id: In(allWinnerIds) },
      });
      for (const w of allWinners) {
        winnersMap.set(w.id, w);
      }
    }

    return prizes.map((prize) => ({
      prize: { id: prize.id, name: prize.name, order: prize.order, imageUrl: prize.imageUrl, winnerCount: prize.winnerCount, drawn: prize.drawn },
      winners: (prize.winnerIds || [])
        .map((id) => winnersMap.get(id))
        .filter(Boolean)
        .map((w) => ({
          id: w!.id,
          displayName: w!.displayName,
          data: w!.data,
        })),
    }));
  }
}
