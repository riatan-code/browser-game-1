import type { Scene } from './Scene.ts';

export class SceneManager {
  private current: Scene | null = null;

  get scene(): Scene | null {
    return this.current;
  }

  change(next: Scene): void {
    this.current?.exit?.();
    this.current = next;
    this.current.enter?.();
  }
}
