/**
 * Client for Stripe Terminal endpoints on our backend (same API as apiClient).
 * Used for Stripe S700 reader: connection tokens, payment intents, capture.
 */
const getBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL
  if (!url) return ''
  return String(url).replace(/\/$/, '')
}

export const terminalClient = {
  getBaseUrl,

  async getConnectionToken() {
    const res = await fetch(`${getBaseUrl()}/connection_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) throw new Error(`Connection token failed: ${res.status}`)
    const data = await res.json()
    return data.secret
  },

  async createPaymentIntent({ amount, currency = 'gbp', capture_method = 'automatic', description = 'Test payment' }) {
    const res = await fetch(`${getBaseUrl()}/create_payment_intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency,
        capture_method,
        description,
      }),
    })
    if (!res.ok) throw new Error(`Create payment intent failed: ${res.status}`)
    return res.json()
  },

  async capturePaymentIntent(paymentIntentId) {
    const res = await fetch(`${getBaseUrl()}/capture_payment_intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_intent_id: paymentIntentId }),
    })
    if (!res.ok) throw new Error(`Capture failed: ${res.status}`)
    return res.json()
  },
}
