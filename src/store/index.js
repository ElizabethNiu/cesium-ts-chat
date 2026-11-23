/**
 * 状态管理入口
 * 1. 创建 Pinia 实例（供 main.js 中 app.use 注册）。
 * 2. 通用 store 直接在本文件定义（如全局加载态、用户信息等跨模块共享状态）。
 * 3. 各业务模块 store 定义在 module/ 目录下，在此汇总导出。
 * @author ElizabethNiu / elizaniu18@gmail.com
 * @since 2026-11-23 17:10:00
 */
import { createPinia, defineStore } from 'pinia'
// 业务模块 store
import { usePlotStore } from './module/plot'

/**
 * 通用 store：全局共享状态
 * 存放跨模块、与具体业务无关的状态（如全局主题、加载遮罩等）。
 * 当前项目暂无通用状态，先定义骨架，后续有需求时在此扩展。
 */
export const useCommonStore = defineStore('common', {
  state: () => ({
    // 全局加载态（预留）
    globalLoading: false
  }),
  actions: {
    /** 设置全局加载态 */
    setGlobalLoading(loading) {
      this.globalLoading = loading
    }
  }
})

// 创建 Pinia 实例，供 main.js 注册
export const pinia = createPinia()

// 汇总导出所有模块 store，供组件按需引入
export { usePlotStore }
export default pinia
