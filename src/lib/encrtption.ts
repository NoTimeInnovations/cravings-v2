import CryptoJS from "crypto-js";

export function encryptText({ id, role, feature_flags, status }: { id: string; role: string, feature_flags: string, status: string }) {
    const text = JSON.stringify({ id, role, feature_flags, status });
    return CryptoJS.AES.encrypt(text, process.env.NEXT_PUBLIC_ENCRYPTION_KEY as string).toString();
}

export function decryptText(cipherText: string): { id: string; role: string , feature_flags: string , status : string } {
    const bytes = CryptoJS.AES.decrypt(cipherText, process.env.NEXT_PUBLIC_ENCRYPTION_KEY as string);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedText);
}