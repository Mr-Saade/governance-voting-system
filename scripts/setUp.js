const {ethers} = require("hardhat");

async function main() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  const tokenAddressContract = await ethers.getContractAt(
    "GovernanceToken",
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", //loally deployed contract address
    deployer
  );
  const timeLockContract = await ethers.getContractAt(
    "TimeLock",
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", //loally deployed contract address
    deployer
  );
  const box = await ethers.getContractAt(
    "Box",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3", //loally deployed contract address
    deployer
  );

  //delegate some gtokenAddresss to deployer to vote
  console.log(deployer.address);
  await delegate(tokenAddressContract, deployer.address);

  //setting up roles
  await setRoles(
    timeLockContract,
    "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    deployer
  );

  //transfer ownership of the protocol to our timelock contract
  console.log(
    "Transferring ownership of the protocol to our timelock contract..."
  );
  const tx = await box.transferOwnership(
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  );
  await tx.wait(1);
  console.log("Ownership transferred successfully!");
}

async function delegate(tokenAddressContract, delegatee) {
  console.log("Delegating governance tokenAddresss to user...");
  console.log(delegatee);
  const initCheckPoints = await tokenAddressContract.numCheckpoints(delegatee);
  console.log(`${initCheckPoints} checkpoints`);

  const delegateTx = await tokenAddressContract.delegate(delegatee);
  await delegateTx.wait(1);
  console.log(`tokenAddresss Delegated to : ${delegatee.address}`);
  const checkPoints = await tokenAddressContract.numCheckpoints(delegatee);
  console.log(`${checkPoints} checkpoints`);
}

async function setRoles(timeLockContract, governorContractAddress, deployer) {
  console.log("Setting up roles...");
  const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
  const proposerRole = await timeLockContract.PROPOSER_ROLE();
  const executorRole = await timeLockContract.EXECUTOR_ROLE();
  const adminRole = await timeLockContract.TIMELOCK_ADMIN_ROLE();

  const proposerRoleTx = await timeLockContract.grantRole(
    proposerRole,
    governorContractAddress
  );
  await proposerRoleTx.wait(1);
  console.log(`Proposer role granted to ${governorContractAddress}`);

  const executorRoleTx = await timeLockContract.grantRole(
    executorRole,
    ADDRESS_ZERO
  );
  await executorRoleTx.wait(1);
  console.log(`Executor role granted to everyone`);

  const revokeAdminRoleTx = await timeLockContract.revokeRole(
    adminRole,
    deployer.address
  );
  await revokeAdminRoleTx.wait(1);
  console.log(`Admin role revoked from ${deployer.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
