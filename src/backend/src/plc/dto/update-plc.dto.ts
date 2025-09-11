import { PartialType } from '@nestjs/mapped-types';
import { CreatePlcDto } from './create-plc.dto';
export class UpdatePlcDto extends PartialType(CreatePlcDto) {}