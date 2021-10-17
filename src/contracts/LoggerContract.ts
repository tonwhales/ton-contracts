import { randomBytes } from "crypto";
import { Address, Contract, ContractSource } from "ton";
import { contractAddress } from "ton/dist/contracts/sources/ContractSource";
import { LoggerContractSource } from "./LoggerContractSource";

export class LoggerContract implements Contract {

    static async create(source: LoggerContractSource) {
        return new LoggerContract(source, await contractAddress(source));
    }

    static async createRandom(workchain: number = 0) {
        return LoggerContract.create(LoggerContractSource.create({ seed: randomBytes(64), workchain }));
    }

    readonly source: ContractSource;
    readonly address: Address;

    private constructor(source: ContractSource, address: Address) {
        this.source = source;
        this.address = address;
    }
}