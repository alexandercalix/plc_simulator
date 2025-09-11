import { forwardRef, Module } from '@nestjs/common';
import { PlcController } from './plc.controller';
import { PlcService } from './plc.service';
import { DbModule } from '../db/db.module';
import { PollerModule } from 'src/poller/poller.module';

@Module({
  imports: [DbModule,forwardRef(() => PollerModule)],         
  controllers: [PlcController],
  providers: [PlcService],
  exports: [PlcService],
})
export class PlcModule {}
