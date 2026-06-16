import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'
import { useDiscovery } from '../components/useDiscovery'

export function ElevatorPage() {
  const navigate = useNavigate()
  const { state } = useDiscovery()
  const [display, setDisplay] = useState('0')
  const [sequence, setSequence] = useState<string[]>([])
  const buttons = ['-10', '-5', '0', '1', '2', '3', '4', '5', ...(state.kimVisited ? ['?'] : []), '98']

  function press(floor: string) {
    setDisplay(floor)
    const next = [...sequence.slice(-3), floor]
    setSequence(next)
    if (floor === '1') navigate('/terminal')
    if (floor === '2') navigate('/corridor')
    if (floor === '3') setDisplay('maintenance note: machine room below')
    if (floor === '4') navigate('/mirror')
    if (floor === '98') navigate('/desktop')
    if (floor === '?' || next.join('-') === '9-8-?') navigate('/kim')
    if (next.join('-').includes('-10--5-0')) navigate('/machine')
  }

  return (
    <RoomChrome room="elevator" className="elevator-page">
      <section className="elevator-cab">
        <div className="floor-display">{display}</div>
        <div className="elevator-buttons">
          {buttons.map((floor) => <button key={floor} type="button" onClick={() => press(floor)}>{floor}</button>)}
        </div>
        <p>0: Lobby not found. -10: You are under the map. -5: archive dust.</p>
      </section>
    </RoomChrome>
  )
}
