import { Lane, Viewport } from '../types';
import { ThemeColors, HEADER_HEIGHT, LANE_HEADER_WIDTH, LANE_PADDING } from '../constants';

/**
 * Renders lane backgrounds and headers.
 */
export class LaneRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  renderBackgrounds(
    lanes: Lane[],
    width: number,
    _height: number,
    viewport: Viewport,
    theme: ThemeColors,
    laneHeight: number
  ): void {
    for (let i = 0; i < lanes.length; i++) {
      const y = HEADER_HEIGHT + i * laneHeight - viewport.scrollY;
      if (y + laneHeight < HEADER_HEIGHT || y > _height) continue;

      // Alternating background
      if (i % 2 === 1) {
        this.ctx.fillStyle = theme.laneAlt;
        this.ctx.fillRect(0, y, width, laneHeight);
      }

      // Bottom border
      this.ctx.strokeStyle = theme.borderLight;
      this.ctx.lineWidth = 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + laneHeight);
      this.ctx.lineTo(width, y + laneHeight);
      this.ctx.stroke();
    }
  }

  renderHeaders(
    lanes: Lane[],
    _width: number,
    height: number,
    viewport: Viewport,
    theme: ThemeColors,
    laneHeight: number
  ): void {
    // Lane header background
    this.ctx.fillStyle = theme.laneHeader;
    this.ctx.fillRect(0, HEADER_HEIGHT, LANE_HEADER_WIDTH, height - HEADER_HEIGHT);

    // Right border
    this.ctx.strokeStyle = theme.border;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(LANE_HEADER_WIDTH, HEADER_HEIGHT);
    this.ctx.lineTo(LANE_HEADER_WIDTH, height);
    this.ctx.stroke();

    // Each lane header
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      const y = HEADER_HEIGHT + i * laneHeight - viewport.scrollY;
      if (y + laneHeight < HEADER_HEIGHT || y > height) continue;

      // Color indicator
      this.ctx.fillStyle = lane.color;
      this.ctx.beginPath();
      this.ctx.roundRect(LANE_PADDING + 2, y + laneHeight / 2 - 8, 4, 16, 2);
      this.ctx.fill();

      // Lane name
      this.ctx.fillStyle = theme.text;
      this.ctx.font = '13px Inter, system-ui, sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';

      // Clip text to lane header
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(LANE_PADDING + 12, y, LANE_HEADER_WIDTH - LANE_PADDING * 2 - 12, laneHeight);
      this.ctx.clip();
      this.ctx.fillText(lane.name, LANE_PADDING + 14, y + laneHeight / 2);
      this.ctx.restore();

      // Bottom border
      this.ctx.strokeStyle = theme.borderLight;
      this.ctx.lineWidth = 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + laneHeight);
      this.ctx.lineTo(LANE_HEADER_WIDTH, y + laneHeight);
      this.ctx.stroke();
    }
  }
}
