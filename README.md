# CheckFi Digital Check Smart Contract

Compiling the code:
```shell
npx hardhat compile
```

Testing the code:
```shell
npx hardhat test
```

Running a local blockchain with the bank REST API:
```shell
ganache-cli
npx hardhat run --network localhost scripts/server.js
```

Bank REST API
Address: http://localhost:3042
Routes:
  - /accounts - display all account numbers
  - /accounts/<accountNumber> - display information for given account number
  - /balances/<accountNumber> - display balance for given account number

