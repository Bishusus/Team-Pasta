import React from "react";
import useScrolledPast from "../hooks/useScrolledPast";

// Floating button that appears after scrolling down and smoothly
// returns the user to the top of the page.
export default function BackToTop() {
  const visible = useScrolledPast(400);

  return (
    <button
      type="button"
      className={visible ? "back-to-top back-to-top-visible" : "back-to-top"}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      ↑
    </button>
  );
}
