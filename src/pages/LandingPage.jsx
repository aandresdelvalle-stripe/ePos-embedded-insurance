import { useState, useEffect } from 'react'
import { apiClient } from '../api/client'
import Header from '../components/Header'
import ProductCard from '../components/ProductCard'
import './LandingPage.css'

const PLACEHOLDER_PRODUCTS = Array.from({ length: 10 }, (_, i) => ({
  id: `placeholder-${i + 1}`,
  name: `Product ${i + 1}`,
  price: (29.99 + i * 5).toFixed(2),
  imageUrl: null,
}))

export default function LandingPage() {
  const [products, setProducts] = useState(PLACEHOLDER_PRODUCTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // When baseUrl is empty we use relative URLs (same origin), so the request still runs.
    apiClient
      .get('/products')
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.products ?? data?.items ?? []
        if (list.length > 0) {
          setProducts(list.map((p) => ({
            id: p.id ?? p.sku,
            name: p.name ?? p.title ?? 'Product',
            price: p.price ?? p.amount ?? '0.00',
            imageUrl: p.imageUrl ?? p.image ?? p.image_url ?? null,
          })))
        }
      })
      .catch((err) => {
        setError(err.message)
        // Keep placeholder products on error
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="landing">
      <Header />
      <main className="landing__main">
        <h2 className="landing__section-title">New Arrivals</h2>
        {error && (
          <p className="landing__message landing__message--error" role="alert">
            Could not load products: {error}. Showing placeholders.
          </p>
        )}
        {loading && (
          <p className="landing__message">Loading products…</p>
        )}
        <div className="landing__grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>
    </div>
  )
}
