import { toNano, TonClient } from "ton";
import { openTestTreasure } from "ton/dist/tests/openTestTreasure";
import { LoggerContract } from "./LoggerContract";
import { createStringCell } from "./tests/createStringCell";
import { topUpAddress } from "./tests/topUpAddress";

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });

describe('LoggerContract', () => {
    it('should create logger contract', async () => {
        // Create logger
        let logger = await LoggerContract.createRandom();
        console.warn(logger.address.toFriendly());
        await topUpAddress(client, logger.address, toNano(1));

        // Send external
        await client.sendExternalMessage(logger, createStringCell('Hello world!'));
    }, 120000);
});