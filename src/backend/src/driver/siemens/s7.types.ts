export type S7Area = 'DB' | 'PE' | 'PA' | 'MK' | 'TM' | 'CT';
export type S7DataType = 'BOOL' | 'BYTE' | 'WORD' | 'INT' | 'DWORD' | 'DINT' | 'REAL';

const AREAS = new Set<S7Area>(['DB','PE','PA','MK','TM','CT']);
const TYPES = new Set<S7DataType>(['BOOL','BYTE','WORD','INT','DWORD','DINT','REAL']);

export function asS7Area(s: string): S7Area {
  if (!AREAS.has(s as S7Area)) throw new Error(`Invalid S7 area: ${s}`);
  return s as S7Area;
}

export function asS7Type(s: string): S7DataType {
  if (!TYPES.has(s as S7DataType)) throw new Error(`Invalid S7 dataType: ${s}`);
  return s as S7DataType;
}
