import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Admin } from './admin.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, name: string) {
    const exists = await this.adminRepo.findOne({ where: { email } });
    if (exists) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(password, 10);
    const admin = this.adminRepo.create({ email, password: hashed, name });
    await this.adminRepo.save(admin);

    return this.generateToken(admin);
  }

  async login(email: string, password: string) {
    const admin = await this.adminRepo.findOne({ where: { email } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.generateToken(admin);
  }

  async getProfile(id: string) {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) throw new UnauthorizedException();
    const { password, ...result } = admin;
    return result;
  }

  private generateToken(admin: Admin) {
    const payload = { sub: admin.id, email: admin.email };
    return {
      access_token: this.jwtService.sign(payload),
      admin: { id: admin.id, email: admin.email, name: admin.name },
    };
  }

  async seedAdmin() {
    const count = await this.adminRepo.count();
    if (count === 0) {
      await this.register('admin@luckydraw.work', 'admin123', 'Admin');
      console.log('Default admin created: admin@luckydraw.work / admin123');
    }
  }
}
