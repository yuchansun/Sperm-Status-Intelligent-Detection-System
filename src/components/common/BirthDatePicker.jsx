// eslint-disable-next-line no-unused-vars
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../../context/language.js'

const localeByLanguage = { zh: 'zh-TW', en: 'en-US', ko: 'ko-KR' }
const labelsByLanguage = {
  zh: { birthDate: '出生日期', choose: '選擇日期', chooseTitle: '選擇出生日期', previousMonth: '上個月', nextMonth: '下個月', month: '月份', year: '年份' },
  en: { birthDate: 'Date of birth', choose: 'Select a date', chooseTitle: 'Select date of birth', previousMonth: 'Previous month', nextMonth: 'Next month', month: 'Month', year: 'Year' },
  ko: { birthDate: '생년월일', choose: '날짜 선택', chooseTitle: '생년월일 선택', previousMonth: '이전 달', nextMonth: '다음 달', month: '월', year: '년' },
}
const WEEK_START = new Date(2024, 0, 7)

function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

export function BirthDatePicker({ value, onChange, invalid = false }) {
  const { language = 'zh' } = useLanguage() ?? {}
  const locale = localeByLanguage[language] ?? 'zh-TW'
  const labels = labelsByLanguage[language] ?? labelsByLanguage.zh
  const today = useMemo(() => new Date(), [])
  const selectedDate = parseIsoDate(value)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = selectedDate ?? new Date()
    return new Date(initial.getFullYear(), initial.getMonth(), 1)
  })
  const [isOpen, setIsOpen] = useState(false)
  const pickerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined
    const closeOnOutsideClick = (event) => {
      if (!pickerRef.current?.contains(event.target)) setIsOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  useEffect(() => {
    const nextSelected = parseIsoDate(value)
    if (nextSelected) setVisibleMonth(new Date(nextSelected.getFullYear(), nextSelected.getMonth(), 1))
  }, [value])

  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay()
  const monthName = new Intl.DateTimeFormat(locale, { month: 'long' }).format(visibleMonth)
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(WEEK_START.getFullYear(), WEEK_START.getMonth(), WEEK_START.getDate() + index)),
  )
  const selectedLabel = selectedDate
    ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(selectedDate)
    : labels.choose
  const monthIsCurrent = year === today.getFullYear() && month === today.getMonth()
  const currentMonthIndex = year === today.getFullYear() ? today.getMonth() : 11
  const years = Array.from({ length: today.getFullYear() - 1899 }, (_, index) => today.getFullYear() - index)

  const changeDate = (date) => {
    onChange(toIsoDate(date))
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    setIsOpen(false)
  }

  const setMonth = (nextMonth) => setVisibleMonth(new Date(year, Number(nextMonth), 1))
  const setYear = (nextYear) => {
    const parsedYear = Number(nextYear)
    const nextMonth = parsedYear === today.getFullYear() ? Math.min(month, today.getMonth()) : month
    setVisibleMonth(new Date(parsedYear, nextMonth, 1))
  }

  return (
    <div className="birth-date-picker" ref={pickerRef}>
      <input
        className="birth-date-compat"
        type="date"
        value={value}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className={`birth-date-trigger${invalid ? ' invalid' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`${labels.birthDate}: ${selectedLabel}`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={selectedDate ? '' : 'birth-date-placeholder'}>{selectedLabel}</span>
        <CalendarDays size={18} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="birth-calendar" role="dialog" aria-label={labels.chooseTitle}>
          <div className="birth-calendar-header">
            <button type="button" className="calendar-nav-btn" aria-label={labels.previousMonth} onClick={() => setVisibleMonth(new Date(year, month - 1, 1))} disabled={year <= 1900 && month === 0}>
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <div className="birth-calendar-selects">
              <select aria-label={labels.month} value={month} onChange={(event) => setMonth(event.target.value)}>
                {Array.from({ length: monthIsCurrent ? currentMonthIndex + 1 : 12 }, (_, index) => (
                  <option key={index} value={index}>{new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(year, index, 1))}</option>
                ))}
              </select>
              <select aria-label={labels.year} value={year} onChange={(event) => setYear(event.target.value)}>
                {years.map((yearOption) => <option key={yearOption} value={yearOption}>{yearOption}</option>)}
              </select>
            </div>
            <button type="button" className="calendar-nav-btn" aria-label={labels.nextMonth} onClick={() => setVisibleMonth(new Date(year, month + 1, 1))} disabled={monthIsCurrent || new Date(year, month + 1, 1) > today}>
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="birth-calendar-grid">
            {weekdays.map((weekday, index) => <span className="calendar-weekday" key={`${weekday}-${index}`}>{weekday}</span>)}
            {Array.from({ length: firstWeekday }, (_, index) => <span className="calendar-empty" key={`empty-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1
              const date = new Date(year, month, day)
              const iso = toIsoDate(date)
              const isSelected = value === iso
              const isToday = toIsoDate(today) === iso
              const isFuture = date > today
              return (
                <button
                  type="button"
                  key={iso}
                  className={`calendar-day${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}
                  aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date)}
                  aria-pressed={isSelected}
                  disabled={isFuture}
                  onClick={() => changeDate(date)}
                >{day}</button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
