import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiResultDto, ReadResultDto } from './dto/result.dtos';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { SiemensService } from 'src/events/siemens.service';
import { asS7Area, asS7Type } from 'src/driver/siemens/s7.types';
import { PollerService } from 'src/poller/poller.service';

@Controller('read')
export class ReadController {
    constructor(private prisma: PrismaService, private poller: PollerService) { }

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
        const tagId = +id;
        const t = await this.prisma.tag.findUnique({ where: { id: tagId }, include: { plc: true } });
        if (!t) return { ok: false, error: 'Tag not found' };

        try {
            // 👇 DELEGATE TO POLLER — it handles everything: read, update DB, emit event
            await this.poller.readTagNow(tagId);

            // 👇 Fetch updated tag from DB to return in response
            const updatedTag = await this.prisma.tag.findUnique({ where: { id: tagId } });
            if (!updatedTag) {
                return { ok: false, error: 'Tag disappeared after read' };
            }

            const value = updatedTag.lastValue ? JSON.parse(updatedTag.lastValue) : null;

            return {
                ok: true,
                data: {
                    tagId: updatedTag.id,
                    plcId: updatedTag.plcId,
                    ts: Date.now(),
                    value,
                    quality: updatedTag.quality ?? 'GOOD',
                },
            };
        } catch (e) {
            return { ok: false, error: (e as Error).message };
        }
    }
}
