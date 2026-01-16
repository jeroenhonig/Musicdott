/**
 * WebSocket Manager for Real-time Features
 */

import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

export class WebSocketManager {
  public io: SocketIOServer;
  private eventHandlers = new Map<string, Function[]>();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      path: "/ws",
      cors: {
        origin: process.env.NODE_ENV === 'production' ? ['https://musicdott.app'] : true,
        credentials: true
      }
    });

    this.setupBaseHandlers();
  }

  private setupBaseHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`WebSocket client disconnected: ${socket.id}`);
      });

      // Handle all registered event types
      for (const [eventName, handlers] of Array.from(this.eventHandlers.entries())) {
        socket.on(eventName, (data: any) => {
          handlers.forEach((handler: any) => handler(socket, data));
        });
      }
    });
  }

  public on(eventName: string, handler: (socket: any, data: any) => void) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName)!.push(handler);
  }

  public emit(eventName: string, data: any) {
    this.io.emit(eventName, data);
  }

  public to(room: string) {
    return this.io.to(room);
  }

  public close() {
    console.log('🔌 Closing WebSocket server...');
    this.io.close();
  }
}