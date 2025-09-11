import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';

import { CreatePlcDto } from './dto/create-plc.dto';
import { UpdatePlcDto } from './dto/update-plc.dto';
import { PlcService } from './plc.service';


@Controller('plcs')
export class PlcController {
constructor(private readonly svc: PlcService) {}


@Get() findAll() { return this.svc.findAll(); }
@Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(+id); }
@Post() create(@Body() dto: CreatePlcDto) { return this.svc.create(dto); }
@Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePlcDto) { return this.svc.update(+id, dto); }
@Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(+id); }
}