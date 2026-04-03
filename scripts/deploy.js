import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Deployer:", deployer.address);
  console.log("Balance :", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("\n[1/3] Deploying MockXSGD...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const xsgd = await MockERC20.deploy("XSGD", "XSGD", 6);
  await xsgd.waitForDeployment();
  const xsgdAddr = await xsgd.getAddress();
  console.log("✅ MockXSGD:", xsgdAddr);

  console.log("\n[2/3] Deploying ROSCACharityV2...");
  const ROSCACharityV2 = await ethers.getContractFactory("ROSCACharityV2");
  const rosca = await ROSCACharityV2.deploy(xsgdAddr, "ipfs://placeholder/", deployer.address);
  await rosca.waitForDeployment();
  const roscaAddr = await rosca.getAddress();
  console.log("✅ ROSCACharityV2:", roscaAddr);

  console.log("\n[3/3] Creating pools...");
  await (await rosca.createPool("Pool 1")).wait();
  console.log("✅ Pool 1: Animal Welfare");
  await (await rosca.createPool("Pool 2")).wait();
  console.log("✅ Pool 2: Social Rehabilitation");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("ROSCA_CHARITY :", roscaAddr);
  console.log("MOCK_XSGD     :", xsgdAddr);
  console.log("Paste these into src/lib/contracts.js");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((e) => { console.error(e); process.exit(1); });
