import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'
import { useDiscovery } from '../components/useDiscovery'

export function WaitingRoomPage() {
  const navigate = useNavigate()
  const { discoverCommand } = useDiscovery()
  const [seconds, setSeconds] = useState(0)

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
        <button className="magazine" type="button" onClick={() => discoverCommand('wait')}>
          GOOD THINGS COME TO THOSE WHO STAY. Terminal command: wait.
        </button>
        <p>The door shadow is {seconds > 30 ? 'almost a shape' : 'only a darker rectangle'}.</p>
        {seconds > 60 && <button onClick={() => navigate('/train-station')} type="button">door with no handle opens</button>}
      </section>
    </RoomChrome>
  )
}
