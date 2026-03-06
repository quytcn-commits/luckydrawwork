import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Room } from '../rooms/room.entity';

@Entity('prizes')
export class Prize {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roomId: string;

  @Column()
  name: string;

  @Column()
  order: number;

  @Column({ default: 1 })
  winnerCount: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  winnerId: string;

  @Column({ type: 'jsonb', nullable: true })
  winnerIds: string[];

  @Column({ default: false })
  drawn: boolean;

  @ManyToOne(() => Room, (r) => r.prizes)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @CreateDateColumn()
  createdAt: Date;
}
