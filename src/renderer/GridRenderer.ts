import { Viewport } from '../types';
import { HEADER_HEIGHT, LANE_HEADER_WIDTH, ThemeColors } from '../constants';
import { getGridIntervals, formatTime } from '../utils/time';

/**
 * Renders the time grid and timeline header.
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

    // 30s milestone grid lines (User request: "30sごとにライン入れて")
    this.ctx.strokeStyle = theme.border;
    this.ctx.lineWidth = 1.5;
    this.drawGridLines(30, duration, viewport, width, height);
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

    // Time labels and ticks
    const [, major] = getGridIntervals(viewport.zoom);
    this.ctx.fillStyle = theme.text;
    this.ctx.font = '10px Inter, system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    const startTime = Math.max(0, Math.floor((-LANE_HEADER_WIDTH + viewport.scrollX) / viewport.zoom / major) * major);
    const endTime = Math.min(duration, (width + viewport.scrollX) / viewport.zoom);

    for (let t = startTime; t <= endTime; t += major) {
      const x = t * viewport.zoom - viewport.scrollX + LANE_HEADER_WIDTH;
      if (x < LANE_HEADER_WIDTH - 10 || x > width + 10) continue;

      // Draw time labels high up (Y = 8px)
      this.ctx.fillText(formatTime(t), x, 8);

      // Draw tick marks in the upper half of header (0 to 18px)
      this.ctx.strokeStyle = theme.gridLineMajor;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, 18);
      this.ctx.stroke();
    }

    // Draw extra tick marks and labels for 30s milestones if they aren't already drawn
    for (let t = 0; t <= duration; t += 30) {
      const x = t * viewport.zoom - viewport.scrollX + LANE_HEADER_WIDTH;
      if (x < LANE_HEADER_WIDTH - 10 || x > width + 10) continue;

      // Bold tick marks for 30s
      this.ctx.strokeStyle = theme.accent;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, 22);
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
