import { StateManager } from '../state/StateManager';
import { EventBus } from '../state/EventBus';
import { Block } from '../types';
import { LANE_HEADER_WIDTH } from '../constants';

/**
 * Incremental block search panel.
 */
export class SearchPanel {
  private container: HTMLElement;
  private stateManager: StateManager;
  private bus: EventBus;
  private isOpen: boolean = false;

  constructor(container: HTMLElement, stateManager: StateManager, bus: EventBus) {
    this.container = container;
    this.stateManager = stateManager;
    this.bus = bus;

    this.bus.on('search:open', () => this.open());
    this.bus.on('search:close', () => this.close());

    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="search-panel hidden" id="search-container">
        <div class="search-header">
          <input class="search-input" type="text" id="search-input" placeholder="Search blocks..." autocomplete="off" />
          <button class="search-close-btn" id="search-close">&times;</button>
        </div>
        <div class="search-results" id="search-results"></div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    const input = this.container.querySelector('#search-input') as HTMLInputElement;
    const closeBtn = this.container.querySelector('#search-close');

    input?.addEventListener('input', () => this.performSearch(input.value));
    closeBtn?.addEventListener('click', () => this.close());
  }

  private open(): void {
    this.isOpen = true;
    const panel = this.container.querySelector('#search-container');
    panel?.classList.remove('hidden');
    const input = this.container.querySelector('#search-input') as HTMLInputElement;
    input?.focus();
    input?.select();
    this.performSearch(input?.value || '');
  }

  private close(): void {
    this.isOpen = false;
    const panel = this.container.querySelector('#search-container');
    panel?.classList.add('hidden');
  }

  private performSearch(query: string): void {
    const resultsContainer = this.container.querySelector('#search-results') as HTMLElement;
    if (!resultsContainer) return;

    if (!query.trim()) {
      resultsContainer.innerHTML = '<div class="search-empty">Type to search blocks</div>';
      return;
    }

    const lanes = this.stateManager.getSortedLanes();
    const results: { block: Block; laneName: string }[] = [];
    const lowerQuery = query.toLowerCase();

    for (const lane of lanes) {
      for (const block of lane.blocks) {
        if (block.name.toLowerCase().includes(lowerQuery) || block.memo.toLowerCase().includes(lowerQuery)) {
          results.push({ block, laneName: lane.name });
        }
      }
    }

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="search-empty">No blocks found</div>';
      return;
    }

    resultsContainer.innerHTML = results.map(({ block, laneName }) => `
      <div class="search-result-item" data-block-id="${block.id}">
        <div class="search-result-color" style="background: ${block.color}"></div>
        <div class="search-result-info">
          <div class="search-result-name">${this.escapeHtml(block.name)}</div>
          <div class="search-result-lane">${this.escapeHtml(laneName)} • ${block.startTime.toFixed(1)}s</div>
        </div>
      </div>
    `).join('');

    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const blockId = (e.currentTarget as HTMLElement).dataset.blockId!;
        this.focusBlock(blockId);
      });
    });
  }

  private focusBlock(blockId: string): void {
    const found = this.stateManager.findBlock(blockId);
    if (!found) return;

    this.stateManager.setSelection({ blockIds: [blockId], eventIds: [] });

    // Scroll viewport to show the block
    const vp = this.stateManager.getViewport();
    const blockX = found.block.startTime * vp.zoom;
    const canvasWidth = this.container.ownerDocument.querySelector('canvas')?.clientWidth || 800;
    const targetScrollX = Math.max(0, blockX - (canvasWidth - LANE_HEADER_WIDTH) / 2);

    const sortedLanes = this.stateManager.getSortedLanes();
    const laneIdx = sortedLanes.findIndex(l => l.id === found.lane.id);
    const laneHeight = 56;
    const blockY = laneIdx * laneHeight;
    const canvasHeight = this.container.ownerDocument.querySelector('canvas')?.clientHeight || 400;
    const targetScrollY = Math.max(0, blockY - canvasHeight / 2);

    this.stateManager.setViewport({ scrollX: targetScrollX, scrollY: targetScrollY });
    this.close();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
