(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
var FlowRouter = Package['kadira:flow-router'].FlowRouter;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var Mailer;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:mailmessages":{"lib":{"Mailer.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_mailmessages/lib/Mailer.js                                                          //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
Mailer = {}; //eslint-disable-line
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"startup.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_mailmessages/server/startup.js                                                      //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
Meteor.startup(function () {
  return RocketChat.models.Permissions.upsert('access-mailer', {
    $setOnInsert: {
      _id: 'access-mailer',
      roles: ['admin']
    }
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"models":{"Users.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_mailmessages/server/models/Users.js                                                 //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
RocketChat.models.Users.rocketMailUnsubscribe = function (_id, createdAt) {
  const query = {
    _id,
    createdAt: new Date(parseInt(createdAt))
  };
  const update = {
    $set: {
      'mailer.unsubscribed': true
    }
  };
  const affectedRows = this.update(query, update);
  console.log('[Mailer:Unsubscribe]', _id, createdAt, new Date(parseInt(createdAt)), affectedRows);
  return affectedRows;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"functions":{"sendMail.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_mailmessages/server/functions/sendMail.js                                           //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
let Mailer;
module.watch(require("meteor/rocketchat:mailer"), {
  "*"(v) {
    Mailer = v;
  }

}, 1);

Mailer.sendMail = function (from, subject, body, dryrun, query) {
  Mailer.checkAddressFormatAndThrow(from, 'Mailer.sendMail');

  if (body.indexOf('[unsubscribe]') === -1) {
    throw new Meteor.Error('error-missing-unsubscribe-link', 'You must provide the [unsubscribe] link.', {
      function: 'Mailer.sendMail'
    });
  }

  let userQuery = {
    'mailer.unsubscribed': {
      $exists: 0
    }
  };

  if (query) {
    userQuery = {
      $and: [userQuery, EJSON.parse(query)]
    };
  }

  if (dryrun) {
    return Meteor.users.find({
      'emails.address': from
    }).forEach(user => {
      const email = `${user.name} <${user.emails[0].address}>`;
      const html = RocketChat.placeholders.replace(body, {
        unsubscribe: Meteor.absoluteUrl(FlowRouter.path('mailer/unsubscribe/:_id/:createdAt', {
          _id: user._id,
          createdAt: user.createdAt.getTime()
        })),
        name: user.name,
        email
      });
      console.log(`Sending email to ${email}`);
      return Mailer.send({
        to: email,
        from,
        subject,
        html
      });
    });
  }

  return Meteor.users.find(userQuery).forEach(function (user) {
    const email = `${user.name} <${user.emails[0].address}>`;
    const html = RocketChat.placeholders.replace(body, {
      unsubscribe: Meteor.absoluteUrl(FlowRouter.path('mailer/unsubscribe/:_id/:createdAt', {
        _id: user._id,
        createdAt: user.createdAt.getTime()
      })),
      name: s.escapeHTML(user.name),
      email: s.escapeHTML(email)
    });
    console.log(`Sending email to ${email}`);
    return Mailer.send({
      to: email,
      from,
      subject,
      html
    });
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"unsubscribe.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_mailmessages/server/functions/unsubscribe.js                                        //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
/* globals Mailer */
Mailer.unsubscribe = function (_id, createdAt) {
  if (_id && createdAt) {
    return RocketChat.models.Users.rocketMailUnsubscribe(_id, createdAt) === 1;
  }

  return false;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"sendMail.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_mailmessages/server/methods/sendMail.js                                             //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
/* globals Mailer */
Meteor.methods({
  'Mailer.sendMail'(from, subject, body, dryrun, query) {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'Mailer.sendMail'
      });
    }

    if (RocketChat.authz.hasRole(userId, 'admin') !== true) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'Mailer.sendMail'
      });
    }

    return Mailer.sendMail(from, subject, body, dryrun, query);
  }

}); // Limit setting username once per minute
// DDPRateLimiter.addRule
//	type: 'method'
//	name: 'Mailer.sendMail'
//	connectionId: -> return true
//	, 1, 60000
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"unsubscribe.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_mailmessages/server/methods/unsubscribe.js                                          //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
/* globals Mailer */
Meteor.methods({
  'Mailer:unsubscribe'(_id, createdAt) {
    return Mailer.unsubscribe(_id, createdAt);
  }

});
DDPRateLimiter.addRule({
  type: 'method',
  name: 'Mailer:unsubscribe',

  connectionId() {
    return true;
  }

}, 1, 60000);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:mailmessages/lib/Mailer.js");
require("/node_modules/meteor/rocketchat:mailmessages/server/startup.js");
require("/node_modules/meteor/rocketchat:mailmessages/server/models/Users.js");
require("/node_modules/meteor/rocketchat:mailmessages/server/functions/sendMail.js");
require("/node_modules/meteor/rocketchat:mailmessages/server/functions/unsubscribe.js");
require("/node_modules/meteor/rocketchat:mailmessages/server/methods/sendMail.js");
require("/node_modules/meteor/rocketchat:mailmessages/server/methods/unsubscribe.js");

/* Exports */
Package._define("rocketchat:mailmessages", {
  Mailer: Mailer
});

})();

//# sourceURL=meteor://💻app/packages/rocketchat_mailmessages.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYWlsbWVzc2FnZXMvbGliL01haWxlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYWlsbWVzc2FnZXMvc2VydmVyL3N0YXJ0dXAuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWFpbG1lc3NhZ2VzL3NlcnZlci9tb2RlbHMvVXNlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWFpbG1lc3NhZ2VzL3NlcnZlci9mdW5jdGlvbnMvc2VuZE1haWwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWFpbG1lc3NhZ2VzL3NlcnZlci9mdW5jdGlvbnMvdW5zdWJzY3JpYmUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWFpbG1lc3NhZ2VzL3NlcnZlci9tZXRob2RzL3NlbmRNYWlsLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0Om1haWxtZXNzYWdlcy9zZXJ2ZXIvbWV0aG9kcy91bnN1YnNjcmliZS5qcyJdLCJuYW1lcyI6WyJNYWlsZXIiLCJNZXRlb3IiLCJzdGFydHVwIiwiUm9ja2V0Q2hhdCIsIm1vZGVscyIsIlBlcm1pc3Npb25zIiwidXBzZXJ0IiwiJHNldE9uSW5zZXJ0IiwiX2lkIiwicm9sZXMiLCJVc2VycyIsInJvY2tldE1haWxVbnN1YnNjcmliZSIsImNyZWF0ZWRBdCIsInF1ZXJ5IiwiRGF0ZSIsInBhcnNlSW50IiwidXBkYXRlIiwiJHNldCIsImFmZmVjdGVkUm93cyIsImNvbnNvbGUiLCJsb2ciLCJzIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJzZW5kTWFpbCIsImZyb20iLCJzdWJqZWN0IiwiYm9keSIsImRyeXJ1biIsImNoZWNrQWRkcmVzc0Zvcm1hdEFuZFRocm93IiwiaW5kZXhPZiIsIkVycm9yIiwiZnVuY3Rpb24iLCJ1c2VyUXVlcnkiLCIkZXhpc3RzIiwiJGFuZCIsIkVKU09OIiwicGFyc2UiLCJ1c2VycyIsImZpbmQiLCJmb3JFYWNoIiwidXNlciIsImVtYWlsIiwibmFtZSIsImVtYWlscyIsImFkZHJlc3MiLCJodG1sIiwicGxhY2Vob2xkZXJzIiwicmVwbGFjZSIsInVuc3Vic2NyaWJlIiwiYWJzb2x1dGVVcmwiLCJGbG93Um91dGVyIiwicGF0aCIsImdldFRpbWUiLCJzZW5kIiwidG8iLCJlc2NhcGVIVE1MIiwibWV0aG9kcyIsInVzZXJJZCIsIm1ldGhvZCIsImF1dGh6IiwiaGFzUm9sZSIsIkREUFJhdGVMaW1pdGVyIiwiYWRkUnVsZSIsInR5cGUiLCJjb25uZWN0aW9uSWQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxTQUFTLEVBQVQsQyxDQUFZLHFCOzs7Ozs7Ozs7OztBQ0FaQyxPQUFPQyxPQUFQLENBQWUsWUFBVztBQUN6QixTQUFPQyxXQUFXQyxNQUFYLENBQWtCQyxXQUFsQixDQUE4QkMsTUFBOUIsQ0FBcUMsZUFBckMsRUFBc0Q7QUFDNURDLGtCQUFjO0FBQ2JDLFdBQUssZUFEUTtBQUViQyxhQUFPLENBQUMsT0FBRDtBQUZNO0FBRDhDLEdBQXRELENBQVA7QUFNQSxDQVBELEU7Ozs7Ozs7Ozs7O0FDQUFOLFdBQVdDLE1BQVgsQ0FBa0JNLEtBQWxCLENBQXdCQyxxQkFBeEIsR0FBZ0QsVUFBU0gsR0FBVCxFQUFjSSxTQUFkLEVBQXlCO0FBQ3hFLFFBQU1DLFFBQVE7QUFDYkwsT0FEYTtBQUViSSxlQUFXLElBQUlFLElBQUosQ0FBU0MsU0FBU0gsU0FBVCxDQUFUO0FBRkUsR0FBZDtBQUlBLFFBQU1JLFNBQVM7QUFDZEMsVUFBTTtBQUNMLDZCQUF1QjtBQURsQjtBQURRLEdBQWY7QUFLQSxRQUFNQyxlQUFlLEtBQUtGLE1BQUwsQ0FBWUgsS0FBWixFQUFtQkcsTUFBbkIsQ0FBckI7QUFDQUcs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T0FBakMsTUFBOEMsSUFBbEQsRUFBd0Q7QUFDdkQsWUFBTSxJQUFJNUQsT0FBT2lDLEtBQVgsQ0FBaUIsbUJBQWpCLEVBQXNDLGFBQXRDLEVBQXFEO0FBQzFENEIsZ0JBQVE7QUFEa0QsT0FBckQsQ0FBTjtBQUdBOztBQUNELFdBQU85RCxPQUFPMkIsUUFBUCxDQUFnQkMsSUFBaEIsRUFBc0JDLE9BQXRCLEVBQStCQyxJQUEvQixFQUFxQ0MsTUFBckMsRUFBNkNsQixLQUE3QyxDQUFQO0FBQ0E7O0FBZGEsQ0FBZixFLENBa0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhOzs7Ozs7Ozs7OztBQ3hCQTtBQUNBWixPQUFPMkQsT0FBUCxDQUFlO0FBQ2QsdUJBQXFCcEQsR0FBckIsRUFBMEJJLFNBQTFCLEVBQXFDO0FBQ3BDLFdBQU9aLE9BQU9vRCxXQUFQLENBQW1CNUMsR0FBbkIsRUFBd0JJLFNBQXhCLENBQVA7QUFDQTs7QUFIYSxDQUFmO0FBTUFxRCxlQUFlQyxPQUFmLENBQXVCO0FBQ3RCQyxRQUFNLFFBRGdCO0FBRXRCckIsUUFBTSxvQkFGZ0I7O0FBR3RCc0IsaUJBQWU7QUFDZCxXQUFPLElBQVA7QUFDQTs7QUFMcUIsQ0FBdkIsRUFNRyxDQU5ILEVBTU0sS0FOTixFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X21haWxtZXNzYWdlcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIk1haWxlciA9IHt9Oy8vZXNsaW50LWRpc2FibGUtbGluZVxuIiwiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy51cHNlcnQoJ2FjY2Vzcy1tYWlsZXInLCB7XG5cdFx0JHNldE9uSW5zZXJ0OiB7XG5cdFx0XHRfaWQ6ICdhY2Nlc3MtbWFpbGVyJyxcblx0XHRcdHJvbGVzOiBbJ2FkbWluJ10sXG5cdFx0fSxcblx0fSk7XG59KTtcbiIsIlJvY2tldENoYXQubW9kZWxzLlVzZXJzLnJvY2tldE1haWxVbnN1YnNjcmliZSA9IGZ1bmN0aW9uKF9pZCwgY3JlYXRlZEF0KSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZCxcblx0XHRjcmVhdGVkQXQ6IG5ldyBEYXRlKHBhcnNlSW50KGNyZWF0ZWRBdCkpLFxuXHR9O1xuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0J21haWxlci51bnN1YnNjcmliZWQnOiB0cnVlLFxuXHRcdH0sXG5cdH07XG5cdGNvbnN0IGFmZmVjdGVkUm93cyA9IHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xuXHRjb25zb2xlLmxvZygnW01haWxlcjpVbnN1YnNjcmliZV0nLCBfaWQsIGNyZWF0ZWRBdCwgbmV3IERhdGUocGFyc2VJbnQoY3JlYXRlZEF0KSksIGFmZmVjdGVkUm93cyk7XG5cdHJldHVybiBhZmZlY3RlZFJvd3M7XG59O1xuIiwiLyogZ2xvYmFscyAqL1xuaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuaW1wb3J0ICogYXMgTWFpbGVyIGZyb20gJ21ldGVvci9yb2NrZXRjaGF0Om1haWxlcic7XG5cbk1haWxlci5zZW5kTWFpbCA9IGZ1bmN0aW9uKGZyb20sIHN1YmplY3QsIGJvZHksIGRyeXJ1biwgcXVlcnkpIHtcblx0TWFpbGVyLmNoZWNrQWRkcmVzc0Zvcm1hdEFuZFRocm93KGZyb20sICdNYWlsZXIuc2VuZE1haWwnKTtcblx0aWYgKGJvZHkuaW5kZXhPZignW3Vuc3Vic2NyaWJlXScpID09PSAtMSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW1pc3NpbmctdW5zdWJzY3JpYmUtbGluaycsICdZb3UgbXVzdCBwcm92aWRlIHRoZSBbdW5zdWJzY3JpYmVdIGxpbmsuJywge1xuXHRcdFx0ZnVuY3Rpb246ICdNYWlsZXIuc2VuZE1haWwnLFxuXHRcdH0pO1xuXHR9XG5cblx0bGV0IHVzZXJRdWVyeSA9IHsgJ21haWxlci51bnN1YnNjcmliZWQnOiB7ICRleGlzdHM6IDAgfSB9O1xuXHRpZiAocXVlcnkpIHtcblx0XHR1c2VyUXVlcnkgPSB7ICRhbmQ6IFt1c2VyUXVlcnksIEVKU09OLnBhcnNlKHF1ZXJ5KV0gfTtcblx0fVxuXG5cdGlmIChkcnlydW4pIHtcblx0XHRyZXR1cm4gTWV0ZW9yLnVzZXJzLmZpbmQoe1xuXHRcdFx0J2VtYWlscy5hZGRyZXNzJzogZnJvbSxcblx0XHR9KS5mb3JFYWNoKCh1c2VyKSA9PiB7XG5cdFx0XHRjb25zdCBlbWFpbCA9IGAkeyB1c2VyLm5hbWUgfSA8JHsgdXNlci5lbWFpbHNbMF0uYWRkcmVzcyB9PmA7XG5cdFx0XHRjb25zdCBodG1sID0gUm9ja2V0Q2hhdC5wbGFjZWhvbGRlcnMucmVwbGFjZShib2R5LCB7XG5cdFx0XHRcdHVuc3Vic2NyaWJlOiBNZXRlb3IuYWJzb2x1dGVVcmwoRmxvd1JvdXRlci5wYXRoKCdtYWlsZXIvdW5zdWJzY3JpYmUvOl9pZC86Y3JlYXRlZEF0Jywge1xuXHRcdFx0XHRcdF9pZDogdXNlci5faWQsXG5cdFx0XHRcdFx0Y3JlYXRlZEF0OiB1c2VyLmNyZWF0ZWRBdC5nZXRUaW1lKCksXG5cdFx0XHRcdH0pKSxcblx0XHRcdFx0bmFtZTogdXNlci5uYW1lLFxuXHRcdFx0XHRlbWFpbCxcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zb2xlLmxvZyhgU2VuZGluZyBlbWFpbCB0byAkeyBlbWFpbCB9YCk7XG5cdFx0XHRyZXR1cm4gTWFpbGVyLnNlbmQoe1xuXHRcdFx0XHR0bzogZW1haWwsXG5cdFx0XHRcdGZyb20sXG5cdFx0XHRcdHN1YmplY3QsXG5cdFx0XHRcdGh0bWwsXG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiBNZXRlb3IudXNlcnMuZmluZCh1c2VyUXVlcnkpLmZvckVhY2goZnVuY3Rpb24odXNlcikge1xuXHRcdGNvbnN0IGVtYWlsID0gYCR7IHVzZXIubmFtZSB9IDwkeyB1c2VyLmVtYWlsc1swXS5hZGRyZXNzIH0+YDtcblxuXHRcdGNvbnN0IGh0bWwgPSBSb2NrZXRDaGF0LnBsYWNlaG9sZGVycy5yZXBsYWNlKGJvZHksIHtcblx0XHRcdHVuc3Vic2NyaWJlOiBNZXRlb3IuYWJzb2x1dGVVcmwoRmxvd1JvdXRlci5wYXRoKCdtYWlsZXIvdW5zdWJzY3JpYmUvOl9pZC86Y3JlYXRlZEF0Jywge1xuXHRcdFx0XHRfaWQ6IHVzZXIuX2lkLFxuXHRcdFx0XHRjcmVhdGVkQXQ6IHVzZXIuY3JlYXRlZEF0LmdldFRpbWUoKSxcblx0XHRcdH0pKSxcblx0XHRcdG5hbWU6IHMuZXNjYXBlSFRNTCh1c2VyLm5hbWUpLFxuXHRcdFx0ZW1haWw6IHMuZXNjYXBlSFRNTChlbWFpbCksXG5cdFx0fSk7XG5cdFx0Y29uc29sZS5sb2coYFNlbmRpbmcgZW1haWwgdG8gJHsgZW1haWwgfWApO1xuXHRcdHJldHVybiBNYWlsZXIuc2VuZCh7XG5cdFx0XHR0bzogZW1haWwsXG5cdFx0XHRmcm9tLFxuXHRcdFx0c3ViamVjdCxcblx0XHRcdGh0bWwsXG5cdFx0fSk7XG5cdH0pO1xufTtcbiIsIi8qIGdsb2JhbHMgTWFpbGVyICovXG5NYWlsZXIudW5zdWJzY3JpYmUgPSBmdW5jdGlvbihfaWQsIGNyZWF0ZWRBdCkge1xuXHRpZiAoX2lkICYmIGNyZWF0ZWRBdCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5yb2NrZXRNYWlsVW5zdWJzY3JpYmUoX2lkLCBjcmVhdGVkQXQpID09PSAxO1xuXHR9XG5cdHJldHVybiBmYWxzZTtcbn07XG4iLCIvKiBnbG9iYWxzIE1haWxlciAqL1xuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnTWFpbGVyLnNlbmRNYWlsJyhmcm9tLCBzdWJqZWN0LCBib2R5LCBkcnlydW4sIHF1ZXJ5KSB7XG5cdFx0Y29uc3QgdXNlcklkID0gTWV0ZW9yLnVzZXJJZCgpO1xuXHRcdGlmICghdXNlcklkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywge1xuXHRcdFx0XHRtZXRob2Q6ICdNYWlsZXIuc2VuZE1haWwnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1JvbGUodXNlcklkLCAnYWRtaW4nKSAhPT0gdHJ1ZSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ01haWxlci5zZW5kTWFpbCcsXG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIE1haWxlci5zZW5kTWFpbChmcm9tLCBzdWJqZWN0LCBib2R5LCBkcnlydW4sIHF1ZXJ5KTtcblx0fSxcbn0pO1xuXG5cbi8vIExpbWl0IHNldHRpbmcgdXNlcm5hbWUgb25jZSBwZXIgbWludXRlXG4vLyBERFBSYXRlTGltaXRlci5hZGRSdWxlXG4vL1x0dHlwZTogJ21ldGhvZCdcbi8vXHRuYW1lOiAnTWFpbGVyLnNlbmRNYWlsJ1xuLy9cdGNvbm5lY3Rpb25JZDogLT4gcmV0dXJuIHRydWVcbi8vXHQsIDEsIDYwMDAwXG4iLCIvKiBnbG9iYWxzIE1haWxlciAqL1xuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnTWFpbGVyOnVuc3Vic2NyaWJlJyhfaWQsIGNyZWF0ZWRBdCkge1xuXHRcdHJldHVybiBNYWlsZXIudW5zdWJzY3JpYmUoX2lkLCBjcmVhdGVkQXQpO1xuXHR9LFxufSk7XG5cbkREUFJhdGVMaW1pdGVyLmFkZFJ1bGUoe1xuXHR0eXBlOiAnbWV0aG9kJyxcblx0bmFtZTogJ01haWxlcjp1bnN1YnNjcmliZScsXG5cdGNvbm5lY3Rpb25JZCgpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcbn0sIDEsIDYwMDAwKTtcbiJdfQ==
