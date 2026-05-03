import type { BuildingType } from "@/types/building";
import constructorImage from "@/assets/constructor.png";
import foundryImage from "@/assets/foundry.png";
import refineryImage from "@/assets/refinery.png";
import manufacturerImage from "@/assets/manufacturer.png";
import packagerImage from "@/assets/packager.png";
import assemblerImage from "@/assets/assembler.png";
import smelterImage from "@/assets/smelter.png";
import conveyorSplitterImage from "@/assets/conveyor_splitter.png";
import conveyorMergerImage from "@/assets/conveyor_merger.png";
import conveyorBeltImage from "@/assets/conveyor_belt.png";
import conveyorBeltTurnImage from "@/assets/conveyor_belt_turn.png";

export const BUILDING_TYPES: BuildingType[] = [
  {
    key: "assembler",
    name: "Assembler",
    widthMeters: 9,
    lengthMeters: 16,
    image: assemblerImage,
    imageGuide: { x: 0.068, y: 0.03, w: 0.85, h: 0.94 },
  },
  {
    key: "constructor",
    name: "Constructor",
    widthMeters: 8,
    lengthMeters: 10,
    image: constructorImage,
    imageGuide: { x: 0.099, y: 0.09, w: 0.802, h: 0.911 },
  },
  {
    key: "foundry",
    name: "Foundry",
    widthMeters: 10,
    lengthMeters: 10,
    image: foundryImage,
    imageGuide: { x: 0, y: 0.15, w: 1, h: 0.79 },
  },
  {
    key: "manufacturer",
    name: "Manufacturer",
    widthMeters: 18,
    lengthMeters: 20,
    image: manufacturerImage,
    imageGuide: { x: 0.05, y: 0.03, w: 0.9, h: 0.878 },
  },
  {
    key: "packager",
    name: "Packager",
    widthMeters: 8,
    lengthMeters: 8,
    image: packagerImage,
    imageGuide: { x: 0.104, y: 0.1, w: 0.82, h: 0.8 },
  },
  {
    key: "refinery",
    name: "Refinery",
    widthMeters: 10,
    lengthMeters: 22,
    image: refineryImage,
    imageGuide: { x: 0.14, y: 0.045, w: 0.72, h: 0.91 },
  },
  {
    key: "smelter",
    name: "Smelter",
    widthMeters: 6,
    lengthMeters: 9,
    image: smelterImage,
    imageGuide: { x: 0.131, y: 0, w: 0.787, h: 0.989 },
  },
  {
    key: "conveyor_belt",
    name: "Conveyor Belt",
    widthMeters: 2,
    lengthMeters: 2,
    image: conveyorBeltImage,
    imageGuide: { x: 0, y: 0.14, w: 1, h: 0.72 },
  },
  {
    key: "conveyor_belt_turn",
    name: "Conveyor Belt Turn",
    widthMeters: 3,
    lengthMeters: 3,
    image: conveyorBeltTurnImage,
    imageGuide: { x: 0.11, y: 0, w: 0.88, h: 0.88 },
  },
  {
    key: "conveyor_splitter",
    name: "Conveyor Splitter",
    widthMeters: 4,
    lengthMeters: 4,
    image: conveyorSplitterImage,
    imageGuide: { x: 0.15, y: 0.15, w: 0.7, h: 0.7 },
  },
  {
    key: "conveyor_merger",
    name: "Conveyor Merger",
    widthMeters: 4,
    lengthMeters: 4,
    image: conveyorMergerImage,
    imageGuide: { x: 0.15, y: 0.15, w: 0.7, h: 0.7 },
  },
];

export const BUILDING_TYPES_BY_KEY: Record<string, BuildingType> =
  Object.fromEntries(BUILDING_TYPES.map((t) => [t.key, t]));
