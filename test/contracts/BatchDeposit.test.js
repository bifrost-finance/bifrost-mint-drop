// Load dependencies
const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const { BN, ether, expectRevert, time } = require('@openzeppelin/test-helpers');

// Load compiled artifacts
const BatchDeposit = contract.fromArtifact('BatchDeposit');
const ERC20 = contract.fromArtifact('vETH');
const MintDrop = contract.fromArtifact('MintDrop');
const DepositContract = contract.fromArtifact('DepositContract');

// Start test block
describe('BatchDeposit', function () {
    const [ owner, user1, user2, user3, worker ] = accounts;
    let tp0, tp1;

    beforeEach(async function () {
        // Deploy DepositContract contract for each test
        this.deposit = await DepositContract.new({ from: owner });

        // Deploy vETH contract for each test
        this.veth = await ERC20.new({ from: owner });
        await this.veth.unpause({ from: owner });

        // Deploy MintDrop contract for each test
        let bonusStartAt = await time.latest();
        this.mintDrop = await MintDrop.new(this.veth.address, this.deposit.address, bonusStartAt, { from: owner });
        expect(await this.mintDrop.depositAddress()).to.equal(this.deposit.address);
        expect(await this.mintDrop.bonusStartAt()).to.be.bignumber.equal(new BN(bonusStartAt));

        // transfer ownership of vETH to MintDrop contract
        await this.veth.transferOwnership(this.mintDrop.address, { from: owner });
        expect(await this.veth.owner()).to.equal(this.mintDrop.address);

        // Deploy BatchDeposit contract for each test
        this.batch = await BatchDeposit.new({ from: owner });
        await this.batch.initialize(this.mintDrop.address, worker, { from: owner });
        expect(await this.batch.worker()).to.equal(worker);

    });


    it('when deposit should be ok', async function () {

        const amount = ether('32');
        await this.mintDrop.deposit({ from: user1, value: amount });
        expect(await web3.eth.getBalance(this.mintDrop.address)).to.be.bignumber.equal(amount);
        expect(await this.mintDrop.myDeposit(user1)).to.be.bignumber.equal(amount);
        expect(await this.mintDrop.totalDeposit()).to.be.bignumber.equal(amount);
        expect(await this.mintDrop.myRewards(user1)).to.be.bignumber.equal(ether('0'));
        expect(await this.veth.balanceOf(user1)).to.be.bignumber.equal(amount);
        expect(await this.veth.totalSupply()).to.be.bignumber.equal(amount);
        //const amount32 = ether('32');
        //await this.mintDrop.deposit({ from: user2, value: amount32 });
        //expect(await this.mintDrop.totalDeposit).to.be.bignumber.equal(amount32 + amount);

        const amount2 = ether('32');
        await this.mintDrop.deposit({ from: user2, value: amount2 });
        expect(await web3.eth.getBalance(this.mintDrop.address)).to.be.bignumber.equal(ether('64'));

        await this.mintDrop.lockWithdraw({ from: owner });
        await this.mintDrop.transferOwnership(this.batch.address, { from: owner });
        expect(await this.mintDrop.owner()).to.equal(this.batch.address);

        expect(await this.mintDrop.totalLocked()).to.be.bignumber.equal(ether('0'));  // Not sent/locked to deposit contract yet.

        pubkey = web3.utils.hexToBytes("0x8b06dd23f29e03ee379a68103ff3baf816acac525b307fc53bcb1689e600128040fb1e570dc5a355deed79327273714c");
        withdrawal_credentials = web3.utils.hexToBytes("0x008e3571729cbfb9212496fe1c3bc6a5b46f62370937dcbae8f62b5a326f6fdf");
        signature = web3.utils.hexToBytes("0x8b66f46c10c3920e4b8e8776b298ab5efc3eca0d08709dde56d04a26706694bc35a3c7eb373bbf36079c65c944f2acd611d9e74c83e829d6c01ba7816beb0ee5d1f680e28e9c546e6f689b96a9d5455279c68c28ef2312da137bda2a12ebbbc7");
        deposit_data_root = "0xe763e880b74290438d6ec655201c50a2d8a80bcb6f428767c2d4ce735011c488";
        tp0 = [pubkey, withdrawal_credentials, signature, deposit_data_root];

        pubkey = web3.utils.hexToBytes("0xad00bea3448ce1fc5d24b21acce8b5d9b4990812bea59028b61c303fed6c9094ad3b78f5ced2883de06531e33fc5b63a");
        withdrawal_credentials = web3.utils.hexToBytes("0x000d48e098f296e7f58fed907e4bdcca46ce8085ffb00f03aa0d371d86e16ba1");
        signature = web3.utils.hexToBytes("0x89229cd063ffbfcc18c7741ba1554775c3b76e6bf8eaa1dd310493b8f03c69194f88f753089ec304e3dfe468fad9c5870eb1caf30789bd7799b9fb1232f835159350fc88b7e302f669d5f77a9ed671b04f43b46a68a965af963676a518409bf1");
        deposit_data_root = "0x76d0ff1ea4b1a22e43b42c637d75d31363be2dfb21ef05542996c0277e377722";
        tp1 = [pubkey, withdrawal_credentials, signature, deposit_data_root];

        await this.batch.fillTheTable([tp0, tp1], new BN(0), { from: worker });

        console.log("before do batch");
        console.log(await web3.eth.getBalance(owner));

        await this.batch.doBatchDeposit(new BN(0), new BN(2), { from: owner, gas: 8000000, gasPrice: web3.utils.toWei('100','gwei')});

        console.log("after do batch");
        console.log(await web3.eth.getBalance(owner));

    });

});


