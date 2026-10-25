import { useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { siteConfig } from '@/config/site'
import { toFormErrors } from '@/lib/form-errors'
import { ordersApi } from '@/services/orders'

const { cancel: copy } = siteConfig.orders

// Asks for confirmation, cancels a pending order and hands the updated order to onCancelled
function CancelOrderButton({ orderId, onCancelled, size = 'sm' }) {
  const [cancelling, setCancelling] = useState(false)

  async function cancel() {
    setCancelling(true)
    try {
      onCancelled(await ordersApi.cancel(orderId))
      toast.add({ type: 'success', title: copy.done(orderId) })
    } catch (error) {
      // e.g. 409 when it was paid in the meantime
      toast.add({ type: 'error', title: toFormErrors(error).formError ?? siteConfig.auth.errors.generic })
    } finally {
      setCancelling(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size={size} disabled={cancelling} />}>
        {cancelling && <Spinner />}
        {cancelling ? copy.cancelling : copy.action}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title(orderId)}</AlertDialogTitle>
          <AlertDialogDescription>{copy.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{copy.keep}</AlertDialogCancel>
          {/* A Close button, so the dialog shuts as the cancel starts */}
          <AlertDialogCancel variant="destructive" onClick={cancel}>
            {copy.confirm}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { CancelOrderButton }
