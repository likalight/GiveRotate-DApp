# GiveRotate — Multi-Pool ROSCA Charity Donation DApp

> A fully on-chain decentralised application built on Ethereum Sepolia, implementing a multi-pool ROSCA (Rotating Savings and Credit Association) model for charitable donations in Singapore's MCCY IPC ecosystem.

---

## What is GiveRotate?

GiveRotate reimagines charitable giving through blockchain. Donors contribute XSGD (a Singapore Dollar-pegged stablecoin) into cause-specific pools. At each payout cycle, one pool receives the full accumulated balance — split equally among all charities in that pool. The ROSCA rotation then advances to the next pool.

### Two Cause Pools

| Pool | Charities | Perk |
|------|-----------|------|
| 🐾 Pool 1 — Animal Welfare | SPCA Singapore, Animal Lovers League | Free Shelter Visit (≥ 50 XSGD) |
| 🏷️ Pool 2 — Social Rehabilitation | Yellow Ribbon Fund, SACA | 50% Off Merchandise (≥ 75 XSGD) |

### Key Features

- ✅ Fully on-chain multi-pool ROSCA rotation
- ✅ ERC-721 NFT receipt per donation
- ✅ Equal-split payout among charities per pool
- ✅ Pool-level donation perks with threshold unlock
- ✅ SingPass MyInfo oracle simulation (IRAS 250% tax deduction)
- ✅ Three-role UI — Donor, Charity, Admin
- ✅ MCCY IPC-aligned charity registry

---

## Deployed Contracts (Ethereum Sepolia)

| Contract | Address |
|----------|---------|
| ROSCACharityV2 | `0x34D8D00E8D968237B1176b84D9bfcFb46cD7D5ae` |
| MockXSGD (ERC-20) | `0x00a73A0aE26Be0DB437bDefAc385c96728aa627e` |

🔗 [View on Etherscan](https://sepolia.etherscan.io)

---

## Prerequisites

| Tool | Version | Link |
|------|---------|------|
| nvm for Windows | Latest | [github.com/coreybutler/nvm-windows](https://github.com/coreybutler/nvm-windows) |
| Node.js | v25 (frontend) / v22 (deployment) | via nvm |
| MetaMask | Latest | [metamask.io](https://metamask.io) |

> **Windows users:** Always use **PowerShell**, not Command Prompt.

---

## Quick Start — Run the App

Use this if you just want to run the app using the already-deployed contracts.

```powershell
# 1. Install nvm (skip if already installed)
winget install CoreyButler.NVMforWindows
# Restart PowerShell after installing

# 2. Install and use Node 25
nvm install 25
nvm use 25

# 3. Allow scripts to run
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# 4. Clone the repo
git clone https://github.com/likalight/GiveRotate-DApp.git
cd GiveRotate-DApp

# 5. Install dependencies
npm install --legacy-peer-deps

# 6. Start the app
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Full Setup — Deploy Your Own Contract

Use this if you want to deploy a fresh copy of the smart contracts.

### Step 1 — Switch to Node 22 for Hardhat

```powershell
nvm install 22
nvm use 22
node --version  # Should show v22.x.x
```

### Step 2 — Install dependencies

```powershell
npm install --legacy-peer-deps
npm install @openzeppelin/contracts@4.9.6 --legacy-peer-deps
```

### Step 3 — Configure your deployer wallet

Open `hardhat.config.js` and update:

```javascript
networks: {
  sepolia: {
    url: "YOUR_ALCHEMY_SEPOLIA_RPC_URL",
    accounts: ["YOUR_DEPLOYER_PRIVATE_KEY"],
    chainId: 11155111,
  },
},
```

> ⚠️ Never commit your private key. Use environment variables in production.

Get a free RPC from [alchemy.com](https://alchemy.com) → create an app on Ethereum Sepolia.  
Get Sepolia ETH from [sepoliafaucet.com](https://sepoliafaucet.com).

### Step 4 — Compile and deploy

```powershell
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

Copy the two addresses printed in the output.

### Step 5 — Update contract addresses

Open `src/lib/contracts.js`:

```javascript
export const ADDRESSES = {
  ROSCA_CHARITY: "YOUR_NEW_ROSCA_CHARITY_ADDRESS",
  MOCK_XSGD:     "YOUR_NEW_MOCK_XSGD_ADDRESS",
}
```

### Step 6 — Switch to Node 25 and run

```powershell
nvm use 25
npm run dev
```

---

## Using the App

### Roles

| Role | Access | Notes |
|------|--------|-------|
| 🟢 Donor | Anyone | Needs Sepolia ETH + XSGD |
| 🔵 Charity | Registered wallet | Verified on-chain automatically |
| 🟡 Admin | Deployer wallet | Password: `admin` / `GiveRotate2024!` |

---

### Admin Setup (After Deploying)

**1. Mint XSGD to donor wallets**

Go to MockXSGD on [Etherscan Sepolia](https://sepolia.etherscan.io) → Write Contract → Connect wallet → `mint`:
- `to`: donor wallet address
- `amount`: `500000000` (= 500 XSGD at 6 decimals)

Repeat for each donor.

**2. Register charities**

Admin panel → Add Charity tab → select pool → enter name and wallet → Add Charity.

**3. Set pool perks**

Admin panel → Perks tab → set title, description, threshold and badge for each pool.

---

### Donor Flow

1. Connect MetaMask on Sepolia
2. Active pool is shown automatically — no choice needed
3. Enter XSGD amount and donate
4. ERC-721 NFT receipt minted to your wallet
5. Connect SingPass (mock) to generate IRAS tax deduction PDF

---

### Admin Payout Flow

1. Donors donate → active pool accumulates XSGD
2. Admin clicks **Trigger Payout**
3. Pool balance split equally among all active charities in the pool
4. ROSCA rotation advances to next pool automatically
5. Next donor session goes to the new active pool

---

## Wallet Setup for Simulation

You need 8 MetaMask wallets for a full simulation:

| Role | Name | Pool |
|------|------|------|
| Admin | Deployer | — |
| Charity 1 | SPCA Singapore | Animal Welfare |
| Charity 2 | Animal Lovers League | Animal Welfare |
| Charity 3 | Yellow Ribbon Fund | Social Rehabilitation |
| Charity 4 | SACA | Social Rehabilitation |
| Donor 1 | Tan Wei Liang | — |
| Donor 2 | Priya Ramasamy | — |
| Donor 3 | Muhammad Hafiz | — |

**Create wallets:** MetaMask → account icon → Add account or hardware wallet → Add a new account  
**Rename:** Three dots → Account details → pencil icon  
**Add XSGD token:** MetaMask → Import tokens → paste MockXSGD address

**Switch between wallets:** Always click **← Back** in the app before switching MetaMask accounts.

---

## Simulation Walkthrough

### Cycle 0 — Pool 1: Animal Welfare

| Step | Action | Who |
|------|--------|-----|
| 1 | Mint 500 XSGD to each donor | Admin (Etherscan) |
| 2 | Register all 4 charities to their pools | Admin (app) |
| 3 | Set pool perks | Admin (app) |
| 4 | Donate 25 XSGD → NFT #0 | Donor 1 |
| 5 | Donate 50 XSGD → NFT #1 + perk unlocked | Donor 2 |
| 6 | Donate 100 XSGD → NFT #2 + perk unlocked | Donor 3 |
| 7 | Trigger payout → 175 XSGD split: 87.50 XSGD each | Admin |
| 8 | Rotation advances to Pool 2 | Automatic |

### Cycle 1 — Pool 2: Social Rehabilitation

| Step | Action | Who |
|------|--------|-----|
| 9 | Active pool switches to Social Rehabilitation | Automatic |
| 10 | All 3 donors donate again | Donors |
| 11 | Trigger payout → split equally to Yellow Ribbon Fund + SACA | Admin |
| 12 | Rotation advances back to Pool 1 | Automatic |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `npm not recognised` | Use PowerShell, not Command Prompt |
| `nvm not recognised` | Restart PowerShell after installing nvm |
| Black screen | Click Refresh Page, log back in |
| Not authorised (Admin) | Connect the exact deployer wallet |
| Charity not recognised | Connect the exact registered charity wallet |
| Wrong network | Accept the Sepolia switch prompt in MetaMask |
| Hardhat compile fails | Run `nvm use 22` before compiling |
| Pool not switching | Refresh the page after triggering payout |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Smart Contracts | Solidity 0.8.24 | Multi-pool logic, ERC-721, equal-split payout |
| | OpenZeppelin v4.9.6 | AccessControl, ReentrancyGuard, Pausable, SafeERC20 |
| Deployment | Hardhat v2 | Compile and deploy to Sepolia |
| | Ethereum Sepolia | Public EVM testnet (Chain ID: 11155111) |
| Frontend | React 18 + Vite | Role-based single-page application |
| | ethers.js v6 | Wallet connection and contract calls |
| | MetaMask | Browser wallet and transaction signing |
| Off-Chain | SingPass MyInfo (mock) | Identity oracle, IRAS tax receipt generation |
| | localStorage | Pool perk configuration |

---

## Project Info

**Module:** BAC2002 Blockchain and Cryptocurrency  
**Institution:** Singapore Institute of Technology, AY2025/26  
**Team:** Kalai · Nayli · Zharfan · Xinrong · Su Myat
