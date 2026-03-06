import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prize } from './prize.entity';
import { Participant } from '../participants/participant.entity';
import { Room } from '../rooms/room.entity';
import { DrawsService } from './draws.service';
import { DrawsController } from './draws.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Prize, Participant, Room])],
  providers: [DrawsService],
  controllers: [DrawsController],
  exports: [DrawsService],
})
export class DrawsModule {}
