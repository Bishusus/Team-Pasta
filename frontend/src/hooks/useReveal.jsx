import React, { useLayoutEffect, useRef } from "react";

/**
 * Reveal-on-scroll: attaches an IntersectionObserver to the returned ref.
 * The element starts hidden (CSS class `reveal`) and transitions in
 * (`reveal-visible`) the first time it enters the viewport. Falls back to
 * always-visible when the user prefers reduced motion or the observer
 * API is unavailable.
 */
export default function useReveal({
  threshold = 0.1,
  rootMargin = "0px 0px -48px 0px",
  delay = 0,
} = {}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof IntersectionObserver === "undefined") {
      node.classList.add("reveal-visible");
      return undefined;
    }

    node.classList.add("reveal");
    if (delay) node.style.setProperty("--reveal-delay", `${delay}ms`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, delay]);

  return ref;
}

/**
 * Declarative wrapper: <Reveal delay={120}>...</Reveal>
 * Renders a div that fades/slides in when scrolled into view.
 */
export function Reveal({ delay = 0, threshold, rootMargin, style, children, ...rest }) {
  const ref = useReveal({ delay, threshold, rootMargin });
  return (
    <div ref={ref} style={style} {...rest}>
      {children}
    </div>
  );
}
