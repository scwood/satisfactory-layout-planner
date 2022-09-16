import { DragEvent } from "react";
import { Machine } from "./MachineNode";

export function SidePanel() {
  const onDragStart = (machine: Machine) => (event: DragEvent) => {
    if (event.dataTransfer) {
      event.dataTransfer.setData("application/reactflow", machine);
      event.dataTransfer.effectAllowed = "move";
    }
  };

  return (
    <div
      style={{
        width: 240,
        height: "100%",
        padding: 16,
        borderRight: "1px solid #ced1d7",
        flexShrink: "0",
      }}
    >
      <u>Buildings</u>
      {Object.values(Machine).map((machine) => {
        return (
          <div
            style={{ width: "100%", fontSize: "14px", cursor: "grab" }}
            draggable
            onDragStart={onDragStart(machine)}
            key={machine}
          >
            {machine}
          </div>
        );
      })}
    </div>
  );
}
