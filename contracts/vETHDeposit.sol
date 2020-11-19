// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./DepositContract.sol";
import "./interfaces/IVETH.sol";

contract vETHDeposit is Ownable {
    using SafeMath for uint;

    /* ========== CONSTANTS ========== */

    uint constant public BONUS_DURATION = 64 days;
    uint constant public TOTAL_BNC_REWARDS = 120000 ether;

    /* ========== STATE VARIABLES ========== */

    // address of vETH
    address public vETHAddress;
    // address of Ethereum 2.0 Deposit Contract
    address public depositAddress;
    // a flag to control whether the withdraw function is locked
    bool public withdrawLocked;
    // a timestamp when the bonus activity initialized
    uint public initAt;
    // total amount of ETH deposited to Ethereum 2.0 Deposit Contract
    uint public totalStaked;
    // total amount of ETH deposited in this contract
    uint public totalDeposit;
    // total amount of BNC will be rewarded to users
    uint public totalRewards;
    // total claimed amount of BNC rewards
    uint public claimedRewards;
    // user address => amount of ETH deposited by this user in this contract
    mapping(address => uint) public myDeposit;
    // user address => amount of BNC rewards that will rewarded to this user
    mapping(address => uint) public myRewards;
    // user address => a timestamp that this user claimed rewards
    mapping(address => uint) public myLastClaimedAt;
    // user address => the address of this user which in ss58 format on Bifrost Network
    mapping(address => string) public bifrostAddress;

    /* ========== EVENTS ========== */

    event Deposit(address indexed sender, uint amount);
    event Withdrawal(address indexed sender, uint amount);
    event Claimed(address indexed sender, uint amount);

    /* ========== CONSTRUCTOR ========== */

    constructor(address vETHAddress_, address depositAddress_, uint initAt_) public Ownable() {
        vETHAddress = vETHAddress_;
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
