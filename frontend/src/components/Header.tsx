import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import MediaModal from "./MediaModal";
import WorkoutFormModal from "./WorkoutFormModal";

interface HeaderProps {
  section: "media" | "workouts";
  onSectionChange: (section: "media" | "workouts") => void;
}

export default function Header({ section, onSectionChange }: HeaderProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAdd = () => setShowAddModal(true);

  return (
    <>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">shelf</h1>
            <ThemeToggle />
          </div>
          <button
            className="btn btn-primary btn-sm sm:hidden"
            onClick={handleAdd}
          >
            +
          </button>
        </div>

        <div className="join w-full sm:w-auto">
          <button
            className={`btn btn-sm join-item flex-1 sm:flex-none ${section === "media" ? "btn-active" : ""}`}
            onClick={() => onSectionChange("media")}
          >
            media
          </button>
          <button
            className={`btn btn-sm join-item flex-1 sm:flex-none ${section === "workouts" ? "btn-active" : ""}`}
            onClick={() => onSectionChange("workouts")}
          >
            workouts
          </button>
        </div>

        <button className="btn btn-primary hidden sm:block" onClick={handleAdd}>
          {section === "media" ? "add media" : "add workout"}
        </button>
      </div>

      {showAddModal &&
        (section === "media" ? (
          <MediaModal onClose={() => setShowAddModal(false)} />
        ) : (
          <WorkoutFormModal onClose={() => setShowAddModal(false)} />
        ))}
    </>
  );
}
