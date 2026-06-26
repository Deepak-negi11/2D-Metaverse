import prisma from "@repo/db";
import { ClientMessage } from "@repo/shared";
import { getUserIdFromToken } from "../middleware/auth";
import type { Socket, SocketData } from "./room-manager";
import {
  addToRoom,
  broadcast,
  othersInRoom,
  removeFromRoom,
  updatePosition,
} from "./room-manager";

type JoinPayload = {
  spaceId: string;
  token: string;
};

type MovePayload = {
  x: number;
  y: number;
};

export function makeSocketData(): SocketData {
  return { x: 0, y: 0 };
}

function send(ws: Socket, message: unknown) {
  ws.send(JSON.stringify(message));
}

function isOneTileMove(from: { x: number; y: number }, to: MovePayload) {
  return Math.abs(to.x - from.x) + Math.abs(to.y - from.y) === 1;
}

export async function onMessage(ws: Socket, raw: string | Buffer) {
  let json: unknown;

  try {
    json = JSON.parse(raw.toString());
  } catch {
    return send(ws, { type: "error", message: "Invalid JSON" });
  }

  const parsed = ClientMessage.safeParse(json);
  if (!parsed.success) {
    return send(ws, { type: "error", message: "Invalid message" });
  }

  switch (parsed.data.type) {
    case "join":
      return handleJoin(ws, parsed.data.payload);
    case "move":
      return handleMove(ws, parsed.data.payload);
  }
}

async function handleJoin(ws: Socket, payload: JoinPayload) {
  const userId = getUserIdFromToken(payload.token);
  if (!userId) {
    return send(ws, { type: "error", message: "Invalid token" });
  }

  const space = await prisma.space.findUnique({
    where: { id: payload.spaceId },
  });

  if (!space) {
    return send(ws, { type: "error", message: "Space not found" });
  }

  const spawn = { x: 0, y: 0 };
  ws.data.userId = userId;
  ws.data.spaceId = payload.spaceId;
  ws.data.x = spawn.x;
  ws.data.y = spawn.y;

  const existingUsers = othersInRoom(payload.spaceId, userId).map((member) => ({
    id: member.userId,
    x: member.x,
    y: member.y,
  }));

  addToRoom(payload.spaceId, {
    socket: ws,
    userId,
    x: spawn.x,
    y: spawn.y,
  });

  send(ws, {
    type: "space-joined",
    payload: { userId, spawn, users: existingUsers },
  });

  broadcast(payload.spaceId, userId, {
    type: "user-join",
    payload: { userId, x: spawn.x, y: spawn.y },
  });
}

function handleMove(ws: Socket, payload: MovePayload) {
  const { spaceId, userId, x: currentX, y: currentY } = ws.data;

  if (!spaceId || !userId) {
    return send(ws, { type: "error", message: "Join a space first" });
  }

  const currentPosition = { x: currentX, y: currentY };
  if (!isOneTileMove(currentPosition, payload)) {
    return send(ws, {
      type: "movement-rejected",
      payload: currentPosition,
    });
  }

  ws.data.x = payload.x;
  ws.data.y = payload.y;
  updatePosition(spaceId, userId, payload.x, payload.y);

  broadcast(spaceId, userId, {
    type: "movement",
    payload: { userId, x: payload.x, y: payload.y },
  });
}

export function onClose(ws: Socket) {
  const { spaceId, userId } = ws.data;
  if (!spaceId || !userId) return;

  removeFromRoom(spaceId, userId);

  broadcast(spaceId, userId, {
    type: "user-left",
    payload: { userId },
  });
}
