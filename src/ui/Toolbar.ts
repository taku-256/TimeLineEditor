import { StateManager } from '../state/StateManager';
import { EventBus } from '../state/EventBus';
import { ClipboardManager } from '../state/ClipboardManager';
import { SnapInterval } from '../types';
import { loadProjectFromFile, saveProjectToFile } from '../utils/file';

/**
 * Top toolbar with controls for the timeline editor.
 */
export class Toolbar {
  private container: HTMLElement;
  private stateManager: StateManager;
  private bus: EventBus;
  private clipboard: ClipboardManager;

  constructor(
    container: HTMLElement,
    stateManager: StateManager,
    bus: EventBus,
    clipboard: ClipboardManager
  ) {
    this.container = container;
    this.stateManager = stateManager;
    this.bus = bus;
    this.clipboard = clipboard;
    this.render();
    this.bindEvents();
  }

  private render(): void {
    const project = this.stateManager.getProject();

    this.container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-group toolbar-brand">
          <span class="toolbar-logo">⏱</span>
          <span class="toolbar-title">Timeline Editor</span>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn" id="btn-undo" title="Undo (Ctrl+Z)">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h13a4 4 0 0 1 0 8H7"/><path d="M3 10l4-4M3 10l4 4"/></svg>
          </button>
          <button class="toolbar-btn" id="btn-redo" title="Redo (Ctrl+Y)">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10H8a4 4 0 0 0 0 8h10"/><path d="M21 10l-4-4M21 10l-4 4"/></svg>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn" id="btn-add-block" title="Add Block">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
            <span>Block</span>
          </button>
          <button class="toolbar-btn" id="btn-add-event" title="Add Event">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M12 2l-3 3M12 2l3 3"/><circle cx="12" cy="12" r="3"/></svg>
            <span>Event</span>
          </button>
          <button class="toolbar-btn" id="btn-add-lane" title="Add Lane">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            <span>Lane</span>
          </button>
          <button class="toolbar-btn ${project.vGoalTime !== undefined ? 'active' : ''}" id="btn-vgoal-toggle" title="Toggle V-Goal Target Line">
            <span>👑 V-Goal</span>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-group">
          <label class="toolbar-label">Snap</label>
          <select class="toolbar-select" id="select-snap">
            <option value="0.1" ${project.snapInterval === 0.1 ? 'selected' : ''}>0.1s</option>
            <option value="0.5" ${project.snapInterval === 0.5 ? 'selected' : ''}>0.5s</option>
            <option value="1" ${project.snapInterval === 1 ? 'selected' : ''}>1s</option>
            <option value="off" ${project.snapInterval === null ? 'selected' : ''}>OFF</option>
          </select>
          <button class="toolbar-btn ${project.magnetEnabled !== false ? 'active' : ''}" id="btn-magnet" title="Toggle Magnet Snapping to block edges and events">
            <span>🧲 Magnet</span>
          </button>
        </div>

        <div class="toolbar-group">
          <label class="toolbar-label">Duration</label>
          <input class="toolbar-input" type="number" id="input-duration" value="${project.duration}" min="1" max="9999" step="1" />
          <span class="toolbar-unit">s</span>
        </div>

        <div class="toolbar-spacer"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn" id="btn-search" title="Search (Ctrl+F)">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn" id="btn-save" title="Save Project">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
          </button>
          <button class="toolbar-btn" id="btn-load" title="Load Project">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn toolbar-theme-toggle" id="btn-theme" title="Toggle Theme">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          </button>
          <button class="toolbar-btn" id="btn-help" title="Keyboard Shortcuts & Help">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    // Undo / Redo
    this.container.querySelector('#btn-undo')?.addEventListener('click', () => {
      this.stateManager.undo();
    });
    this.container.querySelector('#btn-redo')?.addEventListener('click', () => {
      this.stateManager.redo();
    });

    // Add Block
    this.container.querySelector('#btn-add-block')?.addEventListener('click', () => {
      const lanes = this.stateManager.getSortedLanes();
      if (lanes.length === 0) {
        this.bus.emit('toast:show', { message: 'Please add a lane first', type: 'warning' });
        return;
      }
      const block = this.stateManager.addBlock(lanes[0].id, {
        startTime: this.stateManager.getPlayheadTime(),
      });
      this.stateManager.setSelection({ blockIds: [block.id], eventIds: [] });
    });

    // Add Event
    this.container.querySelector('#btn-add-event')?.addEventListener('click', () => {
      const ev = this.stateManager.addEvent({
        time: this.stateManager.getPlayheadTime(),
      });
      this.stateManager.setSelection({ blockIds: [], eventIds: [ev.id] });
    });

    // Add Lane
    this.container.querySelector('#btn-add-lane')?.addEventListener('click', () => {
      this.stateManager.addLane();
    });

    // Snap
    this.container.querySelector('#select-snap')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      const snap: SnapInterval = val === 'off' ? null : parseFloat(val) as SnapInterval;
      this.stateManager.setSnapInterval(snap);
    });

    // Duration
    this.container.querySelector('#input-duration')?.addEventListener('change', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (!isNaN(val) && val > 0) {
        this.stateManager.setDuration(val);
      }
    });

    // Search
    this.container.querySelector('#btn-search')?.addEventListener('click', () => {
      this.bus.emit('search:open', undefined as any);
    });

    // Save
    this.container.querySelector('#btn-save')?.addEventListener('click', () => {
      saveProjectToFile(this.stateManager.getProject());
      this.bus.emit('toast:show', { message: 'Project saved', type: 'success' });
    });

    // Load
    this.container.querySelector('#btn-load')?.addEventListener('click', async () => {
      try {
        const project = await loadProjectFromFile();
        this.stateManager.loadProject(project);
        this.bus.emit('toast:show', { message: 'Project loaded', type: 'success' });
        this.render();
        this.bindEvents();
      } catch (err) {
        this.bus.emit('toast:show', { message: `Failed to load: ${err}`, type: 'error' });
      }
    });

    // Theme toggle
    this.container.querySelector('#btn-theme')?.addEventListener('click', () => {
      this.stateManager.toggleTheme();
    });

    // Magnet toggle
    this.container.querySelector('#btn-magnet')?.addEventListener('click', () => {
      const current = this.stateManager.getProject().magnetEnabled !== false;
      this.stateManager.setMagnetEnabled(!current);
      this.bus.emit('toast:show', { message: `Magnet Snapping: ${!current ? 'ON' : 'OFF'}`, type: 'info' });
    });

    // V-Goal toggle
    this.container.querySelector('#btn-vgoal-toggle')?.addEventListener('click', () => {
      const current = this.stateManager.getProject().vGoalTime;
      if (current !== undefined) {
        this.stateManager.setVGoalTime(undefined);
        this.bus.emit('toast:show', { message: 'V-Goal Target Removed', type: 'info' });
      } else {
        const time = this.stateManager.getPlayheadTime();
        this.stateManager.setVGoalTime(time);
        this.bus.emit('toast:show', { message: `V-Goal Target Set to ${time.toFixed(1)}s`, type: 'success' });
      }
    });

    // Help Dialog Modal
    this.container.querySelector('#btn-help')?.addEventListener('click', () => {
      this.showHelpModal();
    });

    // Listen for state changes to update button states
    this.bus.on('project:changed', () => {
      const project = this.stateManager.getProject();
      const durationInput = this.container.querySelector('#input-duration') as HTMLInputElement;
      if (durationInput && document.activeElement !== durationInput) {
        durationInput.value = project.duration.toString();
      }

      // Update Magnet active state
      const magnetBtn = this.container.querySelector('#btn-magnet');
      if (magnetBtn) {
        if (project.magnetEnabled !== false) {
          magnetBtn.classList.add('active');
        } else {
          magnetBtn.classList.remove('active');
        }
      }

      // Update V-Goal active state
      const vGoalBtn = this.container.querySelector('#btn-vgoal-toggle');
      if (vGoalBtn) {
        if (project.vGoalTime !== undefined) {
          vGoalBtn.classList.add('active');
        } else {
          vGoalBtn.classList.remove('active');
        }
      }
    });
  }

  private showHelpModal(): void {
    const content = document.createElement('div');
    content.className = 'help-modal-content';
    content.innerHTML = `
      <style>
        .help-section { margin-bottom: 16px; }
        .help-section h4 { margin: 0 0 8px; font-size: 0.95rem; color: var(--accent); }
        .help-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .help-table td { padding: 6px 8px; border-bottom: 1px solid var(--border-light); }
        .help-table td:first-child { font-weight: 600; width: 40%; color: var(--text-color); }
        .help-table td:last-child { color: var(--text-secondary); }
        .kbd { background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 4px; padding: 2px 5px; font-family: monospace; font-size: 0.75rem; }
      </style>

      <div class="help-section">
        <h4>マウス操作</h4>
        <table class="help-table">
          <tr>
            <td>ダブルクリック (空レーン)</td>
            <td>その時間位置に新規ブロックを追加</td>
          </tr>
          <tr>
            <td>ドラッグ (ブロック中央)</td>
            <td>ブロックの移動（別のレーンへの移動も可能）</td>
          </tr>
          <tr>
            <td>ドラッグ (ブロック左右端)</td>
            <td>開始位置（左側）またはバッファ時間（右側）の長さ調整</td>
          </tr>
          <tr>
            <td>ドラッグ (イベント)</td>
            <td>イベント（縦線）の時間移動</td>
          </tr>
          <tr>
            <td>マウスホイール</td>
            <td>タイムラインの拡大 / 縮小（ズーム）</td>
          </tr>
          <tr>
            <td>Shift + ホイール</td>
            <td>左右スクロール</td>
          </tr>
          <tr>
            <td>Ctrl + ホイール</td>
            <td>上下スクロール</td>
          </tr>
        </table>
      </div>

      <div class="help-section">
        <h4>キーボードショートカット</h4>
        <table class="help-table">
          <tr>
            <td><span class="kbd">Ctrl</span> + <span class="kbd">Z</span></td>
            <td>元に戻す (Undo)</td>
          </tr>
          <tr>
            <td><span class="kbd">Ctrl</span> + <span class="kbd">Y</span> / <span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">Z</span></td>
            <td>やり直す (Redo)</td>
          </tr>
          <tr>
            <td><span class="kbd">Ctrl</span> + <span class="kbd">C</span> / <span class="kbd">Ctrl</span> + <span class="kbd">V</span></td>
            <td>コピー / ペースト</td>
          </tr>
          <tr>
            <td><span class="kbd">Ctrl</span> + <span class="kbd">D</span></td>
            <td>選択アイテムの複製</td>
          </tr>
          <tr>
            <td><span class="kbd">Ctrl</span> + <span class="kbd">F</span></td>
            <td>ブロック検索パネルを開く</td>
          </tr>
          <tr>
            <td><span class="kbd">Ctrl</span> + <span class="kbd">A</span></td>
            <td>すべてのブロックとイベントを選択</td>
          </tr>
          <tr>
            <td><span class="kbd">Delete</span> / <span class="kbd">Backspace</span></td>
            <td>選択アイテムの削除</td>
          </tr>
          <tr>
            <td><span class="kbd">Esc</span></td>
            <td>選択解除、検索やメニューを閉じる</td>
          </tr>
        </table>
      </div>
    `;

    this.bus.emit('modal:show', {
      title: '操作ヘルプ & ショートカット',
      content,
      confirmText: '閉じる',
      cancelText: 'キャンセル',
      onConfirm: () => {},
    });
  }
}
