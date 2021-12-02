const hre = require("hardhat");
const ethers = hre.ethers;

const bank = require('./bank');
const people = require('./people');

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

async function setUpAccounts() {

  const { success, reason, accountNumbers } = await bank.getAccountNumbers();

  if ((success === true) && (accountNumbers.length === 0)) {
    // create an account for each signer
    const accounts = await ethers.provider.listAccounts();
    let person;
    let results;
    for (let i=0; i<accounts.length; i++) {
      person = people.generatePerson();

      // create the account
      results = await bank.createAccount(
        accounts[i],
        person.firstName,
        person.lastName,
        person.physicalAddress
      );

      if (results.success === true) {
        console.log('Created account: ', results.accountNumber);
        console.log('-------------------');
        console.log('First Name: ', person.firstName);
        console.log('Last Name: ', person.lastName);
        console.log('Physical Address: ', person.physicalAddress);
        console.log('Ethereum Address: ', accounts[i], '\n');
      }
      else {
        console.log('Failed to create account!');
        console.log(results.reason);
      }

    }
  }
}

async function main() {

  const contractAddress = await deployContract();
  console.log("Contract deployed to:", contractAddress);

  // if there is no database set up yet, populate the database with several values
  await bank.initialize(contractAddress);
  await setUpAccounts();

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
    const { accountNumber } = req.params;
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
