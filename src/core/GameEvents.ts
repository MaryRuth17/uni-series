/**
 * Typed event bus shared by core services and scenes (SPEC §8). Plain TypeScript, no Phaser.
 * Scenes that subscribe must unsubscribe in their `shutdown` handler (on() returns the unsubscribe).
 */
import type { Language } from './SaveManager';

export interface GameEventMap {
  /** A setting changed (Settings service). */
  'settings:changed': { key: string };
  'language:changed': { language: Language };
  /** localStorage is unavailable or a write failed; show the "Hindi ma-save" toast once. */
  'save:failed': { reason: 'unavailable' | 'write' };
  /** Ask the toast layer to show a message (already translated). */
  toast: { text: string; ms?: number };
  /** A minigame session ended; the core saves its progress (SPEC §5). */
  'minigame:finished': { id: string; data: unknown };
}

type Handler<T> = (payload: T) => void;

export class EventBus<M extends object> {
  private handlers = new Map<keyof M, Set<Handler<never>>>();

  on<K extends keyof M>(name: K, fn: Handler<M[K]>): () => void {
    const set = this.handlers.get(name) ?? new Set();
    set.add(fn as Handler<never>);
    this.handlers.set(name, set);
    return () => this.off(name, fn);
  }

  off<K extends keyof M>(name: K, fn: Handler<M[K]>): void {
    this.handlers.get(name)?.delete(fn as Handler<never>);
  }

  emit<K extends keyof M>(name: K, payload: M[K]): void {
    for (const fn of [...(this.handlers.get(name) ?? [])]) (fn as Handler<M[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const gameEvents = new EventBus<GameEventMap>();
