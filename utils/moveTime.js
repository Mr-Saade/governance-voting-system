const {network} = require("hardhat");

async function moveTime(time) {
  console.log("Increasing TimeStamp...");
  await network.provider.send("evm_increaseTime", [time]);
}

module.exports = {moveTime};
