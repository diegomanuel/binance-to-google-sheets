/**
 * Scheduler coordinator wrapper.
 */
function BinScheduler(OPTIONS) {
  OPTIONS = OPTIONS || {}; // Init options
  const SCHEDULES_PROP_NAME = "BIN_SCHEDULER_ENTRIES";
  const RESCHEDULES_PROP_NAME = "BIN_SCHEDULER_ENTRIES_RETRY";
  const LAST_RUN_PROP_NAME = "BIN_SCHEDULER_LAST_RUN";
  const PAUSED_PROP_NAME = "BIN_SCHEDULER_PAUSED";

  return {
    init,
    run1m,
    run5m,
    run10m,
    run15m,
    run30m,
    run60m,
    runOrdersTable,
    getSchedule,
    setSchedule,
    cleanSchedules,
    rescheduleFailed,
    clearFailed,
    isPaused,
    setPaused,
    isStalled
  };

  /**
   * Mark the scheduler as initialized (ugly workaround)
   */
  function init() {
    _updateLastRun();
  }

  /**
   * Runs the scheduled functions for 1m
   */
  function run1m() {
    _updateLastRun();
    BinDoOrdersTable().init(); // Initialize orders table sheets (if any)
    if (isPaused()) {
      Logger.log("Scheduler is paused, skipping '1m' call..");
    } else {
      BinUtils().forceRefreshSheetFormulas("1m");
    }
  }

  /**
   * Runs the scheduled functions for 5m
   */
  function run5m() {
    _updateLastRun();
    if (isPaused()) {
      Logger.log("Scheduler is paused, skipping '5m' call..");
    } else {
      BinUtils().forceRefreshSheetFormulas("5m");
    }
  }

  /**
   * Runs the scheduled functions for 10m
   */
  function run10m() {
    _updateLastRun();
    if (isPaused()) {
      Logger.log("Scheduler is paused, skipping '10m' call..");
    } else {
      BinUtils().forceRefreshSheetFormulas("10m");
    }
  }

  /**
   * Runs the scheduled functions for 15m
   */
  function run15m() {
    _updateLastRun();
    if (isPaused()) {
      Logger.log("Scheduler is paused, skipping '15m' call..");
    } else {
      BinUtils().forceRefreshSheetFormulas("15m");
    }
  }

  /**
   * Runs the scheduled functions for 30m
   */
  function run30m() {
    _updateLastRun();
    if (isPaused()) {
      Logger.log("Scheduler is paused, skipping '30m' call..");
    } else {
      BinUtils().forceRefreshSheetFormulas("30m");
    }
  }

  /**
   * Runs the scheduled functions for 60m
   */
  function run60m() {
    _updateLastRun();
    if (isPaused()) {
      Logger.log("Scheduler is paused, skipping '1h' call..");
    } else {
      BinUtils().forceRefreshSheetFormulas("1h");
    }
  }

  /**
   * Runs the scheduled functions for OrdersTable
   */
  function runOrdersTable() {
    _updateLastRun();
    if (isPaused()) {
      Logger.log("Scheduler is paused, skipping 'orders table poll' call..");
    }
    else if (BinSetup().areAPIKeysConfigured()) {
      BinDoOrdersTable().execute();
    }
  }

  /**
   * Returns the scheduled interval for given operation (or all schedules if no operation given)
   */
  function getSchedule(operation) {
    const rescheduled = _getRescheduled();
    if (operation && rescheduled[operation]) { // This operation failed before and was re-sheduled!
      return rescheduled[operation];
    }
    const props = _getDocPropService().getProperty(SCHEDULES_PROP_NAME);
    const schedules = props ? JSON.parse(props) : {};
    return operation ? schedules[operation] : schedules;
  }

  /**
   * Sets the scheduled interval for given operation
   */
  function setSchedule(operation, interval) {
    const schedules = getSchedule(); // Get all current schedules
    schedules[operation] = interval; // Set the given schedule
    Logger.log("Setting new schedule for ["+operation+"] at: "+interval);
    Logger.log("Updated schedules: "+JSON.stringify(schedules));
    return _getDocPropService().setProperty(SCHEDULES_PROP_NAME, JSON.stringify(schedules));
  }

  /**
   * Cleans ALL the scheduled intervals
   */
  function cleanSchedules() {
    Logger.log("Cleaning ALL schedules:\n"+JSON.stringify(getSchedule()));
    return _getDocPropService().setProperty(SCHEDULES_PROP_NAME, JSON.stringify({}));
  }

  /**
   * Re-schedule failed execution for given operation so it can be retried ASAP (at 1m trigger)
   */
  function rescheduleFailed(operation) {
    const reschedules = _getRescheduled(); // Get all current re-scheduled operations
    reschedules[operation] = "1m"; // Retry this operation at 1m trigger!
    Logger.log("Setting new retry schedule for: "+operation);
    Logger.log("Updated re-schedules: "+JSON.stringify(reschedules));
    return _getDocPropService().setProperty(RESCHEDULES_PROP_NAME, JSON.stringify(reschedules));
  }

  /**
   * Clears failed execution schedule for given operation (if any)
   * NOTE: This function could cause problems on parallel executions!
   */
  function clearFailed(operation) {
    const reschedules = _getRescheduled(); // Get all current re-scheduled operations
    if (reschedules[operation]) {
      delete reschedules[operation]; // Clear this operation!
      Logger.log("Clearing retry schedule for: "+operation);
      Logger.log("Updated re-schedules: "+JSON.stringify(reschedules));
      return _getDocPropService().setProperty(RESCHEDULES_PROP_NAME, JSON.stringify(reschedules));
    }
    return false;
  }

  /**
   * Returns true if the scheduler is paused
   */
  function isPaused() {
    return _getDocPropService().getProperty(PAUSED_PROP_NAME) == "true";
  }

  /**
   * Sets the paused status
   */
  function setPaused(paused) {
    const doc = _getDocPropService();
    doc.setProperty(PAUSED_PROP_NAME, paused ? "true" : "false");
    // Also clean the re-schedules (no matter the pause status)
    doc.setProperty(RESCHEDULES_PROP_NAME, JSON.stringify({}));
    Logger.log("Scheduler paused status set to: "+isPaused());
    return paused;
  }

  /**
   * Returns true if the scheduler didn't run in the last 5 minutes
   */
  function isStalled() {
    const lastRun = _getDocPropService().getProperty(LAST_RUN_PROP_NAME) || null;
    return !lastRun || lastRun < (new Date()).getTime() - 1000*60*5; // 5 minutes in milliseconds
  }

  function _getRescheduled() {
    const reprops = _getDocPropService().getProperty(RESCHEDULES_PROP_NAME);
    return reprops ? JSON.parse(reprops) : {};
  }

  /**
   * Updates the last run timestamp
   */
  function _updateLastRun() {
    return _getDocPropService().setProperty(LAST_RUN_PROP_NAME, (new Date()).getTime());
  }

  function _getDocPropService() {
    return PropertiesService.getDocumentProperties();
  }
}