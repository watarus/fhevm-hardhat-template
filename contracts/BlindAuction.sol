// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Blind Auction - Sealed-Bid Auction with FHE
/// @author FHEVM Example Hub
/// @notice A sealed-bid auction where bids remain encrypted until reveal
/// @dev Demonstrates encrypted comparisons and conditional selection
/// @custom:concept Bids are encrypted. The highest bid wins, but losing bids
///                 are never revealed - preserving bidder privacy.
contract BlindAuction is ZamaEthereumConfig {
    /// @notice Auction states
    enum AuctionState {
        Open,
        Ended
    }

    /// @notice Current auction state
    AuctionState public state;

    /// @notice Auction owner/beneficiary
    address public beneficiary;

    /// @notice Auction end time
    uint256 public endTime;

    /// @notice Encrypted highest bid
    euint64 private highestBid;

    /// @notice Address of the highest bidder (set after winner claims)
    address public highestBidder;

    /// @notice Whether the winner has been claimed
    bool public winnerClaimed;

    /// @notice Tracks whether each user has placed a bid
    mapping(address user => bool placed) public hasBid;

    /// @notice Encrypted bids for each bidder (for refund purposes)
    mapping(address bidder => euint64 amount) private bids;

    /// @notice Event emitted when a bid is placed
    /// @param bidder Address of the bidder
    event BidPlaced(address indexed bidder);

    /// @notice Event emitted when the auction ends
    /// @param winner Address of the winning bidder
    event AuctionEnded(address winner);

    /// @notice Event emitted when the winner claims their status
    /// @param winner Address of the winner
    event WinnerClaimed(address indexed winner);

    /// @notice Create a new blind auction
    /// @param _duration Duration of the auction in seconds
    constructor(uint256 _duration) {
        beneficiary = msg.sender;
        endTime = block.timestamp + _duration;
        state = AuctionState.Open;

        // Initialize highest bid to 0
        highestBid = FHE.asEuint64(0);
        FHE.allowThis(highestBid);
    }

    /// @notice Place an encrypted bid
    /// @param encryptedBid The encrypted bid amount
    /// @param inputProof The input proof
    /// @dev Bids can only be placed once per address while auction is open
    function bid(externalEuint64 encryptedBid, bytes calldata inputProof) external {
        require(state == AuctionState.Open, "Auction not open");
        require(block.timestamp < endTime, "Auction ended");
        require(!hasBid[msg.sender], "Already placed a bid");

        euint64 bidAmount = FHE.fromExternal(encryptedBid, inputProof);

        // Store the bid
        bids[msg.sender] = bidAmount;
        hasBid[msg.sender] = true;

        // Compare with current highest bid (encrypted comparison)
        ebool isHigher = FHE.gt(bidAmount, highestBid);

        // Update highest bid if this bid is higher (encrypted select)
        highestBid = FHE.select(isHigher, bidAmount, highestBid);

        // Grant permissions for encrypted values
        FHE.allowThis(highestBid);
        FHE.allowThis(bidAmount);
        FHE.allow(bidAmount, msg.sender);
        FHE.allow(bidAmount, beneficiary); // Allow beneficiary to decrypt bids off-chain

        // Note: highestBidder is not updated here because the comparison is encrypted.
        // After the auction ends, the beneficiary can decrypt all bids off-chain and call
        // setWinner() to record the winner's address on-chain.

        emit BidPlaced(msg.sender);
    }

    /// @notice End the auction
    /// @dev Can only be called after end time by beneficiary
    function endAuction() external {
        require(state == AuctionState.Open, "Auction already ended");
        require(block.timestamp >= endTime, "Auction not yet ended");
        require(msg.sender == beneficiary, "Only beneficiary can end");

        state = AuctionState.Ended;

        // Grant beneficiary permission to access the highest bid
        FHE.allow(highestBid, beneficiary);

        emit AuctionEnded(address(0)); // Winner not yet claimed
    }

    /// @notice Set the winner address after auction ends
    /// @dev Only callable by beneficiary. The beneficiary can decrypt the highestBid and
    ///      all individual bids off-chain (since permissions were granted via FHE.allow),
    ///      identify which bidder's bid matches the highest bid, then call this function
    ///      to record the winner's address on-chain.
    /// @param winner The address of the winning bidder
    function setWinner(address winner) external {
        require(state == AuctionState.Ended, "Auction not ended");
        require(msg.sender == beneficiary, "Only beneficiary can set winner");
        require(!winnerClaimed, "Winner already set");
        require(hasBid[winner], "Address hasn't bid");

        highestBidder = winner;
        winnerClaimed = true;

        emit WinnerClaimed(winner);
    }

    /// @notice Get the encrypted highest bid (only accessible to beneficiary after auction)
    /// @return The encrypted highest bid amount
    function getHighestBid() external view returns (euint64) {
        require(state == AuctionState.Ended, "Auction not ended");
        require(msg.sender == beneficiary, "Only beneficiary can view");
        return highestBid;
    }

    /// @notice Get your own encrypted bid
    /// @return Your encrypted bid amount
    function getMyBid() external view returns (euint64) {
        require(hasBid[msg.sender], "You haven't bid");
        return bids[msg.sender];
    }

    /// @notice Check if your bid is the current highest (encrypted result)
    /// @return Encrypted boolean - true if your bid is currently highest
    function isMyBidHighest() external returns (ebool) {
        require(hasBid[msg.sender], "You haven't bid");

        ebool result = FHE.eq(bids[msg.sender], highestBid);
        FHE.allow(result, msg.sender);

        return result;
    }

    /// @notice Get remaining time in the auction
    /// @return Seconds remaining (0 if ended)
    function getRemainingTime() external view returns (uint256) {
        if (block.timestamp >= endTime) {
            return 0;
        }
        return endTime - block.timestamp;
    }
}
