package blockchain

import (
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
)

// ─── EIP-1559 Type 2 Transaction ─────────────────────────────────────────────

// AccessListEntry is a single access-list item (EIP-2930).
type AccessListEntry struct {
	Address     string   `json:"address"`
	StorageKeys []string `json:"storageKeys"`
}

// EIP1559Transaction represents an EIP-1559 Type 2 transaction before signing.
type EIP1559Transaction struct {
	ChainID              int64             `json:"chainId"`
	Nonce                uint64            `json:"nonce"`
	MaxPriorityFeePerGas *big.Int          `json:"maxPriorityFeePerGas"` // in wei
	MaxFeePerGas         *big.Int          `json:"maxFeePerGas"`         // in wei
	GasLimit             uint64            `json:"gas"`
	To                   string            `json:"to,omitempty"`         // nil for contract creation
	Value                *big.Int          `json:"value"`                // in wei
	Data                 []byte            `json:"data,omitempty"`
	AccessList           []AccessListEntry `json:"accessList,omitempty"`
}

// SignedTransaction is the encoded, RLP-serialised EIP-1559 transaction with signature.
type SignedTransaction struct {
	Raw      string `json:"raw"`       // 0x-prefixed RLP-encoded hex
	Hash     string `json:"hash"`      // 0x-prefixed keccak256 of raw tx
	From     string `json:"from"`      // signer address
	ChainID  int64  `json:"chain_id"`
	Nonce    uint64 `json:"nonce"`
}

// GasEstimate holds a fee tier estimation for EIP-1559.
type GasEstimate struct {
	BaseFee              *big.Int `json:"base_fee"`                // latest block base fee (wei)
	MaxPriorityFeePerGas *big.Int `json:"max_priority_fee_per_gas"` // tip (wei)
	MaxFeePerGas         *big.Int `json:"max_fee_per_gas"`          // max total fee (wei)
	GasLimit             uint64   `json:"gas_limit"`
	EstimatedGasUsed     uint64   `json:"estimated_gas_used"`
	TotalCostWei         *big.Int `json:"total_cost_wei"`
	TotalCostGwei        string   `json:"total_cost_gwei"`
}

// TransactionBuilder constructs EIP-1559 transactions.
type TransactionBuilder struct {
	registry *ChainRegistry
}

// NewTransactionBuilder creates a builder using the given chain registry.
func NewTransactionBuilder(registry *ChainRegistry) *TransactionBuilder {
	return &TransactionBuilder{registry: registry}
}

// EstimateGas returns a fee estimate for a transaction on the given chain.
// In production this calls eth_feeHistory and eth_estimateGas via RPC.
func (b *TransactionBuilder) EstimateGas(chainID int64, to string, data []byte, value *big.Int) (*GasEstimate, error) {
	chain, err := b.registry.Get(chainID)
	if err != nil {
		return nil, err
	}
	if !chain.IsEVM {
		return nil, fmt.Errorf("chain %q is not EVM-compatible", chain.Name)
	}

	// ── Stub gas values (replace with live eth_feeHistory call) ──────────────
	baseFeeGwei := int64(20) // gwei
	if chainID == 137 {
		baseFeeGwei = 100
	} else if chainID == 42161 || chainID == 8453 || chainID == 10 {
		baseFeeGwei = 1
	}

	baseFee := new(big.Int).Mul(big.NewInt(baseFeeGwei), big.NewInt(1e9))

	tip := new(big.Int).Mul(big.NewInt(2), big.NewInt(1e9)) // 2 gwei tip
	maxFee := new(big.Int).Add(
		new(big.Int).Mul(baseFee, big.NewInt(2)),
		tip,
	)

	gasLimit := uint64(21000) // base cost
	if len(data) > 0 {
		// Rough estimation: 68 gas per non-zero byte, 4 per zero byte
		for _, b := range data {
			if b == 0 {
				gasLimit += 4
			} else {
				gasLimit += 68
			}
		}
		gasLimit += 100000 // contract call overhead
	}

	totalCost := new(big.Int).Mul(maxFee, big.NewInt(int64(gasLimit)))

	gwei := new(big.Int).Div(totalCost, big.NewInt(1e9))

	return &GasEstimate{
		BaseFee:              baseFee,
		MaxPriorityFeePerGas: tip,
		MaxFeePerGas:         maxFee,
		GasLimit:             gasLimit,
		EstimatedGasUsed:     gasLimit * 80 / 100, // 80% utilisation estimate
		TotalCostWei:         totalCost,
		TotalCostGwei:        gwei.String() + " gwei",
	}, nil
}

// BuildTransaction constructs an unsigned EIP-1559 transaction.
func (b *TransactionBuilder) BuildTransaction(
	chainID int64,
	nonce uint64,
	to string,
	value *big.Int,
	data []byte,
) (*EIP1559Transaction, error) {
	estimate, err := b.EstimateGas(chainID, to, data, value)
	if err != nil {
		return nil, err
	}

	return &EIP1559Transaction{
		ChainID:              chainID,
		Nonce:                nonce,
		MaxPriorityFeePerGas: estimate.MaxPriorityFeePerGas,
		MaxFeePerGas:         estimate.MaxFeePerGas,
		GasLimit:             estimate.GasLimit,
		To:                   to,
		Value:                value,
		Data:                 data,
		AccessList:           []AccessListEntry{},
	}, nil
}

// EncodeTxForSigning produces the EIP-1559 signing preimage (RLP stub).
// Real implementation uses go-ethereum's rlp package or core/types.
func (b *TransactionBuilder) EncodeTxForSigning(tx *EIP1559Transaction) ([]byte, error) {
	// EIP-1559 signing payload: keccak256(0x02 || RLP([chainId, nonce, maxPriorityFeePerGas,
	// maxFeePerGas, gasLimit, to, value, data, accessList]))
	// This is a stub — replace with full RLP encoding in production.
	raw := fmt.Sprintf(
		"0x02%s%016x%s%s%016x%s%s%s",
		padHex(fmt.Sprintf("%x", tx.ChainID), 16),
		tx.Nonce,
		padHex(tx.MaxPriorityFeePerGas.Text(16), 32),
		padHex(tx.MaxFeePerGas.Text(16), 32),
		tx.GasLimit,
		strings.TrimPrefix(tx.To, "0x"),
		padHex(tx.Value.Text(16), 32),
		hex.EncodeToString(tx.Data),
	)
	return []byte(raw), nil
}

// CREATE2Address computes a deterministic contract address using CREATE2.
// Formula: keccak256(0xff ++ deployer ++ salt ++ keccak256(initCode))[12:]
// This is a stub returning a formatted address for illustration.
func CREATE2Address(deployer string, salt [32]byte, initCodeHash [32]byte) string {
	// In production: use go-ethereum's crypto.CreateAddress2
	saltHex := hex.EncodeToString(salt[:])
	initHex := hex.EncodeToString(initCodeHash[:])
	_ = deployer
	// Stub: deterministic but not cryptographically correct
	combined := saltHex[:8] + initHex[8:32]
	return "0x" + combined + "0000000000000000"
}

// ERC20TransferData encodes the ERC-20 transfer(address,uint256) calldata.
func ERC20TransferData(recipient string, amount *big.Int) []byte {
	// Function selector: keccak256("transfer(address,uint256)")[:4] = 0xa9059cbb
	selector := []byte{0xa9, 0x05, 0x9c, 0xbb}

	// ABI-encode recipient (padded to 32 bytes) and amount (padded to 32 bytes)
	toAddr := strings.TrimPrefix(recipient, "0x")
	for len(toAddr) < 64 {
		toAddr = "0" + toAddr
	}

	amountHex := amount.Text(16)
	for len(amountHex) < 64 {
		amountHex = "0" + amountHex
	}

	addrBytes, _ := hex.DecodeString(toAddr)
	amtBytes, _ := hex.DecodeString(amountHex)

	data := make([]byte, 0, 4+32+32)
	data = append(data, selector...)
	data = append(data, addrBytes...)
	data = append(data, amtBytes...)
	return data
}

func padHex(s string, length int) string {
	for len(s) < length {
		s = "0" + s
	}
	return s
}
