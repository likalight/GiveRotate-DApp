/**
 * adminAuth.js
 * Simple browser-side admin credential store.
 * Password is hashed with SubtleCrypto SHA-256 before storage.
 *
 * Default credentials (set on first run):
 *   username: admin
 *   password: GiveRotate2024!
 *
 * In production: replace with a proper backend auth service.
 */

const AUTH_KEY = 'giverotate_admin_auth_v1'

async function sha256(str) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

async function ensureDefaults() {
  const existing = loadAuth()
  if (existing) return
  const hash = await sha256('GiveRotate2024!')
  localStorage.setItem(AUTH_KEY, JSON.stringify({ username: 'admin', passwordHash: hash }))
}

export async function verifyAdminCredentials(username, password) {
  await ensureDefaults()
  const auth = loadAuth()
  if (!auth) return false
  if (username !== auth.username) return false
  const hash = await sha256(password)
  return hash === auth.passwordHash
}

export async function changeAdminCredentials(currentPassword, newUsername, newPassword) {
  await ensureDefaults()
  const auth = loadAuth()
  const currentHash = await sha256(currentPassword)
  if (currentHash !== auth.passwordHash) throw new Error('Current password incorrect')
  const newHash = await sha256(newPassword)
  localStorage.setItem(AUTH_KEY, JSON.stringify({ username: newUsername, passwordHash: newHash }))
}

export function getAdminUsername() {
  const auth = loadAuth()
  return auth?.username || 'admin'
}
