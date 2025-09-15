// components/widgets/Gauge.tsx
export function Gauge({ value = 0, min, max, unit, title, thresholds = [] }:{
  value?: number; min: number; max: number; unit?: string; title?: string;
  thresholds?: { value: number; color: string }[];
}) {
  const pct = Math.max(0, Math.min(1, (Number(value) - min) / (max - min || 1)));
  const angle = -120 + pct * 240; // semi-circle+ range
  const color = thresholds.find(t => pct * 100 >= t.value)?.color ?? '#16a34a';
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-2">
      {title && <div className="mb-1 text-sm">{title}</div>}
      <svg viewBox="0 0 200 120" className="w-full">
        <path d="M10,110 A90,90 0 0,1 190,110" fill="none" stroke="#e5e7eb" strokeWidth="14" />
        <line x1="100" y1="110" x2={100 + 80 * Math.cos((Math.PI/180)*angle)}
              y2={110 + 80 * Math.sin((Math.PI/180)*angle)}
              stroke={color} strokeWidth="6" strokeLinecap="round"/>
      </svg>
      <div className="mt-1 text-lg font-semibold">{Number(value).toFixed(1)} {unit}</div>
    </div>
  );
}

// components/widgets/Tank.tsx
export function Tank({ value = 0, min, max, unit, title }:{
  value?: number; min: number; max: number; unit?: string; title?: string;
}) {
  const pct = Math.max(0, Math.min(1, (Number(value) - min) / (max - min || 1)));
  return (
    <div className="flex h-full w-full flex-col p-2">
      {title && <div className="mb-1 text-sm">{title}</div>}
      <div className="relative flex-1 min-h-0 border rounded-xl overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 bg-blue-500 transition-all duration-500"
             style={{ height: `${pct*100}%` }}/>
      </div>
      <div className="mt-1 text-sm text-gray-600">{Number(value).toFixed(1)} {unit}</div>
    </div>
  );
}

// components/widgets/BoolLamp.tsx
export function BoolLamp({ value, title, onColor='#22c55e', offColor='#9ca3af' }:{
  value?: any; title?: string; onColor?: string; offColor?: string;
}) {
  const v = !!value;
  return (
    <div className="flex h-full w-full items-center gap-3 p-3">
      <div className="h-6 w-6 rounded-full shadow-inner" style={{ background: v ? onColor : offColor }}/>
      <div className="text-sm">{title}</div>
    </div>
  );
}

// components/widgets/ImageToggle.tsx
export function ImageToggle({ value, onUrl, offUrl, title }:{
  value?: any; onUrl: string; offUrl: string; title?: string;
}) {
  const src = !!value ? onUrl : offUrl;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-2">
      {title && <div className="mb-1 text-sm">{title}</div>}
      <img src={src} alt="state" className="max-h-full object-contain" />
    </div>
  );
}
