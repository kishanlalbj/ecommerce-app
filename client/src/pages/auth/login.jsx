import { FormField } from '@/components/common/form-field'
import { siteConfig } from '@/config/site'
import { useAuth } from '@/context/auth-context'
import { AuthCard } from '@/pages/auth/auth-card'
import { useAuthForm } from '@/pages/auth/use-auth-form'

const { auth, routes } = siteConfig
const { fields } = auth

function LoginPage() {
  const { login } = useAuth()
  const { fieldErrors, formError, submitting, onSubmit } = useAuthForm({
    submit: ({ email, password }) => login(email.trim(), password),
  })

  return (
    <AuthCard
      copy={auth.login}
      switchTo={routes.signup}
      formError={formError}
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <FormField
        name="email"
        type="email"
        autoComplete="email"
        autoFocus
        label={fields.email.label}
        placeholder={fields.email.placeholder}
        error={fieldErrors.email}
      />
      <FormField
        name="password"
        type="password"
        autoComplete="current-password"
        label={fields.password.label}
        placeholder={fields.password.placeholder}
        error={fieldErrors.password}
      />
    </AuthCard>
  )
}

export default LoginPage
