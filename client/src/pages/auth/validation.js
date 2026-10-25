import { siteConfig } from '@/config/site'

const { errors } = siteConfig.auth
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Mirrors the server rules so most mistakes are caught before a round trip
export function validateAuth(values, { signup = false } = {}) {
  const fieldErrors = {}

  if (signup && !values.name?.trim()) fieldErrors.name = errors.required

  if (!values.email?.trim()) fieldErrors.email = errors.required
  else if (!EMAIL.test(values.email.trim())) fieldErrors.email = errors.email

  if (!values.password) fieldErrors.password = errors.required
  else if (signup && (values.password.length < 8 || values.password.length > 72)) {
    fieldErrors.password = errors.passwordLength
  }

  if (signup && values.confirmPassword !== values.password) {
    fieldErrors.confirmPassword = errors.passwordMismatch
  }

  return fieldErrors
}
