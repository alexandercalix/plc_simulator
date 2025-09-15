import { Injectable, Logger } from '@nestjs/common';
// node-snap7 has no official types; import as any
import * as snap7 from 'node-snap7';
import { S7Area, S7DataType } from 'src/driver/siemens/s7.types';


export type ReadSpec = {
  area: S7Area;
  dbNumber?: number;
  start: number;
  bitOffset?: number;
  amount: number;
  dataType: S7DataType;
  // ---- SCALING FIELDS  ----
  rawMin?: number;   // e.g., 0.0
  rawMax?: number;   // e.g., 27648.0
  engMin?: number;   // e.g., 0.0
  engMax?: number;   // e.g., 100.0
  unit?: string;     // e.g., "°C"
  formula?: string;  // e.g., "linear"
};

@Injectable()
export class SiemensService {
  private readonly log = new Logger(SiemensService.name);

  /** Create a new low-level S7 client */
  createClient() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const S7Client = (snap7 as any).S7Client;
    return new S7Client();
  }

  /** Connect to PLC */
  connect(client: any, ip: string, rack: number, slot: number): Promise<void> {
    return new Promise((resolve, reject) => {
      client.ConnectTo(ip, rack, slot, (err: number) => {
        if (err) {
          const txt = client.ErrorText(err);
          this.log.error(`ConnectTo failed rc=${err} msg=${txt}`);
          reject(new Error(`S7 connect rc=${err} msg=${txt}`));
        } else {
          this.log.log(`ConnectTo OK -> ip=${ip} rack=${rack} slot=${slot}`);
          resolve();
        }
      });
    });
  }

  /** Disconnect (safe) */
  disconnect(client: any) {
    try { client.Disconnect(); } catch { /* ignore */ }
  }

  /**
   * Read multiple specs sequentially (simple & reliable).
   * For performance later, you can group and use ReadMultiVars.
   */// helper to build rich snap7 error messages

  // Map our area string to lean helper names
  private areaHelper(area: 'DB' | 'PE' | 'PA' | 'MK' | 'TM' | 'CT') {
    switch (area) {
      case 'DB': return { read: 'DBRead', write: 'DBWrite' }; // (db,start,size[,cb])
      case 'PE': return { read: 'EBRead', write: 'EBWrite' }; // (start,size[,cb])
      case 'PA': return { read: 'ABRead', write: 'ABWrite' }; // (start,size[,cb])
      case 'MK': return { read: 'MBRead', write: 'MBWrite' }; // (start,size[,cb])
      case 'TM': return { read: 'TMRead', write: 'TMWrite' }; // (start,size[,cb]) size = amount * 2
      case 'CT': return { read: 'CTRead', write: 'CTWrite' }; // (start,size[,cb]) size = amount * 2
      default: throw new Error(`Unsupported area ${area}`);
    }
  }

  // In SiemensService.ts

  private scaleRawToEngineering(rawValue: number, spec: ReadSpec): number {
    // Skip scaling for BOOL
    if (spec.dataType === 'BOOL') {
      return rawValue;
    }

    const { rawMin, rawMax, engMin, engMax } = spec;

    // Only scale if all scaling parameters are meaningfully set (not just defaults)
    const hasScaling = rawMin != null && rawMax != null && engMin != null && engMax != null &&
      (rawMin !== 0 || rawMax !== 100 || engMin !== 0 || engMax !== 100);

    if (!hasScaling || typeof rawValue !== 'number') {
      return rawValue; // no scaling → return as-is
    }

    // Avoid division by zero
    if (rawMax === rawMin) {
      this.log.warn(`Invalid scaling config: rawMin (${rawMin}) equals rawMax (${rawMax})`);
      return rawValue;
    }

    // Linear scaling: raw → engineering
    let scaled = engMin + (rawValue - rawMin) * (engMax - engMin) / (rawMax - rawMin);

    // Clamp to engineering range
    scaled = Math.max(engMin, Math.min(engMax, scaled));

    // Round if target data type is integer-based
    if (spec.dataType === 'INT' || spec.dataType === 'DINT' || spec.dataType === 'WORD') {
      scaled = Math.round(scaled);
    }

    this.log.debug(`Scaled RAW ${rawValue} → ENG ${scaled} using [${rawMin}:${rawMax}] → [${engMin}:${engMax}]`);
    return scaled;
  }

  private snap7Error(client: any, where: string) {
    const rc = client.LastError?.() ?? -1;
    const txt = client.ErrorText ? client.ErrorText(rc) : 'unknown';
    return new Error(`${where} rc=${rc} msg=${txt}`);
  }
  async readMany(client: any, specs: ReadSpec[]): Promise<any[]> {
    const out: any[] = [];

    for (const s of specs) {
      const sizeBytes = this.byteSize(s.dataType) * Math.max(1, s.amount);
      const h = this.areaHelper(s.area);

      let res: Buffer | false;

      if (s.area === 'DB') {
        // DBRead(db, startBytes, sizeBytes) -> Buffer | false
        res = client[h.read](s.dbNumber ?? 0, s.start, sizeBytes);
        if (res === false) throw this.snap7Error(client, `DBRead db=${s.dbNumber} start=${s.start} size=${sizeBytes}`);
      } else if (s.area === 'TM' || s.area === 'CT') {
        // Timers/Counters are 2 bytes each
        const elements = Math.max(1, s.amount);
        const byteLen = 2 * elements;
        res = client[h.read](s.start, byteLen);
        if (res === false) throw this.snap7Error(client, `${h.read} start=${s.start} size=${byteLen}`);
      } else {
        // PE/PA/MK -> EB/AB/MB
        res = client[h.read](s.start, sizeBytes);
        if (res === false) throw this.snap7Error(client, `${h.read} start=${s.start} size=${sizeBytes}`);
      }

      // Decode raw buffer → JS value(s)
      const decoded = this.decode(res, s.dataType, s.amount, s.bitOffset);

      // Apply scaling: raw → engineering
      let scaledValue: any;

      if (Array.isArray(decoded)) {
        scaledValue = decoded.map(v => typeof v === 'number' ? this.scaleRawToEngineering(v, s) : v);
      } else {
        scaledValue = typeof decoded === 'number' ? this.scaleRawToEngineering(decoded, s) : decoded;
      }

      out.push(scaledValue);
    }

    return out;
  }

  async writeOne(client: any, spec: ReadSpec, value: any): Promise<void> {
    // ---- SCALE engineering value → raw value (if scaling fields are set) ----
    let writeValue = value;

    const { rawMin, rawMax, engMin, engMax } = spec;

    // Only scale if all scaling parameters are meaningfully set (not just defaults)
    const hasScaling = rawMin != null && rawMax != null && engMin != null && engMax != null &&
      (rawMin !== 0 || rawMax !== 100 || engMin !== 0 || engMax !== 100);

    if (hasScaling && typeof value === 'number') {
      // Avoid division by zero
      if (engMax === engMin) {
        throw new Error(`Invalid scaling: engMin (${engMin}) equals engMax (${engMax})`);
      }

      // Linear scaling: eng → raw
      let scaled = rawMin + (value - engMin) * (rawMax - rawMin) / (engMax - engMin);

      // Clamp to raw range
      scaled = Math.max(rawMin, Math.min(rawMax, scaled));

      // Round based on target data type
      if (spec.dataType === 'INT' || spec.dataType === 'DINT' || spec.dataType === 'WORD') {
        scaled = Math.round(scaled);
      }
      // For REAL, leave as float

      writeValue = scaled;

      this.log.debug(`Scaled engineering value ${value} → raw value ${writeValue} using [${engMin}:${engMax}] → [${rawMin}:${rawMax}]`);
    }

    // ---- Proceed with original logic, using writeValue instead of value ----
    const sizeBytes = this.byteSize(spec.dataType) * Math.max(1, spec.amount);
    const h = this.areaHelper(spec.area);
    const buf = this.encode(writeValue, spec.dataType, spec.amount, spec.bitOffset); // ← use scaled value here

    if (spec.area === 'DB') {
      const ok: boolean = client[h.write](spec.dbNumber ?? 0, spec.start, sizeBytes, buf);
      if (!ok) throw this.snap7Error(client, `DBWrite db=${spec.dbNumber} start=${spec.start} size=${sizeBytes}`);
      this.log.debug(`DBWrite db=${spec.dbNumber} start=${spec.start} size=${sizeBytes} buf=0x${buf.toString('hex')} value=${writeValue}`);
    } else if (spec.area === 'TM' || spec.area === 'CT') {
      const elements = Math.max(1, spec.amount);
      const byteLen = 2 * elements;
      if (buf.length !== byteLen) {
        const tmp = Buffer.alloc(byteLen);
        buf.copy(tmp, 0, 0, Math.min(buf.length, byteLen));
        const ok: boolean = client[h.write](spec.start, byteLen, tmp);
        if (!ok) throw this.snap7Error(client, `${h.write} start=${spec.start} size=${byteLen}`);
      } else {
        const ok: boolean = client[h.write](spec.start, byteLen, buf);
        if (!ok) throw this.snap7Error(client, `${h.write} start=${spec.start} size=${byteLen}`);
      }
      this.log.debug(`${h.write} start=${spec.start} size=${byteLen} buf=0x${buf.toString('hex')}`);
    } else {
      const ok: boolean = client[h.write](spec.start, sizeBytes, buf);
      if (!ok) throw this.snap7Error(client, `${h.write} start=${spec.start} size=${sizeBytes}`);
      this.log.debug(`${h.write} start=${spec.start} size=${sizeBytes} buf=0x${buf.toString('hex')}`);
    }
  }

  // ---------- helpers ----------

  private wordLen(type: ReadSpec['dataType']): number {
    // node-snap7 WordLen constants (per docs)
    const S7WLBit = 0x01;
    const S7WLByte = 0x02;
    const S7WLWord = 0x04;
    const S7WLDWord = 0x06;
    const S7WLReal = 0x08;

    switch (type) {
      case 'BOOL': return S7WLBit;
      case 'BYTE': return S7WLByte;
      case 'WORD': return S7WLWord;
      case 'INT': return S7WLWord;
      case 'DWORD': return S7WLDWord;
      case 'DINT': return S7WLDWord;
      case 'REAL': return S7WLReal;
      default: throw new Error(`Unsupported dataType: ${type}`);
    }
  }

  /** Map area string to S7 constant */
  private toArea(area: ReadSpec['area']): number {
    // Values per Snap7 docs
    const map: Record<ReadSpec['area'], number> = {
      DB: 0x84, // S7AreaDB
      PE: 0x81, // Inputs (Process Inputs)
      PA: 0x82, // Outputs (Process Outputs)
      MK: 0x83, // Merkers/Flags
      TM: 0x1D, // Timers
      CT: 0x1C, // Counters
    };
    const v = map[area];
    if (v === undefined) throw new Error(`Unsupported area: ${area}`);
    return v;
  }

  /** Byte size per single element of the S7 data type */
  private byteSize(type: ReadSpec['dataType']): number {
    switch (type) {
      case 'BOOL': return 1; // we read a whole byte and interpret bit0 as boolean (simple mode)
      case 'BYTE': return 1;
      case 'WORD': return 2;
      case 'INT': return 2;
      case 'DWORD': return 4;
      case 'DINT': return 4;
      case 'REAL': return 4;
      default: throw new Error(`Unsupported dataType: ${type}`);
    }
  }

  /** Decode buffer -> value(s) according to type/amount */
  private decode(buf: Buffer, type: ReadSpec['dataType'], amount: number, bitOffset?: number): any {
    const size = this.byteSize(type);
    const readOne = (offset: number) => {
      switch (type) {
        case 'BOOL': {
          const bit = bitOffset ?? 0; // default to bit 0
          if (bit < 0 || bit > 7) throw new Error(`Invalid bitOffset ${bit} for BOOL`);
          return (buf.readUInt8(offset) & (1 << bit)) !== 0;
        }
        case 'BYTE': return buf.readUInt8(offset);
        case 'WORD': return buf.readUInt16BE(offset);
        case 'INT': return buf.readInt16BE(offset);
        case 'DWORD': return buf.readUInt32BE(offset);
        case 'DINT': return buf.readInt32BE(offset);
        case 'REAL': return buf.readFloatBE(offset);
        default: throw new Error(`Unsupported dataType: ${type}`);
      }
    };

    if (amount > 1) {
      const arr: any[] = [];
      for (let i = 0; i < amount; i++) arr.push(readOne(i * size));
      return arr;
    }
    return readOne(0);
  }

  /** Encode value(s) -> buffer according to type/amount */
  private encode(value: any, type: ReadSpec['dataType'], amount: number, bitOffset?: number): Buffer {
    const size = this.byteSize(type);
    const total = size * Math.max(1, amount);
    const buf = Buffer.alloc(total);

    const writeOne = (val: any, offset: number) => {
      switch (type) {
        case 'BOOL': {
          const bit = bitOffset ?? 0;
          if (bit < 0 || bit > 7) throw new Error(`Invalid bitOffset ${bit} for BOOL`);

          // Read current byte (if exists), or start with 0
          let byte = buf.length > offset ? buf.readUInt8(offset) : 0;

          // Set or clear the bit
          if (val) {
            byte |= (1 << bit); // set bit
          } else {
            byte &= ~(1 << bit); // clear bit
          }

          buf.writeUInt8(byte, offset);
          break;
        }
        case 'BYTE': buf.writeUInt8(this.toUInt(val), offset); break;
        case 'WORD': buf.writeUInt16BE(this.toUInt(val), offset); break;
        case 'INT': buf.writeInt16BE(this.toInt(val), offset); break;
        case 'DWORD': buf.writeUInt32BE(this.toUInt(val), offset); break;
        case 'DINT': buf.writeInt32BE(this.toInt(val), offset); break;
        case 'REAL': buf.writeFloatBE(Number(val), offset); break;
        default: throw new Error(`Unsupported dataType: ${type}`);
      }
    };

    if (amount > 1 && Array.isArray(value)) {
      value.forEach((v, i) => writeOne(v, i * size));
    } else {
      writeOne(value, 0);
    }
    return buf;
  }

  private toUInt(v: any): number {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`Value is not a number: ${v}`);
    return Math.max(0, Math.floor(n));
    // NOTE: We don't mask to 16/32 bits; Snap7 will write the bytes we provide.
  }

  private toInt(v: any): number {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`Value is not a number: ${v}`);
    return Math.trunc(n);
  }
}
