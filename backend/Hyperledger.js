const express = require('express');
const app = express();
const PORT = 3001;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const CURRENCIES = ['GBP','USD','EUR','SGD','AED','JPY','CAD','AUD'];

const coinSupply = { eINR: 1000000 };
CURRENCIES.forEach(c => coinSupply[`e${c}`] = 10000);

const wallets = {
  'org1.rbi.cbdc': { address: '0x4f2a8c1e9b3d7f', eINR: 500000 },
  'org2.sbi.cbdc':  { address: '0x7e1c5a9f2b4d8a', eINR: 250000 },
  'org3.hdfc.cbdc': { address: '0x2d8f3c7e1a5b9c', eINR: 150000 },
  'org4.hsbc.cbdc': { address: '0x9b5e2d4f7a1c3e', eGBP: 5000, eUSD: 3000, eEUR: 2000 },
  'org5.dbs.cbdc':  { address: '0x1a7f4e8d2c6b0f', eSGD: 8000 }
};

let blocks = [];
let transactions = [];
let blockCount = 0;
let totalVolume = 0;
let swapCount = 0;

const nodes = [
  { id: 1, name: 'Validator 1', org: 'RBI', address: '0x4f2a8c1e9b3d7f', votes: [] },
  { id: 2, name: 'Validator 2', org: 'SBI', address: '0x7e1c5a9f2b4d8a', votes: [] },
  { id: 3, name: 'Validator 3', org: 'HDFC', address: '0x2d8f3c7e1a5b9c', votes: [] },
  { id: 4, name: 'Validator 4', org: 'HSBC', address: '0x9b5e2d4f7a1c3e', votes: [] }
];

function generateHash() {
  return '0x' + Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join('');
}

function generateAddress() {
  return '0x' + Array.from({length: 12}, () => Math.floor(Math.random()*16).toString(16)).join('');
}

function generatePBFT(txnRef) {
  const baseTime = Date.now();
  return nodes.map((n, i) => ({
    nodeId: n.id,
    nodeName: n.name,
    org: n.org,
    vote: 'APPROVE',
    signature: generateHash().slice(0,18),
    timestamp: baseTime + (i * 180),
    latency: 120 + (i * 60) + Math.floor(Math.random() * 80)
  }));
}

function executeAtomicSwap(fromCoin, toCoin, amount, convertedAmount) {
  if (coinSupply[fromCoin] !== undefined) coinSupply[fromCoin] -= amount;
  if (coinSupply[toCoin] !== undefined) {
    coinSupply[toCoin] += parseFloat(convertedAmount);
  } else {
    coinSupply[toCoin] = parseFloat(convertedAmount);
  }
  swapCount++;
  return {
    swapId: 'SWAP-' + Date.now().toString().slice(-8),
    fromCoin, toCoin,
    burnedAmount: amount,
    mintedAmount: parseFloat(convertedAmount),
    status: 'EXECUTED',
    mechanism: 'ATOMIC',
    counterpartyRisk: 'ZERO'
  };
}

function createBlock(txnData) {
  blockCount++;
  const prevHash = blocks.length > 0 ? blocks[0].hash : '0x0000000000000000';
  const consensus = generatePBFT(txnData.ref);
  const swap = executeAtomicSwap(
    txnData.fromCoin, txnData.toCoin,
    txnData.amountINR, txnData.convertedAmount
  );

  const block = {
    blockNumber: blockCount,
    hash: generateHash(),
    prevHash,
    merkleRoot: generateHash(),
    timestamp: new Date().toISOString(),
    timeFormatted: new Date().toLocaleTimeString(),
    txnRef: txnData.ref,
    sender: txnData.sender,
    receiver: txnData.receiver,
    senderAddress: generateAddress(),
    receiverAddress: generateAddress(),
    amountINR: txnData.amountINR,
    convertedAmount: txnData.convertedAmount,
    fromCurrency: txnData.fromCurrency,
    toCurrency: txnData.toCurrency,
    country: txnData.country,
    route: txnData.route,
    consensus,
    swap,
    confirmations: 4,
    size: Math.floor(Math.random() * 500) + 800,
    gasUsed: Math.floor(Math.random() * 2000) + 3000,
    status: 'CONFIRMED'
  };

  blocks.unshift(block);
  if (blocks.length > 50) blocks.pop();

  transactions.unshift({
    ref: txnData.ref,
    sender: txnData.sender,
    receiver: txnData.receiver,
    amountINR: txnData.amountINR,
    convertedAmount: txnData.convertedAmount,
    fromCurrency: txnData.fromCurrency,
    toCurrency: txnData.toCurrency,
    country: txnData.country,
    route: txnData.route,
    blockNumber: blockCount,
    hash: block.hash,
    timestamp: block.timeFormatted,
    status: 'CONFIRMED'
  });

  totalVolume += Number(txnData.amountINR);
  return block;
}

app.post('/settle', (req, res) => {
  const block = createBlock(req.body);
  res.json({ success: true, block, swap: block.swap });
});

app.get('/chain', (req, res) => {
  res.json({ blocks, blockCount, totalVolume, swapCount });
});

app.get('/supply', (req, res) => {
  res.json({ coinSupply, wallets });
});

app.get('/nodes', (req, res) => {
  res.json({ nodes, blockCount });
});

app.get('/transactions', (req, res) => {
  res.json({ transactions, count: transactions.length });
});

app.get('/stats', (req, res) => {
  res.json({
    blockCount, totalVolume, swapCount,
    avgBlockTime: '4.8s',
    nodeCount: 4,
    consensusMechanism: 'PBFT',
    networkStatus: 'ACTIVE',
    coinSupply
  });
});

app.listen(PORT, () => {
  console.log('Hyperledger mock node running on http://localhost:3001');
});