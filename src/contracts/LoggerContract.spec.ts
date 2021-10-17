import { toNano, TonClient } from "ton";
import { LoggerContract } from "./LoggerContract";
import { createStringCell } from "./tests/createStringCell";
import { topUpAddress } from "./tests/topUpAddress";
import * as fs from 'fs';
import { LoggerContractSource } from "./LoggerContractSource";

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });

describe('LoggerContract', () => {
    it('should conform to sources', () => {
        let source = fs.readFileSync(__dirname + '/../../contracts/logger.cell');
        expect(LoggerContractSource.SOURCE.toString('base64')).toEqual(source.toString('base64'));
    });
    it('should create logger contract', async () => {
        // Create logger
        let logger = await LoggerContract.createRandom();
        console.warn(logger.address.toFriendly());
        await topUpAddress(client, logger.address, toNano(0.1));

        // Send external
        await client.sendExternalMessage(logger, createStringCell('Hello world!'));
    }, 120000);
});