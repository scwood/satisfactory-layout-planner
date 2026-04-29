import { CanvasStage } from "@/components/canvas/CanvasStage";
import { Toolbar } from "@/components/panels/Toolbar";
import { PropertiesPanel } from "@/components/panels/PropertiesPanel";

function App() {
  return (
    <div className="flex h-full w-full flex-col">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <main className="relative flex-1 overflow-hidden">
          <CanvasStage />
        </main>
        <PropertiesPanel />
      </div>
    </div>
  );
}

export default App;
