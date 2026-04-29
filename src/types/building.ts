export type BuildingId = string

export type BuildingTypeKey = string

export interface BuildingType {
  key: BuildingTypeKey
  name: string
  widthMeters: number
  depthMeters: number
  color: string
}

export interface PlacedBuilding {
  id: BuildingId
  typeKey: BuildingTypeKey
  xMeters: number
  yMeters: number
  rotationDeg: 0 | 90 | 180 | 270
}
