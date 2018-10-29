(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var ECMAScript = Package.ecmascript.ECMAScript;
var Babel = Package['babel-compiler'].Babel;
var BabelCompiler = Package['babel-compiler'].BabelCompiler;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Logger = Package['rocketchat:logger'].Logger;
var SystemLogger = Package['rocketchat:logger'].SystemLogger;
var LoggerManager = Package['rocketchat:logger'].LoggerManager;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var logger, integration, message;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:integrations":{"lib":{"rocketchat.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/lib/rocketchat.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
RocketChat.integrations = {
  outgoingEvents: {
    sendMessage: {
      label: 'Integrations_Outgoing_Type_SendMessage',
      value: 'sendMessage',
      use: {
        channel: true,
        triggerWords: true,
        targetRoom: false
      }
    },
    fileUploaded: {
      label: 'Integrations_Outgoing_Type_FileUploaded',
      value: 'fileUploaded',
      use: {
        channel: true,
        triggerWords: false,
        targetRoom: false
      }
    },
    roomArchived: {
      label: 'Integrations_Outgoing_Type_RoomArchived',
      value: 'roomArchived',
      use: {
        channel: false,
        triggerWords: false,
        targetRoom: false
      }
    },
    roomCreated: {
      label: 'Integrations_Outgoing_Type_RoomCreated',
      value: 'roomCreated',
      use: {
        channel: false,
        triggerWords: false,
        targetRoom: false
      }
    },
    roomJoined: {
      label: 'Integrations_Outgoing_Type_RoomJoined',
      value: 'roomJoined',
      use: {
        channel: true,
        triggerWords: false,
        targetRoom: false
      }
    },
    roomLeft: {
      label: 'Integrations_Outgoing_Type_RoomLeft',
      value: 'roomLeft',
      use: {
        channel: true,
        triggerWords: false,
        targetRoom: false
      }
    },
    userCreated: {
      label: 'Integrations_Outgoing_Type_UserCreated',
      value: 'userCreated',
      use: {
        channel: false,
        triggerWords: false,
        targetRoom: true
      }
    }
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"logger.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/logger.js                                                                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
/* globals logger:true */

/* exported logger */
logger = new Logger('Integrations', {
  sections: {
    incoming: 'Incoming WebHook',
    outgoing: 'Outgoing WebHook'
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"validation.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/lib/validation.js                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
const scopedChannels = ['all_public_channels', 'all_private_groups', 'all_direct_messages'];
const validChannelChars = ['@', '#'];

function _verifyRequiredFields(integration) {
  if (!integration.event || !Match.test(integration.event, String) || integration.event.trim() === '' || !RocketChat.integrations.outgoingEvents[integration.event]) {
    throw new Meteor.Error('error-invalid-event-type', 'Invalid event type', {
      function: 'validateOutgoing._verifyRequiredFields'
    });
  }

  if (!integration.username || !Match.test(integration.username, String) || integration.username.trim() === '') {
    throw new Meteor.Error('error-invalid-username', 'Invalid username', {
      function: 'validateOutgoing._verifyRequiredFields'
    });
  }

  if (RocketChat.integrations.outgoingEvents[integration.event].use.targetRoom && !integration.targetRoom) {
    throw new Meteor.Error('error-invalid-targetRoom', 'Invalid Target Room', {
      function: 'validateOutgoing._verifyRequiredFields'
    });
  }

  if (!Match.test(integration.urls, [String])) {
    throw new Meteor.Error('error-invalid-urls', 'Invalid URLs', {
      function: 'validateOutgoing._verifyRequiredFields'
    });
  }

  for (const [index, url] of integration.urls.entries()) {
    if (url.trim() === '') {
      delete integration.urls[index];
    }
  }

  integration.urls = _.without(integration.urls, [undefined]);

  if (integration.urls.length === 0) {
    throw new Meteor.Error('error-invalid-urls', 'Invalid URLs', {
      function: 'validateOutgoing._verifyRequiredFields'
    });
  }
}

function _verifyUserHasPermissionForChannels(integration, userId, channels) {
  for (let channel of channels) {
    if (scopedChannels.includes(channel)) {
      if (channel === 'all_public_channels') {// No special permissions needed to add integration to public channels
      } else if (!RocketChat.authz.hasPermission(userId, 'manage-integrations')) {
        throw new Meteor.Error('error-invalid-channel', 'Invalid Channel', {
          function: 'validateOutgoing._verifyUserHasPermissionForChannels'
        });
      }
    } else {
      let record;
      const channelType = channel[0];
      channel = channel.substr(1);

      switch (channelType) {
        case '#':
          record = RocketChat.models.Rooms.findOne({
            $or: [{
              _id: channel
            }, {
              name: channel
            }]
          });
          break;

        case '@':
          record = RocketChat.models.Users.findOne({
            $or: [{
              _id: channel
            }, {
              username: channel
            }]
          });
          break;
      }

      if (!record) {
        throw new Meteor.Error('error-invalid-room', 'Invalid room', {
          function: 'validateOutgoing._verifyUserHasPermissionForChannels'
        });
      }

      if (!RocketChat.authz.hasAllPermission(userId, 'manage-integrations', 'manage-own-integrations') && !RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(record._id, userId, {
        fields: {
          _id: 1
        }
      })) {
        throw new Meteor.Error('error-invalid-channel', 'Invalid Channel', {
          function: 'validateOutgoing._verifyUserHasPermissionForChannels'
        });
      }
    }
  }
}

function _verifyRetryInformation(integration) {
  if (!integration.retryFailedCalls) {
    return;
  } // Don't allow negative retry counts


  integration.retryCount = integration.retryCount && parseInt(integration.retryCount) > 0 ? parseInt(integration.retryCount) : 4;
  integration.retryDelay = !integration.retryDelay || !integration.retryDelay.trim() ? 'powers-of-ten' : integration.retryDelay.toLowerCase();
}

RocketChat.integrations.validateOutgoing = function _validateOutgoing(integration, userId) {
  if (integration.channel && Match.test(integration.channel, String) && integration.channel.trim() === '') {
    delete integration.channel;
  } // Moved to it's own function to statisfy the complexity rule


  _verifyRequiredFields(integration);

  let channels = [];

  if (RocketChat.integrations.outgoingEvents[integration.event].use.channel) {
    if (!Match.test(integration.channel, String)) {
      throw new Meteor.Error('error-invalid-channel', 'Invalid Channel', {
        function: 'validateOutgoing'
      });
    } else {
      channels = _.map(integration.channel.split(','), channel => s.trim(channel));

      for (const channel of channels) {
        if (!validChannelChars.includes(channel[0]) && !scopedChannels.includes(channel.toLowerCase())) {
          throw new Meteor.Error('error-invalid-channel-start-with-chars', 'Invalid channel. Start with @ or #', {
            function: 'validateOutgoing'
          });
        }
      }
    }
  } else if (!RocketChat.authz.hasPermission(userId, 'manage-integrations')) {
    throw new Meteor.Error('error-invalid-permissions', 'Invalid permission for required Integration creation.', {
      function: 'validateOutgoing'
    });
  }

  if (RocketChat.integrations.outgoingEvents[integration.event].use.triggerWords && integration.triggerWords) {
    if (!Match.test(integration.triggerWords, [String])) {
      throw new Meteor.Error('error-invalid-triggerWords', 'Invalid triggerWords', {
        function: 'validateOutgoing'
      });
    }

    integration.triggerWords.forEach((word, index) => {
      if (!word || word.trim() === '') {
        delete integration.triggerWords[index];
      }
    });
    integration.triggerWords = _.without(integration.triggerWords, [undefined]);
  } else {
    delete integration.triggerWords;
  }

  if (integration.scriptEnabled === true && integration.script && integration.script.trim() !== '') {
    try {
      const babelOptions = Object.assign(Babel.getDefaultOptions({
        runtime: false
      }), {
        compact: true,
        minified: true,
        comments: false
      });
      integration.scriptCompiled = Babel.compile(integration.script, babelOptions).code;
      integration.scriptError = undefined;
    } catch (e) {
      integration.scriptCompiled = undefined;
      integration.scriptError = _.pick(e, 'name', 'message', 'stack');
    }
  }

  if (typeof integration.runOnEdits !== 'undefined') {
    // Verify this value is only true/false
    integration.runOnEdits = integration.runOnEdits === true;
  }

  _verifyUserHasPermissionForChannels(integration, userId, channels);

  _verifyRetryInformation(integration);

  const user = RocketChat.models.Users.findOne({
    username: integration.username
  });

  if (!user) {
    throw new Meteor.Error('error-invalid-user', 'Invalid user (did you delete the `rocket.cat` user?)', {
      function: 'validateOutgoing'
    });
  }

  integration.type = 'webhook-outgoing';
  integration.userId = user._id;
  integration.channel = channels;
  return integration;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"triggerHandler.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/lib/triggerHandler.js                                                      //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

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
let vm;
module.watch(require("vm"), {
  default(v) {
    vm = v;
  }

}, 3);
let Fiber;
module.watch(require("fibers"), {
  default(v) {
    Fiber = v;
  }

}, 4);
let Future;
module.watch(require("fibers/future"), {
  default(v) {
    Future = v;
  }

}, 5);
RocketChat.integrations.triggerHandler = new class RocketChatIntegrationHandler {
  constructor() {
    this.vm = vm;
    this.successResults = [200, 201, 202];
    this.compiledScripts = {};
    this.triggers = {};
    RocketChat.models.Integrations.find({
      type: 'webhook-outgoing'
    }).observe({
      added: record => {
        this.addIntegration(record);
      },
      changed: record => {
        this.removeIntegration(record);
        this.addIntegration(record);
      },
      removed: record => {
        this.removeIntegration(record);
      }
    });
  }

  addIntegration(record) {
    logger.outgoing.debug(`Adding the integration ${record.name} of the event ${record.event}!`);
    let channels;

    if (record.event && !RocketChat.integrations.outgoingEvents[record.event].use.channel) {
      logger.outgoing.debug('The integration doesnt rely on channels.'); // We don't use any channels, so it's special ;)

      channels = ['__any'];
    } else if (_.isEmpty(record.channel)) {
      logger.outgoing.debug('The integration had an empty channel property, so it is going on all the public channels.');
      channels = ['all_public_channels'];
    } else {
      logger.outgoing.debug('The integration is going on these channels:', record.channel);
      channels = [].concat(record.channel);
    }

    for (const channel of channels) {
      if (!this.triggers[channel]) {
        this.triggers[channel] = {};
      }

      this.triggers[channel][record._id] = record;
    }
  }

  removeIntegration(record) {
    for (const trigger of Object.values(this.triggers)) {
      delete trigger[record._id];
    }
  }

  isTriggerEnabled(trigger) {
    for (const trig of Object.values(this.triggers)) {
      if (trig[trigger._id]) {
        return trig[trigger._id].enabled;
      }
    }

    return false;
  }

  updateHistory({
    historyId,
    step,
    integration,
    event,
    data,
    triggerWord,
    ranPrepareScript,
    prepareSentMessage,
    processSentMessage,
    resultMessage,
    finished,
    url,
    httpCallData,
    httpError,
    httpResult,
    error,
    errorStack
  }) {
    const history = {
      type: 'outgoing-webhook',
      step
    }; // Usually is only added on initial insert

    if (integration) {
      history.integration = integration;
    } // Usually is only added on initial insert


    if (event) {
      history.event = event;
    }

    if (data) {
      history.data = (0, _objectSpread2.default)({}, data);

      if (data.user) {
        history.data.user = _.omit(data.user, ['services']);
      }

      if (data.room) {
        history.data.room = data.room;
      }
    }

    if (triggerWord) {
      history.triggerWord = triggerWord;
    }

    if (typeof ranPrepareScript !== 'undefined') {
      history.ranPrepareScript = ranPrepareScript;
    }

    if (prepareSentMessage) {
      history.prepareSentMessage = prepareSentMessage;
    }

    if (processSentMessage) {
      history.processSentMessage = processSentMessage;
    }

    if (resultMessage) {
      history.resultMessage = resultMessage;
    }

    if (typeof finished !== 'undefined') {
      history.finished = finished;
    }

    if (url) {
      history.url = url;
    }

    if (typeof httpCallData !== 'undefined') {
      history.httpCallData = httpCallData;
    }

    if (httpError) {
      history.httpError = httpError;
    }

    if (typeof httpResult !== 'undefined') {
      history.httpResult = JSON.stringify(httpResult, null, 2);
    }

    if (typeof error !== 'undefined') {
      history.error = error;
    }

    if (typeof errorStack !== 'undefined') {
      history.errorStack = errorStack;
    }

    if (historyId) {
      RocketChat.models.IntegrationHistory.update({
        _id: historyId
      }, {
        $set: history
      });
      return historyId;
    } else {
      history._createdAt = new Date();
      return RocketChat.models.IntegrationHistory.insert(Object.assign({
        _id: Random.id()
      }, history));
    }
  } // Trigger is the trigger, nameOrId is a string which is used to try and find a room, room is a room, message is a message, and data contains "user_name" if trigger.impersonateUser is truthful.


  sendMessage({
    trigger,
    nameOrId = '',
    room,
    message,
    data
  }) {
    let user; // Try to find the user who we are impersonating

    if (trigger.impersonateUser) {
      user = RocketChat.models.Users.findOneByUsername(data.user_name);
    } // If they don't exist (aka the trigger didn't contain a user) then we set the user based upon the
    // configured username for the integration since this is required at all times.


    if (!user) {
      user = RocketChat.models.Users.findOneByUsername(trigger.username);
    }

    let tmpRoom;

    if (nameOrId || trigger.targetRoom || message.channel) {
      tmpRoom = RocketChat.getRoomByNameOrIdWithOptionToJoin({
        currentUserId: user._id,
        nameOrId: nameOrId || message.channel || trigger.targetRoom,
        errorOnEmpty: false
      }) || room;
    } else {
      tmpRoom = room;
    } // If no room could be found, we won't be sending any messages but we'll warn in the logs


    if (!tmpRoom) {
      logger.outgoing.warn(`The Integration "${trigger.name}" doesn't have a room configured nor did it provide a room to send the message to.`);
      return;
    }

    logger.outgoing.debug(`Found a room for ${trigger.name} which is: ${tmpRoom.name} with a type of ${tmpRoom.t}`);
    message.bot = {
      i: trigger._id
    };
    const defaultValues = {
      alias: trigger.alias,
      avatar: trigger.avatar,
      emoji: trigger.emoji
    };

    if (tmpRoom.t === 'd') {
      message.channel = `@${tmpRoom._id}`;
    } else {
      message.channel = `#${tmpRoom._id}`;
    }

    message = processWebhookMessage(message, user, defaultValues);
    return message;
  }

  buildSandbox(store = {}) {
    const sandbox = {
      scriptTimeout(reject) {
        return setTimeout(() => reject('timed out'), 3000);
      },

      _,
      s,
      console,
      moment,
      Fiber,
      Promise,
      Store: {
        set: (key, val) => store[key] = val,
        get: key => store[key]
      },
      HTTP: (method, url, options) => {
        try {
          return {
            result: HTTP.call(method, url, options)
          };
        } catch (error) {
          return {
            error
          };
        }
      }
    };
    Object.keys(RocketChat.models).filter(k => !k.startsWith('_')).forEach(k => {
      sandbox[k] = RocketChat.models[k];
    });
    return {
      store,
      sandbox
    };
  }

  getIntegrationScript(integration) {
    const compiledScript = this.compiledScripts[integration._id];

    if (compiledScript && +compiledScript._updatedAt === +integration._updatedAt) {
      return compiledScript.script;
    }

    const script = integration.scriptCompiled;
    const {
      store,
      sandbox
    } = this.buildSandbox();
    let vmScript;

    try {
      logger.outgoing.info('Will evaluate script of Trigger', integration.name);
      logger.outgoing.debug(script);
      vmScript = this.vm.createScript(script, 'script.js');
      vmScript.runInNewContext(sandbox);

      if (sandbox.Script) {
        this.compiledScripts[integration._id] = {
          script: new sandbox.Script(),
          store,
          _updatedAt: integration._updatedAt
        };
        return this.compiledScripts[integration._id].script;
      }
    } catch (e) {
      logger.outgoing.error(`Error evaluating Script in Trigger ${integration.name}:`);
      logger.outgoing.error(script.replace(/^/gm, '  '));
      logger.outgoing.error('Stack Trace:');
      logger.outgoing.error(e.stack.replace(/^/gm, '  '));
      throw new Meteor.Error('error-evaluating-script');
    }

    if (!sandbox.Script) {
      logger.outgoing.error(`Class "Script" not in Trigger ${integration.name}:`);
      throw new Meteor.Error('class-script-not-found');
    }
  }

  hasScriptAndMethod(integration, method) {
    if (integration.scriptEnabled !== true || !integration.scriptCompiled || integration.scriptCompiled.trim() === '') {
      return false;
    }

    let script;

    try {
      script = this.getIntegrationScript(integration);
    } catch (e) {
      return false;
    }

    return typeof script[method] !== 'undefined';
  }

  executeScript(integration, method, params, historyId) {
    let script;

    try {
      script = this.getIntegrationScript(integration);
    } catch (e) {
      this.updateHistory({
        historyId,
        step: 'execute-script-getting-script',
        error: true,
        errorStack: e
      });
      return;
    }

    if (!script[method]) {
      logger.outgoing.error(`Method "${method}" no found in the Integration "${integration.name}"`);
      this.updateHistory({
        historyId,
        step: `execute-script-no-method-${method}`
      });
      return;
    }

    try {
      const {
        sandbox
      } = this.buildSandbox(this.compiledScripts[integration._id].store);
      sandbox.script = script;
      sandbox.method = method;
      sandbox.params = params;
      this.updateHistory({
        historyId,
        step: `execute-script-before-running-${method}`
      });
      const result = Future.fromPromise(this.vm.runInNewContext(`
				new Promise((resolve, reject) => {
					Fiber(() => {
						scriptTimeout(reject);
						try {
							resolve(script[method](params))
						} catch(e) {
							reject(e);
						}
					}).run();
				}).catch((error) => { throw new Error(error); });
			`, sandbox, {
        timeout: 3000
      })).wait();
      logger.outgoing.debug(`Script method "${method}" result of the Integration "${integration.name}" is:`);
      logger.outgoing.debug(result);
      return result;
    } catch (e) {
      this.updateHistory({
        historyId,
        step: `execute-script-error-running-${method}`,
        error: true,
        errorStack: e.stack.replace(/^/gm, '  ')
      });
      logger.outgoing.error(`Error running Script in the Integration ${integration.name}:`);
      logger.outgoing.debug(integration.scriptCompiled.replace(/^/gm, '  ')); // Only output the compiled script if debugging is enabled, so the logs don't get spammed.

      logger.outgoing.error('Stack:');
      logger.outgoing.error(e.stack.replace(/^/gm, '  '));
      return;
    }
  }

  eventNameArgumentsToObject(...args) {
    const argObject = {
      event: args[0]
    };

    switch (argObject.event) {
      case 'sendMessage':
        if (args.length >= 3) {
          argObject.message = args[1];
          argObject.room = args[2];
        }

        break;

      case 'fileUploaded':
        if (args.length >= 2) {
          const arghhh = args[1];
          argObject.user = arghhh.user;
          argObject.room = arghhh.room;
          argObject.message = arghhh.message;
        }

        break;

      case 'roomArchived':
        if (args.length >= 3) {
          argObject.room = args[1];
          argObject.user = args[2];
        }

        break;

      case 'roomCreated':
        if (args.length >= 3) {
          argObject.owner = args[1];
          argObject.room = args[2];
        }

        break;

      case 'roomJoined':
      case 'roomLeft':
        if (args.length >= 3) {
          argObject.user = args[1];
          argObject.room = args[2];
        }

        break;

      case 'userCreated':
        if (args.length >= 2) {
          argObject.user = args[1];
        }

        break;

      default:
        logger.outgoing.warn(`An Unhandled Trigger Event was called: ${argObject.event}`);
        argObject.event = undefined;
        break;
    }

    logger.outgoing.debug(`Got the event arguments for the event: ${argObject.event}`, argObject);
    return argObject;
  }

  mapEventArgsToData(data, {
    event,
    message,
    room,
    owner,
    user
  }) {
    switch (event) {
      case 'sendMessage':
        data.channel_id = room._id;
        data.channel_name = room.name;
        data.message_id = message._id;
        data.timestamp = message.ts;
        data.user_id = message.u._id;
        data.user_name = message.u.username;
        data.text = message.msg;

        if (message.alias) {
          data.alias = message.alias;
        }

        if (message.bot) {
          data.bot = message.bot;
        }

        if (message.editedAt) {
          data.isEdited = true;
        }

        break;

      case 'fileUploaded':
        data.channel_id = room._id;
        data.channel_name = room.name;
        data.message_id = message._id;
        data.timestamp = message.ts;
        data.user_id = message.u._id;
        data.user_name = message.u.username;
        data.text = message.msg;
        data.user = user;
        data.room = room;
        data.message = message;

        if (message.alias) {
          data.alias = message.alias;
        }

        if (message.bot) {
          data.bot = message.bot;
        }

        break;

      case 'roomCreated':
        data.channel_id = room._id;
        data.channel_name = room.name;
        data.timestamp = room.ts;
        data.user_id = owner._id;
        data.user_name = owner.username;
        data.owner = owner;
        data.room = room;
        break;

      case 'roomArchived':
      case 'roomJoined':
      case 'roomLeft':
        data.timestamp = new Date();
        data.channel_id = room._id;
        data.channel_name = room.name;
        data.user_id = user._id;
        data.user_name = user.username;
        data.user = user;
        data.room = room;

        if (user.type === 'bot') {
          data.bot = true;
        }

        break;

      case 'userCreated':
        data.timestamp = user.createdAt;
        data.user_id = user._id;
        data.user_name = user.username;
        data.user = user;

        if (user.type === 'bot') {
          data.bot = true;
        }

        break;

      default:
        break;
    }
  }

  executeTriggers(...args) {
    logger.outgoing.debug('Execute Trigger:', args[0]);
    const argObject = this.eventNameArgumentsToObject(...args);
    const {
      event,
      message,
      room
    } = argObject; // Each type of event should have an event and a room attached, otherwise we
    // wouldn't know how to handle the trigger nor would we have anywhere to send the
    // result of the integration

    if (!event) {
      return;
    }

    const triggersToExecute = [];
    logger.outgoing.debug('Starting search for triggers for the room:', room ? room._id : '__any');

    if (room) {
      switch (room.t) {
        case 'd':
          const id = room._id.replace(message.u._id, '');

          const username = _.without(room.usernames, message.u.username)[0];

          if (this.triggers[`@${id}`]) {
            for (const trigger of Object.values(this.triggers[`@${id}`])) {
              triggersToExecute.push(trigger);
            }
          }

          if (this.triggers.all_direct_messages) {
            for (const trigger of Object.values(this.triggers.all_direct_messages)) {
              triggersToExecute.push(trigger);
            }
          }

          if (id !== username && this.triggers[`@${username}`]) {
            for (const trigger of Object.values(this.triggers[`@${username}`])) {
              triggersToExecute.push(trigger);
            }
          }

          break;

        case 'c':
          if (this.triggers.all_public_channels) {
            for (const trigger of Object.values(this.triggers.all_public_channels)) {
              triggersToExecute.push(trigger);
            }
          }

          if (this.triggers[`#${room._id}`]) {
            for (const trigger of Object.values(this.triggers[`#${room._id}`])) {
              triggersToExecute.push(trigger);
            }
          }

          if (room._id !== room.name && this.triggers[`#${room.name}`]) {
            for (const trigger of Object.values(this.triggers[`#${room.name}`])) {
              triggersToExecute.push(trigger);
            }
          }

          break;

        default:
          if (this.triggers.all_private_groups) {
            for (const trigger of Object.values(this.triggers.all_private_groups)) {
              triggersToExecute.push(trigger);
            }
          }

          if (this.triggers[`#${room._id}`]) {
            for (const trigger of Object.values(this.triggers[`#${room._id}`])) {
              triggersToExecute.push(trigger);
            }
          }

          if (room._id !== room.name && this.triggers[`#${room.name}`]) {
            for (const trigger of Object.values(this.triggers[`#${room.name}`])) {
              triggersToExecute.push(trigger);
            }
          }

          break;
      }
    }

    if (this.triggers.__any) {
      // For outgoing integration which don't rely on rooms.
      for (const trigger of Object.values(this.triggers.__any)) {
        triggersToExecute.push(trigger);
      }
    }

    logger.outgoing.debug(`Found ${triggersToExecute.length} to iterate over and see if the match the event.`);

    for (const triggerToExecute of triggersToExecute) {
      logger.outgoing.debug(`Is "${triggerToExecute.name}" enabled, ${triggerToExecute.enabled}, and what is the event? ${triggerToExecute.event}`);

      if (triggerToExecute.enabled === true && triggerToExecute.event === event) {
        this.executeTrigger(triggerToExecute, argObject);
      }
    }
  }

  executeTrigger(trigger, argObject) {
    for (const url of trigger.urls) {
      this.executeTriggerUrl(url, trigger, argObject, 0);
    }
  }

  executeTriggerUrl(url, trigger, {
    event,
    message,
    room,
    owner,
    user
  }, theHistoryId, tries = 0) {
    if (!this.isTriggerEnabled(trigger)) {
      logger.outgoing.warn(`The trigger "${trigger.name}" is no longer enabled, stopping execution of it at try: ${tries}`);
      return;
    }

    logger.outgoing.debug(`Starting to execute trigger: ${trigger.name} (${trigger._id})`);
    let word; // Not all triggers/events support triggerWords

    if (RocketChat.integrations.outgoingEvents[event].use.triggerWords) {
      if (trigger.triggerWords && trigger.triggerWords.length > 0) {
        for (const triggerWord of trigger.triggerWords) {
          if (!trigger.triggerWordAnywhere && message.msg.indexOf(triggerWord) === 0) {
            word = triggerWord;
            break;
          } else if (trigger.triggerWordAnywhere && message.msg.includes(triggerWord)) {
            word = triggerWord;
            break;
          }
        } // Stop if there are triggerWords but none match


        if (!word) {
          logger.outgoing.debug(`The trigger word which "${trigger.name}" was expecting could not be found, not executing.`);
          return;
        }
      }
    }

    if (message && message.editedAt && !trigger.runOnEdits) {
      logger.outgoing.debug(`The trigger "${trigger.name}"'s run on edits is disabled and the message was edited.`);
      return;
    }

    const historyId = this.updateHistory({
      step: 'start-execute-trigger-url',
      integration: trigger,
      event
    });
    const data = {
      token: trigger.token,
      bot: false
    };

    if (word) {
      data.trigger_word = word;
    }

    this.mapEventArgsToData(data, {
      trigger,
      event,
      message,
      room,
      owner,
      user
    });
    this.updateHistory({
      historyId,
      step: 'mapped-args-to-data',
      data,
      triggerWord: word
    });
    logger.outgoing.info(`Will be executing the Integration "${trigger.name}" to the url: ${url}`);
    logger.outgoing.debug(data);
    let opts = {
      params: {},
      method: 'POST',
      url,
      data,
      auth: undefined,
      npmRequestOptions: {
        rejectUnauthorized: !RocketChat.settings.get('Allow_Invalid_SelfSigned_Certs'),
        strictSSL: !RocketChat.settings.get('Allow_Invalid_SelfSigned_Certs')
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.0 Safari/537.36'
      }
    };

    if (this.hasScriptAndMethod(trigger, 'prepare_outgoing_request')) {
      opts = this.executeScript(trigger, 'prepare_outgoing_request', {
        request: opts
      }, historyId);
    }

    this.updateHistory({
      historyId,
      step: 'after-maybe-ran-prepare',
      ranPrepareScript: true
    });

    if (!opts) {
      this.updateHistory({
        historyId,
        step: 'after-prepare-no-opts',
        finished: true
      });
      return;
    }

    if (opts.message) {
      const prepareMessage = this.sendMessage({
        trigger,
        room,
        message: opts.message,
        data
      });
      this.updateHistory({
        historyId,
        step: 'after-prepare-send-message',
        prepareSentMessage: prepareMessage
      });
    }

    if (!opts.url || !opts.method) {
      this.updateHistory({
        historyId,
        step: 'after-prepare-no-url_or_method',
        finished: true
      });
      return;
    }

    this.updateHistory({
      historyId,
      step: 'pre-http-call',
      url: opts.url,
      httpCallData: opts.data
    });
    HTTP.call(opts.method, opts.url, opts, (error, result) => {
      if (!result) {
        logger.outgoing.warn(`Result for the Integration ${trigger.name} to ${url} is empty`);
      } else {
        logger.outgoing.info(`Status code for the Integration ${trigger.name} to ${url} is ${result.statusCode}`);
      }

      this.updateHistory({
        historyId,
        step: 'after-http-call',
        httpError: error,
        httpResult: result
      });

      if (this.hasScriptAndMethod(trigger, 'process_outgoing_response')) {
        const sandbox = {
          request: opts,
          response: {
            error,
            status_code: result ? result.statusCode : undefined,
            // These values will be undefined to close issues #4175, #5762, and #5896
            content: result ? result.data : undefined,
            content_raw: result ? result.content : undefined,
            headers: result ? result.headers : {}
          }
        };
        const scriptResult = this.executeScript(trigger, 'process_outgoing_response', sandbox, historyId);

        if (scriptResult && scriptResult.content) {
          const resultMessage = this.sendMessage({
            trigger,
            room,
            message: scriptResult.content,
            data
          });
          this.updateHistory({
            historyId,
            step: 'after-process-send-message',
            processSentMessage: resultMessage,
            finished: true
          });
          return;
        }

        if (scriptResult === false) {
          this.updateHistory({
            historyId,
            step: 'after-process-false-result',
            finished: true
          });
          return;
        }
      } // if the result contained nothing or wasn't a successful statusCode


      if (!result || !this.successResults.includes(result.statusCode)) {
        if (error) {
          logger.outgoing.error(`Error for the Integration "${trigger.name}" to ${url} is:`);
          logger.outgoing.error(error);
        }

        if (result) {
          logger.outgoing.error(`Error for the Integration "${trigger.name}" to ${url} is:`);
          logger.outgoing.error(result);

          if (result.statusCode === 410) {
            this.updateHistory({
              historyId,
              step: 'after-process-http-status-410',
              error: true
            });
            logger.outgoing.error(`Disabling the Integration "${trigger.name}" because the status code was 401 (Gone).`);
            RocketChat.models.Integrations.update({
              _id: trigger._id
            }, {
              $set: {
                enabled: false
              }
            });
            return;
          }

          if (result.statusCode === 500) {
            this.updateHistory({
              historyId,
              step: 'after-process-http-status-500',
              error: true
            });
            logger.outgoing.error(`Error "500" for the Integration "${trigger.name}" to ${url}.`);
            logger.outgoing.error(result.content);
            return;
          }
        }

        if (trigger.retryFailedCalls) {
          if (tries < trigger.retryCount && trigger.retryDelay) {
            this.updateHistory({
              historyId,
              error: true,
              step: `going-to-retry-${tries + 1}`
            });
            let waitTime;

            switch (trigger.retryDelay) {
              case 'powers-of-ten':
                // Try again in 0.1s, 1s, 10s, 1m40s, 16m40s, 2h46m40s, 27h46m40s, etc
                waitTime = Math.pow(10, tries + 2);
                break;

              case 'powers-of-two':
                // 2 seconds, 4 seconds, 8 seconds
                waitTime = Math.pow(2, tries + 1) * 1000;
                break;

              case 'increments-of-two':
                // 2 second, 4 seconds, 6 seconds, etc
                waitTime = (tries + 1) * 2 * 1000;
                break;

              default:
                const er = new Error('The integration\'s retryDelay setting is invalid.');
                this.updateHistory({
                  historyId,
                  step: 'failed-and-retry-delay-is-invalid',
                  error: true,
                  errorStack: er.stack
                });
                return;
            }

            logger.outgoing.info(`Trying the Integration ${trigger.name} to ${url} again in ${waitTime} milliseconds.`);
            Meteor.setTimeout(() => {
              this.executeTriggerUrl(url, trigger, {
                event,
                message,
                room,
                owner,
                user
              }, historyId, tries + 1);
            }, waitTime);
          } else {
            this.updateHistory({
              historyId,
              step: 'too-many-retries',
              error: true
            });
          }
        } else {
          this.updateHistory({
            historyId,
            step: 'failed-and-not-configured-to-retry',
            error: true
          });
        }

        return;
      } // process outgoing webhook response as a new message


      if (result && this.successResults.includes(result.statusCode)) {
        if (result && result.data && (result.data.text || result.data.attachments)) {
          const resultMsg = this.sendMessage({
            trigger,
            room,
            message: result.data,
            data
          });
          this.updateHistory({
            historyId,
            step: 'url-response-sent-message',
            resultMessage: resultMsg,
            finished: true
          });
        }
      }
    });
  }

  replay(integration, history) {
    if (!integration || integration.type !== 'webhook-outgoing') {
      throw new Meteor.Error('integration-type-must-be-outgoing', 'The integration type to replay must be an outgoing webhook.');
    }

    if (!history || !history.data) {
      throw new Meteor.Error('history-data-must-be-defined', 'The history data must be defined to replay an integration.');
    }

    const {
      event
    } = history;
    const message = RocketChat.models.Messages.findOneById(history.data.message_id);
    const room = RocketChat.models.Rooms.findOneById(history.data.channel_id);
    const user = RocketChat.models.Users.findOneById(history.data.user_id);
    let owner;

    if (history.data.owner && history.data.owner._id) {
      owner = RocketChat.models.Users.findOneById(history.data.owner._id);
    }

    this.executeTriggerUrl(history.url, integration, {
      event,
      message,
      room,
      owner,
      user
    });
  }

}();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"models":{"Integrations.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/models/Integrations.js                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
RocketChat.models.Integrations = new class Integrations extends RocketChat.models._Base {
  constructor() {
    super('integrations');
  }

  findByType(type, options) {
    if (type !== 'webhook-incoming' && type !== 'webhook-outgoing') {
      throw new Meteor.Error('invalid-type-to-find');
    }

    return this.find({
      type
    }, options);
  }

  disableByUserId(userId) {
    return this.update({
      userId
    }, {
      $set: {
        enabled: false
      }
    }, {
      multi: true
    });
  }

}();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"IntegrationHistory.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/models/IntegrationHistory.js                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
RocketChat.models.IntegrationHistory = new class IntegrationHistory extends RocketChat.models._Base {
  constructor() {
    super('integration_history');
  }

  findByType(type, options) {
    if (type !== 'outgoing-webhook' || type !== 'incoming-webhook') {
      throw new Meteor.Error('invalid-integration-type');
    }

    return this.find({
      type
    }, options);
  }

  findByIntegrationId(id, options) {
    return this.find({
      'integration._id': id
    }, options);
  }

  findByIntegrationIdAndCreatedBy(id, creatorId, options) {
    return this.find({
      'integration._id': id,
      'integration._createdBy._id': creatorId
    }, options);
  }

  findOneByIntegrationIdAndHistoryId(integrationId, historyId) {
    return this.findOne({
      'integration._id': integrationId,
      _id: historyId
    });
  }

  findByEventName(event, options) {
    return this.find({
      event
    }, options);
  }

  findFailed(options) {
    return this.find({
      error: true
    }, options);
  }

  removeByIntegrationId(integrationId) {
    return this.remove({
      'integration._id': integrationId
    });
  }

}();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"publications":{"integrations.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/publications/integrations.js                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.publish('integrations', function _integrationPublication() {
  if (!this.userId) {
    return this.ready();
  }

  if (RocketChat.authz.hasPermission(this.userId, 'manage-integrations')) {
    return RocketChat.models.Integrations.find();
  } else if (RocketChat.authz.hasPermission(this.userId, 'manage-own-integrations')) {
    return RocketChat.models.Integrations.find({
      '_createdBy._id': this.userId
    });
  } else {
    throw new Meteor.Error('not-authorized');
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"integrationHistory.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/publications/integrationHistory.js                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.publish('integrationHistory', function _integrationHistoryPublication(integrationId, limit = 25) {
  if (!this.userId) {
    return this.ready();
  }

  if (RocketChat.authz.hasPermission(this.userId, 'manage-integrations')) {
    return RocketChat.models.IntegrationHistory.findByIntegrationId(integrationId, {
      sort: {
        _updatedAt: -1
      },
      limit
    });
  } else if (RocketChat.authz.hasPermission(this.userId, 'manage-own-integrations')) {
    return RocketChat.models.IntegrationHistory.findByIntegrationIdAndCreatedBy(integrationId, this.userId, {
      sort: {
        _updatedAt: -1
      },
      limit
    });
  } else {
    throw new Meteor.Error('not-authorized');
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"incoming":{"addIncomingIntegration.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/methods/incoming/addIncomingIntegration.js                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
const validChannelChars = ['@', '#'];
Meteor.methods({
  addIncomingIntegration(integration) {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-integrations') && !RocketChat.authz.hasPermission(this.userId, 'manage-own-integrations')) {
      throw new Meteor.Error('not_authorized', 'Unauthorized', {
        method: 'addIncomingIntegration'
      });
    }

    if (!_.isString(integration.channel)) {
      throw new Meteor.Error('error-invalid-channel', 'Invalid channel', {
        method: 'addIncomingIntegration'
      });
    }

    if (integration.channel.trim() === '') {
      throw new Meteor.Error('error-invalid-channel', 'Invalid channel', {
        method: 'addIncomingIntegration'
      });
    }

    const channels = _.map(integration.channel.split(','), channel => s.trim(channel));

    for (const channel of channels) {
      if (!validChannelChars.includes(channel[0])) {
        throw new Meteor.Error('error-invalid-channel-start-with-chars', 'Invalid channel. Start with @ or #', {
          method: 'updateIncomingIntegration'
        });
      }
    }

    if (!_.isString(integration.username) || integration.username.trim() === '') {
      throw new Meteor.Error('error-invalid-username', 'Invalid username', {
        method: 'addIncomingIntegration'
      });
    }

    if (integration.scriptEnabled === true && integration.script && integration.script.trim() !== '') {
      try {
        let babelOptions = Babel.getDefaultOptions({
          runtime: false
        });
        babelOptions = _.extend(babelOptions, {
          compact: true,
          minified: true,
          comments: false
        });
        integration.scriptCompiled = Babel.compile(integration.script, babelOptions).code;
        integration.scriptError = undefined;
      } catch (e) {
        integration.scriptCompiled = undefined;
        integration.scriptError = _.pick(e, 'name', 'message', 'stack');
      }
    }

    for (let channel of channels) {
      let record;
      const channelType = channel[0];
      channel = channel.substr(1);

      switch (channelType) {
        case '#':
          record = RocketChat.models.Rooms.findOne({
            $or: [{
              _id: channel
            }, {
              name: channel
            }]
          });
          break;

        case '@':
          record = RocketChat.models.Users.findOne({
            $or: [{
              _id: channel
            }, {
              username: channel
            }]
          });
          break;
      }

      if (!record) {
        throw new Meteor.Error('error-invalid-room', 'Invalid room', {
          method: 'addIncomingIntegration'
        });
      }

      if (!RocketChat.authz.hasAllPermission(this.userId, 'manage-integrations', 'manage-own-integrations') && !RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(record._id, this.userId, {
        fields: {
          _id: 1
        }
      })) {
        throw new Meteor.Error('error-invalid-channel', 'Invalid Channel', {
          method: 'addIncomingIntegration'
        });
      }
    }

    const user = RocketChat.models.Users.findOne({
      username: integration.username
    });

    if (!user) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'addIncomingIntegration'
      });
    }

    const token = Random.id(48);
    integration.type = 'webhook-incoming';
    integration.token = token;
    integration.channel = channels;
    integration.userId = user._id;
    integration._createdAt = new Date();
    integration._createdBy = RocketChat.models.Users.findOne(this.userId, {
      fields: {
        username: 1
      }
    });
    RocketChat.models.Roles.addUserRoles(user._id, 'bot');
    integration._id = RocketChat.models.Integrations.insert(integration);
    return integration;
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"updateIncomingIntegration.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/methods/incoming/updateIncomingIntegration.js                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
const validChannelChars = ['@', '#'];
Meteor.methods({
  updateIncomingIntegration(integrationId, integration) {
    if (!_.isString(integration.channel) || integration.channel.trim() === '') {
      throw new Meteor.Error('error-invalid-channel', 'Invalid channel', {
        method: 'updateIncomingIntegration'
      });
    }

    const channels = _.map(integration.channel.split(','), channel => s.trim(channel));

    for (const channel of channels) {
      if (!validChannelChars.includes(channel[0])) {
        throw new Meteor.Error('error-invalid-channel-start-with-chars', 'Invalid channel. Start with @ or #', {
          method: 'updateIncomingIntegration'
        });
      }
    }

    let currentIntegration;

    if (RocketChat.authz.hasPermission(this.userId, 'manage-integrations')) {
      currentIntegration = RocketChat.models.Integrations.findOne(integrationId);
    } else if (RocketChat.authz.hasPermission(this.userId, 'manage-own-integrations')) {
      currentIntegration = RocketChat.models.Integrations.findOne({
        _id: integrationId,
        '_createdBy._id': this.userId
      });
    } else {
      throw new Meteor.Error('not_authorized', 'Unauthorized', {
        method: 'updateIncomingIntegration'
      });
    }

    if (!currentIntegration) {
      throw new Meteor.Error('error-invalid-integration', 'Invalid integration', {
        method: 'updateIncomingIntegration'
      });
    }

    if (integration.scriptEnabled === true && integration.script && integration.script.trim() !== '') {
      try {
        let babelOptions = Babel.getDefaultOptions({
          runtime: false
        });
        babelOptions = _.extend(babelOptions, {
          compact: true,
          minified: true,
          comments: false
        });
        integration.scriptCompiled = Babel.compile(integration.script, babelOptions).code;
        integration.scriptError = undefined;
      } catch (e) {
        integration.scriptCompiled = undefined;
        integration.scriptError = _.pick(e, 'name', 'message', 'stack');
      }
    }

    for (let channel of channels) {
      const channelType = channel[0];
      channel = channel.substr(1);
      let record;

      switch (channelType) {
        case '#':
          record = RocketChat.models.Rooms.findOne({
            $or: [{
              _id: channel
            }, {
              name: channel
            }]
          });
          break;

        case '@':
          record = RocketChat.models.Users.findOne({
            $or: [{
              _id: channel
            }, {
              username: channel
            }]
          });
          break;
      }

      if (!record) {
        throw new Meteor.Error('error-invalid-room', 'Invalid room', {
          method: 'updateIncomingIntegration'
        });
      }

      if (!RocketChat.authz.hasAllPermission(this.userId, 'manage-integrations', 'manage-own-integrations') && !RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(record._id, this.userId, {
        fields: {
          _id: 1
        }
      })) {
        throw new Meteor.Error('error-invalid-channel', 'Invalid Channel', {
          method: 'updateIncomingIntegration'
        });
      }
    }

    const user = RocketChat.models.Users.findOne({
      username: currentIntegration.username
    });

    if (!user || !user._id) {
      throw new Meteor.Error('error-invalid-post-as-user', 'Invalid Post As User', {
        method: 'updateIncomingIntegration'
      });
    }

    RocketChat.models.Roles.addUserRoles(user._id, 'bot');
    RocketChat.models.Integrations.update(integrationId, {
      $set: {
        enabled: integration.enabled,
        name: integration.name,
        avatar: integration.avatar,
        emoji: integration.emoji,
        alias: integration.alias,
        channel: channels,
        script: integration.script,
        scriptEnabled: integration.scriptEnabled,
        scriptCompiled: integration.scriptCompiled,
        scriptError: integration.scriptError,
        _updatedAt: new Date(),
        _updatedBy: RocketChat.models.Users.findOne(this.userId, {
          fields: {
            username: 1
          }
        })
      }
    });
    return RocketChat.models.Integrations.findOne(integrationId);
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deleteIncomingIntegration.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/methods/incoming/deleteIncomingIntegration.js                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.methods({
  deleteIncomingIntegration(integrationId) {
    let integration;

    if (RocketChat.authz.hasPermission(this.userId, 'manage-integrations')) {
      integration = RocketChat.models.Integrations.findOne(integrationId);
    } else if (RocketChat.authz.hasPermission(this.userId, 'manage-own-integrations')) {
      integration = RocketChat.models.Integrations.findOne(integrationId, {
        fields: {
          '_createdBy._id': this.userId
        }
      });
    } else {
      throw new Meteor.Error('not_authorized', 'Unauthorized', {
        method: 'deleteIncomingIntegration'
      });
    }

    if (!integration) {
      throw new Meteor.Error('error-invalid-integration', 'Invalid integration', {
        method: 'deleteIncomingIntegration'
      });
    }

    RocketChat.models.Integrations.remove({
      _id: integrationId
    });
    return true;
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"outgoing":{"addOutgoingIntegration.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/methods/outgoing/addOutgoingIntegration.js                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.methods({
  addOutgoingIntegration(integration) {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-integrations') && !RocketChat.authz.hasPermission(this.userId, 'manage-own-integrations') && !RocketChat.authz.hasPermission(this.userId, 'manage-integrations', 'bot') && !RocketChat.authz.hasPermission(this.userId, 'manage-own-integrations', 'bot')) {
      throw new Meteor.Error('not_authorized');
    }

    integration = RocketChat.integrations.validateOutgoing(integration, this.userId);
    integration._createdAt = new Date();
    integration._createdBy = RocketChat.models.Users.findOne(this.userId, {
      fields: {
        username: 1
      }
    });
    integration._id = RocketChat.models.Integrations.insert(integration);
    return integration;
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"updateOutgoingIntegration.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/methods/outgoing/updateOutgoingIntegration.js                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.methods({
  updateOutgoingIntegration(integrationId, integration) {
    integration = RocketChat.integrations.validateOutgoing(integration, this.userId);

    if (!integration.token || integration.token.trim() === '') {
      throw new Meteor.Error('error-invalid-token', 'Invalid token', {
        method: 'updateOutgoingIntegration'
      });
    }

    let currentIntegration;

    if (RocketChat.authz.hasPermission(this.userId, 'manage-integrations')) {
      currentIntegration = RocketChat.models.Integrations.findOne(integrationId);
    } else if (RocketChat.authz.hasPermission(this.userId, 'manage-own-integrations')) {
      currentIntegration = RocketChat.models.Integrations.findOne({
        _id: integrationId,
        '_createdBy._id': this.userId
      });
    } else {
      throw new Meteor.Error('not_authorized', 'Unauthorized', {
        method: 'updateOutgoingIntegration'
      });
    }

    if (!currentIntegration) {
      throw new Meteor.Error('invalid_integration', '[methods] updateOutgoingIntegration -> integration not found');
    }

    RocketChat.models.Integrations.update(integrationId, {
      $set: {
        event: integration.event,
        enabled: integration.enabled,
        name: integration.name,
        avatar: integration.avatar,
        emoji: integration.emoji,
        alias: integration.alias,
        channel: integration.channel,
        targetRoom: integration.targetRoom,
        impersonateUser: integration.impersonateUser,
        username: integration.username,
        userId: integration.userId,
        urls: integration.urls,
        token: integration.token,
        script: integration.script,
        scriptEnabled: integration.scriptEnabled,
        scriptCompiled: integration.scriptCompiled,
        scriptError: integration.scriptError,
        triggerWords: integration.triggerWords,
        retryFailedCalls: integration.retryFailedCalls,
        retryCount: integration.retryCount,
        retryDelay: integration.retryDelay,
        triggerWordAnywhere: integration.triggerWordAnywhere,
        runOnEdits: integration.runOnEdits,
        _updatedAt: new Date(),
        _updatedBy: RocketChat.models.Users.findOne(this.userId, {
          fields: {
            username: 1
          }
        })
      }
    });
    return RocketChat.models.Integrations.findOne(integrationId);
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"replayOutgoingIntegration.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/methods/outgoing/replayOutgoingIntegration.js                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.methods({
  replayOutgoingIntegration({
    integrationId,
    historyId
  }) {
    let integration;

    if (RocketChat.authz.hasPermission(this.userId, 'manage-integrations') || RocketChat.authz.hasPermission(this.userId, 'manage-integrations', 'bot')) {
      integration = RocketChat.models.Integrations.findOne(integrationId);
    } else if (RocketChat.authz.hasPermission(this.userId, 'manage-own-integrations') || RocketChat.authz.hasPermission(this.userId, 'manage-own-integrations', 'bot')) {
      integration = RocketChat.models.Integrations.findOne(integrationId, {
        fields: {
          '_createdBy._id': this.userId
        }
      });
    } else {
      throw new Meteor.Error('not_authorized', 'Unauthorized', {
        method: 'replayOutgoingIntegration'
      });
    }

    if (!integration) {
      throw new Meteor.Error('error-invalid-integration', 'Invalid integration', {
        method: 'replayOutgoingIntegration'
      });
    }

    const history = RocketChat.models.IntegrationHistory.findOneByIntegrationIdAndHistoryId(integration._id, historyId);

    if (!history) {
      throw new Meteor.Error('error-invalid-integration-history', 'Invalid Integration History', {
        method: 'replayOutgoingIntegration'
      });
    }

    RocketChat.integrations.triggerHandler.replay(integration, history);
    return true;
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deleteOutgoingIntegration.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/methods/outgoing/deleteOutgoingIntegration.js                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.methods({
  deleteOutgoingIntegration(integrationId) {
    let integration;

    if (RocketChat.authz.hasPermission(this.userId, 'manage-integrations') || RocketChat.authz.hasPermission(this.userId, 'manage-integrations', 'bot')) {
      integration = RocketChat.models.Integrations.findOne(integrationId);
    } else if (RocketChat.authz.hasPermission(this.userId, 'manage-own-integrations') || RocketChat.authz.hasPermission(this.userId, 'manage-own-integrations', 'bot')) {
      integration = RocketChat.models.Integrations.findOne(integrationId, {
        fields: {
          '_createdBy._id': this.userId
        }
      });
    } else {
      throw new Meteor.Error('not_authorized', 'Unauthorized', {
        method: 'deleteOutgoingIntegration'
      });
    }

    if (!integration) {
      throw new Meteor.Error('error-invalid-integration', 'Invalid integration', {
        method: 'deleteOutgoingIntegration'
      });
    }

    RocketChat.models.Integrations.remove({
      _id: integrationId
    });
    RocketChat.models.IntegrationHistory.removeByIntegrationId(integrationId);
    return true;
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"clearIntegrationHistory.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/methods/clearIntegrationHistory.js                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.methods({
  clearIntegrationHistory(integrationId) {
    let integration;

    if (RocketChat.authz.hasPermission(this.userId, 'manage-integrations') || RocketChat.authz.hasPermission(this.userId, 'manage-integrations', 'bot')) {
      integration = RocketChat.models.Integrations.findOne(integrationId);
    } else if (RocketChat.authz.hasPermission(this.userId, 'manage-own-integrations') || RocketChat.authz.hasPermission(this.userId, 'manage-own-integrations', 'bot')) {
      integration = RocketChat.models.Integrations.findOne(integrationId, {
        fields: {
          '_createdBy._id': this.userId
        }
      });
    } else {
      throw new Meteor.Error('not_authorized', 'Unauthorized', {
        method: 'clearIntegrationHistory'
      });
    }

    if (!integration) {
      throw new Meteor.Error('error-invalid-integration', 'Invalid integration', {
        method: 'clearIntegrationHistory'
      });
    }

    RocketChat.models.IntegrationHistory.removeByIntegrationId(integrationId);
    return true;
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"api":{"api.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/api/api.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let Fiber;
module.watch(require("fibers"), {
  default(v) {
    Fiber = v;
  }

}, 0);
let Future;
module.watch(require("fibers/future"), {
  default(v) {
    Future = v;
  }

}, 1);

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 2);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 3);
let vm;
module.watch(require("vm"), {
  default(v) {
    vm = v;
  }

}, 4);
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 5);
const Api = new Restivus({
  enableCors: true,
  apiPath: 'hooks/',
  auth: {
    user() {
      const payloadKeys = Object.keys(this.bodyParams);
      const payloadIsWrapped = this.bodyParams && this.bodyParams.payload && payloadKeys.length === 1;

      if (payloadIsWrapped && this.request.headers['content-type'] === 'application/x-www-form-urlencoded') {
        try {
          this.bodyParams = JSON.parse(this.bodyParams.payload);
        } catch ({
          message
        }) {
          return {
            error: {
              statusCode: 400,
              body: {
                success: false,
                error: message
              }
            }
          };
        }
      }

      this.integration = RocketChat.models.Integrations.findOne({
        _id: this.request.params.integrationId,
        token: decodeURIComponent(this.request.params.token)
      });

      if (!this.integration) {
        logger.incoming.info('Invalid integration id', this.request.params.integrationId, 'or token', this.request.params.token);
        return {
          error: {
            statusCode: 404,
            body: {
              success: false,
              error: 'Invalid integration id or token provided.'
            }
          }
        };
      }

      const user = RocketChat.models.Users.findOne({
        _id: this.integration.userId
      });
      return {
        user
      };
    }

  }
});
const compiledScripts = {};

function buildSandbox(store = {}) {
  const sandbox = {
    scriptTimeout(reject) {
      return setTimeout(() => reject('timed out'), 3000);
    },

    _,
    s,
    console,
    moment,
    Fiber,
    Promise,
    Livechat: RocketChat.Livechat,
    Store: {
      set(key, val) {
        return store[key] = val;
      },

      get(key) {
        return store[key];
      }

    },

    HTTP(method, url, options) {
      try {
        return {
          result: HTTP.call(method, url, options)
        };
      } catch (error) {
        return {
          error
        };
      }
    }

  };
  Object.keys(RocketChat.models).filter(k => !k.startsWith('_')).forEach(k => sandbox[k] = RocketChat.models[k]);
  return {
    store,
    sandbox
  };
}

function getIntegrationScript(integration) {
  const compiledScript = compiledScripts[integration._id];

  if (compiledScript && +compiledScript._updatedAt === +integration._updatedAt) {
    return compiledScript.script;
  }

  const script = integration.scriptCompiled;
  const {
    sandbox,
    store
  } = buildSandbox();

  try {
    logger.incoming.info('Will evaluate script of Trigger', integration.name);
    logger.incoming.debug(script);
    const vmScript = vm.createScript(script, 'script.js');
    vmScript.runInNewContext(sandbox);

    if (sandbox.Script) {
      compiledScripts[integration._id] = {
        script: new sandbox.Script(),
        store,
        _updatedAt: integration._updatedAt
      };
      return compiledScripts[integration._id].script;
    }
  } catch ({
    stack
  }) {
    logger.incoming.error('[Error evaluating Script in Trigger', integration.name, ':]');
    logger.incoming.error(script.replace(/^/gm, '  '));
    logger.incoming.error('[Stack:]');
    logger.incoming.error(stack.replace(/^/gm, '  '));
    throw RocketChat.API.v1.failure('error-evaluating-script');
  }

  if (!sandbox.Script) {
    logger.incoming.error('[Class "Script" not in Trigger', integration.name, ']');
    throw RocketChat.API.v1.failure('class-script-not-found');
  }
}

function createIntegration(options, user) {
  logger.incoming.info('Add integration', options.name);
  logger.incoming.debug(options);
  Meteor.runAsUser(user._id, function () {
    switch (options.event) {
      case 'newMessageOnChannel':
        if (options.data == null) {
          options.data = {};
        }

        if (options.data.channel_name != null && options.data.channel_name.indexOf('#') === -1) {
          options.data.channel_name = `#${options.data.channel_name}`;
        }

        return Meteor.call('addOutgoingIntegration', {
          username: 'rocket.cat',
          urls: [options.target_url],
          name: options.name,
          channel: options.data.channel_name,
          triggerWords: options.data.trigger_words
        });

      case 'newMessageToUser':
        if (options.data.username.indexOf('@') === -1) {
          options.data.username = `@${options.data.username}`;
        }

        return Meteor.call('addOutgoingIntegration', {
          username: 'rocket.cat',
          urls: [options.target_url],
          name: options.name,
          channel: options.data.username,
          triggerWords: options.data.trigger_words
        });
    }
  });
  return RocketChat.API.v1.success();
}

function removeIntegration(options, user) {
  logger.incoming.info('Remove integration');
  logger.incoming.debug(options);
  const integrationToRemove = RocketChat.models.Integrations.findOne({
    urls: options.target_url
  });
  Meteor.runAsUser(user._id, () => Meteor.call('deleteOutgoingIntegration', integrationToRemove._id));
  return RocketChat.API.v1.success();
}

function executeIntegrationRest() {
  logger.incoming.info('Post integration:', this.integration.name);
  logger.incoming.debug('@urlParams:', this.urlParams);
  logger.incoming.debug('@bodyParams:', this.bodyParams);

  if (this.integration.enabled !== true) {
    return {
      statusCode: 503,
      body: 'Service Unavailable'
    };
  }

  const defaultValues = {
    channel: this.integration.channel,
    alias: this.integration.alias,
    avatar: this.integration.avatar,
    emoji: this.integration.emoji
  };

  if (this.integration.scriptEnabled && this.integration.scriptCompiled && this.integration.scriptCompiled.trim() !== '') {
    let script;

    try {
      script = getIntegrationScript(this.integration);
    } catch (e) {
      logger.incoming.warn(e);
      return RocketChat.API.v1.failure(e.message);
    }

    this.request.setEncoding('utf8');
    const content_raw = this.request.read();
    const request = {
      url: {
        hash: this.request._parsedUrl.hash,
        search: this.request._parsedUrl.search,
        query: this.queryParams,
        pathname: this.request._parsedUrl.pathname,
        path: this.request._parsedUrl.path
      },
      url_raw: this.request.url,
      url_params: this.urlParams,
      content: this.bodyParams,
      content_raw,
      headers: this.request.headers,
      body: this.request.body,
      user: {
        _id: this.user._id,
        name: this.user.name,
        username: this.user.username
      }
    };

    try {
      const {
        sandbox
      } = buildSandbox(compiledScripts[this.integration._id].store);
      sandbox.script = script;
      sandbox.request = request;
      const result = Future.fromPromise(vm.runInNewContext(`
				new Promise((resolve, reject) => {
					Fiber(() => {
						scriptTimeout(reject);
						try {
							resolve(script.process_incoming_request({ request: request }));
						} catch(e) {
							reject(e);
						}
					}).run();
				}).catch((error) => { throw new Error(error); });
			`, sandbox, {
        timeout: 3000
      })).wait();

      if (!result) {
        logger.incoming.debug('[Process Incoming Request result of Trigger', this.integration.name, ':] No data');
        return RocketChat.API.v1.success();
      } else if (result && result.error) {
        return RocketChat.API.v1.failure(result.error);
      }

      this.bodyParams = result && result.content;
      this.scriptResponse = result.response;

      if (result.user) {
        this.user = result.user;
      }

      logger.incoming.debug('[Process Incoming Request result of Trigger', this.integration.name, ':]');
      logger.incoming.debug('result', this.bodyParams);
    } catch ({
      stack
    }) {
      logger.incoming.error('[Error running Script in Trigger', this.integration.name, ':]');
      logger.incoming.error(this.integration.scriptCompiled.replace(/^/gm, '  '));
      logger.incoming.error('[Stack:]');
      logger.incoming.error(stack.replace(/^/gm, '  '));
      return RocketChat.API.v1.failure('error-running-script');
    }
  } // TODO: Turn this into an option on the integrations - no body means a success
  // TODO: Temporary fix for https://github.com/RocketChat/Rocket.Chat/issues/7770 until the above is implemented


  if (!this.bodyParams || _.isEmpty(this.bodyParams) && !this.integration.scriptEnabled) {
    // return RocketChat.API.v1.failure('body-empty');
    return RocketChat.API.v1.success();
  }

  this.bodyParams.bot = {
    i: this.integration._id
  };

  try {
    const message = processWebhookMessage(this.bodyParams, this.user, defaultValues);

    if (_.isEmpty(message)) {
      return RocketChat.API.v1.failure('unknown-error');
    }

    if (this.scriptResponse) {
      logger.incoming.debug('response', this.scriptResponse);
    }

    return RocketChat.API.v1.success(this.scriptResponse);
  } catch ({
    error,
    message
  }) {
    return RocketChat.API.v1.failure(error || message);
  }
}

function addIntegrationRest() {
  return createIntegration(this.bodyParams, this.user);
}

function removeIntegrationRest() {
  return removeIntegration(this.bodyParams, this.user);
}

function integrationSampleRest() {
  logger.incoming.info('Sample Integration');
  return {
    statusCode: 200,
    body: [{
      token: Random.id(24),
      channel_id: Random.id(),
      channel_name: 'general',
      timestamp: new Date(),
      user_id: Random.id(),
      user_name: 'rocket.cat',
      text: 'Sample text 1',
      trigger_word: 'Sample'
    }, {
      token: Random.id(24),
      channel_id: Random.id(),
      channel_name: 'general',
      timestamp: new Date(),
      user_id: Random.id(),
      user_name: 'rocket.cat',
      text: 'Sample text 2',
      trigger_word: 'Sample'
    }, {
      token: Random.id(24),
      channel_id: Random.id(),
      channel_name: 'general',
      timestamp: new Date(),
      user_id: Random.id(),
      user_name: 'rocket.cat',
      text: 'Sample text 3',
      trigger_word: 'Sample'
    }]
  };
}

function integrationInfoRest() {
  logger.incoming.info('Info integration');
  return {
    statusCode: 200,
    body: {
      success: true
    }
  };
}

Api.addRoute(':integrationId/:userId/:token', {
  authRequired: true
}, {
  post: executeIntegrationRest,
  get: executeIntegrationRest
});
Api.addRoute(':integrationId/:token', {
  authRequired: true
}, {
  post: executeIntegrationRest,
  get: executeIntegrationRest
});
Api.addRoute('sample/:integrationId/:userId/:token', {
  authRequired: true
}, {
  get: integrationSampleRest
});
Api.addRoute('sample/:integrationId/:token', {
  authRequired: true
}, {
  get: integrationSampleRest
});
Api.addRoute('info/:integrationId/:userId/:token', {
  authRequired: true
}, {
  get: integrationInfoRest
});
Api.addRoute('info/:integrationId/:token', {
  authRequired: true
}, {
  get: integrationInfoRest
});
Api.addRoute('add/:integrationId/:userId/:token', {
  authRequired: true
}, {
  post: addIntegrationRest
});
Api.addRoute('add/:integrationId/:token', {
  authRequired: true
}, {
  post: addIntegrationRest
});
Api.addRoute('remove/:integrationId/:userId/:token', {
  authRequired: true
}, {
  post: removeIntegrationRest
});
Api.addRoute('remove/:integrationId/:token', {
  authRequired: true
}, {
  post: removeIntegrationRest
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"triggers.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/triggers.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
const callbackHandler = function _callbackHandler(eventType) {
  return function _wrapperFunction(...args) {
    return RocketChat.integrations.triggerHandler.executeTriggers(eventType, ...args);
  };
};

RocketChat.callbacks.add('afterSaveMessage', callbackHandler('sendMessage'), RocketChat.callbacks.priority.LOW);
RocketChat.callbacks.add('afterCreateChannel', callbackHandler('roomCreated'), RocketChat.callbacks.priority.LOW);
RocketChat.callbacks.add('afterCreatePrivateGroup', callbackHandler('roomCreated'), RocketChat.callbacks.priority.LOW);
RocketChat.callbacks.add('afterCreateUser', callbackHandler('userCreated'), RocketChat.callbacks.priority.LOW);
RocketChat.callbacks.add('afterJoinRoom', callbackHandler('roomJoined'), RocketChat.callbacks.priority.LOW);
RocketChat.callbacks.add('afterLeaveRoom', callbackHandler('roomLeft'), RocketChat.callbacks.priority.LOW);
RocketChat.callbacks.add('afterRoomArchived', callbackHandler('roomArchived'), RocketChat.callbacks.priority.LOW);
RocketChat.callbacks.add('afterFileUpload', callbackHandler('fileUploaded'), RocketChat.callbacks.priority.LOW);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"processWebhookMessage.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_integrations/server/processWebhookMessage.js                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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

this.processWebhookMessage = function (messageObj, user, defaultValues = {
  channel: '',
  alias: '',
  avatar: '',
  emoji: ''
}, mustBeJoined = false) {
  const sentData = [];
  const channels = [].concat(messageObj.channel || messageObj.roomId || defaultValues.channel);

  for (const channel of channels) {
    const channelType = channel[0];
    let channelValue = channel.substr(1);
    let room;

    switch (channelType) {
      case '#':
        room = RocketChat.getRoomByNameOrIdWithOptionToJoin({
          currentUserId: user._id,
          nameOrId: channelValue,
          joinChannel: true
        });
        break;

      case '@':
        room = RocketChat.getRoomByNameOrIdWithOptionToJoin({
          currentUserId: user._id,
          nameOrId: channelValue,
          type: 'd'
        });
        break;

      default:
        channelValue = channelType + channelValue; // Try to find the room by id or name if they didn't include the prefix.

        room = RocketChat.getRoomByNameOrIdWithOptionToJoin({
          currentUserId: user._id,
          nameOrId: channelValue,
          joinChannel: true,
          errorOnEmpty: false
        });

        if (room) {
          break;
        } // We didn't get a room, let's try finding direct messages


        room = RocketChat.getRoomByNameOrIdWithOptionToJoin({
          currentUserId: user._id,
          nameOrId: channelValue,
          type: 'd',
          tryDirectByUserIdOnly: true
        });

        if (room) {
          break;
        } // No room, so throw an error


        throw new Meteor.Error('invalid-channel');
    }

    if (mustBeJoined && !RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, user._id, {
      fields: {
        _id: 1
      }
    })) {
      // throw new Meteor.Error('invalid-room', 'Invalid room provided to send a message to, must be joined.');
      throw new Meteor.Error('invalid-channel'); // Throwing the generic one so people can't "brute force" find rooms
    }

    if (messageObj.attachments && !_.isArray(messageObj.attachments)) {
      console.log('Attachments should be Array, ignoring value'.red, messageObj.attachments);
      messageObj.attachments = undefined;
    }

    const message = {
      alias: messageObj.username || messageObj.alias || defaultValues.alias,
      msg: s.trim(messageObj.text || messageObj.msg || ''),
      attachments: messageObj.attachments || [],
      parseUrls: messageObj.parseUrls !== undefined ? messageObj.parseUrls : !messageObj.attachments,
      bot: messageObj.bot,
      groupable: messageObj.groupable !== undefined ? messageObj.groupable : false
    };

    if (!_.isEmpty(messageObj.icon_url) || !_.isEmpty(messageObj.avatar)) {
      message.avatar = messageObj.icon_url || messageObj.avatar;
    } else if (!_.isEmpty(messageObj.icon_emoji) || !_.isEmpty(messageObj.emoji)) {
      message.emoji = messageObj.icon_emoji || messageObj.emoji;
    } else if (!_.isEmpty(defaultValues.avatar)) {
      message.avatar = defaultValues.avatar;
    } else if (!_.isEmpty(defaultValues.emoji)) {
      message.emoji = defaultValues.emoji;
    }

    if (_.isArray(message.attachments)) {
      for (let i = 0; i < message.attachments.length; i++) {
        const attachment = message.attachments[i];

        if (attachment.msg) {
          attachment.text = s.trim(attachment.msg);
          delete attachment.msg;
        }
      }
    }

    const messageReturn = RocketChat.sendMessage(user, message, room);
    sentData.push({
      channel,
      message: messageReturn
    });
  }

  return sentData;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:integrations/lib/rocketchat.js");
require("/node_modules/meteor/rocketchat:integrations/server/logger.js");
require("/node_modules/meteor/rocketchat:integrations/server/lib/validation.js");
require("/node_modules/meteor/rocketchat:integrations/server/models/Integrations.js");
require("/node_modules/meteor/rocketchat:integrations/server/models/IntegrationHistory.js");
require("/node_modules/meteor/rocketchat:integrations/server/publications/integrations.js");
require("/node_modules/meteor/rocketchat:integrations/server/publications/integrationHistory.js");
require("/node_modules/meteor/rocketchat:integrations/server/methods/incoming/addIncomingIntegration.js");
require("/node_modules/meteor/rocketchat:integrations/server/methods/incoming/updateIncomingIntegration.js");
require("/node_modules/meteor/rocketchat:integrations/server/methods/incoming/deleteIncomingIntegration.js");
require("/node_modules/meteor/rocketchat:integrations/server/methods/outgoing/addOutgoingIntegration.js");
require("/node_modules/meteor/rocketchat:integrations/server/methods/outgoing/updateOutgoingIntegration.js");
require("/node_modules/meteor/rocketchat:integrations/server/methods/outgoing/replayOutgoingIntegration.js");
require("/node_modules/meteor/rocketchat:integrations/server/methods/outgoing/deleteOutgoingIntegration.js");
require("/node_modules/meteor/rocketchat:integrations/server/methods/clearIntegrationHistory.js");
require("/node_modules/meteor/rocketchat:integrations/server/api/api.js");
require("/node_modules/meteor/rocketchat:integrations/server/lib/triggerHandler.js");
require("/node_modules/meteor/rocketchat:integrations/server/triggers.js");
require("/node_modules/meteor/rocketchat:integrations/server/processWebhookMessage.js");

/* Exports */
Package._define("rocketchat:integrations");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_integrations.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbnRlZ3JhdGlvbnMvbGliL3JvY2tldGNoYXQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW50ZWdyYXRpb25zL3NlcnZlci9sb2dnZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW50ZWdyYXRpb25zL3NlcnZlci9saWIvdmFsaWRhdGlvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbnRlZ3JhdGlvbnMvc2VydmVyL2xpYi90cmlnZ2VySGFuZGxlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbnRlZ3JhdGlvbnMvc2VydmVyL21vZGVscy9JbnRlZ3JhdGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW50ZWdyYXRpb25zL3NlcnZlci9tb2RlbHMvSW50ZWdyYXRpb25IaXN0b3J5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmludGVncmF0aW9ucy9zZXJ2ZXIvcHVibGljYXRpb25zL2ludGVncmF0aW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbnRlZ3JhdGlvbnMvc2VydmVyL3B1YmxpY2F0aW9ucy9pbnRlZ3JhdGlvbkhpc3RvcnkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW50ZWdyYXRpb25zL3NlcnZlci9tZXRob2RzL2luY29taW5nL2FkZEluY29taW5nSW50ZWdyYXRpb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW50ZWdyYXRpb25zL3NlcnZlci9tZXRob2RzL2luY29taW5nL3VwZGF0ZUluY29taW5nSW50ZWdyYXRpb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW50ZWdyYXRpb25zL3NlcnZlci9tZXRob2RzL2luY29taW5nL2RlbGV0ZUluY29taW5nSW50ZWdyYXRpb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW50ZWdyYXRpb25zL3NlcnZlci9tZXRob2RzL291dGdvaW5nL2FkZE91dGdvaW5nSW50ZWdyYXRpb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW50ZWdyYXRpb25zL3NlcnZlci9tZXRob2RzL291dGdvaW5nL3VwZGF0ZU91dGdvaW5nSW50ZWdyYXRpb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW50ZWdyYXRpb25zL3NlcnZlci9tZXRob2RzL291dGdvaW5nL3JlcGxheU91dGdvaW5nSW50ZWdyYXRpb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW50ZWdyYXRpb25zL3NlcnZlci9tZXRob2RzL291dGdvaW5nL2RlbGV0ZU91dGdvaW5nSW50ZWdyYXRpb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW50ZWdyYXRpb25zL3NlcnZlci9tZXRob2RzL2NsZWFySW50ZWdyYXRpb25IaXN0b3J5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmludGVncmF0aW9ucy9zZXJ2ZXIvYXBpL2FwaS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbnRlZ3JhdGlvbnMvc2VydmVyL3RyaWdnZXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmludGVncmF0aW9ucy9zZXJ2ZXIvcHJvY2Vzc1dlYmhvb2tNZXNzYWdlLmpzIl0sIm5hbWVzIjpbIlJvY2tldENoYXQiLCJpbnRlZ3JhdGlvbnMiLCJvdXRnb2luZ0V2ZW50cyIsInNlbmRNZXNzYWdlIiwibGFiZWwiLCJ2YWx1ZSIsInVzZSIsImNoYW5uZWwiLCJ0cmlnZ2VyV29yZHMiLCJ0YXJnZXRSb29tIiwiZmlsZVVwbG9hZGVkIiwicm9vbUFyY2hpdmVkIiwicm9vbUNyZWF0ZWQiLCJyb29tSm9pbmVkIiwicm9vbUxlZnQiLCJ1c2VyQ3JlYXRlZCIsImxvZ2dlciIsIkxvZ2dlciIsInNlY3Rpb25zIiwiaW5jb21pbmciLCJvdXRnb2luZyIsIl8iLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsInMiLCJzY29wZWRDaGFubmVscyIsInZhbGlkQ2hhbm5lbENoYXJzIiwiX3ZlcmlmeVJlcXVpcmVkRmllbGRzIiwiaW50ZWdyYXRpb24iLCJldmVudCIsIk1hdGNoIiwidGVzdCIsIlN0cmluZyIsInRyaW0iLCJNZXRlb3IiLCJFcnJvciIsImZ1bmN0aW9uIiwidXNlcm5hbWUiLCJ1cmxzIiwiaW5kZXgiLCJ1cmwiLCJlbnRyaWVzIiwid2l0aG91dCIsInVuZGVmaW5lZCIsImxlbmd0aCIsIl92ZXJpZnlVc2VySGFzUGVybWlzc2lvbkZvckNoYW5uZWxzIiwidXNlcklkIiwiY2hhbm5lbHMiLCJpbmNsdWRlcyIsImF1dGh6IiwiaGFzUGVybWlzc2lvbiIsInJlY29yZCIsImNoYW5uZWxUeXBlIiwic3Vic3RyIiwibW9kZWxzIiwiUm9vbXMiLCJmaW5kT25lIiwiJG9yIiwiX2lkIiwibmFtZSIsIlVzZXJzIiwiaGFzQWxsUGVybWlzc2lvbiIsIlN1YnNjcmlwdGlvbnMiLCJmaW5kT25lQnlSb29tSWRBbmRVc2VySWQiLCJmaWVsZHMiLCJfdmVyaWZ5UmV0cnlJbmZvcm1hdGlvbiIsInJldHJ5RmFpbGVkQ2FsbHMiLCJyZXRyeUNvdW50IiwicGFyc2VJbnQiLCJyZXRyeURlbGF5IiwidG9Mb3dlckNhc2UiLCJ2YWxpZGF0ZU91dGdvaW5nIiwiX3ZhbGlkYXRlT3V0Z29pbmciLCJtYXAiLCJzcGxpdCIsImZvckVhY2giLCJ3b3JkIiwic2NyaXB0RW5hYmxlZCIsInNjcmlwdCIsImJhYmVsT3B0aW9ucyIsIk9iamVjdCIsImFzc2lnbiIsIkJhYmVsIiwiZ2V0RGVmYXVsdE9wdGlvbnMiLCJydW50aW1lIiwiY29tcGFjdCIsIm1pbmlmaWVkIiwiY29tbWVudHMiLCJzY3JpcHRDb21waWxlZCIsImNvbXBpbGUiLCJjb2RlIiwic2NyaXB0RXJyb3IiLCJlIiwicGljayIsInJ1bk9uRWRpdHMiLCJ1c2VyIiwidHlwZSIsIm1vbWVudCIsInZtIiwiRmliZXIiLCJGdXR1cmUiLCJ0cmlnZ2VySGFuZGxlciIsIlJvY2tldENoYXRJbnRlZ3JhdGlvbkhhbmRsZXIiLCJjb25zdHJ1Y3RvciIsInN1Y2Nlc3NSZXN1bHRzIiwiY29tcGlsZWRTY3JpcHRzIiwidHJpZ2dlcnMiLCJJbnRlZ3JhdGlvbnMiLCJmaW5kIiwib2JzZXJ2ZSIsImFkZGVkIiwiYWRkSW50ZWdyYXRpb24iLCJjaGFuZ2VkIiwicmVtb3ZlSW50ZWdyYXRpb24iLCJyZW1vdmVkIiwiZGVidWciLCJpc0VtcHR5IiwiY29uY2F0IiwidHJpZ2dlciIsInZhbHVlcyIsImlzVHJpZ2dlckVuYWJsZWQiLCJ0cmlnIiwiZW5hYmxlZCIsInVwZGF0ZUhpc3RvcnkiLCJoaXN0b3J5SWQiLCJzdGVwIiwiZGF0YSIsInRyaWdnZXJXb3JkIiwicmFuUHJlcGFyZVNjcmlwdCIsInByZXBhcmVTZW50TWVzc2FnZSIsInByb2Nlc3NTZW50TWVzc2FnZSIsInJlc3VsdE1lc3NhZ2UiLCJmaW5pc2hlZCIsImh0dHBDYWxsRGF0YSIsImh0dHBFcnJvciIsImh0dHBSZXN1bHQiLCJlcnJvciIsImVycm9yU3RhY2siLCJoaXN0b3J5Iiwib21pdCIsInJvb20iLCJKU09OIiwic3RyaW5naWZ5IiwiSW50ZWdyYXRpb25IaXN0b3J5IiwidXBkYXRlIiwiJHNldCIsIl9jcmVhdGVkQXQiLCJEYXRlIiwiaW5zZXJ0IiwiUmFuZG9tIiwiaWQiLCJuYW1lT3JJZCIsIm1lc3NhZ2UiLCJpbXBlcnNvbmF0ZVVzZXIiLCJmaW5kT25lQnlVc2VybmFtZSIsInVzZXJfbmFtZSIsInRtcFJvb20iLCJnZXRSb29tQnlOYW1lT3JJZFdpdGhPcHRpb25Ub0pvaW4iLCJjdXJyZW50VXNlcklkIiwiZXJyb3JPbkVtcHR5Iiwid2FybiIsInQiLCJib3QiLCJpIiwiZGVmYXVsdFZhbHVlcyIsImFsaWFzIiwiYXZhdGFyIiwiZW1vamkiLCJwcm9jZXNzV2ViaG9va01lc3NhZ2UiLCJidWlsZFNhbmRib3giLCJzdG9yZSIsInNhbmRib3giLCJzY3JpcHRUaW1lb3V0IiwicmVqZWN0Iiwic2V0VGltZW91dCIsImNvbnNvbGUiLCJQcm9taXNlIiwiU3RvcmUiLCJzZXQiLCJrZXkiLCJ2YWwiLCJnZXQiLCJIVFRQIiwibWV0aG9kIiwib3B0aW9ucyIsInJlc3VsdCIsImNhbGwiLCJrZXlzIiwiZmlsdGVyIiwiayIsInN0YXJ0c1dpdGgiLCJnZXRJbnRlZ3JhdGlvblNjcmlwdCIsImNvbXBpbGVkU2NyaXB0IiwiX3VwZGF0ZWRBdCIsInZtU2NyaXB0IiwiaW5mbyIsImNyZWF0ZVNjcmlwdCIsInJ1bkluTmV3Q29udGV4dCIsIlNjcmlwdCIsInJlcGxhY2UiLCJzdGFjayIsImhhc1NjcmlwdEFuZE1ldGhvZCIsImV4ZWN1dGVTY3JpcHQiLCJwYXJhbXMiLCJmcm9tUHJvbWlzZSIsInRpbWVvdXQiLCJ3YWl0IiwiZXZlbnROYW1lQXJndW1lbnRzVG9PYmplY3QiLCJhcmdzIiwiYXJnT2JqZWN0IiwiYXJnaGhoIiwib3duZXIiLCJtYXBFdmVudEFyZ3NUb0RhdGEiLCJjaGFubmVsX2lkIiwiY2hhbm5lbF9uYW1lIiwibWVzc2FnZV9pZCIsInRpbWVzdGFtcCIsInRzIiwidXNlcl9pZCIsInUiLCJ0ZXh0IiwibXNnIiwiZWRpdGVkQXQiLCJpc0VkaXRlZCIsImNyZWF0ZWRBdCIsImV4ZWN1dGVUcmlnZ2VycyIsInRyaWdnZXJzVG9FeGVjdXRlIiwidXNlcm5hbWVzIiwicHVzaCIsImFsbF9kaXJlY3RfbWVzc2FnZXMiLCJhbGxfcHVibGljX2NoYW5uZWxzIiwiYWxsX3ByaXZhdGVfZ3JvdXBzIiwiX19hbnkiLCJ0cmlnZ2VyVG9FeGVjdXRlIiwiZXhlY3V0ZVRyaWdnZXIiLCJleGVjdXRlVHJpZ2dlclVybCIsInRoZUhpc3RvcnlJZCIsInRyaWVzIiwidHJpZ2dlcldvcmRBbnl3aGVyZSIsImluZGV4T2YiLCJ0b2tlbiIsInRyaWdnZXJfd29yZCIsIm9wdHMiLCJhdXRoIiwibnBtUmVxdWVzdE9wdGlvbnMiLCJyZWplY3RVbmF1dGhvcml6ZWQiLCJzZXR0aW5ncyIsInN0cmljdFNTTCIsImhlYWRlcnMiLCJyZXF1ZXN0IiwicHJlcGFyZU1lc3NhZ2UiLCJzdGF0dXNDb2RlIiwicmVzcG9uc2UiLCJzdGF0dXNfY29kZSIsImNvbnRlbnQiLCJjb250ZW50X3JhdyIsInNjcmlwdFJlc3VsdCIsIndhaXRUaW1lIiwiTWF0aCIsInBvdyIsImVyIiwiYXR0YWNobWVudHMiLCJyZXN1bHRNc2ciLCJyZXBsYXkiLCJNZXNzYWdlcyIsImZpbmRPbmVCeUlkIiwiX0Jhc2UiLCJmaW5kQnlUeXBlIiwiZGlzYWJsZUJ5VXNlcklkIiwibXVsdGkiLCJmaW5kQnlJbnRlZ3JhdGlvbklkIiwiZmluZEJ5SW50ZWdyYXRpb25JZEFuZENyZWF0ZWRCeSIsImNyZWF0b3JJZCIsImZpbmRPbmVCeUludGVncmF0aW9uSWRBbmRIaXN0b3J5SWQiLCJpbnRlZ3JhdGlvbklkIiwiZmluZEJ5RXZlbnROYW1lIiwiZmluZEZhaWxlZCIsInJlbW92ZUJ5SW50ZWdyYXRpb25JZCIsInJlbW92ZSIsInB1Ymxpc2giLCJfaW50ZWdyYXRpb25QdWJsaWNhdGlvbiIsInJlYWR5IiwiX2ludGVncmF0aW9uSGlzdG9yeVB1YmxpY2F0aW9uIiwibGltaXQiLCJzb3J0IiwibWV0aG9kcyIsImFkZEluY29taW5nSW50ZWdyYXRpb24iLCJpc1N0cmluZyIsImV4dGVuZCIsIl9jcmVhdGVkQnkiLCJSb2xlcyIsImFkZFVzZXJSb2xlcyIsInVwZGF0ZUluY29taW5nSW50ZWdyYXRpb24iLCJjdXJyZW50SW50ZWdyYXRpb24iLCJfdXBkYXRlZEJ5IiwiZGVsZXRlSW5jb21pbmdJbnRlZ3JhdGlvbiIsImFkZE91dGdvaW5nSW50ZWdyYXRpb24iLCJ1cGRhdGVPdXRnb2luZ0ludGVncmF0aW9uIiwicmVwbGF5T3V0Z29pbmdJbnRlZ3JhdGlvbiIsImRlbGV0ZU91dGdvaW5nSW50ZWdyYXRpb24iLCJjbGVhckludGVncmF0aW9uSGlzdG9yeSIsIkFwaSIsIlJlc3RpdnVzIiwiZW5hYmxlQ29ycyIsImFwaVBhdGgiLCJwYXlsb2FkS2V5cyIsImJvZHlQYXJhbXMiLCJwYXlsb2FkSXNXcmFwcGVkIiwicGF5bG9hZCIsInBhcnNlIiwiYm9keSIsInN1Y2Nlc3MiLCJkZWNvZGVVUklDb21wb25lbnQiLCJMaXZlY2hhdCIsIkFQSSIsInYxIiwiZmFpbHVyZSIsImNyZWF0ZUludGVncmF0aW9uIiwicnVuQXNVc2VyIiwidGFyZ2V0X3VybCIsInRyaWdnZXJfd29yZHMiLCJpbnRlZ3JhdGlvblRvUmVtb3ZlIiwiZXhlY3V0ZUludGVncmF0aW9uUmVzdCIsInVybFBhcmFtcyIsInNldEVuY29kaW5nIiwicmVhZCIsImhhc2giLCJfcGFyc2VkVXJsIiwic2VhcmNoIiwicXVlcnkiLCJxdWVyeVBhcmFtcyIsInBhdGhuYW1lIiwicGF0aCIsInVybF9yYXciLCJ1cmxfcGFyYW1zIiwic2NyaXB0UmVzcG9uc2UiLCJhZGRJbnRlZ3JhdGlvblJlc3QiLCJyZW1vdmVJbnRlZ3JhdGlvblJlc3QiLCJpbnRlZ3JhdGlvblNhbXBsZVJlc3QiLCJpbnRlZ3JhdGlvbkluZm9SZXN0IiwiYWRkUm91dGUiLCJhdXRoUmVxdWlyZWQiLCJwb3N0IiwiY2FsbGJhY2tIYW5kbGVyIiwiX2NhbGxiYWNrSGFuZGxlciIsImV2ZW50VHlwZSIsIl93cmFwcGVyRnVuY3Rpb24iLCJjYWxsYmFja3MiLCJhZGQiLCJwcmlvcml0eSIsIkxPVyIsIm1lc3NhZ2VPYmoiLCJtdXN0QmVKb2luZWQiLCJzZW50RGF0YSIsInJvb21JZCIsImNoYW5uZWxWYWx1ZSIsImpvaW5DaGFubmVsIiwidHJ5RGlyZWN0QnlVc2VySWRPbmx5IiwiaXNBcnJheSIsImxvZyIsInJlZCIsInBhcnNlVXJscyIsImdyb3VwYWJsZSIsImljb25fdXJsIiwiaWNvbl9lbW9qaSIsImF0dGFjaG1lbnQiLCJtZXNzYWdlUmV0dXJuIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxXQUFXQyxZQUFYLEdBQTBCO0FBQ3pCQyxrQkFBZ0I7QUFDZkMsaUJBQWE7QUFDWkMsYUFBTyx3Q0FESztBQUVaQyxhQUFPLGFBRks7QUFHWkMsV0FBSztBQUNKQyxpQkFBUyxJQURMO0FBRUpDLHNCQUFjLElBRlY7QUFHSkMsb0JBQVk7QUFIUjtBQUhPLEtBREU7QUFVZkMsa0JBQWM7QUFDYk4sYUFBTyx5Q0FETTtBQUViQyxhQUFPLGNBRk07QUFHYkMsV0FBSztBQUNKQyxpQkFBUyxJQURMO0FBRUpDLHNCQUFjLEtBRlY7QUFHSkMsb0JBQVk7QUFIUjtBQUhRLEtBVkM7QUFtQmZFLGtCQUFjO0FBQ2JQLGFBQU8seUNBRE07QUFFYkMsYUFBTyxjQUZNO0FBR2JDLFdBQUs7QUFDSkMsaUJBQVMsS0FETDtBQUVKQyxzQkFBYyxLQUZWO0FBR0pDLG9CQUFZO0FBSFI7QUFIUSxLQW5CQztBQTRCZkcsaUJBQWE7QUFDWlIsYUFBTyx3Q0FESztBQUVaQyxhQUFPLGFBRks7QUFHWkMsV0FBSztBQUNKQyxpQkFBUyxLQURMO0FBRUpDLHNCQUFjLEtBRlY7QUFHSkMsb0JBQVk7QUFIUjtBQUhPLEtBNUJFO0FBcUNmSSxnQkFBWTtBQUNYVCxhQUFPLHVDQURJO0FBRVhDLGFBQU8sWUFGSTtBQUdYQyxXQUFLO0FBQ0pDLGlCQUFTLElBREw7QUFFSkMsc0JBQWMsS0FGVjtBQUdKQyxvQkFBWTtBQUhSO0FBSE0sS0FyQ0c7QUE4Q2ZLLGNBQVU7QUFDVFYsYUFBTyxxQ0FERTtBQUVUQyxhQUFPLFVBRkU7QUFHVEMsV0FBSztBQUNKQyxpQkFBUyxJQURMO0FBRUpDLHNCQUFjLEtBRlY7QUFHSkMsb0JBQVk7QUFIUjtBQUhJLEtBOUNLO0FBdURm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QWM7QUFBRWhPLGFBQUY7QUFBV29KLGVBQVNzTjtBQUFwQixLQUFkO0FBQ0E7O0FBRUQsU0FBT2IsUUFBUDtBQUNBLENBaEZELEMiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfaW50ZWdyYXRpb25zLmpzIiwic291cmNlc0NvbnRlbnQiOlsiUm9ja2V0Q2hhdC5pbnRlZ3JhdGlvbnMgPSB7XG5cdG91dGdvaW5nRXZlbnRzOiB7XG5cdFx0c2VuZE1lc3NhZ2U6IHtcblx0XHRcdGxhYmVsOiAnSW50ZWdyYXRpb25zX091dGdvaW5nX1R5cGVfU2VuZE1lc3NhZ2UnLFxuXHRcdFx0dmFsdWU6ICdzZW5kTWVzc2FnZScsXG5cdFx0XHR1c2U6IHtcblx0XHRcdFx0Y2hhbm5lbDogdHJ1ZSxcblx0XHRcdFx0dHJpZ2dlcldvcmRzOiB0cnVlLFxuXHRcdFx0XHR0YXJnZXRSb29tOiBmYWxzZSxcblx0XHRcdH0sXG5cdFx0fSxcblx0XHRmaWxlVXBsb2FkZWQ6IHtcblx0XHRcdGxhYmVsOiAnSW50ZWdyYXRpb25zX091dGdvaW5nX1R5cGVfRmlsZVVwbG9hZGVkJyxcblx0XHRcdHZhbHVlOiAnZmlsZVVwbG9hZGVkJyxcblx0XHRcdHVzZToge1xuXHRcdFx0XHRjaGFubmVsOiB0cnVlLFxuXHRcdFx0XHR0cmlnZ2VyV29yZHM6IGZhbHNlLFxuXHRcdFx0XHR0YXJnZXRSb29tOiBmYWxzZSxcblx0XHRcdH0sXG5cdFx0fSxcblx0XHRyb29tQXJjaGl2ZWQ6IHtcblx0XHRcdGxhYmVsOiAnSW50ZWdyYXRpb25zX091dGdvaW5nX1R5cGVfUm9vbUFyY2hpdmVkJyxcblx0XHRcdHZhbHVlOiAncm9vbUFyY2hpdmVkJyxcblx0XHRcdHVzZToge1xuXHRcdFx0XHRjaGFubmVsOiBmYWxzZSxcblx0XHRcdFx0dHJpZ2dlcldvcmRzOiBmYWxzZSxcblx0XHRcdFx0dGFyZ2V0Um9vbTogZmFsc2UsXG5cdFx0XHR9LFxuXHRcdH0sXG5cdFx0cm9vbUNyZWF0ZWQ6IHtcblx0XHRcdGxhYmVsOiAnSW50ZWdyYXRpb25zX091dGdvaW5nX1R5cGVfUm9vbUNyZWF0ZWQnLFxuXHRcdFx0dmFsdWU6ICdyb29tQ3JlYXRlZCcsXG5cdFx0XHR1c2U6IHtcblx0XHRcdFx0Y2hhbm5lbDogZmFsc2UsXG5cdFx0XHRcdHRyaWdnZXJXb3JkczogZmFsc2UsXG5cdFx0XHRcdHRhcmdldFJvb206IGZhbHNlLFxuXHRcdFx0fSxcblx0XHR9LFxuXHRcdHJvb21Kb2luZWQ6IHtcblx0XHRcdGxhYmVsOiAnSW50ZWdyYXRpb25zX091dGdvaW5nX1R5cGVfUm9vbUpvaW5lZCcsXG5cdFx0XHR2YWx1ZTogJ3Jvb21Kb2luZWQnLFxuXHRcdFx0dXNlOiB7XG5cdFx0XHRcdGNoYW5uZWw6IHRydWUsXG5cdFx0XHRcdHRyaWdnZXJXb3JkczogZmFsc2UsXG5cdFx0XHRcdHRhcmdldFJvb206IGZhbHNlLFxuXHRcdFx0fSxcblx0XHR9LFxuXHRcdHJvb21MZWZ0OiB7XG5cdFx0XHRsYWJlbDogJ0ludGVncmF0aW9uc19PdXRnb2luZ19UeXBlX1Jvb21MZWZ0Jyxcblx0XHRcdHZhbHVlOiAncm9vbUxlZnQnLFxuXHRcdFx0dXNlOiB7XG5cdFx0XHRcdGNoYW5uZWw6IHRydWUsXG5cdFx0XHRcdHRyaWdnZXJXb3JkczogZmFsc2UsXG5cdFx0XHRcdHRhcmdldFJvb206IGZhbHNlLFxuXHRcdFx0fSxcblx0XHR9LFxuXHRcdHVzZXJDcmVhdGVkOiB7XG5cdFx0XHRsYWJlbDogJ0ludGVncmF0aW9uc19PdXRnb2luZ19UeXBlX1VzZXJDcmVhdGVkJyxcblx0XHRcdHZhbHVlOiAndXNlckNyZWF0ZWQnLFxuXHRcdFx0dXNlOiB7XG5cdFx0XHRcdGNoYW5uZWw6IGZhbHNlLFxuXHRcdFx0XHR0cmlnZ2VyV29yZHM6IGZhbHNlLFxuXHRcdFx0XHR0YXJnZXRSb29tOiB0cnVlLFxuXHRcdFx0fSxcblx0XHR9LFxuXHR9LFxufTtcbiIsIi8qIGdsb2JhbHMgbG9nZ2VyOnRydWUgKi9cbi8qIGV4cG9ydGVkIGxvZ2dlciAqL1xuXG5sb2dnZXIgPSBuZXcgTG9nZ2VyKCdJbnRlZ3JhdGlvbnMnLCB7XG5cdHNlY3Rpb25zOiB7XG5cdFx0aW5jb21pbmc6ICdJbmNvbWluZyBXZWJIb29rJyxcblx0XHRvdXRnb2luZzogJ091dGdvaW5nIFdlYkhvb2snLFxuXHR9LFxufSk7XG4iLCIvKiBnbG9iYWwgQmFiZWwgKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuY29uc3Qgc2NvcGVkQ2hhbm5lbHMgPSBbJ2FsbF9wdWJsaWNfY2hhbm5lbHMnLCAnYWxsX3ByaXZhdGVfZ3JvdXBzJywgJ2FsbF9kaXJlY3RfbWVzc2FnZXMnXTtcbmNvbnN0IHZhbGlkQ2hhbm5lbENoYXJzID0gWydAJywgJyMnXTtcblxuZnVuY3Rpb24gX3ZlcmlmeVJlcXVpcmVkRmllbGRzKGludGVncmF0aW9uKSB7XG5cdGlmICghaW50ZWdyYXRpb24uZXZlbnQgfHwgIU1hdGNoLnRlc3QoaW50ZWdyYXRpb24uZXZlbnQsIFN0cmluZykgfHwgaW50ZWdyYXRpb24uZXZlbnQudHJpbSgpID09PSAnJyB8fCAhUm9ja2V0Q2hhdC5pbnRlZ3JhdGlvbnMub3V0Z29pbmdFdmVudHNbaW50ZWdyYXRpb24uZXZlbnRdKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1ldmVudC10eXBlJywgJ0ludmFsaWQgZXZlbnQgdHlwZScsIHsgZnVuY3Rpb246ICd2YWxpZGF0ZU91dGdvaW5nLl92ZXJpZnlSZXF1aXJlZEZpZWxkcycgfSk7XG5cdH1cblxuXHRpZiAoIWludGVncmF0aW9uLnVzZXJuYW1lIHx8ICFNYXRjaC50ZXN0KGludGVncmF0aW9uLnVzZXJuYW1lLCBTdHJpbmcpIHx8IGludGVncmF0aW9uLnVzZXJuYW1lLnRyaW0oKSA9PT0gJycpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXJuYW1lJywgJ0ludmFsaWQgdXNlcm5hbWUnLCB7IGZ1bmN0aW9uOiAndmFsaWRhdGVPdXRnb2luZy5fdmVyaWZ5UmVxdWlyZWRGaWVsZHMnIH0pO1xuXHR9XG5cblx0aWYgKFJvY2tldENoYXQuaW50ZWdyYXRpb25zLm91dGdvaW5nRXZlbnRzW2ludGVncmF0aW9uLmV2ZW50XS51c2UudGFyZ2V0Um9vbSAmJiAhaW50ZWdyYXRpb24udGFyZ2V0Um9vbSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdGFyZ2V0Um9vbScsICdJbnZhbGlkIFRhcmdldCBSb29tJywgeyBmdW5jdGlvbjogJ3ZhbGlkYXRlT3V0Z29pbmcuX3ZlcmlmeVJlcXVpcmVkRmllbGRzJyB9KTtcblx0fVxuXG5cdGlmICghTWF0Y2gudGVzdChpbnRlZ3JhdGlvbi51cmxzLCBbU3RyaW5nXSkpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVybHMnLCAnSW52YWxpZCBVUkxzJywgeyBmdW5jdGlvbjogJ3ZhbGlkYXRlT3V0Z29pbmcuX3ZlcmlmeVJlcXVpcmVkRmllbGRzJyB9KTtcblx0fVxuXG5cdGZvciAoY29uc3QgW2luZGV4LCB1cmxdIG9mIGludGVncmF0aW9uLnVybHMuZW50cmllcygpKSB7XG5cdFx0aWYgKHVybC50cmltKCkgPT09ICcnKSB7XG5cdFx0XHRkZWxldGUgaW50ZWdyYXRpb24udXJsc1tpbmRleF07XG5cdFx0fVxuXHR9XG5cblx0aW50ZWdyYXRpb24udXJscyA9IF8ud2l0aG91dChpbnRlZ3JhdGlvbi51cmxzLCBbdW5kZWZpbmVkXSk7XG5cblx0aWYgKGludGVncmF0aW9uLnVybHMubGVuZ3RoID09PSAwKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11cmxzJywgJ0ludmFsaWQgVVJMcycsIHsgZnVuY3Rpb246ICd2YWxpZGF0ZU91dGdvaW5nLl92ZXJpZnlSZXF1aXJlZEZpZWxkcycgfSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gX3ZlcmlmeVVzZXJIYXNQZXJtaXNzaW9uRm9yQ2hhbm5lbHMoaW50ZWdyYXRpb24sIHVzZXJJZCwgY2hhbm5lbHMpIHtcblx0Zm9yIChsZXQgY2hhbm5lbCBvZiBjaGFubmVscykge1xuXHRcdGlmIChzY29wZWRDaGFubmVscy5pbmNsdWRlcyhjaGFubmVsKSkge1xuXHRcdFx0aWYgKGNoYW5uZWwgPT09ICdhbGxfcHVibGljX2NoYW5uZWxzJykge1xuXHRcdFx0XHQvLyBObyBzcGVjaWFsIHBlcm1pc3Npb25zIG5lZWRlZCB0byBhZGQgaW50ZWdyYXRpb24gdG8gcHVibGljIGNoYW5uZWxzXG5cdFx0XHR9IGVsc2UgaWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAnbWFuYWdlLWludGVncmF0aW9ucycpKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtY2hhbm5lbCcsICdJbnZhbGlkIENoYW5uZWwnLCB7IGZ1bmN0aW9uOiAndmFsaWRhdGVPdXRnb2luZy5fdmVyaWZ5VXNlckhhc1Blcm1pc3Npb25Gb3JDaGFubmVscycgfSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxldCByZWNvcmQ7XG5cdFx0XHRjb25zdCBjaGFubmVsVHlwZSA9IGNoYW5uZWxbMF07XG5cdFx0XHRjaGFubmVsID0gY2hhbm5lbC5zdWJzdHIoMSk7XG5cblx0XHRcdHN3aXRjaCAoY2hhbm5lbFR5cGUpIHtcblx0XHRcdFx0Y2FzZSAnIyc6XG5cdFx0XHRcdFx0cmVjb3JkID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZSh7XG5cdFx0XHRcdFx0XHQkb3I6IFtcblx0XHRcdFx0XHRcdFx0eyBfaWQ6IGNoYW5uZWwgfSxcblx0XHRcdFx0XHRcdFx0eyBuYW1lOiBjaGFubmVsIH0sXG5cdFx0XHRcdFx0XHRdLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdAJzpcblx0XHRcdFx0XHRyZWNvcmQgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHtcblx0XHRcdFx0XHRcdCRvcjogW1xuXHRcdFx0XHRcdFx0XHR7IF9pZDogY2hhbm5lbCB9LFxuXHRcdFx0XHRcdFx0XHR7IHVzZXJuYW1lOiBjaGFubmVsIH0sXG5cdFx0XHRcdFx0XHRdLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIXJlY29yZCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywgeyBmdW5jdGlvbjogJ3ZhbGlkYXRlT3V0Z29pbmcuX3ZlcmlmeVVzZXJIYXNQZXJtaXNzaW9uRm9yQ2hhbm5lbHMnIH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzQWxsUGVybWlzc2lvbih1c2VySWQsICdtYW5hZ2UtaW50ZWdyYXRpb25zJywgJ21hbmFnZS1vd24taW50ZWdyYXRpb25zJykgJiYgIVJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHJlY29yZC5faWQsIHVzZXJJZCwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSkpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1jaGFubmVsJywgJ0ludmFsaWQgQ2hhbm5lbCcsIHsgZnVuY3Rpb246ICd2YWxpZGF0ZU91dGdvaW5nLl92ZXJpZnlVc2VySGFzUGVybWlzc2lvbkZvckNoYW5uZWxzJyB9KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gX3ZlcmlmeVJldHJ5SW5mb3JtYXRpb24oaW50ZWdyYXRpb24pIHtcblx0aWYgKCFpbnRlZ3JhdGlvbi5yZXRyeUZhaWxlZENhbGxzKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Ly8gRG9uJ3QgYWxsb3cgbmVnYXRpdmUgcmV0cnkgY291bnRzXG5cdGludGVncmF0aW9uLnJldHJ5Q291bnQgPSBpbnRlZ3JhdGlvbi5yZXRyeUNvdW50ICYmIHBhcnNlSW50KGludGVncmF0aW9uLnJldHJ5Q291bnQpID4gMCA/IHBhcnNlSW50KGludGVncmF0aW9uLnJldHJ5Q291bnQpIDogNDtcblx0aW50ZWdyYXRpb24ucmV0cnlEZWxheSA9ICFpbnRlZ3JhdGlvbi5yZXRyeURlbGF5IHx8ICFpbnRlZ3JhdGlvbi5yZXRyeURlbGF5LnRyaW0oKSA/ICdwb3dlcnMtb2YtdGVuJyA6IGludGVncmF0aW9uLnJldHJ5RGVsYXkudG9Mb3dlckNhc2UoKTtcbn1cblxuUm9ja2V0Q2hhdC5pbnRlZ3JhdGlvbnMudmFsaWRhdGVPdXRnb2luZyA9IGZ1bmN0aW9uIF92YWxpZGF0ZU91dGdvaW5nKGludGVncmF0aW9uLCB1c2VySWQpIHtcblx0aWYgKGludGVncmF0aW9uLmNoYW5uZWwgJiYgTWF0Y2gudGVzdChpbnRlZ3JhdGlvbi5jaGFubmVsLCBTdHJpbmcpICYmIGludGVncmF0aW9uLmNoYW5uZWwudHJpbSgpID09PSAnJykge1xuXHRcdGRlbGV0ZSBpbnRlZ3JhdGlvbi5jaGFubmVsO1xuXHR9XG5cblx0Ly8gTW92ZWQgdG8gaXQncyBvd24gZnVuY3Rpb24gdG8gc3RhdGlzZnkgdGhlIGNvbXBsZXhpdHkgcnVsZVxuXHRfdmVyaWZ5UmVxdWlyZWRGaWVsZHMoaW50ZWdyYXRpb24pO1xuXG5cdGxldCBjaGFubmVscyA9IFtdO1xuXHRpZiAoUm9ja2V0Q2hhdC5pbnRlZ3JhdGlvbnMub3V0Z29pbmdFdmVudHNbaW50ZWdyYXRpb24uZXZlbnRdLnVzZS5jaGFubmVsKSB7XG5cdFx0aWYgKCFNYXRjaC50ZXN0KGludGVncmF0aW9uLmNoYW5uZWwsIFN0cmluZykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtY2hhbm5lbCcsICdJbnZhbGlkIENoYW5uZWwnLCB7IGZ1bmN0aW9uOiAndmFsaWRhdGVPdXRnb2luZycgfSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNoYW5uZWxzID0gXy5tYXAoaW50ZWdyYXRpb24uY2hhbm5lbC5zcGxpdCgnLCcpLCAoY2hhbm5lbCkgPT4gcy50cmltKGNoYW5uZWwpKTtcblxuXHRcdFx0Zm9yIChjb25zdCBjaGFubmVsIG9mIGNoYW5uZWxzKSB7XG5cdFx0XHRcdGlmICghdmFsaWRDaGFubmVsQ2hhcnMuaW5jbHVkZXMoY2hhbm5lbFswXSkgJiYgIXNjb3BlZENoYW5uZWxzLmluY2x1ZGVzKGNoYW5uZWwudG9Mb3dlckNhc2UoKSkpIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWNoYW5uZWwtc3RhcnQtd2l0aC1jaGFycycsICdJbnZhbGlkIGNoYW5uZWwuIFN0YXJ0IHdpdGggQCBvciAjJywgeyBmdW5jdGlvbjogJ3ZhbGlkYXRlT3V0Z29pbmcnIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2UgaWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAnbWFuYWdlLWludGVncmF0aW9ucycpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1wZXJtaXNzaW9ucycsICdJbnZhbGlkIHBlcm1pc3Npb24gZm9yIHJlcXVpcmVkIEludGVncmF0aW9uIGNyZWF0aW9uLicsIHsgZnVuY3Rpb246ICd2YWxpZGF0ZU91dGdvaW5nJyB9KTtcblx0fVxuXG5cdGlmIChSb2NrZXRDaGF0LmludGVncmF0aW9ucy5vdXRnb2luZ0V2ZW50c1tpbnRlZ3JhdGlvbi5ldmVudF0udXNlLnRyaWdnZXJXb3JkcyAmJiBpbnRlZ3JhdGlvbi50cmlnZ2VyV29yZHMpIHtcblx0XHRpZiAoIU1hdGNoLnRlc3QoaW50ZWdyYXRpb24udHJpZ2dlcldvcmRzLCBbU3RyaW5nXSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdHJpZ2dlcldvcmRzJywgJ0ludmFsaWQgdHJpZ2dlcldvcmRzJywgeyBmdW5jdGlvbjogJ3ZhbGlkYXRlT3V0Z29pbmcnIH0pO1xuXHRcdH1cblxuXHRcdGludGVncmF0aW9uLnRyaWdnZXJXb3Jkcy5mb3JFYWNoKCh3b3JkLCBpbmRleCkgPT4ge1xuXHRcdFx0aWYgKCF3b3JkIHx8IHdvcmQudHJpbSgpID09PSAnJykge1xuXHRcdFx0XHRkZWxldGUgaW50ZWdyYXRpb24udHJpZ2dlcldvcmRzW2luZGV4XTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGludGVncmF0aW9uLnRyaWdnZXJXb3JkcyA9IF8ud2l0aG91dChpbnRlZ3JhdGlvbi50cmlnZ2VyV29yZHMsIFt1bmRlZmluZWRdKTtcblx0fSBlbHNlIHtcblx0XHRkZWxldGUgaW50ZWdyYXRpb24udHJpZ2dlcldvcmRzO1xuXHR9XG5cblx0aWYgKGludGVncmF0aW9uLnNjcmlwdEVuYWJsZWQgPT09IHRydWUgJiYgaW50ZWdyYXRpb24uc2NyaXB0ICYmIGludGVncmF0aW9uLnNjcmlwdC50cmltKCkgIT09ICcnKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IGJhYmVsT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oQmFiZWwuZ2V0RGVmYXVsdE9wdGlvbnMoeyBydW50aW1lOiBmYWxzZSB9KSwgeyBjb21wYWN0OiB0cnVlLCBtaW5pZmllZDogdHJ1ZSwgY29tbWVudHM6IGZhbHNlIH0pO1xuXG5cdFx0XHRpbnRlZ3JhdGlvbi5zY3JpcHRDb21waWxlZCA9IEJhYmVsLmNvbXBpbGUoaW50ZWdyYXRpb24uc2NyaXB0LCBiYWJlbE9wdGlvbnMpLmNvZGU7XG5cdFx0XHRpbnRlZ3JhdGlvbi5zY3JpcHRFcnJvciA9IHVuZGVmaW5lZDtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRpbnRlZ3JhdGlvbi5zY3JpcHRDb21waWxlZCA9IHVuZGVmaW5lZDtcblx0XHRcdGludGVncmF0aW9uLnNjcmlwdEVycm9yID0gXy5waWNrKGUsICduYW1lJywgJ21lc3NhZ2UnLCAnc3RhY2snKTtcblx0XHR9XG5cdH1cblxuXHRpZiAodHlwZW9mIGludGVncmF0aW9uLnJ1bk9uRWRpdHMgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0Ly8gVmVyaWZ5IHRoaXMgdmFsdWUgaXMgb25seSB0cnVlL2ZhbHNlXG5cdFx0aW50ZWdyYXRpb24ucnVuT25FZGl0cyA9IGludGVncmF0aW9uLnJ1bk9uRWRpdHMgPT09IHRydWU7XG5cdH1cblxuXHRfdmVyaWZ5VXNlckhhc1Blcm1pc3Npb25Gb3JDaGFubmVscyhpbnRlZ3JhdGlvbiwgdXNlcklkLCBjaGFubmVscyk7XG5cdF92ZXJpZnlSZXRyeUluZm9ybWF0aW9uKGludGVncmF0aW9uKTtcblxuXHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZSh7IHVzZXJuYW1lOiBpbnRlZ3JhdGlvbi51c2VybmFtZSB9KTtcblxuXHRpZiAoIXVzZXIpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyIChkaWQgeW91IGRlbGV0ZSB0aGUgYHJvY2tldC5jYXRgIHVzZXI/KScsIHsgZnVuY3Rpb246ICd2YWxpZGF0ZU91dGdvaW5nJyB9KTtcblx0fVxuXG5cdGludGVncmF0aW9uLnR5cGUgPSAnd2ViaG9vay1vdXRnb2luZyc7XG5cdGludGVncmF0aW9uLnVzZXJJZCA9IHVzZXIuX2lkO1xuXHRpbnRlZ3JhdGlvbi5jaGFubmVsID0gY2hhbm5lbHM7XG5cblx0cmV0dXJuIGludGVncmF0aW9uO1xufTtcbiIsIi8qIGdsb2JhbCBsb2dnZXIsIHByb2Nlc3NXZWJob29rTWVzc2FnZSAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgdm0gZnJvbSAndm0nO1xuaW1wb3J0IEZpYmVyIGZyb20gJ2ZpYmVycyc7XG5pbXBvcnQgRnV0dXJlIGZyb20gJ2ZpYmVycy9mdXR1cmUnO1xuXG5Sb2NrZXRDaGF0LmludGVncmF0aW9ucy50cmlnZ2VySGFuZGxlciA9IG5ldyBjbGFzcyBSb2NrZXRDaGF0SW50ZWdyYXRpb25IYW5kbGVyIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dGhpcy52bSA9IHZtO1xuXHRcdHRoaXMuc3VjY2Vzc1Jlc3VsdHMgPSBbMjAwLCAyMDEsIDIwMl07XG5cdFx0dGhpcy5jb21waWxlZFNjcmlwdHMgPSB7fTtcblx0XHR0aGlzLnRyaWdnZXJzID0ge307XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZCh7IHR5cGU6ICd3ZWJob29rLW91dGdvaW5nJyB9KS5vYnNlcnZlKHtcblx0XHRcdGFkZGVkOiAocmVjb3JkKSA9PiB7XG5cdFx0XHRcdHRoaXMuYWRkSW50ZWdyYXRpb24ocmVjb3JkKTtcblx0XHRcdH0sXG5cblx0XHRcdGNoYW5nZWQ6IChyZWNvcmQpID0+IHtcblx0XHRcdFx0dGhpcy5yZW1vdmVJbnRlZ3JhdGlvbihyZWNvcmQpO1xuXHRcdFx0XHR0aGlzLmFkZEludGVncmF0aW9uKHJlY29yZCk7XG5cdFx0XHR9LFxuXG5cdFx0XHRyZW1vdmVkOiAocmVjb3JkKSA9PiB7XG5cdFx0XHRcdHRoaXMucmVtb3ZlSW50ZWdyYXRpb24ocmVjb3JkKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH1cblxuXHRhZGRJbnRlZ3JhdGlvbihyZWNvcmQpIHtcblx0XHRsb2dnZXIub3V0Z29pbmcuZGVidWcoYEFkZGluZyB0aGUgaW50ZWdyYXRpb24gJHsgcmVjb3JkLm5hbWUgfSBvZiB0aGUgZXZlbnQgJHsgcmVjb3JkLmV2ZW50IH0hYCk7XG5cdFx0bGV0IGNoYW5uZWxzO1xuXHRcdGlmIChyZWNvcmQuZXZlbnQgJiYgIVJvY2tldENoYXQuaW50ZWdyYXRpb25zLm91dGdvaW5nRXZlbnRzW3JlY29yZC5ldmVudF0udXNlLmNoYW5uZWwpIHtcblx0XHRcdGxvZ2dlci5vdXRnb2luZy5kZWJ1ZygnVGhlIGludGVncmF0aW9uIGRvZXNudCByZWx5IG9uIGNoYW5uZWxzLicpO1xuXHRcdFx0Ly8gV2UgZG9uJ3QgdXNlIGFueSBjaGFubmVscywgc28gaXQncyBzcGVjaWFsIDspXG5cdFx0XHRjaGFubmVscyA9IFsnX19hbnknXTtcblx0XHR9IGVsc2UgaWYgKF8uaXNFbXB0eShyZWNvcmQuY2hhbm5lbCkpIHtcblx0XHRcdGxvZ2dlci5vdXRnb2luZy5kZWJ1ZygnVGhlIGludGVncmF0aW9uIGhhZCBhbiBlbXB0eSBjaGFubmVsIHByb3BlcnR5LCBzbyBpdCBpcyBnb2luZyBvbiBhbGwgdGhlIHB1YmxpYyBjaGFubmVscy4nKTtcblx0XHRcdGNoYW5uZWxzID0gWydhbGxfcHVibGljX2NoYW5uZWxzJ107XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxvZ2dlci5vdXRnb2luZy5kZWJ1ZygnVGhlIGludGVncmF0aW9uIGlzIGdvaW5nIG9uIHRoZXNlIGNoYW5uZWxzOicsIHJlY29yZC5jaGFubmVsKTtcblx0XHRcdGNoYW5uZWxzID0gW10uY29uY2F0KHJlY29yZC5jaGFubmVsKTtcblx0XHR9XG5cblx0XHRmb3IgKGNvbnN0IGNoYW5uZWwgb2YgY2hhbm5lbHMpIHtcblx0XHRcdGlmICghdGhpcy50cmlnZ2Vyc1tjaGFubmVsXSkge1xuXHRcdFx0XHR0aGlzLnRyaWdnZXJzW2NoYW5uZWxdID0ge307XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudHJpZ2dlcnNbY2hhbm5lbF1bcmVjb3JkLl9pZF0gPSByZWNvcmQ7XG5cdFx0fVxuXHR9XG5cblx0cmVtb3ZlSW50ZWdyYXRpb24ocmVjb3JkKSB7XG5cdFx0Zm9yIChjb25zdCB0cmlnZ2VyIG9mIE9iamVjdC52YWx1ZXModGhpcy50cmlnZ2VycykpIHtcblx0XHRcdGRlbGV0ZSB0cmlnZ2VyW3JlY29yZC5faWRdO1xuXHRcdH1cblx0fVxuXG5cdGlzVHJpZ2dlckVuYWJsZWQodHJpZ2dlcikge1xuXHRcdGZvciAoY29uc3QgdHJpZyBvZiBPYmplY3QudmFsdWVzKHRoaXMudHJpZ2dlcnMpKSB7XG5cdFx0XHRpZiAodHJpZ1t0cmlnZ2VyLl9pZF0pIHtcblx0XHRcdFx0cmV0dXJuIHRyaWdbdHJpZ2dlci5faWRdLmVuYWJsZWQ7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dXBkYXRlSGlzdG9yeSh7IGhpc3RvcnlJZCwgc3RlcCwgaW50ZWdyYXRpb24sIGV2ZW50LCBkYXRhLCB0cmlnZ2VyV29yZCwgcmFuUHJlcGFyZVNjcmlwdCwgcHJlcGFyZVNlbnRNZXNzYWdlLCBwcm9jZXNzU2VudE1lc3NhZ2UsIHJlc3VsdE1lc3NhZ2UsIGZpbmlzaGVkLCB1cmwsIGh0dHBDYWxsRGF0YSwgaHR0cEVycm9yLCBodHRwUmVzdWx0LCBlcnJvciwgZXJyb3JTdGFjayB9KSB7XG5cdFx0Y29uc3QgaGlzdG9yeSA9IHtcblx0XHRcdHR5cGU6ICdvdXRnb2luZy13ZWJob29rJyxcblx0XHRcdHN0ZXAsXG5cdFx0fTtcblxuXHRcdC8vIFVzdWFsbHkgaXMgb25seSBhZGRlZCBvbiBpbml0aWFsIGluc2VydFxuXHRcdGlmIChpbnRlZ3JhdGlvbikge1xuXHRcdFx0aGlzdG9yeS5pbnRlZ3JhdGlvbiA9IGludGVncmF0aW9uO1xuXHRcdH1cblxuXHRcdC8vIFVzdWFsbHkgaXMgb25seSBhZGRlZCBvbiBpbml0aWFsIGluc2VydFxuXHRcdGlmIChldmVudCkge1xuXHRcdFx0aGlzdG9yeS5ldmVudCA9IGV2ZW50O1xuXHRcdH1cblxuXHRcdGlmIChkYXRhKSB7XG5cdFx0XHRoaXN0b3J5LmRhdGEgPSB7IC4uLmRhdGEgfTtcblxuXHRcdFx0aWYgKGRhdGEudXNlcikge1xuXHRcdFx0XHRoaXN0b3J5LmRhdGEudXNlciA9IF8ub21pdChkYXRhLnVzZXIsIFsnc2VydmljZXMnXSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChkYXRhLnJvb20pIHtcblx0XHRcdFx0aGlzdG9yeS5kYXRhLnJvb20gPSBkYXRhLnJvb207XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRyaWdnZXJXb3JkKSB7XG5cdFx0XHRoaXN0b3J5LnRyaWdnZXJXb3JkID0gdHJpZ2dlcldvcmQ7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiByYW5QcmVwYXJlU2NyaXB0ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0aGlzdG9yeS5yYW5QcmVwYXJlU2NyaXB0ID0gcmFuUHJlcGFyZVNjcmlwdDtcblx0XHR9XG5cblx0XHRpZiAocHJlcGFyZVNlbnRNZXNzYWdlKSB7XG5cdFx0XHRoaXN0b3J5LnByZXBhcmVTZW50TWVzc2FnZSA9IHByZXBhcmVTZW50TWVzc2FnZTtcblx0XHR9XG5cblx0XHRpZiAocHJvY2Vzc1NlbnRNZXNzYWdlKSB7XG5cdFx0XHRoaXN0b3J5LnByb2Nlc3NTZW50TWVzc2FnZSA9IHByb2Nlc3NTZW50TWVzc2FnZTtcblx0XHR9XG5cblx0XHRpZiAocmVzdWx0TWVzc2FnZSkge1xuXHRcdFx0aGlzdG9yeS5yZXN1bHRNZXNzYWdlID0gcmVzdWx0TWVzc2FnZTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIGZpbmlzaGVkICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0aGlzdG9yeS5maW5pc2hlZCA9IGZpbmlzaGVkO1xuXHRcdH1cblxuXHRcdGlmICh1cmwpIHtcblx0XHRcdGhpc3RvcnkudXJsID0gdXJsO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgaHR0cENhbGxEYXRhICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0aGlzdG9yeS5odHRwQ2FsbERhdGEgPSBodHRwQ2FsbERhdGE7XG5cdFx0fVxuXG5cdFx0aWYgKGh0dHBFcnJvcikge1xuXHRcdFx0aGlzdG9yeS5odHRwRXJyb3IgPSBodHRwRXJyb3I7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiBodHRwUmVzdWx0ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0aGlzdG9yeS5odHRwUmVzdWx0ID0gSlNPTi5zdHJpbmdpZnkoaHR0cFJlc3VsdCwgbnVsbCwgMik7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiBlcnJvciAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdGhpc3RvcnkuZXJyb3IgPSBlcnJvcjtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIGVycm9yU3RhY2sgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRoaXN0b3J5LmVycm9yU3RhY2sgPSBlcnJvclN0YWNrO1xuXHRcdH1cblxuXHRcdGlmIChoaXN0b3J5SWQpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9uSGlzdG9yeS51cGRhdGUoeyBfaWQ6IGhpc3RvcnlJZCB9LCB7ICRzZXQ6IGhpc3RvcnkgfSk7XG5cdFx0XHRyZXR1cm4gaGlzdG9yeUlkO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRoaXN0b3J5Ll9jcmVhdGVkQXQgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9uSGlzdG9yeS5pbnNlcnQoT2JqZWN0LmFzc2lnbih7IF9pZDogUmFuZG9tLmlkKCkgfSwgaGlzdG9yeSkpO1xuXHRcdH1cblx0fVxuXG5cdC8vIFRyaWdnZXIgaXMgdGhlIHRyaWdnZXIsIG5hbWVPcklkIGlzIGEgc3RyaW5nIHdoaWNoIGlzIHVzZWQgdG8gdHJ5IGFuZCBmaW5kIGEgcm9vbSwgcm9vbSBpcyBhIHJvb20sIG1lc3NhZ2UgaXMgYSBtZXNzYWdlLCBhbmQgZGF0YSBjb250YWlucyBcInVzZXJfbmFtZVwiIGlmIHRyaWdnZXIuaW1wZXJzb25hdGVVc2VyIGlzIHRydXRoZnVsLlxuXHRzZW5kTWVzc2FnZSh7IHRyaWdnZXIsIG5hbWVPcklkID0gJycsIHJvb20sIG1lc3NhZ2UsIGRhdGEgfSkge1xuXHRcdGxldCB1c2VyO1xuXHRcdC8vIFRyeSB0byBmaW5kIHRoZSB1c2VyIHdobyB3ZSBhcmUgaW1wZXJzb25hdGluZ1xuXHRcdGlmICh0cmlnZ2VyLmltcGVyc29uYXRlVXNlcikge1xuXHRcdFx0dXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeVVzZXJuYW1lKGRhdGEudXNlcl9uYW1lKTtcblx0XHR9XG5cblx0XHQvLyBJZiB0aGV5IGRvbid0IGV4aXN0IChha2EgdGhlIHRyaWdnZXIgZGlkbid0IGNvbnRhaW4gYSB1c2VyKSB0aGVuIHdlIHNldCB0aGUgdXNlciBiYXNlZCB1cG9uIHRoZVxuXHRcdC8vIGNvbmZpZ3VyZWQgdXNlcm5hbWUgZm9yIHRoZSBpbnRlZ3JhdGlvbiBzaW5jZSB0aGlzIGlzIHJlcXVpcmVkIGF0IGFsbCB0aW1lcy5cblx0XHRpZiAoIXVzZXIpIHtcblx0XHRcdHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlVc2VybmFtZSh0cmlnZ2VyLnVzZXJuYW1lKTtcblx0XHR9XG5cblx0XHRsZXQgdG1wUm9vbTtcblx0XHRpZiAobmFtZU9ySWQgfHwgdHJpZ2dlci50YXJnZXRSb29tIHx8IG1lc3NhZ2UuY2hhbm5lbCkge1xuXHRcdFx0dG1wUm9vbSA9IFJvY2tldENoYXQuZ2V0Um9vbUJ5TmFtZU9ySWRXaXRoT3B0aW9uVG9Kb2luKHsgY3VycmVudFVzZXJJZDogdXNlci5faWQsIG5hbWVPcklkOiBuYW1lT3JJZCB8fCBtZXNzYWdlLmNoYW5uZWwgfHwgdHJpZ2dlci50YXJnZXRSb29tLCBlcnJvck9uRW1wdHk6IGZhbHNlIH0pIHx8IHJvb207XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRtcFJvb20gPSByb29tO1xuXHRcdH1cblxuXHRcdC8vIElmIG5vIHJvb20gY291bGQgYmUgZm91bmQsIHdlIHdvbid0IGJlIHNlbmRpbmcgYW55IG1lc3NhZ2VzIGJ1dCB3ZSdsbCB3YXJuIGluIHRoZSBsb2dzXG5cdFx0aWYgKCF0bXBSb29tKSB7XG5cdFx0XHRsb2dnZXIub3V0Z29pbmcud2FybihgVGhlIEludGVncmF0aW9uIFwiJHsgdHJpZ2dlci5uYW1lIH1cIiBkb2Vzbid0IGhhdmUgYSByb29tIGNvbmZpZ3VyZWQgbm9yIGRpZCBpdCBwcm92aWRlIGEgcm9vbSB0byBzZW5kIHRoZSBtZXNzYWdlIHRvLmApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGxvZ2dlci5vdXRnb2luZy5kZWJ1ZyhgRm91bmQgYSByb29tIGZvciAkeyB0cmlnZ2VyLm5hbWUgfSB3aGljaCBpczogJHsgdG1wUm9vbS5uYW1lIH0gd2l0aCBhIHR5cGUgb2YgJHsgdG1wUm9vbS50IH1gKTtcblxuXHRcdG1lc3NhZ2UuYm90ID0geyBpOiB0cmlnZ2VyLl9pZCB9O1xuXG5cdFx0Y29uc3QgZGVmYXVsdFZhbHVlcyA9IHtcblx0XHRcdGFsaWFzOiB0cmlnZ2VyLmFsaWFzLFxuXHRcdFx0YXZhdGFyOiB0cmlnZ2VyLmF2YXRhcixcblx0XHRcdGVtb2ppOiB0cmlnZ2VyLmVtb2ppLFxuXHRcdH07XG5cblx0XHRpZiAodG1wUm9vbS50ID09PSAnZCcpIHtcblx0XHRcdG1lc3NhZ2UuY2hhbm5lbCA9IGBAJHsgdG1wUm9vbS5faWQgfWA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1lc3NhZ2UuY2hhbm5lbCA9IGAjJHsgdG1wUm9vbS5faWQgfWA7XG5cdFx0fVxuXG5cdFx0bWVzc2FnZSA9IHByb2Nlc3NXZWJob29rTWVzc2FnZShtZXNzYWdlLCB1c2VyLCBkZWZhdWx0VmFsdWVzKTtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdGJ1aWxkU2FuZGJveChzdG9yZSA9IHt9KSB7XG5cdFx0Y29uc3Qgc2FuZGJveCA9IHtcblx0XHRcdHNjcmlwdFRpbWVvdXQocmVqZWN0KSB7XG5cdFx0XHRcdHJldHVybiBzZXRUaW1lb3V0KCgpID0+IHJlamVjdCgndGltZWQgb3V0JyksIDMwMDApO1xuXHRcdFx0fSxcblx0XHRcdF8sXG5cdFx0XHRzLFxuXHRcdFx0Y29uc29sZSxcblx0XHRcdG1vbWVudCxcblx0XHRcdEZpYmVyLFxuXHRcdFx0UHJvbWlzZSxcblx0XHRcdFN0b3JlOiB7XG5cdFx0XHRcdHNldDogKGtleSwgdmFsKSA9PiBzdG9yZVtrZXldID0gdmFsLFxuXHRcdFx0XHRnZXQ6IChrZXkpID0+IHN0b3JlW2tleV0sXG5cdFx0XHR9LFxuXHRcdFx0SFRUUDogKG1ldGhvZCwgdXJsLCBvcHRpb25zKSA9PiB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHJlc3VsdDogSFRUUC5jYWxsKG1ldGhvZCwgdXJsLCBvcHRpb25zKSxcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHRcdHJldHVybiB7IGVycm9yIH07XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdE9iamVjdC5rZXlzKFJvY2tldENoYXQubW9kZWxzKS5maWx0ZXIoKGspID0+ICFrLnN0YXJ0c1dpdGgoJ18nKSkuZm9yRWFjaCgoaykgPT4ge1xuXHRcdFx0c2FuZGJveFtrXSA9IFJvY2tldENoYXQubW9kZWxzW2tdO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHsgc3RvcmUsIHNhbmRib3ggfTtcblx0fVxuXG5cdGdldEludGVncmF0aW9uU2NyaXB0KGludGVncmF0aW9uKSB7XG5cdFx0Y29uc3QgY29tcGlsZWRTY3JpcHQgPSB0aGlzLmNvbXBpbGVkU2NyaXB0c1tpbnRlZ3JhdGlvbi5faWRdO1xuXHRcdGlmIChjb21waWxlZFNjcmlwdCAmJiArY29tcGlsZWRTY3JpcHQuX3VwZGF0ZWRBdCA9PT0gK2ludGVncmF0aW9uLl91cGRhdGVkQXQpIHtcblx0XHRcdHJldHVybiBjb21waWxlZFNjcmlwdC5zY3JpcHQ7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2NyaXB0ID0gaW50ZWdyYXRpb24uc2NyaXB0Q29tcGlsZWQ7XG5cdFx0Y29uc3QgeyBzdG9yZSwgc2FuZGJveCB9ID0gdGhpcy5idWlsZFNhbmRib3goKTtcblxuXHRcdGxldCB2bVNjcmlwdDtcblx0XHR0cnkge1xuXHRcdFx0bG9nZ2VyLm91dGdvaW5nLmluZm8oJ1dpbGwgZXZhbHVhdGUgc2NyaXB0IG9mIFRyaWdnZXInLCBpbnRlZ3JhdGlvbi5uYW1lKTtcblx0XHRcdGxvZ2dlci5vdXRnb2luZy5kZWJ1ZyhzY3JpcHQpO1xuXG5cdFx0XHR2bVNjcmlwdCA9IHRoaXMudm0uY3JlYXRlU2NyaXB0KHNjcmlwdCwgJ3NjcmlwdC5qcycpO1xuXG5cdFx0XHR2bVNjcmlwdC5ydW5Jbk5ld0NvbnRleHQoc2FuZGJveCk7XG5cblx0XHRcdGlmIChzYW5kYm94LlNjcmlwdCkge1xuXHRcdFx0XHR0aGlzLmNvbXBpbGVkU2NyaXB0c1tpbnRlZ3JhdGlvbi5faWRdID0ge1xuXHRcdFx0XHRcdHNjcmlwdDogbmV3IHNhbmRib3guU2NyaXB0KCksXG5cdFx0XHRcdFx0c3RvcmUsXG5cdFx0XHRcdFx0X3VwZGF0ZWRBdDogaW50ZWdyYXRpb24uX3VwZGF0ZWRBdCxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRyZXR1cm4gdGhpcy5jb21waWxlZFNjcmlwdHNbaW50ZWdyYXRpb24uX2lkXS5zY3JpcHQ7XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0bG9nZ2VyLm91dGdvaW5nLmVycm9yKGBFcnJvciBldmFsdWF0aW5nIFNjcmlwdCBpbiBUcmlnZ2VyICR7IGludGVncmF0aW9uLm5hbWUgfTpgKTtcblx0XHRcdGxvZ2dlci5vdXRnb2luZy5lcnJvcihzY3JpcHQucmVwbGFjZSgvXi9nbSwgJyAgJykpO1xuXHRcdFx0bG9nZ2VyLm91dGdvaW5nLmVycm9yKCdTdGFjayBUcmFjZTonKTtcblx0XHRcdGxvZ2dlci5vdXRnb2luZy5lcnJvcihlLnN0YWNrLnJlcGxhY2UoL14vZ20sICcgICcpKTtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWV2YWx1YXRpbmctc2NyaXB0Jyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFzYW5kYm94LlNjcmlwdCkge1xuXHRcdFx0bG9nZ2VyLm91dGdvaW5nLmVycm9yKGBDbGFzcyBcIlNjcmlwdFwiIG5vdCBpbiBUcmlnZ2VyICR7IGludGVncmF0aW9uLm5hbWUgfTpgKTtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2NsYXNzLXNjcmlwdC1ub3QtZm91bmQnKTtcblx0XHR9XG5cdH1cblxuXHRoYXNTY3JpcHRBbmRNZXRob2QoaW50ZWdyYXRpb24sIG1ldGhvZCkge1xuXHRcdGlmIChpbnRlZ3JhdGlvbi5zY3JpcHRFbmFibGVkICE9PSB0cnVlIHx8ICFpbnRlZ3JhdGlvbi5zY3JpcHRDb21waWxlZCB8fCBpbnRlZ3JhdGlvbi5zY3JpcHRDb21waWxlZC50cmltKCkgPT09ICcnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0bGV0IHNjcmlwdDtcblx0XHR0cnkge1xuXHRcdFx0c2NyaXB0ID0gdGhpcy5nZXRJbnRlZ3JhdGlvblNjcmlwdChpbnRlZ3JhdGlvbik7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHJldHVybiB0eXBlb2Ygc2NyaXB0W21ldGhvZF0gIT09ICd1bmRlZmluZWQnO1xuXHR9XG5cblx0ZXhlY3V0ZVNjcmlwdChpbnRlZ3JhdGlvbiwgbWV0aG9kLCBwYXJhbXMsIGhpc3RvcnlJZCkge1xuXHRcdGxldCBzY3JpcHQ7XG5cdFx0dHJ5IHtcblx0XHRcdHNjcmlwdCA9IHRoaXMuZ2V0SW50ZWdyYXRpb25TY3JpcHQoaW50ZWdyYXRpb24pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHRoaXMudXBkYXRlSGlzdG9yeSh7IGhpc3RvcnlJZCwgc3RlcDogJ2V4ZWN1dGUtc2NyaXB0LWdldHRpbmctc2NyaXB0JywgZXJyb3I6IHRydWUsIGVycm9yU3RhY2s6IGUgfSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKCFzY3JpcHRbbWV0aG9kXSkge1xuXHRcdFx0bG9nZ2VyLm91dGdvaW5nLmVycm9yKGBNZXRob2QgXCIkeyBtZXRob2QgfVwiIG5vIGZvdW5kIGluIHRoZSBJbnRlZ3JhdGlvbiBcIiR7IGludGVncmF0aW9uLm5hbWUgfVwiYCk7XG5cdFx0XHR0aGlzLnVwZGF0ZUhpc3RvcnkoeyBoaXN0b3J5SWQsIHN0ZXA6IGBleGVjdXRlLXNjcmlwdC1uby1tZXRob2QtJHsgbWV0aG9kIH1gIH0pO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCB7IHNhbmRib3ggfSA9IHRoaXMuYnVpbGRTYW5kYm94KHRoaXMuY29tcGlsZWRTY3JpcHRzW2ludGVncmF0aW9uLl9pZF0uc3RvcmUpO1xuXHRcdFx0c2FuZGJveC5zY3JpcHQgPSBzY3JpcHQ7XG5cdFx0XHRzYW5kYm94Lm1ldGhvZCA9IG1ldGhvZDtcblx0XHRcdHNhbmRib3gucGFyYW1zID0gcGFyYW1zO1xuXG5cdFx0XHR0aGlzLnVwZGF0ZUhpc3RvcnkoeyBoaXN0b3J5SWQsIHN0ZXA6IGBleGVjdXRlLXNjcmlwdC1iZWZvcmUtcnVubmluZy0keyBtZXRob2QgfWAgfSk7XG5cblx0XHRcdGNvbnN0IHJlc3VsdCA9IEZ1dHVyZS5mcm9tUHJvbWlzZSh0aGlzLnZtLnJ1bkluTmV3Q29udGV4dChgXG5cdFx0XHRcdG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdFx0XHRGaWJlcigoKSA9PiB7XG5cdFx0XHRcdFx0XHRzY3JpcHRUaW1lb3V0KHJlamVjdCk7XG5cdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRyZXNvbHZlKHNjcmlwdFttZXRob2RdKHBhcmFtcykpXG5cdFx0XHRcdFx0XHR9IGNhdGNoKGUpIHtcblx0XHRcdFx0XHRcdFx0cmVqZWN0KGUpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pLnJ1bigpO1xuXHRcdFx0XHR9KS5jYXRjaCgoZXJyb3IpID0+IHsgdGhyb3cgbmV3IEVycm9yKGVycm9yKTsgfSk7XG5cdFx0XHRgLCBzYW5kYm94LCB7XG5cdFx0XHRcdHRpbWVvdXQ6IDMwMDAsXG5cdFx0XHR9KSkud2FpdCgpO1xuXG5cdFx0XHRsb2dnZXIub3V0Z29pbmcuZGVidWcoYFNjcmlwdCBtZXRob2QgXCIkeyBtZXRob2QgfVwiIHJlc3VsdCBvZiB0aGUgSW50ZWdyYXRpb24gXCIkeyBpbnRlZ3JhdGlvbi5uYW1lIH1cIiBpczpgKTtcblx0XHRcdGxvZ2dlci5vdXRnb2luZy5kZWJ1ZyhyZXN1bHQpO1xuXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHRoaXMudXBkYXRlSGlzdG9yeSh7IGhpc3RvcnlJZCwgc3RlcDogYGV4ZWN1dGUtc2NyaXB0LWVycm9yLXJ1bm5pbmctJHsgbWV0aG9kIH1gLCBlcnJvcjogdHJ1ZSwgZXJyb3JTdGFjazogZS5zdGFjay5yZXBsYWNlKC9eL2dtLCAnICAnKSB9KTtcblx0XHRcdGxvZ2dlci5vdXRnb2luZy5lcnJvcihgRXJyb3IgcnVubmluZyBTY3JpcHQgaW4gdGhlIEludGVncmF0aW9uICR7IGludGVncmF0aW9uLm5hbWUgfTpgKTtcblx0XHRcdGxvZ2dlci5vdXRnb2luZy5kZWJ1ZyhpbnRlZ3JhdGlvbi5zY3JpcHRDb21waWxlZC5yZXBsYWNlKC9eL2dtLCAnICAnKSk7IC8vIE9ubHkgb3V0cHV0IHRoZSBjb21waWxlZCBzY3JpcHQgaWYgZGVidWdnaW5nIGlzIGVuYWJsZWQsIHNvIHRoZSBsb2dzIGRvbid0IGdldCBzcGFtbWVkLlxuXHRcdFx0bG9nZ2VyLm91dGdvaW5nLmVycm9yKCdTdGFjazonKTtcblx0XHRcdGxvZ2dlci5vdXRnb2luZy5lcnJvcihlLnN0YWNrLnJlcGxhY2UoL14vZ20sICcgICcpKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdH1cblxuXHRldmVudE5hbWVBcmd1bWVudHNUb09iamVjdCguLi5hcmdzKSB7XG5cdFx0Y29uc3QgYXJnT2JqZWN0ID0ge1xuXHRcdFx0ZXZlbnQ6IGFyZ3NbMF0sXG5cdFx0fTtcblxuXHRcdHN3aXRjaCAoYXJnT2JqZWN0LmV2ZW50KSB7XG5cdFx0XHRjYXNlICdzZW5kTWVzc2FnZSc6XG5cdFx0XHRcdGlmIChhcmdzLmxlbmd0aCA+PSAzKSB7XG5cdFx0XHRcdFx0YXJnT2JqZWN0Lm1lc3NhZ2UgPSBhcmdzWzFdO1xuXHRcdFx0XHRcdGFyZ09iamVjdC5yb29tID0gYXJnc1syXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2ZpbGVVcGxvYWRlZCc6XG5cdFx0XHRcdGlmIChhcmdzLmxlbmd0aCA+PSAyKSB7XG5cdFx0XHRcdFx0Y29uc3QgYXJnaGhoID0gYXJnc1sxXTtcblx0XHRcdFx0XHRhcmdPYmplY3QudXNlciA9IGFyZ2hoaC51c2VyO1xuXHRcdFx0XHRcdGFyZ09iamVjdC5yb29tID0gYXJnaGhoLnJvb207XG5cdFx0XHRcdFx0YXJnT2JqZWN0Lm1lc3NhZ2UgPSBhcmdoaGgubWVzc2FnZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3Jvb21BcmNoaXZlZCc6XG5cdFx0XHRcdGlmIChhcmdzLmxlbmd0aCA+PSAzKSB7XG5cdFx0XHRcdFx0YXJnT2JqZWN0LnJvb20gPSBhcmdzWzFdO1xuXHRcdFx0XHRcdGFyZ09iamVjdC51c2VyID0gYXJnc1syXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3Jvb21DcmVhdGVkJzpcblx0XHRcdFx0aWYgKGFyZ3MubGVuZ3RoID49IDMpIHtcblx0XHRcdFx0XHRhcmdPYmplY3Qub3duZXIgPSBhcmdzWzFdO1xuXHRcdFx0XHRcdGFyZ09iamVjdC5yb29tID0gYXJnc1syXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3Jvb21Kb2luZWQnOlxuXHRcdFx0Y2FzZSAncm9vbUxlZnQnOlxuXHRcdFx0XHRpZiAoYXJncy5sZW5ndGggPj0gMykge1xuXHRcdFx0XHRcdGFyZ09iamVjdC51c2VyID0gYXJnc1sxXTtcblx0XHRcdFx0XHRhcmdPYmplY3Qucm9vbSA9IGFyZ3NbMl07XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd1c2VyQ3JlYXRlZCc6XG5cdFx0XHRcdGlmIChhcmdzLmxlbmd0aCA+PSAyKSB7XG5cdFx0XHRcdFx0YXJnT2JqZWN0LnVzZXIgPSBhcmdzWzFdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0bG9nZ2VyLm91dGdvaW5nLndhcm4oYEFuIFVuaGFuZGxlZCBUcmlnZ2VyIEV2ZW50IHdhcyBjYWxsZWQ6ICR7IGFyZ09iamVjdC5ldmVudCB9YCk7XG5cdFx0XHRcdGFyZ09iamVjdC5ldmVudCA9IHVuZGVmaW5lZDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0bG9nZ2VyLm91dGdvaW5nLmRlYnVnKGBHb3QgdGhlIGV2ZW50IGFyZ3VtZW50cyBmb3IgdGhlIGV2ZW50OiAkeyBhcmdPYmplY3QuZXZlbnQgfWAsIGFyZ09iamVjdCk7XG5cblx0XHRyZXR1cm4gYXJnT2JqZWN0O1xuXHR9XG5cblx0bWFwRXZlbnRBcmdzVG9EYXRhKGRhdGEsIHsgZXZlbnQsIG1lc3NhZ2UsIHJvb20sIG93bmVyLCB1c2VyIH0pIHtcblx0XHRzd2l0Y2ggKGV2ZW50KSB7XG5cdFx0XHRjYXNlICdzZW5kTWVzc2FnZSc6XG5cdFx0XHRcdGRhdGEuY2hhbm5lbF9pZCA9IHJvb20uX2lkO1xuXHRcdFx0XHRkYXRhLmNoYW5uZWxfbmFtZSA9IHJvb20ubmFtZTtcblx0XHRcdFx0ZGF0YS5tZXNzYWdlX2lkID0gbWVzc2FnZS5faWQ7XG5cdFx0XHRcdGRhdGEudGltZXN0YW1wID0gbWVzc2FnZS50cztcblx0XHRcdFx0ZGF0YS51c2VyX2lkID0gbWVzc2FnZS51Ll9pZDtcblx0XHRcdFx0ZGF0YS51c2VyX25hbWUgPSBtZXNzYWdlLnUudXNlcm5hbWU7XG5cdFx0XHRcdGRhdGEudGV4dCA9IG1lc3NhZ2UubXNnO1xuXG5cdFx0XHRcdGlmIChtZXNzYWdlLmFsaWFzKSB7XG5cdFx0XHRcdFx0ZGF0YS5hbGlhcyA9IG1lc3NhZ2UuYWxpYXM7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobWVzc2FnZS5ib3QpIHtcblx0XHRcdFx0XHRkYXRhLmJvdCA9IG1lc3NhZ2UuYm90O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG1lc3NhZ2UuZWRpdGVkQXQpIHtcblx0XHRcdFx0XHRkYXRhLmlzRWRpdGVkID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2ZpbGVVcGxvYWRlZCc6XG5cdFx0XHRcdGRhdGEuY2hhbm5lbF9pZCA9IHJvb20uX2lkO1xuXHRcdFx0XHRkYXRhLmNoYW5uZWxfbmFtZSA9IHJvb20ubmFtZTtcblx0XHRcdFx0ZGF0YS5tZXNzYWdlX2lkID0gbWVzc2FnZS5faWQ7XG5cdFx0XHRcdGRhdGEudGltZXN0YW1wID0gbWVzc2FnZS50cztcblx0XHRcdFx0ZGF0YS51c2VyX2lkID0gbWVzc2FnZS51Ll9pZDtcblx0XHRcdFx0ZGF0YS51c2VyX25hbWUgPSBtZXNzYWdlLnUudXNlcm5hbWU7XG5cdFx0XHRcdGRhdGEudGV4dCA9IG1lc3NhZ2UubXNnO1xuXHRcdFx0XHRkYXRhLnVzZXIgPSB1c2VyO1xuXHRcdFx0XHRkYXRhLnJvb20gPSByb29tO1xuXHRcdFx0XHRkYXRhLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXG5cdFx0XHRcdGlmIChtZXNzYWdlLmFsaWFzKSB7XG5cdFx0XHRcdFx0ZGF0YS5hbGlhcyA9IG1lc3NhZ2UuYWxpYXM7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobWVzc2FnZS5ib3QpIHtcblx0XHRcdFx0XHRkYXRhLmJvdCA9IG1lc3NhZ2UuYm90O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAncm9vbUNyZWF0ZWQnOlxuXHRcdFx0XHRkYXRhLmNoYW5uZWxfaWQgPSByb29tLl9pZDtcblx0XHRcdFx0ZGF0YS5jaGFubmVsX25hbWUgPSByb29tLm5hbWU7XG5cdFx0XHRcdGRhdGEudGltZXN0YW1wID0gcm9vbS50cztcblx0XHRcdFx0ZGF0YS51c2VyX2lkID0gb3duZXIuX2lkO1xuXHRcdFx0XHRkYXRhLnVzZXJfbmFtZSA9IG93bmVyLnVzZXJuYW1lO1xuXHRcdFx0XHRkYXRhLm93bmVyID0gb3duZXI7XG5cdFx0XHRcdGRhdGEucm9vbSA9IHJvb207XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAncm9vbUFyY2hpdmVkJzpcblx0XHRcdGNhc2UgJ3Jvb21Kb2luZWQnOlxuXHRcdFx0Y2FzZSAncm9vbUxlZnQnOlxuXHRcdFx0XHRkYXRhLnRpbWVzdGFtcCA9IG5ldyBEYXRlKCk7XG5cdFx0XHRcdGRhdGEuY2hhbm5lbF9pZCA9IHJvb20uX2lkO1xuXHRcdFx0XHRkYXRhLmNoYW5uZWxfbmFtZSA9IHJvb20ubmFtZTtcblx0XHRcdFx0ZGF0YS51c2VyX2lkID0gdXNlci5faWQ7XG5cdFx0XHRcdGRhdGEudXNlcl9uYW1lID0gdXNlci51c2VybmFtZTtcblx0XHRcdFx0ZGF0YS51c2VyID0gdXNlcjtcblx0XHRcdFx0ZGF0YS5yb29tID0gcm9vbTtcblxuXHRcdFx0XHRpZiAodXNlci50eXBlID09PSAnYm90Jykge1xuXHRcdFx0XHRcdGRhdGEuYm90ID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3VzZXJDcmVhdGVkJzpcblx0XHRcdFx0ZGF0YS50aW1lc3RhbXAgPSB1c2VyLmNyZWF0ZWRBdDtcblx0XHRcdFx0ZGF0YS51c2VyX2lkID0gdXNlci5faWQ7XG5cdFx0XHRcdGRhdGEudXNlcl9uYW1lID0gdXNlci51c2VybmFtZTtcblx0XHRcdFx0ZGF0YS51c2VyID0gdXNlcjtcblxuXHRcdFx0XHRpZiAodXNlci50eXBlID09PSAnYm90Jykge1xuXHRcdFx0XHRcdGRhdGEuYm90ID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdGV4ZWN1dGVUcmlnZ2VycyguLi5hcmdzKSB7XG5cdFx0bG9nZ2VyLm91dGdvaW5nLmRlYnVnKCdFeGVjdXRlIFRyaWdnZXI6JywgYXJnc1swXSk7XG5cblx0XHRjb25zdCBhcmdPYmplY3QgPSB0aGlzLmV2ZW50TmFtZUFyZ3VtZW50c1RvT2JqZWN0KC4uLmFyZ3MpO1xuXHRcdGNvbnN0IHsgZXZlbnQsIG1lc3NhZ2UsIHJvb20gfSA9IGFyZ09iamVjdDtcblxuXHRcdC8vIEVhY2ggdHlwZSBvZiBldmVudCBzaG91bGQgaGF2ZSBhbiBldmVudCBhbmQgYSByb29tIGF0dGFjaGVkLCBvdGhlcndpc2Ugd2Vcblx0XHQvLyB3b3VsZG4ndCBrbm93IGhvdyB0byBoYW5kbGUgdGhlIHRyaWdnZXIgbm9yIHdvdWxkIHdlIGhhdmUgYW55d2hlcmUgdG8gc2VuZCB0aGVcblx0XHQvLyByZXN1bHQgb2YgdGhlIGludGVncmF0aW9uXG5cdFx0aWYgKCFldmVudCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IHRyaWdnZXJzVG9FeGVjdXRlID0gW107XG5cblx0XHRsb2dnZXIub3V0Z29pbmcuZGVidWcoJ1N0YXJ0aW5nIHNlYXJjaCBmb3IgdHJpZ2dlcnMgZm9yIHRoZSByb29tOicsIHJvb20gPyByb29tLl9pZCA6ICdfX2FueScpO1xuXHRcdGlmIChyb29tKSB7XG5cdFx0XHRzd2l0Y2ggKHJvb20udCkge1xuXHRcdFx0XHRjYXNlICdkJzpcblx0XHRcdFx0XHRjb25zdCBpZCA9IHJvb20uX2lkLnJlcGxhY2UobWVzc2FnZS51Ll9pZCwgJycpO1xuXHRcdFx0XHRcdGNvbnN0IHVzZXJuYW1lID0gXy53aXRob3V0KHJvb20udXNlcm5hbWVzLCBtZXNzYWdlLnUudXNlcm5hbWUpWzBdO1xuXG5cdFx0XHRcdFx0aWYgKHRoaXMudHJpZ2dlcnNbYEAkeyBpZCB9YF0pIHtcblx0XHRcdFx0XHRcdGZvciAoY29uc3QgdHJpZ2dlciBvZiBPYmplY3QudmFsdWVzKHRoaXMudHJpZ2dlcnNbYEAkeyBpZCB9YF0pKSB7XG5cdFx0XHRcdFx0XHRcdHRyaWdnZXJzVG9FeGVjdXRlLnB1c2godHJpZ2dlcik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHRoaXMudHJpZ2dlcnMuYWxsX2RpcmVjdF9tZXNzYWdlcykge1xuXHRcdFx0XHRcdFx0Zm9yIChjb25zdCB0cmlnZ2VyIG9mIE9iamVjdC52YWx1ZXModGhpcy50cmlnZ2Vycy5hbGxfZGlyZWN0X21lc3NhZ2VzKSkge1xuXHRcdFx0XHRcdFx0XHR0cmlnZ2Vyc1RvRXhlY3V0ZS5wdXNoKHRyaWdnZXIpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChpZCAhPT0gdXNlcm5hbWUgJiYgdGhpcy50cmlnZ2Vyc1tgQCR7IHVzZXJuYW1lIH1gXSkge1xuXHRcdFx0XHRcdFx0Zm9yIChjb25zdCB0cmlnZ2VyIG9mIE9iamVjdC52YWx1ZXModGhpcy50cmlnZ2Vyc1tgQCR7IHVzZXJuYW1lIH1gXSkpIHtcblx0XHRcdFx0XHRcdFx0dHJpZ2dlcnNUb0V4ZWN1dGUucHVzaCh0cmlnZ2VyKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSAnYyc6XG5cdFx0XHRcdFx0aWYgKHRoaXMudHJpZ2dlcnMuYWxsX3B1YmxpY19jaGFubmVscykge1xuXHRcdFx0XHRcdFx0Zm9yIChjb25zdCB0cmlnZ2VyIG9mIE9iamVjdC52YWx1ZXModGhpcy50cmlnZ2Vycy5hbGxfcHVibGljX2NoYW5uZWxzKSkge1xuXHRcdFx0XHRcdFx0XHR0cmlnZ2Vyc1RvRXhlY3V0ZS5wdXNoKHRyaWdnZXIpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICh0aGlzLnRyaWdnZXJzW2AjJHsgcm9vbS5faWQgfWBdKSB7XG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IHRyaWdnZXIgb2YgT2JqZWN0LnZhbHVlcyh0aGlzLnRyaWdnZXJzW2AjJHsgcm9vbS5faWQgfWBdKSkge1xuXHRcdFx0XHRcdFx0XHR0cmlnZ2Vyc1RvRXhlY3V0ZS5wdXNoKHRyaWdnZXIpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChyb29tLl9pZCAhPT0gcm9vbS5uYW1lICYmIHRoaXMudHJpZ2dlcnNbYCMkeyByb29tLm5hbWUgfWBdKSB7XG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IHRyaWdnZXIgb2YgT2JqZWN0LnZhbHVlcyh0aGlzLnRyaWdnZXJzW2AjJHsgcm9vbS5uYW1lIH1gXSkpIHtcblx0XHRcdFx0XHRcdFx0dHJpZ2dlcnNUb0V4ZWN1dGUucHVzaCh0cmlnZ2VyKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRpZiAodGhpcy50cmlnZ2Vycy5hbGxfcHJpdmF0ZV9ncm91cHMpIHtcblx0XHRcdFx0XHRcdGZvciAoY29uc3QgdHJpZ2dlciBvZiBPYmplY3QudmFsdWVzKHRoaXMudHJpZ2dlcnMuYWxsX3ByaXZhdGVfZ3JvdXBzKSkge1xuXHRcdFx0XHRcdFx0XHR0cmlnZ2Vyc1RvRXhlY3V0ZS5wdXNoKHRyaWdnZXIpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICh0aGlzLnRyaWdnZXJzW2AjJHsgcm9vbS5faWQgfWBdKSB7XG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IHRyaWdnZXIgb2YgT2JqZWN0LnZhbHVlcyh0aGlzLnRyaWdnZXJzW2AjJHsgcm9vbS5faWQgfWBdKSkge1xuXHRcdFx0XHRcdFx0XHR0cmlnZ2Vyc1RvRXhlY3V0ZS5wdXNoKHRyaWdnZXIpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChyb29tLl9pZCAhPT0gcm9vbS5uYW1lICYmIHRoaXMudHJpZ2dlcnNbYCMkeyByb29tLm5hbWUgfWBdKSB7XG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IHRyaWdnZXIgb2YgT2JqZWN0LnZhbHVlcyh0aGlzLnRyaWdnZXJzW2AjJHsgcm9vbS5uYW1lIH1gXSkpIHtcblx0XHRcdFx0XHRcdFx0dHJpZ2dlcnNUb0V4ZWN1dGUucHVzaCh0cmlnZ2VyKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMudHJpZ2dlcnMuX19hbnkpIHtcblx0XHRcdC8vIEZvciBvdXRnb2luZyBpbnRlZ3JhdGlvbiB3aGljaCBkb24ndCByZWx5IG9uIHJvb21zLlxuXHRcdFx0Zm9yIChjb25zdCB0cmlnZ2VyIG9mIE9iamVjdC52YWx1ZXModGhpcy50cmlnZ2Vycy5fX2FueSkpIHtcblx0XHRcdFx0dHJpZ2dlcnNUb0V4ZWN1dGUucHVzaCh0cmlnZ2VyKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRsb2dnZXIub3V0Z29pbmcuZGVidWcoYEZvdW5kICR7IHRyaWdnZXJzVG9FeGVjdXRlLmxlbmd0aCB9IHRvIGl0ZXJhdGUgb3ZlciBhbmQgc2VlIGlmIHRoZSBtYXRjaCB0aGUgZXZlbnQuYCk7XG5cblx0XHRmb3IgKGNvbnN0IHRyaWdnZXJUb0V4ZWN1dGUgb2YgdHJpZ2dlcnNUb0V4ZWN1dGUpIHtcblx0XHRcdGxvZ2dlci5vdXRnb2luZy5kZWJ1ZyhgSXMgXCIkeyB0cmlnZ2VyVG9FeGVjdXRlLm5hbWUgfVwiIGVuYWJsZWQsICR7IHRyaWdnZXJUb0V4ZWN1dGUuZW5hYmxlZCB9LCBhbmQgd2hhdCBpcyB0aGUgZXZlbnQ/ICR7IHRyaWdnZXJUb0V4ZWN1dGUuZXZlbnQgfWApO1xuXHRcdFx0aWYgKHRyaWdnZXJUb0V4ZWN1dGUuZW5hYmxlZCA9PT0gdHJ1ZSAmJiB0cmlnZ2VyVG9FeGVjdXRlLmV2ZW50ID09PSBldmVudCkge1xuXHRcdFx0XHR0aGlzLmV4ZWN1dGVUcmlnZ2VyKHRyaWdnZXJUb0V4ZWN1dGUsIGFyZ09iamVjdCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZXhlY3V0ZVRyaWdnZXIodHJpZ2dlciwgYXJnT2JqZWN0KSB7XG5cdFx0Zm9yIChjb25zdCB1cmwgb2YgdHJpZ2dlci51cmxzKSB7XG5cdFx0XHR0aGlzLmV4ZWN1dGVUcmlnZ2VyVXJsKHVybCwgdHJpZ2dlciwgYXJnT2JqZWN0LCAwKTtcblx0XHR9XG5cdH1cblxuXHRleGVjdXRlVHJpZ2dlclVybCh1cmwsIHRyaWdnZXIsIHsgZXZlbnQsIG1lc3NhZ2UsIHJvb20sIG93bmVyLCB1c2VyIH0sIHRoZUhpc3RvcnlJZCwgdHJpZXMgPSAwKSB7XG5cdFx0aWYgKCF0aGlzLmlzVHJpZ2dlckVuYWJsZWQodHJpZ2dlcikpIHtcblx0XHRcdGxvZ2dlci5vdXRnb2luZy53YXJuKGBUaGUgdHJpZ2dlciBcIiR7IHRyaWdnZXIubmFtZSB9XCIgaXMgbm8gbG9uZ2VyIGVuYWJsZWQsIHN0b3BwaW5nIGV4ZWN1dGlvbiBvZiBpdCBhdCB0cnk6ICR7IHRyaWVzIH1gKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRsb2dnZXIub3V0Z29pbmcuZGVidWcoYFN0YXJ0aW5nIHRvIGV4ZWN1dGUgdHJpZ2dlcjogJHsgdHJpZ2dlci5uYW1lIH0gKCR7IHRyaWdnZXIuX2lkIH0pYCk7XG5cblx0XHRsZXQgd29yZDtcblx0XHQvLyBOb3QgYWxsIHRyaWdnZXJzL2V2ZW50cyBzdXBwb3J0IHRyaWdnZXJXb3Jkc1xuXHRcdGlmIChSb2NrZXRDaGF0LmludGVncmF0aW9ucy5vdXRnb2luZ0V2ZW50c1tldmVudF0udXNlLnRyaWdnZXJXb3Jkcykge1xuXHRcdFx0aWYgKHRyaWdnZXIudHJpZ2dlcldvcmRzICYmIHRyaWdnZXIudHJpZ2dlcldvcmRzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Zm9yIChjb25zdCB0cmlnZ2VyV29yZCBvZiB0cmlnZ2VyLnRyaWdnZXJXb3Jkcykge1xuXHRcdFx0XHRcdGlmICghdHJpZ2dlci50cmlnZ2VyV29yZEFueXdoZXJlICYmIG1lc3NhZ2UubXNnLmluZGV4T2YodHJpZ2dlcldvcmQpID09PSAwKSB7XG5cdFx0XHRcdFx0XHR3b3JkID0gdHJpZ2dlcldvcmQ7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHRyaWdnZXIudHJpZ2dlcldvcmRBbnl3aGVyZSAmJiBtZXNzYWdlLm1zZy5pbmNsdWRlcyh0cmlnZ2VyV29yZCkpIHtcblx0XHRcdFx0XHRcdHdvcmQgPSB0cmlnZ2VyV29yZDtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFN0b3AgaWYgdGhlcmUgYXJlIHRyaWdnZXJXb3JkcyBidXQgbm9uZSBtYXRjaFxuXHRcdFx0XHRpZiAoIXdvcmQpIHtcblx0XHRcdFx0XHRsb2dnZXIub3V0Z29pbmcuZGVidWcoYFRoZSB0cmlnZ2VyIHdvcmQgd2hpY2ggXCIkeyB0cmlnZ2VyLm5hbWUgfVwiIHdhcyBleHBlY3RpbmcgY291bGQgbm90IGJlIGZvdW5kLCBub3QgZXhlY3V0aW5nLmApO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuZWRpdGVkQXQgJiYgIXRyaWdnZXIucnVuT25FZGl0cykge1xuXHRcdFx0bG9nZ2VyLm91dGdvaW5nLmRlYnVnKGBUaGUgdHJpZ2dlciBcIiR7IHRyaWdnZXIubmFtZSB9XCIncyBydW4gb24gZWRpdHMgaXMgZGlzYWJsZWQgYW5kIHRoZSBtZXNzYWdlIHdhcyBlZGl0ZWQuYCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgaGlzdG9yeUlkID0gdGhpcy51cGRhdGVIaXN0b3J5KHsgc3RlcDogJ3N0YXJ0LWV4ZWN1dGUtdHJpZ2dlci11cmwnLCBpbnRlZ3JhdGlvbjogdHJpZ2dlciwgZXZlbnQgfSk7XG5cblx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0dG9rZW46IHRyaWdnZXIudG9rZW4sXG5cdFx0XHRib3Q6IGZhbHNlLFxuXHRcdH07XG5cblx0XHRpZiAod29yZCkge1xuXHRcdFx0ZGF0YS50cmlnZ2VyX3dvcmQgPSB3b3JkO1xuXHRcdH1cblxuXHRcdHRoaXMubWFwRXZlbnRBcmdzVG9EYXRhKGRhdGEsIHsgdHJpZ2dlciwgZXZlbnQsIG1lc3NhZ2UsIHJvb20sIG93bmVyLCB1c2VyIH0pO1xuXHRcdHRoaXMudXBkYXRlSGlzdG9yeSh7IGhpc3RvcnlJZCwgc3RlcDogJ21hcHBlZC1hcmdzLXRvLWRhdGEnLCBkYXRhLCB0cmlnZ2VyV29yZDogd29yZCB9KTtcblxuXHRcdGxvZ2dlci5vdXRnb2luZy5pbmZvKGBXaWxsIGJlIGV4ZWN1dGluZyB0aGUgSW50ZWdyYXRpb24gXCIkeyB0cmlnZ2VyLm5hbWUgfVwiIHRvIHRoZSB1cmw6ICR7IHVybCB9YCk7XG5cdFx0bG9nZ2VyLm91dGdvaW5nLmRlYnVnKGRhdGEpO1xuXG5cdFx0bGV0IG9wdHMgPSB7XG5cdFx0XHRwYXJhbXM6IHt9LFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHR1cmwsXG5cdFx0XHRkYXRhLFxuXHRcdFx0YXV0aDogdW5kZWZpbmVkLFxuXHRcdFx0bnBtUmVxdWVzdE9wdGlvbnM6IHtcblx0XHRcdFx0cmVqZWN0VW5hdXRob3JpemVkOiAhUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FsbG93X0ludmFsaWRfU2VsZlNpZ25lZF9DZXJ0cycpLFxuXHRcdFx0XHRzdHJpY3RTU0w6ICFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWxsb3dfSW52YWxpZF9TZWxmU2lnbmVkX0NlcnRzJyksXG5cdFx0XHR9LFxuXHRcdFx0aGVhZGVyczoge1xuXHRcdFx0XHQnVXNlci1BZ2VudCc6ICdNb3ppbGxhLzUuMCAoWDExOyBMaW51eCB4ODZfNjQpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS80MS4wLjIyMjcuMCBTYWZhcmkvNTM3LjM2Jyxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdGlmICh0aGlzLmhhc1NjcmlwdEFuZE1ldGhvZCh0cmlnZ2VyLCAncHJlcGFyZV9vdXRnb2luZ19yZXF1ZXN0JykpIHtcblx0XHRcdG9wdHMgPSB0aGlzLmV4ZWN1dGVTY3JpcHQodHJpZ2dlciwgJ3ByZXBhcmVfb3V0Z29pbmdfcmVxdWVzdCcsIHsgcmVxdWVzdDogb3B0cyB9LCBoaXN0b3J5SWQpO1xuXHRcdH1cblxuXHRcdHRoaXMudXBkYXRlSGlzdG9yeSh7IGhpc3RvcnlJZCwgc3RlcDogJ2FmdGVyLW1heWJlLXJhbi1wcmVwYXJlJywgcmFuUHJlcGFyZVNjcmlwdDogdHJ1ZSB9KTtcblxuXHRcdGlmICghb3B0cykge1xuXHRcdFx0dGhpcy51cGRhdGVIaXN0b3J5KHsgaGlzdG9yeUlkLCBzdGVwOiAnYWZ0ZXItcHJlcGFyZS1uby1vcHRzJywgZmluaXNoZWQ6IHRydWUgfSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKG9wdHMubWVzc2FnZSkge1xuXHRcdFx0Y29uc3QgcHJlcGFyZU1lc3NhZ2UgPSB0aGlzLnNlbmRNZXNzYWdlKHsgdHJpZ2dlciwgcm9vbSwgbWVzc2FnZTogb3B0cy5tZXNzYWdlLCBkYXRhIH0pO1xuXHRcdFx0dGhpcy51cGRhdGVIaXN0b3J5KHsgaGlzdG9yeUlkLCBzdGVwOiAnYWZ0ZXItcHJlcGFyZS1zZW5kLW1lc3NhZ2UnLCBwcmVwYXJlU2VudE1lc3NhZ2U6IHByZXBhcmVNZXNzYWdlIH0pO1xuXHRcdH1cblxuXHRcdGlmICghb3B0cy51cmwgfHwgIW9wdHMubWV0aG9kKSB7XG5cdFx0XHR0aGlzLnVwZGF0ZUhpc3RvcnkoeyBoaXN0b3J5SWQsIHN0ZXA6ICdhZnRlci1wcmVwYXJlLW5vLXVybF9vcl9tZXRob2QnLCBmaW5pc2hlZDogdHJ1ZSB9KTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR0aGlzLnVwZGF0ZUhpc3RvcnkoeyBoaXN0b3J5SWQsIHN0ZXA6ICdwcmUtaHR0cC1jYWxsJywgdXJsOiBvcHRzLnVybCwgaHR0cENhbGxEYXRhOiBvcHRzLmRhdGEgfSk7XG5cdFx0SFRUUC5jYWxsKG9wdHMubWV0aG9kLCBvcHRzLnVybCwgb3B0cywgKGVycm9yLCByZXN1bHQpID0+IHtcblx0XHRcdGlmICghcmVzdWx0KSB7XG5cdFx0XHRcdGxvZ2dlci5vdXRnb2luZy53YXJuKGBSZXN1bHQgZm9yIHRoZSBJbnRlZ3JhdGlvbiAkeyB0cmlnZ2VyLm5hbWUgfSB0byAkeyB1cmwgfSBpcyBlbXB0eWApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bG9nZ2VyLm91dGdvaW5nLmluZm8oYFN0YXR1cyBjb2RlIGZvciB0aGUgSW50ZWdyYXRpb24gJHsgdHJpZ2dlci5uYW1lIH0gdG8gJHsgdXJsIH0gaXMgJHsgcmVzdWx0LnN0YXR1c0NvZGUgfWApO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnVwZGF0ZUhpc3RvcnkoeyBoaXN0b3J5SWQsIHN0ZXA6ICdhZnRlci1odHRwLWNhbGwnLCBodHRwRXJyb3I6IGVycm9yLCBodHRwUmVzdWx0OiByZXN1bHQgfSk7XG5cblx0XHRcdGlmICh0aGlzLmhhc1NjcmlwdEFuZE1ldGhvZCh0cmlnZ2VyLCAncHJvY2Vzc19vdXRnb2luZ19yZXNwb25zZScpKSB7XG5cdFx0XHRcdGNvbnN0IHNhbmRib3ggPSB7XG5cdFx0XHRcdFx0cmVxdWVzdDogb3B0cyxcblx0XHRcdFx0XHRyZXNwb25zZToge1xuXHRcdFx0XHRcdFx0ZXJyb3IsXG5cdFx0XHRcdFx0XHRzdGF0dXNfY29kZTogcmVzdWx0ID8gcmVzdWx0LnN0YXR1c0NvZGUgOiB1bmRlZmluZWQsIC8vIFRoZXNlIHZhbHVlcyB3aWxsIGJlIHVuZGVmaW5lZCB0byBjbG9zZSBpc3N1ZXMgIzQxNzUsICM1NzYyLCBhbmQgIzU4OTZcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3VsdCA/IHJlc3VsdC5kYXRhIDogdW5kZWZpbmVkLFxuXHRcdFx0XHRcdFx0Y29udGVudF9yYXc6IHJlc3VsdCA/IHJlc3VsdC5jb250ZW50IDogdW5kZWZpbmVkLFxuXHRcdFx0XHRcdFx0aGVhZGVyczogcmVzdWx0ID8gcmVzdWx0LmhlYWRlcnMgOiB7fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGNvbnN0IHNjcmlwdFJlc3VsdCA9IHRoaXMuZXhlY3V0ZVNjcmlwdCh0cmlnZ2VyLCAncHJvY2Vzc19vdXRnb2luZ19yZXNwb25zZScsIHNhbmRib3gsIGhpc3RvcnlJZCk7XG5cblx0XHRcdFx0aWYgKHNjcmlwdFJlc3VsdCAmJiBzY3JpcHRSZXN1bHQuY29udGVudCkge1xuXHRcdFx0XHRcdGNvbnN0IHJlc3VsdE1lc3NhZ2UgPSB0aGlzLnNlbmRNZXNzYWdlKHsgdHJpZ2dlciwgcm9vbSwgbWVzc2FnZTogc2NyaXB0UmVzdWx0LmNvbnRlbnQsIGRhdGEgfSk7XG5cdFx0XHRcdFx0dGhpcy51cGRhdGVIaXN0b3J5KHsgaGlzdG9yeUlkLCBzdGVwOiAnYWZ0ZXItcHJvY2Vzcy1zZW5kLW1lc3NhZ2UnLCBwcm9jZXNzU2VudE1lc3NhZ2U6IHJlc3VsdE1lc3NhZ2UsIGZpbmlzaGVkOiB0cnVlIH0pO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChzY3JpcHRSZXN1bHQgPT09IGZhbHNlKSB7XG5cdFx0XHRcdFx0dGhpcy51cGRhdGVIaXN0b3J5KHsgaGlzdG9yeUlkLCBzdGVwOiAnYWZ0ZXItcHJvY2Vzcy1mYWxzZS1yZXN1bHQnLCBmaW5pc2hlZDogdHJ1ZSB9KTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gaWYgdGhlIHJlc3VsdCBjb250YWluZWQgbm90aGluZyBvciB3YXNuJ3QgYSBzdWNjZXNzZnVsIHN0YXR1c0NvZGVcblx0XHRcdGlmICghcmVzdWx0IHx8ICF0aGlzLnN1Y2Nlc3NSZXN1bHRzLmluY2x1ZGVzKHJlc3VsdC5zdGF0dXNDb2RlKSkge1xuXHRcdFx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdFx0XHRsb2dnZXIub3V0Z29pbmcuZXJyb3IoYEVycm9yIGZvciB0aGUgSW50ZWdyYXRpb24gXCIkeyB0cmlnZ2VyLm5hbWUgfVwiIHRvICR7IHVybCB9IGlzOmApO1xuXHRcdFx0XHRcdGxvZ2dlci5vdXRnb2luZy5lcnJvcihlcnJvcik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAocmVzdWx0KSB7XG5cdFx0XHRcdFx0bG9nZ2VyLm91dGdvaW5nLmVycm9yKGBFcnJvciBmb3IgdGhlIEludGVncmF0aW9uIFwiJHsgdHJpZ2dlci5uYW1lIH1cIiB0byAkeyB1cmwgfSBpczpgKTtcblx0XHRcdFx0XHRsb2dnZXIub3V0Z29pbmcuZXJyb3IocmVzdWx0KTtcblxuXHRcdFx0XHRcdGlmIChyZXN1bHQuc3RhdHVzQ29kZSA9PT0gNDEwKSB7XG5cdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZUhpc3RvcnkoeyBoaXN0b3J5SWQsIHN0ZXA6ICdhZnRlci1wcm9jZXNzLWh0dHAtc3RhdHVzLTQxMCcsIGVycm9yOiB0cnVlIH0pO1xuXHRcdFx0XHRcdFx0bG9nZ2VyLm91dGdvaW5nLmVycm9yKGBEaXNhYmxpbmcgdGhlIEludGVncmF0aW9uIFwiJHsgdHJpZ2dlci5uYW1lIH1cIiBiZWNhdXNlIHRoZSBzdGF0dXMgY29kZSB3YXMgNDAxIChHb25lKS5gKTtcblx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy51cGRhdGUoeyBfaWQ6IHRyaWdnZXIuX2lkIH0sIHsgJHNldDogeyBlbmFibGVkOiBmYWxzZSB9IH0pO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChyZXN1bHQuc3RhdHVzQ29kZSA9PT0gNTAwKSB7XG5cdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZUhpc3RvcnkoeyBoaXN0b3J5SWQsIHN0ZXA6ICdhZnRlci1wcm9jZXNzLWh0dHAtc3RhdHVzLTUwMCcsIGVycm9yOiB0cnVlIH0pO1xuXHRcdFx0XHRcdFx0bG9nZ2VyLm91dGdvaW5nLmVycm9yKGBFcnJvciBcIjUwMFwiIGZvciB0aGUgSW50ZWdyYXRpb24gXCIkeyB0cmlnZ2VyLm5hbWUgfVwiIHRvICR7IHVybCB9LmApO1xuXHRcdFx0XHRcdFx0bG9nZ2VyLm91dGdvaW5nLmVycm9yKHJlc3VsdC5jb250ZW50KTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAodHJpZ2dlci5yZXRyeUZhaWxlZENhbGxzKSB7XG5cdFx0XHRcdFx0aWYgKHRyaWVzIDwgdHJpZ2dlci5yZXRyeUNvdW50ICYmIHRyaWdnZXIucmV0cnlEZWxheSkge1xuXHRcdFx0XHRcdFx0dGhpcy51cGRhdGVIaXN0b3J5KHsgaGlzdG9yeUlkLCBlcnJvcjogdHJ1ZSwgc3RlcDogYGdvaW5nLXRvLXJldHJ5LSR7IHRyaWVzICsgMSB9YCB9KTtcblxuXHRcdFx0XHRcdFx0bGV0IHdhaXRUaW1lO1xuXG5cdFx0XHRcdFx0XHRzd2l0Y2ggKHRyaWdnZXIucmV0cnlEZWxheSkge1xuXHRcdFx0XHRcdFx0XHRjYXNlICdwb3dlcnMtb2YtdGVuJzpcblx0XHRcdFx0XHRcdFx0XHQvLyBUcnkgYWdhaW4gaW4gMC4xcywgMXMsIDEwcywgMW00MHMsIDE2bTQwcywgMmg0Nm00MHMsIDI3aDQ2bTQwcywgZXRjXG5cdFx0XHRcdFx0XHRcdFx0d2FpdFRpbWUgPSBNYXRoLnBvdygxMCwgdHJpZXMgKyAyKTtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0Y2FzZSAncG93ZXJzLW9mLXR3byc6XG5cdFx0XHRcdFx0XHRcdFx0Ly8gMiBzZWNvbmRzLCA0IHNlY29uZHMsIDggc2Vjb25kc1xuXHRcdFx0XHRcdFx0XHRcdHdhaXRUaW1lID0gTWF0aC5wb3coMiwgdHJpZXMgKyAxKSAqIDEwMDA7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdGNhc2UgJ2luY3JlbWVudHMtb2YtdHdvJzpcblx0XHRcdFx0XHRcdFx0XHQvLyAyIHNlY29uZCwgNCBzZWNvbmRzLCA2IHNlY29uZHMsIGV0Y1xuXHRcdFx0XHRcdFx0XHRcdHdhaXRUaW1lID0gKHRyaWVzICsgMSkgKiAyICogMTAwMDtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBlciA9IG5ldyBFcnJvcignVGhlIGludGVncmF0aW9uXFwncyByZXRyeURlbGF5IHNldHRpbmcgaXMgaW52YWxpZC4nKTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZUhpc3RvcnkoeyBoaXN0b3J5SWQsIHN0ZXA6ICdmYWlsZWQtYW5kLXJldHJ5LWRlbGF5LWlzLWludmFsaWQnLCBlcnJvcjogdHJ1ZSwgZXJyb3JTdGFjazogZXIuc3RhY2sgfSk7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRsb2dnZXIub3V0Z29pbmcuaW5mbyhgVHJ5aW5nIHRoZSBJbnRlZ3JhdGlvbiAkeyB0cmlnZ2VyLm5hbWUgfSB0byAkeyB1cmwgfSBhZ2FpbiBpbiAkeyB3YWl0VGltZSB9IG1pbGxpc2Vjb25kcy5gKTtcblx0XHRcdFx0XHRcdE1ldGVvci5zZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0XHRcdFx0dGhpcy5leGVjdXRlVHJpZ2dlclVybCh1cmwsIHRyaWdnZXIsIHsgZXZlbnQsIG1lc3NhZ2UsIHJvb20sIG93bmVyLCB1c2VyIH0sIGhpc3RvcnlJZCwgdHJpZXMgKyAxKTtcblx0XHRcdFx0XHRcdH0sIHdhaXRUaW1lKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dGhpcy51cGRhdGVIaXN0b3J5KHsgaGlzdG9yeUlkLCBzdGVwOiAndG9vLW1hbnktcmV0cmllcycsIGVycm9yOiB0cnVlIH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnVwZGF0ZUhpc3RvcnkoeyBoaXN0b3J5SWQsIHN0ZXA6ICdmYWlsZWQtYW5kLW5vdC1jb25maWd1cmVkLXRvLXJldHJ5JywgZXJyb3I6IHRydWUgfSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIHByb2Nlc3Mgb3V0Z29pbmcgd2ViaG9vayByZXNwb25zZSBhcyBhIG5ldyBtZXNzYWdlXG5cdFx0XHRpZiAocmVzdWx0ICYmIHRoaXMuc3VjY2Vzc1Jlc3VsdHMuaW5jbHVkZXMocmVzdWx0LnN0YXR1c0NvZGUpKSB7XG5cdFx0XHRcdGlmIChyZXN1bHQgJiYgcmVzdWx0LmRhdGEgJiYgKHJlc3VsdC5kYXRhLnRleHQgfHwgcmVzdWx0LmRhdGEuYXR0YWNobWVudHMpKSB7XG5cdFx0XHRcdFx0Y29uc3QgcmVzdWx0TXNnID0gdGhpcy5zZW5kTWVzc2FnZSh7IHRyaWdnZXIsIHJvb20sIG1lc3NhZ2U6IHJlc3VsdC5kYXRhLCBkYXRhIH0pO1xuXHRcdFx0XHRcdHRoaXMudXBkYXRlSGlzdG9yeSh7IGhpc3RvcnlJZCwgc3RlcDogJ3VybC1yZXNwb25zZS1zZW50LW1lc3NhZ2UnLCByZXN1bHRNZXNzYWdlOiByZXN1bHRNc2csIGZpbmlzaGVkOiB0cnVlIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRyZXBsYXkoaW50ZWdyYXRpb24sIGhpc3RvcnkpIHtcblx0XHRpZiAoIWludGVncmF0aW9uIHx8IGludGVncmF0aW9uLnR5cGUgIT09ICd3ZWJob29rLW91dGdvaW5nJykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW50ZWdyYXRpb24tdHlwZS1tdXN0LWJlLW91dGdvaW5nJywgJ1RoZSBpbnRlZ3JhdGlvbiB0eXBlIHRvIHJlcGxheSBtdXN0IGJlIGFuIG91dGdvaW5nIHdlYmhvb2suJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFoaXN0b3J5IHx8ICFoaXN0b3J5LmRhdGEpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2hpc3RvcnktZGF0YS1tdXN0LWJlLWRlZmluZWQnLCAnVGhlIGhpc3RvcnkgZGF0YSBtdXN0IGJlIGRlZmluZWQgdG8gcmVwbGF5IGFuIGludGVncmF0aW9uLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgZXZlbnQgfSA9IGhpc3Rvcnk7XG5cdFx0Y29uc3QgbWVzc2FnZSA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKGhpc3RvcnkuZGF0YS5tZXNzYWdlX2lkKTtcblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoaGlzdG9yeS5kYXRhLmNoYW5uZWxfaWQpO1xuXHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChoaXN0b3J5LmRhdGEudXNlcl9pZCk7XG5cdFx0bGV0IG93bmVyO1xuXG5cdFx0aWYgKGhpc3RvcnkuZGF0YS5vd25lciAmJiBoaXN0b3J5LmRhdGEub3duZXIuX2lkKSB7XG5cdFx0XHRvd25lciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKGhpc3RvcnkuZGF0YS5vd25lci5faWQpO1xuXHRcdH1cblxuXHRcdHRoaXMuZXhlY3V0ZVRyaWdnZXJVcmwoaGlzdG9yeS51cmwsIGludGVncmF0aW9uLCB7IGV2ZW50LCBtZXNzYWdlLCByb29tLCBvd25lciwgdXNlciB9KTtcblx0fVxufTtcbiIsIlJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucyA9IG5ldyBjbGFzcyBJbnRlZ3JhdGlvbnMgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdpbnRlZ3JhdGlvbnMnKTtcblx0fVxuXG5cdGZpbmRCeVR5cGUodHlwZSwgb3B0aW9ucykge1xuXHRcdGlmICh0eXBlICE9PSAnd2ViaG9vay1pbmNvbWluZycgJiYgdHlwZSAhPT0gJ3dlYmhvb2stb3V0Z29pbmcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXR5cGUtdG8tZmluZCcpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmZpbmQoeyB0eXBlIH0sIG9wdGlvbnMpO1xuXHR9XG5cblx0ZGlzYWJsZUJ5VXNlcklkKHVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLnVwZGF0ZSh7IHVzZXJJZCB9LCB7ICRzZXQ6IHsgZW5hYmxlZDogZmFsc2UgfSB9LCB7IG11bHRpOiB0cnVlIH0pO1xuXHR9XG59O1xuIiwiUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25IaXN0b3J5ID0gbmV3IGNsYXNzIEludGVncmF0aW9uSGlzdG9yeSBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ2ludGVncmF0aW9uX2hpc3RvcnknKTtcblx0fVxuXG5cdGZpbmRCeVR5cGUodHlwZSwgb3B0aW9ucykge1xuXHRcdGlmICh0eXBlICE9PSAnb3V0Z29pbmctd2ViaG9vaycgfHwgdHlwZSAhPT0gJ2luY29taW5nLXdlYmhvb2snKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLWludGVncmF0aW9uLXR5cGUnKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kKHsgdHlwZSB9LCBvcHRpb25zKTtcblx0fVxuXG5cdGZpbmRCeUludGVncmF0aW9uSWQoaWQsIG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gdGhpcy5maW5kKHsgJ2ludGVncmF0aW9uLl9pZCc6IGlkIH0sIG9wdGlvbnMpO1xuXHR9XG5cblx0ZmluZEJ5SW50ZWdyYXRpb25JZEFuZENyZWF0ZWRCeShpZCwgY3JlYXRvcklkLCBvcHRpb25zKSB7XG5cdFx0cmV0dXJuIHRoaXMuZmluZCh7ICdpbnRlZ3JhdGlvbi5faWQnOiBpZCwgJ2ludGVncmF0aW9uLl9jcmVhdGVkQnkuX2lkJzogY3JlYXRvcklkIH0sIG9wdGlvbnMpO1xuXHR9XG5cblx0ZmluZE9uZUJ5SW50ZWdyYXRpb25JZEFuZEhpc3RvcnlJZChpbnRlZ3JhdGlvbklkLCBoaXN0b3J5SWQpIHtcblx0XHRyZXR1cm4gdGhpcy5maW5kT25lKHsgJ2ludGVncmF0aW9uLl9pZCc6IGludGVncmF0aW9uSWQsIF9pZDogaGlzdG9yeUlkIH0pO1xuXHR9XG5cblx0ZmluZEJ5RXZlbnROYW1lKGV2ZW50LCBvcHRpb25zKSB7XG5cdFx0cmV0dXJuIHRoaXMuZmluZCh7IGV2ZW50IH0sIG9wdGlvbnMpO1xuXHR9XG5cblx0ZmluZEZhaWxlZChvcHRpb25zKSB7XG5cdFx0cmV0dXJuIHRoaXMuZmluZCh7IGVycm9yOiB0cnVlIH0sIG9wdGlvbnMpO1xuXHR9XG5cblx0cmVtb3ZlQnlJbnRlZ3JhdGlvbklkKGludGVncmF0aW9uSWQpIHtcblx0XHRyZXR1cm4gdGhpcy5yZW1vdmUoeyAnaW50ZWdyYXRpb24uX2lkJzogaW50ZWdyYXRpb25JZCB9KTtcblx0fVxufTtcbiIsIk1ldGVvci5wdWJsaXNoKCdpbnRlZ3JhdGlvbnMnLCBmdW5jdGlvbiBfaW50ZWdyYXRpb25QdWJsaWNhdGlvbigpIHtcblx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdHJldHVybiB0aGlzLnJlYWR5KCk7XG5cdH1cblxuXHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLWludGVncmF0aW9ucycpKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy5maW5kKCk7XG5cdH0gZWxzZSBpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLW93bi1pbnRlZ3JhdGlvbnMnKSkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZCh7ICdfY3JlYXRlZEJ5Ll9pZCc6IHRoaXMudXNlcklkIH0pO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ25vdC1hdXRob3JpemVkJyk7XG5cdH1cbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ2ludGVncmF0aW9uSGlzdG9yeScsIGZ1bmN0aW9uIF9pbnRlZ3JhdGlvbkhpc3RvcnlQdWJsaWNhdGlvbihpbnRlZ3JhdGlvbklkLCBsaW1pdCA9IDI1KSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5yZWFkeSgpO1xuXHR9XG5cblx0aWYgKFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1pbnRlZ3JhdGlvbnMnKSkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbkhpc3RvcnkuZmluZEJ5SW50ZWdyYXRpb25JZChpbnRlZ3JhdGlvbklkLCB7IHNvcnQ6IHsgX3VwZGF0ZWRBdDogLTEgfSwgbGltaXQgfSk7XG5cdH0gZWxzZSBpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLW93bi1pbnRlZ3JhdGlvbnMnKSkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbkhpc3RvcnkuZmluZEJ5SW50ZWdyYXRpb25JZEFuZENyZWF0ZWRCeShpbnRlZ3JhdGlvbklkLCB0aGlzLnVzZXJJZCwgeyBzb3J0OiB7IF91cGRhdGVkQXQ6IC0xIH0sIGxpbWl0IH0pO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ25vdC1hdXRob3JpemVkJyk7XG5cdH1cbn0pO1xuIiwiLyogZ2xvYmFsIEJhYmVsICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcbmNvbnN0IHZhbGlkQ2hhbm5lbENoYXJzID0gWydAJywgJyMnXTtcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRhZGRJbmNvbWluZ0ludGVncmF0aW9uKGludGVncmF0aW9uKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtaW50ZWdyYXRpb25zJykgJiYgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1vd24taW50ZWdyYXRpb25zJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ25vdF9hdXRob3JpemVkJywgJ1VuYXV0aG9yaXplZCcsIHsgbWV0aG9kOiAnYWRkSW5jb21pbmdJbnRlZ3JhdGlvbicgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFfLmlzU3RyaW5nKGludGVncmF0aW9uLmNoYW5uZWwpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWNoYW5uZWwnLCAnSW52YWxpZCBjaGFubmVsJywgeyBtZXRob2Q6ICdhZGRJbmNvbWluZ0ludGVncmF0aW9uJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoaW50ZWdyYXRpb24uY2hhbm5lbC50cmltKCkgPT09ICcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWNoYW5uZWwnLCAnSW52YWxpZCBjaGFubmVsJywgeyBtZXRob2Q6ICdhZGRJbmNvbWluZ0ludGVncmF0aW9uJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCBjaGFubmVscyA9IF8ubWFwKGludGVncmF0aW9uLmNoYW5uZWwuc3BsaXQoJywnKSwgKGNoYW5uZWwpID0+IHMudHJpbShjaGFubmVsKSk7XG5cblx0XHRmb3IgKGNvbnN0IGNoYW5uZWwgb2YgY2hhbm5lbHMpIHtcblx0XHRcdGlmICghdmFsaWRDaGFubmVsQ2hhcnMuaW5jbHVkZXMoY2hhbm5lbFswXSkpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1jaGFubmVsLXN0YXJ0LXdpdGgtY2hhcnMnLCAnSW52YWxpZCBjaGFubmVsLiBTdGFydCB3aXRoIEAgb3IgIycsIHsgbWV0aG9kOiAndXBkYXRlSW5jb21pbmdJbnRlZ3JhdGlvbicgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKCFfLmlzU3RyaW5nKGludGVncmF0aW9uLnVzZXJuYW1lKSB8fCBpbnRlZ3JhdGlvbi51c2VybmFtZS50cmltKCkgPT09ICcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXJuYW1lJywgJ0ludmFsaWQgdXNlcm5hbWUnLCB7IG1ldGhvZDogJ2FkZEluY29taW5nSW50ZWdyYXRpb24nIH0pO1xuXHRcdH1cblxuXHRcdGlmIChpbnRlZ3JhdGlvbi5zY3JpcHRFbmFibGVkID09PSB0cnVlICYmIGludGVncmF0aW9uLnNjcmlwdCAmJiBpbnRlZ3JhdGlvbi5zY3JpcHQudHJpbSgpICE9PSAnJykge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0bGV0IGJhYmVsT3B0aW9ucyA9IEJhYmVsLmdldERlZmF1bHRPcHRpb25zKHsgcnVudGltZTogZmFsc2UgfSk7XG5cdFx0XHRcdGJhYmVsT3B0aW9ucyA9IF8uZXh0ZW5kKGJhYmVsT3B0aW9ucywgeyBjb21wYWN0OiB0cnVlLCBtaW5pZmllZDogdHJ1ZSwgY29tbWVudHM6IGZhbHNlIH0pO1xuXG5cdFx0XHRcdGludGVncmF0aW9uLnNjcmlwdENvbXBpbGVkID0gQmFiZWwuY29tcGlsZShpbnRlZ3JhdGlvbi5zY3JpcHQsIGJhYmVsT3B0aW9ucykuY29kZTtcblx0XHRcdFx0aW50ZWdyYXRpb24uc2NyaXB0RXJyb3IgPSB1bmRlZmluZWQ7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdGludGVncmF0aW9uLnNjcmlwdENvbXBpbGVkID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRpbnRlZ3JhdGlvbi5zY3JpcHRFcnJvciA9IF8ucGljayhlLCAnbmFtZScsICdtZXNzYWdlJywgJ3N0YWNrJyk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Zm9yIChsZXQgY2hhbm5lbCBvZiBjaGFubmVscykge1xuXHRcdFx0bGV0IHJlY29yZDtcblx0XHRcdGNvbnN0IGNoYW5uZWxUeXBlID0gY2hhbm5lbFswXTtcblx0XHRcdGNoYW5uZWwgPSBjaGFubmVsLnN1YnN0cigxKTtcblxuXHRcdFx0c3dpdGNoIChjaGFubmVsVHlwZSkge1xuXHRcdFx0XHRjYXNlICcjJzpcblx0XHRcdFx0XHRyZWNvcmQgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lKHtcblx0XHRcdFx0XHRcdCRvcjogW1xuXHRcdFx0XHRcdFx0XHR7IF9pZDogY2hhbm5lbCB9LFxuXHRcdFx0XHRcdFx0XHR7IG5hbWU6IGNoYW5uZWwgfSxcblx0XHRcdFx0XHRcdF0sXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ0AnOlxuXHRcdFx0XHRcdHJlY29yZCA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmUoe1xuXHRcdFx0XHRcdFx0JG9yOiBbXG5cdFx0XHRcdFx0XHRcdHsgX2lkOiBjaGFubmVsIH0sXG5cdFx0XHRcdFx0XHRcdHsgdXNlcm5hbWU6IGNoYW5uZWwgfSxcblx0XHRcdFx0XHRcdF0sXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghcmVjb3JkKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nLCB7IG1ldGhvZDogJ2FkZEluY29taW5nSW50ZWdyYXRpb24nIH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzQWxsUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1pbnRlZ3JhdGlvbnMnLCAnbWFuYWdlLW93bi1pbnRlZ3JhdGlvbnMnKSAmJiAhUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocmVjb3JkLl9pZCwgdGhpcy51c2VySWQsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtY2hhbm5lbCcsICdJbnZhbGlkIENoYW5uZWwnLCB7IG1ldGhvZDogJ2FkZEluY29taW5nSW50ZWdyYXRpb24nIH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHsgdXNlcm5hbWU6IGludGVncmF0aW9uLnVzZXJuYW1lIH0pO1xuXG5cdFx0aWYgKCF1c2VyKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdhZGRJbmNvbWluZ0ludGVncmF0aW9uJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCB0b2tlbiA9IFJhbmRvbS5pZCg0OCk7XG5cblx0XHRpbnRlZ3JhdGlvbi50eXBlID0gJ3dlYmhvb2staW5jb21pbmcnO1xuXHRcdGludGVncmF0aW9uLnRva2VuID0gdG9rZW47XG5cdFx0aW50ZWdyYXRpb24uY2hhbm5lbCA9IGNoYW5uZWxzO1xuXHRcdGludGVncmF0aW9uLnVzZXJJZCA9IHVzZXIuX2lkO1xuXHRcdGludGVncmF0aW9uLl9jcmVhdGVkQXQgPSBuZXcgRGF0ZSgpO1xuXHRcdGludGVncmF0aW9uLl9jcmVhdGVkQnkgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHRoaXMudXNlcklkLCB7IGZpZWxkczogeyB1c2VybmFtZTogMSB9IH0pO1xuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuYWRkVXNlclJvbGVzKHVzZXIuX2lkLCAnYm90Jyk7XG5cblx0XHRpbnRlZ3JhdGlvbi5faWQgPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuaW5zZXJ0KGludGVncmF0aW9uKTtcblxuXHRcdHJldHVybiBpbnRlZ3JhdGlvbjtcblx0fSxcbn0pO1xuIiwiLyogZ2xvYmFsIEJhYmVsICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcbmNvbnN0IHZhbGlkQ2hhbm5lbENoYXJzID0gWydAJywgJyMnXTtcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHR1cGRhdGVJbmNvbWluZ0ludGVncmF0aW9uKGludGVncmF0aW9uSWQsIGludGVncmF0aW9uKSB7XG5cdFx0aWYgKCFfLmlzU3RyaW5nKGludGVncmF0aW9uLmNoYW5uZWwpIHx8IGludGVncmF0aW9uLmNoYW5uZWwudHJpbSgpID09PSAnJykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1jaGFubmVsJywgJ0ludmFsaWQgY2hhbm5lbCcsIHsgbWV0aG9kOiAndXBkYXRlSW5jb21pbmdJbnRlZ3JhdGlvbicgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgY2hhbm5lbHMgPSBfLm1hcChpbnRlZ3JhdGlvbi5jaGFubmVsLnNwbGl0KCcsJyksIChjaGFubmVsKSA9PiBzLnRyaW0oY2hhbm5lbCkpO1xuXG5cdFx0Zm9yIChjb25zdCBjaGFubmVsIG9mIGNoYW5uZWxzKSB7XG5cdFx0XHRpZiAoIXZhbGlkQ2hhbm5lbENoYXJzLmluY2x1ZGVzKGNoYW5uZWxbMF0pKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtY2hhbm5lbC1zdGFydC13aXRoLWNoYXJzJywgJ0ludmFsaWQgY2hhbm5lbC4gU3RhcnQgd2l0aCBAIG9yICMnLCB7IG1ldGhvZDogJ3VwZGF0ZUluY29taW5nSW50ZWdyYXRpb24nIH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGxldCBjdXJyZW50SW50ZWdyYXRpb247XG5cblx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLWludGVncmF0aW9ucycpKSB7XG5cdFx0XHRjdXJyZW50SW50ZWdyYXRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZE9uZShpbnRlZ3JhdGlvbklkKTtcblx0XHR9IGVsc2UgaWYgKFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1vd24taW50ZWdyYXRpb25zJykpIHtcblx0XHRcdGN1cnJlbnRJbnRlZ3JhdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy5maW5kT25lKHsgX2lkOiBpbnRlZ3JhdGlvbklkLCAnX2NyZWF0ZWRCeS5faWQnOiB0aGlzLnVzZXJJZCB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm90X2F1dGhvcml6ZWQnLCAnVW5hdXRob3JpemVkJywgeyBtZXRob2Q6ICd1cGRhdGVJbmNvbWluZ0ludGVncmF0aW9uJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIWN1cnJlbnRJbnRlZ3JhdGlvbikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1pbnRlZ3JhdGlvbicsICdJbnZhbGlkIGludGVncmF0aW9uJywgeyBtZXRob2Q6ICd1cGRhdGVJbmNvbWluZ0ludGVncmF0aW9uJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoaW50ZWdyYXRpb24uc2NyaXB0RW5hYmxlZCA9PT0gdHJ1ZSAmJiBpbnRlZ3JhdGlvbi5zY3JpcHQgJiYgaW50ZWdyYXRpb24uc2NyaXB0LnRyaW0oKSAhPT0gJycpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGxldCBiYWJlbE9wdGlvbnMgPSBCYWJlbC5nZXREZWZhdWx0T3B0aW9ucyh7IHJ1bnRpbWU6IGZhbHNlIH0pO1xuXHRcdFx0XHRiYWJlbE9wdGlvbnMgPSBfLmV4dGVuZChiYWJlbE9wdGlvbnMsIHsgY29tcGFjdDogdHJ1ZSwgbWluaWZpZWQ6IHRydWUsIGNvbW1lbnRzOiBmYWxzZSB9KTtcblxuXHRcdFx0XHRpbnRlZ3JhdGlvbi5zY3JpcHRDb21waWxlZCA9IEJhYmVsLmNvbXBpbGUoaW50ZWdyYXRpb24uc2NyaXB0LCBiYWJlbE9wdGlvbnMpLmNvZGU7XG5cdFx0XHRcdGludGVncmF0aW9uLnNjcmlwdEVycm9yID0gdW5kZWZpbmVkO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRpbnRlZ3JhdGlvbi5zY3JpcHRDb21waWxlZCA9IHVuZGVmaW5lZDtcblx0XHRcdFx0aW50ZWdyYXRpb24uc2NyaXB0RXJyb3IgPSBfLnBpY2soZSwgJ25hbWUnLCAnbWVzc2FnZScsICdzdGFjaycpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZvciAobGV0IGNoYW5uZWwgb2YgY2hhbm5lbHMpIHtcblx0XHRcdGNvbnN0IGNoYW5uZWxUeXBlID0gY2hhbm5lbFswXTtcblx0XHRcdGNoYW5uZWwgPSBjaGFubmVsLnN1YnN0cigxKTtcblx0XHRcdGxldCByZWNvcmQ7XG5cblx0XHRcdHN3aXRjaCAoY2hhbm5lbFR5cGUpIHtcblx0XHRcdFx0Y2FzZSAnIyc6XG5cdFx0XHRcdFx0cmVjb3JkID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZSh7XG5cdFx0XHRcdFx0XHQkb3I6IFtcblx0XHRcdFx0XHRcdFx0eyBfaWQ6IGNoYW5uZWwgfSxcblx0XHRcdFx0XHRcdFx0eyBuYW1lOiBjaGFubmVsIH0sXG5cdFx0XHRcdFx0XHRdLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdAJzpcblx0XHRcdFx0XHRyZWNvcmQgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHtcblx0XHRcdFx0XHRcdCRvcjogW1xuXHRcdFx0XHRcdFx0XHR7IF9pZDogY2hhbm5lbCB9LFxuXHRcdFx0XHRcdFx0XHR7IHVzZXJuYW1lOiBjaGFubmVsIH0sXG5cdFx0XHRcdFx0XHRdLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIXJlY29yZCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywgeyBtZXRob2Q6ICd1cGRhdGVJbmNvbWluZ0ludGVncmF0aW9uJyB9KTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc0FsbFBlcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtaW50ZWdyYXRpb25zJywgJ21hbmFnZS1vd24taW50ZWdyYXRpb25zJykgJiYgIVJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHJlY29yZC5faWQsIHRoaXMudXNlcklkLCB7IGZpZWxkczogeyBfaWQ6IDEgfSB9KSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWNoYW5uZWwnLCAnSW52YWxpZCBDaGFubmVsJywgeyBtZXRob2Q6ICd1cGRhdGVJbmNvbWluZ0ludGVncmF0aW9uJyB9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZSh7IHVzZXJuYW1lOiBjdXJyZW50SW50ZWdyYXRpb24udXNlcm5hbWUgfSk7XG5cblx0XHRpZiAoIXVzZXIgfHwgIXVzZXIuX2lkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXBvc3QtYXMtdXNlcicsICdJbnZhbGlkIFBvc3QgQXMgVXNlcicsIHsgbWV0aG9kOiAndXBkYXRlSW5jb21pbmdJbnRlZ3JhdGlvbicgfSk7XG5cdFx0fVxuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuYWRkVXNlclJvbGVzKHVzZXIuX2lkLCAnYm90Jyk7XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMudXBkYXRlKGludGVncmF0aW9uSWQsIHtcblx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0ZW5hYmxlZDogaW50ZWdyYXRpb24uZW5hYmxlZCxcblx0XHRcdFx0bmFtZTogaW50ZWdyYXRpb24ubmFtZSxcblx0XHRcdFx0YXZhdGFyOiBpbnRlZ3JhdGlvbi5hdmF0YXIsXG5cdFx0XHRcdGVtb2ppOiBpbnRlZ3JhdGlvbi5lbW9qaSxcblx0XHRcdFx0YWxpYXM6IGludGVncmF0aW9uLmFsaWFzLFxuXHRcdFx0XHRjaGFubmVsOiBjaGFubmVscyxcblx0XHRcdFx0c2NyaXB0OiBpbnRlZ3JhdGlvbi5zY3JpcHQsXG5cdFx0XHRcdHNjcmlwdEVuYWJsZWQ6IGludGVncmF0aW9uLnNjcmlwdEVuYWJsZWQsXG5cdFx0XHRcdHNjcmlwdENvbXBpbGVkOiBpbnRlZ3JhdGlvbi5zY3JpcHRDb21waWxlZCxcblx0XHRcdFx0c2NyaXB0RXJyb3I6IGludGVncmF0aW9uLnNjcmlwdEVycm9yLFxuXHRcdFx0XHRfdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLFxuXHRcdFx0XHRfdXBkYXRlZEJ5OiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHRoaXMudXNlcklkLCB7IGZpZWxkczogeyB1c2VybmFtZTogMSB9IH0pLFxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZE9uZShpbnRlZ3JhdGlvbklkKTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHRkZWxldGVJbmNvbWluZ0ludGVncmF0aW9uKGludGVncmF0aW9uSWQpIHtcblx0XHRsZXQgaW50ZWdyYXRpb247XG5cblx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLWludGVncmF0aW9ucycpKSB7XG5cdFx0XHRpbnRlZ3JhdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy5maW5kT25lKGludGVncmF0aW9uSWQpO1xuXHRcdH0gZWxzZSBpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLW93bi1pbnRlZ3JhdGlvbnMnKSkge1xuXHRcdFx0aW50ZWdyYXRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZE9uZShpbnRlZ3JhdGlvbklkLCB7IGZpZWxkcyA6IHsgJ19jcmVhdGVkQnkuX2lkJzogdGhpcy51c2VySWQgfSB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm90X2F1dGhvcml6ZWQnLCAnVW5hdXRob3JpemVkJywgeyBtZXRob2Q6ICdkZWxldGVJbmNvbWluZ0ludGVncmF0aW9uJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIWludGVncmF0aW9uKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWludGVncmF0aW9uJywgJ0ludmFsaWQgaW50ZWdyYXRpb24nLCB7IG1ldGhvZDogJ2RlbGV0ZUluY29taW5nSW50ZWdyYXRpb24nIH0pO1xuXHRcdH1cblxuXHRcdFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy5yZW1vdmUoeyBfaWQ6IGludGVncmF0aW9uSWQgfSk7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHRhZGRPdXRnb2luZ0ludGVncmF0aW9uKGludGVncmF0aW9uKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtaW50ZWdyYXRpb25zJylcblx0XHRcdCYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2Utb3duLWludGVncmF0aW9ucycpXG5cdFx0XHQmJiAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLWludGVncmF0aW9ucycsICdib3QnKVxuXHRcdFx0JiYgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1vd24taW50ZWdyYXRpb25zJywgJ2JvdCcpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdub3RfYXV0aG9yaXplZCcpO1xuXHRcdH1cblxuXHRcdGludGVncmF0aW9uID0gUm9ja2V0Q2hhdC5pbnRlZ3JhdGlvbnMudmFsaWRhdGVPdXRnb2luZyhpbnRlZ3JhdGlvbiwgdGhpcy51c2VySWQpO1xuXG5cdFx0aW50ZWdyYXRpb24uX2NyZWF0ZWRBdCA9IG5ldyBEYXRlKCk7XG5cdFx0aW50ZWdyYXRpb24uX2NyZWF0ZWRCeSA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmUodGhpcy51c2VySWQsIHsgZmllbGRzOiB7IHVzZXJuYW1lOiAxIH0gfSk7XG5cdFx0aW50ZWdyYXRpb24uX2lkID0gUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25zLmluc2VydChpbnRlZ3JhdGlvbik7XG5cblx0XHRyZXR1cm4gaW50ZWdyYXRpb247XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0dXBkYXRlT3V0Z29pbmdJbnRlZ3JhdGlvbihpbnRlZ3JhdGlvbklkLCBpbnRlZ3JhdGlvbikge1xuXHRcdGludGVncmF0aW9uID0gUm9ja2V0Q2hhdC5pbnRlZ3JhdGlvbnMudmFsaWRhdGVPdXRnb2luZyhpbnRlZ3JhdGlvbiwgdGhpcy51c2VySWQpO1xuXG5cdFx0aWYgKCFpbnRlZ3JhdGlvbi50b2tlbiB8fCBpbnRlZ3JhdGlvbi50b2tlbi50cmltKCkgPT09ICcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXRva2VuJywgJ0ludmFsaWQgdG9rZW4nLCB7IG1ldGhvZDogJ3VwZGF0ZU91dGdvaW5nSW50ZWdyYXRpb24nIH0pO1xuXHRcdH1cblxuXHRcdGxldCBjdXJyZW50SW50ZWdyYXRpb247XG5cblx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLWludGVncmF0aW9ucycpKSB7XG5cdFx0XHRjdXJyZW50SW50ZWdyYXRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZE9uZShpbnRlZ3JhdGlvbklkKTtcblx0XHR9IGVsc2UgaWYgKFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1vd24taW50ZWdyYXRpb25zJykpIHtcblx0XHRcdGN1cnJlbnRJbnRlZ3JhdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy5maW5kT25lKHsgX2lkOiBpbnRlZ3JhdGlvbklkLCAnX2NyZWF0ZWRCeS5faWQnOiB0aGlzLnVzZXJJZCB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm90X2F1dGhvcml6ZWQnLCAnVW5hdXRob3JpemVkJywgeyBtZXRob2Q6ICd1cGRhdGVPdXRnb2luZ0ludGVncmF0aW9uJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIWN1cnJlbnRJbnRlZ3JhdGlvbikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZF9pbnRlZ3JhdGlvbicsICdbbWV0aG9kc10gdXBkYXRlT3V0Z29pbmdJbnRlZ3JhdGlvbiAtPiBpbnRlZ3JhdGlvbiBub3QgZm91bmQnKTtcblx0XHR9XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMudXBkYXRlKGludGVncmF0aW9uSWQsIHtcblx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0ZXZlbnQ6IGludGVncmF0aW9uLmV2ZW50LFxuXHRcdFx0XHRlbmFibGVkOiBpbnRlZ3JhdGlvbi5lbmFibGVkLFxuXHRcdFx0XHRuYW1lOiBpbnRlZ3JhdGlvbi5uYW1lLFxuXHRcdFx0XHRhdmF0YXI6IGludGVncmF0aW9uLmF2YXRhcixcblx0XHRcdFx0ZW1vamk6IGludGVncmF0aW9uLmVtb2ppLFxuXHRcdFx0XHRhbGlhczogaW50ZWdyYXRpb24uYWxpYXMsXG5cdFx0XHRcdGNoYW5uZWw6IGludGVncmF0aW9uLmNoYW5uZWwsXG5cdFx0XHRcdHRhcmdldFJvb206IGludGVncmF0aW9uLnRhcmdldFJvb20sXG5cdFx0XHRcdGltcGVyc29uYXRlVXNlcjogaW50ZWdyYXRpb24uaW1wZXJzb25hdGVVc2VyLFxuXHRcdFx0XHR1c2VybmFtZTogaW50ZWdyYXRpb24udXNlcm5hbWUsXG5cdFx0XHRcdHVzZXJJZDogaW50ZWdyYXRpb24udXNlcklkLFxuXHRcdFx0XHR1cmxzOiBpbnRlZ3JhdGlvbi51cmxzLFxuXHRcdFx0XHR0b2tlbjogaW50ZWdyYXRpb24udG9rZW4sXG5cdFx0XHRcdHNjcmlwdDogaW50ZWdyYXRpb24uc2NyaXB0LFxuXHRcdFx0XHRzY3JpcHRFbmFibGVkOiBpbnRlZ3JhdGlvbi5zY3JpcHRFbmFibGVkLFxuXHRcdFx0XHRzY3JpcHRDb21waWxlZDogaW50ZWdyYXRpb24uc2NyaXB0Q29tcGlsZWQsXG5cdFx0XHRcdHNjcmlwdEVycm9yOiBpbnRlZ3JhdGlvbi5zY3JpcHRFcnJvcixcblx0XHRcdFx0dHJpZ2dlcldvcmRzOiBpbnRlZ3JhdGlvbi50cmlnZ2VyV29yZHMsXG5cdFx0XHRcdHJldHJ5RmFpbGVkQ2FsbHM6IGludGVncmF0aW9uLnJldHJ5RmFpbGVkQ2FsbHMsXG5cdFx0XHRcdHJldHJ5Q291bnQ6IGludGVncmF0aW9uLnJldHJ5Q291bnQsXG5cdFx0XHRcdHJldHJ5RGVsYXk6IGludGVncmF0aW9uLnJldHJ5RGVsYXksXG5cdFx0XHRcdHRyaWdnZXJXb3JkQW55d2hlcmU6IGludGVncmF0aW9uLnRyaWdnZXJXb3JkQW55d2hlcmUsXG5cdFx0XHRcdHJ1bk9uRWRpdHM6IGludGVncmF0aW9uLnJ1bk9uRWRpdHMsXG5cdFx0XHRcdF91cGRhdGVkQXQ6IG5ldyBEYXRlKCksXG5cdFx0XHRcdF91cGRhdGVkQnk6IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmUodGhpcy51c2VySWQsIHsgZmllbGRzOiB7IHVzZXJuYW1lOiAxIH0gfSksXG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy5maW5kT25lKGludGVncmF0aW9uSWQpO1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdHJlcGxheU91dGdvaW5nSW50ZWdyYXRpb24oeyBpbnRlZ3JhdGlvbklkLCBoaXN0b3J5SWQgfSkge1xuXHRcdGxldCBpbnRlZ3JhdGlvbjtcblxuXHRcdGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtaW50ZWdyYXRpb25zJykgfHwgUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLWludGVncmF0aW9ucycsICdib3QnKSkge1xuXHRcdFx0aW50ZWdyYXRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZE9uZShpbnRlZ3JhdGlvbklkKTtcblx0XHR9IGVsc2UgaWYgKFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1vd24taW50ZWdyYXRpb25zJykgfHwgUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLW93bi1pbnRlZ3JhdGlvbnMnLCAnYm90JykpIHtcblx0XHRcdGludGVncmF0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25zLmZpbmRPbmUoaW50ZWdyYXRpb25JZCwgeyBmaWVsZHM6IHsgJ19jcmVhdGVkQnkuX2lkJzogdGhpcy51c2VySWQgfSB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm90X2F1dGhvcml6ZWQnLCAnVW5hdXRob3JpemVkJywgeyBtZXRob2Q6ICdyZXBsYXlPdXRnb2luZ0ludGVncmF0aW9uJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIWludGVncmF0aW9uKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWludGVncmF0aW9uJywgJ0ludmFsaWQgaW50ZWdyYXRpb24nLCB7IG1ldGhvZDogJ3JlcGxheU91dGdvaW5nSW50ZWdyYXRpb24nIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGhpc3RvcnkgPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbkhpc3RvcnkuZmluZE9uZUJ5SW50ZWdyYXRpb25JZEFuZEhpc3RvcnlJZChpbnRlZ3JhdGlvbi5faWQsIGhpc3RvcnlJZCk7XG5cblx0XHRpZiAoIWhpc3RvcnkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtaW50ZWdyYXRpb24taGlzdG9yeScsICdJbnZhbGlkIEludGVncmF0aW9uIEhpc3RvcnknLCB7IG1ldGhvZDogJ3JlcGxheU91dGdvaW5nSW50ZWdyYXRpb24nIH0pO1xuXHRcdH1cblxuXHRcdFJvY2tldENoYXQuaW50ZWdyYXRpb25zLnRyaWdnZXJIYW5kbGVyLnJlcGxheShpbnRlZ3JhdGlvbiwgaGlzdG9yeSk7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHRkZWxldGVPdXRnb2luZ0ludGVncmF0aW9uKGludGVncmF0aW9uSWQpIHtcblx0XHRsZXQgaW50ZWdyYXRpb247XG5cblx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLWludGVncmF0aW9ucycpIHx8IFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1pbnRlZ3JhdGlvbnMnLCAnYm90JykpIHtcblx0XHRcdGludGVncmF0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25zLmZpbmRPbmUoaW50ZWdyYXRpb25JZCk7XG5cdFx0fSBlbHNlIGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2Utb3duLWludGVncmF0aW9ucycpIHx8IFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1vd24taW50ZWdyYXRpb25zJywgJ2JvdCcpKSB7XG5cdFx0XHRpbnRlZ3JhdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy5maW5kT25lKGludGVncmF0aW9uSWQsIHsgZmllbGRzOiB7ICdfY3JlYXRlZEJ5Ll9pZCc6IHRoaXMudXNlcklkIH0gfSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ25vdF9hdXRob3JpemVkJywgJ1VuYXV0aG9yaXplZCcsIHsgbWV0aG9kOiAnZGVsZXRlT3V0Z29pbmdJbnRlZ3JhdGlvbicgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFpbnRlZ3JhdGlvbikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1pbnRlZ3JhdGlvbicsICdJbnZhbGlkIGludGVncmF0aW9uJywgeyBtZXRob2Q6ICdkZWxldGVPdXRnb2luZ0ludGVncmF0aW9uJyB9KTtcblx0XHR9XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMucmVtb3ZlKHsgX2lkOiBpbnRlZ3JhdGlvbklkIH0pO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9uSGlzdG9yeS5yZW1vdmVCeUludGVncmF0aW9uSWQoaW50ZWdyYXRpb25JZCk7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHRjbGVhckludGVncmF0aW9uSGlzdG9yeShpbnRlZ3JhdGlvbklkKSB7XG5cdFx0bGV0IGludGVncmF0aW9uO1xuXG5cdFx0aWYgKFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1pbnRlZ3JhdGlvbnMnKSB8fCBSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtaW50ZWdyYXRpb25zJywgJ2JvdCcpKSB7XG5cdFx0XHRpbnRlZ3JhdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy5maW5kT25lKGludGVncmF0aW9uSWQpO1xuXHRcdH0gZWxzZSBpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLW93bi1pbnRlZ3JhdGlvbnMnKSB8fCBSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2Utb3duLWludGVncmF0aW9ucycsICdib3QnKSkge1xuXHRcdFx0aW50ZWdyYXRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbnMuZmluZE9uZShpbnRlZ3JhdGlvbklkLCB7IGZpZWxkczogeyAnX2NyZWF0ZWRCeS5faWQnOiB0aGlzLnVzZXJJZCB9IH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdub3RfYXV0aG9yaXplZCcsICdVbmF1dGhvcml6ZWQnLCB7IG1ldGhvZDogJ2NsZWFySW50ZWdyYXRpb25IaXN0b3J5JyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIWludGVncmF0aW9uKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWludGVncmF0aW9uJywgJ0ludmFsaWQgaW50ZWdyYXRpb24nLCB7IG1ldGhvZDogJ2NsZWFySW50ZWdyYXRpb25IaXN0b3J5JyB9KTtcblx0XHR9XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5JbnRlZ3JhdGlvbkhpc3RvcnkucmVtb3ZlQnlJbnRlZ3JhdGlvbklkKGludGVncmF0aW9uSWQpO1xuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH0sXG59KTtcbiIsIi8qIGdsb2JhbHMgTWV0ZW9yIFJlc3RpdnVzIGxvZ2dlciBwcm9jZXNzV2ViaG9va01lc3NhZ2UqL1xuLy8gVE9ETzogcmVtb3ZlIGdsb2JhbHNcblxuaW1wb3J0IEZpYmVyIGZyb20gJ2ZpYmVycyc7XG5pbXBvcnQgRnV0dXJlIGZyb20gJ2ZpYmVycy9mdXR1cmUnO1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5pbXBvcnQgdm0gZnJvbSAndm0nO1xuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnO1xuXG5jb25zdCBBcGkgPSBuZXcgUmVzdGl2dXMoe1xuXHRlbmFibGVDb3JzOiB0cnVlLFxuXHRhcGlQYXRoOiAnaG9va3MvJyxcblx0YXV0aDoge1xuXHRcdHVzZXIoKSB7XG5cdFx0XHRjb25zdCBwYXlsb2FkS2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuYm9keVBhcmFtcyk7XG5cdFx0XHRjb25zdCBwYXlsb2FkSXNXcmFwcGVkID0gKHRoaXMuYm9keVBhcmFtcyAmJiB0aGlzLmJvZHlQYXJhbXMucGF5bG9hZCkgJiYgcGF5bG9hZEtleXMubGVuZ3RoID09PSAxO1xuXHRcdFx0aWYgKHBheWxvYWRJc1dyYXBwZWQgJiYgdGhpcy5yZXF1ZXN0LmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddID09PSAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJykge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHRoaXMuYm9keVBhcmFtcyA9IEpTT04ucGFyc2UodGhpcy5ib2R5UGFyYW1zLnBheWxvYWQpO1xuXHRcdFx0XHR9IGNhdGNoICh7IG1lc3NhZ2UgfSkge1xuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRlcnJvcjoge1xuXHRcdFx0XHRcdFx0XHRzdGF0dXNDb2RlOiA0MDAsXG5cdFx0XHRcdFx0XHRcdGJvZHk6IHtcblx0XHRcdFx0XHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0XHRlcnJvcjogbWVzc2FnZSxcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmludGVncmF0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuSW50ZWdyYXRpb25zLmZpbmRPbmUoe1xuXHRcdFx0XHRfaWQ6IHRoaXMucmVxdWVzdC5wYXJhbXMuaW50ZWdyYXRpb25JZCxcblx0XHRcdFx0dG9rZW46IGRlY29kZVVSSUNvbXBvbmVudCh0aGlzLnJlcXVlc3QucGFyYW1zLnRva2VuKSxcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoIXRoaXMuaW50ZWdyYXRpb24pIHtcblx0XHRcdFx0bG9nZ2VyLmluY29taW5nLmluZm8oJ0ludmFsaWQgaW50ZWdyYXRpb24gaWQnLCB0aGlzLnJlcXVlc3QucGFyYW1zLmludGVncmF0aW9uSWQsICdvciB0b2tlbicsIHRoaXMucmVxdWVzdC5wYXJhbXMudG9rZW4pO1xuXG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXJyb3I6IHtcblx0XHRcdFx0XHRcdHN0YXR1c0NvZGU6IDQwNCxcblx0XHRcdFx0XHRcdGJvZHk6IHtcblx0XHRcdFx0XHRcdFx0c3VjY2VzczogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdGVycm9yOiAnSW52YWxpZCBpbnRlZ3JhdGlvbiBpZCBvciB0b2tlbiBwcm92aWRlZC4nLFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZSh7XG5cdFx0XHRcdF9pZDogdGhpcy5pbnRlZ3JhdGlvbi51c2VySWQsXG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHsgdXNlciB9O1xuXHRcdH0sXG5cdH0sXG59KTtcblxuY29uc3QgY29tcGlsZWRTY3JpcHRzID0ge307XG5mdW5jdGlvbiBidWlsZFNhbmRib3goc3RvcmUgPSB7fSkge1xuXHRjb25zdCBzYW5kYm94ID0ge1xuXHRcdHNjcmlwdFRpbWVvdXQocmVqZWN0KSB7XG5cdFx0XHRyZXR1cm4gc2V0VGltZW91dCgoKSA9PiByZWplY3QoJ3RpbWVkIG91dCcpLCAzMDAwKTtcblx0XHR9LFxuXHRcdF8sXG5cdFx0cyxcblx0XHRjb25zb2xlLFxuXHRcdG1vbWVudCxcblx0XHRGaWJlcixcblx0XHRQcm9taXNlLFxuXHRcdExpdmVjaGF0OiBSb2NrZXRDaGF0LkxpdmVjaGF0LFxuXHRcdFN0b3JlOiB7XG5cdFx0XHRzZXQoa2V5LCB2YWwpIHtcblx0XHRcdFx0cmV0dXJuIHN0b3JlW2tleV0gPSB2YWw7XG5cdFx0XHR9LFxuXHRcdFx0Z2V0KGtleSkge1xuXHRcdFx0XHRyZXR1cm4gc3RvcmVba2V5XTtcblx0XHRcdH0sXG5cdFx0fSxcblx0XHRIVFRQKG1ldGhvZCwgdXJsLCBvcHRpb25zKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdHJlc3VsdDogSFRUUC5jYWxsKG1ldGhvZCwgdXJsLCBvcHRpb25zKSxcblx0XHRcdFx0fTtcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXJyb3IsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fSxcblx0fTtcblxuXHRPYmplY3Qua2V5cyhSb2NrZXRDaGF0Lm1vZGVscykuZmlsdGVyKChrKSA9PiAhay5zdGFydHNXaXRoKCdfJykpLmZvckVhY2goKGspID0+IHNhbmRib3hba10gPSBSb2NrZXRDaGF0Lm1vZGVsc1trXSk7XG5cdHJldHVybiB7IHN0b3JlLCBzYW5kYm94XHR9O1xufVxuXG5mdW5jdGlvbiBnZXRJbnRlZ3JhdGlvblNjcmlwdChpbnRlZ3JhdGlvbikge1xuXHRjb25zdCBjb21waWxlZFNjcmlwdCA9IGNvbXBpbGVkU2NyaXB0c1tpbnRlZ3JhdGlvbi5faWRdO1xuXHRpZiAoY29tcGlsZWRTY3JpcHQgJiYgK2NvbXBpbGVkU2NyaXB0Ll91cGRhdGVkQXQgPT09ICtpbnRlZ3JhdGlvbi5fdXBkYXRlZEF0KSB7XG5cdFx0cmV0dXJuIGNvbXBpbGVkU2NyaXB0LnNjcmlwdDtcblx0fVxuXG5cdGNvbnN0IHNjcmlwdCA9IGludGVncmF0aW9uLnNjcmlwdENvbXBpbGVkO1xuXHRjb25zdCB7IHNhbmRib3gsIHN0b3JlIH0gPSBidWlsZFNhbmRib3goKTtcblx0dHJ5IHtcblx0XHRsb2dnZXIuaW5jb21pbmcuaW5mbygnV2lsbCBldmFsdWF0ZSBzY3JpcHQgb2YgVHJpZ2dlcicsIGludGVncmF0aW9uLm5hbWUpO1xuXHRcdGxvZ2dlci5pbmNvbWluZy5kZWJ1ZyhzY3JpcHQpO1xuXG5cdFx0Y29uc3Qgdm1TY3JpcHQgPSB2bS5jcmVhdGVTY3JpcHQoc2NyaXB0LCAnc2NyaXB0LmpzJyk7XG5cdFx0dm1TY3JpcHQucnVuSW5OZXdDb250ZXh0KHNhbmRib3gpO1xuXHRcdGlmIChzYW5kYm94LlNjcmlwdCkge1xuXHRcdFx0Y29tcGlsZWRTY3JpcHRzW2ludGVncmF0aW9uLl9pZF0gPSB7XG5cdFx0XHRcdHNjcmlwdDogbmV3IHNhbmRib3guU2NyaXB0KCksXG5cdFx0XHRcdHN0b3JlLFxuXHRcdFx0XHRfdXBkYXRlZEF0OiBpbnRlZ3JhdGlvbi5fdXBkYXRlZEF0LFxuXHRcdFx0fTtcblxuXHRcdFx0cmV0dXJuIGNvbXBpbGVkU2NyaXB0c1tpbnRlZ3JhdGlvbi5faWRdLnNjcmlwdDtcblx0XHR9XG5cdH0gY2F0Y2ggKHsgc3RhY2sgfSkge1xuXHRcdGxvZ2dlci5pbmNvbWluZy5lcnJvcignW0Vycm9yIGV2YWx1YXRpbmcgU2NyaXB0IGluIFRyaWdnZXInLCBpbnRlZ3JhdGlvbi5uYW1lLCAnOl0nKTtcblx0XHRsb2dnZXIuaW5jb21pbmcuZXJyb3Ioc2NyaXB0LnJlcGxhY2UoL14vZ20sICcgICcpKTtcblx0XHRsb2dnZXIuaW5jb21pbmcuZXJyb3IoJ1tTdGFjazpdJyk7XG5cdFx0bG9nZ2VyLmluY29taW5nLmVycm9yKHN0YWNrLnJlcGxhY2UoL14vZ20sICcgICcpKTtcblx0XHR0aHJvdyBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdlcnJvci1ldmFsdWF0aW5nLXNjcmlwdCcpO1xuXHR9XG5cblx0aWYgKCFzYW5kYm94LlNjcmlwdCkge1xuXHRcdGxvZ2dlci5pbmNvbWluZy5lcnJvcignW0NsYXNzIFwiU2NyaXB0XCIgbm90IGluIFRyaWdnZXInLCBpbnRlZ3JhdGlvbi5uYW1lLCAnXScpO1xuXHRcdHRocm93IFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ2NsYXNzLXNjcmlwdC1ub3QtZm91bmQnKTtcblx0fVxufVxuXG5mdW5jdGlvbiBjcmVhdGVJbnRlZ3JhdGlvbihvcHRpb25zLCB1c2VyKSB7XG5cdGxvZ2dlci5pbmNvbWluZy5pbmZvKCdBZGQgaW50ZWdyYXRpb24nLCBvcHRpb25zLm5hbWUpO1xuXHRsb2dnZXIuaW5jb21pbmcuZGVidWcob3B0aW9ucyk7XG5cblx0TWV0ZW9yLnJ1bkFzVXNlcih1c2VyLl9pZCwgZnVuY3Rpb24oKSB7XG5cdFx0c3dpdGNoIChvcHRpb25zLmV2ZW50KSB7XG5cdFx0XHRjYXNlICduZXdNZXNzYWdlT25DaGFubmVsJzpcblx0XHRcdFx0aWYgKG9wdGlvbnMuZGF0YSA9PSBudWxsKSB7XG5cdFx0XHRcdFx0b3B0aW9ucy5kYXRhID0ge307XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKChvcHRpb25zLmRhdGEuY2hhbm5lbF9uYW1lICE9IG51bGwpICYmIG9wdGlvbnMuZGF0YS5jaGFubmVsX25hbWUuaW5kZXhPZignIycpID09PSAtMSkge1xuXHRcdFx0XHRcdG9wdGlvbnMuZGF0YS5jaGFubmVsX25hbWUgPSBgIyR7IG9wdGlvbnMuZGF0YS5jaGFubmVsX25hbWUgfWA7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIE1ldGVvci5jYWxsKCdhZGRPdXRnb2luZ0ludGVncmF0aW9uJywge1xuXHRcdFx0XHRcdHVzZXJuYW1lOiAncm9ja2V0LmNhdCcsXG5cdFx0XHRcdFx0dXJsczogW29wdGlvbnMudGFyZ2V0X3VybF0sXG5cdFx0XHRcdFx0bmFtZTogb3B0aW9ucy5uYW1lLFxuXHRcdFx0XHRcdGNoYW5uZWw6IG9wdGlvbnMuZGF0YS5jaGFubmVsX25hbWUsXG5cdFx0XHRcdFx0dHJpZ2dlcldvcmRzOiBvcHRpb25zLmRhdGEudHJpZ2dlcl93b3Jkcyxcblx0XHRcdFx0fSk7XG5cdFx0XHRjYXNlICduZXdNZXNzYWdlVG9Vc2VyJzpcblx0XHRcdFx0aWYgKG9wdGlvbnMuZGF0YS51c2VybmFtZS5pbmRleE9mKCdAJykgPT09IC0xKSB7XG5cdFx0XHRcdFx0b3B0aW9ucy5kYXRhLnVzZXJuYW1lID0gYEAkeyBvcHRpb25zLmRhdGEudXNlcm5hbWUgfWA7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIE1ldGVvci5jYWxsKCdhZGRPdXRnb2luZ0ludGVncmF0aW9uJywge1xuXHRcdFx0XHRcdHVzZXJuYW1lOiAncm9ja2V0LmNhdCcsXG5cdFx0XHRcdFx0dXJsczogW29wdGlvbnMudGFyZ2V0X3VybF0sXG5cdFx0XHRcdFx0bmFtZTogb3B0aW9ucy5uYW1lLFxuXHRcdFx0XHRcdGNoYW5uZWw6IG9wdGlvbnMuZGF0YS51c2VybmFtZSxcblx0XHRcdFx0XHR0cmlnZ2VyV29yZHM6IG9wdGlvbnMuZGF0YS50cmlnZ2VyX3dvcmRzLFxuXHRcdFx0XHR9KTtcblx0XHR9XG5cdH0pO1xuXG5cdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUludGVncmF0aW9uKG9wdGlvbnMsIHVzZXIpIHtcblx0bG9nZ2VyLmluY29taW5nLmluZm8oJ1JlbW92ZSBpbnRlZ3JhdGlvbicpO1xuXHRsb2dnZXIuaW5jb21pbmcuZGVidWcob3B0aW9ucyk7XG5cblx0Y29uc3QgaW50ZWdyYXRpb25Ub1JlbW92ZSA9IFJvY2tldENoYXQubW9kZWxzLkludGVncmF0aW9ucy5maW5kT25lKHtcblx0XHR1cmxzOiBvcHRpb25zLnRhcmdldF91cmwsXG5cdH0pO1xuXG5cdE1ldGVvci5ydW5Bc1VzZXIodXNlci5faWQsICgpID0+IE1ldGVvci5jYWxsKCdkZWxldGVPdXRnb2luZ0ludGVncmF0aW9uJywgaW50ZWdyYXRpb25Ub1JlbW92ZS5faWQpKTtcblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xufVxuXG5mdW5jdGlvbiBleGVjdXRlSW50ZWdyYXRpb25SZXN0KCkge1xuXHRsb2dnZXIuaW5jb21pbmcuaW5mbygnUG9zdCBpbnRlZ3JhdGlvbjonLCB0aGlzLmludGVncmF0aW9uLm5hbWUpO1xuXHRsb2dnZXIuaW5jb21pbmcuZGVidWcoJ0B1cmxQYXJhbXM6JywgdGhpcy51cmxQYXJhbXMpO1xuXHRsb2dnZXIuaW5jb21pbmcuZGVidWcoJ0Bib2R5UGFyYW1zOicsIHRoaXMuYm9keVBhcmFtcyk7XG5cblx0aWYgKHRoaXMuaW50ZWdyYXRpb24uZW5hYmxlZCAhPT0gdHJ1ZSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRzdGF0dXNDb2RlOiA1MDMsXG5cdFx0XHRib2R5OiAnU2VydmljZSBVbmF2YWlsYWJsZScsXG5cdFx0fTtcblx0fVxuXG5cdGNvbnN0IGRlZmF1bHRWYWx1ZXMgPSB7XG5cdFx0Y2hhbm5lbDogdGhpcy5pbnRlZ3JhdGlvbi5jaGFubmVsLFxuXHRcdGFsaWFzOiB0aGlzLmludGVncmF0aW9uLmFsaWFzLFxuXHRcdGF2YXRhcjogdGhpcy5pbnRlZ3JhdGlvbi5hdmF0YXIsXG5cdFx0ZW1vamk6IHRoaXMuaW50ZWdyYXRpb24uZW1vamksXG5cdH07XG5cblx0aWYgKHRoaXMuaW50ZWdyYXRpb24uc2NyaXB0RW5hYmxlZCAmJiB0aGlzLmludGVncmF0aW9uLnNjcmlwdENvbXBpbGVkICYmIHRoaXMuaW50ZWdyYXRpb24uc2NyaXB0Q29tcGlsZWQudHJpbSgpICE9PSAnJykge1xuXHRcdGxldCBzY3JpcHQ7XG5cdFx0dHJ5IHtcblx0XHRcdHNjcmlwdCA9IGdldEludGVncmF0aW9uU2NyaXB0KHRoaXMuaW50ZWdyYXRpb24pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGxvZ2dlci5pbmNvbWluZy53YXJuKGUpO1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5tZXNzYWdlKTtcblx0XHR9XG5cblx0XHR0aGlzLnJlcXVlc3Quc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcblx0XHRjb25zdCBjb250ZW50X3JhdyA9IHRoaXMucmVxdWVzdC5yZWFkKCk7XG5cblx0XHRjb25zdCByZXF1ZXN0ID0ge1xuXHRcdFx0dXJsOiB7XG5cdFx0XHRcdGhhc2g6IHRoaXMucmVxdWVzdC5fcGFyc2VkVXJsLmhhc2gsXG5cdFx0XHRcdHNlYXJjaDogdGhpcy5yZXF1ZXN0Ll9wYXJzZWRVcmwuc2VhcmNoLFxuXHRcdFx0XHRxdWVyeTogdGhpcy5xdWVyeVBhcmFtcyxcblx0XHRcdFx0cGF0aG5hbWU6IHRoaXMucmVxdWVzdC5fcGFyc2VkVXJsLnBhdGhuYW1lLFxuXHRcdFx0XHRwYXRoOiB0aGlzLnJlcXVlc3QuX3BhcnNlZFVybC5wYXRoLFxuXHRcdFx0fSxcblx0XHRcdHVybF9yYXc6IHRoaXMucmVxdWVzdC51cmwsXG5cdFx0XHR1cmxfcGFyYW1zOiB0aGlzLnVybFBhcmFtcyxcblx0XHRcdGNvbnRlbnQ6IHRoaXMuYm9keVBhcmFtcyxcblx0XHRcdGNvbnRlbnRfcmF3LFxuXHRcdFx0aGVhZGVyczogdGhpcy5yZXF1ZXN0LmhlYWRlcnMsXG5cdFx0XHRib2R5OiB0aGlzLnJlcXVlc3QuYm9keSxcblx0XHRcdHVzZXI6IHtcblx0XHRcdFx0X2lkOiB0aGlzLnVzZXIuX2lkLFxuXHRcdFx0XHRuYW1lOiB0aGlzLnVzZXIubmFtZSxcblx0XHRcdFx0dXNlcm5hbWU6IHRoaXMudXNlci51c2VybmFtZSxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCB7IHNhbmRib3ggfSA9IGJ1aWxkU2FuZGJveChjb21waWxlZFNjcmlwdHNbdGhpcy5pbnRlZ3JhdGlvbi5faWRdLnN0b3JlKTtcblx0XHRcdHNhbmRib3guc2NyaXB0ID0gc2NyaXB0O1xuXHRcdFx0c2FuZGJveC5yZXF1ZXN0ID0gcmVxdWVzdDtcblxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gRnV0dXJlLmZyb21Qcm9taXNlKHZtLnJ1bkluTmV3Q29udGV4dChgXG5cdFx0XHRcdG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdFx0XHRGaWJlcigoKSA9PiB7XG5cdFx0XHRcdFx0XHRzY3JpcHRUaW1lb3V0KHJlamVjdCk7XG5cdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRyZXNvbHZlKHNjcmlwdC5wcm9jZXNzX2luY29taW5nX3JlcXVlc3QoeyByZXF1ZXN0OiByZXF1ZXN0IH0pKTtcblx0XHRcdFx0XHRcdH0gY2F0Y2goZSkge1xuXHRcdFx0XHRcdFx0XHRyZWplY3QoZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSkucnVuKCk7XG5cdFx0XHRcdH0pLmNhdGNoKChlcnJvcikgPT4geyB0aHJvdyBuZXcgRXJyb3IoZXJyb3IpOyB9KTtcblx0XHRcdGAsIHNhbmRib3gsIHtcblx0XHRcdFx0dGltZW91dDogMzAwMCxcblx0XHRcdH0pKS53YWl0KCk7XG5cblx0XHRcdGlmICghcmVzdWx0KSB7XG5cdFx0XHRcdGxvZ2dlci5pbmNvbWluZy5kZWJ1ZygnW1Byb2Nlc3MgSW5jb21pbmcgUmVxdWVzdCByZXN1bHQgb2YgVHJpZ2dlcicsIHRoaXMuaW50ZWdyYXRpb24ubmFtZSwgJzpdIE5vIGRhdGEnKTtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoKTtcblx0XHRcdH0gZWxzZSBpZiAocmVzdWx0ICYmIHJlc3VsdC5lcnJvcikge1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShyZXN1bHQuZXJyb3IpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmJvZHlQYXJhbXMgPSByZXN1bHQgJiYgcmVzdWx0LmNvbnRlbnQ7XG5cdFx0XHR0aGlzLnNjcmlwdFJlc3BvbnNlID0gcmVzdWx0LnJlc3BvbnNlO1xuXHRcdFx0aWYgKHJlc3VsdC51c2VyKSB7XG5cdFx0XHRcdHRoaXMudXNlciA9IHJlc3VsdC51c2VyO1xuXHRcdFx0fVxuXG5cdFx0XHRsb2dnZXIuaW5jb21pbmcuZGVidWcoJ1tQcm9jZXNzIEluY29taW5nIFJlcXVlc3QgcmVzdWx0IG9mIFRyaWdnZXInLCB0aGlzLmludGVncmF0aW9uLm5hbWUsICc6XScpO1xuXHRcdFx0bG9nZ2VyLmluY29taW5nLmRlYnVnKCdyZXN1bHQnLCB0aGlzLmJvZHlQYXJhbXMpO1xuXHRcdH0gY2F0Y2ggKHsgc3RhY2sgfSkge1xuXHRcdFx0bG9nZ2VyLmluY29taW5nLmVycm9yKCdbRXJyb3IgcnVubmluZyBTY3JpcHQgaW4gVHJpZ2dlcicsIHRoaXMuaW50ZWdyYXRpb24ubmFtZSwgJzpdJyk7XG5cdFx0XHRsb2dnZXIuaW5jb21pbmcuZXJyb3IodGhpcy5pbnRlZ3JhdGlvbi5zY3JpcHRDb21waWxlZC5yZXBsYWNlKC9eL2dtLCAnICAnKSk7XG5cdFx0XHRsb2dnZXIuaW5jb21pbmcuZXJyb3IoJ1tTdGFjazpdJyk7XG5cdFx0XHRsb2dnZXIuaW5jb21pbmcuZXJyb3Ioc3RhY2sucmVwbGFjZSgvXi9nbSwgJyAgJykpO1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ2Vycm9yLXJ1bm5pbmctc2NyaXB0Jyk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gVE9ETzogVHVybiB0aGlzIGludG8gYW4gb3B0aW9uIG9uIHRoZSBpbnRlZ3JhdGlvbnMgLSBubyBib2R5IG1lYW5zIGEgc3VjY2Vzc1xuXHQvLyBUT0RPOiBUZW1wb3JhcnkgZml4IGZvciBodHRwczovL2dpdGh1Yi5jb20vUm9ja2V0Q2hhdC9Sb2NrZXQuQ2hhdC9pc3N1ZXMvNzc3MCB1bnRpbCB0aGUgYWJvdmUgaXMgaW1wbGVtZW50ZWRcblx0aWYgKCF0aGlzLmJvZHlQYXJhbXMgfHwgKF8uaXNFbXB0eSh0aGlzLmJvZHlQYXJhbXMpICYmICF0aGlzLmludGVncmF0aW9uLnNjcmlwdEVuYWJsZWQpKSB7XG5cdFx0Ly8gcmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoJ2JvZHktZW1wdHknKTtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2VzcygpO1xuXHR9XG5cblx0dGhpcy5ib2R5UGFyYW1zLmJvdCA9IHsgaTogdGhpcy5pbnRlZ3JhdGlvbi5faWQgfTtcblxuXHR0cnkge1xuXHRcdGNvbnN0IG1lc3NhZ2UgPSBwcm9jZXNzV2ViaG9va01lc3NhZ2UodGhpcy5ib2R5UGFyYW1zLCB0aGlzLnVzZXIsIGRlZmF1bHRWYWx1ZXMpO1xuXHRcdGlmIChfLmlzRW1wdHkobWVzc2FnZSkpIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCd1bmtub3duLWVycm9yJyk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuc2NyaXB0UmVzcG9uc2UpIHtcblx0XHRcdGxvZ2dlci5pbmNvbWluZy5kZWJ1ZygncmVzcG9uc2UnLCB0aGlzLnNjcmlwdFJlc3BvbnNlKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh0aGlzLnNjcmlwdFJlc3BvbnNlKTtcblx0fSBjYXRjaCAoeyBlcnJvciwgbWVzc2FnZSB9KSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZXJyb3IgfHwgbWVzc2FnZSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gYWRkSW50ZWdyYXRpb25SZXN0KCkge1xuXHRyZXR1cm4gY3JlYXRlSW50ZWdyYXRpb24odGhpcy5ib2R5UGFyYW1zLCB0aGlzLnVzZXIpO1xufVxuXG5mdW5jdGlvbiByZW1vdmVJbnRlZ3JhdGlvblJlc3QoKSB7XG5cdHJldHVybiByZW1vdmVJbnRlZ3JhdGlvbih0aGlzLmJvZHlQYXJhbXMsIHRoaXMudXNlcik7XG59XG5cbmZ1bmN0aW9uIGludGVncmF0aW9uU2FtcGxlUmVzdCgpIHtcblx0bG9nZ2VyLmluY29taW5nLmluZm8oJ1NhbXBsZSBJbnRlZ3JhdGlvbicpO1xuXHRyZXR1cm4ge1xuXHRcdHN0YXR1c0NvZGU6IDIwMCxcblx0XHRib2R5OiBbXG5cdFx0XHR7XG5cdFx0XHRcdHRva2VuOiBSYW5kb20uaWQoMjQpLFxuXHRcdFx0XHRjaGFubmVsX2lkOiBSYW5kb20uaWQoKSxcblx0XHRcdFx0Y2hhbm5lbF9uYW1lOiAnZ2VuZXJhbCcsXG5cdFx0XHRcdHRpbWVzdGFtcDogbmV3IERhdGUsXG5cdFx0XHRcdHVzZXJfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0XHR1c2VyX25hbWU6ICdyb2NrZXQuY2F0Jyxcblx0XHRcdFx0dGV4dDogJ1NhbXBsZSB0ZXh0IDEnLFxuXHRcdFx0XHR0cmlnZ2VyX3dvcmQ6ICdTYW1wbGUnLFxuXHRcdFx0fSwge1xuXHRcdFx0XHR0b2tlbjogUmFuZG9tLmlkKDI0KSxcblx0XHRcdFx0Y2hhbm5lbF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRcdGNoYW5uZWxfbmFtZTogJ2dlbmVyYWwnLFxuXHRcdFx0XHR0aW1lc3RhbXA6IG5ldyBEYXRlLFxuXHRcdFx0XHR1c2VyX2lkOiBSYW5kb20uaWQoKSxcblx0XHRcdFx0dXNlcl9uYW1lOiAncm9ja2V0LmNhdCcsXG5cdFx0XHRcdHRleHQ6ICdTYW1wbGUgdGV4dCAyJyxcblx0XHRcdFx0dHJpZ2dlcl93b3JkOiAnU2FtcGxlJyxcblx0XHRcdH0sIHtcblx0XHRcdFx0dG9rZW46IFJhbmRvbS5pZCgyNCksXG5cdFx0XHRcdGNoYW5uZWxfaWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0XHRjaGFubmVsX25hbWU6ICdnZW5lcmFsJyxcblx0XHRcdFx0dGltZXN0YW1wOiBuZXcgRGF0ZSxcblx0XHRcdFx0dXNlcl9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRcdHVzZXJfbmFtZTogJ3JvY2tldC5jYXQnLFxuXHRcdFx0XHR0ZXh0OiAnU2FtcGxlIHRleHQgMycsXG5cdFx0XHRcdHRyaWdnZXJfd29yZDogJ1NhbXBsZScsXG5cdFx0XHR9LFxuXHRcdF0sXG5cdH07XG59XG5cbmZ1bmN0aW9uIGludGVncmF0aW9uSW5mb1Jlc3QoKSB7XG5cdGxvZ2dlci5pbmNvbWluZy5pbmZvKCdJbmZvIGludGVncmF0aW9uJyk7XG5cdHJldHVybiB7XG5cdFx0c3RhdHVzQ29kZTogMjAwLFxuXHRcdGJvZHk6IHtcblx0XHRcdHN1Y2Nlc3M6IHRydWUsXG5cdFx0fSxcblx0fTtcbn1cblxuQXBpLmFkZFJvdXRlKCc6aW50ZWdyYXRpb25JZC86dXNlcklkLzp0b2tlbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0cG9zdDogZXhlY3V0ZUludGVncmF0aW9uUmVzdCxcblx0Z2V0OiBleGVjdXRlSW50ZWdyYXRpb25SZXN0LFxufSk7XG5cbkFwaS5hZGRSb3V0ZSgnOmludGVncmF0aW9uSWQvOnRva2VuJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0OiBleGVjdXRlSW50ZWdyYXRpb25SZXN0LFxuXHRnZXQ6IGV4ZWN1dGVJbnRlZ3JhdGlvblJlc3QsXG59KTtcblxuQXBpLmFkZFJvdXRlKCdzYW1wbGUvOmludGVncmF0aW9uSWQvOnVzZXJJZC86dG9rZW4nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdGdldDogaW50ZWdyYXRpb25TYW1wbGVSZXN0LFxufSk7XG5cbkFwaS5hZGRSb3V0ZSgnc2FtcGxlLzppbnRlZ3JhdGlvbklkLzp0b2tlbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0OiBpbnRlZ3JhdGlvblNhbXBsZVJlc3QsXG59KTtcblxuQXBpLmFkZFJvdXRlKCdpbmZvLzppbnRlZ3JhdGlvbklkLzp1c2VySWQvOnRva2VuJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRnZXQ6IGludGVncmF0aW9uSW5mb1Jlc3QsXG59KTtcblxuQXBpLmFkZFJvdXRlKCdpbmZvLzppbnRlZ3JhdGlvbklkLzp0b2tlbicsIHsgYXV0aFJlcXVpcmVkOiB0cnVlIH0sIHtcblx0Z2V0OiBpbnRlZ3JhdGlvbkluZm9SZXN0LFxufSk7XG5cbkFwaS5hZGRSb3V0ZSgnYWRkLzppbnRlZ3JhdGlvbklkLzp1c2VySWQvOnRva2VuJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0OiBhZGRJbnRlZ3JhdGlvblJlc3QsXG59KTtcblxuQXBpLmFkZFJvdXRlKCdhZGQvOmludGVncmF0aW9uSWQvOnRva2VuJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRwb3N0OiBhZGRJbnRlZ3JhdGlvblJlc3QsXG59KTtcblxuQXBpLmFkZFJvdXRlKCdyZW1vdmUvOmludGVncmF0aW9uSWQvOnVzZXJJZC86dG9rZW4nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3Q6IHJlbW92ZUludGVncmF0aW9uUmVzdCxcbn0pO1xuXG5BcGkuYWRkUm91dGUoJ3JlbW92ZS86aW50ZWdyYXRpb25JZC86dG9rZW4nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdHBvc3Q6IHJlbW92ZUludGVncmF0aW9uUmVzdCxcbn0pO1xuIiwiY29uc3QgY2FsbGJhY2tIYW5kbGVyID0gZnVuY3Rpb24gX2NhbGxiYWNrSGFuZGxlcihldmVudFR5cGUpIHtcblx0cmV0dXJuIGZ1bmN0aW9uIF93cmFwcGVyRnVuY3Rpb24oLi4uYXJncykge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LmludGVncmF0aW9ucy50cmlnZ2VySGFuZGxlci5leGVjdXRlVHJpZ2dlcnMoZXZlbnRUeXBlLCAuLi5hcmdzKTtcblx0fTtcbn07XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJTYXZlTWVzc2FnZScsIGNhbGxiYWNrSGFuZGxlcignc2VuZE1lc3NhZ2UnKSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XKTtcblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJDcmVhdGVDaGFubmVsJywgY2FsbGJhY2tIYW5kbGVyKCdyb29tQ3JlYXRlZCcpLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1cpO1xuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdhZnRlckNyZWF0ZVByaXZhdGVHcm91cCcsIGNhbGxiYWNrSGFuZGxlcigncm9vbUNyZWF0ZWQnKSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XKTtcblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJDcmVhdGVVc2VyJywgY2FsbGJhY2tIYW5kbGVyKCd1c2VyQ3JlYXRlZCcpLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1cpO1xuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdhZnRlckpvaW5Sb29tJywgY2FsbGJhY2tIYW5kbGVyKCdyb29tSm9pbmVkJyksIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVyk7XG5Sb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyTGVhdmVSb29tJywgY2FsbGJhY2tIYW5kbGVyKCdyb29tTGVmdCcpLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1cpO1xuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdhZnRlclJvb21BcmNoaXZlZCcsIGNhbGxiYWNrSGFuZGxlcigncm9vbUFyY2hpdmVkJyksIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVyk7XG5Sb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyRmlsZVVwbG9hZCcsIGNhbGxiYWNrSGFuZGxlcignZmlsZVVwbG9hZGVkJyksIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVyk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcblxudGhpcy5wcm9jZXNzV2ViaG9va01lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlT2JqLCB1c2VyLCBkZWZhdWx0VmFsdWVzID0geyBjaGFubmVsOiAnJywgYWxpYXM6ICcnLCBhdmF0YXI6ICcnLCBlbW9qaTogJycgfSwgbXVzdEJlSm9pbmVkID0gZmFsc2UpIHtcblx0Y29uc3Qgc2VudERhdGEgPSBbXTtcblx0Y29uc3QgY2hhbm5lbHMgPSBbXS5jb25jYXQobWVzc2FnZU9iai5jaGFubmVsIHx8IG1lc3NhZ2VPYmoucm9vbUlkIHx8IGRlZmF1bHRWYWx1ZXMuY2hhbm5lbCk7XG5cblx0Zm9yIChjb25zdCBjaGFubmVsIG9mIGNoYW5uZWxzKSB7XG5cdFx0Y29uc3QgY2hhbm5lbFR5cGUgPSBjaGFubmVsWzBdO1xuXG5cdFx0bGV0IGNoYW5uZWxWYWx1ZSA9IGNoYW5uZWwuc3Vic3RyKDEpO1xuXHRcdGxldCByb29tO1xuXG5cdFx0c3dpdGNoIChjaGFubmVsVHlwZSkge1xuXHRcdFx0Y2FzZSAnIyc6XG5cdFx0XHRcdHJvb20gPSBSb2NrZXRDaGF0LmdldFJvb21CeU5hbWVPcklkV2l0aE9wdGlvblRvSm9pbih7IGN1cnJlbnRVc2VySWQ6IHVzZXIuX2lkLCBuYW1lT3JJZDogY2hhbm5lbFZhbHVlLCBqb2luQ2hhbm5lbDogdHJ1ZSB9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdAJzpcblx0XHRcdFx0cm9vbSA9IFJvY2tldENoYXQuZ2V0Um9vbUJ5TmFtZU9ySWRXaXRoT3B0aW9uVG9Kb2luKHsgY3VycmVudFVzZXJJZDogdXNlci5faWQsIG5hbWVPcklkOiBjaGFubmVsVmFsdWUsIHR5cGU6ICdkJyB9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRjaGFubmVsVmFsdWUgPSBjaGFubmVsVHlwZSArIGNoYW5uZWxWYWx1ZTtcblxuXHRcdFx0XHQvLyBUcnkgdG8gZmluZCB0aGUgcm9vbSBieSBpZCBvciBuYW1lIGlmIHRoZXkgZGlkbid0IGluY2x1ZGUgdGhlIHByZWZpeC5cblx0XHRcdFx0cm9vbSA9IFJvY2tldENoYXQuZ2V0Um9vbUJ5TmFtZU9ySWRXaXRoT3B0aW9uVG9Kb2luKHsgY3VycmVudFVzZXJJZDogdXNlci5faWQsIG5hbWVPcklkOiBjaGFubmVsVmFsdWUsIGpvaW5DaGFubmVsOiB0cnVlLCBlcnJvck9uRW1wdHk6IGZhbHNlIH0pO1xuXHRcdFx0XHRpZiAocm9vbSkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gV2UgZGlkbid0IGdldCBhIHJvb20sIGxldCdzIHRyeSBmaW5kaW5nIGRpcmVjdCBtZXNzYWdlc1xuXHRcdFx0XHRyb29tID0gUm9ja2V0Q2hhdC5nZXRSb29tQnlOYW1lT3JJZFdpdGhPcHRpb25Ub0pvaW4oeyBjdXJyZW50VXNlcklkOiB1c2VyLl9pZCwgbmFtZU9ySWQ6IGNoYW5uZWxWYWx1ZSwgdHlwZTogJ2QnLCB0cnlEaXJlY3RCeVVzZXJJZE9ubHk6IHRydWUgfSk7XG5cdFx0XHRcdGlmIChyb29tKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBObyByb29tLCBzbyB0aHJvdyBhbiBlcnJvclxuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLWNoYW5uZWwnKTtcblx0XHR9XG5cblx0XHRpZiAobXVzdEJlSm9pbmVkICYmICFSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChyb29tLl9pZCwgdXNlci5faWQsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pKSB7XG5cdFx0XHQvLyB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tIHByb3ZpZGVkIHRvIHNlbmQgYSBtZXNzYWdlIHRvLCBtdXN0IGJlIGpvaW5lZC4nKTtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtY2hhbm5lbCcpOyAvLyBUaHJvd2luZyB0aGUgZ2VuZXJpYyBvbmUgc28gcGVvcGxlIGNhbid0IFwiYnJ1dGUgZm9yY2VcIiBmaW5kIHJvb21zXG5cdFx0fVxuXG5cdFx0aWYgKG1lc3NhZ2VPYmouYXR0YWNobWVudHMgJiYgIV8uaXNBcnJheShtZXNzYWdlT2JqLmF0dGFjaG1lbnRzKSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ0F0dGFjaG1lbnRzIHNob3VsZCBiZSBBcnJheSwgaWdub3JpbmcgdmFsdWUnLnJlZCwgbWVzc2FnZU9iai5hdHRhY2htZW50cyk7XG5cdFx0XHRtZXNzYWdlT2JqLmF0dGFjaG1lbnRzID0gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdGNvbnN0IG1lc3NhZ2UgPSB7XG5cdFx0XHRhbGlhczogbWVzc2FnZU9iai51c2VybmFtZSB8fCBtZXNzYWdlT2JqLmFsaWFzIHx8IGRlZmF1bHRWYWx1ZXMuYWxpYXMsXG5cdFx0XHRtc2c6IHMudHJpbShtZXNzYWdlT2JqLnRleHQgfHwgbWVzc2FnZU9iai5tc2cgfHwgJycpLFxuXHRcdFx0YXR0YWNobWVudHM6IG1lc3NhZ2VPYmouYXR0YWNobWVudHMgfHwgW10sXG5cdFx0XHRwYXJzZVVybHM6IG1lc3NhZ2VPYmoucGFyc2VVcmxzICE9PSB1bmRlZmluZWQgPyBtZXNzYWdlT2JqLnBhcnNlVXJscyA6ICFtZXNzYWdlT2JqLmF0dGFjaG1lbnRzLFxuXHRcdFx0Ym90OiBtZXNzYWdlT2JqLmJvdCxcblx0XHRcdGdyb3VwYWJsZTogKG1lc3NhZ2VPYmouZ3JvdXBhYmxlICE9PSB1bmRlZmluZWQpID8gbWVzc2FnZU9iai5ncm91cGFibGUgOiBmYWxzZSxcblx0XHR9O1xuXG5cdFx0aWYgKCFfLmlzRW1wdHkobWVzc2FnZU9iai5pY29uX3VybCkgfHwgIV8uaXNFbXB0eShtZXNzYWdlT2JqLmF2YXRhcikpIHtcblx0XHRcdG1lc3NhZ2UuYXZhdGFyID0gbWVzc2FnZU9iai5pY29uX3VybCB8fCBtZXNzYWdlT2JqLmF2YXRhcjtcblx0XHR9IGVsc2UgaWYgKCFfLmlzRW1wdHkobWVzc2FnZU9iai5pY29uX2Vtb2ppKSB8fCAhXy5pc0VtcHR5KG1lc3NhZ2VPYmouZW1vamkpKSB7XG5cdFx0XHRtZXNzYWdlLmVtb2ppID0gbWVzc2FnZU9iai5pY29uX2Vtb2ppIHx8IG1lc3NhZ2VPYmouZW1vamk7XG5cdFx0fSBlbHNlIGlmICghXy5pc0VtcHR5KGRlZmF1bHRWYWx1ZXMuYXZhdGFyKSkge1xuXHRcdFx0bWVzc2FnZS5hdmF0YXIgPSBkZWZhdWx0VmFsdWVzLmF2YXRhcjtcblx0XHR9IGVsc2UgaWYgKCFfLmlzRW1wdHkoZGVmYXVsdFZhbHVlcy5lbW9qaSkpIHtcblx0XHRcdG1lc3NhZ2UuZW1vamkgPSBkZWZhdWx0VmFsdWVzLmVtb2ppO1xuXHRcdH1cblxuXHRcdGlmIChfLmlzQXJyYXkobWVzc2FnZS5hdHRhY2htZW50cykpIHtcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbWVzc2FnZS5hdHRhY2htZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRjb25zdCBhdHRhY2htZW50ID0gbWVzc2FnZS5hdHRhY2htZW50c1tpXTtcblx0XHRcdFx0aWYgKGF0dGFjaG1lbnQubXNnKSB7XG5cdFx0XHRcdFx0YXR0YWNobWVudC50ZXh0ID0gcy50cmltKGF0dGFjaG1lbnQubXNnKTtcblx0XHRcdFx0XHRkZWxldGUgYXR0YWNobWVudC5tc2c7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRjb25zdCBtZXNzYWdlUmV0dXJuID0gUm9ja2V0Q2hhdC5zZW5kTWVzc2FnZSh1c2VyLCBtZXNzYWdlLCByb29tKTtcblx0XHRzZW50RGF0YS5wdXNoKHsgY2hhbm5lbCwgbWVzc2FnZTogbWVzc2FnZVJldHVybiB9KTtcblx0fVxuXG5cdHJldHVybiBzZW50RGF0YTtcbn07XG4iXX0=
