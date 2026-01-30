import { useState } from 'react';
import { HiExternalLink, HiNewspaper, HiSearch } from 'react-icons/hi';
import useNews from '../hooks/useNews';

const NEWS_CATEGORIES = [
  'All', 'Politics', 'Crypto', 'Sports', 'Culture',
  'Finance', 'Tech', 'World', 'Economy',
];

function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NewsCard({ article, index }) {
  const hasRelevance = article.relevance > 0;

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white rounded-xl p-4 border border-skew-border hover:border-skew-text-tertiary transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {article.source && (
            <span className="text-[11px] font-medium text-skew-text-primary bg-skew-bg-secondary px-2 py-0.5 rounded-full">
              {article.source}
            </span>
          )}
          {article.pubDate && (
            <span className="text-[11px] text-skew-text-tertiary">
              {timeAgo(article.pubDate)}
            </span>
          )}
          {hasRelevance && (
            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              Related to markets
            </span>
          )}
        </div>
        <HiExternalLink className="w-4 h-4 text-skew-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
      </div>

      <h3 className="font-medium text-sm text-skew-text-primary leading-snug line-clamp-2 mb-2 group-hover:text-skew-accent transition-colors">
        {article.title}
      </h3>

      {article.description && (
        <p className="text-xs text-skew-text-secondary leading-relaxed line-clamp-2">
          {article.description}
        </p>
      )}
    </a>
  );
}

export default function NewsFeed({ events }) {
  const [newsCategory, setNewsCategory] = useState('All');
  const activeQuery = newsCategory === 'All' ? null : newsCategory;
  const { articles, loading, error } = useNews(events, activeQuery);

  return (
    <div>
      {/* Category filter for news */}
      <div className="flex gap-1.5 flex-wrap mb-6">
        {NEWS_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setNewsCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              newsCategory === cat
                ? 'bg-skew-accent text-white'
                : 'bg-white text-skew-text-secondary hover:bg-skew-bg-tertiary border border-skew-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-10 h-10 border-2 border-skew-accent border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-skew-text-secondary text-sm">Loading news...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-white border border-skew-border rounded-xl p-8 text-center max-w-md mx-auto">
          <HiNewspaper className="w-8 h-8 text-skew-red mx-auto mb-3" />
          <p className="text-sm text-skew-text-secondary">Unable to load news feed.</p>
        </div>
      )}

      {/* Articles */}
      {!loading && !error && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-skew-text-tertiary">
              <span className="font-medium text-skew-text-primary">{articles.length}</span> articles
              {newsCategory !== 'All' && ` in ${newsCategory}`}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {articles.slice(0, 30).map((article, index) => (
              <NewsCard key={article.link + index} article={article} index={index} />
            ))}
          </div>

          {articles.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-full bg-skew-bg-tertiary flex items-center justify-center mx-auto mb-4">
                <HiSearch className="w-6 h-6 text-skew-text-tertiary" />
              </div>
              <h3 className="font-semibold text-base mb-1 text-skew-text-primary">No news found</h3>
              <p className="text-skew-text-secondary text-sm">Try selecting a different category.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
