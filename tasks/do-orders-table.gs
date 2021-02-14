/**
 * Runs the table orders script.
 */
function BinDoOrdersTable() {
  const ASSETS_PROP_NAME = "BIN_ASSETS_ORDERS_TABLE";
  const header_size = 3; // How many rows the header will have
  const max_items = 1000; // How many items to be fetched on each run
  const delay = 500; // Delay between API calls in milliseconds
  let failed_assets = {}; // Ugly global index of failed assets (used to be sure to try again in next run)

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "orders/table";
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
    // @TODO Verify if it's still running and cancel if it is!
    return BinScheduler().getSchedule(tag()) || "10m";
  }
  
  /**
   * Establishes the current sheet as the orders table for given symbols.
   * 
   * IMPORTANT: Data written into this sheet/table should never be altered by hand!
   * You may ONLY REMOVE records from the bottom of the sheet (as many as you want, even all of them).
   *
   * @param {["BTC","ETH"..]} range_or_cell REQUIRED! Will fetch ALL historic orders for given symbols only.
   * @param options Ticker to match against (USDT by default) or an option list like "ticker: USDT"
   * @return The list of all orders for all or given symbols/tickers.
   */
  function run(range_or_cell, options) {
    Logger.log("[BinDoOrdersTable] Running..");
    if (!range_or_cell) {
      throw new Error("A range with crypto symbols must be given!");
    }

    const sheets = _findSheets();
    if (sheets.length === 0) { // Ensure the formula is correctly placed at "A1"
      throw new Error("This formula must be placed at 'A1'!");
    }
    const names = _sheetNames(sheets);
    Logger.log("[BinDoOrdersTable] Currently active at '"+names.length+"' sheets: "+JSON.stringify(names));
    Logger.log("[BinDoOrdersTable] Done!");

    return [
      ["Do **NOT** add/remove/alter this table data by hand! --- Polling "+max_items+" items every "+period()+" --- Patience, you may hide this row"]
    ];
  }

  /**
   * Initializes all found sheets that were set as orders table.
   * It will re-generate the table header and remove any extra blank rows from the bottom.
   */
  function init() {
    return _findSheets().map(function(sheet) { // Go through each sheet found
      try {
        _initSheet(sheet); // Ensure the sheet is initialized
      } catch (err) {
        _setStatus(sheet, "ERROR: "+err.message);
        console.error(err);
      }
      return sheet;
    });
  }

  /**
   * Executes a poll session to download and save historic order records for each currently active sheets
   */
  function execute() {
    Logger.log("[BinDoOrdersTable] Running..");

    let assets = {};
    const sheets = _findSheets();
    const names = _sheetNames(sheets);
    Logger.log("[BinDoOrdersTable] Processing '"+names.length+"' sheets: "+JSON.stringify(names));

    if (sheets.length) { // Refresh and get wallet assets only if we have sheets to update!
      const bw = BinWallet();
      bw.refreshAssets();
      assets = {
        last: _getLastAssets(),
        current: bw.calculateAssets()
      };
    }

    sheets.map(function(sheet) { // Go through each sheet found
      try {
        _initSheet(sheet); // Ensure the sheet is initialized
        _fetchAndSave(assets, sheet); // Fetch data just for changed assets
        _updateLastAssets(assets.current); // Update the latest asset balances for next run
      } catch (err) {
        _setStatus(sheet, "ERROR: "+err.message);
        console.error(err);
      }
    });

    Logger.log("[BinDoOrdersTable] Done!");
  }

  function _fetchAndSave(assets, sheet) {
    Logger.log("[BinDoOrdersTable] Processing sheet: "+sheet.getName());
    const [range_or_cell, options] = _parseFormula(sheet);
    const ticker_against = options["ticker"];
    if (!range_or_cell) {
      throw new Error("A range with crypto symbols must be given!");
    }

    _setStatus(sheet, "fetching data..");
    const range = BinUtils().getRangeOrCell(range_or_cell, sheet) || [];
    const opts = {
      "no_cache_ok": true,
      "discard_40x": true, // Discard 40x errors for disabled wallets!
      "retries": range.length
    };

    // Fetch data for given symbols in range
    const data = range.reduce(function(rows, asset) {
      const numrows = rows.length;
      const symbol = asset + ticker_against;
      if (numrows > max_items) { // Skip data fetch if we hit max items cap!
        Logger.log("[BinDoOrdersTable] Max items cap! ["+numrows+"/"+max_items+"] => Skipping fetch for: "+symbol);
        return rows;
      }
      if (_isUnchangedAsset(assets, asset)) { // Skip data fetch if the asset hasn't changed from last run!
        Logger.log("[BinDoOrdersTable] Skipping unchanged asset: "+asset);
        return rows;
      }

      const symbol_data = _fetch(numrows, sheet, asset, ticker_against, opts);
      Logger.log("[BinDoOrdersTable] Fetched "+symbol_data.length+" records for: "+symbol);
      return rows.concat(symbol_data);
    }, []);
  
    // Parse and save collected data
    const parsed = _parseData(data);
    if (parsed.length) {
      Logger.log("[BinDoOrdersTable] Saving "+parsed.length+" downloaded records into '"+sheet.getName()+"' sheet..");
      _setStatus(sheet, "saving "+parsed.length+" records..");
      _insertData(sheet, parsed);
    } else {
      Logger.log("[BinDoOrdersTable] No records downloaded for sheet: "+sheet.getName());
    }

    // Update some stats on sheet
    _setStatus(sheet, "done / waiting");
    _updateStats(sheet, parsed);
  }

  /**
   * Returns true if the given asset was changed its "net" property from last run
   * If it's unchanged and returns false, it will skip fetching orders for it!
   */
  function _isUnchangedAsset({last, current}, asset) {
    return (last[asset] ? last[asset].net : undefined) === (current[asset] ? current[asset].net : undefined);
  }

  function _fetch(numrows, sheet, asset, ticker, opts) {
    const data_spot = _fetchOrders("spot", numrows, sheet, asset, ticker, opts); // Get SPOT orders
    numrows += data_spot.length;
    const data_cross = _fetchOrders("cross", numrows, sheet, asset, ticker, opts); // Get CROSS MARGIN orders
    numrows += data_cross.length;
    const data_isolated = _fetchOrders("isolated", numrows, sheet, asset, ticker, opts); // Get ISOLATED MARGIN orders
    return [...data_spot, ...data_cross, ...data_isolated];
  }

  function _fetchOrders(type, numrows, sheet, asset, ticker, opts) {
    const symbol = asset + ticker;
    const [fkey, fval] = _parseFilterQS(sheet, symbol, type);
    const limit = max_items - numrows + (fkey === "fromId" ? 1 : 0); // Add 1 more result since it's going to be skipped
    const qs = "limit="+limit+"&symbol="+symbol+"&"+fkey+"="+fval;
    let data = [];

    if (limit < 1) { // Skip data fetch if we hit max items cap!
      Logger.log("[BinDoOrdersTable]["+type.toUpperCase()+"] Max items cap! ["+numrows+"/"+max_items+"] => Skipping fetch for: "+symbol);
      return [];
    }

    try {
      Utilities.sleep(delay); // Add some waiting time to avoid 418 responses!
      Logger.log("[BinDoOrdersTable]["+type.toUpperCase()+"] Fetching orders for '"+symbol+"'..");
      if (type === "spot") { // Get SPOT orders
        data = _fetchSpotOrders(opts, qs);
      } else if (type === "cross") { // Get CROSS MARGIN orders
        data = _fetchCrossOrders(opts, qs);
      } else if (type === "isolated") { // Get ISOLATED MARGIN orders
        if (BinWallet().getIsolatedPairs(symbol)) {
          data = _fetchIsolatedOrders(opts, qs); // Only fetch if the symbol has a pair created in isolated account!
        } else {
          Logger.log("[BinDoOrdersTable][ISOLATED] Skipping inexistent isolated pair for: "+symbol);
          return [];
        }
      } else {
        throw new Error("Bad developer.. shame on you!  =0");
      }
      if (fkey === "fromId") { // Skip the first result if we used fromId to filter
        data.shift();
      }
      Logger.log("[BinDoOrdersTable]["+type.toUpperCase()+"] Fetched '"+data.length+"' orders for '"+symbol+"'..");
      return data;
    } catch (err) { // Discard request errors and keep running!
      console.error("[BinDoOrdersTable]["+type.toUpperCase()+"] Couldn't fetch orders for '"+symbol+"': "+err.message);
      failed_assets[asset] = symbol; // Mark this failed asset!
      return [];
    }
  }

  function _fetchSpotOrders(opts, qs) {
    // The default/generic implementation works fine for SPOT
    return _fetchOrdersForType("spot", opts, "api/v3/myTrades", qs);
  }

  function _fetchCrossOrders(opts, qs) {
    // The default/generic implementation works fine for CROSS
    return _fetchOrdersForType("cross", opts, "sapi/v1/margin/myTrades", qs);
  }

  function _fetchIsolatedOrders(opts, qs) {
    // The default/generic implementation works fine for ISOLATED
    return _fetchOrdersForType("isolated", opts, "sapi/v1/margin/myTrades", "isIsolated=true&"+qs);
  }

  function _fetchOrdersForType(type, opts, url, qs) {
    const orders = BinRequest(opts).get(url, qs);
    return (orders||[]).map(function(order) {
      order.market = type.toUpperCase(); // NOTE: Very important to be added for future last row #ID matching!
      return order;
    });
  }

  function _findSheets() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const self = BinDoOrdersTable();

    return ss.getSheets().filter(function(sheet) {
      const formula = _getFormula(sheet);
      return BinUtils().isFormulaMatching(self, self.period(), formula);
    });
  }

  function _sheetNames(sheets) {
    return sheets.map(function(sheet) {
      return sheet.getName();
    });
  }

  function _initSheet(sheet) {
    sheet.setFrozenRows(header_size); // Freeze header rows
    sheet.getRange("A1:J1").mergeAcross();
    sheet.getRange("B2:C2").mergeAcross();
    sheet.getRange("E2:F2").mergeAcross();

    // Set the table headers
    const header = ["Trade #ID", "Order #ID", "Date", "Pair", "Type", "Side", "Price", "Amount", "Commission", "Total"];
    sheet.getRange("A3:J3").setValues([header]);
    sheet.getRange("A2").setValue("Last poll:");
    sheet.getRange("D2").setValue("Status:");
    sheet.getRange("G2").setValue("Records:");
    sheet.getRange("I2").setValue("Pairs:");

    // Set initial stats values
    _initCellValue(sheet, "B2");
    _initCellValue(sheet, "E2", "waiting for 1st poll run");
    _initCellValue(sheet, "H2");
    _initCellValue(sheet, "J2");

    // Remove extra rows (if any)
    const row_min = Math.max(header_size+1, sheet.getLastRow());
    const row_diff = sheet.getMaxRows() - row_min;
    if (row_diff > 0) {
      sheet.deleteRows(row_min+1, row_diff);
    }
    // Remove extra colums (if any)
    const col_diff = sheet.getMaxColumns() - header.length;
    if (col_diff > 0) {
      sheet.deleteColumns(header.length+1, col_diff);
    }

    // Set styles & formats
    const bold = SpreadsheetApp.newTextStyle().setBold(true).build();
    const italic = SpreadsheetApp.newTextStyle().setItalic(true).build();
    sheet.getRange("A1:J"+header_size) // Styles for the whole header
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setTextStyle(bold);
    sheet.getRange("E2").setTextStyle(italic);
    sheet.getRange("B2").setNumberFormat("ddd d hh:mm");
  }

  function _parseFilterQS(sheet, symbol, type) {
    const row = _findLastRowData(sheet, symbol, type);
    if (row) { // We found the latest matching row for this symbol and type..
      return ["fromId", row[0]]; // .. so use its #ID value!
    }

    // Fallback to the oldest possible datetime (Binance launch date)
    const start_time = new Date("2017-01-01T00:00:00.000Z").getTime();
    return ["startTime", Math.floor(start_time / 1000)];
  }

  function _findLastRowData(sheet, symbol, type) {
    const last_row = sheet.getLastRow();
    const last_col = sheet.getLastColumn();

    for (let row_idx = last_row; row_idx >= header_size+1 ; row_idx--) {
      const range = sheet.getRange(row_idx, 1, 1, last_col);
      const [row] = range.getValues();
      if (_isRowMatching(row, symbol, type)) { // We found the latest matching row!
        if (DEBUG) {
          Logger.log("Found last row data at idx ["+row_idx+"] for '"+symbol+"@"+type+"' with: "+JSON.stringify(row));
        }
        return row;
      }
    }

    return null;
  }

  /**
   * WARNING: This function is CRUCIAL to find the right #ID to be used to fetch orders starting from it!
   * If it returns the wrong answer, a wrong ID will be used and it could cause to fetch and save
   * duplicated orders (ones that were already saved in previous poll runs) because it doesn't check
   * for duplicates when inserting rows into the sheet.. and mainly, because it could be a process-expensive check to do
   * if we already have LOTS of rows in the sheet (@TODO: but maybe I should do the duplicates check anyways, just in case..?)
   */
  function _isRowMatching(row, symbol, type) {
    return row[3] === symbol // Matches the symbol?
      // Matches the market type?
      && (row[4].match(/\s\-\s/)
        // The row has a type with " - " in it => It should exactly match the given type
        ? new RegExp(type+"\\s\\-\\s", "i").test(row[4])
        // The row has NOT a type with " - " in it => Backward compatibility: consider as SPOT
        : (type === "spot")); // @TODO This could be removed in a few future releases
  }

  function _getFormula(sheet) {
    return sheet.getRange("A1").getFormula();
  }

  function _parseFormula(sheet) {
    const formula = _getFormula(sheet);
    const self = BinDoOrdersTable();
    const [range_or_cell, options] = BinUtils().extractFormulaParams(self, formula);
    if (DEBUG) {
      Logger.log("Parsed formula range: "+JSON.stringify(range_or_cell));
      Logger.log("Parsed formula options: "+JSON.stringify(options));
    }
    // Just to be clear that this is the expected return
    return [range_or_cell, options];
  }

  function _parseData(data) {
    return data.reduce(function(rows, order) {
      const price = BinUtils().parsePrice(order.price);
      const amount = parseFloat(order.qty);
      const commission = BinUtils().parsePrice(order.commission);
      const row = [
        order.id, // NOTE: Used for future last row #ID matching!
        order.orderId,
        new Date(parseInt(order.time)),
        order.symbol, // NOTE: Used for future last row #ID matching!
        order.market + " - " + (order.isMaker ? "LIMIT" : "STOP-LIMIT"), // NOTE: Used for future last row #ID matching!
        order.isBuyer ? "BUY" : "SELL",
        price,
        amount,
        commission,
        price*amount
      ];
      rows.push(row);
      return rows;
    }, []);
  }

  function _insertData(sheet, data) {
    const last_row = Math.max(sheet.getLastRow(), header_size);
    const last_col = sheet.getLastColumn();
    const dlen = data.length;

    sheet.insertRowsAfter(last_row, dlen);
    const range = sheet.getRange(last_row+1, 1, dlen, last_col);
    range.setValues(data);

    // Sort ALL sheet's rows!
    _getSheetDataRange(sheet).sort(3);
  }

  function _setStatus(sheet, status) {
    sheet.getRange("E2").setValue(status);
  }

  function _updateStats(sheet, saved_data) {
    // Calculate total orders per pair
    const pairs = sheet.getRange("D"+(header_size+1)+":D"+sheet.getLastRow()).getValues();
    const [count, totals] = pairs.reduce(function([count, acc], [pair]) {
      if (pair) {
        acc[pair] = 1 + (acc[pair]||0);
        count += 1;
      }
      return [count, acc];
    }, [0, {}]);

    sheet.getRange("H2").setValue(count);
    sheet.getRange("J2").setValue(Object.keys(totals).length);
    Logger.log("[BinDoOrdersTable] Sheet '"+sheet.getName()+"' total orders per pair:\n"+JSON.stringify(totals));

    sheet.getRange("B2").setValue(new Date()); // Update last run time
  }

  function _initCellValue(sheet, cell, emptyval) {
    if (!sheet.getRange(cell).getValue()) {
      sheet.getRange(cell).setValue(emptyval !== undefined ? emptyval : "-");
    }
  }

  function _getLastAssets() {
    const assets = PropertiesService.getScriptProperties().getProperty(ASSETS_PROP_NAME);
    return assets ? JSON.parse(assets) : {};
  }

  function _updateLastAssets(assets) {
    // UGLY but it works..! Remove failed assets to be sure to try again in next run
    const updated_assets = Object.keys(failed_assets).reduce(function (acc, asset) {
      if (acc[asset]) {
        delete acc[asset];
      }
      return acc;
    }, assets);

    return PropertiesService.getScriptProperties().setProperty(ASSETS_PROP_NAME, JSON.stringify(updated_assets));
  }

  /**
   * Get the FULL data range for given sheet
   */
  function _getSheetDataRange(sheet) {
    return sheet.getRange(header_size+1, 1, sheet.getLastRow()-header_size, sheet.getLastColumn());
  }

  /**
   * Returns ALL the rows contained in ALL defined sheets as order tables
   */
  function getRows() {
    return _findSheets().reduce(function(rows, sheet) { // Go through each sheet found
      const values = _getSheetDataRange(sheet).getValues();
      return values && values.length ? rows.concat(values) : rows;
    }, []);
  }

  // Return just what's needed from outside!
  return {
    tag,
    is,
    period,
    run,
    init,
    execute,
    getRows
  };
}