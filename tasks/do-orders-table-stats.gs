/**
 * Runs the table orders stats script.
 */
function BinDoOrdersTableStats() {
  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "orders/table/stats";
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
    return BinScheduler().getSchedule(tag()) || "10m";
  }
  
  /**
   * @TODO WIP!
   */
  function run(orders_table_cell, options) {
    Logger.log("[BinDoOrdersTableStats] Running..");
    // @TODO WIP!
    Logger.log("[BinDoOrdersTableStats] Done!");

    return [
      ["coming soon..!"]
    ];
  }

  // Return just what's needed from outside!
  return {
    tag,
    is,
    period,
    run
  };
}