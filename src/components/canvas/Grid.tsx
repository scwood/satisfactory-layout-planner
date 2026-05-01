import { Line } from "react-konva";
import {
  DARK_CANVAS_COLORS,
  FOUNDATION_METERS,
  MIN_SCALE_FOR_FINE_GRID,
  PIXELS_PER_METER,
  SNAP_UNIT_METERS,
} from "@/lib/constants";

interface GridProps {
  /** Stage size in CSS pixels. */
  width: number;
  height: number;
  /** Stage transform (pan offset in pixels, uniform scale). */
  offsetX: number;
  offsetY: number;
  scale: number;
}

/**
 * Renders only the grid lines that fall within the current viewport.
 * Coordinates are in stage (pre-transform) pixel space — the parent Layer
 * inherits the Stage transform.
 */
export function Grid({ width, height, offsetX, offsetY, scale }: GridProps) {
  const { grid: GRID_COLOR, foundation: FOUNDATION_LINE_COLOR } =
    DARK_CANVAS_COLORS;

  // Visible world rect, in unscaled stage pixels.
  const left = -offsetX / scale;
  const top = -offsetY / scale;
  const right = left + width / scale;
  const bottom = top + height / scale;

  const showFineGrid = scale >= MIN_SCALE_FOR_FINE_GRID;
  const fineLines: React.ReactElement[] = [];
  const foundationLines: React.ReactElement[] = [];

  const fineStepPx = SNAP_UNIT_METERS * PIXELS_PER_METER;
  const foundationStepPx = FOUNDATION_METERS * PIXELS_PER_METER;

  // Stroke widths are in unscaled pixels — divide by scale so they appear
  // hairline-thin regardless of zoom.
  const fineStroke = 1 / scale;
  const foundationStroke = 1.5 / scale;

  if (showFineGrid) {
    const startX = Math.floor(left / fineStepPx) * fineStepPx;
    const endX = Math.ceil(right / fineStepPx) * fineStepPx;
    for (let x = startX; x <= endX; x += fineStepPx) {
      // Skip lines that coincide with the foundation grid; those are drawn heavier.
      if (x % foundationStepPx === 0) continue;
      fineLines.push(
        <Line
          key={`vx${x}`}
          points={[x, top, x, bottom]}
          stroke={GRID_COLOR}
          strokeWidth={fineStroke}
          listening={false}
          perfectDrawEnabled={false}
        />,
      );
    }
    const startY = Math.floor(top / fineStepPx) * fineStepPx;
    const endY = Math.ceil(bottom / fineStepPx) * fineStepPx;
    for (let y = startY; y <= endY; y += fineStepPx) {
      if (y % foundationStepPx === 0) continue;
      fineLines.push(
        <Line
          key={`hy${y}`}
          points={[left, y, right, y]}
          stroke={GRID_COLOR}
          strokeWidth={fineStroke}
          listening={false}
          perfectDrawEnabled={false}
        />,
      );
    }
  }

  const fStartX = Math.floor(left / foundationStepPx) * foundationStepPx;
  const fEndX = Math.ceil(right / foundationStepPx) * foundationStepPx;
  for (let x = fStartX; x <= fEndX; x += foundationStepPx) {
    foundationLines.push(
      <Line
        key={`fvx${x}`}
        points={[x, top, x, bottom]}
        stroke={FOUNDATION_LINE_COLOR}
        strokeWidth={foundationStroke}
        listening={false}
        perfectDrawEnabled={false}
      />,
    );
  }
  const fStartY = Math.floor(top / foundationStepPx) * foundationStepPx;
  const fEndY = Math.ceil(bottom / foundationStepPx) * foundationStepPx;
  for (let y = fStartY; y <= fEndY; y += foundationStepPx) {
    foundationLines.push(
      <Line
        key={`fhy${y}`}
        points={[left, y, right, y]}
        stroke={FOUNDATION_LINE_COLOR}
        strokeWidth={foundationStroke}
        listening={false}
        perfectDrawEnabled={false}
      />,
    );
  }

  return (
    <>
      {fineLines}
      {foundationLines}
    </>
  );
}
