import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/shop" element={<div className="px-8 py-24">Shop — coming soon</div>} />
          <Route path="/about" element={<div className="px-8 py-24">About — coming soon</div>} />
          <Route path="/messages" element={<div className="px-8 py-24">Messages — coming soon</div>} />
          <Route path="/faq" element={<div className="px-8 py-24">FAQ — coming soon</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
