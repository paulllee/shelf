import { useRef, useLayoutEffect } from "react";

interface ExpandCollapseProps {
  expanded: boolean;
  children: React.ReactNode;
  className?: string;
  onExpanded?: () => void;
}

export default function ExpandCollapse({
  expanded,
  children,
  className,
  onExpanded,
}: ExpandCollapseProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const raf1 = useRef(0);
  const raf2 = useRef(0);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    cancelAnimationFrame(raf1.current);
    cancelAnimationFrame(raf2.current);

    if (isFirstRender.current) {
      isFirstRender.current = false;
      outer.style.height = expanded ? "auto" : "0px";
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      outer.style.height = expanded ? "auto" : "0px";
      if (expanded) onExpanded?.();
      return;
    }

    if (expanded) {
      // Measure exact fractional auto height before paint (useLayoutEffect = pre-paint)
      outer.style.height = "auto";
      const targetHeight = outer.getBoundingClientRect().height;
      outer.style.height = "0px";
      outer.getBoundingClientRect(); // force reflow so height: 0 commits before rAF
      raf1.current = requestAnimationFrame(() => {
        outer.style.height = targetHeight + "px";
      });
    } else {
      // Lock to current rendered px before animating to 0
      outer.style.height = outer.getBoundingClientRect().height + "px";
      raf1.current = requestAnimationFrame(() => {
        raf2.current = requestAnimationFrame(() => {
          outer.style.height = "0px";
        });
      });
    }
  }, [expanded]);

  return (
    <div
      ref={outerRef}
      onTransitionEnd={() => {
        if (expanded && outerRef.current) {
          outerRef.current.style.height = "auto";
          requestAnimationFrame(() => onExpanded?.());
        }
      }}
      style={{ overflow: "hidden" }}
      className={`transition-[height] duration-[250ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]${className ? ` ${className}` : ""}`}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
