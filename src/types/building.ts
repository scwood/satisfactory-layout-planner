export type BuildingId = string;

export type BuildingTypeKey = string;

export interface BuildingType {
  key: BuildingTypeKey;
  name: string;
  widthMeters: number;
  lengthMeters: number;
  image?: string;
  /**
   * Position of the in-image guide rectangle (matching the building footprint)
   * as normalized fractions of the image's natural dimensions. The image is
   * drawn so this rectangle aligns with the footprint; artwork outside it
   * bleeds beyond the footprint, mirroring the in-game appearance.
   */
  imageGuide?: { x: number; y: number; w: number; h: number };
  /**
   * Linear types (belts, pipes) use a two-click placement flow: click an
   * anchor, then click the far end. The tool stamps a row of segments along
   * the dominant axis of the drag.
   */
  linear?: boolean;
  /**
   * Free-form text annotations. Rendered as a labeled rectangle on the
   * canvas instead of an image, and editable via double-click.
   */
  isLabel?: boolean;
}

export interface PlacedBuilding {
  id: BuildingId;
  typeKey: BuildingTypeKey;
  xMeters: number;
  yMeters: number;
  rotationDeg: 0 | 90 | 180 | 270;
  text?: string;
  /**
   * Per-instance footprint override. Currently used by labels, which
   * resize themselves to fit their text. When unset, the type's
   * widthMeters / lengthMeters apply.
   */
  widthMeters?: number;
  lengthMeters?: number;
}
