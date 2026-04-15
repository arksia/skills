export const uniqueSorted = values => [...new Set(values.map(value => Math.round(value)))].sort((a, b) => a - b)

const pointInBounds = (point, bounds) =>
  point.x > bounds.left && point.x < bounds.right && point.y > bounds.top && point.y < bounds.bottom

const rangesOverlap = (a1, a2, b1, b2) => Math.min(a2, b2) > Math.max(a1, b1)

const segmentIntersectsBounds = (from, to, bounds) => {
  if (from.x === to.x) {
    if (from.x <= bounds.left || from.x >= bounds.right) return false
    return rangesOverlap(Math.min(from.y, to.y), Math.max(from.y, to.y), bounds.top, bounds.bottom)
  }
  if (from.y === to.y) {
    if (from.y <= bounds.top || from.y >= bounds.bottom) return false
    return rangesOverlap(Math.min(from.x, to.x), Math.max(from.x, to.x), bounds.left, bounds.right)
  }
  return false
}

export const movementDir = (from, to) => {
  if (from.x === to.x) return 'v'
  if (from.y === to.y) return 'h'
  return 's'
}

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export const outwardPointFromAnchor = (anchor, side, distance = 16) => {
  switch (side) {
    case 'left':
      return { x: anchor.x - distance, y: anchor.y }
    case 'right':
      return { x: anchor.x + distance, y: anchor.y }
    case 'top':
      return { x: anchor.x, y: anchor.y - distance }
    case 'bottom':
      return { x: anchor.x, y: anchor.y + distance }
    default:
      return anchor
  }
}

export const sidePortPoint = (rect, side, order, total, insetX = 18, insetY = 14) => {
  const ratio = (order + 1) / (total + 1)
  switch (side) {
    case 'left':
      return { x: rect.x, y: rect.y + insetY + ratio * Math.max(0, rect.h - insetY * 2) }
    case 'right':
      return { x: rect.x + rect.w, y: rect.y + insetY + ratio * Math.max(0, rect.h - insetY * 2) }
    case 'top':
      return { x: rect.x + insetX + ratio * Math.max(0, rect.w - insetX * 2), y: rect.y }
    case 'bottom':
      return { x: rect.x + insetX + ratio * Math.max(0, rect.w - insetX * 2), y: rect.y + rect.h }
    default:
      return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }
  }
}

export const alignedSidePortPoint = (rect, side, preferred, insetX = 18, insetY = 14) => {
  switch (side) {
    case 'left':
      return { x: rect.x, y: clamp(preferred, rect.y + insetY, rect.y + rect.h - insetY) }
    case 'right':
      return { x: rect.x + rect.w, y: clamp(preferred, rect.y + insetY, rect.y + rect.h - insetY) }
    case 'top':
      return { x: clamp(preferred, rect.x + insetX, rect.x + rect.w - insetX), y: rect.y }
    case 'bottom':
      return { x: clamp(preferred, rect.x + insetX, rect.x + rect.w - insetX), y: rect.y + rect.h }
    default:
      return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }
  }
}

const segmentLength = (from, to) => Math.abs(to.x - from.x) + Math.abs(to.y - from.y)

const dedupePoints = points =>
  points.filter((point, index) => {
    if (index === 0) return true
    const prev = points[index - 1]
    return prev.x !== point.x || prev.y !== point.y
  })

const collapseCollinearPoints = points => {
  if (points.length <= 2) return points
  const deduped = dedupePoints(points)
  const simplified = [deduped[0]]
  for (let index = 1; index < deduped.length - 1; index += 1) {
    const prev = simplified[simplified.length - 1]
    const current = deduped[index]
    const next = deduped[index + 1]
    if (movementDir(prev, current) === movementDir(current, next)) continue
    simplified.push(current)
  }
  simplified.push(deduped[deduped.length - 1])
  return simplified
}

const orthogonalizePoints = points => {
  if (points.length <= 1) return points
  const result = [points[0]]

  for (let index = 1; index < points.length; index += 1) {
    const prev = result[result.length - 1]
    const current = points[index]
    if (prev.x === current.x || prev.y === current.y) {
      result.push(current)
      continue
    }

    const before = result.length >= 2 ? result[result.length - 2] : null
    const next = points[index + 1] || null
    const beforeDir = before ? movementDir(before, prev) : 's'
    const nextDir = next ? movementDir(current, next) : 's'

    const elbow =
      beforeDir === 'h' || nextDir === 'v'
        ? { x: current.x, y: prev.y }
        : { x: prev.x, y: current.y }

    if (elbow.x !== prev.x || elbow.y !== prev.y) {
      result.push(elbow)
    }
    result.push(current)
  }

  return result
}

export const simplifyPoints = points => {
  if (points.length <= 2) return points
  const simplified = collapseCollinearPoints(points)
  const collapsed = [...simplified]

  let changed = true
  while (changed && collapsed.length >= 4) {
    changed = false
    for (let index = 0; index <= collapsed.length - 4; index += 1) {
      const p0 = collapsed[index]
      const p1 = collapsed[index + 1]
      const p2 = collapsed[index + 2]
      const p3 = collapsed[index + 3]
      const d1 = movementDir(p0, p1)
      const d2 = movementDir(p1, p2)
      const d3 = movementDir(p2, p3)
      if (d1 === 's' || d2 === 's' || d3 === 's') continue
      if (d1 !== d3 || d1 === d2) continue
      if (Math.min(segmentLength(p0, p1), segmentLength(p2, p3)) > 14) continue

      const replacement = d1 === 'h' ? { x: p0.x, y: p3.y } : { x: p3.x, y: p0.y }
      if (
        (replacement.x === p0.x && replacement.y === p0.y) ||
        (replacement.x === p3.x && replacement.y === p3.y)
      ) {
        continue
      }

      collapsed.splice(index + 1, 2, replacement)
      changed = true
      break
    }
  }

  return collapseCollinearPoints(orthogonalizePoints(collapsed))
}

const pathLength = points =>
  points.slice(1).reduce((sum, point, index) => sum + segmentLength(points[index], point), 0)

export const countTurns = points => {
  const normalized = simplifyPoints(points)
  let turns = 0
  for (let index = 1; index < normalized.length - 1; index += 1) {
    if (movementDir(normalized[index - 1], normalized[index]) !== movementDir(normalized[index], normalized[index + 1])) {
      turns += 1
    }
  }
  return turns
}

const segmentLaneKey = (from, to) => {
  if (from.x === to.x) return `x:${Math.round(from.x)}`
  if (from.y === to.y) return `y:${Math.round(from.y)}`
  return null
}

const lanePenaltyForPath = (points, usage) =>
  points.slice(1).reduce((sum, point, index) => {
    const prev = points[index]
    const key = segmentLaneKey(prev, point)
    const length = segmentLength(prev, point)
    if (!key || length < 28) return sum
    return sum + (usage.get(key) || 0) * 26
  }, 0)

const registerLaneUsage = (points, usage) => {
  points.slice(1).forEach((point, index) => {
    const prev = points[index]
    const key = segmentLaneKey(prev, point)
    const length = segmentLength(prev, point)
    if (!key || length < 28) return
    usage.set(key, (usage.get(key) || 0) + 1)
  })
}

export const pathClear = (points, obstacles) => {
  const normalized = simplifyPoints(points)
  for (let index = 1; index < normalized.length; index += 1) {
    const from = normalized[index - 1]
    const to = normalized[index]
    if (movementDir(from, to) === 's') return false
    if (obstacles.some(bounds => segmentIntersectsBounds(from, to, bounds))) return false
  }
  for (let index = 1; index < normalized.length - 1; index += 1) {
    if (obstacles.some(bounds => pointInBounds(normalized[index], bounds))) return false
  }
  return true
}

const buildSimpleCandidates = (start, end, extraPoints = []) => {
  const candidates = []
  const seen = new Set()
  const push = points => {
    const simplified = simplifyPoints(points)
    const key = simplified.map(point => `${point.x},${point.y}`).join('|')
    if (seen.has(key)) return
    seen.add(key)
    candidates.push(simplified)
  }

  push([start, end])
  push([start, { x: end.x, y: start.y }, end])
  push([start, { x: start.x, y: end.y }, end])

  extraPoints.forEach(point => {
    if (point.x != null) push([start, { x: point.x, y: start.y }, { x: point.x, y: end.y }, end])
    if (point.y != null) push([start, { x: start.x, y: point.y }, { x: end.x, y: point.y }, end])
  })

  return candidates
}

const buildCandidatePaths = (start, end, laneXs, laneYs) => {
  const candidates = []
  const seen = new Set()
  const push = points => {
    const simplified = simplifyPoints(points)
    const key = simplified.map(point => `${point.x},${point.y}`).join('|')
    if (seen.has(key)) return
    seen.add(key)
    candidates.push(simplified)
  }

  push([start, end])
  push([start, { x: end.x, y: start.y }, end])
  push([start, { x: start.x, y: end.y }, end])

  laneXs.forEach(x => push([start, { x, y: start.y }, { x, y: end.y }, end]))
  laneYs.forEach(y => push([start, { x: start.x, y }, { x: end.x, y }, end]))

  laneXs.slice(0, 8).forEach(x => {
    laneYs.slice(0, 8).forEach(y => {
      push([start, { x, y: start.y }, { x, y }, { x: end.x, y }, end])
      push([start, { x: start.x, y }, { x, y }, { x, y: end.y }, end])
    })
  })

  return candidates
}

const collectCandidateLanes = ({ start, end, obstacles, mode, baseLaneXs, baseLaneYs, width, height, minX, minY, maxX, maxY }) => {
  const spacing = mode === 'group' ? 28 : 22
  const xs = [...baseLaneXs, start.x, end.x, start.x - spacing, start.x + spacing, end.x - spacing, end.x + spacing]
  const ys = [...baseLaneYs, start.y, end.y, start.y - spacing, start.y + spacing, end.y - spacing, end.y + spacing]

  obstacles.forEach(bounds => {
    xs.push(bounds.left - spacing, bounds.right + spacing)
    ys.push(bounds.top - spacing, bounds.bottom + spacing)
  })

  return {
    xs: uniqueSorted(xs).filter(value => value >= (minX ?? 8) && value <= (maxX ?? width - 8)),
    ys: uniqueSorted(ys).filter(value => value >= (minY ?? 88) && value <= (maxY ?? height - 16)),
  }
}

const findGridPath = ({ start, end, obstacles, usage, mode, laneXs, laneYs }) => {
  const pointMap = new Map()
  const rowMap = new Map()
  const colMap = new Map()

  const ensurePoint = point => {
    const normalized = { x: Math.round(point.x), y: Math.round(point.y) }
    const key = `${normalized.x},${normalized.y}`
    if (!pointMap.has(key)) {
      pointMap.set(key, normalized)
      if (!rowMap.has(normalized.y)) rowMap.set(normalized.y, [])
      if (!colMap.has(normalized.x)) colMap.set(normalized.x, [])
      rowMap.get(normalized.y).push(normalized)
      colMap.get(normalized.x).push(normalized)
    }
    return key
  }

  laneYs.forEach(y => {
    laneXs.forEach(x => {
      const point = { x, y }
      if (obstacles.some(bounds => pointInBounds(point, bounds))) return
      ensurePoint(point)
    })
  })

  const startKey = ensurePoint(start)
  const endKey = ensurePoint(end)
  rowMap.forEach(points => points.sort((a, b) => a.x - b.x))
  colMap.forEach(points => points.sort((a, b) => a.y - b.y))

  const neighbors = new Map()
  const addNeighbor = (fromKey, toKey) => {
    if (!neighbors.has(fromKey)) neighbors.set(fromKey, [])
    neighbors.get(fromKey).push(toKey)
  }

  rowMap.forEach(points => {
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1]
      const to = points[index]
      if (obstacles.some(bounds => segmentIntersectsBounds(from, to, bounds))) continue
      const fromKey = `${from.x},${from.y}`
      const toKey = `${to.x},${to.y}`
      addNeighbor(fromKey, toKey)
      addNeighbor(toKey, fromKey)
    }
  })

  colMap.forEach(points => {
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1]
      const to = points[index]
      if (obstacles.some(bounds => segmentIntersectsBounds(from, to, bounds))) continue
      const fromKey = `${from.x},${from.y}`
      const toKey = `${to.x},${to.y}`
      addNeighbor(fromKey, toKey)
      addNeighbor(toKey, fromKey)
    }
  })

  const queue = [{ key: startKey, dir: 's', cost: 0, score: 0 }]
  const best = new Map([[`${startKey}|s`, 0]])
  const previous = new Map()

  while (queue.length) {
    queue.sort((a, b) => a.score - b.score)
    const current = queue.shift()
    if (!current) break
    if (current.key === endKey) {
      const path = []
      let walkKey = `${current.key}|${current.dir}`
      while (walkKey) {
        const [pointKey] = walkKey.split('|')
        path.unshift(pointMap.get(pointKey))
        walkKey = previous.get(walkKey)
      }
      return path.filter(Boolean)
    }

    const currentPoint = pointMap.get(current.key)
    const nextKeys = neighbors.get(current.key) || []
    nextKeys.forEach(nextKey => {
      const nextPoint = pointMap.get(nextKey)
      if (!currentPoint || !nextPoint) return
      const dir = movementDir(currentPoint, nextPoint)
      const distance = segmentLength(currentPoint, nextPoint)
      const turnPenalty = current.dir !== 's' && current.dir !== dir ? (mode === 'group' ? 58 : 42) : 0
      const lanePenalty = (usage.get(segmentLaneKey(currentPoint, nextPoint)) || 0) * (mode === 'group' ? 24 : 12)
      const nextCost = current.cost + distance + turnPenalty + lanePenalty
      const stateKey = `${nextKey}|${dir}`
      if (nextCost >= (best.get(stateKey) ?? Number.POSITIVE_INFINITY)) return
      best.set(stateKey, nextCost)
      previous.set(stateKey, `${current.key}|${current.dir}`)
      const heuristic = Math.abs(nextPoint.x - end.x) + Math.abs(nextPoint.y - end.y)
      queue.push({ key: nextKey, dir, cost: nextCost, score: nextCost + heuristic })
    })
  }

  return null
}

export const createOrthogonalRouter = ({
  width,
  height,
  baseLaneXs,
  baseLaneYs,
  minX = 8,
  minY = 88,
  maxX = width - 8,
  maxY = height - 16,
}) => ({
  choosePath({
    start,
    end,
    obstacles,
    usage,
    mode = 'group',
    simpleOnly = false,
    extraPoints = [],
    registerUsage = true,
  }) {
    const candidates = simpleOnly
      ? buildSimpleCandidates(start, end, extraPoints)
      : (() => {
          const { xs, ys } = collectCandidateLanes({
            start,
            end,
            obstacles,
            mode,
            baseLaneXs,
            baseLaneYs,
            width,
            height,
            minX,
            minY,
            maxX,
            maxY,
          })
          const rankedXs = [...xs].sort((a, b) => Math.abs(a - (start.x + end.x) / 2) - Math.abs(b - (start.x + end.x) / 2))
          const rankedYs = [...ys].sort((a, b) => Math.abs(a - (start.y + end.y) / 2) - Math.abs(b - (start.y + end.y) / 2))
          return buildCandidatePaths(start, end, rankedXs.slice(0, 12), rankedYs.slice(0, 12))
        })()

    const rankedCandidates = candidates
      .filter(points => pathClear(points, obstacles))
      .map(points => ({
        points: simplifyPoints(points),
        score: simpleOnly
          ? countTurns(points) * 1000 + pathLength(points)
          : pathLength(points) + countTurns(points) * (mode === 'group' ? 72 : 48) + lanePenaltyForPath(points, usage),
      }))
      .sort((a, b) => a.score - b.score)

    if (rankedCandidates.length) {
      if (registerUsage) registerLaneUsage(rankedCandidates[0].points, usage)
      return rankedCandidates[0].points
    }

    if (simpleOnly) return null

    const { xs, ys } = collectCandidateLanes({
      start,
      end,
      obstacles,
      mode,
      baseLaneXs,
      baseLaneYs,
      width,
      height,
      minX,
      minY,
      maxX,
      maxY,
    })
    const fallback = findGridPath({ start, end, obstacles, usage, mode, laneXs: xs, laneYs: ys }) || [start, { x: start.x, y: end.y }, end]
    const simplified = simplifyPoints(fallback)
    if (registerUsage) registerLaneUsage(simplified, usage)
    return simplified
  },
})
