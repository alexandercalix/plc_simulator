import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { ApiResultDto, PlcStatusDto, TagStatusDto } from './dto/result.dtos';

@Controller('status')
export class StatusController {
  constructor(private prisma: PrismaService) {}

  @Get('plc')
  async plcs(): Promise<ApiResultDto<PlcStatusDto[]>> {
    const rows = await this.prisma.plc.findMany();
    const data = rows.map(r => ({
      plcId: r.id, name: r.name, status: r.status,
      lastError: r.lastError ?? undefined,
      lastErrorAt: r.lastErrorAt ? new Date(r.lastErrorAt).getTime() : undefined,
      errorCount: r.errorCount
    }));
    return { ok: true, data };
  }

  @Get('plc/:id')
  async plc(@Param('id') id: string): Promise<ApiResultDto<PlcStatusDto>> {
    const r = await this.prisma.plc.findUnique({ where: { id: +id } });
    if (!r) return { ok: false, error: 'PLC not found' };
    return {
      ok: true,
      data: {
        plcId: r.id, name: r.name, status: r.status,
        lastError: r.lastError ?? undefined,
        lastErrorAt: r.lastErrorAt ? new Date(r.lastErrorAt).getTime() : undefined,
        errorCount: r.errorCount
      }
    };
  }

  @Get('plc/:id/tags')
  async plcTags(@Param('id') id: string): Promise<ApiResultDto<TagStatusDto[]>> {
    const tags = await this.prisma.tag.findMany({ where: { plcId: +id } });
    const data = tags.map(t => ({
      tagId: t.id, plcId: t.plcId, name: t.name,
      quality: t.quality ?? undefined,
      lastError: t.lastError ?? undefined,
      readOnly: t.readOnly, polling: t.polling
    }));
    return { ok: true, data };
  }
}
