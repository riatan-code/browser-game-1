/**
 * ブロック崩しのゲームパラメータ。
 * 座標・サイズは論理解像度 (src/config.ts) 基準、速度は px/秒、角度は度、時間は秒。
 */
export const BREAKOUT_CONFIG = {
  lives: 3,

  field: {
    /** HUD の下端 = 天井の壁の位置 */
    top: 72,
  },

  /** ステージクリア後、次のステージへ進むまでの演出時間 */
  stageClearDelay: 2,
  /** ブロックステージをクリアしたときのボーナス */
  stageClearBonus: 1000,

  paddle: {
    width: 100,
    height: 14,
    /** 画面下端からパドル上端までの距離。下側は指を置くスペースになる */
    bottomOffset: 130,
    /** キーボード操作時の移動速度 */
    keyboardSpeed: 760,
    /** 幅が変わるときの変化速度 (px/秒) */
    resizeSpeed: 260,
  },

  ball: {
    radius: 8,
    initialSpeed: 430,
    maxSpeed: 700,
    /** ブロックを壊すたびに加算される速度 */
    speedUpPerHit: 3,
    /** 発射角のばらつき (垂直からの最大角度) */
    launchAngle: 25,
    /** パドル端に当たったときの反射角 (垂直からの最大角度) */
    maxBounceAngle: 60,
    /**
     * パドル上の位置 → 反射角のカーブ (1 = 比例)。
     * 1 より大きいと中央付近がまっすぐ上に返りやすくなり、狙い撃ちしやすくなる
     */
    bounceCurve: 1.5,
    /** 水平に近い軌道でラリーが終わらなくなるのを防ぐ、垂直方向速度の最小比率 */
    minVerticalRatio: 0.3,
  },

  bricks: {
    top: 130,
    /** 1行あたりの列数。全ステージ共通の格子 */
    columns: 12,
    height: 32,
    gap: 5,
    sideMargin: 18,
    /**
     * 壊れないブロックを左右に広げる量。隣同士がつながって壁になり、
     * 1マス空けた隙間の幅がちょうどブロック1個分 (ボール約2.3個分) になる
     */
    steelInflate: 5,
    /** 行ごとの得点 (上の行ほど高得点)。行数を超えた分は末尾の値 */
    rowScores: [80, 70, 60, 50, 40, 30, 20, 10],
    /** ブロック種別ごとの性能。特殊ブロックはここに追加する */
    types: {
      normal: { hp: 1, breakable: true, dropsItems: true },
      steel: { hp: 1, breakable: false, dropsItems: false },
    },
  },

  items: {
    /** 通常ブロックを壊したときにアイテムが出る確率 */
    dropChance: 0.13,
    /**
     * 出現したアイテムの種類の重み (合計に対する比率で抽選)。
     * 強力なものほど小さくする: WIDE > MULTI > SAFETY
     */
    weights: { wide: 6, multi: 5, safety: 1 },
    /** 画面内に同時に落ちてくる最大数 */
    maxFalling: 3,
    fallSpeed: 170,
    width: 58,
    height: 22,

    multi: {
      /** ボール数の上限 (1 → 3 → 9 → 27)。描画・判定の負荷を抑えるための安全上限 */
      maxBalls: 27,
      /** 分裂したボールを元の進行方向からずらす角度 */
      splitAngle: 18,
    },
    wide: {
      width: 156,
      duration: 12,
    },
    safety: {
      /** 消えるまでの時間 (この間は何度でも跳ね返す) */
      duration: 20,
      /** パドル上端からバーまでの距離 */
      offsetBelowPaddle: 62,
      height: 6,
    },
  },

  boss: {
    hp: 20,
    /** 当たり判定 (丸い体の部分)。耳は見た目だけで判定に含めない */
    width: 140,
    height: 84,
    /** ボス上端の y。上に耳を描くスペースを空けている */
    top: 140,
    /** 左右の壁とボスの間に必ず空ける幅 */
    wallMargin: 34,
    /** ボールが当たったあと、次にダメージを受けるまでの無敵時間 */
    hitCooldown: 0.12,
    hitScore: 50,
    defeatScore: 5000,
    /** 勝利時、残りプレイヤー HP 1 あたりのボーナス */
    hpBonus: 1000,

    /** ボス戦でのプレイヤー HP = playerBaseHp + 持ち越した残り LIFE */
    playerBaseHp: 3,
    /** ボールを落としたときのプレイヤーダメージ */
    ballDropDamage: 1,
    /** 攻撃が当たったときのプレイヤーダメージ */
    attackDamage: 1,
    /** 被弾後の無敵時間 */
    playerInvincible: 1.2,

    /** ボス戦のアイテム: ボールを当てたときに落とす */
    items: {
      dropChance: 0.3,
      weights: { wide: 5, multi: 4, safety: 1 },
      /** ボス戦は手数が増えすぎないよう上限を下げる (1 → 3 → 9) */
      maxBalls: 9,
    },

    /**
     * 残り HP の割合で段階 (フェーズ) が進み、攻撃の種類が増える。
     * hpRatio 以下になったらそのフェーズに入る (上から順に判定)
     */
    phases: [
      { hpRatio: 1, moveSpeed: 0.7, interval: 2.4, pattern: ['aimed'] },
      { hpRatio: 0.66, moveSpeed: 0.95, interval: 2.1, pattern: ['aimed', 'spread'] },
      { hpRatio: 0.33, moveSpeed: 1.2, interval: 1.8, pattern: ['laser', 'spread', 'aimed'] },
    ],

    attacks: {
      aimed: {
        /** 発射前の予告時間 (ボスが止まって光る) */
        telegraph: 0.6,
        speed: 280,
      },
      spread: {
        telegraph: 0.8,
        /** パドル方向を中心に扇状に撃つ。弾の間隔はパドルが入れる幅を確保する */
        bullets: 3,
        spreadAngle: 26,
        speed: 230,
      },
      laser: {
        /** 照準の表示時間。この間に移動すれば避けられる */
        telegraph: 1.0,
        duration: 0.45,
        width: 52,
      },
      bulletRadius: 9,
    },

    /**
     * 裏ボス (EX STAGE)。通常ボスをクリアすると選べる。
     * HP・当たり判定は通常ボスと同じで、攻撃の頻度と種類だけが違う。
     * どの攻撃も予告があり、避ける位置・タイミングが必ず存在するように調整している
     */
    ex: {
      phases: [
        { hpRatio: 1, moveSpeed: 1.0, interval: 1.6, pattern: ['burst', 'fan', 'spiral'] },
        { hpRatio: 0.66, moveSpeed: 1.2, interval: 1.4, pattern: ['spiral', 'laserWall', 'burst', 'fan'] },
        { hpRatio: 0.33, moveSpeed: 1.4, interval: 1.2, pattern: ['laserWall', 'spiral', 'burst', 'fan', 'spiral'] },
      ],
      attacks: {
        /** パドルを狙い直しながら連射する。止まっていると当たる */
        burst: { telegraph: 0.5, count: 4, interval: 0.17, speed: 320 },
        /** 7方向の扇状弾。弾の間隔は WIDE PADDLE (156px) でもぎりぎり入れる程度 */
        fan: { telegraph: 0.65, bullets: 7, spreadAngle: 18, speed: 240 },
        /**
         * 螺旋弾: 回転しながら複数の腕で撃ち続ける。下向きの弾だけを撃つ。
         * 回転に合わせて移動するか、腕の間をすり抜けて避ける
         */
        spiral: { telegraph: 0.7, duration: 1.8, interval: 0.12, arms: 2, turnSpeed: 130, speed: 210 },
        /** 画面全体を覆うレーザー。パドルから遠い側に1か所だけ安全地帯 (パドル幅 + gapMargin) を残す */
        laserWall: { telegraph: 1.15, duration: 0.5, gapMargin: 48 },
        bulletRadius: 9,
      },
    },
  },
} as const;

export type BreakoutConfig = typeof BREAKOUT_CONFIG;
export type BossConfig = BreakoutConfig['boss'];
export type BrickType = keyof BreakoutConfig['bricks']['types'];
export type ItemKind = keyof BreakoutConfig['items']['weights'];
export type BossAttackKind = 'aimed' | 'spread' | 'laser' | 'fan' | 'burst' | 'spiral' | 'laserWall';
