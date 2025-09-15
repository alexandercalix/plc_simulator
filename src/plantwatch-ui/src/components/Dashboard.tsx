"use client";
import { useTagValues } from '@/hooks/useTagValues';
import { AnalogWidget, Dashboard, PumpWidget } from '@/types';
import { BoolLamp, Gauge, ImageToggle, Tank } from './Gauge';
import { Pump } from './Pump';
import { Analog } from './Analog';

export function DashboardView({
  dash, editable = false, onEdit, onDelete
}: {
  dash: Dashboard;
  editable?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  // Recolecta TODAS las fuentes que cualquier widget necesite
  const allSources = dash.widgets.flatMap(w => {
    if (w.type === 'analog') {
      const a = w as AnalogWidget;
      return [a.pv, ...(a.sp ? [a.sp] : [])].filter(Boolean) as any[];
    }
    if (w.type === 'pump') {
      const p = w as PumpWidget;
      return [p.runFb, p.runCmd, p.auto, p.hand, p.vdd, p.rth, p.rtm].filter(Boolean) as any[];
    }
    // otros (1 tag máx typical)
    return (w as any).source ? [(w as any).source] : [];
  });

  const values = useTagValues(allSources);

  return (
    <div className="grid grid-cols-12 gap-3 h-full min-h-0">
      {dash.widgets.map(w => {
        // helpers
        const valOf = (s?: { plcId:number; tagId:number }) => s ? values.get(s) : undefined;

        return (
          <div key={w.id}
            className="relative col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 border rounded-2xl p-2 h-56">
            {editable && (
              <div className="absolute right-2 top-2 z-10 flex gap-2">
                <button className="btn btn-sm" onClick={() => onEdit?.(w.id)}>Edit</button>
                <button className="btn btn-sm" onClick={() => onDelete?.(w.id)}>Delete</button>
              </div>
            )}

            {w.type === 'analog' && (() => {
              const a = w as AnalogWidget;
              return (
                <Analog
                  title={a.title}
                  value={valOf(a.pv)}
                  spValue={valOf(a.sp)}
                  spTagId={a.sp?.tagId}
                  unit={a.unit}
                  min={a.min} max={a.max}
                  ll={a.ll} l={a.l} h={a.h} hh={a.hh}
                  colors={a.colors}
                />
              );
            })()}

            {w.type === 'pump' && (() => {
              const p = w as PumpWidget;
              return (
                <Pump
                  title={p.title}
                  allowCommands={p.allowCommands}
                  runCmdTagId={p.runCmd?.tagId}
                  values={{
                    runFb: valOf(p.runFb),
                    runCmd: valOf(p.runCmd),
                    auto:  valOf(p.auto),
                    hand:  valOf(p.hand),
                    vdd:   valOf(p.vdd),
                    rth:   valOf(p.rth),
                    rtm:   valOf(p.rtm),
                  }}
                />
              );
            })()}

            {w.type === 'gauge'       && <Gauge value={(w as any).__value} min={(w as any).min} max={(w as any).max} unit={(w as any).unit} title={w.title} thresholds={(w as any).thresholds} />}
            {w.type === 'tank'        && <Tank  value={(w as any).__value} min={(w as any).min} max={(w as any).max} unit={(w as any).unit} title={w.title} />}
            {w.type === 'boolLamp'    && <BoolLamp value={(w as any).__value} title={w.title} />}
            {w.type === 'imageToggle' && <ImageToggle value={(w as any).__value} onUrl={(w as any).onUrl} offUrl={(w as any).offUrl} title={w.title} />}
          </div>
        );
      })}
    </div>
  );
}
