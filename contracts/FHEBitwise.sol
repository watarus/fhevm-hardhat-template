// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Bitwise Operations Example
/// @author FHEVM Example Hub
/// @notice Demonstrates encrypted bitwise operations using FHEVM
/// @dev Shows how to use and, or, xor, not, shl, shr operations on encrypted values
contract FHEBitwise is ZamaEthereumConfig {
    euint32 private _result;

    /// @notice Get the last computation result
    /// @return The encrypted result
    function getResult() external view returns (euint32) {
        return _result;
    }

    /// @notice Bitwise AND of two encrypted values
    /// @param a First encrypted value
    /// @param proofA Proof for first value
    /// @param b Second encrypted value
    /// @param proofB Proof for second value
    /// @dev Result = a & b (encrypted)
    function bitwiseAnd(externalEuint32 a, bytes calldata proofA, externalEuint32 b, bytes calldata proofB) external {
        euint32 encA = FHE.fromExternal(a, proofA);
        euint32 encB = FHE.fromExternal(b, proofB);

        _result = FHE.and(encA, encB);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }

    /// @notice Bitwise OR of two encrypted values
    /// @param a First encrypted value
    /// @param proofA Proof for first value
    /// @param b Second encrypted value
    /// @param proofB Proof for second value
    /// @dev Result = a | b (encrypted)
    function bitwiseOr(externalEuint32 a, bytes calldata proofA, externalEuint32 b, bytes calldata proofB) external {
        euint32 encA = FHE.fromExternal(a, proofA);
        euint32 encB = FHE.fromExternal(b, proofB);

        _result = FHE.or(encA, encB);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }

    /// @notice Bitwise XOR of two encrypted values
    /// @param a First encrypted value
    /// @param proofA Proof for first value
    /// @param b Second encrypted value
    /// @param proofB Proof for second value
    /// @dev Result = a ^ b (encrypted)
    function bitwiseXor(externalEuint32 a, bytes calldata proofA, externalEuint32 b, bytes calldata proofB) external {
        euint32 encA = FHE.fromExternal(a, proofA);
        euint32 encB = FHE.fromExternal(b, proofB);

        _result = FHE.xor(encA, encB);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }

    /// @notice Bitwise NOT of an encrypted value
    /// @param a Encrypted value to negate
    /// @param proofA Proof for encrypted value
    /// @dev Result = ~a (encrypted)
    function bitwiseNot(externalEuint32 a, bytes calldata proofA) external {
        euint32 encA = FHE.fromExternal(a, proofA);

        _result = FHE.not(encA);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }

    /// @notice Left shift an encrypted value by plaintext amount
    /// @param a Encrypted value to shift
    /// @param proofA Proof for encrypted value
    /// @param shiftAmount Amount to shift left (plaintext)
    /// @dev Result = a << shiftAmount (encrypted)
    function shiftLeft(externalEuint32 a, bytes calldata proofA, uint8 shiftAmount) external {
        euint32 encA = FHE.fromExternal(a, proofA);

        _result = FHE.shl(encA, shiftAmount);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }

    /// @notice Right shift an encrypted value by plaintext amount
    /// @param a Encrypted value to shift
    /// @param proofA Proof for encrypted value
    /// @param shiftAmount Amount to shift right (plaintext)
    /// @dev Result = a >> shiftAmount (encrypted)
    function shiftRight(externalEuint32 a, bytes calldata proofA, uint8 shiftAmount) external {
        euint32 encA = FHE.fromExternal(a, proofA);

        _result = FHE.shr(encA, shiftAmount);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }

    /// @notice Rotate left an encrypted value
    /// @param a Encrypted value to rotate
    /// @param proofA Proof for encrypted value
    /// @param rotateAmount Amount to rotate left (plaintext)
    /// @dev Result = rotl(a, rotateAmount) (encrypted)
    function rotateLeft(externalEuint32 a, bytes calldata proofA, uint8 rotateAmount) external {
        euint32 encA = FHE.fromExternal(a, proofA);

        _result = FHE.rotl(encA, rotateAmount);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }

    /// @notice Rotate right an encrypted value
    /// @param a Encrypted value to rotate
    /// @param proofA Proof for encrypted value
    /// @param rotateAmount Amount to rotate right (plaintext)
    /// @dev Result = rotr(a, rotateAmount) (encrypted)
    function rotateRight(externalEuint32 a, bytes calldata proofA, uint8 rotateAmount) external {
        euint32 encA = FHE.fromExternal(a, proofA);

        _result = FHE.rotr(encA, rotateAmount);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }

    /// @notice Extract specific bits using a mask
    /// @param a Encrypted value
    /// @param proofA Proof for encrypted value
    /// @param mask Plaintext bitmask
    /// @dev Result = a & mask (useful for extracting specific bits)
    function extractBits(externalEuint32 a, bytes calldata proofA, uint32 mask) external {
        euint32 encA = FHE.fromExternal(a, proofA);

        // AND with plaintext mask to extract specific bits
        _result = FHE.and(encA, mask);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }

    /// @notice Set specific bits using OR with a mask
    /// @param a Encrypted value
    /// @param proofA Proof for encrypted value
    /// @param mask Plaintext bitmask of bits to set
    /// @dev Result = a | mask (sets bits that are 1 in mask)
    function setBits(externalEuint32 a, bytes calldata proofA, uint32 mask) external {
        euint32 encA = FHE.fromExternal(a, proofA);

        _result = FHE.or(encA, mask);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }

    /// @notice Toggle specific bits using XOR with a mask
    /// @param a Encrypted value
    /// @param proofA Proof for encrypted value
    /// @param mask Plaintext bitmask of bits to toggle
    /// @dev Result = a ^ mask (toggles bits that are 1 in mask)
    function toggleBits(externalEuint32 a, bytes calldata proofA, uint32 mask) external {
        euint32 encA = FHE.fromExternal(a, proofA);

        _result = FHE.xor(encA, mask);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }
}
