
##History

**v0.13.2***

* No API removals
* Lactate status event listeners are given a `FileRequest` object
* Significant restructure--requests are handled in an evented manner.
* Remove function binding wherever possible
* Reuse `FileRequest` object for Lactate.emit, remove a bunch of *crud* related to the previous solution
* Add Lactate.gzip for extending opts.gzip_patterns
* Add numerous events: `request stat`, `request cached`, `request send`, `request complete`, `cache change`. It may be best to check `lib/FileRequest` to see when these events are emitted
