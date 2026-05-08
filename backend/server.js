const express = require('express');
const cors = require('cors');
const http = require('http');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const upiCountries = ['Singapore','UAE','Bhutan','Nepal','Malaysia'];
const toINR = { INR:1,GBP:104.6,USD:83.1,EUR:90.2,SGD:61.7,AED:22.6,JPY:0.545,CAD:61.0,AUD:54.0 };

let transactions = [];
let totalVolume = 0;
let blockCount = 0;

function generateHash() {
  return '0x'+Array.from({length:12},()=>Math.floor(Math.random()*16).toString(16)).join('');
}

function callHyperledger(payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const options = { hostname:'localhost', port:3001, path:'/settle', method:'POST', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)} };
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

app.post('/pay', async (req, res) => {
  const { sender, receiver, amount, fromCurrency, currency, country, convertedAmount } = req.body;
  const route = upiCountries.includes(country) ? 'UPI' : 'CBDC-BLOCKCHAIN';
  const ref = 'TXN-' + Date.now().toString().slice(-6);
  const fromCoin = `e${fromCurrency || 'INR'}`;
  const toCoin = `e${currency}`;

  const hlPayload = { ref, sender, receiver, amountINR: Math.round(amount), convertedAmount, fromCurrency: fromCurrency||'INR', toCurrency: currency, fromCoin, toCoin, country, route };
  const hlResponse = await callHyperledger(hlPayload);

  blockCount++;
  const txn = { ref, sender, receiver, amountINR: Math.round(amount), converted: convertedAmount, currency, country, route, status:'Settled', timestamp: new Date().toLocaleTimeString(), blockNumber: hlResponse ? hlResponse.block.blockNumber : blockCount };

  transactions.unshift(txn);
  totalVolume += Number(amount);

  res.json({ success:true, ref, converted:convertedAmount, currency, route, block: hlResponse ? hlResponse.block : null });
});

app.get('/dashboard', (req, res) => {
  res.json({ transactions, totalVolume, count: transactions.length });
});

app.get('/network', (req, res) => {
  const blocks = transactions.map(t => ({ blockNumber: t.blockNumber, hash: generateHash(), txnRef: t.ref, sender: t.sender, receiver: t.receiver, country: t.country, timestamp: t.timestamp }));
  res.json({ blocks, blockCount: transactions.length, nodeCount:4 });
});

app.listen(PORT, () => console.log('CBDC-UPI server running on http://localhost:3000'));