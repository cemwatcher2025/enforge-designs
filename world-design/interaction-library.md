# ROAM Interaction Grammar

This file converts `ROAM_Interaction_Library.pdf` into a reusable design and implementation grammar for Enforge Command Center, ROAM, Unreal Engine, and future projects.

## Purpose

The library is not an asset pack. It is a shared vocabulary for how players understand and change a world.

Use it when designing:

- Persistent World Engine objects in the dashboard
- ROAM gameplay interactions
- Unreal Engine Blueprint components, interfaces, Gameplay Tags, and Data Tables
- future worldbuilding tools, editors, journals, quests, or assistant-authored scenes

## Canonical Files

- `world-design/interaction-library.json`: canonical structured grammar
- `world-design/interaction-library.csv`: flat Unreal/DataTable-friendly export
- `world-design/interaction-library.md`: human-facing design guide

## Design Rule

Every meaningful interaction should answer four questions:

1. What does the player think they are doing?
2. What does the world show in response?
3. What does the player learn or change?
4. What can this interaction chain into next?

Decor is still important. Static objects give context, scale, and mood. Interactive objects should feel chosen, not randomly labeled.

## Categories

### Discovery

Discovery verbs teach the player what something is.

Core verbs:

- `examine`
- `inspect`
- `discover`
- `identify`
- `catalog`
- `read`
- `listen`
- `scan`
- `trace`
- `decode`
- `investigate`
- `locate`
- `research`
- `track`

Good for clues, notes, signs, damaged systems, routes, signal devices, environmental storytelling, and anything that reveals a hidden relationship.

### Repair And Restoration

Repair verbs turn broken things into working things.

Core verbs:

- `diagnose`
- `repair`
- `restore`
- `rebuild`
- `replace_component`
- `clean`
- `lubricate`
- `reconnect`
- `calibrate`
- `upgrade`
- `test`

Good for machines, gates, pumps, power systems, tools, settlements, vehicles, routes, and environmental restoration loops.

### Environment

Environmental verbs directly manipulate the world.

Core verbs:

- `activate`
- `deactivate`
- `open`
- `close`
- `unlock`
- `rotate`
- `raise_lower`
- `redirect`
- `drain`
- `fill`
- `illuminate`
- `observe`
- `operate`
- `navigate`

Good for doors, valves, bridges, lights, water systems, elevators, consoles, terrain access, and traversal moments.

### Tool-Based

Tool verbs cover inventory, resources, crafting, construction, and physical work.

Core verbs:

- `collect`
- `harvest`
- `mine`
- `cut`
- `dig`
- `pry`
- `lift`
- `carry`
- `place`
- `combine`
- `craft`
- `plant`
- `build`

Good for resource loops, field work, repair parts, construction, object placement, and player preparation.

### Social

Social verbs handle people, companions, communities, teaching, and cooperation.

Core verbs:

- `talk`
- `ask`
- `teach`
- `learn`
- `trade`
- `deliver`
- `assist`
- `recruit`
- `collaborate`
- `share_knowledge`
- `interpret`
- `encourage`
- `celebrate`

Good for NPCs, KIM, settlements, ministry-like service loops, group projects, quest handoffs, and emotional payoff.

## Recommended Chains

Use chains to make interactions feel intentional.

- `examine -> diagnose -> repair -> activate`
- `read -> decode -> unlock -> open`
- `listen -> locate -> trace -> restore`
- `scan -> trace -> reconnect -> restore`
- `collect -> combine -> craft -> repair`
- `clean -> inspect -> identify -> catalog`
- `ask -> learn -> craft -> build`
- `teach -> assist -> collaborate -> restore`
- `plant -> observe -> harvest -> trade`
- `repair -> test -> operate -> upgrade`

## Current World Engine Use

The existing World Engine still supports a legacy primary field:

```json
{
  "interactionType": "examine"
}
```

Future-ready objects should also be able to include:

```json
{
  "interactionType": "diagnose",
  "interactions": ["examine", "diagnose", "repair", "activate"],
  "state": "available",
  "requirements": ["found:gate_latch"],
  "unlocks": ["route:workshop_bay"],
  "journalEntry": "The old latch is intact, but the hinge is dry and misaligned.",
  "tags": ["interaction.repair.diagnose", "zone.entry_yard"]
}
```

## Unreal Engine Mapping

Recommended Unreal structure:

- `E_ROAMInteractionType`: enum matching the `id` values in the JSON.
- `F_ROAMInteractionDefinition`: DataTable row struct.
- `BPI_Interactable`: base interface with `CanInteract`, `GetInteractionOptions`, and `Interact`.
- `UROAMInteractionComponent`: component that stores available interactions, requirements, unlocks, prompts, and feedback events.
- Gameplay Tags from `gameplayTags` in the JSON.

Suggested `F_ROAMInteractionDefinition` fields:

```cpp
FName InteractionId;
FText Label;
FGameplayTag CategoryTag;
FText PlayerIntent;
FText DefaultPrompt;
TArray<FName> ChainsInto;
FGameplayTagContainer GameplayTags;
FName BlueprintEventName;
```

## Signal Station One Remap

The current web level can use this grammar more deeply:

- Arrival Gate: `inspect -> activate -> open`
- Gate Latch: `examine -> diagnose -> lubricate -> repair`
- Receiving Ledger: `read -> decode -> catalog`
- Old Yard Radio: `listen -> calibrate -> activate -> trace`
- Workshop Door: `unlock -> open`
- Bench Vice: `inspect -> repair -> upgrade`
- Old Drill Press: `diagnose -> repair -> test -> operate`
- Signal Laptop: `read -> scan -> trace`
- Cassette Recorder: `collect -> listen -> catalog`
- Overlook Gate: `unlock -> activate -> open`
- Signal Console: `examine -> operate -> redirect`
- Beacon Lamp: `illuminate -> activate -> observe`

## Future Project Rule

When starting a new level, tool, or game system, choose:

- one discovery verb
- one world-change verb
- one payoff verb

Example:

`listen -> trace -> restore`

That chain is enough to create a coherent mini-level.
