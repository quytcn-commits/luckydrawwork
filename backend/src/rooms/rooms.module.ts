import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './room.entity';
import { Prize } from '../draws/prize.entity';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [TypeOrmModule.forFeature([Room, Prize]), WebsocketModule],
  providers: [RoomsService],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
