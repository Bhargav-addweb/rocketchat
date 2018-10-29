(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var fileUpload = Package['rocketchat:ui'].fileUpload;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:action-links":{"both":{"lib":{"actionLinks.js":function(){

////////////////////////////////////////////////////////////////////////////////////////
//                                                                                    //
// packages/rocketchat_action-links/both/lib/actionLinks.js                           //
//                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////
                                                                                      //
// Action Links namespace creation.
RocketChat.actionLinks = {
  actions: {},

  register(name, funct) {
    RocketChat.actionLinks.actions[name] = funct;
  },

  getMessage(name, messageId) {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        function: 'actionLinks.getMessage'
      });
    }

    const message = RocketChat.models.Messages.findOne({
      _id: messageId
    });

    if (!message) {
      throw new Meteor.Error('error-invalid-message', 'Invalid message', {
        function: 'actionLinks.getMessage'
      });
    }

    const subscription = RocketChat.models.Subscriptions.findOne({
      rid: message.rid,
      'u._id': userId
    });

    if (!subscription) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        function: 'actionLinks.getMessage'
      });
    }

    if (!message.actionLinks || !message.actionLinks[name]) {
      throw new Meteor.Error('error-invalid-actionlink', 'Invalid action link', {
        function: 'actionLinks.getMessage'
      });
    }

    return message;
  }

};
////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"actionLinkHandler.js":function(){

////////////////////////////////////////////////////////////////////////////////////////
//                                                                                    //
// packages/rocketchat_action-links/server/actionLinkHandler.js                       //
//                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////
                                                                                      //
// Action Links Handler. This method will be called off the client.
Meteor.methods({
  actionLinkHandler(name, messageId) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'actionLinkHandler'
      });
    }

    const message = RocketChat.actionLinks.getMessage(name, messageId);
    const actionLink = message.actionLinks[name];
    RocketChat.actionLinks.actions[actionLink.method_id](message, actionLink.params);
  }

});
////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:action-links/both/lib/actionLinks.js");
require("/node_modules/meteor/rocketchat:action-links/server/actionLinkHandler.js");

/* Exports */
Package._define("rocketchat:action-links");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_action-links.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphY3Rpb24tbGlua3MvYm90aC9saWIvYWN0aW9uTGlua3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YWN0aW9uLWxpbmtzL3NlcnZlci9hY3Rpb25MaW5rSGFuZGxlci5qcyJdLCJuYW1lcyI6WyJSb2NrZXRDaGF0IiwiYWN0aW9uTGlua3MiLCJhY3Rpb25zIiwicmVnaXN0ZXIiLCJuYW1lIiwiZnVuY3QiLCJnZXRNZXNzYWdlIiwibWVzc2FnZUlkIiwidXNlcklkIiwiTWV0ZW9yIiwiRXJyb3IiLCJmdW5jdGlvbiIsIm1lc3NhZ2UiLCJtb2RlbHMiLCJNZXNzYWdlcyIsImZpbmRPbmUiLCJfaWQiLCJzdWJzY3JpcHRpb24iLCJTdWJzY3JpcHRpb25zIiwicmlkIiwibWV0aG9kcyIsImFjdGlvbkxpbmtIYW5kbGVyIiwibWV0aG9kIiwiYWN0aW9uTGluayIsIm1ldGhvZF9pZCIsInBhcmFtcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBQSxXQUFXQyxXQUFYLEdBQXlCO0FBQ3hCQyxXQUFTLEVBRGU7O0FBRXhCQyxXQUFTQyxJQUFULEVBQWVDLEtBQWYsRUFBc0I7QUFDckJMLGVBQVdDLFdBQVgsQ0FBdUJDLE9BQXZCLENBQStCRSxJQUEvQixJQUF1Q0MsS0FBdkM7QUFDQSxHQUp1Qjs7QUFLeEJDLGFBQVdGLElBQVgsRUFBaUJHLFNBQWpCLEVBQTRCO0FBQzNCLFVBQU1DLFNBQVNDLE9BQU9ELE1BQVAsRUFBZjs7QUFDQSxRQUFJLENBQUNBLE1BQUwsRUFBYTtBQUNaLFlBQU0sSUFBSUMsT0FBT0MsS0FBWCxDQUFpQixvQkFBakIsRUFBdUMsY0FBdkMsRUFBdUQ7QUFBRUMsa0JBQVU7QUFBWixPQUF2RCxDQUFOO0FBQ0E7O0FBRUQsVUFBTUMsVUFBVVosV0FBV2EsTUFBWCxDQUFrQkMsUUFBbEIsQ0FBMkJDLE9BQTNCLENBQW1DO0FBQUVDLFdBQUtUO0FBQVAsS0FBbkMsQ0FBaEI7O0FBQ0EsUUFBSSxDQUFDSyxPQUFMLEVBQWM7QUFDYixZQUFNLElBQUlILE9BQU9DLEtBQVgsQ0FBaUIsdUJBQWpCLEVBQTBDLGlCQUExQyxFQUE2RDtBQUFFQyxrQkFBVTtBQUFaLE9BQTdELENBQU47QUFDQTs7QUFFRCxVQUFNTSxlQUFlakIsV0FBV2EsTUFBWCxDQUFrQkssYUFBbEIsQ0FBZ0NILE9BQWhDLENBQXdDO0FBQzVESSxXQUFLUCxRQUFRTyxHQUQrQztBQUU1RCxlQUFTWDtBQUZtRCxLQUF4QyxDQUFyQjs7QUFJQSxRQUFJLENBQUNTLFlBQUwsRUFBbUI7QUFDbEIsWUFBTSxJQUFJUixPQUFPQyxLQUFYLENBQWlCLG1CQUFqQixFQUFzQyxhQUF0QyxFQUFxRDtBQUFFQyxrQkFBVTtBQUFaLE9BQXJELENBQU47QUFDQTs7QUFFRCxRQUFJLENBQUNDLFFBQVFYLFdBQVQsSUFBd0IsQ0FBQ1csUUFBUVgsV0FBUixDQUFvQkcsSUFBcEIsQ0FBN0IsRUFBd0Q7QUFDdkQsWUFBTSxJQUFJSyxPQUFPQyxLQUFYLENBQWlCLDBCQUFqQixFQUE2QyxxQkFBN0MsRUFBb0U7QUFBRUMsa0JBQVU7QUFBWixPQUFwRSxDQUFOO0FBQ0E7O0FBRUQsV0FBT0MsT0FBUDtBQUNBOztBQTdCdUIsQ0FBekIsQzs7Ozs7Ozs7Ozs7QUNEQTtBQUVBSCxPQUFPVyxPQUFQLENBQWU7QUFDZEMsb0JBQWtCakIsSUFBbEIsRUFBd0JHLFNBQXhCLEVBQW1DO0FBQ2xDLFFBQUksQ0FBQ0UsT0FBT0QsTUFBUCxFQUFMLEVBQXNCO0FBQ3JCLFlBQU0sSUFBSUMsT0FBT0MsS0FBWCxDQUFpQixvQkFBakIsRUFBdUMsY0FBdkMsRUFBdUQ7QUFBRVksZ0JBQVE7QUFBVixPQUF2RCxDQUFOO0FBQ0E7O0FBRUQsVUFBTVYsVUFBVVosV0FBV0MsV0FBWCxDQUF1QkssVUFBdkIsQ0FBa0NGLElBQWxDLEVBQXdDRyxTQUF4QyxDQUFoQjtBQUVBLFVBQU1nQixhQUFhWCxRQUFRWCxXQUFSLENBQW9CRyxJQUFwQixDQUFuQjtBQUVBSixlQUFXQyxXQUFYLENBQXVCQyxPQUF2QixDQUErQnFCLFdBQVdDLFNBQTFDLEVBQXFEWixPQUFyRCxFQUE4RFcsV0FBV0UsTUFBekU7QUFDQTs7QUFYYSxDQUFmLEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfYWN0aW9uLWxpbmtzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQWN0aW9uIExpbmtzIG5hbWVzcGFjZSBjcmVhdGlvbi5cblJvY2tldENoYXQuYWN0aW9uTGlua3MgPSB7XG5cdGFjdGlvbnM6IHt9LFxuXHRyZWdpc3RlcihuYW1lLCBmdW5jdCkge1xuXHRcdFJvY2tldENoYXQuYWN0aW9uTGlua3MuYWN0aW9uc1tuYW1lXSA9IGZ1bmN0O1xuXHR9LFxuXHRnZXRNZXNzYWdlKG5hbWUsIG1lc3NhZ2VJZCkge1xuXHRcdGNvbnN0IHVzZXJJZCA9IE1ldGVvci51c2VySWQoKTtcblx0XHRpZiAoIXVzZXJJZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgZnVuY3Rpb246ICdhY3Rpb25MaW5rcy5nZXRNZXNzYWdlJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCBtZXNzYWdlID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZSh7IF9pZDogbWVzc2FnZUlkIH0pO1xuXHRcdGlmICghbWVzc2FnZSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1tZXNzYWdlJywgJ0ludmFsaWQgbWVzc2FnZScsIHsgZnVuY3Rpb246ICdhY3Rpb25MaW5rcy5nZXRNZXNzYWdlJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmUoe1xuXHRcdFx0cmlkOiBtZXNzYWdlLnJpZCxcblx0XHRcdCd1Ll9pZCc6IHVzZXJJZCxcblx0XHR9KTtcblx0XHRpZiAoIXN1YnNjcmlwdGlvbikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IGZ1bmN0aW9uOiAnYWN0aW9uTGlua3MuZ2V0TWVzc2FnZScgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFtZXNzYWdlLmFjdGlvbkxpbmtzIHx8ICFtZXNzYWdlLmFjdGlvbkxpbmtzW25hbWVdKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWFjdGlvbmxpbmsnLCAnSW52YWxpZCBhY3Rpb24gbGluaycsIHsgZnVuY3Rpb246ICdhY3Rpb25MaW5rcy5nZXRNZXNzYWdlJyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fSxcbn07XG4iLCIvLyBBY3Rpb24gTGlua3MgSGFuZGxlci4gVGhpcyBtZXRob2Qgd2lsbCBiZSBjYWxsZWQgb2ZmIHRoZSBjbGllbnQuXG5cbk1ldGVvci5tZXRob2RzKHtcblx0YWN0aW9uTGlua0hhbmRsZXIobmFtZSwgbWVzc2FnZUlkKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2FjdGlvbkxpbmtIYW5kbGVyJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCBtZXNzYWdlID0gUm9ja2V0Q2hhdC5hY3Rpb25MaW5rcy5nZXRNZXNzYWdlKG5hbWUsIG1lc3NhZ2VJZCk7XG5cblx0XHRjb25zdCBhY3Rpb25MaW5rID0gbWVzc2FnZS5hY3Rpb25MaW5rc1tuYW1lXTtcblxuXHRcdFJvY2tldENoYXQuYWN0aW9uTGlua3MuYWN0aW9uc1thY3Rpb25MaW5rLm1ldGhvZF9pZF0obWVzc2FnZSwgYWN0aW9uTGluay5wYXJhbXMpO1xuXHR9LFxufSk7XG4iXX0=
