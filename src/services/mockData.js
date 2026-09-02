export const mockResult = {
  image:
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
  summary: {
    detected: '128 / 160',
    density: '14.8M/mL',
    normalRate: '6.4%',
    motility: '62%',
    precision: '92%',
    confidence: '87%',
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
  { label: '待檢驗', value: '8', detail: '今日待處理', status: '待辦', tone: 'blue' },
  { label: 'AI 分析中', value: '2', detail: '雲端辨識中', status: '進行中', tone: 'purple' },
  { label: '待複核', value: '3', detail: '待人工確認', status: '需關注', tone: 'warning' },
  { label: '已完成', value: '21', detail: '今日已結案', status: '正常', tone: 'green' },
]

export const workQueue = [
  { id: 'SP-20260901-01', time: '09:20', status: '待分析', action: '開始分析' },
  { id: 'SP-20260901-02', time: '09:35', status: 'AI分析中', action: '查看' },
  { id: 'SP-20260901-03', time: '10:10', status: '待複核', action: '複核結果' },
  { id: 'SP-20260901-04', time: '10:45', status: '待分析', action: '開始分析' },
]

export const recentResults = [
  { id: 'SP-20260829-02', density: '32', motility: '48%', morphology: '5%', result: '正常' },
  { id: 'SP-20260828-01', density: '18', motility: '32%', morphology: '3%', result: '需追蹤' },
  { id: 'SP-20260827-04', density: '21', motility: '45%', morphology: '4%', result: '正常' },
]

export const historyRecords = [
  {
    id: 'P-2026-0801',
    sampleId: 'SP-20260901-01',
    date: '2026-08-01',
    status: '異常',
    score: '14.8M/mL',
    density: '14.8',
    motility: '32%',
    morphology: '4.1%',
    processingState: '待複核',
    patient: {
      name: '王小明',
      age: 33,
      sex: '男',
      phone: '0912-345-678',
      doctor: '林醫師',
      note: '患者近期睡眠不足，建議再追蹤 6 週。',
    },
    summary: '精子濃度接近 WHO 下限，型態比例偏低，建議後續再檢查。',
    aiResult: {
      precision: '92%',
      confidence: '87%',
      processingTime: '1.2s',
    },
    trend: [10.4, 12.1, 13.8, 14.8, 15.4, 16.1],
  },
  {
    id: 'P-2026-0718',
    sampleId: 'SP-20260718-02',
    date: '2026-07-18',
    status: '正常',
    score: '21.4M/mL',
    density: '21.4',
    motility: '48%',
    morphology: '6.3%',
    processingState: '已完成',
    patient: {
      name: '陳雅婷',
      age: 29,
      sex: '女',
      phone: '0988-654-321',
      doctor: '黃醫師',
      note: '近期作息較穩定，整體檢驗結果改善。',
    },
    summary: '精子濃度與正常型態均屬正常範圍，活動力表現穩定。',
    aiResult: {
      precision: '95%',
      confidence: '91%',
      processingTime: '0.9s',
    },
    trend: [14.1, 16.8, 18.2, 19.4, 20.8, 21.4],
  },
  {
    id: 'P-2026-0704',
    sampleId: 'SP-20260704-03',
    date: '2026-07-04',
    status: '待追蹤',
    score: '16.1M/mL',
    density: '16.1',
    motility: '41%',
    morphology: '5.2%',
    processingState: '待複核',
    patient: {
      name: '林柏宇',
      age: 35,
      sex: '男',
      phone: '0922-778-990',
      doctor: '張醫師',
      note: '病患需再觀察 4-6 週，並提醒避免高溫環境。',
    },
    summary: '濃度略高於下限，型態與活動力仍需追蹤。',
    aiResult: {
      precision: '90%',
      confidence: '84%',
      processingTime: '1.1s',
    },
    trend: [12.9, 13.5, 14.8, 15.6, 16.1, 16.3],
  },
  {
    id: 'P-2026-0622',
    sampleId: 'SP-20260622-04',
    date: '2026-06-22',
    status: '異常',
    score: '12.4M/mL',
    density: '12.4',
    motility: '28%',
    morphology: '3.2%',
    processingState: '已完成',
    patient: {
      name: '鄭志豪',
      age: 31,
      sex: '男',
      phone: '0977-112-334',
      doctor: '吳醫師',
      note: '建議加強生活習慣管理與定期追蹤。',
    },
    summary: '濃度與型態均偏低，活動力明顯下降，需加強評估。',
    aiResult: {
      precision: '89%',
      confidence: '83%',
      processingTime: '1.4s',
    },
    trend: [11.1, 11.6, 12.2, 12.4, 13.1, 13.8],
  },
]

export const patientTrend = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  values: [12.2, 13.8, 15.2, 14.6, 17.1, 18.4, 19.7],
}
