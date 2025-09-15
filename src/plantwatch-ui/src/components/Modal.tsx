"use client";
import { ReactNode, useEffect } from "react";

export default function Modal({
  open, onClose, title, children, footer,
}: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-[min(720px,92vw)] rounded-2xl bg-white p-5 shadow-xl">
        {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
        <div className="max-h-[70vh] overflow-auto">{children}</div>
        {footer && <div className="mt-4 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
