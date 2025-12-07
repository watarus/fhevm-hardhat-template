// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Arithmetic Operations Example
/// @author FHEVM Example Hub
/// @notice Demonstrates encrypted arithmetic operations using FHEVM
/// @dev Shows how to use add, sub, mul operations on encrypted values
/// @custom:note Division and modulo are not supported in current FHEVM version
contract FHEArithmetic is ZamaEthereumConfig {
    euint32 private _result;

    /// @notice Get the last computation result
    /// @return The encrypted result
    function getResult() external view returns (euint32) {
        return _result;
    }

    /// @notice Add two encrypted values
    /// @param a First encrypted value
    /// @param proofA Proof for first value
    /// @param b Second encrypted value
    /// @param proofB Proof for second value
    /// @dev Result = a + b (encrypted)
    function add(externalEuint32 a, bytes calldata proofA, externalEuint32 b, bytes calldata proofB) external {
        euint32 encA = FHE.fromExternal(a, proofA);
        euint32 encB = FHE.fromExternal(b, proofB);

        _result = FHE.add(encA, encB);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }

    /// @notice Subtract two encrypted values
    /// @param a First encrypted value (minuend)
    /// @param proofA Proof for first value
    /// @param b Second encrypted value (subtrahend)
    /// @param proofB Proof for second value
    /// @dev Result = a - b (encrypted). WARNING: May underflow if b > a
    function sub(externalEuint32 a, bytes calldata proofA, externalEuint32 b, bytes calldata proofB) external {
        euint32 encA = FHE.fromExternal(a, proofA);
        euint32 encB = FHE.fromExternal(b, proofB);

        _result = FHE.sub(encA, encB);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }

    /// @notice Multiply two encrypted values
    /// @param a First encrypted value
    /// @param proofA Proof for first value
    /// @param b Second encrypted value
    /// @param proofB Proof for second value
    /// @dev Result = a * b (encrypted). WARNING: May overflow
    function mul(externalEuint32 a, bytes calldata proofA, externalEuint32 b, bytes calldata proofB) external {
        euint32 encA = FHE.fromExternal(a, proofA);
        euint32 encB = FHE.fromExternal(b, proofB);

        _result = FHE.mul(encA, encB);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }

    /// @notice Add an encrypted value with a plaintext constant
    /// @param a Encrypted value
    /// @param proofA Proof for encrypted value
    /// @param plaintextB Plaintext constant to add
    /// @dev Demonstrates mixed encrypted/plaintext arithmetic
    function addPlaintext(externalEuint32 a, bytes calldata proofA, uint32 plaintextB) external {
        euint32 encA = FHE.fromExternal(a, proofA);

        // FHE operations can mix encrypted and plaintext values
        _result = FHE.add(encA, plaintextB);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }

    /// @notice Multiply an encrypted value by a plaintext constant
    /// @param a Encrypted value
    /// @param proofA Proof for encrypted value
    /// @param plaintextB Plaintext constant to multiply
    /// @dev Demonstrates mixed encrypted/plaintext arithmetic
    function mulPlaintext(externalEuint32 a, bytes calldata proofA, uint32 plaintextB) external {
        euint32 encA = FHE.fromExternal(a, proofA);

        _result = FHE.mul(encA, plaintextB);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);
    }
}
