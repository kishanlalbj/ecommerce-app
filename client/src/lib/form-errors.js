import { ApiError } from '@/lib/api-client'
import { siteConfig } from '@/config/site'

const { errors } = siteConfig.auth

// Turns an API failure into { fieldErrors, formError } for a form to display.
// `statusFieldErrors` maps a status to a field error, e.g. { 409: { email: '…' } }.
export function toFormErrors(error, statusFieldErrors = {}) {
  if (!(error instanceof ApiError)) return { fieldErrors: {}, formError: errors.generic }
  if (error.isNetworkError) return { fieldErrors: {}, formError: errors.network }

  if (statusFieldErrors[error.status]) {
    return { fieldErrors: statusFieldErrors[error.status], formError: null }
  }

  // Server validation errors come back as { details: { field: [messages] } }
  const details = error.data?.details
  if (details && Object.keys(details).length > 0) {
    const fieldErrors = Object.fromEntries(
      Object.entries(details).map(([field, messages]) => [field, messages[0]])
    )
    return { fieldErrors, formError: null }
  }

  return { fieldErrors: {}, formError: error.status >= 500 ? errors.generic : error.message }
}
