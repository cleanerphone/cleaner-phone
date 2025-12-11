import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import {
  getOrCreateKeyPair,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  getSharedSecret,
  KeyPair,
  EncryptedMessage,
} from "@/utils/crypto";

interface EncryptionContextType {
  isReady: boolean;
  myPublicKey: string | null;
  encryptMessage: (message: string, recipientPublicKey: string) => EncryptedMessage | null;
  decryptMessage: (encryptedMessage: EncryptedMessage) => string | null;
  getRecipientPublicKey: (userId: string) => Promise<string | null>;
  hasKeyForUser: (userId: string) => boolean;
  encryptionError: string | null;
  clearEncryptionError: () => void;
}

const EncryptionContext = createContext<EncryptionContextType>({
  isReady: false,
  myPublicKey: null,
  encryptMessage: () => null,
  decryptMessage: () => null,
  getRecipientPublicKey: async () => null,
  hasKeyForUser: () => false,
  encryptionError: null,
  clearEncryptionError: () => {},
});

export const useEncryption = () => useContext(EncryptionContext);

interface EncryptionProviderProps {
  children: ReactNode;
}

const publicKeyCache = new Map<string, string>();
const sharedSecretCache = new Map<string, Uint8Array>();

export function EncryptionProvider({ children }: EncryptionProviderProps) {
  const { isAuthenticated, user } = useAuth();
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [encryptionError, setEncryptionError] = useState<string | null>(null);
  const keyPairRef = useRef<KeyPair | null>(null);

  const clearEncryptionError = useCallback(() => {
    setEncryptionError(null);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setKeyPair(null);
      keyPairRef.current = null;
      setIsReady(false);
      publicKeyCache.clear();
      sharedSecretCache.clear();
      return;
    }

    const initializeKeys = async () => {
      try {
        const keys = await getOrCreateKeyPair();
        setKeyPair(keys);
        keyPairRef.current = keys;

        try {
          await apiRequest("POST", "/api/keys", { publicKey: keys.publicKey });
        } catch (error) {
          console.log("Failed to upload public key:", error);
        }

        setIsReady(true);
      } catch (error) {
        console.error("Failed to initialize encryption:", error);
        setEncryptionError("Failed to initialize encryption keys");
        setIsReady(false);
      }
    };

    initializeKeys();
  }, [isAuthenticated, user]);

  const getCachedSharedSecret = useCallback((recipientPublicKey: string): Uint8Array | null => {
    if (sharedSecretCache.has(recipientPublicKey)) {
      return sharedSecretCache.get(recipientPublicKey)!;
    }
    if (!keyPairRef.current) return null;
    try {
      const secret = getSharedSecret(recipientPublicKey, keyPairRef.current.secretKey);
      sharedSecretCache.set(recipientPublicKey, secret);
      return secret;
    } catch (error) {
      console.error("Failed to compute shared secret:", error);
      return null;
    }
  }, []);

  const encryptMessage = useCallback(
    (message: string, recipientPublicKey: string): EncryptedMessage | null => {
      const currentKeyPair = keyPairRef.current;
      if (!currentKeyPair) {
        setEncryptionError("Encryption not ready. Please wait for keys to initialize.");
        return null;
      }
      try {
        getCachedSharedSecret(recipientPublicKey);
        return encryptWithPublicKey(message, recipientPublicKey, currentKeyPair.secretKey);
      } catch (error) {
        console.error("Encryption failed:", error);
        setEncryptionError("Failed to encrypt message. Please try again.");
        return null;
      }
    },
    [getCachedSharedSecret]
  );

  const decryptMessage = useCallback(
    (encryptedMessage: EncryptedMessage): string | null => {
      const currentKeyPair = keyPairRef.current;
      if (!currentKeyPair) {
        return null;
      }
      try {
        getCachedSharedSecret(encryptedMessage.senderPublicKey);
        return decryptWithPrivateKey(encryptedMessage, currentKeyPair.secretKey);
      } catch (error) {
        console.error("Decryption failed:", error);
        return null;
      }
    },
    [getCachedSharedSecret]
  );

  const getRecipientPublicKey = useCallback(async (userId: string): Promise<string | null> => {
    if (publicKeyCache.has(userId)) {
      return publicKeyCache.get(userId)!;
    }
    try {
      const response = await apiRequest("GET", `/api/keys/${userId}`);
      const data = await response.json();
      if (data.publicKey) {
        publicKeyCache.set(userId, data.publicKey);
        return data.publicKey;
      }
      setEncryptionError("Recipient has not set up encryption yet. Messages cannot be sent securely.");
      return null;
    } catch (error) {
      console.log("Failed to fetch recipient public key:", error);
      setEncryptionError("Failed to retrieve encryption key for recipient.");
      return null;
    }
  }, []);

  const hasKeyForUser = useCallback((userId: string): boolean => {
    return publicKeyCache.has(userId);
  }, []);

  return (
    <EncryptionContext.Provider
      value={{
        isReady,
        myPublicKey: keyPair?.publicKey || null,
        encryptMessage,
        decryptMessage,
        getRecipientPublicKey,
        hasKeyForUser,
        encryptionError,
        clearEncryptionError,
      }}
    >
      {children}
    </EncryptionContext.Provider>
  );
}
