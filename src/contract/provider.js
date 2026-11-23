// Provider 接口与 Mock 实现
// MockProvider = 前端一期正式数据源（读本地 JSON）；ApiProvider 为二期开关（VITE_DATA_SOURCE=api）
import { normalizeDevices, defaultMappingConfig } from './mapRawDevice'

/** 本地 JSON 数据源（一期唯一形态） */
export class MockProvider {
  constructor(listUrl = '/data/devices.list.json', treeUrl = '/data/devices.tree.json', cfg = defaultMappingConfig) {
    this.name = 'mock'
    this.listUrl = listUrl
    this.treeUrl = treeUrl
    this.cfg = cfg
  }

  async load() {
    const res = await fetch(this.listUrl)
    const json = await res.json()
    return normalizeDevices(json, this.cfg)
  }

  async loadRawTree() {
    const res = await fetch(this.treeUrl)
    return res.json()
  }
}

/** 二期：后台 API 数据源（仅接口约定，不实现） */
export class ApiProvider {
  constructor(baseUrl = '/api', cfg = defaultMappingConfig) {
    this.name = 'api'
    this.baseUrl = baseUrl
    this.cfg = cfg
  }

  async load() {
    const res = await fetch(`${this.baseUrl}/devices`)
    const json = await res.json()
    return normalizeDevices(json, this.cfg)
  }
}

/** 工厂：根据 VITE_DATA_SOURCE 选择 Provider（默认 mock） */
export function createProvider() {
  const source = import.meta.env.VITE_DATA_SOURCE ?? 'mock'
  if (source === 'api') return new ApiProvider()
  return new MockProvider()
}
