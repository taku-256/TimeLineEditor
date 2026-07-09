import { Block, TimelineEvent } from '../types';
import { StateManager } from './StateManager';
import { EventBus } from './EventBus';

/**
 * Manages copy/paste operations for blocks and events.
 */
export class ClipboardManager {
  private clipboardBlocks: Block[] = [];
  private clipboardEvents: TimelineEvent[] = [];
  private stateManager: StateManager;
  private bus: EventBus;

  constructor(stateManager: StateManager, bus: EventBus) {
    this.stateManager = stateManager;
    this.bus = bus;
  }

  copy(): void {
    const sel = this.stateManager.getSelection();
    this.clipboardBlocks = [];
    this.clipboardEvents = [];

    for (const blockId of sel.blockIds) {
      const found = this.stateManager.findBlock(blockId);
      if (found) {
        this.clipboardBlocks.push(JSON.parse(JSON.stringify(found.block)));
      }
    }

    for (const eventId of sel.eventIds) {
      const ev = this.stateManager.findEvent(eventId);
      if (ev) {
        this.clipboardEvents.push(JSON.parse(JSON.stringify(ev)));
      }
    }

  }

  paste(): void {
    if (this.clipboardBlocks.length === 0 && this.clipboardEvents.length === 0) return;

    this.stateManager.beginBatch();

    const newBlockIds: string[] = [];
    const newEventIds: string[] = [];

    for (const block of this.clipboardBlocks) {
      // Place the pasted block immediately after the original block's end
      const endTime = block.startTime + block.minDuration + block.bufferDuration;
      const newBlock = this.stateManager.addBlock(block.laneId, {
        name: block.name,
        color: block.color,
        startTime: endTime,
        minDuration: block.minDuration,
        bufferDuration: block.bufferDuration,
        memo: block.memo,
        scoreEffect: block.scoreEffect,
      });
      newBlockIds.push(newBlock.id);
    }

    for (const ev of this.clipboardEvents) {
      const newEvent = this.stateManager.addEvent({
        time: ev.time + 1,
        label: ev.label,
        color: ev.color,
        icon: ev.icon,
        scoreEffect: ev.scoreEffect,
      });
      newEventIds.push(newEvent.id);
    }

    this.stateManager.endBatch();

    // Select pasted items
    this.stateManager.setSelection({
      blockIds: newBlockIds,
      eventIds: newEventIds,
    });
  }

  hasContent(): boolean {
    return this.clipboardBlocks.length > 0 || this.clipboardEvents.length > 0;
  }
}
