/**
 * calculator.js
 *
 * 純粋な計算ロジックのみを扱うモジュール。UI(DOM)には一切関与しない。
 * 機種固有の設定値は machineData.js から渡された値のみを使用し、
 * このファイル内には決して埋め込まない。
 *
 * 差枚の定義 (仕様書 5章):
 *   差枚 = 払い出し枚数 − 投入枚数 (純増差枚)
 *   本モジュールの逆算式は、この定義と符号が整合するように統一している。
 *   つまり「投入」はプラス、「払出」はマイナスとして差枚の式に現れる:
 *     差枚 = (ブドウ払出 + チェリー払出 + BIG払出 + REG払出) − 投入
 *   → ブドウ払出 = 差枚 + 投入 − BIG払出 − REG払出 − チェリー払出 (仕様書 6章の式)
 */

var JA = window.JA || (window.JA = {});

JA.calculator = (function () {
  /**
   * 投入枚数を算出する。
   * 投入枚数 = 3 × G × (1 − リプレイ確率)
   * @param {number} totalSpins 総回転数 G
   * @param {number} replayRateDenom リプレイ確率の分母 (例: 7.3 → 1/7.3)
   * @returns {number}
   */
  function calcInvestment(totalSpins, replayRateDenom) {
    const replayProbability = 1 / replayRateDenom;
    return 3 * totalSpins * (1 - replayProbability);
  }

  /**
   * BIG払い出し総数を算出する。
   * @param {number} bigCount BIG回数
   * @param {number} bigPayout BIG1回あたりの獲得枚数
   * @returns {number}
   */
  function calcBigPayoutTotal(bigCount, bigPayout) {
    return bigCount * bigPayout;
  }

  /**
   * REG払い出し総数を算出する。
   * @param {number} regCount REG回数
   * @param {number} regPayout REG1回あたりの獲得枚数
   * @returns {number}
   */
  function calcRegPayoutTotal(regCount, regPayout) {
    return regCount * regPayout;
  }

  /**
   * チェリー期待回数を算出する。
   * チェリー期待回数 = G × チェリー確率
   * @param {number} totalSpins 総回転数 G
   * @param {number} cherryRateDenom チェリー確率の分母
   * @returns {number}
   */
  function calcCherryExpectedCount(totalSpins, cherryRateDenom) {
    return totalSpins * (1 / cherryRateDenom);
  }

  /**
   * チェリー払い出し期待値を算出する。
   * チェリー払い出し期待値 = 期待回数 × 取得率 × 払い出し枚数
   * @param {number} cherryExpectedCount チェリー期待回数
   * @param {number} captureRate 取得率 (1.0 / 0.7 / 0.5)
   * @param {number} cherryPayout チェリー1回あたりの払い出し枚数
   * @returns {number}
   */
  function calcCherryPayoutExpected(cherryExpectedCount, captureRate, cherryPayout) {
    return cherryExpectedCount * captureRate * cherryPayout;
  }

  /**
   * 推定ブドウ回数を算出する。
   * 推定ブドウ回数 = (差枚 + 投入 − BIG払出 − REG払出 − チェリー払出) ÷ 8
   * @param {object} params
   * @param {number} params.diffCoins 推定差枚数
   * @param {number} params.investment 投入枚数
   * @param {number} params.bigPayoutTotal BIG払出総数
   * @param {number} params.regPayoutTotal REG払出総数
   * @param {number} params.cherryPayoutExpected チェリー払出期待値
   * @param {number} params.grapePayout ブドウ1回あたりの払い出し枚数 (通常8枚)
   * @returns {number}
   */
  function calcEstimatedGrapeCount(params) {
    const {
      diffCoins,
      investment,
      bigPayoutTotal,
      regPayoutTotal,
      cherryPayoutExpected,
      grapePayout
    } = params;
    return (
      (diffCoins + investment - bigPayoutTotal - regPayoutTotal - cherryPayoutExpected) /
      grapePayout
    );
  }

  /**
   * 逆算ブドウ確率の分母 (G ÷ 推定ブドウ回数) を算出する。
   * 推定ブドウ回数が0以下の場合は逆算不能として null を返す。
   * @param {number} totalSpins 総回転数 G
   * @param {number} estimatedGrapeCount 推定ブドウ回数
   * @returns {number|null}
   */
  function calcGrapeRateDenom(totalSpins, estimatedGrapeCount) {
    if (!(estimatedGrapeCount > 0)) return null;
    return totalSpins / estimatedGrapeCount;
  }

  /**
   * 指定した取得率(チェリー狙い精度)1件分の逆算結果一式を計算する。
   * @param {object} machine 機種データ
   * @param {object} input { totalSpins, bigCount, regCount, diffCoins }
   * @param {number} captureRate 取得率 (1.0 / 0.7 / 0.5)
   * @returns {object} 計算過程と結果一式
   */
  function calcGrapeAnalysis(machine, input, captureRate) {
    const investment = calcInvestment(input.totalSpins, machine.replayRate);
    const bigPayoutTotal = calcBigPayoutTotal(input.bigCount, machine.bigPayout);
    const regPayoutTotal = calcRegPayoutTotal(input.regCount, machine.regPayout);

    // チェリー確率は機種によって設定差があるため、6設定の平均値を代表値として使用する。
    const avgCherryRateDenom =
      machine.cherryRates.reduce((sum, v) => sum + v, 0) / machine.cherryRates.length;
    const cherryExpectedCount = calcCherryExpectedCount(input.totalSpins, avgCherryRateDenom);
    const cherryPayoutExpected = calcCherryPayoutExpected(
      cherryExpectedCount,
      captureRate,
      machine.cherryPayout
    );

    const estimatedGrapeCount = calcEstimatedGrapeCount({
      diffCoins: input.diffCoins,
      investment,
      bigPayoutTotal,
      regPayoutTotal,
      cherryPayoutExpected,
      grapePayout: machine.grapePayout
    });

    const grapeRateDenom = calcGrapeRateDenom(input.totalSpins, estimatedGrapeCount);

    return {
      captureRate,
      investment,
      bigPayoutTotal,
      regPayoutTotal,
      cherryExpectedCount,
      cherryPayoutExpected,
      estimatedGrapeCount,
      grapeRateDenom
    };
  }

  /**
   * 実測BIG確率の分母を算出する。
   * @param {number} totalSpins
   * @param {number} bigCount
   * @returns {number|null}
   */
  function calcMeasuredBigRate(totalSpins, bigCount) {
    if (!(bigCount > 0)) return null;
    return totalSpins / bigCount;
  }

  /**
   * 実測REG確率の分母を算出する。
   * @param {number} totalSpins
   * @param {number} regCount
   * @returns {number|null}
   */
  function calcMeasuredRegRate(totalSpins, regCount) {
    if (!(regCount > 0)) return null;
    return totalSpins / regCount;
  }

  /**
   * 実測合算確率の分母を算出する。
   * @param {number} totalSpins
   * @param {number} bigCount
   * @param {number} regCount
   * @returns {number|null}
   */
  function calcMeasuredTotalRate(totalSpins, bigCount, regCount) {
    const total = bigCount + regCount;
    if (!(total > 0)) return null;
    return totalSpins / total;
  }

  /**
   * 信頼度(回転数ベース)を判定する。
   * 仕様書12章:
   *   1000G未満 → 低 / 1000〜4999G → 普通 / 5000〜6999G → 高 / 7000G以上 → 非常に高
   * @param {number} totalSpins
   * @returns {string}
   */
  function calcConfidenceLevel(totalSpins) {
    if (totalSpins < 1000) return '低';
    if (totalSpins < 5000) return '普通';
    if (totalSpins < 7000) return '高';
    return '非常に高';
  }

  /**
   * 入力値の異常チェックを行う。
   * @param {object} input { totalSpins, bigCount, regCount, diffCoins }
   * @param {object} grapeAnalysisAt100 captureRate=1.0 での calcGrapeAnalysis 結果
   * @returns {string[]} 警告メッセージの配列 (異常なしの場合は空配列)
   */
  function validateInput(input, grapeAnalysisAt100) {
    const warnings = [];
    const { totalSpins, bigCount, regCount } = input;

    if (totalSpins <= 0) {
      warnings.push('総回転数(G)は1以上を入力してください。');
      return warnings;
    }
    if (bigCount < 0 || regCount < 0) {
      warnings.push('BIG回数・REG回数は0以上を入力してください。');
    }
    // BIG回数が理論上あり得ない頻度 (平均7G/回未満、設定6でも通常130G程度以上) になっていないか
    if (bigCount > 0 && totalSpins / bigCount < 50) {
      warnings.push('BIGが多すぎます。回転数またはBIG回数の入力を確認してください。');
    }
    if (regCount > 0 && totalSpins / regCount < 50) {
      warnings.push('REGが多すぎます。回転数またはREG回数の入力を確認してください。');
    }
    if (bigCount + regCount > totalSpins) {
      warnings.push('BIG回数とREG回数の合計が総回転数を超えています。入力値を確認してください。');
    }
    if (grapeAnalysisAt100.estimatedGrapeCount < 0) {
      warnings.push('ブドウが負数になっています。差枚数・BIG/REG回数の入力を確認してください。');
    }
    if (grapeAnalysisAt100.grapeRateDenom !== null && grapeAnalysisAt100.grapeRateDenom < 3) {
      warnings.push('差枚矛盾: 逆算ブドウ確率が理論上あり得ない高頻度です。入力値を確認してください。');
    }

    return warnings;
  }

  return {
    calcInvestment,
    calcBigPayoutTotal,
    calcRegPayoutTotal,
    calcCherryExpectedCount,
    calcCherryPayoutExpected,
    calcEstimatedGrapeCount,
    calcGrapeRateDenom,
    calcGrapeAnalysis,
    calcMeasuredBigRate,
    calcMeasuredRegRate,
    calcMeasuredTotalRate,
    calcConfidenceLevel,
    validateInput
  };
})();
