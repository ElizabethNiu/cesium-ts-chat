/**
 * 命令 IR（Intermediate Representation）
 * LLM 不直接生成 Cesium API 代码，而是输出结构化命令；样式走预设引用 + 白名单覆盖，防幻觉。
 * 本文件负责命令结构校验，拦截非法字段，是防幻觉的第一道防线。
 * @author ElizabethNiu / elizaniu18@gmail.com
 * @since 2026-11-23 16:46:35
 */

/** 校验命令结构（轻量白名单校验，拦截非法字段） */
export function validateCommand(cmd) {
  if (!cmd || typeof cmd !== 'object') return '命令为空'
  if (!cmd.op) return '缺少 op 字段'
  const ops = ['draw', 'setStyle', 'focus', 'clear', 'list']
  if (!ops.includes(cmd.op)) return `非法 op: ${cmd.op}`

  if (cmd.op === 'draw') {
    const d = cmd
    if (!['point', 'polyline', 'polygon'].includes(d.type)) return `非法 type: ${d.type}`
    if (!Array.isArray(d.points) || d.points.length === 0) return 'draw 缺少 points'
    if (d.type === 'point' && d.points.length !== 1) return 'point 仅需 1 个点'
    if (d.type === 'polyline' && d.points.length < 2) return 'polyline 至少 2 个点'
    if (d.type === 'polygon' && d.points.length < 3) return 'polygon 至少 3 个点'
    for (const p of d.points) {
      if (typeof p.lon !== 'number' || typeof p.lat !== 'number') return '坐标非法'
    }
  }
  if ((cmd.op === 'setStyle' || cmd.op === 'focus') && !cmd.targetId) {
    return `${cmd.op} 缺少 targetId`
  }
  return null
}
