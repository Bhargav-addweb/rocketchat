(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var RocketChatFile = Package['rocketchat:file'].RocketChatFile;
var Random = Package.random.Random;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var message;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:message-snippet":{"server":{"startup":{"settings.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_message-snippet/server/startup/settings.js                                                    //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
Meteor.startup(function () {
  RocketChat.settings.add('Message_AllowSnippeting', false, {
    type: 'boolean',
    public: true,
    group: 'Message'
  });
  RocketChat.models.Permissions.upsert('snippet-message', {
    $setOnInsert: {
      roles: ['owner', 'moderator', 'admin']
    }
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"snippetMessage.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_message-snippet/server/methods/snippetMessage.js                                              //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
Meteor.methods({
  snippetMessage(message, filename) {
    if (Meteor.userId() == null) {
      // noinspection JSUnresolvedFunction
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'snippetMessage'
      });
    }

    const room = RocketChat.models.Rooms.findOne({
      _id: message.rid
    });

    if (typeof room === 'undefined' || room === null) {
      return false;
    }

    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(message.rid, Meteor.userId(), {
      fields: {
        _id: 1
      }
    });

    if (!subscription) {
      return false;
    } // If we keep history of edits, insert a new message to store history information


    if (RocketChat.settings.get('Message_KeepHistory')) {
      RocketChat.models.Messages.cloneAndSaveAsHistoryById(message._id);
    }

    const me = RocketChat.models.Users.findOneById(Meteor.userId());
    message.snippeted = true;
    message.snippetedAt = Date.now;
    message.snippetedBy = {
      _id: Meteor.userId(),
      username: me.username
    };
    message = RocketChat.callbacks.run('beforeSaveMessage', message); // Create the SnippetMessage

    RocketChat.models.Messages.setSnippetedByIdAndUserId(message, filename, message.snippetedBy, message.snippeted, Date.now, filename);
    RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('message_snippeted', message.rid, '', me, {
      snippetId: message._id,
      snippetName: filename
    });
  }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"requests.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_message-snippet/server/requests.js                                                            //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
/* global Cookies */
WebApp.connectHandlers.use('/snippet/download', function (req, res) {
  let rawCookies;
  let token;
  let uid;
  const cookie = new Cookies();

  if (req.headers && req.headers.cookie !== null) {
    rawCookies = req.headers.cookie;
  }

  if (rawCookies !== null) {
    uid = cookie.get('rc_uid', rawCookies);
  }

  if (rawCookies !== null) {
    token = cookie.get('rc_token', rawCookies);
  }

  if (uid === null) {
    uid = req.query.rc_uid;
    token = req.query.rc_token;
  }

  const user = RocketChat.models.Users.findOneByIdAndLoginToken(uid, token);

  if (!(uid && token && user)) {
    res.writeHead(403);
    res.end();
    return false;
  }

  const match = /^\/([^\/]+)\/(.*)/.exec(req.url);

  if (match[1]) {
    const snippet = RocketChat.models.Messages.findOne({
      _id: match[1],
      snippeted: true
    });
    const room = RocketChat.models.Rooms.findOne({
      _id: snippet.rid,
      usernames: {
        $in: [user.username]
      }
    });

    if (room === undefined) {
      res.writeHead(403);
      res.end();
      return false;
    }

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(snippet.snippetName)}`);
    res.setHeader('Content-Type', 'application/octet-stream'); // Removing the ``` contained in the msg.

    const snippetContent = snippet.msg.substr(3, snippet.msg.length - 6);
    res.setHeader('Content-Length', snippetContent.length);
    res.write(snippetContent);
    res.end();
    return;
  }

  res.writeHead(404);
  res.end();
  return;
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications":{"snippetedMessagesByRoom.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_message-snippet/server/publications/snippetedMessagesByRoom.js                                //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
Meteor.publish('snippetedMessages', function (rid, limit = 50) {
  if (typeof this.userId === 'undefined' || this.userId === null) {
    return this.ready();
  }

  const publication = this;
  const user = RocketChat.models.Users.findOneById(this.userId);

  if (typeof user === 'undefined' || user === null) {
    return this.ready();
  }

  const cursorHandle = RocketChat.models.Messages.findSnippetedByRoom(rid, {
    sort: {
      ts: -1
    },
    limit
  }).observeChanges({
    added(_id, record) {
      publication.added('rocketchat_snippeted_message', _id, record);
    },

    changed(_id, record) {
      publication.changed('rocketchat_snippeted_message', _id, record);
    },

    removed(_id) {
      publication.removed('rocketchat_snippeted_message', _id);
    }

  });
  this.ready();

  this.onStop = function () {
    cursorHandle.stop();
  };
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"snippetedMessage.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_message-snippet/server/publications/snippetedMessage.js                                       //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
Meteor.publish('snippetedMessage', function (_id) {
  if (typeof this.userId === 'undefined' || this.userId === null) {
    return this.ready();
  }

  const snippet = RocketChat.models.Messages.findOne({
    _id,
    snippeted: true
  });
  const user = RocketChat.models.Users.findOneById(this.userId);
  const roomSnippetQuery = {
    _id: snippet.rid,
    usernames: {
      $in: [user.username]
    }
  };

  if (RocketChat.models.Rooms.findOne(roomSnippetQuery) === undefined) {
    return this.ready();
  }

  const publication = this;

  if (typeof user === 'undefined' || user === null) {
    return this.ready();
  }

  const cursor = RocketChat.models.Messages.find({
    _id
  }).observeChanges({
    added(_id, record) {
      publication.added('rocketchat_snippeted_message', _id, record);
    },

    changed(_id, record) {
      publication.changed('rocketchat_snippeted_message', _id, record);
    },

    removed(_id) {
      publication.removed('rocketchat_snippeted_message', _id);
    }

  });
  this.ready();

  this.onStop = function () {
    cursor.stop();
  };
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:message-snippet/server/startup/settings.js");
require("/node_modules/meteor/rocketchat:message-snippet/server/methods/snippetMessage.js");
require("/node_modules/meteor/rocketchat:message-snippet/server/requests.js");
require("/node_modules/meteor/rocketchat:message-snippet/server/publications/snippetedMessagesByRoom.js");
require("/node_modules/meteor/rocketchat:message-snippet/server/publications/snippetedMessage.js");

/* Exports */
Package._define("rocketchat:message-snippet");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_message-snippet.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptZXNzYWdlLXNuaXBwZXQvc2VydmVyL3N0YXJ0dXAvc2V0dGluZ3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWVzc2FnZS1zbmlwcGV0L3NlcnZlci9tZXRob2RzL3NuaXBwZXRNZXNzYWdlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0Om1lc3NhZ2Utc25pcHBldC9zZXJ2ZXIvcmVxdWVzdHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWVzc2FnZS1zbmlwcGV0L3NlcnZlci9wdWJsaWNhdGlvbnMvc25pcHBldGVkTWVzc2FnZXNCeVJvb20uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWVzc2FnZS1zbmlwcGV0L3NlcnZlci9wdWJsaWNhdGlvbnMvc25pcHBldGVkTWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJNZXRlb3IiLCJzdGFydHVwIiwiUm9ja2V0Q2hhdCIsInNldHRpbmdzIiwiYWRkIiwidHlwZSIsInB1YmxpYyIsImdyb3VwIiwibW9kZWxzIiwiUGVybWlzc2lvbnMiLCJ1cHNlcnQiLCIkc2V0T25JbnNlcnQiLCJyb2xlcyIsIm1ldGhvZHMiLCJzbmlwcGV0TWVzc2FnZSIsIm1lc3NhZ2UiLCJmaWxlbmFtZSIsInVzZXJJZCIsIkVycm9yIiwibWV0aG9kIiwicm9vbSIsIlJvb21zIiwiZmluZE9uZSIsIl9pZCIsInJpZCIsInN1YnNjcmlwdGlvbiIsIlN1YnNjcmlwdGlvbnMiLCJmaW5kT25lQnlSb29tSWRBbmRVc2VySWQiLCJmaWVsZHMiLCJnZXQiLCJNZXNzYWdlcyIsImNsb25lQW5kU2F2ZUFzSGlzdG9yeUJ5SWQiLCJtZSIsIlVzZXJzIiwiZmluZE9uZUJ5SWQiLCJzbmlwcGV0ZWQiLCJzbmlwcGV0ZWRBdCIsIkRhdGUiLCJub3ciLCJzbmlwcGV0ZWRCeSIsInVzZXJuYW1lIiwiY2FsbGJhY2tzIiwicnVuIiwic2V0U25pcHBldGVkQnlJZEFuZFVzZXJJZCIsImNyZWF0ZVdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIiLCJzbmlwcGV0SWQiLCJzbmlwcGV0TmFtZSIsIldlYkFwcCIsImNvbm5lY3RIYW5kbGVycyIsInVzZSIsInJlcSIsInJlcyIsInJhd0Nvb2tpZXMiLCJ0b2tlbiIsInVpZCIsImNvb2tpZSIsIkNvb2tpZXMiLCJoZWFkZXJzIiwicXVlcnkiLCJyY191aWQiLCJyY190b2tlbiIsInVzZXIiLCJmaW5kT25lQnlJZEFuZExvZ2luVG9rZW4iLCJ3cml0ZUhlYWQiLCJlbmQiLCJtYXRjaCIsImV4ZWMiLCJ1cmwiLCJzbmlwcGV0IiwidXNlcm5hbWVzIiwiJGluIiwidW5kZWZpbmVkIiwic2V0SGVhZGVyIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwic25pcHBldENvbnRlbnQiLCJtc2ciLCJzdWJzdHIiLCJsZW5ndGgiLCJ3cml0ZSIsInB1Ymxpc2giLCJsaW1pdCIsInJlYWR5IiwicHVibGljYXRpb24iLCJjdXJzb3JIYW5kbGUiLCJmaW5kU25pcHBldGVkQnlSb29tIiwic29ydCIsInRzIiwib2JzZXJ2ZUNoYW5nZXMiLCJhZGRlZCIsInJlY29yZCIsImNoYW5nZWQiLCJyZW1vdmVkIiwib25TdG9wIiwic3RvcCIsInJvb21TbmlwcGV0UXVlcnkiLCJjdXJzb3IiLCJmaW5kIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLE9BQVAsQ0FBZSxZQUFXO0FBQ3pCQyxhQUFXQyxRQUFYLENBQW9CQyxHQUFwQixDQUF3Qix5QkFBeEIsRUFBbUQsS0FBbkQsRUFBMEQ7QUFDekRDLFVBQU0sU0FEbUQ7QUFFekRDLFlBQVEsSUFGaUQ7QUFHekRDLFdBQU87QUFIa0QsR0FBMUQ7QUFLQUwsYUFBV00sTUFBWCxDQUFrQkMsV0FBbEIsQ0FBOEJDLE1BQTlCLENBQXFDLGlCQUFyQyxFQUF3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QSxNQUFJdEMsV0FBV00sTUFBWCxDQUFrQmEsS0FBbEIsQ0FBd0JDLE9BQXhCLENBQWdDd0UsZ0JBQWhDLE1BQXNEdkIsU0FBMUQsRUFBcUU7QUFDcEUsV0FBTyxLQUFLVSxLQUFMLEVBQVA7QUFDQTs7QUFFRCxRQUFNQyxjQUFjLElBQXBCOztBQUdBLE1BQUksT0FBT3JCLElBQVAsS0FBZ0IsV0FBaEIsSUFBK0JBLFNBQVMsSUFBNUMsRUFBa0Q7QUFDakQsV0FBTyxLQUFLb0IsS0FBTCxFQUFQO0FBQ0E7O0FBRUQsUUFBTWMsU0FBUzdGLFdBQVdNLE1BQVgsQ0FBa0JzQixRQUFsQixDQUEyQmtFLElBQTNCLENBQ2Q7QUFBRXpFO0FBQUYsR0FEYyxFQUViZ0UsY0FGYSxDQUVFO0FBQ2hCQyxVQUFNakUsR0FBTixFQUFXa0UsTUFBWCxFQUFtQjtBQUNsQlAsa0JBQVlNLEtBQVosQ0FBa0IsOEJBQWxCLEVBQWtEakUsR0FBbEQsRUFBdURrRSxNQUF2RDtBQUNBLEtBSGU7O0FBSWhCQyxZQUFRbkUsR0FBUixFQUFha0UsTUFBYixFQUFxQjtBQUNwQlAsa0JBQVlRLE9BQVosQ0FBb0IsOEJBQXBCLEVBQW9EbkUsR0FBcEQsRUFBeURrRSxNQUF6RDtBQUNBLEtBTmU7O0FBT2hCRSxZQUFRcEUsR0FBUixFQUFhO0FBQ1oyRCxrQkFBWVMsT0FBWixDQUFvQiw4QkFBcEIsRUFBb0RwRSxHQUFwRDtBQUNBOztBQVRlLEdBRkYsQ0FBZjtBQWNBLE9BQUswRCxLQUFMOztBQUVBLE9BQUtXLE1BQUwsR0FBYyxZQUFXO0FBQ3hCRyxXQUFPRixJQUFQO0FBQ0EsR0FGRDtBQUdBLENBOUNELEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfbWVzc2FnZS1zbmlwcGV0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdNZXNzYWdlX0FsbG93U25pcHBldGluZycsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRncm91cDogJ01lc3NhZ2UnLFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMudXBzZXJ0KCdzbmlwcGV0LW1lc3NhZ2UnLCB7XG5cdFx0JHNldE9uSW5zZXJ0OiB7XG5cdFx0XHRyb2xlczogWydvd25lcicsICdtb2RlcmF0b3InLCAnYWRtaW4nXSxcblx0XHR9LFxuXHR9KTtcbn0pO1xuXG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdHNuaXBwZXRNZXNzYWdlKG1lc3NhZ2UsIGZpbGVuYW1lKSB7XG5cdFx0aWYgKE1ldGVvci51c2VySWQoKSA9PSBudWxsKSB7XG5cdFx0XHQvLyBub2luc3BlY3Rpb24gSlNVbnJlc29sdmVkRnVuY3Rpb25cblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLFxuXHRcdFx0XHR7IG1ldGhvZDogJ3NuaXBwZXRNZXNzYWdlJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZSh7IF9pZDogbWVzc2FnZS5yaWQgfSk7XG5cblx0XHRpZiAoKHR5cGVvZiByb29tID09PSAndW5kZWZpbmVkJykgfHwgKHJvb20gPT09IG51bGwpKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQobWVzc2FnZS5yaWQsIE1ldGVvci51c2VySWQoKSwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cdFx0aWYgKCFzdWJzY3JpcHRpb24pIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBJZiB3ZSBrZWVwIGhpc3Rvcnkgb2YgZWRpdHMsIGluc2VydCBhIG5ldyBtZXNzYWdlIHRvIHN0b3JlIGhpc3RvcnkgaW5mb3JtYXRpb25cblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01lc3NhZ2VfS2VlcEhpc3RvcnknKSkge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY2xvbmVBbmRTYXZlQXNIaXN0b3J5QnlJZChtZXNzYWdlLl9pZCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbWUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChNZXRlb3IudXNlcklkKCkpO1xuXG5cdFx0bWVzc2FnZS5zbmlwcGV0ZWQgPSB0cnVlO1xuXHRcdG1lc3NhZ2Uuc25pcHBldGVkQXQgPSBEYXRlLm5vdztcblx0XHRtZXNzYWdlLnNuaXBwZXRlZEJ5ID0ge1xuXHRcdFx0X2lkOiBNZXRlb3IudXNlcklkKCksXG5cdFx0XHR1c2VybmFtZTogbWUudXNlcm5hbWUsXG5cdFx0fTtcblxuXHRcdG1lc3NhZ2UgPSBSb2NrZXRDaGF0LmNhbGxiYWNrcy5ydW4oJ2JlZm9yZVNhdmVNZXNzYWdlJywgbWVzc2FnZSk7XG5cblx0XHQvLyBDcmVhdGUgdGhlIFNuaXBwZXRNZXNzYWdlXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuc2V0U25pcHBldGVkQnlJZEFuZFVzZXJJZChtZXNzYWdlLCBmaWxlbmFtZSwgbWVzc2FnZS5zbmlwcGV0ZWRCeSxcblx0XHRcdG1lc3NhZ2Uuc25pcHBldGVkLCBEYXRlLm5vdywgZmlsZW5hbWUpO1xuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlcihcblx0XHRcdCdtZXNzYWdlX3NuaXBwZXRlZCcsIG1lc3NhZ2UucmlkLCAnJywgbWUsIHtcdHNuaXBwZXRJZDogbWVzc2FnZS5faWQsIHNuaXBwZXROYW1lOiBmaWxlbmFtZSB9KTtcblx0fSxcbn0pO1xuIiwiLyogZ2xvYmFsIENvb2tpZXMgKi9cbldlYkFwcC5jb25uZWN0SGFuZGxlcnMudXNlKCcvc25pcHBldC9kb3dubG9hZCcsIGZ1bmN0aW9uKHJlcSwgcmVzKSB7XG5cdGxldCByYXdDb29raWVzO1xuXHRsZXQgdG9rZW47XG5cdGxldCB1aWQ7XG5cdGNvbnN0IGNvb2tpZSA9IG5ldyBDb29raWVzKCk7XG5cblx0aWYgKHJlcS5oZWFkZXJzICYmIHJlcS5oZWFkZXJzLmNvb2tpZSAhPT0gbnVsbCkge1xuXHRcdHJhd0Nvb2tpZXMgPSByZXEuaGVhZGVycy5jb29raWU7XG5cdH1cblxuXHRpZiAocmF3Q29va2llcyAhPT0gbnVsbCkge1xuXHRcdHVpZCA9IGNvb2tpZS5nZXQoJ3JjX3VpZCcsIHJhd0Nvb2tpZXMpO1xuXHR9XG5cblx0aWYgKHJhd0Nvb2tpZXMgIT09IG51bGwpIHtcblx0XHR0b2tlbiA9IGNvb2tpZS5nZXQoJ3JjX3Rva2VuJywgcmF3Q29va2llcyk7XG5cdH1cblxuXHRpZiAodWlkID09PSBudWxsKSB7XG5cdFx0dWlkID0gcmVxLnF1ZXJ5LnJjX3VpZDtcblx0XHR0b2tlbiA9IHJlcS5xdWVyeS5yY190b2tlbjtcblx0fVxuXG5cdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZEFuZExvZ2luVG9rZW4odWlkLCB0b2tlbik7XG5cblx0aWYgKCEodWlkICYmIHRva2VuICYmIHVzZXIpKSB7XG5cdFx0cmVzLndyaXRlSGVhZCg0MDMpO1xuXHRcdHJlcy5lbmQoKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0Y29uc3QgbWF0Y2ggPSAvXlxcLyhbXlxcL10rKVxcLyguKikvLmV4ZWMocmVxLnVybCk7XG5cblx0aWYgKG1hdGNoWzFdKSB7XG5cdFx0Y29uc3Qgc25pcHBldCA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmUoXG5cdFx0XHR7XG5cdFx0XHRcdF9pZDogbWF0Y2hbMV0sXG5cdFx0XHRcdHNuaXBwZXRlZDogdHJ1ZSxcblx0XHRcdH1cblx0XHQpO1xuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lKHsgX2lkOiBzbmlwcGV0LnJpZCwgdXNlcm5hbWVzOiB7ICRpbjogW3VzZXIudXNlcm5hbWVdIH0gfSk7XG5cdFx0aWYgKHJvb20gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmVzLndyaXRlSGVhZCg0MDMpO1xuXHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtRGlzcG9zaXRpb24nLCBgYXR0YWNobWVudDsgZmlsZW5hbWUqPVVURi04JyckeyBlbmNvZGVVUklDb21wb25lbnQoc25pcHBldC5zbmlwcGV0TmFtZSkgfWApO1xuXHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nKTtcblxuXHRcdC8vIFJlbW92aW5nIHRoZSBgYGAgY29udGFpbmVkIGluIHRoZSBtc2cuXG5cdFx0Y29uc3Qgc25pcHBldENvbnRlbnQgPSBzbmlwcGV0Lm1zZy5zdWJzdHIoMywgc25pcHBldC5tc2cubGVuZ3RoIC0gNik7XG5cdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1MZW5ndGgnLCBzbmlwcGV0Q29udGVudC5sZW5ndGgpO1xuXHRcdHJlcy53cml0ZShzbmlwcGV0Q29udGVudCk7XG5cdFx0cmVzLmVuZCgpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHJlcy53cml0ZUhlYWQoNDA0KTtcblx0cmVzLmVuZCgpO1xuXHRyZXR1cm47XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdzbmlwcGV0ZWRNZXNzYWdlcycsIGZ1bmN0aW9uKHJpZCwgbGltaXQgPSA1MCkge1xuXHRpZiAodHlwZW9mIHRoaXMudXNlcklkID09PSAndW5kZWZpbmVkJyB8fCB0aGlzLnVzZXJJZCA9PT0gbnVsbCkge1xuXHRcdHJldHVybiB0aGlzLnJlYWR5KCk7XG5cdH1cblxuXHRjb25zdCBwdWJsaWNhdGlvbiA9IHRoaXM7XG5cblx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHRoaXMudXNlcklkKTtcblxuXHRpZiAodHlwZW9mIHVzZXIgPT09ICd1bmRlZmluZWQnIHx8IHVzZXIgPT09IG51bGwpIHtcblx0XHRyZXR1cm4gdGhpcy5yZWFkeSgpO1xuXHR9XG5cblx0Y29uc3QgY3Vyc29ySGFuZGxlID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZFNuaXBwZXRlZEJ5Um9vbShcblx0XHRyaWQsXG5cdFx0e1xuXHRcdFx0c29ydDogeyB0czogLTEgfSxcblx0XHRcdGxpbWl0LFxuXHRcdH1cblx0KS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0YWRkZWQoX2lkLCByZWNvcmQpIHtcblx0XHRcdHB1YmxpY2F0aW9uLmFkZGVkKCdyb2NrZXRjaGF0X3NuaXBwZXRlZF9tZXNzYWdlJywgX2lkLCByZWNvcmQpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZChfaWQsIHJlY29yZCkge1xuXHRcdFx0cHVibGljYXRpb24uY2hhbmdlZCgncm9ja2V0Y2hhdF9zbmlwcGV0ZWRfbWVzc2FnZScsIF9pZCwgcmVjb3JkKTtcblx0XHR9LFxuXHRcdHJlbW92ZWQoX2lkKSB7XG5cdFx0XHRwdWJsaWNhdGlvbi5yZW1vdmVkKCdyb2NrZXRjaGF0X3NuaXBwZXRlZF9tZXNzYWdlJywgX2lkKTtcblx0XHR9LFxuXHR9KTtcblx0dGhpcy5yZWFkeSgpO1xuXG5cdHRoaXMub25TdG9wID0gZnVuY3Rpb24oKSB7XG5cdFx0Y3Vyc29ySGFuZGxlLnN0b3AoKTtcblx0fTtcbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ3NuaXBwZXRlZE1lc3NhZ2UnLCBmdW5jdGlvbihfaWQpIHtcblx0aWYgKHR5cGVvZiB0aGlzLnVzZXJJZCA9PT0gJ3VuZGVmaW5lZCcgfHwgdGhpcy51c2VySWQgPT09IG51bGwpIHtcblx0XHRyZXR1cm4gdGhpcy5yZWFkeSgpO1xuXHR9XG5cblx0Y29uc3Qgc25pcHBldCA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmUoeyBfaWQsIHNuaXBwZXRlZDogdHJ1ZSB9KTtcblx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHRoaXMudXNlcklkKTtcblx0Y29uc3Qgcm9vbVNuaXBwZXRRdWVyeSA9IHtcblx0XHRfaWQ6IHNuaXBwZXQucmlkLFxuXHRcdHVzZXJuYW1lczoge1xuXHRcdFx0JGluOiBbXG5cdFx0XHRcdHVzZXIudXNlcm5hbWUsXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH07XG5cblx0aWYgKFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmUocm9vbVNuaXBwZXRRdWVyeSkgPT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiB0aGlzLnJlYWR5KCk7XG5cdH1cblxuXHRjb25zdCBwdWJsaWNhdGlvbiA9IHRoaXM7XG5cblxuXHRpZiAodHlwZW9mIHVzZXIgPT09ICd1bmRlZmluZWQnIHx8IHVzZXIgPT09IG51bGwpIHtcblx0XHRyZXR1cm4gdGhpcy5yZWFkeSgpO1xuXHR9XG5cblx0Y29uc3QgY3Vyc29yID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZChcblx0XHR7IF9pZCB9XG5cdCkub2JzZXJ2ZUNoYW5nZXMoe1xuXHRcdGFkZGVkKF9pZCwgcmVjb3JkKSB7XG5cdFx0XHRwdWJsaWNhdGlvbi5hZGRlZCgncm9ja2V0Y2hhdF9zbmlwcGV0ZWRfbWVzc2FnZScsIF9pZCwgcmVjb3JkKTtcblx0XHR9LFxuXHRcdGNoYW5nZWQoX2lkLCByZWNvcmQpIHtcblx0XHRcdHB1YmxpY2F0aW9uLmNoYW5nZWQoJ3JvY2tldGNoYXRfc25pcHBldGVkX21lc3NhZ2UnLCBfaWQsIHJlY29yZCk7XG5cdFx0fSxcblx0XHRyZW1vdmVkKF9pZCkge1xuXHRcdFx0cHVibGljYXRpb24ucmVtb3ZlZCgncm9ja2V0Y2hhdF9zbmlwcGV0ZWRfbWVzc2FnZScsIF9pZCk7XG5cdFx0fSxcblx0fSk7XG5cblx0dGhpcy5yZWFkeSgpO1xuXG5cdHRoaXMub25TdG9wID0gZnVuY3Rpb24oKSB7XG5cdFx0Y3Vyc29yLnN0b3AoKTtcblx0fTtcbn0pO1xuIl19
