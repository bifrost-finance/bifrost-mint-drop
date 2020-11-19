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

    /* ========== CONSTANTS ========== */

    uint constant public BONUS_DURATION = 64 days;
    uint constant public TOTAL_BNC_REWARDS = 120000 ether;

    /* ========== STATE VARIABLES ========== */

    address public vETHAddress;
    address public depositAddress;
    bool public withdrawLocked;
    uint public initAt;
    uint public totalStaked;
    uint public totalDeposit;
    uint public totalRewards;
    uint public claimedRewards;
    mapping(address => uint) public myDeposit;
    mapping(address => uint) public myRewards;
    mapping(address => uint) public myLastClaimedAt;
    mapping(address => string) public bifrostAddress;

    /* ========== EVENTS ========== */

    event Deposit(address indexed sender, uint amount);
    event Withdrawal(address indexed sender, uint amount);
    event Claimed(address indexed sender, uint amount);

    /* ========== CONSTRUCTOR ========== */

    constructor(address depositAddress_, uint initAt_) public Ownable() {
        depositAddress = depositAddress_;
        initAt = initAt_;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function deposit() external payable {
        claimRewards();
        myDeposit[msg.sender] = myDeposit[msg.sender].add(msg.value);
        totalDeposit = totalDeposit.add(msg.value);
        IVETH(vETHAddress).mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint amount) external isWithdrawNotLocked {
        claimRewards();
        require(IERC20(vETHAddress).balanceOf(msg.sender) >= amount, "insufficient amount");
        myDeposit[msg.sender] = myDeposit[msg.sender].sub(amount);
        totalDeposit = totalDeposit.sub(amount);
        IVETH(vETHAddress).burn(msg.sender, amount);
        msg.sender.transfer(amount);
        emit Withdrawal(msg.sender, amount);
    }

    function claimRewards() public {
        if (myLastClaimedAt[msg.sender] == 0) {
            myLastClaimedAt[msg.sender] = now;
        } else {
            myRewards[msg.sender] = getRewards(msg.sender);
            myLastClaimedAt[msg.sender] = now;
            emit Claimed(msg.sender, myRewards[msg.sender]);
        }
    }

    function newValidator(
        bytes calldata pubkey,
        bytes calldata withdrawal_credentials,
        bytes calldata signature,
        bytes32 deposit_data_root
    ) external onlyOwner isWithdrawLocked {
        uint amount = 32 ether;
        totalStaked = totalStaked.add(amount);
        IDepositContract(depositAddress).deposit{value: amount}(
            pubkey,
            withdrawal_credentials,
            signature,
            deposit_data_root
        );
    }

    function setVETHAddress(address vETHAddress_) external onlyOwner {
        vETHAddress = vETHAddress_;
    }

    function bindBifrostAddress(string memory bifrostAddress_) external {
        bifrostAddress[msg.sender] = bifrostAddress_;
    }

    function lockWithdraw() external onlyOwner {
        withdrawLocked = true;
    }

    function unlockWithdraw() external onlyOwner {
        withdrawLocked = false;
    }

    /* ========== VIEWS ========== */

    function getRewards(address target) public view returns (uint) {
        if (myLastClaimedAt[msg.sender] == 0) {
            return 0;
        }
        uint currentRewards = totalRewards.sub(claimedRewards);
        uint duration = now.sub(myLastClaimedAt[target]);
        if (duration > BONUS_DURATION) {
            duration = BONUS_DURATION;
        }
        uint rewards = currentRewards.mul(
            myDeposit[target].div(totalDeposit)
                .mul(now.sub(myLastClaimedAt[target])).div(BONUS_DURATION)
        );
        return myRewards[target].add(rewards);
    }

    modifier isWithdrawLocked() {
        require(withdrawLocked, "withdrawal not locked");
        _;
    }

    modifier isWithdrawNotLocked() {
        require(!withdrawLocked, "withdrawal locked");
        _;
    }
}
