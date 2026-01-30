import { useState, useEffect, useRef, useCallback } from 'react';

const NEWS_API = '/api/news';
const POLL_INTERVAL = 5 * 60 * 1000; // Refresh every 5 minutes
const MIN_REFETCH_DELAY = 30 * 1000; // Don't refetch within 30s

// Category → search queries for Google News RSS
const CATEGORY_QUERIES = {
  Politics: ['US politics prediction market', 'Trump policy', 'Congress legislation'],
  Crypto: ['bitcoin crypto market', 'ethereum price', 'crypto regulation'],
  Sports: ['NFL NBA sports betting odds', 'Super Bowl', 'soccer football'],
  Culture: ['pop culture entertainment', 'celebrity news', 'video games'],
  Finance: ['stock market Wall Street', 'IPO stocks investing'],
  Tech: ['technology AI startups'],
  World: ['geopolitics Ukraine Russia', 'NATO trade war', 'world news'],
  Economy: ['economy GDP inflation', 'Federal Reserve interest rates'],
};

function parseRSSItems(xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const items = doc.querySelectorAll('item');
    const results = [];

    items.forEach((item) => {
      const title = item.querySelector('title')?.textContent?.trim() || '';
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
      const source = item.querySelector('source')?.textContent?.trim() || '';
      const description = item.querySelector('description')?.textContent?.trim() || '';

      // Extract clean description (strip HTML)
      let cleanDesc = '';
      try {
        const descDoc = parser.parseFromString(`<div>${description}</div>`, 'text/html');
        cleanDesc = descDoc.body?.textContent?.trim() || '';
      } catch {
        cleanDesc = description.replace(/<[^>]*>/g, '').trim();
      }

      if (title && link) {
        results.push({
          title,
          link,
          pubDate: pubDate ? new Date(pubDate) : null,
          source,
          description: cleanDesc.slice(0, 200),
        });
      }
    });

    return results;
  } catch {
    return [];
  }
}

function matchNewsToEvents(newsItems, events) {
  if (!events || events.length === 0) return newsItems;

  // Build keyword set from event titles
  const eventKeywords = new Set();
  for (const event of events) {
    const title = (event.title || '').toLowerCase();
    // Extract meaningful words (4+ chars, skip common words)
    const skip = new Set(['will', 'what', 'when', 'with', 'this', 'that', 'from', 'have', 'been', 'more', 'than', 'before', 'after', 'about', 'into', 'over', 'under', 'does', 'their', 'which', 'would', 'could', 'should', 'other', 'each', 'most', 'some', 'these', 'those', 'them', 'then', 'only', 'very', 'just', 'also', 'year', 'years', 'market', 'price']);
    const words = title.match(/[a-z]{4,}/g) || [];
    for (const w of words) {
      if (!skip.has(w)) eventKeywords.add(w);
    }
  }

  // Score each news item by keyword overlap
  return newsItems.map(item => {
    const titleLower = (item.title || '').toLowerCase();
    let relevance = 0;
    for (const kw of eventKeywords) {
      if (titleLower.includes(kw)) relevance++;
    }
    return { ...item, relevance };
  }).sort((a, b) => b.relevance - a.relevance || (b.pubDate || 0) - (a.pubDate || 0));
}

export default function useNews(events, activeCategory) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastFetchRef = useRef(0);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const fetchNews = useCallback(async (force = false) => {
    // Prevent excessive refetching from event updates
    if (!force && Date.now() - lastFetchRef.current < MIN_REFETCH_DELAY) return;

    try {
      setLoading(true);
      setError(null);

      // Pick queries based on active category or use general ones
      const queries = activeCategory && CATEGORY_QUERIES[activeCategory]
        ? CATEGORY_QUERIES[activeCategory]
        : ['prediction market polymarket', 'politics crypto sports news'];

      const allItems = [];
      const seenTitles = new Set();

      for (const query of queries) {
        try {
          const url = `${NEWS_API}/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
          const response = await fetch(url);
          if (!response.ok) continue;

          const xmlText = await response.text();
          const items = parseRSSItems(xmlText);

          for (const item of items) {
            // Deduplicate by title
            const key = item.title.toLowerCase().slice(0, 60);
            if (!seenTitles.has(key)) {
              seenTitles.add(key);
              allItems.push({ ...item, category: activeCategory || 'General' });
            }
          }
        } catch {
          // Skip failed query
        }
      }

      // Match and sort by relevance to Polymarket events
      const matched = matchNewsToEvents(allItems, eventsRef.current);
      setArticles(matched);
      lastFetchRef.current = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchNews(true);
    const interval = setInterval(() => fetchNews(true), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNews]);

  return { articles, loading, error, refetch: fetchNews };
}
