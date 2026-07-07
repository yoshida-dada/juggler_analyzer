/**
 * app.js
 *
 * アプリケーションのエントリーポイント。
 * DOM要素の取得・イベント配線・各モジュール(calculator/bayes/ui/charts)の呼び出し順序の
 * 制御(オーケストレーション)のみを担当する。計算ロジックそのものはここには書かない。
 */

(function () {
  const calculator = JA.calculator;
  const bayes = JA.bayes;
  const ui = JA.ui;

  // セッション履歴 (仕様書18章: LocalStorageは使用せず、ページを開いている間だけメモリ保持)
  const sessionHistory = [];
  const MAX_HISTORY = 20;

  const CAPTURE_RATES = [1.0, 0.7, 0.5];

  let dom = null;

  /** DOM要素を一括取得する。 */
  function queryDom() {
    return {
      machineSelect: document.getElementById('machine-select'),
      totalSpinsInput: document.getElementById('input-total-spins'),
      bigCountInput: document.getElementById('input-big-count'),
      regCountInput: document.getElementById('input-reg-count'),
      diffCoinsInput: document.getElementById('input-diff-coins'),
      cherryAccuracyGroup: document.getElementById('cherry-accuracy-group'),

      warningsSection: document.getElementById('warnings-section'),
      warningsList: document.getElementById('warnings-list'),

      confidenceBadge: document.getElementById('confidence-badge'),
      measured: {
        big: document.getElementById('measured-big'),
        reg: document.getElementById('measured-reg'),
        total: document.getElementById('measured-total'),
        grape: document.getElementById('measured-grape')
      },

      aiCommentsList: document.getElementById('ai-comments-list'),

      bayesChart: document.getElementById('bayes-chart'),

      matchRadarChart: document.getElementById('match-radar-chart'),
      matchScoreList: document.getElementById('match-score-list'),

      estimationBasisList: document.getElementById('estimation-basis-list'),

      specTableBody: document.getElementById('spec-table-body'),
      specTableMeasured: document.getElementById('spec-table-measured'),

      cherryComparisonBody: document.getElementById('cherry-comparison-body'),

      sensitivityChart: document.getElementById('sensitivity-chart'),
      sensitivityTableBody: document.getElementById('sensitivity-table-body'),

      calcProcessList: document.getElementById('calc-process-list'),

      saveHistoryBtn: document.getElementById('save-history-btn'),
      clearHistoryBtn: document.getElementById('clear-history-btn'),
      historyTableBody: document.getElementById('history-table-body')
    };
  }

  /** 現在選択中のチェリー狙い精度(取得率)を取得する。 */
  function getSelectedCaptureRate() {
    const checked = dom.cherryAccuracyGroup.querySelector('input[name="cherry-accuracy"]:checked');
    return checked ? parseFloat(checked.value) : 1.0;
  }

  /** 入力フォームから数値を読み取る。未入力は0として扱う。 */
  function readInput() {
    return {
      totalSpins: Number(dom.totalSpinsInput.value) || 0,
      bigCount: Number(dom.bigCountInput.value) || 0,
      regCount: Number(dom.regCountInput.value) || 0,
      diffCoins: Number(dom.diffCoinsInput.value) || 0
    };
  }

  /**
   * 現在の入力値・選択機種から解析結果一式を計算する。
   * @param {object} machine
   * @param {object} input
   * @param {number} captureRate
   * @returns {object}
   */
  function computeAnalysis(machine, input, captureRate) {
    const analysis = calculator.calcGrapeAnalysis(machine, input, captureRate);

    const measured = {
      bigRateDenom: calculator.calcMeasuredBigRate(input.totalSpins, input.bigCount),
      regRateDenom: calculator.calcMeasuredRegRate(input.totalSpins, input.regCount),
      totalRateDenom: calculator.calcMeasuredTotalRate(input.totalSpins, input.bigCount, input.regCount),
      grapeRateDenom: analysis.grapeRateDenom
    };

    const posterior = bayes.calculatePosterior(machine, input, analysis.estimatedGrapeCount);
    const matchScores = bayes.calculateMatchScores(machine, measured);
    const confidence = calculator.calcConfidenceLevel(input.totalSpins);
    const basis = bayes.generateEstimationBasis(machine, measured, posterior);
    const comments = bayes.generateAiComments(machine, measured, posterior);
    const warnings = calculator.validateInput(input, analysis);

    return { analysis, measured, posterior, matchScores, confidence, basis, comments, warnings };
  }

  /** 全ての取得率(100/70/50%)についてブドウ逆算・最有力設定を計算する (仕様書14章)。 */
  function computeCherryComparison(machine, input) {
    return CAPTURE_RATES.map((captureRate) => {
      const analysis = calculator.calcGrapeAnalysis(machine, input, captureRate);
      const posterior = bayes.calculatePosterior(machine, input, analysis.estimatedGrapeCount);
      const topProb = Math.max(...posterior);
      const topSetting = posterior.indexOf(topProb) + 1;
      return { captureRate, grapeRateDenom: analysis.grapeRateDenom, topSetting, topProb };
    });
  }

  /** 画面全体を現在の入力値に基づいて再描画する (リアルタイム更新)。 */
  function renderAll() {
    const machine = JA.getMachineById(dom.machineSelect.value);
    if (!machine) return;

    const input = readInput();
    const captureRate = getSelectedCaptureRate();

    const result = computeAnalysis(machine, input, captureRate);

    ui.renderWarnings(dom.warningsSection, dom.warningsList, result.warnings);
    ui.renderMeasured(dom.measured, result.measured);
    ui.renderConfidence(dom.confidenceBadge, result.confidence);
    ui.renderAiComments(dom.aiCommentsList, result.comments);
    ui.renderBayesChart(dom.bayesChart, result.posterior);
    ui.renderMatchScore(dom.matchRadarChart, dom.matchScoreList, result.matchScores);
    ui.renderEstimationBasis(dom.estimationBasisList, result.basis);
    ui.renderSpecTable(dom.specTableBody, dom.specTableMeasured, machine, result.measured);
    ui.renderCalcProcess(dom.calcProcessList, result.analysis);

    const cherryComparison = computeCherryComparison(machine, input);
    ui.renderCherryComparisonTable(dom.cherryComparisonBody, cherryComparison);

    const sensitivity = bayes.calculateSensitivity(machine, input, captureRate);
    ui.renderSensitivity(dom.sensitivityChart, dom.sensitivityTableBody, sensitivity);

    // 次回の履歴保存のために最新の解析結果を保持しておく
    renderAll.lastResult = { machine, input, result };
  }

  /** 現在の結果をセッション履歴に追加する (仕様書18章: 最大20件、LocalStorage不使用)。 */
  function saveCurrentToHistory() {
    const last = renderAll.lastResult;
    if (!last) return;
    const topSetting = last.result.posterior
      ? last.result.posterior.indexOf(Math.max(...last.result.posterior)) + 1
      : last.result.basis.topSetting;

    sessionHistory.unshift({
      machineName: last.machine.name,
      totalSpins: last.input.totalSpins,
      bigCount: last.input.bigCount,
      regCount: last.input.regCount,
      diffCoins: last.input.diffCoins,
      topSetting: last.result.basis.topSetting
    });
    if (sessionHistory.length > MAX_HISTORY) sessionHistory.length = MAX_HISTORY;
    ui.renderHistory(dom.historyTableBody, sessionHistory);
  }

  /** 入力欄・機種選択・チェリー精度の変更を監視し、リアルタイム再描画する。 */
  function bindEvents() {
    const rerenderTargets = [
      dom.machineSelect,
      dom.totalSpinsInput,
      dom.bigCountInput,
      dom.regCountInput,
      dom.diffCoinsInput
    ];
    rerenderTargets.forEach((el) => el.addEventListener('input', renderAll));
    dom.machineSelect.addEventListener('change', renderAll);
    dom.cherryAccuracyGroup.addEventListener('change', renderAll);

    dom.saveHistoryBtn.addEventListener('click', saveCurrentToHistory);
    dom.clearHistoryBtn.addEventListener('click', () => {
      sessionHistory.length = 0;
      ui.renderHistory(dom.historyTableBody, sessionHistory);
    });

    window.addEventListener('resize', renderAll);
  }

  /** PWA用Service Workerを登録する(対応環境かつHTTP(S)配信時のみ)。 */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
      navigator.serviceWorker.register('service-worker.js').catch(() => {
        // オフライン単体HTML(file://)運用等、登録できない環境では無視する
      });
    }
  }

  function init() {
    dom = queryDom();
    ui.populateMachineSelect(dom.machineSelect, JA.machineData);

    // 初期表示用のサンプル値を設定し、起動直後からリアルタイム計算結果を確認できるようにする
    dom.totalSpinsInput.value = 5000;
    dom.bigCountInput.value = 18;
    dom.regCountInput.value = 20;
    dom.diffCoinsInput.value = -300;

    bindEvents();
    renderAll();
    registerServiceWorker();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
