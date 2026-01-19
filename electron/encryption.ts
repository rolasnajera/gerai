import { safeStorage } from 'electron';

/**
 * Encrypts a string using Electron's safeStorage.
 * safeStorage uses OS-level encryption (Keychain on macOS, DPAPI on Windows, etc.)
 */
export function encryptString(plainText: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
        console.warn('Encryption is not available on this system.');
        return plainText;
    }

    try {
        const buffer = safeStorage.encryptString(plainText);
        return buffer.toString('base64');
    } catch (err) {
        console.error('Encryption failed:', err);
        return plainText;
    }
}

/**
 * Decrypts a base64 encoded string using Electron's safeStorage.
 */
export function decryptString(encryptedBase64: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
        return encryptedBase64;
    }

    try {
        const buffer = Buffer.from(encryptedBase64, 'base64');
        return safeStorage.decryptString(buffer);
    } catch (err) {
        console.error('Decryption failed:', err);
        return encryptedBase64;
    }
}
