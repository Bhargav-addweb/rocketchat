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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:slashcommands-archive":{"server":{"server.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////
//                                                                                       //
// packages/rocketchat_slashcommands-archive/server/server.js                            //
//                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////
                                                                                         //
function Archive(command, params, item) {
  if (command !== 'archive' || !Match.test(params, String)) {
    return;
  }

  let channel = params.trim();
  let room;

  if (channel === '') {
    room = RocketChat.models.Rooms.findOneById(item.rid);
    channel = room.name;
  } else {
    channel = channel.replace('#', '');
    room = RocketChat.models.Rooms.findOneByName(channel);
  }

  const user = Meteor.users.findOne(Meteor.userId());

  if (!room) {
    return RocketChat.Notifications.notifyUser(Meteor.userId(), 'message', {
      _id: Random.id(),
      rid: item.rid,
      ts: new Date(),
      msg: TAPi18n.__('Channel_doesnt_exist', {
        postProcess: 'sprintf',
        sprintf: [channel]
      }, user.language)
    });
  } // You can not archive direct messages.


  if (room.t === 'd') {
    return;
  }

  if (room.archived) {
    RocketChat.Notifications.notifyUser(Meteor.userId(), 'message', {
      _id: Random.id(),
      rid: item.rid,
      ts: new Date(),
      msg: TAPi18n.__('Duplicate_archived_channel_name', {
        postProcess: 'sprintf',
        sprintf: [channel]
      }, user.language)
    });
    return;
  }

  Meteor.call('archiveRoom', room._id);
  RocketChat.models.Messages.createRoomArchivedByRoomIdAndUser(room._id, Meteor.user());
  RocketChat.Notifications.notifyUser(Meteor.userId(), 'message', {
    _id: Random.id(),
    rid: item.rid,
    ts: new Date(),
    msg: TAPi18n.__('Channel_Archived', {
      postProcess: 'sprintf',
      sprintf: [channel]
    }, user.language)
  });
  return Archive;
}

RocketChat.slashCommands.add('archive', Archive, {
  description: 'Archive',
  params: '#channel'
});
///////////////////////////////////////////////////////////////////////////////////////////

},"messages.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////
//                                                                                       //
// packages/rocketchat_slashcommands-archive/server/messages.js                          //
//                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////
                                                                                         //
RocketChat.models.Messages.createRoomArchivedByRoomIdAndUser = function (roomId, user) {
  return this.createWithTypeRoomIdMessageAndUser('room-archived', roomId, '', user);
};
///////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:slashcommands-archive/server/server.js");
require("/node_modules/meteor/rocketchat:slashcommands-archive/server/messages.js");

/* Exports */
Package._define("rocketchat:slashcommands-archive");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_slashcommands-archive.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbGFzaGNvbW1hbmRzLWFyY2hpdmUvc2VydmVyL3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbGFzaGNvbW1hbmRzLWFyY2hpdmUvc2VydmVyL21lc3NhZ2VzLmpzIl0sIm5hbWVzIjpbIkFyY2hpdmUiLCJjb21tYW5kIiwicGFyYW1zIiwiaXRlbSIsIk1hdGNoIiwidGVzdCIsIlN0cmluZyIsImNoYW5uZWwiLCJ0cmltIiwicm9vbSIsIlJvY2tldENoYXQiLCJtb2RlbHMiLCJSb29tcyIsImZpbmRPbmVCeUlkIiwicmlkIiwibmFtZSIsInJlcGxhY2UiLCJmaW5kT25lQnlOYW1lIiwidXNlciIsIk1ldGVvciIsInVzZXJzIiwiZmluZE9uZSIsInVzZXJJZCIsIk5vdGlmaWNhdGlvbnMiLCJub3RpZnlVc2VyIiwiX2lkIiwiUmFuZG9tIiwiaWQiLCJ0cyIsIkRhdGUiLCJtc2ciLCJUQVBpMThuIiwiX18iLCJwb3N0UHJvY2VzcyIsInNwcmludGYiLCJsYW5ndWFnZSIsInQiLCJhcmNoaXZlZCIsImNhbGwiLCJNZXNzYWdlcyIsImNyZWF0ZVJvb21BcmNoaXZlZEJ5Um9vbUlkQW5kVXNlciIsInNsYXNoQ29tbWFuZHMiLCJhZGQiLCJkZXNjcmlwdGlvbiIsInJvb21JZCIsImNyZWF0ZVdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLFNBQVNBLE9BQVQsQ0FBaUJDLE9BQWpCLEVBQTBCQyxNQUExQixFQUFrQ0MsSUFBbEMsRUFBd0M7QUFDdkMsTUFBSUYsWUFBWSxTQUFaLElBQXlCLENBQUNHLE1BQU1DLElBQU4sQ0FBV0gsTUFBWCxFQUFtQkksTUFBbkIsQ0FBOUIsRUFBMEQ7QUFDekQ7QUFDQTs7QUFFRCxNQUFJQyxVQUFVTCxPQUFPTSxJQUFQLEVBQWQ7QUFDQSxN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QyIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9zbGFzaGNvbW1hbmRzLWFyY2hpdmUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJmdW5jdGlvbiBBcmNoaXZlKGNvbW1hbmQsIHBhcmFtcywgaXRlbSkge1xuXHRpZiAoY29tbWFuZCAhPT0gJ2FyY2hpdmUnIHx8ICFNYXRjaC50ZXN0KHBhcmFtcywgU3RyaW5nKSkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGxldCBjaGFubmVsID0gcGFyYW1zLnRyaW0oKTtcblx0bGV0IHJvb207XG5cblx0aWYgKGNoYW5uZWwgPT09ICcnKSB7XG5cdFx0cm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGl0ZW0ucmlkKTtcblx0XHRjaGFubmVsID0gcm9vbS5uYW1lO1xuXHR9IGVsc2Uge1xuXHRcdGNoYW5uZWwgPSBjaGFubmVsLnJlcGxhY2UoJyMnLCAnJyk7XG5cdFx0cm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeU5hbWUoY2hhbm5lbCk7XG5cdH1cblxuXHRjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUoTWV0ZW9yLnVzZXJJZCgpKTtcblxuXHRpZiAoIXJvb20pIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeVVzZXIoTWV0ZW9yLnVzZXJJZCgpLCAnbWVzc2FnZScsIHtcblx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRyaWQ6IGl0ZW0ucmlkLFxuXHRcdFx0dHM6IG5ldyBEYXRlKCksXG5cdFx0XHRtc2c6IFRBUGkxOG4uX18oJ0NoYW5uZWxfZG9lc250X2V4aXN0Jywge1xuXHRcdFx0XHRwb3N0UHJvY2VzczogJ3NwcmludGYnLFxuXHRcdFx0XHRzcHJpbnRmOiBbY2hhbm5lbF0sXG5cdFx0XHR9LCB1c2VyLmxhbmd1YWdlKSxcblx0XHR9KTtcblx0fVxuXG5cdC8vIFlvdSBjYW4gbm90IGFyY2hpdmUgZGlyZWN0IG1lc3NhZ2VzLlxuXHRpZiAocm9vbS50ID09PSAnZCcpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAocm9vbS5hcmNoaXZlZCkge1xuXHRcdFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlVc2VyKE1ldGVvci51c2VySWQoKSwgJ21lc3NhZ2UnLCB7XG5cdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0cmlkOiBpdGVtLnJpZCxcblx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0bXNnOiBUQVBpMThuLl9fKCdEdXBsaWNhdGVfYXJjaGl2ZWRfY2hhbm5lbF9uYW1lJywge1xuXHRcdFx0XHRwb3N0UHJvY2VzczogJ3NwcmludGYnLFxuXHRcdFx0XHRzcHJpbnRmOiBbY2hhbm5lbF0sXG5cdFx0XHR9LCB1c2VyLmxhbmd1YWdlKSxcblx0XHR9KTtcblx0XHRyZXR1cm47XG5cdH1cblx0TWV0ZW9yLmNhbGwoJ2FyY2hpdmVSb29tJywgcm9vbS5faWQpO1xuXG5cdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVJvb21BcmNoaXZlZEJ5Um9vbUlkQW5kVXNlcihyb29tLl9pZCwgTWV0ZW9yLnVzZXIoKSk7XG5cdFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlVc2VyKE1ldGVvci51c2VySWQoKSwgJ21lc3NhZ2UnLCB7XG5cdFx0X2lkOiBSYW5kb20uaWQoKSxcblx0XHRyaWQ6IGl0ZW0ucmlkLFxuXHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdG1zZzogVEFQaTE4bi5fXygnQ2hhbm5lbF9BcmNoaXZlZCcsIHtcblx0XHRcdHBvc3RQcm9jZXNzOiAnc3ByaW50ZicsXG5cdFx0XHRzcHJpbnRmOiBbY2hhbm5lbF0sXG5cdFx0fSwgdXNlci5sYW5ndWFnZSksXG5cdH0pO1xuXG5cdHJldHVybiBBcmNoaXZlO1xufVxuXG5Sb2NrZXRDaGF0LnNsYXNoQ29tbWFuZHMuYWRkKCdhcmNoaXZlJywgQXJjaGl2ZSwge1xuXHRkZXNjcmlwdGlvbjogJ0FyY2hpdmUnLFxuXHRwYXJhbXM6ICcjY2hhbm5lbCcsXG59KTtcbiIsIlJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVJvb21BcmNoaXZlZEJ5Um9vbUlkQW5kVXNlciA9IGZ1bmN0aW9uKHJvb21JZCwgdXNlcikge1xuXHRyZXR1cm4gdGhpcy5jcmVhdGVXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKCdyb29tLWFyY2hpdmVkJywgcm9vbUlkLCAnJywgdXNlcik7XG59O1xuIl19
