import { Module } from '@nestjs/common';
import { WriteController } from './write.controller';
import { SiemensModule } from '../../driver/siemens/siemens.module';
import { DbModule } from '../../db/db.module';
import { ReadController } from './read.controller';
import { PollerModule } from 'src/poller/poller.module';

@Module({
  imports: [DbModule, SiemensModule, PollerModule], // <-- DbModule here
  controllers: [WriteController,  ReadController,/* StatusController */],
})
export class ApiModule {}
