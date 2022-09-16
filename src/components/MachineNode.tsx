import { memo } from "react";

import { pixelsPerMeter } from "../sharedConstants";

export enum Machine {
  AwesomeShop = "Awesome shop",
  AwesomeSink = "Awesome sink",
  Assembler = "Assembler",
  BiomassBurner = "Biomass burner",
  Blender = "Blender",
  CoalGenerator = "Coal generator",
}

const machineDimensions: Record<Machine, [number, number]> = {
  [Machine.AwesomeShop]: [4, 6],
  [Machine.AwesomeSink]: [16, 13],
  [Machine.Assembler]: [10, 15],
  [Machine.BiomassBurner]: [8, 8],
  [Machine.Blender]: [18, 16],
  [Machine.CoalGenerator]: [10, 26],
};

export interface MachineNodeProps {
  selected: boolean;
  data: {
    machine: Machine;
  };
}

export const MachineNode = memo(({ data, selected }: MachineNodeProps) => {
  const [width, length] = machineDimensions[data.machine];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        color: "#111827",
        width: width * pixelsPerMeter,
        height: length * pixelsPerMeter,
        fontWeight: 600,
        borderRadius: pixelsPerMeter / 3,
        backgroundColor: selected ? "blue" : "#a1a1aa90",
        border: "2px solid #111827",
      }}
    >
      {data.machine}
    </div>
  );
});
