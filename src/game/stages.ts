import type { BrickType } from './config.ts';

interface StageBase {
  /** 画面に表示するステージ名 */
  title: string;
  /** 開始時に表示する攻略のヒント */
  hint: string;
}

/**
 * ブロックステージ。layout の1文字が格子の1マスに対応する (列数は config の bricks.columns)。
 * '.' は空白、それ以外は BRICK_CHARS で種別に変換される。
 * 壊せるブロックをすべて壊すとクリア。
 */
export interface BrickStageDef extends StageBase {
  kind: 'bricks';
  layout: readonly string[];
}

/**
 * ボスの行動パターンの名前。中身は config にまとめている
 * - 'boss'  : config.boss
 * - 'bossEx': config.boss.ex
 */
export type BossProfileId = 'boss' | 'bossEx';

/** ボスの EX モード (同じボスの強化版)。ボスを倒すと、ステージ選択のそのボスの枠から選べるようになる */
export interface BossExDef extends StageBase {
  profile: BossProfileId;
}

/** ボス戦。ボスを追加するときは、ボスごとに EX モード (ex) も定義できる */
export interface BossStageDef extends StageBase {
  kind: 'boss';
  profile: BossProfileId;
  ex?: BossExDef;
}

export type StageDef = BrickStageDef | BossStageDef;

export const BRICK_CHARS: Readonly<Record<string, BrickType>> = {
  '#': 'normal',
  X: 'steel',
};

export const STAGES: readonly StageDef[] = [
  {
    kind: 'bricks',
    title: 'BASIC',
    hint: 'ブロックをすべて壊そう',
    // 壊れないブロック (X) の棚に、ボールが通れるだけのわずかな隙間を4か所残す。
    // 隙間を抜けたボールは棚とブロックの間 (1段空けた空間) で跳ね回り、続けてブロックを壊せる。
    // 左右の端も空けて、閉じ込められずに戻ってこられるようにしている
    layout: [
      '############',
      '############',
      '############',
      '############',
      '.##########.',
      '..########..',
      '............',
      '.XXX.XX.XXX.',
      '............',
      '##..####..##',
    ],
  },
  {
    kind: 'bricks',
    title: 'FORTRESS',
    hint: '鉄の壁の隙間を狙って奥へ打ち込め',
    // 鉄の壁 (X) には2か所だけ隙間がある。壁の奥は1行空けて、入ったボールが横に走れるようにする。
    // 奥の両端は届きにくく作業的になるので空け、手前のブロックは隙間の真下を塞がないよう中央に寄せる
    layout: [
      '.##########.',
      '.##########.',
      '.##########.',
      '............',
      'XX.XXXXXX.XX',
      '............',
      '............',
      '...######...',
      '...######...',
    ],
  },
  {
    kind: 'boss',
    profile: 'boss',
    title: 'BOSS',
    hint: 'ボールを当てて倒せ。攻撃は予告を見て避けよう',
    ex: {
      title: 'TRUE BOSS',
      hint: '攻撃はすべて予告がある。見切って避けろ',
      profile: 'bossEx',
    },
  },
];
