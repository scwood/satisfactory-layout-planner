import {
  PIXELS_PER_METER,
  SNAP_UNIT_METERS,
  MIN_SCALE,
  MAX_SCALE,
} from "./constants";
import type { BuildingType, PlacedBuilding } from "@/types/building";

export const snapMeters = (m: number) =>
  Math.round(m / SNAP_UNIT_METERS) * SNAP_UNIT_METERS;

export const metersToPixels = (m: number) => m * PIXELS_PER_METER;
export const pixelsToMeters = (p: number) => p / PIXELS_PER_METER;

export const clampScale = (s: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/**
 * The width/depth of a placed building after rotation, in meters.
 * Rotations of 90° / 270° swap the two dimensions.
 */
export function effectiveFootprint(type: BuildingType, rotationDeg: number) {
  const swap = rotationDeg === 90 || rotationDeg === 270;
  return {
    widthMeters: swap ? type.depthMeters : type.widthMeters,
    depthMeters: swap ? type.widthMeters : type.depthMeters,
  };
}

/**
 * Axis-aligned bounding box of a placed building in meter-space.
 * (xMeters, yMeters) is treated as the top-left of the post-rotation footprint.
 */
export function buildingBounds(b: PlacedBuilding, type: BuildingType) {
  const { widthMeters, depthMeters } = effectiveFootprint(type, b.rotationDeg);
  return {
    x: b.xMeters,
    y: b.yMeters,
    width: widthMeters,
    height: depthMeters,
  };
}

export interface RectMeters {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectsIntersect(a: RectMeters, b: RectMeters) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
