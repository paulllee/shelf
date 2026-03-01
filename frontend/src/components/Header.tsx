import ThemeToggle from "./ThemeToggle";

type Section = "media" | "workouts" | "habits";

interface HeaderProps {
  section: Section;
  onSectionChange: (section: Section) => void;
}

const TABS: Section[] = ["media", "workouts", "habits"];

export default function Header({ section, onSectionChange }: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 md:mb-8 gap-3">
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">shelf</h1>
        <ThemeToggle />
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onSectionChange(tab)}
            className={`h-9 sm:h-10 px-3 sm:px-4 rounded-full transition-colors motion-reduce:transition-none text-sm font-semibold ${
              section === tab
                ? "bg-primary/20 text-primary"
                : "text-base-content/50 hover:text-base-content"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
