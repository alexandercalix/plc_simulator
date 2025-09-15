"use client";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import type { PlcStatusEvent, TagUpdateEvent } from "@/types";


export function usePlcSocket(
handlers: {
onPlcStatus?: (e: PlcStatusEvent) => void;
onTagUpdate?: (e: TagUpdateEvent) => void;
} = {}
) {
useEffect(() => {
const s = getSocket();
const { onPlcStatus, onTagUpdate } = handlers;


const onConnect = () => console.log("ws connected", s.id);
const onDisconnect = (r: any) => console.log("ws disconnected", r);


s.on("connect", onConnect);
s.on("disconnect", onDisconnect);
if (onPlcStatus) s.on("plc:status", onPlcStatus);
if (onTagUpdate) s.on("tag:update", onTagUpdate);


return () => {
s.off("connect", onConnect);
s.off("disconnect", onDisconnect);
if (onPlcStatus) s.off("plc:status", onPlcStatus);
if (onTagUpdate) s.off("tag:update", onTagUpdate);
};
}, [handlers.onPlcStatus, handlers.onTagUpdate]);
}