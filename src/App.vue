<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { PlotRenderer } from './render/PlotRenderer'
import { createProvider } from './contract/provider'
import { PRESET_ACTIONS, parseCommand } from './commands/parser'

const containerRef = ref(null)
const inputText = ref('')
const messages = ref([])
const loading = ref(false)
const renderer = ref(null)
const deviceCount = ref(0)

function addMessage(role, text, list = null) {
  messages.value.push({ role, text, list, time: new Date().toLocaleTimeString() })
}

onMounted(async () => {
  renderer.value = new PlotRenderer(containerRef.value)
  renderer.value.init()

  // 加载设备
  try {
    const provider = createProvider()
    const targets = await provider.load()
    deviceCount.value = targets.filter((t) => t.category !== 'group').length
    await renderer.value.loadTargets(targets)
    addMessage('assistant', `已加载 ${deviceCount.value} 个目标设备（数据源：${provider.name}）。`)
    addMessage(
      'assistant',
      '可以点下方快捷命令，或输入自然语言指令，例如「在南海海域画一个红色警戒区」。'
    )
  } catch (e) {
    addMessage('assistant', `加载数据失败：${e.message}`)
  }
})

function runCommand(command) {
  const res = renderer.value.execute(command)
  if (res.ok) {
    addMessage('assistant', res.message, res.list)
  } else {
    addMessage('assistant', `⚠️ ${res.error}`)
  }
}

function submit() {
  const text = inputText.value.trim()
  if (!text) return
  addMessage('user', text)
  inputText.value = ''
  loading.value = true

  // 模拟轻量延迟，一期规则解析
  setTimeout(() => {
    const r = parseCommand(text)
    if (r.ok) {
      runCommand(r.command)
    } else {
      addMessage('assistant', `⚠️ ${r.error}`)
    }
    loading.value = false
  }, 200)
}

function runPreset(action) {
  addMessage('user', action.text)
  runCommand(action.build())
}
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
        <span class="badge">Vue3 + Vite + JS + Cesium</span>
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
        <button
          v-for="a in PRESET_ACTIONS"
          :key="a.label"
          class="preset-btn"
          @click="runPreset(a)"
        >
          {{ a.label }}
        </button>
      </div>

      <!-- 输入框 -->
      <div class="input-row">
        <input
          v-model="inputText"
          placeholder="输入指令，如：画一条从北京到上海的航线"
          @keyup.enter="submit"
        />
        <button class="send-btn" @click="submit">发送</button>
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

.preset-btn {
  font-size: 12px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  transition: all 0.15s;
}

.preset-btn:hover {
  background: rgba(0, 208, 255, 0.12);
  border-color: var(--accent);
}

.input-row {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
}

.input-row input {
  flex: 1;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-size: 13px;
  outline: none;
}

.input-row input:focus {
  border-color: var(--accent);
}

.send-btn {
  padding: 9px 16px;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: #04202c;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.send-btn:hover {
  opacity: 0.9;
}
</style>
