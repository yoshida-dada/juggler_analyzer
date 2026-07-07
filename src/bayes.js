/**
 * bayes.js
 *
 * ベイズ推定・一致度スコア・信頼度・AIコメント・推測根拠・感度分析など、
 * 統計的な設定推測ロジックを扱うモジュール。UI(DOM)には一切関与しない。
 */

var JA = window.JA || (window.JA = {});

JA.bayes = (function () {
  const calculator = JA.calculator;

  // ------------------------------------------------------------------
  // 二項分布の対数尤度計算 (数値安定性のため対数尤度で計算する: 仕様書10章)
  // ------------------------------------------------------------------

  /**
   * Lanczos近似によるlogガンマ関数。
   * 大きな回転数(G)でも log(n!) 等をオーバーフローなく計算するために使用する。
   * @param {number} x
   * @returns {number}
   */
  function logGamma(x) {
    const g = 7;
    const p = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    if (x < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    }
    x -= 1;
    let a = p[0];
    const t = x + g + 0.5;
    for (let i = 1; i < g + 2; i++) {
      a += p[i] / (x + i);
    }
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  /** log( nCk ) を対数ガンマ関数経由で算出する。 */
  function logBinomCoeff(n, k) {
    return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
  }

  /**
   * 二項分布 B(n, p) において k 回発生する対数尤度を算出する。
   * @param {number} k 発生回数
   * @param {number} n 試行回数
   * @param {number} p 理論確率
   * @returns {number}
   */
  function logBinomialLikelihood(k, n, p) {
    const clampedP = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
    const clampedK = Math.min(Math.max(k, 0), n);
    return (
      logBinomCoeff(n, clampedK) +
      clampedK * Math.log(clampedP) +
      (n - clampedK) * Math.log(1 - clampedP)
    );
  }

  /**
   * 設定1〜6の事後確率をベイズ推定で算出する。
   * 事前確率は各設定 1/6 の一様分布。
   * BIG・REG・ブドウそれぞれの二項尤度を掛け合わせ(対数尤度では加算)、正規化する。
   *
   * @param {object} machine 機種データ
   * @param {object} input { totalSpins, bigCount, regCount }
   * @param {number} estimatedGrapeCount 推定ブドウ回数 (calculator.calcGrapeAnalysis の結果)
   * @returns {number[]} 設定1〜6の事後確率 (合計1.0, 添字0が設定1)
   */
  function calculatePosterior(machine, input, estimatedGrapeCount) {
    const G = input.totalSpins;
    const logPrior = Math.log(1 / 6);
    const grapeK = Math.min(Math.max(Math.round(estimatedGrapeCount), 0), G);

    const logPosteriors = [];
    for (let s = 1; s <= 6; s++) {
      const spec = machine.settings[s];
      const pBig = 1 / spec.bigRate;
      const pReg = 1 / spec.regRate;
      const pGrape = 1 / spec.grapeRate;

      const llBig = logBinomialLikelihood(input.bigCount, G, pBig);
      const llReg = logBinomialLikelihood(input.regCount, G, pReg);
      const llGrape = logBinomialLikelihood(grapeK, G, pGrape);

      logPosteriors.push(logPrior + llBig + llReg + llGrape);
    }

    // オーバーフロー防止のため最大値を引いてから正規化 (log-sum-exp)
    const maxLog = Math.max(...logPosteriors);
    const exps = logPosteriors.map((lp) => Math.exp(lp - maxLog));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / sumExps);
  }

  // ------------------------------------------------------------------
  // 一致度スコア (ベイズとは別指標。仕様書11章)
  // ------------------------------------------------------------------

  /**
   * 実測値と理論値の相対誤差から0〜100点のスコアを算出する。
   * 相対誤差 0% → 100点、相対誤差 30%以上 → 0点、の直線減衰。
   * @param {number|null} measuredRateDenom 実測確率の分母
   * @param {number} theoreticalRateDenom 理論確率の分母
   * @returns {number|null}
   */
  function scoreFromRates(measuredRateDenom, theoreticalRateDenom) {
    if (measuredRateDenom === null || measuredRateDenom === undefined) return null;
    const measuredP = 1 / measuredRateDenom;
    const theoreticalP = 1 / theoreticalRateDenom;
    const relativeError = Math.abs(measuredP - theoreticalP) / theoreticalP;
    const THRESHOLD = 0.3;
    const score = 100 * (1 - relativeError / THRESHOLD);
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * 設定1〜6それぞれについて、BIG/REG/ブドウ/合算の一致度スコア(0〜100)と
   * その平均である総合スコアを算出する。
   * @param {object} machine 機種データ
   * @param {object} measured { bigRateDenom, regRateDenom, totalRateDenom, grapeRateDenom }
   * @returns {Array<object>} 設定ごとの { setting, big, reg, grape, total, overall }
   */
  function calculateMatchScores(machine, measured) {
    const results = [];
    for (let s = 1; s <= 6; s++) {
      const spec = machine.settings[s];
      const combinedDenom = JA.getCombinedRateDenom(spec.bigRate, spec.regRate);

      const big = scoreFromRates(measured.bigRateDenom, spec.bigRate);
      const reg = scoreFromRates(measured.regRateDenom, spec.regRate);
      const grape = scoreFromRates(measured.grapeRateDenom, spec.grapeRate);
      const total = scoreFromRates(measured.totalRateDenom, combinedDenom);

      const scored = [big, reg, grape, total].filter((v) => v !== null);
      const overall = scored.length
        ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
        : 0;

      results.push({ setting: s, big, reg, grape, total, overall });
    }
    return results;
  }

  // ------------------------------------------------------------------
  // 推測根拠 (仕様書17章): BIG/REG/ブドウそれぞれが「設定X相当」かを判定
  // ------------------------------------------------------------------

  /**
   * 実測値に理論値が最も近い設定番号を返す(相対誤差が最小の設定)。
   * @param {object} machine
   * @param {number|null} measuredRateDenom
   * @param {'bigRate'|'regRate'|'grapeRate'} field
   * @returns {number|null}
   */
  function nearestSetting(machine, measuredRateDenom, field) {
    if (measuredRateDenom === null || measuredRateDenom === undefined) return null;
    const measuredP = 1 / measuredRateDenom;
    let best = null;
    let bestDiff = Infinity;
    for (let s = 1; s <= 6; s++) {
      const theoreticalP = 1 / machine.settings[s][field];
      const diff = Math.abs(measuredP - theoreticalP);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = s;
      }
    }
    return best;
  }

  /**
   * 推測根拠のテキストを生成する。
   * @param {object} machine
   * @param {object} measured { bigRateDenom, regRateDenom, grapeRateDenom }
   * @param {number[]} posterior ベイズ事後確率(設定1〜6)
   * @returns {object} { bigSetting, regSetting, grapeSetting, topSetting, lines: string[] }
   */
  function generateEstimationBasis(machine, measured, posterior) {
    const bigSetting = nearestSetting(machine, measured.bigRateDenom, 'bigRate');
    const regSetting = nearestSetting(machine, measured.regRateDenom, 'regRate');
    const grapeSetting = nearestSetting(machine, measured.grapeRateDenom, 'grapeRate');

    const topSetting = posterior.indexOf(Math.max(...posterior)) + 1;

    const lines = [];
    if (bigSetting !== null) lines.push(`BIGは設定${bigSetting}相当`);
    if (regSetting !== null) lines.push(`REGは設定${regSetting}相当`);
    if (grapeSetting !== null) lines.push(`ブドウは設定${grapeSetting}相当`);
    lines.push(`総合すると設定${topSetting}が最有力`);

    return { bigSetting, regSetting, grapeSetting, topSetting, lines };
  }

  // ------------------------------------------------------------------
  // AIコメント (ルールベース, 仕様書13章)
  // ------------------------------------------------------------------

  /**
   * ルールベースでAIコメントを生成する。
   * @param {object} machine
   * @param {object} measured { bigRateDenom, regRateDenom, grapeRateDenom }
   * @param {number[]} posterior
   * @returns {string[]}
   */
  function generateAiComments(machine, measured, posterior) {
    const comments = [];

    // REGの評価: 設定5・6のREG理論値と比較して優秀かどうか
    if (measured.regRateDenom !== null) {
      const regP = 1 / measured.regRateDenom;
      const setting6RegP = 1 / machine.settings[6].regRate;
      const setting1RegP = 1 / machine.settings[1].regRate;
      if (regP >= setting6RegP * 0.95) {
        comments.push('REGが非常に優秀です。');
      } else if (regP <= setting1RegP * 1.05) {
        comments.push('REGは低設定並みで振るいません。');
      }
    }

    // BIGの評価
    if (measured.bigRateDenom !== null) {
      const bigP = 1 / measured.bigRateDenom;
      const setting6BigP = 1 / machine.settings[6].bigRate;
      const setting1BigP = 1 / machine.settings[1].bigRate;
      if (bigP >= setting6BigP * 0.95) {
        comments.push('BIGが非常に優秀です。');
      } else if (bigP <= setting1BigP * 1.05) {
        comments.push('BIGは低設定並みで振るいません。');
      }
    }

    // ブドウの評価: 設定5以上相当かどうか
    if (measured.grapeRateDenom !== null) {
      const grapeP = 1 / measured.grapeRateDenom;
      const setting5GrapeP = 1 / machine.settings[5].grapeRate;
      if (grapeP >= setting5GrapeP * 0.98) {
        comments.push('ブドウは設定5以上です。');
      }
    }

    // BIG先行型 / REG先行型
    if (measured.bigRateDenom !== null && measured.regRateDenom !== null) {
      if (measured.bigRateDenom < measured.regRateDenom * 0.6) {
        comments.push('BIG先行型です。');
      } else if (measured.regRateDenom < measured.bigRateDenom * 0.6) {
        comments.push('REG先行型です。');
      }
    }

    // 高設定濃厚判定: 設定5+6の事後確率合計
    const highSettingProb = posterior[4] + posterior[5];
    const lowSettingProb = posterior[0] + posterior[1];
    if (highSettingProb >= 0.6) {
      comments.push('設定5〜6が有力です。');
    } else if (lowSettingProb >= 0.6) {
      comments.push('設定1〜2の可能性が高いです。');
    }

    if (comments.length === 0) {
      comments.push('現時点では判断材料が不足しています。回転数を重ねましょう。');
    }

    return comments;
  }

  // ------------------------------------------------------------------
  // 感度分析 (仕様書15章): 差枚を ±300/±200/±100 させた場合の比較
  // ------------------------------------------------------------------

  /**
   * 差枚数を変動させた場合のブドウ逆算・設定推測の変化を比較する。
   * @param {object} machine
   * @param {object} input { totalSpins, bigCount, regCount, diffCoins }
   * @param {number} captureRate 取得率 (現在選択中のチェリー狙い精度)
   * @returns {Array<object>} { label, diffCoins, grapeRateDenom, posterior, topSetting }
   */
  function calculateSensitivity(machine, input, captureRate) {
    const offsets = [
      { label: '−300枚', delta: -300 },
      { label: '−200枚', delta: -200 },
      { label: '−100枚', delta: -100 },
      { label: '現在', delta: 0 },
      { label: '+100枚', delta: 100 },
      { label: '+200枚', delta: 200 },
      { label: '+300枚', delta: 300 }
    ];

    return offsets.map(({ label, delta }) => {
      const adjustedInput = { ...input, diffCoins: input.diffCoins + delta };
      const analysis = calculator.calcGrapeAnalysis(machine, adjustedInput, captureRate);
      const posterior = calculatePosterior(machine, adjustedInput, analysis.estimatedGrapeCount);
      const topSetting = posterior.indexOf(Math.max(...posterior)) + 1;
      return {
        label,
        diffCoins: adjustedInput.diffCoins,
        grapeRateDenom: analysis.grapeRateDenom,
        posterior,
        topSetting
      };
    });
  }

  return {
    logBinomialLikelihood,
    calculatePosterior,
    calculateMatchScores,
    generateEstimationBasis,
    generateAiComments,
    calculateSensitivity
  };
})();
