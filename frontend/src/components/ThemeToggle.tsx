import { useState, useCallback } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem("theme") || "dark") === "dark",
  );

  const toggle = useCallback(() => {
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.colorScheme =
      next === "dark" ? "dark" : "light";
    localStorage.setItem("theme", next);
    setIsDark(!isDark);
  }, [isDark]);

  return (
    <label className="swap swap-rotate -mt-1.75" aria-label="Toggle dark mode">
      <input type="checkbox" checked={isDark} onChange={toggle} />
      <Sun className="swap-on w-6 h-6" />
      <Moon className="swap-off w-6 h-6" />
    </label>
  );
}
