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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:slashcommands-invite":{"server":{"server.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                      //
// packages/rocketchat_slashcommands-invite/server/server.js                                            //
//                                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                        //
/*
* Invite is a named function that will replace /invite commands
* @param {Object} message - The message object
*/
function Invite(command, params, item) {
  if (command !== 'invite' || !Match.test(params, String)) {
    return;
  }

  const usernames = params.replace(/@/g, '').split(/[\s,]/).filter(a => a !== '');

  if (usernames.length === 0) {
    return;
  }

  let users = Meteor.users.find({
    username: {
      $in: usernames
    }
  });
  const userId = Meteor.userId();
  const currentUser = Meteor.users.findOne(userId);

  if (users.count() === 0) {
    RocketChat.Notifications.notifyUser(userId, 'message', {
      _id: Random.id(),
      rid: item.rid,
      ts: new Date(),
      msg: TAPi18n.__('User_doesnt_exist', {
        postProcess: 'sprintf',
        sprintf: [usernames.join(' @')]
      }, currentUser.language)
    });
    return;
  }

  users = users.fetch().filter(function (user) {
    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(item.rid, user._id, {
      fields: {
        _id: 1
      }
    });

    if (subscription == null) {
      return true;
    }

    RocketChat.Notifications.notifyUser(userId, 'message', {
      _id: Random.id(),
      rid: item.rid,
      ts: new Date(),
      msg: TAPi18n.__('Username_is_already_in_here', {
        postProcess: 'sprintf',
        sprintf: [user.username]
      }, currentUser.language)
    });
    return false;
  });
  users.forEach(function (user) {
    try {
      return Meteor.call('addUserToRoom', {
        rid: item.rid,
        username: user.username
      });
    } catch ({
      error
    }) {
      if (error === 'cant-invite-for-direct-room') {
        RocketChat.Notifications.notifyUser(userId, 'message', {
          _id: Random.id(),
          rid: item.rid,
          ts: new Date(),
          msg: TAPi18n.__('Cannot_invite_users_to_direct_rooms', null, currentUser.language)
        });
      } else {
        RocketChat.Notifications.notifyUser(userId, 'message', {
          _id: Random.id(),
          rid: item.rid,
          ts: new Date(),
          msg: TAPi18n.__(error, null, currentUser.language)
        });
      }
    }
  });
}

RocketChat.slashCommands.add('invite', Invite, {
  description: 'Invite_user_to_join_channel',
  params: '@username'
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:slashcommands-invite/server/server.js");

/* Exports */
Package._define("rocketchat:slashcommands-invite");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_slashcommands-invite.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbGFzaGNvbW1hbmRzLWludml0ZS9zZXJ2ZXIvc2VydmVyLmpzIl0sIm5hbWVzIjpbIkludml0ZSIsImNvbW1hbmQiLCJwYXJhbXMiLCJpdGVtIiwiTWF0Y2giLCJ0ZXN0IiwiU3RyaW5nIiwidXNlcm5hbWVzIiwicmVwbGFjZSIsInNwbGl0IiwiZmlsdGVyIiwiYSIsImxlbmd0aCIsInVzZXJzIiwiTWV0ZW9yIiwiZmluZCIsInVzZXJuYW1lIiwiJGluIiwidXNlcklkIiwiY3VycmVudFVzZXIiLCJmaW5kT25lIiwiY291bnQiLCJSb2NrZXRDaGF0IiwiTm90aWZpY2F0aW9ucyIsIm5vdGlmeVVzZXIiLCJfaWQiLCJSYW5kb20iLCJpZCIsInJpZCIsInRzIiwiRGF0ZSIsIm1zZyIsIlRBUGkxOG4iLCJfXyIsInBvc3RQcm9jZXNzIiwic3ByaW50ZiIsImpvaW4iLCJsYW5ndWFnZSIsImZldGNoIiwidXNlciIsInN1YnNjcmlwdGlvbiIsIm1vZGVscyIsIlN1YnNjcmlwdGlvbnMiLCJmaW5kT25lQnlSb29tSWRBbmRVc2VySWQiLCJmaWVsZHMiLCJmb3JFYWNoIiwiY2FsbCIsImVycm9yIiwic2xhc2hDb21tYW5kcyIsImFkZCIsImRlc2NyaXB0aW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQTs7OztBQU1BLFNBQVNBLE1BQVQsQ0FBZ0JDLE9BQWhCLEVBQXlCQyxNQUF6QixFQUFpQ0MsSUFBakMsRUFBdUM7QUFFdEMsTUFBSUYsWUFBWSxRQUFaLElBQXdCLENBQUNHLE1BQU1DLElBQU4sQ0FBV0gsTUFBWCxFQUFtQkksTUFBbkIsQ0FBN0IsRUFBeUQ7QUFDeEQ7QUFDQTs7QUFDRCxRQUFNQyxZQUFZTCxPQUFPTSxPQUFQLENBQWUsSUFBZixFQUFxQixFQUFyQixFQUF5QkMsS0FBekIsQ0FBK0IsT0FBL0IsRUFBd0NDLE1BQXhDLENBQWdEQyxDQUFELElB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a0Q7QUFJdERDLGVBQUtDLFFBQVFDLEVBQVIsQ0FBV2MsS0FBWCxFQUFrQixJQUFsQixFQUF3QjVCLFlBQVlrQixRQUFwQztBQUppRCxTQUF2RDtBQU1BO0FBQ0Q7QUFDRCxHQXhCRDtBQXlCQTs7QUFFRGYsV0FBVzBCLGFBQVgsQ0FBeUJDLEdBQXpCLENBQTZCLFFBQTdCLEVBQXVDakQsTUFBdkMsRUFBK0M7QUFDOUNrRCxlQUFhLDZCQURpQztBQUU5Q2hELFVBQVE7QUFGc0MsQ0FBL0MsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9zbGFzaGNvbW1hbmRzLWludml0ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLypcbiogSW52aXRlIGlzIGEgbmFtZWQgZnVuY3Rpb24gdGhhdCB3aWxsIHJlcGxhY2UgL2ludml0ZSBjb21tYW5kc1xuKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSAtIFRoZSBtZXNzYWdlIG9iamVjdFxuKi9cblxuXG5mdW5jdGlvbiBJbnZpdGUoY29tbWFuZCwgcGFyYW1zLCBpdGVtKSB7XG5cblx0aWYgKGNvbW1hbmQgIT09ICdpbnZpdGUnIHx8ICFNYXRjaC50ZXN0KHBhcmFtcywgU3RyaW5nKSkge1xuXHRcdHJldHVybjtcblx0fVxuXHRjb25zdCB1c2VybmFtZXMgPSBwYXJhbXMucmVwbGFjZSgvQC9nLCAnJykuc3BsaXQoL1tcXHMsXS8pLmZpbHRlcigoYSkgPT4gYSAhPT0gJycpO1xuXHRpZiAodXNlcm5hbWVzLmxlbmd0aCA9PT0gMCkge1xuXHRcdHJldHVybjtcblx0fVxuXHRsZXQgdXNlcnMgPSBNZXRlb3IudXNlcnMuZmluZCh7XG5cdFx0dXNlcm5hbWU6IHtcblx0XHRcdCRpbjogdXNlcm5hbWVzLFxuXHRcdH0sXG5cdH0pO1xuXHRjb25zdCB1c2VySWQgPSBNZXRlb3IudXNlcklkKCk7XG5cdGNvbnN0IGN1cnJlbnRVc2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUodXNlcklkKTtcblx0aWYgKHVzZXJzLmNvdW50KCkgPT09IDApIHtcblx0XHRSb2NrZXRDaGF0Lk5vdGlmaWNhdGlvbnMubm90aWZ5VXNlcih1c2VySWQsICdtZXNzYWdlJywge1xuXHRcdFx0X2lkOiBSYW5kb20uaWQoKSxcblx0XHRcdHJpZDogaXRlbS5yaWQsXG5cdFx0XHR0czogbmV3IERhdGUsXG5cdFx0XHRtc2c6IFRBUGkxOG4uX18oJ1VzZXJfZG9lc250X2V4aXN0Jywge1xuXHRcdFx0XHRwb3N0UHJvY2VzczogJ3NwcmludGYnLFxuXHRcdFx0XHRzcHJpbnRmOiBbdXNlcm5hbWVzLmpvaW4oJyBAJyldLFxuXHRcdFx0fSwgY3VycmVudFVzZXIubGFuZ3VhZ2UpLFxuXHRcdH0pO1xuXHRcdHJldHVybjtcblx0fVxuXHR1c2VycyA9IHVzZXJzLmZldGNoKCkuZmlsdGVyKGZ1bmN0aW9uKHVzZXIpIHtcblx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChpdGVtLnJpZCwgdXNlci5faWQsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXHRcdGlmIChzdWJzY3JpcHRpb24gPT0gbnVsbCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlVc2VyKHVzZXJJZCwgJ21lc3NhZ2UnLCB7XG5cdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0cmlkOiBpdGVtLnJpZCxcblx0XHRcdHRzOiBuZXcgRGF0ZSxcblx0XHRcdG1zZzogVEFQaTE4bi5fXygnVXNlcm5hbWVfaXNfYWxyZWFkeV9pbl9oZXJlJywge1xuXHRcdFx0XHRwb3N0UHJvY2VzczogJ3NwcmludGYnLFxuXHRcdFx0XHRzcHJpbnRmOiBbdXNlci51c2VybmFtZV0sXG5cdFx0XHR9LCBjdXJyZW50VXNlci5sYW5ndWFnZSksXG5cdFx0fSk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9KTtcblxuXHR1c2Vycy5mb3JFYWNoKGZ1bmN0aW9uKHVzZXIpIHtcblxuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4gTWV0ZW9yLmNhbGwoJ2FkZFVzZXJUb1Jvb20nLCB7XG5cdFx0XHRcdHJpZDogaXRlbS5yaWQsXG5cdFx0XHRcdHVzZXJuYW1lOiB1c2VyLnVzZXJuYW1lLFxuXHRcdFx0fSk7XG5cdFx0fSBjYXRjaCAoeyBlcnJvciB9KSB7XG5cdFx0XHRpZiAoZXJyb3IgPT09ICdjYW50LWludml0ZS1mb3ItZGlyZWN0LXJvb20nKSB7XG5cdFx0XHRcdFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlVc2VyKHVzZXJJZCwgJ21lc3NhZ2UnLCB7XG5cdFx0XHRcdFx0X2lkOiBSYW5kb20uaWQoKSxcblx0XHRcdFx0XHRyaWQ6IGl0ZW0ucmlkLFxuXHRcdFx0XHRcdHRzOiBuZXcgRGF0ZSxcblx0XHRcdFx0XHRtc2c6IFRBUGkxOG4uX18oJ0Nhbm5vdF9pbnZpdGVfdXNlcnNfdG9fZGlyZWN0X3Jvb21zJywgbnVsbCwgY3VycmVudFVzZXIubGFuZ3VhZ2UpLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlVc2VyKHVzZXJJZCwgJ21lc3NhZ2UnLCB7XG5cdFx0XHRcdFx0X2lkOiBSYW5kb20uaWQoKSxcblx0XHRcdFx0XHRyaWQ6IGl0ZW0ucmlkLFxuXHRcdFx0XHRcdHRzOiBuZXcgRGF0ZSxcblx0XHRcdFx0XHRtc2c6IFRBUGkxOG4uX18oZXJyb3IsIG51bGwsIGN1cnJlbnRVc2VyLmxhbmd1YWdlKSxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcbn1cblxuUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmFkZCgnaW52aXRlJywgSW52aXRlLCB7XG5cdGRlc2NyaXB0aW9uOiAnSW52aXRlX3VzZXJfdG9fam9pbl9jaGFubmVsJyxcblx0cGFyYW1zOiAnQHVzZXJuYW1lJyxcbn0pO1xuIl19
