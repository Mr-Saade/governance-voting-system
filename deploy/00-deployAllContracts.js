const {developmentChains} = require("../helper-hardhat-config");
const {
  QUORUM_PERCENTAGE,
  VOTING_PERIOD,
  VOTING_DELAY,
  MIN_DELAY,
} = require("../helper-hardhat-config");
module.exports = async ({getNamedAccounts, deployments, network}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();

  if (developmentChains.includes(network.name)) {
    log("Local network detected!");
    console.log("Deploying Box Contract...");
    const box = await deploy("Box", {
      from: deployer,
      args: [],
      log: true,
      waitConfirmations: network.config.blockConfirmations || 1,
    });
    log("Box Contract Deployed!");
    log("------------------------------------------------------");

    console.log("Deploying Governance Token Contract...");
    const governanceToken = await deploy("GovernanceToken", {
      from: deployer,
      args: [],
      log: true,
      waitConfirmations: network.config.blockConfirmations || 1,
    });
    log("Governance Token Contract Deployed!");
    log("------------------------------------------------------");

    console.log("Deploying TimeLock Contract...");
    const timeLock = await deploy("TimeLock", {
      from: deployer,
      args: [MIN_DELAY, [], [], deployer],
      log: true,
      waitConfirmations: network.config.blockConfirmations || 1,
    });
    log("TimeLock Contract Deployed!");
    log("------------------------------------------------------");

    console.log("Deploying Governor Contract...");
    const governor = await deploy("GovernorContract", {
      from: deployer,
      args: [
        governanceToken.address,
        timeLock.address,
        QUORUM_PERCENTAGE,
        VOTING_PERIOD,
        VOTING_DELAY,
      ],
      log: true,
      waitConfirmations: network.config.blockConfirmations || 1,
    });
    log("Governor Contract Deployed!");
    log("------------------------------------------------------");
  }
};
module.exports.tags = ["all"];
