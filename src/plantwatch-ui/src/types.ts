export type Plc = {
id: number;
name: string;
ip: string;
port: number;
rack: number;
slot: number;
type: string;
enabled: boolean;
status: "connected" | "disconnected" | "unknown";
lastError: string | null;
lastErrorAt: string | null; // ISO
errorCount: number;
createdAt: string; // ISO
updatedAt: string; // ISO
tags: Tag[];
};


export type Tag = {
id: number;
plcId: number;
name: string;
area: "DB" | "PE" | "PA" | "MK" | "TM" | "CT";
dbNumber?: number | null;
start: number;
amount: number;
dataType: "BOOL" | "BYTE" | "WORD" | "INT" | "DWORD" | "DINT" | "REAL";
polling: boolean;
readOnly: boolean;
quality: "GOOD" | "BAD" | "UNCERTAIN" | null;
lastError: string | null;
lastValue: string | null; // JSON string
updatedAt: string; // ISO
};


export type PlcStatusEvent = {
plcId: number;
status: "connected" | "disconnected";
error?: string;
ts?: number;
};


export type TagUpdateEvent = {
tagId: number;
plcId: number;
name: string;
value: any; // decoded raw value
quality: "GOOD" | "BAD" | "UNCERTAIN";
ts: number;
};

// types/dashboard.ts (o en tu "@/types" si ya lo usas global)
export type WidgetType = 'gauge' | 'tank' | 'boolLamp' | 'imageToggle' | 'analog' | 'pump';

export interface SourceTag {
  plcId: number;
  tagId: number;
  name?: string;
  unit?: string;
  dataType?: string;
}

export interface WidgetBase {
  id: string;
  type: WidgetType;
  title?: string;
  x: number; y: number; w: number; h: number;
}

// === Nuevo: Analógico con límites ===
export interface AnalogWidget extends WidgetBase {
  type: 'analog';
  pv: SourceTag;              // valor analógico (obligatorio)
  sp?: SourceTag;             // setpoint opcional (y escribible)
  unit?: string;
  min?: number;               // para escala visual
  max?: number;
  // Límites (numéricos, no tags)
  ll?: number; l?: number; h?: number; hh?: number;
  // Colores opcionales
  colors?: {
    ll?: string; l?: string; normal?: string; h?: string; hh?: string;
  };
}

// === Nuevo: Bomba con múltiples tags ===
export interface PumpWidget extends WidgetBase {
  type: 'pump';
  runFb?: SourceTag;          // feedback: está corriendo
  runCmd?: SourceTag;         // comando de marcha (escribible)
  auto?: SourceTag;           // modo auto
  hand?: SourceTag;           // modo manual
  vdd?: SourceTag;            // si true → mostrar Remote/Local en vez de Auto/Hand
  rth?: SourceTag;            // alarma tipo high temp (ejemplo)
  rtm?: SourceTag;            // alarma tipo motor (ejemplo)
  allowCommands?: boolean;    // habilita Start/Stop
}

export type Widget =
  | AnalogWidget
  | PumpWidget
  | (WidgetBase & Record<string, any>); // tus anteriores (gauge, tank, etc.)

export interface Dashboard {
  id: string;
  name: string;
  widgets: Widget[];
}
