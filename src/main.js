/**
 * 应用入口
 * 注册 Element Plus 组件库与 Pinia 状态管理，挂载根组件。
 * @author ElizabethNiu / elizaniu18@gmail.com
 * @since 2026-11-23 16:46:35
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import './style.css'

const app = createApp(App)

// 注册 Pinia 状态管理
app.use(createPinia())

// 注册 Element Plus 组件库（全量引入，一期不追求按需优化）
app.use(ElementPlus)

app.mount('#app')
