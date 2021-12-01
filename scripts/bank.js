
const level = require('level');
const db = level('./db', { valueEncoding: 'json' });

// check to see if the database exists
// initialize it if it doesn't exist
db.get('nextAccountNumber', function (err, value) {
  if (err) {
    db.put('nextAccountNumber', 1, function (err) {
      if (err) {
        console.log(`Error initializing database next account number`, err);
      }
      console.log('Database inititalized');
    });
  }
  else {
    console.log(`Existing database found, nextAccountNumber is ${value}`);
  }
});

// bank database is of the format:
// {
//   nextAccountNumber: <nextAccountNumber>,
//   accountNumbers: [<accountNumber_1>, <accountNumber_2>, ... ],
//   <accountNumber_1>: {
//     balance: <balance_1>,
//     ethereumAddress: <ethereumAddress_1>,
//     firstName: <firstName_1>,
//     lastName: <lastName_1>,
//     physicalAddress: {
//       streetNumber: <streetNumber_1>,
//       streetName: <streetName_1>,
//       city: <city_1>,
//       state: <state_1>,
//       zipCode: <zipCode_1>,
//     }
//   },
//   <accountNumber_2>: {
//     balance: <balance_2>,
//     ethereumAddress: <ethereumAddress_2>,
//     firstName: <firstName_2>,
//     lastName: <lastName_2>,
//     physicalAddress: {
//       streetNumber: <streetNumber_2>,
//       streetName: <streetName_2>,
//       city: <city_2>,
//       state: <state_2>,
//       zipCode: <zipCode_2>,
//     }
//   },
//   ...
// }

// convenience method for populating the database
// TODO: Validate ethereum address?
async function createAccount(ethereumAddress, firstName, lastName, physicalAddress) {
  // get the next account number for this new account
  try {
    const accountNumber = await db.get('nextAccountNumber');
  }
  catch {
    return { success: false, reason: 'Unable to get next account number' };
  }

  // create the account object to be stored
  const account = {
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

  return { success: true, accountNumber: accountNumber };
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

async function withdraw(accountNumber, amount) {
  // be protective about the amount
  if (amount <= 0) {
    return { success: false, reason: 'Withdrawal amount must be positive' };
  }

  // verify that the account exists
  const { success, account, reason } = await getAccount(accountNumber);

  // no account number, no withdrawal
  if (success === false) {
    return { success, reason };
  }

  // verify that the balance is sufficient for the withdrawal
  if (account.balance < amount) {
    return { success: false, reason: 'Insufficient funds' };
  }

  // calculate the new balance
  account.balance -= amount;

  // store the new account information
  try {
    await db.put(accountNumber, account);
    return { success: true, balance: account.balance };
  }
  catch {
    return { success: false, reason: 'Error withdrawing funds' };
  }
}

async function deposit(accountNumber, amount) {
  // be protective about the amount
  if (amount <= 0) {
    return { success: false, reason: 'Deposit amount must be positive' };
  }

  // verify that the account exists
  const { success, account, reason } = await getAccount(accountNumber);

  // no account number, no deposit
  if (success === false) {
    return { success, reason };
  }

  // calculate the new balance
  account.balance += amount;

  // store the new balance
  try {
    await db.put(accountNumber, account);
    return { success: true, balance: account.balance };
  }
  catch {
    return { success: false, reason: 'Error depositing funds' };
  }
}

module.exports = {
  createAccount,
  getAccountNumbers,
  getAccount,
  getBalance,
  withdraw,
  deposit,
};
