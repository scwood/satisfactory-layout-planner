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

export function getContentBounds(
  buildings: PlacedBuilding[],
  typesMap: Record<string, BuildingType>,
): RectMeters | null {
  if (buildings.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of buildings) {
    const type = typesMap[b.typeKey];
    if (!type) continue;
    const bounds = buildingBounds(b, type);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }
  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

const FIT_PADDING_PX = 60;

export function fitViewToContent(
  bounds: RectMeters,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number; scale: number } {
  const contentW = bounds.width * PIXELS_PER_METER;
  const contentH = bounds.height * PIXELS_PER_METER;
  const scaleX = (viewportWidth - FIT_PADDING_PX * 2) / contentW;
  const scaleY = (viewportHeight - FIT_PADDING_PX * 2) / contentH;
  const scale = clampScale(Math.min(scaleX, scaleY));
  const centerXPx = (bounds.x + bounds.width / 2) * PIXELS_PER_METER;
  const centerYPx = (bounds.y + bounds.height / 2) * PIXELS_PER_METER;
  return {
    scale,
    x: viewportWidth / 2 - centerXPx * scale,
    y: viewportHeight / 2 - centerYPx * scale,
  };
}
