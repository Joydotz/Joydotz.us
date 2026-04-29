import Nav from './components/Nav'
import Hero from './components/sections/Hero'
import BrandMessage from './components/sections/BrandMessage'
import Collection from './components/sections/Collection'
import Ritual from './components/sections/Ritual'
import MessageCards from './components/sections/MessageCards'
import Footer from './components/sections/Footer'

export default function App() {
  return (
    <div className="font-body">
      <Nav />
      <main>
        <Hero />
        <BrandMessage />
        <Collection />
        <Ritual />
        <MessageCards />
      </main>
      <Footer />
    </div>
  )
}
