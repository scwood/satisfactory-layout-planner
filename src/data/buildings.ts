import type { BuildingType } from "@/types/building";

export const BUILDING_TYPES: BuildingType[] = [
  {
    key: "constructor",
    name: "Constructor",
    widthMeters: 8,
    depthMeters: 10,
    color: "oklch(0.7 0.15 50)",
  },
  {
    key: "smelter",
    name: "Smelter",
    widthMeters: 6,
    depthMeters: 9,
    color: "oklch(0.65 0.18 30)",
  },
];

export const BUILDING_TYPES_BY_KEY: Record<string, BuildingType> =
  Object.fromEntries(BUILDING_TYPES.map((t) => [t.key, t]));
