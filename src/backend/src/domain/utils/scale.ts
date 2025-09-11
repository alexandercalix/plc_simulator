export type ScaleCfg = {
enabled: boolean;
rawMin?: number; rawMax?: number;
engMin?: number; engMax?: number;
dispMin?: number; dispMax?: number;
deadband?: number; // in ENG units
units?: string;
clamp?: boolean;
};


const clamp = (v: number, a: number, b: number) => Math.max(Math.min(v, Math.max(a,b)), Math.min(a,b));
const lin = (x: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
const denom = (inMax - inMin);
if (denom === 0) return outMin; // avoid div-by-zero
return ( (x - inMin) * (outMax - outMin) ) / denom + outMin;
};


export function rawToEng(raw: number, c: ScaleCfg) {
if (!c.enabled || c.rawMin == null || c.rawMax == null || c.engMin == null || c.engMax == null) return raw;
const v = lin(raw, c.rawMin, c.rawMax, c.engMin, c.engMax);
return c.clamp ? clamp(v, c.engMin, c.engMax) : v;
}


export function engToRaw(eng: number, c: ScaleCfg) {
if (!c.enabled || c.rawMin == null || c.rawMax == null || c.engMin == null || c.engMax == null) return eng;
const v = lin(eng, c.engMin, c.engMax, c.rawMin, c.rawMax);
return c.clamp ? clamp(v, c.rawMin, c.rawMax) : v;
}


export function engToPercent(eng: number, c: ScaleCfg) {
if (!c.enabled || c.engMin == null || c.engMax == null) return eng;
return lin(eng, c.engMin, c.engMax, 0, 100);
}


export function engToDisplay(eng: number, c: ScaleCfg) {
if (!c.enabled || c.dispMin == null || c.dispMax == null || c.engMin == null || c.engMax == null) return eng;
return lin(eng, c.engMin, c.engMax, c.dispMin, c.dispMax);
}


export function changedEnough(prevEng: number | undefined, nextEng: number, c: ScaleCfg) {
if (c.deadband == null || !isFinite(c.deadband) || c.deadband <= 0) return prevEng !== nextEng;
if (prevEng == null) return true;
return Math.abs(nextEng - prevEng) >= c.deadband;
}