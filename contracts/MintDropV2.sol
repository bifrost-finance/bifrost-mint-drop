//  =====================================================================================
//
//   ___ __ __    ________  ___   __   _________   ______  ______   ______  ______
//  /__//_//_/\  /_______/\/__/\ /__/\/________/\ /_____/\/_____/\ /_____/\/_____/\
//  \::\| \| \ \ \__.::._\/\::\_\\  \ \__.::.__\/ \:::_ \ \:::_ \ \\:::_ \ \:::_ \ \
//   \:.      \ \   \::\ \  \:. `-\  \ \ \::\ \    \:\ \ \ \:(_) ) )\:\ \ \ \:(_) \ \
//    \:.\-/\  \ \  _\::\ \__\:. _    \ \ \::\ \    \:\ \ \ \: __ `\ \:\ \ \ \: ___\/
//     \. \  \  \ \/__\::\__/\\. \`-\  \ \ \::\ \    \:\/.:| \ \ `\ \ \:\_\ \ \ \ \
//      \__\/ \__\/\________\/ \__\/ \__\/  \__\/     \____/_/\_\/ \_\/\_____\/\_\/
//                                                                          Version 2.0.0
//  =====================================================================================

// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "@openzeppelin/contracts-ethereum-package/contracts/math/Math.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "./DepositContract.sol";
import "./interfaces/IVETH.sol";

contract MintDropV2 is OwnableUpgradeSafe {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    /* ========== CONSTANTS ========== */

    /* ========== STATE VARIABLES ========== */

    // address of vETH
    address public vETHAddress;
    // address of old vETH
    address public vETHAddressOld;
    // address of Ethereum 2.0 Deposit Contract
    address public depositAddress;
    // total amount of ETH deposited to Ethereum 2.0 Deposit Contract
    uint public totalLocked;
    // total amount of ETH deposited in this contract
    uint public totalDeposit;
    // user address => amount of ETH deposited by this user in this contract
    mapping(address => uint) public myDeposit;
    // convertRatio: vETH/ETH
    uint public convertRatio;

    /* ========== EVENTS ========== */

    event Deposit(address indexed sender, uint AmountOfETH, uint amountOfvETH);
    event NewValidator(bytes little_endian_deposit_count);
    event Swapped(address indexed sender, uint amount);
    event ConvertRatioSet(address indexed sender, uint ratio);

    /* ========== CONSTRUCTOR ========== */

    function initialize(address vETHAddress_, address vETHAddressOld_, address depositAddress_) public initializer {
        super.__Ownable_init();
        vETHAddress = vETHAddress_;
        vETHAddressOld = vETHAddressOld_;
        depositAddress = depositAddress_;
        convertRatio = 1 ether;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function deposit() external payable {
        myDeposit[msg.sender] = myDeposit[msg.sender].add(msg.value);
        totalDeposit = totalDeposit.add(msg.value);
        // calculate amount of vETH by convertRatio
        uint amountOfvETH = msg.value.mul(convertRatio).div(1 ether);
        // mint vETH, MintDrop should have ownership of vETH contract
        IVETH(vETHAddress).mint(msg.sender, amountOfvETH);
        emit Deposit(msg.sender, msg.value, amountOfvETH);
    }

    function swapForOldvETH(uint amount) external {
        IERC20(vETHAddressOld).safeTransferFrom(msg.sender, address(this), amount);
        IVETH(vETHAddress).mint(msg.sender, amount);
        emit Swapped(msg.sender, amount);
    }

    function lockForValidator(
        bytes calldata pubkey,
        bytes calldata withdrawal_credentials,
        bytes calldata signature,
        bytes32 deposit_data_root
    ) external onlyOwner {
        uint amount = 32 ether;
        require(address(this).balance >= amount, "insufficient balance");
        totalLocked = totalLocked.add(amount);
        IDepositContract(depositAddress).deposit{value: amount}(
            pubkey,
            withdrawal_credentials,
            signature,
            deposit_data_root
        );
        emit NewValidator(IDepositContract(depositAddress).get_deposit_count());
    }

    function setConvertRatio(uint ratio) external onlyOwner {
        require(ratio <= 1 ether, "invalid ratio");
        convertRatio = ratio;
        emit ConvertRatioSet(msg.sender, ratio);
    }

    /* ========== VIEWS ========== */


}
