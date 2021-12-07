const { assert, expect } = require("chai");
const { ethers } = require("hardhat");

describe("Contracts", async function() {
  let bankSigner, depositorSigner, beneficiarySigner, arbiterSigner;
  let chainAccountContract, escrowContract;
  let balanceBankBefore, balanceBankAfter;
  let balanceDepositorBefore, balanceDepositorAfter; 
  let balanceBeneficiaryBefore, balanceBeneficiaryAfter;
  let balanceContractBefore, balanceContractAfter;

  before(async function() {
    bankSigner = await ethers.getSigner(0);
    depositorSigner = await ethers.getSigner(1);
    beneficiarySigner = await ethers.getSigner(2); 
    arbiterSigner = await ethers.getSigner(3);
    
    const checkFactory = await ethers.getContractFactory("CheckMinter");
    checkContract = await checkFactory.deploy();
    await checkContract.deployed();

    const escrowFactory = await ethers.getContractFactory("EscrowContract", bankSigner); 
    escrowContract = await escrowFactory.deploy(checkContract.address);
    await escrowContract.deployed();

    // console.log ("bank: ", bankSigner.address);
    // console.log ("depositor: ", depositorSigner.address);
    // console.log ("beneficiary: ", beneficiarySigner.address);
    // console.log ("arbiter: ", arbiterSigner.address);
    // console.log("checkContract address:", checkContract.address);
    // console.log("checkContract deployer: ", checkContract.signer.address);
    // console.log("escrowContract deployed to address:", escrowContract.address);
    // console.log("EscrowContract deployer: ", escrowContract.signer.address);
  });

  describe("escrowContract", async function(){
    let rawProposal;
    let escrowProposal;
    let proposals = [];
    const escrowAmounts = [10000, 5000, 2000];

    describe("escrowContract.proposeEscrow", async function(){
      let amountsFromEscrows = [];
      let receipt;

      before(async function(){
        for (let i=0; i < escrowAmounts.length; i++) {
          const tx = await escrowContract.connect(depositorSigner).proposeEscrow(depositorSigner.address, beneficiarySigner.address, arbiterSigner.address, escrowAmounts[i]);
          receipt = await tx.wait();
          rawProposal = await escrowContract.getEscrowProposal(i);
          escrowProposal = parseRawProposal(rawProposal);
          proposals.push(escrowProposal);
          amountsFromEscrows.push(escrowProposal.amount);
        }
      });

      it("should propose three escrows", async function(){
        assert.deepStrictEqual(amountsFromEscrows, escrowAmounts);
      });

      it("should emit a ProposedEscrow event", async function(){
        const event = escrowContract.interface.getEvent("ProposedEscrow");
        const topic = escrowContract.interface.getEventTopic('ProposedEscrow');
        const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
        const deployedEvent = escrowContract.interface.parseLog(log);
        assert(deployedEvent, "Expected the Fallback Called event to be emitted!");
      });
    });

    describe("escrowContract.consentToEscrow", async function(){
      
      it("should confirm that beneficiary has consented to all three proposals", async function(){
        let counter = 0;
        for (let i = 0; i < proposals.length; i++) {
          let consentedParties = [];
          const txConsentBen = await escrowContract.connect(beneficiarySigner).consentToEscrow(i);
          receipt = await txConsentBen.wait();
          consentedParties = await escrowContract.getConsents(i);
          if (consentedParties[1] === beneficiarySigner.address) { counter++; }
        }
        assert.equal(counter, proposals.length);
      });

      it("should emit a ConsentToEscrow event", async function(){
        await expect(escrowContract.connect(arbiterSigner).consentToEscrow(1))
        .to.emit(escrowContract, 'ConsentToEscrow')
        .withArgs(arbiterSigner.address, 1);
      });
    
    });

    describe("escrowContract when all consented", async function(){

      before(async function(){
        const txConsentArb = await escrowContract.connect(arbiterSigner).consentToEscrow(0);
        receipt = await txConsentArb.wait();
      });

      it("should emit an AllConsented event", async function(){
        const event = escrowContract.interface.getEvent("AllConsented");
        const topic = escrowContract.interface.getEventTopic('AllConsented');
        const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
        const deployedEvent = escrowContract.interface.parseLog(log);
        assert(deployedEvent, "Expected the Fallback Called event to be emitted!");
      });

      it("should change the status of the proposal to 'Approved'", async function(){
        const rawProposal = await escrowContract.getEscrowProposal(0);
        const escrowProposal = parseRawProposal(rawProposal);
        assert(escrowProposal.status === "Approved");
      });
    });

    describe("escrowContract when depositing half of escrow amount", async function(){
      let checkId;
      let depositedAmount = escrowAmounts[0] / 2;
      let amountInEscrow;
      before(async function(){
        const tx1 = await checkContract.connect(bankSigner).writeCheck(depositorSigner.address, escrowContract.address, depositedAmount, "");
        const receipt = await tx1.wait();
        const result = receipt.events.filter((x) => {
          return x.event == "Transfer";
        });
        const eventArgs = result[0].args;
        checkId = parseInt(eventArgs[2], 10);
        const tx2 = await checkContract.connect(depositorSigner).approve(escrowContract.address, checkId);
        await tx2.wait();
      });

      it("should emit a deposited in escrow event", async function() {
        const tx3 = await escrowContract.depositInEscrow(depositorSigner.address, checkId, 0);
        const receiptDeposit = await tx3.wait();
        const depositEvent = receiptDeposit.events.filter((element)=>{
          return element.event === "DepositedInEscrow";
        });
        const emittedArgs = depositEvent[0].args;
        assert.equal(parseInt(emittedArgs[0], 10), 0);
        assert.equal(parseInt(emittedArgs[1], 10), checkId);
      });

      it("should have transferred the check to escrow", async function(){
        assert.equal(await checkContract.ownerOf(checkId), escrowContract.address);
      });

      it("should have added the check to the spendable checks array in the escrow struct", async function(){
        const rawProposal = await escrowContract.getEscrowProposal(0);
        const escrowProposal = parseRawProposal(rawProposal);
        const checksInEscrow = escrowProposal.spendableChecksInEscrow;
        amountInEscrow = await escrowContract.amountInEscrow(0);
        assert.equal(checksInEscrow.indexOf(checkId), 0);
      });

      it("should confirm that the amount in escrow is equal to the amount of the deposited check", async function(){
        assert.equal(parseInt(amountInEscrow, 10), depositedAmount);
      });

      it("should reject checks that exceed the escrow amount", async function(){
        const tx1 = await checkContract.connect(bankSigner).writeCheck(depositorSigner.address, escrowContract.address, depositedAmount * 2, "");
        const receipt = await tx1.wait();
        const result = receipt.events.filter((x) => {
          return x.event == "Transfer";
        });
        const eventArgs = result[0].args;
        const check2Id = parseInt(eventArgs[2], 10);
        const tx2 = await checkContract.connect(depositorSigner).approve(escrowContract.address, check2Id);
        await tx2.wait();
        await expect(escrowContract.depositInEscrow(depositorSigner.address, check2Id, 0)).to.be.reverted;
      });
    });

    describe("escrowContract when depositing check that statisfies escrow amount", async function(){
      let check3Id;
      let depositedAmount = escrowAmounts[0] / 2; // second half of escrow amount
      let amountInEscrow;
      let tx3Receipt;
      before(async function(){
        const tx1 = await checkContract.connect(bankSigner).writeCheck(depositorSigner.address, escrowContract.address, depositedAmount, "");
        const receipt = await tx1.wait();
        const result = receipt.events.filter((x) => {
          return x.event == "Transfer";
        });
        const eventArgs = result[0].args;
        check3Id = parseInt(eventArgs[2], 10);
        const tx2 = await checkContract.connect(depositorSigner).approve(escrowContract.address, check3Id);
        await tx2.wait();
        const tx3 = await escrowContract.depositInEscrow(depositorSigner.address, check3Id, 0);
        tx3Receipt = await tx3.wait();
      });

      it("should have added the check to the spendable checks array in the escrow struct", async function(){
        const rawProposal = await escrowContract.getEscrowProposal(0);
        const escrowProposal = parseRawProposal(rawProposal);
        const checksInEscrow = escrowProposal.spendableChecksInEscrow;
        amountInEscrow = await escrowContract.amountInEscrow(0);
        assert.equal(checksInEscrow.indexOf(check3Id), 1);
      });

      it("should confirm that the total amount of the checks equals the escrow amount", async function(){
        assert.equal(parseInt(amountInEscrow, 10), escrowAmounts[0]);
      });

      it("should emit a fully funded event", async function (){
        const fullyFundedEvent = tx3Receipt.events.filter((element)=>{
          return element.event === "FullyFunded";
        });
        const emittedArgs = fullyFundedEvent[0].args;
        assert.equal(parseInt(emittedArgs[0], 10), 0);
        assert.equal(parseInt(emittedArgs[1], 10), escrowAmounts[0]);
      });

      it("should set the status to FullyFunded", async function(){
        const rawProposal = await escrowContract.getEscrowProposal(0);
        const escrowProposal = parseRawProposal(rawProposal);
        assert.equal(escrowProposal.status, "FullyFunded");
      });
    });

    describe("escrowContract.executeEscrow", async function(){
      let txExecute;
      let escrowBefore, escrowAfter;
      let checksInEscrow;
      before(async function(){
        const rawProposal = await escrowContract.getEscrowProposal(0);
        escrowBefore = parseRawProposal(rawProposal);
        checksInEscrow = escrowBefore.spendableChecksInEscrow;
        const tx = await escrowContract.connect(arbiterSigner).executeEscrow(0, escrowAmounts[0]);
        txExecute = await tx.wait();
      });

      it("should endorse all checks and change recipient to beneficiary", async function(){
        let rawCheck, check;
        let recipient;
        for (let i = 0; i < checksInEscrow.length; i++) {
          rawCheck = await checkContract.getCheck(checksInEscrow[i]);
          check = parseRawCheck(rawCheck);
          recipient = check.recipient;
          assert.strictEqual(recipient, beneficiarySigner.address);
        }
      });

      it("should transfer all checks in escrow to beneficiary", async function(){
        const rawProposal = await escrowContract.getEscrowProposal(0);
        escrowAfter = parseRawProposal(rawProposal);
        for (i = 1; i < checksInEscrow.length; i++) {
          assert.equal(await checkContract.ownerOf(checksInEscrow[i]), beneficiarySigner.address);
        }
      });

      it("should emit an Executed event", async function (){
        const executeEvent = txExecute.events.filter((x)=> x.event === "Executed");
        emittedArgs = executeEvent[0].args;
        assert.equal(emittedArgs[0], 0);
        assert.equal(emittedArgs[1], escrowAmounts[0]);
      });

      it("should change the status of the escrow to Executed", async function(){
        assert.equal(escrowAfter.status, "Executed");
      });
    });
  });
});

function parseRawProposal(rawProposal) {
  let readableStatus;
          rawProposal[7] === 0? readableStatus = "Proposed" :
          rawProposal[7] === 1? readableStatus = "Approved" :
          rawProposal[7] === 2? readableStatus = "FullyFunded" :
          rawProposal[7] === 3? readableStatus = "Executed" : readableStatus = "Withdrawn";
  let parsedProposal = {
    proposer: rawProposal[0],
    depositor: rawProposal[1],
    beneficiary: rawProposal[2],
    arbiter: rawProposal[3],
    amount: parseInt(rawProposal[4], 10),
    spendableChecksInEscrow: rawProposal[5].map((e) => parseInt(e, 10)),
    Id: parseInt(rawProposal[6], 10),
    status: readableStatus,
  }
  return parsedProposal;
}

function parseRawCheck(rawCheck) {
  const check = {
    checkWriter : rawCheck[0],
    recipient : rawCheck[1],
    amount : parseInt(rawCheck[2], 10),
    spendable : rawCheck[3]
  }
  return check;
}