(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:blockstack":{"server":{"main.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_blockstack/server/main.js                                                                     //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.watch(require("./routes.js"));
module.watch(require("./settings.js"));
module.watch(require("./loginHandler.js"));
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"logger.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_blockstack/server/logger.js                                                                   //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({
  logger: () => logger
});
let Logger;
module.watch(require("meteor/rocketchat:logger"), {
  Logger(v) {
    Logger = v;
  }

}, 0);
const logger = new Logger('Blockstack');
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"loginHandler.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_blockstack/server/loginHandler.js                                                             //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Accounts;
module.watch(require("meteor/accounts-base"), {
  Accounts(v) {
    Accounts = v;
  }

}, 1);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 2);
let updateOrCreateUser;
module.watch(require("./userHandler"), {
  updateOrCreateUser(v) {
    updateOrCreateUser = v;
  }

}, 3);
let handleAccessToken;
module.watch(require("./tokenHandler"), {
  handleAccessToken(v) {
    handleAccessToken = v;
  }

}, 4);
let logger;
module.watch(require("./logger"), {
  logger(v) {
    logger = v;
  }

}, 5);
// Blockstack login handler, triggered by a blockstack authResponse in route
Accounts.registerLoginHandler('blockstack', loginRequest => {
  if (!loginRequest.blockstack || !loginRequest.authResponse) {
    return;
  }

  if (!RocketChat.settings.get('Blockstack_Enable')) {
    return;
  }

  logger.debug('Processing login request', loginRequest);
  const auth = handleAccessToken(loginRequest); // TODO: Fix #9484 and re-instate usage of accounts helper
  // const result = Accounts.updateOrCreateUserFromExternalService('blockstack', auth.serviceData, auth.options)

  const result = updateOrCreateUser(auth.serviceData, auth.options);
  logger.debug('User create/update result', result); // Ensure processing succeeded

  if (result === undefined || result.userId === undefined) {
    return {
      type: 'blockstack',
      error: new Meteor.Error(Accounts.LoginCancelledError.numericError, 'User creation failed from Blockstack response token')
    };
  }

  if (result.isNew) {
    try {
      const user = RocketChat.models.Users.findOneById(result.userId, {
        fields: {
          'services.blockstack.image': 1,
          username: 1
        }
      });

      if (user && user.services && user.services.blockstack && user.services.blockstack.image) {
        Meteor.runAsUser(user._id, () => {
          RocketChat.setUserAvatar(user, user.services.blockstack.image, undefined, 'url');
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  delete result.isNew;
  return result;
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"routes.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_blockstack/server/routes.js                                                                   //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let WebApp;
module.watch(require("meteor/webapp"), {
  WebApp(v) {
    WebApp = v;
  }

}, 1);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 2);
WebApp.connectHandlers.use('/_blockstack/manifest', Meteor.bindEnvironment(function (req, res) {
  const name = RocketChat.settings.get('Site_Name');
  const startUrl = Meteor.absoluteUrl();
  const description = RocketChat.settings.get('Blockstack_Auth_Description');
  const iconUrl = RocketChat.Assets.getURL('Assets_favicon_192');
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(`{
    "name": "${name}",
    "start_url": "${startUrl}",
    "description": "${description}",
    "icons": [{
      "src": "${iconUrl}",
      "sizes": "192x192",
      "type": "image/png"
    }]
  }`);
}));
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_blockstack/server/settings.js                                                                 //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 2);
let ServiceConfiguration;
module.watch(require("meteor/service-configuration"), {
  ServiceConfiguration(v) {
    ServiceConfiguration = v;
  }

}, 3);
let logger;
module.watch(require("./logger"), {
  logger(v) {
    logger = v;
  }

}, 4);
const defaults = {
  enable: false,
  loginStyle: 'redirect',
  generateUsername: false,
  manifestURI: Meteor.absoluteUrl('_blockstack/manifest'),
  redirectURI: Meteor.absoluteUrl('_blockstack/validate'),
  authDescription: 'Rocket.Chat login',
  buttonLabelText: 'Blockstack',
  buttonColor: '#271132',
  buttonLabelColor: '#ffffff'
};
Meteor.startup(() => {
  RocketChat.settings.addGroup('Blockstack', function () {
    this.add('Blockstack_Enable', defaults.enable, {
      type: 'boolean',
      i18nLabel: 'Enable'
    });
    this.add('Blockstack_Auth_Description', defaults.authDescription, {
      type: 'string'
    });
    this.add('Blockstack_ButtonLabelText', defaults.buttonLabelText, {
      type: 'string'
    });
    this.add('Blockstack_Generate_Username', defaults.generateUsername, {
      type: 'boolean'
    });
  });
}); // Helper to return all Blockstack settings

const getSettings = () => Object.assign({}, defaults, {
  enable: RocketChat.settings.get('Blockstack_Enable'),
  authDescription: RocketChat.settings.get('Blockstack_Auth_Description'),
  buttonLabelText: RocketChat.settings.get('Blockstack_ButtonLabelText'),
  generateUsername: RocketChat.settings.get('Blockstack_Generate_Username')
});

const configureService = _.debounce(Meteor.bindEnvironment(() => {
  const serviceConfig = getSettings();

  if (!serviceConfig.enable) {
    logger.debug('Blockstack not enabled', serviceConfig);
    return ServiceConfiguration.configurations.remove({
      service: 'blockstack'
    });
  }

  ServiceConfiguration.configurations.upsert({
    service: 'blockstack'
  }, {
    $set: serviceConfig
  });
  logger.debug('Init Blockstack auth', serviceConfig);
}), 1000); // Add settings to auth provider configs on startup


Meteor.startup(() => {
  RocketChat.settings.get(/^Blockstack_.+/, () => {
    configureService();
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"tokenHandler.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_blockstack/server/tokenHandler.js                                                             //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({
  handleAccessToken: () => handleAccessToken
});
let decodeToken;
module.watch(require("blockstack"), {
  decodeToken(v) {
    decodeToken = v;
  }

}, 0);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
let Accounts;
module.watch(require("meteor/accounts-base"), {
  Accounts(v) {
    Accounts = v;
  }

}, 2);
let Match, check;
module.watch(require("meteor/check"), {
  Match(v) {
    Match = v;
  },

  check(v) {
    check = v;
  }

}, 3);
let logger;
module.watch(require("./logger"), {
  logger(v) {
    logger = v;
  }

}, 4);

const handleAccessToken = loginRequest => {
  logger.debug('Login request received', loginRequest);
  check(loginRequest, Match.ObjectIncluding({
    authResponse: String,
    userData: Object
  })); // Decode auth response for user attributes

  const {
    username,
    profile
  } = loginRequest.userData;
  const decodedToken = decodeToken(loginRequest.authResponse).payload;
  profile.username = username;
  logger.debug('User data', loginRequest.userData);
  logger.debug('Login decoded', decodedToken);
  const {
    iss,
    iat,
    exp
  } = decodedToken;

  if (!iss) {
    return {
      type: 'blockstack',
      error: new Meteor.Error(Accounts.LoginCancelledError.numericError, 'Insufficient data in auth response token')
    };
  } // Collect basic auth provider details


  const serviceData = {
    id: iss,
    did: iss.split(':').pop(),
    issuedAt: new Date(iat * 1000),
    expiresAt: new Date(exp * 1000)
  }; // Add Avatar image source to use for auth service suggestions

  if (Array.isArray(profile.image) && profile.image.length) {
    serviceData.image = profile.image[0].contentUrl;
  }

  logger.debug('Login data', serviceData, profile);
  return {
    serviceData,
    options: {
      profile
    }
  };
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"userHandler.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_blockstack/server/userHandler.js                                                              //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({
  updateOrCreateUser: () => updateOrCreateUser
});
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Accounts;
module.watch(require("meteor/accounts-base"), {
  Accounts(v) {
    Accounts = v;
  }

}, 1);
let ServiceConfiguration;
module.watch(require("meteor/service-configuration"), {
  ServiceConfiguration(v) {
    ServiceConfiguration = v;
  }

}, 2);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 3);
let logger;
module.watch(require("./logger"), {
  logger(v) {
    logger = v;
  }

}, 4);

const updateOrCreateUser = (serviceData, options) => {
  const serviceConfig = ServiceConfiguration.configurations.findOne({
    service: 'blockstack'
  });
  logger.debug('Auth config', serviceConfig); // Extract user data from service / token

  const {
    id,
    did
  } = serviceData;
  const {
    profile
  } = options; // Look for existing Blockstack user

  const user = Meteor.users.findOne({
    'services.blockstack.id': id
  });
  let userId;
  let isNew = false; // Use found or create a user

  if (user) {
    logger.info(`User login with Blockstack ID ${id}`);
    userId = user._id;
  } else {
    isNew = true;
    let emails = [];

    if (!Array.isArray(profile.emails)) {
      // Fix absense of emails by adding placeholder address using decentralised
      // ID at blockstack.email - a holding domain only, no MX record, does not
      // process email, may be used in future to provide decentralised email via
      // gaia, encrypting mail for DID user only. @TODO: document this approach.
      emails.push({
        address: `${did}@blockstack.email`,
        verified: false
      });
    } else {
      // Reformat array of emails into expected format if they exist
      emails = profile.emails.map(address => ({
        address,
        verified: true
      }));
    }

    const newUser = {
      name: profile.name,
      active: true,
      emails,
      services: {
        blockstack: serviceData
      }
    }; // Set username same as in blockstack, or suggest if none

    if (profile.name) {
      newUser.name = profile.name;
    } // Take profile username if exists, or generate one if enabled


    if (profile.username && profile.username !== '') {
      newUser.username = profile.username;
    } else if (serviceConfig.generateUsername === true) {
      newUser.username = RocketChat.generateUsernameSuggestion(newUser);
    } // If no username at this point it will suggest one from the name
    // Create and get created user to make a couple more mods before returning


    logger.info(`Creating user for Blockstack ID ${id}`);
    userId = Accounts.insertUserDoc({}, newUser);
    logger.debug('New user ${ userId }', newUser);
  } // Add login token for blockstack auth session (take expiration from response)
  // TODO: Regquired method result format ignores `.when`


  const {
    token
  } = Accounts._generateStampedLoginToken();

  const tokenExpires = serviceData.expiresAt;
  return {
    type: 'blockstack',
    userId,
    token,
    tokenExpires,
    isNew
  };
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/rocketchat:blockstack/server/main.js");

/* Exports */
Package._define("rocketchat:blockstack", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_blockstack.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpibG9ja3N0YWNrL3NlcnZlci9tYWluLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmJsb2Nrc3RhY2svc2VydmVyL2xvZ2dlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpibG9ja3N0YWNrL3NlcnZlci9sb2dpbkhhbmRsZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YmxvY2tzdGFjay9zZXJ2ZXIvcm91dGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmJsb2Nrc3RhY2svc2VydmVyL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmJsb2Nrc3RhY2svc2VydmVyL3Rva2VuSGFuZGxlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpibG9ja3N0YWNrL3NlcnZlci91c2VySGFuZGxlci5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJleHBvcnQiLCJsb2dnZXIiLCJMb2dnZXIiLCJ2IiwiTWV0ZW9yIiwiQWNjb3VudHMiLCJSb2NrZXRDaGF0IiwidXBkYXRlT3JDcmVhdGVVc2VyIiwiaGFuZGxlQWNjZXNzVG9rZW4iLCJyZWdpc3RlckxvZ2luSGFuZGxlciIsImxvZ2luUmVxdWVzdCIsImJsb2Nrc3RhY2siLCJhdXRoUmVzcG9uc2UiLCJzZXR0aW5ncyIsImdldCIsImRlYnVnIiwiYXV0aCIsInJlc3VsdCIsInNlcnZpY2VEYXRhIiwib3B0aW9ucyIsInVuZGVmaW5lZCIsInVzZXJJZCIsInR5cGUiLCJlcnJvciIsIkVycm9yIiwiTG9naW5DYW5jZWxsZWRFcnJvciIsIm51bWVyaWNFcnJvciIsImlzTmV3IiwidXNlciIsIm1vZGVscyIsIlVzZXJzIiwiZmluZE9uZUJ5SWQiLCJmaWVsZHMiLCJ1c2VybmFtZSIsInNlcnZpY2VzIiwiaW1hZ2UiLCJydW5Bc1VzZXIiLCJfaWQiLCJzZXRVc2VyQXZhdGFyIiwiZSIsImNvbnNvbGUiLCJXZWJBcHAiLCJjb25uZWN0SGFuZGxlcnMiLCJ1c2UiLCJiaW5kRW52aXJvbm1lbnQiLCJyZXEiLCJyZXMiLCJuYW1lIiwic3RhcnRVcmwiLCJhYnNvbHV0ZVVybCIsImRlc2NyaXB0aW9uIiwiaWNvblVybCIsIkFzc2V0cyIsImdldFVSTCIsIndyaXRlSGVhZCIsImVuZCIsIl8iLCJkZWZhdWx0IiwiU2VydmljZUNvbmZpZ3VyYXRpb24iLCJkZWZhdWx0cyIsImVuYWJsZSIsImxvZ2luU3R5bGUiLCJnZW5lcmF0ZVVzZXJuYW1lIiwibWFuaWZlc3RVUkkiLCJyZWRpcmVjdFVSSSIsImF1dGhEZXNjcmlwdGlvbiIsImJ1dHRvbkxhYmVsVGV4dCIsImJ1dHRvbkNvbG9yIiwiYnV0dG9uTGFiZWxDb2xvciIsInN0YXJ0dXAiLCJhZGRHcm91cCIsImFkZCIsImkxOG5MYWJlbCIsImdldFNldHRpbmdzIiwiT2JqZWN0IiwiYXNzaWduIiwiY29uZmlndXJlU2VydmljZSIsImRlYm91bmNlIiwic2VydmljZUNvbmZpZyIsImNvbmZpZ3VyYXRpb25zIiwicmVtb3ZlIiwic2VydmljZSIsInVwc2VydCIsIiRzZXQiLCJkZWNvZGVUb2tlbiIsIk1hdGNoIiwiY2hlY2siLCJPYmplY3RJbmNsdWRpbmciLCJTdHJpbmciLCJ1c2VyRGF0YSIsInByb2ZpbGUiLCJkZWNvZGVkVG9rZW4iLCJwYXlsb2FkIiwiaXNzIiwiaWF0IiwiZXhwIiwiaWQiLCJkaWQiLCJzcGxpdCIsInBvcCIsImlzc3VlZEF0IiwiRGF0ZSIsImV4cGlyZXNBdCIsIkFycmF5IiwiaXNBcnJheSIsImxlbmd0aCIsImNvbnRlbnRVcmwiLCJmaW5kT25lIiwidXNlcnMiLCJpbmZvIiwiZW1haWxzIiwicHVzaCIsImFkZHJlc3MiLCJ2ZXJpZmllZCIsIm1hcCIsIm5ld1VzZXIiLCJhY3RpdmUiLCJnZW5lcmF0ZVVzZXJuYW1lU3VnZ2VzdGlvbiIsImluc2VydFVzZXJEb2MiLCJ0b2tlbiIsIl9nZW5lcmF0ZVN0YW1wZWRMb2dpblRva2VuIiwidG9rZW5FeHBpcmVzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxhQUFSLENBQWI7QUFBcUNGLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxlQUFSLENBQWI7QUFBdUNGLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxtQkFBUixDQUFiLEU7Ozs7Ozs7Ozs7O0FDQTVFRixPQUFPRyxNQUFQLENBQWM7QUFBQ0MsVUFBTyxNQUFJQTtBQUFaLENBQWQ7QUFBbUMsSUFBSUMsTUFBSjtBQUFXTCxPQUFPQyxLQUFQLENBQWFDLFFBQVEsMEJBQVIsQ0FBYixFQUFpRDtBQUFDRyxTQUFPQyxDQUFQLEVBQVM7QUFBQ0QsYUFBT0MsQ0FBUDtBQUFTOztBQUFwQixDQUFqRCxFQUF1RSxDQUF2RTtBQUV2QyxNQUFNRixTQUFTLElBQUlDLE1BQUosQ0FBVyxZQUFYLENBQWYsQzs7Ozs7Ozs7Ozs7QUNGUCxJQUFJRSxNQUFKO0FBQVdQLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxlQUFSLENBQWIsRUFBc0M7QUFBQ0ssU0FBT0QsQ0FBUCxFQUFTO0FBQUNDLGFBQU9ELENBQVA7QUFBUzs7QUFBcEIsQ0FBdEMsRUFBNEQsQ0FBNUQ7QUFBK0QsSUFBSUUsUUFBSjtBQUFhUixPQUFPQyxLQUFQLENBQWFDLFFBQVEsc0JBQVIsQ0FBYixFQUE2QztBQUFDTSxXQUFTRixDQUFULEVBQVc7QUFBQ0UsZUFBU0YsQ0FBVDtBQUFXOztBQUF4QixDQUE3QyxFQUF1RSxDQUF2RTtBQUEwRSxJQUFJRyxVQUFKO0FBQWVULE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSx1QkFBUixDQUFiLEVBQThDO0FBQUNPLGFBQVdILENBQVgsRUFBYTtBQUFDRyxpQkFBV0gsQ0FBWDtBQUFhOztBQUE1QixDQUE5QyxFQUE0RSxDQUE1RTtBQUEr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dGNoYXRfYmxvY2tzdGFjay5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi9yb3V0ZXMuanMnO1xuaW1wb3J0ICcuL3NldHRpbmdzLmpzJztcbmltcG9ydCAnLi9sb2dpbkhhbmRsZXIuanMnO1xuIiwiaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bG9nZ2VyJztcblxuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoJ0Jsb2Nrc3RhY2snKTtcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgQWNjb3VudHMgfSBmcm9tICdtZXRlb3IvYWNjb3VudHMtYmFzZSc7XG5pbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcblxuaW1wb3J0IHsgdXBkYXRlT3JDcmVhdGVVc2VyIH0gZnJvbSAnLi91c2VySGFuZGxlcic7XG5pbXBvcnQgeyBoYW5kbGVBY2Nlc3NUb2tlbiB9IGZyb20gJy4vdG9rZW5IYW5kbGVyJztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4vbG9nZ2VyJztcblxuLy8gQmxvY2tzdGFjayBsb2dpbiBoYW5kbGVyLCB0cmlnZ2VyZWQgYnkgYSBibG9ja3N0YWNrIGF1dGhSZXNwb25zZSBpbiByb3V0ZVxuQWNjb3VudHMucmVnaXN0ZXJMb2dpbkhhbmRsZXIoJ2Jsb2Nrc3RhY2snLCAobG9naW5SZXF1ZXN0KSA9PiB7XG5cdGlmICghbG9naW5SZXF1ZXN0LmJsb2Nrc3RhY2sgfHwgIWxvZ2luUmVxdWVzdC5hdXRoUmVzcG9uc2UpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdCbG9ja3N0YWNrX0VuYWJsZScpKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0bG9nZ2VyLmRlYnVnKCdQcm9jZXNzaW5nIGxvZ2luIHJlcXVlc3QnLCBsb2dpblJlcXVlc3QpO1xuXG5cdGNvbnN0IGF1dGggPSBoYW5kbGVBY2Nlc3NUb2tlbihsb2dpblJlcXVlc3QpO1xuXG5cdC8vIFRPRE86IEZpeCAjOTQ4NCBhbmQgcmUtaW5zdGF0ZSB1c2FnZSBvZiBhY2NvdW50cyBoZWxwZXJcblx0Ly8gY29uc3QgcmVzdWx0ID0gQWNjb3VudHMudXBkYXRlT3JDcmVhdGVVc2VyRnJvbUV4dGVybmFsU2VydmljZSgnYmxvY2tzdGFjaycsIGF1dGguc2VydmljZURhdGEsIGF1dGgub3B0aW9ucylcblx0Y29uc3QgcmVzdWx0ID0gdXBkYXRlT3JDcmVhdGVVc2VyKGF1dGguc2VydmljZURhdGEsIGF1dGgub3B0aW9ucyk7XG5cdGxvZ2dlci5kZWJ1ZygnVXNlciBjcmVhdGUvdXBkYXRlIHJlc3VsdCcsIHJlc3VsdCk7XG5cblx0Ly8gRW5zdXJlIHByb2Nlc3Npbmcgc3VjY2VlZGVkXG5cdGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCB8fCByZXN1bHQudXNlcklkID09PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogJ2Jsb2Nrc3RhY2snLFxuXHRcdFx0ZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoQWNjb3VudHMuTG9naW5DYW5jZWxsZWRFcnJvci5udW1lcmljRXJyb3IsICdVc2VyIGNyZWF0aW9uIGZhaWxlZCBmcm9tIEJsb2Nrc3RhY2sgcmVzcG9uc2UgdG9rZW4nKSxcblx0XHR9O1xuXHR9XG5cblx0aWYgKHJlc3VsdC5pc05ldykge1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQocmVzdWx0LnVzZXJJZCwgeyBmaWVsZHM6IHsgJ3NlcnZpY2VzLmJsb2Nrc3RhY2suaW1hZ2UnOiAxLCB1c2VybmFtZTogMSB9IH0pO1xuXHRcdFx0aWYgKHVzZXIgJiYgdXNlci5zZXJ2aWNlcyAmJiB1c2VyLnNlcnZpY2VzLmJsb2Nrc3RhY2sgJiYgdXNlci5zZXJ2aWNlcy5ibG9ja3N0YWNrLmltYWdlKSB7XG5cdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodXNlci5faWQsICgpID0+IHtcblx0XHRcdFx0XHRSb2NrZXRDaGF0LnNldFVzZXJBdmF0YXIodXNlciwgdXNlci5zZXJ2aWNlcy5ibG9ja3N0YWNrLmltYWdlLCB1bmRlZmluZWQsICd1cmwnKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5lcnJvcihlKTtcblx0XHR9XG5cdH1cblxuXHRkZWxldGUgcmVzdWx0LmlzTmV3O1xuXG5cdHJldHVybiByZXN1bHQ7XG59KTtcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgV2ViQXBwIH0gZnJvbSAnbWV0ZW9yL3dlYmFwcCc7XG5pbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcblxuV2ViQXBwLmNvbm5lY3RIYW5kbGVycy51c2UoJy9fYmxvY2tzdGFjay9tYW5pZmVzdCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoZnVuY3Rpb24ocmVxLCByZXMpIHtcblx0Y29uc3QgbmFtZSA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTaXRlX05hbWUnKTtcblx0Y29uc3Qgc3RhcnRVcmwgPSBNZXRlb3IuYWJzb2x1dGVVcmwoKTtcblx0Y29uc3QgZGVzY3JpcHRpb24gPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQmxvY2tzdGFja19BdXRoX0Rlc2NyaXB0aW9uJyk7XG5cdGNvbnN0IGljb25VcmwgPSBSb2NrZXRDaGF0LkFzc2V0cy5nZXRVUkwoJ0Fzc2V0c19mYXZpY29uXzE5MicpO1xuXG5cdHJlcy53cml0ZUhlYWQoMjAwLCB7XG5cdFx0J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcblx0XHQnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuXHR9KTtcblxuXHRyZXMuZW5kKGB7XG4gICAgXCJuYW1lXCI6IFwiJHsgbmFtZSB9XCIsXG4gICAgXCJzdGFydF91cmxcIjogXCIkeyBzdGFydFVybCB9XCIsXG4gICAgXCJkZXNjcmlwdGlvblwiOiBcIiR7IGRlc2NyaXB0aW9uIH1cIixcbiAgICBcImljb25zXCI6IFt7XG4gICAgICBcInNyY1wiOiBcIiR7IGljb25VcmwgfVwiLFxuICAgICAgXCJzaXplc1wiOiBcIjE5MngxOTJcIixcbiAgICAgIFwidHlwZVwiOiBcImltYWdlL3BuZ1wiXG4gICAgfV1cbiAgfWApO1xufSkpO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IFJvY2tldENoYXQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuXG5pbXBvcnQgeyBTZXJ2aWNlQ29uZmlndXJhdGlvbiB9IGZyb20gJ21ldGVvci9zZXJ2aWNlLWNvbmZpZ3VyYXRpb24nO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi9sb2dnZXInO1xuXG5jb25zdCBkZWZhdWx0cyA9IHtcblx0ZW5hYmxlOiBmYWxzZSxcblx0bG9naW5TdHlsZTogJ3JlZGlyZWN0Jyxcblx0Z2VuZXJhdGVVc2VybmFtZTogZmFsc2UsXG5cdG1hbmlmZXN0VVJJOiBNZXRlb3IuYWJzb2x1dGVVcmwoJ19ibG9ja3N0YWNrL21hbmlmZXN0JyksXG5cdHJlZGlyZWN0VVJJOiBNZXRlb3IuYWJzb2x1dGVVcmwoJ19ibG9ja3N0YWNrL3ZhbGlkYXRlJyksXG5cdGF1dGhEZXNjcmlwdGlvbjogJ1JvY2tldC5DaGF0IGxvZ2luJyxcblx0YnV0dG9uTGFiZWxUZXh0OiAnQmxvY2tzdGFjaycsXG5cdGJ1dHRvbkNvbG9yOiAnIzI3MTEzMicsXG5cdGJ1dHRvbkxhYmVsQ29sb3I6ICcjZmZmZmZmJyxcbn07XG5cbk1ldGVvci5zdGFydHVwKCgpID0+IHtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGRHcm91cCgnQmxvY2tzdGFjaycsIGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWRkKCdCbG9ja3N0YWNrX0VuYWJsZScsIGRlZmF1bHRzLmVuYWJsZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0aTE4bkxhYmVsOiAnRW5hYmxlJyxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnQmxvY2tzdGFja19BdXRoX0Rlc2NyaXB0aW9uJywgZGVmYXVsdHMuYXV0aERlc2NyaXB0aW9uLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnQmxvY2tzdGFja19CdXR0b25MYWJlbFRleHQnLCBkZWZhdWx0cy5idXR0b25MYWJlbFRleHQsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdCbG9ja3N0YWNrX0dlbmVyYXRlX1VzZXJuYW1lJywgZGVmYXVsdHMuZ2VuZXJhdGVVc2VybmFtZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdH0pO1xuXHR9KTtcbn0pO1xuXG4vLyBIZWxwZXIgdG8gcmV0dXJuIGFsbCBCbG9ja3N0YWNrIHNldHRpbmdzXG5jb25zdCBnZXRTZXR0aW5ncyA9ICgpID0+IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCB7XG5cdGVuYWJsZTogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Jsb2Nrc3RhY2tfRW5hYmxlJyksXG5cdGF1dGhEZXNjcmlwdGlvbjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Jsb2Nrc3RhY2tfQXV0aF9EZXNjcmlwdGlvbicpLFxuXHRidXR0b25MYWJlbFRleHQ6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdCbG9ja3N0YWNrX0J1dHRvbkxhYmVsVGV4dCcpLFxuXHRnZW5lcmF0ZVVzZXJuYW1lOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQmxvY2tzdGFja19HZW5lcmF0ZV9Vc2VybmFtZScpLFxufSk7XG5cbmNvbnN0IGNvbmZpZ3VyZVNlcnZpY2UgPSBfLmRlYm91bmNlKE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuXHRjb25zdCBzZXJ2aWNlQ29uZmlnID0gZ2V0U2V0dGluZ3MoKTtcblxuXHRpZiAoIXNlcnZpY2VDb25maWcuZW5hYmxlKSB7XG5cdFx0bG9nZ2VyLmRlYnVnKCdCbG9ja3N0YWNrIG5vdCBlbmFibGVkJywgc2VydmljZUNvbmZpZyk7XG5cdFx0cmV0dXJuIFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLnJlbW92ZSh7XG5cdFx0XHRzZXJ2aWNlOiAnYmxvY2tzdGFjaycsXG5cdFx0fSk7XG5cdH1cblxuXHRTZXJ2aWNlQ29uZmlndXJhdGlvbi5jb25maWd1cmF0aW9ucy51cHNlcnQoe1xuXHRcdHNlcnZpY2U6ICdibG9ja3N0YWNrJyxcblx0fSwge1xuXHRcdCRzZXQ6IHNlcnZpY2VDb25maWcsXG5cdH0pO1xuXG5cdGxvZ2dlci5kZWJ1ZygnSW5pdCBCbG9ja3N0YWNrIGF1dGgnLCBzZXJ2aWNlQ29uZmlnKTtcbn0pLCAxMDAwKTtcblxuLy8gQWRkIHNldHRpbmdzIHRvIGF1dGggcHJvdmlkZXIgY29uZmlncyBvbiBzdGFydHVwXG5NZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KC9eQmxvY2tzdGFja18uKy8sICgpID0+IHtcblx0XHRjb25maWd1cmVTZXJ2aWNlKCk7XG5cdH0pO1xufSk7XG4iLCJpbXBvcnQgeyBkZWNvZGVUb2tlbiB9IGZyb20gJ2Jsb2Nrc3RhY2snO1xuXG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEFjY291bnRzIH0gZnJvbSAnbWV0ZW9yL2FjY291bnRzLWJhc2UnO1xuaW1wb3J0IHsgTWF0Y2gsIGNoZWNrIH0gZnJvbSAnbWV0ZW9yL2NoZWNrJztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4vbG9nZ2VyJztcblxuLy8gSGFuZGxlciBleHRyYWN0cyBkYXRhIGZyb20gSlNPTiBhbmQgdG9rZW5pc2VkIHJlcG9uc2UuXG4vLyBSZWZsZWN0cyBPQXV0aCB0b2tlbiBzZXJ2aWNlLCB3aXRoIHNvbWUgc2xpZ2h0IG1vZGlmaWNhdGlvbnMgZm9yIEJsb2Nrc3RhY2suXG4vL1xuLy8gVXNlcyAnaXNzJyAoaXNzdWVyKSBhcyB1bmlxdWUga2V5IChkZWNlbnRyYWxpc2VkIElEKSBmb3IgdXNlci5cbi8vIFRoZSAnZGlkJyBmaW5hbCBwb3J0aW9uIG9mIHRoZSBibG9ja3N0YWNrIGRlY2VudHJhbGlzZWQgSUQsIGlzIGRpc3BsYXllZCBhc1xuLy8geW91ciBwcm9maWxlIElEIGluIHRoZSBzZXJ2aWNlLiBUaGlzIGlzbid0IHVzZWQgeWV0LCBidXQgY291bGQgYmUgdXNlZnVsXG4vLyB0byBsaW5rIGFjY291bnRzIGlmIGlkZW50aXR5IHByb3ZpZGVycyBvdGhlciB0aGFuIGJ0YyBhZGRyZXNzIGFyZSBhZGRlZC5cbmV4cG9ydCBjb25zdCBoYW5kbGVBY2Nlc3NUb2tlbiA9IChsb2dpblJlcXVlc3QpID0+IHtcblx0bG9nZ2VyLmRlYnVnKCdMb2dpbiByZXF1ZXN0IHJlY2VpdmVkJywgbG9naW5SZXF1ZXN0KTtcblxuXHRjaGVjayhsb2dpblJlcXVlc3QsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0YXV0aFJlc3BvbnNlOiBTdHJpbmcsXG5cdFx0dXNlckRhdGE6IE9iamVjdCxcblx0fSkpO1xuXG5cdC8vIERlY29kZSBhdXRoIHJlc3BvbnNlIGZvciB1c2VyIGF0dHJpYnV0ZXNcblx0Y29uc3QgeyB1c2VybmFtZSwgcHJvZmlsZSB9ID0gbG9naW5SZXF1ZXN0LnVzZXJEYXRhO1xuXHRjb25zdCBkZWNvZGVkVG9rZW4gPSBkZWNvZGVUb2tlbihsb2dpblJlcXVlc3QuYXV0aFJlc3BvbnNlKS5wYXlsb2FkO1xuXG5cdHByb2ZpbGUudXNlcm5hbWUgPSB1c2VybmFtZTtcblxuXHRsb2dnZXIuZGVidWcoJ1VzZXIgZGF0YScsIGxvZ2luUmVxdWVzdC51c2VyRGF0YSk7XG5cdGxvZ2dlci5kZWJ1ZygnTG9naW4gZGVjb2RlZCcsIGRlY29kZWRUb2tlbik7XG5cblx0Y29uc3QgeyBpc3MsIGlhdCwgZXhwIH0gPSBkZWNvZGVkVG9rZW47XG5cblx0aWYgKCFpc3MpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogJ2Jsb2Nrc3RhY2snLFxuXHRcdFx0ZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoQWNjb3VudHMuTG9naW5DYW5jZWxsZWRFcnJvci5udW1lcmljRXJyb3IsICdJbnN1ZmZpY2llbnQgZGF0YSBpbiBhdXRoIHJlc3BvbnNlIHRva2VuJyksXG5cdFx0fTtcblx0fVxuXG5cdC8vIENvbGxlY3QgYmFzaWMgYXV0aCBwcm92aWRlciBkZXRhaWxzXG5cdGNvbnN0IHNlcnZpY2VEYXRhID0ge1xuXHRcdGlkOiBpc3MsXG5cdFx0ZGlkOiBpc3Muc3BsaXQoJzonKS5wb3AoKSxcblx0XHRpc3N1ZWRBdDogbmV3IERhdGUoaWF0ICogMTAwMCksXG5cdFx0ZXhwaXJlc0F0OiBuZXcgRGF0ZShleHAgKiAxMDAwKSxcblx0fTtcblxuXHQvLyBBZGQgQXZhdGFyIGltYWdlIHNvdXJjZSB0byB1c2UgZm9yIGF1dGggc2VydmljZSBzdWdnZXN0aW9uc1xuXHRpZiAoQXJyYXkuaXNBcnJheShwcm9maWxlLmltYWdlKSAmJiBwcm9maWxlLmltYWdlLmxlbmd0aCkge1xuXHRcdHNlcnZpY2VEYXRhLmltYWdlID0gcHJvZmlsZS5pbWFnZVswXS5jb250ZW50VXJsO1xuXHR9XG5cblx0bG9nZ2VyLmRlYnVnKCdMb2dpbiBkYXRhJywgc2VydmljZURhdGEsIHByb2ZpbGUpO1xuXG5cdHJldHVybiB7XG5cdFx0c2VydmljZURhdGEsXG5cdFx0b3B0aW9uczogeyBwcm9maWxlIH0sXG5cdH07XG59O1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBBY2NvdW50cyB9IGZyb20gJ21ldGVvci9hY2NvdW50cy1iYXNlJztcbmltcG9ydCB7IFNlcnZpY2VDb25maWd1cmF0aW9uIH0gZnJvbSAnbWV0ZW9yL3NlcnZpY2UtY29uZmlndXJhdGlvbic7XG5pbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4vbG9nZ2VyJztcblxuLy8gVXBkYXRlcyBvciBjcmVhdGVzIGEgdXNlciBhZnRlciB3ZSBhdXRoZW50aWNhdGUgd2l0aCBCbG9ja3N0YWNrXG4vLyBDbG9uZXMgQWNjb3VudHMudXBkYXRlT3JDcmVhdGVVc2VyRnJvbUV4dGVybmFsU2VydmljZSB3aXRoIHNvbWUgbW9kaWZpY2F0aW9uc1xuZXhwb3J0IGNvbnN0IHVwZGF0ZU9yQ3JlYXRlVXNlciA9IChzZXJ2aWNlRGF0YSwgb3B0aW9ucykgPT4ge1xuXHRjb25zdCBzZXJ2aWNlQ29uZmlnID0gU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMuZmluZE9uZSh7IHNlcnZpY2U6ICdibG9ja3N0YWNrJyB9KTtcblx0bG9nZ2VyLmRlYnVnKCdBdXRoIGNvbmZpZycsIHNlcnZpY2VDb25maWcpO1xuXG5cdC8vIEV4dHJhY3QgdXNlciBkYXRhIGZyb20gc2VydmljZSAvIHRva2VuXG5cdGNvbnN0IHsgaWQsIGRpZCB9ID0gc2VydmljZURhdGE7XG5cdGNvbnN0IHsgcHJvZmlsZSB9ID0gb3B0aW9ucztcblxuXHQvLyBMb29rIGZvciBleGlzdGluZyBCbG9ja3N0YWNrIHVzZXJcblx0Y29uc3QgdXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHsgJ3NlcnZpY2VzLmJsb2Nrc3RhY2suaWQnOiBpZCB9KTtcblx0bGV0IHVzZXJJZDtcblx0bGV0IGlzTmV3ID0gZmFsc2U7XG5cblx0Ly8gVXNlIGZvdW5kIG9yIGNyZWF0ZSBhIHVzZXJcblx0aWYgKHVzZXIpIHtcblx0XHRsb2dnZXIuaW5mbyhgVXNlciBsb2dpbiB3aXRoIEJsb2Nrc3RhY2sgSUQgJHsgaWQgfWApO1xuXHRcdHVzZXJJZCA9IHVzZXIuX2lkO1xuXHR9IGVsc2Uge1xuXHRcdGlzTmV3ID0gdHJ1ZTtcblx0XHRsZXQgZW1haWxzID0gW107XG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KHByb2ZpbGUuZW1haWxzKSkge1xuXHRcdFx0Ly8gRml4IGFic2Vuc2Ugb2YgZW1haWxzIGJ5IGFkZGluZyBwbGFjZWhvbGRlciBhZGRyZXNzIHVzaW5nIGRlY2VudHJhbGlzZWRcblx0XHRcdC8vIElEIGF0IGJsb2Nrc3RhY2suZW1haWwgLSBhIGhvbGRpbmcgZG9tYWluIG9ubHksIG5vIE1YIHJlY29yZCwgZG9lcyBub3Rcblx0XHRcdC8vIHByb2Nlc3MgZW1haWwsIG1heSBiZSB1c2VkIGluIGZ1dHVyZSB0byBwcm92aWRlIGRlY2VudHJhbGlzZWQgZW1haWwgdmlhXG5cdFx0XHQvLyBnYWlhLCBlbmNyeXB0aW5nIG1haWwgZm9yIERJRCB1c2VyIG9ubHkuIEBUT0RPOiBkb2N1bWVudCB0aGlzIGFwcHJvYWNoLlxuXHRcdFx0ZW1haWxzLnB1c2goeyBhZGRyZXNzOiBgJHsgZGlkIH1AYmxvY2tzdGFjay5lbWFpbGAsIHZlcmlmaWVkOiBmYWxzZSB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gUmVmb3JtYXQgYXJyYXkgb2YgZW1haWxzIGludG8gZXhwZWN0ZWQgZm9ybWF0IGlmIHRoZXkgZXhpc3Rcblx0XHRcdGVtYWlscyA9IHByb2ZpbGUuZW1haWxzLm1hcCgoYWRkcmVzcykgPT4gKHsgYWRkcmVzcywgdmVyaWZpZWQ6IHRydWUgfSkpO1xuXHRcdH1cblxuXHRcdGNvbnN0IG5ld1VzZXIgPSB7XG5cdFx0XHRuYW1lOiBwcm9maWxlLm5hbWUsXG5cdFx0XHRhY3RpdmU6IHRydWUsXG5cdFx0XHRlbWFpbHMsXG5cdFx0XHRzZXJ2aWNlczogeyBibG9ja3N0YWNrOiBzZXJ2aWNlRGF0YSB9LFxuXHRcdH07XG5cblx0XHQvLyBTZXQgdXNlcm5hbWUgc2FtZSBhcyBpbiBibG9ja3N0YWNrLCBvciBzdWdnZXN0IGlmIG5vbmVcblx0XHRpZiAocHJvZmlsZS5uYW1lKSB7XG5cdFx0XHRuZXdVc2VyLm5hbWUgPSBwcm9maWxlLm5hbWU7XG5cdFx0fVxuXG5cdFx0Ly8gVGFrZSBwcm9maWxlIHVzZXJuYW1lIGlmIGV4aXN0cywgb3IgZ2VuZXJhdGUgb25lIGlmIGVuYWJsZWRcblx0XHRpZiAocHJvZmlsZS51c2VybmFtZSAmJiBwcm9maWxlLnVzZXJuYW1lICE9PSAnJykge1xuXHRcdFx0bmV3VXNlci51c2VybmFtZSA9IHByb2ZpbGUudXNlcm5hbWU7XG5cdFx0fSBlbHNlIGlmIChzZXJ2aWNlQ29uZmlnLmdlbmVyYXRlVXNlcm5hbWUgPT09IHRydWUpIHtcblx0XHRcdG5ld1VzZXIudXNlcm5hbWUgPSBSb2NrZXRDaGF0LmdlbmVyYXRlVXNlcm5hbWVTdWdnZXN0aW9uKG5ld1VzZXIpO1xuXHRcdH1cblx0XHQvLyBJZiBubyB1c2VybmFtZSBhdCB0aGlzIHBvaW50IGl0IHdpbGwgc3VnZ2VzdCBvbmUgZnJvbSB0aGUgbmFtZVxuXG5cdFx0Ly8gQ3JlYXRlIGFuZCBnZXQgY3JlYXRlZCB1c2VyIHRvIG1ha2UgYSBjb3VwbGUgbW9yZSBtb2RzIGJlZm9yZSByZXR1cm5pbmdcblx0XHRsb2dnZXIuaW5mbyhgQ3JlYXRpbmcgdXNlciBmb3IgQmxvY2tzdGFjayBJRCAkeyBpZCB9YCk7XG5cdFx0dXNlcklkID0gQWNjb3VudHMuaW5zZXJ0VXNlckRvYyh7fSwgbmV3VXNlcik7XG5cdFx0bG9nZ2VyLmRlYnVnKCdOZXcgdXNlciAkeyB1c2VySWQgfScsIG5ld1VzZXIpO1xuXHR9XG5cblx0Ly8gQWRkIGxvZ2luIHRva2VuIGZvciBibG9ja3N0YWNrIGF1dGggc2Vzc2lvbiAodGFrZSBleHBpcmF0aW9uIGZyb20gcmVzcG9uc2UpXG5cdC8vIFRPRE86IFJlZ3F1aXJlZCBtZXRob2QgcmVzdWx0IGZvcm1hdCBpZ25vcmVzIGAud2hlbmBcblx0Y29uc3QgeyB0b2tlbiB9ID0gQWNjb3VudHMuX2dlbmVyYXRlU3RhbXBlZExvZ2luVG9rZW4oKTtcblx0Y29uc3QgdG9rZW5FeHBpcmVzID0gc2VydmljZURhdGEuZXhwaXJlc0F0O1xuXG5cdHJldHVybiB7XG5cdFx0dHlwZTogJ2Jsb2Nrc3RhY2snLFxuXHRcdHVzZXJJZCxcblx0XHR0b2tlbixcblx0XHR0b2tlbkV4cGlyZXMsXG5cdFx0aXNOZXcsXG5cdH07XG59O1xuIl19
