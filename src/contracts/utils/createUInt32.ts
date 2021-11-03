export function createUInt32(src: number) {
    let res = Buffer.alloc(4);
    res.writeUInt32BE(src);
    return res;
}