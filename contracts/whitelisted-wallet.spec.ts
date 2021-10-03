import * as fs from 'fs';
import { Address, Cell, toNano, TonClient } from 'ton';
import { ContractSource } from 'ton/dist/contracts/sources/ContractSource';
import { openTestTreasure } from 'ton/dist/tests/openTestTreasure';
import { awaitBalance } from 'ton/dist/tests/awaitBalance';
import { BN } from 'bn.js';
import { createWalletKey } from './tests/createWalletKey';
import { delay } from '@openland/patterns';

export class RestrictedWalletCode implements ContractSource {

    static create(opts: { masterKey: Buffer, restrictedKey: Buffer, workchain: number, whitelistedAddress: Address, src: string }) {

        // Resolve parameters
        let masterKey = opts.masterKey;
        let restrictedKey = opts.restrictedKey;
        let workchain = opts.workchain;
        let whitelistedAddress = opts.whitelistedAddress;

        // Build initial code and data
        let initialCode = Cell.fromBoc(opts.src)[0];
        let initialData = new Cell();
        initialData.bits.writeUint(0, 32); // SeqNo
        initialData.bits.writeBuffer(restrictedKey); // Restricted key
        initialData.bits.writeBuffer(masterKey); // Master key
        initialData.bits.writeInt(whitelistedAddress.workChain, 8); // Workchain
        initialData.bits.writeBuffer(whitelistedAddress.hash); // Address hash

        return new RestrictedWalletCode({ masterKey, restrictedKey, whitelistedAddress, initialCode, initialData, workchain });
    }

    readonly masterKey: Buffer;
    readonly restrictedKey: Buffer;
    readonly whitelistedAddress: Address;
    readonly initialCode: Cell;
    readonly initialData: Cell;
    readonly workchain: number;
    readonly type = 'org.ton.wallets.whitelisted';
    readonly walletVersion = 'v1';

    private constructor(opts: {
        masterKey: Buffer,
        restrictedKey: Buffer,
        workchain: number,
        whitelistedAddress: Address,
        initialCode: Cell
        initialData: Cell
    }) {
        this.masterKey = opts.masterKey;
        this.restrictedKey = opts.restrictedKey;
        this.whitelistedAddress = opts.whitelistedAddress;
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
        let sourceBoc = fs.readFileSync(__dirname + '/whitelisted-wallet.cell');
        const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });

        // Open Treasure
        let treasure = await openTestTreasure(client);

        // Whitelisted wallet key
        let whitelistedWallet = await client.createNewWallet({ workchain: 0 });

        // Wallet that is allowed only for non-restricted key
        let foreignWallet = await client.createNewWallet({ workchain: 0 });

        // Wallet Keys
        let masterKey = await createWalletKey();
        let invalidKey = await createWalletKey();
        let restrictedKey = await createWalletKey();

        // Wallet
        const wallet = await client.openWalletFromCustomContract(RestrictedWalletCode.create({
            masterKey: masterKey.publicKey,
            restrictedKey: restrictedKey.publicKey,
            workchain: 0,
            whitelistedAddress: whitelistedWallet.wallet.address,
            src: sourceBoc.toString('hex')
        }));

        // Requirements
        expect((await client.getBalance(wallet.address)).toNumber()).toBe(0);
        expect((await client.getBalance(whitelistedWallet.wallet.address)).toNumber()).toBe(0);

        // Fill wallet
        const seqno = await treasure.wallet.getSeqNo();
        await treasure.wallet.transfer({
            to: wallet.address,
            seqno: seqno,
            bounce: false,
            value: toNano(0.1),
            secretKey: treasure.secretKey
        });
        await awaitBalance(client, wallet.address, new BN(0));

        // Send transfer via master key
        expect(await wallet.getSeqNo()).toBe(0);
        await wallet.transfer({
            seqno: 0,
            to: foreignWallet.wallet.address,
            value: toNano(0.005),
            secretKey: masterKey.secretKey,
            bounce: false
        });
        await awaitBalance(client, foreignWallet.wallet.address, new BN(0));

        // Send transfer via restricted key
        expect(await wallet.getSeqNo()).toBe(1);
        await wallet.transfer({
            seqno: 1,
            to: whitelistedWallet.wallet.address,
            value: toNano(0.005),
            secretKey: restrictedKey.secretKey,
            bounce: false
        });
        await awaitBalance(client, whitelistedWallet.wallet.address, new BN(0));

        // Send transfer via invalid key
        expect(await wallet.getSeqNo()).toBe(2);
        let initial = await client.getBalance(wallet.address);
        await wallet.transfer({
            seqno: 2,
            to: whitelistedWallet.wallet.address,
            value: toNano(0.005),
            secretKey: invalidKey.secretKey,
            bounce: false
        });
        await delay(15000);
        expect((await client.getBalance(wallet.address)).eq(initial)).toBe(true);

        // Send transfer via restireted key to non-whitelisted
        expect(await wallet.getSeqNo()).toBe(2);
        initial = await client.getBalance(wallet.address);
        await wallet.transfer({
            seqno: 2,
            to: foreignWallet.wallet.address,
            value: toNano(0.005),
            secretKey: restrictedKey.secretKey,
            bounce: false
        });
        await delay(15000);
        expect((await client.getBalance(wallet.address)).eq(initial)).toBe(true);

        // Result seqno
        expect(await wallet.getSeqNo()).toBe(2);

    }, 120000);
});