const {moveBlocks} = require("../utils/moveBlocks");
const {moveTime} = require("../utils/moveTime");
const {
  VOTING_DELAY,
  VOTING_PERIOD,
  MIN_DELAY,
} = require("../helper-hardhat-config");
const fs = require("fs");
const {ethers, network} = require("hardhat");

async function main() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  const proposalsFile = "proposals.json";

  const box = await ethers.getContractAt(
    "Box",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    deployer
  );

  const governor = await ethers.getContractAt(
    "GovernorContract",
    "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    deployer
  );

  const targets = ["0x5fbdb2315678afecb367f032d93f642f64180aa3"];
  const args = [100];
  const callData = box.interface.encodeFunctionData("store", args);
  const description = "i believe the new value should be 100 because...";
  const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));

  console.log("Proposing...");

  const proposalTx = await governor.propose(
    targets,
    [0],
    [callData],
    description
  );
  const proposalReceipt = await proposalTx.wait(1);
  const proposalId = proposalReceipt.logs[0].args.proposalId;
  let proposalState = await governor.state(proposalId);

  console.log("Propsed!");

  console.log("Proposal ID: ", proposalId.toString());
  console.log("Proposal State: ", proposalState.toString());

  await moveBlocks(VOTING_DELAY + 1);

  // Writing proposal ID to file
  let proposals = JSON.parse(fs.readFileSync(proposalsFile, "utf8"));
  proposals[network.config.chainId.toString()].push(proposalId.toString());
  fs.writeFileSync(proposalsFile, JSON.stringify(proposals), "utf8");

  console.log("Proposals stored successfully!");

  // Voting on the proposal
  const reason = "i agree with this proposal!";
  const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(reason));
  await castVote(proposalId, 1, reasonHash);

  // Queue and Execute
  await queueAndExecute(targets, [callData], descriptionHash);

  const value = await box.retrieve();
  console.log("Value: ", value);

  async function castVote(proposalId, vote, reason) {
    console.log("Voting on the proposal...");
    const voteTx = await governor.castVoteWithReason(proposalId, vote, reason);
    await voteTx.wait(1);
    await moveBlocks(VOTING_PERIOD + 1);
    proposalState = await governor.state(proposalId);
    console.log("Voted!");
    console.log("Proposal State after voting: ", proposalState.toString());
  }

  async function queueAndExecute(targets, callData, descriptionHash) {
    console.log("Queuing proposal...");
    const queueTx = await governor.queue(
      targets,
      [0],
      callData,
      descriptionHash
    );
    await queueTx.wait(1);
    await moveTime(MIN_DELAY + 1);
    await moveBlocks(1);
    console.log("Proposal Queued!");

    proposalState = await governor.state(proposalId);
    console.log("Proposal State after queueing: ", proposalState.toString());

    console.log("Executing proposal...");
    const executeTx = await governor.execute(
      targets,
      [0],
      callData,
      descriptionHash
    );
    await executeTx.wait(1);
    proposalState = await governor.state(proposalId);
    console.log("Proposal State after execution: ", proposalState.toString());
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
