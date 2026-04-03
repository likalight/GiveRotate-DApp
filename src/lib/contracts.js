// ── UPDATE THESE AFTER RUNNING: npx hardhat run scripts/deploy.js --network sepolia ──
export const ADDRESSES = {
  ROSCA_CHARITY: "0x34D8D00E8D968237B1176b84D9bfcFb46cD7D5ae",
  MOCK_XSGD:     "0x00a73A0aE26Be0DB437bDefAc385c96728aa627e",
}

export const ROSCA_ABI = [
  "function poolCount() view returns (uint256)",
  "function pools(uint256) view returns (string name, bool active, uint256 balance)",
  "function getAllPools() view returns (uint256[] ids, string[] names, uint256[] balances)",
  "function getPool(uint256 poolId) view returns (string name, bool active, uint256 balance, uint256[] charityIds)",
  "function getPoolCharities(uint256 poolId) view returns (uint256[])",
  "function nextPayoutPool() view returns (uint256 poolId, string name, uint256 balance)",
  "function rotationIndex() view returns (uint256)",
  "function currentCycle() view returns (uint256)",
  "function createPool(string name) returns (uint256)",
  "function charities(uint256) view returns (address wallet, string name, bool active, uint256 poolId, uint256 totalReceived)",
  "function isRegisteredWallet(address) view returns (bool)",
  "function walletToCharityId(address) view returns (uint256)",
  "function addCharityToPool(uint256 poolId, address wallet, string name) returns (uint256)",
  "function removeCharity(uint256 charityId)",
  "function reactivateCharity(uint256 charityId)",
  "function donate(uint256 poolId, uint256 amount)",
  "function donationReceipts(uint256) view returns (address donor, uint256 poolId, uint256 amount, uint256 timestamp, uint256 cycleId)",
  "function totalDonations() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function payout()",
  "function paused() view returns (bool)",
  "function pause()",
  "function unpause()",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function ADMIN_ROLE() view returns (bytes32)",
  "event PoolCreated(uint256 indexed poolId, string name)",
  "event CharityAdded(uint256 indexed charityId, uint256 indexed poolId, address indexed wallet, string name)",
  "event CharityRemoved(uint256 indexed charityId, address indexed wallet)",
  "event DonationReceived(address indexed donor, uint256 indexed poolId, uint256 amount, uint256 indexed tokenId, uint256 cycleId, uint256 newPoolBalance)",
  "event PayoutExecuted(uint256 indexed poolId, uint256 cycleId, uint256 totalAmount, uint256 perCharityAmount, uint256 charityCount)",
]

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function mint(address to, uint256 amount)",
]

export const SEPOLIA_CHAIN_ID = 11155111
export const fmt6 = (raw) => raw != null ? (Number(raw) / 1e6).toFixed(2) : '0.00'
