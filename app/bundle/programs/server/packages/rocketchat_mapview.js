(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:mapview":{"server":{"settings.js":function(){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/rocketchat_mapview/server/settings.js                    //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
Meteor.startup(function () {
  RocketChat.settings.add('MapView_Enabled', false, {
    type: 'boolean',
    group: 'Message',
    section: 'Google Maps',
    public: true,
    i18nLabel: 'MapView_Enabled',
    i18nDescription: 'MapView_Enabled_Description'
  });
  return RocketChat.settings.add('MapView_GMapsAPIKey', '', {
    type: 'string',
    group: 'Message',
    section: 'Google Maps',
    public: true,
    i18nLabel: 'MapView_GMapsAPIKey',
    i18nDescription: 'MapView_GMapsAPIKey_Description'
  });
});
///////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:mapview/server/settings.js");

/* Exports */
Package._define("rocketchat:mapview");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_mapview.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXB2aWV3L3NlcnZlci9zZXR0aW5ncy5qcyJdLCJuYW1lcyI6WyJNZXRlb3IiLCJzdGFydHVwIiwiUm9ja2V0Q2hhdCIsInNldHRpbmdzIiwiYWRkIiwidHlwZSIsImdyb3VwIiwic2VjdGlvbiIsInB1YmxpYyIsImkxOG5MYWJlbCIsImkxOG5EZXNjcmlwdGlvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxPQUFPQyxPQUFQLENBQWUsWUFBVztBQUN6QkMsYUFBV0MsUUFBWCxDQUFvQkMsR0FBcEIsQ0FBd0IsaUJBQXhCLEVBQTJDLEtBQTNDLEVBQWtEO0FBQUVDLFVBQU0sU0FBUjtBQUFtQkMsV0FBTyxTQUExQjtBQUFxQ0MsYUFBUyxhQUE5QztBQUE2REMsWUFBUSxJQUFyRTtBQUEyRUMsZUFBVyxpQkFBdEY7QUFBeUdDLHFCQUFpQjtBQUExSCxHQUFsRDtBQUNBLFNBQU9SLFdBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLHFCQUF4QixFQUErQyxFQUEvQyxFQUFtRDtBQUFFQyxVQUFNLFFBQVI7QUFBa0JDLFdBQU8sU0FBekI7QUFBb0NDLGFBQVMsYUFBN0M7QUFBNERDLFlBQVEsSUFBcEU7QUFBMEVDLGVBQVcscUJBQXJGO0FBQTRHQyxxQkFBaUI7QUFBN0gsR0FBbkQsQ0FBUDtBQUNBLENBSEQsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9tYXB2aWV3LmpzIiwic291cmNlc0NvbnRlbnQiOlsiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdNYXBWaWV3X0VuYWJsZWQnLCBmYWxzZSwgeyB0eXBlOiAnYm9vbGVhbicsIGdyb3VwOiAnTWVzc2FnZScsIHNlY3Rpb246ICdHb29nbGUgTWFwcycsIHB1YmxpYzogdHJ1ZSwgaTE4bkxhYmVsOiAnTWFwVmlld19FbmFibGVkJywgaTE4bkRlc2NyaXB0aW9uOiAnTWFwVmlld19FbmFibGVkX0Rlc2NyaXB0aW9uJyB9KTtcblx0cmV0dXJuIFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdNYXBWaWV3X0dNYXBzQVBJS2V5JywgJycsIHsgdHlwZTogJ3N0cmluZycsIGdyb3VwOiAnTWVzc2FnZScsIHNlY3Rpb246ICdHb29nbGUgTWFwcycsIHB1YmxpYzogdHJ1ZSwgaTE4bkxhYmVsOiAnTWFwVmlld19HTWFwc0FQSUtleScsIGkxOG5EZXNjcmlwdGlvbjogJ01hcFZpZXdfR01hcHNBUElLZXlfRGVzY3JpcHRpb24nIH0pO1xufSk7XG4iXX0=
