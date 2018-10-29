(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var ECMAScript = Package.ecmascript.ECMAScript;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:webrtc":{"server":{"settings.js":function(){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/rocketchat_webrtc/server/settings.js                     //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
RocketChat.settings.addGroup('WebRTC', function () {
  this.add('WebRTC_Enable_Channel', false, {
    type: 'boolean',
    group: 'WebRTC',
    public: true
  });
  this.add('WebRTC_Enable_Private', false, {
    type: 'boolean',
    group: 'WebRTC',
    public: true
  });
  this.add('WebRTC_Enable_Direct', false, {
    type: 'boolean',
    group: 'WebRTC',
    public: true
  });
  return this.add('WebRTC_Servers', 'stun:stun.l.google.com:19302, stun:23.21.150.121, team%40rocket.chat:demo@turn:numb.viagenie.ca:3478', {
    type: 'string',
    group: 'WebRTC',
    public: true
  });
});
///////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:webrtc/server/settings.js");

/* Exports */
Package._define("rocketchat:webrtc");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_webrtc.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp3ZWJydGMvc2VydmVyL3NldHRpbmdzLmpzIl0sIm5hbWVzIjpbIlJvY2tldENoYXQiLCJzZXR0aW5ncyIsImFkZEdyb3VwIiwiYWRkIiwidHlwZSIsImdyb3VwIiwicHVibGljIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLFdBQVdDLFFBQVgsQ0FBb0JDLFFBQXBCLENBQTZCLFFBQTdCLEVBQXVDLFlBQVc7QUFDakQsT0FBS0MsR0FBTCxDQUFTLHVCQUFULEVBQWtDLEtBQWxDLEVBQXlDO0FBQ3hDQyxVQUFNLFNBRGtDO0FBRXhDQyxXQUFPLFFBRmlDO0FBR3hDQyxZQUFRO0FBSGdDLEdBQXpDO0FBS0EsT0FBS0gsR0FBTCxDQUFTLHVCQUFULEVBQWtDLEtBQWxDLEVBQXlDO0FBQ3hDQyxVQUFNLFNBRGtDO0FBRXhDQyxXQUFPLFFBRmlDO0FBR3hDQyxZQUFRO0FBSGdDLEdBQXpDO0FBS0EsT0FBS0gsR0FBTCxDQUFTLHNCQUFULEVBQWlDLEtBQWpDLEVBQXdDO0FBQ3ZDQyxVQUFNLFNBRGlDO0FBRXZDQyxXQUFPLFFBRmdDO0FBR3ZDQyxZQUFRO0FBSCtCLEdBQXhDO0FBS0EsU0FBTyxLQUFLSCxHQUFMLENBQVMsZ0JBQVQsRUFBMkIsc0dBQTNCLEVBQW1JO0FBQ3pJQyxVQUFNLFFBRG1JO0FBRXpJQyxXQUFPLFFBRmtJO0FBR3pJQyxZQUFRO0FBSGlJLEdBQW5JLENBQVA7QUFLQSxDQXJCRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X3dlYnJ0Yy5qcyIsInNvdXJjZXNDb250ZW50IjpbIlJvY2tldENoYXQuc2V0dGluZ3MuYWRkR3JvdXAoJ1dlYlJUQycsIGZ1bmN0aW9uKCkge1xuXHR0aGlzLmFkZCgnV2ViUlRDX0VuYWJsZV9DaGFubmVsJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdXZWJSVEMnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0fSk7XG5cdHRoaXMuYWRkKCdXZWJSVENfRW5hYmxlX1ByaXZhdGUnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ1dlYlJUQycsXG5cdFx0cHVibGljOiB0cnVlLFxuXHR9KTtcblx0dGhpcy5hZGQoJ1dlYlJUQ19FbmFibGVfRGlyZWN0JywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdXZWJSVEMnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0fSk7XG5cdHJldHVybiB0aGlzLmFkZCgnV2ViUlRDX1NlcnZlcnMnLCAnc3R1bjpzdHVuLmwuZ29vZ2xlLmNvbToxOTMwMiwgc3R1bjoyMy4yMS4xNTAuMTIxLCB0ZWFtJTQwcm9ja2V0LmNoYXQ6ZGVtb0B0dXJuOm51bWIudmlhZ2VuaWUuY2E6MzQ3OCcsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ1dlYlJUQycsXG5cdFx0cHVibGljOiB0cnVlLFxuXHR9KTtcbn0pO1xuIl19
