import { Injectable, Logger } from '@nestjs/common';
import { EventsGateway } from '../../events/events.gateway';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { SiemensService } from 'src/events/siemens.service';
import { asS7Area, asS7Type } from 'src/driver/siemens/s7.types';

type WorkerState = {
  timer?: NodeJS.Timeout;
  writing: boolean;       // paused while writing
  connected: boolean;
  failures: number;
  client: any | null;
};

@Injectable()
export class WorkerHub {
  private readonly log = new Logger(WorkerHub.name);
  private readonly workers = new Map<number, WorkerState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly s7: SiemensService,
    private readonly events: EventsGateway,
  ) {}

  async spawn(plcId: number) {
    if (this.workers.has(plcId)) return;

    const plc = await this.prisma.plc.findUnique({ where: { id: plcId } });
    if (!plc || !plc.enabled) return;

    const state: WorkerState = { timer: undefined, writing: false, connected: false, failures: 0, client: null };
    this.workers.set(plcId, state);

    const interval = Number(process.env.POLL_INTERVAL_MS || 1000);
    state.timer = setInterval(() => this.tick(plcId).catch(e => this.log.error(e)), interval);
    this.log.log(`PLC ${plcId} worker started @ ${interval}ms`);
  }

  async dispose(plcId: number) {
    const st = this.workers.get(plcId);
    if (!st) return;
    if (st.timer) clearInterval(st.timer);
    try { if (st.client) this.s7.disconnect(st.client); } catch {}
    this.workers.delete(plcId);
  }

  async disposeAll() {
    await Promise.all([...this.workers.keys()].map(id => this.dispose(id)));
  }

  /** Pause read loop for a controlled write */
  async withWriteLock<T>(plcId: number, fn: (client: any) => Promise<T>): Promise<T> {
    const st = this.workers.get(plcId);
    if (!st) throw new Error('PLC worker not found');
    st.writing = true;
    try {
      if (!st.connected || !st.client) {
        const plc = await this.prisma.plc.findUnique({ where: { id: plcId } });
        if (!plc) throw new Error('PLC not found');
        st.client = this.s7.createClient();
        await this.s7.connect(st.client, plc.ip, plc.rack, plc.slot);
        st.connected = true; st.failures = 0;
      }
      return await fn(st.client);
    } finally {
      st.writing = false;
    }
  }

  private async tick(plcId: number) {
    const st = this.workers.get(plcId);
    if (!st) return;
    if (st.writing) return; // respect write pause

    const plc = await this.prisma.plc.findUnique({ where: { id: plcId } });
    if (!plc || !plc.enabled) return;

    try {
      if (!st.connected || !st.client) {
        st.client = this.s7.createClient();
        await this.s7.connect(st.client, plc.ip, plc.rack, plc.slot);
        st.connected = true; st.failures = 0;
        await this.prisma.plc.update({ where: { id: plcId }, data: { status: 'connected' } });
        this.events.emitPlcStatus({ plcId, status: 'connected', ts: Date.now() });
      }

      const tags = await this.prisma.tag.findMany({ where: { plcId, polling: true } });
      for (const t of tags) {
        try {
          const [val] = await this.s7.readMany(st.client, [{
  area: asS7Area(t.area),
  dbNumber: t.dbNumber ?? undefined,
  start: t.start,
  amount: t.amount,
  dataType: asS7Type(t.dataType),
}]);

          const str = JSON.stringify(val);
          const last = t.lastValue;
          if (last !== str) {
            await this.prisma.tag.update({
              where: { id: t.id },
              data: { lastValue: str, quality: 'GOOD', lastError: null }
            });
            this.events.emitTagUpdate({ tagId: t.id, plcId, name: t.name, value: val, ts: Date.now(), quality: 'GOOD' });
          }
        } catch (te) {
          await this.prisma.tag.update({ where: { id: t.id }, data: { quality: 'BAD', lastError: (te as Error).message } });
          this.events.emitError({ plcId, tagId: t.id, error: (te as Error).message, ts: Date.now() });
          // keep reading others; don't drop PLC connection for a single tag error
        }
      }
    } catch (e) {
      st.failures++;
      st.connected = false;
      try { if (st.client) this.s7.disconnect(st.client); } catch {}
      st.client = null;

      await this.prisma.plc.update({
        where: { id: plcId },
        data: {
          status: 'disconnected',
          lastError: (e as Error).message,
          lastErrorAt: new Date(),
          errorCount: { increment: 1 }
        }
      });
      this.events.emitPlcStatus({ plcId, status: 'disconnected', ts: Date.now(), error: (e as Error).message });
    }
  }
}
