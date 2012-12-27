
##History

**v0.13.2**

* No API removals
* Add Lactate.gzip(pattern) for extending opts.gzip_patterns. These patterns are tested against mime types.
* Lactate status event listeners are given a `FileRequest` object
* Remove function binding wherever possible
* Reuse `FileRequest` object for Lactate.emit, remove a bunch of *crud* related to the previous solution
