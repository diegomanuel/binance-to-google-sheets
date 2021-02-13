/**
 * Runs the open orders script.
 */
function BinDoOrdersOpen() {
  let lock_retries = 5; // Max retries to acquire lock

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "orders/open";
  }

  /**
   * Returns true if the given operation belongs to this code
   */
  function is(operation) {
    return operation === tag();
  }

  /**
   * Returns this function period (the one that's used by the refresh triggers)
   */
  function period() {
    return BinScheduler().getSchedule(tag()) || "5m";
  }
  
  /**
   * Returns current open oders.
   *
   * @param {"BTCUSDT|..."} symbol If given, returns just the matching symbol open orders.
   * @param options An option list like "headers: false"
   * @return The list of all current open orders for all or given symbol/ticker.
   */
  function run(symbol, options) {
    const bs = BinScheduler();
    try {
      bs.clearFailed(tag());
      return execute(symbol, options);
    } catch(err) { // Re-schedule this failed run!
      bs.rescheduleFailed(tag());
      throw err;
    }
  }

  function execute(symbol, options) {
    Logger.log("[BinDoOrdersOpen] Running..");
    const lock = BinUtils().getUserLock(lock_retries--);
    if (!lock) { // Could not acquire lock! => Retry
      return execute(symbol, options);
    }

    const data = fetch(symbol);
    BinUtils().releaseLock(lock);
    const parsed = parse(symbol ? filter(data, symbol) : data, options);
    Logger.log("[BinDoOrdersOpen] Done!");
    return parsed;
  }

  function fetch(symbol) {
    const opts = {CACHE_TTL: 55, "discard_40x": true}; // Discard 40x errors for disabled wallets!
    const dataSpot = fetchSpotOrders(opts); // Get all SPOT orders
    const dataCross = fetchCrossOrders(opts); // Get all CROSS MARGIN orders
    const dataIsolated = fetchIsolatedOrders(opts, symbol); // Get all ISOLATED MARGIN orders
    return [...dataSpot, ...dataCross, ...dataIsolated];
  }

  function fetchSpotOrders(opts) {
    Logger.log("[BinDoOrdersOpen][SPOT] Fetching orders..");
    const orders = BinRequest(opts).get("api/v3/openOrders");
    return orders.map(function(order) {
      order.market = "SPOT";
      return order;
    });
  }

  function fetchCrossOrders(opts) {
    Logger.log("[BinDoOrdersOpen][CROSS] Fetching orders..");
    const orders = BinRequest(opts).get("sapi/v1/margin/openOrders") || []; //  It may fail if wallet isn't enabled!
    return orders.map(function(order) {
      order.market = "CROSS";
      return order;
    });
  }

  function fetchIsolatedOrders(opts, symbol) {
    const wallet = BinWallet();
    const symbols = symbol ? [symbol] : Object.keys(wallet.getIsolatedPairs());
    return symbols.reduce(function (acc, symbol) {
      Logger.log("[BinDoOrdersOpen][ISOLATED] Fetching orders for '"+symbol+"' pair..");
      const qs = "isIsolated=true&symbol="+symbol;
      const orders = BinRequest(opts).get("sapi/v1/margin/openOrders", qs) || []; //  It may fail if wallet isn't enabled!
      const data = orders.map(function(order) {
        order.market = "ISOLATED";
        return order;
      });
      return [...acc, ...data];
    }, []);
  }

  function filter(data, symbol) {
    return data.filter(function(ticker) {
      return ticker.symbol == symbol;
    });
  }

  function parse(data, {headers: show_headers}) {
    const header = ["Date", "Pair", "Market", "Type", "Side", "Price", "Amount", "Executed", "Total"];
    const parsed = data.reduce(function(rows, order) {
      const symbol = order.symbol;
      const price = BinUtils().parsePrice(order.price);
      const amount = parseFloat(order.origQty);
      const row = [
        new Date(parseInt(order.time)),
        symbol,
        order.market,
        order.type,
        order.side,
        price,
        amount,
        parseFloat(order.executedQty),
        price*amount
      ];
      rows.push(row);
      return rows;
    }, []);

    const sorted = BinUtils().sortResults(parsed, 0, true);
    return BinUtils().parseBool(show_headers) ? [header, ...sorted] : sorted;
  }

  // Return just what's needed from outside!
  return {
    tag,
    is,
    period,
    run
  };
}