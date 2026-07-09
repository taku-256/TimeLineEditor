import { TimelineEvent, Viewport } from '../types';
import { ThemeColors, LANE_HEADER_WIDTH, EVENT_MARKER_SIZE } from '../constants';
import { hexToRgba } from '../utils/color';

/**
 * Renders timeline events as vertical lines with diamond markers and labels.
 * Supports two-pass rendering: lines (inside clip) and markers (outside clip, in header).
 */
export class EventRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Pass 1: Draw the vertical dashed line only (call inside timeline clip region).
   */
  renderLine(
    event: TimelineEvent,
    viewport: Viewport,
    headerHeight: number,
    canvasHeight: number,
    _theme: ThemeColors,
    isSelected: boolean
  ): void {
    const x = event.time * viewport.zoom - viewport.scrollX + LANE_HEADER_WIDTH;
    if (x < LANE_HEADER_WIDTH - 20 || x > this.ctx.canvas.width + 20) return;

    this.ctx.strokeStyle = isSelected
      ? event.color
      : hexToRgba(event.color, 0.35);
    this.ctx.lineWidth = isSelected ? 2 : 1;
    this.ctx.setLineDash([3, 6]);
    this.ctx.beginPath();
    this.ctx.moveTo(x, headerHeight);
    this.ctx.lineTo(x, canvasHeight);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  /**
   * Pass 2: Draw the diamond marker, icon, and label (call OUTSIDE clip, in header area).
   */
  renderMarker(
    event: TimelineEvent,
    viewport: Viewport,
    headerHeight: number,
    theme: ThemeColors,
    isSelected: boolean
  ): void {
    const x = event.time * viewport.zoom - viewport.scrollX + LANE_HEADER_WIDTH;
    if (x < LANE_HEADER_WIDTH - 20 || x > this.ctx.canvas.width + 20) return;

    const markerY = headerHeight - 14;
    const s = EVENT_MARKER_SIZE / 2;

    if (isSelected) {
      this.ctx.shadowColor = event.color;
      this.ctx.shadowBlur = 10;
    }

    this.ctx.fillStyle = event.color;
    this.ctx.beginPath();
    this.ctx.moveTo(x, markerY - s);
    this.ctx.lineTo(x + s, markerY);
    this.ctx.lineTo(x, markerY + s);
    this.ctx.lineTo(x - s, markerY);
    this.ctx.closePath();
    this.ctx.fill();

    if (isSelected) {
      this.ctx.strokeStyle = theme.accent;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;

    // Render the event's exact time (e.g. "12.5s") next to the diamond marker instead of an icon
    this.ctx.fillStyle = event.color;
    this.ctx.font = 'bold 9px Inter, system-ui, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${event.time.toFixed(1)}s`, x + s + 3, markerY);

    // Label (below the diamond, still in header)
    this.ctx.fillStyle = isSelected ? theme.text : theme.textSecondary;
    this.ctx.font = '9px Inter, system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(event.label, x, markerY + s + 2, 50);
  }

  /**
   * Legacy single-pass render (kept for compatibility).
   */
  render(
    event: TimelineEvent,
    viewport: Viewport,
    headerHeight: number,
    canvasHeight: number,
    theme: ThemeColors,
    isSelected: boolean
  ): void {
    this.renderLine(event, viewport, headerHeight, canvasHeight, theme, isSelected);
    this.renderMarker(event, viewport, headerHeight, theme, isSelected);
  }
}
