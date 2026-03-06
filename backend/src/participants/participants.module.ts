import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participant } from './participant.entity';
import { Room } from '../rooms/room.entity';
import { ParticipantsService } from './participants.service';
import { ParticipantsController } from './participants.controller';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [TypeOrmModule.forFeature([Participant, Room]), WebsocketModule],
  providers: [ParticipantsService],
  controllers: [ParticipantsController],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
