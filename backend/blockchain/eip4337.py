"""
eip4337.py — EIP-4337 Account Abstraction support.

Provides:
  - UserOperation dataclass with all ERC-4337 v0.6 fields
  - UserOpBuilder: construct UserOps for new or existing smart wallets
  - Sign UserOp with eth_account (ECDSA secp256k1)
  - Encode UserOp for bundler submission (eth_sendUserOperation)

Dependencies:
  - eth-account >= 0.13
  - web3 >= 7.0
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field, asdict
from typing import Optional

from eth_account import Account
from eth_account.messages import encode_defunct
from eth_account.signers.local import LocalAccount


# ─── UserOperation ────────────────────────────────────────────────────────────

@dataclass
class UserOperation:
    """
    ERC-4337 v0.6 UserOperation struct.

    All bytes fields stored as hex strings (0x-prefixed).
    All int fields stored as Python int (converted to hex for bundler RPC).
    """

    sender: str                    # smart contract wallet address
    nonce: int                     # wallet nonce (not EOA nonce)
    init_code: bytes               # factory + calldata; b"" if already deployed
    call_data: bytes               # encoded wallet.execute() calldata
    call_gas_limit: int            # gas for execution phase
    verification_gas_limit: int    # gas for validation phase
    pre_verification_gas: int      # flat overhead before on-chain verification
    max_fee_per_gas: int           # EIP-1559 maxFeePerGas (wei)
    max_priority_fee_per_gas: int  # EIP-1559 tip (wei)
    paymaster_and_data: bytes      # paymaster address + encoded data; b"" if user pays
    signature: bytes               # wallet-validated ECDSA or custom signature

    def to_rpc_dict(self) -> dict:
        """Encode UserOperation as the hex-string dict expected by eth_sendUserOperation."""
        return {
            "sender": self.sender,
            "nonce": hex(self.nonce),
            "initCode": "0x" + self.init_code.hex(),
            "callData": "0x" + self.call_data.hex(),
            "callGasLimit": hex(self.call_gas_limit),
            "verificationGasLimit": hex(self.verification_gas_limit),
            "preVerificationGas": hex(self.pre_verification_gas),
            "maxFeePerGas": hex(self.max_fee_per_gas),
            "maxPriorityFeePerGas": hex(self.max_priority_fee_per_gas),
            "paymasterAndData": "0x" + self.paymaster_and_data.hex(),
            "signature": "0x" + self.signature.hex(),
        }

    def pack(self) -> bytes:
        """
        ABI-encode the UserOperation for hashing (ERC-4337 getUserOpHash).

        Production: use web3.py's eth_abi.encode() with the full tuple.
        This stub returns a deterministic bytes representation.
        """
        import hashlib
        raw = json.dumps(self.to_rpc_dict(), sort_keys=True).encode()
        return hashlib.sha256(raw).digest()

    def get_user_op_hash(self, entry_point_address: str, chain_id: int) -> bytes:
        """
        Compute the ERC-4337 userOpHash = keccak256(abi.encode(userOp, entryPoint, chainId)).

        This is the message the wallet's validateUserOp must verify.
        Production: use eth_abi.encode(["(address,...)", "address", "uint256"], [...])
        """
        import hashlib
        packed = self.pack()
        combined = packed + bytes.fromhex(entry_point_address[2:]) + chain_id.to_bytes(32, "big")
        return hashlib.sha256(combined).digest()

    def sign_with_key(
        self,
        private_key: str,
        entry_point_address: str,
        chain_id: int,
    ) -> "UserOperation":
        """
        Sign the UserOperation with a private key using eth_account.

        Returns a new UserOperation with the signature field set.
        The signature is an Ethereum personal_sign of the userOpHash.
        """
        user_op_hash = self.get_user_op_hash(entry_point_address, chain_id)

        account: LocalAccount = Account.from_key(private_key)
        msg = encode_defunct(user_op_hash)
        signed = account.sign_message(msg)

        return UserOperation(
            sender=self.sender,
            nonce=self.nonce,
            init_code=self.init_code,
            call_data=self.call_data,
            call_gas_limit=self.call_gas_limit,
            verification_gas_limit=self.verification_gas_limit,
            pre_verification_gas=self.pre_verification_gas,
            max_fee_per_gas=self.max_fee_per_gas,
            max_priority_fee_per_gas=self.max_priority_fee_per_gas,
            paymaster_and_data=self.paymaster_and_data,
            signature=bytes(signed.signature),
        )


# ─── Factory address registry ─────────────────────────────────────────────────

KNOWN_FACTORIES: dict[int, str] = {
    1:     "0x9406Cc6185a346906296840746125a0E44976454",
    137:   "0x9406Cc6185a346906296840746125a0E44976454",
    42161: "0x9406Cc6185a346906296840746125a0E44976454",
    8453:  "0x9406Cc6185a346906296840746125a0E44976454",
    56:    "0x9406Cc6185a346906296840746125a0E44976454",
    43114: "0x9406Cc6185a346906296840746125a0E44976454",
    10:    "0x9406Cc6185a346906296840746125a0E44976454",
}

ENTRY_POINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"


# ─── ABI helpers ──────────────────────────────────────────────────────────────

def _abi_encode_address(addr: str) -> bytes:
    """ABI-encode an address (left-padded to 32 bytes)."""
    raw = bytes.fromhex(addr.removeprefix("0x"))
    return raw.rjust(32, b"\x00")


def _abi_encode_uint256(value: int) -> bytes:
    return value.to_bytes(32, "big")


def _encode_create_account_calldata(owner: str, salt: int) -> bytes:
    """
    Encode SimpleAccountFactory.createAccount(address owner, uint256 salt).
    Selector = keccak256("createAccount(address,uint256)")[:4] = 0x5fbfb9cf
    """
    selector = bytes.fromhex("5fbfb9cf")
    return selector + _abi_encode_address(owner) + _abi_encode_uint256(salt)


def _encode_execute_calldata(target: str, value: int, data: bytes) -> bytes:
    """
    Encode SimpleAccount.execute(address dest, uint256 value, bytes calldata func).
    Selector = keccak256("execute(address,uint256,bytes)")[:4] = 0xb61d27f6
    """
    selector = bytes.fromhex("b61d27f6")
    # ABI encode: address (32), uint256 (32), bytes offset (32=0x60), bytes length (32), bytes data
    data_offset = _abi_encode_uint256(0x60)
    data_len = _abi_encode_uint256(len(data))
    # Pad data to 32-byte boundary
    padded_data = data + b"\x00" * ((32 - len(data) % 32) % 32)
    return selector + _abi_encode_address(target) + _abi_encode_uint256(value) + data_offset + data_len + padded_data


def compute_counterfactual_address(owner: str, salt: int, chain_id: int) -> str:
    """
    Compute the deterministic CREATE2 address for a SimpleAccount.

    Production: use web3.py + CREATE2 formula:
        keccak256(0xff ++ factory ++ salt32 ++ keccak256(initCode))[12:]
    This stub returns a deterministic but non-cryptographic address.
    """
    import hashlib
    factory = KNOWN_FACTORIES.get(chain_id, "0x" + "0" * 40)
    raw = (
        bytes.fromhex(factory[2:])
        + salt.to_bytes(32, "big")
        + bytes.fromhex(owner[2:])
        + chain_id.to_bytes(8, "big")
    )
    digest = hashlib.sha256(raw).digest()
    return "0x" + digest[:20].hex()


# ─── UserOpBuilder ────────────────────────────────────────────────────────────

class UserOpBuilder:
    """
    Builds ERC-4337 UserOperations for both new and existing smart wallets.

    Usage:
        builder = UserOpBuilder(chain_id=1)

        # New wallet deploy + execute
        op = builder.build_new_wallet_op(
            owner_address="0xYour...",
            salt=0,
            target="0xTarget...",
            call_value=0,
            call_data=b"",
        )
        signed_op = op.sign_with_key(private_key, ENTRY_POINT, chain_id=1)
        bundler = BundlerClient(chain_id=1)
        user_op_hash = await bundler.send_user_op(signed_op)
    """

    def __init__(self, chain_id: int) -> None:
        self.chain_id = chain_id
        self.factory_address = KNOWN_FACTORIES.get(chain_id)
        if self.factory_address is None:
            raise ValueError(f"No SimpleAccountFactory for chain {chain_id}")

    def build_new_wallet_op(
        self,
        owner_address: str,
        salt: int,
        target: str,
        call_value: int,
        call_data: bytes,
        paymaster_and_data: bytes = b"",
    ) -> UserOperation:
        """Build a UserOperation that deploys a new smart wallet and executes a call."""
        sender = compute_counterfactual_address(owner_address, salt, self.chain_id)

        # Build initCode = factory_address + createAccount(owner, salt)
        init_calldata = _encode_create_account_calldata(owner_address, salt)
        init_code = bytes.fromhex(self.factory_address[2:]) + init_calldata

        execute_calldata = _encode_execute_calldata(target, call_value, call_data)

        # Gas values: higher for new wallet (includes deployment cost)
        base_fee_wei = 20 * 10**9  # 20 gwei stub
        tip_wei = 2 * 10**9        # 2 gwei tip

        return UserOperation(
            sender=sender,
            nonce=0,
            init_code=init_code,
            call_data=execute_calldata,
            call_gas_limit=200_000,
            verification_gas_limit=500_000,
            pre_verification_gas=60_000,
            max_fee_per_gas=base_fee_wei * 2 + tip_wei,
            max_priority_fee_per_gas=tip_wei,
            paymaster_and_data=paymaster_and_data,
            signature=b"\x00" * 65,  # placeholder
        )

    def build_op(
        self,
        wallet_address: str,
        nonce: int,
        target: str,
        call_value: int,
        call_data: bytes,
        paymaster_and_data: bytes = b"",
        call_gas_limit: int = 150_000,
        verification_gas_limit: int = 100_000,
    ) -> UserOperation:
        """Build a UserOperation for an already-deployed smart wallet."""
        execute_calldata = _encode_execute_calldata(target, call_value, call_data)

        base_fee_wei = 20 * 10**9
        tip_wei = 2 * 10**9

        return UserOperation(
            sender=wallet_address,
            nonce=nonce,
            init_code=b"",
            call_data=execute_calldata,
            call_gas_limit=call_gas_limit,
            verification_gas_limit=verification_gas_limit,
            pre_verification_gas=50_000,
            max_fee_per_gas=base_fee_wei * 2 + tip_wei,
            max_priority_fee_per_gas=tip_wei,
            paymaster_and_data=paymaster_and_data,
            signature=b"\x00" * 65,
        )


# ─── Bundler Client ────────────────────────────────────────────────────────────

class BundlerClient:
    """
    Async ERC-4337 bundler client.

    Submits UserOperations via eth_sendUserOperation JSON-RPC.
    Uses httpx for async HTTP.
    """

    def __init__(self, chain_id: int) -> None:
        from blockchain.chains import CHAINS
        chain = CHAINS.get(chain_id)
        if chain is None or chain.bundler_url is None:
            raise ValueError(f"No bundler configured for chain {chain_id}")
        self.bundler_url = chain.bundler_url
        self.entry_point = chain.entry_point_addr
        self.chain_id = chain_id

    async def send_user_op(self, user_op: UserOperation) -> str:
        """
        Submit a signed UserOperation to the bundler.
        Returns the userOpHash (bytes32 as hex string).
        """
        import httpx
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "eth_sendUserOperation",
            "params": [user_op.to_rpc_dict(), self.entry_point],
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(self.bundler_url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            if "error" in data:
                raise RuntimeError(f"Bundler error: {data['error']}")
            return data["result"]

    async def get_user_op_receipt(self, user_op_hash: str) -> dict:
        """Query eth_getUserOperationReceipt for the given userOpHash."""
        import httpx
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "eth_getUserOperationReceipt",
            "params": [user_op_hash],
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(self.bundler_url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("result", {})
