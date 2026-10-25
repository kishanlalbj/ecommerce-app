import { Badge } from '@/components/ui/badge'
import { siteConfig } from '@/config/site'

const VARIANTS = { cancelled: 'destructive', pending: 'outline' }

function OrderStatusBadge({ status }) {
  return <Badge variant={VARIANTS[status] ?? 'secondary'}>{siteConfig.order.status[status]}</Badge>
}

export { OrderStatusBadge }
