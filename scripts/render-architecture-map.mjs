import fs from 'node:fs'
import path from 'node:path'
import { buildArchitectureHtml } from './render-architecture-html-template.mjs'
import {
  alignedSidePortPoint,
  clamp,
  countTurns,
  createOrthogonalRouter,
  movementDir,
  outwardPointFromAnchor,
  pathClear,
  sidePortPoint,
  simplifyPoints,
  uniqueSorted,
} from './routing/orthogonal-routing.mjs'

const [, , inputPath, outputPathArg] = process.argv

if (!inputPath) {
  console.error('Usage: node render-architecture-map.mjs <poster-json> [output-html]')
  process.exit(1)
}

const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const outputPath =
  outputPathArg ||
  path.join(
    path.dirname(inputPath),
    path.basename(inputPath, path.extname(inputPath)) + '.html',
  )

const W = 1500

const PAGE = {
  marginX: 40,
  headerTop: 22,
  phaseTop: 52,
  phaseBottomGap: 34,
  sectionGap: 42,
  footerGap: 28,
}

const LAYOUT = {
  leftColumnW: 150,
  leftToCenterGap: 54,
  centerToRightGap: 46,
  rightColumnW: 180,
  rightToNoteGap: 24,
  notePanelW: 320,
  notePanelGap: 16,
  nodeGap: 8,
  outerNodeGap: 14,
  groupPadX: 16,
  groupPadTop: 44,
  groupPadBottom: 16,
  groupTitleOffset: 10,
  enclosurePad: 10,
  mechanismGap: 42,
  substrateGap: 24,
  substrateRowGap: 18,
  securityHeight: 32,
}

const colorMap = {
  teal: '#059669',
  red: '#e11d48',
  green: '#16a34a',
  orange: '#2563eb',
  blue: '#2563eb',
  yellow: '#7c3aed',
  violet: '#7c3aed',
  slate: '#64748b',
  rose: '#e11d48',
  pink: '#a855f7',
}

const softenColor = (hex, alpha = 0.16) => {
  if (!hex) return `rgba(100, 116, 139, ${alpha})`
  const value = hex.replace('#', '')
  if (value.length !== 6) return `rgba(100, 116, 139, ${alpha})`
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const edgeStyleMap = {
  solid: { stroke: '#64748b', dash: '', marker: 'ah', width: 1.4 },
  signal: { stroke: '#7c3aed', dash: '4,3', marker: 'ah-signal', width: 1.15 },
  state: { stroke: '#059669', dash: '3,3', marker: 'ah-state', width: 1.1 },
  loop: { stroke: '#e11d48', dash: '6,3', marker: 'ah-red', width: 1.4 },
  flag: { stroke: '#2563eb', dash: '5,3', marker: 'ah-flag', width: 1.15 },
}

const escapeHtml = value =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const countTextUnits = value =>
  String(value ?? '').split('').reduce((sum, ch) => {
    if (/\s/.test(ch)) return sum + 0.45
    if (/[A-Z]/.test(ch)) return sum + 1.08
    if (/[a-z0-9/_|.-]/.test(ch)) return sum + 0.95
    if (ch.charCodeAt(0) > 255) return sum + 1.75
    return sum + 1
  }, 0)

const estimateLines = (text, width, fontSize) => {
  if (!text) return 0
  const usableWidth = Math.max(width, 40)
  const charsPerLine = usableWidth / (fontSize * 0.58)
  return Math.max(1, Math.ceil(countTextUnits(text) / charsPerLine))
}

const autoNodeHeight = (node, width) => {
  const textWidth = Math.max(60, width - 28)
  const titleLines = estimateLines(node.title, textWidth, 13)
  const detailLines = estimateLines(node.detail, textWidth, 10)
  const techLines = estimateLines(node.tech, textWidth, 9.5)
  const metricLines = estimateLines(node.metric, textWidth, 9.5)
  const contentHeight =
    titleLines * 17 +
    detailLines * 12 +
    techLines * 11 +
    metricLines * 11
  const extraGaps =
    (node.detail ? 3 : 0) + (node.tech ? 3 : 0) + (node.metric ? 3 : 0)
  return Math.max(48, Math.ceil(contentHeight + extraGaps + 16))
}

const notePanelHeight = panel => {
  const titleHeight = 18
  const itemsHeight = (panel.items || []).reduce((sum, item) => {
    const leadText = `${item.lead || ''} ${item.text || ''}`.trim()
    const lines = estimateLines(leadText, LAYOUT.notePanelW - 38, 9.5)
    return sum + lines * 14 + 4
  }, 0)
  const footnoteHeight = panel.footnote
    ? estimateLines(panel.footnote, LAYOUT.notePanelW - 38, 8.5) * 11 + 6
    : 0
  return Math.max(84, titleHeight + itemsHeight + footnoteHeight + 20)
}

const nodeClass = node => {
  switch (node.style) {
    case 'source':
      return 'box source'
    case 'dashed':
      return 'box dashed'
    case 'flagged':
      return 'box flagged'
    case 'state':
      return 'box state'
    case 'accent':
      return 'box loop-accent'
    default:
      return 'box'
  }
}

const nodeBorderColor = node => {
  switch (node.style) {
    case 'primary':
      return node.accentColor || ''
    case 'accent':
      return '#fb7185'
    case 'flagged':
      return '#f59e0b'
    case 'state':
      return '#a7f3d0'
    default:
      return ''
  }
}

const leftNodes = input.left_column?.nodes || []
const rightNodes = input.right_column?.nodes || []
const topClusters = input.top_clusters || []
const mechanismClusters = input.mechanism_clusters || []
const substrateNodes = input.substrate?.nodes || []
const notePanels = input.note_panels || []
const annotations = input.annotations || []
const legendItems = input.legend || []
const edges = input.edges || []

const positions = new Map()
const zones = new Map()
const clusterFrameById = new Map()
const nodeToClusterId = new Map()

const centerX = PAGE.marginX + LAYOUT.leftColumnW + LAYOUT.leftToCenterGap
const noteX = W - PAGE.marginX - LAYOUT.notePanelW
const rightColumnX = noteX - LAYOUT.rightToNoteGap - LAYOUT.rightColumnW
const centerW = rightColumnX - LAYOUT.centerToRightGap - centerX

const phaseSegments = input.phase_band?.segments || []
const phaseTotal = phaseSegments.reduce((sum, segment) => sum + (segment.weight || 1), 0) || 1
const phaseHtml = phaseSegments
  .map(segment => {
    const width = ((W - PAGE.marginX * 2) * (segment.weight || 1)) / phaseTotal
    return `<div class="spectrum-seg" style="width:${width}px">
        <div style="font-weight:600">${escapeHtml(segment.label)}</div>
        ${segment.detail ? `<div class="spectrum-label">${escapeHtml(segment.detail)}</div>` : ''}
      </div>`
  })
  .join('')

const phaseBottom = PAGE.phaseTop + 48
const topStartY = phaseBottom + PAGE.phaseBottomGap

const placeVerticalNodes = ({ nodes, x, y, width, gap, zone }) => {
  let cursorY = y
  nodes.forEach(node => {
    const w = node.width || width
    const h = node.height || autoNodeHeight(node, w)
    positions.set(node.id, { x, y: cursorY, w, h })
    zones.set(node.id, zone)
    cursorY += h + gap
  })
  return cursorY - gap
}

const clusterDesiredWidth = cluster => {
  const longest = Math.max(
    countTextUnits(cluster.title || ''),
    ...cluster.nodes.map(node => countTextUnits(node.title || '') * 0.92),
  )
  return Math.max(220, Math.min(420, 150 + longest * 4))
}

const buildWeightedWidths = (availableWidth, gap, clusters) => {
  if (!clusters.length) return []
  const totalGap = gap * Math.max(clusters.length - 1, 0)
  const usable = availableWidth - totalGap
  const desired = clusters.map(clusterDesiredWidth)
  const desiredSum = desired.reduce((sum, value) => sum + value, 0) || 1
  const widths = desired.map(value => Math.max(220, Math.round((value / desiredSum) * usable)))
  let diff = usable - widths.reduce((sum, value) => sum + value, 0)
  let index = 0
  while (diff !== 0 && widths.length) {
    const dir = diff > 0 ? 1 : -1
    const next = widths[index] + dir
    if (next >= 220) {
      widths[index] = next
      diff -= dir
    }
    index = (index + 1) % widths.length
  }
  return widths
}

const sortBySlot = (clusters, slots) => {
  const rank = new Map(slots.map((slot, index) => [slot, index]))
  return [...clusters].sort(
    (a, b) => (rank.get(a.slot) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.slot) ?? Number.MAX_SAFE_INTEGER),
  )
}

const topSlotOrder = ['top-left', 'top-right']
const sortedTopClusters = sortBySlot(topClusters, topSlotOrder)
const topClusterGap = 32
const topClusterWidths = buildWeightedWidths(centerW, topClusterGap, sortedTopClusters)

const topClusterFrames = []
let topClusterCursorX = centerX
sortedTopClusters.forEach((cluster, index) => {
  const frameW = topClusterWidths[index]
  const innerW = frameW - LAYOUT.groupPadX * 2
  let y = topStartY + LAYOUT.groupPadTop
  const nodeIds = []
  cluster.nodes.forEach(node => {
    const w = node.width || innerW
    const h = node.height || autoNodeHeight(node, w)
    positions.set(node.id, { x: topClusterCursorX + LAYOUT.groupPadX, y, w, h })
    zones.set(node.id, 'top')
    nodeIds.push(node.id)
    y += h + LAYOUT.nodeGap
  })
  const frameH = Math.max(120, y - topStartY - LAYOUT.nodeGap + LAYOUT.groupPadBottom)
  const frame = {
    cluster,
    x: topClusterCursorX,
    y: topStartY,
    w: frameW,
    h: frameH,
    nodeIds,
  }
  topClusterFrames.push(frame)
  positions.set(cluster.id, { x: frame.x, y: frame.y, w: frame.w, h: frame.h })
  zones.set(cluster.id, 'top')
  clusterFrameById.set(cluster.id, frame)
  nodeIds.forEach(nodeId => nodeToClusterId.set(nodeId, cluster.id))
  topClusterCursorX += frameW + topClusterGap
})

const topClustersBottom = topClusterFrames.reduce((max, frame) => Math.max(max, frame.y + frame.h), topStartY)

const leftBottom = placeVerticalNodes({
  nodes: leftNodes,
  x: PAGE.marginX,
  y: topStartY + 26,
  width: LAYOUT.leftColumnW,
  gap: LAYOUT.outerNodeGap,
  zone: 'left',
})

const rightBottom = placeVerticalNodes({
  nodes: rightNodes,
  x: rightColumnX,
  y: topStartY + 26,
  width: LAYOUT.rightColumnW,
  gap: LAYOUT.outerNodeGap,
  zone: 'right',
})

const noteFrames = []
let noteCursorY = topStartY
notePanels.forEach(panel => {
  const h = notePanelHeight(panel)
  noteFrames.push({
    panel,
    x: noteX,
    y: noteCursorY,
    w: LAYOUT.notePanelW,
    h,
  })
  noteCursorY += h + LAYOUT.notePanelGap
})

const notesBottom = noteFrames.reduce((max, frame) => Math.max(max, frame.y + frame.h), topStartY)
const topSectionBottom = Math.max(leftBottom, rightBottom, topClustersBottom, notesBottom)

const mechanismStartY = topSectionBottom + PAGE.sectionGap
const sortedMechanismClusters = sortBySlot(mechanismClusters, [
  'mechanism-1',
  'mechanism-2',
  'mechanism-3',
  'mechanism-4',
  'mechanism-5',
])

const mechanismCount = Math.max(sortedMechanismClusters.length, 1)
const mechanismAvailableW = W - PAGE.marginX * 2
const mechanismGapTotal = LAYOUT.mechanismGap * Math.max(mechanismCount - 1, 0)
const mechanismDesiredInnerW = sortedMechanismClusters.reduce(
  (sum, cluster) => sum + Math.min(420, Math.max(220, clusterDesiredWidth(cluster))),
  0,
)
const mechanismTargetW =
  mechanismCount <= 3
    ? Math.min(
        mechanismAvailableW,
        Math.max(mechanismDesiredInnerW + mechanismGapTotal + 80, Math.round(mechanismAvailableW * 0.72)),
      )
    : mechanismAvailableW
const mechanismWidths = buildWeightedWidths(mechanismTargetW, LAYOUT.mechanismGap, sortedMechanismClusters)

const mechanismFrames = []
let mechanismCursorX = PAGE.marginX + Math.round((mechanismAvailableW - mechanismTargetW) / 2)
sortedMechanismClusters.forEach((cluster, index) => {
  const frameW = mechanismWidths[index] || Math.floor((mechanismTargetW - mechanismGapTotal) / mechanismCount)
  const innerW = frameW - LAYOUT.groupPadX * 2
  let y = mechanismStartY + LAYOUT.groupPadTop
  const nodeIds = []
  cluster.nodes.forEach(node => {
    const w = node.width || innerW
    const h = node.height || autoNodeHeight(node, w)
    positions.set(node.id, { x: mechanismCursorX + LAYOUT.groupPadX, y, w, h })
    zones.set(node.id, 'mechanism')
    nodeIds.push(node.id)
    y += h + LAYOUT.nodeGap
  })
  const frameH = Math.max(120, y - mechanismStartY - LAYOUT.nodeGap + LAYOUT.groupPadBottom)
  const frame = {
    cluster,
    x: mechanismCursorX,
    y: mechanismStartY,
    w: frameW,
    h: frameH,
    nodeIds,
  }
  mechanismFrames.push(frame)
  positions.set(cluster.id, { x: frame.x, y: frame.y, w: frame.w, h: frame.h })
  zones.set(cluster.id, 'mechanism')
  clusterFrameById.set(cluster.id, frame)
  nodeIds.forEach(nodeId => nodeToClusterId.set(nodeId, cluster.id))
  mechanismCursorX += frameW + LAYOUT.mechanismGap
})

const mechanismBottom = mechanismFrames.reduce(
  (max, frame) => Math.max(max, frame.y + frame.h),
  mechanismStartY,
)

const substrateStartY = mechanismBottom + PAGE.sectionGap
const substrateAvailableW = W - PAGE.marginX * 2 - 24
const substrateMinW = 138
const substrateCols = Math.max(
  1,
  Math.min(
    substrateNodes.length || 1,
    Math.floor((substrateAvailableW + LAYOUT.substrateGap) / (substrateMinW + LAYOUT.substrateGap)),
  ),
)
const substrateNodeW =
  (substrateAvailableW - LAYOUT.substrateGap * Math.max(substrateCols - 1, 0)) / substrateCols

let substrateBottom = substrateStartY + 52
substrateNodes.forEach((node, index) => {
  const row = Math.floor(index / substrateCols)
  const col = index % substrateCols
  const x = PAGE.marginX + 12 + col * (substrateNodeW + LAYOUT.substrateGap)
  const width = node.width || substrateNodeW
  const height = node.height || autoNodeHeight(node, width)
  let y = substrateStartY + 28
  for (let r = 0; r < row; r += 1) {
    const rowNodes = substrateNodes.slice(r * substrateCols, (r + 1) * substrateCols)
    const rowHeight = Math.max(
      ...rowNodes.map(rowNode => rowNode.height || autoNodeHeight(rowNode, substrateNodeW)),
    )
    y += rowHeight + LAYOUT.substrateRowGap
  }
  positions.set(node.id, { x, y, w: width, h: height })
  zones.set(node.id, 'substrate')
  substrateBottom = Math.max(substrateBottom, y + height)
})

const substrateRows = Math.max(Math.ceil(substrateNodes.length / substrateCols), 1)
const substrateEnclosureH = substrateBottom - substrateStartY + 22
const substrateEndY = substrateStartY + substrateEnclosureH

const securityY = substrateEndY + PAGE.footerGap
const securityTotal =
  (input.security_bar?.segments || []).reduce((sum, segment) => sum + (segment.weight || 1), 0) || 1

const securityHtml = (input.security_bar?.segments || [])
  .map(segment => {
    const warningClass = segment.accent === 'warning' ? ' warning' : ''
    return `<div class="security-segment${warningClass}" style="flex:${segment.weight || 1} 1 0">
        ${escapeHtml(segment.label)}
        ${segment.detail ? `<div class="security-detail">${escapeHtml(segment.detail)}</div>` : ''}
      </div>`
  })
  .join('')

const legendHtml = legendItems
  .map(item => {
    if (item.kind === 'box-flagged') {
      return `<div class="legend-item"><div class="legend-box-flagged"></div>${escapeHtml(item.label)}</div>`
    }
    const style = edgeStyleMap[item.kind] || edgeStyleMap.solid
    return `<div class="legend-item"><div class="legend-line" style="border-top:1.5px ${style.dash ? 'dashed' : 'solid'} ${style.stroke}"></div>${escapeHtml(item.label)}</div>`
  })
  .join('')

const legendY = securityY + 46
const H = legendY + 40

const annotationFrames = {
  'loop-note': {
    x: PAGE.marginX + 170,
    y: mechanismStartY - 52,
    w: 150,
    color: '#e11d48',
  },
  'tool-note': {
    x: centerX + centerW * 0.4,
    y: mechanismStartY - 60,
    w: 220,
    color: '#059669',
  },
}

const topEnclosureRect = topClusterFrames.length
  ? {
      x:
        Math.min(...topClusterFrames.map(frame => frame.x)) - LAYOUT.enclosurePad,
      y: topStartY - LAYOUT.enclosurePad - 18,
      w:
        Math.max(...topClusterFrames.map(frame => frame.x + frame.w)) -
        Math.min(...topClusterFrames.map(frame => frame.x)) +
        LAYOUT.enclosurePad * 2,
      h:
        Math.max(...topClusterFrames.map(frame => frame.y + frame.h)) -
        topStartY +
        LAYOUT.enclosurePad * 2 +
        10,
    }
  : null

const substrateRect = {
  x: PAGE.marginX,
  y: substrateStartY,
  w: W - PAGE.marginX * 2,
  h: substrateEnclosureH,
}

const blockIds = new Set([
  ...leftNodes.map(node => node.id),
  ...rightNodes.map(node => node.id),
  ...sortedTopClusters.map(cluster => cluster.id),
  ...sortedMechanismClusters.map(cluster => cluster.id),
  ...substrateNodes.map(node => node.id),
])
const standaloneNodeIds = new Set([
  ...leftNodes.map(node => node.id),
  ...rightNodes.map(node => node.id),
  ...substrateNodes.map(node => node.id),
])

const groupLaneUsage = new Map()
const nodeLaneUsage = new Map()

const edgeAnchor = (nodeId, side) => {
  const rect = positions.get(nodeId)
  if (!rect) return { x: 0, y: 0 }
  switch (side) {
    case 'left':
      return { x: rect.x, y: rect.y + rect.h / 2 }
    case 'right':
      return { x: rect.x + rect.w, y: rect.y + rect.h / 2 }
    case 'top':
      return { x: rect.x + rect.w / 2, y: rect.y }
    case 'bottom':
      return { x: rect.x + rect.w / 2, y: rect.y + rect.h }
    default:
      return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }
  }
}

const rectToBounds = rect => ({
  left: rect.x,
  right: rect.x + rect.w,
  top: rect.y,
  bottom: rect.y + rect.h,
})

const expandBounds = (bounds, pad) => ({
  left: bounds.left - pad,
  right: bounds.right + pad,
  top: bounds.top - pad,
  bottom: bounds.bottom + pad,
})

const rectCenter = rect => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 })

const axisGap = (startA, endA, startB, endB) => Math.max(0, Math.max(startA, startB) - Math.min(endA, endB))
const axisOverlap = (startA, endA, startB, endB) => Math.max(0, Math.min(endA, endB) - Math.max(startA, startB))
const rectRelation = (fromRect, toRect) => ({
  gapX: axisGap(fromRect.x, fromRect.x + fromRect.w, toRect.x, toRect.x + toRect.w),
  gapY: axisGap(fromRect.y, fromRect.y + fromRect.h, toRect.y, toRect.y + toRect.h),
  overlapX: axisOverlap(fromRect.x, fromRect.x + fromRect.w, toRect.x, toRect.x + toRect.w),
  overlapY: axisOverlap(fromRect.y, fromRect.y + fromRect.h, toRect.y, toRect.y + toRect.h),
  fromCenter: rectCenter(fromRect),
  toCenter: rectCenter(toRect),
})

const buildNodeObstacles = ({ blockId, excludeNodeIds = new Set(), pad = 10 }) => {
  const obstacles = []
  positions.forEach((rect, id) => {
    const ownerBlockId = nodeToClusterId.get(id) || id
    const isNode = nodeToClusterId.has(id) || standaloneNodeIds.has(id)
    if (!isNode) return
    if (excludeNodeIds.has(id)) return
    if (blockId && ownerBlockId !== blockId) return
    obstacles.push(expandBounds(rectToBounds(rect), pad))
  })
  return obstacles
}

const buildBlockObstacles = (excludedIds = new Set(), pad = 20) => {
  const obstacles = []
  blockIds.forEach(blockId => {
    if (excludedIds.has(blockId)) return
    const rect = positions.get(blockId)
    if (!rect) return
    obstacles.push(expandBounds(rectToBounds(rect), pad))
  })
  noteFrames.forEach(frame => {
    obstacles.push(expandBounds(rectToBounds(frame), 16))
  })
  return obstacles
}

const blocksAreNearby = (fromBlockId, toBlockId) => {
  const fromRect = positions.get(fromBlockId)
  const toRect = positions.get(toBlockId)
  if (!fromRect || !toRect) return false
  const { gapX, gapY } = rectRelation(fromRect, toRect)
  return gapX <= 88 || gapY <= 88
}

const buildStraightBridge = ({
  fromRect,
  toRect,
  from,
  to,
  fromSide,
  toSide,
  obstaclePad = 22,
  excludedIds = new Set(),
}) => {
  if (!fromRect || !toRect) return null

  if (
    (fromSide === 'right' && toSide === 'left') ||
    (fromSide === 'left' && toSide === 'right')
  ) {
    const overlapTop = Math.max(fromRect.y + 14, toRect.y + 14)
    const overlapBottom = Math.min(fromRect.y + fromRect.h - 14, toRect.y + toRect.h - 14)
    if (overlapTop <= overlapBottom) {
      const commonY = clamp((from.y + to.y) / 2, overlapTop, overlapBottom)
      const bridgeFrom = { ...alignedSidePortPoint(fromRect, fromSide, commonY), side: fromSide }
      const bridgeTo = { ...alignedSidePortPoint(toRect, toSide, commonY), side: toSide }
      const bridgeStartOut = outwardPointFromAnchor(bridgeFrom, fromSide, 18)
      const bridgeEndOut = outwardPointFromAnchor(bridgeTo, toSide, 18)
      const candidate = simplifyPoints([bridgeFrom, bridgeStartOut, bridgeEndOut, bridgeTo])
      if (pathClear(candidate, buildBlockObstacles(excludedIds, obstaclePad))) {
        return candidate
      }
    }
  }

  if (
    (fromSide === 'bottom' && toSide === 'top') ||
    (fromSide === 'top' && toSide === 'bottom')
  ) {
    const overlapLeft = Math.max(fromRect.x + 18, toRect.x + 18)
    const overlapRight = Math.min(fromRect.x + fromRect.w - 18, toRect.x + toRect.w - 18)
    if (overlapLeft <= overlapRight) {
      const commonX = clamp((from.x + to.x) / 2, overlapLeft, overlapRight)
      const bridgeFrom = { ...alignedSidePortPoint(fromRect, fromSide, commonX), side: fromSide }
      const bridgeTo = { ...alignedSidePortPoint(toRect, toSide, commonX), side: toSide }
      const bridgeStartOut = outwardPointFromAnchor(bridgeFrom, fromSide, 18)
      const bridgeEndOut = outwardPointFromAnchor(bridgeTo, toSide, 18)
      const candidate = simplifyPoints([bridgeFrom, bridgeStartOut, bridgeEndOut, bridgeTo])
      if (pathClear(candidate, buildBlockObstacles(excludedIds, obstaclePad))) {
        return candidate
      }
    }
  }

  return null
}

const inferNearbyLoopSides = (fromId, toId) => {
  const fromRect = positions.get(fromId)
  const toRect = positions.get(toId)
  if (!fromRect || !toRect) return null

  const { gapX, gapY, overlapX, overlapY, fromCenter, toCenter } = rectRelation(fromRect, toRect)

  if (gapX > 0 && overlapY >= 24) {
    return fromCenter.x <= toCenter.x
      ? { fromSide: 'right', toSide: 'left' }
      : { fromSide: 'left', toSide: 'right' }
  }

  if (gapY > 0 && overlapX >= 36) {
    return fromCenter.y <= toCenter.y
      ? { fromSide: 'bottom', toSide: 'top' }
      : { fromSide: 'top', toSide: 'bottom' }
  }

  return null
}

const resolveEdgeSides = (edge, fromId = edge.from, toId = edge.to) => {
  if (edge.kind === 'loop') {
    const loopSides = inferNearbyLoopSides(fromId, toId)
    if (loopSides) return loopSides
  }
  const inferred = inferAnchor({ ...edge, from: fromId, to: toId })
  return {
    fromSide: edge.fromSide || inferred.fromSide,
    toSide: edge.toSide || inferred.toSide,
  }
}

const endpointSortValue = (side, targetCenter) =>
  side === 'left' || side === 'right' ? targetCenter.y : targetCenter.x

const buildPortEndpoints = ({ edgeId, fromRect, toRect, fromOwnerId, toOwnerId, fromSide, toSide }) => {
  if (!fromRect || !toRect) return []
  const fromCenter = rectCenter(fromRect)
  const toCenter = rectCenter(toRect)
  return [
    {
      ownerId: fromOwnerId,
      side: fromSide,
      edgeId,
      endpoint: 'from',
      sortValue: endpointSortValue(fromSide, toCenter),
    },
    {
      ownerId: toOwnerId,
      side: toSide,
      edgeId,
      endpoint: 'to',
      sortValue: endpointSortValue(toSide, fromCenter),
    },
  ]
}

const tryDirectNodeBridge = ({ from, to, startOut, endOut, edge, fromSide, toSide }) => {
  if (edge.fromBlock === edge.toBlock) return null
  if (!blocksAreNearby(edge.fromBlock, edge.toBlock)) return null

  const fromRect = positions.get(edge.from)
  const toRect = positions.get(edge.to)
  const straight = buildStraightBridge({
    fromRect,
    toRect,
    from,
    to,
    fromSide,
    toSide,
    obstaclePad: 20,
    excludedIds: new Set([edge.fromBlock, edge.toBlock]),
  })
  if (straight) return straight
  let bridgeFrom = from
  let bridgeTo = to
  let bridgeStartOut = startOut
  let bridgeEndOut = endOut

  if (fromRect && toRect) {
    if (
      (fromSide === 'right' && toSide === 'left') ||
      (fromSide === 'left' && toSide === 'right')
    ) {
      const overlapTop = Math.max(fromRect.y + 14, toRect.y + 14)
      const overlapBottom = Math.min(fromRect.y + fromRect.h - 14, toRect.y + toRect.h - 14)
      if (overlapTop <= overlapBottom) {
        const commonY = clamp(from.y, overlapTop, overlapBottom)
        bridgeFrom = { ...alignedSidePortPoint(fromRect, fromSide, commonY), side: fromSide }
        bridgeTo = { ...alignedSidePortPoint(toRect, toSide, commonY), side: toSide }
        bridgeStartOut = outwardPointFromAnchor(bridgeFrom, fromSide, 18)
        bridgeEndOut = outwardPointFromAnchor(bridgeTo, toSide, 18)
      }
    } else if (
      (fromSide === 'bottom' && toSide === 'top') ||
      (fromSide === 'top' && toSide === 'bottom')
    ) {
      const overlapLeft = Math.max(fromRect.x + 18, toRect.x + 18)
      const overlapRight = Math.min(fromRect.x + fromRect.w - 18, toRect.x + toRect.w - 18)
      if (overlapLeft <= overlapRight) {
        const commonX = clamp(from.x, overlapLeft, overlapRight)
        bridgeFrom = { ...alignedSidePortPoint(fromRect, fromSide, commonX), side: fromSide }
        bridgeTo = { ...alignedSidePortPoint(toRect, toSide, commonX), side: toSide }
        bridgeStartOut = outwardPointFromAnchor(bridgeFrom, fromSide, 18)
        bridgeEndOut = outwardPointFromAnchor(bridgeTo, toSide, 18)
      }
    }
  }

  const fromBlockRect = positions.get(edge.fromBlock)
  const toBlockRect = positions.get(edge.toBlock)
  const extraPoints = []
  if (fromBlockRect && toBlockRect) {
    extraPoints.push({
      x: Math.round(
        (Math.min(fromBlockRect.x + fromBlockRect.w, toBlockRect.x + toBlockRect.w) +
          Math.max(fromBlockRect.x, toBlockRect.x)) /
          2,
      ),
    })
    extraPoints.push({
      y: Math.round(
        (Math.min(fromBlockRect.y + fromBlockRect.h, toBlockRect.y + toBlockRect.h) +
          Math.max(fromBlockRect.y, toBlockRect.y)) /
          2,
      ),
    })
  }
  const bridge = routeBlockCorePath({
    start: bridgeStartOut,
    end: bridgeEndOut,
    excludedIds: new Set([edge.fromBlock, edge.toBlock]),
    pad: 20,
    usage: new Map(),
    mode: 'node',
    simpleOnly: true,
    extraPoints,
    registerUsage: false,
  })

  if (!bridge) return null
  if (countTurns(bridge) > 2) return null

  return simplifyPoints([bridgeFrom, ...bridge, bridgeTo])
}

const tryDirectGroupBridge = (edge, from, to, fromSide, toSide) => {
  if (!blocksAreNearby(edge.from, edge.to)) return null
  return buildStraightBridge({
    fromRect: positions.get(edge.from),
    toRect: positions.get(edge.to),
    from,
    to,
    fromSide,
    toSide,
    obstaclePad: 22,
    excludedIds: new Set([edge.from, edge.to]),
  })
}

const globalLaneXs = uniqueSorted([
  PAGE.marginX + 12,
  PAGE.marginX + LAYOUT.leftColumnW + Math.round(LAYOUT.leftToCenterGap / 2),
  centerX + Math.round(centerW / 2),
  rightColumnX - Math.round(LAYOUT.centerToRightGap / 2),
  noteX - Math.round(LAYOUT.rightToNoteGap / 2),
  W - PAGE.marginX - 12,
  ...topClusterFrames.slice(0, -1).map((frame, index) => {
    const next = topClusterFrames[index + 1]
    return frame.x + frame.w + Math.round((next.x - (frame.x + frame.w)) / 2)
  }),
  ...mechanismFrames.slice(0, -1).map((frame, index) => {
    const next = mechanismFrames[index + 1]
    return frame.x + frame.w + Math.round((next.x - (frame.x + frame.w)) / 2)
  }),
])

const globalLaneYs = uniqueSorted([
  topStartY - 16,
  topSectionBottom + Math.round(PAGE.sectionGap / 2),
  mechanismStartY - 18,
  mechanismBottom + Math.round(PAGE.sectionGap / 2),
  substrateStartY - 18,
  substrateEndY + Math.round(PAGE.footerGap / 2),
  securityY - 18,
])

const orthogonalRouter = createOrthogonalRouter({
  width: W,
  height: H,
  baseLaneXs: globalLaneXs,
  baseLaneYs: globalLaneYs,
})

const inferAnchor = edge => {
  const fromZone = zones.get(edge.from)
  const toZone = zones.get(edge.to)
  if (fromZone === 'left' && toZone === 'top') return { fromSide: 'right', toSide: 'left' }
  if (fromZone === 'left' && toZone === 'right') return { fromSide: 'right', toSide: 'left' }
  if (fromZone === 'top' && toZone === 'right') return { fromSide: 'right', toSide: 'left' }
  if (fromZone === 'top' && toZone === 'mechanism') return { fromSide: 'bottom', toSide: 'top' }
  if (fromZone === 'left' && toZone === 'mechanism') return { fromSide: 'bottom', toSide: 'top' }
  if (toZone === 'substrate') return { fromSide: 'bottom', toSide: 'top' }
  if (fromZone === 'substrate') return { fromSide: 'top', toSide: 'bottom' }

  const from = positions.get(edge.from)
  const to = positions.get(edge.to)
  if (!from || !to) return { fromSide: 'right', toSide: 'left' }
  const dx = to.x + to.w / 2 - (from.x + from.w / 2)
  const dy = to.y + to.h / 2 - (from.y + from.h / 2)
  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      fromSide: dx >= 0 ? 'right' : 'left',
      toSide: dx >= 0 ? 'left' : 'right',
    }
  }
  return {
    fromSide: dy >= 0 ? 'bottom' : 'top',
    toSide: dy >= 0 ? 'top' : 'bottom',
  }
}

const routeBlockCorePath = ({
  start,
  end,
  excludedIds,
  pad,
  usage,
  mode,
  simpleOnly = false,
  extraPoints = [],
  registerUsage = true,
}) =>
  orthogonalRouter.choosePath({
    start,
    end,
    obstacles: buildBlockObstacles(excludedIds, pad),
    usage,
    mode,
    simpleOnly,
    extraPoints,
    registerUsage,
  })

const assignPorts = (edgeList, getEndpoints, pointFactory) => {
  const buckets = new Map()

  edgeList.forEach(edge => {
    getEndpoints(edge).forEach(endpoint => {
      if (!endpoint) return
      const key = `${endpoint.ownerId}:${endpoint.side}`
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(endpoint)
    })
  })

  const assignments = new Map()
  buckets.forEach((items, key) => {
    const [ownerId, side] = key.split(':')
    const rect = positions.get(ownerId)
    if (!rect) return
    items.sort((a, b) => a.sortValue - b.sortValue)
    items.forEach((item, index) => {
      const point = pointFactory(rect, side, index, items.length)
      const current = assignments.get(item.edgeId) || {}
      current[item.endpoint] = { side, ...point }
      assignments.set(item.edgeId, current)
    })
  })

  return assignments
}

const assignNodePorts = edgeList =>
  assignPorts(
    edgeList,
    edge => {
      const { fromSide, toSide } =
        edge.kind === 'loop'
          ? resolveEdgeSides(edge, edge.fromBlock, edge.toBlock)
          : resolveEdgeSides(edge)
      return buildPortEndpoints({
        edgeId: edge.id,
        fromRect: positions.get(edge.from),
        toRect: positions.get(edge.to),
        fromOwnerId: edge.from,
        toOwnerId: edge.to,
        fromSide,
        toSide,
      })
    },
    (rect, side, index, total) => sidePortPoint(rect, side, index, total, 18, 14),
  )

const assignGroupPorts = edgeList =>
  assignPorts(
    edgeList,
    edge => {
      const { fromSide, toSide } = resolveEdgeSides(edge)
      return buildPortEndpoints({
        edgeId: edge.id,
        fromRect: positions.get(edge.from),
        toRect: positions.get(edge.to),
        fromOwnerId: edge.from,
        toOwnerId: edge.to,
        fromSide,
        toSide,
      })
    },
    (rect, side, index, total) => sidePortPoint(rect, side, index, total, 28, 24),
  )

const assignBlockBoundaryPorts = edgeList =>
  assignPorts(
    edgeList,
    edge => {
      const resolved = resolveEdgeSides(edge, edge.fromBlock, edge.toBlock)
      const fromSide = edge.fromBlockSide || resolved.fromSide
      const toSide = edge.toBlockSide || resolved.toSide
      return buildPortEndpoints({
        edgeId: edge.id,
        fromRect: positions.get(edge.fromBlock),
        toRect: positions.get(edge.toBlock),
        fromOwnerId: edge.fromBlock,
        toOwnerId: edge.toBlock,
        fromSide,
        toSide,
      })
    },
    (rect, side, index, total) => sidePortPoint(rect, side, index, total, 30, 26),
  )

const routeGroupEdge = (edge, portAssignments = new Map()) => {
  const { fromSide, toSide } = resolveEdgeSides(edge)
  const assigned = portAssignments.get(edge.id) || {}
  const from = assigned.from || edgeAnchor(edge.from, fromSide)
  const to = assigned.to || edgeAnchor(edge.to, toSide)
  const straight = tryDirectGroupBridge(edge, from, to, fromSide, toSide)
  if (straight) return straight
  const start = outwardPointFromAnchor(from, fromSide, 22)
  const end = outwardPointFromAnchor(to, toSide, 22)
  const core = routeBlockCorePath({
    start,
    end,
    excludedIds: new Set([edge.from, edge.to]),
    pad: 22,
    usage: groupLaneUsage,
    mode: 'group',
  })

  return simplifyPoints([from, ...core, to])
}

const routeNodeWithinBlock = ({ start, end, blockId, excludeNodeIds }) =>
  orthogonalRouter.choosePath({
    start,
    end,
    obstacles: buildNodeObstacles({
      blockId,
      excludeNodeIds,
      pad: 10,
    }),
    usage: new Map(),
    mode: 'node',
  })

const resolveNodeRoutingContext = (edge, nodePorts = new Map()) => {
  const blockSides = resolveEdgeSides(edge, edge.fromBlock, edge.toBlock)
  const nodeSides = edge.kind === 'loop' ? blockSides : resolveEdgeSides(edge)
  const fromSide = nodeSides.fromSide || blockSides.fromSide
  const toSide = nodeSides.toSide || blockSides.toSide
  const nodeAssigned = nodePorts.get(edge.id) || {}
  const from = nodeAssigned.from || edgeAnchor(edge.from, fromSide)
  const to = nodeAssigned.to || edgeAnchor(edge.to, toSide)
  const startOut = outwardPointFromAnchor(from, fromSide, 18)
  const endOut = outwardPointFromAnchor(to, toSide, 18)
  return {
    fromSide,
    toSide,
    from,
    to,
    startOut,
    endOut,
  }
}

const routeNodeAcrossBlocks = ({
  edge,
  from,
  to,
  startOut,
  endOut,
  fromSide,
  toSide,
  blockPorts,
}) => {
  const blockAssigned = blockPorts.get(edge.id) || {}
  const fromGate = edge.fromBlock === edge.from ? from : blockAssigned.from || edgeAnchor(edge.fromBlock, fromSide)
  const toGate = edge.toBlock === edge.to ? to : blockAssigned.to || edgeAnchor(edge.toBlock, toSide)
  const fromGateOut = edge.fromBlock === edge.from ? startOut : outwardPointFromAnchor(fromGate, fromSide, 18)
  const toGateOut = edge.toBlock === edge.to ? endOut : outwardPointFromAnchor(toGate, toSide, 18)

  const startSequence =
    edge.fromBlock === edge.from
      ? [from, startOut]
      : [
          from,
          ...routeNodeWithinBlock({
            start: startOut,
            end: fromGateOut,
            blockId: edge.fromBlock,
            excludeNodeIds: new Set([edge.from]),
          }),
        ]

  const endSequence =
    edge.toBlock === edge.to
      ? [endOut, to]
      : [
          ...routeNodeWithinBlock({
            start: toGateOut,
            end: endOut,
            blockId: edge.toBlock,
            excludeNodeIds: new Set([edge.to]),
          }),
          to,
        ]

  const core = routeBlockCorePath({
    start: fromGateOut,
    end: toGateOut,
    excludedIds: new Set([edge.fromBlock, edge.toBlock]),
    pad: 20,
    usage: nodeLaneUsage,
    mode: 'node',
  })

  return simplifyPoints([
    ...startSequence,
    ...core.slice(1, -1),
    ...endSequence,
  ])
}

const routeNodeEdge = (edge, nodePorts = new Map(), blockPorts = new Map()) => {
  const { fromSide, toSide, from, to, startOut, endOut } = resolveNodeRoutingContext(edge, nodePorts)

  if (edge.fromBlock === edge.toBlock) {
    const local = routeNodeWithinBlock({
      start: startOut,
      end: endOut,
      blockId: edge.fromBlock,
      excludeNodeIds: new Set([edge.from, edge.to]),
    })
    return simplifyPoints([from, ...local, to])
  }

  const directBridge = tryDirectNodeBridge({
    from,
    to,
    startOut,
    endOut,
    edge,
    fromSide,
    toSide,
  })
  if (directBridge) return directBridge

  return routeNodeAcrossBlocks({
    edge,
    from,
    to,
    startOut,
    endOut,
    fromSide,
    toSide,
    blockPorts,
  })
}

const pointsToOrthogonalPath = (points, radius = 8) => {
  if (!points.length) return ''
  const unique = points.filter((point, index) => {
    if (index === 0) return true
    const prev = points[index - 1]
    return prev.x !== point.x || prev.y !== point.y
  })
  if (unique.length === 1) {
    return `M ${unique[0].x} ${unique[0].y}`
  }
  if (unique.length === 2) {
    return `M ${unique[0].x} ${unique[0].y} L ${unique[1].x} ${unique[1].y}`
  }
  let d = `M ${unique[0].x} ${unique[0].y}`
  for (let index = 1; index < unique.length - 1; index += 1) {
    const prev = unique[index - 1]
    const current = unique[index]
    const next = unique[index + 1]
    const prevDx = current.x - prev.x
    const prevDy = current.y - prev.y
    const nextDx = next.x - current.x
    const nextDy = next.y - current.y
    const prevLen = Math.abs(prevDx) + Math.abs(prevDy)
    const nextLen = Math.abs(nextDx) + Math.abs(nextDy)
    const corner = Math.min(radius, prevLen / 2, nextLen / 2)

    if (
      !corner ||
      corner < 4 ||
      prevLen < 10 ||
      nextLen < 10 ||
      movementDir(prev, current) === movementDir(current, next)
    ) {
      d += ` L ${current.x} ${current.y}`
      continue
    }

    const entry = {
      x: current.x - Math.sign(prevDx) * corner,
      y: current.y - Math.sign(prevDy) * corner,
    }
    const exit = {
      x: current.x + Math.sign(nextDx) * corner,
      y: current.y + Math.sign(nextDy) * corner,
    }
    const cross = Math.sign(prevDx) * Math.sign(nextDy) - Math.sign(prevDy) * Math.sign(nextDx)
    const sweep = cross > 0 ? 1 : 0

    d += ` L ${entry.x} ${entry.y} A ${corner} ${corner} 0 0 ${sweep} ${exit.x} ${exit.y}`
  }
  d += ` L ${unique[unique.length - 1].x} ${unique[unique.length - 1].y}`
  return d
}

const edgeSvg = (edge, pathPoints, extraClass = '', markerPrefix = '') => {
  const { stroke, dash, marker, width } = edgeStyleMap[edge.kind] || edgeStyleMap.solid
  const pathData = pointsToOrthogonalPath(pathPoints)
  return `<path class="${extraClass}" data-edge-id="${escapeHtml(edge.id || '')}" data-from="${escapeHtml(edge.from)}" data-to="${escapeHtml(edge.to)}" data-from-block="${escapeHtml(edge.fromBlock || '')}" data-to-block="${escapeHtml(edge.toBlock || '')}" d="${pathData}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''} fill="none" marker-end="url(#${markerPrefix}${marker})" />`
}

const renderNode = node => {
  const rect = positions.get(node.id)
  if (!rect) return ''
  const borderColor = nodeBorderColor(node)
  const accent = borderColor || node.accentColor || colorMap[node.accent] || '#7c7384'
  const style = [
    `left:${rect.x}px`,
    `top:${rect.y}px`,
    `width:${rect.w}px`,
    `height:${rect.h}px`,
    `--node-accent:${accent}`,
    borderColor ? `border-color:${borderColor}` : '',
    accent
      ? `box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), 0 10px 24px ${softenColor(accent, node.style === 'source' ? 0.05 : 0.14)}`
      : '',
    node.style === 'state' ? 'background:#f0fdf4' : '',
  ]
    .filter(Boolean)
    .join('; ')

  return `<div class="${nodeClass(node)} architecture-node" data-node-id="${escapeHtml(node.id)}" data-block-id="${escapeHtml(nodeToClusterId.get(node.id) || node.id)}" style="${style}" tabindex="0" role="button" aria-label="${escapeHtml(node.title)}">
      <span class="node-title">${escapeHtml(node.title)}</span>
      ${node.detail ? `<span class="sub">${escapeHtml(node.detail)}</span>` : ''}
      ${node.tech ? `<span class="tech">${escapeHtml(node.tech)}</span>` : ''}
      ${node.metric ? `<span class="metric">${escapeHtml(node.metric)}</span>` : ''}
    </div>`
}

const renderCluster = frame => {
  const { cluster, x, y, w, h } = frame
  const accent = colorMap[cluster.accent] || '#64748b'
  const groupClass = cluster.variant === 'flagged-group' ? 'group flagged-group' : 'group'
  const enclosure = cluster.enclosure
    ? `<div class="enclosure-label" style="left:${x + 15}px; top:${y - 23}px">${escapeHtml(cluster.enclosure)}</div>`
    : ''
  const badge =
    cluster.variant === 'flagged-group' && cluster.badge
      ? `<span class="flag-badge">${escapeHtml(cluster.badge)}</span>`
      : ''
  return `${enclosure}
    <div class="${groupClass}" style="left:${x}px; top:${y}px; width:${w}px; height:${h}px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 18px 40px ${softenColor(accent, 0.08)}">
      <span class="tag ${escapeHtml(cluster.accent || 'slate')}" style="--tag-accent:${accent}; color:${accent}">${escapeHtml(cluster.title)}</span>
      ${badge}
    </div>
    ${cluster.nodes.map(renderNode).join('\n')}`
}

const renderNotePanel = frame => {
  const { panel, x, y, w } = frame
  const panelAccent =
    colorMap[panel.accent] ||
    panel.items?.find(item => item.color)?.color ||
    '#2563eb'
  const items = (panel.items || [])
    .map(
      item =>
        `<div class="note-panel-item"><span class="note-panel-lead" style="color:${escapeHtml(item.color || '#1e293b')}">${escapeHtml(item.lead)}</span> ${escapeHtml(item.text)}</div>`,
    )
    .join('')
  return `<div class="note-panel" style="left:${x}px; top:${y}px; width:${w}px; --panel-accent:${panelAccent}">
      <div class="note-panel-title">${escapeHtml(panel.title)}</div>
      <div class="note-panel-body">${items}</div>
      ${panel.footnote ? `<div class="note-panel-footnote">${escapeHtml(panel.footnote)}</div>` : ''}
    </div>`
}

const renderAnnotation = annotation => {
  const frame = annotationFrames[annotation.slot]
  if (!frame) return ''
  return `<div class="note" style="left:${frame.x}px; top:${frame.y}px; width:${frame.w}px; text-align:center; color:${frame.color}; text-shadow:0 1px 0 rgba(255,255,255,0.6)">
      ${escapeHtml(annotation.text).replaceAll('\n', '<br/>')}
    </div>`
}

const topEnclosure = topEnclosureRect
  ? `<div class="enclosure" style="left:${topEnclosureRect.x}px; top:${topEnclosureRect.y}px; width:${topEnclosureRect.w}px; height:${topEnclosureRect.h}px"></div>`
  : ''

const topEnclosureLabel =
  topEnclosureRect && input.top_enclosure_label
    ? `<div class="enclosure-label" style="left:${topEnclosureRect.x + 15}px; top:${topEnclosureRect.y + 6}px">${escapeHtml(input.top_enclosure_label)}</div>`
    : ''

const substrateEnclosure = `<div class="enclosure substrate" style="left:${substrateRect.x}px; top:${substrateRect.y}px; width:${substrateRect.w}px; height:${substrateRect.h}px"></div>`
const substrateLabel = `<div class="enclosure-label" style="left:${substrateRect.x + 15}px; top:${substrateRect.y + 7}px; color:#059669">${escapeHtml(input.substrate?.title || 'State / Persistence Layer')}</div><div class="enclosure-detail" style="left:${substrateRect.x + 165}px; top:${substrateRect.y + 7}px">${escapeHtml(input.substrate?.detail || '')}</div>`

const blockIdForNode = nodeId => nodeToClusterId.get(nodeId) || nodeId

const edgeKindPriority = {
  solid: 1,
  state: 2,
  signal: 3,
  loop: 4,
  flag: 5,
}

const groupEdgeMap = new Map()
edges.forEach((edge, index) => {
  const fromBlock = blockIdForNode(edge.from)
  const toBlock = blockIdForNode(edge.to)
  if (fromBlock === toBlock) return
  const key = `${fromBlock}=>${toBlock}`
  const current = groupEdgeMap.get(key)
  const candidate = {
    ...edge,
    id: `group-${groupEdgeMap.size}-${index}`,
    from: fromBlock,
    to: toBlock,
    fromBlock,
    toBlock,
    underlyingCount: 1,
  }
  if (!current) {
    groupEdgeMap.set(key, candidate)
    return
  }
  current.underlyingCount += 1
  if ((edgeKindPriority[edge.kind] || 0) > (edgeKindPriority[current.kind] || 0)) {
    current.kind = edge.kind
  }
})

const groupEdges = [...groupEdgeMap.values()]

const nodeEdges = edges.map((edge, index) => ({
  ...edge,
  id: `node-${index}`,
  fromBlock: blockIdForNode(edge.from),
  toBlock: blockIdForNode(edge.to),
}))

const renderNodeEdgeLayer = edgeList => {
  nodeLaneUsage.clear()
  const nodePorts = assignNodePorts(edgeList)
  const blockPorts = assignBlockBoundaryPorts(edgeList)
  return edgeList
    .map(edge =>
      edgeSvg(edge, routeNodeEdge(edge, nodePorts, blockPorts), 'edge-path node-edge', 'n'),
    )
    .join('\n')
}

const renderGroupEdgeLayer = edgeList => {
  groupLaneUsage.clear()
  const portAssignments = assignGroupPorts(edgeList)
  return edgeList
    .map(edge => edgeSvg(edge, routeGroupEdge(edge, portAssignments), 'edge-path group-edge'))
    .join('\n')
}

const groupEdgeSvg = renderGroupEdgeLayer(groupEdges)
const nodeEdgeSvg = renderNodeEdgeLayer(nodeEdges)

const html = buildArchitectureHtml({
  W,
  H,
  maxWidth: W + 40,
  headerTop: PAGE.headerTop,
  headerLeft: PAGE.marginX,
  phaseTop: PAGE.phaseTop,
  marginX: PAGE.marginX,
  securityY,
  legendY,
  securityHeight: LAYOUT.securityHeight,
  language: escapeHtml(input.meta?.language || 'zh-CN'),
  pageTitle: escapeHtml(input.meta?.title || 'Architecture Map'),
  headerTitle: escapeHtml(input.meta?.title || ''),
  headerSubtitle: escapeHtml(input.meta?.subtitle || ''),
  phaseBandTitle: escapeHtml(input.phase_band?.title || ''),
  phaseHtml,
  groupEdgeSvg,
  nodeEdgeSvg,
  leftNodesHtml: leftNodes.map(renderNode).join('\n'),
  topEnclosure,
  topEnclosureLabel,
  topClustersHtml: topClusterFrames.map(renderCluster).join('\n'),
  rightNodesHtml: rightNodes.map(renderNode).join('\n'),
  mechanismHtml: mechanismFrames.map(renderCluster).join('\n'),
  substrateEnclosure,
  substrateLabel,
  substrateNodesHtml: substrateNodes.map(renderNode).join('\n'),
  notePanelsHtml: noteFrames.map(renderNotePanel).join('\n'),
  annotationsHtml: annotations.map(renderAnnotation).join('\n'),
  securityTitle: escapeHtml(input.security_bar?.title || ''),
  securityHtml,
  legendHtml,
})

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, html)
console.log(outputPath)
