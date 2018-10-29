(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Logger = Package['rocketchat:logger'].Logger;
var SystemLogger = Package['rocketchat:logger'].SystemLogger;
var LoggerManager = Package['rocketchat:logger'].LoggerManager;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var Accounts = Package['accounts-base'].Accounts;
var ECMAScript = Package.ecmascript.ECMAScript;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var logger;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:cas":{"server":{"cas_rocketchat.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_cas/server/cas_rocketchat.js                                                        //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
/* globals logger:true */
logger = new Logger('CAS', {});
Meteor.startup(function () {
  RocketChat.settings.addGroup('CAS', function () {
    this.add('CAS_enabled', false, {
      type: 'boolean',
      group: 'CAS',
      public: true
    });
    this.add('CAS_base_url', '', {
      type: 'string',
      group: 'CAS',
      public: true
    });
    this.add('CAS_login_url', '', {
      type: 'string',
      group: 'CAS',
      public: true
    });
    this.add('CAS_version', '1.0', {
      type: 'select',
      values: [{
        key: '1.0',
        i18nLabel: '1.0'
      }, {
        key: '2.0',
        i18nLabel: '2.0'
      }],
      group: 'CAS'
    });
    this.section('Attribute_handling', function () {
      // Enable/disable sync
      this.add('CAS_Sync_User_Data_Enabled', true, {
        type: 'boolean'
      }); // Attribute mapping table

      this.add('CAS_Sync_User_Data_FieldMap', '{}', {
        type: 'string'
      });
    });
    this.section('CAS_Login_Layout', function () {
      this.add('CAS_popup_width', '810', {
        type: 'string',
        group: 'CAS',
        public: true
      });
      this.add('CAS_popup_height', '610', {
        type: 'string',
        group: 'CAS',
        public: true
      });
      this.add('CAS_button_label_text', 'CAS', {
        type: 'string',
        group: 'CAS'
      });
      this.add('CAS_button_label_color', '#FFFFFF', {
        type: 'color',
        group: 'CAS'
      });
      this.add('CAS_button_color', '#13679A', {
        type: 'color',
        group: 'CAS'
      });
      this.add('CAS_autoclose', true, {
        type: 'boolean',
        group: 'CAS'
      });
    });
  });
});
let timer;

function updateServices()
/* record*/
{
  if (typeof timer !== 'undefined') {
    Meteor.clearTimeout(timer);
  }

  timer = Meteor.setTimeout(function () {
    const data = {
      // These will pe passed to 'node-cas' as options
      enabled: RocketChat.settings.get('CAS_enabled'),
      base_url: RocketChat.settings.get('CAS_base_url'),
      login_url: RocketChat.settings.get('CAS_login_url'),
      // Rocketchat Visuals
      buttonLabelText: RocketChat.settings.get('CAS_button_label_text'),
      buttonLabelColor: RocketChat.settings.get('CAS_button_label_color'),
      buttonColor: RocketChat.settings.get('CAS_button_color'),
      width: RocketChat.settings.get('CAS_popup_width'),
      height: RocketChat.settings.get('CAS_popup_height'),
      autoclose: RocketChat.settings.get('CAS_autoclose')
    }; // Either register or deregister the CAS login service based upon its configuration

    if (data.enabled) {
      logger.info('Enabling CAS login service');
      ServiceConfiguration.configurations.upsert({
        service: 'cas'
      }, {
        $set: data
      });
    } else {
      logger.info('Disabling CAS login service');
      ServiceConfiguration.configurations.remove({
        service: 'cas'
      });
    }
  }, 2000);
}

RocketChat.settings.get(/^CAS_.+/, (key, value) => {
  updateServices(value);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cas_server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_cas/server/cas_server.js                                                            //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let fiber;
module.watch(require("fibers"), {
  default(v) {
    fiber = v;
  }

}, 1);
let url;
module.watch(require("url"), {
  default(v) {
    url = v;
  }

}, 2);
let CAS;
module.watch(require("cas"), {
  default(v) {
    CAS = v;
  }

}, 3);
RoutePolicy.declare('/_cas/', 'network');

const closePopup = function (res) {
  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  const content = '<html><head><script>window.close()</script></head></html>';
  res.end(content, 'utf-8');
};

const casTicket = function (req, token, callback) {
  // get configuration
  if (!RocketChat.settings.get('CAS_enabled')) {
    logger.error('Got ticket validation request, but CAS is not enabled');
    callback();
  } // get ticket and validate.


  const parsedUrl = url.parse(req.url, true);
  const ticketId = parsedUrl.query.ticket;
  const baseUrl = RocketChat.settings.get('CAS_base_url');
  const cas_version = parseFloat(RocketChat.settings.get('CAS_version'));

  const appUrl = Meteor.absoluteUrl().replace(/\/$/, '') + __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;

  logger.debug(`Using CAS_base_url: ${baseUrl}`);
  const cas = new CAS({
    base_url: baseUrl,
    version: cas_version,
    service: `${appUrl}/_cas/${token}`
  });
  cas.validate(ticketId, Meteor.bindEnvironment(function (err, status, username, details) {
    if (err) {
      logger.error(`error when trying to validate: ${err.message}`);
    } else if (status) {
      logger.info(`Validated user: ${username}`);
      const user_info = {
        username
      }; // CAS 2.0 attributes handling

      if (details && details.attributes) {
        _.extend(user_info, {
          attributes: details.attributes
        });
      }

      RocketChat.models.CredentialTokens.create(token, user_info);
    } else {
      logger.error(`Unable to validate ticket: ${ticketId}`);
    } // logger.debug("Receveied response: " + JSON.stringify(details, null , 4));


    callback();
  }));
  return;
};

const middleware = function (req, res, next) {
  // Make sure to catch any exceptions because otherwise we'd crash
  // the runner
  try {
    const barePath = req.url.substring(0, req.url.indexOf('?'));
    const splitPath = barePath.split('/'); // Any non-cas request will continue down the default
    // middlewares.

    if (splitPath[1] !== '_cas') {
      next();
      return;
    } // get auth token


    const credentialToken = splitPath[2];

    if (!credentialToken) {
      closePopup(res);
      return;
    } // validate ticket


    casTicket(req, credentialToken, function () {
      closePopup(res);
    });
  } catch (err) {
    logger.error(`Unexpected error : ${err.message}`);
    closePopup(res);
  }
}; // Listen to incoming OAuth http requests


WebApp.connectHandlers.use(function (req, res, next) {
  // Need to create a fiber since we're using synchronous http calls and nothing
  // else is wrapping this in a fiber automatically
  fiber(function () {
    middleware(req, res, next);
  }).run();
});
/*
 * Register a server-side login handle.
 * It is call after Accounts.callLoginMethod() is call from client.
 *
 */

Accounts.registerLoginHandler(function (options) {
  if (!options.cas) {
    return undefined;
  }

  const credentials = RocketChat.models.CredentialTokens.findOneById(options.cas.credentialToken);

  if (credentials === undefined) {
    throw new Meteor.Error(Accounts.LoginCancelledError.numericError, 'no matching login attempt found');
  }

  const result = credentials.userInfo;
  const syncUserDataFieldMap = RocketChat.settings.get('CAS_Sync_User_Data_FieldMap').trim();
  const cas_version = parseFloat(RocketChat.settings.get('CAS_version'));
  const sync_enabled = RocketChat.settings.get('CAS_Sync_User_Data_Enabled'); // We have these

  const ext_attrs = {
    username: result.username
  }; // We need these

  const int_attrs = {
    email: undefined,
    name: undefined,
    username: undefined,
    rooms: undefined
  }; // Import response attributes

  if (cas_version >= 2.0) {
    // Clean & import external attributes
    _.each(result.attributes, function (value, ext_name) {
      if (value) {
        ext_attrs[ext_name] = value[0];
      }
    });
  } // Source internal attributes


  if (syncUserDataFieldMap) {
    // Our mapping table: key(int_attr) -> value(ext_attr)
    // Spoken: Source this internal attribute from these external attributes
    const attr_map = JSON.parse(syncUserDataFieldMap);

    _.each(attr_map, function (source, int_name) {
      // Source is our String to interpolate
      if (_.isString(source)) {
        _.each(ext_attrs, function (value, ext_name) {
          source = source.replace(`%${ext_name}%`, ext_attrs[ext_name]);
        });

        int_attrs[int_name] = source;
        logger.debug(`Sourced internal attribute: ${int_name} = ${source}`);
      }
    });
  } // Search existing user by its external service id


  logger.debug(`Looking up user by id: ${result.username}`);
  let user = Meteor.users.findOne({
    'services.cas.external_id': result.username
  });

  if (user) {
    logger.debug(`Using existing user for '${result.username}' with id: ${user._id}`);

    if (sync_enabled) {
      logger.debug('Syncing user attributes'); // Update name

      if (int_attrs.name) {
        RocketChat._setRealName(user._id, int_attrs.name);
      } // Update email


      if (int_attrs.email) {
        Meteor.users.update(user, {
          $set: {
            emails: [{
              address: int_attrs.email,
              verified: true
            }]
          }
        });
      }
    }
  } else {
    // Define new user
    const newUser = {
      username: result.username,
      active: true,
      globalRoles: ['user'],
      emails: [],
      services: {
        cas: {
          external_id: result.username,
          version: cas_version,
          attrs: int_attrs
        }
      }
    }; // Add User.name

    if (int_attrs.name) {
      _.extend(newUser, {
        name: int_attrs.name
      });
    } // Add email


    if (int_attrs.email) {
      _.extend(newUser, {
        emails: [{
          address: int_attrs.email,
          verified: true
        }]
      });
    } // Create the user


    logger.debug(`User "${result.username}" does not exist yet, creating it`);
    const userId = Accounts.insertUserDoc({}, newUser); // Fetch and use it

    user = Meteor.users.findOne(userId);
    logger.debug(`Created new user for '${result.username}' with id: ${user._id}`); // logger.debug(JSON.stringify(user, undefined, 4));

    logger.debug(`Joining user to attribute channels: ${int_attrs.rooms}`);

    if (int_attrs.rooms) {
      _.each(int_attrs.rooms.split(','), function (room_name) {
        if (room_name) {
          let room = RocketChat.models.Rooms.findOneByNameAndType(room_name, 'c');

          if (!room) {
            room = RocketChat.models.Rooms.createWithIdTypeAndName(Random.id(), 'c', room_name);
          }

          if (!RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, userId)) {
            RocketChat.models.Subscriptions.createWithRoomAndUser(room, user, {
              ts: new Date(),
              open: true,
              alert: true,
              unread: 1,
              userMentions: 1,
              groupMentions: 0
            });
          }
        }
      });
    }
  }

  return {
    userId: user._id
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"models":{"CredentialTokens.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_cas/server/models/CredentialTokens.js                                               //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
RocketChat.models.CredentialTokens = new class extends RocketChat.models._Base {
  constructor() {
    super('credential_tokens');
    this.tryEnsureIndex({
      expireAt: 1
    }, {
      sparse: 1,
      expireAfterSeconds: 0
    });
  }

  create(_id, userInfo) {
    const validForMilliseconds = 60000; // Valid for 60 seconds

    const token = {
      _id,
      userInfo,
      expireAt: new Date(Date.now() + validForMilliseconds)
    };
    this.insert(token);
    return token;
  }

  findOneById(_id) {
    const query = {
      _id,
      expireAt: {
        $gt: new Date()
      }
    };
    return this.findOne(query);
  }

}();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:cas/server/cas_rocketchat.js");
require("/node_modules/meteor/rocketchat:cas/server/cas_server.js");
require("/node_modules/meteor/rocketchat:cas/server/models/CredentialTokens.js");

/* Exports */
Package._define("rocketchat:cas");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_cas.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjYXMvc2VydmVyL2Nhc19yb2NrZXRjaGF0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNhcy9zZXJ2ZXIvY2FzX3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjYXMvc2VydmVyL21vZGVscy9DcmVkZW50aWFsVG9rZW5zLmpzIl0sIm5hbWVzIjpbImxvZ2dlciIsIkxvZ2dlciIsIk1ldGVvciIsInN0YXJ0dXAiLCJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJhZGRHcm91cCIsImFkZCIsInR5cGUiLCJncm91cCIsInB1YmxpYyIsInZhbHVlcyIsImtleSIsImkxOG5MYWJlbCIsInNlY3Rpb24iLCJ0aW1lciIsInVwZGF0ZVNlcnZpY2VzIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImRhdGEiLCJlbmFibGVkIiwiZ2V0IiwiYmFzZV91cmwiLCJsb2dpbl91cmwiLCJidXR0b25MYWJlbFRleHQiLCJidXR0b25MYWJlbENvbG9yIiwiYnV0dG9uQ29sb3IiLCJ3aWR0aCIsImhlaWdodCIsImF1dG9jbG9zZSIsImluZm8iLCJTZXJ2aWNlQ29uZmlndXJhdGlvbiIsImNvbmZpZ3VyYXRpb25zIiwidXBzZXJ0Iiwic2VydmljZSIsIiRzZXQiLCJyZW1vdmUiLCJ2YWx1ZSIsIl8iLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsImZpYmVyIiwidXJsIiwiQ0FTIiwiUm91dGVQb2xpY3kiLCJkZWNsYXJlIiwiY2xvc2VQb3B1cCIsInJlcyIsIndyaXRlSGVhZCIsImNvbnRlbnQiLCJlbmQiLCJjYXNUaWNrZXQiLCJyZXEiLCJ0b2tlbiIsImNhbGxiYWNrIiwiZXJyb3IiLCJwYXJzZWRVcmwiLCJwYXJzZSIsInRpY2tldElkIiwicXVlcnkiLCJ0aWNrZXQiLCJiYXNlVXJsIiwiY2FzX3ZlcnNpb24iLCJwYXJzZUZsb2F0IiwiYXBwVXJsIiwiYWJzb2x1dGVVcmwiLCJyZXBsYWNlIiwiX19tZXRlb3JfcnVudGltZV9jb25maWdfXyIsIlJPT1RfVVJMX1BBVEhfUFJFRklYIiwiZGVidWciLCJjYXMiLCJ2ZXJzaW9uIiwidmFsaWRhdGUiLCJiaW5kRW52aXJvbm1lbnQiLCJlcnIiLCJzdGF0dXMiLCJ1c2VybmFtZSIsImRldGFpbHMiLCJtZXNzYWdlIiwidXNlcl9pbmZvIiwiYXR0cmlidXRlcyIsImV4dGVuZCIsIm1vZGVscyIsIkNyZWRlbnRpYWxUb2tlbnMiLCJjcmVhdGUiLCJtaWRkbGV3YXJlIiwibmV4dCIsImJhcmVQYXRoIiwic3Vic3RyaW5nIiwiaW5kZXhPZiIsInNwbGl0UGF0aCIsInNwbGl0IiwiY3JlZGVudGlhbFRva2VuIiwiV2ViQXBwIiwiY29ubmVjdEhhbmRsZXJzIiwidXNlIiwicnVuIiwiQWNjb3VudHMiLCJyZWdpc3RlckxvZ2luSGFuZGxlciIsIm9wdGlvbnMiLCJ1bmRlZmluZWQiLCJjcmVkZW50aWFscyIsImZpbmRPbmVCeUlkIiwiRXJyb3IiLCJMb2dpbkNhbmNlbGxlZEVycm9yIiwibnVtZXJpY0Vycm9yIiwicmVzdWx0IiwidXNlckluZm8iLCJzeW5jVXNlckRhdGFGaWVsZE1hcCIsInRyaW0iLCJzeW5jX2VuYWJsZWQiLCJleHRfYXR0cnMiLCJpbnRfYXR0cnMiLCJlbWFpbCIsIm5hbWUiLCJyb29tcyIsImVhY2giLCJleHRfbmFtZSIsImF0dHJfbWFwIiwiSlNPTiIsInNvdXJjZSIsImludF9uYW1lIiwiaXNTdHJpbmciLCJ1c2VyIiwidXNlcnMiLCJmaW5kT25lIiwiX2lkIiwiX3NldFJlYWxOYW1lIiwidXBkYXRlIiwiZW1haWxzIiwiYWRkcmVzcyIsInZlcmlmaWVkIiwibmV3VXNlciIsImFjdGl2ZSIsImdsb2JhbFJvbGVzIiwic2VydmljZXMiLCJleHRlcm5hbF9pZCIsImF0dHJzIiwidXNlcklkIiwiaW5zZXJ0VXNlckRvYyIsInJvb21fbmFtZSIsInJvb20iLCJSb29tcyIsImZpbmRPbmVCeU5hbWVBbmRUeXBlIiwiY3JlYXRlV2l0aElkVHlwZUFuZE5hbWUiLCJSYW5kb20iLCJpZCIsIlN1YnNjcmlwdGlvbnMiLCJmaW5kT25lQnlSb29tSWRBbmRVc2VySWQiLCJjcmVhdGVXaXRoUm9vbUFuZFVzZXIiLCJ0cyIsIkRhdGUiLCJvcGVuIiwiYWxlcnQiLCJ1bnJlYWQiLCJ1c2VyTWVudGlvbnMiLCJncm91cE1lbnRpb25zIiwiX0Jhc2UiLCJjb25zdHJ1Y3RvciIsInRyeUVuc3VyZUluZGV4IiwiZXhwaXJlQXQiLCJzcGFyc2UiLCJleHBpcmVBZnRlclNlY29uZHMiLCJ2YWxpZEZvck1pbGxpc2Vjb25kcyIsIm5vdyIsImluc2VydCIsIiRndCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBRUFBLFNBQVMsSUFBSUMsTUFBSixDQUFXLEtBQVgsRUFBa0IsRUFBbEIsQ0FBVDtBQUVBQyxPQUFPQyxPQUFQLENBQWUsWUFBVztBQUN6QkMsYUFBV0MsUUFBWCxDQUFvQkMsUUFBcEIsQ0FBNkIsS0FBN0IsRUFBb0MsWUFBVztBQUM5QyxTQUFLQyxHQUFMLENBQVMsYUFBVCxFQUF3QixLQUF4QixFQUErQjtBQUFFQyxZQUFNLFNBQVI7QUFBbUJDLGFBQU8sS0FBMUI7QUFBaUNDLGNBQVE7QUFBekMsS0FBL0I7QUFDQSxTQUFLSCxHQUFMLENBQVMsY0FBVCxFQUF5QixFQUF6QixFQUE2QjtBQUFFQyxZQUFNLFFBQVI7QUFBa0JDLGFBQU8sS0FBekI7QUFBZ0NDLGNBQVE7QUFBeEMsS0FBN0I7QUFDQSxTQUFLSCxHQUFMLENBQVMsZUFBVCxFQUEwQixFQUExQixFQUE4QjtBQUFFQyxZQUFNLFFBQVI7QUFBa0JDLGFBQU8sS0FBekI7QUFBZ0NDLGNBQVE7QUFBeEMsS0FBOUI7QUFDQSxTQUFLSCxHQUFMLENBQVMsYUFBVCxFQUF3QixLQUF4QixFQUErQjtBQUFFQyxZQUFNLFFBQVI7QUFBa0JHLGNBQVEsQ0FBQztB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QUFZd0IsR0FBWixFQUFpQjtBQUNoQixVQUFNbkUsUUFBUTtBQUNibUUsU0FEYTtBQUVia0MsZ0JBQVU7QUFBRU0sYUFBSyxJQUFJZixJQUFKO0FBQVA7QUFGRyxLQUFkO0FBS0EsV0FBTyxLQUFLMUIsT0FBTCxDQUFhbEUsS0FBYixDQUFQO0FBQ0E7O0FBMUI2RSxDQUExQyxFQUFyQyxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2Nhcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGdsb2JhbHMgbG9nZ2VyOnRydWUgKi9cblxubG9nZ2VyID0gbmV3IExvZ2dlcignQ0FTJywge30pO1xuXG5NZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGRHcm91cCgnQ0FTJywgZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5hZGQoJ0NBU19lbmFibGVkJywgZmFsc2UsIHsgdHlwZTogJ2Jvb2xlYW4nLCBncm91cDogJ0NBUycsIHB1YmxpYzogdHJ1ZSB9KTtcblx0XHR0aGlzLmFkZCgnQ0FTX2Jhc2VfdXJsJywgJycsIHsgdHlwZTogJ3N0cmluZycsIGdyb3VwOiAnQ0FTJywgcHVibGljOiB0cnVlIH0pO1xuXHRcdHRoaXMuYWRkKCdDQVNfbG9naW5fdXJsJywgJycsIHsgdHlwZTogJ3N0cmluZycsIGdyb3VwOiAnQ0FTJywgcHVibGljOiB0cnVlIH0pO1xuXHRcdHRoaXMuYWRkKCdDQVNfdmVyc2lvbicsICcxLjAnLCB7IHR5cGU6ICdzZWxlY3QnLCB2YWx1ZXM6IFt7IGtleTogJzEuMCcsIGkxOG5MYWJlbDogJzEuMCcgfSwgeyBrZXk6ICcyLjAnLCBpMThuTGFiZWw6ICcyLjAnIH1dLCBncm91cDogJ0NBUycgfSk7XG5cblx0XHR0aGlzLnNlY3Rpb24oJ0F0dHJpYnV0ZV9oYW5kbGluZycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gRW5hYmxlL2Rpc2FibGUgc3luY1xuXHRcdFx0dGhpcy5hZGQoJ0NBU19TeW5jX1VzZXJfRGF0YV9FbmFibGVkJywgdHJ1ZSwgeyB0eXBlOiAnYm9vbGVhbicgfSk7XG5cdFx0XHQvLyBBdHRyaWJ1dGUgbWFwcGluZyB0YWJsZVxuXHRcdFx0dGhpcy5hZGQoJ0NBU19TeW5jX1VzZXJfRGF0YV9GaWVsZE1hcCcsICd7fScsIHsgdHlwZTogJ3N0cmluZycgfSk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLnNlY3Rpb24oJ0NBU19Mb2dpbl9MYXlvdXQnLCBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuYWRkKCdDQVNfcG9wdXBfd2lkdGgnLCAnODEwJywgeyB0eXBlOiAnc3RyaW5nJywgZ3JvdXA6ICdDQVMnLCBwdWJsaWM6IHRydWUgfSk7XG5cdFx0XHR0aGlzLmFkZCgnQ0FTX3BvcHVwX2hlaWdodCcsICc2MTAnLCB7IHR5cGU6ICdzdHJpbmcnLCBncm91cDogJ0NBUycsIHB1YmxpYzogdHJ1ZSB9KTtcblx0XHRcdHRoaXMuYWRkKCdDQVNfYnV0dG9uX2xhYmVsX3RleHQnLCAnQ0FTJywgeyB0eXBlOiAnc3RyaW5nJywgZ3JvdXA6ICdDQVMnIH0pO1xuXHRcdFx0dGhpcy5hZGQoJ0NBU19idXR0b25fbGFiZWxfY29sb3InLCAnI0ZGRkZGRicsIHsgdHlwZTogJ2NvbG9yJywgZ3JvdXA6ICdDQVMnIH0pO1xuXHRcdFx0dGhpcy5hZGQoJ0NBU19idXR0b25fY29sb3InLCAnIzEzNjc5QScsIHsgdHlwZTogJ2NvbG9yJywgZ3JvdXA6ICdDQVMnIH0pO1xuXHRcdFx0dGhpcy5hZGQoJ0NBU19hdXRvY2xvc2UnLCB0cnVlLCB7IHR5cGU6ICdib29sZWFuJywgZ3JvdXA6ICdDQVMnIH0pO1xuXHRcdH0pO1xuXHR9KTtcbn0pO1xuXG5sZXQgdGltZXI7XG5cbmZ1bmN0aW9uIHVwZGF0ZVNlcnZpY2VzKC8qIHJlY29yZCovKSB7XG5cdGlmICh0eXBlb2YgdGltZXIgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0TWV0ZW9yLmNsZWFyVGltZW91dCh0aW1lcik7XG5cdH1cblxuXHR0aW1lciA9IE1ldGVvci5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHQvLyBUaGVzZSB3aWxsIHBlIHBhc3NlZCB0byAnbm9kZS1jYXMnIGFzIG9wdGlvbnNcblx0XHRcdGVuYWJsZWQ6ICAgICAgICAgIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdDQVNfZW5hYmxlZCcpLFxuXHRcdFx0YmFzZV91cmw6ICAgICAgICAgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0NBU19iYXNlX3VybCcpLFxuXHRcdFx0bG9naW5fdXJsOiAgICAgICAgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0NBU19sb2dpbl91cmwnKSxcblx0XHRcdC8vIFJvY2tldGNoYXQgVmlzdWFsc1xuXHRcdFx0YnV0dG9uTGFiZWxUZXh0OiAgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0NBU19idXR0b25fbGFiZWxfdGV4dCcpLFxuXHRcdFx0YnV0dG9uTGFiZWxDb2xvcjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0NBU19idXR0b25fbGFiZWxfY29sb3InKSxcblx0XHRcdGJ1dHRvbkNvbG9yOiAgICAgIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdDQVNfYnV0dG9uX2NvbG9yJyksXG5cdFx0XHR3aWR0aDogICAgICAgICAgICBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQ0FTX3BvcHVwX3dpZHRoJyksXG5cdFx0XHRoZWlnaHQ6ICAgICAgICAgICBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQ0FTX3BvcHVwX2hlaWdodCcpLFxuXHRcdFx0YXV0b2Nsb3NlOiAgICAgICAgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0NBU19hdXRvY2xvc2UnKSxcblx0XHR9O1xuXG5cdFx0Ly8gRWl0aGVyIHJlZ2lzdGVyIG9yIGRlcmVnaXN0ZXIgdGhlIENBUyBsb2dpbiBzZXJ2aWNlIGJhc2VkIHVwb24gaXRzIGNvbmZpZ3VyYXRpb25cblx0XHRpZiAoZGF0YS5lbmFibGVkKSB7XG5cdFx0XHRsb2dnZXIuaW5mbygnRW5hYmxpbmcgQ0FTIGxvZ2luIHNlcnZpY2UnKTtcblx0XHRcdFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLnVwc2VydCh7IHNlcnZpY2U6ICdjYXMnIH0sIHsgJHNldDogZGF0YSB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bG9nZ2VyLmluZm8oJ0Rpc2FibGluZyBDQVMgbG9naW4gc2VydmljZScpO1xuXHRcdFx0U2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMucmVtb3ZlKHsgc2VydmljZTogJ2NhcycgfSk7XG5cdFx0fVxuXHR9LCAyMDAwKTtcbn1cblxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoL15DQVNfLisvLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHR1cGRhdGVTZXJ2aWNlcyh2YWx1ZSk7XG59KTtcbiIsIi8qIGdsb2JhbHMgUm91dGVQb2xpY3ksIGxvZ2dlciAqL1xuLyoganNoaW50IG5ld2NhcDogZmFsc2UgKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5pbXBvcnQgZmliZXIgZnJvbSAnZmliZXJzJztcbmltcG9ydCB1cmwgZnJvbSAndXJsJztcbmltcG9ydCBDQVMgZnJvbSAnY2FzJztcblxuUm91dGVQb2xpY3kuZGVjbGFyZSgnL19jYXMvJywgJ25ldHdvcmsnKTtcblxuY29uc3QgY2xvc2VQb3B1cCA9IGZ1bmN0aW9uKHJlcykge1xuXHRyZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC1UeXBlJzogJ3RleHQvaHRtbCcgfSk7XG5cdGNvbnN0IGNvbnRlbnQgPSAnPGh0bWw+PGhlYWQ+PHNjcmlwdD53aW5kb3cuY2xvc2UoKTwvc2NyaXB0PjwvaGVhZD48L2h0bWw+Jztcblx0cmVzLmVuZChjb250ZW50LCAndXRmLTgnKTtcbn07XG5cbmNvbnN0IGNhc1RpY2tldCA9IGZ1bmN0aW9uKHJlcSwgdG9rZW4sIGNhbGxiYWNrKSB7XG5cblx0Ly8gZ2V0IGNvbmZpZ3VyYXRpb25cblx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQ0FTX2VuYWJsZWQnKSkge1xuXHRcdGxvZ2dlci5lcnJvcignR290IHRpY2tldCB2YWxpZGF0aW9uIHJlcXVlc3QsIGJ1dCBDQVMgaXMgbm90IGVuYWJsZWQnKTtcblx0XHRjYWxsYmFjaygpO1xuXHR9XG5cblx0Ly8gZ2V0IHRpY2tldCBhbmQgdmFsaWRhdGUuXG5cdGNvbnN0IHBhcnNlZFVybCA9IHVybC5wYXJzZShyZXEudXJsLCB0cnVlKTtcblx0Y29uc3QgdGlja2V0SWQgPSBwYXJzZWRVcmwucXVlcnkudGlja2V0O1xuXHRjb25zdCBiYXNlVXJsID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0NBU19iYXNlX3VybCcpO1xuXHRjb25zdCBjYXNfdmVyc2lvbiA9IHBhcnNlRmxvYXQoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0NBU192ZXJzaW9uJykpO1xuXHRjb25zdCBhcHBVcmwgPSBNZXRlb3IuYWJzb2x1dGVVcmwoKS5yZXBsYWNlKC9cXC8kLywgJycpICsgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTF9QQVRIX1BSRUZJWDtcblx0bG9nZ2VyLmRlYnVnKGBVc2luZyBDQVNfYmFzZV91cmw6ICR7IGJhc2VVcmwgfWApO1xuXG5cdGNvbnN0IGNhcyA9IG5ldyBDQVMoe1xuXHRcdGJhc2VfdXJsOiBiYXNlVXJsLFxuXHRcdHZlcnNpb246IGNhc192ZXJzaW9uLFxuXHRcdHNlcnZpY2U6IGAkeyBhcHBVcmwgfS9fY2FzLyR7IHRva2VuIH1gLFxuXHR9KTtcblxuXHRjYXMudmFsaWRhdGUodGlja2V0SWQsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoZnVuY3Rpb24oZXJyLCBzdGF0dXMsIHVzZXJuYW1lLCBkZXRhaWxzKSB7XG5cdFx0aWYgKGVycikge1xuXHRcdFx0bG9nZ2VyLmVycm9yKGBlcnJvciB3aGVuIHRyeWluZyB0byB2YWxpZGF0ZTogJHsgZXJyLm1lc3NhZ2UgfWApO1xuXHRcdH0gZWxzZSBpZiAoc3RhdHVzKSB7XG5cdFx0XHRsb2dnZXIuaW5mbyhgVmFsaWRhdGVkIHVzZXI6ICR7IHVzZXJuYW1lIH1gKTtcblx0XHRcdGNvbnN0IHVzZXJfaW5mbyA9IHsgdXNlcm5hbWUgfTtcblxuXHRcdFx0Ly8gQ0FTIDIuMCBhdHRyaWJ1dGVzIGhhbmRsaW5nXG5cdFx0XHRpZiAoZGV0YWlscyAmJiBkZXRhaWxzLmF0dHJpYnV0ZXMpIHtcblx0XHRcdFx0Xy5leHRlbmQodXNlcl9pbmZvLCB7IGF0dHJpYnV0ZXM6IGRldGFpbHMuYXR0cmlidXRlcyB9KTtcblx0XHRcdH1cblx0XHRcdFJvY2tldENoYXQubW9kZWxzLkNyZWRlbnRpYWxUb2tlbnMuY3JlYXRlKHRva2VuLCB1c2VyX2luZm8pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsb2dnZXIuZXJyb3IoYFVuYWJsZSB0byB2YWxpZGF0ZSB0aWNrZXQ6ICR7IHRpY2tldElkIH1gKTtcblx0XHR9XG5cdFx0Ly8gbG9nZ2VyLmRlYnVnKFwiUmVjZXZlaWVkIHJlc3BvbnNlOiBcIiArIEpTT04uc3RyaW5naWZ5KGRldGFpbHMsIG51bGwgLCA0KSk7XG5cblx0XHRjYWxsYmFjaygpO1xuXHR9KSk7XG5cblx0cmV0dXJuO1xufTtcblxuY29uc3QgbWlkZGxld2FyZSA9IGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG5cdC8vIE1ha2Ugc3VyZSB0byBjYXRjaCBhbnkgZXhjZXB0aW9ucyBiZWNhdXNlIG90aGVyd2lzZSB3ZSdkIGNyYXNoXG5cdC8vIHRoZSBydW5uZXJcblx0dHJ5IHtcblx0XHRjb25zdCBiYXJlUGF0aCA9IHJlcS51cmwuc3Vic3RyaW5nKDAsIHJlcS51cmwuaW5kZXhPZignPycpKTtcblx0XHRjb25zdCBzcGxpdFBhdGggPSBiYXJlUGF0aC5zcGxpdCgnLycpO1xuXG5cdFx0Ly8gQW55IG5vbi1jYXMgcmVxdWVzdCB3aWxsIGNvbnRpbnVlIGRvd24gdGhlIGRlZmF1bHRcblx0XHQvLyBtaWRkbGV3YXJlcy5cblx0XHRpZiAoc3BsaXRQYXRoWzFdICE9PSAnX2NhcycpIHtcblx0XHRcdG5leHQoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBnZXQgYXV0aCB0b2tlblxuXHRcdGNvbnN0IGNyZWRlbnRpYWxUb2tlbiA9IHNwbGl0UGF0aFsyXTtcblx0XHRpZiAoIWNyZWRlbnRpYWxUb2tlbikge1xuXHRcdFx0Y2xvc2VQb3B1cChyZXMpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIHZhbGlkYXRlIHRpY2tldFxuXHRcdGNhc1RpY2tldChyZXEsIGNyZWRlbnRpYWxUb2tlbiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRjbG9zZVBvcHVwKHJlcyk7XG5cdFx0fSk7XG5cblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0bG9nZ2VyLmVycm9yKGBVbmV4cGVjdGVkIGVycm9yIDogJHsgZXJyLm1lc3NhZ2UgfWApO1xuXHRcdGNsb3NlUG9wdXAocmVzKTtcblx0fVxufTtcblxuLy8gTGlzdGVuIHRvIGluY29taW5nIE9BdXRoIGh0dHAgcmVxdWVzdHNcbldlYkFwcC5jb25uZWN0SGFuZGxlcnMudXNlKGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG5cdC8vIE5lZWQgdG8gY3JlYXRlIGEgZmliZXIgc2luY2Ugd2UncmUgdXNpbmcgc3luY2hyb25vdXMgaHR0cCBjYWxscyBhbmQgbm90aGluZ1xuXHQvLyBlbHNlIGlzIHdyYXBwaW5nIHRoaXMgaW4gYSBmaWJlciBhdXRvbWF0aWNhbGx5XG5cdGZpYmVyKGZ1bmN0aW9uKCkge1xuXHRcdG1pZGRsZXdhcmUocmVxLCByZXMsIG5leHQpO1xuXHR9KS5ydW4oKTtcbn0pO1xuXG4vKlxuICogUmVnaXN0ZXIgYSBzZXJ2ZXItc2lkZSBsb2dpbiBoYW5kbGUuXG4gKiBJdCBpcyBjYWxsIGFmdGVyIEFjY291bnRzLmNhbGxMb2dpbk1ldGhvZCgpIGlzIGNhbGwgZnJvbSBjbGllbnQuXG4gKlxuICovXG5BY2NvdW50cy5yZWdpc3RlckxvZ2luSGFuZGxlcihmdW5jdGlvbihvcHRpb25zKSB7XG5cblx0aWYgKCFvcHRpb25zLmNhcykge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHRjb25zdCBjcmVkZW50aWFscyA9IFJvY2tldENoYXQubW9kZWxzLkNyZWRlbnRpYWxUb2tlbnMuZmluZE9uZUJ5SWQob3B0aW9ucy5jYXMuY3JlZGVudGlhbFRva2VuKTtcblx0aWYgKGNyZWRlbnRpYWxzID09PSB1bmRlZmluZWQpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKEFjY291bnRzLkxvZ2luQ2FuY2VsbGVkRXJyb3IubnVtZXJpY0Vycm9yLFxuXHRcdFx0J25vIG1hdGNoaW5nIGxvZ2luIGF0dGVtcHQgZm91bmQnKTtcblx0fVxuXG5cdGNvbnN0IHJlc3VsdCA9IGNyZWRlbnRpYWxzLnVzZXJJbmZvO1xuXHRjb25zdCBzeW5jVXNlckRhdGFGaWVsZE1hcCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdDQVNfU3luY19Vc2VyX0RhdGFfRmllbGRNYXAnKS50cmltKCk7XG5cdGNvbnN0IGNhc192ZXJzaW9uID0gcGFyc2VGbG9hdChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQ0FTX3ZlcnNpb24nKSk7XG5cdGNvbnN0IHN5bmNfZW5hYmxlZCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdDQVNfU3luY19Vc2VyX0RhdGFfRW5hYmxlZCcpO1xuXG5cdC8vIFdlIGhhdmUgdGhlc2Vcblx0Y29uc3QgZXh0X2F0dHJzID0ge1xuXHRcdHVzZXJuYW1lOiByZXN1bHQudXNlcm5hbWUsXG5cdH07XG5cblx0Ly8gV2UgbmVlZCB0aGVzZVxuXHRjb25zdCBpbnRfYXR0cnMgPSB7XG5cdFx0ZW1haWw6IHVuZGVmaW5lZCxcblx0XHRuYW1lOiB1bmRlZmluZWQsXG5cdFx0dXNlcm5hbWU6IHVuZGVmaW5lZCxcblx0XHRyb29tczogdW5kZWZpbmVkLFxuXHR9O1xuXG5cdC8vIEltcG9ydCByZXNwb25zZSBhdHRyaWJ1dGVzXG5cdGlmIChjYXNfdmVyc2lvbiA+PSAyLjApIHtcblx0XHQvLyBDbGVhbiAmIGltcG9ydCBleHRlcm5hbCBhdHRyaWJ1dGVzXG5cdFx0Xy5lYWNoKHJlc3VsdC5hdHRyaWJ1dGVzLCBmdW5jdGlvbih2YWx1ZSwgZXh0X25hbWUpIHtcblx0XHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0XHRleHRfYXR0cnNbZXh0X25hbWVdID0gdmFsdWVbMF07XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHQvLyBTb3VyY2UgaW50ZXJuYWwgYXR0cmlidXRlc1xuXHRpZiAoc3luY1VzZXJEYXRhRmllbGRNYXApIHtcblxuXHRcdC8vIE91ciBtYXBwaW5nIHRhYmxlOiBrZXkoaW50X2F0dHIpIC0+IHZhbHVlKGV4dF9hdHRyKVxuXHRcdC8vIFNwb2tlbjogU291cmNlIHRoaXMgaW50ZXJuYWwgYXR0cmlidXRlIGZyb20gdGhlc2UgZXh0ZXJuYWwgYXR0cmlidXRlc1xuXHRcdGNvbnN0IGF0dHJfbWFwID0gSlNPTi5wYXJzZShzeW5jVXNlckRhdGFGaWVsZE1hcCk7XG5cblx0XHRfLmVhY2goYXR0cl9tYXAsIGZ1bmN0aW9uKHNvdXJjZSwgaW50X25hbWUpIHtcblx0XHRcdC8vIFNvdXJjZSBpcyBvdXIgU3RyaW5nIHRvIGludGVycG9sYXRlXG5cdFx0XHRpZiAoXy5pc1N0cmluZyhzb3VyY2UpKSB7XG5cdFx0XHRcdF8uZWFjaChleHRfYXR0cnMsIGZ1bmN0aW9uKHZhbHVlLCBleHRfbmFtZSkge1xuXHRcdFx0XHRcdHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKGAlJHsgZXh0X25hbWUgfSVgLCBleHRfYXR0cnNbZXh0X25hbWVdKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0aW50X2F0dHJzW2ludF9uYW1lXSA9IHNvdXJjZTtcblx0XHRcdFx0bG9nZ2VyLmRlYnVnKGBTb3VyY2VkIGludGVybmFsIGF0dHJpYnV0ZTogJHsgaW50X25hbWUgfSA9ICR7IHNvdXJjZSB9YCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHQvLyBTZWFyY2ggZXhpc3RpbmcgdXNlciBieSBpdHMgZXh0ZXJuYWwgc2VydmljZSBpZFxuXHRsb2dnZXIuZGVidWcoYExvb2tpbmcgdXAgdXNlciBieSBpZDogJHsgcmVzdWx0LnVzZXJuYW1lIH1gKTtcblx0bGV0IHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh7ICdzZXJ2aWNlcy5jYXMuZXh0ZXJuYWxfaWQnOiByZXN1bHQudXNlcm5hbWUgfSk7XG5cblx0aWYgKHVzZXIpIHtcblx0XHRsb2dnZXIuZGVidWcoYFVzaW5nIGV4aXN0aW5nIHVzZXIgZm9yICckeyByZXN1bHQudXNlcm5hbWUgfScgd2l0aCBpZDogJHsgdXNlci5faWQgfWApO1xuXHRcdGlmIChzeW5jX2VuYWJsZWQpIHtcblx0XHRcdGxvZ2dlci5kZWJ1ZygnU3luY2luZyB1c2VyIGF0dHJpYnV0ZXMnKTtcblx0XHRcdC8vIFVwZGF0ZSBuYW1lXG5cdFx0XHRpZiAoaW50X2F0dHJzLm5hbWUpIHtcblx0XHRcdFx0Um9ja2V0Q2hhdC5fc2V0UmVhbE5hbWUodXNlci5faWQsIGludF9hdHRycy5uYW1lKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVXBkYXRlIGVtYWlsXG5cdFx0XHRpZiAoaW50X2F0dHJzLmVtYWlsKSB7XG5cdFx0XHRcdE1ldGVvci51c2Vycy51cGRhdGUodXNlciwgeyAkc2V0OiB7IGVtYWlsczogW3sgYWRkcmVzczogaW50X2F0dHJzLmVtYWlsLCB2ZXJpZmllZDogdHJ1ZSB9XSB9IH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHtcblxuXHRcdC8vIERlZmluZSBuZXcgdXNlclxuXHRcdGNvbnN0IG5ld1VzZXIgPSB7XG5cdFx0XHR1c2VybmFtZTogcmVzdWx0LnVzZXJuYW1lLFxuXHRcdFx0YWN0aXZlOiB0cnVlLFxuXHRcdFx0Z2xvYmFsUm9sZXM6IFsndXNlciddLFxuXHRcdFx0ZW1haWxzOiBbXSxcblx0XHRcdHNlcnZpY2VzOiB7XG5cdFx0XHRcdGNhczoge1xuXHRcdFx0XHRcdGV4dGVybmFsX2lkOiByZXN1bHQudXNlcm5hbWUsXG5cdFx0XHRcdFx0dmVyc2lvbjogY2FzX3ZlcnNpb24sXG5cdFx0XHRcdFx0YXR0cnM6IGludF9hdHRycyxcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdC8vIEFkZCBVc2VyLm5hbWVcblx0XHRpZiAoaW50X2F0dHJzLm5hbWUpIHtcblx0XHRcdF8uZXh0ZW5kKG5ld1VzZXIsIHtcblx0XHRcdFx0bmFtZTogaW50X2F0dHJzLm5hbWUsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvLyBBZGQgZW1haWxcblx0XHRpZiAoaW50X2F0dHJzLmVtYWlsKSB7XG5cdFx0XHRfLmV4dGVuZChuZXdVc2VyLCB7XG5cdFx0XHRcdGVtYWlsczogW3sgYWRkcmVzczogaW50X2F0dHJzLmVtYWlsLCB2ZXJpZmllZDogdHJ1ZSB9XSxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vIENyZWF0ZSB0aGUgdXNlclxuXHRcdGxvZ2dlci5kZWJ1ZyhgVXNlciBcIiR7IHJlc3VsdC51c2VybmFtZSB9XCIgZG9lcyBub3QgZXhpc3QgeWV0LCBjcmVhdGluZyBpdGApO1xuXHRcdGNvbnN0IHVzZXJJZCA9IEFjY291bnRzLmluc2VydFVzZXJEb2Moe30sIG5ld1VzZXIpO1xuXG5cdFx0Ly8gRmV0Y2ggYW5kIHVzZSBpdFxuXHRcdHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh1c2VySWQpO1xuXHRcdGxvZ2dlci5kZWJ1ZyhgQ3JlYXRlZCBuZXcgdXNlciBmb3IgJyR7IHJlc3VsdC51c2VybmFtZSB9JyB3aXRoIGlkOiAkeyB1c2VyLl9pZCB9YCk7XG5cdFx0Ly8gbG9nZ2VyLmRlYnVnKEpTT04uc3RyaW5naWZ5KHVzZXIsIHVuZGVmaW5lZCwgNCkpO1xuXG5cdFx0bG9nZ2VyLmRlYnVnKGBKb2luaW5nIHVzZXIgdG8gYXR0cmlidXRlIGNoYW5uZWxzOiAkeyBpbnRfYXR0cnMucm9vbXMgfWApO1xuXHRcdGlmIChpbnRfYXR0cnMucm9vbXMpIHtcblx0XHRcdF8uZWFjaChpbnRfYXR0cnMucm9vbXMuc3BsaXQoJywnKSwgZnVuY3Rpb24ocm9vbV9uYW1lKSB7XG5cdFx0XHRcdGlmIChyb29tX25hbWUpIHtcblx0XHRcdFx0XHRsZXQgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeU5hbWVBbmRUeXBlKHJvb21fbmFtZSwgJ2MnKTtcblx0XHRcdFx0XHRpZiAoIXJvb20pIHtcblx0XHRcdFx0XHRcdHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5jcmVhdGVXaXRoSWRUeXBlQW5kTmFtZShSYW5kb20uaWQoKSwgJ2MnLCByb29tX25hbWUpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICghUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocm9vbS5faWQsIHVzZXJJZCkpIHtcblx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuY3JlYXRlV2l0aFJvb21BbmRVc2VyKHJvb20sIHVzZXIsIHtcblx0XHRcdFx0XHRcdFx0dHM6IG5ldyBEYXRlKCksXG5cdFx0XHRcdFx0XHRcdG9wZW46IHRydWUsXG5cdFx0XHRcdFx0XHRcdGFsZXJ0OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHR1bnJlYWQ6IDEsXG5cdFx0XHRcdFx0XHRcdHVzZXJNZW50aW9uczogMSxcblx0XHRcdFx0XHRcdFx0Z3JvdXBNZW50aW9uczogMCxcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdH1cblxuXHRyZXR1cm4geyB1c2VySWQ6IHVzZXIuX2lkIH07XG59KTtcbiIsIlJvY2tldENoYXQubW9kZWxzLkNyZWRlbnRpYWxUb2tlbnMgPSBuZXcgY2xhc3MgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdjcmVkZW50aWFsX3Rva2VucycpO1xuXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IGV4cGlyZUF0OiAxIH0sIHsgc3BhcnNlOiAxLCBleHBpcmVBZnRlclNlY29uZHM6IDAgfSk7XG5cdH1cblxuXHRjcmVhdGUoX2lkLCB1c2VySW5mbykge1xuXHRcdGNvbnN0IHZhbGlkRm9yTWlsbGlzZWNvbmRzID0gNjAwMDA7XHRcdC8vIFZhbGlkIGZvciA2MCBzZWNvbmRzXG5cdFx0Y29uc3QgdG9rZW4gPSB7XG5cdFx0XHRfaWQsXG5cdFx0XHR1c2VySW5mbyxcblx0XHRcdGV4cGlyZUF0OiBuZXcgRGF0ZShEYXRlLm5vdygpICsgdmFsaWRGb3JNaWxsaXNlY29uZHMpLFxuXHRcdH07XG5cblx0XHR0aGlzLmluc2VydCh0b2tlbik7XG5cdFx0cmV0dXJuIHRva2VuO1xuXHR9XG5cblx0ZmluZE9uZUJ5SWQoX2lkKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHRfaWQsXG5cdFx0XHRleHBpcmVBdDogeyAkZ3Q6IG5ldyBEYXRlKCkgfSxcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZE9uZShxdWVyeSk7XG5cdH1cbn07XG4iXX0=
