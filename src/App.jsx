import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { ADDRESSES, ROSCA_ABI, ERC20_ABI, SEPOLIA_CHAIN_ID } from './lib/contracts.js'
import RoleSelect from './views/RoleSelect.jsx'
import DonorView from './views/DonorView.jsx'
import CharityView from './views/CharityView.jsx'
import AdminView from './views/AdminView.jsx'
import Toast from './components/Toast.jsx'

export default function App() {
  const [role, setRole]             = useState(null)
  const [wallet, setWallet]         = useState(null)
  const [contracts, setContracts]   = useState(null)
  const [stats, setStats]           = useState(null)
  const [toasts, setToasts]         = useState([])
  const [connecting, setConnecting] = useState(false)

  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000)
  }, [])

  const fullReset = useCallback(() => {
    setRole(null); setWallet(null); setContracts(null); setStats(null)
  }, [])

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) { toast('MetaMask not found.', 'error'); return }
    try {
      setConnecting(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      const network = await provider.getNetwork()
      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        try {
          await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] })
        } catch {
          toast('Please switch MetaMask to Sepolia testnet', 'error')
          setConnecting(false); return
        }
      }
      const signer  = await provider.getSigner()
      const address = await signer.getAddress()
      const rosca   = new ethers.Contract(ADDRESSES.ROSCA_CHARITY, ROSCA_ABI, signer)
      const xsgd    = new ethers.Contract(ADDRESSES.MOCK_XSGD, ERC20_ABI, signer)
      setWallet({ address, signer, provider })
      setContracts({ rosca, xsgd })
      toast(`Connected: ${address.slice(0,6)}…${address.slice(-4)}`, 'success')

      // Load stats immediately
      try {
        const [cycle, totalDons, isPaused] = await Promise.all([
          rosca.currentCycle(),
          rosca.totalDonations(),
          rosca.paused(),
        ])
        const pools = await loadPools(rosca)
        const xsgdBal  = await xsgd.balanceOf(address)
        const nftCount = Number(await rosca.balanceOf(address))
        const adminRole = await rosca.ADMIN_ROLE()
        const isAdmin   = await rosca.hasRole(adminRole, address)

        // Check charity
        let charityInfo = null
        const isCharity = await rosca.isRegisteredWallet(address)
        if (isCharity) {
          const charityId = await rosca.walletToCharityId(address)
          const ch = await rosca.charities(charityId)
          charityInfo = { id: charityId.toString(), wallet: ch.wallet, name: ch.name, active: ch.active, poolId: ch.poolId.toString(), totalReceived: ch.totalReceived }
        }

        let nextPayout = null
        try {
          const rotIdx = Number(await rosca.rotationIndex())
          const poolCount = Number(await rosca.poolCount())
          const activeIdx = rotIdx % poolCount
          const pd = await rosca.getPool(activeIdx)
          nextPayout = { poolId: String(activeIdx), name: pd[0], balance: pd[2] }
        } catch {}

        setStats({ cycle: Number(cycle), totalDons: Number(totalDons), isPaused, pools, xsgdBal, nftCount, isAdmin, charityInfo, nextPayout })
      } catch(e) { console.error('Stats load error:', e) }

      return { address, rosca, xsgd }
    } catch (e) {
      toast(e.message?.slice(0, 80) || 'Connection failed', 'error')
    } finally { setConnecting(false) }
  }, [toast])

  const refreshStats = useCallback(async () => {
    if (!contracts || !wallet) return
    try {
      const [cycle, totalDons, isPaused] = await Promise.all([
        contracts.rosca.currentCycle(),
        contracts.rosca.totalDonations(),
        contracts.rosca.paused(),
      ])
      const pools    = await loadPools(contracts.rosca)
      const xsgdBal  = await contracts.xsgd.balanceOf(wallet.address)
      const nftCount = Number(await contracts.rosca.balanceOf(wallet.address))
      const adminRole = await contracts.rosca.ADMIN_ROLE()
      const isAdmin   = await contracts.rosca.hasRole(adminRole, wallet.address)

      let charityInfo = null
      const isCharity = await contracts.rosca.isRegisteredWallet(wallet.address)
      if (isCharity) {
        const charityId = await contracts.rosca.walletToCharityId(wallet.address)
        const ch = await contracts.rosca.charities(charityId)
        charityInfo = { id: charityId.toString(), wallet: ch.wallet, name: ch.name, active: ch.active, poolId: ch.poolId.toString(), totalReceived: ch.totalReceived }
      }

      let nextPayout = null
      try {
        const rotIdx = Number(await contracts.rosca.rotationIndex())
        const poolCount = Number(await contracts.rosca.poolCount())
        const activeIdx = rotIdx % poolCount
        const pd = await contracts.rosca.getPool(activeIdx)
        nextPayout = { poolId: String(activeIdx), name: pd[0], balance: pd[2] }
      } catch {}

      setStats({ cycle: Number(cycle), totalDons: Number(totalDons), isPaused, pools, xsgdBal, nftCount, isAdmin, charityInfo, nextPayout })
    } catch(e) { console.error('Refresh error:', e) }
  }, [contracts, wallet])

  const props = { wallet, contracts, stats, toast, onRefresh: refreshStats, onConnect: connectWallet, connecting, onBack: fullReset }

  if (!role) return <>
    <RoleSelect onSelect={setRole} />
    <Toast toasts={toasts} />
  </>

  return <>
    {role === 'donor'   && <DonorView   {...props} />}
    {role === 'charity' && <CharityView {...props} />}
    {role === 'admin'   && <AdminView   {...props} />}
    <Toast toasts={toasts} />
  </>
}

async function loadPools(rosca) {
  try {
    const count = Number(await rosca.poolCount())
    const pools = []
    for (let i = 0; i < count; i++) {
      try {
        const poolData   = await rosca.getPool(i)
        const name       = poolData[0]
        const active     = poolData[1]
        const balance    = poolData[2]
        const charityIds = Array.from(poolData[3] || [])
        const charities  = []
        for (const id of charityIds) {
          try {
            const c = await rosca.charities(id)
            charities.push({ id: id.toString(), wallet: c.wallet, name: c.name, active: c.active, poolId: c.poolId.toString(), totalReceived: c.totalReceived })
          } catch(e) { console.error('charity load error', id.toString(), e) }
        }
        pools.push({ id: i, name, active, balance, charities })
      } catch(e) { console.error('pool load error', i, e) }
    }
    return pools
  } catch(e) { console.error('loadPools error', e); return [] }
}
