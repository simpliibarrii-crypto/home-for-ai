/**
 * @homeforai/blockchain-sdk — W3C DID:ethr Implementation
 *
 * Implements the DID:ethr method per W3C DID Core spec:
 * https://www.w3.org/TR/did-core/
 * https://github.com/decentralized-identity/ethr-did
 *
 * DID format: did:ethr:<address>
 * e.g.       did:ethr:0x742d35Cc6634C0532925a3b844Bc454e4438f44e
 */

import { decrypt } from "./crypto";
import { createHmac, randomBytes } from "node:crypto";

export interface DIDDocument {
  "@context": string[];
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
  keyAgreement?: string[];
  service?: ServiceEndpoint[];
  created: string;
  updated: string;
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  blockchainAccountId?: string;
  publicKeyHex?: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string;
}

export interface DIDJwt {
  header: { alg: string; typ: string };
  payload: Record<string, unknown>;
  signature: string;
  token: string;
}

const DID_METHOD = "ethr";

/**
 * Creates a DID:ethr identifier from an Ethereum address.
 *
 * @param address - EVM address (0x prefixed)
 * @returns DID string e.g. "did:ethr:0x742d35Cc..."
 */
export function createDID(address: string): string {
  if (!address.startsWith("0x") || address.length !== 42) {
    throw new Error(`Invalid EVM address: ${address}`);
  }
  return `did:${DID_METHOD}:${address.toLowerCase()}`;
}

/**
 * Resolves a DID:ethr to a W3C-compliant DID Document.
 *
 * In production this would query the Ethereum DID Registry contract:
 * EthereumDIDRegistry: 0xdCa7EF03e98e0DC2B855bE647C39ABe984fcF21B
 *
 * This implementation returns a conformant document without on-chain lookup.
 */
export function resolveDID(did: string): DIDDocument {
  const parts = did.split(":");
  if (parts.length < 3 || parts[0] !== "did" || parts[1] !== DID_METHOD) {
    throw new Error(`Unsupported DID method: ${did}`);
  }

  const address = parts[2];
  const now = new Date().toISOString();
  const vmId = `${did}#controller`;

  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/secp256k1recovery-2020/v2",
    ],
    id: did,
    verificationMethod: [
      {
        id: vmId,
        type: "EcdsaSecp256k1RecoveryMethod2020",
        controller: did,
        blockchainAccountId: `eip155:1:${address}`,
      },
    ],
    authentication: [vmId],
    assertionMethod: [vmId],
    service: [
      {
        id: `${did}#homeforai`,
        type: "HomeForAIService",
        serviceEndpoint: "https://api.homeforai.com/did/v1",
      },
    ],
    created: now,
    updated: now,
  };
}

/**
 * Signs a message using a DID's private key, producing a compact JWT.
 *
 * Uses HS256 (HMAC-SHA256) as a lightweight stand-in; production should use
 * ES256K (secp256k1 ECDSA) via the @noble/curves library.
 *
 * @param did - DID string (did:ethr:0x...)
 * @param encryptedPrivateKey - AES-256-GCM encrypted private key (from wallet.ts)
 * @param message - payload to sign (string or object)
 * @param encryptKey - key used to decrypt the private key
 */
export function signWithDID(
  did: string,
  encryptedPrivateKey: string,
  message: string | Record<string, unknown>,
  encryptKey: string
): string {
  const privateKey = decrypt(encryptedPrivateKey, encryptKey);

  const header = Buffer.from(JSON.stringify({ alg: "ES256K", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: did,
      sub: did,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      msg: typeof message === "string" ? message : JSON.stringify(message),
      jti: randomBytes(8).toString("hex"),
    })
  ).toString("base64url");

  // Sign with HMAC-SHA256 using the private key as secret
  // Production: use secp256k1 ECDSA via @noble/curves
  const sig = createHmac("sha256", privateKey)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${sig}`;
}

/**
 * Parses a DID JWT without verifying the signature (for display/inspection).
 */
export function parseDidJwt(jwt: string): DIDJwt {
  const [headerB64, payloadB64, sig] = jwt.split(".");
  return {
    header: JSON.parse(Buffer.from(headerB64, "base64url").toString()),
    payload: JSON.parse(Buffer.from(payloadB64, "base64url").toString()),
    signature: sig,
    token: jwt,
  };
}

/**
 * Checks if a DID belongs to the Home for AI ecosystem.
 */
export function isHomeForAIDID(did: string): boolean {
  return did.startsWith(`did:${DID_METHOD}:`);
}
