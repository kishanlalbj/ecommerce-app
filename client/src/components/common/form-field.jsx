import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

// Label + input + hint/error, wired up for screen readers
function FormField({ name, label, description, error, ...inputProps }) {
  const id = `field-${name}`
  const hintId = `${id}-hint`

  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error || description ? hintId : undefined}
        {...inputProps}
      />
      {error ? (
        <FieldError id={hintId}>{error}</FieldError>
      ) : (
        description && <FieldDescription id={hintId}>{description}</FieldDescription>
      )}
    </Field>
  )
}

export { FormField }
