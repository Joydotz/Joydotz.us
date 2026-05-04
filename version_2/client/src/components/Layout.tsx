import { Outlet } from 'react-router-dom'
import Nav from './Nav'
import Footer from './sections/Footer'

export default function Layout() {
  return (
    <div className="bg-background text-on-background selection:bg-primary-container selection:text-on-primary-container bg-grain min-h-screen">
      <Nav />
      <main className="pt-24">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
