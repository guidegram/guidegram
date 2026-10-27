/**
 * groupedMediaLayout.ts
 * Proportional ratio solver for Telegram media albums (2 to 10 items) with residual allocation.
 * Port of Telegram Desktop's history_view_media_grouped.cpp & ui/grouped_layout.cpp.
 * Guarantees 0px width overflow and 0px gaps across all multi-media bubbles.
 */

export interface MediaDimensions {
  id: number | string
  width: number
  height: number
  aspectRatio: number
}

export interface MediaLayoutItem extends MediaDimensions {
  x: number
  y: number
  layoutWidth: number
  layoutHeight: number
  corners: {
    tl: number
    tr: number
    bl: number
    br: number
  }
}

export function computeGroupedMediaLayout(
  items: MediaDimensions[],
  containerWidth: number,
  maxHeight: number = 420,
  spacing: number = 4,
  cornerRadius: number = 16
): MediaLayoutItem[] {
  const count = items.length
  if (count === 0) return []
  if (count === 1) {
    const item = items[0]
    const ratio = Math.max(0.2, Math.min(3.0, item.aspectRatio || 1))
    const h = Math.min(maxHeight, Math.round(containerWidth / ratio))
    return [
      {
        ...item,
        x: 0,
        y: 0,
        layoutWidth: containerWidth,
        layoutHeight: h,
        corners: { tl: cornerRadius, tr: cornerRadius, bl: cornerRadius, br: cornerRadius },
      },
    ]
  }

  // Telegram Desktop row partitioning
  const rows: MediaDimensions[][] = []
  if (count === 2) {
    rows.push([items[0], items[1]])
  } else if (count === 3) {
    if ((items[0].aspectRatio || 1) >= 1.2) {
      rows.push([items[0]])
      rows.push([items[1], items[2]])
    } else {
      rows.push([items[0], items[1]])
      rows.push([items[2]])
    }
  } else if (count === 4) {
    rows.push([items[0], items[1]])
    rows.push([items[2], items[3]])
  } else if (count <= 6) {
    const firstRowLen = Math.ceil(count / 2)
    rows.push(items.slice(0, firstRowLen))
    rows.push(items.slice(firstRowLen))
  } else {
    // 7-10 items: 3 balanced rows
    const r1 = Math.ceil(count / 3)
    const r2 = Math.ceil((count - r1) / 2)
    rows.push(items.slice(0, r1))
    rows.push(items.slice(r1, r1 + r2))
    rows.push(items.slice(r1 + r2))
  }

  const numRows = rows.length
  const totalRowSpacing = (numRows - 1) * spacing
  const maxAvailableHeight = Math.max(100, maxHeight - totalRowSpacing)
  const targetRowHeight = Math.floor(maxAvailableHeight / numRows)

  const results: MediaLayoutItem[] = []
  let currentY = 0

  rows.forEach((row, rowIndex) => {
    const isSingleItemRow = row.length === 1
    const availableWidth = containerWidth - (row.length - 1) * spacing
    const totalRatio = row.reduce(
      (sum, it) => sum + Math.max(0.2, Math.min(3.0, it.aspectRatio || 1)),
      0
    )

    let rowHeight = isSingleItemRow
      ? Math.min(targetRowHeight * 1.5, Math.round(availableWidth / totalRatio))
      : Math.min(targetRowHeight, Math.round(availableWidth / totalRatio))
    rowHeight = Math.max(60, rowHeight)

    let currentX = 0
    let accumulatedWidth = 0

    row.forEach((item, colIndex) => {
      const isFirstRow = rowIndex === 0
      const isLastRow = rowIndex === numRows - 1
      const isFirstCol = colIndex === 0
      const isLastCol = colIndex === row.length - 1

      // Residual width allocation: Last item absorbs rounding difference to guarantee exact 0px delta
      let itemWidth: number
      if (isLastCol) {
        itemWidth = availableWidth - accumulatedWidth
      } else {
        const itemRatio = Math.max(0.2, Math.min(3.0, item.aspectRatio || 1))
        itemWidth = Math.round(availableWidth * (itemRatio / totalRatio))
        accumulatedWidth += itemWidth
      }

      results.push({
        ...item,
        x: currentX,
        y: currentY,
        layoutWidth: itemWidth,
        layoutHeight: rowHeight,
        corners: {
          tl: isFirstRow && isFirstCol ? cornerRadius : 0,
          tr: isFirstRow && isLastCol ? cornerRadius : 0,
          bl: isLastRow && isFirstCol ? cornerRadius : 0,
          br: isLastRow && isLastCol ? cornerRadius : 0,
        },
      })

      currentX += itemWidth + spacing
    })

    currentY += rowHeight + spacing
  })

  return results
}
