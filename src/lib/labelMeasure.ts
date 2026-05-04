import Konva from "konva";
import { PIXELS_PER_METER, SNAP_UNIT_METERS } from "./constants";

export const LABEL_FONT_SIZE = 8;
export const LABEL_FONT_FAMILY = "sans-serif";
export const LABEL_FONT_STYLE = "500";
export const LABEL_PADDING = 4;
export const LABEL_MAX_WIDTH_METERS = 24;
export const LABEL_MIN_WIDTH_METERS = 4;
export const LABEL_MIN_LENGTH_METERS = 2;
export const LABEL_PLACEHOLDER_TEXT = "Label";

const ceilToSnap = (m: number) =>
  Math.ceil(m / SNAP_UNIT_METERS) * SNAP_UNIT_METERS;

/**
 * Measure a label's bounding box in meter-space, snapped to the grid.
 * Single-line until it would exceed `LABEL_MAX_WIDTH_METERS`, then wraps
 * and grows vertically. Always uses the same font/padding as the rendered
 * label so the on-canvas text fits inside the returned rect.
 */
export function measureLabel(text: string): {
  widthMeters: number;
  lengthMeters: number;
} {
  const safeText = text.length > 0 ? text : " ";
  const maxWidthPx = LABEL_MAX_WIDTH_METERS * PIXELS_PER_METER;

  const single = new Konva.Text({
    text: safeText,
    fontSize: LABEL_FONT_SIZE,
    fontFamily: LABEL_FONT_FAMILY,
    fontStyle: LABEL_FONT_STYLE,
    padding: LABEL_PADDING,
  });
  let widthPx = single.width();
  let heightPx = single.height();

  if (widthPx > maxWidthPx) {
    const wrapped = new Konva.Text({
      text: safeText,
      fontSize: LABEL_FONT_SIZE,
      fontFamily: LABEL_FONT_FAMILY,
      fontStyle: LABEL_FONT_STYLE,
      padding: LABEL_PADDING,
      width: maxWidthPx,
      wrap: "word",
    });
    widthPx = maxWidthPx;
    heightPx = wrapped.height();
  }

  // Ceil so a sub-meter sliver never gets clipped by the snap.
  const widthMeters = Math.max(
    LABEL_MIN_WIDTH_METERS,
    ceilToSnap(widthPx / PIXELS_PER_METER),
  );
  const lengthMeters = Math.max(
    LABEL_MIN_LENGTH_METERS,
    ceilToSnap(heightPx / PIXELS_PER_METER),
  );
  return { widthMeters, lengthMeters };
}
