# Black Rabbit

A procedurally generated murder mystery game with noir detective aesthetics, inspired by the *Ace Attorney* franchise's interrogation mechanics and puzzle-driven investigations.

**[Play Now](https://tommy2118.github.io/black_rabbit/)**

## Overview

Each game generates a unique case with:
- A randomly selected victim and killer from 6 suspects
- Complex relationship webs between characters
- Unique motives, weapons, and alibis
- Multiple locations to investigate
- Evidence and testimonies to uncover contradictions
- A match-3 mini-game for earning search tokens

Cases are fully seeded for reproducibility—share a case by passing the seed in the URL.

## Features

### Procedural Case Generation
- **Seeded randomization** — Every case is reproducible via URL seed parameter
- **Suspect generation** — 6 suspects with unique names, occupations, ages, and personalities
- **Relationship graph** — Complex webs (spouses, rivals, lovers, employees, etc.)
- **Clue generation** — Evidence pointing to the killer plus red herrings
- **Alibi generation** — Time-bound alibis with witnesses (killer's alibi is false)
- **Difficulty modes** — Easy, medium, hard (affects clue counts and red herrings)

### Investigation Phase
- **Location exploration** — Visit the crime scene and 10+ manor locations
- **Tab-based interface** — Browse suspects, evidence, and locations
- **Search mechanic** — Earn tokens via mini-game, spend to discover clues instantly
- **Evidence collection** — Clues marked as critical, normal, or minor significance

### Interrogation System
- **Statement-based testimony** — Multiple statements per suspect
- **Pressing mechanics** — Repeat questioning to make suspects reveal more
- **Evidence presentation** — Present clues to catch contradictions
- **Contradiction detection** — Automatic when evidence refutes a statement
- **Dramatic UI** — Flash effects for "OBJECTION!", "HOLD IT!", "CONTRADICTION FOUND!"

### Panel Puzzle Mini-Game
- **Match-3 mechanics** — Swap adjacent panels to create matches
- **6 panel types** — Magnifier, fingerprint, document, witness, key, flashlight
- **Bonus tiles** — Line, cross, and blast effects
- **Combo scoring** — Chain matches increase multiplier
- **Hint system** — Shows valid moves after 5 seconds of inactivity

### Audio
- **Fully synthesized** — No external audio files; all sounds generated via Web Audio API
- **Procedural SFX** — Objection shouts, contradiction chimes, typewriter clicks
- **Ambient music** — Investigation, interrogation, tension, victory, and defeat tracks

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript 5.9 |
| Build | Vite 7.2 |
| Audio | Howler.js + Web Audio API |
| RNG | seedrandom |
| Testing | Vitest |
| Deployment | GitHub Pages + Actions |

## Project Structure

```
src/
├── main.ts                    # Entry point, game loop, UI rendering
├── index.html                 # HTML shell
│
├── domain/                    # Core domain models (immutable)
│   ├── types.ts               # Branded ID types, enums
│   ├── case.ts                # Case interface & helpers
│   ├── suspect.ts             # Suspect model with personality traits
│   ├── clue.ts                # Evidence model with significance levels
│   ├── location.ts            # Location model
│   ├── relationship.ts        # Suspect relationships
│   └── alibi.ts               # Alibi model
│
├── game/                      # Game state & logic
│   ├── store.ts               # Redux-like store pattern
│   ├── game_state.ts          # GameState interface & phases
│   ├── game_reducer.ts        # Pure reducer for all actions
│   ├── statements.ts          # Testimony & contradiction logic
│   ├── panel_puzzle.ts        # Mini-game state
│   ├── match3.ts              # Match-3 logic
│   └── persistence.ts         # LocalStorage save/load
│
├── generation/                # Procedural generation
│   ├── case_generator.ts      # Main orchestrator
│   ├── suspect_generator.ts   # Generate suspects
│   ├── relationship_graph.ts  # Generate connections
│   ├── clue_generator.ts      # Generate evidence
│   ├── alibi_generator.ts     # Generate alibis
│   └── random.ts              # Seeded RNG utilities
│
├── audio/
│   └── audio_manager.ts       # Web Audio synthesis
│
├── data/                      # Static data pools
│   ├── names.ts               # Noir-era names, occupations
│   └── locations.ts           # Manor location templates
│
└── styles/
    ├── main.css               # Main stylesheet
    └── noir-theme.css         # Color scheme & variables

tests/                         # Test suite mirroring src/
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Installation

```bash
git clone https://github.com/tommy2118/black_rabbit.git
cd black_rabbit
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build

```bash
# Standard build
npm run build

# Single-file build (for distribution)
npm run build:single
```

### Testing

```bash
# Watch mode
npm test

# Single run
npm run test:run
```

## URL Parameters

| Parameter | Description |
|-----------|-------------|
| `seed` | Play a specific case (e.g., `?seed=my-custom-seed`) |

If no seed is provided, one is generated and the URL is updated. Saved progress auto-loads when returning to the same seed.

## Game Flow

```
┌─────────────────────────────┐
│  Intro Screen               │
│  Newspaper with victim info │
└──────────────┬──────────────┘
               │ "Begin Investigation"
               ↓
┌─────────────────────────────┐
│  Investigation Phase        │
│  ├─ Browse Suspects         │
│  ├─ Examine Locations       │
│  ├─ Collect Evidence        │
│  ├─ Interrogate Suspects    │
│  └─ Play Mini-Game          │
└──────────────┬──────────────┘
               │ "Make Accusation"
               ↓
┌─────────────────────────────┐
│  Accusation Phase           │
│  ├─ Select Suspect          │
│  ├─ Choose Motive           │
│  └─ Link Evidence           │
└──────────────┬──────────────┘
               │ "Confirm"
               ↓
┌─────────────────────────────┐
│  Resolution                 │
│  Win/Lose + Statistics      │
└─────────────────────────────┘
```

## Architecture Highlights

- **Immutable domain objects** — All models frozen with `Object.freeze()`
- **Branded types** — `SuspectId`, `ClueId`, `LocationId` are distinct at compile-time
- **Pure reducer pattern** — Side-effect-free state management
- **Procedural audio** — All sounds synthesized at runtime via oscillators
- **Seed-based reproducibility** — Perfect for debugging and sharing cases

## License

MIT
