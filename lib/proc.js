/*!
 * proc
 * Copyright(c) 2012 Daniel D. Shaw <dshaw@dshaw.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var fs = require('fs');

//
// This gets all messed up on 64-bit Solaris because the initial version assumed
// 32 bits for all longs.  If this module ever get used for anything *other*
// than Solaris, you'll want to verify that the sizes of these types are
// still valid.
//
// typedef struct  timespec {        /* definition per POSIX.4 */
//   time_t          tv_sec;         /* seconds */
//   long            tv_nsec;        /* and nanoseconds */
// } timespec_t;
// ...
// typedef long    time_t;         /* time of day in seconds */

var sizeof_long = 4; // 32-bit
var sizeof_timespec = 8;
if (process.arch == 'x64') {
	sizeof_long = 8;
	sizeof_timespec = 16;
}

/**
 * Exports.
 */

function readTimespec(buf, offset) {
	// this would be pretty janky for 64-bit, but because that 32-bit timestamp
	// isn't going to hit the 64-bit space until 2037, it's Good Enough[tm]
  return buf.readInt32LE(offset) + (buf.readInt32LE(offset + sizeof_long) / 1000000000);
}

exports.usage = function usage(pid, callback) {

	fs.readFile('/proc/'+pid+'/usage', function(err, buf) {
		if (err) {
			callback(err, null);
		};

		var data = {}
    		offset = 0;

		// lwp id.  0: process or defunct
		data.lwpid = buf.readUInt32LE(offset); offset += 4;

		// number of contributing lwps
		data.count = buf.readUInt32LE(offset); offset += 4;

		// current time stamp
		data.tstamp = readTimespec(buf, offset); offset += sizeof_timespec;

		// process/lwp creation time stamp
		data.create = readTimespec(buf, offset); offset += sizeof_timespec;

		// process/lwp termination time stamp
		data.term = readTimespec(buf, offset); offset += sizeof_timespec;

		// total lwp real (elapsed) time
		data.rtime = readTimespec(buf, offset); offset += sizeof_timespec;

		// user level cpu time
		data.utime = readTimespec(buf, offset); offset += sizeof_timespec;

		// system call cpu time
		data.stime = readTimespec(buf, offset); offset += sizeof_timespec;

		// there's normally another big pile of values we could read, but
		// don't need any of them

		callback(null, data);
	});
};


