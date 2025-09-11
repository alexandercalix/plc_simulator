import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';


@Controller('tags')
export class TagController {
constructor(private readonly svc: TagService) {}


@Get() findAll() { return this.svc.findAll(); }
@Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(+id); }
@Post() create(@Body() dto: CreateTagDto) { return this.svc.create(dto); }
@Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateTagDto) { return this.svc.update(+id, dto); }
@Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(+id); }
}