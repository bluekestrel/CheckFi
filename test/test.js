const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

// note: the describe functions cannot be asynchronous or else hardhat will just exit without
// running any tests!
describe("CheckMinter", function () {
  let CheckMinter;
  let checkContract;
  let bank;

  beforeEach(async () => {
    bank = await ethers.getSigner(0);
    // deploy the smart contract before each test
    CheckMinter = await ethers.getContractFactory("CheckMinter");
    // not specifying a signer means hardhat implicitly picks the first signer, but just wanted
    // to be explicit here
    checkContract = await CheckMinter.connect(bank).deploy();
    await checkContract.deployed();
  });

  describe("write a check", function () {
    let checkWriter;
    let recipient;
    let amount;
    let URI;

    beforeEach(async () => {
      checkWriter = await ethers.getSigner(1);
      recipient = await ethers.getSigner(2);
      amount = 1; // denominated in USD
      URI = 'faketestingURI';
    });

    it("should emit CheckWritten event", async () => {
      const transaction = await checkContract.connect(bank).writeCheck(checkWriter.address, recipient.address, amount, URI);
      const checkReceipt = await transaction.wait();
      const result = checkReceipt.events?.filter((x) => {
        return x.event == "CheckWritten";
      });

      const eventArgs = result[0].args;
      assert.equal(eventArgs[0], checkWriter.address, "Expected first CheckWritten event arg to be the check writer address");
      assert.equal(eventArgs[1], recipient.address, "Expected second CheckWritten event arg to be the recipient address");
      assert.equal(eventArgs[2].toString(), amount.toString(), "Expected third CheckWritten event arg to be the amount");
    });

    it("should revert when an address other than the bank attempts to write a check", async () => {
      let ex;
      try {
        const transaction = await checkContract.connect(recipient).writeCheck(checkWriter.address, recipient.address, amount, URI);
        await transaction.wait();
      } catch(err) {
        ex = err;
      }

      assert(ex, "Expected transaction to revert when writeCheck is called by an address that is not the bank address");
    });
  });

  describe("cash a check", function () {
    let checkWriter;
    let recipient;
    let amount;
    let URI;
    let tokenId;

    beforeEach(async () => {
      // write a check for the tests to use
      checkWriter = await ethers.getSigner(1);
      recipient = await ethers.getSigner(2);
      amount = 1; // denominated in USD
      URI = 'faketestingURI';

      // call the writeCheck function in the smart contract
      const transaction = await checkContract.connect(bank).writeCheck(checkWriter.address, recipient.address, amount, URI);
      // since the function that's being called is not a view or pure function, a transaction will
      // need to occur - wait for the transaction to be added to a block and 'mined' by hardhat
      const checkReceipt = await transaction.wait();
      // check and filter the logs for the CheckWritten event
      const result = checkReceipt.events?.filter((x) => {
        return x.event == "CheckWritten";
      });

      // get the CheckWritten event args
      const eventArgs = result[0].args;
      // get the tokenId which will be needed to cash a check
      tokenId = eventArgs[2];
    });

    it("should emit CheckCashed event", async () => {
      const transaction = await checkContract.connect(bank).cashCheck(tokenId, recipient.address, amount);
      const checkReceipt = await transaction.wait();
      const result = checkReceipt.events?.filter((x) => {
        return x.event == "CheckCashed";
      });

      const eventArgs = result[0].args;
      assert.equal(eventArgs[0], checkWriter.address, "Expected first CheckCashed event arg to be the check writer address");
      assert.equal(eventArgs[1], recipient.address, "Expected second CheckCashed event arg to be the recipient address");
      assert.equal(eventArgs[2].toString(), amount.toString(), "Expected third CheckCashed event arg to be the amount");
    });

    it("should revert when an address other than the bank attempts to cash a check", async () => {
      let ex;
      try {
        const transaction = await checkContract.connect(recipient).cashCheck(tokenId, recipient.address, amount);
        await transaction.wait();
      } catch(err) {
        ex = err;
      }

      assert(ex, "Expected transaction to revert when cashCheck is called by an address that is not the bank address");
    });

    it("should revert when recipient passed in is not the recipient on the check", async () => {
      let ex;
      try {
        const transaction = await checkContract.connect(bank).cashCheck(tokenId, writer.address, amount);
        await transaction.wait();
      } catch(err) {
        ex = err;
      }

      assert(ex, "Expected transaction to revert when cashCheck is called with a recipient address that is not the original recipient");
    });

    it("should revert when the check has already been cashed in", async () => {
      let transaction = await checkContract.connect(bank).cashCheck(tokenId, recipient.address, amount);
      await transaction.wait();

      let ex;
      try {
        transaction = await checkContract.connect(bank).cashCheck(tokenId, recipient.address, amount);
        await transaction.wait();
      } catch (err) {
        ex = err;
      }

      assert(ex, "Expected transaction to revert when cashCheck is called on a check that was previously cashed");
    });

    it("should revert when the amount passed in is not the amount on the check", async () => {
      let ex;
      try {
        const transaction = await checkContract.connect(bank).cashCheck(tokenId, recipient.address, 100);
        await transaction.wait();
      } catch(err) {
        ex = err;
      }

      assert(ex, "Expected transaction to revert when cashCheck is called with the incorrect amount");
    });
  });
});
