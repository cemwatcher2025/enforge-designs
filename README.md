# Puzzle Box Website

A strange interactive puzzle-box website built with React, Vite, TypeScript, and React Router.

This is a mysterious digital place somewhere between a 90s terminal, an escape room, an ARG, a dream, and a haunted operating system. It includes sixteen interconnected rooms, hidden terminal commands, localStorage-backed discovery state, and page-specific interactions.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

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
