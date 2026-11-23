/**
 * StyleSpec 与预设库
 * 自然语言 → StyleSpec → StyleResolver 翻译 → Cesium 渲染。
 * 预设 = 语义化命名 + 完整样式规格，LLM 只引用预设 ID + 白名单覆盖，避免编造 GLSL/材质。
 * @author ElizabethNiu / elizaniu18@gmail.com
 * @since 2026-11-23 16:46:35
 */

/** 预设库：预设 = 语义化命名 + 完整 StyleSpec */
export const PRESETS = {
  // 敌我识别
  friendly: {
    color: '#00d0ff',
    fillColor: 'rgba(0, 208, 255, 0.25)',
    outlineColor: '#00d0ff',
    width: 3,
    outlineWidth: 2,
    material: 'color',
    icon: 'pin'
  },
  hostile: {
    color: '#ff3b30',
    fillColor: 'rgba(255, 59, 48, 0.25)',
    outlineColor: '#ff3b30',
    width: 3,
    outlineWidth: 2,
    material: 'color',
    icon: 'triangle'
  },
  neutral: {
    color: '#ffcc00',
    fillColor: 'rgba(255, 204, 0, 0.22)',
    outlineColor: '#ffcc00',
    width: 3,
    outlineWidth: 2,
    material: 'color',
    icon: 'dot'
  },
  // 告警区 / 警戒区
  alertZone: {
    color: '#ff3b30',
    fillColor: 'rgba(255, 59, 48, 0.18)',
    outlineColor: '#ff3b30',
    width: 2,
    outlineWidth: 3,
    material: 'color',
    animation: 'pulse',
    icon: 'pin'
  },
  warningZone: {
    color: '#ff9500',
    fillColor: 'rgba(255, 149, 0, 0.20)',
    outlineColor: '#ff9500',
    width: 2,
    outlineWidth: 3,
    material: 'color',
    animation: 'blink',
    icon: 'pin'
  },
  // 卫星
  'sat-lean': {
    color: '#00d0ff',
    fillColor: 'rgba(0, 208, 255, 0.15)',
    outlineColor: '#00d0ff',
    width: 2,
    outlineWidth: 1,
    material: 'color',
    icon: 'dot'
  },
  'sat-alert': {
    color: '#ff3b30',
    fillColor: 'rgba(255, 59, 48, 0.2)',
    outlineColor: '#ff3b30',
    width: 2,
    outlineWidth: 1,
    material: 'color',
    animation: 'blink',
    icon: 'triangle'
  },
  'sat-offline': {
    color: '#8e8e93',
    fillColor: 'rgba(142, 142, 147, 0.15)',
    outlineColor: '#8e8e93',
    width: 1,
    outlineWidth: 1,
    material: 'color',
    icon: 'dot'
  },
  // 雷达
  'radar-friendly': {
    color: '#00d0ff',
    fillColor: 'rgba(0, 208, 255, 0.15)',
    outlineColor: '#00d0ff',
    width: 2,
    outlineWidth: 2,
    material: 'grid',
    animation: 'flow',
    icon: 'pin'
  },
  'radar-hostile': {
    color: '#ff3b30',
    fillColor: 'rgba(255, 59, 48, 0.18)',
    outlineColor: '#ff3b30',
    width: 2,
    outlineWidth: 2,
    material: 'grid',
    animation: 'pulse',
    icon: 'triangle'
  },
  'radar-neutral': {
    color: '#ffcc00',
    fillColor: 'rgba(255, 204, 0, 0.15)',
    outlineColor: '#ffcc00',
    width: 2,
    outlineWidth: 2,
    material: 'grid',
    icon: 'dot'
  },
  // 火箭 / 飞机 / 舰船 / 地面站
  'rocket-friendly': {
    color: '#00d0ff',
    fillColor: 'rgba(0, 208, 255, 0.2)',
    outlineColor: '#00d0ff',
    width: 2,
    outlineWidth: 2,
    material: 'color',
    animation: 'growth',
    icon: 'pin'
  },
  'rocket-hostile': {
    color: '#ff3b30',
    fillColor: 'rgba(255, 59, 48, 0.2)',
    outlineColor: '#ff3b30',
    width: 2,
    outlineWidth: 2,
    material: 'color',
    animation: 'growth',
    icon: 'triangle'
  },
  'air-hostile': {
    color: '#ff3b30',
    fillColor: 'rgba(255, 59, 48, 0.2)',
    outlineColor: '#ff3b30',
    width: 2,
    outlineWidth: 2,
    material: 'color',
    animation: 'blink',
    icon: 'triangle'
  },
  'ship-hostile': {
    color: '#ff3b30',
    fillColor: 'rgba(255, 59, 48, 0.2)',
    outlineColor: '#ff3b30',
    width: 2,
    outlineWidth: 2,
    material: 'color',
    icon: 'triangle'
  },
  'station-friendly': {
    color: '#00d0ff',
    fillColor: 'rgba(0, 208, 255, 0.2)',
    outlineColor: '#00d0ff',
    width: 2,
    outlineWidth: 2,
    material: 'color',
    icon: 'pin'
  },
  default: {
    color: '#cccccc',
    fillColor: 'rgba(204, 204, 204, 0.2)',
    outlineColor: '#cccccc',
    width: 2,
    outlineWidth: 1,
    material: 'color',
    icon: 'dot'
  }
}

/** 阵营 → 预设（作为无 stylePreset 时的兜底） */
export const CAMP_PRESET = {
  friend: 'friendly',
  hostile: 'hostile',
  neutral: 'neutral',
  unknown: 'default'
}

/** 解析：preset 引用 + 白名单覆盖 → 最终 StyleSpec */
export function resolveStyle(presetId, overrides) {
  const base = PRESETS[presetId ?? ''] ?? PRESETS['default']
  if (!overrides) return { ...base }
  const out = { ...base }
  if (overrides.color) out.color = overrides.color
  if (overrides.fillColor) out.fillColor = overrides.fillColor
  if (overrides.outlineColor) out.outlineColor = overrides.outlineColor
  if (typeof overrides.width === 'number') out.width = overrides.width
  if (typeof overrides.outlineWidth === 'number') out.outlineWidth = overrides.outlineWidth
  if (overrides.material) out.material = overrides.material
  if (overrides.animation) out.animation = overrides.animation
  if (overrides.icon) out.icon = overrides.icon
  return out
}
