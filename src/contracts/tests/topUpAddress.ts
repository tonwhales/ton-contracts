import BN from "bn.js";
import { Address, TonClient } from "ton";
import { awaitBalance } from "ton/dist/tests/awaitBalance";
import { openTestTreasure } from "ton/dist/tests/openTestTreasure";

export async function topUpAddress(client: TonClient, address: Address, amount: BN) {
    let treasure = await openTestTreasure(client);
    const seqno = await treasure.wallet.getSeqNo();
    await treasure.wallet.transfer({
        to: address,
        seqno: seqno,
        bounce: false,
        value: amount,
        secretKey: treasure.secretKey
    });
    await awaitBalance(client, address, new BN(0));
}