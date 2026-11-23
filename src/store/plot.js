/**
 * 全局状态管理（Pinia store）
 * 按规范禁止使用全局变量，统一通过 Pinia 管理设备列表与对话消息。
 * @author ElizabethNiu / elizaniu18@gmail.com
 * @since 2026-11-23 16:46:35
 */
import { defineStore } from 'pinia'

export const usePlotStore = defineStore('plot', {
  state: () => ({
    // 已加载的设备列表（TargetData[]）
    targets: [],
    // 设备数量（排除分组节点）
    deviceCount: 0,
    // 对话消息列表
    messages: [],
    // 是否处于"思考中"状态
    loading: false
  }),

  getters: {
    /**
     * 非分组的实际设备数量
     * 分组节点（group 类别）不参与渲染，故单独统计
     */
    realDeviceCount: (state) =>
      state.targets.filter((t) => t.category !== 'group').length
  },

  actions: {
    /**
     * 写入设备列表并同步设备数量
     * @param {Array} targets 扁平化的设备列表
     */
    setTargets(targets) {
      this.targets = targets
      this.deviceCount = this.realDeviceCount
    },

    /**
     * 追加一条对话消息
     * @param {string} role 角色：user | assistant
     * @param {string} text 文本内容
     * @param {Array|null} list 可选的列表内容
     */
    addMessage(role, text, list = null) {
      this.messages.push({
        role,
        text,
        list,
        time: new Date().toLocaleTimeString()
      })
    },

    /** 切换"思考中"状态 */
    setLoading(loading) {
      this.loading = loading
    }
  }
})
