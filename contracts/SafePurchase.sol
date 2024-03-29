// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

contract SafePurchase {
    enum PurchaseState { Created, Purchased, Received, Canceled, Inactive }

    address payable public seller;
    address payable public buyer;
    uint256 public price;
    PurchaseState public state;

    mapping(address => uint256) public pendingWithdrawals;

    event SaleCanceled();
    event PurchaseConfirmed();
    event PurchaseReceived();

    error WrongValue();
    error OnlySeller();
    error OnlyBuyer();
    error OnlyMember();
    error InvalidState();
    error NoPendingWithdraw();
    error TransferFailed();

    modifier onlySeller {
        if (msg.sender != seller) {
            revert OnlySeller();
        }
        _;
    }

    modifier onlyBuyer {
        if (msg.sender != buyer) {
            revert OnlyBuyer();
        }
        _;
    }

    modifier onlyMember {
        if (msg.sender != buyer && msg.sender != seller) {
            revert OnlyMember();
        }
        _;
    }

    modifier inState(PurchaseState _state) {
        if (state != _state) {
            revert InvalidState();
        }
        _;
    }

    constructor(address _buyer, uint256 _price) payable {
        if (msg.value != _price * 2) {
            revert WrongValue();
        }

        seller = payable(msg.sender);
        buyer = payable(_buyer);
        price = _price;
        state = PurchaseState.Created;
    }

    function cancelSale() external onlySeller inState(PurchaseState.Created) {
        emit SaleCanceled();
        state = PurchaseState.Canceled;
        pendingWithdrawals[seller] = address(this).balance;
    }

    function purchase() external payable onlyBuyer inState(PurchaseState.Created){
        if (msg.value != price * 2) {
            revert WrongValue();
        }

        emit PurchaseConfirmed();
        state = PurchaseState.Purchased;
    }

    function confirmReceipt() external onlyBuyer inState(PurchaseState.Purchased) {
        emit PurchaseReceived();
        state = PurchaseState.Received;
        pendingWithdrawals[buyer] = price;
        pendingWithdrawals[seller] = price * 3;
    }

    function withdraw() external onlyMember {
        if (state != PurchaseState.Received && state != PurchaseState.Canceled) {
            revert InvalidState();
        }

        if (state == PurchaseState.Canceled && msg.sender != seller) {
            revert OnlySeller();
        }

        uint256 amount = pendingWithdrawals[msg.sender];

        if (amount == 0) {
            revert NoPendingWithdraw();
        }

        pendingWithdrawals[msg.sender] = 0;

        // One of them is 0, so if they both are equal, this is the last withdraw
        // and should end the purchase.
        if (pendingWithdrawals[buyer] == pendingWithdrawals[seller]) {
            state = PurchaseState.Inactive;
        }

        (bool success,) = msg.sender.call{ value: amount }("");

        if (!success) {
            revert TransferFailed();
        }
    }
}
