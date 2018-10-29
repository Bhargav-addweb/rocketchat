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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:videobridge":{"lib":{"messageType.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_videobridge/lib/messageType.js                                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
Meteor.startup(function () {
  RocketChat.MessageTypes.registerType({
    id: 'jitsi_call_started',
    system: true,
    message: TAPi18n.__('Started_a_video_call')
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"settings.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_videobridge/server/settings.js                                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
Meteor.startup(function () {
  RocketChat.settings.addGroup('Video Conference', function () {
    this.section('BigBlueButton', function () {
      this.add('bigbluebutton_Enabled', false, {
        type: 'boolean',
        i18nLabel: 'Enabled',
        alert: 'This Feature is currently in beta! Please report bugs to github.com/RocketChat/Rocket.Chat/issues',
        public: true
      });
      this.add('bigbluebutton_server', '', {
        type: 'string',
        i18nLabel: 'Domain',
        enableQuery: {
          _id: 'bigbluebutton_Enabled',
          value: true
        }
      });
      this.add('bigbluebutton_sharedSecret', '', {
        type: 'string',
        i18nLabel: 'Shared_Secret',
        enableQuery: {
          _id: 'bigbluebutton_Enabled',
          value: true
        }
      });
      this.add('bigbluebutton_enable_d', true, {
        type: 'boolean',
        i18nLabel: 'WebRTC_Enable_Direct',
        enableQuery: {
          _id: 'bigbluebutton_Enabled',
          value: true
        },
        public: true
      });
      this.add('bigbluebutton_enable_p', true, {
        type: 'boolean',
        i18nLabel: 'WebRTC_Enable_Private',
        enableQuery: {
          _id: 'bigbluebutton_Enabled',
          value: true
        },
        public: true
      });
      this.add('bigbluebutton_enable_c', false, {
        type: 'boolean',
        i18nLabel: 'WebRTC_Enable_Channel',
        enableQuery: {
          _id: 'bigbluebutton_Enabled',
          value: true
        },
        public: true
      });
    });
    this.section('Jitsi', function () {
      this.add('Jitsi_Enabled', false, {
        type: 'boolean',
        i18nLabel: 'Enabled',
        alert: 'This Feature is currently in beta! Please report bugs to github.com/RocketChat/Rocket.Chat/issues',
        public: true
      });
      this.add('Jitsi_Domain', 'meet.jit.si', {
        type: 'string',
        enableQuery: {
          _id: 'Jitsi_Enabled',
          value: true
        },
        i18nLabel: 'Domain',
        public: true
      });
      this.add('Jitsi_URL_Room_Prefix', 'RocketChat', {
        type: 'string',
        enableQuery: {
          _id: 'Jitsi_Enabled',
          value: true
        },
        i18nLabel: 'URL_room_prefix',
        public: true
      });
      this.add('Jitsi_SSL', true, {
        type: 'boolean',
        enableQuery: {
          _id: 'Jitsi_Enabled',
          value: true
        },
        i18nLabel: 'SSL',
        public: true
      });
      this.add('Jitsi_Open_New_Window', false, {
        type: 'boolean',
        enableQuery: {
          _id: 'Jitsi_Enabled',
          value: true
        },
        i18nLabel: 'Always_open_in_new_window',
        public: true
      });
      this.add('Jitsi_Enable_Channels', false, {
        type: 'boolean',
        enableQuery: {
          _id: 'Jitsi_Enabled',
          value: true
        },
        i18nLabel: 'Jitsi_Enable_Channels',
        public: true
      });
      this.add('Jitsi_Chrome_Extension', 'nocfbnnmjnndkbipkabodnheejiegccf', {
        type: 'string',
        enableQuery: {
          _id: 'Jitsi_Enabled',
          value: true
        },
        i18nLabel: 'Jitsi_Chrome_Extension',
        public: true
      });
    });
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"models":{"Rooms.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_videobridge/server/models/Rooms.js                                                           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/**
 * sets jitsiTimeout to indicate a call is in progress
 * @param {string} _id - Room id
 * @parm {number} time - time to set
 */
RocketChat.models.Rooms.setJitsiTimeout = function (_id, time) {
  const query = {
    _id
  };
  const update = {
    $set: {
      jitsiTimeout: time
    }
  };
  return this.update(query, update);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"jitsiSetTimeout.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_videobridge/server/methods/jitsiSetTimeout.js                                                //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
Meteor.methods({
  'jitsi:updateTimeout': rid => {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'jitsi:updateTimeout'
      });
    }

    const room = RocketChat.models.Rooms.findOneById(rid);
    const currentTime = new Date().getTime();
    const jitsiTimeout = new Date(room && room.jitsiTimeout || currentTime).getTime();

    if (jitsiTimeout <= currentTime) {
      RocketChat.models.Rooms.setJitsiTimeout(rid, new Date(currentTime + 35 * 1000));
      const message = RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('jitsi_call_started', rid, '', Meteor.user(), {
        actionLinks: [{
          icon: 'icon-videocam',
          label: TAPi18n.__('Click_to_join'),
          method_id: 'joinJitsiCall',
          params: ''
        }]
      });
      const room = RocketChat.models.Rooms.findOneById(rid);
      message.msg = TAPi18n.__('Started_a_video_call');
      message.mentions = [{
        _id: 'here',
        username: 'here'
      }];
      RocketChat.callbacks.run('afterSaveMessage', message, room);
    } else if ((jitsiTimeout - currentTime) / 1000 <= 15) {
      RocketChat.models.Rooms.setJitsiTimeout(rid, new Date(jitsiTimeout + 25 * 1000));
    }
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"bbb.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_videobridge/server/methods/bbb.js                                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let BigBlueButtonApi;
module.watch(require("meteor/rocketchat:bigbluebutton"), {
  default(v) {
    BigBlueButtonApi = v;
  }

}, 0);
let HTTP;
module.watch(require("meteor/http"), {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
let xml2js;
module.watch(require("xml2js"), {
  default(v) {
    xml2js = v;
  }

}, 2);
const parser = new xml2js.Parser({
  explicitRoot: true
});
const parseString = Meteor.wrapAsync(parser.parseString);

const getBBBAPI = () => {
  const url = RocketChat.settings.get('bigbluebutton_server');
  const secret = RocketChat.settings.get('bigbluebutton_sharedSecret');
  const api = new BigBlueButtonApi(`${url}/bigbluebutton/api`, secret);
  return {
    api,
    url
  };
};

Meteor.methods({
  bbbJoin({
    rid
  }) {
    if (!this.userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'bbbJoin'
      });
    }

    if (!Meteor.call('canAccessRoom', rid, this.userId)) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'bbbJoin'
      });
    }

    if (!RocketChat.settings.get('bigbluebutton_Enabled')) {
      throw new Meteor.Error('error-not-allowed', 'Not Allowed', {
        method: 'bbbJoin'
      });
    }

    const {
      api
    } = getBBBAPI();
    const meetingID = RocketChat.settings.get('uniqueID') + rid;
    const room = RocketChat.models.Rooms.findOneById(rid);
    const createUrl = api.urlFor('create', {
      name: room.t === 'd' ? 'Direct' : room.name,
      meetingID,
      attendeePW: 'ap',
      moderatorPW: 'mp',
      welcome: '<br>Welcome to <b>%%CONFNAME%%</b>!',
      meta_html5chat: false,
      meta_html5navbar: false,
      meta_html5autoswaplayout: true,
      meta_html5autosharewebcam: false,
      meta_html5hidepresentation: true
    });
    const createResult = HTTP.get(createUrl);
    const doc = parseString(createResult.content);

    if (doc.response.returncode[0]) {
      const user = RocketChat.models.Users.findOneById(this.userId);
      const hookApi = api.urlFor('hooks/create', {
        meetingID,
        callbackURL: Meteor.absoluteUrl(`api/v1/videoconference.bbb.update/${meetingID}`)
      });
      const hookResult = HTTP.get(hookApi);

      if (hookResult.statusCode !== 200) {
        // TODO improve error logging
        console.log({
          hookResult
        });
        return;
      }

      RocketChat.saveStreamingOptions(rid, {
        type: 'call'
      });
      return {
        url: api.urlFor('join', {
          password: 'mp',
          // mp if moderator ap if attendee
          meetingID,
          fullName: user.username,
          userID: user._id,
          joinViaHtml5: true,
          avatarURL: Meteor.absoluteUrl(`avatar/${user.username}`) // clientURL: `${ url }/html5client/join`,

        })
      };
    }
  },

  bbbEnd({
    rid
  }) {
    if (!this.userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'bbbEnd'
      });
    }

    if (!Meteor.call('canAccessRoom', rid, this.userId)) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'bbbEnd'
      });
    }

    if (!RocketChat.settings.get('bigbluebutton_Enabled')) {
      throw new Meteor.Error('error-not-allowed', 'Not Allowed', {
        method: 'bbbEnd'
      });
    }

    const {
      api
    } = getBBBAPI();
    const meetingID = RocketChat.settings.get('uniqueID') + rid;
    const endApi = api.urlFor('end', {
      meetingID,
      password: 'mp' // mp if moderator ap if attendee

    });
    const endApiResult = HTTP.get(endApi);

    if (endApiResult.statusCode !== 200) {
      // TODO improve error logging
      console.log({
        endApiResult
      });
      return;
    }

    const doc = parseString(endApiResult.content);

    if (doc.response.returncode[0] === 'FAILED') {
      RocketChat.saveStreamingOptions(rid, {});
    }
  }

});
RocketChat.API.v1.addRoute('videoconference.bbb.update/:id', {
  authRequired: false
}, {
  post() {
    // TODO check checksum
    const event = JSON.parse(this.bodyParams.event)[0];
    const eventType = event.data.id;
    const meetingID = event.data.attributes.meeting['external-meeting-id'];
    const rid = meetingID.replace(RocketChat.settings.get('uniqueID'), '');
    console.log(eventType, rid);

    if (eventType === 'meeting-ended') {
      RocketChat.saveStreamingOptions(rid, {});
    } // if (eventType === 'user-left') {
    // 	const { api } = getBBBAPI();
    // 	const getMeetingInfoApi = api.urlFor('getMeetingInfo', {
    // 		meetingID
    // 	});
    // 	const getMeetingInfoResult = HTTP.get(getMeetingInfoApi);
    // 	if (getMeetingInfoResult.statusCode !== 200) {
    // 		// TODO improve error logging
    // 		console.log({ getMeetingInfoResult });
    // 	}
    // 	const doc = parseString(getMeetingInfoResult.content);
    // 	if (doc.response.returncode[0]) {
    // 		const participantCount = parseInt(doc.response.participantCount[0]);
    // 		console.log(participantCount);
    // 	}
    // }

  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"actionLink.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_videobridge/server/actionLink.js                                                             //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
RocketChat.actionLinks.register('joinJitsiCall', function ()
/* message, params*/
{});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:videobridge/lib/messageType.js");
require("/node_modules/meteor/rocketchat:videobridge/server/settings.js");
require("/node_modules/meteor/rocketchat:videobridge/server/models/Rooms.js");
require("/node_modules/meteor/rocketchat:videobridge/server/methods/jitsiSetTimeout.js");
require("/node_modules/meteor/rocketchat:videobridge/server/methods/bbb.js");
require("/node_modules/meteor/rocketchat:videobridge/server/actionLink.js");

/* Exports */
Package._define("rocketchat:videobridge");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_videobridge.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp2aWRlb2JyaWRnZS9saWIvbWVzc2FnZVR5cGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6dmlkZW9icmlkZ2Uvc2VydmVyL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnZpZGVvYnJpZGdlL3NlcnZlci9tb2RlbHMvUm9vbXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6dmlkZW9icmlkZ2Uvc2VydmVyL21ldGhvZHMvaml0c2lTZXRUaW1lb3V0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnZpZGVvYnJpZGdlL3NlcnZlci9tZXRob2RzL2JiYi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp2aWRlb2JyaWRnZS9zZXJ2ZXIvYWN0aW9uTGluay5qcyJdLCJuYW1lcyI6WyJNZXRlb3IiLCJzdGFydHVwIiwiUm9ja2V0Q2hhdCIsIk1lc3NhZ2VUeXBlcyIsInJlZ2lzdGVyVHlwZSIsImlkIiwic3lzdGVtIiwibWVzc2FnZSIsIlRBUGkxOG4iLCJfXyIsInNldHRpbmdzIiwiYWRkR3JvdXAiLCJzZWN0aW9uIiwiYWRkIiwidHlwZSIsImkxOG5MYWJlbCIsImFsZXJ0IiwicHVibGljIiwiZW5hYmxlUXVlcnkiLCJfaWQiLCJ2YWx1ZSIsIm1vZGVscyIsIlJvb21zIiwic2V0Sml0c2lUaW1lb3V0IiwidGltZSIsInF1ZXJ5IiwidXBkYXRlIiwiJHNldCIsImppdHNpVGltZW91dCIsIm1ldGhvZHMiLCJyaWQiLCJ1c2VySWQiLCJFcnJvciIsIm1ldGhvZCIsInJvb20iLCJmaW5kT25lQnlJZCIsImN1cnJlbnRUaW1lIiwiRGF0ZSIsImdldFRpbWUiLCJNZXNzYWdlcyIsImNyZWF0ZVdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIiLCJ1c2VyIiwiYWN0aW9uTGlua3MiLCJpY29uIiwibGFiZWwiLCJtZXRob2RfaWQiLCJwYXJhbXMiLCJtc2ciLCJtZW50aW9ucyIsInVzZXJuYW1lIiwiY2FsbGJhY2tzIiwicnVuIiwiQmlnQmx1ZUJ1dHRvbkFwaSIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiSFRUUCIsInhtbDJqcyIsInBhcnNlciIsIlBhcnNlciIsImV4cGxpY2l0Um9vdCIsInBhcnNlU3RyaW5nIiwid3JhcEFzeW5jIiwiZ2V0QkJCQVBJIiwidXJsIiwiZ2V0Iiwic2VjcmV0IiwiYXBpIiwiYmJiSm9pbiIsImNhbGwiLCJtZWV0aW5nSUQiLCJjcmVhdGVVcmwiLCJ1cmxGb3IiLCJuYW1lIiwidCIsImF0dGVuZGVlUFciLCJtb2RlcmF0b3JQVyIsIndlbGNvbWUiLCJtZXRhX2h0bWw1Y2hhdCIsIm1ldGFfaHRtbDVuYXZiYXIiLCJtZXRhX2h0bWw1YXV0b3N3YXBsYXlvdXQiLCJtZXRhX2h0bWw1YXV0b3NoYXJld2ViY2FtIiwibWV0YV9odG1sNWhpZGVwcmVzZW50YXRpb24iLCJjcmVhdGVSZXN1bHQiLCJkb2MiLCJjb250ZW50IiwicmVzcG9uc2UiLCJyZXR1cm5jb2RlIiwiVXNlcnMiLCJob29rQXBpIiwiY2FsbGJhY2tVUkwiLCJhYnNvbHV0ZVVybCIsImhvb2tSZXN1bHQiLCJzdGF0dXNDb2RlIiwiY29uc29sZSIsImxvZyIsInNhdmVTdHJlYW1pbmdPcHRpb25zIiwicGFzc3dvcmQiLCJmdWxsTmFtZSIsInVzZXJJRCIsImpvaW5WaWFIdG1sNSIsImF2YXRhclVSTCIsImJiYkVuZCIsImVuZEFwaSIsImVuZEFwaVJlc3VsdCIsIkFQSSIsInYxIiwiYWRkUm91dGUiLCJhdXRoUmVxdWlyZWQiLCJwb3N0IiwiZXZlbnQiLCJKU09OIiwicGFyc2UiLCJib2R5UGFyYW1zIiwiZXZlbnRUeXBlIiwiZGF0YSIsImF0dHJpYnV0ZXMiLCJtZWV0aW5nIiwicmVwbGFjZSIsInJlZ2lzdGVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLE9BQVAsQ0FBZSxZQUFXO0FBQ3pCQyxhQUFXQyxZQUFYLENBQXdCQyxZQUF4QixDQUFxQztBQUNwQ0MsUUFBSSxvQkFEZ0M7QUFFcENDLFlBQVEsSUFGNEI7QUFHcENDLGFBQVNDLFFBQVFDLEVBQVIsQ0FBVyxzQkFBWDtBQUgyQixHQUFyQztBQUtBLENBTkQsRTs7Ozs7Ozs7Ozs7QUNBQVQsT0FBT0MsT0FBUCxDQUFlLFlBQVc7QUFDekJDLGFBQVdRLFFBQVgsQ0FBb0JDLFFBQXBCLENBQTZCLGtCQUE3QixFQUFpRCxZQUFXO0FBRTNELFNBQUtDLE9BQUwsQ0FBYSxlQUFiLEVBQThCLFlBQVc7QUFFeEMsV0FBS0MsR0FBTCxDQUFTLHVCQUFULEVBQWtDLEtBQWxDLEVBQXlDO0FBQ3hDQyxjQUFNLFNBRGtDO0FBRXhDQyxtQkFBVyxTQUY2QjtBQUd4Q0MsZUFBTyxtR0FIaUM7QUFJeENDLGdCQUFRO0FBSmdDLE9BQXpDO0FBT0EsV0FBS0osR0FBTCxDQUFTLHNCQUFULEVBQWlDLEVBQWpDLEVBQXFDO0FBQ3BDQyxjQUFNLFFBRDhCO0FBRXBDQyxtQkFBVyxRQUZ5QjtBQUdwQ0cscUJBQWE7QUFDWkMsZUFBSyx1QkFETztBQUVaQyxpQkFBTztBQUZLO0FBSHVCLE9BQXJDO0FBU0EsV0FBS1AsR0FBTCxDQUFTLDRCQUFULEVBQXVDLEVBQXZDLEVBQTJDO0FBQzFDQyxjQUFNLFFBRG9DO0FBRTFDQyxtQkFBVyxlQUYrQjtBQUcxQ0cscUJBQWE7QUFDWkMsZUFBSyx1QkFETztBQUVaQyxpQkFBTztBQUZLO0FBSDZCLE9BQTNDO0FBU0EsV0FBS1AsR0FBTCxDQUFTLHdCQUFULEVBQW1DLElBQW5DLEVBQXlDO0FBQ3hDQyxjQUFNLFNBRGtDO0FBRXhDQyxtQkFBVyxzQkFGNkI7QUFHeENHLHFCQUFhO0FBQ1pDLGVBQUssdUJBRE87QUFFWkMsaUJBQU87QUFGSyxTQUgyQjtBQU94Q0gsZ0JBQVE7QUFQZ0MsT0FBekM7QUFVQSxXQUFLSixHQUFMLENBQVMsd0JBQVQsRUFBbUMsSUFBbkMsRUFBeUM7QUFDeENDLGNBQU0sU0FEa0M7QUFFeENDLG1CQUFXLHVCQUY2QjtBQUd4Q0cscUJBQWE7QUFDWkMsZUFBSyx1QkFETztBQUVaQyxpQkFBTztBQUZLLFNBSDJCO0FBT3hDSCxnQkFBUTtBQVBnQyxPQUF6QztBQVVBLFdBQUtKLEdBQUwsQ0FBUyx3QkFBVCxFQUFtQyxLQUFuQyxFQUEwQztBQUN6Q0MsY0FBTSxTQURtQztBQUV6Q0MsbUJBQVcsdUJBRjhCO0FBR3pDRyxxQkFBYTtBQUNaQyxlQUFLLHVCQURPO0FBRVpDLGlCQUFPO0FBRkssU0FINEI7QUFPekNILGdCQUFRO0FBUGlDLE9BQTFDO0FBVUEsS0F6REQ7QUEyREEsU0FBS0wsT0FBTCxDQUFhLE9BQWIsRUFBc0IsWUFBVztBQUNoQyxXQUFLQyxHQUFMLENBQVMsZUFBVCxFQUEwQixLQUExQixFQUFpQztBQUNoQ0MsY0FBTSxTQUQwQjtBQUVoQ0MsbUJBQVcsU0FGcUI7QUFHaENDLGVBQU8sbUdBSHlCO0FBSWhDQyxnQkFBUTtBQUp3QixPQUFqQztBQU9BLFdBQUtKLEdBQUwsQ0FBUyxjQUFULEVBQXlCLGFBQXpCLEVBQXdDO0FBQ3ZDQyxjQUFNLFFBRGlDO0FBRXZDSSxxQkFBYTtBQUNaQyxlQUFLLGVBRE87QUFFWkMsaUJBQU87QUFGSyxTQUYwQjtBQU12Q0wsbUJBQVcsUUFONEI7QUFPdkNFLGdCQUFRO0FBUCtCLE9BQXhDO0FBVUEsV0FBS0osR0FBTCxDQUFTLHVCQUFULEVBQWtDLFlBQWxDLEVBQWdEO0FBQy9DQyxjQUFNLFFBRHlDO0FBRS9DSSxxQkFBYTtBQUNaQyxlQUFLLGVBRE87QUFFWkMsaUJBQU87QUFGSyxTQUZrQztBQU0vQ0wsbUJBQVcsaUJBTm9DO0FBTy9DRSxnQkFBUTtBQVB1QyxPQUFoRDtBQVVBLFdBQUtKLEdBQUwsQ0FBUyxXQUFULEVBQXNCLElBQXRCLEVBQTRCO0FBQzNCQyxjQUFNLFNBRHFCO0FBRTNCSSxxQkFBYTtBQUNaQyxlQUFLLGVBRE87QUFFWkMsaUJBQU87QUFGSyxTQUZjO0FBTTNCTCxtQkFBVyxLQU5nQjtBQU8zQkUsZ0JBQVE7QUFQbUIsT0FBNUI7QUFVQSxXQUFLSixHQUFMLENBQVMsdUJBQVQsRUFBa0MsS0FBbEMsRUFBeUM7QUFDeENDLGNBQU0sU0FEa0M7QUFFeENJLHFCQUFhO0FBQ1pDLGVBQUssZUFETztBQUVaQyxpQkFBTztBQUZLLFNBRjJCO0FBTXhDTCxtQkFBVywyQkFONkI7QUFPeENFLGdCQUFRO0FBUGdDLE9BQXpDO0FBVUEsV0FBS0osR0FBTCxDQUFTLHVCQUFULEVBQWtDLEtBQWxDLEVBQXlDO0FBQ3hDQyxjQUFNLFNBRGtDO0FBRXhDSSxxQkFBYTtBQUNaQyxlQUFLLGVBRE87QUFFWkMsaUJBQU87QUFGSyxTQUYyQjtBQU14Q0wsbUJBQVcsdUJBTjZCO0FBT3hDRSxnQkFBUTtBQVBnQyxPQUF6QztBQVVBLFdBQUtKLEdBQUwsQ0FBUyx3QkFBVCxFQUFtQyxrQ0FBbkMsRUFBdUU7QUFDdEVDLGNBQU0sUUFEZ0U7QUFFdEVJLHFCQUFhO0FBQ1pDLGVBQUssZUFETztBQUVaQyxpQkFBTztBQUZLLFNBRnlEO0FBTXRFTCxtQkFBVyx3QkFOMkQ7QUFPdEVFLGdCQUFRO0FBUDhELE9BQXZFO0FBU0EsS0FuRUQ7QUFvRUEsR0FqSUQ7QUFrSUEsQ0FuSUQsRTs7Ozs7Ozs7Ozs7QUNBQTs7Ozs7QUFLQWYsV0FBV21CLE1BQVgsQ0FBa0JDLEtBQWxCLENBQXdCQyxlQUF4QixHQUEwQyxVQUFTSixHQUFULEVBQWNLLElBQWQsRUFBb0I7QUFDN0QsUUFBTUMsUUFBUTtBQUNiTjtBQURhLEdBQWQ7QUFJQSxRQUFNTyxTQUFTO0FBQ2RDLFVBQU07QUFDTEMsb0JBQWNKO0FBRFQ7QUFEUSxHQUFmO0FBTUEsU0FBTyxLQUFLRSxNQUFMLENBQVlELEtBQVosRUFBbUJDLE1BQW5CLENBQVA7QUFDQSxDQVpELEM7Ozs7Ozs7Ozs7O0FDTEExQixPQUFPNkIsT0FBUCxDQUFlO0FBQ2QseUJBQXdCQyxHQUFELElBQVM7QUFFL0IsUUFBSSxDQUFDOUIsT0FBTytCLE1BQVAsRUFBTCxFQUFzQjtBQUNyQixZQUFNLElBQUkvQixPQUFPZ0MsS0FBWCxDQUFpQixvQkFBakIsRUFBdUMsY0FBdkMsRUFBdUQ7QUFBRUMsZ0JBQVE7QUFBVixPQUF2RCxDQUFOO0FBQ0E7O0FBRUQsVUFBTUMsT0FBT2hDLFdBQVdtQixNQUFYLENBQWtCQyxLQUFsQixDQUF3QmEsV0FBeEIsQ0FBb0NMLEdBQXBDLENBQWI7QUFDQSxVQUFNTSxjQUFjLElBQUlDLElBQUosR0FBV0MsT0FBWCxFQUFwQjtBQUVBLFVBQU1WLGVBQWUsSUFBSVMsSUFBSixDQUFVSCxRQUFRQSxLQUFLTixZQUFkLElBQStCUSxXQUF4QyxFQUFxREUsT0FBckQsRUFBckI7O0FBRUEsUUFBSVYsZ0JBQWdCUSxXQUFwQixFQUFpQztBQUNoQ2xDLGlCQUFXbUIsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0JDLGVBQXhCLENBQXdDTyxHQUF4QyxFQUE2QyxJQUFJTyxJQUFKLENBQVNELGNBQWMsS0FBSyxJQUE1QixDQUE3QztBQUNBLFlBQU03QixVQUFVTCxXQUFXbUIsTUFBWCxDQUFrQmtCLFFBQWxCLENBQTJCQyxrQ0FBM0IsQ0FBOEQsb0JBQTlELEVBQW9GVixHQUFwRixFQUF5RixFQUF6RixFQUE2RjlCLE9BQU95QyxJQUFQLEVBQTdGLEVBQTRHO0FBQzNIQyxxQkFBYyxDQUNiO0FBQUVDLGdCQUFNLGVBQVI7QUFBeUJDLGlCQUFPcEMsUUFBUUMsRUFBUixDQUFXLGVBQVgsQ0FBaEM7QUFBNkRvQyxxQkFBVyxlQUF4RTtBQUF5RkMsa0JBQVE7QUFBakcsU0FEYTtBQUQ2RyxPQUE1RyxDQUFoQjtBQUtBLFlBQU1aLE9BQU9oQyxXQUFXbUIsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0JhLFdBQXhCLENBQW9DTCxHQUFwQyxDQUFiO0FBQ0F2QixjQUFRd0MsR0FBUixHQUFjdkMsUUFBUUMsRUFBUixDQUFXLHNCQUFYLENBQWQ7QUFDQUYsY0FBUXlDLFFBQVIsR0FBbUIsQ0FDbEI7QUFDQzdCLGFBQUksTUFETDtBQUVDOEIsa0JBQVM7QUFGVixPQURrQixDQUFuQjtBQU1BL0MsaUJBQVdnRCxTQUFYLENBQXFCQyxHQUFyQixDQUF5QixrQkFBekIsRUFBNkM1QyxPQUE3QyxFQUFzRDJCLElBQXREO0FBQ0EsS0FoQkQsTUFnQk8sSUFBSSxDQUFDTixlQUFlUSxXQUFoQixJQUErQixJQUEvQixJQUF1QyxFQUEzQyxFQUErQztBQUNyRGxDLGlCQUFXbUIsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0JDLGVBQXhCLENBQXdDTyxHQUF4QyxFQUE2QyxJQUFJTyxJQUFKLENBQVNULGVBQWUsS0FBSyxJQUE3QixDQUE3QztBQUNBO0FBQ0Q7QUEvQmEsQ0FBZixFOzs7Ozs7Ozs7OztBQ0FBLElBQUl3QixnQkFBSjtBQUFxQkMsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLGlDQUFSLENBQWIsRUFBd0Q7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLHVCQUFpQkssQ0FBakI7QUFBbUI7O0FBQS9CLENBQXhELEVBQXlGLENBQXpGO0FBQTRGLElBQUlDLElBQUo7QUFBU0wsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLGFBQVIsQ0FBYixFQUFvQztBQUFDRyxPQUFLRCxDQUFMLEVBQU87QUFBQ0MsV0FBS0QsQ0FBTDtBQUFPOztBQUFoQixDQUFwQyxFQUFzRCxDQUF0RDtBQUF5RCxJQUFJRSxNQUFKO0FBQVdOLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxRQUFSLENBQWIsRUFBK0I7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNFLGFBQU9GLENBQVA7QUFBUzs7QUFBckIsQ0FBL0IsRUFBc0QsQ0FBdEQ7QUFJOUwsTUFBTUcsU0FBUyxJQUFJRCxPQUFPRSxNQUFYLENBQWtCO0FBQ2hDQyxnQkFBYztBQURrQixDQUFsQixDQUFmO0FBSUEsTUFBTUMsY0FBYy9ELE9BQU9nRSxTQUFQLENBQWlCSixPQUFPRyxXQUF4QixDQUFwQjs7QUFFQSxNQUFNRSxZQUFZLE1BQU07QUFDdkIsUUFBTUMsTUFBTWhFLFdBQVdRLFFBQVgsQ0FBb0J5RCxHQUFwQixDQUF3QixzQkFBeEIsQ0FBWjtBQUNBLFFBQU1DLFNBQVNsRSxXQUFXUSxRQUFYLENBQW9CeUQsR0FBcEIsQ0FBd0IsNEJBQXhCLENBQWY7QUFDQSxRQUFNRSxNQUFNLElBQUlqQixnQkFBSixDQUFzQixHQUFHYyxHQUFLLG9CQUE5QixFQUFtREUsTUFBbkQsQ0FBWjtBQUNBLFNBQU87QUFBRUMsT0FBRjtBQUFPSDtBQUFQLEdBQVA7QUFDQSxDQUxEOztBQU9BbEUsT0FBTzZCLE9BQVAsQ0FBZTtBQUNkeUMsVUFBUTtBQUFFeEM7QUFBRixHQUFSLEVBQWlCO0FBRWhCLFFBQUksQ0FBQyxLQUFLQyxNQUFWLEVBQWtCO0FBQ2pCLFlBQU0sSUFBSS9CLE9BQU9nQyxLQUFYLENBQWlCLG9CQUFqQixFQUF1QyxjQUF2QyxFQUF1RDtBQUFFQyxnQkFBUTtBQUFWLE9BQXZELENBQU47QUFDQTs7QUFFRCxRQUFJLENBQUNqQyxPQUFPdUUsSUFBUCxDQUFZLGVBQVosRUFBNkJ6QyxHQUE3QixFQUFrQyxLQUFLQyxNQUF2QyxDQUFMLEVBQXFEO0FBQ3BELFlBQU0sSUFBSS9CLE9BQU9nQyxLQUFYLENBQWlCLG9CQUFqQixFQUF1QyxjQUF2QyxFQUF1RDtBQUFFQyxnQkFBUTtBQUFWLE9BQXZELENBQU47QUFDQTs7QUFFRCxRQUFJLENBQUMvQixXQUFXUSxRQUFYLENBQW9CeUQsR0FBcEIsQ0FBd0IsdUJBQXhCLENBQUwsRUFBdUQ7QUFDdEQsWUFBTSxJQUFJbkUsT0FBT2dDLEtBQVgsQ0FBaUIsbUJBQWpCLEVBQXNDLGFBQXRDLEVBQXFEO0FBQUVDLGdCQUFRO0FBQVYsT0FBckQsQ0FBTjtBQUNBOztBQUVELFVBQU07QUFBRW9DO0FBQUYsUUFBVUosV0FBaEI7QUFDQSxVQUFNTyxZQUFZdEUsV0FBV1EsUUFBWCxDQUFvQnlELEdBQXBCLENBQXdCLFVBQXhCLElBQXNDckMsR0FBeEQ7QUFDQSxVQUFNSSxPQUFPaEMsV0FBV21CLE1BQVgsQ0FBa0JDLEtBQWxCLENBQXdCYSxXQUF4QixDQUFvQ0wsR0FBcEMsQ0FBYjtBQUNBLFVBQU0yQyxZQUFZSixJQUFJSyxNQUFKLENBQVcsUUFBWCxFQUFxQjtBQUN0Q0MsWUFBTXpDLEtBQUswQyxDQUFMLEtBQVcsR0FBWCxHQUFpQixRQUFqQixHQUE0QjFDLEtBQUt5QyxJQUREO0FBRXRDSCxlQUZzQztBQUd0Q0ssa0JBQVksSUFIMEI7QUFJdENDLG1CQUFhLElBSnlCO0FBS3RDQyxlQUFTLHFDQUw2QjtBQU10Q0Msc0JBQWdCLEtBTnNCO0FBT3RDQyx3QkFBa0IsS0FQb0I7QUFRdENDLGdDQUEwQixJQVJZO0FBU3RDQyxpQ0FBMkIsS0FUVztBQVV0Q0Msa0NBQTRCO0FBVlUsS0FBckIsQ0FBbEI7QUFhQSxVQUFNQyxlQUFlM0IsS0FBS1MsR0FBTCxDQUFTTSxTQUFULENBQXJCO0FBQ0EsVUFBTWEsTUFBTXZCLFlBQVlzQixhQUFhRSxPQUF6QixDQUFaOztBQUVBLFFBQUlELElBQUlFLFFBQUosQ0FBYUMsVUFBYixDQUF3QixDQUF4QixDQUFKLEVBQWdDO0FBQy9CLFlBQU1oRCxPQUFPdkMsV0FBV21CLE1BQVgsQ0FBa0JxRSxLQUFsQixDQUF3QnZELFdBQXhCLENBQW9DLEtBQUtKLE1BQXpDLENBQWI7QUFFQSxZQUFNNEQsVUFBVXRCLElBQUlLLE1BQUosQ0FBVyxjQUFYLEVBQTJCO0FBQzFDRixpQkFEMEM7QUFFMUNvQixxQkFBYTVGLE9BQU82RixXQUFQLENBQW9CLHFDQUFxQ3JCLFNBQVcsRUFBcEU7QUFGNkIsT0FBM0IsQ0FBaEI7QUFLQSxZQUFNc0IsYUFBYXBDLEtBQUtTLEdBQUwsQ0FBU3dCLE9BQVQsQ0FBbkI7O0FBRUEsVUFBSUcsV0FBV0MsVUFBWCxLQUEwQixHQUE5QixFQUFtQztBQUNsQztBQUNBQyxnQkFBUUMsR0FBUixDQUFZO0FBQUVIO0FBQUYsU0FBWjtBQUNBO0FBQ0E7O0FBRUQ1RixpQkFBV2dHLG9CQUFYLENBQWdDcEUsR0FBaEMsRUFBcUM7QUFDcENoQixjQUFNO0FBRDhCLE9BQXJDO0FBSUEsYUFBTztBQUNOb0QsYUFBS0csSUFBSUssTUFBSixDQUFXLE1BQVgsRUFBbUI7QUFDdkJ5QixvQkFBVSxJQURhO0FBQ1A7QUFDaEIzQixtQkFGdUI7QUFHdkI0QixvQkFBVTNELEtBQUtRLFFBSFE7QUFJdkJvRCxrQkFBUTVELEtBQUt0QixHQUpVO0FBS3ZCbUYsd0JBQWMsSUFMUztBQU12QkMscUJBQVd2RyxPQUFPNkYsV0FBUCxDQUFvQixVQUFVcEQsS0FBS1EsUUFBVSxFQUE3QyxDQU5ZLENBT3ZCOztBQVB1QixTQUFuQjtBQURDLE9BQVA7QUFXQTtBQUNELEdBbEVhOztBQW9FZHVELFNBQU87QUFBRTFFO0FBQUYsR0FBUCxFQUFnQjtBQUNmLFFBQUksQ0FBQyxLQUFLQyxNQUFWLEVBQWtCO0FBQ2pCLFlBQU0sSUFBSS9CLE9BQU9nQyxLQUFYLENBQWlCLG9CQUFqQixFQUF1QyxjQUF2QyxFQUF1RDtBQUFFQyxnQkFBUTtBQUFWLE9BQXZELENBQU47QUFDQTs7QUFFRCxRQUFJLENBQUNqQyxPQUFPdUUsSUFBUCxDQUFZLGVBQVosRUFBNkJ6QyxHQUE3QixFQUFrQyxLQUFLQyxNQUF2QyxDQUFMLEVBQXFEO0FBQ3BELFlBQU0sSUFBSS9CLE9BQU9nQyxLQUFYLENBQWlCLG9CQUFqQixFQUF1QyxjQUF2QyxFQUF1RDtBQUFFQyxnQkFBUTtBQUFWLE9BQXZELENBQU47QUFDQTs7QUFFRCxRQUFJLENBQUMvQixXQUFXUSxRQUFYLENBQW9CeUQsR0FBcEIsQ0FBd0IsdUJBQXhCLENBQUwsRUFBdUQ7QUFDdEQsWUFBTSxJQUFJbkUsT0FBT2dDLEtBQVgsQ0FBaUIsbUJBQWpCLEVBQXNDLGFBQXRDLEVBQXFEO0FBQUVDLGdCQUFRO0FBQVYsT0FBckQsQ0FBTjtBQUNBOztBQUVELFVBQU07QUFBRW9DO0FBQUYsUUFBVUosV0FBaEI7QUFDQSxVQUFNTyxZQUFZdEUsV0FBV1EsUUFBWCxDQUFvQnlELEdBQXBCLENBQXdCLFVBQXhCLElBQXNDckMsR0FBeEQ7QUFDQSxVQUFNMkUsU0FBU3BDLElBQUlLLE1BQUosQ0FBVyxLQUFYLEVBQWtCO0FBQ2hDRixlQURnQztBQUVoQzJCLGdCQUFVLElBRnNCLENBRWhCOztBQUZnQixLQUFsQixDQUFmO0FBS0EsVUFBTU8sZUFBZWhELEtBQUtTLEdBQUwsQ0FBU3NDLE1BQVQsQ0FBckI7O0FBRUEsUUFBSUMsYUFBYVgsVUFBYixLQUE0QixHQUFoQyxFQUFxQztBQUNwQztBQUNBQyxjQUFRQyxHQUFSLENBQVk7QUFBRVM7QUFBRixPQUFaO0FBQ0E7QUFDQTs7QUFFRCxVQUFNcEIsTUFBTXZCLFlBQVkyQyxhQUFhbkIsT0FBekIsQ0FBWjs7QUFFQSxRQUFJRCxJQUFJRSxRQUFKLENBQWFDLFVBQWIsQ0FBd0IsQ0FBeEIsTUFBK0IsUUFBbkMsRUFBNkM7QUFDNUN2RixpQkFBV2dHLG9CQUFYLENBQWdDcEUsR0FBaEMsRUFBcUMsRUFBckM7QUFDQTtBQUNEOztBQXJHYSxDQUFmO0FBd0dBNUIsV0FBV3lHLEdBQVgsQ0FBZUMsRUFBZixDQUFrQkMsUUFBbEIsQ0FBMkIsZ0NBQTNCLEVBQTZEO0FBQUVDLGdCQUFjO0FBQWhCLENBQTdELEVBQXNGO0FBQ3JGQyxTQUFPO0FBQ047QUFDQSxVQUFNQyxRQUFRQyxLQUFLQyxLQUFMLENBQVcsS0FBS0MsVUFBTCxDQUFnQkgsS0FBM0IsRUFBa0MsQ0FBbEMsQ0FBZDtBQUNBLFVBQU1JLFlBQVlKLE1BQU1LLElBQU4sQ0FBV2hILEVBQTdCO0FBQ0EsVUFBTW1FLFlBQVl3QyxNQUFNSyxJQUFOLENBQVdDLFVBQVgsQ0FBc0JDLE9BQXRCLENBQThCLHFCQUE5QixDQUFsQjtBQUNBLFVBQU16RixNQUFNMEMsVUFBVWdELE9BQVYsQ0FBa0J0SCxXQUFXUSxRQUFYLENBQW9CeUQsR0FBcEIsQ0FBd0IsVUFBeEIsQ0FBbEIsRUFBdUQsRUFBdkQsQ0FBWjtBQUVBNkIsWUFBUUMsR0FBUixDQUFZbUIsU0FBWixFQUF1QnRGLEdBQXZCOztBQUVBLFFBQUlzRixjQUFjLGVBQWxCLEVBQW1DO0FBQ2xDbEgsaUJBQVdnRyxvQkFBWCxDQUFnQ3BFLEdBQWhDLEVBQXFDLEVBQXJDO0FBQ0EsS0FYSyxDQWFOO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFFQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOztBQW5Db0YsQ0FBdEYsRTs7Ozs7Ozs7Ozs7QUN6SEE1QixXQUFXd0MsV0FBWCxDQUF1QitFLFFBQXZCLENBQWdDLGVBQWhDLEVBQWlEO0FBQVM7QUFBc0IsQ0FFL0UsQ0FGRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X3ZpZGVvYnJpZGdlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdFJvY2tldENoYXQuTWVzc2FnZVR5cGVzLnJlZ2lzdGVyVHlwZSh7XG5cdFx0aWQ6ICdqaXRzaV9jYWxsX3N0YXJ0ZWQnLFxuXHRcdHN5c3RlbTogdHJ1ZSxcblx0XHRtZXNzYWdlOiBUQVBpMThuLl9fKCdTdGFydGVkX2FfdmlkZW9fY2FsbCcpLFxuXHR9KTtcbn0pO1xuIiwiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkR3JvdXAoJ1ZpZGVvIENvbmZlcmVuY2UnLCBmdW5jdGlvbigpIHtcblxuXHRcdHRoaXMuc2VjdGlvbignQmlnQmx1ZUJ1dHRvbicsIGZ1bmN0aW9uKCkge1xuXG5cdFx0XHR0aGlzLmFkZCgnYmlnYmx1ZWJ1dHRvbl9FbmFibGVkJywgZmFsc2UsIHtcblx0XHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0XHRpMThuTGFiZWw6ICdFbmFibGVkJyxcblx0XHRcdFx0YWxlcnQ6ICdUaGlzIEZlYXR1cmUgaXMgY3VycmVudGx5IGluIGJldGEhIFBsZWFzZSByZXBvcnQgYnVncyB0byBnaXRodWIuY29tL1JvY2tldENoYXQvUm9ja2V0LkNoYXQvaXNzdWVzJyxcblx0XHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuYWRkKCdiaWdibHVlYnV0dG9uX3NlcnZlcicsICcnLCB7XG5cdFx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0XHRpMThuTGFiZWw6ICdEb21haW4nLFxuXHRcdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRcdF9pZDogJ2JpZ2JsdWVidXR0b25fRW5hYmxlZCcsXG5cdFx0XHRcdFx0dmFsdWU6IHRydWUsXG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5hZGQoJ2JpZ2JsdWVidXR0b25fc2hhcmVkU2VjcmV0JywgJycsIHtcblx0XHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRcdGkxOG5MYWJlbDogJ1NoYXJlZF9TZWNyZXQnLFxuXHRcdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRcdF9pZDogJ2JpZ2JsdWVidXR0b25fRW5hYmxlZCcsXG5cdFx0XHRcdFx0dmFsdWU6IHRydWUsXG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5hZGQoJ2JpZ2JsdWVidXR0b25fZW5hYmxlX2QnLCB0cnVlLCB7XG5cdFx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdFx0aTE4bkxhYmVsOiAnV2ViUlRDX0VuYWJsZV9EaXJlY3QnLFxuXHRcdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRcdF9pZDogJ2JpZ2JsdWVidXR0b25fRW5hYmxlZCcsXG5cdFx0XHRcdFx0dmFsdWU6IHRydWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmFkZCgnYmlnYmx1ZWJ1dHRvbl9lbmFibGVfcCcsIHRydWUsIHtcblx0XHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0XHRpMThuTGFiZWw6ICdXZWJSVENfRW5hYmxlX1ByaXZhdGUnLFxuXHRcdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRcdF9pZDogJ2JpZ2JsdWVidXR0b25fRW5hYmxlZCcsXG5cdFx0XHRcdFx0dmFsdWU6IHRydWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmFkZCgnYmlnYmx1ZWJ1dHRvbl9lbmFibGVfYycsIGZhbHNlLCB7XG5cdFx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdFx0aTE4bkxhYmVsOiAnV2ViUlRDX0VuYWJsZV9DaGFubmVsJyxcblx0XHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0XHRfaWQ6ICdiaWdibHVlYnV0dG9uX0VuYWJsZWQnLFxuXHRcdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0XHR9KTtcblxuXHRcdH0pO1xuXG5cdFx0dGhpcy5zZWN0aW9uKCdKaXRzaScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5hZGQoJ0ppdHNpX0VuYWJsZWQnLCBmYWxzZSwge1xuXHRcdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRcdGkxOG5MYWJlbDogJ0VuYWJsZWQnLFxuXHRcdFx0XHRhbGVydDogJ1RoaXMgRmVhdHVyZSBpcyBjdXJyZW50bHkgaW4gYmV0YSEgUGxlYXNlIHJlcG9ydCBidWdzIHRvIGdpdGh1Yi5jb20vUm9ja2V0Q2hhdC9Sb2NrZXQuQ2hhdC9pc3N1ZXMnLFxuXHRcdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5hZGQoJ0ppdHNpX0RvbWFpbicsICdtZWV0LmppdC5zaScsIHtcblx0XHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdFx0X2lkOiAnSml0c2lfRW5hYmxlZCcsXG5cdFx0XHRcdFx0dmFsdWU6IHRydWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGkxOG5MYWJlbDogJ0RvbWFpbicsXG5cdFx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmFkZCgnSml0c2lfVVJMX1Jvb21fUHJlZml4JywgJ1JvY2tldENoYXQnLCB7XG5cdFx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRcdF9pZDogJ0ppdHNpX0VuYWJsZWQnLFxuXHRcdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpMThuTGFiZWw6ICdVUkxfcm9vbV9wcmVmaXgnLFxuXHRcdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5hZGQoJ0ppdHNpX1NTTCcsIHRydWUsIHtcblx0XHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRcdF9pZDogJ0ppdHNpX0VuYWJsZWQnLFxuXHRcdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpMThuTGFiZWw6ICdTU0wnLFxuXHRcdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5hZGQoJ0ppdHNpX09wZW5fTmV3X1dpbmRvdycsIGZhbHNlLCB7XG5cdFx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0XHRfaWQ6ICdKaXRzaV9FbmFibGVkJyxcblx0XHRcdFx0XHR2YWx1ZTogdHJ1ZSxcblx0XHRcdFx0fSxcblx0XHRcdFx0aTE4bkxhYmVsOiAnQWx3YXlzX29wZW5faW5fbmV3X3dpbmRvdycsXG5cdFx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmFkZCgnSml0c2lfRW5hYmxlX0NoYW5uZWxzJywgZmFsc2UsIHtcblx0XHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRcdF9pZDogJ0ppdHNpX0VuYWJsZWQnLFxuXHRcdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpMThuTGFiZWw6ICdKaXRzaV9FbmFibGVfQ2hhbm5lbHMnLFxuXHRcdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5hZGQoJ0ppdHNpX0Nocm9tZV9FeHRlbnNpb24nLCAnbm9jZmJubm1qbm5ka2JpcGthYm9kbmhlZWppZWdjY2YnLCB7XG5cdFx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRcdF9pZDogJ0ppdHNpX0VuYWJsZWQnLFxuXHRcdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpMThuTGFiZWw6ICdKaXRzaV9DaHJvbWVfRXh0ZW5zaW9uJyxcblx0XHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0pO1xufSk7XG4iLCIvKipcbiAqIHNldHMgaml0c2lUaW1lb3V0IHRvIGluZGljYXRlIGEgY2FsbCBpcyBpbiBwcm9ncmVzc1xuICogQHBhcmFtIHtzdHJpbmd9IF9pZCAtIFJvb20gaWRcbiAqIEBwYXJtIHtudW1iZXJ9IHRpbWUgLSB0aW1lIHRvIHNldFxuICovXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRKaXRzaVRpbWVvdXQgPSBmdW5jdGlvbihfaWQsIHRpbWUpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkLFxuXHR9O1xuXG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHRqaXRzaVRpbWVvdXQ6IHRpbWUsXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnaml0c2k6dXBkYXRlVGltZW91dCc6IChyaWQpID0+IHtcblxuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdqaXRzaTp1cGRhdGVUaW1lb3V0JyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocmlkKTtcblx0XHRjb25zdCBjdXJyZW50VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG5cdFx0Y29uc3Qgaml0c2lUaW1lb3V0ID0gbmV3IERhdGUoKHJvb20gJiYgcm9vbS5qaXRzaVRpbWVvdXQpIHx8IGN1cnJlbnRUaW1lKS5nZXRUaW1lKCk7XG5cblx0XHRpZiAoaml0c2lUaW1lb3V0IDw9IGN1cnJlbnRUaW1lKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRKaXRzaVRpbWVvdXQocmlkLCBuZXcgRGF0ZShjdXJyZW50VGltZSArIDM1ICogMTAwMCkpO1xuXHRcdFx0Y29uc3QgbWVzc2FnZSA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIoJ2ppdHNpX2NhbGxfc3RhcnRlZCcsIHJpZCwgJycsIE1ldGVvci51c2VyKCksIHtcblx0XHRcdFx0YWN0aW9uTGlua3MgOiBbXG5cdFx0XHRcdFx0eyBpY29uOiAnaWNvbi12aWRlb2NhbScsIGxhYmVsOiBUQVBpMThuLl9fKCdDbGlja190b19qb2luJyksIG1ldGhvZF9pZDogJ2pvaW5KaXRzaUNhbGwnLCBwYXJhbXM6ICcnIH0sXG5cdFx0XHRcdF0sXG5cdFx0XHR9KTtcblx0XHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyaWQpO1xuXHRcdFx0bWVzc2FnZS5tc2cgPSBUQVBpMThuLl9fKCdTdGFydGVkX2FfdmlkZW9fY2FsbCcpO1xuXHRcdFx0bWVzc2FnZS5tZW50aW9ucyA9IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdF9pZDonaGVyZScsXG5cdFx0XHRcdFx0dXNlcm5hbWU6J2hlcmUnLFxuXHRcdFx0XHR9LFxuXHRcdFx0XTtcblx0XHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLnJ1bignYWZ0ZXJTYXZlTWVzc2FnZScsIG1lc3NhZ2UsIHJvb20pO1xuXHRcdH0gZWxzZSBpZiAoKGppdHNpVGltZW91dCAtIGN1cnJlbnRUaW1lKSAvIDEwMDAgPD0gMTUpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldEppdHNpVGltZW91dChyaWQsIG5ldyBEYXRlKGppdHNpVGltZW91dCArIDI1ICogMTAwMCkpO1xuXHRcdH1cblx0fSxcbn0pO1xuIiwiaW1wb3J0IEJpZ0JsdWVCdXR0b25BcGkgZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6YmlnYmx1ZWJ1dHRvbic7XG5pbXBvcnQgeyBIVFRQIH0gZnJvbSAnbWV0ZW9yL2h0dHAnO1xuaW1wb3J0IHhtbDJqcyBmcm9tICd4bWwyanMnO1xuXG5jb25zdCBwYXJzZXIgPSBuZXcgeG1sMmpzLlBhcnNlcih7XG5cdGV4cGxpY2l0Um9vdDogdHJ1ZSxcbn0pO1xuXG5jb25zdCBwYXJzZVN0cmluZyA9IE1ldGVvci53cmFwQXN5bmMocGFyc2VyLnBhcnNlU3RyaW5nKTtcblxuY29uc3QgZ2V0QkJCQVBJID0gKCkgPT4ge1xuXHRjb25zdCB1cmwgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnYmlnYmx1ZWJ1dHRvbl9zZXJ2ZXInKTtcblx0Y29uc3Qgc2VjcmV0ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ2JpZ2JsdWVidXR0b25fc2hhcmVkU2VjcmV0Jyk7XG5cdGNvbnN0IGFwaSA9IG5ldyBCaWdCbHVlQnV0dG9uQXBpKGAkeyB1cmwgfS9iaWdibHVlYnV0dG9uL2FwaWAsIHNlY3JldCk7XG5cdHJldHVybiB7IGFwaSwgdXJsIH07XG59O1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdGJiYkpvaW4oeyByaWQgfSkge1xuXG5cdFx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnYmJiSm9pbicgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFNZXRlb3IuY2FsbCgnY2FuQWNjZXNzUm9vbScsIHJpZCwgdGhpcy51c2VySWQpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdiYmJKb2luJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdiaWdibHVlYnV0dG9uX0VuYWJsZWQnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IEFsbG93ZWQnLCB7IG1ldGhvZDogJ2JiYkpvaW4nIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgYXBpIH0gPSBnZXRCQkJBUEkoKTtcblx0XHRjb25zdCBtZWV0aW5nSUQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgndW5pcXVlSUQnKSArIHJpZDtcblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocmlkKTtcblx0XHRjb25zdCBjcmVhdGVVcmwgPSBhcGkudXJsRm9yKCdjcmVhdGUnLCB7XG5cdFx0XHRuYW1lOiByb29tLnQgPT09ICdkJyA/ICdEaXJlY3QnIDogcm9vbS5uYW1lLFxuXHRcdFx0bWVldGluZ0lELFxuXHRcdFx0YXR0ZW5kZWVQVzogJ2FwJyxcblx0XHRcdG1vZGVyYXRvclBXOiAnbXAnLFxuXHRcdFx0d2VsY29tZTogJzxicj5XZWxjb21lIHRvIDxiPiUlQ09ORk5BTUUlJTwvYj4hJyxcblx0XHRcdG1ldGFfaHRtbDVjaGF0OiBmYWxzZSxcblx0XHRcdG1ldGFfaHRtbDVuYXZiYXI6IGZhbHNlLFxuXHRcdFx0bWV0YV9odG1sNWF1dG9zd2FwbGF5b3V0OiB0cnVlLFxuXHRcdFx0bWV0YV9odG1sNWF1dG9zaGFyZXdlYmNhbTogZmFsc2UsXG5cdFx0XHRtZXRhX2h0bWw1aGlkZXByZXNlbnRhdGlvbjogdHJ1ZSxcblx0XHR9KTtcblxuXHRcdGNvbnN0IGNyZWF0ZVJlc3VsdCA9IEhUVFAuZ2V0KGNyZWF0ZVVybCk7XG5cdFx0Y29uc3QgZG9jID0gcGFyc2VTdHJpbmcoY3JlYXRlUmVzdWx0LmNvbnRlbnQpO1xuXG5cdFx0aWYgKGRvYy5yZXNwb25zZS5yZXR1cm5jb2RlWzBdKSB7XG5cdFx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodGhpcy51c2VySWQpO1xuXG5cdFx0XHRjb25zdCBob29rQXBpID0gYXBpLnVybEZvcignaG9va3MvY3JlYXRlJywge1xuXHRcdFx0XHRtZWV0aW5nSUQsXG5cdFx0XHRcdGNhbGxiYWNrVVJMOiBNZXRlb3IuYWJzb2x1dGVVcmwoYGFwaS92MS92aWRlb2NvbmZlcmVuY2UuYmJiLnVwZGF0ZS8keyBtZWV0aW5nSUQgfWApLFxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IGhvb2tSZXN1bHQgPSBIVFRQLmdldChob29rQXBpKTtcblxuXHRcdFx0aWYgKGhvb2tSZXN1bHQuc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG5cdFx0XHRcdC8vIFRPRE8gaW1wcm92ZSBlcnJvciBsb2dnaW5nXG5cdFx0XHRcdGNvbnNvbGUubG9nKHsgaG9va1Jlc3VsdCB9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRSb2NrZXRDaGF0LnNhdmVTdHJlYW1pbmdPcHRpb25zKHJpZCwge1xuXHRcdFx0XHR0eXBlOiAnY2FsbCcsXG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dXJsOiBhcGkudXJsRm9yKCdqb2luJywge1xuXHRcdFx0XHRcdHBhc3N3b3JkOiAnbXAnLCAvLyBtcCBpZiBtb2RlcmF0b3IgYXAgaWYgYXR0ZW5kZWVcblx0XHRcdFx0XHRtZWV0aW5nSUQsXG5cdFx0XHRcdFx0ZnVsbE5hbWU6IHVzZXIudXNlcm5hbWUsXG5cdFx0XHRcdFx0dXNlcklEOiB1c2VyLl9pZCxcblx0XHRcdFx0XHRqb2luVmlhSHRtbDU6IHRydWUsXG5cdFx0XHRcdFx0YXZhdGFyVVJMOiBNZXRlb3IuYWJzb2x1dGVVcmwoYGF2YXRhci8keyB1c2VyLnVzZXJuYW1lIH1gKSxcblx0XHRcdFx0XHQvLyBjbGllbnRVUkw6IGAkeyB1cmwgfS9odG1sNWNsaWVudC9qb2luYCxcblx0XHRcdFx0fSksXG5cdFx0XHR9O1xuXHRcdH1cblx0fSxcblxuXHRiYmJFbmQoeyByaWQgfSkge1xuXHRcdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2JiYkVuZCcgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFNZXRlb3IuY2FsbCgnY2FuQWNjZXNzUm9vbScsIHJpZCwgdGhpcy51c2VySWQpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdiYmJFbmQnIH0pO1xuXHRcdH1cblxuXHRcdGlmICghUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ2JpZ2JsdWVidXR0b25fRW5hYmxlZCcpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgQWxsb3dlZCcsIHsgbWV0aG9kOiAnYmJiRW5kJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCB7IGFwaSB9ID0gZ2V0QkJCQVBJKCk7XG5cdFx0Y29uc3QgbWVldGluZ0lEID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ3VuaXF1ZUlEJykgKyByaWQ7XG5cdFx0Y29uc3QgZW5kQXBpID0gYXBpLnVybEZvcignZW5kJywge1xuXHRcdFx0bWVldGluZ0lELFxuXHRcdFx0cGFzc3dvcmQ6ICdtcCcsIC8vIG1wIGlmIG1vZGVyYXRvciBhcCBpZiBhdHRlbmRlZVxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgZW5kQXBpUmVzdWx0ID0gSFRUUC5nZXQoZW5kQXBpKTtcblxuXHRcdGlmIChlbmRBcGlSZXN1bHQuc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG5cdFx0XHQvLyBUT0RPIGltcHJvdmUgZXJyb3IgbG9nZ2luZ1xuXHRcdFx0Y29uc29sZS5sb2coeyBlbmRBcGlSZXN1bHQgfSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgZG9jID0gcGFyc2VTdHJpbmcoZW5kQXBpUmVzdWx0LmNvbnRlbnQpO1xuXG5cdFx0aWYgKGRvYy5yZXNwb25zZS5yZXR1cm5jb2RlWzBdID09PSAnRkFJTEVEJykge1xuXHRcdFx0Um9ja2V0Q2hhdC5zYXZlU3RyZWFtaW5nT3B0aW9ucyhyaWQsIHt9KTtcblx0XHR9XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ3ZpZGVvY29uZmVyZW5jZS5iYmIudXBkYXRlLzppZCcsIHsgYXV0aFJlcXVpcmVkOiBmYWxzZSB9LCB7XG5cdHBvc3QoKSB7XG5cdFx0Ly8gVE9ETyBjaGVjayBjaGVja3N1bVxuXHRcdGNvbnN0IGV2ZW50ID0gSlNPTi5wYXJzZSh0aGlzLmJvZHlQYXJhbXMuZXZlbnQpWzBdO1xuXHRcdGNvbnN0IGV2ZW50VHlwZSA9IGV2ZW50LmRhdGEuaWQ7XG5cdFx0Y29uc3QgbWVldGluZ0lEID0gZXZlbnQuZGF0YS5hdHRyaWJ1dGVzLm1lZXRpbmdbJ2V4dGVybmFsLW1lZXRpbmctaWQnXTtcblx0XHRjb25zdCByaWQgPSBtZWV0aW5nSUQucmVwbGFjZShSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgndW5pcXVlSUQnKSwgJycpO1xuXG5cdFx0Y29uc29sZS5sb2coZXZlbnRUeXBlLCByaWQpO1xuXG5cdFx0aWYgKGV2ZW50VHlwZSA9PT0gJ21lZXRpbmctZW5kZWQnKSB7XG5cdFx0XHRSb2NrZXRDaGF0LnNhdmVTdHJlYW1pbmdPcHRpb25zKHJpZCwge30pO1xuXHRcdH1cblxuXHRcdC8vIGlmIChldmVudFR5cGUgPT09ICd1c2VyLWxlZnQnKSB7XG5cdFx0Ly8gXHRjb25zdCB7IGFwaSB9ID0gZ2V0QkJCQVBJKCk7XG5cblx0XHQvLyBcdGNvbnN0IGdldE1lZXRpbmdJbmZvQXBpID0gYXBpLnVybEZvcignZ2V0TWVldGluZ0luZm8nLCB7XG5cdFx0Ly8gXHRcdG1lZXRpbmdJRFxuXHRcdC8vIFx0fSk7XG5cblx0XHQvLyBcdGNvbnN0IGdldE1lZXRpbmdJbmZvUmVzdWx0ID0gSFRUUC5nZXQoZ2V0TWVldGluZ0luZm9BcGkpO1xuXG5cdFx0Ly8gXHRpZiAoZ2V0TWVldGluZ0luZm9SZXN1bHQuc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG5cdFx0Ly8gXHRcdC8vIFRPRE8gaW1wcm92ZSBlcnJvciBsb2dnaW5nXG5cdFx0Ly8gXHRcdGNvbnNvbGUubG9nKHsgZ2V0TWVldGluZ0luZm9SZXN1bHQgfSk7XG5cdFx0Ly8gXHR9XG5cblx0XHQvLyBcdGNvbnN0IGRvYyA9IHBhcnNlU3RyaW5nKGdldE1lZXRpbmdJbmZvUmVzdWx0LmNvbnRlbnQpO1xuXG5cdFx0Ly8gXHRpZiAoZG9jLnJlc3BvbnNlLnJldHVybmNvZGVbMF0pIHtcblx0XHQvLyBcdFx0Y29uc3QgcGFydGljaXBhbnRDb3VudCA9IHBhcnNlSW50KGRvYy5yZXNwb25zZS5wYXJ0aWNpcGFudENvdW50WzBdKTtcblx0XHQvLyBcdFx0Y29uc29sZS5sb2cocGFydGljaXBhbnRDb3VudCk7XG5cdFx0Ly8gXHR9XG5cdFx0Ly8gfVxuXHR9LFxufSk7XG4iLCJSb2NrZXRDaGF0LmFjdGlvbkxpbmtzLnJlZ2lzdGVyKCdqb2luSml0c2lDYWxsJywgZnVuY3Rpb24oLyogbWVzc2FnZSwgcGFyYW1zKi8pIHtcblxufSk7XG4iXX0=
