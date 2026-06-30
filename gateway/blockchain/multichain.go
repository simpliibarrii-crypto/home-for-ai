package blockchain

import "fmt"

// Chain defines the complete configuration for a supported EVM-compatible network.
type Chain struct {
	ChainID         int64  `json:"chain_id"`
	Name            string `json:"name"`
	ShortName       string `json:"short_name"`
	NetworkType     string `json:"network_type"` // "evm" | "svm" (Solana)
	RPCURL          string `json:"rpc_url"`
	WebSocketURL    string `json:"ws_url,omitempty"`
	ExplorerURL     string `json:"explorer_url"`
	NativeCurrency  NativeCurrency `json:"native_currency"`
	USDCERC20       string `json:"usdc_erc20,omitempty"`   // USDC contract address (EVM)
	EntryPointAddr  string `json:"entry_point,omitempty"`  // EIP-4337 EntryPoint contract
	Bundler4337URL  string `json:"bundler_url,omitempty"`  // EIP-4337 bundler RPC URL
	IsEVM           bool   `json:"is_evm"`
	IsTestnet       bool   `json:"is_testnet"`
	BlockTime       int    `json:"block_time_ms"`          // approximate block time in ms
	FinalizationBlocks int `json:"finalization_blocks"`    // blocks to consider finalized
}

// NativeCurrency describes the chain's native token.
type NativeCurrency struct {
	Name     string `json:"name"`
	Symbol   string `json:"symbol"`
	Decimals int    `json:"decimals"`
}

// ChainRegistry holds the complete multi-chain configuration.
type ChainRegistry struct {
	chains map[int64]*Chain
}

// NewChainRegistry constructs the default registry with all 8 supported chains.
func NewChainRegistry() *ChainRegistry {
	r := &ChainRegistry{chains: make(map[int64]*Chain)}

	chains := []*Chain{
		// ── Ethereum Mainnet (EIP-1559, EIP-4337) ─────────────────────────────
		{
			ChainID:     1,
			Name:        "Ethereum",
			ShortName:   "eth",
			NetworkType: "evm",
			RPCURL:      "https://eth.llamarpc.com",
			WebSocketURL: "wss://eth.llamarpc.com",
			ExplorerURL: "https://etherscan.io",
			NativeCurrency: NativeCurrency{Name: "Ether", Symbol: "ETH", Decimals: 18},
			USDCERC20:   "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
			EntryPointAddr: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
			Bundler4337URL: "https://api.stackup.sh/v1/node/ethereum-mainnet",
			IsEVM:       true,
			BlockTime:   12000,
			FinalizationBlocks: 64,
		},
		// ── Polygon PoS ────────────────────────────────────────────────────────
		{
			ChainID:     137,
			Name:        "Polygon",
			ShortName:   "matic",
			NetworkType: "evm",
			RPCURL:      "https://polygon.llamarpc.com",
			WebSocketURL: "wss://polygon.llamarpc.com",
			ExplorerURL: "https://polygonscan.com",
			NativeCurrency: NativeCurrency{Name: "MATIC", Symbol: "MATIC", Decimals: 18},
			USDCERC20:   "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
			EntryPointAddr: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
			Bundler4337URL: "https://api.stackup.sh/v1/node/polygon",
			IsEVM:       true,
			BlockTime:   2000,
			FinalizationBlocks: 256,
		},
		// ── Arbitrum One (L2, EIP-1559 compatible) ─────────────────────────────
		{
			ChainID:     42161,
			Name:        "Arbitrum One",
			ShortName:   "arb1",
			NetworkType: "evm",
			RPCURL:      "https://arbitrum.llamarpc.com",
			WebSocketURL: "wss://arbitrum.llamarpc.com",
			ExplorerURL: "https://arbiscan.io",
			NativeCurrency: NativeCurrency{Name: "Ether", Symbol: "ETH", Decimals: 18},
			USDCERC20:   "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
			EntryPointAddr: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
			Bundler4337URL: "https://api.stackup.sh/v1/node/arbitrum",
			IsEVM:       true,
			BlockTime:   250,
			FinalizationBlocks: 1,
		},
		// ── Base (Coinbase L2, OP Stack) ───────────────────────────────────────
		{
			ChainID:     8453,
			Name:        "Base",
			ShortName:   "base",
			NetworkType: "evm",
			RPCURL:      "https://base.llamarpc.com",
			WebSocketURL: "wss://base.llamarpc.com",
			ExplorerURL: "https://basescan.org",
			NativeCurrency: NativeCurrency{Name: "Ether", Symbol: "ETH", Decimals: 18},
			USDCERC20:   "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
			EntryPointAddr: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
			Bundler4337URL: "https://api.stackup.sh/v1/node/base",
			IsEVM:       true,
			BlockTime:   2000,
			FinalizationBlocks: 1,
		},
		// ── BNB Smart Chain ────────────────────────────────────────────────────
		{
			ChainID:     56,
			Name:        "BNB Smart Chain",
			ShortName:   "bnb",
			NetworkType: "evm",
			RPCURL:      "https://bsc.publicnode.com",
			WebSocketURL: "wss://bsc.publicnode.com",
			ExplorerURL: "https://bscscan.com",
			NativeCurrency: NativeCurrency{Name: "BNB", Symbol: "BNB", Decimals: 18},
			USDCERC20:   "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
			EntryPointAddr: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
			Bundler4337URL: "https://api.stackup.sh/v1/node/bsc",
			IsEVM:       true,
			BlockTime:   3000,
			FinalizationBlocks: 15,
		},
		// ── Avalanche C-Chain ──────────────────────────────────────────────────
		{
			ChainID:     43114,
			Name:        "Avalanche C-Chain",
			ShortName:   "avax",
			NetworkType: "evm",
			RPCURL:      "https://avalanche.publicnode.com/ext/bc/C/rpc",
			WebSocketURL: "wss://avalanche.publicnode.com/ext/bc/C/ws",
			ExplorerURL: "https://snowscan.xyz",
			NativeCurrency: NativeCurrency{Name: "Avalanche", Symbol: "AVAX", Decimals: 18},
			USDCERC20:   "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
			EntryPointAddr: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
			Bundler4337URL: "https://api.stackup.sh/v1/node/avalanche",
			IsEVM:       true,
			BlockTime:   2000,
			FinalizationBlocks: 1,
		},
		// ── Optimism ──────────────────────────────────────────────────────────
		{
			ChainID:     10,
			Name:        "Optimism",
			ShortName:   "oeth",
			NetworkType: "evm",
			RPCURL:      "https://optimism.llamarpc.com",
			WebSocketURL: "wss://optimism.llamarpc.com",
			ExplorerURL: "https://optimistic.etherscan.io",
			NativeCurrency: NativeCurrency{Name: "Ether", Symbol: "ETH", Decimals: 18},
			USDCERC20:   "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
			EntryPointAddr: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
			Bundler4337URL: "https://api.stackup.sh/v1/node/optimism",
			IsEVM:       true,
			BlockTime:   2000,
			FinalizationBlocks: 1,
		},
		// ── Solana (non-EVM) ───────────────────────────────────────────────────
		{
			ChainID:     999999999, // pseudo chain ID for Solana mainnet
			Name:        "Solana",
			ShortName:   "sol",
			NetworkType: "svm",
			RPCURL:      "https://api.mainnet-beta.solana.com",
			WebSocketURL: "wss://api.mainnet-beta.solana.com",
			ExplorerURL: "https://solscan.io",
			NativeCurrency: NativeCurrency{Name: "Solana", Symbol: "SOL", Decimals: 9},
			USDCERC20:   "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC SPL mint
			IsEVM:       false,
			BlockTime:   400,
			FinalizationBlocks: 32,
		},
	}

	for _, c := range chains {
		r.chains[c.ChainID] = c
	}

	return r
}

// Get returns the chain config for the given chainID.
func (r *ChainRegistry) Get(chainID int64) (*Chain, error) {
	c, ok := r.chains[chainID]
	if !ok {
		return nil, fmt.Errorf("unsupported chainID: %d", chainID)
	}
	return c, nil
}

// All returns all registered chains.
func (r *ChainRegistry) All() []*Chain {
	chains := make([]*Chain, 0, len(r.chains))
	for _, c := range r.chains {
		chains = append(chains, c)
	}
	return chains
}

// EVMChains returns only EVM-compatible chains.
func (r *ChainRegistry) EVMChains() []*Chain {
	var result []*Chain
	for _, c := range r.chains {
		if c.IsEVM {
			result = append(result, c)
		}
	}
	return result
}

// DefaultRegistry is a package-level singleton for convenience.
var DefaultRegistry = NewChainRegistry()
