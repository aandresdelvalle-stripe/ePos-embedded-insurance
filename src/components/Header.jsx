import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import './Header.css'

export default function Header() {
  const { cartCount } = useCart()

  return (
    <header className="header">
      <div className="header__left">
        <Link to="/" className="header__home">
          <img
            src="/stripe-logo.png"
            alt="Stripe"
            className="header__logo"
          />
          <h1 className="header__title">SWAG Shop</h1>
        </Link>
      </div>
      <div className="header__right">
        <Link to="/basket" className="header__cart" aria-label="View basket">
          <svg className="header__cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          {cartCount > 0 && (
            <span className="header__cart-count" aria-hidden>{cartCount}</span>
          )}
        </Link>
        <Link to="/terminal-config" className="header__terminal" aria-label="Terminal setup">
          <svg className="header__terminal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </Link>
      </div>
    </header>
  )
}
