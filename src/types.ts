// ============================================================
// Core Data Types
// ============================================================

export type SnapInterval = 0.1 | 0.5 | 1 | null;

export interface Project {
  name: string;
  duration: number; // total timeline duration in seconds (default 120)
  lanes: Lane[];
  events: TimelineEvent[];
  snapInterval: SnapInterval;
}

export interface Lane {
  id: string;
  name: string;
  color: string;
  blocks: Block[];
  order: number;
  visible: boolean;
  locked: boolean;
}

export interface Block {
  id: string;
  laneId: string;
  name: string;
  color: string;
  startTime: number;       // seconds (0.1 precision)
  minDuration: number;     // required time (solid part)
  bufferDuration: number;  // buffer time (striped part)
  memo: string;
}

export interface TimelineEvent {
  id: string;
  time: number;
  label: string;
  color: string;
  icon: string; // e.g. "★", "▶", "●"
}

// ============================================================
// UI / Interaction Types
// ============================================================

export interface Viewport {
  scrollX: number;      // horizontal scroll in pixels
  scrollY: number;      // vertical scroll in pixels
  zoom: number;         // pixels per second
  minZoom: number;
  maxZoom: number;
}

export interface Selection {
  blockIds: string[];
  eventIds: string[];
}

export type DragMode =
  | 'none'
  | 'move-block'
  | 'resize-left'
  | 'resize-right'
  | 'move-event'
  | 'pan'
  | 'select-rect'
  | 'move-playhead';

export interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  originBlockStates?: BlockDragOrigin[];
  originEventStates?: EventDragOrigin[];
  targetLaneId?: string;
}

export interface BlockDragOrigin {
  blockId: string;
  laneId: string;
  startTime: number;
  minDuration: number;
  bufferDuration: number;
}

export interface EventDragOrigin {
  eventId: string;
  time: number;
}

export interface HitTestResult {
  type: 'block' | 'block-left-edge' | 'block-right-edge' | 'event' | 'lane-header' | 'timeline-header' | 'empty';
  blockId?: string;
  eventId?: string;
  laneId?: string;
  time?: number;
}

// ============================================================
// Theme
// ============================================================

export type ThemeMode = 'dark' | 'light';

// ============================================================
// State Snapshot (for undo/redo)
// ============================================================

export interface AppState {
  project: Project;
  selection: Selection;
  viewport: Viewport;
  playheadTime: number;
  themeMode: ThemeMode;
}

// Serializable project data (for JSON save/load)
export interface ProjectData {
  version: number;
  project: Project;
}

// ============================================================
// Event Bus Event Map
// ============================================================

export interface EventMap {
  'state:changed': AppState;
  'project:changed': Project;
  'selection:changed': Selection;
  'viewport:changed': Viewport;
  'playhead:changed': number;
  'theme:changed': ThemeMode;
  'block:added': Block;
  'block:removed': string;
  'block:updated': Block;
  'lane:added': Lane;
  'lane:removed': string;
  'lane:updated': Lane;
  'lane:reordered': Lane[];
  'event:added': TimelineEvent;
  'event:removed': string;
  'event:updated': TimelineEvent;
  'render:request': void;
  'context-menu:show': { x: number; y: number; items: ContextMenuItem[] };
  'context-menu:hide': void;
  'modal:show': ModalConfig;
  'modal:hide': void;
  'search:open': void;
  'search:close': void;
  'toast:show': { message: string; type: 'info' | 'success' | 'warning' | 'error' };
}

export interface ContextMenuItem {
  label: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
  separator?: boolean;
  disabled?: boolean;
}

export interface ModalConfig {
  title: string;
  content: HTMLElement | string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

// ============================================================
// Utility Types
// ============================================================

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}
