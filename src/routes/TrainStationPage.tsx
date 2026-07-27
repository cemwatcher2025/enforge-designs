import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'

const trains = ['Terminal', 'Corridor', 'Mirror', 'Library', 'Nowhere', 'The Long Way Back']
const destinations: Record<string, string> = {
  Terminal: '/terminal',
  Corridor: '/corridor',
  Mirror: '/mirror',
  Library: '/library',
  Nowhere: '/train-station',
  'The Long Way Back': '/corridor',
}

const boardClues = [
  ['TERMINAL', 'ON TIME', 'Commands become rooms when spoken plainly.'],
  ['CORRIDOR', 'DELAYED', 'The end of the hall is not the end of the hall.'],
  ['K.I.M.', 'WATCHING', 'Ask observer after she has indexed you.'],
  ['DESKTOP', 'RESTORED', 'Deleted files sometimes return as exits.'],
  ['ARCHIVE', 'COMPRESSING', 'Drawer Z is too large until the machine helps.'],
  ['AQUARIUM', 'LOW WATER', 'Tune the static after the glass gives way.'],
  ['RADIO', 'STATIC', 'Three knocks answer at frequency 3.'],
  ['OBSERVATORY', 'ABOVE BELOW', 'Five points make an eye: 1 3 4 5 7.'],
  ['GALLERY', 'LAST DIGITS', 'The dates remember only their tails.'],
  ['ELEVATOR', 'BETWEEN', 'Under the map, archive dust, lobby not found.'],
] as const

export function TrainStationPage() {
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const rare = tick > 45
  const boardStart = Math.floor(tick / 4) % boardClues.length
  const visibleClues = Array.from({ length: 4 }, (_, index) => boardClues[(boardStart + index) % boardClues.length])

  return (
    <RoomChrome room="train station" className="train-page">
      <section className="platform">
        <div className="station-clock">{new Date(tick * 1000).toISOString().slice(14, 19)}</div>
        <h1>ARRIVALS</h1>
        <div className="arrival-board" aria-label="arrival board clues">
          <div className="arrival-board-header">
            <span>destination</span>
            <span>status</span>
            <span>announcement</span>
          </div>
          {visibleClues.map(([destination, status, clue]) => (
            <div className="arrival-row" key={`${destination}-${status}`}>
              <strong>{destination}</strong>
              <span>{status}</span>
              <p>{clue}</p>
            </div>
          ))}
        </div>
        {trains.map((train) => <button key={train} onClick={() => navigate(destinations[train])} type="button">{train}</button>)}
        {rare && <button className="rare-train" onClick={() => navigate('/dream')} type="button">Rare train: Observatory Dream</button>}
      </section>
    </RoomChrome>
  )
}
