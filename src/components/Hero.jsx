import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section className="py-20 lg:py-28 px-4 lg:px-6">
      <div className="max-w-[800px] mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-skew-text-primary tracking-tight leading-tight mb-6"
        >
          Find Mispriced{' '}
          <span className="text-skew-accent">Prediction Markets</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg text-skew-text-secondary max-w-xl mx-auto mb-8 leading-relaxed"
        >
          Our algorithm scans Polymarket 24/7 to detect mispriced odds, arbitrage opportunities, and asymmetric bets before anyone else.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-center gap-3"
        >
          <Link to="/deals" onClick={() => window.scrollTo(0, 0)} className="btn-primary px-6 py-3 text-base">
            Browse Markets
          </Link>
          <a
            href="#features"
            onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="btn-outline px-6 py-3 text-base"
          >
            Learn More
          </a>
        </motion.div>
      </div>
    </section>
  );
}
