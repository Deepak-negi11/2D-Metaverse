import jwt from "jsonwebtoken";
import prisma from "@repo/db";
import type { Socket,SocketData } from "./room-manager";
import {
  addToRoom,
  removeFromRoom,
  broadcast,
  othersInRoom,
  updatePosition
} from "./room-manager";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

export function makeSocketData():SocketData{
  return {x:0 , y:0};
}

function send(ws:Socket , message:unknown){
  ws.send(JSON.stringify(message))
}

export async function onMessage(ws:Socket , raw:string|Buffer){
  let event:any;
  try {
    event = JSON.parse(raw.toString())
  }catch{
    return send(ws,{type:"error" , message:"Invalid JSON"})
  }
  if (event.type === "join") return handleJoin(ws , event.payload);
  if (event.type === "move") return handleMove(ws, event.payload);

  send(ws , {type:"error" , message:"Unknown message type"})

}


 async function handleJoin(ws: Socket, payload: { spaceId?: string; token?: string }) {
    const { spaceId, token } = payload ?? {};

    if (!spaceId || !token) {
      return send(ws, { type: "error", message: "spaceId and token required" });
    }
    let userId: string;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch {
      return send(ws, { type: "error", message: "Invalid token" });
    }
    const space = await prisma.space.findUnique({ where: { id: spaceId } });
    if (!space) {
      return send(ws, { type: "error", message: "Space not found" });
    }

    const spawn = { x: 0, y: 0 };

    ws.data.userId = userId;
    ws.data.spaceId = spaceId;
    ws.data.x = spawn.x;
    ws.data.y = spawn.y;

  const existing = othersInRoom(spaceId, userId).map((m) => ({
      id: m.userId,
      x: m.x,
      y: m.y,
  }));


  addToRoom(spaceId, { socket: ws, userId, x: spawn.x, y: spawn.y });
    send(ws, {
      type: "space-joined",
      payload: { userId, spawn, users: existing },
    });
  
    broadcast(spaceId, userId, {
      type: "user-join",
      payload: { userId, x: spawn.x, y: spawn.y },
    });
  }
 
  function handleMove(ws: Socket, payload: { x?: number; y?: number }) {
    const { spaceId, userId, x: curX, y: curY } = ws.data;
    if (!spaceId || !userId) {
      return send(ws, { type: "error", message: "Join a space first" });
    }
    const x = payload?.x;
    const y = payload?.y;

    if(typeof x !== "number" || typeof y !== "number"){
      return send(ws ,{type:"error" , message:"x and y required"});
    };

    const dx = Math.abs(x - curX);
    const dy = Math.abs(y - curY);
    const isOneTile = dx + dy === 1 ;

    if (!isOneTile) {
      return send(ws, {
        type: "movement-rejected",
        payload: { x: curX, y: curY },
      });
    }
     ws.data.x = x;
    ws.data.y = y;
    updatePosition(spaceId, userId, x, y);

    broadcast(spaceId, userId, {
      type: "movement",
      payload: { userId, x, y },
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
