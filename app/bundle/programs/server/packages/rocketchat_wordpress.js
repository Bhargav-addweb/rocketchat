(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var CustomOAuth = Package['rocketchat:custom-oauth'].CustomOAuth;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:wordpress":{"common.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/rocketchat_wordpress/common.js                                                                         //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
const config = {
  serverURL: '',
  identityPath: '/oauth/me',
  addAutopublishFields: {
    forLoggedInUser: ['services.wordpress'],
    forOtherUsers: ['services.wordpress.user_login']
  }
};
const WordPress = new CustomOAuth('wordpress', config);

const fillSettings = _.debounce(Meteor.bindEnvironment(() => {
  config.serverURL = RocketChat.settings.get('API_Wordpress_URL');

  if (!config.serverURL) {
    if (config.serverURL === undefined) {
      return fillSettings();
    }

    return;
  }

  delete config.identityPath;
  delete config.identityTokenSentVia;
  delete config.authorizePath;
  delete config.tokenPath;
  delete config.scope;
  const serverType = RocketChat.settings.get('Accounts_OAuth_Wordpress_server_type');

  switch (serverType) {
    case 'custom':
      if (RocketChat.settings.get('Accounts_OAuth_Wordpress_identity_path')) {
        config.identityPath = RocketChat.settings.get('Accounts_OAuth_Wordpress_identity_path');
      }

      if (RocketChat.settings.get('Accounts_OAuth_Wordpress_identity_token_sent_via')) {
        config.identityTokenSentVia = RocketChat.settings.get('Accounts_OAuth_Wordpress_identity_token_sent_via');
      }

      if (RocketChat.settings.get('Accounts_OAuth_Wordpress_token_path')) {
        config.tokenPath = RocketChat.settings.get('Accounts_OAuth_Wordpress_token_path');
      }

      if (RocketChat.settings.get('Accounts_OAuth_Wordpress_authorize_path')) {
        config.authorizePath = RocketChat.settings.get('Accounts_OAuth_Wordpress_authorize_path');
      }

      if (RocketChat.settings.get('Accounts_OAuth_Wordpress_scope')) {
        config.scope = RocketChat.settings.get('Accounts_OAuth_Wordpress_scope');
      }

      break;

    case 'wordpress-com':
      config.identityPath = 'https://public-api.wordpress.com/rest/v1/me';
      config.identityTokenSentVia = 'header';
      config.authorizePath = 'https://public-api.wordpress.com/oauth2/authorize';
      config.tokenPath = 'https://public-api.wordpress.com/oauth2/token';
      config.scope = 'auth';
      break;

    default:
      config.identityPath = '/oauth/me';
      break;
  }

  const result = WordPress.configure(config);

  if (Meteor.isServer) {
    const enabled = RocketChat.settings.get('Accounts_OAuth_Wordpress');

    if (enabled) {
      ServiceConfiguration.configurations.upsert({
        service: 'wordpress'
      }, {
        $set: config
      });
    } else {
      ServiceConfiguration.configurations.remove({
        service: 'wordpress'
      });
    }
  }

  return result;
}), Meteor.isServer ? 1000 : 100);

if (Meteor.isServer) {
  Meteor.startup(function () {
    return RocketChat.settings.get(/(API\_Wordpress\_URL)?(Accounts\_OAuth\_Wordpress\_)?/, () => fillSettings());
  });
} else {
  Meteor.startup(function () {
    return Tracker.autorun(function () {
      return fillSettings();
    });
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"startup.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/rocketchat_wordpress/startup.js                                                                        //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
RocketChat.settings.addGroup('OAuth', function () {
  return this.section('WordPress', function () {
    const enableQuery = {
      _id: 'Accounts_OAuth_Wordpress',
      value: true
    };
    this.add('Accounts_OAuth_Wordpress', false, {
      type: 'boolean',
      public: true
    });
    this.add('API_Wordpress_URL', '', {
      type: 'string',
      enableQuery,
      public: true
    });
    this.add('Accounts_OAuth_Wordpress_id', '', {
      type: 'string',
      enableQuery
    });
    this.add('Accounts_OAuth_Wordpress_secret', '', {
      type: 'string',
      enableQuery
    });
    this.add('Accounts_OAuth_Wordpress_server_type', '', {
      type: 'select',
      enableQuery,
      public: true,
      values: [{
        key: 'wordpress-com',
        i18nLabel: 'Accounts_OAuth_Wordpress_server_type_wordpress_com'
      }, {
        key: 'wp-oauth-server',
        i18nLabel: 'Accounts_OAuth_Wordpress_server_type_wp_oauth_server'
      }, {
        key: 'custom',
        i18nLabel: 'Accounts_OAuth_Wordpress_server_type_custom'
      }],
      i18nLabel: 'Server_Type'
    });
    const customOAuthQuery = [{
      _id: 'Accounts_OAuth_Wordpress',
      value: true
    }, {
      _id: 'Accounts_OAuth_Wordpress_server_type',
      value: 'custom'
    }];
    this.add('Accounts_OAuth_Wordpress_identity_path', '', {
      type: 'string',
      enableQuery: customOAuthQuery,
      public: true
    });
    this.add('Accounts_OAuth_Wordpress_identity_token_sent_via', '', {
      type: 'string',
      enableQuery: customOAuthQuery,
      public: true
    });
    this.add('Accounts_OAuth_Wordpress_token_path', '', {
      type: 'string',
      enableQuery: customOAuthQuery,
      public: true
    });
    this.add('Accounts_OAuth_Wordpress_authorize_path', '', {
      type: 'string',
      enableQuery: customOAuthQuery,
      public: true
    });
    this.add('Accounts_OAuth_Wordpress_scope', '', {
      type: 'string',
      enableQuery: customOAuthQuery,
      public: true
    });
    return this.add('Accounts_OAuth_Wordpress_callback_url', '_oauth/wordpress', {
      type: 'relativeUrl',
      readonly: true,
      force: true,
      enableQuery
    });
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:wordpress/common.js");
require("/node_modules/meteor/rocketchat:wordpress/startup.js");

/* Exports */
Package._define("rocketchat:wordpress");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_wordpress.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp3b3JkcHJlc3MvY29tbW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OndvcmRwcmVzcy9zdGFydHVwLmpzIl0sIm5hbWVzIjpbIl8iLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsImNvbmZpZyIsInNlcnZlclVSTCIsImlkZW50aXR5UGF0aCIsImFkZEF1dG9wdWJsaXNoRmllbGRzIiwiZm9yTG9nZ2VkSW5Vc2VyIiwiZm9yT3RoZXJVc2VycyIsIldvcmRQcmVzcyIsIkN1c3RvbU9BdXRoIiwiZmlsbFNldHRpbmdzIiwiZGVib3VuY2UiLCJNZXRlb3IiLCJiaW5kRW52aXJvbm1lbnQiLCJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJnZXQiLCJ1bmRlZmluZWQiLCJpZGVudGl0eVRva2VuU2VudFZpYSIsImF1dGhvcml6ZVBhdGgiLCJ0b2tlblBhdGgiLCJzY29wZSIsInNlcnZlclR5cGUiLCJyZXN1bHQiLCJjb25maWd1cmUiLCJpc1NlcnZlciIsImVuYWJsZWQiLCJTZXJ2aWNlQ29uZmlndXJhdGlvbiIsImNvbmZpZ3VyYXRpb25zIiwidXBzZXJ0Iiwic2VydmljZSIsIiRzZXQiLCJyZW1vdmUiLCJzdGFydHVwIiwiVHJhY2tlciIsImF1dG9ydW4iLCJhZGRHcm91cCIsInNlY3Rpb24iLCJlbmFibGVRdWVyeSIsIl9pZCIsInZhbHVlIiwiYWRkIiwidHlwZSIsInB1YmxpYyIsInZhbHVlcyIsImtleSIsImkxOG5MYWJlbCIsImN1c3RvbU9BdXRoUXVlcnkiLCJyZWFkb25seSIsImZvcmNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLENBQUo7O0FBQU1DLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLFFBQUVLLENB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LFNBQUtGLEdBQUwsQ0FBUyxnQ0FBVCxFQUEyQyxFQUEzQyxFQUErQztBQUM5Q0MsWUFBTSxRQUR3QztBQUU5Q0osbUJBQWFTLGdCQUZpQztBQUc5Q0osY0FBUTtBQUhzQyxLQUEvQztBQUtBLFdBQU8sS0FBS0YsR0FBTCxDQUFTLHVDQUFULEVBQWtELGtCQUFsRCxFQUFzRTtBQUM1RUMsWUFBTSxhQURzRTtBQUU1RU0sZ0JBQVUsSUFGa0U7QUFHNUVDLGFBQU8sSUFIcUU7QUFJNUVYO0FBSjRFLEtBQXRFLENBQVA7QUFNQSxHQW5GTSxDQUFQO0FBb0ZBLENBckZELEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfd29yZHByZXNzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFscyBDdXN0b21PQXV0aCAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbmNvbnN0IGNvbmZpZyA9IHtcblx0c2VydmVyVVJMOiAnJyxcblx0aWRlbnRpdHlQYXRoOiAnL29hdXRoL21lJyxcblxuXHRhZGRBdXRvcHVibGlzaEZpZWxkczoge1xuXHRcdGZvckxvZ2dlZEluVXNlcjogWydzZXJ2aWNlcy53b3JkcHJlc3MnXSxcblx0XHRmb3JPdGhlclVzZXJzOiBbJ3NlcnZpY2VzLndvcmRwcmVzcy51c2VyX2xvZ2luJ10sXG5cdH0sXG59O1xuXG5jb25zdCBXb3JkUHJlc3MgPSBuZXcgQ3VzdG9tT0F1dGgoJ3dvcmRwcmVzcycsIGNvbmZpZyk7XG5cbmNvbnN0IGZpbGxTZXR0aW5ncyA9IF8uZGVib3VuY2UoTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG5cdGNvbmZpZy5zZXJ2ZXJVUkwgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX1dvcmRwcmVzc19VUkwnKTtcblx0aWYgKCFjb25maWcuc2VydmVyVVJMKSB7XG5cdFx0aWYgKGNvbmZpZy5zZXJ2ZXJVUkwgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuIGZpbGxTZXR0aW5ncygpO1xuXHRcdH1cblx0XHRyZXR1cm47XG5cdH1cblxuXHRkZWxldGUgY29uZmlnLmlkZW50aXR5UGF0aDtcblx0ZGVsZXRlIGNvbmZpZy5pZGVudGl0eVRva2VuU2VudFZpYTtcblx0ZGVsZXRlIGNvbmZpZy5hdXRob3JpemVQYXRoO1xuXHRkZWxldGUgY29uZmlnLnRva2VuUGF0aDtcblx0ZGVsZXRlIGNvbmZpZy5zY29wZTtcblxuXHRjb25zdCBzZXJ2ZXJUeXBlID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FjY291bnRzX09BdXRoX1dvcmRwcmVzc19zZXJ2ZXJfdHlwZScpO1xuXHRzd2l0Y2ggKHNlcnZlclR5cGUpIHtcblx0XHRjYXNlICdjdXN0b20nOlxuXHRcdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBY2NvdW50c19PQXV0aF9Xb3JkcHJlc3NfaWRlbnRpdHlfcGF0aCcpKSB7XG5cdFx0XHRcdGNvbmZpZy5pZGVudGl0eVBhdGggPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfT0F1dGhfV29yZHByZXNzX2lkZW50aXR5X3BhdGgnKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBY2NvdW50c19PQXV0aF9Xb3JkcHJlc3NfaWRlbnRpdHlfdG9rZW5fc2VudF92aWEnKSkge1xuXHRcdFx0XHRjb25maWcuaWRlbnRpdHlUb2tlblNlbnRWaWEgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfT0F1dGhfV29yZHByZXNzX2lkZW50aXR5X3Rva2VuX3NlbnRfdmlhJyk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfT0F1dGhfV29yZHByZXNzX3Rva2VuX3BhdGgnKSkge1xuXHRcdFx0XHRjb25maWcudG9rZW5QYXRoID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FjY291bnRzX09BdXRoX1dvcmRwcmVzc190b2tlbl9wYXRoJyk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfT0F1dGhfV29yZHByZXNzX2F1dGhvcml6ZV9wYXRoJykpIHtcblx0XHRcdFx0Y29uZmlnLmF1dGhvcml6ZVBhdGggPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfT0F1dGhfV29yZHByZXNzX2F1dGhvcml6ZV9wYXRoJyk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfT0F1dGhfV29yZHByZXNzX3Njb3BlJykpIHtcblx0XHRcdFx0Y29uZmlnLnNjb3BlID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FjY291bnRzX09BdXRoX1dvcmRwcmVzc19zY29wZScpO1xuXHRcdFx0fVxuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnd29yZHByZXNzLWNvbSc6XG5cdFx0XHRjb25maWcuaWRlbnRpdHlQYXRoID0gJ2h0dHBzOi8vcHVibGljLWFwaS53b3JkcHJlc3MuY29tL3Jlc3QvdjEvbWUnO1xuXHRcdFx0Y29uZmlnLmlkZW50aXR5VG9rZW5TZW50VmlhID0gJ2hlYWRlcic7XG5cdFx0XHRjb25maWcuYXV0aG9yaXplUGF0aCA9ICdodHRwczovL3B1YmxpYy1hcGkud29yZHByZXNzLmNvbS9vYXV0aDIvYXV0aG9yaXplJztcblx0XHRcdGNvbmZpZy50b2tlblBhdGggPSAnaHR0cHM6Ly9wdWJsaWMtYXBpLndvcmRwcmVzcy5jb20vb2F1dGgyL3Rva2VuJztcblx0XHRcdGNvbmZpZy5zY29wZSA9ICdhdXRoJztcblx0XHRcdGJyZWFrO1xuXHRcdGRlZmF1bHQ6XG5cdFx0XHRjb25maWcuaWRlbnRpdHlQYXRoID0gJy9vYXV0aC9tZSc7XG5cdFx0XHRicmVhaztcblx0fVxuXG5cdGNvbnN0IHJlc3VsdCA9IFdvcmRQcmVzcy5jb25maWd1cmUoY29uZmlnKTtcblx0aWYgKE1ldGVvci5pc1NlcnZlcikge1xuXHRcdGNvbnN0IGVuYWJsZWQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfT0F1dGhfV29yZHByZXNzJyk7XG5cdFx0aWYgKGVuYWJsZWQpIHtcblx0XHRcdFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLnVwc2VydCh7XG5cdFx0XHRcdHNlcnZpY2U6ICd3b3JkcHJlc3MnLFxuXHRcdFx0fSwge1xuXHRcdFx0XHQkc2V0OiBjb25maWcsXG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0U2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMucmVtb3ZlKHtcblx0XHRcdFx0c2VydmljZTogJ3dvcmRwcmVzcycsXG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0O1xufSksIE1ldGVvci5pc1NlcnZlciA/IDEwMDAgOiAxMDApO1xuXG5pZiAoTWV0ZW9yLmlzU2VydmVyKSB7XG5cdE1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgvKEFQSVxcX1dvcmRwcmVzc1xcX1VSTCk/KEFjY291bnRzXFxfT0F1dGhcXF9Xb3JkcHJlc3NcXF8pPy8sICgpID0+IGZpbGxTZXR0aW5ncygpKTtcblx0fSk7XG59IGVsc2Uge1xuXHRNZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gVHJhY2tlci5hdXRvcnVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGZpbGxTZXR0aW5ncygpO1xuXHRcdH0pO1xuXHR9KTtcbn1cbiIsIlJvY2tldENoYXQuc2V0dGluZ3MuYWRkR3JvdXAoJ09BdXRoJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlY3Rpb24oJ1dvcmRQcmVzcycsIGZ1bmN0aW9uKCkge1xuXG5cdFx0Y29uc3QgZW5hYmxlUXVlcnkgPSB7XG5cdFx0XHRfaWQ6ICdBY2NvdW50c19PQXV0aF9Xb3JkcHJlc3MnLFxuXHRcdFx0dmFsdWU6IHRydWUsXG5cdFx0fTtcblx0XHR0aGlzLmFkZCgnQWNjb3VudHNfT0F1dGhfV29yZHByZXNzJywgZmFsc2UsIHtcblx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnQVBJX1dvcmRwcmVzc19VUkwnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeSxcblx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnQWNjb3VudHNfT0F1dGhfV29yZHByZXNzX2lkJywgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0ZW5hYmxlUXVlcnksXG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0FjY291bnRzX09BdXRoX1dvcmRwcmVzc19zZWNyZXQnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeSxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnQWNjb3VudHNfT0F1dGhfV29yZHByZXNzX3NlcnZlcl90eXBlJywgJycsIHtcblx0XHRcdHR5cGU6ICdzZWxlY3QnLFxuXHRcdFx0ZW5hYmxlUXVlcnksXG5cdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0XHR2YWx1ZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGtleTogJ3dvcmRwcmVzcy1jb20nLFxuXHRcdFx0XHRcdGkxOG5MYWJlbDogJ0FjY291bnRzX09BdXRoX1dvcmRwcmVzc19zZXJ2ZXJfdHlwZV93b3JkcHJlc3NfY29tJyxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGtleTogJ3dwLW9hdXRoLXNlcnZlcicsXG5cdFx0XHRcdFx0aTE4bkxhYmVsOiAnQWNjb3VudHNfT0F1dGhfV29yZHByZXNzX3NlcnZlcl90eXBlX3dwX29hdXRoX3NlcnZlcicsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRrZXk6ICdjdXN0b20nLFxuXHRcdFx0XHRcdGkxOG5MYWJlbDogJ0FjY291bnRzX09BdXRoX1dvcmRwcmVzc19zZXJ2ZXJfdHlwZV9jdXN0b20nLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHRcdGkxOG5MYWJlbDogJ1NlcnZlcl9UeXBlJyxcblx0XHR9KTtcblxuXHRcdGNvbnN0IGN1c3RvbU9BdXRoUXVlcnkgPSBbe1xuXHRcdFx0X2lkOiAnQWNjb3VudHNfT0F1dGhfV29yZHByZXNzJyxcblx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdH0sIHtcblx0XHRcdF9pZDogJ0FjY291bnRzX09BdXRoX1dvcmRwcmVzc19zZXJ2ZXJfdHlwZScsXG5cdFx0XHR2YWx1ZTogJ2N1c3RvbScsXG5cdFx0fV07XG5cblx0XHR0aGlzLmFkZCgnQWNjb3VudHNfT0F1dGhfV29yZHByZXNzX2lkZW50aXR5X3BhdGgnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeTogY3VzdG9tT0F1dGhRdWVyeSxcblx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnQWNjb3VudHNfT0F1dGhfV29yZHByZXNzX2lkZW50aXR5X3Rva2VuX3NlbnRfdmlhJywgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IGN1c3RvbU9BdXRoUXVlcnksXG5cdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0FjY291bnRzX09BdXRoX1dvcmRwcmVzc190b2tlbl9wYXRoJywgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IGN1c3RvbU9BdXRoUXVlcnksXG5cdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0FjY291bnRzX09BdXRoX1dvcmRwcmVzc19hdXRob3JpemVfcGF0aCcsICcnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiBjdXN0b21PQXV0aFF1ZXJ5LFxuXHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdBY2NvdW50c19PQXV0aF9Xb3JkcHJlc3Nfc2NvcGUnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeTogY3VzdG9tT0F1dGhRdWVyeSxcblx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHR9KTtcblx0XHRyZXR1cm4gdGhpcy5hZGQoJ0FjY291bnRzX09BdXRoX1dvcmRwcmVzc19jYWxsYmFja191cmwnLCAnX29hdXRoL3dvcmRwcmVzcycsIHtcblx0XHRcdHR5cGU6ICdyZWxhdGl2ZVVybCcsXG5cdFx0XHRyZWFkb25seTogdHJ1ZSxcblx0XHRcdGZvcmNlOiB0cnVlLFxuXHRcdFx0ZW5hYmxlUXVlcnksXG5cdFx0fSk7XG5cdH0pO1xufSk7XG4iXX0=
