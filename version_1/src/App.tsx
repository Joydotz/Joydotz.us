import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Nav from './components/layout/Nav'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import About from './pages/About'
import Messages from './pages/Messages'
import FAQ from './pages/FAQ'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1">
          <Routes>
            <Route path="/"            element={<Home />} />
            <Route path="/shop"        element={<Shop />} />
            <Route path="/shop/:slug"  element={<ProductDetail />} />
            <Route path="/about"       element={<About />} />
            <Route path="/messages"    element={<Messages />} />
            <Route path="/faq"         element={<FAQ />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
