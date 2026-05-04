import { Group, Image as KonvaImage, Rect, Text } from "react-konva";
import type { BuildingType } from "@/types/building";
import { effectiveFootprint } from "@/lib/canvas";
import { DARK_CANVAS_COLORS, PIXELS_PER_METER } from "@/lib/constants";
import { useBuildingImage } from "@/hooks/useBuildingImage";
import {
  LABEL_FONT_FAMILY,
  LABEL_FONT_SIZE,
  LABEL_FONT_STYLE,
  LABEL_PADDING,
  LABEL_PLACEHOLDER_TEXT,
} from "@/lib/labelMeasure";

interface BuildingGhostProps {
  type: BuildingType;
  xMeters: number;
  yMeters: number;
  rotationDeg: 0 | 90 | 180 | 270;
}

export function BuildingGhost({
  type,
  xMeters,
  yMeters,
  rotationDeg,
}: BuildingGhostProps) {
  const image = useBuildingImage(type.image);
  const colors = DARK_CANVAS_COLORS;

  const { widthMeters: effW, depthMeters: effD } = effectiveFootprint(
    type,
    rotationDeg,
  );
  const xPx = xMeters * PIXELS_PER_METER;
  const yPx = yMeters * PIXELS_PER_METER;
  const wPx = effW * PIXELS_PER_METER;
  const hPx = effD * PIXELS_PER_METER;

  const rawW = type.widthMeters * PIXELS_PER_METER;
  const rawH = type.lengthMeters * PIXELS_PER_METER;

  return (
    <Group x={xPx} y={yPx} opacity={0.5} listening={false}>
      <Group
        x={wPx / 2}
        y={hPx / 2}
        rotation={rotationDeg}
        offsetX={rawW / 2}
        offsetY={rawH / 2}
      >
        {image ? (
          (() => {
            const guide = type.imageGuide ?? { x: 0, y: 0, w: 1, h: 1 };
            const naturalW = image.naturalWidth || rawW;
            const naturalH = image.naturalHeight || rawH;
            const scaleX = rawW / (guide.w * naturalW);
            const scaleY = rawH / (guide.h * naturalH);
            const drawW = naturalW * scaleX;
            const drawH = naturalH * scaleY;
            const offX = -guide.x * naturalW * scaleX;
            const offY = -guide.y * naturalH * scaleY;
            return (
              <KonvaImage
                image={image}
                x={offX}
                y={offY}
                width={drawW}
                height={drawH}
                perfectDrawEnabled={false}
              />
            );
          })()
        ) : (
          <Rect
            width={rawW}
            height={rawH}
            fill={type.isLabel ? "oklch(1 0 0 / 6%)" : undefined}
            perfectDrawEnabled={false}
          />
        )}
        <Rect
          width={rawW}
          height={rawH}
          stroke={colors.buildingStrokeSelected}
          strokeWidth={2}
          dash={[6, 4]}
          strokeScaleEnabled={false}
          perfectDrawEnabled={false}
        />
        {!image && (
          <Text
            text={type.isLabel ? LABEL_PLACEHOLDER_TEXT : type.name}
            fontSize={type.isLabel ? LABEL_FONT_SIZE : 10}
            fontFamily={type.isLabel ? LABEL_FONT_FAMILY : undefined}
            fontStyle={type.isLabel ? LABEL_FONT_STYLE : undefined}
            fill={colors.buildingText}
            width={rawW}
            height={rawH}
            padding={type.isLabel ? LABEL_PADDING : 0}
            align="center"
            verticalAlign="middle"
            wrap={type.isLabel ? "word" : undefined}
            listening={false}
          />
        )}
      </Group>
    </Group>
  );
}
