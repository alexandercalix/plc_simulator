"use client";
import { useState } from "react";

export default function Tabs({
  tabs,
  initial = 0
}: {
  tabs: { label: string; content: React.ReactNode }[];
  initial?: number;
}) {
  const [i, setI] = useState(initial);
  return (
    <div>
      <div className="mb-3 flex gap-2">
        {tabs.map((t, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            className={`btn ${i === idx ? "bg-gray-200" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{tabs[i].content}</div>
    </div>
  );
}
