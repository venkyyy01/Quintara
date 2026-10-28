/**
 * End-to-end WebSocket smoke test against a running Quintara server.
 * Two clients: create room → join → start → play a move → verify privacy
 * and idempotency over the real transport.
 *
 * Usage: node scripts/ws-smoke.mjs [ws://localhost:4000/ws]
 */

import WebSocket from "ws";

const url = process.argv[2] ?? "ws://localhost:4000/ws";

function connect(name) {
  const ws = new WebSocket(url);
  const messages = [];
  const waiters = [];
  ws.on("message", (data) => {
    const message = JSON.parse(data.toString());
    messages.push(message);
    for (let i = waiters.length - 1; i >= 0; i--) {
      const waiter = waiters[i];
      if (waiter.predicate(message)) {
        waiters.splice(i, 1);
        clearTimeout(waiter.timer);
        waiter.resolve(message);
      }
    }
  });
  const next = (predicate, timeoutMs = 5000) =>
    new Promise((resolve, reject) => {
      const existing = messages.find(predicate);
      if (existing) return resolve(existing);
      const timer = setTimeout(
        () => reject(new Error(`${name}: timed out waiting for message`)),
        timeoutMs,
      );
      waiters.push({ predicate, resolve, timer });
    });
  return {
    name,
    ws,
    messages,
    send: (message) => ws.send(JSON.stringify(message)),
    next,
    open: () =>
      new Promise((resolve) => ws.on("open", resolve)),
  };
}

function assert(condition, label) {
  if (!condition) {
    console.error(`✗ ${label}`);
    process.exitCode = 1;
    throw new Error(label);
  }
  console.log(`✓ ${label}`);
}

const alice = connect("alice");
const bob = connect("bob");
await Promise.all([alice.open(), bob.open()]);

alice.send({ type: "AUTH", displayName: "Alice" });
bob.send({ type: "AUTH", displayName: "Bob" });
await alice.next((m) => m.type === "WELCOME");
await bob.next((m) => m.type === "WELCOME");
assert(true, "both clients authenticated");

alice.send({ type: "CREATE_ROOM", requestId: "r1", mode: "PRIVATE", options: { playerCount: 2 } });
const roomMessage = await alice.next((m) => m.type === "ROOM_STATE");
const roomCode = roomMessage.room.roomCode;
assert(typeof roomCode === "string" && roomCode.length === 8, `room created with code ${roomCode}`);

bob.send({ type: "JOIN_ROOM", requestId: "r2", roomCode });
await bob.next((m) => m.type === "ROOM_STATE" && m.room.players.length === 2);
assert(true, "second player joined");

alice.send({ type: "START_GAME", requestId: "r3" });
const aliceGameState = await alice.next((m) => m.type === "GAME_STATE");
const bobGameState = await bob.next((m) => m.type === "GAME_STATE");
assert(aliceGameState.state.status === "ACTIVE", "game started");
assert(Array.isArray(aliceGameState.state.hand), "alice receives her own hand");
assert(Array.isArray(bobGameState.state.hand), "bob receives his own hand");

// Privacy: no opponent hand identities cross the wire (§8, §131).
const aliceJson = JSON.stringify(alice.messages);
const bobJson = JSON.stringify(bob.messages);
for (const card of bobGameState.state.hand) {
  assert(
    !aliceJson.includes(card.id),
    `alice's payloads never contain bob's card ${card.id}`,
  );
}
for (const card of aliceGameState.state.hand) {
  assert(
    !bobJson.includes(card.id),
    `bob's payloads never contain alice's card ${card.id}`,
  );
}

// Play a legal move as the current player.
const projected = aliceGameState.state;
const viewer = projected.currentTurnPlayerId;
const actingClient = viewer === projected.players[0]?.id ? alice : bob;
const actingState =
  actingClient === alice ? aliceGameState.state : bobGameState.state;
const legal = actingState.legalActions.mainActions[0];
assert(legal !== undefined, "current player has legal actions");

const command = {
  type: legal.type,
  actionId: "smoke-1",
  expectedVersion: actingState.version,
  cardId: legal.cardId,
  targetCellId: legal.targetCellId,
};
actingClient.send({
  type: "GAME_COMMAND",
  requestId: "r4",
  roomActionId: "smoke-1",
  command,
});

const result = await actingClient.next((m) => m.type === "ACTION_RESULT" && m.requestId === "r4");
assert(result.ok === true, "move accepted by authoritative server");

// Idempotency over the wire (§79, §129): resubmitting the same actionId is safe.
actingClient.send({
  type: "GAME_COMMAND",
  requestId: "r5",
  roomActionId: "smoke-1",
  command,
});
const retry = await actingClient.next((m) => m.type === "ACTION_RESULT" && m.requestId === "r5");
assert(retry.ok === true, "duplicate submission returns success without reapplying");

const afterState = await actingClient.next(
  (m) => m.type === "GAME_STATE" && m.state.version === actingState.version + 1,
);
assert(afterState.state.version === actingState.version + 1, "version advanced exactly once");

// Stale version is rejected (§80, §130).
actingClient.send({
  type: "GAME_COMMAND",
  requestId: "r6",
  roomActionId: "smoke-2",
  command: { ...command, actionId: "smoke-2", expectedVersion: 1 },
});
const stale = await actingClient.next((m) => m.type === "ACTION_RESULT" && m.requestId === "r6");
assert(stale.ok === false && stale.errorCode === "STALE_GAME_STATE", "stale version rejected");

console.log("\nAll WebSocket smoke checks passed.");
alice.ws.close();
bob.ws.close();
process.exit(0);
