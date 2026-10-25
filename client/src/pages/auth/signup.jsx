import { FormField } from '@/components/common/form-field'
import { siteConfig } from '@/config/site'
import { useAuth } from '@/context/auth-context'
import { AuthCard } from '@/pages/auth/auth-card'
import { useAuthForm } from '@/pages/auth/use-auth-form'

const { auth, routes } = siteConfig
const { fields } = auth

function SignupPage() {
  const { register } = useAuth()
  const { fieldErrors, formError, submitting, onSubmit } = useAuthForm({
    signup: true,
    submit: ({ name, email, password }) =>
      register({ name: name.trim(), email: email.trim(), password }),
    // The server answers 409 when the email is already registered
    statusFieldErrors: { 409: { email: auth.errors.emailTaken } },
  })

  return (
    <AuthCard
      copy={auth.signup}
      switchTo={routes.login}
      formError={formError}
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <FormField
        name="name"
        autoComplete="name"
        autoFocus
        label={fields.name.label}
        placeholder={fields.name.placeholder}
        error={fieldErrors.name}
      />
      <FormField
        name="email"
        type="email"
        autoComplete="email"
        label={fields.email.label}
        placeholder={fields.email.placeholder}
        error={fieldErrors.email}
      />
      <FormField
        name="password"
        type="password"
        autoComplete="new-password"
        label={fields.password.label}
        placeholder={fields.password.placeholder}
        description={auth.passwordHint}
        error={fieldErrors.password}
      />
      <FormField
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        label={fields.confirmPassword.label}
        placeholder={fields.confirmPassword.placeholder}
        error={fieldErrors.confirmPassword}
      />
    </AuthCard>
  )
}

export default SignupPage
