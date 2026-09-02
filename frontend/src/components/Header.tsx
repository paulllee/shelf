import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <div className="flex items-center gap-3 mb-6 md:mb-8">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">shelf</h1>
      <ThemeToggle />
    </div>
  );
}
