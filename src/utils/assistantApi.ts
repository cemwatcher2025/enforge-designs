import { routes } from './routes'
import type { DiscoveryState, MachineSettings } from './discoveryContext'

export type AssistantApiResult = {
  ok: boolean
  message: string
  path?: string
  room?: string
}

export type AssistantApiSnapshot = {
  currentPath: string
  currentRoom: string
  rooms: string[]
  state: DiscoveryState
}

export type AssistantApi = {
  version: string
  rooms: string[]
  currentPath: () => string
  currentRoom: () => string
  getState: () => DiscoveryState
  getStatus: () => AssistantApiSnapshot
  go: (roomOrPath: string) => AssistantApiResult
  command: (command: string) => AssistantApiResult
  discoverCommand: (command: string) => AssistantApiResult
  solveDoor: (door: string) => AssistantApiResult
  setMachineSetting: <K extends keyof MachineSettings>(
    key: K,
    value: MachineSettings[K],
  ) => AssistantApiResult
  reset: () => AssistantApiResult
  on: (eventName: AssistantApiEventName, listener: EventListener) => void
  off: (eventName: AssistantApiEventName, listener: EventListener) => void
}

export type AssistantApiEventName =
  | 'puzzlebox:navigation'
  | 'puzzlebox:command'
  | 'puzzlebox:state'

export const assistantRoomPaths = {
  ...routes,
  trainStation: routes.train,
  'train-station': routes.train,
  waitingRoom: routes.waiting,
  'waiting-room': routes.waiting,
  radioRoom: routes.radio,
  'radio-room': routes.radio,
  machineRoom: routes.machine,
  'machine-room': routes.machine,
  mirrorRoom: routes.mirror,
  'mirror-room': routes.mirror,
  artGallery: routes.gallery,
  'art-gallery': routes.gallery,
  kim: routes.kim,
  k: routes.kim,
} as const

const pathToRoom = new Map<string, string>(
  Object.entries(assistantRoomPaths).map(([room, path]) => [path, room]),
)
const validAssistantPaths = new Set<string>(Object.values(routes))

export const assistantRooms = Array.from(new Set(Object.keys(assistantRoomPaths))).sort()

export function cloneDiscoveryState(state: DiscoveryState): DiscoveryState {
  return {
    ...state,
    visitedPages: [...state.visitedPages],
    discoveredCommands: [...state.discoveredCommands],
    solvedDoors: [...state.solvedDoors],
    desktopSecretsFound: [...state.desktopSecretsFound],
    machineSettings: { ...state.machineSettings },
    aquariumState: { ...state.aquariumState },
  }
}

export function roomFromPath(path: string) {
  return pathToRoom.get(path) ?? path.replace(/^\//, '') ?? 'unknown'
}

export function resolveAssistantPath(roomOrPath: string) {
  const normalized = roomOrPath.trim()
  if (!normalized) return null
  if (normalized.startsWith('/')) {
    return validAssistantPaths.has(normalized) ? normalized : null
  }

  const key = normalized
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')

  return assistantRoomPaths[key as keyof typeof assistantRoomPaths] ?? null
}

export function pathForTerminalCommand(command: string) {
  const normalized = command.trim().toLowerCase()
  const commandRoutes: Record<string, string> = {
    explore: routes.corridor,
    corridor: routes.corridor,
    kim: routes.kim,
    desktop: routes.desktop,
    library: routes.library,
    mirror: routes.mirror,
    dream: routes.dream,
    wait: routes.waiting,
    elevator: routes.elevator,
  }

  return commandRoutes[normalized] ?? null
}

export function dispatchAssistantEvent(eventName: AssistantApiEventName, detail: unknown) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }))
}

declare global {
  interface Window {
    PuzzleBoxAPI?: AssistantApi
  }
}
