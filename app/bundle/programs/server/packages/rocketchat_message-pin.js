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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:message-pin":{"server":{"settings.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_message-pin/server/settings.js                                                             //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Meteor.startup(function () {
  RocketChat.settings.add('Message_AllowPinning', true, {
    type: 'boolean',
    group: 'Message',
    public: true
  });
  return RocketChat.models.Permissions.upsert('pin-message', {
    $setOnInsert: {
      roles: ['owner', 'moderator', 'admin']
    }
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"pinMessage.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_message-pin/server/pinMessage.js                                                           //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
const recursiveRemove = (msg, deep = 1) => {
  if (!msg) {
    return;
  }

  if (deep > RocketChat.settings.get('Message_QuoteChainLimit')) {
    delete msg.attachments;
    return msg;
  }

  msg.attachments = Array.isArray(msg.attachments) ? msg.attachments.map(nestedMsg => recursiveRemove(nestedMsg, deep + 1)) : null;
  return msg;
};

const shouldAdd = (attachments, attachment) => !attachments.some(({
  message_link
}) => message_link && message_link === attachment.message_link);

Meteor.methods({
  pinMessage(message, pinnedAt) {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'pinMessage'
      });
    }

    if (!RocketChat.settings.get('Message_AllowPinning')) {
      throw new Meteor.Error('error-action-not-allowed', 'Message pinning not allowed', {
        method: 'pinMessage',
        action: 'Message_pinning'
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

    let originalMessage = RocketChat.models.Messages.findOneById(message._id);

    if (originalMessage == null || originalMessage._id == null) {
      throw new Meteor.Error('error-invalid-message', 'Message you are pinning was not found', {
        method: 'pinMessage',
        action: 'Message_pinning'
      });
    } // If we keep history of edits, insert a new message to store history information


    if (RocketChat.settings.get('Message_KeepHistory')) {
      RocketChat.models.Messages.cloneAndSaveAsHistoryById(message._id);
    }

    const me = RocketChat.models.Users.findOneById(userId);
    originalMessage.pinned = true;
    originalMessage.pinnedAt = pinnedAt || Date.now;
    originalMessage.pinnedBy = {
      _id: userId,
      username: me.username
    };
    originalMessage = RocketChat.callbacks.run('beforeSaveMessage', originalMessage);
    RocketChat.models.Messages.setPinnedByIdAndUserId(originalMessage._id, originalMessage.pinnedBy, originalMessage.pinned);
    const attachments = [];

    if (Array.isArray(originalMessage.attachments)) {
      originalMessage.attachments.forEach(attachment => {
        if (!attachment.message_link || shouldAdd(attachments, attachment)) {
          attachments.push(attachment);
        }
      });
    }

    return RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('message_pinned', originalMessage.rid, '', me, {
      attachments: [{
        text: originalMessage.msg,
        author_name: originalMessage.u.username,
        author_icon: getAvatarUrlFromUsername(originalMessage.u.username),
        ts: originalMessage.ts,
        attachments: recursiveRemove(attachments)
      }]
    });
  },

  unpinMessage(message) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'unpinMessage'
      });
    }

    if (!RocketChat.settings.get('Message_AllowPinning')) {
      throw new Meteor.Error('error-action-not-allowed', 'Message pinning not allowed', {
        method: 'unpinMessage',
        action: 'Message_pinning'
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

    let originalMessage = RocketChat.models.Messages.findOneById(message._id);

    if (originalMessage == null || originalMessage._id == null) {
      throw new Meteor.Error('error-invalid-message', 'Message you are unpinning was not found', {
        method: 'unpinMessage',
        action: 'Message_pinning'
      });
    } // If we keep history of edits, insert a new message to store history information


    if (RocketChat.settings.get('Message_KeepHistory')) {
      RocketChat.models.Messages.cloneAndSaveAsHistoryById(originalMessage._id);
    }

    const me = RocketChat.models.Users.findOneById(Meteor.userId());
    originalMessage.pinned = false;
    originalMessage.pinnedBy = {
      _id: Meteor.userId(),
      username: me.username
    };
    originalMessage = RocketChat.callbacks.run('beforeSaveMessage', originalMessage);
    return RocketChat.models.Messages.setPinnedByIdAndUserId(originalMessage._id, originalMessage.pinnedBy, originalMessage.pinned);
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications":{"pinnedMessages.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_message-pin/server/publications/pinnedMessages.js                                          //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Meteor.publish('pinnedMessages', function (rid, limit = 50) {
  if (!this.userId) {
    return this.ready();
  }

  const publication = this;
  const user = RocketChat.models.Users.findOneById(this.userId);

  if (!user) {
    return this.ready();
  }

  const cursorHandle = RocketChat.models.Messages.findPinnedByRoom(rid, {
    sort: {
      ts: -1
    },
    limit
  }).observeChanges({
    added(_id, record) {
      return publication.added('rocketchat_pinned_message', _id, record);
    },

    changed(_id, record) {
      return publication.changed('rocketchat_pinned_message', _id, record);
    },

    removed(_id) {
      return publication.removed('rocketchat_pinned_message', _id);
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
// packages/rocketchat_message-pin/server/startup/indexes.js                                                      //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Meteor.startup(function () {
  return Meteor.defer(function () {
    return RocketChat.models.Messages.tryEnsureIndex({
      'pinnedBy._id': 1
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
require("/node_modules/meteor/rocketchat:message-pin/server/settings.js");
require("/node_modules/meteor/rocketchat:message-pin/server/pinMessage.js");
require("/node_modules/meteor/rocketchat:message-pin/server/publications/pinnedMessages.js");
require("/node_modules/meteor/rocketchat:message-pin/server/startup/indexes.js");

/* Exports */
Package._define("rocketchat:message-pin");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_message-pin.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptZXNzYWdlLXBpbi9zZXJ2ZXIvc2V0dGluZ3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWVzc2FnZS1waW4vc2VydmVyL3Bpbk1lc3NhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWVzc2FnZS1waW4vc2VydmVyL3B1YmxpY2F0aW9ucy9waW5uZWRNZXNzYWdlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptZXNzYWdlLXBpbi9zZXJ2ZXIvc3RhcnR1cC9pbmRleGVzLmpzIl0sIm5hbWVzIjpbIk1ldGVvciIsInN0YXJ0dXAiLCJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJhZGQiLCJ0eXBlIiwiZ3JvdXAiLCJwdWJsaWMiLCJtb2RlbHMiLCJQZXJtaXNzaW9ucyIsInVwc2VydCIsIiRzZXRPbkluc2VydCIsInJvbGVzIiwicmVjdXJzaXZlUmVtb3ZlIiwibXNnIiwiZGVlcCIsImdldCIsImF0dGFjaG1lbnRzIiwiQXJyYXkiLCJpc0FycmF5IiwibWFwIiwibmVzdGVkTXNnIiwic2hvdWxkQWRkIiwiYXR0YWNobWVudCIsInNvbWUiLCJtZXNzYWdlX2xpbmsiLCJtZXRob2RzIiwicGluTWVzc2FnZSIsIm1lc3NhZ2UiLCJwaW5uZWRBdCIsInVzZXJJZCIsIkVycm9yIiwibWV0aG9kIiwiYWN0aW9uIiwic3Vic2NyaXB0aW9uIiwiU3Vic2NyaXB0aW9ucyIsImZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZCIsInJpZCIsImZpZWxkcyIsIl9pZCIsIm9yaWdpbmFsTWVzc2FnZSIsIk1lc3NhZ2VzIiwiZmluZE9uZUJ5SWQiLCJjbG9uZUFuZFNhdmVBc0hpc3RvcnlCeUlkIiwibWUiLCJVc2VycyIsInBpbm5lZCIsIkRhdGUiLCJub3ciLCJwaW5uZWRCeSIsInVzZXJuYW1lIiwiY2FsbGJhY2tzIiwicnVuIiwic2V0UGlubmVkQnlJZEFuZFVzZXJJZCIsImZvckVhY2giLCJwdXNoIiwiY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlciIsInRleHQiLCJhdXRob3JfbmFtZSIsInUiLCJhdXRob3JfaWNvbiIsImdldEF2YXRhclVybEZyb21Vc2VybmFtZSIsInRzIiwidW5waW5NZXNzYWdlIiwicHVibGlzaCIsImxpbWl0IiwicmVhZHkiLCJwdWJsaWNhdGlvbiIsInVzZXIiLCJjdXJzb3JIYW5kbGUiLCJmaW5kUGlubmVkQnlSb29tIiwic29ydCIsIm9ic2VydmVDaGFuZ2VzIiwiYWRkZWQiLCJyZWNvcmQiLCJjaGFuZ2VkIiwicmVtb3ZlZCIsIm9uU3RvcCIsInN0b3AiLCJkZWZlciIsInRyeUVuc3VyZUluZGV4Iiwic3BhcnNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsT0FBUCxDQUFlLFlBQVc7QUFDekJDLGFBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLHNCQUF4QixFQUFnRCxJQUFoRCxFQUFzRDtBQUNyREMsVUFBTSxTQUQrQztBQUVyREMsV0FBTyxTQUY4QztBQUdyREMsWUFBUTtBQUg2QyxHQUF0RDtBQUtBLFNBQU9MLFdBQVdNLE1BQVgsQ0FBa0JDLFdBQWxCLENBQThCQyxNQUE5QixDQUFxQyxhQUFyQyxFQUFvRDtBQUMxREMsa0JBQWM7QUFDYkMsYUFBTyxDQUFDLE9BQUQsRUFBVSxXQUFWLEVBQXVCLE9BQXZCO0FBRE07QUFENEMsR0FBcEQsQ0FBUDtBQUtBLENBWEQsRTs7Ozs7Ozs7Ozs7QUNBQSxNQUFNQyxrQkFBa0IsQ0FBQ0MsR0FBRCxFQUFNQyxPQUFPLENBQWIsS0FBbUI7QUFDMUMsTUFBSSxDQUFDRCxHQUFMLEVBQVU7QUFDVDtBQUNBOztBQUVELE1BQUlDLE9BQU9iLFdBQVdDLFFBQVgsQ0FBb0JhLEdBQXBCLENBQXdCLHlCQUF4QixDQUFYLEVBQStEO0FBQzlELFdBQU9GLElBQUlHLFdBQVg7QUFDQSxX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QixFQUFpRHJDLEdBQWpELENBQVA7QUFDQTs7QUFUZ0gsR0FBN0YsQ0FBckI7QUFXQSxPQUFLMkIsS0FBTDtBQUNBLFNBQU8sS0FBS1csTUFBTCxDQUFZLFlBQVc7QUFDN0IsV0FBT1IsYUFBYVMsSUFBYixFQUFQO0FBQ0EsR0FGTSxDQUFQO0FBR0EsQ0F6QkQsRTs7Ozs7Ozs7Ozs7QUNBQTlFLE9BQU9DLE9BQVAsQ0FBZSxZQUFXO0FBQ3pCLFNBQU9ELE9BQU8rRSxLQUFQLENBQWEsWUFBVztBQUM5QixXQUFPN0UsV0FBV00sTUFBWCxDQUFrQmlDLFFBQWxCLENBQTJCdUMsY0FBM0IsQ0FBMEM7QUFDaEQsc0JBQWdCO0FBRGdDLEtBQTFDLEVBRUo7QUFDRkMsY0FBUTtBQUROLEtBRkksQ0FBUDtBQUtBLEdBTk0sQ0FBUDtBQU9BLENBUkQsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9tZXNzYWdlLXBpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTWVzc2FnZV9BbGxvd1Bpbm5pbmcnLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTWVzc2FnZScsXG5cdFx0cHVibGljOiB0cnVlLFxuXHR9KTtcblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLnVwc2VydCgncGluLW1lc3NhZ2UnLCB7XG5cdFx0JHNldE9uSW5zZXJ0OiB7XG5cdFx0XHRyb2xlczogWydvd25lcicsICdtb2RlcmF0b3InLCAnYWRtaW4nXSxcblx0XHR9LFxuXHR9KTtcbn0pO1xuIiwiY29uc3QgcmVjdXJzaXZlUmVtb3ZlID0gKG1zZywgZGVlcCA9IDEpID0+IHtcblx0aWYgKCFtc2cpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoZGVlcCA+IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNZXNzYWdlX1F1b3RlQ2hhaW5MaW1pdCcpKSB7XG5cdFx0ZGVsZXRlIG1zZy5hdHRhY2htZW50cztcblx0XHRyZXR1cm4gbXNnO1xuXHR9XG5cblx0bXNnLmF0dGFjaG1lbnRzID0gQXJyYXkuaXNBcnJheShtc2cuYXR0YWNobWVudHMpID8gbXNnLmF0dGFjaG1lbnRzLm1hcChcblx0XHQobmVzdGVkTXNnKSA9PiByZWN1cnNpdmVSZW1vdmUobmVzdGVkTXNnLCBkZWVwICsgMSlcblx0KSA6IG51bGw7XG5cblx0cmV0dXJuIG1zZztcbn07XG5cbmNvbnN0IHNob3VsZEFkZCA9IChhdHRhY2htZW50cywgYXR0YWNobWVudCkgPT4gIWF0dGFjaG1lbnRzLnNvbWUoKHsgbWVzc2FnZV9saW5rIH0pID0+IG1lc3NhZ2VfbGluayAmJiBtZXNzYWdlX2xpbmsgPT09IGF0dGFjaG1lbnQubWVzc2FnZV9saW5rKTtcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRwaW5NZXNzYWdlKG1lc3NhZ2UsIHBpbm5lZEF0KSB7XG5cdFx0Y29uc3QgdXNlcklkID0gTWV0ZW9yLnVzZXJJZCgpO1xuXHRcdGlmICghdXNlcklkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywge1xuXHRcdFx0XHRtZXRob2Q6ICdwaW5NZXNzYWdlJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmICghUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01lc3NhZ2VfQWxsb3dQaW5uaW5nJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdNZXNzYWdlIHBpbm5pbmcgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3Bpbk1lc3NhZ2UnLFxuXHRcdFx0XHRhY3Rpb246ICdNZXNzYWdlX3Bpbm5pbmcnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQobWVzc2FnZS5yaWQsIE1ldGVvci51c2VySWQoKSwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cdFx0aWYgKCFzdWJzY3JpcHRpb24pIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRsZXQgb3JpZ2luYWxNZXNzYWdlID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZUJ5SWQobWVzc2FnZS5faWQpO1xuXHRcdGlmIChvcmlnaW5hbE1lc3NhZ2UgPT0gbnVsbCB8fCBvcmlnaW5hbE1lc3NhZ2UuX2lkID09IG51bGwpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtbWVzc2FnZScsICdNZXNzYWdlIHlvdSBhcmUgcGlubmluZyB3YXMgbm90IGZvdW5kJywge1xuXHRcdFx0XHRtZXRob2Q6ICdwaW5NZXNzYWdlJyxcblx0XHRcdFx0YWN0aW9uOiAnTWVzc2FnZV9waW5uaW5nJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vIElmIHdlIGtlZXAgaGlzdG9yeSBvZiBlZGl0cywgaW5zZXJ0IGEgbmV3IG1lc3NhZ2UgdG8gc3RvcmUgaGlzdG9yeSBpbmZvcm1hdGlvblxuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWVzc2FnZV9LZWVwSGlzdG9yeScpKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jbG9uZUFuZFNhdmVBc0hpc3RvcnlCeUlkKG1lc3NhZ2UuX2lkKTtcblx0XHR9XG5cblx0XHRjb25zdCBtZSA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHVzZXJJZCk7XG5cblx0XHRvcmlnaW5hbE1lc3NhZ2UucGlubmVkID0gdHJ1ZTtcblx0XHRvcmlnaW5hbE1lc3NhZ2UucGlubmVkQXQgPSBwaW5uZWRBdCB8fCBEYXRlLm5vdztcblx0XHRvcmlnaW5hbE1lc3NhZ2UucGlubmVkQnkgPSB7XG5cdFx0XHRfaWQ6IHVzZXJJZCxcblx0XHRcdHVzZXJuYW1lOiBtZS51c2VybmFtZSxcblx0XHR9O1xuXG5cdFx0b3JpZ2luYWxNZXNzYWdlID0gUm9ja2V0Q2hhdC5jYWxsYmFja3MucnVuKCdiZWZvcmVTYXZlTWVzc2FnZScsIG9yaWdpbmFsTWVzc2FnZSk7XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5zZXRQaW5uZWRCeUlkQW5kVXNlcklkKG9yaWdpbmFsTWVzc2FnZS5faWQsIG9yaWdpbmFsTWVzc2FnZS5waW5uZWRCeSwgb3JpZ2luYWxNZXNzYWdlLnBpbm5lZCk7XG5cblx0XHRjb25zdCBhdHRhY2htZW50cyA9IFtdO1xuXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkob3JpZ2luYWxNZXNzYWdlLmF0dGFjaG1lbnRzKSkge1xuXHRcdFx0b3JpZ2luYWxNZXNzYWdlLmF0dGFjaG1lbnRzLmZvckVhY2goKGF0dGFjaG1lbnQpID0+IHtcblx0XHRcdFx0aWYgKCFhdHRhY2htZW50Lm1lc3NhZ2VfbGluayB8fCBzaG91bGRBZGQoYXR0YWNobWVudHMsIGF0dGFjaG1lbnQpKSB7XG5cdFx0XHRcdFx0YXR0YWNobWVudHMucHVzaChhdHRhY2htZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIoXG5cdFx0XHQnbWVzc2FnZV9waW5uZWQnLFxuXHRcdFx0b3JpZ2luYWxNZXNzYWdlLnJpZCxcblx0XHRcdCcnLFxuXHRcdFx0bWUsXG5cdFx0XHR7XG5cdFx0XHRcdGF0dGFjaG1lbnRzOiBbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0dGV4dDogb3JpZ2luYWxNZXNzYWdlLm1zZyxcblx0XHRcdFx0XHRcdGF1dGhvcl9uYW1lOiBvcmlnaW5hbE1lc3NhZ2UudS51c2VybmFtZSxcblx0XHRcdFx0XHRcdGF1dGhvcl9pY29uOiBnZXRBdmF0YXJVcmxGcm9tVXNlcm5hbWUoXG5cdFx0XHRcdFx0XHRcdG9yaWdpbmFsTWVzc2FnZS51LnVzZXJuYW1lXG5cdFx0XHRcdFx0XHQpLFxuXHRcdFx0XHRcdFx0dHM6IG9yaWdpbmFsTWVzc2FnZS50cyxcblx0XHRcdFx0XHRcdGF0dGFjaG1lbnRzOiByZWN1cnNpdmVSZW1vdmUoYXR0YWNobWVudHMpLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdF0sXG5cdFx0XHR9XG5cdFx0KTtcblx0fSxcblx0dW5waW5NZXNzYWdlKG1lc3NhZ2UpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHtcblx0XHRcdFx0bWV0aG9kOiAndW5waW5NZXNzYWdlJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmICghUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01lc3NhZ2VfQWxsb3dQaW5uaW5nJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdNZXNzYWdlIHBpbm5pbmcgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3VucGluTWVzc2FnZScsXG5cdFx0XHRcdGFjdGlvbjogJ01lc3NhZ2VfcGlubmluZycsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChtZXNzYWdlLnJpZCwgTWV0ZW9yLnVzZXJJZCgpLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KTtcblx0XHRpZiAoIXN1YnNjcmlwdGlvbikge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGxldCBvcmlnaW5hbE1lc3NhZ2UgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZChtZXNzYWdlLl9pZCk7XG5cblx0XHRpZiAob3JpZ2luYWxNZXNzYWdlID09IG51bGwgfHwgb3JpZ2luYWxNZXNzYWdlLl9pZCA9PSBudWxsKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLW1lc3NhZ2UnLCAnTWVzc2FnZSB5b3UgYXJlIHVucGlubmluZyB3YXMgbm90IGZvdW5kJywge1xuXHRcdFx0XHRtZXRob2Q6ICd1bnBpbk1lc3NhZ2UnLFxuXHRcdFx0XHRhY3Rpb246ICdNZXNzYWdlX3Bpbm5pbmcnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgd2Uga2VlcCBoaXN0b3J5IG9mIGVkaXRzLCBpbnNlcnQgYSBuZXcgbWVzc2FnZSB0byBzdG9yZSBoaXN0b3J5IGluZm9ybWF0aW9uXG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNZXNzYWdlX0tlZXBIaXN0b3J5JykpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNsb25lQW5kU2F2ZUFzSGlzdG9yeUJ5SWQob3JpZ2luYWxNZXNzYWdlLl9pZCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbWUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChNZXRlb3IudXNlcklkKCkpO1xuXHRcdG9yaWdpbmFsTWVzc2FnZS5waW5uZWQgPSBmYWxzZTtcblx0XHRvcmlnaW5hbE1lc3NhZ2UucGlubmVkQnkgPSB7XG5cdFx0XHRfaWQ6IE1ldGVvci51c2VySWQoKSxcblx0XHRcdHVzZXJuYW1lOiBtZS51c2VybmFtZSxcblx0XHR9O1xuXHRcdG9yaWdpbmFsTWVzc2FnZSA9IFJvY2tldENoYXQuY2FsbGJhY2tzLnJ1bignYmVmb3JlU2F2ZU1lc3NhZ2UnLCBvcmlnaW5hbE1lc3NhZ2UpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLnNldFBpbm5lZEJ5SWRBbmRVc2VySWQob3JpZ2luYWxNZXNzYWdlLl9pZCwgb3JpZ2luYWxNZXNzYWdlLnBpbm5lZEJ5LCBvcmlnaW5hbE1lc3NhZ2UucGlubmVkKTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ3Bpbm5lZE1lc3NhZ2VzJywgZnVuY3Rpb24ocmlkLCBsaW1pdCA9IDUwKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5yZWFkeSgpO1xuXHR9XG5cdGNvbnN0IHB1YmxpY2F0aW9uID0gdGhpcztcblxuXHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodGhpcy51c2VySWQpO1xuXHRpZiAoIXVzZXIpIHtcblx0XHRyZXR1cm4gdGhpcy5yZWFkeSgpO1xuXHR9XG5cdGNvbnN0IGN1cnNvckhhbmRsZSA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRQaW5uZWRCeVJvb20ocmlkLCB7IHNvcnQ6IHsgdHM6IC0xIH0sIGxpbWl0IH0pLm9ic2VydmVDaGFuZ2VzKHtcblx0XHRhZGRlZChfaWQsIHJlY29yZCkge1xuXHRcdFx0cmV0dXJuIHB1YmxpY2F0aW9uLmFkZGVkKCdyb2NrZXRjaGF0X3Bpbm5lZF9tZXNzYWdlJywgX2lkLCByZWNvcmQpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZChfaWQsIHJlY29yZCkge1xuXHRcdFx0cmV0dXJuIHB1YmxpY2F0aW9uLmNoYW5nZWQoJ3JvY2tldGNoYXRfcGlubmVkX21lc3NhZ2UnLCBfaWQsIHJlY29yZCk7XG5cdFx0fSxcblx0XHRyZW1vdmVkKF9pZCkge1xuXHRcdFx0cmV0dXJuIHB1YmxpY2F0aW9uLnJlbW92ZWQoJ3JvY2tldGNoYXRfcGlubmVkX21lc3NhZ2UnLCBfaWQpO1xuXHRcdH0sXG5cdH0pO1xuXHR0aGlzLnJlYWR5KCk7XG5cdHJldHVybiB0aGlzLm9uU3RvcChmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gY3Vyc29ySGFuZGxlLnN0b3AoKTtcblx0fSk7XG59KTtcbiIsIk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gTWV0ZW9yLmRlZmVyKGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy50cnlFbnN1cmVJbmRleCh7XG5cdFx0XHQncGlubmVkQnkuX2lkJzogMSxcblx0XHR9LCB7XG5cdFx0XHRzcGFyc2U6IDEsXG5cdFx0fSk7XG5cdH0pO1xufSk7XG4iXX0=
