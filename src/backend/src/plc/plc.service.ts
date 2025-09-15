import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PollerService } from '../poller/poller.service';
import { PrismaService } from 'src/db/prisma/prisma.service';

@Injectable()
export class PlcService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PollerService))
    private readonly poller: PollerService,
  ) { }

  findAll() {
    return this.prisma.plc.findMany({
      include: { tags: true }, // 👈 optional, but good for /plcs
    });
  }

  findOne(id: number) {
  return this.prisma.plc.findUnique({
    where: { id },
    include: {
      tags: {
        orderBy: {
          sortOrder: 'asc', // 👈 sort by user-defined order
        },
      },
    },
  });
}

  async create(dto: any) {
    const plc = await this.prisma.plc.create({ data: dto as any });
    // Hot-register and read immediately
    await this.poller.reloadNow();
    await this.poller.readPlcNow(plc.id);
    return plc;
  }

  async update(id: number, dto: any) {
    const plc = await this.prisma.plc.update({ where: { id }, data: dto as any });
    await this.poller.reloadNow();
    await this.poller.readPlcNow(id);
    return plc;
  }

  async remove(id: number) {
    const plc = await this.prisma.plc.delete({ where: { id } });
    await this.poller.reloadNow();
    return plc;
  }
}
