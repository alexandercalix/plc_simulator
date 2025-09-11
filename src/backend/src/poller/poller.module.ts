import { Module } from '@nestjs/common';
import { PollerService } from './poller.service';
import { SiemensModule } from '../driver/siemens/siemens.module';
import { EventsModule } from '../events/events.module';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule, SiemensModule, EventsModule], // <-- DbModule here
  providers: [PollerService],
  exports: [PollerService],
})
export class PollerModule {}
