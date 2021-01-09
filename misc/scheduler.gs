/**
 * Scheduler coordinator wrapper.
 */
function BinScheduler(OPTIONS) {
  OPTIONS = OPTIONS || {}; // Init options

  return {
    run1m,
    run5m,
    run10m,
    run15m,
    run30m,
    run60m
  };

  /**
   * Runs the scheduled functions for 1m
   */
  function run1m() {
    BinDoOrdersTable().init(); // Initialize orders table sheets (if any)
    BinSetup().forceRefreshSheetFormulas("1m");
  }

  /**
   * Runs the scheduled functions for 5m
   */
  function run5m() {
    BinSetup().forceRefreshSheetFormulas("5m");
  }

  /**
   * Runs the scheduled functions for 10m
   */
  function run10m() {
    BinSetup().forceRefreshSheetFormulas("10m");
  }
  /**
   * Runs the scheduled functions for 15m
   */
  function run15m() {
    BinSetup().forceRefreshSheetFormulas("15m");
  }
  /**
   * Runs the scheduled functions for 30m
   */
  function run30m() {
    BinSetup().forceRefreshSheetFormulas("30m");
  }
  /**
   * Runs the scheduled functions for 60m
   */
  function run60m() {
    BinSetup().forceRefreshSheetFormulas("1h");
  }
}