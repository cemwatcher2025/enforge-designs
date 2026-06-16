import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'
import { useDiscovery } from '../components/useDiscovery'

const paintings = [
  ['1995', 'The Corridor Remembers', '/corridor'],
  ['1998', 'Still Life with Deleted File', '/desktop'],
  ['2001', 'Portrait of K.I.M.', '/kim'],
  ['2003', 'The Door That Opens Sideways', '/mirror'],
] as const

export function GalleryPage() {
  const navigate = useNavigate()
  const { discoverCommand } = useDiscovery()
  const [sequence, setSequence] = useState('')

  return (
    <RoomChrome room="art gallery" className="gallery-page">
      <section className="gallery-wall">
        {paintings.map(([date, title, path]) => (
          <button
            key={title}
            className="painting"
            onMouseEnter={() => title.includes('K.I.M.') && discoverCommand('kim')}
            onClick={() => {
              setSequence((value) => {
                const next = value + date.slice(-1)
                if (title.includes('Sideways') && !next.includes('5813')) navigate(path)
                return next
              })
            }}
            type="button"
          >
            <span>{title}</span>
            <small>{date}</small>
          </button>
        ))}
      </section>
      {sequence.includes('5813') && <button type="button" onClick={() => navigate('/mirror')}>dates align into reflection</button>}
    </RoomChrome>
  )
}
