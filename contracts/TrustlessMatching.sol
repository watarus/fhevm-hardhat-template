// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, externalEbool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Trustless Matching - Private Voting System
/// @author FHEVM Example Hub
/// @notice A dating-app style matching system where votes remain encrypted until mutual match
/// @dev Demonstrates encrypted boolean operations and conditional reveal patterns
/// @custom:concept Key insight: Votes are encrypted booleans. Only when BOTH parties vote,
///                 the AND of their votes is revealed. Individual votes remain private.
contract TrustlessMatching is ZamaEthereumConfig {
    /// @notice Tracks whether a user is registered
    mapping(address user => bool isRegistered) public registered;

    /// @notice Encrypted votes: votes[voter][target] = encrypted boolean
    mapping(address voter => mapping(address target => ebool vote)) private votes;

    /// @notice Tracks if a user has voted for a target
    mapping(address voter => mapping(address target => bool voted)) public hasVoted;

    /// @notice Event emitted when a user registers
    /// @param user Address of the registered user
    event UserRegistered(address indexed user);

    /// @notice Event emitted when a vote is cast
    /// @param voter Address of the voter
    /// @param target Address of the vote target
    event VoteCast(address indexed voter, address indexed target);

    /// @notice Event emitted when a match is checked
    /// @param user1 Address of the first user
    /// @param user2 Address of the second user
    event MatchChecked(address indexed user1, address indexed user2);

    /// @notice Register as a user
    /// @dev Anyone can register to participate in matching
    function register() external {
        require(!registered[msg.sender], "Already registered");
        registered[msg.sender] = true;
        emit UserRegistered(msg.sender);
    }

    /// @notice Cast an encrypted vote for a target user
    /// @param target The user to vote for
    /// @param encryptedVote The encrypted boolean vote (true = like, false = pass)
    /// @param inputProof The input proof for the encrypted vote
    /// @dev The vote remains encrypted - no one can see if it's like or pass
    function vote(address target, externalEbool encryptedVote, bytes calldata inputProof) external {
        require(registered[msg.sender], "Not registered");
        require(registered[target], "Target not registered");
        require(msg.sender != target, "Cannot vote for yourself");
        require(!hasVoted[msg.sender][target], "Already voted");

        ebool voteValue = FHE.fromExternal(encryptedVote, inputProof);
        votes[msg.sender][target] = voteValue;
        hasVoted[msg.sender][target] = true;

        // Allow contract and voter to access this vote
        FHE.allowThis(voteValue);
        FHE.allow(voteValue, msg.sender);

        emit VoteCast(msg.sender, target);
    }

    /// @notice Check if both parties have voted for each other
    /// @param other The other user to check
    /// @return bothVoted True if both parties have cast votes
    function haveBothVoted(address other) external view returns (bool bothVoted) {
        return hasVoted[msg.sender][other] && hasVoted[other][msg.sender];
    }

    /// @notice Get the encrypted match result (vote1 AND vote2)
    /// @param other The other user to check match with
    /// @return matchResult Encrypted boolean - true only if BOTH voted "like"
    /// @dev This returns encrypted result. Only parties with permission can decrypt.
    ///      The magic: even though the contract computes AND, neither party learns
    ///      the other's individual vote - only the final match result!
    function getEncryptedMatchResult(address other) external returns (ebool matchResult) {
        require(hasVoted[msg.sender][other], "You haven't voted for this user");
        require(hasVoted[other][msg.sender], "They haven't voted for you");

        ebool myVote = votes[msg.sender][other];
        ebool theirVote = votes[other][msg.sender];

        // The key FHE operation: encrypted AND
        // Result is encrypted true ONLY if both votes are true
        matchResult = FHE.and(myVote, theirVote);

        // Allow both parties to decrypt the match result
        FHE.allowThis(matchResult);
        FHE.allow(matchResult, msg.sender);
        FHE.allow(matchResult, other);

        emit MatchChecked(msg.sender, other);
    }

    /// @notice Get your own encrypted vote for a target (for re-encryption)
    /// @param target The user you voted for
    /// @return Your encrypted vote
    function getMyVote(address target) external view returns (ebool) {
        require(hasVoted[msg.sender][target], "You haven't voted for this user");
        return votes[msg.sender][target];
    }

    /// @notice Check if you've voted for a specific user
    /// @param target The user to check
    /// @return True if you have voted for them
    function didIVote(address target) external view returns (bool) {
        return hasVoted[msg.sender][target];
    }

    /// @notice Check if a specific user has voted for you
    /// @param voter The user to check
    /// @return True if they have voted for you
    function didTheyVote(address voter) external view returns (bool) {
        return hasVoted[voter][msg.sender];
    }
}
