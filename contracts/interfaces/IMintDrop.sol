// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

interface IMintDrop {
    function lockForValidator(
        bytes calldata pubkey,
        bytes calldata withdrawal_credentials,
        bytes calldata signature,
        bytes32 deposit_data_root
    ) external;

    function transferOwnership(address newOwner) external;
}
