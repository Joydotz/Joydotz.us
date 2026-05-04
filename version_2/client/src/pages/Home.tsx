import Hero from '../components/sections/Hero'
import Collection from '../components/sections/Collection'
import BentoGrid from '../components/sections/BentoGrid'
import ProductHighlight from '../components/sections/ProductHighlight'
import Newsletter from '../components/sections/Newsletter'

export default function Home() {
  return (
    <>
      <Hero />
      <Collection />
      <BentoGrid />
      <ProductHighlight />
      <Newsletter />
    </>
  )
}
