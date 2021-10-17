import assert from "assert";
import BN from "bn.js";
import { Cell, Message } from "ton";

export class ElectorCommandNewStake implements Message {

    private readonly queryId: BN;
    private readonly publicKey: Buffer;
    private readonly stakeAt: number;
    private readonly maxFactor: number;
    private readonly adnlAddress: Buffer;
    private readonly signature: Buffer;

    constructor(args: {
        queryId: BN,
        publicKey: Buffer,
        stakeAt: number,
        maxFactor: number,
        adnlAddress: Buffer,
        signature: Buffer
    }) {
        this.queryId = args.queryId;
        this.publicKey = args.publicKey;
        this.stakeAt = args.stakeAt;
        this.maxFactor = args.maxFactor;
        this.adnlAddress = args.adnlAddress;
        this.signature = args.signature;
        assert(this.publicKey.length === 32);
        assert(this.adnlAddress.length === 32);
    }

    writeTo(cell: Cell): void {
        cell.bits.writeUint(0x4e73744b, 32);
        cell.bits.writeUint(this.queryId, 64);
        cell.bits.writeBuffer(this.publicKey);
        cell.bits.writeUint(this.stakeAt, 32);
        cell.bits.writeUint(Math.round(this.maxFactor * 65536), 32);
        cell.bits.writeBuffer(this.adnlAddress);

        // Signature
        let sign = new Cell();
        sign.bits.writeBuffer(this.signature);
        cell.refs.push(sign);
    }
}