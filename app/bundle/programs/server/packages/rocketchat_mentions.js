(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:mentions":{"server":{"server.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// packages/rocketchat_mentions/server/server.js                                                             //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let MentionsServer;
module.watch(require("./Mentions"), {
  default(v) {
    MentionsServer = v;
  }

}, 1);
const mention = new MentionsServer({
  pattern: () => RocketChat.settings.get('UTF8_Names_Validation'),
  messageMaxAll: () => RocketChat.settings.get('Message_MaxAll'),
  getUsers: usernames => Meteor.users.find({
    username: {
      $in: _.unique(usernames)
    }
  }, {
    fields: {
      _id: true,
      username: true,
      name: 1
    }
  }).fetch(),
  getUser: userId => RocketChat.models.Users.findOneById(userId),
  getTotalChannelMembers: rid => RocketChat.models.Subscriptions.findByRoomId(rid).count(),
  getChannels: channels => RocketChat.models.Rooms.find({
    name: {
      $in: _.unique(channels)
    },
    t: 'c'
  }, {
    fields: {
      _id: 1,
      name: 1
    }
  }).fetch(),

  onMaxRoomMembersExceeded({
    sender,
    rid
  }) {
    // Get the language of the user for the error notification.
    const {
      language
    } = this.getUser(sender._id);

    const msg = TAPi18n.__('Group_mentions_disabled_x_members', {
      total: this.messageMaxAll
    }, language);

    RocketChat.Notifications.notifyUser(sender._id, 'message', {
      _id: Random.id(),
      rid,
      ts: new Date(),
      msg,
      groupable: false
    }); // Also throw to stop propagation of 'sendMessage'.

    throw new Meteor.Error('error-action-not-allowed', msg, {
      method: 'filterATAllTag',
      action: msg
    });
  }

});
RocketChat.callbacks.add('beforeSaveMessage', message => mention.execute(message), RocketChat.callbacks.priority.HIGH, 'mentions');
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods":{"getUserMentionsByChannel.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// packages/rocketchat_mentions/server/methods/getUserMentionsByChannel.js                                   //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
Meteor.methods({
  getUserMentionsByChannel({
    roomId,
    options
  }) {
    check(roomId, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'getUserMentionsByChannel'
      });
    }

    const room = RocketChat.models.Rooms.findOneById(roomId);

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'getUserMentionsByChannel'
      });
    }

    const user = RocketChat.models.Users.findOneById(Meteor.userId());
    return RocketChat.models.Messages.findVisibleByMentionAndRoomId(user.username, roomId, options).fetch();
  }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"Mentions.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// packages/rocketchat_mentions/server/Mentions.js                                                           //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
module.export({
  default: () => MentionsServer
});
let Mentions;
module.watch(require("../Mentions"), {
  default(v) {
    Mentions = v;
  }

}, 0);

class MentionsServer extends Mentions {
  constructor(args) {
    super(args);
    this.messageMaxAll = args.messageMaxAll;
    this.getChannel = args.getChannel;
    this.getChannels = args.getChannels;
    this.getUsers = args.getUsers;
    this.getUser = args.getUser;
    this.getTotalChannelMembers = args.getTotalChannelMembers;

    this.onMaxRoomMembersExceeded = args.onMaxRoomMembersExceeded || (() => {});
  }

  set getUsers(m) {
    this._getUsers = m;
  }

  get getUsers() {
    return typeof this._getUsers === 'function' ? this._getUsers : () => this._getUsers;
  }

  set getChannels(m) {
    this._getChannels = m;
  }

  get getChannels() {
    return typeof this._getChannels === 'function' ? this._getChannels : () => this._getChannels;
  }

  set getChannel(m) {
    this._getChannel = m;
  }

  get getChannel() {
    return typeof this._getChannel === 'function' ? this._getChannel : () => this._getChannel;
  }

  set messageMaxAll(m) {
    this._messageMaxAll = m;
  }

  get messageMaxAll() {
    return typeof this._messageMaxAll === 'function' ? this._messageMaxAll() : this._messageMaxAll;
  }

  getUsersByMentions({
    msg,
    rid,
    u: sender
  }) {
    let mentions = this.getUserMentions(msg);
    const mentionsAll = [];
    const userMentions = [];
    mentions.forEach(m => {
      const mention = m.trim().substr(1);

      if (mention !== 'all' && mention !== 'here') {
        return userMentions.push(mention);
      }

      if (this.messageMaxAll > 0 && this.getTotalChannelMembers(rid) > this.messageMaxAll) {
        return this.onMaxRoomMembersExceeded({
          sender,
          rid
        });
      }

      mentionsAll.push({
        _id: mention,
        username: mention
      });
    });
    mentions = userMentions.length ? this.getUsers(userMentions) : [];
    return [...mentionsAll, ...mentions];
  }

  getChannelbyMentions({
    msg
  }) {
    const channels = this.getChannelMentions(msg);
    return this.getChannels(channels.map(c => c.trim().substr(1)));
  }

  execute(message) {
    const mentionsAll = this.getUsersByMentions(message);
    const channels = this.getChannelbyMentions(message);
    message.mentions = mentionsAll;
    message.channels = channels;
    return message;
  }

}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"Mentions.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// packages/rocketchat_mentions/Mentions.js                                                                  //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
module.exportDefault(class {
  constructor({
    pattern,
    useRealName,
    me
  }) {
    this.pattern = pattern;
    this.useRealName = useRealName;
    this.me = me;
  }

  set me(m) {
    this._me = m;
  }

  get me() {
    return typeof this._me === 'function' ? this._me() : this._me;
  }

  set pattern(p) {
    this._pattern = p;
  }

  get pattern() {
    return typeof this._pattern === 'function' ? this._pattern() : this._pattern;
  }

  set useRealName(s) {
    this._useRealName = s;
  }

  get useRealName() {
    return typeof this._useRealName === 'function' ? this._useRealName() : this._useRealName;
  }

  get userMentionRegex() {
    return new RegExp(`(^|\\s|<p>|<br> ?)@(${this.pattern})`, 'gm');
  }

  get channelMentionRegex() {
    return new RegExp(`(^|\\s|<p>)#(${this.pattern})`, 'gm');
  }

  replaceUsers(str, message, me) {
    return str.replace(this.userMentionRegex, (match, prefix, username) => {
      if (['all', 'here'].includes(username)) {
        return `${prefix}<a class="mention-link mention-link-me mention-link-all">@${username}</a>`;
      }

      const mentionObj = message.mentions && message.mentions.find(m => m.username === username);

      if (message.temp == null && mentionObj == null) {
        return match;
      }

      const name = this.useRealName && mentionObj && s.escapeHTML(mentionObj.name);
      return `${prefix}<a class="mention-link ${username === me ? 'mention-link-me' : ''}" data-username="${username}" title="${name ? username : ''}">${name || `@${username}`}</a>`;
    });
  }

  replaceChannels(str, message) {
    // since apostrophe escaped contains # we need to unescape it
    return str.replace(/&#39;/g, '\'').replace(this.channelMentionRegex, (match, prefix, name) => {
      if (!message.temp && !(message.channels && message.channels.find(c => c.name === name))) {
        return match;
      }

      return `${prefix}<a class="mention-link" data-channel="${name}">${`#${name}`}</a>`;
    });
  }

  getUserMentions(str) {
    return (str.match(this.userMentionRegex) || []).map(match => match.trim());
  }

  getChannelMentions(str) {
    return (str.match(this.channelMentionRegex) || []).map(match => match.trim());
  }

  parse(message) {
    let msg = message && message.html || '';

    if (!msg.trim()) {
      return message;
    }

    msg = this.replaceUsers(msg, message, this.me);
    msg = this.replaceChannels(msg, message, this.me);
    message.html = msg;
    return message;
  }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:mentions/server/server.js");
require("/node_modules/meteor/rocketchat:mentions/server/methods/getUserMentionsByChannel.js");

/* Exports */
Package._define("rocketchat:mentions");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_mentions.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptZW50aW9ucy9zZXJ2ZXIvc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0Om1lbnRpb25zL3NlcnZlci9tZXRob2RzL2dldFVzZXJNZW50aW9uc0J5Q2hhbm5lbC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptZW50aW9ucy9zZXJ2ZXIvTWVudGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWVudGlvbnMvTWVudGlvbnMuanMiXSwibmFtZXMiOlsiXyIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiTWVudGlvbnNTZXJ2ZXIiLCJtZW50aW9uIiwicGF0dGVybiIsIlJvY2tldENoYXQiLCJzZXR0aW5ncyIsImdldCIsIm1lc3NhZ2VNYXhBbGwiLCJnZXRVc2VycyIsInVzZXJuYW1lcyIsIk1ldGVvciIsInVzZXJzIiwiZmluZCIsInVzZXJuYW1lIiwiJGluIiwidW5pcXVlIiwiZmllbGRzIiwiX2lkIiwibmFtZSIsImZldGNoIiwiZ2V0VXNlciIsInVzZXJJZCIsIm1vZGVscyIsIlVzZXJzIiwiZmluZE9uZUJ5SWQiLCJnZXRUb3RhbENoYW5uZWxNZW1iZXJzIiwicmlkIiwiU3Vic2NyaXB0aW9ucyIsImZpbmRCeVJvb21JZCIsImNvdW50IiwiZ2V0Q2hhbm5lbHMiLCJjaGFubmVscyIsIlJvb21zIiwidCIsIm9uTWF4Um9vbU1lbWJlcnNFeGNlZWRlZCIsInNlbmRlciIsImxhbmd1YWdlIiwibXNnIiwiVEFQaTE4biIsIl9fIiwidG90YWwiLCJOb3RpZmljYXRpb25zIiwibm90aWZ5VXNlciIsIlJhbmRvbSIsImlkIiwidHMiLCJEYXRlIiwiZ3JvdXBhYmxlIiwiRXJyb3IiLCJtZXRob2QiLCJhY3Rpb24iLCJjYWxsYmFja3MiLCJhZGQiLCJtZXNzYWdlIiwiZXhlY3V0ZSIsInByaW9yaXR5IiwiSElHSCIsIm1ldGhvZHMiLCJnZXRVc2VyTWVudGlvbnNCeUNoYW5uZWwiLCJyb29tSWQiLCJvcHRpb25zIiwiY2hlY2siLCJTdHJpbmciLCJyb29tIiwidXNlciIsIk1lc3NhZ2VzIiwiZmluZFZpc2libGVCeU1lbnRpb25BbmRSb29tSWQiLCJleHBvcnQiLCJNZW50aW9ucyIsImNvbnN0cnVjdG9yIiwiYXJncyIsImdldENoYW5uZWwiLCJtIiwiX2dldFVzZXJzIiwiX2dldENoYW5uZWxzIiwiX2dldENoYW5uZWwiLCJfbWVzc2FnZU1heEFsbCIsImdldFVzZXJzQnlNZW50aW9ucyIsInUiLCJtZW50aW9ucyIsImdldFVzZXJNZW50aW9ucyIsIm1lbnRpb25zQWxsIiwidXNlck1lbnRpb25zIiwiZm9yRWFjaCIsInRyaW0iLCJzdWJzdHIiLCJwdXNoIiwibGVuZ3RoIiwiZ2V0Q2hhbm5lbGJ5TWVudGlvbnMiLCJnZXRDaGFubmVsTWVudGlvbnMiLCJtYXAiLCJjIiwicyIsImV4cG9ydERlZmF1bHQiLCJ1c2VSZWFsTmFtZSIsIm1lIiwiX21lIiwicCIsIl9wYXR0ZXJuIiwiX3VzZVJlYWxOYW1lIiwidXNlck1lbnRpb25SZWdleCIsIlJlZ0V4cCIsImNoYW5uZWxNZW50aW9uUmVnZXgiLCJyZXBsYWNlVXNlcnMiLCJzdHIiLCJyZXBsYWNlIiwibWF0Y2giLCJwcmVmaXgiLCJpbmNsdWRlcyIsIm1lbnRpb25PYmoiLCJ0ZW1wIiwiZXNjYXBlSFRNTCIsInJlcGxhY2VDaGFubmVscyIsInBhcnNlIiwiaHRtbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLENBQUo7O0FBQU1DLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLFFBQUVLLENBQUY7QUFBSTs7QUFBaEIsQ0FBbkMsRUFBcUQsQ0FBckQ7QUFBd0QsSUFBSUMsY0FBSjtBQUFtQkwsT0FBT0Ms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QUFXQSxRQUFRNkQsSUFBcEIsSUFBNkIsRUFBdkM7O0FBQ0EsUUFBSSxDQUFDN0UsSUFBSStDLElBQUosRUFBTCxFQUFpQjtBQUNoQixhQUFPL0IsT0FBUDtBQUNBOztBQUNEaEIsVUFBTSxLQUFLa0UsWUFBTCxDQUFrQmxFLEdBQWxCLEVBQXVCZ0IsT0FBdkIsRUFBZ0MsS0FBSzBDLEVBQXJDLENBQU47QUFDQTFELFVBQU0sS0FBSzJFLGVBQUwsQ0FBcUIzRSxHQUFyQixFQUEwQmdCLE9BQTFCLEVBQW1DLEtBQUswQyxFQUF4QyxDQUFOO0FBQ0ExQyxZQUFRNkQsSUFBUixHQUFlN0UsR0FBZjtBQUNBLFdBQU9nQixPQUFQO0FBQ0E7O0FBdEVtQixDQUxyQixFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X21lbnRpb25zLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgTWVudGlvbnNTZXJ2ZXIgZnJvbSAnLi9NZW50aW9ucyc7XG5cbmNvbnN0IG1lbnRpb24gPSBuZXcgTWVudGlvbnNTZXJ2ZXIoe1xuXHRwYXR0ZXJuOiAoKSA9PiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnVVRGOF9OYW1lc19WYWxpZGF0aW9uJyksXG5cdG1lc3NhZ2VNYXhBbGw6ICgpID0+IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNZXNzYWdlX01heEFsbCcpLFxuXHRnZXRVc2VyczogKHVzZXJuYW1lcykgPT4gTWV0ZW9yLnVzZXJzLmZpbmQoeyB1c2VybmFtZTogeyAkaW46IF8udW5pcXVlKHVzZXJuYW1lcykgfSB9LCB7IGZpZWxkczogeyBfaWQ6IHRydWUsIHVzZXJuYW1lOiB0cnVlLCBuYW1lOiAxIH0gfSkuZmV0Y2goKSxcblx0Z2V0VXNlcjogKHVzZXJJZCkgPT4gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodXNlcklkKSxcblx0Z2V0VG90YWxDaGFubmVsTWVtYmVyczogKHJpZCkgPT4gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kQnlSb29tSWQocmlkKS5jb3VudCgpLFxuXHRnZXRDaGFubmVsczogKGNoYW5uZWxzKSA9PiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kKHsgbmFtZTogeyAkaW46IF8udW5pcXVlKGNoYW5uZWxzKSB9LCB0OiAnYydcdH0sIHsgZmllbGRzOiB7IF9pZDogMSwgbmFtZTogMSB9IH0pLmZldGNoKCksXG5cdG9uTWF4Um9vbU1lbWJlcnNFeGNlZWRlZCh7IHNlbmRlciwgcmlkIH0pIHtcblx0XHQvLyBHZXQgdGhlIGxhbmd1YWdlIG9mIHRoZSB1c2VyIGZvciB0aGUgZXJyb3Igbm90aWZpY2F0aW9uLlxuXHRcdGNvbnN0IHsgbGFuZ3VhZ2UgfSA9IHRoaXMuZ2V0VXNlcihzZW5kZXIuX2lkKTtcblx0XHRjb25zdCBtc2cgPSBUQVBpMThuLl9fKCdHcm91cF9tZW50aW9uc19kaXNhYmxlZF94X21lbWJlcnMnLCB7IHRvdGFsOiB0aGlzLm1lc3NhZ2VNYXhBbGwgfSwgbGFuZ3VhZ2UpO1xuXG5cdFx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeVVzZXIoc2VuZGVyLl9pZCwgJ21lc3NhZ2UnLCB7XG5cdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0cmlkLFxuXHRcdFx0dHM6IG5ldyBEYXRlLFxuXHRcdFx0bXNnLFxuXHRcdFx0Z3JvdXBhYmxlOiBmYWxzZSxcblx0XHR9KTtcblxuXHRcdC8vIEFsc28gdGhyb3cgdG8gc3RvcCBwcm9wYWdhdGlvbiBvZiAnc2VuZE1lc3NhZ2UnLlxuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsIG1zZywge1xuXHRcdFx0bWV0aG9kOiAnZmlsdGVyQVRBbGxUYWcnLFxuXHRcdFx0YWN0aW9uOiBtc2csXG5cdFx0fSk7XG5cdH0sXG59KTtcblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYmVmb3JlU2F2ZU1lc3NhZ2UnLCAobWVzc2FnZSkgPT4gbWVudGlvbi5leGVjdXRlKG1lc3NhZ2UpLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5ISUdILCAnbWVudGlvbnMnKTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0Z2V0VXNlck1lbnRpb25zQnlDaGFubmVsKHsgcm9vbUlkLCBvcHRpb25zIH0pIHtcblx0XHRjaGVjayhyb29tSWQsIFN0cmluZyk7XG5cblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnZ2V0VXNlck1lbnRpb25zQnlDaGFubmVsJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocm9vbUlkKTtcblxuXHRcdGlmICghcm9vbSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHsgbWV0aG9kOiAnZ2V0VXNlck1lbnRpb25zQnlDaGFubmVsJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQoTWV0ZW9yLnVzZXJJZCgpKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kVmlzaWJsZUJ5TWVudGlvbkFuZFJvb21JZCh1c2VyLnVzZXJuYW1lLCByb29tSWQsIG9wdGlvbnMpLmZldGNoKCk7XG5cdH0sXG59KTtcbiIsIi8qXG4qIE1lbnRpb25zIGlzIGEgbmFtZWQgZnVuY3Rpb24gdGhhdCB3aWxsIHByb2Nlc3MgTWVudGlvbnNcbiogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgLSBUaGUgbWVzc2FnZSBvYmplY3RcbiovXG5pbXBvcnQgTWVudGlvbnMgZnJvbSAnLi4vTWVudGlvbnMnO1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWVudGlvbnNTZXJ2ZXIgZXh0ZW5kcyBNZW50aW9ucyB7XG5cdGNvbnN0cnVjdG9yKGFyZ3MpIHtcblx0XHRzdXBlcihhcmdzKTtcblx0XHR0aGlzLm1lc3NhZ2VNYXhBbGwgPSBhcmdzLm1lc3NhZ2VNYXhBbGw7XG5cdFx0dGhpcy5nZXRDaGFubmVsID0gYXJncy5nZXRDaGFubmVsO1xuXHRcdHRoaXMuZ2V0Q2hhbm5lbHMgPSBhcmdzLmdldENoYW5uZWxzO1xuXHRcdHRoaXMuZ2V0VXNlcnMgPSBhcmdzLmdldFVzZXJzO1xuXHRcdHRoaXMuZ2V0VXNlciA9IGFyZ3MuZ2V0VXNlcjtcblx0XHR0aGlzLmdldFRvdGFsQ2hhbm5lbE1lbWJlcnMgPSBhcmdzLmdldFRvdGFsQ2hhbm5lbE1lbWJlcnM7XG5cdFx0dGhpcy5vbk1heFJvb21NZW1iZXJzRXhjZWVkZWQgPSBhcmdzLm9uTWF4Um9vbU1lbWJlcnNFeGNlZWRlZCB8fCAoKCkgPT4ge30pO1xuXHR9XG5cdHNldCBnZXRVc2VycyhtKSB7XG5cdFx0dGhpcy5fZ2V0VXNlcnMgPSBtO1xuXHR9XG5cdGdldCBnZXRVc2VycygpIHtcblx0XHRyZXR1cm4gdHlwZW9mIHRoaXMuX2dldFVzZXJzID09PSAnZnVuY3Rpb24nID8gdGhpcy5fZ2V0VXNlcnMgOiAoKSA9PiB0aGlzLl9nZXRVc2Vycztcblx0fVxuXHRzZXQgZ2V0Q2hhbm5lbHMobSkge1xuXHRcdHRoaXMuX2dldENoYW5uZWxzID0gbTtcblx0fVxuXHRnZXQgZ2V0Q2hhbm5lbHMoKSB7XG5cdFx0cmV0dXJuIHR5cGVvZiB0aGlzLl9nZXRDaGFubmVscyA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2dldENoYW5uZWxzIDogKCkgPT4gdGhpcy5fZ2V0Q2hhbm5lbHM7XG5cdH1cblx0c2V0IGdldENoYW5uZWwobSkge1xuXHRcdHRoaXMuX2dldENoYW5uZWwgPSBtO1xuXHR9XG5cdGdldCBnZXRDaGFubmVsKCkge1xuXHRcdHJldHVybiB0eXBlb2YgdGhpcy5fZ2V0Q2hhbm5lbCA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2dldENoYW5uZWwgOiAoKSA9PiB0aGlzLl9nZXRDaGFubmVsO1xuXHR9XG5cdHNldCBtZXNzYWdlTWF4QWxsKG0pIHtcblx0XHR0aGlzLl9tZXNzYWdlTWF4QWxsID0gbTtcblx0fVxuXHRnZXQgbWVzc2FnZU1heEFsbCgpIHtcblx0XHRyZXR1cm4gdHlwZW9mIHRoaXMuX21lc3NhZ2VNYXhBbGwgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9tZXNzYWdlTWF4QWxsKCkgOiB0aGlzLl9tZXNzYWdlTWF4QWxsO1xuXHR9XG5cdGdldFVzZXJzQnlNZW50aW9ucyh7IG1zZywgcmlkLCB1OiBzZW5kZXIgfSkge1xuXHRcdGxldCBtZW50aW9ucyA9IHRoaXMuZ2V0VXNlck1lbnRpb25zKG1zZyk7XG5cdFx0Y29uc3QgbWVudGlvbnNBbGwgPSBbXTtcblx0XHRjb25zdCB1c2VyTWVudGlvbnMgPSBbXTtcblxuXHRcdG1lbnRpb25zLmZvckVhY2goKG0pID0+IHtcblx0XHRcdGNvbnN0IG1lbnRpb24gPSBtLnRyaW0oKS5zdWJzdHIoMSk7XG5cdFx0XHRpZiAobWVudGlvbiAhPT0gJ2FsbCcgJiYgbWVudGlvbiAhPT0gJ2hlcmUnKSB7XG5cdFx0XHRcdHJldHVybiB1c2VyTWVudGlvbnMucHVzaChtZW50aW9uKTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLm1lc3NhZ2VNYXhBbGwgPiAwICYmIHRoaXMuZ2V0VG90YWxDaGFubmVsTWVtYmVycyhyaWQpID4gdGhpcy5tZXNzYWdlTWF4QWxsKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLm9uTWF4Um9vbU1lbWJlcnNFeGNlZWRlZCh7IHNlbmRlciwgcmlkIH0pO1xuXHRcdFx0fVxuXHRcdFx0bWVudGlvbnNBbGwucHVzaCh7XG5cdFx0XHRcdF9pZDogbWVudGlvbixcblx0XHRcdFx0dXNlcm5hbWU6IG1lbnRpb24sXG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRtZW50aW9ucyA9IHVzZXJNZW50aW9ucy5sZW5ndGggPyB0aGlzLmdldFVzZXJzKHVzZXJNZW50aW9ucykgOiBbXTtcblx0XHRyZXR1cm4gWy4uLm1lbnRpb25zQWxsLCAuLi5tZW50aW9uc107XG5cdH1cblx0Z2V0Q2hhbm5lbGJ5TWVudGlvbnMoeyBtc2cgfSkge1xuXHRcdGNvbnN0IGNoYW5uZWxzID0gdGhpcy5nZXRDaGFubmVsTWVudGlvbnMobXNnKTtcblx0XHRyZXR1cm4gdGhpcy5nZXRDaGFubmVscyhjaGFubmVscy5tYXAoKGMpID0+IGMudHJpbSgpLnN1YnN0cigxKSkpO1xuXHR9XG5cdGV4ZWN1dGUobWVzc2FnZSkge1xuXHRcdGNvbnN0IG1lbnRpb25zQWxsID0gdGhpcy5nZXRVc2Vyc0J5TWVudGlvbnMobWVzc2FnZSk7XG5cdFx0Y29uc3QgY2hhbm5lbHMgPSB0aGlzLmdldENoYW5uZWxieU1lbnRpb25zKG1lc3NhZ2UpO1xuXG5cdFx0bWVzc2FnZS5tZW50aW9ucyA9IG1lbnRpb25zQWxsO1xuXHRcdG1lc3NhZ2UuY2hhbm5lbHMgPSBjaGFubmVscztcblxuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG59XG4iLCIvKlxuKiBNZW50aW9ucyBpcyBhIG5hbWVkIGZ1bmN0aW9uIHRoYXQgd2lsbCBwcm9jZXNzIE1lbnRpb25zXG4qIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlIC0gVGhlIG1lc3NhZ2Ugb2JqZWN0XG4qL1xuaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuXHRjb25zdHJ1Y3Rvcih7IHBhdHRlcm4sIHVzZVJlYWxOYW1lLCBtZSB9KSB7XG5cdFx0dGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcblx0XHR0aGlzLnVzZVJlYWxOYW1lID0gdXNlUmVhbE5hbWU7XG5cdFx0dGhpcy5tZSA9IG1lO1xuXHR9XG5cdHNldCBtZShtKSB7XG5cdFx0dGhpcy5fbWUgPSBtO1xuXHR9XG5cdGdldCBtZSgpIHtcblx0XHRyZXR1cm4gdHlwZW9mIHRoaXMuX21lID09PSAnZnVuY3Rpb24nID8gdGhpcy5fbWUoKSA6IHRoaXMuX21lO1xuXHR9XG5cdHNldCBwYXR0ZXJuKHApIHtcblx0XHR0aGlzLl9wYXR0ZXJuID0gcDtcblx0fVxuXHRnZXQgcGF0dGVybigpIHtcblx0XHRyZXR1cm4gdHlwZW9mIHRoaXMuX3BhdHRlcm4gPT09ICdmdW5jdGlvbicgPyB0aGlzLl9wYXR0ZXJuKCkgOiB0aGlzLl9wYXR0ZXJuO1xuXHR9XG5cdHNldCB1c2VSZWFsTmFtZShzKSB7XG5cdFx0dGhpcy5fdXNlUmVhbE5hbWUgPSBzO1xuXHR9XG5cdGdldCB1c2VSZWFsTmFtZSgpIHtcblx0XHRyZXR1cm4gdHlwZW9mIHRoaXMuX3VzZVJlYWxOYW1lID09PSAnZnVuY3Rpb24nID8gdGhpcy5fdXNlUmVhbE5hbWUoKSA6IHRoaXMuX3VzZVJlYWxOYW1lO1xuXHR9XG5cdGdldCB1c2VyTWVudGlvblJlZ2V4KCkge1xuXHRcdHJldHVybiBuZXcgUmVnRXhwKGAoXnxcXFxcc3w8cD58PGJyPiA/KUAoJHsgdGhpcy5wYXR0ZXJuIH0pYCwgJ2dtJyk7XG5cdH1cblx0Z2V0IGNoYW5uZWxNZW50aW9uUmVnZXgoKSB7XG5cdFx0cmV0dXJuIG5ldyBSZWdFeHAoYChefFxcXFxzfDxwPikjKCR7IHRoaXMucGF0dGVybiB9KWAsICdnbScpO1xuXHR9XG5cdHJlcGxhY2VVc2VycyhzdHIsIG1lc3NhZ2UsIG1lKSB7XG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlKHRoaXMudXNlck1lbnRpb25SZWdleCwgKG1hdGNoLCBwcmVmaXgsIHVzZXJuYW1lKSA9PiB7XG5cdFx0XHRpZiAoWydhbGwnLCAnaGVyZSddLmluY2x1ZGVzKHVzZXJuYW1lKSkge1xuXHRcdFx0XHRyZXR1cm4gYCR7IHByZWZpeCB9PGEgY2xhc3M9XCJtZW50aW9uLWxpbmsgbWVudGlvbi1saW5rLW1lIG1lbnRpb24tbGluay1hbGxcIj5AJHsgdXNlcm5hbWUgfTwvYT5gO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBtZW50aW9uT2JqID0gbWVzc2FnZS5tZW50aW9ucyAmJiBtZXNzYWdlLm1lbnRpb25zLmZpbmQoKG0pID0+IG0udXNlcm5hbWUgPT09IHVzZXJuYW1lKTtcblx0XHRcdGlmIChtZXNzYWdlLnRlbXAgPT0gbnVsbCAmJiBtZW50aW9uT2JqID09IG51bGwpIHtcblx0XHRcdFx0cmV0dXJuIG1hdGNoO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgbmFtZSA9IHRoaXMudXNlUmVhbE5hbWUgJiYgbWVudGlvbk9iaiAmJiBzLmVzY2FwZUhUTUwobWVudGlvbk9iai5uYW1lKTtcblxuXHRcdFx0cmV0dXJuIGAkeyBwcmVmaXggfTxhIGNsYXNzPVwibWVudGlvbi1saW5rICR7IHVzZXJuYW1lID09PSBtZSA/ICdtZW50aW9uLWxpbmstbWUnIDogJycgfVwiIGRhdGEtdXNlcm5hbWU9XCIkeyB1c2VybmFtZSB9XCIgdGl0bGU9XCIkeyBuYW1lID8gdXNlcm5hbWUgOiAnJyB9XCI+JHsgbmFtZSB8fCBgQCR7IHVzZXJuYW1lIH1gIH08L2E+YDtcblx0XHR9KTtcblx0fVxuXHRyZXBsYWNlQ2hhbm5lbHMoc3RyLCBtZXNzYWdlKSB7XG5cdFx0Ly8gc2luY2UgYXBvc3Ryb3BoZSBlc2NhcGVkIGNvbnRhaW5zICMgd2UgbmVlZCB0byB1bmVzY2FwZSBpdFxuXHRcdHJldHVybiBzdHIucmVwbGFjZSgvJiMzOTsvZywgJ1xcJycpLnJlcGxhY2UodGhpcy5jaGFubmVsTWVudGlvblJlZ2V4LCAobWF0Y2gsIHByZWZpeCwgbmFtZSkgPT4ge1xuXHRcdFx0aWYgKCFtZXNzYWdlLnRlbXAgJiYgIShtZXNzYWdlLmNoYW5uZWxzICYmIG1lc3NhZ2UuY2hhbm5lbHMuZmluZCgoYykgPT4gYy5uYW1lID09PSBuYW1lKSkpIHtcblx0XHRcdFx0cmV0dXJuIG1hdGNoO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gYCR7IHByZWZpeCB9PGEgY2xhc3M9XCJtZW50aW9uLWxpbmtcIiBkYXRhLWNoYW5uZWw9XCIkeyBuYW1lIH1cIj4keyBgIyR7IG5hbWUgfWAgfTwvYT5gO1xuXHRcdH0pO1xuXHR9XG5cdGdldFVzZXJNZW50aW9ucyhzdHIpIHtcblx0XHRyZXR1cm4gKHN0ci5tYXRjaCh0aGlzLnVzZXJNZW50aW9uUmVnZXgpIHx8IFtdKS5tYXAoKG1hdGNoKSA9PiBtYXRjaC50cmltKCkpO1xuXHR9XG5cdGdldENoYW5uZWxNZW50aW9ucyhzdHIpIHtcblx0XHRyZXR1cm4gKHN0ci5tYXRjaCh0aGlzLmNoYW5uZWxNZW50aW9uUmVnZXgpIHx8IFtdKS5tYXAoKG1hdGNoKSA9PiBtYXRjaC50cmltKCkpO1xuXHR9XG5cdHBhcnNlKG1lc3NhZ2UpIHtcblx0XHRsZXQgbXNnID0gKG1lc3NhZ2UgJiYgbWVzc2FnZS5odG1sKSB8fCAnJztcblx0XHRpZiAoIW1zZy50cmltKCkpIHtcblx0XHRcdHJldHVybiBtZXNzYWdlO1xuXHRcdH1cblx0XHRtc2cgPSB0aGlzLnJlcGxhY2VVc2Vycyhtc2csIG1lc3NhZ2UsIHRoaXMubWUpO1xuXHRcdG1zZyA9IHRoaXMucmVwbGFjZUNoYW5uZWxzKG1zZywgbWVzc2FnZSwgdGhpcy5tZSk7XG5cdFx0bWVzc2FnZS5odG1sID0gbXNnO1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG59XG4iXX0=
