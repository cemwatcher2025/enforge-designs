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

export function TrainStationPage() {
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const rare = tick > 45

  return (
    <RoomChrome room="train station" className="train-page">
      <section className="platform">
        <div className="station-clock">{new Date(tick * 1000).toISOString().slice(14, 19)}</div>
        <h1>ARRIVALS</h1>
        {trains.map((train) => <button key={train} onClick={() => navigate(destinations[train])} type="button">{train}</button>)}
        {rare && <button className="rare-train" onClick={() => navigate('/dream')} type="button">Rare train: Observatory Dream</button>}
      </section>
    </RoomChrome>
  )
}
