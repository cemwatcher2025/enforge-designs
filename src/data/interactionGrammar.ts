export const roamInteractionIds = [
  'examine',
  'inspect',
  'discover',
  'identify',
  'catalog',
  'read',
  'listen',
  'scan',
  'trace',
  'decode',
  'investigate',
  'locate',
  'research',
  'track',
  'diagnose',
  'repair',
  'restore',
  'rebuild',
  'replace_component',
  'clean',
  'lubricate',
  'reconnect',
  'calibrate',
  'upgrade',
  'test',
  'activate',
  'deactivate',
  'open',
  'close',
  'unlock',
  'rotate',
  'raise_lower',
  'redirect',
  'drain',
  'fill',
  'illuminate',
  'observe',
  'operate',
  'navigate',
  'collect',
  'harvest',
  'mine',
  'cut',
  'dig',
  'pry',
  'lift',
  'carry',
  'place',
  'combine',
  'craft',
  'plant',
  'build',
  'talk',
  'ask',
  'teach',
  'learn',
  'trade',
  'deliver',
  'assist',
  'recruit',
  'collaborate',
  'share_knowledge',
  'interpret',
  'encourage',
  'celebrate',
] as const

export type RoamInteractionId = typeof roamInteractionIds[number]

const roamInteractionIdSet = new Set<string>(roamInteractionIds)

export const interactionGrammarReference = {
  csv: 'world-design/interaction-library.csv',
  json: 'world-design/interaction-library.json',
  markdown: 'world-design/interaction-library.md',
  sourcePdf: 'ROAM_Interaction_Library.pdf',
} as const

export function isRoamInteractionId(value: unknown): value is RoamInteractionId {
  return typeof value === 'string' && roamInteractionIdSet.has(value)
}

export function getObjectInteractionChain(object: {
  interactionType?: unknown
  interactions?: unknown
  properties?: Record<string, unknown>
}) {
  const rootInteractions = Array.isArray(object.interactions)
    ? object.interactions.filter(isRoamInteractionId)
    : []
  const propertyInteractions = Array.isArray(object.properties?.interactionChain)
    ? object.properties.interactionChain.filter(isRoamInteractionId)
    : []
  const primary = isRoamInteractionId(object.interactionType) ? object.interactionType : 'examine'
  const chain = rootInteractions.length > 0
    ? rootInteractions
    : propertyInteractions.length > 0
      ? propertyInteractions
      : [primary]

  return chain.length > 0 ? chain : [primary]
}

export function getPrimaryWorldInteraction(object: {
  interactionType?: unknown
  interactions?: unknown
  properties?: Record<string, unknown>
}) {
  return getObjectInteractionChain(object)[0]
}

export function formatInteractionLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
