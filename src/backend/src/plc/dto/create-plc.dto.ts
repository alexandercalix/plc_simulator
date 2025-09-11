import { IsBoolean, IsInt, IsIP, IsOptional, IsString, Min } from 'class-validator';


export class CreatePlcDto {
@IsString() name!: string;
@IsIP() ip!: string;
@IsInt() @Min(1) port: number = 102;
@IsInt() rack: number = 0;
@IsInt() slot: number = 1;
@IsString() type: string = 'S7-1200';
@IsBoolean() @IsOptional() enabled?: boolean = true;
}