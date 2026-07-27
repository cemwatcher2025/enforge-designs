export type ServiceState = 'online' | 'pending' | 'offline'

export type Accent = 'cyan' | 'magenta' | 'lime' | 'orange'

export type PanelId = 'logistics' | 'communications' | 'coding' | 'documents' | 'sandbox3d' | 'ministry' | 'settings'

export type ThemeMode = 'dark' | 'light'

export type ProjectLink = {
  id: string
  name: string
  type: 'GitHub' | 'Replit' | 'Placeholder'
  href: string
  status: string
  detail: string
}

export type DocumentLink = {
  id: string
  title: string
  href: string
  tags: string[]
  detail: string
}

export type PanelConfig = {
  id: PanelId
  label: string
  visible: boolean
}

export type ApiEndpointConfig = {
  id: string
  name: string
  endpoint: string
}

export type CommsConfig = {
  gmailConnected: boolean
  calendarConnected: boolean
  gmailInboxUrl: string
  gmailComposeUrl: string
  calendarUrl: string
}

export type SandboxPresetId = 'empty-grid' | 'primitives' | 'terrain-test'

export type SandboxDemoModel = {
  id: string
  name: string
  preset: SandboxPresetId
  detail: string
}

export type Sandbox3DConfig = {
  demoModels: SandboxDemoModel[]
  presets: { id: SandboxPresetId; name: string; detail: string }[]
}

export type AdminConfig = {
  theme: ThemeMode
  activeProject: string
  panels: PanelConfig[]
  projects: ProjectLink[]
  documents: DocumentLink[]
  apiEndpoints: ApiEndpointConfig[]
  comms: CommsConfig
  sandbox3d: Sandbox3DConfig
}

export const defaultProjectLinks: ProjectLink[] = [
  {
    id: 'clearbid',
    name: 'ClearBid',
    type: 'Replit',
    href: 'https://price-library.replit.app',
    status: 'Live app',
    detail: 'Estimating, price library, job volume',
  },
  {
    id: 'ministry',
    name: 'Ministry Companion',
    type: 'GitHub',
    href: 'https://github.com/cemwatcher2025/ministry-companion',
    status: 'Repo found',
    detail: 'Service records, visits, studies',
  },
  {
    id: 'kim',
    name: 'KIM Assistant',
    type: 'Replit',
    href: 'https://kim-assistant.replit.app',
    status: 'Live app',
    detail: 'Assistant events, briefings, task flow',
  },
  {
    id: 'enforge',
    name: 'Enforge Designs',
    type: 'GitHub',
    href: 'https://github.com/cemwatcher2025/enforge-designs',
    status: 'Active repo',
    detail: 'Command center frontend, proxy, deployment',
  },
  {
    id: 'roam',
    name: 'ROAM',
    type: 'Placeholder',
    href: 'https://github.com/cemwatcher2025',
    status: 'Repo TBD',
    detail: 'Unreal Engine project placeholder',
  },
]

export const defaultDocumentLinks: DocumentLink[] = [
  {
    id: 'command-center-spec',
    title: 'Enforge Command Center Build Spec',
    href: 'https://docs.google.com/document/d/1efJpHdlcvMcxxNw_jsYDWLPvrjSQFWZnzr7a1hq1kD8',
    tags: ['spec', 'command center', 'phase plan', 'dashboard'],
    detail: 'Primary build spec and panel roadmap',
  },
]

export const defaultPanels: PanelConfig[] = [
  { id: 'logistics', label: 'Dashboard', visible: true },
  { id: 'communications', label: 'Comms Hub', visible: true },
  { id: 'coding', label: 'Coding Sandbox', visible: true },
  { id: 'documents', label: 'Documents', visible: true },
  { id: 'settings', label: 'Settings', visible: true },
  { id: 'sandbox3d', label: '3D Sandbox', visible: true },
  { id: 'ministry', label: 'Ministry', visible: true },
]

export const defaultApiEndpoints: ApiEndpointConfig[] = [
  { id: 'clearbid', name: 'ClearBid', endpoint: '/api/clearbid/estimates' },
  { id: 'ministry', name: 'Ministry Companion', endpoint: '/api/ministry/stats' },
  { id: 'kim', name: 'KIM Assistant', endpoint: '/api/kim/status' },
]

export const defaultCommsConfig: CommsConfig = {
  gmailConnected: false,
  calendarConnected: false,
  gmailInboxUrl: 'https://mail.google.com/mail/u/0/#inbox',
  gmailComposeUrl: 'https://mail.google.com/mail/u/0/#inbox?compose=new',
  calendarUrl: 'https://calendar.google.com/calendar/u/0/r',
}

export const defaultSandbox3DConfig: Sandbox3DConfig = {
  demoModels: [
    { id: 'primitives', name: 'Primitives', preset: 'primitives', detail: 'Cube, sphere, cylinder, and torus test scene' },
    { id: 'tree', name: 'Low-poly Tree', preset: 'primitives', detail: 'Simple geometric stand-in built in scene' },
    { id: 'building', name: 'Simple Building', preset: 'primitives', detail: 'Block-out building form for scale checks' },
    { id: 'terrain', name: 'Terrain Test', preset: 'terrain-test', detail: 'Lightweight heightmap terrain' },
  ],
  presets: [
    { id: 'empty-grid', name: 'Empty grid', detail: 'Clean floor, lights, and camera' },
    { id: 'primitives', name: 'Primitives', detail: 'Basic shapes arranged for material and transform tests' },
    { id: 'terrain-test', name: 'Terrain test', detail: 'Simple procedural height field' },
  ],
}

export const defaultAdminConfig: AdminConfig = {
  activeProject: 'enforge',
  apiEndpoints: defaultApiEndpoints,
  comms: defaultCommsConfig,
  documents: defaultDocumentLinks,
  panels: defaultPanels,
  projects: defaultProjectLinks,
  sandbox3d: defaultSandbox3DConfig,
  theme: 'dark',
}
