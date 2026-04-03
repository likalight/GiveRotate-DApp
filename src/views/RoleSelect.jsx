import { useState } from 'react'
import { verifyAdminCredentials } from '../lib/adminAuth.js'

const ROLES = [
  {
    id: 'donor',
    icon: '◈',
    label: 'Donor',
    tagline: 'Give & track your impact',
    desc: 'Connect your wallet, donate XSGD to the pool, receive an NFT receipt, and unlock exclusive charity perks.',
    bullets: ['Donate any amount ≥ 1 XSGD', 'Receive NFT donation receipts', 'Unlock charity perks with larger donations', 'Tax receipt via SingPass MyInfo'],
    color: '#00d67f',
    dim: 'rgba(0,214,127,0.07)',
    border: 'rgba(0,214,127,0.25)',
  },
  {
    id: 'charity',
    icon: '◎',
    label: 'Charity',
    tagline: 'View your payout history',
    desc: 'Connect the wallet registered to your charity. See your rotation position, payout history, and total XSGD received.',
    bullets: ['Verify your registered wallet', 'See your position in the queue', 'Full payout history by cycle', 'Track cumulative XSGD received'],
    color: '#5b9cf6',
    dim: 'rgba(91,156,246,0.07)',
    border: 'rgba(91,156,246,0.25)',
  },
  {
    id: 'admin',
    icon: '⬡',
    label: 'Administrator',
    tagline: 'Manage the entire protocol',
    desc: 'Add or remove charities, configure NFT perks, trigger payouts, pause the contract, and view all on-chain activity.',
    bullets: ['Add / remove charities + set perks', 'Configure perk thresholds per charity', 'Trigger rotation payouts', 'View all donations & events'],
    color: '#e8c97a',
    dim: 'rgba(232,201,122,0.07)',
    border: 'rgba(232,201,122,0.25)',
  },
]

export default function RoleSelect({ onSelect }) {
  const [hovered, setHovered]         = useState(null)
  const [showAuth, setShowAuth]       = useState(false)
  const [username, setUsername]       = useState('')
  const [password, setPassword]       = useState('')
  const [authError, setAuthError]     = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const handleClick = (id) => {
    if (id === 'admin') { setShowAuth(true); setUsername(''); setPassword(''); setAuthError('') }
    else onSelect(id)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthLoading(true); setAuthError('')
    try {
      const ok = await verifyAdminCredentials(username, password)
      if (ok) { setShowAuth(false); onSelect('admin') }
      else setAuthError('Incorrect username or password')
    } catch { setAuthError('Authentication error') }
    finally { setAuthLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', inset:0, backgroundImage:'linear-gradient(var(--border) 1px, transparent 1px),linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize:'56px 56px', opacity:.22, pointerEvents:'none' }} />
      <div style={{ position:'fixed', top:'38%', left:'50%', transform:'translate(-50%,-50%)', width:800, height:500, background:'radial-gradient(ellipse, rgba(0,214,127,0.05) 0%, transparent 65%)', pointerEvents:'none' }} />

      <header style={{ padding:'22px 36px', display:'flex', alignItems:'center', gap:10, position:'relative' }}>
        <div style={{ width:28, height:28, borderRadius:6, background:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, color:'#000' }}>G</div>
        <span style={{ fontWeight:800, fontSize:16, letterSpacing:'-0.02em' }}>Give<span style={{ color:'var(--green)' }}>Rotate</span></span>
        <span className="mono" style={{ fontSize:10, color:'var(--text3)', marginLeft:4 }}>Sepolia Testnet</span>
      </header>

      <main style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px 72px', position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:52, animation:'fadeUp .5s ease' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
            <span className="tag tag-green">
              <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)', display:'inline-block', animation:'pulse 2s infinite' }} />
              Live on Ethereum Sepolia
            </span>
          </div>
          <h1 style={{ fontFamily:'var(--font-d)', fontWeight:800, fontSize:'clamp(34px,5.5vw,60px)', letterSpacing:'-0.04em', lineHeight:1.06, marginBottom:12 }}>
            Who are you<br />
            <span style={{ fontFamily:'var(--font-s)', fontStyle:'italic', color:'var(--green)', fontWeight:400 }}>here as?</span>
          </h1>
          <p style={{ color:'var(--text2)', fontSize:16, maxWidth:460, margin:'0 auto' }}>
            A ROSCA-inspired charity donation protocol on Ethereum. Choose your role to get started.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, maxWidth:940, width:'100%', animation:'fadeUp .55s .1s ease both' }}>
          {ROLES.map((r, i) => (
            <button key={r.id} onClick={() => handleClick(r.id)}
              onMouseEnter={() => setHovered(r.id)} onMouseLeave={() => setHovered(null)}
              style={{ all:'unset', cursor:'pointer', background: hovered===r.id?r.dim:'var(--bg2)', border:`1px solid ${hovered===r.id?r.border:'var(--border)'}`, borderRadius:'var(--r3)', padding:'26px 22px', display:'flex', flexDirection:'column', transition:'all .2s', transform:hovered===r.id?'translateY(-4px)':'none', boxShadow:hovered===r.id?'0 16px 48px rgba(0,0,0,.32)':'none', animation:`fadeUp .5s ${0.1+i*.08}s ease both`, textAlign:'left' }}>
              <div style={{ width:48, height:48, borderRadius:12, background:hovered===r.id?`${r.color}20`:'var(--bg3)', border:`1px solid ${hovered===r.id?r.border:'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:hovered===r.id?r.color:'var(--text3)', marginBottom:18, transition:'all .2s' }}>{r.icon}</div>
              <div style={{ fontWeight:800, fontSize:19, letterSpacing:'-0.02em', marginBottom:3, color:hovered===r.id?r.color:'var(--text)', transition:'color .2s' }}>{r.label}</div>
              <div style={{ fontSize:12, color:hovered===r.id?r.color:'var(--text3)', marginBottom:12, fontWeight:600, opacity:.8 }}>{r.tagline}</div>
              <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.65, marginBottom:18 }}>{r.desc}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:22 }}>
                {r.bullets.map(b => (
                  <div key={b} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:4, height:4, borderRadius:'50%', background:hovered===r.id?r.color:'var(--text3)', flexShrink:0, transition:'background .2s' }} />
                    <span style={{ fontSize:12, color:'var(--text2)' }}>{b}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:'auto', display:'flex', alignItems:'center', gap:7, fontWeight:700, fontSize:12, color:hovered===r.id?r.color:'var(--text3)', transition:'color .2s' }}>
                {r.id==='admin'?'🔒 ':''}Enter as {r.label}
                <span style={{ transition:'transform .2s', transform:hovered===r.id?'translateX(4px)':'none', display:'inline-block' }}>→</span>
              </div>
            </button>
          ))}
        </div>
        <p className="mono" style={{ marginTop:44, fontSize:11, color:'var(--text3)', textAlign:'center', animation:'fadeUp .5s .3s ease both' }}>
          Contract: 0x4d5Bbc4ecC2BF354DB09e00fe037f6D2dC84b718 · Sepolia
        </p>
      </main>

      {/* Admin auth modal */}
      {showAuth && (
        <div onClick={e => e.target===e.currentTarget&&setShowAuth(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, animation:'fadeIn .2s ease' }}>
          <div style={{ background:'var(--bg2)', border:'1px solid rgba(232,201,122,.3)', borderRadius:'var(--r3)', padding:'32px', width:380, animation:'fadeUp .25s ease' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'rgba(232,201,122,.1)', border:'1px solid rgba(232,201,122,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'var(--gold)' }}>⬡</div>
              <div>
                <div style={{ fontWeight:800, fontSize:16 }}>Admin Login</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>Enter your credentials to continue</div>
              </div>
              <button onClick={() => setShowAuth(false)} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:20, lineHeight:1 }}>✕</button>
            </div>
            <form onSubmit={handleLogin}>
              <label style={lbl}>Username</label>
              <input className="input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="admin" autoComplete="username" style={{ marginBottom:12, marginTop:6 }} />
              <label style={lbl}>Password</label>
              <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••" autoComplete="current-password" style={{ marginBottom: authError?10:18, marginTop:6 }} />
              {authError && <div style={{ fontSize:12, color:'var(--red)', marginBottom:14, padding:'8px 12px', background:'rgba(255,94,94,.08)', borderRadius:'var(--r)', border:'1px solid rgba(255,94,94,.2)' }}>✕ {authError}</div>}
              <button type="submit" className="btn" disabled={authLoading||!username||!password}
                style={{ width:'100%', justifyContent:'center', background:'var(--gold)', color:'#000', fontSize:14, padding:'13px' }}>
                {authLoading ? <><span className="spin" />Verifying…</> : 'Sign In'}
              </button>
            </form>
            <p style={{ fontSize:11, color:'var(--text3)', textAlign:'center', marginTop:14 }}>
              Default: <span className="mono">admin</span> / <span className="mono">GiveRotate2024!</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl = { fontSize:11, color:'var(--text3)', fontFamily:'var(--font-m)', textTransform:'uppercase', letterSpacing:'.08em', display:'block' }
