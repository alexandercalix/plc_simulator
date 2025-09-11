import { Module } from '@nestjs/common';
import { SiemensService } from 'src/events/siemens.service';


@Module({ providers: [SiemensService], exports: [SiemensService] })
export class SiemensModule {}