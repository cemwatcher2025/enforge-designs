import { useEffect, useLayoutEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDiscovery } from './useDiscovery'
import {
  assistantRooms,
  cloneDiscoveryState,
  dispatchAssistantEvent,
  pathForTerminalCommand,
  resolveAssistantPath,
  roomFromPath,
  type AssistantApi,
  type AssistantApiEventName,
  type AssistantApiResult,
} from '../utils/assistantApi'
import type { MachineSettings } from '../utils/discoveryContext'

type AssistantApiRequest = {
  id?: string
  action: string
  target?: string
  command?: string
  door?: string
  key?: keyof MachineSettings
  value?: MachineSettings[keyof MachineSettings]
}

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export function AssistantApiBridge() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    state,
    discoverCommand,
    solveDoor,
    setMachineSetting,
    reset,
  } = useDiscovery()

  const api = useMemo<AssistantApi>(() => {
    function currentPath() {
      return window.location.pathname
    }

    function currentRoom() {
      return roomFromPath(currentPath())
    }

    function result(message: string, ok = true, path?: string): AssistantApiResult {
      return { ok, message, path, room: path ? roomFromPath(path) : currentRoom() }
    }

    function go(roomOrPath: string): AssistantApiResult {
      const path = resolveAssistantPath(roomOrPath)
      if (!path) return result(`Unknown room or path: ${roomOrPath}`, false)

      navigate(path)
      dispatchAssistantEvent('puzzlebox:navigation', { path, room: roomFromPath(path) })
      return result(`Navigated to ${path}`, true, path)
    }

    function command(commandText: string): AssistantApiResult {
      const normalized = commandText.trim().toLowerCase()
      const path = pathForTerminalCommand(normalized)
      dispatchAssistantEvent('puzzlebox:command', { command: normalized, path })

      if (path) {
        discoverCommand(normalized)
        navigate(path)
        dispatchAssistantEvent('puzzlebox:navigation', { path, room: roomFromPath(path) })
        return result(`Ran command "${normalized}"`, true, path)
      }

      if (normalized === 'reset') {
        reset()
        return result('Discovery state reset')
      }

      if (['help', 'about', 'whoami', 'observer', 'clear'].includes(normalized)) {
        return result(`Command "${normalized}" has no navigation side effect`)
      }

      return result(`Unknown command: ${commandText}`, false)
    }

    return {
      version: '1.0.0',
      rooms: assistantRooms,
      currentPath,
      currentRoom,
      getState: () => cloneDiscoveryState(state),
      getStatus: () => ({
        currentPath: currentPath(),
        currentRoom: currentRoom(),
        rooms: assistantRooms,
        state: cloneDiscoveryState(state),
      }),
      go,
      command,
      discoverCommand: (commandText: string) => {
        discoverCommand(commandText)
        return result(`Discovered command "${commandText}"`)
      },
      solveDoor: (door: string) => {
        solveDoor(door)
        return result(`Marked door "${door}" solved`)
      },
      setMachineSetting: <K extends keyof MachineSettings>(
        key: K,
        value: MachineSettings[K],
      ) => {
        setMachineSetting(key, value)
        return result(`Set machine setting "${String(key)}"`)
      },
      reset: () => {
        reset()
        return result('Discovery state reset')
      },
      on: (eventName: AssistantApiEventName, listener: EventListener) => {
        window.addEventListener(eventName, listener)
      },
      off: (eventName: AssistantApiEventName, listener: EventListener) => {
        window.removeEventListener(eventName, listener)
      },
    }
  }, [discoverCommand, navigate, reset, setMachineSetting, solveDoor, state])

  useLayoutEffect(() => {
    try {
      window.PuzzleBoxAPI = api
    } catch {
      // Some browser automation sandboxes make window non-extensible.
    }
  }, [api])

  useEffect(() => {
    try {
      window.PuzzleBoxAPI = api
    } catch {
      // The DOM event API below remains available when this assignment is blocked.
    }
    dispatchAssistantEvent('puzzlebox:state', api.getStatus())
  }, [api])

  useEffect(() => {
    function respond(id: string | undefined, detail: Record<string, unknown>) {
      document.dispatchEvent(new CustomEvent('puzzlebox:api-result', { detail: { id, ...detail } }))
    }

    function handleApiRequest(event: Event) {
      const request = (event as CustomEvent<AssistantApiRequest>).detail
      if (!request || typeof request.action !== 'string') {
        respond(undefined, { ok: false, message: 'Invalid API request' })
        return
      }

      if (request.action === 'go') {
        respond(request.id, { ...api.go(request.target ?? '') })
      } else if (request.action === 'command') {
        respond(request.id, { ...api.command(request.command ?? '') })
      } else if (request.action === 'discoverCommand') {
        respond(request.id, { ...api.discoverCommand(request.command ?? '') })
      } else if (request.action === 'solveDoor') {
        respond(request.id, { ...api.solveDoor(request.door ?? '') })
      } else if (request.action === 'setMachineSetting' && request.key) {
        respond(request.id, { ...api.setMachineSetting(request.key, request.value as never) })
      } else if (request.action === 'reset') {
        respond(request.id, { ...api.reset() })
      } else if (request.action === 'status') {
        respond(request.id, { ok: true, message: 'Status', status: api.getStatus() })
      } else {
        respond(request.id, { ok: false, message: `Unknown API action: ${request.action}` })
      }
    }

    document.addEventListener('puzzlebox:api', handleApiRequest)
    return () => document.removeEventListener('puzzlebox:api', handleApiRequest)
  }, [api])

  useEffect(() => {
    dispatchAssistantEvent('puzzlebox:navigation', {
      path: location.pathname,
      room: roomFromPath(location.pathname),
    })
  }, [location.pathname])

  const status = api.getStatus()

  return (
    <script
      id="puzzlebox-api-state"
      type="application/json"
      data-ready="true"
      data-current-path={status.currentPath}
      data-current-room={status.currentRoom}
      dangerouslySetInnerHTML={{ __html: safeJson(status) }}
    />
  )
}
