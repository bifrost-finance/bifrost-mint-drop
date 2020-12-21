// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/cryptography/ECDSA.sol";

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

    function initialize(address vETHAddress_, address signer_) public initializer {
        super.__Ownable_init();
        vETHAddress = vETHAddress_;
        signer = signer_;
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
}
