import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Rect, Stage } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useLayoutStore } from "@/store/layoutStore";
import { BUILDING_TYPES_BY_KEY } from "@/data/buildings";
import {
  buildingBounds,
  clampScale,
  effectiveFootprint,
  fitViewToContent,
  getContentBounds,
  rectsIntersect,
  snapMeters,
} from "@/lib/canvas";
import {
  PIXELS_PER_METER,
  ZOOM_STEP,
  MIN_SCALE,
  MAX_SCALE,
} from "@/lib/constants";
import { Grid } from "./Grid";
import { BuildingNode } from "./BuildingNode";

interface View {
  x: number;
  y: number;
  scale: number;
}

interface MarqueeState {
  startWorld: { x: number; y: number };
  currentWorld: { x: number; y: number };
  additive: boolean;
}

interface PanState {
  startPointer: { x: number; y: number };
  startView: { x: number; y: number };
  trigger: "space" | "middle";
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
};

export function CanvasStage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const [panning, setPanning] = useState(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const layout = useLayoutStore((s) => s.layouts[s.currentLayoutId]);
  const currentLayoutId = useLayoutStore((s) => s.currentLayoutId);
  const selectedIds = useLayoutStore((s) => s.selectedIds);
  const setSelection = useLayoutStore((s) => s.setSelection);
  const updateBuilding = useLayoutStore((s) => s.updateBuilding);
  const updateBuildings = useLayoutStore((s) => s.updateBuildings);
  const removeBuildings = useLayoutStore((s) => s.removeBuildings);
  const copySelection = useLayoutStore((s) => s.copySelection);
  const pasteClipboard = useLayoutStore((s) => s.pasteClipboard);

  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const dragSnapshotRef = useRef<{
    primaryId: string;
    starts: Map<string, { x: number; y: number }>;
  } | null>(null);

  const buildings = useMemo(
    () => (layout ? Object.values(layout.buildings) : []),
    [layout],
  );

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Native wheel listener (non-passive, so we can preventDefault)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom toward cursor.
        const stage = stageRef.current;
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        setView((v) => {
          const direction = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
          const newScale = clampScale(v.scale * direction);
          if (newScale === v.scale) return v;
          // Keep the world point under the cursor stationary.
          const worldX = (pointer.x - v.x) / v.scale;
          const worldY = (pointer.y - v.y) / v.scale;
          return {
            scale: newScale,
            x: pointer.x - worldX * newScale,
            y: pointer.y - worldY * newScale,
          };
        });
      } else if (e.shiftKey) {
        // Horizontal pan.
        setView((v) => ({ ...v, x: v.x - e.deltaY }));
      } else {
        // Vertical (and any deltaX) pan.
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Track space key globally (for pan trigger).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isEditableTarget(e.target)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const fitView = useCallback(() => {
    const state = useLayoutStore.getState();
    const current = state.layouts[state.currentLayoutId];
    if (!current) return;
    const allBuildings = Object.values(current.buildings);
    const bounds = getContentBounds(allBuildings, BUILDING_TYPES_BY_KEY);
    if (!bounds) return;
    const vp = containerRef.current;
    if (!vp) return;
    setView(fitViewToContent(bounds, vp.clientWidth, vp.clientHeight));
  }, []);

  useEffect(() => {
    const handler = () => fitView();
    window.addEventListener("fit-view", handler);
    return () => window.removeEventListener("fit-view", handler);
  }, [fitView]);

  const rotateSelection = useCallback(() => {
    const state = useLayoutStore.getState();
    if (state.selectedIds.length === 0) return;
    const current = state.layouts[state.currentLayoutId];
    if (!current) return;
    for (const id of state.selectedIds) {
      const b = current.buildings[id];
      if (!b) continue;
      const type = BUILDING_TYPES_BY_KEY[b.typeKey];
      if (!type) continue;
      const oldEff = effectiveFootprint(type, b.rotationDeg);
      const newRot = ((b.rotationDeg + 90) % 360) as 0 | 90 | 180 | 270;
      const newEff = effectiveFootprint(type, newRot);
      // Rotate around the AABB center.
      const cx = b.xMeters + oldEff.widthMeters / 2;
      const cy = b.yMeters + oldEff.depthMeters / 2;
      updateBuilding(id, {
        rotationDeg: newRot,
        xMeters: snapMeters(cx - newEff.widthMeters / 2),
        yMeters: snapMeters(cy - newEff.depthMeters / 2),
      });
    }
  }, [updateBuilding]);

  useEffect(() => {
    const handler = () => rotateSelection();
    window.addEventListener("rotate-selection", handler);
    return () => window.removeEventListener("rotate-selection", handler);
  }, [rotateSelection]);

  // Fit view when the active layout changes, once the canvas has dimensions.
  const hasSize = size.width > 0;
  useEffect(() => {
    if (!hasSize) return;
    fitView();
  }, [currentLayoutId, hasSize, fitView]);

  // Other keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        removeBuildings(selectedIds);
      } else if (e.key === "Escape") {
        setSelection([]);
        setMarquee(null);
      } else if ((e.key === "r" || e.key === "R") && !ctrl) {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        rotateSelection();
      } else if (ctrl && (e.key === "c" || e.key === "C")) {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        copySelection();
      } else if (ctrl && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        pasteClipboard();
      } else if (e.key === "!" || (e.shiftKey && e.key === "1")) {
        e.preventDefault();
        fitView();
      } else if (ctrl && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        const current =
          useLayoutStore.getState().layouts[
            useLayoutStore.getState().currentLayoutId
          ];
        if (!current) return;
        setSelection(Object.keys(current.buildings));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedIds,
    removeBuildings,
    setSelection,
    copySelection,
    pasteClipboard,
    fitView,
    rotateSelection,
  ]);

  // Convert a stage pointer position to world meters.
  const pointerToWorldMeters = useCallback(
    (px: number, py: number) => ({
      x: (px - view.x) / view.scale / PIXELS_PER_METER,
      y: (py - view.y) / view.scale / PIXELS_PER_METER,
    }),
    [view],
  );

  const onStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    mouseDownPosRef.current = { x: pointer.x, y: pointer.y };

    const middleMouse = e.evt.button === 1;
    const startsPan = spaceHeld || middleMouse;

    if (startsPan) {
      panRef.current = {
        startPointer: { x: pointer.x, y: pointer.y },
        startView: { x: view.x, y: view.y },
        trigger: middleMouse ? "middle" : "space",
      };
      setPanning(true);
      e.evt.preventDefault();
      return;
    }

    // Only start a marquee from clicks that landed on the stage background,
    // not on a building.
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty && e.evt.button === 0) {
      const world = pointerToWorldMeters(pointer.x, pointer.y);
      setMarquee({
        startWorld: world,
        currentWorld: world,
        additive: e.evt.shiftKey,
      });
    }
  };

  const onStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    if (panRef.current) {
      const { startPointer, startView } = panRef.current;
      const dx = pointer.x - startPointer.x;
      const dy = pointer.y - startPointer.y;
      setView((v) => ({ ...v, x: startView.x + dx, y: startView.y + dy }));
      return;
    }

    if (marquee) {
      const world = pointerToWorldMeters(pointer.x, pointer.y);
      setMarquee({ ...marquee, currentWorld: world });
    }
  };

  const onStageMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    if (panRef.current) {
      panRef.current = null;
      setPanning(false);
      return;
    }

    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    const downPos = mouseDownPosRef.current;
    mouseDownPosRef.current = null;

    if (marquee) {
      const dragDistance =
        downPos && pointer
          ? Math.hypot(pointer.x - downPos.x, pointer.y - downPos.y)
          : 0;

      if (dragDistance < 3) {
        // Treat as a click on empty space — clear selection (unless shift).
        if (!marquee.additive) setSelection([]);
        setMarquee(null);
        return;
      }

      const x1 = Math.min(marquee.startWorld.x, marquee.currentWorld.x);
      const y1 = Math.min(marquee.startWorld.y, marquee.currentWorld.y);
      const x2 = Math.max(marquee.startWorld.x, marquee.currentWorld.x);
      const y2 = Math.max(marquee.startWorld.y, marquee.currentWorld.y);
      const rect = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };

      const hit: string[] = [];
      for (const b of buildings) {
        const type = BUILDING_TYPES_BY_KEY[b.typeKey];
        if (!type) continue;
        if (rectsIntersect(buildingBounds(b, type), rect)) hit.push(b.id);
      }

      const next = marquee.additive
        ? Array.from(new Set([...selectedIds, ...hit]))
        : hit;
      setSelection(next);
      setMarquee(null);
    }
  };

  const handleSelectBuilding = useCallback(
    (id: string, additive: boolean) => {
      const current = useLayoutStore.getState().selectedIds;
      if (additive) {
        if (current.includes(id)) {
          setSelection(current.filter((s) => s !== id));
        } else {
          setSelection([...current, id]);
        }
      } else {
        // If this id is already in the selection, leave it alone — preserves
        // multi-select so a subsequent drag can move all selected buildings.
        if (current.includes(id)) return;
        setSelection([id]);
      }
    },
    [setSelection],
  );

  const registerNode = useCallback((id: string, node: Konva.Node | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  const handleDragStart = useCallback((id: string) => {
    const state = useLayoutStore.getState();
    const ids = state.selectedIds.includes(id) ? state.selectedIds : [id];
    const current = state.layouts[state.currentLayoutId];
    if (!current) return;
    const starts = new Map<string, { x: number; y: number }>();
    for (const sid of ids) {
      const b = current.buildings[sid];
      if (!b) continue;
      starts.set(sid, { x: b.xMeters, y: b.yMeters });
    }
    dragSnapshotRef.current = { primaryId: id, starts };
  }, []);

  const handleDragMove = useCallback(
    (id: string, xMeters: number, yMeters: number) => {
      const snap = dragSnapshotRef.current;
      if (!snap || snap.primaryId !== id) return;
      const primaryStart = snap.starts.get(id);
      if (!primaryStart) return;
      const dx = xMeters - primaryStart.x;
      const dy = yMeters - primaryStart.y;
      for (const [sid, start] of snap.starts) {
        if (sid === id) continue;
        const node = nodeRefs.current.get(sid);
        if (!node) continue;
        node.position({
          x: (start.x + dx) * PIXELS_PER_METER,
          y: (start.y + dy) * PIXELS_PER_METER,
        });
      }
    },
    [],
  );

  const handleDragEnd = useCallback(
    (id: string, xMeters: number, yMeters: number) => {
      const snap = dragSnapshotRef.current;
      dragSnapshotRef.current = null;
      if (!snap || snap.primaryId !== id || snap.starts.size <= 1) {
        updateBuilding(id, { xMeters, yMeters });
        return;
      }
      const primaryStart = snap.starts.get(id);
      if (!primaryStart) {
        updateBuilding(id, { xMeters, yMeters });
        return;
      }
      const dx = xMeters - primaryStart.x;
      const dy = yMeters - primaryStart.y;
      const updates = Array.from(snap.starts).map(([sid, start]) => ({
        id: sid,
        patch: {
          xMeters: snapMeters(start.x + dx),
          yMeters: snapMeters(start.y + dy),
        },
      }));
      updateBuildings(updates);
    },
    [updateBuilding, updateBuildings],
  );

  const cursor = panning
    ? "grabbing"
    : spaceHeld
      ? "grab"
      : marquee
        ? "crosshair"
        : "default";

  // Marquee rect in pixel-space (post-meter, pre-stage-transform).
  const marqueeRect = marquee
    ? (() => {
        const x1 = Math.min(marquee.startWorld.x, marquee.currentWorld.x);
        const y1 = Math.min(marquee.startWorld.y, marquee.currentWorld.y);
        const x2 = Math.max(marquee.startWorld.x, marquee.currentWorld.x);
        const y2 = Math.max(marquee.startWorld.y, marquee.currentWorld.y);
        return {
          x: x1 * PIXELS_PER_METER,
          y: y1 * PIXELS_PER_METER,
          width: (x2 - x1) * PIXELS_PER_METER,
          height: (y2 - y1) * PIXELS_PER_METER,
        };
      })()
    : null;

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-muted/20"
      style={{ cursor, touchAction: "none" }}
    >
      {size.width > 0 && size.height > 0 && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          x={view.x}
          y={view.y}
          scaleX={view.scale}
          scaleY={view.scale}
          onMouseDown={onStageMouseDown}
          onMouseMove={onStageMouseMove}
          onMouseUp={onStageMouseUp}
        >
          <Layer listening={false}>
            <Grid
              width={size.width}
              height={size.height}
              offsetX={view.x}
              offsetY={view.y}
              scale={view.scale}
            />
          </Layer>

          <Layer>
            {buildings.map((b) => (
              <BuildingNode
                key={b.id}
                building={b}
                selected={selectedSet.has(b.id)}
                onSelect={handleSelectBuilding}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                registerNode={registerNode}
              />
            ))}
          </Layer>

          <Layer listening={false}>
            {marqueeRect && (
              <Rect
                x={marqueeRect.x}
                y={marqueeRect.y}
                width={marqueeRect.width}
                height={marqueeRect.height}
                fill="oklch(0.55 0.2 250 / 0.1)"
                stroke="oklch(0.55 0.2 250)"
                strokeWidth={1 / view.scale}
                dash={[4 / view.scale, 4 / view.scale]}
                perfectDrawEnabled={false}
              />
            )}
          </Layer>
        </Stage>
      )}

      <ZoomBadge scale={view.scale} />
    </div>
  );
}

function ZoomBadge({ scale }: { scale: number }) {
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 rounded-md border bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
      {Math.round(scale * 100)}% &middot; {MIN_SCALE * 100}–{MAX_SCALE * 100}%
    </div>
  );
}
