import { Block, Viewport } from '../types';
import {
  ThemeColors,
  LANE_HEADER_WIDTH,
  LANE_PADDING,
  BLOCK_BORDER_RADIUS,
} from '../constants';
import { hexToRgba } from '../utils/color';

/**
 * Renders blocks with solid required portion and striped buffer portion.
 */
export class BlockRenderer {
  private ctx: CanvasRenderingContext2D;
  private stripePatterns: Map<string, CanvasPattern> = new Map();

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(
    block: Block,
    laneY: number,
    laneHeight: number,
    viewport: Viewport,
    theme: ThemeColors,
    isSelected: boolean
  ): void {
    const totalDuration = block.minDuration + block.bufferDuration;
    const x = block.startTime * viewport.zoom - viewport.scrollX + LANE_HEADER_WIDTH;
    const minW = block.minDuration * viewport.zoom;
    const totalW = totalDuration * viewport.zoom;
    const y = laneY + LANE_PADDING;
    const h = laneHeight - LANE_PADDING * 2;

    // Skip if not visible
    if (x + totalW < LANE_HEADER_WIDTH || x > this.ctx.canvas.width) return;

    // Selection glow
    if (isSelected) {
      this.ctx.shadowColor = theme.blockGlow;
      this.ctx.shadowBlur = 12;
    }

    // Draw required portion (solid)
    if (minW > 0) {
      this.ctx.fillStyle = block.color;
      this.ctx.beginPath();
      if (block.bufferDuration > 0) {
        // Rounded left corners only
        this.ctx.roundRect(x, y, minW, h, [BLOCK_BORDER_RADIUS, 0, 0, BLOCK_BORDER_RADIUS]);
      } else {
        this.ctx.roundRect(x, y, minW, h, BLOCK_BORDER_RADIUS);
      }
      this.ctx.fill();
    }

    // Draw buffer portion (striped pattern)
    if (block.bufferDuration > 0) {
      const bufferX = x + minW;
      const bufferW = totalW - minW;

      // Semi-transparent fill
      this.ctx.fillStyle = hexToRgba(block.color, 0.3);
      this.ctx.beginPath();
      if (minW > 0) {
        this.ctx.roundRect(bufferX, y, bufferW, h, [0, BLOCK_BORDER_RADIUS, BLOCK_BORDER_RADIUS, 0]);
      } else {
        this.ctx.roundRect(bufferX, y, bufferW, h, BLOCK_BORDER_RADIUS);
      }
      this.ctx.fill();

      // Diagonal stripe pattern overlay
      this.ctx.save();
      this.ctx.beginPath();
      if (minW > 0) {
        this.ctx.roundRect(bufferX, y, bufferW, h, [0, BLOCK_BORDER_RADIUS, BLOCK_BORDER_RADIUS, 0]);
      } else {
        this.ctx.roundRect(bufferX, y, bufferW, h, BLOCK_BORDER_RADIUS);
      }
      this.ctx.clip();

      const pattern = this.getStripePattern(block.color);
      if (pattern) {
        this.ctx.fillStyle = pattern;
        this.ctx.fillRect(bufferX, y, bufferW, h);
      }
      this.ctx.restore();

      // Border between required and buffer
      if (minW > 0) {
        this.ctx.strokeStyle = hexToRgba(block.color, 0.6);
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.moveTo(bufferX, y + 2);
        this.ctx.lineTo(bufferX, y + h - 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    }

    // Reset shadow
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;

    // Selection border
    if (isSelected) {
      this.ctx.strokeStyle = theme.accent;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, totalW, h, BLOCK_BORDER_RADIUS);
      this.ctx.stroke();
    }

    // Block name text
    if (totalW > 30) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(x + 4, y, totalW - 8, h);
      this.ctx.clip();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(block.name, x + 8, y + h / 2);
      this.ctx.restore();
    }
  }

  private getStripePattern(color: string): CanvasPattern | null {
    const key = color;
    if (this.stripePatterns.has(key)) return this.stripePatterns.get(key)!;

    const size = 8;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = size;
    offCanvas.height = size;
    const offCtx = offCanvas.getContext('2d')!;

    offCtx.strokeStyle = hexToRgba(color, 0.25);
    offCtx.lineWidth = 1.5;
    offCtx.beginPath();
    offCtx.moveTo(0, size);
    offCtx.lineTo(size, 0);
    offCtx.stroke();

    // Wrap-around line for seamless tiling
    offCtx.beginPath();
    offCtx.moveTo(-size / 2, size / 2);
    offCtx.lineTo(size / 2, -size / 2);
    offCtx.stroke();
    offCtx.beginPath();
    offCtx.moveTo(size / 2, size + size / 2);
    offCtx.lineTo(size + size / 2, size / 2);
    offCtx.stroke();

    const pattern = this.ctx.createPattern(offCanvas, 'repeat');
    if (pattern) this.stripePatterns.set(key, pattern);
    return pattern;
  }
}
