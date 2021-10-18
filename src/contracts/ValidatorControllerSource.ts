import { Address, Cell, ConfigStore, ContractSource } from "ton";

export class ValidatorControllerSource implements ContractSource {

    static readonly SOURCE = Buffer.from(
        'te6ccgECCwEAAUAAART/APSkE/S88sgLAQIBIAIDAgFIBAUBvvLtRNDTH9P/0//6QCH6RALTH/gjAdEIgwjXGCDTH1EauvKhAfkBVHAo+RBROPkQUSKx8qIBs5JsMeMN+AAEpMjLHxPL/8v/Ac8WEssfye1U+A+TINdKltMH1AL7AOjRCgAE0DACASAGBwIBIAgJAEG+WX9qJoaY+Y6f+Y6f+Y/SAY6Y/o/BGA0MCAlgDQuFsEwAGbs5ztRNCAINch1wv/gAEbjJftRNDXCx+AD0UoKhgQEsufJmUwDXSvKlkyDXSo5h0wcBgQD8sPJk1AHQ0wP6QDH6QAH6RAL6ADHTatMfMATAAvKjURa6USe6ErDyo/JjIIIQTnN0S7qRMI4kIIIQR2V0JLqRMI4XIIIQUmdDcLqRMJuCEFZ0Q3C6kvIj3+Li4uhsItE=',
        'base64'
    );

    static create(opts: { masterKey: Buffer, restrictedKey: Buffer, workchain: number, whitelistedAddress: Address }) {

        // Resolve parameters
        let masterKey = opts.masterKey;
        let restrictedKey = opts.restrictedKey;
        let workchain = opts.workchain;
        let whitelistedAddress = opts.whitelistedAddress;

        // Build initial code and data
        let initialCode = Cell.fromBoc(ValidatorControllerSource.SOURCE)[0];
        let initialData = new Cell();
        initialData.bits.writeUint(0, 32); // SeqNo
        initialData.bits.writeBuffer(restrictedKey); // Restricted key
        initialData.bits.writeBuffer(masterKey); // Master key
        initialData.bits.writeAddress(whitelistedAddress); // Whitelisted address
        initialData.bits.writeUint(0, 32); // Last restricted tx

        return new ValidatorControllerSource({ masterKey, restrictedKey, whitelistedAddress, initialCode, initialData, workchain });
    }

    static restore(backup: string) {
        const store = new ConfigStore(backup);
        return ValidatorControllerSource.create({
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
    readonly type = 'org.ton.validator.controller';
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

    describe = () => {
        return 'Validator Controller. Address: ' + this.whitelistedAddress.toFriendly() + ', Master Key: ' + this.masterKey.toString('hex')+ ', Default Key: ' + this.restrictedKey.toString('hex')
    };
}