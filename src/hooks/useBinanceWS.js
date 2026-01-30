import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'wss://stream.binance.com:9443/stream?streams=btcusdt@miniTicker/ethusdt@miniTicker/solusdt@miniTicker';
const FLUSH_INTERVAL_MS = 200;
const HEALTH_CHECK_MS = 30000;
const HEALTH_TIMEOUT_MS = 65000;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

const STREAM_MAP = {
  'btcusdt@miniTicker': 'BTC',
  'ethusdt@miniTicker': 'ETH',
  'solusdt@miniTicker': 'SOL',
};

/**
 * Hook WebSocket temps réel pour les prix Binance (BTC, ETH, SOL).
 *
 * @returns {{
 *   prices: { BTC: number|null, ETH: number|null, SOL: number|null },
 *   connectionStatus: 'disconnected'|'connecting'|'connected'|'error',
 *   lastUpdate: Date|null
 * }}
 */
export default function useBinanceWS() {
  const [prices, setPrices] = useState({ BTC: null, ETH: null, SOL: null });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);

  const wsRef = useRef(null);
  const pricesRef = useRef({ BTC: null, ETH: null, SOL: null });
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const flushTimerRef = useRef(null);
  const pendingFlushRef = useRef(false);
  const healthCheckRef = useRef(null);
  const lastMessageRef = useRef(Date.now());
  const mountedRef = useRef(true);

  const clearAllTimers = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (healthCheckRef.current) clearInterval(healthCheckRef.current);
    flushTimerRef.current = null;
    reconnectTimeoutRef.current = null;
    healthCheckRef.current = null;
  }, []);

  const flushUpdates = useCallback(() => {
    if (!mountedRef.current) return;
    pendingFlushRef.current = false;
    setPrices({ ...pricesRef.current });
    setLastUpdate(new Date());
  }, []);

  const scheduleFlush = useCallback(() => {
    if (pendingFlushRef.current) return;
    pendingFlushRef.current = true;
    flushTimerRef.current = setTimeout(flushUpdates, FLUSH_INTERVAL_MS);
  }, [flushUpdates]);

  const handleMessage = useCallback((event) => {
    lastMessageRef.current = Date.now();

    let parsed;
    try {
      parsed = JSON.parse(event.data);
    } catch {
      return;
    }

    // Combined stream format: { stream: "btcusdt@miniTicker", data: { c: "102000.50", ... } }
    const symbol = STREAM_MAP[parsed.stream];
    if (!symbol) return;

    const closePrice = parseFloat(parsed.data?.c);
    if (isNaN(closePrice) || closePrice <= 0) return;

    pricesRef.current[symbol] = closePrice;
    scheduleFlush();
  }, [scheduleFlush]);

  const disconnect = useCallback(() => {
    clearAllTimers();
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
  }, [clearAllTimers]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    disconnect();
    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnectionStatus('connected');
        reconnectAttemptRef.current = 0;
        lastMessageRef.current = Date.now();

        // Health check: si pas de message en 65s, force reconnect
        healthCheckRef.current = setInterval(() => {
          if (Date.now() - lastMessageRef.current > HEALTH_TIMEOUT_MS) {
            connect();
          }
        }, HEALTH_CHECK_MS);
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {};

      ws.onclose = () => {
        if (!mountedRef.current) return;
        clearAllTimers();

        if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            RECONNECT_BASE_MS * Math.pow(2, reconnectAttemptRef.current),
            RECONNECT_MAX_MS
          );
          reconnectAttemptRef.current++;
          setConnectionStatus('connecting');
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          setConnectionStatus('error');
        }
      };
    } catch {
      setConnectionStatus('error');
    }
  }, [disconnect, handleMessage, clearAllTimers]);

  useEffect(() => {
    mountedRef.current = true;

    // Petit délai pour éviter le thrashing au mount
    const timer = setTimeout(connect, 300);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { prices, connectionStatus, lastUpdate };
}
