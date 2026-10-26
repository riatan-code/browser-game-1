export interface NameEntryOptions {
  score: number;
  /** 見出しに表示する順位 (0始まり) */
  rank: number;
  defaultName: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

/**
 * ランキング登録用の名前入力ダイアログ。
 * スマートフォンのソフトウェアキーボードや IME を使えるよう、Canvas ではなく HTML の input で実装する。
 */
export class NameEntryDialog {
  private readonly root: HTMLDivElement;
  private readonly heading: HTMLParagraphElement;
  private readonly scoreText: HTMLParagraphElement;
  private readonly input: HTMLInputElement;
  private options: NameEntryOptions | null = null;

  constructor(parent: HTMLElement, maxLength: number) {
    this.root = document.createElement('div');
    this.root.className = 'name-entry';
    this.root.hidden = true;
    this.root.innerHTML = `
      <form class="name-entry__card" novalidate>
        <p class="name-entry__heading"></p>
        <p class="name-entry__score"></p>
        <label class="name-entry__label" for="name-entry-input">ランキングに残す名前</label>
        <input id="name-entry-input" class="name-entry__input" type="text"
          autocomplete="nickname" enterkeyhint="done" spellcheck="false" />
        <div class="name-entry__actions">
          <button type="button" class="name-entry__button name-entry__button--secondary" data-action="cancel">登録しない</button>
          <button type="submit" class="name-entry__button name-entry__button--primary">登録</button>
        </div>
      </form>`;

    this.heading = this.query('.name-entry__heading');
    this.scoreText = this.query('.name-entry__score');
    this.input = this.query('.name-entry__input');
    this.input.maxLength = maxLength;
    this.input.placeholder = `${maxLength}文字まで`;

    const form = this.query<HTMLFormElement>('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.finish(true);
    });
    this.query('[data-action="cancel"]').addEventListener('click', () => this.finish(false));

    parent.appendChild(this.root);
  }

  get isOpen(): boolean {
    return this.options !== null;
  }

  open(options: NameEntryOptions): void {
    this.options = options;
    this.heading.textContent = options.rank === 0 ? 'NEW RECORD!' : `${options.rank + 1}位にランクイン!`;
    this.scoreText.textContent = `SCORE ${options.score}`;
    this.input.value = options.defaultName;
    this.root.hidden = false;
    // タッチ端末では自動でキーボードを出さない (画面が急に隠れるのを避ける)
    if (window.matchMedia('(pointer: fine)').matches) {
      this.input.focus();
      this.input.select();
    }
  }

  private finish(submit: boolean): void {
    const options = this.options;
    if (!options) return;
    this.options = null;
    this.input.blur();
    this.root.hidden = true;
    if (submit) {
      options.onSubmit(this.input.value);
    } else {
      options.onCancel();
    }
  }

  private query<T extends Element = HTMLElement>(selector: string): T {
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`${selector} not found`);
    return el;
  }
}
