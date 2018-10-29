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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:autolinker":{"server":{"settings.js":function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// packages/rocketchat_autolinker/server/settings.js                   //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
Meteor.startup(function () {
  const enableQuery = {
    _id: 'AutoLinker',
    value: true
  };
  RocketChat.settings.add('AutoLinker', true, {
    type: 'boolean',
    group: 'Message',
    section: 'AutoLinker',
    public: true,
    i18nLabel: 'Enabled'
  });
  RocketChat.settings.add('AutoLinker_StripPrefix', false, {
    type: 'boolean',
    group: 'Message',
    section: 'AutoLinker',
    public: true,
    i18nDescription: 'AutoLinker_StripPrefix_Description',
    enableQuery
  });
  RocketChat.settings.add('AutoLinker_Urls_Scheme', true, {
    type: 'boolean',
    group: 'Message',
    section: 'AutoLinker',
    public: true,
    enableQuery
  });
  RocketChat.settings.add('AutoLinker_Urls_www', true, {
    type: 'boolean',
    group: 'Message',
    section: 'AutoLinker',
    public: true,
    enableQuery
  });
  RocketChat.settings.add('AutoLinker_Urls_TLD', true, {
    type: 'boolean',
    group: 'Message',
    section: 'AutoLinker',
    public: true,
    enableQuery
  });
  RocketChat.settings.add('AutoLinker_UrlsRegExp', '(://|www\\.).+', {
    type: 'string',
    group: 'Message',
    section: 'AutoLinker',
    public: true,
    enableQuery
  });
  RocketChat.settings.add('AutoLinker_Email', true, {
    type: 'boolean',
    group: 'Message',
    section: 'AutoLinker',
    public: true,
    enableQuery
  });
  RocketChat.settings.add('AutoLinker_Phone', true, {
    type: 'boolean',
    group: 'Message',
    section: 'AutoLinker',
    public: true,
    i18nDescription: 'AutoLinker_Phone_Description',
    enableQuery
  });
});
/////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:autolinker/server/settings.js");

/* Exports */
Package._define("rocketchat:autolinker");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_autolinker.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRvbGlua2VyL3NlcnZlci9zZXR0aW5ncy5qcyJdLCJuYW1lcyI6WyJNZXRlb3IiLCJzdGFydHVwIiwiZW5hYmxlUXVlcnkiLCJfaWQiLCJ2YWx1ZSIsIlJvY2tldENoYXQiLCJzZXR0aW5ncyIsImFkZCIsInR5cGUiLCJncm91cCIsInNlY3Rpb24iLCJwdWJsaWMiLCJpMThuTGFiZWwiLCJpMThuRGVzY3JpcHRpb24iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsT0FBUCxDQUFlLFlBQVc7QUFDekIsUUFBTUMsY0FBYztBQUNuQkMsU0FBSyxZQURjO0FBRW5CQyxXQUFPO0FBRlksR0FBcEI7QUFLQUMsYUFBV0MsUUFBWCxDQUFvQkMsR0FBcEIsQ0FBd0IsWUFBeEIsRUFBc0MsSUFBdEMsRUFBNEM7QUFBRUMsVUFBTSxTQUFSO0FBQW1CQyxXQUFPLFNBQTFCO0FBQXFDQyxhQUFTLFlBQTlDO0FBQTREQyxZQUFRLElBQXBFO0FBQTBFQyxlQUFXO0FBQXJGLEdBQTVDO0FBRUFQLGFBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLHdCQUF4QixFQUFrRCxLQUFsRCxFQUF5RDtBQUFFQyxVQUFNLFNBQVI7QUFBbUJDLFdBQU8sU0FBMUI7QUFBcUNDLGFBQVMsWUFBOUM7QUFBNERDLFlBQVEsSUFBcEU7QUFBMEVFLHFCQUFpQixvQ0FBM0Y7QUFBaUlYO0FBQWpJLEdBQXpEO0FBQ0FHLGFBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLHdCQUF4QixFQUFrRCxJQUFsRCxFQUF3RDtBQUFFQyxVQUFNLFNBQVI7QUFBbUJDLFdBQU8sU0FBMUI7QUFBcUNDLGFBQVMsWUFBOUM7QUFBNERDLFlBQVEsSUFBcEU7QUFBMEVUO0FBQTFFLEdBQXhEO0FBQ0FHLGFBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLHFCQUF4QixFQUErQyxJQUEvQyxFQUFxRDtBQUFFQyxVQUFNLFNBQVI7QUFBbUJDLFdBQU8sU0FBMUI7QUFBcUNDLGFBQVMsWUFBOUM7QUFBNERDLFlBQVEsSUFBcEU7QUFBMEVUO0FBQTFFLEdBQXJEO0FBQ0FHLGFBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLHFCQUF4QixFQUErQyxJQUEvQyxFQUFxRDtBQUFFQyxVQUFNLFNBQVI7QUFBbUJDLFdBQU8sU0FBMUI7QUFBcUNDLGFBQVMsWUFBOUM7QUFBNERDLFlBQVEsSUFBcEU7QUFBMEVUO0FBQTFFLEdBQXJEO0FBQ0FHLGFBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLHVCQUF4QixFQUFpRCxnQkFBakQsRUFBbUU7QUFBRUMsVUFBTSxRQUFSO0FBQWtCQyxXQUFPLFNBQXpCO0FBQW9DQyxhQUFTLFlBQTdDO0FBQTJEQyxZQUFRLElBQW5FO0FBQXlFVDtBQUF6RSxHQUFuRTtBQUNBRyxhQUFXQyxRQUFYLENBQW9CQyxHQUFwQixDQUF3QixrQkFBeEIsRUFBNEMsSUFBNUMsRUFBa0Q7QUFBRUMsVUFBTSxTQUFSO0FBQW1CQyxXQUFPLFNBQTFCO0FBQXFDQyxhQUFTLFlBQTlDO0FBQTREQyxZQUFRLElBQXBFO0FBQTBFVDtBQUExRSxHQUFsRDtBQUNBRyxhQUFXQyxRQUFYLENBQW9CQyxHQUFwQixDQUF3QixrQkFBeEIsRUFBNEMsSUFBNUMsRUFBa0Q7QUFBRUMsVUFBTSxTQUFSO0FBQW1CQyxXQUFPLFNBQTFCO0FBQXFDQyxhQUFTLFlBQTlDO0FBQTREQyxZQUFRLElBQXBFO0FBQTBFRSxxQkFBaUIsOEJBQTNGO0FBQTJIWDtBQUEzSCxHQUFsRDtBQUNBLENBZkQsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9hdXRvbGlua2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdGNvbnN0IGVuYWJsZVF1ZXJ5ID0ge1xuXHRcdF9pZDogJ0F1dG9MaW5rZXInLFxuXHRcdHZhbHVlOiB0cnVlLFxuXHR9O1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdBdXRvTGlua2VyJywgdHJ1ZSwgeyB0eXBlOiAnYm9vbGVhbicsIGdyb3VwOiAnTWVzc2FnZScsIHNlY3Rpb246ICdBdXRvTGlua2VyJywgcHVibGljOiB0cnVlLCBpMThuTGFiZWw6ICdFbmFibGVkJyB9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnQXV0b0xpbmtlcl9TdHJpcFByZWZpeCcsIGZhbHNlLCB7IHR5cGU6ICdib29sZWFuJywgZ3JvdXA6ICdNZXNzYWdlJywgc2VjdGlvbjogJ0F1dG9MaW5rZXInLCBwdWJsaWM6IHRydWUsIGkxOG5EZXNjcmlwdGlvbjogJ0F1dG9MaW5rZXJfU3RyaXBQcmVmaXhfRGVzY3JpcHRpb24nLCBlbmFibGVRdWVyeSB9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0F1dG9MaW5rZXJfVXJsc19TY2hlbWUnLCB0cnVlLCB7IHR5cGU6ICdib29sZWFuJywgZ3JvdXA6ICdNZXNzYWdlJywgc2VjdGlvbjogJ0F1dG9MaW5rZXInLCBwdWJsaWM6IHRydWUsIGVuYWJsZVF1ZXJ5IH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnQXV0b0xpbmtlcl9VcmxzX3d3dycsIHRydWUsIHsgdHlwZTogJ2Jvb2xlYW4nLCBncm91cDogJ01lc3NhZ2UnLCBzZWN0aW9uOiAnQXV0b0xpbmtlcicsIHB1YmxpYzogdHJ1ZSwgZW5hYmxlUXVlcnkgfSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdBdXRvTGlua2VyX1VybHNfVExEJywgdHJ1ZSwgeyB0eXBlOiAnYm9vbGVhbicsIGdyb3VwOiAnTWVzc2FnZScsIHNlY3Rpb246ICdBdXRvTGlua2VyJywgcHVibGljOiB0cnVlLCBlbmFibGVRdWVyeSB9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0F1dG9MaW5rZXJfVXJsc1JlZ0V4cCcsICcoOi8vfHd3d1xcXFwuKS4rJywgeyB0eXBlOiAnc3RyaW5nJywgZ3JvdXA6ICdNZXNzYWdlJywgc2VjdGlvbjogJ0F1dG9MaW5rZXInLCBwdWJsaWM6IHRydWUsIGVuYWJsZVF1ZXJ5IH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnQXV0b0xpbmtlcl9FbWFpbCcsIHRydWUsIHsgdHlwZTogJ2Jvb2xlYW4nLCBncm91cDogJ01lc3NhZ2UnLCBzZWN0aW9uOiAnQXV0b0xpbmtlcicsIHB1YmxpYzogdHJ1ZSwgZW5hYmxlUXVlcnkgfSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdBdXRvTGlua2VyX1Bob25lJywgdHJ1ZSwgeyB0eXBlOiAnYm9vbGVhbicsIGdyb3VwOiAnTWVzc2FnZScsIHNlY3Rpb246ICdBdXRvTGlua2VyJywgcHVibGljOiB0cnVlLCBpMThuRGVzY3JpcHRpb246ICdBdXRvTGlua2VyX1Bob25lX0Rlc2NyaXB0aW9uJywgZW5hYmxlUXVlcnkgfSk7XG59KTtcbiJdfQ==
