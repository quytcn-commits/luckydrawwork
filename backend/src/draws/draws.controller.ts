import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DrawsService } from './draws.service';

@Controller('draws')
export class DrawsController {
  constructor(private drawsService: DrawsService) {}

  @Post(':roomId/prize/:prizeId')
  @UseGuards(AuthGuard('jwt'))
  drawPrize(
    @Param('roomId') roomId: string,
    @Param('prizeId') prizeId: string,
  ) {
    return this.drawsService.drawPrize(roomId, prizeId);
  }

  @Get(':roomId/results')
  getResults(@Param('roomId') roomId: string) {
    return this.drawsService.getResults(roomId);
  }
}
