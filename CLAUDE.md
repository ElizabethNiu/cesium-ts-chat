# CLAUDE.md

> 本文件是 Claude Code 的**项目级开发规范入口**。
> Claude Code 会在会话开始时自动读取本文件，请严格遵循以下约定。

## 权威规范（必须遵循）

- **前端开发规范**：[`docs/前端开发规范.md`](./docs/前端开发规范.md) —— 代码风格、目录结构、组件写法、命名、注释、样式、状态管理等全部约定。
- **Git 提交规范**：[`docs/GIT_COMMIT.md`](./docs/GIT_COMMIT.md) —— 提交信息格式与流程约定。

## 核心强制约束（速查）

> 以下为最高优先级约束，任何代码生成都必须遵守。完整说明见 `docs/前端开发规范.md`。

1. **技术栈**：Vue 3 + Vite + JavaScript + Element Plus + Pinia + SCSS。
2. **禁止 `<script setup>`**，统一使用 Options API 全生命周期写法（`export default { data/computed/methods/mounted/beforeUnmount }`）。
3. **组件样式内联**在 `<style lang="scss" scoped>` 中，即使超长也不抽出为独立文件。
4. **全局通用样式**统一写到 `src/style/index.scss`，并在 `main.js` 引用。
5. **禁止无意义的函数/文件拆分**，拆分必须基于真实的可读性、复用或职责边界。
6. **状态管理用 Pinia**：通用 store 写在 `src/store/index.js`，业务模块写在 `src/store/module/`，通过 `this.$store` 访问。
7. **命名**：组件 PascalCase，其他文件 kebab-case/小驼峰；常量全大写；CSS 类名 kebab-case。
8. **注释**：函数/组件/关键逻辑必须带中文注释，含 `@author`、`@since` 及参数/返回值说明。
9. **模板规范**：`v-for` 必须绑唯一 `key`（禁用索引）；模板内禁复杂表达式；禁止 `v-if` 与 `v-for` 同标签。
10. **Props**：必须完整定义类型、默认值与校验。

## 项目上下文（速览）

- 项目：二三维地球态势标绘智能体前端 Demo。
- 渲染内核：官方 CesiumJS（本地 `node_modules` 引入），卫星轨道用 satellite.js 本地 SGP4。
- 数据源：前端一期以本地 JSON（`public/data/`）为正式数据源，后台由后台同事负责。
- 内网私有化部署，运行期零公网依赖。

## 约定

- 所有输出、注释、提交信息一律使用**中文**。
- 修改代码前，先阅读 `docs/前端开发规范.md` 对应章节，确保符合规范。
- 完成任务后，如需提交，遵循 `docs/GIT_COMMIT.md`，并在提交前**主动询问**是否执行 git 提交推送。
