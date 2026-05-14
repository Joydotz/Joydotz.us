import { EventPayloads } from './EventBus.js'
import { saveEmail, sendTransactionalEmail } from '../services/emailService.js'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function handleOrderPaid(payload: EventPayloads['ORDER_PAID']): Promise<void> {
  await saveEmail(payload.email, 'order-confirmation')
  const total = (payload.total / 100).toFixed(2)
  const idShort = escapeHtml(payload.orderId)
  await sendTransactionalEmail({
    to: payload.email,
    subject: 'Your order is confirmed',
    text: `Thank you for your order.\n\nOrder ID: ${payload.orderId}\nTotal: $${total}\n`,
    html: `<p>Thank you for your order.</p><p>Order ID: <strong>${idShort}</strong></p><p>Total: <strong>$${total}</strong></p>`,
  })
}

export async function handleOrderRefunded(payload: EventPayloads['ORDER_REFUNDED']): Promise<void> {
  await saveEmail(payload.email, 'order-refund')
  const total = (payload.total / 100).toFixed(2)
  const idShort = escapeHtml(payload.orderId)
  await sendTransactionalEmail({
    to: payload.email,
    subject: 'Your refund has been processed',
    text: `We've processed a refund for your order.\n\nOrder ID: ${payload.orderId}\nAmount: $${total}\n`,
    html: `<p>We've processed a refund for your order.</p><p>Order ID: <strong>${idShort}</strong></p><p>Amount: <strong>$${total}</strong></p>`,
  })
}
