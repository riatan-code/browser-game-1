/**
 * 固定タイムステップのゲームループ。
 * ロジックは常に一定間隔で更新され、描画はディスプレイのリフレッシュレートに合わせて行われる。
 */
export class GameLoop {
  private accumulator = 0;
  private lastTime = 0;
  private rafId = 0;
  private running = false;

  /** タブ復帰時などに大量の update が走らないよう、1フレームで処理する最大時間 */
  private static readonly MAX_FRAME_TIME = 0.25;

  constructor(
    private readonly fixedDt: number,
    private readonly update: (dt: number) => void,
    private readonly render: (alpha: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return;

    const frameTime = Math.min((now - this.lastTime) / 1000, GameLoop.MAX_FRAME_TIME);
    this.lastTime = now;
    this.accumulator += frameTime;

    while (this.accumulator >= this.fixedDt) {
      this.update(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    this.render(this.accumulator / this.fixedDt);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
