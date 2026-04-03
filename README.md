# GiveRotate — Multi-Pool ROSCA Charity Donation DApp

A fully on-chain decentralised application (DApp) built on Ethereum Sepolia. Implements a multi-pool ROSCA (Rotating Savings and Credit Association) model for charitable donations, where donors contribute XSGD to cause-specific pools and payouts rotate between pools each cycle.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start (Run Only)](#quick-start-run-only)
- [Full Setup (Deploy Your Own Contract)](#full-setup-deploy-your-own-contract)
- [Using the App](#using-the-app)
- [Wallet Setup](#wallet-setup)
- [Simulation Guide](#simulation-guide)
- [Deployed Contracts](#deployed-contracts)
- [Troubleshooting](#troubleshooting)
- [Tech Stack](#tech-stack)

---

## Overview

GiveRotate v5 introduces two cause pools:

| Pool | Charities | Perk |
|------|-----------|------|
| Pool 1 — Animal Welfare | SPCA Singapore, Animal Lovers League | 🐾 Free Shelter Visit (≥ 50 XSGD) |
| Pool 2 — Social Rehabilitation | Yellow Ribbon Fund, SACA | 🏷️ 50% Off Merchandise (≥ 75 XSGD) |

The ROSCA rotation operates at the pool level. When Admin triggers a payout, the active pool's balance is split equally among all charities in that pool, and the rotation advances to the next pool.

---

## Prerequisites

Before you begin, install the following:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v22 LTS (for deployment) | [nodejs.org](https://nodejs.org) |
| Node.js | v25 (for frontend) | via nvm |
| nvm for Windows | Latest | [github.com/coreybutler/nvm-windows](https://github.com/coreybutler/nvm-windows) |
| MetaMask | Latest | [metamask.io](https://metamask.io) |
| Git | Any | [git-scm.com](https://git-scm.com) |

> **Windows users:** Use **PowerShell**, not Command Prompt.

---

## Quick Start (Run Only)

Use this if you want to run the existing deployed contract without redeploying.

### 1. Extract the zip

Unzip `giverotate-v5.zip` and open PowerShell in the extracted folder.

### 2. Navigate into the project

```powershell
cd giverotate-v5
```

### 3. Install nvm and Node (if not already installed)

```powershell
winget install CoreyButler.NVMforWindows
```

Restart PowerShell, then:

```powershell
nvm install 25
nvm use 25
```

### 4. Install dependencies

```powershell
npm install --legacy-peer-deps
```

### 5. Run the app

```powershell
npm run dev
```

### 6. Open in browser

```
http://localhost:5173
```

> The app is pre-configured with the deployed contract addresses. No further setup needed to run.

---

## Full Setup (Deploy Your Own Contract)

Use this if you want to deploy a fresh copy of the smart contracts to Sepolia.

### Step 1 — Set up Node 22 for Hardhat

```powershell
nvm install 22
nvm use 22
node --version  # Should show v22.x.x
```

### Step 2 — Set PowerShell execution policy

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Step 3 — Install dependencies

```powershell
npm install --legacy-peer-deps
npm install @openzeppelin/contracts@4.9.6 --legacy-peer-deps
```

### Step 4 — Configure your deployer wallet

Open `hardhat.config.js` and replace the private key and RPC URL:

```javascript
networks: {
  sepolia: {
    url: "YOUR_ALCHEMY_OR_INFURA_SEPOLIA_RPC_URL",
    accounts: ["YOUR_DEPLOYER_WALLET_PRIVATE_KEY"],
    chainId: 11155111,
  },
},
```

> ⚠️ Never commit your private key to git. Use a `.env` file in production.

Get a free RPC URL from [alchemy.com](https://alchemy.com) — create an app on Ethereum Sepolia.

Get Sepolia ETH for gas from [sepoliafaucet.com](https://sepoliafaucet.com).

### Step 5 — Compile contracts

```powershell
npx hardhat compile
```

### Step 6 — Deploy to Sepolia

```powershell
npx hardhat run scripts/deploy.js --network sepolia
```

The output will show two addresses:

```
ROSCA_CHARITY : 0x...
MOCK_XSGD     : 0x...
```

### Step 7 — Update contract addresses

Open `src/lib/contracts.js` and paste your new addresses:

```javascript
export const ADDRESSES = {
  ROSCA_CHARITY: "YOUR_ROSCA_CHARITY_ADDRESS",
  MOCK_XSGD:     "YOUR_MOCK_XSGD_ADDRESS",
}
```

### Step 8 — Switch to Node 25 and run the frontend

```powershell
nvm use 25
npm run dev
```

---

## Using the App

### Role Select Screen

The landing page has three roles:

| Role | Who | Password |
|------|-----|----------|
| 🟢 Donor | Anyone donating XSGD | None |
| 🔵 Charity | Registered charity wallet | None — wallet verified on-chain |
| 🟡 Admin | Deployer wallet | `admin` / `GiveRotate2024!` |

---

### Admin Setup Flow

After deploying, the Admin must set up the protocol:

**1. Mint XSGD to donor wallets**

Go to your MockXSGD contract on Etherscan Sepolia → Write Contract → Connect wallet → Call `mint`:
- Address: donor wallet address
- Amount: `500000000` (= 500 XSGD, 6 decimals)

Repeat for each donor wallet.

**2. Register charities**

In the app → Admin → Add Charity tab:
- Select pool (Pool 1 or Pool 2)
- Enter charity name and wallet address
- Click Add Charity

**3. Set pool perks**

In the app → Admin → Perks tab:
- Set a perk title, description, minimum XSGD threshold, and badge for each pool
- Perks apply to all charities within that pool

---

### Donor Flow

1. Click **Donor** on role select
2. Click **Connect MetaMask** — approve on Sepolia network
3. The active pool is shown automatically based on ROSCA rotation
4. Enter amount and click **Donate**
5. Approve XSGD spend in MetaMask (first time only)
6. Confirm donation — NFT receipt minted to your wallet
7. Click **Connect SingPass** to generate IRAS tax PDF

---

### Charity Flow

1. Click **Charity** on role select
2. Connect your registered charity wallet
3. App verifies your wallet on-chain automatically
4. View your pool, rotation status, and payout history

---

### Admin Flow

1. Click **Admin** on role select
2. Enter password: `GiveRotate2024!`
3. Connect deployer wallet in MetaMask
4. **Pools & Charities** — view all pools and registered charities
5. **Add Charity** — register new charities to a pool
6. **Perks** — set donation threshold perks per pool
7. **Trigger Payout** — distribute pool balance equally to all charities in the active pool. Rotation advances to next pool automatically.
8. **Activity** — view all on-chain events

---

## Wallet Setup

You need at least 6 MetaMask wallets for a full simulation:

| Role | Suggested Name | Notes |
|------|---------------|-------|
| Admin | Admin / Deployer | Must be the wallet used to deploy the contract |
| Charity 1 | SPCA Singapore | Pool 1 — Animal Welfare |
| Charity 2 | Animal Lovers League | Pool 1 — Animal Welfare |
| Charity 3 | Yellow Ribbon Fund | Pool 2 — Social Rehabilitation |
| Charity 4 | SACA | Pool 2 — Social Rehabilitation |
| Donor 1 | Tan Wei Liang | Needs Sepolia ETH + XSGD |
| Donor 2 | Priya Ramasamy | Needs Sepolia ETH + XSGD |
| Donor 3 | Muhammad Hafiz | Needs Sepolia ETH + XSGD |

**To create wallets in MetaMask:**
1. Click account icon → Add account or hardware wallet → Add a new account
2. Repeat for each wallet
3. Rename each via three dots → Account details → edit pencil

**To add XSGD token to MetaMask:**
1. MetaMask → Import tokens
2. Paste MockXSGD contract address
3. Symbol and decimals fill automatically → Add token

---

## Simulation Guide

Full end-to-end simulation walkthrough:

### Cycle 0 — Pool 1 (Animal Welfare)

| Step | Action | Who |
|------|--------|-----|
| 1 | Mint 500 XSGD to each donor | Admin via Etherscan |
| 2 | Register all 4 charities to their pools | Admin in app |
| 3 | Set perks for Pool 1 and Pool 2 | Admin in app |
| 4 | Donate 25 XSGD → NFT #0 | Donor 1 |
| 5 | Donate 50 XSGD → NFT #1 + perk unlocked | Donor 2 |
| 6 | Donate 100 XSGD → NFT #2 + perk unlocked | Donor 3 |
| 7 | Trigger payout → 175 XSGD split 87.50 each to SPCA + Animal Lovers League | Admin |
| 8 | Rotation advances to Pool 2 | Automatic |

### Cycle 1 — Pool 2 (Social Rehabilitation)

| Step | Action | Who |
|------|--------|-----|
| 9 | Active pool shows Social Rehabilitation | Automatic |
| 10 | All 3 donors donate again | Donors |
| 11 | Trigger payout → balance split equally to Yellow Ribbon Fund + SACA | Admin |
| 12 | Rotation advances back to Pool 1 | Automatic |

---

## Deployed Contracts

These are the pre-deployed contracts used in this version:

| Contract | Address | Network |
|----------|---------|---------|
| ROSCACharityV2 | `0x34D8D00E8D968237B1176b84D9bfcFb46cD7D5ae` | Ethereum Sepolia |
| MockXSGD (ERC-20) | `0x00a73A0aE26Be0DB437bDefAc385c96728aa627e` | Ethereum Sepolia |

View on Etherscan: [sepolia.etherscan.io](https://sepolia.etherscan.io)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `npm not recognised` | Use PowerShell, not Command Prompt |
| `nvm not recognised` | Restart PowerShell after installing nvm |
| Black screen / Something went wrong | Click Refresh Page, log back in as Admin |
| Not authorised (Admin) | Connect the exact deployer wallet used during deployment |
| Charity not recognised | Connect the exact wallet registered on-chain for that charity |
| Wrong network | Accept the Sepolia switch prompt in MetaMask |
| Hardhat compile fails | Make sure you are on `nvm use 22` not Node 25 |
| Pool not switching after payout | Refresh the page — rotationIndex updates on-chain after payout |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Smart Contracts | Solidity 0.8.24 | Pool management, NFT minting, equal-split payout |
| | OpenZeppelin v4.9.6 | AccessControl, ReentrancyGuard, Pausable, ERC721 |
| Deployment | Hardhat v2 | Compile and deploy to Sepolia |
| | Ethereum Sepolia | Public EVM testnet |
| | Alchemy | RPC node provider |
| Frontend | React 18 + Vite | Role-based SPA |
| | ethers.js v6 | Wallet connection and contract interaction |
| | MetaMask | Browser wallet and transaction signing |
| Off-Chain | SingPass MyInfo (mock) | Identity oracle and IRAS tax receipt generation |
| | SubtleCrypto API | SHA-256 admin password hashing |
| | localStorage | Pool perk configuration |

---

## Project Info

Built for BAC2002 Blockchain and Cryptocurrency — Singapore Institute of Technology, AY2025/26.

Team: Kalai, Nayli, Zharfan, Xinrong, Su Myat
