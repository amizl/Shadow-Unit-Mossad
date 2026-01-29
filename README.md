# Shadow-Unit-Mossad

## Overview
Shadow Unit: Mossad is a single-player, top-down tactical stealth game inspired by Commandos-style real-time tactics. Players command a small squad of elite operatives (2–6 units) to infiltrate hostile environments, achieve mission objectives, and escape without being detected. Stealth, timing, and coordination are essential, while direct combat is risky and typically a last resort.

## Core Pillars
- **Stealth-first gameplay**: Vision cones, sound propagation, and line-of-sight define the tactical landscape.
- **Squad-level coordination**: Multi-unit control enables synchronized actions and multi-pronged solutions.
- **Multiple solutions**: Missions support different approaches through alternate routes, tool usage, and pacing.
- **Low-friction progression**: Unlocks expand tactical options without grind.

## Player Units
Each unit has a distinct profile and a unique tactical skill.
- **Attributes**
  - Movement speed
  - Noise level
  - Vision range
  - Unique tactical skill
- **Example skills**
  - Silent takedown
  - Smoke deployment
  - Door breaching
  - Hacking cameras/alarms

## Enemy Awareness
- **Vision cones**: Clearly visible and directional; detection triggers escalation.
- **Sound detection**: Footsteps, actions, and environmental interactions create noise.
- **Alert states**
  - Calm patrol
  - Investigate disturbances
  - Alarm response (reinforcements or mission failure risk)

## Mission Structure
- **Self-contained missions** with defined entry points, objectives, and exit zones.
- **Interactive environments**: Doors, alarms, cameras, hiding spots, and environmental props.
- **Patrol logic**: Predictable routes with room for dynamic response to player actions.

## Controls & Tactical Planning
- **Mouse-driven controls** with optional keyboard shortcuts.
- **Pause/slow time** for tactical planning and precise coordination.
- **Group selection** and queued commands for synchronized actions.

## Systems Philosophy
- **Visual-agnostic systems**: Logic is decoupled from art so placeholder UI/graphics can be replaced without system changes.
- **Deterministic simulation**: Enemy detection, sound, and vision should be consistent and readable.
- **Clarity over complexity**: Feedback systems should clearly convey detection risk and tactical state.

## Graphics & UI
- **Top-down/isometric camera** with readability-focused visuals.
- **Placeholder-based assets** with a clean, functional UI.

## Progression
- Unlock additional units or abilities between missions.
- Emphasis on meaningful tactical options rather than grind.

## Inspirations
- Commandos
- Desperados
- Shadow Tactics

## Playable Prototype
This repository includes a lightweight web prototype that demonstrates stealth, squad control, vision cones, sound detection, alarms, and simple abilities.

### Run locally
1. Start a local web server in the repo root:
   ```bash
   python -m http.server 8000
   ```
2. Open `http://localhost:8000` in your browser.

### Prototype controls
- Left click: Select unit
- Shift + left click: Multi-select
- Right click: Move / interact with doors
- Shift + right click: Queue waypoint
- Space: Pause
- Hold Shift: Slow time
- 1 / 2 / 3: Trigger unit abilities
