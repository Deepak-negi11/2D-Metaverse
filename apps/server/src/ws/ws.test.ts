import {describe , test, expect , beforeAll , afterAll} from "bun:test";
import {resolve, type Server} from "bun";
import axios from "axios";
import { startServer } from "../../index";

const Port = 4010;
const HTTP_URL = `https://localhost:${Port}`;
const WS_URL = `ws://locahost:${Port}/ws`;

let server : Server ;

beforeAll(()=>{
   server = startServer(Port);

});

afterAll(()=>{
  server.stop(true);
});

//what is this http here what does it does 
const http = axios.create({baseURL:HTTP_URL , validateStatus:()=>true});

class TestSocket {
  private socket:WebSocket;
  private received: any[] = [];
  private pending:((msg:any)=> void)[] = []

  constructor(url:string){
    this.socket = new WebSocket(url);
    this.socket.onmessage = (event)=>{
      const message = JSON.parse(event.data.toString());
      //what is this waiter does 
      const waiter = this.pending.shift();
      if(waiter){
        waiter(message);
      }else{
        this.received.push(message)
      }
    }
  }

  waitForOpen(): Promise<void>{
    //what is thsi resolve and reject 
    return new Promise((resolve , reject)=>{
      this.socket.onopen = ()=> resolve();
      this.socket.onerror = (err)=> reject(err);
    })
  }

  send(message:unknown){
    this.socket.send(JSON.stringify(message))
  }

  nextMessage(timeoutMs = 2000):Promise<any>{
    // now what i shits this.recieed.shift what does it does 
    const buffered = this.received.shift()
    if(buffered){
      return Promise.resolve(buffered)
    }
    return new Promise((resolve,reject)=>{
      const timer = setTimeout(()=> reject(new Error ("timed out waiting for ws message")),timeoutMs);
      this.pending.push((msg)=>{
        clearTimeout(timer);
        resolve(msg);
      });
    });
  }

  close(){
    this.socket.close();
  }
}

async function setupUserAndSpace(){
  const email = `${crypto.randomUUID()}@test.com`;
  const password = "password123";

  await http.post("/api/v1/signup",{
    username:`ws-${crypto.randomUUID()}`,
    password,
    email,
    type:"admin"
  });

  const signin = await http.post("/api/v1/signin", {email , password});
  const token = signin.data.token as string;

  const space = await http.post(
    "api/v1/space",
    {name : "WS Space" , dimension :"100x100"},
    {headers:{Authorization :`Bearer ${token}`}},
  );

  const spaceId = space.data.spaceId as string;

  return {token , spaceId}
}

describe("WebSocket",()=>{
  test("a client can connect to the websocket server" , async()=>{
    const ws = new TestSocket(WS_URL);
    await ws.waitForOpen();
    ws.close();

  });
  describe("join",()=>{
    test("joining a space returns space joined with a spawn point and your own userId",async()=>{
      const {token , spaceId} = await setupUserAndSpace();

      const ws = new TestSocket(WS_URL);
      await ws.waitForOpen();
      ws.send({ type:"join" , payload :{ spaceId , token}});
      
      const message = await ws.nextMessage();
      expect(message.type).toBe("space-joined");
      expect(message.payload.userId).toBeString();
      expect(message.payload.spawn.x).toBeNumber();
      expect(message.payload.spawn.y).toBeNumber();                       
      expect(Array.isArray(message.payload.users)).toBe(true);

      ws.close();
    });


    test("joining with an invalid token is rejected with an error" , async()=>{
      const {spaceId} = await setupUserAndSpace();
      const ws = new TestSocket(WS_URL);
      
      await ws.waitForOpen();
      ws.send({type:"join" , payload:{spaceId ,token:"not-a-real-token"}});

      const message = await ws.nextMessage();
      expect(message.type).toBe("error");

      ws.close();
    });

    test("an already-joined user in notified when a second user joins" , async()=>{
      const {token: tokenA , spaceId} = await setupUserAndSpace();
      const {token:tokenB} = await setupUserAndSpace();

      const wsA = new TestSocket(WS_URL);
      await wsA.waitForOpen();
      wsA.send({ type:"join" , payload: {spaceId, token:tokenA}});
      await wsA.nextMessage()

      

    })
  })
})