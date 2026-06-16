import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'
import { useDiscovery } from '../components/useDiscovery'

const symbols = [
  ['apple', '/gallery'],
  ['key', '/archive'],
  ['fish', '/aquarium'],
  ['monitor', '/desktop'],
  ['book', '/library'],
  ['eye', '/observatory'],
  ['train ticket', '/train-station'],
  ['zipper', '/corridor'],
  ['valve', '/machine'],
  ['broken clock', '/waiting-room'],
  ['wireframe head', '/kim'],
] as const

export function DreamPage() {
  const navigate = useNavigate()
  const { discoverCommand } = useDiscovery()
  const [clicked, setClicked] = useState<string[]>([])

  function choose(symbol: string, path: string) {
    setClicked((current) => [...current, symbol])
    if (['eye', 'fish', 'monitor', 'book', 'broken clock', 'wireframe head'].includes(symbol)) navigate(path)
    if (symbol === 'key') discoverCommand('library')
  }

  return (
    <RoomChrome room="dream" className="dream-page">
      <section className="dream-space">
        {symbols.map(([symbol, path], index) => (
          <button
            key={symbol}
            className={`dream-symbol symbol-${index}`}
            type="button"
            onClick={() => choose(symbol, path)}
          >
            {symbol}
          </button>
        ))}
      </section>
      {clicked.join(',').includes('apple,key,fish') && <button onClick={() => navigate('/terminal')} type="button">wake with a new command</button>}
    </RoomChrome>
  )
}
