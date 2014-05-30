var jshint = require('jshint').JSHINT;
var fs = require('fs');
var async = require('async');
var configPath;
var configData = {};

/**
 * Set the path for loading configuration file(s)
 * @param {string} file system path to config file(s) directory
 *
 */
module.exports.setPath = function (path) {
	configPath = path;
};

/**
 * Load configuration file(s)
 * @param {array} a list of configuration file name(s) to load
 * @param {function} callback
 */
module.exports.load = function (configList, cb) {
	if (configPath === undefined) {
		return cb(new Error('configPath has not been set. you must call setConfigPath() method'));
	}
	async.eachSeries(configList, function (config, callback) {
		fs.readFile(configPath + config, function (error, dataSource) {
			if (!error) {
				try {
					dataSource = dataSource.toString();
					if (!jshint(dataSource)) {
						// there are lint errors
						var errors = jshint.data().errors;
						throw new Error('invalid configurations in (' + configPath + config + '):\n' + JSON.stringify(errors, null, 4));
					}
					var data = JSON.parse(dataSource);
					for (var key in data) {
						if (!configData[key]) {
							configData[key] = {};
						}
						for (var prop in data[key]) {
							configData[key][prop] = data[key][prop];
						}
					}
				
					console.log(configPath + config + ' loaded');
				
				} catch (exception) {
					error = exception;	
				}
			}
			callback(error);
		});
	},
	function (error) {
		if (error) {
			console.error(error);
			console.trace();
		}
		cb(error);
	});
};

/**
 * Return the value of configuration property
 * @param {string} property name of a configuration value, can be period separated
 * */
module.exports.getOne = function (propName) {

	var propNames = propName.split('.');
	var conf      = configData;

	propNames.forEach(function (prop) {
		conf = conf[prop];
		
		if (conf === undefined) {
			return null;
		}
		
	});

	return conf;

};

module.exports.getMany = function (propNameList) {
	var res = {};
	for (var i = 0, len = propNameList.length; i < len; i++) {
		var propName = propNameList[i];
		res[propName] = module.exports.getOne(propName);
	}
	return res;
};
