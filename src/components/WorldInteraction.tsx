import type { WorldInteractionLog, WorldObject } from '../hooks/useWorld'

type WorldInteractionProps = {
  interactions: WorldInteractionLog[]
  selectedObject: WorldObject | null
  onInteract: (object: WorldObject) => void
}

function actionLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function timeLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function WorldInteraction({ interactions, selectedObject, onInteract }: WorldInteractionProps) {
  return (
    <>
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
                <dd>{selectedObject.interactable ? actionLabel(selectedObject.interactionType) : 'Static'}</dd>
              </div>
            </dl>
            <button disabled={!selectedObject.interactable} onClick={() => onInteract(selectedObject)} type="button">
              {actionLabel(selectedObject.interactionType)}
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
              <span>{actionLabel(interaction.type)}</span>
              <em>{interaction.objectId} · {timeLabel(interaction.timestamp)}</em>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
