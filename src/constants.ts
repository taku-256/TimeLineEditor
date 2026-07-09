// ============================================================
// Constants
// ============================================================

// Layout
export const HEADER_HEIGHT = 60;         // timeline header height
export const LANE_HEADER_WIDTH = 160;    // left lane label width
export const LANE_HEIGHT = 56;           // height of each lane
export const LANE_PADDING = 6;           // padding inside lane
export const BLOCK_BORDER_RADIUS = 5;
export const BLOCK_MIN_WIDTH_PX = 8;     // minimum block width in pixels
export const EDGE_HANDLE_WIDTH = 8;      // resize handle width in pixels
export const EVENT_MARKER_SIZE = 10;
export const SCROLLBAR_SIZE = 12;
export const PLAYHEAD_WIDTH = 2;

// Zoom
export const DEFAULT_ZOOM = 8;           // pixels per second
export const MIN_ZOOM = 2;
export const MAX_ZOOM = 200;
export const ZOOM_FACTOR = 1.15;

// Timeline
export const DEFAULT_DURATION = 180;     // seconds (3 minutes default)
export const TIME_PRECISION = 0.1;       // 0.1 second precision
export const DEFAULT_SNAP_INTERVAL = 0.5;

// Undo/Redo
export const MAX_HISTORY_SIZE = 100;

// Color Palette - curated colors for blocks
export const BLOCK_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#d946ef', // Fuchsia
  '#f43f5e', // Rose
];

// Event icon options
export const EVENT_ICONS = ['★', '▶', '●', '◆', '▲', '■', '♦', '⚡', '🎯', '🏁'];

// Default lane colors
export const LANE_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#22c55e',
  '#f97316',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#eab308',
];

// Animation
export const ANIMATION_DURATION = 200; // ms

// Theme colors
export const DARK_THEME = {
  bg: '#0a0e1a',
  bgSecondary: '#111827',
  bgTertiary: '#1f2937',
  surface: 'rgba(17, 24, 39, 0.85)',
  surfaceHover: 'rgba(31, 41, 55, 0.9)',
  border: 'rgba(75, 85, 99, 0.4)',
  borderLight: 'rgba(75, 85, 99, 0.2)',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  accent: '#00d4ff',
  accentSecondary: '#8b5cf6',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  gridLine: 'rgba(75, 85, 99, 0.25)',
  gridLineMajor: 'rgba(75, 85, 99, 0.5)',
  playhead: '#ef4444',
  selectionRect: 'rgba(0, 212, 255, 0.15)',
  selectionBorder: 'rgba(0, 212, 255, 0.6)',
  laneAlt: 'rgba(31, 41, 55, 0.3)',
  laneHeader: 'rgba(17, 24, 39, 0.95)',
  blockGlow: 'rgba(0, 212, 255, 0.4)',
  scrollbar: 'rgba(75, 85, 99, 0.5)',
  scrollbarHover: 'rgba(107, 114, 128, 0.7)',
};

export const LIGHT_THEME = {
  bg: '#f8fafc',
  bgSecondary: '#f1f5f9',
  bgTertiary: '#e2e8f0',
  surface: 'rgba(255, 255, 255, 0.9)',
  surfaceHover: 'rgba(241, 245, 249, 0.95)',
  border: 'rgba(148, 163, 184, 0.4)',
  borderLight: 'rgba(148, 163, 184, 0.2)',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  accent: '#0284c7',
  accentSecondary: '#7c3aed',
  error: '#dc2626',
  success: '#16a34a',
  warning: '#d97706',
  gridLine: 'rgba(148, 163, 184, 0.25)',
  gridLineMajor: 'rgba(148, 163, 184, 0.5)',
  playhead: '#dc2626',
  selectionRect: 'rgba(2, 132, 199, 0.1)',
  selectionBorder: 'rgba(2, 132, 199, 0.5)',
  laneAlt: 'rgba(241, 245, 249, 0.5)',
  laneHeader: 'rgba(255, 255, 255, 0.95)',
  blockGlow: 'rgba(2, 132, 199, 0.3)',
  scrollbar: 'rgba(148, 163, 184, 0.4)',
  scrollbarHover: 'rgba(100, 116, 139, 0.6)',
};

export type ThemeColors = typeof DARK_THEME;
