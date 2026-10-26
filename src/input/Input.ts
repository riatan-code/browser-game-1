import type { Viewport } from '../core/Viewport.ts';

export interface PointerState {
  id: number;
  /** 論理座標 */
  x: number;
  y: number;
  type: string; // 'mouse' | 'touch' | 'pen'
}

/** ブラウザのスクロール等を抑止するキー */
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

/**
 * キーボードとポインタ (マウス/タッチ/ペン) の入力を集約する。
 * Pointer Events でマウスとタッチを統一的に扱い、座標は論理座標に変換済みで提供する。
 *
 * isDown    : 押されている間 true
 * isPressed : 押された瞬間の1ステップだけ true
 * isReleased: 離された瞬間の1ステップだけ true
 */
export class Input {
  private readonly keysDown = new Set<string>();
  private readonly keysPressed = new Set<string>();
  private readonly keysReleased = new Set<string>();

  private readonly activePointers = new Map<number, PointerState>();
  private pointerPressedFlag = false;
  private pointerReleasedFlag = false;
  private pointerMovedFlag = false;

  /** 最後に操作されたポインタの位置 (ホバー位置を含む) */
  readonly pointer = { x: 0, y: 0 };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly viewport: Viewport,
  ) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.reset());

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ---- keyboard (KeyboardEvent.code を使用: 'KeyW', 'ArrowUp', 'Space' など) ----

  isDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  isPressed(code: string): boolean {
    return this.keysPressed.has(code);
  }

  isReleased(code: string): boolean {
    return this.keysReleased.has(code);
  }

  // ---- pointer ----

  /** 現在押されている全ポインタ (マルチタッチ対応) */
  get pointers(): ReadonlyMap<number, PointerState> {
    return this.activePointers;
  }

  get isPointerDown(): boolean {
    return this.activePointers.size > 0;
  }

  get isPointerPressed(): boolean {
    return this.pointerPressedFlag;
  }

  get isPointerReleased(): boolean {
    return this.pointerReleasedFlag;
  }

  /** 前ステップ以降にポインタが動いたか (マウスのホバー移動を含む) */
  get isPointerMoved(): boolean {
    return this.pointerMovedFlag;
  }

  /** 固定ステップの update 後に呼び、「瞬間」系の状態をリセットする。 */
  endFrame(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.pointerPressedFlag = false;
    this.pointerReleasedFlag = false;
    this.pointerMovedFlag = false;
  }

  reset(): void {
    this.keysDown.clear();
    this.activePointers.clear();
    this.endFrame();
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.keysDown.add(e.code);
    this.keysPressed.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
    this.keysReleased.add(e.code);
  };

  private toPointerState(e: PointerEvent): PointerState {
    const rect = this.canvas.getBoundingClientRect();
    const { x, y } = this.viewport.toWorld(e.clientX - rect.left, e.clientY - rect.top);
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointerMovedFlag = true;
    return { id: e.pointerId, x, y, type: e.pointerType };
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    this.activePointers.set(e.pointerId, this.toPointerState(e));
    this.pointerPressedFlag = true;
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    const state = this.toPointerState(e);
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, state);
    }
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (!this.activePointers.delete(e.pointerId)) return;
    this.toPointerState(e);
    this.pointerReleasedFlag = true;
  };
}
