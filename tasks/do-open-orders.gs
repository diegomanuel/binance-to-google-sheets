/**
 * Generl utility functions wrapper.
 *
 * @OnlyCurrentDoc
 */
function BinDoOpenOrders() {
  const CACHE_TTL = 60 * 5 - 10; // 4:50 minutes, in seconds
  const regex_formula = new RegExp("=.*BINANCE\\s*\\(\\s*\""+tag());

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "orders/open";
  }
  
  /**
   * Returns current open oders.
   *
   * @param {"BTCUSDT|..."} symbol If given, returns just the matching symbol open orders.
   * @return The list of all current open orders for all or given symbol/ticker.
   */
  function run(symbol) {
    Logger.log("[BinDoOpenOrders] Running..");
    const lock = BinUtils().getUserLock();
    if (!lock) { // Could not acquire lock! => Retry
      return run(symbol);
    }
    
    const opts = {};
    const data = BinRequest().cache(CACHE_TTL, "get", "api/v3/openOrders", "", "", opts);
  
    lock.releaseLock();
    const parsed = parse(symbol ? filter(data, symbol) : data);
    Logger.log("[BinDoOpenOrders] Done!");
    return parsed;
  }
  
  /**
   * @OnlyCurrentDoc
   */
  function filter(data, symbol) {
    return data.filter(function(ticker) {
      return ticker.symbol == symbol;
    });
  }
  
  /**
   * @OnlyCurrentDoc
   */
  function parse(data) {
    const output = [["Date", "Pair", "Type", "Side", "Price", "Amount", "Executed", "Total"]];
    const parsed = data.reduce(function(rows, order) {
      const symbol = order.symbol;
      const price = BinUtils().parsePrice(order.price);
      const amount = parseFloat(order.origQty);
      const row = [
        new Date(parseInt(order.time)),
        symbol,
        order.type,
        order.side,
        price,
        amount,
        parseFloat(order.executedQty),
        price*amount
      ];
      rows.push(row);
      return rows;
    }, output);

    return BinUtils().sortResults(parsed, 0, true);
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