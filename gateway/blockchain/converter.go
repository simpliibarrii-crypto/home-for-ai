package blockchain

import (
	"context"
	"fmt"
	"math/big"
	"time"
)

// ─── Chainlink ABI Stubs ──────────────────────────────────────────────────────

// AggregatorV3Interface is the Chainlink price feed ABI stub.
// Production: bind with go-ethereum's abigen against the AggregatorV3Interface ABI.
type AggregatorV3Interface interface {
	LatestRoundData(ctx context.Context) (RoundData, error)
	Decimals(ctx context.Context) (uint8, error)
	Description(ctx context.Context) (string, error)
}

// RoundData matches Chainlink's latestRoundData() return tuple.
type RoundData struct {
	RoundID         *big.Int  `json:"roundId"`
	Answer          *big.Int  `json:"answer"`          // price * 10^decimals
	StartedAt       time.Time `json:"startedAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
	AnsweredInRound *big.Int  `json:"answeredInRound"`
}

// MockChainlinkFeed simulates a Chainlink price feed for development.
type MockChainlinkFeed struct {
	FeedAddress string
	TokenSymbol string
	Currency    string
	Price       float64 // raw price (USD or CAD)
	Decimals    uint8
}

// LatestRoundData returns mock price data.
func (m *MockChainlinkFeed) LatestRoundData(ctx context.Context) (RoundData, error) {
	// Chainlink prices are stored as integer * 10^8 for USD feeds
	scale := new(big.Float).SetPrec(256).SetFloat64(m.Price)
	factor := new(big.Float).SetInt(new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(m.Decimals)), nil))
	scaled, _ := new(big.Float).Mul(scale, factor).Int(nil)

	return RoundData{
		RoundID:         big.NewInt(1),
		Answer:          scaled,
		StartedAt:       time.Now().Add(-10 * time.Second),
		UpdatedAt:       time.Now(),
		AnsweredInRound: big.NewInt(1),
	}, nil
}

func (m *MockChainlinkFeed) Decimals(_ context.Context) (uint8, error) {
	return m.Decimals, nil
}

func (m *MockChainlinkFeed) Description(_ context.Context) (string, error) {
	return fmt.Sprintf("%s / %s", m.TokenSymbol, m.Currency), nil
}

// ─── Price Oracle Registry ────────────────────────────────────────────────────

// PriceOracle provides asset prices sourced from Chainlink feeds (or mocks).
type PriceOracle struct {
	feeds map[string]AggregatorV3Interface
}

// NewPriceOracle creates a price oracle pre-loaded with mock Chainlink feeds.
// Production: replace with live feed bindings via go-ethereum ethclient.
func NewPriceOracle() *PriceOracle {
	po := &PriceOracle{feeds: make(map[string]AggregatorV3Interface)}

	mockFeeds := []*MockChainlinkFeed{
		{FeedAddress: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419", TokenSymbol: "ETH", Currency: "USD", Price: 3200.0, Decimals: 8},
		{FeedAddress: "0x0000000000000000000000000000000000000001", TokenSymbol: "ETH", Currency: "CAD", Price: 4352.0, Decimals: 8},
		{FeedAddress: "0xf4030086522a5beea4988f8ca5b36dbc97bee88c", TokenSymbol: "BTC", Currency: "USD", Price: 67000.0, Decimals: 8},
		{FeedAddress: "0x0000000000000000000000000000000000000002", TokenSymbol: "BTC", Currency: "CAD", Price: 91120.0, Decimals: 8},
		{FeedAddress: "0x7bac85a8a13a4d761c50f15095d34e001f6b2b0e", TokenSymbol: "MATIC", Currency: "USD", Price: 0.89, Decimals: 8},
		{FeedAddress: "0xff3eeb22b5e3de6e705b44749c2559d522d66b76", TokenSymbol: "AVAX", Currency: "USD", Price: 38.0, Decimals: 8},
		{FeedAddress: "0x14e613ac84a31f709eadbf0fa6a5f29c0ea3f3f3", TokenSymbol: "BNB", Currency: "USD", Price: 580.0, Decimals: 8},
		{FeedAddress: "0x4ffC43a60e009B551865A93d232E33Fce9f01507", TokenSymbol: "SOL", Currency: "USD", Price: 175.0, Decimals: 8},
		{FeedAddress: "0x0000000000000000000000000000000000000010", TokenSymbol: "ARB", Currency: "USD", Price: 1.15, Decimals: 8},
	}

	for _, f := range mockFeeds {
		key := f.TokenSymbol + "/" + f.Currency
		po.feeds[key] = f
	}

	return po
}

// GetPrice returns the USD (or specified currency) price for a token.
func (po *PriceOracle) GetPrice(ctx context.Context, tokenSymbol, currency string) (float64, error) {
	key := tokenSymbol + "/" + currency
	feed, ok := po.feeds[key]
	if !ok {
		// Fall back to USD if currency-specific feed not found
		key = tokenSymbol + "/USD"
		feed, ok = po.feeds[key]
		if !ok {
			return 0, fmt.Errorf("no price feed for %s/%s", tokenSymbol, currency)
		}
	}

	rd, err := feed.LatestRoundData(ctx)
	if err != nil {
		return 0, fmt.Errorf("feed error: %w", err)
	}

	decimals, err := feed.Decimals(ctx)
	if err != nil {
		return 0, fmt.Errorf("decimals error: %w", err)
	}

	// Convert answer to float64: price = answer / 10^decimals
	divisor := new(big.Float).SetInt(
		new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(decimals)), nil),
	)
	priceBig := new(big.Float).SetInt(rd.Answer)
	result, _ := new(big.Float).Quo(priceBig, divisor).Float64()
	return result, nil
}

// ─── Crypto ↔ Fiat Converter ─────────────────────────────────────────────────

// ConversionQuote is the output of a blockchain-layer price conversion.
type ConversionQuote struct {
	TokenSymbol    string    `json:"token_symbol"`
	TokenAmount    float64   `json:"token_amount"`
	TokenAmountWei string    `json:"token_amount_wei"` // 18-decimal representation
	Currency       string    `json:"currency"`
	FiatAmount     float64   `json:"fiat_amount"`
	Rate           float64   `json:"rate"`
	FeedAddress    string    `json:"feed_address"`
	QuotedAt       time.Time `json:"quoted_at"`
}

// BlockchainConverter wraps the price oracle to provide typed conversion methods.
type BlockchainConverter struct {
	oracle *PriceOracle
}

// NewBlockchainConverter creates a converter.
func NewBlockchainConverter() *BlockchainConverter {
	return &BlockchainConverter{oracle: NewPriceOracle()}
}

// CryptoToFiatQuote returns a fiat-denominated quote for a token amount.
// tokenAmount is in token units (not wei). currency is ISO 4217.
func (c *BlockchainConverter) CryptoToFiatQuote(
	ctx context.Context,
	tokenSymbol string,
	tokenAmount float64,
	currency string,
) (*ConversionQuote, error) {
	rate, err := c.oracle.GetPrice(ctx, tokenSymbol, currency)
	if err != nil {
		return nil, err
	}

	fiatAmount := tokenAmount * rate

	// Convert to 18-decimal wei string
	amountWei := new(big.Float).SetFloat64(tokenAmount)
	scale := new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil)
	amountWei.Mul(amountWei, new(big.Float).SetInt(scale))
	amountWeiInt, _ := amountWei.Int(nil)

	return &ConversionQuote{
		TokenSymbol:    tokenSymbol,
		TokenAmount:    tokenAmount,
		TokenAmountWei: amountWeiInt.String(),
		Currency:       currency,
		FiatAmount:     fiatAmount,
		Rate:           rate,
		QuotedAt:       time.Now(),
	}, nil
}

// FiatToCryptoQuote computes how many tokens a fiat amount would buy.
func (c *BlockchainConverter) FiatToCryptoQuote(
	ctx context.Context,
	fiatAmount float64,
	currency string,
	tokenSymbol string,
) (*ConversionQuote, error) {
	rate, err := c.oracle.GetPrice(ctx, tokenSymbol, currency)
	if err != nil {
		return nil, err
	}
	if rate == 0 {
		return nil, fmt.Errorf("rate is zero for %s/%s", tokenSymbol, currency)
	}

	tokenAmount := fiatAmount / rate

	return &ConversionQuote{
		TokenSymbol: tokenSymbol,
		TokenAmount: tokenAmount,
		Currency:    currency,
		FiatAmount:  fiatAmount,
		Rate:        rate,
		QuotedAt:    time.Now(),
	}, nil
}

// TokenToTokenQuote converts between two tokens via USD as a base currency.
func (c *BlockchainConverter) TokenToTokenQuote(
	ctx context.Context,
	fromSymbol string,
	fromAmount float64,
	toSymbol string,
) (*ConversionQuote, error) {
	fromUSD, err := c.oracle.GetPrice(ctx, fromSymbol, "USD")
	if err != nil {
		return nil, fmt.Errorf("from token price: %w", err)
	}

	toUSD, err := c.oracle.GetPrice(ctx, toSymbol, "USD")
	if err != nil {
		return nil, fmt.Errorf("to token price: %w", err)
	}

	if toUSD == 0 {
		return nil, fmt.Errorf("to token price is zero")
	}

	toAmount := fromAmount * fromUSD / toUSD

	return &ConversionQuote{
		TokenSymbol: toSymbol,
		TokenAmount: toAmount,
		Currency:    fromSymbol,
		FiatAmount:  fromAmount,
		Rate:        fromUSD / toUSD,
		QuotedAt:    time.Now(),
	}, nil
}
