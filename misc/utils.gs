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
    sortResults,
    obscureSecret,
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
   * Displays a toast message on screen
   */
  function toast(body, title, timeout) {
    return SpreadsheetApp.getActive().toast(
      body,
      title || "Binance to Google Sheets",
      timeout || 10
    );
  }
}
