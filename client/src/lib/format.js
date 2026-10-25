import { siteConfig } from '@/config/site'

const { locale, currency } = siteConfig.money
const money = new Intl.NumberFormat(locale, { style: 'currency', currency })

// Prices arrive from the API as strings like "12.99"
export const formatPrice = (value) => money.format(Number(value))

const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' })

// Accepts plain dates ("2006-05-23") and timestamps. Plain dates are read as UTC
// so they never shift a day in timezones west of Greenwich.
export const formatDate = (value) =>
  dateFormat.format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value))

const languageNames = new Intl.DisplayNames([locale], { type: 'language' })

// "en" -> "English"; falls back to the code if the browser doesn't know it
export const formatLanguage = (code) => {
  try {
    return languageNames.of(code) ?? code
  } catch {
    return code
  }
}

// One-line postal address, skipping the optional parts that are empty
export const formatAddress = (a) =>
  [a.line1, a.line2, a.city, a.state, a.postalCode, a.country].filter(Boolean).join(', ')
