import { BUILDING_TYPES } from "@/data/buildings";
import { useLayoutStore } from "@/store/layoutStore";

export function RightPanel() {
  const addBuildingFromType = useLayoutStore((s) => s.addBuildingFromType);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-l text-sm">
      <div className="border-b px-3 py-2">
        <h2 className="font-medium">Buildings</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Click to place on canvas
        </p>
      </div>
      <ul className="flex-1 overflow-y-auto py-1">
        {BUILDING_TYPES.map((type) => (
          <li key={type.key}>
            <button
              type="button"
              onClick={() => addBuildingFromType(type.key)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent"
            >
              <span
                className="h-4 w-4 shrink-0 rounded-sm border"
                style={{ backgroundColor: type.color }}
                aria-hidden
              />
              <span className="flex-1 truncate">{type.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {type.widthMeters}×{type.depthMeters}m
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
