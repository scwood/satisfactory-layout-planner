import { useEffect, useMemo, useState } from "react";
import { Group, Image as KonvaImage, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { PlacedBuilding } from "@/types/building";
import { BUILDING_TYPES_BY_KEY } from "@/data/buildings";
import { effectiveFootprint, snapMeters } from "@/lib/canvas";
import { PIXELS_PER_METER } from "@/lib/constants";

interface BuildingNodeProps {
  building: PlacedBuilding;
  selected: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, xMeters: number, yMeters: number) => void;
  onDragEnd: (id: string, xMeters: number, yMeters: number) => void;
  registerNode: (id: string, node: Konva.Node | null) => void;
}

const imageCache = new Map<string, HTMLImageElement>();

function useBuildingImage(src: string | undefined) {
  const [prevSrc, setPrevSrc] = useState(src);
  const [image, setImage] = useState<HTMLImageElement | undefined>(() =>
    src ? imageCache.get(src) : undefined,
  );

  if (src !== prevSrc) {
    setPrevSrc(src);
    setImage(src ? imageCache.get(src) : undefined);
  }

  useEffect(() => {
    if (!src || imageCache.has(src)) return;
    let cancelled = false;
    const img = new Image();
    img.src = src;
    img.onload = () => {
      imageCache.set(src, img);
      if (!cancelled) setImage(img);
    };
    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}

export function BuildingNode({
  building,
  selected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  registerNode,
}: BuildingNodeProps) {
  const type = BUILDING_TYPES_BY_KEY[building.typeKey];
  const image = useBuildingImage(type?.image);

  const dragBoundFunc = useMemo(() => {
    return function (this: Konva.Node, pos: { x: number; y: number }) {
      const stage = this.getStage();
      if (!stage) return pos;
      const sx = stage.x();
      const sy = stage.y();
      const scale = stage.scaleX();
      // pos is in absolute (screen) coordinates. Convert to world meters,
      // snap, then convert back.
      const worldXMeters = (pos.x - sx) / scale / PIXELS_PER_METER;
      const worldYMeters = (pos.y - sy) / scale / PIXELS_PER_METER;
      const snappedX = snapMeters(worldXMeters);
      const snappedY = snapMeters(worldYMeters);
      return {
        x: snappedX * PIXELS_PER_METER * scale + sx,
        y: snappedY * PIXELS_PER_METER * scale + sy,
      };
    };
  }, []);

  if (!type) return null;

  const { widthMeters: effW, depthMeters: effD } = effectiveFootprint(
    type,
    building.rotationDeg,
  );
  const xPx = building.xMeters * PIXELS_PER_METER;
  const yPx = building.yMeters * PIXELS_PER_METER;
  const wPx = effW * PIXELS_PER_METER;
  const hPx = effD * PIXELS_PER_METER;

  const rawW = type.widthMeters * PIXELS_PER_METER;
  const rawH = type.lengthMeters * PIXELS_PER_METER;

  return (
    <Group
      ref={(node) => {
        registerNode(building.id, node);
        return () => registerNode(building.id, null);
      }}
      x={xPx}
      y={yPx}
      draggable
      dragBoundFunc={dragBoundFunc}
      onMouseDown={(e) => {
        e.cancelBubble = true;
        onSelect(building.id, e.evt.shiftKey);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(building.id, e.evt.shiftKey);
      }}
      onDragStart={() => onDragStart(building.id)}
      onDragMove={(e) => {
        const node = e.target;
        onDragMove(
          building.id,
          node.x() / PIXELS_PER_METER,
          node.y() / PIXELS_PER_METER,
        );
      }}
      onDragEnd={(e) => {
        // node.x()/y() are already in world-pixel space (parent Layer has no
        // transform; the Stage transform sits above the Layer and is not
        // baked into local coordinates). dragBoundFunc kept us snapped, but
        // round once more in case of float drift.
        const node = e.target;
        const xMeters = snapMeters(node.x() / PIXELS_PER_METER);
        const yMeters = snapMeters(node.y() / PIXELS_PER_METER);
        node.position({
          x: xMeters * PIXELS_PER_METER,
          y: yMeters * PIXELS_PER_METER,
        });
        onDragEnd(building.id, xMeters, yMeters);
      }}
    >
      {/* Inner Group rotates the raw rect around the AABB center. */}
      <Group
        x={wPx / 2}
        y={hPx / 2}
        rotation={building.rotationDeg}
        offsetX={rawW / 2}
        offsetY={rawH / 2}
      >
        {image ? (
          (() => {
            const guide = type.imageGuide ?? { x: 0, y: 0, w: 1, h: 1 };
            const naturalW = image.naturalWidth || rawW;
            const naturalH = image.naturalHeight || rawH;
            // Scale X and Y independently so each guide value is self-
            // contained: w controls horizontal fit, h controls vertical fit.
            // If the configured guide aspect doesn't match the footprint, the
            // image will be stretched — that's a useful tuning signal.
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
            strokeScaleEnabled={false}
            perfectDrawEnabled={false}
          />
        )}
        <Rect
          width={rawW}
          height={rawH}
          stroke={selected ? "oklch(0.55 0.2 250)" : "oklch(0.4 0 0)"}
          strokeWidth={selected ? 2 : 1}
          strokeScaleEnabled={false}
          perfectDrawEnabled={false}
          listening={false}
        />
        {!image && (
          <Text
            text={type.name}
            fontSize={10}
            fill="oklch(0.2 0 0)"
            width={rawW}
            height={rawH}
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        )}
      </Group>
    </Group>
  );
}
