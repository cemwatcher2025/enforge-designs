import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'
import { useDiscovery } from '../components/useDiscovery'

const paintings = [
  ['1995', 'The Corridor Remembers', '/gallery/corridor-remembers.png'],
  ['1998', 'Still Life with Deleted File', '/gallery/deleted-file.png'],
  ['2001', 'Portrait of K.I.M.', '/gallery/kim-portrait.png'],
  ['2003', 'The Door That Opens Sideways', '/gallery/sideways-door.png'],
] as const

export function GalleryPage() {
  const navigate = useNavigate()
  const { discoverCommand } = useDiscovery()
  const [sequence, setSequence] = useState('')

  return (
    <RoomChrome room="art gallery" className="gallery-page">
      <section className="gallery-wall">
        {paintings.map(([date, title, image]) => (
          <button
            key={title}
            className="painting"
            onMouseEnter={() => title.includes('K.I.M.') && discoverCommand('kim')}
            onClick={() => setSequence((value) => (value + date.slice(-1)).slice(-8))}
            type="button"
          >
            <img src={image} alt="" />
            <span>{title}</span>
            <small>{date}</small>
          </button>
        ))}
      </section>
      {sequence.includes('5813') && <button type="button" onClick={() => navigate('/mirror')}>dates align into reflection</button>}
    </RoomChrome>
  )
}
