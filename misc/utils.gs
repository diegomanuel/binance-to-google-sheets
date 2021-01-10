/**
 * General utility functions wrapper.
 */
function BinUtils() {
  let lock_retries = 5; // Max retries to acquire lock for formulas refreshing

  return {
    releaseLock,
    getDocumentLock,
    getScriptLock,
    getUserLock,
    getRangeOrCell,
    parsePrice,
    parseBool,
    parseOptions,
    checkExpectedResults,
    filterTickerSymbol,
    sortResults,
    obscureSecret,
    isFormulaMatching,
    extractFormulaParams,
    forceRefreshSheetFormulas,
    refreshMenu,
    toast
  };
  
  /**
  * Releases a lock (failsafe).
  */
  function releaseLock(lock) {
    try {
      return lock ? lock.releaseLock() : false;
    } catch (err) {
      console.error("Can't release lock: "+JSON.stringify(err));
    }
  }

  /**
  * Gets a lock that prevents any user of the current document from concurrently running a section of code.
  */
  function getDocumentLock(retries, time, sleep) {
    return _getLock("getDocumentLock", retries, time, sleep);
  }

  /**
  * Gets a lock that prevents any user from concurrently running a section of code.
  */
  function getScriptLock(retries, time, sleep) {
    return _getLock("getScriptLock", retries, time, sleep);
  }

  /**
  * Gets a lock that prevents the current user from concurrently running a section of code.
  */
  function getUserLock(retries, time, sleep) {
    return _getLock("getUserLock", retries, time, sleep);
  }

  /**
  * Gets lock, waiting for given `time` to acquire it, or sleep given `sleep` milliseconds to return `false`.
  */
  function _getLock(lock_serv_func, retries, time, sleep) {
    time = time || 5000; // Milliseconds
    sleep = sleep || 500; // Milliseconds
    const lock = LockService[lock_serv_func]();
    try {
      if (!lock.tryLock(time) || !lock.hasLock()) {
        throw new Error("=["); // Couldn't acquire lock!
      }
    } catch(_) { // Couldn't acquire lock!
      if (retries > 0) { // We still have retries left
        Logger.log("["+retries+"] Could not acquire lock! Waiting "+sleep+"ms and retrying..");
        Utilities.sleep(sleep);
        return false;
      }
      throw new Error("Could not acquire lock! Retries depleted, giving up..  =[");
    }
    return lock;
  }

  /**
   * Always returns an array no matter if it's a single cell or an entire range
   */
  function getRangeOrCell(range_or_cell, sheet) {
    if (typeof range_or_cell !== "string") {
      return range_or_cell;
    }
    try {
      return sheet ? sheet.getRange(range_or_cell).getValues() : [range_or_cell];
    } catch (err) {
      return [range_or_cell];
    }
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
   * Returns a boolean for given value
   */
  function parseBool(val, default_val) {
    return val === default_val || val === true || val === 1 || val === "1" || val === "true" || val === "yes" || val === "y";
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
      Logger.log("PARSE OPTS MATCHES: "+JSON.stringify(marr));
    }

    return options;
  }

  /**
   * Checks if given data array has the expected values from given range_or_cell (just their length)
   * @param data Array with tickers data
   * @param range_or_cell A range of cells or a single cell
   */
  function checkExpectedResults(data, range_or_cell) {
    return (data||[]).length === (getRangeOrCell(range_or_cell)||[]).length;
  }

  /**
   * Filters a given data array by given range of values or a single value
   * @param data Array with tickers data
   * @param range_or_cell A range of cells or a single cell
   * @param ticker_against Ticker to match against
   */
  function filterTickerSymbol(data, range_or_cell, ticker_against) {
    ticker_against = ticker_against || TICKER_AGAINST;
    const INITVAL = "?"; // Character used to initialize results (acts as a data placeholder)
    const cryptos = getRangeOrCell(range_or_cell);
    const tickers = cryptos.reduce(function(tickers, crypto) { // Init expected tickers to be returned
        tickers[crypto+ticker_against] = INITVAL;
        return tickers;
      }, {});

    const data_array = Array.isArray(data) ? data : (data ? [data] : []);
    const results = data_array.reduce(function(tickers, ticker) {
      if (tickers[ticker.symbol] !== undefined) { // This ticker is one of the expected ones
        tickers[ticker.symbol] = ticker;
      }
      return tickers;
      }, tickers);

    // Only include valid records in the returned results
    return Object.keys(results).reduce(function(retvals, ticker) {
      if (results[ticker][0] !== INITVAL) { // Valid records shouldn't have the INITVAL (just check the 1st column)
        retvals.push(results[ticker]); // We have a valid record!
      }
      return retvals;
    }, []);
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
   * Returns true/false if the given period and formula matches the given module
   */
  function isFormulaMatching(module, period, formula) {
    const regex_formula = new RegExp("=.*BINANCE\\s*\\(\\s*\""+module.tag()+"\"", "i");
    return module.period() == period && regex_formula.test(formula);

  }

  /**
   * Extract parameters from the formula string for the given module
   */
  function extractFormulaParams(module, formula) {
    const regex_formula = new RegExp("=.*BINANCE\\s*\\(\\s*\""+module.tag()+"\"\\s*,\\s*\"?([^\"\\)]+)\"?(?:\\s*,\\s*\"([^\"]+)\")?", "ig");
    const extracted = regex_formula.exec(formula);
    let [range_or_cell, options] = ["", ""];

    if (DEBUG) {
      Logger.log("FORMULA: "+JSON.stringify(formula));
      extracted.map(function(val) {
        Logger.log("REGEXP VAL: "+val);
      });
    }

    if (extracted && extracted[0] && extracted[1]) {
      range_or_cell = extracted[1];
    }
    if (extracted && extracted[0] && extracted[2]) {
      options = extracted[2];
    }

    return [range_or_cell, parseOptions(options)];
  }

  /**
   * Force-refresh formulas for given period.
   */
  function forceRefreshSheetFormulas(period) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let count = 0;
    let lock = null;

    Logger.log("Refreshing spreadsheet formulas..");
    if (!period) { // Just use lock if we are going to refresh ALL formulas!
      lock = getScriptLock(lock_retries--);
      if (!lock) { // Could not acquire lock! => Retry
        return forceRefreshSheetFormulas(period);
      }
    }

    ss.getSheets().map(function(sheet) {
      const range = sheet.getDataRange();
      const formulas = range.getFormulas();
      const changed = _replaceRangeFormulas(period, range, formulas, "");
      if (changed > 0) { // We have changed cell/s contents! => Set the formulas back to enforce recalculation
        SpreadsheetApp.flush();
        count +=_replaceRangeFormulas(period, range, formulas);
        SpreadsheetApp.flush();
      }
    });

    releaseLock(lock);
    Logger.log(count+" spreadsheet formulas were refreshed!");
    return count;
  }

  function _replaceRangeFormulas(period, range, formulas, formula) {
    const num_cols = range.getNumColumns();
    const num_rows = range.getNumRows();
    const row_offset = range.getRow();
    const col_offset = range.getColumn();
    let count = 0;
    for (let row = 0; row < num_rows ; row++) {
      for (let col = 0; col < num_cols; col++) {
        if (_isFormulaReplacement(period, formulas[row][col])) {
          count++;
          range.getCell(row+row_offset, col+col_offset).setFormula(formula === "" ? "" : formulas[row][col]);
        }
      }
    }
    return count;
  }

  function _isFormulaReplacement(period, formula) {
    const regex_formula = new RegExp(/=.*BINANCE\s*\(/);
    if (!(formula != "" && regex_formula.test(formula))) {
      return false;
    }
    
    return  !period
              ||
            isFormulaMatching(BinDoCurrentPrices(), period, formula)
              ||
            isFormulaMatching(BinDo24hStats(), period, formula)
              ||
            isFormulaMatching(BinDoOrdersDone(), period, formula)
              ||
            isFormulaMatching(BinDoOrdersOpen(), period, formula)
              ||
            isFormulaMatching(BinDoAccountInfo(), period, formula)
              ||
            isFormulaMatching(BinDoLastUpdate(), period, formula);
          
  }

  /**
   * Refreshes "Binance" main menu items
   * @TODO This one should be at `BinMenu`
   */
  function refreshMenu() {
    return BinMenu(SpreadsheetApp.getUi());
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
