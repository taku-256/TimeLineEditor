import { Viewport } from '../types';
import { ThemeColors, HEADER_HEIGHT, LANE_HEADER_WIDTH } from '../constants';
import { hexToRgba } from '../utils/color';

/**
 * Renders the playhead (current time indicator).
 */
export class PlayheadRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(
    time: number,
    viewport: Viewport,
    headerHeight: number,
    canvasHeight: number,
    theme: ThemeColors
  ): void {
    const x = time * viewport.zoom - viewport.scrollX + LANE_HEADER_WIDTH;
    if (x < LANE_HEADER_WIDTH || x > this.ctx.canvas.width) return;

    // Playhead line (subtle dashed vertical line)
    this.ctx.strokeStyle = hexToRgba(theme.playhead, 0.4);
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(x, headerHeight);
    this.ctx.lineTo(x, canvasHeight);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  renderHeaderIndicator(
    time: number,
    viewport: Viewport,
    theme: ThemeColors
  ): void {
    const x = time * viewport.zoom - viewport.scrollX + LANE_HEADER_WIDTH;
    if (x < LANE_HEADER_WIDTH || x > this.ctx.canvas.width) return;

    // Triangle indicator in header
    const triSize = 7;
    this.ctx.fillStyle = theme.playhead;
    this.ctx.beginPath();
    this.ctx.moveTo(x - triSize, HEADER_HEIGHT - 1);
    this.ctx.lineTo(x + triSize, HEADER_HEIGHT - 1);
    this.ctx.lineTo(x, HEADER_HEIGHT - 1 - triSize * 1.3);
    this.ctx.closePath();
    this.ctx.fill();

    // Small circle at tip
    this.ctx.beginPath();
    this.ctx.arc(x, HEADER_HEIGHT, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
