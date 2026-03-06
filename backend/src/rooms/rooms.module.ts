import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './room.entity';
import { Prize } from '../draws/prize.entity';
import { Participant } from '../participants/participant.entity';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [TypeOrmModule.forFeature([Room, Prize, Participant]), WebsocketModule],
  providers: [RoomsService],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
