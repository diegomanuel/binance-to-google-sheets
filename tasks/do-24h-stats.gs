/**
 * Generl utility functions wrapper.
 *
 * @OnlyCurrentDoc
 */
function BinDo24hStats(options) {
  // Sanitize options
  options = options || {};
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
   * @param ["BTC","ETH"..] range If given, returns just the matching symbols stats.
   * @return The list of 24hs stats for given symbols against USDT.
   */
  function run(range_or_cell) {
    Logger.log("[BinDo24hStats] Running..");
    if (!range_or_cell) { // @TODO This limitation could be removed if cache is changed by other storage
      throw new Error("A range with crypto names must be given!");
    }
    const lock = BinUtils().getLock();
    if (!lock) { // Could not acquire lock! => Retry
      return run(range_or_cell);
    }
  
    const opts = {
      "public": true,
      "filter": function(data) {
        return filter(data, range_or_cell);
      }
    };
    const data = BinRequest().cache(CACHE_TTL, "get", "api/v3/ticker/24hr", "", "", opts);
  
    lock.releaseLock();
    const parsed = parse(data);
    Logger.log("[BinDo24hStats] Done!");
    return parsed;
  }
  
  /**
   * @OnlyCurrentDoc
   */
  function filter(data, range_or_cell) {
    const cryptos = BinUtils().getRangeOrCell(range_or_cell);
    return data.filter(function(ticker) {
      return cryptos.find(function(crypto) {
        return ticker.symbol == crypto+TICKER_AGAINST;
      });
    });
  }
  
  /**
   * @OnlyCurrentDoc
   */
  function parse(data) {
    const output = [["Date", "Symbol", "Price", "Ask", "Bid", "Open", "High", "Low", "Prev Close", "$ Change 24h", "% Change 24h", "Volume"]];
    const parsed = data.reduce(function(rows, ticker) {
      const symbol = ticker.symbol;
      const price = parseFloat(ticker.lastPrice);
      const ask_price = parseFloat(ticker.askPrice);
      const bid_price = parseFloat(ticker.bidPrice);
      const open_price = parseFloat(ticker.openPrice);
      const high_price = parseFloat(ticker.highPrice);
      const low_price = parseFloat(ticker.lowPrice);
      const close_price = parseFloat(ticker.prevClosePrice);
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

    return BinUtils().sortResults(parsed, 1, false);
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