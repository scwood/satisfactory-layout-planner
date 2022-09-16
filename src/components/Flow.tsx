import { DragEvent, useCallback, useRef } from "react";
import ReactFlow, {
  useNodesState,
  Background,
  BackgroundVariant,
  Node,
  useReactFlow,
} from "react-flow-renderer";

import { pixelsPerMeter } from "../sharedConstants";
import { Machine, MachineNode } from "./MachineNode";

const nodeTypes = {
  machine: MachineNode,
};

export function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      if (!reactFlowWrapper.current) {
        return;
      }

      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const machine = event.dataTransfer.getData("application/reactflow");

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: crypto.randomUUID(),
        type: "machine",
        position,
        data: { machine },
      };

      setNodes((prev) => prev.concat(newNode));
    },
    [reactFlowInstance]
  );

  return (
    <div ref={reactFlowWrapper} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        onNodesChange={onNodesChange}
        nodes={nodes}
        nodeTypes={nodeTypes}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
        snapToGrid
        snapGrid={[pixelsPerMeter, pixelsPerMeter]}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={8 * pixelsPerMeter}
          size={1}
          color="#9ca3af"
        />
      </ReactFlow>
    </div>
  );
}
