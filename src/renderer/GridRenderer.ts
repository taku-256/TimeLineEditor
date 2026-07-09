import { Viewport } from '../types';
import { ThemeColors, HEADER_HEIGHT, LANE_HEADER_WIDTH } from '../constants';
import { getGridIntervals, formatTime } from '../utils/time';

/**
 * Renders the time grid lines and header labels.
 */
export class GridRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(
    duration: number,
    viewport: Viewport,
    width: number,
    height: number,
    theme: ThemeColors
  ): void {
    const [minor, major] = getGridIntervals(viewport.zoom);

    // Minor grid lines
    this.ctx.strokeStyle = theme.gridLine;
    this.ctx.lineWidth = 0.5;
    this.drawGridLines(minor, duration, viewport, width, height);

    // Major grid lines
    this.ctx.strokeStyle = theme.gridLineMajor;
    this.ctx.lineWidth = 1;
    this.drawGridLines(major, duration, viewport, width, height);
  }

  renderHeader(
    duration: number,
    viewport: Viewport,
    width: number,
    theme: ThemeColors
  ): void {
    // Header background
    this.ctx.fillStyle = theme.laneHeader;
    this.ctx.fillRect(0, 0, width, HEADER_HEIGHT);

    // Bottom border
    this.ctx.strokeStyle = theme.border;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, HEADER_HEIGHT);
    this.ctx.lineTo(width, HEADER_HEIGHT);
    this.ctx.stroke();

    // Time labels
    const [, major] = getGridIntervals(viewport.zoom);
    this.ctx.fillStyle = theme.text;
    this.ctx.font = '11px Inter, system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';

    const startTime = Math.max(0, Math.floor((-LANE_HEADER_WIDTH + viewport.scrollX) / viewport.zoom / major) * major);
    const endTime = Math.min(duration, (width + viewport.scrollX) / viewport.zoom);

    for (let t = startTime; t <= endTime; t += major) {
      const x = t * viewport.zoom - viewport.scrollX + LANE_HEADER_WIDTH;
      if (x < LANE_HEADER_WIDTH - 10 || x > width + 10) continue;
      this.ctx.fillText(formatTime(t), x, HEADER_HEIGHT - 6);

      // Tick mark
      this.ctx.strokeStyle = theme.gridLineMajor;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(x, HEADER_HEIGHT - 4);
      this.ctx.lineTo(x, HEADER_HEIGHT);
      this.ctx.stroke();
    }

    // Lane header area background overlay
    this.ctx.fillStyle = theme.laneHeader;
    this.ctx.fillRect(0, 0, LANE_HEADER_WIDTH, HEADER_HEIGHT);

    // Project duration label
    this.ctx.fillStyle = theme.textSecondary;
    this.ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${duration}s`, 12, HEADER_HEIGHT / 2);
  }

  private drawGridLines(
    interval: number,
    duration: number,
    viewport: Viewport,
    width: number,
    height: number
  ): void {
    const startTime = Math.max(0, Math.floor(viewport.scrollX / viewport.zoom / interval) * interval);
    const endTime = Math.min(duration, (width - LANE_HEADER_WIDTH + viewport.scrollX) / viewport.zoom);

    for (let t = startTime; t <= endTime; t += interval) {
      const x = t * viewport.zoom - viewport.scrollX + LANE_HEADER_WIDTH;
      if (x < LANE_HEADER_WIDTH || x > width) continue;
      this.ctx.beginPath();
      this.ctx.moveTo(x, HEADER_HEIGHT);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
  }
}
