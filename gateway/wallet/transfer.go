package wallet

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"
)

// ─── Asset type constants ─────────────────────────────────────────────────────

// BondETF enumerates supported bond ETFs.
type BondETF string

const (
	BondETFCanadianXBB BondETF = "XBB"  // iShares Core Canadian Universe Bond ETF
	BondETFUSAGG       BondETF = "AGG"  // iShares Core U.S. Aggregate Bond ETF
	BondETFGlobalBNDW  BondETF = "BNDW" // Vanguard Total World Bond ETF
)

// CommodityETF enumerates supported commodity ETFs.
type CommodityETF string

const (
	CommodityGold   CommodityETF = "GLD" // SPDR Gold Shares
	CommoditySilver CommodityETF = "SLV" // iShares Silver Trust
	CommodityOil    CommodityETF = "USO" // United States Oil Fund
)

// ─── Quote & result types ─────────────────────────────────────────────────────

// CryptoToFiatQuote is the quoted output of a crypto → fiat conversion.
type CryptoToFiatQuote struct {
	FromChain      int64     `json:"from_chain"`
	TokenAddress   string    `json:"token_address"`
	TokenSymbol    string    `json:"token_symbol"`
	AmountIn       float64   `json:"amount_in"`
	TargetCurrency string    `json:"target_currency"`
	FiatAmount     float64   `json:"fiat_amount"`
	Rate           float64   `json:"rate"`       // fiat per token
	Fee            float64   `json:"fee"`        // gateway fee in fiat
	NetAmount      float64   `json:"net_amount"` // fiat_amount - fee
	OracleAddress  string    `json:"oracle_address"`
	QuotedAt       time.Time `json:"quoted_at"`
	ExpiresAt      time.Time `json:"expires_at"`
}

// BondPurchaseResult is the confirmation of a fiat → bond purchase.
type BondPurchaseResult struct {
	ETF             BondETF   `json:"etf"`
	AmountFiat      float64   `json:"amount_fiat"`
	Currency        string    `json:"currency"`
	Units           float64   `json:"units"`
	PricePerUnit    float64   `json:"price_per_unit"`
	BrokerOrderID   string    `json:"broker_order_id"`
	SettlementDate  string    `json:"settlement_date"` // T+2
	Status          string    `json:"status"`
	ExecutedAt      time.Time `json:"executed_at"`
}

// CommodityPurchaseResult is the confirmation of a fiat → commodity purchase.
type CommodityPurchaseResult struct {
	ETF           CommodityETF `json:"etf"`
	AmountFiat    float64      `json:"amount_fiat"`
	Currency      string       `json:"currency"`
	Units         float64      `json:"units"`
	PricePerUnit  float64      `json:"price_per_unit"`
	BrokerOrderID string       `json:"broker_order_id"`
	Status        string       `json:"status"`
	ExecutedAt    time.Time    `json:"executed_at"`
}

// FullTransferResult represents the atomic result of a full round-trip transfer.
type FullTransferResult struct {
	TransferID    string                   `json:"transfer_id"`
	Quote         *CryptoToFiatQuote       `json:"quote"`
	Bond          *BondPurchaseResult      `json:"bond,omitempty"`
	Commodity     *CommodityPurchaseResult `json:"commodity,omitempty"`
	Status        string                   `json:"status"`
	Error         string                   `json:"error,omitempty"`
	RollbackSteps []string                 `json:"rollback_steps,omitempty"`
	CompletedAt   time.Time                `json:"completed_at"`
}

// ─── Chainlink oracle stub ────────────────────────────────────────────────────

// chainlinkPriceFeeds maps (tokenSymbol, currency) to mock Chainlink aggregator addresses.
var chainlinkPriceFeeds = map[string]map[string]struct {
	Address string
	Price   float64
}{
	"ETH": {
		"USD": {Address: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419", Price: 3200.0},
		"CAD": {Address: "0x0000000000000000000000000000000000000001", Price: 4352.0},
	},
	"BTC": {
		"USD": {Address: "0xf4030086522a5beea4988f8ca5b36dbc97bee88c", Price: 67000.0},
		"CAD": {Address: "0x0000000000000000000000000000000000000002", Price: 91120.0},
	},
	"MATIC": {
		"USD": {Address: "0x7bac85a8a13a4d761c50f15095d34e001f6b2b0e", Price: 0.89},
		"CAD": {Address: "0x0000000000000000000000000000000000000003", Price: 1.21},
	},
	"AVAX": {
		"USD": {Address: "0xff3eeb22b5e3de6e705b44749c2559d522d66b76", Price: 38.0},
		"CAD": {Address: "0x0000000000000000000000000000000000000004", Price: 51.68},
	},
	"BNB": {
		"USD": {Address: "0x14e613ac84a31f709eadbf0fa6a5f29c0ea3f3f3", Price: 580.0},
		"CAD": {Address: "0x0000000000000000000000000000000000000005", Price: 788.8},
	},
}

// ─── Transfer functions ───────────────────────────────────────────────────────

// CryptoToFiat converts a token amount on a given chain to the target fiat currency.
// Uses Chainlink-style price oracle stubs.
//
// Parameters:
//   - fromChain:      EVM chain ID (1=Ethereum, 137=Polygon, etc.)
//   - tokenAddress:   ERC-20 contract address (or "native")
//   - tokenSymbol:    human-readable symbol (e.g. "ETH", "MATIC")
//   - amount:         token amount (in token units, not wei)
//   - targetCurrency: ISO 4217 code ("USD", "CAD", etc.)
func CryptoToFiat(
	ctx context.Context,
	fromChain int64,
	tokenAddress string,
	tokenSymbol string,
	amount float64,
	targetCurrency string,
) (*CryptoToFiatQuote, error) {
	if amount <= 0 {
		return nil, fmt.Errorf("amount must be positive")
	}

	// Look up oracle price
	currencyMap, ok := chainlinkPriceFeeds[tokenSymbol]
	if !ok {
		return nil, fmt.Errorf("unsupported token: %q (no Chainlink feed registered)", tokenSymbol)
	}
	feed, ok := currencyMap[targetCurrency]
	if !ok {
		return nil, fmt.Errorf("unsupported target currency: %q for token %q", targetCurrency, tokenSymbol)
	}

	fiatAmount := amount * feed.Price
	fee := fiatAmount * 0.0025 // 0.25% gateway fee
	netAmount := fiatAmount - fee

	quote := &CryptoToFiatQuote{
		FromChain:      fromChain,
		TokenAddress:   tokenAddress,
		TokenSymbol:    tokenSymbol,
		AmountIn:       amount,
		TargetCurrency: targetCurrency,
		FiatAmount:     fiatAmount,
		Rate:           feed.Price,
		Fee:            fee,
		NetAmount:      netAmount,
		OracleAddress:  feed.Address,
		QuotedAt:       time.Now(),
		ExpiresAt:      time.Now().Add(30 * time.Second),
	}

	log.Info().
		Str("token", tokenSymbol).
		Float64("amount", amount).
		Str("currency", targetCurrency).
		Float64("fiat", fiatAmount).
		Msg("transfer: crypto→fiat quote")

	return quote, nil
}

// ─── Bond ETF prices (stub) ───────────────────────────────────────────────────

var bondETFPrices = map[BondETF]float64{
	BondETFCanadianXBB: 31.50,
	BondETFUSAGG:       97.20,
	BondETFGlobalBNDW:  72.80,
}

// FiatToBonds submits a stub bond purchase via the broker API.
//
// Parameters:
//   - amountFiat: amount in fiat currency to invest
//   - currency:   ISO 4217 code of the fiat currency
//   - bondETF:    target bond ETF (XBB | AGG | BNDW)
func FiatToBonds(
	ctx context.Context,
	amountFiat float64,
	currency string,
	bondETF BondETF,
) (*BondPurchaseResult, error) {
	if amountFiat <= 0 {
		return nil, fmt.Errorf("amountFiat must be positive")
	}

	price, ok := bondETFPrices[bondETF]
	if !ok {
		return nil, fmt.Errorf("unsupported bond ETF: %q", bondETF)
	}

	units := amountFiat / price
	settlementDate := time.Now().AddDate(0, 0, 2).Format("2006-01-02") // T+2

	result := &BondPurchaseResult{
		ETF:            bondETF,
		AmountFiat:     amountFiat,
		Currency:       currency,
		Units:          units,
		PricePerUnit:   price,
		BrokerOrderID:  fmt.Sprintf("BOND-%d", time.Now().UnixNano()),
		SettlementDate: settlementDate,
		Status:         "EXECUTED",
		ExecutedAt:     time.Now(),
	}

	log.Info().
		Str("etf", string(bondETF)).
		Float64("amount", amountFiat).
		Float64("units", units).
		Msg("transfer: fiat→bond executed")

	return result, nil
}

// ─── Commodity ETF prices (stub) ─────────────────────────────────────────────

var commodityETFPrices = map[CommodityETF]float64{
	CommodityGold:   185.50,
	CommoditySilver: 22.10,
	CommodityOil:    75.30,
}

// FiatToCommodities submits a stub commodity ETF purchase.
//
// Parameters:
//   - amountFiat: amount in fiat to invest
//   - currency:   ISO 4217 code
//   - commodity:  target commodity ETF (GLD | SLV | USO)
func FiatToCommodities(
	ctx context.Context,
	amountFiat float64,
	currency string,
	commodity CommodityETF,
) (*CommodityPurchaseResult, error) {
	if amountFiat <= 0 {
		return nil, fmt.Errorf("amountFiat must be positive")
	}

	price, ok := commodityETFPrices[commodity]
	if !ok {
		return nil, fmt.Errorf("unsupported commodity ETF: %q", commodity)
	}

	units := amountFiat / price

	result := &CommodityPurchaseResult{
		ETF:           commodity,
		AmountFiat:    amountFiat,
		Currency:      currency,
		Units:         units,
		PricePerUnit:  price,
		BrokerOrderID: fmt.Sprintf("COMM-%d", time.Now().UnixNano()),
		Status:        "EXECUTED",
		ExecutedAt:    time.Now(),
	}

	log.Info().
		Str("commodity", string(commodity)).
		Float64("amount", amountFiat).
		Float64("units", units).
		Msg("transfer: fiat→commodity executed")

	return result, nil
}

// ─── Full round-trip pipeline ─────────────────────────────────────────────────

// TransferTarget specifies the final destination of a full round-trip transfer.
type TransferTarget struct {
	Type      string       `json:"type"`       // "bond" | "commodity"
	BondETF   BondETF      `json:"bond_etf,omitempty"`
	Commodity CommodityETF `json:"commodity,omitempty"`
	Currency  string       `json:"currency"`   // target fiat currency for intermediate step
}

// FullTransfer executes an atomic crypto → fiat → bond/commodity pipeline.
// If any step fails the pipeline rolls back (stub rollback — real impl requires 2PC or saga).
func FullTransfer(
	ctx context.Context,
	fromChain int64,
	tokenAddress string,
	tokenSymbol string,
	amount float64,
	target TransferTarget,
) (*FullTransferResult, error) {
	transferID := fmt.Sprintf("TX-%d", time.Now().UnixNano())
	result := &FullTransferResult{
		TransferID:    transferID,
		Status:        "IN_PROGRESS",
		RollbackSteps: []string{},
	}

	log.Info().
		Str("transfer_id", transferID).
		Str("token", tokenSymbol).
		Float64("amount", amount).
		Str("target_type", target.Type).
		Msg("transfer: full pipeline start")

	// ── Step 1: Crypto → Fiat ────────────────────────────────────────────────
	quote, err := CryptoToFiat(ctx, fromChain, tokenAddress, tokenSymbol, amount, target.Currency)
	if err != nil {
		result.Status = "FAILED"
		result.Error = fmt.Sprintf("crypto→fiat failed: %v", err)
		return result, err
	}
	result.Quote = quote
	result.RollbackSteps = append(result.RollbackSteps, "crypto→fiat quoted")

	// ── Step 2: Fiat → Bond or Commodity ────────────────────────────────────
	switch target.Type {
	case "bond":
		bondResult, err := FiatToBonds(ctx, quote.NetAmount, target.Currency, target.BondETF)
		if err != nil {
			result.Status = "FAILED"
			result.Error = fmt.Sprintf("fiat→bond failed: %v", err)
			// Rollback: re-credit fiat (stub)
			result.RollbackSteps = append(result.RollbackSteps, "rollback: fiat re-credited")
			log.Warn().Str("transfer_id", transferID).Msg("transfer: rollback executed")
			return result, err
		}
		result.Bond = bondResult

	case "commodity":
		commResult, err := FiatToCommodities(ctx, quote.NetAmount, target.Currency, target.Commodity)
		if err != nil {
			result.Status = "FAILED"
			result.Error = fmt.Sprintf("fiat→commodity failed: %v", err)
			result.RollbackSteps = append(result.RollbackSteps, "rollback: fiat re-credited")
			log.Warn().Str("transfer_id", transferID).Msg("transfer: rollback executed")
			return result, err
		}
		result.Commodity = commResult

	default:
		return nil, fmt.Errorf("unsupported transfer target type: %q (expected 'bond' or 'commodity')", target.Type)
	}

	result.Status = "COMPLETED"
	result.CompletedAt = time.Now()

	log.Info().
		Str("transfer_id", transferID).
		Str("status", result.Status).
		Msg("transfer: full pipeline completed")

	return result, nil
}
