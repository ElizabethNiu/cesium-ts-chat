<template>
  <div class="app">
    <!-- 地图容器 -->
    <div ref="containerRef" class="app-map-container"></div>

    <!-- 顶部标题栏 -->
    <header class="app-topbar">
      <div class="app-brand">
        <span class="app-logo">◎</span>
        <span>二三维地球态势标绘 · 最小 Demo</span>
        <span class="app-badge">Vue3 + Vite + JS + Cesium + Element Plus</span>
      </div>
      <div class="app-stats">
        <span class="app-stat">目标 <b>{{ $store.plot.deviceCount }}</b></span>
      </div>
    </header>

    <!-- 对话面板（BasePanel 容器） -->
    <base-panel
      v-if="chatVisible"
      class="app-chat-panel"
      title="自然语言标绘"
      :x="null"
      :y="null"
      :width="360"
      :height="520"
      :min-width="280"
      :min-height="320"
      @close="closeChat"
    >
      <!-- 消息列表 -->
      <div class="app-messages">
        <div
          v-for="m in $store.plot.messages"
          :key="m.time + m.text"
          class="app-msg"
          :class="m.role"
        >
          <div class="app-msg-bubble">{{ m.text }}</div>
          <ul v-if="m.list && m.list.length" class="app-msg-list">
            <li v-for="item in m.list" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div v-if="$store.plot.loading" class="app-msg assistant">
          <div class="app-msg-bubble typing">思考中…</div>
        </div>
      </div>

      <!-- 预置命令 -->
      <div class="app-presets">
        <el-button
          v-for="a in presetActions"
          :key="a.label"
          size="small"
          round
          class="app-preset-btn"
          @click="runPreset(a)"
        >
          {{ a.label }}
        </el-button>
      </div>

      <!-- 输入框 -->
      <div class="app-input-row">
        <el-input
          v-model="inputText"
          placeholder="输入指令，如：画一条从北京到上海的航线"
          @keyup.enter="submit"
        />
        <el-button type="primary" class="app-send-btn" @click="submit">发送</el-button>
      </div>
    </base-panel>

    <!-- 目标详情弹窗（BasePanel 容器 + TargetDetail 内容） -->
    <base-panel
      v-if="detailVisible && detailTarget"
      class="app-detail-panel"
      :title="detailTarget.name"
      :x="null"
      :y="null"
      :width="360"
      :height="420"
      :min-width="300"
      :min-height="280"
      @close="closeDetail"
    >
      <target-detail :target="detailTarget" />
    </base-panel>
  </div>
</template>

<script>
/**
 * 根组件：二三维地球态势标绘 Demo
 * 组合 Cesium 地图容器 + 自然语言对话面板，串联数据加载与命令执行链路。
 * 对话面板与目标详情弹窗均以全局组件 BasePanel 作为容器。
 * 采用 Vue 全生命周期（Options API）写法，样式内联于 <style lang="scss" scoped>。
 * @author ElizabethNiu / elizaniu18@gmail.com
 * @since 2026-11-24 16:30:00
 */
import { markRaw } from 'vue'
import { PlotRenderer } from './render/plot-renderer'
import { createProvider } from './contract/provider'
import { PRESET_ACTIONS, parseCommand } from './commands/parser'

export default {
  name: 'App',

  data() {
    return {
      // 预置命令动作列表（模板需访问，故暴露到 data）
      presetActions: PRESET_ACTIONS,
      // 输入框文本
      inputText: '',
      // 渲染管理器实例（markRaw 避免 Vue 深度代理 Cesium Viewer）
      renderer: null,
      // 对话面板是否显示
      chatVisible: true,
      // 目标详情弹窗状态
      detailVisible: false,
      detailTarget: null
    }
  },

  methods: {
    /**
     * 执行命令并回填结果消息
     * 聚焦命令成功后，同步弹出该目标的详情面板
     * @param {object} command 命令 IR 对象
     * @returns {void}
     */
    runCommand(command) {
      const res = this.renderer.execute(command)
      if (res.ok) {
        this.$store.plot.addMessage('assistant', res.message, res.list)
        // 聚焦目标成功后，自动弹出目标详情
        if (command.op === 'focus') {
          this.showTargetDetail(command.targetId)
        }
      } else {
        this.$store.plot.addMessage('assistant', `⚠️ ${res.error}`)
      }
    },

    /**
     * 根据目标 ID 弹出目标详情面板
     * @param {string} targetId 目标 ID
     * @returns {void}
     */
    showTargetDetail(targetId) {
      const target = this.$store.plot.targets.find((t) => t.id === targetId)
      if (!target) return
      this.detailTarget = target
      this.detailVisible = true
    },

    /**
     * 提交用户输入的自然语言指令
     * 解析失败时提示，成功则执行对应命令
     * @returns {void}
     */
    submit() {
      const text = this.inputText.trim()
      if (!text) return
      this.$store.plot.addMessage('user', text)
      this.inputText = ''
      this.$store.plot.setLoading(true)

      // 模拟轻量延迟，一期规则解析；后台 Agent 就绪后替换为 Ollama 调用
      setTimeout(() => {
        const r = parseCommand(text)
        if (r.ok) {
          this.runCommand(r.command)
        } else {
          this.$store.plot.addMessage('assistant', `⚠️ ${r.error}`)
        }
        this.$store.plot.setLoading(false)
      }, 200)
    },

    /**
     * 触发预置命令按钮
     * @param {object} action 预置动作对象（含 label/text/build）
     * @returns {void}
     */
    runPreset(action) {
      this.$store.plot.addMessage('user', action.text)
      this.runCommand(action.build())
    },

    /**
     * 关闭对话面板
     * @returns {void}
     */
    closeChat() {
      this.chatVisible = false
    },

    /**
     * 处理态势图实体点选，弹出目标详情
     * @param {object} picked 点选结果（{ type, id }）
     * @returns {void}
     */
    handlePickEntity(picked) {
      if (!picked || picked.type !== 'device') return
      this.showTargetDetail(picked.id)
    },

    /**
     * 关闭目标详情弹窗
     * @returns {void}
     */
    closeDetail() {
      this.detailVisible = false
      this.detailTarget = null
    }
  },

  async mounted() {
    this.renderer = markRaw(new PlotRenderer(this.$refs.containerRef))
    this.renderer.init()
    // 注册实体点选回调，态势图上点目标弹出详情
    this.renderer.setPickCallback(this.handlePickEntity)

    // 加载设备并渲染
    try {
      const provider = createProvider()
      const targets = await provider.load()
      this.$store.plot.setTargets(targets)
      await this.renderer.loadTargets(targets)
      this.$store.plot.addMessage(
        'assistant',
        `已加载 ${this.$store.plot.deviceCount} 个目标设备（数据源：${provider.name}）。`
      )
      this.$store.plot.addMessage(
        'assistant',
        '可以点下方快捷命令，或输入自然语言指令，例如「在南海海域画一个红色警戒区」。'
      )
    } catch (e) {
      this.$store.plot.addMessage('assistant', `加载数据失败：${e.message}`)
    }
  },

  // 组件销毁时释放 Cesium Viewer
  beforeUnmount() {
    this.renderer?.destroy()
    this.renderer = null
  }
}
</script>

<style lang="scss" scoped>
.app {
  position: relative;
  height: 100%;
  width: 100%;
}

.app-map-container {
  position: absolute;
  inset: 0;
}

.app-topbar {
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

.app-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.app-logo {
  color: var(--accent);
  font-size: 20px;
}

.app-badge {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-dim);
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.app-stats {
  display: flex;
  gap: 12px;
}

.app-stat {
  font-size: 13px;
  color: var(--text-dim);
}

.app-stat b {
  color: var(--accent);
}

/* 对话面板定位：右上角 */
.app-chat-panel {
  right: 16px;
  top: 64px;
}

/* 目标详情弹窗定位：居中偏右 */
.app-detail-panel {
  right: 200px;
  top: 120px;
}

.app-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.app-msg {
  display: flex;
  flex-direction: column;
}

.app-msg.user {
  align-items: flex-end;
}

.app-msg.assistant {
  align-items: flex-start;
}

.app-msg-bubble {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.app-msg.user .app-msg-bubble {
  background: var(--accent);
  color: #04202c;
}

.app-msg.assistant .app-msg-bubble {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text);
}

.app-msg-bubble.typing {
  color: var(--text-dim);
  animation: app-blink 1s infinite;
}

@keyframes app-blink {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

.app-msg-list {
  margin-top: 6px;
  margin-left: 4px;
  padding-left: 16px;
  font-size: 12px;
  color: var(--text-dim);
  max-height: 140px;
  overflow-y: auto;
}

.app-msg-list li {
  margin: 2px 0;
}

.app-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
}

/* Element Plus 按钮样式微调，保持深色科技风 */
.app-preset-btn {
  color: var(--accent);
  border-color: var(--border);
  background: transparent;
}

.app-preset-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: rgba(0, 208, 255, 0.12);
}

.app-input-row {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
}

.app-input-row :deep(.el-input) {
  flex: 1;
}

.app-send-btn {
  flex-shrink: 0;
}

/* Cesium 内置控件深色主题适配：时间轴、动画、导航按钮 */
:deep(.cesium-viewer-bottom) {
  left: 0;
  right: 16px;
}

:deep(.cesium-viewer-timelineContainer) {
  background: var(--panel-bg);
  border-top: 1px solid var(--border);
}

:deep(.cesium-timeline-main) {
  background: transparent;
}

:deep(.cesium-viewer-animationContainer) {
  background: var(--panel-bg);
  border-right: 1px solid var(--border);
  border-top: 1px solid var(--border);
}

:deep(.cesium-viewer-toolbar),
:deep(.cesium-viewer-fullscreenContainer),
:deep(.cesium-viewer-homeButtonContainer),
:deep(.cesium-sceneModePicker-wrapper) {
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
}
</style>
