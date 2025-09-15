"use client";
import { usePlcs } from "@/hooks/usePlcs";
import PlcTable from "@/components/PlcTable";
import PlcForm from "@/components/PlcForm";
import { createPlc } from "@/lib/api";
import toast from "react-hot-toast";
import { usePlcSocket } from "@/hooks/usePlcSocket";
import Modal from "@/components/Modal";
import { useState } from "react";

export default function Page(){
  const { plcs, isLoading, mutate } = usePlcs();
  const [openCreate, setOpenCreate] = useState(false);

  usePlcSocket({
    onPlcStatus: () => mutate(),
    onTagUpdate: () => mutate(),
  });

  async function onCreate(p: any){
    try { await createPlc(p); toast.success("PLC created"); setOpenCreate(false); mutate(); }
    catch(e:any){ toast.error(e.message || "Create failed"); }
  }

  return (
    <main className="space-y-6">
      <section className="card flex items-center justify-between">
        <h2 className="text-lg font-semibold">PLCs</h2>
        <button className="btn" onClick={()=>setOpenCreate(true)}>+ New PLC</button>
      </section>
      <section className="card">
        {isLoading? <div>Loading…</div> : <PlcTable plcs={plcs} onMutate={mutate} />}
      </section>

      <Modal open={openCreate} onClose={()=>setOpenCreate(false)} title="Create PLC">
        <PlcForm onSubmit={onCreate} submitLabel="Create PLC" />
      </Modal>
    </main>
  );
}
