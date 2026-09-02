import { useSSE } from "./hooks/useSSE";
import Header from "./components/Header";
import MediaSection from "./components/MediaSection";

export default function App() {
  useSSE();

  return (
    <div
      className="container mx-auto max-w-6xl px-3 pt-6 pb-4 sm:px-4 sm:py-6 md:py-8"
      data-section="media"
    >
      <Header />
      <MediaSection />
    </div>
  );
}
