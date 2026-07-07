/**
 * charts.js
 *
 * Canvas 2D APIのみを用いたグラフ描画モジュール(外部ライブラリ不使用、オフライン動作対応)。
 * 横棒グラフ・レーダーチャート・感度分析グラフを提供する。
 */

var JA = window.JA || (window.JA = {});

JA.charts = (function () {
  const COLORS = {
    grid: 'rgba(255, 255, 255, 0.12)',
    text: '#c9d1d9',
    bar: '#4f8ef7',
    barHighlight: '#ffb347',
    line1: '#4f8ef7',
    line2: '#ff6b6b',
    axis: 'rgba(255, 255, 255, 0.35)'
  };

  /**
   * CanvasをdevicePixelRatioに合わせて高解像度化する。
   * @param {HTMLCanvasElement} canvas
   * @returns {CanvasRenderingContext2D}
   */
  function prepareCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || canvas.width;
    const cssHeight = canvas.clientHeight || canvas.height;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    return { ctx, width: cssWidth, height: cssHeight };
  }

  /**
   * 横棒グラフを描画する(ベイズ事後確率・一致度スコアなど)。
   * @param {HTMLCanvasElement} canvas
   * @param {object} data { labels: string[], values: number[] (0-100), highlightIndex?: number, valueSuffix?: string }
   */
  function drawHorizontalBarChart(canvas, data) {
    const { labels, values, highlightIndex, valueSuffix } = data;
    const { ctx, width, height } = prepareCanvas(canvas);

    const paddingLeft = 92;
    const paddingRight = 56;
    const paddingY = 8;
    const rowCount = labels.length;
    const rowHeight = (height - paddingY * 2) / rowCount;
    const chartWidth = width - paddingLeft - paddingRight;
    const maxValue = 100;

    ctx.font = '13px sans-serif';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < rowCount; i++) {
      const y = paddingY + i * rowHeight;
      const barHeight = Math.max(10, rowHeight * 0.55);
      const barY = y + (rowHeight - barHeight) / 2;
      const value = Math.max(0, Math.min(maxValue, values[i] || 0));
      const barWidth = (value / maxValue) * chartWidth;
      const isHighlight = i === highlightIndex;

      // ラベル
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'right';
      ctx.fillText(labels[i], paddingLeft - 10, y + rowHeight / 2);

      // 背景トラック
      ctx.fillStyle = COLORS.grid;
      ctx.fillRect(paddingLeft, barY, chartWidth, barHeight);

      // バー本体
      ctx.fillStyle = isHighlight ? COLORS.barHighlight : COLORS.bar;
      ctx.fillRect(paddingLeft, barY, barWidth, barHeight);

      // 数値ラベル
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'left';
      const suffix = valueSuffix || '%';
      ctx.fillText(
        `${value.toFixed(1)}${suffix}`,
        paddingLeft + Math.max(barWidth, 2) + 8,
        y + rowHeight / 2
      );
    }
  }

  /**
   * レーダーチャートを描画する(BIG/REG/ブドウ/合算 の一致度など)。
   * @param {HTMLCanvasElement} canvas
   * @param {object} data { axes: string[], values: number[] (0-100) }
   */
  function drawRadarChart(canvas, data) {
    const { axes, values } = data;
    const { ctx, width, height } = prepareCanvas(canvas);

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - 36;
    const n = axes.length;
    const maxValue = 100;

    function pointFor(index, value) {
      const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
      const r = (value / maxValue) * radius;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    }

    // 目盛りグリッド (25/50/75/100%)
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1.0].forEach((ratio) => {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const p = pointFor(i % n, maxValue * ratio);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });

    // 軸線とラベル
    ctx.strokeStyle = COLORS.axis;
    ctx.fillStyle = COLORS.text;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const p = pointFor(i, maxValue);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      const labelAngle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const labelR = radius + 18;
      const lx = cx + labelR * Math.cos(labelAngle);
      const ly = cy + labelR * Math.sin(labelAngle);
      ctx.fillText(axes[i], lx, ly);
    }

    // データ多角形
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = pointFor(i % n, Math.max(0, Math.min(maxValue, values[i % n] || 0)));
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(79, 142, 247, 0.35)';
    ctx.fill();
    ctx.strokeStyle = COLORS.bar;
    ctx.lineWidth = 2;
    ctx.stroke();

    // データ点
    ctx.fillStyle = COLORS.bar;
    for (let i = 0; i < n; i++) {
      const p = pointFor(i, Math.max(0, Math.min(maxValue, values[i] || 0)));
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * 感度分析グラフ(折れ線グラフ)を描画する。
   * 左軸: 逆算ブドウ確率の分母 / 右軸的な扱いとして最有力設定の事後確率(%)を第2系列で重ねる。
   * @param {HTMLCanvasElement} canvas
   * @param {object} data { labels: string[], grapeValues: number[], probValues: number[] }
   */
  function drawSensitivityChart(canvas, data) {
    const { labels, grapeValues, probValues } = data;
    const { ctx, width, height } = prepareCanvas(canvas);

    const paddingLeft = 56;
    const paddingRight = 56;
    const paddingTop = 24;
    const paddingBottom = 32;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    const n = labels.length;

    const validGrape = grapeValues.filter((v) => v !== null && isFinite(v));
    const grapeMin = validGrape.length ? Math.min(...validGrape) * 0.9 : 0;
    const grapeMax = validGrape.length ? Math.max(...validGrape) * 1.1 : 10;

    function xFor(i) {
      return paddingLeft + (chartWidth * i) / (n - 1);
    }
    function yForGrape(v) {
      if (v === null || !isFinite(v)) return null;
      const ratio = (v - grapeMin) / (grapeMax - grapeMin || 1);
      return paddingTop + chartHeight * (1 - ratio);
    }
    function yForProb(v) {
      const ratio = v / 100;
      return paddingTop + chartHeight * (1 - ratio);
    }

    // グリッド
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = paddingTop + (chartHeight * g) / 4;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartWidth, y);
      ctx.stroke();
    }

    // X軸ラベル
    ctx.fillStyle = COLORS.text;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      ctx.fillText(labels[i], xFor(i), height - 10);
    }

    // 系列1: 逆算ブドウ確率の分母
    ctx.beginPath();
    let started = false;
    grapeValues.forEach((v, i) => {
      const y = yForGrape(v);
      if (y === null) return;
      if (!started) {
        ctx.moveTo(xFor(i), y);
        started = true;
      } else {
        ctx.lineTo(xFor(i), y);
      }
    });
    ctx.strokeStyle = COLORS.line1;
    ctx.lineWidth = 2;
    ctx.stroke();
    grapeValues.forEach((v, i) => {
      const y = yForGrape(v);
      if (y === null) return;
      ctx.beginPath();
      ctx.arc(xFor(i), y, 3, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.line1;
      ctx.fill();
    });

    // 系列2: 最有力設定の事後確率(%)
    ctx.beginPath();
    probValues.forEach((v, i) => {
      const y = yForProb(v);
      if (i === 0) ctx.moveTo(xFor(i), y);
      else ctx.lineTo(xFor(i), y);
    });
    ctx.strokeStyle = COLORS.line2;
    ctx.lineWidth = 2;
    ctx.stroke();
    probValues.forEach((v, i) => {
      const y = yForProb(v);
      ctx.beginPath();
      ctx.arc(xFor(i), y, 3, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.line2;
      ctx.fill();
    });

    // 凡例
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.line1;
    ctx.fillRect(paddingLeft, 4, 10, 10);
    ctx.fillStyle = COLORS.text;
    ctx.fillText('逆算ブドウ(分母)', paddingLeft + 16, 9);
    ctx.fillStyle = COLORS.line2;
    ctx.fillRect(paddingLeft + 140, 4, 10, 10);
    ctx.fillStyle = COLORS.text;
    ctx.fillText('最有力設定の確率(%)', paddingLeft + 156, 9);
  }

  return {
    drawHorizontalBarChart,
    drawRadarChart,
    drawSensitivityChart
  };
})();
