import type { ArtifactIconName } from '../components/ArtifactIcon'

export const roomIcons: Record<string, ArtifactIconName> = {
  terminal: 'crt',
  corridor: 'door',
  kim: 'eye',
  desktop: 'folder',
  library: 'book',
  observatory: 'star',
  elevator: 'key',
  archive: 'file',
  aquarium: 'fish',
  radio: 'radio',
  'train station': 'ticket',
  'art gallery': 'mirror',
  machine: 'valve',
  'machine room': 'valve',
  mirror: 'mirror',
  'mirror room': 'mirror',
  'waiting room': 'clock',
  dream: 'apple',
}

export function iconForRoom(room: string): ArtifactIconName {
  return roomIcons[room.toLowerCase()] ?? 'key'
}

export function iconForDesktopItem(label: string): ArtifactIconName {
  if (label === 'Recycle Bin') return 'file'
  if (label === 'Dial-Up') return 'modem'
  if (label === 'Notepad' || label === 'ReadMe.txt' || label === 'Documents') return 'file'
  if (label === 'Paint') return 'mirror'
  if (label === 'Control Panel') return 'valve'
  if (label === 'Games') return 'star'
  if (label === 'Exit.exe') return 'door'
  return 'folder'
}

export function iconForDreamSymbol(symbol: string): ArtifactIconName {
  if (symbol.includes('apple')) return 'apple'
  if (symbol.includes('key')) return 'key'
  if (symbol.includes('fish')) return 'fish'
  if (symbol.includes('monitor')) return 'crt'
  if (symbol.includes('book')) return 'book'
  if (symbol.includes('eye') || symbol.includes('head')) return 'eye'
  if (symbol.includes('ticket')) return 'ticket'
  if (symbol.includes('zipper')) return 'zipper'
  if (symbol.includes('valve')) return 'valve'
  if (symbol.includes('clock')) return 'clock'
  return 'star'
}
