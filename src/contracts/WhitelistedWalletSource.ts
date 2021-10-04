import { Address, Cell, ConfigStore, ContractSource } from "ton";

export class WhitelistedWalletSource implements ContractSource {

    static readonly SOURCE = Buffer.from(
        'te6ccgEBBwEAsQABFP8A9KQT9LzyyAsBAgEgAgMCAUgEBQHa8u1E0NMf0//T/9IH0//RBYMI1xgg0x9RF7ryoQH5AVRwJfkQUTX5EAKzIrOwkvIi3gGzjpcgkyDXSo6O0wcx1FQxN9s8s5LyI97o0d74AJMg10qW0wfUAvsA6NEDpMjLHxLL/8v/ygfL/8ntVAYABNAwABGgmS/aiaGuFj8AMgLQ0wMBeLCTXwN/4PpAMfpAMPpEAroCurA=',
        'base64'
    );

    static create(opts: { masterKey: Buffer, restrictedKey: Buffer, workchain: number, whitelistedAddress: Address }) {

        // Resolve parameters
        let masterKey = opts.masterKey;
        let restrictedKey = opts.restrictedKey;
        let workchain = opts.workchain;
        let whitelistedAddress = opts.whitelistedAddress;

        // Build initial code and data
        let initialCode = Cell.fromBoc(WhitelistedWalletSource.SOURCE)[0];
        let initialData = new Cell();
        initialData.bits.writeUint(0, 32); // SeqNo
        initialData.bits.writeBuffer(restrictedKey); // Restricted key
        initialData.bits.writeBuffer(masterKey); // Master key
        initialData.bits.writeInt(whitelistedAddress.workChain, 8); // Workchain
        initialData.bits.writeBuffer(whitelistedAddress.hash); // Address hash

        return new WhitelistedWalletSource({ masterKey, restrictedKey, whitelistedAddress, initialCode, initialData, workchain });
    }

    static restore(backup: string) {
        const store = new ConfigStore(backup);
        return WhitelistedWalletSource.create({
            workchain: store.getInt('wc'),
            restrictedKey: store.getBuffer('pk'),
            masterKey: store.getBuffer('mk'),
            whitelistedAddress: store.getAddress('wa')
        });
    }

    readonly masterKey: Buffer;
    readonly restrictedKey: Buffer;
    readonly whitelistedAddress: Address;
    readonly initialCode: Cell;
    readonly initialData: Cell;
    readonly workchain: number;
    readonly type = 'org.ton.wallets.whitelisted';
    readonly walletVersion = 'v1'; // Conformance to wallet interface

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

    backup = () => {
        const config = new ConfigStore();
        config.setInt('wc', this.workchain);
        config.setBuffer('pk', this.restrictedKey);
        config.setBuffer('mk', this.masterKey);
        config.setAddress('wa', this.whitelistedAddress);
        return config.save();
    }
}