import { EventMap } from '../types';

type EventCallback<K extends keyof EventMap> = (data: EventMap[K]) => void;

interface Listener<K extends keyof EventMap> {
  callback: EventCallback<K>;
  once: boolean;
}

/**
 * Publish/Subscribe event bus for decoupled component communication.
 */
export class EventBus {
  private listeners: Map<string, Listener<any>[]> = new Map();

  on<K extends keyof EventMap>(event: K, callback: EventCallback<K>): () => void {
    return this.addListener(event, callback, false);
  }

  once<K extends keyof EventMap>(event: K, callback: EventCallback<K>): () => void {
    return this.addListener(event, callback, true);
  }

  off<K extends keyof EventMap>(event: K, callback: EventCallback<K>): void {
    const list = this.listeners.get(event as string);
    if (!list) return;
    const idx = list.findIndex(l => l.callback === callback);
    if (idx !== -1) list.splice(idx, 1);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const list = this.listeners.get(event as string);
    if (!list) return;
    const toRemove: number[] = [];
    list.forEach((listener, idx) => {
      listener.callback(data);
      if (listener.once) toRemove.push(idx);
    });
    // Remove once listeners in reverse order
    for (let i = toRemove.length - 1; i >= 0; i--) {
      list.splice(toRemove[i], 1);
    }
  }

  removeAll(): void {
    this.listeners.clear();
  }

  private addListener<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<K>,
    once: boolean
  ): () => void {
    const key = event as string;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    const listener: Listener<K> = { callback, once };
    this.listeners.get(key)!.push(listener);
    return () => this.off(event, callback);
  }
}
