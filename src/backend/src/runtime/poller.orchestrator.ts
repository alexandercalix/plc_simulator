import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

import { WorkerHub } from './workers/worker.hub';
import { PrismaService } from 'src/db/prisma/prisma.service';

@Injectable()
export class PollerOrchestrator implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PollerOrchestrator.name);

  constructor(private readonly prisma: PrismaService, private readonly hub: WorkerHub) {}

  async onModuleInit() {
    const plcs = await this.prisma.plc.findMany({ where: { enabled: true } });
    for (const plc of plcs) await this.hub.spawn(plc.id);
    this.log.log(`Spawned ${plcs.length} PLC workers`);
  }

  async onModuleDestroy() { await this.hub.disposeAll(); }
}
