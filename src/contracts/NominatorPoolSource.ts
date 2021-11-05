import { Address, Cell, ConfigStore, ContractSource } from "ton";

export class NominatorPoolSource implements ContractSource {

    static readonly SOURCE = Buffer.from(
        'te6ccgECHgEAA14AART/APSkE/S88sgLAQIBIAIDAgFIBAUALPIw8AYmwACXBqQG8Af4AJVfB/LAZOICAswGBwIBIBwdAgEgCAkCASAUFQIBIAoLAgEgDg8C9UAdDTA/pAMCD6RANxsJJfBeDwBgrTHyGzlDHwAzGRMOIgghBzdGFruo41MIIQO5rKAFG7oVIMvvLhiQaz8uGKKaBTh/AIIPLRilEboBA6SQDwCRA2RUAQNxAn8AcB8ArgNyaCEGxvY2u64wIGghB3aXRouuMCXwrywZSAwNAPFXAB0wchwGyOFWwS0xcBgghvY2u68uH5ghBsb2NrWd4hwHKOGGwS0y8BgiBlY292ZXK68uH5ghByZWNvWd4hwHOOFmwS0x8BghB0YWtluvLh+YIQc3Rha1neAcB3jhgx0zcBgihpdGhkcmF3uvLh+YIQd2l0aAHeAYAGA2CYIQO5rKAL7y4YlTdvAI8tGKILPy0YtwUaGhUWGgSYoo8AkQNkVAEDdBgPAH8AsAYAmCEDuaygC+8uGJU3bwCCCz8tGKAbPy0YtRVaFwIBA6ECnwCRA2RUAQN0hw8AfwDAIBIBARAgEgEhMAOxwIHGOFAN6qQymMCSoEqADqgcCpCHAAEQw5jBsEoABZIIQO5rKAKkMAfAEAaoCQTDPAYAuAcsHAfAEeSKhl4AwUAPLBwLkAaoCEs8BgACU7UTQ0x/6QNP/0wD6APoA9AQwgADEBsjLH1AFzxYTy//LAAH6AgH6AvQAye1UgAgEgFhcAd9QXQ7tLo0Mjkwu7C2EDM5N7aQNze2tLcwujS3txA4N7e2OBBADGRlgqgC54soAf0BCeW1ZY/l++S4/YBAIBIBgZAgEgGhsAJQBgwf0Dm+hs5MwcCDg+gD6ADCAANRcoMIAnMhY+gIB+gICgwf0Q5dbAYMH9Fsw4oABnII4IGFjY2VwdGVkgiBzdGFrZSBwIIAYyMsFUAbPFiH6AhXLahTLHxPLLwHwBctHyXH7AIABjIIoIGxvY2tlZIIgc3Rha2UgcCCAGMjLBVAGzxYh+gIVy2oUyx8Tyy8B8AXLN8lx+wCAAXb9OB4AzYwtsJ/xxARQYP6PzfSkEcIgX0AfQAYN4EpCDeBKAG3gQFImXEA2fMYGMABu8tgeAMYNiF8E7eRGCzA==',
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