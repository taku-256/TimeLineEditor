import { EventBus } from '../state/EventBus';
import { ModalConfig } from '../types';

/**
 * Global modal dialog manager.
 */
export class Modal {
  private container: HTMLElement;
  private bus: EventBus;
  private modalEl: HTMLDivElement | null = null;

  constructor(container: HTMLElement, bus: EventBus) {
    this.container = container;
    this.bus = bus;

    this.bus.on('modal:show', (config) => this.show(config));
    this.bus.on('modal:hide', () => this.hide());
  }

  private show(config: ModalConfig): void {
    this.hide();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-container';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
      <h3>${config.title}</h3>
      <button class="modal-close">&times;</button>
    `;

    const body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof config.content === 'string') {
      body.textContent = config.content;
    } else {
      body.appendChild(config.content);
    }

    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn modal-btn-cancel';
    cancelBtn.textContent = config.cancelText ?? 'Cancel';
    cancelBtn.onclick = () => {
      if (config.onCancel) config.onCancel();
      this.hide();
    };

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'modal-btn modal-btn-confirm';
    confirmBtn.textContent = config.confirmText ?? 'OK';
    confirmBtn.onclick = () => {
      if (config.onConfirm) config.onConfirm();
      this.hide();
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);

    const closeBtn = header.querySelector('.modal-close');
    closeBtn?.addEventListener('click', () => {
      if (config.onCancel) config.onCancel();
      this.hide();
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (config.onCancel) config.onCancel();
        this.hide();
      }
    });

    this.container.appendChild(overlay);
    this.modalEl = overlay;
  }

  private hide(): void {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }
}
