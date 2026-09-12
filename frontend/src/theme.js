// Central place for colors and fonts, so the whole app stays consistent
// and a future teammate only has to change values in one file.

export const colors = {
  ink: "#14213D",       // sidebar background, headings
  page: "#F5F6FA",       // page background
  card: "#FFFFFF",
  border: "#E3E6ED",
  borderLight: "#EEF0F5",
  textMuted: "#6B7080",
  textBody: "#20243A",

  high: { dot: "#C4432B", text: "#8A2F1D", bg: "#FBEAE6" },
  medium: { dot: "#B8802A", text: "#7A5218", bg: "#FBF2E3" },
  low: { dot: "#2E7D53", text: "#1E5738", bg: "#E7F4ED" },
};

export const fonts = {
  sans: "'Inter', -apple-system, 'Segoe UI', sans-serif",
  display: "'Lora', serif",   // used for page titles / product name only
  mono: "'IBM Plex Mono', monospace", // used for numeric data (IDs, scores, %)
};
