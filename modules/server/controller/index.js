var gracenode = require('../../../');
var log = gracenode.log.create('server-controller');
var Request = require('../request');
var response = require('../response');

var config = null;
var requestHooks = null;

module.exports.readConfig = function (configIn) {
	if (!configIn || !configIn.controllerPath) {
		throw new Error('invalid configurations:\n', JSON.stringify(configIn, null, 4));
	}
	config = configIn;
};

module.exports.setupRequestHooks = function (hooks) {
	requestHooks = hooks;
};

module.exports.exec = function (server, req, res, parsedUrl, startTime) {
	
	// check for not found error
	if (parsedUrl.error) {
		return errorHandler(server, req, res, parsedUrl, null, parsedUrl.error, 404, startTime);
	}

	var request = new Request(req, res, parsedUrl.parameters);
	request.setup(function (error) {
		if (error) {
			return errorHandler(server, req, res, parsedUrl, null, error, 500, startTime);
		}
		handle(server, req, res, parsedUrl, request, startTime);
	});
}; 

function handle(server, req, res, parsedUrl, requestObj, startTime) {
	// path: controllerDirectory/methodFile
	var path = gracenode.getRootPath() + config.controllerPath + parsedUrl.controller + '/' + parsedUrl.method;
	
	log.verbose('controller "' + parsedUrl.controller + '" found');

	var method = require(path);

	// controller method
	var methodExec = method[requestObj.getMethod()] || null;

	// validate request method
	if (!methodExec) {
		var msg = requestObj.url + ' does not accept "' + requestObj.getMethod() + '"';
		return errorHandler(server, req, res, parsedUrl, requestObj, new Error(msg), 400, startTime);
	}

	// create response object
	var responseObj = response.create(server, req, res, startTime);

	// check if there was an original request (only in case of pre-defined error)
	if (parsedUrl.originalRequest) {
		responseObj._setDefaultStatus(parsedUrl.originalRequest.status);
	}

	// override _errorHandler for responseObj.error()
	responseObj._errorHandler = function (error, status) {
		errorHandler(server, req, res, parsedUrl, requestObj, error, status, startTime);
	};

	// check for request hook
	var requestHookExecuted = handleRequestHook(server, req, res, requestObj, responseObj, methodExec, parsedUrl, startTime);
	if (requestHookExecuted) {
		return;
	}

	log.verbose(parsedUrl.controller + '/' + parsedUrl.method + ' [' + requestObj.getMethod() + '] executed');

	// invoke the controller method
	methodExec(requestObj, responseObj);
}

function handleRequestHook(server, req, res, requestObj, responseObj, methodExec, parsedUrl, startTime) {
	if (requestHooks) {

		var hook;

		if (typeof requestHooks === 'function') {
			// request hook applies to all controllers and methods
			hook = requestHooks;
		}
		var hookedController = requestHooks[parsedUrl.controller] || null;
		if (hookedController) {
			if (typeof hookedController === 'function') {
				// request hook applies to this controller and all of its methods
				hook = hookedController;
			}
			var hookedMethod = hookedController[parsedUrl.method] || null;
			if (typeof hookedMethod === 'function') {
				// request hook applies to this controller and this method only
				hook = hookedMethod;
			}
		}

		if (hook) {		
			// hook function found
			execRequestHook(server, req, res, requestObj, responseObj, hook, methodExec, parsedUrl, startTime);
			return true;
		}
	}
	return false;
}

function execRequestHook(server, req, res, requestObj, responseObj, hook, methodExec, parsedUrl, startTime) {
	var url = parsedUrl.controller + '/' + parsedUrl.method;
	log.verbose('request hook found for "' + url + '"');
	hook(requestObj, function (error, status) {
		if (error) {
			log.error('request hook executed with an error (url:' + url + '):', error, '(status: ' + status + ')');
			return errorHandler(server, req, res, parsedUrl, requestObj, error, status, startTime);
		}
		log.verbose('request hook executed');
		methodExec(requestObj, responseObj);
	});

}

function errorHandler(server, req, res, parsedUrl, requestObj, msg, status, startTime) {
	// default status is 404
	status = status || 404;

	log.error('(url:' + req.url + ')', msg);
	
	// check to see if we have error controller and method assigned
	if (config.error && !parsedUrl.error) {
		var errorController = config.error[status] || null;
		if (errorController) {
			parsedUrl.error = true; // this flag is set to prevent possible infinite loop of error on error handler
			parsedUrl.originalRequest = {
				controller: parsedUrl.controller,
				method: parsedUrl.method,
				status: status
			};
			parsedUrl.controller = errorController.controller;
			parsedUrl.method = errorController.method;
			// we have the error controller assigned for this error
			log.verbose('error handler(' + status + ') configured:', errorController);
			// check to see if we already have requestObj or not
			if (requestObj) {
				// we already have request object
				return handle(server, req, res, parsedUrl, requestObj, startTime);
			}
			// we do not have request object yet
			return module.exports.exec(server, req, res, parsedUrl, startTime);
		}
	}

	if (msg instanceof Error) {
		msg = msg.message;
	}

	if (typeof msg === 'object') {
		msg = JSON.stringify(msg);
	}

	if (parsedUrl.error) {
		log.error('error handler configured, but failed to execute:', '(error:' + msg + ')', parsedUrl);
	}

	// no error controller assigned for this error
	var responder = new response.create(server, req, res, startTime);
	responder._error(msg, status);
}
