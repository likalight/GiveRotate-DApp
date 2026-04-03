import { useState, useEffect } from 'react'
import Shell from '../components/Shell.jsx'
import { fmt6 } from '../lib/contracts.js'
import { ConnectGate, TabBar, StatCard, Loader, Empty } from './DonorView.jsx'

export default function CharityView(props) {
  const { wallet, contracts, stats, toast, onConnect, connecting } = props
  const [tab, setTab]           = useState('overview')
  const [payouts, setPayouts]   = useState([])
  const [loadingP, setLoadingP] = useState(false)
  const [charityInfo, setCharityInfo] = useState(null)
  const [checked, setChecked]   = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (wallet && contracts && !checked) checkCharity()
  }, [wallet, contracts])

  useEffect(() => {
    if (stats?.charityInfo) setCharityInfo(stats.charityInfo)
  }, [stats?.charityInfo])

  const checkCharity = async () => {
    try {
      setChecking(true)
      const isReg = await contracts.rosca.isRegisteredWallet(wallet.address)
      if (isReg) {
        const charityId = await contracts.rosca.walletToCharityId(wallet.address)
        const ch = await contracts.rosca.charities(charityId)
        setCharityInfo({ id: charityId.toString(), wallet: ch.wallet, name: ch.name, active: ch.active, poolId: ch.poolId.toString(), totalReceived: ch.totalReceived })
      }
      setChecked(true)
    } catch(e) { console.error(e); setChecked(true) }
    finally { setChecking(false) }
  }

  useEffect(() => {
    if (tab === 'payouts' && contracts && charityInfo) loadPayouts()
  }, [tab, contracts, charityInfo])

  const loadPayouts = async () => {
    try {
      setLoadingP(true)
      const filter = contracts.rosca.filters.PayoutExecuted()
      const events = await contracts.rosca.queryFilter(filter, -50000)
      // For multi-pool equal split, filter by pool
      const mine = events
        .filter(e => e.args.poolId?.toString() === charityInfo?.poolId)
        .map(e => ({ poolId: e.args.poolId?.toString(), totalAmount: e.args.totalAmount, perCharity: e.args.perCharityAmount, cycleId: e.args.cycleId?.toString(), blockNumber: e.blockNumber }))
        .reverse()
      setPayouts(mine)
    } catch { toast('Failed to load payout history', 'error') }
    finally { setLoadingP(false) }
  }

  const notCharity = wallet && checked && !charityInfo
  const pool = stats?.pools?.find(p => p.id === Number(charityInfo?.poolId))
  const poolCharities = pool?.charities || []
  const isNextPool = stats?.nextPayout && stats.nextPayout.poolId?.toString() === charityInfo?.poolId

  return (
    <Shell role="charity" {...props}>
      {!wallet && (
        <ConnectGate color="var(--blue)" icon="◎" title="Connect Charity Wallet"
          desc="Connect the wallet registered to your charity to view your pool, rotation position, and payout history."
          onConnect={onConnect} connecting={connecting} />
      )}

      {wallet && checking && (
        <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
          <span className="spin spin-g" style={{ width:32,height:32 }} />
          <div style={{ color:'var(--text2)', fontSize:14 }}>Verifying charity wallet…</div>
        </div>
      )}

      {notCharity && (
        <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ textAlign:'center', maxWidth:440 }}>
            <div style={{ width:64,height:64,borderRadius:18,background:'rgba(255,94,94,.1)',border:'1px solid rgba(255,94,94,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:'var(--red)',margin:'0 auto 20px' }}>✕</div>
            <h2 style={{ fontWeight:800,fontSize:22,marginBottom:8 }}>Wallet not registered</h2>
            <p style={{ color:'var(--text2)',fontSize:14,marginBottom:16 }}>
              <span className="mono" style={{ fontSize:12 }}>{wallet.address.slice(0,10)}…</span> is not a registered charity wallet.
            </p>
            <button className="btn btn-ghost" onClick={checkCharity} style={{ fontSize:13 }}>Try Again</button>
          </div>
        </div>
      )}

      {wallet && charityInfo && <>
        {/* Identity banner */}
        <div style={{ padding:'16px 20px', background:'rgba(91,156,246,.06)', border:'1px solid rgba(91,156,246,.2)', borderRadius:'var(--r2)', marginBottom:22, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44,height:44,borderRadius:12,background:'rgba(91,156,246,.12)',border:'1px solid rgba(91,156,246,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'var(--blue)',flexShrink:0 }}>◎</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800,fontSize:18,letterSpacing:'-0.02em' }}>{charityInfo.name}</div>
            <span className="mono" style={{ fontSize:12, color:'var(--text3)' }}>{charityInfo.wallet}</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {pool && <span className="tag tag-dim">{pool.name}</span>}
            <span className="tag tag-blue">Verified Charity</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:22 }}>
          <StatCard label="Total Received" value={fmt6(charityInfo.totalReceived)} unit="XSGD" color="var(--blue)" icon="◎" />
          <StatCard label="Pool Balance"   value={fmt6(pool?.balance||0)} unit="XSGD" icon="◈" />
          <StatCard label="Status"         value={charityInfo.active?'Active':'Inactive'} color={charityInfo.active?'var(--green)':'var(--red)'} icon="●" />
        </div>

        <TabBar color="var(--blue)"
          tabs={[{id:'overview',label:'Overview'},{id:'payouts',label:'Payout History'},{id:'pool',label:'Pool Members'}]}
          active={tab} onChange={setTab} />

        {tab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div className="card">
              <div style={{ ...sLbl, marginBottom:14 }}>Pool Status</div>
              {isNextPool
                ? <div style={{ padding:'13px', background:'rgba(0,214,127,.07)', border:'1px solid rgba(0,214,127,.2)', borderRadius:'var(--r)', display:'flex', gap:10, alignItems:'center', marginBottom:14 }}>
                    <span style={{ width:8,height:8,borderRadius:'50%',background:'var(--green)',animation:'pulse 2s infinite' }} />
                    <span style={{ fontWeight:700, color:'var(--green)' }}>Your pool is next for payout!</span>
                  </div>
                : <div style={{ padding:'13px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', fontSize:13, color:'var(--text2)', marginBottom:14 }}>
                    {stats?.nextPayout ? `Next payout goes to: ${stats.nextPayout.name}` : 'No pool has funds yet'}
                  </div>
              }
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <R label="Pool" value={pool?.name || '—'} />
                <R label="Charity ID" value={`#${charityInfo.id}`} />
                <R label="Current cycle" value={`#${stats?.cycle??'—'}`} />
                <R label="Charities in pool" value={poolCharities.filter(c=>c.active).length} />
                <R label="Pool balance" value={`${fmt6(pool?.balance||0)} XSGD`} />
                {pool && pool.balance > 0 && poolCharities.filter(c=>c.active).length > 0 && (
                  <R label="Your share (if paid now)" value={`${(Number(pool.balance) / poolCharities.filter(c=>c.active).length / 1e6).toFixed(2)} XSGD`} />
                )}
              </div>
            </div>

            <div className="card">
              <div style={{ ...sLbl, marginBottom:14 }}>Cumulative Impact</div>
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <div className="mono" style={{ fontWeight:700, fontSize:40, color:'var(--blue)', lineHeight:1 }}>{fmt6(charityInfo.totalReceived)}</div>
                <div style={{ fontSize:13, color:'var(--text3)', marginTop:6 }}>XSGD received total</div>
              </div>
              <div className="hr" />
              <a href={`https://sepolia.etherscan.io/address/${charityInfo.wallet}`} target="_blank" rel="noopener"
                className="btn btn-outline" style={{ width:'100%', justifyContent:'center', fontSize:12 }}>
                View wallet on Etherscan ↗
              </a>
            </div>
          </div>
        )}

        {tab === 'payouts' && (
          loadingP ? <Loader /> :
          payouts.length === 0
            ? <Empty icon="↻" title="No payouts yet" sub="Your pool's payout history will appear here." />
            : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {payouts.map((p,i) => (
                  <div key={i} className="card" style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:36,height:36,borderRadius:8,background:'rgba(91,156,246,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'var(--blue)',flexShrink:0 }}>↓</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700 }}>Cycle #{p.cycleId} Payout</div>
                      <div className="mono" style={{ fontSize:12, color:'var(--text3)' }}>Block #{p.blockNumber} · Total: {fmt6(p.totalAmount)} XSGD split equally</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div className="mono" style={{ fontWeight:700, fontSize:18, color:'var(--blue)' }}>{fmt6(p.perCharity)}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>XSGD your share</div>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {tab === 'pool' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:8 }}>
              Charities in the <strong>{pool?.name}</strong> pool receive equal shares of each payout.
            </div>
            {poolCharities.map(c => {
              const isMe = c.wallet.toLowerCase() === wallet.address.toLowerCase()
              return (
                <div key={c.id} className="card" style={{ display:'flex', alignItems:'center', gap:14, borderColor:isMe?'rgba(91,156,246,.4)':'var(--border)', background:isMe?'rgba(91,156,246,.04)':'var(--bg2)', opacity:c.active?1:.55 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ fontWeight:700, fontSize:14 }}>{c.name}</span>
                      {isMe && <span className="tag tag-blue">You</span>}
                      {!c.active && <span className="tag tag-dim">Inactive</span>}
                    </div>
                    <span className="mono" style={{ fontSize:11, color:'var(--text3)' }}>{c.wallet.slice(0,14)}…</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div className="mono" style={{ fontWeight:600, fontSize:14 }}>{fmt6(c.totalReceived)}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>XSGD received</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </>}
    </Shell>
  )
}

function R({ label, value }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <span style={{ fontSize:12, color:'var(--text3)' }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:600 }}>{value}</span>
    </div>
  )
}

const sLbl = { fontSize:11, color:'var(--text3)', fontFamily:'var(--font-m)', textTransform:'uppercase', letterSpacing:'.08em' }
