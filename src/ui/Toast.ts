import { EventBus } from '../state/EventBus';

/**
 * Toast notifications.
 */
export class ToastManager {
  private container: HTMLElement;
  private bus: EventBus;
  private toastListEl: HTMLDivElement;

  constructor(container: HTMLElement, bus: EventBus) {
    this.container = container;
    this.bus = bus;

    this.toastListEl = document.createElement('div');
    this.toastListEl.className = 'toast-container';
    this.container.appendChild(this.toastListEl);

    this.bus.on('toast:show', (data) => this.show(data.message, data.type));
  }

  show(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${this.escapeHtml(message)}</span>
      <button class="toast-close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn?.addEventListener('click', () => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 300);
    });

    this.toastListEl.appendChild(toast);

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
