import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiChevronDown, HiExternalLink } from 'react-icons/hi';

function StatCard({ label, value, suffix, color }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-skew-border">
      <p className="text-xs text-skew-text-tertiary mb-1">{label}</p>
      <p className={`text-xl lg:text-2xl font-semibold tracking-tight ${color || 'text-skew-text-primary'}`}>
        {value}<span className="text-sm font-normal text-skew-text-tertiary">{suffix}</span>
      </p>
    </div>
  );
}

function timeAgo(isoDate) {
  if (!isoDate) return '';
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function PriceChange({ detected, current }) {
  const delta = ((current - detected) * 100).toFixed(1);
  const isUp = current > detected;
  const isDown = current < detected;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-skew-text-tertiary">{(detected * 100).toFixed(0)}</span>
      <span className="text-skew-text-tertiary/50">&rarr;</span>
      <span className={isUp ? 'text-emerald-600' : isDown ? 'text-skew-red' : 'text-skew-text-secondary'}>
        {(current * 100).toFixed(0)}
      </span>
      <span className={`text-[10px] ${isUp ? 'text-emerald-600' : isDown ? 'text-skew-red' : 'text-skew-text-tertiary'}`}>
        ({isUp ? '+' : ''}{delta})
      </span>
    </span>
  );
}

function StatsAndEntries({ entries, stats, scrollable }) {
  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Edges Detected" value={stats.totalEdges} suffix="" />
        <StatCard
          label="Win Rate"
          value={stats.winRate}
          suffix="%"
          color={parseFloat(stats.winRate) >= 50 ? 'text-emerald-600' : 'text-skew-red'}
        />
        <StatCard label="Avg Resolution" value={stats.avgResolutionDays} suffix="d" />
        <StatCard
          label="Theoretical Profit"
          value={`+${stats.totalTheoreticalProfit}`}
          suffix="&#162;"
          color="text-emerald-600"
        />
      </div>

      {/* Entries List */}
      <div className="bg-white rounded-xl border border-skew-border overflow-hidden">
        <div className={scrollable ? 'max-h-[400px] overflow-y-auto' : ''}>
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 px-4 py-3 text-sm ${i !== entries.length - 1 ? 'border-b border-skew-border-light' : ''}`}
            >
              <div className="flex-shrink-0">
                <span className={`block w-2.5 h-2.5 rounded-full ${
                  entry.resolved
                    ? entry.profit > 0 ? 'bg-skew-green' : 'bg-skew-red'
                    : 'bg-skew-text-tertiary animate-pulse'
                }`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-xs lg:text-sm text-skew-text-primary">
                  {entry.eventTitle}
                </p>
                <p className="text-[10px] text-skew-text-tertiary">
                  {entry.edgePercent.toFixed(1)}% {entry.mode} &middot; {timeAgo(entry.detectedAt)}
                </p>
              </div>
              <div className="flex-shrink-0 text-xs hidden sm:block">
                <PriceChange detected={entry.yesPrice} current={entry.currentYesPrice} />
              </div>
              <div className="flex-shrink-0 text-right w-16">
                {entry.resolved ? (
                  <span className={`text-xs font-semibold ${entry.profit > 0 ? 'text-emerald-600' : 'text-skew-red'}`}>
                    {entry.profit > 0 ? '+' : ''}{entry.profit}&#162;
                  </span>
                ) : (
                  <span className="text-xs text-skew-text-tertiary">Pending</span>
                )}
              </div>
              {entry.slug && (
                <a
                  href={`https://polymarket.com/event/${encodeURIComponent(entry.slug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-1 rounded hover:bg-skew-bg-secondary transition-colors"
                >
                  <HiExternalLink className="w-3.5 h-3.5 text-skew-text-tertiary" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProofOfAlpha({ entries, stats, fullPage = false }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (entries.length === 0) {
    if (fullPage) {
      return (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-full bg-skew-bg-tertiary flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-skew-text-tertiary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <h3 className="font-semibold text-base mb-2 text-skew-text-primary">No alpha tracked yet</h3>
          <p className="text-skew-text-secondary text-sm">Detected edges will appear here as the algorithm finds mispricings.</p>
        </div>
      );
    }
    return null;
  }

  // Full page mode
  if (fullPage) {
    return (
      <div>
        <StatsAndEntries entries={entries} stats={stats} scrollable={false} />
      </div>
    );
  }

  // Collapsible mode
  return (
    <div className="mb-6 lg:mb-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-skew-accent rounded-xl p-4 lg:p-5 flex items-center justify-between hover:bg-skew-accent-hover transition-colors group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div className="text-left min-w-0">
            <h3 className="font-medium text-sm lg:text-base text-white">Proof of Alpha</h3>
            <p className="text-xs text-white/60 truncate">
              {stats.totalEdges} edges &middot; {stats.winRate}% win rate &middot; +{stats.totalTheoreticalProfit}&#162; theoretical
            </p>
          </div>
        </div>
        <HiChevronDown className={`w-5 h-5 text-white/60 transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <StatsAndEntries entries={entries} stats={stats} scrollable={true} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
