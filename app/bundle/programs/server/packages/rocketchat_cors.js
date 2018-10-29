(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:cors":{"cors.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages/rocketchat_cors/cors.js                                                                       //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let url;
module.watch(require("url"), {
  default(v) {
    url = v;
  }

}, 1);
let Mongo;
module.watch(require("meteor/mongo"), {
  Mongo(v) {
    Mongo = v;
  }

}, 2);
let tls;
module.watch(require("tls"), {
  default(v) {
    tls = v;
  }

}, 3);
// FIX For TLS error see more here https://github.com/RocketChat/Rocket.Chat/issues/9316
// TODO: Remove after NodeJS fix it, more information https://github.com/nodejs/node/issues/16196 https://github.com/nodejs/node/pull/16853
tls.DEFAULT_ECDH_CURVE = 'auto'; // Revert change from Meteor 1.6.1 who set ignoreUndefined: true
// more information https://github.com/meteor/meteor/pull/9444

let mongoOptions = {
  ignoreUndefined: false
};
const mongoOptionStr = process.env.MONGO_OPTIONS;

if (typeof mongoOptionStr !== 'undefined') {
  const jsonMongoOptions = JSON.parse(mongoOptionStr);
  mongoOptions = Object.assign({}, mongoOptions, jsonMongoOptions);
}

Mongo.setConnectionOptions(mongoOptions);
WebApp.rawConnectHandlers.use(Meteor.bindEnvironment(function (req, res, next) {
  if (req._body) {
    return next();
  }

  if (req.headers['transfer-encoding'] === undefined && isNaN(req.headers['content-length'])) {
    return next();
  }

  if (req.headers['content-type'] !== '' && req.headers['content-type'] !== undefined) {
    return next();
  }

  if (req.url.indexOf(`${__meteor_runtime_config__.ROOT_URL_PATH_PREFIX}/ufs/`) === 0) {
    return next();
  }

  let buf = '';
  req.setEncoding('utf8');
  req.on('data', function (chunk) {
    return buf += chunk;
  });
  req.on('end', function () {
    if (RocketChat && RocketChat.debugLevel === 'debug') {
      console.log('[request]'.green, req.method, req.url, '\nheaders ->', req.headers, '\nbody ->', buf);
    }

    try {
      req.body = JSON.parse(buf);
    } catch (error) {
      req.body = buf;
    }

    req._body = true;
    return next();
  });
}));
WebApp.rawConnectHandlers.use(function (req, res, next) {
  if (/^\/(api|_timesync|sockjs|tap-i18n|__cordova)(\/|$)/.test(req.url)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  const {
    setHeader
  } = res;

  res.setHeader = function (key, val, ...args) {
    if (key.toLowerCase() === 'access-control-allow-origin' && val === 'http://meteor.local') {
      return;
    }

    return setHeader.apply(this, [key, val, ...args]);
  };

  return next();
});
const _staticFilesMiddleware = WebAppInternals.staticFilesMiddleware;

WebAppInternals._staticFilesMiddleware = function (staticFiles, req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return _staticFilesMiddleware(staticFiles, req, res, next);
};

const oldHttpServerListeners = WebApp.httpServer.listeners('request').slice(0);
WebApp.httpServer.removeAllListeners('request');
WebApp.httpServer.addListener('request', function (req, res, ...args) {
  const next = () => {
    for (const oldListener of oldHttpServerListeners) {
      oldListener.apply(WebApp.httpServer, [req, res, ...args]);
    }
  };

  if (RocketChat.settings.get('Force_SSL') !== true) {
    next();
    return;
  }

  const remoteAddress = req.connection.remoteAddress || req.socket.remoteAddress;
  const localhostRegexp = /^\s*(127\.0\.0\.1|::1)\s*$/;

  const localhostTest = function (x) {
    return localhostRegexp.test(x);
  };

  const isLocal = localhostRegexp.test(remoteAddress) && (!req.headers['x-forwarded-for'] || _.all(req.headers['x-forwarded-for'].split(','), localhostTest));

  const isSsl = req.connection.pair || req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'].indexOf('https') !== -1;

  if (RocketChat && RocketChat.debugLevel === 'debug') {
    console.log('req.url', req.url);
    console.log('remoteAddress', remoteAddress);
    console.log('isLocal', isLocal);
    console.log('isSsl', isSsl);
    console.log('req.headers', req.headers);
  }

  if (!isLocal && !isSsl) {
    let host = req.headers.host || url.parse(Meteor.absoluteUrl()).hostname;
    host = host.replace(/:\d+$/, '');
    res.writeHead(302, {
      Location: `https://${host}${req.url}`
    });
    res.end();
    return;
  }

  return next();
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"common.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages/rocketchat_cors/common.js                                                                     //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
Meteor.startup(function () {
  RocketChat.settings.onload('Force_SSL', function (key, value) {
    Meteor.absoluteUrl.defaultOptions.secure = value;
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:cors/cors.js");
require("/node_modules/meteor/rocketchat:cors/common.js");

/* Exports */
Package._define("rocketchat:cors");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_cors.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjb3JzL2NvcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Y29ycy9jb21tb24uanMiXSwibmFtZXMiOlsiXyIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwidXJsIiwiTW9uZ28iLCJ0bHMiLCJERUZBVUxUX0VDREhfQ1VSVkUiLCJtb25nb09wdGlvbnMiLCJpZ25vcmVVbmRlZmluZWQiLCJtb25nb09wdGlvblN0ciIsInByb2Nlc3MiLCJlbnYiLCJNT05HT19PUFRJT05TIiwianNvbk1vbmdvT3B0aW9ucyIsIkpTT04iLCJwYXJzZSIsIk9iamVjdCIsImFzc2lnbiIsInNldENvbm5lY3Rpb25PcHRpb25zIiwiV2ViQXBwIiwicmF3Q29ubmVjdEhhbmRsZXJzIiwidXNlIiwiTWV0ZW9yIiwiYmluZEVudmlyb25tZW50IiwicmVxIiwicmVzIiwibmV4dCIsIl9ib2R5IiwiaGVhZGVycyIsInVuZGVmaW5lZCIsImlzTmFOIiwiaW5kZXhPZiIsIl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18iLCJST09UX1VSTF9QQVRIX1BSRUZJWCIsImJ1ZiIsInNldEVuY29kaW5nIiwib24iLCJjaHVuayIsIlJvY2tldENoYXQiLCJkZWJ1Z0xldmVsIiwiY29uc29sZSIsImxvZyIsImdyZWVuIiwibWV0aG9kIiwiYm9keSIsImVycm9yIiwidGVzdCIsInNldEhlYWRlciIsImtleSIsInZhbCIsImFyZ3MiLCJ0b0xvd2VyQ2FzZSIsImFwcGx5IiwiX3N0YXRpY0ZpbGVzTWlkZGxld2FyZSIsIldlYkFwcEludGVybmFscyIsInN0YXRpY0ZpbGVzTWlkZGxld2FyZSIsInN0YXRpY0ZpbGVzIiwib2xkSHR0cFNlcnZlckxpc3RlbmVycyIsImh0dHBTZXJ2ZXIiLCJsaXN0ZW5lcnMiLCJzbGljZSIsInJlbW92ZUFsbExpc3RlbmVycyIsImFkZExpc3RlbmVyIiwib2xkTGlzdGVuZXIiLCJzZXR0aW5ncyIsImdldCIsInJlbW90ZUFkZHJlc3MiLCJjb25uZWN0aW9uIiwic29ja2V0IiwibG9jYWxob3N0UmVnZXhwIiwibG9jYWxob3N0VGVzdCIsIngiLCJpc0xvY2FsIiwiYWxsIiwic3BsaXQiLCJpc1NzbCIsInBhaXIiLCJob3N0IiwiYWJzb2x1dGVVcmwiLCJob3N0bmFtZSIsInJlcGxhY2UiLCJ3cml0ZUhlYWQiLCJMb2NhdGlvbiIsImVuZCIsInN0YXJ0dXAiLCJvbmxvYWQiLCJ2YWx1ZSIsImRlZmF1bHRPcHRpb25zIiwic2VjdXJlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxDQUFKOztBQUFNQyxPQUFPQyxLQUFQLENBQWFDLFFBQVEsWUFBUixDQUFiLEVBQW1DO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDTCxRQUFFSyxDQUFGO0FBQUk7O0FBQWhCLENBQW5DLEVBQXFELENBQXJEO0FBQXdELElBQUlDLEdBQUo7QUFBUUwsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLEtBQVIsQ0FBYixFQUE0QjtBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0MsVUFBSUQsQ0FBSjtBQUFNOztBQUFsQixDQUE1QixFQUFnRCxDQUFoRDtBQUFtRCxJQUFJRSxLQUFKO0FBQVVOLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxjQUFSLENBQWIsRUFBcUM7QUFBQ0ksUUFBTUYsQ0FBTixFQUFRO0FBQUNFLFlBQU1GLENBQU47QUFBUTs7QUFBbEIsQ0FBckMsRUFBeUQsQ0FBekQ7QUFBNEQsSUFBSUcsR0FBSjtBQUFRUCxPQUFPQyxLQUFQLENBQWFDLFFBQVEsS0FBUixDQUFiLEVBQTRCO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDRyxVQUFJSCxDQUFKO0FBQU07O0FBQWxCLENBQTVCLEVBQWdELENBQWhEO0FBT3ZNO0FBQ0E7QUFDQUcsSUFBSUMsa0JBQUosR0FBeUIsTUFBekIsQyxDQUVBO0FBQ0E7O0FBQ0EsSUFBSUMsZUFB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LEdBQUs7QUFEdEIsS0FBbkI7QUFHQXNCLFFBQUkwRCxHQUFKO0FBQ0E7QUFDQTs7QUFFRCxTQUFPekQsTUFBUDtBQUNBLENBeENELEU7Ozs7Ozs7Ozs7O0FDeEZBSixPQUFPOEQsT0FBUCxDQUFlLFlBQVc7QUFDekI5QyxhQUFXMEIsUUFBWCxDQUFvQnFCLE1BQXBCLENBQTJCLFdBQTNCLEVBQXdDLFVBQVNyQyxHQUFULEVBQWNzQyxLQUFkLEVBQXFCO0FBQzVEaEUsV0FBT3dELFdBQVAsQ0FBbUJTLGNBQW5CLENBQWtDQyxNQUFsQyxHQUEyQ0YsS0FBM0M7QUFDQSxHQUZEO0FBR0EsQ0FKRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2NvcnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWxzIFdlYkFwcEludGVybmFscyAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbmltcG9ydCB1cmwgZnJvbSAndXJsJztcblxuaW1wb3J0IHsgTW9uZ28gfSBmcm9tICdtZXRlb3IvbW9uZ28nO1xuaW1wb3J0IHRscyBmcm9tICd0bHMnO1xuLy8gRklYIEZvciBUTFMgZXJyb3Igc2VlIG1vcmUgaGVyZSBodHRwczovL2dpdGh1Yi5jb20vUm9ja2V0Q2hhdC9Sb2NrZXQuQ2hhdC9pc3N1ZXMvOTMxNlxuLy8gVE9ETzogUmVtb3ZlIGFmdGVyIE5vZGVKUyBmaXggaXQsIG1vcmUgaW5mb3JtYXRpb24gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2lzc3Vlcy8xNjE5NiBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvcHVsbC8xNjg1M1xudGxzLkRFRkFVTFRfRUNESF9DVVJWRSA9ICdhdXRvJztcblxuLy8gUmV2ZXJ0IGNoYW5nZSBmcm9tIE1ldGVvciAxLjYuMSB3aG8gc2V0IGlnbm9yZVVuZGVmaW5lZDogdHJ1ZVxuLy8gbW9yZSBpbmZvcm1hdGlvbiBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9wdWxsLzk0NDRcbmxldCBtb25nb09wdGlvbnMgPSB7XG5cdGlnbm9yZVVuZGVmaW5lZDogZmFsc2UsXG59O1xuXG5jb25zdCBtb25nb09wdGlvblN0ciA9IHByb2Nlc3MuZW52Lk1PTkdPX09QVElPTlM7XG5pZiAodHlwZW9mIG1vbmdvT3B0aW9uU3RyICE9PSAndW5kZWZpbmVkJykge1xuXHRjb25zdCBqc29uTW9uZ29PcHRpb25zID0gSlNPTi5wYXJzZShtb25nb09wdGlvblN0cik7XG5cblx0bW9uZ29PcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgbW9uZ29PcHRpb25zLCBqc29uTW9uZ29PcHRpb25zKTtcbn1cblxuTW9uZ28uc2V0Q29ubmVjdGlvbk9wdGlvbnMobW9uZ29PcHRpb25zKTtcblxuV2ViQXBwLnJhd0Nvbm5lY3RIYW5kbGVycy51c2UoTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuXHRpZiAocmVxLl9ib2R5KSB7XG5cdFx0cmV0dXJuIG5leHQoKTtcblx0fVxuXHRpZiAocmVxLmhlYWRlcnNbJ3RyYW5zZmVyLWVuY29kaW5nJ10gPT09IHVuZGVmaW5lZCAmJiBpc05hTihyZXEuaGVhZGVyc1snY29udGVudC1sZW5ndGgnXSkpIHtcblx0XHRyZXR1cm4gbmV4dCgpO1xuXHR9XG5cdGlmIChyZXEuaGVhZGVyc1snY29udGVudC10eXBlJ10gIT09ICcnICYmIHJlcS5oZWFkZXJzWydjb250ZW50LXR5cGUnXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIG5leHQoKTtcblx0fVxuXHRpZiAocmVxLnVybC5pbmRleE9mKGAkeyBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYIH0vdWZzL2ApID09PSAwKSB7XG5cdFx0cmV0dXJuIG5leHQoKTtcblx0fVxuXG5cdGxldCBidWYgPSAnJztcblx0cmVxLnNldEVuY29kaW5nKCd1dGY4Jyk7XG5cdHJlcS5vbignZGF0YScsIGZ1bmN0aW9uKGNodW5rKSB7XG5cdFx0cmV0dXJuIGJ1ZiArPSBjaHVuaztcblx0fSk7XG5cblx0cmVxLm9uKCdlbmQnLCBmdW5jdGlvbigpIHtcblx0XHRpZiAoUm9ja2V0Q2hhdCAmJiBSb2NrZXRDaGF0LmRlYnVnTGV2ZWwgPT09ICdkZWJ1ZycpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbcmVxdWVzdF0nLmdyZWVuLCByZXEubWV0aG9kLCByZXEudXJsLCAnXFxuaGVhZGVycyAtPicsIHJlcS5oZWFkZXJzLCAnXFxuYm9keSAtPicsIGJ1Zik7XG5cdFx0fVxuXG5cdFx0dHJ5IHtcblx0XHRcdHJlcS5ib2R5ID0gSlNPTi5wYXJzZShidWYpO1xuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRyZXEuYm9keSA9IGJ1Zjtcblx0XHR9XG5cdFx0cmVxLl9ib2R5ID0gdHJ1ZTtcblxuXHRcdHJldHVybiBuZXh0KCk7XG5cdH0pO1xufSkpO1xuXG5XZWJBcHAucmF3Q29ubmVjdEhhbmRsZXJzLnVzZShmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuXHRpZiAoL15cXC8oYXBpfF90aW1lc3luY3xzb2NranN8dGFwLWkxOG58X19jb3Jkb3ZhKShcXC98JCkvLnRlc3QocmVxLnVybCkpIHtcblx0XHRyZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xuXHR9XG5cblx0Y29uc3QgeyBzZXRIZWFkZXIgfSA9IHJlcztcblx0cmVzLnNldEhlYWRlciA9IGZ1bmN0aW9uKGtleSwgdmFsLCAuLi5hcmdzKSB7XG5cdFx0aWYgKGtleS50b0xvd2VyQ2FzZSgpID09PSAnYWNjZXNzLWNvbnRyb2wtYWxsb3ctb3JpZ2luJyAmJiB2YWwgPT09ICdodHRwOi8vbWV0ZW9yLmxvY2FsJykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRyZXR1cm4gc2V0SGVhZGVyLmFwcGx5KHRoaXMsIFtrZXksIHZhbCwgLi4uYXJnc10pO1xuXHR9O1xuXHRyZXR1cm4gbmV4dCgpO1xufSk7XG5cbmNvbnN0IF9zdGF0aWNGaWxlc01pZGRsZXdhcmUgPSBXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNNaWRkbGV3YXJlO1xuXG5XZWJBcHBJbnRlcm5hbHMuX3N0YXRpY0ZpbGVzTWlkZGxld2FyZSA9IGZ1bmN0aW9uKHN0YXRpY0ZpbGVzLCByZXEsIHJlcywgbmV4dCkge1xuXHRyZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xuXHRyZXR1cm4gX3N0YXRpY0ZpbGVzTWlkZGxld2FyZShzdGF0aWNGaWxlcywgcmVxLCByZXMsIG5leHQpO1xufTtcblxuY29uc3Qgb2xkSHR0cFNlcnZlckxpc3RlbmVycyA9IFdlYkFwcC5odHRwU2VydmVyLmxpc3RlbmVycygncmVxdWVzdCcpLnNsaWNlKDApO1xuXG5XZWJBcHAuaHR0cFNlcnZlci5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlcXVlc3QnKTtcblxuV2ViQXBwLmh0dHBTZXJ2ZXIuYWRkTGlzdGVuZXIoJ3JlcXVlc3QnLCBmdW5jdGlvbihyZXEsIHJlcywgLi4uYXJncykge1xuXHRjb25zdCBuZXh0ID0gKCkgPT4ge1xuXHRcdGZvciAoY29uc3Qgb2xkTGlzdGVuZXIgb2Ygb2xkSHR0cFNlcnZlckxpc3RlbmVycykge1xuXHRcdFx0b2xkTGlzdGVuZXIuYXBwbHkoV2ViQXBwLmh0dHBTZXJ2ZXIsIFtyZXEsIHJlcywgLi4uYXJnc10pO1xuXHRcdH1cblx0fTtcblxuXHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZvcmNlX1NTTCcpICE9PSB0cnVlKSB7XG5cdFx0bmV4dCgpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGNvbnN0IHJlbW90ZUFkZHJlc3MgPSByZXEuY29ubmVjdGlvbi5yZW1vdGVBZGRyZXNzIHx8IHJlcS5zb2NrZXQucmVtb3RlQWRkcmVzcztcblx0Y29uc3QgbG9jYWxob3N0UmVnZXhwID0gL15cXHMqKDEyN1xcLjBcXC4wXFwuMXw6OjEpXFxzKiQvO1xuXHRjb25zdCBsb2NhbGhvc3RUZXN0ID0gZnVuY3Rpb24oeCkge1xuXHRcdHJldHVybiBsb2NhbGhvc3RSZWdleHAudGVzdCh4KTtcblx0fTtcblxuXHRjb25zdCBpc0xvY2FsID0gbG9jYWxob3N0UmVnZXhwLnRlc3QocmVtb3RlQWRkcmVzcykgJiYgKCFyZXEuaGVhZGVyc1sneC1mb3J3YXJkZWQtZm9yJ10gfHwgXy5hbGwocmVxLmhlYWRlcnNbJ3gtZm9yd2FyZGVkLWZvciddLnNwbGl0KCcsJyksIGxvY2FsaG9zdFRlc3QpKTtcblx0Y29uc3QgaXNTc2wgPSByZXEuY29ubmVjdGlvbi5wYWlyIHx8IChyZXEuaGVhZGVyc1sneC1mb3J3YXJkZWQtcHJvdG8nXSAmJiByZXEuaGVhZGVyc1sneC1mb3J3YXJkZWQtcHJvdG8nXS5pbmRleE9mKCdodHRwcycpICE9PSAtMSk7XG5cblx0aWYgKFJvY2tldENoYXQgJiYgUm9ja2V0Q2hhdC5kZWJ1Z0xldmVsID09PSAnZGVidWcnKSB7XG5cdFx0Y29uc29sZS5sb2coJ3JlcS51cmwnLCByZXEudXJsKTtcblx0XHRjb25zb2xlLmxvZygncmVtb3RlQWRkcmVzcycsIHJlbW90ZUFkZHJlc3MpO1xuXHRcdGNvbnNvbGUubG9nKCdpc0xvY2FsJywgaXNMb2NhbCk7XG5cdFx0Y29uc29sZS5sb2coJ2lzU3NsJywgaXNTc2wpO1xuXHRcdGNvbnNvbGUubG9nKCdyZXEuaGVhZGVycycsIHJlcS5oZWFkZXJzKTtcblx0fVxuXG5cdGlmICghaXNMb2NhbCAmJiAhaXNTc2wpIHtcblx0XHRsZXQgaG9zdCA9IHJlcS5oZWFkZXJzLmhvc3QgfHwgdXJsLnBhcnNlKE1ldGVvci5hYnNvbHV0ZVVybCgpKS5ob3N0bmFtZTtcblx0XHRob3N0ID0gaG9zdC5yZXBsYWNlKC86XFxkKyQvLCAnJyk7XG5cdFx0cmVzLndyaXRlSGVhZCgzMDIsIHtcblx0XHRcdExvY2F0aW9uOiBgaHR0cHM6Ly8keyBob3N0IH0keyByZXEudXJsIH1gLFxuXHRcdH0pO1xuXHRcdHJlcy5lbmQoKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRyZXR1cm4gbmV4dCgpO1xufSk7XG4iLCJNZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5vbmxvYWQoJ0ZvcmNlX1NTTCcsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0XHRNZXRlb3IuYWJzb2x1dGVVcmwuZGVmYXVsdE9wdGlvbnMuc2VjdXJlID0gdmFsdWU7XG5cdH0pO1xufSk7XG4iXX0=
