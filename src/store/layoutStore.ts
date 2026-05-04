import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  BuildingId,
  BuildingTypeKey,
  PlacedBuilding,
} from "@/types/building";
import { STORAGE_KEY, SNAP_UNIT_METERS } from "@/lib/constants";
import { BUILDING_TYPES } from "@/data/buildings";
import { computeLinearRun } from "@/lib/canvas";

export type LayoutId = string;

export interface Layout {
  id: LayoutId;
  name: string;
  buildings: Record<BuildingId, PlacedBuilding>;
}

type Rotation = PlacedBuilding["rotationDeg"];

export interface PointMeters {
  xMeters: number;
  yMeters: number;
}

interface LayoutState {
  layouts: Record<LayoutId, Layout>;
  layoutOrder: LayoutId[];
  currentLayoutId: LayoutId;
  selectedIds: BuildingId[];
  clipboard: PlacedBuilding[];
  armedTypeKey: BuildingTypeKey | null;
  armedRotationDeg: Rotation;
  linearAnchor: PointMeters | null;

  addBuilding: (building: PlacedBuilding) => void;
  placeBuildingAt: (
    typeKey: BuildingTypeKey,
    xMeters: number,
    yMeters: number,
    rotationDeg?: Rotation,
  ) => BuildingId | null;
  placeLinearRun: (
    typeKey: BuildingTypeKey,
    anchor: PointMeters,
    end: PointMeters,
    rotationDeg: Rotation,
  ) => BuildingId[];
  setLinearAnchor: (point: PointMeters | null) => void;
  armTool: (typeKey: BuildingTypeKey | null, rotationDeg?: Rotation) => void;
  rotateArmed: () => void;
  updateBuilding: (id: BuildingId, patch: Partial<PlacedBuilding>) => void;
  updateBuildings: (
    updates: Array<{ id: BuildingId; patch: Partial<PlacedBuilding> }>,
  ) => void;
  removeBuildings: (ids: BuildingId[]) => void;
  setSelection: (ids: BuildingId[]) => void;
  copySelection: () => void;
  pasteClipboard: () => void;
  clearAll: () => void;

  createLayout: (name?: string) => LayoutId;
  renameLayout: (id: LayoutId, name: string) => void;
  deleteLayout: (id: LayoutId) => void;
  selectLayout: (id: LayoutId) => void;
}

const snap = (m: number) => Math.round(m / SNAP_UNIT_METERS) * SNAP_UNIT_METERS;

const newId = () => crypto.randomUUID();

const makeEmptyLayout = (name = "Untitled layout"): Layout => ({
  id: newId(),
  name,
  buildings: {},
});

const updateCurrent = (
  state: LayoutState,
  fn: (layout: Layout) => Layout,
): Pick<LayoutState, "layouts"> => {
  const current = state.layouts[state.currentLayoutId];
  if (!current) return { layouts: state.layouts };
  return {
    layouts: { ...state.layouts, [current.id]: fn(current) },
  };
};

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => {
      const initial = makeEmptyLayout("Layout 1");
      return {
        layouts: { [initial.id]: initial },
        layoutOrder: [initial.id],
        currentLayoutId: initial.id,
        selectedIds: [],
        clipboard: [],
        armedTypeKey: null,
        armedRotationDeg: 0,
        linearAnchor: null,

        addBuilding: (building) =>
          set((s) =>
            updateCurrent(s, (l) => ({
              ...l,
              buildings: { ...l.buildings, [building.id]: building },
            })),
          ),

        placeBuildingAt: (typeKey, xMeters, yMeters, rotationDeg) => {
          const type = BUILDING_TYPES.find((t) => t.key === typeKey);
          if (!type) return null;
          const id = newId();
          const placed: PlacedBuilding = {
            id,
            typeKey,
            xMeters: snap(xMeters),
            yMeters: snap(yMeters),
            rotationDeg: rotationDeg ?? get().armedRotationDeg,
          };
          set((s) =>
            updateCurrent(s, (l) => ({
              ...l,
              buildings: { ...l.buildings, [id]: placed },
            })),
          );
          return id;
        },

        placeLinearRun: (typeKey, anchor, end, rotationDeg) => {
          const type = BUILDING_TYPES.find((t) => t.key === typeKey);
          if (!type) return [];
          const run = computeLinearRun(type, anchor, end, rotationDeg);

          const ids: BuildingId[] = [];
          const created: PlacedBuilding[] = run.segments.map((seg) => {
            const id = newId();
            ids.push(id);
            return {
              id,
              typeKey,
              xMeters: seg.xMeters,
              yMeters: seg.yMeters,
              rotationDeg: run.rotation,
            };
          });
          set((s) =>
            updateCurrent(s, (l) => {
              const next = { ...l.buildings };
              for (const b of created) next[b.id] = b;
              return { ...l, buildings: next };
            }),
          );
          return ids;
        },

        setLinearAnchor: (point) => set({ linearAnchor: point }),

        armTool: (typeKey, rotationDeg) =>
          set((s) => ({
            armedTypeKey: typeKey,
            // Reset rotation when switching tools (or disarming) so each
            // arming starts from a predictable orientation. An explicit
            // rotation overrides this — used when arming from an existing
            // building so the ghost matches its source.
            armedRotationDeg:
              rotationDeg !== undefined
                ? rotationDeg
                : typeKey === s.armedTypeKey
                  ? s.armedRotationDeg
                  : 0,
            linearAnchor: null,
          })),

        rotateArmed: () =>
          set((s) => ({
            armedRotationDeg: ((s.armedRotationDeg + 90) % 360) as Rotation,
          })),

        updateBuilding: (id, patch) =>
          set((s) =>
            updateCurrent(s, (l) => {
              const existing = l.buildings[id];
              if (!existing) return l;
              return {
                ...l,
                buildings: { ...l.buildings, [id]: { ...existing, ...patch } },
              };
            }),
          ),

        updateBuildings: (updates) =>
          set((s) =>
            updateCurrent(s, (l) => {
              const next = { ...l.buildings };
              for (const { id, patch } of updates) {
                const existing = next[id];
                if (!existing) continue;
                next[id] = { ...existing, ...patch };
              }
              return { ...l, buildings: next };
            }),
          ),

        removeBuildings: (ids) =>
          set((s) => ({
            ...updateCurrent(s, (l) => {
              const next = { ...l.buildings };
              for (const id of ids) delete next[id];
              return { ...l, buildings: next };
            }),
            selectedIds: s.selectedIds.filter((sid) => !ids.includes(sid)),
          })),

        setSelection: (ids) => set({ selectedIds: ids }),

        copySelection: () => {
          const { layouts, currentLayoutId, selectedIds } = get();
          const current = layouts[currentLayoutId];
          if (!current) return;
          set({
            clipboard: selectedIds
              .map((id) => current.buildings[id])
              .filter((b): b is PlacedBuilding => Boolean(b)),
          });
        },

        pasteClipboard: () => {
          const { clipboard } = get();
          if (clipboard.length === 0) return;
          const offset = snap(2);
          const newIds: BuildingId[] = [];
          const newBuildings: Record<BuildingId, PlacedBuilding> = {};
          for (const b of clipboard) {
            const id = newId();
            newIds.push(id);
            newBuildings[id] = {
              ...b,
              id,
              xMeters: snap(b.xMeters + offset),
              yMeters: snap(b.yMeters + offset),
            };
          }
          set((s) => ({
            ...updateCurrent(s, (l) => ({
              ...l,
              buildings: { ...l.buildings, ...newBuildings },
            })),
            selectedIds: newIds,
            // Update the clipboard so a subsequent paste cascades further.
            clipboard: Object.values(newBuildings),
          }));
        },

        clearAll: () =>
          set((s) => ({
            ...updateCurrent(s, (l) => ({ ...l, buildings: {} })),
            selectedIds: [],
            clipboard: [],
          })),

        createLayout: (name) => {
          const layout = makeEmptyLayout(
            name ?? `Layout ${get().layoutOrder.length + 1}`,
          );
          set((s) => ({
            layouts: { ...s.layouts, [layout.id]: layout },
            layoutOrder: [...s.layoutOrder, layout.id],
            currentLayoutId: layout.id,
            selectedIds: [],
          }));
          return layout.id;
        },

        renameLayout: (id, name) =>
          set((s) => {
            const existing = s.layouts[id];
            if (!existing) return s;
            return {
              layouts: { ...s.layouts, [id]: { ...existing, name } },
            };
          }),

        deleteLayout: (id) =>
          set((s) => {
            if (!s.layouts[id]) return s;
            const nextLayouts = { ...s.layouts };
            delete nextLayouts[id];
            const nextOrder = s.layoutOrder.filter((lid) => lid !== id);

            if (nextOrder.length === 0) {
              const fresh = makeEmptyLayout("Layout 1");
              return {
                layouts: { [fresh.id]: fresh },
                layoutOrder: [fresh.id],
                currentLayoutId: fresh.id,
                selectedIds: [],
                linearAnchor: null,
              };
            }

            const nextCurrent =
              s.currentLayoutId === id ? nextOrder[0] : s.currentLayoutId;
            return {
              layouts: nextLayouts,
              layoutOrder: nextOrder,
              currentLayoutId: nextCurrent,
              selectedIds: s.currentLayoutId === id ? [] : s.selectedIds,
              linearAnchor: s.currentLayoutId === id ? null : s.linearAnchor,
            };
          }),

        selectLayout: (id) =>
          set((s) =>
            s.layouts[id]
              ? { currentLayoutId: id, selectedIds: [], linearAnchor: null }
              : s,
          ),
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (s) => ({
        layouts: s.layouts,
        layoutOrder: s.layoutOrder,
        currentLayoutId: s.currentLayoutId,
      }),
      migrate: (persisted, version) => {
        if (version === 0 && persisted && typeof persisted === "object") {
          const old = persisted as {
            buildings?: Record<string, PlacedBuilding>;
          };
          const layout = makeEmptyLayout("Layout 1");
          layout.buildings = old.buildings ?? {};
          return {
            layouts: { [layout.id]: layout },
            layoutOrder: [layout.id],
            currentLayoutId: layout.id,
          };
        }
        return persisted as LayoutState;
      },
    },
  ),
);

export const useCurrentLayout = () =>
  useLayoutStore((s) => s.layouts[s.currentLayoutId]);
