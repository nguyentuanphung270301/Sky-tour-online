import { upgradeWebSocket, type WebSocketData } from "@vercel/functions";
import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";

type Participant = {
  id: string;
  clientId: string;
  name: string;
  asset: string;
  lightstickColor: string;
  zoneId: string;
  seatIndex: number;
  position: [number, number, number];
  rotation: number;
  dancing: boolean;
};

type ClientMessage = {
  type?: string;
  clientId?: string;
  nightId?: string;
  name?: string;
  asset?: string;
  lightstickColor?: unknown;
  zoneId?: string;
  position?: unknown;
  rotation?: unknown;
  dancing?: unknown;
};

const MAX_PARTICIPANTS = 100;
const MAX_SEATS_PER_ZONE = 12;
const STALE_CONNECTION_MS = 45000;
const defaultAsset = "/assets/quaternius-crowd/Casual_Male.gltf";
const defaultLightstickColor = "#8edbff";
const validAsset = /^\/assets\/quaternius-crowd\/[A-Za-z0-9_.-]+\.gltf$/;
const validLightstickColor = /^#[0-9a-f]{6}$/i;

type RoomConnection = { socket: WebSocket; participant: Participant; lastSeenAt: number };
type Room = Map<string, RoomConnection>;

// A warm Vercel Function keeps this hub alive for all sockets pinned to that
// instance. For multi-instance room fan-out, add a shared Redis transport later.
const rooms = new Map<string, Room>();

const clampNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const numberValue = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, numberValue));
};

const parsePosition = (value: unknown): [number, number, number] => {
  const source = Array.isArray(value) ? value : [];
  return [
    clampNumber(source[0], 0, -24, 24),
    clampNumber(source[1], 0.5, 0, 8),
    clampNumber(source[2], 0, -24, 24),
  ];
};

const parseLightstickColor = (value: unknown) => typeof value === "string" && validLightstickColor.test(value) ? value.toLowerCase() : defaultLightstickColor;

const send = (socket: WebSocket, payload: unknown) => {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
};

const broadcast = (room: Room, payload: unknown, exceptId?: string) => {
  for (const [id, connection] of room) {
    if (id !== exceptId) send(connection.socket, payload);
  }
};

const pruneStaleConnections = (room: Room) => {
  const cutoff = Date.now() - STALE_CONNECTION_MS;
  for (const [id, connection] of room) {
    if (connection.lastSeenAt >= cutoff) continue;
    room.delete(id);
    broadcast(room, { type: "participant-left", id }, id);
    connection.socket.close();
  }
};

export default {
  fetch(request: Request) {
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    return upgradeWebSocket((socket) => {
      const participantId = randomUUID();
      let roomId: string | null = null;
      let closed = false;

      const leaveRoom = () => {
        if (closed) return;
        closed = true;
        if (!roomId) return;

        const room = rooms.get(roomId);
        room?.delete(participantId);
        if (room) {
          broadcast(room, { type: "participant-left", id: participantId }, participantId);
          if (room.size === 0) rooms.delete(roomId);
        }
        roomId = null;
      };

      socket.on("message", (raw: WebSocketData) => {
        let message: ClientMessage;
        try {
          message = JSON.parse(raw.toString()) as ClientMessage;
        } catch {
          send(socket, { type: "error", message: "Dữ liệu realtime không hợp lệ." });
          return;
        }

        if (message.type === "join") {
          if (roomId) return;

          const requestedRoom = typeof message.nightId === "string" ? message.nightId.slice(0, 32) : "hanoi";
          const room = rooms.get(requestedRoom) ?? new Map<string, RoomConnection>();
          pruneStaleConnections(room);
          const requestedZoneId = typeof message.zoneId === "string" ? message.zoneId.slice(0, 80) : "unknown-zone";
          const requestedClientId = typeof message.clientId === "string" ? message.clientId.slice(0, 80) : randomUUID();
          const existingConnection = [...room.entries()].find(([, connection]) => connection.participant.clientId === requestedClientId);
          const retainedSeatIndex = existingConnection && existingConnection[1].participant.zoneId === requestedZoneId ? existingConnection[1].participant.seatIndex : undefined;
          if (existingConnection) {
            room.delete(existingConnection[0]);
            broadcast(room, { type: "participant-left", id: existingConnection[0] }, existingConnection[0]);
            existingConnection[1].socket.close();
          }
          if (room.size >= MAX_PARTICIPANTS) {
            send(socket, { type: "join-error", code: "ROOM_FULL", message: "Đêm diễn đã đủ 100 người." });
            return;
          }

          const zoneParticipants = [...room.values()].filter(({ participant }) => participant.zoneId === requestedZoneId);
          if (zoneParticipants.length >= MAX_SEATS_PER_ZONE) {
            send(socket, { type: "join-error", code: "ZONE_FULL", zoneId: requestedZoneId, message: "Khu vực này đã hết chỗ trên 3 bậc khán đài. Vui lòng chọn khu vực khác." });
            return;
          }
          const occupiedSeatIndices = new Set(zoneParticipants.map(({ participant }) => participant.seatIndex));
          const seatIndex = retainedSeatIndex !== undefined && !occupiedSeatIndices.has(retainedSeatIndex)
            ? retainedSeatIndex
            : Array.from({ length: MAX_SEATS_PER_ZONE }, (_, index) => index).find((index) => !occupiedSeatIndices.has(index)) ?? zoneParticipants.length;

          const participant: Participant = {
            id: participantId,
            clientId: requestedClientId,
            name: typeof message.name === "string" ? message.name.trim().slice(0, 24) || "SKY guest" : "SKY guest",
            asset: typeof message.asset === "string" && validAsset.test(message.asset) ? message.asset : defaultAsset,
            lightstickColor: parseLightstickColor(message.lightstickColor),
            zoneId: requestedZoneId,
            seatIndex,
            position: parsePosition(message.position),
            rotation: clampNumber(message.rotation, 0, -Math.PI * 2, Math.PI * 2),
            dancing: Boolean(message.dancing),
          };

          roomId = requestedRoom;
          rooms.set(roomId, room);
          room.set(participantId, { socket, participant, lastSeenAt: Date.now() });
          send(socket, { type: "joined", selfId: participantId, participants: [...room.values()].map(({ participant: value }) => value), capacity: MAX_PARTICIPANTS });
          broadcast(room, { type: "participant-joined", participant }, participantId);
          return;
        }

        if (!roomId) return;
        const room = rooms.get(roomId);
        const connection = room?.get(participantId);
        if (!room || !connection) return;

        if (message.type === "heartbeat") {
          connection.lastSeenAt = Date.now();
          send(socket, { type: "pong", timestamp: Date.now() });
          return;
        }

        if (message.type === "pose") {
          connection.lastSeenAt = Date.now();
          connection.participant.position = parsePosition(message.position);
          connection.participant.rotation = clampNumber(message.rotation, connection.participant.rotation, -Math.PI * 2, Math.PI * 2);
          if (message.lightstickColor !== undefined) connection.participant.lightstickColor = parseLightstickColor(message.lightstickColor);
          connection.participant.dancing = Boolean(message.dancing);
          broadcast(room, { type: "participant-updated", participant: connection.participant }, participantId);
        }
      });

      socket.on("close", leaveRoom);
      socket.on("error", leaveRoom);
    }, { maxPayload: 32 * 1024 });
  },
};
