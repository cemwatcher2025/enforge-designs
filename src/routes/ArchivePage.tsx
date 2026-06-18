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

const cheatSheet = [
  'Terminal: explore/corridor opens the corridor; kim, desktop, library, mirror, dream, wait, and elevator are direct commands once discovered.',
  'Corridor: sliding latch opens Library; code 3141 opens Archive; zipper opens Dream; roll-up opens Machine; three knocks open Waiting Room.',
  'Corridor: stare at the eye door for three seconds to reach Observatory; type mirror at the reversed door; continue past END OF CORRIDOR for Gallery.',
  'K.I.M.: ask observer to reveal the observer command; desktop routes to Desktop; moving in a wide loop reveals return.',
  'Desktop: restore Recycle Bin or reveal hidden icons to find Exit.exe; Dial-Up searches for library, kim, stars, observer, elevator, or exit.',
  'Elevator: 1 terminal, 2 corridor, 4 mirror, 98 desktop, ? K.I.M.; press -10, -5, 0 for Machine.',
  'Library: spell ARCHIVE with the books; the Stars volume points to Observatory.',
  'Archive: drawer sequences KIM, WATER, and RADIO open their routes; compressed Z reveals this sheet.',
  'Machine: water valve lowers Aquarium water; signal near 90.8 opens Radio; corridor lights brighten Corridor.',
  'Aquarium: tap glass three times; fish say tune the static; water valve reveals Machine tunnel.',
  'Radio: tune 3 and hit speaker three times for Waiting Room; 7.77 opens Dream; 90.8 opens Desktop.',
  'Observatory: telescope cycles clues; star sequence 1-3-4-5-7 opens Aquarium.',
  'Gallery: click paintings in date order 1995, 1998, 2001, 2003 to align 5813 and open Mirror.',
  'Waiting Room: magazine discovers wait; after 60 seconds, the train station opens; clock at 0 seconds routes to Elevator.',
  'Train Station: wait more than 45 seconds for the rare train to Dream.',
  'Dream: key discovers library; eye/fish/monitor/book/clock/head symbols route to rooms; apple,key,fish reveals a wake button.',
]

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
            <ArtifactIcon name={['K', 'C', 'D', 'A', 'O', 'R', 'W', 'T', 'Z'].includes(letter) ? 'file' : 'folder'} size="sm" />
            {letter}
          </button>
        ))}
      </section>
      <article className="file-card">
        <h1>{opened || 'closed drawer'}</h1>
        {opened === 'Z' ? (
          state.machineSettings.archiveCompressed ? (
            <section className="cheat-sheet">
              <p>ZIP-000: compressed successfully. Contents restored as cheat sheet.</p>
              <ol>
                {cheatSheet.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </section>
          ) : (
            <p>ZIP-000: this file is too large to preview. Please compress archive before opening.</p>
          )
        ) : (
          <p>{opened === 'O' ? `OBSERVER: User has visited ${state.visitedPages.length} rooms.` : files[opened] || 'This folder contains only paper-shaped silence.'}</p>
        )}
        {sequence.endsWith('KIM') && <button onClick={() => navigate('/kim')} type="button">K-I-M route</button>}
        {sequence.endsWith('WATER') && <button onClick={() => navigate('/aquarium')} type="button">W-A-T-E-R route</button>}
        {sequence.endsWith('RADIO') && <button onClick={() => navigate('/radio')} type="button">R-A-D-I-O route</button>}
      </article>
    </RoomChrome>
  )
}
