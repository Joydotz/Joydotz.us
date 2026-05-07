import { EventPayloads } from './EventBus.js'
import { saveEmail } from '../services/emailService.js'

export async function handleOrderPaid(payload: EventPayloads['ORDER_PAID']): Promise<void> {
  // Send confirmation email to customer
  await saveEmail(payload.email, 'order-confirmation')
  // TODO: send full order details email (order items, total, shipping address)
}

export async function handleOrderRefunded(payload: EventPayloads['ORDER_REFUNDED']): Promise<void> {
  // Send refund notification to customer
  await saveEmail(payload.email, 'order-refund')
  // TODO: send refund details email
}
