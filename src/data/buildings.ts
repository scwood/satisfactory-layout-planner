import type { BuildingType } from "@/types/building";
import constructorImage from "@/assets/constructor.png";
import foundryImage from "@/assets/foundry.png";
import refineryImage from "@/assets/refinery.png";
import manufacturerImage from "@/assets/manufacturer.png";
import packagerImage from "@/assets/packager.png";
import assemblerImage from "@/assets/assembler.png";

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
];

export const BUILDING_TYPES_BY_KEY: Record<string, BuildingType> =
  Object.fromEntries(BUILDING_TYPES.map((t) => [t.key, t]));
