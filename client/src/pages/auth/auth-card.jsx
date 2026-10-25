import { CircleAlertIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'

// Shared shell for the login and sign-up pages
function AuthCard({ copy, switchTo, formError, submitting, onSubmit, children }) {
  // Carry "where to go after login" across when switching between login and sign-up
  const location = useLocation()

  return (
    <div className="flex justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>

        <form onSubmit={onSubmit} noValidate>
          <CardContent>
            <FieldGroup>
              {formError && (
                <Alert variant="destructive" role="alert">
                  <CircleAlertIcon />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              {children}
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting && <Spinner />}
                {submitting ? copy.submitting : copy.submit}
              </Button>
            </FieldGroup>
          </CardContent>
        </form>

        <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
          {copy.switchPrompt}
          <Link to={switchTo} state={location.state} className="font-medium text-foreground underline-offset-4 hover:underline">
            {copy.switchLink}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export { AuthCard }
