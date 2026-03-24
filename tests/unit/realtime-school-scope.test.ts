import { createServer } from "http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RealtimeBus } from "../../server/services/realtime-bus";
import { WebSocketManager } from "../../server/websocket-manager";

const openClosers: Array<() => void> = [];

afterEach(() => {
  while (openClosers.length > 0) {
    openClosers.pop()?.();
  }
});

describe("Realtime school scoping", () => {
  it("blocks RealtimeBus emits without a valid schoolId", () => {
    const bus = new RealtimeBus(createServer(), {} as any);
    const originalIo = (bus as any).io;
    openClosers.push(() => originalIo.close());

    const to = vi.fn(() => ({ emit: vi.fn() }));
    const emitToSchool = vi.spyOn(bus, "emitToSchool");
    (bus as any).io = { to };

    bus.emit("lesson_updated", { meta: {} });

    expect(emitToSchool).not.toHaveBeenCalled();
    expect(to).not.toHaveBeenCalled();
  });

  it("routes RealtimeBus compatibility emits into the school room", () => {
    const bus = new RealtimeBus(createServer(), {} as any);
    const originalIo = (bus as any).io;
    openClosers.push(() => originalIo.close());

    const roomEmit = vi.fn();
    const to = vi.fn(() => ({ emit: roomEmit }));
    (bus as any).io = { to };

    bus.emit("lesson_updated", { schoolId: 12, payload: "ok" });

    expect(to).toHaveBeenCalledWith("school:12");
    expect(roomEmit).toHaveBeenCalledWith("lesson_updated", { schoolId: 12, payload: "ok" });
  });

  it("routes realtime_event through emitToSchool", () => {
    const bus = new RealtimeBus(createServer(), {} as any);
    const originalIo = (bus as any).io;
    openClosers.push(() => originalIo.close());

    const emitToSchool = vi.spyOn(bus, "emitToSchool").mockReturnValue(0);

    bus.emit("realtime_event", { schoolId: 7, type: "test" });

    expect(emitToSchool).toHaveBeenCalledWith(7, { schoolId: 7, type: "test" });
  });

  it("blocks WebSocketManager emits without a valid schoolId", () => {
    const manager = new WebSocketManager(createServer());
    const originalIo = manager.io;
    openClosers.push(() => originalIo.close());

    const to = vi.fn(() => ({ emit: vi.fn() }));
    (manager as any).io = { to };

    manager.emit("lesson_updated", { meta: {} });

    expect(to).not.toHaveBeenCalled();
  });

  it("limits WebSocketManager emits to the school room", () => {
    const manager = new WebSocketManager(createServer());
    const originalIo = manager.io;
    openClosers.push(() => originalIo.close());

    const roomEmit = vi.fn();
    const to = vi.fn(() => ({ emit: roomEmit }));
    (manager as any).io = { to };

    manager.emit("lesson_updated", { schoolId: 33, payload: "ok" });

    expect(to).toHaveBeenCalledWith("school:33");
    expect(roomEmit).toHaveBeenCalledWith("lesson_updated", { schoolId: 33, payload: "ok" });
  });
});
