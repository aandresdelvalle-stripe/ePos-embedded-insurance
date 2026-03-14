import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Stripe from 'stripe'

const app = express()
const PORT = process.env.PORT ?? 8080
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

app.use(cors())
app.use(express.json())

app.get('/products', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: 'Stripe is not configured',
      message: 'Set STRIPE_SECRET_KEY in the server environment.',
    })
  }

  try {
    const all = []
    for await (const product of stripe.products.list({
      expand: ['data.default_price'],
      limit: 100,
    })) {
      const swag = product.metadata && product.metadata.swag
      if (swag !== 'true' && swag !== true) continue
      all.push(product)
    }

    const products = all.map((product) => {
      const price = product.default_price
      const amount =
        price && typeof price.unit_amount === 'number'
          ? (price.unit_amount / 100).toFixed(2)
          : '0.00'
      const imageUrl =
        product.images && product.images.length > 0 ? product.images[0] : null

      return {
        id: product.id,
        name: product.name || 'Product',
        price: amount,
        imageUrl,
      }
    })

    res.json(products)
  } catch (err) {
    console.error('Stripe products error:', err.message)
    res.status(500).json({
      error: 'Failed to fetch products',
      message: err.message,
    })
  }
})

app.get('/products/insurance', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: 'Stripe is not configured',
      message: 'Set STRIPE_SECRET_KEY in the server environment.',
    })
  }

  try {
    for await (const product of stripe.products.list({
      expand: ['data.default_price'],
      limit: 100,
    })) {
      const insurance = product.metadata && product.metadata.insurance
      if (insurance !== 'true' && insurance !== true) continue

      const price = product.default_price
      const amount =
        price && typeof price.unit_amount === 'number'
          ? (price.unit_amount / 100).toFixed(2)
          : '0.00'
      const imageUrl =
        product.images && product.images.length > 0 ? product.images[0] : null

      return res.json({
        id: product.id,
        name: product.name || 'Product',
        price: amount,
        imageUrl,
      })
    }
    res.status(404).json({ error: 'No insurance product found' })
  } catch (err) {
    console.error('Stripe insurance product error:', err.message)
    res.status(500).json({
      error: 'Failed to fetch insurance product',
      message: err.message,
    })
  }
})

/** Create a PaymentIntent for terminal (basket) with metadata.insurance_amount for later transfer. */
app.post('/create_payment_intent', express.json(), async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: 'Stripe is not configured',
      message: 'Set STRIPE_SECRET_KEY in the server environment.',
    })
  }

  const {
    amount,
    currency = 'gbp',
    capture_method = 'automatic',
    description = 'Basket payment',
    insurance_amount: insuranceAmount,
  } = req.body

  if (amount == null || amount < 1) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'amount (positive integer, in smallest currency unit) is required.',
    })
  }

  const amountInteger = Math.floor(Number(amount))
  const metadata = {}
  if (insuranceAmount != null && Number(insuranceAmount) > 0) {
    metadata.insurance_amount = String(Math.floor(Number(insuranceAmount)))
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInteger,
      currency: (currency || 'gbp').toLowerCase(),
      capture_method: capture_method || 'automatic',
      description: description || 'Basket payment',
      payment_method_types: ['card_present'],
      metadata: Object.keys(metadata).length ? metadata : undefined,
    })

    res.json({
      intent: paymentIntent.id,
      secret: paymentIntent.client_secret,
    })
  } catch (err) {
    console.error('Create payment intent error:', err.message)
    res.status(500).json({
      error: 'Failed to create payment intent',
      message: err.message,
    })
  }
})

/** Transfer the insurance portion to the connected account. Amount is read from PaymentIntent metadata.insurance_amount. */
app.post('/transfer-to-insurance', express.json(), async (req, res) => {
  const connectedAccountId = process.env.STRIPE_CONNECTED_ACCOUNT_ID
  if (!stripe) {
    return res.status(503).json({
      error: 'Stripe is not configured',
      message: 'Set STRIPE_SECRET_KEY in the server environment.',
    })
  }
  if (!connectedAccountId) {
    return res.status(503).json({
      error: 'Connected account not configured',
      message: 'Set STRIPE_CONNECTED_ACCOUNT_ID in the server environment.',
    })
  }

  const { payment_intent_id: paymentIntentId } = req.body
  if (!paymentIntentId) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'payment_intent_id is required.',
    })
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    const insuranceAmountRaw = paymentIntent.metadata?.insurance_amount
    const insuranceAmountPence = insuranceAmountRaw != null ? Math.floor(Number(insuranceAmountRaw)) : 0

    if (insuranceAmountPence < 1) {
      return res.json({ success: true, transferred: false, message: 'No insurance amount in PaymentIntent metadata.' })
    }

    const chargeId = paymentIntent.latest_charge
    if (!chargeId || typeof chargeId !== 'string') {
      return res.status(400).json({
        error: 'Charge not available',
        message: 'PaymentIntent has no charge to transfer from.',
      })
    }

    await stripe.transfers.create({
      amount: insuranceAmountPence,
      currency: (paymentIntent.currency || 'gbp').toLowerCase(),
      destination: connectedAccountId,
      source_transaction: chargeId,
      description: 'Insurance portion of sale',
    })

    res.json({ success: true, transferred: true })
  } catch (err) {
    console.error('Transfer to insurance error:', err.message)
    res.status(500).json({
      error: 'Transfer failed',
      message: err.message,
    })
  }
})

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    stripe_configured: !!stripe,
  })
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  if (!stripe) {
    console.warn('STRIPE_SECRET_KEY is not set; GET /products will return 503.')
  }
})
