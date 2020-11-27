/**
 * Runs the open orders script.
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
   * @param options An option list like "headers: false"
   * @return The list of all current open orders for all or given symbol/ticker.
   */
  function run(symbol, options) {
    Logger.log("[BinDoOpenOrders] Running..");
    const lock = BinUtils().getUserLock();
    if (!lock) { // Could not acquire lock! => Retry
      return run(symbol, options);
    }
    
    const opts = {};
    const data = BinRequest(opts).get(CACHE_TTL, "api/v3/openOrders", "", "");
  
    lock.releaseLock();
    const parsed = parse(symbol ? filter(data, symbol) : data, options);
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
  function parse(data, {headers: show_headers}) {
    const header = ["Date", "Pair", "Type", "Side", "Price", "Amount", "Executed", "Total"];
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
    }, BinUtils().parseBool(show_headers) ? [header] : []);

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