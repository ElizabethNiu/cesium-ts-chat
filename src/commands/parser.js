/**
 * 命令解析器：自然语言/规范化语言 → 命令 IR
 * 一期用规则解析跑通命令链，后台 Agent 就绪后替换为 Ollama 调用。
 * @author ElizabethNiu / elizaniu18@gmail.com
 * @since 2026-11-23 16:46:35
 */
import { validateCommand } from './ir'

/** 内置预置命令（一期通过 UI 触发，不依赖后台 Agent） */
export const PRESET_ACTIONS = [
  {
    label: '画警戒区',
    text: '在南海海域画一个红色警戒区',
    build: () => ({
      op: 'draw',
      id: 'alert-zone-1',
      type: 'polygon',
      preset: 'alertZone',
      points: [
        { lon: 112, lat: 12 },
        { lon: 118, lat: 12 },
        { lon: 118, lat: 16 },
        { lon: 114, lat: 18 },
        { lon: 112, lat: 16 }
      ]
    })
  },
  {
    label: '画航线',
    text: '画一条从北京到上海的航线',
    build: () => ({
      op: 'draw',
      id: 'route-bj-sh',
      type: 'polyline',
      preset: 'friendly',
      points: [
        { lon: 116.4, lat: 39.9, height: 8000 },
        { lon: 121.47, lat: 31.23, height: 8000 }
      ]
    })
  },
  {
    label: '标记雷达点',
    text: '在关岛标记一个威胁点',
    build: () => ({
      op: 'draw',
      id: 'pt-guam',
      type: 'point',
      preset: 'hostile',
      points: [{ lon: 144.75, lat: 13.45, height: 120 }]
    })
  },
  {
    label: '聚焦空间站',
    text: '聚焦到国际空间站',
    build: () => ({
      op: 'focus',
      targetId: 'SAT-ISS',
      range: 500000
    })
  },
  {
    label: '卫星改告警样式',
    text: '把北斗三号改成告警样式',
    build: () => ({
      op: 'setStyle',
      targetId: 'SAT-BEIDOU3',
      preset: 'sat-alert'
    })
  },
  {
    label: '清除标绘',
    text: '清除所有标绘',
    build: () => ({
      op: 'clear'
    })
  },
  {
    label: '列出所有设备',
    text: '列出所有设备',
    build: () => ({
      op: 'list'
    })
  }
]

/** 规则解析自然语言 → 命令 IR。无法识别返回 null。 */
export function parseNaturalLanguage(text) {
  const t = (text ?? '').trim()

  // 精确匹配预置动作
  for (const a of PRESET_ACTIONS) {
    if (t === a.text) return a.build()
  }

  if (/警戒区|告警区/.test(t) && /画|绘制|标绘|添加/.test(t)) return PRESET_ACTIONS[0].build()
  if (/航线|轨迹|连线/.test(t) && /画|绘制|标绘|添加/.test(t)) return PRESET_ACTIONS[1].build()
  if (/威胁点|标记|标个点/.test(t)) return PRESET_ACTIONS[2].build()
  if (/聚焦|定位到|飞到/.test(t)) {
    if (/空间站|ISS/i.test(t)) return PRESET_ACTIONS[3].build()
    const m = t.match(/聚焦到\s*(.+)/)
    if (m) return { op: 'focus', targetId: m[1].trim(), range: 500000 }
    return PRESET_ACTIONS[3].build()
  }
  if (/改成|改为|设置.*样式|样式.*改成/.test(t) && /告警|红色|红/.test(t)) return PRESET_ACTIONS[4].build()
  if (/清除|清空|删除.*标绘/.test(t)) return PRESET_ACTIONS[5].build()
  if (/列出|有哪些|查看.*设备/.test(t)) return PRESET_ACTIONS[6].build()

  return null
}

/** 统一入口：解析 + 校验，返回 { ok, command?, error? } */
export function parseCommand(text) {
  const command = parseNaturalLanguage(text)
  if (!command) {
    return { ok: false, error: '无法识别该指令，请试试预置命令或换个说法' }
  }
  const err = validateCommand(command)
  if (err) return { ok: false, error: err }
  return { ok: true, command }
}
