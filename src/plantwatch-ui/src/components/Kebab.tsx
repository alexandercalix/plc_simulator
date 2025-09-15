"use client";
import { useEffect, useRef, useState } from "react";

export default function Kebab({
  items,
}: {
  items: { label: string; action: () => void; danger?: boolean; disabled?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button className="btn px-2" onClick={() => setOpen(o => !o)} aria-label="More">
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border bg-white p-1 shadow-lg">
          {items.map((it, i) => (
            <button
              key={i}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-100 ${
                it.danger ? "text-red-600" : ""
              } ${it.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => { if (!it.disabled) { it.action(); setOpen(false); } }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}