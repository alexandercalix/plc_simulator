import { Module } from '@nestjs/common';
import { WriteController } from './write.controller';
import { ReadController } from './read.controller'; // if you have it
import { SiemensModule } from '../../driver/siemens/siemens.module';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [DbModule, SiemensModule], // <-- DbModule here
  controllers: [WriteController,  ReadController,/* StatusController */],
})
export class ApiModule {}
