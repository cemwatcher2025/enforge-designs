import type { WorldObject } from '../hooks/useWorld'

type WorldObjectListProps = {
  interactedObjectIds: Set<string>
  objects: WorldObject[]
  selectedObjectId: string | null
  onFocusObject: (id: string) => void
  onSelectObject: (id: string | null) => void
}

export function WorldObjectList({
  interactedObjectIds,
  objects,
  selectedObjectId,
  onFocusObject,
  onSelectObject,
}: WorldObjectListProps) {
  return (
    <section className="world-panel-section">
      <strong>World objects</strong>
      <div className="world-object-list">
        {objects.length === 0 ? (
          <p>No objects in the persistent world yet.</p>
        ) : objects.map((object) => (
          <button
            data-active={selectedObjectId === object.id}
            data-attention={object.interactable && !interactedObjectIds.has(object.id)}
            key={object.id}
            onClick={() => {
              onSelectObject(object.id)
              onFocusObject(object.id)
            }}
            type="button"
          >
            <span>{object.name}</span>
            <em>{object.interactable ? object.interactionType : 'static'}</em>
          </button>
        ))}
      </div>
    </section>
  )
}
