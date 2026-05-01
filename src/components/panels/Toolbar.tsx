import githubIcon from "@/assets/github.svg";

export function Toolbar() {
  return (
    <header className="flex h-12 items-center gap-2 border-b px-4 text-sm">
      <span className="font-medium">Satisfactory Layout Planner</span>
      <div className="ml-auto flex items-center gap-1">
        <a
          href="https://github.com/scwood/satisfactory-layout-planner"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
          className="flex items-center p-1"
        >
          <img src={githubIcon} alt="" className="h-5 w-5 dark:invert" />
        </a>
      </div>
    </header>
  );
}
