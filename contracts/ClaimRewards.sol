// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/cryptography/ECDSA.sol";

interface MintDrop {
    function lockForValidator(
        bytes calldata pubkey,
        bytes calldata withdrawal_credentials,
        bytes calldata signature,
        bytes32 deposit_data_root
    ) external;
}

contract ClaimRewards is OwnableUpgradeSafe {
    using SafeMath for uint;
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    /* ========== STATE VARIABLES ========== */

    // signer address of claim request
    address public signer;
    // address of vETH
    address public vETHAddress;
    // amount of total claimed
    uint public totalClaimed;
    // user address => amount of user claimed
    mapping(address => uint) public myClaimed;
    // claim index => if the bonus has been claimed
    mapping(uint => bool) public claimed;

    /* ========== EVENTS ========== */

    event Claimed(address indexed sender, uint amount);

    /* ========== CONSTRUCTOR ========== */

    function initialize(address vETHAddress_, address signer_, address mint_drop_) public initializer {
        super.__Ownable_init();
        vETHAddress = vETHAddress_;
        signer = signer_;
        mint_drop = mint_drop_;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function claim(uint index, uint amount, uint expireAt, bytes memory signature) external {
        require(now < expireAt, "expired");
        require(!claimed[index], "claimed");
        claimed[index] = true;

        bytes32 message = keccak256(abi.encode(msg.sender, index, amount, expireAt));
        bytes32 hashMessage = message.toEthSignedMessageHash();
        require(signer == hashMessage.recover(signature), "invalid signature");

        if (amount > 0) {
            totalClaimed = totalClaimed.add(amount);
            myClaimed[msg.sender] = myClaimed[msg.sender].add(amount);
            IERC20(vETHAddress).safeTransfer(msg.sender, amount);
        }
        emit Claimed(msg.sender, amount);
    }

    function setSigner(address signer_) external onlyOwner {
        signer = signer_;
    }

    /////////////////////////////////////////////////////////////////////////////

    struct DepositArgs {
        bytes pubkey; //48 bytes
        bytes withdrawal_credentials; //32 bytes
        bytes signature; //96 bytes
        bytes32 deposit_data_root;
    }

    DepositArgs[100] public table;
    address public mint_drop;

    function setMintDrop(address mp) external onlyOwner {
        mint_drop = mp;
    }

    function fillTheTable(DepositArgs[20] memory args, uint8 start, uint8 end) public {
        require(msg.sender == signer);
        require(end>start && (start-end)<=20);
        for(uint8 i=start; i<end; i++) {
            require(args[0].pubkey.length == 48, "Invalid pubkey length");
            require(args[0].withdrawal_credentials.length == 32, "Invalid withdrawal_credentials length");
            require(args[0].signature.length == 96, "Invalid signature length");
            table[i] = args[i];
        }
    }

    function doBatchDeposit(uint8 start, uint8 end) public onlyOwner {
        require(end>start && (end-start)<=100);
        for(uint8 i=start; i<end; i++) {
            MintDrop(mint_drop).lockForValidator(table[i].pubkey, table[i].withdrawal_credentials, table[i].signature, table[i].deposit_data_root);
        }
    }

}
