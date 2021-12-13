import { Cell, ConfigStore, ContractSource } from "ton";
import { Maybe } from "ton/dist/types";

export class HighloadWalletSource implements ContractSource {

    static readonly SOURCE = Buffer.from(
        'te6ccgEBCAEAlwABFP8A9KQT9LzyyAsBAgEgAgMCAUgEBQC48oMI1xgg0x/TH9MfAvgju/Jj7UTQ0x/TH9P/0VEyuvKhUUS68qIE+QFUEFX5EPKj9ATR+AB/jhYhgBD0eG+lIJgC0wfUMAH7AJEy4gGz5lsBpMjLH8sfy//J7VQABNAwAgFIBgcAF7s5ztRNDTPzHXC/+AARuMl+1E0NcLH4',
        'base64'
    );

    static create(opts: { workchain: number, publicKey: Buffer, walletId?: Maybe<number> }) {

        // Build initial code and data
        const walletId = opts.walletId ? opts.walletId : 0;
        let initialCode = Cell.fromBoc(HighloadWalletSource.SOURCE)[0];
        let initialData = new Cell();
        initialData.bits.writeUint(0, 32);
        initialData.bits.writeUint(walletId, 32);
        initialData.bits.writeBuffer(opts.publicKey);

        return new HighloadWalletSource({ initialCode, initialData, workchain: opts.workchain, walletId, publicKey: opts.publicKey });
    }

    static restore(backup: string) {
        const store = new ConfigStore(backup);
        return HighloadWalletSource.create({
            workchain: store.getInt('wc'),
            publicKey: store.getBuffer('pk'),
            walletId: store.getInt('walletId'),
        });
    }

    readonly initialCode: Cell;
    readonly initialData: Cell;
    readonly walletId: number;
    readonly workchain: number;
    readonly publicKey: Buffer;
    readonly type = 'org.ton.wallets.highload';

    private constructor(args: { initialCode: Cell, initialData: Cell, workchain: number, walletId: number, publicKey: Buffer }) {
        this.initialCode = args.initialCode;
        this.initialData = args.initialData;
        this.workchain = args.workchain;
        this.walletId = args.walletId;
        this.publicKey = args.publicKey;
    }

    describe() {
        return 'Highload Wallet #' + this.walletId;
    }

    backup() {
        const config = new ConfigStore();
        config.setInt('wc', this.workchain);
        config.setBuffer('pk', this.publicKey);
        config.setInt('walletId', this.walletId);
        return config.save();
    }
}