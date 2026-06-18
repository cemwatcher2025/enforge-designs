import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'

const stars = [
  { left: 10, top: 18 },
  { left: 34, top: 28 },
  { left: 62, top: 14 },
  { left: 45, top: 42 },
  { left: 56, top: 49 },
  { left: 68, top: 42 },
  { left: 20, top: 66 },
  { left: 52, top: 68 },
  { left: 76, top: 72 },
  { left: 88, top: 20 },
  { left: 28, top: 80 },
  { left: 6, top: 46 },
] as const

const telescopeViews = [
  'machine silhouette',
  'water where the sky should be',
  'a corridor folded into a constellation',
  'five bright points blink back: 1 3 4 5 7',
]

export function ObservatoryPage() {
  const navigate = useNavigate()
  const [pattern, setPattern] = useState<number[]>([])
  const [telescope, setTelescope] = useState(0)

  function clickStar(index: number) {
    setPattern((current) => [...current.slice(-4), index])
  }

  const eye = pattern.join('-').includes('1-3-4-5-7')
  const selected = pattern.slice(-5)
  const activeView = telescopeViews[telescope % telescopeViews.length]

  return (
    <RoomChrome room="observatory" className="observatory-page">
      <section className="observatory-console">
        <button
          className="telescope"
          onClick={() => setTelescope((value) => value + 1)}
          type="button"
        >
          telescope: {activeView}
        </button>
        <div className="star-log">
          <span>last five points</span>
          <strong>{selected.length ? selected.join(' - ') : 'unmarked'}</strong>
        </div>
        {activeView.includes('machine') && <button type="button" onClick={() => navigate('/machine')}>follow the brass silhouette</button>}
      </section>
      <section className="star-field">
        <svg className="constellation-lines" viewBox="0 0 100 100" aria-hidden="true">
          {selected.slice(1).map((star, index) => {
            const previous = stars[selected[index]]
            const current = stars[star]
            return (
              <line
                key={`${selected[index]}-${star}-${index}`}
                x1={previous.left}
                y1={previous.top}
                x2={current.left}
                y2={current.top}
              />
            )
          })}
        </svg>
        {stars.map((star, index) => (
          <button
            key={index}
            className={`star star-${index} ${selected.includes(index) ? 'selected' : ''}`}
            style={{ left: `${star.left}%`, top: `${star.top}%` }}
            type="button"
            onClick={() => clickStar(index)}
            aria-label={`star ${index}`}
          />
        ))}
      </section>
      <p>{eye ? 'The eye constellation opens downward.' : 'The stars are not above you. They are filed under water.'}</p>
      {eye && <button type="button" onClick={() => navigate('/aquarium')}>the eye constellation looks down into water</button>}
    </RoomChrome>
  )
}
