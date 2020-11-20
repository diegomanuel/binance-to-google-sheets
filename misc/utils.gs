/**
 * General utility functions wrapper.
 *
 * @OnlyCurrentDoc
 */
function BinUtils() {
  return {
    getDocumentLock,
    getScriptLock,
    getUserLock,
    getRangeOrCell,
    parsePrice,
    parseOptions,
    filterTickerSymbol,
    sortResults,
    obscureSecret,
    isAuthEnough,
    toast
  };
  
  /**
  * Gets a lock that prevents any user of the current document from concurrently running a section of code.
  */
  function getDocumentLock(time, sleep) {
    return _getLock("getDocumentLock", time, sleep);
  }

  /**
  * Gets a lock that prevents any user from concurrently running a section of code.
  */
  function getScriptLock(time, sleep) {
    return _getLock("getScriptLock", time, sleep);
  }

  /**
  * Gets a lock that prevents the current user from concurrently running a section of code.
  */
  function getUserLock(time, sleep) {
    return _getLock("getUserLock", time, sleep);
  }

  /**
  * Gets lock, waiting for given `time` to acquire it, or sleep given `sleep` milliseconds to return `false`.
  */
  function _getLock(lock_serv_func, time, sleep) {
    time = time || 5000; // Milliseconds
    sleep = sleep || 500; // Milliseconds
    const lock = LockService[lock_serv_func]();
    if (!lock.tryLock(time) || !lock.hasLock()) {
      Logger.log("Could not acquire lock! Waiting "+sleep+"ms..");
      Utilities.sleep(sleep);
      return false;
    }
    return lock;
  }

  /**
   * Always returns an array no matter if it's a single cell or an entire range
   * @TODO Add "n-dimension" support
   */
  function getRangeOrCell(range_or_cell) {
    return typeof range_or_cell == "string" ? [range_or_cell] : range_or_cell;
  }

  /**
   * Returns a given price as a float number or "?" if it's wrong
   * NOTE: Only makes sense to pass prices > 0 because a $0 price will produce "?"
   * And besides.. nothing worths $0 right? nothing's free! (except this script, of course =)
   */
  function parsePrice(price) {
    return (parseFloat(price) || "?");
  }

  /**
   * Returns the options parsed from a string like "ticker: USDT, headers: false"
   * or a single value like "USDT" as {ticker: "USDT"}
   */
  function parseOptions(opts_or_value) {
    const matches = (opts_or_value||"").matchAll(/([^,\s]+):\s*([^,\s]+)/ig);
    const marr = [...matches];
    const options = marr.reduce(function(obj, [_, key, val]) {
      obj[key] = val;
      return obj;
    }, {ticker: marr.length ? TICKER_AGAINST : (opts_or_value||TICKER_AGAINST)});

    if (DEBUG) {
      Logger.log("PARAMS: "+JSON.stringify(opts_or_value));
      Logger.log("MATCHES: "+JSON.stringify(marr));
      Logger.log("OPTIONS: "+JSON.stringify(options));
    }

    return options;
  }

  /**
   * Filters a given data array by given range of values or a single value
   * @param data Array with tickers data
   * @param range_or_cell A range of cells or a single cell
   * @param ticker_against Ticker to match against
   */
  function filterTickerSymbol(data, range_or_cell, ticker_against) {
    ticker_against = ticker_against || TICKER_AGAINST;
    const cryptos = getRangeOrCell(range_or_cell);
    const tickers = cryptos.reduce(function(tickers, crypto) { // Init tickers
        tickers[crypto+ticker_against] = "?";
        return tickers;
      }, {});
    if (DEBUG) {
      Logger.log("TICKERS: "+JSON.stringify(tickers));
    }

    const data_array = Array.isArray(data) ? data : (data ? [data] : []);
    const results = data_array.reduce(function(tickers, ticker) {
      if (tickers[ticker.symbol] !== undefined) {
        tickers[ticker.symbol] = ticker;
      }
      return tickers;
      }, tickers);

    if (DEBUG) {
      Logger.log("FILTERED: "+JSON.stringify(results));
    }
    return Object.keys(results).map(function(ticker) { // Return tickers values
      return results[ticker];
    });
  }
  
  /**
  * Sorts a results array by given index (default 0) but keeping the first row as headers.
  */
  function sortResults([header, ...results], index, reverse) {
    const sorted = (results||[]).sort(function(v1, v2) {
      return (v1[index||0] > v2[index||0] ? 1 : -1) * (reverse ? -1 : 1);
    });
    return [header, ...sorted];
  }
  
  /**
  * Replaces some characters to obscure the given secret.
  */
  function obscureSecret(secret) {
    if (!(secret && secret.length)) {
      return "";
    }

    const length = 20;
    const start = parseInt(secret.length / 2) - parseInt(length / 2);
    return secret.substr(0,start)+"*".repeat(length-1)+secret.substr(start+length);
  }

  /**
   * Returns true is the current auth mode is enough to the add-on requirements
   */
  function isAuthEnough(auth_mode) {
    return auth_mode === ScriptApp.AuthMode.FULL || auth_mode === ScriptApp.AuthMode.LIMITED;
  }

  /**
   * Displays a toast message on screen
   */
  function toast(body, title, timeout) {
    return SpreadsheetApp.getActive().toast(
      body,
      title || "Binance to Google Sheets",
      timeout || 10 // In seconds
    );
  }
}
