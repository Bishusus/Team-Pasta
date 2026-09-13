import React, { useEffect } from "react";
import { colors } from "../theme";

export default function Toast({ message, type = "info", onClose, duration = 3500 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const bg = type === "success" ? "#10B981" : type === "error" ? "#EF4444" : "#3B82F6";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: bg,
        color: "#FFFFFF",
        padding: "12px 18px",
        borderRadius: 8,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 14,
        fontWeight: 500,
        animation: "fadeInUp 0.25s ease-out",
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          padding: "0 0 0 8px",
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
