import { CanvasStage } from "@/components/canvas/CanvasStage";
import { Toolbar } from "@/components/panels/Toolbar";
import { LayoutsPanel } from "@/components/panels/LayoutsPanel";
import { BuildablesPanel } from "@/components/panels/BuildablesPanel";

function App() {
  return (
    <div className="flex h-full w-full flex-col">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <LayoutsPanel />
        <main className="relative flex-1 overflow-hidden">
          <CanvasStage />
        </main>
        <BuildablesPanel />
      </div>
    </div>
  );
}

export default App;
