import { io, Socket } from "socket.io-client";
import type { PlcStatusEvent, TagUpdateEvent } from "@/types";


let socket: Socket | null = null;


export function getSocket(): Socket {
if (socket) return socket;
const url = process.env.NEXT_PUBLIC_WS || process.env.NEXT_PUBLIC_API || "http://localhost:3000";
const path = process.env.NEXT_PUBLIC_WS_PATH || "/ws";
socket = io(url, { path, transports: ["websocket"], autoConnect: true, reconnection: true });
return socket;
}


export type SocketEvents = {
"plc:status": (m: PlcStatusEvent) => void;
"tag:update": (m: TagUpdateEvent) => void;
};