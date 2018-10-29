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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:slashcommands-kick":{"server":{"server.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/rocketchat_slashcommands-kick/server/server.js                                       //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
// Kick is a named function that will replace /kick commands
const Kick = function (command, params, {
  rid
}) {
  if (command !== 'kick' || !Match.test(params, String)) {
    return;
  }

  const username = params.trim().replace('@', '');

  if (username === '') {
    return;
  }

  const userId = Meteor.userId();
  const user = Meteor.users.findOne(userId);
  const kickedUser = RocketChat.models.Users.findOneByUsername(username);

  if (kickedUser == null) {
    return RocketChat.Notifications.notifyUser(userId, 'message', {
      _id: Random.id(),
      rid,
      ts: new Date(),
      msg: TAPi18n.__('Username_doesnt_exist', {
        postProcess: 'sprintf',
        sprintf: [username]
      }, user.language)
    });
  }

  const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(rid, user._id, {
    fields: {
      _id: 1
    }
  });

  if (!subscription) {
    return RocketChat.Notifications.notifyUser(userId, 'message', {
      _id: Random.id(),
      rid,
      ts: new Date(),
      msg: TAPi18n.__('Username_is_not_in_this_room', {
        postProcess: 'sprintf',
        sprintf: [username]
      }, user.language)
    });
  }

  Meteor.call('removeUserFromRoom', {
    rid,
    username
  });
};

RocketChat.slashCommands.add('kick', Kick, {
  description: 'Remove_someone_from_room',
  params: '@username',
  permission: 'remove-user'
});
///////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:slashcommands-kick/server/server.js");

/* Exports */
Package._define("rocketchat:slashcommands-kick");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_slashcommands-kick.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbGFzaGNvbW1hbmRzLWtpY2svc2VydmVyL3NlcnZlci5qcyJdLCJuYW1lcyI6WyJLaWNrIiwiY29tbWFuZCIsInBhcmFtcyIsInJpZCIsIk1hdGNoIiwidGVzdCIsIlN0cmluZyIsInVzZXJuYW1lIiwidHJpbSIsInJlcGxhY2UiLCJ1c2VySWQiLCJNZXRlb3IiLCJ1c2VyIiwidXNlcnMiLCJmaW5kT25lIiwia2lja2VkVXNlciIsIlJvY2tldENoYXQiLCJtb2RlbHMiLCJVc2VycyIsImZpbmRPbmVCeVVzZXJuYW1lIiwiTm90aWZpY2F0aW9ucyIsIm5vdGlmeVVzZXIiLCJfaWQiLCJSYW5kb20iLCJpZCIsInRzIiwiRGF0ZSIsIm1zZyIsIlRBUGkxOG4iLCJfXyIsInBvc3RQcm9jZXNzIiwic3ByaW50ZiIsImxhbmd1YWdlIiwic3Vic2NyaXB0aW9uIiwiU3Vic2NyaXB0aW9ucyIsImZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZCIsImZpZWxkcyIsImNhbGwiLCJzbGFzaENvbW1hbmRzIiwiYWRkIiwiZGVzY3JpcHRpb24iLCJwZXJtaXNzaW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQTtBQUVBLE1BQU1BLE9BQU8sVUFBU0MsT0FBVCxFQUFrQkMsTUFBbEIsRUFBMEI7QUFBRUM7QUFBRixDQUExQixFQUFtQztBQUMvQyxNQUFJRixZQUFZLE1BQVosSUFBc0IsQ0FBQ0csTUFBTUMsSUFBTixDQUFXSCxNQUFYLEVBQW1CSSxNQUFuQixDQUEzQixFQUF1RDtBQUN0RDtBQUNBOztBQUNELFFBQU1DLFdBQVdMLE9BQU9NLElBQVAsR0FBY0MsT0FBZCxDQUFzQixHQUF0QixFQUEyQixFQUEzQixDQUFqQjs7QUFDQSxNQUFJRixhQUFhLEVBQWpCLEVBQXFCO0FBQ3BCO0FBQ0E7O0FBQ0QsUUFBTUcsU0FBU0MsT0FBT0QsTUFBUCxFQUFmO0FBQ0EsUUFBTUUsT0FBT0QsT0FBT0UsS0FBUCxDQUFhQyxPQUFiLENBQXFCSixNQUFyQixDQUFiO0FBQ0EsUUFBTUssYUFBYUMsV0FBV0MsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0JDLGlCQUF4QixDQUEwQ1osUUFBMUMsQ0FBbkI7O0FBRUEsTUFBSVEsY0FBYyxJQUFsQixFQUF3QjtBQUN2QixXQUFPQyxXQUFXSSxhQUFYLENBQXlCQyxVQUF6QixDQUFvQ1gsTUFBcEMsRUFBNEMsU0FBNUMsRUFBdUQ7QUFDN0RZLFdBQUtDLE9BQU9DLEVBQVAsRUFEd0Q7QUFFN0RyQixTQUY2RDtBQUc3RHNCLFVBQUksSUFBSUMsSUFBSixFQUh5RDtBQUk3REMsV0FBS0MsUUFBUUMsRUFBUixDQUFXLHVCQUFYLEVBQW9DO0FBQ3hDQyxxQkFBYSxTQUQyQjtBQUV4Q0MsaUJBQVMsQ0FBQ3hCLFFBQUQ7QUFGK0IsT0FBcEMsRUFHRkssS0FBS29CLFFBSEg7QUFKd0QsS0FBdkQsQ0FBUDtBQVNBOztBQUVELFFBQU1DLGVBQWVqQixXQUFXQyxNQUFYLENBQWtCaUIsYUFBbEIsQ0FBZ0NDLHdCQUFoQyxDQUF5RGhDLEdBQXpELEVBQThEUyxLQUFLVSxHQUFuRSxFQUF3RTtBQUFFYyxZQUFRO0FBQUVkLFdBQUs7QUFBUDtBQUFWLEdBQXhFLENBQXJCOztBQUNBLE1BQUksQ0FBQ1csWUFBTCxFQUFtQjtBQUNsQixXQUFPakIsV0FBV0ksYUFBWCxDQUF5QkMsVUFBekIsQ0FBb0NYLE1BQXBDLEVBQTRDLFNBQTVDLEVBQXVEO0FBQzdEWSxXQUFLQyxPQUFPQyxFQUFQLEVBRHdEO0FBRTdEckIsU0FGNkQ7QUFHN0RzQixVQUFJLElBQUlDLElBQUosRUFIeUQ7QUFJN0RDLFdBQUtDLFFBQVFDLEVBQVIsQ0FBVyw4QkFBWCxFQUEyQztBQUMvQ0MscUJBQWEsU0FEa0M7QUFFL0NDLGlCQUFTLENBQUN4QixRQUFEO0FBRnNDLE9BQTNDLEVBR0ZLLEtBQUtvQixRQUhIO0FBSndELEtBQXZELENBQVA7QUFTQTs7QUFDRHJCLFNBQU8wQixJQUFQLENBQVksb0JBQVosRUFBa0M7QUFBRWxDLE9BQUY7QUFBT0k7QUFBUCxHQUFsQztBQUNBLENBckNEOztBQXVDQVMsV0FBV3NCLGFBQVgsQ0FBeUJDLEdBQXpCLENBQTZCLE1BQTdCLEVBQXFDdkMsSUFBckMsRUFBMkM7QUFDMUN3QyxlQUFhLDBCQUQ2QjtBQUUxQ3RDLFVBQVEsV0FGa0M7QUFHMUN1QyxjQUFZO0FBSDhCLENBQTNDLEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfc2xhc2hjb21tYW5kcy1raWNrLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vLyBLaWNrIGlzIGEgbmFtZWQgZnVuY3Rpb24gdGhhdCB3aWxsIHJlcGxhY2UgL2tpY2sgY29tbWFuZHNcblxuY29uc3QgS2ljayA9IGZ1bmN0aW9uKGNvbW1hbmQsIHBhcmFtcywgeyByaWQgfSkge1xuXHRpZiAoY29tbWFuZCAhPT0gJ2tpY2snIHx8ICFNYXRjaC50ZXN0KHBhcmFtcywgU3RyaW5nKSkge1xuXHRcdHJldHVybjtcblx0fVxuXHRjb25zdCB1c2VybmFtZSA9IHBhcmFtcy50cmltKCkucmVwbGFjZSgnQCcsICcnKTtcblx0aWYgKHVzZXJuYW1lID09PSAnJykge1xuXHRcdHJldHVybjtcblx0fVxuXHRjb25zdCB1c2VySWQgPSBNZXRlb3IudXNlcklkKCk7XG5cdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh1c2VySWQpO1xuXHRjb25zdCBraWNrZWRVc2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUodXNlcm5hbWUpO1xuXG5cdGlmIChraWNrZWRVc2VyID09IG51bGwpIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeVVzZXIodXNlcklkLCAnbWVzc2FnZScsIHtcblx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRyaWQsXG5cdFx0XHR0czogbmV3IERhdGUsXG5cdFx0XHRtc2c6IFRBUGkxOG4uX18oJ1VzZXJuYW1lX2RvZXNudF9leGlzdCcsIHtcblx0XHRcdFx0cG9zdFByb2Nlc3M6ICdzcHJpbnRmJyxcblx0XHRcdFx0c3ByaW50ZjogW3VzZXJuYW1lXSxcblx0XHRcdH0sIHVzZXIubGFuZ3VhZ2UpLFxuXHRcdH0pO1xuXHR9XG5cblx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocmlkLCB1c2VyLl9pZCwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cdGlmICghc3Vic2NyaXB0aW9uKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlVc2VyKHVzZXJJZCwgJ21lc3NhZ2UnLCB7XG5cdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0cmlkLFxuXHRcdFx0dHM6IG5ldyBEYXRlLFxuXHRcdFx0bXNnOiBUQVBpMThuLl9fKCdVc2VybmFtZV9pc19ub3RfaW5fdGhpc19yb29tJywge1xuXHRcdFx0XHRwb3N0UHJvY2VzczogJ3NwcmludGYnLFxuXHRcdFx0XHRzcHJpbnRmOiBbdXNlcm5hbWVdLFxuXHRcdFx0fSwgdXNlci5sYW5ndWFnZSksXG5cdFx0fSk7XG5cdH1cblx0TWV0ZW9yLmNhbGwoJ3JlbW92ZVVzZXJGcm9tUm9vbScsIHsgcmlkLCB1c2VybmFtZSB9KTtcbn07XG5cblJvY2tldENoYXQuc2xhc2hDb21tYW5kcy5hZGQoJ2tpY2snLCBLaWNrLCB7XG5cdGRlc2NyaXB0aW9uOiAnUmVtb3ZlX3NvbWVvbmVfZnJvbV9yb29tJyxcblx0cGFyYW1zOiAnQHVzZXJuYW1lJyxcblx0cGVybWlzc2lvbjogJ3JlbW92ZS11c2VyJyxcbn0pO1xuIl19
