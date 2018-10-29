(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var check = Package.check.check;
var Match = Package.check.Match;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:slashcommands-msg":{"server.js":function(){

///////////////////////////////////////////////////////////////////////////////////////
//                                                                                   //
// packages/rocketchat_slashcommands-msg/server.js                                   //
//                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////
                                                                                     //
/*
* Msg is a named function that will replace /msg commands
*/
function Msg(command, params, item) {
  if (command !== 'msg' || !Match.test(params, String)) {
    return;
  }

  const trimmedParams = params.trim();
  const separator = trimmedParams.indexOf(' ');
  const user = Meteor.users.findOne(Meteor.userId());

  if (separator === -1) {
    return RocketChat.Notifications.notifyUser(Meteor.userId(), 'message', {
      _id: Random.id(),
      rid: item.rid,
      ts: new Date(),
      msg: TAPi18n.__('Username_and_message_must_not_be_empty', null, user.language)
    });
  }

  const message = trimmedParams.slice(separator + 1);
  const targetUsernameOrig = trimmedParams.slice(0, separator);
  const targetUsername = targetUsernameOrig.replace('@', '');
  const targetUser = RocketChat.models.Users.findOneByUsername(targetUsername);

  if (targetUser == null) {
    RocketChat.Notifications.notifyUser(Meteor.userId(), 'message', {
      _id: Random.id(),
      rid: item.rid,
      ts: new Date(),
      msg: TAPi18n.__('Username_doesnt_exist', {
        postProcess: 'sprintf',
        sprintf: [targetUsernameOrig]
      }, user.language)
    });
    return;
  }

  const {
    rid
  } = Meteor.call('createDirectMessage', targetUsername);
  const msgObject = {
    _id: Random.id(),
    rid,
    msg: message
  };
  Meteor.call('sendMessage', msgObject);
}

RocketChat.slashCommands.add('msg', Msg, {
  description: 'Direct_message_someone',
  params: '@username <message>'
});
///////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:slashcommands-msg/server.js");

/* Exports */
Package._define("rocketchat:slashcommands-msg");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_slashcommands-msg.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbGFzaGNvbW1hbmRzLW1zZy9zZXJ2ZXIuanMiXSwibmFtZXMiOlsiTXNnIiwiY29tbWFuZCIsInBhcmFtcyIsIml0ZW0iLCJNYXRjaCIsInRlc3QiLCJTdHJpbmciLCJ0cmltbWVkUGFyYW1zIiwidHJpbSIsInNlcGFyYXRvciIsImluZGV4T2YiLCJ1c2VyIiwiTWV0ZW9yIiwidXNlcnMiLCJmaW5kT25lIiwidXNlcklkIiwiUm9ja2V0Q2hhdCIsIk5vdGlmaWNhdGlvbnMiLCJub3RpZnlVc2VyIiwiX2lkIiwiUmFuZG9tIiwiaWQiLCJyaWQiLCJ0cyIsIkRhdGUiLCJtc2ciLCJUQVBpMThuIiwiX18iLCJsYW5ndWFnZSIsIm1lc3NhZ2UiLCJzbGljZSIsInRhcmdldFVzZXJuYW1lT3JpZyIsInRhcmdldFVzZXJuYW1lIiwicmVwbGFjZSIsInRhcmdldFVzZXIiLCJtb2RlbHMiLCJVc2VycyIsImZpbmRPbmVCeVVzZXJuYW1lIiwicG9zdFByb2Nlc3MiLCJzcHJpbnRmIiwiY2FsbCIsIm1zZ09iamVjdCIsInNsYXNoQ29tbWFuZHMiLCJhZGQiLCJkZXNjcmlwdGlvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0E7OztBQUlBLFNBQVNBLEdBQVQsQ0FBYUMsT0FBYixFQUFzQkMsTUFBdEIsRUFBOEJDLElBQTlCLEVBQW9DO0FBQ25DLE1BQUlGLFlBQVksS0FBWixJQUFxQixDQUFDRyxNQUFNQyxJQUFOLENBQVdILE1BQVgsRUFBbUJJLE1BQW5CLENBQTFCLEVBQXNEO0FBQ3JEO0FBQ0E7O0FBQ0QsUUFBTUMsZ0JBQWdCTCxPQUFPTSxJQUFQLEVBQXRCO0FBQ0EsUUFBTUMsWUFBWUYsY0FBY0csT0FBZCxDQUFzQixHQUF0QixDQUFsQjtBQUNBLFFBQU1DLE9BQU9DLE9BQU9DLEtBQVAsQ0FBYUMsT0FBYixDQUFxQkYsT0FBT0csTUFBUCxFQUFyQixDQUFiOztBQUNBLE1BQUlOLGNBQWMsQ0FBQyxDQUFuQixFQUFzQjtBQUNyQixXQUFPTyxXQUFXQyxhQUFYLENBQXlCQyxVQUF6QixDQUFvQ04sT0FBT0csTUFBUCxFQUFwQyxFQUFxRCxTQUFyRCxFQUFnRTtBQUN0RUksV0FBS0MsT0FBT0MsRUFBUCxFQURpRTtBQUV0RUMsV0FBS25CLEtBQUttQixHQUY0RDtBQUd0RUMsVUFBSSxJQUFJQyxJQUFKLEVBSGtFO0FBSXRFQyxXQUFLQyxRQUFRQyxFQUFSLENBQVcsd0NBQVgsRUFBcUQsSUFBckQsRUFBMkRoQixLQUFLaUIsUUFBaEU7QUFKaUUsS0FBaEUsQ0FBUDtBQU1BOztBQUNELFFBQU1DLFVBQVV0QixjQUFjdUIsS0FBZCxDQUFvQnJCLFlBQVksQ0FBaEMsQ0FBaEI7QUFDQSxRQUFNc0IscUJBQXFCeEIsY0FBY3VCLEtBQWQsQ0FBb0IsQ0FBcEIsRUFBdUJyQixTQUF2QixDQUEzQjtBQUNBLFFBQU11QixpQkFBaUJELG1CQUFtQkUsT0FBbkIsQ0FBMkIsR0FBM0IsRUFBZ0MsRUFBaEMsQ0FBdkI7QUFDQSxRQUFNQyxhQUFhbEIsV0FBV21CLE1BQVgsQ0FBa0JDLEtBQWxCLENBQXdCQyxpQkFBeEIsQ0FBMENMLGNBQTFDLENBQW5COztBQUNBLE1BQUlFLGNBQWMsSUFBbEIsRUFBd0I7QUFDdkJsQixlQUFXQyxhQUFYLENBQXlCQyxVQUF6QixDQUFvQ04sT0FBT0csTUFBUCxFQUFwQyxFQUFxRCxTQUFyRCxFQUFnRTtBQUMvREksV0FBS0MsT0FBT0MsRUFBUCxFQUQwRDtBQUUvREMsV0FBS25CLEtBQUttQixHQUZxRDtBQUcvREMsVUFBSSxJQUFJQyxJQUFKLEVBSDJEO0FBSS9EQyxXQUFLQyxRQUFRQyxFQUFSLENBQVcsdUJBQVgsRUFBb0M7QUFDeENXLHFCQUFhLFNBRDJCO0FBRXhDQyxpQkFBUyxDQUFDUixrQkFBRDtBQUYrQixPQUFwQyxFQUdGcEIsS0FBS2lCLFFBSEg7QUFKMEQsS0FBaEU7QUFTQTtBQUNBOztBQUNELFFBQU07QUFBRU47QUFBRixNQUFVVixPQUFPNEIsSUFBUCxDQUFZLHFCQUFaLEVBQW1DUixjQUFuQyxDQUFoQjtBQUNBLFFBQU1TLFlBQVk7QUFDakJ0QixTQUFLQyxPQUFPQyxFQUFQLEVBRFk7QUFFakJDLE9BRmlCO0FBR2pCRyxTQUFLSTtBQUhZLEdBQWxCO0FBS0FqQixTQUFPNEIsSUFBUCxDQUFZLGFBQVosRUFBMkJDLFNBQTNCO0FBQ0E7O0FBRUR6QixXQUFXMEIsYUFBWCxDQUF5QkMsR0FBekIsQ0FBNkIsS0FBN0IsRUFBb0MzQyxHQUFwQyxFQUF5QztBQUN4QzRDLGVBQWEsd0JBRDJCO0FBRXhDMUMsVUFBUTtBQUZnQyxDQUF6QyxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X3NsYXNoY29tbWFuZHMtbXNnLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKlxuKiBNc2cgaXMgYSBuYW1lZCBmdW5jdGlvbiB0aGF0IHdpbGwgcmVwbGFjZSAvbXNnIGNvbW1hbmRzXG4qL1xuXG5mdW5jdGlvbiBNc2coY29tbWFuZCwgcGFyYW1zLCBpdGVtKSB7XG5cdGlmIChjb21tYW5kICE9PSAnbXNnJyB8fCAhTWF0Y2gudGVzdChwYXJhbXMsIFN0cmluZykpIHtcblx0XHRyZXR1cm47XG5cdH1cblx0Y29uc3QgdHJpbW1lZFBhcmFtcyA9IHBhcmFtcy50cmltKCk7XG5cdGNvbnN0IHNlcGFyYXRvciA9IHRyaW1tZWRQYXJhbXMuaW5kZXhPZignICcpO1xuXHRjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUoTWV0ZW9yLnVzZXJJZCgpKTtcblx0aWYgKHNlcGFyYXRvciA9PT0gLTEpIHtcblx0XHRyZXR1cm5cdFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlVc2VyKE1ldGVvci51c2VySWQoKSwgJ21lc3NhZ2UnLCB7XG5cdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0cmlkOiBpdGVtLnJpZCxcblx0XHRcdHRzOiBuZXcgRGF0ZSxcblx0XHRcdG1zZzogVEFQaTE4bi5fXygnVXNlcm5hbWVfYW5kX21lc3NhZ2VfbXVzdF9ub3RfYmVfZW1wdHknLCBudWxsLCB1c2VyLmxhbmd1YWdlKSxcblx0XHR9KTtcblx0fVxuXHRjb25zdCBtZXNzYWdlID0gdHJpbW1lZFBhcmFtcy5zbGljZShzZXBhcmF0b3IgKyAxKTtcblx0Y29uc3QgdGFyZ2V0VXNlcm5hbWVPcmlnID0gdHJpbW1lZFBhcmFtcy5zbGljZSgwLCBzZXBhcmF0b3IpO1xuXHRjb25zdCB0YXJnZXRVc2VybmFtZSA9IHRhcmdldFVzZXJuYW1lT3JpZy5yZXBsYWNlKCdAJywgJycpO1xuXHRjb25zdCB0YXJnZXRVc2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUodGFyZ2V0VXNlcm5hbWUpO1xuXHRpZiAodGFyZ2V0VXNlciA9PSBudWxsKSB7XG5cdFx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeVVzZXIoTWV0ZW9yLnVzZXJJZCgpLCAnbWVzc2FnZScsIHtcblx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRyaWQ6IGl0ZW0ucmlkLFxuXHRcdFx0dHM6IG5ldyBEYXRlLFxuXHRcdFx0bXNnOiBUQVBpMThuLl9fKCdVc2VybmFtZV9kb2VzbnRfZXhpc3QnLCB7XG5cdFx0XHRcdHBvc3RQcm9jZXNzOiAnc3ByaW50ZicsXG5cdFx0XHRcdHNwcmludGY6IFt0YXJnZXRVc2VybmFtZU9yaWddLFxuXHRcdFx0fSwgdXNlci5sYW5ndWFnZSksXG5cdFx0fSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGNvbnN0IHsgcmlkIH0gPSBNZXRlb3IuY2FsbCgnY3JlYXRlRGlyZWN0TWVzc2FnZScsIHRhcmdldFVzZXJuYW1lKTtcblx0Y29uc3QgbXNnT2JqZWN0ID0ge1xuXHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0cmlkLFxuXHRcdG1zZzogbWVzc2FnZSxcblx0fTtcblx0TWV0ZW9yLmNhbGwoJ3NlbmRNZXNzYWdlJywgbXNnT2JqZWN0KTtcbn1cblxuUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmFkZCgnbXNnJywgTXNnLCB7XG5cdGRlc2NyaXB0aW9uOiAnRGlyZWN0X21lc3NhZ2Vfc29tZW9uZScsXG5cdHBhcmFtczogJ0B1c2VybmFtZSA8bWVzc2FnZT4nLFxufSk7XG4iXX0=
