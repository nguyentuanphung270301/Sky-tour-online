import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { WebSocket, WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";
import type { Server as HttpServer } from "node:http";
import { handleAdminRequest } from "./api/admin";

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
const validAsset = /^\/assets\/quaternius-crowd\/[A-Za-z0-9_.-]+\.gltf$/;
const defaultAsset = "/assets/quaternius-crowd/Casual_Male.gltf";
const defaultLightstickColor = "#8edbff";
const validLightstickColor = /^#[0-9a-f]{6}$/i;

type LocalParticipant = Participant & { lastSeenAt: number };

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

function multiplayerPlugin(): Plugin {
  const rooms = new Map<string, Map<string, LocalParticipant>>();

  const attachWebSocketServer = (httpServer: HttpServer) => {
    // Do not pass the Vite HTTP server into ws directly: ws would reject Vite's
    // own HMR WebSocket upgrade because it is not the /sky-tour path.
    const socketServer = new WebSocketServer({ noServer: true });

    httpServer.on("upgrade", (request, socket, head) => {
      const pathname = request.url?.split("?", 1)[0];
      if (pathname !== "/sky-tour") return;
      socketServer.handleUpgrade(request, socket, head, (client) => {
        socketServer.emit("connection", client, request);
      });
    });

    socketServer.on("connection", (socket) => {
      const participantId = randomUUID();
      let roomId: string | null = null;

      const send = (payload: unknown) => {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
      };

      const broadcastRoom = (roomName: string, payload: unknown, exceptId?: string) => {
        const room = rooms.get(roomName);
        if (!room) return;
        for (const [id] of room) {
          if (id === exceptId) continue;
          const peer = [...socketServer.clients].find((candidate) => candidate !== socket && candidate.readyState === WebSocket.OPEN && (candidate as WebSocket & { skyParticipantId?: string }).skyParticipantId === id);
          if (peer) peer.send(JSON.stringify(payload));
        }
      };

      const broadcast = (payload: unknown, exceptId?: string) => {
        if (roomId) broadcastRoom(roomId, payload, exceptId);
      };

      (socket as WebSocket & { skyParticipantId?: string }).skyParticipantId = participantId;

      socket.on("message", (raw) => {
        let message: ClientMessage;
        try {
          message = JSON.parse(raw.toString()) as ClientMessage;
        } catch {
          send({ type: "error", message: "Dữ liệu realtime không hợp lệ." });
          return;
        }

        if (message.type === "join") {
          if (roomId) return;
          const requestedRoom = typeof message.nightId === "string" ? message.nightId.slice(0, 32) : "hanoi";
          const room = rooms.get(requestedRoom) ?? new Map<string, LocalParticipant>();
          const staleCutoff = Date.now() - STALE_CONNECTION_MS;
          for (const [id, staleConnection] of room) {
            if (staleConnection.lastSeenAt >= staleCutoff) continue;
            room.delete(id);
            broadcastRoom(requestedRoom, { type: "participant-left", id }, id);
            const stalePeer = [...socketServer.clients].find((candidate) => (candidate as WebSocket & { skyParticipantId?: string }).skyParticipantId === id);
            stalePeer?.close();
          }
          const requestedZoneId = typeof message.zoneId === "string" ? message.zoneId.slice(0, 80) : "unknown-zone";
          const requestedClientId = typeof message.clientId === "string" ? message.clientId.slice(0, 80) : randomUUID();
          const existingConnection = [...room.entries()].find(([, participant]) => participant.clientId === requestedClientId);
          const retainedSeatIndex = existingConnection && existingConnection[1].zoneId === requestedZoneId ? existingConnection[1].seatIndex : undefined;
          if (existingConnection) {
            room.delete(existingConnection[0]);
            broadcastRoom(requestedRoom, { type: "participant-left", id: existingConnection[0] }, existingConnection[0]);
            const oldPeer = [...socketServer.clients].find((candidate) => (candidate as WebSocket & { skyParticipantId?: string }).skyParticipantId === existingConnection[0]);
            oldPeer?.close();
          }
          if (room.size >= MAX_PARTICIPANTS) {
            send({ type: "join-error", code: "ROOM_FULL", message: "Đêm diễn đã đủ 100 người." });
            return;
          }
          const zoneParticipants = [...room.values()].filter((participant) => participant.zoneId === requestedZoneId);
          if (zoneParticipants.length >= MAX_SEATS_PER_ZONE) {
            send({ type: "join-error", code: "ZONE_FULL", zoneId: requestedZoneId, message: "Khu vực này đã hết chỗ trên 3 bậc khán đài. Vui lòng chọn khu vực khác." });
            return;
          }
          const occupiedSeatIndices = new Set(zoneParticipants.map((participant) => participant.seatIndex));
          const seatIndex = retainedSeatIndex !== undefined && !occupiedSeatIndices.has(retainedSeatIndex)
            ? retainedSeatIndex
            : Array.from({ length: MAX_SEATS_PER_ZONE }, (_, index) => index).find((index) => !occupiedSeatIndices.has(index)) ?? zoneParticipants.length;
          roomId = requestedRoom;
          rooms.set(roomId, room);
          const participant: LocalParticipant = {
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
            lastSeenAt: Date.now(),
          };
          room.set(participantId, participant);
          send({ type: "joined", selfId: participantId, participants: [...room.values()], capacity: MAX_PARTICIPANTS });
          broadcast({ type: "participant-joined", participant }, participantId);
          return;
        }

        if (!roomId) return;
        const room = rooms.get(roomId);
        const participant = room?.get(participantId);
        if (!room || !participant) return;

        if (message.type === "heartbeat") {
          participant.lastSeenAt = Date.now();
          send({ type: "pong", timestamp: Date.now() });
          return;
        }

        if (message.type === "pose") {
          participant.lastSeenAt = Date.now();
          participant.position = parsePosition(message.position);
          participant.rotation = clampNumber(message.rotation, participant.rotation, -Math.PI * 2, Math.PI * 2);
          if (message.lightstickColor !== undefined) participant.lightstickColor = parseLightstickColor(message.lightstickColor);
          participant.dancing = Boolean(message.dancing);
          broadcast({ type: "participant-updated", participant }, participantId);
        }
      });

      const leaveRoom = () => {
        if (!roomId) return;
        const room = rooms.get(roomId);
        room?.delete(participantId);
        broadcast({ type: "participant-left", id: participantId }, participantId);
        if (room && room.size === 0) rooms.delete(roomId);
        roomId = null;
      };

      socket.on("close", leaveRoom);
      socket.on("error", leaveRoom);
    });
  };

  return {
    name: "sky-tour-multiplayer",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if ((request.url ?? "").split("?", 1)[0] !== "/api/admin") {
          next();
          return;
        }
        void (async () => {
          const chunks: Buffer[] = [];
          if (request.method !== "GET" && request.method !== "HEAD") {
            for await (const chunk of request) chunks.push(Buffer.from(chunk));
          }
          const headers = new Headers();
          for (const [key, value] of Object.entries(request.headers)) {
            if (typeof value === "string") headers.set(key, value);
            else if (Array.isArray(value)) headers.set(key, value.join(","));
          }
          const origin = `http://${request.headers.host ?? "localhost"}`;
          const apiResponse = await handleAdminRequest(new Request(new URL(request.url ?? "/api/admin", origin), { method: request.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined }));
          response.statusCode = apiResponse.status;
          apiResponse.headers.forEach((value, key) => response.setHeader(key, value));
          response.end(Buffer.from(await apiResponse.arrayBuffer()));
        })().catch(next);
      });
      if (server.httpServer) attachWebSocketServer(server.httpServer as HttpServer);
    },
    configurePreviewServer(server) {
      attachWebSocketServer(server.httpServer as HttpServer);
    },
  };
}

export default defineConfig({
  plugins: [react(), multiplayerPlugin()],
  server: {
    watch: {
      ignored: [
        "**/.chrome-check/**",
        "**/.chrome-check-2/**",
        "**/.edge-check/**",
        "**/dist/**",
        "**/docx-qa-*/**",
      ],
    },
  },
});
