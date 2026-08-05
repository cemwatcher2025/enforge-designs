import { useCallback, useEffect, useRef, useState } from 'react'
import { useCamera } from '../context/cameraContext'
import { assessWithMoondream, defaultMoondreamModelId, hasBrowserMoondreamSupport, loadMoondream, type MoondreamStatus } from '../utils/moondreamVision'
import { detectKimObjects, loadKimObjectDetector, summarizeKimDetections, type KimDetection, type KimDetectorStatus } from '../utils/kimObjectDetector'

type VisionMode = 'gpuServer' | 'moondream' | 'proxy' | 'stats'

type VisionAssessment = {
  brightness: number
  durationMs?: number
  kind?: 'check' | 'event' | 'observation' | 'notice' | 'error'
  mode: VisionMode
  motion: number | null
  note: string
  timestamp: string
  trigger: string
}

type VisionMemory = {
  averageBrightness: number | null
  averageMotion: number | null
  lastDeepObservation: string | null
  lastSeenAt: string | null
  samples: number
}

type BaselineSignal = {
  brightnessDelta: number
  learnedBrightnessShift: boolean
  learnedMotionShift: boolean
  motionDelta: number
  ready: boolean
}

type AmbientGateState = {
  baselineAgeSeconds: number
  changeScore: number | null
  dwellSeconds: number
  lastMeaningfulChangeAt: string | null
  mode: 'initializing' | 'discarded' | 'passed' | 'manual'
  threshold: number
}

type BufferedVisionFrame = {
  brightness: number
  height: number
  imageDataUrl: string
  motion: number | null
  timestamp: string
  timeMs: number
  width: number
}

type MotionRegion = 'none' | 'left' | 'center' | 'right' | 'upper' | 'lower' | 'wide'

type SceneEvent = {
  detail: string
  motion: number | null
  region: MotionRegion
  timestamp: string
  type: 'detector' | 'entered' | 'left' | 'motion' | 'object' | 'presence' | 'settled' | 'unknown'
}

type SceneMemory = {
  activity: 'idle' | 'moving' | 'object_in_hand' | 'standing' | 'sitting' | 'unknown'
  confidence: number
  entities: string[]
  lastEventAt: string | null
  motionRegion: MotionRegion
  presence: 'present' | 'away' | 'uncertain'
  summary: string
}

type SceneMemoryEvidence = {
  forceAssessment: boolean
  motion: number | null
}

type KimVisionDebugPacket = {
  ambientGate: AmbientGateState
  assessments: VisionAssessment[]
  camera: {
    active: boolean
    mirrored: boolean
  }
  detector: {
    enabled: boolean
    probeFrames: number
    status: KimDetectorStatus
  }
  generatedAt: string
  gpuServerStatus: string
  modelStatus: MoondreamStatus
  sceneEvents: SceneEvent[]
  sceneMemory: SceneMemory
  settings: {
    ambientChangeThreshold: number
    ambientGateIntervalSeconds: number
    cooldownSeconds: number
    deepAutoEnabled: boolean
    frameInterval: number
    gpuEndpoint: string
    modelId: string
    motionProbeFrames: number
    motionThreshold: number
    visionMode: VisionMode
  }
  testNote: string
  version: 1
}

function settleActivityFromMemory(activity: SceneMemory['activity']) {
  if (activity === 'standing' || activity === 'moving' || activity === 'object_in_hand') return 'sitting'
  return activity === 'unknown' ? 'idle' : activity
}

const endpointStorageKey = 'enforge-kim-vision-endpoint'
const gpuEndpointStorageKey = 'enforge-kim-vision-gpu-endpoint'
const visionModeStorageKey = 'enforge-kim-vision-mode'
const modelStorageKey = 'enforge-kim-vision-model'
const frameIntervalStorageKey = 'enforge-kim-vision-frame-interval'
const ambientGateIntervalStorageKey = 'enforge-kim-ambient-gate-interval'
const ambientChangeThresholdStorageKey = 'enforge-kim-ambient-change-threshold'
const motionThresholdStorageKey = 'enforge-kim-vision-motion-threshold'
const cooldownStorageKey = 'enforge-kim-vision-cooldown'
const deepAutoStorageKey = 'enforge-kim-vision-deep-auto'
const detectorEnabledStorageKey = 'enforge-kim-detector-enabled'
const assessmentLogStorageKey = 'enforge-kim-vision-assessments'
const visionMemoryStorageKey = 'enforge-kim-vision-memory'
const sceneMemoryStorageKey = 'enforge-kim-scene-memory-v2'
const sceneEventsStorageKey = 'enforge-kim-scene-events-v2'
const defaultVisionEndpoint = import.meta.env.VITE_KIM_VISION_ENDPOINT
  || (import.meta.env.VITE_COMMAND_CENTER_PROXY_URL
    ? `${String(import.meta.env.VITE_COMMAND_CENTER_PROXY_URL).replace(/\/$/, '')}/api/kim/vision`
    : '')
const defaultGpuEndpoint = 'http://127.0.0.1:8765'
const baselineWarmupSamples = 8
const baselineAdaptRate = 0.12
const defaultFrameInterval = 900
const defaultAmbientGateIntervalSeconds = 5
const defaultAmbientChangeThreshold = 5
const defaultCooldownSeconds = 45
const strongMotionCooldownSeconds = 22
const sustainedMotionCooldownSeconds = 14
const motionProbeFrames = 10
const bufferedFrameWindowMs = 3000
const bufferedMotionFloor = 5
const sceneEventCooldownMs = 2500
const detectorProbeFrames = 45
const detectorEventCooldownMs = 5000
const sceneEventHistoryLimit = 60
const sceneEventDisplayLimit = 16

function defaultAmbientGateState(): AmbientGateState {
  return {
    baselineAgeSeconds: 0,
    changeScore: null,
    dwellSeconds: 0,
    lastMeaningfulChangeAt: null,
    mode: 'initializing',
    threshold: defaultAmbientChangeThreshold,
  }
}

function averageBrightness(data: Uint8ClampedArray) {
  let total = 0
  const stride = 16
  for (let index = 0; index < data.length; index += 4 * stride) {
    total += (data[index] + data[index + 1] + data[index + 2]) / 3
  }
  return Math.round((total / (data.length / 4 / stride) / 255) * 100)
}

function frameDelta(current: Uint8ClampedArray, previous: Uint8ClampedArray | null, width: number, height: number) {
  if (!previous) return null
  const columns = 8
  const rows = 6
  const cellTotals = Array.from({ length: columns * rows }, () => 0)
  const cellSamples = Array.from({ length: columns * rows }, () => 0)
  const stride = 10
  let activeSamples = 0
  let samples = 0
  let total = 0

  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const index = (y * width + x) * 4
      const delta = Math.abs(current[index] - previous[index])
        + Math.abs(current[index + 1] - previous[index + 1])
        + Math.abs(current[index + 2] - previous[index + 2])
      const cellX = Math.min(columns - 1, Math.floor((x / width) * columns))
      const cellY = Math.min(rows - 1, Math.floor((y / height) * rows))
      const cellIndex = (cellY * columns) + cellX
      cellTotals[cellIndex] += delta
      cellSamples[cellIndex] += 1
      total += delta
      samples += 1
      if (delta >= 34) activeSamples += 1
    }
  }

  const globalScore = (total / samples / 765) * 100
  const hotCellScore = cellTotals.reduce((strongest, cellTotal, index) => {
    const cellSampleCount = cellSamples[index]
    if (!cellSampleCount) return strongest
    return Math.max(strongest, (cellTotal / cellSampleCount / 765) * 100)
  }, 0)
  const activeSampleScore = (activeSamples / samples) * 100
  return Math.round(Math.max(globalScore, hotCellScore * 1.45, activeSampleScore * 1.6))
}

function motionRegion(current: Uint8ClampedArray, previous: Uint8ClampedArray | null, width: number, height: number): MotionRegion {
  if (!previous) return 'none'
  const zones = { center: 0, left: 0, lower: 0, right: 0, upper: 0 }
  const stride = 12
  let samples = 0
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const index = (y * width + x) * 4
      const delta = Math.abs(current[index] - previous[index])
        + Math.abs(current[index + 1] - previous[index + 1])
        + Math.abs(current[index + 2] - previous[index + 2])
      if (delta < 32) continue
      samples += 1
      if (x < width * 0.33) zones.left += 1
      else if (x > width * 0.66) zones.right += 1
      else zones.center += 1
      if (y < height * 0.45) zones.upper += 1
      if (y > height * 0.55) zones.lower += 1
    }
  }
  if (samples < 3) return 'none'
  const horizontal = [
    ['left', zones.left],
    ['center', zones.center],
    ['right', zones.right],
  ] as const
  const strongestHorizontal = horizontal.reduce((best, next) => next[1] > best[1] ? next : best)
  if (zones.upper > samples * 0.58) return 'upper'
  if (zones.lower > samples * 0.58) return 'lower'
  if (strongestHorizontal[1] < samples * 0.46) return 'wide'
  return strongestHorizontal[0]
}

function localNote(brightness: number, motion: number | null) {
  const light = brightness > 68 ? 'bright' : brightness < 28 ? 'dim' : 'balanced'
  const movement = motion == null ? 'baseline frame captured' : motion > 18 ? 'noticeable motion' : motion > 6 ? 'light movement' : 'mostly steady'
  return `Local frame read: ${light} lighting, ${movement}.`
}

function defaultVisionMemory(): VisionMemory {
  return {
    averageBrightness: null,
    averageMotion: null,
    lastDeepObservation: null,
    lastSeenAt: null,
    samples: 0,
  }
}

function defaultSceneMemory(): SceneMemory {
  return {
    activity: 'unknown',
    confidence: 0,
    entities: [],
    lastEventAt: null,
    motionRegion: 'none',
    presence: 'uncertain',
    summary: 'Learning the room.',
  }
}

function loadSceneMemory() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(sceneMemoryStorageKey) || 'null') as SceneMemory | null
    return parsed && Array.isArray(parsed.entities) ? parsed : defaultSceneMemory()
  } catch {
    return defaultSceneMemory()
  }
}

function loadSceneEvents() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(sceneEventsStorageKey) || '[]') as SceneEvent[]
    return Array.isArray(parsed) ? parsed.slice(0, sceneEventHistoryLimit) : []
  } catch {
    return []
  }
}

function loadVisionMemory() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(visionMemoryStorageKey) || 'null') as VisionMemory | null
    return parsed && typeof parsed.samples === 'number' ? parsed : defaultVisionMemory()
  } catch {
    return defaultVisionMemory()
  }
}

function updateVisionMemory(memory: VisionMemory, brightness: number, motion: number | null, timestamp: string, deepObservation?: string) {
  const samples = memory.samples + 1
  const motionValue = motion ?? memory.averageMotion ?? 0
  const shouldWarmUp = memory.samples < baselineWarmupSamples
  const blend = (current: number | null, next: number) => {
    if (current == null) return next
    if (shouldWarmUp) return ((current * memory.samples) + next) / samples
    return (current * (1 - baselineAdaptRate)) + (next * baselineAdaptRate)
  }
  const currentMotion = memory.averageMotion ?? motionValue
  const stableMotionCeiling = Math.max(6, currentMotion + 2)
  const motionForBaseline = shouldWarmUp || motionValue <= stableMotionCeiling
    ? motionValue
    : currentMotion
  const nextMemory: VisionMemory = {
    averageBrightness: Math.round(blend(memory.averageBrightness, brightness) * 10) / 10,
    averageMotion: Math.round(blend(memory.averageMotion, motionForBaseline) * 10) / 10,
    lastDeepObservation: deepObservation || memory.lastDeepObservation,
    lastSeenAt: timestamp,
    samples,
  }
  window.localStorage.setItem(visionMemoryStorageKey, JSON.stringify(nextMemory))
  return nextMemory
}

function quietCheckNote(brightness: number, motion: number | null, memory: VisionMemory) {
  const memoryText = memory.samples < baselineWarmupSamples
    ? `KIM is learning the room baseline (${memory.samples}/${baselineWarmupSamples} samples).`
    : `Baseline learned: usual light ${memory.averageBrightness ?? brightness}%, usual motion ${memory.averageMotion ?? 0}%.`
  return `Check logged: ${localNote(brightness, motion)} ${memoryText}`
}

function addUniqueEntity(entities: string[], entity: string) {
  return entities.includes(entity) ? entities : [entity, ...entities].slice(0, 8)
}

function sceneMemoryFromObservation(memory: SceneMemory, note: string, timestamp: string, region: MotionRegion, evidence: SceneMemoryEvidence): SceneMemory {
  const normalized = note.toLowerCase()
  let next = { ...memory, lastEventAt: timestamp, motionRegion: region }
  const motion = evidence.motion ?? 0
  const postureMotionConfirmed = !evidence.forceAssessment && (
    (motion >= 5 && region !== 'lower')
    || region === 'upper'
    || region === 'wide'
    || (region === 'center' && motion >= 8)
  )
  if (/\b(person|man|brandon)\b/.test(normalized)) {
    next = { ...next, confidence: Math.max(next.confidence, 68), presence: 'present' }
  }
  if (/\b(empty chair|chair is empty|no person|away)\b/.test(normalized)) {
    next = { ...next, activity: 'unknown', confidence: Math.max(next.confidence, 60), presence: 'away' }
  }
  if (/\bstanding|stands|stood\b/.test(normalized) && postureMotionConfirmed) {
    next = { ...next, activity: 'standing', confidence: Math.max(next.confidence, 74), presence: 'present' }
  }
  if (/\bsitting|sits|seated\b/.test(normalized)) {
    next = { ...next, activity: 'sitting', confidence: Math.max(next.confidence, evidence.forceAssessment && motion <= 2 ? 66 : 72), presence: 'present' }
  }
  if (/\bholding|hand|phone|remote|object|figurine|toothbrush|bottle|cup|mug\b/.test(normalized)) {
    next = { ...next, activity: 'object_in_hand', confidence: Math.max(next.confidence, 76), presence: 'present' }
  }
  if (/\bdog\b/.test(normalized)) next = { ...next, entities: addUniqueEntity(next.entities, 'dog') }
  if (/\bfan\b/.test(normalized)) next = { ...next, entities: addUniqueEntity(next.entities, 'fan') }
  if (/\bphone|remote|object|figurine|toothbrush|bottle|cup|mug\b/.test(normalized)) next = { ...next, entities: addUniqueEntity(next.entities, 'held object') }
  next.summary = summarizeScene(next)
  window.localStorage.setItem(sceneMemoryStorageKey, JSON.stringify(next))
  return next
}

function summarizeScene(memory: SceneMemory) {
  const presence = memory.presence === 'present' ? 'Person present' : memory.presence === 'away' ? 'Person away' : 'Presence uncertain'
  const activity = memory.activity === 'object_in_hand'
    ? 'object in hand'
    : memory.activity === 'unknown'
      ? 'watching for context'
      : memory.activity
  const entities = memory.entities.length ? `; known: ${memory.entities.join(', ')}` : ''
  return `${presence}; ${activity}; motion ${memory.motionRegion}${entities}.`
}

function sceneMemoryFromDetections(memory: SceneMemory, detections: KimDetection[], timestamp: string, region: MotionRegion): SceneMemory {
  const summary = summarizeKimDetections(detections)
  let next = { ...memory, lastEventAt: timestamp, motionRegion: region }
  if (summary.personVisible) {
    next = { ...next, confidence: Math.max(next.confidence, 78), presence: 'present' }
  }
  if (summary.dogVisible) {
    next = { ...next, entities: addUniqueEntity(next.entities, 'dog') }
  }
  if (summary.heldObjectLikely) {
    next = { ...next, activity: 'object_in_hand', confidence: Math.max(next.confidence, 82), presence: summary.personVisible ? 'present' : next.presence, entities: addUniqueEntity(next.entities, 'held object') }
  }
  if (summary.chairVisible) {
    next = { ...next, entities: addUniqueEntity(next.entities, 'chair') }
  }
  next.summary = summarizeScene(next)
  window.localStorage.setItem(sceneMemoryStorageKey, JSON.stringify(next))
  return next
}

function baselineSignal(memory: VisionMemory, brightness: number, motion: number | null, brightnessDelta: number): BaselineSignal {
  const motionValue = motion ?? 0
  const usualMotion = memory.averageMotion ?? 0
  const usualBrightness = memory.averageBrightness ?? brightness
  const motionDelta = Math.max(0, motionValue - usualMotion)
  const learnedBrightnessDelta = Math.abs(brightness - usualBrightness)
  const ready = memory.samples >= baselineWarmupSamples
  const learnedMotionThreshold = Math.max(usualMotion + 4, Math.round(usualMotion * 2.1), 7)

  return {
    brightnessDelta: Math.max(brightnessDelta, learnedBrightnessDelta),
    learnedBrightnessShift: ready && learnedBrightnessDelta >= 10,
    learnedMotionShift: ready && motion != null && motionValue >= learnedMotionThreshold,
    motionDelta,
    ready,
  }
}

function loadFrameInterval() {
  const saved = Number(window.localStorage.getItem(frameIntervalStorageKey) || defaultFrameInterval)
  if (!Number.isFinite(saved) || saved <= 0) return defaultFrameInterval
  if (saved === 240) return defaultFrameInterval
  return saved
}

function loadAmbientGateIntervalSeconds() {
  const saved = Number(window.localStorage.getItem(ambientGateIntervalStorageKey) || defaultAmbientGateIntervalSeconds)
  if (!Number.isFinite(saved) || saved <= 0) return defaultAmbientGateIntervalSeconds
  return Math.min(Math.max(saved, 2), 60)
}

function loadAmbientChangeThreshold() {
  const saved = Number(window.localStorage.getItem(ambientChangeThresholdStorageKey) || defaultAmbientChangeThreshold)
  if (!Number.isFinite(saved) || saved <= 0) return defaultAmbientChangeThreshold
  return Math.min(Math.max(saved, 1), 40)
}

function loadCooldownSeconds() {
  const saved = Number(window.localStorage.getItem(cooldownStorageKey) || defaultCooldownSeconds)
  if (!Number.isFinite(saved) || saved <= 0) return defaultCooldownSeconds
  return Math.min(saved, defaultCooldownSeconds)
}

function triggerFromSignals(
  forceAssessment: boolean,
  motion: number | null,
  brightnessDelta: number,
  signal: BaselineSignal,
  motionThreshold: number,
) {
  if (forceAssessment) return 'manual'
  if (motion != null && motion >= motionThreshold) return `motion ${motion}%`
  if (brightnessDelta >= 14) return `lighting shift ${brightnessDelta}%`
  if (signal.learnedMotionShift) return `learned motion shift +${signal.motionDelta}%`
  if (signal.learnedBrightnessShift) return `learned light shift ${signal.brightnessDelta}%`
  return null
}

const assessmentPrompt = 'Report only the visible activity or change in one short natural sentence. Focus on people, animals, held objects, entering, leaving, standing, sitting, or large motion. Avoid clothing, facial expressions, and room descriptions unless they are unmistakable. Avoid guessing posture from an ambiguous still frame; say person visible if standing versus sitting is unclear. Avoid depth-direction claims such as in front of, behind, or next to; say visible near or also visible instead. Do not mention prompt categories or instructions. Do not identify private screen text.'

function prependAssessment(current: VisionAssessment[], next: VisionAssessment) {
  const duplicate = current.some((assessment) => (
    assessment.note === next.note
    && assessment.trigger === next.trigger
    && assessment.kind === next.kind
    && assessment.mode === next.mode
    && Math.abs(new Date(assessment.timestamp).getTime() - new Date(next.timestamp).getTime()) < 1000
  ))
  return duplicate ? current : [next, ...current].slice(0, 40)
}

function compactAssessments(entries: VisionAssessment[]) {
  return entries.reduce<VisionAssessment[]>((compacted, entry) => prependAssessment(compacted, entry), [])
}

function assessmentKey(assessment: VisionAssessment, index: number) {
  return [
    assessment.timestamp,
    assessment.kind || 'observation',
    assessment.mode,
    assessment.trigger,
    index,
  ].join(':')
}

function debugPacketFilename(timestamp: string) {
  return `kim-vision-debug-${timestamp.replace(/[:.]/g, '-').replace('T', '_').replace('Z', 'Z')}.json`
}

function visionModeLabel(mode: VisionMode) {
  if (mode === 'gpuServer') return 'GPU server'
  if (mode === 'moondream') return 'Browser model'
  if (mode === 'proxy') return 'Proxy'
  return 'Stats only'
}

function formatDuration(durationMs?: number) {
  if (durationMs == null) return null
  if (durationMs < 1000) return `${durationMs}ms`
  return `${(durationMs / 1000).toFixed(1)}s`
}

function selectBufferedMotionFrame(frames: BufferedVisionFrame[], now: number) {
  return frames.find((frame) => (
    now - frame.timeMs <= bufferedFrameWindowMs
    && frame.motion != null
    && frame.motion >= bufferedMotionFloor
  )) || null
}

function updateVisionObservation(memory: VisionMemory, timestamp: string, deepObservation?: string) {
  const nextMemory: VisionMemory = {
    ...memory,
    lastDeepObservation: deepObservation || memory.lastDeepObservation,
    lastSeenAt: timestamp,
  }
  window.localStorage.setItem(visionMemoryStorageKey, JSON.stringify(nextMemory))
  return nextMemory
}

function cleanModelObservation(note: string, fallback: string) {
  const cleaned = note
    .replace(/^the most useful current visual observation is that\s+/i, '')
    .replace(/^the most useful observation is that\s+/i, '')
    .replace(/\s+(is|are)\s+in front of\s+(him|her|them|the man|the person)/gi, ' is visible near the person')
    .replace(/\s+(is|are)\s+behind\s+(him|her|them|the man|the person)/gi, ' is also visible')
    .replace(/\s+(is|are)\s+next to\s+(him|her|them|the man|the person)/gi, ' is visible near the person')
    .replace(/\s+in front of\s+(him|her|them|the man|the person)/gi, ' near the person')
    .replace(/\s+behind\s+(him|her|them|the man|the person)/gi, ' also visible')
    .replace(/\s+next to\s+(him|her|them|the man|the person)/gi, ' near the person')
    .replace(/\s+in front of the camera/gi, ' visible to the camera')
    .trim()
  const normalized = cleaned.toLowerCase()
  const instructionEchoes = [
    'brandon present/away',
    'brandon is present, moving',
    'focused/moving/phone',
    'new people/animals/objects',
    'person/animal/object',
    'using a phone/object',
    'entered or left',
    'what is the most useful current visual observation',
    'visible activity or change',
    'prompt categories',
  ]
  const lowValueOrRisky = [
    'fan on his head',
    'fan on her head',
    'fan on the head',
    'bald head',
    'shaved head',
    'blurry photo',
    'couch in the background',
    'tie',
    'surprised',
    'sunset',
    'blue shirt',
    'black leather chair',
    'living room with a fan',
  ]
  const usefulSignals = [
    'holding',
    'standing',
    'walking',
    'entered',
    'left',
    'dog',
    'cat',
    'animal',
    'phone',
    'remote',
    'mug',
    'spray bottle',
    'object',
  ]
  const genericStableCaptions = [
    'a man sitting in a chair in a room',
    'a man sitting in a chair in a living room',
    'a man is sitting in a chair in a room',
  ]
  if (instructionEchoes.some((phrase) => normalized.includes(phrase))) {
    return `${fallback} Model echoed the observation prompt, so KIM logged this as a numeric notice instead.`
  }
  if (genericStableCaptions.some((phrase) => normalized === phrase || normalized === `${phrase}.`)) {
    return `${fallback} Model saw no distinct new action beyond stable seated presence.`
  }
  if (lowValueOrRisky.some((phrase) => normalized.includes(phrase))) {
    const stripped = cleaned
      .replace(/^a man and tie is\s+/i, 'A man is ')
      .replace(/^a person and tie is\s+/i, 'A person is ')
      .replace(/\s+and tie\s+/gi, ' ')
      .replace(/\s+with a shaved chest and a bald head/gi, '')
      .replace(/\s+with a shaved head and tattoos on (his|her|their) arm/gi, ' with tattoos on the arm')
      .replace(/\s+with a bald head/gi, '')
      .replace(/\s+with a shaved head/gi, '')
      .replace(/\s+in a blurry photo/gi, '')
      .replace(/\s+with a person sitting on a couch in the background/gi, '')
      .replace(/\s+on a couch in the background/gi, '')
      .replace(/\s+in a blue shirt and tie/gi, '')
      .replace(/\s+in a blue shirt/gi, '')
      .replace(/\s+wearing a blue shirt/gi, '')
      .replace(/\s+with a sunset in the background/gi, '')
      .replace(/\s+with a fan on (his|her|their) head/gi, '')
      .replace(/\s+and looking surprised/gi, '')
      .replace(/\s+with a surprised expression/gi, '')
      .replace(/\s+in a living room with a fan/gi, '')
      .replace(/\s+in a living room\.?$/i, '.')
      .replace(/\s+in a room\.?$/i, '.')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (usefulSignals.some((phrase) => stripped.toLowerCase().includes(phrase))) {
      return stripped || `${fallback} Model saw movement, but the fine detail was uncertain.`
    }
    return `${fallback} Model saw movement, but the fine detail was uncertain.`
  }
  return (cleaned || note)
    .replace(/\s+in a living room\.?$/i, '.')
    .replace(/\s+in a room\.?$/i, '.')
    .replace(/\s+with a room in the background\.?$/i, '.')
}

async function postVisionAssessment(endpoint: string, imageDataUrl: string, metadata: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    body: JSON.stringify({
      imageDataUrl,
      metadata,
      prompt: assessmentPrompt,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  const payload = await response.json().catch(() => ({})) as { assessment?: string; summary?: string; error?: string }
  if (!response.ok) throw new Error(payload.error || `Vision endpoint returned ${response.status}`)
  return payload.assessment || payload.summary || 'KIM received the frame but did not return a text assessment.'
}

async function postGpuServerAssessment(baseUrl: string, imageDataUrl: string, metadata: Record<string, unknown>) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/analyze`, {
    body: JSON.stringify({
      imageDataUrl,
      metadata,
      prompt: assessmentPrompt,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  const payload = await response.json().catch(() => ({})) as { description?: string; detail?: string; error?: string }
  if (!response.ok) throw new Error(payload.detail || payload.error || `Local GPU server returned ${response.status}`)
  return payload.description || 'Local GPU server returned an empty assessment.'
}

async function checkGpuServerHealth(baseUrl: string) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/health`)
  const payload = await response.json().catch(() => ({})) as { ok?: boolean; provider?: string | null; ready?: boolean; detail?: string }
  if (!response.ok) throw new Error(payload.detail || `Local GPU server returned ${response.status}`)
  return payload
}

export function KimVisionPanel() {
  const { attachVideo, isActive, isMirrored } = useCamera()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null)
  const interestingFrameRef = useRef<Uint8ClampedArray | null>(null)
  const lastBrightnessRef = useRef<number | null>(null)
  const lastAssessmentAtRef = useRef(0)
  const lastDetectorAtRef = useRef(0)
  const lastGateCheckAtRef = useRef(0)
  const lastMeaningfulChangeAtRef = useRef<number | null>(null)
  const lastSceneEventAtRef = useRef(0)
  const memoryRef = useRef<VisionMemory>(loadVisionMemory())
  const sceneMemoryRef = useRef<SceneMemory>(defaultSceneMemory())
  const sceneEventsRef = useRef<SceneEvent[]>([])
  const frameCountRef = useRef(0)
  const motionTrailRef = useRef(0)
  const frameBufferRef = useRef<BufferedVisionFrame[]>([])
  const isSendingRef = useRef(false)
  const [enabled, setEnabled] = useState(false)
  const [frameInterval] = useState(loadFrameInterval)
  const [ambientGateIntervalSeconds, setAmbientGateIntervalSeconds] = useState(loadAmbientGateIntervalSeconds)
  const [ambientChangeThreshold, setAmbientChangeThreshold] = useState(loadAmbientChangeThreshold)
  const [motionThreshold, setMotionThreshold] = useState(() => Number(window.localStorage.getItem(motionThresholdStorageKey) || 22))
  const [cooldownSeconds, setCooldownSeconds] = useState(loadCooldownSeconds)
  const [deepAutoEnabled, setDeepAutoEnabled] = useState(() => window.localStorage.getItem(deepAutoStorageKey) === 'true')
  const [detectorEnabled, setDetectorEnabled] = useState(() => window.localStorage.getItem(detectorEnabledStorageKey) !== 'false')
  const [visionMode, setVisionMode] = useState<VisionMode>(() => {
    const saved = window.localStorage.getItem(visionModeStorageKey)
    return saved === 'gpuServer' || saved === 'proxy' || saved === 'stats' || saved === 'moondream' ? saved : 'moondream'
  })
  const [modelId, setModelId] = useState(() => window.localStorage.getItem(modelStorageKey) || defaultMoondreamModelId)
  const [endpoint, setEndpoint] = useState(() => window.localStorage.getItem(endpointStorageKey) || defaultVisionEndpoint)
  const [gpuEndpoint, setGpuEndpoint] = useState(() => window.localStorage.getItem(gpuEndpointStorageKey) || defaultGpuEndpoint)
  const [isSending, setIsSending] = useState(false)
  const [status, setStatus] = useState('Waiting for camera.')
  const [gpuServerStatus, setGpuServerStatus] = useState('Not checked.')
  const [detectorStatus, setDetectorStatus] = useState<KimDetectorStatus>({
    detail: 'Local detector loads on first use.',
    stage: 'idle',
  })
  const [sceneMemory, setSceneMemory] = useState<SceneMemory>(loadSceneMemory)
  const [sceneEvents, setSceneEvents] = useState<SceneEvent[]>(loadSceneEvents)
  const [ambientGate, setAmbientGate] = useState<AmbientGateState>(() => ({
    ...defaultAmbientGateState(),
    threshold: loadAmbientChangeThreshold(),
  }))
  const [modelStatus, setModelStatus] = useState<MoondreamStatus>({
    detail: hasBrowserMoondreamSupport()
      ? 'Local Moondream is available. First analysis downloads the model from Hugging Face.'
      : 'Local Moondream needs WebGPU. Proxy and stats modes still work.',
    stage: hasBrowserMoondreamSupport() ? 'idle' : 'error',
  })
  const [assessments, setAssessments] = useState<VisionAssessment[]>(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(assessmentLogStorageKey) || '[]') as VisionAssessment[]
      return Array.isArray(parsed) ? compactAssessments(parsed).slice(0, 20) : []
    } catch {
      return []
    }
  })
  const [debugNote, setDebugNote] = useState('')
  const [debugStatus, setDebugStatus] = useState('No packet exported yet.')
  const effectiveStatus = !isActive
    ? 'Waiting for camera.'
    : enabled
      ? `Layer 1 gate samples every ${ambientGateIntervalSeconds}s. Last gate: ${ambientGate.changeScore == null ? 'baseline pending' : `${ambientGate.changeScore}% change`} (${ambientGate.mode}).`
      : status

  const buildDebugPacket = useCallback((noteOverride = debugNote): KimVisionDebugPacket => ({
    ambientGate,
    assessments,
    camera: {
      active: isActive,
      mirrored: isMirrored,
    },
    detector: {
      enabled: detectorEnabled,
      probeFrames: detectorProbeFrames,
      status: detectorStatus,
    },
    generatedAt: new Date().toISOString(),
    gpuServerStatus,
    modelStatus,
    sceneEvents,
    sceneMemory,
    settings: {
      ambientChangeThreshold,
      ambientGateIntervalSeconds,
      cooldownSeconds,
      deepAutoEnabled,
      frameInterval,
      gpuEndpoint,
      modelId,
      motionProbeFrames,
      motionThreshold,
      visionMode,
    },
    testNote: noteOverride.trim() || 'No human truth note provided yet.',
    version: 1,
  }), [
    ambientGate,
    assessments,
    ambientChangeThreshold,
    ambientGateIntervalSeconds,
    cooldownSeconds,
    debugNote,
    deepAutoEnabled,
    detectorEnabled,
    detectorStatus,
    frameInterval,
    gpuEndpoint,
    gpuServerStatus,
    isActive,
    isMirrored,
    modelId,
    modelStatus,
    motionThreshold,
    sceneEvents,
    sceneMemory,
    visionMode,
  ])

  const copyDebugPacket = useCallback(async () => {
    const packet = buildDebugPacket()
    const packetText = JSON.stringify(packet, null, 2)
    try {
      await navigator.clipboard.writeText(packetText)
      setDebugStatus(`Copied ${packet.sceneEvents.length} sensor events and ${packet.assessments.length} assessments.`)
    } catch {
      setDebugStatus('Clipboard copy failed. Use Download packet instead.')
    }
  }, [buildDebugPacket])

  const downloadDebugPacket = useCallback(() => {
    const packet = buildDebugPacket()
    const packetText = JSON.stringify(packet, null, 2)
    const blob = new Blob([packetText], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = debugPacketFilename(packet.generatedAt)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setDebugStatus(`Downloaded ${packet.sceneEvents.length} sensor events and ${packet.assessments.length} assessments.`)
  }, [buildDebugPacket])

  const addSceneEvent = useCallback((event: SceneEvent, options: { logFeed?: boolean } = {}) => {
    const previousEvent = sceneEventsRef.current[0]
    const duplicateWindowMs = event.type === 'detector' ? 10000 : 45000
    if (
      previousEvent
      && previousEvent.detail === event.detail
      && Math.abs(new Date(previousEvent.timestamp).getTime() - new Date(event.timestamp).getTime()) < duplicateWindowMs
    ) {
      return
    }
    lastSceneEventAtRef.current = Date.now()
    setSceneEvents((current) => {
      const next = [event, ...current].slice(0, sceneEventHistoryLimit)
      sceneEventsRef.current = next
      window.localStorage.setItem(sceneEventsStorageKey, JSON.stringify(next))
      return next
    })
    const nextMemory: SceneMemory = {
      ...sceneMemoryRef.current,
      activity: event.type === 'settled'
        ? settleActivityFromMemory(sceneMemoryRef.current.activity)
        : event.type === 'object'
          ? 'object_in_hand'
          : event.type === 'motion'
            ? 'moving'
            : sceneMemoryRef.current.activity,
      confidence: Math.max(sceneMemoryRef.current.confidence, event.type === 'settled' ? 54 : 62),
      lastEventAt: event.timestamp,
      motionRegion: event.region,
      presence: event.type === 'left' ? 'away' : event.type === 'entered' || event.type === 'presence' ? 'present' : sceneMemoryRef.current.presence,
    }
    nextMemory.summary = summarizeScene(nextMemory)
    sceneMemoryRef.current = nextMemory
    setSceneMemory(nextMemory)
    window.localStorage.setItem(sceneMemoryStorageKey, JSON.stringify(nextMemory))

    if (options.logFeed) {
      setAssessments((current) => prependAssessment(current, {
        brightness: 0,
        kind: 'event',
        mode: visionMode,
        motion: event.motion,
        note: event.detail,
        timestamp: event.timestamp,
        trigger: `sensor ${event.type}`,
      }))
    }
  }, [visionMode])

  const refreshGpuServerHealth = useCallback(async () => {
    setGpuServerStatus('Checking local GPU server...')
    try {
      const health = await checkGpuServerHealth(gpuEndpoint.trim() || defaultGpuEndpoint)
      const provider = health.provider || 'no GPU provider'
      setGpuServerStatus(`${health.ok ? 'Online' : 'Unavailable'}: ${provider}. ${health.detail || ''}`)
    } catch (error) {
      setGpuServerStatus(error instanceof Error ? error.message : 'Local GPU server health check failed.')
    }
  }, [gpuEndpoint])

  const captureAndAssess = useCallback(async (trigger = 'manual', forceAssessment = true, logRoutineCheck = true) => {
    const video = videoRef.current
    if (!video || video.readyState < 2 || isSendingRef.current) return

    try {
      const width = 320
      const height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * width))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Snapshot canvas unavailable.')
      if (isMirrored) {
        context.translate(width, 0)
        context.scale(-1, 1)
      }
      context.drawImage(video, 0, 0, width, height)
      const image = context.getImageData(0, 0, width, height)
      const brightness = averageBrightness(image.data)
      const previousFrame = previousFrameRef.current
      const motion = frameDelta(image.data, previousFrame, width, height)
      const region = motionRegion(image.data, previousFrame, width, height)
      previousFrameRef.current = new Uint8ClampedArray(image.data)
      const brightnessDelta = lastBrightnessRef.current == null ? 0 : Math.abs(brightness - lastBrightnessRef.current)
      lastBrightnessRef.current = brightness
      const timestamp = new Date().toISOString()
      let note = localNote(brightness, motion)
      const now = Date.now()
      const interestingFrame = interestingFrameRef.current
      const gateChangeScore = frameDelta(image.data, interestingFrame, width, height)
      const baselineAgeSeconds = lastMeaningfulChangeAtRef.current == null
        ? 0
        : Math.round((now - lastMeaningfulChangeAtRef.current) / 1000)

      if (!forceAssessment && gateChangeScore == null) {
        interestingFrameRef.current = new Uint8ClampedArray(image.data)
        lastMeaningfulChangeAtRef.current = now
        setAmbientGate({
          baselineAgeSeconds: 0,
          changeScore: null,
          dwellSeconds: 0,
          lastMeaningfulChangeAt: timestamp,
          mode: 'initializing',
          threshold: ambientChangeThreshold,
        })
        setStatus('Layer 1 gate initialized the first interesting-frame baseline.')
        return
      }

      if (!forceAssessment && gateChangeScore != null && gateChangeScore < ambientChangeThreshold) {
        setAmbientGate({
          baselineAgeSeconds,
          changeScore: gateChangeScore,
          dwellSeconds: baselineAgeSeconds,
          lastMeaningfulChangeAt: lastMeaningfulChangeAtRef.current == null ? null : new Date(lastMeaningfulChangeAtRef.current).toISOString(),
          mode: 'discarded',
          threshold: ambientChangeThreshold,
        })
        setStatus(`Layer 1 gate discarded frame: ${gateChangeScore}% change is below ${ambientChangeThreshold}%.`)
        return
      }

      if (forceAssessment) {
        setAmbientGate((current) => ({
          ...current,
          changeScore: gateChangeScore,
          mode: 'manual',
          threshold: ambientChangeThreshold,
        }))
      } else {
        interestingFrameRef.current = new Uint8ClampedArray(image.data)
        lastMeaningfulChangeAtRef.current = now
        setAmbientGate({
          baselineAgeSeconds,
          changeScore: gateChangeScore,
          dwellSeconds: baselineAgeSeconds,
          lastMeaningfulChangeAt: timestamp,
          mode: 'passed',
          threshold: ambientChangeThreshold,
        })
      }

      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.68)
      const currentFrame: BufferedVisionFrame = {
        brightness,
        height,
        imageDataUrl,
        motion,
        timestamp,
        timeMs: now,
        width,
      }
      frameBufferRef.current = [...frameBufferRef.current, currentFrame]
        .filter((frame) => now - frame.timeMs <= bufferedFrameWindowMs)
        .slice(-12)
      const cooldownOpen = now - lastAssessmentAtRef.current >= cooldownSeconds * 1000
      const signal = baselineSignal(memoryRef.current, brightness, motion, brightnessDelta)
      const meaningfulMotion = motion != null && motion >= motionThreshold
      const meaningfulLightChange = brightnessDelta >= 14
      const learnedChange = signal.learnedMotionShift || signal.learnedBrightnessShift
      const mildLearnedMotion = signal.ready
        && motion != null
        && motion >= Math.max((memoryRef.current.averageMotion ?? 0) + 3, 5)
      motionTrailRef.current = mildLearnedMotion
        ? Math.min(motionTrailRef.current + 1, 4)
        : Math.max(motionTrailRef.current - 1, 0)
      const sceneEventOpen = now - lastSceneEventAtRef.current >= sceneEventCooldownMs
      if (!forceAssessment && sceneEventOpen && motion != null) {
        if (motion >= 18 || (signal.ready && signal.motionDelta >= 7)) {
          addSceneEvent({
            detail: `Real-time sensor: strong movement detected in the ${region} region.`,
            motion,
            region,
            timestamp,
            type: 'motion',
          }, { logFeed: true })
        } else if (motionTrailRef.current === 2) {
          addSceneEvent({
            detail: `Real-time sensor: sustained mild movement is building in the ${region} region.`,
            motion,
            region,
            timestamp,
            type: 'motion',
          })
        } else if (
          motion <= 2
          && ['moving', 'object_in_hand', 'standing'].includes(sceneMemoryRef.current.activity)
        ) {
          addSceneEvent({
            detail: sceneMemoryRef.current.activity === 'standing'
              ? 'Real-time sensor: standing movement settled; treating posture as likely seated.'
              : sceneMemoryRef.current.activity === 'object_in_hand'
                ? 'Real-time sensor: held-object movement settled; treating posture as likely seated.'
                : 'Real-time sensor: movement settled back to baseline.',
            motion,
            region,
            timestamp,
            type: 'settled',
          })
        }
      }

      const detectorOpen = now - lastDetectorAtRef.current >= detectorEventCooldownMs
      const shouldRunDetector = detectorEnabled
        && !forceAssessment
        && detectorOpen
        && (
          (motion != null && motion >= 4)
          || frameCountRef.current % detectorProbeFrames === 0
        )
      if (shouldRunDetector) {
        lastDetectorAtRef.current = now
        void detectKimObjects(canvas, setDetectorStatus)
          .then((detections) => {
            const detectionSummary = summarizeKimDetections(detections)
            const labels = detectionSummary.labels.slice(0, 5)
            const previousSceneSummary = sceneMemoryRef.current.summary
            const nextSceneMemory = sceneMemoryFromDetections(sceneMemoryRef.current, detections, timestamp, region)
            sceneMemoryRef.current = nextSceneMemory
            setSceneMemory(nextSceneMemory)
            if (labels.length && nextSceneMemory.summary !== previousSceneSummary) {
              addSceneEvent({
                detail: `Detector saw ${labels.join(', ')}.`,
                motion,
                region,
                timestamp,
                type: 'detector',
              })
            }
          })
          .catch((error: unknown) => {
            setDetectorStatus({
              detail: error instanceof Error ? error.message : 'Local detector failed.',
              stage: 'error',
            })
          })
      }
      const sustainedLearnedMotion = signal.ready && motionTrailRef.current >= 2
      const strongLearnedMotion = signal.ready
        && motion != null
        && motion >= Math.max((memoryRef.current.averageMotion ?? 0) + 8, 12)
      const strongMotionCooldownOpen = now - lastAssessmentAtRef.current >= strongMotionCooldownSeconds * 1000
      const sustainedMotionCooldownOpen = now - lastAssessmentAtRef.current >= sustainedMotionCooldownSeconds * 1000
      const triggerReason = triggerFromSignals(forceAssessment, motion, brightnessDelta, signal, motionThreshold)
      const shouldAssess = forceAssessment
        || (cooldownOpen && (meaningfulMotion || meaningfulLightChange || learnedChange || sustainedLearnedMotion))
        || (strongMotionCooldownOpen && strongLearnedMotion)
        || (sustainedMotionCooldownOpen && sustainedLearnedMotion)

      if (!shouldAssess) {
        const nextMemory = updateVisionMemory(memoryRef.current, brightness, motion, timestamp)
        memoryRef.current = nextMemory
        if (!logRoutineCheck) return
        const quietNote = quietCheckNote(brightness, motion, nextMemory)
        setAssessments((current) => prependAssessment(current, {
          brightness,
          kind: 'check',
          mode: visionMode,
          motion,
          note: quietNote,
          timestamp,
          trigger: 'routine check',
        }))
        setStatus(signal.ready
          ? `Routine check logged. Motion ${motion == null ? 'baseline' : `${motion}%`} is within learned baseline.`
          : `Routine check logged. Motion ${motion == null ? 'baseline' : `${motion}%`} stays below ${motionThreshold}%.`)
        return
      }

      const assessmentTrigger = triggerReason
        || (sustainedLearnedMotion && motion != null ? `sustained motion ${motion}%` : trigger)
      motionTrailRef.current = 0
      const bufferedFrame = forceAssessment ? null : selectBufferedMotionFrame(frameBufferRef.current, now)
      const assessmentFrame = bufferedFrame || currentFrame
      const frameSource = bufferedFrame && bufferedFrame !== currentFrame ? 'motion-start snapshot' : 'trigger snapshot'
      note = localNote(assessmentFrame.brightness, assessmentFrame.motion)
      const runDeepAssessment = forceAssessment || deepAutoEnabled
      if (runDeepAssessment) {
        isSendingRef.current = true
        setIsSending(true)
        setStatus(`Frame captured; assessing ${frameSource} for ${assessmentTrigger}.`)
      }

      if (!runDeepAssessment) {
        note = signal.ready && learnedChange
          ? `Learned-baseline change noticed: ${assessmentTrigger}. ${localNote(assessmentFrame.brightness, assessmentFrame.motion)} Usual light ${memoryRef.current.averageBrightness ?? brightness}%, usual motion ${memoryRef.current.averageMotion ?? 0}%. Deep assessment skipped to keep the dashboard responsive.`
          : `Change noticed: ${assessmentTrigger}. ${localNote(assessmentFrame.brightness, assessmentFrame.motion)} Deep assessment skipped to keep the dashboard responsive.`
      }

      if (runDeepAssessment && visionMode === 'gpuServer') {
        try {
          note = await postGpuServerAssessment(gpuEndpoint.trim() || defaultGpuEndpoint, assessmentFrame.imageDataUrl, {
            brightness: assessmentFrame.brightness,
            frameCount: frameCountRef.current,
            frameSource,
            height: assessmentFrame.height,
            motion: assessmentFrame.motion,
            timestamp: assessmentFrame.timestamp,
            width: assessmentFrame.width,
          })
          note = cleanModelObservation(note, localNote(assessmentFrame.brightness, assessmentFrame.motion))
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Local GPU server failed.'
          note = `${localNote(assessmentFrame.brightness, assessmentFrame.motion)} Local GPU server unavailable: ${message}`
        }
      }

      if (runDeepAssessment && visionMode === 'moondream') {
        try {
          note = await assessWithMoondream(assessmentFrame.imageDataUrl, assessmentPrompt, modelId.trim() || defaultMoondreamModelId, setModelStatus)
          note = cleanModelObservation(note, localNote(assessmentFrame.brightness, assessmentFrame.motion))
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Local Moondream failed.'
          setModelStatus({ detail: message, stage: 'error' })
          note = `${localNote(assessmentFrame.brightness, assessmentFrame.motion)} Local Moondream was unavailable: ${message}`
        }
      }

      if (runDeepAssessment && visionMode === 'proxy' && endpoint.trim()) {
        note = await postVisionAssessment(endpoint.trim(), assessmentFrame.imageDataUrl, {
          brightness: assessmentFrame.brightness,
          frameCount: frameCountRef.current,
          frameSource,
          height: assessmentFrame.height,
          motion: assessmentFrame.motion,
          timestamp: assessmentFrame.timestamp,
          width: assessmentFrame.width,
        })
        note = cleanModelObservation(note, localNote(assessmentFrame.brightness, assessmentFrame.motion))
      }

      lastAssessmentAtRef.current = now
      const nextMemory = updateVisionObservation(memoryRef.current, assessmentFrame.timestamp, runDeepAssessment ? note : undefined)
      memoryRef.current = nextMemory
      if (runDeepAssessment) {
        const previousSceneSummary = sceneMemoryRef.current.summary
        const nextSceneMemory = sceneMemoryFromObservation(sceneMemoryRef.current, note, assessmentFrame.timestamp, region, {
          forceAssessment,
          motion: assessmentFrame.motion,
        })
        sceneMemoryRef.current = nextSceneMemory
        setSceneMemory(nextSceneMemory)
        if (nextSceneMemory.summary !== previousSceneSummary) {
          addSceneEvent({
            detail: `Scene memory updated: ${nextSceneMemory.summary}`,
            motion: assessmentFrame.motion,
            region,
            timestamp: assessmentFrame.timestamp,
            type: nextSceneMemory.activity === 'object_in_hand' ? 'object' : 'presence',
          })
        } else if (/\bstanding|stands|stood\b/i.test(note) && forceAssessment) {
          addSceneEvent({
            detail: 'Manual caption suggested standing, but scene memory held posture because the live sensor did not confirm movement.',
            motion: assessmentFrame.motion,
            region,
            timestamp: assessmentFrame.timestamp,
            type: 'unknown',
          })
        }
      }
      setAssessments((current) => prependAssessment(current, {
        brightness: assessmentFrame.brightness,
        durationMs: Date.now() - now,
        kind: runDeepAssessment ? 'observation' : 'notice',
        mode: visionMode,
        motion: assessmentFrame.motion,
        note,
        timestamp: assessmentFrame.timestamp,
        trigger: bufferedFrame && bufferedFrame !== currentFrame ? `${assessmentTrigger} · buffered` : assessmentTrigger,
      }))
      setStatus(visionMode === 'moondream'
        ? runDeepAssessment ? `Local Moondream pass complete: ${assessmentTrigger}.` : `Change logged without deep model: ${assessmentTrigger}.`
        : visionMode === 'gpuServer'
          ? runDeepAssessment ? `Local GPU server pass complete: ${assessmentTrigger}.` : `Change logged without deep model: ${assessmentTrigger}.`
        : visionMode === 'proxy' && endpoint.trim()
          ? `Proxy KIM assessment received: ${assessmentTrigger}.`
          : `Local frame stats captured: ${assessmentTrigger}.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Vision assessment failed.')
    } finally {
      isSendingRef.current = false
      setIsSending(false)
    }
  }, [addSceneEvent, ambientChangeThreshold, cooldownSeconds, deepAutoEnabled, detectorEnabled, endpoint, gpuEndpoint, isMirrored, modelId, motionThreshold, visionMode])

  useEffect(() => {
    if (videoRef.current) attachVideo(videoRef.current)
  }, [attachVideo, isActive])

  useEffect(() => {
    window.localStorage.setItem(endpointStorageKey, endpoint)
  }, [endpoint])

  useEffect(() => {
    window.localStorage.setItem(gpuEndpointStorageKey, gpuEndpoint)
  }, [gpuEndpoint])

  useEffect(() => {
    window.localStorage.setItem(visionModeStorageKey, visionMode)
  }, [visionMode])

  useEffect(() => {
    window.localStorage.setItem(modelStorageKey, modelId)
  }, [modelId])

  useEffect(() => {
    window.localStorage.setItem(motionThresholdStorageKey, String(motionThreshold))
  }, [motionThreshold])

  useEffect(() => {
    window.localStorage.setItem(frameIntervalStorageKey, String(frameInterval))
  }, [frameInterval])

  useEffect(() => {
    window.localStorage.setItem(ambientGateIntervalStorageKey, String(ambientGateIntervalSeconds))
  }, [ambientGateIntervalSeconds])

  useEffect(() => {
    window.localStorage.setItem(ambientChangeThresholdStorageKey, String(ambientChangeThreshold))
  }, [ambientChangeThreshold])

  useEffect(() => {
    window.localStorage.setItem(cooldownStorageKey, String(cooldownSeconds))
  }, [cooldownSeconds])

  useEffect(() => {
    window.localStorage.setItem(deepAutoStorageKey, String(deepAutoEnabled))
  }, [deepAutoEnabled])

  useEffect(() => {
    window.localStorage.setItem(detectorEnabledStorageKey, String(detectorEnabled))
  }, [detectorEnabled])

  useEffect(() => {
    window.localStorage.setItem(assessmentLogStorageKey, JSON.stringify(assessments))
  }, [assessments])

  useEffect(() => {
    sceneMemoryRef.current = sceneMemory
  }, [sceneMemory])

  useEffect(() => {
    sceneEventsRef.current = sceneEvents
  }, [sceneEvents])

  useEffect(() => {
    if (!enabled || !isActive) return undefined
    let cancelled = false
    let requestId = 0

    function tick() {
      if (cancelled) return
      frameCountRef.current += 1
      const now = Date.now()
      if (now - lastGateCheckAtRef.current >= ambientGateIntervalSeconds * 1000) {
        lastGateCheckAtRef.current = now
        void captureAndAssess('ambient gate', false, false)
      }
      requestId = window.requestAnimationFrame(tick)
    }

    requestId = window.requestAnimationFrame(tick)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(requestId)
    }
  }, [ambientGateIntervalSeconds, captureAndAssess, enabled, isActive])

  return (
    <article className="panel panel-wide kim-vision-panel">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Panel 09</p>
          <h2>KIM Vision</h2>
        </div>
        <span className="panel-badge">{enabled && isActive ? 'Sampling' : 'Standby'}</span>
      </div>

      <video aria-hidden="true" className="kim-vision-hidden-video" muted playsInline ref={videoRef} />

      <div className="kim-vision-console">
        <div>
          <strong>{isActive ? 'Camera feed available' : 'Camera required'}</strong>
          <span>{effectiveStatus}</span>
        </div>
        <label className="camera-toggle">
          <input checked={enabled && isActive} disabled={!isActive} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
          <span>Analyze</span>
        </label>
      </div>

      <div className="kim-vision-controls">
        <label htmlFor="kim-vision-mode">
          <span>Analysis mode</span>
          <select id="kim-vision-mode" onChange={(event) => setVisionMode(event.target.value as VisionMode)} value={visionMode}>
            <option value="gpuServer">Local GPU Server</option>
            <option value="moondream">Local Moondream</option>
            <option value="proxy">Proxy endpoint</option>
            <option value="stats">Local stats only</option>
          </select>
        </label>
        <label htmlFor="kim-vision-interval">
          <span>Gate interval seconds</span>
          <input
            id="kim-vision-interval"
            max={60}
            min={2}
            onChange={(event) => setAmbientGateIntervalSeconds(Number(event.target.value))}
            step={1}
            type="number"
            value={ambientGateIntervalSeconds}
          />
        </label>
        <label htmlFor="kim-ambient-threshold">
          <span>Change threshold</span>
          <input
            id="kim-ambient-threshold"
            max={40}
            min={1}
            onChange={(event) => setAmbientChangeThreshold(Number(event.target.value))}
            step={1}
            type="number"
            value={ambientChangeThreshold}
          />
        </label>
        <label htmlFor="kim-vision-threshold">
          <span>Motion trigger</span>
          <input
            id="kim-vision-threshold"
            max={60}
            min={6}
            onChange={(event) => setMotionThreshold(Number(event.target.value))}
            step={1}
            type="number"
            value={motionThreshold}
          />
        </label>
        <label htmlFor="kim-vision-cooldown">
          <span>Cooldown seconds</span>
          <input
            id="kim-vision-cooldown"
            max={600}
            min={15}
            onChange={(event) => setCooldownSeconds(Number(event.target.value))}
            step={5}
            type="number"
            value={cooldownSeconds}
          />
        </label>
        <label className="camera-toggle kim-vision-deep-auto">
          <input checked={deepAutoEnabled} onChange={(event) => setDeepAutoEnabled(event.target.checked)} type="checkbox" />
          <span>Deep auto</span>
        </label>
        <label className="camera-toggle kim-vision-deep-auto">
          <input checked={detectorEnabled} onChange={(event) => setDetectorEnabled(event.target.checked)} type="checkbox" />
          <span>Detector</span>
        </label>
        <label htmlFor="kim-vision-model">
          <span>HF model</span>
          <input
            disabled={visionMode !== 'moondream'}
            id="kim-vision-model"
            onChange={(event) => setModelId(event.target.value)}
            placeholder={defaultMoondreamModelId}
            type="text"
            value={modelId}
          />
        </label>
        {visionMode === 'gpuServer' ? (
          <label htmlFor="kim-vision-gpu-endpoint">
            <span>GPU server</span>
            <input
              id="kim-vision-gpu-endpoint"
              onChange={(event) => setGpuEndpoint(event.target.value)}
              placeholder={defaultGpuEndpoint}
              type="url"
              value={gpuEndpoint}
            />
          </label>
        ) : null}
        {visionMode === 'proxy' ? (
          <label htmlFor="kim-vision-endpoint">
            <span>Vision endpoint</span>
            <input
              id="kim-vision-endpoint"
              onChange={(event) => setEndpoint(event.target.value)}
              placeholder="Proxy endpoint for KIM vision"
              type="url"
              value={endpoint}
            />
          </label>
        ) : null}
      </div>

      <div className="camera-actions">
        <button
          disabled={visionMode !== 'moondream' || modelStatus.stage === 'loading' || modelStatus.stage === 'analyzing'}
          onClick={() => void loadMoondream(modelId.trim() || defaultMoondreamModelId, setModelStatus).catch((error: unknown) => {
            setModelStatus({ detail: error instanceof Error ? error.message : 'Moondream failed to load.', stage: 'error' })
          })}
          type="button"
        >
          {modelStatus.stage === 'loading' ? 'Loading model...' : 'Load model'}
        </button>
        <button disabled={!isActive || isSending} onClick={() => void captureAndAssess('manual', true)} type="button">
          {isSending ? 'Assessing...' : 'Analyze now'}
        </button>
        <button disabled={visionMode !== 'gpuServer'} onClick={() => void refreshGpuServerHealth()} type="button">
          Check server
        </button>
        <button
          disabled={detectorStatus.stage === 'loading' || detectorStatus.stage === 'detecting'}
          onClick={() => void loadKimObjectDetector(setDetectorStatus).catch((error: unknown) => {
            setDetectorStatus({ detail: error instanceof Error ? error.message : 'Local detector failed to load.', stage: 'error' })
          })}
          type="button"
        >
          {detectorStatus.stage === 'loading' ? 'Loading detector...' : 'Load detector'}
        </button>
        <button disabled={assessments.length === 0} onClick={() => setAssessments([])} type="button">
          Clear log
        </button>
      </div>

      <div className={`kim-vision-model-status ${modelStatus.stage}`}>
        <strong>{visionMode === 'gpuServer' ? 'Local GPU server' : visionMode === 'moondream' ? 'Browser model' : visionMode === 'proxy' ? 'Remote endpoint' : 'Cost-free stats'}</strong>
        <span>{visionMode === 'moondream'
          ? deepAutoEnabled
            ? `${modelStatus.detail} Automatic changes can run Moondream.`
            : `${modelStatus.detail} Automatic changes log fast; Analyze now runs Moondream.`
          : visionMode === 'gpuServer'
            ? `${gpuServerStatus} Automatic changes ${deepAutoEnabled ? 'can call' : 'log fast; Analyze now calls'} ${gpuEndpoint || defaultGpuEndpoint}.`
          : visionMode === 'proxy'
            ? 'Snapshots are sent only to the configured proxy endpoint.'
            : 'No image leaves the browser; only brightness and motion are computed.'}</span>
      </div>

      <div className={`kim-vision-model-status ${detectorStatus.stage}`}>
        <strong>Local detector</strong>
        <span>{detectorEnabled
          ? `${detectorStatus.detail} Runs every ${detectorProbeFrames} frames or on meaningful motion.`
          : 'Detector disabled. KIM is relying on motion probes and caption enrichment.'}</span>
      </div>

      <div className={`kim-vision-model-status ${ambientGate.mode === 'passed' ? 'ready' : ambientGate.mode === 'discarded' ? 'idle' : ambientGate.mode}`}>
        <strong>Layer 1 change gate</strong>
        <span>
          {ambientGate.mode === 'initializing'
            ? `Waiting for the first baseline frame. Sampling every ${ambientGateIntervalSeconds}s.`
            : ambientGate.mode === 'discarded'
              ? `Silent: ${ambientGate.changeScore}% change is below ${ambientGate.threshold}%. Dwell ${ambientGate.dwellSeconds}s.`
              : ambientGate.mode === 'manual'
                ? 'Manual Analyze bypassed the ambient gate.'
                : `Passed: ${ambientGate.changeScore}% change met ${ambientGate.threshold}%. Previous baseline age ${ambientGate.baselineAgeSeconds}s.`}
        </span>
      </div>

      <div className="kim-scene-awareness">
        <div>
          <p className="eyebrow">Situational Awareness V2</p>
          <strong>{sceneMemory.summary}</strong>
          <span>Confidence {sceneMemory.confidence}% · Last motion region {sceneMemory.motionRegion} · Detector {detectorEnabled ? detectorStatus.stage : 'off'}</span>
        </div>
        <div className="kim-scene-metrics">
          <span data-state={sceneMemory.presence}>{sceneMemory.presence}</span>
          <span>{sceneMemory.activity.replace(/_/g, ' ')}</span>
          <span>{sceneMemory.entities.length ? sceneMemory.entities.join(', ') : 'learning entities'}</span>
        </div>
        <div className="kim-scene-events">
          {sceneEvents.length === 0 ? (
            <span>No sensor events yet.</span>
          ) : (
            <>
              <span className="kim-scene-events-summary">Showing {Math.min(sceneEvents.length, sceneEventDisplayLimit)} of {sceneEvents.length} stored sensor events.</span>
              {sceneEvents.slice(0, sceneEventDisplayLimit).map((event, index) => (
                <span key={`${event.timestamp}-${event.type}-${index}`}>
                  {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(event.timestamp))}
                  {' · '}
                  {event.detail}
                </span>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="kim-debug-export">
        <label htmlFor="kim-debug-note">
          <span>Test note</span>
          <textarea
            id="kim-debug-note"
            onChange={(event) => setDebugNote(event.target.value)}
            placeholder="What actually happened? Example: I stood up slowly, left the chair empty, then came back holding a cup."
            rows={3}
            value={debugNote}
          />
        </label>
        <div>
          <button onClick={() => void copyDebugPacket()} type="button">Copy packet</button>
          <button onClick={downloadDebugPacket} type="button">Download packet</button>
        </div>
        <p>{debugStatus}</p>
      </div>

      <div className="kim-vision-feed">
        {assessments.length === 0 ? (
          <p>No assessments yet. Start the camera, enable analysis, or click Analyze now.</p>
        ) : assessments.map((assessment, index) => (
          <div data-kind={assessment.kind || 'observation'} key={assessmentKey(assessment, index)}>
            <strong>{new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(assessment.timestamp))}</strong>
            <p>{assessment.note}</p>
            <span>
              {assessment.trigger}
              {' · '}
              {visionModeLabel(assessment.mode)}
              {formatDuration(assessment.durationMs) ? ` · ${formatDuration(assessment.durationMs)}` : ''}
              {' · '}
              {assessment.kind === 'event' ? 'Sensor event' : `Light ${assessment.brightness}%`}
              {' · '}
              Motion {assessment.motion == null ? 'baseline' : `${assessment.motion}%`}
            </span>
          </div>
        ))}
      </div>
    </article>
  )
}
