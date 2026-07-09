import {
  AppState,
  Block,
  Lane,
  Project,
  Selection,
  TimelineEvent,
  Viewport,
  ThemeMode,
  SnapInterval,
} from '../types';
import {
  DEFAULT_DURATION,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  MAX_HISTORY_SIZE,
  LANE_COLORS,
  BLOCK_COLORS,
} from '../constants';
import { EventBus } from './EventBus';

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function createDefaultProject(): Project {
  return {
    name: 'New Project',
    duration: DEFAULT_DURATION,
    lanes: [
      { id: generateId(), name: 'Robot1', color: LANE_COLORS[0], blocks: [], order: 0, visible: true, locked: false },
      { id: generateId(), name: 'Robot2', color: LANE_COLORS[1], blocks: [], order: 1, visible: true, locked: false },
      { id: generateId(), name: 'Operator', color: LANE_COLORS[2], blocks: [], order: 2, visible: true, locked: false },
      { id: generateId(), name: 'Auto', color: LANE_COLORS[3], blocks: [], order: 3, visible: true, locked: false },
      { id: generateId(), name: 'Score', color: LANE_COLORS[4], blocks: [], order: 4, visible: true, locked: false },
    ],
    events: [],
    snapInterval: 0.5,
    vGoalTime: undefined,
    magnetEnabled: true,
  };
}

function createDefaultState(): AppState {
  return {
    project: createDefaultProject(),
    selection: { blockIds: [], eventIds: [] },
    viewport: {
      scrollX: 0,
      scrollY: 0,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    },
    playheadTime: 0,
    themeMode: 'dark',
  };
}

/**
 * Central state manager with undo/redo support.
 * Uses snapshot-based history.
 */
export class StateManager {
  private state: AppState;
  private history: string[] = [];
  private historyIndex: number = -1;
  private bus: EventBus;
  private batchDepth: number = 0;
  private batchDirty: boolean = false;

  constructor(bus: EventBus) {
    this.bus = bus;
    this.state = createDefaultState();
    this.pushSnapshot();
  }

  // ---- Getters ----

  getState(): AppState {
    return this.state;
  }

  getProject(): Project {
    return this.state.project;
  }

  getSelection(): Selection {
    return this.state.selection;
  }

  getViewport(): Viewport {
    return this.state.viewport;
  }

  getPlayheadTime(): number {
    return this.state.playheadTime;
  }

  getTheme(): ThemeMode {
    return this.state.themeMode;
  }

  getSortedLanes(): Lane[] {
    return [...this.state.project.lanes].sort((a, b) => a.order - b.order);
  }

  findBlock(blockId: string): { block: Block; lane: Lane } | null {
    for (const lane of this.state.project.lanes) {
      const block = lane.blocks.find(b => b.id === blockId);
      if (block) return { block, lane };
    }
    return null;
  }

  findEvent(eventId: string): TimelineEvent | null {
    return this.state.project.events.find(e => e.id === eventId) ?? null;
  }

  findLane(laneId: string): Lane | null {
    return this.state.project.lanes.find(l => l.id === laneId) ?? null;
  }

  // ---- Batch operations ----

  beginBatch(): void {
    this.batchDepth++;
  }

  endBatch(): void {
    this.batchDepth--;
    if (this.batchDepth <= 0) {
      this.batchDepth = 0;
      if (this.batchDirty) {
        this.pushSnapshot();
        this.batchDirty = false;
      }
    }
  }

  // ---- Mutations ----

  setProject(project: Project): void {
    this.state.project = project;
    this.recordChange();
    this.bus.emit('project:changed', this.state.project);
    this.bus.emit('render:request', undefined as any);
  }

  loadProject(project: Project): void {
    this.state = createDefaultState();
    this.state.project = deepClone(project);
    this.history = [];
    this.historyIndex = -1;
    this.pushSnapshot();
    this.bus.emit('project:changed', this.state.project);
    this.bus.emit('selection:changed', this.state.selection);
    this.bus.emit('viewport:changed', this.state.viewport);
    this.bus.emit('render:request', undefined as any);
  }

  // -- Blocks --

  addBlock(laneId: string, block?: Partial<Block>): Block {
    const lane = this.findLane(laneId);
    if (!lane) throw new Error(`Lane not found: ${laneId}`);
    const newBlock: Block = {
      id: generateId(),
      laneId,
      name: block?.name ?? 'New Block',
      color: block?.color ?? BLOCK_COLORS[lane.blocks.length % BLOCK_COLORS.length],
      startTime: block?.startTime ?? 0,
      minDuration: block?.minDuration ?? 5,
      bufferDuration: block?.bufferDuration ?? 2,
      memo: block?.memo ?? '',
    };
    lane.blocks.push(newBlock);
    this.recordChange();
    this.bus.emit('block:added', newBlock);
    this.bus.emit('render:request', undefined as any);
    return newBlock;
  }

  updateBlock(blockId: string, updates: Partial<Block>): void {
    const found = this.findBlock(blockId);
    if (!found) return;
    Object.assign(found.block, updates);
    // If laneId changed, move block to new lane
    if (updates.laneId && updates.laneId !== found.lane.id) {
      found.lane.blocks = found.lane.blocks.filter(b => b.id !== blockId);
      const newLane = this.findLane(updates.laneId);
      if (newLane) {
        newLane.blocks.push(found.block);
      }
    }
    this.recordChange();
    this.bus.emit('block:updated', found.block);
    this.bus.emit('render:request', undefined as any);
  }

  removeBlock(blockId: string): void {
    for (const lane of this.state.project.lanes) {
      const idx = lane.blocks.findIndex(b => b.id === blockId);
      if (idx !== -1) {
        lane.blocks.splice(idx, 1);
        this.state.selection.blockIds = this.state.selection.blockIds.filter(id => id !== blockId);
        this.recordChange();
        this.bus.emit('block:removed', blockId);
        this.bus.emit('selection:changed', this.state.selection);
        this.bus.emit('render:request', undefined as any);
        return;
      }
    }
  }

  removeSelectedBlocks(): void {
    const { blockIds, eventIds } = this.state.selection;
    if (blockIds.length === 0 && eventIds.length === 0) return;
    this.beginBatch();
    for (const id of [...blockIds]) {
      this.removeBlock(id);
    }
    for (const id of [...eventIds]) {
      this.removeEvent(id);
    }
    this.endBatch();
  }

  // -- Lanes --

  addLane(name?: string): Lane {
    const order = this.state.project.lanes.length;
    const lane: Lane = {
      id: generateId(),
      name: name ?? `Lane ${order + 1}`,
      color: LANE_COLORS[order % LANE_COLORS.length],
      blocks: [],
      order,
      visible: true,
      locked: false,
    };
    this.state.project.lanes.push(lane);
    this.recordChange();
    this.bus.emit('lane:added', lane);
    this.bus.emit('render:request', undefined as any);
    return lane;
  }

  removeLane(laneId: string): void {
    const idx = this.state.project.lanes.findIndex(l => l.id === laneId);
    if (idx === -1) return;
    // Remove blocks in selection that belong to this lane
    const lane = this.state.project.lanes[idx];
    const blockIds = lane.blocks.map(b => b.id);
    this.state.selection.blockIds = this.state.selection.blockIds.filter(
      id => !blockIds.includes(id)
    );
    this.state.project.lanes.splice(idx, 1);
    // Reorder
    this.state.project.lanes.forEach((l, i) => (l.order = i));
    this.recordChange();
    this.bus.emit('lane:removed', laneId);
    this.bus.emit('selection:changed', this.state.selection);
    this.bus.emit('render:request', undefined as any);
  }

  updateLane(laneId: string, updates: Partial<Lane>): void {
    const lane = this.findLane(laneId);
    if (!lane) return;
    Object.assign(lane, updates);
    this.recordChange();
    this.bus.emit('lane:updated', lane);
    this.bus.emit('render:request', undefined as any);
  }

  reorderLanes(orderedIds: string[]): void {
    orderedIds.forEach((id, i) => {
      const lane = this.findLane(id);
      if (lane) lane.order = i;
    });
    this.recordChange();
    this.bus.emit('lane:reordered', this.getSortedLanes());
    this.bus.emit('render:request', undefined as any);
  }

  // -- Events --

  addEvent(event?: Partial<TimelineEvent>): TimelineEvent {
    const newEvent: TimelineEvent = {
      id: generateId(),
      time: event?.time ?? this.state.playheadTime,
      label: event?.label ?? 'Event',
      color: event?.color ?? '#00d4ff',
      icon: event?.icon ?? '★',
    };
    this.state.project.events.push(newEvent);
    this.recordChange();
    this.bus.emit('event:added', newEvent);
    this.bus.emit('render:request', undefined as any);
    return newEvent;
  }

  updateEvent(eventId: string, updates: Partial<TimelineEvent>): void {
    const ev = this.findEvent(eventId);
    if (!ev) return;
    Object.assign(ev, updates);
    this.recordChange();
    this.bus.emit('event:updated', ev);
    this.bus.emit('render:request', undefined as any);
  }

  removeEvent(eventId: string): void {
    const idx = this.state.project.events.findIndex(e => e.id === eventId);
    if (idx !== -1) {
      this.state.project.events.splice(idx, 1);
      this.state.selection.eventIds = this.state.selection.eventIds.filter(id => id !== eventId);
      this.recordChange();
      this.bus.emit('event:removed', eventId);
      this.bus.emit('selection:changed', this.state.selection);
      this.bus.emit('render:request', undefined as any);
    }
  }

  // -- Selection --

  setSelection(selection: Selection): void {
    this.state.selection = selection;
    this.bus.emit('selection:changed', this.state.selection);
    this.bus.emit('render:request', undefined as any);
  }

  clearSelection(): void {
    this.setSelection({ blockIds: [], eventIds: [] });
  }

  toggleBlockSelection(blockId: string, multi: boolean): void {
    const sel = { ...this.state.selection };
    if (multi) {
      if (sel.blockIds.includes(blockId)) {
        sel.blockIds = sel.blockIds.filter(id => id !== blockId);
      } else {
        sel.blockIds = [...sel.blockIds, blockId];
      }
    } else {
      sel.blockIds = [blockId];
      sel.eventIds = [];
    }
    this.setSelection(sel);
  }

  toggleEventSelection(eventId: string, multi: boolean): void {
    const sel = { ...this.state.selection };
    if (multi) {
      if (sel.eventIds.includes(eventId)) {
        sel.eventIds = sel.eventIds.filter(id => id !== eventId);
      } else {
        sel.eventIds = [...sel.eventIds, eventId];
      }
    } else {
      sel.eventIds = [eventId];
      sel.blockIds = [];
    }
    this.setSelection(sel);
  }

  // -- Viewport --

  setViewport(viewport: Partial<Viewport>): void {
    Object.assign(this.state.viewport, viewport);
    this.bus.emit('viewport:changed', this.state.viewport);
    this.bus.emit('render:request', undefined as any);
  }

  // -- Playhead --

  setPlayheadTime(time: number): void {
    this.state.playheadTime = Math.max(0, Math.min(time, this.state.project.duration));
    this.bus.emit('playhead:changed', this.state.playheadTime);
    this.bus.emit('render:request', undefined as any);
  }

  // -- Theme --

  setTheme(mode: ThemeMode): void {
    this.state.themeMode = mode;
    this.bus.emit('theme:changed', mode);
    this.bus.emit('render:request', undefined as any);
  }

  toggleTheme(): void {
    this.setTheme(this.state.themeMode === 'dark' ? 'light' : 'dark');
  }

  // -- Snap --

  setSnapInterval(snap: SnapInterval): void {
    this.state.project.snapInterval = snap;
    this.bus.emit('project:changed', this.state.project);
  }

  // -- Duration --

  setDuration(duration: number): void {
    this.state.project.duration = Math.max(1, duration);
    this.recordChange();
    this.bus.emit('project:changed', this.state.project);
    this.bus.emit('render:request', undefined as any);
  }

  // -- Magnet --

  setMagnetEnabled(enabled: boolean): void {
    this.state.project.magnetEnabled = enabled;
    this.recordChange();
    this.bus.emit('project:changed', this.state.project);
    this.bus.emit('render:request', undefined as any);
  }

  // -- V-Goal --

  setVGoalTime(time: number | undefined): void {
    this.state.project.vGoalTime = time !== undefined ? Math.max(0, Math.min(time, this.state.project.duration)) : undefined;
    this.recordChange();
    this.bus.emit('project:changed', this.state.project);
    this.bus.emit('render:request', undefined as any);
  }

  // ---- Undo / Redo ----

  undo(): boolean {
    if (this.historyIndex <= 0) return false;
    this.historyIndex--;
    this.restoreSnapshot();
    return true;
  }

  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false;
    this.historyIndex++;
    this.restoreSnapshot();
    return true;
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  // ---- Private ----

  private recordChange(): void {
    if (this.batchDepth > 0) {
      this.batchDirty = true;
      return;
    }
    this.pushSnapshot();
  }

  private pushSnapshot(): void {
    const snapshot = JSON.stringify({
      project: this.state.project,
      playheadTime: this.state.playheadTime,
    });
    // Remove future history if we're not at the end
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(snapshot);
    // Trim history
    if (this.history.length > MAX_HISTORY_SIZE) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
  }

  private restoreSnapshot(): void {
    const snapshot = JSON.parse(this.history[this.historyIndex]);
    this.state.project = snapshot.project;
    this.state.playheadTime = snapshot.playheadTime;
    this.bus.emit('project:changed', this.state.project);
    this.bus.emit('playhead:changed', this.state.playheadTime);
    this.bus.emit('selection:changed', this.state.selection);
    this.bus.emit('render:request', undefined as any);
  }
}
