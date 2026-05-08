import { create, useStore } from "zustand";
import { persist } from "zustand/middleware";
import { temporal } from "zundo";
import type {
  BuildingId,
  BuildingTypeKey,
  PlacedBuilding,
} from "@/types/building";
import { STORAGE_KEY, SNAP_UNIT_METERS } from "@/lib/constants";
import { BUILDING_TYPES } from "@/data/buildings";
import {
  buildingBounds,
  computeLinearRun,
  effectiveFootprint,
} from "@/lib/canvas";
import { BUILDING_TYPES_BY_KEY } from "@/data/buildings";
import { measureLabel, LABEL_PLACEHOLDER_TEXT } from "@/lib/labelMeasure";

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
  placeWall: (anchor: PointMeters, end: PointMeters) => BuildingId | null;
  setLinearAnchor: (point: PointMeters | null) => void;
  armTool: (typeKey: BuildingTypeKey | null, rotationDeg?: Rotation) => void;
  rotateArmed: () => void;
  updateBuilding: (id: BuildingId, patch: Partial<PlacedBuilding>) => void;
  updateBuildings: (
    updates: Array<{ id: BuildingId; patch: Partial<PlacedBuilding> }>,
  ) => void;
  rotateSelection: () => void;
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
    temporal(
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
              ...(type.isLabel
                ? {
                    text: LABEL_PLACEHOLDER_TEXT,
                    ...measureLabel(LABEL_PLACEHOLDER_TEXT),
                  }
                : {}),
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

          placeWall: (anchor, end) => {
            const x1 = snap(anchor.xMeters);
            const y1 = snap(anchor.yMeters);
            const x2 = snap(end.xMeters);
            const y2 = snap(end.yMeters);
            // Reject zero-length walls — usually a stray double-click.
            if (x1 === x2 && y1 === y2) return null;
            const id = newId();
            const placed: PlacedBuilding = {
              id,
              typeKey: "wall",
              xMeters: x1,
              yMeters: y1,
              rotationDeg: 0,
              endXMeters: x2,
              endYMeters: y2,
            };
            set((s) =>
              updateCurrent(s, (l) => ({
                ...l,
                buildings: { ...l.buildings, [id]: placed },
              })),
            );
            return id;
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
                  buildings: {
                    ...l.buildings,
                    [id]: { ...existing, ...patch },
                  },
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

          rotateSelection: () => {
            const { layouts, currentLayoutId, selectedIds } = get();
            if (selectedIds.length === 0) return;
            const current = layouts[currentLayoutId];
            if (!current) return;

            const items: Array<{
              b: PlacedBuilding;
              cx: number;
              cy: number;
            }> = [];
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            for (const id of selectedIds) {
              const b = current.buildings[id];
              if (!b) continue;
              const type = BUILDING_TYPES_BY_KEY[b.typeKey];
              if (!type) continue;
              const bounds = buildingBounds(b, type);
              const cx = bounds.x + bounds.width / 2;
              const cy = bounds.y + bounds.height / 2;
              items.push({ b, cx, cy });
              minX = Math.min(minX, bounds.x);
              minY = Math.min(minY, bounds.y);
              maxX = Math.max(maxX, bounds.x + bounds.width);
              maxY = Math.max(maxY, bounds.y + bounds.height);
            }
            if (items.length === 0) return;

            // Pivot at the combined AABB center so the whole selection rotates
            // as a rigid group. With a single selection this collapses to the
            // building's own center, matching in-place rotation.
            const pivotX = (minX + maxX) / 2;
            const pivotY = (minY + maxY) / 2;

            // 90° CW around pivot in screen coords (y-down): (dx,dy) -> (-dy,dx).
            const rotPoint = (x: number, y: number) => ({
              x: pivotX - (y - pivotY),
              y: pivotY + (x - pivotX),
            });

            const updates = items.map(({ b, cx, cy }) => {
              const type = BUILDING_TYPES_BY_KEY[b.typeKey]!;
              if (
                type.isWall &&
                b.endXMeters !== undefined &&
                b.endYMeters !== undefined
              ) {
                // Walls rotate by transforming both endpoints around the pivot.
                // The wall's length and angle are preserved.
                const a = rotPoint(b.xMeters, b.yMeters);
                const c = rotPoint(b.endXMeters, b.endYMeters);
                return {
                  id: b.id,
                  patch: {
                    xMeters: snap(a.x),
                    yMeters: snap(a.y),
                    endXMeters: snap(c.x),
                    endYMeters: snap(c.y),
                  },
                };
              }
              const newRot = ((b.rotationDeg + 90) % 360) as Rotation;
              const newEff = effectiveFootprint(type, newRot, b);
              const newCenter = rotPoint(cx, cy);
              return {
                id: b.id,
                patch: {
                  rotationDeg: newRot,
                  xMeters: snap(newCenter.x - newEff.widthMeters / 2),
                  yMeters: snap(newCenter.y - newEff.depthMeters / 2),
                },
              };
            });
            get().updateBuildings(updates);
          },

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
                ...(b.endXMeters !== undefined && b.endYMeters !== undefined
                  ? {
                      endXMeters: snap(b.endXMeters + offset),
                      endYMeters: snap(b.endYMeters + offset),
                    }
                  : {}),
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
        // Only put building data in the undo stack — UI state like selection,
        // clipboard, armed tool, and the in-progress belt anchor shouldn't
        // unwind on Ctrl+Z.
        partialize: (state) => ({ layouts: state.layouts }),
        // Skip no-op set() calls (e.g. setSelection) by ref-comparing layouts.
        equality: (a, b) => a.layouts === b.layouts,
        limit: 100,
      },
    ),
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

export const useTemporalStore = <T>(
  selector: (state: {
    pastStates: unknown[];
    futureStates: unknown[];
    undo: (steps?: number) => void;
    redo: (steps?: number) => void;
    clear: () => void;
  }) => T,
): T => useStore(useLayoutStore.temporal, selector);

export const useCurrentLayout = () =>
  useLayoutStore((s) => s.layouts[s.currentLayoutId]);
