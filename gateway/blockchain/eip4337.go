package blockchain

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"strings"
	"time"
)

// ─── EIP-4337 Core Types ──────────────────────────────────────────────────────

// UserOperation is the EIP-4337 UserOperation struct with all fields as defined
// by ERC-4337 v0.6 (compatible with EntryPoint 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789).
type UserOperation struct {
	Sender               string `json:"sender"`               // smart contract wallet address
	Nonce                uint64 `json:"nonce"`                // wallet nonce (not EOA nonce)
	InitCode             []byte `json:"initCode"`             // factory + calldata for wallet creation; empty if deployed
	CallData             []byte `json:"callData"`             // encoded wallet.execute() call
	CallGasLimit         uint64 `json:"callGasLimit"`         // gas for execution phase
	VerificationGasLimit uint64 `json:"verificationGasLimit"` // gas for validation phase
	PreVerificationGas   uint64 `json:"preVerificationGas"`   // gas overhead before on-chain verification
	MaxFeePerGas         *big.Int `json:"maxFeePerGas"`       // EIP-1559 maxFeePerGas (wei)
	MaxPriorityFeePerGas *big.Int `json:"maxPriorityFeePerGas"` // EIP-1559 tip (wei)
	PaymasterAndData     []byte `json:"paymasterAndData"`     // paymaster address + encoded data; empty if user pays
	Signature            []byte `json:"signature"`            // wallet-validated ECDSA or custom signature
}

// UserOperationHex is the JSON/RPC-friendly version of UserOperation with hex-encoded fields.
type UserOperationHex struct {
	Sender               string `json:"sender"`
	Nonce                string `json:"nonce"`
	InitCode             string `json:"initCode"`
	CallData             string `json:"callData"`
	CallGasLimit         string `json:"callGasLimit"`
	VerificationGasLimit string `json:"verificationGasLimit"`
	PreVerificationGas   string `json:"preVerificationGas"`
	MaxFeePerGas         string `json:"maxFeePerGas"`
	MaxPriorityFeePerGas string `json:"maxPriorityFeePerGas"`
	PaymasterAndData     string `json:"paymasterAndData"`
	Signature            string `json:"signature"`
}

// ToHex converts a UserOperation to its hex-encoded RPC representation.
func (uo *UserOperation) ToHex() *UserOperationHex {
	return &UserOperationHex{
		Sender:               uo.Sender,
		Nonce:                fmt.Sprintf("0x%x", uo.Nonce),
		InitCode:             "0x" + hex.EncodeToString(uo.InitCode),
		CallData:             "0x" + hex.EncodeToString(uo.CallData),
		CallGasLimit:         fmt.Sprintf("0x%x", uo.CallGasLimit),
		VerificationGasLimit: fmt.Sprintf("0x%x", uo.VerificationGasLimit),
		PreVerificationGas:   fmt.Sprintf("0x%x", uo.PreVerificationGas),
		MaxFeePerGas:         "0x" + uo.MaxFeePerGas.Text(16),
		MaxPriorityFeePerGas: "0x" + uo.MaxPriorityFeePerGas.Text(16),
		PaymasterAndData:     "0x" + hex.EncodeToString(uo.PaymasterAndData),
		Signature:            "0x" + hex.EncodeToString(uo.Signature),
	}
}

// ─── Smart Wallet Factory (CREATE2) ──────────────────────────────────────────

// WalletFactory manages deterministic smart contract wallet addresses.
// Uses CREATE2 for predictable addresses before deployment.
type WalletFactory struct {
	FactoryAddress string // deployed SimpleAccountFactory address
	ChainID        int64
}

// KnownFactories maps chainID → SimpleAccountFactory address.
var KnownFactories = map[int64]string{
	1:     "0x9406Cc6185a346906296840746125a0E44976454",
	137:   "0x9406Cc6185a346906296840746125a0E44976454",
	42161: "0x9406Cc6185a346906296840746125a0E44976454",
	8453:  "0x9406Cc6185a346906296840746125a0E44976454",
	56:    "0x9406Cc6185a346906296840746125a0E44976454",
	43114: "0x9406Cc6185a346906296840746125a0E44976454",
	10:    "0x9406Cc6185a346906296840746125a0E44976454",
}

// NewWalletFactory returns a factory for the given chain.
func NewWalletFactory(chainID int64) (*WalletFactory, error) {
	addr, ok := KnownFactories[chainID]
	if !ok {
		return nil, fmt.Errorf("no known factory for chainID %d", chainID)
	}
	return &WalletFactory{FactoryAddress: addr, ChainID: chainID}, nil
}

// CounterFactualAddress computes the deterministic wallet address for an owner.
// Parameters:
//   - ownerAddress: the EOA that will control the smart wallet
//   - salt:         arbitrary uint256 for multiple wallets per owner
//
// Returns the predicted wallet address before deployment.
func (f *WalletFactory) CounterFactualAddress(ownerAddress string, salt uint64) (string, error) {
	if !isValidAddress(ownerAddress) {
		return "", fmt.Errorf("invalid owner address: %q", ownerAddress)
	}

	// ABI-encode createAccount(owner, salt) calldata
	// selector: keccak256("createAccount(address,uint256)")[:4] = 0x5fbfb9cf
	selector := []byte{0x5f, 0xbf, 0xb9, 0xcf}
	addrPadded := padHex(strings.TrimPrefix(ownerAddress, "0x"), 64)
	saltPadded := fmt.Sprintf("%064x", salt)
	initCallData, _ := hex.DecodeString(addrPadded + saltPadded)

	factoryCallData := append(selector, initCallData...)

	// BUILD initCode = factory_address ++ createAccount calldata
	factoryAddrBytes, _ := hex.DecodeString(strings.TrimPrefix(f.FactoryAddress, "0x"))
	initCode := append(factoryAddrBytes, factoryCallData...)

	// Stub CREATE2 address computation (production uses go-ethereum crypto.CreateAddress2)
	initCodeHash := keccak256Stub(initCode)
	saltBytes := [32]byte{}
	saltBytes[31] = byte(salt)

	addr := CREATE2Address(f.FactoryAddress, saltBytes, initCodeHash)
	return addr, nil
}

// ─── UserOperation Builder ────────────────────────────────────────────────────

// UserOpBuilder constructs UserOperations for submission to a 4337 bundler.
type UserOpBuilder struct {
	factory  *WalletFactory
	registry *ChainRegistry
}

// NewUserOpBuilder creates a builder for the given chain.
func NewUserOpBuilder(chainID int64) (*UserOpBuilder, error) {
	registry := NewChainRegistry()
	factory, err := NewWalletFactory(chainID)
	if err != nil {
		return nil, err
	}
	return &UserOpBuilder{factory: factory, registry: registry}, nil
}

// BuildNewWalletOp creates a UserOperation that deploys a new smart wallet AND executes a call.
//
// Parameters:
//   - ownerAddress: EOA owner
//   - salt:         wallet salt
//   - target:       address to call after deployment
//   - callValue:    ETH value in wei
//   - callData:     encoded function call on target
func (b *UserOpBuilder) BuildNewWalletOp(
	ownerAddress string,
	salt uint64,
	target string,
	callValue *big.Int,
	callData []byte,
) (*UserOperation, error) {
	// Get predicted wallet address
	sender, err := b.factory.CounterFactualAddress(ownerAddress, salt)
	if err != nil {
		return nil, err
	}

	// Build initCode (factory + createAccount calldata)
	initCode := buildInitCode(b.factory.FactoryAddress, ownerAddress, salt)

	// Build execute(target, value, callData) on the wallet
	executeCallData := encodeExecute(target, callValue, callData)

	chain, err := b.registry.Get(b.factory.ChainID)
	if err != nil {
		return nil, err
	}

	baseFee := new(big.Int).Mul(big.NewInt(20), big.NewInt(1e9))
	tip := new(big.Int).Mul(big.NewInt(2), big.NewInt(1e9))
	maxFee := new(big.Int).Add(new(big.Int).Mul(baseFee, big.NewInt(2)), tip)

	return &UserOperation{
		Sender:               sender,
		Nonce:                0, // new wallet, nonce=0
		InitCode:             initCode,
		CallData:             executeCallData,
		CallGasLimit:         200000,
		VerificationGasLimit: 500000, // higher for new wallet deployment
		PreVerificationGas:   60000,
		MaxFeePerGas:         maxFee,
		MaxPriorityFeePerGas: tip,
		PaymasterAndData:     []byte{}, // user pays
		Signature:            make([]byte, 65), // placeholder — fill before submission
	}, nil
}

// BuildOp creates a UserOperation for an existing deployed wallet.
func (b *UserOpBuilder) BuildOp(
	walletAddress string,
	nonce uint64,
	target string,
	callValue *big.Int,
	callData []byte,
	paymasterAndData []byte,
) (*UserOperation, error) {
	executeCallData := encodeExecute(target, callValue, callData)

	baseFee := new(big.Int).Mul(big.NewInt(20), big.NewInt(1e9))
	tip := new(big.Int).Mul(big.NewInt(2), big.NewInt(1e9))
	maxFee := new(big.Int).Add(new(big.Int).Mul(baseFee, big.NewInt(2)), tip)

	return &UserOperation{
		Sender:               walletAddress,
		Nonce:                nonce,
		InitCode:             []byte{},
		CallData:             executeCallData,
		CallGasLimit:         150000,
		VerificationGasLimit: 100000,
		PreVerificationGas:   50000,
		MaxFeePerGas:         maxFee,
		MaxPriorityFeePerGas: tip,
		PaymasterAndData:     paymasterAndData,
		Signature:            make([]byte, 65),
	}, nil
}

// ─── Bundler Client ────────────────────────────────────────────────────────────

// BundlerRequest is the JSON-RPC request to send a UserOperation to a bundler.
type BundlerRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	ID      int           `json:"id"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
}

// BundlerResponse is the JSON-RPC response from the bundler.
type BundlerResponse struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      int         `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   *RPCError   `json:"error,omitempty"`
}

// RPCError holds a JSON-RPC error from the bundler.
type RPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// BundlerClient sends UserOperations to an ERC-4337 bundler.
type BundlerClient struct {
	BundlerURL     string
	EntryPointAddr string
	ChainID        int64
}

// NewBundlerClient creates a client for the chain's configured bundler.
func NewBundlerClient(chainID int64) (*BundlerClient, error) {
	registry := NewChainRegistry()
	chain, err := registry.Get(chainID)
	if err != nil {
		return nil, err
	}
	if chain.Bundler4337URL == "" {
		return nil, fmt.Errorf("no bundler URL configured for chain %d (%s)", chainID, chain.Name)
	}
	return &BundlerClient{
		BundlerURL:     chain.Bundler4337URL,
		EntryPointAddr: chain.EntryPointAddr,
		ChainID:        chainID,
	}, nil
}

// SendUserOperation submits a UserOperation to the bundler (stub — implement with http.Client).
func (c *BundlerClient) SendUserOperation(uo *UserOperation) (string, error) {
	req := BundlerRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "eth_sendUserOperation",
		Params:  []interface{}{uo.ToHex(), c.EntryPointAddr},
	}

	reqJSON, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("marshal UserOperation: %w", err)
	}

	// Production: send reqJSON via http.Client to c.BundlerURL
	// Return the userOpHash from the bundler response
	_ = reqJSON
	mockHash := fmt.Sprintf("0x%064x", time.Now().UnixNano())
	return mockHash, nil
}

// GetUserOperationReceipt queries the bundler for the receipt of a userOpHash.
func (c *BundlerClient) GetUserOperationReceipt(userOpHash string) (*BundlerResponse, error) {
	// Production: call eth_getUserOperationReceipt via http.Client
	return &BundlerResponse{
		JSONRPC: "2.0",
		ID:      1,
		Result: map[string]interface{}{
			"userOpHash": userOpHash,
			"success":    true,
			"actualGasUsed": "0x15f90",
		},
	}, nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func buildInitCode(factoryAddr, ownerAddr string, salt uint64) []byte {
	selector := []byte{0x5f, 0xbf, 0xb9, 0xcf}
	addrPadded := padHex(strings.TrimPrefix(ownerAddr, "0x"), 64)
	saltPadded := fmt.Sprintf("%064x", salt)
	calldata, _ := hex.DecodeString(addrPadded + saltPadded)
	factoryBytes, _ := hex.DecodeString(strings.TrimPrefix(factoryAddr, "0x"))
	return append(factoryBytes, append(selector, calldata...)...)
}

// encodeExecute encodes SimpleAccount.execute(target, value, data)
// selector: keccak256("execute(address,uint256,bytes)")[:4] = 0xb61d27f6
func encodeExecute(target string, value *big.Int, data []byte) []byte {
	selector := []byte{0xb6, 0x1d, 0x27, 0xf6}
	targetPadded := padHex(strings.TrimPrefix(target, "0x"), 64)
	valuePadded := padHex(value.Text(16), 64)

	// ABI offset for data bytes (3 params: address, uint256, bytes) → offset = 0x60
	dataOffset := "0000000000000000000000000000000000000000000000000000000000000060"
	dataLen := fmt.Sprintf("%064x", len(data))
	dataHex := hex.EncodeToString(data)
	// Pad dataHex to 32-byte boundary
	for len(dataHex)%64 != 0 {
		dataHex += "00"
	}

	calldata, _ := hex.DecodeString(targetPadded + valuePadded + dataOffset + dataLen + dataHex)
	return append(selector, calldata...)
}

// keccak256Stub is a placeholder — production uses go-ethereum's crypto.Keccak256.
func keccak256Stub(data []byte) [32]byte {
	var hash [32]byte
	for i, b := range data {
		hash[i%32] ^= b
	}
	return hash
}

// isValidAddress checks that a string looks like a 0x-prefixed 20-byte hex address.
func isValidAddress(addr string) bool {
	if !strings.HasPrefix(addr, "0x") {
		return false
	}
	stripped := strings.TrimPrefix(addr, "0x")
	if len(stripped) != 40 {
		return false
	}
	_, err := hex.DecodeString(stripped)
	return err == nil
}
