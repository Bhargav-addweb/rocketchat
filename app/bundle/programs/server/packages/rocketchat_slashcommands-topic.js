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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:slashcommands-topic":{"topic.js":function(){

//////////////////////////////////////////////////////////////////////////////////////
//                                                                                  //
// packages/rocketchat_slashcommands-topic/topic.js                                 //
//                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////
                                                                                    //
/*
 * Join is a named function that will replace /topic commands
 * @param {Object} message - The message object
 */
function Topic(command, params, item) {
  if (command === 'topic') {
    if (Meteor.isClient && RocketChat.authz.hasAtLeastOnePermission('edit-room', item.rid) || Meteor.isServer && RocketChat.authz.hasPermission(Meteor.userId(), 'edit-room', item.rid)) {
      Meteor.call('saveRoomSettings', item.rid, 'roomTopic', params, err => {
        if (err) {
          if (Meteor.isClient) {
            return handleError(err);
          } else {
            throw err;
          }
        }

        if (Meteor.isClient) {
          RocketChat.callbacks.run('roomTopicChanged', ChatRoom.findOne(item.rid));
        }
      });
    }
  }
}

RocketChat.slashCommands.add('topic', Topic, {
  description: 'Slash_Topic_Description',
  params: 'Slash_Topic_Params'
});
//////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:slashcommands-topic/topic.js");

/* Exports */
Package._define("rocketchat:slashcommands-topic");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_slashcommands-topic.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbGFzaGNvbW1hbmRzLXRvcGljL3RvcGljLmpzIl0sIm5hbWVzIjpbIlRvcGljIiwiY29tbWFuZCIsInBhcmFtcyIsIml0ZW0iLCJNZXRlb3IiLCJpc0NsaWVudCIsIlJvY2tldENoYXQiLCJhdXRoeiIsImhhc0F0TGVhc3RPbmVQZXJtaXNzaW9uIiwicmlkIiwiaXNTZXJ2ZXIiLCJoYXNQZXJtaXNzaW9uIiwidXNlcklkIiwiY2FsbCIsImVyciIsImhhbmRsZUVycm9yIiwiY2FsbGJhY2tzIiwicnVuIiwiQ2hhdFJvb20iLCJmaW5kT25lIiwic2xhc2hDb21tYW5kcyIsImFkZCIsImRlc2NyaXB0aW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7Ozs7QUFLQSxTQUFTQSxLQUFULENBQWVDLE9BQWYsRUFBd0JDLE1BQXhCLEVBQWdDQyxJQUFoQyxFQUFzQztBQUNyQyxNQUFJRixZQUFZLE9BQWhCLEVBQXlCO0FBQ3hCLFFBQUtHLE9BQU9DLFFBQVAsSUFBbUJDLFdBQVdDLEtBQVgsQ0FBaUJDLHVCQUFqQixDQUF5QyxXQUF6QyxFQUFzREwsS0FBS00sR0FBM0QsQ0FBcEIsSUFBeUZMLE9BQU9NLFFBQVAsSUFBbUJKLFdBQVdDLEtBQVgsQ0FBaUJJLGFBQWpCLENBQStCUCxPQUFPUSxNQUFQLEVBQS9CLEVBQWdELFdBQWhELEVBQTZEVCxLQUFLTSxHQUFsRSxDQUFoSCxFQUF5TDtBQUN4TEwsYUFBT1MsSUFBUCxDQUFZLGtCQUFaLEVBQWdDVixLQUFLTSxHQUFyQyxFQUEwQyxXQUExQyxFQUF1RFAsTUFBdkQsRUFBZ0VZLEdBQUQsSUFBUztBQUN2RSxZQUFJQSxHQUFKLEVBQVM7QUFDUixjQUFJVixPQUFPQyxRQUFYLEVBQXFCO0FBQ3BCLG1CQUFPVSxZQUFZRCxHQUFaLENBQVA7QUFDQSxXQUZELE1BRU87QUFDTixrQkFBTUEsR0FBTjtBQUNBO0FBQ0Q7O0FBRUQsWUFBSVYsT0FBT0MsUUFBWCxFQUFxQjtBQUNwQkMscUJBQVdVLFNBQVgsQ0FBcUJDLEdBQXJCLENBQXlCLGtCQUF6QixFQUE2Q0MsU0FBU0MsT0FBVCxDQUFpQmhCLEtBQUtNLEdBQXRCLENBQTdDO0FBQ0E7QUFDRCxPQVpEO0FBYUE7QUFDRDtBQUNEOztBQUVESCxXQUFXYyxhQUFYLENBQXlCQyxHQUF6QixDQUE2QixPQUE3QixFQUFzQ3JCLEtBQXRDLEVBQTZDO0FBQzVDc0IsZUFBYSx5QkFEK0I7QUFFNUNwQixVQUFRO0FBRm9DLENBQTdDLEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfc2xhc2hjb21tYW5kcy10b3BpYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBKb2luIGlzIGEgbmFtZWQgZnVuY3Rpb24gdGhhdCB3aWxsIHJlcGxhY2UgL3RvcGljIGNvbW1hbmRzXG4gKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSAtIFRoZSBtZXNzYWdlIG9iamVjdFxuICovXG5cbmZ1bmN0aW9uIFRvcGljKGNvbW1hbmQsIHBhcmFtcywgaXRlbSkge1xuXHRpZiAoY29tbWFuZCA9PT0gJ3RvcGljJykge1xuXHRcdGlmICgoTWV0ZW9yLmlzQ2xpZW50ICYmIFJvY2tldENoYXQuYXV0aHouaGFzQXRMZWFzdE9uZVBlcm1pc3Npb24oJ2VkaXQtcm9vbScsIGl0ZW0ucmlkKSkgfHwgKE1ldGVvci5pc1NlcnZlciAmJiBSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAnZWRpdC1yb29tJywgaXRlbS5yaWQpKSkge1xuXHRcdFx0TWV0ZW9yLmNhbGwoJ3NhdmVSb29tU2V0dGluZ3MnLCBpdGVtLnJpZCwgJ3Jvb21Ub3BpYycsIHBhcmFtcywgKGVycikgPT4ge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0aWYgKE1ldGVvci5pc0NsaWVudCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGhhbmRsZUVycm9yKGVycik7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRocm93IGVycjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MucnVuKCdyb29tVG9waWNDaGFuZ2VkJywgQ2hhdFJvb20uZmluZE9uZShpdGVtLnJpZCkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmFkZCgndG9waWMnLCBUb3BpYywge1xuXHRkZXNjcmlwdGlvbjogJ1NsYXNoX1RvcGljX0Rlc2NyaXB0aW9uJyxcblx0cGFyYW1zOiAnU2xhc2hfVG9waWNfUGFyYW1zJyxcbn0pO1xuIl19
