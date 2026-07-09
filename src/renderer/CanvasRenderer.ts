import { StateManager } from '../state/StateManager';
import { EventBus } from '../state/EventBus';
import { DARK_THEME, LIGHT_THEME, ThemeColors, HEADER_HEIGHT, LANE_HEADER_WIDTH } from '../constants';
import { GridRenderer } from './GridRenderer';
import { LaneRenderer } from './LaneRenderer';
import { BlockRenderer } from './BlockRenderer';
import { EventRenderer } from './EventRenderer';
import { PlayheadRenderer } from './PlayheadRenderer';

/**
 * Main canvas renderer that composes all sub-renderers.
 * Handles DPR scaling, dirty-flag rendering, and viewport management.
 */
export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stateManager: StateManager;
  private bus: EventBus;
  private dpr: number = 1;
  private dirty: boolean = true;
  private animFrameId: number = 0;

  // Sub-renderers
  private gridRenderer: GridRenderer;
  private laneRenderer: LaneRenderer;
  private blockRenderer: BlockRenderer;
  private eventRenderer: EventRenderer;
  private playheadRenderer: PlayheadRenderer;

  constructor(canvas: HTMLCanvasElement, stateManager: StateManager, bus: EventBus) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.stateManager = stateManager;
    this.bus = bus;

    this.gridRenderer = new GridRenderer(this.ctx);
    this.laneRenderer = new LaneRenderer(this.ctx);
    this.blockRenderer = new BlockRenderer(this.ctx);
    this.eventRenderer = new EventRenderer(this.ctx);
    this.playheadRenderer = new PlayheadRenderer(this.ctx);

    this.bus.on('render:request', () => this.markDirty());

    this.resize();
    this.startRenderLoop();
  }

  getThemeColors(): ThemeColors {
    return this.stateManager.getTheme() === 'dark' ? DARK_THEME : LIGHT_THEME;
  }

  /**
   * Convert a canvas pixel X position to a time value.
   */
  xToTime(x: number): number {
    const vp = this.stateManager.getViewport();
    return (x - LANE_HEADER_WIDTH + vp.scrollX) / vp.zoom;
  }

  /**
   * Convert a time value to canvas pixel X position.
   */
  timeToX(time: number): number {
    const vp = this.stateManager.getViewport();
    return time * vp.zoom - vp.scrollX + LANE_HEADER_WIDTH;
  }

  /**
   * Convert a canvas pixel Y position to a lane index.
   */
  yToLaneIndex(y: number): number {
    const vp = this.stateManager.getViewport();
    return Math.floor((y - HEADER_HEIGHT + vp.scrollY) / this.getLaneHeight());
  }

  getLaneHeight(): number {
    return 56; // LANE_HEIGHT from constants
  }

  /**
   * Get the Y position of a lane by its index.
   */
  laneIndexToY(index: number): number {
    const vp = this.stateManager.getViewport();
    return HEADER_HEIGHT + index * this.getLaneHeight() - vp.scrollY;
  }

  getWidth(): number {
    return this.canvas.width / this.dpr;
  }

  getHeight(): number {
    return this.canvas.height / this.dpr;
  }

  getContentWidth(): number {
    const vp = this.stateManager.getViewport();
    return this.stateManager.getProject().duration * vp.zoom + LANE_HEADER_WIDTH;
  }

  getContentHeight(): number {
    const lanes = this.stateManager.getSortedLanes();
    return HEADER_HEIGHT + lanes.length * this.getLaneHeight();
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.markDirty();
  }

  markDirty(): void {
    this.dirty = true;
  }

  destroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  private startRenderLoop(): void {
    const loop = () => {
      if (this.dirty) {
        this.render();
        this.dirty = false;
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private render(): void {
    const width = this.getWidth();
    const height = this.getHeight();
    const theme = this.getThemeColors();
    const state = this.stateManager.getState();
    const lanes = this.stateManager.getSortedLanes();
    const viewport = state.viewport;

    this.ctx.clearRect(0, 0, width, height);

    // Background
    this.ctx.fillStyle = theme.bg;
    this.ctx.fillRect(0, 0, width, height);

    // Save state for clipping the timeline area
    this.ctx.save();

    // Draw lanes background (full width including headers)
    this.laneRenderer.renderBackgrounds(
      lanes, width, height, viewport, theme, this.getLaneHeight()
    );

    // Clip to timeline area (right of lane headers)
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(LANE_HEADER_WIDTH, HEADER_HEIGHT, width - LANE_HEADER_WIDTH, height - HEADER_HEIGHT);
    this.ctx.clip();

    // Draw grid
    this.gridRenderer.render(
      state.project.duration,
      viewport,
      width,
      height,
      theme
    );

    // Draw blocks
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      const laneY = this.laneIndexToY(i);
      for (const block of lane.blocks) {
        const isSelected = state.selection.blockIds.includes(block.id);
        this.blockRenderer.render(
          block, laneY, this.getLaneHeight(), viewport, theme, isSelected
        );
      }
    }

    // Draw events
    for (const event of state.project.events) {
      const isSelected = state.selection.eventIds.includes(event.id);
      this.eventRenderer.render(
        event, viewport, HEADER_HEIGHT, height, theme, isSelected
      );
    }

    // Draw playhead
    this.playheadRenderer.render(
      state.playheadTime, viewport, HEADER_HEIGHT, height, theme
    );

    this.ctx.restore(); // Remove timeline clip

    // Draw lane headers (on top of everything)
    this.laneRenderer.renderHeaders(
      lanes, width, height, viewport, theme, this.getLaneHeight()
    );

    // Draw timeline header
    this.gridRenderer.renderHeader(
      state.project.duration, viewport, width, theme
    );

    // Draw playhead indicator in header
    this.playheadRenderer.renderHeaderIndicator(
      state.playheadTime, viewport, theme
    );

    this.ctx.restore();
  }
}
