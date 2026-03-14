import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import LandingPage from './pages/LandingPage'
import BasketPage from './pages/BasketPage'
import TerminalConfigPage from './pages/TerminalConfigPage'

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/basket" element={<BasketPage />} />
          <Route path="/terminal-config" element={<TerminalConfigPage />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  )
}
