import crypto from 'crypto';
import { Decipher, Cipher } from 'node:crypto';

const SECRET_KEY = 'JiangPan';

function createDecipheriv(key: string): Decipher {
  const keyAndIv: string = crypto.createHash('md5')
    .update(SECRET_KEY + key)
    .digest('hex')
    .toUpperCase();

  const halfKeyLen = keyAndIv.length / 2;
  const secretKey = keyAndIv.slice(0, halfKeyLen);
  const iv = keyAndIv.slice(halfKeyLen);

  return crypto.createDecipheriv(
    'aes-128-cbc',
    Buffer.from(secretKey, 'utf-8'),
    Buffer.from(iv, 'utf-8'),
  );
}

function createCipher(key: string): Cipher {
  const keyAndIv: string = crypto.createHash('md5')
    .update(SECRET_KEY + key)
    .digest('hex')
    .toUpperCase();

  const halfKeyLen = keyAndIv.length / 2;
  const secretKey = keyAndIv.slice(0, halfKeyLen);
  const iv = keyAndIv.slice(halfKeyLen);

  return crypto.createCipheriv(
    'aes-128-cbc',
    Buffer.from(secretKey, 'utf-8'),
    Buffer.from(iv, 'utf-8'),
  );
}

export function decrypt(payload: string) {
  const key = payload.slice(0, 8);
  const ciphertext = payload.slice(8, -64);
  const digest = payload.slice(-64);

  const digestCalculated = crypto.createHash('sha256')
    .update(key + ciphertext)
    .digest('hex')
    .toUpperCase();

  if (digest !== digestCalculated) {
    throw new Error('DigestMismatchException');
  }

  const decipher = createDecipheriv(key);

  const plaintextPadded = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final(),
  ]);

  return JSON.parse(plaintextPadded.toString('utf8'));
}

export function encrypt(clientKey: string, payload: string) {
  const cipher = createCipher(clientKey);
  const payloadBuffer = Buffer.from(payload);
  const padding = 16 - (payloadBuffer.length % 16);
  const paddingBuffer = Buffer.alloc(padding, padding);
  const plaintextPadded = Buffer.concat([paddingBuffer, payloadBuffer]);

  const ciphertextBuffer = Buffer.concat([cipher.update(plaintextPadded), cipher.final()]);
  const ciphertext = ciphertextBuffer.toString('hex').toUpperCase();

  const hash = crypto.createHash('sha256');
  hash.update(clientKey + ciphertext);
  const digest = hash.digest('hex').toUpperCase();

  return clientKey + ciphertext + digest;
}

export function nextClientKey(clientKey: string): string {
  return (parseInt(clientKey, 16) + 1)
    .toString(16)
    .padStart(8, '0')
    .toUpperCase();
}