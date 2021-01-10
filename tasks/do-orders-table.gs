/**
 * Runs the table orders script.
 */
function BinDoOrdersTable() {
  const header_size = 3; // How many rows the header will have
  const max_items = 100; // How many items to be fetched on each run
  const delay = 500; // Delay between API calls in milliseconds

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "orders/table";
  }

  /**
   * Returns this function period (the one that's used by the refresh triggers)
   */
  function period() {
    return BinScheduler().getSchedule(tag()) || "10m";
  }
  
  /**
   * Establishes the current sheet as the orders table for given symbols.
   * 
   * IMPORTANT: Data written into this sheet/table should never be altered by hand!
   * You may ONLY REMOVE records from the bottom of the sheet (as many as you want, even all of them).
   *
   * @param {["BTC","ETH"..]} range_or_cell REQUIRED! Will fetch ALL historic orders for given symbols only.
   * @param options Ticker to match against (USDT by default) or an option list like "ticker: USDT, stats: false"
   * @TODO Implement "stats: false" option
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

    const sheets = _findSheets();
    const names = _sheetNames(sheets);
    Logger.log("[BinDoOrdersTable] Processing '"+names.length+"' sheets: "+JSON.stringify(names));
    sheets.map(function(sheet) { // Go through each sheet found
      try {
        _initSheet(sheet); // Ensure the sheet is initialized
        _fetchAndSave(sheet);
      } catch (err) {
        _setStatus(sheet, "ERROR: "+err.message);
        console.error(err);
      }
    });

    Logger.log("[BinDoOrdersTable] Done!");
  }

  function _fetchAndSave(sheet) {
    Logger.log("[BinDoOrdersTable] Processing sheet: "+sheet.getName());
    const [range_or_cell, options] = _parseFormula(sheet);
    const ticker_against = options["ticker"];
    if (!range_or_cell) {
      throw new Error("A range with crypto symbols must be given!");
    }

    _setStatus(sheet, "fetching data..");
    const range = BinUtils().getRangeOrCell(range_or_cell, sheet) || [];
    const opts = {
      "no_cache": true,
      "no_cache_ok": true,
      "retries": range.length
    };

    // Fetch data for given symbols in range
    const data = range.reduce(function(rows, crypto) {
      const symbol = crypto+ticker_against;
      if (rows.length > max_items) {
        Logger.log("[BinDoOrdersTable] Max items cap! ["+rows.length+"/"+max_items+"] => Skipping fetch for: "+symbol);
        return rows;
      }

      const [fkey, fval] = _parseFilterQS(sheet, symbol);
      const limit = max_items - rows.length + (fkey === "fromId" ? 1 : 0); // Add 1 more result since it's going to be skipped
      const qs = "limit="+limit+"&symbol="+symbol+"&"+fkey+"="+fval;
      Utilities.sleep(delay); // Add some waiting time to avoid 418 responses!
      const crypto_data = BinRequest(opts).get("api/v3/myTrades", qs, "");
      if (fkey === "fromId") { // Skip the first result if we used fromId to filter
        crypto_data.shift();
      }
      Logger.log("[BinDoOrdersTable] Fetched "+crypto_data.length+" records for: "+symbol);
      return rows.concat(crypto_data);
    }, []);
  
    // Parse and save collected data
    const parsed = _parseData(data.slice(0, max_items)); // Enforce max items cap
    _setStatus(sheet, "saving "+parsed.length+" records..");
    Logger.log("[BinDoOrdersTable] Saving "+parsed.length+" downloaded records into '"+sheet.getName()+"' sheet..");
    parsed.map(function(row) {
      sheet.appendRow(row);
    });

    // Update some stats on sheet
    _setStatus(sheet, "done / waiting");
    _updateStats(sheet, parsed);
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
    const header = ["#ID", "Order #ID", "Date", "Pair", "Type", "Side", "Price", "Amount", "Commission", "Total"];
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

  function _parseFilterQS(sheet, symbol) {
    const row = _findLastRowData(sheet, symbol);
    if (row) { // We found the latest matching row for this symbol..
      return ["fromId", row[0]]; // .. so use its #ID value!
    }

    // Fallback to the oldest possible datetime (Binance launch date)
    const start_time = new Date("2017-01-01T00:00:00.000Z").getTime();
    return ["startTime", Math.floor(start_time / 1000)];
  }

  function _findLastRowData(sheet, symbol) {
    const last_row = sheet.getLastRow();
    const last_col = sheet.getLastColumn();

    for (let row_idx = last_row; row_idx >= header_size+1 ; row_idx--) {
      const range = sheet.getRange(row_idx, 1, 1, last_col);
      const [row] = range.getValues();
      if (row[3] === symbol) { // We found the latest matching row for this symbol
        if (DEBUG) {
          Logger.log("Found last row data at idx ["+row_idx+"] for '"+symbol+"' with: "+JSON.stringify(row));
        }
        return row;
      }
    }

    return null;
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
    const parsed = data.reduce(function(rows, order) {
      const price = BinUtils().parsePrice(order.price);
      const amount = parseFloat(order.qty);
      const commission = BinUtils().parsePrice(order.commission);
      const row = [
        order.id,
        order.orderId,
        new Date(parseInt(order.time)),
        order.symbol,
        order.isMaker ? "LIMIT" : "STOP-LIMIT",
        order.isBuyer ? "BUY" : "SELL",
        price,
        amount,
        commission,
        price*amount
      ];
      rows.push(row);
      return rows;
    }, []);

    return parsed;
  }

  function _setStatus(sheet, status) {
    sheet.getRange("E2").setValue(status);
  }

  function _updateStats(sheet, saved_data) {
    if (saved_data.length) { // Only update counters if data was saved
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
      Logger.log("[BinDoOrdersTable] Sheet '"+sheet.getName()+"' totals: "+JSON.stringify(totals));
    }

    sheet.getRange("B2").setValue(new Date()); // Update last run time
  }

  function _initCellValue(sheet, cell, emptyval) {
    if (!sheet.getRange(cell).getValue()) {
      sheet.getRange(cell).setValue(emptyval !== undefined ? emptyval : "-");
    }
  }

  // Return just what's needed from outside!
  return {
    tag,
    period,
    run,
    init,
    execute
  };
}