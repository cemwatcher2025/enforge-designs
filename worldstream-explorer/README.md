# Worldstream Explorer

A standalone first-person procedural adventure rendered with Three.js.

## The expedition

- Five streamed realms with biome-specific terrain, lighting, atmosphere, wildlife, and weather
- Physically based terrain materials, generated albedo/normal textures, ACES tone mapping, soft shadows, animated physical water, and dynamic lantern lighting
- Instanced biome detail including grass, stones, ice fragments, and volcanic debris
- Rivers, lakes, frozen water, lava channels, mountain routes, canyons, caverns, and tunnel gates
- Fifteen bespoke archaeological, biological, celestial, and treasure landmarks
- Fifteen interactive world sites including bridges, cities, temples, lodges, fortresses, stations, and cathedrals
- Seamless cave networks inside the mountains of every surface biome
- Chunked signed-distance terrain around cave networks, with seamless walk-in mouths, overhangs, curved tunnels, chambers, ceilings, walls, and volumetric collision
- Runtime `worldstreamTerrain.carveSphere()` / `addSphere()` hooks for future digging, construction, collapses, and terrain-changing puzzles
- Lore progression, stamina, persistent discoveries, environmental activities, and a field journal
- Procedural spatial ambience, biome music, footsteps, scanner pings, discovery chords, and puzzle feedback
- Observation puzzles at every world activity, animated awakened sites, and five enterable pocket interiors
- Field scanner, expedition lantern, keyboard/mouse and controller support
- Three save slots, 30-second autosave, pause/settings menu, sensitivity/audio/view-distance controls
- A final Worldheart location unlocked by completing all 30 mysteries

## Run

Install dependencies, serve this directory, then open it in a browser.

```powershell
npm install
npx vite --host 127.0.0.1
```

## Controls

- WASD: move
- Mouse: look
- Shift: sprint
- Space: jump
- E: interact with world activities and tunnel gates
- Q: toggle the field scanner
- F: toggle the expedition lantern
- J: open the field journal
- Escape: pause and open settings
- 1–5: travel between Verdant Reach, Sungold Dunes, Glass Tundra, Ember Caldera, and the Hollow Below
- Escape: release the cursor

Terrain chunks are generated and retained based on proximity and viewing direction.
