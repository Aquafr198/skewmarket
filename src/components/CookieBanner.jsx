import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('cookiesAccepted');
    if (!accepted) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookiesAccepted', 'true');
    setIsVisible(false);
  };

  const handleReject = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-[9999] bg-white text-skew-text-primary p-6 rounded-xl max-w-sm shadow-lg border border-skew-border"
        >
          <p className="font-semibold mb-2 text-sm">This website uses cookies</p>
          <p className="text-xs text-skew-text-secondary mb-4 leading-relaxed">
            We use cookies to enhance your experience, analyze site traffic and deliver personalized content.{' '}
            <span className="text-skew-text-tertiary">
              Read our <a href="#" className="text-skew-accent hover:underline">Cookie Policy</a>.
            </span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              className="flex-1 py-2.5 px-5 bg-skew-bg-secondary rounded-lg text-xs font-medium hover:bg-skew-bg-tertiary transition-colors"
            >
              Reject
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 py-2.5 px-5 bg-skew-accent text-white rounded-lg text-xs font-medium hover:bg-skew-accent-hover transition-colors"
            >
              Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
