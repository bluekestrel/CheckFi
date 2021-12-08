//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma abicoder v2;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./CheckMinter.sol";

// This is a simple escrow with one depositor, one beneficiary and one arbiter.
    // The contract can be expanded to deal with an undetermined number of parties.
    // Query: should there be one deployment per escrow or one deployment for multiple escrows
    // This contract assumes the latter.

contract EscrowContract is ERC721Holder {

    CheckMinter checkMinter;
    address public owner;
    uint public constant numberOfParties = 3; //one depositor, one beneficiary, one arbiter

    enum EscrowStatus {
        Proposed,
        Approved,
        FullyFunded,
        Executed,
        Withdrawn
    }

    struct Escrow {
        address proposer;
        address depositor;
        address beneficiary;
        address arbiter;
        uint escrowAmount;
        uint[] spendableChecksInEscrow;
        uint escrowId;
        EscrowStatus status;
    }

    Escrow[] public escrowArray;
    
    mapping (address=> mapping(uint => bool)) public consents;

    mapping (uint=>address[numberOfParties]) public parties;

	constructor(address addressCheckMinter) {
        checkMinter = CheckMinter(addressCheckMinter);
        owner = msg.sender;
	}

    event ProposedEscrow(address indexed proposer, uint indexed escrowId);
    function proposeEscrow(address _depositor, address _beneficiary, address _arbiter, uint _escrowAmount) public {
        uint escrowId = escrowArray.length;
        uint[] memory emptyArray = new uint[](0);
        Escrow memory escrow = Escrow(msg.sender, _depositor, _beneficiary, _arbiter, _escrowAmount, emptyArray, escrowId, EscrowStatus.Proposed);
        escrowArray.push(escrow);
        parties[escrowId] = [_depositor, _beneficiary, _arbiter];
        emit ProposedEscrow(msg.sender, escrowId);
        consentToEscrow(escrowId);
    }

    function getEscrowProposal(uint escrowId) public view returns (Escrow memory) {
        return escrowArray[escrowId];
    }

    function getParties(uint escrowId) public view returns(address[numberOfParties] memory) {
        return (parties[escrowId]);
    }

    function isParty(uint escrowId) public view returns(bool) {
        for (uint i = 0; i < parties[escrowId].length; i++) {
            if (parties[escrowId][i] == msg.sender) {
                return true;
            }
        }
        return false;           
    }

    event ConsentToEscrow(address indexed sender, uint indexed escrowId);
    event AllConsented(string indexed message, uint indexed escrowId);
    function consentToEscrow(uint escrowId) public {
        require(escrowArray[escrowId].status == EscrowStatus.Proposed, "Escrow not or no longer up for consent");
        require(isParty(escrowId), "Only a party can consent to a proposed escrow");
        require(!consents[msg.sender][escrowId], "Consent already given");
        consents[msg.sender][escrowId] = true;
        if (allConsented(escrowId) == true) {
            escrowArray[escrowId].status = EscrowStatus.Approved;
            emit AllConsented("All have consented", escrowId);
            // checkMinter.approve(escrowArray[escrowId].arbiter, escrowArray[escrowId].escrowAmount);
        }
        emit ConsentToEscrow(msg.sender, escrowId);
    }

    function getConsents(uint escrowId) public view returns(address[3] memory) {
        address[3] memory consentedParties;
        uint index;
        for (uint i = 0; i < parties[escrowId].length; i++) {
            if (consents[parties[escrowId][i]][escrowId] == true) {
                consentedParties[index] = parties[escrowId][i];
                index++;
            }
        }
        return consentedParties;
    }

    function allConsented(uint escrowId) public view returns(bool) {
        for (uint i = 0; i < parties[escrowId].length; i++) {
            if (consents[parties[escrowId][i]][escrowId] == false) { 
                return false; 
            }
        }
        return true;
    }

    function amountInEscrow(uint escrowId) public view returns (uint) {
        uint[] memory checksInEscrow = new uint[](escrowArray[escrowId].spendableChecksInEscrow.length);
        checksInEscrow = escrowArray[escrowId].spendableChecksInEscrow;
        uint totalAmount;
        for (uint i = 0; i < checksInEscrow.length; i++) {
            if (checkMinter.getCheck(checksInEscrow[i]).spendable == true) {
                totalAmount += checkMinter.getCheck(checksInEscrow[i]).amount;
            }
        }
        return totalAmount;
    }

    function transferChecksFromEscrow(uint escrowId, address _recipient) internal returns (bool) {
        uint[] memory checksInEscrow = new uint[](escrowArray[escrowId].spendableChecksInEscrow.length);
        checksInEscrow = escrowArray[escrowId].spendableChecksInEscrow;
        for (uint i = 0; i < checksInEscrow.length; i++) {
            checkMinter.endorseNewRecipient(checksInEscrow[i], _recipient);
            checkMinter.safeTransferFrom(address(this), _recipient, checksInEscrow[i]);
            escrowArray[escrowId].spendableChecksInEscrow.pop();
        }
        return true;
    }

    event DepositedInEscrow(uint indexed escrowId, uint indexed checkId);
    event FullyFunded(uint indexed escrowId, uint indexed escrowAmount);
    function depositInEscrow(address depositor, uint checkId, uint escrowId) public {
        uint amount = checkMinter.getCheck(checkId).amount;
        require(escrowArray[escrowId].arbiter != address(0) && escrowArray[escrowId].beneficiary != address(0), "no address for beneficiary or arbiter");
        require(escrowArray[escrowId].status == EscrowStatus.Approved && 
        escrowArray[escrowId].status != EscrowStatus.FullyFunded, "Escrow not approved or already fully funded");
        require((escrowArray[escrowId].escrowAmount >= amountInEscrow(escrowId) + amount), "Deposit exceeds escrow amount by more than 5%");
        checkMinter.safeTransferFrom(depositor, address(this), checkId);
        escrowArray[escrowId].spendableChecksInEscrow.push(checkId);
        emit DepositedInEscrow(escrowId, checkId);
        if (amountInEscrow(escrowId) == escrowArray[escrowId].escrowAmount) {
            escrowArray[escrowId].status = EscrowStatus.FullyFunded;
            emit FullyFunded(escrowId, escrowArray[escrowId].escrowAmount);
        }
    }

	event Executed(uint indexed escrowId, uint indexed amountApproved);
	function executeEscrow(uint escrowId, uint approvedAmount) external {
        require(escrowArray[escrowId].arbiter != address(0) && escrowArray[escrowId].beneficiary != address(0) && escrowArray[escrowId].depositor != address(0), "address lacking");
        require(allConsented(escrowId));
        require(escrowArray[escrowId].status == EscrowStatus.FullyFunded, "Escrow must be fully funded");
		require(msg.sender == escrowArray[escrowId].arbiter, "Only arbiter can approve");
        require(approvedAmount <= escrowArray[escrowId].escrowAmount, "Approved amount greater than escrow amount");
        require(approvedAmount <= amountInEscrow(escrowId), "Insufficient funds deposited");
        if (approvedAmount == amountInEscrow(escrowId)) {
            bool success = transferChecksFromEscrow(escrowId, escrowArray[escrowId].beneficiary);
            require(success, "transfer failed");
        }
        escrowArray[escrowId].status = EscrowStatus.Executed;
        emit Executed(escrowId, approvedAmount);
	}

    event ConsentWithdrawn(address indexed sender, uint escrowId);
    function withdrawConsent(uint escrowId) public {
        require(escrowArray[escrowId].status == EscrowStatus.Proposed, "Consent cannot be withdrawn after all have approved");
        require(isParty(escrowId), "Only a party can withdraw consent");
        require(consents[msg.sender][escrowId], "No earlier consent to be withdrawn");
        consents[msg.sender][escrowId] = false;
        emit ConsentWithdrawn(msg.sender, escrowId);
    }

    event ProposalWithdrawn(address indexed sender, uint indexed escrowId);
    function withdrawProposal(uint escrowId) public {
        require(msg.sender == escrowArray[escrowId].proposer, "Only proposer can withdraw proposal");
        require(escrowArray[escrowId].status == EscrowStatus.Proposed, "Proposal cannot be cancelled after all have approved");
        escrowArray[escrowId].status = EscrowStatus.Withdrawn;
        consents[msg.sender][escrowId] = false;
        emit ProposalWithdrawn(msg.sender, escrowId);
    }
}
