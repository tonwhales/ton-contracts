import { createWalletKey } from "./tests/createWalletKey";
import { WalletV4Contract } from "./WalletV4Contract";
import { WalletV4Source } from "./WalletV4Source";
import { SmartContract } from "ton-contract-executor";
import BN from "bn.js";
import { CellMessage, CommonMessageInfo, EmptyMessage, ExternalMessage, InternalMessage, SendMode } from "ton";
import { parseActionsList } from "./tests/parseActionsList";

describe('WalletV4Contract', () => {
    it('should perform transfers', async () => {
        const walletKey = await createWalletKey();
        const source = WalletV4Source.create({ workchain: 0, publicKey: walletKey.publicKey });
        const contract = await WalletV4Contract.create(source);
        const instance = await SmartContract.fromCell(contract.source.initialCode, contract.source.initialData);

        // Check seqno
        let res = await instance.invokeGetMethod('seqno', []);
        expect(res.type).toEqual('success');
        if (res.type === 'success') {
            expect(res.result.length).toBe(1);
            expect((res.result[0] as BN).eq(new BN(0))).toBe(true);
        }

        // Send external
        res = await instance.sendExternalMessage(new ExternalMessage({
            to: contract.address,
            body: new CommonMessageInfo({
                body: new CellMessage(await contract.createTransfer({
                    seqno: 0,
                    sendMode: SendMode.IGNORE_ERRORS,
                    walletId: source.walletId,
                    secretKey: walletKey.secretKey,
                    order: new InternalMessage({
                        to: contract.address,
                        value: new BN(1123),
                        bounce: true,
                        body: new CommonMessageInfo({
                            body: new EmptyMessage()
                        })
                    })
                }))
            })
        }));
        expect(res.type).toEqual('success');
        if (res.type === 'success') {
            expect(res.action_list_cell).not.toBeUndefined();
            expect(res.action_list_cell).not.toBeNull();
            const actions = parseActionsList(res.action_list_cell!);
            expect(actions.length).toBe(1);
            expect(actions[0].type).toEqual('send_msg');
            if (actions[0].type === 'send_msg') {
                expect(actions[0].mode).toBe(SendMode.IGNORE_ERRORS);
                expect(actions[0].message.info.dest!.equals(contract.address)).toBe(true);
                expect(actions[0].message.info.type).toEqual('internal');
                if (actions[0].message.info.type === 'internal') {
                    expect(actions[0].message.info.value.coins.eq(new BN(1123))).toBe(true);
                }
            }
        }
    });
});