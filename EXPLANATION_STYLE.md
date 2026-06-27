# Explanation Style Guide

Use this guide when explaining files, functions, Redis logic, Prisma logic, WebSocket flow, or JavaScript methods in this project.

The goal is to explain code like a teacher: simple words, real project examples, and clear app flow.

## Main Format

For any file or function, explain it in this order:

1. What is this file/function for?
2. What problem is it solving?
3. What data shape is being stored or passed?
4. Explain each line/block in simple words.
5. Show a real example input.
6. Show what happens internally.
7. Show the output/result.
8. Explain where this is used in the app flow.
9. Mention bugs/edge cases.
10. Give the crux in one line.

## Short Template

```md
# File/Function Name

## What it does
One simple sentence.

## Why we need it
The problem it solves in our app.

## Input
What data comes in.

## Data shape
What shape is stored or passed.

## Internal logic
Step-by-step explanation.

## Output
What data comes out.

## Real example
Use project examples like deepak, rahul, room-1, math-class, x=10, y=20.

## Where used in project
Join flow / move flow / disconnect flow / admin API / Prisma create flow etc.

## Edge cases
What can break.

## Crux
One-line summary.
```

## Project Mental Model

For this 2D Metaverse app:

```txt
PostgreSQL = permanent database
Redis      = live memory for realtime state
WebSocket  = sends live events
Phaser     = draws avatars and map on screen
```

Permanent data:

```txt
users
spaces
maps
avatars
elements
placed furniture
chat history later
payments later
```

Temporary realtime data:

```txt
who is online
which space user is in
user x/y position
users inside one room
movement state
rate limits later
server/socket ownership later
```

## Redis Presence Explanation Pattern

When explaining `presence.ts`, explain it like this:

### What it does

This file stores live user positions in Redis.

It answers:

```txt
Who is online in this space?
Where is each user's avatar standing?
What is one user's latest x/y position?
Who should be removed when they leave?
```

### Why we need it

Users move constantly in a metaverse app.

Bad idea:

```sql
UPDATE users SET x = 10, y = 20;
UPDATE users SET x = 11, y = 20;
UPDATE users SET x = 12, y = 20;
```

PostgreSQL should not store every movement. Redis stores temporary live state.

### Redis data shape

One Redis hash per space:

```txt
Key:
space:{spaceId}:positions

Field:
userId

Value:
"x,y"
```

Example:

```txt
space:math-class:positions = {
  deepak: "10,20",
  rahul: "15,25",
  aman: "40,50"
}
```

This works because Redis hashes are field-value collections, like JavaScript objects or dictionaries.

## Redis Command Explanations

### HSET / HMSET

Purpose: save or update a field inside a Redis hash.

Use case in this project:

```txt
User joins room
User moves to new x/y
```

Example:

```txt
HSET space:math-class:positions deepak "10,20"
```

Meaning:

```txt
Inside room math-class,
set deepak's position to "10,20".
```

In JavaScript mental model:

```ts
redis["space:math-class:positions"]["deepak"] = "10,20";
```

In project code:

```ts
await redis.hmset(roomKey(spaceId), [userId, encode(pos)]);
```

Crux:

```txt
HSET/HMSET saves one user's live position.
```

### HMGET / HGET

Purpose: read one or more fields from a Redis hash.

Use case in this project:

```txt
Get one user's current position.
Check if one user is online.
```

Example:

```txt
HMGET space:math-class:positions deepak
```

Result:

```txt
["10,20"]
```

Then code converts:

```txt
"10,20" -> { x: 10, y: 20 }
```

Crux:

```txt
HMGET reads one user's saved position.
```

### HGETALL

Purpose: read every field and value from a Redis hash.

Use case in this project:

```txt
New user joins a room.
Server needs to send all existing online users to that new user.
```

Example Redis hash:

```txt
space:math-class:positions = {
  deepak: "10,20",
  rahul: "15,25"
}
```

Result shape in Bun Redis:

```ts
{
  deepak: "10,20",
  rahul: "15,25"
}
```

Then code converts it to:

```ts
[
  { userId: "deepak", x: 10, y: 20 },
  { userId: "rahul", x: 15, y: 25 }
]
```

Crux:

```txt
HGETALL gets everyone currently in the room.
```

### HDEL

Purpose: delete one field from a Redis hash.

Use case in this project:

```txt
User disconnects.
User leaves room.
Remove user's avatar from live room state.
```

Example:

```txt
HDEL space:math-class:positions deepak
```

Before:

```txt
{
  deepak: "10,20",
  rahul: "15,25"
}
```

After:

```txt
{
  rahul: "15,25"
}
```

Crux:

```txt
HDEL removes a user from live presence.
```

## Redis Presence App Flow

### User joins

1. Browser opens WebSocket.
2. Browser sends `join` message with `spaceId` and `token`.
3. Server verifies token.
4. Server gets `userId`.
5. Server chooses spawn position.
6. Server calls `setUserOnline(spaceId, userId, spawn)`.
7. Server calls `getRoomUsers(spaceId)`.
8. Server sends `space-joined` to the joining user.
9. Server broadcasts `user-join` to others.

Redis job:

```txt
store user as online
store user's position
return current room users
```

### User moves

1. Browser sends move x/y.
2. Server validates move is legal.
3. Server calls `setUserPosition(spaceId, userId, newPosition)`.
4. Server broadcasts movement to other users.

Redis job:

```txt
keep latest user position
```

### User disconnects

1. WebSocket closes.
2. Server calls `removeUser(spaceId, userId)`.
3. Server broadcasts `user-left`.

Redis job:

```txt
remove user from online room state
```

## Redis Pattern Decision

Use Redis hash when:

```txt
One group has many fields.
Example: room positions
space:math-class:positions -> userId -> "x,y"
```

Use Redis set when:

```txt
You only need membership.
Example: users in room
space:math-class:users -> deepak, rahul, aman
```

Use Redis string when:

```txt
You need one simple value, especially with TTL.
Example: one user's position key
space:math-class:user:deepak:pos -> "10,20"
```

## Redis Edge Cases To Mention

Always mention these when explaining Redis presence:

```txt
1. Ghost users:
   If server crashes, removeUser may not run.

2. No field-level TTL in a hash:
   Redis expires whole keys, not individual hash fields.

3. Large rooms:
   HGETALL is fine for small rooms, but heavy for huge rooms.

4. Multiple tabs:
   Same user may connect twice. Need socket/session tracking later.

5. Multi-server:
   Presence stores state, but Pub/Sub is needed to send live events across servers.
```

## Prisma Explanation Pattern

When explaining Prisma nested create:

```ts
mapElements: {
  create: defaultElements.map((element) => ({
    elementId: element.elementId,
    x: element.x,
    y: element.y,
  })),
}
```

Explain it like:

```txt
This creates the parent record and related child records together.
```

Example:

```txt
Map = Classroom blueprint
Element = reusable chair asset
MapElement = chair placed at x=10 y=20 inside that map
```

Data meaning:

```txt
Element = reusable asset
MapElement = placement of that asset inside a map
SpaceElement = placement of that asset inside a live user space
```

Crux:

```txt
Prisma nested create saves parent + related rows in one operation.
```

## JavaScript Method Explanation Pattern

### map()

Purpose:

```txt
Transform every item in an array.
```

Input:

```ts
[
  { id: "u1", name: "Deepak" },
  { id: "u2", name: "Rahul" }
]
```

Code:

```ts
const ids = users.map((user) => user.id);
```

Output:

```ts
["u1", "u2"]
```

Crux:

```txt
map takes every item and returns a new changed array.
```

### filter()

Purpose:

```txt
Keep only items that match a condition.
```

Input:

```ts
[
  { userId: "deepak", online: true },
  { userId: "rahul", online: false }
]
```

Code:

```ts
const onlineUsers = users.filter((user) => user.online);
```

Output:

```ts
[
  { userId: "deepak", online: true }
]
```

Crux:

```txt
filter removes items that do not pass the condition.
```

## Preferred Explanation Tone

Use:

```txt
simple words
real names like deepak, rahul, aman
real room names like room-1, math-class
real positions like x=10, y=20
small code examples
step-by-step app flow
```

Avoid:

```txt
big abstract explanations first
too much theory without app examples
unnecessary architecture jargon
explaining with only definitions
```

## Final Rule

Every explanation should end with a crux.

Example:

```txt
Crux: PostgreSQL stores permanent world data. Redis stores live user movement state. WebSocket sends that live state to browsers.
```

## Pub/Sub Explanation Pattern

Use this when explaining Redis Pub/Sub in this project.

### What Pub/Sub means

Pub/Sub means:

```txt
Publish / Subscribe
```

It is a live messaging pattern:

```txt
Publisher -> Channel / Topic -> Subscribers
```

Meaning:

```txt
One service publishes a message.
The message goes to a channel.
All active subscribers listening to that channel receive it.
```

Example:

```txt
Server A publishes: "Deepak moved to x=10 y=20"
Channel: space:room-1:events
Server B and Server C receive it
Then they send it to their own connected users
```

Crux:

```txt
Pub/Sub is a live announcement system.
```

### Why we need it

One WebSocket server can only directly send messages to sockets connected to that same server.

Example problem:

```txt
Server A has Deepak connected.
Server B has Rahul connected.

Both are in room-1.
Deepak moves.
```

Without Pub/Sub:

```txt
Server A broadcasts only to users connected to Server A.
Rahul is connected to Server B.
Rahul does not see Deepak move.
```

With Pub/Sub:

```txt
Server A receives Deepak movement.
Server A publishes event to Redis channel: space:room-1:events.
Server B is subscribed to that channel.
Server B receives the event.
Server B sends the movement to Rahul.
```

### WebSocket vs Pub/Sub

Explain this difference clearly:

```txt
WebSocket = browser <-> server
Pub/Sub   = server <-> server
```

Example:

```txt
Deepak browser sends movement to Server A using WebSocket.
Server A publishes movement to Redis Pub/Sub.
Server B receives it from Redis Pub/Sub.
Server B sends it to Rahul browser using WebSocket.
```

Crux:

```txt
WebSocket connects browser to backend. Pub/Sub connects backend servers to each other.
```

### Redis Pub/Sub is not storage

This is the most important rule.

Wrong mental model:

```txt
Redis Pub/Sub stores movement/chat/shapes.
```

Correct mental model:

```txt
Redis Pub/Sub announces movement/chat/shapes to active subscribers.
```

Redis Pub/Sub does not save the message.

If a subscriber is offline, disconnected, or crashed, it misses the message.

Crux:

```txt
Pub/Sub is live delivery, not permanent storage.
```

### Delivery rule

Redis Pub/Sub uses at-most-once delivery.

Meaning:

```txt
A message is delivered once if possible.
If a subscriber is offline or has a network issue, the message is lost.
Redis will not resend it later.
```

Good for:

```txt
movement
typing indicator
live cursor movement
cache invalidation
online/offline ping
temporary notifications
cross-server WebSocket broadcast
```

Not good alone for:

```txt
payments
orders
audit logs
exam submissions
important chat history
permanent whiteboard shapes
bank transactions
```

Rule:

```txt
Save important data first. Publish live notification second.
```

### Pub/Sub commands

#### PUBLISH

`PUBLISH` sends a message to a channel.

Example:

```txt
PUBLISH space:room-1:events '{"type":"movement","userId":"deepak","x":10,"y":20}'
```

Meaning:

```txt
Send this movement event to all servers listening to space:room-1:events.
```

#### SUBSCRIBE

`SUBSCRIBE` listens to a channel.

Example:

```txt
SUBSCRIBE space:room-1:events
```

Meaning:

```txt
I want to receive messages from space:room-1:events.
```

#### PSUBSCRIBE

`PSUBSCRIBE` listens using a pattern.

Example:

```txt
PSUBSCRIBE space:*:events
```

Meaning:

```txt
Listen to all matching room event channels.
```

Matching examples:

```txt
space:room-1:events
space:math-class:events
space:office-123:events
```

### Channel naming

Redis channel:

```txt
space:{spaceId}:events
```

Example:

```txt
space:room-1:events
```

Other common patterns:

```txt
board:{boardId}:events
chat:{roomId}:events
user:{userId}:notifications
cache:invalidate
job:{jobId}:status
```

Good channel names are:

```txt
clear
scoped
predictable
not too broad
not too random
```

### Event message shape

Use a consistent event shape.

Example:

```json
{
  "type": "movement",
  "spaceId": "room-1",
  "serverId": "server-a",
  "payload": {
    "userId": "deepak",
    "x": 10,
    "y": 20
  },
  "createdAt": 1710000000000
}
```

Fields:

```txt
type      = what happened
spaceId   = where it happened
serverId  = which backend server published it
payload   = actual data
createdAt = timestamp
```

Why `serverId`?

```txt
So the same server can ignore its own Redis Pub/Sub message.
```

### Avoid duplicate broadcasting

Problem:

```txt
Server A receives movement.
Server A broadcasts locally.
Server A publishes to Redis.
Server A also receives its own Redis message.
Server A broadcasts the same event again.
```

Solution:

```ts
if (event.serverId === CURRENT_SERVER_ID) {
  return;
}
```

Crux:

```txt
Use serverId to stop the same server from broadcasting its own event twice.
```

### Full metaverse movement flow

Avatar movement is temporary, so it is good for Redis Pub/Sub.

Flow:

```txt
1. Deepak presses arrow key.
2. Browser sends movement to Server A using WebSocket.
3. Server A validates movement.
4. Server A updates latest position in Redis Hash.
5. Server A broadcasts movement to users connected to Server A.
6. Server A publishes movement to Redis Pub/Sub.
7. Server B and Server C receive the Pub/Sub event.
8. Server B and Server C ignore the event if it came from themselves.
9. Server B and Server C broadcast to their own local users.
```

Data roles:

```txt
WebSocket     = browser/server live message
Redis Hash    = latest position
Redis Pub/Sub = cross-server delivery
PostgreSQL    = users/spaces/maps, not every movement
```

### Pub/Sub vs Redis Hash

Redis Hash stores current state.

Example:

```txt
space:room-1:positions
  deepak -> "10,20"
  rahul  -> "15,25"
```

Redis Pub/Sub sends a live event.

Example:

```txt
PUBLISH space:room-1:events '{"type":"movement","userId":"deepak","x":10,"y":20}'
```

Difference:

```txt
Hash    = current state
Pub/Sub = live event
```

Crux:

```txt
Redis Hash can be read later. Pub/Sub disappears after delivery.
```

### Pub/Sub vs PostgreSQL

PostgreSQL is permanent truth.

Redis Pub/Sub is live notification.

Example whiteboard:

```txt
PostgreSQL:
Shape is saved permanently.

Redis Pub/Sub:
Tell other servers that shape was created.
```

Rule:

```txt
If it must survive refresh/restart, save in PostgreSQL.
If it only needs to be announced live, publish with Pub/Sub.
```

### Pub/Sub vs Redis Streams

Redis Pub/Sub:

```txt
Live broadcast
No message history
Offline subscribers miss messages
Simple and fast
Good for movement/typing/live events
```

Redis Streams:

```txt
Stores messages
Consumers can read later
Supports durable processing
Better for jobs/events that cannot be lost
```

Simple rule:

```txt
Pub/Sub = live announcement
Streams = durable event log
```

### Pub/Sub vs Queue

Pub/Sub broadcasts one event to all current subscribers.

Queue gives one job to one worker.

Pub/Sub example:

```txt
Message: user moved
Server A receives
Server B receives
Server C receives
```

Queue example:

```txt
Job: send email
Worker 1 processes it
Worker 2 does not process the same job
```

Rule:

```txt
Pub/Sub = broadcast
Queue   = work distribution
```

### When to use Redis Pub/Sub

Use Redis Pub/Sub when:

```txt
The event is live.
The event is temporary.
The event is okay to miss sometimes.
The event is needed by currently connected services.
You need low latency.
You need server-to-server fanout.
```

Good examples:

```txt
movement
typing
online/offline
live cursor
cache invalidation
dashboard update
cross-server WebSocket broadcast
```

### When not to use Redis Pub/Sub alone

Do not use only Redis Pub/Sub when:

```txt
You need message history.
You need guaranteed delivery.
You need replay.
You need acknowledgments.
You need payment/order reliability.
You need audit logs.
You need durable background jobs.
```

Bad examples:

```txt
payment completed
order placed
bank transfer
exam submitted
final chat history
permanent whiteboard shape
invoice generated
```

For these:

```txt
Save to PostgreSQL or use a durable queue/stream first.
Then publish a live notification if needed.
```

### Final mental model

```txt
WebSocket:
Browser <-> Server

Redis Hash:
Current temporary state

Redis Pub/Sub:
Server <-> Server live event delivery

PostgreSQL:
Permanent truth

Redis Streams:
Durable event log / job system
```

For metaverse movement:

```txt
WebSocket -> Redis Hash -> Redis Pub/Sub -> other servers -> browsers
```

For whiteboard shape:

```txt
WebSocket -> PostgreSQL -> Redis Pub/Sub -> other servers -> browsers
```

For chat with history:

```txt
WebSocket -> PostgreSQL -> Redis Pub/Sub -> other servers -> browsers
```

For notifications:

```txt
PostgreSQL -> Redis Pub/Sub -> WebSocket -> browser
```

For cache invalidation:

```txt
DB update -> Redis Pub/Sub -> all servers clear cache
```

### Pub/Sub crux

```txt
Redis Pub/Sub is the live delivery bridge between WebSocket servers. It does not permanently store data.
```

## ws-handler.ts Redis Presence Checklist

Use this checklist when explaining or fixing `apps/server/src/ws/ws-handler.ts`.

### What this file does

This file handles live WebSocket messages.

It receives:

```txt
join
move
close/disconnect
```

It sends:

```txt
space-joined
user-join
movement
movement-rejected
user-left
error
```

### Why we need it

This file is the bridge between the browser and the realtime backend.

Browser sends movement.

Server validates it, updates state, and tells other users.

### Important mental model

```txt
room-manager.ts = local sockets in this one server process
presence.ts     = Redis shared live state
Pub/Sub later   = cross-server event fanout
```

### Correct import shape

Wrong:

```ts
import {
  setUserOnline
  setUserPosition
  getRoomUsers
  removeUser
} from "./presence"
```

Correct:

```ts
import {
  getRoomUsers,
  removeUser,
  setUserOnline,
  setUserPosition,
} from "./presence";
```

Why:

```txt
TypeScript imports need commas between imported names.
```

### Join flow checklist

On join:

```txt
1. Verify token.
2. Get userId.
3. Check space exists in PostgreSQL.
4. Choose spawn position.
5. Save user in Redis presence.
6. Get room users from Redis.
7. Filter out the joining user.
8. Convert userId -> id for the WebSocket response shape.
9. Add socket to local room manager.
10. Send space-joined.
11. Broadcast user-join.
```

Correct shape:

```ts
await setUserOnline(payload.spaceId, userId, spawn);

const roomUsers = await getRoomUsers(payload.spaceId);
const existingUsers = roomUsers
  .filter((user) => user.userId !== userId)
  .map((user) => ({
    id: user.userId,
    x: user.x,
    y: user.y,
  }));
```

Why filter:

```txt
After setUserOnline(), Redis includes the joining user.
But space-joined.users should contain other users already in the room.
```

Why map:

```txt
Redis returns { userId, x, y }.
WebSocket schema expects { id, x, y }.
```

### Move flow checklist

On move:

```txt
1. Check user has joined first.
2. Read current position from ws.data.
3. Check move is exactly one tile.
4. Update ws.data.
5. Update local room-manager position.
6. Update Redis presence position.
7. Broadcast movement to local room sockets.
```

Correct shape:

```ts
async function handleMove(ws: Socket, payload: MovePayload) {
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

  await setUserPosition(spaceId, userId, {
    x: payload.x,
    y: payload.y,
  });

  broadcast(spaceId, userId, {
    type: "movement",
    payload: { userId, x: payload.x, y: payload.y },
  });
}
```

Common bug:

```ts
setUserPosition(spaceId, userId, { x, y });
```

Why it is wrong:

```txt
x and y do not exist as variables in that scope.
Use payload.x and payload.y.
```

### Close flow checklist

On close:

```txt
1. Get spaceId and userId from ws.data.
2. If missing, do nothing.
3. Remove socket from local room manager.
4. Remove user from Redis presence.
5. Broadcast user-left.
```

Correct shape:

```ts
export async function onClose(ws: Socket) {
  const { spaceId, userId } = ws.data;
  if (!spaceId || !userId) return;

  removeFromRoom(spaceId, userId);
  await removeUser(spaceId, userId);

  broadcast(spaceId, userId, {
    type: "user-left",
    payload: { userId },
  });
}
```

### Common bugs to mention

```txt
1. Missing commas in imports.
2. Calling async Redis functions without await.
3. Passing a Promise into space-joined.users.
4. Forgetting to filter the current user from existing users.
5. Using undefined x/y variables instead of payload.x/payload.y.
6. Removing updatePosition() and breaking local room state.
7. Importing removeUser but not calling it on close.
8. Making Redis presence work in tests but not in actual WebSocket flow.
```

### Crux

```txt
ws-handler.ts should update both local socket state and Redis presence on join, move, and disconnect.
```
