import type { ThemeDefinition } from "../publicTypes";

export const defaultThemes: readonly ThemeDefinition[] = [
  {
    id: "qastia-light",
    label: "Qastia clair",
    tokens: {
      "--qf-accent": "#2f6f73",
      "--qf-accent-contrast": "#ffffff",
      "--qf-surface": "#ffffff",
      "--qf-surface-muted": "#f4f7f6",
      "--qf-border": "#d9e2df",
      "--qf-text": "#1f2933",
      "--qf-text-muted": "#66737a",
    },
  },
  {
    id: "coaching",
    label: "Coaching",
    tokens: {
      "--qf-accent": "#315f8c",
      "--qf-accent-contrast": "#ffffff",
      "--qf-surface": "#ffffff",
      "--qf-surface-muted": "#eef4f8",
      "--qf-border": "#cfdae3",
      "--qf-text": "#172433",
      "--qf-text-muted": "#637184",
    },
  },
];
