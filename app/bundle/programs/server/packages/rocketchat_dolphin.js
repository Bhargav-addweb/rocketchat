(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var CustomOAuth = Package['rocketchat:custom-oauth'].CustomOAuth;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:dolphin":{"common.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/rocketchat_dolphin/common.js                                                                 //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
// Dolphin OAuth2

/* globals CustomOAuth */
const config = {
  serverURL: '',
  authorizePath: '/m/oauth2/auth/',
  tokenPath: '/m/oauth2/token/',
  identityPath: '/m/oauth2/api/me/',
  scope: 'basic',
  addAutopublishFields: {
    forLoggedInUser: ['services.dolphin'],
    forOtherUsers: ['services.dolphin.name']
  }
};
const Dolphin = new CustomOAuth('dolphin', config);

function DolphinOnCreateUser(options, user) {
  if (user && user.services && user.services.dolphin && user.services.dolphin.NickName) {
    user.username = user.services.dolphin.NickName;
  }

  return user;
}

if (Meteor.isServer) {
  Meteor.startup(() => RocketChat.models.Settings.find({
    _id: 'Accounts_OAuth_Dolphin_URL'
  }).observe({
    added() {
      config.serverURL = RocketChat.settings.get('Accounts_OAuth_Dolphin_URL');
      return Dolphin.configure(config);
    },

    changed() {
      config.serverURL = RocketChat.settings.get('Accounts_OAuth_Dolphin_URL');
      return Dolphin.configure(config);
    }

  }));

  if (RocketChat.settings.get('Accounts_OAuth_Dolphin_URL')) {
    const data = {
      buttonLabelText: RocketChat.settings.get('Accounts_OAuth_Dolphin_button_label_text'),
      buttonColor: RocketChat.settings.get('Accounts_OAuth_Dolphin_button_color'),
      buttonLabelColor: RocketChat.settings.get('Accounts_OAuth_Dolphin_button_label_color'),
      clientId: RocketChat.settings.get('Accounts_OAuth_Dolphin_id'),
      secret: RocketChat.settings.get('Accounts_OAuth_Dolphin_secret'),
      serverURL: RocketChat.settings.get('Accounts_OAuth_Dolphin_URL'),
      loginStyle: RocketChat.settings.get('Accounts_OAuth_Dolphin_login_style')
    };
    ServiceConfiguration.configurations.upsert({
      service: 'dolphin'
    }, {
      $set: data
    });
  }

  RocketChat.callbacks.add('beforeCreateUser', DolphinOnCreateUser, RocketChat.callbacks.priority.HIGH);
} else {
  Meteor.startup(() => Tracker.autorun(function () {
    if (RocketChat.settings.get('Accounts_OAuth_Dolphin_URL')) {
      config.serverURL = RocketChat.settings.get('Accounts_OAuth_Dolphin_URL');
      return Dolphin.configure(config);
    }
  }));
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////

},"startup.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/rocketchat_dolphin/startup.js                                                                //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
RocketChat.settings.add('Accounts_OAuth_Dolphin_URL', '', {
  type: 'string',
  group: 'OAuth',
  public: true,
  section: 'Dolphin',
  i18nLabel: 'URL'
});
RocketChat.settings.add('Accounts_OAuth_Dolphin', false, {
  type: 'boolean',
  group: 'OAuth',
  section: 'Dolphin',
  i18nLabel: 'Accounts_OAuth_Custom_Enable'
});
RocketChat.settings.add('Accounts_OAuth_Dolphin_id', '', {
  type: 'string',
  group: 'OAuth',
  section: 'Dolphin',
  i18nLabel: 'Accounts_OAuth_Custom_id'
});
RocketChat.settings.add('Accounts_OAuth_Dolphin_secret', '', {
  type: 'string',
  group: 'OAuth',
  section: 'Dolphin',
  i18nLabel: 'Accounts_OAuth_Custom_Secret'
});
RocketChat.settings.add('Accounts_OAuth_Dolphin_login_style', 'redirect', {
  type: 'select',
  group: 'OAuth',
  section: 'Dolphin',
  i18nLabel: 'Accounts_OAuth_Custom_Login_Style',
  persistent: true,
  values: [{
    key: 'redirect',
    i18nLabel: 'Redirect'
  }, {
    key: 'popup',
    i18nLabel: 'Popup'
  }, {
    key: '',
    i18nLabel: 'Default'
  }]
});
RocketChat.settings.add('Accounts_OAuth_Dolphin_button_label_text', '', {
  type: 'string',
  group: 'OAuth',
  section: 'Dolphin',
  i18nLabel: 'Accounts_OAuth_Custom_Button_Label_Text',
  persistent: true
});
RocketChat.settings.add('Accounts_OAuth_Dolphin_button_label_color', '#FFFFFF', {
  type: 'string',
  group: 'OAuth',
  section: 'Dolphin',
  i18nLabel: 'Accounts_OAuth_Custom_Button_Label_Color',
  persistent: true
});
RocketChat.settings.add('Accounts_OAuth_Dolphin_button_color', '#13679A', {
  type: 'string',
  group: 'OAuth',
  section: 'Dolphin',
  i18nLabel: 'Accounts_OAuth_Custom_Button_Color',
  persistent: true
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:dolphin/common.js");
require("/node_modules/meteor/rocketchat:dolphin/startup.js");

/* Exports */
Package._define("rocketchat:dolphin");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_dolphin.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpkb2xwaGluL2NvbW1vbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpkb2xwaGluL3N0YXJ0dXAuanMiXSwibmFtZXMiOlsiY29uZmlnIiwic2VydmVyVVJMIiwiYXV0aG9yaXplUGF0aCIsInRva2VuUGF0aCIsImlkZW50aXR5UGF0aCIsInNjb3BlIiwiYWRkQXV0b3B1Ymxpc2hGaWVsZHMiLCJmb3JMb2dnZWRJblVzZXIiLCJmb3JPdGhlclVzZXJzIiwiRG9scGhpbiIsIkN1c3RvbU9BdXRoIiwiRG9scGhpbk9uQ3JlYXRlVXNlciIsIm9wdGlvbnMiLCJ1c2VyIiwic2VydmljZXMiLCJkb2xwaGluIiwiTmlja05hbWUiLCJ1c2VybmFtZSIsIk1ldGVvciIsImlzU2VydmVyIiwic3RhcnR1cCIsIlJvY2tldENoYXQiLCJtb2RlbHMiLCJTZXR0aW5ncyIsImZpbmQiLCJfaWQiLCJvYnNlcnZlIiwiYWRkZWQiLCJzZXR0aW5ncyIsImdldCIsImNvbmZpZ3VyZSIsImNoYW5nZWQiLCJkYXRhIiwiYnV0dG9uTGFiZWxUZXh0IiwiYnV0dG9uQ29sb3IiLCJidXR0b25MYWJlbENvbG9yIiwiY2xpZW50SWQiLCJzZWNyZXQiLCJsb2dpblN0eWxlIiwiU2VydmljZUNvbmZpZ3VyYXRpb24iLCJjb25maWd1cmF0aW9ucyIsInVwc2VydCIsInNlcnZpY2UiLCIkc2V0IiwiY2FsbGJhY2tzIiwiYWRkIiwicHJpb3JpdHkiLCJISUdIIiwiVHJhY2tlciIsImF1dG9ydW4iLCJ0eXBlIiwiZ3JvdXAiLCJwdWJsaWMiLCJzZWN0aW9uIiwiaTE4bkxhYmVsIiwicGVyc2lzdGVudCIsInZhbHVlcyIsImtleSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7O0FBQ0E7QUFFQSxNQUFNQSxTQUFTO0FBQ2RDLGFBQVcsRUFERztBQUVkQyxpQkFBZSxpQkFG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RTtBQUNBakMsV0FBV08sUUFBWCxDQUFvQmlCLEdBQXBCLENBQXdCLDBDQUF4QixFQUFvRSxFQUFwRSxFQUF3RTtBQUFFSyxRQUFNLFFBQVI7QUFBa0JDLFNBQU8sT0FBekI7QUFBa0NFLFdBQVMsU0FBM0M7QUFBc0RDLGFBQVcseUNBQWpFO0FBQTRHQyxjQUFZO0FBQXhILENBQXhFO0FBQ0FsQyxXQUFXTyxRQUFYLENBQW9CaUIsR0FBcEIsQ0FBd0IsMkNBQXhCLEVBQXFFLFNBQXJFLEVBQWdGO0FBQUVLLFFBQU0sUUFBUjtBQUFrQkMsU0FBTyxPQUF6QjtBQUFrQ0UsV0FBUyxTQUEzQztBQUFzREMsYUFBVywwQ0FBakU7QUFBNkdDLGNBQVk7QUFBekgsQ0FBaEY7QUFDQWxDLFdBQVdPLFFBQVgsQ0FBb0JpQixHQUFwQixDQUF3QixxQ0FBeEIsRUFBK0QsU0FBL0QsRUFBMEU7QUFBRUssUUFBTSxRQUFSO0FBQWtCQyxTQUFPLE9BQXpCO0FBQWtDRSxXQUFTLFNBQTNDO0FBQXNEQyxhQUFXLG9DQUFqRTtBQUF1R0MsY0FBWTtBQUFuSCxDQUExRSxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2RvbHBoaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBEb2xwaGluIE9BdXRoMlxuLyogZ2xvYmFscyBDdXN0b21PQXV0aCAqL1xuXG5jb25zdCBjb25maWcgPSB7XG5cdHNlcnZlclVSTDogJycsXG5cdGF1dGhvcml6ZVBhdGg6ICcvbS9vYXV0aDIvYXV0aC8nLFxuXHR0b2tlblBhdGg6ICcvbS9vYXV0aDIvdG9rZW4vJyxcblx0aWRlbnRpdHlQYXRoOiAnL20vb2F1dGgyL2FwaS9tZS8nLFxuXHRzY29wZTogJ2Jhc2ljJyxcblx0YWRkQXV0b3B1Ymxpc2hGaWVsZHM6IHtcblx0XHRmb3JMb2dnZWRJblVzZXI6IFsnc2VydmljZXMuZG9scGhpbiddLFxuXHRcdGZvck90aGVyVXNlcnM6IFsnc2VydmljZXMuZG9scGhpbi5uYW1lJ10sXG5cdH0sXG59O1xuXG5jb25zdCBEb2xwaGluID0gbmV3IEN1c3RvbU9BdXRoKCdkb2xwaGluJywgY29uZmlnKTtcblxuZnVuY3Rpb24gRG9scGhpbk9uQ3JlYXRlVXNlcihvcHRpb25zLCB1c2VyKSB7XG5cdGlmICh1c2VyICYmIHVzZXIuc2VydmljZXMgJiYgdXNlci5zZXJ2aWNlcy5kb2xwaGluICYmIHVzZXIuc2VydmljZXMuZG9scGhpbi5OaWNrTmFtZSkge1xuXHRcdHVzZXIudXNlcm5hbWUgPSB1c2VyLnNlcnZpY2VzLmRvbHBoaW4uTmlja05hbWU7XG5cdH1cblx0cmV0dXJuIHVzZXI7XG59XG5cbmlmIChNZXRlb3IuaXNTZXJ2ZXIpIHtcblx0TWV0ZW9yLnN0YXJ0dXAoKCkgPT5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kKHsgX2lkOiAnQWNjb3VudHNfT0F1dGhfRG9scGhpbl9VUkwnIH0pLm9ic2VydmUoe1xuXHRcdFx0YWRkZWQoKSB7XG5cdFx0XHRcdGNvbmZpZy5zZXJ2ZXJVUkwgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfT0F1dGhfRG9scGhpbl9VUkwnKTtcblx0XHRcdFx0cmV0dXJuIERvbHBoaW4uY29uZmlndXJlKGNvbmZpZyk7XG5cdFx0XHR9LFxuXHRcdFx0Y2hhbmdlZCgpIHtcblx0XHRcdFx0Y29uZmlnLnNlcnZlclVSTCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBY2NvdW50c19PQXV0aF9Eb2xwaGluX1VSTCcpO1xuXHRcdFx0XHRyZXR1cm4gRG9scGhpbi5jb25maWd1cmUoY29uZmlnKTtcblx0XHRcdH0sXG5cdFx0fSlcblx0KTtcblxuXHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FjY291bnRzX09BdXRoX0RvbHBoaW5fVVJMJykpIHtcblx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0YnV0dG9uTGFiZWxUZXh0OiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfT0F1dGhfRG9scGhpbl9idXR0b25fbGFiZWxfdGV4dCcpLFxuXHRcdFx0YnV0dG9uQ29sb3I6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBY2NvdW50c19PQXV0aF9Eb2xwaGluX2J1dHRvbl9jb2xvcicpLFxuXHRcdFx0YnV0dG9uTGFiZWxDb2xvcjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FjY291bnRzX09BdXRoX0RvbHBoaW5fYnV0dG9uX2xhYmVsX2NvbG9yJyksXG5cdFx0XHRjbGllbnRJZDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FjY291bnRzX09BdXRoX0RvbHBoaW5faWQnKSxcblx0XHRcdHNlY3JldDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FjY291bnRzX09BdXRoX0RvbHBoaW5fc2VjcmV0JyksXG5cdFx0XHRzZXJ2ZXJVUkw6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBY2NvdW50c19PQXV0aF9Eb2xwaGluX1VSTCcpLFxuXHRcdFx0bG9naW5TdHlsZTogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FjY291bnRzX09BdXRoX0RvbHBoaW5fbG9naW5fc3R5bGUnKSxcblx0XHR9O1xuXG5cdFx0U2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMudXBzZXJ0KHsgc2VydmljZTogJ2RvbHBoaW4nIH0sIHsgJHNldDogZGF0YSB9KTtcblx0fVxuXG5cdFJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYmVmb3JlQ3JlYXRlVXNlcicsIERvbHBoaW5PbkNyZWF0ZVVzZXIsIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkhJR0gpO1xufSBlbHNlIHtcblx0TWV0ZW9yLnN0YXJ0dXAoKCkgPT5cblx0XHRUcmFja2VyLmF1dG9ydW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FjY291bnRzX09BdXRoX0RvbHBoaW5fVVJMJykpIHtcblx0XHRcdFx0Y29uZmlnLnNlcnZlclVSTCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBY2NvdW50c19PQXV0aF9Eb2xwaGluX1VSTCcpO1xuXHRcdFx0XHRyZXR1cm4gRG9scGhpbi5jb25maWd1cmUoY29uZmlnKTtcblx0XHRcdH1cblx0XHR9KVxuXHQpO1xufVxuIiwiUm9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0FjY291bnRzX09BdXRoX0RvbHBoaW5fVVJMJywgJycsIHsgdHlwZTogJ3N0cmluZycsIGdyb3VwOiAnT0F1dGgnLCBwdWJsaWM6IHRydWUsIHNlY3Rpb246ICdEb2xwaGluJywgaTE4bkxhYmVsOiAnVVJMJyB9KTtcblJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdBY2NvdW50c19PQXV0aF9Eb2xwaGluJywgZmFsc2UsIHsgdHlwZTogJ2Jvb2xlYW4nLCBncm91cDogJ09BdXRoJywgc2VjdGlvbjogJ0RvbHBoaW4nLCBpMThuTGFiZWw6ICdBY2NvdW50c19PQXV0aF9DdXN0b21fRW5hYmxlJyB9KTtcblJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdBY2NvdW50c19PQXV0aF9Eb2xwaGluX2lkJywgJycsIHsgdHlwZTogJ3N0cmluZycsIGdyb3VwOiAnT0F1dGgnLCBzZWN0aW9uOiAnRG9scGhpbicsIGkxOG5MYWJlbDogJ0FjY291bnRzX09BdXRoX0N1c3RvbV9pZCcgfSk7XG5Sb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnQWNjb3VudHNfT0F1dGhfRG9scGhpbl9zZWNyZXQnLCAnJywgeyB0eXBlOiAnc3RyaW5nJywgZ3JvdXA6ICdPQXV0aCcsIHNlY3Rpb246ICdEb2xwaGluJywgaTE4bkxhYmVsOiAnQWNjb3VudHNfT0F1dGhfQ3VzdG9tX1NlY3JldCcgfSk7XG5Sb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnQWNjb3VudHNfT0F1dGhfRG9scGhpbl9sb2dpbl9zdHlsZScsICdyZWRpcmVjdCcsIHsgdHlwZTogJ3NlbGVjdCcsIGdyb3VwOiAnT0F1dGgnLCBzZWN0aW9uOiAnRG9scGhpbicsIGkxOG5MYWJlbDogJ0FjY291bnRzX09BdXRoX0N1c3RvbV9Mb2dpbl9TdHlsZScsIHBlcnNpc3RlbnQ6IHRydWUsIHZhbHVlczogW3sga2V5OiAncmVkaXJlY3QnLCBpMThuTGFiZWw6ICdSZWRpcmVjdCcgfSwgeyBrZXk6ICdwb3B1cCcsIGkxOG5MYWJlbDogJ1BvcHVwJyB9LCB7IGtleTogJycsIGkxOG5MYWJlbDogJ0RlZmF1bHQnIH1dIH0pO1xuUm9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0FjY291bnRzX09BdXRoX0RvbHBoaW5fYnV0dG9uX2xhYmVsX3RleHQnLCAnJywgeyB0eXBlOiAnc3RyaW5nJywgZ3JvdXA6ICdPQXV0aCcsIHNlY3Rpb246ICdEb2xwaGluJywgaTE4bkxhYmVsOiAnQWNjb3VudHNfT0F1dGhfQ3VzdG9tX0J1dHRvbl9MYWJlbF9UZXh0JywgcGVyc2lzdGVudDogdHJ1ZSB9KTtcblJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdBY2NvdW50c19PQXV0aF9Eb2xwaGluX2J1dHRvbl9sYWJlbF9jb2xvcicsICcjRkZGRkZGJywgeyB0eXBlOiAnc3RyaW5nJywgZ3JvdXA6ICdPQXV0aCcsIHNlY3Rpb246ICdEb2xwaGluJywgaTE4bkxhYmVsOiAnQWNjb3VudHNfT0F1dGhfQ3VzdG9tX0J1dHRvbl9MYWJlbF9Db2xvcicsIHBlcnNpc3RlbnQ6IHRydWUgfSk7XG5Sb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnQWNjb3VudHNfT0F1dGhfRG9scGhpbl9idXR0b25fY29sb3InLCAnIzEzNjc5QScsIHsgdHlwZTogJ3N0cmluZycsIGdyb3VwOiAnT0F1dGgnLCBzZWN0aW9uOiAnRG9scGhpbicsIGkxOG5MYWJlbDogJ0FjY291bnRzX09BdXRoX0N1c3RvbV9CdXR0b25fQ29sb3InLCBwZXJzaXN0ZW50OiB0cnVlIH0pO1xuIl19
