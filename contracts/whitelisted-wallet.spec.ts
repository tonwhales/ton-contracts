import * as fs from 'fs';
import { Address, Cell, toNano, TonClient, Wallet } from 'ton';
import { mnemonicNew, mnemonicToWalletKey } from 'ton-crypto';
import { contractAddress, ContractSource } from 'ton/dist/contracts/sources/ContractSource';
import { openTestTreasure } from 'ton/dist/tests/openTestTreasure';
import { awaitBalance } from 'ton/dist/tests/awaitBalance';
import { BN } from 'bn.js';

export class RestrictedWalletCode implements ContractSource {

    static create(opts: { masterKey: Buffer, restrictedKey: Buffer, workchain: number, restrictedAddress: Address }) {

        // Resolve parameters
        let masterKey = opts.masterKey;
        let restrictedKey = opts.restrictedKey;
        let workchain = opts.workchain;
        let restrictedAddress = opts.restrictedAddress;

        // Build initial code and data
        let initialCode = Cell.fromBoc('b5ee9c720101070100a7000114ff00f4a413f4bcf2c80b010201200203020148040501c6f2ed44d0d31fd3ffd3ffd207d3ffd1258308d718d31f5117baf2a107f901547015f9105125f91066b0b392f222deb3f800069320d74a8e96d307d47f298e8630547143db3cde9302fb00926c21e2e83605d103a4c8cb1f12cbffcbffca07cbffc9ed54060004d0300011a0992fda89a1ae163f003202d0d3030178b0935f037fe0fa4031fa4030fa4402ba02bab0')[0];
        let initialData = new Cell();
        initialData.bits.writeUint(0, 32); // SeqNo
        initialData.bits.writeBuffer(restrictedKey); // Restricted key
        initialData.bits.writeBuffer(masterKey); // Master key
        initialData.bits.writeInt(restrictedAddress.workChain, 8); // Workchain
        initialData.bits.writeBuffer(restrictedAddress.hash); // Address hash

        return new RestrictedWalletCode({ masterKey, restrictedKey, restrictedAddress, initialCode, initialData, workchain });
    }

    readonly masterKey: Buffer;
    readonly restrictedKey: Buffer;
    readonly restrictedAddress: Address;
    readonly initialCode: Cell;
    readonly initialData: Cell;
    readonly workchain: number;
    readonly type = 'org.ton.wallets.simple';

    private constructor(opts: {
        masterKey: Buffer,
        restrictedKey: Buffer,
        workchain: number,
        restrictedAddress: Address,
        initialCode: Cell
        initialData: Cell
    }) {
        this.masterKey = opts.masterKey;
        this.restrictedKey = opts.restrictedKey;
        this.restrictedAddress = opts.restrictedAddress;
        this.initialCode = opts.initialCode;
        this.initialData = opts.initialData;
        this.workchain = opts.workchain;
        Object.freeze(this);
    }
}

describe('whitelisted-wallet', () => {
    // it('should work', () => {
    //     let source = fs.readFileSync(__dirname + '/whitelisted-wallet.cell');
    //     console.warn(source.toString('hex'));
    // });
    it('should work', async () => {
        const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });
        let treasure = await openTestTreasure(client);
        let restrictedWallet = await client.createNewWallet({ workchain: 0 });
        let masterKey = await mnemonicToWalletKey(await mnemonicNew(24));
        let restrictedKey = await mnemonicToWalletKey(await mnemonicNew(24));
        let source = RestrictedWalletCode.create({ masterKey: masterKey.publicKey, restrictedKey: restrictedKey.publicKey, workchain: 0, restrictedAddress: restrictedWallet.wallet.address });
        let walletAddress = await contractAddress(source);

        // Requirements
        expect((await client.getBalance(walletAddress)).toNumber()).toBe(0);
        expect((await client.getBalance(restrictedWallet.wallet.address)).toNumber()).toBe(0);

        // Fill wallet
        const seqno = await treasure.wallet.getSeqNo();
        await treasure.wallet.transfer({
            to: walletAddress,
            seqno: seqno,
            bounce: false,
            value: toNano(0.01),
            secretKey: treasure.secretKey
        });
        await awaitBalance(client, walletAddress, new BN(0));

        // Wallet
        // signingMessage = new WalletV1SigningMessage({
        //     seqno: args.seqno,
        //     sendMode: args.sendMode,
        //     order: args.order
        // });
    }, 60000);
});