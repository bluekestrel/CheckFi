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

async function setUpAccounts(accounts) {

  const { success, reason, accountNumbers } = await bank.getAccountNumbers();

  if ((success === true) && (accountNumbers.length === 0)) {
    // create an account for each signer
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

  const [bankSigner, ...accounts] = await ethers.provider.listAccounts();

  // if there is no database set up yet, populate the database with several values
  await bank.initialize();
  await setUpAccounts(accounts);

  // check for the contract address
  let results;
  let minterContractAddress;
  results = await bank.getMinterContractAddress();
  if (results.success === false) {
    minterContractAddress = await deployContract();
    console.log("Contract deployed to:", minterContractAddress);
    results = await bank.initializeMinterContractAddress(minterContractAddress);
    if (results.success === false) {
      throw new Error('Unable to set minter contract address in database');
    }
  }
  else {
    minterContractAddress = results.minterContractAddress;
    console.log("Contract found deployed to:", minterContractAddress);
  }

  const { abi } = await hre.artifacts.readArtifact("contracts/CheckMinter.sol:CheckMinter");
  const checkMinterContract = new ethers.Contract(minterContractAddress, abi, ethers.provider);

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

  app.get('/minterContractAddress', async (req, res) => {
    const { success, reason, minterContractAddress } = await bank.getMinterContractAddress();
    if (success === false) {
      res.send({ reason });
    }
    else {
      res.send({ minterContractAddress });
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

  app.get('/names', async (req, res) => {
    const { success, reason, names } = await bank.getNames();
    if (success === false) {
      res.send({ reason });
    }
    else {
      res.send({ names });
    }
  });

  // writing a check
  //   - request comes from React frontend
  //   - account name is checked
  //   - recipient name is NOT checked
  //   - balance is checked
  //   - amount is withdrawn from account balance
  //   - check is minted on blockchain
  //   - transaction hash is returned
  app.post('/write', async (req, res) => {
    console.log('request body:');
    console.log(req.body);

    const {
      recipient,
      numberAmount,
      writtenAmount,
      memo,
      signature,
      senderAddress,
      imageBytes,
    } = req.body;

    let results;

    // check writer account name - does it exist
    results = await bank.getAccountByName(signature);
    if (results.success === false) {
      res.send({ reason: results.reason });
      return;
    }

    const sender = results.account;
    console.log('Sender: ', sender);

    /*
    // check recipient account name - does it exist
    results = await bank.getAccountByName(recipient);
    if (results.success === false) {
      res.send({ reason: results.reason });
    }

    const recipient = results.account;
    console.log('Recipient: ', recipient);
    */

    // validate the amount
    const amount = parseInt(numberAmount, 10);
    if (isNaN(amount)) {
      res.send({ reason: 'Unable to parse amount specified' });
      return;
    }

    // attempt withdrawal
    results = await bank.withdraw(sender.accountNumber, amount);
    if (results.success === false) {
      res.send({ reason: results.reason });
      return;
    }

    // mint check
    // checkMinterContract.doThing(); 
    const transaction = await checkMinterContract.connect(bankSigner).writeCheck(
      sender.ethereumAddress,
      recipient.ethereumAddress,
      amount,
      URI
    );
    console.log(transaction);
    const checkReceipt = await transaction.wait();
    console.log(checkReceipt);
    const result = checkReceipt.event?.filter((x) => {
      return x.event === "CheckWritten";
    });
    console.log(result);

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
