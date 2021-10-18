import { Wallet } from "ton";
import { awaitCondition } from "ton/dist/tests/awaitCondition";

export async function awaitSeqno(wallet: Wallet, seqno: number) {
    await awaitCondition(30000, async () => (await wallet.getSeqNo()) >= seqno);
}