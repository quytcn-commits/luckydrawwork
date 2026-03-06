import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Room } from '../rooms/room.entity';

@Entity('participants')
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roomId: string;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ nullable: true })
  displayName: string;

  @Column({ default: false })
  isWinner: boolean;

  @Column({ nullable: true })
  prizeId: string;

  @ManyToOne(() => Room, (r) => r.participants)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @CreateDateColumn()
  createdAt: Date;
}
