import { EventBus } from '../state/EventBus';
import { ContextMenuItem } from '../types';

/**
 * Context menu component that displays customized right-click menus.
 */
export class ContextMenu {
  private container: HTMLElement;
  private bus: EventBus;
  private menuEl: HTMLDivElement | null = null;

  constructor(container: HTMLElement, bus: EventBus) {
    this.container = container;
    this.bus = bus;

    this.bus.on('context-menu:show', (data) => this.show(data.x, data.y, data.items));
    this.bus.on('context-menu:hide', () => this.hide());

    document.addEventListener('click', this.onDocumentClick);
  }

  destroy(): void {
    document.removeEventListener('click', this.onDocumentClick);
  }

  private show(x: number, y: number, items: ContextMenuItem[]): void {
    this.hide();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    menu.innerHTML = items.map(item => {
      if (item.separator) {
        return `<div class="context-menu-separator"></div>`;
      }
      return `
        <button class="context-menu-item" ${item.disabled ? 'disabled' : ''}>
          ${item.icon ? `<span class="context-menu-icon">${item.icon}</span>` : ''}
          <span class="context-menu-label">${item.label}</span>
          ${item.shortcut ? `<span class="context-menu-shortcut">${item.shortcut}</span>` : ''}
        </button>
      `;
    }).join('');

    // Bind item clicks
    const buttons = menu.querySelectorAll('.context-menu-item');
    items.forEach((item, idx) => {
      if (item.separator) return;
      buttons[idx]?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!item.disabled) {
          item.action();
          this.hide();
        }
      });
    });

    this.container.appendChild(menu);
    this.menuEl = menu;

    // Adjust position to fit within viewport
    const rect = menu.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    if (rect.right > winW) {
      menu.style.left = `${winW - rect.width - 4}px`;
    }
    if (rect.bottom > winH) {
      menu.style.top = `${winH - rect.height - 4}px`;
    }
  }

  private hide(): void {
    if (this.menuEl) {
      this.menuEl.remove();
      this.menuEl = null;
    }
  }

  private onDocumentClick = (): void => {
    this.hide();
  };
}
