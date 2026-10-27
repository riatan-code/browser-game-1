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

/** ボス戦。ボスの性能は config の boss にまとめている */
export interface BossStageDef extends StageBase {
  kind: 'boss';
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
    // 下段を間引いて、ボールの通り道と見通しを確保する
    layout: [
      '############',
      '############',
      '############',
      '############',
      '.##########.',
      '..########..',
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
    title: 'BOSS',
    hint: 'ボールを当てて倒せ。攻撃は予告を見て避けよう',
  },
];
