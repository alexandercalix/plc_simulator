import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { asS7Area, asS7Type } from 'src/driver/siemens/s7.types';
import { SiemensService } from 'src/events/siemens.service';

@Controller('write')
export class WriteController {
  constructor(
    private prisma: PrismaService,
    private s7: SiemensService,
  ) {}

  @Post()
  async write(@Body() body: { tagId: number; value: any }) {
    const tag = await this.prisma.tag.findUnique({
      where: { id: body.tagId },
      include: { plc: true },
    });
    if (!tag) throw new Error('Tag not found');

    const c = this.s7.createClient();
    await this.s7.connect(c, tag.plc.ip, tag.plc.rack, tag.plc.slot);

    await this.s7.writeOne(
      c,
      {
        area: asS7Area(tag.area),              // << narrow string -> S7Area
        dbNumber: tag.dbNumber ?? undefined,
        start: tag.start,
        amount: tag.amount,
        dataType: asS7Type(tag.dataType),      // << narrow string -> S7DataType
      },
      body.value,
    );

    try { this.s7.disconnect(c); } catch {}
    return { ok: true };
  }
}
