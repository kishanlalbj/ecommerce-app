import { CircleAlertIcon } from 'lucide-react'
import { useState } from 'react'
import { FormField } from '@/components/common/form-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldGroup } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { siteConfig } from '@/config/site'
import { toFormErrors } from '@/lib/form-errors'
import { cn } from '@/lib/utils'
import { meApi } from '@/services/me'

const { address: copy } = siteConfig
const { fields } = copy

const REQUIRED_FIELDS = ['line1', 'city', 'postalCode', 'country']

// Saves a new address for the logged-in user and hands the created row to onSaved.
// isFirst: the user has no addresses yet, so this one becomes their default.
function AddressForm({ isFirst, onSaved, onCancel, className }) {
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [isDefault, setIsDefault] = useState(isFirst)

  async function onSubmit(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))

    const clientErrors = Object.fromEntries(
      REQUIRED_FIELDS.filter((name) => !values[name]?.trim()).map((name) => [
        name,
        siteConfig.auth.errors.required,
      ])
    )
    setFieldErrors(clientErrors)
    setFormError(null)
    if (Object.keys(clientErrors).length > 0) {
      event.currentTarget.querySelector('[aria-invalid="true"]')?.focus()
      return
    }

    setSaving(true)
    try {
      onSaved(await meApi.addAddress({ ...values, isDefault }))
    } catch (error) {
      const result = toFormErrors(error)
      setFieldErrors(result.fieldErrors)
      setFormError(result.formError)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className={cn(!isFirst && 'rounded-lg border p-4', className)}>
      <FieldGroup>
        {formError && (
          <Alert variant="destructive" role="alert">
            <CircleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <FormField name="line1" autoComplete="address-line1" {...fields.line1} error={fieldErrors.line1} />
        <FormField name="line2" autoComplete="address-line2" {...fields.line2} error={fieldErrors.line2} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField name="city" autoComplete="address-level2" {...fields.city} error={fieldErrors.city} />
          <FormField name="state" autoComplete="address-level1" {...fields.state} error={fieldErrors.state} />
          <FormField
            name="postalCode"
            autoComplete="postal-code"
            {...fields.postalCode}
            error={fieldErrors.postalCode}
          />
          <FormField
            name="country"
            autoComplete="country"
            maxLength={2}
            className="uppercase"
            label={fields.country.label}
            placeholder={fields.country.placeholder}
            description={fields.country.hint}
            error={fieldErrors.country}
          />
        </div>
        {!isFirst && (
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={isDefault} onCheckedChange={setIsDefault} />
            {copy.makeDefault}
          </Label>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />}
            {saving ? copy.saving : copy.save}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {copy.cancel}
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  )
}

export { AddressForm }
