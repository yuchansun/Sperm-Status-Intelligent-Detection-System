import { mockResult } from './mockData.js'

export async function analyzeSpermImage(imageFile) {
  await new Promise((resolve) => setTimeout(resolve, 1200))

  console.log('Mock analysis for:', imageFile?.name ?? 'demo-image')
  return mockResult
}
