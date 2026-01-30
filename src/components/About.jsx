import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const features = [
  {
    number: '01',
    title: 'Real-time Scanning',
    description: '200+ live markets monitored with 60s refresh cycle and WebSocket price feeds.',
    dots: 1,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Edge Detection',
    description: 'Binary and multi-outcome mispricing analysis with confidence scoring.',
    dots: 2,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
    ),
  },
  {
    number: '03',
    title: 'CEX Lag Detector',
    description: 'Compares Binance spot prices to Polymarket odds to spot delayed reactions in real-time.',
    dots: 3,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Proof of Alpha',
    description: 'Every edge is tracked and verified on market resolution. Full transparency.',
    dots: 4,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22,4 12,14.01 9,11.01"/>
      </svg>
    ),
  },
];

function FeatureCard({ feature, index }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white rounded-xl p-5 border border-skew-border flex flex-col gap-4"
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((dot) => (
            <span
              key={dot}
              className={`w-1.5 h-1.5 rounded-full ${dot <= feature.dots ? 'bg-skew-accent' : 'bg-skew-border'}`}
            />
          ))}
        </div>
        <span className="text-xs text-skew-text-tertiary">{feature.number}</span>
      </div>

      <div className="text-skew-text-secondary">
        {feature.icon}
      </div>

      <div className="mt-auto">
        <p className="text-sm font-medium text-skew-text-primary mb-1">{feature.title}</p>
        <p className="text-xs text-skew-text-tertiary leading-relaxed">{feature.description}</p>
      </div>
    </motion.div>
  );
}

export default function About() {
  return (
    <section id="features" className="py-12 lg:py-20 px-4 lg:px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-10 lg:mb-14">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight mb-4"
          >
            <span className="text-skew-text-primary block">Spot every edge</span>
            <span className="text-skew-text-tertiary font-normal block">before the market corrects</span>
          </motion.h2>
          <p className="text-skew-text-secondary max-w-lg text-sm leading-relaxed">
            SkewMarket combines mispricing detection, CEX price lag analysis, and live Binance feeds to find opportunities others miss on Polymarket.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {features.map((feature, index) => (
            <FeatureCard key={feature.number} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
