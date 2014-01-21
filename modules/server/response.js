
var gracenode = require('../../');
var log = gracenode.log.create('server-response');

var zlib = require('zlib');

var contentTypes = {
	JSON: 'JSON',
	HTML: 'HTML',
	FILE: 'FILE',
	REDIRECT: 'REDIRECT',
	ERROR: 'ERROR'
};

// set up exception catcher and handle if an exception is caught
module.exports.standby = function (req, res) {

	var errorCallback = function (error) {
		
		log.error('exception caught:', error);

		module.exports.respond(req, res, '500', contentTypes.ERROR, 500);
	};

	// if the server responded w/o an exception > remove the error listener
	res.once('end', function () {
		
		log.verbose('server responded');

		gracenode.removeListener('uncaughtException', errorCallback);
	});

	// listener for an exception
	gracenode.once('uncaughtException', errorCallback);

};

module.exports.respond = function (req, res, content, contentType, status) {

	log.verbose('response content type:', contentType);

	switch (contentType) {
		case contentTypes.JSON:
			respondJSON(req, res, content, status);
			break;
		case contentTypes.HTML:
			respondHTML(req, res, content, status);
			break;
		case contentTypes.FILE:
			respondFILE(req, res, content, status);
			break;
		case contentTypes.ERROR:
			respondERROR(req, res, content, status);
			break;
		case contentTypes.REDIRECT:
			respondRedirect(req, res, content, status);
			break;
		default:
			// TODO: consider better way to handle this...
			
			log.error('unkown content type:', contentType);			

			respondERROR(req, res, content, status);
			break;
	}

	res.emit('end');	
};

function compressContent(content, cb) {
	zlib.gzip(content, function (error, compressedData) {
		if (error) {
			return cb(error);
		}
	
		log.verbose('compressed content size: ' + (compressedData.length / 1024) + ' KB');

		cb(null, compressedData);
	});
}

function respondJSON(req, res, content, status) {
	status = status || 200;
	compressContent(JSON.stringify(content), function (error, data) {
		
		if (error) {
			log.error(error);
			status = 500;
			data = error;
		}

		res.writeHead(status, {
			'Cache-Control': 'no-cache, must-revalidate',
			'Connection': 'Keep-Alive',
			'Content-Encoding': 'gzip',
			'Content-Type': 'text/plain; charset=UTF-8',
			'Pragma': 'no-cache',
			'Vary': 'Accept-Encoding',
			'Content-Length': data.length
		});

		responseLog(req, status);		

		res.end(data, 'binary');		

	});

}

function respondHTML(req, res, content, status) {
	status = status || 200;
	compressContent(content, function (error, data) {
		
		if (error) {
			log.error(error);
			status = 500;
			data = error;
		}

		res.writeHead(status, {
			'Cache-Control': 'no-cache, must-revalidate',
			'Connection': 'Keep-Alive',
			'Content-Encoding': 'gzip',
			'Content-Type': 'text/html; charset=UTF-8',
			'Pragma': 'no-cache',
			'Vary': 'Accept-Encoding',
			'Content-Length': data.length
		});

		responseLog(req, status);		

		res.end(data, 'binary');		

	});
}

function respondRedirect(req, res, content, status) {
	status = status || 301;
	// content needs to be redirect URL
	res.writeHead(status, {
		Location: content
	});
	
	log.verbose('redirect to: ', content);

	responseLog(req, status);

	res.end();
}

function respondFILE(req, res, content, status) {
	status = status || 200;
	var type = req.url.substring(req.url.lastIndexOf('.') + 1);
	var contentSize = content.length;
	res.writeHead(status, {
		'Content-Length': contentSize,
		'Content-Type': getFileType(type)
	});
	
	log.verbose('response content size: ' + (contentSize / 1024) + ' KB');

	responseLog(req, status);		

	res.end(content, 'binary');

}

function respondERROR(req, res, content, status) {
	status = status || 404;
	compressContent(content, function (error, data) {
		
		if (error) {
			log.error(error);
			status = 500;
			data = error;
		}

		var contentSize = data.length;
		res.writeHead(status, {
			'Cache-Control': 'no-cache, must-revalidate',
			'Connection': 'Keep-Alive',
			'Content-Encoding': 'gzip',
			'Content-Type': 'text/plain; charset=UTF-8',
			'Pragma': 'no-cache',
			'Vary': 'Accept-Encoding',
			'Content-Length': data.length
		});
		
		log.error('response content size: ' + (contentSize / 1024) + ' KB');
	
		responseLog(req, status);		
	
		res.end(data, 'binary');

	});
}

function responseLog(req, status) {
	var msg = 'response: ' + req.url + ' (status: ' + status + ')';
	if (status >= 400) {
		log.error('error ' + msg);
	} else {
		log.info(msg);
	}
}

function getFileType(type) {
	switch (type) {
		case 'png':
		case 'gif':
		case 'jpg':
		case 'jpeg':
			return 'image/' + type;
		case 'mp3':
			return 'audio/mpeg';
		case 'wav':
			return 'audio/wav';
		case 'ogg':
			return 'application/ogg';
		case 'oga':
		case 'ogv':
			return 'audio/ogg';
		case 'midi':
			return 'audio/midi';
		case 'pdf':
			return 'application/pdf';
		case 'mpeg4':
		case 'mpeg2':
			return 'video/mpeg';
		case 'css':
			return 'text/css';
		case 'js':
			return 'text/javascript';
		case 'html':
			return 'text/html';
		case 'xml':
			return 'text/xml';
		default:
			return 'text/plain';	
	}
}
