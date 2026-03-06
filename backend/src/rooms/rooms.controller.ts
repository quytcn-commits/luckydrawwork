import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Get('join/:code')
  getPublicRoom(@Param('code') code: string) {
    return this.roomsService.getPublicRoom(code);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() dto: any, @Request() req) {
    return this.roomsService.create(dto, req.user.sub);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(@Request() req) {
    return this.roomsService.findAll(req.user.sub);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findById(@Param('id') id: string) {
    return this.roomsService.findById(id);
  }

  @Patch(':id/close')
  @UseGuards(AuthGuard('jwt'))
  closeRegistration(@Param('id') id: string) {
    return this.roomsService.closeRegistration(id);
  }

  @Patch(':id/start-draw')
  @UseGuards(AuthGuard('jwt'))
  startDraw(@Param('id') id: string) {
    return this.roomsService.startDraw(id);
  }

  @Patch(':id/reset')
  @UseGuards(AuthGuard('jwt'))
  resetRoom(@Param('id') id: string) {
    return this.roomsService.resetRoom(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Body() dto: any) {
    return this.roomsService.update(id, dto);
  }
}
