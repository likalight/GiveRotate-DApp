import "@nomicfoundation/hardhat-ethers";

export default {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/MjJxXO_zRaA8MWYoAWMcC",
      accounts: ["0x4b5b262ac2454b3d824a8cb56957515a21ae7d916526180dc552e8eb90f0fd8d"],
      chainId: 11155111,
    },
  },
};
