const EDGE_MARKERS = [
  { id: 'ah', color: '#64748b' },
  { id: 'ah-signal', color: '#7c3aed' },
  { id: 'ah-state', color: '#059669' },
  { id: 'ah-red', color: '#e11d48' },
  { id: 'ah-flag', color: '#2563eb' },
]

const buildMarkerDefs = prefix =>
  EDGE_MARKERS.map(
    marker =>
      `<marker id="${prefix}${marker.id}" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto"><polygon points="0 0, 7 2.5, 0 5" fill="${marker.color}" /></marker>`,
  ).join('')

const buildRuntimeScript = ({ width, height }) => `(() => {
  const wrapper = document.querySelector('.wrapper');
  const canvas = document.querySelector('.canvas');
  if (!wrapper || !canvas) return;

  let resizeFrame = 0;
  const resize = () => {
    resizeFrame = 0;
    const scale = Math.min(wrapper.clientWidth / ${width}, 1);
    canvas.style.transform = 'scale(' + scale + ')';
    wrapper.style.height = (${height} * scale) + 'px';
  };

  const scheduleResize = () => {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(resize);
  };

  const nodes = Array.from(document.querySelectorAll('.architecture-node'));
  const nodeMap = new Map(nodes.map(node => [node.dataset.nodeId, node]));
  const edgeRelations = new Map();

  const ensureRelation = nodeId => {
    if (!nodeId) return null;
    if (!edgeRelations.has(nodeId)) {
      edgeRelations.set(nodeId, { nodes: new Set([nodeId]), edges: [] });
    }
    return edgeRelations.get(nodeId);
  };

  document.querySelectorAll('.node-edge').forEach(edge => {
    const from = edge.dataset.from;
    const to = edge.dataset.to;
    const fromRelation = ensureRelation(from);
    const toRelation = ensureRelation(to);
    if (fromRelation) {
      fromRelation.edges.push(edge);
      if (to) fromRelation.nodes.add(to);
    }
    if (toRelation) {
      toRelation.edges.push(edge);
      if (from) toRelation.nodes.add(from);
    }
  });

  let activeNodeId = null;

  const clearSelection = () => {
    if (!activeNodeId && !canvas.classList.contains('has-selection')) return;
    activeNodeId = null;
    canvas.classList.remove('has-selection');
    nodes.forEach(node => node.classList.remove('active', 'related'));
    document
      .querySelectorAll('.node-edge.active')
      .forEach(edge => edge.classList.remove('active'));
  };

  const selectNode = nodeId => {
    if (!nodeId) return;
    if (activeNodeId === nodeId) {
      clearSelection();
      return;
    }

    clearSelection();
    activeNodeId = nodeId;
    canvas.classList.add('has-selection');

    const relation = edgeRelations.get(nodeId) || { nodes: new Set([nodeId]), edges: [] };
    relation.nodes.add(nodeId);

    relation.edges.forEach(edge => edge.classList.add('active'));
    relation.nodes.forEach(relatedNodeId => {
      const node = nodeMap.get(relatedNodeId);
      if (!node) return;
      node.classList.add(relatedNodeId === nodeId ? 'active' : 'related');
    });
  };

  canvas.addEventListener('click', event => {
    const node = event.target.closest('.architecture-node');
    if (!node) {
      clearSelection();
      return;
    }
    selectNode(node.dataset.nodeId);
  });

  nodes.forEach(node => {
    node.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      selectNode(node.dataset.nodeId);
    });
  });

  window.addEventListener('resize', scheduleResize);
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(scheduleResize).observe(wrapper);
  }
  resize();
})();`

export const buildArchitectureHtml = ({
  W,
  H,
  maxWidth,
  headerTop,
  headerLeft,
  phaseTop,
  marginX,
  securityY,
  legendY,
  securityHeight,
  language,
  pageTitle,
  headerTitle,
  headerSubtitle,
  phaseBandTitle,
  phaseHtml,
  groupEdgeSvg,
  nodeEdgeSvg,
  leftNodesHtml,
  topEnclosure,
  topEnclosureLabel,
  topClustersHtml,
  rightNodesHtml,
  mechanismHtml,
  substrateEnclosure,
  substrateLabel,
  substrateNodesHtml,
  notePanelsHtml,
  annotationsHtml,
  securityTitle,
  securityHtml,
  legendHtml,
}) => `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pageTitle}</title>
<style>
  :root {
    --bg-page: oklch(0.964 0.008 258);
    --bg-page-accent: oklch(0.93 0.018 320);
    --bg: oklch(0.988 0.003 255);
    --bg-panel: color-mix(in oklab, var(--bg) 90%, oklch(0.95 0.012 290));
    --bg-box: color-mix(in oklab, white 91%, oklch(0.93 0.008 272));
    --bg-source: oklch(0.978 0.004 255);
    --bg-dashed: oklch(0.974 0.006 260);
    --bg-state: oklch(0.973 0.02 150);
    --bg-flagged: oklch(0.972 0.018 255);
    --bg-loop: oklch(0.974 0.024 350);
    --border: oklch(0.83 0.012 270);
    --border-strong: oklch(0.69 0.022 280);
    --border-source: oklch(0.8 0.02 250);
    --text: oklch(0.27 0.018 268);
    --text-dim: oklch(0.47 0.014 266);
    --text-tech: oklch(0.58 0.012 260);
    --text-metric: oklch(0.48 0.1 278);
    --text-soft: oklch(0.64 0.01 260);
    --shadow-soft: 0 18px 48px rgba(47, 45, 66, 0.08);
    --shadow-card: 0 8px 20px rgba(47, 45, 66, 0.06);
    --focus: oklch(0.63 0.12 285);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { min-height: 100%; }
  body {
    background:
      radial-gradient(circle at top left, rgba(146, 126, 178, 0.14), transparent 28%),
      radial-gradient(circle at top right, rgba(184, 150, 122, 0.1), transparent 24%),
      radial-gradient(circle at bottom right, rgba(123, 124, 156, 0.08), transparent 28%),
      linear-gradient(180deg, var(--bg-page), color-mix(in oklab, var(--bg-page) 76%, white));
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    padding: 28px;
    color: var(--text);
    font-family: 'Avenir Next', 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  }
  .wrapper { width: 100%; max-width: ${maxWidth}px; }
  .canvas {
    width: ${W}px;
    height: ${H}px;
    position: relative;
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 247, 251, 0.96)),
      var(--bg);
    border-radius: 24px;
    border: 1px solid rgba(155, 156, 182, 0.24);
    transform-origin: top left;
    box-shadow: var(--shadow-soft);
  }
  .canvas::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(90deg, rgba(120, 100, 68, 0.04) 1px, transparent 1px),
      linear-gradient(rgba(120, 100, 68, 0.03) 1px, transparent 1px);
    background-size: 44px 44px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.14), transparent 55%);
    opacity: 0.55;
  }
  .canvas::after {
    content: '';
    position: absolute;
    inset: 16px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.6);
    pointer-events: none;
  }
  .header-block {
    position: absolute;
    z-index: 9;
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  .header-title {
    font-family: 'Iowan Old Style', 'Palatino Linotype', 'Songti SC', serif;
    font-size: 19px;
    line-height: 1;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: oklch(0.24 0.018 268);
  }
  .header-subtitle {
    font-size: 12px;
    line-height: 1.3;
    letter-spacing: 0.02em;
    color: var(--text-dim);
  }
  .phase-title,
  .security-title {
    color: var(--text-soft);
    font-size: 9px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-weight: 700;
  }
  .phase-band {
    position: absolute;
    z-index: 7;
    display: flex;
    gap: 8px;
  }
  .box {
    position: absolute;
    z-index: 6;
    border: 1.5px solid var(--border);
    border-radius: 11px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(249, 249, 252, 0.98));
    color: var(--text);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    text-align: center;
    line-height: 1.35;
    padding: 5px 14px;
    box-shadow: var(--shadow-card);
    transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease, background 150ms ease, opacity 140ms ease;
    cursor: pointer;
    outline: none;
  }
  .box:hover { transform: translateY(-1px); box-shadow: 0 12px 24px rgba(47, 45, 66, 0.08); }
  .box:focus-visible { box-shadow: 0 0 0 3px color-mix(in oklab, var(--focus) 26%, transparent), var(--shadow-card); border-color: var(--focus); }
  .box.source {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), color-mix(in oklab, white 88%, var(--bg-source)));
    border-color: var(--border-source);
    box-shadow: 0 6px 16px rgba(47, 45, 66, 0.045);
  }
  .box.dashed { border-style: dashed; border-color: color-mix(in oklab, var(--border) 74%, oklch(0.84 0.015 265)); background: var(--bg-dashed); font-weight: 500; box-shadow: none; }
  .box.flagged { border-color: oklch(0.72 0.03 30); background: var(--bg-flagged); }
  .box.loop-accent { border-color: oklch(0.68 0.08 342); background: var(--bg-loop); }
  .box.state { border-color: oklch(0.79 0.035 96); background: var(--bg-state); }
  .architecture-node.active { border-color: var(--focus) !important; box-shadow: 0 0 0 3px rgba(71, 122, 255, 0.16), 0 18px 34px rgba(57, 93, 182, 0.12); background: color-mix(in oklab, white 68%, oklch(0.94 0.035 247)); }
  .architecture-node.related { border-color: color-mix(in oklab, var(--focus) 72%, white); box-shadow: 0 0 0 2px rgba(96,165,250,0.12); }
  .canvas.has-selection .architecture-node:not(.active):not(.related) { opacity: 0.55; }
  .node-title { font-size: 13.4px; line-height: 1.28; font-weight: 600; letter-spacing: 0.01em; }
  .sub { font-size: 10px; color: var(--text-dim); font-weight: 400; margin-top: 3px; }
  .tech { font-size: 9px; color: color-mix(in oklab, var(--text-tech) 78%, white 22%); font-weight: 400; margin-top: 2px; letter-spacing: normal; text-transform: none; }
  .metric { font-size: 9.5px; color: var(--text-metric); font-weight: 600; margin-top: 3px; }
  .flag-badge { position: absolute; top: -7px; right: 10px; font-size: 7px; font-weight: 700; padding: 1px 6px; border-radius: 6px; letter-spacing: 0.08em; text-transform: uppercase; color: #6f5b4b; background: #f4efe7; border: 1px solid #d4c9ba; }
  .group { position: absolute; z-index: 2; border: 1.5px dashed color-mix(in oklab, var(--border) 78%, oklch(0.82 0.012 292)); border-radius: 18px; background: linear-gradient(180deg, rgba(249, 249, 253, 0.62), rgba(246, 246, 250, 0.42)); }
  .group.flagged-group { border-color: #d4c9ba; background: linear-gradient(180deg, rgba(247, 244, 239, 0.62), rgba(244, 239, 233, 0.42)); }
  .tag {
    position: absolute;
    z-index: 8;
    top: -11px;
    left: 18px;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--tag-accent, var(--text-dim));
    background: color-mix(in oklab, white 86%, var(--tag-accent, var(--bg))) !important;
    box-shadow: 0 3px 10px rgba(47, 45, 66, 0.06);
    padding: 3px 10px 4px;
    border-radius: 999px;
    border: 1px solid color-mix(in oklab, var(--tag-accent, var(--border-strong)) 24%, white 76%);
    text-align: left;
  }
  .enclosure { position: absolute; z-index: 1; border: 1px solid rgba(165, 165, 187, 0.28); border-radius: 20px; background: rgba(248, 248, 252, 0.42); }
  .enclosure.substrate { border-color: rgba(165, 154, 124, 0.32); background: rgba(247, 245, 238, 0.36); }
  .enclosure-label { position: absolute; z-index: 8; color: var(--text-soft); font-size: 9px; font-weight: 600; letter-spacing: 0.08em; font-family: 'SF Mono', 'Menlo', 'Consolas', monospace; text-transform: uppercase; }
  .enclosure-detail { position: absolute; z-index: 8; color: var(--text-soft); font-size: 9px; font-weight: 500; letter-spacing: 0.03em; }
  .spectrum-seg {
    flex: 1;
    text-align: left;
    color: var(--text-dim);
    font-size: 10.5px;
    letter-spacing: 0.02em;
    padding: 9px 12px 0;
    border-top: 1px solid rgba(160, 160, 184, 0.22);
    position: relative;
    background: rgba(255, 255, 255, 0.16);
  }
  .spectrum-seg::before, .spectrum-seg::after { content: ''; position: absolute; top: -1px; width: 1px; height: 7px; background: rgba(160, 160, 184, 0.22); }
  .spectrum-seg::before { left: 0; }
  .spectrum-seg::after { right: 0; }
  .spectrum-label { font-size: 8.5px; color: color-mix(in oklab, var(--text-soft) 84%, white 16%); margin-top: 2px; }
  .legend {
    position: absolute;
    z-index: 8;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
    max-width: min(720px, calc(100% - 120px));
    padding: 8px 12px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.44);
    border: 1px solid rgba(165, 165, 187, 0.18);
    backdrop-filter: blur(8px);
  }
  .legend-item { display: flex; align-items: center; gap: 6px; color: var(--text-soft); font-size: 9px; white-space: nowrap; }
  .legend-line { width: 22px; height: 0; }
  .legend-box-flagged { width: 12px; height: 12px; border: 1.5px solid #cfc4b8; background: var(--bg-flagged); border-radius: 3px; }
  .note {
    position: absolute;
    z-index: 8;
    font-size: 8.5px;
    color: var(--text-soft);
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    letter-spacing: 0.03em;
    line-height: 1.55;
  }
  .note-panel {
    position: absolute;
    z-index: 8;
    padding: 14px 16px;
    border: 1px solid rgba(165, 165, 187, 0.28);
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(247, 246, 241, 0.78));
    box-shadow: 0 12px 24px rgba(35, 32, 25, 0.05);
    backdrop-filter: blur(8px);
    overflow: hidden;
  }
  .note-panel::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 2px;
    background: color-mix(in oklab, var(--panel-accent, oklch(0.6 0.08 210)) 62%, white 38%);
    opacity: 0.9;
  }
  .note-panel-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 8px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .note-panel-body {
    font-size: 9.5px;
    color: var(--text-dim);
    line-height: 1.65;
  }
  .note-panel-item { margin-bottom: 5px; }
  .note-panel-item:last-child { margin-bottom: 0; }
  .note-panel-lead { font-weight: 700; }
  .note-panel-footnote { font-size: 8.5px; color: var(--text-soft); margin-top: 6px; }
  .security-shell {
    position: absolute;
    z-index: 8;
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 10px 12px 0;
    border-top: 1px solid rgba(165, 165, 187, 0.24);
  }
  .security-track { flex: 1; display: flex; height:${securityHeight}px; }
  .security-segment {
    position: relative;
    text-align: center;
    font-size: 9.5px;
    color: var(--text-dim);
    border-top: 1px solid rgba(165, 165, 187, 0.24);
    padding-top: 6px;
  }
  .security-segment::before,
  .security-segment::after {
    content: '';
    position: absolute;
    top: -1px;
    width: 1px;
    height: 5px;
    background: rgba(165, 165, 187, 0.24);
  }
  .security-segment::before { left: 0; }
  .security-segment::after { right: 0; }
  .security-detail { font-size: 7.5px; color: var(--text-soft); }
  .edge-layer { position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; }
  .edge-layer.group-layer { z-index: 4; }
  .edge-layer.node-layer { z-index: 5; }
  .edge-path { fill:none; stroke-linecap:round; stroke-linejoin:round; transition: opacity 140ms ease, stroke-width 140ms ease; }
  .group-edge { opacity: 0.92; }
  .node-edge { opacity: 0; }
  .canvas.has-selection .group-edge { opacity: 0; }
  .canvas.has-selection .node-edge.active { opacity: 0.98; stroke-width: 2.2px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="canvas">
    <div class="header-block" style="top:${headerTop}px; left:${headerLeft}px">
      <div class="header-title">${headerTitle}</div>
      <div class="header-subtitle">${headerSubtitle}</div>
    </div>
    <div class="phase-title" style="position:absolute; top:20px; right:${marginX}px">${phaseBandTitle}</div>
    <div class="phase-band" style="top:${phaseTop}px; left:${marginX}px; right:${marginX}px">${phaseHtml}</div>
    <svg class="edge-layer group-layer" viewBox="0 0 ${W} ${H}">
      <defs>${buildMarkerDefs('')}</defs>
      ${groupEdgeSvg}
    </svg>
    <svg class="edge-layer node-layer" viewBox="0 0 ${W} ${H}">
      <defs>${buildMarkerDefs('n')}</defs>
      ${nodeEdgeSvg}
    </svg>
    ${leftNodesHtml}
    ${topEnclosure}
    ${topEnclosureLabel}
    ${topClustersHtml}
    ${rightNodesHtml}
    ${mechanismHtml}
    ${substrateEnclosure}
    ${substrateLabel}
    ${substrateNodesHtml}
    ${notePanelsHtml}
    ${annotationsHtml}
    <div class="security-shell" style="top:${securityY}px; left:${marginX}px; right:${marginX}px">
      <div class="security-title">${securityTitle}</div>
      <div class="security-track">${securityHtml}</div>
    </div>
    <div class="legend" style="top:${legendY}px; right:${marginX}px">${legendHtml}</div>
  </div>
</div>
<script>${buildRuntimeScript({ width: W, height: H })}</script>
</body>
</html>`
