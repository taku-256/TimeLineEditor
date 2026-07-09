import { StateManager } from '../state/StateManager';
import { EventBus } from '../state/EventBus';
import { Block, TimelineEvent } from '../types';
import { BLOCK_COLORS, EVENT_ICONS } from '../constants';
import { formatTime } from '../utils/time';

/**
 * Right-side property panel showing details of selected block/event.
 */
export class PropertyPanel {
  private container: HTMLElement;
  private stateManager: StateManager;
  private bus: EventBus;

  constructor(container: HTMLElement, stateManager: StateManager, bus: EventBus) {
    this.container = container;
    this.stateManager = stateManager;
    this.bus = bus;

    this.bus.on('selection:changed', () => this.update());
    this.bus.on('block:updated', () => this.update());
    this.bus.on('event:updated', () => this.update());
    this.bus.on('project:changed', () => this.update());
    this.update();
  }

  private update(): void {
    const sel = this.stateManager.getSelection();

    if (sel.blockIds.length === 1 && sel.eventIds.length === 0) {
      this.renderBlockPanel(sel.blockIds[0]);
    } else if (sel.eventIds.length === 1 && sel.blockIds.length === 0) {
      this.renderEventPanel(sel.eventIds[0]);
    } else if (sel.blockIds.length > 1 || sel.eventIds.length > 1) {
      this.renderMultiSelection(sel.blockIds.length + sel.eventIds.length);
    } else {
      this.renderEmpty();
    }
  }

  private renderBlockPanel(blockId: string): void {
    const found = this.stateManager.findBlock(blockId);
    if (!found) { this.renderEmpty(); return; }
    const { block } = found;
    const totalDuration = block.minDuration + block.bufferDuration;
    const endTime = block.startTime + totalDuration;
    const lanes = this.stateManager.getSortedLanes();

    this.container.innerHTML = `
      <div class="panel-content">
        <div class="panel-header">
          <h3>Block Properties</h3>
        </div>

        <div class="prop-group">
          <label class="prop-label">Name</label>
          <input class="prop-input" type="text" id="prop-name" value="${this.escapeHtml(block.name)}" />
        </div>

        <div class="prop-group">
          <label class="prop-label">Lane</label>
          <select class="prop-input" id="prop-lane">
            ${lanes.map(l => `<option value="${l.id}" ${l.id === block.laneId ? 'selected' : ''}>${this.escapeHtml(l.name)}</option>`).join('')}
          </select>
        </div>

        <div class="prop-group">
          <label class="prop-label">Color</label>
          <div class="color-picker">
            ${BLOCK_COLORS.map(c => `<button class="color-swatch ${c === block.color ? 'active' : ''}" style="background:${c}" data-color="${c}"></button>`).join('')}
          </div>
        </div>

        <div class="prop-divider"></div>

        <div class="prop-grid">
          <div class="prop-group">
            <label class="prop-label">Start</label>
            <input class="prop-input" type="number" id="prop-start" value="${block.startTime}" min="0" step="0.1" />
          </div>
          <div class="prop-group">
            <label class="prop-label">Required</label>
            <input class="prop-input" type="number" id="prop-min" value="${block.minDuration}" min="0.1" step="0.1" />
          </div>
          <div class="prop-group">
            <label class="prop-label">Buffer</label>
            <input class="prop-input" type="number" id="prop-buffer" value="${block.bufferDuration}" min="0" step="0.1" />
          </div>
        </div>

        <div class="prop-divider"></div>

        <div class="prop-info">
          <div class="prop-info-row">
            <span class="prop-info-label">End Time</span>
            <span class="prop-info-value">${formatTime(endTime)}</span>
          </div>
          <div class="prop-info-row">
            <span class="prop-info-label">Total Duration</span>
            <span class="prop-info-value">${formatTime(totalDuration)}</span>
          </div>
          <div class="prop-info-row">
            <span class="prop-info-label">Required</span>
            <span class="prop-info-value accent">${formatTime(block.minDuration)}</span>
          </div>
          <div class="prop-info-row">
            <span class="prop-info-label">Buffer</span>
            <span class="prop-info-value warning">${formatTime(block.bufferDuration)}</span>
          </div>
        </div>

        <div class="prop-divider"></div>

        <div class="prop-group">
          <label class="prop-label">Memo</label>
          <textarea class="prop-textarea" id="prop-memo" rows="3">${this.escapeHtml(block.memo)}</textarea>
        </div>

        <div class="prop-actions">
          <button class="prop-btn danger" id="prop-delete">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Delete
          </button>
        </div>
      </div>
    `;

    this.bindBlockEvents(blockId);
  }

  private bindBlockEvents(blockId: string): void {
    const nameInput = this.container.querySelector('#prop-name') as HTMLInputElement;
    nameInput?.addEventListener('change', () => {
      this.stateManager.updateBlock(blockId, { name: nameInput.value });
    });

    const laneSelect = this.container.querySelector('#prop-lane') as HTMLSelectElement;
    laneSelect?.addEventListener('change', () => {
      this.stateManager.updateBlock(blockId, { laneId: laneSelect.value });
    });

    const startInput = this.container.querySelector('#prop-start') as HTMLInputElement;
    startInput?.addEventListener('change', () => {
      const val = parseFloat(startInput.value);
      if (!isNaN(val)) this.stateManager.updateBlock(blockId, { startTime: Math.max(0, val) });
    });

    const minInput = this.container.querySelector('#prop-min') as HTMLInputElement;
    minInput?.addEventListener('change', () => {
      const val = parseFloat(minInput.value);
      if (!isNaN(val)) this.stateManager.updateBlock(blockId, { minDuration: Math.max(0.1, val) });
    });

    const bufferInput = this.container.querySelector('#prop-buffer') as HTMLInputElement;
    bufferInput?.addEventListener('change', () => {
      const val = parseFloat(bufferInput.value);
      if (!isNaN(val)) this.stateManager.updateBlock(blockId, { bufferDuration: Math.max(0, val) });
    });

    const memoInput = this.container.querySelector('#prop-memo') as HTMLTextAreaElement;
    memoInput?.addEventListener('change', () => {
      this.stateManager.updateBlock(blockId, { memo: memoInput.value });
    });

    // Color swatches
    this.container.querySelectorAll('.color-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = (btn as HTMLElement).dataset.color!;
        this.stateManager.updateBlock(blockId, { color });
        this.update();
      });
    });

    // Delete
    this.container.querySelector('#prop-delete')?.addEventListener('click', () => {
      this.stateManager.removeBlock(blockId);
    });
  }

  private renderEventPanel(eventId: string): void {
    const event = this.stateManager.findEvent(eventId);
    if (!event) { this.renderEmpty(); return; }

    this.container.innerHTML = `
      <div class="panel-content">
        <div class="panel-header">
          <h3>Event Properties</h3>
        </div>

        <div class="prop-group">
          <label class="prop-label">Label</label>
          <input class="prop-input" type="text" id="prop-event-label" value="${this.escapeHtml(event.label)}" />
        </div>

        <div class="prop-group">
          <label class="prop-label">Time</label>
          <input class="prop-input" type="number" id="prop-event-time" value="${event.time}" min="0" step="0.1" />
        </div>

        <div class="prop-group">
          <label class="prop-label">Icon</label>
          <div class="icon-picker">
            ${EVENT_ICONS.map(ic => `<button class="icon-btn ${ic === event.icon ? 'active' : ''}" data-icon="${ic}">${ic}</button>`).join('')}
          </div>
        </div>

        <div class="prop-group">
          <label class="prop-label">Color</label>
          <div class="color-picker">
            ${BLOCK_COLORS.map(c => `<button class="color-swatch ${c === event.color ? 'active' : ''}" style="background:${c}" data-color="${c}"></button>`).join('')}
          </div>
        </div>

        <div class="prop-actions">
          <button class="prop-btn danger" id="prop-event-delete">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Delete
          </button>
        </div>
      </div>
    `;

    this.bindEventPanelEvents(eventId);
  }

  private bindEventPanelEvents(eventId: string): void {
    const labelInput = this.container.querySelector('#prop-event-label') as HTMLInputElement;
    labelInput?.addEventListener('change', () => {
      this.stateManager.updateEvent(eventId, { label: labelInput.value });
    });

    const timeInput = this.container.querySelector('#prop-event-time') as HTMLInputElement;
    timeInput?.addEventListener('change', () => {
      const val = parseFloat(timeInput.value);
      if (!isNaN(val)) this.stateManager.updateEvent(eventId, { time: Math.max(0, val) });
    });

    this.container.querySelectorAll('.icon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const icon = (btn as HTMLElement).dataset.icon!;
        this.stateManager.updateEvent(eventId, { icon });
        this.update();
      });
    });

    this.container.querySelectorAll('.color-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = (btn as HTMLElement).dataset.color!;
        this.stateManager.updateEvent(eventId, { color });
        this.update();
      });
    });

    this.container.querySelector('#prop-event-delete')?.addEventListener('click', () => {
      this.stateManager.removeEvent(eventId);
    });
  }

  private renderMultiSelection(count: number): void {
    this.container.innerHTML = `
      <div class="panel-content">
        <div class="panel-header">
          <h3>Multiple Selection</h3>
        </div>
        <div class="panel-empty">
          <p class="panel-empty-count">${count} items selected</p>
          <div class="prop-actions">
            <button class="prop-btn danger" id="prop-delete-all">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete All
            </button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#prop-delete-all')?.addEventListener('click', () => {
      this.stateManager.removeSelectedBlocks();
    });
  }

  private renderEmpty(): void {
    this.container.innerHTML = `
      <div class="panel-content">
        <div class="panel-header">
          <h3>Properties</h3>
        </div>
        <div class="panel-empty">
          <div class="panel-empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 9h6v6H9z"/>
            </svg>
          </div>
          <p class="panel-empty-text">Select a block or event<br/>to view properties</p>
          <p class="panel-empty-hint">Double-click on a lane to create a new block</p>
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
