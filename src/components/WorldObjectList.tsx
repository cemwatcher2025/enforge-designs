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
  const interactiveObjects = objects.filter((object) => object.interactable)
  const decorCount = objects.length - interactiveObjects.length

  return (
    <section className="world-panel-section">
      <strong>World objects</strong>
      {decorCount > 0 ? <p>{decorCount} decor pieces are part of the level but hidden from this interaction list.</p> : null}
      <div className="world-object-list">
        {interactiveObjects.length === 0 ? (
          <p>No objects in the persistent world yet.</p>
        ) : interactiveObjects.map((object) => (
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
