# 二三维地球态势标绘智能体（前端 Demo）

通过自然语言 / 规范化语言对话，实现二三维地球态势标绘的最小可运行 Demo。覆盖点、线、面及卫星等 Cesium 常见元素的标绘，内置样式系统与卫星轨道计算，支持内网私有化部署。

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Vue 3（Options API 全生命周期写法） |
| 构建 | Vite |
| 语言 | JavaScript（ES6+） |
| 渲染内核 | 官方 CesiumJS `^1.140` |
| UI 组件库 | Element Plus |
| 状态管理 | Pinia（模块化 store，挂载 `this.$store`） |
| 卫星轨道 | satellite.js（本地 SGP4 传播） |
| 样式 | SCSS（`<style lang="scss" scoped>` + 全局 `src/style/index.scss`） |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev        # http://localhost:5173

# 构建生产包
npm run build

# 本地预览构建产物
npm run preview
```

## 核心特性

- **自然语言标绘**：输入中文指令（如「在南海海域画一个红色警戒区」）即可绘制点、线、面。
- **命令 IR + 样式预设**：LLM / 规则只输出结构化命令 + 预设 ID，样式走白名单覆盖，防幻觉。
- **统一设备模型**：卫星、雷达、火箭、飞机、舰船等目标按统一契约渲染（国别 → 阵营 → 军标配色）。
- **卫星轨道**：基于 TLE 数据，用 satellite.js 本地 SGP4 传播，绘制轨道弧线。
- **内网零公网依赖**：`baseLayer: false` 彻底禁用 Cesium Ion 默认影像，运行期无外链请求。

## 目录结构

```
cesium-ts-demo/
├── public/
│   └── data/                  # 前端一期正式数据源（本地 JSON）
│       ├── devices.list.json  # 15 设备（list 形态）
│       ├── devices.tree.json  # 同批数据（tree 形态）
│       └── target.schema.json # 数据契约 JSON Schema
├── docs/
│   ├── 前端开发规范.md         # 前端代码开发与输出规范
│   └── GIT_COMMIT.md          # Git 提交规范
├── scripts/
│   └── get-code-info.*        # @author/@since 信息获取脚本
├── src/
│   ├── commands/              # 命令 IR + 自然语言解析器
│   │   ├── ir.js
│   │   └── parser.js
│   ├── contract/              # 数据契约层（抗变化映射）
│   │   ├── map-raw-device.js  # RawDevice → TargetData + 国别→阵营
│   │   └── provider.js        # MockProvider（默认）/ ApiProvider（二期）
│   ├── core/
│   │   └── style-spec.js      # StyleSpec 预设库（20+ 预设）
│   ├── render/                # Cesium 渲染层
│   │   ├── plot-renderer.js   # Viewer 初始化 + 设备渲染 + 命令分发
│   │   ├── orbit.js           # satellite.js SGP4 本地传播
│   │   └── style-resolver.js  # StyleSpec → Cesium 材质/图标
│   ├── store/                 # 状态管理（模块化 Pinia）
│   │   ├── index.js           # 入口：Pinia 实例 + 通用 store + 汇总模块
│   │   └── module/plot.js     # 业务模块 store（设备 + 对话消息）
│   ├── style/
│   │   └── index.scss         # 全局通用样式（变量 + reset）
│   ├── App.vue                # 根组件（地图 + 对话面板）
│   └── main.js                # 应用入口（挂载 $store）
├── index.html
├── vite.config.js
└── jsconfig.json
```

## 开发约定

- **Vue 组件**：禁止 `<script setup>`，使用 Options API 全生命周期写法；样式内联 `<style lang="scss" scoped>`。
- **状态管理**：通用 store 写在 `src/store/index.js`，业务模块写在 `src/store/module/`，通过 `this.$store` 访问。
- **数据契约**：后台逐字字段清单确定后，只需修改 `src/contract/map-raw-device.js` 映射层，其余层零改动。
- **代码规范**：详见 [`docs/前端开发规范.md`](./docs/前端开发规范.md)。
- **Git 提交**：详见 [`docs/GIT_COMMIT.md`](./docs/GIT_COMMIT.md)。

## 数据源切换

| 环境变量 | 说明 |
|----------|------|
| `VITE_DATA_SOURCE=mock` | 前端一期默认，读取本地 JSON |
| `VITE_DATA_SOURCE=api` | 二期开关，对接后台 API（后台就绪后启用） |

## 版权与许可证

渲染内核基于官方 CesiumJS（Apache-2.0），保留上游版权声明；本项目为自有产品，无 Logo / F12 署名义务。

## 说明

本项目为前端一期最小 Demo，后台部分（FastAPI / PostGIS / Python Agent / TLE 入库）由后台同事负责，前端一期以本地 JSON 为正式数据源，不依赖、不等待后台。
