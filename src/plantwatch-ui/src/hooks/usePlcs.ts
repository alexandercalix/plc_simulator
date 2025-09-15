"use client";
import useSWR from "swr";
import { listPlcs, getPlc } from "@/lib/api";
import type { Plc } from "@/types";


export function usePlcs() {
const { data, error, isLoading, mutate } = useSWR<Plc[]>("/plcs", listPlcs, { revalidateOnFocus: false });
return { plcs: data || [], error, isLoading, mutate };
}


export function usePlc(id: number) {
const key = id ? `/plcs/${id}` : null;
const { data, error, isLoading, mutate } = useSWR<Plc>(key, () => getPlc(id), { revalidateOnFocus: false });
return { plc: data, error, isLoading, mutate };
}