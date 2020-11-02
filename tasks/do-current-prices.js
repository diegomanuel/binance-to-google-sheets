/**
 * Runs the current prices script.
 *
 * @OnlyCurrentDoc
 */
function BinDoCurrentPrices(options) {
  // Sanitize options
  options = options || {
    CACHE_TTL: 60 * 2 // 2 minutes, in seconds
  };
  
  /**
   * Returns current market prices.
   *
   * @param {"BTCUSDT|..."} symbol If given, returns just the matching symbol price.
   * @return The list of current prices for all symbols/tickers.
   */
  function run(symbol) {
    Logger.log("[BinDoCurrentPrices/1] Running..");
    const lock = BinUtils().getLock();
    if (!lock) { // Could not acquire lock! => Retry
      return run(symbol);
    }

    const opts = {"public": true};
    const data = BinRequest().cache(options.CACHE_TTL, "get", "api/v3/ticker/price", "", "", opts);
  
    lock.releaseLock();
    const parsed = parse(data, symbol);
    Logger.log("[BinDoCurrentPrices/1] Done!");
    return parsed;
  }
  
  /**
   * @OnlyCurrentDoc
   */
  function parse(data, symbol) {
    const output = [["Symbol", "Price"]];
    let found = null;
    const parsed = data.reduce(function(rows, ticker) {
      if (symbol && symbol == ticker.symbol) {
        found = parseFloat(ticker.price);
      }
      const row = [
        ticker.symbol,
        parseFloat(ticker.price)
      ];
      rows.push(row);
      return rows;
    }, output);

    if (symbol && found != null) { // Ticker found!
      return found;
    }
    if (symbol) { // Ticker not found!
      return "";
    }
    return BinUtils().sortResults(parsed);
  }
  
  // Return just what's needed from outside!
  return {
    run
  };
}