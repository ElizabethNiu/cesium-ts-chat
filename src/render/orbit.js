// 卫星轨道计算：satellite.js SGP4 传播
import * as satellite from 'satellite.js'

/**
 * 根据 TLE 计算卫星在一段时间内的轨道点（ECI → ECF → 经纬高）
 * @param {string} line1 TLE 第一行
 * @param {string} line2 TLE 第二行
 * @param {number} durationMin 传播时长（分钟）
 * @param {number} stepSec 采样步长（秒）
 * @returns {Array<{lon,lat,height}>}
 */
export function computeOrbit(line1, line2, durationMin = 90, stepSec = 60) {
  const satrec = satellite.twoline2satrec(line1, line2)
  const points = []
  const now = new Date()
  const totalSec = durationMin * 60

  for (let t = 0; t <= totalSec; t += stepSec) {
    const d = new Date(now.getTime() + t * 1000)
    const positionAndVelocity = satellite.propagate(satrec, d)
    if (!positionAndVelocity || !positionAndVelocity.position) continue

    const positionEci = positionAndVelocity.position
    const gmst = satellite.gstime(d)
    const positionEcf = satellite.eciToEcf(positionEci, gmst)
    const geodetic = satellite.eciToGeodetic(positionEci, gmst)

    const lon = satellite.degreesLong(geodetic.longitude)
    const lat = satellite.degreesLat(geodetic.latitude)
    const height = geodetic.height * 1000 // km → m

    points.push({ lon, lat, height })
  }
  return points
}

/** 计算卫星当前位置（传播到当前时刻） */
export function currentPosition(line1, line2) {
  const satrec = satellite.twoline2satrec(line1, line2)
  const d = new Date()
  const pv = satellite.propagate(satrec, d)
  if (!pv || !pv.position) return null
  const gmst = satellite.gstime(d)
  const geodetic = satellite.eciToGeodetic(pv.position, gmst)
  return {
    lon: satellite.degreesLong(geodetic.longitude),
    lat: satellite.degreesLat(geodetic.latitude),
    height: geodetic.height * 1000
  }
}
