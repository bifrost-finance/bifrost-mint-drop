// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IDepositContract.sol";
import "./interfaces/IVETH.sol";

contract vETHDeposit is Ownable {
    using SafeMath for uint;

    address public vETHAddress;
    address public depositAddress;

    bool public locked;
    uint public totalStaked;
    uint public totalDeposit;
    mapping(address => uint) public myDeposit;

    event Deposit(address indexed sender, uint amount);
    event Withdrawal(address indexed sender, uint amount);

    constructor(address vETHAddress_, address depositAddress_) public Ownable() {
        vETHAddress = vETHAddress_;
        depositAddress = depositAddress_;
    }

    function deposit() external payable {
        myDeposit[msg.sender] = myDeposit[msg.sender].add(msg.value);
        totalDeposit = totalDeposit.add(msg.value);
        IVETH(vETHAddress).mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint amount) external isNotLocked {
        require(IERC20(vETHAddress).balanceOf(msg.sender) >= amount, "insufficient amount");
        myDeposit[msg.sender] = myDeposit[msg.sender].sub(amount);
        totalDeposit = totalDeposit.sub(amount);
        IVETH(vETHAddress).burn(msg.sender, amount);
        msg.sender.transfer(amount);
        emit Withdrawal(msg.sender, amount);
    }

    function stake(
        bytes calldata pubkey,
        bytes calldata withdrawal_credentials,
        bytes calldata signature,
        bytes32 deposit_data_root
    ) external onlyOwner isLocked {
        uint amount = 32 ether;
        totalStaked = totalStaked.add(amount);
        IDepositContract(depositAddress).deposit{value: amount}(
            pubkey,
            withdrawal_credentials,
            signature,
            deposit_data_root
        );
    }

    function lock() external onlyOwner {
        locked = true;
    }

    function unlock() external onlyOwner {
        locked = false;
    }

    modifier isLocked() {
        require(locked, "");
        _;
    }

    modifier isNotLocked() {
        require(!locked, "");
        _;
    }
}
