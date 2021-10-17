import { Cell } from "ton";

export function createStringCell(message: string) {
    let res = new Cell();
    res.bits.writeString(message);
    return res;
}