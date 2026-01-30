import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX } from 'react-icons/hi';

// Animated Bell Icon Component
const AnimatedBellIcon = () => (
  <motion.svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-white"
    animate={{
      rotate: [0, 15, -15, 10, -10, 5, -5, 0],
    }}
    transition={{
      duration: 0.8,
      repeat: Infinity,
      repeatDelay: 1.5,
      ease: "easeInOut"
    }}
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    <motion.circle
      cx="18"
      cy="4"
      r="3"
      fill="#ef4444"
      stroke="none"
      animate={{
        scale: [1, 1.2, 1],
        opacity: [1, 0.8, 1]
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  </motion.svg>
);

const NOTIFICATION_DURATION = 5000;
const POLL_INTERVAL = 30000;
const GAMMA_API = '/api/polymarket';

export default function DealNotification() {
  const [notification, setNotification] = useState(null);
  const [progress, setProgress] = useState(100);
  const progressInterval = useRef(null);
  const lastSeenIds = useRef(new Set());
  const isInitialized = useRef(false);

  const dismissNotification = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    setNotification(null);
    setProgress(100);
  };

  const showNotification = (deal) => {
    setNotification(deal);
    setProgress(100);

    const startTime = Date.now();
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / NOTIFICATION_DURATION) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(progressInterval.current);
        setNotification(null);
      }
    }, 50);
  };

  const checkForNewDeals = async () => {
    try {
      const response = await fetch(`${GAMMA_API}/events?active=true&closed=false&archived=false&limit=50`);
      if (!response.ok) return;

      const data = await response.json();

      const validEvents = data.filter(event =>
        event?.id &&
        event?.title &&
        event?.markets?.length > 0 &&
        !event.closed
      );

      if (!isInitialized.current) {
        lastSeenIds.current = new Set(validEvents.map(e => e.id));
        isInitialized.current = true;
        return;
      }

      const newDeals = validEvents.filter(e => !lastSeenIds.current.has(e.id));

      if (newDeals.length > 0 && !notification) {
        const newDeal = newDeals[0];
        const market = newDeal.markets[0];

        let yesPrice = null;
        try {
          if (market?.outcomePrices) {
            const prices = JSON.parse(market.outcomePrices);
            if (Array.isArray(prices) && prices.length >= 1) {
              const parsed = parseFloat(prices[0]);
              if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
                yesPrice = (parsed * 100).toFixed(0);
              }
            }
          }
        } catch {}

        showNotification({
          id: newDeal.id,
          title: newDeal.title,
          image: newDeal.image,
          yesPrice,
          slug: newDeal.slug
        });
      }

      lastSeenIds.current = new Set(validEvents.map(e => e.id));
    } catch (error) {
      console.error('Failed to check for new deals:', error);
    }
  };

  useEffect(() => {
    const hasSeenDemo = localStorage.getItem('dealNotificationSeen');

    if (!hasSeenDemo) {
      const demoTimer = setTimeout(() => {
        showNotification({
          id: 'demo',
          title: 'New market opportunity detected! Check the latest deals.',
          image: null,
          yesPrice: '67',
          slug: 'demo'
        });
        localStorage.setItem('dealNotificationSeen', 'true');
      }, 2000);

      return () => {
        clearTimeout(demoTimer);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      };
    }

    checkForNewDeals();
    const pollInterval = setInterval(checkForNewDeals, POLL_INTERVAL);

    return () => {
      clearInterval(pollInterval);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
          className="fixed top-20 right-4 z-50 w-80 bg-white rounded-xl shadow-lg overflow-hidden border border-skew-border"
        >
          {/* Header */}
          <div className="bg-skew-accent px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AnimatedBellIcon />
              <span className="text-white text-sm font-medium">New Deal Detected</span>
            </div>
            <button
              onClick={dismissNotification}
              className="text-white/60 hover:text-white transition-colors"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex gap-3">
              {notification.image && (
                <img
                  src={notification.image}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-skew-text-primary line-clamp-2">
                  {notification.title}
                </p>
                {notification.yesPrice && (
                  <p className="text-xs text-skew-text-tertiary mt-1">
                    YES: <span className="text-emerald-600 font-medium">{notification.yesPrice}%</span>
                  </p>
                )}
              </div>
            </div>

            {/* View button */}
            <a
              href={`/deals`}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-skew-accent text-white text-sm font-medium hover:bg-skew-accent-hover transition-colors"
            >
              View Deals
            </a>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-skew-bg-secondary">
            <motion.div
              className="h-full bg-skew-accent"
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.05, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
