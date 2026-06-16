import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'

export function ObservatoryPage() {
  const navigate = useNavigate()
  const [pattern, setPattern] = useState<number[]>([])

  function clickStar(index: number) {
    setPattern((current) => [...current.slice(-4), index])
  }

  const eye = pattern.join('-').includes('1-3-4-5-7')

  return (
    <RoomChrome room="observatory" className="observatory-page">
      <div className="telescope" onClick={() => navigate('/machine')} role="button" tabIndex={0}>telescope: machine silhouette</div>
      <section className="star-field">
        {Array.from({ length: 12 }, (_, index) => (
          <button
            key={index}
            className={`star star-${index}`}
            type="button"
            onClick={() => clickStar(index)}
            aria-label={`star ${index}`}
          />
        ))}
      </section>
      <p>The stars are not above you.</p>
      {eye && <button type="button" onClick={() => navigate('/aquarium')}>the eye constellation looks down into water</button>}
    </RoomChrome>
  )
}
