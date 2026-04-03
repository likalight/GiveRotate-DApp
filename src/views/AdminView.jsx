import { useState, useEffect } from 'react'
import Shell from '../components/Shell.jsx'
import { fmt6 } from '../lib/contracts.js'
import { ConnectGate, TabBar, StatCard, Loader, Empty } from './DonorView.jsx'
import { setPoolPerk, getPoolPerk, removePoolPerk, setPerk, getPerk, PERK_BADGE_OPTIONS } from '../lib/perksStore.js'
import { changeAdminCredentials, getAdminUsername } from '../lib/adminAuth.js'

export default function AdminView(props) {
  const { wallet, contracts, stats, toast, onRefresh, onConnect, connecting } = props
  const [tab, setTab]       = useState('pools')
  const [isAdmin, setIsAdmin] = useState(null)
  const [events, setEvents] = useState([])
  const [loadingE, setLE]   = useState(false)
  const [payingOut, setPO]  = useState(false)
  const [toggling, setTog]  = useState(false)
  const [removing, setRem]  = useState(null)

  // Add charity form
  const [selPool, setSelPool]     = useState(0)
  const [addName, setAddName]     = useState('')
  const [addAddr, setAddAddr]     = useState('')
  const [perkTitle, setPT]        = useState('')
  const [perkDesc, setPD]         = useState('')
  const [perkMin, setPM]          = useState('50')
  const [perkBadge, setPB]        = useState('🎁')
  const [adding, setAdding]       = useState(false)

  // Create pool form
  const [newPoolName, setNewPoolName] = useState('')
  const [creatingPool, setCreatingPool] = useState(false)

  // Perk editing
  const [editingPerk, setEditingPerk] = useState(null)

  // Settings
  const [currPwd, setCurrPwd] = useState('')
  const [newUser, setNewUser] = useState('')
  const [newPwd, setNewPwd]   = useState('')
  const [savingCreds, setSC]  = useState(false)

  const pools = stats?.pools || []

  useEffect(() => {
    if (wallet && contracts) checkAdmin()
  }, [wallet, contracts])

  useEffect(() => {
    if (tab === 'activity' && contracts && isAdmin) loadEvents()
    if (tab === 'settings') setNewUser(getAdminUsername())
  }, [tab, contracts, isAdmin])

  const checkAdmin = async () => {
    try {
      const adminRole = await contracts.rosca.ADMIN_ROLE()
      setIsAdmin(await contracts.rosca.hasRole(adminRole, wallet.address))
    } catch { setIsAdmin(false) }
  }

  const loadEvents = async () => {
    try {
      setLE(true)
      const [donations, payouts, adds, removes] = await Promise.all([
        contracts.rosca.queryFilter(contracts.rosca.filters.DonationReceived(), -50000),
        contracts.rosca.queryFilter(contracts.rosca.filters.PayoutExecuted(), -50000),
        contracts.rosca.queryFilter(contracts.rosca.filters.CharityAdded(), -50000),
        contracts.rosca.queryFilter(contracts.rosca.filters.CharityRemoved(), -50000),
      ])
      const all = [
        ...donations.map(e => ({ type:'donation', donor:e.args.donor, poolId:e.args.poolId?.toString(), amount:e.args.amount, tokenId:e.args.tokenId?.toString(), block:e.blockNumber })),
        ...payouts.map(e =>  ({ type:'payout',   poolId:e.args.poolId?.toString(), totalAmount:e.args.totalAmount, perCharity:e.args.perCharityAmount, count:e.args.charityCount?.toString(), block:e.blockNumber })),
        ...adds.map(e =>     ({ type:'add',    wallet:e.args.wallet, name:e.args.name, poolId:e.args.poolId?.toString(), block:e.blockNumber })),
        ...removes.map(e =>  ({ type:'remove', wallet:e.args.wallet, block:e.blockNumber })),
      ].sort((a,b) => b.block - a.block)
      setEvents(all)
    } catch { toast('Failed to load activity', 'error') }
    finally { setLE(false) }
  }

  const handleCreatePool = async () => {
    if (!newPoolName.trim()) { toast('Enter a pool name', 'error'); return }
    try {
      setCreatingPool(true)
      const tx = await contracts.rosca.createPool(newPoolName.trim())
      toast('Creating pool…', 'info')
      await tx.wait()
      toast(`✅ Pool "${newPoolName}" created`, 'success')
      setNewPoolName(''); onRefresh()
    } catch(e) { toast(e.reason || e.message?.slice(0,80) || 'Failed', 'error') }
    finally { setCreatingPool(false) }
  }

  const handleAddCharity = async () => {
    if (!addName.trim() || !addAddr.trim()) { toast('Fill in name and wallet', 'error'); return }
    try {
      setAdding(true)
      const tx = await contracts.rosca.addCharityToPool(selPool, addAddr.trim(), addName.trim())
      toast('Adding charity…', 'info')
      await tx.wait()
      if (perkTitle.trim()) {
        setPerk(addAddr.trim(), { title:perkTitle, desc:perkDesc, minThreshold:Number(perkMin)||50, badge:perkBadge, charityName:addName })
        toast(`✅ ${addName} added with perk: ${perkTitle}`, 'success')
      } else {
        toast(`✅ ${addName} added to ${pools.find(p=>p.id===selPool)?.name}`, 'success')
      }
      setAddName(''); setAddAddr(''); setPT(''); setPD(''); setPM('50'); setPB('🎁')
      onRefresh()
    } catch(e) { toast(e.reason || e.message?.slice(0,80) || 'Failed', 'error') }
    finally { setAdding(false) }
  }

  const handlePayout = async () => {
    try {
      setPO(true)
      const tx = await contracts.rosca.payout()
      toast('Payout sent…', 'info')
      await tx.wait()
      toast('✅ Payout complete!', 'success')
      onRefresh(); if (tab==='activity') loadEvents()
    } catch(e) { toast(e.reason || e.message?.slice(0,80) || 'Payout failed', 'error') }
    finally { setPO(false) }
  }

  const handleTogglePause = async () => {
    try {
      setTog(true)
      const tx = stats?.isPaused ? await contracts.rosca.unpause() : await contracts.rosca.pause()
      await tx.wait()
      toast(stats?.isPaused?'✅ Unpaused':'⚠ Paused','success')
      onRefresh()
    } catch(e) { toast(e.reason || e.message?.slice(0,80) || 'Failed','error') }
    finally { setTog(false) }
  }

  const handleRemove = async (id) => {
    try { setRem(id); await (await contracts.rosca.removeCharity(id)).wait(); toast('Removed','success'); onRefresh() }
    catch(e) { toast(e.reason||e.message?.slice(0,80)||'Failed','error') }
    finally { setRem(null) }
  }

  const handleSaveCreds = async (e) => {
    e.preventDefault(); setSC(true)
    try { await changeAdminCredentials(currPwd,newUser,newPwd); toast('✅ Credentials updated','success'); setCurrPwd(''); setNewPwd('') }
    catch(err) { toast(err.message,'error') }
    finally { setSC(false) }
  }

  const totalPool = pools.reduce((s,p) => s + Number(p.balance), 0)
  const nextPool  = stats?.nextPayout

  return (
    <Shell role="admin" {...props}>
      {!wallet && <ConnectGate color="var(--gold)" icon="⬡" title="Connect Admin Wallet" desc="Connect the deployer wallet holding ADMIN_ROLE." onConnect={onConnect} connecting={connecting} />}

      {wallet && isAdmin === null && (
        <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
          <span className="spin spin-g" style={{ width:32,height:32 }} />
          <div style={{ color:'var(--text2)', fontSize:14 }}>Checking admin role…</div>
        </div>
      )}

      {wallet && isAdmin === false && (
        <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ textAlign:'center', maxWidth:420 }}>
            <div style={{ width:60,height:60,borderRadius:16,background:'rgba(255,94,94,.1)',border:'1px solid rgba(255,94,94,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,color:'var(--red)',margin:'0 auto 18px' }}>✕</div>
            <h2 style={{ fontWeight:800,fontSize:22,marginBottom:8 }}>Not authorised</h2>
            <p style={{ color:'var(--text2)',fontSize:14 }}>This wallet does not hold ADMIN_ROLE. Connect the deployer wallet.</p>
          </div>
        </div>
      )}

      {wallet && isAdmin === true && <>
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          <StatCard label="Total Pool Balance" value={fmt6(BigInt(Math.round(totalPool)))} unit="XSGD" color="var(--gold)" icon="◈" />
          <StatCard label="Active Pools"   value={pools.filter(p=>p.active).length} icon="◎" />
          <StatCard label="Current Cycle"  value={`#${stats?.cycle??'—'}`} icon="↻" />
          <StatCard label="Contract"       value={stats?.isPaused?'Paused':'Live'} color={stats?.isPaused?'var(--red)':'var(--green)'} icon="●" />
        </div>

        {/* Action bar */}
        <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
          <button className="btn" onClick={handlePayout} disabled={payingOut||totalPool===0}
            style={{ background:'var(--gold)', color:'#000', fontWeight:700 }}>
            {payingOut?<><span className="spin" />Processing…</>:nextPool?`▶ Payout → ${nextPool.name} (${fmt6(nextPool.balance)} XSGD)`:'▶ Trigger Payout'}
          </button>
          <button className={`btn ${stats?.isPaused?'btn-outline':'btn-danger'}`} onClick={handleTogglePause} disabled={toggling}>
            {toggling?<><span className="spin spin-g" />…</>:stats?.isPaused?'▶ Unpause':'⏸ Pause'}
          </button>
        </div>

        <TabBar color="var(--gold)"
          tabs={[{id:'pools',label:'Pools & Charities'},{id:'add',label:'Add Charity'},{id:'perks',label:'Perks'},{id:'activity',label:'Activity'},{id:'settings',label:'Settings'}]}
          active={tab} onChange={setTab} />

        {/* Pools & Charities */}
        {tab === 'pools' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {pools.length === 0
              ? <Empty icon="◎" title="No pools yet" sub='Go to "Add Charity" to set up pools first.' />
              : pools.map(pool => (
                <div key={pool.id} className="card">
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                    <div style={{ fontWeight:800, fontSize:16 }}>{pool.name}</div>
                    <span className="tag tag-dim">Pool #{pool.id}</span>
                    <span className="mono" style={{ marginLeft:'auto', color:'var(--gold)', fontWeight:700, fontSize:15 }}>{fmt6(pool.balance)} XSGD</span>
                  </div>
                  {(pool.charities || []).length === 0
                    ? <div style={{ fontSize:13, color:'var(--text3)', padding:'10px 0' }}>No charities in this pool yet.</div>
                    : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {(pool.charities || []).map((c,i) => {
                          const perk = getPerk(c.wallet)
                          return (
                            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--bg3)', borderRadius:'var(--r)', opacity:c.active?1:.55 }}>
                              <div style={{ flex:1 }}>
                                <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:2 }}>
                                  <span style={{ fontWeight:600, fontSize:13 }}>{c.name}</span>
                                  {!c.active && <span className="tag tag-dim">Inactive</span>}
                                  {perk && <span className="tag tag-gold">{perk.badge} {perk.title}</span>}
                                </div>
                                <span className="mono" style={{ fontSize:11, color:'var(--text3)' }}>{c.wallet.slice(0,18)}…</span>
                              </div>
                              <div style={{ textAlign:'right', marginRight:8 }}>
                                <div className="mono" style={{ fontWeight:600, fontSize:13 }}>{fmt6(c.totalReceived)}</div>
                                <div style={{ fontSize:10, color:'var(--text3)' }}>XSGD received</div>
                              </div>
                              <button className="btn btn-danger" onClick={()=>handleRemove(c.id)} disabled={removing===c.id} style={{ fontSize:11, padding:'5px 12px' }}>
                                {removing===c.id?<span className="spin spin-g" />:'Remove'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                  }
                </div>
              ))
            }

            {/* Create new pool */}
            <div className="card" style={{ borderColor:'rgba(232,201,122,.2)', background:'rgba(232,201,122,.03)' }}>
              <div style={{ ...sLbl, marginBottom:12 }}>Create New Pool</div>
              <div style={{ display:'flex', gap:10 }}>
                <input className="input" placeholder="e.g. Education" value={newPoolName} onChange={e=>setNewPoolName(e.target.value)} disabled={creatingPool} style={{ flex:1 }} />
                <button className="btn" onClick={handleCreatePool} disabled={creatingPool||!newPoolName}
                  style={{ background:'var(--gold)', color:'#000', fontWeight:700, flexShrink:0 }}>
                  {creatingPool?<><span className="spin" />Creating…</>:'+ Create Pool'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Charity */}
        {tab === 'add' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>
            <div className="card">
              <div style={{ ...sLbl, marginBottom:14 }}>Charity Details</div>
              <label style={sLbl}>Pool</label>
              <select className="input" value={selPool} onChange={e=>setSelPool(Number(e.target.value))} disabled={adding} style={{ marginTop:6, marginBottom:13 }}>
                {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <label style={sLbl}>Charity Name</label>
              <input className="input" placeholder="e.g. SPCA Singapore" value={addName} onChange={e=>setAddName(e.target.value)} disabled={adding} style={{ marginTop:6, marginBottom:13 }} />
              <label style={sLbl}>Wallet Address</label>
              <input className="input" placeholder="0x…" value={addAddr} onChange={e=>setAddAddr(e.target.value)} disabled={adding} style={{ marginTop:6, marginBottom:20 }} />
              <button className="btn" onClick={handleAddCharity} disabled={adding||!addName||!addAddr||pools.length===0}
                style={{ width:'100%', justifyContent:'center', background:'var(--gold)', color:'#000', fontWeight:700 }}>
                {adding?<><span className="spin" />Adding…</>:'Add Charity'}
              </button>
            </div>

            <div className="card" style={{ borderColor:'rgba(232,201,122,.2)', background:'rgba(232,201,122,.03)' }}>
              <div style={{ ...sLbl, marginBottom:14 }}>NFT Perk (Optional)</div>
              <label style={sLbl}>Perk Title</label>
              <input className="input" placeholder="e.g. Free Shelter Visit" value={perkTitle} onChange={e=>setPT(e.target.value)} disabled={adding} style={{ marginTop:6, marginBottom:12 }} />
              <label style={sLbl}>Description</label>
              <input className="input" placeholder="e.g. Bring this NFT for free entry" value={perkDesc} onChange={e=>setPD(e.target.value)} disabled={adding} style={{ marginTop:6, marginBottom:12 }} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                <div>
                  <label style={sLbl}>Min XSGD</label>
                  <input className="input" type="number" min="1" value={perkMin} onChange={e=>setPM(e.target.value)} disabled={adding} style={{ marginTop:6 }} />
                </div>
                <div>
                  <label style={sLbl}>Badge</label>
                  <select className="input" value={perkBadge} onChange={e=>setPB(e.target.value)} disabled={adding} style={{ marginTop:6 }}>
                    {PERK_BADGE_OPTIONS.map(o=><option key={o.emoji} value={o.emoji}>{o.emoji} {o.label}</option>)}
                  </select>
                </div>
              </div>
              {perkTitle && (
                <div style={{ padding:'11px', background:'rgba(232,201,122,.08)', border:'1px solid rgba(232,201,122,.2)', borderRadius:'var(--r)', display:'flex', gap:10, alignItems:'center' }}>
                  <span style={{ fontSize:22 }}>{perkBadge}</span>
                  <div>
                    <div style={{ fontWeight:700, color:'var(--gold)', fontSize:13 }}>{perkTitle}</div>
                    <div style={{ fontSize:11, color:'var(--text2)' }}>{perkDesc||'—'} · Min {perkMin} XSGD</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Perks — pool level */}
        {tab === 'perks' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ fontSize:13, color:'var(--text2)', padding:'10px 14px', background:'var(--bg3)', borderRadius:'var(--r)' }}>
              Perks are set per pool. Donors who meet the threshold when donating to a pool unlock the perk, which applies to any charity in that pool.
            </div>
            {pools.length === 0
              ? <Empty icon="🎁" title="No pools yet" sub="Create pools first." />
              : pools.map(pool => {
                  const perk    = getPoolPerk(pool.id)
                  const editing = editingPerk?.poolId === pool.id
                  return (
                    <div key={pool.id} className="card">
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: editing || perk ? 16 : 0 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:800, fontSize:15 }}>{pool.name}</div>
                          <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                            {(pool.charities || []).filter(c=>c.active).map(c=>c.name).join(' · ') || 'No charities yet'}
                          </div>
                        </div>
                        {perk
                          ? <span className="tag tag-gold">{perk.badge} {perk.title} · ≥{perk.minThreshold} XSGD</span>
                          : <span className="tag tag-dim">No perk</span>
                        }
                        <button className="btn btn-ghost" style={{ fontSize:12, padding:'6px 13px' }}
                          onClick={() => setEditingPerk(editing ? null : { poolId: pool.id, ...(perk || { title:'', desc:'', minThreshold:50, badge:'🎁' }) })}>
                          {editing ? 'Cancel' : perk ? 'Edit' : '+ Set Perk'}
                        </button>
                        {perk && !editing && (
                          <button className="btn btn-danger" style={{ fontSize:12, padding:'6px 11px' }}
                            onClick={() => { removePoolPerk(pool.id); toast('Perk removed', 'info') }}>✕</button>
                        )}
                      </div>
                      {editing && (
                        <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                          <div>
                            <label style={sLbl}>Perk Title</label>
                            <input className="input" placeholder="e.g. 10% off at partner facilities" value={editingPerk.title} onChange={e=>setEditingPerk(p=>({...p,title:e.target.value}))} style={{ marginTop:6, marginBottom:12 }} />
                            <label style={sLbl}>Description</label>
                            <input className="input" placeholder="e.g. Valid at any charity in this pool" value={editingPerk.desc} onChange={e=>setEditingPerk(p=>({...p,desc:e.target.value}))} style={{ marginTop:6 }} />
                          </div>
                          <div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                              <div>
                                <label style={sLbl}>Min XSGD</label>
                                <input className="input" type="number" min="1" value={editingPerk.minThreshold} onChange={e=>setEditingPerk(p=>({...p,minThreshold:Number(e.target.value)}))} style={{ marginTop:6 }} />
                              </div>
                              <div>
                                <label style={sLbl}>Badge</label>
                                <select className="input" value={editingPerk.badge} onChange={e=>setEditingPerk(p=>({...p,badge:e.target.value}))} style={{ marginTop:6 }}>
                                  {PERK_BADGE_OPTIONS.map(o => <option key={o.emoji} value={o.emoji}>{o.emoji} {o.label}</option>)}
                                </select>
                              </div>
                            </div>
                            {editingPerk.title && (
                              <div style={{ padding:'10px', background:'rgba(232,201,122,.08)', border:'1px solid rgba(232,201,122,.2)', borderRadius:'var(--r)', display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
                                <span style={{ fontSize:20 }}>{editingPerk.badge}</span>
                                <div>
                                  <div style={{ fontWeight:700, color:'var(--gold)', fontSize:12 }}>{editingPerk.title}</div>
                                  <div style={{ fontSize:11, color:'var(--text2)' }}>{editingPerk.desc || '—'} · Min {editingPerk.minThreshold} XSGD</div>
                                </div>
                              </div>
                            )}
                            <button className="btn" onClick={() => { setPoolPerk(pool.id, editingPerk); toast('✅ Perk saved', 'success'); setEditingPerk(null) }} disabled={!editingPerk.title}
                              style={{ width:'100%', justifyContent:'center', background:'var(--gold)', color:'#000', fontWeight:700, fontSize:12 }}>
                              Save Pool Perk
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
            }
          </div>
        )}

        {/* Activity */}
        {tab === 'activity' && (
          loadingE ? <Loader /> :
          events.length === 0 ? <Empty icon="◈" title="No events yet" sub="On-chain activity appears here." /> :
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {events.map((e,i) => <EventRow key={i} event={e} pools={pools} />)}
          </div>
        )}

        {/* Settings */}
        {tab === 'settings' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>
            <div className="card">
              <div style={{ ...sLbl, marginBottom:14 }}>Change Admin Credentials</div>
              <form onSubmit={handleSaveCreds}>
                <label style={sLbl}>Current Password</label>
                <input className="input" type="password" value={currPwd} onChange={e=>setCurrPwd(e.target.value)} placeholder="••••••••" style={{ marginTop:6, marginBottom:12 }} />
                <label style={sLbl}>New Username</label>
                <input className="input" value={newUser} onChange={e=>setNewUser(e.target.value)} style={{ marginTop:6, marginBottom:12 }} />
                <label style={sLbl}>New Password</label>
                <input className="input" type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Min 8 characters" style={{ marginTop:6, marginBottom:18 }} />
                <button type="submit" className="btn" disabled={savingCreds||!currPwd||!newUser||!newPwd}
                  style={{ width:'100%', justifyContent:'center', background:'var(--gold)', color:'#000', fontWeight:700 }}>
                  {savingCreds?<><span className="spin" />Saving…</>:'Update Credentials'}
                </button>
              </form>
            </div>
            <div className="card">
              <div style={{ ...sLbl, marginBottom:14 }}>Contract Info</div>
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {[
                  {label:'ROSCACharityV2', value: contracts?.rosca?.target || '—', link:true},
                  {label:'Network', value:'Ethereum Sepolia (11155111)'},
                  {label:'Admin wallet', value:wallet?.address?.slice(0,14)+'…'},
                ].map(r=>(
                  <div key={r.label} style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                    <span style={{ fontSize:12, color:'var(--text3)', flexShrink:0 }}>{r.label}</span>
                    {r.link
                      ? <a href={`https://sepolia.etherscan.io/address/${r.value}`} target="_blank" rel="noopener" className="mono" style={{ fontSize:11, color:'var(--green)', textDecoration:'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.value} ↗</a>
                      : <span className="mono" style={{ fontSize:11, color:'var(--text2)' }}>{r.value}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </>}
    </Shell>
  )
}

function EventRow({ event: e, pools }) {
  const cfg = {
    donation: { icon:'◈', label:'Donation',        color:'var(--green)', bg:'rgba(0,214,127,.07)' },
    payout:   { icon:'→', label:'Payout',          color:'var(--gold)',  bg:'rgba(232,201,122,.07)' },
    add:      { icon:'+', label:'Charity Added',   color:'var(--blue)',  bg:'rgba(91,156,246,.07)' },
    remove:   { icon:'−', label:'Charity Removed', color:'var(--red)',   bg:'rgba(255,94,94,.07)' },
  }[e.type] || { icon:'●', label:e.type, color:'var(--text2)', bg:'var(--bg3)' }
  const poolName = pools.find(p=>p.id===Number(e.poolId))?.name || (e.poolId!=null?`Pool #${e.poolId}`:'')
  return (
    <div className="card" style={{ display:'flex', alignItems:'center', gap:13, padding:'12px 16px' }}>
      <div style={{ width:32, height:32, borderRadius:7, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:cfg.color, flexShrink:0 }}>{cfg.icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:2 }}>
          <span className="tag" style={{ background:cfg.bg, color:cfg.color }}>{cfg.label}</span>
          {poolName && <span style={{ fontSize:11, color:'var(--text3)' }}>{poolName}</span>}
          {e.tokenId && <span style={{ fontSize:11, color:'var(--text3)' }}>NFT #{e.tokenId}</span>}
          {e.count   && <span style={{ fontSize:11, color:'var(--text3)' }}>{e.count} charities</span>}
        </div>
        <span className="mono" style={{ fontSize:11, color:'var(--text3)' }}>
          {e.donor||e.wallet||e.name||'—'} · Block #{e.block}
        </span>
      </div>
      {(e.amount||e.totalAmount) && (
        <div style={{ textAlign:'right' }}>
          <div className="mono" style={{ fontWeight:600, fontSize:14, color:cfg.color }}>{fmt6(e.amount||e.totalAmount)}</div>
          {e.perCharity && <div style={{ fontSize:10, color:'var(--text3)' }}>{fmt6(e.perCharity)}/charity</div>}
        </div>
      )}
    </div>
  )
}

const sLbl = { fontSize:11, color:'var(--text3)', fontFamily:'var(--font-m)', textTransform:'uppercase', letterSpacing:'.08em', display:'block' }
