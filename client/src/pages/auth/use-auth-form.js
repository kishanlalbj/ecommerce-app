import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { siteConfig } from '@/config/site'
import { toFormErrors } from '@/lib/form-errors'
import { validateAuth } from '@/pages/auth/validation'

// Validate → submit → show errors, or go back to the page that sent the user here
export function useAuthForm({ signup = false, submit, statusFieldErrors }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))

    const clientErrors = validateAuth(values, { signup })
    setFieldErrors(clientErrors)
    setFormError(null)
    if (Object.keys(clientErrors).length > 0) {
      event.currentTarget.querySelector('[aria-invalid="true"]')?.focus()
      return
    }

    setSubmitting(true)
    try {
      await submit(values)
      navigate(location.state?.from ?? siteConfig.routes.home, { replace: true })
    } catch (error) {
      const result = toFormErrors(error, statusFieldErrors)
      setFieldErrors(result.fieldErrors)
      setFormError(result.formError)
      setSubmitting(false)
    }
  }

  return { fieldErrors, formError, submitting, onSubmit }
}
