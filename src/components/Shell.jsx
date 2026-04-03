import { fmt6 } from '../lib/contracts.js'

export default function Shell({ role, wallet, stats, onBack, onConnect, connecting, children }) {
  const roleColor = { donor:'var(--green)', charity:'var(--blue)', admin:'var(--gold)' }[role]
  const roleLabel = { donor:'Donor', charity:'Charity', admin:'Admin' }[role]
  const short = wallet ? `${wallet.address.slice(0,6)}…${wallet.address.slice(-4)}` : null
  const totalPool = stats?.pools?.reduce((s,p) => s + Number(p.balance), 0) || 0

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <header style={{ position:'sticky', top:0, zIndex:100, background:'rgba(10,12,11,0.88)', backdropFilter:'blur(14px)', borderBottom:'1px solid var(--border)', padding:'0 28px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', alignItems:'center', height:60, gap:14 }}>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding:'6px 12px', fontSize:12 }}>← Back</button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:26,height:26,borderRadius:6,background:'var(--green)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,color:'#000' }}>G</div>
            <span style={{ fontWeight:800,fontSize:16,letterSpacing:'-0.02em' }}>Give<span style={{ color:'var(--green)' }}>Rotate</span></span>
          </div>
          <span className="tag" style={{ background:`${roleColor}15`, color:roleColor, border:`1px solid ${roleColor}30` }}>{roleLabel}</span>
          <div style={{ flex:1 }} />
          {stats && (
            <div style={{ display:'flex', gap:20 }}>
              {stats.pools?.slice(0,2).map(p => (
                <div key={p.id} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--font-m)', textTransform:'uppercase', letterSpacing:'.07em' }}>{p.name}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--green)', fontFamily:'var(--font-m)' }}>{fmt6(p.balance)} XSGD</div>
                </div>
              ))}
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--font-m)', textTransform:'uppercase', letterSpacing:'.07em' }}>Cycle</div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', fontFamily:'var(--font-m)' }}>#{stats.cycle}</div>
              </div>
              {stats.isPaused && <span className="tag tag-red">Paused</span>}
            </div>
          )}
          {!wallet
            ? <button className="btn btn-primary" onClick={onConnect} disabled={connecting} style={{ fontSize:13 }}>
                {connecting?<><span className="spin" />Connecting…</>:'Connect Wallet'}
              </button>
            : <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:7,height:7,borderRadius:'50%',background:'var(--green)',animation:'pulse 2s infinite' }} />
                <span className="mono" style={{ fontSize:12, color:'var(--text2)' }}>{short}</span>
              </div>
          }
        </div>
      </header>
      <main style={{ flex:1, maxWidth:1100, margin:'0 auto', width:'100%', padding:'32px 28px 80px' }}>
        {children}
      </main>
    </div>
  )
}
