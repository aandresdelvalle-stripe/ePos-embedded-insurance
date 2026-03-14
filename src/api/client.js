/**
 * Backend API client.
 * Base URL is read from .env: VITE_API_URL
 */
const getBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL
  if (!url) {
    console.warn('VITE_API_URL is not set in .env')
    return ''
  }
  return url.replace(/\/$/, '')
}

export const apiClient = {
  getBaseUrl,

  async get(path) {
    const res = await fetch(`${getBaseUrl()}${path}`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },

  async post(path, body) {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json().catch(() => ({}))
  },

  /** Create a PaymentIntent for terminal (basket) with optional metadata.insurance_amount. Returns { intent, secret }. */
  async createPaymentIntentForTerminal({ amount, currency = 'gbp', capture_method = 'automatic', description, insurance_amount }) {
    const res = await fetch(`${getBaseUrl()}/create_payment_intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency,
        capture_method,
        description,
        insurance_amount: insurance_amount != null ? insurance_amount : undefined,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || `Create payment intent failed: ${res.status}`)
    }
    return res.json()
  },

  /** Request transfer of the insurance portion to the connected account. Amount is read from PaymentIntent metadata. */
  async transferToInsurance(paymentIntentId) {
    const res = await fetch(`${getBaseUrl()}/transfer-to-insurance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_intent_id: paymentIntentId }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || `Transfer failed: ${res.status}`)
    }
    return res.json().catch(() => ({}))
  },

  /** Returns the insurance product from Stripe (metadata.insurance = true), or null if not found. */
  async getInsuranceProduct() {
    const res = await fetch(`${getBaseUrl()}/products/insurance`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },
}
