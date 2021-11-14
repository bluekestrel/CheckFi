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
});
