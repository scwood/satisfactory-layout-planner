import { ReactFlowProvider } from "react-flow-renderer";

import { SidePanel } from "./SidePanel";
import { TopBar } from "./TopBar";
import { Flow } from "./Flow";

export function App() {
  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
        }}
      >
        <TopBar />
        <div style={{ flexGrow: 1, width: "100%", display: "flex" }}>
          <ReactFlowProvider>
            <SidePanel />
            <Flow />
          </ReactFlowProvider>
        </div>
      </div>
    </>
  );
}
