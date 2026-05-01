export const SNAP_UNIT_METERS = 1;
export const FOUNDATION_METERS = 8;
export const PIXELS_PER_METER = 8;

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;
export const ZOOM_STEP = 1.1;

// At zoom levels below this, the 1m grid is too dense to be useful.
export const MIN_SCALE_FOR_FINE_GRID = 0.75;

export const STORAGE_KEY = "satisfactory-layout-planner:v1";

interface CanvasColors {
  grid: string;
  foundation: string;
  buildingStroke: string;
  buildingStrokeSelected: string;
  buildingText: string;
}

export const DARK_CANVAS_COLORS: CanvasColors = {
  grid: "oklch(1 0 0 / 5%)",
  foundation: "oklch(1 0 0 / 10%)",
  buildingStroke: "oklch(0.7 0 0)",
  buildingStrokeSelected: "oklch(0.7 0.18 250)",
  buildingText: "oklch(0.95 0 0)",
};
