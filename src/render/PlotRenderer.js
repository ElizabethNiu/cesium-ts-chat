/**
 * Cesium 渲染管理器：Viewer 初始化 + 设备渲染 + 命令执行（dispatcher）
 * 与数据契约、样式系统、命令 IR 解耦，只负责把 TargetData / PlotCommand 翻译成 Cesium 实体。
 * @author ElizabethNiu / elizaniu18@gmail.com
 * @since 2026-11-23 16:46:35
 */
import * as Cesium from 'cesium'
import { resolveStyle, CAMP_PRESET } from '../core/style-spec'
import { toColor, lineMaterial, outlineMaterial, iconDataUri } from './style-resolver'
import { computeOrbit, currentPosition } from './orbit'

export class PlotRenderer {
  constructor(container) {
    this.container = container
    this.viewer = null
    this.deviceEntities = new Map() // targetId -> { entity, dataSource? }
    this.plotEntities = new Map() // 标绘 id -> entity[]
    this.targets = []
    this._listeners = []
  }

  /** 初始化 Viewer */
  init() {
    Cesium.Ion.defaultAccessToken = '' // 内网部署，不使用 Ion 资产
    // 内网私有化：baseLayer=false 彻底禁用 Ion 默认影像（不发起任何外链请求），改用离线纯色底图
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
    // 隐藏版权条（官方 Cesium 无 Logo 署名义务，保留上游版权声明即可；此处隐藏避免干扰 UI）
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

  /** 渲染单个设备（按类别分派） */
  renderDevice(t) {
    const spec = resolveStyle(t.stylePreset) || resolveStyle(CAMP_PRESET[t.camp])
    if (t.category === 'satellite') {
      this._renderSatellite(t, spec)
    } else if (t.category === 'radar') {
      this._renderRadar(t, spec)
    } else if (t.category === 'group') {
      // 分组节点不渲染
      return
    } else {
      this._renderPointTarget(t, spec)
    }
  }

  /** 卫星：billboard + 轨道线 */
  _renderSatellite(t, spec) {
    const pos = t.position
    if (pos.kind !== 'tle') return

    // 当前点
    const cur = currentPosition(pos.line1, pos.line2)
    if (!cur) return

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
      label: {
        text: t.name,
        font: '14px sans-serif',
        fillColor: toColor(spec.color),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000000)
      },
      properties: { targetId: t.id, category: t.category }
    })

    // 轨道线
    const orbitPts = computeOrbit(pos.line1, pos.line2)
    const positions = orbitPts.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height)
    )
    const orbitEntity = this.viewer.entities.add({
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

    this.deviceEntities.set(t.id, { entity, orbit: orbitEntity })
  }

  /** 雷达：中心点 + 覆盖圈（面 + 圈线） */
  _renderRadar(t, spec) {
    const pos = t.position
    if (pos.kind !== 'geo') return
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
      label: {
        text: t.name,
        font: '14px sans-serif',
        fillColor: toColor(spec.color),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -18),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000000)
      },
      properties: { targetId: t.id, category: t.category }
    })

    // 覆盖圈
    const circleEntity = this.viewer.entities.add({
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

    this.deviceEntities.set(t.id, { entity, coverage: circleEntity })
  }

  /** 点目标：飞机/舰船/火箭/地面站 */
  _renderPointTarget(t, spec) {
    const pos = t.position
    if (pos.kind !== 'geo') return
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
      label: {
        text: t.name,
        font: '14px sans-serif',
        fillColor: toColor(spec.color),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -18),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000000)
      },
      properties: { targetId: t.id, category: t.category }
    })
    this.deviceEntities.set(t.id, { entity })
  }

  /** 执行命令（dispatcher） */
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

  /** 绘制几何（点/线/面） */
  _draw(cmd) {
    const spec = resolveStyle(cmd.preset, cmd.style)
    const entities = []
    const id = cmd.id || `plot-${Date.now()}`

    if (cmd.type === 'point') {
      const p = cmd.points[0]
      const e = this.viewer.entities.add({
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
      entities.push(e)
    } else if (cmd.type === 'polyline') {
      const positions = cmd.points.map((p) =>
        Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height || 0)
      )
      const e = this.viewer.entities.add({
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
      entities.push(e)
    } else if (cmd.type === 'polygon') {
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
      entities.push(face, outline)
    }

    this.plotEntities.set(id, entities)
    return { ok: true, message: `已绘制 ${cmd.type}「${id}」` }
  }

  /** 修改样式 */
  _setStyle(cmd) {
    const key = `dev-${cmd.targetId}`
    const rec = this.deviceEntities.get(cmd.targetId)
    if (!rec || !rec.entity) {
      // 尝试标绘实体
      return { ok: false, error: `未找到目标: ${cmd.targetId}` }
    }
    const t = this.targets.find((x) => x.id === cmd.targetId)
    const spec = resolveStyle(cmd.preset || t?.stylePreset, cmd.style)

    const e = rec.entity
    if (e.billboard) {
      e.billboard.image = iconDataUri(spec.icon, spec.color)
    }
    if (e.point) {
      e.point.color = toColor(spec.color)
    }
    if (e.label) {
      e.label.fillColor = toColor(spec.color)
    }
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

  /** 聚焦 */
  _focus(cmd) {
    const rec = this.deviceEntities.get(cmd.targetId)
    if (!rec || !rec.entity) return { ok: false, error: `未找到目标: ${cmd.targetId}` }
    const pos = rec.entity.position?.getValue?.(this.viewer.clock.currentTime)
    if (!pos) return { ok: false, error: `目标位置无效` }
    const range = cmd.range || 500000
    this.viewer.camera.flyTo({
      destination: pos,
      offset: new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.toRadians(-45),
        range
      )
    })
    return { ok: true, message: `已聚焦「${cmd.targetId}」` }
  }

  /** 清除标绘 */
  _clear(cmd) {
    if (cmd.ids && cmd.ids.length > 0) {
      for (const id of cmd.ids) {
        const ents = this.plotEntities.get(id) || []
        for (const e of ents) this.viewer.entities.remove(e)
        this.plotEntities.delete(id)
      }
      return { ok: true, message: `已清除 ${cmd.ids.length} 个标绘` }
    }
    let count = 0
    for (const [, ents] of this.plotEntities) {
      for (const e of ents) this.viewer.entities.remove(e)
      count++
    }
    this.plotEntities.clear()
    return { ok: true, message: `已清除全部 ${count} 个标绘` }
  }

  /** 列出目标 */
  _list(cmd) {
    const list = this.targets
      .filter((t) => t.category !== 'group')
      .map((t) => `${t.name}(${t.category}/${t.country}/${t.status})`)
    const filter = cmd.filter
    const filtered = filter ? list.filter((s) => s.includes(filter)) : list
    return {
      ok: true,
      message: `共 ${filtered.length} 个目标`,
      list: filtered
    }
  }

  /** 订阅事件（供 UI 展示） */
  on(event, fn) {
    this._listeners.push({ event, fn })
  }
  emit(event, payload) {
    for (const l of this._listeners) {
      if (l.event === event) l.fn(payload)
    }
  }

  destroy() {
    if (this.viewer) {
      this.viewer.destroy()
      this.viewer = null
    }
  }
}
