# Puzzle Box Website

A strange interactive puzzle-box website built with React, Vite, TypeScript, and React Router.

This is a mysterious digital place somewhere between a 90s terminal, an escape room, an ARG, a dream, and a haunted operating system. It includes sixteen interconnected rooms, hidden terminal commands, localStorage-backed discovery state, and page-specific interactions.

The visual system uses lightweight CSS-built artifact icons for room labels, desktop objects, archive drawers, books, and dream symbols. K.I.M. uses a CSS-built 3D wireframe head with delayed gaze tracking, idle study behavior, and subtle ambient field effects. No external 3D icon package or paid asset source is required.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## GitHub Pages

This project includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.
Pushes to `main` run lint, build the Vite app, and deploy `dist/` to GitHub Pages.

In the repository settings, set Pages source to **GitHub Actions**. The deployed site will use the `/enforge-designs/` base path.

## Routes

- `/terminal`
- `/corridor`
- `/kim`
- `/desktop`
- `/library`
- `/observatory`
- `/elevator`
- `/archive`
- `/aquarium`
- `/radio`
- `/train-station`
- `/gallery`
- `/machine`
- `/mirror`
- `/waiting-room`
- `/dream`

`/` redirects to `/terminal`.

## Notes

Discovery state is stored in `localStorage` under `puzzle-box-discovery-v1`. The terminal supports visible and hidden commands, and several rooms alter other rooms through the shared discovery system.

## Assistant Navigation API

The app exposes a browser-side API at `window.PuzzleBoxAPI` for AI assistants, browser automation, or debugging tools. It does not require a backend.

Examples:

```js
window.PuzzleBoxAPI.go("library")
window.PuzzleBoxAPI.go("/radio")
window.PuzzleBoxAPI.command("kim")
window.PuzzleBoxAPI.discoverCommand("observer")
window.PuzzleBoxAPI.solveDoor("combination")
window.PuzzleBoxAPI.setMachineSetting("waterValve", true)
window.PuzzleBoxAPI.getStatus()
window.PuzzleBoxAPI.reset()
```

Some browser automation sandboxes block custom properties on `window`. For those cases, the app also supports a DOM event API:

```js
document.dispatchEvent(new CustomEvent("puzzlebox:api", {
  detail: { id: "move-1", action: "go", target: "library" }
}))

document.addEventListener("puzzlebox:api-result", (event) => {
  console.log(event.detail)
})
```

DOM actions:

- `{ action: "go", target: "library" }`
- `{ action: "command", command: "kim" }`
- `{ action: "discoverCommand", command: "observer" }`
- `{ action: "solveDoor", door: "combination" }`
- `{ action: "setMachineSetting", key: "waterValve", value: true }`
- `{ action: "status" }`
- `{ action: "reset" }`

The current API state is also mirrored in the DOM:

```js
document.querySelector("#puzzlebox-api-state")?.textContent
```

Available helpers:

- `rooms`: list of supported room names and aliases.
- `currentPath()`: returns the active route path.
- `currentRoom()`: returns the current room label.
- `getState()`: returns a copy of discovery/localStorage state.
- `getStatus()`: returns current path, current room, room list, and discovery state.
- `go(roomOrPath)`: navigates to a room name, alias, or route path.
- `command(command)`: runs terminal-style navigation commands such as `kim`, `desktop`, `library`, `mirror`, `dream`, `wait`, and `explore`.
- `discoverCommand(command)`: marks a command discovered.
- `solveDoor(door)`: marks a door solved.
- `setMachineSetting(key, value)`: updates a machine setting.
- `reset()`: resets discovery state.

The API dispatches browser events:

- `puzzlebox:navigation`
- `puzzlebox:command`
- `puzzlebox:state`

Example event listener:

```js
window.PuzzleBoxAPI.on("puzzlebox:navigation", (event) => {
  console.log(event.detail)
})
```
