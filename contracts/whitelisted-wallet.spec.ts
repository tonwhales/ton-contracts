import * as fs from 'fs';
import { Address, Cell, CommonMessageInfo, Contract, createWalletTransferV1, InternalMessage, toNano, TonClient } from 'ton';
import { mnemonicNew, mnemonicToWalletKey } from 'ton-crypto';
import { contractAddress, ContractSource } from 'ton/dist/contracts/sources/ContractSource';
import { openTestTreasure } from 'ton/dist/tests/openTestTreasure';
import { awaitBalance } from 'ton/dist/tests/awaitBalance';
import { BN } from 'bn.js';

export class RestrictedWalletCode implements ContractSource {

    static create(opts: { masterKey: Buffer, restrictedKey: Buffer, workchain: number, restrictedAddress: Address, src: string }) {

        // Resolve parameters
        let masterKey = opts.masterKey;
        let restrictedKey = opts.restrictedKey;
        let workchain = opts.workchain;
        let restrictedAddress = opts.restrictedAddress;

        // Build initial code and data
        let initialCode = Cell.fromBoc(opts.src)[0];
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

class RestrictedWalletContract implements Contract {
    readonly address: Address;
    readonly source: RestrictedWalletCode;
    constructor(address: Address, source: RestrictedWalletCode) {
        this.address = address;
        this.source = source;
    }
}

describe('whitelisted-wallet', () => {
    // it('should work', () => {
    //     let source = fs.readFileSync(__dirname + '/whitelisted-wallet.cell');
    //     console.warn(source.toString('hex'));
    // });
    it('should work', async () => {
        let sourceBoc = fs.readFileSync(__dirname + '/whitelisted-wallet.cell');

        const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });
        let treasure = await openTestTreasure(client);
        let restrictedWallet = await client.createNewWallet({ workchain: 0 });
        let masterKey = await mnemonicToWalletKey(await mnemonicNew(24));
        let restrictedKey = await mnemonicToWalletKey(await mnemonicNew(24));
        let source = RestrictedWalletCode.create({ masterKey: masterKey.publicKey, restrictedKey: restrictedKey.publicKey, workchain: 0, restrictedAddress: restrictedWallet.wallet.address, src: sourceBoc.toString('hex') });
        let walletAddress = await contractAddress(source);
        let contract = new RestrictedWalletContract(walletAddress, source);
        console.warn('Initing ' + walletAddress.toFriendly());


        // Requirements
        expect((await client.getBalance(walletAddress)).toNumber()).toBe(0);
        expect((await client.getBalance(restrictedWallet.wallet.address)).toNumber()).toBe(0);

        // Fill wallet
        const seqno = await treasure.wallet.getSeqNo();
        await treasure.wallet.transfer({
            to: walletAddress,
            seqno: seqno,
            bounce: false,
            value: toNano(1),
            secretKey: treasure.secretKey
        });
        await awaitBalance(client, walletAddress, new BN(0));

        // Send transfer via master key
        let transfer = await createWalletTransferV1({
            seqno: 0,
            sendMode: 3,
            order: new InternalMessage({
                to: treasure.wallet.address,
                value: toNano(0.05),
                bounce: false,
                body: new CommonMessageInfo()
            }),
            secretKey: masterKey.secretKey
        });
        await client.sendExternalMessage(contract, transfer);

    }, 60000);
});