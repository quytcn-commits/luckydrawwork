import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomCode: string,
  ) {
    client.join(`room:${roomCode}`);
    console.log(`Client ${client.id} joined room:${roomCode}`);
    return { event: 'joinedRoom', data: roomCode };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomCode: string,
  ) {
    client.leave(`room:${roomCode}`);
  }

  // Called from services to emit events
  emitParticipantJoined(roomCode: string, participant: any) {
    this.server.to(`room:${roomCode}`).emit('participantJoined', participant);
  }

  emitParticipantCount(roomCode: string, count: number) {
    this.server.to(`room:${roomCode}`).emit('participantCount', count);
  }

  emitRegistrationClosed(roomCode: string) {
    this.server.to(`room:${roomCode}`).emit('registrationClosed');
  }

  emitDrawStarted(roomCode: string) {
    this.server.to(`room:${roomCode}`).emit('drawStarted');
  }

  emitWinnerSelected(roomCode: string, data: any) {
    this.server.to(`room:${roomCode}`).emit('winnerSelected', data);
  }

  emitDrawFinished(roomCode: string, results: any) {
    this.server.to(`room:${roomCode}`).emit('drawFinished', results);
  }
}
