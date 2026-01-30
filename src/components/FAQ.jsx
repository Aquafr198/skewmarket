import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const faqs = [
  {
    question: 'What is SkewMarket?',
    answer: "SkewMarket is a platform that scans Polymarket 24/7 to detect mispriced odds, arbitrage opportunities, and asymmetric bets. We help traders find hidden value in prediction markets before the crowd.",
  },
  {
    question: 'How does the mispricing detection work?',
    answer: 'Our algorithm analyzes real-time price movements across all active Polymarket events. For binary markets, we check if YES + NO prices deviate from 1.0. For multi-outcome events (like elections), we check if the sum of all YES prices deviates from 1.0. Significant deviations are flagged as edges.',
  },
  {
    question: 'What is Proof of Alpha?',
    answer: 'Every edge we detect is automatically tracked and verified against market resolution. You can see the full history of detected mispricings, their current status, and whether they resolved profitably. Full transparency, no fake numbers.',
  },
  {
    question: 'How do I receive alerts?',
    answer: 'Visit the Deals page to see real-time mispricing opportunities. The page auto-refreshes every 60 seconds and live prices are streamed via WebSocket. You can filter by confidence level, mispricing, volume, and more.',
  },
  {
    question: 'Is this financial advice?',
    answer: 'No. SkewMarket provides information and tools for educational purposes only. All trading decisions are your own responsibility. Past performance does not guarantee future results.',
  },
  {
    question: 'What data sources do you use?',
    answer: 'We use the official Polymarket Gamma API for event data and the Polymarket CLOB WebSocket for real-time price feeds. All data comes directly from Polymarket with no intermediaries.',
  },
];

function FAQItem({ faq, isActive, onClick }) {
  return (
    <div className="border-b border-skew-border">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between py-5 text-left hover:text-skew-text-secondary transition-colors"
      >
        <span className="font-medium text-sm pr-8">{faq.question}</span>
        <span className="relative w-5 h-5 flex-shrink-0">
          <span className="absolute top-1/2 left-1/2 w-3 h-0.5 bg-skew-text-primary -translate-x-1/2 -translate-y-1/2" />
          <span className={`absolute top-1/2 left-1/2 w-0.5 h-3 bg-skew-text-primary -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ${isActive ? 'rotate-90 opacity-0' : ''}`} />
        </span>
      </button>
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm text-skew-text-secondary leading-relaxed">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState(-1);

  return (
    <section id="faq" className="py-12 lg:py-20 px-4 lg:px-6">
      <div className="max-w-[700px] mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2"
        >
          FAQ
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          viewport={{ once: true }}
          className="text-skew-text-secondary mb-8 text-sm"
        >
          Everything you need to know about SkewMarket.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              isActive={activeIndex === index}
              onClick={() => setActiveIndex(activeIndex === index ? -1 : index)}
            />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-skew-text-secondary mb-4 text-sm">Still have questions? See the platform in action.</p>
          <Link to="/deals" onClick={() => window.scrollTo(0, 0)} className="btn-primary">
            Explore Markets
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
