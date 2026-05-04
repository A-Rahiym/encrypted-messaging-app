const enc = new TextEncoder();
const dec = new TextDecoder();

function normalizeB64(s) {
    s = (s || '').trim().replace(/\s+/g, '');
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return s;
}

export function bufToB64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export function b64ToBuf(b64) {
    const bin = atob(normalizeB64(b64));
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
}

export async function generateKeyPair() {
    return crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
    );
}

export async function exportPublicKey(publicKey) {
    const spki = await crypto.subtle.exportKey('spki', publicKey);
    return bufToB64(spki);
}

export async function importPublicKey(b64) {
    return crypto.subtle.importKey(
        'spki',
        b64ToBuf(b64),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
    );
}

export function generateSalt() {
    return bufToB64(crypto.getRandomValues(new Uint8Array(16)).buffer);
}




export async function deriveWrappingKey(password, saltB64) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: b64ToBuf(saltB64),
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}




export async function wrapPrivateKey(privateKey, wrappingKey) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        wrappingKey,
        exported
    );

    return JSON.stringify({
        ciphertext: bufToB64(ciphertext),
        iv: bufToB64(iv.buffer),
    });
}

export async function unwrapPrivateKey(wrappedJson, wrappingKey) {
    const { ciphertext, iv } = JSON.parse(wrappedJson);
    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64ToBuf(iv) },
        wrappingKey,
        b64ToBuf(ciphertext)
    );

    return crypto.subtle.importKey(
        'pkcs8',
        plaintext,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['decrypt']
    );
}







export async function encryptMessage(plaintext, recipientPublicKey, ownPublicKey) {
    const aesKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const cipherBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        enc.encode(plaintext)
    );

    const aesKeyRaw = await crypto.subtle.exportKey('raw', aesKey);

    const encryptedKey = bufToB64(
        await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipientPublicKey, aesKeyRaw)
    );

    const encryptedKeyForSelf = bufToB64(
        await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, ownPublicKey, aesKeyRaw)
    );

    return {
        ciphertext: bufToB64(cipherBuf),
        iv: bufToB64(iv.buffer),
        encryptedKey,
        encryptedKeyForSelf,
    };
}

export async function decryptMessage(payload, privateKey, isSelf = false) {
    const { ciphertext, iv, encryptedKey, encryptedKeyForSelf } = payload;
    const keyB64 = isSelf ? encryptedKeyForSelf : encryptedKey;

    const aesKeyRaw = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        b64ToBuf(keyB64)
    );

    const aesKey = await crypto.subtle.importKey(
        'raw',
        aesKeyRaw,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );

    const plainBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64ToBuf(iv) },
        aesKey,
        b64ToBuf(ciphertext)
    );

    return dec.decode(plainBuf);
}