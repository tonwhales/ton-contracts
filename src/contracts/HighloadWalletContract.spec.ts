import { HighloadWalletSource } from './HighloadWalletSource';
import { SmartContract } from "ton-contract-executor";
import { createWalletKey } from './tests/createWalletKey';
import { CellMessage, CommonMessageInfo, contractAddress, EmptyMessage, ExternalMessage, InternalMessage, SendMode, TonClient } from 'ton';
import { HighloadWalletContract } from './HighloadWalletContract';
import BN from 'bn.js';
import { parseActionsList } from './tests/parseActionsList';

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });

describe('HighloadWalletContract', () => {
    it('should perform transfers', async () => {
        const walletKey = await createWalletKey();
        const source = HighloadWalletSource.create({ workchain: 0, publicKey: walletKey.publicKey })
        const address = await contractAddress(source);
        const contractInterface = new HighloadWalletContract(address, client);
        const contract = await SmartContract.fromCell(source.initialCode, source.initialData);
        const result = await contract.sendExternalMessage(new ExternalMessage({
            to: address,
            body: new CommonMessageInfo({
                body: new CellMessage(await contractInterface.createTransfer({
                    seqno: 0,
                    walletId: 0,
                    timeout: Math.floor(Date.now() / 1000 + 1000),
                    secretKey: walletKey.secretKey,
                    messages: [{
                        sendMode: SendMode.IGNORE_ERRORS,
                        order: new InternalMessage({
                            to: address,
                            value: new BN(1),
                            bounce: true,
                            body: new CommonMessageInfo({ body: new EmptyMessage() })
                        })
                    }]
                }))
            })
        }));
        expect(result.type).toBe('success');
        expect(result.exit_code).toBe(0);
        if (result.type === 'success') {
            const res = parseActionsList(result.action_list_cell!);
            expect(res.length).toBe(1);
            expect(res[0].type).toEqual('send_msg');
            if (res[0].type === 'send_msg') {
                expect(res[0].mode).toBe(SendMode.IGNORE_ERRORS);
                expect(res[0].message.info.dest!.equals(address)).toBe(true);
            }
        }
    });
});