import { forwardRef, Module } from '@nestjs/common';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';
import { DbModule } from '../db/db.module';
import { PollerModule } from 'src/poller/poller.module';

@Module({
  imports: [DbModule, forwardRef(() => PollerModule)],           // <-- add this
  controllers: [TagController],
  providers: [TagService],
  exports: [TagService],
})
export class TagModule {}
