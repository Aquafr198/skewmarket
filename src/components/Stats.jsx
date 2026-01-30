import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useState, useEffect } from 'react';

function Counter({ target, suffix = '', prefix = '', inView, decimals = 0 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = decimals > 0
        ? (target * easeOutQuart).toFixed(decimals)
        : Math.floor(target * easeOutQuart);
      setCount(current);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, target, decimals]);

  return <span>{prefix}{count}{suffix}</span>;
}

const stats = [
  { value: 200, suffix: '+', label: 'Live Markets Tracked', decimals: 0 },
  { value: 24, suffix: '/7', label: 'Real-Time Monitoring', decimals: 0 },
  { value: 60, suffix: 's', label: 'Refresh Interval', decimals: 0 },
  { value: 6, suffix: '', label: 'Smart Filters', decimals: 0 },
];

export default function Stats() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.3 });

  return (
    <section className="py-14 lg:py-20 px-4 lg:px-6 bg-skew-bg-secondary">
      <div className="max-w-[1200px] mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
          className="text-center text-xs text-skew-text-tertiary mb-10 tracking-wider uppercase font-medium"
        >
          Platform in numbers
        </motion.p>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight mb-2 text-skew-accent">
                <Counter target={stat.value} suffix={stat.suffix} prefix={stat.prefix || ''} inView={inView} decimals={stat.decimals} />
              </div>
              <p className="text-sm text-skew-text-secondary">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
