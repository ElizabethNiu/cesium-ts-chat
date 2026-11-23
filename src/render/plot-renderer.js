/**
 * Cesium 渲染管理器：Viewer 初始化 + 设备渲染 + 命令执行（dispatcher）
 * 与数据契约、样式系统、命令 IR 解耦，只负责把 TargetData / PlotCommand 翻译成 Cesium 实体。
 * 实体构造逻辑（卫星/雷达/点目标）内联于本类，保持职责内聚，不做无意义拆分。
 * @author ElizabethNiu / elizaniu18@gmail.com
 * @since 2026-11-23 17:00:00
 */
import * as Cesium from 'cesium'
import { resolveStyle, CAMP_PRESET } from '../core/style-spec'
import { toColor, lineMaterial, outlineMaterial, iconDataUri } from './style-resolver'
import { computeOrbit, currentPosition } from './orbit'

export class PlotRenderer {
  constructor(container) {
    this.container = container
    this.viewer = null
    this.deviceEntities = new Map() // targetId -> { entity, ... }
    this.plotEntities = new Map() // 标绘 id -> entity[]
    this.targets = []
  }

  /**
   * 初始化 Cesium Viewer
   * baseLayer=false 彻底禁用 Ion 默认影像，内网零公网依赖
   */
  init() {
    Cesium.Ion.defaultAccessToken = ''
    const viewer = new Cesium.Viewer(this.container, {
      baseLayer: false,
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: true,
      navigationHelpButton: false,
      fullscreenButton: true,
      infoBox: false,
      selectionIndicator: false
    })
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0b1a2a')
    viewer.scene.globe.showGroundAtmosphere = false
    viewer.scene.skyAtmosphere.show = true
    viewer.cesiumWidget.creditContainer.style.display = 'none'

    // 初始视角：面向东亚/西太平洋
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(120, 25, 12000000),
      orientation: {
        heading: 0,
        pitch: -Cesium.Math.toRadians(70),
        roll: 0
      }
    })
    this.viewer = viewer
    return viewer
  }

  /** 加载并渲染所有目标设备 */
  async loadTargets(targets) {
    this.targets = targets
    for (const t of targets) {
      this.renderDevice(t)
    }
  }

  /**
   * 渲染单个设备（按类别分派）
   * 分组节点（group 类别）不渲染为实体
   */
  renderDevice(t) {
    const spec = resolveStyle(t.stylePreset) || resolveStyle(CAMP_PRESET[t.camp])
    if (t.category === 'satellite') {
      this.deviceEntities.set(t.id, this._createSatelliteEntity(t, spec))
    } else if (t.category === 'radar') {
      this.deviceEntities.set(t.id, this._createRadarEntity(t, spec))
    } else if (t.category !== 'group') {
      this.deviceEntities.set(t.id, this._createPointEntity(t, spec))
    }
  }

  /**
   * 构建设备标签（label）的公共配置
   * @param {string} text 标签文本
   * @param {object} spec 样式规格
   * @returns {object} Cesium label 配置
   */
  _buildLabel(text, spec) {
    return {
      text,
      font: '14px sans-serif',
      fillColor: toColor(spec.color),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -18),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000000)
    }
  }

  /**
   * 构建卫星实体：billboard + 标签 + 轨道线
   * @param {object} t 目标数据
   * @param {object} spec 样式规格
   * @returns {{entity: object, orbit: object}|null}
   */
  _createSatelliteEntity(t, spec) {
    const pos = t.position
    if (pos.kind !== 'tle') return null

    // 传播到当前时刻的位置
    const cur = currentPosition(pos.line1, pos.line2)
    if (!cur) return null

    const entity = this.viewer.entities.add({
      id: `dev-${t.id}`,
      name: t.name,
      position: Cesium.Cartesian3.fromDegrees(cur.lon, cur.lat, cur.height),
      billboard: {
        image: iconDataUri(spec.icon, spec.color),
        scale: 1.0,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      label: this._buildLabel(t.name, spec),
      properties: { targetId: t.id, category: t.category }
    })

    // 轨道线
    const orbitPts = computeOrbit(pos.line1, pos.line2)
    const positions = orbitPts.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height)
    )
    const orbit = this.viewer.entities.add({
      id: `orbit-${t.id}`,
      polyline: {
        positions,
        width: spec.width,
        material: new Cesium.ColorMaterialProperty(toColor(spec.color).withAlpha(0.5)),
        arcType: Cesium.ArcType.NONE,
        clampToGround: false
      },
      properties: { targetId: t.id, isOrbit: true }
    })

    return { entity, orbit }
  }

  /**
   * 构建雷达实体：中心点 + 覆盖圈
   * @param {object} t 目标数据
   * @param {object} spec 样式规格
   * @returns {{entity: object, coverage: object}|null}
   */
  _createRadarEntity(t, spec) {
    const pos = t.position
    if (pos.kind !== 'geo') return null
    const radius = Number(t.features?.coverageRadiusM) || 300000
    const center = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.height || 0)

    const entity = this.viewer.entities.add({
      id: `dev-${t.id}`,
      name: t.name,
      position: center,
      point: {
        pixelSize: 10,
        color: toColor(spec.color),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      label: this._buildLabel(t.name, spec),
      properties: { targetId: t.id, category: t.category }
    })

    const coverage = this.viewer.entities.add({
      id: `radar-circle-${t.id}`,
      position: center,
      ellipse: {
        semiMajorAxis: radius,
        semiMinorAxis: radius,
        material: toColor(spec.fillColor),
        outline: true,
        outlineColor: toColor(spec.outlineColor),
        outlineWidth: spec.outlineWidth,
        height: pos.height || 0
      },
      properties: { targetId: t.id, isCoverage: true }
    })

    return { entity, coverage }
  }

  /**
   * 构建点目标实体（飞机/舰船/火箭/地面站）
   * @param {object} t 目标数据
   * @param {object} spec 样式规格
   * @returns {{entity: object}|null}
   */
  _createPointEntity(t, spec) {
    const pos = t.position
    if (pos.kind !== 'geo') return null
    const entity = this.viewer.entities.add({
      id: `dev-${t.id}`,
      name: t.name,
      position: Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.height || 0),
      billboard: {
        image: iconDataUri(spec.icon, spec.color),
        scale: 1.0,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      label: this._buildLabel(t.name, spec),
      properties: { targetId: t.id, category: t.category }
    })
    return { entity }
  }

  /**
   * 执行命令（dispatcher 入口）
   * @param {object} command 命令 IR 对象
   */
  execute(command) {
    switch (command.op) {
      case 'draw':
        return this._draw(command)
      case 'setStyle':
        return this._setStyle(command)
      case 'focus':
        return this._focus(command)
      case 'clear':
        return this._clear(command)
      case 'list':
        return this._list(command)
      default:
        return { ok: false, error: `不支持的命令: ${command.op}` }
    }
  }

  /**
   * 绘制几何（点/线/面），按类型分派到子函数
   * @param {object} cmd draw 命令
   */
  _draw(cmd) {
    const spec = resolveStyle(cmd.preset, cmd.style)
    const id = cmd.id || `plot-${Date.now()}`
    let entities = []

    if (cmd.type === 'point') entities = this._drawPoint(cmd, spec, id)
    else if (cmd.type === 'polyline') entities = this._drawPolyline(cmd, spec, id)
    else if (cmd.type === 'polygon') entities = this._drawPolygon(cmd, spec, id)

    this.plotEntities.set(id, entities)
    return { ok: true, message: `已绘制 ${cmd.type}「${id}」` }
  }

  /**
   * 绘制点标绘
   * @param {object} cmd draw 命令
   * @param {object} spec 样式规格
   * @param {string} id 标绘 ID
   */
  _drawPoint(cmd, spec, id) {
    const p = cmd.points[0]
    const entity = this.viewer.entities.add({
      id: `plot-${id}`,
      position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height || 0),
      billboard: {
        image: iconDataUri(spec.icon, spec.color),
        scale: 1.2,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      properties: { plotId: id }
    })
    return [entity]
  }

  /**
   * 绘制折线标绘
   * @param {object} cmd draw 命令
   * @param {object} spec 样式规格
   * @param {string} id 标绘 ID
   */
  _drawPolyline(cmd, spec, id) {
    const positions = cmd.points.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height || 0)
    )
    const entity = this.viewer.entities.add({
      id: `plot-${id}`,
      polyline: {
        positions,
        width: spec.width,
        material: lineMaterial(spec),
        arcType: Cesium.ArcType.NONE,
        clampToGround: false
      },
      properties: { plotId: id }
    })
    return [entity]
  }

  /**
   * 绘制多边形标绘：面 + 描边（虚线脉冲）
   * @param {object} cmd draw 命令
   * @param {object} spec 样式规格
   * @param {string} id 标绘 ID
   */
  _drawPolygon(cmd, spec, id) {
    const positions = cmd.points.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height || 0)
    )
    // 面
    const face = this.viewer.entities.add({
      id: `plot-${id}-face`,
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(positions),
        material: toColor(spec.fillColor),
        outline: true,
        outlineColor: toColor(spec.outlineColor),
        outlineWidth: spec.outlineWidth,
        height: 0
      },
      properties: { plotId: id }
    })
    // 描边（虚线脉冲）
    const outline = this.viewer.entities.add({
      id: `plot-${id}-outline`,
      polyline: {
        positions: [...positions, positions[0]],
        width: spec.outlineWidth + 1,
        material: outlineMaterial(spec),
        clampToGround: false
      },
      properties: { plotId: id }
    })
    return [face, outline]
  }

  /**
   * 修改目标样式
   * 更新 billboard/point/label 及关联的轨道、覆盖圈颜色
   */
  _setStyle(cmd) {
    const rec = this.deviceEntities.get(cmd.targetId)
    if (!rec || !rec.entity) {
      return { ok: false, error: `未找到目标: ${cmd.targetId}` }
    }
    const t = this.targets.find((x) => x.id === cmd.targetId)
    const spec = resolveStyle(cmd.preset || t?.stylePreset, cmd.style)

    const e = rec.entity
    if (e.billboard) e.billboard.image = iconDataUri(spec.icon, spec.color)
    if (e.point) e.point.color = toColor(spec.color)
    if (e.label) e.label.fillColor = toColor(spec.color)
    if (rec.orbit) {
      rec.orbit.polyline.material = new Cesium.ColorMaterialProperty(
        toColor(spec.color).withAlpha(0.5)
      )
      rec.orbit.polyline.width = spec.width
    }
    if (rec.coverage) {
      rec.coverage.ellipse.material = toColor(spec.fillColor)
      rec.coverage.ellipse.outlineColor = toColor(spec.outlineColor)
    }
    return { ok: true, message: `已更新「${cmd.targetId}」样式` }
  }

  /** 聚焦到目标，相机 flyTo 指定范围 */
  _focus(cmd) {
    const rec = this.deviceEntities.get(cmd.targetId)
    if (!rec || !rec.entity) return { ok: false, error: `未找到目标: ${cmd.targetId}` }
    const pos = rec.entity.position?.getValue?.(this.viewer.clock.currentTime)
    if (!pos) return { ok: false, error: `目标位置无效` }
    const range = cmd.range || 500000
    this.viewer.camera.flyTo({
      destination: pos,
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), range)
    })
    return { ok: true, message: `已聚焦「${cmd.targetId}」` }
  }

  /** 清除标绘（指定 ids 或全部） */
  _clear(cmd) {
    if (cmd.ids && cmd.ids.length > 0) {
      for (const id of cmd.ids) {
        this._removePlot(id)
      }
      return { ok: true, message: `已清除 ${cmd.ids.length} 个标绘` }
    }
    let count = 0
    for (const id of [...this.plotEntities.keys()]) {
      this._removePlot(id)
      count++
    }
    return { ok: true, message: `已清除全部 ${count} 个标绘` }
  }

  /** 移除单个标绘及其关联实体 */
  _removePlot(id) {
    const entities = this.plotEntities.get(id) || []
    for (const e of entities) this.viewer.entities.remove(e)
    this.plotEntities.delete(id)
  }

  /** 列出目标（可按关键词过滤） */
  _list(cmd) {
    const list = this.targets
      .filter((t) => t.category !== 'group')
      .map((t) => `${t.name}(${t.category}/${t.country}/${t.status})`)
    const filtered = cmd.filter ? list.filter((s) => s.includes(cmd.filter)) : list
    return { ok: true, message: `共 ${filtered.length} 个目标`, list: filtered }
  }

  /** 销毁 Viewer，释放资源 */
  destroy() {
    if (this.viewer) {
      this.viewer.destroy()
      this.viewer = null
    }
  }
}
