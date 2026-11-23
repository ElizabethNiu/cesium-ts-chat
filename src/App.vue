<script setup>
/**
 * 根组件：二三维地球态势标绘 Demo
 * 组合 Cesium 地图容器 + 自然语言对话面板，串联数据加载与命令执行链路。
 * @author ElizabethNiu / elizaniu18@gmail.com
 * @since 2026-11-23 16:46:35
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { PlotRenderer } from './render/PlotRenderer'
import { createProvider } from './contract/provider'
import { PRESET_ACTIONS, parseCommand } from './commands/parser'
import { usePlotStore } from './store/plot'

// 地图容器 DOM 引用
const containerRef = ref(null)
// 输入框文本
const inputText = ref('')
// 渲染管理器实例（非响应式，避免 Vue 深度代理 Cesium Viewer）
const renderer = ref(null)

const store = usePlotStore()
const { messages, loading, deviceCount } = storeToRefs(store)

/**
 * 执行命令并回填结果消息
 * @param {object} command 命令 IR 对象
 */
const runCommand = (command) => {
  const res = renderer.value.execute(command)
  if (res.ok) {
    store.addMessage('assistant', res.message, res.list)
  } else {
    store.addMessage('assistant', `⚠️ ${res.error}`)
  }
}

/**
 * 提交用户输入的自然语言指令
 * 解析失败时提示，成功则执行对应命令
 */
const submit = () => {
  const text = inputText.value.trim()
  if (!text) return
  store.addMessage('user', text)
  inputText.value = ''
  store.setLoading(true)

  // 模拟轻量延迟，一期规则解析；后台 Agent 就绪后替换为 Ollama 调用
  setTimeout(() => {
    const r = parseCommand(text)
    if (r.ok) {
      runCommand(r.command)
    } else {
      store.addMessage('assistant', `⚠️ ${r.error}`)
    }
    store.setLoading(false)
  }, 200)
}

/**
 * 触发预置命令按钮
 * @param {object} action 预置动作对象（含 label/text/build）
 */
const runPreset = (action) => {
  store.addMessage('user', action.text)
  runCommand(action.build())
}

onMounted(async () => {
  renderer.value = new PlotRenderer(containerRef.value)
  renderer.value.init()

  // 加载设备并渲染
  try {
    const provider = createProvider()
    const targets = await provider.load()
    store.setTargets(targets)
    await renderer.value.loadTargets(targets)
    store.addMessage(
      'assistant',
      `已加载 ${deviceCount.value} 个目标设备（数据源：${provider.name}）。`
    )
    store.addMessage(
      'assistant',
      '可以点下方快捷命令，或输入自然语言指令，例如「在南海海域画一个红色警戒区」。'
    )
  } catch (e) {
    store.addMessage('assistant', `加载数据失败：${e.message}`)
  }
})

// 组件销毁时释放 Cesium Viewer，避免内存泄漏
onBeforeUnmount(() => {
  renderer.value?.destroy()
  renderer.value = null
})
</script>

<template>
  <div class="app">
    <!-- 地图容器 -->
    <div ref="containerRef" class="map-container"></div>

    <!-- 顶部标题栏 -->
    <header class="topbar">
      <div class="brand">
        <span class="logo">◎</span>
        <span>二三维地球态势标绘 · 最小 Demo</span>
        <span class="badge">Vue3 + Vite + JS + Cesium + Element Plus</span>
      </div>
      <div class="stats">
        <span class="stat">目标 <b>{{ deviceCount }}</b></span>
      </div>
    </header>

    <!-- 对话面板 -->
    <aside class="chat-panel">
      <div class="chat-header">自然语言标绘</div>

      <div class="messages">
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="msg"
          :class="m.role"
        >
          <div class="msg-bubble">{{ m.text }}</div>
          <ul v-if="m.list && m.list.length" class="msg-list">
            <li v-for="(item, j) in m.list" :key="j">{{ item }}</li>
          </ul>
        </div>
        <div v-if="loading" class="msg assistant">
          <div class="msg-bubble typing">思考中…</div>
        </div>
      </div>

      <!-- 预置命令 -->
      <div class="presets">
        <el-button
          v-for="a in PRESET_ACTIONS"
          :key="a.label"
          size="small"
          round
          class="preset-btn"
          @click="runPreset(a)"
        >
          {{ a.label }}
        </el-button>
      </div>

      <!-- 输入框 -->
      <div class="input-row">
        <el-input
          v-model="inputText"
          placeholder="输入指令，如：画一条从北京到上海的航线"
          @keyup.enter="submit"
        />
        <el-button type="primary" class="send-btn" @click="submit">发送</el-button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.app {
  position: relative;
  height: 100%;
  width: 100%;
}

.map-container {
  position: absolute;
  inset: 0;
}

.topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: linear-gradient(180deg, rgba(11, 26, 42, 0.9), rgba(11, 26, 42, 0));
  pointer-events: none;
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.logo {
  color: var(--accent);
  font-size: 20px;
}

.badge {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-dim);
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.stats {
  display: flex;
  gap: 12px;
}

.stat {
  font-size: 13px;
  color: var(--text-dim);
}

.stat b {
  color: var(--accent);
}

.chat-panel {
  position: absolute;
  right: 16px;
  top: 64px;
  bottom: 16px;
  width: 360px;
  display: flex;
  flex-direction: column;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  overflow: hidden;
  z-index: 10;
}

.chat-header {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.msg {
  display: flex;
  flex-direction: column;
}

.msg.user {
  align-items: flex-end;
}

.msg.assistant {
  align-items: flex-start;
}

.msg-bubble {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.msg.user .msg-bubble {
  background: var(--accent);
  color: #04202c;
}

.msg.assistant .msg-bubble {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text);
}

.msg-bubble.typing {
  color: var(--text-dim);
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.msg-list {
  margin-top: 6px;
  margin-left: 4px;
  padding-left: 16px;
  font-size: 12px;
  color: var(--text-dim);
  max-height: 140px;
  overflow-y: auto;
}

.msg-list li {
  margin: 2px 0;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
}

/* Element Plus 按钮样式微调，保持深色科技风 */
.preset-btn {
  color: var(--accent);
  border-color: var(--border);
  background: transparent;
}

.preset-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: rgba(0, 208, 255, 0.12);
}

.input-row {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
}

.input-row .el-input {
  flex: 1;
}

.send-btn {
  flex-shrink: 0;
}
</style>
