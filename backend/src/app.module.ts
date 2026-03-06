import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { ParticipantsModule } from './participants/participants.module';
import { DrawsModule } from './draws/draws.module';
import { WebsocketModule } from './websocket/websocket.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://admin:admin@localhost:5432/luckydraw',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      extra: {
        max: 30,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'storage', 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { index: false },
    }),
    AuthModule,
    RoomsModule,
    ParticipantsModule,
    DrawsModule,
    WebsocketModule,
    UploadsModule,
  ],
})
export class AppModule {}
