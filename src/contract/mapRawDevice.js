// 字段映射层：RawDevice → TargetData
// 后台字段/枚举/list-tree 形态最终确定后，只改本文件 + MappingConfig，其余层零改动

/** 默认映射配置（候选版，字段锁定后同步即可） */
export const defaultMappingConfig = {
  // 国别码 → 阵营（friend/hostile/neutral/unknown）
  countryToCamp: {
    CN: 'friend',
    RU: 'neutral',
    US: 'hostile',
    JP: 'neutral',
    INTL: 'neutral'
  },
  // 后台类型字符串 → 归一类别
  typeMap: {
    satellite: 'satellite',
    sat: 'satellite',
    radar: 'radar',
    rocket: 'rocket',
    aircraft: 'aircraft',
    air: 'aircraft',
    plane: 'aircraft',
    ship: 'ship',
    vessel: 'ship',
    station: 'station',
    ground: 'station'
  },
  defaultCamp: 'unknown'
}

export function resolveCamp(country, cfg = defaultMappingConfig) {
  return cfg.countryToCamp[country] ?? cfg.defaultCamp
}

export function resolveCategory(type, cfg = defaultMappingConfig) {
  const t = (type ?? '').toLowerCase()
  return cfg.typeMap[t] ?? 'unknown'
}

/** 提取位置：geo 优先，其次 tle */
export function extractPosition(r) {
  if (
    r.longitude != null &&
    r.latitude != null &&
    !Number.isNaN(r.longitude) &&
    !Number.isNaN(r.latitude)
  ) {
    return { kind: 'geo', lon: r.longitude, lat: r.latitude, height: r.height ?? 0 }
  }
  if (r.tle1 && r.tle2) {
    return { kind: 'tle', line1: r.tle1, line2: r.tle2, epoch: r.epoch ?? undefined }
  }
  return { kind: 'geo', lon: 0, lat: 0, height: 0 }
}

/** 单个设备映射 */
export function mapRawDevice(r, cfg = defaultMappingConfig) {
  return {
    id: r.id,
    name: r.name,
    country: r.country,
    camp: resolveCamp(r.country, cfg),
    category: resolveCategory(r.type, cfg),
    position: extractPosition(r),
    status: r.status ?? 'unknown',
    stylePreset: r.stylePreset ?? 'default',
    features: r.features ?? {}
  }
}

/**
 * 兼容 list / tree 两种形态，统一输出扁平设备列表。
 * tree 形态：深度遍历 roots（含 children）；分组节点（有 children 且无位置）标记为 group。
 */
export function flattenDevices(nodes, cfg = defaultMappingConfig) {
  const out = []
  const walk = (list) => {
    for (const n of list) {
      const mapped = mapRawDevice(n, cfg)
      if (
        n.children &&
        n.children.length > 0 &&
        n.longitude == null &&
        n.latitude == null &&
        !n.tle1
      ) {
        mapped.category = 'group'
      }
      out.push(mapped)
      if (n.children && n.children.length > 0) walk(n.children)
    }
  }
  walk(nodes)
  return out
}

/** 入口：RawDeviceInput → 扁平 TargetData[] */
export function normalizeDevices(input, cfg = defaultMappingConfig) {
  if (input.format === 'tree' && input.roots) {
    return flattenDevices(input.roots, cfg)
  }
  if (input.devices) {
    return input.devices.map((d) => mapRawDevice(d, cfg))
  }
  return []
}
