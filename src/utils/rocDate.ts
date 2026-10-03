/**
 * 將健保署常見的民國年日期字串（YYYMMDD，7 碼）轉為西元 YYYY-MM-DD。
 * 亦接受已為 YYYY-MM-DD 的字串（原樣正規化後回傳）。
 */
export function rocYyyMmDdToGregorian(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new RangeError('日期不可為空')
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  if (!/^\d{7}$/.test(trimmed)) {
    throw new RangeError('無法辨識的日期格式')
  }

  const rocYear = Number.parseInt(trimmed.slice(0, 3), 10)
  const month = trimmed.slice(3, 5)
  const day = trimmed.slice(5, 7)
  const gregorianYear = rocYear + 1911

  const monthNumber = Number.parseInt(month, 10)
  const dayNumber = Number.parseInt(day, 10)
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) {
    throw new RangeError('日期無效')
  }

  const iso = `${String(gregorianYear).padStart(4, '0')}-${month}-${day}`
  const parsed = new Date(Date.UTC(gregorianYear, monthNumber - 1, dayNumber))
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== gregorianYear ||
    parsed.getUTCMonth() !== monthNumber - 1 ||
    parsed.getUTCDate() !== dayNumber
  ) {
    throw new RangeError('日期無效')
  }

  return iso
}
