import { Address, Cell, InternalMessage, TonClient } from 'ton';
import { sign } from 'ton-crypto';
import { HighloadWalletMessage } from './messages/HighloadWalletMessage';

export class HighloadWallet {
    readonly address: Address;
    readonly client: TonClient;

    constructor(address: Address, client: TonClient) {
        this.address = address;
        this.client = client;
    }

    async getSeqNo() {
        if (await this.client.isContractDeployed(this.address)) {
            let res = await this.client.callGetMethod(this.address, 'seqno');
            return parseInt(res.stack[0][1], 16);
        } else {
            return 0;
        }
    }

    async createTransfer(args: { seqno: number, walletId: number, timeout: number, secretKey: Buffer, messages: { sendMode: number, order: InternalMessage }[] }) {

        // Prepare message
        const message = new HighloadWalletMessage({
            seqno: args.seqno,
            walletId: args.walletId,
            timeout: args.timeout,
            messages: args.messages
        });

        // Sign message
        const toSign = new Cell();
        message.writeTo(toSign);
        let signature = sign(await toSign.hash(), args.secretKey);

        // Result
        const body = new Cell();
        body.bits.writeBuffer(signature);
        message.writeTo(body);

        return body;
    }
}