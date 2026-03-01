import { useLocalStorage } from "./hooks/useLocalStorage";
import Header from "./components/Header";
import MediaSection from "./components/MediaSection";
import WorkoutSection from "./components/WorkoutSection";
import HabitSection from "./components/HabitSection";

type Section = "media" | "workouts" | "habits";

export default function App() {
  const [section, setSection] = useLocalStorage<Section>(
    "shelf-section",
    "media",
  );

  return (
    <div className="container mx-auto px-3 pt-6 pb-4 sm:px-4 sm:py-6 md:py-8 max-w-4xl">
      <Header section={section} onSectionChange={setSection} />
      {section === "media" ? (
        <MediaSection />
      ) : section === "workouts" ? (
        <WorkoutSection />
      ) : (
        <HabitSection />
      )}
    </div>
  );
}
