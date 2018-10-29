(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Restivus = Package['nimble:restivus'].Restivus;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var result, endpoints, options, routes;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:api":{"server":{"api.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/api.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
const logger = new Logger('API', {});

class API extends Restivus {
  constructor(properties) {
    super(properties);
    this.authMethods = [];
    this.fieldSeparator = '.';
    this.defaultFieldsToExclude = {
      joinCode: 0,
      members: 0,
      importIds: 0
    };
    this.limitedUserFieldsToExclude = {
      avatarOrigin: 0,
      emails: 0,
      phone: 0,
      statusConnection: 0,
      createdAt: 0,
      lastLogin: 0,
      services: 0,
      requirePasswordChange: 0,
      requirePasswordChangeReason: 0,
      roles: 0,
      statusDefault: 0,
      _updatedAt: 0,
      customFields: 0,
      settings: 0
    };
    this.limitedUserFieldsToExcludeIfIsPrivilegedUser = {
      services: 0
    };
  }

  hasHelperMethods() {
    return RocketChat.API.helperMethods.size !== 0;
  }

  getHelperMethods() {
    return RocketChat.API.helperMethods;
  }

  getHelperMethod(name) {
    return RocketChat.API.helperMethods.get(name);
  }

  addAuthMethod(method) {
    this.authMethods.push(method);
  }

  success(result = {}) {
    if (_.isObject(result)) {
      result.success = true;
    }

    result = {
      statusCode: 200,
      body: result
    };
    logger.debug('Success', result);
    return result;
  }

  failure(result, errorType, stack) {
    if (_.isObject(result)) {
      result.success = false;
    } else {
      result = {
        success: false,
        error: result,
        stack
      };

      if (errorType) {
        result.errorType = errorType;
      }
    }

    result = {
      statusCode: 400,
      body: result
    };
    logger.debug('Failure', result);
    return result;
  }

  notFound(msg) {
    return {
      statusCode: 404,
      body: {
        success: false,
        error: msg ? msg : 'Resource not found'
      }
    };
  }

  unauthorized(msg) {
    return {
      statusCode: 403,
      body: {
        success: false,
        error: msg ? msg : 'unauthorized'
      }
    };
  }

  addRoute(routes, options, endpoints) {
    // Note: required if the developer didn't provide options
    if (typeof endpoints === 'undefined') {
      endpoints = options;
      options = {};
    } // Allow for more than one route using the same option and endpoints


    if (!_.isArray(routes)) {
      routes = [routes];
    }

    const {
      version
    } = this._config;
    routes.forEach(route => {
      // Note: This is required due to Restivus calling `addRoute` in the constructor of itself
      Object.keys(endpoints).forEach(method => {
        if (typeof endpoints[method] === 'function') {
          endpoints[method] = {
            action: endpoints[method]
          };
        } // Add a try/catch for each endpoint


        const originalAction = endpoints[method].action;

        endpoints[method].action = function _internalRouteActionHandler() {
          const rocketchatRestApiEnd = RocketChat.metrics.rocketchatRestApi.startTimer({
            method,
            version,
            user_agent: this.request.headers['user-agent'],
            entrypoint: route
          });
          logger.debug(`${this.request.method.toUpperCase()}: ${this.request.url}`);
          let result;

          try {
            result = originalAction.apply(this);
          } catch (e) {
            logger.debug(`${method} ${route} threw an error:`, e.stack);
            result = RocketChat.API.v1.failure(e.message, e.error);
          }

          result = result || RocketChat.API.v1.success();
          rocketchatRestApiEnd({
            status: result.statusCode
          });
          return result;
        };

        if (this.hasHelperMethods()) {
          for (const [name, helperMethod] of this.getHelperMethods()) {
            endpoints[method][name] = helperMethod;
          }
        } // Allow the endpoints to make usage of the logger which respects the user's settings


        endpoints[method].logger = logger;
      });
      super.addRoute(route, options, endpoints);
    });
  }

  _initAuth() {
    const loginCompatibility = bodyParams => {
      // Grab the username or email that the user is logging in with
      const {
        user,
        username,
        email,
        password,
        code
      } = bodyParams;

      if (password == null) {
        return bodyParams;
      }

      if (_.without(Object.keys(bodyParams), 'user', 'username', 'email', 'password', 'code').length > 0) {
        return bodyParams;
      }

      const auth = {
        password
      };

      if (typeof user === 'string') {
        auth.user = user.includes('@') ? {
          email: user
        } : {
          username: user
        };
      } else if (username) {
        auth.user = {
          username
        };
      } else if (email) {
        auth.user = {
          email
        };
      }

      if (auth.user == null) {
        return bodyParams;
      }

      if (auth.password.hashed) {
        auth.password = {
          digest: auth.password,
          algorithm: 'sha-256'
        };
      }

      if (code) {
        return {
          totp: {
            code,
            login: auth
          }
        };
      }

      return auth;
    };

    const self = this;
    this.addRoute('login', {
      authRequired: false
    }, {
      post() {
        const args = loginCompatibility(this.bodyParams);
        const getUserInfo = self.getHelperMethod('getUserInfo');
        const invocation = new DDPCommon.MethodInvocation({
          connection: {
            close() {}

          }
        });
        let auth;

        try {
          auth = DDP._CurrentInvocation.withValue(invocation, () => Meteor.call('login', args));
        } catch (error) {
          let e = error;

          if (error.reason === 'User not found') {
            e = {
              error: 'Unauthorized',
              reason: 'Unauthorized'
            };
          }

          return {
            statusCode: 401,
            body: {
              status: 'error',
              error: e.error,
              message: e.reason || e.message
            }
          };
        }

        this.user = Meteor.users.findOne({
          _id: auth.id
        });
        this.userId = this.user._id; // Remove tokenExpires to keep the old behavior

        Meteor.users.update({
          _id: this.user._id,
          'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(auth.token)
        }, {
          $unset: {
            'services.resume.loginTokens.$.when': 1
          }
        });
        const response = {
          status: 'success',
          data: {
            userId: this.userId,
            authToken: auth.token,
            me: getUserInfo(this.user)
          }
        };

        const extraData = self._config.onLoggedIn && self._config.onLoggedIn.call(this);

        if (extraData != null) {
          _.extend(response.data, {
            extra: extraData
          });
        }

        return response;
      }

    });

    const logout = function () {
      // Remove the given auth token from the user's account
      const authToken = this.request.headers['x-auth-token'];

      const hashedToken = Accounts._hashLoginToken(authToken);

      const tokenLocation = self._config.auth.token;
      const index = tokenLocation.lastIndexOf('.');
      const tokenPath = tokenLocation.substring(0, index);
      const tokenFieldName = tokenLocation.substring(index + 1);
      const tokenToRemove = {};
      tokenToRemove[tokenFieldName] = hashedToken;
      const tokenRemovalQuery = {};
      tokenRemovalQuery[tokenPath] = tokenToRemove;
      Meteor.users.update(this.user._id, {
        $pull: tokenRemovalQuery
      });
      const response = {
        status: 'success',
        data: {
          message: 'You\'ve been logged out!'
        }
      }; // Call the logout hook with the authenticated user attached

      const extraData = self._config.onLoggedOut && self._config.onLoggedOut.call(this);

      if (extraData != null) {
        _.extend(response.data, {
          extra: extraData
        });
      }

      return response;
    };
    /*
    	Add a logout endpoint to the API
    	After the user is logged out, the onLoggedOut hook is called (see Restfully.configure() for
    	adding hook).
    */


    return this.addRoute('logout', {
      authRequired: true
    }, {
      get() {
        console.warn('Warning: Default logout via GET will be removed in Restivus v1.0. Use POST instead.');
        console.warn('    See https://github.com/kahmali/meteor-restivus/issues/100');
        return logout.call(this);
      },

      post: logout
    });
  }

}

const getUserAuth = function _getUserAuth(...args) {
  const invalidResults = [undefined, null, false];
  return {
    token: 'services.resume.loginTokens.hashedToken',

    user() {
      if (this.bodyParams && this.bodyParams.payload) {
        this.bodyParams = JSON.parse(this.bodyParams.payload);
      }

      for (let i = 0; i < RocketChat.API.v1.authMethods.length; i++) {
        const method = RocketChat.API.v1.authMethods[i];

        if (typeof method === 'function') {
          const result = method.apply(this, args);

          if (!invalidResults.includes(result)) {
            return result;
          }
        }
      }

      let token;

      if (this.request.headers['x-auth-token']) {
        token = Accounts._hashLoginToken(this.request.headers['x-auth-token']);
      }

      return {
        userId: this.request.headers['x-user-id'],
        token
      };
    }

  };
};

RocketChat.API = {
  helperMethods: new Map(),
  getUserAuth,
  ApiClass: API
};

const defaultOptionsEndpoint = function _defaultOptionsEndpoint() {
  if (this.request.method === 'OPTIONS' && this.request.headers['access-control-request-method']) {
    if (RocketChat.settings.get('API_Enable_CORS') === true) {
      this.response.writeHead(200, {
        'Access-Control-Allow-Origin': RocketChat.settings.get('API_CORS_Origin'),
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, X-User-Id, X-Auth-Token'
      });
    } else {
      this.response.writeHead(405);
      this.response.write('CORS not enabled. Go to "Admin > General > REST Api" to enable it.');
    }
  } else {
    this.response.writeHead(404);
  }

  this.done();
};

const createApi = function _createApi(enableCors) {
  if (!RocketChat.API.v1 || RocketChat.API.v1._config.enableCors !== enableCors) {
    RocketChat.API.v1 = new API({
      version: 'v1',
      useDefaultAuth: true,
      prettyJson: process.env.NODE_ENV === 'development',
      enableCors,
      defaultOptionsEndpoint,
      auth: getUserAuth()
    });
  }

  if (!RocketChat.API.default || RocketChat.API.default._config.enableCors !== enableCors) {
    RocketChat.API.default = new API({
      useDefaultAuth: true,
      prettyJson: process.env.NODE_ENV === 'development',
      enableCors,
      defaultOptionsEndpoint,
      auth: getUserAuth()
    });
  }
}; // register the API to be re-created once the CORS-setting changes.


RocketChat.settings.get('API_Enable_CORS', (key, value) => {
  createApi(value);
}); // also create the API immediately

createApi(!!RocketChat.settings.get('API_Enable_CORS'));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/settings.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.settings.addGroup('General', function () {
  this.section('REST API', function () {
    this.add('API_Upper_Count_Limit', 100, {
      type: 'int',
      public: false
    });
    this.add('API_Default_Count', 50, {
      type: 'int',
      public: false
    });
    this.add('API_Allow_Infinite_Count', true, {
      type: 'boolean',
      public: false
    });
    this.add('API_Enable_Direct_Message_History_EndPoint', false, {
      type: 'boolean',
      public: false
    });
    this.add('API_Enable_Shields', true, {
      type: 'boolean',
      public: false
    });
    this.add('API_Shield_Types', '*', {
      type: 'string',
      public: false,
      enableQuery: {
        _id: 'API_Enable_Shields',
        value: true
      }
    });
    this.add('API_Enable_CORS', false, {
      type: 'boolean',
      public: false
    });
    this.add('API_CORS_Origin', '*', {
      type: 'string',
      public: false,
      enableQuery: {
        _id: 'API_Enable_CORS',
        value: true
      }
    });
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"helpers":{"requestParams.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/requestParams.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.helperMethods.set('requestParams', function _requestParams() {
  return ['POST', 'PUT'].includes(this.request.method) ? this.bodyParams : this.queryParams;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getPaginationItems.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/getPaginationItems.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// If the count query param is higher than the "API_Upper_Count_Limit" setting, then we limit that
// If the count query param isn't defined, then we set it to the "API_Default_Count" setting
// If the count is zero, then that means unlimited and is only allowed if the setting "API_Allow_Infinite_Count" is true
RocketChat.API.helperMethods.set('getPaginationItems', function _getPaginationItems() {
  const hardUpperLimit = RocketChat.settings.get('API_Upper_Count_Limit') <= 0 ? 100 : RocketChat.settings.get('API_Upper_Count_Limit');
  const defaultCount = RocketChat.settings.get('API_Default_Count') <= 0 ? 50 : RocketChat.settings.get('API_Default_Count');
  const offset = this.queryParams.offset ? parseInt(this.queryParams.offset) : 0;
  let count = defaultCount; // Ensure count is an appropiate amount

  if (typeof this.queryParams.count !== 'undefined') {
    count = parseInt(this.queryParams.count);
  } else {
    count = defaultCount;
  }

  if (count > hardUpperLimit) {
    count = hardUpperLimit;
  }

  if (count === 0 && !RocketChat.settings.get('API_Allow_Infinite_Count')) {
    count = defaultCount;
  }

  return {
    offset,
    count
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getUserFromParams.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/getUserFromParams.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Convenience method, almost need to turn it into a middleware of sorts
RocketChat.API.helperMethods.set('getUserFromParams', function _getUserFromParams() {
  const doesntExist = {
    _doesntExist: true
  };
  let user;
  const params = this.requestParams();

  if (params.userId && params.userId.trim()) {
    user = RocketChat.models.Users.findOneById(params.userId) || doesntExist;
  } else if (params.username && params.username.trim()) {
    user = RocketChat.models.Users.findOneByUsername(params.username) || doesntExist;
  } else if (params.user && params.user.trim()) {
    user = RocketChat.models.Users.findOneByUsername(params.user) || doesntExist;
  } else {
    throw new Meteor.Error('error-user-param-not-provided', 'The required "userId" or "username" param was not provided');
  }

  if (user._doesntExist) {
    throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
  }

  return user;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getUserInfo.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/getUserInfo.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const getInfoFromUserObject = user => {
  const {
    _id,
    name,
    emails,
    status,
    statusConnection,
    username,
    utcOffset,
    active,
    language,
    roles,
    settings,
    customFields
  } = user;
  return {
    _id,
    name,
    emails,
    status,
    statusConnection,
    username,
    utcOffset,
    active,
    language,
    roles,
    settings,
    customFields
  };
};

RocketChat.API.helperMethods.set('getUserInfo', function _getUserInfo(user) {
  const me = getInfoFromUserObject(user);

  const isVerifiedEmail = () => {
    if (me && me.emails && Array.isArray(me.emails)) {
      return me.emails.find(email => email.verified);
    }

    return false;
  };

  const getUserPreferences = () => {
    const defaultUserSettingPrefix = 'Accounts_Default_User_Preferences_';
    const allDefaultUserSettings = RocketChat.settings.get(new RegExp(`^${defaultUserSettingPrefix}.*$`));
    return allDefaultUserSettings.reduce((accumulator, setting) => {
      const settingWithoutPrefix = setting.key.replace(defaultUserSettingPrefix, ' ').trim();
      accumulator[settingWithoutPrefix] = RocketChat.getUserPreference(user, settingWithoutPrefix);
      return accumulator;
    }, {});
  };

  const verifiedEmail = isVerifiedEmail();
  me.email = verifiedEmail ? verifiedEmail.address : undefined;
  me.settings = {
    preferences: getUserPreferences()
  };
  return me;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"isUserFromParams.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/isUserFromParams.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.helperMethods.set('isUserFromParams', function _isUserFromParams() {
  const params = this.requestParams();
  return !params.userId && !params.username && !params.user || params.userId && this.userId === params.userId || params.username && this.user.username === params.username || params.user && this.user.username === params.user;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"parseJsonQuery.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/parseJsonQuery.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.helperMethods.set('parseJsonQuery', function _parseJsonQuery() {
  let sort;

  if (this.queryParams.sort) {
    try {
      sort = JSON.parse(this.queryParams.sort);
    } catch (e) {
      this.logger.warn(`Invalid sort parameter provided "${this.queryParams.sort}":`, e);
      throw new Meteor.Error('error-invalid-sort', `Invalid sort parameter provided: "${this.queryParams.sort}"`, {
        helperMethod: 'parseJsonQuery'
      });
    }
  }

  let fields;

  if (this.queryParams.fields) {
    try {
      fields = JSON.parse(this.queryParams.fields);
    } catch (e) {
      this.logger.warn(`Invalid fields parameter provided "${this.queryParams.fields}":`, e);
      throw new Meteor.Error('error-invalid-fields', `Invalid fields parameter provided: "${this.queryParams.fields}"`, {
        helperMethod: 'parseJsonQuery'
      });
    }
  } // Verify the user's selected fields only contains ones which their role allows


  if (typeof fields === 'object') {
    let nonSelectableFields = Object.keys(RocketChat.API.v1.defaultFieldsToExclude);

    if (this.request.route.includes('/v1/users.')) {
      const getFields = () => Object.keys(RocketChat.authz.hasPermission(this.userId, 'view-full-other-user-info') ? RocketChat.API.v1.limitedUserFieldsToExcludeIfIsPrivilegedUser : RocketChat.API.v1.limitedUserFieldsToExclude);

      nonSelectableFields = nonSelectableFields.concat(getFields());
    }

    Object.keys(fields).forEach(k => {
      if (nonSelectableFields.includes(k) || nonSelectableFields.includes(k.split(RocketChat.API.v1.fieldSeparator)[0])) {
        delete fields[k];
      }
    });
  } // Limit the fields by default


  fields = Object.assign({}, fields, RocketChat.API.v1.defaultFieldsToExclude);

  if (this.request.route.includes('/v1/users.')) {
    if (RocketChat.authz.hasPermission(this.userId, 'view-full-other-user-info')) {
      fields = Object.assign(fields, RocketChat.API.v1.limitedUserFieldsToExcludeIfIsPrivilegedUser);
    } else {
      fields = Object.assign(fields, RocketChat.API.v1.limitedUserFieldsToExclude);
    }
  }

  let query = {};

  if (this.queryParams.query) {
    try {
      query = JSON.parse(this.queryParams.query);
    } catch (e) {
      this.logger.warn(`Invalid query parameter provided "${this.queryParams.query}":`, e);
      throw new Meteor.Error('error-invalid-query', `Invalid query parameter provided: "${this.queryParams.query}"`, {
        helperMethod: 'parseJsonQuery'
      });
    }
  } // Verify the user has permission to query the fields they are


  if (typeof query === 'object') {
    let nonQueryableFields = Object.keys(RocketChat.API.v1.defaultFieldsToExclude);

    if (this.request.route.includes('/v1/users.')) {
      if (RocketChat.authz.hasPermission(this.userId, 'view-full-other-user-info')) {
        nonQueryableFields = nonQueryableFields.concat(Object.keys(RocketChat.API.v1.limitedUserFieldsToExcludeIfIsPrivilegedUser));
      } else {
        nonQueryableFields = nonQueryableFields.concat(Object.keys(RocketChat.API.v1.limitedUserFieldsToExclude));
      }
    }

    Object.keys(query).forEach(k => {
      if (nonQueryableFields.includes(k) || nonQueryableFields.includes(k.split(RocketChat.API.v1.fieldSeparator)[0])) {
        delete query[k];
      }
    });
  }

  return {
    sort,
    fields,
    query
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deprecationWarning.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/deprecationWarning.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

RocketChat.API.helperMethods.set('deprecationWarning', function _deprecationWarning({
  endpoint,
  versionWillBeRemove,
  response
}) {
  const warningMessage = `The endpoint "${endpoint}" is deprecated and will be removed after version ${versionWillBeRemove}`;
  console.warn(warningMessage);

  if (process.env.NODE_ENV === 'development') {
    return (0, _objectSpread2.default)({
      warning: warningMessage
    }, response);
  }

  return response;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getLoggedInUser.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/getLoggedInUser.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.helperMethods.set('getLoggedInUser', function _getLoggedInUser() {
  let user;

  if (this.request.headers['x-auth-token'] && this.request.headers['x-user-id']) {
    user = RocketChat.models.Users.findOne({
      _id: this.request.headers['x-user-id'],
      'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(this.request.headers['x-auth-token'])
    });
  }

  return user;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"insertUserObject.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/helpers/insertUserObject.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.helperMethods.set('insertUserObject', function _addUserToObject({
  object,
  userId
}) {
  const user = RocketChat.models.Users.findOneById(userId);
  object.user = {};

  if (user) {
    object.user = {
      _id: userId,
      username: user.username,
      name: user.name
    };
  }

  return object;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"default":{"info.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/default/info.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.default.addRoute('info', {
  authRequired: false
}, {
  get() {
    const user = this.getLoggedInUser();

    if (user && RocketChat.authz.hasRole(user._id, 'admin')) {
      return RocketChat.API.v1.success({
        info: RocketChat.Info
      });
    }

    return RocketChat.API.v1.success({
      version: RocketChat.Info.version
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"v1":{"channels.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/channels.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

// Returns the channel IF found otherwise it will return the failure of why it didn't. Check the `statusCode` property
function findChannelByIdOrName({
  params,
  checkedArchived = true
}) {
  if ((!params.roomId || !params.roomId.trim()) && (!params.roomName || !params.roomName.trim())) {
    throw new Meteor.Error('error-roomid-param-not-provided', 'The parameter "roomId" or "roomName" is required');
  }

  const fields = (0, _objectSpread2.default)({}, RocketChat.API.v1.defaultFieldsToExclude);
  let room;

  if (params.roomId) {
    room = RocketChat.models.Rooms.findOneById(params.roomId, {
      fields
    });
  } else if (params.roomName) {
    room = RocketChat.models.Rooms.findOneByName(params.roomName, {
      fields
    });
  }

  if (!room || room.t !== 'c') {
    throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "roomName" param provided does not match any channel');
  }

  if (checkedArchived && room.archived) {
    throw new Meteor.Error('error-room-archived', `The channel, ${room.name}, is archived`);
  }

  return room;
}

RocketChat.API.v1.addRoute('channels.addAll', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addAllUserToRoom', findResult._id, this.bodyParams.activeUsersOnly);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.addModerator', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addRoomModerator', findResult._id, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.addOwner', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addRoomOwner', findResult._id, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.archive', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('archiveRoom', findResult._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.close', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });
    const sub = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(findResult._id, this.userId);

    if (!sub) {
      return RocketChat.API.v1.failure(`The user/callee is not in the channel "${findResult.name}.`);
    }

    if (!sub.open) {
      return RocketChat.API.v1.failure(`The channel, ${findResult.name}, is already closed to the sender`);
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('hideRoom', findResult._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.counters', {
  authRequired: true
}, {
  get() {
    const access = RocketChat.authz.hasPermission(this.userId, 'view-room-administration');
    const {
      userId
    } = this.requestParams();
    let user = this.userId;
    let unreads = null;
    let userMentions = null;
    let unreadsFrom = null;
    let joined = false;
    let msgs = null;
    let latest = null;
    let members = null;

    if (userId) {
      if (!access) {
        return RocketChat.API.v1.unauthorized();
      }

      user = userId;
    }

    const room = findChannelByIdOrName({
      params: this.requestParams(),
      returnUsernames: true
    });
    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, user);
    const lm = room.lm ? room.lm : room._updatedAt;

    if (typeof subscription !== 'undefined' && subscription.open) {
      unreads = RocketChat.models.Messages.countVisibleByRoomIdBetweenTimestampsInclusive(subscription.rid, subscription.ls, lm);
      unreadsFrom = subscription.ls || subscription.ts;
      userMentions = subscription.userMentions;
      joined = true;
    }

    if (access || joined) {
      msgs = room.msgs;
      latest = lm;
      members = room.usersCount;
    }

    return RocketChat.API.v1.success({
      joined,
      members,
      unreads,
      unreadsFrom,
      msgs,
      latest,
      userMentions
    });
  }

}); // Channel -> create

function createChannelValidator(params) {
  if (!RocketChat.authz.hasPermission(params.user.value, 'create-c')) {
    throw new Error('unauthorized');
  }

  if (!params.name || !params.name.value) {
    throw new Error(`Param "${params.name.key}" is required`);
  }

  if (params.members && params.members.value && !_.isArray(params.members.value)) {
    throw new Error(`Param "${params.members.key}" must be an array if provided`);
  }

  if (params.customFields && params.customFields.value && !(typeof params.customFields.value === 'object')) {
    throw new Error(`Param "${params.customFields.key}" must be an object if provided`);
  }
}

function createChannel(userId, params) {
  const readOnly = typeof params.readOnly !== 'undefined' ? params.readOnly : false;
  let id;
  Meteor.runAsUser(userId, () => {
    id = Meteor.call('createChannel', params.name, params.members ? params.members : [], readOnly, params.customFields);
  });
  return {
    channel: RocketChat.models.Rooms.findOneById(id.rid, {
      fields: RocketChat.API.v1.defaultFieldsToExclude
    })
  };
}

RocketChat.API.channels = {};
RocketChat.API.channels.create = {
  validate: createChannelValidator,
  execute: createChannel
};
RocketChat.API.v1.addRoute('channels.create', {
  authRequired: true
}, {
  post() {
    const {
      userId,
      bodyParams
    } = this;
    let error;

    try {
      RocketChat.API.channels.create.validate({
        user: {
          value: userId
        },
        name: {
          value: bodyParams.name,
          key: 'name'
        },
        members: {
          value: bodyParams.members,
          key: 'members'
        }
      });
    } catch (e) {
      if (e.message === 'unauthorized') {
        error = RocketChat.API.v1.unauthorized();
      } else {
        error = RocketChat.API.v1.failure(e.message);
      }
    }

    if (error) {
      return error;
    }

    return RocketChat.API.v1.success(RocketChat.API.channels.create.execute(userId, bodyParams));
  }

});
RocketChat.API.v1.addRoute('channels.delete', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('eraseRoom', findResult._id);
    });
    return RocketChat.API.v1.success({
      channel: findResult
    });
  }

});
RocketChat.API.v1.addRoute('channels.files', {
  authRequired: true
}, {
  get() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });

    const addUserObjectToEveryObject = file => {
      if (file.userId) {
        file = this.insertUserObject({
          object: file,
          userId: file.userId
        });
      }

      return file;
    };

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('canAccessRoom', findResult._id, this.userId);
    });
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      rid: findResult._id
    });
    const files = RocketChat.models.Uploads.find(ourQuery, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      files: files.map(addUserObjectToEveryObject),
      count: files.length,
      offset,
      total: RocketChat.models.Uploads.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('channels.getIntegrations', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-integrations')) {
      return RocketChat.API.v1.unauthorized();
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });
    let includeAllPublicChannels = true;

    if (typeof this.queryParams.includeAllPublicChannels !== 'undefined') {
      includeAllPublicChannels = this.queryParams.includeAllPublicChannels === 'true';
    }

    let ourQuery = {
      channel: `#${findResult.name}`
    };

    if (includeAllPublicChannels) {
      ourQuery.channel = {
        $in: [ourQuery.channel, 'all_public_channels']
      };
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    ourQuery = Object.assign({}, query, ourQuery);
    const integrations = RocketChat.models.Integrations.find(ourQuery, {
      sort: sort ? sort : {
        _createdAt: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      integrations,
      count: integrations.length,
      offset,
      total: RocketChat.models.Integrations.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('channels.history', {
  authRequired: true
}, {
  get() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });
    let latestDate = new Date();

    if (this.queryParams.latest) {
      latestDate = new Date(this.queryParams.latest);
    }

    let oldestDate = undefined;

    if (this.queryParams.oldest) {
      oldestDate = new Date(this.queryParams.oldest);
    }

    const inclusive = this.queryParams.inclusive || false;
    let count = 20;

    if (this.queryParams.count) {
      count = parseInt(this.queryParams.count);
    }

    const unreads = this.queryParams.unreads || false;
    let result;
    Meteor.runAsUser(this.userId, () => {
      result = Meteor.call('getChannelHistory', {
        rid: findResult._id,
        latest: latestDate,
        oldest: oldestDate,
        inclusive,
        count,
        unreads
      });
    });

    if (!result) {
      return RocketChat.API.v1.unauthorized();
    }

    return RocketChat.API.v1.success(result);
  }

});
RocketChat.API.v1.addRoute('channels.info', {
  authRequired: true
}, {
  get() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.invite', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addUserToRoom', {
        rid: findResult._id,
        username: user.username
      });
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.join', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('joinRoom', findResult._id, this.bodyParams.joinCode);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.kick', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('removeUserFromRoom', {
        rid: findResult._id,
        username: user.username
      });
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.leave', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('leaveRoom', findResult._id);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.list', {
  authRequired: true
}, {
  get: {
    // This is defined as such only to provide an example of how the routes can be defined :X
    action() {
      const {
        offset,
        count
      } = this.getPaginationItems();
      const {
        sort,
        fields,
        query
      } = this.parseJsonQuery();
      const hasPermissionToSeeAllPublicChannels = RocketChat.authz.hasPermission(this.userId, 'view-c-room');
      const ourQuery = (0, _objectSpread2.default)({}, query, {
        t: 'c'
      });

      if (!hasPermissionToSeeAllPublicChannels) {
        if (!RocketChat.authz.hasPermission(this.userId, 'view-joined-room')) {
          return RocketChat.API.v1.unauthorized();
        }

        const roomIds = RocketChat.models.Subscriptions.findByUserIdAndType(this.userId, 'c', {
          fields: {
            rid: 1
          }
        }).fetch().map(s => s.rid);
        ourQuery._id = {
          $in: roomIds
        };
      }

      const cursor = RocketChat.models.Rooms.find(ourQuery, {
        sort: sort ? sort : {
          name: 1
        },
        skip: offset,
        limit: count,
        fields
      });
      const total = cursor.count();
      const rooms = cursor.fetch();
      return RocketChat.API.v1.success({
        channels: rooms,
        count: rooms.length,
        offset,
        total
      });
    }

  }
});
RocketChat.API.v1.addRoute('channels.list.joined', {
  authRequired: true
}, {
  get() {
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields
    } = this.parseJsonQuery(); // TODO: CACHE: Add Breacking notice since we removed the query param

    const cursor = RocketChat.models.Rooms.findBySubscriptionTypeAndUserId('c', this.userId, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    });
    const totalCount = cursor.count();
    const rooms = cursor.fetch();
    return RocketChat.API.v1.success({
      channels: rooms,
      offset,
      count: rooms.length,
      total: totalCount
    });
  }

});
RocketChat.API.v1.addRoute('channels.members', {
  authRequired: true
}, {
  get() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });

    if (findResult.broadcast && !RocketChat.authz.hasPermission(this.userId, 'view-broadcast-member-list')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort = {}
    } = this.parseJsonQuery();
    const subscriptions = RocketChat.models.Subscriptions.findByRoomId(findResult._id, {
      fields: {
        'u._id': 1
      },
      sort: {
        'u.username': sort.username != null ? sort.username : 1
      },
      skip: offset,
      limit: count
    });
    const total = subscriptions.count();
    const members = subscriptions.fetch().map(s => s.u && s.u._id);
    const users = RocketChat.models.Users.find({
      _id: {
        $in: members
      }
    }, {
      fields: {
        _id: 1,
        username: 1,
        name: 1,
        status: 1,
        utcOffset: 1
      },
      sort: {
        username: sort.username != null ? sort.username : 1
      }
    }).fetch();
    return RocketChat.API.v1.success({
      members: users,
      count: users.length,
      offset,
      total
    });
  }

});
RocketChat.API.v1.addRoute('channels.messages', {
  authRequired: true
}, {
  get() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      rid: findResult._id
    }); // Special check for the permissions

    if (RocketChat.authz.hasPermission(this.userId, 'view-joined-room') && !RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(findResult._id, this.userId, {
      fields: {
        _id: 1
      }
    })) {
      return RocketChat.API.v1.unauthorized();
    }

    if (!RocketChat.authz.hasPermission(this.userId, 'view-c-room')) {
      return RocketChat.API.v1.unauthorized();
    }

    const cursor = RocketChat.models.Messages.find(ourQuery, {
      sort: sort ? sort : {
        ts: -1
      },
      skip: offset,
      limit: count,
      fields
    });
    const total = cursor.count();
    const messages = cursor.fetch();
    return RocketChat.API.v1.success({
      messages,
      count: messages.length,
      offset,
      total
    });
  }

}); // TODO: CACHE: I dont like this method( functionality and how we implemented ) its very expensive
// TODO check if this code is better or not
// RocketChat.API.v1.addRoute('channels.online', { authRequired: true }, {
// 	get() {
// 		const { query } = this.parseJsonQuery();
// 		const ourQuery = Object.assign({}, query, { t: 'c' });
// 		const room = RocketChat.models.Rooms.findOne(ourQuery);
// 		if (room == null) {
// 			return RocketChat.API.v1.failure('Channel does not exists');
// 		}
// 		const ids = RocketChat.models.Subscriptions.find({ rid: room._id }, { fields: { 'u._id': 1 } }).fetch().map(sub => sub.u._id);
// 		const online = RocketChat.models.Users.find({
// 			username: { $exists: 1 },
// 			_id: { $in: ids },
// 			status: { $in: ['online', 'away', 'busy'] }
// 		}, {
// 			fields: { username: 1 }
// 		}).fetch();
// 		return RocketChat.API.v1.success({
// 			online
// 		});
// 	}
// });

RocketChat.API.v1.addRoute('channels.online', {
  authRequired: true
}, {
  get() {
    const {
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      t: 'c'
    });
    const room = RocketChat.models.Rooms.findOne(ourQuery);

    if (room == null) {
      return RocketChat.API.v1.failure('Channel does not exists');
    }

    const online = RocketChat.models.Users.findUsersNotOffline({
      fields: {
        username: 1
      }
    }).fetch();
    const onlineInRoom = [];
    online.forEach(user => {
      const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, user._id, {
        fields: {
          _id: 1
        }
      });

      if (subscription) {
        onlineInRoom.push({
          _id: user._id,
          username: user.username
        });
      }
    });
    return RocketChat.API.v1.success({
      online: onlineInRoom
    });
  }

});
RocketChat.API.v1.addRoute('channels.open', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });
    const sub = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(findResult._id, this.userId);

    if (!sub) {
      return RocketChat.API.v1.failure(`The user/callee is not in the channel "${findResult.name}".`);
    }

    if (sub.open) {
      return RocketChat.API.v1.failure(`The channel, ${findResult.name}, is already open to the sender`);
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('openRoom', findResult._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.removeModerator', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('removeRoomModerator', findResult._id, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.removeOwner', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('removeRoomOwner', findResult._id, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.rename', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.name || !this.bodyParams.name.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "name" is required');
    }

    const findResult = findChannelByIdOrName({
      params: {
        roomId: this.bodyParams.roomId
      }
    });

    if (findResult.name === this.bodyParams.name) {
      return RocketChat.API.v1.failure('The channel name is the same as what it would be renamed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'roomName', this.bodyParams.name);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.setCustomFields', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.customFields || !(typeof this.bodyParams.customFields === 'object')) {
      return RocketChat.API.v1.failure('The bodyParam "customFields" is required with a type like object.');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'roomCustomFields', this.bodyParams.customFields);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.setDefault', {
  authRequired: true
}, {
  post() {
    if (typeof this.bodyParams.default === 'undefined') {
      return RocketChat.API.v1.failure('The bodyParam "default" is required', 'error-channels-setdefault-is-same');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });

    if (findResult.default === this.bodyParams.default) {
      return RocketChat.API.v1.failure('The channel default setting is the same as what it would be changed to.', 'error-channels-setdefault-missing-default-param');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'default', this.bodyParams.default.toString());
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.setDescription', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.description || !this.bodyParams.description.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "description" is required');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });

    if (findResult.description === this.bodyParams.description) {
      return RocketChat.API.v1.failure('The channel description is the same as what it would be changed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'roomDescription', this.bodyParams.description);
    });
    return RocketChat.API.v1.success({
      description: this.bodyParams.description
    });
  }

});
RocketChat.API.v1.addRoute('channels.setJoinCode', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.joinCode || !this.bodyParams.joinCode.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "joinCode" is required');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'joinCode', this.bodyParams.joinCode);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.setPurpose', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.purpose || !this.bodyParams.purpose.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "purpose" is required');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });

    if (findResult.description === this.bodyParams.purpose) {
      return RocketChat.API.v1.failure('The channel purpose (description) is the same as what it would be changed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'roomDescription', this.bodyParams.purpose);
    });
    return RocketChat.API.v1.success({
      purpose: this.bodyParams.purpose
    });
  }

});
RocketChat.API.v1.addRoute('channels.setReadOnly', {
  authRequired: true
}, {
  post() {
    if (typeof this.bodyParams.readOnly === 'undefined') {
      return RocketChat.API.v1.failure('The bodyParam "readOnly" is required');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });

    if (findResult.ro === this.bodyParams.readOnly) {
      return RocketChat.API.v1.failure('The channel read only setting is the same as what it would be changed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'readOnly', this.bodyParams.readOnly);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.setTopic', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.topic || !this.bodyParams.topic.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "topic" is required');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });

    if (findResult.topic === this.bodyParams.topic) {
      return RocketChat.API.v1.failure('The channel topic is the same as what it would be changed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'roomTopic', this.bodyParams.topic);
    });
    return RocketChat.API.v1.success({
      topic: this.bodyParams.topic
    });
  }

});
RocketChat.API.v1.addRoute('channels.setAnnouncement', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.announcement || !this.bodyParams.announcement.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "announcement" is required');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'roomAnnouncement', this.bodyParams.announcement);
    });
    return RocketChat.API.v1.success({
      announcement: this.bodyParams.announcement
    });
  }

});
RocketChat.API.v1.addRoute('channels.setType', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.type || !this.bodyParams.type.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "type" is required');
    }

    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });

    if (findResult.t === this.bodyParams.type) {
      return RocketChat.API.v1.failure('The channel type is the same as what it would be changed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult._id, 'roomType', this.bodyParams.type);
    });
    return RocketChat.API.v1.success({
      channel: RocketChat.models.Rooms.findOneById(findResult._id, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('channels.unarchive', {
  authRequired: true
}, {
  post() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams(),
      checkedArchived: false
    });

    if (!findResult.archived) {
      return RocketChat.API.v1.failure(`The channel, ${findResult.name}, is not archived`);
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('unarchiveRoom', findResult._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('channels.getAllUserMentionsByChannel', {
  authRequired: true
}, {
  get() {
    const {
      roomId
    } = this.requestParams();
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort
    } = this.parseJsonQuery();

    if (!roomId) {
      return RocketChat.API.v1.failure('The request param "roomId" is required');
    }

    const mentions = Meteor.runAsUser(this.userId, () => Meteor.call('getUserMentionsByChannel', {
      roomId,
      options: {
        sort: sort ? sort : {
          ts: 1
        },
        skip: offset,
        limit: count
      }
    }));
    const allMentions = Meteor.runAsUser(this.userId, () => Meteor.call('getUserMentionsByChannel', {
      roomId,
      options: {}
    }));
    return RocketChat.API.v1.success({
      mentions,
      count: mentions.length,
      offset,
      total: allMentions.length
    });
  }

});
RocketChat.API.v1.addRoute('channels.roles', {
  authRequired: true
}, {
  get() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const roles = Meteor.runAsUser(this.userId, () => Meteor.call('getRoomRoles', findResult._id));
    return RocketChat.API.v1.success({
      roles
    });
  }

});
RocketChat.API.v1.addRoute('channels.moderators', {
  authRequired: true
}, {
  get() {
    const findResult = findChannelByIdOrName({
      params: this.requestParams()
    });
    const moderators = RocketChat.models.Subscriptions.findByRoomIdAndRoles(findResult._id, ['moderator'], {
      fields: {
        u: 1
      }
    }).fetch().map(sub => sub.u);
    return RocketChat.API.v1.success({
      moderators
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"roles.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/roles.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('roles.list', {
  authRequired: true
}, {
  get() {
    const roles = RocketChat.models.Roles.find({}, {
      fields: {
        _updatedAt: 0
      }
    }).fetch();
    return RocketChat.API.v1.success({
      roles
    });
  }

});
RocketChat.API.v1.addRoute('roles.create', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, {
      name: String,
      scope: Match.Maybe(String),
      description: Match.Maybe(String)
    });
    const roleData = {
      name: this.bodyParams.name,
      scope: this.bodyParams.scope,
      description: this.bodyParams.description
    };
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('authorization:saveRole', roleData);
    });
    return RocketChat.API.v1.success({
      role: RocketChat.models.Roles.findOneByIdOrName(roleData.name, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('roles.addUserToRole', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, {
      roleName: String,
      username: String,
      roomId: Match.Maybe(String)
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('authorization:addUserToRole', this.bodyParams.roleName, user.username, this.bodyParams.roomId);
    });
    return RocketChat.API.v1.success({
      role: RocketChat.models.Roles.findOneByIdOrName(this.bodyParams.roleName, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"rooms.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/rooms.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

let Busboy;
module.watch(require("busboy"), {
  default(v) {
    Busboy = v;
  }

}, 0);

function findRoomByIdOrName({
  params,
  checkedArchived = true
}) {
  if ((!params.roomId || !params.roomId.trim()) && (!params.roomName || !params.roomName.trim())) {
    throw new Meteor.Error('error-roomid-param-not-provided', 'The parameter "roomId" or "roomName" is required');
  }

  const fields = (0, _objectSpread2.default)({}, RocketChat.API.v1.defaultFieldsToExclude);
  let room;

  if (params.roomId) {
    room = RocketChat.models.Rooms.findOneById(params.roomId, {
      fields
    });
  } else if (params.roomName) {
    room = RocketChat.models.Rooms.findOneByName(params.roomName, {
      fields
    });
  }

  if (!room) {
    throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "roomName" param provided does not match any channel');
  }

  if (checkedArchived && room.archived) {
    throw new Meteor.Error('error-room-archived', `The channel, ${room.name}, is archived`);
  }

  return room;
}

RocketChat.API.v1.addRoute('rooms.get', {
  authRequired: true
}, {
  get() {
    const {
      updatedSince
    } = this.queryParams;
    let updatedSinceDate;

    if (updatedSince) {
      if (isNaN(Date.parse(updatedSince))) {
        throw new Meteor.Error('error-updatedSince-param-invalid', 'The "updatedSince" query parameter must be a valid date.');
      } else {
        updatedSinceDate = new Date(updatedSince);
      }
    }

    let result;
    Meteor.runAsUser(this.userId, () => result = Meteor.call('rooms/get', updatedSinceDate));

    if (Array.isArray(result)) {
      result = {
        update: result,
        remove: []
      };
    }

    return RocketChat.API.v1.success(result);
  }

});
RocketChat.API.v1.addRoute('rooms.upload/:rid', {
  authRequired: true
}, {
  post() {
    const room = Meteor.call('canAccessRoom', this.urlParams.rid, this.userId);

    if (!room) {
      return RocketChat.API.v1.unauthorized();
    }

    const busboy = new Busboy({
      headers: this.request.headers
    });
    const files = [];
    const fields = {};
    Meteor.wrapAsync(callback => {
      busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (fieldname !== 'file') {
          return files.push(new Meteor.Error('invalid-field'));
        }

        const fileDate = [];
        file.on('data', data => fileDate.push(data));
        file.on('end', () => {
          files.push({
            fieldname,
            file,
            filename,
            encoding,
            mimetype,
            fileBuffer: Buffer.concat(fileDate)
          });
        });
      });
      busboy.on('field', (fieldname, value) => fields[fieldname] = value);
      busboy.on('finish', Meteor.bindEnvironment(() => callback()));
      this.request.pipe(busboy);
    })();

    if (files.length === 0) {
      return RocketChat.API.v1.failure('File required');
    }

    if (files.length > 1) {
      return RocketChat.API.v1.failure('Just 1 file is allowed');
    }

    const file = files[0];
    const fileStore = FileUpload.getStore('Uploads');
    const details = {
      name: file.filename,
      size: file.fileBuffer.length,
      type: file.mimetype,
      rid: this.urlParams.rid,
      userId: this.userId
    };
    Meteor.runAsUser(this.userId, () => {
      const uploadedFile = Meteor.wrapAsync(fileStore.insert.bind(fileStore))(details, file.fileBuffer);
      uploadedFile.description = fields.description;
      delete fields.description;
      RocketChat.API.v1.success(Meteor.call('sendFileMessage', this.urlParams.rid, null, uploadedFile, fields));
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('rooms.saveNotification', {
  authRequired: true
}, {
  post() {
    const saveNotifications = (notifications, roomId) => {
      Object.keys(notifications).forEach(notificationKey => Meteor.runAsUser(this.userId, () => Meteor.call('saveNotificationSettings', roomId, notificationKey, notifications[notificationKey])));
    };

    const {
      roomId,
      notifications
    } = this.bodyParams;

    if (!roomId) {
      return RocketChat.API.v1.failure('The \'roomId\' param is required');
    }

    if (!notifications || Object.keys(notifications).length === 0) {
      return RocketChat.API.v1.failure('The \'notifications\' param is required');
    }

    saveNotifications(notifications, roomId);
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('rooms.favorite', {
  authRequired: true
}, {
  post() {
    const {
      favorite
    } = this.bodyParams;

    if (!this.bodyParams.hasOwnProperty('favorite')) {
      return RocketChat.API.v1.failure('The \'favorite\' param is required');
    }

    const room = findRoomByIdOrName({
      params: this.bodyParams
    });
    Meteor.runAsUser(this.userId, () => Meteor.call('toggleFavorite', room._id, favorite));
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('rooms.cleanHistory', {
  authRequired: true
}, {
  post() {
    const findResult = findRoomByIdOrName({
      params: this.bodyParams
    });

    if (!this.bodyParams.latest) {
      return RocketChat.API.v1.failure('Body parameter "latest" is required.');
    }

    if (!this.bodyParams.oldest) {
      return RocketChat.API.v1.failure('Body parameter "oldest" is required.');
    }

    const latest = new Date(this.bodyParams.latest);
    const oldest = new Date(this.bodyParams.oldest);
    const inclusive = this.bodyParams.inclusive || false;
    Meteor.runAsUser(this.userId, () => Meteor.call('cleanRoomHistory', {
      roomId: findResult._id,
      latest,
      oldest,
      inclusive,
      limit: this.bodyParams.limit,
      excludePinned: this.bodyParams.excludePinned,
      filesOnly: this.bodyParams.filesOnly,
      fromUsers: this.bodyParams.users
    }));
    return RocketChat.API.v1.success();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"subscriptions.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/subscriptions.js                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('subscriptions.get', {
  authRequired: true
}, {
  get() {
    const {
      updatedSince
    } = this.queryParams;
    let updatedSinceDate;

    if (updatedSince) {
      if (isNaN(Date.parse(updatedSince))) {
        throw new Meteor.Error('error-roomId-param-invalid', 'The "lastUpdate" query parameter must be a valid date.');
      } else {
        updatedSinceDate = new Date(updatedSince);
      }
    }

    let result;
    Meteor.runAsUser(this.userId, () => result = Meteor.call('subscriptions/get', updatedSinceDate));

    if (Array.isArray(result)) {
      result = {
        update: result,
        remove: []
      };
    }

    return RocketChat.API.v1.success(result);
  }

});
RocketChat.API.v1.addRoute('subscriptions.getOne', {
  authRequired: true
}, {
  get() {
    const {
      roomId
    } = this.requestParams();

    if (!roomId) {
      return RocketChat.API.v1.failure('The \'roomId\' param is required');
    }

    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(roomId, this.userId);
    return RocketChat.API.v1.success({
      subscription
    });
  }

});
/**
	This API is suppose to mark any room as read.

	Method: POST
	Route: api/v1/subscriptions.read
	Params:
		- rid: The rid of the room to be marked as read.
 */

RocketChat.API.v1.addRoute('subscriptions.read', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, {
      rid: String
    });
    Meteor.runAsUser(this.userId, () => Meteor.call('readMessages', this.bodyParams.rid));
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('subscriptions.unread', {
  authRequired: true
}, {
  post() {
    const {
      roomId,
      firstUnreadMessage
    } = this.bodyParams;

    if (!roomId && firstUnreadMessage && !firstUnreadMessage._id) {
      return RocketChat.API.v1.failure('At least one of "roomId" or "firstUnreadMessage._id" params is required');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('unreadMessages', firstUnreadMessage, roomId));
    return RocketChat.API.v1.success();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"chat.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/chat.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* global processWebhookMessage */
RocketChat.API.v1.addRoute('chat.delete', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, Match.ObjectIncluding({
      msgId: String,
      roomId: String,
      asUser: Match.Maybe(Boolean)
    }));
    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.msgId, {
      fields: {
        u: 1,
        rid: 1
      }
    });

    if (!msg) {
      return RocketChat.API.v1.failure(`No message found with the id of "${this.bodyParams.msgId}".`);
    }

    if (this.bodyParams.roomId !== msg.rid) {
      return RocketChat.API.v1.failure('The room id provided does not match where the message is from.');
    }

    if (this.bodyParams.asUser && msg.u._id !== this.userId && !RocketChat.authz.hasPermission(Meteor.userId(), 'force-delete-message', msg.rid)) {
      return RocketChat.API.v1.failure('Unauthorized. You must have the permission "force-delete-message" to delete other\'s message as them.');
    }

    Meteor.runAsUser(this.bodyParams.asUser ? msg.u._id : this.userId, () => {
      Meteor.call('deleteMessage', {
        _id: msg._id
      });
    });
    return RocketChat.API.v1.success({
      _id: msg._id,
      ts: Date.now(),
      message: msg
    });
  }

});
RocketChat.API.v1.addRoute('chat.syncMessages', {
  authRequired: true
}, {
  get() {
    const {
      roomId,
      lastUpdate
    } = this.queryParams;

    if (!roomId) {
      throw new Meteor.Error('error-roomId-param-not-provided', 'The required "roomId" query param is missing.');
    }

    if (!lastUpdate) {
      throw new Meteor.Error('error-lastUpdate-param-not-provided', 'The required "lastUpdate" query param is missing.');
    } else if (isNaN(Date.parse(lastUpdate))) {
      throw new Meteor.Error('error-roomId-param-invalid', 'The "lastUpdate" query parameter must be a valid date.');
    }

    let result;
    Meteor.runAsUser(this.userId, () => {
      result = Meteor.call('messages/get', roomId, {
        lastUpdate: new Date(lastUpdate)
      });
    });

    if (!result) {
      return RocketChat.API.v1.failure();
    }

    return RocketChat.API.v1.success({
      result
    });
  }

});
RocketChat.API.v1.addRoute('chat.getMessage', {
  authRequired: true
}, {
  get() {
    if (!this.queryParams.msgId) {
      return RocketChat.API.v1.failure('The "msgId" query parameter must be provided.');
    }

    let msg;
    Meteor.runAsUser(this.userId, () => {
      msg = Meteor.call('getSingleMessage', this.queryParams.msgId);
    });

    if (!msg) {
      return RocketChat.API.v1.failure();
    }

    return RocketChat.API.v1.success({
      message: msg
    });
  }

});
RocketChat.API.v1.addRoute('chat.pinMessage', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.messageId || !this.bodyParams.messageId.trim()) {
      throw new Meteor.Error('error-messageid-param-not-provided', 'The required "messageId" param is missing.');
    }

    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.messageId);

    if (!msg) {
      throw new Meteor.Error('error-message-not-found', 'The provided "messageId" does not match any existing message.');
    }

    let pinnedMessage;
    Meteor.runAsUser(this.userId, () => pinnedMessage = Meteor.call('pinMessage', msg));
    return RocketChat.API.v1.success({
      message: pinnedMessage
    });
  }

});
RocketChat.API.v1.addRoute('chat.postMessage', {
  authRequired: true
}, {
  post() {
    const messageReturn = processWebhookMessage(this.bodyParams, this.user, undefined, true)[0];

    if (!messageReturn) {
      return RocketChat.API.v1.failure('unknown-error');
    }

    return RocketChat.API.v1.success({
      ts: Date.now(),
      channel: messageReturn.channel,
      message: messageReturn.message
    });
  }

});
RocketChat.API.v1.addRoute('chat.search', {
  authRequired: true
}, {
  get() {
    const {
      roomId,
      searchText
    } = this.queryParams;
    const {
      count
    } = this.getPaginationItems();

    if (!roomId) {
      throw new Meteor.Error('error-roomId-param-not-provided', 'The required "roomId" query param is missing.');
    }

    if (!searchText) {
      throw new Meteor.Error('error-searchText-param-not-provided', 'The required "searchText" query param is missing.');
    }

    let result;
    Meteor.runAsUser(this.userId, () => result = Meteor.call('messageSearch', searchText, roomId, count).message.docs);
    return RocketChat.API.v1.success({
      messages: result
    });
  }

}); // The difference between `chat.postMessage` and `chat.sendMessage` is that `chat.sendMessage` allows
// for passing a value for `_id` and the other one doesn't. Also, `chat.sendMessage` only sends it to
// one channel whereas the other one allows for sending to more than one channel at a time.

RocketChat.API.v1.addRoute('chat.sendMessage', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.message) {
      throw new Meteor.Error('error-invalid-params', 'The "message" parameter must be provided.');
    }

    let message;
    Meteor.runAsUser(this.userId, () => message = Meteor.call('sendMessage', this.bodyParams.message));
    return RocketChat.API.v1.success({
      message
    });
  }

});
RocketChat.API.v1.addRoute('chat.starMessage', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.messageId || !this.bodyParams.messageId.trim()) {
      throw new Meteor.Error('error-messageid-param-not-provided', 'The required "messageId" param is required.');
    }

    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.messageId);

    if (!msg) {
      throw new Meteor.Error('error-message-not-found', 'The provided "messageId" does not match any existing message.');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('starMessage', {
      _id: msg._id,
      rid: msg.rid,
      starred: true
    }));
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('chat.unPinMessage', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.messageId || !this.bodyParams.messageId.trim()) {
      throw new Meteor.Error('error-messageid-param-not-provided', 'The required "messageId" param is required.');
    }

    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.messageId);

    if (!msg) {
      throw new Meteor.Error('error-message-not-found', 'The provided "messageId" does not match any existing message.');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('unpinMessage', msg));
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('chat.unStarMessage', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.messageId || !this.bodyParams.messageId.trim()) {
      throw new Meteor.Error('error-messageid-param-not-provided', 'The required "messageId" param is required.');
    }

    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.messageId);

    if (!msg) {
      throw new Meteor.Error('error-message-not-found', 'The provided "messageId" does not match any existing message.');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('starMessage', {
      _id: msg._id,
      rid: msg.rid,
      starred: false
    }));
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('chat.update', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, Match.ObjectIncluding({
      roomId: String,
      msgId: String,
      text: String // Using text to be consistant with chat.postMessage

    }));
    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.msgId); // Ensure the message exists

    if (!msg) {
      return RocketChat.API.v1.failure(`No message found with the id of "${this.bodyParams.msgId}".`);
    }

    if (this.bodyParams.roomId !== msg.rid) {
      return RocketChat.API.v1.failure('The room id provided does not match where the message is from.');
    } // Permission checks are already done in the updateMessage method, so no need to duplicate them


    Meteor.runAsUser(this.userId, () => {
      Meteor.call('updateMessage', {
        _id: msg._id,
        msg: this.bodyParams.text,
        rid: msg.rid
      });
    });
    return RocketChat.API.v1.success({
      message: RocketChat.models.Messages.findOneById(msg._id)
    });
  }

});
RocketChat.API.v1.addRoute('chat.react', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.messageId || !this.bodyParams.messageId.trim()) {
      throw new Meteor.Error('error-messageid-param-not-provided', 'The required "messageId" param is missing.');
    }

    const msg = RocketChat.models.Messages.findOneById(this.bodyParams.messageId);

    if (!msg) {
      throw new Meteor.Error('error-message-not-found', 'The provided "messageId" does not match any existing message.');
    }

    const emoji = this.bodyParams.emoji || this.bodyParams.reaction;

    if (!emoji) {
      throw new Meteor.Error('error-emoji-param-not-provided', 'The required "emoji" param is missing.');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('setReaction', emoji, msg._id, this.bodyParams.shouldReact));
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('chat.getMessageReadReceipts', {
  authRequired: true
}, {
  get() {
    const {
      messageId
    } = this.queryParams;

    if (!messageId) {
      return RocketChat.API.v1.failure({
        error: 'The required \'messageId\' param is missing.'
      });
    }

    try {
      const messageReadReceipts = Meteor.runAsUser(this.userId, () => Meteor.call('getReadReceipts', {
        messageId
      }));
      return RocketChat.API.v1.success({
        receipts: messageReadReceipts
      });
    } catch (error) {
      return RocketChat.API.v1.failure({
        error: error.message
      });
    }
  }

});
RocketChat.API.v1.addRoute('chat.reportMessage', {
  authRequired: true
}, {
  post() {
    const {
      messageId,
      description
    } = this.bodyParams;

    if (!messageId) {
      return RocketChat.API.v1.failure('The required "messageId" param is missing.');
    }

    if (!description) {
      return RocketChat.API.v1.failure('The required "description" param is missing.');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('reportMessage', messageId, description));
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('chat.ignoreUser', {
  authRequired: true
}, {
  get() {
    const {
      rid,
      userId
    } = this.queryParams;
    let {
      ignore = true
    } = this.queryParams;
    ignore = typeof ignore === 'string' ? /true|1/.test(ignore) : ignore;

    if (!rid || !rid.trim()) {
      throw new Meteor.Error('error-room-id-param-not-provided', 'The required "rid" param is missing.');
    }

    if (!userId || !userId.trim()) {
      throw new Meteor.Error('error-user-id-param-not-provided', 'The required "userId" param is missing.');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('ignoreUser', {
      rid,
      userId,
      ignore
    }));
    return RocketChat.API.v1.success();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"commands.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/commands.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('commands.get', {
  authRequired: true
}, {
  get() {
    const params = this.queryParams;

    if (typeof params.command !== 'string') {
      return RocketChat.API.v1.failure('The query param "command" must be provided.');
    }

    const cmd = RocketChat.slashCommands.commands[params.command.toLowerCase()];

    if (!cmd) {
      return RocketChat.API.v1.failure(`There is no command in the system by the name of: ${params.command}`);
    }

    return RocketChat.API.v1.success({
      command: cmd
    });
  }

});
RocketChat.API.v1.addRoute('commands.list', {
  authRequired: true
}, {
  get() {
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    let commands = Object.values(RocketChat.slashCommands.commands);

    if (query && query.command) {
      commands = commands.filter(command => command.command === query.command);
    }

    const totalCount = commands.length;
    commands = RocketChat.models.Rooms.processQueryOptionsOnResult(commands, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    });
    return RocketChat.API.v1.success({
      commands,
      offset,
      count: commands.length,
      total: totalCount
    });
  }

}); // Expects a body of: { command: 'gimme', params: 'any string value', roomId: 'value' }

RocketChat.API.v1.addRoute('commands.run', {
  authRequired: true
}, {
  post() {
    const body = this.bodyParams;
    const user = this.getLoggedInUser();

    if (typeof body.command !== 'string') {
      return RocketChat.API.v1.failure('You must provide a command to run.');
    }

    if (body.params && typeof body.params !== 'string') {
      return RocketChat.API.v1.failure('The parameters for the command must be a single string.');
    }

    if (typeof body.roomId !== 'string') {
      return RocketChat.API.v1.failure('The room\'s id where to execute this command must be provided and be a string.');
    }

    const cmd = body.command.toLowerCase();

    if (!RocketChat.slashCommands.commands[body.command.toLowerCase()]) {
      return RocketChat.API.v1.failure('The command provided does not exist (or is disabled).');
    } // This will throw an error if they can't or the room is invalid


    Meteor.call('canAccessRoom', body.roomId, user._id);
    const params = body.params ? body.params : '';
    let result;
    Meteor.runAsUser(user._id, () => {
      result = RocketChat.slashCommands.run(cmd, params, {
        _id: Random.id(),
        rid: body.roomId,
        msg: `/${cmd} ${params}`
      });
    });
    return RocketChat.API.v1.success({
      result
    });
  }

});
RocketChat.API.v1.addRoute('commands.preview', {
  authRequired: true
}, {
  // Expects these query params: command: 'giphy', params: 'mine', roomId: 'value'
  get() {
    const query = this.queryParams;
    const user = this.getLoggedInUser();

    if (typeof query.command !== 'string') {
      return RocketChat.API.v1.failure('You must provide a command to get the previews from.');
    }

    if (query.params && typeof query.params !== 'string') {
      return RocketChat.API.v1.failure('The parameters for the command must be a single string.');
    }

    if (typeof query.roomId !== 'string') {
      return RocketChat.API.v1.failure('The room\'s id where the previews are being displayed must be provided and be a string.');
    }

    const cmd = query.command.toLowerCase();

    if (!RocketChat.slashCommands.commands[cmd]) {
      return RocketChat.API.v1.failure('The command provided does not exist (or is disabled).');
    } // This will throw an error if they can't or the room is invalid


    Meteor.call('canAccessRoom', query.roomId, user._id);
    const params = query.params ? query.params : '';
    let preview;
    Meteor.runAsUser(user._id, () => {
      preview = Meteor.call('getSlashCommandPreviews', {
        cmd,
        params,
        msg: {
          rid: query.roomId
        }
      });
    });
    return RocketChat.API.v1.success({
      preview
    });
  },

  // Expects a body format of: { command: 'giphy', params: 'mine', roomId: 'value', previewItem: { id: 'sadf8' type: 'image', value: 'https://dev.null/gif } }
  post() {
    const body = this.bodyParams;
    const user = this.getLoggedInUser();

    if (typeof body.command !== 'string') {
      return RocketChat.API.v1.failure('You must provide a command to run the preview item on.');
    }

    if (body.params && typeof body.params !== 'string') {
      return RocketChat.API.v1.failure('The parameters for the command must be a single string.');
    }

    if (typeof body.roomId !== 'string') {
      return RocketChat.API.v1.failure('The room\'s id where the preview is being executed in must be provided and be a string.');
    }

    if (typeof body.previewItem === 'undefined') {
      return RocketChat.API.v1.failure('The preview item being executed must be provided.');
    }

    if (!body.previewItem.id || !body.previewItem.type || typeof body.previewItem.value === 'undefined') {
      return RocketChat.API.v1.failure('The preview item being executed is in the wrong format.');
    }

    const cmd = body.command.toLowerCase();

    if (!RocketChat.slashCommands.commands[cmd]) {
      return RocketChat.API.v1.failure('The command provided does not exist (or is disabled).');
    } // This will throw an error if they can't or the room is invalid


    Meteor.call('canAccessRoom', body.roomId, user._id);
    const params = body.params ? body.params : '';
    Meteor.runAsUser(user._id, () => {
      Meteor.call('executeSlashCommandPreview', {
        cmd,
        params,
        msg: {
          rid: body.roomId
        }
      }, body.previewItem);
    });
    return RocketChat.API.v1.success();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"emoji-custom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/emoji-custom.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('emoji-custom', {
  authRequired: true
}, {
  get() {
    const emojis = Meteor.call('listEmojiCustom');
    return RocketChat.API.v1.success({
      emojis
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"groups.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/groups.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

// Returns the private group subscription IF found otherwise it will return the failure of why it didn't. Check the `statusCode` property
function findPrivateGroupByIdOrName({
  params,
  userId,
  checkedArchived = true
}) {
  if ((!params.roomId || !params.roomId.trim()) && (!params.roomName || !params.roomName.trim())) {
    throw new Meteor.Error('error-room-param-not-provided', 'The parameter "roomId" or "roomName" is required');
  }

  let roomSub;

  if (params.roomId) {
    roomSub = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(params.roomId, userId);
  } else if (params.roomName) {
    roomSub = RocketChat.models.Subscriptions.findOneByRoomNameAndUserId(params.roomName, userId);
  }

  if (!roomSub || roomSub.t !== 'p') {
    throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "roomName" param provided does not match any group');
  }

  if (checkedArchived && roomSub.archived) {
    throw new Meteor.Error('error-room-archived', `The private group, ${roomSub.name}, is archived`);
  }

  return roomSub;
}

RocketChat.API.v1.addRoute('groups.addAll', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addAllUserToRoom', findResult.rid, this.bodyParams.activeUsersOnly);
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(findResult.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.addModerator', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addRoomModerator', findResult.rid, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.addOwner', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addRoomOwner', findResult.rid, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.addLeader', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('addRoomLeader', findResult.rid, user._id);
    });
    return RocketChat.API.v1.success();
  }

}); // Archives a private group only if it wasn't

RocketChat.API.v1.addRoute('groups.archive', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('archiveRoom', findResult.rid);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.close', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });

    if (!findResult.open) {
      return RocketChat.API.v1.failure(`The private group, ${findResult.name}, is already closed to the sender`);
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('hideRoom', findResult.rid);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.counters', {
  authRequired: true
}, {
  get() {
    const access = RocketChat.authz.hasPermission(this.userId, 'view-room-administration');
    const params = this.requestParams();
    let user = this.userId;
    let room;
    let unreads = null;
    let userMentions = null;
    let unreadsFrom = null;
    let joined = false;
    let msgs = null;
    let latest = null;
    let members = null;

    if ((!params.roomId || !params.roomId.trim()) && (!params.roomName || !params.roomName.trim())) {
      throw new Meteor.Error('error-room-param-not-provided', 'The parameter "roomId" or "roomName" is required');
    }

    if (params.roomId) {
      room = RocketChat.models.Rooms.findOneById(params.roomId);
    } else if (params.roomName) {
      room = RocketChat.models.Rooms.findOneByName(params.roomName);
    }

    if (!room || room.t !== 'p') {
      throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "roomName" param provided does not match any group');
    }

    if (room.archived) {
      throw new Meteor.Error('error-room-archived', `The private group, ${room.name}, is archived`);
    }

    if (params.userId) {
      if (!access) {
        return RocketChat.API.v1.unauthorized();
      }

      user = params.userId;
    }

    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, user);
    const lm = room.lm ? room.lm : room._updatedAt;

    if (typeof subscription !== 'undefined' && subscription.open) {
      if (subscription.ls) {
        unreads = RocketChat.models.Messages.countVisibleByRoomIdBetweenTimestampsInclusive(subscription.rid, subscription.ls, lm);
        unreadsFrom = subscription.ls;
      }

      userMentions = subscription.userMentions;
      joined = true;
    }

    if (access || joined) {
      msgs = room.msgs;
      latest = lm;
      members = room.usersCount;
    }

    return RocketChat.API.v1.success({
      joined,
      members,
      unreads,
      unreadsFrom,
      msgs,
      latest,
      userMentions
    });
  }

}); // Create Private Group

RocketChat.API.v1.addRoute('groups.create', {
  authRequired: true
}, {
  post() {
    if (!RocketChat.authz.hasPermission(this.userId, 'create-p')) {
      return RocketChat.API.v1.unauthorized();
    }

    if (!this.bodyParams.name) {
      return RocketChat.API.v1.failure('Body param "name" is required');
    }

    if (this.bodyParams.members && !_.isArray(this.bodyParams.members)) {
      return RocketChat.API.v1.failure('Body param "members" must be an array if provided');
    }

    if (this.bodyParams.customFields && !(typeof this.bodyParams.customFields === 'object')) {
      return RocketChat.API.v1.failure('Body param "customFields" must be an object if provided');
    }

    const readOnly = typeof this.bodyParams.readOnly !== 'undefined' ? this.bodyParams.readOnly : false;
    let id;
    Meteor.runAsUser(this.userId, () => {
      id = Meteor.call('createPrivateGroup', this.bodyParams.name, this.bodyParams.members ? this.bodyParams.members : [], readOnly, this.bodyParams.customFields);
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(id.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.delete', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('eraseRoom', findResult.rid);
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(findResult.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.files', {
  authRequired: true
}, {
  get() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });

    const addUserObjectToEveryObject = file => {
      if (file.userId) {
        file = this.insertUserObject({
          object: file,
          userId: file.userId
        });
      }

      return file;
    };

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      rid: findResult.rid
    });
    const files = RocketChat.models.Uploads.find(ourQuery, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      files: files.map(addUserObjectToEveryObject),
      count: files.length,
      offset,
      total: RocketChat.models.Uploads.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('groups.getIntegrations', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-integrations')) {
      return RocketChat.API.v1.unauthorized();
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });
    let includeAllPrivateGroups = true;

    if (typeof this.queryParams.includeAllPrivateGroups !== 'undefined') {
      includeAllPrivateGroups = this.queryParams.includeAllPrivateGroups === 'true';
    }

    const channelsToSearch = [`#${findResult.name}`];

    if (includeAllPrivateGroups) {
      channelsToSearch.push('all_private_groups');
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      channel: {
        $in: channelsToSearch
      }
    });
    const integrations = RocketChat.models.Integrations.find(ourQuery, {
      sort: sort ? sort : {
        _createdAt: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      integrations,
      count: integrations.length,
      offset,
      total: RocketChat.models.Integrations.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('groups.history', {
  authRequired: true
}, {
  get() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });
    let latestDate = new Date();

    if (this.queryParams.latest) {
      latestDate = new Date(this.queryParams.latest);
    }

    let oldestDate = undefined;

    if (this.queryParams.oldest) {
      oldestDate = new Date(this.queryParams.oldest);
    }

    const inclusive = this.queryParams.inclusive || false;
    let count = 20;

    if (this.queryParams.count) {
      count = parseInt(this.queryParams.count);
    }

    const unreads = this.queryParams.unreads || false;
    let result;
    Meteor.runAsUser(this.userId, () => {
      result = Meteor.call('getChannelHistory', {
        rid: findResult.rid,
        latest: latestDate,
        oldest: oldestDate,
        inclusive,
        count,
        unreads
      });
    });

    if (!result) {
      return RocketChat.API.v1.unauthorized();
    }

    return RocketChat.API.v1.success(result);
  }

});
RocketChat.API.v1.addRoute('groups.info', {
  authRequired: true
}, {
  get() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(findResult.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.invite', {
  authRequired: true
}, {
  post() {
    const {
      roomId = '',
      roomName = ''
    } = this.requestParams();
    const idOrName = roomId || roomName;

    if (!idOrName.trim()) {
      throw new Meteor.Error('error-room-param-not-provided', 'The parameter "roomId" or "roomName" is required');
    }

    const {
      _id: rid,
      t: type
    } = RocketChat.models.Rooms.findOneByIdOrName(idOrName) || {};

    if (!rid || type !== 'p') {
      throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "roomName" param provided does not match any group');
    }

    const {
      username
    } = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => Meteor.call('addUserToRoom', {
      rid,
      username
    }));
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.kick', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('removeUserFromRoom', {
        rid: findResult.rid,
        username: user.username
      });
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.leave', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('leaveRoom', findResult.rid);
    });
    return RocketChat.API.v1.success();
  }

}); // List Private Groups a user has access to

RocketChat.API.v1.addRoute('groups.list', {
  authRequired: true
}, {
  get() {
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields
    } = this.parseJsonQuery(); // TODO: CACHE: Add Breacking notice since we removed the query param

    const cursor = RocketChat.models.Rooms.findBySubscriptionTypeAndUserId('p', this.userId, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    });
    const totalCount = cursor.count();
    const rooms = cursor.fetch();
    return RocketChat.API.v1.success({
      groups: rooms,
      offset,
      count: rooms.length,
      total: totalCount
    });
  }

});
RocketChat.API.v1.addRoute('groups.listAll', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-room-administration')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      t: 'p'
    });
    let rooms = RocketChat.models.Rooms.find(ourQuery).fetch();
    const totalCount = rooms.length;
    rooms = RocketChat.models.Rooms.processQueryOptionsOnResult(rooms, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    });
    return RocketChat.API.v1.success({
      groups: rooms,
      offset,
      count: rooms.length,
      total: totalCount
    });
  }

});
RocketChat.API.v1.addRoute('groups.members', {
  authRequired: true
}, {
  get() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const room = RocketChat.models.Rooms.findOneById(findResult.rid, {
      fields: {
        broadcast: 1
      }
    });

    if (room.broadcast && !RocketChat.authz.hasPermission(this.userId, 'view-broadcast-member-list')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort = {}
    } = this.parseJsonQuery();
    const subscriptions = RocketChat.models.Subscriptions.findByRoomId(findResult.rid, {
      fields: {
        'u._id': 1
      },
      sort: {
        'u.username': sort.username != null ? sort.username : 1
      },
      skip: offset,
      limit: count
    });
    const total = subscriptions.count();
    const members = subscriptions.fetch().map(s => s.u && s.u._id);
    const users = RocketChat.models.Users.find({
      _id: {
        $in: members
      }
    }, {
      fields: {
        _id: 1,
        username: 1,
        name: 1,
        status: 1,
        utcOffset: 1
      },
      sort: {
        username: sort.username != null ? sort.username : 1
      }
    }).fetch();
    return RocketChat.API.v1.success({
      members: users,
      count: users.length,
      offset,
      total
    });
  }

});
RocketChat.API.v1.addRoute('groups.messages', {
  authRequired: true
}, {
  get() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      rid: findResult.rid
    });
    const messages = RocketChat.models.Messages.find(ourQuery, {
      sort: sort ? sort : {
        ts: -1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      messages,
      count: messages.length,
      offset,
      total: RocketChat.models.Messages.find(ourQuery).count()
    });
  }

}); // TODO: CACHE: same as channels.online

RocketChat.API.v1.addRoute('groups.online', {
  authRequired: true
}, {
  get() {
    const {
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      t: 'p'
    });
    const room = RocketChat.models.Rooms.findOne(ourQuery);

    if (room == null) {
      return RocketChat.API.v1.failure('Group does not exists');
    }

    const online = RocketChat.models.Users.findUsersNotOffline({
      fields: {
        username: 1
      }
    }).fetch();
    const onlineInRoom = [];
    online.forEach(user => {
      const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, user._id, {
        fields: {
          _id: 1
        }
      });

      if (subscription) {
        onlineInRoom.push({
          _id: user._id,
          username: user.username
        });
      }
    });
    return RocketChat.API.v1.success({
      online: onlineInRoom
    });
  }

});
RocketChat.API.v1.addRoute('groups.open', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });

    if (findResult.open) {
      return RocketChat.API.v1.failure(`The private group, ${findResult.name}, is already open for the sender`);
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('openRoom', findResult.rid);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.removeModerator', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('removeRoomModerator', findResult.rid, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.removeOwner', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('removeRoomOwner', findResult.rid, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.removeLeader', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('removeRoomLeader', findResult.rid, user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.rename', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.name || !this.bodyParams.name.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "name" is required');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: {
        roomId: this.bodyParams.roomId
      },
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'roomName', this.bodyParams.name);
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(findResult.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.setCustomFields', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.customFields || !(typeof this.bodyParams.customFields === 'object')) {
      return RocketChat.API.v1.failure('The bodyParam "customFields" is required with a type like object.');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'roomCustomFields', this.bodyParams.customFields);
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(findResult.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.setDescription', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.description || !this.bodyParams.description.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "description" is required');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'roomDescription', this.bodyParams.description);
    });
    return RocketChat.API.v1.success({
      description: this.bodyParams.description
    });
  }

});
RocketChat.API.v1.addRoute('groups.setPurpose', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.purpose || !this.bodyParams.purpose.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "purpose" is required');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'roomDescription', this.bodyParams.purpose);
    });
    return RocketChat.API.v1.success({
      purpose: this.bodyParams.purpose
    });
  }

});
RocketChat.API.v1.addRoute('groups.setReadOnly', {
  authRequired: true
}, {
  post() {
    if (typeof this.bodyParams.readOnly === 'undefined') {
      return RocketChat.API.v1.failure('The bodyParam "readOnly" is required');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });

    if (findResult.ro === this.bodyParams.readOnly) {
      return RocketChat.API.v1.failure('The private group read only setting is the same as what it would be changed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'readOnly', this.bodyParams.readOnly);
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(findResult.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.setTopic', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.topic || !this.bodyParams.topic.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "topic" is required');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'roomTopic', this.bodyParams.topic);
    });
    return RocketChat.API.v1.success({
      topic: this.bodyParams.topic
    });
  }

});
RocketChat.API.v1.addRoute('groups.setType', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.type || !this.bodyParams.type.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "type" is required');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });

    if (findResult.t === this.bodyParams.type) {
      return RocketChat.API.v1.failure('The private group type is the same as what it would be changed to.');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'roomType', this.bodyParams.type);
    });
    return RocketChat.API.v1.success({
      group: RocketChat.models.Rooms.findOneById(findResult.rid, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('groups.setAnnouncement', {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.announcement || !this.bodyParams.announcement.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "announcement" is required');
    }

    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.rid, 'roomAnnouncement', this.bodyParams.announcement);
    });
    return RocketChat.API.v1.success({
      announcement: this.bodyParams.announcement
    });
  }

});
RocketChat.API.v1.addRoute('groups.unarchive', {
  authRequired: true
}, {
  post() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId,
      checkedArchived: false
    });
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('unarchiveRoom', findResult.rid);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('groups.roles', {
  authRequired: true
}, {
  get() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const roles = Meteor.runAsUser(this.userId, () => Meteor.call('getRoomRoles', findResult.rid));
    return RocketChat.API.v1.success({
      roles
    });
  }

});
RocketChat.API.v1.addRoute('groups.moderators', {
  authRequired: true
}, {
  get() {
    const findResult = findPrivateGroupByIdOrName({
      params: this.requestParams(),
      userId: this.userId
    });
    const moderators = RocketChat.models.Subscriptions.findByRoomIdAndRoles(findResult.rid, ['moderator'], {
      fields: {
        u: 1
      }
    }).fetch().map(sub => sub.u);
    return RocketChat.API.v1.success({
      moderators
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"im.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/im.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
function findDirectMessageRoom(params, user) {
  if ((!params.roomId || !params.roomId.trim()) && (!params.username || !params.username.trim())) {
    throw new Meteor.Error('error-room-param-not-provided', 'Body param "roomId" or "username" is required');
  }

  const room = RocketChat.getRoomByNameOrIdWithOptionToJoin({
    currentUserId: user._id,
    nameOrId: params.username || params.roomId,
    type: 'd'
  });

  if (!room || room.t !== 'd') {
    throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "username" param provided does not match any dirct message');
  }

  const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, user._id);
  return {
    room,
    subscription
  };
}

RocketChat.API.v1.addRoute(['dm.create', 'im.create'], {
  authRequired: true
}, {
  post() {
    const findResult = findDirectMessageRoom(this.requestParams(), this.user);
    return RocketChat.API.v1.success({
      room: findResult.room
    });
  }

});
RocketChat.API.v1.addRoute(['dm.close', 'im.close'], {
  authRequired: true
}, {
  post() {
    const findResult = findDirectMessageRoom(this.requestParams(), this.user);

    if (!findResult.subscription.open) {
      return RocketChat.API.v1.failure(`The direct message room, ${this.bodyParams.name}, is already closed to the sender`);
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('hideRoom', findResult.room._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute(['dm.counters', 'im.counters'], {
  authRequired: true
}, {
  get() {
    const access = RocketChat.authz.hasPermission(this.userId, 'view-room-administration');
    const ruserId = this.requestParams().userId;
    let user = this.userId;
    let unreads = null;
    let userMentions = null;
    let unreadsFrom = null;
    let joined = false;
    let msgs = null;
    let latest = null;
    let members = null;
    let lm = null;

    if (ruserId) {
      if (!access) {
        return RocketChat.API.v1.unauthorized();
      }

      user = ruserId;
    }

    const rs = findDirectMessageRoom(this.requestParams(), {
      _id: user
    });
    const {
      room
    } = rs;
    const dm = rs.subscription;
    lm = room.lm ? room.lm : room._updatedAt;

    if (typeof dm !== 'undefined' && dm.open) {
      if (dm.ls && room.msgs) {
        unreads = dm.unread;
        unreadsFrom = dm.ls;
      }

      userMentions = dm.userMentions;
      joined = true;
    }

    if (access || joined) {
      msgs = room.msgs;
      latest = lm;
      members = room.usersCount;
    }

    return RocketChat.API.v1.success({
      joined,
      members,
      unreads,
      unreadsFrom,
      msgs,
      latest,
      userMentions
    });
  }

});
RocketChat.API.v1.addRoute(['dm.files', 'im.files'], {
  authRequired: true
}, {
  get() {
    const findResult = findDirectMessageRoom(this.requestParams(), this.user);

    const addUserObjectToEveryObject = file => {
      if (file.userId) {
        file = this.insertUserObject({
          object: file,
          userId: file.userId
        });
      }

      return file;
    };

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      rid: findResult.room._id
    });
    const files = RocketChat.models.Uploads.find(ourQuery, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      files: files.map(addUserObjectToEveryObject),
      count: files.length,
      offset,
      total: RocketChat.models.Uploads.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute(['dm.history', 'im.history'], {
  authRequired: true
}, {
  get() {
    const findResult = findDirectMessageRoom(this.requestParams(), this.user);
    let latestDate = new Date();

    if (this.queryParams.latest) {
      latestDate = new Date(this.queryParams.latest);
    }

    let oldestDate = undefined;

    if (this.queryParams.oldest) {
      oldestDate = new Date(this.queryParams.oldest);
    }

    const inclusive = this.queryParams.inclusive || false;
    let count = 20;

    if (this.queryParams.count) {
      count = parseInt(this.queryParams.count);
    }

    const unreads = this.queryParams.unreads || false;
    let result;
    Meteor.runAsUser(this.userId, () => {
      result = Meteor.call('getChannelHistory', {
        rid: findResult.room._id,
        latest: latestDate,
        oldest: oldestDate,
        inclusive,
        count,
        unreads
      });
    });

    if (!result) {
      return RocketChat.API.v1.unauthorized();
    }

    return RocketChat.API.v1.success(result);
  }

});
RocketChat.API.v1.addRoute(['dm.members', 'im.members'], {
  authRequired: true
}, {
  get() {
    const findResult = findDirectMessageRoom(this.requestParams(), this.user);
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort
    } = this.parseJsonQuery();
    const cursor = RocketChat.models.Subscriptions.findByRoomId(findResult.room._id, {
      sort: {
        'u.username': sort && sort.username ? sort.username : 1
      },
      skip: offset,
      limit: count
    });
    const total = cursor.count();
    const members = cursor.fetch().map(s => s.u && s.u.username);
    const users = RocketChat.models.Users.find({
      username: {
        $in: members
      }
    }, {
      fields: {
        _id: 1,
        username: 1,
        name: 1,
        status: 1,
        utcOffset: 1
      },
      sort: {
        username: sort && sort.username ? sort.username : 1
      }
    }).fetch();
    return RocketChat.API.v1.success({
      members: users,
      count: members.length,
      offset,
      total
    });
  }

});
RocketChat.API.v1.addRoute(['dm.messages', 'im.messages'], {
  authRequired: true
}, {
  get() {
    const findResult = findDirectMessageRoom(this.requestParams(), this.user);
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      rid: findResult.room._id
    });
    const messages = RocketChat.models.Messages.find(ourQuery, {
      sort: sort ? sort : {
        ts: -1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      messages,
      count: messages.length,
      offset,
      total: RocketChat.models.Messages.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute(['dm.messages.others', 'im.messages.others'], {
  authRequired: true
}, {
  get() {
    if (RocketChat.settings.get('API_Enable_Direct_Message_History_EndPoint') !== true) {
      throw new Meteor.Error('error-endpoint-disabled', 'This endpoint is disabled', {
        route: '/api/v1/im.messages.others'
      });
    }

    if (!RocketChat.authz.hasPermission(this.userId, 'view-room-administration')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      roomId
    } = this.queryParams;

    if (!roomId || !roomId.trim()) {
      throw new Meteor.Error('error-roomid-param-not-provided', 'The parameter "roomId" is required');
    }

    const room = RocketChat.models.Rooms.findOneById(roomId);

    if (!room || room.t !== 'd') {
      throw new Meteor.Error('error-room-not-found', `No direct message room found by the id of: ${roomId}`);
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      rid: room._id
    });
    const msgs = RocketChat.models.Messages.find(ourQuery, {
      sort: sort ? sort : {
        ts: -1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      messages: msgs,
      offset,
      count: msgs.length,
      total: RocketChat.models.Messages.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute(['dm.list', 'im.list'], {
  authRequired: true
}, {
  get() {
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort = {
        name: 1
      },
      fields
    } = this.parseJsonQuery(); // TODO: CACHE: Add Breacking notice since we removed the query param

    const cursor = RocketChat.models.Rooms.findBySubscriptionTypeAndUserId('d', this.userId, {
      sort,
      skip: offset,
      limit: count,
      fields
    });
    const total = cursor.count();
    const rooms = cursor.fetch();
    return RocketChat.API.v1.success({
      ims: rooms,
      offset,
      count: rooms.length,
      total
    });
  }

});
RocketChat.API.v1.addRoute(['dm.list.everyone', 'im.list.everyone'], {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-room-administration')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      t: 'd'
    });
    const rooms = RocketChat.models.Rooms.find(ourQuery, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      ims: rooms,
      offset,
      count: rooms.length,
      total: RocketChat.models.Rooms.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute(['dm.open', 'im.open'], {
  authRequired: true
}, {
  post() {
    const findResult = findDirectMessageRoom(this.requestParams(), this.user);

    if (!findResult.subscription.open) {
      Meteor.runAsUser(this.userId, () => {
        Meteor.call('openRoom', findResult.room._id);
      });
    }

    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute(['dm.setTopic', 'im.setTopic'], {
  authRequired: true
}, {
  post() {
    if (!this.bodyParams.topic || !this.bodyParams.topic.trim()) {
      return RocketChat.API.v1.failure('The bodyParam "topic" is required');
    }

    const findResult = findDirectMessageRoom(this.requestParams(), this.user);
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('saveRoomSettings', findResult.room._id, 'roomTopic', this.bodyParams.topic);
    });
    return RocketChat.API.v1.success({
      topic: this.bodyParams.topic
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"integrations.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/integrations.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('integrations.create', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, Match.ObjectIncluding({
      type: String,
      name: String,
      enabled: Boolean,
      username: String,
      urls: Match.Maybe([String]),
      channel: String,
      event: Match.Maybe(String),
      triggerWords: Match.Maybe([String]),
      alias: Match.Maybe(String),
      avatar: Match.Maybe(String),
      emoji: Match.Maybe(String),
      token: Match.Maybe(String),
      scriptEnabled: Boolean,
      script: Match.Maybe(String),
      targetChannel: Match.Maybe(String)
    }));
    let integration;

    switch (this.bodyParams.type) {
      case 'webhook-outgoing':
        Meteor.runAsUser(this.userId, () => {
          integration = Meteor.call('addOutgoingIntegration', this.bodyParams);
        });
        break;

      case 'webhook-incoming':
        Meteor.runAsUser(this.userId, () => {
          integration = Meteor.call('addIncomingIntegration', this.bodyParams);
        });
        break;

      default:
        return RocketChat.API.v1.failure('Invalid integration type.');
    }

    return RocketChat.API.v1.success({
      integration
    });
  }

});
RocketChat.API.v1.addRoute('integrations.history', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-integrations')) {
      return RocketChat.API.v1.unauthorized();
    }

    if (!this.queryParams.id || this.queryParams.id.trim() === '') {
      return RocketChat.API.v1.failure('Invalid integration id.');
    }

    const {
      id
    } = this.queryParams;
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query, {
      'integration._id': id
    });
    const history = RocketChat.models.IntegrationHistory.find(ourQuery, {
      sort: sort ? sort : {
        _updatedAt: -1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      history,
      offset,
      items: history.length,
      total: RocketChat.models.IntegrationHistory.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('integrations.list', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-integrations')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const ourQuery = Object.assign({}, query);
    const integrations = RocketChat.models.Integrations.find(ourQuery, {
      sort: sort ? sort : {
        ts: -1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      integrations,
      offset,
      items: integrations.length,
      total: RocketChat.models.Integrations.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('integrations.remove', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, Match.ObjectIncluding({
      type: String,
      target_url: Match.Maybe(String),
      integrationId: Match.Maybe(String)
    }));

    if (!this.bodyParams.target_url && !this.bodyParams.integrationId) {
      return RocketChat.API.v1.failure('An integrationId or target_url needs to be provided.');
    }

    let integration;

    switch (this.bodyParams.type) {
      case 'webhook-outgoing':
        if (this.bodyParams.target_url) {
          integration = RocketChat.models.Integrations.findOne({
            urls: this.bodyParams.target_url
          });
        } else if (this.bodyParams.integrationId) {
          integration = RocketChat.models.Integrations.findOne({
            _id: this.bodyParams.integrationId
          });
        }

        if (!integration) {
          return RocketChat.API.v1.failure('No integration found.');
        }

        Meteor.runAsUser(this.userId, () => {
          Meteor.call('deleteOutgoingIntegration', integration._id);
        });
        return RocketChat.API.v1.success({
          integration
        });

      case 'webhook-incoming':
        integration = RocketChat.models.Integrations.findOne({
          _id: this.bodyParams.integrationId
        });

        if (!integration) {
          return RocketChat.API.v1.failure('No integration found.');
        }

        Meteor.runAsUser(this.userId, () => {
          Meteor.call('deleteIncomingIntegration', integration._id);
        });
        return RocketChat.API.v1.success({
          integration
        });

      default:
        return RocketChat.API.v1.failure('Invalid integration type.');
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"misc.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/misc.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('info', {
  authRequired: false
}, {
  get() {
    const user = this.getLoggedInUser();

    if (user && RocketChat.authz.hasRole(user._id, 'admin')) {
      return RocketChat.API.v1.success({
        info: RocketChat.Info
      });
    }

    return RocketChat.API.v1.success({
      info: {
        version: RocketChat.Info.version
      }
    });
  }

});
RocketChat.API.v1.addRoute('me', {
  authRequired: true
}, {
  get() {
    return RocketChat.API.v1.success(this.getUserInfo(RocketChat.models.Users.findOneById(this.userId)));
  }

});
let onlineCache = 0;
let onlineCacheDate = 0;
const cacheInvalid = 60000; // 1 minute

RocketChat.API.v1.addRoute('shield.svg', {
  authRequired: false
}, {
  get() {
    const {
      type,
      channel,
      name,
      icon
    } = this.queryParams;

    if (!RocketChat.settings.get('API_Enable_Shields')) {
      throw new Meteor.Error('error-endpoint-disabled', 'This endpoint is disabled', {
        route: '/api/v1/shield.svg'
      });
    }

    const types = RocketChat.settings.get('API_Shield_Types');

    if (type && types !== '*' && !types.split(',').map(t => t.trim()).includes(type)) {
      throw new Meteor.Error('error-shield-disabled', 'This shield type is disabled', {
        route: '/api/v1/shield.svg'
      });
    }

    const hideIcon = icon === 'false';

    if (hideIcon && (!name || !name.trim())) {
      return RocketChat.API.v1.failure('Name cannot be empty when icon is hidden');
    }

    let text;
    let backgroundColor = '#4c1';

    switch (type) {
      case 'online':
        if (Date.now() - onlineCacheDate > cacheInvalid) {
          onlineCache = RocketChat.models.Users.findUsersNotOffline().count();
          onlineCacheDate = Date.now();
        }

        text = `${onlineCache} ${TAPi18n.__('Online')}`;
        break;

      case 'channel':
        if (!channel) {
          return RocketChat.API.v1.failure('Shield channel is required for type "channel"');
        }

        text = `#${channel}`;
        break;

      case 'user':
        const user = this.getUserFromParams(); // Respect the server's choice for using their real names or not

        if (user.name && RocketChat.settings.get('UI_Use_Real_Name')) {
          text = `${user.name}`;
        } else {
          text = `@${user.username}`;
        }

        switch (user.status) {
          case 'online':
            backgroundColor = '#1fb31f';
            break;

          case 'away':
            backgroundColor = '#dc9b01';
            break;

          case 'busy':
            backgroundColor = '#bc2031';
            break;

          case 'offline':
            backgroundColor = '#a5a1a1';
        }

        break;

      default:
        text = TAPi18n.__('Join_Chat').toUpperCase();
    }

    const iconSize = hideIcon ? 7 : 24;
    const leftSize = name ? name.length * 6 + 7 + iconSize : iconSize;
    const rightSize = text.length * 6 + 20;
    const width = leftSize + rightSize;
    const height = 20;
    return {
      headers: {
        'Content-Type': 'image/svg+xml;charset=utf-8'
      },
      body: `
				<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}">
				  <linearGradient id="b" x2="0" y2="100%">
				    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
				    <stop offset="1" stop-opacity=".1"/>
				  </linearGradient>
				  <mask id="a">
				    <rect width="${width}" height="${height}" rx="3" fill="#fff"/>
				  </mask>
				  <g mask="url(#a)">
				    <path fill="#555" d="M0 0h${leftSize}v${height}H0z"/>
				    <path fill="${backgroundColor}" d="M${leftSize} 0h${rightSize}v${height}H${leftSize}z"/>
				    <path fill="url(#b)" d="M0 0h${width}v${height}H0z"/>
				  </g>
				    ${hideIcon ? '' : '<image x="5" y="3" width="14" height="14" xlink:href="/assets/favicon.svg"/>'}
				  <g fill="#fff" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
						${name ? `<text x="${iconSize}" y="15" fill="#010101" fill-opacity=".3">${name}</text>
				    <text x="${iconSize}" y="14">${name}</text>` : ''}
				    <text x="${leftSize + 7}" y="15" fill="#010101" fill-opacity=".3">${text}</text>
				    <text x="${leftSize + 7}" y="14">${text}</text>
				  </g>
				</svg>
			`.trim().replace(/\>[\s]+\</gm, '><')
    };
  }

});
RocketChat.API.v1.addRoute('spotlight', {
  authRequired: true
}, {
  get() {
    check(this.queryParams, {
      query: String
    });
    const {
      query
    } = this.queryParams;
    const result = Meteor.runAsUser(this.userId, () => Meteor.call('spotlight', query));
    return RocketChat.API.v1.success(result);
  }

});
RocketChat.API.v1.addRoute('directory', {
  authRequired: true
}, {
  get() {
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      query
    } = this.parseJsonQuery();
    const {
      text,
      type
    } = query;

    if (sort && Object.keys(sort).length > 1) {
      return RocketChat.API.v1.failure('This method support only one "sort" parameter');
    }

    const sortBy = sort ? Object.keys(sort)[0] : undefined;
    const sortDirection = sort && Object.values(sort)[0] === 1 ? 'asc' : 'desc';
    const result = Meteor.runAsUser(this.userId, () => Meteor.call('browseChannels', {
      text,
      type,
      sortBy,
      sortDirection,
      offset: Math.max(0, offset),
      limit: Math.max(0, count)
    }));

    if (!result) {
      return RocketChat.API.v1.failure('Please verify the parameters');
    }

    return RocketChat.API.v1.success({
      result: result.results,
      count: result.results.length,
      offset,
      total: result.total
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"permissions.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/permissions.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
	This API returns all permissions that exists
	on the server, with respective roles.

	Method: GET
	Route: api/v1/permissions
 */
RocketChat.API.v1.addRoute('permissions', {
  authRequired: true
}, {
  get() {
    const warningMessage = 'The endpoint "permissions" is deprecated and will be removed after version v0.69';
    console.warn(warningMessage);
    const result = Meteor.runAsUser(this.userId, () => Meteor.call('permissions/get'));
    return RocketChat.API.v1.success(result);
  }

});
RocketChat.API.v1.addRoute('permissions.list', {
  authRequired: true
}, {
  get() {
    const result = Meteor.runAsUser(this.userId, () => Meteor.call('permissions/get'));
    return RocketChat.API.v1.success({
      permissions: result
    });
  }

});
RocketChat.API.v1.addRoute('permissions.update', {
  authRequired: true
}, {
  post() {
    if (!RocketChat.authz.hasPermission(this.userId, 'access-permissions')) {
      return RocketChat.API.v1.failure('Editing permissions is not allowed', 'error-edit-permissions-not-allowed');
    }

    check(this.bodyParams, {
      permissions: [Match.ObjectIncluding({
        _id: String,
        roles: [String]
      })]
    });
    let permissionNotFound = false;
    let roleNotFound = false;
    Object.keys(this.bodyParams.permissions).forEach(key => {
      const element = this.bodyParams.permissions[key];

      if (!RocketChat.models.Permissions.findOneById(element._id)) {
        permissionNotFound = true;
      }

      Object.keys(element.roles).forEach(key => {
        const subelement = element.roles[key];

        if (!RocketChat.models.Roles.findOneById(subelement)) {
          roleNotFound = true;
        }
      });
    });

    if (permissionNotFound) {
      return RocketChat.API.v1.failure('Invalid permission', 'error-invalid-permission');
    } else if (roleNotFound) {
      return RocketChat.API.v1.failure('Invalid role', 'error-invalid-role');
    }

    Object.keys(this.bodyParams.permissions).forEach(key => {
      const element = this.bodyParams.permissions[key];
      RocketChat.models.Permissions.createOrUpdate(element._id, element.roles);
    });
    const result = Meteor.runAsUser(this.userId, () => Meteor.call('permissions/get'));
    return RocketChat.API.v1.success({
      permissions: result
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"push.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/push.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals Push */
RocketChat.API.v1.addRoute('push.token', {
  authRequired: true
}, {
  post() {
    const {
      type,
      value,
      appName
    } = this.bodyParams;
    let {
      id
    } = this.bodyParams;

    if (id && typeof id !== 'string') {
      throw new Meteor.Error('error-id-param-not-valid', 'The required "id" body param is invalid.');
    } else {
      id = Random.id();
    }

    if (!type || type !== 'apn' && type !== 'gcm') {
      throw new Meteor.Error('error-type-param-not-valid', 'The required "type" body param is missing or invalid.');
    }

    if (!value || typeof value !== 'string') {
      throw new Meteor.Error('error-token-param-not-valid', 'The required "value" body param is missing or invalid.');
    }

    if (!appName || typeof appName !== 'string') {
      throw new Meteor.Error('error-appName-param-not-valid', 'The required "appName" body param is missing or invalid.');
    }

    let result;
    Meteor.runAsUser(this.userId, () => result = Meteor.call('raix:push-update', {
      id,
      token: {
        [type]: value
      },
      appName,
      userId: this.userId
    }));
    return RocketChat.API.v1.success({
      result
    });
  },

  delete() {
    const {
      token
    } = this.bodyParams;

    if (!token || typeof token !== 'string') {
      throw new Meteor.Error('error-token-param-not-valid', 'The required "token" body param is missing or invalid.');
    }

    const affectedRecords = Push.appCollection.remove({
      $or: [{
        'token.apn': token
      }, {
        'token.gcm': token
      }],
      userId: this.userId
    });

    if (affectedRecords === 0) {
      return RocketChat.API.v1.notFound();
    }

    return RocketChat.API.v1.success();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/settings.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
// settings endpoints
RocketChat.API.v1.addRoute('settings.public', {
  authRequired: false
}, {
  get() {
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    let ourQuery = {
      hidden: {
        $ne: true
      },
      public: true
    };
    ourQuery = Object.assign({}, query, ourQuery);
    const settings = RocketChat.models.Settings.find(ourQuery, {
      sort: sort ? sort : {
        _id: 1
      },
      skip: offset,
      limit: count,
      fields: Object.assign({
        _id: 1,
        value: 1
      }, fields)
    }).fetch();
    return RocketChat.API.v1.success({
      settings,
      count: settings.length,
      offset,
      total: RocketChat.models.Settings.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('settings.oauth', {
  authRequired: false
}, {
  get() {
    const mountOAuthServices = () => {
      const oAuthServicesEnabled = ServiceConfiguration.configurations.find({}, {
        fields: {
          secret: 0
        }
      }).fetch();
      return oAuthServicesEnabled.map(service => {
        if (service.custom || ['saml', 'cas', 'wordpress'].includes(service.service)) {
          return (0, _objectSpread2.default)({}, service);
        }

        return {
          _id: service._id,
          name: service.service,
          clientId: service.appId || service.clientId || service.consumerKey,
          buttonLabelText: service.buttonLabelText || '',
          buttonColor: service.buttonColor || '',
          buttonLabelColor: service.buttonLabelColor || '',
          custom: false
        };
      });
    };

    return RocketChat.API.v1.success({
      services: mountOAuthServices()
    });
  }

});
RocketChat.API.v1.addRoute('settings', {
  authRequired: true
}, {
  get() {
    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    let ourQuery = {
      hidden: {
        $ne: true
      }
    };

    if (!RocketChat.authz.hasPermission(this.userId, 'view-privileged-setting')) {
      ourQuery.public = true;
    }

    ourQuery = Object.assign({}, query, ourQuery);
    const settings = RocketChat.models.Settings.find(ourQuery, {
      sort: sort ? sort : {
        _id: 1
      },
      skip: offset,
      limit: count,
      fields: Object.assign({
        _id: 1,
        value: 1
      }, fields)
    }).fetch();
    return RocketChat.API.v1.success({
      settings,
      count: settings.length,
      offset,
      total: RocketChat.models.Settings.find(ourQuery).count()
    });
  }

});
RocketChat.API.v1.addRoute('settings/:_id', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-privileged-setting')) {
      return RocketChat.API.v1.unauthorized();
    }

    return RocketChat.API.v1.success(_.pick(RocketChat.models.Settings.findOneNotHiddenById(this.urlParams._id), '_id', 'value'));
  },

  post() {
    if (!RocketChat.authz.hasPermission(this.userId, 'edit-privileged-setting')) {
      return RocketChat.API.v1.unauthorized();
    } // allow special handling of particular setting types


    const setting = RocketChat.models.Settings.findOneNotHiddenById(this.urlParams._id);

    if (setting.type === 'action' && this.bodyParams && this.bodyParams.execute) {
      // execute the configured method
      Meteor.call(setting.value);
      return RocketChat.API.v1.success();
    }

    if (setting.type === 'color' && this.bodyParams && this.bodyParams.editor && this.bodyParams.value) {
      RocketChat.models.Settings.updateOptionsById(this.urlParams._id, {
        editor: this.bodyParams.editor
      });
      RocketChat.models.Settings.updateValueNotHiddenById(this.urlParams._id, this.bodyParams.value);
      return RocketChat.API.v1.success();
    }

    check(this.bodyParams, {
      value: Match.Any
    });

    if (RocketChat.models.Settings.updateValueNotHiddenById(this.urlParams._id, this.bodyParams.value)) {
      return RocketChat.API.v1.success();
    }

    return RocketChat.API.v1.failure();
  }

});
RocketChat.API.v1.addRoute('service.configurations', {
  authRequired: false
}, {
  get() {
    const {
      ServiceConfiguration
    } = Package['service-configuration'];
    return RocketChat.API.v1.success({
      configurations: ServiceConfiguration.configurations.find({}, {
        fields: {
          secret: 0
        }
      }).fetch()
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"stats.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/stats.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('statistics', {
  authRequired: true
}, {
  get() {
    let refresh = false;

    if (typeof this.queryParams.refresh !== 'undefined' && this.queryParams.refresh === 'true') {
      refresh = true;
    }

    let stats;
    Meteor.runAsUser(this.userId, () => {
      stats = Meteor.call('getStatistics', refresh);
    });
    return RocketChat.API.v1.success({
      statistics: stats
    });
  }

});
RocketChat.API.v1.addRoute('statistics.list', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-statistics')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const statistics = RocketChat.models.Statistics.find(query, {
      sort: sort ? sort : {
        name: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      statistics,
      count: statistics.length,
      offset,
      total: RocketChat.models.Statistics.find(query).count()
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"users.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/users.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let Busboy;
module.watch(require("busboy"), {
  default(v) {
    Busboy = v;
  }

}, 1);
RocketChat.API.v1.addRoute('users.create', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, {
      email: String,
      name: String,
      password: String,
      username: String,
      active: Match.Maybe(Boolean),
      roles: Match.Maybe(Array),
      joinDefaultChannels: Match.Maybe(Boolean),
      requirePasswordChange: Match.Maybe(Boolean),
      sendWelcomeEmail: Match.Maybe(Boolean),
      verified: Match.Maybe(Boolean),
      customFields: Match.Maybe(Object)
    }); // New change made by pull request #5152

    if (typeof this.bodyParams.joinDefaultChannels === 'undefined') {
      this.bodyParams.joinDefaultChannels = true;
    }

    if (this.bodyParams.customFields) {
      RocketChat.validateCustomFields(this.bodyParams.customFields);
    }

    const newUserId = RocketChat.saveUser(this.userId, this.bodyParams);

    if (this.bodyParams.customFields) {
      RocketChat.saveCustomFieldsWithoutValidation(newUserId, this.bodyParams.customFields);
    }

    if (typeof this.bodyParams.active !== 'undefined') {
      Meteor.runAsUser(this.userId, () => {
        Meteor.call('setUserActiveStatus', newUserId, this.bodyParams.active);
      });
    }

    return RocketChat.API.v1.success({
      user: RocketChat.models.Users.findOneById(newUserId, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('users.delete', {
  authRequired: true
}, {
  post() {
    if (!RocketChat.authz.hasPermission(this.userId, 'delete-user')) {
      return RocketChat.API.v1.unauthorized();
    }

    const user = this.getUserFromParams();
    Meteor.runAsUser(this.userId, () => {
      Meteor.call('deleteUser', user._id);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('users.deleteOwnAccount', {
  authRequired: true
}, {
  post() {
    const {
      password
    } = this.bodyParams;

    if (!password) {
      return RocketChat.API.v1.failure('Body parameter "password" is required.');
    }

    if (!RocketChat.settings.get('Accounts_AllowDeleteOwnAccount')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed');
    }

    Meteor.runAsUser(this.userId, () => {
      Meteor.call('deleteUserOwnAccount', password);
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('users.getAvatar', {
  authRequired: false
}, {
  get() {
    const user = this.getUserFromParams();
    const url = RocketChat.getURL(`/avatar/${user.username}`, {
      cdn: false,
      full: true
    });
    this.response.setHeader('Location', url);
    return {
      statusCode: 307,
      body: url
    };
  }

});
RocketChat.API.v1.addRoute('users.getPresence', {
  authRequired: true
}, {
  get() {
    if (this.isUserFromParams()) {
      const user = RocketChat.models.Users.findOneById(this.userId);
      return RocketChat.API.v1.success({
        presence: user.status,
        connectionStatus: user.statusConnection,
        lastLogin: user.lastLogin
      });
    }

    const user = this.getUserFromParams();
    return RocketChat.API.v1.success({
      presence: user.status
    });
  }

});
RocketChat.API.v1.addRoute('users.info', {
  authRequired: true
}, {
  get() {
    const {
      username
    } = this.getUserFromParams();
    let result;
    Meteor.runAsUser(this.userId, () => {
      result = Meteor.call('getFullUserData', {
        username,
        limit: 1
      });
    });

    if (!result || result.length !== 1) {
      return RocketChat.API.v1.failure(`Failed to get the user data for the userId of "${username}".`);
    }

    return RocketChat.API.v1.success({
      user: result[0]
    });
  }

});
RocketChat.API.v1.addRoute('users.list', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-d-room')) {
      return RocketChat.API.v1.unauthorized();
    }

    const {
      offset,
      count
    } = this.getPaginationItems();
    const {
      sort,
      fields,
      query
    } = this.parseJsonQuery();
    const users = RocketChat.models.Users.find(query, {
      sort: sort ? sort : {
        username: 1
      },
      skip: offset,
      limit: count,
      fields
    }).fetch();
    return RocketChat.API.v1.success({
      users,
      count: users.length,
      offset,
      total: RocketChat.models.Users.find(query).count()
    });
  }

});
RocketChat.API.v1.addRoute('users.register', {
  authRequired: false
}, {
  post() {
    if (this.userId) {
      return RocketChat.API.v1.failure('Logged in users can not register again.');
    } // We set their username here, so require it
    // The `registerUser` checks for the other requirements


    check(this.bodyParams, Match.ObjectIncluding({
      username: String
    })); // Register the user

    const userId = Meteor.call('registerUser', this.bodyParams); // Now set their username

    Meteor.runAsUser(userId, () => Meteor.call('setUsername', this.bodyParams.username));
    return RocketChat.API.v1.success({
      user: RocketChat.models.Users.findOneById(userId, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('users.resetAvatar', {
  authRequired: true
}, {
  post() {
    const user = this.getUserFromParams();

    if (user._id === this.userId) {
      Meteor.runAsUser(this.userId, () => Meteor.call('resetAvatar'));
    } else if (RocketChat.authz.hasPermission(this.userId, 'edit-other-user-info')) {
      Meteor.runAsUser(user._id, () => Meteor.call('resetAvatar'));
    } else {
      return RocketChat.API.v1.unauthorized();
    }

    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('users.setAvatar', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, Match.ObjectIncluding({
      avatarUrl: Match.Maybe(String),
      userId: Match.Maybe(String),
      username: Match.Maybe(String)
    }));

    if (!RocketChat.settings.get('Accounts_AllowUserAvatarChange')) {
      throw new Meteor.Error('error-not-allowed', 'Change avatar is not allowed', {
        method: 'users.setAvatar'
      });
    }

    let user;

    if (this.isUserFromParams()) {
      user = Meteor.users.findOne(this.userId);
    } else if (RocketChat.authz.hasPermission(this.userId, 'edit-other-user-info')) {
      user = this.getUserFromParams();
    } else {
      return RocketChat.API.v1.unauthorized();
    }

    Meteor.runAsUser(user._id, () => {
      if (this.bodyParams.avatarUrl) {
        RocketChat.setUserAvatar(user, this.bodyParams.avatarUrl, '', 'url');
      } else {
        const busboy = new Busboy({
          headers: this.request.headers
        });
        Meteor.wrapAsync(callback => {
          busboy.on('file', Meteor.bindEnvironment((fieldname, file, filename, encoding, mimetype) => {
            if (fieldname !== 'image') {
              return callback(new Meteor.Error('invalid-field'));
            }

            const imageData = [];
            file.on('data', Meteor.bindEnvironment(data => {
              imageData.push(data);
            }));
            file.on('end', Meteor.bindEnvironment(() => {
              RocketChat.setUserAvatar(user, Buffer.concat(imageData), mimetype, 'rest');
              callback();
            }));
          }));
          this.request.pipe(busboy);
        })();
      }
    });
    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('users.update', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, {
      userId: String,
      data: Match.ObjectIncluding({
        email: Match.Maybe(String),
        name: Match.Maybe(String),
        password: Match.Maybe(String),
        username: Match.Maybe(String),
        active: Match.Maybe(Boolean),
        roles: Match.Maybe(Array),
        joinDefaultChannels: Match.Maybe(Boolean),
        requirePasswordChange: Match.Maybe(Boolean),
        sendWelcomeEmail: Match.Maybe(Boolean),
        verified: Match.Maybe(Boolean),
        customFields: Match.Maybe(Object)
      })
    });

    const userData = _.extend({
      _id: this.bodyParams.userId
    }, this.bodyParams.data);

    Meteor.runAsUser(this.userId, () => RocketChat.saveUser(this.userId, userData));

    if (this.bodyParams.data.customFields) {
      RocketChat.saveCustomFields(this.bodyParams.userId, this.bodyParams.data.customFields);
    }

    if (typeof this.bodyParams.data.active !== 'undefined') {
      Meteor.runAsUser(this.userId, () => {
        Meteor.call('setUserActiveStatus', this.bodyParams.userId, this.bodyParams.data.active);
      });
    }

    return RocketChat.API.v1.success({
      user: RocketChat.models.Users.findOneById(this.bodyParams.userId, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('users.updateOwnBasicInfo', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, {
      data: Match.ObjectIncluding({
        email: Match.Maybe(String),
        name: Match.Maybe(String),
        username: Match.Maybe(String),
        currentPassword: Match.Maybe(String),
        newPassword: Match.Maybe(String)
      }),
      customFields: Match.Maybe(Object)
    });
    const userData = {
      email: this.bodyParams.data.email,
      realname: this.bodyParams.data.name,
      username: this.bodyParams.data.username,
      newPassword: this.bodyParams.data.newPassword,
      typedPassword: this.bodyParams.data.currentPassword
    };
    Meteor.runAsUser(this.userId, () => Meteor.call('saveUserProfile', userData, this.bodyParams.customFields));
    return RocketChat.API.v1.success({
      user: RocketChat.models.Users.findOneById(this.userId, {
        fields: RocketChat.API.v1.defaultFieldsToExclude
      })
    });
  }

});
RocketChat.API.v1.addRoute('users.createToken', {
  authRequired: true
}, {
  post() {
    const user = this.getUserFromParams();
    let data;
    Meteor.runAsUser(this.userId, () => {
      data = Meteor.call('createToken', user._id);
    });
    return data ? RocketChat.API.v1.success({
      data
    }) : RocketChat.API.v1.unauthorized();
  }

});
RocketChat.API.v1.addRoute('users.getPreferences', {
  authRequired: true
}, {
  get() {
    const user = RocketChat.models.Users.findOneById(this.userId);

    if (user.settings) {
      const {
        preferences
      } = user.settings;
      preferences.language = user.language;
      return RocketChat.API.v1.success({
        preferences
      });
    } else {
      return RocketChat.API.v1.failure(TAPi18n.__('Accounts_Default_User_Preferences_not_available').toUpperCase());
    }
  }

});
RocketChat.API.v1.addRoute('users.setPreferences', {
  authRequired: true
}, {
  post() {
    check(this.bodyParams, {
      userId: Match.Maybe(String),
      data: Match.ObjectIncluding({
        newRoomNotification: Match.Maybe(String),
        newMessageNotification: Match.Maybe(String),
        clockMode: Match.Maybe(Number),
        useEmojis: Match.Maybe(Boolean),
        convertAsciiEmoji: Match.Maybe(Boolean),
        saveMobileBandwidth: Match.Maybe(Boolean),
        collapseMediaByDefault: Match.Maybe(Boolean),
        autoImageLoad: Match.Maybe(Boolean),
        emailNotificationMode: Match.Maybe(String),
        unreadAlert: Match.Maybe(Boolean),
        notificationsSoundVolume: Match.Maybe(Number),
        desktopNotifications: Match.Maybe(String),
        mobileNotifications: Match.Maybe(String),
        enableAutoAway: Match.Maybe(Boolean),
        highlights: Match.Maybe(Array),
        desktopNotificationDuration: Match.Maybe(Number),
        messageViewMode: Match.Maybe(Number),
        hideUsernames: Match.Maybe(Boolean),
        hideRoles: Match.Maybe(Boolean),
        hideAvatars: Match.Maybe(Boolean),
        hideFlexTab: Match.Maybe(Boolean),
        sendOnEnter: Match.Maybe(String),
        roomCounterSidebar: Match.Maybe(Boolean),
        language: Match.Maybe(String),
        sidebarShowFavorites: Match.Optional(Boolean),
        sidebarShowUnread: Match.Optional(Boolean),
        sidebarSortby: Match.Optional(String),
        sidebarViewMode: Match.Optional(String),
        sidebarHideAvatar: Match.Optional(Boolean),
        sidebarGroupByType: Match.Optional(Boolean),
        muteFocusedConversations: Match.Optional(Boolean)
      })
    });
    const userId = this.bodyParams.userId ? this.bodyParams.userId : this.userId;
    const userData = {
      _id: userId,
      settings: {
        preferences: this.bodyParams.data
      }
    };

    if (this.bodyParams.data.language) {
      const {
        language
      } = this.bodyParams.data;
      delete this.bodyParams.data.language;
      userData.language = language;
    }

    Meteor.runAsUser(this.userId, () => RocketChat.saveUser(this.userId, userData));
    return RocketChat.API.v1.success({
      user: RocketChat.models.Users.findOneById(userId, {
        fields: {
          'settings.preferences': 1
        }
      })
    });
  }

});
RocketChat.API.v1.addRoute('users.forgotPassword', {
  authRequired: false
}, {
  post() {
    const {
      email
    } = this.bodyParams;

    if (!email) {
      return RocketChat.API.v1.failure('The \'email\' param is required');
    }

    const emailSent = Meteor.call('sendForgotPasswordEmail', email);

    if (emailSent) {
      return RocketChat.API.v1.success();
    }

    return RocketChat.API.v1.failure('User not found');
  }

});
RocketChat.API.v1.addRoute('users.getUsernameSuggestion', {
  authRequired: true
}, {
  get() {
    const result = Meteor.runAsUser(this.userId, () => Meteor.call('getUsernameSuggestion'));
    return RocketChat.API.v1.success({
      result
    });
  }

});
RocketChat.API.v1.addRoute('users.generatePersonalAccessToken', {
  authRequired: true
}, {
  post() {
    const {
      tokenName
    } = this.bodyParams;

    if (!tokenName) {
      return RocketChat.API.v1.failure('The \'tokenName\' param is required');
    }

    const token = Meteor.runAsUser(this.userId, () => Meteor.call('personalAccessTokens:generateToken', {
      tokenName
    }));
    return RocketChat.API.v1.success({
      token
    });
  }

});
RocketChat.API.v1.addRoute('users.regeneratePersonalAccessToken', {
  authRequired: true
}, {
  post() {
    const {
      tokenName
    } = this.bodyParams;

    if (!tokenName) {
      return RocketChat.API.v1.failure('The \'tokenName\' param is required');
    }

    const token = Meteor.runAsUser(this.userId, () => Meteor.call('personalAccessTokens:regenerateToken', {
      tokenName
    }));
    return RocketChat.API.v1.success({
      token
    });
  }

});
RocketChat.API.v1.addRoute('users.getPersonalAccessTokens', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.settings.get('API_Enable_Personal_Access_Tokens')) {
      throw new Meteor.Error('error-personal-access-tokens-are-current-disabled', 'Personal Access Tokens are currently disabled');
    }

    const loginTokens = RocketChat.models.Users.getLoginTokensByUserId(this.userId).fetch()[0];

    const getPersonalAccessTokens = () => loginTokens.services.resume.loginTokens.filter(loginToken => loginToken.type && loginToken.type === 'personalAccessToken').map(loginToken => ({
      name: loginToken.name,
      createdAt: loginToken.createdAt,
      lastTokenPart: loginToken.lastTokenPart
    }));

    return RocketChat.API.v1.success({
      tokens: getPersonalAccessTokens()
    });
  }

});
RocketChat.API.v1.addRoute('users.removePersonalAccessToken', {
  authRequired: true
}, {
  post() {
    const {
      tokenName
    } = this.bodyParams;

    if (!tokenName) {
      return RocketChat.API.v1.failure('The \'tokenName\' param is required');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('personalAccessTokens:removeToken', {
      tokenName
    }));
    return RocketChat.API.v1.success();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"assets.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_api/server/v1/assets.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Busboy;
module.watch(require("busboy"), {
  default(v) {
    Busboy = v;
  }

}, 0);
RocketChat.API.v1.addRoute('assets.setAsset', {
  authRequired: true
}, {
  post() {
    const busboy = new Busboy({
      headers: this.request.headers
    });
    const fields = {};
    let asset = {};
    Meteor.wrapAsync(callback => {
      busboy.on('field', (fieldname, value) => fields[fieldname] = value);
      busboy.on('file', Meteor.bindEnvironment((fieldname, file, filename, encoding, mimetype) => {
        const isValidAsset = Object.keys(RocketChat.Assets.assets).includes(fieldname);

        if (!isValidAsset) {
          callback(new Meteor.Error('error-invalid-asset', 'Invalid asset'));
        }

        const assetData = [];
        file.on('data', Meteor.bindEnvironment(data => {
          assetData.push(data);
        }));
        file.on('end', Meteor.bindEnvironment(() => {
          asset = {
            buffer: Buffer.concat(assetData),
            name: fieldname,
            mimetype
          };
        }));
      }));
      busboy.on('finish', () => callback());
      this.request.pipe(busboy);
    })();
    Meteor.runAsUser(this.userId, () => Meteor.call('setAsset', asset.buffer, asset.mimetype, asset.name));

    if (fields.refreshAllClients) {
      Meteor.runAsUser(this.userId, () => Meteor.call('refreshClients'));
    }

    return RocketChat.API.v1.success();
  }

});
RocketChat.API.v1.addRoute('assets.unsetAsset', {
  authRequired: true
}, {
  post() {
    const {
      assetName,
      refreshAllClients
    } = this.bodyParams;
    const isValidAsset = Object.keys(RocketChat.Assets.assets).includes(assetName);

    if (!isValidAsset) {
      throw new Meteor.Error('error-invalid-asset', 'Invalid asset');
    }

    Meteor.runAsUser(this.userId, () => Meteor.call('unsetAsset', assetName));

    if (refreshAllClients) {
      Meteor.runAsUser(this.userId, () => Meteor.call('refreshClients'));
    }

    return RocketChat.API.v1.success();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:api/server/api.js");
require("/node_modules/meteor/rocketchat:api/server/settings.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/requestParams.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/getPaginationItems.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/getUserFromParams.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/getUserInfo.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/isUserFromParams.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/parseJsonQuery.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/deprecationWarning.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/getLoggedInUser.js");
require("/node_modules/meteor/rocketchat:api/server/helpers/insertUserObject.js");
require("/node_modules/meteor/rocketchat:api/server/default/info.js");
require("/node_modules/meteor/rocketchat:api/server/v1/channels.js");
require("/node_modules/meteor/rocketchat:api/server/v1/roles.js");
require("/node_modules/meteor/rocketchat:api/server/v1/rooms.js");
require("/node_modules/meteor/rocketchat:api/server/v1/subscriptions.js");
require("/node_modules/meteor/rocketchat:api/server/v1/chat.js");
require("/node_modules/meteor/rocketchat:api/server/v1/commands.js");
require("/node_modules/meteor/rocketchat:api/server/v1/emoji-custom.js");
require("/node_modules/meteor/rocketchat:api/server/v1/groups.js");
require("/node_modules/meteor/rocketchat:api/server/v1/im.js");
require("/node_modules/meteor/rocketchat:api/server/v1/integrations.js");
require("/node_modules/meteor/rocketchat:api/server/v1/misc.js");
require("/node_modules/meteor/rocketchat:api/server/v1/permissions.js");
require("/node_modules/meteor/rocketchat:api/server/v1/push.js");
require("/node_modules/meteor/rocketchat:api/server/v1/settings.js");
require("/node_modules/meteor/rocketchat:api/server/v1/stats.js");
require("/node_modules/meteor/rocketchat:api/server/v1/users.js");
require("/node_modules/meteor/rocketchat:api/server/v1/assets.js");

/* Exports */
Package._define("rocketchat:api");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_api.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL2FwaS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvaGVscGVycy9yZXF1ZXN0UGFyYW1zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvaGVscGVycy9nZXRQYWdpbmF0aW9uSXRlbXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci9oZWxwZXJzL2dldFVzZXJGcm9tUGFyYW1zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvaGVscGVycy9nZXRVc2VySW5mby5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL2hlbHBlcnMvaXNVc2VyRnJvbVBhcmFtcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL2hlbHBlcnMvcGFyc2VKc29uUXVlcnkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci9oZWxwZXJzL2RlcHJlY2F0aW9uV2FybmluZy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL2hlbHBlcnMvZ2V0TG9nZ2VkSW5Vc2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvaGVscGVycy9pbnNlcnRVc2VyT2JqZWN0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvZGVmYXVsdC9pbmZvLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvY2hhbm5lbHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci92MS9yb2xlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL3Jvb21zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvc3Vic2NyaXB0aW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL2NoYXQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci92MS9jb21tYW5kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL2Vtb2ppLWN1c3RvbS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL2dyb3Vwcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL2ltLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvaW50ZWdyYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvbWlzYy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL3Blcm1pc3Npb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvcHVzaC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwaS9zZXJ2ZXIvdjEvc3RhdHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBpL3NlcnZlci92MS91c2Vycy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcGkvc2VydmVyL3YxL2Fzc2V0cy5qcyJdLCJuYW1lcyI6WyJfIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJsb2dnZXIiLCJMb2dnZXIiLCJBUEkiLCJSZXN0aXZ1cyIsImNvbnN0cnVjdG9yIiwicHJvcGVydGllcyIsImF1dGhNZXRob2RzIiwiZmllbGRTZXBhcmF0b3IiLCJkZWZhdWx0RmllbGRzVG9FeGNsdWRlIiwiam9pbkNvZGUiLCJtZW1iZXJzIiwiaW1wb3J0SWRzIiwibGltaXRlZFVzZXJGaWVsZHNUb0V4Y2x1ZGUiLCJhdmF0YXJPcmlnaW4iLCJlbWFpbHMiLCJwaG9uZSIsInN0YXR1c0Nvbm5lY3Rpb24iLCJjcmVhdGVkQXQiLCJsYXN0TG9naW4iLCJzZXJ2aWNlcyIsInJlcXVpcmVQYXNzd29yZENoYW5nZSIsInJlcXVpcmVQYXNzd29yZENoYW5nZVJlYXNvbiIsInJvbGVzIiwic3RhdHVzRGVmYXVsdCIsIl91cGRhdGVkQXQiLCJjdXN0b21GaWVsZHMiLCJzZXR0aW5ncyIsImxpbWl0ZWRVc2VyRmllbGRzVG9FeGNsdWRlSWZJc1ByaXZpbGVnZWRVc2VyIiwiaGFzSGVscGVyTWV0aG9kcyIsIlJvY2tldENoYXQiLCJoZWxwZXJNZXRob2RzIiwic2l6ZSIsImdldEhlbHBlck1ldGhvZHMiLCJnZXRIZWxwZXJNZXRob2QiLCJuYW1lIiwiZ2V0IiwiYWRkQXV0aE1ldGhvZCIsIm1ldGhvZCIsInB1c2giLCJzdWNjZXNzIiwicmVzdWx0IiwiaXNPYmplY3QiLCJzdGF0dXNDb2RlIiwiYm9keSIsImRlYnVnIiwiZmFpbHVyZSIsImVycm9yVHlwZSIsInN0YWNrIiwiZXJyb3IiLCJub3RGb3VuZCIsIm1zZyIsInVuYXV0aG9yaXplZCIsImFkZFJvdXRlIiwicm91dGVzIiwib3B0aW9ucyIsImVuZHBvaW50cyIsImlzQXJyYXkiLCJ2ZXJzaW9uIiwiX2NvbmZpZyIsImZvckVhY2giLCJyb3V0ZSIsIk9iamVjdCIsImtleXMiLCJhY3Rpb24iLCJvcmlnaW5hbEFjdGlvbiIsIl9pbnRlcm5hbFJvdXRlQWN0aW9uSGFuZGxlciIsInJvY2tldGNoYXRSZXN0QXBpRW5kIiwibWV0cmljcyIsInJvY2tldGNoYXRSZXN0QXBpIiwic3RhcnRUaW1lciIsInVzZXJfYWdlbnQiLCJyZXF1ZXN0IiwiaGVhZGVycyIsImVudHJ5cG9pbnQiLCJ0b1VwcGVyQ2FzZSIsInVybCIsImFwcGx5IiwiZSIsInYxIiwibWVzc2FnZSIsInN0YXR1cyIsImhlbHBlck1ldGhvZCIsIl9pbml0QXV0aCIsImxvZ2luQ29tcGF0aWJpbGl0eSIsImJvZHlQYXJhbXMiLCJ1c2VyIiwidXNlcm5hbWUiLCJlbWFpbCIsInBhc3N3b3JkIiwiY29kZSIsIndpdGhvdXQiLCJsZW5ndGgiLCJhdXRoIiwiaW5jbHVkZXMiLCJoYXNoZWQiLCJkaWdlc3QiLCJhbGdvcml0aG0iLCJ0b3RwIiwibG9naW4iLCJzZWxmIiwiYXV0aFJlcXVpcmVkIiwicG9zdCIsImFyZ3MiLCJnZXRVc2VySW5mbyIsImludm9jYXRpb24iLCJERFBDb21tb24iLCJNZXRob2RJbnZvY2F0aW9uIiwiY29ubmVjdGlvbiIsImNsb3NlIiwiRERQIiwiX0N1cnJlbnRJbnZvY2F0aW9uIiwid2l0aFZhbHVlIiwiTWV0ZW9yIiwiY2FsbCIsInJlYXNvbiIsInVzZXJzIiwiZmluZE9uZSIsIl9pZCIsImlkIiwidXNlcklkIiwidXBkYXRlIiwiQWNjb3VudHMiLCJfaGFzaExvZ2luVG9rZW4iLCJ0b2tlbiIsIiR1bnNldCIsInJlc3BvbnNlIiwiZGF0YSIsImF1dGhUb2tlbiIsIm1lIiwiZXh0cmFEYXRhIiwib25Mb2dnZWRJbiIsImV4dGVuZCIsImV4dHJhIiwibG9nb3V0IiwiaGFzaGVkVG9rZW4iLCJ0b2tlbkxvY2F0aW9uIiwiaW5kZXgiLCJsYXN0SW5kZXhPZiIsInRva2VuUGF0aCIsInN1YnN0cmluZyIsInRva2VuRmllbGROYW1lIiwidG9rZW5Ub1JlbW92ZSIsInRva2VuUmVtb3ZhbFF1ZXJ5IiwiJHB1bGwiLCJvbkxvZ2dlZE91dCIsImNvbnNvbGUiLCJ3YXJuIiwiZ2V0VXNlckF1dGgiLCJfZ2V0VXNlckF1dGgiLCJpbnZhbGlkUmVzdWx0cyIsInVuZGVmaW5lZCIsInBheWxvYWQiLCJKU09OIiwicGFyc2UiLCJpIiwiTWFwIiwiQXBpQ2xhc3MiLCJkZWZhdWx0T3B0aW9uc0VuZHBvaW50IiwiX2RlZmF1bHRPcHRpb25zRW5kcG9pbnQiLCJ3cml0ZUhlYWQiLCJ3cml0ZSIsImRvbmUiLCJjcmVhdGVBcGkiLCJfY3JlYXRlQXBpIiwiZW5hYmxlQ29ycyIsInVzZURlZmF1bHRBdXRoIiwicHJldHR5SnNvbiIsInByb2Nlc3MiLCJlbnYiLCJOT0RFX0VOViIsImtleSIsInZhbHVlIiwiYWRkR3JvdXAiLCJzZWN0aW9uIiwiYWRkIiwidHlwZSIsInB1YmxpYyIsImVuYWJsZVF1ZXJ5Iiwic2V0IiwiX3JlcXVlc3RQYXJhbXMiLCJxdWVyeVBhcmFtcyIsIl9nZXRQYWdpbmF0aW9uSXRlbXMiLCJoYXJkVXBwZXJMaW1pdCIsImRlZmF1bHRDb3VudCIsIm9mZnNldCIsInBhcnNlSW50IiwiY291bnQiLCJfZ2V0VXNlckZyb21QYXJhbXMiLCJkb2VzbnRFeGlzdCIsIl9kb2VzbnRFeGlzdCIsInBhcmFtcyIsInJlcXVlc3RQYXJhbXMiLCJ0cmltIiwibW9kZWxzIiwiVXNlcnMiLCJmaW5kT25lQnlJZCIsImZpbmRPbmVCeVVzZXJuYW1lIiwiRXJyb3IiLCJnZXRJbmZvRnJvbVVzZXJPYmplY3QiLCJ1dGNPZmZzZXQiLCJhY3RpdmUiLCJsYW5ndWFnZSIsIl9nZXRVc2VySW5mbyIsImlzVmVyaWZpZWRFbWFpbCIsIkFycmF5IiwiZmluZCIsInZlcmlmaWVkIiwiZ2V0VXNlclByZWZlcmVuY2VzIiwiZGVmYXVsdFVzZXJTZXR0aW5nUHJlZml4IiwiYWxsRGVmYXVsdFVzZXJTZXR0aW5ncyIsIlJlZ0V4cCIsInJlZHVjZSIsImFjY3VtdWxhdG9yIiwic2V0dGluZyIsInNldHRpbmdXaXRob3V0UHJlZml4IiwicmVwbGFjZSIsImdldFVzZXJQcmVmZXJlbmNlIiwidmVyaWZpZWRFbWFpbCIsImFkZHJlc3MiLCJwcmVmZXJlbmNlcyIsIl9pc1VzZXJGcm9tUGFyYW1zIiwiX3BhcnNlSnNvblF1ZXJ5Iiwic29ydCIsImZpZWxkcyIsIm5vblNlbGVjdGFibGVGaWVsZHMiLCJnZXRGaWVsZHMiLCJhdXRoeiIsImhhc1Blcm1pc3Npb24iLCJjb25jYXQiLCJrIiwic3BsaXQiLCJhc3NpZ24iLCJxdWVyeSIsIm5vblF1ZXJ5YWJsZUZpZWxkcyIsIl9kZXByZWNhdGlvbldhcm5pbmciLCJlbmRwb2ludCIsInZlcnNpb25XaWxsQmVSZW1vdmUiLCJ3YXJuaW5nTWVzc2FnZSIsIndhcm5pbmciLCJfZ2V0TG9nZ2VkSW5Vc2VyIiwiX2FkZFVzZXJUb09iamVjdCIsIm9iamVjdCIsImdldExvZ2dlZEluVXNlciIsImhhc1JvbGUiLCJpbmZvIiwiSW5mbyIsImZpbmRDaGFubmVsQnlJZE9yTmFtZSIsImNoZWNrZWRBcmNoaXZlZCIsInJvb21JZCIsInJvb21OYW1lIiwicm9vbSIsIlJvb21zIiwiZmluZE9uZUJ5TmFtZSIsInQiLCJhcmNoaXZlZCIsImZpbmRSZXN1bHQiLCJydW5Bc1VzZXIiLCJhY3RpdmVVc2Vyc09ubHkiLCJjaGFubmVsIiwiZ2V0VXNlckZyb21QYXJhbXMiLCJzdWIiLCJTdWJzY3JpcHRpb25zIiwiZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkIiwib3BlbiIsImFjY2VzcyIsInVucmVhZHMiLCJ1c2VyTWVudGlvbnMiLCJ1bnJlYWRzRnJvbSIsImpvaW5lZCIsIm1zZ3MiLCJsYXRlc3QiLCJyZXR1cm5Vc2VybmFtZXMiLCJzdWJzY3JpcHRpb24iLCJsbSIsIk1lc3NhZ2VzIiwiY291bnRWaXNpYmxlQnlSb29tSWRCZXR3ZWVuVGltZXN0YW1wc0luY2x1c2l2ZSIsInJpZCIsImxzIiwidHMiLCJ1c2Vyc0NvdW50IiwiY3JlYXRlQ2hhbm5lbFZhbGlkYXRvciIsImNyZWF0ZUNoYW5uZWwiLCJyZWFkT25seSIsImNoYW5uZWxzIiwiY3JlYXRlIiwidmFsaWRhdGUiLCJleGVjdXRlIiwiYWRkVXNlck9iamVjdFRvRXZlcnlPYmplY3QiLCJmaWxlIiwiaW5zZXJ0VXNlck9iamVjdCIsImdldFBhZ2luYXRpb25JdGVtcyIsInBhcnNlSnNvblF1ZXJ5Iiwib3VyUXVlcnkiLCJmaWxlcyIsIlVwbG9hZHMiLCJza2lwIiwibGltaXQiLCJmZXRjaCIsIm1hcCIsInRvdGFsIiwiaW5jbHVkZUFsbFB1YmxpY0NoYW5uZWxzIiwiJGluIiwiaW50ZWdyYXRpb25zIiwiSW50ZWdyYXRpb25zIiwiX2NyZWF0ZWRBdCIsImxhdGVzdERhdGUiLCJEYXRlIiwib2xkZXN0RGF0ZSIsIm9sZGVzdCIsImluY2x1c2l2ZSIsImhhc1Blcm1pc3Npb25Ub1NlZUFsbFB1YmxpY0NoYW5uZWxzIiwicm9vbUlkcyIsImZpbmRCeVVzZXJJZEFuZFR5cGUiLCJzIiwiY3Vyc29yIiwicm9vbXMiLCJmaW5kQnlTdWJzY3JpcHRpb25UeXBlQW5kVXNlcklkIiwidG90YWxDb3VudCIsImJyb2FkY2FzdCIsInN1YnNjcmlwdGlvbnMiLCJmaW5kQnlSb29tSWQiLCJ1IiwibWVzc2FnZXMiLCJvbmxpbmUiLCJmaW5kVXNlcnNOb3RPZmZsaW5lIiwib25saW5lSW5Sb29tIiwidG9TdHJpbmciLCJkZXNjcmlwdGlvbiIsInB1cnBvc2UiLCJybyIsInRvcGljIiwiYW5ub3VuY2VtZW50IiwibWVudGlvbnMiLCJhbGxNZW50aW9ucyIsIm1vZGVyYXRvcnMiLCJmaW5kQnlSb29tSWRBbmRSb2xlcyIsIlJvbGVzIiwiY2hlY2siLCJTdHJpbmciLCJzY29wZSIsIk1hdGNoIiwiTWF5YmUiLCJyb2xlRGF0YSIsInJvbGUiLCJmaW5kT25lQnlJZE9yTmFtZSIsInJvbGVOYW1lIiwiQnVzYm95IiwiZmluZFJvb21CeUlkT3JOYW1lIiwidXBkYXRlZFNpbmNlIiwidXBkYXRlZFNpbmNlRGF0ZSIsImlzTmFOIiwicmVtb3ZlIiwidXJsUGFyYW1zIiwiYnVzYm95Iiwid3JhcEFzeW5jIiwiY2FsbGJhY2siLCJvbiIsImZpZWxkbmFtZSIsImZpbGVuYW1lIiwiZW5jb2RpbmciLCJtaW1ldHlwZSIsImZpbGVEYXRlIiwiZmlsZUJ1ZmZlciIsIkJ1ZmZlciIsImJpbmRFbnZpcm9ubWVudCIsInBpcGUiLCJmaWxlU3RvcmUiLCJGaWxlVXBsb2FkIiwiZ2V0U3RvcmUiLCJkZXRhaWxzIiwidXBsb2FkZWRGaWxlIiwiaW5zZXJ0IiwiYmluZCIsInNhdmVOb3RpZmljYXRpb25zIiwibm90aWZpY2F0aW9ucyIsIm5vdGlmaWNhdGlvbktleSIsImZhdm9yaXRlIiwiaGFzT3duUHJvcGVydHkiLCJleGNsdWRlUGlubmVkIiwiZmlsZXNPbmx5IiwiZnJvbVVzZXJzIiwiZmlyc3RVbnJlYWRNZXNzYWdlIiwiT2JqZWN0SW5jbHVkaW5nIiwibXNnSWQiLCJhc1VzZXIiLCJCb29sZWFuIiwibm93IiwibGFzdFVwZGF0ZSIsIm1lc3NhZ2VJZCIsInBpbm5lZE1lc3NhZ2UiLCJtZXNzYWdlUmV0dXJuIiwicHJvY2Vzc1dlYmhvb2tNZXNzYWdlIiwic2VhcmNoVGV4dCIsImRvY3MiLCJzdGFycmVkIiwidGV4dCIsImVtb2ppIiwicmVhY3Rpb24iLCJzaG91bGRSZWFjdCIsIm1lc3NhZ2VSZWFkUmVjZWlwdHMiLCJyZWNlaXB0cyIsImlnbm9yZSIsInRlc3QiLCJjb21tYW5kIiwiY21kIiwic2xhc2hDb21tYW5kcyIsImNvbW1hbmRzIiwidG9Mb3dlckNhc2UiLCJ2YWx1ZXMiLCJmaWx0ZXIiLCJwcm9jZXNzUXVlcnlPcHRpb25zT25SZXN1bHQiLCJydW4iLCJSYW5kb20iLCJwcmV2aWV3IiwicHJldmlld0l0ZW0iLCJlbW9qaXMiLCJmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSIsInJvb21TdWIiLCJmaW5kT25lQnlSb29tTmFtZUFuZFVzZXJJZCIsImdyb3VwIiwiaW5jbHVkZUFsbFByaXZhdGVHcm91cHMiLCJjaGFubmVsc1RvU2VhcmNoIiwiaWRPck5hbWUiLCJncm91cHMiLCJmaW5kRGlyZWN0TWVzc2FnZVJvb20iLCJnZXRSb29tQnlOYW1lT3JJZFdpdGhPcHRpb25Ub0pvaW4iLCJjdXJyZW50VXNlcklkIiwibmFtZU9ySWQiLCJydXNlcklkIiwicnMiLCJkbSIsInVucmVhZCIsImltcyIsImVuYWJsZWQiLCJ1cmxzIiwiZXZlbnQiLCJ0cmlnZ2VyV29yZHMiLCJhbGlhcyIsImF2YXRhciIsInNjcmlwdEVuYWJsZWQiLCJzY3JpcHQiLCJ0YXJnZXRDaGFubmVsIiwiaW50ZWdyYXRpb24iLCJoaXN0b3J5IiwiSW50ZWdyYXRpb25IaXN0b3J5IiwiaXRlbXMiLCJ0YXJnZXRfdXJsIiwiaW50ZWdyYXRpb25JZCIsIm9ubGluZUNhY2hlIiwib25saW5lQ2FjaGVEYXRlIiwiY2FjaGVJbnZhbGlkIiwiaWNvbiIsInR5cGVzIiwiaGlkZUljb24iLCJiYWNrZ3JvdW5kQ29sb3IiLCJUQVBpMThuIiwiX18iLCJpY29uU2l6ZSIsImxlZnRTaXplIiwicmlnaHRTaXplIiwid2lkdGgiLCJoZWlnaHQiLCJzb3J0QnkiLCJzb3J0RGlyZWN0aW9uIiwiTWF0aCIsIm1heCIsInJlc3VsdHMiLCJwZXJtaXNzaW9ucyIsInBlcm1pc3Npb25Ob3RGb3VuZCIsInJvbGVOb3RGb3VuZCIsImVsZW1lbnQiLCJQZXJtaXNzaW9ucyIsInN1YmVsZW1lbnQiLCJjcmVhdGVPclVwZGF0ZSIsImFwcE5hbWUiLCJkZWxldGUiLCJhZmZlY3RlZFJlY29yZHMiLCJQdXNoIiwiYXBwQ29sbGVjdGlvbiIsIiRvciIsImhpZGRlbiIsIiRuZSIsIlNldHRpbmdzIiwibW91bnRPQXV0aFNlcnZpY2VzIiwib0F1dGhTZXJ2aWNlc0VuYWJsZWQiLCJTZXJ2aWNlQ29uZmlndXJhdGlvbiIsImNvbmZpZ3VyYXRpb25zIiwic2VjcmV0Iiwic2VydmljZSIsImN1c3RvbSIsImNsaWVudElkIiwiYXBwSWQiLCJjb25zdW1lcktleSIsImJ1dHRvbkxhYmVsVGV4dCIsImJ1dHRvbkNvbG9yIiwiYnV0dG9uTGFiZWxDb2xvciIsInBpY2siLCJmaW5kT25lTm90SGlkZGVuQnlJZCIsImVkaXRvciIsInVwZGF0ZU9wdGlvbnNCeUlkIiwidXBkYXRlVmFsdWVOb3RIaWRkZW5CeUlkIiwiQW55IiwiUGFja2FnZSIsInJlZnJlc2giLCJzdGF0cyIsInN0YXRpc3RpY3MiLCJTdGF0aXN0aWNzIiwiam9pbkRlZmF1bHRDaGFubmVscyIsInNlbmRXZWxjb21lRW1haWwiLCJ2YWxpZGF0ZUN1c3RvbUZpZWxkcyIsIm5ld1VzZXJJZCIsInNhdmVVc2VyIiwic2F2ZUN1c3RvbUZpZWxkc1dpdGhvdXRWYWxpZGF0aW9uIiwiZ2V0VVJMIiwiY2RuIiwiZnVsbCIsInNldEhlYWRlciIsImlzVXNlckZyb21QYXJhbXMiLCJwcmVzZW5jZSIsImNvbm5lY3Rpb25TdGF0dXMiLCJhdmF0YXJVcmwiLCJzZXRVc2VyQXZhdGFyIiwiaW1hZ2VEYXRhIiwidXNlckRhdGEiLCJzYXZlQ3VzdG9tRmllbGRzIiwiY3VycmVudFBhc3N3b3JkIiwibmV3UGFzc3dvcmQiLCJyZWFsbmFtZSIsInR5cGVkUGFzc3dvcmQiLCJuZXdSb29tTm90aWZpY2F0aW9uIiwibmV3TWVzc2FnZU5vdGlmaWNhdGlvbiIsImNsb2NrTW9kZSIsIk51bWJlciIsInVzZUVtb2ppcyIsImNvbnZlcnRBc2NpaUVtb2ppIiwic2F2ZU1vYmlsZUJhbmR3aWR0aCIsImNvbGxhcHNlTWVkaWFCeURlZmF1bHQiLCJhdXRvSW1hZ2VMb2FkIiwiZW1haWxOb3RpZmljYXRpb25Nb2RlIiwidW5yZWFkQWxlcnQiLCJub3RpZmljYXRpb25zU291bmRWb2x1bWUiLCJkZXNrdG9wTm90aWZpY2F0aW9ucyIsIm1vYmlsZU5vdGlmaWNhdGlvbnMiLCJlbmFibGVBdXRvQXdheSIsImhpZ2hsaWdodHMiLCJkZXNrdG9wTm90aWZpY2F0aW9uRHVyYXRpb24iLCJtZXNzYWdlVmlld01vZGUiLCJoaWRlVXNlcm5hbWVzIiwiaGlkZVJvbGVzIiwiaGlkZUF2YXRhcnMiLCJoaWRlRmxleFRhYiIsInNlbmRPbkVudGVyIiwicm9vbUNvdW50ZXJTaWRlYmFyIiwic2lkZWJhclNob3dGYXZvcml0ZXMiLCJPcHRpb25hbCIsInNpZGViYXJTaG93VW5yZWFkIiwic2lkZWJhclNvcnRieSIsInNpZGViYXJWaWV3TW9kZSIsInNpZGViYXJIaWRlQXZhdGFyIiwic2lkZWJhckdyb3VwQnlUeXBlIiwibXV0ZUZvY3VzZWRDb252ZXJzYXRpb25zIiwiZW1haWxTZW50IiwidG9rZW5OYW1lIiwibG9naW5Ub2tlbnMiLCJnZXRMb2dpblRva2Vuc0J5VXNlcklkIiwiZ2V0UGVyc29uYWxBY2Nlc3NUb2tlbnMiLCJyZXN1bWUiLCJsb2dpblRva2VuIiwibGFzdFRva2VuUGFydCIsInRva2VucyIsImFzc2V0IiwiaXNWYWxpZEFzc2V0IiwiQXNzZXRzIiwiYXNzZXRzIiwiYXNzZXREYXRhIiwiYnVmZmVyIiwicmVmcmVzaEFsbENsaWVudHMiLCJhc3NldE5hbWUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsQ0FBSjs7QUFBTUMsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLFlBQVIsQ0FBYixFQUFtQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0wsUUFBRUssQ0FBRjtBQUFJOztBQUFoQixDQUFuQyxFQUFxRCxDQUFyRDtBQUVOLE1BQU1DLFNBQVMsSUFBSUMsTUFBSixDQUFXLEtBQVgsRUFBa0IsRUFBbEIsQ0FBZjs7QUFFQSxNQUFNQyxHQUFOLFNBQWtCQyxRQUFsQixDQUEyQjtBQUMxQkMsY0FBWUMsVUFBWixFQUF3QjtBQUN2QixVQUFNQSxVQUFOO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQixFQUFuQjtBQUNBLFNBQUtDLGNBQUwsR0FBc0IsR0FB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QWM7QUFBaEIsQ0FBaEQsRUFBd0U7QUFDdkVDLFNBQU87QUFDTixVQUFNO0FBQUU0ZCxlQUFGO0FBQWFEO0FBQWIsUUFBbUMsS0FBSzVlLFVBQTlDO0FBQ0EsVUFBTXVlLGVBQWU5ZixPQUFPQyxJQUFQLENBQVlqQyxXQUFXK2hCLE1BQVgsQ0FBa0JDLE1BQTlCLEVBQXNDaGUsUUFBdEMsQ0FBK0NvZSxTQUEvQyxDQUFyQjs7QUFDQSxRQUFJLENBQUNOLFlBQUwsRUFBbUI7QUFDbEIsWUFBTSxJQUFJM2MsT0FBT3FGLEtBQVgsQ0FBaUIscUJBQWpCLEVBQXdDLGVBQXhDLENBQU47QUFDQTs7QUFDRHJGLFdBQU9nSixTQUFQLENBQWlCLEtBQUt6SSxNQUF0QixFQUE4QixNQUFNUCxPQUFPQyxJQUFQLENBQVksWUFBWixFQUEwQmdkLFNBQTFCLENBQXBDOztBQUNBLFFBQUlELGlCQUFKLEVBQXVCO0FBQ3RCaGQsYUFBT2dKLFNBQVAsQ0FBaUIsS0FBS3pJLE1BQXRCLEVBQThCLE1BQU1QLE9BQU9DLElBQVAsQ0FBWSxnQkFBWixDQUFwQztBQUNBOztBQUNELFdBQU9wRixXQUFXM0IsR0FBWCxDQUFlNEUsRUFBZixDQUFrQnZDLE9BQWxCLEVBQVA7QUFDQTs7QUFac0UsQ0FBeEUsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9hcGkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWwgUmVzdGl2dXMsIEREUCwgRERQQ29tbW9uICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoJ0FQSScsIHt9KTtcblxuY2xhc3MgQVBJIGV4dGVuZHMgUmVzdGl2dXMge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdFx0dGhpcy5hdXRoTWV0aG9kcyA9IFtdO1xuXHRcdHRoaXMuZmllbGRTZXBhcmF0b3IgPSAnLic7XG5cdFx0dGhpcy5kZWZhdWx0RmllbGRzVG9FeGNsdWRlID0ge1xuXHRcdFx0am9pbkNvZGU6IDAsXG5cdFx0XHRtZW1iZXJzOiAwLFxuXHRcdFx0aW1wb3J0SWRzOiAwLFxuXHRcdH07XG5cdFx0dGhpcy5saW1pdGVkVXNlckZpZWxkc1RvRXhjbHVkZSA9IHtcblx0XHRcdGF2YXRhck9yaWdpbjogMCxcblx0XHRcdGVtYWlsczogMCxcblx0XHRcdHBob25lOiAwLFxuXHRcdFx0c3RhdHVzQ29ubmVjdGlvbjogMCxcblx0XHRcdGNyZWF0ZWRBdDogMCxcblx0XHRcdGxhc3RMb2dpbjogMCxcblx0XHRcdHNlcnZpY2VzOiAwLFxuXHRcdFx0cmVxdWlyZVBhc3N3b3JkQ2hhbmdlOiAwLFxuXHRcdFx0cmVxdWlyZVBhc3N3b3JkQ2hhbmdlUmVhc29uOiAwLFxuXHRcdFx0cm9sZXM6IDAsXG5cdFx0XHRzdGF0dXNEZWZhdWx0OiAwLFxuXHRcdFx0X3VwZGF0ZWRBdDogMCxcblx0XHRcdGN1c3RvbUZpZWxkczogMCxcblx0XHRcdHNldHRpbmdzOiAwLFxuXHRcdH07XG5cdFx0dGhpcy5saW1pdGVkVXNlckZpZWxkc1RvRXhjbHVkZUlmSXNQcml2aWxlZ2VkVXNlciA9IHtcblx0XHRcdHNlcnZpY2VzOiAwLFxuXHRcdH07XG5cdH1cblxuXHRoYXNIZWxwZXJNZXRob2RzKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS5oZWxwZXJNZXRob2RzLnNpemUgIT09IDA7XG5cdH1cblxuXHRnZXRIZWxwZXJNZXRob2RzKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS5oZWxwZXJNZXRob2RzO1xuXHR9XG5cblx0Z2V0SGVscGVyTWV0aG9kKG5hbWUpIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcy5nZXQobmFtZSk7XG5cdH1cblxuXHRhZGRBdXRoTWV0aG9kKG1ldGhvZCkge1xuXHRcdHRoaXMuYXV0aE1ldGhvZHMucHVzaChtZXRob2QpO1xuXHR9XG5cblx0c3VjY2VzcyhyZXN1bHQgPSB7fSkge1xuXHRcdGlmIChfLmlzT2JqZWN0KHJlc3VsdCkpIHtcblx0XHRcdHJlc3VsdC5zdWNjZXNzID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXN1bHQgPSB7XG5cdFx0XHRzdGF0dXNDb2RlOiAyMDAsXG5cdFx0XHRib2R5OiByZXN1bHQsXG5cdFx0fTtcblxuXHRcdGxvZ2dlci5kZWJ1ZygnU3VjY2VzcycsIHJlc3VsdCk7XG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZmFpbHVyZShyZXN1bHQsIGVycm9yVHlwZSwgc3RhY2spIHtcblx0XHRpZiAoXy5pc09iamVjdChyZXN1bHQpKSB7XG5cdFx0XHRyZXN1bHQuc3VjY2VzcyA9IGZhbHNlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgPSB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0XHRlcnJvcjogcmVzdWx0LFxuXHRcdFx0XHRzdGFjayxcblx0XHRcdH07XG5cblx0XHRcdGlmIChlcnJvclR5cGUpIHtcblx0XHRcdFx0cmVzdWx0LmVycm9yVHlwZSA9IGVycm9yVHlwZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXN1bHQgPSB7XG5cdFx0XHRzdGF0dXNDb2RlOiA0MDAsXG5cdFx0XHRib2R5OiByZXN1bHQsXG5cdFx0fTtcblxuXHRcdGxvZ2dlci5kZWJ1ZygnRmFpbHVyZScsIHJlc3VsdCk7XG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0bm90Rm91bmQobXNnKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHN0YXR1c0NvZGU6IDQwNCxcblx0XHRcdGJvZHk6IHtcblx0XHRcdFx0c3VjY2VzczogZmFsc2UsXG5cdFx0XHRcdGVycm9yOiBtc2cgPyBtc2cgOiAnUmVzb3VyY2Ugbm90IGZvdW5kJyxcblx0XHRcdH0sXG5cdFx0fTtcblx0fVxuXG5cdHVuYXV0aG9yaXplZChtc2cpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0c3RhdHVzQ29kZTogNDAzLFxuXHRcdFx0Ym9keToge1xuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcblx0XHRcdFx0ZXJyb3I6IG1zZyA/IG1zZyA6ICd1bmF1dGhvcml6ZWQnLFxuXHRcdFx0fSxcblx0XHR9O1xuXHR9XG5cblx0YWRkUm91dGUocm91dGVzLCBvcHRpb25zLCBlbmRwb2ludHMpIHtcblx0XHQvLyBOb3RlOiByZXF1aXJlZCBpZiB0aGUgZGV2ZWxvcGVyIGRpZG4ndCBwcm92aWRlIG9wdGlvbnNcblx0XHRpZiAodHlwZW9mIGVuZHBvaW50cyA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdGVuZHBvaW50cyA9IG9wdGlvbnM7XG5cdFx0XHRvcHRpb25zID0ge307XG5cdFx0fVxuXG5cdFx0Ly8gQWxsb3cgZm9yIG1vcmUgdGhhbiBvbmUgcm91dGUgdXNpbmcgdGhlIHNhbWUgb3B0aW9uIGFuZCBlbmRwb2ludHNcblx0XHRpZiAoIV8uaXNBcnJheShyb3V0ZXMpKSB7XG5cdFx0XHRyb3V0ZXMgPSBbcm91dGVzXTtcblx0XHR9XG5cblx0XHRjb25zdCB7IHZlcnNpb24gfSA9IHRoaXMuX2NvbmZpZztcblxuXHRcdHJvdXRlcy5mb3JFYWNoKChyb3V0ZSkgPT4ge1xuXHRcdFx0Ly8gTm90ZTogVGhpcyBpcyByZXF1aXJlZCBkdWUgdG8gUmVzdGl2dXMgY2FsbGluZyBgYWRkUm91dGVgIGluIHRoZSBjb25zdHJ1Y3RvciBvZiBpdHNlbGZcblx0XHRcdE9iamVjdC5rZXlzKGVuZHBvaW50cykuZm9yRWFjaCgobWV0aG9kKSA9PiB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZW5kcG9pbnRzW21ldGhvZF0gPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRlbmRwb2ludHNbbWV0aG9kXSA9IHsgYWN0aW9uOiBlbmRwb2ludHNbbWV0aG9kXSB9O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQWRkIGEgdHJ5L2NhdGNoIGZvciBlYWNoIGVuZHBvaW50XG5cdFx0XHRcdGNvbnN0IG9yaWdpbmFsQWN0aW9uID0gZW5kcG9pbnRzW21ldGhvZF0uYWN0aW9uO1xuXHRcdFx0XHRlbmRwb2ludHNbbWV0aG9kXS5hY3Rpb24gPSBmdW5jdGlvbiBfaW50ZXJuYWxSb3V0ZUFjdGlvbkhhbmRsZXIoKSB7XG5cdFx0XHRcdFx0Y29uc3Qgcm9ja2V0Y2hhdFJlc3RBcGlFbmQgPSBSb2NrZXRDaGF0Lm1ldHJpY3Mucm9ja2V0Y2hhdFJlc3RBcGkuc3RhcnRUaW1lcih7XG5cdFx0XHRcdFx0XHRtZXRob2QsXG5cdFx0XHRcdFx0XHR2ZXJzaW9uLFxuXHRcdFx0XHRcdFx0dXNlcl9hZ2VudDogdGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3VzZXItYWdlbnQnXSxcblx0XHRcdFx0XHRcdGVudHJ5cG9pbnQ6IHJvdXRlLFxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0bG9nZ2VyLmRlYnVnKGAkeyB0aGlzLnJlcXVlc3QubWV0aG9kLnRvVXBwZXJDYXNlKCkgfTogJHsgdGhpcy5yZXF1ZXN0LnVybCB9YCk7XG5cdFx0XHRcdFx0bGV0IHJlc3VsdDtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0cmVzdWx0ID0gb3JpZ2luYWxBY3Rpb24uYXBwbHkodGhpcyk7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdFx0bG9nZ2VyLmRlYnVnKGAkeyBtZXRob2QgfSAkeyByb3V0ZSB9IHRocmV3IGFuIGVycm9yOmAsIGUuc3RhY2spO1xuXHRcdFx0XHRcdFx0cmVzdWx0ID0gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlLm1lc3NhZ2UsIGUuZXJyb3IpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJlc3VsdCA9IHJlc3VsdCB8fCBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cblx0XHRcdFx0XHRyb2NrZXRjaGF0UmVzdEFwaUVuZCh7XG5cdFx0XHRcdFx0XHRzdGF0dXM6IHJlc3VsdC5zdGF0dXNDb2RlLFxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRpZiAodGhpcy5oYXNIZWxwZXJNZXRob2RzKCkpIHtcblx0XHRcdFx0XHRmb3IgKGNvbnN0IFtuYW1lLCBoZWxwZXJNZXRob2RdIG9mIHRoaXMuZ2V0SGVscGVyTWV0aG9kcygpKSB7XG5cdFx0XHRcdFx0XHRlbmRwb2ludHNbbWV0aG9kXVtuYW1lXSA9IGhlbHBlck1ldGhvZDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBBbGxvdyB0aGUgZW5kcG9pbnRzIHRvIG1ha2UgdXNhZ2Ugb2YgdGhlIGxvZ2dlciB3aGljaCByZXNwZWN0cyB0aGUgdXNlcidzIHNldHRpbmdzXG5cdFx0XHRcdGVuZHBvaW50c1ttZXRob2RdLmxvZ2dlciA9IGxvZ2dlcjtcblx0XHRcdH0pO1xuXG5cdFx0XHRzdXBlci5hZGRSb3V0ZShyb3V0ZSwgb3B0aW9ucywgZW5kcG9pbnRzKTtcblx0XHR9KTtcblx0fVxuXG5cdF9pbml0QXV0aCgpIHtcblx0XHRjb25zdCBsb2dpbkNvbXBhdGliaWxpdHkgPSAoYm9keVBhcmFtcykgPT4ge1xuXHRcdFx0Ly8gR3JhYiB0aGUgdXNlcm5hbWUgb3IgZW1haWwgdGhhdCB0aGUgdXNlciBpcyBsb2dnaW5nIGluIHdpdGhcblx0XHRcdGNvbnN0IHsgdXNlciwgdXNlcm5hbWUsIGVtYWlsLCBwYXNzd29yZCwgY29kZSB9ID0gYm9keVBhcmFtcztcblxuXHRcdFx0aWYgKHBhc3N3b3JkID09IG51bGwpIHtcblx0XHRcdFx0cmV0dXJuIGJvZHlQYXJhbXM7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChfLndpdGhvdXQoT2JqZWN0LmtleXMoYm9keVBhcmFtcyksICd1c2VyJywgJ3VzZXJuYW1lJywgJ2VtYWlsJywgJ3Bhc3N3b3JkJywgJ2NvZGUnKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdHJldHVybiBib2R5UGFyYW1zO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBhdXRoID0ge1xuXHRcdFx0XHRwYXNzd29yZCxcblx0XHRcdH07XG5cblx0XHRcdGlmICh0eXBlb2YgdXNlciA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0YXV0aC51c2VyID0gdXNlci5pbmNsdWRlcygnQCcpID8geyBlbWFpbDogdXNlciB9IDogeyB1c2VybmFtZTogdXNlciB9O1xuXHRcdFx0fSBlbHNlIGlmICh1c2VybmFtZSkge1xuXHRcdFx0XHRhdXRoLnVzZXIgPSB7IHVzZXJuYW1lIH07XG5cdFx0XHR9IGVsc2UgaWYgKGVtYWlsKSB7XG5cdFx0XHRcdGF1dGgudXNlciA9IHsgZW1haWwgfTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGF1dGgudXNlciA9PSBudWxsKSB7XG5cdFx0XHRcdHJldHVybiBib2R5UGFyYW1zO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoYXV0aC5wYXNzd29yZC5oYXNoZWQpIHtcblx0XHRcdFx0YXV0aC5wYXNzd29yZCA9IHtcblx0XHRcdFx0XHRkaWdlc3Q6IGF1dGgucGFzc3dvcmQsXG5cdFx0XHRcdFx0YWxnb3JpdGhtOiAnc2hhLTI1NicsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdGlmIChjb2RlKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0dG90cDoge1xuXHRcdFx0XHRcdFx0Y29kZSxcblx0XHRcdFx0XHRcdGxvZ2luOiBhdXRoLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBhdXRoO1xuXHRcdH07XG5cblx0XHRjb25zdCBzZWxmID0gdGhpcztcblxuXHRcdHRoaXMuYWRkUm91dGUoJ2xvZ2luJywgeyBhdXRoUmVxdWlyZWQ6IGZhbHNlIH0sIHtcblx0XHRcdHBvc3QoKSB7XG5cdFx0XHRcdGNvbnN0IGFyZ3MgPSBsb2dpbkNvbXBhdGliaWxpdHkodGhpcy5ib2R5UGFyYW1zKTtcblx0XHRcdFx0Y29uc3QgZ2V0VXNlckluZm8gPSBzZWxmLmdldEhlbHBlck1ldGhvZCgnZ2V0VXNlckluZm8nKTtcblxuXHRcdFx0XHRjb25zdCBpbnZvY2F0aW9uID0gbmV3IEREUENvbW1vbi5NZXRob2RJbnZvY2F0aW9uKHtcblx0XHRcdFx0XHRjb25uZWN0aW9uOiB7XG5cdFx0XHRcdFx0XHRjbG9zZSgpIHt9LFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGxldCBhdXRoO1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGF1dGggPSBERFAuX0N1cnJlbnRJbnZvY2F0aW9uLndpdGhWYWx1ZShpbnZvY2F0aW9uLCAoKSA9PiBNZXRlb3IuY2FsbCgnbG9naW4nLCBhcmdzKSk7XG5cdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdFx0bGV0IGUgPSBlcnJvcjtcblx0XHRcdFx0XHRpZiAoZXJyb3IucmVhc29uID09PSAnVXNlciBub3QgZm91bmQnKSB7XG5cdFx0XHRcdFx0XHRlID0ge1xuXHRcdFx0XHRcdFx0XHRlcnJvcjogJ1VuYXV0aG9yaXplZCcsXG5cdFx0XHRcdFx0XHRcdHJlYXNvbjogJ1VuYXV0aG9yaXplZCcsXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRzdGF0dXNDb2RlOiA0MDEsXG5cdFx0XHRcdFx0XHRib2R5OiB7XG5cdFx0XHRcdFx0XHRcdHN0YXR1czogJ2Vycm9yJyxcblx0XHRcdFx0XHRcdFx0ZXJyb3I6IGUuZXJyb3IsXG5cdFx0XHRcdFx0XHRcdG1lc3NhZ2U6IGUucmVhc29uIHx8IGUubWVzc2FnZSxcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXMudXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHtcblx0XHRcdFx0XHRfaWQ6IGF1dGguaWQsXG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHRoaXMudXNlcklkID0gdGhpcy51c2VyLl9pZDtcblxuXHRcdFx0XHQvLyBSZW1vdmUgdG9rZW5FeHBpcmVzIHRvIGtlZXAgdGhlIG9sZCBiZWhhdmlvclxuXHRcdFx0XHRNZXRlb3IudXNlcnMudXBkYXRlKHtcblx0XHRcdFx0XHRfaWQ6IHRoaXMudXNlci5faWQsXG5cdFx0XHRcdFx0J3NlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucy5oYXNoZWRUb2tlbic6IEFjY291bnRzLl9oYXNoTG9naW5Ub2tlbihhdXRoLnRva2VuKSxcblx0XHRcdFx0fSwge1xuXHRcdFx0XHRcdCR1bnNldDoge1xuXHRcdFx0XHRcdFx0J3NlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucy4kLndoZW4nOiAxLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGNvbnN0IHJlc3BvbnNlID0ge1xuXHRcdFx0XHRcdHN0YXR1czogJ3N1Y2Nlc3MnLFxuXHRcdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRcdHVzZXJJZDogdGhpcy51c2VySWQsXG5cdFx0XHRcdFx0XHRhdXRoVG9rZW46IGF1dGgudG9rZW4sXG5cdFx0XHRcdFx0XHRtZTogZ2V0VXNlckluZm8odGhpcy51c2VyKSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGNvbnN0IGV4dHJhRGF0YSA9IHNlbGYuX2NvbmZpZy5vbkxvZ2dlZEluICYmIHNlbGYuX2NvbmZpZy5vbkxvZ2dlZEluLmNhbGwodGhpcyk7XG5cblx0XHRcdFx0aWYgKGV4dHJhRGF0YSAhPSBudWxsKSB7XG5cdFx0XHRcdFx0Xy5leHRlbmQocmVzcG9uc2UuZGF0YSwge1xuXHRcdFx0XHRcdFx0ZXh0cmE6IGV4dHJhRGF0YSxcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiByZXNwb25zZTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHRjb25zdCBsb2dvdXQgPSBmdW5jdGlvbigpIHtcblx0XHRcdC8vIFJlbW92ZSB0aGUgZ2l2ZW4gYXV0aCB0b2tlbiBmcm9tIHRoZSB1c2VyJ3MgYWNjb3VudFxuXHRcdFx0Y29uc3QgYXV0aFRva2VuID0gdGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtYXV0aC10b2tlbiddO1xuXHRcdFx0Y29uc3QgaGFzaGVkVG9rZW4gPSBBY2NvdW50cy5faGFzaExvZ2luVG9rZW4oYXV0aFRva2VuKTtcblx0XHRcdGNvbnN0IHRva2VuTG9jYXRpb24gPSBzZWxmLl9jb25maWcuYXV0aC50b2tlbjtcblx0XHRcdGNvbnN0IGluZGV4ID0gdG9rZW5Mb2NhdGlvbi5sYXN0SW5kZXhPZignLicpO1xuXHRcdFx0Y29uc3QgdG9rZW5QYXRoID0gdG9rZW5Mb2NhdGlvbi5zdWJzdHJpbmcoMCwgaW5kZXgpO1xuXHRcdFx0Y29uc3QgdG9rZW5GaWVsZE5hbWUgPSB0b2tlbkxvY2F0aW9uLnN1YnN0cmluZyhpbmRleCArIDEpO1xuXHRcdFx0Y29uc3QgdG9rZW5Ub1JlbW92ZSA9IHt9O1xuXHRcdFx0dG9rZW5Ub1JlbW92ZVt0b2tlbkZpZWxkTmFtZV0gPSBoYXNoZWRUb2tlbjtcblx0XHRcdGNvbnN0IHRva2VuUmVtb3ZhbFF1ZXJ5ID0ge307XG5cdFx0XHR0b2tlblJlbW92YWxRdWVyeVt0b2tlblBhdGhdID0gdG9rZW5Ub1JlbW92ZTtcblxuXHRcdFx0TWV0ZW9yLnVzZXJzLnVwZGF0ZSh0aGlzLnVzZXIuX2lkLCB7XG5cdFx0XHRcdCRwdWxsOiB0b2tlblJlbW92YWxRdWVyeSxcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zdCByZXNwb25zZSA9IHtcblx0XHRcdFx0c3RhdHVzOiAnc3VjY2VzcycsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRtZXNzYWdlOiAnWW91XFwndmUgYmVlbiBsb2dnZWQgb3V0IScsXG5cdFx0XHRcdH0sXG5cdFx0XHR9O1xuXG5cdFx0XHQvLyBDYWxsIHRoZSBsb2dvdXQgaG9vayB3aXRoIHRoZSBhdXRoZW50aWNhdGVkIHVzZXIgYXR0YWNoZWRcblx0XHRcdGNvbnN0IGV4dHJhRGF0YSA9IHNlbGYuX2NvbmZpZy5vbkxvZ2dlZE91dCAmJiBzZWxmLl9jb25maWcub25Mb2dnZWRPdXQuY2FsbCh0aGlzKTtcblx0XHRcdGlmIChleHRyYURhdGEgIT0gbnVsbCkge1xuXHRcdFx0XHRfLmV4dGVuZChyZXNwb25zZS5kYXRhLCB7XG5cdFx0XHRcdFx0ZXh0cmE6IGV4dHJhRGF0YSxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzcG9uc2U7XG5cdFx0fTtcblxuXHRcdC8qXG5cdFx0XHRBZGQgYSBsb2dvdXQgZW5kcG9pbnQgdG8gdGhlIEFQSVxuXHRcdFx0QWZ0ZXIgdGhlIHVzZXIgaXMgbG9nZ2VkIG91dCwgdGhlIG9uTG9nZ2VkT3V0IGhvb2sgaXMgY2FsbGVkIChzZWUgUmVzdGZ1bGx5LmNvbmZpZ3VyZSgpIGZvclxuXHRcdFx0YWRkaW5nIGhvb2spLlxuXHRcdCovXG5cdFx0cmV0dXJuIHRoaXMuYWRkUm91dGUoJ2xvZ291dCcsIHtcblx0XHRcdGF1dGhSZXF1aXJlZDogdHJ1ZSxcblx0XHR9LCB7XG5cdFx0XHRnZXQoKSB7XG5cdFx0XHRcdGNvbnNvbGUud2FybignV2FybmluZzogRGVmYXVsdCBsb2dvdXQgdmlhIEdFVCB3aWxsIGJlIHJlbW92ZWQgaW4gUmVzdGl2dXMgdjEuMC4gVXNlIFBPU1QgaW5zdGVhZC4nKTtcblx0XHRcdFx0Y29uc29sZS53YXJuKCcgICAgU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9rYWhtYWxpL21ldGVvci1yZXN0aXZ1cy9pc3N1ZXMvMTAwJyk7XG5cdFx0XHRcdHJldHVybiBsb2dvdXQuY2FsbCh0aGlzKTtcblx0XHRcdH0sXG5cdFx0XHRwb3N0OiBsb2dvdXQsXG5cdFx0fSk7XG5cdH1cbn1cblxuY29uc3QgZ2V0VXNlckF1dGggPSBmdW5jdGlvbiBfZ2V0VXNlckF1dGgoLi4uYXJncykge1xuXHRjb25zdCBpbnZhbGlkUmVzdWx0cyA9IFt1bmRlZmluZWQsIG51bGwsIGZhbHNlXTtcblx0cmV0dXJuIHtcblx0XHR0b2tlbjogJ3NlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucy5oYXNoZWRUb2tlbicsXG5cdFx0dXNlcigpIHtcblx0XHRcdGlmICh0aGlzLmJvZHlQYXJhbXMgJiYgdGhpcy5ib2R5UGFyYW1zLnBheWxvYWQpIHtcblx0XHRcdFx0dGhpcy5ib2R5UGFyYW1zID0gSlNPTi5wYXJzZSh0aGlzLmJvZHlQYXJhbXMucGF5bG9hZCk7XG5cdFx0XHR9XG5cblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgUm9ja2V0Q2hhdC5BUEkudjEuYXV0aE1ldGhvZHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0Y29uc3QgbWV0aG9kID0gUm9ja2V0Q2hhdC5BUEkudjEuYXV0aE1ldGhvZHNbaV07XG5cblx0XHRcdFx0aWYgKHR5cGVvZiBtZXRob2QgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRjb25zdCByZXN1bHQgPSBtZXRob2QuYXBwbHkodGhpcywgYXJncyk7XG5cdFx0XHRcdFx0aWYgKCFpbnZhbGlkUmVzdWx0cy5pbmNsdWRlcyhyZXN1bHQpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRsZXQgdG9rZW47XG5cdFx0XHRpZiAodGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtYXV0aC10b2tlbiddKSB7XG5cdFx0XHRcdHRva2VuID0gQWNjb3VudHMuX2hhc2hMb2dpblRva2VuKHRoaXMucmVxdWVzdC5oZWFkZXJzWyd4LWF1dGgtdG9rZW4nXSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHVzZXJJZDogdGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtdXNlci1pZCddLFxuXHRcdFx0XHR0b2tlbixcblx0XHRcdH07XG5cdFx0fSxcblx0fTtcbn07XG5cblJvY2tldENoYXQuQVBJID0ge1xuXHRoZWxwZXJNZXRob2RzOiBuZXcgTWFwKCksXG5cdGdldFVzZXJBdXRoLFxuXHRBcGlDbGFzczogQVBJLFxufTtcblxuY29uc3QgZGVmYXVsdE9wdGlvbnNFbmRwb2ludCA9IGZ1bmN0aW9uIF9kZWZhdWx0T3B0aW9uc0VuZHBvaW50KCkge1xuXHRpZiAodGhpcy5yZXF1ZXN0Lm1ldGhvZCA9PT0gJ09QVElPTlMnICYmIHRoaXMucmVxdWVzdC5oZWFkZXJzWydhY2Nlc3MtY29udHJvbC1yZXF1ZXN0LW1ldGhvZCddKSB7XG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRW5hYmxlX0NPUlMnKSA9PT0gdHJ1ZSkge1xuXHRcdFx0dGhpcy5yZXNwb25zZS53cml0ZUhlYWQoMjAwLCB7XG5cdFx0XHRcdCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX0NPUlNfT3JpZ2luJyksXG5cdFx0XHRcdCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ09yaWdpbiwgWC1SZXF1ZXN0ZWQtV2l0aCwgQ29udGVudC1UeXBlLCBBY2NlcHQsIFgtVXNlci1JZCwgWC1BdXRoLVRva2VuJyxcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnJlc3BvbnNlLndyaXRlSGVhZCg0MDUpO1xuXHRcdFx0dGhpcy5yZXNwb25zZS53cml0ZSgnQ09SUyBub3QgZW5hYmxlZC4gR28gdG8gXCJBZG1pbiA+IEdlbmVyYWwgPiBSRVNUIEFwaVwiIHRvIGVuYWJsZSBpdC4nKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5yZXNwb25zZS53cml0ZUhlYWQoNDA0KTtcblx0fVxuXHR0aGlzLmRvbmUoKTtcbn07XG5cbmNvbnN0IGNyZWF0ZUFwaSA9IGZ1bmN0aW9uIF9jcmVhdGVBcGkoZW5hYmxlQ29ycykge1xuXHRpZiAoIVJvY2tldENoYXQuQVBJLnYxIHx8IFJvY2tldENoYXQuQVBJLnYxLl9jb25maWcuZW5hYmxlQ29ycyAhPT0gZW5hYmxlQ29ycykge1xuXHRcdFJvY2tldENoYXQuQVBJLnYxID0gbmV3IEFQSSh7XG5cdFx0XHR2ZXJzaW9uOiAndjEnLFxuXHRcdFx0dXNlRGVmYXVsdEF1dGg6IHRydWUsXG5cdFx0XHRwcmV0dHlKc29uOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50Jyxcblx0XHRcdGVuYWJsZUNvcnMsXG5cdFx0XHRkZWZhdWx0T3B0aW9uc0VuZHBvaW50LFxuXHRcdFx0YXV0aDogZ2V0VXNlckF1dGgoKSxcblx0XHR9KTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5BUEkuZGVmYXVsdCB8fCBSb2NrZXRDaGF0LkFQSS5kZWZhdWx0Ll9jb25maWcuZW5hYmxlQ29ycyAhPT0gZW5hYmxlQ29ycykge1xuXHRcdFJvY2tldENoYXQuQVBJLmRlZmF1bHQgPSBuZXcgQVBJKHtcblx0XHRcdHVzZURlZmF1bHRBdXRoOiB0cnVlLFxuXHRcdFx0cHJldHR5SnNvbjogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcsXG5cdFx0XHRlbmFibGVDb3JzLFxuXHRcdFx0ZGVmYXVsdE9wdGlvbnNFbmRwb2ludCxcblx0XHRcdGF1dGg6IGdldFVzZXJBdXRoKCksXG5cdFx0fSk7XG5cdH1cbn07XG5cbi8vIHJlZ2lzdGVyIHRoZSBBUEkgdG8gYmUgcmUtY3JlYXRlZCBvbmNlIHRoZSBDT1JTLXNldHRpbmcgY2hhbmdlcy5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRW5hYmxlX0NPUlMnLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRjcmVhdGVBcGkodmFsdWUpO1xufSk7XG5cbi8vIGFsc28gY3JlYXRlIHRoZSBBUEkgaW1tZWRpYXRlbHlcbmNyZWF0ZUFwaSghIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRW5hYmxlX0NPUlMnKSk7XG4iLCJSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdHZW5lcmFsJywgZnVuY3Rpb24oKSB7XG5cdHRoaXMuc2VjdGlvbignUkVTVCBBUEknLCBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmFkZCgnQVBJX1VwcGVyX0NvdW50X0xpbWl0JywgMTAwLCB7IHR5cGU6ICdpbnQnLCBwdWJsaWM6IGZhbHNlIH0pO1xuXHRcdHRoaXMuYWRkKCdBUElfRGVmYXVsdF9Db3VudCcsIDUwLCB7IHR5cGU6ICdpbnQnLCBwdWJsaWM6IGZhbHNlIH0pO1xuXHRcdHRoaXMuYWRkKCdBUElfQWxsb3dfSW5maW5pdGVfQ291bnQnLCB0cnVlLCB7IHR5cGU6ICdib29sZWFuJywgcHVibGljOiBmYWxzZSB9KTtcblx0XHR0aGlzLmFkZCgnQVBJX0VuYWJsZV9EaXJlY3RfTWVzc2FnZV9IaXN0b3J5X0VuZFBvaW50JywgZmFsc2UsIHsgdHlwZTogJ2Jvb2xlYW4nLCBwdWJsaWM6IGZhbHNlIH0pO1xuXHRcdHRoaXMuYWRkKCdBUElfRW5hYmxlX1NoaWVsZHMnLCB0cnVlLCB7IHR5cGU6ICdib29sZWFuJywgcHVibGljOiBmYWxzZSB9KTtcblx0XHR0aGlzLmFkZCgnQVBJX1NoaWVsZF9UeXBlcycsICcqJywgeyB0eXBlOiAnc3RyaW5nJywgcHVibGljOiBmYWxzZSwgZW5hYmxlUXVlcnk6IHsgX2lkOiAnQVBJX0VuYWJsZV9TaGllbGRzJywgdmFsdWU6IHRydWUgfSB9KTtcblx0XHR0aGlzLmFkZCgnQVBJX0VuYWJsZV9DT1JTJywgZmFsc2UsIHsgdHlwZTogJ2Jvb2xlYW4nLCBwdWJsaWM6IGZhbHNlIH0pO1xuXHRcdHRoaXMuYWRkKCdBUElfQ09SU19PcmlnaW4nLCAnKicsIHsgdHlwZTogJ3N0cmluZycsIHB1YmxpYzogZmFsc2UsIGVuYWJsZVF1ZXJ5OiB7IF9pZDogJ0FQSV9FbmFibGVfQ09SUycsIHZhbHVlOiB0cnVlIH0gfSk7XG5cdH0pO1xufSk7XG4iLCJSb2NrZXRDaGF0LkFQSS5oZWxwZXJNZXRob2RzLnNldCgncmVxdWVzdFBhcmFtcycsIGZ1bmN0aW9uIF9yZXF1ZXN0UGFyYW1zKCkge1xuXHRyZXR1cm4gWydQT1NUJywgJ1BVVCddLmluY2x1ZGVzKHRoaXMucmVxdWVzdC5tZXRob2QpID8gdGhpcy5ib2R5UGFyYW1zIDogdGhpcy5xdWVyeVBhcmFtcztcbn0pO1xuIiwiLy8gSWYgdGhlIGNvdW50IHF1ZXJ5IHBhcmFtIGlzIGhpZ2hlciB0aGFuIHRoZSBcIkFQSV9VcHBlcl9Db3VudF9MaW1pdFwiIHNldHRpbmcsIHRoZW4gd2UgbGltaXQgdGhhdFxuLy8gSWYgdGhlIGNvdW50IHF1ZXJ5IHBhcmFtIGlzbid0IGRlZmluZWQsIHRoZW4gd2Ugc2V0IGl0IHRvIHRoZSBcIkFQSV9EZWZhdWx0X0NvdW50XCIgc2V0dGluZ1xuLy8gSWYgdGhlIGNvdW50IGlzIHplcm8sIHRoZW4gdGhhdCBtZWFucyB1bmxpbWl0ZWQgYW5kIGlzIG9ubHkgYWxsb3dlZCBpZiB0aGUgc2V0dGluZyBcIkFQSV9BbGxvd19JbmZpbml0ZV9Db3VudFwiIGlzIHRydWVcblxuUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcy5zZXQoJ2dldFBhZ2luYXRpb25JdGVtcycsIGZ1bmN0aW9uIF9nZXRQYWdpbmF0aW9uSXRlbXMoKSB7XG5cdGNvbnN0IGhhcmRVcHBlckxpbWl0ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FQSV9VcHBlcl9Db3VudF9MaW1pdCcpIDw9IDAgPyAxMDAgOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX1VwcGVyX0NvdW50X0xpbWl0Jyk7XG5cdGNvbnN0IGRlZmF1bHRDb3VudCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRGVmYXVsdF9Db3VudCcpIDw9IDAgPyA1MCA6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRGVmYXVsdF9Db3VudCcpO1xuXHRjb25zdCBvZmZzZXQgPSB0aGlzLnF1ZXJ5UGFyYW1zLm9mZnNldCA/IHBhcnNlSW50KHRoaXMucXVlcnlQYXJhbXMub2Zmc2V0KSA6IDA7XG5cdGxldCBjb3VudCA9IGRlZmF1bHRDb3VudDtcblxuXHQvLyBFbnN1cmUgY291bnQgaXMgYW4gYXBwcm9waWF0ZSBhbW91bnRcblx0aWYgKHR5cGVvZiB0aGlzLnF1ZXJ5UGFyYW1zLmNvdW50ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdGNvdW50ID0gcGFyc2VJbnQodGhpcy5xdWVyeVBhcmFtcy5jb3VudCk7XG5cdH0gZWxzZSB7XG5cdFx0Y291bnQgPSBkZWZhdWx0Q291bnQ7XG5cdH1cblxuXHRpZiAoY291bnQgPiBoYXJkVXBwZXJMaW1pdCkge1xuXHRcdGNvdW50ID0gaGFyZFVwcGVyTGltaXQ7XG5cdH1cblxuXHRpZiAoY291bnQgPT09IDAgJiYgIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfQWxsb3dfSW5maW5pdGVfQ291bnQnKSkge1xuXHRcdGNvdW50ID0gZGVmYXVsdENvdW50O1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRvZmZzZXQsXG5cdFx0Y291bnQsXG5cdH07XG59KTtcbiIsIi8vIENvbnZlbmllbmNlIG1ldGhvZCwgYWxtb3N0IG5lZWQgdG8gdHVybiBpdCBpbnRvIGEgbWlkZGxld2FyZSBvZiBzb3J0c1xuUm9ja2V0Q2hhdC5BUEkuaGVscGVyTWV0aG9kcy5zZXQoJ2dldFVzZXJGcm9tUGFyYW1zJywgZnVuY3Rpb24gX2dldFVzZXJGcm9tUGFyYW1zKCkge1xuXHRjb25zdCBkb2VzbnRFeGlzdCA9IHsgX2RvZXNudEV4aXN0OiB0cnVlIH07XG5cdGxldCB1c2VyO1xuXHRjb25zdCBwYXJhbXMgPSB0aGlzLnJlcXVlc3RQYXJhbXMoKTtcblxuXHRpZiAocGFyYW1zLnVzZXJJZCAmJiBwYXJhbXMudXNlcklkLnRyaW0oKSkge1xuXHRcdHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChwYXJhbXMudXNlcklkKSB8fCBkb2VzbnRFeGlzdDtcblx0fSBlbHNlIGlmIChwYXJhbXMudXNlcm5hbWUgJiYgcGFyYW1zLnVzZXJuYW1lLnRyaW0oKSkge1xuXHRcdHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlVc2VybmFtZShwYXJhbXMudXNlcm5hbWUpIHx8IGRvZXNudEV4aXN0O1xuXHR9IGVsc2UgaWYgKHBhcmFtcy51c2VyICYmIHBhcmFtcy51c2VyLnRyaW0oKSkge1xuXHRcdHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlVc2VybmFtZShwYXJhbXMudXNlcikgfHwgZG9lc250RXhpc3Q7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItdXNlci1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwidXNlcklkXCIgb3IgXCJ1c2VybmFtZVwiIHBhcmFtIHdhcyBub3QgcHJvdmlkZWQnKTtcblx0fVxuXG5cdGlmICh1c2VyLl9kb2VzbnRFeGlzdCkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdUaGUgcmVxdWlyZWQgXCJ1c2VySWRcIiBvciBcInVzZXJuYW1lXCIgcGFyYW0gcHJvdmlkZWQgZG9lcyBub3QgbWF0Y2ggYW55IHVzZXJzJyk7XG5cdH1cblxuXHRyZXR1cm4gdXNlcjtcbn0pO1xuIiwiY29uc3QgZ2V0SW5mb0Zyb21Vc2VyT2JqZWN0ID0gKHVzZXIpID0+IHtcblx0Y29uc3Qge1xuXHRcdF9pZCxcblx0XHRuYW1lLFxuXHRcdGVtYWlscyxcblx0XHRzdGF0dXMsXG5cdFx0c3RhdHVzQ29ubmVjdGlvbixcblx0XHR1c2VybmFtZSxcblx0XHR1dGNPZmZzZXQsXG5cdFx0YWN0aXZlLFxuXHRcdGxhbmd1YWdlLFxuXHRcdHJvbGVzLFxuXHRcdHNldHRpbmdzLFxuXHRcdGN1c3RvbUZpZWxkcyxcblx0fSA9IHVzZXI7XG5cdHJldHVybiB7XG5cdFx0X2lkLFxuXHRcdG5hbWUsXG5cdFx0ZW1haWxzLFxuXHRcdHN0YXR1cyxcblx0XHRzdGF0dXNDb25uZWN0aW9uLFxuXHRcdHVzZXJuYW1lLFxuXHRcdHV0Y09mZnNldCxcblx0XHRhY3RpdmUsXG5cdFx0bGFuZ3VhZ2UsXG5cdFx0cm9sZXMsXG5cdFx0c2V0dGluZ3MsXG5cdFx0Y3VzdG9tRmllbGRzLFxuXHR9O1xufTtcblxuXG5Sb2NrZXRDaGF0LkFQSS5oZWxwZXJNZXRob2RzLnNldCgnZ2V0VXNlckluZm8nLCBmdW5jdGlvbiBfZ2V0VXNlckluZm8odXNlcikge1xuXHRjb25zdCBtZSA9IGdldEluZm9Gcm9tVXNlck9iamVjdCh1c2VyKTtcblx0Y29uc3QgaXNWZXJpZmllZEVtYWlsID0gKCkgPT4ge1xuXHRcdGlmIChtZSAmJiBtZS5lbWFpbHMgJiYgQXJyYXkuaXNBcnJheShtZS5lbWFpbHMpKSB7XG5cdFx0XHRyZXR1cm4gbWUuZW1haWxzLmZpbmQoKGVtYWlsKSA9PiBlbWFpbC52ZXJpZmllZCk7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fTtcblx0Y29uc3QgZ2V0VXNlclByZWZlcmVuY2VzID0gKCkgPT4ge1xuXHRcdGNvbnN0IGRlZmF1bHRVc2VyU2V0dGluZ1ByZWZpeCA9ICdBY2NvdW50c19EZWZhdWx0X1VzZXJfUHJlZmVyZW5jZXNfJztcblx0XHRjb25zdCBhbGxEZWZhdWx0VXNlclNldHRpbmdzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQobmV3IFJlZ0V4cChgXiR7IGRlZmF1bHRVc2VyU2V0dGluZ1ByZWZpeCB9LiokYCkpO1xuXG5cdFx0cmV0dXJuIGFsbERlZmF1bHRVc2VyU2V0dGluZ3MucmVkdWNlKChhY2N1bXVsYXRvciwgc2V0dGluZykgPT4ge1xuXHRcdFx0Y29uc3Qgc2V0dGluZ1dpdGhvdXRQcmVmaXggPSBzZXR0aW5nLmtleS5yZXBsYWNlKGRlZmF1bHRVc2VyU2V0dGluZ1ByZWZpeCwgJyAnKS50cmltKCk7XG5cdFx0XHRhY2N1bXVsYXRvcltzZXR0aW5nV2l0aG91dFByZWZpeF0gPSBSb2NrZXRDaGF0LmdldFVzZXJQcmVmZXJlbmNlKHVzZXIsIHNldHRpbmdXaXRob3V0UHJlZml4KTtcblx0XHRcdHJldHVybiBhY2N1bXVsYXRvcjtcblx0XHR9LCB7fSk7XG5cdH07XG5cdGNvbnN0IHZlcmlmaWVkRW1haWwgPSBpc1ZlcmlmaWVkRW1haWwoKTtcblx0bWUuZW1haWwgPSB2ZXJpZmllZEVtYWlsID8gdmVyaWZpZWRFbWFpbC5hZGRyZXNzIDogdW5kZWZpbmVkO1xuXHRtZS5zZXR0aW5ncyA9IHtcblx0XHRwcmVmZXJlbmNlczogZ2V0VXNlclByZWZlcmVuY2VzKCksXG5cdH07XG5cblx0cmV0dXJuIG1lO1xufSk7XG4iLCJSb2NrZXRDaGF0LkFQSS5oZWxwZXJNZXRob2RzLnNldCgnaXNVc2VyRnJvbVBhcmFtcycsIGZ1bmN0aW9uIF9pc1VzZXJGcm9tUGFyYW1zKCkge1xuXHRjb25zdCBwYXJhbXMgPSB0aGlzLnJlcXVlc3RQYXJhbXMoKTtcblxuXHRyZXR1cm4gKCFwYXJhbXMudXNlcklkICYmICFwYXJhbXMudXNlcm5hbWUgJiYgIXBhcmFtcy51c2VyKSB8fFxuXHRcdChwYXJhbXMudXNlcklkICYmIHRoaXMudXNlcklkID09PSBwYXJhbXMudXNlcklkKSB8fFxuXHRcdChwYXJhbXMudXNlcm5hbWUgJiYgdGhpcy51c2VyLnVzZXJuYW1lID09PSBwYXJhbXMudXNlcm5hbWUpIHx8XG5cdFx0KHBhcmFtcy51c2VyICYmIHRoaXMudXNlci51c2VybmFtZSA9PT0gcGFyYW1zLnVzZXIpO1xufSk7XG4iLCJSb2NrZXRDaGF0LkFQSS5oZWxwZXJNZXRob2RzLnNldCgncGFyc2VKc29uUXVlcnknLCBmdW5jdGlvbiBfcGFyc2VKc29uUXVlcnkoKSB7XG5cdGxldCBzb3J0O1xuXHRpZiAodGhpcy5xdWVyeVBhcmFtcy5zb3J0KSB7XG5cdFx0dHJ5IHtcblx0XHRcdHNvcnQgPSBKU09OLnBhcnNlKHRoaXMucXVlcnlQYXJhbXMuc29ydCk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0dGhpcy5sb2dnZXIud2FybihgSW52YWxpZCBzb3J0IHBhcmFtZXRlciBwcm92aWRlZCBcIiR7IHRoaXMucXVlcnlQYXJhbXMuc29ydCB9XCI6YCwgZSk7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXNvcnQnLCBgSW52YWxpZCBzb3J0IHBhcmFtZXRlciBwcm92aWRlZDogXCIkeyB0aGlzLnF1ZXJ5UGFyYW1zLnNvcnQgfVwiYCwgeyBoZWxwZXJNZXRob2Q6ICdwYXJzZUpzb25RdWVyeScgfSk7XG5cdFx0fVxuXHR9XG5cblx0bGV0IGZpZWxkcztcblx0aWYgKHRoaXMucXVlcnlQYXJhbXMuZmllbGRzKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGZpZWxkcyA9IEpTT04ucGFyc2UodGhpcy5xdWVyeVBhcmFtcy5maWVsZHMpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHRoaXMubG9nZ2VyLndhcm4oYEludmFsaWQgZmllbGRzIHBhcmFtZXRlciBwcm92aWRlZCBcIiR7IHRoaXMucXVlcnlQYXJhbXMuZmllbGRzIH1cIjpgLCBlKTtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtZmllbGRzJywgYEludmFsaWQgZmllbGRzIHBhcmFtZXRlciBwcm92aWRlZDogXCIkeyB0aGlzLnF1ZXJ5UGFyYW1zLmZpZWxkcyB9XCJgLCB7IGhlbHBlck1ldGhvZDogJ3BhcnNlSnNvblF1ZXJ5JyB9KTtcblx0XHR9XG5cdH1cblxuXHQvLyBWZXJpZnkgdGhlIHVzZXIncyBzZWxlY3RlZCBmaWVsZHMgb25seSBjb250YWlucyBvbmVzIHdoaWNoIHRoZWlyIHJvbGUgYWxsb3dzXG5cdGlmICh0eXBlb2YgZmllbGRzID09PSAnb2JqZWN0Jykge1xuXHRcdGxldCBub25TZWxlY3RhYmxlRmllbGRzID0gT2JqZWN0LmtleXMoUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSk7XG5cdFx0aWYgKHRoaXMucmVxdWVzdC5yb3V0ZS5pbmNsdWRlcygnL3YxL3VzZXJzLicpKSB7XG5cdFx0XHRjb25zdCBnZXRGaWVsZHMgPSAoKSA9PiBPYmplY3Qua2V5cyhSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWZ1bGwtb3RoZXItdXNlci1pbmZvJykgPyBSb2NrZXRDaGF0LkFQSS52MS5saW1pdGVkVXNlckZpZWxkc1RvRXhjbHVkZUlmSXNQcml2aWxlZ2VkVXNlciA6IFJvY2tldENoYXQuQVBJLnYxLmxpbWl0ZWRVc2VyRmllbGRzVG9FeGNsdWRlKTtcblx0XHRcdG5vblNlbGVjdGFibGVGaWVsZHMgPSBub25TZWxlY3RhYmxlRmllbGRzLmNvbmNhdChnZXRGaWVsZHMoKSk7XG5cdFx0fVxuXG5cdFx0T2JqZWN0LmtleXMoZmllbGRzKS5mb3JFYWNoKChrKSA9PiB7XG5cdFx0XHRpZiAobm9uU2VsZWN0YWJsZUZpZWxkcy5pbmNsdWRlcyhrKSB8fCBub25TZWxlY3RhYmxlRmllbGRzLmluY2x1ZGVzKGsuc3BsaXQoUm9ja2V0Q2hhdC5BUEkudjEuZmllbGRTZXBhcmF0b3IpWzBdKSkge1xuXHRcdFx0XHRkZWxldGUgZmllbGRzW2tdO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gTGltaXQgdGhlIGZpZWxkcyBieSBkZWZhdWx0XG5cdGZpZWxkcyA9IE9iamVjdC5hc3NpZ24oe30sIGZpZWxkcywgUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSk7XG5cdGlmICh0aGlzLnJlcXVlc3Qucm91dGUuaW5jbHVkZXMoJy92MS91c2Vycy4nKSkge1xuXHRcdGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWZ1bGwtb3RoZXItdXNlci1pbmZvJykpIHtcblx0XHRcdGZpZWxkcyA9IE9iamVjdC5hc3NpZ24oZmllbGRzLCBSb2NrZXRDaGF0LkFQSS52MS5saW1pdGVkVXNlckZpZWxkc1RvRXhjbHVkZUlmSXNQcml2aWxlZ2VkVXNlcik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZpZWxkcyA9IE9iamVjdC5hc3NpZ24oZmllbGRzLCBSb2NrZXRDaGF0LkFQSS52MS5saW1pdGVkVXNlckZpZWxkc1RvRXhjbHVkZSk7XG5cdFx0fVxuXHR9XG5cblx0bGV0IHF1ZXJ5ID0ge307XG5cdGlmICh0aGlzLnF1ZXJ5UGFyYW1zLnF1ZXJ5KSB7XG5cdFx0dHJ5IHtcblx0XHRcdHF1ZXJ5ID0gSlNPTi5wYXJzZSh0aGlzLnF1ZXJ5UGFyYW1zLnF1ZXJ5KTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHR0aGlzLmxvZ2dlci53YXJuKGBJbnZhbGlkIHF1ZXJ5IHBhcmFtZXRlciBwcm92aWRlZCBcIiR7IHRoaXMucXVlcnlQYXJhbXMucXVlcnkgfVwiOmAsIGUpO1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1xdWVyeScsIGBJbnZhbGlkIHF1ZXJ5IHBhcmFtZXRlciBwcm92aWRlZDogXCIkeyB0aGlzLnF1ZXJ5UGFyYW1zLnF1ZXJ5IH1cImAsIHsgaGVscGVyTWV0aG9kOiAncGFyc2VKc29uUXVlcnknIH0pO1xuXHRcdH1cblx0fVxuXG5cdC8vIFZlcmlmeSB0aGUgdXNlciBoYXMgcGVybWlzc2lvbiB0byBxdWVyeSB0aGUgZmllbGRzIHRoZXkgYXJlXG5cdGlmICh0eXBlb2YgcXVlcnkgPT09ICdvYmplY3QnKSB7XG5cdFx0bGV0IG5vblF1ZXJ5YWJsZUZpZWxkcyA9IE9iamVjdC5rZXlzKFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUpO1xuXHRcdGlmICh0aGlzLnJlcXVlc3Qucm91dGUuaW5jbHVkZXMoJy92MS91c2Vycy4nKSkge1xuXHRcdFx0aWYgKFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctZnVsbC1vdGhlci11c2VyLWluZm8nKSkge1xuXHRcdFx0XHRub25RdWVyeWFibGVGaWVsZHMgPSBub25RdWVyeWFibGVGaWVsZHMuY29uY2F0KE9iamVjdC5rZXlzKFJvY2tldENoYXQuQVBJLnYxLmxpbWl0ZWRVc2VyRmllbGRzVG9FeGNsdWRlSWZJc1ByaXZpbGVnZWRVc2VyKSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRub25RdWVyeWFibGVGaWVsZHMgPSBub25RdWVyeWFibGVGaWVsZHMuY29uY2F0KE9iamVjdC5rZXlzKFJvY2tldENoYXQuQVBJLnYxLmxpbWl0ZWRVc2VyRmllbGRzVG9FeGNsdWRlKSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0T2JqZWN0LmtleXMocXVlcnkpLmZvckVhY2goKGspID0+IHtcblx0XHRcdGlmIChub25RdWVyeWFibGVGaWVsZHMuaW5jbHVkZXMoaykgfHwgbm9uUXVlcnlhYmxlRmllbGRzLmluY2x1ZGVzKGsuc3BsaXQoUm9ja2V0Q2hhdC5BUEkudjEuZmllbGRTZXBhcmF0b3IpWzBdKSkge1xuXHRcdFx0XHRkZWxldGUgcXVlcnlba107XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdHNvcnQsXG5cdFx0ZmllbGRzLFxuXHRcdHF1ZXJ5LFxuXHR9O1xufSk7XG4iLCJSb2NrZXRDaGF0LkFQSS5oZWxwZXJNZXRob2RzLnNldCgnZGVwcmVjYXRpb25XYXJuaW5nJywgZnVuY3Rpb24gX2RlcHJlY2F0aW9uV2FybmluZyh7IGVuZHBvaW50LCB2ZXJzaW9uV2lsbEJlUmVtb3ZlLCByZXNwb25zZSB9KSB7XG5cdGNvbnN0IHdhcm5pbmdNZXNzYWdlID0gYFRoZSBlbmRwb2ludCBcIiR7IGVuZHBvaW50IH1cIiBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgYWZ0ZXIgdmVyc2lvbiAkeyB2ZXJzaW9uV2lsbEJlUmVtb3ZlIH1gO1xuXHRjb25zb2xlLndhcm4od2FybmluZ01lc3NhZ2UpO1xuXHRpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0d2FybmluZzogd2FybmluZ01lc3NhZ2UsXG5cdFx0XHQuLi5yZXNwb25zZSxcblx0XHR9O1xuXHR9XG5cblx0cmV0dXJuIHJlc3BvbnNlO1xufSk7XG5cbiIsIlJvY2tldENoYXQuQVBJLmhlbHBlck1ldGhvZHMuc2V0KCdnZXRMb2dnZWRJblVzZXInLCBmdW5jdGlvbiBfZ2V0TG9nZ2VkSW5Vc2VyKCkge1xuXHRsZXQgdXNlcjtcblxuXHRpZiAodGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtYXV0aC10b2tlbiddICYmIHRoaXMucmVxdWVzdC5oZWFkZXJzWyd4LXVzZXItaWQnXSkge1xuXHRcdHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHtcblx0XHRcdF9pZDogdGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtdXNlci1pZCddLFxuXHRcdFx0J3NlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucy5oYXNoZWRUb2tlbic6IEFjY291bnRzLl9oYXNoTG9naW5Ub2tlbih0aGlzLnJlcXVlc3QuaGVhZGVyc1sneC1hdXRoLXRva2VuJ10pLFxuXHRcdH0pO1xuXHR9XG5cblx0cmV0dXJuIHVzZXI7XG59KTtcbiIsIlJvY2tldENoYXQuQVBJLmhlbHBlck1ldGhvZHMuc2V0KCdpbnNlcnRVc2VyT2JqZWN0JywgZnVuY3Rpb24gX2FkZFVzZXJUb09iamVjdCh7IG9iamVjdCwgdXNlcklkIH0pIHtcblx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHVzZXJJZCk7XG5cdG9iamVjdC51c2VyID0geyB9O1xuXHRpZiAodXNlcikge1xuXHRcdG9iamVjdC51c2VyID0ge1xuXHRcdFx0X2lkOiB1c2VySWQsXG5cdFx0XHR1c2VybmFtZTogdXNlci51c2VybmFtZSxcblx0XHRcdG5hbWU6IHVzZXIubmFtZSxcblx0XHR9O1xuXHR9XG5cblxuXHRyZXR1cm4gb2JqZWN0O1xufSk7XG5cbiIsIlJvY2tldENoYXQuQVBJLmRlZmF1bHQuYWRkUm91dGUoJ2luZm8nLCB7IGF1dGhSZXF1aXJlZDogZmFsc2UgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyKCk7XG5cblx0XHRpZiAodXNlciAmJiBSb2NrZXRDaGF0LmF1dGh6Lmhhc1JvbGUodXNlci5faWQsICdhZG1pbicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRcdGluZm86IFJvY2tldENoYXQuSW5mbyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHZlcnNpb246IFJvY2tldENoYXQuSW5mby52ZXJzaW9uLFxuXHRcdH0pO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuLy8gUmV0dXJucyB0aGUgY2hhbm5lbCBJRiBmb3VuZCBvdGhlcndpc2UgaXQgd2lsbCByZXR1cm4gdGhlIGZhaWx1cmUgb2Ygd2h5IGl0IGRpZG4ndC4gQ2hlY2sgdGhlIGBzdGF0dXNDb2RlYCBwcm9wZXJ0eVxuZnVuY3Rpb24gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zLCBjaGVja2VkQXJjaGl2ZWQgPSB0cnVlIH0pIHtcblx0aWYgKCghcGFyYW1zLnJvb21JZCB8fCAhcGFyYW1zLnJvb21JZC50cmltKCkpICYmICghcGFyYW1zLnJvb21OYW1lIHx8ICFwYXJhbXMucm9vbU5hbWUudHJpbSgpKSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb21pZC1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHBhcmFtZXRlciBcInJvb21JZFwiIG9yIFwicm9vbU5hbWVcIiBpcyByZXF1aXJlZCcpO1xuXHR9XG5cblx0Y29uc3QgZmllbGRzID0geyAuLi5Sb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH07XG5cblx0bGV0IHJvb207XG5cdGlmIChwYXJhbXMucm9vbUlkKSB7XG5cdFx0cm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHBhcmFtcy5yb29tSWQsIHsgZmllbGRzIH0pO1xuXHR9IGVsc2UgaWYgKHBhcmFtcy5yb29tTmFtZSkge1xuXHRcdHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlOYW1lKHBhcmFtcy5yb29tTmFtZSwgeyBmaWVsZHMgfSk7XG5cdH1cblxuXHRpZiAoIXJvb20gfHwgcm9vbS50ICE9PSAnYycpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLW5vdC1mb3VuZCcsICdUaGUgcmVxdWlyZWQgXCJyb29tSWRcIiBvciBcInJvb21OYW1lXCIgcGFyYW0gcHJvdmlkZWQgZG9lcyBub3QgbWF0Y2ggYW55IGNoYW5uZWwnKTtcblx0fVxuXG5cdGlmIChjaGVja2VkQXJjaGl2ZWQgJiYgcm9vbS5hcmNoaXZlZCkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tYXJjaGl2ZWQnLCBgVGhlIGNoYW5uZWwsICR7IHJvb20ubmFtZSB9LCBpcyBhcmNoaXZlZGApO1xuXHR9XG5cblx0cmV0dXJuIHJvb207XG59XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5hZGRBbGwnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnYWRkQWxsVXNlclRvUm9vbScsIGZpbmRSZXN1bHQuX2lkLCB0aGlzLmJvZHlQYXJhbXMuYWN0aXZlVXNlcnNPbmx5KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNoYW5uZWw6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQuX2lkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuYWRkTW9kZXJhdG9yJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdhZGRSb29tTW9kZXJhdG9yJywgZmluZFJlc3VsdC5faWQsIHVzZXIuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmFkZE93bmVyJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdhZGRSb29tT3duZXInLCBmaW5kUmVzdWx0Ll9pZCwgdXNlci5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuYXJjaGl2ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdhcmNoaXZlUm9vbScsIGZpbmRSZXN1bHQuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmNsb3NlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0Y29uc3Qgc3ViID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQoZmluZFJlc3VsdC5faWQsIHRoaXMudXNlcklkKTtcblxuXHRcdGlmICghc3ViKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShgVGhlIHVzZXIvY2FsbGVlIGlzIG5vdCBpbiB0aGUgY2hhbm5lbCBcIiR7IGZpbmRSZXN1bHQubmFtZSB9LmApO1xuXHRcdH1cblxuXHRcdGlmICghc3ViLm9wZW4pIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBUaGUgY2hhbm5lbCwgJHsgZmluZFJlc3VsdC5uYW1lIH0sIGlzIGFscmVhZHkgY2xvc2VkIHRvIHRoZSBzZW5kZXJgKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnaGlkZVJvb20nLCBmaW5kUmVzdWx0Ll9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5jb3VudGVycycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IGFjY2VzcyA9IFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctcm9vbS1hZG1pbmlzdHJhdGlvbicpO1xuXHRcdGNvbnN0IHsgdXNlcklkIH0gPSB0aGlzLnJlcXVlc3RQYXJhbXMoKTtcblx0XHRsZXQgdXNlciA9IHRoaXMudXNlcklkO1xuXHRcdGxldCB1bnJlYWRzID0gbnVsbDtcblx0XHRsZXQgdXNlck1lbnRpb25zID0gbnVsbDtcblx0XHRsZXQgdW5yZWFkc0Zyb20gPSBudWxsO1xuXHRcdGxldCBqb2luZWQgPSBmYWxzZTtcblx0XHRsZXQgbXNncyA9IG51bGw7XG5cdFx0bGV0IGxhdGVzdCA9IG51bGw7XG5cdFx0bGV0IG1lbWJlcnMgPSBudWxsO1xuXG5cdFx0aWYgKHVzZXJJZCkge1xuXHRcdFx0aWYgKCFhY2Nlc3MpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdFx0fVxuXHRcdFx0dXNlciA9IHVzZXJJZDtcblx0XHR9XG5cdFx0Y29uc3Qgcm9vbSA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7XG5cdFx0XHRwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLFxuXHRcdFx0cmV0dXJuVXNlcm5hbWVzOiB0cnVlLFxuXHRcdH0pO1xuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHJvb20uX2lkLCB1c2VyKTtcblx0XHRjb25zdCBsbSA9IHJvb20ubG0gPyByb29tLmxtIDogcm9vbS5fdXBkYXRlZEF0O1xuXG5cdFx0aWYgKHR5cGVvZiBzdWJzY3JpcHRpb24gIT09ICd1bmRlZmluZWQnICYmIHN1YnNjcmlwdGlvbi5vcGVuKSB7XG5cdFx0XHR1bnJlYWRzID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY291bnRWaXNpYmxlQnlSb29tSWRCZXR3ZWVuVGltZXN0YW1wc0luY2x1c2l2ZShzdWJzY3JpcHRpb24ucmlkLCBzdWJzY3JpcHRpb24ubHMsIGxtKTtcblx0XHRcdHVucmVhZHNGcm9tID0gc3Vic2NyaXB0aW9uLmxzIHx8IHN1YnNjcmlwdGlvbi50cztcblx0XHRcdHVzZXJNZW50aW9ucyA9IHN1YnNjcmlwdGlvbi51c2VyTWVudGlvbnM7XG5cdFx0XHRqb2luZWQgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmIChhY2Nlc3MgfHwgam9pbmVkKSB7XG5cdFx0XHRtc2dzID0gcm9vbS5tc2dzO1xuXHRcdFx0bGF0ZXN0ID0gbG07XG5cdFx0XHRtZW1iZXJzID0gcm9vbS51c2Vyc0NvdW50O1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGpvaW5lZCxcblx0XHRcdG1lbWJlcnMsXG5cdFx0XHR1bnJlYWRzLFxuXHRcdFx0dW5yZWFkc0Zyb20sXG5cdFx0XHRtc2dzLFxuXHRcdFx0bGF0ZXN0LFxuXHRcdFx0dXNlck1lbnRpb25zLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cbi8vIENoYW5uZWwgLT4gY3JlYXRlXG5cbmZ1bmN0aW9uIGNyZWF0ZUNoYW5uZWxWYWxpZGF0b3IocGFyYW1zKSB7XG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHBhcmFtcy51c2VyLnZhbHVlLCAnY3JlYXRlLWMnKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcigndW5hdXRob3JpemVkJyk7XG5cdH1cblxuXHRpZiAoIXBhcmFtcy5uYW1lIHx8ICFwYXJhbXMubmFtZS52YWx1ZSkge1xuXHRcdHRocm93IG5ldyBFcnJvcihgUGFyYW0gXCIkeyBwYXJhbXMubmFtZS5rZXkgfVwiIGlzIHJlcXVpcmVkYCk7XG5cdH1cblxuXHRpZiAocGFyYW1zLm1lbWJlcnMgJiYgcGFyYW1zLm1lbWJlcnMudmFsdWUgJiYgIV8uaXNBcnJheShwYXJhbXMubWVtYmVycy52YWx1ZSkpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYFBhcmFtIFwiJHsgcGFyYW1zLm1lbWJlcnMua2V5IH1cIiBtdXN0IGJlIGFuIGFycmF5IGlmIHByb3ZpZGVkYCk7XG5cdH1cblxuXHRpZiAocGFyYW1zLmN1c3RvbUZpZWxkcyAmJiBwYXJhbXMuY3VzdG9tRmllbGRzLnZhbHVlICYmICEodHlwZW9mIHBhcmFtcy5jdXN0b21GaWVsZHMudmFsdWUgPT09ICdvYmplY3QnKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcihgUGFyYW0gXCIkeyBwYXJhbXMuY3VzdG9tRmllbGRzLmtleSB9XCIgbXVzdCBiZSBhbiBvYmplY3QgaWYgcHJvdmlkZWRgKTtcblx0fVxufVxuXG5mdW5jdGlvbiBjcmVhdGVDaGFubmVsKHVzZXJJZCwgcGFyYW1zKSB7XG5cdGNvbnN0IHJlYWRPbmx5ID0gdHlwZW9mIHBhcmFtcy5yZWFkT25seSAhPT0gJ3VuZGVmaW5lZCcgPyBwYXJhbXMucmVhZE9ubHkgOiBmYWxzZTtcblxuXHRsZXQgaWQ7XG5cdE1ldGVvci5ydW5Bc1VzZXIodXNlcklkLCAoKSA9PiB7XG5cdFx0aWQgPSBNZXRlb3IuY2FsbCgnY3JlYXRlQ2hhbm5lbCcsIHBhcmFtcy5uYW1lLCBwYXJhbXMubWVtYmVycyA/IHBhcmFtcy5tZW1iZXJzIDogW10sIHJlYWRPbmx5LCBwYXJhbXMuY3VzdG9tRmllbGRzKTtcblx0fSk7XG5cblx0cmV0dXJuIHtcblx0XHRjaGFubmVsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChpZC5yaWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pLFxuXHR9O1xufVxuXG5Sb2NrZXRDaGF0LkFQSS5jaGFubmVscyA9IHt9O1xuUm9ja2V0Q2hhdC5BUEkuY2hhbm5lbHMuY3JlYXRlID0ge1xuXHR2YWxpZGF0ZTogY3JlYXRlQ2hhbm5lbFZhbGlkYXRvcixcblx0ZXhlY3V0ZTogY3JlYXRlQ2hhbm5lbCxcbn07XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5jcmVhdGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgeyB1c2VySWQsIGJvZHlQYXJhbXMgfSA9IHRoaXM7XG5cblx0XHRsZXQgZXJyb3I7XG5cblx0XHR0cnkge1xuXHRcdFx0Um9ja2V0Q2hhdC5BUEkuY2hhbm5lbHMuY3JlYXRlLnZhbGlkYXRlKHtcblx0XHRcdFx0dXNlcjoge1xuXHRcdFx0XHRcdHZhbHVlOiB1c2VySWQsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG5hbWU6IHtcblx0XHRcdFx0XHR2YWx1ZTogYm9keVBhcmFtcy5uYW1lLFxuXHRcdFx0XHRcdGtleTogJ25hbWUnLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRtZW1iZXJzOiB7XG5cdFx0XHRcdFx0dmFsdWU6IGJvZHlQYXJhbXMubWVtYmVycyxcblx0XHRcdFx0XHRrZXk6ICdtZW1iZXJzJyxcblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGlmIChlLm1lc3NhZ2UgPT09ICd1bmF1dGhvcml6ZWQnKSB7XG5cdFx0XHRcdGVycm9yID0gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRlcnJvciA9IFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5tZXNzYWdlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdHJldHVybiBlcnJvcjtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcyhSb2NrZXRDaGF0LkFQSS5jaGFubmVscy5jcmVhdGUuZXhlY3V0ZSh1c2VySWQsIGJvZHlQYXJhbXMpKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuZGVsZXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2VyYXNlUm9vbScsIGZpbmRSZXN1bHQuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNoYW5uZWw6IGZpbmRSZXN1bHQsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmZpbGVzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cdFx0Y29uc3QgYWRkVXNlck9iamVjdFRvRXZlcnlPYmplY3QgPSAoZmlsZSkgPT4ge1xuXHRcdFx0aWYgKGZpbGUudXNlcklkKSB7XG5cdFx0XHRcdGZpbGUgPSB0aGlzLmluc2VydFVzZXJPYmplY3QoeyBvYmplY3Q6IGZpbGUsIHVzZXJJZDogZmlsZS51c2VySWQgfSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmlsZTtcblx0XHR9O1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2NhbkFjY2Vzc1Jvb20nLCBmaW5kUmVzdWx0Ll9pZCwgdGhpcy51c2VySWQpO1xuXHRcdH0pO1xuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCwgZmllbGRzLCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyByaWQ6IGZpbmRSZXN1bHQuX2lkIH0pO1xuXG5cdFx0Y29uc3QgZmlsZXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5VcGxvYWRzLmZpbmQob3VyUXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyBuYW1lOiAxIH0sXG5cdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRsaW1pdDogY291bnQsXG5cdFx0XHRmaWVsZHMsXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGZpbGVzOiBmaWxlcy5tYXAoYWRkVXNlck9iamVjdFRvRXZlcnlPYmplY3QpLFxuXHRcdFx0Y291bnQ6XG5cdFx0XHRmaWxlcy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kKG91clF1ZXJ5KS5jb3VudCgpLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5nZXRJbnRlZ3JhdGlvbnMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1pbnRlZ3JhdGlvbnMnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0bGV0IGluY2x1ZGVBbGxQdWJsaWNDaGFubmVscyA9IHRydWU7XG5cdFx0aWYgKHR5cGVvZiB0aGlzLnF1ZXJ5UGFyYW1zLmluY2x1ZGVBbGxQdWJsaWNDaGFubmVscyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdGluY2x1ZGVBbGxQdWJsaWNDaGFubmVscyA9IHRoaXMucXVlcnlQYXJhbXMuaW5jbHVkZUFsbFB1YmxpY0NoYW5uZWxzID09PSAndHJ1ZSc7XG5cdFx0fVxuXG5cdFx0bGV0IG91clF1ZXJ5ID0ge1xuXHRcdFx0Y2hhbm5lbDogYCMkeyBmaW5kUmVzdWx0Lm5hbWUgfWAsXG5cdFx0fTtcblxuXHRcdGlmIChpbmNsdWRlQWxsUHVibGljQ2hhbm5lbHMpIHtcblx0XHRcdG91clF1ZXJ5LmNoYW5uZWwgPSB7XG5cdFx0XHRcdCRpbjogW291clF1ZXJ5LmNoYW5uZWwsICdhbGxfcHVibGljX2NoYW5uZWxzJ10sXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIG91clF1ZXJ5KTtcblxuXHRcdGNvbnN0IGludGVncmF0aW9ucyA9IFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy5maW5kKG91clF1ZXJ5LCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgX2NyZWF0ZWRBdDogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRpbnRlZ3JhdGlvbnMsXG5cdFx0XHRjb3VudDogaW50ZWdyYXRpb25zLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZChvdXJRdWVyeSkuY291bnQoKSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuaGlzdG9yeScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0bGV0IGxhdGVzdERhdGUgPSBuZXcgRGF0ZSgpO1xuXHRcdGlmICh0aGlzLnF1ZXJ5UGFyYW1zLmxhdGVzdCkge1xuXHRcdFx0bGF0ZXN0RGF0ZSA9IG5ldyBEYXRlKHRoaXMucXVlcnlQYXJhbXMubGF0ZXN0KTtcblx0XHR9XG5cblx0XHRsZXQgb2xkZXN0RGF0ZSA9IHVuZGVmaW5lZDtcblx0XHRpZiAodGhpcy5xdWVyeVBhcmFtcy5vbGRlc3QpIHtcblx0XHRcdG9sZGVzdERhdGUgPSBuZXcgRGF0ZSh0aGlzLnF1ZXJ5UGFyYW1zLm9sZGVzdCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaW5jbHVzaXZlID0gdGhpcy5xdWVyeVBhcmFtcy5pbmNsdXNpdmUgfHwgZmFsc2U7XG5cblx0XHRsZXQgY291bnQgPSAyMDtcblx0XHRpZiAodGhpcy5xdWVyeVBhcmFtcy5jb3VudCkge1xuXHRcdFx0Y291bnQgPSBwYXJzZUludCh0aGlzLnF1ZXJ5UGFyYW1zLmNvdW50KTtcblx0XHR9XG5cblx0XHRjb25zdCB1bnJlYWRzID0gdGhpcy5xdWVyeVBhcmFtcy51bnJlYWRzIHx8IGZhbHNlO1xuXG5cdFx0bGV0IHJlc3VsdDtcblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRyZXN1bHQgPSBNZXRlb3IuY2FsbCgnZ2V0Q2hhbm5lbEhpc3RvcnknLCB7XG5cdFx0XHRcdHJpZDogZmluZFJlc3VsdC5faWQsXG5cdFx0XHRcdGxhdGVzdDogbGF0ZXN0RGF0ZSxcblx0XHRcdFx0b2xkZXN0OiBvbGRlc3REYXRlLFxuXHRcdFx0XHRpbmNsdXNpdmUsXG5cdFx0XHRcdGNvdW50LFxuXHRcdFx0XHR1bnJlYWRzLFxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRpZiAoIXJlc3VsdCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHJlc3VsdCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmluZm8nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNoYW5uZWw6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQuX2lkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuaW52aXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdhZGRVc2VyVG9Sb29tJywgeyByaWQ6IGZpbmRSZXN1bHQuX2lkLCB1c2VybmFtZTogdXNlci51c2VybmFtZSB9KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNoYW5uZWw6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQuX2lkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuam9pbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdqb2luUm9vbScsIGZpbmRSZXN1bHQuX2lkLCB0aGlzLmJvZHlQYXJhbXMuam9pbkNvZGUpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Y2hhbm5lbDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5faWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5raWNrJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdyZW1vdmVVc2VyRnJvbVJvb20nLCB7IHJpZDogZmluZFJlc3VsdC5faWQsIHVzZXJuYW1lOiB1c2VyLnVzZXJuYW1lIH0pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Y2hhbm5lbDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5faWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5sZWF2ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdsZWF2ZVJvb20nLCBmaW5kUmVzdWx0Ll9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0Ll9pZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLmxpc3QnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldDoge1xuXHRcdC8vIFRoaXMgaXMgZGVmaW5lZCBhcyBzdWNoIG9ubHkgdG8gcHJvdmlkZSBhbiBleGFtcGxlIG9mIGhvdyB0aGUgcm91dGVzIGNhbiBiZSBkZWZpbmVkIDpYXG5cdFx0YWN0aW9uKCkge1xuXHRcdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cdFx0XHRjb25zdCBoYXNQZXJtaXNzaW9uVG9TZWVBbGxQdWJsaWNDaGFubmVscyA9IFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctYy1yb29tJyk7XG5cblx0XHRcdGNvbnN0IG91clF1ZXJ5ID0geyAuLi5xdWVyeSwgdDogJ2MnIH07XG5cblx0XHRcdGlmICghaGFzUGVybWlzc2lvblRvU2VlQWxsUHVibGljQ2hhbm5lbHMpIHtcblx0XHRcdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWpvaW5lZC1yb29tJykpIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc3Qgcm9vbUlkcyA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZEJ5VXNlcklkQW5kVHlwZSh0aGlzLnVzZXJJZCwgJ2MnLCB7IGZpZWxkczogeyByaWQ6IDEgfSB9KS5mZXRjaCgpLm1hcCgocykgPT4gcy5yaWQpO1xuXHRcdFx0XHRvdXJRdWVyeS5faWQgPSB7ICRpbjogcm9vbUlkcyB9O1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBjdXJzb3IgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kKG91clF1ZXJ5LCB7XG5cdFx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyBuYW1lOiAxIH0sXG5cdFx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0XHRmaWVsZHMsXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgdG90YWwgPSBjdXJzb3IuY291bnQoKTtcblxuXHRcdFx0Y29uc3Qgcm9vbXMgPSBjdXJzb3IuZmV0Y2goKTtcblxuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0XHRjaGFubmVsczogcm9vbXMsXG5cdFx0XHRcdGNvdW50OiByb29tcy5sZW5ndGgsXG5cdFx0XHRcdG9mZnNldCxcblx0XHRcdFx0dG90YWwsXG5cdFx0XHR9KTtcblx0XHR9LFxuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5saXN0LmpvaW5lZCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcyB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Ly8gVE9ETzogQ0FDSEU6IEFkZCBCcmVhY2tpbmcgbm90aWNlIHNpbmNlIHdlIHJlbW92ZWQgdGhlIHF1ZXJ5IHBhcmFtXG5cdFx0Y29uc3QgY3Vyc29yID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5U3Vic2NyaXB0aW9uVHlwZUFuZFVzZXJJZCgnYycsIHRoaXMudXNlcklkLCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgbmFtZTogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgdG90YWxDb3VudCA9IGN1cnNvci5jb3VudCgpO1xuXHRcdGNvbnN0IHJvb21zID0gY3Vyc29yLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjaGFubmVsczogcm9vbXMsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRjb3VudDogcm9vbXMubGVuZ3RoLFxuXHRcdFx0dG90YWw6IHRvdGFsQ291bnQsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLm1lbWJlcnMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHtcblx0XHRcdHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksXG5cdFx0XHRjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlLFxuXHRcdH0pO1xuXG5cdFx0aWYgKGZpbmRSZXN1bHQuYnJvYWRjYXN0ICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWJyb2FkY2FzdC1tZW1iZXItbGlzdCcpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCA9IHt9IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCBzdWJzY3JpcHRpb25zID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kQnlSb29tSWQoZmluZFJlc3VsdC5faWQsIHtcblx0XHRcdGZpZWxkczogeyAndS5faWQnOiAxIH0sXG5cdFx0XHRzb3J0OiB7ICd1LnVzZXJuYW1lJzogc29ydC51c2VybmFtZSAhPSBudWxsID8gc29ydC51c2VybmFtZSA6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHR9KTtcblxuXHRcdGNvbnN0IHRvdGFsID0gc3Vic2NyaXB0aW9ucy5jb3VudCgpO1xuXG5cdFx0Y29uc3QgbWVtYmVycyA9IHN1YnNjcmlwdGlvbnMuZmV0Y2goKS5tYXAoKHMpID0+IHMudSAmJiBzLnUuX2lkKTtcblxuXHRcdGNvbnN0IHVzZXJzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZCh7IF9pZDogeyAkaW46IG1lbWJlcnMgfSB9LCB7XG5cdFx0XHRmaWVsZHM6IHsgX2lkOiAxLCB1c2VybmFtZTogMSwgbmFtZTogMSwgc3RhdHVzOiAxLCB1dGNPZmZzZXQ6IDEgfSxcblx0XHRcdHNvcnQ6IHsgdXNlcm5hbWU6ICBzb3J0LnVzZXJuYW1lICE9IG51bGwgPyBzb3J0LnVzZXJuYW1lIDogMSB9LFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRtZW1iZXJzOiB1c2Vycyxcblx0XHRcdGNvdW50OiB1c2Vycy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbCxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMubWVzc2FnZXMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHtcblx0XHRcdHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksXG5cdFx0XHRjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlLFxuXHRcdH0pO1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIHsgcmlkOiBmaW5kUmVzdWx0Ll9pZCB9KTtcblxuXHRcdC8vIFNwZWNpYWwgY2hlY2sgZm9yIHRoZSBwZXJtaXNzaW9uc1xuXHRcdGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWpvaW5lZC1yb29tJykgJiYgIVJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKGZpbmRSZXN1bHQuX2lkLCB0aGlzLnVzZXJJZCwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWMtcm9vbScpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgY3Vyc29yID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IHRzOiAtMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgdG90YWwgPSBjdXJzb3IuY291bnQoKTtcblx0XHRjb25zdCBtZXNzYWdlcyA9IGN1cnNvci5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZXMsXG5cdFx0XHRjb3VudDogbWVzc2FnZXMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWwsXG5cdFx0fSk7XG5cdH0sXG59KTtcbi8vIFRPRE86IENBQ0hFOiBJIGRvbnQgbGlrZSB0aGlzIG1ldGhvZCggZnVuY3Rpb25hbGl0eSBhbmQgaG93IHdlIGltcGxlbWVudGVkICkgaXRzIHZlcnkgZXhwZW5zaXZlXG4vLyBUT0RPIGNoZWNrIGlmIHRoaXMgY29kZSBpcyBiZXR0ZXIgb3Igbm90XG4vLyBSb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMub25saW5lJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuLy8gXHRnZXQoKSB7XG4vLyBcdFx0Y29uc3QgeyBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuLy8gXHRcdGNvbnN0IG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIHsgdDogJ2MnIH0pO1xuXG4vLyBcdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmUob3VyUXVlcnkpO1xuXG4vLyBcdFx0aWYgKHJvb20gPT0gbnVsbCkge1xuLy8gXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0NoYW5uZWwgZG9lcyBub3QgZXhpc3RzJyk7XG4vLyBcdFx0fVxuXG4vLyBcdFx0Y29uc3QgaWRzID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kKHsgcmlkOiByb29tLl9pZCB9LCB7IGZpZWxkczogeyAndS5faWQnOiAxIH0gfSkuZmV0Y2goKS5tYXAoc3ViID0+IHN1Yi51Ll9pZCk7XG5cbi8vIFx0XHRjb25zdCBvbmxpbmUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kKHtcbi8vIFx0XHRcdHVzZXJuYW1lOiB7ICRleGlzdHM6IDEgfSxcbi8vIFx0XHRcdF9pZDogeyAkaW46IGlkcyB9LFxuLy8gXHRcdFx0c3RhdHVzOiB7ICRpbjogWydvbmxpbmUnLCAnYXdheScsICdidXN5J10gfVxuLy8gXHRcdH0sIHtcbi8vIFx0XHRcdGZpZWxkczogeyB1c2VybmFtZTogMSB9XG4vLyBcdFx0fSkuZmV0Y2goKTtcblxuLy8gXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcbi8vIFx0XHRcdG9ubGluZVxuLy8gXHRcdH0pO1xuLy8gXHR9XG4vLyB9KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLm9ubGluZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7IHQ6ICdjJyB9KTtcblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lKG91clF1ZXJ5KTtcblxuXHRcdGlmIChyb29tID09IG51bGwpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdDaGFubmVsIGRvZXMgbm90IGV4aXN0cycpO1xuXHRcdH1cblxuXHRcdGNvbnN0IG9ubGluZSA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRVc2Vyc05vdE9mZmxpbmUoe1xuXHRcdFx0ZmllbGRzOiB7IHVzZXJuYW1lOiAxIH0sXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdGNvbnN0IG9ubGluZUluUm9vbSA9IFtdO1xuXHRcdG9ubGluZS5mb3JFYWNoKCh1c2VyKSA9PiB7XG5cdFx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChyb29tLl9pZCwgdXNlci5faWQsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXHRcdFx0aWYgKHN1YnNjcmlwdGlvbikge1xuXHRcdFx0XHRvbmxpbmVJblJvb20ucHVzaCh7XG5cdFx0XHRcdFx0X2lkOiB1c2VyLl9pZCxcblx0XHRcdFx0XHR1c2VybmFtZTogdXNlci51c2VybmFtZSxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRvbmxpbmU6IG9ubGluZUluUm9vbSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMub3BlbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblxuXHRcdGNvbnN0IHN1YiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKGZpbmRSZXN1bHQuX2lkLCB0aGlzLnVzZXJJZCk7XG5cblx0XHRpZiAoIXN1Yikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoYFRoZSB1c2VyL2NhbGxlZSBpcyBub3QgaW4gdGhlIGNoYW5uZWwgXCIkeyBmaW5kUmVzdWx0Lm5hbWUgfVwiLmApO1xuXHRcdH1cblxuXHRcdGlmIChzdWIub3Blbikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoYFRoZSBjaGFubmVsLCAkeyBmaW5kUmVzdWx0Lm5hbWUgfSwgaXMgYWxyZWFkeSBvcGVuIHRvIHRoZSBzZW5kZXJgKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnb3BlblJvb20nLCBmaW5kUmVzdWx0Ll9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5yZW1vdmVNb2RlcmF0b3InLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3JlbW92ZVJvb21Nb2RlcmF0b3InLCBmaW5kUmVzdWx0Ll9pZCwgdXNlci5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMucmVtb3ZlT3duZXInLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3JlbW92ZVJvb21Pd25lcicsIGZpbmRSZXN1bHQuX2lkLCB1c2VyLl9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5yZW5hbWUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubmFtZSB8fCAhdGhpcy5ib2R5UGFyYW1zLm5hbWUudHJpbSgpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcIm5hbWVcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHsgcm9vbUlkOiB0aGlzLmJvZHlQYXJhbXMucm9vbUlkIH0gfSk7XG5cblx0XHRpZiAoZmluZFJlc3VsdC5uYW1lID09PSB0aGlzLmJvZHlQYXJhbXMubmFtZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBjaGFubmVsIG5hbWUgaXMgdGhlIHNhbWUgYXMgd2hhdCBpdCB3b3VsZCBiZSByZW5hbWVkIHRvLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5faWQsICdyb29tTmFtZScsIHRoaXMuYm9keVBhcmFtcy5uYW1lKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNoYW5uZWw6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQuX2lkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuc2V0Q3VzdG9tRmllbGRzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLmN1c3RvbUZpZWxkcyB8fCAhKHR5cGVvZiB0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzID09PSAnb2JqZWN0JykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwiY3VzdG9tRmllbGRzXCIgaXMgcmVxdWlyZWQgd2l0aCBhIHR5cGUgbGlrZSBvYmplY3QuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQuX2lkLCAncm9vbUN1c3RvbUZpZWxkcycsIHRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Y2hhbm5lbDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5faWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5zZXREZWZhdWx0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICh0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLmRlZmF1bHQgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcImRlZmF1bHRcIiBpcyByZXF1aXJlZCcsICdlcnJvci1jaGFubmVscy1zZXRkZWZhdWx0LWlzLXNhbWUnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdGlmIChmaW5kUmVzdWx0LmRlZmF1bHQgPT09IHRoaXMuYm9keVBhcmFtcy5kZWZhdWx0KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGNoYW5uZWwgZGVmYXVsdCBzZXR0aW5nIGlzIHRoZSBzYW1lIGFzIHdoYXQgaXQgd291bGQgYmUgY2hhbmdlZCB0by4nLCAnZXJyb3ItY2hhbm5lbHMtc2V0ZGVmYXVsdC1taXNzaW5nLWRlZmF1bHQtcGFyYW0nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQuX2lkLCAnZGVmYXVsdCcsIHRoaXMuYm9keVBhcmFtcy5kZWZhdWx0LnRvU3RyaW5nKCkpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Y2hhbm5lbDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5faWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5zZXREZXNjcmlwdGlvbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5kZXNjcmlwdGlvbiB8fCAhdGhpcy5ib2R5UGFyYW1zLmRlc2NyaXB0aW9uLnRyaW0oKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJkZXNjcmlwdGlvblwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRpZiAoZmluZFJlc3VsdC5kZXNjcmlwdGlvbiA9PT0gdGhpcy5ib2R5UGFyYW1zLmRlc2NyaXB0aW9uKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGNoYW5uZWwgZGVzY3JpcHRpb24gaXMgdGhlIHNhbWUgYXMgd2hhdCBpdCB3b3VsZCBiZSBjaGFuZ2VkIHRvLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5faWQsICdyb29tRGVzY3JpcHRpb24nLCB0aGlzLmJvZHlQYXJhbXMuZGVzY3JpcHRpb24pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0ZGVzY3JpcHRpb246IHRoaXMuYm9keVBhcmFtcy5kZXNjcmlwdGlvbixcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuc2V0Sm9pbkNvZGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMuam9pbkNvZGUgfHwgIXRoaXMuYm9keVBhcmFtcy5qb2luQ29kZS50cmltKCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwiam9pbkNvZGVcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0Ll9pZCwgJ2pvaW5Db2RlJywgdGhpcy5ib2R5UGFyYW1zLmpvaW5Db2RlKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNoYW5uZWw6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQuX2lkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuc2V0UHVycG9zZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5wdXJwb3NlIHx8ICF0aGlzLmJvZHlQYXJhbXMucHVycG9zZS50cmltKCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwicHVycG9zZVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRpZiAoZmluZFJlc3VsdC5kZXNjcmlwdGlvbiA9PT0gdGhpcy5ib2R5UGFyYW1zLnB1cnBvc2UpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgY2hhbm5lbCBwdXJwb3NlIChkZXNjcmlwdGlvbikgaXMgdGhlIHNhbWUgYXMgd2hhdCBpdCB3b3VsZCBiZSBjaGFuZ2VkIHRvLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5faWQsICdyb29tRGVzY3JpcHRpb24nLCB0aGlzLmJvZHlQYXJhbXMucHVycG9zZSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRwdXJwb3NlOiB0aGlzLmJvZHlQYXJhbXMucHVycG9zZSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuc2V0UmVhZE9ubHknLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKHR5cGVvZiB0aGlzLmJvZHlQYXJhbXMucmVhZE9ubHkgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcInJlYWRPbmx5XCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdGlmIChmaW5kUmVzdWx0LnJvID09PSB0aGlzLmJvZHlQYXJhbXMucmVhZE9ubHkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgY2hhbm5lbCByZWFkIG9ubHkgc2V0dGluZyBpcyB0aGUgc2FtZSBhcyB3aGF0IGl0IHdvdWxkIGJlIGNoYW5nZWQgdG8uJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0Ll9pZCwgJ3JlYWRPbmx5JywgdGhpcy5ib2R5UGFyYW1zLnJlYWRPbmx5KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNoYW5uZWw6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQuX2lkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuc2V0VG9waWMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMudG9waWMgfHwgIXRoaXMuYm9keVBhcmFtcy50b3BpYy50cmltKCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwidG9waWNcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0aWYgKGZpbmRSZXN1bHQudG9waWMgPT09IHRoaXMuYm9keVBhcmFtcy50b3BpYykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBjaGFubmVsIHRvcGljIGlzIHRoZSBzYW1lIGFzIHdoYXQgaXQgd291bGQgYmUgY2hhbmdlZCB0by4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQuX2lkLCAncm9vbVRvcGljJywgdGhpcy5ib2R5UGFyYW1zLnRvcGljKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHRvcGljOiB0aGlzLmJvZHlQYXJhbXMudG9waWMsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYW5uZWxzLnNldEFubm91bmNlbWVudCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5hbm5vdW5jZW1lbnQgfHwgIXRoaXMuYm9keVBhcmFtcy5hbm5vdW5jZW1lbnQudHJpbSgpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcImFubm91bmNlbWVudFwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQuX2lkLCAncm9vbUFubm91bmNlbWVudCcsIHRoaXMuYm9keVBhcmFtcy5hbm5vdW5jZW1lbnQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0YW5ub3VuY2VtZW50OiB0aGlzLmJvZHlQYXJhbXMuYW5ub3VuY2VtZW50LFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5zZXRUeXBlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLnR5cGUgfHwgIXRoaXMuYm9keVBhcmFtcy50eXBlLnRyaW0oKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJ0eXBlXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZENoYW5uZWxCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSB9KTtcblxuXHRcdGlmIChmaW5kUmVzdWx0LnQgPT09IHRoaXMuYm9keVBhcmFtcy50eXBlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGNoYW5uZWwgdHlwZSBpcyB0aGUgc2FtZSBhcyB3aGF0IGl0IHdvdWxkIGJlIGNoYW5nZWQgdG8uJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0Ll9pZCwgJ3Jvb21UeXBlJywgdGhpcy5ib2R5UGFyYW1zLnR5cGUpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Y2hhbm5lbDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5faWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy51bmFyY2hpdmUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cblx0XHRpZiAoIWZpbmRSZXN1bHQuYXJjaGl2ZWQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBUaGUgY2hhbm5lbCwgJHsgZmluZFJlc3VsdC5uYW1lIH0sIGlzIG5vdCBhcmNoaXZlZGApO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCd1bmFyY2hpdmVSb29tJywgZmluZFJlc3VsdC5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhbm5lbHMuZ2V0QWxsVXNlck1lbnRpb25zQnlDaGFubmVsJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyByb29tSWQgfSA9IHRoaXMucmVxdWVzdFBhcmFtcygpO1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGlmICghcm9vbUlkKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHJlcXVlc3QgcGFyYW0gXCJyb29tSWRcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IG1lbnRpb25zID0gTWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ2dldFVzZXJNZW50aW9uc0J5Q2hhbm5lbCcsIHtcblx0XHRcdHJvb21JZCxcblx0XHRcdG9wdGlvbnM6IHtcblx0XHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IHRzOiAxIH0sXG5cdFx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0fSxcblx0XHR9KSk7XG5cblx0XHRjb25zdCBhbGxNZW50aW9ucyA9IE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdnZXRVc2VyTWVudGlvbnNCeUNoYW5uZWwnLCB7XG5cdFx0XHRyb29tSWQsXG5cdFx0XHRvcHRpb25zOiB7fSxcblx0XHR9KSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRtZW50aW9ucyxcblx0XHRcdGNvdW50OiBtZW50aW9ucy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbDogYWxsTWVudGlvbnMubGVuZ3RoLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5yb2xlcycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kQ2hhbm5lbEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpIH0pO1xuXG5cdFx0Y29uc3Qgcm9sZXMgPSBNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnZ2V0Um9vbVJvbGVzJywgZmluZFJlc3VsdC5faWQpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHJvbGVzLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGFubmVscy5tb2RlcmF0b3JzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRDaGFubmVsQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCkgfSk7XG5cblx0XHRjb25zdCBtb2RlcmF0b3JzID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kQnlSb29tSWRBbmRSb2xlcyhmaW5kUmVzdWx0Ll9pZCwgWydtb2RlcmF0b3InXSwgeyBmaWVsZHM6IHsgdTogMSB9IH0pLmZldGNoKCkubWFwKChzdWIpID0+IHN1Yi51KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG1vZGVyYXRvcnMsXG5cdFx0fSk7XG5cdH0sXG59KTtcbiIsIlJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdyb2xlcy5saXN0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3Qgcm9sZXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5maW5kKHt9LCB7IGZpZWxkczogeyBfdXBkYXRlZEF0OiAwIH0gfSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgcm9sZXMgfSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3JvbGVzLmNyZWF0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIHtcblx0XHRcdG5hbWU6IFN0cmluZyxcblx0XHRcdHNjb3BlOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0ZGVzY3JpcHRpb246IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0fSk7XG5cblx0XHRjb25zdCByb2xlRGF0YSA9IHtcblx0XHRcdG5hbWU6IHRoaXMuYm9keVBhcmFtcy5uYW1lLFxuXHRcdFx0c2NvcGU6IHRoaXMuYm9keVBhcmFtcy5zY29wZSxcblx0XHRcdGRlc2NyaXB0aW9uOiB0aGlzLmJvZHlQYXJhbXMuZGVzY3JpcHRpb24sXG5cdFx0fTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdhdXRob3JpemF0aW9uOnNhdmVSb2xlJywgcm9sZURhdGEpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0cm9sZTogUm9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuZmluZE9uZUJ5SWRPck5hbWUocm9sZURhdGEubmFtZSwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3JvbGVzLmFkZFVzZXJUb1JvbGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCB7XG5cdFx0XHRyb2xlTmFtZTogU3RyaW5nLFxuXHRcdFx0dXNlcm5hbWU6IFN0cmluZyxcblx0XHRcdHJvb21JZDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHR9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnYXV0aG9yaXphdGlvbjphZGRVc2VyVG9Sb2xlJywgdGhpcy5ib2R5UGFyYW1zLnJvbGVOYW1lLCB1c2VyLnVzZXJuYW1lLCB0aGlzLmJvZHlQYXJhbXMucm9vbUlkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHJvbGU6IFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmZpbmRPbmVCeUlkT3JOYW1lKHRoaXMuYm9keVBhcmFtcy5yb2xlTmFtZSwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSksXG5cdFx0fSk7XG5cdH0sXG59KTtcbiIsImltcG9ydCBCdXNib3kgZnJvbSAnYnVzYm95JztcblxuZnVuY3Rpb24gZmluZFJvb21CeUlkT3JOYW1lKHsgcGFyYW1zLCBjaGVja2VkQXJjaGl2ZWQgPSB0cnVlIH0pIHtcblx0aWYgKCghcGFyYW1zLnJvb21JZCB8fCAhcGFyYW1zLnJvb21JZC50cmltKCkpICYmICghcGFyYW1zLnJvb21OYW1lIHx8ICFwYXJhbXMucm9vbU5hbWUudHJpbSgpKSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb21pZC1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHBhcmFtZXRlciBcInJvb21JZFwiIG9yIFwicm9vbU5hbWVcIiBpcyByZXF1aXJlZCcpO1xuXHR9XG5cblx0Y29uc3QgZmllbGRzID0geyAuLi5Sb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH07XG5cblx0bGV0IHJvb207XG5cdGlmIChwYXJhbXMucm9vbUlkKSB7XG5cdFx0cm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHBhcmFtcy5yb29tSWQsIHsgZmllbGRzIH0pO1xuXHR9IGVsc2UgaWYgKHBhcmFtcy5yb29tTmFtZSkge1xuXHRcdHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlOYW1lKHBhcmFtcy5yb29tTmFtZSwgeyBmaWVsZHMgfSk7XG5cdH1cblx0aWYgKCFyb29tKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1ub3QtZm91bmQnLCAnVGhlIHJlcXVpcmVkIFwicm9vbUlkXCIgb3IgXCJyb29tTmFtZVwiIHBhcmFtIHByb3ZpZGVkIGRvZXMgbm90IG1hdGNoIGFueSBjaGFubmVsJyk7XG5cdH1cblx0aWYgKGNoZWNrZWRBcmNoaXZlZCAmJiByb29tLmFyY2hpdmVkKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1hcmNoaXZlZCcsIGBUaGUgY2hhbm5lbCwgJHsgcm9vbS5uYW1lIH0sIGlzIGFyY2hpdmVkYCk7XG5cdH1cblxuXHRyZXR1cm4gcm9vbTtcbn1cblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3Jvb21zLmdldCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgdXBkYXRlZFNpbmNlIH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXG5cdFx0bGV0IHVwZGF0ZWRTaW5jZURhdGU7XG5cdFx0aWYgKHVwZGF0ZWRTaW5jZSkge1xuXHRcdFx0aWYgKGlzTmFOKERhdGUucGFyc2UodXBkYXRlZFNpbmNlKSkpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItdXBkYXRlZFNpbmNlLXBhcmFtLWludmFsaWQnLCAnVGhlIFwidXBkYXRlZFNpbmNlXCIgcXVlcnkgcGFyYW1ldGVyIG11c3QgYmUgYSB2YWxpZCBkYXRlLicpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dXBkYXRlZFNpbmNlRGF0ZSA9IG5ldyBEYXRlKHVwZGF0ZWRTaW5jZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdDtcblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiByZXN1bHQgPSBNZXRlb3IuY2FsbCgncm9vbXMvZ2V0JywgdXBkYXRlZFNpbmNlRGF0ZSkpO1xuXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocmVzdWx0KSkge1xuXHRcdFx0cmVzdWx0ID0ge1xuXHRcdFx0XHR1cGRhdGU6IHJlc3VsdCxcblx0XHRcdFx0cmVtb3ZlOiBbXSxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MocmVzdWx0KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgncm9vbXMudXBsb2FkLzpyaWQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3Qgcm9vbSA9IE1ldGVvci5jYWxsKCdjYW5BY2Nlc3NSb29tJywgdGhpcy51cmxQYXJhbXMucmlkLCB0aGlzLnVzZXJJZCk7XG5cblx0XHRpZiAoIXJvb20pIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCBidXNib3kgPSBuZXcgQnVzYm95KHsgaGVhZGVyczogdGhpcy5yZXF1ZXN0LmhlYWRlcnMgfSk7XG5cdFx0Y29uc3QgZmlsZXMgPSBbXTtcblx0XHRjb25zdCBmaWVsZHMgPSB7fTtcblxuXHRcdE1ldGVvci53cmFwQXN5bmMoKGNhbGxiYWNrKSA9PiB7XG5cdFx0XHRidXNib3kub24oJ2ZpbGUnLCAoZmllbGRuYW1lLCBmaWxlLCBmaWxlbmFtZSwgZW5jb2RpbmcsIG1pbWV0eXBlKSA9PiB7XG5cdFx0XHRcdGlmIChmaWVsZG5hbWUgIT09ICdmaWxlJykge1xuXHRcdFx0XHRcdHJldHVybiBmaWxlcy5wdXNoKG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtZmllbGQnKSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBmaWxlRGF0ZSA9IFtdO1xuXHRcdFx0XHRmaWxlLm9uKCdkYXRhJywgKGRhdGEpID0+IGZpbGVEYXRlLnB1c2goZGF0YSkpO1xuXG5cdFx0XHRcdGZpbGUub24oJ2VuZCcsICgpID0+IHtcblx0XHRcdFx0XHRmaWxlcy5wdXNoKHsgZmllbGRuYW1lLCBmaWxlLCBmaWxlbmFtZSwgZW5jb2RpbmcsIG1pbWV0eXBlLCBmaWxlQnVmZmVyOiBCdWZmZXIuY29uY2F0KGZpbGVEYXRlKSB9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0YnVzYm95Lm9uKCdmaWVsZCcsIChmaWVsZG5hbWUsIHZhbHVlKSA9PiBmaWVsZHNbZmllbGRuYW1lXSA9IHZhbHVlKTtcblxuXHRcdFx0YnVzYm95Lm9uKCdmaW5pc2gnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IGNhbGxiYWNrKCkpKTtcblxuXHRcdFx0dGhpcy5yZXF1ZXN0LnBpcGUoYnVzYm95KTtcblx0XHR9KSgpO1xuXG5cdFx0aWYgKGZpbGVzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0ZpbGUgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRpZiAoZmlsZXMubGVuZ3RoID4gMSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0p1c3QgMSBmaWxlIGlzIGFsbG93ZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaWxlID0gZmlsZXNbMF07XG5cblx0XHRjb25zdCBmaWxlU3RvcmUgPSBGaWxlVXBsb2FkLmdldFN0b3JlKCdVcGxvYWRzJyk7XG5cblx0XHRjb25zdCBkZXRhaWxzID0ge1xuXHRcdFx0bmFtZTogZmlsZS5maWxlbmFtZSxcblx0XHRcdHNpemU6IGZpbGUuZmlsZUJ1ZmZlci5sZW5ndGgsXG5cdFx0XHR0eXBlOiBmaWxlLm1pbWV0eXBlLFxuXHRcdFx0cmlkOiB0aGlzLnVybFBhcmFtcy5yaWQsXG5cdFx0XHR1c2VySWQ6IHRoaXMudXNlcklkLFxuXHRcdH07XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRjb25zdCB1cGxvYWRlZEZpbGUgPSBNZXRlb3Iud3JhcEFzeW5jKGZpbGVTdG9yZS5pbnNlcnQuYmluZChmaWxlU3RvcmUpKShkZXRhaWxzLCBmaWxlLmZpbGVCdWZmZXIpO1xuXG5cdFx0XHR1cGxvYWRlZEZpbGUuZGVzY3JpcHRpb24gPSBmaWVsZHMuZGVzY3JpcHRpb247XG5cblx0XHRcdGRlbGV0ZSBmaWVsZHMuZGVzY3JpcHRpb247XG5cblx0XHRcdFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoTWV0ZW9yLmNhbGwoJ3NlbmRGaWxlTWVzc2FnZScsIHRoaXMudXJsUGFyYW1zLnJpZCwgbnVsbCwgdXBsb2FkZWRGaWxlLCBmaWVsZHMpKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3Jvb21zLnNhdmVOb3RpZmljYXRpb24nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3Qgc2F2ZU5vdGlmaWNhdGlvbnMgPSAobm90aWZpY2F0aW9ucywgcm9vbUlkKSA9PiB7XG5cdFx0XHRPYmplY3Qua2V5cyhub3RpZmljYXRpb25zKS5mb3JFYWNoKChub3RpZmljYXRpb25LZXkpID0+XG5cdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+XG5cdFx0XHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVOb3RpZmljYXRpb25TZXR0aW5ncycsIHJvb21JZCwgbm90aWZpY2F0aW9uS2V5LCBub3RpZmljYXRpb25zW25vdGlmaWNhdGlvbktleV0pXG5cdFx0XHRcdClcblx0XHRcdCk7XG5cdFx0fTtcblx0XHRjb25zdCB7IHJvb21JZCwgbm90aWZpY2F0aW9ucyB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXG5cdFx0aWYgKCFyb29tSWQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgXFwncm9vbUlkXFwnIHBhcmFtIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFub3RpZmljYXRpb25zIHx8IE9iamVjdC5rZXlzKG5vdGlmaWNhdGlvbnMpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBcXCdub3RpZmljYXRpb25zXFwnIHBhcmFtIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0c2F2ZU5vdGlmaWNhdGlvbnMobm90aWZpY2F0aW9ucywgcm9vbUlkKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3Jvb21zLmZhdm9yaXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IHsgZmF2b3JpdGUgfSA9IHRoaXMuYm9keVBhcmFtcztcblxuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLmhhc093blByb3BlcnR5KCdmYXZvcml0ZScpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIFxcJ2Zhdm9yaXRlXFwnIHBhcmFtIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm9vbSA9IGZpbmRSb29tQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5ib2R5UGFyYW1zIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3RvZ2dsZUZhdm9yaXRlJywgcm9vbS5faWQsIGZhdm9yaXRlKSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdyb29tcy5jbGVhbkhpc3RvcnknLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRSb29tQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5ib2R5UGFyYW1zIH0pO1xuXG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubGF0ZXN0KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnQm9keSBwYXJhbWV0ZXIgXCJsYXRlc3RcIiBpcyByZXF1aXJlZC4nKTtcblx0XHR9XG5cblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5vbGRlc3QpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtZXRlciBcIm9sZGVzdFwiIGlzIHJlcXVpcmVkLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGxhdGVzdCA9IG5ldyBEYXRlKHRoaXMuYm9keVBhcmFtcy5sYXRlc3QpO1xuXHRcdGNvbnN0IG9sZGVzdCA9IG5ldyBEYXRlKHRoaXMuYm9keVBhcmFtcy5vbGRlc3QpO1xuXG5cdFx0Y29uc3QgaW5jbHVzaXZlID0gdGhpcy5ib2R5UGFyYW1zLmluY2x1c2l2ZSB8fCBmYWxzZTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdjbGVhblJvb21IaXN0b3J5Jywge1xuXHRcdFx0cm9vbUlkOiBmaW5kUmVzdWx0Ll9pZCxcblx0XHRcdGxhdGVzdCxcblx0XHRcdG9sZGVzdCxcblx0XHRcdGluY2x1c2l2ZSxcblx0XHRcdGxpbWl0OiB0aGlzLmJvZHlQYXJhbXMubGltaXQsXG5cdFx0XHRleGNsdWRlUGlubmVkOiB0aGlzLmJvZHlQYXJhbXMuZXhjbHVkZVBpbm5lZCxcblx0XHRcdGZpbGVzT25seTogdGhpcy5ib2R5UGFyYW1zLmZpbGVzT25seSxcblx0XHRcdGZyb21Vc2VyczogdGhpcy5ib2R5UGFyYW1zLnVzZXJzLFxuXHRcdH0pKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuIiwiUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3N1YnNjcmlwdGlvbnMuZ2V0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyB1cGRhdGVkU2luY2UgfSA9IHRoaXMucXVlcnlQYXJhbXM7XG5cblx0XHRsZXQgdXBkYXRlZFNpbmNlRGF0ZTtcblx0XHRpZiAodXBkYXRlZFNpbmNlKSB7XG5cdFx0XHRpZiAoaXNOYU4oRGF0ZS5wYXJzZSh1cGRhdGVkU2luY2UpKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tSWQtcGFyYW0taW52YWxpZCcsICdUaGUgXCJsYXN0VXBkYXRlXCIgcXVlcnkgcGFyYW1ldGVyIG11c3QgYmUgYSB2YWxpZCBkYXRlLicpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dXBkYXRlZFNpbmNlRGF0ZSA9IG5ldyBEYXRlKHVwZGF0ZWRTaW5jZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdDtcblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiByZXN1bHQgPSBNZXRlb3IuY2FsbCgnc3Vic2NyaXB0aW9ucy9nZXQnLCB1cGRhdGVkU2luY2VEYXRlKSk7XG5cblx0XHRpZiAoQXJyYXkuaXNBcnJheShyZXN1bHQpKSB7XG5cdFx0XHRyZXN1bHQgPSB7XG5cdFx0XHRcdHVwZGF0ZTogcmVzdWx0LFxuXHRcdFx0XHRyZW1vdmU6IFtdLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcyhyZXN1bHQpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdzdWJzY3JpcHRpb25zLmdldE9uZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgcm9vbUlkIH0gPSB0aGlzLnJlcXVlc3RQYXJhbXMoKTtcblxuXHRcdGlmICghcm9vbUlkKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIFxcJ3Jvb21JZFxcJyBwYXJhbSBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHJvb21JZCwgdGhpcy51c2VySWQpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0c3Vic2NyaXB0aW9uLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cbi8qKlxuXHRUaGlzIEFQSSBpcyBzdXBwb3NlIHRvIG1hcmsgYW55IHJvb20gYXMgcmVhZC5cblxuXHRNZXRob2Q6IFBPU1Rcblx0Um91dGU6IGFwaS92MS9zdWJzY3JpcHRpb25zLnJlYWRcblx0UGFyYW1zOlxuXHRcdC0gcmlkOiBUaGUgcmlkIG9mIHRoZSByb29tIHRvIGJlIG1hcmtlZCBhcyByZWFkLlxuICovXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnc3Vic2NyaXB0aW9ucy5yZWFkJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0cmlkOiBTdHJpbmcsXG5cdFx0fSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PlxuXHRcdFx0TWV0ZW9yLmNhbGwoJ3JlYWRNZXNzYWdlcycsIHRoaXMuYm9keVBhcmFtcy5yaWQpXG5cdFx0KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3N1YnNjcmlwdGlvbnMudW5yZWFkJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IHsgcm9vbUlkLCBmaXJzdFVucmVhZE1lc3NhZ2UgfSA9IHRoaXMuYm9keVBhcmFtcztcblx0XHRpZiAoIXJvb21JZCAmJiAoZmlyc3RVbnJlYWRNZXNzYWdlICYmICFmaXJzdFVucmVhZE1lc3NhZ2UuX2lkKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0F0IGxlYXN0IG9uZSBvZiBcInJvb21JZFwiIG9yIFwiZmlyc3RVbnJlYWRNZXNzYWdlLl9pZFwiIHBhcmFtcyBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+XG5cdFx0XHRNZXRlb3IuY2FsbCgndW5yZWFkTWVzc2FnZXMnLCBmaXJzdFVucmVhZE1lc3NhZ2UsIHJvb21JZClcblx0XHQpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5cbiIsIi8qIGdsb2JhbCBwcm9jZXNzV2ViaG9va01lc3NhZ2UgKi9cblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQuZGVsZXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdG1zZ0lkOiBTdHJpbmcsXG5cdFx0XHRyb29tSWQ6IFN0cmluZyxcblx0XHRcdGFzVXNlcjogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0fSkpO1xuXG5cdFx0Y29uc3QgbXNnID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZUJ5SWQodGhpcy5ib2R5UGFyYW1zLm1zZ0lkLCB7IGZpZWxkczogeyB1OiAxLCByaWQ6IDEgfSB9KTtcblxuXHRcdGlmICghbXNnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShgTm8gbWVzc2FnZSBmb3VuZCB3aXRoIHRoZSBpZCBvZiBcIiR7IHRoaXMuYm9keVBhcmFtcy5tc2dJZCB9XCIuYCk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuYm9keVBhcmFtcy5yb29tSWQgIT09IG1zZy5yaWQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgcm9vbSBpZCBwcm92aWRlZCBkb2VzIG5vdCBtYXRjaCB3aGVyZSB0aGUgbWVzc2FnZSBpcyBmcm9tLicpO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmJvZHlQYXJhbXMuYXNVc2VyICYmIG1zZy51Ll9pZCAhPT0gdGhpcy51c2VySWQgJiYgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdmb3JjZS1kZWxldGUtbWVzc2FnZScsIG1zZy5yaWQpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVW5hdXRob3JpemVkLiBZb3UgbXVzdCBoYXZlIHRoZSBwZXJtaXNzaW9uIFwiZm9yY2UtZGVsZXRlLW1lc3NhZ2VcIiB0byBkZWxldGUgb3RoZXJcXCdzIG1lc3NhZ2UgYXMgdGhlbS4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMuYm9keVBhcmFtcy5hc1VzZXIgPyBtc2cudS5faWQgOiB0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2RlbGV0ZU1lc3NhZ2UnLCB7IF9pZDogbXNnLl9pZCB9KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdF9pZDogbXNnLl9pZCxcblx0XHRcdHRzOiBEYXRlLm5vdygpLFxuXHRcdFx0bWVzc2FnZTogbXNnLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGF0LnN5bmNNZXNzYWdlcycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgcm9vbUlkLCBsYXN0VXBkYXRlIH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXG5cdFx0aWYgKCFyb29tSWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb21JZC1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwicm9vbUlkXCIgcXVlcnkgcGFyYW0gaXMgbWlzc2luZy4nKTtcblx0XHR9XG5cblx0XHRpZiAoIWxhc3RVcGRhdGUpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWxhc3RVcGRhdGUtcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSByZXF1aXJlZCBcImxhc3RVcGRhdGVcIiBxdWVyeSBwYXJhbSBpcyBtaXNzaW5nLicpO1xuXHRcdH0gZWxzZSBpZiAoaXNOYU4oRGF0ZS5wYXJzZShsYXN0VXBkYXRlKSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb21JZC1wYXJhbS1pbnZhbGlkJywgJ1RoZSBcImxhc3RVcGRhdGVcIiBxdWVyeSBwYXJhbWV0ZXIgbXVzdCBiZSBhIHZhbGlkIGRhdGUuJyk7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdDtcblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRyZXN1bHQgPSBNZXRlb3IuY2FsbCgnbWVzc2FnZXMvZ2V0Jywgcm9vbUlkLCB7IGxhc3RVcGRhdGU6IG5ldyBEYXRlKGxhc3RVcGRhdGUpIH0pO1xuXHRcdH0pO1xuXG5cdFx0aWYgKCFyZXN1bHQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0cmVzdWx0LFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGF0LmdldE1lc3NhZ2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIXRoaXMucXVlcnlQYXJhbXMubXNnSWQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgXCJtc2dJZFwiIHF1ZXJ5IHBhcmFtZXRlciBtdXN0IGJlIHByb3ZpZGVkLicpO1xuXHRcdH1cblxuXHRcdGxldCBtc2c7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0bXNnID0gTWV0ZW9yLmNhbGwoJ2dldFNpbmdsZU1lc3NhZ2UnLCB0aGlzLnF1ZXJ5UGFyYW1zLm1zZ0lkKTtcblx0XHR9KTtcblxuXHRcdGlmICghbXNnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG1lc3NhZ2U6IG1zZyxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC5waW5NZXNzYWdlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2VJZCB8fCAhdGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2VJZC50cmltKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW1lc3NhZ2VpZC1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwibWVzc2FnZUlkXCIgcGFyYW0gaXMgbWlzc2luZy4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBtc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZCh0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkKTtcblxuXHRcdGlmICghbXNnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1tZXNzYWdlLW5vdC1mb3VuZCcsICdUaGUgcHJvdmlkZWQgXCJtZXNzYWdlSWRcIiBkb2VzIG5vdCBtYXRjaCBhbnkgZXhpc3RpbmcgbWVzc2FnZS4nKTtcblx0XHR9XG5cblx0XHRsZXQgcGlubmVkTWVzc2FnZTtcblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBwaW5uZWRNZXNzYWdlID0gTWV0ZW9yLmNhbGwoJ3Bpbk1lc3NhZ2UnLCBtc2cpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG1lc3NhZ2U6IHBpbm5lZE1lc3NhZ2UsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQucG9zdE1lc3NhZ2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgbWVzc2FnZVJldHVybiA9IHByb2Nlc3NXZWJob29rTWVzc2FnZSh0aGlzLmJvZHlQYXJhbXMsIHRoaXMudXNlciwgdW5kZWZpbmVkLCB0cnVlKVswXTtcblxuXHRcdGlmICghbWVzc2FnZVJldHVybikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ3Vua25vd24tZXJyb3InKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR0czogRGF0ZS5ub3coKSxcblx0XHRcdGNoYW5uZWw6IG1lc3NhZ2VSZXR1cm4uY2hhbm5lbCxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2VSZXR1cm4ubWVzc2FnZSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC5zZWFyY2gnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB7IHJvb21JZCwgc2VhcmNoVGV4dCB9ID0gdGhpcy5xdWVyeVBhcmFtcztcblx0XHRjb25zdCB7IGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXG5cdFx0aWYgKCFyb29tSWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb21JZC1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwicm9vbUlkXCIgcXVlcnkgcGFyYW0gaXMgbWlzc2luZy4nKTtcblx0XHR9XG5cblx0XHRpZiAoIXNlYXJjaFRleHQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXNlYXJjaFRleHQtcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSByZXF1aXJlZCBcInNlYXJjaFRleHRcIiBxdWVyeSBwYXJhbSBpcyBtaXNzaW5nLicpO1xuXHRcdH1cblxuXHRcdGxldCByZXN1bHQ7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gcmVzdWx0ID0gTWV0ZW9yLmNhbGwoJ21lc3NhZ2VTZWFyY2gnLCBzZWFyY2hUZXh0LCByb29tSWQsIGNvdW50KS5tZXNzYWdlLmRvY3MpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZXM6IHJlc3VsdCxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG4vLyBUaGUgZGlmZmVyZW5jZSBiZXR3ZWVuIGBjaGF0LnBvc3RNZXNzYWdlYCBhbmQgYGNoYXQuc2VuZE1lc3NhZ2VgIGlzIHRoYXQgYGNoYXQuc2VuZE1lc3NhZ2VgIGFsbG93c1xuLy8gZm9yIHBhc3NpbmcgYSB2YWx1ZSBmb3IgYF9pZGAgYW5kIHRoZSBvdGhlciBvbmUgZG9lc24ndC4gQWxzbywgYGNoYXQuc2VuZE1lc3NhZ2VgIG9ubHkgc2VuZHMgaXQgdG9cbi8vIG9uZSBjaGFubmVsIHdoZXJlYXMgdGhlIG90aGVyIG9uZSBhbGxvd3MgZm9yIHNlbmRpbmcgdG8gbW9yZSB0aGFuIG9uZSBjaGFubmVsIGF0IGEgdGltZS5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGF0LnNlbmRNZXNzYWdlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2UpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcGFyYW1zJywgJ1RoZSBcIm1lc3NhZ2VcIiBwYXJhbWV0ZXIgbXVzdCBiZSBwcm92aWRlZC4nKTtcblx0XHR9XG5cblx0XHRsZXQgbWVzc2FnZTtcblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBtZXNzYWdlID0gTWV0ZW9yLmNhbGwoJ3NlbmRNZXNzYWdlJywgdGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2UpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG1lc3NhZ2UsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQuc3Rhck1lc3NhZ2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkIHx8ICF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkLnRyaW0oKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItbWVzc2FnZWlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcmVxdWlyZWQgXCJtZXNzYWdlSWRcIiBwYXJhbSBpcyByZXF1aXJlZC4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBtc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZCh0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkKTtcblxuXHRcdGlmICghbXNnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1tZXNzYWdlLW5vdC1mb3VuZCcsICdUaGUgcHJvdmlkZWQgXCJtZXNzYWdlSWRcIiBkb2VzIG5vdCBtYXRjaCBhbnkgZXhpc3RpbmcgbWVzc2FnZS4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnc3Rhck1lc3NhZ2UnLCB7XG5cdFx0XHRfaWQ6IG1zZy5faWQsXG5cdFx0XHRyaWQ6IG1zZy5yaWQsXG5cdFx0XHRzdGFycmVkOiB0cnVlLFxuXHRcdH0pKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQudW5QaW5NZXNzYWdlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2VJZCB8fCAhdGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2VJZC50cmltKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW1lc3NhZ2VpZC1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwibWVzc2FnZUlkXCIgcGFyYW0gaXMgcmVxdWlyZWQuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbXNnID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZUJ5SWQodGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2VJZCk7XG5cblx0XHRpZiAoIW1zZykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItbWVzc2FnZS1ub3QtZm91bmQnLCAnVGhlIHByb3ZpZGVkIFwibWVzc2FnZUlkXCIgZG9lcyBub3QgbWF0Y2ggYW55IGV4aXN0aW5nIG1lc3NhZ2UuJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3VucGluTWVzc2FnZScsIG1zZykpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC51blN0YXJNZXNzYWdlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2VJZCB8fCAhdGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2VJZC50cmltKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW1lc3NhZ2VpZC1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwibWVzc2FnZUlkXCIgcGFyYW0gaXMgcmVxdWlyZWQuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbXNnID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZUJ5SWQodGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2VJZCk7XG5cblx0XHRpZiAoIW1zZykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItbWVzc2FnZS1ub3QtZm91bmQnLCAnVGhlIHByb3ZpZGVkIFwibWVzc2FnZUlkXCIgZG9lcyBub3QgbWF0Y2ggYW55IGV4aXN0aW5nIG1lc3NhZ2UuJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3N0YXJNZXNzYWdlJywge1xuXHRcdFx0X2lkOiBtc2cuX2lkLFxuXHRcdFx0cmlkOiBtc2cucmlkLFxuXHRcdFx0c3RhcnJlZDogZmFsc2UsXG5cdFx0fSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY2hhdC51cGRhdGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0cm9vbUlkOiBTdHJpbmcsXG5cdFx0XHRtc2dJZDogU3RyaW5nLFxuXHRcdFx0dGV4dDogU3RyaW5nLCAvLyBVc2luZyB0ZXh0IHRvIGJlIGNvbnNpc3RhbnQgd2l0aCBjaGF0LnBvc3RNZXNzYWdlXG5cdFx0fSkpO1xuXG5cdFx0Y29uc3QgbXNnID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZUJ5SWQodGhpcy5ib2R5UGFyYW1zLm1zZ0lkKTtcblxuXHRcdC8vIEVuc3VyZSB0aGUgbWVzc2FnZSBleGlzdHNcblx0XHRpZiAoIW1zZykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoYE5vIG1lc3NhZ2UgZm91bmQgd2l0aCB0aGUgaWQgb2YgXCIkeyB0aGlzLmJvZHlQYXJhbXMubXNnSWQgfVwiLmApO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmJvZHlQYXJhbXMucm9vbUlkICE9PSBtc2cucmlkKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHJvb20gaWQgcHJvdmlkZWQgZG9lcyBub3QgbWF0Y2ggd2hlcmUgdGhlIG1lc3NhZ2UgaXMgZnJvbS4nKTtcblx0XHR9XG5cblx0XHQvLyBQZXJtaXNzaW9uIGNoZWNrcyBhcmUgYWxyZWFkeSBkb25lIGluIHRoZSB1cGRhdGVNZXNzYWdlIG1ldGhvZCwgc28gbm8gbmVlZCB0byBkdXBsaWNhdGUgdGhlbVxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCd1cGRhdGVNZXNzYWdlJywgeyBfaWQ6IG1zZy5faWQsIG1zZzogdGhpcy5ib2R5UGFyYW1zLnRleHQsIHJpZDogbXNnLnJpZCB9KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG1lc3NhZ2U6IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKG1zZy5faWQpLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdjaGF0LnJlYWN0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2VJZCB8fCAhdGhpcy5ib2R5UGFyYW1zLm1lc3NhZ2VJZC50cmltKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW1lc3NhZ2VpZC1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwibWVzc2FnZUlkXCIgcGFyYW0gaXMgbWlzc2luZy4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBtc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZCh0aGlzLmJvZHlQYXJhbXMubWVzc2FnZUlkKTtcblxuXHRcdGlmICghbXNnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1tZXNzYWdlLW5vdC1mb3VuZCcsICdUaGUgcHJvdmlkZWQgXCJtZXNzYWdlSWRcIiBkb2VzIG5vdCBtYXRjaCBhbnkgZXhpc3RpbmcgbWVzc2FnZS4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBlbW9qaSA9IHRoaXMuYm9keVBhcmFtcy5lbW9qaSB8fCB0aGlzLmJvZHlQYXJhbXMucmVhY3Rpb247XG5cblx0XHRpZiAoIWVtb2ppKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1lbW9qaS1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwiZW1vamlcIiBwYXJhbSBpcyBtaXNzaW5nLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdzZXRSZWFjdGlvbicsIGVtb2ppLCBtc2cuX2lkLCB0aGlzLmJvZHlQYXJhbXMuc2hvdWxkUmVhY3QpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQuZ2V0TWVzc2FnZVJlYWRSZWNlaXB0cycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgbWVzc2FnZUlkIH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXHRcdGlmICghbWVzc2FnZUlkKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSh7XG5cdFx0XHRcdGVycm9yOiAnVGhlIHJlcXVpcmVkIFxcJ21lc3NhZ2VJZFxcJyBwYXJhbSBpcyBtaXNzaW5nLicsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgbWVzc2FnZVJlYWRSZWNlaXB0cyA9IE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdnZXRSZWFkUmVjZWlwdHMnLCB7IG1lc3NhZ2VJZCB9KSk7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRcdHJlY2VpcHRzOiBtZXNzYWdlUmVhZFJlY2VpcHRzLFxuXHRcdFx0fSk7XG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKHtcblx0XHRcdFx0ZXJyb3I6IGVycm9yLm1lc3NhZ2UsXG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQucmVwb3J0TWVzc2FnZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB7IG1lc3NhZ2VJZCwgZGVzY3JpcHRpb24gfSA9IHRoaXMuYm9keVBhcmFtcztcblx0XHRpZiAoIW1lc3NhZ2VJZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSByZXF1aXJlZCBcIm1lc3NhZ2VJZFwiIHBhcmFtIGlzIG1pc3NpbmcuJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFkZXNjcmlwdGlvbikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSByZXF1aXJlZCBcImRlc2NyaXB0aW9uXCIgcGFyYW0gaXMgbWlzc2luZy4nKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgncmVwb3J0TWVzc2FnZScsIG1lc3NhZ2VJZCwgZGVzY3JpcHRpb24pKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NoYXQuaWdub3JlVXNlcicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgcmlkLCB1c2VySWQgfSA9IHRoaXMucXVlcnlQYXJhbXM7XG5cdFx0bGV0IHsgaWdub3JlID0gdHJ1ZSB9ID0gdGhpcy5xdWVyeVBhcmFtcztcblxuXHRcdGlnbm9yZSA9IHR5cGVvZiBpZ25vcmUgPT09ICdzdHJpbmcnID8gL3RydWV8MS8udGVzdChpZ25vcmUpIDogaWdub3JlO1xuXG5cdFx0aWYgKCFyaWQgfHwgIXJpZC50cmltKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20taWQtcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSByZXF1aXJlZCBcInJpZFwiIHBhcmFtIGlzIG1pc3NpbmcuJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCF1c2VySWQgfHwgIXVzZXJJZC50cmltKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXVzZXItaWQtcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSByZXF1aXJlZCBcInVzZXJJZFwiIHBhcmFtIGlzIG1pc3NpbmcuJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ2lnbm9yZVVzZXInLCB7IHJpZCwgdXNlcklkLCBpZ25vcmUgfSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NvbW1hbmRzLmdldCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHBhcmFtcyA9IHRoaXMucXVlcnlQYXJhbXM7XG5cblx0XHRpZiAodHlwZW9mIHBhcmFtcy5jb21tYW5kICE9PSAnc3RyaW5nJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBxdWVyeSBwYXJhbSBcImNvbW1hbmRcIiBtdXN0IGJlIHByb3ZpZGVkLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGNtZCA9IFJvY2tldENoYXQuc2xhc2hDb21tYW5kcy5jb21tYW5kc1twYXJhbXMuY29tbWFuZC50b0xvd2VyQ2FzZSgpXTtcblxuXHRcdGlmICghY21kKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShgVGhlcmUgaXMgbm8gY29tbWFuZCBpbiB0aGUgc3lzdGVtIGJ5IHRoZSBuYW1lIG9mOiAkeyBwYXJhbXMuY29tbWFuZCB9YCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBjb21tYW5kOiBjbWQgfSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NvbW1hbmRzLmxpc3QnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRsZXQgY29tbWFuZHMgPSBPYmplY3QudmFsdWVzKFJvY2tldENoYXQuc2xhc2hDb21tYW5kcy5jb21tYW5kcyk7XG5cblx0XHRpZiAocXVlcnkgJiYgcXVlcnkuY29tbWFuZCkge1xuXHRcdFx0Y29tbWFuZHMgPSBjb21tYW5kcy5maWx0ZXIoKGNvbW1hbmQpID0+IGNvbW1hbmQuY29tbWFuZCA9PT0gcXVlcnkuY29tbWFuZCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdG90YWxDb3VudCA9IGNvbW1hbmRzLmxlbmd0aDtcblx0XHRjb21tYW5kcyA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLnByb2Nlc3NRdWVyeU9wdGlvbnNPblJlc3VsdChjb21tYW5kcywge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IG5hbWU6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGNvbW1hbmRzLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0Y291bnQ6IGNvbW1hbmRzLmxlbmd0aCxcblx0XHRcdHRvdGFsOiB0b3RhbENvdW50LFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cbi8vIEV4cGVjdHMgYSBib2R5IG9mOiB7IGNvbW1hbmQ6ICdnaW1tZScsIHBhcmFtczogJ2FueSBzdHJpbmcgdmFsdWUnLCByb29tSWQ6ICd2YWx1ZScgfVxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2NvbW1hbmRzLnJ1bicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBib2R5ID0gdGhpcy5ib2R5UGFyYW1zO1xuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldExvZ2dlZEluVXNlcigpO1xuXG5cdFx0aWYgKHR5cGVvZiBib2R5LmNvbW1hbmQgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnWW91IG11c3QgcHJvdmlkZSBhIGNvbW1hbmQgdG8gcnVuLicpO1xuXHRcdH1cblxuXHRcdGlmIChib2R5LnBhcmFtcyAmJiB0eXBlb2YgYm9keS5wYXJhbXMgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHBhcmFtZXRlcnMgZm9yIHRoZSBjb21tYW5kIG11c3QgYmUgYSBzaW5nbGUgc3RyaW5nLicpO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgYm9keS5yb29tSWQgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHJvb21cXCdzIGlkIHdoZXJlIHRvIGV4ZWN1dGUgdGhpcyBjb21tYW5kIG11c3QgYmUgcHJvdmlkZWQgYW5kIGJlIGEgc3RyaW5nLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGNtZCA9IGJvZHkuY29tbWFuZC50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmICghUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzW2JvZHkuY29tbWFuZC50b0xvd2VyQ2FzZSgpXSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBjb21tYW5kIHByb3ZpZGVkIGRvZXMgbm90IGV4aXN0IChvciBpcyBkaXNhYmxlZCkuJyk7XG5cdFx0fVxuXG5cdFx0Ly8gVGhpcyB3aWxsIHRocm93IGFuIGVycm9yIGlmIHRoZXkgY2FuJ3Qgb3IgdGhlIHJvb20gaXMgaW52YWxpZFxuXHRcdE1ldGVvci5jYWxsKCdjYW5BY2Nlc3NSb29tJywgYm9keS5yb29tSWQsIHVzZXIuX2lkKTtcblxuXHRcdGNvbnN0IHBhcmFtcyA9IGJvZHkucGFyYW1zID8gYm9keS5wYXJhbXMgOiAnJztcblxuXHRcdGxldCByZXN1bHQ7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih1c2VyLl9pZCwgKCkgPT4ge1xuXHRcdFx0cmVzdWx0ID0gUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLnJ1bihjbWQsIHBhcmFtcywge1xuXHRcdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0XHRyaWQ6IGJvZHkucm9vbUlkLFxuXHRcdFx0XHRtc2c6IGAvJHsgY21kIH0gJHsgcGFyYW1zIH1gLFxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHJlc3VsdCB9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnY29tbWFuZHMucHJldmlldycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Ly8gRXhwZWN0cyB0aGVzZSBxdWVyeSBwYXJhbXM6IGNvbW1hbmQ6ICdnaXBoeScsIHBhcmFtczogJ21pbmUnLCByb29tSWQ6ICd2YWx1ZSdcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyeVBhcmFtcztcblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRMb2dnZWRJblVzZXIoKTtcblxuXHRcdGlmICh0eXBlb2YgcXVlcnkuY29tbWFuZCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdZb3UgbXVzdCBwcm92aWRlIGEgY29tbWFuZCB0byBnZXQgdGhlIHByZXZpZXdzIGZyb20uJyk7XG5cdFx0fVxuXG5cdFx0aWYgKHF1ZXJ5LnBhcmFtcyAmJiB0eXBlb2YgcXVlcnkucGFyYW1zICE9PSAnc3RyaW5nJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBwYXJhbWV0ZXJzIGZvciB0aGUgY29tbWFuZCBtdXN0IGJlIGEgc2luZ2xlIHN0cmluZy4nKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIHF1ZXJ5LnJvb21JZCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgcm9vbVxcJ3MgaWQgd2hlcmUgdGhlIHByZXZpZXdzIGFyZSBiZWluZyBkaXNwbGF5ZWQgbXVzdCBiZSBwcm92aWRlZCBhbmQgYmUgYSBzdHJpbmcuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgY21kID0gcXVlcnkuY29tbWFuZC50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmICghUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzW2NtZF0pIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgY29tbWFuZCBwcm92aWRlZCBkb2VzIG5vdCBleGlzdCAob3IgaXMgZGlzYWJsZWQpLicpO1xuXHRcdH1cblxuXHRcdC8vIFRoaXMgd2lsbCB0aHJvdyBhbiBlcnJvciBpZiB0aGV5IGNhbid0IG9yIHRoZSByb29tIGlzIGludmFsaWRcblx0XHRNZXRlb3IuY2FsbCgnY2FuQWNjZXNzUm9vbScsIHF1ZXJ5LnJvb21JZCwgdXNlci5faWQpO1xuXG5cdFx0Y29uc3QgcGFyYW1zID0gcXVlcnkucGFyYW1zID8gcXVlcnkucGFyYW1zIDogJyc7XG5cblx0XHRsZXQgcHJldmlldztcblx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXIuX2lkLCAoKSA9PiB7XG5cdFx0XHRwcmV2aWV3ID0gTWV0ZW9yLmNhbGwoJ2dldFNsYXNoQ29tbWFuZFByZXZpZXdzJywgeyBjbWQsIHBhcmFtcywgbXNnOiB7IHJpZDogcXVlcnkucm9vbUlkIH0gfSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHByZXZpZXcgfSk7XG5cdH0sXG5cdC8vIEV4cGVjdHMgYSBib2R5IGZvcm1hdCBvZjogeyBjb21tYW5kOiAnZ2lwaHknLCBwYXJhbXM6ICdtaW5lJywgcm9vbUlkOiAndmFsdWUnLCBwcmV2aWV3SXRlbTogeyBpZDogJ3NhZGY4JyB0eXBlOiAnaW1hZ2UnLCB2YWx1ZTogJ2h0dHBzOi8vZGV2Lm51bGwvZ2lmIH0gfVxuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGJvZHkgPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyKCk7XG5cblx0XHRpZiAodHlwZW9mIGJvZHkuY29tbWFuZCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdZb3UgbXVzdCBwcm92aWRlIGEgY29tbWFuZCB0byBydW4gdGhlIHByZXZpZXcgaXRlbSBvbi4nKTtcblx0XHR9XG5cblx0XHRpZiAoYm9keS5wYXJhbXMgJiYgdHlwZW9mIGJvZHkucGFyYW1zICE9PSAnc3RyaW5nJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBwYXJhbWV0ZXJzIGZvciB0aGUgY29tbWFuZCBtdXN0IGJlIGEgc2luZ2xlIHN0cmluZy4nKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIGJvZHkucm9vbUlkICE9PSAnc3RyaW5nJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSByb29tXFwncyBpZCB3aGVyZSB0aGUgcHJldmlldyBpcyBiZWluZyBleGVjdXRlZCBpbiBtdXN0IGJlIHByb3ZpZGVkIGFuZCBiZSBhIHN0cmluZy4nKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIGJvZHkucHJldmlld0l0ZW0gPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIHByZXZpZXcgaXRlbSBiZWluZyBleGVjdXRlZCBtdXN0IGJlIHByb3ZpZGVkLicpO1xuXHRcdH1cblxuXHRcdGlmICghYm9keS5wcmV2aWV3SXRlbS5pZCB8fCAhYm9keS5wcmV2aWV3SXRlbS50eXBlIHx8IHR5cGVvZiBib2R5LnByZXZpZXdJdGVtLnZhbHVlID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBwcmV2aWV3IGl0ZW0gYmVpbmcgZXhlY3V0ZWQgaXMgaW4gdGhlIHdyb25nIGZvcm1hdC4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBjbWQgPSBib2R5LmNvbW1hbmQudG9Mb3dlckNhc2UoKTtcblx0XHRpZiAoIVJvY2tldENoYXQuc2xhc2hDb21tYW5kcy5jb21tYW5kc1tjbWRdKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGNvbW1hbmQgcHJvdmlkZWQgZG9lcyBub3QgZXhpc3QgKG9yIGlzIGRpc2FibGVkKS4nKTtcblx0XHR9XG5cblx0XHQvLyBUaGlzIHdpbGwgdGhyb3cgYW4gZXJyb3IgaWYgdGhleSBjYW4ndCBvciB0aGUgcm9vbSBpcyBpbnZhbGlkXG5cdFx0TWV0ZW9yLmNhbGwoJ2NhbkFjY2Vzc1Jvb20nLCBib2R5LnJvb21JZCwgdXNlci5faWQpO1xuXG5cdFx0Y29uc3QgcGFyYW1zID0gYm9keS5wYXJhbXMgPyBib2R5LnBhcmFtcyA6ICcnO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih1c2VyLl9pZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2V4ZWN1dGVTbGFzaENvbW1hbmRQcmV2aWV3JywgeyBjbWQsIHBhcmFtcywgbXNnOiB7IHJpZDogYm9keS5yb29tSWQgfSB9LCBib2R5LnByZXZpZXdJdGVtKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcbiIsIlJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdlbW9qaS1jdXN0b20nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBlbW9qaXMgPSBNZXRlb3IuY2FsbCgnbGlzdEVtb2ppQ3VzdG9tJyk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IGVtb2ppcyB9KTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbi8vIFJldHVybnMgdGhlIHByaXZhdGUgZ3JvdXAgc3Vic2NyaXB0aW9uIElGIGZvdW5kIG90aGVyd2lzZSBpdCB3aWxsIHJldHVybiB0aGUgZmFpbHVyZSBvZiB3aHkgaXQgZGlkbid0LiBDaGVjayB0aGUgYHN0YXR1c0NvZGVgIHByb3BlcnR5XG5mdW5jdGlvbiBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtcywgdXNlcklkLCBjaGVja2VkQXJjaGl2ZWQgPSB0cnVlIH0pIHtcblx0aWYgKCghcGFyYW1zLnJvb21JZCB8fCAhcGFyYW1zLnJvb21JZC50cmltKCkpICYmICghcGFyYW1zLnJvb21OYW1lIHx8ICFwYXJhbXMucm9vbU5hbWUudHJpbSgpKSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tcGFyYW0tbm90LXByb3ZpZGVkJywgJ1RoZSBwYXJhbWV0ZXIgXCJyb29tSWRcIiBvciBcInJvb21OYW1lXCIgaXMgcmVxdWlyZWQnKTtcblx0fVxuXG5cdGxldCByb29tU3ViO1xuXHRpZiAocGFyYW1zLnJvb21JZCkge1xuXHRcdHJvb21TdWIgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChwYXJhbXMucm9vbUlkLCB1c2VySWQpO1xuXHR9IGVsc2UgaWYgKHBhcmFtcy5yb29tTmFtZSkge1xuXHRcdHJvb21TdWIgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21OYW1lQW5kVXNlcklkKHBhcmFtcy5yb29tTmFtZSwgdXNlcklkKTtcblx0fVxuXG5cdGlmICghcm9vbVN1YiB8fCByb29tU3ViLnQgIT09ICdwJykge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tbm90LWZvdW5kJywgJ1RoZSByZXF1aXJlZCBcInJvb21JZFwiIG9yIFwicm9vbU5hbWVcIiBwYXJhbSBwcm92aWRlZCBkb2VzIG5vdCBtYXRjaCBhbnkgZ3JvdXAnKTtcblx0fVxuXG5cdGlmIChjaGVja2VkQXJjaGl2ZWQgJiYgcm9vbVN1Yi5hcmNoaXZlZCkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tYXJjaGl2ZWQnLCBgVGhlIHByaXZhdGUgZ3JvdXAsICR7IHJvb21TdWIubmFtZSB9LCBpcyBhcmNoaXZlZGApO1xuXHR9XG5cblx0cmV0dXJuIHJvb21TdWI7XG59XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuYWRkQWxsJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnYWRkQWxsVXNlclRvUm9vbScsIGZpbmRSZXN1bHQucmlkLCB0aGlzLmJvZHlQYXJhbXMuYWN0aXZlVXNlcnNPbmx5KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGdyb3VwOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0LnJpZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5hZGRNb2RlcmF0b3InLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnYWRkUm9vbU1vZGVyYXRvcicsIGZpbmRSZXN1bHQucmlkLCB1c2VyLl9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuYWRkT3duZXInLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnYWRkUm9vbU93bmVyJywgZmluZFJlc3VsdC5yaWQsIHVzZXIuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5hZGRMZWFkZXInLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdhZGRSb29tTGVhZGVyJywgZmluZFJlc3VsdC5yaWQsIHVzZXIuX2lkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuLy8gQXJjaGl2ZXMgYSBwcml2YXRlIGdyb3VwIG9ubHkgaWYgaXQgd2Fzbid0XG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmFyY2hpdmUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdhcmNoaXZlUm9vbScsIGZpbmRSZXN1bHQucmlkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5jbG9zZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0aWYgKCFmaW5kUmVzdWx0Lm9wZW4pIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGBUaGUgcHJpdmF0ZSBncm91cCwgJHsgZmluZFJlc3VsdC5uYW1lIH0sIGlzIGFscmVhZHkgY2xvc2VkIHRvIHRoZSBzZW5kZXJgKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnaGlkZVJvb20nLCBmaW5kUmVzdWx0LnJpZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuY291bnRlcnMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBhY2Nlc3MgPSBSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LXJvb20tYWRtaW5pc3RyYXRpb24nKTtcblx0XHRjb25zdCBwYXJhbXMgPSB0aGlzLnJlcXVlc3RQYXJhbXMoKTtcblx0XHRsZXQgdXNlciA9IHRoaXMudXNlcklkO1xuXHRcdGxldCByb29tO1xuXHRcdGxldCB1bnJlYWRzID0gbnVsbDtcblx0XHRsZXQgdXNlck1lbnRpb25zID0gbnVsbDtcblx0XHRsZXQgdW5yZWFkc0Zyb20gPSBudWxsO1xuXHRcdGxldCBqb2luZWQgPSBmYWxzZTtcblx0XHRsZXQgbXNncyA9IG51bGw7XG5cdFx0bGV0IGxhdGVzdCA9IG51bGw7XG5cdFx0bGV0IG1lbWJlcnMgPSBudWxsO1xuXG5cdFx0aWYgKCghcGFyYW1zLnJvb21JZCB8fCAhcGFyYW1zLnJvb21JZC50cmltKCkpICYmICghcGFyYW1zLnJvb21OYW1lIHx8ICFwYXJhbXMucm9vbU5hbWUudHJpbSgpKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHBhcmFtZXRlciBcInJvb21JZFwiIG9yIFwicm9vbU5hbWVcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGlmIChwYXJhbXMucm9vbUlkKSB7XG5cdFx0XHRyb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocGFyYW1zLnJvb21JZCk7XG5cdFx0fSBlbHNlIGlmIChwYXJhbXMucm9vbU5hbWUpIHtcblx0XHRcdHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlOYW1lKHBhcmFtcy5yb29tTmFtZSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFyb29tIHx8IHJvb20udCAhPT0gJ3AnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLW5vdC1mb3VuZCcsICdUaGUgcmVxdWlyZWQgXCJyb29tSWRcIiBvciBcInJvb21OYW1lXCIgcGFyYW0gcHJvdmlkZWQgZG9lcyBub3QgbWF0Y2ggYW55IGdyb3VwJyk7XG5cdFx0fVxuXG5cdFx0aWYgKHJvb20uYXJjaGl2ZWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tYXJjaGl2ZWQnLCBgVGhlIHByaXZhdGUgZ3JvdXAsICR7IHJvb20ubmFtZSB9LCBpcyBhcmNoaXZlZGApO1xuXHRcdH1cblxuXHRcdGlmIChwYXJhbXMudXNlcklkKSB7XG5cdFx0XHRpZiAoIWFjY2Vzcykge1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0XHR9XG5cdFx0XHR1c2VyID0gcGFyYW1zLnVzZXJJZDtcblx0XHR9XG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocm9vbS5faWQsIHVzZXIpO1xuXHRcdGNvbnN0IGxtID0gcm9vbS5sbSA/IHJvb20ubG0gOiByb29tLl91cGRhdGVkQXQ7XG5cblx0XHRpZiAodHlwZW9mIHN1YnNjcmlwdGlvbiAhPT0gJ3VuZGVmaW5lZCcgJiYgc3Vic2NyaXB0aW9uLm9wZW4pIHtcblx0XHRcdGlmIChzdWJzY3JpcHRpb24ubHMpIHtcblx0XHRcdFx0dW5yZWFkcyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNvdW50VmlzaWJsZUJ5Um9vbUlkQmV0d2VlblRpbWVzdGFtcHNJbmNsdXNpdmUoc3Vic2NyaXB0aW9uLnJpZCwgc3Vic2NyaXB0aW9uLmxzLCBsbSk7XG5cdFx0XHRcdHVucmVhZHNGcm9tID0gc3Vic2NyaXB0aW9uLmxzO1xuXHRcdFx0fVxuXHRcdFx0dXNlck1lbnRpb25zID0gc3Vic2NyaXB0aW9uLnVzZXJNZW50aW9ucztcblx0XHRcdGpvaW5lZCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0aWYgKGFjY2VzcyB8fCBqb2luZWQpIHtcblx0XHRcdG1zZ3MgPSByb29tLm1zZ3M7XG5cdFx0XHRsYXRlc3QgPSBsbTtcblx0XHRcdG1lbWJlcnMgPSByb29tLnVzZXJzQ291bnQ7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0am9pbmVkLFxuXHRcdFx0bWVtYmVycyxcblx0XHRcdHVucmVhZHMsXG5cdFx0XHR1bnJlYWRzRnJvbSxcblx0XHRcdG1zZ3MsXG5cdFx0XHRsYXRlc3QsXG5cdFx0XHR1c2VyTWVudGlvbnMsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuLy8gQ3JlYXRlIFByaXZhdGUgR3JvdXBcblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuY3JlYXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnY3JlYXRlLXAnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLm5hbWUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtIFwibmFtZVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuYm9keVBhcmFtcy5tZW1iZXJzICYmICFfLmlzQXJyYXkodGhpcy5ib2R5UGFyYW1zLm1lbWJlcnMpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnQm9keSBwYXJhbSBcIm1lbWJlcnNcIiBtdXN0IGJlIGFuIGFycmF5IGlmIHByb3ZpZGVkJyk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMgJiYgISh0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLmN1c3RvbUZpZWxkcyA9PT0gJ29iamVjdCcpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnQm9keSBwYXJhbSBcImN1c3RvbUZpZWxkc1wiIG11c3QgYmUgYW4gb2JqZWN0IGlmIHByb3ZpZGVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgcmVhZE9ubHkgPSB0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLnJlYWRPbmx5ICE9PSAndW5kZWZpbmVkJyA/IHRoaXMuYm9keVBhcmFtcy5yZWFkT25seSA6IGZhbHNlO1xuXG5cdFx0bGV0IGlkO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdGlkID0gTWV0ZW9yLmNhbGwoJ2NyZWF0ZVByaXZhdGVHcm91cCcsIHRoaXMuYm9keVBhcmFtcy5uYW1lLCB0aGlzLmJvZHlQYXJhbXMubWVtYmVycyA/IHRoaXMuYm9keVBhcmFtcy5tZW1iZXJzIDogW10sIHJlYWRPbmx5LCB0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGdyb3VwOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChpZC5yaWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuZGVsZXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQsIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnZXJhc2VSb29tJywgZmluZFJlc3VsdC5yaWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Z3JvdXA6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQucmlkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmZpbGVzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblx0XHRjb25zdCBhZGRVc2VyT2JqZWN0VG9FdmVyeU9iamVjdCA9IChmaWxlKSA9PiB7XG5cdFx0XHRpZiAoZmlsZS51c2VySWQpIHtcblx0XHRcdFx0ZmlsZSA9IHRoaXMuaW5zZXJ0VXNlck9iamVjdCh7IG9iamVjdDogZmlsZSwgdXNlcklkOiBmaWxlLnVzZXJJZCB9KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmaWxlO1xuXHRcdH07XG5cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7IHJpZDogZmluZFJlc3VsdC5yaWQgfSk7XG5cblx0XHRjb25zdCBmaWxlcyA9IFJvY2tldENoYXQubW9kZWxzLlVwbG9hZHMuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IG5hbWU6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0ZmlsZXM6IGZpbGVzLm1hcChhZGRVc2VyT2JqZWN0VG9FdmVyeU9iamVjdCksXG5cdFx0XHRjb3VudDogZmlsZXMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWw6IFJvY2tldENoYXQubW9kZWxzLlVwbG9hZHMuZmluZChvdXJRdWVyeSkuY291bnQoKSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmdldEludGVncmF0aW9ucycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLWludGVncmF0aW9ucycpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblxuXHRcdGxldCBpbmNsdWRlQWxsUHJpdmF0ZUdyb3VwcyA9IHRydWU7XG5cdFx0aWYgKHR5cGVvZiB0aGlzLnF1ZXJ5UGFyYW1zLmluY2x1ZGVBbGxQcml2YXRlR3JvdXBzICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0aW5jbHVkZUFsbFByaXZhdGVHcm91cHMgPSB0aGlzLnF1ZXJ5UGFyYW1zLmluY2x1ZGVBbGxQcml2YXRlR3JvdXBzID09PSAndHJ1ZSc7XG5cdFx0fVxuXG5cdFx0Y29uc3QgY2hhbm5lbHNUb1NlYXJjaCA9IFtgIyR7IGZpbmRSZXN1bHQubmFtZSB9YF07XG5cdFx0aWYgKGluY2x1ZGVBbGxQcml2YXRlR3JvdXBzKSB7XG5cdFx0XHRjaGFubmVsc1RvU2VhcmNoLnB1c2goJ2FsbF9wcml2YXRlX2dyb3VwcycpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIHsgY2hhbm5lbDogeyAkaW46IGNoYW5uZWxzVG9TZWFyY2ggfSB9KTtcblx0XHRjb25zdCBpbnRlZ3JhdGlvbnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IF9jcmVhdGVkQXQ6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0aW50ZWdyYXRpb25zLFxuXHRcdFx0Y291bnQ6IGludGVncmF0aW9ucy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25zLmZpbmQob3VyUXVlcnkpLmNvdW50KCksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5oaXN0b3J5JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCwgY2hlY2tlZEFyY2hpdmVkOiBmYWxzZSB9KTtcblxuXHRcdGxldCBsYXRlc3REYXRlID0gbmV3IERhdGUoKTtcblx0XHRpZiAodGhpcy5xdWVyeVBhcmFtcy5sYXRlc3QpIHtcblx0XHRcdGxhdGVzdERhdGUgPSBuZXcgRGF0ZSh0aGlzLnF1ZXJ5UGFyYW1zLmxhdGVzdCk7XG5cdFx0fVxuXG5cdFx0bGV0IG9sZGVzdERhdGUgPSB1bmRlZmluZWQ7XG5cdFx0aWYgKHRoaXMucXVlcnlQYXJhbXMub2xkZXN0KSB7XG5cdFx0XHRvbGRlc3REYXRlID0gbmV3IERhdGUodGhpcy5xdWVyeVBhcmFtcy5vbGRlc3QpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGluY2x1c2l2ZSA9IHRoaXMucXVlcnlQYXJhbXMuaW5jbHVzaXZlIHx8IGZhbHNlO1xuXG5cdFx0bGV0IGNvdW50ID0gMjA7XG5cdFx0aWYgKHRoaXMucXVlcnlQYXJhbXMuY291bnQpIHtcblx0XHRcdGNvdW50ID0gcGFyc2VJbnQodGhpcy5xdWVyeVBhcmFtcy5jb3VudCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdW5yZWFkcyA9IHRoaXMucXVlcnlQYXJhbXMudW5yZWFkcyB8fCBmYWxzZTtcblxuXHRcdGxldCByZXN1bHQ7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0cmVzdWx0ID0gTWV0ZW9yLmNhbGwoJ2dldENoYW5uZWxIaXN0b3J5JywgeyByaWQ6IGZpbmRSZXN1bHQucmlkLCBsYXRlc3Q6IGxhdGVzdERhdGUsIG9sZGVzdDogb2xkZXN0RGF0ZSwgaW5jbHVzaXZlLCBjb3VudCwgdW5yZWFkcyB9KTtcblx0XHR9KTtcblxuXHRcdGlmICghcmVzdWx0KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MocmVzdWx0KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmluZm8nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkLCBjaGVja2VkQXJjaGl2ZWQ6IGZhbHNlIH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Z3JvdXA6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQucmlkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmludml0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB7IHJvb21JZCA9ICcnLCByb29tTmFtZSA9ICcnIH0gPSB0aGlzLnJlcXVlc3RQYXJhbXMoKTtcblx0XHRjb25zdCBpZE9yTmFtZSA9IHJvb21JZCB8fCByb29tTmFtZTtcblx0XHRpZiAoIWlkT3JOYW1lLnRyaW0oKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHBhcmFtZXRlciBcInJvb21JZFwiIG9yIFwicm9vbU5hbWVcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgX2lkOiByaWQsIHQ6IHR5cGUgfSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkT3JOYW1lKGlkT3JOYW1lKSB8fCB7fTtcblxuXHRcdGlmICghcmlkIHx8IHR5cGUgIT09ICdwJykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbS1ub3QtZm91bmQnLCAnVGhlIHJlcXVpcmVkIFwicm9vbUlkXCIgb3IgXCJyb29tTmFtZVwiIHBhcmFtIHByb3ZpZGVkIGRvZXMgbm90IG1hdGNoIGFueSBncm91cCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgdXNlcm5hbWUgfSA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdhZGRVc2VyVG9Sb29tJywgeyByaWQsIHVzZXJuYW1lIH0pKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGdyb3VwOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyaWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMua2ljaycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdyZW1vdmVVc2VyRnJvbVJvb20nLCB7IHJpZDogZmluZFJlc3VsdC5yaWQsIHVzZXJuYW1lOiB1c2VyLnVzZXJuYW1lIH0pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmxlYXZlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnbGVhdmVSb29tJywgZmluZFJlc3VsdC5yaWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG4vLyBMaXN0IFByaXZhdGUgR3JvdXBzIGEgdXNlciBoYXMgYWNjZXNzIHRvXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLmxpc3QnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdC8vIFRPRE86IENBQ0hFOiBBZGQgQnJlYWNraW5nIG5vdGljZSBzaW5jZSB3ZSByZW1vdmVkIHRoZSBxdWVyeSBwYXJhbVxuXHRcdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRCeVN1YnNjcmlwdGlvblR5cGVBbmRVc2VySWQoJ3AnLCB0aGlzLnVzZXJJZCwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IG5hbWU6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KTtcblxuXHRcdGNvbnN0IHRvdGFsQ291bnQgPSBjdXJzb3IuY291bnQoKTtcblx0XHRjb25zdCByb29tcyA9IGN1cnNvci5mZXRjaCgpO1xuXG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRncm91cHM6IHJvb21zLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0Y291bnQ6IHJvb21zLmxlbmd0aCxcblx0XHRcdHRvdGFsOiB0b3RhbENvdW50LFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5saXN0QWxsJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LXJvb20tYWRtaW5pc3RyYXRpb24nKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyB0OiAncCcgfSk7XG5cblx0XHRsZXQgcm9vbXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kKG91clF1ZXJ5KS5mZXRjaCgpO1xuXHRcdGNvbnN0IHRvdGFsQ291bnQgPSByb29tcy5sZW5ndGg7XG5cblx0XHRyb29tcyA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLnByb2Nlc3NRdWVyeU9wdGlvbnNPblJlc3VsdChyb29tcywge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IG5hbWU6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGdyb3Vwczogcm9vbXMsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRjb3VudDogcm9vbXMubGVuZ3RoLFxuXHRcdFx0dG90YWw6IHRvdGFsQ291bnQsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5tZW1iZXJzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmluZFJlc3VsdC5yaWQsIHsgZmllbGRzOiB7IGJyb2FkY2FzdDogMSB9IH0pO1xuXG5cdFx0aWYgKHJvb20uYnJvYWRjYXN0ICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWJyb2FkY2FzdC1tZW1iZXItbGlzdCcpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCA9IHt9IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCBzdWJzY3JpcHRpb25zID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kQnlSb29tSWQoZmluZFJlc3VsdC5yaWQsIHtcblx0XHRcdGZpZWxkczogeyAndS5faWQnOiAxIH0sXG5cdFx0XHRzb3J0OiB7ICd1LnVzZXJuYW1lJzogc29ydC51c2VybmFtZSAhPSBudWxsID8gc29ydC51c2VybmFtZSA6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHR9KTtcblxuXHRcdGNvbnN0IHRvdGFsID0gc3Vic2NyaXB0aW9ucy5jb3VudCgpO1xuXG5cdFx0Y29uc3QgbWVtYmVycyA9IHN1YnNjcmlwdGlvbnMuZmV0Y2goKS5tYXAoKHMpID0+IHMudSAmJiBzLnUuX2lkKTtcblxuXHRcdGNvbnN0IHVzZXJzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZCh7IF9pZDogeyAkaW46IG1lbWJlcnMgfSB9LCB7XG5cdFx0XHRmaWVsZHM6IHsgX2lkOiAxLCB1c2VybmFtZTogMSwgbmFtZTogMSwgc3RhdHVzOiAxLCB1dGNPZmZzZXQ6IDEgfSxcblx0XHRcdHNvcnQ6IHsgdXNlcm5hbWU6ICBzb3J0LnVzZXJuYW1lICE9IG51bGwgPyBzb3J0LnVzZXJuYW1lIDogMSB9LFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRtZW1iZXJzOiB1c2Vycyxcblx0XHRcdGNvdW50OiB1c2Vycy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbCxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLm1lc3NhZ2VzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7IHJpZDogZmluZFJlc3VsdC5yaWQgfSk7XG5cblx0XHRjb25zdCBtZXNzYWdlcyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmQob3VyUXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyB0czogLTEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZXMsXG5cdFx0XHRjb3VudDogbWVzc2FnZXMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWw6IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmQob3VyUXVlcnkpLmNvdW50KCksXG5cdFx0fSk7XG5cdH0sXG59KTtcbi8vIFRPRE86IENBQ0hFOiBzYW1lIGFzIGNoYW5uZWxzLm9ubGluZVxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5vbmxpbmUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB7IHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyB0OiAncCcgfSk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZShvdXJRdWVyeSk7XG5cblx0XHRpZiAocm9vbSA9PSBudWxsKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnR3JvdXAgZG9lcyBub3QgZXhpc3RzJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgb25saW5lID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZFVzZXJzTm90T2ZmbGluZSh7XG5cdFx0XHRmaWVsZHM6IHtcblx0XHRcdFx0dXNlcm5hbWU6IDEsXG5cdFx0XHR9LFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRjb25zdCBvbmxpbmVJblJvb20gPSBbXTtcblx0XHRvbmxpbmUuZm9yRWFjaCgodXNlcikgPT4ge1xuXHRcdFx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocm9vbS5faWQsIHVzZXIuX2lkLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KTtcblx0XHRcdGlmIChzdWJzY3JpcHRpb24pIHtcblx0XHRcdFx0b25saW5lSW5Sb29tLnB1c2goe1xuXHRcdFx0XHRcdF9pZDogdXNlci5faWQsXG5cdFx0XHRcdFx0dXNlcm5hbWU6IHVzZXIudXNlcm5hbWUsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0b25saW5lOiBvbmxpbmVJblJvb20sXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5vcGVuJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQsIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cblx0XHRpZiAoZmluZFJlc3VsdC5vcGVuKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShgVGhlIHByaXZhdGUgZ3JvdXAsICR7IGZpbmRSZXN1bHQubmFtZSB9LCBpcyBhbHJlYWR5IG9wZW4gZm9yIHRoZSBzZW5kZXJgKTtcblx0XHR9XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnb3BlblJvb20nLCBmaW5kUmVzdWx0LnJpZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMucmVtb3ZlTW9kZXJhdG9yJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3JlbW92ZVJvb21Nb2RlcmF0b3InLCBmaW5kUmVzdWx0LnJpZCwgdXNlci5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLnJlbW92ZU93bmVyJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3JlbW92ZVJvb21Pd25lcicsIGZpbmRSZXN1bHQucmlkLCB1c2VyLl9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMucmVtb3ZlTGVhZGVyJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3JlbW92ZVJvb21MZWFkZXInLCBmaW5kUmVzdWx0LnJpZCwgdXNlci5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLnJlbmFtZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5uYW1lIHx8ICF0aGlzLmJvZHlQYXJhbXMubmFtZS50cmltKCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwibmFtZVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB7IHJvb21JZDogdGhpcy5ib2R5UGFyYW1zLnJvb21JZCB9LCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0LnJpZCwgJ3Jvb21OYW1lJywgdGhpcy5ib2R5UGFyYW1zLm5hbWUpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Z3JvdXA6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQucmlkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLnNldEN1c3RvbUZpZWxkcycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMgfHwgISh0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLmN1c3RvbUZpZWxkcyA9PT0gJ29iamVjdCcpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcImN1c3RvbUZpZWxkc1wiIGlzIHJlcXVpcmVkIHdpdGggYSB0eXBlIGxpa2Ugb2JqZWN0LicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQucmlkLCAncm9vbUN1c3RvbUZpZWxkcycsIHRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0Z3JvdXA6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGZpbmRSZXN1bHQucmlkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLnNldERlc2NyaXB0aW9uJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLmRlc2NyaXB0aW9uIHx8ICF0aGlzLmJvZHlQYXJhbXMuZGVzY3JpcHRpb24udHJpbSgpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcImRlc2NyaXB0aW9uXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZFByaXZhdGVHcm91cEJ5SWRPck5hbWUoeyBwYXJhbXM6IHRoaXMucmVxdWVzdFBhcmFtcygpLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0LnJpZCwgJ3Jvb21EZXNjcmlwdGlvbicsIHRoaXMuYm9keVBhcmFtcy5kZXNjcmlwdGlvbik7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRkZXNjcmlwdGlvbjogdGhpcy5ib2R5UGFyYW1zLmRlc2NyaXB0aW9uLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMuc2V0UHVycG9zZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy5wdXJwb3NlIHx8ICF0aGlzLmJvZHlQYXJhbXMucHVycG9zZS50cmltKCkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgYm9keVBhcmFtIFwicHVycG9zZVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5yaWQsICdyb29tRGVzY3JpcHRpb24nLCB0aGlzLmJvZHlQYXJhbXMucHVycG9zZSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRwdXJwb3NlOiB0aGlzLmJvZHlQYXJhbXMucHVycG9zZSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLnNldFJlYWRPbmx5JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICh0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLnJlYWRPbmx5ID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJyZWFkT25seVwiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdGlmIChmaW5kUmVzdWx0LnJvID09PSB0aGlzLmJvZHlQYXJhbXMucmVhZE9ubHkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgcHJpdmF0ZSBncm91cCByZWFkIG9ubHkgc2V0dGluZyBpcyB0aGUgc2FtZSBhcyB3aGF0IGl0IHdvdWxkIGJlIGNoYW5nZWQgdG8uJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBmaW5kUmVzdWx0LnJpZCwgJ3JlYWRPbmx5JywgdGhpcy5ib2R5UGFyYW1zLnJlYWRPbmx5KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGdyb3VwOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0LnJpZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5zZXRUb3BpYycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy50b3BpYyB8fCAhdGhpcy5ib2R5UGFyYW1zLnRvcGljLnRyaW0oKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJ0b3BpY1wiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5yaWQsICdyb29tVG9waWMnLCB0aGlzLmJvZHlQYXJhbXMudG9waWMpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0dG9waWM6IHRoaXMuYm9keVBhcmFtcy50b3BpYyxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZ3JvdXBzLnNldFR5cGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMudHlwZSB8fCAhdGhpcy5ib2R5UGFyYW1zLnR5cGUudHJpbSgpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIGJvZHlQYXJhbSBcInR5cGVcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRpZiAoZmluZFJlc3VsdC50ID09PSB0aGlzLmJvZHlQYXJhbXMudHlwZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBwcml2YXRlIGdyb3VwIHR5cGUgaXMgdGhlIHNhbWUgYXMgd2hhdCBpdCB3b3VsZCBiZSBjaGFuZ2VkIHRvLicpO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5yaWQsICdyb29tVHlwZScsIHRoaXMuYm9keVBhcmFtcy50eXBlKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGdyb3VwOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChmaW5kUmVzdWx0LnJpZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5zZXRBbm5vdW5jZW1lbnQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMuYW5ub3VuY2VtZW50IHx8ICF0aGlzLmJvZHlQYXJhbXMuYW5ub3VuY2VtZW50LnRyaW0oKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJhbm5vdW5jZW1lbnRcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgnc2F2ZVJvb21TZXR0aW5ncycsIGZpbmRSZXN1bHQucmlkLCAncm9vbUFubm91bmNlbWVudCcsIHRoaXMuYm9keVBhcmFtcy5hbm5vdW5jZW1lbnQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0YW5ub3VuY2VtZW50OiB0aGlzLmJvZHlQYXJhbXMuYW5ub3VuY2VtZW50LFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdncm91cHMudW5hcmNoaXZlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQsIGNoZWNrZWRBcmNoaXZlZDogZmFsc2UgfSk7XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRNZXRlb3IuY2FsbCgndW5hcmNoaXZlUm9vbScsIGZpbmRSZXN1bHQucmlkKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5yb2xlcycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kUHJpdmF0ZUdyb3VwQnlJZE9yTmFtZSh7IHBhcmFtczogdGhpcy5yZXF1ZXN0UGFyYW1zKCksIHVzZXJJZDogdGhpcy51c2VySWQgfSk7XG5cblx0XHRjb25zdCByb2xlcyA9IE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdnZXRSb29tUm9sZXMnLCBmaW5kUmVzdWx0LnJpZCkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0cm9sZXMsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2dyb3Vwcy5tb2RlcmF0b3JzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmRQcml2YXRlR3JvdXBCeUlkT3JOYW1lKHsgcGFyYW1zOiB0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuXHRcdGNvbnN0IG1vZGVyYXRvcnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRCeVJvb21JZEFuZFJvbGVzKGZpbmRSZXN1bHQucmlkLCBbJ21vZGVyYXRvciddLCB7IGZpZWxkczogeyB1OiAxIH0gfSkuZmV0Y2goKS5tYXAoKHN1YikgPT4gc3ViLnUpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bW9kZXJhdG9ycyxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG4iLCJmdW5jdGlvbiBmaW5kRGlyZWN0TWVzc2FnZVJvb20ocGFyYW1zLCB1c2VyKSB7XG5cdGlmICgoIXBhcmFtcy5yb29tSWQgfHwgIXBhcmFtcy5yb29tSWQudHJpbSgpKSAmJiAoIXBhcmFtcy51c2VybmFtZSB8fCAhcGFyYW1zLnVzZXJuYW1lLnRyaW0oKSkpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLXBhcmFtLW5vdC1wcm92aWRlZCcsICdCb2R5IHBhcmFtIFwicm9vbUlkXCIgb3IgXCJ1c2VybmFtZVwiIGlzIHJlcXVpcmVkJyk7XG5cdH1cblxuXHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5nZXRSb29tQnlOYW1lT3JJZFdpdGhPcHRpb25Ub0pvaW4oe1xuXHRcdGN1cnJlbnRVc2VySWQ6IHVzZXIuX2lkLFxuXHRcdG5hbWVPcklkOiBwYXJhbXMudXNlcm5hbWUgfHwgcGFyYW1zLnJvb21JZCxcblx0XHR0eXBlOiAnZCcsXG5cdH0pO1xuXG5cdGlmICghcm9vbSB8fCByb29tLnQgIT09ICdkJykge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tbm90LWZvdW5kJywgJ1RoZSByZXF1aXJlZCBcInJvb21JZFwiIG9yIFwidXNlcm5hbWVcIiBwYXJhbSBwcm92aWRlZCBkb2VzIG5vdCBtYXRjaCBhbnkgZGlyY3QgbWVzc2FnZScpO1xuXHR9XG5cblx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocm9vbS5faWQsIHVzZXIuX2lkKTtcblxuXHRyZXR1cm4ge1xuXHRcdHJvb20sXG5cdFx0c3Vic2NyaXB0aW9uLFxuXHR9O1xufVxuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZShbJ2RtLmNyZWF0ZScsICdpbS5jcmVhdGUnXSwgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kRGlyZWN0TWVzc2FnZVJvb20odGhpcy5yZXF1ZXN0UGFyYW1zKCksIHRoaXMudXNlcik7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRyb29tOiBmaW5kUmVzdWx0LnJvb20sXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoWydkbS5jbG9zZScsICdpbS5jbG9zZSddLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmREaXJlY3RNZXNzYWdlUm9vbSh0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdGhpcy51c2VyKTtcblxuXHRcdGlmICghZmluZFJlc3VsdC5zdWJzY3JpcHRpb24ub3Blbikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoYFRoZSBkaXJlY3QgbWVzc2FnZSByb29tLCAkeyB0aGlzLmJvZHlQYXJhbXMubmFtZSB9LCBpcyBhbHJlYWR5IGNsb3NlZCB0byB0aGUgc2VuZGVyYCk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2hpZGVSb29tJywgZmluZFJlc3VsdC5yb29tLl9pZCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0uY291bnRlcnMnLCAnaW0uY291bnRlcnMnXSwgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgYWNjZXNzID0gUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1yb29tLWFkbWluaXN0cmF0aW9uJyk7XG5cdFx0Y29uc3QgcnVzZXJJZCA9IHRoaXMucmVxdWVzdFBhcmFtcygpLnVzZXJJZDtcblx0XHRsZXQgdXNlciA9IHRoaXMudXNlcklkO1xuXHRcdGxldCB1bnJlYWRzID0gbnVsbDtcblx0XHRsZXQgdXNlck1lbnRpb25zID0gbnVsbDtcblx0XHRsZXQgdW5yZWFkc0Zyb20gPSBudWxsO1xuXHRcdGxldCBqb2luZWQgPSBmYWxzZTtcblx0XHRsZXQgbXNncyA9IG51bGw7XG5cdFx0bGV0IGxhdGVzdCA9IG51bGw7XG5cdFx0bGV0IG1lbWJlcnMgPSBudWxsO1xuXHRcdGxldCBsbSA9IG51bGw7XG5cblx0XHRpZiAocnVzZXJJZCkge1xuXHRcdFx0aWYgKCFhY2Nlc3MpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdFx0fVxuXHRcdFx0dXNlciA9IHJ1c2VySWQ7XG5cdFx0fVxuXHRcdGNvbnN0IHJzID0gZmluZERpcmVjdE1lc3NhZ2VSb29tKHRoaXMucmVxdWVzdFBhcmFtcygpLCB7IF9pZDogdXNlciB9KTtcblx0XHRjb25zdCB7IHJvb20gfSA9IHJzO1xuXHRcdGNvbnN0IGRtID0gcnMuc3Vic2NyaXB0aW9uO1xuXHRcdGxtID0gcm9vbS5sbSA/IHJvb20ubG0gOiByb29tLl91cGRhdGVkQXQ7XG5cblx0XHRpZiAodHlwZW9mIGRtICE9PSAndW5kZWZpbmVkJyAmJiBkbS5vcGVuKSB7XG5cdFx0XHRpZiAoZG0ubHMgJiYgcm9vbS5tc2dzKSB7XG5cdFx0XHRcdHVucmVhZHMgPSBkbS51bnJlYWQ7XG5cdFx0XHRcdHVucmVhZHNGcm9tID0gZG0ubHM7XG5cdFx0XHR9XG5cdFx0XHR1c2VyTWVudGlvbnMgPSBkbS51c2VyTWVudGlvbnM7XG5cdFx0XHRqb2luZWQgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmIChhY2Nlc3MgfHwgam9pbmVkKSB7XG5cdFx0XHRtc2dzID0gcm9vbS5tc2dzO1xuXHRcdFx0bGF0ZXN0ID0gbG07XG5cdFx0XHRtZW1iZXJzID0gcm9vbS51c2Vyc0NvdW50O1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGpvaW5lZCxcblx0XHRcdG1lbWJlcnMsXG5cdFx0XHR1bnJlYWRzLFxuXHRcdFx0dW5yZWFkc0Zyb20sXG5cdFx0XHRtc2dzLFxuXHRcdFx0bGF0ZXN0LFxuXHRcdFx0dXNlck1lbnRpb25zLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0uZmlsZXMnLCAnaW0uZmlsZXMnXSwgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmREaXJlY3RNZXNzYWdlUm9vbSh0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdGhpcy51c2VyKTtcblx0XHRjb25zdCBhZGRVc2VyT2JqZWN0VG9FdmVyeU9iamVjdCA9IChmaWxlKSA9PiB7XG5cdFx0XHRpZiAoZmlsZS51c2VySWQpIHtcblx0XHRcdFx0ZmlsZSA9IHRoaXMuaW5zZXJ0VXNlck9iamVjdCh7IG9iamVjdDogZmlsZSwgdXNlcklkOiBmaWxlLnVzZXJJZCB9KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmaWxlO1xuXHRcdH07XG5cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7IHJpZDogZmluZFJlc3VsdC5yb29tLl9pZCB9KTtcblxuXHRcdGNvbnN0IGZpbGVzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kKG91clF1ZXJ5LCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgbmFtZTogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRmaWxlczogZmlsZXMubWFwKGFkZFVzZXJPYmplY3RUb0V2ZXJ5T2JqZWN0KSxcblx0XHRcdGNvdW50OiBmaWxlcy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kKG91clF1ZXJ5KS5jb3VudCgpLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0uaGlzdG9yeScsICdpbS5oaXN0b3J5J10sIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kRGlyZWN0TWVzc2FnZVJvb20odGhpcy5yZXF1ZXN0UGFyYW1zKCksIHRoaXMudXNlcik7XG5cblx0XHRsZXQgbGF0ZXN0RGF0ZSA9IG5ldyBEYXRlKCk7XG5cdFx0aWYgKHRoaXMucXVlcnlQYXJhbXMubGF0ZXN0KSB7XG5cdFx0XHRsYXRlc3REYXRlID0gbmV3IERhdGUodGhpcy5xdWVyeVBhcmFtcy5sYXRlc3QpO1xuXHRcdH1cblxuXHRcdGxldCBvbGRlc3REYXRlID0gdW5kZWZpbmVkO1xuXHRcdGlmICh0aGlzLnF1ZXJ5UGFyYW1zLm9sZGVzdCkge1xuXHRcdFx0b2xkZXN0RGF0ZSA9IG5ldyBEYXRlKHRoaXMucXVlcnlQYXJhbXMub2xkZXN0KTtcblx0XHR9XG5cblx0XHRjb25zdCBpbmNsdXNpdmUgPSB0aGlzLnF1ZXJ5UGFyYW1zLmluY2x1c2l2ZSB8fCBmYWxzZTtcblxuXHRcdGxldCBjb3VudCA9IDIwO1xuXHRcdGlmICh0aGlzLnF1ZXJ5UGFyYW1zLmNvdW50KSB7XG5cdFx0XHRjb3VudCA9IHBhcnNlSW50KHRoaXMucXVlcnlQYXJhbXMuY291bnQpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVucmVhZHMgPSB0aGlzLnF1ZXJ5UGFyYW1zLnVucmVhZHMgfHwgZmFsc2U7XG5cblx0XHRsZXQgcmVzdWx0O1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdHJlc3VsdCA9IE1ldGVvci5jYWxsKCdnZXRDaGFubmVsSGlzdG9yeScsIHtcblx0XHRcdFx0cmlkOiBmaW5kUmVzdWx0LnJvb20uX2lkLFxuXHRcdFx0XHRsYXRlc3Q6IGxhdGVzdERhdGUsXG5cdFx0XHRcdG9sZGVzdDogb2xkZXN0RGF0ZSxcblx0XHRcdFx0aW5jbHVzaXZlLFxuXHRcdFx0XHRjb3VudCxcblx0XHRcdFx0dW5yZWFkcyxcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0aWYgKCFyZXN1bHQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcyhyZXN1bHQpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0ubWVtYmVycycsICdpbS5tZW1iZXJzJ10sIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IGZpbmRSZXN1bHQgPSBmaW5kRGlyZWN0TWVzc2FnZVJvb20odGhpcy5yZXF1ZXN0UGFyYW1zKCksIHRoaXMudXNlcik7XG5cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cdFx0Y29uc3QgY3Vyc29yID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kQnlSb29tSWQoZmluZFJlc3VsdC5yb29tLl9pZCwge1xuXHRcdFx0c29ydDogeyAndS51c2VybmFtZSc6ICBzb3J0ICYmIHNvcnQudXNlcm5hbWUgPyBzb3J0LnVzZXJuYW1lIDogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgdG90YWwgPSBjdXJzb3IuY291bnQoKTtcblx0XHRjb25zdCBtZW1iZXJzID0gY3Vyc29yLmZldGNoKCkubWFwKChzKSA9PiBzLnUgJiYgcy51LnVzZXJuYW1lKTtcblxuXHRcdGNvbnN0IHVzZXJzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZCh7IHVzZXJuYW1lOiB7ICRpbjogbWVtYmVycyB9IH0sIHtcblx0XHRcdGZpZWxkczogeyBfaWQ6IDEsIHVzZXJuYW1lOiAxLCBuYW1lOiAxLCBzdGF0dXM6IDEsIHV0Y09mZnNldDogMSB9LFxuXHRcdFx0c29ydDogeyB1c2VybmFtZTogIHNvcnQgJiYgc29ydC51c2VybmFtZSA/IHNvcnQudXNlcm5hbWUgOiAxIH0sXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdG1lbWJlcnM6IHVzZXJzLFxuXHRcdFx0Y291bnQ6IG1lbWJlcnMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWwsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoWydkbS5tZXNzYWdlcycsICdpbS5tZXNzYWdlcyddLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZERpcmVjdE1lc3NhZ2VSb29tKHRoaXMucmVxdWVzdFBhcmFtcygpLCB0aGlzLnVzZXIpO1xuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCwgZmllbGRzLCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Y29uc3Qgb3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgeyByaWQ6IGZpbmRSZXN1bHQucm9vbS5faWQgfSk7XG5cblx0XHRjb25zdCBtZXNzYWdlcyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmQob3VyUXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyB0czogLTEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZXMsXG5cdFx0XHRjb3VudDogbWVzc2FnZXMubGVuZ3RoLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0dG90YWw6IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmQob3VyUXVlcnkpLmNvdW50KCksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoWydkbS5tZXNzYWdlcy5vdGhlcnMnLCAnaW0ubWVzc2FnZXMub3RoZXJzJ10sIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX0VuYWJsZV9EaXJlY3RfTWVzc2FnZV9IaXN0b3J5X0VuZFBvaW50JykgIT09IHRydWUpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWVuZHBvaW50LWRpc2FibGVkJywgJ1RoaXMgZW5kcG9pbnQgaXMgZGlzYWJsZWQnLCB7IHJvdXRlOiAnL2FwaS92MS9pbS5tZXNzYWdlcy5vdGhlcnMnIH0pO1xuXHRcdH1cblxuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1yb29tLWFkbWluaXN0cmF0aW9uJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCB7IHJvb21JZCB9ID0gdGhpcy5xdWVyeVBhcmFtcztcblx0XHRpZiAoIXJvb21JZCB8fCAhcm9vbUlkLnRyaW0oKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9vbWlkLXBhcmFtLW5vdC1wcm92aWRlZCcsICdUaGUgcGFyYW1ldGVyIFwicm9vbUlkXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocm9vbUlkKTtcblx0XHRpZiAoIXJvb20gfHwgcm9vbS50ICE9PSAnZCcpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20tbm90LWZvdW5kJywgYE5vIGRpcmVjdCBtZXNzYWdlIHJvb20gZm91bmQgYnkgdGhlIGlkIG9mOiAkeyByb29tSWQgfWApO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5LCB7IHJpZDogcm9vbS5faWQgfSk7XG5cblx0XHRjb25zdCBtc2dzID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IHRzOiAtMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRtZXNzYWdlczogbXNncyxcblx0XHRcdG9mZnNldCxcblx0XHRcdGNvdW50OiBtc2dzLmxlbmd0aCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kKG91clF1ZXJ5KS5jb3VudCgpLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0ubGlzdCcsICdpbS5saXN0J10sIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQgPSB7IG5hbWU6IDEgfSwgZmllbGRzIH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHQvLyBUT0RPOiBDQUNIRTogQWRkIEJyZWFja2luZyBub3RpY2Ugc2luY2Ugd2UgcmVtb3ZlZCB0aGUgcXVlcnkgcGFyYW1cblxuXHRcdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRCeVN1YnNjcmlwdGlvblR5cGVBbmRVc2VySWQoJ2QnLCB0aGlzLnVzZXJJZCwge1xuXHRcdFx0c29ydCxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KTtcblxuXHRcdGNvbnN0IHRvdGFsID0gY3Vyc29yLmNvdW50KCk7XG5cdFx0Y29uc3Qgcm9vbXMgPSBjdXJzb3IuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGltczogcm9vbXMsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRjb3VudDogcm9vbXMubGVuZ3RoLFxuXHRcdFx0dG90YWwsXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoWydkbS5saXN0LmV2ZXJ5b25lJywgJ2ltLmxpc3QuZXZlcnlvbmUnXSwgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LXJvb20tYWRtaW5pc3RyYXRpb24nKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIHsgdDogJ2QnIH0pO1xuXG5cdFx0Y29uc3Qgcm9vbXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kKG91clF1ZXJ5LCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgbmFtZTogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRpbXM6IHJvb21zLFxuXHRcdFx0b2Zmc2V0LFxuXHRcdFx0Y291bnQ6IHJvb21zLmxlbmd0aCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kKG91clF1ZXJ5KS5jb3VudCgpLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKFsnZG0ub3BlbicsICdpbS5vcGVuJ10sIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCBmaW5kUmVzdWx0ID0gZmluZERpcmVjdE1lc3NhZ2VSb29tKHRoaXMucmVxdWVzdFBhcmFtcygpLCB0aGlzLnVzZXIpO1xuXG5cdFx0aWYgKCFmaW5kUmVzdWx0LnN1YnNjcmlwdGlvbi5vcGVuKSB7XG5cdFx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiB7XG5cdFx0XHRcdE1ldGVvci5jYWxsKCdvcGVuUm9vbScsIGZpbmRSZXN1bHQucm9vbS5faWQpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZShbJ2RtLnNldFRvcGljJywgJ2ltLnNldFRvcGljJ10sIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy50b3BpYyB8fCAhdGhpcy5ib2R5UGFyYW1zLnRvcGljLnRyaW0oKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoZSBib2R5UGFyYW0gXCJ0b3BpY1wiIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluZFJlc3VsdCA9IGZpbmREaXJlY3RNZXNzYWdlUm9vbSh0aGlzLnJlcXVlc3RQYXJhbXMoKSwgdGhpcy51c2VyKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgZmluZFJlc3VsdC5yb29tLl9pZCwgJ3Jvb21Ub3BpYycsIHRoaXMuYm9keVBhcmFtcy50b3BpYyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR0b3BpYzogdGhpcy5ib2R5UGFyYW1zLnRvcGljLFxuXHRcdH0pO1xuXHR9LFxufSk7XG4iLCJSb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnaW50ZWdyYXRpb25zLmNyZWF0ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHR0eXBlOiBTdHJpbmcsXG5cdFx0XHRuYW1lOiBTdHJpbmcsXG5cdFx0XHRlbmFibGVkOiBCb29sZWFuLFxuXHRcdFx0dXNlcm5hbWU6IFN0cmluZyxcblx0XHRcdHVybHM6IE1hdGNoLk1heWJlKFtTdHJpbmddKSxcblx0XHRcdGNoYW5uZWw6IFN0cmluZyxcblx0XHRcdGV2ZW50OiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0dHJpZ2dlcldvcmRzOiBNYXRjaC5NYXliZShbU3RyaW5nXSksXG5cdFx0XHRhbGlhczogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdGF2YXRhcjogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdGVtb2ppOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0dG9rZW46IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRzY3JpcHRFbmFibGVkOiBCb29sZWFuLFxuXHRcdFx0c2NyaXB0OiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0dGFyZ2V0Q2hhbm5lbDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHR9KSk7XG5cblx0XHRsZXQgaW50ZWdyYXRpb247XG5cblx0XHRzd2l0Y2ggKHRoaXMuYm9keVBhcmFtcy50eXBlKSB7XG5cdFx0XHRjYXNlICd3ZWJob29rLW91dGdvaW5nJzpcblx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdGludGVncmF0aW9uID0gTWV0ZW9yLmNhbGwoJ2FkZE91dGdvaW5nSW50ZWdyYXRpb24nLCB0aGlzLmJvZHlQYXJhbXMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd3ZWJob29rLWluY29taW5nJzpcblx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdGludGVncmF0aW9uID0gTWV0ZW9yLmNhbGwoJ2FkZEluY29taW5nSW50ZWdyYXRpb24nLCB0aGlzLmJvZHlQYXJhbXMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnSW52YWxpZCBpbnRlZ3JhdGlvbiB0eXBlLicpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgaW50ZWdyYXRpb24gfSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2ludGVncmF0aW9ucy5oaXN0b3J5JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtaW50ZWdyYXRpb25zJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRpZiAoIXRoaXMucXVlcnlQYXJhbXMuaWQgfHwgdGhpcy5xdWVyeVBhcmFtcy5pZC50cmltKCkgPT09ICcnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnSW52YWxpZCBpbnRlZ3JhdGlvbiBpZC4nKTtcblx0XHR9XG5cblx0XHRjb25zdCB7IGlkIH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIHsgJ2ludGVncmF0aW9uLl9pZCc6IGlkIH0pO1xuXHRcdGNvbnN0IGhpc3RvcnkgPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbkhpc3RvcnkuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IF91cGRhdGVkQXQ6IC0xIH0sXG5cdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRsaW1pdDogY291bnQsXG5cdFx0XHRmaWVsZHMsXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdGhpc3RvcnksXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRpdGVtczogaGlzdG9yeS5sZW5ndGgsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25IaXN0b3J5LmZpbmQob3VyUXVlcnkpLmNvdW50KCksXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2ludGVncmF0aW9ucy5saXN0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtaW50ZWdyYXRpb25zJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCBvdXJRdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5KTtcblx0XHRjb25zdCBpbnRlZ3JhdGlvbnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IHRzOiAtMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRpbnRlZ3JhdGlvbnMsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHRpdGVtczogaW50ZWdyYXRpb25zLmxlbmd0aCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZChvdXJRdWVyeSkuY291bnQoKSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnaW50ZWdyYXRpb25zLnJlbW92ZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHR0eXBlOiBTdHJpbmcsXG5cdFx0XHR0YXJnZXRfdXJsOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0aW50ZWdyYXRpb25JZDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHR9KSk7XG5cblx0XHRpZiAoIXRoaXMuYm9keVBhcmFtcy50YXJnZXRfdXJsICYmICF0aGlzLmJvZHlQYXJhbXMuaW50ZWdyYXRpb25JZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0FuIGludGVncmF0aW9uSWQgb3IgdGFyZ2V0X3VybCBuZWVkcyB0byBiZSBwcm92aWRlZC4nKTtcblx0XHR9XG5cblx0XHRsZXQgaW50ZWdyYXRpb247XG5cdFx0c3dpdGNoICh0aGlzLmJvZHlQYXJhbXMudHlwZSkge1xuXHRcdFx0Y2FzZSAnd2ViaG9vay1vdXRnb2luZyc6XG5cdFx0XHRcdGlmICh0aGlzLmJvZHlQYXJhbXMudGFyZ2V0X3VybCkge1xuXHRcdFx0XHRcdGludGVncmF0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25zLmZpbmRPbmUoeyB1cmxzOiB0aGlzLmJvZHlQYXJhbXMudGFyZ2V0X3VybCB9KTtcblx0XHRcdFx0fSBlbHNlIGlmICh0aGlzLmJvZHlQYXJhbXMuaW50ZWdyYXRpb25JZCkge1xuXHRcdFx0XHRcdGludGVncmF0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25zLmZpbmRPbmUoeyBfaWQ6IHRoaXMuYm9keVBhcmFtcy5pbnRlZ3JhdGlvbklkIH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCFpbnRlZ3JhdGlvbikge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdObyBpbnRlZ3JhdGlvbiBmb3VuZC4nKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnZGVsZXRlT3V0Z29pbmdJbnRlZ3JhdGlvbicsIGludGVncmF0aW9uLl9pZCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0XHRpbnRlZ3JhdGlvbixcblx0XHRcdFx0fSk7XG5cdFx0XHRjYXNlICd3ZWJob29rLWluY29taW5nJzpcblx0XHRcdFx0aW50ZWdyYXRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZE9uZSh7IF9pZDogdGhpcy5ib2R5UGFyYW1zLmludGVncmF0aW9uSWQgfSk7XG5cblx0XHRcdFx0aWYgKCFpbnRlZ3JhdGlvbikge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdObyBpbnRlZ3JhdGlvbiBmb3VuZC4nKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnZGVsZXRlSW5jb21pbmdJbnRlZ3JhdGlvbicsIGludGVncmF0aW9uLl9pZCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0XHRpbnRlZ3JhdGlvbixcblx0XHRcdFx0fSk7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnSW52YWxpZCBpbnRlZ3JhdGlvbiB0eXBlLicpO1xuXHRcdH1cblx0fSxcbn0pO1xuIiwiXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnaW5mbycsIHsgYXV0aFJlcXVpcmVkOiBmYWxzZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRMb2dnZWRJblVzZXIoKTtcblxuXHRcdGlmICh1c2VyICYmIFJvY2tldENoYXQuYXV0aHouaGFzUm9sZSh1c2VyLl9pZCwgJ2FkbWluJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0aW5mbzogUm9ja2V0Q2hhdC5JbmZvLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0aW5mbzoge1xuXHRcdFx0XHR2ZXJzaW9uOiBSb2NrZXRDaGF0LkluZm8udmVyc2lvbixcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ21lJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3ModGhpcy5nZXRVc2VySW5mbyhSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLnVzZXJJZCkpKTtcblx0fSxcbn0pO1xuXG5sZXQgb25saW5lQ2FjaGUgPSAwO1xubGV0IG9ubGluZUNhY2hlRGF0ZSA9IDA7XG5jb25zdCBjYWNoZUludmFsaWQgPSA2MDAwMDsgLy8gMSBtaW51dGVcblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdzaGllbGQuc3ZnJywgeyBhdXRoUmVxdWlyZWQ6IGZhbHNlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgdHlwZSwgY2hhbm5lbCwgbmFtZSwgaWNvbiB9ID0gdGhpcy5xdWVyeVBhcmFtcztcblx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRW5hYmxlX1NoaWVsZHMnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItZW5kcG9pbnQtZGlzYWJsZWQnLCAnVGhpcyBlbmRwb2ludCBpcyBkaXNhYmxlZCcsIHsgcm91dGU6ICcvYXBpL3YxL3NoaWVsZC5zdmcnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHR5cGVzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FQSV9TaGllbGRfVHlwZXMnKTtcblx0XHRpZiAodHlwZSAmJiAodHlwZXMgIT09ICcqJyAmJiAhdHlwZXMuc3BsaXQoJywnKS5tYXAoKHQpID0+IHQudHJpbSgpKS5pbmNsdWRlcyh0eXBlKSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXNoaWVsZC1kaXNhYmxlZCcsICdUaGlzIHNoaWVsZCB0eXBlIGlzIGRpc2FibGVkJywgeyByb3V0ZTogJy9hcGkvdjEvc2hpZWxkLnN2ZycgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaGlkZUljb24gPSBpY29uID09PSAnZmFsc2UnO1xuXHRcdGlmIChoaWRlSWNvbiAmJiAoIW5hbWUgfHwgIW5hbWUudHJpbSgpKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ05hbWUgY2Fubm90IGJlIGVtcHR5IHdoZW4gaWNvbiBpcyBoaWRkZW4nKTtcblx0XHR9XG5cblx0XHRsZXQgdGV4dDtcblx0XHRsZXQgYmFja2dyb3VuZENvbG9yID0gJyM0YzEnO1xuXHRcdHN3aXRjaCAodHlwZSkge1xuXHRcdFx0Y2FzZSAnb25saW5lJzpcblx0XHRcdFx0aWYgKERhdGUubm93KCkgLSBvbmxpbmVDYWNoZURhdGUgPiBjYWNoZUludmFsaWQpIHtcblx0XHRcdFx0XHRvbmxpbmVDYWNoZSA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRVc2Vyc05vdE9mZmxpbmUoKS5jb3VudCgpO1xuXHRcdFx0XHRcdG9ubGluZUNhY2hlRGF0ZSA9IERhdGUubm93KCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0ZXh0ID0gYCR7IG9ubGluZUNhY2hlIH0gJHsgVEFQaTE4bi5fXygnT25saW5lJykgfWA7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnY2hhbm5lbCc6XG5cdFx0XHRcdGlmICghY2hhbm5lbCkge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdTaGllbGQgY2hhbm5lbCBpcyByZXF1aXJlZCBmb3IgdHlwZSBcImNoYW5uZWxcIicpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGV4dCA9IGAjJHsgY2hhbm5lbCB9YDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd1c2VyJzpcblx0XHRcdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdFx0XHQvLyBSZXNwZWN0IHRoZSBzZXJ2ZXIncyBjaG9pY2UgZm9yIHVzaW5nIHRoZWlyIHJlYWwgbmFtZXMgb3Igbm90XG5cdFx0XHRcdGlmICh1c2VyLm5hbWUgJiYgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1VJX1VzZV9SZWFsX05hbWUnKSkge1xuXHRcdFx0XHRcdHRleHQgPSBgJHsgdXNlci5uYW1lIH1gO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRleHQgPSBgQCR7IHVzZXIudXNlcm5hbWUgfWA7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRzd2l0Y2ggKHVzZXIuc3RhdHVzKSB7XG5cdFx0XHRcdFx0Y2FzZSAnb25saW5lJzpcblx0XHRcdFx0XHRcdGJhY2tncm91bmRDb2xvciA9ICcjMWZiMzFmJztcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ2F3YXknOlxuXHRcdFx0XHRcdFx0YmFja2dyb3VuZENvbG9yID0gJyNkYzliMDEnO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAnYnVzeSc6XG5cdFx0XHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3IgPSAnI2JjMjAzMSc7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRjYXNlICdvZmZsaW5lJzpcblx0XHRcdFx0XHRcdGJhY2tncm91bmRDb2xvciA9ICcjYTVhMWExJztcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHRleHQgPSBUQVBpMThuLl9fKCdKb2luX0NoYXQnKS50b1VwcGVyQ2FzZSgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGljb25TaXplID0gaGlkZUljb24gPyA3IDogMjQ7XG5cdFx0Y29uc3QgbGVmdFNpemUgPSBuYW1lID8gbmFtZS5sZW5ndGggKiA2ICsgNyArIGljb25TaXplIDogaWNvblNpemU7XG5cdFx0Y29uc3QgcmlnaHRTaXplID0gdGV4dC5sZW5ndGggKiA2ICsgMjA7XG5cdFx0Y29uc3Qgd2lkdGggPSBsZWZ0U2l6ZSArIHJpZ2h0U2l6ZTtcblx0XHRjb25zdCBoZWlnaHQgPSAyMDtcblx0XHRyZXR1cm4ge1xuXHRcdFx0aGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2ltYWdlL3N2Zyt4bWw7Y2hhcnNldD11dGYtOCcgfSxcblx0XHRcdGJvZHk6IGBcblx0XHRcdFx0PHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIgd2lkdGg9XCIkeyB3aWR0aCB9XCIgaGVpZ2h0PVwiJHsgaGVpZ2h0IH1cIj5cblx0XHRcdFx0ICA8bGluZWFyR3JhZGllbnQgaWQ9XCJiXCIgeDI9XCIwXCIgeTI9XCIxMDAlXCI+XG5cdFx0XHRcdCAgICA8c3RvcCBvZmZzZXQ9XCIwXCIgc3RvcC1jb2xvcj1cIiNiYmJcIiBzdG9wLW9wYWNpdHk9XCIuMVwiLz5cblx0XHRcdFx0ICAgIDxzdG9wIG9mZnNldD1cIjFcIiBzdG9wLW9wYWNpdHk9XCIuMVwiLz5cblx0XHRcdFx0ICA8L2xpbmVhckdyYWRpZW50PlxuXHRcdFx0XHQgIDxtYXNrIGlkPVwiYVwiPlxuXHRcdFx0XHQgICAgPHJlY3Qgd2lkdGg9XCIkeyB3aWR0aCB9XCIgaGVpZ2h0PVwiJHsgaGVpZ2h0IH1cIiByeD1cIjNcIiBmaWxsPVwiI2ZmZlwiLz5cblx0XHRcdFx0ICA8L21hc2s+XG5cdFx0XHRcdCAgPGcgbWFzaz1cInVybCgjYSlcIj5cblx0XHRcdFx0ICAgIDxwYXRoIGZpbGw9XCIjNTU1XCIgZD1cIk0wIDBoJHsgbGVmdFNpemUgfXYkeyBoZWlnaHQgfUgwelwiLz5cblx0XHRcdFx0ICAgIDxwYXRoIGZpbGw9XCIkeyBiYWNrZ3JvdW5kQ29sb3IgfVwiIGQ9XCJNJHsgbGVmdFNpemUgfSAwaCR7IHJpZ2h0U2l6ZSB9diR7IGhlaWdodCB9SCR7IGxlZnRTaXplIH16XCIvPlxuXHRcdFx0XHQgICAgPHBhdGggZmlsbD1cInVybCgjYilcIiBkPVwiTTAgMGgkeyB3aWR0aCB9diR7IGhlaWdodCB9SDB6XCIvPlxuXHRcdFx0XHQgIDwvZz5cblx0XHRcdFx0ICAgICR7IGhpZGVJY29uID8gJycgOiAnPGltYWdlIHg9XCI1XCIgeT1cIjNcIiB3aWR0aD1cIjE0XCIgaGVpZ2h0PVwiMTRcIiB4bGluazpocmVmPVwiL2Fzc2V0cy9mYXZpY29uLnN2Z1wiLz4nIH1cblx0XHRcdFx0ICA8ZyBmaWxsPVwiI2ZmZlwiIGZvbnQtZmFtaWx5PVwiRGVqYVZ1IFNhbnMsVmVyZGFuYSxHZW5ldmEsc2Fucy1zZXJpZlwiIGZvbnQtc2l6ZT1cIjExXCI+XG5cdFx0XHRcdFx0XHQkeyBuYW1lID8gYDx0ZXh0IHg9XCIkeyBpY29uU2l6ZSB9XCIgeT1cIjE1XCIgZmlsbD1cIiMwMTAxMDFcIiBmaWxsLW9wYWNpdHk9XCIuM1wiPiR7IG5hbWUgfTwvdGV4dD5cblx0XHRcdFx0ICAgIDx0ZXh0IHg9XCIkeyBpY29uU2l6ZSB9XCIgeT1cIjE0XCI+JHsgbmFtZSB9PC90ZXh0PmAgOiAnJyB9XG5cdFx0XHRcdCAgICA8dGV4dCB4PVwiJHsgbGVmdFNpemUgKyA3IH1cIiB5PVwiMTVcIiBmaWxsPVwiIzAxMDEwMVwiIGZpbGwtb3BhY2l0eT1cIi4zXCI+JHsgdGV4dCB9PC90ZXh0PlxuXHRcdFx0XHQgICAgPHRleHQgeD1cIiR7IGxlZnRTaXplICsgNyB9XCIgeT1cIjE0XCI+JHsgdGV4dCB9PC90ZXh0PlxuXHRcdFx0XHQgIDwvZz5cblx0XHRcdFx0PC9zdmc+XG5cdFx0XHRgLnRyaW0oKS5yZXBsYWNlKC9cXD5bXFxzXStcXDwvZ20sICc+PCcpLFxuXHRcdH07XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3Nwb3RsaWdodCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNoZWNrKHRoaXMucXVlcnlQYXJhbXMsIHtcblx0XHRcdHF1ZXJ5OiBTdHJpbmcsXG5cdFx0fSk7XG5cblx0XHRjb25zdCB7IHF1ZXJ5IH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXG5cdFx0Y29uc3QgcmVzdWx0ID0gTWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT5cblx0XHRcdE1ldGVvci5jYWxsKCdzcG90bGlnaHQnLCBxdWVyeSlcblx0XHQpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MocmVzdWx0KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnZGlyZWN0b3J5JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCwgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGNvbnN0IHsgdGV4dCwgdHlwZSB9ID0gcXVlcnk7XG5cdFx0aWYgKHNvcnQgJiYgT2JqZWN0LmtleXMoc29ydCkubGVuZ3RoID4gMSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1RoaXMgbWV0aG9kIHN1cHBvcnQgb25seSBvbmUgXCJzb3J0XCIgcGFyYW1ldGVyJyk7XG5cdFx0fVxuXHRcdGNvbnN0IHNvcnRCeSA9IHNvcnQgPyBPYmplY3Qua2V5cyhzb3J0KVswXSA6IHVuZGVmaW5lZDtcblx0XHRjb25zdCBzb3J0RGlyZWN0aW9uID0gc29ydCAmJiBPYmplY3QudmFsdWVzKHNvcnQpWzBdID09PSAxID8gJ2FzYycgOiAnZGVzYyc7XG5cblx0XHRjb25zdCByZXN1bHQgPSBNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnYnJvd3NlQ2hhbm5lbHMnLCB7XG5cdFx0XHR0ZXh0LFxuXHRcdFx0dHlwZSxcblx0XHRcdHNvcnRCeSxcblx0XHRcdHNvcnREaXJlY3Rpb24sXG5cdFx0XHRvZmZzZXQ6IE1hdGgubWF4KDAsIG9mZnNldCksXG5cdFx0XHRsaW1pdDogTWF0aC5tYXgoMCwgY291bnQpLFxuXHRcdH0pKTtcblxuXHRcdGlmICghcmVzdWx0KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnUGxlYXNlIHZlcmlmeSB0aGUgcGFyYW1ldGVycycpO1xuXHRcdH1cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRyZXN1bHQ6IHJlc3VsdC5yZXN1bHRzLFxuXHRcdFx0Y291bnQ6IHJlc3VsdC5yZXN1bHRzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiByZXN1bHQudG90YWwsXG5cdFx0fSk7XG5cdH0sXG59KTtcbiIsIi8qKlxuXHRUaGlzIEFQSSByZXR1cm5zIGFsbCBwZXJtaXNzaW9ucyB0aGF0IGV4aXN0c1xuXHRvbiB0aGUgc2VydmVyLCB3aXRoIHJlc3BlY3RpdmUgcm9sZXMuXG5cblx0TWV0aG9kOiBHRVRcblx0Um91dGU6IGFwaS92MS9wZXJtaXNzaW9uc1xuICovXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgncGVybWlzc2lvbnMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCB3YXJuaW5nTWVzc2FnZSA9ICdUaGUgZW5kcG9pbnQgXCJwZXJtaXNzaW9uc1wiIGlzIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBhZnRlciB2ZXJzaW9uIHYwLjY5Jztcblx0XHRjb25zb2xlLndhcm4od2FybmluZ01lc3NhZ2UpO1xuXG5cdFx0Y29uc3QgcmVzdWx0ID0gTWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3Blcm1pc3Npb25zL2dldCcpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHJlc3VsdCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3Blcm1pc3Npb25zLmxpc3QnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCByZXN1bHQgPSBNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgncGVybWlzc2lvbnMvZ2V0JykpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0cGVybWlzc2lvbnM6IHJlc3VsdCxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgncGVybWlzc2lvbnMudXBkYXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnYWNjZXNzLXBlcm1pc3Npb25zJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdFZGl0aW5nIHBlcm1pc3Npb25zIGlzIG5vdCBhbGxvd2VkJywgJ2Vycm9yLWVkaXQtcGVybWlzc2lvbnMtbm90LWFsbG93ZWQnKTtcblx0XHR9XG5cblx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIHtcblx0XHRcdHBlcm1pc3Npb25zOiBbXG5cdFx0XHRcdE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHRcdFx0X2lkOiBTdHJpbmcsXG5cdFx0XHRcdFx0cm9sZXM6IFtTdHJpbmddLFxuXHRcdFx0XHR9KSxcblx0XHRcdF0sXG5cdFx0fSk7XG5cblx0XHRsZXQgcGVybWlzc2lvbk5vdEZvdW5kID0gZmFsc2U7XG5cdFx0bGV0IHJvbGVOb3RGb3VuZCA9IGZhbHNlO1xuXHRcdE9iamVjdC5rZXlzKHRoaXMuYm9keVBhcmFtcy5wZXJtaXNzaW9ucykuZm9yRWFjaCgoa2V5KSA9PiB7XG5cdFx0XHRjb25zdCBlbGVtZW50ID0gdGhpcy5ib2R5UGFyYW1zLnBlcm1pc3Npb25zW2tleV07XG5cblx0XHRcdGlmICghUm9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuZmluZE9uZUJ5SWQoZWxlbWVudC5faWQpKSB7XG5cdFx0XHRcdHBlcm1pc3Npb25Ob3RGb3VuZCA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdE9iamVjdC5rZXlzKGVsZW1lbnQucm9sZXMpLmZvckVhY2goKGtleSkgPT4ge1xuXHRcdFx0XHRjb25zdCBzdWJlbGVtZW50ID0gZWxlbWVudC5yb2xlc1trZXldO1xuXG5cdFx0XHRcdGlmICghUm9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuZmluZE9uZUJ5SWQoc3ViZWxlbWVudCkpIHtcblx0XHRcdFx0XHRyb2xlTm90Rm91bmQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdGlmIChwZXJtaXNzaW9uTm90Rm91bmQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdJbnZhbGlkIHBlcm1pc3Npb24nLCAnZXJyb3ItaW52YWxpZC1wZXJtaXNzaW9uJyk7XG5cdFx0fSBlbHNlIGlmIChyb2xlTm90Rm91bmQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdJbnZhbGlkIHJvbGUnLCAnZXJyb3ItaW52YWxpZC1yb2xlJyk7XG5cdFx0fVxuXG5cdFx0T2JqZWN0LmtleXModGhpcy5ib2R5UGFyYW1zLnBlcm1pc3Npb25zKS5mb3JFYWNoKChrZXkpID0+IHtcblx0XHRcdGNvbnN0IGVsZW1lbnQgPSB0aGlzLmJvZHlQYXJhbXMucGVybWlzc2lvbnNba2V5XTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoZWxlbWVudC5faWQsIGVsZW1lbnQucm9sZXMpO1xuXHRcdH0pO1xuXG5cdFx0Y29uc3QgcmVzdWx0ID0gTWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3Blcm1pc3Npb25zL2dldCcpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHBlcm1pc3Npb25zOiByZXN1bHQsXG5cdFx0fSk7XG5cdH0sXG59KTtcbiIsIi8qIGdsb2JhbHMgUHVzaCAqL1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgncHVzaC50b2tlbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB7IHR5cGUsIHZhbHVlLCBhcHBOYW1lIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0bGV0IHsgaWQgfSA9IHRoaXMuYm9keVBhcmFtcztcblxuXHRcdGlmIChpZCAmJiB0eXBlb2YgaWQgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pZC1wYXJhbS1ub3QtdmFsaWQnLCAnVGhlIHJlcXVpcmVkIFwiaWRcIiBib2R5IHBhcmFtIGlzIGludmFsaWQuJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlkID0gUmFuZG9tLmlkKCk7XG5cdFx0fVxuXG5cdFx0aWYgKCF0eXBlIHx8ICh0eXBlICE9PSAnYXBuJyAmJiB0eXBlICE9PSAnZ2NtJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXR5cGUtcGFyYW0tbm90LXZhbGlkJywgJ1RoZSByZXF1aXJlZCBcInR5cGVcIiBib2R5IHBhcmFtIGlzIG1pc3Npbmcgb3IgaW52YWxpZC4nKTtcblx0XHR9XG5cblx0XHRpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXRva2VuLXBhcmFtLW5vdC12YWxpZCcsICdUaGUgcmVxdWlyZWQgXCJ2YWx1ZVwiIGJvZHkgcGFyYW0gaXMgbWlzc2luZyBvciBpbnZhbGlkLicpO1xuXHRcdH1cblxuXHRcdGlmICghYXBwTmFtZSB8fCB0eXBlb2YgYXBwTmFtZSAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFwcE5hbWUtcGFyYW0tbm90LXZhbGlkJywgJ1RoZSByZXF1aXJlZCBcImFwcE5hbWVcIiBib2R5IHBhcmFtIGlzIG1pc3Npbmcgb3IgaW52YWxpZC4nKTtcblx0XHR9XG5cblxuXHRcdGxldCByZXN1bHQ7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gcmVzdWx0ID0gTWV0ZW9yLmNhbGwoJ3JhaXg6cHVzaC11cGRhdGUnLCB7XG5cdFx0XHRpZCxcblx0XHRcdHRva2VuOiB7IFt0eXBlXTogdmFsdWUgfSxcblx0XHRcdGFwcE5hbWUsXG5cdFx0XHR1c2VySWQ6IHRoaXMudXNlcklkLFxuXHRcdH0pKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgcmVzdWx0IH0pO1xuXHR9LFxuXHRkZWxldGUoKSB7XG5cdFx0Y29uc3QgeyB0b2tlbiB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXG5cdFx0aWYgKCF0b2tlbiB8fCB0eXBlb2YgdG9rZW4gIT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci10b2tlbi1wYXJhbS1ub3QtdmFsaWQnLCAnVGhlIHJlcXVpcmVkIFwidG9rZW5cIiBib2R5IHBhcmFtIGlzIG1pc3Npbmcgb3IgaW52YWxpZC4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBhZmZlY3RlZFJlY29yZHMgPSBQdXNoLmFwcENvbGxlY3Rpb24ucmVtb3ZlKHtcblx0XHRcdCRvcjogW3tcblx0XHRcdFx0J3Rva2VuLmFwbic6IHRva2VuLFxuXHRcdFx0fSwge1xuXHRcdFx0XHQndG9rZW4uZ2NtJzogdG9rZW4sXG5cdFx0XHR9XSxcblx0XHRcdHVzZXJJZDogdGhpcy51c2VySWQsXG5cdFx0fSk7XG5cblx0XHRpZiAoYWZmZWN0ZWRSZWNvcmRzID09PSAwKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEubm90Rm91bmQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuLy8gc2V0dGluZ3MgZW5kcG9pbnRzXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnc2V0dGluZ3MucHVibGljJywgeyBhdXRoUmVxdWlyZWQ6IGZhbHNlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGxldCBvdXJRdWVyeSA9IHtcblx0XHRcdGhpZGRlbjogeyAkbmU6IHRydWUgfSxcblx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHR9O1xuXG5cdFx0b3VyUXVlcnkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSwgb3VyUXVlcnkpO1xuXG5cdFx0Y29uc3Qgc2V0dGluZ3MgPSBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kKG91clF1ZXJ5LCB7XG5cdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgX2lkOiAxIH0sXG5cdFx0XHRza2lwOiBvZmZzZXQsXG5cdFx0XHRsaW1pdDogY291bnQsXG5cdFx0XHRmaWVsZHM6IE9iamVjdC5hc3NpZ24oeyBfaWQ6IDEsIHZhbHVlOiAxIH0sIGZpZWxkcyksXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHNldHRpbmdzLFxuXHRcdFx0Y291bnQ6IHNldHRpbmdzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kKG91clF1ZXJ5KS5jb3VudCgpLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdzZXR0aW5ncy5vYXV0aCcsIHsgYXV0aFJlcXVpcmVkOiBmYWxzZSB9LCB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBtb3VudE9BdXRoU2VydmljZXMgPSAoKSA9PiB7XG5cdFx0XHRjb25zdCBvQXV0aFNlcnZpY2VzRW5hYmxlZCA9IFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLmZpbmQoe30sIHsgZmllbGRzOiB7IHNlY3JldDogMCB9IH0pLmZldGNoKCk7XG5cblx0XHRcdHJldHVybiBvQXV0aFNlcnZpY2VzRW5hYmxlZC5tYXAoKHNlcnZpY2UpID0+IHtcblx0XHRcdFx0aWYgKHNlcnZpY2UuY3VzdG9tIHx8IFsnc2FtbCcsICdjYXMnLCAnd29yZHByZXNzJ10uaW5jbHVkZXMoc2VydmljZS5zZXJ2aWNlKSkge1xuXHRcdFx0XHRcdHJldHVybiB7IC4uLnNlcnZpY2UgfTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0X2lkOiBzZXJ2aWNlLl9pZCxcblx0XHRcdFx0XHRuYW1lOiBzZXJ2aWNlLnNlcnZpY2UsXG5cdFx0XHRcdFx0Y2xpZW50SWQ6IHNlcnZpY2UuYXBwSWQgfHwgc2VydmljZS5jbGllbnRJZCB8fCBzZXJ2aWNlLmNvbnN1bWVyS2V5LFxuXHRcdFx0XHRcdGJ1dHRvbkxhYmVsVGV4dDogc2VydmljZS5idXR0b25MYWJlbFRleHQgfHwgJycsXG5cdFx0XHRcdFx0YnV0dG9uQ29sb3I6IHNlcnZpY2UuYnV0dG9uQ29sb3IgfHwgJycsXG5cdFx0XHRcdFx0YnV0dG9uTGFiZWxDb2xvcjogc2VydmljZS5idXR0b25MYWJlbENvbG9yIHx8ICcnLFxuXHRcdFx0XHRcdGN1c3RvbTogZmFsc2UsXG5cdFx0XHRcdH07XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0c2VydmljZXM6IG1vdW50T0F1dGhTZXJ2aWNlcygpLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdzZXR0aW5ncycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdGxldCBvdXJRdWVyeSA9IHtcblx0XHRcdGhpZGRlbjogeyAkbmU6IHRydWUgfSxcblx0XHR9O1xuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LXByaXZpbGVnZWQtc2V0dGluZycpKSB7XG5cdFx0XHRvdXJRdWVyeS5wdWJsaWMgPSB0cnVlO1xuXHRcdH1cblxuXHRcdG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIG91clF1ZXJ5KTtcblxuXHRcdGNvbnN0IHNldHRpbmdzID0gUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZChvdXJRdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IF9pZDogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzOiBPYmplY3QuYXNzaWduKHsgX2lkOiAxLCB2YWx1ZTogMSB9LCBmaWVsZHMpLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRzZXR0aW5ncyxcblx0XHRcdGNvdW50OiBzZXR0aW5ncy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZChvdXJRdWVyeSkuY291bnQoKSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnc2V0dGluZ3MvOl9pZCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1wcml2aWxlZ2VkLXNldHRpbmcnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKF8ucGljayhSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kT25lTm90SGlkZGVuQnlJZCh0aGlzLnVybFBhcmFtcy5faWQpLCAnX2lkJywgJ3ZhbHVlJykpO1xuXHR9LFxuXHRwb3N0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnZWRpdC1wcml2aWxlZ2VkLXNldHRpbmcnKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdC8vIGFsbG93IHNwZWNpYWwgaGFuZGxpbmcgb2YgcGFydGljdWxhciBzZXR0aW5nIHR5cGVzXG5cdFx0Y29uc3Qgc2V0dGluZyA9IFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmRPbmVOb3RIaWRkZW5CeUlkKHRoaXMudXJsUGFyYW1zLl9pZCk7XG5cdFx0aWYgKHNldHRpbmcudHlwZSA9PT0gJ2FjdGlvbicgJiYgdGhpcy5ib2R5UGFyYW1zICYmIHRoaXMuYm9keVBhcmFtcy5leGVjdXRlKSB7XG5cdFx0XHQvLyBleGVjdXRlIHRoZSBjb25maWd1cmVkIG1ldGhvZFxuXHRcdFx0TWV0ZW9yLmNhbGwoc2V0dGluZy52YWx1ZSk7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHRcdH1cblxuXHRcdGlmIChzZXR0aW5nLnR5cGUgPT09ICdjb2xvcicgJiYgdGhpcy5ib2R5UGFyYW1zICYmIHRoaXMuYm9keVBhcmFtcy5lZGl0b3IgJiYgdGhpcy5ib2R5UGFyYW1zLnZhbHVlKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy51cGRhdGVPcHRpb25zQnlJZCh0aGlzLnVybFBhcmFtcy5faWQsIHsgZWRpdG9yOiB0aGlzLmJvZHlQYXJhbXMuZWRpdG9yIH0pO1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MudXBkYXRlVmFsdWVOb3RIaWRkZW5CeUlkKHRoaXMudXJsUGFyYW1zLl9pZCwgdGhpcy5ib2R5UGFyYW1zLnZhbHVlKTtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdFx0fVxuXG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCB7XG5cdFx0XHR2YWx1ZTogTWF0Y2guQW55LFxuXHRcdH0pO1xuXHRcdGlmIChSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy51cGRhdGVWYWx1ZU5vdEhpZGRlbkJ5SWQodGhpcy51cmxQYXJhbXMuX2lkLCB0aGlzLmJvZHlQYXJhbXMudmFsdWUpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3NlcnZpY2UuY29uZmlndXJhdGlvbnMnLCB7IGF1dGhSZXF1aXJlZDogZmFsc2UgfSwge1xuXHRnZXQoKSB7XG5cdFx0Y29uc3QgeyBTZXJ2aWNlQ29uZmlndXJhdGlvbiB9ID0gUGFja2FnZVsnc2VydmljZS1jb25maWd1cmF0aW9uJ107XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRjb25maWd1cmF0aW9uczogU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMuZmluZCh7fSwgeyBmaWVsZHM6IHsgc2VjcmV0OiAwIH0gfSkuZmV0Y2goKSxcblx0XHR9KTtcblx0fSxcbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3N0YXRpc3RpY3MnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRsZXQgcmVmcmVzaCA9IGZhbHNlO1xuXHRcdGlmICh0eXBlb2YgdGhpcy5xdWVyeVBhcmFtcy5yZWZyZXNoICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLnF1ZXJ5UGFyYW1zLnJlZnJlc2ggPT09ICd0cnVlJykge1xuXHRcdFx0cmVmcmVzaCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0bGV0IHN0YXRzO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdHN0YXRzID0gTWV0ZW9yLmNhbGwoJ2dldFN0YXRpc3RpY3MnLCByZWZyZXNoKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHN0YXRpc3RpY3M6IHN0YXRzLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdzdGF0aXN0aWNzLmxpc3QnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctc3RhdGlzdGljcycpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBvZmZzZXQsIGNvdW50IH0gPSB0aGlzLmdldFBhZ2luYXRpb25JdGVtcygpO1xuXHRcdGNvbnN0IHsgc29ydCwgZmllbGRzLCBxdWVyeSB9ID0gdGhpcy5wYXJzZUpzb25RdWVyeSgpO1xuXG5cdFx0Y29uc3Qgc3RhdGlzdGljcyA9IFJvY2tldENoYXQubW9kZWxzLlN0YXRpc3RpY3MuZmluZChxdWVyeSwge1xuXHRcdFx0c29ydDogc29ydCA/IHNvcnQgOiB7IG5hbWU6IDEgfSxcblx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdGZpZWxkcyxcblx0XHR9KS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0c3RhdGlzdGljcyxcblx0XHRcdGNvdW50OiBzdGF0aXN0aWNzLmxlbmd0aCxcblx0XHRcdG9mZnNldCxcblx0XHRcdHRvdGFsOiBSb2NrZXRDaGF0Lm1vZGVscy5TdGF0aXN0aWNzLmZpbmQocXVlcnkpLmNvdW50KCksXG5cdFx0fSk7XG5cdH0sXG59KTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IEJ1c2JveSBmcm9tICdidXNib3knO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuY3JlYXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0ZW1haWw6IFN0cmluZyxcblx0XHRcdG5hbWU6IFN0cmluZyxcblx0XHRcdHBhc3N3b3JkOiBTdHJpbmcsXG5cdFx0XHR1c2VybmFtZTogU3RyaW5nLFxuXHRcdFx0YWN0aXZlOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdHJvbGVzOiBNYXRjaC5NYXliZShBcnJheSksXG5cdFx0XHRqb2luRGVmYXVsdENoYW5uZWxzOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdHJlcXVpcmVQYXNzd29yZENoYW5nZTogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRzZW5kV2VsY29tZUVtYWlsOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdHZlcmlmaWVkOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdGN1c3RvbUZpZWxkczogTWF0Y2guTWF5YmUoT2JqZWN0KSxcblx0XHR9KTtcblxuXHRcdC8vIE5ldyBjaGFuZ2UgbWFkZSBieSBwdWxsIHJlcXVlc3QgIzUxNTJcblx0XHRpZiAodHlwZW9mIHRoaXMuYm9keVBhcmFtcy5qb2luRGVmYXVsdENoYW5uZWxzID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5ib2R5UGFyYW1zLmpvaW5EZWZhdWx0Q2hhbm5lbHMgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzKSB7XG5cdFx0XHRSb2NrZXRDaGF0LnZhbGlkYXRlQ3VzdG9tRmllbGRzKHRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMpO1xuXHRcdH1cblxuXHRcdGNvbnN0IG5ld1VzZXJJZCA9IFJvY2tldENoYXQuc2F2ZVVzZXIodGhpcy51c2VySWQsIHRoaXMuYm9keVBhcmFtcyk7XG5cblx0XHRpZiAodGhpcy5ib2R5UGFyYW1zLmN1c3RvbUZpZWxkcykge1xuXHRcdFx0Um9ja2V0Q2hhdC5zYXZlQ3VzdG9tRmllbGRzV2l0aG91dFZhbGlkYXRpb24obmV3VXNlcklkLCB0aGlzLmJvZHlQYXJhbXMuY3VzdG9tRmllbGRzKTtcblx0XHR9XG5cblxuXHRcdGlmICh0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLmFjdGl2ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdFx0TWV0ZW9yLmNhbGwoJ3NldFVzZXJBY3RpdmVTdGF0dXMnLCBuZXdVc2VySWQsIHRoaXMuYm9keVBhcmFtcy5hY3RpdmUpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyB1c2VyOiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChuZXdVc2VySWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pIH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5kZWxldGUnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdkZWxldGUtdXNlcicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdE1ldGVvci5jYWxsKCdkZWxldGVVc2VyJywgdXNlci5faWQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuZGVsZXRlT3duQWNjb3VudCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB7IHBhc3N3b3JkIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0aWYgKCFwYXNzd29yZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0JvZHkgcGFyYW1ldGVyIFwicGFzc3dvcmRcIiBpcyByZXF1aXJlZC4nKTtcblx0XHR9XG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfQWxsb3dEZWxldGVPd25BY2NvdW50JykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJyk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ2RlbGV0ZVVzZXJPd25BY2NvdW50JywgcGFzc3dvcmQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuZ2V0QXZhdGFyJywgeyBhdXRoUmVxdWlyZWQ6IGZhbHNlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRjb25zdCB1cmwgPSBSb2NrZXRDaGF0LmdldFVSTChgL2F2YXRhci8keyB1c2VyLnVzZXJuYW1lIH1gLCB7IGNkbjogZmFsc2UsIGZ1bGw6IHRydWUgfSk7XG5cdFx0dGhpcy5yZXNwb25zZS5zZXRIZWFkZXIoJ0xvY2F0aW9uJywgdXJsKTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRzdGF0dXNDb2RlOiAzMDcsXG5cdFx0XHRib2R5OiB1cmwsXG5cdFx0fTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuZ2V0UHJlc2VuY2UnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAodGhpcy5pc1VzZXJGcm9tUGFyYW1zKCkpIHtcblx0XHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLnVzZXJJZCk7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRcdHByZXNlbmNlOiB1c2VyLnN0YXR1cyxcblx0XHRcdFx0Y29ubmVjdGlvblN0YXR1czogdXNlci5zdGF0dXNDb25uZWN0aW9uLFxuXHRcdFx0XHRsYXN0TG9naW46IHVzZXIubGFzdExvZ2luLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdHByZXNlbmNlOiB1c2VyLnN0YXR1cyxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuaW5mbycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHsgdXNlcm5hbWUgfSA9IHRoaXMuZ2V0VXNlckZyb21QYXJhbXMoKTtcblxuXHRcdGxldCByZXN1bHQ7XG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0cmVzdWx0ID0gTWV0ZW9yLmNhbGwoJ2dldEZ1bGxVc2VyRGF0YScsIHsgdXNlcm5hbWUsIGxpbWl0OiAxIH0pO1xuXHRcdH0pO1xuXG5cdFx0aWYgKCFyZXN1bHQgfHwgcmVzdWx0Lmxlbmd0aCAhPT0gMSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoYEZhaWxlZCB0byBnZXQgdGhlIHVzZXIgZGF0YSBmb3IgdGhlIHVzZXJJZCBvZiBcIiR7IHVzZXJuYW1lIH1cIi5gKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR1c2VyOiByZXN1bHRbMF0sXG5cdFx0fSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3VzZXJzLmxpc3QnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctZC1yb29tJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCB7IG9mZnNldCwgY291bnQgfSA9IHRoaXMuZ2V0UGFnaW5hdGlvbkl0ZW1zKCk7XG5cdFx0Y29uc3QgeyBzb3J0LCBmaWVsZHMsIHF1ZXJ5IH0gPSB0aGlzLnBhcnNlSnNvblF1ZXJ5KCk7XG5cblx0XHRjb25zdCB1c2VycyA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmQocXVlcnksIHtcblx0XHRcdHNvcnQ6IHNvcnQgPyBzb3J0IDogeyB1c2VybmFtZTogMSB9LFxuXHRcdFx0c2tpcDogb2Zmc2V0LFxuXHRcdFx0bGltaXQ6IGNvdW50LFxuXHRcdFx0ZmllbGRzLFxuXHRcdH0pLmZldGNoKCk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR1c2Vycyxcblx0XHRcdGNvdW50OiB1c2Vycy5sZW5ndGgsXG5cdFx0XHRvZmZzZXQsXG5cdFx0XHR0b3RhbDogUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZChxdWVyeSkuY291bnQoKSxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMucmVnaXN0ZXInLCB7IGF1dGhSZXF1aXJlZDogZmFsc2UgfSwge1xuXHRwb3N0KCkge1xuXHRcdGlmICh0aGlzLnVzZXJJZCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0xvZ2dlZCBpbiB1c2VycyBjYW4gbm90IHJlZ2lzdGVyIGFnYWluLicpO1xuXHRcdH1cblxuXHRcdC8vIFdlIHNldCB0aGVpciB1c2VybmFtZSBoZXJlLCBzbyByZXF1aXJlIGl0XG5cdFx0Ly8gVGhlIGByZWdpc3RlclVzZXJgIGNoZWNrcyBmb3IgdGhlIG90aGVyIHJlcXVpcmVtZW50c1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdHVzZXJuYW1lOiBTdHJpbmcsXG5cdFx0fSkpO1xuXG5cdFx0Ly8gUmVnaXN0ZXIgdGhlIHVzZXJcblx0XHRjb25zdCB1c2VySWQgPSBNZXRlb3IuY2FsbCgncmVnaXN0ZXJVc2VyJywgdGhpcy5ib2R5UGFyYW1zKTtcblxuXHRcdC8vIE5vdyBzZXQgdGhlaXIgdXNlcm5hbWVcblx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3NldFVzZXJuYW1lJywgdGhpcy5ib2R5UGFyYW1zLnVzZXJuYW1lKSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHVzZXI6IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHVzZXJJZCwgeyBmaWVsZHM6IFJvY2tldENoYXQuQVBJLnYxLmRlZmF1bHRGaWVsZHNUb0V4Y2x1ZGUgfSkgfSk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3VzZXJzLnJlc2V0QXZhdGFyJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLmdldFVzZXJGcm9tUGFyYW1zKCk7XG5cblx0XHRpZiAodXNlci5faWQgPT09IHRoaXMudXNlcklkKSB7XG5cdFx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgncmVzZXRBdmF0YXInKSk7XG5cdFx0fSBlbHNlIGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdlZGl0LW90aGVyLXVzZXItaW5mbycpKSB7XG5cdFx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXIuX2lkLCAoKSA9PiBNZXRlb3IuY2FsbCgncmVzZXRBdmF0YXInKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5zZXRBdmF0YXInLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0YXZhdGFyVXJsOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0dXNlcklkOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0dXNlcm5hbWU6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0fSkpO1xuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfQWxsb3dVc2VyQXZhdGFyQ2hhbmdlJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ0NoYW5nZSBhdmF0YXIgaXMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3VzZXJzLnNldEF2YXRhcicsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRsZXQgdXNlcjtcblx0XHRpZiAodGhpcy5pc1VzZXJGcm9tUGFyYW1zKCkpIHtcblx0XHRcdHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh0aGlzLnVzZXJJZCk7XG5cdFx0fSBlbHNlIGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdlZGl0LW90aGVyLXVzZXItaW5mbycpKSB7XG5cdFx0XHR1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcih1c2VyLl9pZCwgKCkgPT4ge1xuXHRcdFx0aWYgKHRoaXMuYm9keVBhcmFtcy5hdmF0YXJVcmwpIHtcblx0XHRcdFx0Um9ja2V0Q2hhdC5zZXRVc2VyQXZhdGFyKHVzZXIsIHRoaXMuYm9keVBhcmFtcy5hdmF0YXJVcmwsICcnLCAndXJsJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCBidXNib3kgPSBuZXcgQnVzYm95KHsgaGVhZGVyczogdGhpcy5yZXF1ZXN0LmhlYWRlcnMgfSk7XG5cblx0XHRcdFx0TWV0ZW9yLndyYXBBc3luYygoY2FsbGJhY2spID0+IHtcblx0XHRcdFx0XHRidXNib3kub24oJ2ZpbGUnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChmaWVsZG5hbWUsIGZpbGUsIGZpbGVuYW1lLCBlbmNvZGluZywgbWltZXR5cGUpID0+IHtcblx0XHRcdFx0XHRcdGlmIChmaWVsZG5hbWUgIT09ICdpbWFnZScpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtZmllbGQnKSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGNvbnN0IGltYWdlRGF0YSA9IFtdO1xuXHRcdFx0XHRcdFx0ZmlsZS5vbignZGF0YScsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGRhdGEpID0+IHtcblx0XHRcdFx0XHRcdFx0aW1hZ2VEYXRhLnB1c2goZGF0YSk7XG5cdFx0XHRcdFx0XHR9KSk7XG5cblx0XHRcdFx0XHRcdGZpbGUub24oJ2VuZCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNldFVzZXJBdmF0YXIodXNlciwgQnVmZmVyLmNvbmNhdChpbWFnZURhdGEpLCBtaW1ldHlwZSwgJ3Jlc3QnKTtcblx0XHRcdFx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdFx0XHRcdH0pKTtcblxuXHRcdFx0XHRcdH0pKTtcblx0XHRcdFx0XHR0aGlzLnJlcXVlc3QucGlwZShidXNib3kpO1xuXHRcdFx0XHR9KSgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMudXBkYXRlJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0dXNlcklkOiBTdHJpbmcsXG5cdFx0XHRkYXRhOiBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0XHRlbWFpbDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0bmFtZTogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0cGFzc3dvcmQ6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRcdHVzZXJuYW1lOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0XHRhY3RpdmU6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRyb2xlczogTWF0Y2guTWF5YmUoQXJyYXkpLFxuXHRcdFx0XHRqb2luRGVmYXVsdENoYW5uZWxzOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0cmVxdWlyZVBhc3N3b3JkQ2hhbmdlOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0c2VuZFdlbGNvbWVFbWFpbDogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRcdHZlcmlmaWVkOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0Y3VzdG9tRmllbGRzOiBNYXRjaC5NYXliZShPYmplY3QpLFxuXHRcdFx0fSksXG5cdFx0fSk7XG5cblx0XHRjb25zdCB1c2VyRGF0YSA9IF8uZXh0ZW5kKHsgX2lkOiB0aGlzLmJvZHlQYXJhbXMudXNlcklkIH0sIHRoaXMuYm9keVBhcmFtcy5kYXRhKTtcblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IFJvY2tldENoYXQuc2F2ZVVzZXIodGhpcy51c2VySWQsIHVzZXJEYXRhKSk7XG5cblx0XHRpZiAodGhpcy5ib2R5UGFyYW1zLmRhdGEuY3VzdG9tRmllbGRzKSB7XG5cdFx0XHRSb2NrZXRDaGF0LnNhdmVDdXN0b21GaWVsZHModGhpcy5ib2R5UGFyYW1zLnVzZXJJZCwgdGhpcy5ib2R5UGFyYW1zLmRhdGEuY3VzdG9tRmllbGRzKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIHRoaXMuYm9keVBhcmFtcy5kYXRhLmFjdGl2ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdFx0TWV0ZW9yLmNhbGwoJ3NldFVzZXJBY3RpdmVTdGF0dXMnLCB0aGlzLmJvZHlQYXJhbXMudXNlcklkLCB0aGlzLmJvZHlQYXJhbXMuZGF0YS5hY3RpdmUpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyB1c2VyOiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLmJvZHlQYXJhbXMudXNlcklkLCB7IGZpZWxkczogUm9ja2V0Q2hhdC5BUEkudjEuZGVmYXVsdEZpZWxkc1RvRXhjbHVkZSB9KSB9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMudXBkYXRlT3duQmFzaWNJbmZvJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0ZGF0YTogTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdFx0ZW1haWw6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRcdG5hbWU6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRcdHVzZXJuYW1lOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0XHRjdXJyZW50UGFzc3dvcmQ6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRcdG5ld1Bhc3N3b3JkOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0fSksXG5cdFx0XHRjdXN0b21GaWVsZHM6IE1hdGNoLk1heWJlKE9iamVjdCksXG5cdFx0fSk7XG5cblx0XHRjb25zdCB1c2VyRGF0YSA9IHtcblx0XHRcdGVtYWlsOiB0aGlzLmJvZHlQYXJhbXMuZGF0YS5lbWFpbCxcblx0XHRcdHJlYWxuYW1lOiB0aGlzLmJvZHlQYXJhbXMuZGF0YS5uYW1lLFxuXHRcdFx0dXNlcm5hbWU6IHRoaXMuYm9keVBhcmFtcy5kYXRhLnVzZXJuYW1lLFxuXHRcdFx0bmV3UGFzc3dvcmQ6IHRoaXMuYm9keVBhcmFtcy5kYXRhLm5ld1Bhc3N3b3JkLFxuXHRcdFx0dHlwZWRQYXNzd29yZDogdGhpcy5ib2R5UGFyYW1zLmRhdGEuY3VycmVudFBhc3N3b3JkLFxuXHRcdH07XG5cblx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgnc2F2ZVVzZXJQcm9maWxlJywgdXNlckRhdGEsIHRoaXMuYm9keVBhcmFtcy5jdXN0b21GaWVsZHMpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgdXNlcjogUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodGhpcy51c2VySWQsIHsgZmllbGRzOiBSb2NrZXRDaGF0LkFQSS52MS5kZWZhdWx0RmllbGRzVG9FeGNsdWRlIH0pIH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5jcmVhdGVUb2tlbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRVc2VyRnJvbVBhcmFtcygpO1xuXHRcdGxldCBkYXRhO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IHtcblx0XHRcdGRhdGEgPSBNZXRlb3IuY2FsbCgnY3JlYXRlVG9rZW4nLCB1c2VyLl9pZCk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGRhdGEgPyBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgZGF0YSB9KSA6IFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5nZXRQcmVmZXJlbmNlcycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLnVzZXJJZCk7XG5cdFx0aWYgKHVzZXIuc2V0dGluZ3MpIHtcblx0XHRcdGNvbnN0IHsgcHJlZmVyZW5jZXMgfSA9IHVzZXIuc2V0dGluZ3M7XG5cdFx0XHRwcmVmZXJlbmNlcy5sYW5ndWFnZSA9IHVzZXIubGFuZ3VhZ2U7XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0cHJlZmVyZW5jZXMsXG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoVEFQaTE4bi5fXygnQWNjb3VudHNfRGVmYXVsdF9Vc2VyX1ByZWZlcmVuY2VzX25vdF9hdmFpbGFibGUnKS50b1VwcGVyQ2FzZSgpKTtcblx0XHR9XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3VzZXJzLnNldFByZWZlcmVuY2VzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0dXNlcklkOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0ZGF0YTogTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdFx0bmV3Um9vbU5vdGlmaWNhdGlvbjogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0bmV3TWVzc2FnZU5vdGlmaWNhdGlvbjogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0Y2xvY2tNb2RlOiBNYXRjaC5NYXliZShOdW1iZXIpLFxuXHRcdFx0XHR1c2VFbW9qaXM6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRjb252ZXJ0QXNjaWlFbW9qaTogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRcdHNhdmVNb2JpbGVCYW5kd2lkdGg6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRjb2xsYXBzZU1lZGlhQnlEZWZhdWx0OiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0YXV0b0ltYWdlTG9hZDogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRcdGVtYWlsTm90aWZpY2F0aW9uTW9kZTogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0dW5yZWFkQWxlcnQ6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRub3RpZmljYXRpb25zU291bmRWb2x1bWU6IE1hdGNoLk1heWJlKE51bWJlciksXG5cdFx0XHRcdGRlc2t0b3BOb3RpZmljYXRpb25zOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0XHRtb2JpbGVOb3RpZmljYXRpb25zOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0XHRlbmFibGVBdXRvQXdheTogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRcdGhpZ2hsaWdodHM6IE1hdGNoLk1heWJlKEFycmF5KSxcblx0XHRcdFx0ZGVza3RvcE5vdGlmaWNhdGlvbkR1cmF0aW9uOiBNYXRjaC5NYXliZShOdW1iZXIpLFxuXHRcdFx0XHRtZXNzYWdlVmlld01vZGU6IE1hdGNoLk1heWJlKE51bWJlciksXG5cdFx0XHRcdGhpZGVVc2VybmFtZXM6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRoaWRlUm9sZXM6IE1hdGNoLk1heWJlKEJvb2xlYW4pLFxuXHRcdFx0XHRoaWRlQXZhdGFyczogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRcdGhpZGVGbGV4VGFiOiBNYXRjaC5NYXliZShCb29sZWFuKSxcblx0XHRcdFx0c2VuZE9uRW50ZXI6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRcdHJvb21Db3VudGVyU2lkZWJhcjogTWF0Y2guTWF5YmUoQm9vbGVhbiksXG5cdFx0XHRcdGxhbmd1YWdlOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0XHRzaWRlYmFyU2hvd0Zhdm9yaXRlczogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbiksXG5cdFx0XHRcdHNpZGViYXJTaG93VW5yZWFkOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKSxcblx0XHRcdFx0c2lkZWJhclNvcnRieTogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdFx0c2lkZWJhclZpZXdNb2RlOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuXHRcdFx0XHRzaWRlYmFySGlkZUF2YXRhcjogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbiksXG5cdFx0XHRcdHNpZGViYXJHcm91cEJ5VHlwZTogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbiksXG5cdFx0XHRcdG11dGVGb2N1c2VkQ29udmVyc2F0aW9uczogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbiksXG5cdFx0XHR9KSxcblx0XHR9KTtcblxuXHRcdGNvbnN0IHVzZXJJZCA9IHRoaXMuYm9keVBhcmFtcy51c2VySWQgPyB0aGlzLmJvZHlQYXJhbXMudXNlcklkIDogdGhpcy51c2VySWQ7XG5cdFx0Y29uc3QgdXNlckRhdGEgPSB7XG5cdFx0XHRfaWQ6IHVzZXJJZCxcblx0XHRcdHNldHRpbmdzOiB7XG5cdFx0XHRcdHByZWZlcmVuY2VzOiB0aGlzLmJvZHlQYXJhbXMuZGF0YSxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdGlmICh0aGlzLmJvZHlQYXJhbXMuZGF0YS5sYW5ndWFnZSkge1xuXHRcdFx0Y29uc3QgeyBsYW5ndWFnZSB9ID0gdGhpcy5ib2R5UGFyYW1zLmRhdGE7XG5cdFx0XHRkZWxldGUgdGhpcy5ib2R5UGFyYW1zLmRhdGEubGFuZ3VhZ2U7XG5cdFx0XHR1c2VyRGF0YS5sYW5ndWFnZSA9IGxhbmd1YWdlO1xuXHRcdH1cblxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IFJvY2tldENoYXQuc2F2ZVVzZXIodGhpcy51c2VySWQsIHVzZXJEYXRhKSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHR1c2VyOiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh1c2VySWQsIHtcblx0XHRcdFx0ZmllbGRzOiB7XG5cdFx0XHRcdFx0J3NldHRpbmdzLnByZWZlcmVuY2VzJzogMSxcblx0XHRcdFx0fSxcblx0XHRcdH0pLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5mb3Jnb3RQYXNzd29yZCcsIHsgYXV0aFJlcXVpcmVkOiBmYWxzZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgeyBlbWFpbCB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXHRcdGlmICghZW1haWwpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgXFwnZW1haWxcXCcgcGFyYW0gaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBlbWFpbFNlbnQgPSBNZXRlb3IuY2FsbCgnc2VuZEZvcmdvdFBhc3N3b3JkRW1haWwnLCBlbWFpbCk7XG5cdFx0aWYgKGVtYWlsU2VudCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0XHR9XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1VzZXIgbm90IGZvdW5kJyk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3VzZXJzLmdldFVzZXJuYW1lU3VnZ2VzdGlvbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGNvbnN0IHJlc3VsdCA9IE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdnZXRVc2VybmFtZVN1Z2dlc3Rpb24nKSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHJlc3VsdCB9KTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgndXNlcnMuZ2VuZXJhdGVQZXJzb25hbEFjY2Vzc1Rva2VuJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IHsgdG9rZW5OYW1lIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0aWYgKCF0b2tlbk5hbWUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgXFwndG9rZW5OYW1lXFwnIHBhcmFtIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXHRcdGNvbnN0IHRva2VuID0gTWV0ZW9yLnJ1bkFzVXNlcih0aGlzLnVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ3BlcnNvbmFsQWNjZXNzVG9rZW5zOmdlbmVyYXRlVG9rZW4nLCB7IHRva2VuTmFtZSB9KSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHRva2VuIH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5yZWdlbmVyYXRlUGVyc29uYWxBY2Nlc3NUb2tlbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRjb25zdCB7IHRva2VuTmFtZSB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXHRcdGlmICghdG9rZW5OYW1lKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnVGhlIFxcJ3Rva2VuTmFtZVxcJyBwYXJhbSBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblx0XHRjb25zdCB0b2tlbiA9IE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdwZXJzb25hbEFjY2Vzc1Rva2VuczpyZWdlbmVyYXRlVG9rZW4nLCB7IHRva2VuTmFtZSB9KSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHRva2VuIH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5nZXRQZXJzb25hbEFjY2Vzc1Rva2VucycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FQSV9FbmFibGVfUGVyc29uYWxfQWNjZXNzX1Rva2VucycpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1wZXJzb25hbC1hY2Nlc3MtdG9rZW5zLWFyZS1jdXJyZW50LWRpc2FibGVkJywgJ1BlcnNvbmFsIEFjY2VzcyBUb2tlbnMgYXJlIGN1cnJlbnRseSBkaXNhYmxlZCcpO1xuXHRcdH1cblx0XHRjb25zdCBsb2dpblRva2VucyA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmdldExvZ2luVG9rZW5zQnlVc2VySWQodGhpcy51c2VySWQpLmZldGNoKClbMF07XG5cdFx0Y29uc3QgZ2V0UGVyc29uYWxBY2Nlc3NUb2tlbnMgPSAoKSA9PiBsb2dpblRva2Vucy5zZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnNcblx0XHRcdC5maWx0ZXIoKGxvZ2luVG9rZW4pID0+IGxvZ2luVG9rZW4udHlwZSAmJiBsb2dpblRva2VuLnR5cGUgPT09ICdwZXJzb25hbEFjY2Vzc1Rva2VuJylcblx0XHRcdC5tYXAoKGxvZ2luVG9rZW4pID0+ICh7XG5cdFx0XHRcdG5hbWU6IGxvZ2luVG9rZW4ubmFtZSxcblx0XHRcdFx0Y3JlYXRlZEF0OiBsb2dpblRva2VuLmNyZWF0ZWRBdCxcblx0XHRcdFx0bGFzdFRva2VuUGFydDogbG9naW5Ub2tlbi5sYXN0VG9rZW5QYXJ0LFxuXHRcdFx0fSkpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0dG9rZW5zOiBnZXRQZXJzb25hbEFjY2Vzc1Rva2VucygpLFxuXHRcdH0pO1xuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCd1c2Vycy5yZW1vdmVQZXJzb25hbEFjY2Vzc1Rva2VuJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IHsgdG9rZW5OYW1lIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0aWYgKCF0b2tlbk5hbWUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgXFwndG9rZW5OYW1lXFwnIHBhcmFtIGlzIHJlcXVpcmVkJyk7XG5cdFx0fVxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdwZXJzb25hbEFjY2Vzc1Rva2VuczpyZW1vdmVUb2tlbicsIHtcblx0XHRcdHRva2VuTmFtZSxcblx0XHR9KSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgQnVzYm95IGZyb20gJ2J1c2JveSc7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdhc3NldHMuc2V0QXNzZXQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Y29uc3QgYnVzYm95ID0gbmV3IEJ1c2JveSh7IGhlYWRlcnM6IHRoaXMucmVxdWVzdC5oZWFkZXJzIH0pO1xuXHRcdGNvbnN0IGZpZWxkcyA9IHt9O1xuXHRcdGxldCBhc3NldCA9IHt9O1xuXG5cdFx0TWV0ZW9yLndyYXBBc3luYygoY2FsbGJhY2spID0+IHtcblx0XHRcdGJ1c2JveS5vbignZmllbGQnLCAoZmllbGRuYW1lLCB2YWx1ZSkgPT4gZmllbGRzW2ZpZWxkbmFtZV0gPSB2YWx1ZSk7XG5cdFx0XHRidXNib3kub24oJ2ZpbGUnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChmaWVsZG5hbWUsIGZpbGUsIGZpbGVuYW1lLCBlbmNvZGluZywgbWltZXR5cGUpID0+IHtcblx0XHRcdFx0Y29uc3QgaXNWYWxpZEFzc2V0ID0gT2JqZWN0LmtleXMoUm9ja2V0Q2hhdC5Bc3NldHMuYXNzZXRzKS5pbmNsdWRlcyhmaWVsZG5hbWUpO1xuXHRcdFx0XHRpZiAoIWlzVmFsaWRBc3NldCkge1xuXHRcdFx0XHRcdGNhbGxiYWNrKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtYXNzZXQnLCAnSW52YWxpZCBhc3NldCcpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCBhc3NldERhdGEgPSBbXTtcblx0XHRcdFx0ZmlsZS5vbignZGF0YScsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGRhdGEpID0+IHtcblx0XHRcdFx0XHRhc3NldERhdGEucHVzaChkYXRhKTtcblx0XHRcdFx0fSkpO1xuXG5cdFx0XHRcdGZpbGUub24oJ2VuZCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuXHRcdFx0XHRcdGFzc2V0ID0ge1xuXHRcdFx0XHRcdFx0YnVmZmVyOiBCdWZmZXIuY29uY2F0KGFzc2V0RGF0YSksXG5cdFx0XHRcdFx0XHRuYW1lOiBmaWVsZG5hbWUsXG5cdFx0XHRcdFx0XHRtaW1ldHlwZSxcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9KSk7XG5cdFx0XHR9KSk7XG5cdFx0XHRidXNib3kub24oJ2ZpbmlzaCcsICgpID0+IGNhbGxiYWNrKCkpO1xuXHRcdFx0dGhpcy5yZXF1ZXN0LnBpcGUoYnVzYm95KTtcblx0XHR9KSgpO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCdzZXRBc3NldCcsIGFzc2V0LmJ1ZmZlciwgYXNzZXQubWltZXR5cGUsIGFzc2V0Lm5hbWUpKTtcblx0XHRpZiAoZmllbGRzLnJlZnJlc2hBbGxDbGllbnRzKSB7XG5cdFx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgncmVmcmVzaENsaWVudHMnKSk7XG5cdFx0fVxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2Fzc2V0cy51bnNldEFzc2V0JywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IHsgYXNzZXROYW1lLCByZWZyZXNoQWxsQ2xpZW50cyB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXHRcdGNvbnN0IGlzVmFsaWRBc3NldCA9IE9iamVjdC5rZXlzKFJvY2tldENoYXQuQXNzZXRzLmFzc2V0cykuaW5jbHVkZXMoYXNzZXROYW1lKTtcblx0XHRpZiAoIWlzVmFsaWRBc3NldCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1hc3NldCcsICdJbnZhbGlkIGFzc2V0Jyk7XG5cdFx0fVxuXHRcdE1ldGVvci5ydW5Bc1VzZXIodGhpcy51c2VySWQsICgpID0+IE1ldGVvci5jYWxsKCd1bnNldEFzc2V0JywgYXNzZXROYW1lKSk7XG5cdFx0aWYgKHJlZnJlc2hBbGxDbGllbnRzKSB7XG5cdFx0XHRNZXRlb3IucnVuQXNVc2VyKHRoaXMudXNlcklkLCAoKSA9PiBNZXRlb3IuY2FsbCgncmVmcmVzaENsaWVudHMnKSk7XG5cdFx0fVxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdH0sXG59KTtcbiJdfQ==
