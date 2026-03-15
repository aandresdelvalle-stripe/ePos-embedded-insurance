import { useState, useEffect, useRef } from 'react'
import { loadStripeTerminal } from '@stripe/terminal-js'
import Header from '../components/Header'
import { terminalClient } from '../api/terminalClient'
import './TerminalConfigPage.css'

export default function TerminalConfigPage() {
  const [connectionStatus, setConnectionStatus] = useState('not_connected') // not_connected | connecting | connected
  const [readerOffline, setReaderOffline] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState('idle') // idle | charging | success | error
  const [message, setMessage] = useState('')
  const terminalRef = useRef(null)

  const apiBaseUrl = terminalClient.getBaseUrl()
  const readerId = import.meta.env.VITE_READER_ID || ''
  const locationId = import.meta.env.VITE_TERMINAL_LOCATION || ''

  const connectToReader = async () => {
    const terminal = terminalRef.current
    if (!terminal) return

    setConnectionStatus('connecting')
    setMessage('')
    setReaderOffline(false)

    try {
      const status = terminal.getConnectionStatus?.()
      if (status?.status === 'connected' || status === 'connected') {
        await terminal.disconnectReader()
      }
    } catch {
      // ignore
    }

    try {
      const location = locationId || undefined
      const discoverResult = await terminal.discoverReaders({ location, simulated: false })
      if (discoverResult.error) {
        setConnectionStatus('not_connected')
        setMessage(`Discover readers failed: ${discoverResult.error.message}`)
        return
      }

      const readers = discoverResult.discoveredReaders || []
      if (readers.length === 0) {
        setConnectionStatus('not_connected')
        setMessage('No readers found. Ensure a reader is registered and in the same location.')
        return
      }

      const reader = readerId
        ? readers.find((r) => r.id === readerId) || readers[0]
        : readers[0]

      const connResult = await terminal.connectReader(reader)
      if (connResult.error) {
        setConnectionStatus('not_connected')
        setMessage(`Connect reader failed: ${connResult.error.message}`)
        return
      }
      setMessage('')
    } catch (err) {
      setConnectionStatus('not_connected')
      setMessage(err?.message || 'Failed to connect.')
    }
  }

  useEffect(() => {
    if (!apiBaseUrl) {
      setMessage('Set VITE_API_URL in .env to use the terminal.')
      return
    }

    let cancelled = false

    async function initTerminal() {
      try {
        const StripeTerminal = await loadStripeTerminal()
        if (cancelled) return
        if (!StripeTerminal) {
          setMessage('Terminal SDK could not load (e.g. in non-browser environment).')
          return
        }

        const terminal = StripeTerminal.create({
          onFetchConnectionToken: () => terminalClient.getConnectionToken(),
          onUnexpectedReaderDisconnect: () => {
            setReaderOffline(true)
            setConnectionStatus('not_connected')
          },
          onConnectionStatusChange: (status) => {
            const s = status?.status ?? status
            setConnectionStatus(s === 'connected' ? 'connected' : s === 'connecting' ? 'connecting' : 'not_connected')
            if (s === 'connected') setReaderOffline(false)
          },
        })

        terminalRef.current = terminal
        connectToReader()
      } catch (err) {
        if (!cancelled) setMessage(err?.message || 'Failed to load terminal.')
      }
    }

    initTerminal()
    return () => { cancelled = true }
  }, [apiBaseUrl])

  const handleCharge = async () => {
    const terminal = terminalRef.current
    if (!terminal || connectionStatus !== 'connected') return

    setPaymentStatus('charging')
    setMessage('')

    try {
      const { intent, secret } = await terminalClient.createPaymentIntent({
        amount: 100,
        currency: 'gbp',
        capture_method: 'automatic',
        description: 'Test £1 charge',
      })

      const collectResult = await terminal.collectPaymentMethod(secret)
      if (collectResult.error) {
        setPaymentStatus('error')
        setMessage(collectResult.error.message || 'Collection failed')
        return
      }

      const processResult = await terminal.processPayment(collectResult.paymentIntent)
      if (processResult.error) {
        setPaymentStatus('error')
        setMessage(processResult.error.message || 'Payment failed')
        return
      }

      setPaymentStatus('success')
      setMessage('Payment successful. £1.00 charged.')
    } catch (err) {
      setPaymentStatus('error')
      setMessage(err?.message || 'Charge failed')
    }
  }

  const readerStatusLabel =
    connectionStatus === 'connected'
      ? 'Reader online'
      : connectionStatus === 'connecting'
        ? 'Connecting…'
        : readerOffline
          ? 'Reader offline'
          : 'Reader disconnected'

  return (
    <div className="terminal-config">
      <Header />
      <main className="terminal-config__main">
        <h1 className="terminal-config__title">Stripe S700 setup</h1>
        <p className="terminal-config__config-code">Config code: 07139</p>

        <section className="terminal-config__section">
          <h2 className="terminal-config__heading">Reader status</h2>
          <p
            className={`terminal-config__status terminal-config__status--${connectionStatus}`}
            aria-live="polite"
          >
            {readerStatusLabel}
          </p>
          {readerOffline && (
            <p className="terminal-config__offline">
              The reader has gone offline. Reconnect when it is available again.
            </p>
          )}
          {connectionStatus !== 'connected' && apiBaseUrl && (
            <button
              type="button"
              className="terminal-config__reconnect-btn"
              onClick={connectToReader}
              disabled={connectionStatus === 'connecting'}
            >
              {connectionStatus === 'connecting' ? 'Connecting…' : 'Reconnect'}
            </button>
          )}
        </section>

        <section className="terminal-config__section">
          <h2 className="terminal-config__heading">Test payment</h2>
          <p className="terminal-config__hint">Charge £1.00 (GBP) on the connected reader.</p>
          <button
            type="button"
            className="terminal-config__charge-btn"
            onClick={handleCharge}
            disabled={connectionStatus !== 'connected' || paymentStatus === 'charging'}
          >
            {paymentStatus === 'charging' ? 'Charging…' : 'Charge £1 on reader'}
          </button>
        </section>

        {(message || paymentStatus === 'success') && (
          <p
            className={`terminal-config__message terminal-config__message--${paymentStatus === 'success' ? 'success' : paymentStatus === 'error' ? 'error' : 'info'}`}
            role="alert"
          >
            {message}
          </p>
        )}
      </main>
    </div>
  )
}
