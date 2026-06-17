import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'
import { useDiscovery } from '../components/useDiscovery'
import { ArtifactIcon } from '../components/ArtifactIcon'

const files: Record<string, string> = {
  K: 'KIM-001: Unauthorized command detected.',
  C: 'CORRIDOR-404: False end confirmed.',
  D: 'DESKTOP-098: Do not empty the bin unless you mean it.',
  A: 'AQUARIUM-SEA: Water level tied to machine valve.',
  O: 'OBSERVER: User has visited rooms.',
  R: 'RADIO: tune the static until it says dream.',
  W: 'WATER: file drips upward.',
  T: 'TRAIN: a platform waits for patience.',
}

export function ArchivePage() {
  const navigate = useNavigate()
  const { state } = useDiscovery()
  const [opened, setOpened] = useState('')
  const [sequence, setSequence] = useState('')

  function drawer(letter: string) {
    setOpened(letter)
    setSequence((current) => (current + letter).slice(-5))
  }

  return (
    <RoomChrome room="archive" className="archive-page">
      <section className="cabinet-grid">
        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
          <button key={letter} type="button" onClick={() => drawer(letter)}>
            <ArtifactIcon name={['K', 'C', 'D', 'A', 'O', 'R', 'W', 'T'].includes(letter) ? 'file' : 'folder'} size="sm" />
            {letter}
          </button>
        ))}
      </section>
      <article className="file-card">
        <h1>{opened || 'closed drawer'}</h1>
        <p>{opened === 'O' ? `OBSERVER: User has visited ${state.visitedPages.length} rooms.` : files[opened] || 'This folder contains only paper-shaped silence.'}</p>
        {sequence.endsWith('KIM') && <button onClick={() => navigate('/kim')} type="button">K-I-M route</button>}
        {sequence.endsWith('WATER') && <button onClick={() => navigate('/aquarium')} type="button">W-A-T-E-R route</button>}
        {sequence.endsWith('RADIO') && <button onClick={() => navigate('/radio')} type="button">R-A-D-I-O route</button>}
      </article>
    </RoomChrome>
  )
}
