import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { EventsGateway } from '../websocket/events.gateway';

@Controller('participants')
export class ParticipantsController {
  constructor(
    private participantsService: ParticipantsService,
    private eventsGateway: EventsGateway,
  ) {}

  @Post(':roomCode/register')
  async register(
    @Param('roomCode') roomCode: string,
    @Body() data: Record<string, any>,
  ) {
    const participant = await this.participantsService.register(roomCode, data);

    this.eventsGateway.emitParticipantJoined(roomCode, {
      id: participant.id,
      displayName: participant.displayName,
      data: participant.data,
      createdAt: participant.createdAt,
    });

    return participant;
  }

  @Get(':roomId')
  getByRoom(@Param('roomId') roomId: string) {
    return this.participantsService.getByRoom(roomId);
  }
}
