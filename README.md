# Governance and Voting System

This project demonstrates a simple governance and voting system using Solidity and Hardhat. It includes a governance token, a governor contract, a time-lock contract, and a Box contract for storing values. The system demonstrates the governance processes of proposing, voting, queueing, and executing proposals to a contract , in this case, to update the stored value in the Box contract.

## Prerequisites

- Node.js
- npm or yarn

## Getting Started

Clone the repository and install dependencies:

```bash
git clone https://github.com/Mr-Saade/governance-voting-system.git
cd governance-voting-system
yarn
```

## Deployment

Deploy the contracts to a local network:

```bash
yarn hardhat node
```

In a separate terminal, run the deployment script:

```bash
yarn hardhat run scripts/deploy.js --network localhost
```

## Setup

To set up roles for the contracts, you need to run the setUp script:

```bash
yarn hardhat run scripts/setUp.js --network localhost
```

This script delegates governance tokens to the deployer, sets roles in the TimeLock contract, and transfers ownership of the Box contract to the TimeLock.

## Propose, Vote, Queue, and Execute

After setting up the roles, you can run the main script to propose, vote, queue, and execute a proposal:

```bash
yarn hardhat run scripts/propose-vote-queue-execute.js --network localhost
```

This script will:
Propose a new action to change the value in the Box contract to 100.
Vote on the proposal.
Queue and execute the proposal.

### Testing

Run tests to ensure the contract's functionality:

```bash
yarn hardhat test
```

### Test Coverage

Generate a test coverage report:

```bash
yarn hardhat coverage
```

## Contact

For any questions or feedback, please reach out to me.
