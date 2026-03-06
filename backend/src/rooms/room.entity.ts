import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Participant } from '../participants/participant.entity';
import { Prize } from '../draws/prize.entity';

export enum RoomStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  DRAWING = 'drawing',
  FINISHED = 'finished',
}

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  eventName: string;

  @Column()
  roomName: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  createdBy: string;

  @Column({ type: 'enum', enum: RoomStatus, default: RoomStatus.OPEN })
  status: RoomStatus;

  @Column({ type: 'jsonb', nullable: true })
  formFields: FormField[];

  @Column({ type: 'jsonb', nullable: true })
  theme: RoomTheme;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  kvImageUrl: string;

  @Column({ nullable: true })
  adminId: string;

  @OneToMany(() => Participant, (p) => p.room)
  participants: Participant[];

  @OneToMany(() => Prize, (p) => p.room)
  prizes: Prize[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'phone' | 'email' | 'select';
  required: boolean;
  unique: boolean;
  options?: string[];
  pattern?: string;
}

export interface RoomTheme {
  primaryColor?: string;
  secondaryColor?: string;
  buttonColor?: string;
  textColor?: string;
  qrBackgroundUrl?: string;
  drawBackgroundUrl?: string;
  resultBackgroundUrl?: string;
}
