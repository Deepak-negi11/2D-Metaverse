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
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });
}
