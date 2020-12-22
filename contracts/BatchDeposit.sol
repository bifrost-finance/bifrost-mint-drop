// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "./interfaces/IMintDrop.sol";

contract BatchDeposit is OwnableUpgradeSafe {

    struct DepositArgs {
        bytes pubkey; //48 bytes
        bytes withdrawal_credentials; //32 bytes
        bytes signature; //96 bytes
        bytes32 deposit_data_root;
    }

    DepositArgs[100] public table;
    address public mint_drop;
    address public worker;

    function initialize(address mp, address wk) public initializer {
        super.__Ownable_init();
        mint_drop = mp;
        worker = wk;
    }

    function changeWorker(address wk) external onlyOwner {
        worker = wk;
    }

    function changeMintDropOwner(address newOwner) external onlyOwner {
        IMintDrop(mint_drop).transferOwnership(newOwner);
    }

    function fillTheTable(DepositArgs[20] memory args, uint8 start, uint8 end) external {
        require(msg.sender == worker);
        require(end>start && (start-end)<=20);
        for(uint8 i=start; i<end; i++) {
            require(args[0].pubkey.length == 48, "Invalid pubkey length");
            require(args[0].withdrawal_credentials.length == 32, "Invalid withdrawal_credentials length");
            require(args[0].signature.length == 96, "Invalid signature length");
            table[i] = args[i];
        }
    }

    function doBatchDeposit(uint8 start, uint8 end) external {
        require(end>start && (end-start)<=100);
        for(uint8 i=start; i<end; i++) {
            IMintDrop(mint_drop).lockForValidator(table[i].pubkey, table[i].withdrawal_credentials, table[i].signature, table[i].deposit_data_root);
        }
    }

}
