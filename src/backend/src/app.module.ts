import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlcModule } from './plc/plc.module';
import { TagModule } from './tag/tag.module';
import { SiemensModule } from './driver/siemens/siemens.module';
import { PollerModule } from './poller/poller.module';
import { EventsModule } from './events/events.module';
import { ApiModule } from './interface/http/api.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventsModule,
    SiemensModule,
    PlcModule,
    TagModule,
    PollerModule,
    ApiModule,
  ],
})
export class AppModule {}
