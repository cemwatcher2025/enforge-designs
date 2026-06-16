import { createContext } from 'react'

export type MachineSettings = {
  waterValve: boolean
  corridorLights: boolean
  signal: number
  archiveCompressed: boolean
}

export type DiscoveryState = {
  visitedPages: string[]
  discoveredCommands: string[]
  solvedDoors: string[]
  machineSettings: MachineSettings
  aquariumState: { cracked: boolean; tunnelOpen: boolean }
  kimVisited: boolean
  falseEndReached: boolean
  desktopSecretsFound: string[]
}

export type DiscoveryContextValue = {
  state: DiscoveryState
  update: (patch: Partial<DiscoveryState>) => void
  visitPage: (page: string) => void
  discoverCommand: (command: string) => void
  solveDoor: (door: string) => void
  addDesktopSecret: (secret: string) => void
  setMachineSetting: <K extends keyof MachineSettings>(
    key: K,
    value: MachineSettings[K],
  ) => void
  reset: () => void
}

export const defaultDiscoveryState: DiscoveryState = {
  visitedPages: [],
  discoveredCommands: [],
  solvedDoors: [],
  machineSettings: {
    waterValve: false,
    corridorLights: false,
    signal: 101.3,
    archiveCompressed: false,
  },
  aquariumState: { cracked: false, tunnelOpen: false },
  kimVisited: false,
  falseEndReached: false,
  desktopSecretsFound: [],
}

export const DiscoveryContext = createContext<DiscoveryContextValue | null>(null)
