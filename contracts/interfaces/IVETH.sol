// SPDX-License-Identifier: CC0-1.0

pragma solidity ^0.6.0;

interface IVETH {
    function mint(address account, uint amount) external;
    function burn(address account, uint amount) external;
}
