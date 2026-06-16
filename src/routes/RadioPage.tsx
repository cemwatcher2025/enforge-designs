import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'

const messages: Record<string, string> = {
  '90.8': 'desktop signal',
  '101.3': 'corridor still transmitting',
  '56': 'dial-up clue',
  '3': 'knock clue',
  '19.95': 'archive/90s clue',
  '7.77': 'dream signal',
}

export function RadioPage() {
  const navigate = useNavigate()
  const [frequency, setFrequency] = useState(101.3)
  const [speakerHits, setSpeakerHits] = useState(0)
  const key = Object.keys(messages).find((value) => Math.abs(Number(value) - frequency) < 0.08)

  return (
    <RoomChrome room="radio room" className="radio-page">
      <section className="radio-console">
        <div className="waveform" />
        <input min="1" max="110" step="0.01" type="range" value={frequency} onChange={(event) => setFrequency(Number(event.target.value))} />
        <strong>{frequency.toFixed(2)}</strong>
        <p>{key ? messages[key] : 'ssssshhh.... rooms drift through the static ....'}</p>
        <button type="button" onClick={() => setSpeakerHits((value) => value + 1)}>speaker</button>
        {key === '90.8' && <button onClick={() => navigate('/desktop')} type="button">enter signal</button>}
        {key === '7.77' && <button onClick={() => navigate('/dream')} type="button">sleep through static</button>}
        {key === '3' && speakerHits >= 3 && <button onClick={() => navigate('/waiting-room')} type="button">third knock answered</button>}
      </section>
    </RoomChrome>
  )
}
