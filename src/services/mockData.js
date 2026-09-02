export const mockResult = {
  image:
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
  summary: {
    detected: '128 / 160',
    density: '14.8M/mL',
    normalRate: '6.4%',
  },
  boxes: [
    { id: 1, x: 12, y: 18, width: 12, height: 16 },
    { id: 2, x: 24, y: 34, width: 15, height: 18 },
    { id: 3, x: 38, y: 27, width: 16, height: 17 },
    { id: 4, x: 52, y: 19, width: 14, height: 20 },
    { id: 5, x: 68, y: 31, width: 13, height: 17 },
    { id: 6, x: 80, y: 22, width: 12, height: 18 },
  ],
}

export const dashboardStats = [
  { label: '今日待驗件數', value: '26', detail: '較昨日 +3.2%', status: '高', tone: 'blue' },
  { label: '已完成件數', value: '184', detail: '平均 8 分鐘/件', status: '正常', tone: 'green' },
  { label: '效率提升', value: '60%', detail: '減少顯微鏡疲勞', status: '優化', tone: 'purple' },
]

export const historyRecords = [
  { id: 'P-2026-0801', date: '2026-08-01', status: '異常', score: '14.8M/mL' },
  { id: 'P-2026-0718', date: '2026-07-18', status: '正常', score: '21.4M/mL' },
  { id: 'P-2026-0704', date: '2026-07-04', status: '待追蹤', score: '16.1M/mL' },
  { id: 'P-2026-0622', date: '2026-06-22', status: '異常', score: '12.4M/mL' },
]

export const patientTrend = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  values: [12.2, 13.8, 15.2, 14.6, 17.1, 18.4, 19.7],
}
