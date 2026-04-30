import { useState } from "react";
import { Maximize, RotateCw } from "lucide-react";
import { useLayoutStore } from "@/store/layoutStore";

export function LeftPanel() {
  const layoutOrder = useLayoutStore((s) => s.layoutOrder);
  const layouts = useLayoutStore((s) => s.layouts);
  const currentLayoutId = useLayoutStore((s) => s.currentLayoutId);
  const selectedIds = useLayoutStore((s) => s.selectedIds);
  const createLayout = useLayoutStore((s) => s.createLayout);
  const renameLayout = useLayoutStore((s) => s.renameLayout);
  const deleteLayout = useLayoutStore((s) => s.deleteLayout);
  const selectLayout = useLayoutStore((s) => s.selectLayout);

  const hasSelection = selectedIds.length > 0;

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
              <span className="flex-1 truncate">Fit view</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                Shift + 1
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              disabled={!hasSelection}
              onClick={() =>
                window.dispatchEvent(new Event("rotate-selection"))
              }
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
              title={
                hasSelection
                  ? "Rotate selection 90°"
                  : "Select buildings to rotate"
              }
            >
              <RotateCw className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Rotate</span>
              <span className="shrink-0 text-xs text-muted-foreground">R</span>
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}
