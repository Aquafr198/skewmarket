/**
 * Extrait les CLOB token IDs des events Gamma API et construit
 * un mapping inverse tokenId -> { eventId, marketIndex, outcomeIndex }
 *
 * Polymarket renvoie clobTokenIds comme un array de strings directement
 * sur chaque objet market : ["tokenId_YES", "tokenId_NO"]
 */

/**
 * @param {Array} events - Events avec _scores pré-calculés
 * @returns {{ tokenIds: string[], tokenMap: Map<string, {eventId: string, marketIndex: number, outcomeIndex: number}> }}
 */
export function buildTokenMap(events) {
  const tokenIds = [];
  const tokenMap = new Map();

  for (const event of events) {
    if (!event.markets || !Array.isArray(event.markets)) continue;

    for (let mi = 0; mi < event.markets.length; mi++) {
      const market = event.markets[mi];
      const ids = market?.clobTokenIds;

      if (!Array.isArray(ids)) continue;

      for (let oi = 0; oi < ids.length; oi++) {
        const tokenId = ids[oi];
        if (tokenId && typeof tokenId === 'string' && tokenId.length > 0) {
          tokenIds.push(tokenId);
          tokenMap.set(tokenId, {
            eventId: event.id || event.slug,
            marketIndex: mi,
            outcomeIndex: oi,
          });
        }
      }
    }
  }

  return { tokenIds, tokenMap };
}
