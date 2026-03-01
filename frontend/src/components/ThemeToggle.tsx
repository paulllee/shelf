import { useState, useCallback } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem("theme") || "dark") === "dark",
  );

  const toggle = useCallback(() => {
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.colorScheme = next === "dark" ? "dark" : "light";
    localStorage.setItem("theme", next);
    setIsDark(!isDark);
  }, [isDark]);

  return (
    <label className="swap swap-rotate -mt-1.75">
      <input type="checkbox" checked={isDark} onChange={toggle} />
      <span
        className="swap-on w-6 h-6 bg-current"
        style={{
          WebkitMask: "url(/static/icons/sun.svg) center/contain no-repeat",
          mask: "url(/static/icons/sun.svg) center/contain no-repeat",
        }}
      />
      <span
        className="swap-off w-6 h-6 bg-current"
        style={{
          WebkitMask: "url(/static/icons/moon.svg) center/contain no-repeat",
          mask: "url(/static/icons/moon.svg) center/contain no-repeat",
        }}
      />
    </label>
  );
}
