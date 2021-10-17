import { Cell, ConfigStore, ContractSource } from "ton";

export class LoggerContractSource implements ContractSource {

    static readonly SOURCE = Buffer.from(
        'te6ccgEBBgEAdgABFP8A9KQT9LzyyAsBAgEgAgMCAUgEBQBq8vkB7UTQ0x+DCNcY9AQwUzCDB/QOb6ExkvIA3nHIywBARIMH9EP4AAGkyMsfWM8W9ADJ7VQANtAw7UTQ0x+DCNcY9AQwAqTIyx8Bzxb0AMntVAARoJkv2omhrhY/',
        'base64'
    );

    static create(opts: { seed: Buffer, workchain: number }) {

        // Sanity check
        if (opts.seed.length !== 64) {
            throw Error('Seed must be 64 bytes long');
        }

        // Resolve parameters
        let workchain = opts.workchain;
        let seed = opts.seed;

        // Build initial code and data
        let initialCode = Cell.fromBoc(LoggerContractSource.SOURCE)[0];
        let initialData = new Cell();
        initialData.bits.writeUint(0, 32);
        initialData.bits.writeBuffer(opts.seed);
        initialData.bits.writeBit(0);

        return new LoggerContractSource({ initialCode, initialData, workchain, seed });
    }

    static restore(backup: string) {
        const store = new ConfigStore(backup);
        return LoggerContractSource.create({
            workchain: store.getInt('wc'),
            seed: store.getBuffer('seed')
        });
    }

    readonly initialCode: Cell;
    readonly initialData: Cell;
    readonly workchain: number;
    readonly seed: Buffer;
    readonly type = 'org.ton.logger';

    private constructor(args: { initialCode: Cell, initialData: Cell, seed: Buffer, workchain: number }) {
        this.initialCode = args.initialCode;
        this.initialData = args.initialData;
        this.workchain = args.workchain;
        this.seed = args.seed;
    }

    describe() {
        return 'Logger Contract #' + this.seed.toString('hex');
    }

    backup() {
        const config = new ConfigStore();
        config.setBuffer('seed', this.seed);
        config.setInt('wc', this.workchain);
        return config.save();
    }
}