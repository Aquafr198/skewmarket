import Header from './components/Header'
import Hero from './components/Hero'
import About from './components/About'
import Stats from './components/Stats'
import FAQ from './components/FAQ'
import Footer from './components/Footer'
import DealNotification from './components/DealNotification'

function App() {
  return (
    <div className="min-h-screen bg-skew-bg">
      <Header />
      <DealNotification />
      <main className="pt-14">
        <Hero />
        <About />
        <Stats />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}

export default App
