async function moveBlocks(numOfBlocks) {
  console.log(`Mining ${numOfBlocks}...`);
  for (let i = 0; i < numOfBlocks; i++) {
    await network.provider.request({
      method: "evm_mine",
      params: [],
    });
  }
}

module.exports = {moveBlocks};
