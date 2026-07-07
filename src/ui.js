/**
 * ui.js
 *
 * DOM描画専用モジュール。計算ロジック(calculator.js / bayes.js)には一切関与せず、
 * 与えられたデータをDOMに反映することだけを担当する(計算ロジックとUIの完全分離)。
 */

var JA = window.JA || (window.JA = {});

JA.ui = (function () {
  /** 確率の分母を "1/xxx.x" 形式の文字列に整形する。null の場合は "-"。 */
  function formatRate(denom) {
    if (denom === null || denom === undefined || !isFinite(denom)) return '-';
    return `1/${denom.toFixed(1)}`;
  }

  /** パーセント表示に整形する。 */
  function formatPercent(value, digits) {
    if (value === null || value === undefined || !isFinite(value)) return '-';
    return `${value.toFixed(digits === undefined ? 1 : digits)}%`;
  }

  /**
   * 実測確率と理論(設定)確率を比較し、色分け区分を返す (仕様書9章)。
   * @param {number|null} measuredDenom 実測確率の分母
   * @param {number} theoreticalDenom 設定の理論確率の分母
   * @returns {'good'|'near'|'bad'|'neutral'}
   */
  function classifyMeasured(measuredDenom, theoreticalDenom) {
    if (measuredDenom === null || measuredDenom === undefined || !isFinite(measuredDenom)) {
      return 'neutral';
    }
    const measuredP = 1 / measuredDenom;
    const theoreticalP = 1 / theoreticalDenom;
    const ratio = measuredP / theoreticalP;
    if (ratio >= 1.05) return 'good';
    if (ratio >= 0.95) return 'near';
    return 'bad';
  }

  /** 機種選択プルダウンを構築する。 */
  function populateMachineSelect(selectEl, machines) {
    selectEl.innerHTML = '';
    machines.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      selectEl.appendChild(opt);
    });
  }

  /** 入力チェックの警告表示を更新する。 */
  function renderWarnings(sectionEl, listEl, warnings) {
    listEl.innerHTML = '';
    if (!warnings.length) {
      sectionEl.classList.add('hidden');
      return;
    }
    sectionEl.classList.remove('hidden');
    warnings.forEach((w) => {
      const li = document.createElement('li');
      li.textContent = w;
      listEl.appendChild(li);
    });
  }

  /** 実測値パネルを更新する (仕様書7章)。 */
  function renderMeasured(elements, measured) {
    elements.big.textContent = formatRate(measured.bigRateDenom);
    elements.reg.textContent = formatRate(measured.regRateDenom);
    elements.total.textContent = formatRate(measured.totalRateDenom);
    elements.grape.textContent = formatRate(measured.grapeRateDenom);
  }

  /** 信頼度バッジを更新する (仕様書12章)。 */
  function renderConfidence(badgeEl, level) {
    badgeEl.textContent = `信頼度: ${level}`;
    badgeEl.className = `badge badge-${level === '低' ? 'low' : level === '普通' ? 'mid' : level === '高' ? 'high' : 'vhigh'}`;
  }

  /** AIコメントを更新する (仕様書13章)。 */
  function renderAiComments(listEl, comments) {
    listEl.innerHTML = '';
    comments.forEach((c) => {
      const li = document.createElement('li');
      li.textContent = c;
      listEl.appendChild(li);
    });
  }

  /** ベイズ推定の横棒グラフを描画する (仕様書10章)。 */
  function renderBayesChart(canvas, posterior) {
    const labels = [1, 2, 3, 4, 5, 6].map((s) => `設定${s}`);
    const values = posterior.map((p) => p * 100);
    const highlightIndex = values.indexOf(Math.max(...values));
    JA.charts.drawHorizontalBarChart(canvas, { labels, values, highlightIndex, valueSuffix: '%' });
  }

  /** 一致度スコア(レーダーチャート + 一覧)を描画する (仕様書11章)。 */
  function renderMatchScore(radarCanvas, listEl, matchScores) {
    const best = matchScores.reduce((a, b) => (b.overall > a.overall ? b : a));
    JA.charts.drawRadarChart(radarCanvas, {
      axes: ['BIG', 'REG', 'ブドウ', '合算'],
      values: [best.big || 0, best.reg || 0, best.grape || 0, best.total || 0]
    });

    listEl.innerHTML = '';
    matchScores.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'match-score-row' + (m.setting === best.setting ? ' is-best' : '');

      const label = document.createElement('span');
      label.className = 'match-score-label';
      label.textContent = `設定${m.setting}`;

      const track = document.createElement('span');
      track.className = 'match-score-track';
      const bar = document.createElement('span');
      bar.className = 'match-score-bar';
      bar.style.width = `${m.overall}%`;
      track.appendChild(bar);

      const value = document.createElement('span');
      value.className = 'match-score-value';
      value.textContent = `${m.overall}点`;

      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(value);
      listEl.appendChild(row);
    });
  }

  /** 推測根拠の一覧を更新する (仕様書17章)。 */
  function renderEstimationBasis(listEl, basis) {
    listEl.innerHTML = '';
    basis.lines.forEach((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      listEl.appendChild(li);
    });
  }

  /** スペック表(設定1〜6 + 実測値行)を描画する (仕様書8/9章)。 */
  function renderSpecTable(tbody, tfoot, machine, measured) {
    tbody.innerHTML = '';
    for (let s = 1; s <= 6; s++) {
      const spec = machine.settings[s];
      const combinedDenom = JA.getCombinedRateDenom(spec.bigRate, spec.regRate);

      const tr = document.createElement('tr');

      const cells = [
        { text: `設定${s}`, cls: '' },
        { text: formatRate(spec.bigRate), cls: classifyMeasured(measured.bigRateDenom, spec.bigRate) },
        { text: formatRate(spec.regRate), cls: classifyMeasured(measured.regRateDenom, spec.regRate) },
        { text: formatRate(combinedDenom), cls: classifyMeasured(measured.totalRateDenom, combinedDenom) },
        { text: formatRate(spec.grapeRate), cls: classifyMeasured(measured.grapeRateDenom, spec.grapeRate) },
        { text: formatPercent(spec.rtp), cls: '' }
      ];
      cells.forEach((c) => {
        const td = document.createElement('td');
        td.textContent = c.text;
        if (c.cls) td.classList.add(`cell-${c.cls}`);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }

    tfoot.innerHTML = '';
    const trMeasured = document.createElement('tr');
    trMeasured.className = 'measured-row';
    [
      '実測値',
      formatRate(measured.bigRateDenom),
      formatRate(measured.regRateDenom),
      formatRate(measured.totalRateDenom),
      formatRate(measured.grapeRateDenom),
      '-'
    ].forEach((text) => {
      const td = document.createElement('td');
      td.textContent = text;
      trMeasured.appendChild(td);
    });
    tfoot.appendChild(trMeasured);
  }

  /** チェリー精度比較テーブルを描画する (仕様書14章)。 */
  function renderCherryComparisonTable(tbody, results) {
    tbody.innerHTML = '';
    results.forEach((r) => {
      const tr = document.createElement('tr');
      [
        `${Math.round(r.captureRate * 100)}%`,
        formatRate(r.grapeRateDenom),
        `設定${r.topSetting}`,
        formatPercent(r.topProb * 100)
      ].forEach((text) => {
        const td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  /** 感度分析(グラフ + テーブル)を描画する (仕様書15章)。 */
  function renderSensitivity(canvas, tbody, sensitivityResults) {
    JA.charts.drawSensitivityChart(canvas, {
      labels: sensitivityResults.map((r) => r.label),
      grapeValues: sensitivityResults.map((r) => r.grapeRateDenom),
      probValues: sensitivityResults.map((r) => Math.max(...r.posterior) * 100)
    });

    tbody.innerHTML = '';
    sensitivityResults.forEach((r) => {
      const tr = document.createElement('tr');
      if (r.label === '現在') tr.classList.add('current-row');
      [r.label, `${r.diffCoins}枚`, formatRate(r.grapeRateDenom), `設定${r.topSetting}`].forEach(
        (text) => {
          const td = document.createElement('td');
          td.textContent = text;
          tr.appendChild(td);
        }
      );
      tbody.appendChild(tr);
    });
  }

  /** 計算過程の詳細を描画する (仕様書16章)。 */
  function renderCalcProcess(listEl, analysis) {
    listEl.innerHTML = '';
    const items = [
      ['投入枚数', `${analysis.investment.toFixed(1)} 枚`],
      ['BIG払出', `${analysis.bigPayoutTotal.toFixed(1)} 枚`],
      ['REG払出', `${analysis.regPayoutTotal.toFixed(1)} 枚`],
      ['チェリー払出(期待値)', `${analysis.cherryPayoutExpected.toFixed(1)} 枚`],
      ['推定ブドウ回数', `${analysis.estimatedGrapeCount.toFixed(1)} 回`],
      ['逆算ブドウ確率', formatRate(analysis.grapeRateDenom)]
    ];
    items.forEach(([label, value]) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="calc-label">${label}</span><span class="calc-value">${value}</span>`;
      listEl.appendChild(li);
    });
  }

  /** セッション履歴テーブルを描画する (仕様書18章)。 */
  function renderHistory(tbody, historyArray) {
    tbody.innerHTML = '';
    historyArray.forEach((h, i) => {
      const tr = document.createElement('tr');
      [
        String(i + 1),
        h.machineName,
        String(h.totalSpins),
        String(h.bigCount),
        String(h.regCount),
        `${h.diffCoins}枚`,
        `設定${h.topSetting}`
      ].forEach((text) => {
        const td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  return {
    formatRate,
    formatPercent,
    classifyMeasured,
    populateMachineSelect,
    renderWarnings,
    renderMeasured,
    renderConfidence,
    renderAiComments,
    renderBayesChart,
    renderMatchScore,
    renderEstimationBasis,
    renderSpecTable,
    renderCherryComparisonTable,
    renderSensitivity,
    renderCalcProcess,
    renderHistory
  };
})();
