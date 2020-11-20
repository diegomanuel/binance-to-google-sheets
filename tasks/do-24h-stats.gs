/**
 * Runs the 24h stats script.
 *
 * @OnlyCurrentDoc
 */
function BinDo24hStats() {
  const CACHE_TTL = 60 * 60 * 4; // 4 hours, in seconds
  const regex_formula = new RegExp("=.*BINANCE\\s*\\(\\s*\""+tag());

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "stats/24h";
  }
  
  /**
   * Returns the 24hs stats list against USDT.
   *
   * @param {["BTC","ETH"..]} range_or_cell If given, returns just the matching symbol price or range prices. If not given, returns all the prices.
   * @param options Ticker to match against (USDT by default) or an option list like "ticker: USDT, headers: false"
   * @return The list of 24hs stats for given symbols
   */
  function run(range_or_cell, options) {
    const ticker_against = options["ticker"];
    Logger.log("[BinDo24hStats] Running..");
    if (!range_or_cell) { // @TODO This limitation could be removed if cache is changed by other storage
      throw new Error("A range with crypto names must be given!");
    }
    const lock = BinUtils().getUserLock();
    if (!lock) { // Could not acquire lock! => Retry
      return run(range_or_cell, options);
    }
  
    const opts = {
      "public": true,
      "no_cache_ok": true,
      "filter": function(data) {
        return BinUtils().filterTickerSymbol(data, range_or_cell, ticker_against);
      }
    };
    const data = BinRequest().cache(CACHE_TTL, "get", "api/v3/ticker/24hr", "", "", opts);
  
    lock.releaseLock();
    const parsed = parse(data, range_or_cell);
    Logger.log("[BinDo24hStats] Done!");
    return parsed;
  }
  
  /**
   * @OnlyCurrentDoc
   */
  function parse(data, range_or_cell) {
    const output = [["Date", "Symbol", "Price", "Ask", "Bid", "Open", "High", "Low", "Prev Close", "$ Change 24h", "% Change 24h", "Volume"]];
    const parsed = data.reduce(function(rows, ticker) {
      if (ticker === "?") {
        rows.push(output[0].map(function() {
          return "?";
        }));
        return rows;
      }

      const symbol = ticker.symbol;
      const price = BinUtils().parsePrice(ticker.lastPrice);
      const ask_price = BinUtils().parsePrice(ticker.askPrice);
      const bid_price = BinUtils().parsePrice(ticker.bidPrice);
      const open_price = BinUtils().parsePrice(ticker.openPrice);
      const high_price = BinUtils().parsePrice(ticker.highPrice);
      const low_price = BinUtils().parsePrice(ticker.lowPrice);
      const close_price = BinUtils().parsePrice(ticker.prevClosePrice);
      const chg24h_price = parseFloat(ticker.priceChange);
      const chg24h_percent = parseFloat(ticker.priceChangePercent) / 100;
      const volume = parseFloat(ticker.quoteVolume);
      const row = [
        new Date(parseInt(ticker.closeTime)),
        symbol,
        price,
        ask_price,
        bid_price,
        open_price,
        high_price,
        low_price,
        close_price,
        chg24h_price,
        chg24h_percent,
        volume
      ];
      rows.push(row);
      return rows;
    }, output);

    return range_or_cell ? parsed : BinUtils().sortResults(parsed, 1, false);
  }

  /**
   * Returns true if the formula matches the criteria
   */
  function isFormulaReplacement(period, formula) {
    return period == "5m" && regex_formula.test(formula);
  }
  
  // Return just what's needed from outside!
  return {
    tag,
    run,
    isFormulaReplacement
  };
}