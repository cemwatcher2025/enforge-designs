import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  defaultDiscoveryState,
  DiscoveryContext,
  type DiscoveryState,
  type MachineSettings,
} from '../utils/discoveryContext'

const STORAGE_KEY = 'puzzle-box-discovery-v1'

function uniqueAdd(list: string[], item: string) {
  return list.includes(item) ? list : [...list, item]
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw
      ? ({ ...defaultDiscoveryState, ...JSON.parse(raw) } as DiscoveryState)
      : defaultDiscoveryState
  } catch {
    return defaultDiscoveryState
  }
}

export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DiscoveryState>(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const update = useCallback((patch: Partial<DiscoveryState>) => {
    setState((current) => ({ ...current, ...patch }))
  }, [])

  const visitPage = useCallback((page: string) => {
    setState((current) => ({ ...current, visitedPages: uniqueAdd(current.visitedPages, page) }))
  }, [])

  const discoverCommand = useCallback((command: string) => {
    setState((current) => ({
      ...current,
      discoveredCommands: uniqueAdd(current.discoveredCommands, command),
    }))
  }, [])

  const solveDoor = useCallback((door: string) => {
    setState((current) => ({ ...current, solvedDoors: uniqueAdd(current.solvedDoors, door) }))
  }, [])

  const addDesktopSecret = useCallback((secret: string) => {
    setState((current) => ({
      ...current,
      desktopSecretsFound: uniqueAdd(current.desktopSecretsFound, secret),
    }))
  }, [])

  const setMachineSetting = useCallback(
    <K extends keyof MachineSettings>(key: K, value: MachineSettings[K]) => {
      setState((current) => ({
        ...current,
        machineSettings: { ...current.machineSettings, [key]: value },
      }))
    },
    [],
  )

  const reset = useCallback(() => setState(defaultDiscoveryState), [])

  const value = useMemo(
    () => ({
      state,
      update,
      visitPage,
      discoverCommand,
      solveDoor,
      addDesktopSecret,
      setMachineSetting,
      reset,
    }),
    [addDesktopSecret, discoverCommand, reset, setMachineSetting, solveDoor, state, update, visitPage],
  )

  return <DiscoveryContext.Provider value={value}>{children}</DiscoveryContext.Provider>
}
