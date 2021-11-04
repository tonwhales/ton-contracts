import { Address, Cell, ConfigStore, ContractSource } from "ton";

export class NominatorPoolSource implements ContractSource {

    static readonly SOURCE = Buffer.from(
        'te6ccgECFAEAAh0AART/APSkE/S88sgLAQIBIAIDAgLOBAUALPIw8AcmwACXBqQG8Aj4AJVfB/LAZOICASAGBwIBSBARAgEgCAkCASAKCwDBQB0NMD+kAwIPpEA3Gwkl8F4PAHCtMfIbOUMfADMZEw4oIQc3Rha7qOMYIQO5rKAFG7oVIMvvLhiVEaoFR5aPAKURygLKAQSxA4SgDwCxA2RUAQNxAn8AgB8AbgXwvywZSADxVwAdMHIcBsjhVsEtMXAYIIb2NruvLh+YIQbG9ja1neIcByjhhsEtMvAYIgZWNvdmVyuvLh+YIQcmVjb1neIcBzjhZsEtMfAYIQdGFrZbry4fmCEHN0YWtZ3gHAd44YMdM3AYIoaXRoZHJhd7ry4fmCEHdpdGgB3gGAIBIAwNAgEgDg8AOxwIHGOFAN6qQymMCSoEqADqgcCpCHAAEQw5jBsEoABZIIQO5rKAKkMAfAEAaoCQTDPAYAuAcsHAfAEeSKhl4AwUAPLBwLkAaoCEs8BgAGcgjggYWNjZXB0ZWSCIHN0YWtlIHAggBjIywVQBs8WIfoCFctqFMsfE8svAfAFy0fJcvsAgACU7UTQ0x/6QNP/0wD6APoA9AQwgADFAbIyx9QBc8WE8v/ywAB+gIB+gL0AMntVIAgEgEhMAJygAYMH9A5vobOTMHAg4PoA+gAwgAD8WqBTIaDCAJ3IUAP6AgH6AgKDB/RDmGwhAYMH9Fsw4oA==',
        'base64'
    );

    static create(opts: { owner: Address, workchain: number, seed?: Buffer }) {

        const owner = opts.owner;
        const workchain = opts.workchain;
        const seed = opts.seed ? opts.seed : Buffer.alloc(32, 0);
        if (seed.length !== 32) {
            throw Error('Seed must be 32 bytes');
        }

        // Build initial code and data
        let initialCode = Cell.fromBoc(NominatorPoolSource.SOURCE)[0];
        let initialData = new Cell();

        // data: seq
        initialData.bits.writeUint(0, 32);
        // data: owner
        initialData.bits.writeAddress(owner);
        // data: seed
        initialData.bits.writeBuffer(seed);
        // data: enable_staking
        initialData.bits.writeBit(1);
        // data: working coins
        initialData.bits.writeCoins(0);
        // data: locked coins
        initialData.bits.writeCoins(0);
        // data: empty dict
        initialData.bits.writeBit(0);

        return new NominatorPoolSource({ initialCode, initialData, workchain, seed, owner });
    }

    static restore(backup: string) {
        const store = new ConfigStore(backup);
        return NominatorPoolSource.create({
            owner: store.getAddress('owner'),
            workchain: store.getInt('wc'),
            seed: store.getBuffer('seed')
        });
    }

    readonly initialCode: Cell;
    readonly initialData: Cell;
    readonly workchain: number;
    readonly seed: Buffer;
    readonly owner: Address;
    readonly type = 'con.tonwhales.nominators.v1';

    private constructor(args: { initialCode: Cell, initialData: Cell, workchain: number, seed: Buffer, owner: Address }) {
        this.initialCode = args.initialCode;
        this.initialData = args.initialData;
        this.workchain = args.workchain;
        this.seed = args.seed;
        this.owner = args.owner;
    }

    describe() {
        return 'Nominator Pool of ' + this.owner.toFriendly() + '#' + this.seed.toString('hex');
    }

    backup() {
        const config = new ConfigStore();
        config.setAddress('owner', this.owner);
        config.setBuffer('seed', this.seed);
        config.setInt('wc', this.workchain);
        return config.save();
    }
}