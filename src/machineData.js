/**
 * machineData.js
 *
 * ジャグラーシリーズ 機種データ定義。
 *
 * 方針:
 *   - 計算ロジック（calculator.js / bayes.js）は、この JSON 相当のデータのみを参照し、
 *     設定値やBIG/REG確率などを計算ロジック内に直接埋め込まない。
 *   - 新機種を追加する場合は、この配列に1エントリ追加するだけでよい。
 *
 * データソースについて（画面下部「出典」欄にも同内容を表示）:
 *   - BIG確率・REG確率・機械割 は各種解析サイトで公表されているメーカー公表値ベースの数値。
 *   - ブドウ確率・チェリー確率 は実戦・解析サイトによる参考値であり、
 *     一部設定（例: 設定2〜4等）は公開されている設定1・5・6等の実測値から線形補間している。
 *     このため参考値として扱うこと（本アプリ内でも「参考値」である旨を明示する）。
 *   - BIG獲得枚数・REG獲得枚数・ブドウ払い出し・リプレイ確率は6号機ジャグラーシリーズの
 *     共通仕様（リプレイ確率 1/7.3、ブドウ払い出し 8枚 など）を用いている。
 *
 * 各設定(1〜6)は以下を保持する:
 *   bigRate   : BIG確率の分母 (例: 269.7 → 1/269.7)
 *   regRate   : REG確率の分母
 *   grapeRate : ブドウ確率の分母
 *   rtp       : 機械割 (%)
 *   合算 (合成確率) は bigRate・regRate から調和平均で算出するため、ここでは保持しない。
 */

var JA = window.JA || (window.JA = {});

JA.machineData = [
  {
    id: 'im_juggler_ex',
    name: 'アイムジャグラーEX',
    replayRate: 7.3,
    cherryPayout: 2,
    bigPayout: 252,
    regPayout: 96,
    grapePayout: 8,
    // チェリー確率(分母)。設定1〜6でほぼ横ばいのため区間補間。
    cherryRates: [35.5, 35.5, 35.5, 35.5, 35.5, 35.6],
    settings: {
      1: { bigRate: 273.1, regRate: 439.8, grapeRate: 6.01, rtp: 97.0 },
      2: { bigRate: 269.7, regRate: 399.6, grapeRate: 6.01, rtp: 98.0 },
      3: { bigRate: 269.7, regRate: 331.0, grapeRate: 6.01, rtp: 99.5 },
      4: { bigRate: 259.0, regRate: 315.1, grapeRate: 6.01, rtp: 101.1 },
      5: { bigRate: 259.0, regRate: 255.0, grapeRate: 6.01, rtp: 103.3 },
      6: { bigRate: 255.0, regRate: 255.0, grapeRate: 5.80, rtp: 105.5 }
    }
  },
  {
    id: 'neo_im_juggler_ex',
    name: 'ネオアイムジャグラーEX',
    replayRate: 7.3,
    cherryPayout: 2,
    bigPayout: 252,
    regPayout: 96,
    grapePayout: 8,
    cherryRates: [30.10, 29.75, 29.40, 29.05, 28.68, 28.31],
    settings: {
      1: { bigRate: 273.1, regRate: 439.8, grapeRate: 6.11, rtp: 97.0 },
      2: { bigRate: 269.7, regRate: 399.6, grapeRate: 6.05, rtp: 98.0 },
      3: { bigRate: 269.7, regRate: 331.0, grapeRate: 5.99, rtp: 99.5 },
      4: { bigRate: 259.0, regRate: 315.1, grapeRate: 5.93, rtp: 101.1 },
      5: { bigRate: 259.0, regRate: 255.0, grapeRate: 5.86, rtp: 103.3 },
      6: { bigRate: 255.0, regRate: 255.0, grapeRate: 5.79, rtp: 105.5 }
    }
  },
  {
    id: 'my_juggler_v',
    name: 'マイジャグラーV',
    replayRate: 7.3,
    cherryPayout: 2,
    bigPayout: 240,
    regPayout: 96,
    grapePayout: 8,
    cherryRates: [38.1, 37.5, 36.9, 36.3, 35.7, 35.1],
    settings: {
      1: { bigRate: 273.1, regRate: 409.6, grapeRate: 5.98, rtp: 97.0 },
      2: { bigRate: 270.8, regRate: 385.8, grapeRate: 5.88, rtp: 98.0 },
      3: { bigRate: 266.4, regRate: 336.1, grapeRate: 5.84, rtp: 99.9 },
      4: { bigRate: 254.0, regRate: 290.0, grapeRate: 5.81, rtp: 102.8 },
      5: { bigRate: 240.1, regRate: 268.6, grapeRate: 5.76, rtp: 105.3 },
      6: { bigRate: 229.1, regRate: 229.1, grapeRate: 5.65, rtp: 109.4 }
    }
  },
  {
    id: 'funky_juggler_2',
    name: 'ファンキージャグラー2',
    replayRate: 7.3,
    cherryPayout: 2,
    bigPayout: 240,
    regPayout: 96,
    grapePayout: 8,
    cherryRates: [35.5, 35.6, 35.6, 35.7, 35.7, 35.8],
    settings: {
      1: { bigRate: 266.4, regRate: 439.8, grapeRate: 5.94, rtp: 97.0 },
      2: { bigRate: 259.0, regRate: 407.1, grapeRate: 5.92, rtp: 98.5 },
      3: { bigRate: 256.0, regRate: 366.1, grapeRate: 5.90, rtp: 99.8 },
      4: { bigRate: 249.2, regRate: 322.8, grapeRate: 5.83, rtp: 102.0 },
      5: { bigRate: 240.1, regRate: 299.3, grapeRate: 5.80, rtp: 104.3 },
      6: { bigRate: 219.9, regRate: 262.1, grapeRate: 5.70, rtp: 109.0 }
    }
  },
  {
    id: 'gogo_juggler_3',
    name: 'ゴーゴージャグラー3',
    replayRate: 7.3,
    cherryPayout: 2,
    bigPayout: 240,
    regPayout: 96,
    grapePayout: 8,
    cherryRates: [33.00, 32.98, 32.95, 32.90, 32.85, 32.80],
    settings: {
      1: { bigRate: 259.0, regRate: 354.2, grapeRate: 6.33, rtp: 97.2 },
      2: { bigRate: 258.0, regRate: 332.7, grapeRate: 6.20, rtp: 98.2 },
      3: { bigRate: 257.0, regRate: 306.2, grapeRate: 6.15, rtp: 99.4 },
      4: { bigRate: 254.0, regRate: 268.6, grapeRate: 6.08, rtp: 101.6 },
      5: { bigRate: 247.3, regRate: 247.3, grapeRate: 6.01, rtp: 103.8 },
      6: { bigRate: 234.9, regRate: 234.9, grapeRate: 5.96, rtp: 106.5 }
    }
  },
  {
    id: 'happy_juggler_8',
    name: 'ハッピージャグラーVⅧ',
    replayRate: 7.3,
    cherryPayout: 4,
    bigPayout: 240,
    regPayout: 96,
    grapePayout: 8,
    cherryRates: [62.1, 61.5, 61.1, 64.5, 64.9, 65.5],
    settings: {
      1: { bigRate: 273.1, regRate: 397.2, grapeRate: 6.05, rtp: 97.0 },
      2: { bigRate: 270.8, regRate: 362.1, grapeRate: 6.04, rtp: 98.1 },
      3: { bigRate: 263.2, regRate: 332.7, grapeRate: 6.02, rtp: 99.9 },
      4: { bigRate: 254.0, regRate: 300.6, grapeRate: 5.90, rtp: 102.9 },
      5: { bigRate: 239.2, regRate: 273.1, grapeRate: 5.81, rtp: 105.8 },
      6: { bigRate: 226.0, regRate: 256.0, grapeRate: 5.75, rtp: 108.4 }
    }
  },
  {
    id: 'juggler_girls_ss',
    name: 'ジャグラーガールズSS',
    replayRate: 7.3,
    cherryPayout: 2,
    bigPayout: 240,
    regPayout: 96,
    grapePayout: 8,
    // 実戦値のため設定1・5・6のみ公開。2〜4は補間値。
    cherryRates: [41.1, 39.2, 37.3, 35.9, 34.6, 31.3],
    settings: {
      1: { bigRate: 273.1, regRate: 381.0, grapeRate: 6.20, rtp: 97.0 },
      2: { bigRate: 270.8, regRate: 350.5, grapeRate: 6.10, rtp: 97.9 },
      3: { bigRate: 260.1, regRate: 316.6, grapeRate: 6.00, rtp: 99.9 },
      4: { bigRate: 250.1, regRate: 281.3, grapeRate: 5.95, rtp: 102.1 },
      5: { bigRate: 243.6, regRate: 270.8, grapeRate: 5.90, rtp: 104.0 },
      6: { bigRate: 226.0, regRate: 252.1, grapeRate: 5.80, rtp: 107.5 }
    }
  },
  {
    id: 'mr_juggler',
    name: 'ミスタージャグラー',
    replayRate: 7.3,
    cherryPayout: 4,
    bigPayout: 240,
    regPayout: 96,
    grapePayout: 8,
    // 実戦値のため設定1・5・6のみ公開。2〜4は補間値。
    cherryRates: [38.74, 38.14, 37.54, 36.93, 36.33, 35.02],
    settings: {
      1: { bigRate: 268.6, regRate: 374.5, grapeRate: 6.50, rtp: 97.0 },
      2: { bigRate: 267.5, regRate: 354.2, grapeRate: 6.40, rtp: 98.0 },
      3: { bigRate: 260.1, regRate: 331.0, grapeRate: 6.31, rtp: 99.8 },
      4: { bigRate: 249.2, regRate: 291.3, grapeRate: 6.21, rtp: 102.7 },
      5: { bigRate: 240.9, regRate: 257.0, grapeRate: 6.12, rtp: 105.5 },
      6: { bigRate: 237.4, regRate: 237.4, grapeRate: 5.84, rtp: 107.3 }
    }
  },
  {
    id: 'ultra_miracle_juggler',
    name: 'ウルトラミラクルジャグラー',
    replayRate: 7.3,
    cherryPayout: 2,
    bigPayout: 240,
    regPayout: 96,
    grapePayout: 8,
    // 実戦値のため設定1・5・6のみ公開。2〜4は補間値。
    cherryRates: [37.91, 37.77, 37.62, 37.47, 37.33, 36.95],
    settings: {
      1: { bigRate: 267.5, regRate: 425.6, grapeRate: 6.07, rtp: 97.0 },
      2: { bigRate: 261.1, regRate: 402.1, grapeRate: 6.00, rtp: 98.1 },
      3: { bigRate: 256.0, regRate: 350.5, grapeRate: 5.94, rtp: 99.8 },
      4: { bigRate: 242.7, regRate: 322.8, grapeRate: 5.87, rtp: 102.1 },
      5: { bigRate: 233.2, regRate: 297.9, grapeRate: 5.80, rtp: 104.5 },
      6: { bigRate: 216.3, regRate: 277.7, grapeRate: 5.72, rtp: 108.1 }
    }
  }
];

/**
 * IDから機種データを取得する。
 * @param {string} id
 * @returns {object|undefined}
 */
JA.getMachineById = function (id) {
  return JA.machineData.find((m) => m.id === id);
};

/**
 * 指定機種・設定における「合算確率」の分母を調和平均で算出する。
 * 1/合算 = 1/BIG + 1/REG
 * @param {number} bigRate BIG確率の分母
 * @param {number} regRate REG確率の分母
 * @returns {number} 合算確率の分母
 */
JA.getCombinedRateDenom = function (bigRate, regRate) {
  return 1 / (1 / bigRate + 1 / regRate);
};
