(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var check = Package.check.check;
var Match = Package.check.Match;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var exports;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:grant":{"server":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_grant/server/index.js                                                               //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.export({
  path: () => path,
  generateCallback: () => generateCallback,
  generateAppCallback: () => generateAppCallback,
  Providers: () => Providers,
  Settings: () => Settings,
  GrantError: () => GrantError
});
let WebApp;
module.watch(require("meteor/webapp"), {
  WebApp(v) {
    WebApp = v;
  }

}, 0);
let session;
module.watch(require("express-session"), {
  default(v) {
    session = v;
  }

}, 1);
let Grant;
module.watch(require("grant-express"), {
  default(v) {
    Grant = v;
  }

}, 2);
let fiber;
module.watch(require("fibers"), {
  default(v) {
    fiber = v;
  }

}, 3);
let GrantError;
module.watch(require("./error"), {
  GrantError(v) {
    GrantError = v;
  }

}, 4);
let generateConfig;
module.watch(require("./grant"), {
  generateConfig(v) {
    generateConfig = v;
  }

}, 5);
let path, generateCallback, generateAppCallback;
module.watch(require("./routes"), {
  path(v) {
    path = v;
  },

  generateCallback(v) {
    generateCallback = v;
  },

  generateAppCallback(v) {
    generateAppCallback = v;
  }

}, 6);
let redirect;
module.watch(require("./redirect"), {
  middleware(v) {
    redirect = v;
  }

}, 7);
let Providers, providers;
module.watch(require("./providers"), {
  default(v) {
    Providers = v;
  },

  middleware(v) {
    providers = v;
  }

}, 8);
let Settings;
module.watch(require("./settings"), {
  default(v) {
    Settings = v;
  }

}, 9);
let grant;
WebApp.connectHandlers.use(session({
  secret: 'grant',
  resave: true,
  saveUninitialized: true
})); // grant

WebApp.connectHandlers.use(path, (req, res, next) => {
  if (grant) {
    grant(req, res, next);
  } else {
    next();
  }
}); // callbacks

WebApp.connectHandlers.use((req, res, next) => {
  fiber(() => {
    redirect(req, res, next);
  }).run();
}); // providers

WebApp.connectHandlers.use((req, res, next) => {
  fiber(() => {
    providers(req, res, next);
  }).run();
});
Meteor.startup(() => {
  const config = generateConfig();
  grant = new Grant(config);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"authenticate.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_grant/server/authenticate.js                                                        //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

module.export({
  authenticate: () => authenticate
});
let AccountsServer;
module.watch(require("meteor/rocketchat:accounts"), {
  AccountsServer(v) {
    AccountsServer = v;
  }

}, 0);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 1);
let Accounts;
module.watch(require("meteor/accounts-base"), {
  Accounts(v) {
    Accounts = v;
  }

}, 2);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 3);
let GrantError;
module.watch(require("./error"), {
  GrantError(v) {
    GrantError = v;
  }

}, 4);
let Providers;
module.watch(require("./providers"), {
  default(v) {
    Providers = v;
  }

}, 5);

const setAvatarFromUrl = (userId, url) => new Promise((resolve, reject) => {
  Meteor.runAsUser(userId, () => {
    Meteor.call('setAvatarFromService', url, '', 'url', err => {
      if (err) {
        if (err.details.timeToReset && err.details.timeToReset) {
          reject(t('error-too-many-requests', {
            seconds: parseInt(err.details.timeToReset / 1000)
          }));
        } else {
          reject(t('Avatar_url_invalid_or_error'));
        }
      } else {
        resolve();
      }
    });
  });
});

const findUserByOAuthId = (providerName, id) => RocketChat.models.Users.findOne({
  [`settings.profile.oauth.${providerName}`]: id
});

const addOAuthIdToUserProfile = (user, providerName, providerId) => {
  const profile = Object.assign({}, user.settings.profile, {
    oauth: (0, _objectSpread2.default)({}, user.settings.profile.oauth, {
      [providerName]: providerId
    })
  });
  RocketChat.models.Users.setProfile(user.id, profile);
};

function getAccessToken(req) {
  const i = req.url.indexOf('?');

  if (i === -1) {
    return;
  }

  const barePath = req.url.substring(i + 1);
  const splitPath = barePath.split('&');
  const token = splitPath.find(p => p.match(/access_token=[a-zA-Z0-9]+/));

  if (token) {
    return token.replace('access_token=', '');
  }
}

function authenticate(providerName, req) {
  return Promise.asyncApply(() => {
    let tokens;
    const accessToken = getAccessToken(req);
    const provider = Providers.get(providerName);

    if (!provider) {
      throw new GrantError(`Provider '${providerName}' not found`);
    }

    const userData = provider.getUser(accessToken);
    let user = findUserByOAuthId(providerName, userData.id);

    if (user) {
      user.id = user._id;
    } else {
      user = RocketChat.models.Users.findOneByEmailAddress(userData.email);

      if (user) {
        user.id = user._id;
      }
    }

    if (user) {
      addOAuthIdToUserProfile(user, providerName, userData.id);
      const loginResult = Promise.await(AccountsServer.loginWithUser({
        id: user.id
      }));
      tokens = loginResult.tokens;
    } else {
      const id = Accounts.createUser({
        email: userData.email,
        username: userData.username
      });
      RocketChat.models.Users.setProfile(id, {
        avatar: userData.avatar,
        oauth: {
          [providerName]: userData.id
        }
      });
      RocketChat.models.Users.setName(id, userData.name);
      RocketChat.models.Users.setEmailVerified(id, userData.email);
      Promise.await(setAvatarFromUrl(id, userData.avatar));
      const loginResult = Promise.await(AccountsServer.loginWithUser({
        id
      }));
      tokens = loginResult.tokens;
    }

    return tokens;
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"error.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_grant/server/error.js                                                               //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.export({
  GrantError: () => GrantError
});

class GrantError extends Error {
  constructor(...args) {
    super(...args);
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"grant.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_grant/server/grant.js                                                               //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.export({
  generateConfig: () => generateConfig,
  getConfig: () => getConfig
});
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
let Providers;
module.watch(require("./providers"), {
  default(v) {
    Providers = v;
  }

}, 1);
let Settings;
module.watch(require("./settings"), {
  default(v) {
    Settings = v;
  }

}, 2);
let path, generateCallback, generateAppCallback;
module.watch(require("./routes"), {
  path(v) {
    path = v;
  },

  generateCallback(v) {
    generateCallback = v;
  },

  generateAppCallback(v) {
    generateAppCallback = v;
  }

}, 3);

function addProviders(config) {
  Settings.forEach((settings, providerName) => {
    if (settings.enabled === true) {
      const registeredProvider = Providers.get(providerName);

      if (!registeredProvider) {
        console.error(`No configuration for '${providerName}' provider`);
      } // basic settings


      const data = {
        key: settings.key,
        secret: settings.secret,
        scope: registeredProvider.scope,
        callback: generateCallback(providerName)
      }; // set each app

      Settings.apps.forEach((_, appName) => {
        data[appName] = {
          callback: generateAppCallback(providerName, appName)
        };
      });
      config[providerName] = data;
    }
  });
}

const config = {};

function generateConfig() {
  config.server = {
    protocol: 'http',
    host: RocketChat.hostname,
    path,
    state: true
  };
  addProviders(config);
  return config;
}

function getConfig() {
  return config;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"providers.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_grant/server/providers.js                                                           //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.export({
  middleware: () => middleware
});
let check;
module.watch(require("meteor/check"), {
  check(v) {
    check = v;
  }

}, 0);
let Storage;
module.watch(require("./storage"), {
  Storage(v) {
    Storage = v;
  }

}, 1);
let routes;
module.watch(require("./routes"), {
  routes(v) {
    routes = v;
  }

}, 2);

class Providers extends Storage {
  register(name, options, getUser) {
    check(name, String);
    check(options, {
      // eslint-disable-next-line
      scope: Match.OneOf(String, [String])
    });
    check(getUser, Function);

    this._add(name.toLowerCase(), {
      scope: options.scope,
      getUser
    });
  }

}

const providers = new Providers();
module.exportDefault(providers);

function middleware(req, res, next) {
  const route = routes.providers(req);

  if (route) {
    const list = [];
    providers.forEach((_, name) => list.push(name));
    res.end(JSON.stringify({
      data: list
    }));
    return;
  }

  next();
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"redirect.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_grant/server/redirect.js                                                            //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.export({
  middleware: () => middleware
});
let authenticate;
module.watch(require("./authenticate"), {
  authenticate(v) {
    authenticate = v;
  }

}, 0);
let Settings;
module.watch(require("./settings"), {
  default(v) {
    Settings = v;
  }

}, 1);
let routes;
module.watch(require("./routes"), {
  routes(v) {
    routes = v;
  }

}, 2);
let GrantError;
module.watch(require("./error"), {
  GrantError(v) {
    GrantError = v;
  }

}, 3);

function parseUrl(url, config) {
  return url.replace(/\{[\ ]*(provider|accessToken|refreshToken|error)[\ ]*\}/g, (_, key) => config[key]);
}

function getAppConfig(providerName, appName) {
  const providerConfig = Settings.get(providerName);

  if (providerConfig) {
    return Settings.apps.get(appName);
  }
}

function middleware(req, res, next) {
  return Promise.asyncApply(() => {
    const route = routes.appCallback(req); // handle app callback

    if (route) {
      const config = {
        provider: route.provider
      };
      const appConfig = getAppConfig(route.provider, route.app);

      if (appConfig) {
        const {
          redirectUrl,
          errorUrl
        } = appConfig;

        try {
          const tokens = Promise.await(authenticate(route.provider, req));
          config.accessToken = tokens.accessToken;
          config.refreshToken = tokens.refreshToken;
          res.redirect(parseUrl(redirectUrl, config));
          return;
        } catch (error) {
          config.error = error instanceof GrantError ? error.message : 'Something went wrong';
          console.error(error);
          res.redirect(parseUrl(errorUrl, config));
          return;
        }
      }
    }

    next();
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"routes.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_grant/server/routes.js                                                              //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.export({
  path: () => path,
  generateCallback: () => generateCallback,
  generateAppCallback: () => generateAppCallback,
  getPaths: () => getPaths,
  routes: () => routes
});
const path = '/_oauth_apps';

function generateCallback(providerName) {
  return `${path}/${providerName}/callback`;
}

function generateAppCallback(providerName, appName) {
  return generateCallback(`${providerName}/${appName}`);
}

function getPaths(req) {
  const i = req.url.indexOf('?');
  let barePath;

  if (i === -1) {
    barePath = req.url;
  } else {
    barePath = req.url.substring(0, i);
  }

  const splitPath = barePath.split('/'); // Any non-oauth request will continue down the default
  // middlewares.

  if (splitPath[1] === '_oauth_apps') {
    return splitPath.slice(2);
  }
}

const routes = {
  // :path/:provider/:app/callback
  appCallback: req => {
    const paths = getPaths(req);

    if (paths && paths[2] === 'callback') {
      return {
        provider: paths[0],
        app: paths[1]
      };
    }
  },
  // :path/providers
  providers: req => {
    const paths = getPaths(req);
    return paths && paths[0] === 'providers';
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_grant/server/settings.js                                                            //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
let check;
module.watch(require("meteor/check"), {
  check(v) {
    check = v;
  }

}, 0);
let Storage;
module.watch(require("./storage"), {
  Storage(v) {
    Storage = v;
  }

}, 1);

class Apps extends Storage {
  add(name, body) {
    check(name, String);
    check(body, {
      redirectUrl: String,
      errorUrl: String
    });

    this._add(name, body);
  }

}

class Settings extends Storage {
  constructor() {
    super();
    this.apps = new Apps();
  }

  add(settings) {
    check(settings, {
      enabled: Match.Optional(Boolean),
      provider: String,
      key: String,
      secret: String
    });

    this._add(settings.provider, {
      enabled: settings.enabled === true,
      provider: settings.provider,
      key: settings.key,
      secret: settings.secret
    });
  }

}

const settings = new Settings();
module.exportDefault(settings);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"storage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_grant/server/storage.js                                                             //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.export({
  Storage: () => Storage
});

class Storage {
  constructor() {
    this._data = {};
  }

  all() {
    return this._data;
  }

  forEach(fn) {
    Object.keys(this.all()).forEach(name => {
      fn(this.get(name), name);
    });
  }

  get(name) {
    return this.all()[name.toLowerCase()];
  }

  has(name) {
    return !!this._data[name];
  }

  _add(name, body) {
    if (this.has(name)) {
      console.error(`'${name}' have been already defined`);
      return;
    }

    this._data[name] = body;
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"node_modules":{"express-session":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// node_modules/meteor/rocketchat_grant/node_modules/express-session/package.json                          //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
exports.name = "express-session";
exports.version = "1.15.4";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// node_modules/meteor/rocketchat_grant/node_modules/express-session/index.js                              //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
/*!
 * express-session
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 * @private
 */

var cookie = require('cookie');
var crc = require('crc').crc32;
var debug = require('debug')('express-session');
var deprecate = require('depd')('express-session');
var parseUrl = require('parseurl');
var uid = require('uid-safe').sync
  , onHeaders = require('on-headers')
  , signature = require('cookie-signature')

var Session = require('./session/session')
  , MemoryStore = require('./session/memory')
  , Cookie = require('./session/cookie')
  , Store = require('./session/store')

// environment

var env = process.env.NODE_ENV;

/**
 * Expose the middleware.
 */

exports = module.exports = session;

/**
 * Expose constructors.
 */

exports.Store = Store;
exports.Cookie = Cookie;
exports.Session = Session;
exports.MemoryStore = MemoryStore;

/**
 * Warning message for `MemoryStore` usage in production.
 * @private
 */

var warning = 'Warning: connect.session() MemoryStore is not\n'
  + 'designed for a production environment, as it will leak\n'
  + 'memory, and will not scale past a single process.';

/**
 * Node.js 0.8+ async implementation.
 * @private
 */

/* istanbul ignore next */
var defer = typeof setImmediate === 'function'
  ? setImmediate
  : function(fn){ process.nextTick(fn.bind.apply(fn, arguments)) }

/**
 * Setup session store with the given `options`.
 *
 * @param {Object} [options]
 * @param {Object} [options.cookie] Options for cookie
 * @param {Function} [options.genid]
 * @param {String} [options.name=connect.sid] Session ID cookie name
 * @param {Boolean} [options.proxy]
 * @param {Boolean} [options.resave] Resave unmodified sessions back to the store
 * @param {Boolean} [options.rolling] Enable/disable rolling session expiration
 * @param {Boolean} [options.saveUninitialized] Save uninitialized sessions to the store
 * @param {String|Array} [options.secret] Secret for signing session ID
 * @param {Object} [options.store=MemoryStore] Session store
 * @param {String} [options.unset]
 * @return {Function} middleware
 * @public
 */

function session(options) {
  var opts = options || {}

  // get the cookie options
  var cookieOptions = opts.cookie || {}

  // get the session id generate function
  var generateId = opts.genid || generateSessionId

  // get the session cookie name
  var name = opts.name || opts.key || 'connect.sid'

  // get the session store
  var store = opts.store || new MemoryStore()

  // get the trust proxy setting
  var trustProxy = opts.proxy

  // get the resave session option
  var resaveSession = opts.resave;

  // get the rolling session option
  var rollingSessions = Boolean(opts.rolling)

  // get the save uninitialized session option
  var saveUninitializedSession = opts.saveUninitialized

  // get the cookie signing secret
  var secret = opts.secret

  if (typeof generateId !== 'function') {
    throw new TypeError('genid option must be a function');
  }

  if (resaveSession === undefined) {
    deprecate('undefined resave option; provide resave option');
    resaveSession = true;
  }

  if (saveUninitializedSession === undefined) {
    deprecate('undefined saveUninitialized option; provide saveUninitialized option');
    saveUninitializedSession = true;
  }

  if (opts.unset && opts.unset !== 'destroy' && opts.unset !== 'keep') {
    throw new TypeError('unset option must be "destroy" or "keep"');
  }

  // TODO: switch to "destroy" on next major
  var unsetDestroy = opts.unset === 'destroy'

  if (Array.isArray(secret) && secret.length === 0) {
    throw new TypeError('secret option array must contain one or more strings');
  }

  if (secret && !Array.isArray(secret)) {
    secret = [secret];
  }

  if (!secret) {
    deprecate('req.secret; provide secret option');
  }

  // notify user that this store is not
  // meant for a production environment
  /* istanbul ignore next: not tested */
  if ('production' == env && store instanceof MemoryStore) {
    console.warn(warning);
  }

  // generates the new session
  store.generate = function(req){
    req.sessionID = generateId(req);
    req.session = new Session(req);
    req.session.cookie = new Cookie(cookieOptions);

    if (cookieOptions.secure === 'auto') {
      req.session.cookie.secure = issecure(req, trustProxy);
    }
  };

  var storeImplementsTouch = typeof store.touch === 'function';

  // register event listeners for the store to track readiness
  var storeReady = true
  store.on('disconnect', function ondisconnect() {
    storeReady = false
  })
  store.on('connect', function onconnect() {
    storeReady = true
  })

  return function session(req, res, next) {
    // self-awareness
    if (req.session) {
      next()
      return
    }

    // Handle connection as if there is no session if
    // the store has temporarily disconnected etc
    if (!storeReady) {
      debug('store is disconnected')
      next()
      return
    }

    // pathname mismatch
    var originalPath = parseUrl.original(req).pathname;
    if (originalPath.indexOf(cookieOptions.path || '/') !== 0) return next();

    // ensure a secret is available or bail
    if (!secret && !req.secret) {
      next(new Error('secret option required for sessions'));
      return;
    }

    // backwards compatibility for signed cookies
    // req.secret is passed from the cookie parser middleware
    var secrets = secret || [req.secret];

    var originalHash;
    var originalId;
    var savedHash;
    var touched = false

    // expose store
    req.sessionStore = store;

    // get the session ID from the cookie
    var cookieId = req.sessionID = getcookie(req, name, secrets);

    // set-cookie
    onHeaders(res, function(){
      if (!req.session) {
        debug('no session');
        return;
      }

      if (!shouldSetCookie(req)) {
        return;
      }

      // only send secure cookies via https
      if (req.session.cookie.secure && !issecure(req, trustProxy)) {
        debug('not secured');
        return;
      }

      if (!touched) {
        // touch session
        req.session.touch()
        touched = true
      }

      // set cookie
      setcookie(res, name, req.sessionID, secrets[0], req.session.cookie.data);
    });

    // proxy end() to commit the session
    var _end = res.end;
    var _write = res.write;
    var ended = false;
    res.end = function end(chunk, encoding) {
      if (ended) {
        return false;
      }

      ended = true;

      var ret;
      var sync = true;

      function writeend() {
        if (sync) {
          ret = _end.call(res, chunk, encoding);
          sync = false;
          return;
        }

        _end.call(res);
      }

      function writetop() {
        if (!sync) {
          return ret;
        }

        if (chunk == null) {
          ret = true;
          return ret;
        }

        var contentLength = Number(res.getHeader('Content-Length'));

        if (!isNaN(contentLength) && contentLength > 0) {
          // measure chunk
          chunk = !Buffer.isBuffer(chunk)
            ? new Buffer(chunk, encoding)
            : chunk;
          encoding = undefined;

          if (chunk.length !== 0) {
            debug('split response');
            ret = _write.call(res, chunk.slice(0, chunk.length - 1));
            chunk = chunk.slice(chunk.length - 1, chunk.length);
            return ret;
          }
        }

        ret = _write.call(res, chunk, encoding);
        sync = false;

        return ret;
      }

      if (shouldDestroy(req)) {
        // destroy session
        debug('destroying');
        store.destroy(req.sessionID, function ondestroy(err) {
          if (err) {
            defer(next, err);
          }

          debug('destroyed');
          writeend();
        });

        return writetop();
      }

      // no session to save
      if (!req.session) {
        debug('no session');
        return _end.call(res, chunk, encoding);
      }

      if (!touched) {
        // touch session
        req.session.touch()
        touched = true
      }

      if (shouldSave(req)) {
        req.session.save(function onsave(err) {
          if (err) {
            defer(next, err);
          }

          writeend();
        });

        return writetop();
      } else if (storeImplementsTouch && shouldTouch(req)) {
        // store implements touch method
        debug('touching');
        store.touch(req.sessionID, req.session, function ontouch(err) {
          if (err) {
            defer(next, err);
          }

          debug('touched');
          writeend();
        });

        return writetop();
      }

      return _end.call(res, chunk, encoding);
    };

    // generate the session
    function generate() {
      store.generate(req);
      originalId = req.sessionID;
      originalHash = hash(req.session);
      wrapmethods(req.session);
    }

    // wrap session methods
    function wrapmethods(sess) {
      var _reload = sess.reload
      var _save = sess.save;

      function reload(callback) {
        debug('reloading %s', this.id)
        _reload.call(this, function () {
          wrapmethods(req.session)
          callback.apply(this, arguments)
        })
      }

      function save() {
        debug('saving %s', this.id);
        savedHash = hash(this);
        _save.apply(this, arguments);
      }

      Object.defineProperty(sess, 'reload', {
        configurable: true,
        enumerable: false,
        value: reload,
        writable: true
      })

      Object.defineProperty(sess, 'save', {
        configurable: true,
        enumerable: false,
        value: save,
        writable: true
      });
    }

    // check if session has been modified
    function isModified(sess) {
      return originalId !== sess.id || originalHash !== hash(sess);
    }

    // check if session has been saved
    function isSaved(sess) {
      return originalId === sess.id && savedHash === hash(sess);
    }

    // determine if session should be destroyed
    function shouldDestroy(req) {
      return req.sessionID && unsetDestroy && req.session == null;
    }

    // determine if session should be saved to store
    function shouldSave(req) {
      // cannot set cookie without a session ID
      if (typeof req.sessionID !== 'string') {
        debug('session ignored because of bogus req.sessionID %o', req.sessionID);
        return false;
      }

      return !saveUninitializedSession && cookieId !== req.sessionID
        ? isModified(req.session)
        : !isSaved(req.session)
    }

    // determine if session should be touched
    function shouldTouch(req) {
      // cannot set cookie without a session ID
      if (typeof req.sessionID !== 'string') {
        debug('session ignored because of bogus req.sessionID %o', req.sessionID);
        return false;
      }

      return cookieId === req.sessionID && !shouldSave(req);
    }

    // determine if cookie should be set on response
    function shouldSetCookie(req) {
      // cannot set cookie without a session ID
      if (typeof req.sessionID !== 'string') {
        return false;
      }

      return cookieId != req.sessionID
        ? saveUninitializedSession || isModified(req.session)
        : rollingSessions || req.session.cookie.expires != null && isModified(req.session);
    }

    // generate a session if the browser doesn't send a sessionID
    if (!req.sessionID) {
      debug('no SID sent, generating session');
      generate();
      next();
      return;
    }

    // generate the session object
    debug('fetching %s', req.sessionID);
    store.get(req.sessionID, function(err, sess){
      // error handling
      if (err) {
        debug('error %j', err);

        if (err.code !== 'ENOENT') {
          next(err);
          return;
        }

        generate();
      // no session
      } else if (!sess) {
        debug('no session found');
        generate();
      // populate req.session
      } else {
        debug('session found');
        store.createSession(req, sess);
        originalId = req.sessionID;
        originalHash = hash(sess);

        if (!resaveSession) {
          savedHash = originalHash
        }

        wrapmethods(req.session);
      }

      next();
    });
  };
};

/**
 * Generate a session ID for a new session.
 *
 * @return {String}
 * @private
 */

function generateSessionId(sess) {
  return uid(24);
}

/**
 * Get the session ID cookie from request.
 *
 * @return {string}
 * @private
 */

function getcookie(req, name, secrets) {
  var header = req.headers.cookie;
  var raw;
  var val;

  // read from cookie header
  if (header) {
    var cookies = cookie.parse(header);

    raw = cookies[name];

    if (raw) {
      if (raw.substr(0, 2) === 's:') {
        val = unsigncookie(raw.slice(2), secrets);

        if (val === false) {
          debug('cookie signature invalid');
          val = undefined;
        }
      } else {
        debug('cookie unsigned')
      }
    }
  }

  // back-compat read from cookieParser() signedCookies data
  if (!val && req.signedCookies) {
    val = req.signedCookies[name];

    if (val) {
      deprecate('cookie should be available in req.headers.cookie');
    }
  }

  // back-compat read from cookieParser() cookies data
  if (!val && req.cookies) {
    raw = req.cookies[name];

    if (raw) {
      if (raw.substr(0, 2) === 's:') {
        val = unsigncookie(raw.slice(2), secrets);

        if (val) {
          deprecate('cookie should be available in req.headers.cookie');
        }

        if (val === false) {
          debug('cookie signature invalid');
          val = undefined;
        }
      } else {
        debug('cookie unsigned')
      }
    }
  }

  return val;
}

/**
 * Hash the given `sess` object omitting changes to `.cookie`.
 *
 * @param {Object} sess
 * @return {String}
 * @private
 */

function hash(sess) {
  return crc(JSON.stringify(sess, function (key, val) {
    // ignore sess.cookie property
    if (this === sess && key === 'cookie') {
      return
    }

    return val
  }))
}

/**
 * Determine if request is secure.
 *
 * @param {Object} req
 * @param {Boolean} [trustProxy]
 * @return {Boolean}
 * @private
 */

function issecure(req, trustProxy) {
  // socket is https server
  if (req.connection && req.connection.encrypted) {
    return true;
  }

  // do not trust proxy
  if (trustProxy === false) {
    return false;
  }

  // no explicit trust; try req.secure from express
  if (trustProxy !== true) {
    var secure = req.secure;
    return typeof secure === 'boolean'
      ? secure
      : false;
  }

  // read the proto from x-forwarded-proto header
  var header = req.headers['x-forwarded-proto'] || '';
  var index = header.indexOf(',');
  var proto = index !== -1
    ? header.substr(0, index).toLowerCase().trim()
    : header.toLowerCase().trim()

  return proto === 'https';
}

/**
 * Set cookie on response.
 *
 * @private
 */

function setcookie(res, name, val, secret, options) {
  var signed = 's:' + signature.sign(val, secret);
  var data = cookie.serialize(name, signed, options);

  debug('set-cookie %s', data);

  var prev = res.getHeader('set-cookie') || [];
  var header = Array.isArray(prev) ? prev.concat(data) : [prev, data];

  res.setHeader('set-cookie', header)
}

/**
 * Verify and decode the given `val` with `secrets`.
 *
 * @param {String} val
 * @param {Array} secrets
 * @returns {String|Boolean}
 * @private
 */
function unsigncookie(val, secrets) {
  for (var i = 0; i < secrets.length; i++) {
    var result = signature.unsign(val, secrets[i]);

    if (result !== false) {
      return result;
    }
  }

  return false;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"grant-express":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// node_modules/meteor/rocketchat_grant/node_modules/grant-express/package.json                            //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
exports.name = "grant-express";
exports.version = "3.8.0";
exports.main = "index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// node_modules/meteor/rocketchat_grant/node_modules/grant-express/index.js                                //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //

module.exports = require('grant').express()

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/rocketchat:grant/server/index.js");

/* Exports */
Package._define("rocketchat:grant", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_grant.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpncmFudC9zZXJ2ZXIvaW5kZXguanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhbnQvc2VydmVyL2F1dGhlbnRpY2F0ZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpncmFudC9zZXJ2ZXIvZXJyb3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhbnQvc2VydmVyL2dyYW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmdyYW50L3NlcnZlci9wcm92aWRlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhbnQvc2VydmVyL3JlZGlyZWN0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmdyYW50L3NlcnZlci9yb3V0ZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhbnQvc2VydmVyL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmdyYW50L3NlcnZlci9zdG9yYWdlLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydCIsInBhdGgiLCJnZW5lcmF0ZUNhbGxiYWNrIiwiZ2VuZXJhdGVBcHBDYWxsYmFjayIsIlByb3ZpZGVycyIsIlNldHRpbmdzIiwiR3JhbnRFcnJvciIsIldlYkFwcCIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJzZXNzaW9uIiwiZGVmYXVsdCIsIkdyYW50IiwiZmliZXIiLCJnZW5lcmF0ZUNvbmZpZyIsInJlZGlyZWN0IiwibWlkZGxld2FyZSIsInByb3ZpZGVycyIsImdyYW50IiwiY29ubmVjdEhhbmRsZXJzIiwidXNlIiwic2VjcmV0IiwicmVzYXZlIiwic2F2ZVVuaW5pdGlhbGl6ZWQiLCJyZXEiLCJyZXMiLCJuZXh0IiwicnVuIiwiTWV0ZW9yIiwic3RhcnR1cCIsImNvbmZpZyIsImF1dGhlbnRpY2F0ZSIsIkFjY291bnRzU2VydmVyIiwiUm9ja2V0Q2hhdCIsIkFjY291bnRzIiwic2V0QXZhdGFyRnJvbVVybCIsInVzZXJJZCIsInVybCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwicnVuQXNVc2VyIiwiY2FsbCIsImVyciIsImRldGFpbHMiLCJ0aW1lVG9SZXNldCIsInQiLCJzZWNvbmRzIiwicGFyc2VJbnQiLCJmaW5kVXNlckJ5T0F1dGhJZCIsInByb3ZpZGVyTmFtZSIsImlkIiwibW9kZWxzIiwiVXNlcnMiLCJmaW5kT25lIiwiYWRkT0F1dGhJZFRvVXNlclByb2ZpbGUiLCJ1c2VyIiwicHJvdmlkZXJJZCIsInByb2ZpbGUiLCJPYmplY3QiLCJhc3NpZ24iLCJzZXR0aW5ncyIsIm9hdXRoIiwic2V0UHJvZmlsZSIsImdldEFjY2Vzc1Rva2VuIiwiaSIsImluZGV4T2YiLCJiYXJlUGF0aCIsInN1YnN0cmluZyIsInNwbGl0UGF0aCIsInNwbGl0IiwidG9rZW4iLCJmaW5kIiwicCIsIm1hdGNoIiwicmVwbGFjZSIsInRva2VucyIsImFjY2Vzc1Rva2VuIiwicHJvdmlkZXIiLCJnZXQiLCJ1c2VyRGF0YSIsImdldFVzZXIiLCJfaWQiLCJmaW5kT25lQnlFbWFpbEFkZHJlc3MiLCJlbWFpbCIsImxvZ2luUmVzdWx0IiwibG9naW5XaXRoVXNlciIsImNyZWF0ZVVzZXIiLCJ1c2VybmFtZSIsImF2YXRhciIsInNldE5hbWUiLCJuYW1lIiwic2V0RW1haWxWZXJpZmllZCIsIkVycm9yIiwiY29uc3RydWN0b3IiLCJhcmdzIiwiZ2V0Q29uZmlnIiwiYWRkUHJvdmlkZXJzIiwiZm9yRWFjaCIsImVuYWJsZWQiLCJyZWdpc3RlcmVkUHJvdmlkZXIiLCJjb25zb2xlIiwiZXJyb3IiLCJkYXRhIiwia2V5Iiwic2NvcGUiLCJjYWxsYmFjayIsImFwcHMiLCJfIiwiYXBwTmFtZSIsInNlcnZlciIsInByb3RvY29sIiwiaG9zdCIsImhvc3RuYW1lIiwic3RhdGUiLCJjaGVjayIsIlN0b3JhZ2UiLCJyb3V0ZXMiLCJyZWdpc3RlciIsIm9wdGlvbnMiLCJTdHJpbmciLCJNYXRjaCIsIk9uZU9mIiwiRnVuY3Rpb24iLCJfYWRkIiwidG9Mb3dlckNhc2UiLCJleHBvcnREZWZhdWx0Iiwicm91dGUiLCJsaXN0IiwicHVzaCIsImVuZCIsIkpTT04iLCJzdHJpbmdpZnkiLCJwYXJzZVVybCIsImdldEFwcENvbmZpZyIsInByb3ZpZGVyQ29uZmlnIiwiYXBwQ2FsbGJhY2siLCJhcHBDb25maWciLCJhcHAiLCJyZWRpcmVjdFVybCIsImVycm9yVXJsIiwicmVmcmVzaFRva2VuIiwibWVzc2FnZSIsImdldFBhdGhzIiwic2xpY2UiLCJwYXRocyIsIkFwcHMiLCJhZGQiLCJib2R5IiwiT3B0aW9uYWwiLCJCb29sZWFuIiwiX2RhdGEiLCJhbGwiLCJmbiIsImtleXMiLCJoYXMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLE1BQVAsQ0FBYztBQUFDQyxRQUFLLE1BQUlBLElBQVY7QUFBZUMsb0JBQWlCLE1BQUlBLGdCQUFwQztBQUFxREMsdUJBQW9CLE1BQUlBLG1CQUE3RTtBQUFpR0MsYUFBVSxNQUFJQSxTQUEvRztBQUF5SEMsWUFBUyxNQUFJQSxRQUF0STtBQUErSUMsY0FBVyxNQUFJQTtBQUE5SixDQUFkO0FBQXlMLElBQUlDLE1BQUo7QUFBV1IsT0FBT1MsS0FBUCxDQUFhQyxRQUFRLGVBQVIsQ0FBYixFQUFzQztBQUFDRixTQUFPRyxDQUFQLEVBQVM7QUFBQ0gsYUFBT0csQ0FBUDtBQUFTOztBQUFwQixDQUF0QyxFQUE0RCxDQUE1RDtBQUErRCxJQUFJQyxPQUFKO0FBQVlaLE9BQU9TLEtBQVAsQ0FBYUMsUUFBUSxpQkFBUixDQUFiLEVBQXdDO0FBQUNHLFVBQVFGLENBQVIsRUFBVTtBQUFDQyxjQUFRRCxDQUFSO0FBQVU7O0FBQXRCLENBQXhDLEVB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ZixFOzs7Ozs7Ozs7OztBQ0FBL0QsT0FBT0MsTUFBUCxDQUFjO0FBQUNxSCxXQUFRLE1BQUlBO0FBQWIsQ0FBZDs7QUFBTyxNQUFNQSxPQUFOLENBQWM7QUFDcEJ0QixnQkFBYztBQUNiLFNBQUt5RCxLQUFMLEdBQWEsRUFBYjtBQUNBOztBQUVEQyxRQUFNO0FBQ0wsV0FBTyxLQUFLRCxLQUFaO0FBQ0E7O0FBRURyRCxVQUFRdUQsRUFBUixFQUFZO0FBQ1g5RixXQUFPK0YsSUFBUCxDQUFZLEtBQUtGLEdBQUwsRUFBWixFQUNFdEQsT0FERixDQUNXUCxJQUFELElBQVU7QUFDbEI4RCxTQUFHLEtBQUsxRSxHQUFMLENBQVNZLElBQVQsQ0FBSCxFQUFtQkEsSUFBbkI7QUFDQSxLQUhGO0FBSUE7O0FBRURaLE1BQUlZLElBQUosRUFBVTtBQUNULFdBQU8sS0FBSzZELEdBQUwsR0FBVzdELEtBQUtrQyxXQUFMLEVBQVgsQ0FBUDtBQUNBOztBQUVEOEIsTUFBSWhFLElBQUosRUFBVTtBQUNULFdBQU8sQ0FBQyxDQUFDLEtBQUs0RCxLQUFMLENBQVc1RCxJQUFYLENBQVQ7QUFDQTs7QUFFRGlDLE9BQUtqQyxJQUFMLEVBQVd5RCxJQUFYLEVBQWlCO0FBQ2hCLFFBQUksS0FBS08sR0FBTCxDQUFTaEUsSUFBVCxDQUFKLEVBQW9CO0FBQ25CVSxjQUFRQyxLQUFSLENBQWUsSUFBSVgsSUFBTSw2QkFBekI7QUFDQTtBQUNBOztBQUVELFNBQUs0RCxLQUFMLENBQVc1RCxJQUFYLElBQW1CeUQsSUFBbkI7QUFDQTs7QUEvQm1CLEMiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfZ3JhbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBXZWJBcHAgfSBmcm9tICdtZXRlb3Ivd2ViYXBwJztcbmltcG9ydCBzZXNzaW9uIGZyb20gJ2V4cHJlc3Mtc2Vzc2lvbic7XG5pbXBvcnQgR3JhbnQgZnJvbSAnZ3JhbnQtZXhwcmVzcyc7XG5pbXBvcnQgZmliZXIgZnJvbSAnZmliZXJzJztcblxuaW1wb3J0IHsgR3JhbnRFcnJvciB9IGZyb20gJy4vZXJyb3InO1xuaW1wb3J0IHsgZ2VuZXJhdGVDb25maWcgfSBmcm9tICcuL2dyYW50JztcbmltcG9ydCB7IHBhdGgsIGdlbmVyYXRlQ2FsbGJhY2ssIGdlbmVyYXRlQXBwQ2FsbGJhY2sgfSBmcm9tICcuL3JvdXRlcyc7XG5pbXBvcnQgeyBtaWRkbGV3YXJlIGFzIHJlZGlyZWN0IH0gZnJvbSAnLi9yZWRpcmVjdCc7XG5pbXBvcnQgUHJvdmlkZXJzLCB7IG1pZGRsZXdhcmUgYXMgcHJvdmlkZXJzIH0gZnJvbSAnLi9wcm92aWRlcnMnO1xuaW1wb3J0IFNldHRpbmdzIGZyb20gJy4vc2V0dGluZ3MnO1xuXG5sZXQgZ3JhbnQ7XG5cbldlYkFwcC5jb25uZWN0SGFuZGxlcnMudXNlKHNlc3Npb24oe1xuXHRzZWNyZXQ6ICdncmFudCcsXG5cdHJlc2F2ZTogdHJ1ZSxcblx0c2F2ZVVuaW5pdGlhbGl6ZWQ6IHRydWUsXG59KSk7XG5cbi8vIGdyYW50XG5XZWJBcHAuY29ubmVjdEhhbmRsZXJzLnVzZShwYXRoLCAocmVxLCByZXMsIG5leHQpID0+IHtcblx0aWYgKGdyYW50KSB7XG5cdFx0Z3JhbnQocmVxLCByZXMsIG5leHQpO1xuXHR9IGVsc2Uge1xuXHRcdG5leHQoKTtcblx0fVxufSk7XG5cbi8vIGNhbGxiYWNrc1xuV2ViQXBwLmNvbm5lY3RIYW5kbGVycy51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG5cdGZpYmVyKCgpID0+IHtcblx0XHRyZWRpcmVjdChyZXEsIHJlcywgbmV4dCk7XG5cdH0pLnJ1bigpO1xufSk7XG5cbi8vIHByb3ZpZGVyc1xuV2ViQXBwLmNvbm5lY3RIYW5kbGVycy51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG5cdGZpYmVyKCgpID0+IHtcblx0XHRwcm92aWRlcnMocmVxLCByZXMsIG5leHQpO1xuXHR9KS5ydW4oKTtcbn0pO1xuXG5NZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG5cdGNvbnN0IGNvbmZpZyA9IGdlbmVyYXRlQ29uZmlnKCk7XG5cblx0Z3JhbnQgPSBuZXcgR3JhbnQoY29uZmlnKTtcbn0pO1xuXG5leHBvcnQge1xuXHRwYXRoLFxuXHRnZW5lcmF0ZUNhbGxiYWNrLFxuXHRnZW5lcmF0ZUFwcENhbGxiYWNrLFxuXHRQcm92aWRlcnMsXG5cdFNldHRpbmdzLFxuXHRHcmFudEVycm9yLFxufTtcbiIsImltcG9ydCB7IEFjY291bnRzU2VydmVyIH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6YWNjb3VudHMnO1xuaW1wb3J0IHsgUm9ja2V0Q2hhdCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5pbXBvcnQgeyBBY2NvdW50cyB9IGZyb20gJ21ldGVvci9hY2NvdW50cy1iYXNlJztcbmltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuXG5pbXBvcnQgeyBHcmFudEVycm9yIH0gZnJvbSAnLi9lcnJvcic7XG5pbXBvcnQgUHJvdmlkZXJzIGZyb20gJy4vcHJvdmlkZXJzJztcblxuY29uc3Qgc2V0QXZhdGFyRnJvbVVybCA9ICh1c2VySWQsIHVybCkgPT4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRNZXRlb3IucnVuQXNVc2VyKHVzZXJJZCwgKCkgPT4ge1xuXHRcdE1ldGVvci5jYWxsKCdzZXRBdmF0YXJGcm9tU2VydmljZScsIHVybCwgJycsICd1cmwnLCAoZXJyKSA9PiB7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdGlmIChlcnIuZGV0YWlscy50aW1lVG9SZXNldCAmJiBlcnIuZGV0YWlscy50aW1lVG9SZXNldCkge1xuXHRcdFx0XHRcdHJlamVjdCgodCgnZXJyb3ItdG9vLW1hbnktcmVxdWVzdHMnLCB7XG5cdFx0XHRcdFx0XHRzZWNvbmRzOiBwYXJzZUludChlcnIuZGV0YWlscy50aW1lVG9SZXNldCAvIDEwMDApLFxuXHRcdFx0XHRcdH0pKSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVqZWN0KHQoJ0F2YXRhcl91cmxfaW52YWxpZF9vcl9lcnJvcicpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcbn0pO1xuXG5jb25zdCBmaW5kVXNlckJ5T0F1dGhJZCA9IChwcm92aWRlck5hbWUsIGlkKSA9PiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHsgW2BzZXR0aW5ncy5wcm9maWxlLm9hdXRoLiR7IHByb3ZpZGVyTmFtZSB9YF06IGlkIH0pO1xuXG5jb25zdCBhZGRPQXV0aElkVG9Vc2VyUHJvZmlsZSA9ICh1c2VyLCBwcm92aWRlck5hbWUsIHByb3ZpZGVySWQpID0+IHtcblx0Y29uc3QgcHJvZmlsZSA9IE9iamVjdC5hc3NpZ24oe30sIHVzZXIuc2V0dGluZ3MucHJvZmlsZSwge1xuXHRcdG9hdXRoOiB7XG5cdFx0XHQuLi51c2VyLnNldHRpbmdzLnByb2ZpbGUub2F1dGgsXG5cdFx0XHRbcHJvdmlkZXJOYW1lXTogcHJvdmlkZXJJZCxcblx0XHR9LFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXRQcm9maWxlKHVzZXIuaWQsIHByb2ZpbGUpO1xufTtcblxuZnVuY3Rpb24gZ2V0QWNjZXNzVG9rZW4ocmVxKSB7XG5cdGNvbnN0IGkgPSByZXEudXJsLmluZGV4T2YoJz8nKTtcblxuXHRpZiAoaSA9PT0gLTEpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRjb25zdCBiYXJlUGF0aCA9IHJlcS51cmwuc3Vic3RyaW5nKGkgKyAxKTtcblx0Y29uc3Qgc3BsaXRQYXRoID0gYmFyZVBhdGguc3BsaXQoJyYnKTtcblx0Y29uc3QgdG9rZW4gPSBzcGxpdFBhdGguZmluZCgocCkgPT4gcC5tYXRjaCgvYWNjZXNzX3Rva2VuPVthLXpBLVowLTldKy8pKTtcblxuXHRpZiAodG9rZW4pIHtcblx0XHRyZXR1cm4gdG9rZW4ucmVwbGFjZSgnYWNjZXNzX3Rva2VuPScsICcnKTtcblx0fVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXV0aGVudGljYXRlKHByb3ZpZGVyTmFtZSwgcmVxKSB7XG5cdGxldCB0b2tlbnM7XG5cdGNvbnN0IGFjY2Vzc1Rva2VuID0gZ2V0QWNjZXNzVG9rZW4ocmVxKTtcblx0Y29uc3QgcHJvdmlkZXIgPSBQcm92aWRlcnMuZ2V0KHByb3ZpZGVyTmFtZSk7XG5cblx0aWYgKCFwcm92aWRlcikge1xuXHRcdHRocm93IG5ldyBHcmFudEVycm9yKGBQcm92aWRlciAnJHsgcHJvdmlkZXJOYW1lIH0nIG5vdCBmb3VuZGApO1xuXHR9XG5cblx0Y29uc3QgdXNlckRhdGEgPSBwcm92aWRlci5nZXRVc2VyKGFjY2Vzc1Rva2VuKTtcblxuXHRsZXQgdXNlciA9IGZpbmRVc2VyQnlPQXV0aElkKHByb3ZpZGVyTmFtZSwgdXNlckRhdGEuaWQpO1xuXG5cdGlmICh1c2VyKSB7XG5cdFx0dXNlci5pZCA9IHVzZXIuX2lkO1xuXHR9IGVsc2Uge1xuXHRcdHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlFbWFpbEFkZHJlc3ModXNlckRhdGEuZW1haWwpO1xuXHRcdGlmICh1c2VyKSB7XG5cdFx0XHR1c2VyLmlkID0gdXNlci5faWQ7XG5cdFx0fVxuXHR9XG5cblx0aWYgKHVzZXIpIHtcblx0XHRhZGRPQXV0aElkVG9Vc2VyUHJvZmlsZSh1c2VyLCBwcm92aWRlck5hbWUsIHVzZXJEYXRhLmlkKTtcblxuXHRcdGNvbnN0IGxvZ2luUmVzdWx0ID0gYXdhaXQgQWNjb3VudHNTZXJ2ZXIubG9naW5XaXRoVXNlcih7IGlkOiB1c2VyLmlkIH0pO1xuXG5cdFx0dG9rZW5zID0gbG9naW5SZXN1bHQudG9rZW5zO1xuXHR9IGVsc2Uge1xuXHRcdGNvbnN0IGlkID0gQWNjb3VudHMuY3JlYXRlVXNlcih7XG5cdFx0XHRlbWFpbDogdXNlckRhdGEuZW1haWwsXG5cdFx0XHR1c2VybmFtZTogdXNlckRhdGEudXNlcm5hbWUsXG5cdFx0fSk7XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXRQcm9maWxlKGlkLCB7XG5cdFx0XHRhdmF0YXI6IHVzZXJEYXRhLmF2YXRhcixcblx0XHRcdG9hdXRoOiB7XG5cdFx0XHRcdFtwcm92aWRlck5hbWVdOiB1c2VyRGF0YS5pZCxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuc2V0TmFtZShpZCwgdXNlckRhdGEubmFtZSk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuc2V0RW1haWxWZXJpZmllZChpZCwgdXNlckRhdGEuZW1haWwpO1xuXG5cdFx0YXdhaXQgc2V0QXZhdGFyRnJvbVVybChpZCwgdXNlckRhdGEuYXZhdGFyKTtcblxuXHRcdGNvbnN0IGxvZ2luUmVzdWx0ID0gYXdhaXQgQWNjb3VudHNTZXJ2ZXIubG9naW5XaXRoVXNlcih7IGlkIH0pO1xuXG5cdFx0dG9rZW5zID0gbG9naW5SZXN1bHQudG9rZW5zO1xuXHR9XG5cblx0cmV0dXJuIHRva2Vucztcbn1cbiIsImV4cG9ydCBjbGFzcyBHcmFudEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuXHRjb25zdHJ1Y3RvciguLi5hcmdzKSB7XG5cdFx0c3VwZXIoLi4uYXJncyk7XG5cdH1cbn1cbiIsImltcG9ydCB7IFJvY2tldENoYXQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuXG5pbXBvcnQgUHJvdmlkZXJzIGZyb20gJy4vcHJvdmlkZXJzJztcbmltcG9ydCBTZXR0aW5ncyBmcm9tICcuL3NldHRpbmdzJztcbmltcG9ydCB7IHBhdGgsIGdlbmVyYXRlQ2FsbGJhY2ssIGdlbmVyYXRlQXBwQ2FsbGJhY2sgfSBmcm9tICcuL3JvdXRlcyc7XG5cbmZ1bmN0aW9uIGFkZFByb3ZpZGVycyhjb25maWcpIHtcblx0U2V0dGluZ3MuZm9yRWFjaCgoc2V0dGluZ3MsIHByb3ZpZGVyTmFtZSkgPT4ge1xuXHRcdGlmIChzZXR0aW5ncy5lbmFibGVkID09PSB0cnVlKSB7XG5cdFx0XHRjb25zdCByZWdpc3RlcmVkUHJvdmlkZXIgPSBQcm92aWRlcnMuZ2V0KHByb3ZpZGVyTmFtZSk7XG5cblx0XHRcdGlmICghcmVnaXN0ZXJlZFByb3ZpZGVyKSB7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoYE5vIGNvbmZpZ3VyYXRpb24gZm9yICckeyBwcm92aWRlck5hbWUgfScgcHJvdmlkZXJgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gYmFzaWMgc2V0dGluZ3Ncblx0XHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHRcdGtleTogc2V0dGluZ3Mua2V5LFxuXHRcdFx0XHRzZWNyZXQ6IHNldHRpbmdzLnNlY3JldCxcblx0XHRcdFx0c2NvcGU6IHJlZ2lzdGVyZWRQcm92aWRlci5zY29wZSxcblx0XHRcdFx0Y2FsbGJhY2s6IGdlbmVyYXRlQ2FsbGJhY2socHJvdmlkZXJOYW1lKSxcblx0XHRcdH07XG5cblx0XHRcdC8vIHNldCBlYWNoIGFwcFxuXHRcdFx0U2V0dGluZ3MuYXBwcy5mb3JFYWNoKChfLCBhcHBOYW1lKSA9PiB7XG5cdFx0XHRcdGRhdGFbYXBwTmFtZV0gPSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2s6IGdlbmVyYXRlQXBwQ2FsbGJhY2socHJvdmlkZXJOYW1lLCBhcHBOYW1lKSxcblx0XHRcdFx0fTtcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25maWdbcHJvdmlkZXJOYW1lXSA9IGRhdGE7XG5cdFx0fVxuXHR9KTtcbn1cblxuY29uc3QgY29uZmlnID0ge307XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUNvbmZpZygpIHtcblx0Y29uZmlnLnNlcnZlciA9IHtcblx0XHRwcm90b2NvbDogJ2h0dHAnLFxuXHRcdGhvc3Q6IFJvY2tldENoYXQuaG9zdG5hbWUsXG5cdFx0cGF0aCxcblx0XHRzdGF0ZTogdHJ1ZSxcblx0fTtcblxuXHRhZGRQcm92aWRlcnMoY29uZmlnKTtcblxuXHRyZXR1cm4gY29uZmlnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuXHRyZXR1cm4gY29uZmlnO1xufVxuIiwiaW1wb3J0IHsgY2hlY2sgfSBmcm9tICdtZXRlb3IvY2hlY2snO1xuXG5pbXBvcnQgeyBTdG9yYWdlIH0gZnJvbSAnLi9zdG9yYWdlJztcbmltcG9ydCB7IHJvdXRlcyB9IGZyb20gJy4vcm91dGVzJztcblxuY2xhc3MgUHJvdmlkZXJzIGV4dGVuZHMgU3RvcmFnZSB7XG5cdHJlZ2lzdGVyKG5hbWUsIG9wdGlvbnMsIGdldFVzZXIpIHtcblx0XHRjaGVjayhuYW1lLCBTdHJpbmcpO1xuXHRcdGNoZWNrKG9wdGlvbnMsIHtcblx0XHRcdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuXHRcdFx0c2NvcGU6IE1hdGNoLk9uZU9mKFN0cmluZywgW1N0cmluZ10pXG5cdFx0fSk7XG5cdFx0Y2hlY2soZ2V0VXNlciwgRnVuY3Rpb24pO1xuXG5cdFx0dGhpcy5fYWRkKG5hbWUudG9Mb3dlckNhc2UoKSwge1xuXHRcdFx0c2NvcGU6IG9wdGlvbnMuc2NvcGUsXG5cdFx0XHRnZXRVc2VyLFxuXHRcdH0pO1xuXHR9XG59XG5cbmNvbnN0IHByb3ZpZGVycyA9IG5ldyBQcm92aWRlcnM7XG5cbmV4cG9ydCBkZWZhdWx0IHByb3ZpZGVycztcblxuZXhwb3J0IGZ1bmN0aW9uIG1pZGRsZXdhcmUocmVxLCByZXMsIG5leHQpIHtcblx0Y29uc3Qgcm91dGUgPSByb3V0ZXMucHJvdmlkZXJzKHJlcSk7XG5cblx0aWYgKHJvdXRlKSB7XG5cdFx0Y29uc3QgbGlzdCA9IFtdO1xuXG5cdFx0cHJvdmlkZXJzLmZvckVhY2goKF8sIG5hbWUpID0+IGxpc3QucHVzaChuYW1lKSk7XG5cblx0XHRyZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcblx0XHRcdGRhdGE6IGxpc3QsXG5cdFx0fSkpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdG5leHQoKTtcbn1cbiIsImltcG9ydCB7IGF1dGhlbnRpY2F0ZSB9IGZyb20gJy4vYXV0aGVudGljYXRlJztcbmltcG9ydCBTZXR0aW5ncyBmcm9tICcuL3NldHRpbmdzJztcbmltcG9ydCB7IHJvdXRlcyB9IGZyb20gJy4vcm91dGVzJztcbmltcG9ydCB7IEdyYW50RXJyb3IgfSBmcm9tICcuL2Vycm9yJztcblxuZnVuY3Rpb24gcGFyc2VVcmwodXJsLCBjb25maWcpIHtcblx0cmV0dXJuIHVybC5yZXBsYWNlKC9cXHtbXFwgXSoocHJvdmlkZXJ8YWNjZXNzVG9rZW58cmVmcmVzaFRva2VufGVycm9yKVtcXCBdKlxcfS9nLCAoXywga2V5KSA9PiBjb25maWdba2V5XSk7XG59XG5cbmZ1bmN0aW9uIGdldEFwcENvbmZpZyhwcm92aWRlck5hbWUsIGFwcE5hbWUpIHtcblx0Y29uc3QgcHJvdmlkZXJDb25maWcgPSBTZXR0aW5ncy5nZXQocHJvdmlkZXJOYW1lKTtcblxuXHRpZiAocHJvdmlkZXJDb25maWcpIHtcblx0XHRyZXR1cm4gU2V0dGluZ3MuYXBwcy5nZXQoYXBwTmFtZSk7XG5cdH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1pZGRsZXdhcmUocmVxLCByZXMsIG5leHQpIHtcblx0Y29uc3Qgcm91dGUgPSByb3V0ZXMuYXBwQ2FsbGJhY2socmVxKTtcblxuXHQvLyBoYW5kbGUgYXBwIGNhbGxiYWNrXG5cdGlmIChyb3V0ZSkge1xuXHRcdGNvbnN0IGNvbmZpZyA9IHtcblx0XHRcdHByb3ZpZGVyOiByb3V0ZS5wcm92aWRlcixcblx0XHR9O1xuXHRcdGNvbnN0IGFwcENvbmZpZyA9IGdldEFwcENvbmZpZyhyb3V0ZS5wcm92aWRlciwgcm91dGUuYXBwKTtcblxuXHRcdGlmIChhcHBDb25maWcpIHtcblx0XHRcdGNvbnN0IHtcblx0XHRcdFx0cmVkaXJlY3RVcmwsXG5cdFx0XHRcdGVycm9yVXJsLFxuXHRcdFx0fSA9IGFwcENvbmZpZztcblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Y29uc3QgdG9rZW5zID0gYXdhaXQgYXV0aGVudGljYXRlKHJvdXRlLnByb3ZpZGVyLCByZXEpO1xuXG5cdFx0XHRcdGNvbmZpZy5hY2Nlc3NUb2tlbiA9IHRva2Vucy5hY2Nlc3NUb2tlbjtcblx0XHRcdFx0Y29uZmlnLnJlZnJlc2hUb2tlbiA9IHRva2Vucy5yZWZyZXNoVG9rZW47XG5cblx0XHRcdFx0cmVzLnJlZGlyZWN0KHBhcnNlVXJsKHJlZGlyZWN0VXJsLCBjb25maWcpKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0Y29uZmlnLmVycm9yID0gZXJyb3IgaW5zdGFuY2VvZiBHcmFudEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdTb21ldGhpbmcgd2VudCB3cm9uZyc7XG5cblx0XHRcdFx0Y29uc29sZS5lcnJvcihlcnJvcik7XG5cblx0XHRcdFx0cmVzLnJlZGlyZWN0KHBhcnNlVXJsKGVycm9yVXJsLCBjb25maWcpKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdG5leHQoKTtcbn1cbiIsImV4cG9ydCBjb25zdCBwYXRoID0gJy9fb2F1dGhfYXBwcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUNhbGxiYWNrKHByb3ZpZGVyTmFtZSkge1xuXHRyZXR1cm4gYCR7IHBhdGggfS8keyBwcm92aWRlck5hbWUgfS9jYWxsYmFja2A7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUFwcENhbGxiYWNrKHByb3ZpZGVyTmFtZSwgYXBwTmFtZSkge1xuXHRyZXR1cm4gZ2VuZXJhdGVDYWxsYmFjayhgJHsgcHJvdmlkZXJOYW1lIH0vJHsgYXBwTmFtZSB9YCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQYXRocyhyZXEpIHtcblx0Y29uc3QgaSA9IHJlcS51cmwuaW5kZXhPZignPycpO1xuXHRsZXQgYmFyZVBhdGg7XG5cblx0aWYgKGkgPT09IC0xKSB7XG5cdFx0YmFyZVBhdGggPSByZXEudXJsO1xuXHR9IGVsc2Uge1xuXHRcdGJhcmVQYXRoID0gcmVxLnVybC5zdWJzdHJpbmcoMCwgaSk7XG5cdH1cblxuXHRjb25zdCBzcGxpdFBhdGggPSBiYXJlUGF0aC5zcGxpdCgnLycpO1xuXG5cdC8vIEFueSBub24tb2F1dGggcmVxdWVzdCB3aWxsIGNvbnRpbnVlIGRvd24gdGhlIGRlZmF1bHRcblx0Ly8gbWlkZGxld2FyZXMuXG5cdGlmIChzcGxpdFBhdGhbMV0gPT09ICdfb2F1dGhfYXBwcycpIHtcblx0XHRyZXR1cm4gc3BsaXRQYXRoLnNsaWNlKDIpO1xuXHR9XG59XG5cbmV4cG9ydCBjb25zdCByb3V0ZXMgPSB7XG5cdC8vIDpwYXRoLzpwcm92aWRlci86YXBwL2NhbGxiYWNrXG5cdGFwcENhbGxiYWNrOiAocmVxKSA9PiB7XG5cdFx0Y29uc3QgcGF0aHMgPSBnZXRQYXRocyhyZXEpO1xuXG5cdFx0aWYgKHBhdGhzICYmIHBhdGhzWzJdID09PSAnY2FsbGJhY2snKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRwcm92aWRlcjogcGF0aHNbMF0sXG5cdFx0XHRcdGFwcDogcGF0aHNbMV0sXG5cdFx0XHR9O1xuXHRcdH1cblx0fSxcblx0Ly8gOnBhdGgvcHJvdmlkZXJzXG5cdHByb3ZpZGVyczogKHJlcSkgPT4ge1xuXHRcdGNvbnN0IHBhdGhzID0gZ2V0UGF0aHMocmVxKTtcblxuXHRcdHJldHVybiBwYXRocyAmJiBwYXRoc1swXSA9PT0gJ3Byb3ZpZGVycyc7XG5cdH0sXG59O1xuIiwiaW1wb3J0IHsgY2hlY2sgfSBmcm9tICdtZXRlb3IvY2hlY2snO1xuXG5pbXBvcnQgeyBTdG9yYWdlIH0gZnJvbSAnLi9zdG9yYWdlJztcblxuY2xhc3MgQXBwcyBleHRlbmRzIFN0b3JhZ2Uge1xuXHRhZGQobmFtZSwgYm9keSkge1xuXHRcdGNoZWNrKG5hbWUsIFN0cmluZyk7XG5cdFx0Y2hlY2soYm9keSwge1xuXHRcdFx0cmVkaXJlY3RVcmw6IFN0cmluZyxcblx0XHRcdGVycm9yVXJsOiBTdHJpbmcsXG5cdFx0fSk7XG5cblx0XHR0aGlzLl9hZGQobmFtZSwgYm9keSk7XG5cdH1cbn1cblxuY2xhc3MgU2V0dGluZ3MgZXh0ZW5kcyBTdG9yYWdlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuYXBwcyA9IG5ldyBBcHBzO1xuXHR9XG5cdGFkZChzZXR0aW5ncykge1xuXHRcdGNoZWNrKHNldHRpbmdzLCB7XG5cdFx0XHRlbmFibGVkOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKSxcblx0XHRcdHByb3ZpZGVyOiBTdHJpbmcsXG5cdFx0XHRrZXk6IFN0cmluZyxcblx0XHRcdHNlY3JldDogU3RyaW5nLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5fYWRkKHNldHRpbmdzLnByb3ZpZGVyLCB7XG5cdFx0XHRlbmFibGVkOiBzZXR0aW5ncy5lbmFibGVkID09PSB0cnVlLFxuXHRcdFx0cHJvdmlkZXI6IHNldHRpbmdzLnByb3ZpZGVyLFxuXHRcdFx0a2V5OiBzZXR0aW5ncy5rZXksXG5cdFx0XHRzZWNyZXQ6IHNldHRpbmdzLnNlY3JldCxcblx0XHR9KTtcblx0fVxufVxuXG5jb25zdCBzZXR0aW5ncyA9IG5ldyBTZXR0aW5ncztcblxuZXhwb3J0IGRlZmF1bHQgc2V0dGluZ3M7XG4iLCJleHBvcnQgY2xhc3MgU3RvcmFnZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXMuX2RhdGEgPSB7fTtcblx0fVxuXG5cdGFsbCgpIHtcblx0XHRyZXR1cm4gdGhpcy5fZGF0YTtcblx0fVxuXG5cdGZvckVhY2goZm4pIHtcblx0XHRPYmplY3Qua2V5cyh0aGlzLmFsbCgpKVxuXHRcdFx0LmZvckVhY2goKG5hbWUpID0+IHtcblx0XHRcdFx0Zm4odGhpcy5nZXQobmFtZSksIG5hbWUpO1xuXHRcdFx0fSk7XG5cdH1cblxuXHRnZXQobmFtZSkge1xuXHRcdHJldHVybiB0aGlzLmFsbCgpW25hbWUudG9Mb3dlckNhc2UoKV07XG5cdH1cblxuXHRoYXMobmFtZSkge1xuXHRcdHJldHVybiAhIXRoaXMuX2RhdGFbbmFtZV07XG5cdH1cblxuXHRfYWRkKG5hbWUsIGJvZHkpIHtcblx0XHRpZiAodGhpcy5oYXMobmFtZSkpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoYCckeyBuYW1lIH0nIGhhdmUgYmVlbiBhbHJlYWR5IGRlZmluZWRgKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR0aGlzLl9kYXRhW25hbWVdID0gYm9keTtcblx0fVxufVxuIl19
