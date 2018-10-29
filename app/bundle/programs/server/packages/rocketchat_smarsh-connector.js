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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:smarsh-connector":{"lib":{"rocketchat.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_smarsh-connector/lib/rocketchat.js                                                        //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
RocketChat.smarsh = {};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"settings.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_smarsh-connector/server/settings.js                                                       //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 0);
module.watch(require("moment-timezone"));
RocketChat.settings.addGroup('Smarsh', function addSettings() {
  this.add('Smarsh_Enabled', false, {
    type: 'boolean',
    i18nLabel: 'Smarsh_Enabled',
    enableQuery: {
      _id: 'From_Email',
      value: {
        $exists: 1,
        $ne: ''
      }
    }
  });
  this.add('Smarsh_Email', '', {
    type: 'string',
    i18nLabel: 'Smarsh_Email',
    placeholder: 'email@domain.com'
  });
  this.add('Smarsh_MissingEmail_Email', 'no-email@example.com', {
    type: 'string',
    i18nLabel: 'Smarsh_MissingEmail_Email',
    placeholder: 'no-email@example.com'
  });
  const zoneValues = moment.tz.names().map(function _timeZonesToSettings(name) {
    return {
      key: name,
      i18nLabel: name
    };
  });
  this.add('Smarsh_Timezone', 'America/Los_Angeles', {
    type: 'select',
    values: zoneValues
  });
  this.add('Smarsh_Interval', 'every_30_minutes', {
    type: 'select',
    values: [{
      key: 'every_30_seconds',
      i18nLabel: 'every_30_seconds'
    }, {
      key: 'every_30_minutes',
      i18nLabel: 'every_30_minutes'
    }, {
      key: 'every_1_hours',
      i18nLabel: 'every_hour'
    }, {
      key: 'every_6_hours',
      i18nLabel: 'every_six_hours'
    }],
    enableQuery: {
      _id: 'From_Email',
      value: {
        $exists: 1,
        $ne: ''
      }
    }
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"models":{"SmarshHistory.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_smarsh-connector/server/models/SmarshHistory.js                                           //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
RocketChat.smarsh.History = new class extends RocketChat.models._Base {
  constructor() {
    super('smarsh_history');
  }

}();
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"functions":{"sendEmail.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_smarsh-connector/server/functions/sendEmail.js                                            //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let Mailer;
module.watch(require("meteor/rocketchat:mailer"), {
  "*"(v) {
    Mailer = v;
  }

}, 1);

RocketChat.smarsh.sendEmail = data => {
  const attachments = [];

  _.each(data.files, fileId => {
    const file = RocketChat.models.Uploads.findOneById(fileId);

    if (file.store === 'rocketchat_uploads' || file.store === 'fileSystem') {
      const rs = UploadFS.getStore(file.store).getReadStream(fileId, file);
      attachments.push({
        filename: file.name,
        streamSource: rs
      });
    }
  });

  Mailer.sendNoWrap({
    to: RocketChat.settings.get('Smarsh_Email'),
    from: RocketChat.settings.get('From_Email'),
    subject: data.subject,
    html: data.body,
    attachments
  });
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"generateEml.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_smarsh-connector/server/functions/generateEml.js                                          //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
module.watch(require("moment-timezone"));
const start = '<table style="width: 100%; border: 1px solid; border-collapse: collapse; table-layout: fixed; margin-top: 10px; font-size: 12px; word-break: break-word;"><tbody>';
const end = '</tbody></table>';
const opentr = '<tr style="border: 1px solid;">';
const closetr = '</tr>';
const open20td = '<td style="border: 1px solid; text-align: center; width: 20%;">';
const open60td = '<td style="border: 1px solid; text-align: left; width: 60%; padding: 0 5px;">';
const closetd = '</td>';

function _getLink(attachment) {
  const url = attachment.title_link.replace(/ /g, '%20');

  if (Meteor.settings.public.sandstorm || url.match(/^(https?:)?\/\//i)) {
    return url;
  } else {
    return Meteor.absoluteUrl().replace(/\/$/, '') + __meteor_runtime_config__.ROOT_URL_PATH_PREFIX + url;
  }
}

RocketChat.smarsh.generateEml = () => {
  Meteor.defer(() => {
    const smarshMissingEmail = RocketChat.settings.get('Smarsh_MissingEmail_Email');
    const timeZone = RocketChat.settings.get('Smarsh_Timezone');
    RocketChat.models.Rooms.find().forEach(room => {
      const smarshHistory = RocketChat.smarsh.History.findOne({
        _id: room._id
      });
      const query = {
        rid: room._id
      };

      if (smarshHistory) {
        query.ts = {
          $gt: smarshHistory.lastRan
        };
      }

      const date = new Date();
      const rows = [];
      const data = {
        users: [],
        msgs: 0,
        files: [],
        time: smarshHistory ? moment(date).diff(moment(smarshHistory.lastRan), 'minutes') : moment(date).diff(moment(room.ts), 'minutes'),
        room: room.name ? `#${room.name}` : `Direct Message Between: ${room.usernames.join(' & ')}`
      };
      RocketChat.models.Messages.find(query).forEach(message => {
        rows.push(opentr); // The timestamp

        rows.push(open20td);
        rows.push(moment(message.ts).tz(timeZone).format('YYYY-MM-DD HH-mm-ss z'));
        rows.push(closetd); // The sender

        rows.push(open20td);
        const sender = RocketChat.models.Users.findOne({
          _id: message.u._id
        });

        if (data.users.indexOf(sender._id) === -1) {
          data.users.push(sender._id);
        } // Get the user's email, can be nothing if it is an unconfigured bot account (like rocket.cat)


        if (sender.emails && sender.emails[0] && sender.emails[0].address) {
          rows.push(`${sender.name} &lt;${sender.emails[0].address}&gt;`);
        } else {
          rows.push(`${sender.name} &lt;${smarshMissingEmail}&gt;`);
        }

        rows.push(closetd); // The message

        rows.push(open60td);
        data.msgs++;

        if (message.t) {
          const messageType = RocketChat.MessageTypes.getType(message);

          if (messageType) {
            rows.push(TAPi18n.__(messageType.message, messageType.data ? messageType.data(message) : '', 'en'));
          } else {
            rows.push(`${message.msg} (${message.t})`);
          }
        } else if (message.file) {
          data.files.push(message.file._id);
          rows.push(`${message.attachments[0].title} (${_getLink(message.attachments[0])})`);
        } else if (message.attachments) {
          const attaches = [];

          _.each(message.attachments, function _loopThroughMessageAttachments(a) {
            if (a.image_url) {
              attaches.push(a.image_url);
            } // TODO: Verify other type of attachments which need to be handled that aren't file uploads and image urls
            // } else {
            // 	console.log(a);
            // }

          });

          rows.push(`${message.msg} (${attaches.join(', ')})`);
        } else {
          rows.push(message.msg);
        }

        rows.push(closetd);
        rows.push(closetr);
      });

      if (rows.length !== 0) {
        const result = start + rows.join('') + end;
        RocketChat.smarsh.History.upsert({
          _id: room._id
        }, {
          _id: room._id,
          lastRan: date,
          lastResult: result
        });
        RocketChat.smarsh.sendEmail({
          body: result,
          subject: `Rocket.Chat, ${data.users.length} Users, ${data.msgs} Messages, ${data.files.length} Files, ${data.time} Minutes, in ${data.room}`,
          files: data.files
        });
      }
    });
  });
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_smarsh-connector/server/startup.js                                                        //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
const smarshJobName = 'Smarsh EML Connector';

const _addSmarshSyncedCronJob = _.debounce(Meteor.bindEnvironment(function __addSmarshSyncedCronJobDebounced() {
  if (SyncedCron.nextScheduledAtDate(smarshJobName)) {
    SyncedCron.remove(smarshJobName);
  }

  if (RocketChat.settings.get('Smarsh_Enabled') && RocketChat.settings.get('Smarsh_Email') !== '' && RocketChat.settings.get('From_Email') !== '') {
    SyncedCron.add({
      name: smarshJobName,
      schedule: parser => parser.text(RocketChat.settings.get('Smarsh_Interval').replace(/_/g, ' ')),
      job: RocketChat.smarsh.generateEml
    });
  }
}), 500);

Meteor.startup(() => {
  Meteor.defer(() => {
    _addSmarshSyncedCronJob();

    RocketChat.settings.get('Smarsh_Interval', _addSmarshSyncedCronJob);
    RocketChat.settings.get('Smarsh_Enabled', _addSmarshSyncedCronJob);
    RocketChat.settings.get('Smarsh_Email', _addSmarshSyncedCronJob);
    RocketChat.settings.get('From_Email', _addSmarshSyncedCronJob);
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:smarsh-connector/lib/rocketchat.js");
require("/node_modules/meteor/rocketchat:smarsh-connector/server/settings.js");
require("/node_modules/meteor/rocketchat:smarsh-connector/server/models/SmarshHistory.js");
require("/node_modules/meteor/rocketchat:smarsh-connector/server/functions/sendEmail.js");
require("/node_modules/meteor/rocketchat:smarsh-connector/server/functions/generateEml.js");
require("/node_modules/meteor/rocketchat:smarsh-connector/server/startup.js");

/* Exports */
Package._define("rocketchat:smarsh-connector");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_smarsh-connector.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbWFyc2gtY29ubmVjdG9yL2xpYi9yb2NrZXRjaGF0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnNtYXJzaC1jb25uZWN0b3Ivc2VydmVyL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnNtYXJzaC1jb25uZWN0b3Ivc2VydmVyL21vZGVscy9TbWFyc2hIaXN0b3J5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnNtYXJzaC1jb25uZWN0b3Ivc2VydmVyL2Z1bmN0aW9ucy9zZW5kRW1haWwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6c21hcnNoLWNvbm5lY3Rvci9zZXJ2ZXIvZnVuY3Rpb25zL2dlbmVyYXRlRW1sLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnNtYXJzaC1jb25uZWN0b3Ivc2VydmVyL3N0YXJ0dXAuanMiXSwibmFtZXMiOlsiUm9ja2V0Q2hhdCIsInNtYXJzaCIsIm1vbWVudCIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2Iiwic2V0dGluZ3MiLCJhZGRHcm91cCIsImFkZFNldHRpbmdzIiwiYWRkIiwidHlwZSIsImkxOG5MYWJlbCIsImVuYWJsZVF1ZXJ5IiwiX2lkIiwidmFsdWUiLCIkZXhpc3RzIiwiJG5lIiwicGxhY2Vob2xkZXIiLCJ6b25lVmFsdWVzIiwidHoiLCJuYW1lcyIsIm1hcCIsIl90aW1lWm9uZXNUb1NldHRpbmdzIiwibmFtZSIsImtleSIsInZhbHVlcyIsIkhpc3RvcnkiLCJtb2RlbHMiLCJfQmFzZSIsImNvbnN0cnVjdG9yIiwiXyIsIk1haWxlciIsInNlbmRFbWFpbCIsImRhdGEiLCJhdHRhY2htZW50cyIsImVhY2giLCJmaWxlcyIsImZpbGVJZCIsImZpbGUiLCJVcGxvYWRzIiwiZmluZE9uZUJ5SWQiLCJzdG9yZSIsInJzIiwiVXBsb2FkRlMiLCJnZXRTdG9yZSIsImdldFJlYWRTdHJlYW0iLCJwdXNoIiwiZmlsZW5hbWUiLCJzdHJlYW1Tb3VyY2UiLCJzZW5kTm9XcmFwIiwidG8iLCJnZXQiLCJmcm9tIiwic3ViamVjdCIsImh0bWwiLCJib2R5Iiwic3RhcnQiLCJlbmQiLCJvcGVudHIiLCJjbG9zZXRyIiwib3BlbjIwdGQiLCJvcGVuNjB0ZCIsImNsb3NldGQiLCJfZ2V0TGluayIsImF0dGFjaG1lbnQiLCJ1cmwiLCJ0aXRsZV9saW5rIiwicmVwbGFjZSIsIk1ldGVvciIsInB1YmxpYyIsInNhbmRzdG9ybSIsIm1hdGNoIiwiYWJzb2x1dGVVcmwiLCJfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIiwiUk9PVF9VUkxfUEFUSF9QUkVGSVgiLCJnZW5lcmF0ZUVtbCIsImRlZmVyIiwic21hcnNoTWlzc2luZ0VtYWlsIiwidGltZVpvbmUiLCJSb29tcyIsImZpbmQiLCJmb3JFYWNoIiwicm9vbSIsInNtYXJzaEhpc3RvcnkiLCJmaW5kT25lIiwicXVlcnkiLCJyaWQiLCJ0cyIsIiRndCIsImxhc3RSYW4iLCJkYXRlIiwiRGF0ZSIsInJvd3MiLCJ1c2VycyIsIm1zZ3MiLCJ0aW1lIiwiZGlmZiIsInVzZXJuYW1lcyIsImpvaW4iLCJNZXNzYWdlcyIsIm1lc3NhZ2UiLCJmb3JtYXQiLCJzZW5kZXIiLCJVc2VycyIsInUiLCJpbmRleE9mIiwiZW1haWxzIiwiYWRkcmVzcyIsInQiLCJtZXNzYWdlVHlwZSIsIk1lc3NhZ2VUeXBlcyIsImdldFR5cGUiLCJUQVBpMThuIiwiX18iLCJtc2ciLCJ0aXRsZSIsImF0dGFjaGVzIiwiX2xvb3BUaHJvdWdoTWVzc2FnZUF0dGFjaG1lbnRzIiwiYSIsImltYWdlX3VybCIsImxlbmd0aCIsInJlc3VsdCIsInVwc2VydCIsImxhc3RSZXN1bHQiLCJzbWFyc2hKb2JOYW1lIiwiX2FkZFNtYXJzaFN5bmNlZENyb25Kb2IiLCJkZWJvdW5jZSIsImJpbmRFbnZpcm9ubWVudCIsIl9fYWRkU21hcnNoU3luY2VkQ3JvbkpvYkRlYm91bmNlZCIsIlN5bmNlZENyb24iLCJuZXh0U2NoZWR1bGVkQXREYXRlIiwicmVtb3ZlIiwic2NoZWR1bGUiLCJwYXJzZXIiLCJ0ZXh0Iiwiam9iIiwic3RhcnR1cCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxXQUFXQyxNQUFYLEdBQW9CLEVBQXBCLEM7Ozs7Ozs7Ozs7O0FDQUEsSUFBSUMsTUFBSjtBQUFXQyxPQUFPQyxLQUFQLENBQWFDLFFBQVEsUUFBUixDQUFiLEVBQStCO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDTCxhQUFPSyxDQUFQO0FBQVM7O0FBQXJCLENBQS9CLEVBQXNELENBQXREO0FBQXlESixPQUFPQyxLQUFQLENBQWFDLFFBQVEsaUJBQVIsQ0FBYjtBQUdwRUwsV0FBV1EsUUFBWCxDQUFvQkMsUUFBcEIsQ0FBNkIsUUFBN0IsRUFBdUMsU0FBU0MsV0FBVCxHQUF1QjtBQUM3RCxPQUFLQyxHQUFMLENBQVMsZ0JBQVQsRUFBMkIsS0FBM0IsRUFBa0M7QUFDakNDLFVBQU0sU0FEMkI7QUFFakNDLGVBQVcsZ0JBRnNCO0FBR2pDQyxpQkFBYTtBQUNaQyxXQUFLLFlBRE87QUFFWkMsYUFBTztBQUNOQyxpQkFBUyxDQURIO0FBRU5DLGFBQUs7QUFGQztBQUZLO0FBSG9CLEdBQWxDO0FBV0EsT0FBS1AsR0FBTCxDQUFTLGNBQVQsRUFBeUIsRUFBekIsRUFBNkI7QUFDNUJDLFVBQU0sUUFEc0I7QUFFNUJDLGVBQVcsY0FGaUI7QUFHNUJNLGlCQUFhO0FBSGUsR0FBN0I7QUFLQSxPQUFLUixHQUFMLENBQVMsMkJBQVQsRUFBc0Msc0JBQXRDLEVBQThEO0FBQzdEQyxVQUFNLFFBRHVEO0FBRTdEQyxlQUFXLDJCQUZrRDtBQUc3RE0saUJBQWE7QUFIZ0QsR0FBOUQ7QUFNQSxRQUFNQyxhQUFhbEIsT0FBT21CLEVBQVAsQ0FBVUMsS0FBVixHQUFrQkMsR0FBbEIs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QUFvQjZDLEdBQXBCLENBQXdCLGdCQUF4QixLQUE2Q3JELFdBQVdRLFFBQVgsQ0FBb0I2QyxHQUFwQixDQUF3QixjQUF4QixNQUE0QyxFQUF6RixJQUErRnJELFdBQVdRLFFBQVgsQ0FBb0I2QyxHQUFwQixDQUF3QixZQUF4QixNQUEwQyxFQUE3SSxFQUFpSjtBQUNoSjhFLGVBQVd4SCxHQUFYLENBQWU7QUFDZGMsWUFBTXFHLGFBRFE7QUFFZFEsZ0JBQVdDLE1BQUQsSUFBWUEsT0FBT0MsSUFBUCxDQUFZeEksV0FBV1EsUUFBWCxDQUFvQjZDLEdBQXBCLENBQXdCLGlCQUF4QixFQUEyQ2dCLE9BQTNDLENBQW1ELElBQW5ELEVBQXlELEdBQXpELENBQVosQ0FGUjtBQUdkb0UsV0FBS3pJLFdBQVdDLE1BQVgsQ0FBa0I0RTtBQUhULEtBQWY7QUFLQTtBQUNELENBWjBDLENBQVgsRUFZNUIsR0FaNEIsQ0FBaEM7O0FBY0FQLE9BQU9vRSxPQUFQLENBQWUsTUFBTTtBQUNwQnBFLFNBQU9RLEtBQVAsQ0FBYSxNQUFNO0FBQ2xCaUQ7O0FBRUEvSCxlQUFXUSxRQUFYLENBQW9CNkMsR0FBcEIsQ0FBd0IsaUJBQXhCLEVBQTJDMEUsdUJBQTNDO0FBQ0EvSCxlQUFXUSxRQUFYLENBQW9CNkMsR0FBcEIsQ0FBd0IsZ0JBQXhCLEVBQTBDMEUsdUJBQTFDO0FBQ0EvSCxlQUFXUSxRQUFYLENBQW9CNkMsR0FBcEIsQ0FBd0IsY0FBeEIsRUFBd0MwRSx1QkFBeEM7QUFDQS9ILGVBQVdRLFFBQVgsQ0FBb0I2QyxHQUFwQixDQUF3QixZQUF4QixFQUFzQzBFLHVCQUF0QztBQUNBLEdBUEQ7QUFRQSxDQVRELEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfc21hcnNoLWNvbm5lY3Rvci5qcyIsInNvdXJjZXNDb250ZW50IjpbIlJvY2tldENoYXQuc21hcnNoID0ge307XG4iLCJpbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgJ21vbWVudC10aW1lem9uZSc7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuYWRkR3JvdXAoJ1NtYXJzaCcsIGZ1bmN0aW9uIGFkZFNldHRpbmdzKCkge1xuXHR0aGlzLmFkZCgnU21hcnNoX0VuYWJsZWQnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRpMThuTGFiZWw6ICdTbWFyc2hfRW5hYmxlZCcsXG5cdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdF9pZDogJ0Zyb21fRW1haWwnLFxuXHRcdFx0dmFsdWU6IHtcblx0XHRcdFx0JGV4aXN0czogMSxcblx0XHRcdFx0JG5lOiAnJyxcblx0XHRcdH0sXG5cdFx0fSxcblx0fSk7XG5cdHRoaXMuYWRkKCdTbWFyc2hfRW1haWwnLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGkxOG5MYWJlbDogJ1NtYXJzaF9FbWFpbCcsXG5cdFx0cGxhY2Vob2xkZXI6ICdlbWFpbEBkb21haW4uY29tJyxcblx0fSk7XG5cdHRoaXMuYWRkKCdTbWFyc2hfTWlzc2luZ0VtYWlsX0VtYWlsJywgJ25vLWVtYWlsQGV4YW1wbGUuY29tJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGkxOG5MYWJlbDogJ1NtYXJzaF9NaXNzaW5nRW1haWxfRW1haWwnLFxuXHRcdHBsYWNlaG9sZGVyOiAnbm8tZW1haWxAZXhhbXBsZS5jb20nLFxuXHR9KTtcblxuXHRjb25zdCB6b25lVmFsdWVzID0gbW9tZW50LnR6Lm5hbWVzKCkubWFwKGZ1bmN0aW9uIF90aW1lWm9uZXNUb1NldHRpbmdzKG5hbWUpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0a2V5OiBuYW1lLFxuXHRcdFx0aTE4bkxhYmVsOiBuYW1lLFxuXHRcdH07XG5cdH0pO1xuXHR0aGlzLmFkZCgnU21hcnNoX1RpbWV6b25lJywgJ0FtZXJpY2EvTG9zX0FuZ2VsZXMnLCB7XG5cdFx0dHlwZTogJ3NlbGVjdCcsXG5cdFx0dmFsdWVzOiB6b25lVmFsdWVzLFxuXHR9KTtcblxuXHR0aGlzLmFkZCgnU21hcnNoX0ludGVydmFsJywgJ2V2ZXJ5XzMwX21pbnV0ZXMnLCB7XG5cdFx0dHlwZTogJ3NlbGVjdCcsXG5cdFx0dmFsdWVzOiBbe1xuXHRcdFx0a2V5OiAnZXZlcnlfMzBfc2Vjb25kcycsXG5cdFx0XHRpMThuTGFiZWw6ICdldmVyeV8zMF9zZWNvbmRzJyxcblx0XHR9LCB7XG5cdFx0XHRrZXk6ICdldmVyeV8zMF9taW51dGVzJyxcblx0XHRcdGkxOG5MYWJlbDogJ2V2ZXJ5XzMwX21pbnV0ZXMnLFxuXHRcdH0sIHtcblx0XHRcdGtleTogJ2V2ZXJ5XzFfaG91cnMnLFxuXHRcdFx0aTE4bkxhYmVsOiAnZXZlcnlfaG91cicsXG5cdFx0fSwge1xuXHRcdFx0a2V5OiAnZXZlcnlfNl9ob3VycycsXG5cdFx0XHRpMThuTGFiZWw6ICdldmVyeV9zaXhfaG91cnMnLFxuXHRcdH1dLFxuXHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRfaWQ6ICdGcm9tX0VtYWlsJyxcblx0XHRcdHZhbHVlOiB7XG5cdFx0XHRcdCRleGlzdHM6IDEsXG5cdFx0XHRcdCRuZTogJycsXG5cdFx0XHR9LFxuXHRcdH0sXG5cdH0pO1xufSk7XG4iLCJSb2NrZXRDaGF0LnNtYXJzaC5IaXN0b3J5ID0gbmV3IGNsYXNzIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignc21hcnNoX2hpc3RvcnknKTtcblx0fVxufTtcbiIsIi8qIGdsb2JhbHMgVXBsb2FkRlMgKi9cbi8vIEV4cGVjdHMgdGhlIGZvbGxvd2luZyBkZXRhaWxzOlxuLy8ge1xuLy8gXHRib2R5OiAnPHRhYmxlPicsXG4vLyBcdHN1YmplY3Q6ICdSb2NrZXQuQ2hhdCwgMTcgVXNlcnMsIDI0IE1lc3NhZ2VzLCAxIEZpbGUsIDc5OTUwNCBNaW51dGVzLCBpbiAjcmFuZG9tJyxcbi8vICBmaWxlczogWydpM25jOWwzbW4nXVxuLy8gfVxuXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCAqIGFzIE1haWxlciBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDptYWlsZXInO1xuXG5Sb2NrZXRDaGF0LnNtYXJzaC5zZW5kRW1haWwgPSAoZGF0YSkgPT4ge1xuXHRjb25zdCBhdHRhY2htZW50cyA9IFtdO1xuXG5cdF8uZWFjaChkYXRhLmZpbGVzLCAoZmlsZUlkKSA9PiB7XG5cdFx0Y29uc3QgZmlsZSA9IFJvY2tldENoYXQubW9kZWxzLlVwbG9hZHMuZmluZE9uZUJ5SWQoZmlsZUlkKTtcblx0XHRpZiAoZmlsZS5zdG9yZSA9PT0gJ3JvY2tldGNoYXRfdXBsb2FkcycgfHwgZmlsZS5zdG9yZSA9PT0gJ2ZpbGVTeXN0ZW0nKSB7XG5cdFx0XHRjb25zdCBycyA9IFVwbG9hZEZTLmdldFN0b3JlKGZpbGUuc3RvcmUpLmdldFJlYWRTdHJlYW0oZmlsZUlkLCBmaWxlKTtcblx0XHRcdGF0dGFjaG1lbnRzLnB1c2goe1xuXHRcdFx0XHRmaWxlbmFtZTogZmlsZS5uYW1lLFxuXHRcdFx0XHRzdHJlYW1Tb3VyY2U6IHJzLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9KTtcblxuXG5cdE1haWxlci5zZW5kTm9XcmFwKHtcblx0XHR0bzogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NtYXJzaF9FbWFpbCcpLFxuXHRcdGZyb206IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGcm9tX0VtYWlsJyksXG5cdFx0c3ViamVjdDogZGF0YS5zdWJqZWN0LFxuXHRcdGh0bWw6IGRhdGEuYm9keSxcblx0XHRhdHRhY2htZW50cyxcblx0fSk7XG59O1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgJ21vbWVudC10aW1lem9uZSc7XG5cbmNvbnN0IHN0YXJ0ID0gJzx0YWJsZSBzdHlsZT1cIndpZHRoOiAxMDAlOyBib3JkZXI6IDFweCBzb2xpZDsgYm9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZTsgdGFibGUtbGF5b3V0OiBmaXhlZDsgbWFyZ2luLXRvcDogMTBweDsgZm9udC1zaXplOiAxMnB4OyB3b3JkLWJyZWFrOiBicmVhay13b3JkO1wiPjx0Ym9keT4nO1xuY29uc3QgZW5kID0gJzwvdGJvZHk+PC90YWJsZT4nO1xuY29uc3Qgb3BlbnRyID0gJzx0ciBzdHlsZT1cImJvcmRlcjogMXB4IHNvbGlkO1wiPic7XG5jb25zdCBjbG9zZXRyID0gJzwvdHI+JztcbmNvbnN0IG9wZW4yMHRkID0gJzx0ZCBzdHlsZT1cImJvcmRlcjogMXB4IHNvbGlkOyB0ZXh0LWFsaWduOiBjZW50ZXI7IHdpZHRoOiAyMCU7XCI+JztcbmNvbnN0IG9wZW42MHRkID0gJzx0ZCBzdHlsZT1cImJvcmRlcjogMXB4IHNvbGlkOyB0ZXh0LWFsaWduOiBsZWZ0OyB3aWR0aDogNjAlOyBwYWRkaW5nOiAwIDVweDtcIj4nO1xuY29uc3QgY2xvc2V0ZCA9ICc8L3RkPic7XG5cbmZ1bmN0aW9uIF9nZXRMaW5rKGF0dGFjaG1lbnQpIHtcblx0Y29uc3QgdXJsID0gYXR0YWNobWVudC50aXRsZV9saW5rLnJlcGxhY2UoLyAvZywgJyUyMCcpO1xuXG5cdGlmIChNZXRlb3Iuc2V0dGluZ3MucHVibGljLnNhbmRzdG9ybSB8fCB1cmwubWF0Y2goL14oaHR0cHM/Oik/XFwvXFwvL2kpKSB7XG5cdFx0cmV0dXJuIHVybDtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gTWV0ZW9yLmFic29sdXRlVXJsKCkucmVwbGFjZSgvXFwvJC8sICcnKSArIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVggKyB1cmw7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5zbWFyc2guZ2VuZXJhdGVFbWwgPSAoKSA9PiB7XG5cdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0Y29uc3Qgc21hcnNoTWlzc2luZ0VtYWlsID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NtYXJzaF9NaXNzaW5nRW1haWxfRW1haWwnKTtcblx0XHRjb25zdCB0aW1lWm9uZSA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTbWFyc2hfVGltZXpvbmUnKTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmQoKS5mb3JFYWNoKChyb29tKSA9PiB7XG5cdFx0XHRjb25zdCBzbWFyc2hIaXN0b3J5ID0gUm9ja2V0Q2hhdC5zbWFyc2guSGlzdG9yeS5maW5kT25lKHsgX2lkOiByb29tLl9pZCB9KTtcblx0XHRcdGNvbnN0IHF1ZXJ5ID0geyByaWQ6IHJvb20uX2lkIH07XG5cblx0XHRcdGlmIChzbWFyc2hIaXN0b3J5KSB7XG5cdFx0XHRcdHF1ZXJ5LnRzID0geyAkZ3Q6IHNtYXJzaEhpc3RvcnkubGFzdFJhbiB9O1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcblx0XHRcdGNvbnN0IHJvd3MgPSBbXTtcblx0XHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHRcdHVzZXJzOiBbXSxcblx0XHRcdFx0bXNnczogMCxcblx0XHRcdFx0ZmlsZXM6IFtdLFxuXHRcdFx0XHR0aW1lOiBzbWFyc2hIaXN0b3J5ID8gbW9tZW50KGRhdGUpLmRpZmYobW9tZW50KHNtYXJzaEhpc3RvcnkubGFzdFJhbiksICdtaW51dGVzJykgOiBtb21lbnQoZGF0ZSkuZGlmZihtb21lbnQocm9vbS50cyksICdtaW51dGVzJyksXG5cdFx0XHRcdHJvb206IHJvb20ubmFtZSA/IGAjJHsgcm9vbS5uYW1lIH1gIDogYERpcmVjdCBNZXNzYWdlIEJldHdlZW46ICR7IHJvb20udXNlcm5hbWVzLmpvaW4oJyAmICcpIH1gLFxuXHRcdFx0fTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZChxdWVyeSkuZm9yRWFjaCgobWVzc2FnZSkgPT4ge1xuXHRcdFx0XHRyb3dzLnB1c2gob3BlbnRyKTtcblxuXHRcdFx0XHQvLyBUaGUgdGltZXN0YW1wXG5cdFx0XHRcdHJvd3MucHVzaChvcGVuMjB0ZCk7XG5cdFx0XHRcdHJvd3MucHVzaChtb21lbnQobWVzc2FnZS50cykudHoodGltZVpvbmUpLmZvcm1hdCgnWVlZWS1NTS1ERCBISC1tbS1zcyB6JykpO1xuXHRcdFx0XHRyb3dzLnB1c2goY2xvc2V0ZCk7XG5cblx0XHRcdFx0Ly8gVGhlIHNlbmRlclxuXHRcdFx0XHRyb3dzLnB1c2gob3BlbjIwdGQpO1xuXHRcdFx0XHRjb25zdCBzZW5kZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHsgX2lkOiBtZXNzYWdlLnUuX2lkIH0pO1xuXHRcdFx0XHRpZiAoZGF0YS51c2Vycy5pbmRleE9mKHNlbmRlci5faWQpID09PSAtMSkge1xuXHRcdFx0XHRcdGRhdGEudXNlcnMucHVzaChzZW5kZXIuX2lkKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEdldCB0aGUgdXNlcidzIGVtYWlsLCBjYW4gYmUgbm90aGluZyBpZiBpdCBpcyBhbiB1bmNvbmZpZ3VyZWQgYm90IGFjY291bnQgKGxpa2Ugcm9ja2V0LmNhdClcblx0XHRcdFx0aWYgKHNlbmRlci5lbWFpbHMgJiYgc2VuZGVyLmVtYWlsc1swXSAmJiBzZW5kZXIuZW1haWxzWzBdLmFkZHJlc3MpIHtcblx0XHRcdFx0XHRyb3dzLnB1c2goYCR7IHNlbmRlci5uYW1lIH0gJmx0OyR7IHNlbmRlci5lbWFpbHNbMF0uYWRkcmVzcyB9Jmd0O2ApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJvd3MucHVzaChgJHsgc2VuZGVyLm5hbWUgfSAmbHQ7JHsgc21hcnNoTWlzc2luZ0VtYWlsIH0mZ3Q7YCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cm93cy5wdXNoKGNsb3NldGQpO1xuXG5cdFx0XHRcdC8vIFRoZSBtZXNzYWdlXG5cdFx0XHRcdHJvd3MucHVzaChvcGVuNjB0ZCk7XG5cdFx0XHRcdGRhdGEubXNncysrO1xuXHRcdFx0XHRpZiAobWVzc2FnZS50KSB7XG5cdFx0XHRcdFx0Y29uc3QgbWVzc2FnZVR5cGUgPSBSb2NrZXRDaGF0Lk1lc3NhZ2VUeXBlcy5nZXRUeXBlKG1lc3NhZ2UpO1xuXHRcdFx0XHRcdGlmIChtZXNzYWdlVHlwZSkge1xuXHRcdFx0XHRcdFx0cm93cy5wdXNoKFRBUGkxOG4uX18obWVzc2FnZVR5cGUubWVzc2FnZSwgbWVzc2FnZVR5cGUuZGF0YSA/IG1lc3NhZ2VUeXBlLmRhdGEobWVzc2FnZSkgOiAnJywgJ2VuJykpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRyb3dzLnB1c2goYCR7IG1lc3NhZ2UubXNnIH0gKCR7IG1lc3NhZ2UudCB9KWApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmIChtZXNzYWdlLmZpbGUpIHtcblx0XHRcdFx0XHRkYXRhLmZpbGVzLnB1c2gobWVzc2FnZS5maWxlLl9pZCk7XG5cdFx0XHRcdFx0cm93cy5wdXNoKGAkeyBtZXNzYWdlLmF0dGFjaG1lbnRzWzBdLnRpdGxlIH0gKCR7IF9nZXRMaW5rKG1lc3NhZ2UuYXR0YWNobWVudHNbMF0pIH0pYCk7XG5cdFx0XHRcdH0gZWxzZSBpZiAobWVzc2FnZS5hdHRhY2htZW50cykge1xuXHRcdFx0XHRcdGNvbnN0IGF0dGFjaGVzID0gW107XG5cdFx0XHRcdFx0Xy5lYWNoKG1lc3NhZ2UuYXR0YWNobWVudHMsIGZ1bmN0aW9uIF9sb29wVGhyb3VnaE1lc3NhZ2VBdHRhY2htZW50cyhhKSB7XG5cdFx0XHRcdFx0XHRpZiAoYS5pbWFnZV91cmwpIHtcblx0XHRcdFx0XHRcdFx0YXR0YWNoZXMucHVzaChhLmltYWdlX3VybCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyBUT0RPOiBWZXJpZnkgb3RoZXIgdHlwZSBvZiBhdHRhY2htZW50cyB3aGljaCBuZWVkIHRvIGJlIGhhbmRsZWQgdGhhdCBhcmVuJ3QgZmlsZSB1cGxvYWRzIGFuZCBpbWFnZSB1cmxzXG5cdFx0XHRcdFx0XHQvLyB9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gXHRjb25zb2xlLmxvZyhhKTtcblx0XHRcdFx0XHRcdC8vIH1cblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdHJvd3MucHVzaChgJHsgbWVzc2FnZS5tc2cgfSAoJHsgYXR0YWNoZXMuam9pbignLCAnKSB9KWApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJvd3MucHVzaChtZXNzYWdlLm1zZyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cm93cy5wdXNoKGNsb3NldGQpO1xuXG5cdFx0XHRcdHJvd3MucHVzaChjbG9zZXRyKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAocm93cy5sZW5ndGggIT09IDApIHtcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gc3RhcnQgKyByb3dzLmpvaW4oJycpICsgZW5kO1xuXG5cdFx0XHRcdFJvY2tldENoYXQuc21hcnNoLkhpc3RvcnkudXBzZXJ0KHsgX2lkOiByb29tLl9pZCB9LCB7XG5cdFx0XHRcdFx0X2lkOiByb29tLl9pZCxcblx0XHRcdFx0XHRsYXN0UmFuOiBkYXRlLFxuXHRcdFx0XHRcdGxhc3RSZXN1bHQ6IHJlc3VsdCxcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Um9ja2V0Q2hhdC5zbWFyc2guc2VuZEVtYWlsKHtcblx0XHRcdFx0XHRib2R5OiByZXN1bHQsXG5cdFx0XHRcdFx0c3ViamVjdDogYFJvY2tldC5DaGF0LCAkeyBkYXRhLnVzZXJzLmxlbmd0aCB9IFVzZXJzLCAkeyBkYXRhLm1zZ3MgfSBNZXNzYWdlcywgJHsgZGF0YS5maWxlcy5sZW5ndGggfSBGaWxlcywgJHsgZGF0YS50aW1lIH0gTWludXRlcywgaW4gJHsgZGF0YS5yb29tIH1gLFxuXHRcdFx0XHRcdGZpbGVzOiBkYXRhLmZpbGVzLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG59O1xuIiwiLyogZ2xvYmFscyBTeW5jZWRDcm9uICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuY29uc3Qgc21hcnNoSm9iTmFtZSA9ICdTbWFyc2ggRU1MIENvbm5lY3Rvcic7XG5cbmNvbnN0IF9hZGRTbWFyc2hTeW5jZWRDcm9uSm9iID0gXy5kZWJvdW5jZShNZXRlb3IuYmluZEVudmlyb25tZW50KGZ1bmN0aW9uIF9fYWRkU21hcnNoU3luY2VkQ3JvbkpvYkRlYm91bmNlZCgpIHtcblx0aWYgKFN5bmNlZENyb24ubmV4dFNjaGVkdWxlZEF0RGF0ZShzbWFyc2hKb2JOYW1lKSkge1xuXHRcdFN5bmNlZENyb24ucmVtb3ZlKHNtYXJzaEpvYk5hbWUpO1xuXHR9XG5cblx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTbWFyc2hfRW5hYmxlZCcpICYmIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTbWFyc2hfRW1haWwnKSAhPT0gJycgJiYgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Zyb21fRW1haWwnKSAhPT0gJycpIHtcblx0XHRTeW5jZWRDcm9uLmFkZCh7XG5cdFx0XHRuYW1lOiBzbWFyc2hKb2JOYW1lLFxuXHRcdFx0c2NoZWR1bGU6IChwYXJzZXIpID0+IHBhcnNlci50ZXh0KFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTbWFyc2hfSW50ZXJ2YWwnKS5yZXBsYWNlKC9fL2csICcgJykpLFxuXHRcdFx0am9iOiBSb2NrZXRDaGF0LnNtYXJzaC5nZW5lcmF0ZUVtbCxcblx0XHR9KTtcblx0fVxufSksIDUwMCk7XG5cbk1ldGVvci5zdGFydHVwKCgpID0+IHtcblx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRfYWRkU21hcnNoU3luY2VkQ3JvbkpvYigpO1xuXG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NtYXJzaF9JbnRlcnZhbCcsIF9hZGRTbWFyc2hTeW5jZWRDcm9uSm9iKTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnU21hcnNoX0VuYWJsZWQnLCBfYWRkU21hcnNoU3luY2VkQ3JvbkpvYik7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NtYXJzaF9FbWFpbCcsIF9hZGRTbWFyc2hTeW5jZWRDcm9uSm9iKTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRnJvbV9FbWFpbCcsIF9hZGRTbWFyc2hTeW5jZWRDcm9uSm9iKTtcblx0fSk7XG59KTtcbiJdfQ==
