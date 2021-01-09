/**
 * Runs the 24h stats script.
 */
function BinDo24hStats() {
  const CACHE_TTL = 60 * 60 * 4 - 60 * 5; // 3:55 hours, in seconds
  let lock_retries = 5; // Max retries to acquire lock

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "stats/24h";
  }

  /**
   * Returns this function period (the one that's used by the refresh triggers)
   */
  function period() {
    return "5m";
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
    const lock = BinUtils().getUserLock(lock_retries--);
    if (!lock) { // Could not acquire lock! => Retry
      return run(range_or_cell, options);
    }
  
    const opts = {
      CACHE_TTL,
      "public": true,
      "no_cache_ok": true,
      "validate_cache": function(data) {
        return BinUtils().checkExpectedResults(data, range_or_cell);
      },
      "filter": function(data) {
        return BinUtils().filterTickerSymbol(data, range_or_cell, ticker_against);
      }
    };
    const data = BinRequest(opts).get("api/v3/ticker/24hr", "", "");
  
    BinUtils().releaseLock(lock);
    const parsed = parse(data, range_or_cell, options);
    Logger.log("[BinDo24hStats] Done!");
    return parsed;
  }

  function parse(data, range_or_cell, {headers: show_headers}) {
    const header = ["Date", "Symbol", "Price", "Ask", "Bid", "Open", "High", "Low", "Prev Close", "$ Change 24h", "% Change 24h", "Volume"];
    const parsed = data.reduce(function(rows, ticker) {
      if (ticker === "?") {
        rows.push(header.map(function() {
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
    }, BinUtils().parseBool(show_headers) ? [header] : []);

    return range_or_cell ? parsed : BinUtils().sortResults(parsed, 1, false);
  }

  // Return just what's needed from outside!
  return {
    tag,
    period,
    run
  };
}