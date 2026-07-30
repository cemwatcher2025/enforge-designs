import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RoamInteractionId } from '../data/interactionGrammar'

export type WorldVector = {
  x: number
  y: number
  z: number
}

export type WorldInteractionType = RoamInteractionId

export type WorldObject = {
  description: string
  id: string
  interactable: boolean
  interactionType: WorldInteractionType
  modelUrl: string
  name: string
  position: WorldVector
  properties: Record<string, unknown>
  rotation: WorldVector
  scale: WorldVector
}

export type WorldInteractionLog = {
  duration: number
  objectId: string
  timestamp: string
  type: string
}

export type WorldState = {
  interactions: WorldInteractionLog[]
  lastModified: string | null
  objects: WorldObject[]
  worldVersion: number
}

const proxyBaseUrl = import.meta.env.VITE_COMMAND_CENTER_PROXY_URL

function proxyUrl(path: string) {
  if (!proxyBaseUrl) throw new Error('VITE_COMMAND_CENTER_PROXY_URL is not configured')
  return `${proxyBaseUrl.replace(/\/$/, '')}${path}`
}

async function fetchJson<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(proxyUrl(path), options)
  const payload = await response.json().catch(() => ({})) as T
  if (!response.ok) throw new Error(`${path} returned ${response.status}`)
  return payload
}

export function useWorld() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [state, setState] = useState<WorldState>({
    interactions: [],
    lastModified: null,
    objects: [],
    worldVersion: 1,
  })

  const selectedObjectMap = useMemo(
    () => new Map(state.objects.map((object) => [object.id, object])),
    [state.objects],
  )

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const nextState = await fetchJson<WorldState>('/api/world/state')
      setState(nextState)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'World state failed to load.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resetWorld = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const payload = await fetchJson<{ state: WorldState }>('/api/world/reset', { method: 'POST' })
      setState(payload.state)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'World reset failed.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logInteraction = useCallback(async (objectId: string, type: WorldInteractionType, duration = 0) => {
    try {
      const payload = await fetchJson<{ interaction: WorldInteractionLog }>('/api/world/interactions', {
        body: JSON.stringify({ duration, objectId, type }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      setState((current) => ({
        ...current,
        interactions: [...current.interactions, payload.interaction].slice(-500),
      }))
      return payload.interaction
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Interaction failed to log.')
      return null
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  return {
    error,
    isLoading,
    logInteraction,
    refresh,
    resetWorld,
    selectedObjectMap,
    state,
  }
}
