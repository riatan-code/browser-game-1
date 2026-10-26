type Handler<T> = (payload: T) => void;

/**
 * 型付きの簡易イベントバス。
 * ロジック側が emit し、サウンド・エフェクト・UI などが on で購読する。
 */
export class EventBus<M extends object> {
  private readonly handlers = new Map<keyof M, Set<Handler<never>>>();

  /** 購読する。戻り値の関数を呼ぶと購読解除。 */
  on<K extends keyof M>(type: K, handler: Handler<M[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as Handler<never>);
    return () => set.delete(handler as Handler<never>);
  }

  emit<K extends keyof M>(type: K, payload: M[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const handler of set) (handler as Handler<M[K]>)(payload);
  }
}
