import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BuildingId, PlacedBuilding } from '@/types/building'
import { STORAGE_KEY } from '@/lib/constants'

interface LayoutState {
  buildings: Record<BuildingId, PlacedBuilding>
  selectedIds: BuildingId[]
  clipboard: PlacedBuilding[]

  addBuilding: (building: PlacedBuilding) => void
  updateBuilding: (id: BuildingId, patch: Partial<PlacedBuilding>) => void
  removeBuildings: (ids: BuildingId[]) => void
  setSelection: (ids: BuildingId[]) => void
  copySelection: () => void
  pasteClipboard: () => void
  clearAll: () => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      buildings: {},
      selectedIds: [],
      clipboard: [],

      addBuilding: (building) =>
        set((s) => ({ buildings: { ...s.buildings, [building.id]: building } })),

      updateBuilding: (id, patch) =>
        set((s) => {
          const existing = s.buildings[id]
          if (!existing) return s
          return { buildings: { ...s.buildings, [id]: { ...existing, ...patch } } }
        }),

      removeBuildings: (ids) =>
        set((s) => {
          const next = { ...s.buildings }
          for (const id of ids) delete next[id]
          return {
            buildings: next,
            selectedIds: s.selectedIds.filter((sid) => !ids.includes(sid)),
          }
        }),

      setSelection: (ids) => set({ selectedIds: ids }),

      copySelection: () => {
        const { buildings, selectedIds } = get()
        set({
          clipboard: selectedIds
            .map((id) => buildings[id])
            .filter((b): b is PlacedBuilding => Boolean(b)),
        })
      },

      pasteClipboard: () => {
        // Implementation pending — needs id generation + offset
      },

      clearAll: () => set({ buildings: {}, selectedIds: [], clipboard: [] }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({ buildings: s.buildings }),
    },
  ),
)
