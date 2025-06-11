require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
        version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // 로컬 개발 네트워크
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Catena 메인넷
    catena: {
      url: "https://cvm.node.creatachain.com",
      chainId: 1000, // 0x3E8
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 2100000,
      gasPrice: 8000000000, // 8 gwei
    },
    // Catena 테스트넷 (있을 경우)
    catena_testnet: {
      url: "https://cvm.node.creatachain.com", // 테스트넷 RPC가 따로 있다면 변경
      chainId: 1001, // 테스트넷 ChainID (실제 값으로 변경 필요)
      accounts: process.env.PRIVATE_KEY_TESTNET ? [process.env.PRIVATE_KEY_TESTNET] : [],
      gas: 2100000,
      gasPrice: 8000000000,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    // Catena 탐색기 설정 (필요시)
    apiKey: {
      catena: "dummy", // Catena 탐색기 API 키 (있을 경우)
    },
    customChains: [
      {
        network: "catena",
        chainId: 1000,
        urls: {
          apiURL: "https://catena.explorer.creatachain.com/api",
          browserURL: "https://catena.explorer.creatachain.com",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};