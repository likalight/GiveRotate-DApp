/**
 * perksStore.js — Pool-level perk management
 * Perks are now tied to pools, not individual charities.
 */

const STORE_KEY = 'gr_pool_perks_v1'

export const PERK_BADGE_OPTIONS = [
  { emoji: '🎁', label: 'Gift' },
  { emoji: '🐾', label: 'Paw' },
  { emoji: '🏷️', label: 'Tag' },
  { emoji: '🎟️', label: 'Ticket' },
  { emoji: '🌿', label: 'Nature' },
  { emoji: '🤝', label: 'Handshake' },
  { emoji: '⭐', label: 'Star' },
  { emoji: '🏅', label: 'Medal' },
  { emoji: '💚', label: 'Heart' },
  { emoji: '🎖️', label: 'Award' },
]

function load() {
  try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : {} } catch { return {} }
}
function save(d) { try { localStorage.setItem(STORE_KEY, JSON.stringify(d)) } catch {} }

// poolId is the key
export function setPoolPerk(poolId, perk) {
  const d = load(); d[String(poolId)] = perk; save(d)
}

export function getPoolPerk(poolId) {
  return load()[String(poolId)] || null
}

export function removePoolPerk(poolId) {
  const d = load(); delete d[String(poolId)]; save(d)
}

export function checkPerkEligibility(amount, perk) {
  if (!perk) return false
  try {
    const { ethers } = window._ethers || {}
    const threshold = BigInt(Math.round(perk.minThreshold * 1e6))
    return BigInt(amount.toString()) >= threshold
  } catch { return Number(amount) / 1e6 >= perk.minThreshold }
}

// Legacy support for charity-level perks (kept for backward compat)
export function setPerk(wallet, perk) {
  const d = load(); d[wallet.toLowerCase()] = perk; save(d)
}
export function getPerk(wallet) {
  return load()[wallet?.toLowerCase()] || null
}
export function removePerk(wallet) {
  const d = load(); delete d[wallet?.toLowerCase()]; save(d)
}
