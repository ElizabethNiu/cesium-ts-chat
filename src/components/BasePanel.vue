<template>
  <div
    class="base-panel"
    :class="{ 'is-minimized': minimized, 'is-maximized': maximized }"
    :style="panelStyle"
  >
    <!-- 标题栏 -->
    <div
      class="base-panel-header"
      :class="{ 'is-draggable': draggable }"
      @mousedown="startDrag"
    >
      <span class="base-panel-title">
        <slot name="title">{{ title }}</slot>
      </span>

      <div class="base-panel-actions">
        <!-- 自定义右侧按钮插槽 -->
        <slot name="header-actions"></slot>

        <el-button
          v-if="minimizable"
          text
          circle
          size="small"
          class="base-panel-btn"
          :title="minimized ? '还原' : '最小化'"
          @mousedown.stop
          @click="toggleMinimize"
        >
          {{ minimized ? '＋' : '－' }}
        </el-button>

        <el-button
          v-if="maximizable"
          text
          circle
          size="small"
          class="base-panel-btn"
          :title="maximized ? '还原' : '最大化'"
          @mousedown.stop
          @click="toggleMaximize"
        >
          {{ maximized ? '▣' : '▢' }}
        </el-button>

        <el-button
          v-if="closable"
          text
          circle
          size="small"
          class="base-panel-btn base-panel-close"
          title="关闭"
          @mousedown.stop
          @click="handleClose"
        >
          ✕
        </el-button>
      </div>
    </div>

    <!-- 主体内容 -->
    <div v-if="!minimized" class="base-panel-body">
      <slot></slot>
    </div>

    <!-- 右下角拖拽手柄 -->
    <div
      v-if="!minimized && !maximized && resizable"
      class="base-panel-resize"
      @mousedown="startResize"
    ></div>
  </div>
</template>
<script>
/**
 * 基础窗口面板组件（BasePanel）
 * 提供可拖动、可调整大小、最大化、最小化（收起）、关闭等通用窗口能力，
 * 支持自定义标题、自定义右侧按钮（header-actions 插槽）与主体内容（默认插槽）。
 * 作为全局组件使用，采用 Vue 全生命周期（Options API）写法。
 * @author ElizabethNiu / elizaniu18@gmail.com
 * @since 2026-11-24 16:20:00
 */
export default {
  name: 'BasePanel',

  props: {
    // 面板标题
    title: { type: String, default: '' },
    // 初始位置（px，相对父容器左上角）
    x: { type: Number, default: null },
    y: { type: Number, default: null },
    // 初始宽高（px）
    width: { type: Number, default: 360 },
    height: { type: Number, default: 480 },
    // 宽高最小值限制
    minWidth: { type: Number, default: 280 },
    minHeight: { type: Number, default: 240 },
    // 能力开关
    draggable: { type: Boolean, default: true },
    resizable: { type: Boolean, default: true },
    maximizable: { type: Boolean, default: true },
    minimizable: { type: Boolean, default: true },
    closable: { type: Boolean, default: true }
  },

  emits: ['close', 'minimize', 'maximize', 'restore'],

  data() {
    return {
      // 是否已最小化（收起为主体仅剩标题栏）
      minimized: false,
      // 是否已最大化（铺满父容器）
      maximized: false,
      // 当前位置与尺寸（最大化前的状态用于还原）
      posX: this.x,
      posY: this.y,
      sizeW: this.width,
      sizeH: this.height,
      // 还原用：最大化前的位置与尺寸
      _prevX: null,
      _prevY: null,
      _prevW: null,
      _prevH: null
    }
  },

  computed: {
    /**
     * 面板定位样式
     * 最大化时铺满父容器；最小化时高度收缩为标题栏
     * @returns {object} style 对象
     */
    panelStyle() {
      if (this.maximized) {
        return { left: '0px', top: '0px', width: '100%', height: '100%' }
      }
      const style = {}
      if (this.posX !== null) style.left = `${this.posX}px`
      if (this.posY !== null) style.top = `${this.posY}px`
      if (!this.minimized) {
        style.width = `${this.sizeW}px`
        style.height = `${this.sizeH}px`
      }
      return style
    }
  },

  methods: {
    /**
     * 切换最小化 / 还原
     * 最小化只保留标题栏，再次点击恢复
     */
    toggleMinimize() {
      if (this.maximized) this.maximized = false
      this.minimized = !this.minimized
      this.$emit(this.minimized ? 'minimize' : 'restore')
    },

    /**
     * 切换最大化 / 还原
     * 最大化铺满父容器，还原回之前的位置与尺寸
     */
    toggleMaximize() {
      if (this.minimized) this.minimized = false
      if (!this.maximized) {
        this._prevX = this.posX
        this._prevY = this.posY
        this._prevW = this.sizeW
        this._prevH = this.sizeH
        this.maximized = true
        this.$emit('maximize')
      } else {
        this.maximized = false
        this.posX = this._prevX
        this.posY = this._prevY
        this.sizeW = this._prevW
        this.sizeH = this._prevH
        this.$emit('restore')
      }
    },

    /**
     * 关闭面板（由父组件决定是否真正移除，通过 v-if 控制）
     */
    handleClose() {
      this.$emit('close')
    },

    /**
     * 开始拖动（标题栏按下）
     * 以面板当前实际屏幕位置为基准计算偏移，兼容 CSS 定位（right/top）与内联定位（left/top）两种初始方式。
     * @param {MouseEvent} e 鼠标事件
     */
    startDrag(e) {
      if (!this.draggable || this.maximized) return
      // 仅响应左键，且忽略标题栏上的按钮点击
      if (e.button !== 0 || e.target.closest('button')) return

      // 取面板当前真实位置作为基准（避免 posX/posY 为 null 时跳到左上角）
      const rect = this.$el.getBoundingClientRect()
      const parentRect = this.$el.offsetParent
        ? this.$el.offsetParent.getBoundingClientRect()
        : { left: 0, top: 0 }
      const curX = rect.left - parentRect.left
      const curY = rect.top - parentRect.top

      // 将位置固化为 left/top 内联定位，后续拖动在此基础上更新
      this.posX = curX
      this.posY = curY
      this._dragOffsetX = e.clientX - curX
      this._dragOffsetY = e.clientY - curY
      this._dragging = true
      document.addEventListener('mousemove', this._onDrag)
      document.addEventListener('mouseup', this._endDrag)
      document.body.style.userSelect = 'none'
    },

    /**
     * 拖动过程中更新位置
     * @param {MouseEvent} e 鼠标事件
     */
    _onDrag(e) {
      if (!this._dragging) return
      this.posX = e.clientX - this._dragOffsetX
      this.posY = e.clientY - this._dragOffsetY
    },

    /** 结束拖动，解绑全局事件 */
    _endDrag() {
      this._dragging = false
      document.removeEventListener('mousemove', this._onDrag)
      document.removeEventListener('mouseup', this._endDrag)
      document.body.style.userSelect = ''
    },

    /**
     * 开始调整大小（右下角手柄按下）
     * @param {MouseEvent} e 鼠标事件
     */
    startResize(e) {
      if (!this.resizable || this.maximized || this.minimized) return
      if (e.button !== 0) return
      this._resizeStartX = e.clientX
      this._resizeStartY = e.clientY
      this._resizeStartW = this.sizeW
      this._resizeStartH = this.sizeH
      this._resizing = true
      document.addEventListener('mousemove', this._onResize)
      document.addEventListener('mouseup', this._endResize)
      document.body.style.userSelect = 'none'
    },

    /**
     * 调整大小过程中更新宽高
     * @param {MouseEvent} e 鼠标事件
     */
    _onResize(e) {
      if (!this._resizing) return
      const dw = e.clientX - this._resizeStartX
      const dh = e.clientY - this._resizeStartY
      this.sizeW = Math.max(this.minWidth, this._resizeStartW + dw)
      this.sizeH = Math.max(this.minHeight, this._resizeStartH + dh)
    },

    /** 结束调整大小，解绑全局事件 */
    _endResize() {
      this._resizing = false
      document.removeEventListener('mousemove', this._onResize)
      document.removeEventListener('mouseup', this._endResize)
      document.body.style.userSelect = ''
    }
  },

  beforeUnmount() {
    document.removeEventListener('mousemove', this._onDrag)
    document.removeEventListener('mouseup', this._endDrag)
    document.removeEventListener('mousemove', this._onResize)
    document.removeEventListener('mouseup', this._endResize)
  }
}
</script>
<style lang="scss" scoped>
.base-panel {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  z-index: 10;
}

/* 最小化：高度收缩为标题栏 */
.base-panel.is-minimized {
  height: auto;
}

.base-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  user-select: none;
  flex-shrink: 0;
}

.base-panel-header.is-draggable {
  cursor: move;
}

.base-panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.base-panel-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.base-panel-btn {
  color: var(--text-dim);
}

.base-panel-btn:hover {
  color: var(--accent);
}

.base-panel-close:hover {
  color: var(--danger);
}

.base-panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 右下角拖拽手柄 */
.base-panel-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  z-index: 2;
}

.base-panel-resize::after {
  content: '';
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--text-dim);
  border-bottom: 2px solid var(--text-dim);
  opacity: 0.6;
}
</style>
