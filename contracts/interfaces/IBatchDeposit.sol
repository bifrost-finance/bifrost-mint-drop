// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

interface IBatchDeposit {

    struct DepositArgs {
        bytes pubkey; //48 bytes
        bytes withdrawal_credentials; //32 bytes
        bytes signature; //96 bytes
        bytes32 deposit_data_root;
    }

    function table(uint256 index) external view returns(bytes memory pubkey, bytes memory withdrawal_credentials, bytes memory signature, bytes32 deposit_data_root);
    
    function hasData(uint256 index) external view returns(bool);
    
    function mint_drop() external view returns(address);
    
    function worker() external view returns(address);
    
    function hasDataFlags() external view returns(bool[100] memory);

    function changeWorker(address newWorker) external;

    function changeMintDropOwner(address newOwner) external;
 
    function lockMintDropWithdraw() external;

    function unlockMintDropWithdraw() external;

    function fillTheTable(DepositArgs[] memory args, uint256 start) external;

    function doBatchDeposit(uint256 start, uint256 end) external;
    
}
