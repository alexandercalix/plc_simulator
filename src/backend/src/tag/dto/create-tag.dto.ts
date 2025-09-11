import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';


export class CreateTagDto {
@IsInt() plcId!: number;
@IsString() name!: string;
@IsString() area!: 'DB' | 'PE' | 'PA' | 'MK' | 'TM' | 'CT';
@IsInt() @IsOptional() dbNumber?: number;
@IsInt() @Min(0) start!: number;
@IsInt() @Min(1) amount!: number; // elements or bytes depending on type
@IsString() dataType!: 'BOOL' | 'INT' | 'DINT' | 'REAL' | 'BYTE' | 'WORD' | 'DWORD';
@IsBoolean() @IsOptional() polling?: boolean = true;
}