import { StateManager } from '../state/StateManager';
import { EventBus } from '../state/EventBus';
import { formatTime } from '../utils/time';

/**
 * Statistics panel showing active lane durations, final score, and V-Goal status.
 */
export class StatsPanel {
  private container: HTMLElement;
  private stateManager: StateManager;
  private bus: EventBus;

  constructor(container: HTMLElement, stateManager: StateManager, bus: EventBus) {
    this.container = container;
    this.stateManager = stateManager;
    this.bus = bus;

    this.bus.on('project:changed', () => this.render());
    this.bus.on('block:added', () => this.render());
    this.bus.on('block:removed', () => this.render());
    this.bus.on('block:updated', () => this.render());
    this.bus.on('event:added', () => this.render());
    this.bus.on('event:removed', () => this.render());
    this.bus.on('event:updated', () => this.render());

    this.render();
  }

  private render(): void {
    const project = this.stateManager.getProject();
    const lanes = this.stateManager.getSortedLanes();

    // 1. Calculate stats per lane
    const laneStats = lanes.map(lane => {
      let minSum = 0;
      let bufferSum = 0;
      let scoreSum = 0;
      for (const b of lane.blocks) {
        minSum += b.minDuration;
        bufferSum += b.bufferDuration;
        if (b.scoreEffect) {
          scoreSum += b.scoreEffect;
        }
      }
      return {
        laneId: lane.id,
        name: lane.name,
        color: lane.color,
        min: minSum,
        buffer: bufferSum,
        total: minSum + bufferSum,
        blocksCount: lane.blocks.length,
        scoreSum,
      };
    });

    // 2. Calculate project total score
    let finalScore = 0;
    for (const ev of project.events) {
      if (ev.scoreEffect) finalScore += ev.scoreEffect;
    }
    for (const stat of laneStats) {
      finalScore += stat.scoreSum;
    }

    // 3. Check V-Goal status
    const hasVGoal = project.vGoalTime !== undefined;

    this.container.innerHTML = `
      <div class="stats-panel">
        <div class="stats-header">
          <h4>Project Summary</h4>
        </div>

        <div class="stats-grid">
          <div class="stats-card">
            <span class="stats-card-label">Total Score</span>
            <span class="stats-card-val highlight-score">${finalScore} <span class="stats-card-unit">pts</span></span>
          </div>

          <div class="stats-card">
            <span class="stats-card-label">V-Goal Target</span>
            <span class="stats-card-val ${hasVGoal ? 'highlight-vgoal' : ''}">
              ${hasVGoal ? `${project.vGoalTime!.toFixed(1)} <span class="stats-card-unit">s</span>` : 'None'}
            </span>
          </div>
        </div>

        <div class="stats-divider"></div>

        <div class="stats-lanes-list">
          <span class="stats-section-title">LANE METRICS</span>
          ${laneStats.map(stat => `
            <div class="stats-lane-row">
              <div class="stats-lane-info">
                <span class="stats-lane-indicator" style="background: ${stat.color}"></span>
                <span class="stats-lane-name">${this.escapeHtml(stat.name)}</span>
              </div>
              <div class="stats-lane-values">
                <span class="stats-lane-val" title="Blocks count">${stat.blocksCount} blk</span>
                <span class="stats-lane-val-time" title="Required / Buffer Time">
                  <span class="stats-time-req">${stat.min.toFixed(1)}s</span>
                  <span class="stats-time-buf">+${stat.buffer.toFixed(1)}s</span>
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
