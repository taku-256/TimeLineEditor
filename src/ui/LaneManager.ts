import { StateManager } from '../state/StateManager';
import { EventBus } from '../state/EventBus';

/**
 * Lane management panel in the sidebar.
 */
export class LaneManager {
  private container: HTMLElement;
  private stateManager: StateManager;
  private bus: EventBus;
  private dragLaneId: string | null = null;

  constructor(container: HTMLElement, stateManager: StateManager, bus: EventBus) {
    this.container = container;
    this.stateManager = stateManager;
    this.bus = bus;

    this.bus.on('lane:added', () => this.render());
    this.bus.on('lane:removed', () => this.render());
    this.bus.on('lane:updated', () => this.render());
    this.bus.on('lane:reordered', () => this.render());
    this.bus.on('project:changed', () => this.render());

    this.render();
  }

  private render(): void {
    const lanes = this.stateManager.getSortedLanes();

    this.container.innerHTML = `
      <div class="lane-manager">
        <div class="lane-manager-header">
          <h4>Lanes</h4>
          <button class="lane-add-btn" id="lm-add" title="Add Lane">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
        <div class="lane-list" id="lane-list">
          ${lanes.map(lane => `
            <div class="lane-item" data-lane-id="${lane.id}" draggable="true">
              <div class="lane-item-drag">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" opacity="0.4"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
              </div>
              <div class="lane-item-color" style="background: ${lane.color}"></div>
              <input class="lane-item-name" value="${lane.name}" data-lane-id="${lane.id}" />
              <button class="lane-item-delete" data-lane-id="${lane.id}" title="Delete Lane">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    // Add lane
    this.container.querySelector('#lm-add')?.addEventListener('click', () => {
      this.stateManager.addLane();
    });

    // Rename lanes
    this.container.querySelectorAll('.lane-item-name').forEach(input => {
      input.addEventListener('change', (e) => {
        const el = e.target as HTMLInputElement;
        const laneId = el.dataset.laneId!;
        this.stateManager.updateLane(laneId, { name: el.value });
      });
    });

    // Delete lanes
    this.container.querySelectorAll('.lane-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const laneId = (e.currentTarget as HTMLElement).dataset.laneId!;
        this.stateManager.removeLane(laneId);
      });
    });

    // Drag & drop reorder
    const list = this.container.querySelector('#lane-list');
    if (!list) return;

    this.container.querySelectorAll('.lane-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        this.dragLaneId = (e.currentTarget as HTMLElement).dataset.laneId!;
        (e.currentTarget as HTMLElement).classList.add('dragging');
        (e as DragEvent).dataTransfer!.effectAllowed = 'move';
      });

      item.addEventListener('dragend', (e) => {
        (e.currentTarget as HTMLElement).classList.remove('dragging');
        this.dragLaneId = null;
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        (e as DragEvent).dataTransfer!.dropEffect = 'move';
        const el = e.currentTarget as HTMLElement;
        el.classList.add('drag-over');
      });

      item.addEventListener('dragleave', (e) => {
        (e.currentTarget as HTMLElement).classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).classList.remove('drag-over');
        const targetId = (e.currentTarget as HTMLElement).dataset.laneId!;
        if (!this.dragLaneId || this.dragLaneId === targetId) return;

        const lanes = this.stateManager.getSortedLanes();
        const ids = lanes.map(l => l.id);
        const fromIdx = ids.indexOf(this.dragLaneId);
        const toIdx = ids.indexOf(targetId);
        if (fromIdx === -1 || toIdx === -1) return;

        ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, this.dragLaneId);
        this.stateManager.reorderLanes(ids);
      });
    });
  }
}
