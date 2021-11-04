import { Address, Cell, ConfigStore, ContractSource } from "ton";

export class NominatorPoolSource implements ContractSource {

    static readonly SOURCE = Buffer.from(
        'te6ccgECFgEAAkwAART/APSkE/S88sgLAQIBIAIDAgFIBAUALPIw8AYmwACXBqQG8Af4AJVfB/LAZOICAswGBwBdoNOB4AzYwtsJ/xxARQYP6PzfSkEcIgX0AfQAYN4EpCDeBKAG3gQFImXEA2fMYGMCASAICQIBSBITAgEgCgsCASAMDQC/QB0NMD+kAwIPpEA3Gwkl8F4PAGCtMfIbOUMfADMZEw4oIQc3Rha7qOMIIQO5rKAFG7oVIMvvLhiQaz8uGKKaBTh/AIURugEDpJAPAJEDZFQBA3ECfwBwHwCuBfC/LBlIAPFXAB0wchwGyOFWwS0xcBgghvY2u68uH5ghBsb2NrWd4hwHKOGGwS0y8BgiBlY292ZXK68uH5ghByZWNvWd4hwHOOFmwS0x8BghB0YWtluvLh+YIQc3Rha1neAcB3jhgx0zcBgihpdGhkcmF3uvLh+YIQd2l0aAHeAYAgEgDg8CASAQEQA7HAgcY4UA3qpDKYwJKgSoAOqBwKkIcAARDDmMGwSgAFkghA7msoAqQwB8AQBqgJBMM8BgC4BywcB8AR5IqGXgDBQA8sHAuQBqgISzwGAAJTtRNDTH/pA0//TAPoA+gD0BDCAAMQGyMsfUAXPFhPL/8sAAfoCAfoC9ADJ7VSACASAUFQBnSCOCBhY2NlcHRlZIIgc3Rha2UgcCCAGMjLBVAGzxYh+gIVy2oUyx8Tyy8B8AXLR8lx+wCAAlAGDB/QOb6GzkzBwIOD6APoAMIAA1FygwgCcyFj6AgH6AgKDB/RDl1sBgwf0WzDig',
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