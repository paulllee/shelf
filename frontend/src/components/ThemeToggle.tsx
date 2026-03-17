import { useState, useCallback } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem("theme") || "dark") === "dark",
  );

  const toggle = useCallback(() => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  }, [isDark]);

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="-mt-1.75 text-base-content/60 hover:text-base-content transition-[color,transform] motion-reduce:transition-none hover:rotate-12 cursor-pointer"
    >
      {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
    </button>
  );
}
