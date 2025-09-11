import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PollerService } from '../poller/poller.service';
import { PrismaService } from 'src/db/prisma/prisma.service';

@Injectable()
export class TagService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PollerService))
    private readonly poller: PollerService,
  ) {}

  findAll() { return this.prisma.tag.findMany(); }
  findOne(id: number) { return this.prisma.tag.findUnique({ where: { id } }); }

  async create(dto: any) {
    const tag = await this.prisma.tag.create({ data: dto as any });
    // Read this tag immediately (ensures new value lands in DB and emits if changed)
    await this.poller.readTagNow(tag.id);
    return tag;
  }

  async update(id: number, dto: any) {
    const tag = await this.prisma.tag.update({ where: { id }, data: dto as any });
    await this.poller.readTagNow(id);
    return tag;
  }

  async remove(id: number) {
    const tag = await this.prisma.tag.delete({ where: { id } });
    // No immediate read needed
    return tag;
  }
}
