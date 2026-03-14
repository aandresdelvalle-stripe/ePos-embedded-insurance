import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { loadStripeTerminal } from '@stripe/terminal-js'
import { useCart } from '../context/CartContext'
import { apiClient } from '../api/client'
import { terminalClient } from '../api/terminalClient'
import Header from '../components/Header'
import './BasketPage.css'

const readerId = import.meta.env.VITE_READER_ID || ''
const locationId = import.meta.env.VITE_TERMINAL_LOCATION || ''

export default function BasketPage() {
  const { cart, addToCart, removeFromCart, setQuantity, clearCart } = useCart()
  const [insuranceProduct, setInsuranceProduct] = useState(null)
  const [payMessage, setPayMessage] = useState(null)
  const [payStatus, setPayStatus] = useState('idle') // idle | charging | success | error
  const [readerDisconnected, setReaderDisconnected] = useState(false)
  const terminalRef = useRef(null)

  const terminalUrl = terminalClient.getBaseUrl()

  useEffect(() => {
    if (!apiClient.getBaseUrl()) return
    apiClient.getInsuranceProduct().then(setInsuranceProduct).catch(() => setInsuranceProduct(null))
  }, [])

  const otherProductCount = insuranceProduct
    ? cart.filter((item) => item.id !== insuranceProduct.id).reduce((sum, item) => sum + item.quantity, 0)
    : 0

  useEffect(() => {
    if (!insuranceProduct) return
    const insuranceItem = cart.find((item) => item.id === insuranceProduct.id)
    if (!insuranceItem) return
    if (insuranceItem.quantity !== otherProductCount) {
      setQuantity(insuranceProduct.id, otherProductCount)
    }
  }, [cart, insuranceProduct, otherProductCount, setQuantity])

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const hasInsuranceInCart = insuranceProduct && cart.some((item) => item.id === insuranceProduct.id)

  const handleInsuranceChange = (e) => {
    if (!insuranceProduct) return
    if (e.target.checked) {
      addToCart(insuranceProduct, { isInsurance: true })
    } else {
      removeFromCart(insuranceProduct.id)
    }
  }

  const connectToReaderSilent = async () => {
    const terminal = terminalRef.current
    if (!terminal) return false
    try {
      const status = terminal.getConnectionStatus?.()
      if (status?.status === 'connected' || status === 'connected') return true
    } catch {
      // ignore
    }
    try {
      await terminal.disconnectReader()
    } catch {
      // ignore
    }
    try {
      const location = locationId || undefined
      const discoverResult = await terminal.discoverReaders({ location, simulated: false })
      if (discoverResult.error) {
        setPayMessage(`Discover readers failed: ${discoverResult.error.message}`)
        return false
      }
      const readers = discoverResult.discoveredReaders || []
      if (readers.length === 0) {
        setPayMessage('No readers found. Ensure a reader is registered and in the same location.')
        return false
      }
      const reader = readerId ? readers.find((r) => r.id === readerId) || readers[0] : readers[0]
      const connResult = await terminal.connectReader(reader)
      if (connResult.error) {
        setPayMessage(`Connect reader failed: ${connResult.error.message}`)
        return false
      }
      return true
    } catch (err) {
      setPayMessage(err?.message || 'Failed to connect to reader.')
      return false
    }
  }

  const handlePayInPerson = async () => {
    if (!terminalUrl) {
      setPayMessage('Terminal is not configured (VITE_TERMINAL_URL).')
      setPayStatus('error')
      return
    }
    setPayMessage(null)
    setPayStatus('charging')

    try {
      if (!terminalRef.current) {
        const StripeTerminal = await loadStripeTerminal()
        if (!StripeTerminal) {
          setPayMessage('Terminal SDK could not load.')
          setPayStatus('error')
          return
        }
        const terminal = StripeTerminal.create({
          onFetchConnectionToken: () => terminalClient.getConnectionToken(),
          onUnexpectedReaderDisconnect: () => {
            setReaderDisconnected(true)
            setPayMessage('Reader disconnected.')
          },
        })
        terminalRef.current = terminal
      }

      const connected = await connectToReaderSilent()
      if (!connected) {
        setPayStatus('error')
        return
      }

      const amountPence = Math.round(total * 100)
      const insuranceAmountPence = Math.round(
        cart.filter((item) => item.isInsurance).reduce((sum, item) => sum + item.price * item.quantity, 0) * 100
      )
      const { secret } = await apiClient.createPaymentIntentForTerminal({
        amount: amountPence,
        currency: 'gbp',
        capture_method: 'automatic',
        description: `Basket total £${total.toFixed(2)}`,
        insurance_amount: insuranceAmountPence > 0 ? insuranceAmountPence : undefined,
      })

      const terminal = terminalRef.current
      const collectResult = await terminal.collectPaymentMethod(secret)
      if (collectResult.error) {
        setPayMessage(collectResult.error.message || 'Payment collection failed.')
        setPayStatus('error')
        return
      }

      const processResult = await terminal.processPayment(collectResult.paymentIntent)
      if (processResult.error) {
        setPayMessage(processResult.error.message || 'Payment failed.')
        setPayStatus('error')
        return
      }

      const paymentIntentId = processResult.paymentIntent?.id
      if (paymentIntentId) {
        try {
          await apiClient.transferToInsurance(paymentIntentId)
        } catch (transferErr) {
          setPayMessage(
            'Thank you for your custom. Note: Insurance transfer could not be completed.'
          )
          setPayStatus('success')
          clearCart()
          return
        }
      }

      setPayStatus('success')
      setPayMessage('Thank you for your custom.')
      clearCart()
    } catch (err) {
      setPayMessage(err?.message || 'Payment failed.')
      setPayStatus('error')
    }
  }

  const insuranceCheckbox = insuranceProduct && (
    <label className="basket__insurance">
      <img
        src="/insurance-icon.png"
        alt=""
        className="basket__insurance-icon"
        aria-hidden
      />
      <input
        type="checkbox"
        checked={!!hasInsuranceInCart}
        onChange={handleInsuranceChange}
        className="basket__insurance-input"
      />
      <span className="basket__insurance-label">I want to insure my swag</span>
    </label>
  )

  if (cart.length === 0) {
    return (
      <div className="basket">
        <Header />
        <main className="basket__main">
          <h2 className="basket__title">Your basket</h2>
          {payStatus === 'success' ? (
            <>
              <p className="basket__thank-you" role="status">
                Thank you for your custom.
              </p>
              <Link to="/" className="basket__back">
                Continue shopping
              </Link>
            </>
          ) : (
            <>
              <p className="basket__empty">Your basket is empty.</p>
              {insuranceCheckbox}
              <Link to="/" className="basket__back">
                Continue shopping
              </Link>
            </>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="basket">
      <Header />
      <main className="basket__main">
        <h2 className="basket__title">Your basket</h2>
        <ul className="basket__list">
          {[...cart]
            .sort((a, b) => {
              const aIsInsurance = insuranceProduct && a.id === insuranceProduct.id
              const bIsInsurance = insuranceProduct && b.id === insuranceProduct.id
              if (aIsInsurance && !bIsInsurance) return 1
              if (!aIsInsurance && bIsInsurance) return -1
              return 0
            })
            .map((item) => {
            const lineTotal = item.price * item.quantity
            const isInsuranceProduct = insuranceProduct && item.id === insuranceProduct.id
            const imageSrc = isInsuranceProduct ? '/insurance-icon.png' : item.imageUrl
            return (
              <li key={item.id} className="basket-item">
                <div className="basket-item__image-wrap">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt=""
                      className="basket-item__image"
                    />
                  ) : (
                    <div className="basket-item__image-placeholder" aria-hidden />
                  )}
                </div>
                <div className="basket-item__details">
                  <p className="basket-item__name">{item.name}</p>
                  <div className="basket-item__row">
                    {isInsuranceProduct ? (
                      <span className="basket-item__qty-readonly">
                        Covers {item.quantity} item{item.quantity !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <label className="basket-item__qty-label">
                        Quantity
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            setQuantity(item.id, parseInt(e.target.value, 10) || 1)
                          }
                          className="basket-item__qty"
                        />
                      </label>
                    )}
                  </div>
                </div>
                <span className="basket-item__line-total">
                  £{lineTotal.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.id)}
                  className="basket-item__remove"
                  aria-label={`Remove ${item.name} from basket`}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ul>
        <div className="basket__total-row">
          <span className="basket__total-label">Total</span>
          <span className="basket__total-value">£{total.toFixed(2)}</span>
        </div>
        {insuranceCheckbox}
        <div className="basket__pay-section">
          <button
            type="button"
            className="basket__pay-btn"
            onClick={handlePayInPerson}
            disabled={payStatus === 'charging' || total <= 0}
          >
            {payStatus === 'charging' ? 'Processing…' : 'PAY IN PERSON'}
          </button>
          {readerDisconnected && (
            <p className="basket__pay-offline" role="alert">
              Reader disconnected. Try again when the reader is back online.
            </p>
          )}
          {payMessage && (
            <p
              className={`basket__pay-message basket__pay-message--${payStatus === 'success' ? 'success' : payStatus === 'error' ? 'error' : 'info'}`}
              role="alert"
            >
              {payMessage}
            </p>
          )}
        </div>
        <Link to="/" className="basket__back">
          Continue shopping
        </Link>
      </main>
    </div>
  )
}
