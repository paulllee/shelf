import { lazy, Suspense } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useSSE } from "./hooks/useSSE";
import Header from "./components/Header";
import type { Section } from "./types";

const MediaSection = lazy(() => import("./components/MediaSection"));
const WorkoutSection = lazy(() => import("./components/WorkoutSection"));
const HabitSection = lazy(() => import("./components/HabitSection"));
const TaskSection = lazy(() => import("./components/TaskSection"));

const sectionWidth: Record<Section, string> = {
  media: "max-w-6xl",
  workouts: "max-w-4xl",
  habits: "max-w-6xl",
  tasks: "max-w-4xl",
};

export default function App() {
  useSSE();
  const [section, setSection] = useLocalStorage<Section>(
    "shelf-section",
    "media",
  );

  return (
    <div
      className={`container mx-auto px-3 pt-6 pb-4 sm:px-4 sm:py-6 md:py-8 transition-[max-width] duration-200 motion-reduce:transition-none ${sectionWidth[section]}`}
      data-section={section}
    >
      <Header section={section} onSectionChange={setSection} />
      <Suspense fallback={<div />}>
        <div key={section} className="animate-fade-in">
          {section === "media" ? (
            <MediaSection />
          ) : section === "workouts" ? (
            <WorkoutSection />
          ) : section === "habits" ? (
            <HabitSection />
          ) : (
            <TaskSection />
          )}
        </div>
      </Suspense>
    </div>
  );
}
