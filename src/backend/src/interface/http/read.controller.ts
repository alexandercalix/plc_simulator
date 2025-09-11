import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiResultDto, ReadResultDto } from './dto/result.dtos';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { SiemensService } from 'src/events/siemens.service';
import { asS7Area, asS7Type } from 'src/driver/siemens/s7.types';

@Controller('read')
export class ReadController {
    constructor(private prisma: PrismaService, private s7: SiemensService) { }

    // cached (last poll)
    @Get('tag/:id')
    async getCached(@Param('id') id: string): Promise<ApiResultDto<ReadResultDto>> {
        const t = await this.prisma.tag.findUnique({ where: { id: +id }, include: { plc: true } });
        if (!t) return { ok: false, error: 'Tag not found' };
        return {
            ok: true,
            data: { tagId: t.id, plcId: t.plcId, ts: Date.now(), value: t.lastValue ? JSON.parse(t.lastValue) : null, quality: t.quality ?? 'GOOD' }
        };
    }

    // on-demand (direct read now)
    @Post('tag/:id')
    async readNow(@Param('id') id: string): Promise<ApiResultDto<ReadResultDto>> {
        const t = await this.prisma.tag.findUnique({ where: { id: +id }, include: { plc: true } });
        if (!t) return { ok: false, error: 'Tag not found' };
        const client = this.s7.createClient();
        try {
            await this.s7.connect(client, t.plc.ip, t.plc.rack, t.plc.slot);
            const [val] = await this.s7.readMany(client, [{
                area: asS7Area(t.area),
                dbNumber: t.dbNumber ?? undefined,
                start: t.start,
                amount: t.amount,
                dataType: asS7Type(t.dataType),
            }]);
            return { ok: true, data: { tagId: t.id, plcId: t.plcId, ts: Date.now(), value: val, quality: 'GOOD' } };
        } catch (e) {
            return { ok: false, error: (e as Error).message };
        } finally {
            try { this.s7.disconnect(client); } catch { }
        }
    }
}
