import { handleSignup } from "./src/auth/signup";
import { handleSignin } from "./src/auth/signin";

export function startServer(port: number) {
  return Bun.serve({
    port,
    routes: {
      "/api/v1/signup": { POST: handleSignup },
      "/api/v1/signin": { POST: handleSignin },
    },
    fetch() {
      return new Response("Not Found", { status: 404 });
    },
  });
}
