import { Project, Viewport } from '../types';
import { ThemeColors, LANE_HEADER_WIDTH } from '../constants';
import { hexToRgba } from '../utils/color';

interface ScorePoint {
  time: number;
  score: number;
}

/**
 * Renders a cumulative score step graph at the bottom of the timeline.
 */
export class ScoreGraphRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(
    project: Project,
    viewport: Viewport,
    rect: { x: number; y: number; width: number; height: number },
    theme: ThemeColors
  ): void {
    // 1. Gather all score changes
    const points: ScorePoint[] = [{ time: 0, score: 0 }];
    let currentScore = 0;

    // From events
    for (const ev of project.events) {
      if (ev.scoreEffect && ev.scoreEffect !== 0) {
        points.push({ time: ev.time, score: ev.scoreEffect });
      }
    }

    // From blocks
    for (const lane of project.lanes) {
      for (const block of lane.blocks) {
        if (block.scoreEffect && block.scoreEffect !== 0) {
          // Score is awarded at completion of the required part
          points.push({ time: block.startTime + block.minDuration, score: block.scoreEffect });
        }
      }
    }

    // Sort by time
    points.sort((a, b) => a.time - b.time);

    // Calculate cumulative scores
    const cumulativePoints: ScorePoint[] = [{ time: 0, score: 0 }];
    let runningTotal = 0;
    for (const p of points) {
      if (p.time === 0) continue;
      runningTotal += p.score;
      cumulativePoints.push({ time: p.time, score: runningTotal });
    }
    // Add end point
    cumulativePoints.push({ time: project.duration, score: runningTotal });

    // 2. Draw background panel for the graph
    this.ctx.fillStyle = theme.bgSecondary;
    this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    // Top border of graph area
    this.ctx.strokeStyle = theme.border;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(rect.x, rect.y);
    this.ctx.lineTo(rect.x + rect.width, rect.y);
    this.ctx.stroke();

    // Draw Graph Label in lane header area
    this.ctx.fillStyle = theme.textSecondary;
    this.ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('SCORE GRAPH', 12, rect.y + rect.height / 2 - 8);

    this.ctx.fillStyle = theme.accent;
    this.ctx.font = '16px Inter, system-ui, sans-serif';
    this.ctx.fillText(`Total: ${runningTotal} pts`, 12, rect.y + rect.height / 2 + 10);

    // Draw grid border dividing label and graph
    this.ctx.strokeStyle = theme.border;
    this.ctx.beginPath();
    this.ctx.moveTo(LANE_HEADER_WIDTH, rect.y);
    this.ctx.lineTo(LANE_HEADER_WIDTH, rect.y + rect.height);
    this.ctx.stroke();

    // 3. Draw the graph itself
    if (cumulativePoints.length < 2) return;

    // Find max score for scaling
    const maxScore = Math.max(20, ...cumulativePoints.map(p => p.score));
    const padding = 10;
    const graphH = rect.height - padding * 2;
    const graphY = rect.y + padding;

    // Helper: Map time/score to X/Y pixels
    const getX = (t: number) => t * viewport.zoom - viewport.scrollX + LANE_HEADER_WIDTH;
    const getY = (s: number) => graphY + graphH - (s / maxScore) * graphH;

    // Clip drawing to timeline area
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(LANE_HEADER_WIDTH, rect.y, rect.width - LANE_HEADER_WIDTH, rect.height);
    this.ctx.clip();

    // Draw step-area path (fill under curve)
    this.ctx.beginPath();
    this.ctx.moveTo(getX(0), getY(0));

    for (let i = 1; i < cumulativePoints.length; i++) {
      const prev = cumulativePoints[i - 1];
      const curr = cumulativePoints[i];
      // Step horizontal line, then vertical jump
      this.ctx.lineTo(getX(curr.time), getY(prev.score));
      this.ctx.lineTo(getX(curr.time), getY(curr.score));
    }
    
    // Close the path at the bottom
    this.ctx.lineTo(getX(project.duration), getY(0));
    this.ctx.lineTo(getX(0), getY(0));
    this.ctx.closePath();

    const gradient = this.ctx.createLinearGradient(0, graphY, 0, graphY + graphH);
    gradient.addColorStop(0, hexToRgba(theme.accent, 0.25));
    gradient.addColorStop(1, hexToRgba(theme.accent, 0.0));
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Draw step-line path (stroke)
    this.ctx.beginPath();
    this.ctx.moveTo(getX(0), getY(0));

    for (let i = 1; i < cumulativePoints.length; i++) {
      const prev = cumulativePoints[i - 1];
      const curr = cumulativePoints[i];
      this.ctx.lineTo(getX(curr.time), getY(prev.score));
      this.ctx.lineTo(getX(curr.time), getY(curr.score));
    }
    this.ctx.strokeStyle = theme.accent;
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();

    // Draw markers at transition points
    for (let i = 1; i < cumulativePoints.length - 1; i++) {
      const p = cumulativePoints[i];
      const px = getX(p.time);
      const py = getY(p.score);

      // Skip drawing if outside view bounds
      if (px < LANE_HEADER_WIDTH || px > rect.x + rect.width) continue;

      // Glow circle
      this.ctx.fillStyle = theme.accent;
      this.ctx.beginPath();
      this.ctx.arc(px, py, 4, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = theme.bg;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      // Show score text at jump
      this.ctx.fillStyle = theme.text;
      this.ctx.font = 'bold 9px Inter, system-ui, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText(`+${points[i - 1].score}`, px, py - 6);
    }

    this.ctx.restore();
  }
}
