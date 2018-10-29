(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Logger = Package['rocketchat:logger'].Logger;
var SystemLogger = Package['rocketchat:logger'].SystemLogger;
var LoggerManager = Package['rocketchat:logger'].LoggerManager;
var fileUpload = Package['rocketchat:ui'].fileUpload;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:message-mark-as-unread":{"server":{"logger.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_message-mark-as-unread/server/logger.js                                                      //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
const logger = new Logger('MessageMarkAsUnread', {
  sections: {
    connection: 'Connection',
    events: 'Events'
  }
});
module.exportDefault(logger);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"unreadMessages.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_message-mark-as-unread/server/unreadMessages.js                                              //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let logger;
module.watch(require("./logger"), {
  default(v) {
    logger = v;
  }

}, 0);
Meteor.methods({
  unreadMessages(firstUnreadMessage, room) {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'unreadMessages'
      });
    }

    if (room) {
      const lastMessage = RocketChat.models.Messages.findVisibleByRoomId(room, {
        limit: 1,
        sort: {
          ts: -1
        }
      }).fetch()[0];

      if (lastMessage == null) {
        throw new Meteor.Error('error-action-not-allowed', 'Not allowed', {
          method: 'unreadMessages',
          action: 'Unread_messages'
        });
      }

      return RocketChat.models.Subscriptions.setAsUnreadByRoomIdAndUserId(lastMessage.rid, userId, lastMessage.ts);
    }

    const originalMessage = RocketChat.models.Messages.findOneById(firstUnreadMessage._id, {
      fields: {
        u: 1,
        rid: 1,
        file: 1,
        ts: 1
      }
    });

    if (originalMessage == null || userId === originalMessage.u._id) {
      throw new Meteor.Error('error-action-not-allowed', 'Not allowed', {
        method: 'unreadMessages',
        action: 'Unread_messages'
      });
    }

    const lastSeen = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(originalMessage.rid, userId).ls;

    if (firstUnreadMessage.ts >= lastSeen) {
      return logger.connection.debug('Provided message is already marked as unread');
    }

    logger.connection.debug(`Updating unread  message of ${originalMessage.ts} as the first unread`);
    return RocketChat.models.Subscriptions.setAsUnreadByRoomIdAndUserId(originalMessage.rid, userId, originalMessage.ts);
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:message-mark-as-unread/server/logger.js");
require("/node_modules/meteor/rocketchat:message-mark-as-unread/server/unreadMessages.js");

/* Exports */
Package._define("rocketchat:message-mark-as-unread");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_message-mark-as-unread.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptZXNzYWdlLW1hcmstYXMtdW5yZWFkL3NlcnZlci9sb2dnZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWVzc2FnZS1tYXJrLWFzLXVucmVhZC9zZXJ2ZXIvdW5yZWFkTWVzc2FnZXMuanMiXSwibmFtZXMiOlsibG9nZ2VyIiwiTG9nZ2VyIiwic2VjdGlvbnMiLCJjb25uZWN0aW9uIiwiZXZlbnRzIiwibW9kdWxlIiwiZXhwb3J0RGVmYXVsdCIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiTWV0ZW9yIiwibWV0aG9kcyIsInVucmVhZE1lc3NhZ2VzIiwiZmlyc3RVbnJlYWRNZXNzYWdlIiwicm9vbSIsInVzZXJJZCIsIkVycm9yIiwibWV0aG9kIiwibGFzdE1lc3NhZ2UiLCJSb2NrZXRDaGF0IiwibW9kZWxzIiwiTWVzc2FnZXMiLCJmaW5kVmlzaWJsZUJ5Um9vbUlkIiwibGltaXQiLCJzb3J0IiwidHMiLCJmZXRjaCIsImFjdGlvbiIsIlN1YnNjcmlwdGlvbnMiLCJzZXRBc1VucmVhZEJ5Um9vbUlkQW5kVXNlcklkIiwicmlkIiwib3JpZ2luYWxNZXNzYWdlIiwiZmluZE9uZUJ5SWQiLCJfaWQiLCJmaWVsZHMiLCJ1IiwiZmlsZSIsImxhc3RTZWVuIiwiZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkIiwibHMiLCJkZWJ1ZyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNQSxTQUFTLElBQUlDLE1BQUosQ0FBVyxxQkFBWCxFQUFrQztBQUNoREMsWUFBVTtBQUNUQyxnQkFBWSxZQURIO0FBRVRDLFlBQVE7QUFGQztBQURzQyxDQUFsQyxDQUFmO0FBQUFDLE9BQU9DLGFBQVAsQ0FNZU4sTUFOZixFOzs7Ozs7Ozs7OztBQ0FBLElBQUlBLE1BQUo7QUFBV0ssT0FBT0UsS0FBUCxDQUFhQyxRQUFRLFVBQVIsQ0FBYixFQUFpQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ1YsYUFBT1UsQ0FBUDtBQUFTOztBQUFyQixDQUFqQyxFQUF3RCxDQUF4RDtBQUNYQyxPQUFPQyxPQUFQLENBQWU7QUFDZEMsaUJBQWVDLGtCQUFmLEVBQW1DQyxJQUFuQyxFQUF5QztBQUN4QyxVQUFNQyxTQUFTTCxPQUFPSyxNQUFQLEVBQWY7O0FBQ0EsUUFBSSxDQUFDQSxNQUFMLEVBQWE7QUFDWixZQUFNLElBQUlMLE9BQU9NLEtBQVgsQ0FBaUIsb0JBQWpCLEVBQXVDLGNBQXZDLEVBQXVEO0FBQzVEQyxnQkFBUTtBQURvRCxPQUF2RCxDQUFOO0FBR0E7O0FBRUQsUUFBSUgsSUFBSixFQUFVO0FBQ1QsWUFBTUksY0FBY0MsV0FBV0MsTUFBWCxDQUFrQkMsUUFBbEIsQ0FBMkJDLG1CQUEzQixDQUErQ1IsSUFBL0MsRUFBcUQ7QUFBRVMsZUFBTyxDQUFUO0FBQVlDLGNBQU07QUFBRUMsY0FBSSxDQUFDO0FBQVA7QUFBbEIsT0FBckQsRUFBcUZDLEtBQXJGLEdBQTZGLENBQTdGLENBQXBCOztBQUVBLFVBQUlSLGVBQWUsSUFBbkIsRUFBeUI7QUFDeEIsY0FBTSxJQUFJUixPQUFPTSxLQUFYLENBQWlCLDBCQUFqQixFQUE2QyxhQUE3QyxFQUE0RDtBQUNqRUMsa0JBQVEsZ0JBRHlEO0FBRWpFVSxrQkFBUTtBQUZ5RCxTQUE1RCxDQUFOO0FBSUE7O0FBRUQsYUFBT1IsV0FBV0MsTUFBWCxDQUFrQlEsYUFBbEIsQ0FBZ0NDLDRCQUFoQyxDQUE2RFgsWUFBWVksR0FBekUsRUFBOEVmLE1BQTlFLEVBQXNGRyxZQUFZTyxFQUFsRyxDQUFQO0FBQ0E7O0FBRUQsVUFBTU0sa0JBQWtCWixXQUFXQyxNQUFYLENBQWtCQyxRQUFsQixDQUEyQlcsV0FBM0IsQ0FBdUNuQixtQkFBbUJvQixHQUExRCxFQUErRDtBQUN0RkMsY0FBUTtBQUNQQyxXQUFHLENBREk7QUFFUEwsYUFBSyxDQUZFO0FBR1BNLGNBQU0sQ0FIQztBQUlQWCxZQUFJO0FBSkc7QUFEOEUsS0FBL0QsQ0FBeEI7O0FBUUEsUUFBSU0sbUJBQW1CLElBQW5CLElBQTJCaEIsV0FBV2dCLGdCQUFnQkksQ0FBaEIsQ0FBa0JGLEdBQTVELEVBQWlFO0FBQ2hFLFlBQU0sSUFBSXZCLE9BQU9NLEtBQVgsQ0FBaUIsMEJBQWpCLEVBQTZDLGFBQTdDLEVBQTREO0FBQ2pFQyxnQkFBUSxnQkFEeUQ7QUFFakVVLGdCQUFRO0FBRnlELE9BQTVELENBQU47QUFJQTs7QUFDRCxVQUFNVSxXQUFXbEIsV0FBV0MsTUFBWCxDQUFrQlEsYUFBbEIsQ0FBZ0NVLHdCQUFoQyxDQUF5RFAsZ0JBQWdCRCxHQUF6RSxFQUE4RWYsTUFBOUUsRUFBc0Z3QixFQUF2Rzs7QUFDQSxRQUFJMUIsbUJBQW1CWSxFQUFuQixJQUF5QlksUUFBN0IsRUFBdUM7QUFDdEMsYUFBT3RDLE9BQU9HLFVBQVAsQ0FBa0JzQyxLQUFsQixDQUF3Qiw4Q0FBeEIsQ0FBUDtBQUNBOztBQUNEekMsV0FBT0csVUFBUCxDQUFrQnNDLEtBQWxCLENBQXlCLCtCQUErQlQsZ0JBQWdCTixFQUFJLHNCQUE1RTtBQUNBLFdBQU9OLFdBQVdDLE1BQVgsQ0FBa0JRLGFBQWxCLENBQWdDQyw0QkFBaEMsQ0FBNkRFLGdCQUFnQkQsR0FBN0UsRUFBa0ZmLE1BQWxGLEVBQTBGZ0IsZ0JBQWdCTixFQUExRyxDQUFQO0FBQ0E7O0FBMUNhLENBQWYsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9tZXNzYWdlLW1hcmstYXMtdW5yZWFkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcignTWVzc2FnZU1hcmtBc1VucmVhZCcsIHtcblx0c2VjdGlvbnM6IHtcblx0XHRjb25uZWN0aW9uOiAnQ29ubmVjdGlvbicsXG5cdFx0ZXZlbnRzOiAnRXZlbnRzJyxcblx0fSxcbn0pO1xuZXhwb3J0IGRlZmF1bHQgbG9nZ2VyO1xuIiwiaW1wb3J0IGxvZ2dlciBmcm9tICcuL2xvZ2dlcic7XG5NZXRlb3IubWV0aG9kcyh7XG5cdHVucmVhZE1lc3NhZ2VzKGZpcnN0VW5yZWFkTWVzc2FnZSwgcm9vbSkge1xuXHRcdGNvbnN0IHVzZXJJZCA9IE1ldGVvci51c2VySWQoKTtcblx0XHRpZiAoIXVzZXJJZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHtcblx0XHRcdFx0bWV0aG9kOiAndW5yZWFkTWVzc2FnZXMnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKHJvb20pIHtcblx0XHRcdGNvbnN0IGxhc3RNZXNzYWdlID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZFZpc2libGVCeVJvb21JZChyb29tLCB7IGxpbWl0OiAxLCBzb3J0OiB7IHRzOiAtMSB9IH0pLmZldGNoKClbMF07XG5cblx0XHRcdGlmIChsYXN0TWVzc2FnZSA9PSBudWxsKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0XHRtZXRob2Q6ICd1bnJlYWRNZXNzYWdlcycsXG5cdFx0XHRcdFx0YWN0aW9uOiAnVW5yZWFkX21lc3NhZ2VzJyxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnNldEFzVW5yZWFkQnlSb29tSWRBbmRVc2VySWQobGFzdE1lc3NhZ2UucmlkLCB1c2VySWQsIGxhc3RNZXNzYWdlLnRzKTtcblx0XHR9XG5cblx0XHRjb25zdCBvcmlnaW5hbE1lc3NhZ2UgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZChmaXJzdFVucmVhZE1lc3NhZ2UuX2lkLCB7XG5cdFx0XHRmaWVsZHM6IHtcblx0XHRcdFx0dTogMSxcblx0XHRcdFx0cmlkOiAxLFxuXHRcdFx0XHRmaWxlOiAxLFxuXHRcdFx0XHR0czogMSxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0aWYgKG9yaWdpbmFsTWVzc2FnZSA9PSBudWxsIHx8IHVzZXJJZCA9PT0gb3JpZ2luYWxNZXNzYWdlLnUuX2lkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3VucmVhZE1lc3NhZ2VzJyxcblx0XHRcdFx0YWN0aW9uOiAnVW5yZWFkX21lc3NhZ2VzJyxcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRjb25zdCBsYXN0U2VlbiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKG9yaWdpbmFsTWVzc2FnZS5yaWQsIHVzZXJJZCkubHM7XG5cdFx0aWYgKGZpcnN0VW5yZWFkTWVzc2FnZS50cyA+PSBsYXN0U2Vlbikge1xuXHRcdFx0cmV0dXJuIGxvZ2dlci5jb25uZWN0aW9uLmRlYnVnKCdQcm92aWRlZCBtZXNzYWdlIGlzIGFscmVhZHkgbWFya2VkIGFzIHVucmVhZCcpO1xuXHRcdH1cblx0XHRsb2dnZXIuY29ubmVjdGlvbi5kZWJ1ZyhgVXBkYXRpbmcgdW5yZWFkICBtZXNzYWdlIG9mICR7IG9yaWdpbmFsTWVzc2FnZS50cyB9IGFzIHRoZSBmaXJzdCB1bnJlYWRgKTtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5zZXRBc1VucmVhZEJ5Um9vbUlkQW5kVXNlcklkKG9yaWdpbmFsTWVzc2FnZS5yaWQsIHVzZXJJZCwgb3JpZ2luYWxNZXNzYWdlLnRzKTtcblx0fSxcbn0pO1xuIl19
