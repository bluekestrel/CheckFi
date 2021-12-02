
const level = require('level');
const db = level('./db', { valueEncoding: 'json' });

let CREATE_ACCOUNT_LOCK = false;
const BALANCE_LOCK = [];

// bank database is of the format:
// {
//   minterContractAddress: <ethereumAddress>,
//   nextAccountNumber: <nextAccountNumber>,
//   accountNumbers: [<accountNumber_1>, <accountNumber_2>, ... ],
//   mintedCheckTotal: 0,
//   <accountNumber_1>: {
//     balance: <balance_1_integer>,
//     ethereumAddress: <ethereumAddress_1_string>,
//     firstName: <firstName_1_string>,
//     lastName: <lastName_1_string>,
//     physicalAddress: {
//       streetNumber: <streetNumber_1_string>,
//       streetName: <streetName_1_string>,
//       city: <city_1_string>,
//       state: <state_1_string>,
//       zipCode: <zipCode_1_string>,
//     }
//   },
//   <accountNumber_2>: {
//     balance: <balance_2_integer>,
//     ethereumAddress: <ethereumAddress_2_string>,
//     firstName: <firstName_2_string>,
//     lastName: <lastName_2_string>,
//     physicalAddress: {
//       streetNumber: <streetNumber_2_string>,
//       streetName: <streetName_2_string>,
//       city: <city_2_string>,
//       state: <state_2_string>,
//       zipCode: <zipCode_2_string>,
//     }
//   },
//   ...
// }

async function initializeKeyValuePair(key, initValue) {
  let value;
  try {
    value = await db.get(key);
  }
  catch {
    try {
      await db.put(key, initValue);
    }
    catch {
      return { success: false, reason: `Unable to initialize ${key} to ${initValue}`};
    }
  }
  return { success: true };
}

async function getMinterContractAddress() {
  try {
    const minterContractAddress = await db.get('minterContractAddress');
    return { success: true, minterContractAddress };
  }
  catch {
    return { success: false, reason: 'Unable to get minter contract address' };
  }
}

async function initializeMinterContractAddress(address) {
  const results = await initializeKeyValuePair('minterContractAddress', address);
  return results;
}

async function initialize() {
  let results;
  results = await initializeKeyValuePair('nextAccountNumber', 1);
  if (results.success === false) {
    return results;
  }
  results = await initializeKeyValuePair('accountNumbers', []);
  if (results.success === false) {
    return results;
  }
  results = await initializeKeyValuePair('mintedCheckTotal', 0);
  return results;
}

// convenience method for populating the database
// must lock to prevent multiple accounts from receiving the same account number
async function createAccount(ethereumAddress, firstName, lastName, physicalAddress) {

  // ensure that only one account is created at a time
  // if the lock is not set, acquire it
  if ((CREATE_ACCOUNT_LOCK === false) && (CREATE_ACCOUNT_LOCK = true)) {
  }
  else {
    // otherwise, return
    return { success: false, reason: 'Create account locked for account creation' }
  }

  // get the next account number for this new account
  let accountNumber;
  try {
    accountNumber = await db.get('nextAccountNumber');
  }
  catch {
    return { success: false, reason: 'Unable to get next account number' };
  }

  // create the account object to be stored
  const account = {
    accountNumber,
    balance: 0,
    ethereumAddress,
    firstName,
    lastName,
    physicalAddress
  }

  // store the new account object
  try {
    await db.put(accountNumber, account);
  }
  catch {
    return { success: false, reason: 'Unable to create account' };
  }

  // update the next account number
  try {
    await db.put('nextAccountNumber', accountNumber + 1);
  }
  catch {
    return { success: false, reason: 'Unable to update next account number' };
  }

  // get the current Array of account numbers
  const { success, accountNumbers, reason } = await getAccountNumbers();
  if (success === false) {
    return { success, reason };
  }
  accountNumbers.push(accountNumber);

  // add the account number to the Array of account numbers
  try {
    await db.put('accountNumbers', accountNumbers);
  }
  catch {
    return { success: false, reason: 'Unable to add new account to Array of account numbers' };
  }

  // unlock account creation
  CREATE_ACCOUNT_LOCK = false;
  return { success: true, accountNumber: accountNumber };
}

async function getAllAccounts() {
  try {
    const { success, accountNumbers, reason } = await getAccountNumbers();
    if (success === true) {
      const promises = accountNumbers.map((accountNumber) => {
        return getAccount(accountNumber)
      });
      const results = await Promise.all(promises);
      const accounts = results.map((entry) => entry.account);
      return { success, accounts };
    }
    return { success, reason };
  }
  catch {
    return { success: false, reason: 'Unable to get all accounts' };
  }
}

async function getNames() {
  try {
    const { success, accounts, reason } = await getAllAccounts();
    if (success === true) {
      const names = accounts.map((account) => {
        return account.firstName + ' ' + account.lastName
      });
      return { success, names };
    }
    return { success, reason };
  }
  catch {
    return { success: false, reason: 'Unable to get all names on accounts' };
  }
}

async function getAccountNumbers() {
  try {
    return { success: true, accountNumbers: await db.get('accountNumbers') };
  }
  catch {
    return { success: false, reason: 'Unable to get Array of account numbers' };
  }
}

async function getAccount(accountNumber) {
  try {
    return { success: true, account: await db.get(accountNumber) };
  }
  catch {
    return { success: false, reason: 'Account number not found' };
  }
}

async function getBalance(accountNumber) {
  const { success, account, reason } = await getAccount(accountNumber);

  if (success === false) {
    return { success, reason };
  }

  return { success, balance: account.balance };
}

async function getAccountByName(name) {
  const { success, accounts, reason } = await getAllAccounts();
  if (success === false) {
    return { success, reason };
  }
  const account = accounts.filter((account) => account.firstName + ' ' + account.lastName === name);
  if (account.length !== 1) {
    return { success: false, reason: `Did not find one match for account name provided: ${name}` };
  }
  return { success: true, account: account[0] };
};

function getBalanceLock(num) {
  if (BALANCE_LOCK.indexOf(num) === -1 && BALANCE_LOCK.push(num)) {
    return true;
  }
  return false;
}

function releaseBalanceLock(num) {
  if (BALANCE_LOCK.indexOf(num) !== -1 && BALANCE_LOCK.splice(BALANCE_LOCK.indexOf(num))) {
    return true;
  }
  return false;
}

async function withdraw(accountNumber, amount) {

  // verify that the account exists
  const { success, account, reason } = await getAccount(accountNumber);

  // no account number, no withdrawal
  if (success === false) {
    return { success, reason };
  }

  // is there a lock on this account already?
  // if not, set the lock and proceed with the transfer
  if (getBalanceLock(accountNumber) === false) {
    return { success: false, reason: 'Account balance changes currently locked' };
  }

  // be protective about the amount
  if (amount <= 0) {
    releaseBalanceLock(accountNumber);
    return { success: false, reason: 'Withdrawal amount must be positive' };
  }

  // verify that the balance is sufficient for the withdrawal
  if (account.balance < amount) {
    releaseBalanceLock(accountNumber);
    return { success: false, reason: 'Insufficient funds' };
  }

  // calculate the new balance
  account.balance -= amount;

  // store the new account information
  try {
    await db.put(accountNumber, account);
    releaseBalanceLock(accountNumber);
    return { success: true, balance: account.balance };
  }
  catch {
    releaseBalanceLock(accountNumber);
    return { success: false, reason: 'Error withdrawing funds' };
  }
}

async function deposit(accountNumber, amount) {

  // verify that the account exists
  const { success, account, reason } = await getAccount(accountNumber);

  // no account number, no deposit
  if (success === false) {
    return { success, reason };
  }

  // is there a lock on this account already?
  // if not, set the lock and proceed with the transfer
  if (getBalanceLock(accountNumber) === false) {
    return { success: false, reason: 'Account balance changes currently locked' };
  }

  // be protective about the amount
  if (amount <= 0) {
    releaseBalanceLock(accountNumber);
    return { success: false, reason: 'Deposit amount must be positive' };
  }

  // calculate the new balance
  account.balance += amount;

  // store the new balance
  try {
    await db.put(accountNumber, account);
    releaseBalanceLock(accountNumber);
    return { success: true, balance: account.balance };
  }
  catch {
    releaseBalanceLock(accountNumber);
    return { success: false, reason: 'Error depositing funds' };
  }
}

module.exports = {
  getMinterContractAddress,
  initialize,
  initializeMinterContractAddress,
  createAccount,
  getAllAccounts,
  getAccountByName,
  getNames,
  getAccountNumbers,
  getAccount,
  getBalance,
  withdraw,
  deposit,
};
