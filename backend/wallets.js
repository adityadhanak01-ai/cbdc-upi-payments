const CURRENCIES = ['GBP','USD','EUR','SGD','AED','JPY','CAD','AUD'];

const wallets = {
  sender: {
    id: 'wallet-sender-001',
    address: '0x4f2a8c1e9b3d7f22',
    owner: 'rahul@oksbi',
    org: 'SBI',
    balances: {
      eINR: 500000,
      eGBP: 0, eUSD: 0, eEUR: 0,
      eSGD: 0, eAED: 0, eJPY: 0,
      eCAD: 0, eAUD: 0
    }
  },
  receiver: {
    id: 'wallet-receiver-001',
    address: '0x9b5e2d4f7a1c3e88',
    owner: 'alice@gpay',
    org: 'HSBC',
    balances: {
      eINR: 0,
      eGBP: 5000, eUSD: 3000, eEUR: 2000,
      eSGD: 0, eAED: 0, eJPY: 0,
      eCAD: 0, eAUD: 0
    }
  }
};

function debit(walletKey, coin, amount) {
  if (wallets[walletKey] && wallets[walletKey].balances[coin] !== undefined) {
    wallets[walletKey].balances[coin] = Math.max(0, wallets[walletKey].balances[coin] - amount);
  }
}

function credit(walletKey, coin, amount) {
  if (wallets[walletKey]) {
    if (wallets[walletKey].balances[coin] === undefined) wallets[walletKey].balances[coin] = 0;
    wallets[walletKey].balances[coin] += parseFloat(amount);
  }
}

function processSwap(fromCoin, toCoin, amount, convertedAmount) {
  debit('sender', fromCoin, amount);
  credit('receiver', toCoin, convertedAmount);
  return {
    senderWallet: wallets.sender,
    receiverWallet: wallets.receiver
  };
}

function getWallets() {
  return wallets;
}

module.exports = { getWallets, processSwap, debit, credit };