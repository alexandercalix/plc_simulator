import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';


@WebSocketGateway({ path: process.env.SOCKET_PATH || '/ws', cors: { origin: '*' } })
export class EventsGateway {
@WebSocketServer() server!: Server;


emitTagUpdate(payload: any) { this.server.emit('tag:update', payload); }
emitPlcStatus(payload: any) { this.server.emit('plc:status', payload); }
emitError(payload: any) { this.server.emit('diag:error', payload); }


@SubscribeMessage('tag:write')
handleWrite(@MessageBody() body: { tagId: number; value: any }) {
// Handled by Poller/Driver through injected callback (wired in SiemensModule)
return { ack: true };
}
}