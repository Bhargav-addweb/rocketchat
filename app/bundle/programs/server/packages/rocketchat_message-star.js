(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:message-star":{"server":{"settings.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_message-star/server/settings.js                                                            //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Meteor.startup(function () {
  return RocketChat.settings.add('Message_AllowStarring', true, {
    type: 'boolean',
    group: 'Message',
    public: true
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"starMessage.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_message-star/server/starMessage.js                                                         //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Meteor.methods({
  starMessage(message) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'starMessage'
      });
    }

    if (!RocketChat.settings.get('Message_AllowStarring')) {
      throw new Meteor.Error('error-action-not-allowed', 'Message starring not allowed', {
        method: 'pinMessage',
        action: 'Message_starring'
      });
    }

    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(message.rid, Meteor.userId(), {
      fields: {
        _id: 1
      }
    });

    if (!subscription) {
      return false;
    }

    return RocketChat.models.Messages.updateUserStarById(message._id, Meteor.userId(), message.starred);
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications":{"starredMessages.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_message-star/server/publications/starredMessages.js                                        //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Meteor.publish('starredMessages', function (rid, limit = 50) {
  if (!this.userId) {
    return this.ready();
  }

  const publication = this;
  const user = RocketChat.models.Users.findOneById(this.userId);

  if (!user) {
    return this.ready();
  }

  const cursorHandle = RocketChat.models.Messages.findStarredByUserAtRoom(this.userId, rid, {
    sort: {
      ts: -1
    },
    limit
  }).observeChanges({
    added(_id, record) {
      return publication.added('rocketchat_starred_message', _id, record);
    },

    changed(_id, record) {
      return publication.changed('rocketchat_starred_message', _id, record);
    },

    removed(_id) {
      return publication.removed('rocketchat_starred_message', _id);
    }

  });
  this.ready();
  return this.onStop(function () {
    return cursorHandle.stop();
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup":{"indexes.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_message-star/server/startup/indexes.js                                                     //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Meteor.startup(function () {
  return Meteor.defer(function () {
    return RocketChat.models.Messages.tryEnsureIndex({
      'starred._id': 1
    }, {
      sparse: 1
    });
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:message-star/server/settings.js");
require("/node_modules/meteor/rocketchat:message-star/server/starMessage.js");
require("/node_modules/meteor/rocketchat:message-star/server/publications/starredMessages.js");
require("/node_modules/meteor/rocketchat:message-star/server/startup/indexes.js");

/* Exports */
Package._define("rocketchat:message-star");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_message-star.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptZXNzYWdlLXN0YXIvc2VydmVyL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0Om1lc3NhZ2Utc3Rhci9zZXJ2ZXIvc3Rhck1lc3NhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWVzc2FnZS1zdGFyL3NlcnZlci9wdWJsaWNhdGlvbnMvc3RhcnJlZE1lc3NhZ2VzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0Om1lc3NhZ2Utc3Rhci9zZXJ2ZXIvc3RhcnR1cC9pbmRleGVzLmpzIl0sIm5hbWVzIjpbIk1ldGVvciIsInN0YXJ0dXAiLCJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJhZGQiLCJ0eXBlIiwiZ3JvdXAiLCJwdWJsaWMiLCJtZXRob2RzIiwic3Rhck1lc3NhZ2UiLCJtZXNzYWdlIiwidXNlcklkIiwiRXJyb3IiLCJtZXRob2QiLCJnZXQiLCJhY3Rpb24iLCJzdWJzY3JpcHRpb24iLCJtb2RlbHMiLCJTdWJzY3JpcHRpb25zIiwiZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkIiwicmlkIiwiZmllbGRzIiwiX2lkIiwiTWVzc2FnZXMiLCJ1cGRhdGVVc2VyU3RhckJ5SWQiLCJzdGFycmVkIiwicHVibGlzaCIsImxpbWl0IiwicmVhZHkiLCJwdWJsaWNhdGlvbiIsInVzZXIiLCJVc2VycyIsImZpbmRPbmVCeUlkIiwiY3Vyc29ySGFuZGxlIiwiZmluZFN0YXJyZWRCeVVzZXJBdFJvb20iLCJzb3J0IiwidHMiLCJvYnNlcnZlQ2hhbmdlcyIsImFkZGVkIiwicmVjb3JkIiwiY2hhbmdlZCIsInJlbW92ZWQiLCJvblN0b3AiLCJzdG9wIiwiZGVmZXIiLCJ0cnlFbnN1cmVJbmRleCIsInNwYXJzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9D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T0FBT0MsT0FBUCxDQUFlLFlBQVc7QUFDekIsU0FBT0QsT0FBTzRDLEtBQVAsQ0FBYSxZQUFXO0FBQzlCLFdBQU8xQyxXQUFXZSxNQUFYLENBQWtCTSxRQUFsQixDQUEyQnNCLGNBQTNCLENBQTBDO0FBQ2hELHFCQUFlO0FBRGlDLEtBQTFDLEVBRUo7QUFDRkMsY0FBUTtBQUROLEtBRkksQ0FBUDtBQUtBLEdBTk0sQ0FBUDtBQU9BLENBUkQsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9tZXNzYWdlLXN0YXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJNZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0cmV0dXJuIFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdNZXNzYWdlX0FsbG93U3RhcnJpbmcnLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTWVzc2FnZScsXG5cdFx0cHVibGljOiB0cnVlLFxuXHR9KTtcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHRzdGFyTWVzc2FnZShtZXNzYWdlKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3N0YXJNZXNzYWdlJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmICghUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01lc3NhZ2VfQWxsb3dTdGFycmluZycpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnTWVzc2FnZSBzdGFycmluZyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAncGluTWVzc2FnZScsXG5cdFx0XHRcdGFjdGlvbjogJ01lc3NhZ2Vfc3RhcnJpbmcnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQobWVzc2FnZS5yaWQsIE1ldGVvci51c2VySWQoKSwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cdFx0aWYgKCFzdWJzY3JpcHRpb24pIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMudXBkYXRlVXNlclN0YXJCeUlkKG1lc3NhZ2UuX2lkLCBNZXRlb3IudXNlcklkKCksIG1lc3NhZ2Uuc3RhcnJlZCk7XG5cdH0sXG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdzdGFycmVkTWVzc2FnZXMnLCBmdW5jdGlvbihyaWQsIGxpbWl0ID0gNTApIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLnJlYWR5KCk7XG5cdH1cblx0Y29uc3QgcHVibGljYXRpb24gPSB0aGlzO1xuXHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodGhpcy51c2VySWQpO1xuXHRpZiAoIXVzZXIpIHtcblx0XHRyZXR1cm4gdGhpcy5yZWFkeSgpO1xuXHR9XG5cdGNvbnN0IGN1cnNvckhhbmRsZSA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRTdGFycmVkQnlVc2VyQXRSb29tKHRoaXMudXNlcklkLCByaWQsIHtcblx0XHRzb3J0OiB7XG5cdFx0XHR0czogLTEsXG5cdFx0fSxcblx0XHRsaW1pdCxcblx0fSkub2JzZXJ2ZUNoYW5nZXMoe1xuXHRcdGFkZGVkKF9pZCwgcmVjb3JkKSB7XG5cdFx0XHRyZXR1cm4gcHVibGljYXRpb24uYWRkZWQoJ3JvY2tldGNoYXRfc3RhcnJlZF9tZXNzYWdlJywgX2lkLCByZWNvcmQpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZChfaWQsIHJlY29yZCkge1xuXHRcdFx0cmV0dXJuIHB1YmxpY2F0aW9uLmNoYW5nZWQoJ3JvY2tldGNoYXRfc3RhcnJlZF9tZXNzYWdlJywgX2lkLCByZWNvcmQpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlZChfaWQpIHtcblx0XHRcdHJldHVybiBwdWJsaWNhdGlvbi5yZW1vdmVkKCdyb2NrZXRjaGF0X3N0YXJyZWRfbWVzc2FnZScsIF9pZCk7XG5cdFx0fSxcblx0fSk7XG5cdHRoaXMucmVhZHkoKTtcblx0cmV0dXJuIHRoaXMub25TdG9wKGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBjdXJzb3JIYW5kbGUuc3RvcCgpO1xuXHR9KTtcbn0pO1xuIiwiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdHJldHVybiBNZXRlb3IuZGVmZXIoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLnRyeUVuc3VyZUluZGV4KHtcblx0XHRcdCdzdGFycmVkLl9pZCc6IDEsXG5cdFx0fSwge1xuXHRcdFx0c3BhcnNlOiAxLFxuXHRcdH0pO1xuXHR9KTtcbn0pO1xuIl19
