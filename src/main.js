/**
 * 应用入口
 * 注册 Element Plus 组件库与 Pinia 状态管理，挂载根组件。
 * 将聚合后的 store 挂载到 this.$store，供各组件通过 Options API 访问。
 * @author ElizabethNiu / elizaniu18@gmail.com
 * @since 2026-11-23 17:10:00
 */
import { createApp, markRaw } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import './style/index.scss'
import { pinia, useCommonStore, usePlotStore } from './store'
import { registerComponents } from './components/register'

const app = createApp(App)

// 注册公共组件为全局组件（BasePanel 等）
registerComponents(app)

// 注册 Pinia 状态管理
app.use(pinia)

// 聚合各模块 store 实例并挂载到 this.$store（markRaw 避免 Vue 深度代理）
const store = markRaw({
  // 通用 store（直接挂顶层，如 store.globalLoading）
  ...useCommonStore(),
  // 业务模块 store（按模块名挂载，如 store.plot.deviceCount）
  plot: usePlotStore()
})
app.config.globalProperties.$store = store

// 注册 Element Plus 组件库（全量引入，一期不追求按需优化）
app.use(ElementPlus)

app.mount('#app')
