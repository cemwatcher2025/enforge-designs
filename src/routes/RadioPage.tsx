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

const stations = Object.keys(messages).map(Number).sort((a, b) => a - b)

function clampFrequency(value: number) {
  return Math.min(110, Math.max(1, Number(value.toFixed(2))))
}

export function RadioPage() {
  const navigate = useNavigate()
  const [frequency, setFrequency] = useState(101.3)
  const [speakerHits, setSpeakerHits] = useState(0)
  const key = Object.keys(messages).find((value) => Math.abs(Number(value) - frequency) < 0.08)

  function tune(delta: number) {
    setFrequency((value) => clampFrequency(value + delta))
  }

  return (
    <RoomChrome room="radio room" className="radio-page">
      <section className="radio-console">
        <div className="waveform" />
        <input
          min="1"
          max="110"
          step="0.01"
          type="range"
          value={frequency}
          onChange={(event) => setFrequency(Number(event.target.value))}
          aria-label="radio frequency slider"
        />
        <div className="radio-dial">
          <button type="button" onClick={() => tune(-0.01)}>-</button>
          <input
            aria-label="radio frequency"
            min="1"
            max="110"
            step="0.01"
            type="number"
            value={frequency.toFixed(2)}
            onChange={(event) => setFrequency(clampFrequency(Number(event.target.value)))}
          />
          <button type="button" onClick={() => tune(0.01)}>+</button>
        </div>
        <div className="station-row">
          {stations.map((station) => (
            <button
              key={station}
              className={key === String(station) ? 'active' : ''}
              type="button"
              onClick={() => setFrequency(station)}
            >
              {station.toFixed(station % 1 === 0 ? 0 : 2)}
            </button>
          ))}
        </div>
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
