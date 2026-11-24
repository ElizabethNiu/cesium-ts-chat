/**
 * 公共组件统一注册
 * 集中管理 src/components 下的全局组件，main.js 中调用 registerComponents(app) 一次性注册。
 * 新增公共组件时，在此处 import 并加入 components 对象即可。
 * @author ElizabethNiu / elizaniu18@gmail.com
 * @since 2026-11-24 16:22:00
 */
import BasePanel from './BasePanel.vue'
import TargetDetail from './TargetDetail.vue'

/** 全局组件清单：组件名 → 组件定义 */
const components = {
  BasePanel,
  TargetDetail
}

/**
 * 注册所有公共组件为全局组件
 * @param {object} app Vue 应用实例
 * @returns {void}
 */
export function registerComponents(app) {
  Object.entries(components).forEach(([name, comp]) => {
    app.component(name, comp)
  })
}

export default components
