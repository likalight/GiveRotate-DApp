import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import Shell from '../components/Shell.jsx'
import { fmt6, ADDRESSES } from '../lib/contracts.js'
import { generateTaxRecord, downloadTaxReceipt, mockMyInfoConnect } from '../lib/taxOracle.js'
import { getPoolPerk, checkPerkEligibility } from '../lib/perksStore.js'

const PRESETS = [5, 10, 25, 50, 100]

export default function DonorView(props) {
  const { wallet, contracts, stats, toast, onRefresh, onConnect, connecting } = props
  const [tab, setTab]             = useState('donate')
  const [amount, setAmount]       = useState('')
  const [step, setStep]           = useState(0)
  const [txHash, setTxHash]       = useState(null)
  const [lastNFT, setLastNFT]     = useState(null)
  const [lastEvent, setLastEvent] = useState(null)
  const [donations, setDonations] = useState([])
  const [loadingDons, setLD]      = useState(false)
  const [myInfoData, setMyInfo]   = useState(null)
  const [spLoading, setSPL]       = useState(false)
  const [spConnected, setSPC]     = useState(false)

  const pools = stats?.pools || []
  const activePool = stats?.nextPayout ? pools.find(p => p.id === Number(stats.nextPayout.poolId)) : pools[0]
  const activePerk = activePool ? getPoolPerk(activePool.id) : null

  useEffect(() => {
    if (tab === 'donations' && contracts && wallet) loadDonations()
  }, [tab, contracts, wallet, stats?.totalDons])

  const loadDonations = async () => {
    if (!contracts || !wallet) return
    try {
      setLD(true)
      const total = stats?.totalDons || 0
      const owned = []
      for (let i = 0; i < total; i++) {
        try {
          const r = await contracts.rosca.donationReceipts(i)
          if (r.donor.toLowerCase() === wallet.address.toLowerCase()) {
            owned.push({ tokenId: i, donor: r.donor, poolId: Number(r.poolId), amount: r.amount, timestamp: r.timestamp, cycleId: r.cycleId })
          }
        } catch {}
      }
      setDonations(owned.reverse())
    } catch { toast('Failed to load donations', 'error') }
    finally { setLD(false) }
  }

  const handleDonate = async () => {
    if (!wallet) { toast('Connect wallet first', 'error'); return }
    if (!amount || Number(amount) < 1) { toast('Minimum 1 XSGD', 'error'); return }
    if (!activePool) { toast('No active pool', 'error'); return }
    const raw = ethers.parseUnits(amount, 6)
    try {
      setStep(1)
      const roscaAddr = await contracts.rosca.getAddress()
      const allowance = await contracts.xsgd.allowance(wallet.address, roscaAddr)
      if (allowance < raw) { toast('Approving XSGD…', 'info'); await (await contracts.xsgd.approve(roscaAddr, raw)).wait() }
      setStep(2)
      toast('Submitting donation…', 'info')
      const tx  = await contracts.rosca.donate(activePool.id, raw)
      setTxHash(tx.hash)
      const rec = await tx.wait()
      let tokenId = null, cycleId = null
      for (const log of rec.logs) {
        try { const p = contracts.rosca.interface.parseLog(log); if (p?.name === 'DonationReceived') { tokenId = p.args.tokenId.toString(); cycleId = p.args.cycleId.toString(); break } } catch {}
      }
      setLastNFT(tokenId)
      setLastEvent({ donor: wallet.address, poolId: activePool.id, amount: raw, tokenId, cycleId, timestamp: Math.floor(Date.now()/1000), txHash: tx.hash })
      setStep(3)
      const perkUnlocked = activePerk && checkPerkEligibility(raw, activePerk)
      toast(`🎉 Donated ${amount} XSGD to ${activePool.name}! NFT #${tokenId} minted.${perkUnlocked ? ' 🎁 Perk unlocked!' : ''}`, 'success')
      onRefresh()
    } catch(e) { setStep(0); toast(e.reason || e.message?.slice(0,80) || 'Failed', 'error') }
  }

  const handleSingpass = async () => {
    setSPL(true); toast('Connecting SingPass MyInfo (simulation)…', 'info')
    try { const d = await mockMyInfoConnect(wallet?.address); setMyInfo(d); setSPC(true); toast(`✅ SingPass — ${d.name?.value}`, 'success') }
    catch { toast('SingPass failed', 'error') } finally { setSPL(false) }
  }

  const handleTaxPDF = (receipt) => {
    if (!spConnected) { toast('Connect SingPass first', 'info'); return }
    const pool = pools.find(p => p.id === receipt.poolId)
    const record = generateTaxRecord(
      { donor: receipt.donor, amount: receipt.amount, tokenId: receipt.tokenId, cycleId: receipt.cycleId?.toString(), timestamp: receipt.timestamp, txHash: '' },
      { name: pool?.name || 'GiveRotate Pool', wallet: '', id: String(receipt.poolId ?? 0) },
      myInfoData
    )
    downloadTaxReceipt(record)
    toast('📄 Tax receipt opened — Ctrl+P to save as PDF', 'info')
  }

  const reset = () => { setStep(0); setAmount(''); setLastNFT(null); setTxHash(null); setLastEvent(null) }
  const busy  = step === 1 || step === 2
  const rawAmount = amount && Number(amount) >= 1 ? ethers.parseUnits(String(Number(amount)), 6) : 0n
  const perkUnlocked = activePerk && rawAmount > 0n && checkPerkEligibility(rawAmount, activePerk)

  return (
    <Shell role="donor" {...props}>
      {!wallet ? (
        <ConnectGate color="var(--green)" icon="◈" title="Connect as Donor"
          desc="Connect your MetaMask wallet to donate XSGD, receive NFT receipts, and unlock charity perks."
          onConnect={onConnect} connecting={connecting} />
      ) : <>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
          <StatCard label="Your XSGD"    value={fmt6(stats?.xsgdBal)}   unit="XSGD" color="var(--green)" icon="◉" />
          <StatCard label="Pool Balance" value={fmt6(activePool?.balance || 0)} unit="XSGD" color="var(--green)" icon="◈" />
          <StatCard label="NFT Receipts" value={stats?.nftCount ?? '—'} unit="owned" icon="◆" />
          <StatCard label="Cycle"        value={"#" + (stats?.cycle ?? '—')} icon="↻" />
        </div>

        {/* Active pool + charities */}
        {activePool && (
          <div style={{ marginBottom:20 }}>
            <div style={{ padding:'14px 18px', background:'rgba(0,214,127,.05)', border:'1px solid rgba(0,214,127,.18)', borderRadius: activePerk ? 'var(--r) var(--r) 0 0' : 'var(--r)', display:'flex', alignItems:'center', gap:12, marginBottom:0 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', animation:'pulse 2s infinite', flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <span style={{ color:'var(--text2)', fontSize:12 }}>ROSCA — Active Pool: </span>
                <strong style={{ color:'var(--green)', fontSize:15 }}>{activePool.name}</strong>
              </div>
              <span className="tag tag-green">Cycle #{stats?.cycle}</span>
            </div>

            {/* Charity cards in this pool */}
            {activePool.charities?.filter(c => c.active).length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(activePool.charities.filter(c=>c.active).length, 2)},1fr)`, gap:0, border:'1px solid rgba(0,214,127,.18)', borderTop:'none', borderRadius:'0 0 var(--r) var(--r)', overflow:'hidden' }}>
                {(activePool.charities || []).filter(c => c.active).map((c, i, arr) => (
                  <div key={c.id} style={{ padding:'12px 16px', background:'rgba(0,214,127,.03)', borderRight: i < arr.length-1 ? '1px solid rgba(0,214,127,.1)' : 'none', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:'rgba(0,214,127,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>◎</div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{c.name}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>{fmt6(c.totalReceived)} XSGD received</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Perk banner */}
            {activePerk && (
              <div style={{ padding:'10px 18px', background:'rgba(232,201,122,.05)', border:'1px solid rgba(232,201,122,.2)', borderTop:'none', borderRadius:'0 0 var(--r) var(--r)', display:'flex', alignItems:'center', gap:10, fontSize:12 }}>
                <span style={{ fontSize:16 }}>{activePerk.badge || '🎁'}</span>
                <span style={{ color:'var(--gold)', fontWeight:600 }}>{activePerk.title}</span>
                <span style={{ color:'var(--text2)' }}>— {activePerk.desc}</span>
                <span className="tag tag-gold" style={{ marginLeft:'auto' }}>≥ {activePerk.minThreshold} XSGD</span>
              </div>
            )}
          </div>
        )}

        {/* SingPass strip */}
        <div style={{ padding:'11px 16px', background: spConnected ? 'rgba(0,214,127,.05)' : 'var(--bg2)', border:`1px solid ${spConnected ? 'rgba(0,214,127,.2)' : 'var(--border)'}`, borderRadius:'var(--r)', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:8, background: spConnected ? 'rgba(0,214,127,.1)' : 'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>🇸🇬</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:1 }}>SingPass MyInfo {spConnected ? `— ${myInfoData?.name?.value} (Mock)` : '— Tax Deduction Receipts'}</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{spConnected ? `NRIC: ${myInfoData?.uinfin?.value}` : 'Connect to generate IRAS-compatible tax PDFs'}</div>
          </div>
          {!spConnected
            ? <button className="btn btn-outline" onClick={handleSingpass} disabled={spLoading} style={{ fontSize:12, flexShrink:0 }}>{spLoading ? <><span className="spin spin-g" />Connecting…</> : 'Connect SingPass'}</button>
            : <span className="tag tag-green">✓ Connected</span>
          }
        </div>

        <TabBar tabs={[{id:'donate', label:'Donate'}, {id:'donations', label:`My Donations (${stats?.nftCount ?? 0})`}]} active={tab} onChange={setTab} color="var(--green)" />

        {tab === 'donate' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, alignItems:'start' }}>
            <div className="card">
              <h2 style={{ fontWeight:800, fontSize:20, letterSpacing:'-0.02em', marginBottom:4 }}>Make a donation</h2>
              <p style={{ color:'var(--text2)', fontSize:13, marginBottom:20 }}>
                Your XSGD goes to <strong style={{ color:'var(--green)' }}>{activePool?.name || 'the active pool'}</strong>. The pool balance is split equally among all charities in this pool at payout.
              </p>

              <label style={lbl}>Amount (XSGD)</label>
              <div style={{ position:'relative', marginTop:6, marginBottom:14 }}>
                <input className="input" type="number" min="1" placeholder="10.00" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} style={{ paddingRight:70, fontSize:22, fontWeight:700 }} />
                <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', fontFamily:'var(--font-m)', fontSize:12 }}>XSGD</span>
              </div>

              <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                {PRESETS.map(p => (
                  <button key={p} onClick={() => setAmount(String(p))} className="btn btn-ghost" disabled={busy}
                    style={{ padding:'5px 13px', fontSize:12, background: amount === String(p) ? 'var(--green-dim)' : undefined, borderColor: amount === String(p) ? 'rgba(0,214,127,.4)' : undefined, color: amount === String(p) ? 'var(--green)' : undefined }}>
                    {p} XSGD
                  </button>
                ))}
              </div>

              {activePerk && amount && Number(amount) > 0 && (
                <div style={{ padding:'9px 13px', borderRadius:'var(--r)', marginBottom:14, background: perkUnlocked ? 'rgba(232,201,122,.06)' : 'var(--bg3)', border:`1px solid ${perkUnlocked ? 'rgba(232,201,122,.25)' : 'var(--border)'}`, display:'flex', alignItems:'center', gap:10, fontSize:12, transition:'all .2s' }}>
                  <span style={{ fontSize:16 }}>{activePerk.badge || '🎁'}</span>
                  <span style={{ fontWeight:600, color: perkUnlocked ? 'var(--gold)' : 'var(--text3)' }}>{perkUnlocked ? '🎉 Perk unlocked!' : `Donate ≥ ${activePerk.minThreshold} XSGD to unlock:`}</span>
                  <span style={{ color:'var(--text2)', marginLeft:4 }}>{activePerk.title}</span>
                  {perkUnlocked && <span className="tag tag-gold" style={{ marginLeft:'auto' }}>Eligible</span>}
                </div>
              )}

              <div style={{ padding:'8px 12px', background:'var(--bg3)', borderRadius:8, marginBottom:14, display:'flex', justifyContent:'space-between', fontSize:12 }}>
                <span style={{ color:'var(--text3)' }}>Your balance</span>
                <span className="mono">{fmt6(stats?.xsgdBal)} XSGD</span>
              </div>

              {step > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                  {['Approve', 'Donate', 'Done'].map((s, i) => (
                    <div key={s} style={{ display:'flex', alignItems:'center', gap:6, flex: i < 2 ? 1 : 'none' }}>
                      <div className={`dot ${step > i+1 ? 'dot-done' : step === i+1 ? 'dot-on' : 'dot-off'}`}>{step > i+1 ? '✓' : i+1}</div>
                      <span style={{ fontSize:11, color: step >= i+1 ? 'var(--text)' : 'var(--text3)', fontWeight: step === i+1 ? 700 : 400 }}>{s}</span>
                      {i < 2 && <div style={{ flex:1, height:1, background: step > i+1 ? 'var(--green2)' : 'var(--border)' }} />}
                    </div>
                  ))}
                </div>
              )}

              {step < 3
                ? <button className="btn btn-primary" onClick={handleDonate} disabled={busy || !amount || Number(amount) < 1} style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:15 }}>
                    {busy ? <><span className="spin" />{step === 1 ? 'Approving…' : 'Donating…'}</> : `Donate ${amount || '—'} XSGD → ${activePool?.name || 'Pool'}`}
                  </button>
                : <div style={{ display:'flex', gap:10 }}>
                    <button className="btn btn-primary" onClick={reset} style={{ flex:1, justifyContent:'center' }}>Donate Again</button>
                    {txHash && <a href={"https://sepolia.etherscan.io/tx/" + txHash} target="_blank" rel="noopener" className="btn btn-outline" style={{ justifyContent:'center', padding:'11px 18px' }}>View Tx ↗</a>}
                  </div>
              }

              {step === 3 && lastNFT !== null && (
                <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:10, animation:'fadeUp .4s ease' }}>
                  <div style={{ padding:'13px', background:'rgba(0,214,127,.05)', border:'1px solid rgba(0,214,127,.2)', borderRadius:'var(--r)', display:'flex', gap:12, alignItems:'center' }}>
                    <div style={{ width:40, height:40, borderRadius:9, background:'linear-gradient(135deg,var(--green),#005c37)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>◆</div>
                    <div>
                      <div style={{ fontSize:11, color:'var(--green)', fontFamily:'var(--font-m)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:2 }}>NFT Receipt Minted</div>
                      <div style={{ fontWeight:700 }}>Donation Receipt #{lastNFT}</div>
                      <div style={{ fontSize:12, color:'var(--text2)' }}>{amount} XSGD → {activePool?.name} · Cycle #{stats?.cycle}</div>
                    </div>
                  </div>
                  {perkUnlocked && activePerk && (
                    <div style={{ padding:'13px', background:'rgba(232,201,122,.06)', border:'1px solid rgba(232,201,122,.25)', borderRadius:'var(--r)', display:'flex', gap:12, alignItems:'center' }}>
                      <span style={{ fontSize:28, flexShrink:0 }}>{activePerk.badge || '🎁'}</span>
                      <div>
                        <div style={{ fontSize:11, color:'var(--gold)', fontFamily:'var(--font-m)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:2 }}>Perk Unlocked — {activePool?.name}</div>
                        <div style={{ fontWeight:700, color:'var(--gold)' }}>{activePerk.title}</div>
                        <div style={{ fontSize:12, color:'var(--text2)' }}>{activePerk.desc}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right panel */}
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="card">
                <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--font-m)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:14 }}>How it works</div>
                {[
                  {n:'01', title:'ROSCA rotation', desc:'Protocol rotates between Pool 1 and Pool 2 each cycle.'},
                  {n:'02', title:'Approve & Donate', desc:'Approve XSGD, donate ≥ 1 XSGD to the active pool.'},
                  {n:'03', title:'Get NFT + Perk', desc:'ERC-721 receipt minted. Pool perk unlocked if threshold met.'},
                  {n:'04', title:'Equal payout', desc:'Pool balance split equally among all charities in the pool.'},
                ].map(s => (
                  <div key={s.n} style={{ display:'flex', gap:12, marginBottom:12 }}>
                    <span className="mono" style={{ fontSize:11, color:'var(--green)', fontWeight:600, marginTop:2, flexShrink:0 }}>{s.n}</span>
                    <div><div style={{ fontWeight:600, fontSize:13, marginBottom:2 }}>{s.title}</div><div style={{ fontSize:12, color:'var(--text2)' }}>{s.desc}</div></div>
                  </div>
                ))}
              </div>

              {/* All pools overview */}
              {pools.length > 0 && (
                <div className="card">
                  <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--font-m)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:14 }}>All Pools</div>
                  {pools.map(p => {
                    const isActive = p.id === activePool?.id
                    const perk = getPoolPerk(p.id)
                    return (
                      <div key={p.id} style={{ marginBottom:10, padding:'10px 12px', borderRadius:'var(--r)', background: isActive ? 'rgba(0,214,127,.05)' : 'var(--bg3)', border:`1px solid ${isActive ? 'rgba(0,214,127,.2)' : 'var(--border)'}` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: (p.charities || []).filter(c=>c.active).length > 0 ? 8 : 0 }}>
                          <span style={{ width:7, height:7, borderRadius:'50%', background: isActive ? 'var(--green)' : 'var(--bg2)', border: isActive ? 'none' : '1px solid var(--border)', flexShrink:0 }} />
                          <span style={{ fontSize:13, fontWeight: isActive ? 700 : 400, color: isActive ? 'var(--green)' : 'var(--text2)', flex:1 }}>{p.name}</span>
                          {isActive && <span className="tag tag-green" style={{ fontSize:10 }}>Active</span>}
                        </div>
                        {(p.charities || []).filter(c=>c.active).map(c => (
                          <div key={c.id} style={{ fontSize:11, color:'var(--text3)', marginLeft:15, marginBottom:2 }}>◎ {c.name}</div>
                        ))}
                        {perk && <div style={{ fontSize:11, color:'var(--gold)', marginLeft:15, marginTop:4 }}>{perk.badge} {perk.title} — ≥{perk.minThreshold} XSGD</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'donations' && (
          <div>
            {!spConnected && (
              <div style={{ padding:'11px 16px', background:'rgba(232,201,122,.05)', border:'1px solid rgba(232,201,122,.15)', borderRadius:'var(--r)', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                <span>🇸🇬</span>
                <span style={{ color:'var(--text2)', flex:1, fontSize:13 }}>Connect SingPass to enable tax PDF generation.</span>
                <button className="btn btn-ghost" onClick={handleSingpass} disabled={spLoading} style={{ fontSize:12, flexShrink:0 }}>{spLoading ? <><span className="spin spin-g" />…</> : 'Connect SingPass'}</button>
              </div>
            )}
            {loadingDons ? <Loader /> :
             donations.length === 0 ? <Empty icon="◆" title="No donations yet" sub="Donate to receive your first NFT receipt." /> :
             <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
               {donations.map(r => <DonationCard key={r.tokenId} receipt={r} pools={pools} spConnected={spConnected} onTaxPDF={() => handleTaxPDF(r)} />)}
             </div>
            }
          </div>
        )}
      </>}
    </Shell>
  )
}

function DonationCard({ receipt, pools, spConnected, onTaxPDF }) {
  const date   = new Date(Number(receipt.timestamp) * 1000)
  const amount = (Number(receipt.amount) / 1e6).toFixed(2)
  const colors = ['#00d67f', '#00a362', '#5b9cf6', '#e8c97a', '#00e889']
  const c      = colors[receipt.tokenId % colors.length]
  const pool   = pools.find(p => p.id === receipt.poolId)
  const perk   = pool ? getPoolPerk(pool.id) : null

  return (
    <div className="card card-hover" style={{ padding:0, overflow:'hidden' }}>
      <div style={{ height:130, padding:18, background:`linear-gradient(135deg,${c}18 0%,var(--bg) 100%)`, borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, opacity:.05, backgroundImage:'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize:'10px 10px' }} />
        <div style={{ display:'flex', justifyContent:'space-between', position:'relative' }}>
          <span className="tag" style={{ background:`${c}20`, color:c, border:`1px solid ${c}40` }}>{pool?.name || 'ERC-721'}</span>
          <span className="mono" style={{ fontSize:11, color:'var(--text3)' }}>#{receipt.tokenId}</span>
        </div>
        <div style={{ position:'relative' }}>
          <div className="mono" style={{ fontWeight:700, fontSize:26, color:c, lineHeight:1 }}>{amount}</div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>XSGD · Cycle #{receipt.cycleId?.toString()}</div>
        </div>
      </div>
      {perk && (
        <div style={{ padding:'6px 14px', background:'rgba(232,201,122,.06)', borderBottom:'1px solid rgba(232,201,122,.15)', display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ fontSize:12 }}>{perk.badge}</span>
          <span style={{ fontSize:11, color:'var(--gold)', fontWeight:600 }}>{perk.title}</span>
        </div>
      )}
      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:7 }}>
        <Row label="Date"  value={date.toLocaleDateString('en-SG', {day:'2-digit', month:'short', year:'numeric'})} />
        <Row label="Token" value={"ERC-721 #" + receipt.tokenId} />
        <div style={{ display:'flex', gap:8, marginTop:4 }}>
          <a href={"https://sepolia.etherscan.io/token/" + ADDRESSES.ROSCA_CHARITY + "?a=" + receipt.donor}
            target="_blank" rel="noopener" className="btn btn-ghost" style={{ flex:1, justifyContent:'center', fontSize:11, padding:'6px' }}>Etherscan ↗</a>
          <button onClick={onTaxPDF} className="btn btn-ghost"
            style={{ flex:1, justifyContent:'center', fontSize:11, padding:'6px', opacity: spConnected ? 1 : 0.4 }}>
            📄 {spConnected ? 'Tax PDF' : 'SingPass'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between' }}>
      <span style={{ fontSize:12, color:'var(--text3)' }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:600 }}>{value}</span>
    </div>
  )
}

export function ConnectGate({ color, icon, title, desc, onConnect, connecting }) {
  return (
    <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', maxWidth:420, animation:'fadeUp .45s ease' }}>
        <div style={{ width:60, height:60, borderRadius:16, background:`${color}15`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, color, margin:'0 auto 18px' }}>{icon}</div>
        <h2 style={{ fontWeight:800, fontSize:22, letterSpacing:'-0.02em', marginBottom:8 }}>{title}</h2>
        <p style={{ color:'var(--text2)', fontSize:14, lineHeight:1.65, marginBottom:26 }}>{desc}</p>
        <button className="btn btn-primary" onClick={onConnect} disabled={connecting} style={{ fontSize:15, padding:'13px 28px' }}>
          {connecting ? <><span className="spin" />Connecting…</> : 'Connect MetaMask'}
        </button>
      </div>
    </div>
  )
}

export function TabBar({ tabs, active, onChange, color }) {
  return (
    <div style={{ display:'flex', gap:3, padding:'3px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r)', width:'fit-content', marginBottom:20, flexWrap:'wrap' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ padding:'7px 15px', borderRadius:7, border:'none', cursor:'pointer', fontFamily:'var(--font-d)', fontWeight:600, fontSize:12, background: active === t.id ? (color || 'var(--green)') : 'transparent', color: active === t.id ? '#000' : 'var(--text2)', transition:'all .15s' }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function StatCard({ label, value, unit, color, icon }) {
  return (
    <div className="card" style={{ position:'relative', overflow:'hidden' }}>
      {color && <div style={{ position:'absolute', top:-14, right:-14, width:56, height:56, borderRadius:'50%', background:`${color}08` }} />}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:9 }}>
        <span style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--font-m)', textTransform:'uppercase', letterSpacing:'.08em' }}>{label}</span>
        <span style={{ fontSize:14, color: color || 'var(--text3)' }}>{icon}</span>
      </div>
      <div className="mono" style={{ fontWeight:500, fontSize:24, color: color || 'var(--text)', letterSpacing:'-0.02em', lineHeight:1 }}>
        {value}{unit && <span style={{ fontSize:11, color:'var(--text3)', marginLeft:5, fontWeight:400 }}>{unit}</span>}
      </div>
    </div>
  )
}

export function Loader() {
  return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><span className="spin spin-g" style={{ width:24, height:24 }} /></div>
}

export function Empty({ icon, title, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <div style={{ fontSize:38, marginBottom:12, color:'var(--text3)' }}>{icon}</div>
      <div style={{ fontWeight:700, fontSize:17, marginBottom:5 }}>{title}</div>
      <div style={{ color:'var(--text2)', fontSize:13 }}>{sub}</div>
    </div>
  )
}

const lbl = { fontSize:11, color:'var(--text3)', fontFamily:'var(--font-m)', textTransform:'uppercase', letterSpacing:'.08em', display:'block' }
