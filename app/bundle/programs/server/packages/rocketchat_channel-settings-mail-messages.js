(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:channel-settings-mail-messages":{"server":{"lib":{"startup.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/rocketchat_channel-settings-mail-messages/server/lib/startup.js                      //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
Meteor.startup(function () {
  const permission = {
    _id: 'mail-messages',
    roles: ['admin']
  };
  return RocketChat.models.Permissions.upsert(permission._id, {
    $setOnInsert: permission
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"mailMessages.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/rocketchat_channel-settings-mail-messages/server/methods/mailMessages.js             //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 1);
let Mailer;
module.watch(require("meteor/rocketchat:mailer"), {
  "*"(v) {
    Mailer = v;
  }

}, 2);
Meteor.methods({
  'mailMessages'(data) {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'mailMessages'
      });
    }

    check(data, Match.ObjectIncluding({
      rid: String,
      to_users: [String],
      to_emails: String,
      subject: String,
      messages: [String],
      language: String
    }));
    const room = Meteor.call('canAccessRoom', data.rid, userId);

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'mailMessages'
      });
    }

    if (!RocketChat.authz.hasPermission(userId, 'mail-messages')) {
      throw new Meteor.Error('error-action-not-allowed', 'Mailing is not allowed', {
        method: 'mailMessages',
        action: 'Mailing'
      });
    }

    const emails = _.compact(data.to_emails.trim().split(','));

    const missing = [];

    if (data.to_users.length > 0) {
      _.each(data.to_users, username => {
        const user = RocketChat.models.Users.findOneByUsername(username);

        if (user && user.emails && user.emails[0] && user.emails[0].address) {
          emails.push(user.emails[0].address);
        } else {
          missing.push(username);
        }
      });
    }

    _.each(emails, email => {
      if (!Mailer.checkAddressFormat(email.trim())) {
        throw new Meteor.Error('error-invalid-email', `Invalid email ${email}`, {
          method: 'mailMessages',
          email
        });
      }
    });

    const user = Meteor.user();
    const email = user.emails && user.emails[0] && user.emails[0].address;
    data.language = data.language.split('-').shift().toLowerCase();

    if (data.language !== 'en') {
      const localeFn = Meteor.call('loadLocale', data.language);

      if (localeFn) {
        Function(localeFn).call({
          moment
        });
        moment.locale(data.language);
      }
    }

    const html = RocketChat.models.Messages.findByRoomIdAndMessageIds(data.rid, data.messages, {
      sort: {
        ts: 1
      }
    }).map(function (message) {
      const dateTime = moment(message.ts).locale(data.language).format('L LT');
      return `<p style='margin-bottom: 5px'><b>${message.u.username}</b> <span style='color: #aaa; font-size: 12px'>${dateTime}</span><br/>${RocketChat.Message.parse(message, data.language)}</p>`;
    }).join('');
    Mailer.send({
      to: emails,
      from: RocketChat.settings.get('From_Email'),
      replyTo: email,
      subject: data.subject,
      html
    });
    return {
      success: true,
      missing
    };
  }

});
///////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:channel-settings-mail-messages/server/lib/startup.js");
require("/node_modules/meteor/rocketchat:channel-settings-mail-messages/server/methods/mailMessages.js");

/* Exports */
Package._define("rocketchat:channel-settings-mail-messages");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_channel-settings-mail-messages.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjaGFubmVsLXNldHRpbmdzLW1haWwtbWVzc2FnZXMvc2VydmVyL2xpYi9zdGFydHVwLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3MtbWFpbC1tZXNzYWdlcy9zZXJ2ZXIvbWV0aG9kcy9tYWlsTWVzc2FnZXMuanMiXSwibmFtZXMiOlsiTWV0ZW9yIiwic3RhcnR1cCIsInBlcm1pc3Npb24iLCJfaWQiLCJyb2xlcyIsIlJvY2tldENoYXQiLCJtb2RlbHMiLCJQZXJtaXNzaW9ucyIsInVwc2VydCIsIiRzZXRPbkluc2VydCIsIl8iLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsIm1vbWVudCIsIk1haWxlciIsIm1ldGhvZHMiLCJkYXRhIiwidXNlcklkIiwiRXJyb3IiLCJtZXRob2QiLCJjaGVjayIsIk1hdGNoIiwiT2JqZWN0SW5jbHVkaW5nIiwicmlkIiwiU3RyaW5nIiwidG9fdXNlcnMiLCJ0b19lbWFpbHMiLCJzdWJqZWN0IiwibWVzc2FnZXMiLCJsYW5ndWFnZSIsInJvb20iLCJjYWxsIiwiYXV0aHoiLCJoYXNQZXJtaXNzaW9uIiwiYWN0aW9uIiwiZW1haWxzIiwiY29tcGFjdCIsInRyaW0iLCJzcGxpdCIsIm1pc3NpbmciLCJsZW5ndGgiLCJlYWNoIiwidXNlcm5hbWUiLCJ1c2VyIiwiVXNlcnMiLCJmaW5kT25lQnlVc2VybmFtZSIsImFkZHJlc3MiLCJwdXNoIiwiZW1haWwiLCJjaGVja0FkZHJlc3NGb3JtYXQiLCJzaGlmdCIsInRvTG93ZXJDYXNlIiwibG9jYWxlRm4iLCJGdW5jdGlvbiIsImxvY2FsZSIsImh0bWwiLCJNZXNzYWdlcyIsImZpbmRCeVJvb21JZEFuZE1lc3NhZ2VJZHMiLCJzb3J0IiwidHMiLCJtYXAiLCJtZXNzYWdlIiwiZGF0ZVRpbWUiLCJmb3JtYXQiLCJ1IiwiTWVzc2FnZSIsInBhcnNlIiwiam9pbiIsInNlbmQiLCJ0byIsImZyb20iLCJzZXR0aW5ncyIsImdldCIsInJlcGx5VG8iLCJzdWNjZXNzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLE9BQVAsQ0FBZSxZQUFXO0FBQ3pCLFFBQU1DLGFBQWE7QUFDbEJDLFNBQUssZUFEYTtBQUVsQkMsV0FBTyxDQUFDLE9BQUQ7QUFGVyxHQUFuQjtBQUlBLFNBQU9DLFdBQVdDLE1BQVgsQ0FBa0JDLFdBQWxCLENBQThCQyxNQUE5QixDQUFxQ04sV0FBV0MsR0FBaEQsRUFBcUQ7QUFDM0RNLGtCQUFjUDtBQUQ2QyxHQUFyRCxDQUFQO0FBR0EsQ0FSRCxFOzs7Ozs7Ozs7OztBQ0FBLElBQUlRLENBQUo7O0FBQU1DLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLFFBQUVLLENBQUY7QUFBSTs7QUFBaEIsQ0FBbkMsRUFBcUQsQ0FBckQ7QUFBd0QsSUFBSUMsTUFBSjtBQUFXTCxPQUFPQyxLQUFQLENBQWFDLFFBQVEsUUFBUixDQUFiLEVBQStCO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDQyxhQUFPRCxDQUFQO0FBQVM7O0FBQXJCLENBQS9CLEVBQXNELENBQXREO0FBQXlELElBQUlFLE1BQUo7QUFBV04sT0FBT0MsS0FBUCxDQUFhQyxRQUFRLDBCQUFSLENBQWIsRUFBaUQ7QUFBQyxNQUFJRSxDQUFKLEVBQU07QUFBQ0UsYUFBT0YsQ0FBUDtBQUFTOztBQUFqQixDQUFqRCxFQUFvRSxDQUFwRTtBQUk3SWYsT0FBT2tCLE9BQVAsQ0FBZTtBQUNkLGlCQUFlQyxJQUFmLEVBQXFCO0FBQ3BCLFVBQU1DLFNBQVNwQixPQUFPb0IsTUFBUCxFQUFmOztBQUNBLFFBQUksQ0FBQ0EsTUFBTCxFQUFhO0FBQ1osWUFBTSxJQUFJcEIsT0FBT3FCLEtBQVgsQ0FBaUIsb0JBQWpCLEVBQXVDLGNBQXZDLEVBQXVEO0FBQzVEQyxn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QUFGLFNBQXhCO0FBQ0FBLGVBQU95QyxNQUFQLENBQWN0QyxLQUFLYSxRQUFuQjtBQUNBO0FBQ0Q7O0FBRUQsVUFBTTBCLE9BQU9yRCxXQUFXQyxNQUFYLENBQWtCcUQsUUFBbEIsQ0FBMkJDLHlCQUEzQixDQUFxRHpDLEtBQUtPLEdBQTFELEVBQStEUCxLQUFLWSxRQUFwRSxFQUE4RTtBQUMxRjhCLFlBQU07QUFBRUMsWUFBSTtBQUFOO0FBRG9GLEtBQTlFLEVBRVZDLEdBRlUsQ0FFTixVQUFTQyxPQUFULEVBQWtCO0FBQ3hCLFlBQU1DLFdBQVdqRCxPQUFPZ0QsUUFBUUYsRUFBZixFQUFtQkwsTUFBbkIsQ0FBMEJ0QyxLQUFLYSxRQUEvQixFQUF5Q2tDLE1BQXpDLENBQWdELE1BQWhELENBQWpCO0FBQ0EsYUFBUSxvQ0FBb0NGLFFBQVFHLENBQVIsQ0FBVXRCLFFBQVUsbURBQW1Eb0IsUUFBVSxlQUFlNUQsV0FBVytELE9BQVgsQ0FBbUJDLEtBQW5CLENBQXlCTCxPQUF6QixFQUFrQzdDLEtBQUthLFFBQXZDLENBQWtELE1BQTlMO0FBQ0EsS0FMWSxFQUtWc0MsSUFMVSxDQUtMLEVBTEssQ0FBYjtBQU9BckQsV0FBT3NELElBQVAsQ0FBWTtBQUNYQyxVQUFJbEMsTUFETztBQUVYbUMsWUFBTXBFLFdBQVdxRSxRQUFYLENBQW9CQyxHQUFwQixDQUF3QixZQUF4QixDQUZLO0FBR1hDLGVBQVN6QixLQUhFO0FBSVhyQixlQUFTWCxLQUFLVyxPQUpIO0FBS1g0QjtBQUxXLEtBQVo7QUFRQSxXQUFPO0FBQ05tQixlQUFTLElBREg7QUFFTm5DO0FBRk0sS0FBUDtBQUlBOztBQS9FYSxDQUFmLEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfY2hhbm5lbC1zZXR0aW5ncy1tYWlsLW1lc3NhZ2VzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdGNvbnN0IHBlcm1pc3Npb24gPSB7XG5cdFx0X2lkOiAnbWFpbC1tZXNzYWdlcycsXG5cdFx0cm9sZXM6IFsnYWRtaW4nXSxcblx0fTtcblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLnVwc2VydChwZXJtaXNzaW9uLl9pZCwge1xuXHRcdCRzZXRPbkluc2VydDogcGVybWlzc2lvbixcblx0fSk7XG59KTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnO1xuaW1wb3J0ICogYXMgTWFpbGVyIGZyb20gJ21ldGVvci9yb2NrZXRjaGF0Om1haWxlcic7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J21haWxNZXNzYWdlcycoZGF0YSkge1xuXHRcdGNvbnN0IHVzZXJJZCA9IE1ldGVvci51c2VySWQoKTtcblx0XHRpZiAoIXVzZXJJZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHtcblx0XHRcdFx0bWV0aG9kOiAnbWFpbE1lc3NhZ2VzJyxcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRjaGVjayhkYXRhLCBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0cmlkOiBTdHJpbmcsXG5cdFx0XHR0b191c2VyczogW1N0cmluZ10sXG5cdFx0XHR0b19lbWFpbHM6IFN0cmluZyxcblx0XHRcdHN1YmplY3Q6IFN0cmluZyxcblx0XHRcdG1lc3NhZ2VzOiBbU3RyaW5nXSxcblx0XHRcdGxhbmd1YWdlOiBTdHJpbmcsXG5cdFx0fSkpO1xuXHRcdGNvbnN0IHJvb20gPSBNZXRlb3IuY2FsbCgnY2FuQWNjZXNzUm9vbScsIGRhdGEucmlkLCB1c2VySWQpO1xuXHRcdGlmICghcm9vbSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHtcblx0XHRcdFx0bWV0aG9kOiAnbWFpbE1lc3NhZ2VzJyxcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih1c2VySWQsICdtYWlsLW1lc3NhZ2VzJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdNYWlsaW5nIGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdtYWlsTWVzc2FnZXMnLFxuXHRcdFx0XHRhY3Rpb246ICdNYWlsaW5nJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGVtYWlscyA9IF8uY29tcGFjdChkYXRhLnRvX2VtYWlscy50cmltKCkuc3BsaXQoJywnKSk7XG5cdFx0Y29uc3QgbWlzc2luZyA9IFtdO1xuXHRcdGlmIChkYXRhLnRvX3VzZXJzLmxlbmd0aCA+IDApIHtcblx0XHRcdF8uZWFjaChkYXRhLnRvX3VzZXJzLCAodXNlcm5hbWUpID0+IHtcblx0XHRcdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeVVzZXJuYW1lKHVzZXJuYW1lKTtcblx0XHRcdFx0aWYgKHVzZXIgJiYgdXNlci5lbWFpbHMgJiYgdXNlci5lbWFpbHNbMF0gJiYgdXNlci5lbWFpbHNbMF0uYWRkcmVzcykge1xuXHRcdFx0XHRcdGVtYWlscy5wdXNoKHVzZXIuZW1haWxzWzBdLmFkZHJlc3MpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdG1pc3NpbmcucHVzaCh1c2VybmFtZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0XHRfLmVhY2goZW1haWxzLCAoZW1haWwpID0+IHtcblx0XHRcdGlmICghTWFpbGVyLmNoZWNrQWRkcmVzc0Zvcm1hdChlbWFpbC50cmltKCkpKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtZW1haWwnLCBgSW52YWxpZCBlbWFpbCAkeyBlbWFpbCB9YCwge1xuXHRcdFx0XHRcdG1ldGhvZDogJ21haWxNZXNzYWdlcycsXG5cdFx0XHRcdFx0ZW1haWwsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcigpO1xuXHRcdGNvbnN0IGVtYWlsID0gdXNlci5lbWFpbHMgJiYgdXNlci5lbWFpbHNbMF0gJiYgdXNlci5lbWFpbHNbMF0uYWRkcmVzcztcblx0XHRkYXRhLmxhbmd1YWdlID0gZGF0YS5sYW5ndWFnZS5zcGxpdCgnLScpLnNoaWZ0KCkudG9Mb3dlckNhc2UoKTtcblx0XHRpZiAoZGF0YS5sYW5ndWFnZSAhPT0gJ2VuJykge1xuXHRcdFx0Y29uc3QgbG9jYWxlRm4gPSBNZXRlb3IuY2FsbCgnbG9hZExvY2FsZScsIGRhdGEubGFuZ3VhZ2UpO1xuXHRcdFx0aWYgKGxvY2FsZUZuKSB7XG5cdFx0XHRcdEZ1bmN0aW9uKGxvY2FsZUZuKS5jYWxsKHsgbW9tZW50IH0pO1xuXHRcdFx0XHRtb21lbnQubG9jYWxlKGRhdGEubGFuZ3VhZ2UpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNvbnN0IGh0bWwgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kQnlSb29tSWRBbmRNZXNzYWdlSWRzKGRhdGEucmlkLCBkYXRhLm1lc3NhZ2VzLCB7XG5cdFx0XHRzb3J0OiB7XHR0czogMSB9LFxuXHRcdH0pLm1hcChmdW5jdGlvbihtZXNzYWdlKSB7XG5cdFx0XHRjb25zdCBkYXRlVGltZSA9IG1vbWVudChtZXNzYWdlLnRzKS5sb2NhbGUoZGF0YS5sYW5ndWFnZSkuZm9ybWF0KCdMIExUJyk7XG5cdFx0XHRyZXR1cm4gYDxwIHN0eWxlPSdtYXJnaW4tYm90dG9tOiA1cHgnPjxiPiR7IG1lc3NhZ2UudS51c2VybmFtZSB9PC9iPiA8c3BhbiBzdHlsZT0nY29sb3I6ICNhYWE7IGZvbnQtc2l6ZTogMTJweCc+JHsgZGF0ZVRpbWUgfTwvc3Bhbj48YnIvPiR7IFJvY2tldENoYXQuTWVzc2FnZS5wYXJzZShtZXNzYWdlLCBkYXRhLmxhbmd1YWdlKSB9PC9wPmA7XG5cdFx0fSkuam9pbignJyk7XG5cblx0XHRNYWlsZXIuc2VuZCh7XG5cdFx0XHR0bzogZW1haWxzLFxuXHRcdFx0ZnJvbTogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Zyb21fRW1haWwnKSxcblx0XHRcdHJlcGx5VG86IGVtYWlsLFxuXHRcdFx0c3ViamVjdDogZGF0YS5zdWJqZWN0LFxuXHRcdFx0aHRtbCxcblx0XHR9KTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRzdWNjZXNzOiB0cnVlLFxuXHRcdFx0bWlzc2luZyxcblx0XHR9O1xuXHR9LFxufSk7XG4iXX0=
