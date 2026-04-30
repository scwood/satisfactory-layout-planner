import { CanvasStage } from "@/components/canvas/CanvasStage";
import { Toolbar } from "@/components/panels/Toolbar";
import { LeftPanel } from "@/components/panels/LeftPanel";
import { BuildablesPanel } from "@/components/panels/BuildablesPanel";

function App() {
  return (
    <div className="flex h-full w-full flex-col">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />
        <main className="relative flex-1 overflow-hidden">
          <CanvasStage />
        </main>
        <BuildablesPanel />
      </div>
    </div>
  );
}

export default App;
