import {
  FOUNDATION_METERS,
  PIXELS_PER_METER,
  SNAP_UNIT_METERS,
  MIN_SCALE,
  MAX_SCALE,
} from "./constants";
import type { BuildingType, PlacedBuilding } from "@/types/building";

export const snapMeters = (m: number) =>
  Math.round(m / SNAP_UNIT_METERS) * SNAP_UNIT_METERS;

/**
 * Snapped top-left of a single linear-building segment centered on the
 * cursor — the same offset convention the standard building ghost uses, so
 * a linear ghost can be placed identically before and after the first click.
 */
export function linearGhostTopLeft(
  type: BuildingType,
  cursor: { xMeters: number; yMeters: number },
  rotationDeg: 0 | 90 | 180 | 270,
): { xMeters: number; yMeters: number } {
  const eff = effectiveFootprint(type, rotationDeg);
  return {
    xMeters: snapMeters(cursor.xMeters - eff.widthMeters / 2),
    yMeters: snapMeters(cursor.yMeters - eff.depthMeters / 2),
  };
}

/**
 * Geometry for a straight run of a linear building (belt, pipe) placed via
 * two-click drag.
 *
 * `anchor` is the **top-left of the first segment** (already grid-snapped —
 * use `linearGhostTopLeft` to derive it from a cursor). `cursor` is the
 * current free cursor position; the run extends from anchor toward whichever
 * grid cell the cursor sits in along the run axis. `rotationDeg` locks the
 * axis so the run never flips out from under the user.
 *
 * Storing the anchor as a segment top-left (instead of the click point) is
 * what keeps the pre-click ghost and the post-click run preview perfectly
 * aligned — they're both produced by this same function.
 *
 * Returns:
 *  - `rotation` — orientation of each segment (0 vertical, 90 horizontal)
 *  - `stepCount` — number of segments to stamp along the run
 *  - `stepSign` — `+1` or `-1`, direction along the run axis
 *  - `bounds` — meter-space rect covering the whole run (top-left + size)
 *  - `segments` — top-left meter coords for each placed segment
 */
export function computeLinearRun(
  type: BuildingType,
  anchor: { xMeters: number; yMeters: number },
  cursor: { xMeters: number; yMeters: number },
  rotationDeg: 0 | 90 | 180 | 270,
) {
  const horizontal = rotationDeg === 90 || rotationDeg === 270;
  const rotation: 0 | 90 = horizontal ? 90 : 0;
  const segmentLength = type.lengthMeters;
  const crossWidth = type.widthMeters;

  // Derive the cursor's "end cell" using the same centering offset as the
  // pre-click ghost, so the cursor stays visually centered on whichever
  // segment is closest to it.
  const endTopLeft = linearGhostTopLeft(type, cursor, rotationDeg);
  const anchorAlong = horizontal ? anchor.xMeters : anchor.yMeters;
  const endAlong = horizontal ? endTopLeft.xMeters : endTopLeft.yMeters;
  const delta = endAlong - anchorAlong;
  const stepCount = Math.round(Math.abs(delta) / segmentLength) + 1;
  const stepSign: 1 | -1 = delta < 0 ? -1 : 1;

  const segments: Array<{ xMeters: number; yMeters: number }> = [];
  for (let i = 0; i < stepCount; i += 1) {
    if (horizontal) {
      segments.push({
        xMeters: snapMeters(anchor.xMeters + stepSign * i * segmentLength),
        yMeters: snapMeters(anchor.yMeters),
      });
    } else {
      segments.push({
        xMeters: snapMeters(anchor.xMeters),
        yMeters: snapMeters(anchor.yMeters + stepSign * i * segmentLength),
      });
    }
  }

  const bounds = horizontal
    ? {
        x:
          stepSign === 1
            ? anchor.xMeters
            : anchor.xMeters - (stepCount - 1) * segmentLength,
        y: anchor.yMeters,
        width: stepCount * segmentLength,
        height: crossWidth,
      }
    : {
        x: anchor.xMeters,
        y:
          stepSign === 1
            ? anchor.yMeters
            : anchor.yMeters - (stepCount - 1) * segmentLength,
        width: crossWidth,
        height: stepCount * segmentLength,
      };

  return { anchor, rotation, stepCount, stepSign, bounds, segments };
}

export const metersToPixels = (m: number) => m * PIXELS_PER_METER;
export const pixelsToMeters = (p: number) => p / PIXELS_PER_METER;

export const clampScale = (s: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/**
 * The width/depth of a placed building after rotation, in meters.
 * Rotations of 90° / 270° swap the two dimensions. An optional `override`
 * (typically the placed building itself) lets per-instance dimensions win
 * over the type's defaults — currently used by labels, which resize to fit
 * their text.
 */
export function effectiveFootprint(
  type: BuildingType,
  rotationDeg: number,
  override?: PlacedBuilding,
) {
  if (
    type.isWall &&
    override?.endXMeters !== undefined &&
    override?.endYMeters !== undefined
  ) {
    return {
      widthMeters: Math.abs(override.endXMeters - override.xMeters),
      depthMeters: Math.abs(override.endYMeters - override.yMeters),
    };
  }
  const w = override?.widthMeters ?? type.widthMeters;
  const l = override?.lengthMeters ?? type.lengthMeters;
  const swap = rotationDeg === 90 || rotationDeg === 270;
  return {
    widthMeters: swap ? l : w,
    depthMeters: swap ? w : l,
  };
}

/**
 * Axis-aligned bounding box of a placed building in meter-space.
 * For most buildings, (xMeters, yMeters) is the top-left of the post-rotation
 * footprint. Walls are special: xMeters/yMeters is endpoint A (which can sit
 * anywhere along the AABB), so the AABB is derived from min/max of the two
 * endpoints.
 */
export function buildingBounds(b: PlacedBuilding, type: BuildingType) {
  if (type.isWall && b.endXMeters !== undefined && b.endYMeters !== undefined) {
    const minX = Math.min(b.xMeters, b.endXMeters);
    const minY = Math.min(b.yMeters, b.endYMeters);
    const maxX = Math.max(b.xMeters, b.endXMeters);
    const maxY = Math.max(b.yMeters, b.endYMeters);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  const { widthMeters, depthMeters } = effectiveFootprint(
    type,
    b.rotationDeg,
    b,
  );
  return {
    x: b.xMeters,
    y: b.yMeters,
    width: widthMeters,
    height: depthMeters,
  };
}

/**
 * Length of a wall segment in meters. Returns 0 if the building isn't a
 * fully-defined wall.
 */
export function wallLengthMeters(b: PlacedBuilding) {
  if (b.endXMeters === undefined || b.endYMeters === undefined) return 0;
  return Math.hypot(b.endXMeters - b.xMeters, b.endYMeters - b.yMeters);
}

/**
 * Wall dimension readout in foundations. Whole numbers drop the decimal
 * (`4 foundations`); fractional values show one decimal (`4.1 foundations`).
 * 1m snap means values are integer multiples of 0.125, so one decimal is
 * a deliberate rounding rather than the exact value.
 */
export function formatWallDimension(meters: number) {
  const f = meters / FOUNDATION_METERS;
  const rounded = Math.round(f * 10) / 10;
  const text = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
  return `${text}f`;
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
