import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'
import { useDiscovery } from '../components/useDiscovery'

export function AquariumPage() {
  const navigate = useNavigate()
  const { state, update } = useDiscovery()
  const [hits, setHits] = useState(0)
  const cracked = state.aquariumState.cracked || hits >= 3

  function tapGlass() {
    const next = hits + 1
    setHits(next)
    if (next >= 3) update({ aquariumState: { cracked: true, tunnelOpen: state.machineSettings.waterValve } })
  }

  return (
    <RoomChrome room="aquarium" className={`aquarium-page ${state.machineSettings.waterValve ? 'low-water' : ''}`}>
      <button className={`glass ${cracked ? 'cracked' : ''}`} type="button" onClick={tapGlass}>
        tap the glass three times
      </button>
      <div className="fish fish-one" aria-label="fish clue: tune">
        <span className="fish-tail" />
        <span className="fish-body">
          <span className="fish-eye" />
          <span className="fish-word">tune</span>
        </span>
        <span className="fish-fin fish-fin-top" />
        <span className="fish-fin fish-fin-bottom" />
      </div>
      <div className="fish fish-two" aria-label="fish clue: the">
        <span className="fish-tail" />
        <span className="fish-body">
          <span className="fish-eye" />
          <span className="fish-word">the</span>
        </span>
        <span className="fish-fin fish-fin-top" />
        <span className="fish-fin fish-fin-bottom" />
      </div>
      <div className="fish fish-three" aria-label="fish clue: static">
        <span className="fish-tail" />
        <span className="fish-body">
          <span className="fish-eye" />
          <span className="fish-word">static</span>
        </span>
        <span className="fish-fin fish-fin-top" />
        <span className="fish-fin fish-fin-bottom" />
      </div>
      <p>{state.machineSettings.waterValve ? 'A machine valve has lowered the water. A tunnel breathes below.' : 'The water presses every clue flat.'}</p>
      {cracked && <button onClick={() => navigate('/radio')} type="button">crack becomes radio room</button>}
      {state.machineSettings.waterValve && <button onClick={() => navigate('/machine')} type="button">hidden tunnel to machine</button>}
      <button onClick={() => navigate('/observatory')} type="button">follow the fish-shaped star</button>
    </RoomChrome>
  )
}
