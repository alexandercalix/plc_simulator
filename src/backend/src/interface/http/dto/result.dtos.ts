export class ApiResultDto<T> {
  ok!: boolean;
  data?: T;
  error?: string;
}

export class WriteResultDto {
  tagId!: number;
  plcId!: number;
  ts!: number;
  mode!: 'raw' | 'eng' | 'percent' | 'display';
  wrote!: number; // value sent to PLC (raw domain)
  units?: string;
}

export class ReadResultDto {
  tagId!: number; plcId!: number; ts!: number;
  value: any; // raw (current schema). If you add scaling later, include eng/percent/display too.
  quality?: string;
}

export class PlcStatusDto {
  plcId!: number; name!: string; status!: string;
  lastError?: string; lastErrorAt?: number; errorCount!: number;
}

export class TagStatusDto {
  tagId!: number; plcId!: number; name!: string;
  quality?: string; lastError?: string;
  readOnly!: boolean; polling!: boolean;
}
