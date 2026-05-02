import Nav from './components/Nav'
import BottomNav from './components/BottomNav'
import Hero from './components/sections/Hero'
import Collection from './components/sections/Collection'
import BentoGrid from './components/sections/BentoGrid'
import ProductHighlight from './components/sections/ProductHighlight'
import Newsletter from './components/sections/Newsletter'
import Footer from './components/sections/Footer'

export default function App() {
  return (
    <div className="bg-background text-on-background selection:bg-primary-container selection:text-on-primary-container bg-grain min-h-screen">
      <Nav />
      <main className="pt-24">
        <Hero />
        <Collection />
        <BentoGrid />
        <ProductHighlight />
        <Newsletter />
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
