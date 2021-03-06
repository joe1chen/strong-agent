var nf = require('../nodefly');
var proxy = require('../proxy');
var samples = require('../samples');
var counts = require('../counts');
var tiers = require('../tiers');
var _ = require('underscore');
var topFunctions = require('../topFunctions');
var graphHelper = require('../graphHelper');


var internalCommands = [
	'_executeQueryCommand', 
	'_executeInsertCommand', 
	'_executeUpdateCommand', 
	'_executeRemoveCommand'
];

var commandMap = {
	'_executeQueryCommand': 'find', 
	'_executeInsertCommand': 'insert', 
	'_executeUpdateCommand': 'update', 
	'_executeRemoveCommand': 'remove'
};

var tier = 'mongodb';
function recordExtra(extra, timer) {
	if (extra) {

		extra[tier] = extra[tier] || 0;
		extra[tier] += timer.ms;

		if (extra.closed) {
			tiers.sample(tier + '_out', timer);
		}
		else {
			tiers.sample(tier + '_in', timer);
		}
	}
	else {
		tiers.sample(tier + '_in', timer);
	}
}

// Map to convert query property types to sane defaults
var blank = {
	'[object String]': ''
	, '[object Number]': 0
	, '[object RegExp]': /.*/
	, '[object Date]': 1
};

var toString = Object.prototype.toString;

// Sanitize the query
function sanitize (input) {
	var output = {};

	function filterValue (value) {
		var type = toString.call(value);
		return Array.isArray(value)
			? value.map(filterValue)
			: typeof blank[type] !== 'undefined'
				? blank[type]
				: sanitize(value);
	}

    // Add fix for TypeError when Object.keys is called on a non-object.
    var keys;
    try {
        keys = Object.keys(input);
    }
    catch(e) {
        return input;
    }

	keys.forEach(function (key) {
		output[key] = filterValue(input[key]);
	});

	return output;
}

module.exports = function(mongodb) {
	internalCommands.forEach(function(internalCommand) {
		proxy.before(mongodb.Db.prototype, internalCommand, function(obj, args) {
			var command = args[0] || {};
			var options = args[1] || {};

			var cmd = commandMap[internalCommand];
			var collectionName = command.collectionName;
			var q = JSON.stringify(sanitize(command.query || command.spec || {}));
			var fullQuery = collectionName + '.' + cmd + '(' + q + ')';


			var timer = samples.timer("MongoDB", commandMap[internalCommand]);
			var hasCb = _.any(args, function(arg) { return (typeof arg === 'function'); });

			var graphNode = graphHelper.startNode('MongoDB', fullQuery, nf);
			counts.sample('mongodb');

			if (!hasCb) {
				// updates and inserts are fire and forget unless safe is set
				// record these in top functions, just for tracking
				topFunctions.add('mongoCalls', fullQuery, 0);
				tiers.sample(tier + '_in', timer);
			}
			else {
				proxy.callback(args, -1, function(obj, args, extra, graph, currentNode) {
					timer.end();
					topFunctions.add('mongoCalls', fullQuery, timer.ms);

					recordExtra(extra, timer);

					graphHelper.updateTimes(graphNode, timer);
				});
			}

			if (graphNode) nf.currentNode = graphNode.prevNode;
		});
	}); // all commands
}; // require mongo
