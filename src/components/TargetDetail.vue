<template>
  <div class="target-detail">
    <el-descriptions :column="1" border size="small">
      <el-descriptions-item
        v-for="f in fieldList"
        :key="f.key"
        :label="f.label"
      >
        {{ formatValue(f, getValue(target, f.key)) }}
      </el-descriptions-item>
    </el-descriptions>
  </div>
</template>
<script>
/**
 * 通用目标/装备详情展示组件（TargetDetail）
 * 接收一个目标数据对象（TargetData），统一展示名称、国别、阵营、类型、状态、位置等字段。
 * 字段可配置（fields prop），并支持字段值格式化（formatter），复用性好。
 * 作为全局组件使用，采用 Vue 全生命周期（Options API）写法。
 * @author ElizabethNiu / elizaniu18@gmail.com
 * @since 2026-11-24 16:38:00
 */

/** 阵营 → 中文标签 */
const CAMP_LABEL = {
  friend: '友方',
  hostile: '敌方',
  neutral: '中立',
  unknown: '未知'
}

/** 默认展示字段：key 对应 target 字段，label 为表头，format 为可选格式化函数名 */
const DEFAULT_FIELDS = [
  { key: 'name', label: '名称' },
  { key: 'country', label: '国别' },
  { key: 'camp', label: '阵营', format: 'camp' },
  { key: 'category', label: '类型' },
  { key: 'status', label: '状态' },
  { key: 'position', label: '位置', format: 'position' }
]

export default {
  name: 'TargetDetail',

  props: {
    // 目标数据对象（TargetData）
    target: { type: Object, default: null },
    // 自定义字段列表；缺省用 DEFAULT_FIELDS
    fields: {
      type: Array,
      default: () => DEFAULT_FIELDS
    }
  },

  computed: {
    /**
     * 实际使用的字段列表
     * @returns {Array} 字段定义数组
     */
    fieldList() {
      return this.fields && this.fields.length ? this.fields : DEFAULT_FIELDS
    }
  },

  methods: {
    /**
     * 取目标字段值
     * 支持嵌套路径（如 features.xxx）
     * @param {object} target 目标数据
     * @param {string} key 字段键
     * @returns {*} 字段值
     */
    getValue(target, key) {
      if (!target) return ''
      return key.split('.').reduce((acc, k) => (acc == null ? '' : acc[k]), target)
    },

    /**
     * 按字段定义的 format 格式化字段值
     * @param {object} field 字段定义
     * @param {*} value 原始值
     * @returns {string} 格式化后的显示文本
     */
    formatValue(field, value) {
      if (value == null || value === '') return '未知'
      switch (field.format) {
        case 'camp':
          return CAMP_LABEL[value] ?? '未知'
        case 'position':
          return this.formatPosition(value)
        default:
          return String(value)
      }
    },

    /**
     * 格式化位置：geo 显示经纬度，tle 显示 TLE 轨道
     * @param {object} pos 位置对象（{ kind, lon, lat, ... }）
     * @returns {string} 位置描述
     */
    formatPosition(pos) {
      if (!pos) return '未知'
      if (pos.kind === 'geo') {
        return `${Number(pos.lon).toFixed(4)}, ${Number(pos.lat).toFixed(4)}`
      }
      return 'TLE 轨道'
    }
  }
}
</script>
<style lang="scss" scoped>
.target-detail {
  width: 100%;
  padding: 12px;
  overflow-y: auto;
}

.target-detail :deep(.el-descriptions__label) {
  color: var(--text-dim);
}

.target-detail :deep(.el-descriptions__content) {
  color: var(--text);
}
</style>
