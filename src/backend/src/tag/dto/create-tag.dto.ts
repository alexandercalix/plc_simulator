// create-tag.dto.ts

import { IsInt, IsString, IsBoolean, IsOptional, Min, IsNumber, Max } from 'class-validator';

export class CreateTagDto {
  @IsInt()
  plcId!: number;

  @IsString()
  name!: string;

  @IsString()
  area!: 'DB' | 'PE' | 'PA' | 'MK' | 'TM' | 'CT';

  @IsInt()
  @IsOptional()
  dbNumber?: number;

  @IsInt()
  @Min(0)
  start!: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(7)
  bitOffset?: number; 

  @IsInt()
  @Min(1)
  amount!: number;

  @IsString()
  dataType!: 'BOOL' | 'INT' | 'DINT' | 'REAL' | 'BYTE' | 'WORD' | 'DWORD';

  @IsBoolean()
  @IsOptional()
  polling?: boolean = true;

  @IsBoolean()
  @IsOptional()
  readOnly?: boolean = false;

  // 👇 ADD THESE NEW SCALING FIELDS

  @IsNumber()
  @IsOptional()
  rawMin?: number;

  @IsNumber()
  @IsOptional()
  rawMax?: number;

  @IsNumber()
  @IsOptional()
  engMin?: number;

  @IsNumber()
  @IsOptional()
  engMax?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  formula?: string;

  @IsInt()
@IsOptional()
sortOrder?: number = 0;
}