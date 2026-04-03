/**
 * taxOracle.js — Off-chain SingPass MyInfo oracle simulation
 * Generates IRAS-compatible tax deduction receipts for GiveRotate donations.
 *
 * Production flow (myinfo-connector-nodejs):
 *   1. Redirect donor to SingPass OAuth
 *   2. Receive auth code on callback
 *   3. Call connector.getPersonData(authCode, state) → verified person data
 *   4. Generate structured IRAS donation record
 *
 * Here we simulate this with 3 mock donor profiles, one per wallet address.
 */

// ── 3 mock MyInfo donor profiles (one per donor wallet) ──────────────────────
const MOCK_DONORS = {
  // Donor 1
  '0xd907d1e4541825bc7b10fd42a5e7adede37553b0': {
    uinfin:   { value: 'S9312345A' },
    name:     { value: 'TAN WEI LIANG' },
    dob:      { value: '1993-05-18' },
    email:    { value: 'weiliang.tan@email.com' },
    mobileno: { nbr: { value: '91234567' } },
    regadd:   { block: { value: '45' }, street: { value: 'JURONG WEST AVE 3' }, unit: { value: '08-221' }, postal: { value: '640045' } },
    residentialstatus: { desc: 'CITIZEN' },
  },
  // Donor 2
  '0x13bd7abc8a05dcfa041001850a638cf68a2aeb6b': {
    uinfin:   { value: 'S9487654B' },
    name:     { value: 'PRIYA RAMASAMY' },
    dob:      { value: '1994-11-02' },
    email:    { value: 'priya.r@email.com' },
    mobileno: { nbr: { value: '98765432' } },
    regadd:   { block: { value: '12' }, street: { value: 'TAMPINES STREET 21' }, unit: { value: '04-88' }, postal: { value: '520012' } },
    residentialstatus: { desc: 'PERMANENT RESIDENT' },
  },
  // Donor 3
  '0x423428fd90115cb57e0ef5bb906f739bcf8cb303': {
    uinfin:   { value: 'S9001234C' },
    name:     { value: 'MUHAMMAD HAFIZ BIN ISMAIL' },
    dob:      { value: '1990-03-27' },
    email:    { value: 'hafiz.ismail@email.com' },
    mobileno: { nbr: { value: '87654321' } },
    regadd:   { block: { value: '88' }, street: { value: 'BEDOK NORTH ROAD' }, unit: { value: '12-05' }, postal: { value: '460088' } },
    residentialstatus: { desc: 'CITIZEN' },
  },
}

// Default fallback if wallet not in mock list
const DEFAULT_DONOR = {
  uinfin:   { value: 'S****000Z' },
  name:     { value: 'ANONYMOUS DONOR' },
  dob:      { value: '1990-01-01' },
  email:    { value: '' },
  mobileno: { nbr: { value: '' } },
  regadd:   { block: { value: '—' }, street: { value: '—' }, unit: { value: '' }, postal: { value: '000000' } },
  residentialstatus: { desc: 'UNKNOWN' },
}

const IRAS_CONFIG = {
  deductionMultiplier: 2.5,
  currency: 'SGD',
  taxYear: new Date().getFullYear(),
  ipcStatus: 'Approved IPC (Simulated)',
  reportingEntity: 'GiveRotate Protocol',
}

export function generateTaxRecord(donationEvent, charityInfo, myInfoOverride = null) {
  // Pick mock person by donor wallet address, or use override if SingPass connected
  const person = myInfoOverride ||
    MOCK_DONORS[donationEvent.donor?.toLowerCase()] ||
    DEFAULT_DONOR

  const amountSGD = Number(donationEvent.amount) / 1e6
  const deductibleAmount = amountSGD * IRAS_CONFIG.deductionMultiplier
  const donationDate = donationEvent.timestamp
    ? new Date(Number(donationEvent.timestamp) * 1000)
    : new Date()

  return {
    recordId:        `GR-${IRAS_CONFIG.taxYear}-${donationEvent.tokenId || Date.now()}`,
    generatedAt:     new Date().toISOString(),
    taxYear:         IRAS_CONFIG.taxYear,
    reportingEntity: IRAS_CONFIG.reportingEntity,
    ipcStatus:       IRAS_CONFIG.ipcStatus,
    mode:            myInfoOverride ? 'LIVE' : 'SIMULATION',

    donor: {
      nric:         person.uinfin?.value || 'S****000Z',
      name:         person.name?.value || 'UNKNOWN',
      email:        person.email?.value || '',
      mobile:       person.mobileno?.nbr?.value || '',
      address:      formatAddress(person.regadd),
      residency:    person.residentialstatus?.desc || 'UNKNOWN',
      walletAddress: donationEvent.donor,
    },

    donation: {
      txHash:              donationEvent.txHash || '0x0000…',
      tokenId:             donationEvent.tokenId?.toString() || '—',
      cycleId:             donationEvent.cycleId?.toString() || '—',
      amountXSGD:          amountSGD.toFixed(2),
      amountSGD:           amountSGD.toFixed(2),
      currency:            IRAS_CONFIG.currency,
      donationDate:        donationDate.toISOString().split('T')[0],
      donationDateDisplay: donationDate.toLocaleDateString('en-SG', { day: '2-digit', month: 'long', year: 'numeric' }),
    },

    charity: {
      name:          charityInfo.name,
      walletAddress: charityInfo.wallet,
      charityId:     charityInfo.id?.toString(),
    },

    taxDeduction: {
      eligibleAmount:      amountSGD.toFixed(2),
      deductionMultiplier: `${IRAS_CONFIG.deductionMultiplier}x`,
      deductibleAmount:    deductibleAmount.toFixed(2),
      currency:            IRAS_CONFIG.currency,
      note: `Under IRAS Section 37(3)(b), donations to approved IPCs qualify for ${IRAS_CONFIG.deductionMultiplier * 100}% tax deduction.`,
    },

    blockchainProof: {
      network:         'Ethereum Sepolia',
      contractAddress: '0x4d5Bbc4ecC2BF354DB09e00fe037f6D2dC84b718',
      nftTokenId:      donationEvent.tokenId?.toString(),
      verifyUrl:       `https://sepolia.etherscan.io/tx/${donationEvent.txHash || ''}`,
    },
  }
}

export function generateTaxReceiptHTML(record) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Receipt — ${record.recordId}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Georgia,serif;font-size:13px;color:#1a1a1a;background:#fff;padding:40px;max-width:800px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a1a1a;padding-bottom:20px;margin-bottom:28px}
    .logo{font-size:22px;font-weight:800;letter-spacing:-0.02em}
    .logo span{color:#00a362}
    .badge{font-size:10px;padding:3px 8px;background:${record.mode==='LIVE'?'#e6f7ef':'#fff8e6'};color:${record.mode==='LIVE'?'#00a362':'#b07800'};border:1px solid ${record.mode==='LIVE'?'#00a36260':'#b0780060'};border-radius:4px;font-family:monospace}
    .title{font-size:18px;font-weight:700;margin-bottom:4px}
    .record-id{font-family:monospace;font-size:12px;color:#999}
    .section{margin-bottom:24px}
    .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#999;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #eee}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .field label{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:2px}
    .field value{font-size:13px;font-weight:600}
    .amount-box{background:#f0faf5;border:1px solid #00a36230;border-radius:8px;padding:18px;margin:20px 0;text-align:center}
    .amount-big{font-size:40px;font-weight:800;color:#00a362;font-family:monospace}
    .amount-label{font-size:12px;color:#666;margin-top:4px}
    .deduction-box{background:#fff8e6;border:1px solid #e8c97a50;border-radius:8px;padding:16px}
    .deduction-amount{font-size:28px;font-weight:800;color:#b07800;font-family:monospace}
    .note{font-size:11px;color:#888;line-height:1.6;margin-top:8px}
    .blockchain{background:#f5f5f5;border-radius:8px;padding:14px;font-family:monospace;font-size:11px;color:#555;word-break:break-all}
    .footer{margin-top:40px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center;line-height:1.8}
    .sim-banner{background:#fff8e6;border:1px solid #e8c97a;border-radius:6px;padding:10px 14px;margin-bottom:24px;font-size:11px;color:#7a5800}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Give<span>Rotate</span></div>
      <div style="font-size:12px;color:#666;margin-top:2px">ROSCA Charity Donation Protocol</div>
    </div>
    <div style="text-align:right">
      <div class="title">Tax Deduction Receipt</div>
      <div class="record-id">${record.recordId}</div>
      <br><span class="badge">${record.mode==='LIVE'?'✓ LIVE — MyInfo Verified':'⚠ SIMULATION MODE'}</span>
    </div>
  </div>

  ${record.mode!=='LIVE'?`<div class="sim-banner">⚠ <strong>Simulation Mode</strong> — This receipt uses mock donor identity data matched to the donor wallet address. In production, real donor details are fetched via SingPass MyInfo API after explicit consent.</div>`:''}

  <div class="amount-box">
    <div class="amount-big">SGD ${record.donation.amountSGD}</div>
    <div class="amount-label">Donation to ${record.charity.name} · ${record.donation.donationDateDisplay}</div>
  </div>

  <div class="section">
    <div class="section-title">Donor Information (SingPass MyInfo)</div>
    <div class="grid">
      <div class="field"><label>Full Name</label><value>${record.donor.name}</value></div>
      <div class="field"><label>NRIC / FIN</label><value>${record.donor.nric}</value></div>
      <div class="field"><label>Residency</label><value>${record.donor.residency}</value></div>
      <div class="field"><label>Wallet</label><value style="font-family:monospace;font-size:11px">${record.donor.walletAddress?.slice(0,18)}…</value></div>
      <div class="field" style="grid-column:1/-1"><label>Address</label><value>${record.donor.address}</value></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Donation Details (On-Chain)</div>
    <div class="grid">
      <div class="field"><label>Charity</label><value>${record.charity.name}</value></div>
      <div class="field"><label>IPC Status</label><value>${record.ipcStatus}</value></div>
      <div class="field"><label>Date</label><value>${record.donation.donationDateDisplay}</value></div>
      <div class="field"><label>Tax Year</label><value>${record.taxYear}</value></div>
      <div class="field"><label>NFT Receipt</label><value>#${record.donation.tokenId}</value></div>
      <div class="field"><label>Cycle</label><value>#${record.donation.cycleId}</value></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">IRAS Tax Deduction</div>
    <div class="deduction-box">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:11px;color:#999;margin-bottom:4px">Eligible Deduction Amount</div>
          <div class="deduction-amount">SGD ${record.taxDeduction.deductibleAmount}</div>
          <div style="font-size:11px;color:#b07800;margin-top:4px">SGD ${record.taxDeduction.eligibleAmount} × ${record.taxDeduction.deductionMultiplier}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#999">Deduction Rate</div>
          <div style="font-size:24px;font-weight:800;color:#b07800">${parseFloat(record.taxDeduction.deductionMultiplier)*100}%</div>
        </div>
      </div>
      <div class="note">${record.taxDeduction.note}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Blockchain Verification</div>
    <div class="blockchain">
      Network: ${record.blockchainProof.network}<br>
      Contract: ${record.blockchainProof.contractAddress}<br>
      NFT Token ID: #${record.blockchainProof.nftTokenId}<br>
      Verify: ${record.blockchainProof.verifyUrl||'N/A'}
    </div>
  </div>

  <div class="footer">
    Generated by ${record.reportingEntity} · ${new Date(record.generatedAt).toLocaleString('en-SG')}<br>
    This document simulates IRAS-compatible donation reporting via SingPass MyInfo oracle.<br>
    <strong>For actual tax claims, submit via myTax Portal at mytax.iras.gov.sg</strong>
  </div>
</body>
</html>`
}

export function downloadTaxReceipt(record) {
  const html = generateTaxReceiptHTML(record)
  const blob = new Blob([html], { type: 'text/html' })
  const url  = URL.createObjectURL(blob)
  const win  = window.open(url, '_blank')
  if (win) win.focus()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export async function mockMyInfoConnect(walletAddress) {
  await new Promise(r => setTimeout(r, 1500))
  const person = MOCK_DONORS[walletAddress?.toLowerCase()] || DEFAULT_DONOR
  return { ...person, _source: 'mock', _connectedAt: new Date().toISOString() }
}

function formatAddress(regadd) {
  if (!regadd) return 'N/A'
  const { block, street, unit, postal } = regadd
  return `${block?.value||''} ${street?.value||''} ${unit?.value?'#'+unit.value:''} Singapore ${postal?.value||''}`.trim()
}
