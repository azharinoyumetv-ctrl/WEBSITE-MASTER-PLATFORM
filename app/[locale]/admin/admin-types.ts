export type ModuleItem = {
  id: string
  moduleType?: string
  moduleKey: string
  isEnabled: boolean
}

export type DailyMetric = {
  date: string
  revenue: number
  orders: number
  pageViews?: number
  conversions?: number
}

export type Analytics = {
  pageViews: number
  conversions: number
  dailyData: DailyMetric[]
}

export type MonitoringStatus = {
  systemStatus?: string
  nodes?: Array<{ service: string; status: string; latency: string; uptime?: string; connections?: number }>
  alertHistory: Array<{
    id: string
    severity?: string
    message?: string
    service?: string
    timestamp?: string
    resolved?: boolean
  }>
}
