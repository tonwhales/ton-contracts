import { Cell, InternalMessage, Message, SendMode, serializeDict } from "ton";

export class HighloadWalletMessage implements Message {

    readonly seqno: number;
    readonly walletId: number;
    readonly timeout: number;
    readonly messages: { sendMode: SendMode, order: InternalMessage }[];

    constructor(args: { seqno: number, walletId: number, timeout: number, messages: { sendMode: SendMode, order: InternalMessage }[] }) {
        this.seqno = args.seqno;
        this.walletId = args.walletId;
        this.messages = args.messages;
        this.timeout = args.timeout;
    }

    writeTo(cell: Cell): void {

        // Build dict
        const dict = new Map<string, { sendMode: SendMode, order: InternalMessage }>();
        for (let i = 0; i < this.messages.length; i++) {
            dict.set('' + i, this.messages[i]);
        }
        const dictCell = serializeDict(dict, 16, (src, cell) => {
            cell.bits.writeUint8(src.sendMode);
            const d = new Cell();
            src.order.writeTo(d);
            cell.refs.push(d);
        });

        // Message
        cell.bits.writeUint(this.walletId, 32);
        cell.bits.writeUint(this.timeout, 32);
        cell.bits.writeUint(this.seqno, 32);
        cell.refs.push(dictCell);
    }
}