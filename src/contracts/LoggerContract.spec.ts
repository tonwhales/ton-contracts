import { Cell, toNano, TonClient } from "ton";
import { LoggerContract } from "./LoggerContract";
import { createStringCell } from "./tests/createStringCell";
import { topUpAddress } from "./tests/topUpAddress";
import * as fs from 'fs';
import { LoggerContractSource } from "./LoggerContractSource";
import { awaitCondition } from "ton/dist/tests/awaitCondition";

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });

describe('LoggerContract', () => {
    it('should conform to sources', () => {
        let source = fs.readFileSync(__dirname + '/../../contracts/logger.cell');
        expect(LoggerContractSource.SOURCE.toString('base64')).toEqual(source.toString('base64'));
    });
    it('should create logger contract', async () => {
        // Create logger
        let logger = await LoggerContract.createRandom(client);
        console.warn(logger.address.toFriendly());
        await topUpAddress(client, logger.address, toNano(0.1));

        // Send external
        const data = createStringCell('Hello world!');
        await client.sendExternalMessage(logger, data);
        await awaitCondition(12000, async () => (await logger.getSeqno()) > 0);

        // Get external messages
        let res = await logger.getExternalMessages();
        expect(res.length).toBe(1);
        expect(res[0].inMessage).not.toBeNull();
        expect(res[0].inMessage!.body).not.toBeNull();
        expect(res[0].inMessage!.body!.type).toBe('data');
        expect(Cell.fromBoc((res[0].inMessage!.body! as any).data)[0].bits.toFiftHex()).toEqual(data.bits.toFiftHex());

        // Get internal messages
        res = await logger.getInternalMessages();
        expect(res.length).toBe(1);
        expect(res[0].inMessage).not.toBeNull();
        expect(res[0].inMessage!.body).not.toBeNull();
        expect(res[0].inMessage!.body!.type).toBe('data');
        expect(Cell.fromBoc((res[0].inMessage!.body! as any).data)[0].bits.toFiftHex()).toEqual('');
    }, 120000);
});