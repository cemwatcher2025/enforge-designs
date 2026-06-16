import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'
import { useDiscovery } from '../components/useDiscovery'

export function MachineRoomPage() {
  const navigate = useNavigate()
  const { state, setMachineSetting } = useDiscovery()
  const [leverA, setLeverA] = useState(false)
  const [leverB, setLeverB] = useState(false)
  const [leverC, setLeverC] = useState(false)
  const running = leverA && !leverB && leverC

  return (
    <RoomChrome room="machine room" className="machine-page">
      <section className="machine-core">
        <label><input type="checkbox" checked={state.machineSettings.waterValve} onChange={(event) => setMachineSetting('waterValve', event.target.checked)} /> Water Valve</label>
        <label><input type="checkbox" checked={state.machineSettings.corridorLights} onChange={(event) => setMachineSetting('corridorLights', event.target.checked)} /> Corridor Light Switch</label>
        <label>Signal Dial <input type="range" min="1" max="110" step="0.1" value={state.machineSettings.signal} onChange={(event) => setMachineSetting('signal', Number(event.target.value))} /></label>
        <label><input type="checkbox" onChange={(event) => setMachineSetting('archiveCompressed', event.target.checked)} /> Archive Compressor</label>
        <div className="levers">
          <button onClick={() => setLeverA((value) => !value)} type="button">I</button>
          <button onClick={() => setLeverB((value) => !value)} type="button">II</button>
          <button onClick={() => setLeverC((value) => !value)} type="button">III</button>
        </div>
        {running && <p className="paper-strip">A changed room is still the same room.</p>}
        {state.machineSettings.waterValve && <button onClick={() => navigate('/aquarium')} type="button">wet service hatch</button>}
        {Math.abs(state.machineSettings.signal - 90.8) < 0.4 && <button onClick={() => navigate('/radio')} type="button">signal conduit</button>}
        <button onClick={() => navigate('/corridor')} type="button">emergency hatch</button>
      </section>
    </RoomChrome>
  )
}
