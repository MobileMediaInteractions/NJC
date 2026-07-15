export type EventMap = Record<string, unknown>;
export class EventBus<Events extends EventMap> {
  readonly #listeners = new Map<keyof Events, Set<(payload: never) => void>>();
  on<Key extends keyof Events>(event: Key, listener: (payload: Events[Key]) => void) {
    const listeners = this.#listeners.get(event) ?? new Set();
    listeners.add(listener as (payload: never) => void); this.#listeners.set(event, listeners);
    return () => listeners.delete(listener as (payload: never) => void);
  }
  emit<Key extends keyof Events>(event: Key, payload: Events[Key]) { for (const listener of this.#listeners.get(event) ?? []) listener(payload as never); }
  clear() { this.#listeners.clear(); }
}
