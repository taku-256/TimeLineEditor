import { TimelineEvent, Viewport } from '../types';
import { ThemeColors, LANE_HEADER_WIDTH, EVENT_MARKER_SIZE } from '../constants';
import { hexToRgba } from '../utils/color';

/**
 * Renders timeline events as vertical lines with diamond markers and labels.
 */
export class EventRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(
    event: TimelineEvent,
    viewport: Viewport,
    headerHeight: number,
    canvasHeight: number,
    theme: ThemeColors,
    isSelected: boolean
  ): void {
    const x = event.time * viewport.zoom - viewport.scrollX + LANE_HEADER_WIDTH;

    // Skip if not visible
    if (x < LANE_HEADER_WIDTH - 20 || x > this.ctx.canvas.width + 20) return;

    const lineTop = headerHeight;
    const lineBottom = canvasHeight;

    // Vertical line
    this.ctx.strokeStyle = isSelected
      ? event.color
      : hexToRgba(event.color, 0.6);
    this.ctx.lineWidth = isSelected ? 2 : 1;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(x, lineTop);
    this.ctx.lineTo(x, lineBottom);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Diamond marker at top
    const markerY = headerHeight + 16;
    const s = EVENT_MARKER_SIZE / 2;

    // Glow for selected
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

    // Icon
    if (event.icon) {
      this.ctx.fillStyle = event.color;
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(event.icon, x, markerY + s + 14);
    }

    // Label
    this.ctx.fillStyle = isSelected ? theme.text : theme.textSecondary;
    this.ctx.font = '10px Inter, system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(event.label, x, markerY + s + 26);
  }
}
