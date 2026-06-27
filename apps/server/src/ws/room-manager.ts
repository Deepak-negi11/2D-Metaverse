import type { ServerWebSocket } from "bun";

export type SocketData = {
  userId?: string;
  spaceId?: string;
  x: number;
  y: number;
};

export type Socket = ServerWebSocket<SocketData>;

type Member = {
  socket: Socket;
  userId: string;
  x: number;
  y: number;
};

const rooms = new Map<string, Map<string, Member>>();

export function addToRoom(spaceId: string, member: Member) {
  let room = rooms.get(spaceId);

  if (!room) {
    room = new Map();
    rooms.set(spaceId, room);
  }

  room.set(member.userId, member);
}

export function removeFromRoom(spaceId: string, userId: string) {
  const room = rooms.get(spaceId);
  if (!room) return;

  room.delete(userId);

  if (room.size === 0) {
    rooms.delete(spaceId);
  }
}

export function roomSize(spaceId: string) {
  return rooms.get(spaceId)?.size ?? 0;
}

export function othersInRoom(spaceId: string, exceptUserId: string): Member[] {
  const room = rooms.get(spaceId);
  if (!room) return [];

  return [...room.values()].filter((member) => member.userId !== exceptUserId);
}

export function broadcast(spaceId: string, exceptUserId: string, message: unknown) {
  const data = JSON.stringify(message);

  for (const member of othersInRoom(spaceId, exceptUserId)) {
    member.socket.send(data);
  }
}

export function updatePosition(spaceId: string, userId: string, x: number, y: number) {
  const member = rooms.get(spaceId)?.get(userId);

  if (member) {
    member.x = x;
    member.y = y;
  }
}
