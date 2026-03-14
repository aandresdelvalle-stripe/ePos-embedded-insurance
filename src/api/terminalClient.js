/**
 * Client for the Terminal server (TERMINAL_URL).
 * Used for Stripe S700 reader: connection tokens, payment intents, capture.
 */
const getBaseUrl = () => {
  const url = import.meta.env.VITE_TERMINAL_URL
  if (!url) return ''
  return String(url).replace(/\/$/, '')
}

export const terminalClient = {
  getBaseUrl,

  async getConnectionToken() {
    const res = await fetch(`${getBaseUrl()}/connection_token`, { method: 'POST' })
    if (!res.ok) throw new Error(`Connection token failed: ${res.status}`)
    const data = await res.json()
    return data.secret
  },

  async createPaymentIntent({ amount, currency = 'gbp', capture_method = 'automatic', description = 'Test payment' }) {
    const formData = new URLSearchParams()
    formData.append('amount', String(amount))
    formData.append('currency', currency)
    formData.append('capture_method', capture_method)
    formData.append('description', description)
    formData.append('payment_method_types[]', 'card_present')

    const res = await fetch(`${getBaseUrl()}/create_payment_intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })
    if (!res.ok) throw new Error(`Create payment intent failed: ${res.status}`)
    return res.json()
  },

  async capturePaymentIntent(paymentIntentId) {
    const formData = new URLSearchParams()
    formData.append('payment_intent_id', paymentIntentId)

    const res = await fetch(`${getBaseUrl()}/capture_payment_intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })
    if (!res.ok) throw new Error(`Capture failed: ${res.status}`)
    return res.json()
  },
}
