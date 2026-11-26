/** Small typed event emitter for decoupled engine and UI notifications. */

type Handler<Payload> = (payload: Payload) => void;

/** Generic event map: keys are event names and values are payload types. */
export class Emitter<Events extends object> {
  private readonly listeners = new Map<keyof Events, Set<Handler<never>>>();

  on<Key extends keyof Events>(event: Key, handler: Handler<Events[Key]>): () => void {
    const registered = this.listeners.get(event) ?? new Set<Handler<never>>();
    registered.add(handler as Handler<never>);
    this.listeners.set(event, registered);
    return () => this.off(event, handler);
  }

  off<Key extends keyof Events>(event: Key, handler: Handler<Events[Key]>): void {
    const registered = this.listeners.get(event);
    if (!registered) return;
    registered.delete(handler as Handler<never>);
    if (registered.size === 0) this.listeners.delete(event);
  }

  emit<Key extends keyof Events>(event: Key, payload: Events[Key]): void {
    const registered = this.listeners.get(event);
    if (!registered) return;
    for (const listener of [...registered]) (listener as Handler<Events[Key]>)(payload);
  }

  once<Key extends keyof Events>(event: Key, handler: Handler<Events[Key]>): () => void {
    const wrapper: Handler<Events[Key]> = (payload) => {
      this.off(event, wrapper);
      handler(payload);
    };
    return this.on(event, wrapper);
  }

  clear(event?: keyof Events): void {
    if (event === undefined) this.listeners.clear();
    else this.listeners.delete(event);
  }
}
