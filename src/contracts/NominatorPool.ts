import { Address, Contract, TonClient, ContractSource, ExternalMessage, CommonMessageInfo, StateInit, contractAddress } from "ton";
import { NominatorPoolSource } from "./NominatorPoolSource";

export class NominatorPool implements Contract {

    static async create(client: TonClient, source: NominatorPoolSource) {
        return new NominatorPool(client, source, await contractAddress(source));
    }

    readonly source: ContractSource;
    readonly address: Address;
    readonly client: TonClient;

    private constructor(client: TonClient, source: ContractSource, address: Address) {
        this.source = source;
        this.address = address;
        this.client = client;
    }

    async deploy() {
        await this.client.sendMessage(new ExternalMessage({
            to: this.address,
            body: new CommonMessageInfo({ stateInit: new StateInit({ code: this.source.initialCode, data: this.source.initialData }) })
        }));
    }

    async getNominatorsList() {
        console.warn(JSON.stringify((await this.client.callGetMethod(this.address, 'nominators_list')).stack));
    }
}