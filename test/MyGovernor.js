const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const {assert} = require("chai");
const {ethers} = require("hardhat");
const {moveBlocks} = require("../utils/moveBlocks");
const {moveTime} = require("../utils/moveTime");

describe("Governance System", function () {
  let votingDelay, votingPeriod, minDelay;
  async function deployContractsFixture() {
    const [deployer, proposer, executor, otherAccount] =
      await ethers.getSigners();

    // Deploy the GovernanceToken contract
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    const token = await GovernanceToken.deploy();

    await token.waitForDeployment();

    // Deploy the TimeLock contract
    minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    const TimeLock = await ethers.getContractFactory("TimeLock");
    const timeLock = await TimeLock.deploy(
      minDelay,
      proposers,
      executors,
      deployer.address
    );

    await timeLock.waitForDeployment();

    // Deploy the GovernorContract contract
    const quorumPercentage = 4; // 4%
    votingPeriod = 45818; // 1 week
    votingDelay = 1; // 1 block
    const GovernorContract = await ethers.getContractFactory(
      "GovernorContract"
    );
    const governor = await GovernorContract.deploy(
      token,
      timeLock,
      quorumPercentage,
      votingPeriod,
      votingDelay
    );

    await governor.waitForDeployment();
    console.log("Governor contract deployed!");

    // Transfer ownership of the token and timelock to the governor
    console.log("Setting up roles...");
    const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
    const proposerRole = await timeLock.PROPOSER_ROLE();
    const executorRole = await timeLock.EXECUTOR_ROLE();
    const adminRole = await timeLock.TIMELOCK_ADMIN_ROLE();

    const proposerRoleTx = await timeLock.grantRole(
      proposerRole,
      await governor.getAddress()
    );
    await proposerRoleTx.wait(1);
    console.log(`Proposer role granted to ${await governor.getAddress()}`);

    const executorRoleTx = await timeLock.grantRole(executorRole, ADDRESS_ZERO);
    await executorRoleTx.wait(1);
    console.log(`Executor role granted to everyone`);

    const revokeAdminRoleTx = await timeLock.revokeRole(
      adminRole,
      deployer.address
    );
    await revokeAdminRoleTx.wait(1);
    console.log(`Admin role revoked from ${deployer.address}`);

    return {
      token,
      timeLock,
      governor,
      deployer,
      proposer,
      executor,
      otherAccount,
      ADDRESS_ZERO,
    };
  }

  describe("Deployment", function () {
    it("Should deploy the contracts correctly", async function () {
      const {token, timeLock, governor} = await loadFixture(
        deployContractsFixture
      );

      assert(token.getAddress(), "Token contract address should be defined");
      assert(
        timeLock.getAddress(),
        "TimeLock contract address should be defined"
      );
      assert(
        governor.getAddress(),
        "Governor contract address should be defined"
      );
    });
  });

  describe("Governance Token", function () {
    it("Should mint the initial supply to the deployer", async function () {
      const {token, deployer} = await loadFixture(deployContractsFixture);

      const deployerBalance = await token.balanceOf(deployer.address);
      assert.equal(
        deployerBalance.toString(),
        ethers.parseEther("1000000").toString(),
        "Initial supply should be minted to the deployer"
      );
    });
  });

  describe("TimeLock", function () {
    it("Should set the correct proposer and executor roles", async function () {
      const {timeLock, proposer, ADDRESS_ZERO} = await loadFixture(
        deployContractsFixture
      );

      assert(
        await timeLock.hasRole(
          await timeLock.PROPOSER_ROLE(),
          proposer.address
        ),
        "Proposer role should be granted"
      );
      assert(
        await timeLock.hasRole(await timeLock.EXECUTOR_ROLE(), ADDRESS_ZERO),
        "Executor role should be granted"
      );
    });
  });

  describe("GovernorContract", function () {
    it("Should allow proposals and voting", async function () {
      const {governor, token, proposer, otherAccount, deployer, timeLock} =
        await loadFixture(deployContractsFixture);
      console.log(minDelay, votingDelay, votingPeriod);

      // Delegate votes to proposer and otherAccount
      await token
        .connect(deployer)
        .transfer(otherAccount.address, ethers.parseEther("1000"));
      await token.connect(deployer).delegate(proposer.address);

      await token.connect(otherAccount).delegate(otherAccount.address);

      // Create proposal to call store function on Box contract
      const Box = await ethers.getContractFactory("Box");
      const box = await Box.deploy();
      await box.waitForDeployment();

      console.log(
        "Transferring ownership of the protocol to our timelock contract..."
      );
      const txOwnershipTransfer = await box.transferOwnership(
        await timeLock.getAddress()
      );
      await txOwnershipTransfer.wait(1);
      console.log("Ownership transferred successfully!");

      const encodedFunctionCall = box.interface.encodeFunctionData("store", [
        42,
      ]);

      const proposeTx = await governor
        .connect(proposer)
        .propose(
          [await box.getAddress()],
          [0],
          [encodedFunctionCall],
          "Proposal #1: Store 42 in Box"
        );

      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt.logs[0].args.proposalId;

      await moveBlocks(votingDelay + 1);

      // Cast votes by different addresses
      await governor.connect(proposer).castVote(proposalId, 1); // For
      await governor.connect(otherAccount).castVote(proposalId, 1); // For
      await moveBlocks(votingPeriod + 1);

      const proposalState = await governor.state(proposalId);
      assert.equal(proposalState, 4);

      console.log("Queuing proposal...");
      const queueTx = await governor.queue(
        [await box.getAddress()],
        [0],
        [encodedFunctionCall],
        ethers.keccak256(ethers.toUtf8Bytes("Proposal #1: Store 42 in Box"))
      );
      await queueTx.wait(1);
      await moveTime(minDelay + 1);
      await moveBlocks(1);
      console.log("Proposal Queued!");

      const proposalStatePostQue = await governor.state(proposalId);
      console.log(
        "Proposal State after queueing: ",
        proposalStatePostQue.toString()
      );

      const executeTx = await governor
        .connect(proposer)
        .execute(
          [await box.getAddress()],
          [0],
          [encodedFunctionCall],
          ethers.keccak256(ethers.toUtf8Bytes("Proposal #1: Store 42 in Box"))
        );

      await executeTx.wait();

      const value = await box.retrieve();
      assert.equal(value.toString(), "42");
    });
  });
});
