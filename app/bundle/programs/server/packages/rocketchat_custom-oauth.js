(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var meteorInstall = Package.modules.meteorInstall;
var check = Package.check.check;
var Match = Package.check.Match;
var OAuth = Package.oauth.OAuth;
var Oauth = Package.oauth.Oauth;
var ECMAScript = Package.ecmascript.ECMAScript;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var Accounts = Package['accounts-base'].Accounts;

/* Package-scope variables */
var CustomOAuth;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:custom-oauth":{"server":{"custom_oauth_server.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_custom-oauth/server/custom_oauth_server.js                                                    //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({
  CustomOAuth: () => CustomOAuth
});

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
const logger = new Logger('CustomOAuth');
const Services = {};
const BeforeUpdateOrCreateUserFromExternalService = [];

class CustomOAuth {
  constructor(name, options) {
    logger.debug('Init CustomOAuth', name, options);
    this.name = name;

    if (!Match.test(this.name, String)) {
      throw new Meteor.Error('CustomOAuth: Name is required and must be String');
    }

    if (Services[this.name]) {
      Services[this.name].configure(options);
      return;
    }

    Services[this.name] = this;
    this.configure(options);
    this.userAgent = 'Meteor';

    if (Meteor.release) {
      this.userAgent += `/${Meteor.release}`;
    }

    Accounts.oauth.registerService(this.name);
    this.registerService();
    this.addHookToProcessUser();
  }

  configure(options) {
    if (!Match.test(options, Object)) {
      throw new Meteor.Error('CustomOAuth: Options is required and must be Object');
    }

    if (!Match.test(options.serverURL, String)) {
      throw new Meteor.Error('CustomOAuth: Options.serverURL is required and must be String');
    }

    if (!Match.test(options.tokenPath, String)) {
      options.tokenPath = '/oauth/token';
    }

    if (!Match.test(options.identityPath, String)) {
      options.identityPath = '/me';
    }

    this.serverURL = options.serverURL;
    this.tokenPath = options.tokenPath;
    this.identityPath = options.identityPath;
    this.tokenSentVia = options.tokenSentVia;
    this.identityTokenSentVia = options.identityTokenSentVia;
    this.usernameField = (options.usernameField || '').trim();
    this.mergeUsers = options.mergeUsers;

    if (this.identityTokenSentVia == null || this.identityTokenSentVia === 'default') {
      this.identityTokenSentVia = this.tokenSentVia;
    }

    if (!/^https?:\/\/.+/.test(this.tokenPath)) {
      this.tokenPath = this.serverURL + this.tokenPath;
    }

    if (!/^https?:\/\/.+/.test(this.identityPath)) {
      this.identityPath = this.serverURL + this.identityPath;
    }

    if (Match.test(options.addAutopublishFields, Object)) {
      Accounts.addAutopublishFields(options.addAutopublishFields);
    }
  }

  getAccessToken(query) {
    const config = ServiceConfiguration.configurations.findOne({
      service: this.name
    });

    if (!config) {
      throw new ServiceConfiguration.ConfigError();
    }

    let response = undefined;
    const allOptions = {
      headers: {
        'User-Agent': this.userAgent,
        // http://doc.gitlab.com/ce/api/users.html#Current-user
        Accept: 'application/json'
      },
      params: {
        code: query.code,
        redirect_uri: OAuth._redirectUri(this.name, config),
        grant_type: 'authorization_code',
        state: query.state
      }
    }; // Only send clientID / secret once on header or payload.

    if (this.tokenSentVia === 'header') {
      allOptions.auth = `${config.clientId}:${OAuth.openSecret(config.secret)}`;
    } else {
      allOptions.params.client_secret = OAuth.openSecret(config.secret);
      allOptions.params.client_id = config.clientId;
    }

    try {
      response = HTTP.post(this.tokenPath, allOptions);
    } catch (err) {
      const error = new Error(`Failed to complete OAuth handshake with ${this.name} at ${this.tokenPath}. ${err.message}`);
      throw _.extend(error, {
        response: err.response
      });
    }

    let data;

    if (response.data) {
      data = response.data;
    } else {
      data = JSON.parse(response.content);
    }

    if (data.error) {
      // if the http response was a json object with an error attribute
      throw new Error(`Failed to complete OAuth handshake with ${this.name} at ${this.tokenPath}. ${data.error}`);
    } else {
      return data.access_token;
    }
  }

  getIdentity(accessToken) {
    const params = {};
    const headers = {
      'User-Agent': this.userAgent // http://doc.gitlab.com/ce/api/users.html#Current-user

    };

    if (this.identityTokenSentVia === 'header') {
      headers.Authorization = `Bearer ${accessToken}`;
    } else {
      params.access_token = accessToken;
    }

    try {
      const response = HTTP.get(this.identityPath, {
        headers,
        params
      });
      let data;

      if (response.data) {
        data = response.data;
      } else {
        data = JSON.parse(response.content);
      }

      logger.debug('Identity response', JSON.stringify(data, null, 2));
      return data;
    } catch (err) {
      const error = new Error(`Failed to fetch identity from ${this.name} at ${this.identityPath}. ${err.message}`);
      throw _.extend(error, {
        response: err.response
      });
    }
  }

  registerService() {
    const self = this;
    OAuth.registerService(this.name, 2, null, query => {
      const accessToken = self.getAccessToken(query); // console.log 'at:', accessToken

      let identity = self.getIdentity(accessToken);

      if (identity) {
        // Set 'id' to '_id' for any sources that provide it
        if (identity._id && !identity.id) {
          identity.id = identity._id;
        } // Fix for Reddit


        if (identity.result) {
          identity = identity.result;
        } // Fix WordPress-like identities having 'ID' instead of 'id'


        if (identity.ID && !identity.id) {
          identity.id = identity.ID;
        } // Fix Auth0-like identities having 'user_id' instead of 'id'


        if (identity.user_id && !identity.id) {
          identity.id = identity.user_id;
        }

        if (identity.CharacterID && !identity.id) {
          identity.id = identity.CharacterID;
        } // Fix Dataporten having 'user.userid' instead of 'id'


        if (identity.user && identity.user.userid && !identity.id) {
          if (identity.user.userid_sec && identity.user.userid_sec[0]) {
            identity.id = identity.user.userid_sec[0];
          } else {
            identity.id = identity.user.userid;
          }

          identity.email = identity.user.email;
        } // Fix for Xenforo [BD]API plugin for 'user.user_id; instead of 'id'


        if (identity.user && identity.user.user_id && !identity.id) {
          identity.id = identity.user.user_id;
          identity.email = identity.user.user_email;
        } // Fix general 'phid' instead of 'id' from phabricator


        if (identity.phid && !identity.id) {
          identity.id = identity.phid;
        } // Fix Keycloak-like identities having 'sub' instead of 'id'


        if (identity.sub && !identity.id) {
          identity.id = identity.sub;
        } // Fix general 'userid' instead of 'id' from provider


        if (identity.userid && !identity.id) {
          identity.id = identity.userid;
        } // Fix Nextcloud provider


        if (!identity.id && identity.ocs && identity.ocs.data && identity.ocs.data.id) {
          identity.id = identity.ocs.data.id;
          identity.name = identity.ocs.data.displayname;
          identity.email = identity.ocs.data.email;
        } // Fix when authenticating from a meteor app with 'emails' field


        if (!identity.email && identity.emails && Array.isArray(identity.emails) && identity.emails.length >= 1) {
          identity.email = identity.emails[0].address ? identity.emails[0].address : undefined;
        }
      } // console.log 'id:', JSON.stringify identity, null, '  '


      const serviceData = {
        _OAuthCustom: true,
        accessToken
      };

      _.extend(serviceData, identity);

      const data = {
        serviceData,
        options: {
          profile: {
            name: identity.name || identity.username || identity.nickname || identity.CharacterName || identity.userName || identity.preferred_username || identity.user && identity.user.name
          }
        }
      }; // console.log data

      return data;
    });
  }

  retrieveCredential(credentialToken, credentialSecret) {
    return OAuth.retrieveCredential(credentialToken, credentialSecret);
  }

  getUsername(data) {
    let username = '';
    username = this.usernameField.split('.').reduce(function (prev, curr) {
      return prev ? prev[curr] : undefined;
    }, data);

    if (!username) {
      throw new Meteor.Error('field_not_found', `Username field "${this.usernameField}" not found in data`, data);
    }

    return username;
  }

  addHookToProcessUser() {
    BeforeUpdateOrCreateUserFromExternalService.push((serviceName, serviceData
    /* , options*/
    ) => {
      if (serviceName !== this.name) {
        return;
      }

      if (this.usernameField) {
        const username = this.getUsername(serviceData);
        const user = RocketChat.models.Users.findOneByUsername(username);

        if (!user) {
          return;
        } // User already created or merged


        if (user.services && user.services[serviceName] && user.services[serviceName].id === serviceData.id) {
          return;
        }

        if (this.mergeUsers !== true) {
          throw new Meteor.Error('CustomOAuth', `User with username ${user.username} already exists`);
        }

        const serviceIdKey = `services.${serviceName}.id`;
        const update = {
          $set: {
            [serviceIdKey]: serviceData.id
          }
        };
        RocketChat.models.Users.update({
          _id: user._id
        }, update);
      }
    });
    Accounts.validateNewUser(user => {
      if (!user.services || !user.services[this.name] || !user.services[this.name].id) {
        return true;
      }

      if (this.usernameField) {
        user.username = this.getUsername(user.services[this.name]);
      }

      return true;
    });
  }

}

const {
  updateOrCreateUserFromExternalService
} = Accounts;

Accounts.updateOrCreateUserFromExternalService = function (...args
/* serviceName, serviceData, options*/
) {
  for (const hook of BeforeUpdateOrCreateUserFromExternalService) {
    hook.apply(this, args);
  }

  return updateOrCreateUserFromExternalService.apply(this, args);
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/rocketchat:custom-oauth/server/custom_oauth_server.js");

/* Exports */
Package._define("rocketchat:custom-oauth", exports, {
  CustomOAuth: CustomOAuth
});

})();

//# sourceURL=meteor://💻app/packages/rocketchat_custom-oauth.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjdXN0b20tb2F1dGgvc2VydmVyL2N1c3RvbV9vYXV0aF9zZXJ2ZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiQ3VzdG9tT0F1dGgiLCJfIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJsb2dnZXIiLCJMb2dnZXIiLCJTZXJ2aWNlcyIsIkJlZm9yZVVwZGF0ZU9yQ3JlYXRlVXNlckZyb21FeHRlcm5hbFNlcnZpY2UiLCJjb25zdHJ1Y3RvciIsIm5hbWUiLCJvcHRpb25zIiwiZGVidWciLCJNYXRjaCIsInRlc3QiLCJTdHJpbmciLCJNZXRlb3IiLCJFcnJvciIsImNvbmZpZ3VyZSIsInVzZXJBZ2VudCIsInJlbGVhc2UiLCJBY2NvdW50cyIsIm9hdXRoIiwicmVnaXN0ZXJTZXJ2aWNlIiwiYWRkSG9va1RvUHJvY2Vzc1VzZXIiLCJPYmplY3QiLCJzZXJ2ZXJVUkwiLCJ0b2tlblBhdGgiLCJpZGVudGl0eVBhdGgiLCJ0b2tlblNlbnRWaWEiLCJpZGVudGl0eVRva2VuU2VudFZpYSIsInVzZXJuYW1lRmllbGQiLCJ0cmltIiwibWVyZ2VVc2VycyIsImFkZEF1dG9wdWJsaXNoRmllbGRzIiwiZ2V0QWNjZXNzVG9rZW4iLCJxdWVyeSIsImNvbmZpZyIsIlNlcnZpY2VDb25maWd1cmF0aW9uIiwiY29uZmlndXJhdGlvbnMiLCJmaW5kT25lIiwic2VydmljZSIsIkNvbmZpZ0Vycm9yIiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJhbGxPcHRpb25zIiwiaGVhZGVycyIsIkFjY2VwdCIsInBhcmFtcyIsImNvZGUiLCJyZWRpcmVjdF91cmkiLCJPQXV0aCIsIl9yZWRpcmVjdFVyaSIsImdyYW50X3R5cGUiLCJzdGF0ZSIsImF1dGgiLCJjbGllbnRJZCIsIm9wZW5TZWNyZXQiLCJzZWNyZXQiLCJjbGllbnRfc2VjcmV0IiwiY2xpZW50X2lkIiwiSFRUUCIsInBvc3QiLCJlcnIiLCJlcnJvciIsIm1lc3NhZ2UiLCJleHRlbmQiLCJkYXRhIiwiSlNPTiIsInBhcnNlIiwiY29udGVudCIsImFjY2Vzc190b2tlbiIsImdldElkZW50aXR5IiwiYWNjZXNzVG9rZW4iLCJBdXRob3JpemF0aW9uIiwiZ2V0Iiwic3RyaW5naWZ5Iiwic2VsZiIsImlkZW50aXR5IiwiX2lkIiwiaWQiLCJyZXN1bHQiLCJJRCIsInVzZXJfaWQiLCJDaGFyYWN0ZXJJRCIsInVzZXIiLCJ1c2VyaWQiLCJ1c2VyaWRfc2VjIiwiZW1haWwiLCJ1c2VyX2VtYWlsIiwicGhpZCIsInN1YiIsIm9jcyIsImRpc3BsYXluYW1lIiwiZW1haWxzIiwiQXJyYXkiLCJpc0FycmF5IiwibGVuZ3RoIiwiYWRkcmVzcyIsInNlcnZpY2VEYXRhIiwiX09BdXRoQ3VzdG9tIiwicHJvZmlsZSIsInVzZXJuYW1lIiwibmlja25hbWUiLCJDaGFyYWN0ZXJOYW1lIiwidXNlck5hbWUiLCJwcmVmZXJyZWRfdXNlcm5hbWUiLCJyZXRyaWV2ZUNyZWRlbnRpYWwiLCJjcmVkZW50aWFsVG9rZW4iLCJjcmVkZW50aWFsU2VjcmV0IiwiZ2V0VXNlcm5hbWUiLCJzcGxpdCIsInJlZHVjZSIsInByZXYiLCJjdXJyIiwicHVzaCIsInNlcnZpY2VOYW1lIiwiUm9ja2V0Q2hhdCIsIm1vZGVscyIsIlVzZXJzIiwiZmluZE9uZUJ5VXNlcm5hbWUiLCJzZXJ2aWNlcyIsInNlcnZpY2VJZEtleSIsInVwZGF0ZSIsIiRzZXQiLCJ2YWxpZGF0ZU5ld1VzZXIiLCJ1cGRhdGVPckNyZWF0ZVVzZXJGcm9tRXh0ZXJuYWxTZXJ2aWNlIiwiYXJncyIsImhvb2siLCJhcHBseSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLE1BQVAsQ0FBYztBQUFDQyxlQUFZLE1BQUlBO0FBQWpCLENBQWQ7O0FBQTZDLElBQUlDLENBQUo7O0FBQU1ILE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFB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Q0F0RyxhQUFTd0csZUFBVCxDQUEwQnhDLElBQUQsSUFBVTtBQUNsQyxVQUFJLENBQUNBLEtBQUtvQyxRQUFOLElBQWtCLENBQUNwQyxLQUFLb0MsUUFBTCxDQUFjLEtBQUsvRyxJQUFuQixDQUFuQixJQUErQyxDQUFDMkUsS0FBS29DLFFBQUwsQ0FBYyxLQUFLL0csSUFBbkIsRUFBeUJzRSxFQUE3RSxFQUFpRjtBQUNoRixlQUFPLElBQVA7QUFDQTs7QUFFRCxVQUFJLEtBQUtqRCxhQUFULEVBQXdCO0FBQ3ZCc0QsYUFBS2lCLFFBQUwsR0FBZ0IsS0FBS1EsV0FBTCxDQUFpQnpCLEtBQUtvQyxRQUFMLENBQWMsS0FBSy9HLElBQW5CLENBQWpCLENBQWhCO0FBQ0E7O0FBRUQsYUFBTyxJQUFQO0FBQ0EsS0FWRDtBQVlBOztBQTVUdUI7O0FBZ1V6QixNQUFNO0FBQUVvSDtBQUFGLElBQTRDekcsUUFBbEQ7O0FBQ0FBLFNBQVN5RyxxQ0FBVCxHQUFpRCxVQUFTLEdBQUdDO0FBQUs7QUFBakIsRUFBeUQ7QUFDekcsT0FBSyxNQUFNQyxJQUFYLElBQW1CeEgsMkNBQW5CLEVBQWdFO0FBQy9Ed0gsU0FBS0MsS0FBTCxDQUFXLElBQVgsRUFBaUJGLElBQWpCO0FBQ0E7O0FBRUQsU0FBT0Qsc0NBQXNDRyxLQUF0QyxDQUE0QyxJQUE1QyxFQUFrREYsSUFBbEQsQ0FBUDtBQUNBLENBTkQsQyIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9jdXN0b20tb2F1dGguanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWxzIE9BdXRoKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5jb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCdDdXN0b21PQXV0aCcpO1xuXG5jb25zdCBTZXJ2aWNlcyA9IHt9O1xuY29uc3QgQmVmb3JlVXBkYXRlT3JDcmVhdGVVc2VyRnJvbUV4dGVybmFsU2VydmljZSA9IFtdO1xuXG5leHBvcnQgY2xhc3MgQ3VzdG9tT0F1dGgge1xuXHRjb25zdHJ1Y3RvcihuYW1lLCBvcHRpb25zKSB7XG5cdFx0bG9nZ2VyLmRlYnVnKCdJbml0IEN1c3RvbU9BdXRoJywgbmFtZSwgb3B0aW9ucyk7XG5cblx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHRcdGlmICghTWF0Y2gudGVzdCh0aGlzLm5hbWUsIFN0cmluZykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ0N1c3RvbU9BdXRoOiBOYW1lIGlzIHJlcXVpcmVkIGFuZCBtdXN0IGJlIFN0cmluZycpO1xuXHRcdH1cblxuXHRcdGlmIChTZXJ2aWNlc1t0aGlzLm5hbWVdKSB7XG5cdFx0XHRTZXJ2aWNlc1t0aGlzLm5hbWVdLmNvbmZpZ3VyZShvcHRpb25zKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRTZXJ2aWNlc1t0aGlzLm5hbWVdID0gdGhpcztcblxuXHRcdHRoaXMuY29uZmlndXJlKG9wdGlvbnMpO1xuXG5cdFx0dGhpcy51c2VyQWdlbnQgPSAnTWV0ZW9yJztcblx0XHRpZiAoTWV0ZW9yLnJlbGVhc2UpIHtcblx0XHRcdHRoaXMudXNlckFnZW50ICs9IGAvJHsgTWV0ZW9yLnJlbGVhc2UgfWA7XG5cdFx0fVxuXG5cdFx0QWNjb3VudHMub2F1dGgucmVnaXN0ZXJTZXJ2aWNlKHRoaXMubmFtZSk7XG5cdFx0dGhpcy5yZWdpc3RlclNlcnZpY2UoKTtcblx0XHR0aGlzLmFkZEhvb2tUb1Byb2Nlc3NVc2VyKCk7XG5cdH1cblxuXHRjb25maWd1cmUob3B0aW9ucykge1xuXHRcdGlmICghTWF0Y2gudGVzdChvcHRpb25zLCBPYmplY3QpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdDdXN0b21PQXV0aDogT3B0aW9ucyBpcyByZXF1aXJlZCBhbmQgbXVzdCBiZSBPYmplY3QnKTtcblx0XHR9XG5cblx0XHRpZiAoIU1hdGNoLnRlc3Qob3B0aW9ucy5zZXJ2ZXJVUkwsIFN0cmluZykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ0N1c3RvbU9BdXRoOiBPcHRpb25zLnNlcnZlclVSTCBpcyByZXF1aXJlZCBhbmQgbXVzdCBiZSBTdHJpbmcnKTtcblx0XHR9XG5cblx0XHRpZiAoIU1hdGNoLnRlc3Qob3B0aW9ucy50b2tlblBhdGgsIFN0cmluZykpIHtcblx0XHRcdG9wdGlvbnMudG9rZW5QYXRoID0gJy9vYXV0aC90b2tlbic7XG5cdFx0fVxuXG5cdFx0aWYgKCFNYXRjaC50ZXN0KG9wdGlvbnMuaWRlbnRpdHlQYXRoLCBTdHJpbmcpKSB7XG5cdFx0XHRvcHRpb25zLmlkZW50aXR5UGF0aCA9ICcvbWUnO1xuXHRcdH1cblxuXHRcdHRoaXMuc2VydmVyVVJMID0gb3B0aW9ucy5zZXJ2ZXJVUkw7XG5cdFx0dGhpcy50b2tlblBhdGggPSBvcHRpb25zLnRva2VuUGF0aDtcblx0XHR0aGlzLmlkZW50aXR5UGF0aCA9IG9wdGlvbnMuaWRlbnRpdHlQYXRoO1xuXHRcdHRoaXMudG9rZW5TZW50VmlhID0gb3B0aW9ucy50b2tlblNlbnRWaWE7XG5cdFx0dGhpcy5pZGVudGl0eVRva2VuU2VudFZpYSA9IG9wdGlvbnMuaWRlbnRpdHlUb2tlblNlbnRWaWE7XG5cdFx0dGhpcy51c2VybmFtZUZpZWxkID0gKG9wdGlvbnMudXNlcm5hbWVGaWVsZCB8fCAnJykudHJpbSgpO1xuXHRcdHRoaXMubWVyZ2VVc2VycyA9IG9wdGlvbnMubWVyZ2VVc2VycztcblxuXHRcdGlmICh0aGlzLmlkZW50aXR5VG9rZW5TZW50VmlhID09IG51bGwgfHwgdGhpcy5pZGVudGl0eVRva2VuU2VudFZpYSA9PT0gJ2RlZmF1bHQnKSB7XG5cdFx0XHR0aGlzLmlkZW50aXR5VG9rZW5TZW50VmlhID0gdGhpcy50b2tlblNlbnRWaWE7XG5cdFx0fVxuXG5cdFx0aWYgKCEvXmh0dHBzPzpcXC9cXC8uKy8udGVzdCh0aGlzLnRva2VuUGF0aCkpIHtcblx0XHRcdHRoaXMudG9rZW5QYXRoID0gdGhpcy5zZXJ2ZXJVUkwgKyB0aGlzLnRva2VuUGF0aDtcblx0XHR9XG5cblx0XHRpZiAoIS9eaHR0cHM/OlxcL1xcLy4rLy50ZXN0KHRoaXMuaWRlbnRpdHlQYXRoKSkge1xuXHRcdFx0dGhpcy5pZGVudGl0eVBhdGggPSB0aGlzLnNlcnZlclVSTCArIHRoaXMuaWRlbnRpdHlQYXRoO1xuXHRcdH1cblxuXHRcdGlmIChNYXRjaC50ZXN0KG9wdGlvbnMuYWRkQXV0b3B1Ymxpc2hGaWVsZHMsIE9iamVjdCkpIHtcblx0XHRcdEFjY291bnRzLmFkZEF1dG9wdWJsaXNoRmllbGRzKG9wdGlvbnMuYWRkQXV0b3B1Ymxpc2hGaWVsZHMpO1xuXHRcdH1cblx0fVxuXG5cdGdldEFjY2Vzc1Rva2VuKHF1ZXJ5KSB7XG5cdFx0Y29uc3QgY29uZmlnID0gU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMuZmluZE9uZSh7IHNlcnZpY2U6IHRoaXMubmFtZSB9KTtcblx0XHRpZiAoIWNvbmZpZykge1xuXHRcdFx0dGhyb3cgbmV3IFNlcnZpY2VDb25maWd1cmF0aW9uLkNvbmZpZ0Vycm9yKCk7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3BvbnNlID0gdW5kZWZpbmVkO1xuXG5cdFx0Y29uc3QgYWxsT3B0aW9ucyA9IHtcblx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0J1VzZXItQWdlbnQnOiB0aGlzLnVzZXJBZ2VudCwgLy8gaHR0cDovL2RvYy5naXRsYWIuY29tL2NlL2FwaS91c2Vycy5odG1sI0N1cnJlbnQtdXNlclxuXHRcdFx0XHRBY2NlcHQ6ICdhcHBsaWNhdGlvbi9qc29uJyxcblx0XHRcdH0sXG5cdFx0XHRwYXJhbXM6IHtcblx0XHRcdFx0Y29kZTogcXVlcnkuY29kZSxcblx0XHRcdFx0cmVkaXJlY3RfdXJpOiBPQXV0aC5fcmVkaXJlY3RVcmkodGhpcy5uYW1lLCBjb25maWcpLFxuXHRcdFx0XHRncmFudF90eXBlOiAnYXV0aG9yaXphdGlvbl9jb2RlJyxcblx0XHRcdFx0c3RhdGU6IHF1ZXJ5LnN0YXRlLFxuXHRcdFx0fSxcblx0XHR9O1xuXG5cdFx0Ly8gT25seSBzZW5kIGNsaWVudElEIC8gc2VjcmV0IG9uY2Ugb24gaGVhZGVyIG9yIHBheWxvYWQuXG5cdFx0aWYgKHRoaXMudG9rZW5TZW50VmlhID09PSAnaGVhZGVyJykge1xuXHRcdFx0YWxsT3B0aW9ucy5hdXRoID0gYCR7IGNvbmZpZy5jbGllbnRJZCB9OiR7IE9BdXRoLm9wZW5TZWNyZXQoY29uZmlnLnNlY3JldCkgfWA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGFsbE9wdGlvbnMucGFyYW1zLmNsaWVudF9zZWNyZXQgPSBPQXV0aC5vcGVuU2VjcmV0KGNvbmZpZy5zZWNyZXQpO1xuXHRcdFx0YWxsT3B0aW9ucy5wYXJhbXMuY2xpZW50X2lkID0gY29uZmlnLmNsaWVudElkO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRyZXNwb25zZSA9IEhUVFAucG9zdCh0aGlzLnRva2VuUGF0aCwgYWxsT3B0aW9ucyk7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgRmFpbGVkIHRvIGNvbXBsZXRlIE9BdXRoIGhhbmRzaGFrZSB3aXRoICR7IHRoaXMubmFtZSB9IGF0ICR7IHRoaXMudG9rZW5QYXRoIH0uICR7IGVyci5tZXNzYWdlIH1gKTtcblx0XHRcdHRocm93IF8uZXh0ZW5kKGVycm9yLCB7IHJlc3BvbnNlOiBlcnIucmVzcG9uc2UgfSk7XG5cdFx0fVxuXG5cdFx0bGV0IGRhdGE7XG5cdFx0aWYgKHJlc3BvbnNlLmRhdGEpIHtcblx0XHRcdGRhdGEgPSByZXNwb25zZS5kYXRhO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRkYXRhID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcblx0XHR9XG5cblx0XHRpZiAoZGF0YS5lcnJvcikgeyAvLyBpZiB0aGUgaHR0cCByZXNwb25zZSB3YXMgYSBqc29uIG9iamVjdCB3aXRoIGFuIGVycm9yIGF0dHJpYnV0ZVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY29tcGxldGUgT0F1dGggaGFuZHNoYWtlIHdpdGggJHsgdGhpcy5uYW1lIH0gYXQgJHsgdGhpcy50b2tlblBhdGggfS4gJHsgZGF0YS5lcnJvciB9YCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBkYXRhLmFjY2Vzc190b2tlbjtcblx0XHR9XG5cdH1cblxuXHRnZXRJZGVudGl0eShhY2Nlc3NUb2tlbikge1xuXHRcdGNvbnN0IHBhcmFtcyA9IHt9O1xuXHRcdGNvbnN0IGhlYWRlcnMgPSB7XG5cdFx0XHQnVXNlci1BZ2VudCc6IHRoaXMudXNlckFnZW50LCAvLyBodHRwOi8vZG9jLmdpdGxhYi5jb20vY2UvYXBpL3VzZXJzLmh0bWwjQ3VycmVudC11c2VyXG5cdFx0fTtcblxuXHRcdGlmICh0aGlzLmlkZW50aXR5VG9rZW5TZW50VmlhID09PSAnaGVhZGVyJykge1xuXHRcdFx0aGVhZGVycy5BdXRob3JpemF0aW9uID0gYEJlYXJlciAkeyBhY2Nlc3NUb2tlbiB9YDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cGFyYW1zLmFjY2Vzc190b2tlbiA9IGFjY2Vzc1Rva2VuO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCByZXNwb25zZSA9IEhUVFAuZ2V0KHRoaXMuaWRlbnRpdHlQYXRoLCB7XG5cdFx0XHRcdGhlYWRlcnMsXG5cdFx0XHRcdHBhcmFtcyxcblx0XHRcdH0pO1xuXG5cdFx0XHRsZXQgZGF0YTtcblxuXHRcdFx0aWYgKHJlc3BvbnNlLmRhdGEpIHtcblx0XHRcdFx0ZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRkYXRhID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcblx0XHRcdH1cblxuXHRcdFx0bG9nZ2VyLmRlYnVnKCdJZGVudGl0eSByZXNwb25zZScsIEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpKTtcblxuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgRmFpbGVkIHRvIGZldGNoIGlkZW50aXR5IGZyb20gJHsgdGhpcy5uYW1lIH0gYXQgJHsgdGhpcy5pZGVudGl0eVBhdGggfS4gJHsgZXJyLm1lc3NhZ2UgfWApO1xuXHRcdFx0dGhyb3cgXy5leHRlbmQoZXJyb3IsIHsgcmVzcG9uc2U6IGVyci5yZXNwb25zZSB9KTtcblx0XHR9XG5cdH1cblxuXHRyZWdpc3RlclNlcnZpY2UoKSB7XG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdFx0T0F1dGgucmVnaXN0ZXJTZXJ2aWNlKHRoaXMubmFtZSwgMiwgbnVsbCwgKHF1ZXJ5KSA9PiB7XG5cdFx0XHRjb25zdCBhY2Nlc3NUb2tlbiA9IHNlbGYuZ2V0QWNjZXNzVG9rZW4ocXVlcnkpO1xuXHRcdFx0Ly8gY29uc29sZS5sb2cgJ2F0OicsIGFjY2Vzc1Rva2VuXG5cblx0XHRcdGxldCBpZGVudGl0eSA9IHNlbGYuZ2V0SWRlbnRpdHkoYWNjZXNzVG9rZW4pO1xuXG5cdFx0XHRpZiAoaWRlbnRpdHkpIHtcblx0XHRcdFx0Ly8gU2V0ICdpZCcgdG8gJ19pZCcgZm9yIGFueSBzb3VyY2VzIHRoYXQgcHJvdmlkZSBpdFxuXHRcdFx0XHRpZiAoaWRlbnRpdHkuX2lkICYmICFpZGVudGl0eS5pZCkge1xuXHRcdFx0XHRcdGlkZW50aXR5LmlkID0gaWRlbnRpdHkuX2lkO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRml4IGZvciBSZWRkaXRcblx0XHRcdFx0aWYgKGlkZW50aXR5LnJlc3VsdCkge1xuXHRcdFx0XHRcdGlkZW50aXR5ID0gaWRlbnRpdHkucmVzdWx0O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRml4IFdvcmRQcmVzcy1saWtlIGlkZW50aXRpZXMgaGF2aW5nICdJRCcgaW5zdGVhZCBvZiAnaWQnXG5cdFx0XHRcdGlmIChpZGVudGl0eS5JRCAmJiAhaWRlbnRpdHkuaWQpIHtcblx0XHRcdFx0XHRpZGVudGl0eS5pZCA9IGlkZW50aXR5LklEO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRml4IEF1dGgwLWxpa2UgaWRlbnRpdGllcyBoYXZpbmcgJ3VzZXJfaWQnIGluc3RlYWQgb2YgJ2lkJ1xuXHRcdFx0XHRpZiAoaWRlbnRpdHkudXNlcl9pZCAmJiAhaWRlbnRpdHkuaWQpIHtcblx0XHRcdFx0XHRpZGVudGl0eS5pZCA9IGlkZW50aXR5LnVzZXJfaWQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoaWRlbnRpdHkuQ2hhcmFjdGVySUQgJiYgIWlkZW50aXR5LmlkKSB7XG5cdFx0XHRcdFx0aWRlbnRpdHkuaWQgPSBpZGVudGl0eS5DaGFyYWN0ZXJJRDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEZpeCBEYXRhcG9ydGVuIGhhdmluZyAndXNlci51c2VyaWQnIGluc3RlYWQgb2YgJ2lkJ1xuXHRcdFx0XHRpZiAoaWRlbnRpdHkudXNlciAmJiBpZGVudGl0eS51c2VyLnVzZXJpZCAmJiAhaWRlbnRpdHkuaWQpIHtcblx0XHRcdFx0XHRpZiAoaWRlbnRpdHkudXNlci51c2VyaWRfc2VjICYmIGlkZW50aXR5LnVzZXIudXNlcmlkX3NlY1swXSkge1xuXHRcdFx0XHRcdFx0aWRlbnRpdHkuaWQgPSBpZGVudGl0eS51c2VyLnVzZXJpZF9zZWNbMF07XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGlkZW50aXR5LmlkID0gaWRlbnRpdHkudXNlci51c2VyaWQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlkZW50aXR5LmVtYWlsID0gaWRlbnRpdHkudXNlci5lbWFpbDtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBGaXggZm9yIFhlbmZvcm8gW0JEXUFQSSBwbHVnaW4gZm9yICd1c2VyLnVzZXJfaWQ7IGluc3RlYWQgb2YgJ2lkJ1xuXHRcdFx0XHRpZiAoaWRlbnRpdHkudXNlciAmJiBpZGVudGl0eS51c2VyLnVzZXJfaWQgJiYgIWlkZW50aXR5LmlkKSB7XG5cdFx0XHRcdFx0aWRlbnRpdHkuaWQgPSBpZGVudGl0eS51c2VyLnVzZXJfaWQ7XG5cdFx0XHRcdFx0aWRlbnRpdHkuZW1haWwgPSBpZGVudGl0eS51c2VyLnVzZXJfZW1haWw7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gRml4IGdlbmVyYWwgJ3BoaWQnIGluc3RlYWQgb2YgJ2lkJyBmcm9tIHBoYWJyaWNhdG9yXG5cdFx0XHRcdGlmIChpZGVudGl0eS5waGlkICYmICFpZGVudGl0eS5pZCkge1xuXHRcdFx0XHRcdGlkZW50aXR5LmlkID0gaWRlbnRpdHkucGhpZDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEZpeCBLZXljbG9hay1saWtlIGlkZW50aXRpZXMgaGF2aW5nICdzdWInIGluc3RlYWQgb2YgJ2lkJ1xuXHRcdFx0XHRpZiAoaWRlbnRpdHkuc3ViICYmICFpZGVudGl0eS5pZCkge1xuXHRcdFx0XHRcdGlkZW50aXR5LmlkID0gaWRlbnRpdHkuc3ViO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRml4IGdlbmVyYWwgJ3VzZXJpZCcgaW5zdGVhZCBvZiAnaWQnIGZyb20gcHJvdmlkZXJcblx0XHRcdFx0aWYgKGlkZW50aXR5LnVzZXJpZCAmJiAhaWRlbnRpdHkuaWQpIHtcblx0XHRcdFx0XHRpZGVudGl0eS5pZCA9IGlkZW50aXR5LnVzZXJpZDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEZpeCBOZXh0Y2xvdWQgcHJvdmlkZXJcblx0XHRcdFx0aWYgKCFpZGVudGl0eS5pZCAmJiBpZGVudGl0eS5vY3MgJiYgaWRlbnRpdHkub2NzLmRhdGEgJiYgaWRlbnRpdHkub2NzLmRhdGEuaWQpIHtcblx0XHRcdFx0XHRpZGVudGl0eS5pZCA9IGlkZW50aXR5Lm9jcy5kYXRhLmlkO1xuXHRcdFx0XHRcdGlkZW50aXR5Lm5hbWUgPSBpZGVudGl0eS5vY3MuZGF0YS5kaXNwbGF5bmFtZTtcblx0XHRcdFx0XHRpZGVudGl0eS5lbWFpbCA9IGlkZW50aXR5Lm9jcy5kYXRhLmVtYWlsO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRml4IHdoZW4gYXV0aGVudGljYXRpbmcgZnJvbSBhIG1ldGVvciBhcHAgd2l0aCAnZW1haWxzJyBmaWVsZFxuXHRcdFx0XHRpZiAoIWlkZW50aXR5LmVtYWlsICYmIChpZGVudGl0eS5lbWFpbHMgJiYgQXJyYXkuaXNBcnJheShpZGVudGl0eS5lbWFpbHMpICYmIGlkZW50aXR5LmVtYWlscy5sZW5ndGggPj0gMSkpIHtcblx0XHRcdFx0XHRpZGVudGl0eS5lbWFpbCA9IGlkZW50aXR5LmVtYWlsc1swXS5hZGRyZXNzID8gaWRlbnRpdHkuZW1haWxzWzBdLmFkZHJlc3MgOiB1bmRlZmluZWQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gY29uc29sZS5sb2cgJ2lkOicsIEpTT04uc3RyaW5naWZ5IGlkZW50aXR5LCBudWxsLCAnICAnXG5cblx0XHRcdGNvbnN0IHNlcnZpY2VEYXRhID0ge1xuXHRcdFx0XHRfT0F1dGhDdXN0b206IHRydWUsXG5cdFx0XHRcdGFjY2Vzc1Rva2VuLFxuXHRcdFx0fTtcblxuXHRcdFx0Xy5leHRlbmQoc2VydmljZURhdGEsIGlkZW50aXR5KTtcblxuXHRcdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdFx0c2VydmljZURhdGEsXG5cdFx0XHRcdG9wdGlvbnM6IHtcblx0XHRcdFx0XHRwcm9maWxlOiB7XG5cdFx0XHRcdFx0XHRuYW1lOiBpZGVudGl0eS5uYW1lIHx8IGlkZW50aXR5LnVzZXJuYW1lIHx8IGlkZW50aXR5Lm5pY2tuYW1lIHx8IGlkZW50aXR5LkNoYXJhY3Rlck5hbWUgfHwgaWRlbnRpdHkudXNlck5hbWUgfHwgaWRlbnRpdHkucHJlZmVycmVkX3VzZXJuYW1lIHx8IChpZGVudGl0eS51c2VyICYmIGlkZW50aXR5LnVzZXIubmFtZSksXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSxcblx0XHRcdH07XG5cblx0XHRcdC8vIGNvbnNvbGUubG9nIGRhdGFcblxuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSk7XG5cdH1cblxuXHRyZXRyaWV2ZUNyZWRlbnRpYWwoY3JlZGVudGlhbFRva2VuLCBjcmVkZW50aWFsU2VjcmV0KSB7XG5cdFx0cmV0dXJuIE9BdXRoLnJldHJpZXZlQ3JlZGVudGlhbChjcmVkZW50aWFsVG9rZW4sIGNyZWRlbnRpYWxTZWNyZXQpO1xuXHR9XG5cblx0Z2V0VXNlcm5hbWUoZGF0YSkge1xuXHRcdGxldCB1c2VybmFtZSA9ICcnO1xuXG5cdFx0dXNlcm5hbWUgPSB0aGlzLnVzZXJuYW1lRmllbGQuc3BsaXQoJy4nKS5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3Vycikge1xuXHRcdFx0cmV0dXJuIHByZXYgPyBwcmV2W2N1cnJdIDogdW5kZWZpbmVkO1xuXHRcdH0sIGRhdGEpO1xuXHRcdGlmICghdXNlcm5hbWUpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ZpZWxkX25vdF9mb3VuZCcsIGBVc2VybmFtZSBmaWVsZCBcIiR7IHRoaXMudXNlcm5hbWVGaWVsZCB9XCIgbm90IGZvdW5kIGluIGRhdGFgLCBkYXRhKTtcblx0XHR9XG5cdFx0cmV0dXJuIHVzZXJuYW1lO1xuXHR9XG5cblx0YWRkSG9va1RvUHJvY2Vzc1VzZXIoKSB7XG5cdFx0QmVmb3JlVXBkYXRlT3JDcmVhdGVVc2VyRnJvbUV4dGVybmFsU2VydmljZS5wdXNoKChzZXJ2aWNlTmFtZSwgc2VydmljZURhdGEvKiAsIG9wdGlvbnMqLykgPT4ge1xuXHRcdFx0aWYgKHNlcnZpY2VOYW1lICE9PSB0aGlzLm5hbWUpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy51c2VybmFtZUZpZWxkKSB7XG5cdFx0XHRcdGNvbnN0IHVzZXJuYW1lID0gdGhpcy5nZXRVc2VybmFtZShzZXJ2aWNlRGF0YSk7XG5cblx0XHRcdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeVVzZXJuYW1lKHVzZXJuYW1lKTtcblx0XHRcdFx0aWYgKCF1c2VyKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gVXNlciBhbHJlYWR5IGNyZWF0ZWQgb3IgbWVyZ2VkXG5cdFx0XHRcdGlmICh1c2VyLnNlcnZpY2VzICYmIHVzZXIuc2VydmljZXNbc2VydmljZU5hbWVdICYmIHVzZXIuc2VydmljZXNbc2VydmljZU5hbWVdLmlkID09PSBzZXJ2aWNlRGF0YS5pZCkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICh0aGlzLm1lcmdlVXNlcnMgIT09IHRydWUpIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdDdXN0b21PQXV0aCcsIGBVc2VyIHdpdGggdXNlcm5hbWUgJHsgdXNlci51c2VybmFtZSB9IGFscmVhZHkgZXhpc3RzYCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBzZXJ2aWNlSWRLZXkgPSBgc2VydmljZXMuJHsgc2VydmljZU5hbWUgfS5pZGA7XG5cdFx0XHRcdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHRcdFx0XHQkc2V0OiB7XG5cdFx0XHRcdFx0XHRbc2VydmljZUlkS2V5XTogc2VydmljZURhdGEuaWQsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy51cGRhdGUoeyBfaWQ6IHVzZXIuX2lkIH0sIHVwZGF0ZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRBY2NvdW50cy52YWxpZGF0ZU5ld1VzZXIoKHVzZXIpID0+IHtcblx0XHRcdGlmICghdXNlci5zZXJ2aWNlcyB8fCAhdXNlci5zZXJ2aWNlc1t0aGlzLm5hbWVdIHx8ICF1c2VyLnNlcnZpY2VzW3RoaXMubmFtZV0uaWQpIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLnVzZXJuYW1lRmllbGQpIHtcblx0XHRcdFx0dXNlci51c2VybmFtZSA9IHRoaXMuZ2V0VXNlcm5hbWUodXNlci5zZXJ2aWNlc1t0aGlzLm5hbWVdKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSk7XG5cblx0fVxufVxuXG5cbmNvbnN0IHsgdXBkYXRlT3JDcmVhdGVVc2VyRnJvbUV4dGVybmFsU2VydmljZSB9ID0gQWNjb3VudHM7XG5BY2NvdW50cy51cGRhdGVPckNyZWF0ZVVzZXJGcm9tRXh0ZXJuYWxTZXJ2aWNlID0gZnVuY3Rpb24oLi4uYXJncyAvKiBzZXJ2aWNlTmFtZSwgc2VydmljZURhdGEsIG9wdGlvbnMqLykge1xuXHRmb3IgKGNvbnN0IGhvb2sgb2YgQmVmb3JlVXBkYXRlT3JDcmVhdGVVc2VyRnJvbUV4dGVybmFsU2VydmljZSkge1xuXHRcdGhvb2suYXBwbHkodGhpcywgYXJncyk7XG5cdH1cblxuXHRyZXR1cm4gdXBkYXRlT3JDcmVhdGVVc2VyRnJvbUV4dGVybmFsU2VydmljZS5hcHBseSh0aGlzLCBhcmdzKTtcbn07XG4iXX0=
