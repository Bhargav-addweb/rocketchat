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
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var OAuth2Server = Package['rocketchat:oauth2-server'].OAuth2Server;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:oauth2-server-config":{"server":{"models":{"OAuthApps.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/rocketchat_oauth2-server-config/server/models/OAuthApps.js                                        //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
RocketChat.models.OAuthApps = new class extends RocketChat.models._Base {
  constructor() {
    super('oauth_apps');
  }

}(); // FIND
// findByRole: (role, options) ->
// 	query =
// 	roles: role
// 	return @find query, options
// CREATE
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"oauth":{"server":{"oauth2-server.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/rocketchat_oauth2-server-config/oauth/server/oauth2-server.js                                     //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
/* global OAuth2Server */
const oauth2server = new OAuth2Server({
  accessTokensCollectionName: 'rocketchat_oauth_access_tokens',
  refreshTokensCollectionName: 'rocketchat_oauth_refresh_tokens',
  authCodesCollectionName: 'rocketchat_oauth_auth_codes',
  clientsCollection: RocketChat.models.OAuthApps.model,
  debug: true
});
WebApp.connectHandlers.use(oauth2server.app);
oauth2server.routes.get('/oauth/userinfo', function (req, res) {
  if (req.headers.authorization == null) {
    return res.sendStatus(401).send('No token');
  }

  const accessToken = req.headers.authorization.replace('Bearer ', '');
  const token = oauth2server.oauth.model.AccessTokens.findOne({
    accessToken
  });

  if (token == null) {
    return res.sendStatus(401).send('Invalid Token');
  }

  const user = RocketChat.models.Users.findOneById(token.userId);

  if (user == null) {
    return res.sendStatus(401).send('Invalid Token');
  }

  return res.send({
    sub: user._id,
    name: user.name,
    email: user.emails[0].address,
    email_verified: user.emails[0].verified,
    department: '',
    birthdate: '',
    preffered_username: user.username,
    updated_at: user._updatedAt,
    picture: `${Meteor.absoluteUrl()}avatar/${user.username}`
  });
});
Meteor.publish('oauthClient', function (clientId) {
  if (!this.userId) {
    return this.ready();
  }

  return RocketChat.models.OAuthApps.find({
    clientId,
    active: true
  }, {
    fields: {
      name: 1
    }
  });
});
RocketChat.API.v1.addAuthMethod(function () {
  let headerToken = this.request.headers.authorization;
  const getToken = this.request.query.access_token;

  if (headerToken != null) {
    const matches = headerToken.match(/Bearer\s(\S+)/);

    if (matches) {
      headerToken = matches[1];
    } else {
      headerToken = undefined;
    }
  }

  const bearerToken = headerToken || getToken;

  if (bearerToken == null) {
    return;
  }

  const getAccessToken = Meteor.wrapAsync(oauth2server.oauth.model.getAccessToken, oauth2server.oauth.model);
  const accessToken = getAccessToken(bearerToken);

  if (accessToken == null) {
    return;
  }

  if (accessToken.expires != null && accessToken.expires !== 0 && accessToken.expires < new Date()) {
    return;
  }

  const user = RocketChat.models.Users.findOne(accessToken.userId);

  if (user == null) {
    return;
  }

  return {
    user
  };
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"default-services.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/rocketchat_oauth2-server-config/oauth/server/default-services.js                                  //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
if (!RocketChat.models.OAuthApps.findOne('zapier')) {
  RocketChat.models.OAuthApps.insert({
    _id: 'zapier',
    name: 'Zapier',
    active: true,
    clientId: 'zapier',
    clientSecret: 'RTK6TlndaCIolhQhZ7_KHIGOKj41RnlaOq_o-7JKwLr',
    redirectUri: 'https://zapier.com/dashboard/auth/oauth/return/RocketChatDevAPI/',
    _createdAt: new Date(),
    _createdBy: {
      _id: 'system',
      username: 'system'
    }
  });
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"admin":{"server":{"publications":{"oauthApps.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/rocketchat_oauth2-server-config/admin/server/publications/oauthApps.js                            //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
Meteor.publish('oauthApps', function () {
  if (!this.userId) {
    return this.ready();
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'manage-oauth-apps')) {
    this.error(Meteor.Error('error-not-allowed', 'Not allowed', {
      publish: 'oauthApps'
    }));
  }

  return RocketChat.models.OAuthApps.find();
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"addOAuthApp.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/rocketchat_oauth2-server-config/admin/server/methods/addOAuthApp.js                               //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.methods({
  addOAuthApp(application) {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-oauth-apps')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'addOAuthApp'
      });
    }

    if (!_.isString(application.name) || application.name.trim() === '') {
      throw new Meteor.Error('error-invalid-name', 'Invalid name', {
        method: 'addOAuthApp'
      });
    }

    if (!_.isString(application.redirectUri) || application.redirectUri.trim() === '') {
      throw new Meteor.Error('error-invalid-redirectUri', 'Invalid redirectUri', {
        method: 'addOAuthApp'
      });
    }

    if (!_.isBoolean(application.active)) {
      throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', {
        method: 'addOAuthApp'
      });
    }

    application.clientId = Random.id();
    application.clientSecret = Random.secret();
    application._createdAt = new Date();
    application._createdBy = RocketChat.models.Users.findOne(this.userId, {
      fields: {
        username: 1
      }
    });
    application._id = RocketChat.models.OAuthApps.insert(application);
    return application;
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"updateOAuthApp.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/rocketchat_oauth2-server-config/admin/server/methods/updateOAuthApp.js                            //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.methods({
  updateOAuthApp(applicationId, application) {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-oauth-apps')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'updateOAuthApp'
      });
    }

    if (!_.isString(application.name) || application.name.trim() === '') {
      throw new Meteor.Error('error-invalid-name', 'Invalid name', {
        method: 'updateOAuthApp'
      });
    }

    if (!_.isString(application.redirectUri) || application.redirectUri.trim() === '') {
      throw new Meteor.Error('error-invalid-redirectUri', 'Invalid redirectUri', {
        method: 'updateOAuthApp'
      });
    }

    if (!_.isBoolean(application.active)) {
      throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', {
        method: 'updateOAuthApp'
      });
    }

    const currentApplication = RocketChat.models.OAuthApps.findOne(applicationId);

    if (currentApplication == null) {
      throw new Meteor.Error('error-application-not-found', 'Application not found', {
        method: 'updateOAuthApp'
      });
    }

    RocketChat.models.OAuthApps.update(applicationId, {
      $set: {
        name: application.name,
        active: application.active,
        redirectUri: application.redirectUri,
        _updatedAt: new Date(),
        _updatedBy: RocketChat.models.Users.findOne(this.userId, {
          fields: {
            username: 1
          }
        })
      }
    });
    return RocketChat.models.OAuthApps.findOne(applicationId);
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deleteOAuthApp.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/rocketchat_oauth2-server-config/admin/server/methods/deleteOAuthApp.js                            //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
Meteor.methods({
  deleteOAuthApp(applicationId) {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-oauth-apps')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'deleteOAuthApp'
      });
    }

    const application = RocketChat.models.OAuthApps.findOne(applicationId);

    if (application == null) {
      throw new Meteor.Error('error-application-not-found', 'Application not found', {
        method: 'deleteOAuthApp'
      });
    }

    RocketChat.models.OAuthApps.remove({
      _id: applicationId
    });
    return true;
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:oauth2-server-config/server/models/OAuthApps.js");
require("/node_modules/meteor/rocketchat:oauth2-server-config/oauth/server/oauth2-server.js");
require("/node_modules/meteor/rocketchat:oauth2-server-config/oauth/server/default-services.js");
require("/node_modules/meteor/rocketchat:oauth2-server-config/admin/server/publications/oauthApps.js");
require("/node_modules/meteor/rocketchat:oauth2-server-config/admin/server/methods/addOAuthApp.js");
require("/node_modules/meteor/rocketchat:oauth2-server-config/admin/server/methods/updateOAuthApp.js");
require("/node_modules/meteor/rocketchat:oauth2-server-config/admin/server/methods/deleteOAuthApp.js");

/* Exports */
Package._define("rocketchat:oauth2-server-config");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_oauth2-server-config.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpvYXV0aDItc2VydmVyLWNvbmZpZy9zZXJ2ZXIvbW9kZWxzL09BdXRoQXBwcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpvYXV0aDItc2VydmVyLWNvbmZpZy9vYXV0aC9zZXJ2ZXIvb2F1dGgyLXNlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpvYXV0aDItc2VydmVyLWNvbmZpZy9vYXV0aC9zZXJ2ZXIvZGVmYXVsdC1zZXJ2aWNlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpvYXV0aDItc2VydmVyLWNvbmZpZy9hZG1pbi9zZXJ2ZXIvcHVibGljYXRpb25zL29hdXRoQXBwcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpvYXV0aDItc2VydmVyLWNvbmZpZy9hZG1pbi9zZXJ2ZXIvbWV0aG9kcy9hZGRPQXV0aEFwcC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpvYXV0aDItc2VydmVyLWNvbmZpZy9hZG1pbi9zZXJ2ZXIvbWV0aG9kcy91cGRhdGVPQXV0aEFwcC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpvYXV0aDItc2VydmVyLWNvbmZpZy9hZG1pbi9zZXJ2ZXIvbWV0aG9kcy9kZWxldGVPQXV0aEFwcC5qcyJdLCJuYW1lcyI6WyJSb2NrZXRDaGF0IiwibW9kZWxzIiwiT0F1dGhBcHBzIiwiX0Jhc2UiLCJjb25zdHJ1Y3RvciIsIm9hdXRoMnNlcnZlciIsIk9BdXRoMlNlcnZlciIsImFjY2Vzc1Rva2Vuc0NvbGxlY3Rpb25OYW1lIiwicmVmcmVzaFRva2Vuc0NvbGxlY3Rpb25OYW1lIiwiYXV0aENvZGVzQ29sbGVjdGlvbk5hbWUiLCJjbGllbnRzQ29sbGVjdGlvbiIsIm1vZGVsIiwiZGVidWciLCJXZWJBcHAiLCJjb25uZWN0SGFuZGxlcnMiLCJ1c2UiLCJhcHAiLCJyb3V0ZXMiLCJnZXQiLCJyZXEiLCJyZXMiLCJoZWFkZXJzIiwiYXV0aG9yaXphdGlvbiIsInNlbmRTdGF0dXMiLCJzZW5kIiwiYWNjZXNzVG9rZW4iLCJyZXBsYWNlIiwidG9rZW4iLCJvYXV0aCIsIkFjY2Vzc1Rva2VucyIsImZpbmRPbmUiLCJ1c2VyIiwiVXNlcnMiLCJmaW5kT25lQnlJZCIsInVzZXJJZCIsInN1YiIsIl9pZCIsIm5hbWUiLCJlbWFpbCIsImVtYWlscyIsImFkZHJlc3MiLCJlbWFpbF92ZXJpZmllZCIsInZlcmlmaWVkIiwiZGVwYXJ0bWVudCIsImJpcnRoZGF0ZSIsInByZWZmZXJlZF91c2VybmFtZSIsInVzZXJuYW1lIiwidXBkYXRlZF9hdCIsIl91cGRhdGVkQXQiLCJwaWN0dXJlIiwiTWV0ZW9yIiwiYWJzb2x1dGVVcmwiLCJwdWJsaXNoIiwiY2xpZW50SWQiLCJyZWFkeSIsImZpbmQiLCJhY3RpdmUiLCJmaWVsZHMiLCJBUEkiLCJ2MSIsImFkZEF1dGhNZXRob2QiLCJoZWFkZXJUb2tlbiIsInJlcXVlc3QiLCJnZXRUb2tlbiIsInF1ZXJ5IiwiYWNjZXNzX3Rva2VuIiwibWF0Y2hlcyIsIm1hdGNoIiwidW5kZWZpbmVkIiwiYmVhcmVyVG9rZW4iLCJnZXRBY2Nlc3NUb2tlbiIsIndyYXBBc3luYyIsImV4cGlyZXMiLCJEYXRlIiwiaW5zZXJ0IiwiY2xpZW50U2VjcmV0IiwicmVkaXJlY3RVcmkiLCJfY3JlYXRlZEF0IiwiX2NyZWF0ZWRCeSIsImF1dGh6IiwiaGFzUGVybWlzc2lvbiIsImVycm9yIiwiRXJyb3IiLCJfIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJtZXRob2RzIiwiYWRkT0F1dGhBcHAiLCJhcHBsaWNhdGlvbiIsIm1ldGhvZCIsImlzU3RyaW5nIiwidHJpbSIsImlzQm9vbGVhbiIsIlJhbmRvbSIsImlkIiwic2VjcmV0IiwidXBkYXRlT0F1dGhBcHAiLCJhcHBsaWNhdGlvbklkIiwiY3VycmVudEFwcGxpY2F0aW9uIiwidXBkYXRlIiwiJHNldCIsIl91cGRhdGVkQnkiLCJkZWxldGVPQXV0aEFwcCIsInJlbW92ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxXQUFXQyxNQUFYLENBQWtCQyxTQUFsQixHQUE4QixJQUFJLGNBQWNGLFdBQVdDLE1BQVgsQ0FBa0JFLEtBQWhDLENBQXNDO0FBQ3ZFQyxnQkFBYztBQUNiLFVBQU0sWUFBTjtBQUNBOztBQUhzRSxDQUExQyxFQUE5QixDLENBT0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUVBLFM7Ozs7Ozs7Ozs7O0FDZEE7QUFFQSxNQUFNQyxlQUFlLElBQUlDLFlBQUosQ0FBaUI7QUFDckNDLDhCQUE0QixnQ0FEUztBQUVyQ0MsK0JBQTZCLGlDQUZRO0FBR3JDQywyQkFBeUIsNkJBSFk7QUFJckNDLHFCQUFtQlYsV0FBV0MsTUFBWCxDQUFrQkMsU0FBbEIsQ0FBNEJTLEtBSlY7QUFLckNDLFNBQU87QUFMOEIsQ0FBakIsQ0FBckI7QUFRQUMsT0FBT0MsZUFBUCxDQUF1QkMsR0FBdkIsQ0FBMkJWLGFBQWFXLEdBQXhDO0FBRUFYLGFBQWFZLE1BQWIsQ0FBb0JDLEdBQXBCLENBQXdCLGlCQUF4QixFQUEyQyxVQUFTQyxHQUFULEVBQWNDLEdBQWQsRUFBbUI7QUFDN0QsTUFBSUQsSUFBSUUsT0FBSixDQUFZQyxhQUFaLElBQTZCLElBQWpDLEVBQXVDO0FBQ3RDLFdBQU9GLElBQUlHLFVBQUosQ0FBZSxHQUFmLEVBQW9CQyxJQUFwQixDQUF5QixVQUF6QixDQUFQO0FBQ0E7O0FBQ0QsUUFBTUMsY0FBY04sSUFBSUUsT0FBSixDQUFZQyxhQUFaLENBQTBCSSxPQUExQixDQUFrQyxTQUFsQyxFQUE2QyxFQUE3QyxDQUFwQjtBQUNBLFFBQU1DLFFBQVF0QixhQUFhdUIsS0FBYixDQUFtQmpCLEtBQW5CLENBQXlCa0IsWUFBekIsQ0FBc0NDLE9BQXRDLENBQThDO0FBQzNE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QixRQUFJLENBQUNwRyxXQUFXK0UsS0FBWCxDQUFpQkMsYUFBakIsQ0FBK0IsS0FBSzlDLE1BQXBDLEVBQTRDLG1CQUE1QyxDQUFMLEVBQXVFO0FBQ3RFLFlBQU0sSUFBSWdCLE9BQU9nQyxLQUFYLENBQWlCLG1CQUFqQixFQUFzQyxhQUF0QyxFQUFxRDtBQUFFVSxnQkFBUTtBQUFWLE9BQXJELENBQU47QUFDQTs7QUFDRCxVQUFNRCxjQUFjM0YsV0FBV0MsTUFBWCxDQUFrQkMsU0FBbEIsQ0FBNEI0QixPQUE1QixDQUFvQ3NFLGFBQXBDLENBQXBCOztBQUNBLFFBQUlULGVBQWUsSUFBbkIsRUFBeUI7QUFDeEIsWUFBTSxJQUFJekMsT0FBT2dDLEtBQVgsQ0FBaUIsNkJBQWpCLEVBQWdELHVCQUFoRCxFQUF5RTtBQUFFVSxnQkFBUTtBQUFWLE9BQXpFLENBQU47QUFDQTs7QUFDRDVGLGVBQVdDLE1BQVgsQ0FBa0JDLFNBQWxCLENBQTRCd0csTUFBNUIsQ0FBbUM7QUFBRXRFLFdBQUtnRTtBQUFQLEtBQW5DO0FBQ0EsV0FBTyxJQUFQO0FBQ0E7O0FBWGEsQ0FBZixFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X29hdXRoMi1zZXJ2ZXItY29uZmlnLmpzIiwic291cmNlc0NvbnRlbnQiOlsiUm9ja2V0Q2hhdC5tb2RlbHMuT0F1dGhBcHBzID0gbmV3IGNsYXNzIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignb2F1dGhfYXBwcycpO1xuXHR9XG59O1xuXG5cbi8vIEZJTkRcbi8vIGZpbmRCeVJvbGU6IChyb2xlLCBvcHRpb25zKSAtPlxuLy8gXHRxdWVyeSA9XG4vLyBcdHJvbGVzOiByb2xlXG5cbi8vIFx0cmV0dXJuIEBmaW5kIHF1ZXJ5LCBvcHRpb25zXG5cbi8vIENSRUFURVxuIiwiLyogZ2xvYmFsIE9BdXRoMlNlcnZlciAqL1xuXG5jb25zdCBvYXV0aDJzZXJ2ZXIgPSBuZXcgT0F1dGgyU2VydmVyKHtcblx0YWNjZXNzVG9rZW5zQ29sbGVjdGlvbk5hbWU6ICdyb2NrZXRjaGF0X29hdXRoX2FjY2Vzc190b2tlbnMnLFxuXHRyZWZyZXNoVG9rZW5zQ29sbGVjdGlvbk5hbWU6ICdyb2NrZXRjaGF0X29hdXRoX3JlZnJlc2hfdG9rZW5zJyxcblx0YXV0aENvZGVzQ29sbGVjdGlvbk5hbWU6ICdyb2NrZXRjaGF0X29hdXRoX2F1dGhfY29kZXMnLFxuXHRjbGllbnRzQ29sbGVjdGlvbjogUm9ja2V0Q2hhdC5tb2RlbHMuT0F1dGhBcHBzLm1vZGVsLFxuXHRkZWJ1ZzogdHJ1ZSxcbn0pO1xuXG5XZWJBcHAuY29ubmVjdEhhbmRsZXJzLnVzZShvYXV0aDJzZXJ2ZXIuYXBwKTtcblxub2F1dGgyc2VydmVyLnJvdXRlcy5nZXQoJy9vYXV0aC91c2VyaW5mbycsIGZ1bmN0aW9uKHJlcSwgcmVzKSB7XG5cdGlmIChyZXEuaGVhZGVycy5hdXRob3JpemF0aW9uID09IG51bGwpIHtcblx0XHRyZXR1cm4gcmVzLnNlbmRTdGF0dXMoNDAxKS5zZW5kKCdObyB0b2tlbicpO1xuXHR9XG5cdGNvbnN0IGFjY2Vzc1Rva2VuID0gcmVxLmhlYWRlcnMuYXV0aG9yaXphdGlvbi5yZXBsYWNlKCdCZWFyZXIgJywgJycpO1xuXHRjb25zdCB0b2tlbiA9IG9hdXRoMnNlcnZlci5vYXV0aC5tb2RlbC5BY2Nlc3NUb2tlbnMuZmluZE9uZSh7XG5cdFx0YWNjZXNzVG9rZW4sXG5cdH0pO1xuXHRpZiAodG9rZW4gPT0gbnVsbCkge1xuXHRcdHJldHVybiByZXMuc2VuZFN0YXR1cyg0MDEpLnNlbmQoJ0ludmFsaWQgVG9rZW4nKTtcblx0fVxuXHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodG9rZW4udXNlcklkKTtcblx0aWYgKHVzZXIgPT0gbnVsbCkge1xuXHRcdHJldHVybiByZXMuc2VuZFN0YXR1cyg0MDEpLnNlbmQoJ0ludmFsaWQgVG9rZW4nKTtcblx0fVxuXHRyZXR1cm4gcmVzLnNlbmQoe1xuXHRcdHN1YjogdXNlci5faWQsXG5cdFx0bmFtZTogdXNlci5uYW1lLFxuXHRcdGVtYWlsOiB1c2VyLmVtYWlsc1swXS5hZGRyZXNzLFxuXHRcdGVtYWlsX3ZlcmlmaWVkOiB1c2VyLmVtYWlsc1swXS52ZXJpZmllZCxcblx0XHRkZXBhcnRtZW50OiAnJyxcblx0XHRiaXJ0aGRhdGU6ICcnLFxuXHRcdHByZWZmZXJlZF91c2VybmFtZTogdXNlci51c2VybmFtZSxcblx0XHR1cGRhdGVkX2F0OiB1c2VyLl91cGRhdGVkQXQsXG5cdFx0cGljdHVyZTogYCR7IE1ldGVvci5hYnNvbHV0ZVVybCgpIH1hdmF0YXIvJHsgdXNlci51c2VybmFtZSB9YCxcblx0fSk7XG59KTtcblxuTWV0ZW9yLnB1Ymxpc2goJ29hdXRoQ2xpZW50JywgZnVuY3Rpb24oY2xpZW50SWQpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLnJlYWR5KCk7XG5cdH1cblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLk9BdXRoQXBwcy5maW5kKHtcblx0XHRjbGllbnRJZCxcblx0XHRhY3RpdmU6IHRydWUsXG5cdH0sIHtcblx0XHRmaWVsZHM6IHtcblx0XHRcdG5hbWU6IDEsXG5cdFx0fSxcblx0fSk7XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkQXV0aE1ldGhvZChmdW5jdGlvbigpIHtcblx0bGV0IGhlYWRlclRva2VuID0gdGhpcy5yZXF1ZXN0LmhlYWRlcnMuYXV0aG9yaXphdGlvbjtcblx0Y29uc3QgZ2V0VG9rZW4gPSB0aGlzLnJlcXVlc3QucXVlcnkuYWNjZXNzX3Rva2VuO1xuXHRpZiAoaGVhZGVyVG9rZW4gIT0gbnVsbCkge1xuXHRcdGNvbnN0IG1hdGNoZXMgPSBoZWFkZXJUb2tlbi5tYXRjaCgvQmVhcmVyXFxzKFxcUyspLyk7XG5cdFx0aWYgKG1hdGNoZXMpIHtcblx0XHRcdGhlYWRlclRva2VuID0gbWF0Y2hlc1sxXTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aGVhZGVyVG9rZW4gPSB1bmRlZmluZWQ7XG5cdFx0fVxuXHR9XG5cdGNvbnN0IGJlYXJlclRva2VuID0gaGVhZGVyVG9rZW4gfHwgZ2V0VG9rZW47XG5cdGlmIChiZWFyZXJUb2tlbiA9PSBudWxsKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGNvbnN0IGdldEFjY2Vzc1Rva2VuID0gTWV0ZW9yLndyYXBBc3luYyhvYXV0aDJzZXJ2ZXIub2F1dGgubW9kZWwuZ2V0QWNjZXNzVG9rZW4sIG9hdXRoMnNlcnZlci5vYXV0aC5tb2RlbCk7XG5cdGNvbnN0IGFjY2Vzc1Rva2VuID0gZ2V0QWNjZXNzVG9rZW4oYmVhcmVyVG9rZW4pO1xuXHRpZiAoYWNjZXNzVG9rZW4gPT0gbnVsbCkge1xuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoKGFjY2Vzc1Rva2VuLmV4cGlyZXMgIT0gbnVsbCkgJiYgYWNjZXNzVG9rZW4uZXhwaXJlcyAhPT0gMCAmJiBhY2Nlc3NUb2tlbi5leHBpcmVzIDwgbmV3IERhdGUoKSkge1xuXHRcdHJldHVybjtcblx0fVxuXHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZShhY2Nlc3NUb2tlbi51c2VySWQpO1xuXHRpZiAodXNlciA9PSBudWxsKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHJldHVybiB7IHVzZXIgfTtcbn0pO1xuIiwiaWYgKCFSb2NrZXRDaGF0Lm1vZGVscy5PQXV0aEFwcHMuZmluZE9uZSgnemFwaWVyJykpIHtcblx0Um9ja2V0Q2hhdC5tb2RlbHMuT0F1dGhBcHBzLmluc2VydCh7XG5cdFx0X2lkOiAnemFwaWVyJyxcblx0XHRuYW1lOiAnWmFwaWVyJyxcblx0XHRhY3RpdmU6IHRydWUsXG5cdFx0Y2xpZW50SWQ6ICd6YXBpZXInLFxuXHRcdGNsaWVudFNlY3JldDogJ1JUSzZUbG5kYUNJb2xoUWhaN19LSElHT0tqNDFSbmxhT3Ffby03Skt3THInLFxuXHRcdHJlZGlyZWN0VXJpOiAnaHR0cHM6Ly96YXBpZXIuY29tL2Rhc2hib2FyZC9hdXRoL29hdXRoL3JldHVybi9Sb2NrZXRDaGF0RGV2QVBJLycsXG5cdFx0X2NyZWF0ZWRBdDogbmV3IERhdGUsXG5cdFx0X2NyZWF0ZWRCeToge1xuXHRcdFx0X2lkOiAnc3lzdGVtJyxcblx0XHRcdHVzZXJuYW1lOiAnc3lzdGVtJyxcblx0XHR9LFxuXHR9KTtcbn1cbiIsIk1ldGVvci5wdWJsaXNoKCdvYXV0aEFwcHMnLCBmdW5jdGlvbigpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLnJlYWR5KCk7XG5cdH1cblx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2Utb2F1dGgtYXBwcycpKSB7XG5cdFx0dGhpcy5lcnJvcihNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBwdWJsaXNoOiAnb2F1dGhBcHBzJyB9KSk7XG5cdH1cblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLk9BdXRoQXBwcy5maW5kKCk7XG59KTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdGFkZE9BdXRoQXBwKGFwcGxpY2F0aW9uKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2Utb2F1dGgtYXBwcycpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnYWRkT0F1dGhBcHAnIH0pO1xuXHRcdH1cblx0XHRpZiAoIV8uaXNTdHJpbmcoYXBwbGljYXRpb24ubmFtZSkgfHwgYXBwbGljYXRpb24ubmFtZS50cmltKCkgPT09ICcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLW5hbWUnLCAnSW52YWxpZCBuYW1lJywgeyBtZXRob2Q6ICdhZGRPQXV0aEFwcCcgfSk7XG5cdFx0fVxuXHRcdGlmICghXy5pc1N0cmluZyhhcHBsaWNhdGlvbi5yZWRpcmVjdFVyaSkgfHwgYXBwbGljYXRpb24ucmVkaXJlY3RVcmkudHJpbSgpID09PSAnJykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yZWRpcmVjdFVyaScsICdJbnZhbGlkIHJlZGlyZWN0VXJpJywgeyBtZXRob2Q6ICdhZGRPQXV0aEFwcCcgfSk7XG5cdFx0fVxuXHRcdGlmICghXy5pc0Jvb2xlYW4oYXBwbGljYXRpb24uYWN0aXZlKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1hcmd1bWVudHMnLCAnSW52YWxpZCBhcmd1bWVudHMnLCB7IG1ldGhvZDogJ2FkZE9BdXRoQXBwJyB9KTtcblx0XHR9XG5cdFx0YXBwbGljYXRpb24uY2xpZW50SWQgPSBSYW5kb20uaWQoKTtcblx0XHRhcHBsaWNhdGlvbi5jbGllbnRTZWNyZXQgPSBSYW5kb20uc2VjcmV0KCk7XG5cdFx0YXBwbGljYXRpb24uX2NyZWF0ZWRBdCA9IG5ldyBEYXRlO1xuXHRcdGFwcGxpY2F0aW9uLl9jcmVhdGVkQnkgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHRoaXMudXNlcklkLCB7IGZpZWxkczogeyB1c2VybmFtZTogMSB9IH0pO1xuXHRcdGFwcGxpY2F0aW9uLl9pZCA9IFJvY2tldENoYXQubW9kZWxzLk9BdXRoQXBwcy5pbnNlcnQoYXBwbGljYXRpb24pO1xuXHRcdHJldHVybiBhcHBsaWNhdGlvbjtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0dXBkYXRlT0F1dGhBcHAoYXBwbGljYXRpb25JZCwgYXBwbGljYXRpb24pIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1vYXV0aC1hcHBzJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICd1cGRhdGVPQXV0aEFwcCcgfSk7XG5cdFx0fVxuXHRcdGlmICghXy5pc1N0cmluZyhhcHBsaWNhdGlvbi5uYW1lKSB8fCBhcHBsaWNhdGlvbi5uYW1lLnRyaW0oKSA9PT0gJycpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtbmFtZScsICdJbnZhbGlkIG5hbWUnLCB7IG1ldGhvZDogJ3VwZGF0ZU9BdXRoQXBwJyB9KTtcblx0XHR9XG5cdFx0aWYgKCFfLmlzU3RyaW5nKGFwcGxpY2F0aW9uLnJlZGlyZWN0VXJpKSB8fCBhcHBsaWNhdGlvbi5yZWRpcmVjdFVyaS50cmltKCkgPT09ICcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJlZGlyZWN0VXJpJywgJ0ludmFsaWQgcmVkaXJlY3RVcmknLCB7IG1ldGhvZDogJ3VwZGF0ZU9BdXRoQXBwJyB9KTtcblx0XHR9XG5cdFx0aWYgKCFfLmlzQm9vbGVhbihhcHBsaWNhdGlvbi5hY3RpdmUpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWFyZ3VtZW50cycsICdJbnZhbGlkIGFyZ3VtZW50cycsIHsgbWV0aG9kOiAndXBkYXRlT0F1dGhBcHAnIH0pO1xuXHRcdH1cblx0XHRjb25zdCBjdXJyZW50QXBwbGljYXRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5PQXV0aEFwcHMuZmluZE9uZShhcHBsaWNhdGlvbklkKTtcblx0XHRpZiAoY3VycmVudEFwcGxpY2F0aW9uID09IG51bGwpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFwcGxpY2F0aW9uLW5vdC1mb3VuZCcsICdBcHBsaWNhdGlvbiBub3QgZm91bmQnLCB7IG1ldGhvZDogJ3VwZGF0ZU9BdXRoQXBwJyB9KTtcblx0XHR9XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuT0F1dGhBcHBzLnVwZGF0ZShhcHBsaWNhdGlvbklkLCB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdG5hbWU6IGFwcGxpY2F0aW9uLm5hbWUsXG5cdFx0XHRcdGFjdGl2ZTogYXBwbGljYXRpb24uYWN0aXZlLFxuXHRcdFx0XHRyZWRpcmVjdFVyaTogYXBwbGljYXRpb24ucmVkaXJlY3RVcmksXG5cdFx0XHRcdF91cGRhdGVkQXQ6IG5ldyBEYXRlLFxuXHRcdFx0XHRfdXBkYXRlZEJ5OiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHRoaXMudXNlcklkLCB7XG5cdFx0XHRcdFx0ZmllbGRzOiB7XG5cdFx0XHRcdFx0XHR1c2VybmFtZTogMSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KSxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLk9BdXRoQXBwcy5maW5kT25lKGFwcGxpY2F0aW9uSWQpO1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdGRlbGV0ZU9BdXRoQXBwKGFwcGxpY2F0aW9uSWQpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1vYXV0aC1hcHBzJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdkZWxldGVPQXV0aEFwcCcgfSk7XG5cdFx0fVxuXHRcdGNvbnN0IGFwcGxpY2F0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuT0F1dGhBcHBzLmZpbmRPbmUoYXBwbGljYXRpb25JZCk7XG5cdFx0aWYgKGFwcGxpY2F0aW9uID09IG51bGwpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFwcGxpY2F0aW9uLW5vdC1mb3VuZCcsICdBcHBsaWNhdGlvbiBub3QgZm91bmQnLCB7IG1ldGhvZDogJ2RlbGV0ZU9BdXRoQXBwJyB9KTtcblx0XHR9XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuT0F1dGhBcHBzLnJlbW92ZSh7IF9pZDogYXBwbGljYXRpb25JZCB9KTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcbn0pO1xuIl19
