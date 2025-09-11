import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventsGateway } from '../events/events.gateway';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { SiemensService } from 'src/events/siemens.service';


interface RuntimeClient {
    client: any;
    plcId: number;
    ip: string;
    rack: number;
    slot: number;
    connected: boolean;
    failures: number;
    nextRetryAt?: number; // epoch ms
}


@Injectable()
export class PollerService implements OnModuleInit {
    private readonly log = new Logger(PollerService.name);
    private timer?: NodeJS.Timeout;
    private readonly clients = new Map<number, RuntimeClient>();
    private readonly interval = Number(process.env.POLL_INTERVAL_MS || 1000);


    constructor(
        private readonly prisma: PrismaService,
        private readonly s7: SiemensService,
        private readonly events: EventsGateway,
    ) { }


    async onModuleInit() {
        await this.loadPlcs();
        this.timer = setInterval(() => this.tick().catch(err => this.log.error(err)), this.interval);
        this.log.log(`Poller started @ ${this.interval}ms`);
    }


    private async loadPlcs() {
        const plcs = await this.prisma.plc.findMany({ where: { enabled: true } });
        for (const p of plcs) {
            const client = this.s7.createClient();
            this.clients.set(p.id, { client, plcId: p.id, ip: p.ip, rack: p.rack, slot: p.slot, connected: false, failures: 0 });
        }
    }

    private backoffMs(failures: number) {
        const base = 1000; // 1s
        const max = 30000; // 30s
        return Math.min(max, base * Math.pow(2, Math.max(0, failures - 1)));
    }

    // Re-create client helper
    private recreateClient(rt: RuntimeClient) {
        try { this.s7.disconnect(rt.client); } catch { }
        rt.client = this.s7.createClient();
    }


    private async ensureConnected(rt: RuntimeClient): Promise<boolean> {
        if (rt.connected) return true;

        const now = Date.now();
        if (rt.nextRetryAt && now < rt.nextRetryAt) {
            // too soon to retry
            return false;
        }

        // Recreate the client before a new attempt (helps after socket death)
        this.recreateClient(rt);

        try {
            await this.s7.connect(rt.client, rt.ip, rt.rack, rt.slot);
            rt.connected = true;
            rt.failures = 0;
            rt.nextRetryAt = undefined;

            this.log.log(`PLC ${rt.plcId} connected (${rt.ip})`);
            await this.prisma.plc.update({
                where: { id: rt.plcId },
                data: { status: 'connected', lastError: null, lastErrorAt: null },
            });
            this.events.emitPlcStatus({ plcId: rt.plcId, status: 'connected', ts: Date.now() });
            return true;

        } catch (e) {
            rt.connected = false;
            rt.failures = (rt.failures ?? 0) + 1;
            const delay = this.backoffMs(rt.failures);
            rt.nextRetryAt = now + delay;

            const msg = (e as Error).message;
            this.log.warn(`PLC ${rt.plcId} connect failed (${rt.ip}): ${msg} (retry in ${delay} ms)`);

            await this.prisma.plc.update({
                where: { id: rt.plcId },
                data: { status: 'disconnected', lastError: msg, lastErrorAt: new Date(), errorCount: { increment: 1 } },
            });
            this.events.emitPlcStatus({ plcId: rt.plcId, status: 'disconnected', error: msg, ts: Date.now() });
            return false;
        }
    }


    private async reconcilePlcs() {
        const rows = await this.prisma.plc.findMany({ where: { enabled: true } });
        const ids = new Set(rows.map(r => r.id));

        for (const p of rows) {
            if (!this.clients.has(p.id)) {
                this.clients.set(p.id, {
                    client: this.s7.createClient(),
                    plcId: p.id, ip: p.ip, rack: p.rack, slot: p.slot,
                    connected: false, failures: 0,
                });
                this.log.log(`Registered PLC ${p.id} (${p.name})`);
            }
        }
        for (const [id, rt] of this.clients) {
            if (!ids.has(id)) {
                try { this.s7.disconnect(rt.client); } catch { }
                this.clients.delete(id);
                this.log.log(`Unregistered PLC ${id}`);
            }
        }
    }

    private async tick() {
        // 1) get enabled PLCs
        await this.reconcilePlcs();

        const plcs = await this.prisma.plc.findMany({ where: { enabled: true } });
        for (const plc of plcs) {
            const rt = this.clients.get(plc.id);
            if (!rt) continue;

            const ok = await this.ensureConnected(rt);
            if (!ok) continue;

            // 3) fetch polling tags for this PLC
            const tags = await this.prisma.tag.findMany({ where: { plcId: plc.id, polling: true } });
            if (tags.length === 0) continue;

            // 4) read each tag sequentially (simple & robust; optimize later)
            for (const t of tags) {
                try {
                    //   this.log.debug(`Reading P${plc.id}/${plc.name} T${t.id}/${t.name} @ DB${t.dbNumber}:${t.start} ${t.dataType}`);

                    const [val] = await this.s7.readMany(rt.client, [{
                        // if you already added asS7Area/asS7Type, prefer those instead of "as any"
                        area: t.area as any,
                        dbNumber: t.dbNumber ?? undefined,
                        start: t.start,
                        amount: t.amount,
                        dataType: t.dataType as any,
                    }]);

                    const str = JSON.stringify(val);
                    const changed = t.lastValue !== str;

                    // persist cache every time (so GET /plcs shows lastValue)
                    await this.prisma.tag.update({
                        where: { id: t.id },
                        data: { lastValue: str, quality: 'GOOD', lastError: null },
                    });

                    if (changed) {
                        this.log.debug(`Changed: T${t.id}/${t.name} = ${str}`);
                        this.events.emitTagUpdate({
                            tagId: t.id, plcId: plc.id, name: t.name, value: val, ts: Date.now(), quality: 'GOOD'
                        });
                    }
                } catch (e) {
                    const msg = (e as Error).message;
                    this.log.warn(`Read error P${plc.id}/${plc.name} T${t.id}/${t.name}: ${msg}`);

                    // Mark tag bad
                    await this.prisma.tag.update({
                        where: { id: t.id },
                        data: { quality: 'BAD', lastError: msg },
                    });

                    // 🔴 Mark PLC disconnected in runtime and DB, and drop the socket
                    const rt = this.clients.get(plc.id);
                    if (rt) {
                        rt.connected = false;
                        rt.failures = (rt.failures ?? 0) + 1;
                        try { this.s7.disconnect(rt.client); } catch { }
                    }

                    await this.prisma.plc.update({
                        where: { id: plc.id },
                        data: {
                            status: 'disconnected',
                            lastError: msg,
                            lastErrorAt: new Date(),
                            errorCount: { increment: 1 },
                        },
                    });

                    // Emit status for clients
                    this.events.emitPlcStatus({ plcId: plc.id, status: 'disconnected', error: msg, ts: Date.now() });
                }

            }
        }
    }



    // Reuse the existing reconcile + read logic, just callable on demand.

public async reloadNow() {
  await this.reconcilePlcs();
}

public async readPlcNow(plcId: number) {
  const plc = await this.prisma.plc.findUnique({ where: { id: plcId } });
  if (!plc || !plc.enabled) return;

  const rt = this.clients.get(plc.id);
  if (!rt) {
    // register new runtime client right away
    this.clients.set(plc.id, {
      client: this.s7.createClient(),
      plcId: plc.id,
      ip: plc.ip,
      rack: plc.rack,
      slot: plc.slot,
      connected: false,
      failures: 0,
    });
  }
  const client = this.clients.get(plc.id)!;

  // connect (with backoff logic already in ensureConnected)
  const ok = await this.ensureConnected(client);
  if (!ok) return;

  // read all polling tags now (same as inside tick, but scoped to this PLC)
  const tags = await this.prisma.tag.findMany({ where: { plcId: plc.id, polling: true } });
  for (const t of tags) {
    try {
      const [val] = await this.s7.readMany(client.client, [{
        area: t.area as any,
        dbNumber: t.dbNumber ?? undefined,
        start: t.start,
        amount: t.amount,
        dataType: t.dataType as any,
      }]);

      const str = JSON.stringify(val);
      const changed = t.lastValue !== str;

      await this.prisma.tag.update({
        where: { id: t.id },
        data: { lastValue: str, quality: 'GOOD', lastError: null },
      });

      if (changed) {
        this.events.emitTagUpdate({
          tagId: t.id, plcId: plc.id, name: t.name, value: val, ts: Date.now(), quality: 'GOOD',
        });
      }
    } catch (e) {
      const msg = (e as Error).message;
      this.log.warn(`Immediate read error P${plc.id}/${plc.name} T${t.id}/${t.name}: ${msg}`);

      await this.prisma.tag.update({
        where: { id: t.id },
        data: { quality: 'BAD', lastError: msg },
      });

      // drop connection to allow recovery
      client.connected = false;
      try { this.s7.disconnect(client.client); } catch {}
      await this.prisma.plc.update({
        where: { id: plc.id },
        data: { status: 'disconnected', lastError: msg, lastErrorAt: new Date(), errorCount: { increment: 1 } },
      });
      this.events.emitPlcStatus({ plcId: plc.id, status: 'disconnected', error: msg, ts: Date.now() });
    }
  }
}

public async readTagNow(tagId: number) {
  const t = await this.prisma.tag.findUnique({ where: { id: tagId }, include: { plc: true } });
  if (!t || !t.plc || !t.plc.enabled) return;

  // ensure runtime client exists
  if (!this.clients.has(t.plcId)) {
    this.clients.set(t.plcId, {
      client: this.s7.createClient(),
      plcId: t.plcId,
      ip: t.plc.ip,
      rack: t.plc.rack,
      slot: t.plc.slot,
      connected: false,
      failures: 0,
    });
  }
  const rt = this.clients.get(t.plcId)!;

  const ok = await this.ensureConnected(rt);
  if (!ok) return;

  try {
    const [val] = await this.s7.readMany(rt.client, [{
      area: t.area as any,
      dbNumber: t.dbNumber ?? undefined,
      start: t.start,
      amount: t.amount,
      dataType: t.dataType as any,
    }]);

    const str = JSON.stringify(val);
    const changed = t.lastValue !== str;

    await this.prisma.tag.update({
      where: { id: t.id },
      data: { lastValue: str, quality: 'GOOD', lastError: null },
    });

    if (changed) {
      this.events.emitTagUpdate({
        tagId: t.id, plcId: t.plcId, name: t.name, value: val, ts: Date.now(), quality: 'GOOD',
      });
    }
  } catch (e) {
    const msg = (e as Error).message;
    this.log.warn(`Immediate read error T${t.id}/${t.name}: ${msg}`);
    await this.prisma.tag.update({
      where: { id: t.id },
      data: { quality: 'BAD', lastError: msg },
    });
    rt.connected = false;
    try { this.s7.disconnect(rt.client); } catch {}
  }
}

}