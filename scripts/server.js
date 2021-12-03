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

      // create and fund the account
      results = await bank.createAccount(
        accounts[i],
        person.firstName,
        person.lastName,
        person.physicalAddress,
        1000
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

  const [bankAddress, ...accounts] = await ethers.provider.listAccounts();

  const bankSigner = await ethers.getSigner(0);

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
  app.get('/', (req, res) => {
    res.status(200).send('Welcome to the bank');
  });

  // get the balance of the account
  app.get('/balances/:accountNumber', async (req, res) => {
    const { accountNumber } = req.params;
    const { success, reason, balance } = await bank.getBalance(accountNumber);
    if (success === false) {
      res.status(500).send({ reason });
    }
    else {
      res.status(200).send({ balance });
    }
  });

  app.get('/minterContractAddress', async (req, res) => {
    const { success, reason, minterContractAddress } = await bank.getMinterContractAddress();
    if (success === false) {
      res.status(500).send({ reason });
    }
    else {
      res.status(200).send({ minterContractAddress });
    }
  });

  // get all bank account numbers
  app.get('/accounts', async (req, res) => {
    const { success, reason, accountNumbers } = await bank.getAccountNumbers();
    if (success === false) {
      res.status(500).send({ reason });
    }
    else {
      res.status(200).send({ accountNumbers });
    }
  });

  app.get('/accounts/:accountNumber', async (req, res) => {
    const { accountNumber } = req.params;
    const { success, account, reason } = await bank.getAccount(accountNumber);
    if (success === false) {
      res.status(500).send({ reason });
    }
    else {
      res.status(200).send({ account });
    }
  });

  app.get('/names', async (req, res) => {
    const { success, reason, names } = await bank.getNames();
    if (success === false) {
      res.status(500).send({ reason });
    }
    else {
      res.status(200).send({ names });
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
      // imageBytes,
    } = req.body;

    let results;

    // check writer account name - does it exist
    results = await bank.getAccountByName(signature);
    if (results.success === false) {
      res.status(500).send({ reason: results.reason });
      return;
    }

    const sender = results.account;
    console.log('Sender: ', sender);

    // check recipient account name - does it exist
    results = await bank.getAccountByName(recipient);
    if (results.success === false) {
      res.status(500).send({ reason: results.reason });
    }

    const receiver = results.account;
    console.log('Recipient: ', receiver);

    // validate the amount
    console.log('validating the amount of the check');
    const amount = parseInt(numberAmount, 10);
    console.log('amount: ', amount);
    if (isNaN(amount)) {
      res.status(500).send({ reason: 'Unable to parse amount specified' });
      return;
    }

    // attempt withdrawal
    console.log('attempting withdrawal');
    results = await bank.withdraw(sender.accountNumber, amount);
    console.log('results: ', results);
    if (results.success === false) {
      res.status(500).send({ reason: results.reason });
      return;
    }
    console.log('withdrawal complete');

    // mint check
    // checkMinterContract.doThing(); 
    const URI = 'fakeIPFSURI';
    const transaction = await checkMinterContract.connect(bankSigner).writeCheck(
      sender.ethereumAddress,
      receiver.ethereumAddress,
      amount,
      URI
    );
    console.log("Transaction: ", transaction);
    const checkReceipt = await transaction.wait();
    console.log("Check Receipt: ", checkReceipt);
    const result = checkReceipt.events?.filter((x) => {
      return x.event === "CheckWritten";
    });
    console.log('Event result: ', result);

    res.status(200).send({ transactionHash: checkReceipt.transactionHash });

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
