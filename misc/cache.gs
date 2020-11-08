/**
 * Cache wrapper.
 *
 * @OnlyCurrentDoc
 */
function BinCache() {
  return {
    read,
    write
  };
  

  /**
  * Reads data from cache.
  */
  function read(key) {
    const CACHE_KEY = _craftKey(key);
    const cache = CacheService.getUserCache();
    const data = cache.get(CACHE_KEY);
    const unzip_data = data ? Utilities.unzip(Utilities.newBlob(Utilities.base64Decode(data), "application/zip")) : null;

    return unzip_data ? JSON.parse(unzip_data[0].getAs("application/octet-stream").getDataAsString()) : [];
  }

  /**
  * Writes data into cache.
  */
  function write(key, data, ttl) {
    const CACHE_KEY = _craftKey(key);
    const cache = CacheService.getUserCache();
    const data = cache.get(CACHE_KEY);
    const blob_data = Utilities.zip([Utilities.newBlob(JSON.stringify(data), "application/octet-stream")]);

    cache.put(CACHE_KEY, Utilities.base64Encode(blob_data.getBytes()), ttl);
    return cache;
  }

  function _craftKey(key) {
    return "BIN_CACHE{"+key+"}";
  }
}