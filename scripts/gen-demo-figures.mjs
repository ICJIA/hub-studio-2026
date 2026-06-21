#!/usr/bin/env node
/**
 * gen-demo-figures.mjs
 * Generates synthetic "research figure" SVGs for demo purposes.
 * Pure Node ESM — no npm dependencies.
 * Run: node scripts/gen-demo-figures.mjs
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'images', 'demo', 'figures');

mkdirSync(OUT_DIR, { recursive: true });

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  blue:   '#2563eb',
  teal:   '#0d9488',
  amber:  '#d97706',
  violet: '#7c3aed',
  red:    '#dc2626',
  text:   '#1e293b',
  sub:    '#475569',
  muted:  '#94a3b8',
  grid:   '#e2e8f0',
  bg:     '#ffffff',
  border: '#e2e8f0',
  zebra:  '#f8fafc',
};

const FONT = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

const W = 640;
const H = 384;

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** SVG shell with white background + border */
function svgShell(inner, { title = '', footnote = 'Illustrative sample data — not real.' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">
  <rect width="${W}" height="${H}" fill="${C.bg}" rx="4"/>
  <rect width="${W}" height="${H}" fill="none" stroke="${C.border}" stroke-width="1" rx="4"/>
  ${title ? `<text x="${W / 2}" y="28" text-anchor="middle" font-size="14" font-weight="700" fill="${C.text}">${esc(title)}</text>` : ''}
  ${inner}
  <text x="${W - 12}" y="${H - 8}" text-anchor="end" font-size="9" fill="${C.muted}">${esc(footnote)}</text>
</svg>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Draw horizontal grid lines */
function hGridLines(x0, y0, plotW, plotH, steps) {
  let lines = '';
  for (let i = 0; i <= steps; i++) {
    const y = y0 + plotH - (i / steps) * plotH;
    lines += `<line x1="${x0}" y1="${y}" x2="${x0 + plotW}" y2="${y}" stroke="${C.grid}" stroke-width="1"/>`;
  }
  return lines;
}

/** Draw a legend at given position */
function legend(items, x, y, colW = 110) {
  return items.map((it, i) => {
    const cx = x + i * colW;
    return `<rect x="${cx}" y="${y - 8}" width="12" height="12" rx="2" fill="${it.color}"/>
    <text x="${cx + 16}" y="${y + 1}" font-size="11" fill="${C.sub}">${esc(it.label)}</text>`;
  }).join('\n');
}

// ─── Chart generators ─────────────────────────────────────────────────────────

/** Vertical bar chart */
function makeVertBar({ title, categories, values, color, yLabel, xLabel, idx }) {
  const pad = { top: 52, right: 30, bottom: 64, left: 60 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const x0 = pad.left;
  const y0 = pad.top;

  const maxV = Math.max(...values) * 1.15;
  const steps = 5;
  const barW = plotW / categories.length * 0.55;
  const gap = plotW / categories.length;

  // grid
  let body = hGridLines(x0, y0, plotW, plotH, steps);

  // axes
  body += `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + plotH}" stroke="${C.sub}" stroke-width="1.5"/>`;
  body += `<line x1="${x0}" y1="${y0 + plotH}" x2="${x0 + plotW}" y2="${y0 + plotH}" stroke="${C.sub}" stroke-width="1.5"/>`;

  // y tick labels
  for (let i = 0; i <= steps; i++) {
    const val = Math.round((maxV * i) / steps);
    const y = y0 + plotH - (i / steps) * plotH;
    body += `<text x="${x0 - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="${C.sub}">${val}</text>`;
  }

  // bars + x labels
  categories.forEach((cat, i) => {
    const bh = (values[i] / maxV) * plotH;
    const bx = x0 + i * gap + (gap - barW) / 2;
    const by = y0 + plotH - bh;
    body += `<rect x="${bx}" y="${by}" width="${barW}" height="${bh}" rx="3" fill="${color}"/>`;
    // value label if bar is tall enough
    if (bh > 18) {
      body += `<text x="${bx + barW / 2}" y="${by - 4}" text-anchor="middle" font-size="10" font-weight="600" fill="${C.text}">${values[i]}</text>`;
    }
    // x axis label — split if long
    body += `<text x="${bx + barW / 2}" y="${y0 + plotH + 16}" text-anchor="middle" font-size="10" fill="${C.sub}">${esc(cat)}</text>`;
  });

  // axis titles
  if (yLabel) body += `<text x="${x0 - 46}" y="${y0 + plotH / 2}" text-anchor="middle" font-size="10" fill="${C.sub}" transform="rotate(-90,${x0 - 46},${y0 + plotH / 2})">${esc(yLabel)}</text>`;
  if (xLabel) body += `<text x="${x0 + plotW / 2}" y="${y0 + plotH + 46}" text-anchor="middle" font-size="10" fill="${C.sub}">${esc(xLabel)}</text>`;

  return svgShell(body, { title });
}

/** Horizontal bar chart */
function makeHBar({ title, categories, values, color, xLabel }) {
  const pad = { top: 52, right: 80, bottom: 50, left: 130 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const x0 = pad.left;
  const y0 = pad.top;

  const maxV = Math.max(...values) * 1.15;
  const barH = plotH / categories.length * 0.55;
  const gap = plotH / categories.length;
  const steps = 5;

  // vertical grid lines
  let body = '';
  for (let i = 0; i <= steps; i++) {
    const x = x0 + (i / steps) * plotW;
    body += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + plotH}" stroke="${C.grid}" stroke-width="1"/>`;
  }

  // axes
  body += `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + plotH}" stroke="${C.sub}" stroke-width="1.5"/>`;
  body += `<line x1="${x0}" y1="${y0 + plotH}" x2="${x0 + plotW}" y2="${y0 + plotH}" stroke="${C.sub}" stroke-width="1.5"/>`;

  // x tick labels
  for (let i = 0; i <= steps; i++) {
    const val = Math.round((maxV * i) / steps);
    const x = x0 + (i / steps) * plotW;
    body += `<text x="${x}" y="${y0 + plotH + 14}" text-anchor="middle" font-size="10" fill="${C.sub}">${val}</text>`;
  }

  // bars + y labels
  categories.forEach((cat, i) => {
    const bw = (values[i] / maxV) * plotW;
    const by = y0 + i * gap + (gap - barH) / 2;
    body += `<rect x="${x0}" y="${by}" width="${bw}" height="${barH}" rx="3" fill="${color}"/>`;
    if (bw > 30) {
      body += `<text x="${x0 + bw - 5}" y="${by + barH / 2 + 4}" text-anchor="end" font-size="10" font-weight="600" fill="${C.bg}">${values[i]}</text>`;
    } else {
      body += `<text x="${x0 + bw + 5}" y="${by + barH / 2 + 4}" text-anchor="start" font-size="10" font-weight="600" fill="${C.text}">${values[i]}</text>`;
    }
    body += `<text x="${x0 - 8}" y="${by + barH / 2 + 4}" text-anchor="end" font-size="11" fill="${C.sub}">${esc(cat)}</text>`;
  });

  if (xLabel) body += `<text x="${x0 + plotW / 2}" y="${y0 + plotH + 38}" text-anchor="middle" font-size="10" fill="${C.sub}">${esc(xLabel)}</text>`;

  return svgShell(body, { title });
}

/** Line / trend chart (single or two series) */
function makeLineChart({ title, years, series, yLabel }) {
  const pad = { top: 52, right: 30, bottom: 64, left: 64 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const x0 = pad.left;
  const y0 = pad.top;

  const allVals = series.flatMap(s => s.values);
  const minV = Math.min(...allVals) * 0.85;
  const maxV = Math.max(...allVals) * 1.15;
  const steps = 5;

  const xScale = (i) => x0 + (i / (years.length - 1)) * plotW;
  const yScale = (v) => y0 + plotH - ((v - minV) / (maxV - minV)) * plotH;

  let body = hGridLines(x0, y0, plotW, plotH, steps);

  // x grid lines
  years.forEach((yr, i) => {
    const x = xScale(i);
    body += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + plotH}" stroke="${C.grid}" stroke-width="1"/>`;
  });

  // axes
  body += `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + plotH}" stroke="${C.sub}" stroke-width="1.5"/>`;
  body += `<line x1="${x0}" y1="${y0 + plotH}" x2="${x0 + plotW}" y2="${y0 + plotH}" stroke="${C.sub}" stroke-width="1.5"/>`;

  // y tick labels
  for (let i = 0; i <= steps; i++) {
    const val = minV + ((maxV - minV) * i) / steps;
    const y = y0 + plotH - (i / steps) * plotH;
    body += `<text x="${x0 - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="${C.sub}">${Math.round(val)}</text>`;
  }

  // x tick labels (years)
  years.forEach((yr, i) => {
    body += `<text x="${xScale(i)}" y="${y0 + plotH + 16}" text-anchor="middle" font-size="10" fill="${C.sub}">${yr}</text>`;
  });

  // series lines + dots
  series.forEach(s => {
    const pts = s.values.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');
    body += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    s.values.forEach((v, i) => {
      body += `<circle cx="${xScale(i)}" cy="${yScale(v)}" r="4" fill="${s.color}" stroke="${C.bg}" stroke-width="1.5"/>`;
    });
  });

  if (yLabel) body += `<text x="${x0 - 50}" y="${y0 + plotH / 2}" text-anchor="middle" font-size="10" fill="${C.sub}" transform="rotate(-90,${x0 - 50},${y0 + plotH / 2})">${esc(yLabel)}</text>`;

  // legend if multi-series
  if (series.length > 1) {
    const legX = x0 + plotW / 2 - (series.length * 110) / 2;
    body += legend(series.map(s => ({ label: s.label, color: s.color })), legX, y0 + plotH + 46);
  }

  return svgShell(body, { title });
}

/** Grouped bar chart (two series side by side) */
function makeGroupedBar({ title, categories, series, yLabel }) {
  const pad = { top: 52, right: 30, bottom: 76, left: 62 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const x0 = pad.left;
  const y0 = pad.top;

  const allVals = series.flatMap(s => s.values);
  const maxV = Math.max(...allVals) * 1.18;
  const steps = 5;
  const groupW = plotW / categories.length;
  const nSeries = series.length;
  const barW = groupW * 0.7 / nSeries;
  const groupGap = groupW * 0.15;

  let body = hGridLines(x0, y0, plotW, plotH, steps);

  // axes
  body += `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + plotH}" stroke="${C.sub}" stroke-width="1.5"/>`;
  body += `<line x1="${x0}" y1="${y0 + plotH}" x2="${x0 + plotW}" y2="${y0 + plotH}" stroke="${C.sub}" stroke-width="1.5"/>`;

  // y tick labels
  for (let i = 0; i <= steps; i++) {
    const val = Math.round((maxV * i) / steps);
    const y = y0 + plotH - (i / steps) * plotH;
    body += `<text x="${x0 - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="${C.sub}">${val}</text>`;
  }

  // bars
  categories.forEach((cat, gi) => {
    const gx = x0 + gi * groupW + groupGap;
    series.forEach((s, si) => {
      const bh = (s.values[gi] / maxV) * plotH;
      const bx = gx + si * barW;
      const by = y0 + plotH - bh;
      body += `<rect x="${bx}" y="${by}" width="${barW - 2}" height="${bh}" rx="2" fill="${s.color}"/>`;
      if (bh > 18) {
        body += `<text x="${bx + (barW - 2) / 2}" y="${by - 4}" text-anchor="middle" font-size="9" font-weight="600" fill="${C.text}">${s.values[gi]}</text>`;
      }
    });
    body += `<text x="${gx + (barW * nSeries) / 2}" y="${y0 + plotH + 16}" text-anchor="middle" font-size="10" fill="${C.sub}">${esc(cat)}</text>`;
  });

  if (yLabel) body += `<text x="${x0 - 48}" y="${y0 + plotH / 2}" text-anchor="middle" font-size="10" fill="${C.sub}" transform="rotate(-90,${x0 - 48},${y0 + plotH / 2})">${esc(yLabel)}</text>`;

  // legend
  const legX = x0 + plotW / 2 - (series.length * 110) / 2;
  body += legend(series.map(s => ({ label: s.label, color: s.color })), legX, y0 + plotH + 46);

  return svgShell(body, { title });
}

/** Donut chart with legend + percentage labels */
function makeDonut({ title, slices }) {
  const cx = 200;
  const cy = H / 2 + 8;
  const R = 105;
  const r = 55;

  const total = slices.reduce((s, x) => s + x.value, 0);
  let startAngle = -Math.PI / 2;

  let paths = '';
  let labels = '';

  slices.forEach(sl => {
    const sweep = (sl.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sweep;

    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const xi1 = cx + r * Math.cos(startAngle);
    const yi1 = cy + r * Math.sin(startAngle);
    const xi2 = cx + r * Math.cos(endAngle);
    const yi2 = cy + r * Math.sin(endAngle);
    const largeArc = sweep > Math.PI ? 1 : 0;

    paths += `<path d="M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${r} ${r} 0 ${largeArc} 0 ${xi1} ${yi1} Z" fill="${sl.color}"/>`;

    // label on slice mid-angle
    const mid = startAngle + sweep / 2;
    const lx = cx + (R + r) / 2 * Math.cos(mid);
    const ly = cy + (R + r) / 2 * Math.sin(mid);
    const pct = Math.round((sl.value / total) * 100);
    if (pct >= 5) {
      labels += `<text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${C.bg}">${pct}%</text>`;
    }

    startAngle = endAngle;
  });

  // Center label
  const center = `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="11" fill="${C.sub}">Total</text>
  <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="16" font-weight="700" fill="${C.text}">${total}</text>`;

  // Legend (right side)
  const legX = 345;
  const legStartY = cy - (slices.length * 22) / 2 + 6;
  let leg = '';
  slices.forEach((sl, i) => {
    const ly = legStartY + i * 24;
    const pct = Math.round((sl.value / total) * 100);
    leg += `<rect x="${legX}" y="${ly - 9}" width="13" height="13" rx="2" fill="${sl.color}"/>`;
    leg += `<text x="${legX + 18}" y="${ly + 1}" font-size="11" fill="${C.sub}">${esc(sl.label)}</text>`;
    leg += `<text x="${legX + 220}" y="${ly + 1}" text-anchor="end" font-size="11" font-weight="600" fill="${C.text}">${pct}%</text>`;
  });

  const body = paths + labels + center + leg;
  return svgShell(body, { title });
}

/** SVG-drawn data table with zebra striping */
function makeTable({ title, headers, rows, colWidths }) {
  const pad = { top: 48, left: 28, right: 28 };
  const tableW = W - pad.left - pad.right;
  const rowH = 28;
  const headerH = 30;
  const tableX = pad.left;
  const tableY = pad.top + 4;

  // Total column widths
  const totalCW = colWidths.reduce((a, b) => a + b, 0);
  const scale = tableW / totalCW;
  const scaledCW = colWidths.map(cw => cw * scale);

  let body = '';

  // Header row background
  body += `<rect x="${tableX}" y="${tableY}" width="${tableW}" height="${headerH}" rx="3" fill="${C.blue}"/>`;

  // Column x positions
  const colX = [];
  let cx = tableX;
  scaledCW.forEach(cw => { colX.push(cx); cx += cw; });

  // Header text
  headers.forEach((h, i) => {
    const textX = i === 0 ? colX[i] + 10 : colX[i] + scaledCW[i] / 2;
    const anchor = i === 0 ? 'start' : 'middle';
    body += `<text x="${textX}" y="${tableY + headerH / 2 + 5}" text-anchor="${anchor}" font-size="11" font-weight="700" fill="${C.bg}">${esc(h)}</text>`;
  });

  // Data rows
  rows.forEach((row, ri) => {
    const ry = tableY + headerH + ri * rowH;
    const fill = ri % 2 === 0 ? C.bg : C.zebra;
    body += `<rect x="${tableX}" y="${ry}" width="${tableW}" height="${rowH}" fill="${fill}"/>`;
    row.forEach((cell, ci) => {
      const textX = ci === 0 ? colX[ci] + 10 : colX[ci] + scaledCW[ci] / 2;
      const anchor = ci === 0 ? 'start' : 'middle';
      const isBold = ci === 0;
      body += `<text x="${textX}" y="${ry + rowH / 2 + 5}" text-anchor="${anchor}" font-size="11" font-weight="${isBold ? '600' : '400'}" fill="${isBold ? C.text : C.sub}">${esc(String(cell))}</text>`;
    });
  });

  // Table border + row dividers
  const totalH = headerH + rows.length * rowH;
  body += `<rect x="${tableX}" y="${tableY}" width="${tableW}" height="${totalH}" fill="none" stroke="${C.border}" stroke-width="1" rx="3"/>`;
  // row dividers
  rows.forEach((_, ri) => {
    const ry = tableY + headerH + ri * rowH;
    body += `<line x1="${tableX}" y1="${ry}" x2="${tableX + tableW}" y2="${ry}" stroke="${C.border}" stroke-width="1"/>`;
  });
  // column dividers
  colX.slice(1).forEach(x => {
    body += `<line x1="${x}" y1="${tableY}" x2="${x}" y2="${tableY + totalH}" stroke="${C.border}" stroke-width="1"/>`;
  });

  return svgShell(body, { title });
}

// ─── Figure definitions ───────────────────────────────────────────────────────

const FIGURES = [];

// ── Vertical bar charts (3) ──────────────────────────────────────────────────
FIGURES.push({
  name: 'figure-bar-01.svg',
  svg: makeVertBar({
    title: 'Figure 1 — Incident Count by Category (2023)',
    categories: ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'],
    values: [312, 487, 204, 389, 156],
    color: C.blue,
    yLabel: 'Count',
    xLabel: 'Category',
  }),
});

FIGURES.push({
  name: 'figure-bar-02.svg',
  svg: makeVertBar({
    title: 'Figure 2 — Percentage of Cases by Classification',
    categories: ['Class I', 'Class II', 'Class III', 'Class IV'],
    values: [28, 41, 19, 12],
    color: C.teal,
    yLabel: 'Percent (%)',
    xLabel: 'Classification',
  }),
});

FIGURES.push({
  name: 'figure-bar-03.svg',
  svg: makeVertBar({
    title: 'Figure 3 — Program Enrollment by Cohort Year',
    categories: ['2020', '2021', '2022', '2023', '2024'],
    values: [143, 198, 227, 261, 289],
    color: C.violet,
    yLabel: 'Enrolled Participants',
    xLabel: 'Cohort Year',
  }),
});

// ── Horizontal bar charts (2) ────────────────────────────────────────────────
FIGURES.push({
  name: 'figure-hbar-01.svg',
  svg: makeHBar({
    title: 'Figure 4 — Ranked Frequency by Subgroup (n = 1,204)',
    categories: ['Subgroup F', 'Subgroup E', 'Subgroup D', 'Subgroup C', 'Subgroup B', 'Subgroup A'],
    values: [87, 134, 178, 221, 305, 412],
    color: C.teal,
    xLabel: 'Frequency',
  }),
});

FIGURES.push({
  name: 'figure-hbar-02.svg',
  svg: makeHBar({
    title: 'Figure 5 — Average Score by Region',
    categories: ['Region G', 'Region F', 'Region E', 'Region D', 'Region C', 'Region B', 'Region A'],
    values: [51, 63, 71, 74, 80, 88, 94],
    color: C.amber,
    xLabel: 'Mean Score (0–100)',
  }),
});

// ── Line / trend charts (2) ──────────────────────────────────────────────────
const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];

FIGURES.push({
  name: 'figure-line-01.svg',
  svg: makeLineChart({
    title: 'Figure 6 — Annual Rate per 1,000 (2018–2024)',
    years: YEARS,
    series: [
      { label: 'Rate', color: C.blue, values: [14.2, 15.8, 13.1, 16.4, 18.0, 19.3, 20.7] },
    ],
    yLabel: 'Rate per 1,000',
  }),
});

FIGURES.push({
  name: 'figure-line-02.svg',
  svg: makeLineChart({
    title: 'Figure 7 — Outcome Trends: Group 1 vs. Group 2 (2018–2024)',
    years: YEARS,
    series: [
      { label: 'Group 1', color: C.blue,  values: [62, 65, 60, 68, 72, 75, 79] },
      { label: 'Group 2', color: C.red,   values: [48, 51, 49, 54, 58, 56, 61] },
    ],
    yLabel: 'Mean Outcome Score',
  }),
});

// ── Grouped bar chart (1) ────────────────────────────────────────────────────
FIGURES.push({
  name: 'figure-grouped-01.svg',
  svg: makeGroupedBar({
    title: 'Figure 8 — Series A vs. Series B by Reporting Period',
    categories: ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023'],
    series: [
      { label: 'Series A', color: C.blue,  values: [124, 158, 143, 172] },
      { label: 'Series B', color: C.amber, values: [98,  112, 131, 149] },
    ],
    yLabel: 'Count',
  }),
});

// ── Donut chart (1) ──────────────────────────────────────────────────────────
FIGURES.push({
  name: 'figure-donut-01.svg',
  svg: makeDonut({
    title: 'Figure 9 — Distribution of Cases by Type (n = 1,480)',
    slices: [
      { label: 'Type Alpha',   value: 518, color: C.blue },
      { label: 'Type Beta',    value: 341, color: C.teal },
      { label: 'Type Gamma',   value: 296, color: C.amber },
      { label: 'Type Delta',   value: 207, color: C.violet },
      { label: 'Type Epsilon', value: 118, color: C.red },
    ],
  }),
});

// ── Data tables (2) ──────────────────────────────────────────────────────────
FIGURES.push({
  name: 'figure-table-01.svg',
  svg: makeTable({
    title: 'Table 1 — Summary Statistics by Subgroup',
    headers: ['Subgroup', 'n', 'Mean (SD)', 'Median', '95% CI'],
    colWidths: [110, 50, 90, 70, 90],
    rows: [
      ['Group Alpha',   '312', '24.7 (6.1)', '23.4', '23.8 – 25.6'],
      ['Group Beta',    '284', '31.2 (8.4)', '30.0', '30.1 – 32.3'],
      ['Group Gamma',   '198', '19.3 (5.2)', '18.7', '18.5 – 20.1'],
      ['Group Delta',   '267', '27.8 (7.0)', '26.9', '26.9 – 28.7'],
      ['Group Epsilon', '143', '22.5 (5.8)', '21.8', '21.5 – 23.5'],
    ],
  }),
});

FIGURES.push({
  name: 'figure-table-02.svg',
  svg: makeTable({
    title: 'Table 2 — Annual Counts and Rates by Reporting Year',
    headers: ['Year', 'Total Cases', 'Rate /1k', 'Δ YoY (%)'],
    colWidths: [70, 100, 90, 100],
    rows: [
      ['2019', '1,047', '14.8', '+4.2%'],
      ['2020', '   891', '12.6', '−14.8%'],
      ['2021', '1,132', '16.0', '+27.0%'],
      ['2022', '1,284', '18.1', '+13.0%'],
      ['2023', '1,408', '19.9', '+9.7%'],
      ['2024', '1,521', '21.5', '+8.0%'],
    ],
  }),
});

// ─── Write files ──────────────────────────────────────────────────────────────

let totalBytes = 0;
const results = [];

for (const fig of FIGURES) {
  const dest = join(OUT_DIR, fig.name);
  writeFileSync(dest, fig.svg, 'utf8');
  const bytes = Buffer.byteLength(fig.svg, 'utf8');
  totalBytes += bytes;
  results.push({ name: fig.name, bytes });
  console.log(`  ✓  ${fig.name}  (${bytes.toLocaleString()} B)`);
}

console.log(`\n${results.length} figures written to ${OUT_DIR}`);
console.log(`Total: ${totalBytes.toLocaleString()} bytes\n`);

// ─── Verify SVGs ─────────────────────────────────────────────────────────────
let allOk = true;
for (const fig of FIGURES) {
  const ok = fig.svg.trim().startsWith('<svg') && fig.svg.trim().endsWith('</svg>');
  if (!ok) {
    console.error(`  ✗  MALFORMED: ${fig.name}`);
    allOk = false;
  }
}
if (allOk) console.log('Verification: all SVGs start with <svg and end with </svg> ✓\n');

// Spot-check two SVGs (first 200 chars each)
console.log('Spot-check — figure-bar-01.svg (first 200 chars):');
console.log(FIGURES.find(f => f.name === 'figure-bar-01.svg').svg.slice(0, 200));
console.log('\nSpot-check — figure-donut-01.svg (first 200 chars):');
console.log(FIGURES.find(f => f.name === 'figure-donut-01.svg').svg.slice(0, 200));
