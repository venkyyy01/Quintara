# QUINTARA
## Canonical Production Game Engine Specification
### Rules Contract v1.0

Status: **PRODUCTION SOURCE OF TRUTH**

This document defines the authoritative rules for Quintara.

The UI, AI, multiplayer server, replay system, tests, bots, spectators, tutorials, mobile client and PWA MUST all derive gameplay behaviour from this specification.

If UI behaviour conflicts with this document, this document wins.

If a client and server disagree, the authoritative server-side engine wins.

No gameplay rule may exist only inside a React component.

---

# 1. DESIGN PRINCIPLE

Quintara is a deterministic card-driven alignment strategy game played on a 10 × 10 board.

The engine must satisfy:

```text
same initial state
+
same RNG stream
+
same ordered actions
=
same final state
```

No gameplay outcome may depend on:

- animation timing
- browser timing
- client rendering
- network latency
- device type
- floating-point randomness
- hidden client state

---

# 2. CORE OBJECTIVE

Players or teams attempt to create completed lines.

A completed line is:

```text
5 qualifying spaces
in one continuous straight line
```

Allowed directions:

```text
horizontal
vertical
diagonal down-right
diagonal up-right
```

There are no curved, wrapping or knight-move lines.

---

# 3. STANDARD WIN REQUIREMENT

For a game with:

```text
2 competing sides
```

the winning requirement is:

```text
2 completed sequences
```

For:

```text
3 competing sides
```

the winning requirement is:

```text
1 completed sequence
```

A "side" means either:

- an individual player
- a team

Therefore:

```text
2 players          → 2 sequences
3 players          → 1 sequence
2 teams            → 2 sequences
3 teams            → 1 sequence
```

This must NOT be calculated directly from raw player count.

Correct:

```ts
requiredSequences =
  teams.length === 2 ? 2 : 1
```

for Standard mode.

---

# 4. VALID STANDARD PLAYER COUNTS

Standard Quintara supports:

```text
2
3
4
6
8
9
10
12
```

Do NOT permit:

```text
5
7
11
```

in Standard mode.

Custom mode may define additional configurations separately.

---

# 5. INDIVIDUAL VS TEAM PLAY

Up to three players may play individually.

Therefore:

```text
2 players → individual
3 players → individual
```

More than three players must use teams.

---

# 6. STANDARD TEAM CONFIGURATIONS

## 2 players

```text
Player A
Player B
```

Two competing sides.

---

## 3 players

```text
Player A
Player B
Player C
```

Three competing sides.

---

## 4 players

```text
Team A: 2
Team B: 2
```

---

## 6 players

Allow either:

```text
Team A: 3
Team B: 3
```

or:

```text
Team A: 2
Team B: 2
Team C: 2
```

---

## 8 players

```text
Team A: 4
Team B: 4
```

---

## 9 players

```text
Team A: 3
Team B: 3
Team C: 3
```

---

## 10 players

```text
Team A: 5
Team B: 5
```

---

## 12 players

Allow:

```text
Team A: 6
Team B: 6
```

or:

```text
Team A: 4
Team B: 4
Team C: 4
```

---

# 7. TEAM TURN ORDER

Team members must be interleaved.

For two teams:

```text
A1
B1
A2
B2
A3
B3
...
```

For three teams:

```text
A1
B1
C1
A2
B2
C2
...
```

The authoritative server generates:

```ts
turnOrder: PlayerId[]
```

Team assignment must be validated before game start.

No Standard game may start with consecutive teammates in turn order.

---

# 8. HAND SIZE

Standard starting hand size:

```text
2 players      → 7 cards each
3 players      → 6 cards each
4 players      → 6 cards each
6 players      → 5 cards each
8 players      → 4 cards each
9 players      → 4 cards each
10 players     → 3 cards each
12 players     → 3 cards each
```

Implement as immutable Standard configuration data.

Example:

```ts
const STANDARD_HAND_SIZE = {
  2: 7,
  3: 6,
  4: 6,
  6: 5,
  8: 4,
  9: 4,
  10: 3,
  12: 3
} as const;
```

Do not infer this formulaically.

---

# 9. BOARD DIMENSIONS

Standard board:

```text
10 rows
10 columns
100 total cells
```

Coordinates should use zero-based engine indexing:

```text
row: 0–9
column: 0–9
```

UI may display:

```text
1–10
```

but engine coordinates remain canonical.

---

# 10. BOARD CELL TYPES

There are exactly two cell types:

```ts
type CellType =
  | "CARD"
  | "WILD_CORNER";
```

Standard board requires:

```text
96 CARD cells
4 WILD_CORNER cells
```

---

# 11. WILD CORNER LOCATIONS

The four corners must be:

```text
(0,0)
(0,9)
(9,0)
(9,9)
```

They are permanent universal spaces.

They are never occupied.

They are never empty.

They are never owned.

They count as belonging to every team for sequence detection.

---

# 12. WILD CORNER REPRESENTATION

Do NOT fake a corner by assigning all team IDs to it.

Use:

```ts
interface WildCornerCell {
  id: CellId;
  type: "WILD_CORNER";
  row: number;
  column: number;
}
```

Sequence evaluation asks:

```ts
isCompatibleWithTeam(cell, teamId)
```

and returns:

```text
true
```

for every wild corner.

---

# 13. CORNER RESTRICTIONS

A wild corner:

```text
cannot receive a marker
cannot be removed
cannot be blocked
cannot be targeted by a Jack
cannot change ownership
```

It may simultaneously participate in sequences belonging to multiple teams.

It may also participate in multiple valid sequences for the same team, subject to sequence overlap rules.

---

# 14. BOARD CARD IDENTITIES

There are 48 unique normal card identities.

Ranks:

```text
A
2
3
4
5
6
7
8
9
10
Q
K
```

Jacks do not appear on the board.

Suits:

```text
CLUBS
DIAMONDS
HEARTS
SPADES
```

Calculation:

```text
12 ranks × 4 suits = 48 identities
```

Each identity appears:

```text
exactly twice
```

on the board.

Therefore:

```text
48 × 2 = 96 CARD cells
```

---

# 15. BOARD CONFIGURATION

The board layout must be data-driven.

Example:

```ts
interface BoardDefinition {
  width: 10;
  height: 10;
  cells: BoardCellDefinition[];
}
```

The game engine must not rely on visual placement hard-coded in React.

Provide:

```ts
validateBoardDefinition(board)
```

which verifies:

```text
100 cells total
4 corner wilds
96 card cells
48 unique identities
each normal identity exactly twice
no Jacks
no duplicate coordinates
all coordinates in range
```

Failure must prevent application startup or match creation.

---

# 16. DECK

Standard deck:

```text
2 × standard 52-card deck
```

Total:

```text
104 cards
```

No Jokers.

Every physical card instance must be unique.

Example:

```ts
{
  id: "D1-8H",
  deckCopy: 1,
  rank: "8",
  suit: "HEARTS",
  code: "8H"
}
```

Second copy:

```ts
{
  id: "D2-8H",
  deckCopy: 2,
  rank: "8",
  suit: "HEARTS",
  code: "8H"
}
```

These are separate physical cards but the same board identity.

---

# 17. NORMAL CARD COUNT

Non-Jack cards:

```text
48 identities × 2
=
96 cards
```

Jack cards:

```text
4 identities × 2
=
8 cards
```

Total:

```text
104
```

---

# 18. JACK TYPES

## Two-Eyed Jacks

```text
J♣
J♦
```

Action:

```text
PLACE_WILD
```

There are four total because two decks are used.

---

## One-Eyed Jacks

```text
J♥
J♠
```

Action:

```text
REMOVE_OPPONENT
```

There are four total.

---

# 19. CARD ZONE INVARIANT

Every card instance must exist in exactly one card zone.

Possible zones:

```text
DRAW_PILE
PLAYER_HAND
DISCARD_PILE
```

At all times:

```text
number of cards across all zones = 104
```

No card may exist simultaneously in two zones.

No card may disappear.

No duplicate card instance IDs may exist.

---

# 20. SHUFFLING

Only the authoritative engine/server may determine deck ordering.

Use Fisher-Yates.

Online games must use cryptographically secure seed generation.

Do not call:

```ts
Math.random()
```

inside authoritative production game logic.

Use a deterministic seeded PRNG after generating the secure seed.

Persist:

```text
rngAlgorithmVersion
rngSeed
```

or persist the complete initial deck ordering.

This allows exact replay reproduction.

---

# 21. DEALING

After shuffling:

1. determine player turn order
2. determine starting player
3. deal correct hand size
4. place remaining cards in draw pile
5. initialise empty discard piles
6. begin first turn

Deal one card at a time logically or slice deterministically.

The visible animation is irrelevant to state.

---

# 22. STARTING PLAYER

For the digital product:

```text
starting player is selected uniformly by authoritative RNG
```

Then turn order continues cyclically.

This intentionally replaces physical dealer-cut ceremony with equivalent fair digital randomisation.

Persist:

```text
startingSeat
```

for replay.

---

# 23. PLAYER HAND PRIVACY

The authoritative state contains every hand.

A viewer-specific state projection does not.

A player receives:

```text
their own exact cards
opponent card counts
teammate card counts
```

A player does not receive:

```text
opponent card identities
teammate card identities
draw pile ordering
future cards
server RNG state
```

Never rely on UI hiding.

The network payload itself must omit private information.

---

# 24. TURN PHASES

Use an explicit state machine.

Recommended:

```ts
type TurnPhase =
  | "TURN_START"
  | "AWAITING_MAIN_ACTION"
  | "AWAITING_SEQUENCE_SELECTION"
  | "RESOLVING"
  | "GAME_OVER";
```

Do not infer turn phase from UI state.

---

# 25. TURN START

At turn start:

```text
current player established
deadCardExchangeUsed = false
turn action list calculated
timer started if enabled
```

The player may:

```text
exchange one dead card
```

before performing their main board action.

They may also skip the exchange and play normally.

---

# 26. DEAD CARD DEFINITION

A normal non-Jack card is dead when:

```text
both board cells representing its card identity
are currently occupied by markers
```

Marker ownership does not matter.

Example:

```text
8♥ location #1 = Blue
8♥ location #2 = Gold
```

Then every `8♥` in a hand is currently dead.

---

# 27. DEAD CARD ALGORITHM

```ts
function isDeadCard(
  state: GameState,
  card: Card
): boolean
```

Rules:

```text
if card is Jack:
    false

find the two mapped board cells

if both contain markers:
    true

otherwise:
    false
```

Wild corners do not participate.

---

# 28. DEADNESS IS DYNAMIC

Never store permanent:

```text
card.dead = true
```

Deadness must be derived from current board state.

A One-Eyed Jack may remove a marker.

Therefore:

```text
dead card this turn
```

may become:

```text
playable card next turn
```

---

# 29. DEAD CARD EXCHANGE

At most one dead-card exchange per turn.

Command:

```ts
{
  type: "EXCHANGE_DEAD_CARD",
  cardId,
  actionId
}
```

Validation:

```text
correct player
correct turn
card belongs to player
card is currently dead
card is not a Jack
deadCardExchangeUsed === false
```

Resolve atomically:

```text
remove dead card from hand
add to player's discard pile
draw one replacement
set deadCardExchangeUsed = true
return to AWAITING_MAIN_ACTION
```

It does not consume the main action.

---

# 30. SECOND DEAD CARD EXCHANGE

If the newly drawn replacement is also dead:

```text
the player may NOT exchange another dead card this turn
```

This follows the one-exchange-per-turn rule.

They must use another legal card if one exists.

---

# 31. NORMAL MAIN ACTION

A normal card main action consists of:

```text
play card
+
place marker on one corresponding open board space
```

Both form one atomic logical action.

---

# 32. NORMAL CARD LEGAL TARGETS

For normal card:

```ts
getNormalCardTargets(card)
```

returns the board's two matching cells filtered by:

```text
cell.type === CARD
occupant === null
```

Possible result count:

```text
2
1
0
```

If:

```text
0
```

the card cannot be used as the main action.

It is a dead card.

---

# 33. BOARD OCCUPANCY

Normal board cell:

```ts
interface CardBoardCellState {
  definitionId: CellId;
  occupantTeamId: TeamId | null;
  occupantPlayerId: PlayerId | null;
}
```

Only one marker can occupy a cell.

No stacking.

No replacing a marker through a normal card.

---

# 34. PLAY NORMAL CARD

Command:

```ts
{
  type: "PLAY_NORMAL_CARD",
  cardId,
  targetCellId,
  actionId,
  expectedVersion
}
```

Validation:

```text
game active
correct player
correct phase
card owned by player
card is not Jack
target is CARD cell
target card identity matches played card
target unoccupied
```

Resolution:

```text
discard played card
place player's team marker
resolve sequences
resolve victory
if no victory:
    draw replacement
    advance turn
```

---

# 35. TWO-EYED JACK

Two-Eyed Jack:

```text
J♣
J♦
```

may place a team marker on any currently unoccupied normal CARD cell.

Legal target:

```text
cell.type === CARD
AND
cell.occupantTeamId === null
```

Wild corners are not targets.

Occupied cells are not targets.

---

# 36. TWO-EYED JACK COMMAND

```ts
{
  type: "PLAY_WILD_JACK",
  cardId,
  targetCellId,
  actionId,
  expectedVersion
}
```

Validation:

```text
card is J♣ or J♦
card owned by player
correct turn
target is normal cell
target is empty
```

Resolution:

```text
discard Jack
place marker
resolve sequences
resolve victory
if no victory:
    draw
    advance
```

---

# 37. ONE-EYED JACK

One-Eyed Jack:

```text
J♥
J♠
```

removes exactly one eligible opponent marker.

It does not place the acting player's marker.

---

# 38. ONE-EYED JACK LEGAL TARGET

Target must:

```text
be CARD cell
contain marker
belong to a competing team
not belong to current team
not be part of any completed sequence
```

For three teams:

```text
either of the two opposing teams may be targeted
```

Teammates may never target one another.

---

# 39. PROTECTED MARKER

A marker is protected when its board cell participates in one or more completed sequences belonging to its team.

Derived condition:

```ts
cell.sequenceIds.length > 0
```

or an equivalent sequence index.

One-Eyed Jack cannot target it.

---

# 40. ONE-EYED JACK COMMAND

```ts
{
  type: "PLAY_REMOVE_JACK",
  cardId,
  targetCellId,
  actionId,
  expectedVersion
}
```

Resolution:

```text
discard Jack
remove opponent marker
do NOT place current player's marker
draw replacement
advance turn
```

No sequence detection is required after removal because an empty cell cannot create a new completed line.

Dead-card legality must naturally reflect the updated board afterward.

---

# 41. JACKS ARE NOT DEAD CARDS

Jacks do not map to board identities.

Therefore they are never eligible for:

```text
EXCHANGE_DEAD_CARD
```

even when their action currently has no valid target.

---

# 42. LEGAL ACTION GENERATION

The authoritative engine must expose:

```ts
getLegalActions(
  state,
  playerId
)
```

This is the source of truth for:

- server validation
- UI highlighting
- AI
- tutorials
- timeout auto-play
- tests

Never implement separate legal-move rules in each consumer.

---

# 43. MAIN ACTION TYPES

Standard game main actions:

```ts
type MainAction =
  | PlayNormalCardAction
  | PlayWildJackAction
  | PlayRemoveJackAction;
```

Dead-card exchange is a pre-action, not a main action.

---

# 44. MAIN ACTION REQUIREMENT

Normally a player must perform exactly one main action per turn.

They cannot:

```text
place twice
remove twice
place and remove
play two cards
```

Dead-card exchange is the only additional card operation allowed before the main action.

---

# 45. DISCARD PILES

Maintain a distinct discard pile per player.

Example:

```ts
discardPiles: Record<PlayerId, CardId[]>
```

Discard information is public.

Top-to-bottom ordering should be retained for replay and audit even though reshuffling later destroys tactical significance.

---

# 46. DRAW AFTER MAIN ACTION

After a valid main action, if game has not ended:

```text
draw exactly one replacement card
```

This is automatic in Quintara.

The physical "forgot to draw" penalty is deliberately not implemented.

A software game should not punish a user for failing to perform bookkeeping that the software itself can perform.

---

# 47. VICTORY BEFORE DRAW

Production resolution order:

```text
apply board action
detect sequences
register sequences
check victory
```

If victory exists:

```text
do NOT perform another draw
```

Transition directly to:

```text
GAME_OVER
```

This avoids meaningless post-game RNG mutations.

---

# 48. DRAW PILE EXHAUSTION

When a draw is required and:

```text
drawPile.length === 0
```

collect all discard piles.

Shuffle them using authoritative RNG.

Create a new draw pile.

Then perform the required draw.

---

# 49. RESHUFFLE INVARIANT

Cards currently in player hands are never reshuffled.

Only discarded cards enter the replacement draw pile.

---

# 50. PLAYED CARD MAY RETURN

If the draw pile is empty immediately after a player discards their played card, that card may become part of the reshuffled draw pile.

This is valid.

Do not artificially exclude it.

---

# 51. QUALIFYING SEQUENCE CELL

For a particular team:

```ts
qualifies(cell, teamId)
```

is true when:

```text
cell is WILD_CORNER
OR
cell contains marker belonging to teamId
```

Otherwise false.

---

# 52. COMPLETED SEQUENCE

A completed sequence is exactly five unique contiguous board coordinates:

```text
P0 P1 P2 P3 P4
```

where each next position differs by one constant direction vector:

```text
(0,1)
(1,0)
(1,1)
(1,-1)
```

and all five qualify for the same team.

---

# 53. SEQUENCE CANONICAL REPRESENTATION

```ts
interface CompletedSequence {
  id: SequenceId;
  teamId: TeamId;
  cells: [
    CellId,
    CellId,
    CellId,
    CellId,
    CellId
  ];
  direction:
    | "HORIZONTAL"
    | "VERTICAL"
    | "DIAGONAL_DOWN"
    | "DIAGONAL_UP";
  createdTurn: number;
  createdByActionId: ActionId;
}
```

Canonicalise cell order from smallest directional coordinate to largest.

---

# 54. DUPLICATE SEQUENCE

Two sequences are duplicates when they contain the same five coordinates for the same team.

Order does not matter.

A duplicate cannot be scored again.

---

# 55. EXISTING SEQUENCES ARE IMMUTABLE

Once registered:

```text
sequence remains registered permanently
```

Its occupied marker cells are protected.

A valid game action can never break it because One-Eyed Jacks cannot remove protected markers.

---

# 56. SEQUENCE OVERLAP

When multiple sequences belong to the same team:

```text
each separately counted sequence may share
at most one board coordinate
with another counted sequence
```

Therefore:

```text
5-chip row = 1
6-chip row ≠ 2
7-chip row ≠ 2
8-chip row ≠ 2
9-chip row can = 2
```

because:

```text
1 2 3 4 5
        5 6 7 8 9
```

share exactly one coordinate.

---

# 57. CROSSING SEQUENCES

Example:

```text
        X
        X
X X X X X
        X
        X
```

If the horizontal and vertical five-cell sequences belong to the same team:

```text
both may count
```

because they share exactly one space.

If that move takes the team from zero to two required sequences:

```text
the team immediately wins
```

---

# 58. DIAGONAL CROSSINGS

The same rule applies to:

```text
horizontal + diagonal
vertical + diagonal
diagonal + diagonal
```

provided candidate sequences satisfy all overlap constraints.

---

# 59. CORNER SHARING

A wild corner is a board coordinate.

For same-team sequence-overlap purposes it counts as the one shared coordinate.

Therefore a team may form different sequences through the same corner where otherwise valid.

Multiple competing teams may also use the same corner independently.

---

# 60. SEQUENCE DETECTION TRIGGER

Sequence detection occurs only after:

```text
PLACE_NORMAL
```

or:

```text
PLACE_WILD
```

because those actions add the current team's marker.

Removal actions do not trigger scoring.

---

# 61. LOCAL DETECTION OPTIMISATION

Every new sequence produced by placement must contain the newly placed marker.

Therefore only examine lines through:

```text
newMarkerCell
```

Directions:

```ts
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1]
] as const;
```

This optimisation is logically safe.

---

# 62. CANDIDATE GENERATION

For each direction:

1. walk backwards from newly placed marker
2. include contiguous compatible cells
3. walk forward
4. produce the full contiguous run
5. enumerate every 5-cell window that includes the new marker
6. remove duplicate candidates

Example run:

```text
A B C D E F
```

may yield:

```text
A B C D E
B C D E F
```

but they overlap by four cells and cannot both be separately scored.

---

# 63. IMPORTANT AMBIGUITY: SIX-PLUS RUNS

A six-cell run can contain two legal five-cell windows.

Only one can count because the windows overlap by more than one space.

Example:

```text
1 2 3 4 5 6
```

Candidates:

```text
1 2 3 4 5
2 3 4 5 6
```

Only one may become the registered sequence.

Which one is chosen affects future protection and overlap possibilities.

The original tabletop concept does not sufficiently specify this for a deterministic software engine.

Therefore Quintara defines an explicit rule.

---

# 64. QUINTARA SEQUENCE CLAIM RULE

After a placement, generate all possible new candidate sequences.

Find every maximum-size compatible sequence set where:

```text
no candidate duplicates existing sequence
candidate is compatible with existing sequences
all newly selected candidates are pairwise compatible
```

Compatibility means:

```text
intersection size <= 1
```

for sequences belonging to the same team.

The engine attempts to score the **maximum number of valid new sequences**.

---

# 65. UNIQUE MAXIMUM

If there is only one maximum-compatible candidate set:

```text
register it automatically
```

No player interaction is needed.

---

# 66. AMBIGUOUS MAXIMUM

If multiple candidate sets score the same maximum number but protect different cells:

```text
enter AWAITING_SEQUENCE_SELECTION
```

The acting player selects which valid sequence set to claim.

This gives the player control over a strategically meaningful ambiguity rather than imposing an arbitrary implementation detail.

---

# 67. SEQUENCE SELECTION COMMAND

```ts
{
  type: "SELECT_SEQUENCE_SET",
  sequenceCellSets: CellId[][],
  actionId,
  expectedVersion
}
```

Server validates that selection is one of the previously computed maximum valid options.

The client cannot submit arbitrary sequence coordinates.

---

# 68. SEQUENCE SELECTION TIMEOUT

If the player does not choose before the selection timeout:

use deterministic tie-breaking.

Canonical tie-break:

1. sort each candidate sequence's cell IDs lexicographically
2. sort candidate sets by canonical serialisation
3. choose lexicographically smallest set

Do not use RNG.

This guarantees replay determinism.

---

# 69. MULTIPLE SEQUENCES ON ONE MOVE

A single marker placement may create:

```text
0
1
2
or potentially more
```

valid sequences.

Register the entire maximum-compatible set before victory evaluation.

Therefore stats and replay remain accurate even if the required win threshold is lower.

---

# 70. SEQUENCE PROTECTION

After registration:

for every non-corner board cell inside a completed sequence:

```text
add sequenceId to sequence membership index
```

Recommended:

```ts
cellSequenceMembership:
  Record<CellId, SequenceId[]>
```

Do not mutate marker identity.

Protection is derived from membership.

---

# 71. PROTECTION OF INTERSECTION

If a marker belongs to two completed sequences:

```text
sequenceIds = [S1, S2]
```

it remains protected.

No special-case logic required.

---

# 72. SEQUENCE REMOVAL

Standard game contains no action that deletes a completed sequence.

Therefore:

```text
CompletedSequence[]
```

is append-only.

---

# 73. VICTORY EVALUATION

After registering new sequences:

```ts
const total =
  completedSequencesByTeam[teamId].length;
```

If:

```text
total >= requiredSequences
```

set:

```text
status = FINISHED
winnerTeamId = actingTeam
```

Victory is immediate.

No later player receives a response move.

No "last chance" turn.

---

# 74. AUTOMATIC SEQUENCE RECOGNITION

Players do not need to announce sequences.

The software must detect them automatically.

There is no:

```text
CALL_SEQUENCE
```

command.

Failing to notice one's own completed line cannot lose it.

---

# 75. NO LEGAL MAIN ACTION SAFEGUARD

This is a production edge case not adequately defined by physical rules.

Possible pathological situation:

```text
player exchanges one dead card
replacement is also unusable
all other cards are also currently unusable
```

The engine must never deadlock.

Therefore define:

```text
if player has zero legal main actions
AND dead-card exchange has already been used
OR no valid exchange is available
```

then:

```text
TURN_SKIPPED_NO_LEGAL_ACTION
```

The player's hand remains unchanged after any exchange already performed.

No additional replacement draw occurs.

Turn advances normally.

This safeguard should be extremely rare.

Log it for telemetry.

---

# 76. PASSING

Manual voluntary passing is NOT allowed in Standard mode when at least one legal main action exists.

Only the engine may generate:

```text
TURN_SKIPPED_NO_LEGAL_ACTION
```

when legal-action count is genuinely zero.

---

# 77. TURN COMPLETION

A regular non-winning turn ends after:

```text
main action resolved
replacement card drawn
turn advanced
```

The next player becomes active.

Reset:

```text
deadCardExchangeUsed = false
```

for the new turn.

---

# 78. STANDARD TURN STATE MACHINE

```text
TURN_START
     │
     ▼
AWAITING_MAIN_ACTION
     │
     ├── optional EXCHANGE_DEAD_CARD
     │         │
     │         └───────────────┐
     │                         │
     ▼                         │
PLAY CARD / JACK ◄─────────────┘
     │
     ▼
RESOLVING
     │
     ├── no sequence
     │       │
     │       ▼
     │     DRAW
     │       │
     │       ▼
     │   NEXT TURN
     │
     └── sequence candidate(s)
             │
             ▼
       unique resolution?
         │         │
        yes        no
         │         │
         │         ▼
         │   AWAITING_SEQUENCE_SELECTION
         │         │
         └────┬────┘
              ▼
         REGISTER
              │
              ▼
          VICTORY?
          │       │
         yes      no
          │       │
          ▼       ▼
      GAME_OVER  DRAW
                  │
                  ▼
              NEXT TURN
```

---

# 79. ACTION IDEMPOTENCY

Every mutating client command must contain:

```text
actionId
```

Example UUID.

The server persists processed action IDs.

If exact action is retried:

```text
return original result
```

Do not execute again.

This protects against:

- double taps
- network retries
- reconnect retries
- WebSocket duplicate delivery

---

# 80. OPTIMISTIC CONCURRENCY

Every client mutation includes:

```text
expectedVersion
```

Game state contains:

```text
version
```

Every successful state mutation increments:

```text
version += 1
```

If:

```text
expectedVersion !== currentVersion
```

reject with:

```text
STALE_GAME_STATE
```

and provide/resync authoritative state.

---

# 81. AUTHORITATIVE GAME COMMANDS

Recommended command union:

```ts
type GameCommand =
  | ExchangeDeadCardCommand
  | PlayNormalCardCommand
  | PlayWildJackCommand
  | PlayRemoveJackCommand
  | SelectSequenceSetCommand;
```

Infrastructure commands such as joining rooms are outside core rules engine.

---

# 82. DOMAIN EVENTS

Recommended engine events:

```text
TURN_STARTED
DEAD_CARD_EXCHANGED
CARD_PLAYED
MARKER_PLACED
MARKER_REMOVED
SEQUENCE_SELECTION_REQUIRED
SEQUENCE_COMPLETED
CARD_DRAWN
DECK_RESHUFFLED
TURN_SKIPPED_NO_LEGAL_ACTION
TURN_COMPLETED
GAME_WON
```

Events should contain enough deterministic information for replay.

---

# 83. PURE ENGINE CONTRACT

Preferred:

```ts
applyCommand(
  state,
  command,
  rng
): EngineResult
```

returns:

```ts
interface EngineResult {
  state: GameState;
  events: DomainEvent[];
}
```

Do not mutate external persistence within game rules.

---

# 84. ENGINE ERROR MODEL

Use domain errors such as:

```text
GAME_NOT_ACTIVE
NOT_YOUR_TURN
INVALID_PHASE
CARD_NOT_OWNED
CARD_NOT_DEAD
DEAD_CARD_ALREADY_EXCHANGED
CARD_HAS_NO_LEGAL_TARGET
TARGET_OCCUPIED
TARGET_CARD_MISMATCH
INVALID_JACK_TYPE
INVALID_JACK_TARGET
PROTECTED_MARKER
CANNOT_TARGET_TEAMMATE
INVALID_SEQUENCE_SELECTION
STALE_GAME_STATE
DUPLICATE_ACTION
```

Expose safe user-facing translations separately.

---

# 85. GAME STATE MODEL

Recommended:

```ts
interface GameState {
  id: GameId;

  rulesVersion: string;

  status:
    | "LOBBY"
    | "ACTIVE"
    | "FINISHED";

  players: PlayerState[];

  teams: TeamState[];

  turnOrder: PlayerId[];

  currentTurnIndex: number;

  turnNumber: number;

  turnPhase: TurnPhase;

  board: BoardState;

  drawPile: CardId[];

  hands: Record<PlayerId, CardId[]>;

  discardPiles: Record<PlayerId, CardId[]>;

  completedSequences:
    Record<TeamId, CompletedSequence[]>;

  sequenceMembership:
    Record<CellId, SequenceId[]>;

  deadCardExchangeUsed: boolean;

  pendingSequenceOptions:
    SequenceSelectionOption[] | null;

  requiredSequences: number;

  winnerTeamId: TeamId | null;

  version: number;

  rngVersion: string;

  createdAt: string;

  finishedAt: string | null;
}
```

---

# 86. BOARD STATE

```ts
interface BoardState {
  definitionId: string;

  cells: Record<
    CellId,
    {
      occupantTeamId: TeamId | null;
      occupantPlayerId: PlayerId | null;
    }
  >;
}
```

Wild corners need no occupancy field if board definition provides type.

---

# 87. DERIVED DATA

Do not persist data unnecessarily when it can be derived safely.

Examples:

```text
isProtected
isDeadCard
legalTargets
legalActions
teamSequenceCount
```

Derive these from canonical state.

Persistence duplication creates consistency bugs.

---

# 88. VIEWER STATE

Create:

```ts
projectStateForViewer(
  state,
  viewerId
)
```

Never return the raw authoritative `GameState` to clients.

---

# 89. VIEWER MAY SEE

```text
board
all markers
all completed sequences
whose turn
turn number
player identities
team identities
player card counts
their own hand
discard piles
draw pile count
required sequence count
connection metadata
```

---

# 90. VIEWER MAY NOT SEE

```text
other players' card identities
future draw order
RNG seed during active match
private server metadata
unpublished pending actions
```

Spectators must not receive any player's hand unless game rules explicitly provide delayed/replay visibility.

---

# 91. AI INFORMATION BOUNDARY

Bots must use the same information legitimately available to the player seat they control.

A bot may know:

```text
its own cards
public board
public discards
card counts
turn history
```

It may not inspect:

```text
human hands
future deck order
hidden RNG information
```

unless explicitly implementing a debug-only cheating bot.

---

# 92. RECONNECT MODEL

The server is always authoritative.

On reconnect:

```text
authenticate player
identify game
retrieve authoritative game state
project viewer-safe state
send version
send active turn deadline
```

The client discards conflicting speculative state.

---

# 93. IN-FLIGHT ACTION RECONNECT

Scenario:

```text
client sends action
server commits
connection disappears before response
```

After reconnect the client checks:

```text
actionId
```

If processed:

```text
return committed result/state
```

Never execute it twice.

---

# 94. TIMEOUTS

Turn timers are product configuration, not fundamental game rules.

Recommended production behaviour:

Casual:

```text
timer optional
```

Ranked:

```text
timer mandatory
```

On timeout:

1. compute legal actions server-side
2. if none, skip
3. otherwise choose deterministic or server-random legal fallback according to mode configuration

Persist timeout action.

Never let browser timers decide game state.

---

# 95. TIMEOUT AUTO-ACTION

Recommended ranked behaviour:

Priority:

```text
1. winning legal action
2. block immediate opponent victory
3. normal deterministic legal action
```

Alternatively use unbiased seeded random legal action.

Whatever policy is chosen must be versioned.

Timeout policy is not AI strategy and must not inspect private opponent information.

---

# 96. DISCONNECTION

Disconnection does not immediately remove player from active game.

Track:

```text
CONNECTED
RECONNECTING
DISCONNECTED
FORFEITED
```

Gameplay timeout policy decides eventual forfeit or auto-play.

Core engine only needs deterministic commands.

---

# 97. TEAM INFORMATION

Team members share:

```text
markers
completed sequences
win condition
```

They do not share hands.

A marker placed by any teammate belongs to:

```text
teamId
```

and records:

```text
occupantPlayerId
```

for statistics only.

Sequence detection operates on team ownership.

---

# 98. TABLE TALK

Physical anti-coaching penalties are not part of authoritative Quintara engine logic.

Do not attempt to detect conversation content.

Ranked mode may disable team-private communication if desired.

External communication cannot realistically be prevented.

The important engine rule is:

```text
teammate hands remain hidden
```

---

# 99. MARKER SUPPLY

Quintara digital Standard mode does not enforce finite physical chip inventory.

A team can place markers whenever board rules permit.

The board itself limits occupancy.

This avoids introducing undefined "ran out of plastic chips" behaviour into software.

---

# 100. GAME-END STATE

After victory:

```text
status = FINISHED
turnPhase = GAME_OVER
winnerTeamId set
```

No further game command except replay/navigation infrastructure is accepted.

Reject gameplay commands with:

```text
GAME_NOT_ACTIVE
```

---

# 101. GAME RESULT

Persist:

```ts
interface GameResult {
  winnerTeamId: TeamId;
  winningActionId: ActionId;
  winningPlayerId: PlayerId;
  totalTurns: number;
  completedAt: string;
  sequencesByTeam: Record<TeamId, number>;
}
```

---

# 102. REPLAY

Replay must not reconstruct the game by guessing.

Store either:

```text
initial state + complete command/event stream + RNG information
```

or periodic snapshots plus complete event stream.

Replay must reproduce:

```text
hands
draws
placements
removals
dead exchanges
sequence claims
winner
```

exactly.

---

# 103. RULE VERSIONING

Every match stores:

```text
rulesVersion
```

Example:

```text
quintara-standard-1.0.0
```

Never silently change rules for already recorded games.

Future rule changes:

```text
1.1.0
2.0.0
```

must remain replay-compatible.

---

# 104. CONFIGURATION

Separate invariant rules from configurable product options.

Example:

```ts
interface GameRulesConfig {
  teamCount: 2 | 3;
  requiredSequences: number;
  turnDurationMs?: number;
  allowDeadCardExchange: boolean;
  maxDeadCardExchangesPerTurn: number;
}
```

Standard preset should be immutable.

Custom games may override approved options.

---

# 105. STANDARD PRESET

```ts
const QUINTARA_STANDARD = {
  boardSize: 10,
  wildCorners: true,

  allowJacks: true,

  twoEyedJacks: ["JC", "JD"],
  oneEyedJacks: ["JH", "JS"],

  allowDeadCardExchange: true,
  maxDeadCardExchangesPerTurn: 1,

  autoDraw: true,

  protectCompletedSequences: true,

  maxSequencePairOverlap: 1,

  reshuffleDiscardsWhenDeckEmpty: true,

  voluntaryPass: false,

  sequenceRecognition: "AUTOMATIC"
};
```

---

# 106. CUSTOM RULE SAFETY

Custom game options may alter:

```text
target sequences
turn timer
AI difficulty
team configuration
```

Do not allow arbitrary toggles that violate engine invariants unless separately engineered and tested.

Examples of dangerous modifications:

```text
sequence length
board dimensions
Jack semantics
corner semantics
overlap semantics
```

These create a different game and require independent test coverage.

---

# 107. LEGAL ACTION PSEUDOCODE

```ts
function getLegalActions(
  state: GameState,
  playerId: PlayerId
): LegalActions {
  assertActiveTurn(state, playerId);

  const hand = state.hands[playerId];
  const teamId = getTeamId(state, playerId);

  const deadExchanges =
    state.deadCardExchangeUsed
      ? []
      : hand
          .filter(cardId =>
            isDeadCard(state, getCard(cardId))
          )
          .map(cardId => ({
            type: "EXCHANGE_DEAD_CARD",
            cardId
          }));

  const mainActions = [];

  for (const cardId of hand) {
    const card = getCard(cardId);

    if (isNormalCard(card)) {
      for (
        const target of
        getNormalCardLegalTargets(state, card)
      ) {
        mainActions.push({
          type: "PLAY_NORMAL_CARD",
          cardId,
          targetCellId: target
        });
      }

      continue;
    }

    if (isTwoEyedJack(card)) {
      for (
        const target of
        getWildJackLegalTargets(state)
      ) {
        mainActions.push({
          type: "PLAY_WILD_JACK",
          cardId,
          targetCellId: target
        });
      }

      continue;
    }

    if (isOneEyedJack(card)) {
      for (
        const target of
        getRemovalJackLegalTargets(
          state,
          teamId
        )
      ) {
        mainActions.push({
          type: "PLAY_REMOVE_JACK",
          cardId,
          targetCellId: target
        });
      }
    }
  }

  return {
    deadExchanges,
    mainActions
  };
}
```

---

# 108. SEQUENCE DETECTION PSEUDOCODE

```ts
function detectCandidateSequences(
  state: GameState,
  teamId: TeamId,
  placedCellId: CellId
): CandidateSequence[] {

  const placed =
    getCoordinate(placedCellId);

  const candidates = [];

  for (const [dr, dc] of DIRECTIONS) {

    const run =
      collectCompatibleRun(
        state,
        teamId,
        placed,
        dr,
        dc
      );

    if (run.length < 5) {
      continue;
    }

    for (
      let start = 0;
      start <= run.length - 5;
      start++
    ) {
      const window =
        run.slice(start, start + 5);

      if (
        !window.includes(placedCellId)
      ) {
        continue;
      }

      candidates.push(
        canonicaliseSequence(
          teamId,
          window
        )
      );
    }
  }

  return uniqueSequences(candidates);
}
```

---

# 109. OVERLAP VALIDATOR

```ts
function sequencesCompatible(
  a: CandidateSequence,
  b: CandidateSequence
): boolean {
  return intersectionSize(
    a.cells,
    b.cells
  ) <= 1;
}
```

For candidate vs existing sequence:

same rule.

---

# 110. SEQUENCE SET RESOLUTION

Given:

```text
existing team sequences
+
new candidate sequences
```

find maximum compatible subset of new candidates.

Board dimensions are tiny.

Brute force/backtracking is acceptable and safer than clever premature optimisation because candidate count around one newly placed cell is small.

Prioritise correctness.

---

# 111. ENGINE INVARIANTS

After every successful command assert in non-production tests:

```text
104 cards exist exactly once
board coordinates unique
wild corners unoccupied
normal cells have ≤1 marker
every player belongs to one side
turn player exists
every completed sequence contains 5 cells
every sequence is straight
every sequence is contiguous
every sequence's cells qualify for its team
same-team sequence overlap ≤1
protected membership references real sequences
no protected sequence has been broken
winner satisfies win requirement
```

---

# 112. REQUIRED BOARD TESTS

```text
board dimensions = 10 × 10
cell count = 100
wild corners = 4
card cells = 96
unique normal card identities = 48
each identity occurs twice
Jacks occur zero times on board
```

---

# 113. REQUIRED DECK TESTS

```text
deck count = 104

normal cards = 96
Jacks = 8

JC = 2
JD = 2
JH = 2
JS = 2

every physical card ID unique
```

---

# 114. PLAYER CONFIGURATION TESTS

Must accept:

```text
2
3
4
6
8
9
10
12
```

Must reject Standard:

```text
1
5
7
11
13+
```

Verify every standard hand size.

Verify team interleaving.

---

# 115. NORMAL CARD TESTS

Test:

```text
both mapped cells open
first open only
second open only
both occupied
target mismatch
target occupied
card not owned
wrong player's turn
```

---

# 116. DEAD CARD TESTS

Test:

```text
both copies occupied by opponent
both copies occupied by current team
copies occupied by different teams
one copy open
both copies open
Jack never dead
exchange once
exchange twice rejected
replacement may itself be dead
removed marker makes card playable again
```

---

# 117. WILD JACK TESTS

Test:

```text
JC places anywhere open
JD places anywhere open
cannot target occupied cell
cannot target corner
cannot target outside board
placement may create sequence
placement may create two sequences
```

---

# 118. REMOVE JACK TESTS

Test:

```text
JH removes opponent
JS removes opponent
cannot remove own marker
cannot remove teammate
can remove either opponent in three-team game
cannot target empty
cannot target corner
cannot remove protected marker
removal frees normal-card board location
```

---

# 119. CORNER TESTS

Test:

```text
corner + four team markers = sequence
corner + three = not sequence
same corner usable by two different teams
same corner usable by multiple compatible sequences
corner cannot receive marker
corner cannot be removed
```

---

# 120. BASIC SEQUENCE TESTS

Test:

```text
horizontal 5
vertical 5
diagonal ↘ 5
diagonal ↗ 5
```

Also test boundaries:

```text
top row
bottom row
left edge
right edge
all four corners
```

---

# 121. NON-SEQUENCE TESTS

```text
four contiguous
five with gap
five containing opponent
five containing empty
bent shape
wrap from row edge to next row
```

All invalid.

---

# 122. LONG-RUN TESTS

Explicitly test:

```text
5 contiguous → 1
6 contiguous → 1
7 contiguous → 1
8 contiguous → 1
9 contiguous → 2 possible
```

Also test different placement order.

The result must not depend incorrectly on array iteration order.

---

# 123. CROSSING TESTS

Test move that completes:

```text
horizontal + vertical
horizontal + diagonal
vertical + diagonal
two diagonals
```

Each pair sharing one space may count separately.

---

# 124. AMBIGUOUS SIX-RUN TEST

Create:

```text
● ● ● ● ● ●
```

where the final placement creates two possible five-windows.

Engine must:

```text
detect two candidate windows
max score = 1
recognise multiple equal choices
enter AWAITING_SEQUENCE_SELECTION
```

Verify selected window becomes protected.

---

# 125. NINE-RUN TEST

Create a nine-cell continuous team run.

Verify engine can select:

```text
1–5
5–9
```

as two valid sequences.

Verify win in a two-side Standard game.

---

# 126. SIMULTANEOUS DOUBLE-SEQUENCE WIN

Create board where final marker completes:

```text
one horizontal five
one vertical five
```

sharing only final marker.

Expected:

```text
2 sequences registered
victory immediate
no replacement card drawn
```

---

# 127. PROTECTION TESTS

After sequence completion:

```text
every occupied member cell protected
intersection protected
unrelated marker not protected
```

One-Eyed Jack must reject protected cell.

---

# 128. DECK EXHAUSTION TEST

Set draw pile to one card.

Perform main action.

Draw final card.

Next required draw:

```text
collect discards
shuffle
draw
```

Verify:

```text
total card count remains 104
```

---

# 129. IDEMPOTENCY TEST

Submit same command twice with same:

```text
actionId
```

Expected:

```text
board changes once
card discarded once
draw occurs once
version increment occurs once
```

Second request returns prior outcome.

---

# 130. CONCURRENCY TEST

Two commands created against same game version.

First succeeds.

Second must fail:

```text
STALE_GAME_STATE
```

It must not partially execute.

---

# 131. PRIVACY TEST

Serialise viewer state for Player A.

Assert it contains:

```text
A's exact hand
```

Assert it does NOT contain:

```text
B's hand
C's hand
future deck identities
RNG seed
```

Run this test against every API/WebSocket projection.

---

# 132. RECONNECT TEST

Simulate:

```text
action accepted
server committed
response lost
client reconnects
same action retried
```

Expected:

```text
no duplicate move
authoritative board correct
client hand correct
turn correct
```

---

# 133. PROPERTY TEST: CARD CONSERVATION

After random legal games:

```text
count(draw pile)
+
sum(hands)
+
sum(discard piles)
=
104
```

Always.

---

# 134. PROPERTY TEST: BOARD OCCUPANCY

For every generated state:

```text
0 <= occupied normal cells <= 96
```

Wild corners never occupied.

---

# 135. PROPERTY TEST: SEQUENCE VALIDITY

Every stored completed sequence must satisfy:

```text
five unique coordinates
straight
contiguous
team compatible
valid overlap
```

---

# 136. PROPERTY TEST: LEGAL ACTION SAFETY

Generate random legal state.

For every action returned by:

```ts
getLegalActions()
```

executing that action must not produce:

```text
ILLEGAL_ACTION
```

Legal-action generator and validator must agree.

---

# 137. PROPERTY TEST: ILLEGAL MUTATION

Generate malformed actions:

```text
wrong cards
wrong targets
wrong players
occupied cells
protected removals
stale versions
```

State must remain byte-for-byte equivalent after rejection.

No partial mutation.

---

# 138. TRANSACTION BOUNDARY

Server processing of one command must be atomic.

Conceptually:

```text
validate
calculate transition
persist transition
commit
publish event
```

Never broadcast state before persistence succeeds.

---

# 139. SERVER AUTHORITY

Client requests intent.

Client never sends trusted state changes.

Correct:

```text
Play this card at this cell.
```

Incorrect:

```text
Set cell 42 to Blue.
```

---

# 140. UI DERIVES FROM ENGINE

The UI obtains legal actions from engine/server projection.

For selected normal card:

```text
highlight legal mapped cells
```

For Two-Eyed Jack:

```text
highlight legal empty cells
```

For One-Eyed Jack:

```text
highlight legal removable opponent markers
```

Do not reconstruct target legality separately in CSS/React.

---

# 141. ANIMATION HAS ZERO RULE AUTHORITY

Marker placement animation may last 300 ms.

Engine mutation is still authoritative.

If animation is interrupted:

```text
state remains correct
```

If user reloads:

```text
animation does not matter
```

---

# 142. GAME ENGINE MUST NOT IMPORT

The game-engine package must not import:

```text
React
Next.js
DOM APIs
WebSocket libraries
database ORM
Redis
CSS
Framer Motion
browser storage
```

It may import:

```text
domain utilities
validated RNG abstraction
shared primitive types
```

---

# 143. RECOMMENDED PACKAGE STRUCTURE

```text
/packages/game-engine
  /src
    cards.ts
    board.ts
    setup.ts
    state.ts
    commands.ts
    actions.ts
    legal-actions.ts
    dead-cards.ts
    jacks.ts
    sequences.ts
    overlap.ts
    victory.ts
    draw.ts
    turns.ts
    projection.ts
    invariants.ts
    errors.ts
    rng.ts
    index.ts

  /tests
    board.test.ts
    cards.test.ts
    setup.test.ts
    normal-play.test.ts
    jacks.test.ts
    dead-cards.test.ts
    sequences.test.ts
    overlap.test.ts
    victory.test.ts
    reshuffle.test.ts
    property.test.ts
```

---

# 144. GAME ENGINE PUBLIC API

Expose a small deliberate API:

```ts
createGame()

startGame()

applyCommand()

getLegalActions()

getStateForViewer()

validateGameState()

validateBoardDefinition()

replayEvents()
```

Keep lower-level mutation helpers internal.

---

# 145. DO NOT EXPOSE

Avoid public functions such as:

```text
setBoardCell()
setPlayerHand()
setWinner()
addSequenceUnsafe()
removeMarkerUnsafe()
```

outside test/debug tooling.

They bypass invariants.

---

# 146. DEBUG API

Development builds may expose:

```text
setHand
setBoard
setDrawPile
setTurn
createScenario
```

but this package must be tree-shaken/disabled from production server endpoints.

---

# 147. SCENARIO BUILDER FOR TESTS

Create fluent test helpers.

Example:

```ts
scenario()
  .withCurrentPlayer("A")
  .withHand("A", ["8H", "JC"])
  .withMarker("A", 2, 2)
  .withMarker("A", 2, 3)
  .withMarker("A", 2, 4)
  .withMarker("A", 2, 5)
  .build();
```

This will drastically improve rule-test readability.

---

# 148. PERFORMANCE

The board contains only 100 cells.

Do not compromise correctness to optimise tiny operations.

Sequence detection, candidate generation and maximum compatible subset resolution are trivial at this scale.

Optimise clarity first.

---

# 149. NUMERIC DETERMINISM

Avoid floating point in core rules.

Coordinates, turns, card counts and sequence counts are integers.

RNG operations should use explicit deterministic implementation.

---

# 150. SERIALISATION

Every domain object persisted for replay must have stable serialisation.

Do not rely on JavaScript `Set` ordering as game semantics.

Canonicalise arrays before hashing or comparing.

---

# 151. STATE HASH

Optional but recommended:

after each committed action calculate:

```text
stateHash
```

using canonical serialisation.

Persist with event.

Useful for:

```text
replay validation
desync detection
audit/debugging
```

---

# 152. EVENT ORDER

Within a normal placement turn, event ordering should be deterministic.

Example:

```text
CARD_PLAYED
MARKER_PLACED
SEQUENCE_COMPLETED
SEQUENCE_COMPLETED
GAME_WON
```

Winning turn does not emit:

```text
CARD_DRAWN
TURN_COMPLETED
TURN_STARTED
```

for another player.

---

# 153. NORMAL NON-WINNING EVENT ORDER

```text
CARD_PLAYED
MARKER_PLACED
optional SEQUENCE_COMPLETED
CARD_DRAWN
TURN_COMPLETED
TURN_STARTED
```

---

# 154. REMOVE JACK EVENT ORDER

```text
CARD_PLAYED
MARKER_REMOVED
CARD_DRAWN
TURN_COMPLETED
TURN_STARTED
```

---

# 155. DEAD EXCHANGE EVENT ORDER

```text
DEAD_CARD_EXCHANGED
CARD_DRAWN
```

The turn remains active.

The replacement draw event should indicate:

```text
reason = DEAD_CARD_REPLACEMENT
```

rather than normal turn refill.

---

# 156. RESHUFFLE EVENT

Whenever draw pile requires refill:

```text
DECK_RESHUFFLED
CARD_DRAWN
```

Persist reshuffle occurrence for deterministic replay/audit.

---

# 157. GAME STATUS INVARIANT

Valid:

```text
LOBBY
ACTIVE
FINISHED
```

A FINISHED game must have:

```text
winnerTeamId != null
```

An ACTIVE game must have:

```text
winnerTeamId == null
```

---

# 158. REQUIRED SEQUENCE COUNT INVARIANT

In Standard:

```text
2 teams → 2
3 teams → 1
```

Do not accept inconsistent game configuration.

---

# 159. TEAM OWNERSHIP

The board marker belongs strategically to:

```text
team
```

not individual player.

Individual player ID is retained only for:

```text
attribution
statistics
replay
```

Teammates contribute to the same line.

---

# 160. CARD OWNERSHIP

Cards belong to individual hands.

A teammate cannot:

```text
play partner's card
exchange partner's dead card
see partner's card
```

---

# 161. RANKED MODE RULE LOCK

Ranked matches must use immutable:

```text
QUINTARA_STANDARD
```

No host-controlled rule modifications.

This protects competitive integrity.

---

# 162. CASUAL CUSTOM MODE

Casual rooms may configure approved options.

Every room must display rule differences before match begins.

Never silently modify mechanics.

---

# 163. SPECTATOR SECURITY

Live spectators receive:

```text
public board
public discards
turn
scores
```

They do not receive hands.

Optional delayed spectator hand reveal may be implemented separately but should never leak information back to active players.

---

# 164. FORFEIT

Forfeit is infrastructure-level match termination.

Command:

```text
FORFEIT_GAME
```

Winner determination:

```text
remaining opponent/team
```

In three-team games, choose explicit product policy:

recommended:

```text
forfeiting side eliminated
game continues if ≥2 sides remain
```

Do not mix this with standard board-rule logic.

---

# 165. PLAYER ABANDONMENT IN TEAM MODE

Recommended casual/ranked infrastructure policy:

```text
temporary disconnect → grace period
expired grace → bot takeover or forfeit policy
```

Core board rules remain unchanged.

Replacement bot receives only legitimate seat information.

---

# 166. GAME DRAW

Standard rules are designed to continue by reshuffling discards.

Do not declare a draw merely because the initial draw pile empties.

A draw should occur only if an engine-detectable terminal state exists where:

```text
no side has won
AND
no future legal state transition is possible
```

This is expected to be extraordinarily rare.

Production may instead continue using the no-legal-action safeguard until a win is possible.

---

# 167. TERMINAL STALEMATE SAFEGUARD

For production safety, track consecutive:

```text
TURN_SKIPPED_NO_LEGAL_ACTION
```

If every active player completes one entire rotation with:

```text
zero legal board action
```

and no board state changes occurred during that rotation:

declare:

```text
STALEMATE
```

This is a Quintara software safety rule.

Persist:

```text
resultType = STALEMATE
winnerTeamId = null
```

This prevents infinite matches in pathological custom/edge states.

Standard games should almost never reach this.

---

# 168. RULE PRECEDENCE

When determining an action:

1. game status
2. turn ownership
3. phase
4. card ownership
5. card type
6. target legality
7. protected-sequence rules
8. board mutation
9. sequence detection
10. sequence selection
11. victory
12. draw
13. advance turn

Never reorder these casually.

---

# 169. IMPORTANT EXAMPLES

## Example A: normal card

Player holds:

```text
8♥
```

Board has two 8♥ cells.

Both empty.

Legal actions:

```text
8♥ → cell A
8♥ → cell B
```

Player selects B.

Result:

```text
8♥ discarded
team marker placed at B
sequences checked
replacement drawn
next turn
```

---

# 170. EXAMPLE B: dead card

Player holds:

```text
8♥
```

Both 8♥ cells occupied.

Result:

```text
8♥ is dead
```

Player may:

```text
exchange 8♥
draw replacement
continue normal turn
```

Only one such exchange that turn.

---

# 171. EXAMPLE C: Two-Eyed Jack

Player plays:

```text
J♣
```

Any unoccupied normal card cell can be selected.

Marker placed.

Sequence detection runs normally.

---

# 172. EXAMPLE D: One-Eyed Jack

Player plays:

```text
J♥
```

Target:

```text
unprotected opponent marker
```

Opponent marker removed.

Current player does not place anything.

Draw.

Turn ends.

---

# 173. EXAMPLE E: protected marker

Blue has completed:

```text
● ● ● ● ●
```

Every occupied marker in that registered sequence is protected.

Red plays One-Eyed Jack.

Those cells are absent from Red's legal target list.

---

# 174. EXAMPLE F: crossing double win

Before move:

```text
    ●
    ●
● ● _ ● ●
    ●
    ●
```

Current player fills `_`.

Result:

```text
horizontal sequence
vertical sequence
```

They share one marker.

Both count.

In two-side game:

```text
immediate win
```

---

# 175. EXAMPLE G: six-marker ambiguity

Board becomes:

```text
● ● ● ● ● ●
```

Possible sequence claims:

```text
[1,2,3,4,5]
```

or:

```text
[2,3,4,5,6]
```

Only one counts.

Because protected-cell choice is strategically relevant, player selects one.

---

# 176. EXAMPLE H: nine markers

```text
● ● ● ● ● ● ● ● ●
```

Valid claims:

```text
1 2 3 4 5
        5 6 7 8 9
```

Overlap:

```text
one cell
```

Therefore:

```text
two sequences
```

---

# 177. EXAMPLE I: corner

```text
W ● ● ● ●
```

where `W` is wild corner.

Result:

```text
valid sequence
```

No physical marker exists on W.

---

# 178. EXAMPLE J: three teams

Teams:

```text
Blue
Gold
Red
```

Each requires:

```text
one sequence
```

First team reaching one wins immediately.

---

# 179. ENGINE REVIEW CHECKLIST

Before production release confirm:

```text
all legal actions generated server-side
all client actions revalidated
hidden cards never leaked
RNG authoritative
replays deterministic
duplicate actions idempotent
state versions enforced
sequence overlap tested
six-run ambiguity handled
nine-run double sequence handled
corners handled
protected markers handled
dead exchange handled
reshuffle handled
no-action safeguard handled
```

---

# 180. FINAL RULES SUMMARY

The canonical Standard gameplay loop is:

```text
START TURN

optional:
exchange exactly one dead normal card

then perform exactly one main action:

NORMAL CARD
→ place on matching empty board cell

OR

TWO-EYED JACK
→ place on any empty normal cell

OR

ONE-EYED JACK
→ remove one unprotected opponent marker

then:

resolve new sequences

if sequence selection is ambiguous:
player chooses among maximum valid sequence sets

register completed sequences

if required sequence count reached:
WIN

otherwise:
draw one replacement card

advance turn
```

Sequences:

```text
5 contiguous compatible spaces
horizontal / vertical / diagonal
```

Wild corners:

```text
count for every team
```

Completed sequences:

```text
permanently protected
```

Separate sequences belonging to one team:

```text
may share at most one board space
```

Two competing sides:

```text
2 sequences required
```

Three competing sides:

```text
1 sequence required
```

That is the canonical Quintara Standard rules engine contract.

---

# 181. IMPLEMENTATION COMMAND

Treat this specification as normative.

Do not invent gameplay behaviour outside it.

Where an implementation question arises:

1. first apply an explicit rule in this document
2. then apply an invariant
3. then preserve deterministic behaviour
4. then preserve server authority
5. if still undefined, add a documented versioned rule before implementing it

No silent house rules.

No client-only rules.

No ambiguous state transitions.

No non-deterministic sequence scoring.

No hidden-information leakage.

No duplicate network mutations.

The engine is not complete until the complete rule test suite passes.