import { handleSignup } from "./src/auth/signup";
import { handleSignin } from "./src/auth/signin";
import {
  handleCreateElement,
  handleCreateAvatar,
  handleCreateMap,
} from "./src/admin/admin";
import {
  handleUpdateMetadata,
  handleBulkMetadata,
  handleGetAvatars,
} from "./src/user/user";
import {
  handleCreateSpace,
  handleDeleteSpace,
  handleListSpaces,
  handleGetSpace,
  handleAddElement,
  handleListElements,
} from "./src/space/space";
import { makeSocketData, onMessage, onClose } from "./src/ws/ws-handler";
import type { SocketData } from "./src/ws/room-manager";

export function startServer(port: number) {
  return Bun.serve({
    port,
    routes: {
      // auth
      "/api/v1/signup": { POST: handleSignup },
      "/api/v1/signin": { POST: handleSignin },

      // user
      "/api/v1/user/metadata": { POST: handleUpdateMetadata },
      "/api/v1/user/metadata/bulk": { GET: handleBulkMetadata },
      "/api/v1/avatars": { GET: handleGetAvatars },

      // admin
      "/api/v1/admin/element": { POST: handleCreateElement },
      "/api/v1/admin/avatar": { POST: handleCreateAvatar },
      "/api/v1/admin/map": { POST: handleCreateMap },

      // space + arena
      "/api/v1/space": { POST: handleCreateSpace },
      "/api/v1/space/all": { GET: handleListSpaces },
      "/api/v1/space/element": { POST: handleAddElement },
      "/api/v1/space/:spaceId": { GET: handleGetSpace, DELETE: handleDeleteSpace },
      "/api/v1/elements": { GET: handleListElements },
    },
    fetch(req, server) {
      // Upgrade WebSocket connections on /ws
      if (new URL(req.url).pathname === "/ws") {
        const ok = server.upgrade<SocketData>(req, { data: makeSocketData() });
        if (ok) return; // upgraded — Bun takes over
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return new Response("Not Found", { status: 404 });
    },
    websocket: {
      message: onMessage,
      close: onClose,
    },
  });
}
