import { useMemo, useState } from "react";
import { Maximize, RotateCw, Undo2, Redo2 } from "lucide-react";
import { useLayoutStore, useTemporalStore } from "@/store/layoutStore";
import { BUILDING_TYPES_BY_KEY } from "@/data/buildings";

export function LeftPanel() {
  const layoutOrder = useLayoutStore((s) => s.layoutOrder);
  const layouts = useLayoutStore((s) => s.layouts);
  const currentLayoutId = useLayoutStore((s) => s.currentLayoutId);
  const selectedIds = useLayoutStore((s) => s.selectedIds);
  const armedTypeKey = useLayoutStore((s) => s.armedTypeKey);
  const rotateArmed = useLayoutStore((s) => s.rotateArmed);
  const rotateSelection = useLayoutStore((s) => s.rotateSelection);
  const currentLayout = layouts[currentLayoutId];

  const buildingCounts = useMemo(() => {
    if (!currentLayout) return [];
    const counts = new Map<string, number>();
    for (const b of Object.values(currentLayout.buildings)) {
      counts.set(b.typeKey, (counts.get(b.typeKey) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([key, count]) => ({
        key,
        count,
        name: BUILDING_TYPES_BY_KEY[key]?.name ?? key,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [currentLayout]);
  const createLayout = useLayoutStore((s) => s.createLayout);
  const renameLayout = useLayoutStore((s) => s.renameLayout);
  const deleteLayout = useLayoutStore((s) => s.deleteLayout);
  const selectLayout = useLayoutStore((s) => s.selectLayout);

  const canUndo = useTemporalStore((s) => s.pastStates.length > 0);
  const canRedo = useTemporalStore((s) => s.futureStates.length > 0);

  const hasSelection = selectedIds.length > 0;
  const canRotate = hasSelection || armedTypeKey !== null;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setDraftName(currentName);
  };

  const commitRename = () => {
    if (editingId && draftName.trim()) {
      renameLayout(editingId, draftName.trim());
    }
    setEditingId(null);
    setDraftName("");
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete layout "${name}"? This can't be undone.`)) {
      deleteLayout(id);
    }
  };

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r text-sm">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="font-medium">Layouts</h2>
        <button
          type="button"
          onClick={() => createLayout()}
          className="rounded px-2 py-0.5 text-xs hover:bg-accent"
          title="New layout"
        >
          + New
        </button>
      </div>
      <ul className="overflow-y-auto py-1">
        {layoutOrder.map((id) => {
          const layout = layouts[id];
          if (!layout) return null;
          const isCurrent = id === currentLayoutId;
          const isEditing = editingId === id;
          return (
            <li key={id} className="group">
              <div
                className={`flex items-center gap-1 px-2 py-1 ${
                  isCurrent ? "bg-accent" : "hover:bg-accent/50"
                }`}
              >
                {isEditing ? (
                  <input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") {
                        setEditingId(null);
                        setDraftName("");
                      }
                    }}
                    className="flex-1 rounded border bg-background px-1 py-0.5 text-sm"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => selectLayout(id)}
                    onDoubleClick={() => startRename(id, layout.name)}
                    className="flex-1 truncate text-left"
                    title={layout.name}
                  >
                    {layout.name}
                  </button>
                )}
                {!isEditing && (
                  <div className="flex shrink-0 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => startRename(id, layout.name)}
                      className="rounded px-1 text-xs hover:bg-background"
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(id, layout.name)}
                      className="rounded px-1 text-xs hover:bg-background"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t">
        <div className="px-3 py-2">
          <h2 className="font-medium">Actions</h2>
        </div>
        <ul className="py-1">
          <li>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("fit-view"))}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent"
              title="Fit view to content"
            >
              <Maximize className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Zoom to fit</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                Shift + 1
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              disabled={!canRotate}
              onClick={() => {
                if (armedTypeKey) {
                  rotateArmed();
                } else {
                  rotateSelection();
                }
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
              title={
                armedTypeKey
                  ? "Rotate placement 90°"
                  : hasSelection
                    ? "Rotate selection 90°"
                    : "Select buildings or arm a tool to rotate"
              }
            >
              <RotateCw className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Rotate</span>
              <span className="shrink-0 text-xs text-muted-foreground">R</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              disabled={!canUndo}
              onClick={() => useLayoutStore.temporal.getState().undo()}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
              title={canUndo ? "Undo" : "Nothing to undo"}
            >
              <Undo2 className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Undo</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                Ctrl + Z
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              disabled={!canRedo}
              onClick={() => useLayoutStore.temporal.getState().redo()}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
              title={canRedo ? "Redo" : "Nothing to redo"}
            >
              <Redo2 className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Redo</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                Ctrl + Shift + Z
              </span>
            </button>
          </li>
        </ul>
      </div>
      {buildingCounts.length > 0 && (
        <div className="mt-auto border-t">
          <div className="px-3 py-2">
            <h2 className="font-medium">Summary</h2>
          </div>
          <ul className="pb-3 text-xs">
            {buildingCounts.map(({ key, count, name }) => (
              <li key={key} className="flex items-center gap-2 px-3 leading-5">
                <span className="flex-1 truncate" title={name}>
                  {name}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
