import crypto from 'crypto';
import { config } from '../config/env';

const ALGORITHM = 'aes-256-cbc';
// Derive a proper 32-byte key from the encryption key using scrypt
const KEY = crypto.scryptSync(config.ENCRYPTION_KEY || 'default-key-change-me', 'salt', 32);

export const encryption = {
  encrypt: (text: string): string => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  },

  decrypt: (text: string): string => {
    try {
      const parts = text.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted text format');
      }
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: ' + (error as Error).message);
    }
  },
};
