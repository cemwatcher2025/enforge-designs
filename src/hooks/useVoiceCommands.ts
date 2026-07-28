import type { AdminConfig, PanelId, ThemeMode } from '../config'

export type VoiceCommandContext = {
  config: AdminConfig
  dashboardSummary: {
    ministryHours: string
    nextMeeting: string
    todayMeetings: number
    unreadEmails: number | null
  }
  onConfigChange: (config: AdminConfig) => void
  onPrefillMinistryHours: (hours: string, type: string) => void
}

export type VoiceCommandResult = {
  action?: 'sleep' | 'wake'
  heard: string
  response: string
}

const panelAliases: Record<string, PanelId> = {
  '3d': 'sandbox3d',
  '3d sandbox': 'sandbox3d',
  'coding': 'coding',
  'coding sandbox': 'coding',
  'comms': 'communications',
  'comms hub': 'communications',
  'communication': 'communications',
  'communications': 'communications',
  'communications hub': 'communications',
  'dashboard': 'logistics',
  'documents': 'documents',
  'docs': 'documents',
  'logistics': 'logistics',
  'ministry': 'ministry',
  'settings': 'settings',
}

function clean(text: string) {
  return text.toLowerCase().replace(/[^\w\s.]/g, ' ').replace(/\s+/g, ' ').trim()
}

function findPanel(text: string) {
  const normalized = clean(text)
  const candidates = Object.entries(panelAliases).sort((a, b) => b[0].length - a[0].length)
  return candidates.find(([alias]) => normalized.includes(alias))?.[1] ?? null
}

function updatePanelVisibility(config: AdminConfig, panelId: PanelId, visible: boolean) {
  const panels = config.panels.map((panel) => (
    panel.id === panelId ? { ...panel, visible } : panel
  ))
  return { ...config, panels }
}

function updateTheme(config: AdminConfig, theme: ThemeMode) {
  return { ...config, theme }
}

function commandList() {
  return 'Try: show Ministry, hide Documents, open Enforge Designs, switch to dark mode, show my ministry stats, how many unread emails, what is my next meeting, or KIM go to sleep.'
}

export function runVoiceCommand(text: string, context: VoiceCommandContext): VoiceCommandResult {
  const heard = clean(text)

  if (heard.includes('goodbye') || heard.includes('see you later') || heard.includes('go to sleep')) {
    return { action: 'sleep', heard, response: 'Goodbye Brandon. I will stand by quietly.' }
  }

  if (heard.includes('wake up')) {
    return { action: 'wake', heard, response: 'I am awake again.' }
  }

  if (heard.includes('what can you do') || heard === 'help' || heard.includes('available commands')) {
    return { heard, response: commandList() }
  }

  if (heard.includes('next meeting')) {
    return { heard, response: context.dashboardSummary.nextMeeting }
  }

  if (heard.includes('unread email') || heard.includes('unread emails')) {
    const count = context.dashboardSummary.unreadEmails
    return {
      heard,
      response: count === null ? 'Gmail unread count needs a connector before I can read it.' : `You have ${count} unread emails.`,
    }
  }

  if (heard.includes('ministry stats')) {
    context.onConfigChange(updatePanelVisibility(context.config, 'ministry', true))
    return { heard, response: `Ministry is open. Current month hours are ${context.dashboardSummary.ministryHours}.` }
  }

  const logMatch = heard.match(/log\s+(\d+(?:\.\d+)?)\s+hours?(?:\s+for\s+(.+))?/)
  if (logMatch) {
    const hours = logMatch[1]
    const type = logMatch[2] ?? 'field service'
    context.onConfigChange(updatePanelVisibility(context.config, 'ministry', true))
    context.onPrefillMinistryHours(hours, type)
    return { heard, response: `I opened Ministry and staged ${hours} hours for ${type}.` }
  }

  if (heard.includes('switch to dark') || heard.includes('dark mode')) {
    context.onConfigChange(updateTheme(context.config, 'dark'))
    return { heard, response: 'Dark mode is on.' }
  }

  if (heard.includes('switch to light') || heard.includes('light mode')) {
    context.onConfigChange(updateTheme(context.config, 'light'))
    return { heard, response: 'Light mode is on.' }
  }

  if (heard.startsWith('open ')) {
    const target = heard.replace(/^open\s+/, '')
    const project = context.config.projects.find((item) => item.name.toLowerCase().includes(target) || target.includes(item.name.toLowerCase()))
    if (project) {
      window.open(project.href, '_blank', 'noopener,noreferrer')
      return { heard, response: `Opening ${project.name}.` }
    }
  }

  if (heard.startsWith('show ')) {
    const panelId = findPanel(heard)
    if (panelId) {
      context.onConfigChange(updatePanelVisibility(context.config, panelId, true))
      return { heard, response: `Showing ${context.config.panels.find((panel) => panel.id === panelId)?.label ?? panelId}.` }
    }
  }

  if (heard.startsWith('hide ')) {
    const panelId = findPanel(heard)
    if (panelId) {
      context.onConfigChange(updatePanelVisibility(context.config, panelId, false))
      return { heard, response: `Hiding ${context.config.panels.find((panel) => panel.id === panelId)?.label ?? panelId}.` }
    }
  }

  return { heard, response: "I didn't catch that. Try saying help for available commands." }
}
