import { useCart } from '../context/CartContext'
import './ProductCard.css'

export default function ProductCard({ product }) {
  const { name, price, imageUrl } = product
  const { addToCart } = useCart()

  const handleAddToCart = () => {
    addToCart(product)
  }

  return (
    <article className="product-card">
      <div className="product-card__image-wrap">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="product-card__image" />
        ) : (
          <div className="product-card__image-placeholder" aria-hidden />
        )}
      </div>
      <h2 className="product-card__title">{name}</h2>
      <p className="product-card__price">
        £{typeof price === 'number' ? price.toFixed(2) : price}
      </p>
      <p className="product-card__insurance" aria-hidden>
        <img src="/insurance-icon.png" alt="" className="product-card__insurance-icon" />
        <span className="product-card__insurance-label">Insurable</span>
      </p>
      <button type="button" className="product-card__button" onClick={handleAddToCart}>
        Add to cart
      </button>
    </article>
  )
}
