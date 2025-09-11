import { IsBoolean, IsInt, IsOptional, IsString, IsNumber, Min } from 'class-validator';

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
  @Min(1)
  amount!: number; // elements or bytes depending on type

  @IsString()
  dataType!: 'BOOL' | 'INT' | 'DINT' | 'REAL' | 'BYTE' | 'WORD' | 'DWORD';

  @IsBoolean()
  @IsOptional()
  polling?: boolean = true;

  // ---- Scaling & Units (optional) ----
  @IsBoolean()
  @IsOptional()
  scaleEnabled?: boolean = false;

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

  @IsNumber()
  @IsOptional()
  dispMin?: number;

  @IsNumber()
  @IsOptional()
  dispMax?: number;

  @IsString()
  @IsOptional()
  units?: string;

  @IsNumber()
  @IsOptional()
  deadband?: number; // ENG units

  @IsBoolean()
  @IsOptional()
  clamp?: boolean = true;
}
