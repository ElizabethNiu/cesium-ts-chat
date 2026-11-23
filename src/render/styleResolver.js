// StyleResolver：StyleSpec → Cesium 渲染参数
// 统一使用原生 Cesium 材质 API（ColorMaterial / GridMaterial / 虚线材质）
import {
  Color,
  ColorMaterialProperty,
  GridMaterialProperty,
  PolylineDashMaterialProperty,
  Cartesian2
} from 'cesium'

/** 十六进制/rgba → Cesium Color */
export function toColor(str) {
  if (!str) return Color.WHITE
  return Color.fromCssColorString(str)
}

/**
 * 解析线材质（MaterialProperty）
 * material: color | grid（image 一期用 color 兜底）
 */
export function lineMaterial(spec) {
  if (spec.material === 'grid') {
    return new GridMaterialProperty({
      color: toColor(spec.color),
      cellAlpha: 0.3,
      lineCount: new Cartesian2(8, 8)
    })
  }
  return new ColorMaterialProperty(toColor(spec.color))
}

/** 解析描边（虚线）材质，用于告警/警戒区脉冲描边 */
export function outlineMaterial(spec) {
  if (spec.animation === 'pulse' || spec.animation === 'blink') {
    return new PolylineDashMaterialProperty({
      color: toColor(spec.outlineColor),
      dashLength: 16,
      dashPattern: 0xff00
    })
  }
  return new ColorMaterialProperty(toColor(spec.outlineColor))
}

/** 点图标 SVG 数据 URI（pin / triangle / dot） */
export function iconDataUri(icon, color) {
  const c = color || '#00d0ff'
  if (icon === 'triangle') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><polygon points="12,2 22,20 2,20" fill="${c}" stroke="#fff" stroke-width="1.5"/></svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  }
  if (icon === 'pin') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" fill="${c}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="9" r="2.5" fill="#fff"/></svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="7" fill="${c}" stroke="#fff" stroke-width="1.5"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
