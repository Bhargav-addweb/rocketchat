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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:slashcommands-invite-all":{"server":{"server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/rocketchat_slashcommands-invite-all/server/server.js                                               //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
/*
 * Invite is a named function that will replace /invite commands
 * @param {Object} message - The message object
 */
function inviteAll(type) {
  return function inviteAll(command, params, item) {
    if (!/invite\-all-(to|from)/.test(command) || !Match.test(params, String)) {
      return;
    }

    const regexp = /#?([\d-_\w]+)/g;
    const [, channel] = regexp.exec(params.trim());

    if (!channel) {
      return;
    }

    const userId = Meteor.userId();
    const currentUser = Meteor.users.findOne(userId);
    const baseChannel = type === 'to' ? RocketChat.models.Rooms.findOneById(item.rid) : RocketChat.models.Rooms.findOneByName(channel);
    const targetChannel = type === 'from' ? RocketChat.models.Rooms.findOneById(item.rid) : RocketChat.models.Rooms.findOneByName(channel);

    if (!baseChannel) {
      return RocketChat.Notifications.notifyUser(userId, 'message', {
        _id: Random.id(),
        rid: item.rid,
        ts: new Date(),
        msg: TAPi18n.__('Channel_doesnt_exist', {
          postProcess: 'sprintf',
          sprintf: [channel]
        }, currentUser.language)
      });
    }

    const cursor = RocketChat.models.Subscriptions.findByRoomIdWhenUsernameExists(baseChannel._id, {
      fields: {
        'u.username': 1
      }
    });

    try {
      if (cursor.count() > RocketChat.settings.get('API_User_Limit')) {
        throw new Meteor.Error('error-user-limit-exceeded', 'User Limit Exceeded', {
          method: 'addAllToRoom'
        });
      }

      const users = cursor.fetch().map(s => s.u.username);

      if (!targetChannel && ['c', 'p'].indexOf(baseChannel.t) > -1) {
        Meteor.call(baseChannel.t === 'c' ? 'createChannel' : 'createPrivateGroup', channel, users);
        RocketChat.Notifications.notifyUser(userId, 'message', {
          _id: Random.id(),
          rid: item.rid,
          ts: new Date(),
          msg: TAPi18n.__('Channel_created', {
            postProcess: 'sprintf',
            sprintf: [channel]
          }, currentUser.language)
        });
      } else {
        Meteor.call('addUsersToRoom', {
          rid: targetChannel._id,
          users
        });
      }

      return RocketChat.Notifications.notifyUser(userId, 'message', {
        _id: Random.id(),
        rid: item.rid,
        ts: new Date(),
        msg: TAPi18n.__('Users_added', null, currentUser.language)
      });
    } catch (e) {
      const msg = e.error === 'cant-invite-for-direct-room' ? 'Cannot_invite_users_to_direct_rooms' : e.error;
      RocketChat.Notifications.notifyUser(userId, 'message', {
        _id: Random.id(),
        rid: item.rid,
        ts: new Date(),
        msg: TAPi18n.__(msg, null, currentUser.language)
      });
    }
  };
}

RocketChat.slashCommands.add('invite-all-to', inviteAll('to'), {
  description: 'Invite_user_to_join_channel_all_to',
  params: '#room'
});
RocketChat.slashCommands.add('invite-all-from', inviteAll('from'), {
  description: 'Invite_user_to_join_channel_all_from',
  params: '#room'
});
module.exports = inviteAll;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:slashcommands-invite-all/server/server.js");

/* Exports */
Package._define("rocketchat:slashcommands-invite-all");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_slashcommands-invite-all.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbGFzaGNvbW1hbmRzLWludml0ZS1hbGwvc2VydmVyL3NlcnZlci5qcyJdLCJuYW1lcyI6WyJpbnZpdGVBbGwiLCJ0eXBlIiwiY29tbWFuZCIsInBhcmFtcyIsIml0ZW0iLCJ0ZXN0IiwiTWF0Y2giLCJTdHJpbmciLCJyZWdleHAiLCJjaGFubmVsIiwiZXhlYyIsInRyaW0iLCJ1c2VySWQiLCJNZXRlb3IiLCJjdXJyZW50VXNlciIsInVzZXJzIiwiZmluZE9uZSIsImJhc2VDaGFubmVsIiwiUm9ja2V0Q2hhdCIsIm1vZGVscyIsIlJvb21zIiwiZmluZE9uZUJ5SWQiLCJyaWQiLCJmaW5kT25lQnlOYW1lIiwidGFyZ2V0Q2hhbm5lbCIsIk5vdGlmaWNhdGlvbnMiLCJub3RpZnlVc2VyIiwiX2lkIiwiUmFuZG9tIiwiaWQiLCJ0cyIsIkRhdGUiLCJtc2ciLCJUQVBpMThuIiwiX18iLCJwb3N0UHJvY2VzcyIsInNwcmludGYiLCJsYW5ndWFnZSIsImN1cnNvciIsIlN1YnNjcmlwdGlvbnMiLCJmaW5kQnlSb29tSWRXaGVuVXNlcm5hbWVFeGlzdHMiLCJmaWVsZHMiLCJjb3VudCIsInNldHRpbmdzIiwiZ2V0IiwiRXJyb3IiLCJtZXRob2QiLCJmZXRjaCIsIm1hcCIsInMiLCJ1IiwidXNlcm5hbWUiLCJpbmRleE9mIiwidCIsImNhbGwiLCJlIiwiZXJyb3IiLCJzbGFzaENvbW1hbmRzIiwiYWRkIiwiZGVzY3JpcHRpb24iLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7OztBQUtBLFNBQVNBLFNBQVQsQ0FBbUJDLElBQW5CLEVBQXlCO0FBQ3hCLFNBQU8sU0FBU0QsU0FBVCxDQUFtQkUsT0FBbkIsRUFBNEJDLE1BQTVCLEVBQW9DQyxJQUFwQyxFQUEwQztBQUVoRCxRQUFJLENBQUMsd0JBQXdCQyxJQUF4QixDQUE2QkgsT0FBN0Is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QVYsQ0FBaEQsRUFBbUU7QUFDbEUyRCxlQUFhLHNDQURxRDtBQUVsRXhELFVBQVE7QUFGMEQsQ0FBbkU7QUFJQXlELE9BQU9DLE9BQVAsR0FBaUI3RCxTQUFqQixDIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X3NsYXNoY29tbWFuZHMtaW52aXRlLWFsbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBJbnZpdGUgaXMgYSBuYW1lZCBmdW5jdGlvbiB0aGF0IHdpbGwgcmVwbGFjZSAvaW52aXRlIGNvbW1hbmRzXG4gKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSAtIFRoZSBtZXNzYWdlIG9iamVjdFxuICovXG5cbmZ1bmN0aW9uIGludml0ZUFsbCh0eXBlKSB7XG5cdHJldHVybiBmdW5jdGlvbiBpbnZpdGVBbGwoY29tbWFuZCwgcGFyYW1zLCBpdGVtKSB7XG5cblx0XHRpZiAoIS9pbnZpdGVcXC1hbGwtKHRvfGZyb20pLy50ZXN0KGNvbW1hbmQpIHx8ICFNYXRjaC50ZXN0KHBhcmFtcywgU3RyaW5nKSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJlZ2V4cCA9IC8jPyhbXFxkLV9cXHddKykvZztcblx0XHRjb25zdCBbLCBjaGFubmVsXSA9IHJlZ2V4cC5leGVjKHBhcmFtcy50cmltKCkpO1xuXG5cdFx0aWYgKCFjaGFubmVsKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNvbnN0IHVzZXJJZCA9IE1ldGVvci51c2VySWQoKTtcblx0XHRjb25zdCBjdXJyZW50VXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHVzZXJJZCk7XG5cdFx0Y29uc3QgYmFzZUNoYW5uZWwgPSB0eXBlID09PSAndG8nID8gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoaXRlbS5yaWQpIDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5TmFtZShjaGFubmVsKTtcblx0XHRjb25zdCB0YXJnZXRDaGFubmVsID0gdHlwZSA9PT0gJ2Zyb20nID8gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoaXRlbS5yaWQpIDogUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5TmFtZShjaGFubmVsKTtcblxuXHRcdGlmICghYmFzZUNoYW5uZWwpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lk5vdGlmaWNhdGlvbnMubm90aWZ5VXNlcih1c2VySWQsICdtZXNzYWdlJywge1xuXHRcdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0XHRyaWQ6IGl0ZW0ucmlkLFxuXHRcdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdFx0bXNnOiBUQVBpMThuLl9fKCdDaGFubmVsX2RvZXNudF9leGlzdCcsIHtcblx0XHRcdFx0XHRwb3N0UHJvY2VzczogJ3NwcmludGYnLFxuXHRcdFx0XHRcdHNwcmludGY6IFtjaGFubmVsXSxcblx0XHRcdFx0fSwgY3VycmVudFVzZXIubGFuZ3VhZ2UpLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZEJ5Um9vbUlkV2hlblVzZXJuYW1lRXhpc3RzKGJhc2VDaGFubmVsLl9pZCwgeyBmaWVsZHM6IHsgJ3UudXNlcm5hbWUnOiAxIH0gfSk7XG5cblx0XHR0cnkge1xuXHRcdFx0aWYgKGN1cnNvci5jb3VudCgpID4gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FQSV9Vc2VyX0xpbWl0JykpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItdXNlci1saW1pdC1leGNlZWRlZCcsICdVc2VyIExpbWl0IEV4Y2VlZGVkJywge1xuXHRcdFx0XHRcdG1ldGhvZDogJ2FkZEFsbFRvUm9vbScsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgdXNlcnMgPSBjdXJzb3IuZmV0Y2goKS5tYXAoKHMpID0+IHMudS51c2VybmFtZSk7XG5cblx0XHRcdGlmICghdGFyZ2V0Q2hhbm5lbCAmJiBbJ2MnLCAncCddLmluZGV4T2YoYmFzZUNoYW5uZWwudCkgPiAtMSkge1xuXHRcdFx0XHRNZXRlb3IuY2FsbChiYXNlQ2hhbm5lbC50ID09PSAnYycgPyAnY3JlYXRlQ2hhbm5lbCcgOiAnY3JlYXRlUHJpdmF0ZUdyb3VwJywgY2hhbm5lbCwgdXNlcnMpO1xuXHRcdFx0XHRSb2NrZXRDaGF0Lk5vdGlmaWNhdGlvbnMubm90aWZ5VXNlcih1c2VySWQsICdtZXNzYWdlJywge1xuXHRcdFx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRcdFx0cmlkOiBpdGVtLnJpZCxcblx0XHRcdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdFx0XHRtc2c6IFRBUGkxOG4uX18oJ0NoYW5uZWxfY3JlYXRlZCcsIHtcblx0XHRcdFx0XHRcdHBvc3RQcm9jZXNzOiAnc3ByaW50ZicsXG5cdFx0XHRcdFx0XHRzcHJpbnRmOiBbY2hhbm5lbF0sXG5cdFx0XHRcdFx0fSwgY3VycmVudFVzZXIubGFuZ3VhZ2UpLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdE1ldGVvci5jYWxsKCdhZGRVc2Vyc1RvUm9vbScsIHtcblx0XHRcdFx0XHRyaWQ6IHRhcmdldENoYW5uZWwuX2lkLFxuXHRcdFx0XHRcdHVzZXJzLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lk5vdGlmaWNhdGlvbnMubm90aWZ5VXNlcih1c2VySWQsICdtZXNzYWdlJywge1xuXHRcdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0XHRyaWQ6IGl0ZW0ucmlkLFxuXHRcdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdFx0bXNnOiBUQVBpMThuLl9fKCdVc2Vyc19hZGRlZCcsIG51bGwsIGN1cnJlbnRVc2VyLmxhbmd1YWdlKSxcblx0XHRcdH0pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnN0IG1zZyA9IGUuZXJyb3IgPT09ICdjYW50LWludml0ZS1mb3ItZGlyZWN0LXJvb20nID8gJ0Nhbm5vdF9pbnZpdGVfdXNlcnNfdG9fZGlyZWN0X3Jvb21zJyA6IGUuZXJyb3I7XG5cdFx0XHRSb2NrZXRDaGF0Lk5vdGlmaWNhdGlvbnMubm90aWZ5VXNlcih1c2VySWQsICdtZXNzYWdlJywge1xuXHRcdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0XHRyaWQ6IGl0ZW0ucmlkLFxuXHRcdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdFx0bXNnOiBUQVBpMThuLl9fKG1zZywgbnVsbCwgY3VycmVudFVzZXIubGFuZ3VhZ2UpLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xufVxuXG5Sb2NrZXRDaGF0LnNsYXNoQ29tbWFuZHMuYWRkKCdpbnZpdGUtYWxsLXRvJywgaW52aXRlQWxsKCd0bycpLCB7XG5cdGRlc2NyaXB0aW9uOiAnSW52aXRlX3VzZXJfdG9fam9pbl9jaGFubmVsX2FsbF90bycsXG5cdHBhcmFtczogJyNyb29tJyxcbn0pO1xuUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmFkZCgnaW52aXRlLWFsbC1mcm9tJywgaW52aXRlQWxsKCdmcm9tJyksIHtcblx0ZGVzY3JpcHRpb246ICdJbnZpdGVfdXNlcl90b19qb2luX2NoYW5uZWxfYWxsX2Zyb20nLFxuXHRwYXJhbXM6ICcjcm9vbScsXG59KTtcbm1vZHVsZS5leHBvcnRzID0gaW52aXRlQWxsO1xuIl19
