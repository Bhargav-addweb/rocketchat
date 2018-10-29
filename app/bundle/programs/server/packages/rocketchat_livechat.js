(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var Autoupdate = Package.autoupdate.Autoupdate;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Logger = Package['rocketchat:logger'].Logger;
var SystemLogger = Package['rocketchat:logger'].SystemLogger;
var LoggerManager = Package['rocketchat:logger'].LoggerManager;
var Streamer = Package['rocketchat:streamer'].Streamer;
var UserPresence = Package['konecty:user-presence'].UserPresence;
var UserPresenceMonitor = Package['konecty:user-presence'].UserPresenceMonitor;
var UserPresenceEvents = Package['konecty:user-presence'].UserPresenceEvents;
var fileUpload = Package['rocketchat:ui'].fileUpload;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var check = Package.check.check;
var Match = Package.check.Match;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var department, self, _id, agents, username, agent, exports;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:livechat":{"livechat.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/livechat.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let url;
module.watch(require("url"), {
  default(v) {
    url = v;
  }

}, 1);
const {
  WebApp
} = Package.webapp;
const {
  Autoupdate
} = Package.autoupdate;
WebApp.connectHandlers.use('/livechat', Meteor.bindEnvironment((req, res, next) => {
  const reqUrl = url.parse(req.url);

  if (reqUrl.pathname !== '/') {
    return next();
  }

  res.setHeader('content-type', 'text/html; charset=utf-8');
  let domainWhiteList = RocketChat.settings.get('Livechat_AllowedDomainsList');

  if (req.headers.referer && !_.isEmpty(domainWhiteList.trim())) {
    domainWhiteList = _.map(domainWhiteList.split(','), function (domain) {
      return domain.trim();
    });
    const referer = url.parse(req.headers.referer);

    if (!_.contains(domainWhiteList, referer.host)) {
      res.setHeader('X-FRAME-OPTIONS', 'DENY');
      return next();
    }

    res.setHeader('X-FRAME-OPTIONS', `ALLOW-FROM ${referer.protocol}//${referer.host}`);
  }

  const head = Assets.getText('public/head.html');
  let baseUrl;

  if (__meteor_runtime_config__.ROOT_URL_PATH_PREFIX && __meteor_runtime_config__.ROOT_URL_PATH_PREFIX.trim() !== '') {
    baseUrl = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;
  } else {
    baseUrl = '/';
  }

  if (/\/$/.test(baseUrl) === false) {
    baseUrl += '/';
  }

  const html = `<html>
		<head>
			<link rel="stylesheet" type="text/css" class="__meteor-css__" href="${baseUrl}livechat/livechat.css?_dc=${Autoupdate.autoupdateVersion}">
			<script type="text/javascript">
				__meteor_runtime_config__ = ${JSON.stringify(__meteor_runtime_config__)};
			</script>

			<base href="${baseUrl}">

			${head}
		</head>
		<body>
			<script type="text/javascript" src="${baseUrl}livechat/livechat.js?_dc=${Autoupdate.autoupdateVersion}"></script>
		</body>
	</html>`;
  res.write(html);
  res.end();
}));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server":{"startup.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/startup.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.startup(() => {
  RocketChat.roomTypes.setRoomFind('l', _id => RocketChat.models.Rooms.findLivechatById(_id).fetch());
  RocketChat.authz.addRoomAccessValidator(function (room, user) {
    return room && room.t === 'l' && user && RocketChat.authz.hasPermission(user._id, 'view-livechat-rooms');
  });
  RocketChat.authz.addRoomAccessValidator(function (room, user, extraData) {
    if (!room && extraData && extraData.rid) {
      room = RocketChat.models.Rooms.findOneById(extraData.rid);
    }

    return room && room.t === 'l' && extraData && extraData.visitorToken && room.v && room.v.token === extraData.visitorToken;
  });
  RocketChat.callbacks.add('beforeLeaveRoom', function (user, room) {
    if (room.t !== 'l') {
      return user;
    }

    throw new Meteor.Error(TAPi18n.__('You_cant_leave_a_livechat_room_Please_use_the_close_button', {
      lng: user.language || RocketChat.settings.get('language') || 'en'
    }));
  }, RocketChat.callbacks.priority.LOW, 'cant-leave-room');
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"visitorStatus.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/visitorStatus.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals UserPresenceEvents */
Meteor.startup(() => {
  UserPresenceEvents.on('setStatus', (session, status, metadata) => {
    if (metadata && metadata.visitor) {
      RocketChat.models.LivechatInquiry.updateVisitorStatus(metadata.visitor, status);
      RocketChat.models.Rooms.updateVisitorStatus(metadata.visitor, status);
    }
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"roomType.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/roomType.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatRoomType;
module.watch(require("../imports/LivechatRoomType"), {
  default(v) {
    LivechatRoomType = v;
  }

}, 0);
let LivechatVisitors;
module.watch(require("./models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 1);

class LivechatRoomTypeServer extends LivechatRoomType {
  getMsgSender(senderId) {
    return LivechatVisitors.findOneById(senderId);
  }
  /**
   * Returns details to use on notifications
   *
   * @param {object} room
   * @param {object} user
   * @param {string} notificationMessage
   * @return {object} Notification details
   */


  getNotificationDetails(room, user, notificationMessage) {
    const title = `[livechat] ${this.roomName(room)}`;
    const text = notificationMessage;
    return {
      title,
      text
    };
  }

  canAccessUploadedFile({
    rc_token,
    rc_rid
  } = {}) {
    return rc_token && rc_rid && RocketChat.models.Rooms.findOneOpenByRoomIdAndVisitorToken(rc_rid, rc_token);
  }

}

RocketChat.roomTypes.add(new LivechatRoomTypeServer());
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"hooks":{"externalMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/externalMessage.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let knowledgeEnabled = false;
let apiaiKey = '';
let apiaiLanguage = 'en';
RocketChat.settings.get('Livechat_Knowledge_Enabled', function (key, value) {
  knowledgeEnabled = value;
});
RocketChat.settings.get('Livechat_Knowledge_Apiai_Key', function (key, value) {
  apiaiKey = value;
});
RocketChat.settings.get('Livechat_Knowledge_Apiai_Language', function (key, value) {
  apiaiLanguage = value;
});
RocketChat.callbacks.add('afterSaveMessage', function (message, room) {
  // skips this callback if the message was edited
  if (!message || message.editedAt) {
    return message;
  }

  if (!knowledgeEnabled) {
    return message;
  }

  if (!(typeof room.t !== 'undefined' && room.t === 'l' && room.v && room.v.token)) {
    return message;
  } // if the message hasn't a token, it was not sent by the visitor, so ignore it


  if (!message.token) {
    return message;
  }

  Meteor.defer(() => {
    try {
      const response = HTTP.post('https://api.api.ai/api/query?v=20150910', {
        data: {
          query: message.msg,
          lang: apiaiLanguage,
          sessionId: room._id
        },
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${apiaiKey}`
        }
      });

      if (response.data && response.data.status.code === 200 && !_.isEmpty(response.data.result.fulfillment.speech)) {
        RocketChat.models.LivechatExternalMessage.insert({
          rid: message.rid,
          msg: response.data.result.fulfillment.speech,
          orig: message._id,
          ts: new Date()
        });
      }
    } catch (e) {
      SystemLogger.error('Error using Api.ai ->', e);
    }
  });
  return message;
}, RocketChat.callbacks.priority.LOW, 'externalWebHook');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"leadCapture.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/leadCapture.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../../server/models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);

function validateMessage(message, room) {
  // skips this callback if the message was edited
  if (message.editedAt) {
    return false;
  } // message valid only if it is a livechat room


  if (!(typeof room.t !== 'undefined' && room.t === 'l' && room.v && room.v.token)) {
    return false;
  } // if the message hasn't a token, it was NOT sent from the visitor, so ignore it


  if (!message.token) {
    return false;
  } // if the message has a type means it is a special message (like the closing comment), so skips


  if (message.t) {
    return false;
  }

  return true;
}

RocketChat.callbacks.add('afterSaveMessage', function (message, room) {
  if (!validateMessage(message, room)) {
    return message;
  }

  const phoneRegexp = new RegExp(RocketChat.settings.get('Livechat_lead_phone_regex'), 'g');
  const msgPhones = message.msg.match(phoneRegexp);
  const emailRegexp = new RegExp(RocketChat.settings.get('Livechat_lead_email_regex'), 'gi');
  const msgEmails = message.msg.match(emailRegexp);

  if (msgEmails || msgPhones) {
    LivechatVisitors.saveGuestEmailPhoneById(room.v._id, msgEmails, msgPhones);
    RocketChat.callbacks.run('livechat.leadCapture', room);
  }

  return message;
}, RocketChat.callbacks.priority.LOW, 'leadCapture');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"markRoomResponded.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/markRoomResponded.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.callbacks.add('afterSaveMessage', function (message, room) {
  // skips this callback if the message was edited
  if (!message || message.editedAt) {
    return message;
  } // check if room is yet awaiting for response


  if (!(typeof room.t !== 'undefined' && room.t === 'l' && room.waitingResponse)) {
    return message;
  } // if the message has a token, it was sent by the visitor, so ignore it


  if (message.token) {
    return message;
  }

  Meteor.defer(() => {
    RocketChat.models.Rooms.setResponseByRoomId(room._id, {
      user: {
        _id: message.u._id,
        username: message.u.username
      }
    });
  });
  return message;
}, RocketChat.callbacks.priority.LOW, 'markRoomResponded');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"offlineMessage.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/offlineMessage.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.callbacks.add('livechat.offlineMessage', data => {
  if (!RocketChat.settings.get('Livechat_webhook_on_offline_msg')) {
    return data;
  }

  const postData = {
    type: 'LivechatOfflineMessage',
    sentAt: new Date(),
    visitor: {
      name: data.name,
      email: data.email
    },
    message: data.message
  };
  RocketChat.Livechat.sendRequest(postData);
}, RocketChat.callbacks.priority.MEDIUM, 'livechat-send-email-offline-message');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"RDStation.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/RDStation.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
function sendToRDStation(room) {
  if (!RocketChat.settings.get('Livechat_RDStation_Token')) {
    return room;
  }

  const livechatData = RocketChat.Livechat.getLivechatRoomGuestInfo(room);

  if (!livechatData.visitor.email) {
    return room;
  }

  const email = Array.isArray(livechatData.visitor.email) ? livechatData.visitor.email[0].address : livechatData.visitor.email;
  const options = {
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      token_rdstation: RocketChat.settings.get('Livechat_RDStation_Token'),
      identificador: 'rocketchat-livechat',
      client_id: livechatData.visitor._id,
      email
    }
  };
  options.data.nome = livechatData.visitor.name || livechatData.visitor.username;

  if (livechatData.visitor.phone) {
    options.data.telefone = livechatData.visitor.phone;
  }

  if (livechatData.tags) {
    options.data.tags = livechatData.tags;
  }

  Object.keys(livechatData.customFields || {}).forEach(field => {
    options.data[field] = livechatData.customFields[field];
  });
  Object.keys(livechatData.visitor.customFields || {}).forEach(field => {
    options.data[field] = livechatData.visitor.customFields[field];
  });

  try {
    HTTP.call('POST', 'https://www.rdstation.com.br/api/1.3/conversions', options);
  } catch (e) {
    console.error('Error sending lead to RD Station ->', e);
  }

  return room;
}

RocketChat.callbacks.add('livechat.closeRoom', sendToRDStation, RocketChat.callbacks.priority.MEDIUM, 'livechat-rd-station-close-room');
RocketChat.callbacks.add('livechat.saveInfo', sendToRDStation, RocketChat.callbacks.priority.MEDIUM, 'livechat-rd-station-save-info');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveAnalyticsData.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/saveAnalyticsData.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.callbacks.add('afterSaveMessage', function (message, room) {
  // skips this callback if the message was edited
  if (!message || message.editedAt) {
    return message;
  } // check if room is livechat


  if (room.t !== 'l') {
    return message;
  }

  Meteor.defer(() => {
    const now = new Date();
    let analyticsData; // if the message has a token, it was sent by the visitor

    if (!message.token) {
      const visitorLastQuery = room.metrics && room.metrics.v ? room.metrics.v.lq : room.ts;
      const agentLastReply = room.metrics && room.metrics.servedBy ? room.metrics.servedBy.lr : room.ts;
      const agentJoinTime = room.servedBy && room.servedBy.ts ? room.servedBy.ts : room.ts;
      const isResponseTt = room.metrics && room.metrics.response && room.metrics.response.tt;
      const isResponseTotal = room.metrics && room.metrics.response && room.metrics.response.total;

      if (agentLastReply === room.ts) {
        // first response
        const firstResponseDate = now;
        const firstResponseTime = (now.getTime() - visitorLastQuery) / 1000;
        const responseTime = (now.getTime() - visitorLastQuery) / 1000;
        const avgResponseTime = ((isResponseTt ? room.metrics.response.tt : 0) + responseTime) / ((isResponseTotal ? room.metrics.response.total : 0) + 1);
        const firstReactionDate = now;
        const firstReactionTime = (now.getTime() - agentJoinTime) / 1000;
        const reactionTime = (now.getTime() - agentJoinTime) / 1000;
        analyticsData = {
          firstResponseDate,
          firstResponseTime,
          responseTime,
          avgResponseTime,
          firstReactionDate,
          firstReactionTime,
          reactionTime
        };
      } else if (visitorLastQuery > agentLastReply) {
        // response, not first
        const responseTime = (now.getTime() - visitorLastQuery) / 1000;
        const avgResponseTime = ((isResponseTt ? room.metrics.response.tt : 0) + responseTime) / ((isResponseTotal ? room.metrics.response.total : 0) + 1);
        const reactionTime = (now.getTime() - visitorLastQuery) / 1000;
        analyticsData = {
          responseTime,
          avgResponseTime,
          reactionTime
        };
      } // ignore, its continuing response

    }

    RocketChat.models.Rooms.saveAnalyticsDataByRoomId(room, message, analyticsData);
  });
  return message;
}, RocketChat.callbacks.priority.LOW, 'saveAnalyticsData');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendToCRM.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/sendToCRM.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const msgNavType = 'livechat_navigation_history';

const crmEnabled = () => {
  const secretToken = RocketChat.settings.get('Livechat_secret_token');
  const webhookUrl = RocketChat.settings.get('Livechat_webhookUrl');
  return secretToken !== '' && secretToken !== undefined && webhookUrl !== '' && webhookUrl !== undefined;
};

const sendMessageType = msgType => {
  const sendNavHistory = RocketChat.settings.get('Livechat_Visitor_navigation_as_a_message') && RocketChat.settings.get('Send_visitor_navigation_history_livechat_webhook_request');
  return sendNavHistory && msgType === msgNavType;
};

function sendToCRM(type, room, includeMessages = true) {
  if (crmEnabled() === false) {
    return room;
  }

  const postData = RocketChat.Livechat.getLivechatRoomGuestInfo(room);
  postData.type = type;
  postData.messages = [];
  let messages;

  if (typeof includeMessages === 'boolean' && includeMessages) {
    messages = RocketChat.models.Messages.findVisibleByRoomId(room._id, {
      sort: {
        ts: 1
      }
    });
  } else if (includeMessages instanceof Array) {
    messages = includeMessages;
  }

  if (messages) {
    messages.forEach(message => {
      if (message.t && !sendMessageType(message.t)) {
        return;
      }

      const msg = {
        _id: message._id,
        username: message.u.username,
        msg: message.msg,
        ts: message.ts,
        editedAt: message.editedAt
      };

      if (message.u.username !== postData.visitor.username) {
        msg.agentId = message.u._id;
      }

      if (message.t === msgNavType) {
        msg.navigation = message.navigation;
      }

      postData.messages.push(msg);
    });
  }

  const response = RocketChat.Livechat.sendRequest(postData);

  if (response && response.data && response.data.data) {
    RocketChat.models.Rooms.saveCRMDataByRoomId(room._id, response.data.data);
  }

  return room;
}

RocketChat.callbacks.add('livechat.closeRoom', room => {
  if (!RocketChat.settings.get('Livechat_webhook_on_close')) {
    return room;
  }

  return sendToCRM('LivechatSession', room);
}, RocketChat.callbacks.priority.MEDIUM, 'livechat-send-crm-close-room');
RocketChat.callbacks.add('livechat.saveInfo', room => {
  // Do not send to CRM if the chat is still open
  if (room.open) {
    return room;
  }

  return sendToCRM('LivechatEdit', room);
}, RocketChat.callbacks.priority.MEDIUM, 'livechat-send-crm-save-info');
RocketChat.callbacks.add('afterSaveMessage', function (message, room) {
  // only call webhook if it is a livechat room
  if (room.t !== 'l' || room.v == null || room.v.token == null) {
    return message;
  } // if the message has a token, it was sent from the visitor
  // if not, it was sent from the agent


  if (message.token) {
    if (!RocketChat.settings.get('Livechat_webhook_on_visitor_message')) {
      return message;
    }
  } else if (!RocketChat.settings.get('Livechat_webhook_on_agent_message')) {
    return message;
  } // if the message has a type means it is a special message (like the closing comment), so skips
  // unless the settings that handle with visitor navigation history are enabled


  if (message.t && !sendMessageType(message.t)) {
    return message;
  }

  sendToCRM('Message', room, [message]);
  return message;
}, RocketChat.callbacks.priority.MEDIUM, 'livechat-send-crm-message');
RocketChat.callbacks.add('livechat.leadCapture', room => {
  if (!RocketChat.settings.get('Livechat_webhook_on_capture')) {
    return room;
  }

  return sendToCRM('LeadCapture', room, false);
}, RocketChat.callbacks.priority.MEDIUM, 'livechat-send-crm-lead-capture');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendToFacebook.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/hooks/sendToFacebook.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let OmniChannel;
module.watch(require("../lib/OmniChannel"), {
  default(v) {
    OmniChannel = v;
  }

}, 0);
RocketChat.callbacks.add('afterSaveMessage', function (message, room) {
  // skips this callback if the message was edited
  if (message.editedAt) {
    return message;
  }

  if (!RocketChat.settings.get('Livechat_Facebook_Enabled') || !RocketChat.settings.get('Livechat_Facebook_API_Key')) {
    return message;
  } // only send the sms by SMS if it is a livechat room with SMS set to true


  if (!(typeof room.t !== 'undefined' && room.t === 'l' && room.facebook && room.v && room.v.token)) {
    return message;
  } // if the message has a token, it was sent from the visitor, so ignore it


  if (message.token) {
    return message;
  } // if the message has a type means it is a special message (like the closing comment), so skips


  if (message.t) {
    return message;
  }

  OmniChannel.reply({
    page: room.facebook.page.id,
    token: room.v.token,
    text: message.msg
  });
  return message;
}, RocketChat.callbacks.priority.LOW, 'sendMessageToFacebook');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"addAgent.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/addAgent.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:addAgent'(username) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:addAgent'
      });
    }

    return RocketChat.Livechat.addAgent(username);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"addManager.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/addManager.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:addManager'(username) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:addManager'
      });
    }

    return RocketChat.Livechat.addManager(username);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"changeLivechatStatus.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/changeLivechatStatus.js                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:changeLivechatStatus'() {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:changeLivechatStatus'
      });
    }

    const user = Meteor.user();
    const newStatus = user.statusLivechat === 'available' ? 'not-available' : 'available';
    return RocketChat.models.Users.setLivechatStatus(user._id, newStatus);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"closeByVisitor.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/closeByVisitor.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:closeByVisitor'({
    roomId,
    token
  }) {
    const room = RocketChat.models.Rooms.findOneOpenByRoomIdAndVisitorToken(roomId, token);

    if (!room || !room.open) {
      return false;
    }

    const visitor = LivechatVisitors.getVisitorByToken(token);
    const language = visitor && visitor.language || RocketChat.settings.get('language') || 'en';
    return RocketChat.Livechat.closeRoom({
      visitor,
      room,
      comment: TAPi18n.__('Closed_by_visitor', {
        lng: language
      })
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"closeRoom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/closeRoom.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:closeRoom'(roomId, comment) {
    const userId = Meteor.userId();

    if (!userId || !RocketChat.authz.hasPermission(userId, 'close-livechat-room')) {
      throw new Meteor.Error('error-not-authorized', 'Not authorized', {
        method: 'livechat:closeRoom'
      });
    }

    const room = RocketChat.models.Rooms.findOneById(roomId);

    if (!room || room.t !== 'l') {
      throw new Meteor.Error('room-not-found', 'Room not found', {
        method: 'livechat:closeRoom'
      });
    }

    const user = Meteor.user();
    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(roomId, user._id, {
      _id: 1
    });

    if (!subscription && !RocketChat.authz.hasPermission(userId, 'close-others-livechat-room')) {
      throw new Meteor.Error('error-not-authorized', 'Not authorized', {
        method: 'livechat:closeRoom'
      });
    }

    return RocketChat.Livechat.closeRoom({
      user,
      room,
      comment
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"facebook.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/facebook.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let OmniChannel;
module.watch(require("../lib/OmniChannel"), {
  default(v) {
    OmniChannel = v;
  }

}, 0);
Meteor.methods({
  'livechat:facebook'(options) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:addAgent'
      });
    }

    try {
      switch (options.action) {
        case 'initialState':
          {
            return {
              enabled: RocketChat.settings.get('Livechat_Facebook_Enabled'),
              hasToken: !!RocketChat.settings.get('Livechat_Facebook_API_Key')
            };
          }

        case 'enable':
          {
            const result = OmniChannel.enable();

            if (!result.success) {
              return result;
            }

            return RocketChat.settings.updateById('Livechat_Facebook_Enabled', true);
          }

        case 'disable':
          {
            OmniChannel.disable();
            return RocketChat.settings.updateById('Livechat_Facebook_Enabled', false);
          }

        case 'list-pages':
          {
            return OmniChannel.listPages();
          }

        case 'subscribe':
          {
            return OmniChannel.subscribe(options.page);
          }

        case 'unsubscribe':
          {
            return OmniChannel.unsubscribe(options.page);
          }
      }
    } catch (e) {
      if (e.response && e.response.data && e.response.data.error) {
        if (e.response.data.error.error) {
          throw new Meteor.Error(e.response.data.error.error, e.response.data.error.message);
        }

        if (e.response.data.error.response) {
          throw new Meteor.Error('integration-error', e.response.data.error.response.error.message);
        }

        if (e.response.data.error.message) {
          throw new Meteor.Error('integration-error', e.response.data.error.message);
        }
      }

      console.error('Error contacting omni.rocket.chat:', e);
      throw new Meteor.Error('integration-error', e.error);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getCustomFields.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/getCustomFields.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:getCustomFields'() {
    return RocketChat.models.LivechatCustomField.find().fetch();
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getAgentData.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/getAgentData.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:getAgentData'({
    roomId,
    token
  }) {
    check(roomId, String);
    check(token, String);
    const room = RocketChat.models.Rooms.findOneById(roomId);
    const visitor = LivechatVisitors.getVisitorByToken(token);

    if (!room || room.t !== 'l' || !room.v || room.v.token !== visitor.token) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room');
    }

    if (!room.servedBy) {
      return;
    }

    return RocketChat.models.Users.getAgentInfo(room.servedBy._id);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getAgentOverviewData.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/getAgentOverviewData.js                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:getAgentOverviewData'(options) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:getAgentOverviewData'
      });
    }

    if (!(options.chartOptions && options.chartOptions.name)) {
      console.log('Incorrect analytics options');
      return;
    }

    return RocketChat.Livechat.Analytics.getAgentOverviewData(options);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getAnalyticsChartData.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/getAnalyticsChartData.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:getAnalyticsChartData'(options) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:getAnalyticsChartData'
      });
    }

    if (!(options.chartOptions && options.chartOptions.name)) {
      console.log('Incorrect chart options');
      return;
    }

    return RocketChat.Livechat.Analytics.getAnalyticsChartData(options);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getAnalyticsOverviewData.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/getAnalyticsOverviewData.js                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:getAnalyticsOverviewData'(options) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:getAnalyticsOverviewData'
      });
    }

    if (!(options.analyticsOptions && options.analyticsOptions.name)) {
      console.log('Incorrect analytics options');
      return;
    }

    return RocketChat.Livechat.Analytics.getAnalyticsOverviewData(options);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getInitialData.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/getInitialData.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 1);
Meteor.methods({
  'livechat:getInitialData'(visitorToken, departmentId) {
    const info = {
      enabled: null,
      title: null,
      color: null,
      registrationForm: null,
      room: null,
      visitor: null,
      triggers: [],
      departments: [],
      allowSwitchingDepartments: null,
      online: true,
      offlineColor: null,
      offlineMessage: null,
      offlineSuccessMessage: null,
      offlineUnavailableMessage: null,
      displayOfflineForm: null,
      videoCall: null,
      fileUpload: null,
      conversationFinishedMessage: null,
      nameFieldRegistrationForm: null,
      emailFieldRegistrationForm: null
    };
    const options = {
      fields: {
        name: 1,
        t: 1,
        cl: 1,
        u: 1,
        usernames: 1,
        v: 1,
        servedBy: 1,
        departmentId: 1
      }
    };
    const room = departmentId ? RocketChat.models.Rooms.findOpenByVisitorTokenAndDepartmentId(visitorToken, departmentId, options).fetch() : RocketChat.models.Rooms.findOpenByVisitorToken(visitorToken, options).fetch();

    if (room && room.length > 0) {
      info.room = room[0];
    }

    const visitor = LivechatVisitors.getVisitorByToken(visitorToken, {
      fields: {
        name: 1,
        username: 1,
        visitorEmails: 1,
        department: 1
      }
    });

    if (room) {
      info.visitor = visitor;
    }

    const initSettings = RocketChat.Livechat.getInitSettings();
    info.title = initSettings.Livechat_title;
    info.color = initSettings.Livechat_title_color;
    info.enabled = initSettings.Livechat_enabled;
    info.registrationForm = initSettings.Livechat_registration_form;
    info.offlineTitle = initSettings.Livechat_offline_title;
    info.offlineColor = initSettings.Livechat_offline_title_color;
    info.offlineMessage = initSettings.Livechat_offline_message;
    info.offlineSuccessMessage = initSettings.Livechat_offline_success_message;
    info.offlineUnavailableMessage = initSettings.Livechat_offline_form_unavailable;
    info.displayOfflineForm = initSettings.Livechat_display_offline_form;
    info.language = initSettings.Language;
    info.videoCall = initSettings.Livechat_videocall_enabled === true && initSettings.Jitsi_Enabled === true;
    info.fileUpload = initSettings.Livechat_fileupload_enabled && initSettings.FileUpload_Enabled;
    info.transcript = initSettings.Livechat_enable_transcript;
    info.transcriptMessage = initSettings.Livechat_transcript_message;
    info.conversationFinishedMessage = initSettings.Livechat_conversation_finished_message;
    info.nameFieldRegistrationForm = initSettings.Livechat_name_field_registration_form;
    info.emailFieldRegistrationForm = initSettings.Livechat_email_field_registration_form;
    info.agentData = room && room[0] && room[0].servedBy && RocketChat.models.Users.getAgentInfo(room[0].servedBy._id);
    RocketChat.models.LivechatTrigger.findEnabled().forEach(trigger => {
      info.triggers.push(_.pick(trigger, '_id', 'actions', 'conditions', 'runOnce'));
    });
    RocketChat.models.LivechatDepartment.findEnabledWithAgents().forEach(department => {
      info.departments.push(department);
    });
    info.allowSwitchingDepartments = initSettings.Livechat_allow_switching_departments;
    info.online = RocketChat.models.Users.findOnlineAgents().count() > 0;
    return info;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getNextAgent.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/getNextAgent.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:getNextAgent'({
    token,
    department
  }) {
    check(token, String);
    const room = RocketChat.models.Rooms.findOpenByVisitorToken(token).fetch();

    if (room && room.length > 0) {
      return;
    }

    if (!department) {
      const requireDeparment = RocketChat.Livechat.getRequiredDepartment();

      if (requireDeparment) {
        department = requireDeparment._id;
      }
    }

    const agent = RocketChat.Livechat.getNextAgent(department);

    if (!agent) {
      return;
    }

    return RocketChat.models.Users.getAgentInfo(agent.agentId);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"loadHistory.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/loadHistory.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:loadHistory'({
    token,
    rid,
    end,
    limit = 20,
    ls
  }) {
    const visitor = LivechatVisitors.getVisitorByToken(token, {
      fields: {
        _id: 1
      }
    });

    if (!visitor) {
      return;
    }

    return RocketChat.loadMessageHistory({
      userId: visitor._id,
      rid,
      end,
      limit,
      ls
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"loginByToken.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/loginByToken.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:loginByToken'(token) {
    const visitor = LivechatVisitors.getVisitorByToken(token, {
      fields: {
        _id: 1
      }
    });

    if (!visitor) {
      return;
    }

    return {
      _id: visitor._id
    };
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"pageVisited.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/pageVisited.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:pageVisited'(token, room, pageInfo) {
    RocketChat.Livechat.savePageHistory(token, room, pageInfo);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"registerGuest.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/registerGuest.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:registerGuest'({
    token,
    name,
    email,
    department,
    customFields
  } = {}) {
    const userId = RocketChat.Livechat.registerGuest.call(this, {
      token,
      name,
      email,
      department
    }); // update visited page history to not expire

    RocketChat.models.Messages.keepHistoryForToken(token);
    const visitor = LivechatVisitors.getVisitorByToken(token, {
      fields: {
        token: 1,
        name: 1,
        username: 1,
        visitorEmails: 1,
        department: 1
      }
    }); // If it's updating an existing visitor, it must also update the roomInfo

    const cursor = RocketChat.models.Rooms.findOpenByVisitorToken(token);
    cursor.forEach(room => {
      RocketChat.Livechat.saveRoomInfo(room, visitor);
    });

    if (customFields && customFields instanceof Array) {
      customFields.forEach(customField => {
        if (typeof customField !== 'object') {
          return;
        }

        if (!customField.scope || customField.scope !== 'room') {
          const {
            key,
            value,
            overwrite
          } = customField;
          LivechatVisitors.updateLivechatDataByToken(token, key, value, overwrite);
        }
      });
    }

    return {
      userId,
      visitor
    };
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeAgent.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/removeAgent.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:removeAgent'(username) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:removeAgent'
      });
    }

    return RocketChat.Livechat.removeAgent(username);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeCustomField.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/removeCustomField.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:removeCustomField'(_id) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:removeCustomField'
      });
    }

    check(_id, String);
    const customField = RocketChat.models.LivechatCustomField.findOneById(_id, {
      fields: {
        _id: 1
      }
    });

    if (!customField) {
      throw new Meteor.Error('error-invalid-custom-field', 'Custom field not found', {
        method: 'livechat:removeCustomField'
      });
    }

    return RocketChat.models.LivechatCustomField.removeById(_id);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeDepartment.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/removeDepartment.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:removeDepartment'(_id) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:removeDepartment'
      });
    }

    return RocketChat.Livechat.removeDepartment(_id);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeManager.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/removeManager.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:removeManager'(username) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:removeManager'
      });
    }

    return RocketChat.Livechat.removeManager(username);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeTrigger.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/removeTrigger.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:removeTrigger'(triggerId) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:removeTrigger'
      });
    }

    check(triggerId, String);
    return RocketChat.models.LivechatTrigger.removeById(triggerId);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeRoom.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/removeRoom.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:removeRoom'(rid) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'remove-closed-livechat-rooms')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:removeRoom'
      });
    }

    const room = RocketChat.models.Rooms.findOneById(rid);

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'livechat:removeRoom'
      });
    }

    if (room.t !== 'l') {
      throw new Meteor.Error('error-this-is-not-a-livechat-room', 'This is not a Livechat room', {
        method: 'livechat:removeRoom'
      });
    }

    if (room.open) {
      throw new Meteor.Error('error-room-is-not-closed', 'Room is not closed', {
        method: 'livechat:removeRoom'
      });
    }

    RocketChat.models.Messages.removeByRoomId(rid);
    RocketChat.models.Subscriptions.removeByRoomId(rid);
    return RocketChat.models.Rooms.removeById(rid);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveAppearance.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveAppearance.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:saveAppearance'(settings) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveAppearance'
      });
    }

    const validSettings = ['Livechat_title', 'Livechat_title_color', 'Livechat_show_agent_email', 'Livechat_display_offline_form', 'Livechat_offline_form_unavailable', 'Livechat_offline_message', 'Livechat_offline_success_message', 'Livechat_offline_title', 'Livechat_offline_title_color', 'Livechat_offline_email', 'Livechat_conversation_finished_message', 'Livechat_registration_form', 'Livechat_name_field_registration_form', 'Livechat_email_field_registration_form'];
    const valid = settings.every(setting => validSettings.indexOf(setting._id) !== -1);

    if (!valid) {
      throw new Meteor.Error('invalid-setting');
    }

    settings.forEach(setting => {
      RocketChat.settings.updateById(setting._id, setting.value);
    });
    return;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveCustomField.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveCustomField.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* eslint new-cap: [2, {"capIsNewExceptions": ["Match.ObjectIncluding", "Match.Optional"]}] */
Meteor.methods({
  'livechat:saveCustomField'(_id, customFieldData) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveCustomField'
      });
    }

    if (_id) {
      check(_id, String);
    }

    check(customFieldData, Match.ObjectIncluding({
      field: String,
      label: String,
      scope: String,
      visibility: String
    }));

    if (!/^[0-9a-zA-Z-_]+$/.test(customFieldData.field)) {
      throw new Meteor.Error('error-invalid-custom-field-nmae', 'Invalid custom field name. Use only letters, numbers, hyphens and underscores.', {
        method: 'livechat:saveCustomField'
      });
    }

    if (_id) {
      const customField = RocketChat.models.LivechatCustomField.findOneById(_id);

      if (!customField) {
        throw new Meteor.Error('error-invalid-custom-field', 'Custom Field Not found', {
          method: 'livechat:saveCustomField'
        });
      }
    }

    return RocketChat.models.LivechatCustomField.createOrUpdateCustomField(_id, customFieldData.field, customFieldData.label, customFieldData.scope, customFieldData.visibility);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveDepartment.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveDepartment.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:saveDepartment'(_id, departmentData, departmentAgents) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveDepartment'
      });
    }

    return RocketChat.Livechat.saveDepartment(_id, departmentData, departmentAgents);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveInfo.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveInfo.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* eslint new-cap: [2, {"capIsNewExceptions": ["Match.ObjectIncluding", "Match.Optional"]}] */
Meteor.methods({
  'livechat:saveInfo'(guestData, roomData) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-l-room')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveInfo'
      });
    }

    check(guestData, Match.ObjectIncluding({
      _id: String,
      name: Match.Optional(String),
      email: Match.Optional(String),
      phone: Match.Optional(String)
    }));
    check(roomData, Match.ObjectIncluding({
      _id: String,
      topic: Match.Optional(String),
      tags: Match.Optional(String)
    }));
    const room = RocketChat.models.Rooms.findOneById(roomData._id, {
      fields: {
        t: 1,
        servedBy: 1
      }
    });

    if (room == null || room.t !== 'l') {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'livechat:saveInfo'
      });
    }

    if ((!room.servedBy || room.servedBy._id !== Meteor.userId()) && !RocketChat.authz.hasPermission(Meteor.userId(), 'save-others-livechat-room-info')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveInfo'
      });
    }

    const ret = RocketChat.Livechat.saveGuest(guestData) && RocketChat.Livechat.saveRoomInfo(roomData, guestData);
    Meteor.defer(() => {
      RocketChat.callbacks.run('livechat.saveInfo', RocketChat.models.Rooms.findOneById(roomData._id));
    });
    return ret;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveIntegration.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveIntegration.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
Meteor.methods({
  'livechat:saveIntegration'(values) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveIntegration'
      });
    }

    if (typeof values.Livechat_webhookUrl !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhookUrl', s.trim(values.Livechat_webhookUrl));
    }

    if (typeof values.Livechat_secret_token !== 'undefined') {
      RocketChat.settings.updateById('Livechat_secret_token', s.trim(values.Livechat_secret_token));
    }

    if (typeof values.Livechat_webhook_on_close !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhook_on_close', !!values.Livechat_webhook_on_close);
    }

    if (typeof values.Livechat_webhook_on_offline_msg !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhook_on_offline_msg', !!values.Livechat_webhook_on_offline_msg);
    }

    if (typeof values.Livechat_webhook_on_visitor_message !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhook_on_visitor_message', !!values.Livechat_webhook_on_visitor_message);
    }

    if (typeof values.Livechat_webhook_on_agent_message !== 'undefined') {
      RocketChat.settings.updateById('Livechat_webhook_on_agent_message', !!values.Livechat_webhook_on_agent_message);
    }

    return;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveSurveyFeedback.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveSurveyFeedback.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 1);
Meteor.methods({
  'livechat:saveSurveyFeedback'(visitorToken, visitorRoom, formData) {
    check(visitorToken, String);
    check(visitorRoom, String);
    check(formData, [Match.ObjectIncluding({
      name: String,
      value: String
    })]);
    const visitor = LivechatVisitors.getVisitorByToken(visitorToken);
    const room = RocketChat.models.Rooms.findOneById(visitorRoom);

    if (visitor !== undefined && room !== undefined && room.v !== undefined && room.v.token === visitor.token) {
      const updateData = {};

      for (const item of formData) {
        if (_.contains(['satisfaction', 'agentKnowledge', 'agentResposiveness', 'agentFriendliness'], item.name) && _.contains(['1', '2', '3', '4', '5'], item.value)) {
          updateData[item.name] = item.value;
        } else if (item.name === 'additionalFeedback') {
          updateData[item.name] = item.value;
        }
      }

      if (!_.isEmpty(updateData)) {
        return RocketChat.models.Rooms.updateSurveyFeedbackById(room._id, updateData);
      }
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveTrigger.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveTrigger.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:saveTrigger'(trigger) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveTrigger'
      });
    }

    check(trigger, {
      _id: Match.Maybe(String),
      name: String,
      description: String,
      enabled: Boolean,
      runOnce: Boolean,
      conditions: Array,
      actions: Array
    });

    if (trigger._id) {
      return RocketChat.models.LivechatTrigger.updateById(trigger._id, trigger);
    } else {
      return RocketChat.models.LivechatTrigger.insert(trigger);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"searchAgent.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/searchAgent.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.methods({
  'livechat:searchAgent'(username) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:searchAgent'
      });
    }

    if (!username || !_.isString(username)) {
      throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', {
        method: 'livechat:searchAgent'
      });
    }

    const user = RocketChat.models.Users.findOneByUsername(username, {
      fields: {
        _id: 1,
        username: 1
      }
    });

    if (!user) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'livechat:searchAgent'
      });
    }

    return user;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendMessageLivechat.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/sendMessageLivechat.js                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  sendMessageLivechat({
    token,
    _id,
    rid,
    msg,
    attachments
  }, agent) {
    check(token, String);
    check(_id, String);
    check(rid, String);
    check(msg, String);
    check(agent, Match.Maybe({
      agentId: String,
      username: String
    }));
    const guest = LivechatVisitors.getVisitorByToken(token, {
      fields: {
        name: 1,
        username: 1,
        department: 1,
        token: 1
      }
    });

    if (!guest) {
      throw new Meteor.Error('invalid-token');
    }

    return RocketChat.Livechat.sendMessage({
      guest,
      message: {
        _id,
        rid,
        msg,
        token,
        attachments
      },
      agent
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendFileLivechatMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/sendFileLivechatMessage.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'sendFileLivechatMessage'(roomId, visitorToken, file, msgData = {}) {
    return Promise.asyncApply(() => {
      const visitor = LivechatVisitors.getVisitorByToken(visitorToken);

      if (!visitor) {
        return false;
      }

      const room = RocketChat.models.Rooms.findOneOpenByRoomIdAndVisitorToken(roomId, visitorToken);

      if (!room) {
        return false;
      }

      check(msgData, {
        avatar: Match.Optional(String),
        emoji: Match.Optional(String),
        alias: Match.Optional(String),
        groupable: Match.Optional(Boolean),
        msg: Match.Optional(String)
      });
      const fileUrl = `/file-upload/${file._id}/${encodeURI(file.name)}`;
      const attachment = {
        title: file.name,
        type: 'file',
        description: file.description,
        title_link: fileUrl,
        title_link_download: true
      };

      if (/^image\/.+/.test(file.type)) {
        attachment.image_url = fileUrl;
        attachment.image_type = file.type;
        attachment.image_size = file.size;

        if (file.identify && file.identify.size) {
          attachment.image_dimensions = file.identify.size;
        }

        attachment.image_preview = Promise.await(FileUpload.resizeImagePreview(file));
      } else if (/^audio\/.+/.test(file.type)) {
        attachment.audio_url = fileUrl;
        attachment.audio_type = file.type;
        attachment.audio_size = file.size;
      } else if (/^video\/.+/.test(file.type)) {
        attachment.video_url = fileUrl;
        attachment.video_type = file.type;
        attachment.video_size = file.size;
      }

      const msg = Object.assign({
        _id: Random.id(),
        rid: roomId,
        ts: new Date(),
        msg: '',
        file: {
          _id: file._id,
          name: file.name,
          type: file.type
        },
        groupable: false,
        attachments: [attachment],
        token: visitorToken
      }, msgData);
      return Meteor.call('sendMessageLivechat', msg);
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendOfflineMessage.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/sendOfflineMessage.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals DDPRateLimiter */
Meteor.methods({
  'livechat:sendOfflineMessage'(data) {
    check(data, {
      name: String,
      email: String,
      message: String
    });
    return RocketChat.Livechat.sendOfflineMessage(data);
  }

});
DDPRateLimiter.addRule({
  type: 'method',
  name: 'livechat:sendOfflineMessage',

  connectionId() {
    return true;
  }

}, 1, 5000);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setCustomField.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/setCustomField.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:setCustomField'(token, key, value, overwrite = true) {
    const customField = RocketChat.models.LivechatCustomField.findOneById(key);

    if (customField) {
      if (customField.scope === 'room') {
        return RocketChat.models.Rooms.updateLivechatDataByToken(token, key, value, overwrite);
      } else {
        // Save in user
        return LivechatVisitors.updateLivechatDataByToken(token, key, value, overwrite);
      }
    }

    return true;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setDepartmentForVisitor.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/setDepartmentForVisitor.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:setDepartmentForVisitor'({
    roomId,
    visitorToken,
    departmentId
  } = {}) {
    check(roomId, String);
    check(visitorToken, String);
    check(departmentId, String);
    const room = RocketChat.models.Rooms.findOneById(roomId);
    const visitor = LivechatVisitors.getVisitorByToken(visitorToken);

    if (!room || room.t !== 'l' || !room.v || room.v.token !== visitor.token) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room');
    } // update visited page history to not expire


    RocketChat.models.Messages.keepHistoryForToken(visitorToken);
    const transferData = {
      roomId,
      departmentId
    };
    return RocketChat.Livechat.transfer(room, visitor, transferData);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"startVideoCall.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/startVideoCall.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* eslint new-cap: [2, {"capIsNewExceptions": ["MD5"]}] */
Meteor.methods({
  'livechat:startVideoCall'(roomId) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-not-authorized', 'Not authorized', {
        method: 'livechat:closeByVisitor'
      });
    }

    const guest = Meteor.user();
    const message = {
      _id: Random.id(),
      rid: roomId || Random.id(),
      msg: '',
      ts: new Date()
    };
    const {
      room
    } = RocketChat.Livechat.getRoom(guest, message, {
      jitsiTimeout: new Date(Date.now() + 3600 * 1000)
    });
    message.rid = room._id;
    RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('livechat_video_call', room._id, '', guest, {
      actionLinks: [{
        icon: 'icon-videocam',
        i18nLabel: 'Accept',
        method_id: 'createLivechatCall',
        params: ''
      }, {
        icon: 'icon-cancel',
        i18nLabel: 'Decline',
        method_id: 'denyLivechatCall',
        params: ''
      }]
    });
    return {
      roomId: room._id,
      domain: RocketChat.settings.get('Jitsi_Domain'),
      jitsiRoom: RocketChat.settings.get('Jitsi_URL_Room_Prefix') + RocketChat.settings.get('uniqueID') + roomId
    };
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"startFileUploadRoom.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/startFileUploadRoom.js                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:startFileUploadRoom'(roomId, token) {
    const guest = LivechatVisitors.getVisitorByToken(token);
    const message = {
      _id: Random.id(),
      rid: roomId || Random.id(),
      msg: '',
      ts: new Date(),
      token: guest.token
    };
    return RocketChat.Livechat.getRoom(guest, message);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"transfer.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/transfer.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.methods({
  'livechat:transfer'(transferData) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-l-room')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:transfer'
      });
    }

    check(transferData, {
      roomId: String,
      userId: Match.Optional(String),
      departmentId: Match.Optional(String)
    });
    const room = RocketChat.models.Rooms.findOneById(transferData.roomId);
    const guest = LivechatVisitors.findOneById(room.v._id);
    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, Meteor.userId(), {
      fields: {
        _id: 1
      }
    });

    if (!subscription && !RocketChat.authz.hasRole(Meteor.userId(), 'livechat-manager')) {
      throw new Meteor.Error('error-not-authorized', 'Not authorized', {
        method: 'livechat:transfer'
      });
    }

    return RocketChat.Livechat.transfer(room, guest, transferData);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"webhookTest.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/webhookTest.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals HTTP */
const postCatchError = Meteor.wrapAsync(function (url, options, resolve) {
  HTTP.post(url, options, function (err, res) {
    if (err) {
      resolve(null, err.response);
    } else {
      resolve(null, res);
    }
  });
});
Meteor.methods({
  'livechat:webhookTest'() {
    this.unblock();
    const sampleData = {
      type: 'LivechatSession',
      _id: 'fasd6f5a4sd6f8a4sdf',
      label: 'title',
      topic: 'asiodojf',
      createdAt: new Date(),
      lastMessageAt: new Date(),
      tags: ['tag1', 'tag2', 'tag3'],
      customFields: {
        productId: '123456'
      },
      visitor: {
        _id: '',
        name: 'visitor name',
        username: 'visitor-username',
        department: 'department',
        email: 'email@address.com',
        phone: '192873192873',
        ip: '123.456.7.89',
        browser: 'Chrome',
        os: 'Linux',
        customFields: {
          customerId: '123456'
        }
      },
      agent: {
        _id: 'asdf89as6df8',
        username: 'agent.username',
        name: 'Agent Name',
        email: 'agent@email.com'
      },
      messages: [{
        username: 'visitor-username',
        msg: 'message content',
        ts: new Date()
      }, {
        username: 'agent.username',
        agentId: 'asdf89as6df8',
        msg: 'message content from agent',
        ts: new Date()
      }]
    };
    const options = {
      headers: {
        'X-RocketChat-Livechat-Token': RocketChat.settings.get('Livechat_secret_token')
      },
      data: sampleData
    };
    const response = postCatchError(RocketChat.settings.get('Livechat_webhookUrl'), options);
    console.log('response ->', response);

    if (response && response.statusCode && response.statusCode === 200) {
      return true;
    } else {
      throw new Meteor.Error('error-invalid-webhook-response');
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"takeInquiry.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/takeInquiry.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:takeInquiry'(inquiryId) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-l-room')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:takeInquiry'
      });
    }

    const inquiry = RocketChat.models.LivechatInquiry.findOneById(inquiryId);

    if (!inquiry || inquiry.status === 'taken') {
      throw new Meteor.Error('error-not-allowed', 'Inquiry already taken', {
        method: 'livechat:takeInquiry'
      });
    }

    const user = RocketChat.models.Users.findOneById(Meteor.userId());
    const agent = {
      agentId: user._id,
      username: user.username,
      ts: new Date()
    }; // add subscription

    const subscriptionData = {
      rid: inquiry.rid,
      name: inquiry.name,
      alert: true,
      open: true,
      unread: 1,
      userMentions: 1,
      groupMentions: 0,
      u: {
        _id: agent.agentId,
        username: agent.username
      },
      t: 'l',
      desktopNotifications: 'all',
      mobilePushNotifications: 'all',
      emailNotifications: 'all'
    };
    RocketChat.models.Subscriptions.insert(subscriptionData);
    RocketChat.models.Rooms.incUsersCountById(inquiry.rid); // update room

    const room = RocketChat.models.Rooms.findOneById(inquiry.rid);
    RocketChat.models.Rooms.changeAgentByRoomId(inquiry.rid, agent);
    room.servedBy = {
      _id: agent.agentId,
      username: agent.username,
      ts: agent.ts
    }; // mark inquiry as taken

    RocketChat.models.LivechatInquiry.takeInquiry(inquiry._id); // remove sending message from guest widget
    // dont check if setting is true, because if settingwas switched off inbetween  guest entered pool,
    // and inquiry being taken, message would not be switched off.

    RocketChat.models.Messages.createCommandWithRoomIdAndUser('connected', room._id, user);
    RocketChat.Livechat.stream.emit(room._id, {
      type: 'agentData',
      data: RocketChat.models.Users.getAgentInfo(agent.agentId)
    }); // return inquiry (for redirecting agent to the room route)

    return inquiry;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"returnAsInquiry.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/returnAsInquiry.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:returnAsInquiry'(rid, departmentId) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-l-room')) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'livechat:saveDepartment'
      });
    }

    return RocketChat.Livechat.returnRoomAsInquiry(rid, departmentId);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveOfficeHours.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/saveOfficeHours.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.methods({
  'livechat:saveOfficeHours'(day, start, finish, open) {
    RocketChat.models.LivechatOfficeHour.updateHours(day, start, finish, open);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendTranscript.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/methods/sendTranscript.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals DDPRateLimiter */
Meteor.methods({
  'livechat:sendTranscript'(token, rid, email) {
    check(rid, String);
    check(email, String);
    return RocketChat.Livechat.sendTranscript({
      token,
      rid,
      email
    });
  }

});
DDPRateLimiter.addRule({
  type: 'method',
  name: 'livechat:sendTranscript',

  connectionId() {
    return true;
  }

}, 1, 5000);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"models":{"Users.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/Users.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * Sets an user as (non)operator
 * @param {string} _id - User's _id
 * @param {boolean} operator - Flag to set as operator or not
 */
RocketChat.models.Users.setOperator = function (_id, operator) {
  const update = {
    $set: {
      operator
    }
  };
  return this.update(_id, update);
};
/**
 * Gets all online agents
 * @return
 */


RocketChat.models.Users.findOnlineAgents = function () {
  const query = {
    status: {
      $exists: true,
      $ne: 'offline'
    },
    statusLivechat: 'available',
    roles: 'livechat-agent'
  };
  return this.find(query);
};
/**
 * Find an online agent by his username
 * @return
 */


RocketChat.models.Users.findOneOnlineAgentByUsername = function (username) {
  const query = {
    username,
    status: {
      $exists: true,
      $ne: 'offline'
    },
    statusLivechat: 'available',
    roles: 'livechat-agent'
  };
  return this.findOne(query);
};
/**
 * Gets all agents
 * @return
 */


RocketChat.models.Users.findAgents = function () {
  const query = {
    roles: 'livechat-agent'
  };
  return this.find(query);
};
/**
 * Find online users from a list
 * @param {array} userList - array of usernames
 * @return
 */


RocketChat.models.Users.findOnlineUserFromList = function (userList) {
  const query = {
    status: {
      $exists: true,
      $ne: 'offline'
    },
    statusLivechat: 'available',
    roles: 'livechat-agent',
    username: {
      $in: [].concat(userList)
    }
  };
  return this.find(query);
};
/**
 * Get next user agent in order
 * @return {object} User from db
 */


RocketChat.models.Users.getNextAgent = function () {
  const query = {
    status: {
      $exists: true,
      $ne: 'offline'
    },
    statusLivechat: 'available',
    roles: 'livechat-agent'
  };
  const collectionObj = this.model.rawCollection();
  const findAndModify = Meteor.wrapAsync(collectionObj.findAndModify, collectionObj);
  const sort = {
    livechatCount: 1,
    username: 1
  };
  const update = {
    $inc: {
      livechatCount: 1
    }
  };
  const user = findAndModify(query, sort, update);

  if (user && user.value) {
    return {
      agentId: user.value._id,
      username: user.value.username
    };
  } else {
    return null;
  }
};
/**
 * Change user's livechat status
 * @param {string} token - Visitor token
 */


RocketChat.models.Users.setLivechatStatus = function (userId, status) {
  const query = {
    _id: userId
  };
  const update = {
    $set: {
      statusLivechat: status
    }
  };
  return this.update(query, update);
};
/**
 * change all livechat agents livechat status to "not-available"
 */


RocketChat.models.Users.closeOffice = function () {
  self = this;
  self.findAgents().forEach(function (agent) {
    self.setLivechatStatus(agent._id, 'not-available');
  });
};
/**
 * change all livechat agents livechat status to "available"
 */


RocketChat.models.Users.openOffice = function () {
  self = this;
  self.findAgents().forEach(function (agent) {
    self.setLivechatStatus(agent._id, 'available');
  });
};

RocketChat.models.Users.getAgentInfo = function (agentId) {
  const query = {
    _id: agentId
  };
  const options = {
    fields: {
      name: 1,
      username: 1,
      phone: 1,
      customFields: 1
    }
  };

  if (RocketChat.settings.get('Livechat_show_agent_email')) {
    options.fields.emails = 1;
  }

  return this.findOne(query, options);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Rooms.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/Rooms.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

/**
 * Gets visitor by token
 * @param {string} token - Visitor token
 */
RocketChat.models.Rooms.updateSurveyFeedbackById = function (_id, surveyFeedback) {
  const query = {
    _id
  };
  const update = {
    $set: {
      surveyFeedback
    }
  };
  return this.update(query, update);
};

RocketChat.models.Rooms.updateLivechatDataByToken = function (token, key, value, overwrite = true) {
  const query = {
    'v.token': token,
    open: true
  };

  if (!overwrite) {
    const room = this.findOne(query, {
      fields: {
        livechatData: 1
      }
    });

    if (room.livechatData && typeof room.livechatData[key] !== 'undefined') {
      return true;
    }
  }

  const update = {
    $set: {
      [`livechatData.${key}`]: value
    }
  };
  return this.update(query, update);
};

RocketChat.models.Rooms.findLivechat = function (filter = {}, offset = 0, limit = 20) {
  const query = _.extend(filter, {
    t: 'l'
  });

  return this.find(query, {
    sort: {
      ts: -1
    },
    offset,
    limit
  });
};

RocketChat.models.Rooms.findLivechatById = function (_id, fields) {
  const options = {};

  if (fields) {
    options.fields = fields;
  }

  const query = {
    t: 'l',
    _id
  };
  return this.find(query, options);
};

RocketChat.models.Rooms.findLivechatByIdAndVisitorToken = function (_id, visitorToken, fields) {
  const options = {};

  if (fields) {
    options.fields = fields;
  }

  const query = {
    t: 'l',
    _id,
    'v.token': visitorToken
  };
  return this.findOne(query, options);
};

RocketChat.models.Rooms.findLivechatByVisitorToken = function (visitorToken, fields) {
  const options = {};

  if (fields) {
    options.fields = fields;
  }

  const query = {
    t: 'l',
    'v.token': visitorToken
  };
  return this.findOne(query, options);
};
/**
 * Get the next visitor name
 * @return {string} The next visitor name
 */


RocketChat.models.Rooms.updateLivechatRoomCount = function () {
  const settingsRaw = RocketChat.models.Settings.model.rawCollection();
  const findAndModify = Meteor.wrapAsync(settingsRaw.findAndModify, settingsRaw);
  const query = {
    _id: 'Livechat_Room_Count'
  };
  const update = {
    $inc: {
      value: 1
    }
  };
  const livechatCount = findAndModify(query, null, update);
  return livechatCount.value.value;
};

RocketChat.models.Rooms.findOpenByVisitorToken = function (visitorToken, options) {
  const query = {
    open: true,
    'v.token': visitorToken
  };
  return this.find(query, options);
};

RocketChat.models.Rooms.findOpenByVisitorTokenAndDepartmentId = function (visitorToken, departmentId, options) {
  const query = {
    open: true,
    'v.token': visitorToken,
    departmentId
  };
  return this.find(query, options);
};

RocketChat.models.Rooms.findByVisitorToken = function (visitorToken) {
  const query = {
    'v.token': visitorToken
  };
  return this.find(query);
};

RocketChat.models.Rooms.findByVisitorId = function (visitorId) {
  const query = {
    'v._id': visitorId
  };
  return this.find(query);
};

RocketChat.models.Rooms.findOneOpenByRoomIdAndVisitorToken = function (roomId, visitorToken, options) {
  const query = {
    _id: roomId,
    open: true,
    'v.token': visitorToken
  };
  return this.findOne(query, options);
};

RocketChat.models.Rooms.setResponseByRoomId = function (roomId, response) {
  return this.update({
    _id: roomId
  }, {
    $set: {
      responseBy: {
        _id: response.user._id,
        username: response.user.username
      }
    },
    $unset: {
      waitingResponse: 1
    }
  });
};

RocketChat.models.Rooms.saveAnalyticsDataByRoomId = function (room, message, analyticsData) {
  const update = {
    $set: {}
  };

  if (analyticsData) {
    update.$set['metrics.response.avg'] = analyticsData.avgResponseTime;
    update.$inc = {};
    update.$inc['metrics.response.total'] = 1;
    update.$inc['metrics.response.tt'] = analyticsData.responseTime;
    update.$inc['metrics.reaction.tt'] = analyticsData.reactionTime;
  }

  if (analyticsData && analyticsData.firstResponseTime) {
    update.$set['metrics.response.fd'] = analyticsData.firstResponseDate;
    update.$set['metrics.response.ft'] = analyticsData.firstResponseTime;
    update.$set['metrics.reaction.fd'] = analyticsData.firstReactionDate;
    update.$set['metrics.reaction.ft'] = analyticsData.firstReactionTime;
  } // livechat analytics : update last message timestamps


  const visitorLastQuery = room.metrics && room.metrics.v ? room.metrics.v.lq : room.ts;
  const agentLastReply = room.metrics && room.metrics.servedBy ? room.metrics.servedBy.lr : room.ts;

  if (message.token) {
    // update visitor timestamp, only if its new inquiry and not continuing message
    if (agentLastReply >= visitorLastQuery) {
      // if first query, not continuing query from visitor
      update.$set['metrics.v.lq'] = message.ts;
    }
  } else if (visitorLastQuery > agentLastReply) {
    // update agent timestamp, if first response, not continuing
    update.$set['metrics.servedBy.lr'] = message.ts;
  }

  return this.update({
    _id: room._id
  }, update);
};
/**
 * total no of conversations between date.
 * @param {string, {ISODate, ISODate}} t - string, room type. date.gte - ISODate (ts >= date.gte), date.lt- ISODate (ts < date.lt)
 * @return {int}
 */


RocketChat.models.Rooms.getTotalConversationsBetweenDate = function (t, date) {
  const query = {
    t,
    ts: {
      $gte: new Date(date.gte),
      // ISO Date, ts >= date.gte
      $lt: new Date(date.lt) // ISODate, ts < date.lt

    }
  };
  return this.find(query).count();
};

RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate = function (t, date) {
  const query = {
    t,
    ts: {
      $gte: new Date(date.gte),
      // ISO Date, ts >= date.gte
      $lt: new Date(date.lt) // ISODate, ts < date.lt

    }
  };
  return this.find(query, {
    fields: {
      ts: 1,
      departmentId: 1,
      open: 1,
      servedBy: 1,
      metrics: 1,
      msgs: 1
    }
  });
};

RocketChat.models.Rooms.closeByRoomId = function (roomId, closeInfo) {
  return this.update({
    _id: roomId
  }, {
    $set: {
      closer: closeInfo.closer,
      closedBy: closeInfo.closedBy,
      closedAt: closeInfo.closedAt,
      'metrics.chatDuration': closeInfo.chatDuration,
      'v.status': 'offline'
    },
    $unset: {
      open: 1
    }
  });
};

RocketChat.models.Rooms.findOpenByAgent = function (userId) {
  const query = {
    open: true,
    'servedBy._id': userId
  };
  return this.find(query);
};

RocketChat.models.Rooms.changeAgentByRoomId = function (roomId, newAgent) {
  const query = {
    _id: roomId
  };
  const update = {
    $set: {
      servedBy: {
        _id: newAgent.agentId,
        username: newAgent.username,
        ts: new Date()
      }
    }
  };

  if (newAgent.ts) {
    update.$set.servedBy.ts = newAgent.ts;
  }

  this.update(query, update);
};

RocketChat.models.Rooms.changeDepartmentIdByRoomId = function (roomId, departmentId) {
  const query = {
    _id: roomId
  };
  const update = {
    $set: {
      departmentId
    }
  };
  this.update(query, update);
};

RocketChat.models.Rooms.saveCRMDataByRoomId = function (roomId, crmData) {
  const query = {
    _id: roomId
  };
  const update = {
    $set: {
      crmData
    }
  };
  return this.update(query, update);
};

RocketChat.models.Rooms.updateVisitorStatus = function (token, status) {
  const query = {
    'v.token': token,
    open: true
  };
  const update = {
    $set: {
      'v.status': status
    }
  };
  return this.update(query, update);
};

RocketChat.models.Rooms.removeAgentByRoomId = function (roomId) {
  const query = {
    _id: roomId
  };
  const update = {
    $unset: {
      servedBy: 1
    }
  };
  this.update(query, update);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Messages.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/Messages.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.models.Messages.keepHistoryForToken = function (token) {
  return this.update({
    'navigation.token': token,
    expireAt: {
      $exists: true
    }
  }, {
    $unset: {
      expireAt: 1
    }
  }, {
    multi: true
  });
};

RocketChat.models.Messages.setRoomIdByToken = function (token, rid) {
  return this.update({
    'navigation.token': token,
    rid: null
  }, {
    $set: {
      rid
    }
  }, {
    multi: true
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatExternalMessage.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatExternalMessage.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
class LivechatExternalMessage extends RocketChat.models._Base {
  constructor() {
    super('livechat_external_message');

    if (Meteor.isClient) {
      this._initModel('livechat_external_message');
    }
  } // FIND


  findByRoomId(roomId, sort = {
    ts: -1
  }) {
    const query = {
      rid: roomId
    };
    return this.find(query, {
      sort
    });
  }

}

RocketChat.models.LivechatExternalMessage = new LivechatExternalMessage();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatCustomField.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatCustomField.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

/**
 * Livechat Custom Fields model
 */
class LivechatCustomField extends RocketChat.models._Base {
  constructor() {
    super('livechat_custom_field');
  } // FIND


  findOneById(_id, options) {
    const query = {
      _id
    };
    return this.findOne(query, options);
  }

  createOrUpdateCustomField(_id, field, label, scope, visibility, extraData) {
    const record = {
      label,
      scope,
      visibility
    };

    _.extend(record, extraData);

    if (_id) {
      this.update({
        _id
      }, {
        $set: record
      });
    } else {
      record._id = field;
      _id = this.insert(record);
    }

    return record;
  } // REMOVE


  removeById(_id) {
    const query = {
      _id
    };
    return this.remove(query);
  }

}

RocketChat.models.LivechatCustomField = new LivechatCustomField();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatDepartment.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatDepartment.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

/**
 * Livechat Department model
 */
class LivechatDepartment extends RocketChat.models._Base {
  constructor() {
    super('livechat_department');
    this.tryEnsureIndex({
      numAgents: 1,
      enabled: 1
    });
  } // FIND


  findOneById(_id, options) {
    const query = {
      _id
    };
    return this.findOne(query, options);
  }

  findByDepartmentId(_id, options) {
    const query = {
      _id
    };
    return this.find(query, options);
  }

  createOrUpdateDepartment(_id, {
    enabled,
    name,
    description,
    showOnRegistration
  }, agents) {
    agents = [].concat(agents);
    const record = {
      enabled,
      name,
      description,
      numAgents: agents.length,
      showOnRegistration
    };

    if (_id) {
      this.update({
        _id
      }, {
        $set: record
      });
    } else {
      _id = this.insert(record);
    }

    const savedAgents = _.pluck(RocketChat.models.LivechatDepartmentAgents.findByDepartmentId(_id).fetch(), 'agentId');

    const agentsToSave = _.pluck(agents, 'agentId'); // remove other agents


    _.difference(savedAgents, agentsToSave).forEach(agentId => {
      RocketChat.models.LivechatDepartmentAgents.removeByDepartmentIdAndAgentId(_id, agentId);
    });

    agents.forEach(agent => {
      RocketChat.models.LivechatDepartmentAgents.saveAgent({
        agentId: agent.agentId,
        departmentId: _id,
        username: agent.username,
        count: agent.count ? parseInt(agent.count) : 0,
        order: agent.order ? parseInt(agent.order) : 0
      });
    });
    return _.extend(record, {
      _id
    });
  } // REMOVE


  removeById(_id) {
    const query = {
      _id
    };
    return this.remove(query);
  }

  findEnabledWithAgents() {
    const query = {
      numAgents: {
        $gt: 0
      },
      enabled: true
    };
    return this.find(query);
  }

}

RocketChat.models.LivechatDepartment = new LivechatDepartment();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatDepartmentAgents.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatDepartmentAgents.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

/**
 * Livechat Department model
 */
class LivechatDepartmentAgents extends RocketChat.models._Base {
  constructor() {
    super('livechat_department_agents');
  }

  findByDepartmentId(departmentId) {
    return this.find({
      departmentId
    });
  }

  saveAgent(agent) {
    return this.upsert({
      agentId: agent.agentId,
      departmentId: agent.departmentId
    }, {
      $set: {
        username: agent.username,
        count: parseInt(agent.count),
        order: parseInt(agent.order)
      }
    });
  }

  removeByDepartmentIdAndAgentId(departmentId, agentId) {
    this.remove({
      departmentId,
      agentId
    });
  }

  getNextAgentForDepartment(departmentId) {
    const agents = this.findByDepartmentId(departmentId).fetch();

    if (agents.length === 0) {
      return;
    }

    const onlineUsers = RocketChat.models.Users.findOnlineUserFromList(_.pluck(agents, 'username'));

    const onlineUsernames = _.pluck(onlineUsers.fetch(), 'username');

    const query = {
      departmentId,
      username: {
        $in: onlineUsernames
      }
    };
    const sort = {
      count: 1,
      order: 1,
      username: 1
    };
    const update = {
      $inc: {
        count: 1
      }
    };
    const collectionObj = this.model.rawCollection();
    const findAndModify = Meteor.wrapAsync(collectionObj.findAndModify, collectionObj);
    const agent = findAndModify(query, sort, update);

    if (agent && agent.value) {
      return {
        agentId: agent.value.agentId,
        username: agent.value.username
      };
    } else {
      return null;
    }
  }

  getOnlineForDepartment(departmentId) {
    const agents = this.findByDepartmentId(departmentId).fetch();

    if (agents.length === 0) {
      return [];
    }

    const onlineUsers = RocketChat.models.Users.findOnlineUserFromList(_.pluck(agents, 'username'));

    const onlineUsernames = _.pluck(onlineUsers.fetch(), 'username');

    const query = {
      departmentId,
      username: {
        $in: onlineUsernames
      }
    };
    const depAgents = this.find(query);

    if (depAgents) {
      return depAgents;
    } else {
      return [];
    }
  }

  findUsersInQueue(usersList) {
    const query = {};

    if (!_.isEmpty(usersList)) {
      query.username = {
        $in: usersList
      };
    }

    const options = {
      sort: {
        departmentId: 1,
        count: 1,
        order: 1,
        username: 1
      }
    };
    return this.find(query, options);
  }

  replaceUsernameOfAgentByUserId(userId, username) {
    const query = {
      agentId: userId
    };
    const update = {
      $set: {
        username
      }
    };
    return this.update(query, update, {
      multi: true
    });
  }

}

RocketChat.models.LivechatDepartmentAgents = new LivechatDepartmentAgents();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatPageVisited.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatPageVisited.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * Livechat Page Visited model
 */
class LivechatPageVisited extends RocketChat.models._Base {
  constructor() {
    super('livechat_page_visited');
    this.tryEnsureIndex({
      token: 1
    });
    this.tryEnsureIndex({
      ts: 1
    }); // keep history for 1 month if the visitor does not register

    this.tryEnsureIndex({
      expireAt: 1
    }, {
      sparse: 1,
      expireAfterSeconds: 0
    });
  }

  saveByToken(token, pageInfo) {
    // keep history of unregistered visitors for 1 month
    const keepHistoryMiliseconds = 2592000000;
    return this.insert({
      token,
      page: pageInfo,
      ts: new Date(),
      expireAt: new Date().getTime() + keepHistoryMiliseconds
    });
  }

  findByToken(token) {
    return this.find({
      token
    }, {
      sort: {
        ts: -1
      },
      limit: 20
    });
  }

  keepHistoryForToken(token) {
    return this.update({
      token,
      expireAt: {
        $exists: true
      }
    }, {
      $unset: {
        expireAt: 1
      }
    }, {
      multi: true
    });
  }

}

RocketChat.models.LivechatPageVisited = new LivechatPageVisited();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatTrigger.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatTrigger.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * Livechat Trigger model
 */
class LivechatTrigger extends RocketChat.models._Base {
  constructor() {
    super('livechat_trigger');
  }

  updateById(_id, data) {
    return this.update({
      _id
    }, {
      $set: data
    });
  }

  removeAll() {
    return this.remove({});
  }

  findById(_id) {
    return this.find({
      _id
    });
  }

  removeById(_id) {
    return this.remove({
      _id
    });
  }

  findEnabled() {
    return this.find({
      enabled: true
    });
  }

}

RocketChat.models.LivechatTrigger = new LivechatTrigger();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"indexes.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/indexes.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.startup(function () {
  RocketChat.models.Rooms.tryEnsureIndex({
    open: 1
  }, {
    sparse: 1
  });
  RocketChat.models.Rooms.tryEnsureIndex({
    departmentId: 1
  }, {
    sparse: 1
  });
  RocketChat.models.Users.tryEnsureIndex({
    'visitorEmails.address': 1
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatInquiry.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatInquiry.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
class LivechatInquiry extends RocketChat.models._Base {
  constructor() {
    super('livechat_inquiry');
    this.tryEnsureIndex({
      rid: 1
    }); // room id corresponding to this inquiry

    this.tryEnsureIndex({
      name: 1
    }); // name of the inquiry (client name for now)

    this.tryEnsureIndex({
      message: 1
    }); // message sent by the client

    this.tryEnsureIndex({
      ts: 1
    }); // timestamp

    this.tryEnsureIndex({
      agents: 1
    }); // Id's of the agents who can see the inquiry (handle departments)

    this.tryEnsureIndex({
      status: 1
    }); // 'open', 'taken'
  }

  findOneById(inquiryId) {
    return this.findOne({
      _id: inquiryId
    });
  }
  /*
   * mark the inquiry as taken
   */


  takeInquiry(inquiryId) {
    this.update({
      _id: inquiryId
    }, {
      $set: {
        status: 'taken'
      }
    });
  }
  /*
   * mark the inquiry as closed
   */


  closeByRoomId(roomId, closeInfo) {
    return this.update({
      rid: roomId
    }, {
      $set: {
        status: 'closed',
        closer: closeInfo.closer,
        closedBy: closeInfo.closedBy,
        closedAt: closeInfo.closedAt,
        'metrics.chatDuration': closeInfo.chatDuration
      }
    });
  }
  /*
   * mark inquiry as open
   */


  openInquiry(inquiryId) {
    return this.update({
      _id: inquiryId
    }, {
      $set: {
        status: 'open'
      }
    });
  }
  /*
   * mark inquiry as open and set agents
   */


  openInquiryWithAgents(inquiryId, agentIds) {
    return this.update({
      _id: inquiryId
    }, {
      $set: {
        status: 'open',
        agents: agentIds
      }
    });
  }
  /*
   * return the status of the inquiry (open or taken)
   */


  getStatus(inquiryId) {
    return this.findOne({
      _id: inquiryId
    }).status;
  }

  updateVisitorStatus(token, status) {
    const query = {
      'v.token': token,
      status: 'open'
    };
    const update = {
      $set: {
        'v.status': status
      }
    };
    return this.update(query, update);
  }

}

RocketChat.models.LivechatInquiry = new LivechatInquiry();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatOfficeHour.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatOfficeHour.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 0);

class LivechatOfficeHour extends RocketChat.models._Base {
  constructor() {
    super('livechat_office_hour');
    this.tryEnsureIndex({
      day: 1
    }); // the day of the week monday - sunday

    this.tryEnsureIndex({
      start: 1
    }); // the opening hours of the office

    this.tryEnsureIndex({
      finish: 1
    }); // the closing hours of the office

    this.tryEnsureIndex({
      open: 1
    }); // whether or not the offices are open on this day
    // if there is nothing in the collection, add defaults

    if (this.find().count() === 0) {
      this.insert({
        day: 'Monday',
        start: '08:00',
        finish: '20:00',
        code: 1,
        open: true
      });
      this.insert({
        day: 'Tuesday',
        start: '08:00',
        finish: '20:00',
        code: 2,
        open: true
      });
      this.insert({
        day: 'Wednesday',
        start: '08:00',
        finish: '20:00',
        code: 3,
        open: true
      });
      this.insert({
        day: 'Thursday',
        start: '08:00',
        finish: '20:00',
        code: 4,
        open: true
      });
      this.insert({
        day: 'Friday',
        start: '08:00',
        finish: '20:00',
        code: 5,
        open: true
      });
      this.insert({
        day: 'Saturday',
        start: '08:00',
        finish: '20:00',
        code: 6,
        open: false
      });
      this.insert({
        day: 'Sunday',
        start: '08:00',
        finish: '20:00',
        code: 0,
        open: false
      });
    }
  }
  /*
   * update the given days start and finish times and whether the office is open on that day
   */


  updateHours(day, newStart, newFinish, newOpen) {
    this.update({
      day
    }, {
      $set: {
        start: newStart,
        finish: newFinish,
        open: newOpen
      }
    });
  }
  /*
   * Check if the current server time (utc) is within the office hours of that day
   * returns true or false
   */


  isNowWithinHours() {
    // get current time on server in utc
    // var ct = moment().utc();
    const currentTime = moment.utc(moment().utc().format('dddd:HH:mm'), 'dddd:HH:mm'); // get todays office hours from db

    const todaysOfficeHours = this.findOne({
      day: currentTime.format('dddd')
    });

    if (!todaysOfficeHours) {
      return false;
    } // check if offices are open today


    if (todaysOfficeHours.open === false) {
      return false;
    }

    const start = moment.utc(`${todaysOfficeHours.day}:${todaysOfficeHours.start}`, 'dddd:HH:mm');
    const finish = moment.utc(`${todaysOfficeHours.day}:${todaysOfficeHours.finish}`, 'dddd:HH:mm'); // console.log(finish.isBefore(start));

    if (finish.isBefore(start)) {
      // finish.day(finish.day()+1);
      finish.add(1, 'days');
    }

    const result = currentTime.isBetween(start, finish); // inBetween  check

    return result;
  }

  isOpeningTime() {
    // get current time on server in utc
    const currentTime = moment.utc(moment().utc().format('dddd:HH:mm'), 'dddd:HH:mm'); // get todays office hours from db

    const todaysOfficeHours = this.findOne({
      day: currentTime.format('dddd')
    });

    if (!todaysOfficeHours) {
      return false;
    } // check if offices are open today


    if (todaysOfficeHours.open === false) {
      return false;
    }

    const start = moment.utc(`${todaysOfficeHours.day}:${todaysOfficeHours.start}`, 'dddd:HH:mm');
    return start.isSame(currentTime, 'minute');
  }

  isClosingTime() {
    // get current time on server in utc
    const currentTime = moment.utc(moment().utc().format('dddd:HH:mm'), 'dddd:HH:mm'); // get todays office hours from db

    const todaysOfficeHours = this.findOne({
      day: currentTime.format('dddd')
    });

    if (!todaysOfficeHours) {
      return false;
    }

    const finish = moment.utc(`${todaysOfficeHours.day}:${todaysOfficeHours.finish}`, 'dddd:HH:mm');
    return finish.isSame(currentTime, 'minute');
  }

}

RocketChat.models.LivechatOfficeHour = new LivechatOfficeHour();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LivechatVisitors.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/models/LivechatVisitors.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 1);

class LivechatVisitors extends RocketChat.models._Base {
  constructor() {
    super('livechat_visitor');
  }
  /**
   * Gets visitor by token
   * @param {string} token - Visitor token
   */


  getVisitorByToken(token, options) {
    const query = {
      token
    };
    return this.findOne(query, options);
  }
  /**
   * Find visitors by _id
   * @param {string} token - Visitor token
   */


  findById(_id, options) {
    const query = {
      _id
    };
    return this.find(query, options);
  }
  /**
   * Gets visitor by token
   * @param {string} token - Visitor token
   */


  findVisitorByToken(token) {
    const query = {
      token
    };
    return this.find(query);
  }

  updateLivechatDataByToken(token, key, value, overwrite = true) {
    const query = {
      token
    };

    if (!overwrite) {
      const user = this.findOne(query, {
        fields: {
          livechatData: 1
        }
      });

      if (user.livechatData && typeof user.livechatData[key] !== 'undefined') {
        return true;
      }
    }

    const update = {
      $set: {
        [`livechatData.${key}`]: value
      }
    };
    return this.update(query, update);
  }
  /**
   * Find a visitor by their phone number
   * @return {object} User from db
   */


  findOneVisitorByPhone(phone) {
    const query = {
      'phone.phoneNumber': phone
    };
    return this.findOne(query);
  }

  getVisitorsBetweenDate(date) {
    const query = {
      _updatedAt: {
        $gte: date.gte,
        // ISO Date, ts >= date.gte
        $lt: date.lt // ISODate, ts < date.lt

      }
    };
    return this.find(query, {
      fields: {
        _id: 1
      }
    });
  }
  /**
   * Get the next visitor name
   * @return {string} The next visitor name
   */


  getNextVisitorUsername() {
    const settingsRaw = RocketChat.models.Settings.model.rawCollection();
    const findAndModify = Meteor.wrapAsync(settingsRaw.findAndModify, settingsRaw);
    const query = {
      _id: 'Livechat_guest_count'
    };
    const update = {
      $inc: {
        value: 1
      }
    };
    const livechatCount = findAndModify(query, null, update);
    return `guest-${livechatCount.value.value + 1}`;
  }

  updateById(_id, update) {
    return this.update({
      _id
    }, update);
  }

  saveGuestById(_id, data) {
    const setData = {};
    const unsetData = {};

    if (data.name) {
      if (!_.isEmpty(s.trim(data.name))) {
        setData.name = s.trim(data.name);
      } else {
        unsetData.name = 1;
      }
    }

    if (data.email) {
      if (!_.isEmpty(s.trim(data.email))) {
        setData.visitorEmails = [{
          address: s.trim(data.email)
        }];
      } else {
        unsetData.visitorEmails = 1;
      }
    }

    if (data.phone) {
      if (!_.isEmpty(s.trim(data.phone))) {
        setData.phone = [{
          phoneNumber: s.trim(data.phone)
        }];
      } else {
        unsetData.phone = 1;
      }
    }

    const update = {};

    if (!_.isEmpty(setData)) {
      update.$set = setData;
    }

    if (!_.isEmpty(unsetData)) {
      update.$unset = unsetData;
    }

    if (_.isEmpty(update)) {
      return true;
    }

    return this.update({
      _id
    }, update);
  }

  findOneGuestByEmailAddress(emailAddress) {
    const query = {
      'visitorEmails.address': new RegExp(`^${s.escapeRegExp(emailAddress)}$`, 'i')
    };
    return this.findOne(query);
  }

  saveGuestEmailPhoneById(_id, emails, phones) {
    const update = {
      $addToSet: {}
    };
    const saveEmail = [].concat(emails).filter(email => email && email.trim()).map(email => ({
      address: email
    }));

    if (saveEmail.length > 0) {
      update.$addToSet.visitorEmails = {
        $each: saveEmail
      };
    }

    const savePhone = [].concat(phones).filter(phone => phone && phone.trim().replace(/[^\d]/g, '')).map(phone => ({
      phoneNumber: phone
    }));

    if (savePhone.length > 0) {
      update.$addToSet.phone = {
        $each: savePhone
      };
    }

    if (!update.$addToSet.visitorEmails && !update.$addToSet.phone) {
      return;
    }

    return this.update({
      _id
    }, update);
  }

}

module.exportDefault(new LivechatVisitors());
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lib":{"Analytics.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/lib/Analytics.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Analytics: () => Analytics
});
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 0);

/**
 * return readable time format from seconds
 * @param  {Double} sec seconds
 * @return {String}     Readable string format
 */
const secondsToHHMMSS = sec => {
  sec = parseFloat(sec);
  let hours = Math.floor(sec / 3600);
  let minutes = Math.floor((sec - hours * 3600) / 60);
  let seconds = Math.round(sec - hours * 3600 - minutes * 60);

  if (hours < 10) {
    hours = `0${hours}`;
  }

  if (minutes < 10) {
    minutes = `0${minutes}`;
  }

  if (seconds < 10) {
    seconds = `0${seconds}`;
  }

  if (hours > 0) {
    return `${hours}:${minutes}:${seconds}`;
  }

  if (minutes > 0) {
    return `${minutes}:${seconds}`;
  }

  return sec;
};

const Analytics = {
  getAgentOverviewData(options) {
    const from = moment(options.daterange.from);
    const to = moment(options.daterange.to);

    if (!(moment(from).isValid() && moment(to).isValid())) {
      console.log('livechat:getAgentOverviewData => Invalid dates');
      return;
    }

    if (!this.AgentOverviewData[options.chartOptions.name]) {
      console.log(`Method RocketChat.Livechat.Analytics.AgentOverviewData.${options.chartOptions.name} does NOT exist`);
      return;
    }

    return this.AgentOverviewData[options.chartOptions.name](from, to);
  },

  getAnalyticsChartData(options) {
    // Check if function exists, prevent server error in case property altered
    if (!this.ChartData[options.chartOptions.name]) {
      console.log(`Method RocketChat.Livechat.Analytics.ChartData.${options.chartOptions.name} does NOT exist`);
      return;
    }

    const from = moment(options.daterange.from);
    const to = moment(options.daterange.to);

    if (!(moment(from).isValid() && moment(to).isValid())) {
      console.log('livechat:getAnalyticsChartData => Invalid dates');
      return;
    }

    const data = {
      chartLabel: options.chartOptions.name,
      dataLabels: [],
      dataPoints: []
    };

    if (from.diff(to) === 0) {
      // data for single day
      for (let m = moment(from); m.diff(to, 'days') <= 0; m.add(1, 'hours')) {
        const hour = m.format('H');
        data.dataLabels.push(`${moment(hour, ['H']).format('hA')}-${moment((parseInt(hour) + 1) % 24, ['H']).format('hA')}`);
        const date = {
          gte: m,
          lt: moment(m).add(1, 'hours')
        };
        data.dataPoints.push(this.ChartData[options.chartOptions.name](date));
      }
    } else {
      for (let m = moment(from); m.diff(to, 'days') <= 0; m.add(1, 'days')) {
        data.dataLabels.push(m.format('M/D'));
        const date = {
          gte: m,
          lt: moment(m).add(1, 'days')
        };
        data.dataPoints.push(this.ChartData[options.chartOptions.name](date));
      }
    }

    return data;
  },

  getAnalyticsOverviewData(options) {
    const from = moment(options.daterange.from);
    const to = moment(options.daterange.to);

    if (!(moment(from).isValid() && moment(to).isValid())) {
      console.log('livechat:getAnalyticsOverviewData => Invalid dates');
      return;
    }

    if (!this.OverviewData[options.analyticsOptions.name]) {
      console.log(`Method RocketChat.Livechat.Analytics.OverviewData.${options.analyticsOptions.name} does NOT exist`);
      return;
    }

    return this.OverviewData[options.analyticsOptions.name](from, to);
  },

  ChartData: {
    /**
     *
     * @param {Object} date {gte: {Date}, lt: {Date}}
     *
     * @returns {Integer}
     */
    Total_conversations(date) {
      return RocketChat.models.Rooms.getTotalConversationsBetweenDate('l', date);
    },

    Avg_chat_duration(date) {
      let total = 0;
      let count = 0;
      RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
        metrics
      }) => {
        if (metrics && metrics.chatDuration) {
          total += metrics.chatDuration;
          count++;
        }
      });
      const avgCD = count ? total / count : 0;
      return Math.round(avgCD * 100) / 100;
    },

    Total_messages(date) {
      let total = 0;
      RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
        msgs
      }) => {
        if (msgs) {
          total += msgs;
        }
      });
      return total;
    },

    /**
     *
     * @param {Object} date {gte: {Date}, lt: {Date}}
     *
     * @returns {Double}
     */
    Avg_first_response_time(date) {
      let frt = 0;
      let count = 0;
      RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
        metrics
      }) => {
        if (metrics && metrics.response && metrics.response.ft) {
          frt += metrics.response.ft;
          count++;
        }
      });
      const avgFrt = count ? frt / count : 0;
      return Math.round(avgFrt * 100) / 100;
    },

    /**
     *
     * @param {Object} date {gte: {Date}, lt: {Date}}
     *
     * @returns {Double}
     */
    Best_first_response_time(date) {
      let maxFrt;
      RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
        metrics
      }) => {
        if (metrics && metrics.response && metrics.response.ft) {
          maxFrt = maxFrt ? Math.min(maxFrt, metrics.response.ft) : metrics.response.ft;
        }
      });

      if (!maxFrt) {
        maxFrt = 0;
      }

      return Math.round(maxFrt * 100) / 100;
    },

    /**
     *
     * @param {Object} date {gte: {Date}, lt: {Date}}
     *
     * @returns {Double}
     */
    Avg_response_time(date) {
      let art = 0;
      let count = 0;
      RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
        metrics
      }) => {
        if (metrics && metrics.response && metrics.response.avg) {
          art += metrics.response.avg;
          count++;
        }
      });
      const avgArt = count ? art / count : 0;
      return Math.round(avgArt * 100) / 100;
    },

    /**
     *
     * @param {Object} date {gte: {Date}, lt: {Date}}
     *
     * @returns {Double}
     */
    Avg_reaction_time(date) {
      let arnt = 0;
      let count = 0;
      RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
        metrics
      }) => {
        if (metrics && metrics.reaction && metrics.reaction.ft) {
          arnt += metrics.reaction.ft;
          count++;
        }
      });
      const avgArnt = count ? arnt / count : 0;
      return Math.round(avgArnt * 100) / 100;
    }

  },
  OverviewData: {
    /**
     *
     * @param {Map} map
     *
     * @return {String}
     */
    getKeyHavingMaxValue(map, def) {
      let maxValue = 0;
      let maxKey = def; // default

      map.forEach((value, key) => {
        if (value > maxValue) {
          maxValue = value;
          maxKey = key;
        }
      });
      return maxKey;
    },

    /**
     *
     * @param {Date} from
     * @param {Date} to
     *
     * @returns {Array[Object]}
     */
    Conversations(from, to) {
      let totalConversations = 0; // Total conversations

      let openConversations = 0; // open conversations

      let totalMessages = 0; // total msgs

      const totalMessagesOnWeekday = new Map(); // total messages on weekdays i.e Monday, Tuesday...

      const totalMessagesInHour = new Map(); // total messages in hour 0, 1, ... 23 of weekday

      const days = to.diff(from, 'days') + 1; // total days

      const summarize = m => ({
        metrics,
        msgs
      }) => {
        if (metrics && !metrics.chatDuration) {
          openConversations++;
        }

        totalMessages += msgs;
        const weekday = m.format('dddd'); // @string: Monday, Tuesday ...

        totalMessagesOnWeekday.set(weekday, totalMessagesOnWeekday.has(weekday) ? totalMessagesOnWeekday.get(weekday) + msgs : msgs);
      };

      for (let m = moment(from); m.diff(to, 'days') <= 0; m.add(1, 'days')) {
        const date = {
          gte: m,
          lt: moment(m).add(1, 'days')
        };
        const result = RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date);
        totalConversations += result.count();
        result.forEach(summarize(m));
      }

      const busiestDay = this.getKeyHavingMaxValue(totalMessagesOnWeekday, '-'); // returns key with max value
      // iterate through all busiestDay in given date-range and find busiest hour

      for (let m = moment(from).day(busiestDay); m <= to; m.add(7, 'days')) {
        if (m < from) {
          continue;
        }

        for (let h = moment(m); h.diff(m, 'days') <= 0; h.add(1, 'hours')) {
          const date = {
            gte: h,
            lt: moment(h).add(1, 'hours')
          };
          RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
            msgs
          }) => {
            const dayHour = h.format('H'); // @int : 0, 1, ... 23

            totalMessagesInHour.set(dayHour, totalMessagesInHour.has(dayHour) ? totalMessagesInHour.get(dayHour) + msgs : msgs);
          });
        }
      }

      const busiestHour = this.getKeyHavingMaxValue(totalMessagesInHour, -1);
      const data = [{
        title: 'Total_conversations',
        value: totalConversations
      }, {
        title: 'Open_conversations',
        value: openConversations
      }, {
        title: 'Total_messages',
        value: totalMessages
      }, {
        title: 'Busiest_day',
        value: busiestDay
      }, {
        title: 'Conversations_per_day',
        value: (totalConversations / days).toFixed(2)
      }, {
        title: 'Busiest_time',
        value: busiestHour > 0 ? `${moment(busiestHour, ['H']).format('hA')}-${moment((parseInt(busiestHour) + 1) % 24, ['H']).format('hA')}` : '-'
      }];
      return data;
    },

    /**
     *
     * @param {Date} from
     * @param {Date} to
     *
     * @returns {Array[Object]}
     */
    Productivity(from, to) {
      let avgResponseTime = 0;
      let firstResponseTime = 0;
      let avgReactionTime = 0;
      let count = 0;
      const date = {
        gte: from,
        lt: to.add(1, 'days')
      };
      RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
        metrics
      }) => {
        if (metrics && metrics.response && metrics.reaction) {
          avgResponseTime += metrics.response.avg;
          firstResponseTime += metrics.response.ft;
          avgReactionTime += metrics.reaction.ft;
          count++;
        }
      });

      if (count) {
        avgResponseTime /= count;
        firstResponseTime /= count;
        avgReactionTime /= count;
      }

      const data = [{
        title: 'Avg_response_time',
        value: secondsToHHMMSS(avgResponseTime.toFixed(2))
      }, {
        title: 'Avg_first_response_time',
        value: secondsToHHMMSS(firstResponseTime.toFixed(2))
      }, {
        title: 'Avg_reaction_time',
        value: secondsToHHMMSS(avgReactionTime.toFixed(2))
      }];
      return data;
    }

  },
  AgentOverviewData: {
    /**
     * do operation equivalent to map[key] += value
     *
     */
    updateMap(map, key, value) {
      map.set(key, map.has(key) ? map.get(key) + value : value);
    },

    /**
     * Sort array of objects by value property of object
     * @param  {Array(Object)} data
     * @param  {Boolean} [inv=false] reverse sort
     */
    sortByValue(data, inv = false) {
      data.sort(function (a, b) {
        // sort array
        if (parseFloat(a.value) > parseFloat(b.value)) {
          return inv ? -1 : 1; // if inv, reverse sort
        }

        if (parseFloat(a.value) < parseFloat(b.value)) {
          return inv ? 1 : -1;
        }

        return 0;
      });
    },

    /**
     *
     * @param {Date} from
     * @param {Date} to
     *
     * @returns {Array(Object), Array(Object)}
     */
    Total_conversations(from, to) {
      let total = 0;
      const agentConversations = new Map(); // stores total conversations for each agent

      const date = {
        gte: from,
        lt: to.add(1, 'days')
      };
      const data = {
        head: [{
          name: 'Agent'
        }, {
          name: '%_of_conversations'
        }],
        data: []
      };
      RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
        servedBy
      }) => {
        if (servedBy) {
          this.updateMap(agentConversations, servedBy.username, 1);
          total++;
        }
      });
      agentConversations.forEach((value, key) => {
        // calculate percentage
        const percentage = (value / total * 100).toFixed(2);
        data.data.push({
          name: key,
          value: percentage
        });
      });
      this.sortByValue(data.data, true); // reverse sort array

      data.data.forEach(value => {
        value.value = `${value.value}%`;
      });
      return data;
    },

    /**
     *
     * @param {Date} from
     * @param {Date} to
     *
     * @returns {Array(Object), Array(Object)}
     */
    Avg_chat_duration(from, to) {
      const agentChatDurations = new Map(); // stores total conversations for each agent

      const date = {
        gte: from,
        lt: to.add(1, 'days')
      };
      const data = {
        head: [{
          name: 'Agent'
        }, {
          name: 'Avg_chat_duration'
        }],
        data: []
      };
      RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
        metrics,
        servedBy
      }) => {
        if (servedBy && metrics && metrics.chatDuration) {
          if (agentChatDurations.has(servedBy.username)) {
            agentChatDurations.set(servedBy.username, {
              chatDuration: agentChatDurations.get(servedBy.username).chatDuration + metrics.chatDuration,
              total: agentChatDurations.get(servedBy.username).total + 1
            });
          } else {
            agentChatDurations.set(servedBy.username, {
              chatDuration: metrics.chatDuration,
              total: 1
            });
          }
        }
      });
      agentChatDurations.forEach((obj, key) => {
        // calculate percentage
        const avg = (obj.chatDuration / obj.total).toFixed(2);
        data.data.push({
          name: key,
          value: avg
        });
      });
      this.sortByValue(data.data, true); // reverse sort array

      data.data.forEach(obj => {
        obj.value = secondsToHHMMSS(obj.value);
      });
      return data;
    },

    /**
     *
     * @param {Date} from
     * @param {Date} to
     *
     * @returns {Array(Object), Array(Object)}
     */
    Total_messages(from, to) {
      const agentMessages = new Map(); // stores total conversations for each agent

      const date = {
        gte: from,
        lt: to.add(1, 'days')
      };
      const data = {
        head: [{
          name: 'Agent'
        }, {
          name: 'Total_messages'
        }],
        data: []
      };
      RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
        servedBy,
        msgs
      }) => {
        if (servedBy) {
          this.updateMap(agentMessages, servedBy.username, msgs);
        }
      });
      agentMessages.forEach((value, key) => {
        // calculate percentage
        data.data.push({
          name: key,
          value
        });
      });
      this.sortByValue(data.data, true); // reverse sort array

      return data;
    },

    /**
     *
     * @param {Date} from
     * @param {Date} to
     *
     * @returns {Array(Object), Array(Object)}
     */
    Avg_first_response_time(from, to) {
      const agentAvgRespTime = new Map(); // stores avg response time for each agent

      const date = {
        gte: from,
        lt: to.add(1, 'days')
      };
      const data = {
        head: [{
          name: 'Agent'
        }, {
          name: 'Avg_first_response_time'
        }],
        data: []
      };
      RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
        metrics,
        servedBy
      }) => {
        if (servedBy && metrics && metrics.response && metrics.response.ft) {
          if (agentAvgRespTime.has(servedBy.username)) {
            agentAvgRespTime.set(servedBy.username, {
              frt: agentAvgRespTime.get(servedBy.username).frt + metrics.response.ft,
              total: agentAvgRespTime.get(servedBy.username).total + 1
            });
          } else {
            agentAvgRespTime.set(servedBy.username, {
              frt: metrics.response.ft,
              total: 1
            });
          }
        }
      });
      agentAvgRespTime.forEach((obj, key) => {
        // calculate avg
        const avg = obj.frt / obj.total;
        data.data.push({
          name: key,
          value: avg.toFixed(2)
        });
      });
      this.sortByValue(data.data, false); // sort array

      data.data.forEach(obj => {
        obj.value = secondsToHHMMSS(obj.value);
      });
      return data;
    },

    /**
     *
     * @param {Date} from
     * @param {Date} to
     *
     * @returns {Array(Object), Array(Object)}
     */
    Best_first_response_time(from, to) {
      const agentFirstRespTime = new Map(); // stores avg response time for each agent

      const date = {
        gte: from,
        lt: to.add(1, 'days')
      };
      const data = {
        head: [{
          name: 'Agent'
        }, {
          name: 'Best_first_response_time'
        }],
        data: []
      };
      RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
        metrics,
        servedBy
      }) => {
        if (servedBy && metrics && metrics.response && metrics.response.ft) {
          if (agentFirstRespTime.has(servedBy.username)) {
            agentFirstRespTime.set(servedBy.username, Math.min(agentFirstRespTime.get(servedBy.username), metrics.response.ft));
          } else {
            agentFirstRespTime.set(servedBy.username, metrics.response.ft);
          }
        }
      });
      agentFirstRespTime.forEach((value, key) => {
        // calculate avg
        data.data.push({
          name: key,
          value: value.toFixed(2)
        });
      });
      this.sortByValue(data.data, false); // sort array

      data.data.forEach(obj => {
        obj.value = secondsToHHMMSS(obj.value);
      });
      return data;
    },

    /**
     *
     * @param {Date} from
     * @param {Date} to
     *
     * @returns {Array(Object), Array(Object)}
     */
    Avg_response_time(from, to) {
      const agentAvgRespTime = new Map(); // stores avg response time for each agent

      const date = {
        gte: from,
        lt: to.add(1, 'days')
      };
      const data = {
        head: [{
          name: 'Agent'
        }, {
          name: 'Avg_response_time'
        }],
        data: []
      };
      RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
        metrics,
        servedBy
      }) => {
        if (servedBy && metrics && metrics.response && metrics.response.avg) {
          if (agentAvgRespTime.has(servedBy.username)) {
            agentAvgRespTime.set(servedBy.username, {
              avg: agentAvgRespTime.get(servedBy.username).avg + metrics.response.avg,
              total: agentAvgRespTime.get(servedBy.username).total + 1
            });
          } else {
            agentAvgRespTime.set(servedBy.username, {
              avg: metrics.response.avg,
              total: 1
            });
          }
        }
      });
      agentAvgRespTime.forEach((obj, key) => {
        // calculate avg
        const avg = obj.avg / obj.total;
        data.data.push({
          name: key,
          value: avg.toFixed(2)
        });
      });
      this.sortByValue(data.data, false); // sort array

      data.data.forEach(obj => {
        obj.value = secondsToHHMMSS(obj.value);
      });
      return data;
    },

    /**
     *
     * @param {Date} from
     * @param {Date} to
     *
     * @returns {Array(Object), Array(Object)}
     */
    Avg_reaction_time(from, to) {
      const agentAvgReactionTime = new Map(); // stores avg reaction time for each agent

      const date = {
        gte: from,
        lt: to.add(1, 'days')
      };
      const data = {
        head: [{
          name: 'Agent'
        }, {
          name: 'Avg_reaction_time'
        }],
        data: []
      };
      RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).forEach(({
        metrics,
        servedBy
      }) => {
        if (servedBy && metrics && metrics.reaction && metrics.reaction.ft) {
          if (agentAvgReactionTime.has(servedBy.username)) {
            agentAvgReactionTime.set(servedBy.username, {
              frt: agentAvgReactionTime.get(servedBy.username).frt + metrics.reaction.ft,
              total: agentAvgReactionTime.get(servedBy.username).total + 1
            });
          } else {
            agentAvgReactionTime.set(servedBy.username, {
              frt: metrics.reaction.ft,
              total: 1
            });
          }
        }
      });
      agentAvgReactionTime.forEach((obj, key) => {
        // calculate avg
        const avg = obj.frt / obj.total;
        data.data.push({
          name: key,
          value: avg.toFixed(2)
        });
      });
      this.sortByValue(data.data, false); // sort array

      data.data.forEach(obj => {
        obj.value = secondsToHHMMSS(obj.value);
      });
      return data;
    }

  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Livechat.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/lib/Livechat.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 1);
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 2);
let dns;
module.watch(require("dns"), {
  default(v) {
    dns = v;
  }

}, 3);
let UAParser;
module.watch(require("ua-parser-js"), {
  default(v) {
    UAParser = v;
  }

}, 4);
let Mailer;
module.watch(require("meteor/rocketchat:mailer"), {
  "*"(v) {
    Mailer = v;
  }

}, 5);
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 6);
let Analytics;
module.watch(require("./Analytics"), {
  Analytics(v) {
    Analytics = v;
  }

}, 7);
RocketChat.Livechat = {
  Analytics,
  historyMonitorType: 'url',
  logger: new Logger('Livechat', {
    sections: {
      webhook: 'Webhook'
    }
  }),

  getNextAgent(department) {
    if (RocketChat.settings.get('Livechat_Routing_Method') === 'External') {
      for (let i = 0; i < 10; i++) {
        try {
          const queryString = department ? `?departmentId=${department}` : '';
          const result = HTTP.call('GET', `${RocketChat.settings.get('Livechat_External_Queue_URL')}${queryString}`, {
            headers: {
              'User-Agent': 'RocketChat Server',
              Accept: 'application/json',
              'X-RocketChat-Secret-Token': RocketChat.settings.get('Livechat_External_Queue_Token')
            }
          });

          if (result && result.data && result.data.username) {
            const agent = RocketChat.models.Users.findOneOnlineAgentByUsername(result.data.username);

            if (agent) {
              return {
                agentId: agent._id,
                username: agent.username
              };
            }
          }
        } catch (e) {
          console.error('Error requesting agent from external queue.', e);
          break;
        }
      }

      throw new Meteor.Error('no-agent-online', 'Sorry, no online agents');
    } else if (department) {
      return RocketChat.models.LivechatDepartmentAgents.getNextAgentForDepartment(department);
    }

    return RocketChat.models.Users.getNextAgent();
  },

  getAgents(department) {
    if (department) {
      return RocketChat.models.LivechatDepartmentAgents.findByDepartmentId(department);
    }

    return RocketChat.models.Users.findAgents();
  },

  getOnlineAgents(department) {
    if (department) {
      return RocketChat.models.LivechatDepartmentAgents.getOnlineForDepartment(department);
    }

    return RocketChat.models.Users.findOnlineAgents();
  },

  getRequiredDepartment(onlineRequired = true) {
    const departments = RocketChat.models.LivechatDepartment.findEnabledWithAgents();
    return departments.fetch().find(dept => {
      if (!dept.showOnRegistration) {
        return false;
      }

      if (!onlineRequired) {
        return true;
      }

      const onlineAgents = RocketChat.models.LivechatDepartmentAgents.getOnlineForDepartment(dept._id);
      return onlineAgents.count() > 0;
    });
  },

  getRoom(guest, message, roomInfo, agent) {
    let room = RocketChat.models.Rooms.findOneById(message.rid);
    let newRoom = false;

    if (room && !room.open) {
      message.rid = Random.id();
      room = null;
    }

    if (room == null) {
      // if no department selected verify if there is at least one active and pick the first
      if (!agent && !guest.department) {
        const department = this.getRequiredDepartment();

        if (department) {
          guest.department = department._id;
        }
      } // delegate room creation to QueueMethods


      const routingMethod = RocketChat.settings.get('Livechat_Routing_Method');
      room = RocketChat.QueueMethods[routingMethod](guest, message, roomInfo, agent);
      newRoom = true;
    }

    if (!room || room.v.token !== guest.token) {
      throw new Meteor.Error('cannot-access-room');
    }

    if (newRoom) {
      RocketChat.models.Messages.setRoomIdByToken(guest.token, room._id);
    }

    return {
      room,
      newRoom
    };
  },

  sendMessage({
    guest,
    message,
    roomInfo,
    agent
  }) {
    const {
      room,
      newRoom
    } = this.getRoom(guest, message, roomInfo, agent);

    if (guest.name) {
      message.alias = guest.name;
    } // return messages;


    return _.extend(RocketChat.sendMessage(guest, message, room), {
      newRoom,
      showConnecting: this.showConnecting()
    });
  },

  updateMessage({
    guest,
    message
  }) {
    check(message, Match.ObjectIncluding({
      _id: String
    }));
    const originalMessage = RocketChat.models.Messages.findOneById(message._id);

    if (!originalMessage || !originalMessage._id) {
      return;
    }

    const editAllowed = RocketChat.settings.get('Message_AllowEditing');
    const editOwn = originalMessage.u && originalMessage.u._id === guest._id;

    if (!editAllowed || !editOwn) {
      throw new Meteor.Error('error-action-not-allowed', 'Message editing not allowed', {
        method: 'livechatUpdateMessage'
      });
    }

    RocketChat.updateMessage(message, guest);
    return true;
  },

  deleteMessage({
    guest,
    message
  }) {
    check(message, Match.ObjectIncluding({
      _id: String
    }));
    const msg = RocketChat.models.Messages.findOneById(message._id);

    if (!msg || !msg._id) {
      return;
    }

    const deleteAllowed = RocketChat.settings.get('Message_AllowDeleting');
    const editOwn = msg.u && msg.u._id === guest._id;

    if (!deleteAllowed || !editOwn) {
      throw new Meteor.Error('error-action-not-allowed', 'Message deleting not allowed', {
        method: 'livechatDeleteMessage'
      });
    }

    RocketChat.deleteMessage(message, guest);
    return true;
  },

  registerGuest({
    token,
    name,
    email,
    department,
    phone,
    username
  } = {}) {
    check(token, String);
    let userId;
    const updateUser = {
      $set: {
        token
      }
    };
    const user = LivechatVisitors.getVisitorByToken(token, {
      fields: {
        _id: 1
      }
    });

    if (user) {
      userId = user._id;
    } else {
      if (!username) {
        username = LivechatVisitors.getNextVisitorUsername();
      }

      let existingUser = null;

      if (s.trim(email) !== '' && (existingUser = LivechatVisitors.findOneGuestByEmailAddress(email))) {
        userId = existingUser._id;
      } else {
        const userData = {
          username
        };

        if (this.connection) {
          userData.userAgent = this.connection.httpHeaders['user-agent'];
          userData.ip = this.connection.httpHeaders['x-real-ip'] || this.connection.httpHeaders['x-forwarded-for'] || this.connection.clientAddress;
          userData.host = this.connection.httpHeaders.host;
        }

        userId = LivechatVisitors.insert(userData);
      }
    }

    if (phone) {
      updateUser.$set.phone = [{
        phoneNumber: phone.number
      }];
    }

    if (email && email.trim() !== '') {
      updateUser.$set.visitorEmails = [{
        address: email
      }];
    }

    if (name) {
      updateUser.$set.name = name;
    }

    if (department) {
      updateUser.$set.department = department;
    }

    LivechatVisitors.updateById(userId, updateUser);
    return userId;
  },

  setDepartmentForGuest({
    token,
    department
  } = {}) {
    check(token, String);
    const updateUser = {
      $set: {
        department
      }
    };
    const user = LivechatVisitors.getVisitorByToken(token, {
      fields: {
        _id: 1
      }
    });

    if (user) {
      return LivechatVisitors.updateById(user._id, updateUser);
    }

    return false;
  },

  saveGuest({
    _id,
    name,
    email,
    phone
  }) {
    const updateData = {};

    if (name) {
      updateData.name = name;
    }

    if (email) {
      updateData.email = email;
    }

    if (phone) {
      updateData.phone = phone;
    }

    const ret = LivechatVisitors.saveGuestById(_id, updateData);
    Meteor.defer(() => {
      RocketChat.callbacks.run('livechat.saveGuest', updateData);
    });
    return ret;
  },

  closeRoom({
    user,
    visitor,
    room,
    comment
  }) {
    const now = new Date();
    const closeData = {
      closedAt: now,
      chatDuration: (now.getTime() - room.ts) / 1000
    };

    if (user) {
      closeData.closer = 'user';
      closeData.closedBy = {
        _id: user._id,
        username: user.username
      };
    } else if (visitor) {
      closeData.closer = 'visitor';
      closeData.closedBy = {
        _id: visitor._id,
        username: visitor.username
      };
    }

    RocketChat.models.Rooms.closeByRoomId(room._id, closeData);
    RocketChat.models.LivechatInquiry.closeByRoomId(room._id, closeData);
    const message = {
      t: 'livechat-close',
      msg: comment,
      groupable: false
    };
    RocketChat.sendMessage(user, message, room);

    if (room.servedBy) {
      RocketChat.models.Subscriptions.hideByRoomIdAndUserId(room._id, room.servedBy._id);
    }

    RocketChat.models.Messages.createCommandWithRoomIdAndUser('promptTranscript', room._id, closeData.closedBy);
    Meteor.defer(() => {
      RocketChat.callbacks.run('livechat.closeRoom', room);
    });
    return true;
  },

  setCustomFields({
    token,
    key,
    value,
    overwrite
  } = {}) {
    check(token, String);
    check(key, String);
    check(value, String);
    check(overwrite, Boolean);
    const customField = RocketChat.models.LivechatCustomField.findOneById(key);

    if (!customField) {
      throw new Meteor.Error('invalid-custom-field');
    }

    if (customField.scope === 'room') {
      return RocketChat.models.Rooms.updateLivechatDataByToken(token, key, value, overwrite);
    } else {
      return LivechatVisitors.updateLivechatDataByToken(token, key, value, overwrite);
    }
  },

  getInitSettings() {
    const settings = {};
    RocketChat.models.Settings.findNotHiddenPublic(['Livechat_title', 'Livechat_title_color', 'Livechat_enabled', 'Livechat_registration_form', 'Livechat_allow_switching_departments', 'Livechat_offline_title', 'Livechat_offline_title_color', 'Livechat_offline_message', 'Livechat_offline_success_message', 'Livechat_offline_form_unavailable', 'Livechat_display_offline_form', 'Livechat_videocall_enabled', 'Jitsi_Enabled', 'Language', 'Livechat_enable_transcript', 'Livechat_transcript_message', 'Livechat_fileupload_enabled', 'FileUpload_Enabled', 'Livechat_conversation_finished_message', 'Livechat_name_field_registration_form', 'Livechat_email_field_registration_form']).forEach(setting => {
      settings[setting._id] = setting.value;
    });
    RocketChat.settings.get('Livechat_history_monitor_type', (key, value) => {
      settings[key] = value;
    });
    return settings;
  },

  saveRoomInfo(roomData, guestData) {
    if ((roomData.topic != null || roomData.tags != null) && !RocketChat.models.Rooms.setTopicAndTagsById(roomData._id, roomData.topic, roomData.tags)) {
      return false;
    }

    Meteor.defer(() => {
      RocketChat.callbacks.run('livechat.saveRoom', roomData);
    });

    if (!_.isEmpty(guestData.name)) {
      return RocketChat.models.Rooms.setFnameById(roomData._id, guestData.name) && RocketChat.models.Subscriptions.updateDisplayNameByRoomId(roomData._id, guestData.name);
    }
  },

  closeOpenChats(userId, comment) {
    const user = RocketChat.models.Users.findOneById(userId);
    RocketChat.models.Rooms.findOpenByAgent(userId).forEach(room => {
      this.closeRoom({
        user,
        room,
        comment
      });
    });
  },

  forwardOpenChats(userId) {
    RocketChat.models.Rooms.findOpenByAgent(userId).forEach(room => {
      const guest = LivechatVisitors.findOneById(room.v._id);
      this.transfer(room, guest, {
        departmentId: guest.department
      });
    });
  },

  savePageHistory(token, roomId, pageInfo) {
    if (pageInfo.change === RocketChat.Livechat.historyMonitorType) {
      const user = RocketChat.models.Users.findOneById('rocket.cat');
      const pageTitle = pageInfo.title;
      const pageUrl = pageInfo.location.href;
      const extraData = {
        navigation: {
          page: pageInfo,
          token
        }
      };

      if (!roomId) {
        // keep history of unregistered visitors for 1 month
        const keepHistoryMiliseconds = 2592000000;
        extraData.expireAt = new Date().getTime() + keepHistoryMiliseconds;
      }

      if (!RocketChat.settings.get('Livechat_Visitor_navigation_as_a_message')) {
        extraData._hidden = true;
      }

      return RocketChat.models.Messages.createNavigationHistoryWithRoomIdMessageAndUser(roomId, `${pageTitle} - ${pageUrl}`, user, extraData);
    }

    return;
  },

  transfer(room, guest, transferData) {
    let agent;

    if (transferData.userId) {
      const user = RocketChat.models.Users.findOneById(transferData.userId);
      agent = {
        agentId: user._id,
        username: user.username
      };
    } else if (RocketChat.settings.get('Livechat_Routing_Method') !== 'Guest_Pool') {
      agent = RocketChat.Livechat.getNextAgent(transferData.departmentId);
    } else {
      return RocketChat.Livechat.returnRoomAsInquiry(room._id, transferData.departmentId);
    }

    const {
      servedBy
    } = room;

    if (agent && agent.agentId !== servedBy._id) {
      RocketChat.models.Rooms.changeAgentByRoomId(room._id, agent);

      if (transferData.departmentId) {
        RocketChat.models.Rooms.changeDepartmentIdByRoomId(room._id, transferData.departmentId);
      }

      const subscriptionData = {
        rid: room._id,
        name: guest.name || guest.username,
        alert: true,
        open: true,
        unread: 1,
        userMentions: 1,
        groupMentions: 0,
        u: {
          _id: agent.agentId,
          username: agent.username
        },
        t: 'l',
        desktopNotifications: 'all',
        mobilePushNotifications: 'all',
        emailNotifications: 'all'
      };
      RocketChat.models.Subscriptions.removeByRoomIdAndUserId(room._id, servedBy._id);
      RocketChat.models.Subscriptions.insert(subscriptionData);
      RocketChat.models.Rooms.incUsersCountById(room._id);
      RocketChat.models.Messages.createUserLeaveWithRoomIdAndUser(room._id, {
        _id: servedBy._id,
        username: servedBy.username
      });
      RocketChat.models.Messages.createUserJoinWithRoomIdAndUser(room._id, {
        _id: agent.agentId,
        username: agent.username
      });
      const guestData = {
        token: guest.token,
        department: transferData.departmentId
      };
      this.setDepartmentForGuest(guestData);
      const data = RocketChat.models.Users.getAgentInfo(agent.agentId);
      RocketChat.Livechat.stream.emit(room._id, {
        type: 'agentData',
        data
      });
      return true;
    }

    return false;
  },

  returnRoomAsInquiry(rid, departmentId) {
    const room = RocketChat.models.Rooms.findOneById(rid);

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'livechat:returnRoomAsInquiry'
      });
    }

    if (!room.servedBy) {
      return false;
    }

    const user = RocketChat.models.Users.findOne(room.servedBy._id);

    if (!user || !user._id) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'livechat:returnRoomAsInquiry'
      });
    }

    const agentIds = []; // get the agents of the department

    if (departmentId) {
      let agents = RocketChat.Livechat.getOnlineAgents(departmentId);

      if (agents.count() === 0 && RocketChat.settings.get('Livechat_guest_pool_with_no_agents')) {
        agents = RocketChat.Livechat.getAgents(departmentId);
      }

      if (agents.count() === 0) {
        return false;
      }

      agents.forEach(agent => {
        agentIds.push(agent.agentId);
      });
      RocketChat.models.Rooms.changeDepartmentIdByRoomId(room._id, departmentId);
    } // delete agent and room subscription


    RocketChat.models.Subscriptions.removeByRoomId(rid); // remove agent from room

    RocketChat.models.Rooms.removeAgentByRoomId(rid); // find inquiry corresponding to room

    const inquiry = RocketChat.models.LivechatInquiry.findOne({
      rid
    });

    if (!inquiry) {
      return false;
    }

    let openInq; // mark inquiry as open

    if (agentIds.length === 0) {
      openInq = RocketChat.models.LivechatInquiry.openInquiry(inquiry._id);
    } else {
      openInq = RocketChat.models.LivechatInquiry.openInquiryWithAgents(inquiry._id, agentIds);
    }

    if (openInq) {
      RocketChat.models.Messages.createUserLeaveWithRoomIdAndUser(rid, {
        _id: room.servedBy._id,
        username: room.servedBy.username
      });
      RocketChat.Livechat.stream.emit(rid, {
        type: 'agentData',
        data: null
      });
    }

    return openInq;
  },

  sendRequest(postData, callback, trying = 1) {
    try {
      const options = {
        headers: {
          'X-RocketChat-Livechat-Token': RocketChat.settings.get('Livechat_secret_token')
        },
        data: postData
      };
      return HTTP.post(RocketChat.settings.get('Livechat_webhookUrl'), options);
    } catch (e) {
      RocketChat.Livechat.logger.webhook.error(`Response error on ${trying} try ->`, e); // try 10 times after 10 seconds each

      if (trying < 10) {
        RocketChat.Livechat.logger.webhook.warn('Will try again in 10 seconds ...');
        trying++;
        setTimeout(Meteor.bindEnvironment(() => {
          RocketChat.Livechat.sendRequest(postData, callback, trying);
        }), 10000);
      }
    }
  },

  getLivechatRoomGuestInfo(room) {
    const visitor = LivechatVisitors.findOneById(room.v._id);
    const agent = RocketChat.models.Users.findOneById(room.servedBy && room.servedBy._id);
    const ua = new UAParser();
    ua.setUA(visitor.userAgent);
    const postData = {
      _id: room._id,
      label: room.fname || room.label,
      // using same field for compatibility
      topic: room.topic,
      createdAt: room.ts,
      lastMessageAt: room.lm,
      tags: room.tags,
      customFields: room.livechatData,
      visitor: {
        _id: visitor._id,
        token: visitor.token,
        name: visitor.name,
        username: visitor.username,
        email: null,
        phone: null,
        department: visitor.department,
        ip: visitor.ip,
        os: ua.getOS().name && `${ua.getOS().name} ${ua.getOS().version}`,
        browser: ua.getBrowser().name && `${ua.getBrowser().name} ${ua.getBrowser().version}`,
        customFields: visitor.livechatData
      }
    };

    if (agent) {
      postData.agent = {
        _id: agent._id,
        username: agent.username,
        name: agent.name,
        email: null
      };

      if (agent.emails && agent.emails.length > 0) {
        postData.agent.email = agent.emails[0].address;
      }
    }

    if (room.crmData) {
      postData.crmData = room.crmData;
    }

    if (visitor.visitorEmails && visitor.visitorEmails.length > 0) {
      postData.visitor.email = visitor.visitorEmails;
    }

    if (visitor.phone && visitor.phone.length > 0) {
      postData.visitor.phone = visitor.phone;
    }

    return postData;
  },

  addAgent(username) {
    check(username, String);
    const user = RocketChat.models.Users.findOneByUsername(username, {
      fields: {
        _id: 1,
        username: 1
      }
    });

    if (!user) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'livechat:addAgent'
      });
    }

    if (RocketChat.authz.addUserRoles(user._id, 'livechat-agent')) {
      RocketChat.models.Users.setOperator(user._id, true);
      RocketChat.models.Users.setLivechatStatus(user._id, 'available');
      return user;
    }

    return false;
  },

  addManager(username) {
    check(username, String);
    const user = RocketChat.models.Users.findOneByUsername(username, {
      fields: {
        _id: 1,
        username: 1
      }
    });

    if (!user) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'livechat:addManager'
      });
    }

    if (RocketChat.authz.addUserRoles(user._id, 'livechat-manager')) {
      return user;
    }

    return false;
  },

  removeAgent(username) {
    check(username, String);
    const user = RocketChat.models.Users.findOneByUsername(username, {
      fields: {
        _id: 1
      }
    });

    if (!user) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'livechat:removeAgent'
      });
    }

    if (RocketChat.authz.removeUserFromRoles(user._id, 'livechat-agent')) {
      RocketChat.models.Users.setOperator(user._id, false);
      RocketChat.models.Users.setLivechatStatus(user._id, 'not-available');
      return true;
    }

    return false;
  },

  removeManager(username) {
    check(username, String);
    const user = RocketChat.models.Users.findOneByUsername(username, {
      fields: {
        _id: 1
      }
    });

    if (!user) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'livechat:removeManager'
      });
    }

    return RocketChat.authz.removeUserFromRoles(user._id, 'livechat-manager');
  },

  saveDepartment(_id, departmentData, departmentAgents) {
    check(_id, Match.Maybe(String));
    check(departmentData, {
      enabled: Boolean,
      name: String,
      description: Match.Optional(String),
      showOnRegistration: Boolean
    });
    check(departmentAgents, [Match.ObjectIncluding({
      agentId: String,
      username: String
    })]);

    if (_id) {
      const department = RocketChat.models.LivechatDepartment.findOneById(_id);

      if (!department) {
        throw new Meteor.Error('error-department-not-found', 'Department not found', {
          method: 'livechat:saveDepartment'
        });
      }
    }

    return RocketChat.models.LivechatDepartment.createOrUpdateDepartment(_id, departmentData, departmentAgents);
  },

  removeDepartment(_id) {
    check(_id, String);
    const department = RocketChat.models.LivechatDepartment.findOneById(_id, {
      fields: {
        _id: 1
      }
    });

    if (!department) {
      throw new Meteor.Error('department-not-found', 'Department not found', {
        method: 'livechat:removeDepartment'
      });
    }

    return RocketChat.models.LivechatDepartment.removeById(_id);
  },

  showConnecting() {
    if (RocketChat.settings.get('Livechat_Routing_Method') === 'Guest_Pool') {
      return RocketChat.settings.get('Livechat_open_inquiery_show_connecting');
    } else {
      return false;
    }
  },

  sendEmail(from, to, replyTo, subject, html) {
    Mailer.send({
      to,
      from,
      replyTo,
      subject,
      html
    });
  },

  sendTranscript({
    token,
    rid,
    email
  }) {
    check(rid, String);
    check(email, String);
    const room = RocketChat.models.Rooms.findOneById(rid);
    const visitor = LivechatVisitors.getVisitorByToken(token);
    const userLanguage = visitor && visitor.language || RocketChat.settings.get('language') || 'en'; // allow to only user to send transcripts from their own chats

    if (!room || room.t !== 'l' || !room.v || room.v.token !== token) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room');
    }

    const messages = RocketChat.models.Messages.findVisibleByRoomIdNotContainingTypes(rid, ['livechat_navigation_history'], {
      sort: {
        ts: 1
      }
    });
    let html = '<div> <hr>';
    messages.forEach(message => {
      if (message.t && ['command', 'livechat-close', 'livechat_video_call'].indexOf(message.t) !== -1) {
        return;
      }

      let author;

      if (message.u._id === visitor._id) {
        author = TAPi18n.__('You', {
          lng: userLanguage
        });
      } else {
        author = message.u.username;
      }

      const datetime = moment(message.ts).locale(userLanguage).format('LLL');
      const singleMessage = `
				<p><strong>${author}</strong>  <em>${datetime}</em></p>
				<p>${message.msg}</p>
			`;
      html = html + singleMessage;
    });
    html = `${html}</div>`;
    let fromEmail = RocketChat.settings.get('From_Email').match(/\b[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,4}\b/i);

    if (fromEmail) {
      fromEmail = fromEmail[0];
    } else {
      fromEmail = RocketChat.settings.get('From_Email');
    }

    const subject = TAPi18n.__('Transcript_of_your_livechat_conversation', {
      lng: userLanguage
    });

    this.sendEmail(fromEmail, email, fromEmail, subject, html);
    Meteor.defer(() => {
      RocketChat.callbacks.run('livechat.sendTranscript', messages, email);
    });
    return true;
  },

  sendOfflineMessage(data = {}) {
    if (!RocketChat.settings.get('Livechat_display_offline_form')) {
      return false;
    }

    const message = `${data.message}`.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br>' + '$2');
    const html = `
			<h1>New livechat message</h1>
			<p><strong>Visitor name:</strong> ${data.name}</p>
			<p><strong>Visitor email:</strong> ${data.email}</p>
			<p><strong>Message:</strong><br>${message}</p>`;
    let fromEmail = RocketChat.settings.get('From_Email').match(/\b[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,4}\b/i);

    if (fromEmail) {
      fromEmail = fromEmail[0];
    } else {
      fromEmail = RocketChat.settings.get('From_Email');
    }

    if (RocketChat.settings.get('Livechat_validate_offline_email')) {
      const emailDomain = data.email.substr(data.email.lastIndexOf('@') + 1);

      try {
        Meteor.wrapAsync(dns.resolveMx)(emailDomain);
      } catch (e) {
        throw new Meteor.Error('error-invalid-email-address', 'Invalid email address', {
          method: 'livechat:sendOfflineMessage'
        });
      }
    }

    const to = RocketChat.settings.get('Livechat_offline_email');
    const from = `${data.name} - ${data.email} <${fromEmail}>`;
    const replyTo = `${data.name} <${data.email}>`;
    const subject = `Livechat offline message from ${data.name}: ${`${data.message}`.substring(0, 20)}`;
    this.sendEmail(from, to, replyTo, subject, html);
    Meteor.defer(() => {
      RocketChat.callbacks.run('livechat.offlineMessage', data);
    });
    return true;
  }

};
RocketChat.Livechat.stream = new Meteor.Streamer('livechat-room');
RocketChat.Livechat.stream.allowRead((roomId, extraData) => {
  const room = RocketChat.models.Rooms.findOneById(roomId);

  if (!room) {
    console.warn(`Invalid eventName: "${roomId}"`);
    return false;
  }

  if (room.t === 'l' && extraData && extraData.visitorToken && room.v.token === extraData.visitorToken) {
    return true;
  }

  return false;
});
RocketChat.settings.get('Livechat_history_monitor_type', (key, value) => {
  RocketChat.Livechat.historyMonitorType = value;
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"QueueMethods.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/lib/QueueMethods.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let sendNotification;
module.watch(require("meteor/rocketchat:lib"), {
  sendNotification(v) {
    sendNotification = v;
  }

}, 1);
RocketChat.QueueMethods = {
  /* Least Amount Queuing method:
   *
   * default method where the agent with the least number
   * of open chats is paired with the incoming livechat
   */
  'Least_Amount'(guest, message, roomInfo, agent) {
    if (!agent) {
      agent = RocketChat.Livechat.getNextAgent(guest.department);

      if (!agent) {
        throw new Meteor.Error('no-agent-online', 'Sorry, no online agents');
      }
    }

    RocketChat.models.Rooms.updateLivechatRoomCount();

    const room = _.extend({
      _id: message.rid,
      msgs: 0,
      usersCount: 1,
      lm: new Date(),
      fname: roomInfo && roomInfo.fname || guest.name || guest.username,
      // usernames: [agent.username, guest.username],
      t: 'l',
      ts: new Date(),
      v: {
        _id: guest._id,
        username: guest.username,
        token: message.token,
        status: guest.status || 'online'
      },
      servedBy: {
        _id: agent.agentId,
        username: agent.username,
        ts: new Date()
      },
      cl: false,
      open: true,
      waitingResponse: true
    }, roomInfo);

    const subscriptionData = {
      rid: message.rid,
      fname: guest.name || guest.username,
      alert: true,
      open: true,
      unread: 1,
      userMentions: 1,
      groupMentions: 0,
      u: {
        _id: agent.agentId,
        username: agent.username
      },
      t: 'l',
      desktopNotifications: 'all',
      mobilePushNotifications: 'all',
      emailNotifications: 'all'
    };

    if (guest.department) {
      room.departmentId = guest.department;
    }

    RocketChat.models.Rooms.insert(room);
    RocketChat.models.Subscriptions.insert(subscriptionData);
    RocketChat.Livechat.stream.emit(room._id, {
      type: 'agentData',
      data: RocketChat.models.Users.getAgentInfo(agent.agentId)
    });
    return room;
  },

  /* Guest Pool Queuing Method:
   *
   * An incomming livechat is created as an Inquiry
   * which is picked up from an agent.
   * An Inquiry is visible to all agents (TODO: in the correct department)
      *
   * A room is still created with the initial message, but it is occupied by
   * only the client until paired with an agent
   */
  'Guest_Pool'(guest, message, roomInfo) {
    let agents = RocketChat.Livechat.getOnlineAgents(guest.department);

    if (agents.count() === 0 && RocketChat.settings.get('Livechat_guest_pool_with_no_agents')) {
      agents = RocketChat.Livechat.getAgents(guest.department);
    }

    if (agents.count() === 0) {
      throw new Meteor.Error('no-agent-online', 'Sorry, no online agents');
    }

    RocketChat.models.Rooms.updateLivechatRoomCount();
    const agentIds = [];
    agents.forEach(agent => {
      if (guest.department) {
        agentIds.push(agent.agentId);
      } else {
        agentIds.push(agent._id);
      }
    });
    const inquiry = {
      rid: message.rid,
      message: message.msg,
      name: guest.name || guest.username,
      ts: new Date(),
      department: guest.department,
      agents: agentIds,
      status: 'open',
      v: {
        _id: guest._id,
        username: guest.username,
        token: message.token,
        status: guest.status || 'online'
      },
      t: 'l'
    };

    const room = _.extend({
      _id: message.rid,
      msgs: 0,
      usersCount: 0,
      lm: new Date(),
      fname: guest.name || guest.username,
      // usernames: [guest.username],
      t: 'l',
      ts: new Date(),
      v: {
        _id: guest._id,
        username: guest.username,
        token: message.token,
        status: guest.status
      },
      cl: false,
      open: true,
      waitingResponse: true
    }, roomInfo);

    if (guest.department) {
      room.departmentId = guest.department;
    }

    RocketChat.models.LivechatInquiry.insert(inquiry);
    RocketChat.models.Rooms.insert(room); // Alert the agents of the queued request

    agentIds.forEach(agentId => {
      sendNotification({
        // fake a subscription in order to make use of the function defined above
        subscription: {
          rid: room._id,
          t: room.t,
          u: {
            _id: agentId
          }
        },
        sender: room.v,
        hasMentionToAll: true,
        // consider all agents to be in the room
        hasMentionToHere: false,
        message: Object.assign(message, {
          u: room.v
        }),
        notificationMessage: message.msg,
        room: Object.assign(room, {
          name: TAPi18n.__('New_livechat_in_queue')
        }),
        mentionIds: []
      });
    });
    return room;
  },

  'External'(guest, message, roomInfo, agent) {
    return this['Least_Amount'](guest, message, roomInfo, agent); // eslint-disable-line
  }

};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"OfficeClock.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/lib/OfficeClock.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Every minute check if office closed
Meteor.setInterval(function () {
  if (RocketChat.settings.get('Livechat_enable_office_hours')) {
    if (RocketChat.models.LivechatOfficeHour.isOpeningTime()) {
      RocketChat.models.Users.openOffice();
    } else if (RocketChat.models.LivechatOfficeHour.isClosingTime()) {
      RocketChat.models.Users.closeOffice();
    }
  }
}, 60000);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"OmniChannel.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/lib/OmniChannel.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const gatewayURL = 'https://omni.rocket.chat';
module.exportDefault({
  enable() {
    const result = HTTP.call('POST', `${gatewayURL}/facebook/enable`, {
      headers: {
        authorization: `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`,
        'content-type': 'application/json'
      },
      data: {
        url: RocketChat.settings.get('Site_Url')
      }
    });
    return result.data;
  },

  disable() {
    const result = HTTP.call('DELETE', `${gatewayURL}/facebook/enable`, {
      headers: {
        authorization: `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`,
        'content-type': 'application/json'
      }
    });
    return result.data;
  },

  listPages() {
    const result = HTTP.call('GET', `${gatewayURL}/facebook/pages`, {
      headers: {
        authorization: `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`
      }
    });
    return result.data;
  },

  subscribe(pageId) {
    const result = HTTP.call('POST', `${gatewayURL}/facebook/page/${pageId}/subscribe`, {
      headers: {
        authorization: `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`
      }
    });
    return result.data;
  },

  unsubscribe(pageId) {
    const result = HTTP.call('DELETE', `${gatewayURL}/facebook/page/${pageId}/subscribe`, {
      headers: {
        authorization: `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`
      }
    });
    return result.data;
  },

  reply({
    page,
    token,
    text
  }) {
    return HTTP.call('POST', `${gatewayURL}/facebook/reply`, {
      headers: {
        authorization: `Bearer ${RocketChat.settings.get('Livechat_Facebook_API_Key')}`
      },
      data: {
        page,
        token,
        text
      }
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"sendMessageBySMS.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/sendMessageBySMS.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("./models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
RocketChat.callbacks.add('afterSaveMessage', function (message, room) {
  // skips this callback if the message was edited
  if (message.editedAt) {
    return message;
  }

  if (!RocketChat.SMS.enabled) {
    return message;
  } // only send the sms by SMS if it is a livechat room with SMS set to true


  if (!(typeof room.t !== 'undefined' && room.t === 'l' && room.sms && room.v && room.v.token)) {
    return message;
  } // if the message has a token, it was sent from the visitor, so ignore it


  if (message.token) {
    return message;
  } // if the message has a type means it is a special message (like the closing comment), so skips


  if (message.t) {
    return message;
  }

  const SMSService = RocketChat.SMS.getService(RocketChat.settings.get('SMS_Service'));

  if (!SMSService) {
    return message;
  }

  const visitor = LivechatVisitors.getVisitorByToken(room.v.token);

  if (!visitor || !visitor.phone || visitor.phone.length === 0) {
    return message;
  }

  SMSService.send(room.sms.from, visitor.phone[0].phoneNumber, message.msg);
  return message;
}, RocketChat.callbacks.priority.LOW, 'sendMessageBySms');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"unclosedLivechats.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/unclosedLivechats.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals UserPresenceMonitor */
let agentsHandler;
let monitorAgents = false;
let actionTimeout = 60000;
const onlineAgents = {
  users: {},
  queue: {},

  add(userId) {
    if (this.queue[userId]) {
      clearTimeout(this.queue[userId]);
      delete this.queue[userId];
    }

    this.users[userId] = 1;
  },

  remove(userId, callback) {
    if (this.queue[userId]) {
      clearTimeout(this.queue[userId]);
    }

    this.queue[userId] = setTimeout(Meteor.bindEnvironment(() => {
      callback();
      delete this.users[userId];
      delete this.queue[userId];
    }), actionTimeout);
  },

  exists(userId) {
    return !!this.users[userId];
  }

};

function runAgentLeaveAction(userId) {
  const action = RocketChat.settings.get('Livechat_agent_leave_action');

  if (action === 'close') {
    return RocketChat.Livechat.closeOpenChats(userId, RocketChat.settings.get('Livechat_agent_leave_comment'));
  } else if (action === 'forward') {
    return RocketChat.Livechat.forwardOpenChats(userId);
  }
}

RocketChat.settings.get('Livechat_agent_leave_action_timeout', function (key, value) {
  actionTimeout = value * 1000;
});
RocketChat.settings.get('Livechat_agent_leave_action', function (key, value) {
  monitorAgents = value;

  if (value !== 'none') {
    if (!agentsHandler) {
      agentsHandler = RocketChat.models.Users.findOnlineAgents().observeChanges({
        added(id) {
          onlineAgents.add(id);
        },

        changed(id, fields) {
          if (fields.statusLivechat && fields.statusLivechat === 'not-available') {
            onlineAgents.remove(id, () => {
              runAgentLeaveAction(id);
            });
          } else {
            onlineAgents.add(id);
          }
        },

        removed(id) {
          onlineAgents.remove(id, () => {
            runAgentLeaveAction(id);
          });
        }

      });
    }
  } else if (agentsHandler) {
    agentsHandler.stop();
    agentsHandler = null;
  }
});
UserPresenceMonitor.onSetUserStatus((user, status
/* , statusConnection*/
) => {
  if (!monitorAgents) {
    return;
  }

  if (onlineAgents.exists(user._id)) {
    if (status === 'offline' || user.statusLivechat === 'not-available') {
      onlineAgents.remove(user._id, () => {
        runAgentLeaveAction(user._id);
      });
    }
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications":{"customFields.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/customFields.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
Meteor.publish('livechat:customFields', function (_id) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:customFields'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:customFields'
    }));
  }

  if (s.trim(_id)) {
    return RocketChat.models.LivechatCustomField.find({
      _id
    });
  }

  return RocketChat.models.LivechatCustomField.find();
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"departmentAgents.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/departmentAgents.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:departmentAgents', function (departmentId) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:departmentAgents'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-rooms')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:departmentAgents'
    }));
  }

  return RocketChat.models.LivechatDepartmentAgents.find({
    departmentId
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"externalMessages.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/externalMessages.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:externalMessages', function (roomId) {
  return RocketChat.models.LivechatExternalMessage.findByRoomId(roomId);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatAgents.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatAgents.js                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:agents', function () {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:agents'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:agents'
    }));
  }

  const self = this;
  const handle = RocketChat.authz.getUsersInRole('livechat-agent').observeChanges({
    added(id, fields) {
      self.added('agentUsers', id, fields);
    },

    changed(id, fields) {
      self.changed('agentUsers', id, fields);
    },

    removed(id) {
      self.removed('agentUsers', id);
    }

  });
  self.ready();
  self.onStop(function () {
    handle.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatAppearance.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatAppearance.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:appearance', function () {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:appearance'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:appearance'
    }));
  }

  const query = {
    _id: {
      $in: ['Livechat_title', 'Livechat_title_color', 'Livechat_show_agent_email', 'Livechat_display_offline_form', 'Livechat_offline_form_unavailable', 'Livechat_offline_message', 'Livechat_offline_success_message', 'Livechat_offline_title', 'Livechat_offline_title_color', 'Livechat_offline_email', 'Livechat_conversation_finished_message', 'Livechat_registration_form', 'Livechat_name_field_registration_form', 'Livechat_email_field_registration_form']
    }
  };
  const self = this;
  const handle = RocketChat.models.Settings.find(query).observeChanges({
    added(id, fields) {
      self.added('livechatAppearance', id, fields);
    },

    changed(id, fields) {
      self.changed('livechatAppearance', id, fields);
    },

    removed(id) {
      self.removed('livechatAppearance', id);
    }

  });
  this.ready();
  this.onStop(() => {
    handle.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatDepartments.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatDepartments.js                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:departments', function (_id) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:agents'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:agents'
    }));
  }

  if (_id !== undefined) {
    return RocketChat.models.LivechatDepartment.findByDepartmentId(_id);
  } else {
    return RocketChat.models.LivechatDepartment.find();
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatIntegration.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatIntegration.js                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:integration', function () {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:integration'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:integration'
    }));
  }

  const self = this;
  const handle = RocketChat.models.Settings.findByIds(['Livechat_webhookUrl', 'Livechat_secret_token', 'Livechat_webhook_on_close', 'Livechat_webhook_on_offline_msg', 'Livechat_webhook_on_visitor_message', 'Livechat_webhook_on_agent_message']).observeChanges({
    added(id, fields) {
      self.added('livechatIntegration', id, fields);
    },

    changed(id, fields) {
      self.changed('livechatIntegration', id, fields);
    },

    removed(id) {
      self.removed('livechatIntegration', id);
    }

  });
  self.ready();
  self.onStop(function () {
    handle.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatManagers.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatManagers.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:managers', function () {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:managers'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-rooms')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:managers'
    }));
  }

  const self = this;
  const handle = RocketChat.authz.getUsersInRole('livechat-manager').observeChanges({
    added(id, fields) {
      self.added('managerUsers', id, fields);
    },

    changed(id, fields) {
      self.changed('managerUsers', id, fields);
    },

    removed(id) {
      self.removed('managerUsers', id);
    }

  });
  self.ready();
  self.onStop(function () {
    handle.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatMonitoring.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatMonitoring.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:monitoring', function (date) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:monitoring'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:monitoring'
    }));
  }

  date = {
    gte: new Date(date.gte),
    lt: new Date(date.lt)
  };
  check(date.gte, Date);
  check(date.lt, Date);
  const self = this;
  const handle = RocketChat.models.Rooms.getAnalyticsMetricsBetweenDate('l', date).observeChanges({
    added(id, fields) {
      self.added('livechatMonitoring', id, fields);
    },

    changed(id, fields) {
      self.changed('livechatMonitoring', id, fields);
    },

    removed(id) {
      self.removed('livechatMonitoring', id);
    }

  });
  self.ready();
  self.onStop(function () {
    handle.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatRooms.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatRooms.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:rooms', function (filter = {}, offset = 0, limit = 20) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:rooms'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-rooms')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:rooms'
    }));
  }

  check(filter, {
    name: Match.Maybe(String),
    // room name to filter
    agent: Match.Maybe(String),
    // agent _id who is serving
    status: Match.Maybe(String),
    // either 'opened' or 'closed'
    from: Match.Maybe(Date),
    to: Match.Maybe(Date)
  });
  const query = {};

  if (filter.name) {
    query.label = new RegExp(filter.name, 'i');
  }

  if (filter.agent) {
    query['servedBy._id'] = filter.agent;
  }

  if (filter.status) {
    if (filter.status === 'opened') {
      query.open = true;
    } else {
      query.open = {
        $exists: false
      };
    }
  }

  if (filter.from) {
    query.ts = {
      $gte: filter.from
    };
  }

  if (filter.to) {
    filter.to.setDate(filter.to.getDate() + 1);
    filter.to.setSeconds(filter.to.getSeconds() - 1);

    if (!query.ts) {
      query.ts = {};
    }

    query.ts.$lte = filter.to;
  }

  const self = this;
  const handle = RocketChat.models.Rooms.findLivechat(query, offset, limit).observeChanges({
    added(id, fields) {
      self.added('livechatRoom', id, fields);
    },

    changed(id, fields) {
      self.changed('livechatRoom', id, fields);
    },

    removed(id) {
      self.removed('livechatRoom', id);
    }

  });
  this.ready();
  this.onStop(() => {
    handle.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatQueue.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatQueue.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:queue', function () {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:queue'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:queue'
    }));
  } // let sort = { count: 1, sort: 1, username: 1 };
  // let onlineUsers = {};
  // let handleUsers = RocketChat.models.Users.findOnlineAgents().observeChanges({
  // 	added(id, fields) {
  // 		onlineUsers[fields.username] = 1;
  // 		// this.added('livechatQueueUser', id, fields);
  // 	},
  // 	changed(id, fields) {
  // 		onlineUsers[fields.username] = 1;
  // 		// this.changed('livechatQueueUser', id, fields);
  // 	},
  // 	removed(id) {
  // 		this.removed('livechatQueueUser', id);
  // 	}
  // });


  const self = this;
  const handleDepts = RocketChat.models.LivechatDepartmentAgents.findUsersInQueue().observeChanges({
    added(id, fields) {
      self.added('livechatQueueUser', id, fields);
    },

    changed(id, fields) {
      self.changed('livechatQueueUser', id, fields);
    },

    removed(id) {
      self.removed('livechatQueueUser', id);
    }

  });
  this.ready();
  this.onStop(() => {
    // handleUsers.stop();
    handleDepts.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatTriggers.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatTriggers.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:triggers', function (_id) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:triggers'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:triggers'
    }));
  }

  if (_id !== undefined) {
    return RocketChat.models.LivechatTrigger.findById(_id);
  } else {
    return RocketChat.models.LivechatTrigger.find();
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatVisitors.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatVisitors.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.publish('livechat:visitors', function (date) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitors'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitors'
    }));
  }

  date = {
    gte: new Date(date.gte),
    lt: new Date(date.lt)
  };
  check(date.gte, Date);
  check(date.lt, Date);
  const self = this;
  const handle = LivechatVisitors.getVisitorsBetweenDate(date).observeChanges({
    added(id, fields) {
      self.added('livechatVisitors', id, fields);
    },

    changed(id, fields) {
      self.changed('livechatVisitors', id, fields);
    },

    removed(id) {
      self.removed('livechatVisitors', id);
    }

  });
  self.ready();
  self.onStop(function () {
    handle.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"visitorHistory.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/visitorHistory.js                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:visitorHistory', function ({
  rid: roomId
}) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitorHistory'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitorHistory'
    }));
  }

  const room = RocketChat.models.Rooms.findOneById(roomId);
  const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, this.userId, {
    fields: {
      _id: 1
    }
  });

  if (!subscription) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitorHistory'
    }));
  }

  const self = this;

  if (room && room.v && room.v._id) {
    const handle = RocketChat.models.Rooms.findByVisitorId(room.v._id).observeChanges({
      added(id, fields) {
        self.added('visitor_history', id, fields);
      },

      changed(id, fields) {
        self.changed('visitor_history', id, fields);
      },

      removed(id) {
        self.removed('visitor_history', id);
      }

    });
    self.ready();
    self.onStop(function () {
      handle.stop();
    });
  } else {
    self.ready();
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"visitorInfo.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/visitorInfo.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
Meteor.publish('livechat:visitorInfo', function ({
  rid: roomId
}) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitorInfo'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitorInfo'
    }));
  }

  const room = RocketChat.models.Rooms.findOneById(roomId);

  if (room && room.v && room.v._id) {
    return LivechatVisitors.findById(room.v._id);
  } else {
    return this.ready();
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"visitorPageVisited.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/visitorPageVisited.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:visitorPageVisited', function ({
  rid: roomId
}) {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitorPageVisited'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:visitorPageVisited'
    }));
  }

  const self = this;
  const room = RocketChat.models.Rooms.findOneById(roomId);

  if (room) {
    const handle = RocketChat.models.Messages.findByRoomIdAndType(room._id, 'livechat_navigation_history').observeChanges({
      added(id, fields) {
        self.added('visitor_navigation_history', id, fields);
      },

      changed(id, fields) {
        self.changed('visitor_navigation_history', id, fields);
      },

      removed(id) {
        self.removed('visitor_navigation_history', id);
      }

    });
    self.ready();
    self.onStop(function () {
      handle.stop();
    });
  } else {
    self.ready();
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatInquiries.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatInquiries.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:inquiry', function () {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:inquiry'
    }));
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:inquiry'
    }));
  }

  const query = {
    agents: this.userId,
    status: 'open'
  };
  return RocketChat.models.LivechatInquiry.find(query);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livechatOfficeHours.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/publications/livechatOfficeHours.js                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.publish('livechat:officeHour', function () {
  if (!RocketChat.authz.hasPermission(this.userId, 'view-l-room')) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'livechat:agents'
    }));
  }

  return RocketChat.models.LivechatOfficeHour.find();
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"api.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/api.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("../imports/server/rest/departments.js"));
module.watch(require("../imports/server/rest/facebook.js"));
module.watch(require("../imports/server/rest/sms.js"));
module.watch(require("../imports/server/rest/users.js"));
module.watch(require("../imports/server/rest/upload.js"));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"api":{"rest.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/api/rest.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./v1/config.js"));
module.watch(require("./v1/visitor.js"));
module.watch(require("./v1/transcript.js"));
module.watch(require("./v1/offlineMessage.js"));
module.watch(require("./v1/pageVisited.js"));
module.watch(require("./v1/agent.js"));
module.watch(require("./v1/message.js"));
module.watch(require("./v1/customField.js"));
module.watch(require("./v1/room.js"));
module.watch(require("./v1/videoCall.js"));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"livechat.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/api/lib/livechat.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  online: () => online,
  findTriggers: () => findTriggers,
  findDepartments: () => findDepartments,
  findGuest: () => findGuest,
  findRoom: () => findRoom,
  getRoom: () => getRoom,
  findAgent: () => findAgent,
  settings: () => settings
});

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let LivechatVisitors;
module.watch(require("../../models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 1);

function online() {
  return RocketChat.models.Users.findOnlineAgents().count() > 0;
}

function findTriggers() {
  return RocketChat.models.LivechatTrigger.findEnabled().fetch().map(trigger => _.pick(trigger, '_id', 'actions', 'conditions'));
}

function findDepartments() {
  return RocketChat.models.LivechatDepartment.findEnabledWithAgents().fetch().map(department => _.pick(department, '_id', 'name', 'showOnRegistration'));
}

function findGuest(token) {
  return LivechatVisitors.getVisitorByToken(token, {
    fields: {
      name: 1,
      username: 1,
      token: 1
    }
  });
}

function findRoom(token, rid) {
  const fields = {
    departmentId: 1,
    servedBy: 1,
    open: 1
  };

  if (!rid) {
    return RocketChat.models.Rooms.findLivechatByVisitorToken(token, fields);
  }

  return RocketChat.models.Rooms.findLivechatByIdAndVisitorToken(rid, token, fields);
}

function getRoom(guest, rid, roomInfo) {
  const token = guest && guest.token;
  const message = {
    _id: Random.id(),
    rid,
    msg: '',
    token,
    ts: new Date()
  };
  return RocketChat.Livechat.getRoom(guest, message, roomInfo);
}

function findAgent(agentId) {
  return RocketChat.models.Users.getAgentInfo(agentId);
}

function settings() {
  const initSettings = RocketChat.Livechat.getInitSettings();
  return {
    enabled: initSettings.Livechat_enabled,
    settings: {
      registrationForm: initSettings.Livechat_registration_form,
      allowSwitchingDepartments: initSettings.Livechat_allow_switching_departments,
      nameFieldRegistrationForm: initSettings.Livechat_name_field_registration_form,
      emailFieldRegistrationForm: initSettings.Livechat_email_field_registration_form,
      displayOfflineForm: initSettings.Livechat_display_offline_form,
      videoCall: initSettings.Livechat_videocall_enabled === true && initSettings.Jitsi_Enabled === true,
      fileUpload: initSettings.Livechat_fileupload_enabled && initSettings.FileUpload_Enabled,
      language: initSettings.Language,
      transcript: initSettings.Livechat_enable_transcript,
      historyMonitorType: initSettings.Livechat_history_monitor_type
    },
    theme: {
      title: initSettings.Livechat_title,
      color: initSettings.Livechat_title_color,
      offlineTitle: initSettings.Livechat_offline_title,
      offlineColor: initSettings.Livechat_offline_title_color,
      actionLinks: [{
        icon: 'icon-videocam',
        i18nLabel: 'Accept',
        method_id: 'createLivechatCall',
        params: ''
      }, {
        icon: 'icon-cancel',
        i18nLabel: 'Decline',
        method_id: 'denyLivechatCall',
        params: ''
      }]
    },
    messages: {
      offlineMessage: initSettings.Livechat_offline_message,
      offlineSuccessMessage: initSettings.Livechat_offline_success_message,
      offlineUnavailableMessage: initSettings.Livechat_offline_form_unavailable,
      conversationFinishedMessage: initSettings.Livechat_conversation_finished_message,
      transcriptMessage: initSettings.Livechat_transcript_message
    },
    survey: {
      items: ['satisfaction', 'agentKnowledge', 'agentResposiveness', 'agentFriendliness'],
      values: ['1', '2', '3', '4', '5']
    }
  };
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"v1":{"agent.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/api/v1/agent.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let findRoom, findGuest, findAgent;
module.watch(require("../lib/livechat"), {
  findRoom(v) {
    findRoom = v;
  },

  findGuest(v) {
    findGuest = v;
  },

  findAgent(v) {
    findAgent = v;
  }

}, 0);
RocketChat.API.v1.addRoute('livechat/agent.info/:rid/:token', {
  get() {
    try {
      check(this.urlParams, {
        rid: String,
        token: String
      });
      const visitor = findGuest(this.urlParams.token);

      if (!visitor) {
        throw new Meteor.Error('invalid-token');
      }

      const room = findRoom(this.urlParams.token, this.urlParams.rid);

      if (!room) {
        throw new Meteor.Error('invalid-room');
      }

      const agent = room && room.servedBy && findAgent(room.servedBy._id);

      if (!agent) {
        throw new Meteor.Error('invalid-agent');
      }

      return RocketChat.API.v1.success({
        agent
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
RocketChat.API.v1.addRoute('livechat/agent.next/:token', {
  get() {
    try {
      check(this.urlParams, {
        token: String
      });
      check(this.queryParams, {
        department: Match.Maybe(String)
      });
      const visitor = findGuest(this.urlParams.token);

      if (!visitor) {
        throw new Meteor.Error('invalid-token');
      }

      let {
        department
      } = this.queryParams;

      if (!department) {
        const requireDeparment = RocketChat.Livechat.getRequiredDepartment();

        if (requireDeparment) {
          department = requireDeparment._id;
        }
      }

      const agentData = RocketChat.Livechat.getNextAgent(department);

      if (!agentData) {
        throw new Meteor.Error('agent-not-found');
      }

      const agent = findAgent(agentData.agentId);

      if (!agent) {
        throw new Meteor.Error('invalid-agent');
      }

      return RocketChat.API.v1.success({
        agent
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"config.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/api/v1/config.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let findRoom, findGuest, settings, online;
module.watch(require("../lib/livechat"), {
  findRoom(v) {
    findRoom = v;
  },

  findGuest(v) {
    findGuest = v;
  },

  settings(v) {
    settings = v;
  },

  online(v) {
    online = v;
  }

}, 0);
RocketChat.API.v1.addRoute('livechat/config', {
  get() {
    try {
      check(this.queryParams, {
        token: Match.Maybe(String)
      });
      const config = settings();

      if (!config.enabled) {
        return RocketChat.API.v1.success({
          config: {
            enabled: false
          }
        });
      }

      const {
        status
      } = online();
      let guest;
      let room;
      let agent;

      if (this.queryParams.token) {
        guest = findGuest(this.queryParams.token);
        room = findRoom(this.queryParams.token);
        agent = room && room.servedBy && RocketChat.models.Users.getAgentInfo(room.servedBy._id);
      }

      Object.assign(config, {
        online: status,
        guest,
        room,
        agent
      });
      return RocketChat.API.v1.success({
        config
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"customField.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/api/v1/customField.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let findGuest;
module.watch(require("../lib/livechat"), {
  findGuest(v) {
    findGuest = v;
  }

}, 0);
RocketChat.API.v1.addRoute('livechat/custom.field', {
  post() {
    try {
      check(this.bodyParams, {
        token: String,
        key: String,
        value: String,
        overwrite: Boolean
      });
      const {
        token,
        key,
        value,
        overwrite
      } = this.bodyParams;
      const guest = findGuest(token);

      if (!guest) {
        throw new Meteor.Error('invalid-token');
      }

      if (!RocketChat.Livechat.setCustomFields({
        token,
        key,
        value,
        overwrite
      })) {
        return RocketChat.API.v1.failure();
      }

      return RocketChat.API.v1.success({
        field: {
          key,
          value,
          overwrite
        }
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
RocketChat.API.v1.addRoute('livechat/custom.fields', {
  post() {
    check(this.bodyParams, {
      token: String,
      customFields: [Match.ObjectIncluding({
        key: String,
        value: String,
        overwrite: Boolean
      })]
    });
    const {
      token
    } = this.bodyParams;
    const guest = findGuest(token);

    if (!guest) {
      throw new Meteor.Error('invalid-token');
    }

    const fields = this.bodyParams.customFields.map(customField => {
      const data = Object.assign({
        token
      }, customField);

      if (!RocketChat.Livechat.setCustomFields(data)) {
        return RocketChat.API.v1.failure();
      }

      return {
        Key: customField.key,
        value: customField.value,
        overwrite: customField.overwrite
      };
    });
    return RocketChat.API.v1.success({
      fields
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"message.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/api/v1/message.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../../../server/models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
let findGuest, findRoom;
module.watch(require("../lib/livechat"), {
  findGuest(v) {
    findGuest = v;
  },

  findRoom(v) {
    findRoom = v;
  }

}, 1);
RocketChat.API.v1.addRoute('livechat/message', {
  post() {
    try {
      check(this.bodyParams, {
        _id: Match.Maybe(String),
        token: String,
        rid: String,
        msg: String,
        agent: Match.Maybe({
          agentId: String,
          username: String
        })
      });
      const {
        token,
        rid,
        agent,
        msg
      } = this.bodyParams;
      const guest = findGuest(token);

      if (!guest) {
        throw new Meteor.Error('invalid-token');
      }

      const room = findRoom(token, rid);

      if (!room) {
        throw new Meteor.Error('invalid-room');
      }

      const _id = this.bodyParams._id || Random.id();

      const sendMessage = {
        guest,
        message: {
          _id,
          rid,
          msg,
          token
        },
        agent
      };
      const result = RocketChat.Livechat.sendMessage(sendMessage);

      if (result) {
        const message = {
          _id: result._id,
          msg: result.msg,
          u: result.u,
          ts: result.ts
        };
        return RocketChat.API.v1.success({
          message
        });
      }

      return RocketChat.API.v1.failure();
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
RocketChat.API.v1.addRoute('livechat/message/:_id', {
  put() {
    try {
      check(this.urlParams, {
        _id: String
      });
      check(this.bodyParams, {
        token: String,
        rid: String,
        msg: String
      });
      const {
        token,
        rid
      } = this.bodyParams;
      const {
        _id
      } = this.urlParams;
      const guest = findGuest(token);

      if (!guest) {
        throw new Meteor.Error('invalid-token');
      }

      const room = findRoom(token, rid);

      if (!room) {
        throw new Meteor.Error('invalid-room');
      }

      const msg = RocketChat.models.Messages.findOneById(_id);

      if (!msg) {
        throw new Meteor.Error('invalid-message');
      }

      const message = {
        _id: msg._id,
        msg: this.bodyParams.msg
      };
      const result = RocketChat.Livechat.updateMessage({
        guest,
        message
      });

      if (result) {
        const data = RocketChat.models.Messages.findOneById(_id);
        return RocketChat.API.v1.success({
          message: {
            _id: data._id,
            msg: data.msg,
            u: data.u,
            ts: data.ts
          }
        });
      }

      return RocketChat.API.v1.failure();
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  },

  delete() {
    try {
      check(this.urlParams, {
        _id: String
      });
      check(this.bodyParams, {
        token: String,
        rid: String
      });
      const {
        token,
        rid
      } = this.bodyParams;
      const {
        _id
      } = this.urlParams;
      const guest = findGuest(token);

      if (!guest) {
        throw new Meteor.Error('invalid-token');
      }

      const room = findRoom(token, rid);

      if (!room) {
        throw new Meteor.Error('invalid-room');
      }

      const message = RocketChat.models.Messages.findOneById(_id);

      if (!message) {
        throw new Meteor.Error('invalid-message');
      }

      const result = RocketChat.Livechat.deleteMessage({
        guest,
        message
      });

      if (result) {
        return RocketChat.API.v1.success({
          message: {
            _id,
            ts: new Date().toISOString()
          }
        });
      }

      return RocketChat.API.v1.failure();
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  }

});
RocketChat.API.v1.addRoute('livechat/messages.history/:rid', {
  get() {
    try {
      check(this.urlParams, {
        rid: String
      });
      const {
        rid
      } = this.urlParams;
      const {
        token
      } = this.queryParams;

      if (!token) {
        throw new Meteor.Error('error-token-param-not-provided', 'The required "token" query param is missing.');
      }

      const guest = findGuest(token);

      if (!guest) {
        throw new Meteor.Error('invalid-token');
      }

      const room = findRoom(token, rid);

      if (!room) {
        throw new Meteor.Error('invalid-room');
      }

      let ls = undefined;

      if (this.queryParams.ls) {
        ls = new Date(this.queryParams.ls);
      }

      let end = undefined;

      if (this.queryParams.end) {
        end = new Date(this.queryParams.end);
      }

      let limit = 20;

      if (this.queryParams.limit) {
        limit = parseInt(this.queryParams.limit);
      }

      const messages = RocketChat.loadMessageHistory({
        userId: guest._id,
        rid,
        end,
        limit,
        ls
      });
      return RocketChat.API.v1.success(messages);
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  }

});
RocketChat.API.v1.addRoute('livechat/messages', {
  authRequired: true
}, {
  post() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    if (!this.bodyParams.visitor) {
      return RocketChat.API.v1.failure('Body param "visitor" is required');
    }

    if (!this.bodyParams.visitor.token) {
      return RocketChat.API.v1.failure('Body param "visitor.token" is required');
    }

    if (!this.bodyParams.messages) {
      return RocketChat.API.v1.failure('Body param "messages" is required');
    }

    if (!(this.bodyParams.messages instanceof Array)) {
      return RocketChat.API.v1.failure('Body param "messages" is not an array');
    }

    if (this.bodyParams.messages.length === 0) {
      return RocketChat.API.v1.failure('Body param "messages" is empty');
    }

    const visitorToken = this.bodyParams.visitor.token;
    let visitor = LivechatVisitors.getVisitorByToken(visitorToken);
    let rid;

    if (visitor) {
      const rooms = RocketChat.models.Rooms.findOpenByVisitorToken(visitorToken).fetch();

      if (rooms && rooms.length > 0) {
        rid = rooms[0]._id;
      } else {
        rid = Random.id();
      }
    } else {
      rid = Random.id();
      const visitorId = RocketChat.Livechat.registerGuest(this.bodyParams.visitor);
      visitor = LivechatVisitors.findOneById(visitorId);
    }

    const sentMessages = this.bodyParams.messages.map(message => {
      const sendMessage = {
        guest: visitor,
        message: {
          _id: Random.id(),
          rid,
          token: visitorToken,
          msg: message.msg
        }
      };
      const sentMessage = RocketChat.Livechat.sendMessage(sendMessage);
      return {
        username: sentMessage.u.username,
        msg: sentMessage.msg,
        ts: sentMessage.ts
      };
    });
    return RocketChat.API.v1.success({
      messages: sentMessages
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"offlineMessage.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/api/v1/offlineMessage.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('livechat/offline.message', {
  post() {
    try {
      check(this.bodyParams, {
        name: String,
        email: String,
        message: String
      });
      const {
        name,
        email,
        message
      } = this.bodyParams;

      if (!RocketChat.Livechat.sendOfflineMessage({
        name,
        email,
        message
      })) {
        return RocketChat.API.v1.failure({
          message: TAPi18n.__('Error_sending_livechat_offline_message')
        });
      }

      return RocketChat.API.v1.success({
        message: TAPi18n.__('Livechat_offline_message_sent')
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"pageVisited.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/api/v1/pageVisited.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let findGuest, findRoom;
module.watch(require("../lib/livechat"), {
  findGuest(v) {
    findGuest = v;
  },

  findRoom(v) {
    findRoom = v;
  }

}, 1);
RocketChat.API.v1.addRoute('livechat/page.visited', {
  post() {
    try {
      check(this.bodyParams, {
        token: String,
        rid: String,
        pageInfo: Match.ObjectIncluding({
          change: String,
          title: String,
          location: Match.ObjectIncluding({
            href: String
          })
        })
      });
      const {
        token,
        rid,
        pageInfo
      } = this.bodyParams;
      const guest = findGuest(token);

      if (!guest) {
        throw new Meteor.Error('invalid-token');
      }

      const room = findRoom(token, rid);

      if (!room) {
        throw new Meteor.Error('invalid-room');
      }

      const obj = RocketChat.Livechat.savePageHistory(token, rid, pageInfo);

      if (obj) {
        const page = _.pick(obj, 'msg', 'navigation');

        return RocketChat.API.v1.success({
          page
        });
      }

      return RocketChat.API.v1.success();
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"room.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/api/v1/room.js                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let findGuest, findRoom, getRoom, settings;
module.watch(require("../lib/livechat"), {
  findGuest(v) {
    findGuest = v;
  },

  findRoom(v) {
    findRoom = v;
  },

  getRoom(v) {
    getRoom = v;
  },

  settings(v) {
    settings = v;
  }

}, 0);
RocketChat.API.v1.addRoute('livechat/room', {
  get() {
    try {
      check(this.queryParams, {
        token: String,
        rid: Match.Maybe(String)
      });
      const {
        token
      } = this.queryParams;
      const guest = findGuest(token);

      if (!guest) {
        throw new Meteor.Error('invalid-token');
      }

      const rid = this.queryParams.rid || Random.id();
      const room = getRoom(guest, rid);
      return RocketChat.API.v1.success(room);
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
RocketChat.API.v1.addRoute('livechat/room.close', {
  post() {
    try {
      check(this.bodyParams, {
        rid: String,
        token: String
      });
      const {
        rid
      } = this.bodyParams;
      const {
        token
      } = this.bodyParams;
      const visitor = findGuest(token);

      if (!visitor) {
        throw new Meteor.Error('invalid-token');
      }

      const room = findRoom(token, rid);

      if (!room) {
        throw new Meteor.Error('invalid-room');
      }

      if (!room.open) {
        throw new Meteor.Error('room-closed');
      }

      const language = RocketChat.settings.get('language') || 'en';

      const comment = TAPi18n.__('Closed_by_visitor', {
        lng: language
      });

      if (!RocketChat.Livechat.closeRoom({
        visitor,
        room,
        comment
      })) {
        return RocketChat.API.v1.failure();
      }

      return RocketChat.API.v1.success({
        rid,
        comment
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
RocketChat.API.v1.addRoute('livechat/room.transfer', {
  post() {
    try {
      check(this.bodyParams, {
        rid: String,
        token: String,
        department: String
      });
      const {
        rid
      } = this.bodyParams;
      const {
        token,
        department
      } = this.bodyParams;
      const guest = findGuest(token);

      if (!guest) {
        throw new Meteor.Error('invalid-token');
      }

      let room = findRoom(token, rid);

      if (!room) {
        throw new Meteor.Error('invalid-room');
      } // update visited page history to not expire


      RocketChat.models.Messages.keepHistoryForToken(token);

      if (!RocketChat.Livechat.transfer(room, guest, {
        roomId: rid,
        departmentId: department
      })) {
        return RocketChat.API.v1.failure();
      }

      room = findRoom(token, rid);
      return RocketChat.API.v1.success({
        room
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
RocketChat.API.v1.addRoute('livechat/room.survey', {
  post() {
    try {
      check(this.bodyParams, {
        rid: String,
        token: String,
        data: [Match.ObjectIncluding({
          name: String,
          value: String
        })]
      });
      const {
        rid
      } = this.bodyParams;
      const {
        token,
        data
      } = this.bodyParams;
      const visitor = findGuest(token);

      if (!visitor) {
        throw new Meteor.Error('invalid-token');
      }

      const room = findRoom(token, rid);

      if (!room) {
        throw new Meteor.Error('invalid-room');
      }

      const config = settings();

      if (!config.survey || !config.survey.items || !config.survey.values) {
        throw new Meteor.Error('invalid-livechat-config');
      }

      const updateData = {};

      for (const item of data) {
        if (config.survey.items.includes(item.name) && config.survey.values.includes(item.value) || item.name === 'additionalFeedback') {
          updateData[item.name] = item.value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        throw new Meteor.Error('invalid-data');
      }

      if (!RocketChat.models.Rooms.updateSurveyFeedbackById(room._id, updateData)) {
        return RocketChat.API.v1.failure();
      }

      return RocketChat.API.v1.success({
        rid,
        data: updateData
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"transcript.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/api/v1/transcript.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('livechat/transcript', {
  post() {
    try {
      check(this.bodyParams, {
        token: String,
        rid: String,
        email: String
      });
      const {
        token,
        rid,
        email
      } = this.bodyParams;

      if (!RocketChat.Livechat.sendTranscript({
        token,
        rid,
        email
      })) {
        return RocketChat.API.v1.failure({
          message: TAPi18n.__('Error_sending_livechat_transcript')
        });
      }

      return RocketChat.API.v1.success({
        message: TAPi18n.__('Livechat_transcript_sent')
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"videoCall.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/api/v1/videoCall.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let findGuest, getRoom, settings;
module.watch(require("../lib/livechat"), {
  findGuest(v) {
    findGuest = v;
  },

  getRoom(v) {
    getRoom = v;
  },

  settings(v) {
    settings = v;
  }

}, 0);
RocketChat.API.v1.addRoute('livechat/video.call/:token', {
  get() {
    try {
      check(this.urlParams, {
        token: String
      });
      check(this.queryParams, {
        rid: Match.Maybe(String)
      });
      const {
        token
      } = this.urlParams;
      const guest = findGuest(token);

      if (!guest) {
        throw new Meteor.Error('invalid-token');
      }

      const rid = this.queryParams.rid || Random.id();
      const {
        room
      } = getRoom(guest, rid, {
        jitsiTimeout: new Date(Date.now() + 3600 * 1000)
      });
      const config = settings();

      if (!config.theme || !config.theme.actionLinks) {
        throw new Meteor.Error('invalid-livechat-config');
      }

      RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('livechat_video_call', room._id, '', guest, {
        actionLinks: config.theme.actionLinks
      });
      const videoCall = {
        rid,
        domain: RocketChat.settings.get('Jitsi_Domain'),
        provider: 'jitsi',
        room: RocketChat.settings.get('Jitsi_URL_Room_Prefix') + RocketChat.settings.get('uniqueID') + rid,
        timeout: new Date(Date.now() + 3600 * 1000)
      };
      return RocketChat.API.v1.success({
        videoCall
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"visitor.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/server/api/v1/visitor.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../../../server/models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
RocketChat.API.v1.addRoute('livechat/visitor', {
  post() {
    try {
      check(this.bodyParams, {
        visitor: Match.ObjectIncluding({
          token: String,
          name: Match.Maybe(String),
          email: Match.Maybe(String),
          department: Match.Maybe(String),
          phone: Match.Maybe(String),
          username: Match.Maybe(String),
          customFields: Match.Maybe([Match.ObjectIncluding({
            key: String,
            value: String,
            overwrite: Boolean
          })])
        })
      });
      const {
        token,
        customFields
      } = this.bodyParams.visitor;
      const guest = this.bodyParams.visitor;

      if (this.bodyParams.visitor.phone) {
        guest.phone = {
          number: this.bodyParams.visitor.phone
        };
      }

      let visitor = LivechatVisitors.getVisitorByToken(token);
      const visitorId = RocketChat.Livechat.registerGuest(guest);

      if (customFields && customFields instanceof Array) {
        customFields.forEach(field => {
          const customField = RocketChat.models.LivechatCustomField.findOneById(field.key);

          if (!customField) {
            throw new Meteor.Error('invalid-custom-field');
          }

          const {
            key,
            value,
            overwrite
          } = field;

          if (customField.scope === 'visitor' && !LivechatVisitors.updateLivechatDataByToken(token, key, value, overwrite)) {
            return RocketChat.API.v1.failure();
          }
        });
      }

      visitor = LivechatVisitors.findOneById(visitorId);
      return RocketChat.API.v1.success({
        visitor
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
RocketChat.API.v1.addRoute('livechat/visitor/:token', {
  get() {
    try {
      check(this.urlParams, {
        token: String
      });
      const visitor = LivechatVisitors.getVisitorByToken(this.urlParams.token);
      return RocketChat.API.v1.success({
        visitor
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  }

});
RocketChat.API.v1.addRoute('livechat/visitor/:token/room', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    const rooms = RocketChat.models.Rooms.findOpenByVisitorToken(this.urlParams.token, {
      fields: {
        name: 1,
        t: 1,
        cl: 1,
        u: 1,
        usernames: 1,
        servedBy: 1
      }
    }).fetch();
    return RocketChat.API.v1.success({
      rooms
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}},"permissions.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/permissions.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.startup(() => {
  const roles = _.pluck(RocketChat.models.Roles.find().fetch(), 'name');

  if (roles.indexOf('livechat-agent') === -1) {
    RocketChat.models.Roles.createOrUpdate('livechat-agent');
  }

  if (roles.indexOf('livechat-manager') === -1) {
    RocketChat.models.Roles.createOrUpdate('livechat-manager');
  }

  if (roles.indexOf('livechat-guest') === -1) {
    RocketChat.models.Roles.createOrUpdate('livechat-guest');
  }

  if (RocketChat.models && RocketChat.models.Permissions) {
    RocketChat.models.Permissions.createOrUpdate('view-l-room', ['livechat-agent', 'livechat-manager', 'admin']);
    RocketChat.models.Permissions.createOrUpdate('view-livechat-manager', ['livechat-manager', 'admin']);
    RocketChat.models.Permissions.createOrUpdate('view-livechat-rooms', ['livechat-manager', 'admin']);
    RocketChat.models.Permissions.createOrUpdate('close-livechat-room', ['livechat-agent', 'livechat-manager', 'admin']);
    RocketChat.models.Permissions.createOrUpdate('close-others-livechat-room', ['livechat-manager', 'admin']);
    RocketChat.models.Permissions.createOrUpdate('save-others-livechat-room-info', ['livechat-manager']);
    RocketChat.models.Permissions.createOrUpdate('remove-closed-livechat-rooms', ['livechat-manager', 'admin']);
    RocketChat.models.Permissions.createOrUpdate('view-livechat-analytics', ['livechat-manager', 'admin']);
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"messageTypes.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/messageTypes.js                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.MessageTypes.registerType({
  id: 'livechat_navigation_history',
  system: true,
  message: 'New_visitor_navigation',

  data(message) {
    if (!message.navigation || !message.navigation.page) {
      return;
    }

    return {
      history: `${(message.navigation.page.title ? `${message.navigation.page.title} - ` : '') + message.navigation.page.location.href}`
    };
  }

});
RocketChat.MessageTypes.registerType({
  id: 'livechat_video_call',
  system: true,
  message: 'New_videocall_request'
});
RocketChat.actionLinks.register('createLivechatCall', function (message, params, instance) {
  if (Meteor.isClient) {
    instance.tabBar.open('video');
  }
});
RocketChat.actionLinks.register('denyLivechatCall', function (message
/* , params*/
) {
  if (Meteor.isServer) {
    const user = Meteor.user();
    RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('command', message.rid, 'endCall', user);
    RocketChat.Notifications.notifyRoom(message.rid, 'deleteMessage', {
      _id: message._id
    });
    const language = user.language || RocketChat.settings.get('language') || 'en';
    RocketChat.Livechat.closeRoom({
      user,
      room: RocketChat.models.Rooms.findOneById(message.rid),
      comment: TAPi18n.__('Videocall_declined', {
        lng: language
      })
    });
    Meteor.defer(() => {
      RocketChat.models.Messages.setHiddenById(message._id);
    });
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"config.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/config.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.startup(function () {
  RocketChat.settings.addGroup('Livechat');
  RocketChat.settings.add('Livechat_enabled', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true
  });
  RocketChat.settings.add('Livechat_title', 'Rocket.Chat', {
    type: 'string',
    group: 'Livechat',
    public: true
  });
  RocketChat.settings.add('Livechat_title_color', '#C1272D', {
    type: 'color',
    editor: 'color',
    allowedTypes: ['color', 'expression'],
    group: 'Livechat',
    public: true
  });
  RocketChat.settings.add('Livechat_display_offline_form', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    section: 'Offline',
    i18nLabel: 'Display_offline_form'
  });
  RocketChat.settings.add('Livechat_validate_offline_email', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    section: 'Offline',
    i18nLabel: 'Validate_email_address'
  });
  RocketChat.settings.add('Livechat_offline_form_unavailable', '', {
    type: 'string',
    group: 'Livechat',
    public: true,
    section: 'Offline',
    i18nLabel: 'Offline_form_unavailable_message'
  });
  RocketChat.settings.add('Livechat_offline_title', 'Leave a message', {
    type: 'string',
    group: 'Livechat',
    public: true,
    section: 'Offline',
    i18nLabel: 'Title'
  });
  RocketChat.settings.add('Livechat_offline_title_color', '#666666', {
    type: 'color',
    editor: 'color',
    allowedTypes: ['color', 'expression'],
    group: 'Livechat',
    public: true,
    section: 'Offline',
    i18nLabel: 'Color'
  });
  RocketChat.settings.add('Livechat_offline_message', '', {
    type: 'string',
    group: 'Livechat',
    public: true,
    section: 'Offline',
    i18nLabel: 'Instructions',
    i18nDescription: 'Instructions_to_your_visitor_fill_the_form_to_send_a_message'
  });
  RocketChat.settings.add('Livechat_offline_email', '', {
    type: 'string',
    group: 'Livechat',
    i18nLabel: 'Email_address_to_send_offline_messages',
    section: 'Offline'
  });
  RocketChat.settings.add('Livechat_offline_success_message', '', {
    type: 'string',
    group: 'Livechat',
    public: true,
    section: 'Offline',
    i18nLabel: 'Offline_success_message'
  });
  RocketChat.settings.add('Livechat_allow_switching_departments', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Allow_switching_departments'
  });
  RocketChat.settings.add('Livechat_show_agent_email', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Show_agent_email'
  });
  RocketChat.settings.add('Livechat_conversation_finished_message', '', {
    type: 'string',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Conversation_finished_message'
  });
  RocketChat.settings.add('Livechat_registration_form', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Show_preregistration_form'
  });
  RocketChat.settings.add('Livechat_name_field_registration_form', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Show_name_field'
  });
  RocketChat.settings.add('Livechat_email_field_registration_form', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Show_email_field'
  });
  RocketChat.settings.add('Livechat_guest_count', 1, {
    type: 'int',
    group: 'Livechat'
  });
  RocketChat.settings.add('Livechat_Room_Count', 1, {
    type: 'int',
    group: 'Livechat',
    i18nLabel: 'Livechat_room_count'
  });
  RocketChat.settings.add('Livechat_agent_leave_action', 'none', {
    type: 'select',
    group: 'Livechat',
    values: [{
      key: 'none',
      i18nLabel: 'None'
    }, {
      key: 'forward',
      i18nLabel: 'Forward'
    }, {
      key: 'close',
      i18nLabel: 'Close'
    }],
    i18nLabel: 'How_to_handle_open_sessions_when_agent_goes_offline'
  });
  RocketChat.settings.add('Livechat_agent_leave_action_timeout', 60, {
    type: 'int',
    group: 'Livechat',
    enableQuery: {
      _id: 'Livechat_agent_leave_action',
      value: {
        $ne: 'none'
      }
    },
    i18nLabel: 'How_long_to_wait_after_agent_goes_offline',
    i18nDescription: 'Time_in_seconds'
  });
  RocketChat.settings.add('Livechat_agent_leave_comment', '', {
    type: 'string',
    group: 'Livechat',
    enableQuery: {
      _id: 'Livechat_agent_leave_action',
      value: 'close'
    },
    i18nLabel: 'Comment_to_leave_on_closing_session'
  });
  RocketChat.settings.add('Livechat_webhookUrl', false, {
    type: 'string',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Webhook_URL'
  });
  RocketChat.settings.add('Livechat_secret_token', false, {
    type: 'string',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Secret_token'
  });
  RocketChat.settings.add('Livechat_webhook_on_close', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Send_request_on_chat_close'
  });
  RocketChat.settings.add('Livechat_webhook_on_offline_msg', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Send_request_on_offline_messages'
  });
  RocketChat.settings.add('Livechat_webhook_on_visitor_message', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Send_request_on_visitor_message'
  });
  RocketChat.settings.add('Livechat_webhook_on_agent_message', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Send_request_on_agent_message'
  });
  RocketChat.settings.add('Send_visitor_navigation_history_livechat_webhook_request', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Send_visitor_navigation_history_on_request',
    i18nDescription: 'Feature_Depends_on_Livechat_Visitor_navigation_as_a_message_to_be_enabled',
    enableQuery: {
      _id: 'Livechat_Visitor_navigation_as_a_message',
      value: true
    }
  });
  RocketChat.settings.add('Livechat_webhook_on_capture', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Send_request_on_lead_capture'
  });
  RocketChat.settings.add('Livechat_lead_email_regex', '\\b[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\\.)+[A-Z]{2,4}\\b', {
    type: 'string',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Lead_capture_email_regex'
  });
  RocketChat.settings.add('Livechat_lead_phone_regex', '((?:\\([0-9]{1,3}\\)|[0-9]{2})[ \\-]*?[0-9]{4,5}(?:[\\-\\s\\_]{1,2})?[0-9]{4}(?:(?=[^0-9])|$)|[0-9]{4,5}(?:[\\-\\s\\_]{1,2})?[0-9]{4}(?:(?=[^0-9])|$))', {
    type: 'string',
    group: 'Livechat',
    section: 'CRM_Integration',
    i18nLabel: 'Lead_capture_phone_regex'
  });
  RocketChat.settings.add('Livechat_Knowledge_Enabled', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'Knowledge_Base',
    public: true,
    i18nLabel: 'Enabled'
  });
  RocketChat.settings.add('Livechat_Knowledge_Apiai_Key', '', {
    type: 'string',
    group: 'Livechat',
    section: 'Knowledge_Base',
    public: true,
    i18nLabel: 'Apiai_Key'
  });
  RocketChat.settings.add('Livechat_Knowledge_Apiai_Language', 'en', {
    type: 'string',
    group: 'Livechat',
    section: 'Knowledge_Base',
    public: true,
    i18nLabel: 'Apiai_Language'
  });
  RocketChat.settings.add('Livechat_history_monitor_type', 'url', {
    type: 'select',
    group: 'Livechat',
    i18nLabel: 'Monitor_history_for_changes_on',
    values: [{
      key: 'url',
      i18nLabel: 'Page_URL'
    }, {
      key: 'title',
      i18nLabel: 'Page_title'
    }]
  });
  RocketChat.settings.add('Livechat_Visitor_navigation_as_a_message', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Send_Visitor_navigation_history_as_a_message'
  });
  RocketChat.settings.add('Livechat_enable_office_hours', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Office_hours_enabled'
  });
  RocketChat.settings.add('Livechat_continuous_sound_notification_new_livechat_room', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Continuous_sound_notifications_for_new_livechat_room'
  });
  RocketChat.settings.add('Livechat_videocall_enabled', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Videocall_enabled',
    i18nDescription: 'Beta_feature_Depends_on_Video_Conference_to_be_enabled',
    enableQuery: {
      _id: 'Jitsi_Enabled',
      value: true
    }
  });
  RocketChat.settings.add('Livechat_fileupload_enabled', true, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'FileUpload_Enabled',
    enableQuery: {
      _id: 'FileUpload_Enabled',
      value: true
    }
  });
  RocketChat.settings.add('Livechat_enable_transcript', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Transcript_Enabled'
  });
  RocketChat.settings.add('Livechat_transcript_message', '', {
    type: 'string',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Transcript_message',
    enableQuery: {
      _id: 'Livechat_enable_transcript',
      value: true
    }
  });
  RocketChat.settings.add('Livechat_open_inquiery_show_connecting', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Livechat_open_inquiery_show_connecting',
    enableQuery: {
      _id: 'Livechat_Routing_Method',
      value: 'Guest_Pool'
    }
  });
  RocketChat.settings.add('Livechat_AllowedDomainsList', '', {
    type: 'string',
    group: 'Livechat',
    public: true,
    i18nLabel: 'Livechat_AllowedDomainsList',
    i18nDescription: 'Domains_allowed_to_embed_the_livechat_widget'
  });
  RocketChat.settings.add('Livechat_Facebook_Enabled', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'Facebook'
  });
  RocketChat.settings.add('Livechat_Facebook_API_Key', '', {
    type: 'string',
    group: 'Livechat',
    section: 'Facebook',
    i18nDescription: 'If_you_dont_have_one_send_an_email_to_omni_rocketchat_to_get_yours'
  });
  RocketChat.settings.add('Livechat_Facebook_API_Secret', '', {
    type: 'string',
    group: 'Livechat',
    section: 'Facebook',
    i18nDescription: 'If_you_dont_have_one_send_an_email_to_omni_rocketchat_to_get_yours'
  });
  RocketChat.settings.add('Livechat_RDStation_Token', '', {
    type: 'string',
    group: 'Livechat',
    public: false,
    section: 'RD Station',
    i18nLabel: 'RDStation_Token'
  });
  RocketChat.settings.add('Livechat_Routing_Method', 'Least_Amount', {
    type: 'select',
    group: 'Livechat',
    public: true,
    section: 'Routing',
    values: [{
      key: 'External',
      i18nLabel: 'External_Service'
    }, {
      key: 'Least_Amount',
      i18nLabel: 'Least_Amount'
    }, {
      key: 'Guest_Pool',
      i18nLabel: 'Guest_Pool'
    }]
  });
  RocketChat.settings.add('Livechat_guest_pool_with_no_agents', false, {
    type: 'boolean',
    group: 'Livechat',
    section: 'Routing',
    i18nLabel: 'Accept_with_no_online_agents',
    i18nDescription: 'Accept_incoming_livechat_requests_even_if_there_are_no_online_agents',
    enableQuery: {
      _id: 'Livechat_Routing_Method',
      value: 'Guest_Pool'
    }
  });
  RocketChat.settings.add('Livechat_show_queue_list_link', false, {
    type: 'boolean',
    group: 'Livechat',
    public: true,
    section: 'Routing',
    i18nLabel: 'Show_queue_list_to_all_agents',
    enableQuery: {
      _id: 'Livechat_Routing_Method',
      value: {
        $ne: 'External'
      }
    }
  });
  RocketChat.settings.add('Livechat_External_Queue_URL', '', {
    type: 'string',
    group: 'Livechat',
    public: false,
    section: 'Routing',
    i18nLabel: 'External_Queue_Service_URL',
    i18nDescription: 'For_more_details_please_check_our_docs',
    enableQuery: {
      _id: 'Livechat_Routing_Method',
      value: 'External'
    }
  });
  RocketChat.settings.add('Livechat_External_Queue_Token', '', {
    type: 'string',
    group: 'Livechat',
    public: false,
    section: 'Routing',
    i18nLabel: 'Secret_token',
    enableQuery: {
      _id: 'Livechat_Routing_Method',
      value: 'External'
    }
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"imports":{"LivechatRoomType.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/imports/LivechatRoomType.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => LivechatRoomType
});
let RoomSettingsEnum, RoomTypeConfig, RoomTypeRouteConfig, UiTextContext;
module.watch(require("meteor/rocketchat:lib"), {
  RoomSettingsEnum(v) {
    RoomSettingsEnum = v;
  },

  RoomTypeConfig(v) {
    RoomTypeConfig = v;
  },

  RoomTypeRouteConfig(v) {
    RoomTypeRouteConfig = v;
  },

  UiTextContext(v) {
    UiTextContext = v;
  }

}, 0);

class LivechatRoomRoute extends RoomTypeRouteConfig {
  constructor() {
    super({
      name: 'live',
      path: '/live/:id'
    });
  }

  action(params) {
    openRoom('l', params.id);
  }

  link(sub) {
    return {
      id: sub.rid
    };
  }

}

class LivechatRoomType extends RoomTypeConfig {
  constructor() {
    super({
      identifier: 'l',
      order: 5,
      icon: 'livechat',
      label: 'Livechat',
      route: new LivechatRoomRoute()
    });
    this.notSubscribedTpl = {
      template: 'livechatNotSubscribed'
    };
  }

  findRoom(identifier) {
    return ChatRoom.findOne({
      _id: identifier
    });
  }

  roomName(roomData) {
    return roomData.name || roomData.fname || roomData.label;
  }

  condition() {
    return RocketChat.settings.get('Livechat_enabled') && RocketChat.authz.hasAllPermission('view-l-room');
  }

  canSendMessage(roomId) {
    const room = ChatRoom.findOne({
      _id: roomId
    }, {
      fields: {
        open: 1
      }
    });
    return room && room.open === true;
  }

  getUserStatus(roomId) {
    const room = Session.get(`roomData${roomId}`);

    if (room) {
      return room.v && room.v.status;
    }

    const inquiry = LivechatInquiry.findOne({
      rid: roomId
    });
    return inquiry && inquiry.v && inquiry.v.status;
  }

  allowRoomSettingChange(room, setting) {
    switch (setting) {
      case RoomSettingsEnum.JOIN_CODE:
        return false;

      default:
        return true;
    }
  }

  getUiText(context) {
    switch (context) {
      case UiTextContext.HIDE_WARNING:
        return 'Hide_Livechat_Warning';

      case UiTextContext.LEAVE_WARNING:
        return 'Hide_Livechat_Warning';

      default:
        return '';
    }
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server":{"rest":{"departments.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/imports/server/rest/departments.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.API.v1.addRoute('livechat/department', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    return RocketChat.API.v1.success({
      departments: RocketChat.models.LivechatDepartment.find().fetch()
    });
  },

  post() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.bodyParams, {
        department: Object,
        agents: Array
      });
      const department = RocketChat.Livechat.saveDepartment(null, this.bodyParams.department, this.bodyParams.agents);

      if (department) {
        return RocketChat.API.v1.success({
          department,
          agents: RocketChat.models.LivechatDepartmentAgents.find({
            departmentId: department._id
          }).fetch()
        });
      }

      RocketChat.API.v1.failure();
    } catch (e) {
      return RocketChat.API.v1.failure(e);
    }
  }

});
RocketChat.API.v1.addRoute('livechat/department/:_id', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.urlParams, {
        _id: String
      });
      return RocketChat.API.v1.success({
        department: RocketChat.models.LivechatDepartment.findOneById(this.urlParams._id),
        agents: RocketChat.models.LivechatDepartmentAgents.find({
          departmentId: this.urlParams._id
        }).fetch()
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  },

  put() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.urlParams, {
        _id: String
      });
      check(this.bodyParams, {
        department: Object,
        agents: Array
      });

      if (RocketChat.Livechat.saveDepartment(this.urlParams._id, this.bodyParams.department, this.bodyParams.agents)) {
        return RocketChat.API.v1.success({
          department: RocketChat.models.LivechatDepartment.findOneById(this.urlParams._id),
          agents: RocketChat.models.LivechatDepartmentAgents.find({
            departmentId: this.urlParams._id
          }).fetch()
        });
      }

      return RocketChat.API.v1.failure();
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  },

  delete() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.urlParams, {
        _id: String
      });

      if (RocketChat.Livechat.removeDepartment(this.urlParams._id)) {
        return RocketChat.API.v1.success();
      }

      return RocketChat.API.v1.failure();
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"facebook.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/imports/server/rest/facebook.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let crypto;
module.watch(require("crypto"), {
  default(v) {
    crypto = v;
  }

}, 0);
let LivechatVisitors;
module.watch(require("../../../server/models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 1);

/**
 * @api {post} /livechat/facebook Send Facebook message
 * @apiName Facebook
 * @apiGroup Livechat
 *
 * @apiParam {String} mid Facebook message id
 * @apiParam {String} page Facebook pages id
 * @apiParam {String} token Facebook user's token
 * @apiParam {String} first_name Facebook user's first name
 * @apiParam {String} last_name Facebook user's last name
 * @apiParam {String} [text] Facebook message text
 * @apiParam {String} [attachments] Facebook message attachments
 */
RocketChat.API.v1.addRoute('livechat/facebook', {
  post() {
    if (!this.bodyParams.text && !this.bodyParams.attachments) {
      return {
        success: false
      };
    }

    if (!this.request.headers['x-hub-signature']) {
      return {
        success: false
      };
    }

    if (!RocketChat.settings.get('Livechat_Facebook_Enabled')) {
      return {
        success: false,
        error: 'Integration disabled'
      };
    } // validate if request come from omni


    const signature = crypto.createHmac('sha1', RocketChat.settings.get('Livechat_Facebook_API_Secret')).update(JSON.stringify(this.request.body)).digest('hex');

    if (this.request.headers['x-hub-signature'] !== `sha1=${signature}`) {
      return {
        success: false,
        error: 'Invalid signature'
      };
    }

    const sendMessage = {
      message: {
        _id: this.bodyParams.mid
      },
      roomInfo: {
        facebook: {
          page: this.bodyParams.page
        }
      }
    };
    let visitor = LivechatVisitors.getVisitorByToken(this.bodyParams.token);

    if (visitor) {
      const rooms = RocketChat.models.Rooms.findOpenByVisitorToken(visitor.token).fetch();

      if (rooms && rooms.length > 0) {
        sendMessage.message.rid = rooms[0]._id;
      } else {
        sendMessage.message.rid = Random.id();
      }

      sendMessage.message.token = visitor.token;
    } else {
      sendMessage.message.rid = Random.id();
      sendMessage.message.token = this.bodyParams.token;
      const userId = RocketChat.Livechat.registerGuest({
        token: sendMessage.message.token,
        name: `${this.bodyParams.first_name} ${this.bodyParams.last_name}`
      });
      visitor = RocketChat.models.Users.findOneById(userId);
    }

    sendMessage.message.msg = this.bodyParams.text;
    sendMessage.guest = visitor;

    try {
      return {
        sucess: true,
        message: RocketChat.Livechat.sendMessage(sendMessage)
      };
    } catch (e) {
      console.error('Error using Facebook ->', e);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sms.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/imports/server/rest/sms.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LivechatVisitors;
module.watch(require("../../../server/models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 0);
RocketChat.API.v1.addRoute('livechat/sms-incoming/:service', {
  post() {
    const SMSService = RocketChat.SMS.getService(this.urlParams.service);
    const sms = SMSService.parse(this.bodyParams);
    let visitor = LivechatVisitors.findOneVisitorByPhone(sms.from);
    const sendMessage = {
      message: {
        _id: Random.id()
      },
      roomInfo: {
        sms: {
          from: sms.to
        }
      }
    };

    if (visitor) {
      const rooms = RocketChat.models.Rooms.findOpenByVisitorToken(visitor.token).fetch();

      if (rooms && rooms.length > 0) {
        sendMessage.message.rid = rooms[0]._id;
      } else {
        sendMessage.message.rid = Random.id();
      }

      sendMessage.message.token = visitor.token;
    } else {
      sendMessage.message.rid = Random.id();
      sendMessage.message.token = Random.id();
      const visitorId = RocketChat.Livechat.registerGuest({
        username: sms.from.replace(/[^0-9]/g, ''),
        token: sendMessage.message.token,
        phone: {
          number: sms.from
        }
      });
      visitor = LivechatVisitors.findOneById(visitorId);
    }

    sendMessage.message.msg = sms.body;
    sendMessage.guest = visitor;
    sendMessage.message.attachments = sms.media.map(curr => {
      const attachment = {
        message_link: curr.url
      };
      const {
        contentType
      } = curr;

      switch (contentType.substr(0, contentType.indexOf('/'))) {
        case 'image':
          attachment.image_url = curr.url;
          break;

        case 'video':
          attachment.video_url = curr.url;
          break;

        case 'audio':
          attachment.audio_url = curr.url;
          break;
      }

      return attachment;
    });

    try {
      const message = SMSService.response.call(this, RocketChat.Livechat.sendMessage(sendMessage));
      Meteor.defer(() => {
        if (sms.extra) {
          if (sms.extra.fromCountry) {
            Meteor.call('livechat:setCustomField', sendMessage.message.token, 'country', sms.extra.fromCountry);
          }

          if (sms.extra.fromState) {
            Meteor.call('livechat:setCustomField', sendMessage.message.token, 'state', sms.extra.fromState);
          }

          if (sms.extra.fromCity) {
            Meteor.call('livechat:setCustomField', sendMessage.message.token, 'city', sms.extra.fromCity);
          }
        }
      });
      return message;
    } catch (e) {
      return SMSService.error.call(this, e);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"upload.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/imports/server/rest/upload.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Busboy;
module.watch(require("busboy"), {
  default(v) {
    Busboy = v;
  }

}, 0);
let filesize;
module.watch(require("filesize"), {
  default(v) {
    filesize = v;
  }

}, 1);
let LivechatVisitors;
module.watch(require("../../../server/models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 2);
let maxFileSize;
RocketChat.settings.get('FileUpload_MaxFileSize', function (key, value) {
  try {
    maxFileSize = parseInt(value);
  } catch (e) {
    maxFileSize = RocketChat.models.Settings.findOneById('FileUpload_MaxFileSize').packageValue;
  }
});
RocketChat.API.v1.addRoute('livechat/upload/:rid', {
  post() {
    if (!this.request.headers['x-visitor-token']) {
      return RocketChat.API.v1.unauthorized();
    }

    const visitorToken = this.request.headers['x-visitor-token'];
    const visitor = LivechatVisitors.getVisitorByToken(visitorToken);

    if (!visitor) {
      return RocketChat.API.v1.unauthorized();
    }

    const room = RocketChat.models.Rooms.findOneOpenByRoomIdAndVisitorToken(this.urlParams.rid, visitorToken);

    if (!room) {
      return RocketChat.API.v1.unauthorized();
    }

    const busboy = new Busboy({
      headers: this.request.headers
    });
    const files = [];
    const fields = {};
    Meteor.wrapAsync(callback => {
      busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (fieldname !== 'file') {
          return files.push(new Meteor.Error('invalid-field'));
        }

        const fileDate = [];
        file.on('data', data => fileDate.push(data));
        file.on('end', () => {
          files.push({
            fieldname,
            file,
            filename,
            encoding,
            mimetype,
            fileBuffer: Buffer.concat(fileDate)
          });
        });
      });
      busboy.on('field', (fieldname, value) => fields[fieldname] = value);
      busboy.on('finish', Meteor.bindEnvironment(() => callback()));
      this.request.pipe(busboy);
    })();

    if (files.length === 0) {
      return RocketChat.API.v1.failure('File required');
    }

    if (files.length > 1) {
      return RocketChat.API.v1.failure('Just 1 file is allowed');
    }

    const file = files[0];

    if (!RocketChat.fileUploadIsValidContentType(file.mimetype)) {
      return RocketChat.API.v1.failure({
        reason: 'error-type-not-allowed'
      });
    } // -1 maxFileSize means there is no limit


    if (maxFileSize > -1 && file.fileBuffer.length > maxFileSize) {
      return RocketChat.API.v1.failure({
        reason: 'error-size-not-allowed',
        sizeAllowed: filesize(maxFileSize)
      });
    }

    const fileStore = FileUpload.getStore('Uploads');
    const details = {
      name: file.filename,
      size: file.fileBuffer.length,
      type: file.mimetype,
      rid: this.urlParams.rid,
      visitorToken
    };
    const uploadedFile = Meteor.wrapAsync(fileStore.insert.bind(fileStore))(details, file.fileBuffer);
    uploadedFile.description = fields.description;
    delete fields.description;
    RocketChat.API.v1.success(Meteor.call('sendFileLivechatMessage', this.urlParams.rid, visitorToken, uploadedFile, fields));
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"users.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_livechat/imports/server/rest/users.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
RocketChat.API.v1.addRoute('livechat/users/:type', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.urlParams, {
        type: String
      });
      let role;

      if (this.urlParams.type === 'agent') {
        role = 'livechat-agent';
      } else if (this.urlParams.type === 'manager') {
        role = 'livechat-manager';
      } else {
        throw 'Invalid type';
      }

      const users = RocketChat.authz.getUsersInRole(role);
      return RocketChat.API.v1.success({
        users: users.fetch().map(user => _.pick(user, '_id', 'username', 'name', 'status', 'statusLivechat'))
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  },

  post() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.urlParams, {
        type: String
      });
      check(this.bodyParams, {
        username: String
      });

      if (this.urlParams.type === 'agent') {
        const user = RocketChat.Livechat.addAgent(this.bodyParams.username);

        if (user) {
          return RocketChat.API.v1.success({
            user
          });
        }
      } else if (this.urlParams.type === 'manager') {
        const user = RocketChat.Livechat.addManager(this.bodyParams.username);

        if (user) {
          return RocketChat.API.v1.success({
            user
          });
        }
      } else {
        throw 'Invalid type';
      }

      return RocketChat.API.v1.failure();
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  }

});
RocketChat.API.v1.addRoute('livechat/users/:type/:_id', {
  authRequired: true
}, {
  get() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.urlParams, {
        type: String,
        _id: String
      });
      const user = RocketChat.models.Users.findOneById(this.urlParams._id);

      if (!user) {
        return RocketChat.API.v1.failure('User not found');
      }

      let role;

      if (this.urlParams.type === 'agent') {
        role = 'livechat-agent';
      } else if (this.urlParams.type === 'manager') {
        role = 'livechat-manager';
      } else {
        throw 'Invalid type';
      }

      if (user.roles.indexOf(role) !== -1) {
        return RocketChat.API.v1.success({
          user: _.pick(user, '_id', 'username')
        });
      }

      return RocketChat.API.v1.success({
        user: null
      });
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  },

  delete() {
    if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
      return RocketChat.API.v1.unauthorized();
    }

    try {
      check(this.urlParams, {
        type: String,
        _id: String
      });
      const user = RocketChat.models.Users.findOneById(this.urlParams._id);

      if (!user) {
        return RocketChat.API.v1.failure();
      }

      if (this.urlParams.type === 'agent') {
        if (RocketChat.Livechat.removeAgent(user.username)) {
          return RocketChat.API.v1.success();
        }
      } else if (this.urlParams.type === 'manager') {
        if (RocketChat.Livechat.removeManager(user.username)) {
          return RocketChat.API.v1.success();
        }
      } else {
        throw 'Invalid type';
      }

      return RocketChat.API.v1.failure();
    } catch (e) {
      return RocketChat.API.v1.failure(e.error);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}},"node_modules":{"ua-parser-js":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_livechat/node_modules/ua-parser-js/package.json                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "ua-parser-js";
exports.version = "0.7.17";
exports.main = "src/ua-parser.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"src":{"ua-parser.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_livechat/node_modules/ua-parser-js/src/ua-parser.js                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * UAParser.js v0.7.17
 * Lightweight JavaScript-based User-Agent string parser
 * https://github.com/faisalman/ua-parser-js
 *
 * Copyright © 2012-2016 Faisal Salman <fyzlman@gmail.com>
 * Dual licensed under GPLv2 & MIT
 */

(function (window, undefined) {

    'use strict';

    //////////////
    // Constants
    /////////////


    var LIBVERSION  = '0.7.17',
        EMPTY       = '',
        UNKNOWN     = '?',
        FUNC_TYPE   = 'function',
        UNDEF_TYPE  = 'undefined',
        OBJ_TYPE    = 'object',
        STR_TYPE    = 'string',
        MAJOR       = 'major', // deprecated
        MODEL       = 'model',
        NAME        = 'name',
        TYPE        = 'type',
        VENDOR      = 'vendor',
        VERSION     = 'version',
        ARCHITECTURE= 'architecture',
        CONSOLE     = 'console',
        MOBILE      = 'mobile',
        TABLET      = 'tablet',
        SMARTTV     = 'smarttv',
        WEARABLE    = 'wearable',
        EMBEDDED    = 'embedded';


    ///////////
    // Helper
    //////////


    var util = {
        extend : function (regexes, extensions) {
            var margedRegexes = {};
            for (var i in regexes) {
                if (extensions[i] && extensions[i].length % 2 === 0) {
                    margedRegexes[i] = extensions[i].concat(regexes[i]);
                } else {
                    margedRegexes[i] = regexes[i];
                }
            }
            return margedRegexes;
        },
        has : function (str1, str2) {
          if (typeof str1 === "string") {
            return str2.toLowerCase().indexOf(str1.toLowerCase()) !== -1;
          } else {
            return false;
          }
        },
        lowerize : function (str) {
            return str.toLowerCase();
        },
        major : function (version) {
            return typeof(version) === STR_TYPE ? version.replace(/[^\d\.]/g,'').split(".")[0] : undefined;
        },
        trim : function (str) {
          return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        }
    };


    ///////////////
    // Map helper
    //////////////


    var mapper = {

        rgx : function (ua, arrays) {

            //var result = {},
            var i = 0, j, k, p, q, matches, match;//, args = arguments;

            /*// construct object barebones
            for (p = 0; p < args[1].length; p++) {
                q = args[1][p];
                result[typeof q === OBJ_TYPE ? q[0] : q] = undefined;
            }*/

            // loop through all regexes maps
            while (i < arrays.length && !matches) {

                var regex = arrays[i],       // even sequence (0,2,4,..)
                    props = arrays[i + 1];   // odd sequence (1,3,5,..)
                j = k = 0;

                // try matching uastring with regexes
                while (j < regex.length && !matches) {

                    matches = regex[j++].exec(ua);

                    if (!!matches) {
                        for (p = 0; p < props.length; p++) {
                            match = matches[++k];
                            q = props[p];
                            // check if given property is actually array
                            if (typeof q === OBJ_TYPE && q.length > 0) {
                                if (q.length == 2) {
                                    if (typeof q[1] == FUNC_TYPE) {
                                        // assign modified match
                                        this[q[0]] = q[1].call(this, match);
                                    } else {
                                        // assign given value, ignore regex match
                                        this[q[0]] = q[1];
                                    }
                                } else if (q.length == 3) {
                                    // check whether function or regex
                                    if (typeof q[1] === FUNC_TYPE && !(q[1].exec && q[1].test)) {
                                        // call function (usually string mapper)
                                        this[q[0]] = match ? q[1].call(this, match, q[2]) : undefined;
                                    } else {
                                        // sanitize match using given regex
                                        this[q[0]] = match ? match.replace(q[1], q[2]) : undefined;
                                    }
                                } else if (q.length == 4) {
                                        this[q[0]] = match ? q[3].call(this, match.replace(q[1], q[2])) : undefined;
                                }
                            } else {
                                this[q] = match ? match : undefined;
                            }
                        }
                    }
                }
                i += 2;
            }
            // console.log(this);
            //return this;
        },

        str : function (str, map) {

            for (var i in map) {
                // check if array
                if (typeof map[i] === OBJ_TYPE && map[i].length > 0) {
                    for (var j = 0; j < map[i].length; j++) {
                        if (util.has(map[i][j], str)) {
                            return (i === UNKNOWN) ? undefined : i;
                        }
                    }
                } else if (util.has(map[i], str)) {
                    return (i === UNKNOWN) ? undefined : i;
                }
            }
            return str;
        }
    };


    ///////////////
    // String map
    //////////////


    var maps = {

        browser : {
            oldsafari : {
                version : {
                    '1.0'   : '/8',
                    '1.2'   : '/1',
                    '1.3'   : '/3',
                    '2.0'   : '/412',
                    '2.0.2' : '/416',
                    '2.0.3' : '/417',
                    '2.0.4' : '/419',
                    '?'     : '/'
                }
            }
        },

        device : {
            amazon : {
                model : {
                    'Fire Phone' : ['SD', 'KF']
                }
            },
            sprint : {
                model : {
                    'Evo Shift 4G' : '7373KT'
                },
                vendor : {
                    'HTC'       : 'APA',
                    'Sprint'    : 'Sprint'
                }
            }
        },

        os : {
            windows : {
                version : {
                    'ME'        : '4.90',
                    'NT 3.11'   : 'NT3.51',
                    'NT 4.0'    : 'NT4.0',
                    '2000'      : 'NT 5.0',
                    'XP'        : ['NT 5.1', 'NT 5.2'],
                    'Vista'     : 'NT 6.0',
                    '7'         : 'NT 6.1',
                    '8'         : 'NT 6.2',
                    '8.1'       : 'NT 6.3',
                    '10'        : ['NT 6.4', 'NT 10.0'],
                    'RT'        : 'ARM'
                }
            }
        }
    };


    //////////////
    // Regex map
    /////////////


    var regexes = {

        browser : [[

            // Presto based
            /(opera\smini)\/([\w\.-]+)/i,                                       // Opera Mini
            /(opera\s[mobiletab]+).+version\/([\w\.-]+)/i,                      // Opera Mobi/Tablet
            /(opera).+version\/([\w\.]+)/i,                                     // Opera > 9.80
            /(opera)[\/\s]+([\w\.]+)/i                                          // Opera < 9.80
            ], [NAME, VERSION], [

            /(opios)[\/\s]+([\w\.]+)/i                                          // Opera mini on iphone >= 8.0
            ], [[NAME, 'Opera Mini'], VERSION], [

            /\s(opr)\/([\w\.]+)/i                                               // Opera Webkit
            ], [[NAME, 'Opera'], VERSION], [

            // Mixed
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?([\w\.]+)*/i,
                                                                                // Lunascape/Maxthon/Netfront/Jasmine/Blazer

            // Trident based
            /(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?([\w\.]*)/i,
                                                                                // Avant/IEMobile/SlimBrowser/Baidu
            /(?:ms|\()(ie)\s([\w\.]+)/i,                                        // Internet Explorer

            // Webkit/KHTML based
            /(rekonq)\/([\w\.]+)*/i,                                            // Rekonq
            /(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs|bowser)\/([\w\.-]+)/i
                                                                                // Chromium/Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron/Iridium/PhantomJS/Bowser
            ], [NAME, VERSION], [

            /(trident).+rv[:\s]([\w\.]+).+like\sgecko/i                         // IE11
            ], [[NAME, 'IE'], VERSION], [

            /(edge)\/((\d+)?[\w\.]+)/i                                          // Microsoft Edge
            ], [NAME, VERSION], [

            /(yabrowser)\/([\w\.]+)/i                                           // Yandex
            ], [[NAME, 'Yandex'], VERSION], [

            /(puffin)\/([\w\.]+)/i                                              // Puffin
            ], [[NAME, 'Puffin'], VERSION], [

            /((?:[\s\/])uc?\s?browser|(?:juc.+)ucweb)[\/\s]?([\w\.]+)/i
                                                                                // UCBrowser
            ], [[NAME, 'UCBrowser'], VERSION], [

            /(comodo_dragon)\/([\w\.]+)/i                                       // Comodo Dragon
            ], [[NAME, /_/g, ' '], VERSION], [

            /(micromessenger)\/([\w\.]+)/i                                      // WeChat
            ], [[NAME, 'WeChat'], VERSION], [

            /(QQ)\/([\d\.]+)/i                                                  // QQ, aka ShouQ
            ], [NAME, VERSION], [

            /m?(qqbrowser)[\/\s]?([\w\.]+)/i                                    // QQBrowser
            ], [NAME, VERSION], [

            /xiaomi\/miuibrowser\/([\w\.]+)/i                                   // MIUI Browser
            ], [VERSION, [NAME, 'MIUI Browser']], [

            /;fbav\/([\w\.]+);/i                                                // Facebook App for iOS & Android
            ], [VERSION, [NAME, 'Facebook']], [

            /headlesschrome(?:\/([\w\.]+)|\s)/i                                 // Chrome Headless
            ], [VERSION, [NAME, 'Chrome Headless']], [

            /\swv\).+(chrome)\/([\w\.]+)/i                                      // Chrome WebView
            ], [[NAME, /(.+)/, '$1 WebView'], VERSION], [

            /((?:oculus|samsung)browser)\/([\w\.]+)/i
            ], [[NAME, /(.+(?:g|us))(.+)/, '$1 $2'], VERSION], [                // Oculus / Samsung Browser

            /android.+version\/([\w\.]+)\s+(?:mobile\s?safari|safari)*/i        // Android Browser
            ], [VERSION, [NAME, 'Android Browser']], [

            /(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?([\w\.]+)/i
                                                                                // Chrome/OmniWeb/Arora/Tizen/Nokia
            ], [NAME, VERSION], [

            /(dolfin)\/([\w\.]+)/i                                              // Dolphin
            ], [[NAME, 'Dolphin'], VERSION], [

            /((?:android.+)crmo|crios)\/([\w\.]+)/i                             // Chrome for Android/iOS
            ], [[NAME, 'Chrome'], VERSION], [

            /(coast)\/([\w\.]+)/i                                               // Opera Coast
            ], [[NAME, 'Opera Coast'], VERSION], [

            /fxios\/([\w\.-]+)/i                                                // Firefox for iOS
            ], [VERSION, [NAME, 'Firefox']], [

            /version\/([\w\.]+).+?mobile\/\w+\s(safari)/i                       // Mobile Safari
            ], [VERSION, [NAME, 'Mobile Safari']], [

            /version\/([\w\.]+).+?(mobile\s?safari|safari)/i                    // Safari & Safari Mobile
            ], [VERSION, NAME], [

            /webkit.+?(gsa)\/([\w\.]+).+?(mobile\s?safari|safari)(\/[\w\.]+)/i  // Google Search Appliance on iOS
            ], [[NAME, 'GSA'], VERSION], [

            /webkit.+?(mobile\s?safari|safari)(\/[\w\.]+)/i                     // Safari < 3.0
            ], [NAME, [VERSION, mapper.str, maps.browser.oldsafari.version]], [

            /(konqueror)\/([\w\.]+)/i,                                          // Konqueror
            /(webkit|khtml)\/([\w\.]+)/i
            ], [NAME, VERSION], [

            // Gecko based
            /(navigator|netscape)\/([\w\.-]+)/i                                 // Netscape
            ], [[NAME, 'Netscape'], VERSION], [
            /(swiftfox)/i,                                                      // Swiftfox
            /(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?([\w\.\+]+)/i,
                                                                                // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
            /(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/([\w\.-]+)/i,
                                                                                // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
            /(mozilla)\/([\w\.]+).+rv\:.+gecko\/\d+/i,                          // Mozilla

            // Other
            /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir)[\/\s]?([\w\.]+)/i,
                                                                                // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/Sleipnir
            /(links)\s\(([\w\.]+)/i,                                            // Links
            /(gobrowser)\/?([\w\.]+)*/i,                                        // GoBrowser
            /(ice\s?browser)\/v?([\w\._]+)/i,                                   // ICE Browser
            /(mosaic)[\/\s]([\w\.]+)/i                                          // Mosaic
            ], [NAME, VERSION]

            /* /////////////////////
            // Media players BEGIN
            ////////////////////////

            , [

            /(apple(?:coremedia|))\/((\d+)[\w\._]+)/i,                          // Generic Apple CoreMedia
            /(coremedia) v((\d+)[\w\._]+)/i
            ], [NAME, VERSION], [

            /(aqualung|lyssna|bsplayer)\/((\d+)?[\w\.-]+)/i                     // Aqualung/Lyssna/BSPlayer
            ], [NAME, VERSION], [

            /(ares|ossproxy)\s((\d+)[\w\.-]+)/i                                 // Ares/OSSProxy
            ], [NAME, VERSION], [

            /(audacious|audimusicstream|amarok|bass|core|dalvik|gnomemplayer|music on console|nsplayer|psp-internetradioplayer|videos)\/((\d+)[\w\.-]+)/i,
                                                                                // Audacious/AudiMusicStream/Amarok/BASS/OpenCORE/Dalvik/GnomeMplayer/MoC
                                                                                // NSPlayer/PSP-InternetRadioPlayer/Videos
            /(clementine|music player daemon)\s((\d+)[\w\.-]+)/i,               // Clementine/MPD
            /(lg player|nexplayer)\s((\d+)[\d\.]+)/i,
            /player\/(nexplayer|lg player)\s((\d+)[\w\.-]+)/i                   // NexPlayer/LG Player
            ], [NAME, VERSION], [
            /(nexplayer)\s((\d+)[\w\.-]+)/i                                     // Nexplayer
            ], [NAME, VERSION], [

            /(flrp)\/((\d+)[\w\.-]+)/i                                          // Flip Player
            ], [[NAME, 'Flip Player'], VERSION], [

            /(fstream|nativehost|queryseekspider|ia-archiver|facebookexternalhit)/i
                                                                                // FStream/NativeHost/QuerySeekSpider/IA Archiver/facebookexternalhit
            ], [NAME], [

            /(gstreamer) souphttpsrc (?:\([^\)]+\)){0,1} libsoup\/((\d+)[\w\.-]+)/i
                                                                                // Gstreamer
            ], [NAME, VERSION], [

            /(htc streaming player)\s[\w_]+\s\/\s((\d+)[\d\.]+)/i,              // HTC Streaming Player
            /(java|python-urllib|python-requests|wget|libcurl)\/((\d+)[\w\.-_]+)/i,
                                                                                // Java/urllib/requests/wget/cURL
            /(lavf)((\d+)[\d\.]+)/i                                             // Lavf (FFMPEG)
            ], [NAME, VERSION], [

            /(htc_one_s)\/((\d+)[\d\.]+)/i                                      // HTC One S
            ], [[NAME, /_/g, ' '], VERSION], [

            /(mplayer)(?:\s|\/)(?:(?:sherpya-){0,1}svn)(?:-|\s)(r\d+(?:-\d+[\w\.-]+){0,1})/i
                                                                                // MPlayer SVN
            ], [NAME, VERSION], [

            /(mplayer)(?:\s|\/|[unkow-]+)((\d+)[\w\.-]+)/i                      // MPlayer
            ], [NAME, VERSION], [

            /(mplayer)/i,                                                       // MPlayer (no other info)
            /(yourmuze)/i,                                                      // YourMuze
            /(media player classic|nero showtime)/i                             // Media Player Classic/Nero ShowTime
            ], [NAME], [

            /(nero (?:home|scout))\/((\d+)[\w\.-]+)/i                           // Nero Home/Nero Scout
            ], [NAME, VERSION], [

            /(nokia\d+)\/((\d+)[\w\.-]+)/i                                      // Nokia
            ], [NAME, VERSION], [

            /\s(songbird)\/((\d+)[\w\.-]+)/i                                    // Songbird/Philips-Songbird
            ], [NAME, VERSION], [

            /(winamp)3 version ((\d+)[\w\.-]+)/i,                               // Winamp
            /(winamp)\s((\d+)[\w\.-]+)/i,
            /(winamp)mpeg\/((\d+)[\w\.-]+)/i
            ], [NAME, VERSION], [

            /(ocms-bot|tapinradio|tunein radio|unknown|winamp|inlight radio)/i  // OCMS-bot/tap in radio/tunein/unknown/winamp (no other info)
                                                                                // inlight radio
            ], [NAME], [

            /(quicktime|rma|radioapp|radioclientapplication|soundtap|totem|stagefright|streamium)\/((\d+)[\w\.-]+)/i
                                                                                // QuickTime/RealMedia/RadioApp/RadioClientApplication/
                                                                                // SoundTap/Totem/Stagefright/Streamium
            ], [NAME, VERSION], [

            /(smp)((\d+)[\d\.]+)/i                                              // SMP
            ], [NAME, VERSION], [

            /(vlc) media player - version ((\d+)[\w\.]+)/i,                     // VLC Videolan
            /(vlc)\/((\d+)[\w\.-]+)/i,
            /(xbmc|gvfs|xine|xmms|irapp)\/((\d+)[\w\.-]+)/i,                    // XBMC/gvfs/Xine/XMMS/irapp
            /(foobar2000)\/((\d+)[\d\.]+)/i,                                    // Foobar2000
            /(itunes)\/((\d+)[\d\.]+)/i                                         // iTunes
            ], [NAME, VERSION], [

            /(wmplayer)\/((\d+)[\w\.-]+)/i,                                     // Windows Media Player
            /(windows-media-player)\/((\d+)[\w\.-]+)/i
            ], [[NAME, /-/g, ' '], VERSION], [

            /windows\/((\d+)[\w\.-]+) upnp\/[\d\.]+ dlnadoc\/[\d\.]+ (home media server)/i
                                                                                // Windows Media Server
            ], [VERSION, [NAME, 'Windows']], [

            /(com\.riseupradioalarm)\/((\d+)[\d\.]*)/i                          // RiseUP Radio Alarm
            ], [NAME, VERSION], [

            /(rad.io)\s((\d+)[\d\.]+)/i,                                        // Rad.io
            /(radio.(?:de|at|fr))\s((\d+)[\d\.]+)/i
            ], [[NAME, 'rad.io'], VERSION]

            //////////////////////
            // Media players END
            ////////////////////*/

        ],

        cpu : [[

            /(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i                     // AMD64
            ], [[ARCHITECTURE, 'amd64']], [

            /(ia32(?=;))/i                                                      // IA32 (quicktime)
            ], [[ARCHITECTURE, util.lowerize]], [

            /((?:i[346]|x)86)[;\)]/i                                            // IA32
            ], [[ARCHITECTURE, 'ia32']], [

            // PocketPC mistakenly identified as PowerPC
            /windows\s(ce|mobile);\sppc;/i
            ], [[ARCHITECTURE, 'arm']], [

            /((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i                           // PowerPC
            ], [[ARCHITECTURE, /ower/, '', util.lowerize]], [

            /(sun4\w)[;\)]/i                                                    // SPARC
            ], [[ARCHITECTURE, 'sparc']], [

            /((?:avr32|ia64(?=;))|68k(?=\))|arm(?:64|(?=v\d+;))|(?=atmel\s)avr|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i
                                                                                // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
            ], [[ARCHITECTURE, util.lowerize]]
        ],

        device : [[

            /\((ipad|playbook);[\w\s\);-]+(rim|apple)/i                         // iPad/PlayBook
            ], [MODEL, VENDOR, [TYPE, TABLET]], [

            /applecoremedia\/[\w\.]+ \((ipad)/                                  // iPad
            ], [MODEL, [VENDOR, 'Apple'], [TYPE, TABLET]], [

            /(apple\s{0,1}tv)/i                                                 // Apple TV
            ], [[MODEL, 'Apple TV'], [VENDOR, 'Apple']], [

            /(archos)\s(gamepad2?)/i,                                           // Archos
            /(hp).+(touchpad)/i,                                                // HP TouchPad
            /(hp).+(tablet)/i,                                                  // HP Tablet
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /\s(nook)[\w\s]+build\/(\w+)/i,                                     // Nook
            /(dell)\s(strea[kpr\s\d]*[\dko])/i                                  // Dell Streak
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(kf[A-z]+)\sbuild\/[\w\.]+.*silk\//i                               // Kindle Fire HD
            ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [
            /(sd|kf)[0349hijorstuw]+\sbuild\/[\w\.]+.*silk\//i                  // Fire Phone
            ], [[MODEL, mapper.str, maps.device.amazon.model], [VENDOR, 'Amazon'], [TYPE, MOBILE]], [

            /\((ip[honed|\s\w*]+);.+(apple)/i                                   // iPod/iPhone
            ], [MODEL, VENDOR, [TYPE, MOBILE]], [
            /\((ip[honed|\s\w*]+);/i                                            // iPod/iPhone
            ], [MODEL, [VENDOR, 'Apple'], [TYPE, MOBILE]], [

            /(blackberry)[\s-]?(\w+)/i,                                         // BlackBerry
            /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[\s_-]?([\w-]+)*/i,
                                                                                // BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Meizu/Motorola/Polytron
            /(hp)\s([\w\s]+\w)/i,                                               // HP iPAQ
            /(asus)-?(\w+)/i                                                    // Asus
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /\(bb10;\s(\w+)/i                                                   // BlackBerry 10
            ], [MODEL, [VENDOR, 'BlackBerry'], [TYPE, MOBILE]], [
                                                                                // Asus Tablets
            /android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7|padfone)/i
            ], [MODEL, [VENDOR, 'Asus'], [TYPE, TABLET]], [

            /(sony)\s(tablet\s[ps])\sbuild\//i,                                  // Sony
            /(sony)?(?:sgp.+)\sbuild\//i
            ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Tablet'], [TYPE, TABLET]], [
            /android.+\s([c-g]\d{4}|so[-l]\w+)\sbuild\//i
            ], [MODEL, [VENDOR, 'Sony'], [TYPE, MOBILE]], [

            /\s(ouya)\s/i,                                                      // Ouya
            /(nintendo)\s([wids3u]+)/i                                          // Nintendo
            ], [VENDOR, MODEL, [TYPE, CONSOLE]], [

            /android.+;\s(shield)\sbuild/i                                      // Nvidia
            ], [MODEL, [VENDOR, 'Nvidia'], [TYPE, CONSOLE]], [

            /(playstation\s[34portablevi]+)/i                                   // Playstation
            ], [MODEL, [VENDOR, 'Sony'], [TYPE, CONSOLE]], [

            /(sprint\s(\w+))/i                                                  // Sprint Phones
            ], [[VENDOR, mapper.str, maps.device.sprint.vendor], [MODEL, mapper.str, maps.device.sprint.model], [TYPE, MOBILE]], [

            /(lenovo)\s?(S(?:5000|6000)+(?:[-][\w+]))/i                         // Lenovo tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,                               // HTC
            /(zte)-(\w+)*/i,                                                    // ZTE
            /(alcatel|geeksphone|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]+)*/i
                                                                                // Alcatel/GeeksPhone/Lenovo/Nexian/Panasonic/Sony
            ], [VENDOR, [MODEL, /_/g, ' '], [TYPE, MOBILE]], [

            /(nexus\s9)/i                                                       // HTC Nexus 9
            ], [MODEL, [VENDOR, 'HTC'], [TYPE, TABLET]], [

            /d\/huawei([\w\s-]+)[;\)]/i,
            /(nexus\s6p)/i                                                      // Huawei
            ], [MODEL, [VENDOR, 'Huawei'], [TYPE, MOBILE]], [

            /(microsoft);\s(lumia[\s\w]+)/i                                     // Microsoft Lumia
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /[\s\(;](xbox(?:\sone)?)[\s\);]/i                                   // Microsoft Xbox
            ], [MODEL, [VENDOR, 'Microsoft'], [TYPE, CONSOLE]], [
            /(kin\.[onetw]{3})/i                                                // Microsoft Kin
            ], [[MODEL, /\./g, ' '], [VENDOR, 'Microsoft'], [TYPE, MOBILE]], [

                                                                                // Motorola
            /\s(milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?(:?\s4g)?)[\w\s]+build\//i,
            /mot[\s-]?(\w+)*/i,
            /(XT\d{3,4}) build\//i,
            /(nexus\s6)/i
            ], [MODEL, [VENDOR, 'Motorola'], [TYPE, MOBILE]], [
            /android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i
            ], [MODEL, [VENDOR, 'Motorola'], [TYPE, TABLET]], [

            /hbbtv\/\d+\.\d+\.\d+\s+\([\w\s]*;\s*(\w[^;]*);([^;]*)/i            // HbbTV devices
            ], [[VENDOR, util.trim], [MODEL, util.trim], [TYPE, SMARTTV]], [

            /hbbtv.+maple;(\d+)/i
            ], [[MODEL, /^/, 'SmartTV'], [VENDOR, 'Samsung'], [TYPE, SMARTTV]], [

            /\(dtv[\);].+(aquos)/i                                              // Sharp
            ], [MODEL, [VENDOR, 'Sharp'], [TYPE, SMARTTV]], [

            /android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n\d+|sgh-t8[56]9|nexus 10))/i,
            /((SM-T\w+))/i
            ], [[VENDOR, 'Samsung'], MODEL, [TYPE, TABLET]], [                  // Samsung
            /smart-tv.+(samsung)/i
            ], [VENDOR, [TYPE, SMARTTV], MODEL], [
            /((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-\w[\w\d]+))/i,
            /(sam[sung]*)[\s-]*(\w+-?[\w-]*)*/i,
            /sec-((sgh\w+))/i
            ], [[VENDOR, 'Samsung'], MODEL, [TYPE, MOBILE]], [

            /sie-(\w+)*/i                                                       // Siemens
            ], [MODEL, [VENDOR, 'Siemens'], [TYPE, MOBILE]], [

            /(maemo|nokia).*(n900|lumia\s\d+)/i,                                // Nokia
            /(nokia)[\s_-]?([\w-]+)*/i
            ], [[VENDOR, 'Nokia'], MODEL, [TYPE, MOBILE]], [

            /android\s3\.[\s\w;-]{10}(a\d{3})/i                                 // Acer
            ], [MODEL, [VENDOR, 'Acer'], [TYPE, TABLET]], [

            /android.+([vl]k\-?\d{3})\s+build/i                                 // LG Tablet
            ], [MODEL, [VENDOR, 'LG'], [TYPE, TABLET]], [
            /android\s3\.[\s\w;-]{10}(lg?)-([06cv9]{3,4})/i                     // LG Tablet
            ], [[VENDOR, 'LG'], MODEL, [TYPE, TABLET]], [
            /(lg) netcast\.tv/i                                                 // LG SmartTV
            ], [VENDOR, MODEL, [TYPE, SMARTTV]], [
            /(nexus\s[45])/i,                                                   // LG
            /lg[e;\s\/-]+(\w+)*/i,
            /android.+lg(\-?[\d\w]+)\s+build/i
            ], [MODEL, [VENDOR, 'LG'], [TYPE, MOBILE]], [

            /android.+(ideatab[a-z0-9\-\s]+)/i                                  // Lenovo
            ], [MODEL, [VENDOR, 'Lenovo'], [TYPE, TABLET]], [

            /linux;.+((jolla));/i                                               // Jolla
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /((pebble))app\/[\d\.]+\s/i                                         // Pebble
            ], [VENDOR, MODEL, [TYPE, WEARABLE]], [

            /android.+;\s(oppo)\s?([\w\s]+)\sbuild/i                            // OPPO
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /crkey/i                                                            // Google Chromecast
            ], [[MODEL, 'Chromecast'], [VENDOR, 'Google']], [

            /android.+;\s(glass)\s\d/i                                          // Google Glass
            ], [MODEL, [VENDOR, 'Google'], [TYPE, WEARABLE]], [

            /android.+;\s(pixel c)\s/i                                          // Google Pixel C
            ], [MODEL, [VENDOR, 'Google'], [TYPE, TABLET]], [

            /android.+;\s(pixel xl|pixel)\s/i                                   // Google Pixel
            ], [MODEL, [VENDOR, 'Google'], [TYPE, MOBILE]], [

            /android.+(\w+)\s+build\/hm\1/i,                                    // Xiaomi Hongmi 'numeric' models
            /android.+(hm[\s\-_]*note?[\s_]*(?:\d\w)?)\s+build/i,               // Xiaomi Hongmi
            /android.+(mi[\s\-_]*(?:one|one[\s_]plus|note lte)?[\s_]*(?:\d\w)?)\s+build/i,    // Xiaomi Mi
            /android.+(redmi[\s\-_]*(?:note)?(?:[\s_]*[\w\s]+)?)\s+build/i      // Redmi Phones
            ], [[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, MOBILE]], [
            /android.+(mi[\s\-_]*(?:pad)?(?:[\s_]*[\w\s]+)?)\s+build/i          // Mi Pad tablets
            ],[[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, TABLET]], [
            /android.+;\s(m[1-5]\snote)\sbuild/i                                // Meizu Tablet
            ], [MODEL, [VENDOR, 'Meizu'], [TYPE, TABLET]], [

            /android.+a000(1)\s+build/i                                         // OnePlus
            ], [MODEL, [VENDOR, 'OnePlus'], [TYPE, MOBILE]], [

            /android.+[;\/]\s*(RCT[\d\w]+)\s+build/i                            // RCA Tablets
            ], [MODEL, [VENDOR, 'RCA'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Venue[\d\s]*)\s+build/i                          // Dell Venue Tablets
            ], [MODEL, [VENDOR, 'Dell'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Q[T|M][\d\w]+)\s+build/i                         // Verizon Tablet
            ], [MODEL, [VENDOR, 'Verizon'], [TYPE, TABLET]], [

            /android.+[;\/]\s+(Barnes[&\s]+Noble\s+|BN[RT])(V?.*)\s+build/i     // Barnes & Noble Tablet
            ], [[VENDOR, 'Barnes & Noble'], MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s+(TM\d{3}.*\b)\s+build/i                           // Barnes & Noble Tablet
            ], [MODEL, [VENDOR, 'NuVision'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(zte)?.+(k\d{2})\s+build/i                        // ZTE K Series Tablet
            ], [[VENDOR, 'ZTE'], MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*(gen\d{3})\s+build.*49h/i                         // Swiss GEN Mobile
            ], [MODEL, [VENDOR, 'Swiss'], [TYPE, MOBILE]], [

            /android.+[;\/]\s*(zur\d{3})\s+build/i                              // Swiss ZUR Tablet
            ], [MODEL, [VENDOR, 'Swiss'], [TYPE, TABLET]], [

            /android.+[;\/]\s*((Zeki)?TB.*\b)\s+build/i                         // Zeki Tablets
            ], [MODEL, [VENDOR, 'Zeki'], [TYPE, TABLET]], [

            /(android).+[;\/]\s+([YR]\d{2}x?.*)\s+build/i,
            /android.+[;\/]\s+(Dragon[\-\s]+Touch\s+|DT)(.+)\s+build/i          // Dragon Touch Tablet
            ], [[VENDOR, 'Dragon Touch'], MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*(NS-?.+)\s+build/i                                // Insignia Tablets
            ], [MODEL, [VENDOR, 'Insignia'], [TYPE, TABLET]], [

            /android.+[;\/]\s*((NX|Next)-?.+)\s+build/i                         // NextBook Tablets
            ], [MODEL, [VENDOR, 'NextBook'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Xtreme\_?)?(V(1[045]|2[015]|30|40|60|7[05]|90))\s+build/i
            ], [[VENDOR, 'Voice'], MODEL, [TYPE, MOBILE]], [                    // Voice Xtreme Phones

            /android.+[;\/]\s*(LVTEL\-?)?(V1[12])\s+build/i                     // LvTel Phones
            ], [[VENDOR, 'LvTel'], MODEL, [TYPE, MOBILE]], [

            /android.+[;\/]\s*(V(100MD|700NA|7011|917G).*\b)\s+build/i          // Envizen Tablets
            ], [MODEL, [VENDOR, 'Envizen'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Le[\s\-]+Pan)[\s\-]+(.*\b)\s+build/i             // Le Pan Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*(Trio[\s\-]*.*)\s+build/i                         // MachSpeed Tablets
            ], [MODEL, [VENDOR, 'MachSpeed'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Trinity)[\-\s]*(T\d{3})\s+build/i                // Trinity Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*TU_(1491)\s+build/i                               // Rotor Tablets
            ], [MODEL, [VENDOR, 'Rotor'], [TYPE, TABLET]], [

            /android.+(KS(.+))\s+build/i                                        // Amazon Kindle Tablets
            ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [

            /android.+(Gigaset)[\s\-]+(Q.+)\s+build/i                           // Gigaset Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /\s(tablet|tab)[;\/]/i,                                             // Unidentifiable Tablet
            /\s(mobile)(?:[;\/]|\ssafari)/i                                     // Unidentifiable Mobile
            ], [[TYPE, util.lowerize], VENDOR, MODEL], [

            /(android.+)[;\/].+build/i                                          // Generic Android Device
            ], [MODEL, [VENDOR, 'Generic']]


        /*//////////////////////////
            // TODO: move to string map
            ////////////////////////////

            /(C6603)/i                                                          // Sony Xperia Z C6603
            ], [[MODEL, 'Xperia Z C6603'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [
            /(C6903)/i                                                          // Sony Xperia Z 1
            ], [[MODEL, 'Xperia Z 1'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [

            /(SM-G900[F|H])/i                                                   // Samsung Galaxy S5
            ], [[MODEL, 'Galaxy S5'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G7102)/i                                                       // Samsung Galaxy Grand 2
            ], [[MODEL, 'Galaxy Grand 2'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G530H)/i                                                       // Samsung Galaxy Grand Prime
            ], [[MODEL, 'Galaxy Grand Prime'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G313HZ)/i                                                      // Samsung Galaxy V
            ], [[MODEL, 'Galaxy V'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T805)/i                                                        // Samsung Galaxy Tab S 10.5
            ], [[MODEL, 'Galaxy Tab S 10.5'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [
            /(SM-G800F)/i                                                       // Samsung Galaxy S5 Mini
            ], [[MODEL, 'Galaxy S5 Mini'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T311)/i                                                        // Samsung Galaxy Tab 3 8.0
            ], [[MODEL, 'Galaxy Tab 3 8.0'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [

            /(T3C)/i                                                            // Advan Vandroid T3C
            ], [MODEL, [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN T1J\+)/i                                                    // Advan Vandroid T1J+
            ], [[MODEL, 'Vandroid T1J+'], [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN S4A)/i                                                      // Advan Vandroid S4A
            ], [[MODEL, 'Vandroid S4A'], [VENDOR, 'Advan'], [TYPE, MOBILE]], [

            /(V972M)/i                                                          // ZTE V972M
            ], [MODEL, [VENDOR, 'ZTE'], [TYPE, MOBILE]], [

            /(i-mobile)\s(IQ\s[\d\.]+)/i                                        // i-mobile IQ
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(IQ6.3)/i                                                          // i-mobile IQ IQ 6.3
            ], [[MODEL, 'IQ 6.3'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [
            /(i-mobile)\s(i-style\s[\d\.]+)/i                                   // i-mobile i-STYLE
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(i-STYLE2.1)/i                                                     // i-mobile i-STYLE 2.1
            ], [[MODEL, 'i-STYLE 2.1'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [

            /(mobiistar touch LAI 512)/i                                        // mobiistar touch LAI 512
            ], [[MODEL, 'Touch LAI 512'], [VENDOR, 'mobiistar'], [TYPE, MOBILE]], [

            /////////////
            // END TODO
            ///////////*/

        ],

        engine : [[

            /windows.+\sedge\/([\w\.]+)/i                                       // EdgeHTML
            ], [VERSION, [NAME, 'EdgeHTML']], [

            /(presto)\/([\w\.]+)/i,                                             // Presto
            /(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,     // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m
            /(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,                          // KHTML/Tasman/Links
            /(icab)[\/\s]([23]\.[\d\.]+)/i                                      // iCab
            ], [NAME, VERSION], [

            /rv\:([\w\.]+).*(gecko)/i                                           // Gecko
            ], [VERSION, NAME]
        ],

        os : [[

            // Windows based
            /microsoft\s(windows)\s(vista|xp)/i                                 // Windows (iTunes)
            ], [NAME, VERSION], [
            /(windows)\snt\s6\.2;\s(arm)/i,                                     // Windows RT
            /(windows\sphone(?:\sos)*)[\s\/]?([\d\.\s]+\w)*/i,                  // Windows Phone
            /(windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i
            ], [NAME, [VERSION, mapper.str, maps.os.windows.version]], [
            /(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i
            ], [[NAME, 'Windows'], [VERSION, mapper.str, maps.os.windows.version]], [

            // Mobile/Embedded OS
            /\((bb)(10);/i                                                      // BlackBerry 10
            ], [[NAME, 'BlackBerry'], VERSION], [
            /(blackberry)\w*\/?([\w\.]+)*/i,                                    // Blackberry
            /(tizen)[\/\s]([\w\.]+)/i,                                          // Tizen
            /(android|webos|palm\sos|qnx|bada|rim\stablet\sos|meego|contiki)[\/\s-]?([\w\.]+)*/i,
                                                                                // Android/WebOS/Palm/QNX/Bada/RIM/MeeGo/Contiki
            /linux;.+(sailfish);/i                                              // Sailfish OS
            ], [NAME, VERSION], [
            /(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i                 // Symbian
            ], [[NAME, 'Symbian'], VERSION], [
            /\((series40);/i                                                    // Series 40
            ], [NAME], [
            /mozilla.+\(mobile;.+gecko.+firefox/i                               // Firefox OS
            ], [[NAME, 'Firefox OS'], VERSION], [

            // Console
            /(nintendo|playstation)\s([wids34portablevu]+)/i,                   // Nintendo/Playstation

            // GNU/Linux based
            /(mint)[\/\s\(]?(\w+)*/i,                                           // Mint
            /(mageia|vectorlinux)[;\s]/i,                                       // Mageia/VectorLinux
            /(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|(?=\s)arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?(?!chrom)([\w\.-]+)*/i,
                                                                                // Joli/Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware
                                                                                // Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus
            /(hurd|linux)\s?([\w\.]+)*/i,                                       // Hurd/Linux
            /(gnu)\s?([\w\.]+)*/i                                               // GNU
            ], [NAME, VERSION], [

            /(cros)\s[\w]+\s([\w\.]+\w)/i                                       // Chromium OS
            ], [[NAME, 'Chromium OS'], VERSION],[

            // Solaris
            /(sunos)\s?([\w\.]+\d)*/i                                           // Solaris
            ], [[NAME, 'Solaris'], VERSION], [

            // BSD based
            /\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]+)*/i                   // FreeBSD/NetBSD/OpenBSD/PC-BSD/DragonFly
            ], [NAME, VERSION],[

            /(haiku)\s(\w+)/i                                                  // Haiku
            ], [NAME, VERSION],[

            /cfnetwork\/.+darwin/i,
            /ip[honead]+(?:.*os\s([\w]+)\slike\smac|;\sopera)/i                 // iOS
            ], [[VERSION, /_/g, '.'], [NAME, 'iOS']], [

            /(mac\sos\sx)\s?([\w\s\.]+\w)*/i,
            /(macintosh|mac(?=_powerpc)\s)/i                                    // Mac OS
            ], [[NAME, 'Mac OS'], [VERSION, /_/g, '.']], [

            // Other
            /((?:open)?solaris)[\/\s-]?([\w\.]+)*/i,                            // Solaris
            /(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,                               // AIX
            /(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms)/i,
                                                                                // Plan9/Minix/BeOS/OS2/AmigaOS/MorphOS/RISCOS/OpenVMS
            /(unix)\s?([\w\.]+)*/i                                              // UNIX
            ], [NAME, VERSION]
        ]
    };


    /////////////////
    // Constructor
    ////////////////
    /*
    var Browser = function (name, version) {
        this[NAME] = name;
        this[VERSION] = version;
    };
    var CPU = function (arch) {
        this[ARCHITECTURE] = arch;
    };
    var Device = function (vendor, model, type) {
        this[VENDOR] = vendor;
        this[MODEL] = model;
        this[TYPE] = type;
    };
    var Engine = Browser;
    var OS = Browser;
    */
    var UAParser = function (uastring, extensions) {

        if (typeof uastring === 'object') {
            extensions = uastring;
            uastring = undefined;
        }

        if (!(this instanceof UAParser)) {
            return new UAParser(uastring, extensions).getResult();
        }

        var ua = uastring || ((window && window.navigator && window.navigator.userAgent) ? window.navigator.userAgent : EMPTY);
        var rgxmap = extensions ? util.extend(regexes, extensions) : regexes;
        //var browser = new Browser();
        //var cpu = new CPU();
        //var device = new Device();
        //var engine = new Engine();
        //var os = new OS();

        this.getBrowser = function () {
            var browser = { name: undefined, version: undefined };
            mapper.rgx.call(browser, ua, rgxmap.browser);
            browser.major = util.major(browser.version); // deprecated
            return browser;
        };
        this.getCPU = function () {
            var cpu = { architecture: undefined };
            mapper.rgx.call(cpu, ua, rgxmap.cpu);
            return cpu;
        };
        this.getDevice = function () {
            var device = { vendor: undefined, model: undefined, type: undefined };
            mapper.rgx.call(device, ua, rgxmap.device);
            return device;
        };
        this.getEngine = function () {
            var engine = { name: undefined, version: undefined };
            mapper.rgx.call(engine, ua, rgxmap.engine);
            return engine;
        };
        this.getOS = function () {
            var os = { name: undefined, version: undefined };
            mapper.rgx.call(os, ua, rgxmap.os);
            return os;
        };
        this.getResult = function () {
            return {
                ua      : this.getUA(),
                browser : this.getBrowser(),
                engine  : this.getEngine(),
                os      : this.getOS(),
                device  : this.getDevice(),
                cpu     : this.getCPU()
            };
        };
        this.getUA = function () {
            return ua;
        };
        this.setUA = function (uastring) {
            ua = uastring;
            //browser = new Browser();
            //cpu = new CPU();
            //device = new Device();
            //engine = new Engine();
            //os = new OS();
            return this;
        };
        return this;
    };

    UAParser.VERSION = LIBVERSION;
    UAParser.BROWSER = {
        NAME    : NAME,
        MAJOR   : MAJOR, // deprecated
        VERSION : VERSION
    };
    UAParser.CPU = {
        ARCHITECTURE : ARCHITECTURE
    };
    UAParser.DEVICE = {
        MODEL   : MODEL,
        VENDOR  : VENDOR,
        TYPE    : TYPE,
        CONSOLE : CONSOLE,
        MOBILE  : MOBILE,
        SMARTTV : SMARTTV,
        TABLET  : TABLET,
        WEARABLE: WEARABLE,
        EMBEDDED: EMBEDDED
    };
    UAParser.ENGINE = {
        NAME    : NAME,
        VERSION : VERSION
    };
    UAParser.OS = {
        NAME    : NAME,
        VERSION : VERSION
    };
    //UAParser.Utils = util;

    ///////////
    // Export
    //////////


    // check js environment
    if (typeof(exports) !== UNDEF_TYPE) {
        // nodejs env
        if (typeof module !== UNDEF_TYPE && module.exports) {
            exports = module.exports = UAParser;
        }
        // TODO: test!!!!!!!!
        /*
        if (require && require.main === module && process) {
            // cli
            var jsonize = function (arr) {
                var res = [];
                for (var i in arr) {
                    res.push(new UAParser(arr[i]).getResult());
                }
                process.stdout.write(JSON.stringify(res, null, 2) + '\n');
            };
            if (process.stdin.isTTY) {
                // via args
                jsonize(process.argv.slice(2));
            } else {
                // via pipe
                var str = '';
                process.stdin.on('readable', function() {
                    var read = process.stdin.read();
                    if (read !== null) {
                        str += read;
                    }
                });
                process.stdin.on('end', function () {
                    jsonize(str.replace(/\n$/, '').split('\n'));
                });
            }
        }
        */
        exports.UAParser = UAParser;
    } else {
        // requirejs env (optional)
        if (typeof(define) === FUNC_TYPE && define.amd) {
            define(function () {
                return UAParser;
            });
        } else if (window) {
            // browser env
            window.UAParser = UAParser;
        }
    }

    // jQuery/Zepto specific (optional)
    // Note:
    //   In AMD env the global scope should be kept clean, but jQuery is an exception.
    //   jQuery always exports to global scope, unless jQuery.noConflict(true) is used,
    //   and we should catch that.
    var $ = window && (window.jQuery || window.Zepto);
    if (typeof $ !== UNDEF_TYPE) {
        var parser = new UAParser();
        $.ua = parser.getResult();
        $.ua.get = function () {
            return parser.getUA();
        };
        $.ua.set = function (uastring) {
            parser.setUA(uastring);
            var result = parser.getResult();
            for (var prop in result) {
                $.ua[prop] = result[prop];
            }
        };
    }

})(typeof window === 'object' ? window : this);

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:livechat/livechat.js");
require("/node_modules/meteor/rocketchat:livechat/server/startup.js");
require("/node_modules/meteor/rocketchat:livechat/server/visitorStatus.js");
require("/node_modules/meteor/rocketchat:livechat/permissions.js");
require("/node_modules/meteor/rocketchat:livechat/messageTypes.js");
require("/node_modules/meteor/rocketchat:livechat/config.js");
require("/node_modules/meteor/rocketchat:livechat/server/roomType.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/externalMessage.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/leadCapture.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/markRoomResponded.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/offlineMessage.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/RDStation.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/saveAnalyticsData.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/sendToCRM.js");
require("/node_modules/meteor/rocketchat:livechat/server/hooks/sendToFacebook.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/addAgent.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/addManager.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/changeLivechatStatus.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/closeByVisitor.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/closeRoom.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/facebook.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/getCustomFields.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/getAgentData.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/getAgentOverviewData.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/getAnalyticsChartData.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/getAnalyticsOverviewData.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/getInitialData.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/getNextAgent.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/loadHistory.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/loginByToken.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/pageVisited.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/registerGuest.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/removeAgent.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/removeCustomField.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/removeDepartment.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/removeManager.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/removeTrigger.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/removeRoom.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveAppearance.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveCustomField.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveDepartment.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveInfo.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveIntegration.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveSurveyFeedback.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveTrigger.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/searchAgent.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/sendMessageLivechat.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/sendFileLivechatMessage.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/sendOfflineMessage.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/setCustomField.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/setDepartmentForVisitor.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/startVideoCall.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/startFileUploadRoom.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/transfer.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/webhookTest.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/takeInquiry.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/returnAsInquiry.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/saveOfficeHours.js");
require("/node_modules/meteor/rocketchat:livechat/server/methods/sendTranscript.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/Users.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/Rooms.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/Messages.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatExternalMessage.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatCustomField.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatDepartment.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatDepartmentAgents.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatPageVisited.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatTrigger.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/indexes.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatInquiry.js");
require("/node_modules/meteor/rocketchat:livechat/server/models/LivechatOfficeHour.js");
require("/node_modules/meteor/rocketchat:livechat/server/lib/Analytics.js");
require("/node_modules/meteor/rocketchat:livechat/server/lib/Livechat.js");
require("/node_modules/meteor/rocketchat:livechat/server/lib/QueueMethods.js");
require("/node_modules/meteor/rocketchat:livechat/server/lib/OfficeClock.js");
require("/node_modules/meteor/rocketchat:livechat/server/sendMessageBySMS.js");
require("/node_modules/meteor/rocketchat:livechat/server/unclosedLivechats.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/customFields.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/departmentAgents.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/externalMessages.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatAgents.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatAppearance.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatDepartments.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatIntegration.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatManagers.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatMonitoring.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatRooms.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatQueue.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatTriggers.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatVisitors.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/visitorHistory.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/visitorInfo.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/visitorPageVisited.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatInquiries.js");
require("/node_modules/meteor/rocketchat:livechat/server/publications/livechatOfficeHours.js");
require("/node_modules/meteor/rocketchat:livechat/server/api.js");
require("/node_modules/meteor/rocketchat:livechat/server/api/rest.js");

/* Exports */
Package._define("rocketchat:livechat");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_livechat.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9saXZlY2hhdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvc3RhcnR1cC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvdmlzaXRvclN0YXR1cy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcm9vbVR5cGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2hvb2tzL2V4dGVybmFsTWVzc2FnZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvaG9va3MvbGVhZENhcHR1cmUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2hvb2tzL21hcmtSb29tUmVzcG9uZGVkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9ob29rcy9vZmZsaW5lTWVzc2FnZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvaG9va3MvUkRTdGF0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9ob29rcy9zYXZlQW5hbHl0aWNzRGF0YS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvaG9va3Mvc2VuZFRvQ1JNLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9ob29rcy9zZW5kVG9GYWNlYm9vay5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9hZGRBZ2VudC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9hZGRNYW5hZ2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2NoYW5nZUxpdmVjaGF0U3RhdHVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2Nsb3NlQnlWaXNpdG9yLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2Nsb3NlUm9vbS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9mYWNlYm9vay5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9nZXRDdXN0b21GaWVsZHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvZ2V0QWdlbnREYXRhLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2dldEFnZW50T3ZlcnZpZXdEYXRhLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2dldEFuYWx5dGljc0NoYXJ0RGF0YS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9nZXRBbmFseXRpY3NPdmVydmlld0RhdGEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvZ2V0SW5pdGlhbERhdGEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvZ2V0TmV4dEFnZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2xvYWRIaXN0b3J5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL2xvZ2luQnlUb2tlbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9wYWdlVmlzaXRlZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9yZWdpc3Rlckd1ZXN0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3JlbW92ZUFnZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3JlbW92ZUN1c3RvbUZpZWxkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3JlbW92ZURlcGFydG1lbnQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvcmVtb3ZlTWFuYWdlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9yZW1vdmVUcmlnZ2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3JlbW92ZVJvb20uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2F2ZUFwcGVhcmFuY2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2F2ZUN1c3RvbUZpZWxkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3NhdmVEZXBhcnRtZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3NhdmVJbmZvLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3NhdmVJbnRlZ3JhdGlvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9zYXZlU3VydmV5RmVlZGJhY2suanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2F2ZVRyaWdnZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2VhcmNoQWdlbnQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2VuZE1lc3NhZ2VMaXZlY2hhdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9zZW5kRmlsZUxpdmVjaGF0TWVzc2FnZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9zZW5kT2ZmbGluZU1lc3NhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2V0Q3VzdG9tRmllbGQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2V0RGVwYXJ0bWVudEZvclZpc2l0b3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc3RhcnRWaWRlb0NhbGwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc3RhcnRGaWxlVXBsb2FkUm9vbS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy90cmFuc2Zlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy93ZWJob29rVGVzdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy90YWtlSW5xdWlyeS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbWV0aG9kcy9yZXR1cm5Bc0lucXVpcnkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21ldGhvZHMvc2F2ZU9mZmljZUhvdXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tZXRob2RzL3NlbmRUcmFuc2NyaXB0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvVXNlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9Sb29tcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbW9kZWxzL01lc3NhZ2VzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvTGl2ZWNoYXRFeHRlcm5hbE1lc3NhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9MaXZlY2hhdEN1c3RvbUZpZWxkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvTGl2ZWNoYXREZXBhcnRtZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9tb2RlbHMvTGl2ZWNoYXRQYWdlVmlzaXRlZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbW9kZWxzL0xpdmVjaGF0VHJpZ2dlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbW9kZWxzL2luZGV4ZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9MaXZlY2hhdElucXVpcnkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9MaXZlY2hhdE9mZmljZUhvdXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9saWIvQW5hbHl0aWNzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9saWIvTGl2ZWNoYXQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2xpYi9RdWV1ZU1ldGhvZHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2xpYi9PZmZpY2VDbG9jay5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbGliL09tbmlDaGFubmVsLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9zZW5kTWVzc2FnZUJ5U01TLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci91bmNsb3NlZExpdmVjaGF0cy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL2N1c3RvbUZpZWxkcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL2RlcGFydG1lbnRBZ2VudHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9leHRlcm5hbE1lc3NhZ2VzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvbGl2ZWNoYXRBZ2VudHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9saXZlY2hhdEFwcGVhcmFuY2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9saXZlY2hhdERlcGFydG1lbnRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvbGl2ZWNoYXRJbnRlZ3JhdGlvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL2xpdmVjaGF0TWFuYWdlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9saXZlY2hhdE1vbml0b3JpbmcuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9saXZlY2hhdFJvb21zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvbGl2ZWNoYXRRdWV1ZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL2xpdmVjaGF0VHJpZ2dlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy9saXZlY2hhdFZpc2l0b3JzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvdmlzaXRvckhpc3RvcnkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL3B1YmxpY2F0aW9ucy92aXNpdG9ySW5mby5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL3Zpc2l0b3JQYWdlVmlzaXRlZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvcHVibGljYXRpb25zL2xpdmVjaGF0SW5xdWlyaWVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9wdWJsaWNhdGlvbnMvbGl2ZWNoYXRPZmZpY2VIb3Vycy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvYXBpLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9hcGkvcmVzdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvYXBpL2xpYi9saXZlY2hhdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvYXBpL3YxL2FnZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9hcGkvdjEvY29uZmlnLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9hcGkvdjEvY3VzdG9tRmllbGQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2FwaS92MS9tZXNzYWdlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9hcGkvdjEvb2ZmbGluZU1lc3NhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2FwaS92MS9wYWdlVmlzaXRlZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvYXBpL3YxL3Jvb20uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvc2VydmVyL2FwaS92MS90cmFuc2NyaXB0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9hcGkvdjEvdmlkZW9DYWxsLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L3NlcnZlci9hcGkvdjEvdmlzaXRvci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9wZXJtaXNzaW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9tZXNzYWdlVHlwZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvY29uZmlnLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L2ltcG9ydHMvTGl2ZWNoYXRSb29tVHlwZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlY2hhdC9pbXBvcnRzL3NlcnZlci9yZXN0L2RlcGFydG1lbnRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVjaGF0L2ltcG9ydHMvc2VydmVyL3Jlc3QvZmFjZWJvb2suanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvaW1wb3J0cy9zZXJ2ZXIvcmVzdC9zbXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvaW1wb3J0cy9zZXJ2ZXIvcmVzdC91cGxvYWQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZWNoYXQvaW1wb3J0cy9zZXJ2ZXIvcmVzdC91c2Vycy5qcyJdLCJuYW1lcyI6WyJfIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJ1cmwiLCJXZWJBcHAiLCJQYWNrYWdlIiwid2ViYXBwIiwiQXV0b3VwZGF0ZSIsImF1dG91cGRhdGUiLCJjb25uZWN0SGFuZGxlcnMiLCJ1c2UiLCJNZXRlb3IiLCJiaW5kRW52aXJvbm1lbnQiLCJyZXEiLCJyZXMiLCJuZXh0IiwicmVxVXJsIiwicGFyc2UiLCJwYXRobmFtZSIsInNldEhlYWRlciIsImRvbWFpbldoaXRlTGlzdCIsIlJvY2tldENoYXQiLCJzZXR0aW5ncyIsImdldCIsImhlYWRlcnMiLCJyZWZlcmVyIiwiaXNFbXB0eSIsInRyaW0iLCJtYXAiLCJzcGxpdCIsImRvbWFpbiIsImNvbnRhaW5zIiwiaG9zdCIsInByb3RvY29sIiwiaGVhZCIsIkFzc2V0cyIsImdldFRleHQiLCJiYXNlVXJsIiwiX19tZXRlb3JfcnVudGltZV9jb25maWdfXyIsIlJPT1RfVVJMX1BBVEhfUFJFRklYIiwidGVzdCIsImh0bWwiLCJhdXRvdXBkYXRlVmVyc2lvbiIsIkpTT04iLCJzdHJpbmdpZnkiLCJ3cml0ZSIsImVuZCIsInN0YXJ0dXAiLCJyb29tVHlwZXMiLCJzZXRSb29tRmluZCIsIl9pZCIsIm1vZGVscyIsIlJvb21zIiwiZmluZExpdmVjaGF0QnlJZCIsImZldGNoIiwiYXV0aHoiLCJhZGRSb29tQWNjZXNzVmFsaWRhdG9yIiwicm9vbSIsInVzZXIiLCJ0IiwiaGFzUGVybWlzc2lvbiIsImV4dHJhRGF0YSIsInJpZCIsImZpbmRPbmVCeUlkIiwidmlzaXRvclRva2VuIiwidG9rZW4iLCJjYWxsYmFja3MiLCJhZGQiLCJFcnJvciIsIlRBUGkxOG4iLCJfXyIsImxuZyIsImxhbmd1YWdlIiwicHJpb3JpdHkiLCJMT1ciLCJVc2VyUHJlc2VuY2VFdmVudHMiLCJvbiIsInNlc3Npb24iLCJzdGF0dXMiLCJtZXRhZGF0YSIsInZpc2l0b3IiLCJMaXZlY2hhdElucXVpcnkiLCJ1cGRhdGVWaXNpdG9yU3RhdHVzIiwiTGl2ZWNoYXRSb29tVHlwZSIsIkxpdmVjaGF0VmlzaXRvcnMiLCJMaXZlY2hhdFJvb21UeXBlU2VydmVyIiwiZ2V0TXNnU2VuZGVyIiwic2VuZGVySWQiLCJnZXROb3RpZmljYXRpb25EZXRhaWxzIiwibm90aWZpY2F0aW9uTWVzc2FnZSIsInRpdGxlIiwicm9vbU5hbWUiLCJ0ZXh0IiwiY2FuQWNjZXNzVXBsb2FkZWRGaWxlIiwicmNfdG9rZW4iLCJyY19yaWQiLCJmaW5kT25lT3BlbkJ5Um9vbUlkQW5kVmlzaXRvclRva2VuIiwia25vd2xlZGdlRW5hYmxlZCIsImFwaWFpS2V5IiwiYXBpYWlMYW5ndWFnZSIsImtleSIsInZhbHVlIiwibWVzc2FnZSIsImVkaXRlZEF0IiwiZGVmZXIiLCJyZXNwb25zZSIsIkhUVFAiLCJwb3N0IiwiZGF0YSIsInF1ZXJ5IiwibXNnIiwibGFuZyIsInNlc3Npb25JZCIsIkF1dGhvcml6YXRpb24iLCJjb2RlIiwicmVzdWx0IiwiZnVsZmlsbG1lbnQiLCJzcGVlY2giLCJMaXZlY2hhdEV4dGVybmFsTWVzc2FnZSIsImluc2VydCIsIm9yaWciLCJ0cyIsIkRhdGUiLCJlIiwiU3lzdGVtTG9nZ2VyIiwiZXJyb3IiLCJ2YWxpZGF0ZU1lc3NhZ2UiLCJwaG9uZVJlZ2V4cCIsIlJlZ0V4cCIsIm1zZ1Bob25lcyIsIm1hdGNoIiwiZW1haWxSZWdleHAiLCJtc2dFbWFpbHMiLCJzYXZlR3Vlc3RFbWFpbFBob25lQnlJZCIsInJ1biIsIndhaXRpbmdSZXNwb25zZSIsInNldFJlc3BvbnNlQnlSb29tSWQiLCJ1IiwidXNlcm5hbWUiLCJwb3N0RGF0YSIsInR5cGUiLCJzZW50QXQiLCJuYW1lIiwiZW1haWwiLCJMaXZlY2hhdCIsInNlbmRSZXF1ZXN0IiwiTUVESVVNIiwic2VuZFRvUkRTdGF0aW9uIiwibGl2ZWNoYXREYXRhIiwiZ2V0TGl2ZWNoYXRSb29tR3Vlc3RJbmZvIiwiQXJyYXkiLCJpc0FycmF5IiwiYWRkcmVzcyIsIm9wdGlvbnMiLCJ0b2tlbl9yZHN0YXRpb24iLCJpZGVudGlmaWNhZG9yIiwiY2xpZW50X2lkIiwibm9tZSIsInBob25lIiwidGVsZWZvbmUiLCJ0YWdzIiwiT2JqZWN0Iiwia2V5cyIsImN1c3RvbUZpZWxkcyIsImZvckVhY2giLCJmaWVsZCIsImNhbGwiLCJjb25zb2xlIiwibm93IiwiYW5hbHl0aWNzRGF0YSIsInZpc2l0b3JMYXN0UXVlcnkiLCJtZXRyaWNzIiwibHEiLCJhZ2VudExhc3RSZXBseSIsInNlcnZlZEJ5IiwibHIiLCJhZ2VudEpvaW5UaW1lIiwiaXNSZXNwb25zZVR0IiwidHQiLCJpc1Jlc3BvbnNlVG90YWwiLCJ0b3RhbCIsImZpcnN0UmVzcG9uc2VEYXRlIiwiZmlyc3RSZXNwb25zZVRpbWUiLCJnZXRUaW1lIiwicmVzcG9uc2VUaW1lIiwiYXZnUmVzcG9uc2VUaW1lIiwiZmlyc3RSZWFjdGlvbkRhdGUiLCJmaXJzdFJlYWN0aW9uVGltZSIsInJlYWN0aW9uVGltZSIsInNhdmVBbmFseXRpY3NEYXRhQnlSb29tSWQiLCJtc2dOYXZUeXBlIiwiY3JtRW5hYmxlZCIsInNlY3JldFRva2VuIiwid2ViaG9va1VybCIsInVuZGVmaW5lZCIsInNlbmRNZXNzYWdlVHlwZSIsIm1zZ1R5cGUiLCJzZW5kTmF2SGlzdG9yeSIsInNlbmRUb0NSTSIsImluY2x1ZGVNZXNzYWdlcyIsIm1lc3NhZ2VzIiwiTWVzc2FnZXMiLCJmaW5kVmlzaWJsZUJ5Um9vbUlkIiwic29ydCIsImFnZW50SWQiLCJuYXZpZ2F0aW9uIiwicHVzaCIsInNhdmVDUk1EYXRhQnlSb29tSWQiLCJvcGVuIiwiT21uaUNoYW5uZWwiLCJmYWNlYm9vayIsInJlcGx5IiwicGFnZSIsImlkIiwibWV0aG9kcyIsInVzZXJJZCIsIm1ldGhvZCIsImFkZEFnZW50IiwiYWRkTWFuYWdlciIsIm5ld1N0YXR1cyIsInN0YXR1c0xpdmVjaGF0IiwiVXNlcnMiLCJzZXRMaXZlY2hhdFN0YXR1cyIsInJvb21JZCIsImdldFZpc2l0b3JCeVRva2VuIiwiY2xvc2VSb29tIiwiY29tbWVudCIsInN1YnNjcmlwdGlvbiIsIlN1YnNjcmlwdGlvbnMiLCJmaW5kT25lQnlSb29tSWRBbmRVc2VySWQiLCJhY3Rpb24iLCJlbmFibGVkIiwiaGFzVG9rZW4iLCJlbmFibGUiLCJzdWNjZXNzIiwidXBkYXRlQnlJZCIsImRpc2FibGUiLCJsaXN0UGFnZXMiLCJzdWJzY3JpYmUiLCJ1bnN1YnNjcmliZSIsIkxpdmVjaGF0Q3VzdG9tRmllbGQiLCJmaW5kIiwiY2hlY2siLCJTdHJpbmciLCJnZXRBZ2VudEluZm8iLCJjaGFydE9wdGlvbnMiLCJsb2ciLCJBbmFseXRpY3MiLCJnZXRBZ2VudE92ZXJ2aWV3RGF0YSIsImdldEFuYWx5dGljc0NoYXJ0RGF0YSIsImFuYWx5dGljc09wdGlvbnMiLCJnZXRBbmFseXRpY3NPdmVydmlld0RhdGEiLCJkZXBhcnRtZW50SWQiLCJpbmZvIiwiY29sb3IiLCJyZWdpc3RyYXRpb25Gb3JtIiwidHJpZ2dlcnMiLCJkZXBhcnRtZW50cyIsImFsbG93U3dpdGNoaW5nRGVwYXJ0bWVudHMiLCJvbmxpbmUiLCJvZmZsaW5lQ29sb3IiLCJvZmZsaW5lTWVzc2FnZSIsIm9mZmxpbmVTdWNjZXNzTWVzc2FnZSIsIm9mZmxpbmVVbmF2YWlsYWJsZU1lc3NhZ2UiLCJkaXNwbGF5T2ZmbGluZUZvcm0iLCJ2aWRlb0NhbGwiLCJmaWxlVXBsb2FkIiwiY29udmVyc2F0aW9uRmluaXNoZWRNZXNzYWdlIiwibmFtZUZpZWxkUmVnaXN0cmF0aW9uRm9ybSIsImVtYWlsRmllbGRSZWdpc3RyYXRpb25Gb3JtIiwiZmllbGRzIiwiY2wiLCJ1c2VybmFtZXMiLCJmaW5kT3BlbkJ5VmlzaXRvclRva2VuQW5kRGVwYXJ0bWVudElkIiwiZmluZE9wZW5CeVZpc2l0b3JUb2tlbiIsImxlbmd0aCIsInZpc2l0b3JFbWFpbHMiLCJkZXBhcnRtZW50IiwiaW5pdFNldHRpbmdzIiwiZ2V0SW5pdFNldHRpbmdzIiwiTGl2ZWNoYXRfdGl0bGUiLCJMaXZlY2hhdF90aXRsZV9jb2xvciIsIkxpdmVjaGF0X2VuYWJsZWQiLCJMaXZlY2hhdF9yZWdpc3RyYXRpb25fZm9ybSIsIm9mZmxpbmVUaXRsZSIsIkxpdmVjaGF0X29mZmxpbmVfdGl0bGUiLCJMaXZlY2hhdF9vZmZsaW5lX3RpdGxlX2NvbG9yIiwiTGl2ZWNoYXRfb2ZmbGluZV9tZXNzYWdlIiwiTGl2ZWNoYXRfb2ZmbGluZV9zdWNjZXNzX21lc3NhZ2UiLCJMaXZlY2hhdF9vZmZsaW5lX2Zvcm1fdW5hdmFpbGFibGUiLCJMaXZlY2hhdF9kaXNwbGF5X29mZmxpbmVfZm9ybSIsIkxhbmd1YWdlIiwiTGl2ZWNoYXRfdmlkZW9jYWxsX2VuYWJsZWQiLCJKaXRzaV9FbmFibGVkIiwiTGl2ZWNoYXRfZmlsZXVwbG9hZF9lbmFibGVkIiwiRmlsZVVwbG9hZF9FbmFibGVkIiwidHJhbnNjcmlwdCIsIkxpdmVjaGF0X2VuYWJsZV90cmFuc2NyaXB0IiwidHJhbnNjcmlwdE1lc3NhZ2UiLCJMaXZlY2hhdF90cmFuc2NyaXB0X21lc3NhZ2UiLCJMaXZlY2hhdF9jb252ZXJzYXRpb25fZmluaXNoZWRfbWVzc2FnZSIsIkxpdmVjaGF0X25hbWVfZmllbGRfcmVnaXN0cmF0aW9uX2Zvcm0iLCJMaXZlY2hhdF9lbWFpbF9maWVsZF9yZWdpc3RyYXRpb25fZm9ybSIsImFnZW50RGF0YSIsIkxpdmVjaGF0VHJpZ2dlciIsImZpbmRFbmFibGVkIiwidHJpZ2dlciIsInBpY2siLCJMaXZlY2hhdERlcGFydG1lbnQiLCJmaW5kRW5hYmxlZFdpdGhBZ2VudHMiLCJMaXZlY2hhdF9hbGxvd19zd2l0Y2hpbmdfZGVwYXJ0bWVudHMiLCJmaW5kT25saW5lQWdlbnRzIiwiY291bnQiLCJyZXF1aXJlRGVwYXJtZW50IiwiZ2V0UmVxdWlyZWREZXBhcnRtZW50IiwiYWdlbnQiLCJnZXROZXh0QWdlbnQiLCJsaW1pdCIsImxzIiwibG9hZE1lc3NhZ2VIaXN0b3J5IiwicGFnZUluZm8iLCJzYXZlUGFnZUhpc3RvcnkiLCJyZWdpc3Rlckd1ZXN0Iiwia2VlcEhpc3RvcnlGb3JUb2tlbiIsImN1cnNvciIsInNhdmVSb29tSW5mbyIsImN1c3RvbUZpZWxkIiwic2NvcGUiLCJvdmVyd3JpdGUiLCJ1cGRhdGVMaXZlY2hhdERhdGFCeVRva2VuIiwicmVtb3ZlQWdlbnQiLCJyZW1vdmVCeUlkIiwicmVtb3ZlRGVwYXJ0bWVudCIsInJlbW92ZU1hbmFnZXIiLCJ0cmlnZ2VySWQiLCJyZW1vdmVCeVJvb21JZCIsInZhbGlkU2V0dGluZ3MiLCJ2YWxpZCIsImV2ZXJ5Iiwic2V0dGluZyIsImluZGV4T2YiLCJjdXN0b21GaWVsZERhdGEiLCJNYXRjaCIsIk9iamVjdEluY2x1ZGluZyIsImxhYmVsIiwidmlzaWJpbGl0eSIsImNyZWF0ZU9yVXBkYXRlQ3VzdG9tRmllbGQiLCJkZXBhcnRtZW50RGF0YSIsImRlcGFydG1lbnRBZ2VudHMiLCJzYXZlRGVwYXJ0bWVudCIsImd1ZXN0RGF0YSIsInJvb21EYXRhIiwiT3B0aW9uYWwiLCJ0b3BpYyIsInJldCIsInNhdmVHdWVzdCIsInMiLCJ2YWx1ZXMiLCJMaXZlY2hhdF93ZWJob29rVXJsIiwiTGl2ZWNoYXRfc2VjcmV0X3Rva2VuIiwiTGl2ZWNoYXRfd2ViaG9va19vbl9jbG9zZSIsIkxpdmVjaGF0X3dlYmhvb2tfb25fb2ZmbGluZV9tc2ciLCJMaXZlY2hhdF93ZWJob29rX29uX3Zpc2l0b3JfbWVzc2FnZSIsIkxpdmVjaGF0X3dlYmhvb2tfb25fYWdlbnRfbWVzc2FnZSIsInZpc2l0b3JSb29tIiwiZm9ybURhdGEiLCJ1cGRhdGVEYXRhIiwiaXRlbSIsInVwZGF0ZVN1cnZleUZlZWRiYWNrQnlJZCIsIk1heWJlIiwiZGVzY3JpcHRpb24iLCJCb29sZWFuIiwicnVuT25jZSIsImNvbmRpdGlvbnMiLCJhY3Rpb25zIiwiaXNTdHJpbmciLCJmaW5kT25lQnlVc2VybmFtZSIsInNlbmRNZXNzYWdlTGl2ZWNoYXQiLCJhdHRhY2htZW50cyIsImd1ZXN0Iiwic2VuZE1lc3NhZ2UiLCJmaWxlIiwibXNnRGF0YSIsImF2YXRhciIsImVtb2ppIiwiYWxpYXMiLCJncm91cGFibGUiLCJmaWxlVXJsIiwiZW5jb2RlVVJJIiwiYXR0YWNobWVudCIsInRpdGxlX2xpbmsiLCJ0aXRsZV9saW5rX2Rvd25sb2FkIiwiaW1hZ2VfdXJsIiwiaW1hZ2VfdHlwZSIsImltYWdlX3NpemUiLCJzaXplIiwiaWRlbnRpZnkiLCJpbWFnZV9kaW1lbnNpb25zIiwiaW1hZ2VfcHJldmlldyIsIkZpbGVVcGxvYWQiLCJyZXNpemVJbWFnZVByZXZpZXciLCJhdWRpb191cmwiLCJhdWRpb190eXBlIiwiYXVkaW9fc2l6ZSIsInZpZGVvX3VybCIsInZpZGVvX3R5cGUiLCJ2aWRlb19zaXplIiwiYXNzaWduIiwiUmFuZG9tIiwic2VuZE9mZmxpbmVNZXNzYWdlIiwiRERQUmF0ZUxpbWl0ZXIiLCJhZGRSdWxlIiwiY29ubmVjdGlvbklkIiwidHJhbnNmZXJEYXRhIiwidHJhbnNmZXIiLCJnZXRSb29tIiwiaml0c2lUaW1lb3V0IiwiY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlciIsImFjdGlvbkxpbmtzIiwiaWNvbiIsImkxOG5MYWJlbCIsIm1ldGhvZF9pZCIsInBhcmFtcyIsImppdHNpUm9vbSIsImhhc1JvbGUiLCJwb3N0Q2F0Y2hFcnJvciIsIndyYXBBc3luYyIsInJlc29sdmUiLCJlcnIiLCJ1bmJsb2NrIiwic2FtcGxlRGF0YSIsImNyZWF0ZWRBdCIsImxhc3RNZXNzYWdlQXQiLCJwcm9kdWN0SWQiLCJpcCIsImJyb3dzZXIiLCJvcyIsImN1c3RvbWVySWQiLCJzdGF0dXNDb2RlIiwiaW5xdWlyeUlkIiwiaW5xdWlyeSIsInN1YnNjcmlwdGlvbkRhdGEiLCJhbGVydCIsInVucmVhZCIsInVzZXJNZW50aW9ucyIsImdyb3VwTWVudGlvbnMiLCJkZXNrdG9wTm90aWZpY2F0aW9ucyIsIm1vYmlsZVB1c2hOb3RpZmljYXRpb25zIiwiZW1haWxOb3RpZmljYXRpb25zIiwiaW5jVXNlcnNDb3VudEJ5SWQiLCJjaGFuZ2VBZ2VudEJ5Um9vbUlkIiwidGFrZUlucXVpcnkiLCJjcmVhdGVDb21tYW5kV2l0aFJvb21JZEFuZFVzZXIiLCJzdHJlYW0iLCJlbWl0IiwicmV0dXJuUm9vbUFzSW5xdWlyeSIsImRheSIsInN0YXJ0IiwiZmluaXNoIiwiTGl2ZWNoYXRPZmZpY2VIb3VyIiwidXBkYXRlSG91cnMiLCJzZW5kVHJhbnNjcmlwdCIsInNldE9wZXJhdG9yIiwib3BlcmF0b3IiLCJ1cGRhdGUiLCIkc2V0IiwiJGV4aXN0cyIsIiRuZSIsInJvbGVzIiwiZmluZE9uZU9ubGluZUFnZW50QnlVc2VybmFtZSIsImZpbmRPbmUiLCJmaW5kQWdlbnRzIiwiZmluZE9ubGluZVVzZXJGcm9tTGlzdCIsInVzZXJMaXN0IiwiJGluIiwiY29uY2F0IiwiY29sbGVjdGlvbk9iaiIsIm1vZGVsIiwicmF3Q29sbGVjdGlvbiIsImZpbmRBbmRNb2RpZnkiLCJsaXZlY2hhdENvdW50IiwiJGluYyIsImNsb3NlT2ZmaWNlIiwic2VsZiIsIm9wZW5PZmZpY2UiLCJlbWFpbHMiLCJzdXJ2ZXlGZWVkYmFjayIsImZpbmRMaXZlY2hhdCIsImZpbHRlciIsIm9mZnNldCIsImV4dGVuZCIsImZpbmRMaXZlY2hhdEJ5SWRBbmRWaXNpdG9yVG9rZW4iLCJmaW5kTGl2ZWNoYXRCeVZpc2l0b3JUb2tlbiIsInVwZGF0ZUxpdmVjaGF0Um9vbUNvdW50Iiwic2V0dGluZ3NSYXciLCJTZXR0aW5ncyIsImZpbmRCeVZpc2l0b3JUb2tlbiIsImZpbmRCeVZpc2l0b3JJZCIsInZpc2l0b3JJZCIsInJlc3BvbnNlQnkiLCIkdW5zZXQiLCJnZXRUb3RhbENvbnZlcnNhdGlvbnNCZXR3ZWVuRGF0ZSIsImRhdGUiLCIkZ3RlIiwiZ3RlIiwiJGx0IiwibHQiLCJnZXRBbmFseXRpY3NNZXRyaWNzQmV0d2VlbkRhdGUiLCJtc2dzIiwiY2xvc2VCeVJvb21JZCIsImNsb3NlSW5mbyIsImNsb3NlciIsImNsb3NlZEJ5IiwiY2xvc2VkQXQiLCJjaGF0RHVyYXRpb24iLCJmaW5kT3BlbkJ5QWdlbnQiLCJuZXdBZ2VudCIsImNoYW5nZURlcGFydG1lbnRJZEJ5Um9vbUlkIiwiY3JtRGF0YSIsInJlbW92ZUFnZW50QnlSb29tSWQiLCJleHBpcmVBdCIsIm11bHRpIiwic2V0Um9vbUlkQnlUb2tlbiIsIl9CYXNlIiwiY29uc3RydWN0b3IiLCJpc0NsaWVudCIsIl9pbml0TW9kZWwiLCJmaW5kQnlSb29tSWQiLCJyZWNvcmQiLCJyZW1vdmUiLCJ0cnlFbnN1cmVJbmRleCIsIm51bUFnZW50cyIsImZpbmRCeURlcGFydG1lbnRJZCIsImNyZWF0ZU9yVXBkYXRlRGVwYXJ0bWVudCIsInNob3dPblJlZ2lzdHJhdGlvbiIsImFnZW50cyIsInNhdmVkQWdlbnRzIiwicGx1Y2siLCJMaXZlY2hhdERlcGFydG1lbnRBZ2VudHMiLCJhZ2VudHNUb1NhdmUiLCJkaWZmZXJlbmNlIiwicmVtb3ZlQnlEZXBhcnRtZW50SWRBbmRBZ2VudElkIiwic2F2ZUFnZW50IiwicGFyc2VJbnQiLCJvcmRlciIsIiRndCIsInVwc2VydCIsImdldE5leHRBZ2VudEZvckRlcGFydG1lbnQiLCJvbmxpbmVVc2VycyIsIm9ubGluZVVzZXJuYW1lcyIsImdldE9ubGluZUZvckRlcGFydG1lbnQiLCJkZXBBZ2VudHMiLCJmaW5kVXNlcnNJblF1ZXVlIiwidXNlcnNMaXN0IiwicmVwbGFjZVVzZXJuYW1lT2ZBZ2VudEJ5VXNlcklkIiwiTGl2ZWNoYXRQYWdlVmlzaXRlZCIsInNwYXJzZSIsImV4cGlyZUFmdGVyU2Vjb25kcyIsInNhdmVCeVRva2VuIiwia2VlcEhpc3RvcnlNaWxpc2Vjb25kcyIsImZpbmRCeVRva2VuIiwicmVtb3ZlQWxsIiwiZmluZEJ5SWQiLCJvcGVuSW5xdWlyeSIsIm9wZW5JbnF1aXJ5V2l0aEFnZW50cyIsImFnZW50SWRzIiwiZ2V0U3RhdHVzIiwibW9tZW50IiwibmV3U3RhcnQiLCJuZXdGaW5pc2giLCJuZXdPcGVuIiwiaXNOb3dXaXRoaW5Ib3VycyIsImN1cnJlbnRUaW1lIiwidXRjIiwiZm9ybWF0IiwidG9kYXlzT2ZmaWNlSG91cnMiLCJpc0JlZm9yZSIsImlzQmV0d2VlbiIsImlzT3BlbmluZ1RpbWUiLCJpc1NhbWUiLCJpc0Nsb3NpbmdUaW1lIiwiZmluZFZpc2l0b3JCeVRva2VuIiwiZmluZE9uZVZpc2l0b3JCeVBob25lIiwiZ2V0VmlzaXRvcnNCZXR3ZWVuRGF0ZSIsIl91cGRhdGVkQXQiLCJnZXROZXh0VmlzaXRvclVzZXJuYW1lIiwic2F2ZUd1ZXN0QnlJZCIsInNldERhdGEiLCJ1bnNldERhdGEiLCJwaG9uZU51bWJlciIsImZpbmRPbmVHdWVzdEJ5RW1haWxBZGRyZXNzIiwiZW1haWxBZGRyZXNzIiwiZXNjYXBlUmVnRXhwIiwicGhvbmVzIiwiJGFkZFRvU2V0Iiwic2F2ZUVtYWlsIiwiJGVhY2giLCJzYXZlUGhvbmUiLCJyZXBsYWNlIiwiZXhwb3J0RGVmYXVsdCIsImV4cG9ydCIsInNlY29uZHNUb0hITU1TUyIsInNlYyIsInBhcnNlRmxvYXQiLCJob3VycyIsIk1hdGgiLCJmbG9vciIsIm1pbnV0ZXMiLCJzZWNvbmRzIiwicm91bmQiLCJmcm9tIiwiZGF0ZXJhbmdlIiwidG8iLCJpc1ZhbGlkIiwiQWdlbnRPdmVydmlld0RhdGEiLCJDaGFydERhdGEiLCJjaGFydExhYmVsIiwiZGF0YUxhYmVscyIsImRhdGFQb2ludHMiLCJkaWZmIiwibSIsImhvdXIiLCJPdmVydmlld0RhdGEiLCJUb3RhbF9jb252ZXJzYXRpb25zIiwiQXZnX2NoYXRfZHVyYXRpb24iLCJhdmdDRCIsIlRvdGFsX21lc3NhZ2VzIiwiQXZnX2ZpcnN0X3Jlc3BvbnNlX3RpbWUiLCJmcnQiLCJmdCIsImF2Z0ZydCIsIkJlc3RfZmlyc3RfcmVzcG9uc2VfdGltZSIsIm1heEZydCIsIm1pbiIsIkF2Z19yZXNwb25zZV90aW1lIiwiYXJ0IiwiYXZnIiwiYXZnQXJ0IiwiQXZnX3JlYWN0aW9uX3RpbWUiLCJhcm50IiwicmVhY3Rpb24iLCJhdmdBcm50IiwiZ2V0S2V5SGF2aW5nTWF4VmFsdWUiLCJkZWYiLCJtYXhWYWx1ZSIsIm1heEtleSIsIkNvbnZlcnNhdGlvbnMiLCJ0b3RhbENvbnZlcnNhdGlvbnMiLCJvcGVuQ29udmVyc2F0aW9ucyIsInRvdGFsTWVzc2FnZXMiLCJ0b3RhbE1lc3NhZ2VzT25XZWVrZGF5IiwiTWFwIiwidG90YWxNZXNzYWdlc0luSG91ciIsImRheXMiLCJzdW1tYXJpemUiLCJ3ZWVrZGF5Iiwic2V0IiwiaGFzIiwiYnVzaWVzdERheSIsImgiLCJkYXlIb3VyIiwiYnVzaWVzdEhvdXIiLCJ0b0ZpeGVkIiwiUHJvZHVjdGl2aXR5IiwiYXZnUmVhY3Rpb25UaW1lIiwidXBkYXRlTWFwIiwic29ydEJ5VmFsdWUiLCJpbnYiLCJhIiwiYiIsImFnZW50Q29udmVyc2F0aW9ucyIsInBlcmNlbnRhZ2UiLCJhZ2VudENoYXREdXJhdGlvbnMiLCJvYmoiLCJhZ2VudE1lc3NhZ2VzIiwiYWdlbnRBdmdSZXNwVGltZSIsImFnZW50Rmlyc3RSZXNwVGltZSIsImFnZW50QXZnUmVhY3Rpb25UaW1lIiwiZG5zIiwiVUFQYXJzZXIiLCJNYWlsZXIiLCJoaXN0b3J5TW9uaXRvclR5cGUiLCJsb2dnZXIiLCJMb2dnZXIiLCJzZWN0aW9ucyIsIndlYmhvb2siLCJpIiwicXVlcnlTdHJpbmciLCJBY2NlcHQiLCJnZXRBZ2VudHMiLCJnZXRPbmxpbmVBZ2VudHMiLCJvbmxpbmVSZXF1aXJlZCIsImRlcHQiLCJvbmxpbmVBZ2VudHMiLCJyb29tSW5mbyIsIm5ld1Jvb20iLCJyb3V0aW5nTWV0aG9kIiwiUXVldWVNZXRob2RzIiwic2hvd0Nvbm5lY3RpbmciLCJ1cGRhdGVNZXNzYWdlIiwib3JpZ2luYWxNZXNzYWdlIiwiZWRpdEFsbG93ZWQiLCJlZGl0T3duIiwiZGVsZXRlTWVzc2FnZSIsImRlbGV0ZUFsbG93ZWQiLCJ1cGRhdGVVc2VyIiwiZXhpc3RpbmdVc2VyIiwidXNlckRhdGEiLCJjb25uZWN0aW9uIiwidXNlckFnZW50IiwiaHR0cEhlYWRlcnMiLCJjbGllbnRBZGRyZXNzIiwibnVtYmVyIiwic2V0RGVwYXJ0bWVudEZvckd1ZXN0IiwiY2xvc2VEYXRhIiwiaGlkZUJ5Um9vbUlkQW5kVXNlcklkIiwic2V0Q3VzdG9tRmllbGRzIiwiZmluZE5vdEhpZGRlblB1YmxpYyIsInNldFRvcGljQW5kVGFnc0J5SWQiLCJzZXRGbmFtZUJ5SWQiLCJ1cGRhdGVEaXNwbGF5TmFtZUJ5Um9vbUlkIiwiY2xvc2VPcGVuQ2hhdHMiLCJmb3J3YXJkT3BlbkNoYXRzIiwiY2hhbmdlIiwicGFnZVRpdGxlIiwicGFnZVVybCIsImxvY2F0aW9uIiwiaHJlZiIsIl9oaWRkZW4iLCJjcmVhdGVOYXZpZ2F0aW9uSGlzdG9yeVdpdGhSb29tSWRNZXNzYWdlQW5kVXNlciIsInJlbW92ZUJ5Um9vbUlkQW5kVXNlcklkIiwiY3JlYXRlVXNlckxlYXZlV2l0aFJvb21JZEFuZFVzZXIiLCJjcmVhdGVVc2VySm9pbldpdGhSb29tSWRBbmRVc2VyIiwib3BlbklucSIsImNhbGxiYWNrIiwidHJ5aW5nIiwid2FybiIsInNldFRpbWVvdXQiLCJ1YSIsInNldFVBIiwiZm5hbWUiLCJsbSIsImdldE9TIiwidmVyc2lvbiIsImdldEJyb3dzZXIiLCJhZGRVc2VyUm9sZXMiLCJyZW1vdmVVc2VyRnJvbVJvbGVzIiwic2VuZEVtYWlsIiwicmVwbHlUbyIsInN1YmplY3QiLCJzZW5kIiwidXNlckxhbmd1YWdlIiwiZmluZFZpc2libGVCeVJvb21JZE5vdENvbnRhaW5pbmdUeXBlcyIsImF1dGhvciIsImRhdGV0aW1lIiwibG9jYWxlIiwic2luZ2xlTWVzc2FnZSIsImZyb21FbWFpbCIsImVtYWlsRG9tYWluIiwic3Vic3RyIiwibGFzdEluZGV4T2YiLCJyZXNvbHZlTXgiLCJzdWJzdHJpbmciLCJTdHJlYW1lciIsImFsbG93UmVhZCIsInNlbmROb3RpZmljYXRpb24iLCJ1c2Vyc0NvdW50Iiwic2VuZGVyIiwiaGFzTWVudGlvblRvQWxsIiwiaGFzTWVudGlvblRvSGVyZSIsIm1lbnRpb25JZHMiLCJzZXRJbnRlcnZhbCIsImdhdGV3YXlVUkwiLCJhdXRob3JpemF0aW9uIiwicGFnZUlkIiwiU01TIiwic21zIiwiU01TU2VydmljZSIsImdldFNlcnZpY2UiLCJhZ2VudHNIYW5kbGVyIiwibW9uaXRvckFnZW50cyIsImFjdGlvblRpbWVvdXQiLCJ1c2VycyIsInF1ZXVlIiwiY2xlYXJUaW1lb3V0IiwiZXhpc3RzIiwicnVuQWdlbnRMZWF2ZUFjdGlvbiIsIm9ic2VydmVDaGFuZ2VzIiwiYWRkZWQiLCJjaGFuZ2VkIiwicmVtb3ZlZCIsInN0b3AiLCJVc2VyUHJlc2VuY2VNb25pdG9yIiwib25TZXRVc2VyU3RhdHVzIiwicHVibGlzaCIsImhhbmRsZSIsImdldFVzZXJzSW5Sb2xlIiwicmVhZHkiLCJvblN0b3AiLCJmaW5kQnlJZHMiLCJzZXREYXRlIiwiZ2V0RGF0ZSIsInNldFNlY29uZHMiLCJnZXRTZWNvbmRzIiwiJGx0ZSIsImhhbmRsZURlcHRzIiwiZmluZEJ5Um9vbUlkQW5kVHlwZSIsImZpbmRUcmlnZ2VycyIsImZpbmREZXBhcnRtZW50cyIsImZpbmRHdWVzdCIsImZpbmRSb29tIiwiZmluZEFnZW50IiwiTGl2ZWNoYXRfaGlzdG9yeV9tb25pdG9yX3R5cGUiLCJ0aGVtZSIsInN1cnZleSIsIml0ZW1zIiwiQVBJIiwidjEiLCJhZGRSb3V0ZSIsInVybFBhcmFtcyIsImZhaWx1cmUiLCJxdWVyeVBhcmFtcyIsImNvbmZpZyIsImJvZHlQYXJhbXMiLCJLZXkiLCJwdXQiLCJkZWxldGUiLCJ0b0lTT1N0cmluZyIsImF1dGhSZXF1aXJlZCIsInVuYXV0aG9yaXplZCIsInJvb21zIiwic2VudE1lc3NhZ2VzIiwic2VudE1lc3NhZ2UiLCJpbmNsdWRlcyIsInByb3ZpZGVyIiwidGltZW91dCIsIlJvbGVzIiwiY3JlYXRlT3JVcGRhdGUiLCJQZXJtaXNzaW9ucyIsIk1lc3NhZ2VUeXBlcyIsInJlZ2lzdGVyVHlwZSIsInN5c3RlbSIsImhpc3RvcnkiLCJyZWdpc3RlciIsImluc3RhbmNlIiwidGFiQmFyIiwiaXNTZXJ2ZXIiLCJOb3RpZmljYXRpb25zIiwibm90aWZ5Um9vbSIsInNldEhpZGRlbkJ5SWQiLCJhZGRHcm91cCIsImdyb3VwIiwicHVibGljIiwiZWRpdG9yIiwiYWxsb3dlZFR5cGVzIiwic2VjdGlvbiIsImkxOG5EZXNjcmlwdGlvbiIsImVuYWJsZVF1ZXJ5IiwiUm9vbVNldHRpbmdzRW51bSIsIlJvb21UeXBlQ29uZmlnIiwiUm9vbVR5cGVSb3V0ZUNvbmZpZyIsIlVpVGV4dENvbnRleHQiLCJMaXZlY2hhdFJvb21Sb3V0ZSIsInBhdGgiLCJvcGVuUm9vbSIsImxpbmsiLCJzdWIiLCJpZGVudGlmaWVyIiwicm91dGUiLCJub3RTdWJzY3JpYmVkVHBsIiwidGVtcGxhdGUiLCJDaGF0Um9vbSIsImNvbmRpdGlvbiIsImhhc0FsbFBlcm1pc3Npb24iLCJjYW5TZW5kTWVzc2FnZSIsImdldFVzZXJTdGF0dXMiLCJTZXNzaW9uIiwiYWxsb3dSb29tU2V0dGluZ0NoYW5nZSIsIkpPSU5fQ09ERSIsImdldFVpVGV4dCIsImNvbnRleHQiLCJISURFX1dBUk5JTkciLCJMRUFWRV9XQVJOSU5HIiwiY3J5cHRvIiwicmVxdWVzdCIsInNpZ25hdHVyZSIsImNyZWF0ZUhtYWMiLCJib2R5IiwiZGlnZXN0IiwibWlkIiwiZmlyc3RfbmFtZSIsImxhc3RfbmFtZSIsInN1Y2VzcyIsInNlcnZpY2UiLCJtZWRpYSIsImN1cnIiLCJtZXNzYWdlX2xpbmsiLCJjb250ZW50VHlwZSIsImV4dHJhIiwiZnJvbUNvdW50cnkiLCJmcm9tU3RhdGUiLCJmcm9tQ2l0eSIsIkJ1c2JveSIsImZpbGVzaXplIiwibWF4RmlsZVNpemUiLCJwYWNrYWdlVmFsdWUiLCJidXNib3kiLCJmaWxlcyIsImZpZWxkbmFtZSIsImZpbGVuYW1lIiwiZW5jb2RpbmciLCJtaW1ldHlwZSIsImZpbGVEYXRlIiwiZmlsZUJ1ZmZlciIsIkJ1ZmZlciIsInBpcGUiLCJmaWxlVXBsb2FkSXNWYWxpZENvbnRlbnRUeXBlIiwicmVhc29uIiwic2l6ZUFsbG93ZWQiLCJmaWxlU3RvcmUiLCJnZXRTdG9yZSIsImRldGFpbHMiLCJ1cGxvYWRlZEZpbGUiLCJiaW5kIiwicm9sZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLENBQUo7O0FBQU1DLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLFFBQUVLLENBQUY7QUFBSTs7QUFBaEIsQ0FBbkMsRUFBcUQsQ0FBckQ7QUFBd0QsSUFBSUMsR0FBSjtBQUFRTCxPQUFPQyxLQUFQLENBQWFDLFFBQVEsS0FBUixDQUFiLEVBQTRCO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDQyxVQUFJRCxDQUFKO0FBQU07O0FBQWxCLENBQTVCLEVBQWdELENBQWhEO0FBSXRFLE1BQU07QUFBRUU7QUFBRixJQUFhQyxRQUFRQyxNQUEzQjtBQUNBLE1BQU07QUFBRUM7QUFBRixJQUFpQkYsUUFBUUcsVUFBL0I7QUFFQUosT0FBT0ssZUFBUCxDQUF1QkMsR0FBdkIsQ0FBMkIsV0FBM0IsRUFBd0NDLE9BQU9DLGVBQVAsQ0FBdUIsQ0FBQ0MsR0FBRCxFQUFNQyxHQUFOLEVBQVdDLElBQVgsS0FBb0I7QUFDbEYsUUFBTUMsU0FBU2IsSUFBSWMsS0FBSixDQUFVSixJQUFJVixHQUFkLENBQWY7O0FBQ0EsTUFBSWEsT0FBT0UsUUFBUCxLQUFvQixHQUF4QixFQUE2QjtBQUM1QixXQUFPSCxNQUFQO0FBQ0E7O0FBQ0RELE1BQUlLLFNBQUosQ0FBYyxjQUFkLEVBQThCLDBCQUE5QjtBQUVBLE1B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LENBQWhGLEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfbGl2ZWNoYXQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWxzIFdlYkFwcDp0cnVlICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCB1cmwgZnJvbSAndXJsJztcblxuY29uc3QgeyBXZWJBcHAgfSA9IFBhY2thZ2Uud2ViYXBwO1xuY29uc3QgeyBBdXRvdXBkYXRlIH0gPSBQYWNrYWdlLmF1dG91cGRhdGU7XG5cbldlYkFwcC5jb25uZWN0SGFuZGxlcnMudXNlKCcvbGl2ZWNoYXQnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChyZXEsIHJlcywgbmV4dCkgPT4ge1xuXHRjb25zdCByZXFVcmwgPSB1cmwucGFyc2UocmVxLnVybCk7XG5cdGlmIChyZXFVcmwucGF0aG5hbWUgIT09ICcvJykge1xuXHRcdHJldHVybiBuZXh0KCk7XG5cdH1cblx0cmVzLnNldEhlYWRlcignY29udGVudC10eXBlJywgJ3RleHQvaHRtbDsgY2hhcnNldD11dGYtOCcpO1xuXG5cdGxldCBkb21haW5XaGl0ZUxpc3QgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfQWxsb3dlZERvbWFpbnNMaXN0Jyk7XG5cdGlmIChyZXEuaGVhZGVycy5yZWZlcmVyICYmICFfLmlzRW1wdHkoZG9tYWluV2hpdGVMaXN0LnRyaW0oKSkpIHtcblx0XHRkb21haW5XaGl0ZUxpc3QgPSBfLm1hcChkb21haW5XaGl0ZUxpc3Quc3BsaXQoJywnKSwgZnVuY3Rpb24oZG9tYWluKSB7XG5cdFx0XHRyZXR1cm4gZG9tYWluLnRyaW0oKTtcblx0XHR9KTtcblxuXHRcdGNvbnN0IHJlZmVyZXIgPSB1cmwucGFyc2UocmVxLmhlYWRlcnMucmVmZXJlcik7XG5cdFx0aWYgKCFfLmNvbnRhaW5zKGRvbWFpbldoaXRlTGlzdCwgcmVmZXJlci5ob3N0KSkge1xuXHRcdFx0cmVzLnNldEhlYWRlcignWC1GUkFNRS1PUFRJT05TJywgJ0RFTlknKTtcblx0XHRcdHJldHVybiBuZXh0KCk7XG5cdFx0fVxuXG5cdFx0cmVzLnNldEhlYWRlcignWC1GUkFNRS1PUFRJT05TJywgYEFMTE9XLUZST00gJHsgcmVmZXJlci5wcm90b2NvbCB9Ly8keyByZWZlcmVyLmhvc3QgfWApO1xuXHR9XG5cblx0Y29uc3QgaGVhZCA9IEFzc2V0cy5nZXRUZXh0KCdwdWJsaWMvaGVhZC5odG1sJyk7XG5cblx0bGV0IGJhc2VVcmw7XG5cdGlmIChfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYICYmIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVgudHJpbSgpICE9PSAnJykge1xuXHRcdGJhc2VVcmwgPSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYO1xuXHR9IGVsc2Uge1xuXHRcdGJhc2VVcmwgPSAnLyc7XG5cdH1cblx0aWYgKC9cXC8kLy50ZXN0KGJhc2VVcmwpID09PSBmYWxzZSkge1xuXHRcdGJhc2VVcmwgKz0gJy8nO1xuXHR9XG5cblx0Y29uc3QgaHRtbCA9IGA8aHRtbD5cblx0XHQ8aGVhZD5cblx0XHRcdDxsaW5rIHJlbD1cInN0eWxlc2hlZXRcIiB0eXBlPVwidGV4dC9jc3NcIiBjbGFzcz1cIl9fbWV0ZW9yLWNzc19fXCIgaHJlZj1cIiR7IGJhc2VVcmwgfWxpdmVjaGF0L2xpdmVjaGF0LmNzcz9fZGM9JHsgQXV0b3VwZGF0ZS5hdXRvdXBkYXRlVmVyc2lvbiB9XCI+XG5cdFx0XHQ8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIj5cblx0XHRcdFx0X19tZXRlb3JfcnVudGltZV9jb25maWdfXyA9ICR7IEpTT04uc3RyaW5naWZ5KF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18pIH07XG5cdFx0XHQ8L3NjcmlwdD5cblxuXHRcdFx0PGJhc2UgaHJlZj1cIiR7IGJhc2VVcmwgfVwiPlxuXG5cdFx0XHQkeyBoZWFkIH1cblx0XHQ8L2hlYWQ+XG5cdFx0PGJvZHk+XG5cdFx0XHQ8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIiBzcmM9XCIkeyBiYXNlVXJsIH1saXZlY2hhdC9saXZlY2hhdC5qcz9fZGM9JHsgQXV0b3VwZGF0ZS5hdXRvdXBkYXRlVmVyc2lvbiB9XCI+PC9zY3JpcHQ+XG5cdFx0PC9ib2R5PlxuXHQ8L2h0bWw+YDtcblxuXHRyZXMud3JpdGUoaHRtbCk7XG5cdHJlcy5lbmQoKTtcbn0pKTtcbiIsIk1ldGVvci5zdGFydHVwKCgpID0+IHtcblx0Um9ja2V0Q2hhdC5yb29tVHlwZXMuc2V0Um9vbUZpbmQoJ2wnLCAoX2lkKSA9PiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kTGl2ZWNoYXRCeUlkKF9pZCkuZmV0Y2goKSk7XG5cblx0Um9ja2V0Q2hhdC5hdXRoei5hZGRSb29tQWNjZXNzVmFsaWRhdG9yKGZ1bmN0aW9uKHJvb20sIHVzZXIpIHtcblx0XHRyZXR1cm4gcm9vbSAmJiByb29tLnQgPT09ICdsJyAmJiB1c2VyICYmIFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih1c2VyLl9pZCwgJ3ZpZXctbGl2ZWNoYXQtcm9vbXMnKTtcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5hdXRoei5hZGRSb29tQWNjZXNzVmFsaWRhdG9yKGZ1bmN0aW9uKHJvb20sIHVzZXIsIGV4dHJhRGF0YSkge1xuXHRcdGlmICghcm9vbSAmJiBleHRyYURhdGEgJiYgZXh0cmFEYXRhLnJpZCkge1xuXHRcdFx0cm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGV4dHJhRGF0YS5yaWQpO1xuXHRcdH1cblx0XHRyZXR1cm4gcm9vbSAmJiByb29tLnQgPT09ICdsJyAmJiBleHRyYURhdGEgJiYgZXh0cmFEYXRhLnZpc2l0b3JUb2tlbiAmJiByb29tLnYgJiYgcm9vbS52LnRva2VuID09PSBleHRyYURhdGEudmlzaXRvclRva2VuO1xuXHR9KTtcblxuXHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2JlZm9yZUxlYXZlUm9vbScsIGZ1bmN0aW9uKHVzZXIsIHJvb20pIHtcblx0XHRpZiAocm9vbS50ICE9PSAnbCcpIHtcblx0XHRcdHJldHVybiB1c2VyO1xuXHRcdH1cblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKFRBUGkxOG4uX18oJ1lvdV9jYW50X2xlYXZlX2FfbGl2ZWNoYXRfcm9vbV9QbGVhc2VfdXNlX3RoZV9jbG9zZV9idXR0b24nLCB7XG5cdFx0XHRsbmc6IHVzZXIubGFuZ3VhZ2UgfHwgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ2xhbmd1YWdlJykgfHwgJ2VuJyxcblx0XHR9KSk7XG5cdH0sIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVywgJ2NhbnQtbGVhdmUtcm9vbScpO1xufSk7XG4iLCIvKiBnbG9iYWxzIFVzZXJQcmVzZW5jZUV2ZW50cyAqL1xuTWV0ZW9yLnN0YXJ0dXAoKCkgPT4ge1xuXHRVc2VyUHJlc2VuY2VFdmVudHMub24oJ3NldFN0YXR1cycsIChzZXNzaW9uLCBzdGF0dXMsIG1ldGFkYXRhKSA9PiB7XG5cdFx0aWYgKG1ldGFkYXRhICYmIG1ldGFkYXRhLnZpc2l0b3IpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0SW5xdWlyeS51cGRhdGVWaXNpdG9yU3RhdHVzKG1ldGFkYXRhLnZpc2l0b3IsIHN0YXR1cyk7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy51cGRhdGVWaXNpdG9yU3RhdHVzKG1ldGFkYXRhLnZpc2l0b3IsIHN0YXR1cyk7XG5cdFx0fVxuXHR9KTtcbn0pO1xuIiwiaW1wb3J0IExpdmVjaGF0Um9vbVR5cGUgZnJvbSAnLi4vaW1wb3J0cy9MaXZlY2hhdFJvb21UeXBlJztcbmltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5jbGFzcyBMaXZlY2hhdFJvb21UeXBlU2VydmVyIGV4dGVuZHMgTGl2ZWNoYXRSb29tVHlwZSB7XG5cdGdldE1zZ1NlbmRlcihzZW5kZXJJZCkge1xuXHRcdHJldHVybiBMaXZlY2hhdFZpc2l0b3JzLmZpbmRPbmVCeUlkKHNlbmRlcklkKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGRldGFpbHMgdG8gdXNlIG9uIG5vdGlmaWNhdGlvbnNcblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IHJvb21cblx0ICogQHBhcmFtIHtvYmplY3R9IHVzZXJcblx0ICogQHBhcmFtIHtzdHJpbmd9IG5vdGlmaWNhdGlvbk1lc3NhZ2Vcblx0ICogQHJldHVybiB7b2JqZWN0fSBOb3RpZmljYXRpb24gZGV0YWlsc1xuXHQgKi9cblx0Z2V0Tm90aWZpY2F0aW9uRGV0YWlscyhyb29tLCB1c2VyLCBub3RpZmljYXRpb25NZXNzYWdlKSB7XG5cdFx0Y29uc3QgdGl0bGUgPSBgW2xpdmVjaGF0XSAkeyB0aGlzLnJvb21OYW1lKHJvb20pIH1gO1xuXHRcdGNvbnN0IHRleHQgPSBub3RpZmljYXRpb25NZXNzYWdlO1xuXG5cdFx0cmV0dXJuIHsgdGl0bGUsIHRleHQgfTtcblx0fVxuXG5cdGNhbkFjY2Vzc1VwbG9hZGVkRmlsZSh7IHJjX3Rva2VuLCByY19yaWQgfSA9IHt9KSB7XG5cdFx0cmV0dXJuIHJjX3Rva2VuICYmIHJjX3JpZCAmJiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lT3BlbkJ5Um9vbUlkQW5kVmlzaXRvclRva2VuKHJjX3JpZCwgcmNfdG9rZW4pO1xuXHR9XG59XG5cblJvY2tldENoYXQucm9vbVR5cGVzLmFkZChuZXcgTGl2ZWNoYXRSb29tVHlwZVNlcnZlcigpKTtcbiIsIi8qIGdsb2JhbHMgSFRUUCwgU3lzdGVtTG9nZ2VyICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxubGV0IGtub3dsZWRnZUVuYWJsZWQgPSBmYWxzZTtcbmxldCBhcGlhaUtleSA9ICcnO1xubGV0IGFwaWFpTGFuZ3VhZ2UgPSAnZW4nO1xuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0tub3dsZWRnZV9FbmFibGVkJywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHRrbm93bGVkZ2VFbmFibGVkID0gdmFsdWU7XG59KTtcblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9Lbm93bGVkZ2VfQXBpYWlfS2V5JywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHRhcGlhaUtleSA9IHZhbHVlO1xufSk7XG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfS25vd2xlZGdlX0FwaWFpX0xhbmd1YWdlJywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHRhcGlhaUxhbmd1YWdlID0gdmFsdWU7XG59KTtcblxuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdhZnRlclNhdmVNZXNzYWdlJywgZnVuY3Rpb24obWVzc2FnZSwgcm9vbSkge1xuXHQvLyBza2lwcyB0aGlzIGNhbGxiYWNrIGlmIHRoZSBtZXNzYWdlIHdhcyBlZGl0ZWRcblx0aWYgKCFtZXNzYWdlIHx8IG1lc3NhZ2UuZWRpdGVkQXQpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdGlmICgha25vd2xlZGdlRW5hYmxlZCkge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0aWYgKCEodHlwZW9mIHJvb20udCAhPT0gJ3VuZGVmaW5lZCcgJiYgcm9vbS50ID09PSAnbCcgJiYgcm9vbS52ICYmIHJvb20udi50b2tlbikpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdC8vIGlmIHRoZSBtZXNzYWdlIGhhc24ndCBhIHRva2VuLCBpdCB3YXMgbm90IHNlbnQgYnkgdGhlIHZpc2l0b3IsIHNvIGlnbm9yZSBpdFxuXHRpZiAoIW1lc3NhZ2UudG9rZW4pIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHJlc3BvbnNlID0gSFRUUC5wb3N0KCdodHRwczovL2FwaS5hcGkuYWkvYXBpL3F1ZXJ5P3Y9MjAxNTA5MTAnLCB7XG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRxdWVyeTogbWVzc2FnZS5tc2csXG5cdFx0XHRcdFx0bGFuZzogYXBpYWlMYW5ndWFnZSxcblx0XHRcdFx0XHRzZXNzaW9uSWQ6IHJvb20uX2lkLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdFx0J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04Jyxcblx0XHRcdFx0XHRBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7IGFwaWFpS2V5IH1gLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cblx0XHRcdGlmIChyZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuc3RhdHVzLmNvZGUgPT09IDIwMCAmJiAhXy5pc0VtcHR5KHJlc3BvbnNlLmRhdGEucmVzdWx0LmZ1bGZpbGxtZW50LnNwZWVjaCkpIHtcblx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRFeHRlcm5hbE1lc3NhZ2UuaW5zZXJ0KHtcblx0XHRcdFx0XHRyaWQ6IG1lc3NhZ2UucmlkLFxuXHRcdFx0XHRcdG1zZzogcmVzcG9uc2UuZGF0YS5yZXN1bHQuZnVsZmlsbG1lbnQuc3BlZWNoLFxuXHRcdFx0XHRcdG9yaWc6IG1lc3NhZ2UuX2lkLFxuXHRcdFx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRTeXN0ZW1Mb2dnZXIuZXJyb3IoJ0Vycm9yIHVzaW5nIEFwaS5haSAtPicsIGUpO1xuXHRcdH1cblx0fSk7XG5cblx0cmV0dXJuIG1lc3NhZ2U7XG59LCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdleHRlcm5hbFdlYkhvb2snKTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uLy4uL3NlcnZlci9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbmZ1bmN0aW9uIHZhbGlkYXRlTWVzc2FnZShtZXNzYWdlLCByb29tKSB7XG5cdC8vIHNraXBzIHRoaXMgY2FsbGJhY2sgaWYgdGhlIG1lc3NhZ2Ugd2FzIGVkaXRlZFxuXHRpZiAobWVzc2FnZS5lZGl0ZWRBdCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIG1lc3NhZ2UgdmFsaWQgb25seSBpZiBpdCBpcyBhIGxpdmVjaGF0IHJvb21cblx0aWYgKCEodHlwZW9mIHJvb20udCAhPT0gJ3VuZGVmaW5lZCcgJiYgcm9vbS50ID09PSAnbCcgJiYgcm9vbS52ICYmIHJvb20udi50b2tlbikpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBpZiB0aGUgbWVzc2FnZSBoYXNuJ3QgYSB0b2tlbiwgaXQgd2FzIE5PVCBzZW50IGZyb20gdGhlIHZpc2l0b3IsIHNvIGlnbm9yZSBpdFxuXHRpZiAoIW1lc3NhZ2UudG9rZW4pIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBpZiB0aGUgbWVzc2FnZSBoYXMgYSB0eXBlIG1lYW5zIGl0IGlzIGEgc3BlY2lhbCBtZXNzYWdlIChsaWtlIHRoZSBjbG9zaW5nIGNvbW1lbnQpLCBzbyBza2lwc1xuXHRpZiAobWVzc2FnZS50KSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0cmV0dXJuIHRydWU7XG59XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJTYXZlTWVzc2FnZScsIGZ1bmN0aW9uKG1lc3NhZ2UsIHJvb20pIHtcblx0aWYgKCF2YWxpZGF0ZU1lc3NhZ2UobWVzc2FnZSwgcm9vbSkpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdGNvbnN0IHBob25lUmVnZXhwID0gbmV3IFJlZ0V4cChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfbGVhZF9waG9uZV9yZWdleCcpLCAnZycpO1xuXHRjb25zdCBtc2dQaG9uZXMgPSBtZXNzYWdlLm1zZy5tYXRjaChwaG9uZVJlZ2V4cCk7XG5cblx0Y29uc3QgZW1haWxSZWdleHAgPSBuZXcgUmVnRXhwKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9sZWFkX2VtYWlsX3JlZ2V4JyksICdnaScpO1xuXHRjb25zdCBtc2dFbWFpbHMgPSBtZXNzYWdlLm1zZy5tYXRjaChlbWFpbFJlZ2V4cCk7XG5cblx0aWYgKG1zZ0VtYWlscyB8fCBtc2dQaG9uZXMpIHtcblx0XHRMaXZlY2hhdFZpc2l0b3JzLnNhdmVHdWVzdEVtYWlsUGhvbmVCeUlkKHJvb20udi5faWQsIG1zZ0VtYWlscywgbXNnUGhvbmVzKTtcblxuXHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLnJ1bignbGl2ZWNoYXQubGVhZENhcHR1cmUnLCByb29tKTtcblx0fVxuXG5cdHJldHVybiBtZXNzYWdlO1xufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnbGVhZENhcHR1cmUnKTtcbiIsIlJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJTYXZlTWVzc2FnZScsIGZ1bmN0aW9uKG1lc3NhZ2UsIHJvb20pIHtcblx0Ly8gc2tpcHMgdGhpcyBjYWxsYmFjayBpZiB0aGUgbWVzc2FnZSB3YXMgZWRpdGVkXG5cdGlmICghbWVzc2FnZSB8fCBtZXNzYWdlLmVkaXRlZEF0KSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHQvLyBjaGVjayBpZiByb29tIGlzIHlldCBhd2FpdGluZyBmb3IgcmVzcG9uc2Vcblx0aWYgKCEodHlwZW9mIHJvb20udCAhPT0gJ3VuZGVmaW5lZCcgJiYgcm9vbS50ID09PSAnbCcgJiYgcm9vbS53YWl0aW5nUmVzcG9uc2UpKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHQvLyBpZiB0aGUgbWVzc2FnZSBoYXMgYSB0b2tlbiwgaXQgd2FzIHNlbnQgYnkgdGhlIHZpc2l0b3IsIHNvIGlnbm9yZSBpdFxuXHRpZiAobWVzc2FnZS50b2tlbikge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRSZXNwb25zZUJ5Um9vbUlkKHJvb20uX2lkLCB7XG5cdFx0XHR1c2VyOiB7XG5cdFx0XHRcdF9pZDogbWVzc2FnZS51Ll9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IG1lc3NhZ2UudS51c2VybmFtZSxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0pO1xuXG5cdHJldHVybiBtZXNzYWdlO1xufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnbWFya1Jvb21SZXNwb25kZWQnKTtcbiIsIlJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnbGl2ZWNoYXQub2ZmbGluZU1lc3NhZ2UnLCAoZGF0YSkgPT4ge1xuXHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF93ZWJob29rX29uX29mZmxpbmVfbXNnJykpIHtcblx0XHRyZXR1cm4gZGF0YTtcblx0fVxuXG5cdGNvbnN0IHBvc3REYXRhID0ge1xuXHRcdHR5cGU6ICdMaXZlY2hhdE9mZmxpbmVNZXNzYWdlJyxcblx0XHRzZW50QXQ6IG5ldyBEYXRlKCksXG5cdFx0dmlzaXRvcjoge1xuXHRcdFx0bmFtZTogZGF0YS5uYW1lLFxuXHRcdFx0ZW1haWw6IGRhdGEuZW1haWwsXG5cdFx0fSxcblx0XHRtZXNzYWdlOiBkYXRhLm1lc3NhZ2UsXG5cdH07XG5cblx0Um9ja2V0Q2hhdC5MaXZlY2hhdC5zZW5kUmVxdWVzdChwb3N0RGF0YSk7XG59LCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5NRURJVU0sICdsaXZlY2hhdC1zZW5kLWVtYWlsLW9mZmxpbmUtbWVzc2FnZScpO1xuIiwiZnVuY3Rpb24gc2VuZFRvUkRTdGF0aW9uKHJvb20pIHtcblx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfUkRTdGF0aW9uX1Rva2VuJykpIHtcblx0XHRyZXR1cm4gcm9vbTtcblx0fVxuXG5cdGNvbnN0IGxpdmVjaGF0RGF0YSA9IFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0TGl2ZWNoYXRSb29tR3Vlc3RJbmZvKHJvb20pO1xuXG5cdGlmICghbGl2ZWNoYXREYXRhLnZpc2l0b3IuZW1haWwpIHtcblx0XHRyZXR1cm4gcm9vbTtcblx0fVxuXG5cdGNvbnN0IGVtYWlsID0gQXJyYXkuaXNBcnJheShsaXZlY2hhdERhdGEudmlzaXRvci5lbWFpbCkgPyBsaXZlY2hhdERhdGEudmlzaXRvci5lbWFpbFswXS5hZGRyZXNzIDogbGl2ZWNoYXREYXRhLnZpc2l0b3IuZW1haWw7XG5cblx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRoZWFkZXJzOiB7XG5cdFx0XHQnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuXHRcdH0sXG5cdFx0ZGF0YToge1xuXHRcdFx0dG9rZW5fcmRzdGF0aW9uOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfUkRTdGF0aW9uX1Rva2VuJyksXG5cdFx0XHRpZGVudGlmaWNhZG9yOiAncm9ja2V0Y2hhdC1saXZlY2hhdCcsXG5cdFx0XHRjbGllbnRfaWQ6IGxpdmVjaGF0RGF0YS52aXNpdG9yLl9pZCxcblx0XHRcdGVtYWlsLFxuXHRcdH0sXG5cdH07XG5cblx0b3B0aW9ucy5kYXRhLm5vbWUgPSBsaXZlY2hhdERhdGEudmlzaXRvci5uYW1lIHx8IGxpdmVjaGF0RGF0YS52aXNpdG9yLnVzZXJuYW1lO1xuXG5cdGlmIChsaXZlY2hhdERhdGEudmlzaXRvci5waG9uZSkge1xuXHRcdG9wdGlvbnMuZGF0YS50ZWxlZm9uZSA9IGxpdmVjaGF0RGF0YS52aXNpdG9yLnBob25lO1xuXHR9XG5cblx0aWYgKGxpdmVjaGF0RGF0YS50YWdzKSB7XG5cdFx0b3B0aW9ucy5kYXRhLnRhZ3MgPSBsaXZlY2hhdERhdGEudGFncztcblx0fVxuXG5cdE9iamVjdC5rZXlzKGxpdmVjaGF0RGF0YS5jdXN0b21GaWVsZHMgfHwge30pLmZvckVhY2goKGZpZWxkKSA9PiB7XG5cdFx0b3B0aW9ucy5kYXRhW2ZpZWxkXSA9IGxpdmVjaGF0RGF0YS5jdXN0b21GaWVsZHNbZmllbGRdO1xuXHR9KTtcblxuXHRPYmplY3Qua2V5cyhsaXZlY2hhdERhdGEudmlzaXRvci5jdXN0b21GaWVsZHMgfHwge30pLmZvckVhY2goKGZpZWxkKSA9PiB7XG5cdFx0b3B0aW9ucy5kYXRhW2ZpZWxkXSA9IGxpdmVjaGF0RGF0YS52aXNpdG9yLmN1c3RvbUZpZWxkc1tmaWVsZF07XG5cdH0pO1xuXG5cdHRyeSB7XG5cdFx0SFRUUC5jYWxsKCdQT1NUJywgJ2h0dHBzOi8vd3d3LnJkc3RhdGlvbi5jb20uYnIvYXBpLzEuMy9jb252ZXJzaW9ucycsIG9wdGlvbnMpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0Y29uc29sZS5lcnJvcignRXJyb3Igc2VuZGluZyBsZWFkIHRvIFJEIFN0YXRpb24gLT4nLCBlKTtcblx0fVxuXG5cdHJldHVybiByb29tO1xufVxuXG5Sb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2xpdmVjaGF0LmNsb3NlUm9vbScsIHNlbmRUb1JEU3RhdGlvbiwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTUVESVVNLCAnbGl2ZWNoYXQtcmQtc3RhdGlvbi1jbG9zZS1yb29tJyk7XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnbGl2ZWNoYXQuc2F2ZUluZm8nLCBzZW5kVG9SRFN0YXRpb24sIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5Lk1FRElVTSwgJ2xpdmVjaGF0LXJkLXN0YXRpb24tc2F2ZS1pbmZvJyk7XG4iLCJSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyU2F2ZU1lc3NhZ2UnLCBmdW5jdGlvbihtZXNzYWdlLCByb29tKSB7XG5cdC8vIHNraXBzIHRoaXMgY2FsbGJhY2sgaWYgdGhlIG1lc3NhZ2Ugd2FzIGVkaXRlZFxuXHRpZiAoIW1lc3NhZ2UgfHwgbWVzc2FnZS5lZGl0ZWRBdCkge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0Ly8gY2hlY2sgaWYgcm9vbSBpcyBsaXZlY2hhdFxuXHRpZiAocm9vbS50ICE9PSAnbCcpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcblx0XHRsZXQgYW5hbHl0aWNzRGF0YTtcblxuXHRcdC8vIGlmIHRoZSBtZXNzYWdlIGhhcyBhIHRva2VuLCBpdCB3YXMgc2VudCBieSB0aGUgdmlzaXRvclxuXHRcdGlmICghbWVzc2FnZS50b2tlbikge1xuXHRcdFx0Y29uc3QgdmlzaXRvckxhc3RRdWVyeSA9IChyb29tLm1ldHJpY3MgJiYgcm9vbS5tZXRyaWNzLnYpID8gcm9vbS5tZXRyaWNzLnYubHEgOiByb29tLnRzO1xuXHRcdFx0Y29uc3QgYWdlbnRMYXN0UmVwbHkgPSAocm9vbS5tZXRyaWNzICYmIHJvb20ubWV0cmljcy5zZXJ2ZWRCeSkgPyByb29tLm1ldHJpY3Muc2VydmVkQnkubHIgOiByb29tLnRzO1xuXHRcdFx0Y29uc3QgYWdlbnRKb2luVGltZSA9IChyb29tLnNlcnZlZEJ5ICYmIHJvb20uc2VydmVkQnkudHMpID8gcm9vbS5zZXJ2ZWRCeS50cyA6IHJvb20udHM7XG5cblx0XHRcdGNvbnN0IGlzUmVzcG9uc2VUdCA9IHJvb20ubWV0cmljcyAmJiByb29tLm1ldHJpY3MucmVzcG9uc2UgJiYgcm9vbS5tZXRyaWNzLnJlc3BvbnNlLnR0O1xuXHRcdFx0Y29uc3QgaXNSZXNwb25zZVRvdGFsID0gcm9vbS5tZXRyaWNzICYmIHJvb20ubWV0cmljcy5yZXNwb25zZSAmJiByb29tLm1ldHJpY3MucmVzcG9uc2UudG90YWw7XG5cblx0XHRcdGlmIChhZ2VudExhc3RSZXBseSA9PT0gcm9vbS50cykge1x0XHQvLyBmaXJzdCByZXNwb25zZVxuXHRcdFx0XHRjb25zdCBmaXJzdFJlc3BvbnNlRGF0ZSA9IG5vdztcblx0XHRcdFx0Y29uc3QgZmlyc3RSZXNwb25zZVRpbWUgPSAobm93LmdldFRpbWUoKSAtIHZpc2l0b3JMYXN0UXVlcnkpIC8gMTAwMDtcblx0XHRcdFx0Y29uc3QgcmVzcG9uc2VUaW1lID0gKG5vdy5nZXRUaW1lKCkgLSB2aXNpdG9yTGFzdFF1ZXJ5KSAvIDEwMDA7XG5cdFx0XHRcdGNvbnN0IGF2Z1Jlc3BvbnNlVGltZSA9ICgoKGlzUmVzcG9uc2VUdCkgPyByb29tLm1ldHJpY3MucmVzcG9uc2UudHQgOiAwKSArIHJlc3BvbnNlVGltZSkgLyAoKChpc1Jlc3BvbnNlVG90YWwpID8gcm9vbS5tZXRyaWNzLnJlc3BvbnNlLnRvdGFsIDogMCkgKyAxKTtcblxuXHRcdFx0XHRjb25zdCBmaXJzdFJlYWN0aW9uRGF0ZSA9IG5vdztcblx0XHRcdFx0Y29uc3QgZmlyc3RSZWFjdGlvblRpbWUgPSAobm93LmdldFRpbWUoKSAtIGFnZW50Sm9pblRpbWUpIC8gMTAwMDtcblx0XHRcdFx0Y29uc3QgcmVhY3Rpb25UaW1lID0gKG5vdy5nZXRUaW1lKCkgLSBhZ2VudEpvaW5UaW1lKSAvIDEwMDA7XG5cblx0XHRcdFx0YW5hbHl0aWNzRGF0YSA9IHtcblx0XHRcdFx0XHRmaXJzdFJlc3BvbnNlRGF0ZSxcblx0XHRcdFx0XHRmaXJzdFJlc3BvbnNlVGltZSxcblx0XHRcdFx0XHRyZXNwb25zZVRpbWUsXG5cdFx0XHRcdFx0YXZnUmVzcG9uc2VUaW1lLFxuXHRcdFx0XHRcdGZpcnN0UmVhY3Rpb25EYXRlLFxuXHRcdFx0XHRcdGZpcnN0UmVhY3Rpb25UaW1lLFxuXHRcdFx0XHRcdHJlYWN0aW9uVGltZSxcblx0XHRcdFx0fTtcblx0XHRcdH0gZWxzZSBpZiAodmlzaXRvckxhc3RRdWVyeSA+IGFnZW50TGFzdFJlcGx5KSB7XHRcdC8vIHJlc3BvbnNlLCBub3QgZmlyc3Rcblx0XHRcdFx0Y29uc3QgcmVzcG9uc2VUaW1lID0gKG5vdy5nZXRUaW1lKCkgLSB2aXNpdG9yTGFzdFF1ZXJ5KSAvIDEwMDA7XG5cdFx0XHRcdGNvbnN0IGF2Z1Jlc3BvbnNlVGltZSA9ICgoKGlzUmVzcG9uc2VUdCkgPyByb29tLm1ldHJpY3MucmVzcG9uc2UudHQgOiAwKSArIHJlc3BvbnNlVGltZSkgLyAoKChpc1Jlc3BvbnNlVG90YWwpID8gcm9vbS5tZXRyaWNzLnJlc3BvbnNlLnRvdGFsIDogMCkgKyAxKTtcblxuXHRcdFx0XHRjb25zdCByZWFjdGlvblRpbWUgPSAobm93LmdldFRpbWUoKSAtIHZpc2l0b3JMYXN0UXVlcnkpIC8gMTAwMDtcblxuXHRcdFx0XHRhbmFseXRpY3NEYXRhID0ge1xuXHRcdFx0XHRcdHJlc3BvbnNlVGltZSxcblx0XHRcdFx0XHRhdmdSZXNwb25zZVRpbWUsXG5cdFx0XHRcdFx0cmVhY3Rpb25UaW1lLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVx0Ly8gaWdub3JlLCBpdHMgY29udGludWluZyByZXNwb25zZVxuXHRcdH1cblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNhdmVBbmFseXRpY3NEYXRhQnlSb29tSWQocm9vbSwgbWVzc2FnZSwgYW5hbHl0aWNzRGF0YSk7XG5cdH0pO1xuXG5cdHJldHVybiBtZXNzYWdlO1xufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnc2F2ZUFuYWx5dGljc0RhdGEnKTtcbiIsImNvbnN0IG1zZ05hdlR5cGUgPSAnbGl2ZWNoYXRfbmF2aWdhdGlvbl9oaXN0b3J5JztcblxuY29uc3QgY3JtRW5hYmxlZCA9ICgpID0+IHtcblx0Y29uc3Qgc2VjcmV0VG9rZW4gPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfc2VjcmV0X3Rva2VuJyk7XG5cdGNvbnN0IHdlYmhvb2tVcmwgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfd2ViaG9va1VybCcpO1xuXHRyZXR1cm4gc2VjcmV0VG9rZW4gIT09ICcnICYmIHNlY3JldFRva2VuICE9PSB1bmRlZmluZWQgJiYgd2ViaG9va1VybCAhPT0gJycgJiYgd2ViaG9va1VybCAhPT0gdW5kZWZpbmVkO1xufTtcblxuY29uc3Qgc2VuZE1lc3NhZ2VUeXBlID0gKG1zZ1R5cGUpID0+IHtcblx0Y29uc3Qgc2VuZE5hdkhpc3RvcnkgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfVmlzaXRvcl9uYXZpZ2F0aW9uX2FzX2FfbWVzc2FnZScpICYmIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTZW5kX3Zpc2l0b3JfbmF2aWdhdGlvbl9oaXN0b3J5X2xpdmVjaGF0X3dlYmhvb2tfcmVxdWVzdCcpO1xuXG5cdHJldHVybiBzZW5kTmF2SGlzdG9yeSAmJiBtc2dUeXBlID09PSBtc2dOYXZUeXBlO1xufTtcblxuZnVuY3Rpb24gc2VuZFRvQ1JNKHR5cGUsIHJvb20sIGluY2x1ZGVNZXNzYWdlcyA9IHRydWUpIHtcblx0aWYgKGNybUVuYWJsZWQoKSA9PT0gZmFsc2UpIHtcblx0XHRyZXR1cm4gcm9vbTtcblx0fVxuXG5cdGNvbnN0IHBvc3REYXRhID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXRMaXZlY2hhdFJvb21HdWVzdEluZm8ocm9vbSk7XG5cblx0cG9zdERhdGEudHlwZSA9IHR5cGU7XG5cblx0cG9zdERhdGEubWVzc2FnZXMgPSBbXTtcblxuXHRsZXQgbWVzc2FnZXM7XG5cdGlmICh0eXBlb2YgaW5jbHVkZU1lc3NhZ2VzID09PSAnYm9vbGVhbicgJiYgaW5jbHVkZU1lc3NhZ2VzKSB7XG5cdFx0bWVzc2FnZXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kVmlzaWJsZUJ5Um9vbUlkKHJvb20uX2lkLCB7IHNvcnQ6IHsgdHM6IDEgfSB9KTtcblx0fSBlbHNlIGlmIChpbmNsdWRlTWVzc2FnZXMgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdG1lc3NhZ2VzID0gaW5jbHVkZU1lc3NhZ2VzO1xuXHR9XG5cblx0aWYgKG1lc3NhZ2VzKSB7XG5cdFx0bWVzc2FnZXMuZm9yRWFjaCgobWVzc2FnZSkgPT4ge1xuXHRcdFx0aWYgKG1lc3NhZ2UudCAmJiAhc2VuZE1lc3NhZ2VUeXBlKG1lc3NhZ2UudCkpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgbXNnID0ge1xuXHRcdFx0XHRfaWQ6IG1lc3NhZ2UuX2lkLFxuXHRcdFx0XHR1c2VybmFtZTogbWVzc2FnZS51LnVzZXJuYW1lLFxuXHRcdFx0XHRtc2c6IG1lc3NhZ2UubXNnLFxuXHRcdFx0XHR0czogbWVzc2FnZS50cyxcblx0XHRcdFx0ZWRpdGVkQXQ6IG1lc3NhZ2UuZWRpdGVkQXQsXG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAobWVzc2FnZS51LnVzZXJuYW1lICE9PSBwb3N0RGF0YS52aXNpdG9yLnVzZXJuYW1lKSB7XG5cdFx0XHRcdG1zZy5hZ2VudElkID0gbWVzc2FnZS51Ll9pZDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKG1lc3NhZ2UudCA9PT0gbXNnTmF2VHlwZSkge1xuXHRcdFx0XHRtc2cubmF2aWdhdGlvbiA9IG1lc3NhZ2UubmF2aWdhdGlvbjtcblx0XHRcdH1cblxuXHRcdFx0cG9zdERhdGEubWVzc2FnZXMucHVzaChtc2cpO1xuXHRcdH0pO1xuXHR9XG5cblx0Y29uc3QgcmVzcG9uc2UgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LnNlbmRSZXF1ZXN0KHBvc3REYXRhKTtcblxuXHRpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmRhdGEpIHtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zYXZlQ1JNRGF0YUJ5Um9vbUlkKHJvb20uX2lkLCByZXNwb25zZS5kYXRhLmRhdGEpO1xuXHR9XG5cblx0cmV0dXJuIHJvb207XG59XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnbGl2ZWNoYXQuY2xvc2VSb29tJywgKHJvb20pID0+IHtcblx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfd2ViaG9va19vbl9jbG9zZScpKSB7XG5cdFx0cmV0dXJuIHJvb207XG5cdH1cblxuXHRyZXR1cm4gc2VuZFRvQ1JNKCdMaXZlY2hhdFNlc3Npb24nLCByb29tKTtcbn0sIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5Lk1FRElVTSwgJ2xpdmVjaGF0LXNlbmQtY3JtLWNsb3NlLXJvb20nKTtcblxuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdsaXZlY2hhdC5zYXZlSW5mbycsIChyb29tKSA9PiB7XG5cdC8vIERvIG5vdCBzZW5kIHRvIENSTSBpZiB0aGUgY2hhdCBpcyBzdGlsbCBvcGVuXG5cdGlmIChyb29tLm9wZW4pIHtcblx0XHRyZXR1cm4gcm9vbTtcblx0fVxuXG5cdHJldHVybiBzZW5kVG9DUk0oJ0xpdmVjaGF0RWRpdCcsIHJvb20pO1xufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTUVESVVNLCAnbGl2ZWNoYXQtc2VuZC1jcm0tc2F2ZS1pbmZvJyk7XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJTYXZlTWVzc2FnZScsIGZ1bmN0aW9uKG1lc3NhZ2UsIHJvb20pIHtcblx0Ly8gb25seSBjYWxsIHdlYmhvb2sgaWYgaXQgaXMgYSBsaXZlY2hhdCByb29tXG5cdGlmIChyb29tLnQgIT09ICdsJyB8fCByb29tLnYgPT0gbnVsbCB8fCByb29tLnYudG9rZW4gPT0gbnVsbCkge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0Ly8gaWYgdGhlIG1lc3NhZ2UgaGFzIGEgdG9rZW4sIGl0IHdhcyBzZW50IGZyb20gdGhlIHZpc2l0b3Jcblx0Ly8gaWYgbm90LCBpdCB3YXMgc2VudCBmcm9tIHRoZSBhZ2VudFxuXHRpZiAobWVzc2FnZS50b2tlbikge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fdmlzaXRvcl9tZXNzYWdlJykpIHtcblx0XHRcdHJldHVybiBtZXNzYWdlO1xuXHRcdH1cblx0fSBlbHNlIGlmICghUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fYWdlbnRfbWVzc2FnZScpKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblx0Ly8gaWYgdGhlIG1lc3NhZ2UgaGFzIGEgdHlwZSBtZWFucyBpdCBpcyBhIHNwZWNpYWwgbWVzc2FnZSAobGlrZSB0aGUgY2xvc2luZyBjb21tZW50KSwgc28gc2tpcHNcblx0Ly8gdW5sZXNzIHRoZSBzZXR0aW5ncyB0aGF0IGhhbmRsZSB3aXRoIHZpc2l0b3IgbmF2aWdhdGlvbiBoaXN0b3J5IGFyZSBlbmFibGVkXG5cdGlmIChtZXNzYWdlLnQgJiYgIXNlbmRNZXNzYWdlVHlwZShtZXNzYWdlLnQpKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHRzZW5kVG9DUk0oJ01lc3NhZ2UnLCByb29tLCBbbWVzc2FnZV0pO1xuXHRyZXR1cm4gbWVzc2FnZTtcbn0sIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5Lk1FRElVTSwgJ2xpdmVjaGF0LXNlbmQtY3JtLW1lc3NhZ2UnKTtcblxuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdsaXZlY2hhdC5sZWFkQ2FwdHVyZScsIChyb29tKSA9PiB7XG5cdGlmICghUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fY2FwdHVyZScpKSB7XG5cdFx0cmV0dXJuIHJvb207XG5cdH1cblx0cmV0dXJuIHNlbmRUb0NSTSgnTGVhZENhcHR1cmUnLCByb29tLCBmYWxzZSk7XG59LCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5NRURJVU0sICdsaXZlY2hhdC1zZW5kLWNybS1sZWFkLWNhcHR1cmUnKTtcbiIsImltcG9ydCBPbW5pQ2hhbm5lbCBmcm9tICcuLi9saWIvT21uaUNoYW5uZWwnO1xuXG5Sb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyU2F2ZU1lc3NhZ2UnLCBmdW5jdGlvbihtZXNzYWdlLCByb29tKSB7XG5cdC8vIHNraXBzIHRoaXMgY2FsbGJhY2sgaWYgdGhlIG1lc3NhZ2Ugd2FzIGVkaXRlZFxuXHRpZiAobWVzc2FnZS5lZGl0ZWRBdCkge1xuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfRmFjZWJvb2tfRW5hYmxlZCcpIHx8ICFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfRmFjZWJvb2tfQVBJX0tleScpKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHQvLyBvbmx5IHNlbmQgdGhlIHNtcyBieSBTTVMgaWYgaXQgaXMgYSBsaXZlY2hhdCByb29tIHdpdGggU01TIHNldCB0byB0cnVlXG5cdGlmICghKHR5cGVvZiByb29tLnQgIT09ICd1bmRlZmluZWQnICYmIHJvb20udCA9PT0gJ2wnICYmIHJvb20uZmFjZWJvb2sgJiYgcm9vbS52ICYmIHJvb20udi50b2tlbikpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdC8vIGlmIHRoZSBtZXNzYWdlIGhhcyBhIHRva2VuLCBpdCB3YXMgc2VudCBmcm9tIHRoZSB2aXNpdG9yLCBzbyBpZ25vcmUgaXRcblx0aWYgKG1lc3NhZ2UudG9rZW4pIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdC8vIGlmIHRoZSBtZXNzYWdlIGhhcyBhIHR5cGUgbWVhbnMgaXQgaXMgYSBzcGVjaWFsIG1lc3NhZ2UgKGxpa2UgdGhlIGNsb3NpbmcgY29tbWVudCksIHNvIHNraXBzXG5cdGlmIChtZXNzYWdlLnQpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdE9tbmlDaGFubmVsLnJlcGx5KHtcblx0XHRwYWdlOiByb29tLmZhY2Vib29rLnBhZ2UuaWQsXG5cdFx0dG9rZW46IHJvb20udi50b2tlbixcblx0XHR0ZXh0OiBtZXNzYWdlLm1zZyxcblx0fSk7XG5cblx0cmV0dXJuIG1lc3NhZ2U7XG5cbn0sIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVywgJ3NlbmRNZXNzYWdlVG9GYWNlYm9vaycpO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6YWRkQWdlbnQnKHVzZXJuYW1lKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OmFkZEFnZW50JyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5hZGRBZ2VudCh1c2VybmFtZSk7XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OmFkZE1hbmFnZXInKHVzZXJuYW1lKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OmFkZE1hbmFnZXInIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LmFkZE1hbmFnZXIodXNlcm5hbWUpO1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpjaGFuZ2VMaXZlY2hhdFN0YXR1cycoKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpjaGFuZ2VMaXZlY2hhdFN0YXR1cycgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXNlciA9IE1ldGVvci51c2VyKCk7XG5cblx0XHRjb25zdCBuZXdTdGF0dXMgPSB1c2VyLnN0YXR1c0xpdmVjaGF0ID09PSAnYXZhaWxhYmxlJyA/ICdub3QtYXZhaWxhYmxlJyA6ICdhdmFpbGFibGUnO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnNldExpdmVjaGF0U3RhdHVzKHVzZXIuX2lkLCBuZXdTdGF0dXMpO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OmNsb3NlQnlWaXNpdG9yJyh7IHJvb21JZCwgdG9rZW4gfSkge1xuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lT3BlbkJ5Um9vbUlkQW5kVmlzaXRvclRva2VuKHJvb21JZCwgdG9rZW4pO1xuXG5cdFx0aWYgKCFyb29tIHx8ICFyb29tLm9wZW4pIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRjb25zdCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih0b2tlbik7XG5cblx0XHRjb25zdCBsYW5ndWFnZSA9ICh2aXNpdG9yICYmIHZpc2l0b3IubGFuZ3VhZ2UpIHx8IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdsYW5ndWFnZScpIHx8ICdlbic7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5jbG9zZVJvb20oe1xuXHRcdFx0dmlzaXRvcixcblx0XHRcdHJvb20sXG5cdFx0XHRjb21tZW50OiBUQVBpMThuLl9fKCdDbG9zZWRfYnlfdmlzaXRvcicsIHsgbG5nOiBsYW5ndWFnZSB9KSxcblx0XHR9KTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6Y2xvc2VSb29tJyhyb29tSWQsIGNvbW1lbnQpIHtcblx0XHRjb25zdCB1c2VySWQgPSBNZXRlb3IudXNlcklkKCk7XG5cdFx0aWYgKCF1c2VySWQgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih1c2VySWQsICdjbG9zZS1saXZlY2hhdC1yb29tJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpjbG9zZVJvb20nIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tSWQpO1xuXG5cdFx0aWYgKCFyb29tIHx8IHJvb20udCAhPT0gJ2wnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdyb29tLW5vdC1mb3VuZCcsICdSb29tIG5vdCBmb3VuZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6Y2xvc2VSb29tJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXIoKTtcblxuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHJvb21JZCwgdXNlci5faWQsIHsgX2lkOiAxIH0pO1xuXHRcdGlmICghc3Vic2NyaXB0aW9uICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAnY2xvc2Utb3RoZXJzLWxpdmVjaGF0LXJvb20nKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OmNsb3NlUm9vbScgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuTGl2ZWNoYXQuY2xvc2VSb29tKHtcblx0XHRcdHVzZXIsXG5cdFx0XHRyb29tLFxuXHRcdFx0Y29tbWVudCxcblx0XHR9KTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IE9tbmlDaGFubmVsIGZyb20gJy4uL2xpYi9PbW5pQ2hhbm5lbCc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OmZhY2Vib29rJyhvcHRpb25zKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OmFkZEFnZW50JyB9KTtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0c3dpdGNoIChvcHRpb25zLmFjdGlvbikge1xuXHRcdFx0XHRjYXNlICdpbml0aWFsU3RhdGUnOiB7XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19FbmFibGVkJyksXG5cdFx0XHRcdFx0XHRoYXNUb2tlbjogISFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfRmFjZWJvb2tfQVBJX0tleScpLFxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjYXNlICdlbmFibGUnOiB7XG5cdFx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gT21uaUNoYW5uZWwuZW5hYmxlKCk7XG5cblx0XHRcdFx0XHRpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LnNldHRpbmdzLnVwZGF0ZUJ5SWQoJ0xpdmVjaGF0X0ZhY2Vib29rX0VuYWJsZWQnLCB0cnVlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNhc2UgJ2Rpc2FibGUnOiB7XG5cdFx0XHRcdFx0T21uaUNoYW5uZWwuZGlzYWJsZSgpO1xuXG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuc2V0dGluZ3MudXBkYXRlQnlJZCgnTGl2ZWNoYXRfRmFjZWJvb2tfRW5hYmxlZCcsIGZhbHNlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNhc2UgJ2xpc3QtcGFnZXMnOiB7XG5cdFx0XHRcdFx0cmV0dXJuIE9tbmlDaGFubmVsLmxpc3RQYWdlcygpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2FzZSAnc3Vic2NyaWJlJzoge1xuXHRcdFx0XHRcdHJldHVybiBPbW5pQ2hhbm5lbC5zdWJzY3JpYmUob3B0aW9ucy5wYWdlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNhc2UgJ3Vuc3Vic2NyaWJlJzoge1xuXHRcdFx0XHRcdHJldHVybiBPbW5pQ2hhbm5lbC51bnN1YnNjcmliZShvcHRpb25zLnBhZ2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0aWYgKGUucmVzcG9uc2UgJiYgZS5yZXNwb25zZS5kYXRhICYmIGUucmVzcG9uc2UuZGF0YS5lcnJvcikge1xuXHRcdFx0XHRpZiAoZS5yZXNwb25zZS5kYXRhLmVycm9yLmVycm9yKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcihlLnJlc3BvbnNlLmRhdGEuZXJyb3IuZXJyb3IsIGUucmVzcG9uc2UuZGF0YS5lcnJvci5tZXNzYWdlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZS5yZXNwb25zZS5kYXRhLmVycm9yLnJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW50ZWdyYXRpb24tZXJyb3InLCBlLnJlc3BvbnNlLmRhdGEuZXJyb3IucmVzcG9uc2UuZXJyb3IubWVzc2FnZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGUucmVzcG9uc2UuZGF0YS5lcnJvci5tZXNzYWdlKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW50ZWdyYXRpb24tZXJyb3InLCBlLnJlc3BvbnNlLmRhdGEuZXJyb3IubWVzc2FnZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNvbnRhY3Rpbmcgb21uaS5yb2NrZXQuY2hhdDonLCBlKTtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludGVncmF0aW9uLWVycm9yJywgZS5lcnJvcik7XG5cdFx0fVxuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpnZXRDdXN0b21GaWVsZHMnKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdEN1c3RvbUZpZWxkLmZpbmQoKS5mZXRjaCgpO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OmdldEFnZW50RGF0YScoeyByb29tSWQsIHRva2VuIH0pIHtcblx0XHRjaGVjayhyb29tSWQsIFN0cmluZyk7XG5cdFx0Y2hlY2sodG9rZW4sIFN0cmluZyk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocm9vbUlkKTtcblx0XHRjb25zdCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih0b2tlbik7XG5cblx0XHRpZiAoIXJvb20gfHwgcm9vbS50ICE9PSAnbCcgfHwgIXJvb20udiB8fCByb29tLnYudG9rZW4gIT09IHZpc2l0b3IudG9rZW4pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nKTtcblx0XHR9XG5cblx0XHRpZiAoIXJvb20uc2VydmVkQnkpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZ2V0QWdlbnRJbmZvKHJvb20uc2VydmVkQnkuX2lkKTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6Z2V0QWdlbnRPdmVydmlld0RhdGEnKG9wdGlvbnMpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAnbGl2ZWNoYXQ6Z2V0QWdlbnRPdmVydmlld0RhdGEnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKCEob3B0aW9ucy5jaGFydE9wdGlvbnMgJiYgb3B0aW9ucy5jaGFydE9wdGlvbnMubmFtZSkpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdJbmNvcnJlY3QgYW5hbHl0aWNzIG9wdGlvbnMnKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5BbmFseXRpY3MuZ2V0QWdlbnRPdmVydmlld0RhdGEob3B0aW9ucyk7XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OmdldEFuYWx5dGljc0NoYXJ0RGF0YScob3B0aW9ucykge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdsaXZlY2hhdDpnZXRBbmFseXRpY3NDaGFydERhdGEnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKCEob3B0aW9ucy5jaGFydE9wdGlvbnMgJiYgb3B0aW9ucy5jaGFydE9wdGlvbnMubmFtZSkpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdJbmNvcnJlY3QgY2hhcnQgb3B0aW9ucycpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LkFuYWx5dGljcy5nZXRBbmFseXRpY3NDaGFydERhdGEob3B0aW9ucyk7XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OmdldEFuYWx5dGljc092ZXJ2aWV3RGF0YScob3B0aW9ucykge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdsaXZlY2hhdDpnZXRBbmFseXRpY3NPdmVydmlld0RhdGEnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKCEob3B0aW9ucy5hbmFseXRpY3NPcHRpb25zICYmIG9wdGlvbnMuYW5hbHl0aWNzT3B0aW9ucy5uYW1lKSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ0luY29ycmVjdCBhbmFseXRpY3Mgb3B0aW9ucycpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LkFuYWx5dGljcy5nZXRBbmFseXRpY3NPdmVydmlld0RhdGEob3B0aW9ucyk7XG5cdH0sXG59KTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5pbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OmdldEluaXRpYWxEYXRhJyh2aXNpdG9yVG9rZW4sIGRlcGFydG1lbnRJZCkge1xuXHRcdGNvbnN0IGluZm8gPSB7XG5cdFx0XHRlbmFibGVkOiBudWxsLFxuXHRcdFx0dGl0bGU6IG51bGwsXG5cdFx0XHRjb2xvcjogbnVsbCxcblx0XHRcdHJlZ2lzdHJhdGlvbkZvcm06IG51bGwsXG5cdFx0XHRyb29tOiBudWxsLFxuXHRcdFx0dmlzaXRvcjogbnVsbCxcblx0XHRcdHRyaWdnZXJzOiBbXSxcblx0XHRcdGRlcGFydG1lbnRzOiBbXSxcblx0XHRcdGFsbG93U3dpdGNoaW5nRGVwYXJ0bWVudHM6IG51bGwsXG5cdFx0XHRvbmxpbmU6IHRydWUsXG5cdFx0XHRvZmZsaW5lQ29sb3I6IG51bGwsXG5cdFx0XHRvZmZsaW5lTWVzc2FnZTogbnVsbCxcblx0XHRcdG9mZmxpbmVTdWNjZXNzTWVzc2FnZTogbnVsbCxcblx0XHRcdG9mZmxpbmVVbmF2YWlsYWJsZU1lc3NhZ2U6IG51bGwsXG5cdFx0XHRkaXNwbGF5T2ZmbGluZUZvcm06IG51bGwsXG5cdFx0XHR2aWRlb0NhbGw6IG51bGwsXG5cdFx0XHRmaWxlVXBsb2FkOiBudWxsLFxuXHRcdFx0Y29udmVyc2F0aW9uRmluaXNoZWRNZXNzYWdlOiBudWxsLFxuXHRcdFx0bmFtZUZpZWxkUmVnaXN0cmF0aW9uRm9ybTogbnVsbCxcblx0XHRcdGVtYWlsRmllbGRSZWdpc3RyYXRpb25Gb3JtOiBudWxsLFxuXHRcdH07XG5cblx0XHRjb25zdCBvcHRpb25zID0ge1xuXHRcdFx0ZmllbGRzOiB7XG5cdFx0XHRcdG5hbWU6IDEsXG5cdFx0XHRcdHQ6IDEsXG5cdFx0XHRcdGNsOiAxLFxuXHRcdFx0XHR1OiAxLFxuXHRcdFx0XHR1c2VybmFtZXM6IDEsXG5cdFx0XHRcdHY6IDEsXG5cdFx0XHRcdHNlcnZlZEJ5OiAxLFxuXHRcdFx0XHRkZXBhcnRtZW50SWQ6IDEsXG5cdFx0XHR9LFxuXHRcdH07XG5cdFx0Y29uc3Qgcm9vbSA9IChkZXBhcnRtZW50SWQpID8gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9wZW5CeVZpc2l0b3JUb2tlbkFuZERlcGFydG1lbnRJZCh2aXNpdG9yVG9rZW4sIGRlcGFydG1lbnRJZCwgb3B0aW9ucykuZmV0Y2goKSA6IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPcGVuQnlWaXNpdG9yVG9rZW4odmlzaXRvclRva2VuLCBvcHRpb25zKS5mZXRjaCgpO1xuXHRcdGlmIChyb29tICYmIHJvb20ubGVuZ3RoID4gMCkge1xuXHRcdFx0aW5mby5yb29tID0gcm9vbVswXTtcblx0XHR9XG5cblx0XHRjb25zdCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih2aXNpdG9yVG9rZW4sIHtcblx0XHRcdGZpZWxkczoge1xuXHRcdFx0XHRuYW1lOiAxLFxuXHRcdFx0XHR1c2VybmFtZTogMSxcblx0XHRcdFx0dmlzaXRvckVtYWlsczogMSxcblx0XHRcdFx0ZGVwYXJ0bWVudDogMSxcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHRpZiAocm9vbSkge1xuXHRcdFx0aW5mby52aXNpdG9yID0gdmlzaXRvcjtcblx0XHR9XG5cblx0XHRjb25zdCBpbml0U2V0dGluZ3MgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LmdldEluaXRTZXR0aW5ncygpO1xuXG5cdFx0aW5mby50aXRsZSA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF90aXRsZTtcblx0XHRpbmZvLmNvbG9yID0gaW5pdFNldHRpbmdzLkxpdmVjaGF0X3RpdGxlX2NvbG9yO1xuXHRcdGluZm8uZW5hYmxlZCA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9lbmFibGVkO1xuXHRcdGluZm8ucmVnaXN0cmF0aW9uRm9ybSA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9yZWdpc3RyYXRpb25fZm9ybTtcblx0XHRpbmZvLm9mZmxpbmVUaXRsZSA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9vZmZsaW5lX3RpdGxlO1xuXHRcdGluZm8ub2ZmbGluZUNvbG9yID0gaW5pdFNldHRpbmdzLkxpdmVjaGF0X29mZmxpbmVfdGl0bGVfY29sb3I7XG5cdFx0aW5mby5vZmZsaW5lTWVzc2FnZSA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9vZmZsaW5lX21lc3NhZ2U7XG5cdFx0aW5mby5vZmZsaW5lU3VjY2Vzc01lc3NhZ2UgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfb2ZmbGluZV9zdWNjZXNzX21lc3NhZ2U7XG5cdFx0aW5mby5vZmZsaW5lVW5hdmFpbGFibGVNZXNzYWdlID0gaW5pdFNldHRpbmdzLkxpdmVjaGF0X29mZmxpbmVfZm9ybV91bmF2YWlsYWJsZTtcblx0XHRpbmZvLmRpc3BsYXlPZmZsaW5lRm9ybSA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9kaXNwbGF5X29mZmxpbmVfZm9ybTtcblx0XHRpbmZvLmxhbmd1YWdlID0gaW5pdFNldHRpbmdzLkxhbmd1YWdlO1xuXHRcdGluZm8udmlkZW9DYWxsID0gaW5pdFNldHRpbmdzLkxpdmVjaGF0X3ZpZGVvY2FsbF9lbmFibGVkID09PSB0cnVlICYmIGluaXRTZXR0aW5ncy5KaXRzaV9FbmFibGVkID09PSB0cnVlO1xuXHRcdGluZm8uZmlsZVVwbG9hZCA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9maWxldXBsb2FkX2VuYWJsZWQgJiYgaW5pdFNldHRpbmdzLkZpbGVVcGxvYWRfRW5hYmxlZDtcblx0XHRpbmZvLnRyYW5zY3JpcHQgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfZW5hYmxlX3RyYW5zY3JpcHQ7XG5cdFx0aW5mby50cmFuc2NyaXB0TWVzc2FnZSA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF90cmFuc2NyaXB0X21lc3NhZ2U7XG5cdFx0aW5mby5jb252ZXJzYXRpb25GaW5pc2hlZE1lc3NhZ2UgPSBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfY29udmVyc2F0aW9uX2ZpbmlzaGVkX21lc3NhZ2U7XG5cdFx0aW5mby5uYW1lRmllbGRSZWdpc3RyYXRpb25Gb3JtID0gaW5pdFNldHRpbmdzLkxpdmVjaGF0X25hbWVfZmllbGRfcmVnaXN0cmF0aW9uX2Zvcm07XG5cdFx0aW5mby5lbWFpbEZpZWxkUmVnaXN0cmF0aW9uRm9ybSA9IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9lbWFpbF9maWVsZF9yZWdpc3RyYXRpb25fZm9ybTtcblxuXHRcdGluZm8uYWdlbnREYXRhID0gcm9vbSAmJiByb29tWzBdICYmIHJvb21bMF0uc2VydmVkQnkgJiYgUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZ2V0QWdlbnRJbmZvKHJvb21bMF0uc2VydmVkQnkuX2lkKTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0VHJpZ2dlci5maW5kRW5hYmxlZCgpLmZvckVhY2goKHRyaWdnZXIpID0+IHtcblx0XHRcdGluZm8udHJpZ2dlcnMucHVzaChfLnBpY2sodHJpZ2dlciwgJ19pZCcsICdhY3Rpb25zJywgJ2NvbmRpdGlvbnMnLCAncnVuT25jZScpKTtcblx0XHR9KTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudC5maW5kRW5hYmxlZFdpdGhBZ2VudHMoKS5mb3JFYWNoKChkZXBhcnRtZW50KSA9PiB7XG5cdFx0XHRpbmZvLmRlcGFydG1lbnRzLnB1c2goZGVwYXJ0bWVudCk7XG5cdFx0fSk7XG5cdFx0aW5mby5hbGxvd1N3aXRjaGluZ0RlcGFydG1lbnRzID0gaW5pdFNldHRpbmdzLkxpdmVjaGF0X2FsbG93X3N3aXRjaGluZ19kZXBhcnRtZW50cztcblxuXHRcdGluZm8ub25saW5lID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9ubGluZUFnZW50cygpLmNvdW50KCkgPiAwO1xuXHRcdHJldHVybiBpbmZvO1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpnZXROZXh0QWdlbnQnKHsgdG9rZW4sIGRlcGFydG1lbnQgfSkge1xuXHRcdGNoZWNrKHRva2VuLCBTdHJpbmcpO1xuXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPcGVuQnlWaXNpdG9yVG9rZW4odG9rZW4pLmZldGNoKCk7XG5cblx0XHRpZiAocm9vbSAmJiByb29tLmxlbmd0aCA+IDApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAoIWRlcGFydG1lbnQpIHtcblx0XHRcdGNvbnN0IHJlcXVpcmVEZXBhcm1lbnQgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LmdldFJlcXVpcmVkRGVwYXJ0bWVudCgpO1xuXHRcdFx0aWYgKHJlcXVpcmVEZXBhcm1lbnQpIHtcblx0XHRcdFx0ZGVwYXJ0bWVudCA9IHJlcXVpcmVEZXBhcm1lbnQuX2lkO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNvbnN0IGFnZW50ID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXROZXh0QWdlbnQoZGVwYXJ0bWVudCk7XG5cdFx0aWYgKCFhZ2VudCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5nZXRBZ2VudEluZm8oYWdlbnQuYWdlbnRJZCk7XG5cdH0sXG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6bG9hZEhpc3RvcnknKHsgdG9rZW4sIHJpZCwgZW5kLCBsaW1pdCA9IDIwLCBscyB9KSB7XG5cdFx0Y29uc3QgdmlzaXRvciA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0VmlzaXRvckJ5VG9rZW4odG9rZW4sIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXG5cdFx0aWYgKCF2aXNpdG9yKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubG9hZE1lc3NhZ2VIaXN0b3J5KHsgdXNlcklkOiB2aXNpdG9yLl9pZCwgcmlkLCBlbmQsIGxpbWl0LCBscyB9KTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpsb2dpbkJ5VG9rZW4nKHRva2VuKSB7XG5cdFx0Y29uc3QgdmlzaXRvciA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0VmlzaXRvckJ5VG9rZW4odG9rZW4sIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXG5cdFx0aWYgKCF2aXNpdG9yKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdF9pZDogdmlzaXRvci5faWQsXG5cdFx0fTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6cGFnZVZpc2l0ZWQnKHRva2VuLCByb29tLCBwYWdlSW5mbykge1xuXHRcdFJvY2tldENoYXQuTGl2ZWNoYXQuc2F2ZVBhZ2VIaXN0b3J5KHRva2VuLCByb29tLCBwYWdlSW5mbyk7XG5cdH0sXG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6cmVnaXN0ZXJHdWVzdCcoeyB0b2tlbiwgbmFtZSwgZW1haWwsIGRlcGFydG1lbnQsIGN1c3RvbUZpZWxkcyB9ID0ge30pIHtcblx0XHRjb25zdCB1c2VySWQgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LnJlZ2lzdGVyR3Vlc3QuY2FsbCh0aGlzLCB7XG5cdFx0XHR0b2tlbixcblx0XHRcdG5hbWUsXG5cdFx0XHRlbWFpbCxcblx0XHRcdGRlcGFydG1lbnQsXG5cdFx0fSk7XG5cblx0XHQvLyB1cGRhdGUgdmlzaXRlZCBwYWdlIGhpc3RvcnkgdG8gbm90IGV4cGlyZVxuXHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmtlZXBIaXN0b3J5Rm9yVG9rZW4odG9rZW4pO1xuXG5cdFx0Y29uc3QgdmlzaXRvciA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0VmlzaXRvckJ5VG9rZW4odG9rZW4sIHtcblx0XHRcdGZpZWxkczoge1xuXHRcdFx0XHR0b2tlbjogMSxcblx0XHRcdFx0bmFtZTogMSxcblx0XHRcdFx0dXNlcm5hbWU6IDEsXG5cdFx0XHRcdHZpc2l0b3JFbWFpbHM6IDEsXG5cdFx0XHRcdGRlcGFydG1lbnQ6IDEsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0Ly8gSWYgaXQncyB1cGRhdGluZyBhbiBleGlzdGluZyB2aXNpdG9yLCBpdCBtdXN0IGFsc28gdXBkYXRlIHRoZSByb29tSW5mb1xuXHRcdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPcGVuQnlWaXNpdG9yVG9rZW4odG9rZW4pO1xuXHRcdGN1cnNvci5mb3JFYWNoKChyb29tKSA9PiB7XG5cdFx0XHRSb2NrZXRDaGF0LkxpdmVjaGF0LnNhdmVSb29tSW5mbyhyb29tLCB2aXNpdG9yKTtcblx0XHR9KTtcblxuXHRcdGlmIChjdXN0b21GaWVsZHMgJiYgY3VzdG9tRmllbGRzIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdGN1c3RvbUZpZWxkcy5mb3JFYWNoKChjdXN0b21GaWVsZCkgPT4ge1xuXHRcdFx0XHRpZiAodHlwZW9mIGN1c3RvbUZpZWxkICE9PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICghY3VzdG9tRmllbGQuc2NvcGUgfHwgY3VzdG9tRmllbGQuc2NvcGUgIT09ICdyb29tJykge1xuXHRcdFx0XHRcdGNvbnN0IHsga2V5LCB2YWx1ZSwgb3ZlcndyaXRlIH0gPSBjdXN0b21GaWVsZDtcblx0XHRcdFx0XHRMaXZlY2hhdFZpc2l0b3JzLnVwZGF0ZUxpdmVjaGF0RGF0YUJ5VG9rZW4odG9rZW4sIGtleSwgdmFsdWUsIG92ZXJ3cml0ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHR1c2VySWQsXG5cdFx0XHR2aXNpdG9yLFxuXHRcdH07XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnJlbW92ZUFnZW50Jyh1c2VybmFtZSkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVBZ2VudCcgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuTGl2ZWNoYXQucmVtb3ZlQWdlbnQodXNlcm5hbWUpO1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpyZW1vdmVDdXN0b21GaWVsZCcoX2lkKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnJlbW92ZUN1c3RvbUZpZWxkJyB9KTtcblx0XHR9XG5cblx0XHRjaGVjayhfaWQsIFN0cmluZyk7XG5cblx0XHRjb25zdCBjdXN0b21GaWVsZCA9IFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0Q3VzdG9tRmllbGQuZmluZE9uZUJ5SWQoX2lkLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KTtcblxuXHRcdGlmICghY3VzdG9tRmllbGQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtY3VzdG9tLWZpZWxkJywgJ0N1c3RvbSBmaWVsZCBub3QgZm91bmQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnJlbW92ZUN1c3RvbUZpZWxkJyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRDdXN0b21GaWVsZC5yZW1vdmVCeUlkKF9pZCk7XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnJlbW92ZURlcGFydG1lbnQnKF9pZCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVEZXBhcnRtZW50JyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZW1vdmVEZXBhcnRtZW50KF9pZCk7XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnJlbW92ZU1hbmFnZXInKHVzZXJuYW1lKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnJlbW92ZU1hbmFnZXInIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LnJlbW92ZU1hbmFnZXIodXNlcm5hbWUpO1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpyZW1vdmVUcmlnZ2VyJyh0cmlnZ2VySWQpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6cmVtb3ZlVHJpZ2dlcicgfSk7XG5cdFx0fVxuXG5cdFx0Y2hlY2sodHJpZ2dlcklkLCBTdHJpbmcpO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0VHJpZ2dlci5yZW1vdmVCeUlkKHRyaWdnZXJJZCk7XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnJlbW92ZVJvb20nKHJpZCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAncmVtb3ZlLWNsb3NlZC1saXZlY2hhdC1yb29tcycpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6cmVtb3ZlUm9vbScgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJpZCk7XG5cblx0XHRpZiAoIXJvb20pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2xpdmVjaGF0OnJlbW92ZVJvb20nLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKHJvb20udCAhPT0gJ2wnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci10aGlzLWlzLW5vdC1hLWxpdmVjaGF0LXJvb20nLCAnVGhpcyBpcyBub3QgYSBMaXZlY2hhdCByb29tJywge1xuXHRcdFx0XHRtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVSb29tJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmIChyb29tLm9wZW4pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXJvb20taXMtbm90LWNsb3NlZCcsICdSb29tIGlzIG5vdCBjbG9zZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2xpdmVjaGF0OnJlbW92ZVJvb20nLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMucmVtb3ZlQnlSb29tSWQocmlkKTtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnJlbW92ZUJ5Um9vbUlkKHJpZCk7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvb21zLnJlbW92ZUJ5SWQocmlkKTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2F2ZUFwcGVhcmFuY2UnKHNldHRpbmdzKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNhdmVBcHBlYXJhbmNlJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCB2YWxpZFNldHRpbmdzID0gW1xuXHRcdFx0J0xpdmVjaGF0X3RpdGxlJyxcblx0XHRcdCdMaXZlY2hhdF90aXRsZV9jb2xvcicsXG5cdFx0XHQnTGl2ZWNoYXRfc2hvd19hZ2VudF9lbWFpbCcsXG5cdFx0XHQnTGl2ZWNoYXRfZGlzcGxheV9vZmZsaW5lX2Zvcm0nLFxuXHRcdFx0J0xpdmVjaGF0X29mZmxpbmVfZm9ybV91bmF2YWlsYWJsZScsXG5cdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV9tZXNzYWdlJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX3N1Y2Nlc3NfbWVzc2FnZScsXG5cdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV90aXRsZScsXG5cdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV90aXRsZV9jb2xvcicsXG5cdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV9lbWFpbCcsXG5cdFx0XHQnTGl2ZWNoYXRfY29udmVyc2F0aW9uX2ZpbmlzaGVkX21lc3NhZ2UnLFxuXHRcdFx0J0xpdmVjaGF0X3JlZ2lzdHJhdGlvbl9mb3JtJyxcblx0XHRcdCdMaXZlY2hhdF9uYW1lX2ZpZWxkX3JlZ2lzdHJhdGlvbl9mb3JtJyxcblx0XHRcdCdMaXZlY2hhdF9lbWFpbF9maWVsZF9yZWdpc3RyYXRpb25fZm9ybScsXG5cdFx0XTtcblxuXHRcdGNvbnN0IHZhbGlkID0gc2V0dGluZ3MuZXZlcnkoKHNldHRpbmcpID0+IHZhbGlkU2V0dGluZ3MuaW5kZXhPZihzZXR0aW5nLl9pZCkgIT09IC0xKTtcblxuXHRcdGlmICghdmFsaWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtc2V0dGluZycpO1xuXHRcdH1cblxuXHRcdHNldHRpbmdzLmZvckVhY2goKHNldHRpbmcpID0+IHtcblx0XHRcdFJvY2tldENoYXQuc2V0dGluZ3MudXBkYXRlQnlJZChzZXR0aW5nLl9pZCwgc2V0dGluZy52YWx1ZSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm47XG5cdH0sXG59KTtcbiIsIi8qIGVzbGludCBuZXctY2FwOiBbMiwge1wiY2FwSXNOZXdFeGNlcHRpb25zXCI6IFtcIk1hdGNoLk9iamVjdEluY2x1ZGluZ1wiLCBcIk1hdGNoLk9wdGlvbmFsXCJdfV0gKi9cblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2F2ZUN1c3RvbUZpZWxkJyhfaWQsIGN1c3RvbUZpZWxkRGF0YSkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpzYXZlQ3VzdG9tRmllbGQnIH0pO1xuXHRcdH1cblxuXHRcdGlmIChfaWQpIHtcblx0XHRcdGNoZWNrKF9pZCwgU3RyaW5nKTtcblx0XHR9XG5cblx0XHRjaGVjayhjdXN0b21GaWVsZERhdGEsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7IGZpZWxkOiBTdHJpbmcsIGxhYmVsOiBTdHJpbmcsIHNjb3BlOiBTdHJpbmcsIHZpc2liaWxpdHk6IFN0cmluZyB9KSk7XG5cblx0XHRpZiAoIS9eWzAtOWEtekEtWi1fXSskLy50ZXN0KGN1c3RvbUZpZWxkRGF0YS5maWVsZCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtY3VzdG9tLWZpZWxkLW5tYWUnLCAnSW52YWxpZCBjdXN0b20gZmllbGQgbmFtZS4gVXNlIG9ubHkgbGV0dGVycywgbnVtYmVycywgaHlwaGVucyBhbmQgdW5kZXJzY29yZXMuJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpzYXZlQ3VzdG9tRmllbGQnIH0pO1xuXHRcdH1cblxuXHRcdGlmIChfaWQpIHtcblx0XHRcdGNvbnN0IGN1c3RvbUZpZWxkID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRDdXN0b21GaWVsZC5maW5kT25lQnlJZChfaWQpO1xuXHRcdFx0aWYgKCFjdXN0b21GaWVsZCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWN1c3RvbS1maWVsZCcsICdDdXN0b20gRmllbGQgTm90IGZvdW5kJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpzYXZlQ3VzdG9tRmllbGQnIH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdEN1c3RvbUZpZWxkLmNyZWF0ZU9yVXBkYXRlQ3VzdG9tRmllbGQoX2lkLCBjdXN0b21GaWVsZERhdGEuZmllbGQsIGN1c3RvbUZpZWxkRGF0YS5sYWJlbCwgY3VzdG9tRmllbGREYXRhLnNjb3BlLCBjdXN0b21GaWVsZERhdGEudmlzaWJpbGl0eSk7XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnNhdmVEZXBhcnRtZW50JyhfaWQsIGRlcGFydG1lbnREYXRhLCBkZXBhcnRtZW50QWdlbnRzKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNhdmVEZXBhcnRtZW50JyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5zYXZlRGVwYXJ0bWVudChfaWQsIGRlcGFydG1lbnREYXRhLCBkZXBhcnRtZW50QWdlbnRzKTtcblx0fSxcbn0pO1xuIiwiLyogZXNsaW50IG5ldy1jYXA6IFsyLCB7XCJjYXBJc05ld0V4Y2VwdGlvbnNcIjogW1wiTWF0Y2guT2JqZWN0SW5jbHVkaW5nXCIsIFwiTWF0Y2guT3B0aW9uYWxcIl19XSAqL1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzYXZlSW5mbycoZ3Vlc3REYXRhLCByb29tRGF0YSkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1sLXJvb20nKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNhdmVJbmZvJyB9KTtcblx0XHR9XG5cblx0XHRjaGVjayhndWVzdERhdGEsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHRfaWQ6IFN0cmluZyxcblx0XHRcdG5hbWU6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0XHRlbWFpbDogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdHBob25lOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuXHRcdH0pKTtcblxuXHRcdGNoZWNrKHJvb21EYXRhLCBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0X2lkOiBTdHJpbmcsXG5cdFx0XHR0b3BpYzogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdHRhZ3M6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0fSkpO1xuXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJvb21EYXRhLl9pZCwgeyBmaWVsZHM6IHsgdDogMSwgc2VydmVkQnk6IDEgfSB9KTtcblxuXHRcdGlmIChyb29tID09IG51bGwgfHwgcm9vbS50ICE9PSAnbCcpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNhdmVJbmZvJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoKCFyb29tLnNlcnZlZEJ5IHx8IHJvb20uc2VydmVkQnkuX2lkICE9PSBNZXRlb3IudXNlcklkKCkpICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAnc2F2ZS1vdGhlcnMtbGl2ZWNoYXQtcm9vbS1pbmZvJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpzYXZlSW5mbycgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgcmV0ID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5zYXZlR3Vlc3QoZ3Vlc3REYXRhKSAmJiBSb2NrZXRDaGF0LkxpdmVjaGF0LnNhdmVSb29tSW5mbyhyb29tRGF0YSwgZ3Vlc3REYXRhKTtcblxuXHRcdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5ydW4oJ2xpdmVjaGF0LnNhdmVJbmZvJywgUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocm9vbURhdGEuX2lkKSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gcmV0O1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnNhdmVJbnRlZ3JhdGlvbicodmFsdWVzKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNhdmVJbnRlZ3JhdGlvbicgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiB2YWx1ZXMuTGl2ZWNoYXRfd2ViaG9va1VybCAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFJvY2tldENoYXQuc2V0dGluZ3MudXBkYXRlQnlJZCgnTGl2ZWNoYXRfd2ViaG9va1VybCcsIHMudHJpbSh2YWx1ZXMuTGl2ZWNoYXRfd2ViaG9va1VybCkpO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgdmFsdWVzLkxpdmVjaGF0X3NlY3JldF90b2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFJvY2tldENoYXQuc2V0dGluZ3MudXBkYXRlQnlJZCgnTGl2ZWNoYXRfc2VjcmV0X3Rva2VuJywgcy50cmltKHZhbHVlcy5MaXZlY2hhdF9zZWNyZXRfdG9rZW4pKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIHZhbHVlcy5MaXZlY2hhdF93ZWJob29rX29uX2Nsb3NlICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy51cGRhdGVCeUlkKCdMaXZlY2hhdF93ZWJob29rX29uX2Nsb3NlJywgISF2YWx1ZXMuTGl2ZWNoYXRfd2ViaG9va19vbl9jbG9zZSk7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiB2YWx1ZXMuTGl2ZWNoYXRfd2ViaG9va19vbl9vZmZsaW5lX21zZyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFJvY2tldENoYXQuc2V0dGluZ3MudXBkYXRlQnlJZCgnTGl2ZWNoYXRfd2ViaG9va19vbl9vZmZsaW5lX21zZycsICEhdmFsdWVzLkxpdmVjaGF0X3dlYmhvb2tfb25fb2ZmbGluZV9tc2cpO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgdmFsdWVzLkxpdmVjaGF0X3dlYmhvb2tfb25fdmlzaXRvcl9tZXNzYWdlICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy51cGRhdGVCeUlkKCdMaXZlY2hhdF93ZWJob29rX29uX3Zpc2l0b3JfbWVzc2FnZScsICEhdmFsdWVzLkxpdmVjaGF0X3dlYmhvb2tfb25fdmlzaXRvcl9tZXNzYWdlKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIHZhbHVlcy5MaXZlY2hhdF93ZWJob29rX29uX2FnZW50X21lc3NhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLnVwZGF0ZUJ5SWQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fYWdlbnRfbWVzc2FnZScsICEhdmFsdWVzLkxpdmVjaGF0X3dlYmhvb2tfb25fYWdlbnRfbWVzc2FnZSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuO1xuXHR9LFxufSk7XG4iLCIvKiBlc2xpbnQgbmV3LWNhcDogWzIsIHtcImNhcElzTmV3RXhjZXB0aW9uc1wiOiBbXCJNYXRjaC5PYmplY3RJbmNsdWRpbmdcIl19XSAqL1xuaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnNhdmVTdXJ2ZXlGZWVkYmFjaycodmlzaXRvclRva2VuLCB2aXNpdG9yUm9vbSwgZm9ybURhdGEpIHtcblx0XHRjaGVjayh2aXNpdG9yVG9rZW4sIFN0cmluZyk7XG5cdFx0Y2hlY2sodmlzaXRvclJvb20sIFN0cmluZyk7XG5cdFx0Y2hlY2soZm9ybURhdGEsIFtNYXRjaC5PYmplY3RJbmNsdWRpbmcoeyBuYW1lOiBTdHJpbmcsIHZhbHVlOiBTdHJpbmcgfSldKTtcblxuXHRcdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHZpc2l0b3JUb2tlbik7XG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHZpc2l0b3JSb29tKTtcblxuXHRcdGlmICh2aXNpdG9yICE9PSB1bmRlZmluZWQgJiYgcm9vbSAhPT0gdW5kZWZpbmVkICYmIHJvb20udiAhPT0gdW5kZWZpbmVkICYmIHJvb20udi50b2tlbiA9PT0gdmlzaXRvci50b2tlbikge1xuXHRcdFx0Y29uc3QgdXBkYXRlRGF0YSA9IHt9O1xuXHRcdFx0Zm9yIChjb25zdCBpdGVtIG9mIGZvcm1EYXRhKSB7XG5cdFx0XHRcdGlmIChfLmNvbnRhaW5zKFsnc2F0aXNmYWN0aW9uJywgJ2FnZW50S25vd2xlZGdlJywgJ2FnZW50UmVzcG9zaXZlbmVzcycsICdhZ2VudEZyaWVuZGxpbmVzcyddLCBpdGVtLm5hbWUpICYmIF8uY29udGFpbnMoWycxJywgJzInLCAnMycsICc0JywgJzUnXSwgaXRlbS52YWx1ZSkpIHtcblx0XHRcdFx0XHR1cGRhdGVEYXRhW2l0ZW0ubmFtZV0gPSBpdGVtLnZhbHVlO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGl0ZW0ubmFtZSA9PT0gJ2FkZGl0aW9uYWxGZWVkYmFjaycpIHtcblx0XHRcdFx0XHR1cGRhdGVEYXRhW2l0ZW0ubmFtZV0gPSBpdGVtLnZhbHVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoIV8uaXNFbXB0eSh1cGRhdGVEYXRhKSkge1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMudXBkYXRlU3VydmV5RmVlZGJhY2tCeUlkKHJvb20uX2lkLCB1cGRhdGVEYXRhKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnNhdmVUcmlnZ2VyJyh0cmlnZ2VyKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNhdmVUcmlnZ2VyJyB9KTtcblx0XHR9XG5cblx0XHRjaGVjayh0cmlnZ2VyLCB7XG5cdFx0XHRfaWQ6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRuYW1lOiBTdHJpbmcsXG5cdFx0XHRkZXNjcmlwdGlvbjogU3RyaW5nLFxuXHRcdFx0ZW5hYmxlZDogQm9vbGVhbixcblx0XHRcdHJ1bk9uY2U6IEJvb2xlYW4sXG5cdFx0XHRjb25kaXRpb25zOiBBcnJheSxcblx0XHRcdGFjdGlvbnM6IEFycmF5LFxuXHRcdH0pO1xuXG5cdFx0aWYgKHRyaWdnZXIuX2lkKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRUcmlnZ2VyLnVwZGF0ZUJ5SWQodHJpZ2dlci5faWQsIHRyaWdnZXIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRUcmlnZ2VyLmluc2VydCh0cmlnZ2VyKTtcblx0XHR9XG5cdH0sXG59KTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzZWFyY2hBZ2VudCcodXNlcm5hbWUpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2VhcmNoQWdlbnQnIH0pO1xuXHRcdH1cblxuXHRcdGlmICghdXNlcm5hbWUgfHwgIV8uaXNTdHJpbmcodXNlcm5hbWUpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWFyZ3VtZW50cycsICdJbnZhbGlkIGFyZ3VtZW50cycsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6c2VhcmNoQWdlbnQnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlVc2VybmFtZSh1c2VybmFtZSwgeyBmaWVsZHM6IHsgX2lkOiAxLCB1c2VybmFtZTogMSB9IH0pO1xuXG5cdFx0aWYgKCF1c2VyKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpzZWFyY2hBZ2VudCcgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHVzZXI7XG5cdH0sXG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRzZW5kTWVzc2FnZUxpdmVjaGF0KHsgdG9rZW4sIF9pZCwgcmlkLCBtc2csIGF0dGFjaG1lbnRzIH0sIGFnZW50KSB7XG5cdFx0Y2hlY2sodG9rZW4sIFN0cmluZyk7XG5cdFx0Y2hlY2soX2lkLCBTdHJpbmcpO1xuXHRcdGNoZWNrKHJpZCwgU3RyaW5nKTtcblx0XHRjaGVjayhtc2csIFN0cmluZyk7XG5cblx0XHRjaGVjayhhZ2VudCwgTWF0Y2guTWF5YmUoe1xuXHRcdFx0YWdlbnRJZDogU3RyaW5nLFxuXHRcdFx0dXNlcm5hbWU6IFN0cmluZyxcblx0XHR9KSk7XG5cblx0XHRjb25zdCBndWVzdCA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0VmlzaXRvckJ5VG9rZW4odG9rZW4sIHtcblx0XHRcdGZpZWxkczoge1xuXHRcdFx0XHRuYW1lOiAxLFxuXHRcdFx0XHR1c2VybmFtZTogMSxcblx0XHRcdFx0ZGVwYXJ0bWVudDogMSxcblx0XHRcdFx0dG9rZW46IDEsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0aWYgKCFndWVzdCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC10b2tlbicpO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LnNlbmRNZXNzYWdlKHtcblx0XHRcdGd1ZXN0LFxuXHRcdFx0bWVzc2FnZToge1xuXHRcdFx0XHRfaWQsXG5cdFx0XHRcdHJpZCxcblx0XHRcdFx0bXNnLFxuXHRcdFx0XHR0b2tlbixcblx0XHRcdFx0YXR0YWNobWVudHMsXG5cdFx0XHR9LFxuXHRcdFx0YWdlbnQsXG5cdFx0fSk7XG5cdH0sXG59KTtcbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRhc3luYyAnc2VuZEZpbGVMaXZlY2hhdE1lc3NhZ2UnKHJvb21JZCwgdmlzaXRvclRva2VuLCBmaWxlLCBtc2dEYXRhID0ge30pIHtcblx0XHRjb25zdCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih2aXNpdG9yVG9rZW4pO1xuXG5cdFx0aWYgKCF2aXNpdG9yKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVPcGVuQnlSb29tSWRBbmRWaXNpdG9yVG9rZW4ocm9vbUlkLCB2aXNpdG9yVG9rZW4pO1xuXG5cdFx0aWYgKCFyb29tKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y2hlY2sobXNnRGF0YSwge1xuXHRcdFx0YXZhdGFyOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuXHRcdFx0ZW1vamk6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0XHRhbGlhczogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdGdyb3VwYWJsZTogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbiksXG5cdFx0XHRtc2c6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0fSk7XG5cblx0XHRjb25zdCBmaWxlVXJsID0gYC9maWxlLXVwbG9hZC8keyBmaWxlLl9pZCB9LyR7IGVuY29kZVVSSShmaWxlLm5hbWUpIH1gO1xuXG5cdFx0Y29uc3QgYXR0YWNobWVudCA9IHtcblx0XHRcdHRpdGxlOiBmaWxlLm5hbWUsXG5cdFx0XHR0eXBlOiAnZmlsZScsXG5cdFx0XHRkZXNjcmlwdGlvbjogZmlsZS5kZXNjcmlwdGlvbixcblx0XHRcdHRpdGxlX2xpbms6IGZpbGVVcmwsXG5cdFx0XHR0aXRsZV9saW5rX2Rvd25sb2FkOiB0cnVlLFxuXHRcdH07XG5cblx0XHRpZiAoL15pbWFnZVxcLy4rLy50ZXN0KGZpbGUudHlwZSkpIHtcblx0XHRcdGF0dGFjaG1lbnQuaW1hZ2VfdXJsID0gZmlsZVVybDtcblx0XHRcdGF0dGFjaG1lbnQuaW1hZ2VfdHlwZSA9IGZpbGUudHlwZTtcblx0XHRcdGF0dGFjaG1lbnQuaW1hZ2Vfc2l6ZSA9IGZpbGUuc2l6ZTtcblx0XHRcdGlmIChmaWxlLmlkZW50aWZ5ICYmIGZpbGUuaWRlbnRpZnkuc2l6ZSkge1xuXHRcdFx0XHRhdHRhY2htZW50LmltYWdlX2RpbWVuc2lvbnMgPSBmaWxlLmlkZW50aWZ5LnNpemU7XG5cdFx0XHR9XG5cdFx0XHRhdHRhY2htZW50LmltYWdlX3ByZXZpZXcgPSBhd2FpdCBGaWxlVXBsb2FkLnJlc2l6ZUltYWdlUHJldmlldyhmaWxlKTtcblx0XHR9IGVsc2UgaWYgKC9eYXVkaW9cXC8uKy8udGVzdChmaWxlLnR5cGUpKSB7XG5cdFx0XHRhdHRhY2htZW50LmF1ZGlvX3VybCA9IGZpbGVVcmw7XG5cdFx0XHRhdHRhY2htZW50LmF1ZGlvX3R5cGUgPSBmaWxlLnR5cGU7XG5cdFx0XHRhdHRhY2htZW50LmF1ZGlvX3NpemUgPSBmaWxlLnNpemU7XG5cdFx0fSBlbHNlIGlmICgvXnZpZGVvXFwvLisvLnRlc3QoZmlsZS50eXBlKSkge1xuXHRcdFx0YXR0YWNobWVudC52aWRlb191cmwgPSBmaWxlVXJsO1xuXHRcdFx0YXR0YWNobWVudC52aWRlb190eXBlID0gZmlsZS50eXBlO1xuXHRcdFx0YXR0YWNobWVudC52aWRlb19zaXplID0gZmlsZS5zaXplO1xuXHRcdH1cblxuXHRcdGNvbnN0IG1zZyA9IE9iamVjdC5hc3NpZ24oe1xuXHRcdFx0X2lkOiBSYW5kb20uaWQoKSxcblx0XHRcdHJpZDogcm9vbUlkLFxuXHRcdFx0dHM6IG5ldyBEYXRlKCksXG5cdFx0XHRtc2c6ICcnLFxuXHRcdFx0ZmlsZToge1xuXHRcdFx0XHRfaWQ6IGZpbGUuX2lkLFxuXHRcdFx0XHRuYW1lOiBmaWxlLm5hbWUsXG5cdFx0XHRcdHR5cGU6IGZpbGUudHlwZSxcblx0XHRcdH0sXG5cdFx0XHRncm91cGFibGU6IGZhbHNlLFxuXHRcdFx0YXR0YWNobWVudHM6IFthdHRhY2htZW50XSxcblx0XHRcdHRva2VuOiB2aXNpdG9yVG9rZW4sXG5cdFx0fSwgbXNnRGF0YSk7XG5cblx0XHRyZXR1cm4gTWV0ZW9yLmNhbGwoJ3NlbmRNZXNzYWdlTGl2ZWNoYXQnLCBtc2cpO1xuXHR9LFxufSk7XG4iLCIvKiBnbG9iYWxzIEREUFJhdGVMaW1pdGVyICovXG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnNlbmRPZmZsaW5lTWVzc2FnZScoZGF0YSkge1xuXHRcdGNoZWNrKGRhdGEsIHtcblx0XHRcdG5hbWU6IFN0cmluZyxcblx0XHRcdGVtYWlsOiBTdHJpbmcsXG5cdFx0XHRtZXNzYWdlOiBTdHJpbmcsXG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5zZW5kT2ZmbGluZU1lc3NhZ2UoZGF0YSk7XG5cdH0sXG59KTtcblxuRERQUmF0ZUxpbWl0ZXIuYWRkUnVsZSh7XG5cdHR5cGU6ICdtZXRob2QnLFxuXHRuYW1lOiAnbGl2ZWNoYXQ6c2VuZE9mZmxpbmVNZXNzYWdlJyxcblx0Y29ubmVjdGlvbklkKCkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxufSwgMSwgNTAwMCk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnNldEN1c3RvbUZpZWxkJyh0b2tlbiwga2V5LCB2YWx1ZSwgb3ZlcndyaXRlID0gdHJ1ZSkge1xuXHRcdGNvbnN0IGN1c3RvbUZpZWxkID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRDdXN0b21GaWVsZC5maW5kT25lQnlJZChrZXkpO1xuXHRcdGlmIChjdXN0b21GaWVsZCkge1xuXHRcdFx0aWYgKGN1c3RvbUZpZWxkLnNjb3BlID09PSAncm9vbScpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZUxpdmVjaGF0RGF0YUJ5VG9rZW4odG9rZW4sIGtleSwgdmFsdWUsIG92ZXJ3cml0ZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBTYXZlIGluIHVzZXJcblx0XHRcdFx0cmV0dXJuIExpdmVjaGF0VmlzaXRvcnMudXBkYXRlTGl2ZWNoYXREYXRhQnlUb2tlbih0b2tlbiwga2V5LCB2YWx1ZSwgb3ZlcndyaXRlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzZXREZXBhcnRtZW50Rm9yVmlzaXRvcicoeyByb29tSWQsIHZpc2l0b3JUb2tlbiwgZGVwYXJ0bWVudElkIH0gPSB7fSkge1xuXHRcdGNoZWNrKHJvb21JZCwgU3RyaW5nKTtcblx0XHRjaGVjayh2aXNpdG9yVG9rZW4sIFN0cmluZyk7XG5cdFx0Y2hlY2soZGVwYXJ0bWVudElkLCBTdHJpbmcpO1xuXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJvb21JZCk7XG5cdFx0Y29uc3QgdmlzaXRvciA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0VmlzaXRvckJ5VG9rZW4odmlzaXRvclRva2VuKTtcblxuXHRcdGlmICghcm9vbSB8fCByb29tLnQgIT09ICdsJyB8fCAhcm9vbS52IHx8IHJvb20udi50b2tlbiAhPT0gdmlzaXRvci50b2tlbikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScpO1xuXHRcdH1cblxuXHRcdC8vIHVwZGF0ZSB2aXNpdGVkIHBhZ2UgaGlzdG9yeSB0byBub3QgZXhwaXJlXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMua2VlcEhpc3RvcnlGb3JUb2tlbih2aXNpdG9yVG9rZW4pO1xuXG5cdFx0Y29uc3QgdHJhbnNmZXJEYXRhID0ge1xuXHRcdFx0cm9vbUlkLFxuXHRcdFx0ZGVwYXJ0bWVudElkLFxuXHRcdH07XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC50cmFuc2Zlcihyb29tLCB2aXNpdG9yLCB0cmFuc2ZlckRhdGEpO1xuXHR9LFxufSk7XG4iLCIvKiBlc2xpbnQgbmV3LWNhcDogWzIsIHtcImNhcElzTmV3RXhjZXB0aW9uc1wiOiBbXCJNRDVcIl19XSAqL1xuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c3RhcnRWaWRlb0NhbGwnKHJvb21JZCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6Y2xvc2VCeVZpc2l0b3InIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGd1ZXN0ID0gTWV0ZW9yLnVzZXIoKTtcblxuXHRcdGNvbnN0IG1lc3NhZ2UgPSB7XG5cdFx0XHRfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0cmlkOiByb29tSWQgfHwgUmFuZG9tLmlkKCksXG5cdFx0XHRtc2c6ICcnLFxuXHRcdFx0dHM6IG5ldyBEYXRlKCksXG5cdFx0fTtcblxuXHRcdGNvbnN0IHsgcm9vbSB9ID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXRSb29tKGd1ZXN0LCBtZXNzYWdlLCB7IGppdHNpVGltZW91dDogbmV3IERhdGUoRGF0ZS5ub3coKSArIDM2MDAgKiAxMDAwKSB9KTtcblx0XHRtZXNzYWdlLnJpZCA9IHJvb20uX2lkO1xuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlcignbGl2ZWNoYXRfdmlkZW9fY2FsbCcsIHJvb20uX2lkLCAnJywgZ3Vlc3QsIHtcblx0XHRcdGFjdGlvbkxpbmtzOiBbXG5cdFx0XHRcdHsgaWNvbjogJ2ljb24tdmlkZW9jYW0nLCBpMThuTGFiZWw6ICdBY2NlcHQnLCBtZXRob2RfaWQ6ICdjcmVhdGVMaXZlY2hhdENhbGwnLCBwYXJhbXM6ICcnIH0sXG5cdFx0XHRcdHsgaWNvbjogJ2ljb24tY2FuY2VsJywgaTE4bkxhYmVsOiAnRGVjbGluZScsIG1ldGhvZF9pZDogJ2RlbnlMaXZlY2hhdENhbGwnLCBwYXJhbXM6ICcnIH0sXG5cdFx0XHRdLFxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJvb21JZDogcm9vbS5faWQsXG5cdFx0XHRkb21haW46IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdKaXRzaV9Eb21haW4nKSxcblx0XHRcdGppdHNpUm9vbTogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ppdHNpX1VSTF9Sb29tX1ByZWZpeCcpICsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ3VuaXF1ZUlEJykgKyByb29tSWQsXG5cdFx0fTtcblx0fSxcbn0pO1xuXG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2xpdmVjaGF0OnN0YXJ0RmlsZVVwbG9hZFJvb20nKHJvb21JZCwgdG9rZW4pIHtcblx0XHRjb25zdCBndWVzdCA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0VmlzaXRvckJ5VG9rZW4odG9rZW4pO1xuXG5cdFx0Y29uc3QgbWVzc2FnZSA9IHtcblx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRyaWQ6IHJvb21JZCB8fCBSYW5kb20uaWQoKSxcblx0XHRcdG1zZzogJycsXG5cdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdHRva2VuOiBndWVzdC50b2tlbixcblx0XHR9O1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0Um9vbShndWVzdCwgbWVzc2FnZSk7XG5cdH0sXG59KTtcbiIsIi8qIGVzbGludCBuZXctY2FwOiBbMiwge1wiY2FwSXNOZXdFeGNlcHRpb25zXCI6IFtcIk1hdGNoLk9wdGlvbmFsXCJdfV0gKi9cblxuaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDp0cmFuc2ZlcicodHJhbnNmZXJEYXRhKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICd2aWV3LWwtcm9vbScpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdOb3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6dHJhbnNmZXInIH0pO1xuXHRcdH1cblxuXHRcdGNoZWNrKHRyYW5zZmVyRGF0YSwge1xuXHRcdFx0cm9vbUlkOiBTdHJpbmcsXG5cdFx0XHR1c2VySWQ6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0XHRkZXBhcnRtZW50SWQ6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0fSk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQodHJhbnNmZXJEYXRhLnJvb21JZCk7XG5cblx0XHRjb25zdCBndWVzdCA9IExpdmVjaGF0VmlzaXRvcnMuZmluZE9uZUJ5SWQocm9vbS52Ll9pZCk7XG5cblx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChyb29tLl9pZCwgTWV0ZW9yLnVzZXJJZCgpLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KTtcblx0XHRpZiAoIXN1YnNjcmlwdGlvbiAmJiAhUm9ja2V0Q2hhdC5hdXRoei5oYXNSb2xlKE1ldGVvci51c2VySWQoKSwgJ2xpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnRyYW5zZmVyJyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC50cmFuc2Zlcihyb29tLCBndWVzdCwgdHJhbnNmZXJEYXRhKTtcblx0fSxcbn0pO1xuIiwiLyogZ2xvYmFscyBIVFRQICovXG5jb25zdCBwb3N0Q2F0Y2hFcnJvciA9IE1ldGVvci53cmFwQXN5bmMoZnVuY3Rpb24odXJsLCBvcHRpb25zLCByZXNvbHZlKSB7XG5cdEhUVFAucG9zdCh1cmwsIG9wdGlvbnMsIGZ1bmN0aW9uKGVyciwgcmVzKSB7XG5cdFx0aWYgKGVycikge1xuXHRcdFx0cmVzb2x2ZShudWxsLCBlcnIucmVzcG9uc2UpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXNvbHZlKG51bGwsIHJlcyk7XG5cdFx0fVxuXHR9KTtcbn0pO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDp3ZWJob29rVGVzdCcoKSB7XG5cdFx0dGhpcy51bmJsb2NrKCk7XG5cblx0XHRjb25zdCBzYW1wbGVEYXRhID0ge1xuXHRcdFx0dHlwZTogJ0xpdmVjaGF0U2Vzc2lvbicsXG5cdFx0XHRfaWQ6ICdmYXNkNmY1YTRzZDZmOGE0c2RmJyxcblx0XHRcdGxhYmVsOiAndGl0bGUnLFxuXHRcdFx0dG9waWM6ICdhc2lvZG9qZicsXG5cdFx0XHRjcmVhdGVkQXQ6IG5ldyBEYXRlKCksXG5cdFx0XHRsYXN0TWVzc2FnZUF0OiBuZXcgRGF0ZSgpLFxuXHRcdFx0dGFnczogW1xuXHRcdFx0XHQndGFnMScsXG5cdFx0XHRcdCd0YWcyJyxcblx0XHRcdFx0J3RhZzMnLFxuXHRcdFx0XSxcblx0XHRcdGN1c3RvbUZpZWxkczoge1xuXHRcdFx0XHRwcm9kdWN0SWQ6ICcxMjM0NTYnLFxuXHRcdFx0fSxcblx0XHRcdHZpc2l0b3I6IHtcblx0XHRcdFx0X2lkOiAnJyxcblx0XHRcdFx0bmFtZTogJ3Zpc2l0b3IgbmFtZScsXG5cdFx0XHRcdHVzZXJuYW1lOiAndmlzaXRvci11c2VybmFtZScsXG5cdFx0XHRcdGRlcGFydG1lbnQ6ICdkZXBhcnRtZW50Jyxcblx0XHRcdFx0ZW1haWw6ICdlbWFpbEBhZGRyZXNzLmNvbScsXG5cdFx0XHRcdHBob25lOiAnMTkyODczMTkyODczJyxcblx0XHRcdFx0aXA6ICcxMjMuNDU2LjcuODknLFxuXHRcdFx0XHRicm93c2VyOiAnQ2hyb21lJyxcblx0XHRcdFx0b3M6ICdMaW51eCcsXG5cdFx0XHRcdGN1c3RvbUZpZWxkczoge1xuXHRcdFx0XHRcdGN1c3RvbWVySWQ6ICcxMjM0NTYnLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdGFnZW50OiB7XG5cdFx0XHRcdF9pZDogJ2FzZGY4OWFzNmRmOCcsXG5cdFx0XHRcdHVzZXJuYW1lOiAnYWdlbnQudXNlcm5hbWUnLFxuXHRcdFx0XHRuYW1lOiAnQWdlbnQgTmFtZScsXG5cdFx0XHRcdGVtYWlsOiAnYWdlbnRAZW1haWwuY29tJyxcblx0XHRcdH0sXG5cdFx0XHRtZXNzYWdlczogW3tcblx0XHRcdFx0dXNlcm5hbWU6ICd2aXNpdG9yLXVzZXJuYW1lJyxcblx0XHRcdFx0bXNnOiAnbWVzc2FnZSBjb250ZW50Jyxcblx0XHRcdFx0dHM6IG5ldyBEYXRlKCksXG5cdFx0XHR9LCB7XG5cdFx0XHRcdHVzZXJuYW1lOiAnYWdlbnQudXNlcm5hbWUnLFxuXHRcdFx0XHRhZ2VudElkOiAnYXNkZjg5YXM2ZGY4Jyxcblx0XHRcdFx0bXNnOiAnbWVzc2FnZSBjb250ZW50IGZyb20gYWdlbnQnLFxuXHRcdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdH1dLFxuXHRcdH07XG5cblx0XHRjb25zdCBvcHRpb25zID0ge1xuXHRcdFx0aGVhZGVyczoge1xuXHRcdFx0XHQnWC1Sb2NrZXRDaGF0LUxpdmVjaGF0LVRva2VuJzogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X3NlY3JldF90b2tlbicpLFxuXHRcdFx0fSxcblx0XHRcdGRhdGE6IHNhbXBsZURhdGEsXG5cdFx0fTtcblxuXHRcdGNvbnN0IHJlc3BvbnNlID0gcG9zdENhdGNoRXJyb3IoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X3dlYmhvb2tVcmwnKSwgb3B0aW9ucyk7XG5cblx0XHRjb25zb2xlLmxvZygncmVzcG9uc2UgLT4nLCByZXNwb25zZSk7XG5cblx0XHRpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSAmJiByZXNwb25zZS5zdGF0dXNDb2RlID09PSAyMDApIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXdlYmhvb2stcmVzcG9uc2UnKTtcblx0XHR9XG5cdH0sXG59KTtcblxuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6dGFrZUlucXVpcnknKGlucXVpcnlJZCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1sLXJvb20nKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnRha2VJbnF1aXJ5JyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCBpbnF1aXJ5ID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRJbnF1aXJ5LmZpbmRPbmVCeUlkKGlucXVpcnlJZCk7XG5cblx0XHRpZiAoIWlucXVpcnkgfHwgaW5xdWlyeS5zdGF0dXMgPT09ICd0YWtlbicpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ0lucXVpcnkgYWxyZWFkeSB0YWtlbicsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6dGFrZUlucXVpcnknIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChNZXRlb3IudXNlcklkKCkpO1xuXG5cdFx0Y29uc3QgYWdlbnQgPSB7XG5cdFx0XHRhZ2VudElkOiB1c2VyLl9pZCxcblx0XHRcdHVzZXJuYW1lOiB1c2VyLnVzZXJuYW1lLFxuXHRcdFx0dHM6IG5ldyBEYXRlKCksXG5cdFx0fTtcblxuXHRcdC8vIGFkZCBzdWJzY3JpcHRpb25cblx0XHRjb25zdCBzdWJzY3JpcHRpb25EYXRhID0ge1xuXHRcdFx0cmlkOiBpbnF1aXJ5LnJpZCxcblx0XHRcdG5hbWU6IGlucXVpcnkubmFtZSxcblx0XHRcdGFsZXJ0OiB0cnVlLFxuXHRcdFx0b3BlbjogdHJ1ZSxcblx0XHRcdHVucmVhZDogMSxcblx0XHRcdHVzZXJNZW50aW9uczogMSxcblx0XHRcdGdyb3VwTWVudGlvbnM6IDAsXG5cdFx0XHR1OiB7XG5cdFx0XHRcdF9pZDogYWdlbnQuYWdlbnRJZCxcblx0XHRcdFx0dXNlcm5hbWU6IGFnZW50LnVzZXJuYW1lLFxuXHRcdFx0fSxcblx0XHRcdHQ6ICdsJyxcblx0XHRcdGRlc2t0b3BOb3RpZmljYXRpb25zOiAnYWxsJyxcblx0XHRcdG1vYmlsZVB1c2hOb3RpZmljYXRpb25zOiAnYWxsJyxcblx0XHRcdGVtYWlsTm90aWZpY2F0aW9uczogJ2FsbCcsXG5cdFx0fTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuaW5zZXJ0KHN1YnNjcmlwdGlvbkRhdGEpO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmluY1VzZXJzQ291bnRCeUlkKGlucXVpcnkucmlkKTtcblxuXHRcdC8vIHVwZGF0ZSByb29tXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGlucXVpcnkucmlkKTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmNoYW5nZUFnZW50QnlSb29tSWQoaW5xdWlyeS5yaWQsIGFnZW50KTtcblxuXHRcdHJvb20uc2VydmVkQnkgPSB7XG5cdFx0XHRfaWQ6IGFnZW50LmFnZW50SWQsXG5cdFx0XHR1c2VybmFtZTogYWdlbnQudXNlcm5hbWUsXG5cdFx0XHR0czogYWdlbnQudHMsXG5cdFx0fTtcblxuXHRcdC8vIG1hcmsgaW5xdWlyeSBhcyB0YWtlblxuXHRcdFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0SW5xdWlyeS50YWtlSW5xdWlyeShpbnF1aXJ5Ll9pZCk7XG5cblx0XHQvLyByZW1vdmUgc2VuZGluZyBtZXNzYWdlIGZyb20gZ3Vlc3Qgd2lkZ2V0XG5cdFx0Ly8gZG9udCBjaGVjayBpZiBzZXR0aW5nIGlzIHRydWUsIGJlY2F1c2UgaWYgc2V0dGluZ3dhcyBzd2l0Y2hlZCBvZmYgaW5iZXR3ZWVuICBndWVzdCBlbnRlcmVkIHBvb2wsXG5cdFx0Ly8gYW5kIGlucXVpcnkgYmVpbmcgdGFrZW4sIG1lc3NhZ2Ugd291bGQgbm90IGJlIHN3aXRjaGVkIG9mZi5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVDb21tYW5kV2l0aFJvb21JZEFuZFVzZXIoJ2Nvbm5lY3RlZCcsIHJvb20uX2lkLCB1c2VyKTtcblxuXHRcdFJvY2tldENoYXQuTGl2ZWNoYXQuc3RyZWFtLmVtaXQocm9vbS5faWQsIHtcblx0XHRcdHR5cGU6ICdhZ2VudERhdGEnLFxuXHRcdFx0ZGF0YTogUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZ2V0QWdlbnRJbmZvKGFnZW50LmFnZW50SWQpLFxuXHRcdH0pO1xuXG5cdFx0Ly8gcmV0dXJuIGlucXVpcnkgKGZvciByZWRpcmVjdGluZyBhZ2VudCB0byB0aGUgcm9vbSByb3V0ZSlcblx0XHRyZXR1cm4gaW5xdWlyeTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6cmV0dXJuQXNJbnF1aXJ5JyhyaWQsIGRlcGFydG1lbnRJZCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1sLXJvb20nKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnTm90IGFsbG93ZWQnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNhdmVEZXBhcnRtZW50JyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZXR1cm5Sb29tQXNJbnF1aXJ5KHJpZCwgZGVwYXJ0bWVudElkKTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnbGl2ZWNoYXQ6c2F2ZU9mZmljZUhvdXJzJyhkYXksIHN0YXJ0LCBmaW5pc2gsIG9wZW4pIHtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdE9mZmljZUhvdXIudXBkYXRlSG91cnMoZGF5LCBzdGFydCwgZmluaXNoLCBvcGVuKTtcblx0fSxcbn0pO1xuIiwiLyogZ2xvYmFscyBERFBSYXRlTGltaXRlciAqL1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdsaXZlY2hhdDpzZW5kVHJhbnNjcmlwdCcodG9rZW4sIHJpZCwgZW1haWwpIHtcblx0XHRjaGVjayhyaWQsIFN0cmluZyk7XG5cdFx0Y2hlY2soZW1haWwsIFN0cmluZyk7XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5zZW5kVHJhbnNjcmlwdCh7IHRva2VuLCByaWQsIGVtYWlsIH0pO1xuXHR9LFxufSk7XG5cbkREUFJhdGVMaW1pdGVyLmFkZFJ1bGUoe1xuXHR0eXBlOiAnbWV0aG9kJyxcblx0bmFtZTogJ2xpdmVjaGF0OnNlbmRUcmFuc2NyaXB0Jyxcblx0Y29ubmVjdGlvbklkKCkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxufSwgMSwgNTAwMCk7XG4iLCIvKipcbiAqIFNldHMgYW4gdXNlciBhcyAobm9uKW9wZXJhdG9yXG4gKiBAcGFyYW0ge3N0cmluZ30gX2lkIC0gVXNlcidzIF9pZFxuICogQHBhcmFtIHtib29sZWFufSBvcGVyYXRvciAtIEZsYWcgdG8gc2V0IGFzIG9wZXJhdG9yIG9yIG5vdFxuICovXG5Sb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXRPcGVyYXRvciA9IGZ1bmN0aW9uKF9pZCwgb3BlcmF0b3IpIHtcblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdG9wZXJhdG9yLFxuXHRcdH0sXG5cdH07XG5cblx0cmV0dXJuIHRoaXMudXBkYXRlKF9pZCwgdXBkYXRlKTtcbn07XG5cbi8qKlxuICogR2V0cyBhbGwgb25saW5lIGFnZW50c1xuICogQHJldHVyblxuICovXG5Sb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25saW5lQWdlbnRzID0gZnVuY3Rpb24oKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdHN0YXR1czoge1xuXHRcdFx0JGV4aXN0czogdHJ1ZSxcblx0XHRcdCRuZTogJ29mZmxpbmUnLFxuXHRcdH0sXG5cdFx0c3RhdHVzTGl2ZWNoYXQ6ICdhdmFpbGFibGUnLFxuXHRcdHJvbGVzOiAnbGl2ZWNoYXQtYWdlbnQnLFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmQocXVlcnkpO1xufTtcblxuLyoqXG4gKiBGaW5kIGFuIG9ubGluZSBhZ2VudCBieSBoaXMgdXNlcm5hbWVcbiAqIEByZXR1cm5cbiAqL1xuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZU9ubGluZUFnZW50QnlVc2VybmFtZSA9IGZ1bmN0aW9uKHVzZXJuYW1lKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdHVzZXJuYW1lLFxuXHRcdHN0YXR1czoge1xuXHRcdFx0JGV4aXN0czogdHJ1ZSxcblx0XHRcdCRuZTogJ29mZmxpbmUnLFxuXHRcdH0sXG5cdFx0c3RhdHVzTGl2ZWNoYXQ6ICdhdmFpbGFibGUnLFxuXHRcdHJvbGVzOiAnbGl2ZWNoYXQtYWdlbnQnLFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmRPbmUocXVlcnkpO1xufTtcblxuLyoqXG4gKiBHZXRzIGFsbCBhZ2VudHNcbiAqIEByZXR1cm5cbiAqL1xuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZEFnZW50cyA9IGZ1bmN0aW9uKCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRyb2xlczogJ2xpdmVjaGF0LWFnZW50Jyxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5KTtcbn07XG5cbi8qKlxuICogRmluZCBvbmxpbmUgdXNlcnMgZnJvbSBhIGxpc3RcbiAqIEBwYXJhbSB7YXJyYXl9IHVzZXJMaXN0IC0gYXJyYXkgb2YgdXNlcm5hbWVzXG4gKiBAcmV0dXJuXG4gKi9cblJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmxpbmVVc2VyRnJvbUxpc3QgPSBmdW5jdGlvbih1c2VyTGlzdCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRzdGF0dXM6IHtcblx0XHRcdCRleGlzdHM6IHRydWUsXG5cdFx0XHQkbmU6ICdvZmZsaW5lJyxcblx0XHR9LFxuXHRcdHN0YXR1c0xpdmVjaGF0OiAnYXZhaWxhYmxlJyxcblx0XHRyb2xlczogJ2xpdmVjaGF0LWFnZW50Jyxcblx0XHR1c2VybmFtZToge1xuXHRcdFx0JGluOiBbXS5jb25jYXQodXNlckxpc3QpLFxuXHRcdH0sXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSk7XG59O1xuXG4vKipcbiAqIEdldCBuZXh0IHVzZXIgYWdlbnQgaW4gb3JkZXJcbiAqIEByZXR1cm4ge29iamVjdH0gVXNlciBmcm9tIGRiXG4gKi9cblJvY2tldENoYXQubW9kZWxzLlVzZXJzLmdldE5leHRBZ2VudCA9IGZ1bmN0aW9uKCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRzdGF0dXM6IHtcblx0XHRcdCRleGlzdHM6IHRydWUsXG5cdFx0XHQkbmU6ICdvZmZsaW5lJyxcblx0XHR9LFxuXHRcdHN0YXR1c0xpdmVjaGF0OiAnYXZhaWxhYmxlJyxcblx0XHRyb2xlczogJ2xpdmVjaGF0LWFnZW50Jyxcblx0fTtcblxuXHRjb25zdCBjb2xsZWN0aW9uT2JqID0gdGhpcy5tb2RlbC5yYXdDb2xsZWN0aW9uKCk7XG5cdGNvbnN0IGZpbmRBbmRNb2RpZnkgPSBNZXRlb3Iud3JhcEFzeW5jKGNvbGxlY3Rpb25PYmouZmluZEFuZE1vZGlmeSwgY29sbGVjdGlvbk9iaik7XG5cblx0Y29uc3Qgc29ydCA9IHtcblx0XHRsaXZlY2hhdENvdW50OiAxLFxuXHRcdHVzZXJuYW1lOiAxLFxuXHR9O1xuXG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkaW5jOiB7XG5cdFx0XHRsaXZlY2hhdENvdW50OiAxLFxuXHRcdH0sXG5cdH07XG5cblx0Y29uc3QgdXNlciA9IGZpbmRBbmRNb2RpZnkocXVlcnksIHNvcnQsIHVwZGF0ZSk7XG5cdGlmICh1c2VyICYmIHVzZXIudmFsdWUpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0YWdlbnRJZDogdXNlci52YWx1ZS5faWQsXG5cdFx0XHR1c2VybmFtZTogdXNlci52YWx1ZS51c2VybmFtZSxcblx0XHR9O1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBudWxsO1xuXHR9XG59O1xuXG4vKipcbiAqIENoYW5nZSB1c2VyJ3MgbGl2ZWNoYXQgc3RhdHVzXG4gKiBAcGFyYW0ge3N0cmluZ30gdG9rZW4gLSBWaXNpdG9yIHRva2VuXG4gKi9cblJvY2tldENoYXQubW9kZWxzLlVzZXJzLnNldExpdmVjaGF0U3RhdHVzID0gZnVuY3Rpb24odXNlcklkLCBzdGF0dXMpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkOiB1c2VySWQsXG5cdH07XG5cblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdHN0YXR1c0xpdmVjaGF0OiBzdGF0dXMsXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG4vKipcbiAqIGNoYW5nZSBhbGwgbGl2ZWNoYXQgYWdlbnRzIGxpdmVjaGF0IHN0YXR1cyB0byBcIm5vdC1hdmFpbGFibGVcIlxuICovXG5Sb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5jbG9zZU9mZmljZSA9IGZ1bmN0aW9uKCkge1xuXHRzZWxmID0gdGhpcztcblx0c2VsZi5maW5kQWdlbnRzKCkuZm9yRWFjaChmdW5jdGlvbihhZ2VudCkge1xuXHRcdHNlbGYuc2V0TGl2ZWNoYXRTdGF0dXMoYWdlbnQuX2lkLCAnbm90LWF2YWlsYWJsZScpO1xuXHR9KTtcbn07XG5cbi8qKlxuICogY2hhbmdlIGFsbCBsaXZlY2hhdCBhZ2VudHMgbGl2ZWNoYXQgc3RhdHVzIHRvIFwiYXZhaWxhYmxlXCJcbiAqL1xuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMub3Blbk9mZmljZSA9IGZ1bmN0aW9uKCkge1xuXHRzZWxmID0gdGhpcztcblx0c2VsZi5maW5kQWdlbnRzKCkuZm9yRWFjaChmdW5jdGlvbihhZ2VudCkge1xuXHRcdHNlbGYuc2V0TGl2ZWNoYXRTdGF0dXMoYWdlbnQuX2lkLCAnYXZhaWxhYmxlJyk7XG5cdH0pO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZ2V0QWdlbnRJbmZvID0gZnVuY3Rpb24oYWdlbnRJZCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQ6IGFnZW50SWQsXG5cdH07XG5cblx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRmaWVsZHM6IHtcblx0XHRcdG5hbWU6IDEsXG5cdFx0XHR1c2VybmFtZTogMSxcblx0XHRcdHBob25lOiAxLFxuXHRcdFx0Y3VzdG9tRmllbGRzOiAxLFxuXHRcdH0sXG5cdH07XG5cblx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9zaG93X2FnZW50X2VtYWlsJykpIHtcblx0XHRvcHRpb25zLmZpZWxkcy5lbWFpbHMgPSAxO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuZmluZE9uZShxdWVyeSwgb3B0aW9ucyk7XG59O1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbi8qKlxuICogR2V0cyB2aXNpdG9yIGJ5IHRva2VuXG4gKiBAcGFyYW0ge3N0cmluZ30gdG9rZW4gLSBWaXNpdG9yIHRva2VuXG4gKi9cblJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZVN1cnZleUZlZWRiYWNrQnlJZCA9IGZ1bmN0aW9uKF9pZCwgc3VydmV5RmVlZGJhY2spIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkLFxuXHR9O1xuXG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHRzdXJ2ZXlGZWVkYmFjayxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZUxpdmVjaGF0RGF0YUJ5VG9rZW4gPSBmdW5jdGlvbih0b2tlbiwga2V5LCB2YWx1ZSwgb3ZlcndyaXRlID0gdHJ1ZSkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHQndi50b2tlbic6IHRva2VuLFxuXHRcdG9wZW46IHRydWUsXG5cdH07XG5cblx0aWYgKCFvdmVyd3JpdGUpIHtcblx0XHRjb25zdCByb29tID0gdGhpcy5maW5kT25lKHF1ZXJ5LCB7IGZpZWxkczogeyBsaXZlY2hhdERhdGE6IDEgfSB9KTtcblx0XHRpZiAocm9vbS5saXZlY2hhdERhdGEgJiYgdHlwZW9mIHJvb20ubGl2ZWNoYXREYXRhW2tleV0gIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdH1cblxuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0W2BsaXZlY2hhdERhdGEuJHsga2V5IH1gXTogdmFsdWUsXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kTGl2ZWNoYXQgPSBmdW5jdGlvbihmaWx0ZXIgPSB7fSwgb2Zmc2V0ID0gMCwgbGltaXQgPSAyMCkge1xuXHRjb25zdCBxdWVyeSA9IF8uZXh0ZW5kKGZpbHRlciwge1xuXHRcdHQ6ICdsJyxcblx0fSk7XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgeyBzb3J0OiB7IHRzOiAtIDEgfSwgb2Zmc2V0LCBsaW1pdCB9KTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRMaXZlY2hhdEJ5SWQgPSBmdW5jdGlvbihfaWQsIGZpZWxkcykge1xuXHRjb25zdCBvcHRpb25zID0ge307XG5cblx0aWYgKGZpZWxkcykge1xuXHRcdG9wdGlvbnMuZmllbGRzID0gZmllbGRzO1xuXHR9XG5cblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0dDogJ2wnLFxuXHRcdF9pZCxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5LCBvcHRpb25zKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRMaXZlY2hhdEJ5SWRBbmRWaXNpdG9yVG9rZW4gPSBmdW5jdGlvbihfaWQsIHZpc2l0b3JUb2tlbiwgZmllbGRzKSB7XG5cdGNvbnN0IG9wdGlvbnMgPSB7fTtcblxuXHRpZiAoZmllbGRzKSB7XG5cdFx0b3B0aW9ucy5maWVsZHMgPSBmaWVsZHM7XG5cdH1cblxuXHRjb25zdCBxdWVyeSA9IHtcblx0XHR0OiAnbCcsXG5cdFx0X2lkLFxuXHRcdCd2LnRva2VuJzogdmlzaXRvclRva2VuLFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmRPbmUocXVlcnksIG9wdGlvbnMpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZExpdmVjaGF0QnlWaXNpdG9yVG9rZW4gPSBmdW5jdGlvbih2aXNpdG9yVG9rZW4sIGZpZWxkcykge1xuXHRjb25zdCBvcHRpb25zID0ge307XG5cblx0aWYgKGZpZWxkcykge1xuXHRcdG9wdGlvbnMuZmllbGRzID0gZmllbGRzO1xuXHR9XG5cblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0dDogJ2wnLFxuXHRcdCd2LnRva2VuJzogdmlzaXRvclRva2VuLFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmRPbmUocXVlcnksIG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIG5leHQgdmlzaXRvciBuYW1lXG4gKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBuZXh0IHZpc2l0b3IgbmFtZVxuICovXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy51cGRhdGVMaXZlY2hhdFJvb21Db3VudCA9IGZ1bmN0aW9uKCkge1xuXHRjb25zdCBzZXR0aW5nc1JhdyA9IFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLm1vZGVsLnJhd0NvbGxlY3Rpb24oKTtcblx0Y29uc3QgZmluZEFuZE1vZGlmeSA9IE1ldGVvci53cmFwQXN5bmMoc2V0dGluZ3NSYXcuZmluZEFuZE1vZGlmeSwgc2V0dGluZ3NSYXcpO1xuXG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZDogJ0xpdmVjaGF0X1Jvb21fQ291bnQnLFxuXHR9O1xuXG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkaW5jOiB7XG5cdFx0XHR2YWx1ZTogMSxcblx0XHR9LFxuXHR9O1xuXG5cdGNvbnN0IGxpdmVjaGF0Q291bnQgPSBmaW5kQW5kTW9kaWZ5KHF1ZXJ5LCBudWxsLCB1cGRhdGUpO1xuXG5cdHJldHVybiBsaXZlY2hhdENvdW50LnZhbHVlLnZhbHVlO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9wZW5CeVZpc2l0b3JUb2tlbiA9IGZ1bmN0aW9uKHZpc2l0b3JUb2tlbiwgb3B0aW9ucykge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRvcGVuOiB0cnVlLFxuXHRcdCd2LnRva2VuJzogdmlzaXRvclRva2VuLFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmQocXVlcnksIG9wdGlvbnMpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9wZW5CeVZpc2l0b3JUb2tlbkFuZERlcGFydG1lbnRJZCA9IGZ1bmN0aW9uKHZpc2l0b3JUb2tlbiwgZGVwYXJ0bWVudElkLCBvcHRpb25zKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdG9wZW46IHRydWUsXG5cdFx0J3YudG9rZW4nOiB2aXNpdG9yVG9rZW4sXG5cdFx0ZGVwYXJ0bWVudElkLFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmQocXVlcnksIG9wdGlvbnMpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5VmlzaXRvclRva2VuID0gZnVuY3Rpb24odmlzaXRvclRva2VuKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdCd2LnRva2VuJzogdmlzaXRvclRva2VuLFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmQocXVlcnkpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5VmlzaXRvcklkID0gZnVuY3Rpb24odmlzaXRvcklkKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdCd2Ll9pZCc6IHZpc2l0b3JJZCxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5KTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVPcGVuQnlSb29tSWRBbmRWaXNpdG9yVG9rZW4gPSBmdW5jdGlvbihyb29tSWQsIHZpc2l0b3JUb2tlbiwgb3B0aW9ucykge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQ6IHJvb21JZCxcblx0XHRvcGVuOiB0cnVlLFxuXHRcdCd2LnRva2VuJzogdmlzaXRvclRva2VuLFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmRPbmUocXVlcnksIG9wdGlvbnMpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0UmVzcG9uc2VCeVJvb21JZCA9IGZ1bmN0aW9uKHJvb21JZCwgcmVzcG9uc2UpIHtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHtcblx0XHRfaWQ6IHJvb21JZCxcblx0fSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdHJlc3BvbnNlQnk6IHtcblx0XHRcdFx0X2lkOiByZXNwb25zZS51c2VyLl9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IHJlc3BvbnNlLnVzZXIudXNlcm5hbWUsXG5cdFx0XHR9LFxuXHRcdH0sXG5cdFx0JHVuc2V0OiB7XG5cdFx0XHR3YWl0aW5nUmVzcG9uc2U6IDEsXG5cdFx0fSxcblx0fSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zYXZlQW5hbHl0aWNzRGF0YUJ5Um9vbUlkID0gZnVuY3Rpb24ocm9vbSwgbWVzc2FnZSwgYW5hbHl0aWNzRGF0YSkge1xuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge30sXG5cdH07XG5cblx0aWYgKGFuYWx5dGljc0RhdGEpIHtcblx0XHR1cGRhdGUuJHNldFsnbWV0cmljcy5yZXNwb25zZS5hdmcnXSA9IGFuYWx5dGljc0RhdGEuYXZnUmVzcG9uc2VUaW1lO1xuXG5cdFx0dXBkYXRlLiRpbmMgPSB7fTtcblx0XHR1cGRhdGUuJGluY1snbWV0cmljcy5yZXNwb25zZS50b3RhbCddID0gMTtcblx0XHR1cGRhdGUuJGluY1snbWV0cmljcy5yZXNwb25zZS50dCddID0gYW5hbHl0aWNzRGF0YS5yZXNwb25zZVRpbWU7XG5cdFx0dXBkYXRlLiRpbmNbJ21ldHJpY3MucmVhY3Rpb24udHQnXSA9IGFuYWx5dGljc0RhdGEucmVhY3Rpb25UaW1lO1xuXHR9XG5cblx0aWYgKGFuYWx5dGljc0RhdGEgJiYgYW5hbHl0aWNzRGF0YS5maXJzdFJlc3BvbnNlVGltZSkge1xuXHRcdHVwZGF0ZS4kc2V0WydtZXRyaWNzLnJlc3BvbnNlLmZkJ10gPSBhbmFseXRpY3NEYXRhLmZpcnN0UmVzcG9uc2VEYXRlO1xuXHRcdHVwZGF0ZS4kc2V0WydtZXRyaWNzLnJlc3BvbnNlLmZ0J10gPSBhbmFseXRpY3NEYXRhLmZpcnN0UmVzcG9uc2VUaW1lO1xuXHRcdHVwZGF0ZS4kc2V0WydtZXRyaWNzLnJlYWN0aW9uLmZkJ10gPSBhbmFseXRpY3NEYXRhLmZpcnN0UmVhY3Rpb25EYXRlO1xuXHRcdHVwZGF0ZS4kc2V0WydtZXRyaWNzLnJlYWN0aW9uLmZ0J10gPSBhbmFseXRpY3NEYXRhLmZpcnN0UmVhY3Rpb25UaW1lO1xuXHR9XG5cblx0Ly8gbGl2ZWNoYXQgYW5hbHl0aWNzIDogdXBkYXRlIGxhc3QgbWVzc2FnZSB0aW1lc3RhbXBzXG5cdGNvbnN0IHZpc2l0b3JMYXN0UXVlcnkgPSAocm9vbS5tZXRyaWNzICYmIHJvb20ubWV0cmljcy52KSA/IHJvb20ubWV0cmljcy52LmxxIDogcm9vbS50cztcblx0Y29uc3QgYWdlbnRMYXN0UmVwbHkgPSAocm9vbS5tZXRyaWNzICYmIHJvb20ubWV0cmljcy5zZXJ2ZWRCeSkgPyByb29tLm1ldHJpY3Muc2VydmVkQnkubHIgOiByb29tLnRzO1xuXG5cdGlmIChtZXNzYWdlLnRva2VuKSB7XHQvLyB1cGRhdGUgdmlzaXRvciB0aW1lc3RhbXAsIG9ubHkgaWYgaXRzIG5ldyBpbnF1aXJ5IGFuZCBub3QgY29udGludWluZyBtZXNzYWdlXG5cdFx0aWYgKGFnZW50TGFzdFJlcGx5ID49IHZpc2l0b3JMYXN0UXVlcnkpIHtcdFx0Ly8gaWYgZmlyc3QgcXVlcnksIG5vdCBjb250aW51aW5nIHF1ZXJ5IGZyb20gdmlzaXRvclxuXHRcdFx0dXBkYXRlLiRzZXRbJ21ldHJpY3Mudi5scSddID0gbWVzc2FnZS50cztcblx0XHR9XG5cdH0gZWxzZSBpZiAodmlzaXRvckxhc3RRdWVyeSA+IGFnZW50TGFzdFJlcGx5KSB7XHRcdC8vIHVwZGF0ZSBhZ2VudCB0aW1lc3RhbXAsIGlmIGZpcnN0IHJlc3BvbnNlLCBub3QgY29udGludWluZ1xuXHRcdHVwZGF0ZS4kc2V0WydtZXRyaWNzLnNlcnZlZEJ5LmxyJ10gPSBtZXNzYWdlLnRzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMudXBkYXRlKHtcblx0XHRfaWQ6IHJvb20uX2lkLFxuXHR9LCB1cGRhdGUpO1xufTtcblxuLyoqXG4gKiB0b3RhbCBubyBvZiBjb252ZXJzYXRpb25zIGJldHdlZW4gZGF0ZS5cbiAqIEBwYXJhbSB7c3RyaW5nLCB7SVNPRGF0ZSwgSVNPRGF0ZX19IHQgLSBzdHJpbmcsIHJvb20gdHlwZS4gZGF0ZS5ndGUgLSBJU09EYXRlICh0cyA+PSBkYXRlLmd0ZSksIGRhdGUubHQtIElTT0RhdGUgKHRzIDwgZGF0ZS5sdClcbiAqIEByZXR1cm4ge2ludH1cbiAqL1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5nZXRUb3RhbENvbnZlcnNhdGlvbnNCZXR3ZWVuRGF0ZSA9IGZ1bmN0aW9uKHQsIGRhdGUpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0dCxcblx0XHR0czoge1xuXHRcdFx0JGd0ZTogbmV3IERhdGUoZGF0ZS5ndGUpLFx0Ly8gSVNPIERhdGUsIHRzID49IGRhdGUuZ3RlXG5cdFx0XHQkbHQ6IG5ldyBEYXRlKGRhdGUubHQpLFx0Ly8gSVNPRGF0ZSwgdHMgPCBkYXRlLmx0XG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5KS5jb3VudCgpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZ2V0QW5hbHl0aWNzTWV0cmljc0JldHdlZW5EYXRlID0gZnVuY3Rpb24odCwgZGF0ZSkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHR0LFxuXHRcdHRzOiB7XG5cdFx0XHQkZ3RlOiBuZXcgRGF0ZShkYXRlLmd0ZSksXHQvLyBJU08gRGF0ZSwgdHMgPj0gZGF0ZS5ndGVcblx0XHRcdCRsdDogbmV3IERhdGUoZGF0ZS5sdCksXHQvLyBJU09EYXRlLCB0cyA8IGRhdGUubHRcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmQocXVlcnksIHsgZmllbGRzOiB7IHRzOiAxLCBkZXBhcnRtZW50SWQ6IDEsIG9wZW46IDEsIHNlcnZlZEJ5OiAxLCBtZXRyaWNzOiAxLCBtc2dzOiAxIH0gfSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5jbG9zZUJ5Um9vbUlkID0gZnVuY3Rpb24ocm9vbUlkLCBjbG9zZUluZm8pIHtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHtcblx0XHRfaWQ6IHJvb21JZCxcblx0fSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdGNsb3NlcjogY2xvc2VJbmZvLmNsb3Nlcixcblx0XHRcdGNsb3NlZEJ5OiBjbG9zZUluZm8uY2xvc2VkQnksXG5cdFx0XHRjbG9zZWRBdDogY2xvc2VJbmZvLmNsb3NlZEF0LFxuXHRcdFx0J21ldHJpY3MuY2hhdER1cmF0aW9uJzogY2xvc2VJbmZvLmNoYXREdXJhdGlvbixcblx0XHRcdCd2LnN0YXR1cyc6ICdvZmZsaW5lJyxcblx0XHR9LFxuXHRcdCR1bnNldDoge1xuXHRcdFx0b3BlbjogMSxcblx0XHR9LFxuXHR9KTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPcGVuQnlBZ2VudCA9IGZ1bmN0aW9uKHVzZXJJZCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRvcGVuOiB0cnVlLFxuXHRcdCdzZXJ2ZWRCeS5faWQnOiB1c2VySWQsXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5jaGFuZ2VBZ2VudEJ5Um9vbUlkID0gZnVuY3Rpb24ocm9vbUlkLCBuZXdBZ2VudCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQ6IHJvb21JZCxcblx0fTtcblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdHNlcnZlZEJ5OiB7XG5cdFx0XHRcdF9pZDogbmV3QWdlbnQuYWdlbnRJZCxcblx0XHRcdFx0dXNlcm5hbWU6IG5ld0FnZW50LnVzZXJuYW1lLFxuXHRcdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdH0sXG5cdFx0fSxcblx0fTtcblxuXHRpZiAobmV3QWdlbnQudHMpIHtcblx0XHR1cGRhdGUuJHNldC5zZXJ2ZWRCeS50cyA9IG5ld0FnZW50LnRzO1xuXHR9XG5cblx0dGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5jaGFuZ2VEZXBhcnRtZW50SWRCeVJvb21JZCA9IGZ1bmN0aW9uKHJvb21JZCwgZGVwYXJ0bWVudElkKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZDogcm9vbUlkLFxuXHR9O1xuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0ZGVwYXJ0bWVudElkLFxuXHRcdH0sXG5cdH07XG5cblx0dGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zYXZlQ1JNRGF0YUJ5Um9vbUlkID0gZnVuY3Rpb24ocm9vbUlkLCBjcm1EYXRhKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZDogcm9vbUlkLFxuXHR9O1xuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0Y3JtRGF0YSxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZVZpc2l0b3JTdGF0dXMgPSBmdW5jdGlvbih0b2tlbiwgc3RhdHVzKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdCd2LnRva2VuJzogdG9rZW4sXG5cdFx0b3BlbjogdHJ1ZSxcblx0fTtcblxuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0J3Yuc3RhdHVzJzogc3RhdHVzLFxuXHRcdH0sXG5cdH07XG5cblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMucmVtb3ZlQWdlbnRCeVJvb21JZCA9IGZ1bmN0aW9uKHJvb21JZCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQ6IHJvb21JZCxcblx0fTtcblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCR1bnNldDoge1xuXHRcdFx0c2VydmVkQnk6IDEsXG5cdFx0fSxcblx0fTtcblxuXHR0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG4iLCJSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5rZWVwSGlzdG9yeUZvclRva2VuID0gZnVuY3Rpb24odG9rZW4pIHtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHtcblx0XHQnbmF2aWdhdGlvbi50b2tlbic6IHRva2VuLFxuXHRcdGV4cGlyZUF0OiB7XG5cdFx0XHQkZXhpc3RzOiB0cnVlLFxuXHRcdH0sXG5cdH0sIHtcblx0XHQkdW5zZXQ6IHtcblx0XHRcdGV4cGlyZUF0OiAxLFxuXHRcdH0sXG5cdH0sIHtcblx0XHRtdWx0aTogdHJ1ZSxcblx0fSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5zZXRSb29tSWRCeVRva2VuID0gZnVuY3Rpb24odG9rZW4sIHJpZCkge1xuXHRyZXR1cm4gdGhpcy51cGRhdGUoe1xuXHRcdCduYXZpZ2F0aW9uLnRva2VuJzogdG9rZW4sXG5cdFx0cmlkOiBudWxsLFxuXHR9LCB7XG5cdFx0JHNldDoge1xuXHRcdFx0cmlkLFxuXHRcdH0sXG5cdH0sIHtcblx0XHRtdWx0aTogdHJ1ZSxcblx0fSk7XG59O1xuIiwiY2xhc3MgTGl2ZWNoYXRFeHRlcm5hbE1lc3NhZ2UgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdsaXZlY2hhdF9leHRlcm5hbF9tZXNzYWdlJyk7XG5cblx0XHRpZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG5cdFx0XHR0aGlzLl9pbml0TW9kZWwoJ2xpdmVjaGF0X2V4dGVybmFsX21lc3NhZ2UnKTtcblx0XHR9XG5cdH1cblxuXHQvLyBGSU5EXG5cdGZpbmRCeVJvb21JZChyb29tSWQsIHNvcnQgPSB7IHRzOiAtMSB9KSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7IHJpZDogcm9vbUlkIH07XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5LCB7IHNvcnQgfSk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRFeHRlcm5hbE1lc3NhZ2UgPSBuZXcgTGl2ZWNoYXRFeHRlcm5hbE1lc3NhZ2UoKTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG4vKipcbiAqIExpdmVjaGF0IEN1c3RvbSBGaWVsZHMgbW9kZWxcbiAqL1xuY2xhc3MgTGl2ZWNoYXRDdXN0b21GaWVsZCBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ2xpdmVjaGF0X2N1c3RvbV9maWVsZCcpO1xuXHR9XG5cblx0Ly8gRklORFxuXHRmaW5kT25lQnlJZChfaWQsIG9wdGlvbnMpIHtcblx0XHRjb25zdCBxdWVyeSA9IHsgX2lkIH07XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kT25lKHF1ZXJ5LCBvcHRpb25zKTtcblx0fVxuXG5cdGNyZWF0ZU9yVXBkYXRlQ3VzdG9tRmllbGQoX2lkLCBmaWVsZCwgbGFiZWwsIHNjb3BlLCB2aXNpYmlsaXR5LCBleHRyYURhdGEpIHtcblx0XHRjb25zdCByZWNvcmQgPSB7XG5cdFx0XHRsYWJlbCxcblx0XHRcdHNjb3BlLFxuXHRcdFx0dmlzaWJpbGl0eSxcblx0XHR9O1xuXG5cdFx0Xy5leHRlbmQocmVjb3JkLCBleHRyYURhdGEpO1xuXG5cdFx0aWYgKF9pZCkge1xuXHRcdFx0dGhpcy51cGRhdGUoeyBfaWQgfSwgeyAkc2V0OiByZWNvcmQgfSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlY29yZC5faWQgPSBmaWVsZDtcblx0XHRcdF9pZCA9IHRoaXMuaW5zZXJ0KHJlY29yZCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlY29yZDtcblx0fVxuXG5cdC8vIFJFTU9WRVxuXHRyZW1vdmVCeUlkKF9pZCkge1xuXHRcdGNvbnN0IHF1ZXJ5ID0geyBfaWQgfTtcblxuXHRcdHJldHVybiB0aGlzLnJlbW92ZShxdWVyeSk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRDdXN0b21GaWVsZCA9IG5ldyBMaXZlY2hhdEN1c3RvbUZpZWxkKCk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuLyoqXG4gKiBMaXZlY2hhdCBEZXBhcnRtZW50IG1vZGVsXG4gKi9cbmNsYXNzIExpdmVjaGF0RGVwYXJ0bWVudCBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ2xpdmVjaGF0X2RlcGFydG1lbnQnKTtcblxuXHRcdHRoaXMudHJ5RW5zdXJlSW5kZXgoe1xuXHRcdFx0bnVtQWdlbnRzOiAxLFxuXHRcdFx0ZW5hYmxlZDogMSxcblx0XHR9KTtcblx0fVxuXG5cdC8vIEZJTkRcblx0ZmluZE9uZUJ5SWQoX2lkLCBvcHRpb25zKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7IF9pZCB9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZE9uZShxdWVyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHRmaW5kQnlEZXBhcnRtZW50SWQoX2lkLCBvcHRpb25zKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7IF9pZCB9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHRjcmVhdGVPclVwZGF0ZURlcGFydG1lbnQoX2lkLCB7IGVuYWJsZWQsIG5hbWUsIGRlc2NyaXB0aW9uLCBzaG93T25SZWdpc3RyYXRpb24gfSwgYWdlbnRzKSB7XG5cdFx0YWdlbnRzID0gW10uY29uY2F0KGFnZW50cyk7XG5cblx0XHRjb25zdCByZWNvcmQgPSB7XG5cdFx0XHRlbmFibGVkLFxuXHRcdFx0bmFtZSxcblx0XHRcdGRlc2NyaXB0aW9uLFxuXHRcdFx0bnVtQWdlbnRzOiBhZ2VudHMubGVuZ3RoLFxuXHRcdFx0c2hvd09uUmVnaXN0cmF0aW9uLFxuXHRcdH07XG5cblx0XHRpZiAoX2lkKSB7XG5cdFx0XHR0aGlzLnVwZGF0ZSh7IF9pZCB9LCB7ICRzZXQ6IHJlY29yZCB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0X2lkID0gdGhpcy5pbnNlcnQocmVjb3JkKTtcblx0XHR9XG5cblx0XHRjb25zdCBzYXZlZEFnZW50cyA9IF8ucGx1Y2soUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLmZpbmRCeURlcGFydG1lbnRJZChfaWQpLmZldGNoKCksICdhZ2VudElkJyk7XG5cdFx0Y29uc3QgYWdlbnRzVG9TYXZlID0gXy5wbHVjayhhZ2VudHMsICdhZ2VudElkJyk7XG5cblx0XHQvLyByZW1vdmUgb3RoZXIgYWdlbnRzXG5cdFx0Xy5kaWZmZXJlbmNlKHNhdmVkQWdlbnRzLCBhZ2VudHNUb1NhdmUpLmZvckVhY2goKGFnZW50SWQpID0+IHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cy5yZW1vdmVCeURlcGFydG1lbnRJZEFuZEFnZW50SWQoX2lkLCBhZ2VudElkKTtcblx0XHR9KTtcblxuXHRcdGFnZW50cy5mb3JFYWNoKChhZ2VudCkgPT4ge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLnNhdmVBZ2VudCh7XG5cdFx0XHRcdGFnZW50SWQ6IGFnZW50LmFnZW50SWQsXG5cdFx0XHRcdGRlcGFydG1lbnRJZDogX2lkLFxuXHRcdFx0XHR1c2VybmFtZTogYWdlbnQudXNlcm5hbWUsXG5cdFx0XHRcdGNvdW50OiBhZ2VudC5jb3VudCA/IHBhcnNlSW50KGFnZW50LmNvdW50KSA6IDAsXG5cdFx0XHRcdG9yZGVyOiBhZ2VudC5vcmRlciA/IHBhcnNlSW50KGFnZW50Lm9yZGVyKSA6IDAsXG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBfLmV4dGVuZChyZWNvcmQsIHsgX2lkIH0pO1xuXHR9XG5cblx0Ly8gUkVNT1ZFXG5cdHJlbW92ZUJ5SWQoX2lkKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7IF9pZCB9O1xuXG5cdFx0cmV0dXJuIHRoaXMucmVtb3ZlKHF1ZXJ5KTtcblx0fVxuXG5cdGZpbmRFbmFibGVkV2l0aEFnZW50cygpIHtcblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdG51bUFnZW50czogeyAkZ3Q6IDAgfSxcblx0XHRcdGVuYWJsZWQ6IHRydWUsXG5cdFx0fTtcblx0XHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5KTtcblx0fVxufVxuXG5Sb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnQgPSBuZXcgTGl2ZWNoYXREZXBhcnRtZW50KCk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbi8qKlxuICogTGl2ZWNoYXQgRGVwYXJ0bWVudCBtb2RlbFxuICovXG5jbGFzcyBMaXZlY2hhdERlcGFydG1lbnRBZ2VudHMgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdsaXZlY2hhdF9kZXBhcnRtZW50X2FnZW50cycpO1xuXHR9XG5cblx0ZmluZEJ5RGVwYXJ0bWVudElkKGRlcGFydG1lbnRJZCkge1xuXHRcdHJldHVybiB0aGlzLmZpbmQoeyBkZXBhcnRtZW50SWQgfSk7XG5cdH1cblxuXHRzYXZlQWdlbnQoYWdlbnQpIHtcblx0XHRyZXR1cm4gdGhpcy51cHNlcnQoe1xuXHRcdFx0YWdlbnRJZDogYWdlbnQuYWdlbnRJZCxcblx0XHRcdGRlcGFydG1lbnRJZDogYWdlbnQuZGVwYXJ0bWVudElkLFxuXHRcdH0sIHtcblx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0dXNlcm5hbWU6IGFnZW50LnVzZXJuYW1lLFxuXHRcdFx0XHRjb3VudDogcGFyc2VJbnQoYWdlbnQuY291bnQpLFxuXHRcdFx0XHRvcmRlcjogcGFyc2VJbnQoYWdlbnQub3JkZXIpLFxuXHRcdFx0fSxcblx0XHR9KTtcblx0fVxuXG5cdHJlbW92ZUJ5RGVwYXJ0bWVudElkQW5kQWdlbnRJZChkZXBhcnRtZW50SWQsIGFnZW50SWQpIHtcblx0XHR0aGlzLnJlbW92ZSh7IGRlcGFydG1lbnRJZCwgYWdlbnRJZCB9KTtcblx0fVxuXG5cdGdldE5leHRBZ2VudEZvckRlcGFydG1lbnQoZGVwYXJ0bWVudElkKSB7XG5cdFx0Y29uc3QgYWdlbnRzID0gdGhpcy5maW5kQnlEZXBhcnRtZW50SWQoZGVwYXJ0bWVudElkKS5mZXRjaCgpO1xuXG5cdFx0aWYgKGFnZW50cy5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBvbmxpbmVVc2VycyA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmxpbmVVc2VyRnJvbUxpc3QoXy5wbHVjayhhZ2VudHMsICd1c2VybmFtZScpKTtcblxuXHRcdGNvbnN0IG9ubGluZVVzZXJuYW1lcyA9IF8ucGx1Y2sob25saW5lVXNlcnMuZmV0Y2goKSwgJ3VzZXJuYW1lJyk7XG5cblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdGRlcGFydG1lbnRJZCxcblx0XHRcdHVzZXJuYW1lOiB7XG5cdFx0XHRcdCRpbjogb25saW5lVXNlcm5hbWVzLFxuXHRcdFx0fSxcblx0XHR9O1xuXG5cdFx0Y29uc3Qgc29ydCA9IHtcblx0XHRcdGNvdW50OiAxLFxuXHRcdFx0b3JkZXI6IDEsXG5cdFx0XHR1c2VybmFtZTogMSxcblx0XHR9O1xuXHRcdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHRcdCRpbmM6IHtcblx0XHRcdFx0Y291bnQ6IDEsXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRjb25zdCBjb2xsZWN0aW9uT2JqID0gdGhpcy5tb2RlbC5yYXdDb2xsZWN0aW9uKCk7XG5cdFx0Y29uc3QgZmluZEFuZE1vZGlmeSA9IE1ldGVvci53cmFwQXN5bmMoY29sbGVjdGlvbk9iai5maW5kQW5kTW9kaWZ5LCBjb2xsZWN0aW9uT2JqKTtcblxuXHRcdGNvbnN0IGFnZW50ID0gZmluZEFuZE1vZGlmeShxdWVyeSwgc29ydCwgdXBkYXRlKTtcblx0XHRpZiAoYWdlbnQgJiYgYWdlbnQudmFsdWUpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGFnZW50SWQ6IGFnZW50LnZhbHVlLmFnZW50SWQsXG5cdFx0XHRcdHVzZXJuYW1lOiBhZ2VudC52YWx1ZS51c2VybmFtZSxcblx0XHRcdH07XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0fVxuXG5cdGdldE9ubGluZUZvckRlcGFydG1lbnQoZGVwYXJ0bWVudElkKSB7XG5cdFx0Y29uc3QgYWdlbnRzID0gdGhpcy5maW5kQnlEZXBhcnRtZW50SWQoZGVwYXJ0bWVudElkKS5mZXRjaCgpO1xuXG5cdFx0aWYgKGFnZW50cy5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybiBbXTtcblx0XHR9XG5cblx0XHRjb25zdCBvbmxpbmVVc2VycyA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmxpbmVVc2VyRnJvbUxpc3QoXy5wbHVjayhhZ2VudHMsICd1c2VybmFtZScpKTtcblxuXHRcdGNvbnN0IG9ubGluZVVzZXJuYW1lcyA9IF8ucGx1Y2sob25saW5lVXNlcnMuZmV0Y2goKSwgJ3VzZXJuYW1lJyk7XG5cblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdGRlcGFydG1lbnRJZCxcblx0XHRcdHVzZXJuYW1lOiB7XG5cdFx0XHRcdCRpbjogb25saW5lVXNlcm5hbWVzLFxuXHRcdFx0fSxcblx0XHR9O1xuXG5cdFx0Y29uc3QgZGVwQWdlbnRzID0gdGhpcy5maW5kKHF1ZXJ5KTtcblxuXHRcdGlmIChkZXBBZ2VudHMpIHtcblx0XHRcdHJldHVybiBkZXBBZ2VudHM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBbXTtcblx0XHR9XG5cdH1cblxuXHRmaW5kVXNlcnNJblF1ZXVlKHVzZXJzTGlzdCkge1xuXHRcdGNvbnN0IHF1ZXJ5ID0ge307XG5cblx0XHRpZiAoIV8uaXNFbXB0eSh1c2Vyc0xpc3QpKSB7XG5cdFx0XHRxdWVyeS51c2VybmFtZSA9IHtcblx0XHRcdFx0JGluOiB1c2Vyc0xpc3QsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRzb3J0OiB7XG5cdFx0XHRcdGRlcGFydG1lbnRJZDogMSxcblx0XHRcdFx0Y291bnQ6IDEsXG5cdFx0XHRcdG9yZGVyOiAxLFxuXHRcdFx0XHR1c2VybmFtZTogMSxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdHJldHVybiB0aGlzLmZpbmQocXVlcnksIG9wdGlvbnMpO1xuXHR9XG5cblx0cmVwbGFjZVVzZXJuYW1lT2ZBZ2VudEJ5VXNlcklkKHVzZXJJZCwgdXNlcm5hbWUpIHtcblx0XHRjb25zdCBxdWVyeSA9IHsgYWdlbnRJZDogdXNlcklkIH07XG5cblx0XHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdHVzZXJuYW1lLFxuXHRcdFx0fSxcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUsIHsgbXVsdGk6IHRydWUgfSk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzID0gbmV3IExpdmVjaGF0RGVwYXJ0bWVudEFnZW50cygpO1xuIiwiLyoqXG4gKiBMaXZlY2hhdCBQYWdlIFZpc2l0ZWQgbW9kZWxcbiAqL1xuY2xhc3MgTGl2ZWNoYXRQYWdlVmlzaXRlZCBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ2xpdmVjaGF0X3BhZ2VfdmlzaXRlZCcpO1xuXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IHRva2VuOiAxIH0pO1xuXHRcdHRoaXMudHJ5RW5zdXJlSW5kZXgoeyB0czogMSB9KTtcblxuXHRcdC8vIGtlZXAgaGlzdG9yeSBmb3IgMSBtb250aCBpZiB0aGUgdmlzaXRvciBkb2VzIG5vdCByZWdpc3RlclxuXHRcdHRoaXMudHJ5RW5zdXJlSW5kZXgoeyBleHBpcmVBdDogMSB9LCB7IHNwYXJzZTogMSwgZXhwaXJlQWZ0ZXJTZWNvbmRzOiAwIH0pO1xuXHR9XG5cblx0c2F2ZUJ5VG9rZW4odG9rZW4sIHBhZ2VJbmZvKSB7XG5cdFx0Ly8ga2VlcCBoaXN0b3J5IG9mIHVucmVnaXN0ZXJlZCB2aXNpdG9ycyBmb3IgMSBtb250aFxuXHRcdGNvbnN0IGtlZXBIaXN0b3J5TWlsaXNlY29uZHMgPSAyNTkyMDAwMDAwO1xuXG5cdFx0cmV0dXJuIHRoaXMuaW5zZXJ0KHtcblx0XHRcdHRva2VuLFxuXHRcdFx0cGFnZTogcGFnZUluZm8sXG5cdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdGV4cGlyZUF0OiBuZXcgRGF0ZSgpLmdldFRpbWUoKSArIGtlZXBIaXN0b3J5TWlsaXNlY29uZHMsXG5cdFx0fSk7XG5cdH1cblxuXHRmaW5kQnlUb2tlbih0b2tlbikge1xuXHRcdHJldHVybiB0aGlzLmZpbmQoeyB0b2tlbiB9LCB7IHNvcnQgOiB7IHRzOiAtMSB9LCBsaW1pdDogMjAgfSk7XG5cdH1cblxuXHRrZWVwSGlzdG9yeUZvclRva2VuKHRva2VuKSB7XG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKHtcblx0XHRcdHRva2VuLFxuXHRcdFx0ZXhwaXJlQXQ6IHtcblx0XHRcdFx0JGV4aXN0czogdHJ1ZSxcblx0XHRcdH0sXG5cdFx0fSwge1xuXHRcdFx0JHVuc2V0OiB7XG5cdFx0XHRcdGV4cGlyZUF0OiAxLFxuXHRcdFx0fSxcblx0XHR9LCB7XG5cdFx0XHRtdWx0aTogdHJ1ZSxcblx0XHR9KTtcblx0fVxufVxuXG5Sb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdFBhZ2VWaXNpdGVkID0gbmV3IExpdmVjaGF0UGFnZVZpc2l0ZWQoKTtcbiIsIi8qKlxuICogTGl2ZWNoYXQgVHJpZ2dlciBtb2RlbFxuICovXG5jbGFzcyBMaXZlY2hhdFRyaWdnZXIgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdsaXZlY2hhdF90cmlnZ2VyJyk7XG5cdH1cblxuXHR1cGRhdGVCeUlkKF9pZCwgZGF0YSkge1xuXHRcdHJldHVybiB0aGlzLnVwZGF0ZSh7IF9pZCB9LCB7ICRzZXQ6IGRhdGEgfSk7XG5cdH1cblxuXHRyZW1vdmVBbGwoKSB7XG5cdFx0cmV0dXJuIHRoaXMucmVtb3ZlKHt9KTtcblx0fVxuXG5cdGZpbmRCeUlkKF9pZCkge1xuXHRcdHJldHVybiB0aGlzLmZpbmQoeyBfaWQgfSk7XG5cdH1cblxuXHRyZW1vdmVCeUlkKF9pZCkge1xuXHRcdHJldHVybiB0aGlzLnJlbW92ZSh7IF9pZCB9KTtcblx0fVxuXG5cdGZpbmRFbmFibGVkKCkge1xuXHRcdHJldHVybiB0aGlzLmZpbmQoeyBlbmFibGVkOiB0cnVlIH0pO1xuXHR9XG59XG5cblJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0VHJpZ2dlciA9IG5ldyBMaXZlY2hhdFRyaWdnZXIoKTtcbiIsIk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy50cnlFbnN1cmVJbmRleCh7IG9wZW46IDEgfSwgeyBzcGFyc2U6IDEgfSk7XG5cdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnRyeUVuc3VyZUluZGV4KHsgZGVwYXJ0bWVudElkOiAxIH0sIHsgc3BhcnNlOiAxIH0pO1xuXHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy50cnlFbnN1cmVJbmRleCh7ICd2aXNpdG9yRW1haWxzLmFkZHJlc3MnOiAxIH0pO1xufSk7XG4iLCJjbGFzcyBMaXZlY2hhdElucXVpcnkgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdsaXZlY2hhdF9pbnF1aXJ5Jyk7XG5cblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgcmlkOiAxIH0pOyAvLyByb29tIGlkIGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBpbnF1aXJ5XG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IG5hbWU6IDEgfSk7IC8vIG5hbWUgb2YgdGhlIGlucXVpcnkgKGNsaWVudCBuYW1lIGZvciBub3cpXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IG1lc3NhZ2U6IDEgfSk7IC8vIG1lc3NhZ2Ugc2VudCBieSB0aGUgY2xpZW50XG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IHRzOiAxIH0pOyAvLyB0aW1lc3RhbXBcblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgYWdlbnRzOiAxIH0pOyAvLyBJZCdzIG9mIHRoZSBhZ2VudHMgd2hvIGNhbiBzZWUgdGhlIGlucXVpcnkgKGhhbmRsZSBkZXBhcnRtZW50cylcblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgc3RhdHVzOiAxIH0pOyAvLyAnb3BlbicsICd0YWtlbidcblx0fVxuXG5cdGZpbmRPbmVCeUlkKGlucXVpcnlJZCkge1xuXHRcdHJldHVybiB0aGlzLmZpbmRPbmUoeyBfaWQ6IGlucXVpcnlJZCB9KTtcblx0fVxuXG5cdC8qXG5cdCAqIG1hcmsgdGhlIGlucXVpcnkgYXMgdGFrZW5cblx0ICovXG5cdHRha2VJbnF1aXJ5KGlucXVpcnlJZCkge1xuXHRcdHRoaXMudXBkYXRlKHtcblx0XHRcdF9pZDogaW5xdWlyeUlkLFxuXHRcdH0sIHtcblx0XHRcdCRzZXQ6IHsgc3RhdHVzOiAndGFrZW4nIH0sXG5cdFx0fSk7XG5cdH1cblxuXHQvKlxuXHQgKiBtYXJrIHRoZSBpbnF1aXJ5IGFzIGNsb3NlZFxuXHQgKi9cblx0Y2xvc2VCeVJvb21JZChyb29tSWQsIGNsb3NlSW5mbykge1xuXHRcdHJldHVybiB0aGlzLnVwZGF0ZSh7XG5cdFx0XHRyaWQ6IHJvb21JZCxcblx0XHR9LCB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdHN0YXR1czogJ2Nsb3NlZCcsXG5cdFx0XHRcdGNsb3NlcjogY2xvc2VJbmZvLmNsb3Nlcixcblx0XHRcdFx0Y2xvc2VkQnk6IGNsb3NlSW5mby5jbG9zZWRCeSxcblx0XHRcdFx0Y2xvc2VkQXQ6IGNsb3NlSW5mby5jbG9zZWRBdCxcblx0XHRcdFx0J21ldHJpY3MuY2hhdER1cmF0aW9uJzogY2xvc2VJbmZvLmNoYXREdXJhdGlvbixcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH1cblxuXHQvKlxuXHQgKiBtYXJrIGlucXVpcnkgYXMgb3BlblxuXHQgKi9cblx0b3BlbklucXVpcnkoaW5xdWlyeUlkKSB7XG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKHtcblx0XHRcdF9pZDogaW5xdWlyeUlkLFxuXHRcdH0sIHtcblx0XHRcdCRzZXQ6IHsgc3RhdHVzOiAnb3BlbicgfSxcblx0XHR9KTtcblx0fVxuXG5cdC8qXG5cdCAqIG1hcmsgaW5xdWlyeSBhcyBvcGVuIGFuZCBzZXQgYWdlbnRzXG5cdCAqL1xuXHRvcGVuSW5xdWlyeVdpdGhBZ2VudHMoaW5xdWlyeUlkLCBhZ2VudElkcykge1xuXHRcdHJldHVybiB0aGlzLnVwZGF0ZSh7XG5cdFx0XHRfaWQ6IGlucXVpcnlJZCxcblx0XHR9LCB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdHN0YXR1czogJ29wZW4nLFxuXHRcdFx0XHRhZ2VudHM6IGFnZW50SWRzLFxuXHRcdFx0fSxcblx0XHR9KTtcblx0fVxuXG5cdC8qXG5cdCAqIHJldHVybiB0aGUgc3RhdHVzIG9mIHRoZSBpbnF1aXJ5IChvcGVuIG9yIHRha2VuKVxuXHQgKi9cblx0Z2V0U3RhdHVzKGlucXVpcnlJZCkge1xuXHRcdHJldHVybiB0aGlzLmZpbmRPbmUoeyBfaWQ6IGlucXVpcnlJZCB9KS5zdGF0dXM7XG5cdH1cblxuXHR1cGRhdGVWaXNpdG9yU3RhdHVzKHRva2VuLCBzdGF0dXMpIHtcblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdCd2LnRva2VuJzogdG9rZW4sXG5cdFx0XHRzdGF0dXM6ICdvcGVuJyxcblx0XHR9O1xuXG5cdFx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHQndi5zdGF0dXMnOiBzdGF0dXMsXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRJbnF1aXJ5ID0gbmV3IExpdmVjaGF0SW5xdWlyeSgpO1xuIiwiaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnO1xuXG5jbGFzcyBMaXZlY2hhdE9mZmljZUhvdXIgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdsaXZlY2hhdF9vZmZpY2VfaG91cicpO1xuXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IGRheTogMSB9KTsgLy8gdGhlIGRheSBvZiB0aGUgd2VlayBtb25kYXkgLSBzdW5kYXlcblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgc3RhcnQ6IDEgfSk7IC8vIHRoZSBvcGVuaW5nIGhvdXJzIG9mIHRoZSBvZmZpY2Vcblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgZmluaXNoOiAxIH0pOyAvLyB0aGUgY2xvc2luZyBob3VycyBvZiB0aGUgb2ZmaWNlXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IG9wZW46IDEgfSk7IC8vIHdoZXRoZXIgb3Igbm90IHRoZSBvZmZpY2VzIGFyZSBvcGVuIG9uIHRoaXMgZGF5XG5cblx0XHQvLyBpZiB0aGVyZSBpcyBub3RoaW5nIGluIHRoZSBjb2xsZWN0aW9uLCBhZGQgZGVmYXVsdHNcblx0XHRpZiAodGhpcy5maW5kKCkuY291bnQoKSA9PT0gMCkge1xuXHRcdFx0dGhpcy5pbnNlcnQoeyBkYXkgOiAnTW9uZGF5Jywgc3RhcnQgOiAnMDg6MDAnLCBmaW5pc2ggOiAnMjA6MDAnLCBjb2RlIDogMSwgb3BlbiA6IHRydWUgfSk7XG5cdFx0XHR0aGlzLmluc2VydCh7IGRheSA6ICdUdWVzZGF5Jywgc3RhcnQgOiAnMDg6MDAnLCBmaW5pc2ggOiAnMjA6MDAnLCBjb2RlIDogMiwgb3BlbiA6IHRydWUgfSk7XG5cdFx0XHR0aGlzLmluc2VydCh7IGRheSA6ICdXZWRuZXNkYXknLCBzdGFydCA6ICcwODowMCcsIGZpbmlzaCA6ICcyMDowMCcsIGNvZGUgOiAzLCBvcGVuIDogdHJ1ZSB9KTtcblx0XHRcdHRoaXMuaW5zZXJ0KHsgZGF5IDogJ1RodXJzZGF5Jywgc3RhcnQgOiAnMDg6MDAnLCBmaW5pc2ggOiAnMjA6MDAnLCBjb2RlIDogNCwgb3BlbiA6IHRydWUgfSk7XG5cdFx0XHR0aGlzLmluc2VydCh7IGRheSA6ICdGcmlkYXknLCBzdGFydCA6ICcwODowMCcsIGZpbmlzaCA6ICcyMDowMCcsIGNvZGUgOiA1LCBvcGVuIDogdHJ1ZSB9KTtcblx0XHRcdHRoaXMuaW5zZXJ0KHsgZGF5IDogJ1NhdHVyZGF5Jywgc3RhcnQgOiAnMDg6MDAnLCBmaW5pc2ggOiAnMjA6MDAnLCBjb2RlIDogNiwgb3BlbiA6IGZhbHNlIH0pO1xuXHRcdFx0dGhpcy5pbnNlcnQoeyBkYXkgOiAnU3VuZGF5Jywgc3RhcnQgOiAnMDg6MDAnLCBmaW5pc2ggOiAnMjA6MDAnLCBjb2RlIDogMCwgb3BlbiA6IGZhbHNlIH0pO1xuXHRcdH1cblx0fVxuXG5cdC8qXG5cdCAqIHVwZGF0ZSB0aGUgZ2l2ZW4gZGF5cyBzdGFydCBhbmQgZmluaXNoIHRpbWVzIGFuZCB3aGV0aGVyIHRoZSBvZmZpY2UgaXMgb3BlbiBvbiB0aGF0IGRheVxuXHQgKi9cblx0dXBkYXRlSG91cnMoZGF5LCBuZXdTdGFydCwgbmV3RmluaXNoLCBuZXdPcGVuKSB7XG5cdFx0dGhpcy51cGRhdGUoe1xuXHRcdFx0ZGF5LFxuXHRcdH0sIHtcblx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0c3RhcnQ6IG5ld1N0YXJ0LFxuXHRcdFx0XHRmaW5pc2g6IG5ld0ZpbmlzaCxcblx0XHRcdFx0b3BlbjogbmV3T3Blbixcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH1cblxuXHQvKlxuXHQgKiBDaGVjayBpZiB0aGUgY3VycmVudCBzZXJ2ZXIgdGltZSAodXRjKSBpcyB3aXRoaW4gdGhlIG9mZmljZSBob3VycyBvZiB0aGF0IGRheVxuXHQgKiByZXR1cm5zIHRydWUgb3IgZmFsc2Vcblx0ICovXG5cdGlzTm93V2l0aGluSG91cnMoKSB7XG5cdFx0Ly8gZ2V0IGN1cnJlbnQgdGltZSBvbiBzZXJ2ZXIgaW4gdXRjXG5cdFx0Ly8gdmFyIGN0ID0gbW9tZW50KCkudXRjKCk7XG5cdFx0Y29uc3QgY3VycmVudFRpbWUgPSBtb21lbnQudXRjKG1vbWVudCgpLnV0YygpLmZvcm1hdCgnZGRkZDpISDptbScpLCAnZGRkZDpISDptbScpO1xuXG5cdFx0Ly8gZ2V0IHRvZGF5cyBvZmZpY2UgaG91cnMgZnJvbSBkYlxuXHRcdGNvbnN0IHRvZGF5c09mZmljZUhvdXJzID0gdGhpcy5maW5kT25lKHsgZGF5OiBjdXJyZW50VGltZS5mb3JtYXQoJ2RkZGQnKSB9KTtcblx0XHRpZiAoIXRvZGF5c09mZmljZUhvdXJzKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gY2hlY2sgaWYgb2ZmaWNlcyBhcmUgb3BlbiB0b2RheVxuXHRcdGlmICh0b2RheXNPZmZpY2VIb3Vycy5vcGVuID09PSBmYWxzZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNvbnN0IHN0YXJ0ID0gbW9tZW50LnV0YyhgJHsgdG9kYXlzT2ZmaWNlSG91cnMuZGF5IH06JHsgdG9kYXlzT2ZmaWNlSG91cnMuc3RhcnQgfWAsICdkZGRkOkhIOm1tJyk7XG5cdFx0Y29uc3QgZmluaXNoID0gbW9tZW50LnV0YyhgJHsgdG9kYXlzT2ZmaWNlSG91cnMuZGF5IH06JHsgdG9kYXlzT2ZmaWNlSG91cnMuZmluaXNoIH1gLCAnZGRkZDpISDptbScpO1xuXG5cdFx0Ly8gY29uc29sZS5sb2coZmluaXNoLmlzQmVmb3JlKHN0YXJ0KSk7XG5cdFx0aWYgKGZpbmlzaC5pc0JlZm9yZShzdGFydCkpIHtcblx0XHRcdC8vIGZpbmlzaC5kYXkoZmluaXNoLmRheSgpKzEpO1xuXHRcdFx0ZmluaXNoLmFkZCgxLCAnZGF5cycpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJlc3VsdCA9IGN1cnJlbnRUaW1lLmlzQmV0d2VlbihzdGFydCwgZmluaXNoKTtcblxuXHRcdC8vIGluQmV0d2VlbiAgY2hlY2tcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0aXNPcGVuaW5nVGltZSgpIHtcblx0XHQvLyBnZXQgY3VycmVudCB0aW1lIG9uIHNlcnZlciBpbiB1dGNcblx0XHRjb25zdCBjdXJyZW50VGltZSA9IG1vbWVudC51dGMobW9tZW50KCkudXRjKCkuZm9ybWF0KCdkZGRkOkhIOm1tJyksICdkZGRkOkhIOm1tJyk7XG5cblx0XHQvLyBnZXQgdG9kYXlzIG9mZmljZSBob3VycyBmcm9tIGRiXG5cdFx0Y29uc3QgdG9kYXlzT2ZmaWNlSG91cnMgPSB0aGlzLmZpbmRPbmUoeyBkYXk6IGN1cnJlbnRUaW1lLmZvcm1hdCgnZGRkZCcpIH0pO1xuXHRcdGlmICghdG9kYXlzT2ZmaWNlSG91cnMpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBjaGVjayBpZiBvZmZpY2VzIGFyZSBvcGVuIHRvZGF5XG5cdFx0aWYgKHRvZGF5c09mZmljZUhvdXJzLm9wZW4gPT09IGZhbHNlKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc3RhcnQgPSBtb21lbnQudXRjKGAkeyB0b2RheXNPZmZpY2VIb3Vycy5kYXkgfTokeyB0b2RheXNPZmZpY2VIb3Vycy5zdGFydCB9YCwgJ2RkZGQ6SEg6bW0nKTtcblxuXHRcdHJldHVybiBzdGFydC5pc1NhbWUoY3VycmVudFRpbWUsICdtaW51dGUnKTtcblx0fVxuXG5cdGlzQ2xvc2luZ1RpbWUoKSB7XG5cdFx0Ly8gZ2V0IGN1cnJlbnQgdGltZSBvbiBzZXJ2ZXIgaW4gdXRjXG5cdFx0Y29uc3QgY3VycmVudFRpbWUgPSBtb21lbnQudXRjKG1vbWVudCgpLnV0YygpLmZvcm1hdCgnZGRkZDpISDptbScpLCAnZGRkZDpISDptbScpO1xuXG5cdFx0Ly8gZ2V0IHRvZGF5cyBvZmZpY2UgaG91cnMgZnJvbSBkYlxuXHRcdGNvbnN0IHRvZGF5c09mZmljZUhvdXJzID0gdGhpcy5maW5kT25lKHsgZGF5OiBjdXJyZW50VGltZS5mb3JtYXQoJ2RkZGQnKSB9KTtcblx0XHRpZiAoIXRvZGF5c09mZmljZUhvdXJzKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmluaXNoID0gbW9tZW50LnV0YyhgJHsgdG9kYXlzT2ZmaWNlSG91cnMuZGF5IH06JHsgdG9kYXlzT2ZmaWNlSG91cnMuZmluaXNoIH1gLCAnZGRkZDpISDptbScpO1xuXG5cdFx0cmV0dXJuIGZpbmlzaC5pc1NhbWUoY3VycmVudFRpbWUsICdtaW51dGUnKTtcblx0fVxufVxuXG5Sb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdE9mZmljZUhvdXIgPSBuZXcgTGl2ZWNoYXRPZmZpY2VIb3VyKCk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcblxuY2xhc3MgTGl2ZWNoYXRWaXNpdG9ycyBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ2xpdmVjaGF0X3Zpc2l0b3InKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHZXRzIHZpc2l0b3IgYnkgdG9rZW5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRva2VuIC0gVmlzaXRvciB0b2tlblxuXHQgKi9cblx0Z2V0VmlzaXRvckJ5VG9rZW4odG9rZW4sIG9wdGlvbnMpIHtcblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdHRva2VuLFxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kT25lKHF1ZXJ5LCBvcHRpb25zKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBGaW5kIHZpc2l0b3JzIGJ5IF9pZFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdG9rZW4gLSBWaXNpdG9yIHRva2VuXG5cdCAqL1xuXHRmaW5kQnlJZChfaWQsIG9wdGlvbnMpIHtcblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdF9pZCxcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHQvKipcblx0ICogR2V0cyB2aXNpdG9yIGJ5IHRva2VuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0b2tlbiAtIFZpc2l0b3IgdG9rZW5cblx0ICovXG5cdGZpbmRWaXNpdG9yQnlUb2tlbih0b2tlbikge1xuXHRcdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdFx0dG9rZW4sXG5cdFx0fTtcblxuXHRcdHJldHVybiB0aGlzLmZpbmQocXVlcnkpO1xuXHR9XG5cblx0dXBkYXRlTGl2ZWNoYXREYXRhQnlUb2tlbih0b2tlbiwga2V5LCB2YWx1ZSwgb3ZlcndyaXRlID0gdHJ1ZSkge1xuXHRcdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdFx0dG9rZW4sXG5cdFx0fTtcblxuXHRcdGlmICghb3ZlcndyaXRlKSB7XG5cdFx0XHRjb25zdCB1c2VyID0gdGhpcy5maW5kT25lKHF1ZXJ5LCB7IGZpZWxkczogeyBsaXZlY2hhdERhdGE6IDEgfSB9KTtcblx0XHRcdGlmICh1c2VyLmxpdmVjaGF0RGF0YSAmJiB0eXBlb2YgdXNlci5saXZlY2hhdERhdGFba2V5XSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHRbYGxpdmVjaGF0RGF0YS4keyBrZXkgfWBdOiB2YWx1ZSxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBGaW5kIGEgdmlzaXRvciBieSB0aGVpciBwaG9uZSBudW1iZXJcblx0ICogQHJldHVybiB7b2JqZWN0fSBVc2VyIGZyb20gZGJcblx0ICovXG5cdGZpbmRPbmVWaXNpdG9yQnlQaG9uZShwaG9uZSkge1xuXHRcdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdFx0J3Bob25lLnBob25lTnVtYmVyJzogcGhvbmUsXG5cdFx0fTtcblxuXHRcdHJldHVybiB0aGlzLmZpbmRPbmUocXVlcnkpO1xuXHR9XG5cblx0Z2V0VmlzaXRvcnNCZXR3ZWVuRGF0ZShkYXRlKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHRfdXBkYXRlZEF0OiB7XG5cdFx0XHRcdCRndGU6IGRhdGUuZ3RlLFx0Ly8gSVNPIERhdGUsIHRzID49IGRhdGUuZ3RlXG5cdFx0XHRcdCRsdDogZGF0ZS5sdCxcdC8vIElTT0RhdGUsIHRzIDwgZGF0ZS5sdFxuXHRcdFx0fSxcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cdH1cblxuXHQvKipcblx0ICogR2V0IHRoZSBuZXh0IHZpc2l0b3IgbmFtZVxuXHQgKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBuZXh0IHZpc2l0b3IgbmFtZVxuXHQgKi9cblx0Z2V0TmV4dFZpc2l0b3JVc2VybmFtZSgpIHtcblx0XHRjb25zdCBzZXR0aW5nc1JhdyA9IFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLm1vZGVsLnJhd0NvbGxlY3Rpb24oKTtcblx0XHRjb25zdCBmaW5kQW5kTW9kaWZ5ID0gTWV0ZW9yLndyYXBBc3luYyhzZXR0aW5nc1Jhdy5maW5kQW5kTW9kaWZ5LCBzZXR0aW5nc1Jhdyk7XG5cblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdF9pZDogJ0xpdmVjaGF0X2d1ZXN0X2NvdW50Jyxcblx0XHR9O1xuXG5cdFx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdFx0JGluYzoge1xuXHRcdFx0XHR2YWx1ZTogMSxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdGNvbnN0IGxpdmVjaGF0Q291bnQgPSBmaW5kQW5kTW9kaWZ5KHF1ZXJ5LCBudWxsLCB1cGRhdGUpO1xuXG5cdFx0cmV0dXJuIGBndWVzdC0keyBsaXZlY2hhdENvdW50LnZhbHVlLnZhbHVlICsgMSB9YDtcblx0fVxuXG5cdHVwZGF0ZUJ5SWQoX2lkLCB1cGRhdGUpIHtcblx0XHRyZXR1cm4gdGhpcy51cGRhdGUoeyBfaWQgfSwgdXBkYXRlKTtcblx0fVxuXG5cdHNhdmVHdWVzdEJ5SWQoX2lkLCBkYXRhKSB7XG5cdFx0Y29uc3Qgc2V0RGF0YSA9IHt9O1xuXHRcdGNvbnN0IHVuc2V0RGF0YSA9IHt9O1xuXG5cdFx0aWYgKGRhdGEubmFtZSkge1xuXHRcdFx0aWYgKCFfLmlzRW1wdHkocy50cmltKGRhdGEubmFtZSkpKSB7XG5cdFx0XHRcdHNldERhdGEubmFtZSA9IHMudHJpbShkYXRhLm5hbWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dW5zZXREYXRhLm5hbWUgPSAxO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChkYXRhLmVtYWlsKSB7XG5cdFx0XHRpZiAoIV8uaXNFbXB0eShzLnRyaW0oZGF0YS5lbWFpbCkpKSB7XG5cdFx0XHRcdHNldERhdGEudmlzaXRvckVtYWlscyA9IFtcblx0XHRcdFx0XHR7IGFkZHJlc3M6IHMudHJpbShkYXRhLmVtYWlsKSB9LFxuXHRcdFx0XHRdO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dW5zZXREYXRhLnZpc2l0b3JFbWFpbHMgPSAxO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChkYXRhLnBob25lKSB7XG5cdFx0XHRpZiAoIV8uaXNFbXB0eShzLnRyaW0oZGF0YS5waG9uZSkpKSB7XG5cdFx0XHRcdHNldERhdGEucGhvbmUgPSBbXG5cdFx0XHRcdFx0eyBwaG9uZU51bWJlcjogcy50cmltKGRhdGEucGhvbmUpIH0sXG5cdFx0XHRcdF07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR1bnNldERhdGEucGhvbmUgPSAxO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNvbnN0IHVwZGF0ZSA9IHt9O1xuXG5cdFx0aWYgKCFfLmlzRW1wdHkoc2V0RGF0YSkpIHtcblx0XHRcdHVwZGF0ZS4kc2V0ID0gc2V0RGF0YTtcblx0XHR9XG5cblx0XHRpZiAoIV8uaXNFbXB0eSh1bnNldERhdGEpKSB7XG5cdFx0XHR1cGRhdGUuJHVuc2V0ID0gdW5zZXREYXRhO1xuXHRcdH1cblxuXHRcdGlmIChfLmlzRW1wdHkodXBkYXRlKSkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKHsgX2lkIH0sIHVwZGF0ZSk7XG5cdH1cblxuXHRmaW5kT25lR3Vlc3RCeUVtYWlsQWRkcmVzcyhlbWFpbEFkZHJlc3MpIHtcblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdCd2aXNpdG9yRW1haWxzLmFkZHJlc3MnOiBuZXcgUmVnRXhwKGBeJHsgcy5lc2NhcGVSZWdFeHAoZW1haWxBZGRyZXNzKSB9JGAsICdpJyksXG5cdFx0fTtcblxuXHRcdHJldHVybiB0aGlzLmZpbmRPbmUocXVlcnkpO1xuXHR9XG5cblx0c2F2ZUd1ZXN0RW1haWxQaG9uZUJ5SWQoX2lkLCBlbWFpbHMsIHBob25lcykge1xuXHRcdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHRcdCRhZGRUb1NldDoge30sXG5cdFx0fTtcblxuXHRcdGNvbnN0IHNhdmVFbWFpbCA9IFtdLmNvbmNhdChlbWFpbHMpXG5cdFx0XHQuZmlsdGVyKChlbWFpbCkgPT4gZW1haWwgJiYgZW1haWwudHJpbSgpKVxuXHRcdFx0Lm1hcCgoZW1haWwpID0+ICh7IGFkZHJlc3M6IGVtYWlsIH0pKTtcblxuXHRcdGlmIChzYXZlRW1haWwubGVuZ3RoID4gMCkge1xuXHRcdFx0dXBkYXRlLiRhZGRUb1NldC52aXNpdG9yRW1haWxzID0geyAkZWFjaDogc2F2ZUVtYWlsIH07XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2F2ZVBob25lID0gW10uY29uY2F0KHBob25lcylcblx0XHRcdC5maWx0ZXIoKHBob25lKSA9PiBwaG9uZSAmJiBwaG9uZS50cmltKCkucmVwbGFjZSgvW15cXGRdL2csICcnKSlcblx0XHRcdC5tYXAoKHBob25lKSA9PiAoeyBwaG9uZU51bWJlcjogcGhvbmUgfSkpO1xuXG5cdFx0aWYgKHNhdmVQaG9uZS5sZW5ndGggPiAwKSB7XG5cdFx0XHR1cGRhdGUuJGFkZFRvU2V0LnBob25lID0geyAkZWFjaDogc2F2ZVBob25lIH07XG5cdFx0fVxuXG5cdFx0aWYgKCF1cGRhdGUuJGFkZFRvU2V0LnZpc2l0b3JFbWFpbHMgJiYgIXVwZGF0ZS4kYWRkVG9TZXQucGhvbmUpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy51cGRhdGUoeyBfaWQgfSwgdXBkYXRlKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgTGl2ZWNoYXRWaXNpdG9ycygpO1xuIiwiaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnO1xuXG4vKipcbiAqIHJldHVybiByZWFkYWJsZSB0aW1lIGZvcm1hdCBmcm9tIHNlY29uZHNcbiAqIEBwYXJhbSAge0RvdWJsZX0gc2VjIHNlY29uZHNcbiAqIEByZXR1cm4ge1N0cmluZ30gICAgIFJlYWRhYmxlIHN0cmluZyBmb3JtYXRcbiAqL1xuY29uc3Qgc2Vjb25kc1RvSEhNTVNTID0gKHNlYykgPT4ge1xuXHRzZWMgPSBwYXJzZUZsb2F0KHNlYyk7XG5cblx0bGV0IGhvdXJzID0gTWF0aC5mbG9vcihzZWMgLyAzNjAwKTtcblx0bGV0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKChzZWMgLSAoaG91cnMgKiAzNjAwKSkgLyA2MCk7XG5cdGxldCBzZWNvbmRzID0gTWF0aC5yb3VuZChzZWMgLSAoaG91cnMgKiAzNjAwKSAtIChtaW51dGVzICogNjApKTtcblxuXHRpZiAoaG91cnMgPCAxMCkgeyBob3VycyA9IGAwJHsgaG91cnMgfWA7IH1cblx0aWYgKG1pbnV0ZXMgPCAxMCkgeyBtaW51dGVzID0gYDAkeyBtaW51dGVzIH1gOyB9XG5cdGlmIChzZWNvbmRzIDwgMTApIHsgc2Vjb25kcyA9IGAwJHsgc2Vjb25kcyB9YDsgfVxuXG5cdGlmIChob3VycyA+IDApIHtcblx0XHRyZXR1cm4gYCR7IGhvdXJzIH06JHsgbWludXRlcyB9OiR7IHNlY29uZHMgfWA7XG5cdH1cblx0aWYgKG1pbnV0ZXMgPiAwKSB7XG5cdFx0cmV0dXJuIGAkeyBtaW51dGVzIH06JHsgc2Vjb25kcyB9YDtcblx0fVxuXHRyZXR1cm4gc2VjO1xufTtcblxuZXhwb3J0IGNvbnN0IEFuYWx5dGljcyA9IHtcblx0Z2V0QWdlbnRPdmVydmlld0RhdGEob3B0aW9ucykge1xuXHRcdGNvbnN0IGZyb20gPSBtb21lbnQob3B0aW9ucy5kYXRlcmFuZ2UuZnJvbSk7XG5cdFx0Y29uc3QgdG8gPSBtb21lbnQob3B0aW9ucy5kYXRlcmFuZ2UudG8pO1xuXG5cdFx0aWYgKCEobW9tZW50KGZyb20pLmlzVmFsaWQoKSAmJiBtb21lbnQodG8pLmlzVmFsaWQoKSkpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdsaXZlY2hhdDpnZXRBZ2VudE92ZXJ2aWV3RGF0YSA9PiBJbnZhbGlkIGRhdGVzJyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKCF0aGlzLkFnZW50T3ZlcnZpZXdEYXRhW29wdGlvbnMuY2hhcnRPcHRpb25zLm5hbWVdKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhgTWV0aG9kIFJvY2tldENoYXQuTGl2ZWNoYXQuQW5hbHl0aWNzLkFnZW50T3ZlcnZpZXdEYXRhLiR7IG9wdGlvbnMuY2hhcnRPcHRpb25zLm5hbWUgfSBkb2VzIE5PVCBleGlzdGApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLkFnZW50T3ZlcnZpZXdEYXRhW29wdGlvbnMuY2hhcnRPcHRpb25zLm5hbWVdKGZyb20sIHRvKTtcblx0fSxcblxuXHRnZXRBbmFseXRpY3NDaGFydERhdGEob3B0aW9ucykge1xuXHRcdC8vIENoZWNrIGlmIGZ1bmN0aW9uIGV4aXN0cywgcHJldmVudCBzZXJ2ZXIgZXJyb3IgaW4gY2FzZSBwcm9wZXJ0eSBhbHRlcmVkXG5cdFx0aWYgKCF0aGlzLkNoYXJ0RGF0YVtvcHRpb25zLmNoYXJ0T3B0aW9ucy5uYW1lXSkge1xuXHRcdFx0Y29uc29sZS5sb2coYE1ldGhvZCBSb2NrZXRDaGF0LkxpdmVjaGF0LkFuYWx5dGljcy5DaGFydERhdGEuJHsgb3B0aW9ucy5jaGFydE9wdGlvbnMubmFtZSB9IGRvZXMgTk9UIGV4aXN0YCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgZnJvbSA9IG1vbWVudChvcHRpb25zLmRhdGVyYW5nZS5mcm9tKTtcblx0XHRjb25zdCB0byA9IG1vbWVudChvcHRpb25zLmRhdGVyYW5nZS50byk7XG5cblx0XHRpZiAoIShtb21lbnQoZnJvbSkuaXNWYWxpZCgpICYmIG1vbWVudCh0bykuaXNWYWxpZCgpKSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2xpdmVjaGF0OmdldEFuYWx5dGljc0NoYXJ0RGF0YSA9PiBJbnZhbGlkIGRhdGVzJyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cblx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0Y2hhcnRMYWJlbDogb3B0aW9ucy5jaGFydE9wdGlvbnMubmFtZSxcblx0XHRcdGRhdGFMYWJlbHM6IFtdLFxuXHRcdFx0ZGF0YVBvaW50czogW10sXG5cdFx0fTtcblxuXHRcdGlmIChmcm9tLmRpZmYodG8pID09PSAwKSB7XHQvLyBkYXRhIGZvciBzaW5nbGUgZGF5XG5cdFx0XHRmb3IgKGxldCBtID0gbW9tZW50KGZyb20pOyBtLmRpZmYodG8sICdkYXlzJykgPD0gMDsgbS5hZGQoMSwgJ2hvdXJzJykpIHtcblx0XHRcdFx0Y29uc3QgaG91ciA9IG0uZm9ybWF0KCdIJyk7XG5cdFx0XHRcdGRhdGEuZGF0YUxhYmVscy5wdXNoKGAkeyBtb21lbnQoaG91ciwgWydIJ10pLmZvcm1hdCgnaEEnKSB9LSR7IG1vbWVudCgocGFyc2VJbnQoaG91cikgKyAxKSAlIDI0LCBbJ0gnXSkuZm9ybWF0KCdoQScpIH1gKTtcblxuXHRcdFx0XHRjb25zdCBkYXRlID0ge1xuXHRcdFx0XHRcdGd0ZTogbSxcblx0XHRcdFx0XHRsdDogbW9tZW50KG0pLmFkZCgxLCAnaG91cnMnKSxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRkYXRhLmRhdGFQb2ludHMucHVzaCh0aGlzLkNoYXJ0RGF0YVtvcHRpb25zLmNoYXJ0T3B0aW9ucy5uYW1lXShkYXRlKSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZvciAobGV0IG0gPSBtb21lbnQoZnJvbSk7IG0uZGlmZih0bywgJ2RheXMnKSA8PSAwOyBtLmFkZCgxLCAnZGF5cycpKSB7XG5cdFx0XHRcdGRhdGEuZGF0YUxhYmVscy5wdXNoKG0uZm9ybWF0KCdNL0QnKSk7XG5cblx0XHRcdFx0Y29uc3QgZGF0ZSA9IHtcblx0XHRcdFx0XHRndGU6IG0sXG5cdFx0XHRcdFx0bHQ6IG1vbWVudChtKS5hZGQoMSwgJ2RheXMnKSxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRkYXRhLmRhdGFQb2ludHMucHVzaCh0aGlzLkNoYXJ0RGF0YVtvcHRpb25zLmNoYXJ0T3B0aW9ucy5uYW1lXShkYXRlKSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRhdGE7XG5cdH0sXG5cblx0Z2V0QW5hbHl0aWNzT3ZlcnZpZXdEYXRhKG9wdGlvbnMpIHtcblx0XHRjb25zdCBmcm9tID0gbW9tZW50KG9wdGlvbnMuZGF0ZXJhbmdlLmZyb20pO1xuXHRcdGNvbnN0IHRvID0gbW9tZW50KG9wdGlvbnMuZGF0ZXJhbmdlLnRvKTtcblxuXHRcdGlmICghKG1vbWVudChmcm9tKS5pc1ZhbGlkKCkgJiYgbW9tZW50KHRvKS5pc1ZhbGlkKCkpKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbGl2ZWNoYXQ6Z2V0QW5hbHl0aWNzT3ZlcnZpZXdEYXRhID0+IEludmFsaWQgZGF0ZXMnKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAoIXRoaXMuT3ZlcnZpZXdEYXRhW29wdGlvbnMuYW5hbHl0aWNzT3B0aW9ucy5uYW1lXSkge1xuXHRcdFx0Y29uc29sZS5sb2coYE1ldGhvZCBSb2NrZXRDaGF0LkxpdmVjaGF0LkFuYWx5dGljcy5PdmVydmlld0RhdGEuJHsgb3B0aW9ucy5hbmFseXRpY3NPcHRpb25zLm5hbWUgfSBkb2VzIE5PVCBleGlzdGApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLk92ZXJ2aWV3RGF0YVtvcHRpb25zLmFuYWx5dGljc09wdGlvbnMubmFtZV0oZnJvbSwgdG8pO1xuXHR9LFxuXG5cdENoYXJ0RGF0YToge1xuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtPYmplY3R9IGRhdGUge2d0ZToge0RhdGV9LCBsdDoge0RhdGV9fVxuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge0ludGVnZXJ9XG5cdFx0ICovXG5cdFx0VG90YWxfY29udmVyc2F0aW9ucyhkYXRlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZ2V0VG90YWxDb252ZXJzYXRpb25zQmV0d2VlbkRhdGUoJ2wnLCBkYXRlKTtcblx0XHR9LFxuXG5cdFx0QXZnX2NoYXRfZHVyYXRpb24oZGF0ZSkge1xuXHRcdFx0bGV0IHRvdGFsID0gMDtcblx0XHRcdGxldCBjb3VudCA9IDA7XG5cblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmdldEFuYWx5dGljc01ldHJpY3NCZXR3ZWVuRGF0ZSgnbCcsIGRhdGUpLmZvckVhY2goKHsgbWV0cmljcyB9KSA9PiB7XG5cdFx0XHRcdGlmIChtZXRyaWNzICYmIG1ldHJpY3MuY2hhdER1cmF0aW9uKSB7XG5cdFx0XHRcdFx0dG90YWwgKz0gbWV0cmljcy5jaGF0RHVyYXRpb247XG5cdFx0XHRcdFx0Y291bnQrKztcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IGF2Z0NEID0gKGNvdW50KSA/IHRvdGFsIC8gY291bnQgOiAwO1xuXHRcdFx0cmV0dXJuIE1hdGgucm91bmQoYXZnQ0QgKiAxMDApIC8gMTAwO1xuXHRcdH0sXG5cblx0XHRUb3RhbF9tZXNzYWdlcyhkYXRlKSB7XG5cdFx0XHRsZXQgdG90YWwgPSAwO1xuXG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5nZXRBbmFseXRpY3NNZXRyaWNzQmV0d2VlbkRhdGUoJ2wnLCBkYXRlKS5mb3JFYWNoKCh7IG1zZ3MgfSkgPT4ge1xuXHRcdFx0XHRpZiAobXNncykge1xuXHRcdFx0XHRcdHRvdGFsICs9IG1zZ3M7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gdG90YWw7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtPYmplY3R9IGRhdGUge2d0ZToge0RhdGV9LCBsdDoge0RhdGV9fVxuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge0RvdWJsZX1cblx0XHQgKi9cblx0XHRBdmdfZmlyc3RfcmVzcG9uc2VfdGltZShkYXRlKSB7XG5cdFx0XHRsZXQgZnJ0ID0gMDtcblx0XHRcdGxldCBjb3VudCA9IDA7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5nZXRBbmFseXRpY3NNZXRyaWNzQmV0d2VlbkRhdGUoJ2wnLCBkYXRlKS5mb3JFYWNoKCh7IG1ldHJpY3MgfSkgPT4ge1xuXHRcdFx0XHRpZiAobWV0cmljcyAmJiBtZXRyaWNzLnJlc3BvbnNlICYmIG1ldHJpY3MucmVzcG9uc2UuZnQpIHtcblx0XHRcdFx0XHRmcnQgKz0gbWV0cmljcy5yZXNwb25zZS5mdDtcblx0XHRcdFx0XHRjb3VudCsrO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgYXZnRnJ0ID0gKGNvdW50KSA/IGZydCAvIGNvdW50IDogMDtcblx0XHRcdHJldHVybiBNYXRoLnJvdW5kKGF2Z0ZydCAqIDEwMCkgLyAxMDA7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtPYmplY3R9IGRhdGUge2d0ZToge0RhdGV9LCBsdDoge0RhdGV9fVxuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge0RvdWJsZX1cblx0XHQgKi9cblx0XHRCZXN0X2ZpcnN0X3Jlc3BvbnNlX3RpbWUoZGF0ZSkge1xuXHRcdFx0bGV0IG1heEZydDtcblxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZ2V0QW5hbHl0aWNzTWV0cmljc0JldHdlZW5EYXRlKCdsJywgZGF0ZSkuZm9yRWFjaCgoeyBtZXRyaWNzIH0pID0+IHtcblx0XHRcdFx0aWYgKG1ldHJpY3MgJiYgbWV0cmljcy5yZXNwb25zZSAmJiBtZXRyaWNzLnJlc3BvbnNlLmZ0KSB7XG5cdFx0XHRcdFx0bWF4RnJ0ID0gKG1heEZydCkgPyBNYXRoLm1pbihtYXhGcnQsIG1ldHJpY3MucmVzcG9uc2UuZnQpIDogbWV0cmljcy5yZXNwb25zZS5mdDtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdGlmICghbWF4RnJ0KSB7IG1heEZydCA9IDA7IH1cblxuXHRcdFx0cmV0dXJuIE1hdGgucm91bmQobWF4RnJ0ICogMTAwKSAvIDEwMDtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge09iamVjdH0gZGF0ZSB7Z3RlOiB7RGF0ZX0sIGx0OiB7RGF0ZX19XG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7RG91YmxlfVxuXHRcdCAqL1xuXHRcdEF2Z19yZXNwb25zZV90aW1lKGRhdGUpIHtcblx0XHRcdGxldCBhcnQgPSAwO1xuXHRcdFx0bGV0IGNvdW50ID0gMDtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmdldEFuYWx5dGljc01ldHJpY3NCZXR3ZWVuRGF0ZSgnbCcsIGRhdGUpLmZvckVhY2goKHsgbWV0cmljcyB9KSA9PiB7XG5cdFx0XHRcdGlmIChtZXRyaWNzICYmIG1ldHJpY3MucmVzcG9uc2UgJiYgbWV0cmljcy5yZXNwb25zZS5hdmcpIHtcblx0XHRcdFx0XHRhcnQgKz0gbWV0cmljcy5yZXNwb25zZS5hdmc7XG5cdFx0XHRcdFx0Y291bnQrKztcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IGF2Z0FydCA9IChjb3VudCkgPyBhcnQgLyBjb3VudCA6IDA7XG5cblx0XHRcdHJldHVybiBNYXRoLnJvdW5kKGF2Z0FydCAqIDEwMCkgLyAxMDA7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtPYmplY3R9IGRhdGUge2d0ZToge0RhdGV9LCBsdDoge0RhdGV9fVxuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge0RvdWJsZX1cblx0XHQgKi9cblx0XHRBdmdfcmVhY3Rpb25fdGltZShkYXRlKSB7XG5cdFx0XHRsZXQgYXJudCA9IDA7XG5cdFx0XHRsZXQgY291bnQgPSAwO1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZ2V0QW5hbHl0aWNzTWV0cmljc0JldHdlZW5EYXRlKCdsJywgZGF0ZSkuZm9yRWFjaCgoeyBtZXRyaWNzIH0pID0+IHtcblx0XHRcdFx0aWYgKG1ldHJpY3MgJiYgbWV0cmljcy5yZWFjdGlvbiAmJiBtZXRyaWNzLnJlYWN0aW9uLmZ0KSB7XG5cdFx0XHRcdFx0YXJudCArPSBtZXRyaWNzLnJlYWN0aW9uLmZ0O1xuXHRcdFx0XHRcdGNvdW50Kys7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zdCBhdmdBcm50ID0gKGNvdW50KSA/IGFybnQgLyBjb3VudCA6IDA7XG5cblx0XHRcdHJldHVybiBNYXRoLnJvdW5kKGF2Z0FybnQgKiAxMDApIC8gMTAwO1xuXHRcdH0sXG5cdH0sXG5cblx0T3ZlcnZpZXdEYXRhOiB7XG5cdFx0LyoqXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge01hcH0gbWFwXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJuIHtTdHJpbmd9XG5cdFx0ICovXG5cdFx0Z2V0S2V5SGF2aW5nTWF4VmFsdWUobWFwLCBkZWYpIHtcblx0XHRcdGxldCBtYXhWYWx1ZSA9IDA7XG5cdFx0XHRsZXQgbWF4S2V5ID0gZGVmO1x0Ly8gZGVmYXVsdFxuXG5cdFx0XHRtYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuXHRcdFx0XHRpZiAodmFsdWUgPiBtYXhWYWx1ZSkge1xuXHRcdFx0XHRcdG1heFZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdFx0bWF4S2V5ID0ga2V5O1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIG1heEtleTtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge0RhdGV9IGZyb21cblx0XHQgKiBAcGFyYW0ge0RhdGV9IHRvXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7QXJyYXlbT2JqZWN0XX1cblx0XHQgKi9cblx0XHRDb252ZXJzYXRpb25zKGZyb20sIHRvKSB7XG5cdFx0XHRsZXQgdG90YWxDb252ZXJzYXRpb25zID0gMDsgLy8gVG90YWwgY29udmVyc2F0aW9uc1xuXHRcdFx0bGV0IG9wZW5Db252ZXJzYXRpb25zID0gMDsgLy8gb3BlbiBjb252ZXJzYXRpb25zXG5cdFx0XHRsZXQgdG90YWxNZXNzYWdlcyA9IDA7IC8vIHRvdGFsIG1zZ3Ncblx0XHRcdGNvbnN0IHRvdGFsTWVzc2FnZXNPbldlZWtkYXkgPSBuZXcgTWFwKCk7XHQvLyB0b3RhbCBtZXNzYWdlcyBvbiB3ZWVrZGF5cyBpLmUgTW9uZGF5LCBUdWVzZGF5Li4uXG5cdFx0XHRjb25zdCB0b3RhbE1lc3NhZ2VzSW5Ib3VyID0gbmV3IE1hcCgpO1x0XHQvLyB0b3RhbCBtZXNzYWdlcyBpbiBob3VyIDAsIDEsIC4uLiAyMyBvZiB3ZWVrZGF5XG5cdFx0XHRjb25zdCBkYXlzID0gdG8uZGlmZihmcm9tLCAnZGF5cycpICsgMTtcdFx0Ly8gdG90YWwgZGF5c1xuXG5cdFx0XHRjb25zdCBzdW1tYXJpemUgPSAobSkgPT4gKHsgbWV0cmljcywgbXNncyB9KSA9PiB7XG5cdFx0XHRcdGlmIChtZXRyaWNzICYmICFtZXRyaWNzLmNoYXREdXJhdGlvbikge1xuXHRcdFx0XHRcdG9wZW5Db252ZXJzYXRpb25zKys7XG5cdFx0XHRcdH1cblx0XHRcdFx0dG90YWxNZXNzYWdlcyArPSBtc2dzO1xuXG5cdFx0XHRcdGNvbnN0IHdlZWtkYXkgPSBtLmZvcm1hdCgnZGRkZCcpOyAvLyBAc3RyaW5nOiBNb25kYXksIFR1ZXNkYXkgLi4uXG5cdFx0XHRcdHRvdGFsTWVzc2FnZXNPbldlZWtkYXkuc2V0KHdlZWtkYXksICh0b3RhbE1lc3NhZ2VzT25XZWVrZGF5Lmhhcyh3ZWVrZGF5KSkgPyAodG90YWxNZXNzYWdlc09uV2Vla2RheS5nZXQod2Vla2RheSkgKyBtc2dzKSA6IG1zZ3MpO1xuXHRcdFx0fTtcblxuXHRcdFx0Zm9yIChsZXQgbSA9IG1vbWVudChmcm9tKTsgbS5kaWZmKHRvLCAnZGF5cycpIDw9IDA7IG0uYWRkKDEsICdkYXlzJykpIHtcblx0XHRcdFx0Y29uc3QgZGF0ZSA9IHtcblx0XHRcdFx0XHRndGU6IG0sXG5cdFx0XHRcdFx0bHQ6IG1vbWVudChtKS5hZGQoMSwgJ2RheXMnKSxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5nZXRBbmFseXRpY3NNZXRyaWNzQmV0d2VlbkRhdGUoJ2wnLCBkYXRlKTtcblx0XHRcdFx0dG90YWxDb252ZXJzYXRpb25zICs9IHJlc3VsdC5jb3VudCgpO1xuXG5cdFx0XHRcdHJlc3VsdC5mb3JFYWNoKHN1bW1hcml6ZShtKSk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGJ1c2llc3REYXkgPSB0aGlzLmdldEtleUhhdmluZ01heFZhbHVlKHRvdGFsTWVzc2FnZXNPbldlZWtkYXksICctJyk7IC8vIHJldHVybnMga2V5IHdpdGggbWF4IHZhbHVlXG5cblx0XHRcdC8vIGl0ZXJhdGUgdGhyb3VnaCBhbGwgYnVzaWVzdERheSBpbiBnaXZlbiBkYXRlLXJhbmdlIGFuZCBmaW5kIGJ1c2llc3QgaG91clxuXHRcdFx0Zm9yIChsZXQgbSA9IG1vbWVudChmcm9tKS5kYXkoYnVzaWVzdERheSk7IG0gPD0gdG87IG0uYWRkKDcsICdkYXlzJykpIHtcblx0XHRcdFx0aWYgKG0gPCBmcm9tKSB7IGNvbnRpbnVlOyB9XG5cblx0XHRcdFx0Zm9yIChsZXQgaCA9IG1vbWVudChtKTsgaC5kaWZmKG0sICdkYXlzJykgPD0gMDsgaC5hZGQoMSwgJ2hvdXJzJykpIHtcblx0XHRcdFx0XHRjb25zdCBkYXRlID0ge1xuXHRcdFx0XHRcdFx0Z3RlOiBoLFxuXHRcdFx0XHRcdFx0bHQ6IG1vbWVudChoKS5hZGQoMSwgJ2hvdXJzJyksXG5cdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmdldEFuYWx5dGljc01ldHJpY3NCZXR3ZWVuRGF0ZSgnbCcsIGRhdGUpLmZvckVhY2goKHtcblx0XHRcdFx0XHRcdG1zZ3MsXG5cdFx0XHRcdFx0fSkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc3QgZGF5SG91ciA9IGguZm9ybWF0KCdIJyk7XHRcdC8vIEBpbnQgOiAwLCAxLCAuLi4gMjNcblx0XHRcdFx0XHRcdHRvdGFsTWVzc2FnZXNJbkhvdXIuc2V0KGRheUhvdXIsICh0b3RhbE1lc3NhZ2VzSW5Ib3VyLmhhcyhkYXlIb3VyKSkgPyAodG90YWxNZXNzYWdlc0luSG91ci5nZXQoZGF5SG91cikgKyBtc2dzKSA6IG1zZ3MpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGJ1c2llc3RIb3VyID0gdGhpcy5nZXRLZXlIYXZpbmdNYXhWYWx1ZSh0b3RhbE1lc3NhZ2VzSW5Ib3VyLCAtMSk7XG5cblx0XHRcdGNvbnN0IGRhdGEgPSBbe1xuXHRcdFx0XHR0aXRsZTogJ1RvdGFsX2NvbnZlcnNhdGlvbnMnLFxuXHRcdFx0XHR2YWx1ZTogdG90YWxDb252ZXJzYXRpb25zLFxuXHRcdFx0fSwge1xuXHRcdFx0XHR0aXRsZTogJ09wZW5fY29udmVyc2F0aW9ucycsXG5cdFx0XHRcdHZhbHVlOiBvcGVuQ29udmVyc2F0aW9ucyxcblx0XHRcdH0sIHtcblx0XHRcdFx0dGl0bGU6ICdUb3RhbF9tZXNzYWdlcycsXG5cdFx0XHRcdHZhbHVlOiB0b3RhbE1lc3NhZ2VzLFxuXHRcdFx0fSwge1xuXHRcdFx0XHR0aXRsZTogJ0J1c2llc3RfZGF5Jyxcblx0XHRcdFx0dmFsdWU6IGJ1c2llc3REYXksXG5cdFx0XHR9LCB7XG5cdFx0XHRcdHRpdGxlOiAnQ29udmVyc2F0aW9uc19wZXJfZGF5Jyxcblx0XHRcdFx0dmFsdWU6ICh0b3RhbENvbnZlcnNhdGlvbnMgLyBkYXlzKS50b0ZpeGVkKDIpLFxuXHRcdFx0fSwge1xuXHRcdFx0XHR0aXRsZTogJ0J1c2llc3RfdGltZScsXG5cdFx0XHRcdHZhbHVlOiAoYnVzaWVzdEhvdXIgPiAwKSA/IGAkeyBtb21lbnQoYnVzaWVzdEhvdXIsIFsnSCddKS5mb3JtYXQoJ2hBJykgfS0keyBtb21lbnQoKHBhcnNlSW50KGJ1c2llc3RIb3VyKSArIDEpICUgMjQsIFsnSCddKS5mb3JtYXQoJ2hBJykgfWAgOiAnLScsXG5cdFx0XHR9XTtcblxuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtEYXRlfSBmcm9tXG5cdFx0ICogQHBhcmFtIHtEYXRlfSB0b1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge0FycmF5W09iamVjdF19XG5cdFx0ICovXG5cdFx0UHJvZHVjdGl2aXR5KGZyb20sIHRvKSB7XG5cdFx0XHRsZXQgYXZnUmVzcG9uc2VUaW1lID0gMDtcblx0XHRcdGxldCBmaXJzdFJlc3BvbnNlVGltZSA9IDA7XG5cdFx0XHRsZXQgYXZnUmVhY3Rpb25UaW1lID0gMDtcblx0XHRcdGxldCBjb3VudCA9IDA7XG5cblx0XHRcdGNvbnN0IGRhdGUgPSB7XG5cdFx0XHRcdGd0ZTogZnJvbSxcblx0XHRcdFx0bHQ6IHRvLmFkZCgxLCAnZGF5cycpLFxuXHRcdFx0fTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZ2V0QW5hbHl0aWNzTWV0cmljc0JldHdlZW5EYXRlKCdsJywgZGF0ZSkuZm9yRWFjaCgoe1xuXHRcdFx0XHRtZXRyaWNzLFxuXHRcdFx0fSkgPT4ge1xuXHRcdFx0XHRpZiAobWV0cmljcyAmJiBtZXRyaWNzLnJlc3BvbnNlICYmIG1ldHJpY3MucmVhY3Rpb24pIHtcblx0XHRcdFx0XHRhdmdSZXNwb25zZVRpbWUgKz0gbWV0cmljcy5yZXNwb25zZS5hdmc7XG5cdFx0XHRcdFx0Zmlyc3RSZXNwb25zZVRpbWUgKz0gbWV0cmljcy5yZXNwb25zZS5mdDtcblx0XHRcdFx0XHRhdmdSZWFjdGlvblRpbWUgKz0gbWV0cmljcy5yZWFjdGlvbi5mdDtcblx0XHRcdFx0XHRjb3VudCsrO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKGNvdW50KSB7XG5cdFx0XHRcdGF2Z1Jlc3BvbnNlVGltZSAvPSBjb3VudDtcblx0XHRcdFx0Zmlyc3RSZXNwb25zZVRpbWUgLz0gY291bnQ7XG5cdFx0XHRcdGF2Z1JlYWN0aW9uVGltZSAvPSBjb3VudDtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgZGF0YSA9IFt7XG5cdFx0XHRcdHRpdGxlOiAnQXZnX3Jlc3BvbnNlX3RpbWUnLFxuXHRcdFx0XHR2YWx1ZTogc2Vjb25kc1RvSEhNTVNTKGF2Z1Jlc3BvbnNlVGltZS50b0ZpeGVkKDIpKSxcblx0XHRcdH0sIHtcblx0XHRcdFx0dGl0bGU6ICdBdmdfZmlyc3RfcmVzcG9uc2VfdGltZScsXG5cdFx0XHRcdHZhbHVlOiBzZWNvbmRzVG9ISE1NU1MoZmlyc3RSZXNwb25zZVRpbWUudG9GaXhlZCgyKSksXG5cdFx0XHR9LCB7XG5cdFx0XHRcdHRpdGxlOiAnQXZnX3JlYWN0aW9uX3RpbWUnLFxuXHRcdFx0XHR2YWx1ZTogc2Vjb25kc1RvSEhNTVNTKGF2Z1JlYWN0aW9uVGltZS50b0ZpeGVkKDIpKSxcblx0XHRcdH1dO1xuXG5cdFx0XHRyZXR1cm4gZGF0YTtcblx0XHR9LFxuXHR9LFxuXG5cdEFnZW50T3ZlcnZpZXdEYXRhOiB7XG5cdFx0LyoqXG5cdFx0ICogZG8gb3BlcmF0aW9uIGVxdWl2YWxlbnQgdG8gbWFwW2tleV0gKz0gdmFsdWVcblx0XHQgKlxuXHRcdCAqL1xuXHRcdHVwZGF0ZU1hcChtYXAsIGtleSwgdmFsdWUpIHtcblx0XHRcdG1hcC5zZXQoa2V5LCBtYXAuaGFzKGtleSkgPyAobWFwLmdldChrZXkpICsgdmFsdWUpIDogdmFsdWUpO1xuXHRcdH0sXG5cblx0XHQvKipcblx0XHQgKiBTb3J0IGFycmF5IG9mIG9iamVjdHMgYnkgdmFsdWUgcHJvcGVydHkgb2Ygb2JqZWN0XG5cdFx0ICogQHBhcmFtICB7QXJyYXkoT2JqZWN0KX0gZGF0YVxuXHRcdCAqIEBwYXJhbSAge0Jvb2xlYW59IFtpbnY9ZmFsc2VdIHJldmVyc2Ugc29ydFxuXHRcdCAqL1xuXHRcdHNvcnRCeVZhbHVlKGRhdGEsIGludiA9IGZhbHNlKSB7XG5cdFx0XHRkYXRhLnNvcnQoZnVuY3Rpb24oYSwgYikge1x0XHQvLyBzb3J0IGFycmF5XG5cdFx0XHRcdGlmIChwYXJzZUZsb2F0KGEudmFsdWUpID4gcGFyc2VGbG9hdChiLnZhbHVlKSkge1xuXHRcdFx0XHRcdHJldHVybiAoaW52KSA/IC0xIDogMTtcdFx0Ly8gaWYgaW52LCByZXZlcnNlIHNvcnRcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAocGFyc2VGbG9hdChhLnZhbHVlKSA8IHBhcnNlRmxvYXQoYi52YWx1ZSkpIHtcblx0XHRcdFx0XHRyZXR1cm4gKGludikgPyAxIDogLTE7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIDA7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge0RhdGV9IGZyb21cblx0XHQgKiBAcGFyYW0ge0RhdGV9IHRvXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7QXJyYXkoT2JqZWN0KSwgQXJyYXkoT2JqZWN0KX1cblx0XHQgKi9cblx0XHRUb3RhbF9jb252ZXJzYXRpb25zKGZyb20sIHRvKSB7XG5cdFx0XHRsZXQgdG90YWwgPSAwO1xuXHRcdFx0Y29uc3QgYWdlbnRDb252ZXJzYXRpb25zID0gbmV3IE1hcCgpOyAvLyBzdG9yZXMgdG90YWwgY29udmVyc2F0aW9ucyBmb3IgZWFjaCBhZ2VudFxuXHRcdFx0Y29uc3QgZGF0ZSA9IHtcblx0XHRcdFx0Z3RlOiBmcm9tLFxuXHRcdFx0XHRsdDogdG8uYWRkKDEsICdkYXlzJyksXG5cdFx0XHR9O1xuXG5cdFx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0XHRoZWFkOiBbe1xuXHRcdFx0XHRcdG5hbWU6ICdBZ2VudCcsXG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRuYW1lOiAnJV9vZl9jb252ZXJzYXRpb25zJyxcblx0XHRcdFx0fV0sXG5cdFx0XHRcdGRhdGE6IFtdLFxuXHRcdFx0fTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZ2V0QW5hbHl0aWNzTWV0cmljc0JldHdlZW5EYXRlKCdsJywgZGF0ZSkuZm9yRWFjaCgoe1xuXHRcdFx0XHRzZXJ2ZWRCeSxcblx0XHRcdH0pID0+IHtcblx0XHRcdFx0aWYgKHNlcnZlZEJ5KSB7XG5cdFx0XHRcdFx0dGhpcy51cGRhdGVNYXAoYWdlbnRDb252ZXJzYXRpb25zLCBzZXJ2ZWRCeS51c2VybmFtZSwgMSk7XG5cdFx0XHRcdFx0dG90YWwrKztcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdGFnZW50Q29udmVyc2F0aW9ucy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XHQvLyBjYWxjdWxhdGUgcGVyY2VudGFnZVxuXHRcdFx0XHRjb25zdCBwZXJjZW50YWdlID0gKHZhbHVlIC8gdG90YWwgKiAxMDApLnRvRml4ZWQoMik7XG5cblx0XHRcdFx0ZGF0YS5kYXRhLnB1c2goe1xuXHRcdFx0XHRcdG5hbWU6IGtleSxcblx0XHRcdFx0XHR2YWx1ZTogcGVyY2VudGFnZSxcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5zb3J0QnlWYWx1ZShkYXRhLmRhdGEsIHRydWUpO1x0Ly8gcmV2ZXJzZSBzb3J0IGFycmF5XG5cblx0XHRcdGRhdGEuZGF0YS5mb3JFYWNoKCh2YWx1ZSkgPT4ge1xuXHRcdFx0XHR2YWx1ZS52YWx1ZSA9IGAkeyB2YWx1ZS52YWx1ZSB9JWA7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtEYXRlfSBmcm9tXG5cdFx0ICogQHBhcmFtIHtEYXRlfSB0b1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge0FycmF5KE9iamVjdCksIEFycmF5KE9iamVjdCl9XG5cdFx0ICovXG5cdFx0QXZnX2NoYXRfZHVyYXRpb24oZnJvbSwgdG8pIHtcblx0XHRcdGNvbnN0IGFnZW50Q2hhdER1cmF0aW9ucyA9IG5ldyBNYXAoKTsgLy8gc3RvcmVzIHRvdGFsIGNvbnZlcnNhdGlvbnMgZm9yIGVhY2ggYWdlbnRcblx0XHRcdGNvbnN0IGRhdGUgPSB7XG5cdFx0XHRcdGd0ZTogZnJvbSxcblx0XHRcdFx0bHQ6IHRvLmFkZCgxLCAnZGF5cycpLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdFx0aGVhZDogW3tcblx0XHRcdFx0XHRuYW1lOiAnQWdlbnQnLFxuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0bmFtZTogJ0F2Z19jaGF0X2R1cmF0aW9uJyxcblx0XHRcdFx0fV0sXG5cdFx0XHRcdGRhdGE6IFtdLFxuXHRcdFx0fTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZ2V0QW5hbHl0aWNzTWV0cmljc0JldHdlZW5EYXRlKCdsJywgZGF0ZSkuZm9yRWFjaCgoe1xuXHRcdFx0XHRtZXRyaWNzLFxuXHRcdFx0XHRzZXJ2ZWRCeSxcblx0XHRcdH0pID0+IHtcblx0XHRcdFx0aWYgKHNlcnZlZEJ5ICYmIG1ldHJpY3MgJiYgbWV0cmljcy5jaGF0RHVyYXRpb24pIHtcblx0XHRcdFx0XHRpZiAoYWdlbnRDaGF0RHVyYXRpb25zLmhhcyhzZXJ2ZWRCeS51c2VybmFtZSkpIHtcblx0XHRcdFx0XHRcdGFnZW50Q2hhdER1cmF0aW9ucy5zZXQoc2VydmVkQnkudXNlcm5hbWUsIHtcblx0XHRcdFx0XHRcdFx0Y2hhdER1cmF0aW9uOiBhZ2VudENoYXREdXJhdGlvbnMuZ2V0KHNlcnZlZEJ5LnVzZXJuYW1lKS5jaGF0RHVyYXRpb24gKyBtZXRyaWNzLmNoYXREdXJhdGlvbixcblx0XHRcdFx0XHRcdFx0dG90YWw6IGFnZW50Q2hhdER1cmF0aW9ucy5nZXQoc2VydmVkQnkudXNlcm5hbWUpLnRvdGFsICsgMSxcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRhZ2VudENoYXREdXJhdGlvbnMuc2V0KHNlcnZlZEJ5LnVzZXJuYW1lLCB7XG5cdFx0XHRcdFx0XHRcdGNoYXREdXJhdGlvbjogbWV0cmljcy5jaGF0RHVyYXRpb24sXG5cdFx0XHRcdFx0XHRcdHRvdGFsOiAxLFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0YWdlbnRDaGF0RHVyYXRpb25zLmZvckVhY2goKG9iaiwga2V5KSA9PiB7XHQvLyBjYWxjdWxhdGUgcGVyY2VudGFnZVxuXHRcdFx0XHRjb25zdCBhdmcgPSAob2JqLmNoYXREdXJhdGlvbiAvIG9iai50b3RhbCkudG9GaXhlZCgyKTtcblxuXHRcdFx0XHRkYXRhLmRhdGEucHVzaCh7XG5cdFx0XHRcdFx0bmFtZToga2V5LFxuXHRcdFx0XHRcdHZhbHVlOiBhdmcsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuc29ydEJ5VmFsdWUoZGF0YS5kYXRhLCB0cnVlKTtcdFx0Ly8gcmV2ZXJzZSBzb3J0IGFycmF5XG5cblx0XHRcdGRhdGEuZGF0YS5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdFx0b2JqLnZhbHVlID0gc2Vjb25kc1RvSEhNTVNTKG9iai52YWx1ZSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtEYXRlfSBmcm9tXG5cdFx0ICogQHBhcmFtIHtEYXRlfSB0b1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge0FycmF5KE9iamVjdCksIEFycmF5KE9iamVjdCl9XG5cdFx0ICovXG5cdFx0VG90YWxfbWVzc2FnZXMoZnJvbSwgdG8pIHtcblx0XHRcdGNvbnN0IGFnZW50TWVzc2FnZXMgPSBuZXcgTWFwKCk7IC8vIHN0b3JlcyB0b3RhbCBjb252ZXJzYXRpb25zIGZvciBlYWNoIGFnZW50XG5cdFx0XHRjb25zdCBkYXRlID0ge1xuXHRcdFx0XHRndGU6IGZyb20sXG5cdFx0XHRcdGx0OiB0by5hZGQoMSwgJ2RheXMnKSxcblx0XHRcdH07XG5cblx0XHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHRcdGhlYWQ6IFt7XG5cdFx0XHRcdFx0bmFtZTogJ0FnZW50Jyxcblx0XHRcdFx0fSwge1xuXHRcdFx0XHRcdG5hbWU6ICdUb3RhbF9tZXNzYWdlcycsXG5cdFx0XHRcdH1dLFxuXHRcdFx0XHRkYXRhOiBbXSxcblx0XHRcdH07XG5cblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmdldEFuYWx5dGljc01ldHJpY3NCZXR3ZWVuRGF0ZSgnbCcsIGRhdGUpLmZvckVhY2goKHtcblx0XHRcdFx0c2VydmVkQnksXG5cdFx0XHRcdG1zZ3MsXG5cdFx0XHR9KSA9PiB7XG5cdFx0XHRcdGlmIChzZXJ2ZWRCeSkge1xuXHRcdFx0XHRcdHRoaXMudXBkYXRlTWFwKGFnZW50TWVzc2FnZXMsIHNlcnZlZEJ5LnVzZXJuYW1lLCBtc2dzKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdGFnZW50TWVzc2FnZXMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1x0Ly8gY2FsY3VsYXRlIHBlcmNlbnRhZ2Vcblx0XHRcdFx0ZGF0YS5kYXRhLnB1c2goe1xuXHRcdFx0XHRcdG5hbWU6IGtleSxcblx0XHRcdFx0XHR2YWx1ZSxcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5zb3J0QnlWYWx1ZShkYXRhLmRhdGEsIHRydWUpO1x0XHQvLyByZXZlcnNlIHNvcnQgYXJyYXlcblxuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtEYXRlfSBmcm9tXG5cdFx0ICogQHBhcmFtIHtEYXRlfSB0b1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge0FycmF5KE9iamVjdCksIEFycmF5KE9iamVjdCl9XG5cdFx0ICovXG5cdFx0QXZnX2ZpcnN0X3Jlc3BvbnNlX3RpbWUoZnJvbSwgdG8pIHtcblx0XHRcdGNvbnN0IGFnZW50QXZnUmVzcFRpbWUgPSBuZXcgTWFwKCk7IC8vIHN0b3JlcyBhdmcgcmVzcG9uc2UgdGltZSBmb3IgZWFjaCBhZ2VudFxuXHRcdFx0Y29uc3QgZGF0ZSA9IHtcblx0XHRcdFx0Z3RlOiBmcm9tLFxuXHRcdFx0XHRsdDogdG8uYWRkKDEsICdkYXlzJyksXG5cdFx0XHR9O1xuXG5cdFx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0XHRoZWFkOiBbe1xuXHRcdFx0XHRcdG5hbWU6ICdBZ2VudCcsXG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRuYW1lOiAnQXZnX2ZpcnN0X3Jlc3BvbnNlX3RpbWUnLFxuXHRcdFx0XHR9XSxcblx0XHRcdFx0ZGF0YTogW10sXG5cdFx0XHR9O1xuXG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5nZXRBbmFseXRpY3NNZXRyaWNzQmV0d2VlbkRhdGUoJ2wnLCBkYXRlKS5mb3JFYWNoKCh7XG5cdFx0XHRcdG1ldHJpY3MsXG5cdFx0XHRcdHNlcnZlZEJ5LFxuXHRcdFx0fSkgPT4ge1xuXHRcdFx0XHRpZiAoc2VydmVkQnkgJiYgbWV0cmljcyAmJiBtZXRyaWNzLnJlc3BvbnNlICYmIG1ldHJpY3MucmVzcG9uc2UuZnQpIHtcblx0XHRcdFx0XHRpZiAoYWdlbnRBdmdSZXNwVGltZS5oYXMoc2VydmVkQnkudXNlcm5hbWUpKSB7XG5cdFx0XHRcdFx0XHRhZ2VudEF2Z1Jlc3BUaW1lLnNldChzZXJ2ZWRCeS51c2VybmFtZSwge1xuXHRcdFx0XHRcdFx0XHRmcnQ6IGFnZW50QXZnUmVzcFRpbWUuZ2V0KHNlcnZlZEJ5LnVzZXJuYW1lKS5mcnQgKyBtZXRyaWNzLnJlc3BvbnNlLmZ0LFxuXHRcdFx0XHRcdFx0XHR0b3RhbDogYWdlbnRBdmdSZXNwVGltZS5nZXQoc2VydmVkQnkudXNlcm5hbWUpLnRvdGFsICsgMSxcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRhZ2VudEF2Z1Jlc3BUaW1lLnNldChzZXJ2ZWRCeS51c2VybmFtZSwge1xuXHRcdFx0XHRcdFx0XHRmcnQ6IG1ldHJpY3MucmVzcG9uc2UuZnQsXG5cdFx0XHRcdFx0XHRcdHRvdGFsOiAxLFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0YWdlbnRBdmdSZXNwVGltZS5mb3JFYWNoKChvYmosIGtleSkgPT4ge1x0Ly8gY2FsY3VsYXRlIGF2Z1xuXHRcdFx0XHRjb25zdCBhdmcgPSBvYmouZnJ0IC8gb2JqLnRvdGFsO1xuXG5cdFx0XHRcdGRhdGEuZGF0YS5wdXNoKHtcblx0XHRcdFx0XHRuYW1lOiBrZXksXG5cdFx0XHRcdFx0dmFsdWU6IGF2Zy50b0ZpeGVkKDIpLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLnNvcnRCeVZhbHVlKGRhdGEuZGF0YSwgZmFsc2UpO1x0XHQvLyBzb3J0IGFycmF5XG5cblx0XHRcdGRhdGEuZGF0YS5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdFx0b2JqLnZhbHVlID0gc2Vjb25kc1RvSEhNTVNTKG9iai52YWx1ZSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtEYXRlfSBmcm9tXG5cdFx0ICogQHBhcmFtIHtEYXRlfSB0b1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge0FycmF5KE9iamVjdCksIEFycmF5KE9iamVjdCl9XG5cdFx0ICovXG5cdFx0QmVzdF9maXJzdF9yZXNwb25zZV90aW1lKGZyb20sIHRvKSB7XG5cdFx0XHRjb25zdCBhZ2VudEZpcnN0UmVzcFRpbWUgPSBuZXcgTWFwKCk7IC8vIHN0b3JlcyBhdmcgcmVzcG9uc2UgdGltZSBmb3IgZWFjaCBhZ2VudFxuXHRcdFx0Y29uc3QgZGF0ZSA9IHtcblx0XHRcdFx0Z3RlOiBmcm9tLFxuXHRcdFx0XHRsdDogdG8uYWRkKDEsICdkYXlzJyksXG5cdFx0XHR9O1xuXG5cdFx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0XHRoZWFkOiBbe1xuXHRcdFx0XHRcdG5hbWU6ICdBZ2VudCcsXG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRuYW1lOiAnQmVzdF9maXJzdF9yZXNwb25zZV90aW1lJyxcblx0XHRcdFx0fV0sXG5cdFx0XHRcdGRhdGE6IFtdLFxuXHRcdFx0fTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZ2V0QW5hbHl0aWNzTWV0cmljc0JldHdlZW5EYXRlKCdsJywgZGF0ZSkuZm9yRWFjaCgoe1xuXHRcdFx0XHRtZXRyaWNzLFxuXHRcdFx0XHRzZXJ2ZWRCeSxcblx0XHRcdH0pID0+IHtcblx0XHRcdFx0aWYgKHNlcnZlZEJ5ICYmIG1ldHJpY3MgJiYgbWV0cmljcy5yZXNwb25zZSAmJiBtZXRyaWNzLnJlc3BvbnNlLmZ0KSB7XG5cdFx0XHRcdFx0aWYgKGFnZW50Rmlyc3RSZXNwVGltZS5oYXMoc2VydmVkQnkudXNlcm5hbWUpKSB7XG5cdFx0XHRcdFx0XHRhZ2VudEZpcnN0UmVzcFRpbWUuc2V0KHNlcnZlZEJ5LnVzZXJuYW1lLCBNYXRoLm1pbihhZ2VudEZpcnN0UmVzcFRpbWUuZ2V0KHNlcnZlZEJ5LnVzZXJuYW1lKSwgbWV0cmljcy5yZXNwb25zZS5mdCkpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRhZ2VudEZpcnN0UmVzcFRpbWUuc2V0KHNlcnZlZEJ5LnVzZXJuYW1lLCBtZXRyaWNzLnJlc3BvbnNlLmZ0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRhZ2VudEZpcnN0UmVzcFRpbWUuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1x0Ly8gY2FsY3VsYXRlIGF2Z1xuXHRcdFx0XHRkYXRhLmRhdGEucHVzaCh7XG5cdFx0XHRcdFx0bmFtZToga2V5LFxuXHRcdFx0XHRcdHZhbHVlOiB2YWx1ZS50b0ZpeGVkKDIpLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLnNvcnRCeVZhbHVlKGRhdGEuZGF0YSwgZmFsc2UpO1x0XHQvLyBzb3J0IGFycmF5XG5cblx0XHRcdGRhdGEuZGF0YS5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdFx0b2JqLnZhbHVlID0gc2Vjb25kc1RvSEhNTVNTKG9iai52YWx1ZSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtEYXRlfSBmcm9tXG5cdFx0ICogQHBhcmFtIHtEYXRlfSB0b1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge0FycmF5KE9iamVjdCksIEFycmF5KE9iamVjdCl9XG5cdFx0ICovXG5cdFx0QXZnX3Jlc3BvbnNlX3RpbWUoZnJvbSwgdG8pIHtcblx0XHRcdGNvbnN0IGFnZW50QXZnUmVzcFRpbWUgPSBuZXcgTWFwKCk7IC8vIHN0b3JlcyBhdmcgcmVzcG9uc2UgdGltZSBmb3IgZWFjaCBhZ2VudFxuXHRcdFx0Y29uc3QgZGF0ZSA9IHtcblx0XHRcdFx0Z3RlOiBmcm9tLFxuXHRcdFx0XHRsdDogdG8uYWRkKDEsICdkYXlzJyksXG5cdFx0XHR9O1xuXG5cdFx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0XHRoZWFkOiBbe1xuXHRcdFx0XHRcdG5hbWU6ICdBZ2VudCcsXG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRuYW1lOiAnQXZnX3Jlc3BvbnNlX3RpbWUnLFxuXHRcdFx0XHR9XSxcblx0XHRcdFx0ZGF0YTogW10sXG5cdFx0XHR9O1xuXG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5nZXRBbmFseXRpY3NNZXRyaWNzQmV0d2VlbkRhdGUoJ2wnLCBkYXRlKS5mb3JFYWNoKCh7XG5cdFx0XHRcdG1ldHJpY3MsXG5cdFx0XHRcdHNlcnZlZEJ5LFxuXHRcdFx0fSkgPT4ge1xuXHRcdFx0XHRpZiAoc2VydmVkQnkgJiYgbWV0cmljcyAmJiBtZXRyaWNzLnJlc3BvbnNlICYmIG1ldHJpY3MucmVzcG9uc2UuYXZnKSB7XG5cdFx0XHRcdFx0aWYgKGFnZW50QXZnUmVzcFRpbWUuaGFzKHNlcnZlZEJ5LnVzZXJuYW1lKSkge1xuXHRcdFx0XHRcdFx0YWdlbnRBdmdSZXNwVGltZS5zZXQoc2VydmVkQnkudXNlcm5hbWUsIHtcblx0XHRcdFx0XHRcdFx0YXZnOiBhZ2VudEF2Z1Jlc3BUaW1lLmdldChzZXJ2ZWRCeS51c2VybmFtZSkuYXZnICsgbWV0cmljcy5yZXNwb25zZS5hdmcsXG5cdFx0XHRcdFx0XHRcdHRvdGFsOiBhZ2VudEF2Z1Jlc3BUaW1lLmdldChzZXJ2ZWRCeS51c2VybmFtZSkudG90YWwgKyAxLFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGFnZW50QXZnUmVzcFRpbWUuc2V0KHNlcnZlZEJ5LnVzZXJuYW1lLCB7XG5cdFx0XHRcdFx0XHRcdGF2ZzogbWV0cmljcy5yZXNwb25zZS5hdmcsXG5cdFx0XHRcdFx0XHRcdHRvdGFsOiAxLFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0YWdlbnRBdmdSZXNwVGltZS5mb3JFYWNoKChvYmosIGtleSkgPT4ge1x0Ly8gY2FsY3VsYXRlIGF2Z1xuXHRcdFx0XHRjb25zdCBhdmcgPSBvYmouYXZnIC8gb2JqLnRvdGFsO1xuXG5cdFx0XHRcdGRhdGEuZGF0YS5wdXNoKHtcblx0XHRcdFx0XHRuYW1lOiBrZXksXG5cdFx0XHRcdFx0dmFsdWU6IGF2Zy50b0ZpeGVkKDIpLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLnNvcnRCeVZhbHVlKGRhdGEuZGF0YSwgZmFsc2UpO1x0XHQvLyBzb3J0IGFycmF5XG5cblx0XHRcdGRhdGEuZGF0YS5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdFx0b2JqLnZhbHVlID0gc2Vjb25kc1RvSEhNTVNTKG9iai52YWx1ZSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtEYXRlfSBmcm9tXG5cdFx0ICogQHBhcmFtIHtEYXRlfSB0b1xuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge0FycmF5KE9iamVjdCksIEFycmF5KE9iamVjdCl9XG5cdFx0ICovXG5cdFx0QXZnX3JlYWN0aW9uX3RpbWUoZnJvbSwgdG8pIHtcblx0XHRcdGNvbnN0IGFnZW50QXZnUmVhY3Rpb25UaW1lID0gbmV3IE1hcCgpOyAvLyBzdG9yZXMgYXZnIHJlYWN0aW9uIHRpbWUgZm9yIGVhY2ggYWdlbnRcblx0XHRcdGNvbnN0IGRhdGUgPSB7XG5cdFx0XHRcdGd0ZTogZnJvbSxcblx0XHRcdFx0bHQ6IHRvLmFkZCgxLCAnZGF5cycpLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdFx0aGVhZDogW3tcblx0XHRcdFx0XHRuYW1lOiAnQWdlbnQnLFxuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0bmFtZTogJ0F2Z19yZWFjdGlvbl90aW1lJyxcblx0XHRcdFx0fV0sXG5cdFx0XHRcdGRhdGE6IFtdLFxuXHRcdFx0fTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZ2V0QW5hbHl0aWNzTWV0cmljc0JldHdlZW5EYXRlKCdsJywgZGF0ZSkuZm9yRWFjaCgoe1xuXHRcdFx0XHRtZXRyaWNzLFxuXHRcdFx0XHRzZXJ2ZWRCeSxcblx0XHRcdH0pID0+IHtcblx0XHRcdFx0aWYgKHNlcnZlZEJ5ICYmIG1ldHJpY3MgJiYgbWV0cmljcy5yZWFjdGlvbiAmJiBtZXRyaWNzLnJlYWN0aW9uLmZ0KSB7XG5cdFx0XHRcdFx0aWYgKGFnZW50QXZnUmVhY3Rpb25UaW1lLmhhcyhzZXJ2ZWRCeS51c2VybmFtZSkpIHtcblx0XHRcdFx0XHRcdGFnZW50QXZnUmVhY3Rpb25UaW1lLnNldChzZXJ2ZWRCeS51c2VybmFtZSwge1xuXHRcdFx0XHRcdFx0XHRmcnQ6IGFnZW50QXZnUmVhY3Rpb25UaW1lLmdldChzZXJ2ZWRCeS51c2VybmFtZSkuZnJ0ICsgbWV0cmljcy5yZWFjdGlvbi5mdCxcblx0XHRcdFx0XHRcdFx0dG90YWw6IGFnZW50QXZnUmVhY3Rpb25UaW1lLmdldChzZXJ2ZWRCeS51c2VybmFtZSkudG90YWwgKyAxLFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGFnZW50QXZnUmVhY3Rpb25UaW1lLnNldChzZXJ2ZWRCeS51c2VybmFtZSwge1xuXHRcdFx0XHRcdFx0XHRmcnQ6IG1ldHJpY3MucmVhY3Rpb24uZnQsXG5cdFx0XHRcdFx0XHRcdHRvdGFsOiAxLFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0YWdlbnRBdmdSZWFjdGlvblRpbWUuZm9yRWFjaCgob2JqLCBrZXkpID0+IHtcdC8vIGNhbGN1bGF0ZSBhdmdcblx0XHRcdFx0Y29uc3QgYXZnID0gb2JqLmZydCAvIG9iai50b3RhbDtcblxuXHRcdFx0XHRkYXRhLmRhdGEucHVzaCh7XG5cdFx0XHRcdFx0bmFtZToga2V5LFxuXHRcdFx0XHRcdHZhbHVlOiBhdmcudG9GaXhlZCgyKSxcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5zb3J0QnlWYWx1ZShkYXRhLmRhdGEsIGZhbHNlKTtcdFx0Ly8gc29ydCBhcnJheVxuXG5cdFx0XHRkYXRhLmRhdGEuZm9yRWFjaCgob2JqKSA9PiB7XG5cdFx0XHRcdG9iai52YWx1ZSA9IHNlY29uZHNUb0hITU1TUyhvYmoudmFsdWUpO1xuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBkYXRhO1xuXHRcdH0sXG5cdH0sXG59O1xuIiwiLyogZ2xvYmFscyBIVFRQICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50JztcbmltcG9ydCBkbnMgZnJvbSAnZG5zJztcbmltcG9ydCBVQVBhcnNlciBmcm9tICd1YS1wYXJzZXItanMnO1xuaW1wb3J0ICogYXMgTWFpbGVyIGZyb20gJ21ldGVvci9yb2NrZXRjaGF0Om1haWxlcic7XG5cbmltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcbmltcG9ydCB7IEFuYWx5dGljcyB9IGZyb20gJy4vQW5hbHl0aWNzJztcblxuUm9ja2V0Q2hhdC5MaXZlY2hhdCA9IHtcblx0QW5hbHl0aWNzLFxuXHRoaXN0b3J5TW9uaXRvclR5cGU6ICd1cmwnLFxuXG5cdGxvZ2dlcjogbmV3IExvZ2dlcignTGl2ZWNoYXQnLCB7XG5cdFx0c2VjdGlvbnM6IHtcblx0XHRcdHdlYmhvb2s6ICdXZWJob29rJyxcblx0XHR9LFxuXHR9KSxcblxuXHRnZXROZXh0QWdlbnQoZGVwYXJ0bWVudCkge1xuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfUm91dGluZ19NZXRob2QnKSA9PT0gJ0V4dGVybmFsJykge1xuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCAxMDsgaSsrKSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0Y29uc3QgcXVlcnlTdHJpbmcgPSBkZXBhcnRtZW50ID8gYD9kZXBhcnRtZW50SWQ9JHsgZGVwYXJ0bWVudCB9YCA6ICcnO1xuXHRcdFx0XHRcdGNvbnN0IHJlc3VsdCA9IEhUVFAuY2FsbCgnR0VUJywgYCR7IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9FeHRlcm5hbF9RdWV1ZV9VUkwnKSB9JHsgcXVlcnlTdHJpbmcgfWAsIHtcblx0XHRcdFx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0XHRcdFx0J1VzZXItQWdlbnQnOiAnUm9ja2V0Q2hhdCBTZXJ2ZXInLFxuXHRcdFx0XHRcdFx0XHRBY2NlcHQ6ICdhcHBsaWNhdGlvbi9qc29uJyxcblx0XHRcdFx0XHRcdFx0J1gtUm9ja2V0Q2hhdC1TZWNyZXQtVG9rZW4nOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfRXh0ZXJuYWxfUXVldWVfVG9rZW4nKSxcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRpZiAocmVzdWx0ICYmIHJlc3VsdC5kYXRhICYmIHJlc3VsdC5kYXRhLnVzZXJuYW1lKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBhZ2VudCA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVPbmxpbmVBZ2VudEJ5VXNlcm5hbWUocmVzdWx0LmRhdGEudXNlcm5hbWUpO1xuXG5cdFx0XHRcdFx0XHRpZiAoYWdlbnQpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdFx0XHRhZ2VudElkOiBhZ2VudC5faWQsXG5cdFx0XHRcdFx0XHRcdFx0dXNlcm5hbWU6IGFnZW50LnVzZXJuYW1lLFxuXHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJlcXVlc3RpbmcgYWdlbnQgZnJvbSBleHRlcm5hbCBxdWV1ZS4nLCBlKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm8tYWdlbnQtb25saW5lJywgJ1NvcnJ5LCBubyBvbmxpbmUgYWdlbnRzJyk7XG5cdFx0fSBlbHNlIGlmIChkZXBhcnRtZW50KSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLmdldE5leHRBZ2VudEZvckRlcGFydG1lbnQoZGVwYXJ0bWVudCk7XG5cdFx0fVxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5nZXROZXh0QWdlbnQoKTtcblx0fSxcblx0Z2V0QWdlbnRzKGRlcGFydG1lbnQpIHtcblx0XHRpZiAoZGVwYXJ0bWVudCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cy5maW5kQnlEZXBhcnRtZW50SWQoZGVwYXJ0bWVudCk7XG5cdFx0fVxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kQWdlbnRzKCk7XG5cdH0sXG5cdGdldE9ubGluZUFnZW50cyhkZXBhcnRtZW50KSB7XG5cdFx0aWYgKGRlcGFydG1lbnQpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnRBZ2VudHMuZ2V0T25saW5lRm9yRGVwYXJ0bWVudChkZXBhcnRtZW50KTtcblx0XHR9XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmxpbmVBZ2VudHMoKTtcblx0fSxcblx0Z2V0UmVxdWlyZWREZXBhcnRtZW50KG9ubGluZVJlcXVpcmVkID0gdHJ1ZSkge1xuXHRcdGNvbnN0IGRlcGFydG1lbnRzID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50LmZpbmRFbmFibGVkV2l0aEFnZW50cygpO1xuXG5cdFx0cmV0dXJuIGRlcGFydG1lbnRzLmZldGNoKCkuZmluZCgoZGVwdCkgPT4ge1xuXHRcdFx0aWYgKCFkZXB0LnNob3dPblJlZ2lzdHJhdGlvbikge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIW9ubGluZVJlcXVpcmVkKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3Qgb25saW5lQWdlbnRzID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLmdldE9ubGluZUZvckRlcGFydG1lbnQoZGVwdC5faWQpO1xuXHRcdFx0cmV0dXJuIG9ubGluZUFnZW50cy5jb3VudCgpID4gMDtcblx0XHR9KTtcblx0fSxcblx0Z2V0Um9vbShndWVzdCwgbWVzc2FnZSwgcm9vbUluZm8sIGFnZW50KSB7XG5cdFx0bGV0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChtZXNzYWdlLnJpZCk7XG5cdFx0bGV0IG5ld1Jvb20gPSBmYWxzZTtcblxuXHRcdGlmIChyb29tICYmICFyb29tLm9wZW4pIHtcblx0XHRcdG1lc3NhZ2UucmlkID0gUmFuZG9tLmlkKCk7XG5cdFx0XHRyb29tID0gbnVsbDtcblx0XHR9XG5cblx0XHRpZiAocm9vbSA9PSBudWxsKSB7XG5cdFx0XHQvLyBpZiBubyBkZXBhcnRtZW50IHNlbGVjdGVkIHZlcmlmeSBpZiB0aGVyZSBpcyBhdCBsZWFzdCBvbmUgYWN0aXZlIGFuZCBwaWNrIHRoZSBmaXJzdFxuXHRcdFx0aWYgKCFhZ2VudCAmJiAhZ3Vlc3QuZGVwYXJ0bWVudCkge1xuXHRcdFx0XHRjb25zdCBkZXBhcnRtZW50ID0gdGhpcy5nZXRSZXF1aXJlZERlcGFydG1lbnQoKTtcblxuXHRcdFx0XHRpZiAoZGVwYXJ0bWVudCkge1xuXHRcdFx0XHRcdGd1ZXN0LmRlcGFydG1lbnQgPSBkZXBhcnRtZW50Ll9pZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBkZWxlZ2F0ZSByb29tIGNyZWF0aW9uIHRvIFF1ZXVlTWV0aG9kc1xuXHRcdFx0Y29uc3Qgcm91dGluZ01ldGhvZCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9Sb3V0aW5nX01ldGhvZCcpO1xuXHRcdFx0cm9vbSA9IFJvY2tldENoYXQuUXVldWVNZXRob2RzW3JvdXRpbmdNZXRob2RdKGd1ZXN0LCBtZXNzYWdlLCByb29tSW5mbywgYWdlbnQpO1xuXG5cdFx0XHRuZXdSb29tID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoIXJvb20gfHwgcm9vbS52LnRva2VuICE9PSBndWVzdC50b2tlbikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignY2Fubm90LWFjY2Vzcy1yb29tJyk7XG5cdFx0fVxuXG5cdFx0aWYgKG5ld1Jvb20pIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLnNldFJvb21JZEJ5VG9rZW4oZ3Vlc3QudG9rZW4sIHJvb20uX2lkKTtcblx0XHR9XG5cblx0XHRyZXR1cm4geyByb29tLCBuZXdSb29tIH07XG5cdH0sXG5cblx0c2VuZE1lc3NhZ2UoeyBndWVzdCwgbWVzc2FnZSwgcm9vbUluZm8sIGFnZW50IH0pIHtcblx0XHRjb25zdCB7IHJvb20sIG5ld1Jvb20gfSA9IHRoaXMuZ2V0Um9vbShndWVzdCwgbWVzc2FnZSwgcm9vbUluZm8sIGFnZW50KTtcblx0XHRpZiAoZ3Vlc3QubmFtZSkge1xuXHRcdFx0bWVzc2FnZS5hbGlhcyA9IGd1ZXN0Lm5hbWU7XG5cdFx0fVxuXG5cdFx0Ly8gcmV0dXJuIG1lc3NhZ2VzO1xuXHRcdHJldHVybiBfLmV4dGVuZChSb2NrZXRDaGF0LnNlbmRNZXNzYWdlKGd1ZXN0LCBtZXNzYWdlLCByb29tKSwgeyBuZXdSb29tLCBzaG93Q29ubmVjdGluZzogdGhpcy5zaG93Q29ubmVjdGluZygpIH0pO1xuXHR9LFxuXG5cdHVwZGF0ZU1lc3NhZ2UoeyBndWVzdCwgbWVzc2FnZSB9KSB7XG5cdFx0Y2hlY2sobWVzc2FnZSwgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHsgX2lkOiBTdHJpbmcgfSkpO1xuXG5cdFx0Y29uc3Qgb3JpZ2luYWxNZXNzYWdlID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZUJ5SWQobWVzc2FnZS5faWQpO1xuXHRcdGlmICghb3JpZ2luYWxNZXNzYWdlIHx8ICFvcmlnaW5hbE1lc3NhZ2UuX2lkKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgZWRpdEFsbG93ZWQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWVzc2FnZV9BbGxvd0VkaXRpbmcnKTtcblx0XHRjb25zdCBlZGl0T3duID0gb3JpZ2luYWxNZXNzYWdlLnUgJiYgb3JpZ2luYWxNZXNzYWdlLnUuX2lkID09PSBndWVzdC5faWQ7XG5cblx0XHRpZiAoIWVkaXRBbGxvd2VkIHx8ICFlZGl0T3duKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnTWVzc2FnZSBlZGl0aW5nIG5vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdsaXZlY2hhdFVwZGF0ZU1lc3NhZ2UnIH0pO1xuXHRcdH1cblxuXHRcdFJvY2tldENoYXQudXBkYXRlTWVzc2FnZShtZXNzYWdlLCBndWVzdCk7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcblxuXHRkZWxldGVNZXNzYWdlKHsgZ3Vlc3QsIG1lc3NhZ2UgfSkge1xuXHRcdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7IF9pZDogU3RyaW5nIH0pKTtcblxuXHRcdGNvbnN0IG1zZyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKG1lc3NhZ2UuX2lkKTtcblx0XHRpZiAoIW1zZyB8fCAhbXNnLl9pZCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IGRlbGV0ZUFsbG93ZWQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWVzc2FnZV9BbGxvd0RlbGV0aW5nJyk7XG5cdFx0Y29uc3QgZWRpdE93biA9IG1zZy51ICYmIG1zZy51Ll9pZCA9PT0gZ3Vlc3QuX2lkO1xuXG5cdFx0aWYgKCFkZWxldGVBbGxvd2VkIHx8ICFlZGl0T3duKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnTWVzc2FnZSBkZWxldGluZyBub3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnbGl2ZWNoYXREZWxldGVNZXNzYWdlJyB9KTtcblx0XHR9XG5cblx0XHRSb2NrZXRDaGF0LmRlbGV0ZU1lc3NhZ2UobWVzc2FnZSwgZ3Vlc3QpO1xuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH0sXG5cblx0cmVnaXN0ZXJHdWVzdCh7IHRva2VuLCBuYW1lLCBlbWFpbCwgZGVwYXJ0bWVudCwgcGhvbmUsIHVzZXJuYW1lIH0gPSB7fSkge1xuXHRcdGNoZWNrKHRva2VuLCBTdHJpbmcpO1xuXG5cdFx0bGV0IHVzZXJJZDtcblx0XHRjb25zdCB1cGRhdGVVc2VyID0ge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHR0b2tlbixcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdGNvbnN0IHVzZXIgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRva2VuLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KTtcblxuXHRcdGlmICh1c2VyKSB7XG5cdFx0XHR1c2VySWQgPSB1c2VyLl9pZDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKCF1c2VybmFtZSkge1xuXHRcdFx0XHR1c2VybmFtZSA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0TmV4dFZpc2l0b3JVc2VybmFtZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgZXhpc3RpbmdVc2VyID0gbnVsbDtcblxuXHRcdFx0aWYgKHMudHJpbShlbWFpbCkgIT09ICcnICYmIChleGlzdGluZ1VzZXIgPSBMaXZlY2hhdFZpc2l0b3JzLmZpbmRPbmVHdWVzdEJ5RW1haWxBZGRyZXNzKGVtYWlsKSkpIHtcblx0XHRcdFx0dXNlcklkID0gZXhpc3RpbmdVc2VyLl9pZDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnN0IHVzZXJEYXRhID0ge1xuXHRcdFx0XHRcdHVzZXJuYW1lLFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGlmICh0aGlzLmNvbm5lY3Rpb24pIHtcblx0XHRcdFx0XHR1c2VyRGF0YS51c2VyQWdlbnQgPSB0aGlzLmNvbm5lY3Rpb24uaHR0cEhlYWRlcnNbJ3VzZXItYWdlbnQnXTtcblx0XHRcdFx0XHR1c2VyRGF0YS5pcCA9IHRoaXMuY29ubmVjdGlvbi5odHRwSGVhZGVyc1sneC1yZWFsLWlwJ10gfHwgdGhpcy5jb25uZWN0aW9uLmh0dHBIZWFkZXJzWyd4LWZvcndhcmRlZC1mb3InXSB8fCB0aGlzLmNvbm5lY3Rpb24uY2xpZW50QWRkcmVzcztcblx0XHRcdFx0XHR1c2VyRGF0YS5ob3N0ID0gdGhpcy5jb25uZWN0aW9uLmh0dHBIZWFkZXJzLmhvc3Q7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR1c2VySWQgPSBMaXZlY2hhdFZpc2l0b3JzLmluc2VydCh1c2VyRGF0YSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHBob25lKSB7XG5cdFx0XHR1cGRhdGVVc2VyLiRzZXQucGhvbmUgPSBbXG5cdFx0XHRcdHsgcGhvbmVOdW1iZXI6IHBob25lLm51bWJlciB9LFxuXHRcdFx0XTtcblx0XHR9XG5cblx0XHRpZiAoZW1haWwgJiYgZW1haWwudHJpbSgpICE9PSAnJykge1xuXHRcdFx0dXBkYXRlVXNlci4kc2V0LnZpc2l0b3JFbWFpbHMgPSBbXG5cdFx0XHRcdHsgYWRkcmVzczogZW1haWwgfSxcblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0aWYgKG5hbWUpIHtcblx0XHRcdHVwZGF0ZVVzZXIuJHNldC5uYW1lID0gbmFtZTtcblx0XHR9XG5cblx0XHRpZiAoZGVwYXJ0bWVudCkge1xuXHRcdFx0dXBkYXRlVXNlci4kc2V0LmRlcGFydG1lbnQgPSBkZXBhcnRtZW50O1xuXHRcdH1cblxuXHRcdExpdmVjaGF0VmlzaXRvcnMudXBkYXRlQnlJZCh1c2VySWQsIHVwZGF0ZVVzZXIpO1xuXG5cdFx0cmV0dXJuIHVzZXJJZDtcblx0fSxcblxuXHRzZXREZXBhcnRtZW50Rm9yR3Vlc3QoeyB0b2tlbiwgZGVwYXJ0bWVudCB9ID0ge30pIHtcblx0XHRjaGVjayh0b2tlbiwgU3RyaW5nKTtcblxuXHRcdGNvbnN0IHVwZGF0ZVVzZXIgPSB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdGRlcGFydG1lbnQsXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRjb25zdCB1c2VyID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih0b2tlbiwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cdFx0aWYgKHVzZXIpIHtcblx0XHRcdHJldHVybiBMaXZlY2hhdFZpc2l0b3JzLnVwZGF0ZUJ5SWQodXNlci5faWQsIHVwZGF0ZVVzZXIpO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cblx0c2F2ZUd1ZXN0KHsgX2lkLCBuYW1lLCBlbWFpbCwgcGhvbmUgfSkge1xuXHRcdGNvbnN0IHVwZGF0ZURhdGEgPSB7fTtcblxuXHRcdGlmIChuYW1lKSB7XG5cdFx0XHR1cGRhdGVEYXRhLm5hbWUgPSBuYW1lO1xuXHRcdH1cblx0XHRpZiAoZW1haWwpIHtcblx0XHRcdHVwZGF0ZURhdGEuZW1haWwgPSBlbWFpbDtcblx0XHR9XG5cdFx0aWYgKHBob25lKSB7XG5cdFx0XHR1cGRhdGVEYXRhLnBob25lID0gcGhvbmU7XG5cdFx0fVxuXHRcdGNvbnN0IHJldCA9IExpdmVjaGF0VmlzaXRvcnMuc2F2ZUd1ZXN0QnlJZChfaWQsIHVwZGF0ZURhdGEpO1xuXG5cdFx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLnJ1bignbGl2ZWNoYXQuc2F2ZUd1ZXN0JywgdXBkYXRlRGF0YSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gcmV0O1xuXHR9LFxuXG5cdGNsb3NlUm9vbSh7IHVzZXIsIHZpc2l0b3IsIHJvb20sIGNvbW1lbnQgfSkge1xuXHRcdGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG5cblx0XHRjb25zdCBjbG9zZURhdGEgPSB7XG5cdFx0XHRjbG9zZWRBdDogbm93LFxuXHRcdFx0Y2hhdER1cmF0aW9uOiAobm93LmdldFRpbWUoKSAtIHJvb20udHMpIC8gMTAwMCxcblx0XHR9O1xuXG5cdFx0aWYgKHVzZXIpIHtcblx0XHRcdGNsb3NlRGF0YS5jbG9zZXIgPSAndXNlcic7XG5cdFx0XHRjbG9zZURhdGEuY2xvc2VkQnkgPSB7XG5cdFx0XHRcdF9pZDogdXNlci5faWQsXG5cdFx0XHRcdHVzZXJuYW1lOiB1c2VyLnVzZXJuYW1lLFxuXHRcdFx0fTtcblx0XHR9IGVsc2UgaWYgKHZpc2l0b3IpIHtcblx0XHRcdGNsb3NlRGF0YS5jbG9zZXIgPSAndmlzaXRvcic7XG5cdFx0XHRjbG9zZURhdGEuY2xvc2VkQnkgPSB7XG5cdFx0XHRcdF9pZDogdmlzaXRvci5faWQsXG5cdFx0XHRcdHVzZXJuYW1lOiB2aXNpdG9yLnVzZXJuYW1lLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5jbG9zZUJ5Um9vbUlkKHJvb20uX2lkLCBjbG9zZURhdGEpO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0SW5xdWlyeS5jbG9zZUJ5Um9vbUlkKHJvb20uX2lkLCBjbG9zZURhdGEpO1xuXG5cdFx0Y29uc3QgbWVzc2FnZSA9IHtcblx0XHRcdHQ6ICdsaXZlY2hhdC1jbG9zZScsXG5cdFx0XHRtc2c6IGNvbW1lbnQsXG5cdFx0XHRncm91cGFibGU6IGZhbHNlLFxuXHRcdH07XG5cblx0XHRSb2NrZXRDaGF0LnNlbmRNZXNzYWdlKHVzZXIsIG1lc3NhZ2UsIHJvb20pO1xuXG5cdFx0aWYgKHJvb20uc2VydmVkQnkpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuaGlkZUJ5Um9vbUlkQW5kVXNlcklkKHJvb20uX2lkLCByb29tLnNlcnZlZEJ5Ll9pZCk7XG5cdFx0fVxuXHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZUNvbW1hbmRXaXRoUm9vbUlkQW5kVXNlcigncHJvbXB0VHJhbnNjcmlwdCcsIHJvb20uX2lkLCBjbG9zZURhdGEuY2xvc2VkQnkpO1xuXG5cdFx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLnJ1bignbGl2ZWNoYXQuY2xvc2VSb29tJywgcm9vbSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcblxuXHRzZXRDdXN0b21GaWVsZHMoeyB0b2tlbiwga2V5LCB2YWx1ZSwgb3ZlcndyaXRlIH0gPSB7fSkge1xuXHRcdGNoZWNrKHRva2VuLCBTdHJpbmcpO1xuXHRcdGNoZWNrKGtleSwgU3RyaW5nKTtcblx0XHRjaGVjayh2YWx1ZSwgU3RyaW5nKTtcblx0XHRjaGVjayhvdmVyd3JpdGUsIEJvb2xlYW4pO1xuXG5cdFx0Y29uc3QgY3VzdG9tRmllbGQgPSBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdEN1c3RvbUZpZWxkLmZpbmRPbmVCeUlkKGtleSk7XG5cdFx0aWYgKCFjdXN0b21GaWVsZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1jdXN0b20tZmllbGQnKTtcblx0XHR9XG5cblx0XHRpZiAoY3VzdG9tRmllbGQuc2NvcGUgPT09ICdyb29tJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZUxpdmVjaGF0RGF0YUJ5VG9rZW4odG9rZW4sIGtleSwgdmFsdWUsIG92ZXJ3cml0ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBMaXZlY2hhdFZpc2l0b3JzLnVwZGF0ZUxpdmVjaGF0RGF0YUJ5VG9rZW4odG9rZW4sIGtleSwgdmFsdWUsIG92ZXJ3cml0ZSk7XG5cdFx0fVxuXHR9LFxuXG5cdGdldEluaXRTZXR0aW5ncygpIHtcblx0XHRjb25zdCBzZXR0aW5ncyA9IHt9O1xuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZE5vdEhpZGRlblB1YmxpYyhbXG5cdFx0XHQnTGl2ZWNoYXRfdGl0bGUnLFxuXHRcdFx0J0xpdmVjaGF0X3RpdGxlX2NvbG9yJyxcblx0XHRcdCdMaXZlY2hhdF9lbmFibGVkJyxcblx0XHRcdCdMaXZlY2hhdF9yZWdpc3RyYXRpb25fZm9ybScsXG5cdFx0XHQnTGl2ZWNoYXRfYWxsb3dfc3dpdGNoaW5nX2RlcGFydG1lbnRzJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX3RpdGxlJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX3RpdGxlX2NvbG9yJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX21lc3NhZ2UnLFxuXHRcdFx0J0xpdmVjaGF0X29mZmxpbmVfc3VjY2Vzc19tZXNzYWdlJyxcblx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX2Zvcm1fdW5hdmFpbGFibGUnLFxuXHRcdFx0J0xpdmVjaGF0X2Rpc3BsYXlfb2ZmbGluZV9mb3JtJyxcblx0XHRcdCdMaXZlY2hhdF92aWRlb2NhbGxfZW5hYmxlZCcsXG5cdFx0XHQnSml0c2lfRW5hYmxlZCcsXG5cdFx0XHQnTGFuZ3VhZ2UnLFxuXHRcdFx0J0xpdmVjaGF0X2VuYWJsZV90cmFuc2NyaXB0Jyxcblx0XHRcdCdMaXZlY2hhdF90cmFuc2NyaXB0X21lc3NhZ2UnLFxuXHRcdFx0J0xpdmVjaGF0X2ZpbGV1cGxvYWRfZW5hYmxlZCcsXG5cdFx0XHQnRmlsZVVwbG9hZF9FbmFibGVkJyxcblx0XHRcdCdMaXZlY2hhdF9jb252ZXJzYXRpb25fZmluaXNoZWRfbWVzc2FnZScsXG5cdFx0XHQnTGl2ZWNoYXRfbmFtZV9maWVsZF9yZWdpc3RyYXRpb25fZm9ybScsXG5cdFx0XHQnTGl2ZWNoYXRfZW1haWxfZmllbGRfcmVnaXN0cmF0aW9uX2Zvcm0nLFxuXG5cdFx0XSkuZm9yRWFjaCgoc2V0dGluZykgPT4ge1xuXHRcdFx0c2V0dGluZ3Nbc2V0dGluZy5faWRdID0gc2V0dGluZy52YWx1ZTtcblx0XHR9KTtcblxuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9oaXN0b3J5X21vbml0b3JfdHlwZScsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRzZXR0aW5nc1trZXldID0gdmFsdWU7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gc2V0dGluZ3M7XG5cdH0sXG5cblx0c2F2ZVJvb21JbmZvKHJvb21EYXRhLCBndWVzdERhdGEpIHtcblx0XHRpZiAoKHJvb21EYXRhLnRvcGljICE9IG51bGwgfHwgcm9vbURhdGEudGFncyAhPSBudWxsKSAmJiAhUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0VG9waWNBbmRUYWdzQnlJZChyb29tRGF0YS5faWQsIHJvb21EYXRhLnRvcGljLCByb29tRGF0YS50YWdzKSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5ydW4oJ2xpdmVjaGF0LnNhdmVSb29tJywgcm9vbURhdGEpO1xuXHRcdH0pO1xuXG5cdFx0aWYgKCFfLmlzRW1wdHkoZ3Vlc3REYXRhLm5hbWUpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0Rm5hbWVCeUlkKHJvb21EYXRhLl9pZCwgZ3Vlc3REYXRhLm5hbWUpICYmIFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBkYXRlRGlzcGxheU5hbWVCeVJvb21JZChyb29tRGF0YS5faWQsIGd1ZXN0RGF0YS5uYW1lKTtcblx0XHR9XG5cdH0sXG5cblx0Y2xvc2VPcGVuQ2hhdHModXNlcklkLCBjb21tZW50KSB7XG5cdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHVzZXJJZCk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9wZW5CeUFnZW50KHVzZXJJZCkuZm9yRWFjaCgocm9vbSkgPT4ge1xuXHRcdFx0dGhpcy5jbG9zZVJvb20oeyB1c2VyLCByb29tLCBjb21tZW50IH0pO1xuXHRcdH0pO1xuXHR9LFxuXG5cdGZvcndhcmRPcGVuQ2hhdHModXNlcklkKSB7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9wZW5CeUFnZW50KHVzZXJJZCkuZm9yRWFjaCgocm9vbSkgPT4ge1xuXHRcdFx0Y29uc3QgZ3Vlc3QgPSBMaXZlY2hhdFZpc2l0b3JzLmZpbmRPbmVCeUlkKHJvb20udi5faWQpO1xuXHRcdFx0dGhpcy50cmFuc2Zlcihyb29tLCBndWVzdCwgeyBkZXBhcnRtZW50SWQ6IGd1ZXN0LmRlcGFydG1lbnQgfSk7XG5cdFx0fSk7XG5cdH0sXG5cblx0c2F2ZVBhZ2VIaXN0b3J5KHRva2VuLCByb29tSWQsIHBhZ2VJbmZvKSB7XG5cdFx0aWYgKHBhZ2VJbmZvLmNoYW5nZSA9PT0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5oaXN0b3J5TW9uaXRvclR5cGUpIHtcblxuXHRcdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKCdyb2NrZXQuY2F0Jyk7XG5cblx0XHRcdGNvbnN0IHBhZ2VUaXRsZSA9IHBhZ2VJbmZvLnRpdGxlO1xuXHRcdFx0Y29uc3QgcGFnZVVybCA9IHBhZ2VJbmZvLmxvY2F0aW9uLmhyZWY7XG5cdFx0XHRjb25zdCBleHRyYURhdGEgPSB7XG5cdFx0XHRcdG5hdmlnYXRpb246IHtcblx0XHRcdFx0XHRwYWdlOiBwYWdlSW5mbyxcblx0XHRcdFx0XHR0b2tlbixcblx0XHRcdFx0fSxcblx0XHRcdH07XG5cblx0XHRcdGlmICghcm9vbUlkKSB7XG5cdFx0XHRcdC8vIGtlZXAgaGlzdG9yeSBvZiB1bnJlZ2lzdGVyZWQgdmlzaXRvcnMgZm9yIDEgbW9udGhcblx0XHRcdFx0Y29uc3Qga2VlcEhpc3RvcnlNaWxpc2Vjb25kcyA9IDI1OTIwMDAwMDA7XG5cdFx0XHRcdGV4dHJhRGF0YS5leHBpcmVBdCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpICsga2VlcEhpc3RvcnlNaWxpc2Vjb25kcztcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfVmlzaXRvcl9uYXZpZ2F0aW9uX2FzX2FfbWVzc2FnZScpKSB7XG5cdFx0XHRcdGV4dHJhRGF0YS5faGlkZGVuID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZU5hdmlnYXRpb25IaXN0b3J5V2l0aFJvb21JZE1lc3NhZ2VBbmRVc2VyKHJvb21JZCwgYCR7IHBhZ2VUaXRsZSB9IC0gJHsgcGFnZVVybCB9YCwgdXNlciwgZXh0cmFEYXRhKTtcblx0XHR9XG5cblx0XHRyZXR1cm47XG5cdH0sXG5cblx0dHJhbnNmZXIocm9vbSwgZ3Vlc3QsIHRyYW5zZmVyRGF0YSkge1xuXHRcdGxldCBhZ2VudDtcblxuXHRcdGlmICh0cmFuc2ZlckRhdGEudXNlcklkKSB7XG5cdFx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodHJhbnNmZXJEYXRhLnVzZXJJZCk7XG5cdFx0XHRhZ2VudCA9IHtcblx0XHRcdFx0YWdlbnRJZDogdXNlci5faWQsXG5cdFx0XHRcdHVzZXJuYW1lOiB1c2VyLnVzZXJuYW1lLFxuXHRcdFx0fTtcblx0XHR9IGVsc2UgaWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9Sb3V0aW5nX01ldGhvZCcpICE9PSAnR3Vlc3RfUG9vbCcpIHtcblx0XHRcdGFnZW50ID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXROZXh0QWdlbnQodHJhbnNmZXJEYXRhLmRlcGFydG1lbnRJZCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LnJldHVyblJvb21Bc0lucXVpcnkocm9vbS5faWQsIHRyYW5zZmVyRGF0YS5kZXBhcnRtZW50SWQpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgc2VydmVkQnkgfSA9IHJvb207XG5cblx0XHRpZiAoYWdlbnQgJiYgYWdlbnQuYWdlbnRJZCAhPT0gc2VydmVkQnkuX2lkKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5jaGFuZ2VBZ2VudEJ5Um9vbUlkKHJvb20uX2lkLCBhZ2VudCk7XG5cblx0XHRcdGlmICh0cmFuc2ZlckRhdGEuZGVwYXJ0bWVudElkKSB7XG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmNoYW5nZURlcGFydG1lbnRJZEJ5Um9vbUlkKHJvb20uX2lkLCB0cmFuc2ZlckRhdGEuZGVwYXJ0bWVudElkKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3Qgc3Vic2NyaXB0aW9uRGF0YSA9IHtcblx0XHRcdFx0cmlkOiByb29tLl9pZCxcblx0XHRcdFx0bmFtZTogZ3Vlc3QubmFtZSB8fCBndWVzdC51c2VybmFtZSxcblx0XHRcdFx0YWxlcnQ6IHRydWUsXG5cdFx0XHRcdG9wZW46IHRydWUsXG5cdFx0XHRcdHVucmVhZDogMSxcblx0XHRcdFx0dXNlck1lbnRpb25zOiAxLFxuXHRcdFx0XHRncm91cE1lbnRpb25zOiAwLFxuXHRcdFx0XHR1OiB7XG5cdFx0XHRcdFx0X2lkOiBhZ2VudC5hZ2VudElkLFxuXHRcdFx0XHRcdHVzZXJuYW1lOiBhZ2VudC51c2VybmFtZSxcblx0XHRcdFx0fSxcblx0XHRcdFx0dDogJ2wnLFxuXHRcdFx0XHRkZXNrdG9wTm90aWZpY2F0aW9uczogJ2FsbCcsXG5cdFx0XHRcdG1vYmlsZVB1c2hOb3RpZmljYXRpb25zOiAnYWxsJyxcblx0XHRcdFx0ZW1haWxOb3RpZmljYXRpb25zOiAnYWxsJyxcblx0XHRcdH07XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnJlbW92ZUJ5Um9vbUlkQW5kVXNlcklkKHJvb20uX2lkLCBzZXJ2ZWRCeS5faWQpO1xuXG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmluc2VydChzdWJzY3JpcHRpb25EYXRhKTtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmluY1VzZXJzQ291bnRCeUlkKHJvb20uX2lkKTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlVXNlckxlYXZlV2l0aFJvb21JZEFuZFVzZXIocm9vbS5faWQsIHsgX2lkOiBzZXJ2ZWRCeS5faWQsIHVzZXJuYW1lOiBzZXJ2ZWRCeS51c2VybmFtZSB9KTtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVVzZXJKb2luV2l0aFJvb21JZEFuZFVzZXIocm9vbS5faWQsIHsgX2lkOiBhZ2VudC5hZ2VudElkLCB1c2VybmFtZTogYWdlbnQudXNlcm5hbWUgfSk7XG5cblx0XHRcdGNvbnN0IGd1ZXN0RGF0YSA9IHtcblx0XHRcdFx0dG9rZW46IGd1ZXN0LnRva2VuLFxuXHRcdFx0XHRkZXBhcnRtZW50OiB0cmFuc2ZlckRhdGEuZGVwYXJ0bWVudElkLFxuXHRcdFx0fTtcblxuXHRcdFx0dGhpcy5zZXREZXBhcnRtZW50Rm9yR3Vlc3QoZ3Vlc3REYXRhKTtcblx0XHRcdGNvbnN0IGRhdGEgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5nZXRBZ2VudEluZm8oYWdlbnQuYWdlbnRJZCk7XG5cblx0XHRcdFJvY2tldENoYXQuTGl2ZWNoYXQuc3RyZWFtLmVtaXQocm9vbS5faWQsIHtcblx0XHRcdFx0dHlwZTogJ2FnZW50RGF0YScsXG5cdFx0XHRcdGRhdGEsXG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LFxuXG5cdHJldHVyblJvb21Bc0lucXVpcnkocmlkLCBkZXBhcnRtZW50SWQpIHtcblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocmlkKTtcblx0XHRpZiAoIXJvb20pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnJldHVyblJvb21Bc0lucXVpcnknIH0pO1xuXHRcdH1cblxuXHRcdGlmICghcm9vbS5zZXJ2ZWRCeSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHJvb20uc2VydmVkQnkuX2lkKTtcblx0XHRpZiAoIXVzZXIgfHwgIXVzZXIuX2lkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZXR1cm5Sb29tQXNJbnF1aXJ5JyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCBhZ2VudElkcyA9IFtdO1xuXHRcdC8vIGdldCB0aGUgYWdlbnRzIG9mIHRoZSBkZXBhcnRtZW50XG5cdFx0aWYgKGRlcGFydG1lbnRJZCkge1xuXHRcdFx0bGV0IGFnZW50cyA9IFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0T25saW5lQWdlbnRzKGRlcGFydG1lbnRJZCk7XG5cblx0XHRcdGlmIChhZ2VudHMuY291bnQoKSA9PT0gMCAmJiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfZ3Vlc3RfcG9vbF93aXRoX25vX2FnZW50cycpKSB7XG5cdFx0XHRcdGFnZW50cyA9IFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0QWdlbnRzKGRlcGFydG1lbnRJZCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChhZ2VudHMuY291bnQoKSA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGFnZW50cy5mb3JFYWNoKChhZ2VudCkgPT4ge1xuXHRcdFx0XHRhZ2VudElkcy5wdXNoKGFnZW50LmFnZW50SWQpO1xuXHRcdFx0fSk7XG5cblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmNoYW5nZURlcGFydG1lbnRJZEJ5Um9vbUlkKHJvb20uX2lkLCBkZXBhcnRtZW50SWQpO1xuXHRcdH1cblxuXHRcdC8vIGRlbGV0ZSBhZ2VudCBhbmQgcm9vbSBzdWJzY3JpcHRpb25cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnJlbW92ZUJ5Um9vbUlkKHJpZCk7XG5cblx0XHQvLyByZW1vdmUgYWdlbnQgZnJvbSByb29tXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMucmVtb3ZlQWdlbnRCeVJvb21JZChyaWQpO1xuXG5cdFx0Ly8gZmluZCBpbnF1aXJ5IGNvcnJlc3BvbmRpbmcgdG8gcm9vbVxuXHRcdGNvbnN0IGlucXVpcnkgPSBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdElucXVpcnkuZmluZE9uZSh7IHJpZCB9KTtcblx0XHRpZiAoIWlucXVpcnkpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRsZXQgb3BlbklucTtcblx0XHQvLyBtYXJrIGlucXVpcnkgYXMgb3BlblxuXHRcdGlmIChhZ2VudElkcy5sZW5ndGggPT09IDApIHtcblx0XHRcdG9wZW5JbnEgPSBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdElucXVpcnkub3BlbklucXVpcnkoaW5xdWlyeS5faWQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRvcGVuSW5xID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRJbnF1aXJ5Lm9wZW5JbnF1aXJ5V2l0aEFnZW50cyhpbnF1aXJ5Ll9pZCwgYWdlbnRJZHMpO1xuXHRcdH1cblxuXHRcdGlmIChvcGVuSW5xKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVVc2VyTGVhdmVXaXRoUm9vbUlkQW5kVXNlcihyaWQsIHsgX2lkOiByb29tLnNlcnZlZEJ5Ll9pZCwgdXNlcm5hbWU6IHJvb20uc2VydmVkQnkudXNlcm5hbWUgfSk7XG5cblx0XHRcdFJvY2tldENoYXQuTGl2ZWNoYXQuc3RyZWFtLmVtaXQocmlkLCB7XG5cdFx0XHRcdHR5cGU6ICdhZ2VudERhdGEnLFxuXHRcdFx0XHRkYXRhOiBudWxsLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG9wZW5JbnE7XG5cdH0sXG5cblx0c2VuZFJlcXVlc3QocG9zdERhdGEsIGNhbGxiYWNrLCB0cnlpbmcgPSAxKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0XHQnWC1Sb2NrZXRDaGF0LUxpdmVjaGF0LVRva2VuJzogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X3NlY3JldF90b2tlbicpLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRkYXRhOiBwb3N0RGF0YSxcblx0XHRcdH07XG5cdFx0XHRyZXR1cm4gSFRUUC5wb3N0KFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF93ZWJob29rVXJsJyksIG9wdGlvbnMpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFJvY2tldENoYXQuTGl2ZWNoYXQubG9nZ2VyLndlYmhvb2suZXJyb3IoYFJlc3BvbnNlIGVycm9yIG9uICR7IHRyeWluZyB9IHRyeSAtPmAsIGUpO1xuXHRcdFx0Ly8gdHJ5IDEwIHRpbWVzIGFmdGVyIDEwIHNlY29uZHMgZWFjaFxuXHRcdFx0aWYgKHRyeWluZyA8IDEwKSB7XG5cdFx0XHRcdFJvY2tldENoYXQuTGl2ZWNoYXQubG9nZ2VyLndlYmhvb2sud2FybignV2lsbCB0cnkgYWdhaW4gaW4gMTAgc2Vjb25kcyAuLi4nKTtcblx0XHRcdFx0dHJ5aW5nKys7XG5cdFx0XHRcdHNldFRpbWVvdXQoTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5MaXZlY2hhdC5zZW5kUmVxdWVzdChwb3N0RGF0YSwgY2FsbGJhY2ssIHRyeWluZyk7XG5cdFx0XHRcdH0pLCAxMDAwMCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdGdldExpdmVjaGF0Um9vbUd1ZXN0SW5mbyhyb29tKSB7XG5cdFx0Y29uc3QgdmlzaXRvciA9IExpdmVjaGF0VmlzaXRvcnMuZmluZE9uZUJ5SWQocm9vbS52Ll9pZCk7XG5cdFx0Y29uc3QgYWdlbnQgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChyb29tLnNlcnZlZEJ5ICYmIHJvb20uc2VydmVkQnkuX2lkKTtcblxuXHRcdGNvbnN0IHVhID0gbmV3IFVBUGFyc2VyKCk7XG5cdFx0dWEuc2V0VUEodmlzaXRvci51c2VyQWdlbnQpO1xuXG5cdFx0Y29uc3QgcG9zdERhdGEgPSB7XG5cdFx0XHRfaWQ6IHJvb20uX2lkLFxuXHRcdFx0bGFiZWw6IHJvb20uZm5hbWUgfHwgcm9vbS5sYWJlbCwgLy8gdXNpbmcgc2FtZSBmaWVsZCBmb3IgY29tcGF0aWJpbGl0eVxuXHRcdFx0dG9waWM6IHJvb20udG9waWMsXG5cdFx0XHRjcmVhdGVkQXQ6IHJvb20udHMsXG5cdFx0XHRsYXN0TWVzc2FnZUF0OiByb29tLmxtLFxuXHRcdFx0dGFnczogcm9vbS50YWdzLFxuXHRcdFx0Y3VzdG9tRmllbGRzOiByb29tLmxpdmVjaGF0RGF0YSxcblx0XHRcdHZpc2l0b3I6IHtcblx0XHRcdFx0X2lkOiB2aXNpdG9yLl9pZCxcblx0XHRcdFx0dG9rZW46IHZpc2l0b3IudG9rZW4sXG5cdFx0XHRcdG5hbWU6IHZpc2l0b3IubmFtZSxcblx0XHRcdFx0dXNlcm5hbWU6IHZpc2l0b3IudXNlcm5hbWUsXG5cdFx0XHRcdGVtYWlsOiBudWxsLFxuXHRcdFx0XHRwaG9uZTogbnVsbCxcblx0XHRcdFx0ZGVwYXJ0bWVudDogdmlzaXRvci5kZXBhcnRtZW50LFxuXHRcdFx0XHRpcDogdmlzaXRvci5pcCxcblx0XHRcdFx0b3M6IHVhLmdldE9TKCkubmFtZSAmJiAoYCR7IHVhLmdldE9TKCkubmFtZSB9ICR7IHVhLmdldE9TKCkudmVyc2lvbiB9YCksXG5cdFx0XHRcdGJyb3dzZXI6IHVhLmdldEJyb3dzZXIoKS5uYW1lICYmIChgJHsgdWEuZ2V0QnJvd3NlcigpLm5hbWUgfSAkeyB1YS5nZXRCcm93c2VyKCkudmVyc2lvbiB9YCksXG5cdFx0XHRcdGN1c3RvbUZpZWxkczogdmlzaXRvci5saXZlY2hhdERhdGEsXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRpZiAoYWdlbnQpIHtcblx0XHRcdHBvc3REYXRhLmFnZW50ID0ge1xuXHRcdFx0XHRfaWQ6IGFnZW50Ll9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IGFnZW50LnVzZXJuYW1lLFxuXHRcdFx0XHRuYW1lOiBhZ2VudC5uYW1lLFxuXHRcdFx0XHRlbWFpbDogbnVsbCxcblx0XHRcdH07XG5cblx0XHRcdGlmIChhZ2VudC5lbWFpbHMgJiYgYWdlbnQuZW1haWxzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0cG9zdERhdGEuYWdlbnQuZW1haWwgPSBhZ2VudC5lbWFpbHNbMF0uYWRkcmVzcztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAocm9vbS5jcm1EYXRhKSB7XG5cdFx0XHRwb3N0RGF0YS5jcm1EYXRhID0gcm9vbS5jcm1EYXRhO1xuXHRcdH1cblxuXHRcdGlmICh2aXNpdG9yLnZpc2l0b3JFbWFpbHMgJiYgdmlzaXRvci52aXNpdG9yRW1haWxzLmxlbmd0aCA+IDApIHtcblx0XHRcdHBvc3REYXRhLnZpc2l0b3IuZW1haWwgPSB2aXNpdG9yLnZpc2l0b3JFbWFpbHM7XG5cdFx0fVxuXHRcdGlmICh2aXNpdG9yLnBob25lICYmIHZpc2l0b3IucGhvbmUubGVuZ3RoID4gMCkge1xuXHRcdFx0cG9zdERhdGEudmlzaXRvci5waG9uZSA9IHZpc2l0b3IucGhvbmU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHBvc3REYXRhO1xuXHR9LFxuXG5cdGFkZEFnZW50KHVzZXJuYW1lKSB7XG5cdFx0Y2hlY2sodXNlcm5hbWUsIFN0cmluZyk7XG5cblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUodXNlcm5hbWUsIHsgZmllbGRzOiB7IF9pZDogMSwgdXNlcm5hbWU6IDEgfSB9KTtcblxuXHRcdGlmICghdXNlcikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnbGl2ZWNoYXQ6YWRkQWdlbnQnIH0pO1xuXHRcdH1cblxuXHRcdGlmIChSb2NrZXRDaGF0LmF1dGh6LmFkZFVzZXJSb2xlcyh1c2VyLl9pZCwgJ2xpdmVjaGF0LWFnZW50JykpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnNldE9wZXJhdG9yKHVzZXIuX2lkLCB0cnVlKTtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnNldExpdmVjaGF0U3RhdHVzKHVzZXIuX2lkLCAnYXZhaWxhYmxlJyk7XG5cdFx0XHRyZXR1cm4gdXNlcjtcblx0XHR9XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cblx0YWRkTWFuYWdlcih1c2VybmFtZSkge1xuXHRcdGNoZWNrKHVzZXJuYW1lLCBTdHJpbmcpO1xuXG5cdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeVVzZXJuYW1lKHVzZXJuYW1lLCB7IGZpZWxkczogeyBfaWQ6IDEsIHVzZXJuYW1lOiAxIH0gfSk7XG5cblx0XHRpZiAoIXVzZXIpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2xpdmVjaGF0OmFkZE1hbmFnZXInIH0pO1xuXHRcdH1cblxuXHRcdGlmIChSb2NrZXRDaGF0LmF1dGh6LmFkZFVzZXJSb2xlcyh1c2VyLl9pZCwgJ2xpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0cmV0dXJuIHVzZXI7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LFxuXG5cdHJlbW92ZUFnZW50KHVzZXJuYW1lKSB7XG5cdFx0Y2hlY2sodXNlcm5hbWUsIFN0cmluZyk7XG5cblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUodXNlcm5hbWUsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXG5cdFx0aWYgKCF1c2VyKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVBZ2VudCcgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKFJvY2tldENoYXQuYXV0aHoucmVtb3ZlVXNlckZyb21Sb2xlcyh1c2VyLl9pZCwgJ2xpdmVjaGF0LWFnZW50JykpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnNldE9wZXJhdG9yKHVzZXIuX2lkLCBmYWxzZSk7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXRMaXZlY2hhdFN0YXR1cyh1c2VyLl9pZCwgJ25vdC1hdmFpbGFibGUnKTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHRyZW1vdmVNYW5hZ2VyKHVzZXJuYW1lKSB7XG5cdFx0Y2hlY2sodXNlcm5hbWUsIFN0cmluZyk7XG5cblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUodXNlcm5hbWUsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXG5cdFx0aWYgKCF1c2VyKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVNYW5hZ2VyJyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5hdXRoei5yZW1vdmVVc2VyRnJvbVJvbGVzKHVzZXIuX2lkLCAnbGl2ZWNoYXQtbWFuYWdlcicpO1xuXHR9LFxuXG5cdHNhdmVEZXBhcnRtZW50KF9pZCwgZGVwYXJ0bWVudERhdGEsIGRlcGFydG1lbnRBZ2VudHMpIHtcblx0XHRjaGVjayhfaWQsIE1hdGNoLk1heWJlKFN0cmluZykpO1xuXG5cdFx0Y2hlY2soZGVwYXJ0bWVudERhdGEsIHtcblx0XHRcdGVuYWJsZWQ6IEJvb2xlYW4sXG5cdFx0XHRuYW1lOiBTdHJpbmcsXG5cdFx0XHRkZXNjcmlwdGlvbjogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdHNob3dPblJlZ2lzdHJhdGlvbjogQm9vbGVhbixcblx0XHR9KTtcblxuXHRcdGNoZWNrKGRlcGFydG1lbnRBZ2VudHMsIFtcblx0XHRcdE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHRcdGFnZW50SWQ6IFN0cmluZyxcblx0XHRcdFx0dXNlcm5hbWU6IFN0cmluZyxcblx0XHRcdH0pLFxuXHRcdF0pO1xuXG5cdFx0aWYgKF9pZCkge1xuXHRcdFx0Y29uc3QgZGVwYXJ0bWVudCA9IFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudC5maW5kT25lQnlJZChfaWQpO1xuXHRcdFx0aWYgKCFkZXBhcnRtZW50KSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWRlcGFydG1lbnQtbm90LWZvdW5kJywgJ0RlcGFydG1lbnQgbm90IGZvdW5kJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpzYXZlRGVwYXJ0bWVudCcgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudC5jcmVhdGVPclVwZGF0ZURlcGFydG1lbnQoX2lkLCBkZXBhcnRtZW50RGF0YSwgZGVwYXJ0bWVudEFnZW50cyk7XG5cdH0sXG5cblx0cmVtb3ZlRGVwYXJ0bWVudChfaWQpIHtcblx0XHRjaGVjayhfaWQsIFN0cmluZyk7XG5cblx0XHRjb25zdCBkZXBhcnRtZW50ID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50LmZpbmRPbmVCeUlkKF9pZCwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cblx0XHRpZiAoIWRlcGFydG1lbnQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2RlcGFydG1lbnQtbm90LWZvdW5kJywgJ0RlcGFydG1lbnQgbm90IGZvdW5kJywgeyBtZXRob2Q6ICdsaXZlY2hhdDpyZW1vdmVEZXBhcnRtZW50JyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50LnJlbW92ZUJ5SWQoX2lkKTtcblx0fSxcblxuXHRzaG93Q29ubmVjdGluZygpIHtcblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X1JvdXRpbmdfTWV0aG9kJykgPT09ICdHdWVzdF9Qb29sJykge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9vcGVuX2lucXVpZXJ5X3Nob3dfY29ubmVjdGluZycpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9LFxuXG5cdHNlbmRFbWFpbChmcm9tLCB0bywgcmVwbHlUbywgc3ViamVjdCwgaHRtbCkge1xuXHRcdE1haWxlci5zZW5kKHtcblx0XHRcdHRvLFxuXHRcdFx0ZnJvbSxcblx0XHRcdHJlcGx5VG8sXG5cdFx0XHRzdWJqZWN0LFxuXHRcdFx0aHRtbCxcblx0XHR9KTtcblx0fSxcblxuXHRzZW5kVHJhbnNjcmlwdCh7IHRva2VuLCByaWQsIGVtYWlsIH0pIHtcblx0XHRjaGVjayhyaWQsIFN0cmluZyk7XG5cdFx0Y2hlY2soZW1haWwsIFN0cmluZyk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocmlkKTtcblxuXHRcdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRva2VuKTtcblx0XHRjb25zdCB1c2VyTGFuZ3VhZ2UgPSAodmlzaXRvciAmJiB2aXNpdG9yLmxhbmd1YWdlKSB8fCBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnbGFuZ3VhZ2UnKSB8fCAnZW4nO1xuXG5cdFx0Ly8gYWxsb3cgdG8gb25seSB1c2VyIHRvIHNlbmQgdHJhbnNjcmlwdHMgZnJvbSB0aGVpciBvd24gY2hhdHNcblx0XHRpZiAoIXJvb20gfHwgcm9vbS50ICE9PSAnbCcgfHwgIXJvb20udiB8fCByb29tLnYudG9rZW4gIT09IHRva2VuKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbWVzc2FnZXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kVmlzaWJsZUJ5Um9vbUlkTm90Q29udGFpbmluZ1R5cGVzKHJpZCwgWydsaXZlY2hhdF9uYXZpZ2F0aW9uX2hpc3RvcnknXSwgeyBzb3J0OiB7IHRzOiAxIH0gfSk7XG5cblx0XHRsZXQgaHRtbCA9ICc8ZGl2PiA8aHI+Jztcblx0XHRtZXNzYWdlcy5mb3JFYWNoKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRpZiAobWVzc2FnZS50ICYmIFsnY29tbWFuZCcsICdsaXZlY2hhdC1jbG9zZScsICdsaXZlY2hhdF92aWRlb19jYWxsJ10uaW5kZXhPZihtZXNzYWdlLnQpICE9PSAtMSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGxldCBhdXRob3I7XG5cdFx0XHRpZiAobWVzc2FnZS51Ll9pZCA9PT0gdmlzaXRvci5faWQpIHtcblx0XHRcdFx0YXV0aG9yID0gVEFQaTE4bi5fXygnWW91JywgeyBsbmc6IHVzZXJMYW5ndWFnZSB9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGF1dGhvciA9IG1lc3NhZ2UudS51c2VybmFtZTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgZGF0ZXRpbWUgPSBtb21lbnQobWVzc2FnZS50cykubG9jYWxlKHVzZXJMYW5ndWFnZSkuZm9ybWF0KCdMTEwnKTtcblx0XHRcdGNvbnN0IHNpbmdsZU1lc3NhZ2UgPSBgXG5cdFx0XHRcdDxwPjxzdHJvbmc+JHsgYXV0aG9yIH08L3N0cm9uZz4gIDxlbT4keyBkYXRldGltZSB9PC9lbT48L3A+XG5cdFx0XHRcdDxwPiR7IG1lc3NhZ2UubXNnIH08L3A+XG5cdFx0XHRgO1xuXHRcdFx0aHRtbCA9IGh0bWwgKyBzaW5nbGVNZXNzYWdlO1xuXHRcdH0pO1xuXG5cdFx0aHRtbCA9IGAkeyBodG1sIH08L2Rpdj5gO1xuXG5cdFx0bGV0IGZyb21FbWFpbCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGcm9tX0VtYWlsJykubWF0Y2goL1xcYltBLVowLTkuXyUrLV0rQCg/OltBLVowLTktXStcXC4pK1tBLVpdezIsNH1cXGIvaSk7XG5cblx0XHRpZiAoZnJvbUVtYWlsKSB7XG5cdFx0XHRmcm9tRW1haWwgPSBmcm9tRW1haWxbMF07XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZyb21FbWFpbCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGcm9tX0VtYWlsJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc3ViamVjdCA9IFRBUGkxOG4uX18oJ1RyYW5zY3JpcHRfb2ZfeW91cl9saXZlY2hhdF9jb252ZXJzYXRpb24nLCB7IGxuZzogdXNlckxhbmd1YWdlIH0pO1xuXG5cdFx0dGhpcy5zZW5kRW1haWwoZnJvbUVtYWlsLCBlbWFpbCwgZnJvbUVtYWlsLCBzdWJqZWN0LCBodG1sKTtcblxuXHRcdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5ydW4oJ2xpdmVjaGF0LnNlbmRUcmFuc2NyaXB0JywgbWVzc2FnZXMsIGVtYWlsKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxuXG5cdHNlbmRPZmZsaW5lTWVzc2FnZShkYXRhID0ge30pIHtcblx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9kaXNwbGF5X29mZmxpbmVfZm9ybScpKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbWVzc2FnZSA9IChgJHsgZGF0YS5tZXNzYWdlIH1gKS5yZXBsYWNlKC8oW14+XFxyXFxuXT8pKFxcclxcbnxcXG5cXHJ8XFxyfFxcbikvZywgJyQxJyArICc8YnI+JyArICckMicpO1xuXG5cdFx0Y29uc3QgaHRtbCA9IGBcblx0XHRcdDxoMT5OZXcgbGl2ZWNoYXQgbWVzc2FnZTwvaDE+XG5cdFx0XHQ8cD48c3Ryb25nPlZpc2l0b3IgbmFtZTo8L3N0cm9uZz4gJHsgZGF0YS5uYW1lIH08L3A+XG5cdFx0XHQ8cD48c3Ryb25nPlZpc2l0b3IgZW1haWw6PC9zdHJvbmc+ICR7IGRhdGEuZW1haWwgfTwvcD5cblx0XHRcdDxwPjxzdHJvbmc+TWVzc2FnZTo8L3N0cm9uZz48YnI+JHsgbWVzc2FnZSB9PC9wPmA7XG5cblx0XHRsZXQgZnJvbUVtYWlsID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Zyb21fRW1haWwnKS5tYXRjaCgvXFxiW0EtWjAtOS5fJSstXStAKD86W0EtWjAtOS1dK1xcLikrW0EtWl17Miw0fVxcYi9pKTtcblxuXHRcdGlmIChmcm9tRW1haWwpIHtcblx0XHRcdGZyb21FbWFpbCA9IGZyb21FbWFpbFswXTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZnJvbUVtYWlsID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Zyb21fRW1haWwnKTtcblx0XHR9XG5cblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X3ZhbGlkYXRlX29mZmxpbmVfZW1haWwnKSkge1xuXHRcdFx0Y29uc3QgZW1haWxEb21haW4gPSBkYXRhLmVtYWlsLnN1YnN0cihkYXRhLmVtYWlsLmxhc3RJbmRleE9mKCdAJykgKyAxKTtcblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0TWV0ZW9yLndyYXBBc3luYyhkbnMucmVzb2x2ZU14KShlbWFpbERvbWFpbik7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtZW1haWwtYWRkcmVzcycsICdJbnZhbGlkIGVtYWlsIGFkZHJlc3MnLCB7IG1ldGhvZDogJ2xpdmVjaGF0OnNlbmRPZmZsaW5lTWVzc2FnZScgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29uc3QgdG8gPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfb2ZmbGluZV9lbWFpbCcpO1xuXHRcdGNvbnN0IGZyb20gPSBgJHsgZGF0YS5uYW1lIH0gLSAkeyBkYXRhLmVtYWlsIH0gPCR7IGZyb21FbWFpbCB9PmA7XG5cdFx0Y29uc3QgcmVwbHlUbyA9IGAkeyBkYXRhLm5hbWUgfSA8JHsgZGF0YS5lbWFpbCB9PmA7XG5cdFx0Y29uc3Qgc3ViamVjdCA9IGBMaXZlY2hhdCBvZmZsaW5lIG1lc3NhZ2UgZnJvbSAkeyBkYXRhLm5hbWUgfTogJHsgKGAkeyBkYXRhLm1lc3NhZ2UgfWApLnN1YnN0cmluZygwLCAyMCkgfWA7XG5cblx0XHR0aGlzLnNlbmRFbWFpbChmcm9tLCB0bywgcmVwbHlUbywgc3ViamVjdCwgaHRtbCk7XG5cblx0XHRNZXRlb3IuZGVmZXIoKCkgPT4ge1xuXHRcdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MucnVuKCdsaXZlY2hhdC5vZmZsaW5lTWVzc2FnZScsIGRhdGEpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH0sXG59O1xuXG5Sb2NrZXRDaGF0LkxpdmVjaGF0LnN0cmVhbSA9IG5ldyBNZXRlb3IuU3RyZWFtZXIoJ2xpdmVjaGF0LXJvb20nKTtcblxuUm9ja2V0Q2hhdC5MaXZlY2hhdC5zdHJlYW0uYWxsb3dSZWFkKChyb29tSWQsIGV4dHJhRGF0YSkgPT4ge1xuXHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocm9vbUlkKTtcblxuXHRpZiAoIXJvb20pIHtcblx0XHRjb25zb2xlLndhcm4oYEludmFsaWQgZXZlbnROYW1lOiBcIiR7IHJvb21JZCB9XCJgKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRpZiAocm9vbS50ID09PSAnbCcgJiYgZXh0cmFEYXRhICYmIGV4dHJhRGF0YS52aXNpdG9yVG9rZW4gJiYgcm9vbS52LnRva2VuID09PSBleHRyYURhdGEudmlzaXRvclRva2VuKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufSk7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9oaXN0b3J5X21vbml0b3JfdHlwZScsIChrZXksIHZhbHVlKSA9PiB7XG5cdFJvY2tldENoYXQuTGl2ZWNoYXQuaGlzdG9yeU1vbml0b3JUeXBlID0gdmFsdWU7XG59KTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IHsgc2VuZE5vdGlmaWNhdGlvbiB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5cblJvY2tldENoYXQuUXVldWVNZXRob2RzID0ge1xuXHQvKiBMZWFzdCBBbW91bnQgUXVldWluZyBtZXRob2Q6XG5cdCAqXG5cdCAqIGRlZmF1bHQgbWV0aG9kIHdoZXJlIHRoZSBhZ2VudCB3aXRoIHRoZSBsZWFzdCBudW1iZXJcblx0ICogb2Ygb3BlbiBjaGF0cyBpcyBwYWlyZWQgd2l0aCB0aGUgaW5jb21pbmcgbGl2ZWNoYXRcblx0ICovXG5cdCdMZWFzdF9BbW91bnQnKGd1ZXN0LCBtZXNzYWdlLCByb29tSW5mbywgYWdlbnQpIHtcblx0XHRpZiAoIWFnZW50KSB7XG5cdFx0XHRhZ2VudCA9IFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0TmV4dEFnZW50KGd1ZXN0LmRlcGFydG1lbnQpO1xuXHRcdFx0aWYgKCFhZ2VudCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCduby1hZ2VudC1vbmxpbmUnLCAnU29ycnksIG5vIG9ubGluZSBhZ2VudHMnKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy51cGRhdGVMaXZlY2hhdFJvb21Db3VudCgpO1xuXG5cdFx0Y29uc3Qgcm9vbSA9IF8uZXh0ZW5kKHtcblx0XHRcdF9pZDogbWVzc2FnZS5yaWQsXG5cdFx0XHRtc2dzOiAwLFxuXHRcdFx0dXNlcnNDb3VudDogMSxcblx0XHRcdGxtOiBuZXcgRGF0ZSgpLFxuXHRcdFx0Zm5hbWU6IChyb29tSW5mbyAmJiByb29tSW5mby5mbmFtZSkgfHwgZ3Vlc3QubmFtZSB8fCBndWVzdC51c2VybmFtZSxcblx0XHRcdC8vIHVzZXJuYW1lczogW2FnZW50LnVzZXJuYW1lLCBndWVzdC51c2VybmFtZV0sXG5cdFx0XHR0OiAnbCcsXG5cdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdHY6IHtcblx0XHRcdFx0X2lkOiBndWVzdC5faWQsXG5cdFx0XHRcdHVzZXJuYW1lOiBndWVzdC51c2VybmFtZSxcblx0XHRcdFx0dG9rZW46IG1lc3NhZ2UudG9rZW4sXG5cdFx0XHRcdHN0YXR1czogZ3Vlc3Quc3RhdHVzIHx8ICdvbmxpbmUnLFxuXHRcdFx0fSxcblx0XHRcdHNlcnZlZEJ5OiB7XG5cdFx0XHRcdF9pZDogYWdlbnQuYWdlbnRJZCxcblx0XHRcdFx0dXNlcm5hbWU6IGFnZW50LnVzZXJuYW1lLFxuXHRcdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdH0sXG5cdFx0XHRjbDogZmFsc2UsXG5cdFx0XHRvcGVuOiB0cnVlLFxuXHRcdFx0d2FpdGluZ1Jlc3BvbnNlOiB0cnVlLFxuXHRcdH0sIHJvb21JbmZvKTtcblxuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbkRhdGEgPSB7XG5cdFx0XHRyaWQ6IG1lc3NhZ2UucmlkLFxuXHRcdFx0Zm5hbWU6IGd1ZXN0Lm5hbWUgfHwgZ3Vlc3QudXNlcm5hbWUsXG5cdFx0XHRhbGVydDogdHJ1ZSxcblx0XHRcdG9wZW46IHRydWUsXG5cdFx0XHR1bnJlYWQ6IDEsXG5cdFx0XHR1c2VyTWVudGlvbnM6IDEsXG5cdFx0XHRncm91cE1lbnRpb25zOiAwLFxuXHRcdFx0dToge1xuXHRcdFx0XHRfaWQ6IGFnZW50LmFnZW50SWQsXG5cdFx0XHRcdHVzZXJuYW1lOiBhZ2VudC51c2VybmFtZSxcblx0XHRcdH0sXG5cdFx0XHR0OiAnbCcsXG5cdFx0XHRkZXNrdG9wTm90aWZpY2F0aW9uczogJ2FsbCcsXG5cdFx0XHRtb2JpbGVQdXNoTm90aWZpY2F0aW9uczogJ2FsbCcsXG5cdFx0XHRlbWFpbE5vdGlmaWNhdGlvbnM6ICdhbGwnLFxuXHRcdH07XG5cblx0XHRpZiAoZ3Vlc3QuZGVwYXJ0bWVudCkge1xuXHRcdFx0cm9vbS5kZXBhcnRtZW50SWQgPSBndWVzdC5kZXBhcnRtZW50O1xuXHRcdH1cblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmluc2VydChyb29tKTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuaW5zZXJ0KHN1YnNjcmlwdGlvbkRhdGEpO1xuXG5cdFx0Um9ja2V0Q2hhdC5MaXZlY2hhdC5zdHJlYW0uZW1pdChyb29tLl9pZCwge1xuXHRcdFx0dHlwZTogJ2FnZW50RGF0YScsXG5cdFx0XHRkYXRhOiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5nZXRBZ2VudEluZm8oYWdlbnQuYWdlbnRJZCksXG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gcm9vbTtcblx0fSxcblx0LyogR3Vlc3QgUG9vbCBRdWV1aW5nIE1ldGhvZDpcblx0ICpcblx0ICogQW4gaW5jb21taW5nIGxpdmVjaGF0IGlzIGNyZWF0ZWQgYXMgYW4gSW5xdWlyeVxuXHQgKiB3aGljaCBpcyBwaWNrZWQgdXAgZnJvbSBhbiBhZ2VudC5cblx0ICogQW4gSW5xdWlyeSBpcyB2aXNpYmxlIHRvIGFsbCBhZ2VudHMgKFRPRE86IGluIHRoZSBjb3JyZWN0IGRlcGFydG1lbnQpXG4gICAgICpcblx0ICogQSByb29tIGlzIHN0aWxsIGNyZWF0ZWQgd2l0aCB0aGUgaW5pdGlhbCBtZXNzYWdlLCBidXQgaXQgaXMgb2NjdXBpZWQgYnlcblx0ICogb25seSB0aGUgY2xpZW50IHVudGlsIHBhaXJlZCB3aXRoIGFuIGFnZW50XG5cdCAqL1xuXHQnR3Vlc3RfUG9vbCcoZ3Vlc3QsIG1lc3NhZ2UsIHJvb21JbmZvKSB7XG5cdFx0bGV0IGFnZW50cyA9IFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0T25saW5lQWdlbnRzKGd1ZXN0LmRlcGFydG1lbnQpO1xuXG5cdFx0aWYgKGFnZW50cy5jb3VudCgpID09PSAwICYmIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9ndWVzdF9wb29sX3dpdGhfbm9fYWdlbnRzJykpIHtcblx0XHRcdGFnZW50cyA9IFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0QWdlbnRzKGd1ZXN0LmRlcGFydG1lbnQpO1xuXHRcdH1cblxuXHRcdGlmIChhZ2VudHMuY291bnQoKSA9PT0gMCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm8tYWdlbnQtb25saW5lJywgJ1NvcnJ5LCBubyBvbmxpbmUgYWdlbnRzJyk7XG5cdFx0fVxuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMudXBkYXRlTGl2ZWNoYXRSb29tQ291bnQoKTtcblxuXHRcdGNvbnN0IGFnZW50SWRzID0gW107XG5cblx0XHRhZ2VudHMuZm9yRWFjaCgoYWdlbnQpID0+IHtcblx0XHRcdGlmIChndWVzdC5kZXBhcnRtZW50KSB7XG5cdFx0XHRcdGFnZW50SWRzLnB1c2goYWdlbnQuYWdlbnRJZCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRhZ2VudElkcy5wdXNoKGFnZW50Ll9pZCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRjb25zdCBpbnF1aXJ5ID0ge1xuXHRcdFx0cmlkOiBtZXNzYWdlLnJpZCxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2UubXNnLFxuXHRcdFx0bmFtZTogZ3Vlc3QubmFtZSB8fCBndWVzdC51c2VybmFtZSxcblx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0ZGVwYXJ0bWVudDogZ3Vlc3QuZGVwYXJ0bWVudCxcblx0XHRcdGFnZW50czogYWdlbnRJZHMsXG5cdFx0XHRzdGF0dXM6ICdvcGVuJyxcblx0XHRcdHY6IHtcblx0XHRcdFx0X2lkOiBndWVzdC5faWQsXG5cdFx0XHRcdHVzZXJuYW1lOiBndWVzdC51c2VybmFtZSxcblx0XHRcdFx0dG9rZW46IG1lc3NhZ2UudG9rZW4sXG5cdFx0XHRcdHN0YXR1czogZ3Vlc3Quc3RhdHVzIHx8ICdvbmxpbmUnLFxuXHRcdFx0fSxcblx0XHRcdHQ6ICdsJyxcblx0XHR9O1xuXG5cdFx0Y29uc3Qgcm9vbSA9IF8uZXh0ZW5kKHtcblx0XHRcdF9pZDogbWVzc2FnZS5yaWQsXG5cdFx0XHRtc2dzOiAwLFxuXHRcdFx0dXNlcnNDb3VudDogMCxcblx0XHRcdGxtOiBuZXcgRGF0ZSgpLFxuXHRcdFx0Zm5hbWU6IGd1ZXN0Lm5hbWUgfHwgZ3Vlc3QudXNlcm5hbWUsXG5cdFx0XHQvLyB1c2VybmFtZXM6IFtndWVzdC51c2VybmFtZV0sXG5cdFx0XHR0OiAnbCcsXG5cdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdHY6IHtcblx0XHRcdFx0X2lkOiBndWVzdC5faWQsXG5cdFx0XHRcdHVzZXJuYW1lOiBndWVzdC51c2VybmFtZSxcblx0XHRcdFx0dG9rZW46IG1lc3NhZ2UudG9rZW4sXG5cdFx0XHRcdHN0YXR1czogZ3Vlc3Quc3RhdHVzLFxuXHRcdFx0fSxcblx0XHRcdGNsOiBmYWxzZSxcblx0XHRcdG9wZW46IHRydWUsXG5cdFx0XHR3YWl0aW5nUmVzcG9uc2U6IHRydWUsXG5cdFx0fSwgcm9vbUluZm8pO1xuXG5cdFx0aWYgKGd1ZXN0LmRlcGFydG1lbnQpIHtcblx0XHRcdHJvb20uZGVwYXJ0bWVudElkID0gZ3Vlc3QuZGVwYXJ0bWVudDtcblx0XHR9XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdElucXVpcnkuaW5zZXJ0KGlucXVpcnkpO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmluc2VydChyb29tKTtcblxuXHRcdC8vIEFsZXJ0IHRoZSBhZ2VudHMgb2YgdGhlIHF1ZXVlZCByZXF1ZXN0XG5cdFx0YWdlbnRJZHMuZm9yRWFjaCgoYWdlbnRJZCkgPT4ge1xuXHRcdFx0c2VuZE5vdGlmaWNhdGlvbih7XG5cdFx0XHRcdC8vIGZha2UgYSBzdWJzY3JpcHRpb24gaW4gb3JkZXIgdG8gbWFrZSB1c2Ugb2YgdGhlIGZ1bmN0aW9uIGRlZmluZWQgYWJvdmVcblx0XHRcdFx0c3Vic2NyaXB0aW9uOiB7XG5cdFx0XHRcdFx0cmlkOiByb29tLl9pZCxcblx0XHRcdFx0XHR0IDogcm9vbS50LFxuXHRcdFx0XHRcdHU6IHtcblx0XHRcdFx0XHRcdF9pZCA6IGFnZW50SWQsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSxcblx0XHRcdFx0c2VuZGVyOiByb29tLnYsXG5cdFx0XHRcdGhhc01lbnRpb25Ub0FsbDogdHJ1ZSwgLy8gY29uc2lkZXIgYWxsIGFnZW50cyB0byBiZSBpbiB0aGUgcm9vbVxuXHRcdFx0XHRoYXNNZW50aW9uVG9IZXJlOiBmYWxzZSxcblx0XHRcdFx0bWVzc2FnZTogT2JqZWN0LmFzc2lnbihtZXNzYWdlLCB7IHU6IHJvb20udiB9KSxcblx0XHRcdFx0bm90aWZpY2F0aW9uTWVzc2FnZTogbWVzc2FnZS5tc2csXG5cdFx0XHRcdHJvb206IE9iamVjdC5hc3NpZ24ocm9vbSwgeyBuYW1lOiBUQVBpMThuLl9fKCdOZXdfbGl2ZWNoYXRfaW5fcXVldWUnKSB9KSxcblx0XHRcdFx0bWVudGlvbklkczogW10sXG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRyZXR1cm4gcm9vbTtcblx0fSxcblx0J0V4dGVybmFsJyhndWVzdCwgbWVzc2FnZSwgcm9vbUluZm8sIGFnZW50KSB7XG5cdFx0cmV0dXJuIHRoaXNbJ0xlYXN0X0Ftb3VudCddKGd1ZXN0LCBtZXNzYWdlLCByb29tSW5mbywgYWdlbnQpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG5cdH0sXG59O1xuIiwiLy8gRXZlcnkgbWludXRlIGNoZWNrIGlmIG9mZmljZSBjbG9zZWRcbk1ldGVvci5zZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcblx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9lbmFibGVfb2ZmaWNlX2hvdXJzJykpIHtcblx0XHRpZiAoUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRPZmZpY2VIb3VyLmlzT3BlbmluZ1RpbWUoKSkge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMub3Blbk9mZmljZSgpO1xuXHRcdH0gZWxzZSBpZiAoUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRPZmZpY2VIb3VyLmlzQ2xvc2luZ1RpbWUoKSkge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuY2xvc2VPZmZpY2UoKTtcblx0XHR9XG5cdH1cbn0sIDYwMDAwKTtcbiIsImNvbnN0IGdhdGV3YXlVUkwgPSAnaHR0cHM6Ly9vbW5pLnJvY2tldC5jaGF0JztcblxuZXhwb3J0IGRlZmF1bHQge1xuXHRlbmFibGUoKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gSFRUUC5jYWxsKCdQT1NUJywgYCR7IGdhdGV3YXlVUkwgfS9mYWNlYm9vay9lbmFibGVgLCB7XG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdGF1dGhvcml6YXRpb246IGBCZWFyZXIgJHsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0ZhY2Vib29rX0FQSV9LZXknKSB9YCxcblx0XHRcdFx0J2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcblx0XHRcdH0sXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVybDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NpdGVfVXJsJyksXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdHJldHVybiByZXN1bHQuZGF0YTtcblx0fSxcblxuXHRkaXNhYmxlKCkge1xuXHRcdGNvbnN0IHJlc3VsdCA9IEhUVFAuY2FsbCgnREVMRVRFJywgYCR7IGdhdGV3YXlVUkwgfS9mYWNlYm9vay9lbmFibGVgLCB7XG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdGF1dGhvcml6YXRpb246IGBCZWFyZXIgJHsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0ZhY2Vib29rX0FQSV9LZXknKSB9YCxcblx0XHRcdFx0J2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0cmV0dXJuIHJlc3VsdC5kYXRhO1xuXHR9LFxuXG5cdGxpc3RQYWdlcygpIHtcblx0XHRjb25zdCByZXN1bHQgPSBIVFRQLmNhbGwoJ0dFVCcsIGAkeyBnYXRld2F5VVJMIH0vZmFjZWJvb2svcGFnZXNgLCB7XG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdGF1dGhvcml6YXRpb246IGBCZWFyZXIgJHsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0ZhY2Vib29rX0FQSV9LZXknKSB9YCxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0cmV0dXJuIHJlc3VsdC5kYXRhO1xuXHR9LFxuXG5cdHN1YnNjcmliZShwYWdlSWQpIHtcblx0XHRjb25zdCByZXN1bHQgPSBIVFRQLmNhbGwoJ1BPU1QnLCBgJHsgZ2F0ZXdheVVSTCB9L2ZhY2Vib29rL3BhZ2UvJHsgcGFnZUlkIH0vc3Vic2NyaWJlYCwge1xuXHRcdFx0aGVhZGVyczoge1xuXHRcdFx0XHRhdXRob3JpemF0aW9uOiBgQmVhcmVyICR7IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19BUElfS2V5JykgfWAsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdHJldHVybiByZXN1bHQuZGF0YTtcblx0fSxcblxuXHR1bnN1YnNjcmliZShwYWdlSWQpIHtcblx0XHRjb25zdCByZXN1bHQgPSBIVFRQLmNhbGwoJ0RFTEVURScsIGAkeyBnYXRld2F5VVJMIH0vZmFjZWJvb2svcGFnZS8keyBwYWdlSWQgfS9zdWJzY3JpYmVgLCB7XG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdGF1dGhvcml6YXRpb246IGBCZWFyZXIgJHsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X0ZhY2Vib29rX0FQSV9LZXknKSB9YCxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0cmV0dXJuIHJlc3VsdC5kYXRhO1xuXHR9LFxuXG5cdHJlcGx5KHsgcGFnZSwgdG9rZW4sIHRleHQgfSkge1xuXHRcdHJldHVybiBIVFRQLmNhbGwoJ1BPU1QnLCBgJHsgZ2F0ZXdheVVSTCB9L2ZhY2Vib29rL3JlcGx5YCwge1xuXHRcdFx0aGVhZGVyczoge1xuXHRcdFx0XHRhdXRob3JpemF0aW9uOiBgQmVhcmVyICR7IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19BUElfS2V5JykgfWAsXG5cdFx0XHR9LFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRwYWdlLFxuXHRcdFx0XHR0b2tlbixcblx0XHRcdFx0dGV4dCxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG59O1xuIiwiaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJTYXZlTWVzc2FnZScsIGZ1bmN0aW9uKG1lc3NhZ2UsIHJvb20pIHtcblx0Ly8gc2tpcHMgdGhpcyBjYWxsYmFjayBpZiB0aGUgbWVzc2FnZSB3YXMgZWRpdGVkXG5cdGlmIChtZXNzYWdlLmVkaXRlZEF0KSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuU01TLmVuYWJsZWQpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdC8vIG9ubHkgc2VuZCB0aGUgc21zIGJ5IFNNUyBpZiBpdCBpcyBhIGxpdmVjaGF0IHJvb20gd2l0aCBTTVMgc2V0IHRvIHRydWVcblx0aWYgKCEodHlwZW9mIHJvb20udCAhPT0gJ3VuZGVmaW5lZCcgJiYgcm9vbS50ID09PSAnbCcgJiYgcm9vbS5zbXMgJiYgcm9vbS52ICYmIHJvb20udi50b2tlbikpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdC8vIGlmIHRoZSBtZXNzYWdlIGhhcyBhIHRva2VuLCBpdCB3YXMgc2VudCBmcm9tIHRoZSB2aXNpdG9yLCBzbyBpZ25vcmUgaXRcblx0aWYgKG1lc3NhZ2UudG9rZW4pIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdC8vIGlmIHRoZSBtZXNzYWdlIGhhcyBhIHR5cGUgbWVhbnMgaXQgaXMgYSBzcGVjaWFsIG1lc3NhZ2UgKGxpa2UgdGhlIGNsb3NpbmcgY29tbWVudCksIHNvIHNraXBzXG5cdGlmIChtZXNzYWdlLnQpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdGNvbnN0IFNNU1NlcnZpY2UgPSBSb2NrZXRDaGF0LlNNUy5nZXRTZXJ2aWNlKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTTVNfU2VydmljZScpKTtcblxuXHRpZiAoIVNNU1NlcnZpY2UpIHtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHJvb20udi50b2tlbik7XG5cblx0aWYgKCF2aXNpdG9yIHx8ICF2aXNpdG9yLnBob25lIHx8IHZpc2l0b3IucGhvbmUubGVuZ3RoID09PSAwKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHRTTVNTZXJ2aWNlLnNlbmQocm9vbS5zbXMuZnJvbSwgdmlzaXRvci5waG9uZVswXS5waG9uZU51bWJlciwgbWVzc2FnZS5tc2cpO1xuXG5cdHJldHVybiBtZXNzYWdlO1xuXG59LCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdzZW5kTWVzc2FnZUJ5U21zJyk7XG4iLCIvKiBnbG9iYWxzIFVzZXJQcmVzZW5jZU1vbml0b3IgKi9cblxubGV0IGFnZW50c0hhbmRsZXI7XG5sZXQgbW9uaXRvckFnZW50cyA9IGZhbHNlO1xubGV0IGFjdGlvblRpbWVvdXQgPSA2MDAwMDtcblxuY29uc3Qgb25saW5lQWdlbnRzID0ge1xuXHR1c2Vyczoge30sXG5cdHF1ZXVlOiB7fSxcblxuXHRhZGQodXNlcklkKSB7XG5cdFx0aWYgKHRoaXMucXVldWVbdXNlcklkXSkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMucXVldWVbdXNlcklkXSk7XG5cdFx0XHRkZWxldGUgdGhpcy5xdWV1ZVt1c2VySWRdO1xuXHRcdH1cblx0XHR0aGlzLnVzZXJzW3VzZXJJZF0gPSAxO1xuXHR9LFxuXG5cdHJlbW92ZSh1c2VySWQsIGNhbGxiYWNrKSB7XG5cdFx0aWYgKHRoaXMucXVldWVbdXNlcklkXSkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMucXVldWVbdXNlcklkXSk7XG5cdFx0fVxuXHRcdHRoaXMucXVldWVbdXNlcklkXSA9IHNldFRpbWVvdXQoTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygpO1xuXG5cdFx0XHRkZWxldGUgdGhpcy51c2Vyc1t1c2VySWRdO1xuXHRcdFx0ZGVsZXRlIHRoaXMucXVldWVbdXNlcklkXTtcblx0XHR9KSwgYWN0aW9uVGltZW91dCk7XG5cdH0sXG5cblx0ZXhpc3RzKHVzZXJJZCkge1xuXHRcdHJldHVybiAhIXRoaXMudXNlcnNbdXNlcklkXTtcblx0fSxcbn07XG5cbmZ1bmN0aW9uIHJ1bkFnZW50TGVhdmVBY3Rpb24odXNlcklkKSB7XG5cdGNvbnN0IGFjdGlvbiA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9hZ2VudF9sZWF2ZV9hY3Rpb24nKTtcblx0aWYgKGFjdGlvbiA9PT0gJ2Nsb3NlJykge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LkxpdmVjaGF0LmNsb3NlT3BlbkNoYXRzKHVzZXJJZCwgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X2FnZW50X2xlYXZlX2NvbW1lbnQnKSk7XG5cdH0gZWxzZSBpZiAoYWN0aW9uID09PSAnZm9yd2FyZCcpIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5mb3J3YXJkT3BlbkNoYXRzKHVzZXJJZCk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xpdmVjaGF0X2FnZW50X2xlYXZlX2FjdGlvbl90aW1lb3V0JywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHRhY3Rpb25UaW1lb3V0ID0gdmFsdWUgKiAxMDAwO1xufSk7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9hZ2VudF9sZWF2ZV9hY3Rpb24nLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdG1vbml0b3JBZ2VudHMgPSB2YWx1ZTtcblx0aWYgKHZhbHVlICE9PSAnbm9uZScpIHtcblx0XHRpZiAoIWFnZW50c0hhbmRsZXIpIHtcblx0XHRcdGFnZW50c0hhbmRsZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25saW5lQWdlbnRzKCkub2JzZXJ2ZUNoYW5nZXMoe1xuXHRcdFx0XHRhZGRlZChpZCkge1xuXHRcdFx0XHRcdG9ubGluZUFnZW50cy5hZGQoaWQpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0XHRcdFx0XHRpZiAoZmllbGRzLnN0YXR1c0xpdmVjaGF0ICYmIGZpZWxkcy5zdGF0dXNMaXZlY2hhdCA9PT0gJ25vdC1hdmFpbGFibGUnKSB7XG5cdFx0XHRcdFx0XHRvbmxpbmVBZ2VudHMucmVtb3ZlKGlkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHJ1bkFnZW50TGVhdmVBY3Rpb24oaWQpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdG9ubGluZUFnZW50cy5hZGQoaWQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0cmVtb3ZlZChpZCkge1xuXHRcdFx0XHRcdG9ubGluZUFnZW50cy5yZW1vdmUoaWQsICgpID0+IHtcblx0XHRcdFx0XHRcdHJ1bkFnZW50TGVhdmVBY3Rpb24oaWQpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9IGVsc2UgaWYgKGFnZW50c0hhbmRsZXIpIHtcblx0XHRhZ2VudHNIYW5kbGVyLnN0b3AoKTtcblx0XHRhZ2VudHNIYW5kbGVyID0gbnVsbDtcblx0fVxufSk7XG5cblVzZXJQcmVzZW5jZU1vbml0b3Iub25TZXRVc2VyU3RhdHVzKCh1c2VyLCBzdGF0dXMvKiAsIHN0YXR1c0Nvbm5lY3Rpb24qLykgPT4ge1xuXHRpZiAoIW1vbml0b3JBZ2VudHMpIHtcblx0XHRyZXR1cm47XG5cdH1cblx0aWYgKG9ubGluZUFnZW50cy5leGlzdHModXNlci5faWQpKSB7XG5cdFx0aWYgKHN0YXR1cyA9PT0gJ29mZmxpbmUnIHx8IHVzZXIuc3RhdHVzTGl2ZWNoYXQgPT09ICdub3QtYXZhaWxhYmxlJykge1xuXHRcdFx0b25saW5lQWdlbnRzLnJlbW92ZSh1c2VyLl9pZCwgKCkgPT4ge1xuXHRcdFx0XHRydW5BZ2VudExlYXZlQWN0aW9uKHVzZXIuX2lkKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxufSk7XG4iLCJpbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5cbk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDpjdXN0b21GaWVsZHMnLCBmdW5jdGlvbihfaWQpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6Y3VzdG9tRmllbGRzJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmN1c3RvbUZpZWxkcycgfSkpO1xuXHR9XG5cblx0aWYgKHMudHJpbShfaWQpKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0Q3VzdG9tRmllbGQuZmluZCh7IF9pZCB9KTtcblx0fVxuXG5cdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdEN1c3RvbUZpZWxkLmZpbmQoKTtcblxufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6ZGVwYXJ0bWVudEFnZW50cycsIGZ1bmN0aW9uKGRlcGFydG1lbnRJZCkge1xuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDpkZXBhcnRtZW50QWdlbnRzJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtcm9vbXMnKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6ZGVwYXJ0bWVudEFnZW50cycgfSkpO1xuXHR9XG5cblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cy5maW5kKHsgZGVwYXJ0bWVudElkIH0pO1xufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6ZXh0ZXJuYWxNZXNzYWdlcycsIGZ1bmN0aW9uKHJvb21JZCkge1xuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRFeHRlcm5hbE1lc3NhZ2UuZmluZEJ5Um9vbUlkKHJvb21JZCk7XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDphZ2VudHMnLCBmdW5jdGlvbigpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6YWdlbnRzJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmFnZW50cycgfSkpO1xuXHR9XG5cblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0Y29uc3QgaGFuZGxlID0gUm9ja2V0Q2hhdC5hdXRoei5nZXRVc2Vyc0luUm9sZSgnbGl2ZWNoYXQtYWdlbnQnKS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5hZGRlZCgnYWdlbnRVc2VycycsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZChpZCwgZmllbGRzKSB7XG5cdFx0XHRzZWxmLmNoYW5nZWQoJ2FnZW50VXNlcnMnLCBpZCwgZmllbGRzKTtcblx0XHR9LFxuXHRcdHJlbW92ZWQoaWQpIHtcblx0XHRcdHNlbGYucmVtb3ZlZCgnYWdlbnRVc2VycycsIGlkKTtcblx0XHR9LFxuXHR9KTtcblxuXHRzZWxmLnJlYWR5KCk7XG5cblx0c2VsZi5vblN0b3AoZnVuY3Rpb24oKSB7XG5cdFx0aGFuZGxlLnN0b3AoKTtcblx0fSk7XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDphcHBlYXJhbmNlJywgZnVuY3Rpb24oKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmFwcGVhcmFuY2UnIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmFwcGVhcmFuY2UnIH0pKTtcblx0fVxuXG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZDoge1xuXHRcdFx0JGluOiBbXG5cdFx0XHRcdCdMaXZlY2hhdF90aXRsZScsXG5cdFx0XHRcdCdMaXZlY2hhdF90aXRsZV9jb2xvcicsXG5cdFx0XHRcdCdMaXZlY2hhdF9zaG93X2FnZW50X2VtYWlsJyxcblx0XHRcdFx0J0xpdmVjaGF0X2Rpc3BsYXlfb2ZmbGluZV9mb3JtJyxcblx0XHRcdFx0J0xpdmVjaGF0X29mZmxpbmVfZm9ybV91bmF2YWlsYWJsZScsXG5cdFx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX21lc3NhZ2UnLFxuXHRcdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV9zdWNjZXNzX21lc3NhZ2UnLFxuXHRcdFx0XHQnTGl2ZWNoYXRfb2ZmbGluZV90aXRsZScsXG5cdFx0XHRcdCdMaXZlY2hhdF9vZmZsaW5lX3RpdGxlX2NvbG9yJyxcblx0XHRcdFx0J0xpdmVjaGF0X29mZmxpbmVfZW1haWwnLFxuXHRcdFx0XHQnTGl2ZWNoYXRfY29udmVyc2F0aW9uX2ZpbmlzaGVkX21lc3NhZ2UnLFxuXHRcdFx0XHQnTGl2ZWNoYXRfcmVnaXN0cmF0aW9uX2Zvcm0nLFxuXHRcdFx0XHQnTGl2ZWNoYXRfbmFtZV9maWVsZF9yZWdpc3RyYXRpb25fZm9ybScsXG5cdFx0XHRcdCdMaXZlY2hhdF9lbWFpbF9maWVsZF9yZWdpc3RyYXRpb25fZm9ybScsXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH07XG5cblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0Y29uc3QgaGFuZGxlID0gUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZChxdWVyeSkub2JzZXJ2ZUNoYW5nZXMoe1xuXHRcdGFkZGVkKGlkLCBmaWVsZHMpIHtcblx0XHRcdHNlbGYuYWRkZWQoJ2xpdmVjaGF0QXBwZWFyYW5jZScsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZChpZCwgZmllbGRzKSB7XG5cdFx0XHRzZWxmLmNoYW5nZWQoJ2xpdmVjaGF0QXBwZWFyYW5jZScsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlZChpZCkge1xuXHRcdFx0c2VsZi5yZW1vdmVkKCdsaXZlY2hhdEFwcGVhcmFuY2UnLCBpZCk7XG5cdFx0fSxcblx0fSk7XG5cblx0dGhpcy5yZWFkeSgpO1xuXG5cdHRoaXMub25TdG9wKCgpID0+IHtcblx0XHRoYW5kbGUuc3RvcCgpO1xuXHR9KTtcbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ2xpdmVjaGF0OmRlcGFydG1lbnRzJywgZnVuY3Rpb24oX2lkKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmFnZW50cycgfSkpO1xuXHR9XG5cblx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWwtcm9vbScpKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDphZ2VudHMnIH0pKTtcblx0fVxuXG5cdGlmIChfaWQgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnQuZmluZEJ5RGVwYXJ0bWVudElkKF9pZCk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudC5maW5kKCk7XG5cdH1cblxufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6aW50ZWdyYXRpb24nLCBmdW5jdGlvbigpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6aW50ZWdyYXRpb24nIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmludGVncmF0aW9uJyB9KSk7XG5cdH1cblxuXHRjb25zdCBzZWxmID0gdGhpcztcblxuXHRjb25zdCBoYW5kbGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kQnlJZHMoWydMaXZlY2hhdF93ZWJob29rVXJsJywgJ0xpdmVjaGF0X3NlY3JldF90b2tlbicsICdMaXZlY2hhdF93ZWJob29rX29uX2Nsb3NlJywgJ0xpdmVjaGF0X3dlYmhvb2tfb25fb2ZmbGluZV9tc2cnLCAnTGl2ZWNoYXRfd2ViaG9va19vbl92aXNpdG9yX21lc3NhZ2UnLCAnTGl2ZWNoYXRfd2ViaG9va19vbl9hZ2VudF9tZXNzYWdlJ10pLm9ic2VydmVDaGFuZ2VzKHtcblx0XHRhZGRlZChpZCwgZmllbGRzKSB7XG5cdFx0XHRzZWxmLmFkZGVkKCdsaXZlY2hhdEludGVncmF0aW9uJywgaWQsIGZpZWxkcyk7XG5cdFx0fSxcblx0XHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0XHRcdHNlbGYuY2hhbmdlZCgnbGl2ZWNoYXRJbnRlZ3JhdGlvbicsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlZChpZCkge1xuXHRcdFx0c2VsZi5yZW1vdmVkKCdsaXZlY2hhdEludGVncmF0aW9uJywgaWQpO1xuXHRcdH0sXG5cdH0pO1xuXG5cdHNlbGYucmVhZHkoKTtcblxuXHRzZWxmLm9uU3RvcChmdW5jdGlvbigpIHtcblx0XHRoYW5kbGUuc3RvcCgpO1xuXHR9KTtcbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ2xpdmVjaGF0Om1hbmFnZXJzJywgZnVuY3Rpb24oKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0Om1hbmFnZXJzJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtcm9vbXMnKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6bWFuYWdlcnMnIH0pKTtcblx0fVxuXG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXG5cdGNvbnN0IGhhbmRsZSA9IFJvY2tldENoYXQuYXV0aHouZ2V0VXNlcnNJblJvbGUoJ2xpdmVjaGF0LW1hbmFnZXInKS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5hZGRlZCgnbWFuYWdlclVzZXJzJywgaWQsIGZpZWxkcyk7XG5cdFx0fSxcblx0XHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0XHRcdHNlbGYuY2hhbmdlZCgnbWFuYWdlclVzZXJzJywgaWQsIGZpZWxkcyk7XG5cdFx0fSxcblx0XHRyZW1vdmVkKGlkKSB7XG5cdFx0XHRzZWxmLnJlbW92ZWQoJ21hbmFnZXJVc2VycycsIGlkKTtcblx0XHR9LFxuXHR9KTtcblxuXHRzZWxmLnJlYWR5KCk7XG5cblx0c2VsZi5vblN0b3AoZnVuY3Rpb24oKSB7XG5cdFx0aGFuZGxlLnN0b3AoKTtcblx0fSk7XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDptb25pdG9yaW5nJywgZnVuY3Rpb24oZGF0ZSkge1xuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDptb25pdG9yaW5nJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDptb25pdG9yaW5nJyB9KSk7XG5cdH1cblxuXHRkYXRlID0ge1xuXHRcdGd0ZTogbmV3IERhdGUoZGF0ZS5ndGUpLFxuXHRcdGx0OiBuZXcgRGF0ZShkYXRlLmx0KSxcblx0fTtcblxuXHRjaGVjayhkYXRlLmd0ZSwgRGF0ZSk7XG5cdGNoZWNrKGRhdGUubHQsIERhdGUpO1xuXG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXG5cdGNvbnN0IGhhbmRsZSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmdldEFuYWx5dGljc01ldHJpY3NCZXR3ZWVuRGF0ZSgnbCcsIGRhdGUpLm9ic2VydmVDaGFuZ2VzKHtcblx0XHRhZGRlZChpZCwgZmllbGRzKSB7XG5cdFx0XHRzZWxmLmFkZGVkKCdsaXZlY2hhdE1vbml0b3JpbmcnLCBpZCwgZmllbGRzKTtcblx0XHR9LFxuXHRcdGNoYW5nZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5jaGFuZ2VkKCdsaXZlY2hhdE1vbml0b3JpbmcnLCBpZCwgZmllbGRzKTtcblx0XHR9LFxuXHRcdHJlbW92ZWQoaWQpIHtcblx0XHRcdHNlbGYucmVtb3ZlZCgnbGl2ZWNoYXRNb25pdG9yaW5nJywgaWQpO1xuXHRcdH0sXG5cdH0pO1xuXG5cdHNlbGYucmVhZHkoKTtcblxuXHRzZWxmLm9uU3RvcChmdW5jdGlvbigpIHtcblx0XHRoYW5kbGUuc3RvcCgpO1xuXHR9KTtcbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ2xpdmVjaGF0OnJvb21zJywgZnVuY3Rpb24oZmlsdGVyID0ge30sIG9mZnNldCA9IDAsIGxpbWl0ID0gMjApIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6cm9vbXMnIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1yb29tcycpKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDpyb29tcycgfSkpO1xuXHR9XG5cblx0Y2hlY2soZmlsdGVyLCB7XG5cdFx0bmFtZTogTWF0Y2guTWF5YmUoU3RyaW5nKSwgLy8gcm9vbSBuYW1lIHRvIGZpbHRlclxuXHRcdGFnZW50OiBNYXRjaC5NYXliZShTdHJpbmcpLCAvLyBhZ2VudCBfaWQgd2hvIGlzIHNlcnZpbmdcblx0XHRzdGF0dXM6IE1hdGNoLk1heWJlKFN0cmluZyksIC8vIGVpdGhlciAnb3BlbmVkJyBvciAnY2xvc2VkJ1xuXHRcdGZyb206IE1hdGNoLk1heWJlKERhdGUpLFxuXHRcdHRvOiBNYXRjaC5NYXliZShEYXRlKSxcblx0fSk7XG5cblx0Y29uc3QgcXVlcnkgPSB7fTtcblx0aWYgKGZpbHRlci5uYW1lKSB7XG5cdFx0cXVlcnkubGFiZWwgPSBuZXcgUmVnRXhwKGZpbHRlci5uYW1lLCAnaScpO1xuXHR9XG5cdGlmIChmaWx0ZXIuYWdlbnQpIHtcblx0XHRxdWVyeVsnc2VydmVkQnkuX2lkJ10gPSBmaWx0ZXIuYWdlbnQ7XG5cdH1cblx0aWYgKGZpbHRlci5zdGF0dXMpIHtcblx0XHRpZiAoZmlsdGVyLnN0YXR1cyA9PT0gJ29wZW5lZCcpIHtcblx0XHRcdHF1ZXJ5Lm9wZW4gPSB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRxdWVyeS5vcGVuID0geyAkZXhpc3RzOiBmYWxzZSB9O1xuXHRcdH1cblx0fVxuXHRpZiAoZmlsdGVyLmZyb20pIHtcblx0XHRxdWVyeS50cyA9IHtcblx0XHRcdCRndGU6IGZpbHRlci5mcm9tLFxuXHRcdH07XG5cdH1cblx0aWYgKGZpbHRlci50bykge1xuXHRcdGZpbHRlci50by5zZXREYXRlKGZpbHRlci50by5nZXREYXRlKCkgKyAxKTtcblx0XHRmaWx0ZXIudG8uc2V0U2Vjb25kcyhmaWx0ZXIudG8uZ2V0U2Vjb25kcygpIC0gMSk7XG5cblx0XHRpZiAoIXF1ZXJ5LnRzKSB7XG5cdFx0XHRxdWVyeS50cyA9IHt9O1xuXHRcdH1cblx0XHRxdWVyeS50cy4kbHRlID0gZmlsdGVyLnRvO1xuXHR9XG5cblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0Y29uc3QgaGFuZGxlID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZExpdmVjaGF0KHF1ZXJ5LCBvZmZzZXQsIGxpbWl0KS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5hZGRlZCgnbGl2ZWNoYXRSb29tJywgaWQsIGZpZWxkcyk7XG5cdFx0fSxcblx0XHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0XHRcdHNlbGYuY2hhbmdlZCgnbGl2ZWNoYXRSb29tJywgaWQsIGZpZWxkcyk7XG5cdFx0fSxcblx0XHRyZW1vdmVkKGlkKSB7XG5cdFx0XHRzZWxmLnJlbW92ZWQoJ2xpdmVjaGF0Um9vbScsIGlkKTtcblx0XHR9LFxuXHR9KTtcblxuXHR0aGlzLnJlYWR5KCk7XG5cblx0dGhpcy5vblN0b3AoKCkgPT4ge1xuXHRcdGhhbmRsZS5zdG9wKCk7XG5cdH0pO1xufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6cXVldWUnLCBmdW5jdGlvbigpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6cXVldWUnIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1sLXJvb20nKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6cXVldWUnIH0pKTtcblx0fVxuXG5cdC8vIGxldCBzb3J0ID0geyBjb3VudDogMSwgc29ydDogMSwgdXNlcm5hbWU6IDEgfTtcblx0Ly8gbGV0IG9ubGluZVVzZXJzID0ge307XG5cblx0Ly8gbGV0IGhhbmRsZVVzZXJzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9ubGluZUFnZW50cygpLm9ic2VydmVDaGFuZ2VzKHtcblx0Ly8gXHRhZGRlZChpZCwgZmllbGRzKSB7XG5cdC8vIFx0XHRvbmxpbmVVc2Vyc1tmaWVsZHMudXNlcm5hbWVdID0gMTtcblx0Ly8gXHRcdC8vIHRoaXMuYWRkZWQoJ2xpdmVjaGF0UXVldWVVc2VyJywgaWQsIGZpZWxkcyk7XG5cdC8vIFx0fSxcblx0Ly8gXHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0Ly8gXHRcdG9ubGluZVVzZXJzW2ZpZWxkcy51c2VybmFtZV0gPSAxO1xuXHQvLyBcdFx0Ly8gdGhpcy5jaGFuZ2VkKCdsaXZlY2hhdFF1ZXVlVXNlcicsIGlkLCBmaWVsZHMpO1xuXHQvLyBcdH0sXG5cdC8vIFx0cmVtb3ZlZChpZCkge1xuXHQvLyBcdFx0dGhpcy5yZW1vdmVkKCdsaXZlY2hhdFF1ZXVlVXNlcicsIGlkKTtcblx0Ly8gXHR9XG5cdC8vIH0pO1xuXG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXG5cdGNvbnN0IGhhbmRsZURlcHRzID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLmZpbmRVc2Vyc0luUXVldWUoKS5vYnNlcnZlQ2hhbmdlcyh7XG5cdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5hZGRlZCgnbGl2ZWNoYXRRdWV1ZVVzZXInLCBpZCwgZmllbGRzKTtcblx0XHR9LFxuXHRcdGNoYW5nZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5jaGFuZ2VkKCdsaXZlY2hhdFF1ZXVlVXNlcicsIGlkLCBmaWVsZHMpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlZChpZCkge1xuXHRcdFx0c2VsZi5yZW1vdmVkKCdsaXZlY2hhdFF1ZXVlVXNlcicsIGlkKTtcblx0XHR9LFxuXHR9KTtcblxuXHR0aGlzLnJlYWR5KCk7XG5cblx0dGhpcy5vblN0b3AoKCkgPT4ge1xuXHRcdC8vIGhhbmRsZVVzZXJzLnN0b3AoKTtcblx0XHRoYW5kbGVEZXB0cy5zdG9wKCk7XG5cdH0pO1xufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6dHJpZ2dlcnMnLCBmdW5jdGlvbihfaWQpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6dHJpZ2dlcnMnIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OnRyaWdnZXJzJyB9KSk7XG5cdH1cblxuXHRpZiAoX2lkICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRUcmlnZ2VyLmZpbmRCeUlkKF9pZCk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0VHJpZ2dlci5maW5kKCk7XG5cdH1cbn0pO1xuIiwiaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5NZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6dmlzaXRvcnMnLCBmdW5jdGlvbihkYXRlKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OnZpc2l0b3JzJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDp2aXNpdG9ycycgfSkpO1xuXHR9XG5cblx0ZGF0ZSA9IHtcblx0XHRndGU6IG5ldyBEYXRlKGRhdGUuZ3RlKSxcblx0XHRsdDogbmV3IERhdGUoZGF0ZS5sdCksXG5cdH07XG5cblx0Y2hlY2soZGF0ZS5ndGUsIERhdGUpO1xuXHRjaGVjayhkYXRlLmx0LCBEYXRlKTtcblxuXHRjb25zdCBzZWxmID0gdGhpcztcblxuXHRjb25zdCBoYW5kbGUgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JzQmV0d2VlbkRhdGUoZGF0ZSkub2JzZXJ2ZUNoYW5nZXMoe1xuXHRcdGFkZGVkKGlkLCBmaWVsZHMpIHtcblx0XHRcdHNlbGYuYWRkZWQoJ2xpdmVjaGF0VmlzaXRvcnMnLCBpZCwgZmllbGRzKTtcblx0XHR9LFxuXHRcdGNoYW5nZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0c2VsZi5jaGFuZ2VkKCdsaXZlY2hhdFZpc2l0b3JzJywgaWQsIGZpZWxkcyk7XG5cdFx0fSxcblx0XHRyZW1vdmVkKGlkKSB7XG5cdFx0XHRzZWxmLnJlbW92ZWQoJ2xpdmVjaGF0VmlzaXRvcnMnLCBpZCk7XG5cdFx0fSxcblx0fSk7XG5cblx0c2VsZi5yZWFkeSgpO1xuXG5cdHNlbGYub25TdG9wKGZ1bmN0aW9uKCkge1xuXHRcdGhhbmRsZS5zdG9wKCk7XG5cdH0pO1xufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6dmlzaXRvckhpc3RvcnknLCBmdW5jdGlvbih7IHJpZDogcm9vbUlkIH0pIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6dmlzaXRvckhpc3RvcnknIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1sLXJvb20nKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6dmlzaXRvckhpc3RvcnknIH0pKTtcblx0fVxuXG5cdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tSWQpO1xuXG5cdGNvbnN0IHN1YnNjcmlwdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHJvb20uX2lkLCB0aGlzLnVzZXJJZCwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSk7XG5cdGlmICghc3Vic2NyaXB0aW9uKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICdsaXZlY2hhdDp2aXNpdG9ySGlzdG9yeScgfSkpO1xuXHR9XG5cblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0aWYgKHJvb20gJiYgcm9vbS52ICYmIHJvb20udi5faWQpIHtcblx0XHRjb25zdCBoYW5kbGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlWaXNpdG9ySWQocm9vbS52Ll9pZCkub2JzZXJ2ZUNoYW5nZXMoe1xuXHRcdFx0YWRkZWQoaWQsIGZpZWxkcykge1xuXHRcdFx0XHRzZWxmLmFkZGVkKCd2aXNpdG9yX2hpc3RvcnknLCBpZCwgZmllbGRzKTtcblx0XHRcdH0sXG5cdFx0XHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0XHRcdFx0c2VsZi5jaGFuZ2VkKCd2aXNpdG9yX2hpc3RvcnknLCBpZCwgZmllbGRzKTtcblx0XHRcdH0sXG5cdFx0XHRyZW1vdmVkKGlkKSB7XG5cdFx0XHRcdHNlbGYucmVtb3ZlZCgndmlzaXRvcl9oaXN0b3J5JywgaWQpO1xuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdHNlbGYucmVhZHkoKTtcblxuXHRcdHNlbGYub25TdG9wKGZ1bmN0aW9uKCkge1xuXHRcdFx0aGFuZGxlLnN0b3AoKTtcblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHRzZWxmLnJlYWR5KCk7XG5cdH1cbn0pO1xuIiwiaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5NZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6dmlzaXRvckluZm8nLCBmdW5jdGlvbih7IHJpZDogcm9vbUlkIH0pIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6dmlzaXRvckluZm8nIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1sLXJvb20nKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6dmlzaXRvckluZm8nIH0pKTtcblx0fVxuXG5cdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tSWQpO1xuXG5cdGlmIChyb29tICYmIHJvb20udiAmJiByb29tLnYuX2lkKSB7XG5cdFx0cmV0dXJuIExpdmVjaGF0VmlzaXRvcnMuZmluZEJ5SWQocm9vbS52Ll9pZCk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHRoaXMucmVhZHkoKTtcblx0fVxufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6dmlzaXRvclBhZ2VWaXNpdGVkJywgZnVuY3Rpb24oeyByaWQ6IHJvb21JZCB9KSB7XG5cblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6dmlzaXRvclBhZ2VWaXNpdGVkJyB9KSk7XG5cdH1cblxuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OnZpc2l0b3JQYWdlVmlzaXRlZCcgfSkpO1xuXHR9XG5cblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tSWQpO1xuXG5cdGlmIChyb29tKSB7XG5cdFx0Y29uc3QgaGFuZGxlID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZEJ5Um9vbUlkQW5kVHlwZShyb29tLl9pZCwgJ2xpdmVjaGF0X25hdmlnYXRpb25faGlzdG9yeScpLm9ic2VydmVDaGFuZ2VzKHtcblx0XHRcdGFkZGVkKGlkLCBmaWVsZHMpIHtcblx0XHRcdFx0c2VsZi5hZGRlZCgndmlzaXRvcl9uYXZpZ2F0aW9uX2hpc3RvcnknLCBpZCwgZmllbGRzKTtcblx0XHRcdH0sXG5cdFx0XHRjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcblx0XHRcdFx0c2VsZi5jaGFuZ2VkKCd2aXNpdG9yX25hdmlnYXRpb25faGlzdG9yeScsIGlkLCBmaWVsZHMpO1xuXHRcdFx0fSxcblx0XHRcdHJlbW92ZWQoaWQpIHtcblx0XHRcdFx0c2VsZi5yZW1vdmVkKCd2aXNpdG9yX25hdmlnYXRpb25faGlzdG9yeScsIGlkKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHRzZWxmLnJlYWR5KCk7XG5cblx0XHRzZWxmLm9uU3RvcChmdW5jdGlvbigpIHtcblx0XHRcdGhhbmRsZS5zdG9wKCk7XG5cdFx0fSk7XG5cdH0gZWxzZSB7XG5cdFx0c2VsZi5yZWFkeSgpO1xuXHR9XG59KTtcbiIsIk1ldGVvci5wdWJsaXNoKCdsaXZlY2hhdDppbnF1aXJ5JywgZnVuY3Rpb24oKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmlucXVpcnknIH0pKTtcblx0fVxuXG5cdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1sLXJvb20nKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBwdWJsaXNoOiAnbGl2ZWNoYXQ6aW5xdWlyeScgfSkpO1xuXHR9XG5cblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0YWdlbnRzOiB0aGlzLnVzZXJJZCxcblx0XHRzdGF0dXM6ICdvcGVuJyxcblx0fTtcblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRJbnF1aXJ5LmZpbmQocXVlcnkpO1xufSk7XG4iLCJNZXRlb3IucHVibGlzaCgnbGl2ZWNoYXQ6b2ZmaWNlSG91cicsIGZ1bmN0aW9uKCkge1xuXHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbC1yb29tJykpIHtcblx0XHRyZXR1cm4gdGhpcy5lcnJvcihuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgcHVibGlzaDogJ2xpdmVjaGF0OmFnZW50cycgfSkpO1xuXHR9XG5cblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0T2ZmaWNlSG91ci5maW5kKCk7XG59KTtcbiIsImltcG9ydCAnLi4vaW1wb3J0cy9zZXJ2ZXIvcmVzdC9kZXBhcnRtZW50cy5qcyc7XG5pbXBvcnQgJy4uL2ltcG9ydHMvc2VydmVyL3Jlc3QvZmFjZWJvb2suanMnO1xuaW1wb3J0ICcuLi9pbXBvcnRzL3NlcnZlci9yZXN0L3Ntcy5qcyc7XG5pbXBvcnQgJy4uL2ltcG9ydHMvc2VydmVyL3Jlc3QvdXNlcnMuanMnO1xuaW1wb3J0ICcuLi9pbXBvcnRzL3NlcnZlci9yZXN0L3VwbG9hZC5qcyc7XG4iLCJpbXBvcnQgJy4vdjEvY29uZmlnLmpzJztcbmltcG9ydCAnLi92MS92aXNpdG9yLmpzJztcbmltcG9ydCAnLi92MS90cmFuc2NyaXB0LmpzJztcbmltcG9ydCAnLi92MS9vZmZsaW5lTWVzc2FnZS5qcyc7XG5pbXBvcnQgJy4vdjEvcGFnZVZpc2l0ZWQuanMnO1xuaW1wb3J0ICcuL3YxL2FnZW50LmpzJztcbmltcG9ydCAnLi92MS9tZXNzYWdlLmpzJztcbmltcG9ydCAnLi92MS9jdXN0b21GaWVsZC5qcyc7XG5pbXBvcnQgJy4vdjEvcm9vbS5qcyc7XG5pbXBvcnQgJy4vdjEvdmlkZW9DYWxsLmpzJztcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vLi4vbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5leHBvcnQgZnVuY3Rpb24gb25saW5lKCkge1xuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9ubGluZUFnZW50cygpLmNvdW50KCkgPiAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZFRyaWdnZXJzKCkge1xuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRUcmlnZ2VyLmZpbmRFbmFibGVkKCkuZmV0Y2goKS5tYXAoKHRyaWdnZXIpID0+IF8ucGljayh0cmlnZ2VyLCAnX2lkJywgJ2FjdGlvbnMnLCAnY29uZGl0aW9ucycpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmREZXBhcnRtZW50cygpIHtcblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudC5maW5kRW5hYmxlZFdpdGhBZ2VudHMoKS5mZXRjaCgpLm1hcCgoZGVwYXJ0bWVudCkgPT4gXy5waWNrKGRlcGFydG1lbnQsICdfaWQnLCAnbmFtZScsICdzaG93T25SZWdpc3RyYXRpb24nKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kR3Vlc3QodG9rZW4pIHtcblx0cmV0dXJuIExpdmVjaGF0VmlzaXRvcnMuZ2V0VmlzaXRvckJ5VG9rZW4odG9rZW4sIHtcblx0XHRmaWVsZHM6IHtcblx0XHRcdG5hbWU6IDEsXG5cdFx0XHR1c2VybmFtZTogMSxcblx0XHRcdHRva2VuOiAxLFxuXHRcdH0sXG5cdH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZFJvb20odG9rZW4sIHJpZCkge1xuXHRjb25zdCBmaWVsZHMgPSB7XG5cdFx0ZGVwYXJ0bWVudElkOiAxLFxuXHRcdHNlcnZlZEJ5OiAxLFxuXHRcdG9wZW46IDEsXG5cdH07XG5cblx0aWYgKCFyaWQpIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZExpdmVjaGF0QnlWaXNpdG9yVG9rZW4odG9rZW4sIGZpZWxkcyk7XG5cdH1cblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZExpdmVjaGF0QnlJZEFuZFZpc2l0b3JUb2tlbihyaWQsIHRva2VuLCBmaWVsZHMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Um9vbShndWVzdCwgcmlkLCByb29tSW5mbykge1xuXHRjb25zdCB0b2tlbiA9IGd1ZXN0ICYmIGd1ZXN0LnRva2VuO1xuXG5cdGNvbnN0IG1lc3NhZ2UgPSB7XG5cdFx0X2lkOiBSYW5kb20uaWQoKSxcblx0XHRyaWQsXG5cdFx0bXNnOiAnJyxcblx0XHR0b2tlbixcblx0XHR0czogbmV3IERhdGUoKSxcblx0fTtcblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXRSb29tKGd1ZXN0LCBtZXNzYWdlLCByb29tSW5mbyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQWdlbnQoYWdlbnRJZCkge1xuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZ2V0QWdlbnRJbmZvKGFnZW50SWQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0dGluZ3MoKSB7XG5cdGNvbnN0IGluaXRTZXR0aW5ncyA9IFJvY2tldENoYXQuTGl2ZWNoYXQuZ2V0SW5pdFNldHRpbmdzKCk7XG5cblx0cmV0dXJuIHtcblx0XHRlbmFibGVkOiBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfZW5hYmxlZCxcblx0XHRzZXR0aW5nczoge1xuXHRcdFx0cmVnaXN0cmF0aW9uRm9ybTogaW5pdFNldHRpbmdzLkxpdmVjaGF0X3JlZ2lzdHJhdGlvbl9mb3JtLFxuXHRcdFx0YWxsb3dTd2l0Y2hpbmdEZXBhcnRtZW50czogaW5pdFNldHRpbmdzLkxpdmVjaGF0X2FsbG93X3N3aXRjaGluZ19kZXBhcnRtZW50cyxcblx0XHRcdG5hbWVGaWVsZFJlZ2lzdHJhdGlvbkZvcm06IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9uYW1lX2ZpZWxkX3JlZ2lzdHJhdGlvbl9mb3JtLFxuXHRcdFx0ZW1haWxGaWVsZFJlZ2lzdHJhdGlvbkZvcm06IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9lbWFpbF9maWVsZF9yZWdpc3RyYXRpb25fZm9ybSxcblx0XHRcdGRpc3BsYXlPZmZsaW5lRm9ybTogaW5pdFNldHRpbmdzLkxpdmVjaGF0X2Rpc3BsYXlfb2ZmbGluZV9mb3JtLFxuXHRcdFx0dmlkZW9DYWxsOiBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfdmlkZW9jYWxsX2VuYWJsZWQgPT09IHRydWUgJiYgaW5pdFNldHRpbmdzLkppdHNpX0VuYWJsZWQgPT09IHRydWUsXG5cdFx0XHRmaWxlVXBsb2FkOiBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfZmlsZXVwbG9hZF9lbmFibGVkICYmIGluaXRTZXR0aW5ncy5GaWxlVXBsb2FkX0VuYWJsZWQsXG5cdFx0XHRsYW5ndWFnZTogaW5pdFNldHRpbmdzLkxhbmd1YWdlLFxuXHRcdFx0dHJhbnNjcmlwdDogaW5pdFNldHRpbmdzLkxpdmVjaGF0X2VuYWJsZV90cmFuc2NyaXB0LFxuXHRcdFx0aGlzdG9yeU1vbml0b3JUeXBlOiBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfaGlzdG9yeV9tb25pdG9yX3R5cGUsXG5cdFx0fSxcblx0XHR0aGVtZToge1xuXHRcdFx0dGl0bGU6IGluaXRTZXR0aW5ncy5MaXZlY2hhdF90aXRsZSxcblx0XHRcdGNvbG9yOiBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfdGl0bGVfY29sb3IsXG5cdFx0XHRvZmZsaW5lVGl0bGU6IGluaXRTZXR0aW5ncy5MaXZlY2hhdF9vZmZsaW5lX3RpdGxlLFxuXHRcdFx0b2ZmbGluZUNvbG9yOiBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfb2ZmbGluZV90aXRsZV9jb2xvcixcblx0XHRcdGFjdGlvbkxpbmtzOiBbXG5cdFx0XHRcdHsgaWNvbjogJ2ljb24tdmlkZW9jYW0nLCBpMThuTGFiZWw6ICdBY2NlcHQnLCBtZXRob2RfaWQ6ICdjcmVhdGVMaXZlY2hhdENhbGwnLCBwYXJhbXM6ICcnIH0sXG5cdFx0XHRcdHsgaWNvbjogJ2ljb24tY2FuY2VsJywgaTE4bkxhYmVsOiAnRGVjbGluZScsIG1ldGhvZF9pZDogJ2RlbnlMaXZlY2hhdENhbGwnLCBwYXJhbXM6ICcnIH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0bWVzc2FnZXM6IHtcblx0XHRcdG9mZmxpbmVNZXNzYWdlOiBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfb2ZmbGluZV9tZXNzYWdlLFxuXHRcdFx0b2ZmbGluZVN1Y2Nlc3NNZXNzYWdlOiBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfb2ZmbGluZV9zdWNjZXNzX21lc3NhZ2UsXG5cdFx0XHRvZmZsaW5lVW5hdmFpbGFibGVNZXNzYWdlOiBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfb2ZmbGluZV9mb3JtX3VuYXZhaWxhYmxlLFxuXHRcdFx0Y29udmVyc2F0aW9uRmluaXNoZWRNZXNzYWdlOiBpbml0U2V0dGluZ3MuTGl2ZWNoYXRfY29udmVyc2F0aW9uX2ZpbmlzaGVkX21lc3NhZ2UsXG5cdFx0XHR0cmFuc2NyaXB0TWVzc2FnZTogaW5pdFNldHRpbmdzLkxpdmVjaGF0X3RyYW5zY3JpcHRfbWVzc2FnZSxcblx0XHR9LFxuXHRcdHN1cnZleToge1xuXHRcdFx0aXRlbXM6IFsnc2F0aXNmYWN0aW9uJywgJ2FnZW50S25vd2xlZGdlJywgJ2FnZW50UmVzcG9zaXZlbmVzcycsICdhZ2VudEZyaWVuZGxpbmVzcyddLFxuXHRcdFx0dmFsdWVzOiBbJzEnLCAnMicsICczJywgJzQnLCAnNSddLFxuXHRcdH0sXG5cdH07XG59XG5cblxuIiwiaW1wb3J0IHsgZmluZFJvb20sIGZpbmRHdWVzdCwgZmluZEFnZW50IH0gZnJvbSAnLi4vbGliL2xpdmVjaGF0JztcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L2FnZW50LmluZm8vOnJpZC86dG9rZW4nLCB7XG5cdGdldCgpIHtcblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy51cmxQYXJhbXMsIHtcblx0XHRcdFx0cmlkOiBTdHJpbmcsXG5cdFx0XHRcdHRva2VuOiBTdHJpbmcsXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgdmlzaXRvciA9IGZpbmRHdWVzdCh0aGlzLnVybFBhcmFtcy50b2tlbik7XG5cdFx0XHRpZiAoIXZpc2l0b3IpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC10b2tlbicpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCByb29tID0gZmluZFJvb20odGhpcy51cmxQYXJhbXMudG9rZW4sIHRoaXMudXJsUGFyYW1zLnJpZCk7XG5cdFx0XHRpZiAoIXJvb20pIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJyk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGFnZW50ID0gcm9vbSAmJiByb29tLnNlcnZlZEJ5ICYmIGZpbmRBZ2VudChyb29tLnNlcnZlZEJ5Ll9pZCk7XG5cdFx0XHRpZiAoIWFnZW50KSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtYWdlbnQnKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBhZ2VudCB9KTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlKTtcblx0XHR9XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L2FnZW50Lm5leHQvOnRva2VuJywge1xuXHRnZXQoKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNoZWNrKHRoaXMudXJsUGFyYW1zLCB7XG5cdFx0XHRcdHRva2VuOiBTdHJpbmcsXG5cdFx0XHR9KTtcblxuXHRcdFx0Y2hlY2sodGhpcy5xdWVyeVBhcmFtcywge1xuXHRcdFx0XHRkZXBhcnRtZW50OiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IHZpc2l0b3IgPSBmaW5kR3Vlc3QodGhpcy51cmxQYXJhbXMudG9rZW4pO1xuXHRcdFx0aWYgKCF2aXNpdG9yKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtdG9rZW4nKTtcblx0XHRcdH1cblxuXHRcdFx0bGV0IHsgZGVwYXJ0bWVudCB9ID0gdGhpcy5xdWVyeVBhcmFtcztcblx0XHRcdGlmICghZGVwYXJ0bWVudCkge1xuXHRcdFx0XHRjb25zdCByZXF1aXJlRGVwYXJtZW50ID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXRSZXF1aXJlZERlcGFydG1lbnQoKTtcblx0XHRcdFx0aWYgKHJlcXVpcmVEZXBhcm1lbnQpIHtcblx0XHRcdFx0XHRkZXBhcnRtZW50ID0gcmVxdWlyZURlcGFybWVudC5faWQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgYWdlbnREYXRhID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5nZXROZXh0QWdlbnQoZGVwYXJ0bWVudCk7XG5cdFx0XHRpZiAoIWFnZW50RGF0YSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdhZ2VudC1ub3QtZm91bmQnKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgYWdlbnQgPSBmaW5kQWdlbnQoYWdlbnREYXRhLmFnZW50SWQpO1xuXHRcdFx0aWYgKCFhZ2VudCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLWFnZW50Jyk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgYWdlbnQgfSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZSk7XG5cdFx0fVxuXHR9LFxufSk7XG4iLCJpbXBvcnQgeyBmaW5kUm9vbSwgZmluZEd1ZXN0LCBzZXR0aW5ncywgb25saW5lIH0gZnJvbSAnLi4vbGliL2xpdmVjaGF0JztcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L2NvbmZpZycsIHtcblx0Z2V0KCkge1xuXHRcdHRyeSB7XG5cdFx0XHRjaGVjayh0aGlzLnF1ZXJ5UGFyYW1zLCB7XG5cdFx0XHRcdHRva2VuOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IGNvbmZpZyA9IHNldHRpbmdzKCk7XG5cdFx0XHRpZiAoIWNvbmZpZy5lbmFibGVkKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgY29uZmlnOiB7IGVuYWJsZWQ6IGZhbHNlIH0gfSk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IHsgc3RhdHVzIH0gPSBvbmxpbmUoKTtcblxuXHRcdFx0bGV0IGd1ZXN0O1xuXHRcdFx0bGV0IHJvb207XG5cdFx0XHRsZXQgYWdlbnQ7XG5cblx0XHRcdGlmICh0aGlzLnF1ZXJ5UGFyYW1zLnRva2VuKSB7XG5cdFx0XHRcdGd1ZXN0ID0gZmluZEd1ZXN0KHRoaXMucXVlcnlQYXJhbXMudG9rZW4pO1xuXHRcdFx0XHRyb29tID0gZmluZFJvb20odGhpcy5xdWVyeVBhcmFtcy50b2tlbik7XG5cdFx0XHRcdGFnZW50ID0gcm9vbSAmJiByb29tLnNlcnZlZEJ5ICYmIFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmdldEFnZW50SW5mbyhyb29tLnNlcnZlZEJ5Ll9pZCk7XG5cdFx0XHR9XG5cblx0XHRcdE9iamVjdC5hc3NpZ24oY29uZmlnLCB7IG9ubGluZTogc3RhdHVzLCBndWVzdCwgcm9vbSwgYWdlbnQgfSk7XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgY29uZmlnIH0pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUpO1xuXHRcdH1cblx0fSxcbn0pO1xuIiwiaW1wb3J0IHsgZmluZEd1ZXN0IH0gZnJvbSAnLi4vbGliL2xpdmVjaGF0JztcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L2N1c3RvbS5maWVsZCcsIHtcblx0cG9zdCgpIHtcblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCB7XG5cdFx0XHRcdHRva2VuOiBTdHJpbmcsXG5cdFx0XHRcdGtleTogU3RyaW5nLFxuXHRcdFx0XHR2YWx1ZTogU3RyaW5nLFxuXHRcdFx0XHRvdmVyd3JpdGU6IEJvb2xlYW4sXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgeyB0b2tlbiwga2V5LCB2YWx1ZSwgb3ZlcndyaXRlIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cblx0XHRcdGNvbnN0IGd1ZXN0ID0gZmluZEd1ZXN0KHRva2VuKTtcblx0XHRcdGlmICghZ3Vlc3QpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC10b2tlbicpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIVJvY2tldENoYXQuTGl2ZWNoYXQuc2V0Q3VzdG9tRmllbGRzKHsgdG9rZW4sIGtleSwgdmFsdWUsIG92ZXJ3cml0ZSB9KSkge1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IGZpZWxkOiB7IGtleSwgdmFsdWUsIG92ZXJ3cml0ZSB9IH0pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUpO1xuXHRcdH1cblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnbGl2ZWNoYXQvY3VzdG9tLmZpZWxkcycsIHtcblx0cG9zdCgpIHtcblx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIHtcblx0XHRcdHRva2VuOiBTdHJpbmcsXG5cdFx0XHRjdXN0b21GaWVsZHM6IFtcblx0XHRcdFx0TWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdFx0XHRrZXk6IFN0cmluZyxcblx0XHRcdFx0XHR2YWx1ZTogU3RyaW5nLFxuXHRcdFx0XHRcdG92ZXJ3cml0ZTogQm9vbGVhbixcblx0XHRcdFx0fSksXG5cdFx0XHRdLFxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgeyB0b2tlbiB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXHRcdGNvbnN0IGd1ZXN0ID0gZmluZEd1ZXN0KHRva2VuKTtcblx0XHRpZiAoIWd1ZXN0KSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXRva2VuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmllbGRzID0gdGhpcy5ib2R5UGFyYW1zLmN1c3RvbUZpZWxkcy5tYXAoKGN1c3RvbUZpZWxkKSA9PiB7XG5cdFx0XHRjb25zdCBkYXRhID0gT2JqZWN0LmFzc2lnbih7IHRva2VuIH0sIGN1c3RvbUZpZWxkKTtcblx0XHRcdGlmICghUm9ja2V0Q2hhdC5MaXZlY2hhdC5zZXRDdXN0b21GaWVsZHMoZGF0YSkpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHsgS2V5OiBjdXN0b21GaWVsZC5rZXksIHZhbHVlOiBjdXN0b21GaWVsZC52YWx1ZSwgb3ZlcndyaXRlOiBjdXN0b21GaWVsZC5vdmVyd3JpdGUgfTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgZmllbGRzIH0pO1xuXHR9LFxufSk7XG5cbiIsImltcG9ydCBMaXZlY2hhdFZpc2l0b3JzIGZyb20gJy4uLy4uLy4uL3NlcnZlci9tb2RlbHMvTGl2ZWNoYXRWaXNpdG9ycyc7XG5pbXBvcnQgeyBmaW5kR3Vlc3QsIGZpbmRSb29tIH0gZnJvbSAnLi4vbGliL2xpdmVjaGF0JztcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L21lc3NhZ2UnLCB7XG5cdHBvc3QoKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0XHRfaWQ6IE1hdGNoLk1heWJlKFN0cmluZyksXG5cdFx0XHRcdHRva2VuOiBTdHJpbmcsXG5cdFx0XHRcdHJpZDogU3RyaW5nLFxuXHRcdFx0XHRtc2c6IFN0cmluZyxcblx0XHRcdFx0YWdlbnQ6IE1hdGNoLk1heWJlKHtcblx0XHRcdFx0XHRhZ2VudElkOiBTdHJpbmcsXG5cdFx0XHRcdFx0dXNlcm5hbWU6IFN0cmluZyxcblx0XHRcdFx0fSksXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgeyB0b2tlbiwgcmlkLCBhZ2VudCwgbXNnIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cblx0XHRcdGNvbnN0IGd1ZXN0ID0gZmluZEd1ZXN0KHRva2VuKTtcblx0XHRcdGlmICghZ3Vlc3QpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC10b2tlbicpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCByb29tID0gZmluZFJvb20odG9rZW4sIHJpZCk7XG5cdFx0XHRpZiAoIXJvb20pIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJyk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IF9pZCA9IHRoaXMuYm9keVBhcmFtcy5faWQgfHwgUmFuZG9tLmlkKCk7XG5cblx0XHRcdGNvbnN0IHNlbmRNZXNzYWdlID0ge1xuXHRcdFx0XHRndWVzdCxcblx0XHRcdFx0bWVzc2FnZToge1xuXHRcdFx0XHRcdF9pZCxcblx0XHRcdFx0XHRyaWQsXG5cdFx0XHRcdFx0bXNnLFxuXHRcdFx0XHRcdHRva2VuLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRhZ2VudCxcblx0XHRcdH07XG5cblx0XHRcdGNvbnN0IHJlc3VsdCA9IFJvY2tldENoYXQuTGl2ZWNoYXQuc2VuZE1lc3NhZ2Uoc2VuZE1lc3NhZ2UpO1xuXHRcdFx0aWYgKHJlc3VsdCkge1xuXHRcdFx0XHRjb25zdCBtZXNzYWdlID0geyBfaWQ6IHJlc3VsdC5faWQsIG1zZzogcmVzdWx0Lm1zZywgdTogcmVzdWx0LnUsIHRzOiByZXN1bHQudHMgfTtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBtZXNzYWdlIH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUpO1xuXHRcdH1cblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnbGl2ZWNoYXQvbWVzc2FnZS86X2lkJywge1xuXHRwdXQoKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNoZWNrKHRoaXMudXJsUGFyYW1zLCB7XG5cdFx0XHRcdF9pZDogU3RyaW5nLFxuXHRcdFx0fSk7XG5cblx0XHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0XHR0b2tlbjogU3RyaW5nLFxuXHRcdFx0XHRyaWQ6IFN0cmluZyxcblx0XHRcdFx0bXNnOiBTdHJpbmcsXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgeyB0b2tlbiwgcmlkIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0XHRjb25zdCB7IF9pZCB9ID0gdGhpcy51cmxQYXJhbXM7XG5cblx0XHRcdGNvbnN0IGd1ZXN0ID0gZmluZEd1ZXN0KHRva2VuKTtcblx0XHRcdGlmICghZ3Vlc3QpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC10b2tlbicpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCByb29tID0gZmluZFJvb20odG9rZW4sIHJpZCk7XG5cdFx0XHRpZiAoIXJvb20pIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJyk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IG1zZyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKF9pZCk7XG5cdFx0XHRpZiAoIW1zZykge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLW1lc3NhZ2UnKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgbWVzc2FnZSA9IHsgX2lkOiBtc2cuX2lkLCBtc2c6IHRoaXMuYm9keVBhcmFtcy5tc2cgfTtcblxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC51cGRhdGVNZXNzYWdlKHsgZ3Vlc3QsIG1lc3NhZ2UgfSk7XG5cdFx0XHRpZiAocmVzdWx0KSB7XG5cdFx0XHRcdGNvbnN0IGRhdGEgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZChfaWQpO1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRcdFx0bWVzc2FnZTogeyBfaWQ6IGRhdGEuX2lkLCBtc2c6IGRhdGEubXNnLCB1OiBkYXRhLnUsIHRzOiBkYXRhLnRzIH0sXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUuZXJyb3IpO1xuXHRcdH1cblx0fSxcblx0ZGVsZXRlKCkge1xuXHRcdHRyeSB7XG5cdFx0XHRjaGVjayh0aGlzLnVybFBhcmFtcywge1xuXHRcdFx0XHRfaWQ6IFN0cmluZyxcblx0XHRcdH0pO1xuXG5cdFx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIHtcblx0XHRcdFx0dG9rZW46IFN0cmluZyxcblx0XHRcdFx0cmlkOiBTdHJpbmcsXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgeyB0b2tlbiwgcmlkIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0XHRjb25zdCB7IF9pZCB9ID0gdGhpcy51cmxQYXJhbXM7XG5cblx0XHRcdGNvbnN0IGd1ZXN0ID0gZmluZEd1ZXN0KHRva2VuKTtcblx0XHRcdGlmICghZ3Vlc3QpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC10b2tlbicpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCByb29tID0gZmluZFJvb20odG9rZW4sIHJpZCk7XG5cdFx0XHRpZiAoIXJvb20pIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJyk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IG1lc3NhZ2UgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZChfaWQpO1xuXHRcdFx0aWYgKCFtZXNzYWdlKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtbWVzc2FnZScpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCByZXN1bHQgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LmRlbGV0ZU1lc3NhZ2UoeyBndWVzdCwgbWVzc2FnZSB9KTtcblx0XHRcdGlmIChyZXN1bHQpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0XHRcdG1lc3NhZ2U6IHtcblx0XHRcdFx0XHRcdF9pZCxcblx0XHRcdFx0XHRcdHRzOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5lcnJvcik7XG5cdFx0fVxuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC9tZXNzYWdlcy5oaXN0b3J5LzpyaWQnLCB7XG5cdGdldCgpIHtcblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy51cmxQYXJhbXMsIHtcblx0XHRcdFx0cmlkOiBTdHJpbmcsXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgeyByaWQgfSA9IHRoaXMudXJsUGFyYW1zO1xuXHRcdFx0Y29uc3QgeyB0b2tlbiB9ID0gdGhpcy5xdWVyeVBhcmFtcztcblxuXHRcdFx0aWYgKCF0b2tlbikge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci10b2tlbi1wYXJhbS1ub3QtcHJvdmlkZWQnLCAnVGhlIHJlcXVpcmVkIFwidG9rZW5cIiBxdWVyeSBwYXJhbSBpcyBtaXNzaW5nLicpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBndWVzdCA9IGZpbmRHdWVzdCh0b2tlbik7XG5cdFx0XHRpZiAoIWd1ZXN0KSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtdG9rZW4nKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3Qgcm9vbSA9IGZpbmRSb29tKHRva2VuLCByaWQpO1xuXHRcdFx0aWYgKCFyb29tKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtcm9vbScpO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgbHMgPSB1bmRlZmluZWQ7XG5cdFx0XHRpZiAodGhpcy5xdWVyeVBhcmFtcy5scykge1xuXHRcdFx0XHRscyA9IG5ldyBEYXRlKHRoaXMucXVlcnlQYXJhbXMubHMpO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgZW5kID0gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKHRoaXMucXVlcnlQYXJhbXMuZW5kKSB7XG5cdFx0XHRcdGVuZCA9IG5ldyBEYXRlKHRoaXMucXVlcnlQYXJhbXMuZW5kKTtcblx0XHRcdH1cblxuXHRcdFx0bGV0IGxpbWl0ID0gMjA7XG5cdFx0XHRpZiAodGhpcy5xdWVyeVBhcmFtcy5saW1pdCkge1xuXHRcdFx0XHRsaW1pdCA9IHBhcnNlSW50KHRoaXMucXVlcnlQYXJhbXMubGltaXQpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBtZXNzYWdlcyA9IFJvY2tldENoYXQubG9hZE1lc3NhZ2VIaXN0b3J5KHsgdXNlcklkOiBndWVzdC5faWQsIHJpZCwgZW5kLCBsaW1pdCwgbHMgfSk7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcyhtZXNzYWdlcyk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5lcnJvcik7XG5cdFx0fVxuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC9tZXNzYWdlcycsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMudmlzaXRvcikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0JvZHkgcGFyYW0gXCJ2aXNpdG9yXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMudmlzaXRvci50b2tlbikge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ0JvZHkgcGFyYW0gXCJ2aXNpdG9yLnRva2VuXCIgaXMgcmVxdWlyZWQnKTtcblx0XHR9XG5cdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMubWVzc2FnZXMpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtIFwibWVzc2FnZXNcIiBpcyByZXF1aXJlZCcpO1xuXHRcdH1cblx0XHRpZiAoISh0aGlzLmJvZHlQYXJhbXMubWVzc2FnZXMgaW5zdGFuY2VvZiBBcnJheSkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtIFwibWVzc2FnZXNcIiBpcyBub3QgYW4gYXJyYXknKTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuYm9keVBhcmFtcy5tZXNzYWdlcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdCb2R5IHBhcmFtIFwibWVzc2FnZXNcIiBpcyBlbXB0eScpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHZpc2l0b3JUb2tlbiA9IHRoaXMuYm9keVBhcmFtcy52aXNpdG9yLnRva2VuO1xuXG5cdFx0bGV0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHZpc2l0b3JUb2tlbik7XG5cdFx0bGV0IHJpZDtcblx0XHRpZiAodmlzaXRvcikge1xuXHRcdFx0Y29uc3Qgcm9vbXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5VmlzaXRvclRva2VuKHZpc2l0b3JUb2tlbikuZmV0Y2goKTtcblx0XHRcdGlmIChyb29tcyAmJiByb29tcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdHJpZCA9IHJvb21zWzBdLl9pZDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJpZCA9IFJhbmRvbS5pZCgpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyaWQgPSBSYW5kb20uaWQoKTtcblx0XHRcdGNvbnN0IHZpc2l0b3JJZCA9IFJvY2tldENoYXQuTGl2ZWNoYXQucmVnaXN0ZXJHdWVzdCh0aGlzLmJvZHlQYXJhbXMudmlzaXRvcik7XG5cdFx0XHR2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5maW5kT25lQnlJZCh2aXNpdG9ySWQpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHNlbnRNZXNzYWdlcyA9IHRoaXMuYm9keVBhcmFtcy5tZXNzYWdlcy5tYXAoKG1lc3NhZ2UpID0+IHtcblx0XHRcdGNvbnN0IHNlbmRNZXNzYWdlID0ge1xuXHRcdFx0XHRndWVzdDogdmlzaXRvcixcblx0XHRcdFx0bWVzc2FnZToge1xuXHRcdFx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRcdFx0cmlkLFxuXHRcdFx0XHRcdHRva2VuOiB2aXNpdG9yVG9rZW4sXG5cdFx0XHRcdFx0bXNnOiBtZXNzYWdlLm1zZyxcblx0XHRcdFx0fSxcblx0XHRcdH07XG5cdFx0XHRjb25zdCBzZW50TWVzc2FnZSA9IFJvY2tldENoYXQuTGl2ZWNoYXQuc2VuZE1lc3NhZ2Uoc2VuZE1lc3NhZ2UpO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dXNlcm5hbWU6IHNlbnRNZXNzYWdlLnUudXNlcm5hbWUsXG5cdFx0XHRcdG1zZzogc2VudE1lc3NhZ2UubXNnLFxuXHRcdFx0XHR0czogc2VudE1lc3NhZ2UudHMsXG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0bWVzc2FnZXM6IHNlbnRNZXNzYWdlcyxcblx0XHR9KTtcblx0fSxcbn0pO1xuIiwiUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L29mZmxpbmUubWVzc2FnZScsIHtcblx0cG9zdCgpIHtcblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCB7XG5cdFx0XHRcdG5hbWU6IFN0cmluZyxcblx0XHRcdFx0ZW1haWw6IFN0cmluZyxcblx0XHRcdFx0bWVzc2FnZTogU3RyaW5nLFxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IHsgbmFtZSwgZW1haWwsIG1lc3NhZ2UgfSA9IHRoaXMuYm9keVBhcmFtcztcblx0XHRcdGlmICghUm9ja2V0Q2hhdC5MaXZlY2hhdC5zZW5kT2ZmbGluZU1lc3NhZ2UoeyBuYW1lLCBlbWFpbCwgbWVzc2FnZSB9KSkge1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSh7IG1lc3NhZ2U6IFRBUGkxOG4uX18oJ0Vycm9yX3NlbmRpbmdfbGl2ZWNoYXRfb2ZmbGluZV9tZXNzYWdlJykgfSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgbWVzc2FnZTogVEFQaTE4bi5fXygnTGl2ZWNoYXRfb2ZmbGluZV9tZXNzYWdlX3NlbnQnKSB9KTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlKTtcblx0XHR9XG5cdH0sXG59KTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IHsgZmluZEd1ZXN0LCBmaW5kUm9vbSB9IGZyb20gJy4uL2xpYi9saXZlY2hhdCc7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC9wYWdlLnZpc2l0ZWQnLCB7XG5cdHBvc3QoKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0XHR0b2tlbjogU3RyaW5nLFxuXHRcdFx0XHRyaWQ6IFN0cmluZyxcblx0XHRcdFx0cGFnZUluZm86IE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHRcdFx0Y2hhbmdlOiBTdHJpbmcsXG5cdFx0XHRcdFx0dGl0bGU6IFN0cmluZyxcblx0XHRcdFx0XHRsb2NhdGlvbjogTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdFx0XHRcdGhyZWY6IFN0cmluZyxcblx0XHRcdFx0XHR9KSxcblx0XHRcdFx0fSksXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgeyB0b2tlbiwgcmlkLCBwYWdlSW5mbyB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXG5cdFx0XHRjb25zdCBndWVzdCA9IGZpbmRHdWVzdCh0b2tlbik7XG5cdFx0XHRpZiAoIWd1ZXN0KSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtdG9rZW4nKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3Qgcm9vbSA9IGZpbmRSb29tKHRva2VuLCByaWQpO1xuXHRcdFx0aWYgKCFyb29tKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtcm9vbScpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBvYmogPSBSb2NrZXRDaGF0LkxpdmVjaGF0LnNhdmVQYWdlSGlzdG9yeSh0b2tlbiwgcmlkLCBwYWdlSW5mbyk7XG5cdFx0XHRpZiAob2JqKSB7XG5cdFx0XHRcdGNvbnN0IHBhZ2UgPSBfLnBpY2sob2JqLCAnbXNnJywgJ25hdmlnYXRpb24nKTtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBwYWdlIH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUpO1xuXHRcdH1cblx0fSxcbn0pO1xuIiwiaW1wb3J0IHsgZmluZEd1ZXN0LCBmaW5kUm9vbSwgZ2V0Um9vbSwgc2V0dGluZ3MgfSBmcm9tICcuLi9saWIvbGl2ZWNoYXQnO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnbGl2ZWNoYXQvcm9vbScsIHtcblx0Z2V0KCkge1xuXHRcdHRyeSB7XG5cdFx0XHRjaGVjayh0aGlzLnF1ZXJ5UGFyYW1zLCB7XG5cdFx0XHRcdHRva2VuOiBTdHJpbmcsXG5cdFx0XHRcdHJpZDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zdCB7IHRva2VuIH0gPSB0aGlzLnF1ZXJ5UGFyYW1zO1xuXHRcdFx0Y29uc3QgZ3Vlc3QgPSBmaW5kR3Vlc3QodG9rZW4pO1xuXHRcdFx0aWYgKCFndWVzdCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXRva2VuJyk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IHJpZCA9IHRoaXMucXVlcnlQYXJhbXMucmlkIHx8IFJhbmRvbS5pZCgpO1xuXHRcdFx0Y29uc3Qgcm9vbSA9IGdldFJvb20oZ3Vlc3QsIHJpZCk7XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHJvb20pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUpO1xuXHRcdH1cblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnbGl2ZWNoYXQvcm9vbS5jbG9zZScsIHtcblx0cG9zdCgpIHtcblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCB7XG5cdFx0XHRcdHJpZDogU3RyaW5nLFxuXHRcdFx0XHR0b2tlbjogU3RyaW5nLFxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IHsgcmlkIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cdFx0XHRjb25zdCB7IHRva2VuIH0gPSB0aGlzLmJvZHlQYXJhbXM7XG5cblx0XHRcdGNvbnN0IHZpc2l0b3IgPSBmaW5kR3Vlc3QodG9rZW4pO1xuXHRcdFx0aWYgKCF2aXNpdG9yKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtdG9rZW4nKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3Qgcm9vbSA9IGZpbmRSb29tKHRva2VuLCByaWQpO1xuXHRcdFx0aWYgKCFyb29tKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtcm9vbScpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIXJvb20ub3Blbikge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdyb29tLWNsb3NlZCcpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBsYW5ndWFnZSA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdsYW5ndWFnZScpIHx8ICdlbic7XG5cdFx0XHRjb25zdCBjb21tZW50ID0gVEFQaTE4bi5fXygnQ2xvc2VkX2J5X3Zpc2l0b3InLCB7IGxuZzogbGFuZ3VhZ2UgfSk7XG5cblx0XHRcdGlmICghUm9ja2V0Q2hhdC5MaXZlY2hhdC5jbG9zZVJvb20oeyB2aXNpdG9yLCByb29tLCBjb21tZW50IH0pKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgcmlkLCBjb21tZW50IH0pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUpO1xuXHRcdH1cblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnbGl2ZWNoYXQvcm9vbS50cmFuc2ZlcicsIHtcblx0cG9zdCgpIHtcblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCB7XG5cdFx0XHRcdHJpZDogU3RyaW5nLFxuXHRcdFx0XHR0b2tlbjogU3RyaW5nLFxuXHRcdFx0XHRkZXBhcnRtZW50OiBTdHJpbmcsXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgeyByaWQgfSA9IHRoaXMuYm9keVBhcmFtcztcblx0XHRcdGNvbnN0IHsgdG9rZW4sIGRlcGFydG1lbnQgfSA9IHRoaXMuYm9keVBhcmFtcztcblxuXHRcdFx0Y29uc3QgZ3Vlc3QgPSBmaW5kR3Vlc3QodG9rZW4pO1xuXHRcdFx0aWYgKCFndWVzdCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXRva2VuJyk7XG5cdFx0XHR9XG5cblx0XHRcdGxldCByb29tID0gZmluZFJvb20odG9rZW4sIHJpZCk7XG5cdFx0XHRpZiAoIXJvb20pIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJyk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHVwZGF0ZSB2aXNpdGVkIHBhZ2UgaGlzdG9yeSB0byBub3QgZXhwaXJlXG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5rZWVwSGlzdG9yeUZvclRva2VuKHRva2VuKTtcblxuXHRcdFx0aWYgKCFSb2NrZXRDaGF0LkxpdmVjaGF0LnRyYW5zZmVyKHJvb20sIGd1ZXN0LCB7IHJvb21JZDogcmlkLCBkZXBhcnRtZW50SWQ6IGRlcGFydG1lbnQgfSkpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoKTtcblx0XHRcdH1cblxuXHRcdFx0cm9vbSA9IGZpbmRSb29tKHRva2VuLCByaWQpO1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyByb29tIH0pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUpO1xuXHRcdH1cblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnbGl2ZWNoYXQvcm9vbS5zdXJ2ZXknLCB7XG5cdHBvc3QoKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0XHRyaWQ6IFN0cmluZyxcblx0XHRcdFx0dG9rZW46IFN0cmluZyxcblx0XHRcdFx0ZGF0YTogW01hdGNoLk9iamVjdEluY2x1ZGluZyh7XG5cdFx0XHRcdFx0bmFtZTogU3RyaW5nLFxuXHRcdFx0XHRcdHZhbHVlOiBTdHJpbmcsXG5cdFx0XHRcdH0pXSxcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zdCB7IHJpZCB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXHRcdFx0Y29uc3QgeyB0b2tlbiwgZGF0YSB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXG5cdFx0XHRjb25zdCB2aXNpdG9yID0gZmluZEd1ZXN0KHRva2VuKTtcblx0XHRcdGlmICghdmlzaXRvcikge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXRva2VuJyk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IHJvb20gPSBmaW5kUm9vbSh0b2tlbiwgcmlkKTtcblx0XHRcdGlmICghcm9vbSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXJvb20nKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgY29uZmlnID0gc2V0dGluZ3MoKTtcblx0XHRcdGlmICghY29uZmlnLnN1cnZleSB8fCAhY29uZmlnLnN1cnZleS5pdGVtcyB8fCAhY29uZmlnLnN1cnZleS52YWx1ZXMpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1saXZlY2hhdC1jb25maWcnKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgdXBkYXRlRGF0YSA9IHt9O1xuXHRcdFx0Zm9yIChjb25zdCBpdGVtIG9mIGRhdGEpIHtcblx0XHRcdFx0aWYgKChjb25maWcuc3VydmV5Lml0ZW1zLmluY2x1ZGVzKGl0ZW0ubmFtZSkgJiYgY29uZmlnLnN1cnZleS52YWx1ZXMuaW5jbHVkZXMoaXRlbS52YWx1ZSkpIHx8IGl0ZW0ubmFtZSA9PT0gJ2FkZGl0aW9uYWxGZWVkYmFjaycpIHtcblx0XHRcdFx0XHR1cGRhdGVEYXRhW2l0ZW0ubmFtZV0gPSBpdGVtLnZhbHVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChPYmplY3Qua2V5cyh1cGRhdGVEYXRhKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1kYXRhJyk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMudXBkYXRlU3VydmV5RmVlZGJhY2tCeUlkKHJvb20uX2lkLCB1cGRhdGVEYXRhKSkge1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHJpZCwgZGF0YTogdXBkYXRlRGF0YSB9KTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlKTtcblx0XHR9XG5cdH0sXG59KTtcbiIsIlJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC90cmFuc2NyaXB0Jywge1xuXHRwb3N0KCkge1xuXHRcdHRyeSB7XG5cdFx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIHtcblx0XHRcdFx0dG9rZW46IFN0cmluZyxcblx0XHRcdFx0cmlkOiBTdHJpbmcsXG5cdFx0XHRcdGVtYWlsOiBTdHJpbmcsXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgeyB0b2tlbiwgcmlkLCBlbWFpbCB9ID0gdGhpcy5ib2R5UGFyYW1zO1xuXHRcdFx0aWYgKCFSb2NrZXRDaGF0LkxpdmVjaGF0LnNlbmRUcmFuc2NyaXB0KHsgdG9rZW4sIHJpZCwgZW1haWwgfSkpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoeyBtZXNzYWdlOiBUQVBpMThuLl9fKCdFcnJvcl9zZW5kaW5nX2xpdmVjaGF0X3RyYW5zY3JpcHQnKSB9KTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBtZXNzYWdlOiBUQVBpMThuLl9fKCdMaXZlY2hhdF90cmFuc2NyaXB0X3NlbnQnKSB9KTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlKTtcblx0XHR9XG5cdH0sXG59KTtcbiIsImltcG9ydCB7IGZpbmRHdWVzdCwgZ2V0Um9vbSwgc2V0dGluZ3MgfSBmcm9tICcuLi9saWIvbGl2ZWNoYXQnO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnbGl2ZWNoYXQvdmlkZW8uY2FsbC86dG9rZW4nLCB7XG5cdGdldCgpIHtcblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy51cmxQYXJhbXMsIHtcblx0XHRcdFx0dG9rZW46IFN0cmluZyxcblx0XHRcdH0pO1xuXG5cdFx0XHRjaGVjayh0aGlzLnF1ZXJ5UGFyYW1zLCB7XG5cdFx0XHRcdHJpZDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zdCB7IHRva2VuIH0gPSB0aGlzLnVybFBhcmFtcztcblxuXHRcdFx0Y29uc3QgZ3Vlc3QgPSBmaW5kR3Vlc3QodG9rZW4pO1xuXHRcdFx0aWYgKCFndWVzdCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXRva2VuJyk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IHJpZCA9IHRoaXMucXVlcnlQYXJhbXMucmlkIHx8IFJhbmRvbS5pZCgpO1xuXHRcdFx0Y29uc3QgeyByb29tIH0gPSBnZXRSb29tKGd1ZXN0LCByaWQsIHsgaml0c2lUaW1lb3V0OiBuZXcgRGF0ZShEYXRlLm5vdygpICsgMzYwMCAqIDEwMDApIH0pO1xuXHRcdFx0Y29uc3QgY29uZmlnID0gc2V0dGluZ3MoKTtcblx0XHRcdGlmICghY29uZmlnLnRoZW1lIHx8ICFjb25maWcudGhlbWUuYWN0aW9uTGlua3MpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1saXZlY2hhdC1jb25maWcnKTtcblx0XHRcdH1cblxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlcignbGl2ZWNoYXRfdmlkZW9fY2FsbCcsIHJvb20uX2lkLCAnJywgZ3Vlc3QsIHtcblx0XHRcdFx0YWN0aW9uTGlua3M6IGNvbmZpZy50aGVtZS5hY3Rpb25MaW5rcyxcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zdCB2aWRlb0NhbGwgPSB7XG5cdFx0XHRcdHJpZCxcblx0XHRcdFx0ZG9tYWluOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSml0c2lfRG9tYWluJyksXG5cdFx0XHRcdHByb3ZpZGVyOiAnaml0c2knLFxuXHRcdFx0XHRyb29tOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSml0c2lfVVJMX1Jvb21fUHJlZml4JykgKyBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgndW5pcXVlSUQnKSArIHJpZCxcblx0XHRcdFx0dGltZW91dDogbmV3IERhdGUoRGF0ZS5ub3coKSArIDM2MDAgKiAxMDAwKSxcblx0XHRcdH07XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgdmlkZW9DYWxsIH0pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKGUpO1xuXHRcdH1cblx0fSxcbn0pO1xuIiwiaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vLi4vLi4vc2VydmVyL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L3Zpc2l0b3InLCB7XG5cdHBvc3QoKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNoZWNrKHRoaXMuYm9keVBhcmFtcywge1xuXHRcdFx0XHR2aXNpdG9yOiBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuXHRcdFx0XHRcdHRva2VuOiBTdHJpbmcsXG5cdFx0XHRcdFx0bmFtZTogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0XHRlbWFpbDogTWF0Y2guTWF5YmUoU3RyaW5nKSxcblx0XHRcdFx0XHRkZXBhcnRtZW50OiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0XHRcdHBob25lOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0XHRcdHVzZXJuYW1lOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuXHRcdFx0XHRcdGN1c3RvbUZpZWxkczogTWF0Y2guTWF5YmUoW1xuXHRcdFx0XHRcdFx0TWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdFx0XHRcdFx0a2V5OiBTdHJpbmcsXG5cdFx0XHRcdFx0XHRcdHZhbHVlOiBTdHJpbmcsXG5cdFx0XHRcdFx0XHRcdG92ZXJ3cml0ZTogQm9vbGVhbixcblx0XHRcdFx0XHRcdH0pLFxuXHRcdFx0XHRcdF0pLFxuXHRcdFx0XHR9KSxcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zdCB7IHRva2VuLCBjdXN0b21GaWVsZHMgfSA9IHRoaXMuYm9keVBhcmFtcy52aXNpdG9yO1xuXHRcdFx0Y29uc3QgZ3Vlc3QgPSB0aGlzLmJvZHlQYXJhbXMudmlzaXRvcjtcblxuXHRcdFx0aWYgKHRoaXMuYm9keVBhcmFtcy52aXNpdG9yLnBob25lKSB7XG5cdFx0XHRcdGd1ZXN0LnBob25lID0geyBudW1iZXI6IHRoaXMuYm9keVBhcmFtcy52aXNpdG9yLnBob25lIH07XG5cdFx0XHR9XG5cblx0XHRcdGxldCB2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5nZXRWaXNpdG9yQnlUb2tlbih0b2tlbik7XG5cdFx0XHRjb25zdCB2aXNpdG9ySWQgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LnJlZ2lzdGVyR3Vlc3QoZ3Vlc3QpO1xuXG5cdFx0XHRpZiAoY3VzdG9tRmllbGRzICYmIGN1c3RvbUZpZWxkcyBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdGN1c3RvbUZpZWxkcy5mb3JFYWNoKChmaWVsZCkgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IGN1c3RvbUZpZWxkID0gUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXRDdXN0b21GaWVsZC5maW5kT25lQnlJZChmaWVsZC5rZXkpO1xuXHRcdFx0XHRcdGlmICghY3VzdG9tRmllbGQpIHtcblx0XHRcdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtY3VzdG9tLWZpZWxkJyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNvbnN0IHsga2V5LCB2YWx1ZSwgb3ZlcndyaXRlIH0gPSBmaWVsZDtcblx0XHRcdFx0XHRpZiAoY3VzdG9tRmllbGQuc2NvcGUgPT09ICd2aXNpdG9yJyAmJiAhTGl2ZWNoYXRWaXNpdG9ycy51cGRhdGVMaXZlY2hhdERhdGFCeVRva2VuKHRva2VuLCBrZXksIHZhbHVlLCBvdmVyd3JpdGUpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmZpbmRPbmVCeUlkKHZpc2l0b3JJZCk7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHZpc2l0b3IgfSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZSk7XG5cdFx0fVxuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC92aXNpdG9yLzp0b2tlbicsIHtcblx0Z2V0KCkge1xuXHRcdHRyeSB7XG5cdFx0XHRjaGVjayh0aGlzLnVybFBhcmFtcywge1xuXHRcdFx0XHR0b2tlbjogU3RyaW5nLFxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHRoaXMudXJsUGFyYW1zLnRva2VuKTtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgdmlzaXRvciB9KTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlLmVycm9yKTtcblx0XHR9XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L3Zpc2l0b3IvOnRva2VuL3Jvb20nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm9vbXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5VmlzaXRvclRva2VuKHRoaXMudXJsUGFyYW1zLnRva2VuLCB7XG5cdFx0XHRmaWVsZHM6IHtcblx0XHRcdFx0bmFtZTogMSxcblx0XHRcdFx0dDogMSxcblx0XHRcdFx0Y2w6IDEsXG5cdFx0XHRcdHU6IDEsXG5cdFx0XHRcdHVzZXJuYW1lczogMSxcblx0XHRcdFx0c2VydmVkQnk6IDEsXG5cdFx0XHR9LFxuXHRcdH0pLmZldGNoKCk7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyByb29tcyB9KTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbk1ldGVvci5zdGFydHVwKCgpID0+IHtcblx0Y29uc3Qgcm9sZXMgPSBfLnBsdWNrKFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmZpbmQoKS5mZXRjaCgpLCAnbmFtZScpO1xuXHRpZiAocm9sZXMuaW5kZXhPZignbGl2ZWNoYXQtYWdlbnQnKSA9PT0gLTEpIHtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5jcmVhdGVPclVwZGF0ZSgnbGl2ZWNoYXQtYWdlbnQnKTtcblx0fVxuXHRpZiAocm9sZXMuaW5kZXhPZignbGl2ZWNoYXQtbWFuYWdlcicpID09PSAtMSkge1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmNyZWF0ZU9yVXBkYXRlKCdsaXZlY2hhdC1tYW5hZ2VyJyk7XG5cdH1cblx0aWYgKHJvbGVzLmluZGV4T2YoJ2xpdmVjaGF0LWd1ZXN0JykgPT09IC0xKSB7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuY3JlYXRlT3JVcGRhdGUoJ2xpdmVjaGF0LWd1ZXN0Jyk7XG5cdH1cblx0aWYgKFJvY2tldENoYXQubW9kZWxzICYmIFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zKSB7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoJ3ZpZXctbC1yb29tJywgWydsaXZlY2hhdC1hZ2VudCcsICdsaXZlY2hhdC1tYW5hZ2VyJywgJ2FkbWluJ10pO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmNyZWF0ZU9yVXBkYXRlKCd2aWV3LWxpdmVjaGF0LW1hbmFnZXInLCBbJ2xpdmVjaGF0LW1hbmFnZXInLCAnYWRtaW4nXSk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoJ3ZpZXctbGl2ZWNoYXQtcm9vbXMnLCBbJ2xpdmVjaGF0LW1hbmFnZXInLCAnYWRtaW4nXSk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoJ2Nsb3NlLWxpdmVjaGF0LXJvb20nLCBbJ2xpdmVjaGF0LWFnZW50JywgJ2xpdmVjaGF0LW1hbmFnZXInLCAnYWRtaW4nXSk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoJ2Nsb3NlLW90aGVycy1saXZlY2hhdC1yb29tJywgWydsaXZlY2hhdC1tYW5hZ2VyJywgJ2FkbWluJ10pO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmNyZWF0ZU9yVXBkYXRlKCdzYXZlLW90aGVycy1saXZlY2hhdC1yb29tLWluZm8nLCBbJ2xpdmVjaGF0LW1hbmFnZXInXSk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoJ3JlbW92ZS1jbG9zZWQtbGl2ZWNoYXQtcm9vbXMnLCBbJ2xpdmVjaGF0LW1hbmFnZXInLCAnYWRtaW4nXSk7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoJ3ZpZXctbGl2ZWNoYXQtYW5hbHl0aWNzJywgWydsaXZlY2hhdC1tYW5hZ2VyJywgJ2FkbWluJ10pO1xuXHR9XG59KTtcbiIsIlJvY2tldENoYXQuTWVzc2FnZVR5cGVzLnJlZ2lzdGVyVHlwZSh7XG5cdGlkOiAnbGl2ZWNoYXRfbmF2aWdhdGlvbl9oaXN0b3J5Jyxcblx0c3lzdGVtOiB0cnVlLFxuXHRtZXNzYWdlOiAnTmV3X3Zpc2l0b3JfbmF2aWdhdGlvbicsXG5cdGRhdGEobWVzc2FnZSkge1xuXHRcdGlmICghbWVzc2FnZS5uYXZpZ2F0aW9uIHx8ICFtZXNzYWdlLm5hdmlnYXRpb24ucGFnZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0aGlzdG9yeTogYCR7IChtZXNzYWdlLm5hdmlnYXRpb24ucGFnZS50aXRsZSA/IGAkeyBtZXNzYWdlLm5hdmlnYXRpb24ucGFnZS50aXRsZSB9IC0gYCA6ICcnKSArIG1lc3NhZ2UubmF2aWdhdGlvbi5wYWdlLmxvY2F0aW9uLmhyZWYgfWAsXG5cdFx0fTtcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0Lk1lc3NhZ2VUeXBlcy5yZWdpc3RlclR5cGUoe1xuXHRpZDogJ2xpdmVjaGF0X3ZpZGVvX2NhbGwnLFxuXHRzeXN0ZW06IHRydWUsXG5cdG1lc3NhZ2U6ICdOZXdfdmlkZW9jYWxsX3JlcXVlc3QnLFxufSk7XG5cblJvY2tldENoYXQuYWN0aW9uTGlua3MucmVnaXN0ZXIoJ2NyZWF0ZUxpdmVjaGF0Q2FsbCcsIGZ1bmN0aW9uKG1lc3NhZ2UsIHBhcmFtcywgaW5zdGFuY2UpIHtcblx0aWYgKE1ldGVvci5pc0NsaWVudCkge1xuXHRcdGluc3RhbmNlLnRhYkJhci5vcGVuKCd2aWRlbycpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5hY3Rpb25MaW5rcy5yZWdpc3RlcignZGVueUxpdmVjaGF0Q2FsbCcsIGZ1bmN0aW9uKG1lc3NhZ2UvKiAsIHBhcmFtcyovKSB7XG5cdGlmIChNZXRlb3IuaXNTZXJ2ZXIpIHtcblx0XHRjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXIoKTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIoJ2NvbW1hbmQnLCBtZXNzYWdlLnJpZCwgJ2VuZENhbGwnLCB1c2VyKTtcblx0XHRSb2NrZXRDaGF0Lk5vdGlmaWNhdGlvbnMubm90aWZ5Um9vbShtZXNzYWdlLnJpZCwgJ2RlbGV0ZU1lc3NhZ2UnLCB7IF9pZDogbWVzc2FnZS5faWQgfSk7XG5cblx0XHRjb25zdCBsYW5ndWFnZSA9IHVzZXIubGFuZ3VhZ2UgfHwgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ2xhbmd1YWdlJykgfHwgJ2VuJztcblxuXHRcdFJvY2tldENoYXQuTGl2ZWNoYXQuY2xvc2VSb29tKHtcblx0XHRcdHVzZXIsXG5cdFx0XHRyb29tOiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChtZXNzYWdlLnJpZCksXG5cdFx0XHRjb21tZW50OiBUQVBpMThuLl9fKCdWaWRlb2NhbGxfZGVjbGluZWQnLCB7IGxuZzogbGFuZ3VhZ2UgfSksXG5cdFx0fSk7XG5cdFx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLnNldEhpZGRlbkJ5SWQobWVzc2FnZS5faWQpO1xuXHRcdH0pO1xuXHR9XG59KTtcbiIsIk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdMaXZlY2hhdCcpO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9lbmFibGVkJywgZmFsc2UsIHsgdHlwZTogJ2Jvb2xlYW4nLCBncm91cDogJ0xpdmVjaGF0JywgcHVibGljOiB0cnVlIH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF90aXRsZScsICdSb2NrZXQuQ2hhdCcsIHsgdHlwZTogJ3N0cmluZycsIGdyb3VwOiAnTGl2ZWNoYXQnLCBwdWJsaWM6IHRydWUgfSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF90aXRsZV9jb2xvcicsICcjQzEyNzJEJywge1xuXHRcdHR5cGU6ICdjb2xvcicsXG5cdFx0ZWRpdG9yOiAnY29sb3InLFxuXHRcdGFsbG93ZWRUeXBlczogWydjb2xvcicsICdleHByZXNzaW9uJ10sXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfZGlzcGxheV9vZmZsaW5lX2Zvcm0nLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRzZWN0aW9uOiAnT2ZmbGluZScsXG5cdFx0aTE4bkxhYmVsOiAnRGlzcGxheV9vZmZsaW5lX2Zvcm0nLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfdmFsaWRhdGVfb2ZmbGluZV9lbWFpbCcsIHRydWUsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdHNlY3Rpb246ICdPZmZsaW5lJyxcblx0XHRpMThuTGFiZWw6ICdWYWxpZGF0ZV9lbWFpbF9hZGRyZXNzJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X29mZmxpbmVfZm9ybV91bmF2YWlsYWJsZScsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdHNlY3Rpb246ICdPZmZsaW5lJyxcblx0XHRpMThuTGFiZWw6ICdPZmZsaW5lX2Zvcm1fdW5hdmFpbGFibGVfbWVzc2FnZScsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9vZmZsaW5lX3RpdGxlJywgJ0xlYXZlIGEgbWVzc2FnZScsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0c2VjdGlvbjogJ09mZmxpbmUnLFxuXHRcdGkxOG5MYWJlbDogJ1RpdGxlJyxcblx0fSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9vZmZsaW5lX3RpdGxlX2NvbG9yJywgJyM2NjY2NjYnLCB7XG5cdFx0dHlwZTogJ2NvbG9yJyxcblx0XHRlZGl0b3I6ICdjb2xvcicsXG5cdFx0YWxsb3dlZFR5cGVzOiBbJ2NvbG9yJywgJ2V4cHJlc3Npb24nXSxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0c2VjdGlvbjogJ09mZmxpbmUnLFxuXHRcdGkxOG5MYWJlbDogJ0NvbG9yJyxcblx0fSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9vZmZsaW5lX21lc3NhZ2UnLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRzZWN0aW9uOiAnT2ZmbGluZScsXG5cdFx0aTE4bkxhYmVsOiAnSW5zdHJ1Y3Rpb25zJyxcblx0XHRpMThuRGVzY3JpcHRpb246ICdJbnN0cnVjdGlvbnNfdG9feW91cl92aXNpdG9yX2ZpbGxfdGhlX2Zvcm1fdG9fc2VuZF9hX21lc3NhZ2UnLFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X29mZmxpbmVfZW1haWwnLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdGkxOG5MYWJlbDogJ0VtYWlsX2FkZHJlc3NfdG9fc2VuZF9vZmZsaW5lX21lc3NhZ2VzJyxcblx0XHRzZWN0aW9uOiAnT2ZmbGluZScsXG5cdH0pO1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfb2ZmbGluZV9zdWNjZXNzX21lc3NhZ2UnLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRzZWN0aW9uOiAnT2ZmbGluZScsXG5cdFx0aTE4bkxhYmVsOiAnT2ZmbGluZV9zdWNjZXNzX21lc3NhZ2UnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfYWxsb3dfc3dpdGNoaW5nX2RlcGFydG1lbnRzJywgdHJ1ZSwgeyB0eXBlOiAnYm9vbGVhbicsIGdyb3VwOiAnTGl2ZWNoYXQnLCBwdWJsaWM6IHRydWUsIGkxOG5MYWJlbDogJ0FsbG93X3N3aXRjaGluZ19kZXBhcnRtZW50cycgfSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9zaG93X2FnZW50X2VtYWlsJywgdHJ1ZSwgeyB0eXBlOiAnYm9vbGVhbicsIGdyb3VwOiAnTGl2ZWNoYXQnLCBwdWJsaWM6IHRydWUsIGkxOG5MYWJlbDogJ1Nob3dfYWdlbnRfZW1haWwnIH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9jb252ZXJzYXRpb25fZmluaXNoZWRfbWVzc2FnZScsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ0NvbnZlcnNhdGlvbl9maW5pc2hlZF9tZXNzYWdlJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3JlZ2lzdHJhdGlvbl9mb3JtJywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnU2hvd19wcmVyZWdpc3RyYXRpb25fZm9ybScsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9uYW1lX2ZpZWxkX3JlZ2lzdHJhdGlvbl9mb3JtJywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnU2hvd19uYW1lX2ZpZWxkJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2VtYWlsX2ZpZWxkX3JlZ2lzdHJhdGlvbl9mb3JtJywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnU2hvd19lbWFpbF9maWVsZCcsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9ndWVzdF9jb3VudCcsIDEsIHsgdHlwZTogJ2ludCcsIGdyb3VwOiAnTGl2ZWNoYXQnIH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9Sb29tX0NvdW50JywgMSwge1xuXHRcdHR5cGU6ICdpbnQnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdGkxOG5MYWJlbDogJ0xpdmVjaGF0X3Jvb21fY291bnQnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfYWdlbnRfbGVhdmVfYWN0aW9uJywgJ25vbmUnLCB7XG5cdFx0dHlwZTogJ3NlbGVjdCcsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0dmFsdWVzOiBbXG5cdFx0XHR7IGtleTogJ25vbmUnLCBpMThuTGFiZWw6ICdOb25lJyB9LFxuXHRcdFx0eyBrZXk6ICdmb3J3YXJkJywgaTE4bkxhYmVsOiAnRm9yd2FyZCcgfSxcblx0XHRcdHsga2V5OiAnY2xvc2UnLCBpMThuTGFiZWw6ICdDbG9zZScgfSxcblx0XHRdLFxuXHRcdGkxOG5MYWJlbDogJ0hvd190b19oYW5kbGVfb3Blbl9zZXNzaW9uc193aGVuX2FnZW50X2dvZXNfb2ZmbGluZScsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9hZ2VudF9sZWF2ZV9hY3Rpb25fdGltZW91dCcsIDYwLCB7XG5cdFx0dHlwZTogJ2ludCcsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnTGl2ZWNoYXRfYWdlbnRfbGVhdmVfYWN0aW9uJywgdmFsdWU6IHsgJG5lOiAnbm9uZScgfSB9LFxuXHRcdGkxOG5MYWJlbDogJ0hvd19sb25nX3RvX3dhaXRfYWZ0ZXJfYWdlbnRfZ29lc19vZmZsaW5lJyxcblx0XHRpMThuRGVzY3JpcHRpb246ICdUaW1lX2luX3NlY29uZHMnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfYWdlbnRfbGVhdmVfY29tbWVudCcsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnTGl2ZWNoYXRfYWdlbnRfbGVhdmVfYWN0aW9uJywgdmFsdWU6ICdjbG9zZScgfSxcblx0XHRpMThuTGFiZWw6ICdDb21tZW50X3RvX2xlYXZlX29uX2Nsb3Npbmdfc2Vzc2lvbicsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF93ZWJob29rVXJsJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnQ1JNX0ludGVncmF0aW9uJyxcblx0XHRpMThuTGFiZWw6ICdXZWJob29rX1VSTCcsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9zZWNyZXRfdG9rZW4nLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdDUk1fSW50ZWdyYXRpb24nLFxuXHRcdGkxOG5MYWJlbDogJ1NlY3JldF90b2tlbicsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF93ZWJob29rX29uX2Nsb3NlJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0c2VjdGlvbjogJ0NSTV9JbnRlZ3JhdGlvbicsXG5cdFx0aTE4bkxhYmVsOiAnU2VuZF9yZXF1ZXN0X29uX2NoYXRfY2xvc2UnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfd2ViaG9va19vbl9vZmZsaW5lX21zZycsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdDUk1fSW50ZWdyYXRpb24nLFxuXHRcdGkxOG5MYWJlbDogJ1NlbmRfcmVxdWVzdF9vbl9vZmZsaW5lX21lc3NhZ2VzJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3dlYmhvb2tfb25fdmlzaXRvcl9tZXNzYWdlJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0c2VjdGlvbjogJ0NSTV9JbnRlZ3JhdGlvbicsXG5cdFx0aTE4bkxhYmVsOiAnU2VuZF9yZXF1ZXN0X29uX3Zpc2l0b3JfbWVzc2FnZScsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF93ZWJob29rX29uX2FnZW50X21lc3NhZ2UnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnQ1JNX0ludGVncmF0aW9uJyxcblx0XHRpMThuTGFiZWw6ICdTZW5kX3JlcXVlc3Rfb25fYWdlbnRfbWVzc2FnZScsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdTZW5kX3Zpc2l0b3JfbmF2aWdhdGlvbl9oaXN0b3J5X2xpdmVjaGF0X3dlYmhvb2tfcmVxdWVzdCcsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdDUk1fSW50ZWdyYXRpb24nLFxuXHRcdGkxOG5MYWJlbDogJ1NlbmRfdmlzaXRvcl9uYXZpZ2F0aW9uX2hpc3Rvcnlfb25fcmVxdWVzdCcsXG5cdFx0aTE4bkRlc2NyaXB0aW9uOiAnRmVhdHVyZV9EZXBlbmRzX29uX0xpdmVjaGF0X1Zpc2l0b3JfbmF2aWdhdGlvbl9hc19hX21lc3NhZ2VfdG9fYmVfZW5hYmxlZCcsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnTGl2ZWNoYXRfVmlzaXRvcl9uYXZpZ2F0aW9uX2FzX2FfbWVzc2FnZScsIHZhbHVlOiB0cnVlIH0sXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF93ZWJob29rX29uX2NhcHR1cmUnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnQ1JNX0ludGVncmF0aW9uJyxcblx0XHRpMThuTGFiZWw6ICdTZW5kX3JlcXVlc3Rfb25fbGVhZF9jYXB0dXJlJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2xlYWRfZW1haWxfcmVnZXgnLCAnXFxcXGJbQS1aMC05Ll8lKy1dK0AoPzpbQS1aMC05LV0rXFxcXC4pK1tBLVpdezIsNH1cXFxcYicsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnQ1JNX0ludGVncmF0aW9uJyxcblx0XHRpMThuTGFiZWw6ICdMZWFkX2NhcHR1cmVfZW1haWxfcmVnZXgnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfbGVhZF9waG9uZV9yZWdleCcsICcoKD86XFxcXChbMC05XXsxLDN9XFxcXCl8WzAtOV17Mn0pWyBcXFxcLV0qP1swLTldezQsNX0oPzpbXFxcXC1cXFxcc1xcXFxfXXsxLDJ9KT9bMC05XXs0fSg/Oig/PVteMC05XSl8JCl8WzAtOV17NCw1fSg/OltcXFxcLVxcXFxzXFxcXF9dezEsMn0pP1swLTldezR9KD86KD89W14wLTldKXwkKSknLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0c2VjdGlvbjogJ0NSTV9JbnRlZ3JhdGlvbicsXG5cdFx0aTE4bkxhYmVsOiAnTGVhZF9jYXB0dXJlX3Bob25lX3JlZ2V4Jyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X0tub3dsZWRnZV9FbmFibGVkJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0c2VjdGlvbjogJ0tub3dsZWRnZV9CYXNlJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnRW5hYmxlZCcsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9Lbm93bGVkZ2VfQXBpYWlfS2V5JywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnS25vd2xlZGdlX0Jhc2UnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdBcGlhaV9LZXknLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfS25vd2xlZGdlX0FwaWFpX0xhbmd1YWdlJywgJ2VuJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdLbm93bGVkZ2VfQmFzZScsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ0FwaWFpX0xhbmd1YWdlJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2hpc3RvcnlfbW9uaXRvcl90eXBlJywgJ3VybCcsIHtcblx0XHR0eXBlOiAnc2VsZWN0Jyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRpMThuTGFiZWw6ICdNb25pdG9yX2hpc3RvcnlfZm9yX2NoYW5nZXNfb24nLFxuXHRcdHZhbHVlczogW1xuXHRcdFx0eyBrZXk6ICd1cmwnLCBpMThuTGFiZWw6ICdQYWdlX1VSTCcgfSxcblx0XHRcdHsga2V5OiAndGl0bGUnLCBpMThuTGFiZWw6ICdQYWdlX3RpdGxlJyB9LFxuXHRcdF0sXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9WaXNpdG9yX25hdmlnYXRpb25fYXNfYV9tZXNzYWdlJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ1NlbmRfVmlzaXRvcl9uYXZpZ2F0aW9uX2hpc3RvcnlfYXNfYV9tZXNzYWdlJyxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2VuYWJsZV9vZmZpY2VfaG91cnMnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnT2ZmaWNlX2hvdXJzX2VuYWJsZWQnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfY29udGludW91c19zb3VuZF9ub3RpZmljYXRpb25fbmV3X2xpdmVjaGF0X3Jvb20nLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnQ29udGludW91c19zb3VuZF9ub3RpZmljYXRpb25zX2Zvcl9uZXdfbGl2ZWNoYXRfcm9vbScsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF92aWRlb2NhbGxfZW5hYmxlZCcsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdWaWRlb2NhbGxfZW5hYmxlZCcsXG5cdFx0aTE4bkRlc2NyaXB0aW9uOiAnQmV0YV9mZWF0dXJlX0RlcGVuZHNfb25fVmlkZW9fQ29uZmVyZW5jZV90b19iZV9lbmFibGVkJyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdKaXRzaV9FbmFibGVkJywgdmFsdWU6IHRydWUgfSxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2ZpbGV1cGxvYWRfZW5hYmxlZCcsIHRydWUsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ0ZpbGVVcGxvYWRfRW5hYmxlZCcsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnRmlsZVVwbG9hZF9FbmFibGVkJywgdmFsdWU6IHRydWUgfSxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X2VuYWJsZV90cmFuc2NyaXB0JywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ1RyYW5zY3JpcHRfRW5hYmxlZCcsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF90cmFuc2NyaXB0X21lc3NhZ2UnLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdUcmFuc2NyaXB0X21lc3NhZ2UnLFxuXHRcdGVuYWJsZVF1ZXJ5OiB7IF9pZDogJ0xpdmVjaGF0X2VuYWJsZV90cmFuc2NyaXB0JywgdmFsdWU6IHRydWUgfSxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X29wZW5faW5xdWllcnlfc2hvd19jb25uZWN0aW5nJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ0xpdmVjaGF0X29wZW5faW5xdWllcnlfc2hvd19jb25uZWN0aW5nJyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdMaXZlY2hhdF9Sb3V0aW5nX01ldGhvZCcsIHZhbHVlOiAnR3Vlc3RfUG9vbCcgfSxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X0FsbG93ZWREb21haW5zTGlzdCcsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ0xpdmVjaGF0X0FsbG93ZWREb21haW5zTGlzdCcsXG5cdFx0aTE4bkRlc2NyaXB0aW9uOiAnRG9tYWluc19hbGxvd2VkX3RvX2VtYmVkX3RoZV9saXZlY2hhdF93aWRnZXQnLFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfRmFjZWJvb2tfRW5hYmxlZCcsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHNlY3Rpb246ICdGYWNlYm9vaycsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9GYWNlYm9va19BUElfS2V5JywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnRmFjZWJvb2snLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ0lmX3lvdV9kb250X2hhdmVfb25lX3NlbmRfYW5fZW1haWxfdG9fb21uaV9yb2NrZXRjaGF0X3RvX2dldF95b3VycycsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9GYWNlYm9va19BUElfU2VjcmV0JywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRzZWN0aW9uOiAnRmFjZWJvb2snLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ0lmX3lvdV9kb250X2hhdmVfb25lX3NlbmRfYW5fZW1haWxfdG9fb21uaV9yb2NrZXRjaGF0X3RvX2dldF95b3VycycsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9SRFN0YXRpb25fVG9rZW4nLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdGdyb3VwOiAnTGl2ZWNoYXQnLFxuXHRcdHB1YmxpYzogZmFsc2UsXG5cdFx0c2VjdGlvbjogJ1JEIFN0YXRpb24nLFxuXHRcdGkxOG5MYWJlbDogJ1JEU3RhdGlvbl9Ub2tlbicsXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9Sb3V0aW5nX01ldGhvZCcsICdMZWFzdF9BbW91bnQnLCB7XG5cdFx0dHlwZTogJ3NlbGVjdCcsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdHNlY3Rpb246ICdSb3V0aW5nJyxcblx0XHR2YWx1ZXM6IFtcblx0XHRcdHsga2V5OiAnRXh0ZXJuYWwnLCBpMThuTGFiZWw6ICdFeHRlcm5hbF9TZXJ2aWNlJyB9LFxuXHRcdFx0eyBrZXk6ICdMZWFzdF9BbW91bnQnLCBpMThuTGFiZWw6ICdMZWFzdF9BbW91bnQnIH0sXG5cdFx0XHR7IGtleTogJ0d1ZXN0X1Bvb2wnLCBpMThuTGFiZWw6ICdHdWVzdF9Qb29sJyB9LFxuXHRcdF0sXG5cdH0pO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdMaXZlY2hhdF9ndWVzdF9wb29sX3dpdGhfbm9fYWdlbnRzJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0c2VjdGlvbjogJ1JvdXRpbmcnLFxuXHRcdGkxOG5MYWJlbDogJ0FjY2VwdF93aXRoX25vX29ubGluZV9hZ2VudHMnLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ0FjY2VwdF9pbmNvbWluZ19saXZlY2hhdF9yZXF1ZXN0c19ldmVuX2lmX3RoZXJlX2FyZV9ub19vbmxpbmVfYWdlbnRzJyxcblx0XHRlbmFibGVRdWVyeTogeyBfaWQ6ICdMaXZlY2hhdF9Sb3V0aW5nX01ldGhvZCcsIHZhbHVlOiAnR3Vlc3RfUG9vbCcgfSxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X3Nob3dfcXVldWVfbGlzdF9saW5rJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdMaXZlY2hhdCcsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdHNlY3Rpb246ICdSb3V0aW5nJyxcblx0XHRpMThuTGFiZWw6ICdTaG93X3F1ZXVlX2xpc3RfdG9fYWxsX2FnZW50cycsXG5cdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnTGl2ZWNoYXRfUm91dGluZ19NZXRob2QnLCB2YWx1ZTogeyAkbmU6ICdFeHRlcm5hbCcgfSB9LFxuXHR9KTtcblxuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnTGl2ZWNoYXRfRXh0ZXJuYWxfUXVldWVfVVJMJywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IGZhbHNlLFxuXHRcdHNlY3Rpb246ICdSb3V0aW5nJyxcblx0XHRpMThuTGFiZWw6ICdFeHRlcm5hbF9RdWV1ZV9TZXJ2aWNlX1VSTCcsXG5cdFx0aTE4bkRlc2NyaXB0aW9uOiAnRm9yX21vcmVfZGV0YWlsc19wbGVhc2VfY2hlY2tfb3VyX2RvY3MnLFxuXHRcdGVuYWJsZVF1ZXJ5OiB7IF9pZDogJ0xpdmVjaGF0X1JvdXRpbmdfTWV0aG9kJywgdmFsdWU6ICdFeHRlcm5hbCcgfSxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0xpdmVjaGF0X0V4dGVybmFsX1F1ZXVlX1Rva2VuJywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ0xpdmVjaGF0Jyxcblx0XHRwdWJsaWM6IGZhbHNlLFxuXHRcdHNlY3Rpb246ICdSb3V0aW5nJyxcblx0XHRpMThuTGFiZWw6ICdTZWNyZXRfdG9rZW4nLFxuXHRcdGVuYWJsZVF1ZXJ5OiB7IF9pZDogJ0xpdmVjaGF0X1JvdXRpbmdfTWV0aG9kJywgdmFsdWU6ICdFeHRlcm5hbCcgfSxcblx0fSk7XG59KTtcbiIsIi8qIGdsb2JhbHMgb3BlblJvb20sIExpdmVjaGF0SW5xdWlyeSAqL1xuaW1wb3J0IHsgUm9vbVNldHRpbmdzRW51bSwgUm9vbVR5cGVDb25maWcsIFJvb21UeXBlUm91dGVDb25maWcsIFVpVGV4dENvbnRleHQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuXG5jbGFzcyBMaXZlY2hhdFJvb21Sb3V0ZSBleHRlbmRzIFJvb21UeXBlUm91dGVDb25maWcge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcih7XG5cdFx0XHRuYW1lOiAnbGl2ZScsXG5cdFx0XHRwYXRoOiAnL2xpdmUvOmlkJyxcblx0XHR9KTtcblx0fVxuXG5cdGFjdGlvbihwYXJhbXMpIHtcblx0XHRvcGVuUm9vbSgnbCcsIHBhcmFtcy5pZCk7XG5cdH1cblxuXHRsaW5rKHN1Yikge1xuXHRcdHJldHVybiB7XG5cdFx0XHRpZDogc3ViLnJpZCxcblx0XHR9O1xuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExpdmVjaGF0Um9vbVR5cGUgZXh0ZW5kcyBSb29tVHlwZUNvbmZpZyB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKHtcblx0XHRcdGlkZW50aWZpZXI6ICdsJyxcblx0XHRcdG9yZGVyOiA1LFxuXHRcdFx0aWNvbjogJ2xpdmVjaGF0Jyxcblx0XHRcdGxhYmVsOiAnTGl2ZWNoYXQnLFxuXHRcdFx0cm91dGU6IG5ldyBMaXZlY2hhdFJvb21Sb3V0ZSgpLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5ub3RTdWJzY3JpYmVkVHBsID0ge1xuXHRcdFx0dGVtcGxhdGU6ICdsaXZlY2hhdE5vdFN1YnNjcmliZWQnLFxuXHRcdH07XG5cdH1cblxuXHRmaW5kUm9vbShpZGVudGlmaWVyKSB7XG5cdFx0cmV0dXJuIENoYXRSb29tLmZpbmRPbmUoeyBfaWQ6IGlkZW50aWZpZXIgfSk7XG5cdH1cblxuXHRyb29tTmFtZShyb29tRGF0YSkge1xuXHRcdHJldHVybiByb29tRGF0YS5uYW1lIHx8IHJvb21EYXRhLmZuYW1lIHx8IHJvb21EYXRhLmxhYmVsO1xuXHR9XG5cblx0Y29uZGl0aW9uKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfZW5hYmxlZCcpICYmIFJvY2tldENoYXQuYXV0aHouaGFzQWxsUGVybWlzc2lvbigndmlldy1sLXJvb20nKTtcblx0fVxuXG5cdGNhblNlbmRNZXNzYWdlKHJvb21JZCkge1xuXHRcdGNvbnN0IHJvb20gPSBDaGF0Um9vbS5maW5kT25lKHsgX2lkOiByb29tSWQgfSwgeyBmaWVsZHM6IHsgb3BlbjogMSB9IH0pO1xuXHRcdHJldHVybiByb29tICYmIHJvb20ub3BlbiA9PT0gdHJ1ZTtcblx0fVxuXG5cdGdldFVzZXJTdGF0dXMocm9vbUlkKSB7XG5cdFx0Y29uc3Qgcm9vbSA9IFNlc3Npb24uZ2V0KGByb29tRGF0YSR7IHJvb21JZCB9YCk7XG5cdFx0aWYgKHJvb20pIHtcblx0XHRcdHJldHVybiByb29tLnYgJiYgcm9vbS52LnN0YXR1cztcblx0XHR9XG5cblx0XHRjb25zdCBpbnF1aXJ5ID0gTGl2ZWNoYXRJbnF1aXJ5LmZpbmRPbmUoeyByaWQ6IHJvb21JZCB9KTtcblx0XHRyZXR1cm4gaW5xdWlyeSAmJiBpbnF1aXJ5LnYgJiYgaW5xdWlyeS52LnN0YXR1cztcblx0fVxuXG5cdGFsbG93Um9vbVNldHRpbmdDaGFuZ2Uocm9vbSwgc2V0dGluZykge1xuXHRcdHN3aXRjaCAoc2V0dGluZykge1xuXHRcdFx0Y2FzZSBSb29tU2V0dGluZ3NFbnVtLkpPSU5fQ09ERTpcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHR9XG5cblx0Z2V0VWlUZXh0KGNvbnRleHQpIHtcblx0XHRzd2l0Y2ggKGNvbnRleHQpIHtcblx0XHRcdGNhc2UgVWlUZXh0Q29udGV4dC5ISURFX1dBUk5JTkc6XG5cdFx0XHRcdHJldHVybiAnSGlkZV9MaXZlY2hhdF9XYXJuaW5nJztcblx0XHRcdGNhc2UgVWlUZXh0Q29udGV4dC5MRUFWRV9XQVJOSU5HOlxuXHRcdFx0XHRyZXR1cm4gJ0hpZGVfTGl2ZWNoYXRfV2FybmluZyc7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gJyc7XG5cdFx0fVxuXHR9XG59XG4iLCJSb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnbGl2ZWNoYXQvZGVwYXJ0bWVudCcsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRkZXBhcnRtZW50czogUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50LmZpbmQoKS5mZXRjaCgpLFxuXHRcdH0pO1xuXHR9LFxuXHRwb3N0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy5ib2R5UGFyYW1zLCB7XG5cdFx0XHRcdGRlcGFydG1lbnQ6IE9iamVjdCxcblx0XHRcdFx0YWdlbnRzOiBBcnJheSxcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zdCBkZXBhcnRtZW50ID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5zYXZlRGVwYXJ0bWVudChudWxsLCB0aGlzLmJvZHlQYXJhbXMuZGVwYXJ0bWVudCwgdGhpcy5ib2R5UGFyYW1zLmFnZW50cyk7XG5cblx0XHRcdGlmIChkZXBhcnRtZW50KSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0XHRkZXBhcnRtZW50LFxuXHRcdFx0XHRcdGFnZW50czogUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLmZpbmQoeyBkZXBhcnRtZW50SWQ6IGRlcGFydG1lbnQuX2lkIH0pLmZldGNoKCksXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZSk7XG5cdFx0fVxuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC9kZXBhcnRtZW50LzpfaWQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldCgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0dHJ5IHtcblx0XHRcdGNoZWNrKHRoaXMudXJsUGFyYW1zLCB7XG5cdFx0XHRcdF9pZDogU3RyaW5nLFxuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0ZGVwYXJ0bWVudDogUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50LmZpbmRPbmVCeUlkKHRoaXMudXJsUGFyYW1zLl9pZCksXG5cdFx0XHRcdGFnZW50czogUm9ja2V0Q2hhdC5tb2RlbHMuTGl2ZWNoYXREZXBhcnRtZW50QWdlbnRzLmZpbmQoeyBkZXBhcnRtZW50SWQ6IHRoaXMudXJsUGFyYW1zLl9pZCB9KS5mZXRjaCgpLFxuXHRcdFx0fSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5lcnJvcik7XG5cdFx0fVxuXHR9LFxuXHRwdXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRjaGVjayh0aGlzLnVybFBhcmFtcywge1xuXHRcdFx0XHRfaWQ6IFN0cmluZyxcblx0XHRcdH0pO1xuXG5cdFx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIHtcblx0XHRcdFx0ZGVwYXJ0bWVudDogT2JqZWN0LFxuXHRcdFx0XHRhZ2VudHM6IEFycmF5LFxuXHRcdFx0fSk7XG5cblx0XHRcdGlmIChSb2NrZXRDaGF0LkxpdmVjaGF0LnNhdmVEZXBhcnRtZW50KHRoaXMudXJsUGFyYW1zLl9pZCwgdGhpcy5ib2R5UGFyYW1zLmRlcGFydG1lbnQsIHRoaXMuYm9keVBhcmFtcy5hZ2VudHMpKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0XHRkZXBhcnRtZW50OiBSb2NrZXRDaGF0Lm1vZGVscy5MaXZlY2hhdERlcGFydG1lbnQuZmluZE9uZUJ5SWQodGhpcy51cmxQYXJhbXMuX2lkKSxcblx0XHRcdFx0XHRhZ2VudHM6IFJvY2tldENoYXQubW9kZWxzLkxpdmVjaGF0RGVwYXJ0bWVudEFnZW50cy5maW5kKHsgZGVwYXJ0bWVudElkOiB0aGlzLnVybFBhcmFtcy5faWQgfSkuZmV0Y2goKSxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5lcnJvcik7XG5cdFx0fVxuXHR9LFxuXHRkZWxldGUoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRjaGVjayh0aGlzLnVybFBhcmFtcywge1xuXHRcdFx0XHRfaWQ6IFN0cmluZyxcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZW1vdmVEZXBhcnRtZW50KHRoaXMudXJsUGFyYW1zLl9pZCkpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlLmVycm9yKTtcblx0XHR9XG5cdH0sXG59KTtcbiIsImltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcblxuaW1wb3J0IExpdmVjaGF0VmlzaXRvcnMgZnJvbSAnLi4vLi4vLi4vc2VydmVyL21vZGVscy9MaXZlY2hhdFZpc2l0b3JzJztcblxuLyoqXG4gKiBAYXBpIHtwb3N0fSAvbGl2ZWNoYXQvZmFjZWJvb2sgU2VuZCBGYWNlYm9vayBtZXNzYWdlXG4gKiBAYXBpTmFtZSBGYWNlYm9va1xuICogQGFwaUdyb3VwIExpdmVjaGF0XG4gKlxuICogQGFwaVBhcmFtIHtTdHJpbmd9IG1pZCBGYWNlYm9vayBtZXNzYWdlIGlkXG4gKiBAYXBpUGFyYW0ge1N0cmluZ30gcGFnZSBGYWNlYm9vayBwYWdlcyBpZFxuICogQGFwaVBhcmFtIHtTdHJpbmd9IHRva2VuIEZhY2Vib29rIHVzZXIncyB0b2tlblxuICogQGFwaVBhcmFtIHtTdHJpbmd9IGZpcnN0X25hbWUgRmFjZWJvb2sgdXNlcidzIGZpcnN0IG5hbWVcbiAqIEBhcGlQYXJhbSB7U3RyaW5nfSBsYXN0X25hbWUgRmFjZWJvb2sgdXNlcidzIGxhc3QgbmFtZVxuICogQGFwaVBhcmFtIHtTdHJpbmd9IFt0ZXh0XSBGYWNlYm9vayBtZXNzYWdlIHRleHRcbiAqIEBhcGlQYXJhbSB7U3RyaW5nfSBbYXR0YWNobWVudHNdIEZhY2Vib29rIG1lc3NhZ2UgYXR0YWNobWVudHNcbiAqL1xuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L2ZhY2Vib29rJywge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLnRleHQgJiYgIXRoaXMuYm9keVBhcmFtcy5hdHRhY2htZW50cykge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0c3VjY2VzczogZmFsc2UsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICghdGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtaHViLXNpZ25hdHVyZSddKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTGl2ZWNoYXRfRmFjZWJvb2tfRW5hYmxlZCcpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcblx0XHRcdFx0ZXJyb3I6ICdJbnRlZ3JhdGlvbiBkaXNhYmxlZCcsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIHZhbGlkYXRlIGlmIHJlcXVlc3QgY29tZSBmcm9tIG9tbmlcblx0XHRjb25zdCBzaWduYXR1cmUgPSBjcnlwdG8uY3JlYXRlSG1hYygnc2hhMScsIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMaXZlY2hhdF9GYWNlYm9va19BUElfU2VjcmV0JykpLnVwZGF0ZShKU09OLnN0cmluZ2lmeSh0aGlzLnJlcXVlc3QuYm9keSkpLmRpZ2VzdCgnaGV4Jyk7XG5cdFx0aWYgKHRoaXMucmVxdWVzdC5oZWFkZXJzWyd4LWh1Yi1zaWduYXR1cmUnXSAhPT0gYHNoYTE9JHsgc2lnbmF0dXJlIH1gKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcblx0XHRcdFx0ZXJyb3I6ICdJbnZhbGlkIHNpZ25hdHVyZScsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGNvbnN0IHNlbmRNZXNzYWdlID0ge1xuXHRcdFx0bWVzc2FnZToge1xuXHRcdFx0XHRfaWQ6IHRoaXMuYm9keVBhcmFtcy5taWQsXG5cdFx0XHR9LFxuXHRcdFx0cm9vbUluZm86IHtcblx0XHRcdFx0ZmFjZWJvb2s6IHtcblx0XHRcdFx0XHRwYWdlOiB0aGlzLmJvZHlQYXJhbXMucGFnZSxcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0fTtcblx0XHRsZXQgdmlzaXRvciA9IExpdmVjaGF0VmlzaXRvcnMuZ2V0VmlzaXRvckJ5VG9rZW4odGhpcy5ib2R5UGFyYW1zLnRva2VuKTtcblx0XHRpZiAodmlzaXRvcikge1xuXHRcdFx0Y29uc3Qgcm9vbXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5VmlzaXRvclRva2VuKHZpc2l0b3IudG9rZW4pLmZldGNoKCk7XG5cdFx0XHRpZiAocm9vbXMgJiYgcm9vbXMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRzZW5kTWVzc2FnZS5tZXNzYWdlLnJpZCA9IHJvb21zWzBdLl9pZDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UucmlkID0gUmFuZG9tLmlkKCk7XG5cdFx0XHR9XG5cdFx0XHRzZW5kTWVzc2FnZS5tZXNzYWdlLnRva2VuID0gdmlzaXRvci50b2tlbjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2VuZE1lc3NhZ2UubWVzc2FnZS5yaWQgPSBSYW5kb20uaWQoKTtcblx0XHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UudG9rZW4gPSB0aGlzLmJvZHlQYXJhbXMudG9rZW47XG5cblx0XHRcdGNvbnN0IHVzZXJJZCA9IFJvY2tldENoYXQuTGl2ZWNoYXQucmVnaXN0ZXJHdWVzdCh7XG5cdFx0XHRcdHRva2VuOiBzZW5kTWVzc2FnZS5tZXNzYWdlLnRva2VuLFxuXHRcdFx0XHRuYW1lOiBgJHsgdGhpcy5ib2R5UGFyYW1zLmZpcnN0X25hbWUgfSAkeyB0aGlzLmJvZHlQYXJhbXMubGFzdF9uYW1lIH1gLFxuXHRcdFx0fSk7XG5cblx0XHRcdHZpc2l0b3IgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh1c2VySWQpO1xuXHRcdH1cblxuXHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UubXNnID0gdGhpcy5ib2R5UGFyYW1zLnRleHQ7XG5cdFx0c2VuZE1lc3NhZ2UuZ3Vlc3QgPSB2aXNpdG9yO1xuXG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHN1Y2VzczogdHJ1ZSxcblx0XHRcdFx0bWVzc2FnZTogUm9ja2V0Q2hhdC5MaXZlY2hhdC5zZW5kTWVzc2FnZShzZW5kTWVzc2FnZSksXG5cdFx0XHR9O1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVzaW5nIEZhY2Vib29rIC0+JywgZSk7XG5cdFx0fVxuXHR9LFxufSk7XG4iLCJpbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi8uLi8uLi9zZXJ2ZXIvbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5Sb2NrZXRDaGF0LkFQSS52MS5hZGRSb3V0ZSgnbGl2ZWNoYXQvc21zLWluY29taW5nLzpzZXJ2aWNlJywge1xuXHRwb3N0KCkge1xuXHRcdGNvbnN0IFNNU1NlcnZpY2UgPSBSb2NrZXRDaGF0LlNNUy5nZXRTZXJ2aWNlKHRoaXMudXJsUGFyYW1zLnNlcnZpY2UpO1xuXG5cdFx0Y29uc3Qgc21zID0gU01TU2VydmljZS5wYXJzZSh0aGlzLmJvZHlQYXJhbXMpO1xuXG5cdFx0bGV0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmZpbmRPbmVWaXNpdG9yQnlQaG9uZShzbXMuZnJvbSk7XG5cblx0XHRjb25zdCBzZW5kTWVzc2FnZSA9IHtcblx0XHRcdG1lc3NhZ2U6IHtcblx0XHRcdFx0X2lkOiBSYW5kb20uaWQoKSxcblx0XHRcdH0sXG5cdFx0XHRyb29tSW5mbzoge1xuXHRcdFx0XHRzbXM6IHtcblx0XHRcdFx0XHRmcm9tOiBzbXMudG8sXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRpZiAodmlzaXRvcikge1xuXHRcdFx0Y29uc3Qgcm9vbXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT3BlbkJ5VmlzaXRvclRva2VuKHZpc2l0b3IudG9rZW4pLmZldGNoKCk7XG5cblx0XHRcdGlmIChyb29tcyAmJiByb29tcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UucmlkID0gcm9vbXNbMF0uX2lkO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VuZE1lc3NhZ2UubWVzc2FnZS5yaWQgPSBSYW5kb20uaWQoKTtcblx0XHRcdH1cblx0XHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UudG9rZW4gPSB2aXNpdG9yLnRva2VuO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzZW5kTWVzc2FnZS5tZXNzYWdlLnJpZCA9IFJhbmRvbS5pZCgpO1xuXHRcdFx0c2VuZE1lc3NhZ2UubWVzc2FnZS50b2tlbiA9IFJhbmRvbS5pZCgpO1xuXG5cdFx0XHRjb25zdCB2aXNpdG9ySWQgPSBSb2NrZXRDaGF0LkxpdmVjaGF0LnJlZ2lzdGVyR3Vlc3Qoe1xuXHRcdFx0XHR1c2VybmFtZTogc21zLmZyb20ucmVwbGFjZSgvW14wLTldL2csICcnKSxcblx0XHRcdFx0dG9rZW46IHNlbmRNZXNzYWdlLm1lc3NhZ2UudG9rZW4sXG5cdFx0XHRcdHBob25lOiB7XG5cdFx0XHRcdFx0bnVtYmVyOiBzbXMuZnJvbSxcblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXG5cdFx0XHR2aXNpdG9yID0gTGl2ZWNoYXRWaXNpdG9ycy5maW5kT25lQnlJZCh2aXNpdG9ySWQpO1xuXHRcdH1cblxuXHRcdHNlbmRNZXNzYWdlLm1lc3NhZ2UubXNnID0gc21zLmJvZHk7XG5cdFx0c2VuZE1lc3NhZ2UuZ3Vlc3QgPSB2aXNpdG9yO1xuXG5cdFx0c2VuZE1lc3NhZ2UubWVzc2FnZS5hdHRhY2htZW50cyA9IHNtcy5tZWRpYS5tYXAoKGN1cnIpID0+IHtcblx0XHRcdGNvbnN0IGF0dGFjaG1lbnQgPSB7XG5cdFx0XHRcdG1lc3NhZ2VfbGluazogY3Vyci51cmwsXG5cdFx0XHR9O1xuXG5cdFx0XHRjb25zdCB7IGNvbnRlbnRUeXBlIH0gPSBjdXJyO1xuXHRcdFx0c3dpdGNoIChjb250ZW50VHlwZS5zdWJzdHIoMCwgY29udGVudFR5cGUuaW5kZXhPZignLycpKSkge1xuXHRcdFx0XHRjYXNlICdpbWFnZSc6XG5cdFx0XHRcdFx0YXR0YWNobWVudC5pbWFnZV91cmwgPSBjdXJyLnVybDtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAndmlkZW8nOlxuXHRcdFx0XHRcdGF0dGFjaG1lbnQudmlkZW9fdXJsID0gY3Vyci51cmw7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ2F1ZGlvJzpcblx0XHRcdFx0XHRhdHRhY2htZW50LmF1ZGlvX3VybCA9IGN1cnIudXJsO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gYXR0YWNobWVudDtcblx0XHR9KTtcblxuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCBtZXNzYWdlID0gU01TU2VydmljZS5yZXNwb25zZS5jYWxsKHRoaXMsIFJvY2tldENoYXQuTGl2ZWNoYXQuc2VuZE1lc3NhZ2Uoc2VuZE1lc3NhZ2UpKTtcblxuXHRcdFx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRcdFx0aWYgKHNtcy5leHRyYSkge1xuXHRcdFx0XHRcdGlmIChzbXMuZXh0cmEuZnJvbUNvdW50cnkpIHtcblx0XHRcdFx0XHRcdE1ldGVvci5jYWxsKCdsaXZlY2hhdDpzZXRDdXN0b21GaWVsZCcsIHNlbmRNZXNzYWdlLm1lc3NhZ2UudG9rZW4sICdjb3VudHJ5Jywgc21zLmV4dHJhLmZyb21Db3VudHJ5KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHNtcy5leHRyYS5mcm9tU3RhdGUpIHtcblx0XHRcdFx0XHRcdE1ldGVvci5jYWxsKCdsaXZlY2hhdDpzZXRDdXN0b21GaWVsZCcsIHNlbmRNZXNzYWdlLm1lc3NhZ2UudG9rZW4sICdzdGF0ZScsIHNtcy5leHRyYS5mcm9tU3RhdGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoc21zLmV4dHJhLmZyb21DaXR5KSB7XG5cdFx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnbGl2ZWNoYXQ6c2V0Q3VzdG9tRmllbGQnLCBzZW5kTWVzc2FnZS5tZXNzYWdlLnRva2VuLCAnY2l0eScsIHNtcy5leHRyYS5mcm9tQ2l0eSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFNNU1NlcnZpY2UuZXJyb3IuY2FsbCh0aGlzLCBlKTtcblx0XHR9XG5cdH0sXG59KTtcbiIsImltcG9ydCBCdXNib3kgZnJvbSAnYnVzYm95JztcbmltcG9ydCBmaWxlc2l6ZSBmcm9tICdmaWxlc2l6ZSc7XG5pbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICcuLi8uLi8uLi9zZXJ2ZXIvbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xubGV0IG1heEZpbGVTaXplO1xuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfTWF4RmlsZVNpemUnLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdHRyeSB7XG5cdFx0bWF4RmlsZVNpemUgPSBwYXJzZUludCh2YWx1ZSk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRtYXhGaWxlU2l6ZSA9IFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmRPbmVCeUlkKCdGaWxlVXBsb2FkX01heEZpbGVTaXplJykucGFja2FnZVZhbHVlO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVjaGF0L3VwbG9hZC86cmlkJywge1xuXHRwb3N0KCkge1xuXHRcdGlmICghdGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtdmlzaXRvci10b2tlbiddKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdmlzaXRvclRva2VuID0gdGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ3gtdmlzaXRvci10b2tlbiddO1xuXHRcdGNvbnN0IHZpc2l0b3IgPSBMaXZlY2hhdFZpc2l0b3JzLmdldFZpc2l0b3JCeVRva2VuKHZpc2l0b3JUb2tlbik7XG5cblx0XHRpZiAoIXZpc2l0b3IpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZU9wZW5CeVJvb21JZEFuZFZpc2l0b3JUb2tlbih0aGlzLnVybFBhcmFtcy5yaWQsIHZpc2l0b3JUb2tlbik7XG5cdFx0aWYgKCFyb29tKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgYnVzYm95ID0gbmV3IEJ1c2JveSh7IGhlYWRlcnM6IHRoaXMucmVxdWVzdC5oZWFkZXJzIH0pO1xuXHRcdGNvbnN0IGZpbGVzID0gW107XG5cdFx0Y29uc3QgZmllbGRzID0ge307XG5cblx0XHRNZXRlb3Iud3JhcEFzeW5jKChjYWxsYmFjaykgPT4ge1xuXHRcdFx0YnVzYm95Lm9uKCdmaWxlJywgKGZpZWxkbmFtZSwgZmlsZSwgZmlsZW5hbWUsIGVuY29kaW5nLCBtaW1ldHlwZSkgPT4ge1xuXHRcdFx0XHRpZiAoZmllbGRuYW1lICE9PSAnZmlsZScpIHtcblx0XHRcdFx0XHRyZXR1cm4gZmlsZXMucHVzaChuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLWZpZWxkJykpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3QgZmlsZURhdGUgPSBbXTtcblx0XHRcdFx0ZmlsZS5vbignZGF0YScsIChkYXRhKSA9PiBmaWxlRGF0ZS5wdXNoKGRhdGEpKTtcblxuXHRcdFx0XHRmaWxlLm9uKCdlbmQnLCAoKSA9PiB7XG5cdFx0XHRcdFx0ZmlsZXMucHVzaCh7IGZpZWxkbmFtZSwgZmlsZSwgZmlsZW5hbWUsIGVuY29kaW5nLCBtaW1ldHlwZSwgZmlsZUJ1ZmZlcjogQnVmZmVyLmNvbmNhdChmaWxlRGF0ZSkgfSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cblx0XHRcdGJ1c2JveS5vbignZmllbGQnLCAoZmllbGRuYW1lLCB2YWx1ZSkgPT4gZmllbGRzW2ZpZWxkbmFtZV0gPSB2YWx1ZSk7XG5cblx0XHRcdGJ1c2JveS5vbignZmluaXNoJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiBjYWxsYmFjaygpKSk7XG5cblx0XHRcdHRoaXMucmVxdWVzdC5waXBlKGJ1c2JveSk7XG5cdFx0fSkoKTtcblxuXHRcdGlmIChmaWxlcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdGaWxlIHJlcXVpcmVkJyk7XG5cdFx0fVxuXG5cdFx0aWYgKGZpbGVzLmxlbmd0aCA+IDEpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdKdXN0IDEgZmlsZSBpcyBhbGxvd2VkJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmlsZSA9IGZpbGVzWzBdO1xuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LmZpbGVVcGxvYWRJc1ZhbGlkQ29udGVudFR5cGUoZmlsZS5taW1ldHlwZSkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKHtcblx0XHRcdFx0cmVhc29uOiAnZXJyb3ItdHlwZS1ub3QtYWxsb3dlZCcsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvLyAtMSBtYXhGaWxlU2l6ZSBtZWFucyB0aGVyZSBpcyBubyBsaW1pdFxuXHRcdGlmIChtYXhGaWxlU2l6ZSA+IC0xICYmIGZpbGUuZmlsZUJ1ZmZlci5sZW5ndGggPiBtYXhGaWxlU2l6ZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoe1xuXHRcdFx0XHRyZWFzb246ICdlcnJvci1zaXplLW5vdC1hbGxvd2VkJyxcblx0XHRcdFx0c2l6ZUFsbG93ZWQ6IGZpbGVzaXplKG1heEZpbGVTaXplKSxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbGVTdG9yZSA9IEZpbGVVcGxvYWQuZ2V0U3RvcmUoJ1VwbG9hZHMnKTtcblxuXHRcdGNvbnN0IGRldGFpbHMgPSB7XG5cdFx0XHRuYW1lOiBmaWxlLmZpbGVuYW1lLFxuXHRcdFx0c2l6ZTogZmlsZS5maWxlQnVmZmVyLmxlbmd0aCxcblx0XHRcdHR5cGU6IGZpbGUubWltZXR5cGUsXG5cdFx0XHRyaWQ6IHRoaXMudXJsUGFyYW1zLnJpZCxcblx0XHRcdHZpc2l0b3JUb2tlbixcblx0XHR9O1xuXG5cdFx0Y29uc3QgdXBsb2FkZWRGaWxlID0gTWV0ZW9yLndyYXBBc3luYyhmaWxlU3RvcmUuaW5zZXJ0LmJpbmQoZmlsZVN0b3JlKSkoZGV0YWlscywgZmlsZS5maWxlQnVmZmVyKTtcblxuXHRcdHVwbG9hZGVkRmlsZS5kZXNjcmlwdGlvbiA9IGZpZWxkcy5kZXNjcmlwdGlvbjtcblxuXHRcdGRlbGV0ZSBmaWVsZHMuZGVzY3JpcHRpb247XG5cdFx0Um9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcyhNZXRlb3IuY2FsbCgnc2VuZEZpbGVMaXZlY2hhdE1lc3NhZ2UnLCB0aGlzLnVybFBhcmFtcy5yaWQsIHZpc2l0b3JUb2tlbiwgdXBsb2FkZWRGaWxlLCBmaWVsZHMpKTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC91c2Vycy86dHlwZScsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0Y2hlY2sodGhpcy51cmxQYXJhbXMsIHtcblx0XHRcdFx0dHlwZTogU3RyaW5nLFxuXHRcdFx0fSk7XG5cblx0XHRcdGxldCByb2xlO1xuXHRcdFx0aWYgKHRoaXMudXJsUGFyYW1zLnR5cGUgPT09ICdhZ2VudCcpIHtcblx0XHRcdFx0cm9sZSA9ICdsaXZlY2hhdC1hZ2VudCc7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMudXJsUGFyYW1zLnR5cGUgPT09ICdtYW5hZ2VyJykge1xuXHRcdFx0XHRyb2xlID0gJ2xpdmVjaGF0LW1hbmFnZXInO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgJ0ludmFsaWQgdHlwZSc7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IHVzZXJzID0gUm9ja2V0Q2hhdC5hdXRoei5nZXRVc2Vyc0luUm9sZShyb2xlKTtcblxuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0XHR1c2VyczogdXNlcnMuZmV0Y2goKS5tYXAoKHVzZXIpID0+IF8ucGljayh1c2VyLCAnX2lkJywgJ3VzZXJuYW1lJywgJ25hbWUnLCAnc3RhdHVzJywgJ3N0YXR1c0xpdmVjaGF0JykpLFxuXHRcdFx0fSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5lcnJvcik7XG5cdFx0fVxuXHR9LFxuXHRwb3N0KCkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1saXZlY2hhdC1tYW5hZ2VyJykpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS51bmF1dGhvcml6ZWQoKTtcblx0XHR9XG5cdFx0dHJ5IHtcblx0XHRcdGNoZWNrKHRoaXMudXJsUGFyYW1zLCB7XG5cdFx0XHRcdHR5cGU6IFN0cmluZyxcblx0XHRcdH0pO1xuXG5cdFx0XHRjaGVjayh0aGlzLmJvZHlQYXJhbXMsIHtcblx0XHRcdFx0dXNlcm5hbWU6IFN0cmluZyxcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAodGhpcy51cmxQYXJhbXMudHlwZSA9PT0gJ2FnZW50Jykge1xuXHRcdFx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5MaXZlY2hhdC5hZGRBZ2VudCh0aGlzLmJvZHlQYXJhbXMudXNlcm5hbWUpO1xuXHRcdFx0XHRpZiAodXNlcikge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgdXNlciB9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmICh0aGlzLnVybFBhcmFtcy50eXBlID09PSAnbWFuYWdlcicpIHtcblx0XHRcdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQuTGl2ZWNoYXQuYWRkTWFuYWdlcih0aGlzLmJvZHlQYXJhbXMudXNlcm5hbWUpO1xuXHRcdFx0XHRpZiAodXNlcikge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgdXNlciB9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgJ0ludmFsaWQgdHlwZSc7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5lcnJvcik7XG5cdFx0fVxuXHR9LFxufSk7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlY2hhdC91c2Vycy86dHlwZS86X2lkJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQoKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICd2aWV3LWxpdmVjaGF0LW1hbmFnZXInKSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnVuYXV0aG9yaXplZCgpO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRjaGVjayh0aGlzLnVybFBhcmFtcywge1xuXHRcdFx0XHR0eXBlOiBTdHJpbmcsXG5cdFx0XHRcdF9pZDogU3RyaW5nLFxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh0aGlzLnVybFBhcmFtcy5faWQpO1xuXG5cdFx0XHRpZiAoIXVzZXIpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ1VzZXIgbm90IGZvdW5kJyk7XG5cdFx0XHR9XG5cblx0XHRcdGxldCByb2xlO1xuXG5cdFx0XHRpZiAodGhpcy51cmxQYXJhbXMudHlwZSA9PT0gJ2FnZW50Jykge1xuXHRcdFx0XHRyb2xlID0gJ2xpdmVjaGF0LWFnZW50Jztcblx0XHRcdH0gZWxzZSBpZiAodGhpcy51cmxQYXJhbXMudHlwZSA9PT0gJ21hbmFnZXInKSB7XG5cdFx0XHRcdHJvbGUgPSAnbGl2ZWNoYXQtbWFuYWdlcic7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyAnSW52YWxpZCB0eXBlJztcblx0XHRcdH1cblxuXHRcdFx0aWYgKHVzZXIucm9sZXMuaW5kZXhPZihyb2xlKSAhPT0gLTEpIHtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0XHRcdHVzZXI6IF8ucGljayh1c2VyLCAnX2lkJywgJ3VzZXJuYW1lJyksXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRcdHVzZXI6IG51bGwsXG5cdFx0XHR9KTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlLmVycm9yKTtcblx0XHR9XG5cdH0sXG5cdGRlbGV0ZSgpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ3ZpZXctbGl2ZWNoYXQtbWFuYWdlcicpKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEudW5hdXRob3JpemVkKCk7XG5cdFx0fVxuXG5cdFx0dHJ5IHtcblx0XHRcdGNoZWNrKHRoaXMudXJsUGFyYW1zLCB7XG5cdFx0XHRcdHR5cGU6IFN0cmluZyxcblx0XHRcdFx0X2lkOiBTdHJpbmcsXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHRoaXMudXJsUGFyYW1zLl9pZCk7XG5cblx0XHRcdGlmICghdXNlcikge1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy51cmxQYXJhbXMudHlwZSA9PT0gJ2FnZW50Jykge1xuXHRcdFx0XHRpZiAoUm9ja2V0Q2hhdC5MaXZlY2hhdC5yZW1vdmVBZ2VudCh1c2VyLnVzZXJuYW1lKSkge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAodGhpcy51cmxQYXJhbXMudHlwZSA9PT0gJ21hbmFnZXInKSB7XG5cdFx0XHRcdGlmIChSb2NrZXRDaGF0LkxpdmVjaGF0LnJlbW92ZU1hbmFnZXIodXNlci51c2VybmFtZSkpIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyAnSW52YWxpZCB0eXBlJztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlLmVycm9yKTtcblx0XHR9XG5cdH0sXG59KTtcbiJdfQ==
