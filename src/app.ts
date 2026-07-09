import { StateManager } from './state/StateManager';
import { EventBus } from './state/EventBus';
import { ClipboardManager } from './state/ClipboardManager';
import { CanvasRenderer } from './renderer/CanvasRenderer';
import { InteractionHandler } from './interaction/InteractionHandler';
import { Toolbar } from './ui/Toolbar';
import { PropertyPanel } from './ui/PropertyPanel';
import { LaneManager } from './ui/LaneManager';
import { SearchPanel } from './ui/SearchPanel';
import { ContextMenu } from './ui/ContextMenu';
import { Modal } from './ui/Modal';
import { ToastManager } from './ui/Toast';
import { StatsPanel } from './ui/StatsPanel';

export class TimelineApp {
  private container: HTMLElement;
  private bus: EventBus;
  private stateManager: StateManager;
  private clipboard: ClipboardManager;
  private renderer!: CanvasRenderer;
  private interactionHandler!: InteractionHandler;

  // UI Components
  private toolbar!: Toolbar;
  private propertyPanel!: PropertyPanel;
  private laneManager!: LaneManager;
  private statsPanel!: StatsPanel;
  private searchPanel!: SearchPanel;
  private contextMenu!: ContextMenu;
  private modal!: Modal;
  private toastManager!: ToastManager;

  constructor(container: HTMLElement) {
    this.container = container;
    this.bus = new EventBus();
    this.stateManager = new StateManager(this.bus);
    this.clipboard = new ClipboardManager(this.stateManager, this.bus);

    this.initLayout();
    this.initCanvas();
    this.initUI();
    this.bindWindowEvents();
  }

  private initLayout(): void {
    this.container.className = 'app-root';
    this.container.innerHTML = `
      <div id="toolbar-container"></div>
      <div class="main-container">
        <div class="sidebar-left">
          <div id="lane-manager-container"></div>
          <div id="stats-panel-container"></div>
        </div>
        <div class="editor-area">
          <div class="canvas-wrapper">
            <canvas id="timeline-canvas"></canvas>
            <div id="timeline-scrollbar-container" class="timeline-scrollbar-container">
              <div id="timeline-scrollbar-content" class="timeline-scrollbar-content"></div>
            </div>
          </div>
        </div>
        <div class="sidebar-right">
          <div id="property-panel-container"></div>
        </div>
      </div>
      <div id="search-overlay"></div>
      <div id="context-menu-container"></div>
      <div id="modal-container"></div>
      <div id="toast-overlay"></div>
    `;
  }

  private initCanvas(): void {
    const canvas = this.container.querySelector('#timeline-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');

    this.renderer = new CanvasRenderer(canvas, this.stateManager, this.bus);
    this.interactionHandler = new InteractionHandler(
      canvas,
      this.stateManager,
      this.bus,
      this.renderer,
      this.clipboard
    );
  }

  private initUI(): void {
    const toolbarCont = this.container.querySelector('#toolbar-container') as HTMLElement;
    this.toolbar = new Toolbar(toolbarCont, this.stateManager, this.bus, this.clipboard);

    const propCont = this.container.querySelector('#property-panel-container') as HTMLElement;
    this.propertyPanel = new PropertyPanel(propCont, this.stateManager, this.bus);

    const laneCont = this.container.querySelector('#lane-manager-container') as HTMLElement;
    this.laneManager = new LaneManager(laneCont, this.stateManager, this.bus);

    const statsCont = this.container.querySelector('#stats-panel-container') as HTMLElement;
    this.statsPanel = new StatsPanel(statsCont, this.stateManager, this.bus);

    const searchCont = this.container.querySelector('#search-overlay') as HTMLElement;
    this.searchPanel = new SearchPanel(searchCont, this.stateManager, this.bus);

    const menuCont = this.container.querySelector('#context-menu-container') as HTMLElement;
    this.contextMenu = new ContextMenu(menuCont, this.bus);

    const modalCont = this.container.querySelector('#modal-container') as HTMLElement;
    this.modal = new Modal(modalCont, this.bus);

    const toastCont = this.container.querySelector('#toast-overlay') as HTMLElement;
    this.toastManager = new ToastManager(toastCont, this.bus);

    this.initScrollbar();

    // Initial theme setup
    this.updateTheme(this.stateManager.getTheme());
    this.bus.on('theme:changed', (theme) => this.updateTheme(theme));
  }

  private initScrollbar(): void {
    const scrollbarContainer = this.container.querySelector('#timeline-scrollbar-container') as HTMLElement;
    const scrollbarContent = this.container.querySelector('#timeline-scrollbar-content') as HTMLElement;
    if (!scrollbarContainer || !scrollbarContent) return;

    // Handle scroll on HTML scrollbar -> sync to state
    scrollbarContainer.addEventListener('scroll', () => {
      const currentScrollX = this.stateManager.getViewport().scrollX;
      if (Math.abs(scrollbarContainer.scrollLeft - currentScrollX) > 1) {
        this.stateManager.setViewport({ scrollX: scrollbarContainer.scrollLeft });
      }
    });

    // Handle viewport changes -> sync to HTML scrollbar
    const updateScrollbar = () => {
      const vp = this.stateManager.getViewport();
      const proj = this.stateManager.getProject();
      
      const virtualWidth = proj.duration * vp.zoom;
      scrollbarContent.style.width = `${virtualWidth}px`;
      
      const graphHeight = vp.scoreGraphHeight ?? 70;
      scrollbarContainer.style.bottom = `${graphHeight}px`;
      
      if (Math.abs(scrollbarContainer.scrollLeft - vp.scrollX) > 1) {
        scrollbarContainer.scrollLeft = vp.scrollX;
      }
    };

    this.bus.on('viewport:changed', updateScrollbar);
    this.bus.on('project:changed', updateScrollbar);
    
    // Initial call
    updateScrollbar();
  }

  private updateTheme(theme: 'dark' | 'light'): void {
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark-mode');
      body.classList.remove('light-mode');
    } else {
      body.classList.add('light-mode');
      body.classList.remove('dark-mode');
    }
  }

  private bindWindowEvents(): void {
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.renderer.resize();
  };

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.destroy();
    this.interactionHandler.destroy();
    this.contextMenu.destroy();
    this.bus.removeAll();
  }
}
