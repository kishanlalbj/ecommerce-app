import { CircleAlertIcon, MapPinIcon, PlusIcon, StarIcon, Trash2Icon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AccountHeader } from '@/components/account/account-layout'
import { AddressForm } from '@/components/account/address-form'
import { FormField } from '@/components/common/form-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { siteConfig } from '@/config/site'
import { useAuth } from '@/context/auth-context'
import { toFormErrors } from '@/lib/form-errors'
import { formatDate } from '@/lib/format'
import { meApi } from '@/services/me'

const { account: copy, address: addressCopy, auth } = siteConfig
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Section({ title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function FormAlert({ children }) {
  return (
    <Alert variant="destructive" role="alert">
      <CircleAlertIcon />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

function ProfileForm() {
  const { user, updateProfile } = useAuth()
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    const name = values.name.trim()
    const email = values.email.trim()

    const clientErrors = {}
    if (!name) clientErrors.name = auth.errors.required
    if (!email) clientErrors.email = auth.errors.required
    else if (!EMAIL.test(email)) clientErrors.email = auth.errors.email
    setFieldErrors(clientErrors)
    setFormError(null)
    if (Object.keys(clientErrors).length > 0) {
      form.querySelector('[aria-invalid="true"]')?.focus()
      return
    }

    // Only send what changed; the API rejects an empty update
    const changes = {}
    if (name !== user.name) changes.name = name
    if (email.toLowerCase() !== user.email.toLowerCase()) changes.email = email
    if (Object.keys(changes).length === 0) {
      setFormError(copy.profile.unchanged)
      return
    }

    setSaving(true)
    try {
      await updateProfile(changes)
      toast.add({ type: 'success', title: copy.profile.saved })
    } catch (error) {
      const result = toFormErrors(error, { 409: { email: auth.errors.emailTaken } })
      setFieldErrors(result.fieldErrors)
      setFormError(result.formError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {formError && <FormAlert>{formError}</FormAlert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            name="name"
            autoComplete="name"
            defaultValue={user.name}
            label={auth.fields.name.label}
            placeholder={auth.fields.name.placeholder}
            error={fieldErrors.name}
          />
          <FormField
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={user.email}
            label={auth.fields.email.label}
            placeholder={auth.fields.email.placeholder}
            error={fieldErrors.email}
          />
        </div>
        <Button type="submit" className="self-start" disabled={saving}>
          {saving && <Spinner />}
          {saving ? copy.profile.saving : copy.profile.save}
        </Button>
      </FieldGroup>
    </form>
  )
}

function PasswordForm() {
  const { fields } = copy.password
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const { currentPassword, newPassword, confirmPassword } = Object.fromEntries(new FormData(form))

    // Mirrors the server rules so most mistakes are caught before a round trip
    const clientErrors = {}
    if (!currentPassword) clientErrors.currentPassword = auth.errors.required
    if (!newPassword) clientErrors.newPassword = auth.errors.required
    else if (newPassword.length < 8 || newPassword.length > 72) clientErrors.newPassword = auth.errors.passwordLength
    if (newPassword && confirmPassword !== newPassword) clientErrors.confirmPassword = auth.errors.passwordMismatch
    setFieldErrors(clientErrors)
    setFormError(null)
    if (Object.keys(clientErrors).length > 0) {
      form.querySelector('[aria-invalid="true"]')?.focus()
      return
    }

    setSaving(true)
    try {
      await meApi.changePassword(currentPassword, newPassword)
      form.reset()
      toast.add({ type: 'success', title: copy.password.saved })
    } catch (error) {
      // Client checks cover the length rules, so a 400 here means the current password was wrong
      const result = toFormErrors(error, { 400: { currentPassword: copy.password.incorrect } })
      setFieldErrors(result.fieldErrors)
      setFormError(result.formError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {formError && <FormAlert>{formError}</FormAlert>}
        <FormField
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          className="sm:max-w-sm"
          {...fields.currentPassword}
          error={fieldErrors.currentPassword}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            name="newPassword"
            type="password"
            autoComplete="new-password"
            {...fields.newPassword}
            description={auth.passwordHint}
            error={fieldErrors.newPassword}
          />
          <FormField
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...fields.confirmPassword}
            error={fieldErrors.confirmPassword}
          />
        </div>
        <Button type="submit" variant="outline" className="self-start" disabled={saving}>
          {saving && <Spinner />}
          {saving ? copy.password.saving : copy.password.save}
        </Button>
      </FieldGroup>
    </form>
  )
}

function AddressCard({ address, busy, onMakeDefault, onRemove }) {
  const { line1, line2, city, state, postalCode, country, isDefault } = address
  const { confirmRemove } = copy.addresses

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5 leading-snug">
          <span className="truncate font-medium">{line1}</span>
          {line2 && <span className="text-muted-foreground">{line2}</span>}
          <span className="text-muted-foreground">{[city, state, postalCode].filter(Boolean).join(', ')}</span>
          <span className="text-muted-foreground">{country}</span>
        </div>
        {isDefault && <Badge variant="secondary">{addressCopy.defaultBadge}</Badge>}
      </div>
      <div className="mt-auto flex flex-wrap gap-1">
        {!isDefault && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={onMakeDefault}>
            <StarIcon data-icon="inline-start" />
            {copy.addresses.makeDefault}
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="ghost" size="sm" disabled={busy} />}>
            <Trash2Icon data-icon="inline-start" />
            {copy.addresses.remove}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmRemove.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmRemove.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{confirmRemove.cancel}</AlertDialogCancel>
              {/* A Close button, so the dialog shuts as the delete starts */}
              <AlertDialogCancel variant="destructive" onClick={onRemove}>
                {confirmRemove.confirm}
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  )
}

function Addresses() {
  const [addresses, setAddresses] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [adding, setAdding] = useState(false)
  // Id of the address a request is in flight for, so its buttons can't be double-pressed
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(
    () => meApi.listAddresses().then(setAddresses, (error) => setLoadError(toFormErrors(error).formError)),
    []
  )

  useEffect(() => {
    load()
  }, [load])

  function retry() {
    setLoadError(null)
    load()
  }

  async function run(id, request, onDone) {
    setActionError(null)
    setBusyId(id)
    try {
      await request()
      onDone()
    } catch (error) {
      setActionError(toFormErrors(error).formError ?? auth.errors.generic)
    } finally {
      setBusyId(null)
    }
  }

  const makeDefault = (id) =>
    run(
      id,
      () => meApi.updateAddress(id, { isDefault: true }),
      () => {
        setAddresses((current) => current.map((a) => ({ ...a, isDefault: a.id === id })))
        toast.add({ type: 'success', title: copy.addresses.defaultChanged })
      }
    )

  const remove = (id) =>
    run(
      id,
      () => meApi.removeAddress(id),
      () => {
        setAddresses((current) => current.filter((a) => a.id !== id))
        toast.add({ type: 'success', title: copy.addresses.removed })
      }
    )

  function onSaved(address) {
    setAddresses((current) => [
      ...(address.isDefault ? current.map((a) => ({ ...a, isDefault: false })) : current),
      address,
    ])
    setAdding(false)
    toast.add({ type: 'success', title: copy.addresses.added })
  }

  if (loadError) {
    return (
      <Alert variant="destructive" role="alert">
        <CircleAlertIcon />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          {copy.addresses.loadError}
          <Button variant="outline" size="sm" onClick={retry}>
            {copy.addresses.retry}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!addresses) {
    return (
      <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {actionError && <FormAlert>{actionError}</FormAlert>}

      {addresses.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              busy={busyId === address.id}
              onMakeDefault={() => makeDefault(address.id)}
              onRemove={() => remove(address.id)}
            />
          ))}
        </ul>
      ) : (
        !adding && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPinIcon className="size-4" aria-hidden="true" />
            {copy.addresses.empty}
          </p>
        )
      )}

      {adding ? (
        <AddressForm isFirst={addresses.length === 0} onSaved={onSaved} onCancel={() => setAdding(false)} />
      ) : (
        <Button variant="outline" className="self-start" onClick={() => setAdding(true)}>
          <PlusIcon data-icon="inline-start" />
          {addressCopy.add}
        </Button>
      )}
    </div>
  )
}

function AccountPage() {
  const { user } = useAuth()

  return (
    <>
      <AccountHeader title={copy.title} description={copy.description}>
        <p className="text-sm text-muted-foreground">{copy.memberSince(formatDate(user.createdAt))}</p>
      </AccountHeader>
      <div className="flex flex-col gap-6">
        <Section title={copy.profile.title} description={copy.profile.description}>
          <ProfileForm />
        </Section>
        <Section title={copy.password.title} description={copy.password.description}>
          <PasswordForm />
        </Section>
        <Section title={copy.addresses.title} description={copy.addresses.description}>
          <Addresses />
        </Section>
      </div>
    </>
  )
}

export default AccountPage
