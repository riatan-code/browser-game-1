import type { BrickType } from './config.ts';

/**
 * ステージ定義。layout の1文字が1ブロックに対応する。
 * '.' は空白、それ以外は BRICK_CHARS で種別に変換される。
 */
export interface StageDef {
  layout: readonly string[];
}

export const BRICK_CHARS: Readonly<Record<string, BrickType>> = {
  '#': 'normal',
};

export const STAGES: readonly StageDef[] = [
  {
    layout: [
      '########',
      '########',
      '########',
      '########',
      '########',
      '########',
    ],
  },
];
