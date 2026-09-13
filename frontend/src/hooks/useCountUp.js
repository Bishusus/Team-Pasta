import { useEffect, useRef, useState } from "react";

/**
 * Animates a numeric value from 0 (or its previous value) to `value`
 * with an ease-out curve. Non-numeric values ("-", "Connected") pass
 * through unchanged. Respects prefers-reduced-motion by jumping
 * straight to the final value.
 */
export default function useCountUp(value, { duration = 850 } = {}) {
  const [display, setDisplay] = useState(() => (typeof value === "number" ? 0 : value));
  const frame = useRef(0);
  const started = useRef(false);
  const previous = useRef(typeof value === "number" ? 0 : value);

  useEffect(() => {
    if (typeof value !== "number") {
      setDisplay(value);
      previous.current = value;
      started.current = false;
      return undefined;
    }

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const from = started.current ? previous.current : 0;
    const to = value;
    previous.current = value;
    started.current = true;

    if (reduced || from === to) {
      setDisplay(to);
      return undefined;
    }

    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);

  return display;
}
