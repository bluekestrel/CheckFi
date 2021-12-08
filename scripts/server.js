const hre = require("hardhat");
const ethers = hre.ethers;
const BigNumber = require('bignumber.js');

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

  app.get('/checks/:accountNumber', async (req, res) => {
    const { accountNumber } = req.params;
    const { success, account, reason } = await bank.getAccount(accountNumber);
    if (success === false) {
      res.status(500).send({ reason });
    }
    else {
      res.status(200).send({ 
        checksWritten: account.checksWritten,
        checksReceived: account.checksReceived,
      });
    }
  });

  app.post('/checks', async (req, res) => {
    const { 
      messageString,
      messageSignature,
    } = req.body;

    // verify the signature of the message string against the address of the account
    const signingAddress = ethers.utils.verifyMessage(messageString, messageSignature);

    const {
      success,
      checksWritten,
      reason
    } = await bank.getChecksFromEthereumAddress(signingAddress);
    if (success === false) {
      res.status(500).send({ reason });
    }
    else {
      res.status(200).send({ checksWritten, checksReceived });
    }
  });

  app.post('/redeem', async (req, res) => {
    const { 
      messageString,
      messageSignature,
    } = req.body;

    // verify the signature of the message string against the address of the account
    const signingAddress = ethers.utils.verifyMessage(messageString, messageSignature);
    const checkNumber = JSON.parse(messageString);
    console.log('redeem requested for checkNumber: ', checkNumber);

    // get check information from the contract
    const check = await checkMinterContract.connect(bankSigner).getCheck(checkNumber);
    const [ checkWriter, recipient, amount, spendable ] = check;

    if (signingAddress !== recipient) {
      res.status(500).send({ reason: 'Cannot cash check that does not belong to you' });
      return;
    }

    if (spendable === false) {
      res.status(500).send({ reason: 'Check has already been redeemed' });
      return;
    }

    // call cashCheck method from contract
    console.log('calling the cashCheck method from the contract');
    const transaction = await checkMinterContract.connect(bankSigner).cashCheck(
      checkNumber,
      recipient,
      amount,
    );
    console.log('getting check receipt');
    const cashCheckReceipt = await transaction.wait();

    // expect only one check cashed event
    const resultCheckCashed = cashCheckReceipt.events?.filter((x) => {
      return x.event === "CheckCashed";
    });
    console.log('CheckCashed event result: ', resultCheckCashed);

    // attempt deposit
    console.log('getting bank account number corresponding to: ', recipient);
    let results = await bank.getAccountByEthereumAddress(recipient);
    console.log('results: ', results);
    if (results.success === false) {
      res.status(500).send({
        reason: results.reason,
      });
    }
    const { account: { accountNumber } } = results;
    console.log('bank account number: ', accountNumber);

    console.log('attempting deposit');
    results = await bank.deposit(accountNumber, parseInt(amount.toString(), 10));
    console.log('results: ', results);
    if (results.success === false) {
      res.status(500).send({ reason: results.reason });
      return;
    }
    console.log('deposit complete');
    res.status(200).send({
      transactionHash: cashCheckReceipt.transactionHash,
      balance: results.balance,
    });
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
    const {
      messageString,
      messageSignature,
    } = req.body;

    console.log('messageString: ', messageString);
    console.log('messageSignature: ', messageSignature);

    const message = JSON.parse(messageString);

    const {
      recipient,
      numberAmount,
      writtenAmount,
      memo,
      signature,
    } = message;

    let results;

    // check writer account name - does it exist
    results = await bank.getAccountByName(signature);
    if (results.success === false) {
      res.status(500).send({ reason: results.reason });
      return;
    }

    const sender = results.account;
    console.log('Sender: ', sender);

    // verify the signature of the message string against the address of the account
    const signingAddress = ethers.utils.verifyMessage(messageString, messageSignature);

    if (sender.ethereumAddress !== signingAddress) {
      res.status(500).send({ reason: 'Address used for signature does not match account' });
      return;
    }

    // check recipient account name - does it exist
    results = await bank.getAccountByName(recipient);
    if (results.success === false) {
      res.status(500).send({ reason: results.reason });
      return;
    }

    const receiver = results.account;
    console.log('Recipient: ', receiver);

    // verify that the sender and recipient are not the same
    if (sender.accountNumber === receiver.accountNumber) {
      res.status(500).send({ reason: 'Sender and recipient may not be the same account' });
      return;
    }

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
    const URI = 'fakeIPFSURI';
    console.log('Performing blockchain transaction with the following arguments:');
    console.log(`\tsender ethereum address: ${sender.ethereumAddress}`);
    console.log(`\treceiver ethereum address: ${receiver.ethereumAddress}`);
    console.log(`\tamount: ${amount}`);
    console.log(`\tURI: ${URI}`);
    const transaction = await checkMinterContract.connect(bankSigner).writeCheck(
      sender.ethereumAddress,
      receiver.ethereumAddress,
      amount,
      URI
    );
    const checkReceipt = await transaction.wait();

    // expect only one check written event
    const resultCheckWritten = checkReceipt.events?.filter((x) => {
      return x.event === "CheckWritten";
    });
    console.log('CheckWritten event result: ', resultCheckWritten);

    // expect only one transfer event
    const resultTransfer = checkReceipt.events?.filter((x) => {
      return x.event === "Transfer";
    });
    console.log('Transfer event result: ', resultTransfer);

    // extract the tokenId (check number)
    const { args: { tokenId: checkNumber } } = resultTransfer[0];

    // need to save the tokenId for the check that was written in the bank backend
    const checkNumberString = checkNumber.toString();
    results = await bank.addCheck(
      sender.accountNumber,
      receiver.accountNumber,
      amount,
      checkNumberString
    );

    if (results.success === false) {
      res.status(500).send({
        reason: results.reason,
        transactionHash: checkReceipt.transactionHash
      });
      return;
    }

    res.status(200).send({ 
      transactionHash: checkReceipt.transactionHash,
      checkNumber: checkNumberString,
    });

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
