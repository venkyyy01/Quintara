# QUINTARA

## Master Product + Engineering Prompt

You are acting simultaneously as:

- Principal Full-Stack Engineer
- Multiplayer Game Architect
- Senior React/Next.js Engineer
- UI/UX Game Designer
- Motion Designer
- PWA Engineer
- Backend Engineer
- Game Rules Engineer
- QA Automation Engineer
- Accessibility Engineer
- Product Designer

Your task is to design and build a production-quality browser-based strategy board game called **Quintara**.

Quintara is inspired by the general card-to-board alignment mechanic found in classic sequence-building board games, but the implementation, branding, artwork, visual identity, UI, written rules, sounds, animations, and product design must be original.

Do not use copyrighted artwork, logos, branded board assets, branded card backs, proprietary rulebook wording, or trademarked branding from existing commercial games.

The finished product must feel like a premium modern digital board game rather than a basic hobby project.

---

# 1. PRODUCT VISION

Build a polished multiplayer strategy game playable through a browser and installable as a Progressive Web App.

Supported devices:

- desktop browsers
- laptops
- tablets
- iPad
- Android tablets
- iPhone
- Android phones
- landscape mobile
- portrait mobile
- standalone PWA
- touchscreen devices
- keyboard/mouse devices

The product must support:

- solo play against AI
- local pass-and-play
- private online rooms
- public matchmaking
- team games
- reconnect-safe multiplayer
- guest users
- registered users
- game history
- rematches
- tutorials
- responsive design
- offline AI/local play
- installable PWA

The experience should feel comparable in polish to modern digital board-game applications.

---

# 2. WORKING PRODUCT NAME

Use:

**QUINTARA**

Tagline:

**Build the line. Break the plan. Own the board.**

Internally use identifiers such as:

```text
quintara
quintara-game
quintara-web
quintara-engine
```

Do not reference any other commercial board-game brand in the actual application UI.

---

# 3. CORE GAME CONCEPT

Quintara combines:

1. playing cards
2. board positioning
3. blocking
4. special action cards
5. line-building strategy

Players receive cards.

Each normal card corresponds to two locations on a 10 × 10 board.

A player normally:

1. plays one card
2. selects an eligible matching board position
3. places their team marker
4. draws a replacement card

The objective is to create continuous lines of five team markers.

Depending on game configuration, a team must complete either one or two valid five-space lines to win.

---

# 4. BOARD

Use a 10 × 10 board.

Total spaces:

```text
100
```

Four corner cells are universal wild spaces.

Remaining spaces:

```text
96 normal card spaces
```

Use 48 unique non-Jack playing-card identities.

Each appears exactly twice.

Calculation:

```text
12 ranks
× 4 suits
× 2 board copies
= 96 board spaces
```

Do not display Jacks on the board.

The board configuration must live in a configuration file and not be hard-coded throughout UI components.

Example:

```ts
export const BOARD_LAYOUT: BoardCellDefinition[] = [...]
```

Each normal cell contains:

```ts
{
  id: string;
  row: number;
  column: number;
  type: "CARD";
  cardCode: string;
}
```

Corner:

```ts
{
  id: string;
  row: number;
  column: number;
  type: "WILD";
}
```

---

# 5. DECK

Use two standard 52-card decks.

Total:

```text
104 cards
```

No Jokers.

Normal cards:

```text
96
```

Jacks:

```text
8
```

Every physical card instance must have a unique ID.

Example:

```ts
{
  id: "deck-1-8H",
  rank: "8",
  suit: "HEARTS",
  code: "8H"
}
```

and:

```ts
{
  id: "deck-2-8H",
  rank: "8",
  suit: "HEARTS",
  code: "8H"
}
```

Both map to the same two board locations.

---

# 6. PLAYER CONFIGURATIONS

Support standard configurations.

### Two players

```text
1 vs 1
```

Cards per player:

```text
7
```

Required completed lines:

```text
2
```

### Three players

```text
1 vs 1 vs 1
```

Cards:

```text
6
```

Required completed lines:

```text
1
```

### Four players

```text
2 vs 2
```

Cards:

```text
6
```

Required completed lines:

```text
2
```

### Six players

Allow:

```text
2 teams × 3 players
```

or:

```text
3 teams × 2 players
```

Cards:

```text
5
```

### Eight players

```text
2 teams × 4
```

Cards:

```text
4
```

### Nine players

```text
3 teams × 3
```

Cards:

```text
4
```

### Ten players

```text
2 teams × 5
```

Cards:

```text
3
```

### Twelve players

Allow:

```text
2 × 6
```

or:

```text
3 × 4
```

Cards:

```text
3
```

Reject unsupported configurations unless Custom Game mode explicitly allows them.

---

# 7. TEAM TURN ORDER

Two teams:

```text
A
B
A
B
A
B
```

Three teams:

```text
A
B
C
A
B
C
```

Partners must never have consecutive turns when standard team mode is active.

The server generates canonical seat order.

---

# 8. PLAYER HAND PRIVACY

A player can see:

- their own cards
- public board
- turn order
- scores
- player names
- team assignments
- discard history
- remaining deck count
- completed lines

A player must NOT receive through the network:

- opponent hands
- teammate hands
- future deck order

Do not merely hide this data with CSS.

Do not send it to unauthorised clients at all.

---

# 9. NORMAL TURN FLOW

Canonical turn:

```text
TURN START
   ↓
Optional dead-card exchange
   ↓
Select card
   ↓
Determine action type
   ↓
Select legal target
   ↓
Server validates move
   ↓
Apply move
   ↓
Detect newly completed lines
   ↓
Protect completed lines
   ↓
Check victory
   ↓
Discard played card
   ↓
Draw replacement
   ↓
Persist event
   ↓
Broadcast state
   ↓
Advance turn
```

Automatically draw replacement cards.

Do not recreate physical-game inconveniences that only exist because players manually manage cards.

---

# 10. NORMAL CARD ACTION

Example card:

```text
8♥
```

Two board spaces contain `8♥`.

Possible states:

### Both open

Both are valid.

### One occupied

Only the open copy is valid.

### Both occupied

Card is dead.

Selecting a normal card should visually highlight its currently legal board locations.

All other cells should become visually subdued.

---

# 11. DEAD CARDS

A normal card becomes dead when both corresponding board spaces are occupied.

Ownership does not matter.

Example:

```text
8♥ location A = Blue
8♥ location B = Red
```

Therefore:

```text
8♥ = dead
```

At the start of the player's turn, allow one dead-card exchange.

Flow:

```text
select dead card
→ verify server-side that it is dead
→ discard card
→ draw replacement
→ continue same turn
```

Maximum:

```text
one dead-card exchange per turn
```

Dead-card status must be dynamically recalculated.

If an action later removes a marker from one matching location, the card becomes playable again.

UI should show:

```text
DEAD
```

badge automatically.

---

# 12. SPECIAL JACK CARDS

Use two categories.

## Two-Eyed Jacks

Use:

```text
J♣
J♦
```

Behaviour:

```text
wild placement
```

Player may place one marker on any legal empty normal board space.

Do not allow placement on wild corner cells.

When selected:

- highlight every legal empty cell
- dim occupied cells
- show subtle animated glow around valid cells

---

# 13. ONE-EYED JACKS

Use:

```text
J♥
J♠
```

Behaviour:

```text
remove one eligible opponent marker
```

The player does not place their own marker afterward.

Flow:

```text
select One-Eyed Jack
→ highlight removable opponent markers
→ choose one
→ animate removal
→ discard Jack
→ draw replacement
→ finish turn
```

Markers belonging to protected completed lines cannot be removed.

---

# 14. WILD CORNERS

Four board corners are universal spaces.

They count as belonging to every team simultaneously for line detection.

Nobody owns them.

Nobody places markers on them.

Nobody removes them.

Represent them separately:

```ts
{
  type: "WILD"
}
```

Do not assign a `teamId`.

Example:

```text
WILD + 4 Blue markers = valid Blue line
```

---

# 15. COMPLETED LINE

A completed line contains five valid spaces in a straight uninterrupted direction.

Directions:

```text
horizontal
vertical
diagonal ↘
diagonal ↗
```

A qualifying space is:

```text
player/team marker
OR
wild corner
```

Five consecutive qualifying spaces constitute one completed line.

---

# 16. PROTECTED LINES

When a line is completed:

- create a unique `sequenceId`
- register its five board cells
- visually mark it as completed
- protect its occupied markers from One-Eyed Jack removal

A marker can belong to more than one completed line.

Therefore represent:

```ts
interface BoardCellState {
  occupantTeamId?: string;
  sequenceIds: string[];
}
```

Not:

```ts
protected: boolean
```

because a cell can participate in multiple completed lines.

---

# 17. OVERLAPPING LINES

Two valid completed lines belonging to the same team may share no more than one occupied board location when being counted as separate winning lines.

Example:

```text
    ●
    ●
● ● ● ● ●
    ●
    ●
```

The intersection can participate in both.

Also correctly support long straight runs.

Example:

```text
● ● ● ● ● ● ● ● ●
```

Positions:

```text
1 2 3 4 5
```

form line one.

Positions:

```text
5 6 7 8 9
```

form line two.

They share one marker.

Do not count every possible five-cell sliding window as a separate completed line.

Create deterministic canonical line-selection logic.

---

# 18. LINE DETECTION ALGORITHM

After placement at:

```text
(row, column)
```

only evaluate lines passing through the newly placed marker.

Directions:

```ts
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1]
]
```

For each direction:

1. walk backwards
2. walk forwards
3. collect contiguous cells compatible with team
4. include wild corners
5. enumerate candidate five-cell windows containing the newly placed cell
6. reject duplicates
7. validate overlap constraints
8. register valid new lines

Do not scan arbitrary unrelated board areas after every move unless it simplifies correctness without performance concerns.

Correctness is more important than micro-optimisation.

---

# 19. VICTORY

Two-player/two-team standard games:

```text
2 completed lines required
```

Three-player/three-team standard games:

```text
1 completed line required
```

Game configuration should contain:

```ts
requiredSequences: number
```

When requirement is reached:

```text
GAME_OVER
```

Persist:

- winner
- losing teams
- final board
- final move
- duration
- move count
- replay events
- player statistics

---

# 20. DRAW PILE AND DISCARD

Maintain:

```ts
drawPile
discardPiles
```

When the draw pile becomes empty:

1. gather eligible discarded cards
2. shuffle
3. create new draw pile

Use a server-authoritative Fisher-Yates shuffle.

Online multiplayer randomness must happen on the server.

Never let a client determine card order.

---

# 21. GAME MODES

Implement these modes.

## Solo

```text
Human vs AI
```

Difficulty:

- Easy
- Medium
- Hard
- Expert

## Local

```text
Pass & Play
```

One device.

Hide hands between turns using a transition screen:

```text
Pass device to Rahul
Tap when ready
```

## Private Room

Generate:

- invite URL
- short room code
- optional password
- configurable game options

## Quick Match

Automatically find compatible players.

## Ranked

Support:

- rating
- ranking
- seasons
- win/loss record

Build architecture for it even if ranking ships later.

## Team Game

Support:

- 2v2
- 3v3
- larger legal team sizes
- 3-team configurations

## Tutorial

Interactive scripted tutorial.

## Custom Game

Options:

- number of teams
- target sequences
- turn timer
- AI seats
- public/private
- Jack rules
- animation speed
- custom variants

---

# 22. AI DESIGN

AI must never inspect hidden human cards.

## Easy

Random legal move with basic safeguards.

## Medium

Heuristic evaluation.

Suggested weights:

```text
immediate victory            +100000
prevent opponent victory      +90000
complete own four             +20000
block opponent four           +18000
create double threat          +12000
build open four                +7000
block strong intersection      +6000
create open three              +2500
occupy high-connectivity cell  +1000
use Two-Eyed Jack unnecessarily -1500
waste One-Eyed Jack            -1800
```

Tune experimentally.

## Hard

Add:

- opponent threat modelling
- Jack conservation
- blocking probability
- centrality
- future sequence potential
- double-threat creation
- card scarcity awareness

## Expert

Use:

- Monte Carlo Tree Search
or
- imperfect-information state sampling

AI cannot know hidden hands.

---

# 23. FRONT-END STACK

Preferred stack:

```text
Next.js
React
TypeScript
Tailwind CSS
CSS Modules where appropriate
Framer Motion or equivalent animation library
Zustand or lightweight client state where useful
TanStack Query for server data if appropriate
WebSocket client
```

Use the current stable versions compatible with each other.

Keep business logic outside React components.

---

# 24. BACK-END STACK

Preferred:

```text
Node.js
TypeScript
NestJS or Fastify
WebSockets
PostgreSQL
Redis
Prisma or equivalent ORM
```

Separate:

```text
game engine
transport
persistence
authentication
matchmaking
presence
```

---

# 25. MONOREPO

Recommended:

```text
/apps
  /web
  /server

/packages
  /game-engine
  /shared-types
  /ui
  /config
```

The engine package must contain:

```text
ZERO React
ZERO DOM
ZERO CSS
ZERO database code
ZERO WebSocket code
```

It must be deterministic and pure wherever practical.

---

# 26. GAME ENGINE API

Create functions comparable to:

```ts
createGame(config)

startGame(state)

getLegalActions(state, playerId)

playCard(state, action)

exchangeDeadCard(state, action)

detectSequences(state, move)

isCardDead(state, card)

checkVictory(state)

drawCard(state)

advanceTurn(state)

getPublicState(state, viewerId)
```

Prefer immutable state transformations.

Example:

```ts
const result = applyAction(state, action)
```

returning:

```ts
{
  state: newState,
  events: [...]
}
```

---

# 27. EVENT-DRIVEN GAME MODEL

Persist meaningful events.

Examples:

```text
GAME_CREATED
PLAYER_JOINED
GAME_STARTED
CARD_PLAYED
MARKER_PLACED
MARKER_REMOVED
DEAD_CARD_EXCHANGED
CARD_DRAWN
SEQUENCE_COMPLETED
TURN_ADVANCED
PLAYER_DISCONNECTED
PLAYER_RECONNECTED
GAME_WON
```

This enables:

- replays
- debugging
- analytics
- dispute analysis
- spectator mode

---

# 28. MULTIPLAYER COMMAND MODEL

Never accept direct board mutations.

Bad:

```json
{
  "cell": 45,
  "team": "blue"
}
```

Correct conceptual request:

```ts
{
  type: "PLAY_CARD",
  actionId: "uuid",
  gameId: "game-123",
  cardId: "deck-1-8H",
  targetCellId: "r5c6",
  expectedVersion: 47
}
```

Server validates everything.

Validation:

```text
authenticated player
correct game
game active
correct turn
owns requested card
legal target
correct action type
game version compatible
```

Then:

```text
apply
persist
increment version
broadcast
```

---

# 29. IDEMPOTENCY

Every client action receives:

```text
actionId
```

Persist processed action IDs.

If the same request is retried:

```text
return previous result
```

Do not execute it again.

This is required for mobile reconnect reliability.

---

# 30. RECONNECT BEHAVIOUR

Example:

```text
user plays card
server commits move
network disconnects before response
```

When client reconnects:

```text
request authoritative game state
compare version
retrieve action status
rebuild UI
```

Never infer game state from stale browser memory.

The server is authoritative.

Show:

```text
Connection lost
Reconnecting…
```

Do not immediately eject player.

---

# 31. GAME STATE

Conceptual server-side model:

```ts
interface GameState {
  id: string;

  status:
    | "LOBBY"
    | "ACTIVE"
    | "FINISHED";

  players: Player[];

  teams: Team[];

  board: BoardCellState[];

  drawPile: Card[];

  hands: Record<string, Card[]>;

  discardPiles: Record<string, Card[]>;

  completedSequences: Record<
    string,
    CompletedSequence[]
  >;

  currentSeat: number;

  dealerSeat: number;

  requiredSequences: number;

  deadCardExchangeUsed: boolean;

  turnNumber: number;

  version: number;

  winnerTeamId?: string;

  createdAt: string;
}
```

---

# 32. PUBLIC STATE FILTERING

Create:

```ts
getStateForViewer(gameState, viewerId)
```

Viewer receives:

```text
their hand
board
player names
team assignments
turn
scores
deck count
discard information
timer
connection status
completed sequences
```

Opponent hands become:

```ts
{
  playerId,
  cardCount
}
```

Never actual cards.

---

# 33. PWA REQUIREMENTS

Provide:

```text
manifest.webmanifest
service worker
app icons
splash handling
standalone display mode
offline cache
install prompts
safe-area support
```

Offline-supported modes:

```text
AI
local pass-and-play
tutorial
```

Online-only:

```text
ranked
quick match
remote private rooms
```

Cache:

- application shell
- fonts
- original card artwork
- icons
- sound files
- local AI assets
- rules/tutorial content

---

# 34. RESPONSIVE DESIGN

Design mobile-first but support large screens beautifully.

Breakpoints should not merely shrink the desktop design.

Create genuinely adapted layouts.

---

# 35. DESKTOP GAME LAYOUT

Example:

```text
┌──────────────────────────────────────────────────────────────────┐
│ QUINTARA       Round 1        Blue Turn        00:24     Settings│
├───────────────┬──────────────────────────────────┬───────────────┤
│               │                                  │               │
│ Players       │                                  │ Match         │
│               │                                  │ Information   │
│ Blue          │           10 × 10 BOARD          │               │
│ ● 1 line      │                                  │ Draw: 54      │
│               │                                  │ Turn: 27      │
│ Gold          │                                  │               │
│ ◆ 0 lines     │                                  │ Last Move     │
│               │                                  │ 8♥ → D5       │
├───────────────┴──────────────────────────────────┴───────────────┤
│                       YOUR HAND                                  │
│       3♣     8♥     Q♦     J♠     9♣     A♦                    │
└──────────────────────────────────────────────────────────────────┘
```

The board should remain visually dominant.

---

# 36. TABLET LAYOUT

Use approximately:

```text
top status bar
board
compact opponent strip
hand dock
```

Landscape:

```text
board left
player information right
hand bottom
```

Portrait:

```text
player strip
board
hand
```

---

# 37. MOBILE PORTRAIT LAYOUT

Example:

```text
┌─────────────────────────┐
│ QUINTARA     Blue  0:24 │
├─────────────────────────┤
│ ● You 0       ◆ Alex 0  │
├─────────────────────────┤
│                         │
│                         │
│       GAME BOARD        │
│                         │
│                         │
├─────────────────────────┤
│  3♣   8♥   Q♦   J♠ ... │
└─────────────────────────┘
```

Board should use maximum available width.

Do not require horizontal page scrolling.

---

# 38. MOBILE LANDSCAPE

Prefer:

```text
players      board       hand/action panel
```

or:

```text
board occupying ~70%
side status ~30%
```

depending on screen dimensions.

---

# 39. BOARD CELL DESIGN

Avoid photographic card images.

Use original vector-style miniature card representations.

Desktop cell:

```text
┌─────────────┐
│ 8           │
│             │
│      ♥      │
│             │
│           8 │
└─────────────┘
```

Small mobile:

```text
8♥
```

Use CSS responsiveness to switch detail levels.

---

# 40. ORIGINAL CARD ARTWORK

Create an original digital playing-card design system.

Requirements:

- clean geometric shapes
- crisp vector-like rendering
- original card backs
- large readable ranks
- stylised suit icons
- subtle depth
- excellent small-screen legibility
- no copied casino/card-brand artwork

Use CSS/SVG for cards wherever practical.

Create custom SVG suit symbols or use standard Unicode symbols rendered in an original layout.

Card backs should use a Quintara-specific abstract motif such as:

```text
interlocking five-node lattice
```

or:

```text
geometric Q pattern
```

---

# 41. CARD VISUAL STATES

Cards need:

```text
default
hover
selected
playable
dead
disabled
special
draw-animation
discard-animation
```

Selected card:

- slightly lift
- subtle scale
- illuminated border
- stronger shadow

Example feel:

```css
transform: translateY(-10px) scale(1.035);
```

Do not use excessive bouncing.

---

# 42. BOARD VISUAL STYLE

Target visual direction:

**Premium modern strategy table**

Use:

- dark graphite background
- slightly elevated game surface
- warm off-white card cells
- restrained gold accent
- vibrant team markers
- soft ambient shadows
- subtle glass panels for UI chrome
- crisp typography

Avoid:

- casino aesthetic
- childish board-game graphics
- excessive neon
- excessive gradients
- skeuomorphic wood textures everywhere

---

# 43. DESIGN TOKENS

Example starting palette:

```css
:root {
  --bg-deep: #0d1117;
  --bg-panel: #151b23;
  --surface: #1c2430;

  --card: #f5f1e8;
  --card-muted: #ddd7ca;

  --text-primary: #f7f9fc;
  --text-secondary: #9ba7b6;

  --accent: #d7ad62;

  --team-blue: #3f83f8;
  --team-red: #ef5350;
  --team-green: #4fc18c;
  --team-gold: #e3b341;

  --success: #48bb78;
  --danger: #ef5350;

  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 22px;
}
```

Treat these only as initial direction.

Refine for contrast/accessibility.

---

# 44. TEAM MARKERS

Never identify teams using colour alone.

Each marker must combine:

```text
colour
+
symbol
+
texture/pattern
```

Example:

```text
Blue  = ● concentric circle
Red   = ◆ diamond
Green = ▲ triangle
Gold  = ■ square
```

Markers should appear physically placed above board cells.

Use:

- radial lighting
- subtle shadow
- tiny rim highlight
- controlled depth

---

# 45. MARKER PLACEMENT ANIMATION

When placing a marker:

```text
0 ms
marker appears 20–30 px above board

80 ms
drops toward cell

160 ms
small compression

220 ms
settles

300 ms
soft ring pulse
```

Target total:

```text
250–350 ms
```

Use spring motion carefully.

Do not make turns feel slow.

---

# 46. MARKER REMOVAL ANIMATION

For One-Eyed Jack:

1. target marker pulses
2. marker lifts
3. shrinks/fades
4. board cell becomes available
5. subtle particle/ripple effect

Target:

```text
300–450 ms
```

---

# 47. LINE COMPLETION ANIMATION

When a sequence completes:

1. newly placed marker settles
2. detect sequence
3. draw animated light trace through five cells
4. pulse five participating markers
5. lock/protection visual appears
6. update team sequence counter
7. play restrained success sound

The completed sequence should remain subtly visible.

Do not leave a continuously bright flashing effect.

---

# 48. WIN ANIMATION

Victory should feel premium.

Sequence:

```text
board subtly darkens
winning markers illuminate
completed lines animate
camera/UI scale slightly
victory title appears
confetti/particles optional
stats slide in
```

Display:

```text
VICTORY
Blue completed 2 lines
```

Actions:

```text
Rematch
View Board
Game Summary
Return Home
```

---

# 49. LEGAL MOVE HIGHLIGHTING

When selecting a normal card:

matching legal board cells:

```text
soft outer glow
slight scale
animated border
```

Illegal spaces:

```text
opacity reduction
```

When selecting Two-Eyed Jack:

all legal empty cells should receive subtle indicators.

When selecting One-Eyed Jack:

only removable enemy markers highlight.

Do not allow the user to click illegal actions and then discover the error.

Guide them visually.

---

# 50. HOVER EFFECTS

Desktop board cell hover:

```css
transform: translateY(-2px) scale(1.02);
```

Use subtle shadow.

Only apply interactive hover states to currently valid targets.

No misleading hover effects on invalid cells.

---

# 51. TOUCH INTERACTIONS

Minimum practical touch target:

```text
44 × 44 CSS pixels where possible
```

For dense boards:

- board cell may be smaller
- selection can expand invisible hit area
- avoid adjacent accidental touches
- provide selected-cell confirmation when ambiguity exists

Optional:

```text
tap card
tap target
```

Do not require dragging.

Drag-to-place may exist as optional enhancement.

---

# 52. HAND DESIGN

Cards sit in a bottom dock.

Desktop:

```text
slight overlapping fan or aligned row
```

Mobile:

```text
horizontal scroll
```

Selected card moves upward.

Show special-card explanation on long press or info action.

Dead cards should display:

```text
DEAD
```

without removing readability.

---

# 53. CARD DRAW ANIMATION

When drawing:

```text
deck → card flies toward hand → flips/reveals → settles
```

Keep animation fast:

```text
~300 ms
```

Player should not wait unnecessarily between turns.

---

# 54. DISCARD ANIMATION

Played card:

```text
hand
→ lifts
→ moves toward discard area
→ shrinks
→ disappears/stacks
```

The board action can occur concurrently when appropriate.

---

# 55. TURN TRANSITIONS

Clearly show whose turn it is.

Use:

- avatar ring
- team-colour accent
- text label
- subtle top-panel glow

Example:

```text
YOUR TURN
```

Do not rely on animation alone.

---

# 56. TURN TIMER

Optional timer modes:

```text
Off
15 sec
30 sec
45 sec
60 sec
Custom
```

Timer visual:

```text
circular progress
```

At low time:

- increase visual urgency
- optional subtle audio cue

Do not use irritating constant beeping.

---

# 57. HOME SCREEN

Create premium landing page.

Structure:

```text
QUINTARA logo

Build the line.
Break the plan.
Own the board.

[ Quick Play ]

[ Play with Friends ]
[ Play AI ]
[ Local Game ]

Daily Challenge
Profile
Statistics
How to Play
Settings
```

Use animated board fragments in the background.

---

# 58. MATCHMAKING SCREEN

Show:

```text
Finding opponent…
```

with tasteful animated marker/board motif.

Display:

```text
Estimated rating range
Game rules
Cancel
```

Do not use fake opponent names while searching.

---

# 59. PRIVATE ROOM

Host selects:

```text
Teams
Players
Target lines
Turn timer
AI seats
Spectators
Room privacy
```

Display:

```text
Room Code: K7P4XQ
```

Actions:

```text
Copy Invite
Share
Start Game
```

Show connected players live.

---

# 60. PLAYER AVATARS

Use original abstract avatars initially.

Do not depend on external profile photos.

Support:

```text
avatar
display name
team
connection indicator
rating
```

---

# 61. CONNECTION STATES

Represent:

```text
Online
Reconnecting
Disconnected
Left Game
```

If player disconnects:

```text
Player reconnecting…
```

Allow configurable reconnect grace period.

For ranked matches, establish deterministic timeout rules.

---

# 62. SOUND DESIGN

Add subtle sound effects for:

```text
card selected
marker placed
marker removed
card drawn
sequence completed
turn begins
victory
error
button press
```

Sounds should be original or properly licensed.

Provide:

```text
Master Sound
Music
Effects
Haptics
```

separate settings.

Default volume should be restrained.

---

# 63. HAPTICS

Where supported:

marker place:

```text
light vibration
```

sequence:

```text
medium success vibration
```

invalid action:

```text
short warning vibration
```

Respect user settings and platform capabilities.

---

# 64. ACCESSIBILITY

Required:

- keyboard navigation
- visible focus states
- ARIA labels
- semantic buttons
- screen-reader descriptions
- reduced-motion preference
- high contrast
- colour-independent team markers
- scalable text
- mobile zoom compatibility where reasonable

Example ARIA:

```text
Eight of Hearts. Playable.
```

Board:

```text
Row 4 column 6.
Eight of Hearts.
Occupied by Blue.
Protected sequence marker.
```

---

# 65. REDUCED MOTION

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

Replace movement-heavy animations with:

```text
fade
instant state changes
short opacity transitions
```

Game functionality must not depend on animation.

---

# 66. HOW-TO-PLAY SCREEN

Build interactive rulebook.

Sections:

```text
Goal
Board
Cards
Taking a Turn
Wild Corners
Two-Eyed Jacks
One-Eyed Jacks
Dead Cards
Completed Lines
Protected Markers
Overlapping Lines
Team Play
Winning
```

Use animated examples instead of walls of text.

---

# 67. TUTORIAL

Interactive tutorial scenario.

### Lesson 1

Play a normal card.

### Lesson 2

Choose between duplicate board positions.

### Lesson 3

Complete a line.

### Lesson 4

Use wild corner.

### Lesson 5

Use Two-Eyed Jack.

### Lesson 6

Use One-Eyed Jack.

### Lesson 7

Understand protected line.

### Lesson 8

Exchange dead card.

### Lesson 9

Block opponent.

### Lesson 10

Create double threat.

---

# 68. GAME HISTORY

Store:

```text
date
opponents
teams
winner
duration
moves
rating change
game mode
```

Allow game replay.

---

# 69. REPLAY SYSTEM

Replay uses stored game events.

Controls:

```text
Start
Previous
Play/Pause
Next
Speed
Jump to Move
```

Board should reconstruct deterministically.

---

# 70. STATISTICS

Profile statistics:

```text
Games played
Wins
Losses
Win rate
Longest streak
Sequences completed
Sequences blocked
Jacks played
Average turns
Average game duration
Favourite mode
Rank
```

Avoid meaningless vanity analytics.

---

# 71. RANKING

Architecture should support an MMR system.

Potential initial implementation:

```text
Glicko-2
```

or a carefully implemented Elo system.

Do not implement ranking until match integrity and reconnect handling are reliable.

---

# 72. DATABASE ENTITIES

At minimum:

```text
User
Profile
Game
GamePlayer
GameTeam
GameEvent
GameSnapshot
Rating
Friend
MatchmakingTicket
Room
Achievement
```

Index fields appropriately.

---

# 73. AUTHENTICATION

Support:

```text
Guest
Email
Google
Apple
```

Guest can start immediately.

Allow guest account upgrade later without losing stats where feasible.

---

# 74. SECURITY

Server validates every action.

Protect against:

```text
turn manipulation
fake card ownership
illegal targets
duplicate actions
game version races
room enumeration
WebSocket spoofing
hidden hand exposure
rate abuse
replay attacks
```

Use:

```text
authentication
authorisation
input validation
rate limiting
CSRF protections where relevant
secure cookies/tokens
```

---

# 75. ANTI-CHEAT

Never expose:

```text
opponent cards
future deck
server RNG
private team information
```

Log suspicious invalid action rates.

Do not depend on obfuscated JavaScript for security.

---

# 76. TESTING

Use:

```text
Vitest/Jest
Playwright
integration tests
WebSocket tests
property-based tests where useful
```

The game engine should have very high coverage.

---

# 77. MANDATORY ENGINE TESTS

Test:

```text
board has 100 cells
four wild corners
96 normal positions
48 unique normal identities
each normal card identity appears exactly twice
zero Jacks on board
deck has 104 cards
8 Jacks
96 regular cards
```

---

# 78. SEQUENCE TESTS

Test:

```text
horizontal five
vertical five
diagonal down-right
diagonal up-right
four markers + corner
four markers without corner = invalid
crossing lines
nine-marker double line
duplicate line detection
overlap rule
wild corner participation
```

---

# 79. JACK TESTS

Two-Eyed Jack:

```text
can place on any legal empty normal cell
cannot replace occupied marker
cannot target wild corner
```

One-Eyed Jack:

```text
can remove eligible enemy marker
cannot remove own marker
cannot remove protected marker
cannot target empty cell
cannot remove wild corner
```

---

# 80. DEAD CARD TESTS

Test:

```text
both matching locations occupied → dead
one matching location open → not dead
one exchange allowed
second exchange rejected
card becomes playable if location is freed
```

---

# 81. MULTIPLAYER TESTS

Test:

```text
wrong player's turn rejected
card not owned rejected
duplicate action does not repeat
reconnect restores correct state
opponent hand not leaked
teammate hand not leaked
stale game version handled
simultaneous actions deterministic
```

---

# 82. PWA TESTS

Verify:

```text
installable
offline shell loads
AI mode works offline
local mode works offline
online mode detects disconnection
reconnect restores match
orientation changes preserve game
safe-area works on iPhone
```

---

# 83. PLAYWRIGHT END-TO-END TEST

Automate at least one complete game.

Example:

```text
create game
join second player
deal
make series of deterministic moves
use Jack
complete line
complete victory requirement
verify winner
verify game persisted
open replay
verify final state
```

---

# 84. PERFORMANCE

Targets:

- smooth 60 FPS interactions on modern phones where practical
- avoid unnecessary full-board React rerenders
- lazy-load non-game screens
- optimise SVGs
- compress sounds
- cache static assets
- minimise initial JavaScript
- preload critical game assets

Do not sacrifice correctness for micro-optimisation.

---

# 85. BOARD RENDERING

Prefer:

```text
CSS Grid
```

rather than Canvas initially.

Reasons:

- accessibility
- responsiveness
- DOM interaction
- easier animations
- easier testing

Use Canvas/WebGL only if later visual requirements justify it.

---

# 86. IMAGE ELEMENTS

Use visual assets extensively but purposefully.

Create original:

- logo
- card backs
- tutorial illustrations
- avatar set
- background board motifs
- achievement badges
- onboarding illustrations
- empty-state artwork
- victory decoration
- PWA icons

Prefer:

```text
SVG
WebP
AVIF
```

depending on asset type.

Do not use generic low-quality stock photos.

---

# 87. BACKGROUND ART

Home screen may contain a large atmospheric board composition.

Example concept:

```text
dark tabletop
soft depth-of-field
floating original playing cards
glowing team markers
faint five-marker sequence line
```

Keep foreground UI readable.

---

# 88. MOTION SYSTEM

Define motion tokens.

Example:

```css
--motion-fast: 120ms;
--motion-medium: 220ms;
--motion-slow: 420ms;

--ease-standard: cubic-bezier(.2,.8,.2,1);
--ease-enter: cubic-bezier(.16,1,.3,1);
--ease-exit: cubic-bezier(.7,0,.84,0);
```

Use consistent motion throughout the app.

---

# 89. MICROINTERACTIONS

Include:

- card hover
- card lift
- button depress
- board cell glow
- marker drop
- Jack targeting pulse
- sequence trace
- turn indicator
- draw-pile compression
- score count transition
- reconnect spinner
- room-code copy confirmation

Microinteractions should communicate game state, not exist solely as decoration.

---

# 90. CSS QUALITY

Use:

- CSS custom properties
- scalable spacing system
- reusable component primitives
- responsive clamp()
- container queries when useful
- logical properties
- safe-area env variables
- reduced-motion handling
- accessible focus-visible states

Avoid:

```text
random one-off pixel values everywhere
!important abuse
inline styles for complex visual logic
```

---

# 91. COMPONENT SYSTEM

Potential components:

```text
GameBoard
BoardCell
TeamMarker
PlayingCard
PlayerHand
PlayerPanel
TurnIndicator
SequenceCounter
DrawPile
DiscardPile
GameTimer
MoveHistory
RoomLobby
MatchmakingPanel
VictoryModal
ReconnectOverlay
RulesDrawer
GameSettings
Avatar
Tooltip
Toast
ConfirmDialog
```

Components must remain focused.

---

# 92. UI STATES

Every network UI component needs:

```text
loading
success
empty
error
offline
reconnecting
disabled
```

Do not leave blank screens.

---

# 93. TOASTS

Examples:

```text
Room code copied
Opponent reconnected
Dead card exchanged
Invalid move
Connection restored
```

Avoid excessive toast spam during normal turns.

---

# 94. ERROR HANDLING

User-facing errors must be human-readable.

Bad:

```text
ERR_ILLEGAL_TARGET_4021
```

Good:

```text
That marker belongs to a completed line and cannot be removed.
```

Still log technical error codes internally.

---

# 95. ANALYTICS

Capture product events without exposing private game data unnecessarily.

Examples:

```text
tutorial_started
tutorial_completed
match_started
match_completed
match_abandoned
reconnect_occurred
ai_difficulty_selected
pwa_installed
private_room_created
```

Game event logs are separate from product analytics.

---

# 96. OBSERVABILITY

Use:

```text
structured logs
error tracking
server metrics
WebSocket connection metrics
match duration metrics
reconnect rate
invalid-action rate
```

Instrument critical game actions.

---

# 97. DEPLOYMENT

Use production-grade deployment.

Example:

```text
Web:
Vercel

Backend:
Render / Fly.io / Railway / AWS / GCP

Database:
managed PostgreSQL

Redis:
managed Redis
```

Architecture should remain provider-independent.

---

# 98. ENVIRONMENTS

Provide:

```text
development
test
staging
production
```

Never point local development at production database.

---

# 99. SEED DATA

Provide development seed commands creating:

```text
test users
sample rooms
sample completed games
specific test board states
Jack scenarios
dead-card scenarios
near-win scenarios
```

This makes UI development faster.

---

# 100. DEBUG GAME MODE

Development only.

Allow:

```text
set hand
set current player
place markers
force deck
jump turn
create near-win board
simulate reconnect
```

Never expose debug tooling in production.

---

# 101. DEVELOPMENT ORDER

Build in this exact sequence.

## Phase 1

Game rules specification.

## Phase 2

Pure TypeScript game engine.

## Phase 3

Comprehensive engine tests.

## Phase 4

Board/card design system.

## Phase 5

Local single-device gameplay.

## Phase 6

AI.

## Phase 7

Backend/game server.

## Phase 8

WebSocket multiplayer.

## Phase 9

Private rooms.

## Phase 10

Reconnect/idempotency.

## Phase 11

Authentication/profiles.

## Phase 12

PWA/offline.

## Phase 13

Tutorial.

## Phase 14

Statistics/replays.

## Phase 15

Matchmaking/ranking.

## Phase 16

Polish/accessibility/performance.

Do not begin complex multiplayer until the deterministic engine is proven.

---

# 102. MVP DEFINITION

MVP must include:

```text
responsive board
normal cards
special Jacks
wild corners
dead cards
line detection
sequence protection
win detection
AI game
local game
private 1v1 online room
reconnect
PWA install
rules/tutorial
mobile support
desktop support
animations
sound toggle
```

---

# 103. VERSION 1.0 DEFINITION

Add:

```text
accounts
profiles
match history
team multiplayer
public matchmaking
ranking
replays
statistics
advanced AI
friend invites
achievements
visual themes
```

---

# 104. VISUAL QUALITY BAR

Do not consider this complete if the interface looks like:

```text
HTML grid
plain buttons
default Tailwind cards
prototype admin dashboard
```

The game must look intentionally designed.

It should immediately communicate:

```text
premium
strategic
modern
clean
tactile
responsive
```

---

# 105. UX QUALITY BAR

A new player should understand how to make a basic move within approximately one minute.

The interface should answer visually:

```text
Whose turn is it?
What cards do I have?
Which moves are legal?
Which team am I on?
How many lines do I need?
Which lines are already protected?
What did my opponent just do?
```

without requiring constant menu navigation.

---

# 106. GAMEPLAY QUALITY BAR

Rules must be deterministic.

Given:

```text
same initial state
+
same sequence of actions
```

the engine must always produce:

```text
identical final state
```

except where explicitly driven by seeded randomness.

---

# 107. CODE QUALITY BAR

Require:

```text
strict TypeScript
no broad any usage
schema validation
small modules
clear domain types
pure engine functions
unit tests
integration tests
E2E tests
linting
formatting
documented environment setup
```

Do not create one giant `Game.tsx` component.

---

# 108. README

Provide professional documentation.

Include:

```text
project overview
architecture diagram
setup
environment variables
database setup
run commands
testing
game engine explanation
WebSocket architecture
PWA architecture
deployment
known limitations
```

---

# 109. ARCHITECTURE DIAGRAM

Document:

```text
                ┌──────────────────┐
                │   Next.js PWA    │
                │                  │
                │ Board / UI / UX  │
                └────────┬─────────┘
                         │
                   WebSocket/HTTPS
                         │
                ┌────────▼─────────┐
                │ Authoritative    │
                │ Game Server      │
                └───────┬──────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
     ┌────────▼────────┐   ┌──────▼──────┐
     │ Quintara Engine │   │    Redis    │
     │ Pure TypeScript │   │ live state  │
     └─────────────────┘   └──────┬──────┘
                                  │
                           ┌──────▼───────┐
                           │ PostgreSQL   │
                           │ users/games  │
                           └──────────────┘
```

---

# 110. FINAL ACCEPTANCE CRITERIA

Do not call the project finished until all of the following are true.

### Rules

- legal moves correct
- Jacks correct
- dead cards correct
- corners correct
- sequence overlap correct
- protected markers correct
- victory correct

### Multiplayer

- authoritative server
- no hidden-hand leakage
- reconnect works
- duplicate requests safe
- stale clients recover

### UI

- desktop polished
- tablet polished
- mobile portrait polished
- mobile landscape polished
- legal moves obvious
- cards readable
- animations smooth

### PWA

- installable
- standalone mode
- offline AI/local
- reconnect online games

### Accessibility

- keyboard usable
- screen-reader labels
- reduced motion
- sufficient contrast
- teams distinguishable without colour

### Quality

- automated tests passing
- E2E game passing
- no major console errors
- no obvious layout overflow
- no broken orientation handling

---

# 111. IMPLEMENTATION INSTRUCTION TO THE CODING AGENT

Do not merely generate a design document.

Actually implement the application.

Proceed autonomously through the project.

When a design choice is ambiguous, choose the solution that maximises:

```text
correctness
maintainability
gameplay clarity
mobile usability
visual quality
performance
```

Do not simplify core rules simply to save development time.

Do not produce placeholder UI when an actual implementation is practical.

Create reusable production-quality code.

After each major stage:

1. run tests
2. run lint/type-check
3. inspect responsive behaviour
4. fix defects
5. continue

Before declaring completion, perform a final staff-engineer review covering:

```text
architecture
game rules
security
multiplayer correctness
responsive UI
accessibility
performance
PWA behaviour
test coverage
code quality
```

Fix discovered defects rather than merely listing them.

The intended end product is a polished, production-quality digital strategy game called **Quintara**, not a proof of concept.