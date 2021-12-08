# CheckFi Digital Check Smart Contract

Compiling the code:
```shell
npx hardhat compile
```

Testing the code:
```shell
npx hardhat test
```

Running a local blockchain:
```shell
npx hardhat node
```

In another terminal, start the bank REST API:
```shell
npx hardhat run --network localhost scripts/server.js
```

In yet another terminal, start the React Development server:
```shell
cd checkfi
npm start
```

The backend code automatically creates bank accounts for all of the default Hardhat accounts,
with the exception of the first Hardhat account, which is the Bank's Ethereum private and public keys.

The React App borrows from the `react-credit-cards` npm package for rendering the check as values are
entered on the form.

React App
Address: http://localhost:3000

Bank REST API
Address: http://localhost:3042
Routes:
  - /accounts - display all account numbers
  - /accounts/<accountNumber> - display information for given account number
  - /balances/<accountNumber> - display balance for given account number
  - /names - displays all names on accounts
  - /checks/<accountNumber> - displays all checks written and received for a given account
