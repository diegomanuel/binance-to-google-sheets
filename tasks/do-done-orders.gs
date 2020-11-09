/**
 * Generl utility functions wrapper.
 *
 * @OnlyCurrentDoc
 */
function BinDoDoneOrders(options) {
  // Sanitize options
  options = options || {};
  const CACHE_TTL = 60 * 5 - 10; // 4:50 minutes, in seconds
  const regex_formula = new RegExp("=.*BINANCE\\s*\\(\\s*\""+tag());

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "orders/done";
  }
  
  /**
   * Returns all account orders: active, canceled, or filled.
   *
   * @param ["BTC","ETH"..] range If given, returns just the matching symbols stats.
   * @return The list of all current open orders for all symbols/tickers.
   */
  function run(range_or_cell) {
    Logger.log("[BinDoDoneOrders] Running..");
    const lock = BinUtils().getUserLock();
    if (!lock) { // Could not acquire lock! => Retry
      return run(range_or_cell);
    }
    
    const opts = {
      "filter": filter
    };
    const range = BinUtils().getRangeOrCell(range_or_cell);
    const data = (range||[]).reduce(function(rows, crypto) {
      const qs = "symbol="+crypto+TICKER_AGAINST;
      Utilities.sleep(200); // Add some waiting time to avoid 418 responses!
      const crypto_data = BinRequest().cache(CACHE_TTL, "get", "api/v3/myTrades", qs, "", opts);
      return [...crypto_data, ...rows];
    }, []);
  
    lock.releaseLock();
    const parsed = parse(data);
    Logger.log("[BinDoDoneOrders] Done!");
    return parsed;
  }
  
  /**
   * @OnlyCurrentDoc
   */
  function filter(data) {
    return data.filter(function(order) {
      return true; // No filtering so far..
    });
  }
  
  /**
   * @OnlyCurrentDoc
   */
  function parse(data) {
    const output = [["#ID", "Date", "Pair", "Side", "Price", "Amount", "Commission", "Total"]];
    const parsed = data.reduce(function(rows, order) {
      const symbol = order.symbol;
      const price = BinUtils().parsePrice(order.price);
      const amount = parseFloat(order.qty);
      const commission = BinUtils().parsePrice(order.commission);
      const row = [
        order.orderId,
        new Date(parseInt(order.time)),
        symbol,
        order.isBuyer ? "BUY" : "SELL",
        price,
        amount,
        commission,
        price*amount
      ];
      rows.push(row);
      return rows;
    }, output);

    return BinUtils().sortResults(parsed, 1, true);
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