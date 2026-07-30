import type { WorldInteractionLog, WorldObject } from '../hooks/useWorld'
import { formatInteractionLabel, getObjectInteractionChain, getPrimaryWorldInteraction } from '../data/interactionGrammar'

type WorldInteractionProps = {
  completedObjectiveCount: number
  currentObjective: {
    hint: string
    objectName: string
    title: string
  } | null
  interactions: WorldInteractionLog[]
  latestCompletedObjective: {
    complete: string
  } | null
  selectedObject: WorldObject | null
  onInteract: (object: WorldObject) => void
  totalObjectiveCount: number
}

function timeLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function WorldInteraction({
  completedObjectiveCount,
  currentObjective,
  interactions,
  latestCompletedObjective,
  selectedObject,
  onInteract,
  totalObjectiveCount,
}: WorldInteractionProps) {
  const selectedInteractionChain = selectedObject ? getObjectInteractionChain(selectedObject) : []
  const primaryInteraction = selectedObject ? getPrimaryWorldInteraction(selectedObject) : 'examine'

  return (
    <>
      <section className="world-panel-section world-objective">
        <strong>Current objective</strong>
        {currentObjective ? (
          <>
            <div className="world-objective-meter">
              <span>{completedObjectiveCount} / {totalObjectiveCount}</span>
              <div>
                <i style={{ width: `${(completedObjectiveCount / totalObjectiveCount) * 100}%` }} />
              </div>
            </div>
            <h3>{currentObjective.title}</h3>
            <p>{currentObjective.hint}</p>
          </>
        ) : (
          <>
            <div className="world-objective-meter">
              <span>{totalObjectiveCount} / {totalObjectiveCount}</span>
              <div>
                <i style={{ width: '100%' }} />
              </div>
            </div>
            <h3>Station restored</h3>
            <p>{latestCompletedObjective?.complete ?? 'Signal Station One is awake.'}</p>
          </>
        )}
      </section>

      <section className="world-panel-section world-details">
        <strong>Object details</strong>
        {selectedObject ? (
          <>
            <h3>{selectedObject.name}</h3>
            <p>{selectedObject.description || 'No description has been written for this object yet.'}</p>
            <dl>
              <div>
                <dt>Position</dt>
                <dd>{selectedObject.position.x}, {selectedObject.position.y}, {selectedObject.position.z}</dd>
              </div>
              <div>
                <dt>Interaction</dt>
                <dd>{selectedObject.interactable ? formatInteractionLabel(primaryInteraction) : 'Static'}</dd>
              </div>
            </dl>
            {selectedInteractionChain.length > 1 ? (
              <div className="world-interaction-chain" aria-label="Interaction chain">
                {selectedInteractionChain.map((interaction, index) => (
                  <span key={`${interaction}-${index}`}>
                    {formatInteractionLabel(interaction)}
                  </span>
                ))}
              </div>
            ) : null}
            <button disabled={!selectedObject.interactable} onClick={() => onInteract(selectedObject)} type="button">
              {formatInteractionLabel(primaryInteraction)}
            </button>
          </>
        ) : (
          <p>Select an object in the world to inspect it.</p>
        )}
      </section>

      <section className="world-panel-section">
        <strong>Interaction log</strong>
        <div className="world-interaction-log">
          {interactions.length === 0 ? (
            <p>No interactions logged yet.</p>
          ) : interactions.slice(-8).reverse().map((interaction, index) => (
            <div key={`${interaction.timestamp}-${interaction.objectId}-${index}`}>
              <span>{formatInteractionLabel(interaction.type)}</span>
              <em>{interaction.objectId} · {timeLabel(interaction.timestamp)}</em>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
