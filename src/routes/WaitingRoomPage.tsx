import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'
import { useDiscovery } from '../components/useDiscovery'

const magazinePages = [
  {
    title: 'Ten doors that were actually rooms',
    kicker: 'Architectural Digestive, issue 404',
    image: '/magazine/doors.png',
    copy: 'Experts recommend knocking before entering a metaphor.',
  },
  {
    title: 'Is your clock watching you?',
    kicker: 'Timekeeping & suspicion',
    image: '/magazine/clock.png',
    copy: 'If the second hand pauses, pretend you did not notice.',
  },
  {
    title: 'Why waiting works',
    kicker: 'Patience special',
    image: '/magazine/patience.png',
    copy: 'GOOD THINGS COME TO THOSE WHO STAY. Terminal command: wait.',
  },
  {
    title: 'Vending machine refuses exact change',
    kicker: 'Consumer reports from nowhere',
    image: '/magazine/vending.png',
    copy: 'Dispensing patience. Item caught between seconds.',
  },
]

export function WaitingRoomPage() {
  const navigate = useNavigate()
  const { discoverCommand } = useDiscovery()
  const [seconds, setSeconds] = useState(0)
  const [page, setPage] = useState(0)
  const magazine = magazinePages[page]

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <RoomChrome room="waiting room" className="waiting-page">
      <section className="chairs">
        <div className="clock" onClick={() => seconds % 60 === 0 && navigate('/elevator')} role="button" tabIndex={0}>
          <span>{seconds}s</span>
        </div>
        <button
          className="magazine"
          type="button"
          onClick={() => {
            if (magazine.copy.includes('Terminal command: wait')) discoverCommand('wait')
            setPage((value) => (value + 1) % magazinePages.length)
          }}
        >
          <img src={magazine.image} alt="" />
          <span>{magazine.kicker}</span>
          <strong>{magazine.title}</strong>
          <em>{magazine.copy}</em>
        </button>
        <div className="waiting-status">
          <p>The door shadow is {seconds > 30 ? 'almost a shape' : 'only a darker rectangle'}.</p>
          {seconds > 60 && <button onClick={() => navigate('/train-station')} type="button">door with no handle opens</button>}
        </div>
      </section>
    </RoomChrome>
  )
}
