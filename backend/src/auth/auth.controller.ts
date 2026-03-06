import { Controller, Post, Body, Get, UseGuards, Request, OnModuleInit } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { IsEmail, IsString, MinLength } from 'class-validator';

class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

@Controller('auth')
export class AuthController implements OnModuleInit {
  constructor(private authService: AuthService) {}

  async onModuleInit() {
    await this.authService.seedAdmin();
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.name);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.sub);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }
}
