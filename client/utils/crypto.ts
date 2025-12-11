import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

const KEY_PAIR_KEY = "cleaner_phone_keypair";
const SHARED_SECRETS_PREFIX = "shared_secret_";

export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

export interface EncryptedMessage {
  ciphertext: string;
  nonce: string;
  senderPublicKey: string;
}

export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: naclUtil.encodeBase64(keyPair.publicKey),
    secretKey: naclUtil.encodeBase64(keyPair.secretKey),
  };
}

export async function getOrCreateKeyPair(): Promise<KeyPair> {
  if (Platform.OS === "web") {
    const stored = localStorage.getItem(KEY_PAIR_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    const newKeyPair = await generateKeyPair();
    localStorage.setItem(KEY_PAIR_KEY, JSON.stringify(newKeyPair));
    return newKeyPair;
  }

  try {
    const stored = await SecureStore.getItemAsync(KEY_PAIR_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.log("SecureStore read error:", error);
  }

  const newKeyPair = await generateKeyPair();
  try {
    await SecureStore.setItemAsync(KEY_PAIR_KEY, JSON.stringify(newKeyPair));
  } catch (error) {
    console.log("SecureStore write error:", error);
  }
  return newKeyPair;
}

export function getSharedSecret(
  theirPublicKey: string,
  mySecretKey: string
): Uint8Array {
  const mySecretKeyBytes = naclUtil.decodeBase64(mySecretKey);
  const theirPublicKeyBytes = naclUtil.decodeBase64(theirPublicKey);
  return nacl.box.before(theirPublicKeyBytes, mySecretKeyBytes);
}

export async function getSharedSecretCached(
  mySecretKey: string,
  theirPublicKey: string,
  conversationId: string
): Promise<Uint8Array> {
  const storageKey = `${SHARED_SECRETS_PREFIX}${conversationId}`;
  
  if (Platform.OS === "web") {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      return naclUtil.decodeBase64(cached);
    }
  } else {
    try {
      const cached = await SecureStore.getItemAsync(storageKey);
      if (cached) {
        return naclUtil.decodeBase64(cached);
      }
    } catch (error) {
      console.log("SecureStore read error:", error);
    }
  }

  const sharedSecret = getSharedSecret(theirPublicKey, mySecretKey);

  const sharedSecretBase64 = naclUtil.encodeBase64(sharedSecret);
  if (Platform.OS === "web") {
    localStorage.setItem(storageKey, sharedSecretBase64);
  } else {
    try {
      await SecureStore.setItemAsync(storageKey, sharedSecretBase64);
    } catch (error) {
      console.log("SecureStore write error:", error);
    }
  }

  return sharedSecret;
}

export function generateNonce(): Uint8Array {
  return nacl.randomBytes(nacl.box.nonceLength);
}

export function encryptMessage(
  message: string,
  sharedSecret: Uint8Array
): { ciphertext: string; nonce: string } {
  const messageBytes = naclUtil.decodeUTF8(message);
  const nonce = generateNonce();
  
  const ciphertext = nacl.secretbox(messageBytes, nonce, sharedSecret);
  
  return {
    ciphertext: naclUtil.encodeBase64(ciphertext),
    nonce: naclUtil.encodeBase64(nonce),
  };
}

export function decryptMessage(
  ciphertext: string,
  nonce: string,
  sharedSecret: Uint8Array
): string | null {
  try {
    const ciphertextBytes = naclUtil.decodeBase64(ciphertext);
    const nonceBytes = naclUtil.decodeBase64(nonce);
    
    const decrypted = nacl.secretbox.open(ciphertextBytes, nonceBytes, sharedSecret);
    
    if (!decrypted) {
      console.error("Decryption failed - invalid ciphertext or key");
      return null;
    }
    
    return naclUtil.encodeUTF8(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}

export function encryptWithPublicKey(
  message: string,
  recipientPublicKey: string,
  senderSecretKey: string
): EncryptedMessage {
  const messageBytes = naclUtil.decodeUTF8(message);
  const nonce = generateNonce();
  const recipientPubKeyBytes = naclUtil.decodeBase64(recipientPublicKey);
  const senderSecKeyBytes = naclUtil.decodeBase64(senderSecretKey);
  
  const ciphertext = nacl.box(messageBytes, nonce, recipientPubKeyBytes, senderSecKeyBytes);
  
  const senderKeyPair = nacl.box.keyPair.fromSecretKey(senderSecKeyBytes);
  
  return {
    ciphertext: naclUtil.encodeBase64(ciphertext),
    nonce: naclUtil.encodeBase64(nonce),
    senderPublicKey: naclUtil.encodeBase64(senderKeyPair.publicKey),
  };
}

export function decryptWithPrivateKey(
  encryptedMessage: EncryptedMessage,
  recipientSecretKey: string
): string | null {
  try {
    const ciphertextBytes = naclUtil.decodeBase64(encryptedMessage.ciphertext);
    const nonceBytes = naclUtil.decodeBase64(encryptedMessage.nonce);
    const senderPubKeyBytes = naclUtil.decodeBase64(encryptedMessage.senderPublicKey);
    const recipientSecKeyBytes = naclUtil.decodeBase64(recipientSecretKey);
    
    const decrypted = nacl.box.open(ciphertextBytes, nonceBytes, senderPubKeyBytes, recipientSecKeyBytes);
    
    if (!decrypted) {
      console.error("Decryption failed - invalid ciphertext or key");
      return null;
    }
    
    return naclUtil.encodeUTF8(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}

export async function hashData(data: string): Promise<string> {
  if (Platform.OS === "web") {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }
  
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data
  );
}

export async function clearAllKeys(): Promise<void> {
  if (Platform.OS === "web") {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key === KEY_PAIR_KEY || key.startsWith(SHARED_SECRETS_PREFIX))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } else {
    try {
      await SecureStore.deleteItemAsync(KEY_PAIR_KEY);
    } catch (error) {
      console.log("SecureStore delete error:", error);
    }
  }
}
