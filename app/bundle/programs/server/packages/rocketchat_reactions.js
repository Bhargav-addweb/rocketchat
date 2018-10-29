(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var fileUpload = Package['rocketchat:ui'].fileUpload;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var reaction, shouldReact;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:reactions":{"server":{"models":{"Messages.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_reactions/server/models/Messages.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.models.Messages.setReactions = function (messageId, reactions) {
  return this.update({
    _id: messageId
  }, {
    $set: {
      reactions
    }
  });
};

RocketChat.models.Messages.unsetReactions = function (messageId) {
  return this.update({
    _id: messageId
  }, {
    $unset: {
      reactions: 1
    }
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"setReaction.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_reactions/setReaction.js                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

const removeUserReaction = (message, reaction, username) => {
  message.reactions[reaction].usernames.splice(message.reactions[reaction].usernames.indexOf(username), 1);

  if (message.reactions[reaction].usernames.length === 0) {
    delete message.reactions[reaction];
  }

  return message;
};

Meteor.methods({
  setReaction(reaction, messageId, shouldReact) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'setReaction'
      });
    }

    const message = RocketChat.models.Messages.findOneById(messageId);

    if (!message) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'setReaction'
      });
    }

    const room = Meteor.call('canAccessRoom', message.rid, Meteor.userId());

    if (!room) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'setReaction'
      });
    }

    reaction = `:${reaction.replace(/:/g, '')}:`;

    if (!RocketChat.emoji.list[reaction] && RocketChat.models.EmojiCustom.findByNameOrAlias(reaction).count() === 0) {
      throw new Meteor.Error('error-not-allowed', 'Invalid emoji provided.', {
        method: 'setReaction'
      });
    }

    const user = Meteor.user();

    if (Array.isArray(room.muted) && room.muted.indexOf(user.username) !== -1 && !room.reactWhenReadOnly) {
      RocketChat.Notifications.notifyUser(Meteor.userId(), 'message', {
        _id: Random.id(),
        rid: room._id,
        ts: new Date(),
        msg: TAPi18n.__('You_have_been_muted', {}, user.language)
      });
      return false;
    } else if (!RocketChat.models.Subscriptions.findOne({
      rid: message.rid
    })) {
      return false;
    }

    const userAlreadyReacted = Boolean(message.reactions) && Boolean(message.reactions[reaction]) && message.reactions[reaction].usernames.indexOf(user.username) !== -1; // When shouldReact was not informed, toggle the reaction.

    if (shouldReact === undefined) {
      shouldReact = !userAlreadyReacted;
    }

    if (userAlreadyReacted === shouldReact) {
      return;
    }

    if (userAlreadyReacted) {
      removeUserReaction(message, reaction, user.username);

      if (_.isEmpty(message.reactions)) {
        delete message.reactions;
        RocketChat.models.Messages.unsetReactions(messageId);
        RocketChat.callbacks.run('unsetReaction', messageId, reaction);
      } else {
        RocketChat.models.Messages.setReactions(messageId, message.reactions);
        RocketChat.callbacks.run('setReaction', messageId, reaction);
      }
    } else {
      if (!message.reactions) {
        message.reactions = {};
      }

      if (!message.reactions[reaction]) {
        message.reactions[reaction] = {
          usernames: []
        };
      }

      message.reactions[reaction].usernames.push(user.username);
      RocketChat.models.Messages.setReactions(messageId, message.reactions);
      RocketChat.callbacks.run('setReaction', messageId, reaction);
    }

    msgStream.emit(message.rid, message);
    return;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:reactions/server/models/Messages.js");
require("/node_modules/meteor/rocketchat:reactions/setReaction.js");

/* Exports */
Package._define("rocketchat:reactions");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_reactions.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpyZWFjdGlvbnMvc2VydmVyL21vZGVscy9NZXNzYWdlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpyZWFjdGlvbnMvc2V0UmVhY3Rpb24uanMiXSwibmFtZXMiOlsiUm9ja2V0Q2hhdCIsIm1vZGVscyIsIk1lc3NhZ2VzIiwic2V0UmVhY3Rpb25zIiwibWVzc2FnZUlkIiwicmVhY3Rpb25zIiwidXBkYXRlIiwiX2lkIiwiJHNldCIsInVuc2V0UmVhY3Rpb25zIiwiJHVuc2V0IiwiXyIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwicmVtb3ZlVXNlclJlYWN0aW9uIiwibWVzc2FnZSIsInJlYWN0aW9uIiwidXNlcm5hbWUiLCJ1c2VybmFtZXMiLCJzcGxpY2UiLCJpbmRleE9mIiwibGVuZ3RoIiwiTWV0ZW9yIiwibWV0aG9kcyIsInNldFJlYWN0aW9uIiwic2hvdWxkUmVhY3QiLCJ1c2VySWQiLCJFcnJvciIsIm1ldGhvZCIsImZpbmRPbmVCeUlkIiwicm9vbSIsImNhbGwiLCJyaWQiLCJyZXBsYWNlIiwiZW1vamkiLCJsaXN0IiwiRW1vamlDdXN0b20iLCJmaW5kQnlOYW1lT3JBbGlhcyIsImNvdW50IiwidXNlciIsIkFycmF5IiwiaXNBcnJheSIsIm11dGVkIiwicmVhY3RXaGVuUmVhZE9ubHkiLCJOb3RpZmljYXRpb25zIiwibm90aWZ5VXNlciIsIlJhbmRvbSIsImlkIiwidHMiLCJEYXRlIiwibXNnIiwiVEFQaTE4biIsIl9fIiwibGFuZ3VhZ2UiLCJTdWJzY3JpcHRpb25zIiwiZmluZE9uZSIsInVzZXJBbHJlYWR5UmVhY3RlZCIsIkJvb2xlYW4iLCJ1bmRlZmluZWQiLCJpc0VtcHR5IiwiY2FsbGJhY2tzIiwicnVuIiwicHVzaCIsIm1zZ1N0cmVhbSIsImVtaXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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T0FBNUI7QUFFQTtBQUNBOztBQTVFYSxDQUFmLEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfcmVhY3Rpb25zLmpzIiwic291cmNlc0NvbnRlbnQiOlsiUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuc2V0UmVhY3Rpb25zID0gZnVuY3Rpb24obWVzc2FnZUlkLCByZWFjdGlvbnMpIHtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHsgX2lkOiBtZXNzYWdlSWQgfSwgeyAkc2V0OiB7IHJlYWN0aW9ucyB9IH0pO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMudW5zZXRSZWFjdGlvbnMgPSBmdW5jdGlvbihtZXNzYWdlSWQpIHtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHsgX2lkOiBtZXNzYWdlSWQgfSwgeyAkdW5zZXQ6IHsgcmVhY3Rpb25zOiAxIH0gfSk7XG59O1xuIiwiLyogZ2xvYmFscyBtc2dTdHJlYW0gKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5jb25zdCByZW1vdmVVc2VyUmVhY3Rpb24gPSAobWVzc2FnZSwgcmVhY3Rpb24sIHVzZXJuYW1lKSA9PiB7XG5cdG1lc3NhZ2UucmVhY3Rpb25zW3JlYWN0aW9uXS51c2VybmFtZXMuc3BsaWNlKG1lc3NhZ2UucmVhY3Rpb25zW3JlYWN0aW9uXS51c2VybmFtZXMuaW5kZXhPZih1c2VybmFtZSksIDEpO1xuXHRpZiAobWVzc2FnZS5yZWFjdGlvbnNbcmVhY3Rpb25dLnVzZXJuYW1lcy5sZW5ndGggPT09IDApIHtcblx0XHRkZWxldGUgbWVzc2FnZS5yZWFjdGlvbnNbcmVhY3Rpb25dO1xuXHR9XG5cdHJldHVybiBtZXNzYWdlO1xufTtcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRzZXRSZWFjdGlvbihyZWFjdGlvbiwgbWVzc2FnZUlkLCBzaG91bGRSZWFjdCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdzZXRSZWFjdGlvbicgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbWVzc2FnZSA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKG1lc3NhZ2VJZCk7XG5cblx0XHRpZiAoIW1lc3NhZ2UpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdzZXRSZWFjdGlvbicgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm9vbSA9IE1ldGVvci5jYWxsKCdjYW5BY2Nlc3NSb29tJywgbWVzc2FnZS5yaWQsIE1ldGVvci51c2VySWQoKSk7XG5cblx0XHRpZiAoIXJvb20pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdzZXRSZWFjdGlvbicgfSk7XG5cdFx0fVxuXG5cdFx0cmVhY3Rpb24gPSBgOiR7IHJlYWN0aW9uLnJlcGxhY2UoLzovZywgJycpIH06YDtcblxuXHRcdGlmICghUm9ja2V0Q2hhdC5lbW9qaS5saXN0W3JlYWN0aW9uXSAmJiBSb2NrZXRDaGF0Lm1vZGVscy5FbW9qaUN1c3RvbS5maW5kQnlOYW1lT3JBbGlhcyhyZWFjdGlvbikuY291bnQoKSA9PT0gMCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnSW52YWxpZCBlbW9qaSBwcm92aWRlZC4nLCB7IG1ldGhvZDogJ3NldFJlYWN0aW9uJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXIoKTtcblxuXHRcdGlmIChBcnJheS5pc0FycmF5KHJvb20ubXV0ZWQpICYmIHJvb20ubXV0ZWQuaW5kZXhPZih1c2VyLnVzZXJuYW1lKSAhPT0gLTEgJiYgIXJvb20ucmVhY3RXaGVuUmVhZE9ubHkpIHtcblx0XHRcdFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlVc2VyKE1ldGVvci51c2VySWQoKSwgJ21lc3NhZ2UnLCB7XG5cdFx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRcdHJpZDogcm9vbS5faWQsXG5cdFx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0XHRtc2c6IFRBUGkxOG4uX18oJ1lvdV9oYXZlX2JlZW5fbXV0ZWQnLCB7fSwgdXNlci5sYW5ndWFnZSksXG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9IGVsc2UgaWYgKCFSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmUoeyByaWQ6IG1lc3NhZ2UucmlkIH0pKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXNlckFscmVhZHlSZWFjdGVkID0gQm9vbGVhbihtZXNzYWdlLnJlYWN0aW9ucykgJiYgQm9vbGVhbihtZXNzYWdlLnJlYWN0aW9uc1tyZWFjdGlvbl0pICYmIG1lc3NhZ2UucmVhY3Rpb25zW3JlYWN0aW9uXS51c2VybmFtZXMuaW5kZXhPZih1c2VyLnVzZXJuYW1lKSAhPT0gLTE7XG5cdFx0Ly8gV2hlbiBzaG91bGRSZWFjdCB3YXMgbm90IGluZm9ybWVkLCB0b2dnbGUgdGhlIHJlYWN0aW9uLlxuXHRcdGlmIChzaG91bGRSZWFjdCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRzaG91bGRSZWFjdCA9ICF1c2VyQWxyZWFkeVJlYWN0ZWQ7XG5cdFx0fVxuXG5cdFx0aWYgKHVzZXJBbHJlYWR5UmVhY3RlZCA9PT0gc2hvdWxkUmVhY3QpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKHVzZXJBbHJlYWR5UmVhY3RlZCkge1xuXHRcdFx0cmVtb3ZlVXNlclJlYWN0aW9uKG1lc3NhZ2UsIHJlYWN0aW9uLCB1c2VyLnVzZXJuYW1lKTtcblxuXHRcdFx0aWYgKF8uaXNFbXB0eShtZXNzYWdlLnJlYWN0aW9ucykpIHtcblx0XHRcdFx0ZGVsZXRlIG1lc3NhZ2UucmVhY3Rpb25zO1xuXHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy51bnNldFJlYWN0aW9ucyhtZXNzYWdlSWQpO1xuXHRcdFx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5ydW4oJ3Vuc2V0UmVhY3Rpb24nLCBtZXNzYWdlSWQsIHJlYWN0aW9uKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLnNldFJlYWN0aW9ucyhtZXNzYWdlSWQsIG1lc3NhZ2UucmVhY3Rpb25zKTtcblx0XHRcdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MucnVuKCdzZXRSZWFjdGlvbicsIG1lc3NhZ2VJZCwgcmVhY3Rpb24pO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoIW1lc3NhZ2UucmVhY3Rpb25zKSB7XG5cdFx0XHRcdG1lc3NhZ2UucmVhY3Rpb25zID0ge307XG5cdFx0XHR9XG5cdFx0XHRpZiAoIW1lc3NhZ2UucmVhY3Rpb25zW3JlYWN0aW9uXSkge1xuXHRcdFx0XHRtZXNzYWdlLnJlYWN0aW9uc1tyZWFjdGlvbl0gPSB7XG5cdFx0XHRcdFx0dXNlcm5hbWVzOiBbXSxcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHRcdG1lc3NhZ2UucmVhY3Rpb25zW3JlYWN0aW9uXS51c2VybmFtZXMucHVzaCh1c2VyLnVzZXJuYW1lKTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuc2V0UmVhY3Rpb25zKG1lc3NhZ2VJZCwgbWVzc2FnZS5yZWFjdGlvbnMpO1xuXHRcdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MucnVuKCdzZXRSZWFjdGlvbicsIG1lc3NhZ2VJZCwgcmVhY3Rpb24pO1xuXHRcdH1cblxuXHRcdG1zZ1N0cmVhbS5lbWl0KG1lc3NhZ2UucmlkLCBtZXNzYWdlKTtcblxuXHRcdHJldHVybjtcblx0fSxcbn0pO1xuIl19
