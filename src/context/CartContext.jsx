import { createContext, useContext, useReducer } from 'react'

const CartContext = createContext(null)

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const { id, name, price, imageUrl, isInsurance } = action.payload
      const numericPrice = typeof price === 'number' ? price : parseFloat(String(price)) || 0
      const existing = state.find((item) => item.id === id)
      if (existing) {
        return state.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...state, { id, name, price: numericPrice, imageUrl, quantity: 1, isInsurance: !!isInsurance }]
    }
    case 'REMOVE':
      return state.filter((item) => item.id !== action.payload)
    case 'SET_QUANTITY': {
      const { id, quantity } = action.payload
      if (quantity < 1) return state.filter((item) => item.id !== id)
      return state.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    }
    case 'CLEAR':
      return []
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, [])

  const addToCart = (product, options = {}) => {
    dispatch({
      type: 'ADD',
      payload: {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl ?? null,
        isInsurance: !!options.isInsurance,
      },
    })
  }

  const removeFromCart = (id) => dispatch({ type: 'REMOVE', payload: id })

  const setQuantity = (id, quantity) => {
    dispatch({ type: 'SET_QUANTITY', payload: { id, quantity: Math.max(0, quantity) } })
  }

  const clearCart = () => dispatch({ type: 'CLEAR' })

  const cartCount = cart.reduce((sum, item) => sum + (item.isInsurance ? 0 : item.quantity), 0)

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, setQuantity, clearCart, cartCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
