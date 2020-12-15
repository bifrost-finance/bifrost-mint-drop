// Load dependencies
const { accounts, privateKeys, contract, web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const { BN, ether, expectRevert, time } = require('@openzeppelin/test-helpers');

// Load compiled artifacts
const ERC20 = contract.fromArtifact('vETH');
const ClaimRewards = contract.fromArtifact('ClaimRewards');

// Start test block
describe('ClaimRewards', function () {
    const [ owner, signer, user1 ] = accounts;
    const [ ownerPk, signerPK ] = privateKeys;

    beforeEach(async function () {
        // Deploy vETH contract for each test
        this.veth = await ERC20.new({ from: owner });

        // Deploy ClaimRewards contract for each test
        this.claimRewards = await ClaimRewards.new({ from: owner });
        await this.claimRewards.initialize(this.veth.address, signer, { from: owner });
        expect(await this.claimRewards.vETHAddress()).to.equal(this.veth.address);
        expect(await this.claimRewards.signer()).to.equal(signer);

        await this.veth.mint(this.claimRewards.address, ether('10000'), { from: owner });
        expect(await this.veth.balanceOf(this.claimRewards.address)).to.be.bignumber.equal(ether('10000'));
    });

    it('when claim should be ok', async function () {
        const amount = ether('5');
        const now = await time.latest();
        const expireAt = now.add(time.duration.days(1));
        const encoded = web3.eth.abi.encodeParameters(
            ['address','uint', 'uint'],
            [user1, amount.toString(), expireAt.toString()]
        );
        const hash = web3.utils.keccak256(encoded);
        const sig = web3.eth.accounts.sign(hash, signerPK);
        await this.claimRewards.claim(amount, expireAt, sig.signature, { from: user1 });
    });
});
