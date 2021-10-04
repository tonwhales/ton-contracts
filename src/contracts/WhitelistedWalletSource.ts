import { Address, Cell, ConfigStore, ContractSource } from "ton";

export class WhitelistedWalletSource implements ContractSource {

    static readonly SOURCE = Buffer.from(
        'te6ccgECDAEAAREAART/APSkE/S88sgLAQIBIAIDAgFIBAUC9vLtRNDTH9P/0//6QCH6RALTH9EHgwjXGCDTH1EZuvKhAfkBVHAn+RBRN/kQUSKx8qIBs46v+CNQCKGBBwi58mb4I1N310rypZMg10qOkdMHAYEA/LDyZNRUMTTbPPKj6Gwi0QWSbCHi+AAEpMjLHxPL/8v/Ac8WEssfyQoLAATQMAIBIAYHAgEgCAkAR75Zf2omhpj5jp/5jp/5j9IBjpj+j8EamA0MCDhFzJANDwLbhAAXuznO1E0NMfMdcL/4ABG4yX7UTQ1wsfgAMgLQ0wMBeLCTXwNw4PpAMfpAMPpEAroCurAAIu1U+A+TINdKltMH1AL7AOjR',
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
        initialData.bits.writeAddress(whitelistedAddress); // Whitelisted address
        initialData.bits.writeUint(0, 32); // Last restricted tx

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