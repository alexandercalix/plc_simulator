"use client";

import { useState } from "react";
import { useLocalDash } from "@/lib/useLocalDash";
import { DashboardView } from "@/components/Dashboard";
import WidgetEditor from "@/components/WidgetEditor";
import { Dashboard, Widget } from "@/types";

const seed: Dashboard = {
  id: "demo",
  name: "Multi-PLC Demo",
  widgets: []
};

function newWidget(): Widget {
  return {
    id: crypto.randomUUID(),
    type: "gauge",
    title: "New Widget",
    source: { plcId: 1, tagId: 0 },
    x: 0, y: 0, w: 3, h: 2,
    min: 0, max: 100, unit: "%"
  } as any;
}

export default function DashboardsPage() {
  const { dashes, setDashes } = useLocalDash();
  const dash = dashes[0] ?? seed;

  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<Widget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function upsertDashboard(next: Dashboard) {
    if (dashes.length) setDashes([next, ...dashes.slice(1)]);
    else setDashes([next]);
  }

  // Añadir nuevo
  function startCreate() {
    setEditingId(null);
    setDraft(newWidget());
  }

  // Editar existente
  function startEdit(id: string) {
    const found = dash.widgets.find(w => w.id === id);
    if (!found) return;
    // clonar para edición
    setEditingId(id);
    setDraft(JSON.parse(JSON.stringify(found)));
  }

  // Guardar (nuevo o update)
  function saveWidget(w: Widget) {
    const base = dashes[0] ?? seed;
    let next: Dashboard;

    if (editingId) {
      next = {
        ...base,
        widgets: base.widgets.map(x => (x.id === editingId ? { ...w, id: editingId } : x))
      };
    } else {
      next = {
        ...base,
        widgets: [...base.widgets, { ...w, id: crypto.randomUUID() }]
      };
    }
    upsertDashboard(next);
    setDraft(null);
    setEditingId(null);
  }

  // Borrar
  function deleteWidget(id: string) {
    if (!confirm("Delete this widget?")) return;
    const base = dashes[0] ?? seed;
    const next: Dashboard = {
      ...base,
      widgets: base.widgets.filter(w => w.id !== id)
    };
    upsertDashboard(next);
  }

  return (
    <main className="p-6 h-[650px] overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <button className="btn" onClick={startCreate}>+ Add widget</button>
        <button
          className={`btn ${editMode ? 'bg-blue-600 text-white' : ''}`}
          onClick={() => setEditMode(v => !v)}
          title="Toggle edit mode to show Edit/Delete on each widget"
        >
          {editMode ? "Exit edit mode" : "Edit mode"}
        </button>
      </div>

      <div className="h-full min-h-0">
        <DashboardView
          dash={dash}
          editable={editMode}
          onEdit={startEdit}
          onDelete={deleteWidget}
        />
      </div>

      {draft && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-4 w-[720px] max-h-[80vh] overflow-auto">
            <WidgetEditor
              value={draft}
              onChange={setDraft}
              onSave={saveWidget}
              onCancel={() => { setDraft(null); setEditingId(null); }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
