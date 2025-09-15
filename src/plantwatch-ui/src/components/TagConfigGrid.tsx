"use client";

import { AgGridReact } from "ag-grid-react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";

import { useSWRConfig } from "swr";
import toast from "react-hot-toast";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

// AG Grid styles
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Your types & API
import type { Tag } from "@/types";
import { createTag, patchTag, deleteTag } from "@/lib/api";

type Row = Partial<Tag> & {
  _tmpId: number;
  _dirty?: boolean;
  _state?: "idle" | "saving" | "saved" | "error";
  _errorMsg?: string;

  bitOffset?: number;

  rawMin?: number;
  rawMax?: number;
  engMin?: number;
  engMax?: number;
  unit?: string;
  formula?: string;
};

const toNum = (v: unknown, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const makeNewRow = (plcId: number): Row => ({
  _tmpId: -Math.floor(Math.random() * 1e9),
  plcId,
  name: "",
  area: "DB",
  dbNumber: 1,
  start: 0,
  bitOffset: 0,
  amount: 1,
  dataType: "INT",
  polling: true,
  readOnly: false,

  rawMin: 0,
  rawMax: 100,
  engMin: 0,
  engMax: 100,
  unit: "",
  formula: "linear", // or leave undefined if you don’t show formula yet

  _dirty: true,
  _state: "idle"
});

function validateRow(r: Row): string | null {
  if (!r.name || !r.name.trim()) return "Name is required";
  if (r.area === "DB" && (r.dbNumber == null || Number.isNaN(Number(r.dbNumber)))) return "DB number required";
  if (r.start == null || Number.isNaN(Number(r.start))) return "Start required";
  if (r.amount == null || Number.isNaN(Number(r.amount)) || Number(r.amount) <= 0) return "Amount must be > 0";
  if (!r.dataType) return "Type required";

  // 👇 ADD SCALING VALIDATION
  if (
    r.rawMin != null && r.rawMax != null && r.engMin != null && r.engMax != null &&
    r.rawMin === r.rawMax
  ) {
    return "rawMin and rawMax cannot be equal (division by zero)";
  }

  if (
    r.rawMin != null && r.rawMax != null && r.engMin != null && r.engMax != null &&
    r.engMin === r.engMax
  ) {
    return "engMin and engMax cannot be equal (division by zero)";
  }

  return null;
}

export default function TagConfigGridAG({
  plcId,
  initialTags,
  onSaved
}: {
  plcId: number;
  initialTags: Tag[];
  onSaved: () => void;
}) {
  const gridRef = useRef<AgGridReact<any>>(null);
  const { mutate } = useSWRConfig();
  const copiesRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Row[]>(
    (initialTags ?? []).map(t => ({ ...t, _tmpId: t.id!, _dirty: false, _state: "idle" }))
  );

  const handleSaved = useCallback(() => {
    mutate(`/api/plc/${plcId}/tags`);
    toast.success("Synced");
  }, [mutate, plcId]);

  const onGridReady = (e: any) => e.api.hideOverlay();

  // keep rows fresh if parent revalidates
  useEffect(() => {
    setRows((initialTags ?? []).map(t => ({ ...t, _tmpId: t.id!, _dirty: false, _state: "idle" })));
  }, [initialTags]);

  const columnDefs = useMemo(
    () => [
      { headerName: "", checkboxSelection: true, headerCheckboxSelection: true, width: 40, pinned: "left" },
      { field: "name", headerName: "Name", editable: true, width: 200 },
      {
        field: "area",
        headerName: "Area",
        editable: true,
        width: 90,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["DB", "PE", "PA", "MK", "TM", "CT"] }
      },
      {
        field: "dbNumber",
        headerName: "DB",
        editable: (params: any) => params.data.area === "DB",
        width: 90,
        valueParser: (p: any) => (Number.isFinite(+p.newValue) ? +p.newValue : 1),
        valueFormatter: (p: any) => (p.data?.area === "DB" ? p.value ?? "" : "n/a")
      },
      {
        field: "start",
        headerName: "Start",
        editable: true,
        width: 90,
        valueParser: (p: any) => (Number.isFinite(+p.newValue) ? +p.newValue : 0)
      },
      {
        field: "bitOffset",
        headerName: "Bit",
        editable: (params: any) => params.data.dataType === "BOOL", // only for BOOL
        width: 70,
        valueParser: (p: any) => {
          const v = Number.isFinite(+p.newValue) ? +p.newValue : 0;
          return Math.max(0, Math.min(7, v)); // clamp 0-7
        },
        valueFormatter: (p: any) => p.data?.dataType === "BOOL" ? (p.value ?? 0) : "n/a"
      },
      {
        field: "amount",
        headerName: "Amt",
        editable: true,
        width: 80,
        valueParser: (p: any) => {
          const v = Number.isFinite(+p.newValue) ? +p.newValue : 1;
          return v <= 0 ? 1 : v;
        }
      },

      {
        field: "dataType",
        headerName: "Type",
        editable: true,
        width: 110,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["BOOL", "BYTE", "WORD", "INT", "DWORD", "DINT", "REAL"] }
      },
      {
        field: "polling",
        headerName: "Poll",
        editable: true,
        width: 80,
        cellEditor: "agCheckboxCellEditor",
        valueFormatter: (p: any) => (p.value ? "✓" : "")
      },
      {
        field: "readOnly",
        headerName: "RO",
        editable: true,
        width: 70,
        cellEditor: "agCheckboxCellEditor",
        valueFormatter: (p: any) => (p.value ? "✓" : "")
      },
      {
        field: "rawMin",
        headerName: "Raw Min",
        editable: true,
        width: 90,
        valueParser: (p: any) => (Number.isFinite(+p.newValue) ? +p.newValue : 0),
        valueFormatter: (p: any) => p.value?.toFixed(2) ?? "0.00"
      },
      {
        field: "rawMax",
        headerName: "Raw Max",
        editable: true,
        width: 90,
        valueParser: (p: any) => (Number.isFinite(+p.newValue) ? +p.newValue : 100),
        valueFormatter: (p: any) => p.value?.toFixed(2) ?? "100.00"
      },
      {
        field: "engMin",
        headerName: "Eng Min",
        editable: true,
        width: 90,
        valueParser: (p: any) => (Number.isFinite(+p.newValue) ? +p.newValue : 0),
        valueFormatter: (p: any) => p.value?.toFixed(2) ?? "0.00"
      },
      {
        field: "engMax",
        headerName: "Eng Max",
        editable: true,
        width: 90,
        valueParser: (p: any) => (Number.isFinite(+p.newValue) ? +p.newValue : 100),
        valueFormatter: (p: any) => p.value?.toFixed(2) ?? "100.00"
      },
      {
        field: "unit",
        headerName: "Unit",
        editable: true,
        width: 80
      },
      // Optional — hide formula for now if you only support "linear"
      {
        field: "formula",
        headerName: "Formula",
        editable: true,
        width: 100,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["linear"] }, // extend later
        hide: true // 👈 hide for now, or remove if not needed
      }
    ],
    []
  );

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: false,
      filter: false
    }),
    []
  );

  const getRowId = useMemo(() => (params: any) => String(params.data._tmpId), []);

  const onCellValueChanged = (e: any) => {
    const r: Row = { ...e.data };
    r.start = Number.isFinite(+r.start) ? +r.start : 0;
    r.bitOffset = r.dataType === "BOOL" ? (Number.isFinite(+r.bitOffset) ? Math.max(0, Math.min(7, +r.bitOffset)) : 0) : null;
    r.amount = Number.isFinite(+r.amount) ? Math.max(1, +r.amount) : 1;
    r.polling = !!r.polling;
    r.readOnly = !!r.readOnly;

    // 👇 PARSE SCALING NUMBERS
    r.rawMin = Number.isFinite(+r.rawMin) ? +r.rawMin : 0;
    r.rawMax = Number.isFinite(+r.rawMax) ? +r.rawMax : 100;
    r.engMin = Number.isFinite(+r.engMin) ? +r.engMin : 0;
    r.engMax = Number.isFinite(+r.engMax) ? +r.engMax : 100;

    if (r.area !== "DB") r.dbNumber = null;
    else r.dbNumber = Number.isFinite(+r.dbNumber!) ? +r.dbNumber! : 1;

    r._dirty = true;
    r._state = r._state === "error" ? "idle" : r._state;
    r._errorMsg = undefined;

    setRows(prev => prev.map(x => (x._tmpId === r._tmpId ? r : x)));
  };

  const addRow = () => setRows(r => [...r, makeNewRow(plcId)]);

  const getSelectedTmpIds = () => {
    const api = gridRef.current?.api;
    if (!api) return [];
    return api
      .getSelectedNodes()
      .map((n: any) => n.data?._tmpId)
      .filter(Boolean);
  };

  const duplicateSelected = () => {
    const ids = getSelectedTmpIds();
    if (ids.length === 0) return;
    const clones: Row[] = [];
    for (const id of ids) {
      const r = rows.find(x => x._tmpId === id);
      if (!r) continue;
      clones.push({
        ...r,
        id: undefined,
        _tmpId: -Math.floor(Math.random() * 1e9),
        name: (r.name ?? "") + "_copy",
        _dirty: true,
        _state: "idle"
      });
    }
    setRows(rs => [...rs, ...clones]);
  };

  const deleteSelected = async () => {
    const ids = getSelectedTmpIds();
    if (ids.length === 0) return;
    const ok = confirm(`Delete ${ids.length} row(s)?`);
    if (!ok) return;
    try {
      const toDeleteIds = rows.filter(r => ids.includes(r._tmpId) && r.id != null).map(r => r.id!) as number[];
      for (const id of toDeleteIds) await deleteTag(id);
      setRows(r => r.filter(x => !ids.includes(x._tmpId)));
      toast.success("Deleted");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  async function saveRow(r: Row) {
    const err = validateRow(r);
    if (err) {
      setRows(rs => rs.map(x => (x._tmpId === r._tmpId ? { ...x, _state: "error", _errorMsg: err } : x)));
      toast.error(err);
      return;
    }
    setRows(rs => rs.map(x => (x._tmpId === r._tmpId ? { ...x, _state: "saving" } : x)));
    try {
      if (r.id) {
        await patchTag(r.id, {
          name: r.name!,
          area: r.area!,
          dbNumber: r.area === "DB" ? toNum(r.dbNumber, 1) : null,
          start: toNum(r.start, 0),
          bitOffset: r.dataType === "BOOL" ? toNum(r.bitOffset, 0) : null,
          amount: toNum(r.amount, 1),
          dataType: r.dataType!,
          polling: !!r.polling,
          readOnly: !!r.readOnly,
          rawMin: toNum(r.rawMin, 0),
          rawMax: toNum(r.rawMax, 100),
          engMin: toNum(r.engMin, 0),
          engMax: toNum(r.engMax, 100),
          unit: r.unit ?? "",
          formula: r.formula ?? "linear"
        });
      } else {
        const payload = await createTag({
          plcId,
          name: r.name!,
          area: r.area!,
          dbNumber: r.area === "DB" ? toNum(r.dbNumber, 1) : null,
          start: toNum(r.start, 0),
          amount: toNum(r.amount, 1),
          dataType: r.dataType!,
          polling: !!r.polling,
          readOnly: !!r.readOnly,

          rawMin: toNum(r.rawMin, 0),
          rawMax: toNum(r.rawMax, 100),
          engMin: toNum(r.engMin, 0),
          engMax: toNum(r.engMax, 100),
          unit: r.unit ?? "",
          formula: r.formula ?? "linear"
        });
        r.id = payload.id;
      }
      setRows(rs => rs.map(x => (x._tmpId === r._tmpId ? { ...x, _dirty: false, _state: "saved", _errorMsg: undefined } : x)));
    } catch (e: any) {
      const msg = e?.message || "Save failed";
      setRows(rs => rs.map(x => (x._tmpId === r._tmpId ? { ...x, _state: "error", _errorMsg: msg } : x)));
      toast.error(msg);
    }
  }

  async function saveAll() {
    const news = rows.filter(r => !r.id && r._dirty);
    const updates = rows.filter(r => r.id && r._dirty);
    for (const r of [...news, ...updates]) {
      // eslint-disable-next-line no-await-in-loop
      await saveRow(r);
    }
    toast.success("Saved");
    onSaved();
  }

  const onCellEditingStopped = (e: any) => {
    const lastRowIdx = rows.length - 1;
    if (e.rowIndex !== lastRowIdx) return;
    const editableColIds = (e.api.getColumnDefs() as any[])
      .filter((c: any) => c.editable === true || typeof c.editable === "function")
      .map((c: any) => c.field);
    const lastEditable = editableColIds[editableColIds.length - 1];
    if (e.column.getColId() === lastEditable) {
      addRow();
      setTimeout(() => {
        const firstEditable = editableColIds[0];
        if (firstEditable) e.api.startEditingCell({ rowIndex: lastRowIdx + 1, colKey: firstEditable });
      }, 0);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveAll();
      } else if (isMod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === "Delete") {
        e.preventDefault();
        void deleteSelected();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [rows]); // rebind when rows changes (safe here)

  const duplicateSelectedN = () => {
    const n = Math.max(1, Number(copiesRef.current?.value ?? 1));
    const ids = getSelectedTmpIds();
    if (ids.length === 0) return;

    const clones: Row[] = [];
    for (const id of ids) {
      const base = rows.find(x => x._tmpId === id);
      if (!base) continue;
      for (let i = 0; i < n; i++) {
        clones.push({
          ...base,
          id: undefined,
          _tmpId: -Math.floor(Math.random() * 1e9),
          name: (base.name ?? "") + `_copy${i + 1}`,
          _dirty: true,
          _state: "idle"
        });
      }
    }
    setRows(rs => [...rs, ...clones]);
    // reselect the newly added rows (nice UX)
    setTimeout(() => {
      const api = gridRef.current?.api;
      if (!api) return;
      api.deselectAll();
      clones.forEach((c, idx) => {
        const rowNode = api.getRowNode(String(c._tmpId));
        if (rowNode) rowNode.setSelected(true);
      });
    }, 0);
  };

  const processDataFromClipboard = (params: any) => {
    // columns must be in this order; adjust to your grid order if needed
    const order = [
      "name", "area", "start", "amount", "dbNumber", "dataType", "polling", "readOnly",
      "rawMin", "rawMax", "engMin", "engMax", "unit", "formula"
    ] as const;

    // params.data is a 2D array of strings
    const newRows: Row[] = [];
    for (const rowArr of params.data as string[][]) {
      const r: any = {};
      order.forEach((k, i) => (r[k] = rowArr[i]));
      // coerce types
      r.start = Number(r.start) || 0;
      r.amount = Math.max(1, Number(r.amount) || 1);
      r.dbNumber = r.area === "DB" ? (Number(r.dbNumber) || 1) : null;
      r.polling = String(r.polling).toLowerCase() === "true" || r.polling === "1" || r.polling === "✓";
      r.readOnly = String(r.readOnly).toLowerCase() === "true" || r.readOnly === "1" || r.readOnly === "✓";

      r.rawMin = Number(r.rawMin) || 0;
      r.rawMax = Number(r.rawMax) || 100;
      r.engMin = Number(r.engMin) || 0;
      r.engMax = Number(r.engMax) || 100;
      r.unit = r.unit || "";
      r.formula = r.formula || "linear";

      newRows.push({
        ...r,
        plcId,
        _tmpId: -Math.floor(Math.random() * 1e9),
        _dirty: true,
        _state: "idle"
      });
    }
    setRows(prev => [...prev, ...newRows]);
    // tell grid we handled it
    return null;
  };

  return (
    <div className="ag-theme-quartz" style={{ height: 500, width: "100%" }}>
      <div className="flex items-center gap-2 mb-2">
        <button className="btn" onClick={addRow}>+ Add Row</button>

        <input
          ref={copiesRef}
          type="number"
          min={1}
          defaultValue={1}
          className="input w-16 text-center"
          title="How many copies"
        />
        <button className="btn" onClick={() => duplicateSelectedN()}>
          Duplicate ×N
        </button>

        <button className="btn" onClick={deleteSelected}>Delete</button>
        <div className="ml-auto" />
        <button className="btn" onClick={saveAll}>Save All</button>
      </div>

      <AgGridReact
        theme="legacy"
        ref={gridRef}
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={getRowId}
        rowSelection="multiple"
        suppressRowClickSelection
        onGridReady={onGridReady}
        onCellValueChanged={onCellValueChanged}
        onCellEditingStopped={onCellEditingStopped}
        singleClickEdit={true}
        overlayNoRowsTemplate={'<div style="padding:8px;color:#6b7280">No tags yet. Click “+ Add Row”.</div>'}
        //         enableRangeSelection={true}
        // enableFillHandle={true}
        // fillHandleDirection="y"   // drag vertically
        suppressClipboardPaste={false}
        processDataFromClipboard={processDataFromClipboard}

      />
    </div>
  );
}
