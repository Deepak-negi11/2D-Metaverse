import { password } from "bun";
import {describe , test,expect,beforeAll,afterAll} from "bun:test"
  import type { Server } from "bun";
  import { startServer } from "../index";

  const PORT = 4001;
  const BACKEND_URL = `http://localhost:${PORT}`;
  
  let server: Server;

  beforeAll(() => {
    server = startServer(PORT);
  });

  afterAll(() => {
    server.stop(true); 
  });


async function post(path:string , body:unknown){
    const res = await fetch(`${BACKEND_URL}${path}`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body),
    });
    const data = await res.json().catch(()=> null);
    return {status :res.status , data}
}

describe("Authentication",async()=>{
    describe("signup",()=>{
        test("user can signup",async()=>{
            const username = `deepak- ${crypto.randomUUID()}`
            const res = await post("/api/v1/signup",{
                username , 
                password:"password123",
                email:"deepaktest@gmail.com",
            });
            expect(res.status).toBe(200);
            expect(res.data.userId).toString()
        })
        test("signup with same email twize fails",async()=>{
            const username = `deepak- ${crypto.randomUUID()}`;
            const body = {username , password:"password123",email:"deepaktest@gmail.com"};
            const first = await post("/api/v1/signup",body);
            expect(first.status).toBe(200);

            const second = await post("/api/v1/signup",body);
            expect(second.status).toBe(400)
        });
        test("signup with short password fails",async()=>{
            const res = await post("/api/v1/signup",{
                username:`deepak- ${crypto.randomUUID()}`,
                password:"123",
                email:"deepaktest@gmail.com"
            })
            expect(res.status).toBe(400)
        });
        
    });
    describe("signin",()=>{
        test("signin with correct credentials return a token ",async()=>{
            const username = `deepak- ${crypto.randomUUID()}`;
            const password = "password123";
            const email ="deepaktest@gmail.com";

            await post("/api/v1/signup",{username ,
                password, email
            });

            const res = await post("/api/v1/signin",{email,password
            });

            expect(res.status).toBe(200);
            expect(res.data.token).toBeString()
        });

        test("signin  with the wrong password fails",async()=>{
            const username = `deepak- ${crypto.randomUUID()}`;
            await post("/api/v1/signup", {
                username,
                password: "password123",
                email:"deepaktest@gmail.com"
            });
            
            const res = await post("/api/v1/signin",{
                email:"deepaktest@gmail.com",
                password:"password"
            });
            expect(res.status).toBe(403)
        })
        test("singin with the wrong email",async()=>{
            const username = `deepak- ${crypto.randomUUID()}` ;
            await post("/api/v1/signup",{
                username,
                password:"password123",
                email:"deepak@gmail.com"
            });

            const res = await post("/api/v1/signin",{
                email:"deepak@gmail.com",
                password:"password123"
            });
            expect(res.status).toBe(403)
        })
        test("signin with non-existent user fails", async () => {
            const res = await post("/api/v1/signin", {
            username: "ghost-" + crypto.randomUUID(),
            password: "password123",
            });
            expect(res.status).toBe(403);
        });
    })
})