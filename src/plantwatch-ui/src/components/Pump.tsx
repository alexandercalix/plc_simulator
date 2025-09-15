"use client";
import { writeTag } from "@/lib/writeTag";

export function Pump({
  title,
  values,                  // { runFb?, runCmd?, auto?, hand?, vdd?, rth?, rtm? }
  allowCommands,
  runCmdTagId
}: {
  title?: string;
  values: Partial<Record<'runFb'|'runCmd'|'auto'|'hand'|'vdd'|'rth'|'rtm', any>>;
  allowCommands?: boolean;
  runCmdTagId?: number;
}) {
  const running = !!values.runFb;
  const alarm   = !!values.rth || !!values.rtm;

  // Modo: si vdd existe, mostramos Remote/Local; si no, Auto/Hand
  const hasVdd = values.vdd !== undefined;
  const modeLabel = hasVdd
    ? (!!values.vdd ? "REMOTE" : "LOCAL")
    : (!!values.auto ? "AUTO" : (!!values.hand ? "HAND" : "—"));

  const bg = alarm ? "#fee2e2" : (running ? "#dcfce7" : "#f3f4f6"); // rojo pálido, verde pálido, gris
  const ring = alarm ? "#ef4444" : (running ? "#16a34a" : "#9ca3af");

  const sendCmd = async (state: boolean) => {
    if (!allowCommands || !runCmdTagId) return;
    await writeTag(runCmdTagId, state ? 1 : 0);
  };

  return (
    <div className="h-full w-full rounded-2xl p-3" style={{ background: bg, border: `2px solid ${ring}` }}>
      {title && <div className="text-sm mb-2">{title}</div>}

      <div className="flex items-center gap-3">
        {/* “Icono” simple */}
        <div className="h-10 w-10 rounded-full" style={{ background: running ? "#16a34a" : "#9ca3af" }} />
        <div className="text-lg font-semibold">{running ? "RUNNING" : "STOPPED"}</div>
        <div className="ml-auto text-xs px-2 py-1 rounded" style={{ background: "#e5e7eb" }}>{modeLabel}</div>
      </div>

      <div className="mt-2 text-xs text-gray-700 flex gap-3">
        <span>Cmd:{values.runCmd ? "1" : "0"}</span>
        <span>RTH:{values.rth ? "1" : "0"}</span>
        <span>RTM:{values.rtm ? "1" : "0"}</span>
      </div>

      {allowCommands && runCmdTagId && (
        <div className="mt-3 flex gap-2">
          <button className="btn btn-sm" onClick={() => sendCmd(true)}>Start</button>
          <button className="btn btn-sm" onClick={() => sendCmd(false)}>Stop</button>
        </div>
      )}
    </div>
  );
}
