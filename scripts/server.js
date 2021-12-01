const hre = require("hardhat");
const ethers = hre.ethers;

const bank = require('./bank');

const express = require('express');
const app = express();
const cors = require('cors');
const port = 3042;

// localhost can have cross origin errors
// depending on the browser you use!
app.use(cors());
app.use(express.json());

async function deployContract() {
  // Deploy the contract
  const checkMinter = await hre.ethers.getContractFactory("CheckMinter");
  const contract = await checkMinter.deploy();

  await contract.deployed();

  return contract.address;
}

async function main() {

  const contractAddress = await deployContract();
  console.log("Contract deployed to:", contractAddress);

  // set up the routes
  // get the balance of the account
  app.get('/balances/:accountNumber', async (req, res) => {
    const { accountNumber } = req.params;
    const { success, reason, balance } = await bank.getBalance(accountNumber);
    if (success === false) {
      res.send({ reason });
    }
    else {
      res.send({ balance });
    }
  });

  // get all bank account numbers
  app.get('/accounts', async (req, res) => {
    const { success, reason, accountNumbers } = await bank.getAccountNumbers();
    if (success === false) {
      res.send({ reason });
    }
    else {
      res.send({ accountNumbers });
    }
  });

  app.get('/accounts/:accountNumber', async (req, res) => {
    const { success, account, reason } = await bank.getAccount(accountNumber);
    if (success === false) {
      res.send({ reason });
    }
    else {
      res.send({ account });
    }
  });

  // expects JSON in the format:
  // {
  //   recipient: <string_recipient>,
  //   numberAmount: <integer_numberAmount>,
  //   writtenAmount: <string_writtenAmount>,
  //   memo: <string_memo>,
  //   signature: <string_signature>,
  //   senderAddress: <hexstring_senderAddress>,
  //   imageBytes: <bytestring>,
  // }
  //
  // need to look up the recipient address and sender address
  // app.post('/write', (req, res) => {
  //   const {
  //     recipient,
  //     numberAmount,
  //     writtenAmount,
  //     memo,
  //     signature,
  //     senderAddress,
  //     imageBytes,
  //   } = req.body;

  //   res.send({ balance: balances[sender]});
  // });

  // start listening on the port
  app.listen(port, () => {
    console.log(`Bank REST API listening on port ${port}`);
  });

}


main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
