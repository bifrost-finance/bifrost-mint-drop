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

    function initialize(address mint_drop_, address worker_) public initializer {
        super.__Ownable_init();
        mint_drop = mint_drop_;
        worker = worker_;
    }

    function changeWorker(address newWorker) external onlyOwner {
        worker = newWorker;
    }

    function changeMintDropOwner(address newOwner) external onlyOwner {
        IMintDrop(mint_drop).transferOwnership(newOwner);
    }

    function fillTheTable(DepositArgs[] memory args, uint256 start) external {
        require(msg.sender == worker && args.length > 0 && start < 100);
        uint256 end = start + args.length;
        require(end <= 100);

        for(uint256 i = start; i < end; i++) {
            uint256 j = i - start;
            require(args[j].pubkey.length == 48, "Invalid pubkey length");
            require(args[j].withdrawal_credentials.length == 32, "Invalid withdrawal_credentials length");
            require(args[j].signature.length == 96, "Invalid signature length");
            table[i] = args[j];
        }
    }

    function doBatchDeposit(uint256 start, uint256 end) external onlyOwner {
        require(end <= 100);
        for(uint256 i = start; i < end; i++) {
            IMintDrop(mint_drop).lockForValidator(
                table[i].pubkey,
                table[i].withdrawal_credentials,
                table[i].signature,
                table[i].deposit_data_root
            );
        }
    }
}
