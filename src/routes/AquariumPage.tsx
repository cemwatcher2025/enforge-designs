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
        click where the fish bumps the glass
      </button>
      <div className="fish fish-one">tune</div>
      <div className="fish fish-two">the</div>
      <div className="fish fish-three">static</div>
      <p>{state.machineSettings.waterValve ? 'A machine valve has lowered the water. A tunnel breathes below.' : 'The water presses every clue flat.'}</p>
      {cracked && <button onClick={() => navigate('/radio')} type="button">crack becomes radio room</button>}
      {state.machineSettings.waterValve && <button onClick={() => navigate('/machine')} type="button">hidden tunnel to machine</button>}
      <button onClick={() => navigate('/observatory')} type="button">follow the fish-shaped star</button>
    </RoomChrome>
  )
}
