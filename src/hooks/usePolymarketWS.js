import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
const MAX_ASSETS = 500;
const PING_INTERVAL_MS = 10000;
const FLUSH_INTERVAL_MS = 200;
const FLASH_DURATION_MS = 1500;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

/**
 * Hook WebSocket temps réel pour les prix Polymarket.
 *
 * @param {string[]} tokenIds - CLOB token IDs à souscrire (max 500)
 * @returns {{
 *   prices: Map<string, number>,
 *   priceDirections: Map<string, 'up'|'down'>,
 *   connectionStatus: 'disconnected'|'connecting'|'connected'|'error'
 * }}
 */
export default function usePolymarketWS(tokenIds) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [prices, setPrices] = useState(() => new Map());
  const [priceDirections, setPriceDirections] = useState(() => new Map());

  const wsRef = useRef(null);
  const pricesRef = useRef(new Map());
  const directionsRef = useRef(new Map());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const flushTimerRef = useRef(null);
  const pendingFlushRef = useRef(false);
  const flashTimeoutsRef = useRef(new Map());
  const connectedSinceRef = useRef(null);
  const tokenIdsRef = useRef([]);
  const mountedRef = useRef(true);

  // Garder tokenIds à jour sans trigger d'effect
  tokenIdsRef.current = tokenIds?.slice(0, MAX_ASSETS) || [];

  const clearAllTimers = useCallback(() => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    flashTimeoutsRef.current.forEach(t => clearTimeout(t));
    flashTimeoutsRef.current.clear();
    pingIntervalRef.current = null;
    flushTimerRef.current = null;
    reconnectTimeoutRef.current = null;
  }, []);

  const flushUpdates = useCallback(() => {
    if (!mountedRef.current) return;
    pendingFlushRef.current = false;
    setPrices(new Map(pricesRef.current));
    setPriceDirections(new Map(directionsRef.current));
  }, []);

  const scheduleFlush = useCallback(() => {
    if (pendingFlushRef.current) return;
    pendingFlushRef.current = true;
    flushTimerRef.current = setTimeout(flushUpdates, FLUSH_INTERVAL_MS);
  }, [flushUpdates]);

  const handleMessage = useCallback((event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    // Gérer les différents types de messages
    // price_changes / last_trade_price contiennent des updates de prix
    const updates = [];

    if (Array.isArray(data)) {
      // Certains messages arrivent comme array
      for (const msg of data) {
        if (msg.asset_id && msg.price !== undefined) {
          updates.push({ assetId: msg.asset_id, price: parseFloat(msg.price) });
        }
      }
    } else if (data.asset_id && data.price !== undefined) {
      updates.push({ assetId: data.asset_id, price: parseFloat(data.price) });
    }

    // Messages avec changes/price_changes array
    if (data.price_changes && Array.isArray(data.price_changes)) {
      for (const change of data.price_changes) {
        if (change.asset_id && change.price !== undefined) {
          updates.push({ assetId: change.asset_id, price: parseFloat(change.price) });
        }
      }
    }
    if (data.changes && Array.isArray(data.changes)) {
      for (const change of data.changes) {
        if (change.asset_id && change.price !== undefined) {
          updates.push({ assetId: change.asset_id, price: parseFloat(change.price) });
        }
      }
    }

    // Appliquer les updates
    for (const { assetId, price } of updates) {
      if (isNaN(price) || price < 0 || price > 1) continue;

      const prevPrice = pricesRef.current.get(assetId);
      pricesRef.current.set(assetId, price);

      // Direction pour flash
      if (prevPrice !== undefined && prevPrice !== price) {
        const dir = price > prevPrice ? 'up' : 'down';
        directionsRef.current.set(assetId, dir);

        // Clear flash après FLASH_DURATION_MS
        const prevTimeout = flashTimeoutsRef.current.get(assetId);
        if (prevTimeout) clearTimeout(prevTimeout);
        flashTimeoutsRef.current.set(assetId, setTimeout(() => {
          directionsRef.current.delete(assetId);
          scheduleFlush();
        }, FLASH_DURATION_MS));
      }
    }

    if (updates.length > 0) {
      scheduleFlush();
    }
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
    if (tokenIdsRef.current.length === 0) {
      setConnectionStatus('disconnected');
      return;
    }

    disconnect();
    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnectionStatus('connected');
        reconnectAttemptRef.current = 0;
        connectedSinceRef.current = Date.now();

        // Souscrire aux assets
        try {
          ws.send(JSON.stringify({
            assets_ids: tokenIdsRef.current,
            type: 'market',
          }));
        } catch {}

        // Démarrer le PING keepalive
        pingIntervalRef.current = setInterval(() => {
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send('PING');
            }
          } catch {}
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        // L'erreur est suivie par onclose, on gère la reconnexion là-bas
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        clearAllTimers();

        // Reconnexion avec backoff exponentiel
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

  // Effect principal : connecter quand les tokenIds changent
  useEffect(() => {
    mountedRef.current = true;

    // Debounce la connexion de 500ms pour éviter le thrashing au chargement initial
    const debounceTimer = setTimeout(() => {
      if (tokenIdsRef.current.length > 0) {
        reconnectAttemptRef.current = 0;
        connect();
      }
    }, 500);

    return () => {
      mountedRef.current = false;
      clearTimeout(debounceTimer);
      disconnect();
    };
  }, [tokenIds?.length || 0]); // Re-connecter seulement si le nombre de tokens change significativement

  return { prices, priceDirections, connectionStatus };
}
