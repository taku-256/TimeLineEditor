import { HitTestResult, Block, Rect, DragState } from '../types';
import { StateManager } from '../state/StateManager';
import { EventBus } from '../state/EventBus';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { ClipboardManager } from '../state/ClipboardManager';
import {
  HEADER_HEIGHT,
  LANE_HEADER_WIDTH,
  EDGE_HANDLE_WIDTH,
  LANE_PADDING,
  ZOOM_FACTOR,
  EVENT_MARKER_SIZE,
} from '../constants';
import { snapTime, clamp } from '../utils/time';
import { pointInRect, normalizeRect, rectsOverlap } from '../utils/geometry';

/**
 * Unified interaction handler for mouse, keyboard, and wheel events on the canvas.
 */
export class InteractionHandler {
  private canvas: HTMLCanvasElement;
  private stateManager: StateManager;
  private bus: EventBus;
  private renderer: CanvasRenderer;
  private clipboard: ClipboardManager;

  private dragState: DragState = { mode: 'none', startX: 0, startY: 0, currentX: 0, currentY: 0 };
  private hoveredBlockId: string | null = null;
  private activeMagnetTime: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    stateManager: StateManager,
    bus: EventBus,
    renderer: CanvasRenderer,
    clipboard: ClipboardManager
  ) {
    this.canvas = canvas;
    this.stateManager = stateManager;
    this.bus = bus;
    this.renderer = renderer;
    this.clipboard = clipboard;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.onDoubleClick);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('keydown', this.onKeyDown);
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  // ---- Hit Testing ----

  private hitTest(cx: number, cy: number): HitTestResult {
    const project = this.stateManager.getProject();
    const viewport = this.stateManager.getViewport();

    // Check if near top edge of the score graph (resizable area)
    const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
    const graphHeight = viewport.scoreGraphHeight ?? 70;
    const graphTopY = canvasHeight - graphHeight;
    if (Math.abs(cy - graphTopY) <= 6) {
      return { type: 'graph-resize-edge' };
    }

    // Check if in header area
    if (cy < HEADER_HEIGHT) {
      // Check v-goal hit test
      if (project.vGoalTime !== undefined) {
        const vGoalX = this.renderer.timeToX(project.vGoalTime);
        if (Math.abs(cx - vGoalX) <= 12) {
          return { type: 'vgoal', time: project.vGoalTime };
        }
      }
      return { type: 'timeline-header', time: this.renderer.xToTime(cx) };
    }

    // Check if in lane header
    if (cx < LANE_HEADER_WIDTH) {
      const lanes = this.stateManager.getSortedLanes();
      const laneIdx = this.renderer.yToLaneIndex(cy);
      if (laneIdx >= 0 && laneIdx < lanes.length) {
        return { type: 'lane-header', laneId: lanes[laneIdx].id };
      }
      return { type: 'empty' };
    }

    // Check events first (they span all lanes)
    const events = project.events;
    for (const event of events) {
      const ex = this.renderer.timeToX(event.time);
      if (Math.abs(cx - ex) <= EVENT_MARKER_SIZE) {
        return { type: 'event', eventId: event.id, time: event.time };
      }
    }

    // Check blocks
    const lanes = this.stateManager.getSortedLanes();
    const laneIdx = this.renderer.yToLaneIndex(cy);
    if (laneIdx >= 0 && laneIdx < lanes.length) {
      const lane = lanes[laneIdx];
      const laneY = this.renderer.laneIndexToY(laneIdx);
      const viewport = this.stateManager.getViewport();

      for (let i = lane.blocks.length - 1; i >= 0; i--) {
        const block = lane.blocks[i];
        const bx = block.startTime * viewport.zoom - viewport.scrollX + LANE_HEADER_WIDTH;
        const bw = (block.minDuration + block.bufferDuration) * viewport.zoom;
        const by = laneY + LANE_PADDING;
        const bh = this.renderer.getLaneHeight() - LANE_PADDING * 2;

        if (pointInRect({ x: cx, y: cy }, { x: bx, y: by, width: bw, height: bh })) {
          // Check if near left edge
          if (cx - bx < EDGE_HANDLE_WIDTH) {
            return { type: 'block-left-edge', blockId: block.id, laneId: lane.id };
          }
          // Check if near right edge
          if (bx + bw - cx < EDGE_HANDLE_WIDTH) {
            return { type: 'block-right-edge', blockId: block.id, laneId: lane.id };
          }
          return { type: 'block', blockId: block.id, laneId: lane.id };
        }
      }

      return { type: 'empty', laneId: lane.id, time: this.renderer.xToTime(cx) };
    }

    return { type: 'empty', time: this.renderer.xToTime(cx) };
  }

  // ---- Mouse Events ----

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return; // Only left click
    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const hit = this.hitTest(cx, cy);
    const project = this.stateManager.getProject();

    this.dragState = {
      mode: 'none',
      startX: cx,
      startY: cy,
      currentX: cx,
      currentY: cy,
    };

    switch (hit.type) {
      case 'graph-resize-edge': {
        const vp = this.stateManager.getViewport();
        this.dragState.mode = 'resize-graph';
        this.dragState.originScoreGraphHeight = vp.scoreGraphHeight ?? 70;
        break;
      }

      case 'vgoal': {
        if (project.vGoalTime === undefined) break;
        this.dragState.mode = 'move-vgoal';
        this.dragState.originVGoalTime = project.vGoalTime;
        break;
      }

      case 'timeline-header': {
        // Click on header sets playhead
        const time = clamp(this.renderer.xToTime(cx), 0, project.duration);
        const snapped = snapTime(time, project.snapInterval);
        this.stateManager.setPlayheadTime(snapped);
        this.dragState.mode = 'move-playhead';
        break;
      }

      case 'block': {
        if (!hit.blockId) break;
        this.stateManager.toggleBlockSelection(hit.blockId, e.ctrlKey || e.metaKey);
        // Start move drag
        this.dragState.mode = 'move-block';
        const sel = this.stateManager.getSelection();
        this.dragState.originBlockStates = sel.blockIds.map(id => {
          const found = this.stateManager.findBlock(id);
          if (!found) return null;
          return {
            blockId: id,
            laneId: found.lane.id,
            startTime: found.block.startTime,
            minDuration: found.block.minDuration,
            bufferDuration: found.block.bufferDuration,
          };
        }).filter(Boolean) as any;
        break;
      }

      case 'block-left-edge': {
        if (!hit.blockId) break;
        this.stateManager.toggleBlockSelection(hit.blockId, false);
        this.dragState.mode = 'resize-left';
        const found = this.stateManager.findBlock(hit.blockId);
        if (found) {
          this.dragState.originBlockStates = [{
            blockId: hit.blockId,
            laneId: found.lane.id,
            startTime: found.block.startTime,
            minDuration: found.block.minDuration,
            bufferDuration: found.block.bufferDuration,
          }];
        }
        break;
      }

      case 'block-right-edge': {
        if (!hit.blockId) break;
        this.stateManager.toggleBlockSelection(hit.blockId, false);
        this.dragState.mode = 'resize-right';
        const found = this.stateManager.findBlock(hit.blockId);
        if (found) {
          this.dragState.originBlockStates = [{
            blockId: hit.blockId,
            laneId: found.lane.id,
            startTime: found.block.startTime,
            minDuration: found.block.minDuration,
            bufferDuration: found.block.bufferDuration,
          }];
        }
        break;
      }

      case 'event': {
        if (!hit.eventId) break;
        this.stateManager.toggleEventSelection(hit.eventId, e.ctrlKey || e.metaKey);
        this.dragState.mode = 'move-event';
        const ev = this.stateManager.findEvent(hit.eventId);
        if (ev) {
          this.dragState.originEventStates = [{
            eventId: hit.eventId,
            time: ev.time,
          }];
        }
        break;
      }

      case 'empty': {
        if (!(e.ctrlKey || e.metaKey)) {
          this.stateManager.clearSelection();
        }
        // Start selection rectangle
        this.dragState.mode = 'select-rect';
        break;
      }

      case 'lane-header': {
        // Could start lane drag/reorder - skip for now
        break;
      }
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const project = this.stateManager.getProject();

    // Update cursor based on hover
    if (this.dragState.mode === 'none') {
      const hit = this.hitTest(cx, cy);
      switch (hit.type) {
        case 'graph-resize-edge':
          this.canvas.style.cursor = 'ns-resize';
          break;
        case 'block-left-edge':
          this.canvas.style.cursor = 'ew-resize';
          break;
        case 'block-right-edge':
          this.canvas.style.cursor = 'ew-resize';
          break;
        case 'block':
          this.canvas.style.cursor = 'grab';
          break;
        case 'event':
        case 'vgoal':
        case 'timeline-header':
          this.canvas.style.cursor = 'pointer';
          break;
        default:
          this.canvas.style.cursor = 'default';
      }

      // Update hover state for visual feedback
      const newHoveredBlockId = hit.blockId || null;
      if (newHoveredBlockId !== this.hoveredBlockId) {
        this.hoveredBlockId = newHoveredBlockId;
        this.bus.emit('render:request', undefined as any);
      }
      return;
    }

    this.dragState.currentX = cx;
    this.dragState.currentY = cy;
    const dx = cx - this.dragState.startX;
    const viewport = this.stateManager.getViewport();
    const snap = project.snapInterval;

    switch (this.dragState.mode) {
      case 'move-block': {
        this.canvas.style.cursor = 'grabbing';
        if (!this.dragState.originBlockStates) break;
        const timeDelta = dx / viewport.zoom;

        // Check if moved to different lane
        const lanes = this.stateManager.getSortedLanes();
        const newLaneIdx = this.renderer.yToLaneIndex(cy);
        const origLaneIdx = this.renderer.yToLaneIndex(this.dragState.startY);
        const laneShift = newLaneIdx - origLaneIdx;

        this.stateManager.beginBatch();
        this.activeMagnetTime = null; // reset guide
        const blockIds = this.dragState.originBlockStates.map(o => o.blockId);

        for (const origin of this.dragState.originBlockStates) {
          let targetStart = origin.startTime + timeDelta;
          
          // Magnet snapping (high priority)
          const snapped = this.getMagnetSnappedTime(targetStart, blockIds);
          if (this.activeMagnetTime !== null) {
            targetStart = snapped;
          } else {
            targetStart = snapTime(targetStart, snap);
          }
          targetStart = Math.max(0, targetStart);

          const updates: Partial<Block> = { startTime: targetStart };

          // Lane change
          if (laneShift !== 0) {
            const origIdx = lanes.findIndex(l => l.id === origin.laneId);
            const targetIdx = clamp(origIdx + laneShift, 0, lanes.length - 1);
            if (targetIdx !== origIdx) {
              updates.laneId = lanes[targetIdx].id;
            }
          }

          this.stateManager.updateBlock(origin.blockId, updates);
        }
        this.stateManager.endBatch();
        break;
      }

      case 'resize-left': {
        if (!this.dragState.originBlockStates?.[0]) break;
        const origin = this.dragState.originBlockStates[0];
        const timeDelta = dx / viewport.zoom;
        const endTime = origin.startTime + origin.minDuration + origin.bufferDuration;
        
        let targetStart = origin.startTime + timeDelta;
        this.activeMagnetTime = null;
        const snapped = this.getMagnetSnappedTime(targetStart, [origin.blockId]);
        if (this.activeMagnetTime !== null) {
          targetStart = snapped;
        } else {
          targetStart = snapTime(targetStart, snap);
        }
        targetStart = Math.max(0, targetStart);

        // Ensure minimum block width
        const totalTime = endTime - targetStart;
        if (totalTime < 0.1) break;
        const newMin = Math.max(0.1, totalTime - origin.bufferDuration);
        this.stateManager.updateBlock(origin.blockId, {
          startTime: targetStart,
          minDuration: newMin,
        });
        break;
      }

      case 'resize-right': {
        if (!this.dragState.originBlockStates?.[0]) break;
        const origin = this.dragState.originBlockStates[0];
        const timeDelta = dx / viewport.zoom;
        
        let targetEnd = origin.startTime + origin.minDuration + origin.bufferDuration + timeDelta;
        this.activeMagnetTime = null;
        const snapped = this.getMagnetSnappedTime(targetEnd, [origin.blockId]);
        if (this.activeMagnetTime !== null) {
          targetEnd = snapped;
        } else {
          targetEnd = snapTime(targetEnd, snap);
        }

        const newTotal = targetEnd - origin.startTime;
        if (newTotal < 0.1) break;

        // If total < minDuration, reduce minDuration
        if (newTotal <= origin.minDuration) {
          this.stateManager.updateBlock(origin.blockId, {
            minDuration: Math.max(0.1, newTotal),
            bufferDuration: 0,
          });
        } else {
          this.stateManager.updateBlock(origin.blockId, {
            bufferDuration: newTotal - origin.minDuration,
          });
        }
        break;
      }

      case 'move-event': {
        if (!this.dragState.originEventStates?.[0]) break;
        const origin = this.dragState.originEventStates[0];
        const timeDelta = dx / viewport.zoom;

        let targetTime = origin.time + timeDelta;
        this.activeMagnetTime = null;
        const snapped = this.getMagnetSnappedTime(targetTime, [origin.eventId]);
        if (this.activeMagnetTime !== null) {
          targetTime = snapped;
        } else {
          targetTime = snapTime(targetTime, snap);
        }
        targetTime = clamp(targetTime, 0, project.duration);

        this.stateManager.updateEvent(origin.eventId, { time: targetTime });
        break;
      }

      case 'move-vgoal': {
        if (this.dragState.originVGoalTime === undefined) break;
        const timeDelta = dx / viewport.zoom;

        let targetTime = this.dragState.originVGoalTime + timeDelta;
        this.activeMagnetTime = null;
        const snapped = this.getMagnetSnappedTime(targetTime);
        if (this.activeMagnetTime !== null) {
          targetTime = snapped;
        } else {
          targetTime = snapTime(targetTime, snap);
        }
        targetTime = clamp(targetTime, 0, project.duration);

        this.stateManager.setVGoalTime(targetTime);
        break;
      }

      case 'move-playhead': {
        const time = clamp(this.renderer.xToTime(cx), 0, project.duration);
        const snapped = snapTime(time, snap);
        this.stateManager.setPlayheadTime(snapped);
        break;
      }

      case 'select-rect': {
        // Draw selection rectangle and select blocks inside
        this.selectByRect();
        this.bus.emit('render:request', undefined as any);
        break;
      }

      case 'resize-graph': {
        this.canvas.style.cursor = 'ns-resize';
        if (this.dragState.originScoreGraphHeight === undefined) break;
        const dy = cy - this.dragState.startY;
        const newHeight = clamp(this.dragState.originScoreGraphHeight - dy, 40, 450);
        this.stateManager.setViewport({ scoreGraphHeight: newHeight });
        break;
      }
    }
  };

  private onMouseUp = (_e: MouseEvent): void => {
    if (this.dragState.mode === 'select-rect') {
      this.selectByRect();
    }
    this.dragState = { mode: 'none', startX: 0, startY: 0, currentX: 0, currentY: 0 };
    this.activeMagnetTime = null;
    this.renderer.activeMagnetTime = null; // Sync to renderer
    this.canvas.style.cursor = 'default';
    this.bus.emit('render:request', undefined as any);
  };

  // ---- Magnet Snapping Calculation ----

  private getMagnetSnappedTime(targetTime: number, excludeBlockIds: string[] = []): number {
    const project = this.stateManager.getProject();
    if (project.magnetEnabled === false) return targetTime;

    const viewport = this.stateManager.getViewport();
    const thresholdPixels = 10;
    const thresholdSeconds = thresholdPixels / viewport.zoom;

    // Collect all snap candidate times
    const candidates: number[] = [];

    // All events
    for (const event of project.events) {
      candidates.push(event.time);
    }

    // Playhead
    candidates.push(this.stateManager.getPlayheadTime());

    // V-Goal
    if (project.vGoalTime !== undefined) {
      candidates.push(project.vGoalTime);
    }

    // All blocks
    for (const lane of project.lanes) {
      for (const block of lane.blocks) {
        if (excludeBlockIds.includes(block.id)) continue;
        candidates.push(block.startTime);
        candidates.push(block.startTime + block.minDuration + block.bufferDuration);
      }
    }

    // Find the closest candidate within the threshold
    let closestTime = targetTime;
    let minDiff = thresholdSeconds;

    for (const cand of candidates) {
      const diff = Math.abs(cand - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestTime = cand;
      }
    }

    if (minDiff < thresholdSeconds) {
      this.activeMagnetTime = closestTime;
      this.renderer.activeMagnetTime = closestTime; // Sync to renderer
      return closestTime;
    }

    this.activeMagnetTime = null;
    this.renderer.activeMagnetTime = null; // Sync to renderer
    return targetTime;
  }

  getActiveMagnetTime(): number | null {
    return this.activeMagnetTime;
  }

  // ---- Selection Rectangle ----

  private selectByRect(): void {
    const r = normalizeRect(
      this.dragState.startX,
      this.dragState.startY,
      this.dragState.currentX,
      this.dragState.currentY
    );

    if (r.width < 5 && r.height < 5) return;

    const lanes = this.stateManager.getSortedLanes();
    const viewport = this.stateManager.getViewport();
    const selectedBlocks: string[] = [];
    const selectedEvents: string[] = [];

    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      const laneY = this.renderer.laneIndexToY(i);
      for (const block of lane.blocks) {
        const bx = block.startTime * viewport.zoom - viewport.scrollX + LANE_HEADER_WIDTH;
        const bw = (block.minDuration + block.bufferDuration) * viewport.zoom;
        const by = laneY + LANE_PADDING;
        const bh = this.renderer.getLaneHeight() - LANE_PADDING * 2;
        const blockRect: Rect = { x: bx, y: by, width: bw, height: bh };
        if (rectsOverlap(r, blockRect)) {
          selectedBlocks.push(block.id);
        }
      }
    }

    for (const event of this.stateManager.getProject().events) {
      const ex = this.renderer.timeToX(event.time);
      if (ex >= r.x && ex <= r.x + r.width) {
        selectedEvents.push(event.id);
      }
    }

    this.stateManager.setSelection({
      blockIds: selectedBlocks,
      eventIds: selectedEvents,
    });
  }

  // ---- Wheel ----

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;

    const isZoomKey = e.ctrlKey || e.metaKey || e.altKey;

    if (isZoomKey) {
      // Zoom centered on cursor (with Ctrl, Cmd, or Alt)
      const vp = this.stateManager.getViewport();
      const timeAtCursor = this.renderer.xToTime(cx);
      const factor = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
      const newZoom = clamp(vp.zoom * factor, vp.minZoom, vp.maxZoom);
      const newScrollX = Math.max(0, timeAtCursor * newZoom - (cx - LANE_HEADER_WIDTH));
      this.stateManager.setViewport({ zoom: newZoom, scrollX: newScrollX });
    } else if (e.shiftKey) {
      // Vertical scroll (with Shift)
      const vp = this.stateManager.getViewport();
      const newScrollY = Math.max(0, vp.scrollY + e.deltaY);
      this.stateManager.setViewport({ scrollY: newScrollY });
    } else {
      // Horizontal scroll (plain wheel for effortless scrolling!)
      const vp = this.stateManager.getViewport();
      const newScrollX = Math.max(0, vp.scrollX + e.deltaY);
      this.stateManager.setViewport({ scrollX: newScrollX });
    }
  };

  // ---- Double Click ----

  private onDoubleClick = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const hit = this.hitTest(cx, cy);

    if (hit.type === 'empty' && hit.laneId) {
      // Add new block at click position
      const time = snapTime(
        this.renderer.xToTime(cx),
        this.stateManager.getProject().snapInterval
      );
      const block = this.stateManager.addBlock(hit.laneId, { startTime: Math.max(0, time) });
      this.stateManager.setSelection({ blockIds: [block.id], eventIds: [] });
    }
  };

  // ---- Context Menu ----

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const hit = this.hitTest(cx, cy);
    const snap = this.stateManager.getProject().snapInterval;

    const items = [];

    if (hit.type === 'block' || hit.type === 'block-left-edge' || hit.type === 'block-right-edge') {
      // Select block if not already selected
      if (hit.blockId && !this.stateManager.getSelection().blockIds.includes(hit.blockId)) {
        this.stateManager.toggleBlockSelection(hit.blockId, false);
      }
      items.push(
        { label: 'Copy', shortcut: 'Ctrl+C', icon: '📋', action: () => this.clipboard.copy() },
        { label: 'Paste', shortcut: 'Ctrl+V', icon: '📥', action: () => this.clipboard.paste(), disabled: !this.clipboard.hasContent() },
        { label: 'Delete', shortcut: 'Del', icon: '🗑️', action: () => this.stateManager.removeSelectedBlocks(), separator: true },
        { label: 'Duplicate', shortcut: 'Ctrl+D', icon: '📑', action: () => this.duplicateSelected() },
      );
    } else if (hit.type === 'event') {
      if (hit.eventId) {
        this.stateManager.toggleEventSelection(hit.eventId, false);
      }
      items.push(
        { label: 'Delete Event', icon: '🗑️', action: () => this.stateManager.removeSelectedBlocks() },
      );
    } else if (hit.type === 'empty' && hit.laneId) {
      const time = snapTime(this.renderer.xToTime(cx), snap);
      items.push(
        { label: 'Add Block Here', icon: '➕', action: () => {
          const block = this.stateManager.addBlock(hit.laneId!, { startTime: Math.max(0, time) });
          this.stateManager.setSelection({ blockIds: [block.id], eventIds: [] });
        }},
        { label: 'Add Event Here', icon: '⚡', action: () => {
          const ev = this.stateManager.addEvent({ time: Math.max(0, time) });
          this.stateManager.setSelection({ blockIds: [], eventIds: [ev.id] });
        }},
        { label: 'Paste', icon: '📥', action: () => this.clipboard.paste(), disabled: !this.clipboard.hasContent(), separator: true },
      );
    }

    if (items.length > 0) {
      this.bus.emit('context-menu:show', {
        x: e.clientX,
        y: e.clientY,
        items,
      });
    }
  };

  // ---- Keyboard ----

  private onKeyDown = (e: KeyboardEvent): void => {
    // Don't handle if focus is on an input element
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

    const ctrl = e.ctrlKey || e.metaKey;

    // Undo/Redo
    if (ctrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.stateManager.undo();
      return;
    }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      this.stateManager.redo();
      return;
    }

    // Copy/Paste
    if (ctrl && e.key === 'c') {
      e.preventDefault();
      this.clipboard.copy();
      return;
    }
    if (ctrl && e.key === 'v') {
      e.preventDefault();
      this.clipboard.paste();
      return;
    }

    // Duplicate
    if (ctrl && e.key === 'd') {
      e.preventDefault();
      this.duplicateSelected();
      return;
    }

    // Select All
    if (ctrl && e.key === 'a') {
      e.preventDefault();
      const allBlocks: string[] = [];
      for (const lane of this.stateManager.getSortedLanes()) {
        for (const block of lane.blocks) {
          allBlocks.push(block.id);
        }
      }
      const allEvents = this.stateManager.getProject().events.map(e => e.id);
      this.stateManager.setSelection({ blockIds: allBlocks, eventIds: allEvents });
      return;
    }

    // Delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.stateManager.removeSelectedBlocks();
      return;
    }

    // Search
    if (ctrl && e.key === 'f') {
      e.preventDefault();
      this.bus.emit('search:open', undefined as any);
      return;
    }

    // Escape
    if (e.key === 'Escape') {
      this.stateManager.clearSelection();
      this.bus.emit('context-menu:hide', undefined as any);
      this.bus.emit('search:close', undefined as any);
      return;
    }
  };

  // ---- Helpers ----

  private duplicateSelected(): void {
    this.clipboard.copy();
    this.clipboard.paste();
  }

  /**
   * Get the current drag state for rendering selection rectangles, etc.
   */
  getDragState(): DragState {
    return this.dragState;
  }
}
