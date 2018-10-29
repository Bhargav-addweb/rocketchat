(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
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
var logger, rocketUser, slackMsgTxt;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:slackbridge":{"server":{"logger.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_slackbridge/server/logger.js                                                               //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
/* globals logger:true */

/* exported logger */
logger = new Logger('SlackBridge', {
  sections: {
    connection: 'Connection',
    events: 'Events',
    class: 'Class',
    slack: 'Slack',
    rocket: 'Rocket'
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_slackbridge/server/settings.js                                                             //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Meteor.startup(function () {
  RocketChat.settings.addGroup('SlackBridge', function () {
    this.add('SlackBridge_Enabled', false, {
      type: 'boolean',
      i18nLabel: 'Enabled',
      public: true
    });
    this.add('SlackBridge_APIToken', '', {
      type: 'string',
      enableQuery: {
        _id: 'SlackBridge_Enabled',
        value: true
      },
      i18nLabel: 'API_Token'
    });
    this.add('SlackBridge_FileUpload_Enabled', true, {
      type: 'boolean',
      enableQuery: {
        _id: 'SlackBridge_Enabled',
        value: true
      },
      i18nLabel: 'FileUpload'
    });
    this.add('SlackBridge_Out_Enabled', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'SlackBridge_Enabled',
        value: true
      }
    });
    this.add('SlackBridge_Out_All', false, {
      type: 'boolean',
      enableQuery: [{
        _id: 'SlackBridge_Enabled',
        value: true
      }, {
        _id: 'SlackBridge_Out_Enabled',
        value: true
      }]
    });
    this.add('SlackBridge_Out_Channels', '', {
      type: 'roomPick',
      enableQuery: [{
        _id: 'SlackBridge_Enabled',
        value: true
      }, {
        _id: 'SlackBridge_Out_Enabled',
        value: true
      }, {
        _id: 'SlackBridge_Out_All',
        value: false
      }]
    });
    this.add('SlackBridge_AliasFormat', '', {
      type: 'string',
      enableQuery: {
        _id: 'SlackBridge_Enabled',
        value: true
      },
      i18nLabel: 'Alias_Format',
      i18nDescription: 'Alias_Format_Description'
    });
    this.add('SlackBridge_ExcludeBotnames', '', {
      type: 'string',
      enableQuery: {
        _id: 'SlackBridge_Enabled',
        value: true
      },
      i18nLabel: 'Exclude_Botnames',
      i18nDescription: 'Exclude_Botnames_Description'
    });
    this.add('SlackBridge_Reactions_Enabled', true, {
      type: 'boolean',
      enableQuery: {
        _id: 'SlackBridge_Enabled',
        value: true
      },
      i18nLabel: 'Reactions'
    });
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"slackbridge.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_slackbridge/server/slackbridge.js                                                          //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
let SlackAdapter;
module.watch(require("./SlackAdapter.js"), {
  default(v) {
    SlackAdapter = v;
  }

}, 0);
let RocketAdapter;
module.watch(require("./RocketAdapter.js"), {
  default(v) {
    RocketAdapter = v;
  }

}, 1);

/**
 * SlackBridge interfaces between this Rocket installation and a remote Slack installation.
 */
class SlackBridge {
  constructor() {
    this.slack = new SlackAdapter(this);
    this.rocket = new RocketAdapter(this);
    this.reactionsMap = new Map(); // Sync object between rocket and slack

    this.connected = false;
    this.rocket.setSlack(this.slack);
    this.slack.setRocket(this.rocket); // Settings that we cache versus looking up at runtime

    this.apiToken = false;
    this.aliasFormat = '';
    this.excludeBotnames = '';
    this.isReactionsEnabled = true;
    this.processSettings();
  }

  connect() {
    if (this.connected === false) {
      this.slack.connect(this.apiToken);

      if (RocketChat.settings.get('SlackBridge_Out_Enabled')) {
        this.rocket.connect();
      }

      this.connected = true;
      logger.connection.info('Enabled');
    }
  }

  disconnect() {
    if (this.connected === true) {
      this.rocket.disconnect();
      this.slack.disconnect();
      this.connected = false;
      logger.connection.info('Disabled');
    }
  }

  processSettings() {
    // Slack installation API token
    RocketChat.settings.get('SlackBridge_APIToken', (key, value) => {
      if (value !== this.apiToken) {
        this.apiToken = value;

        if (this.connected) {
          this.disconnect();
          this.connect();
        }
      }

      logger.class.debug(`Setting: ${key}`, value);
    }); // Import messages from Slack with an alias; %s is replaced by the username of the user. If empty, no alias will be used.

    RocketChat.settings.get('SlackBridge_AliasFormat', (key, value) => {
      this.aliasFormat = value;
      logger.class.debug(`Setting: ${key}`, value);
    }); // Do not propagate messages from bots whose name matches the regular expression above. If left empty, all messages from bots will be propagated.

    RocketChat.settings.get('SlackBridge_ExcludeBotnames', (key, value) => {
      this.excludeBotnames = value;
      logger.class.debug(`Setting: ${key}`, value);
    }); // Reactions

    RocketChat.settings.get('SlackBridge_Reactions_Enabled', (key, value) => {
      this.isReactionsEnabled = value;
      logger.class.debug(`Setting: ${key}`, value);
    }); // Is this entire SlackBridge enabled

    RocketChat.settings.get('SlackBridge_Enabled', (key, value) => {
      if (value && this.apiToken) {
        this.connect();
      } else {
        this.disconnect();
      }

      logger.class.debug(`Setting: ${key}`, value);
    });
  }

}

RocketChat.SlackBridge = new SlackBridge();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"slackbridge_import.server.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_slackbridge/server/slackbridge_import.server.js                                            //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
/* globals msgStream */
function SlackBridgeImport(command, params, item) {
  if (command !== 'slackbridge-import' || !Match.test(params, String)) {
    return;
  }

  const room = RocketChat.models.Rooms.findOneById(item.rid);
  const channel = room.name;
  const user = Meteor.users.findOne(Meteor.userId());
  msgStream.emit(item.rid, {
    _id: Random.id(),
    rid: item.rid,
    u: {
      username: 'rocket.cat'
    },
    ts: new Date(),
    msg: TAPi18n.__('SlackBridge_start', {
      postProcess: 'sprintf',
      sprintf: [user.username, channel]
    }, user.language)
  });

  try {
    RocketChat.SlackBridge.importMessages(item.rid, error => {
      if (error) {
        msgStream.emit(item.rid, {
          _id: Random.id(),
          rid: item.rid,
          u: {
            username: 'rocket.cat'
          },
          ts: new Date(),
          msg: TAPi18n.__('SlackBridge_error', {
            postProcess: 'sprintf',
            sprintf: [channel, error.message]
          }, user.language)
        });
      } else {
        msgStream.emit(item.rid, {
          _id: Random.id(),
          rid: item.rid,
          u: {
            username: 'rocket.cat'
          },
          ts: new Date(),
          msg: TAPi18n.__('SlackBridge_finish', {
            postProcess: 'sprintf',
            sprintf: [channel]
          }, user.language)
        });
      }
    });
  } catch (error) {
    msgStream.emit(item.rid, {
      _id: Random.id(),
      rid: item.rid,
      u: {
        username: 'rocket.cat'
      },
      ts: new Date(),
      msg: TAPi18n.__('SlackBridge_error', {
        postProcess: 'sprintf',
        sprintf: [channel, error.message]
      }, user.language)
    });
    throw error;
  }

  return SlackBridgeImport;
}

RocketChat.slashCommands.add('slackbridge-import', SlackBridgeImport);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"RocketAdapter.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_slackbridge/server/RocketAdapter.js                                                        //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
module.export({
  default: () => RocketAdapter
});

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

class RocketAdapter {
  constructor(slackBridge) {
    logger.rocket.debug('constructor');
    this.slackBridge = slackBridge;
    this.util = Npm.require('util');
    this.userTags = {};
    this.slack = {};
  }

  connect() {
    this.registerForEvents();
  }

  disconnect() {
    this.unregisterForEvents();
  }

  setSlack(slack) {
    this.slack = slack;
  }

  registerForEvents() {
    logger.rocket.debug('Register for events');
    RocketChat.callbacks.add('afterSaveMessage', this.onMessage.bind(this), RocketChat.callbacks.priority.LOW, 'SlackBridge_Out');
    RocketChat.callbacks.add('afterDeleteMessage', this.onMessageDelete.bind(this), RocketChat.callbacks.priority.LOW, 'SlackBridge_Delete');
    RocketChat.callbacks.add('setReaction', this.onSetReaction.bind(this), RocketChat.callbacks.priority.LOW, 'SlackBridge_SetReaction');
    RocketChat.callbacks.add('unsetReaction', this.onUnSetReaction.bind(this), RocketChat.callbacks.priority.LOW, 'SlackBridge_UnSetReaction');
  }

  unregisterForEvents() {
    logger.rocket.debug('Unregister for events');
    RocketChat.callbacks.remove('afterSaveMessage', 'SlackBridge_Out');
    RocketChat.callbacks.remove('afterDeleteMessage', 'SlackBridge_Delete');
    RocketChat.callbacks.remove('setReaction', 'SlackBridge_SetReaction');
    RocketChat.callbacks.remove('unsetReaction', 'SlackBridge_UnSetReaction');
  }

  onMessageDelete(rocketMessageDeleted) {
    try {
      if (!this.slack.getSlackChannel(rocketMessageDeleted.rid)) {
        // This is on a channel that the rocket bot is not subscribed
        return;
      }

      logger.rocket.debug('onRocketMessageDelete', rocketMessageDeleted);
      this.slack.postDeleteMessage(rocketMessageDeleted);
    } catch (err) {
      logger.rocket.error('Unhandled error onMessageDelete', err);
    }
  }

  onSetReaction(rocketMsgID, reaction) {
    try {
      if (!this.slackBridge.isReactionsEnabled) {
        return;
      }

      logger.rocket.debug('onRocketSetReaction');

      if (rocketMsgID && reaction) {
        if (this.slackBridge.reactionsMap.delete(`set${rocketMsgID}${reaction}`)) {
          // This was a Slack reaction, we don't need to tell Slack about it
          return;
        }

        const rocketMsg = RocketChat.models.Messages.findOneById(rocketMsgID);

        if (rocketMsg) {
          const slackChannel = this.slack.getSlackChannel(rocketMsg.rid);

          if (null != slackChannel) {
            const slackTS = this.slack.getTimeStamp(rocketMsg);
            this.slack.postReactionAdded(reaction.replace(/:/g, ''), slackChannel.id, slackTS);
          }
        }
      }
    } catch (err) {
      logger.rocket.error('Unhandled error onSetReaction', err);
    }
  }

  onUnSetReaction(rocketMsgID, reaction) {
    try {
      if (!this.slackBridge.isReactionsEnabled) {
        return;
      }

      logger.rocket.debug('onRocketUnSetReaction');

      if (rocketMsgID && reaction) {
        if (this.slackBridge.reactionsMap.delete(`unset${rocketMsgID}${reaction}`)) {
          // This was a Slack unset reaction, we don't need to tell Slack about it
          return;
        }

        const rocketMsg = RocketChat.models.Messages.findOneById(rocketMsgID);

        if (rocketMsg) {
          const slackChannel = this.slack.getSlackChannel(rocketMsg.rid);

          if (null != slackChannel) {
            const slackTS = this.slack.getTimeStamp(rocketMsg);
            this.slack.postReactionRemove(reaction.replace(/:/g, ''), slackChannel.id, slackTS);
          }
        }
      }
    } catch (err) {
      logger.rocket.error('Unhandled error onUnSetReaction', err);
    }
  }

  onMessage(rocketMessage) {
    try {
      if (!this.slack.getSlackChannel(rocketMessage.rid)) {
        // This is on a channel that the rocket bot is not subscribed
        return;
      }

      logger.rocket.debug('onRocketMessage', rocketMessage);

      if (rocketMessage.editedAt) {
        // This is an Edit Event
        this.processMessageChanged(rocketMessage);
        return rocketMessage;
      } // Ignore messages originating from Slack


      if (rocketMessage._id.indexOf('slack-') === 0) {
        return rocketMessage;
      }

      if (rocketMessage.file) {
        return this.processFileShare(rocketMessage);
      } // A new message from Rocket.Chat


      this.processSendMessage(rocketMessage);
    } catch (err) {
      logger.rocket.error('Unhandled error onMessage', err);
    }

    return rocketMessage;
  }

  processSendMessage(rocketMessage) {
    // Since we got this message, SlackBridge_Out_Enabled is true
    if (RocketChat.settings.get('SlackBridge_Out_All') === true) {
      this.slack.postMessage(this.slack.getSlackChannel(rocketMessage.rid), rocketMessage);
    } else {
      // They want to limit to certain groups
      const outSlackChannels = _.pluck(RocketChat.settings.get('SlackBridge_Out_Channels'), '_id') || []; // logger.rocket.debug('Out SlackChannels: ', outSlackChannels);

      if (outSlackChannels.indexOf(rocketMessage.rid) !== -1) {
        this.slack.postMessage(this.slack.getSlackChannel(rocketMessage.rid), rocketMessage);
      }
    }
  }

  getMessageAttachment(rocketMessage) {
    if (!rocketMessage.file) {
      return;
    }

    if (!rocketMessage.attachments || !rocketMessage.attachments.length) {
      return;
    }

    const fileId = rocketMessage.file._id;
    return rocketMessage.attachments.find(attachment => attachment.title_link && attachment.title_link.indexOf(`/${fileId}/`) >= 0);
  }

  getFileDownloadUrl(rocketMessage) {
    const attachment = this.getMessageAttachment(rocketMessage);

    if (attachment) {
      return attachment.title_link;
    }
  }

  processFileShare(rocketMessage) {
    if (!RocketChat.settings.get('SlackBridge_FileUpload_Enabled')) {
      return;
    }

    if (rocketMessage.file.name) {
      let file_name = rocketMessage.file.name;
      let text = rocketMessage.msg;
      const attachment = this.getMessageAttachment(rocketMessage);

      if (attachment) {
        file_name = Meteor.absoluteUrl(attachment.title_link);

        if (!text) {
          text = attachment.description;
        }
      }

      const message = `${text} ${file_name}`;
      rocketMessage.msg = message;
      this.slack.postMessage(this.slack.getSlackChannel(rocketMessage.rid), rocketMessage);
    }
  }

  processMessageChanged(rocketMessage) {
    if (rocketMessage) {
      if (rocketMessage.updatedBySlack) {
        // We have already processed this
        delete rocketMessage.updatedBySlack;
        return;
      } // This was a change from Rocket.Chat


      const slackChannel = this.slack.getSlackChannel(rocketMessage.rid);
      this.slack.postMessageUpdate(slackChannel, rocketMessage);
    }
  }

  getChannel(slackMessage) {
    return slackMessage.channel ? this.findChannel(slackMessage.channel) || this.addChannel(slackMessage.channel) : null;
  }

  getUser(slackUser) {
    return slackUser ? this.findUser(slackUser) || this.addUser(slackUser) : null;
  }

  createRocketID(slackChannel, ts) {
    return `slack-${slackChannel}-${ts.replace(/\./g, '-')}`;
  }

  findChannel(slackChannelId) {
    return RocketChat.models.Rooms.findOneByImportId(slackChannelId);
  }

  addChannel(slackChannelID, hasRetried = false) {
    logger.rocket.debug('Adding Rocket.Chat channel from Slack', slackChannelID);
    let slackResults = null;
    let isGroup = false;

    if (slackChannelID.charAt(0) === 'C') {
      slackResults = HTTP.get('https://slack.com/api/channels.info', {
        params: {
          token: this.slackBridge.apiToken,
          channel: slackChannelID
        }
      });
    } else if (slackChannelID.charAt(0) === 'G') {
      slackResults = HTTP.get('https://slack.com/api/groups.info', {
        params: {
          token: this.slackBridge.apiToken,
          channel: slackChannelID
        }
      });
      isGroup = true;
    }

    if (slackResults && slackResults.data && slackResults.data.ok === true) {
      const rocketChannelData = isGroup ? slackResults.data.group : slackResults.data.channel;
      const existingRocketRoom = RocketChat.models.Rooms.findOneByName(rocketChannelData.name); // If the room exists, make sure we have its id in importIds

      if (existingRocketRoom || rocketChannelData.is_general) {
        rocketChannelData.rocketId = rocketChannelData.is_general ? 'GENERAL' : existingRocketRoom._id;
        RocketChat.models.Rooms.addImportIds(rocketChannelData.rocketId, rocketChannelData.id);
      } else {
        const rocketUsers = [];

        for (const member of rocketChannelData.members) {
          if (member !== rocketChannelData.creator) {
            const rocketUser = this.findUser(member) || this.addUser(member);

            if (rocketUser && rocketUser.username) {
              rocketUsers.push(rocketUser.username);
            }
          }
        }

        const rocketUserCreator = rocketChannelData.creator ? this.findUser(rocketChannelData.creator) || this.addUser(rocketChannelData.creator) : null;

        if (!rocketUserCreator) {
          logger.rocket.error('Could not fetch room creator information', rocketChannelData.creator);
          return;
        }

        try {
          const rocketChannel = RocketChat.createRoom(isGroup ? 'p' : 'c', rocketChannelData.name, rocketUserCreator.username, rocketUsers);
          rocketChannelData.rocketId = rocketChannel.rid;
        } catch (e) {
          if (!hasRetried) {
            logger.rocket.debug('Error adding channel from Slack. Will retry in 1s.', e.message); // If first time trying to create channel fails, could be because of multiple messages received at the same time. Try again once after 1s.

            Meteor._sleepForMs(1000);

            return this.findChannel(slackChannelID) || this.addChannel(slackChannelID, true);
          } else {
            console.log(e.message);
          }
        }

        const roomUpdate = {
          ts: new Date(rocketChannelData.created * 1000)
        };
        let lastSetTopic = 0;

        if (!_.isEmpty(rocketChannelData.topic && rocketChannelData.topic.value)) {
          roomUpdate.topic = rocketChannelData.topic.value;
          lastSetTopic = rocketChannelData.topic.last_set;
        }

        if (!_.isEmpty(rocketChannelData.purpose && rocketChannelData.purpose.value) && rocketChannelData.purpose.last_set > lastSetTopic) {
          roomUpdate.topic = rocketChannelData.purpose.value;
        }

        RocketChat.models.Rooms.addImportIds(rocketChannelData.rocketId, rocketChannelData.id);
        this.slack.addSlackChannel(rocketChannelData.rocketId, slackChannelID);
      }

      return RocketChat.models.Rooms.findOneById(rocketChannelData.rocketId);
    }

    logger.rocket.debug('Channel not added');
    return;
  }

  findUser(slackUserID) {
    const rocketUser = RocketChat.models.Users.findOneByImportId(slackUserID);

    if (rocketUser && !this.userTags[slackUserID]) {
      this.userTags[slackUserID] = {
        slack: `<@${slackUserID}>`,
        rocket: `@${rocketUser.username}`
      };
    }

    return rocketUser;
  }

  addUser(slackUserID) {
    logger.rocket.debug('Adding Rocket.Chat user from Slack', slackUserID);
    const slackResults = HTTP.get('https://slack.com/api/users.info', {
      params: {
        token: this.slackBridge.apiToken,
        user: slackUserID
      }
    });

    if (slackResults && slackResults.data && slackResults.data.ok === true && slackResults.data.user) {
      const rocketUserData = slackResults.data.user;
      const isBot = rocketUserData.is_bot === true;
      const email = rocketUserData.profile && rocketUserData.profile.email || '';
      let existingRocketUser;

      if (!isBot) {
        existingRocketUser = RocketChat.models.Users.findOneByEmailAddress(email) || RocketChat.models.Users.findOneByUsername(rocketUserData.name);
      } else {
        existingRocketUser = RocketChat.models.Users.findOneByUsername(rocketUserData.name);
      }

      if (existingRocketUser) {
        rocketUserData.rocketId = existingRocketUser._id;
        rocketUserData.name = existingRocketUser.username;
      } else {
        const newUser = {
          password: Random.id(),
          username: rocketUserData.name
        };

        if (!isBot && email) {
          newUser.email = email;
        }

        if (isBot) {
          newUser.joinDefaultChannels = false;
        }

        rocketUserData.rocketId = Accounts.createUser(newUser);
        const userUpdate = {
          utcOffset: rocketUserData.tz_offset / 3600,
          // Slack's is -18000 which translates to Rocket.Chat's after dividing by 3600,
          roles: isBot ? ['bot'] : ['user']
        };

        if (rocketUserData.profile && rocketUserData.profile.real_name) {
          userUpdate.name = rocketUserData.profile.real_name;
        }

        if (rocketUserData.deleted) {
          userUpdate.active = false;
          userUpdate['services.resume.loginTokens'] = [];
        }

        RocketChat.models.Users.update({
          _id: rocketUserData.rocketId
        }, {
          $set: userUpdate
        });
        const user = RocketChat.models.Users.findOneById(rocketUserData.rocketId);
        let url = null;

        if (rocketUserData.profile) {
          if (rocketUserData.profile.image_original) {
            url = rocketUserData.profile.image_original;
          } else if (rocketUserData.profile.image_512) {
            url = rocketUserData.profile.image_512;
          }
        }

        if (url) {
          try {
            RocketChat.setUserAvatar(user, url, null, 'url');
          } catch (error) {
            logger.rocket.debug('Error setting user avatar', error.message);
          }
        }
      }

      const importIds = [rocketUserData.id];

      if (isBot && rocketUserData.profile && rocketUserData.profile.bot_id) {
        importIds.push(rocketUserData.profile.bot_id);
      }

      RocketChat.models.Users.addImportIds(rocketUserData.rocketId, importIds);

      if (!this.userTags[slackUserID]) {
        this.userTags[slackUserID] = {
          slack: `<@${slackUserID}>`,
          rocket: `@${rocketUserData.name}`
        };
      }

      return RocketChat.models.Users.findOneById(rocketUserData.rocketId);
    }

    logger.rocket.debug('User not added');
    return;
  }

  addAliasToMsg(rocketUserName, rocketMsgObj) {
    const aliasFormat = RocketChat.settings.get('SlackBridge_AliasFormat');

    if (aliasFormat) {
      const alias = this.util.format(aliasFormat, rocketUserName);

      if (alias !== rocketUserName) {
        rocketMsgObj.alias = alias;
      }
    }

    return rocketMsgObj;
  }

  createAndSaveMessage(rocketChannel, rocketUser, slackMessage, rocketMsgDataDefaults, isImporting) {
    if (slackMessage.type === 'message') {
      let rocketMsgObj = {};

      if (!_.isEmpty(slackMessage.subtype)) {
        rocketMsgObj = this.slack.processSubtypedMessage(rocketChannel, rocketUser, slackMessage, isImporting);

        if (!rocketMsgObj) {
          return;
        }
      } else {
        rocketMsgObj = {
          msg: this.convertSlackMsgTxtToRocketTxtFormat(slackMessage.text),
          rid: rocketChannel._id,
          u: {
            _id: rocketUser._id,
            username: rocketUser.username
          }
        };
        this.addAliasToMsg(rocketUser.username, rocketMsgObj);
      }

      _.extend(rocketMsgObj, rocketMsgDataDefaults);

      if (slackMessage.edited) {
        rocketMsgObj.editedAt = new Date(parseInt(slackMessage.edited.ts.split('.')[0]) * 1000);
      }

      if (slackMessage.subtype === 'bot_message') {
        rocketUser = RocketChat.models.Users.findOneById('rocket.cat', {
          fields: {
            username: 1
          }
        });
      }

      if (slackMessage.pinned_to && slackMessage.pinned_to.indexOf(slackMessage.channel) !== -1) {
        rocketMsgObj.pinned = true;
        rocketMsgObj.pinnedAt = Date.now;
        rocketMsgObj.pinnedBy = _.pick(rocketUser, '_id', 'username');
      }

      if (slackMessage.subtype === 'bot_message') {
        Meteor.setTimeout(() => {
          if (slackMessage.bot_id && slackMessage.ts && !RocketChat.models.Messages.findOneBySlackBotIdAndSlackTs(slackMessage.bot_id, slackMessage.ts)) {
            RocketChat.sendMessage(rocketUser, rocketMsgObj, rocketChannel, true);
          }
        }, 500);
      } else {
        logger.rocket.debug('Send message to Rocket.Chat');
        RocketChat.sendMessage(rocketUser, rocketMsgObj, rocketChannel, true);
      }
    }
  }

  convertSlackMsgTxtToRocketTxtFormat(slackMsgTxt) {
    if (!_.isEmpty(slackMsgTxt)) {
      slackMsgTxt = slackMsgTxt.replace(/<!everyone>/g, '@all');
      slackMsgTxt = slackMsgTxt.replace(/<!channel>/g, '@all');
      slackMsgTxt = slackMsgTxt.replace(/<!here>/g, '@here');
      slackMsgTxt = slackMsgTxt.replace(/&gt;/g, '>');
      slackMsgTxt = slackMsgTxt.replace(/&lt;/g, '<');
      slackMsgTxt = slackMsgTxt.replace(/&amp;/g, '&');
      slackMsgTxt = slackMsgTxt.replace(/:simple_smile:/g, ':smile:');
      slackMsgTxt = slackMsgTxt.replace(/:memo:/g, ':pencil:');
      slackMsgTxt = slackMsgTxt.replace(/:piggy:/g, ':pig:');
      slackMsgTxt = slackMsgTxt.replace(/:uk:/g, ':gb:');
      slackMsgTxt = slackMsgTxt.replace(/<(http[s]?:[^>]*)>/g, '$1');
      slackMsgTxt.replace(/(?:<@)([a-zA-Z0-9]+)(?:\|.+)?(?:>)/g, (match, userId) => {
        if (!this.userTags[userId]) {
          this.findUser(userId) || this.addUser(userId); // This adds userTags for the userId
        }

        const userTags = this.userTags[userId];

        if (userTags) {
          slackMsgTxt = slackMsgTxt.replace(userTags.slack, userTags.rocket);
        }
      });
    } else {
      slackMsgTxt = '';
    }

    return slackMsgTxt;
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"SlackAdapter.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_slackbridge/server/SlackAdapter.js                                                         //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
module.export({
  default: () => SlackAdapter
});

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
let http;
module.watch(require("http"), {
  default(v) {
    http = v;
  }

}, 2);
let https;
module.watch(require("https"), {
  default(v) {
    https = v;
  }

}, 3);

class SlackAdapter {
  constructor(slackBridge) {
    logger.slack.debug('constructor');
    this.slackBridge = slackBridge;
    this.slackClient = require('@slack/client');
    this.rtm = {}; // slack-client Real Time Messaging API

    this.apiToken = {}; // Slack API Token passed in via Connect
    // On Slack, a rocket integration bot will be added to slack channels, this is the list of those channels, key is Rocket Ch ID

    this.slackChannelRocketBotMembershipMap = new Map(); // Key=RocketChannelID, Value=SlackChannel

    this.rocket = {};
  }
  /**
   * Connect to the remote Slack server using the passed in token API and register for Slack events
   * @param apiToken
   */


  connect(apiToken) {
    this.apiToken = apiToken;
    const {
      RTMClient
    } = this.slackClient;

    if (RTMClient != null) {
      RTMClient.disconnect;
    }

    this.rtm = new RTMClient(this.apiToken);
    this.rtm.start();
    this.registerForEvents();
    Meteor.startup(() => {
      try {
        this.populateMembershipChannelMap(); // If run outside of Meteor.startup, HTTP is not defined
      } catch (err) {
        logger.slack.error('Error attempting to connect to Slack', err);
        this.slackBridge.disconnect();
      }
    });
  }
  /**
   * Unregister for slack events and disconnect from Slack
   */


  disconnect() {
    this.rtm.disconnect && this.rtm.disconnect;
  }

  setRocket(rocket) {
    this.rocket = rocket;
  }

  registerForEvents() {
    logger.slack.debug('Register for events');
    this.rtm.on('authenticated', () => {
      logger.slack.info('Connected to Slack');
    });
    this.rtm.on('unable_to_rtm_start', () => {
      this.slackBridge.disconnect();
    });
    this.rtm.on('disconnected', () => {
      logger.slack.info('Disconnected from Slack');
      this.slackBridge.disconnect();
    });
    /**
    * Event fired when someone messages a channel the bot is in
    * {
    *	type: 'message',
    * 	channel: [channel_id],
    * 	user: [user_id],
    * 	text: [message],
    * 	ts: [ts.milli],
    * 	team: [team_id],
    * 	subtype: [message_subtype],
    * 	inviter: [message_subtype = 'group_join|channel_join' -> user_id]
    * }
    **/

    this.rtm.on('message', Meteor.bindEnvironment(slackMessage => {
      logger.slack.debug('OnSlackEvent-MESSAGE: ', slackMessage);

      if (slackMessage) {
        try {
          this.onMessage(slackMessage);
        } catch (err) {
          logger.slack.error('Unhandled error onMessage', err);
        }
      }
    }));
    this.rtm.on('reaction_added', Meteor.bindEnvironment(reactionMsg => {
      logger.slack.debug('OnSlackEvent-REACTION_ADDED: ', reactionMsg);

      if (reactionMsg) {
        try {
          this.onReactionAdded(reactionMsg);
        } catch (err) {
          logger.slack.error('Unhandled error onReactionAdded', err);
        }
      }
    }));
    this.rtm.on('reaction_removed', Meteor.bindEnvironment(reactionMsg => {
      logger.slack.debug('OnSlackEvent-REACTION_REMOVED: ', reactionMsg);

      if (reactionMsg) {
        try {
          this.onReactionRemoved(reactionMsg);
        } catch (err) {
          logger.slack.error('Unhandled error onReactionRemoved', err);
        }
      }
    }));
    /**
     * Event fired when someone creates a public channel
     * {
    *	type: 'channel_created',
    *	channel: {
    *		id: [channel_id],
    *		is_channel: true,
    *		name: [channel_name],
    *		created: [ts],
    *		creator: [user_id],
    *		is_shared: false,
    *		is_org_shared: false
    *	},
    *	event_ts: [ts.milli]
    * }
     **/

    this.rtm.on('channel_created', Meteor.bindEnvironment(() => {}));
    /**
     * Event fired when the bot joins a public channel
     * {
    * 	type: 'channel_joined',
    * 	channel: {
    * 		id: [channel_id],
    * 		name: [channel_name],
    * 		is_channel: true,
    * 		created: [ts],
    * 		creator: [user_id],
    * 		is_archived: false,
    * 		is_general: false,
    * 		is_member: true,
    * 		last_read: [ts.milli],
    * 		latest: [message_obj],
    * 		unread_count: 0,
    * 		unread_count_display: 0,
    * 		members: [ user_ids ],
    * 		topic: {
    * 			value: [channel_topic],
    * 			creator: [user_id],
    * 			last_set: 0
    * 		},
    * 		purpose: {
    * 			value: [channel_purpose],
    * 			creator: [user_id],
    * 			last_set: 0
    * 		}
    * 	}
    * }
     **/

    this.rtm.on('channel_joined', Meteor.bindEnvironment(() => {}));
    /**
     * Event fired when the bot leaves (or is removed from) a public channel
     * {
    * 	type: 'channel_left',
    * 	channel: [channel_id]
    * }
     **/

    this.rtm.on('channel_left', Meteor.bindEnvironment(channelLeftMsg => {
      logger.slack.debug('OnSlackEvent-CHANNEL_LEFT: ', channelLeftMsg);

      if (channelLeftMsg) {
        try {
          this.onChannelLeft(channelLeftMsg);
        } catch (err) {
          logger.slack.error('Unhandled error onChannelLeft', err);
        }
      }
    }));
    /**
     * Event fired when an archived channel is deleted by an admin
     * {
    * 	type: 'channel_deleted',
    * 	channel: [channel_id],
    *	event_ts: [ts.milli]
    * }
     **/

    this.rtm.on('channel_deleted', Meteor.bindEnvironment(() => {}));
    /**
     * Event fired when the channel has its name changed
     * {
    * 	type: 'channel_rename',
    * 	channel: {
    * 		id: [channel_id],
    * 		name: [channel_name],
    * 		is_channel: true,
    * 		created: [ts]
    * 	},
    *	event_ts: [ts.milli]
    * }
     **/

    this.rtm.on('channel_rename', Meteor.bindEnvironment(() => {}));
    /**
     * Event fired when the bot joins a private channel
     * {
    * 	type: 'group_joined',
    * 	channel: {
    * 		id: [channel_id],
    * 		name: [channel_name],
    * 		is_group: true,
    * 		created: [ts],
    * 		creator: [user_id],
    * 		is_archived: false,
    * 		is_mpim: false,
    * 		is_open: true,
    * 		last_read: [ts.milli],
    * 		latest: [message_obj],
    * 		unread_count: 0,
    * 		unread_count_display: 0,
    * 		members: [ user_ids ],
    * 		topic: {
    * 			value: [channel_topic],
    * 			creator: [user_id],
    * 			last_set: 0
    * 		},
    * 		purpose: {
    * 			value: [channel_purpose],
    * 			creator: [user_id],
    * 			last_set: 0
    * 		}
    * 	}
    * }
     **/

    this.rtm.on('group_joined', Meteor.bindEnvironment(() => {}));
    /**
     * Event fired when the bot leaves (or is removed from) a private channel
     * {
    * 	type: 'group_left',
    * 	channel: [channel_id]
    * }
     **/

    this.rtm.on('group_left', Meteor.bindEnvironment(() => {}));
    /**
     * Event fired when the private channel has its name changed
     * {
    * 	type: 'group_rename',
    * 	channel: {
    * 		id: [channel_id],
    * 		name: [channel_name],
    * 		is_group: true,
    * 		created: [ts]
    * 	},
    *	event_ts: [ts.milli]
    * }
     **/

    this.rtm.on('group_rename', Meteor.bindEnvironment(() => {}));
    /**
     * Event fired when a new user joins the team
     * {
    * 	type: 'team_join',
    * 	user:
    * 	{
    * 		id: [user_id],
    * 		team_id: [team_id],
    * 		name: [user_name],
    * 		deleted: false,
    * 		status: null,
    * 		color: [color_code],
    * 		real_name: '',
    * 		tz: [timezone],
    * 		tz_label: [timezone_label],
    * 		tz_offset: [timezone_offset],
    * 		profile:
    * 		{
    * 			avatar_hash: '',
    * 			real_name: '',
    * 			real_name_normalized: '',
    * 			email: '',
    * 			image_24: '',
    * 			image_32: '',
    * 			image_48: '',
    * 			image_72: '',
    * 			image_192: '',
    * 			image_512: '',
    * 			fields: null
    * 		},
    * 		is_admin: false,
    * 		is_owner: false,
    * 		is_primary_owner: false,
    * 		is_restricted: false,
    * 		is_ultra_restricted: false,
    * 		is_bot: false,
    * 		presence: [user_presence]
    * 	},
    * 	cache_ts: [ts]
    * }
     **/

    this.rtm.on('team_join', Meteor.bindEnvironment(() => {}));
  }
  /*
   https://api.slack.com/events/reaction_removed
   */


  onReactionRemoved(slackReactionMsg) {
    if (slackReactionMsg) {
      if (!this.slackBridge.isReactionsEnabled) {
        return;
      }

      const rocketUser = this.rocket.getUser(slackReactionMsg.user); // Lets find our Rocket originated message

      let rocketMsg = RocketChat.models.Messages.findOneBySlackTs(slackReactionMsg.item.ts);

      if (!rocketMsg) {
        // Must have originated from Slack
        const rocketID = this.rocket.createRocketID(slackReactionMsg.item.channel, slackReactionMsg.item.ts);
        rocketMsg = RocketChat.models.Messages.findOneById(rocketID);
      }

      if (rocketMsg && rocketUser) {
        const rocketReaction = `:${slackReactionMsg.reaction}:`; // If the Rocket user has already been removed, then this is an echo back from slack

        if (rocketMsg.reactions) {
          const theReaction = rocketMsg.reactions[rocketReaction];

          if (theReaction) {
            if (theReaction.usernames.indexOf(rocketUser.username) === -1) {
              return; // Reaction already removed
            }
          }
        } else {
          // Reaction already removed
          return;
        } // Stash this away to key off it later so we don't send it back to Slack


        this.slackBridge.reactionsMap.set(`unset${rocketMsg._id}${rocketReaction}`, rocketUser);
        logger.slack.debug('Removing reaction from Slack');
        Meteor.runAsUser(rocketUser._id, () => {
          Meteor.call('setReaction', rocketReaction, rocketMsg._id);
        });
      }
    }
  }
  /*
   https://api.slack.com/events/reaction_added
   */


  onReactionAdded(slackReactionMsg) {
    if (slackReactionMsg) {
      if (!this.slackBridge.isReactionsEnabled) {
        return;
      }

      const rocketUser = this.rocket.getUser(slackReactionMsg.user);

      if (rocketUser.roles.includes('bot')) {
        return;
      } // Lets find our Rocket originated message


      let rocketMsg = RocketChat.models.Messages.findOneBySlackTs(slackReactionMsg.item.ts);

      if (!rocketMsg) {
        // Must have originated from Slack
        const rocketID = this.rocket.createRocketID(slackReactionMsg.item.channel, slackReactionMsg.item.ts);
        rocketMsg = RocketChat.models.Messages.findOneById(rocketID);
      }

      if (rocketMsg && rocketUser) {
        const rocketReaction = `:${slackReactionMsg.reaction}:`; // If the Rocket user has already reacted, then this is Slack echoing back to us

        if (rocketMsg.reactions) {
          const theReaction = rocketMsg.reactions[rocketReaction];

          if (theReaction) {
            if (theReaction.usernames.indexOf(rocketUser.username) !== -1) {
              return; // Already reacted
            }
          }
        } // Stash this away to key off it later so we don't send it back to Slack


        this.slackBridge.reactionsMap.set(`set${rocketMsg._id}${rocketReaction}`, rocketUser);
        logger.slack.debug('Adding reaction from Slack');
        Meteor.runAsUser(rocketUser._id, () => {
          Meteor.call('setReaction', rocketReaction, rocketMsg._id);
        });
      }
    }
  }

  onChannelLeft(channelLeftMsg) {
    this.removeSlackChannel(channelLeftMsg.channel);
  }
  /**
   * We have received a message from slack and we need to save/delete/update it into rocket
   * https://api.slack.com/events/message
   */


  onMessage(slackMessage, isImporting) {
    if (slackMessage.subtype) {
      switch (slackMessage.subtype) {
        case 'message_deleted':
          this.processMessageDeleted(slackMessage);
          break;

        case 'message_changed':
          this.processMessageChanged(slackMessage);
          break;

        case 'channel_join':
          this.processChannelJoin(slackMessage);
          break;

        case 'file_share':
          this.processFileShare(slackMessage);
          break;

        default:
          // Keeping backwards compatability for now, refactor later
          this.processNewMessage(slackMessage, isImporting);
      }
    } else {
      // Simple message
      this.processNewMessage(slackMessage, isImporting);
    }
  }

  postGetChannelInfo(slackChID) {
    logger.slack.debug('Getting slack channel info', slackChID);
    const response = HTTP.get('https://slack.com/api/channels.info', {
      params: {
        token: this.apiToken,
        channel: slackChID
      }
    });

    if (response && response.data) {
      return response.data.channel;
    }
  }

  postFindChannel(rocketChannelName) {
    logger.slack.debug('Searching for Slack channel or group', rocketChannelName);
    let response = HTTP.get('https://slack.com/api/channels.list', {
      params: {
        token: this.apiToken
      }
    });

    if (response && response.data && _.isArray(response.data.channels) && response.data.channels.length > 0) {
      for (const channel of response.data.channels) {
        if (channel.name === rocketChannelName && channel.is_member === true) {
          return channel;
        }
      }
    }

    response = HTTP.get('https://slack.com/api/groups.list', {
      params: {
        token: this.apiToken
      }
    });

    if (response && response.data && _.isArray(response.data.groups) && response.data.groups.length > 0) {
      for (const group of response.data.groups) {
        if (group.name === rocketChannelName) {
          return group;
        }
      }
    }
  }
  /**
   * Retrieves the Slack TS from a Rocket msg that originated from Slack
   * @param rocketMsg
   * @returns Slack TS or undefined if not a message that originated from slack
   * @private
   */


  getTimeStamp(rocketMsg) {
    // slack-G3KJGGE15-1483081061-000169
    let slackTS;

    let index = rocketMsg._id.indexOf('slack-');

    if (index === 0) {
      // This is a msg that originated from Slack
      slackTS = rocketMsg._id.substr(6, rocketMsg._id.length);
      index = slackTS.indexOf('-');
      slackTS = slackTS.substr(index + 1, slackTS.length);
      slackTS = slackTS.replace('-', '.');
    } else {
      // This probably originated as a Rocket msg, but has been sent to Slack
      slackTS = rocketMsg.slackTs;
    }

    return slackTS;
  }
  /**
   * Adds a slack channel to our collection that the rocketbot is a member of on slack
   * @param rocketChID
   * @param slackChID
   */


  addSlackChannel(rocketChID, slackChID) {
    const ch = this.getSlackChannel(rocketChID);

    if (null == ch) {
      this.slackChannelRocketBotMembershipMap.set(rocketChID, {
        id: slackChID,
        family: slackChID.charAt(0) === 'C' ? 'channels' : 'groups'
      });
    }
  }

  removeSlackChannel(slackChID) {
    const keys = this.slackChannelRocketBotMembershipMap.keys();
    let slackChannel;
    let key;

    while ((key = keys.next().value) != null) {
      slackChannel = this.slackChannelRocketBotMembershipMap.get(key);

      if (slackChannel.id === slackChID) {
        // Found it, need to delete it
        this.slackChannelRocketBotMembershipMap.delete(key);
        break;
      }
    }
  }

  getSlackChannel(rocketChID) {
    return this.slackChannelRocketBotMembershipMap.get(rocketChID);
  }

  populateMembershipChannelMapByChannels() {
    const response = HTTP.get('https://slack.com/api/channels.list', {
      params: {
        token: this.apiToken
      }
    });

    if (response && response.data && _.isArray(response.data.channels) && response.data.channels.length > 0) {
      for (const slackChannel of response.data.channels) {
        const rocketchat_room = RocketChat.models.Rooms.findOneByName(slackChannel.name, {
          fields: {
            _id: 1
          }
        });

        if (rocketchat_room) {
          if (slackChannel.is_member) {
            this.addSlackChannel(rocketchat_room._id, slackChannel.id);
          }
        }
      }
    }
  }

  populateMembershipChannelMapByGroups() {
    const response = HTTP.get('https://slack.com/api/groups.list', {
      params: {
        token: this.apiToken
      }
    });

    if (response && response.data && _.isArray(response.data.groups) && response.data.groups.length > 0) {
      for (const slackGroup of response.data.groups) {
        const rocketchat_room = RocketChat.models.Rooms.findOneByName(slackGroup.name, {
          fields: {
            _id: 1
          }
        });

        if (rocketchat_room) {
          if (slackGroup.is_member) {
            this.addSlackChannel(rocketchat_room._id, slackGroup.id);
          }
        }
      }
    }
  }

  populateMembershipChannelMap() {
    logger.slack.debug('Populating channel map');
    this.populateMembershipChannelMapByChannels();
    this.populateMembershipChannelMapByGroups();
  }
  /*
   https://api.slack.com/methods/reactions.add
   */


  postReactionAdded(reaction, slackChannel, slackTS) {
    if (reaction && slackChannel && slackTS) {
      const data = {
        token: this.apiToken,
        name: reaction,
        channel: slackChannel,
        timestamp: slackTS
      };
      logger.slack.debug('Posting Add Reaction to Slack');
      const postResult = HTTP.post('https://slack.com/api/reactions.add', {
        params: data
      });

      if (postResult.statusCode === 200 && postResult.data && postResult.data.ok === true) {
        logger.slack.debug('Reaction added to Slack');
      }
    }
  }
  /*
   https://api.slack.com/methods/reactions.remove
   */


  postReactionRemove(reaction, slackChannel, slackTS) {
    if (reaction && slackChannel && slackTS) {
      const data = {
        token: this.apiToken,
        name: reaction,
        channel: slackChannel,
        timestamp: slackTS
      };
      logger.slack.debug('Posting Remove Reaction to Slack');
      const postResult = HTTP.post('https://slack.com/api/reactions.remove', {
        params: data
      });

      if (postResult.statusCode === 200 && postResult.data && postResult.data.ok === true) {
        logger.slack.debug('Reaction removed from Slack');
      }
    }
  }

  postDeleteMessage(rocketMessage) {
    if (rocketMessage) {
      const slackChannel = this.getSlackChannel(rocketMessage.rid);

      if (slackChannel != null) {
        const data = {
          token: this.apiToken,
          ts: this.getTimeStamp(rocketMessage),
          channel: this.getSlackChannel(rocketMessage.rid).id,
          as_user: true
        };
        logger.slack.debug('Post Delete Message to Slack', data);
        const postResult = HTTP.post('https://slack.com/api/chat.delete', {
          params: data
        });

        if (postResult.statusCode === 200 && postResult.data && postResult.data.ok === true) {
          logger.slack.debug('Message deleted on Slack');
        }
      }
    }
  }

  postMessage(slackChannel, rocketMessage) {
    if (slackChannel && slackChannel.id) {
      let iconUrl = getAvatarUrlFromUsername(rocketMessage.u && rocketMessage.u.username);

      if (iconUrl) {
        iconUrl = Meteor.absoluteUrl().replace(/\/$/, '') + iconUrl;
      }

      const data = {
        token: this.apiToken,
        text: rocketMessage.msg,
        channel: slackChannel.id,
        username: rocketMessage.u && rocketMessage.u.username,
        icon_url: iconUrl,
        link_names: 1
      };
      logger.slack.debug('Post Message To Slack', data);
      const postResult = HTTP.post('https://slack.com/api/chat.postMessage', {
        params: data
      });

      if (postResult.statusCode === 200 && postResult.data && postResult.data.message && postResult.data.message.bot_id && postResult.data.message.ts) {
        RocketChat.models.Messages.setSlackBotIdAndSlackTs(rocketMessage._id, postResult.data.message.bot_id, postResult.data.message.ts);
        logger.slack.debug(`RocketMsgID=${rocketMessage._id} SlackMsgID=${postResult.data.message.ts} SlackBotID=${postResult.data.message.bot_id}`);
      }
    }
  }
  /*
   https://api.slack.com/methods/chat.update
   */


  postMessageUpdate(slackChannel, rocketMessage) {
    if (slackChannel && slackChannel.id) {
      const data = {
        token: this.apiToken,
        ts: this.getTimeStamp(rocketMessage),
        channel: slackChannel.id,
        text: rocketMessage.msg,
        as_user: true
      };
      logger.slack.debug('Post UpdateMessage To Slack', data);
      const postResult = HTTP.post('https://slack.com/api/chat.update', {
        params: data
      });

      if (postResult.statusCode === 200 && postResult.data && postResult.data.ok === true) {
        logger.slack.debug('Message updated on Slack');
      }
    }
  }

  processChannelJoin(slackMessage) {
    logger.slack.debug('Channel join', slackMessage.channel.id);
    const rocketCh = this.rocket.addChannel(slackMessage.channel);

    if (null != rocketCh) {
      this.addSlackChannel(rocketCh._id, slackMessage.channel);
    }
  }

  processFileShare(slackMessage) {
    if (!RocketChat.settings.get('SlackBridge_FileUpload_Enabled')) {
      return;
    }

    if (slackMessage.file && slackMessage.file.url_private_download !== undefined) {
      const rocketChannel = this.rocket.getChannel(slackMessage);
      const rocketUser = this.rocket.getUser(slackMessage.user); // Hack to notify that a file was attempted to be uploaded

      delete slackMessage.subtype; // If the text includes the file link, simply use the same text for the rocket message.
      // If the link was not included, then use it instead of the message.

      if (slackMessage.text.indexOf(slackMessage.file.permalink) < 0) {
        slackMessage.text = slackMessage.file.permalink;
      }

      const ts = new Date(parseInt(slackMessage.ts.split('.')[0]) * 1000);
      const msgDataDefaults = {
        _id: this.rocket.createRocketID(slackMessage.channel, slackMessage.ts),
        ts,
        updatedBySlack: true
      };
      this.rocket.createAndSaveMessage(rocketChannel, rocketUser, slackMessage, msgDataDefaults, false);
    }
  }
  /*
   https://api.slack.com/events/message/message_deleted
   */


  processMessageDeleted(slackMessage) {
    if (slackMessage.previous_message) {
      const rocketChannel = this.rocket.getChannel(slackMessage);
      const rocketUser = RocketChat.models.Users.findOneById('rocket.cat', {
        fields: {
          username: 1
        }
      });

      if (rocketChannel && rocketUser) {
        // Find the Rocket message to delete
        let rocketMsgObj = RocketChat.models.Messages.findOneBySlackBotIdAndSlackTs(slackMessage.previous_message.bot_id, slackMessage.previous_message.ts);

        if (!rocketMsgObj) {
          // Must have been a Slack originated msg
          const _id = this.rocket.createRocketID(slackMessage.channel, slackMessage.previous_message.ts);

          rocketMsgObj = RocketChat.models.Messages.findOneById(_id);
        }

        if (rocketMsgObj) {
          RocketChat.deleteMessage(rocketMsgObj, rocketUser);
          logger.slack.debug('Rocket message deleted by Slack');
        }
      }
    }
  }
  /*
   https://api.slack.com/events/message/message_changed
   */


  processMessageChanged(slackMessage) {
    if (slackMessage.previous_message) {
      const currentMsg = RocketChat.models.Messages.findOneById(this.rocket.createRocketID(slackMessage.channel, slackMessage.message.ts)); // Only process this change, if its an actual update (not just Slack repeating back our Rocket original change)

      if (currentMsg && slackMessage.message.text !== currentMsg.msg) {
        const rocketChannel = this.rocket.getChannel(slackMessage);
        const rocketUser = slackMessage.previous_message.user ? this.rocket.findUser(slackMessage.previous_message.user) || this.rocket.addUser(slackMessage.previous_message.user) : null;
        const rocketMsgObj = {
          // @TODO _id
          _id: this.rocket.createRocketID(slackMessage.channel, slackMessage.previous_message.ts),
          rid: rocketChannel._id,
          msg: this.rocket.convertSlackMsgTxtToRocketTxtFormat(slackMessage.message.text),
          updatedBySlack: true // We don't want to notify slack about this change since Slack initiated it

        };
        RocketChat.updateMessage(rocketMsgObj, rocketUser);
        logger.slack.debug('Rocket message updated by Slack');
      }
    }
  }
  /*
   This method will get refactored and broken down into single responsibilities
   */


  processNewMessage(slackMessage, isImporting) {
    const rocketChannel = this.rocket.getChannel(slackMessage);
    let rocketUser = null;

    if (slackMessage.subtype === 'bot_message') {
      rocketUser = RocketChat.models.Users.findOneById('rocket.cat', {
        fields: {
          username: 1
        }
      });
    } else {
      rocketUser = slackMessage.user ? this.rocket.findUser(slackMessage.user) || this.rocket.addUser(slackMessage.user) : null;
    }

    if (rocketChannel && rocketUser) {
      const msgDataDefaults = {
        _id: this.rocket.createRocketID(slackMessage.channel, slackMessage.ts),
        ts: new Date(parseInt(slackMessage.ts.split('.')[0]) * 1000)
      };

      if (isImporting) {
        msgDataDefaults.imported = 'slackbridge';
      }

      try {
        this.rocket.createAndSaveMessage(rocketChannel, rocketUser, slackMessage, msgDataDefaults, isImporting);
      } catch (e) {
        // http://www.mongodb.org/about/contributors/error-codes/
        // 11000 == duplicate key error
        if (e.name === 'MongoError' && e.code === 11000) {
          return;
        }

        throw e;
      }
    }
  }

  processBotMessage(rocketChannel, slackMessage) {
    const excludeBotNames = RocketChat.settings.get('SlackBridge_ExcludeBotnames');

    if (slackMessage.username !== undefined && excludeBotNames && slackMessage.username.match(excludeBotNames)) {
      return;
    }

    const rocketMsgObj = {
      msg: this.rocket.convertSlackMsgTxtToRocketTxtFormat(slackMessage.text),
      rid: rocketChannel._id,
      bot: true,
      attachments: slackMessage.attachments,
      username: slackMessage.username || slackMessage.bot_id
    };
    this.rocket.addAliasToMsg(slackMessage.username || slackMessage.bot_id, rocketMsgObj);

    if (slackMessage.icons) {
      rocketMsgObj.emoji = slackMessage.icons.emoji;
    }

    return rocketMsgObj;
  }

  processMeMessage(rocketUser, slackMessage) {
    return this.rocket.addAliasToMsg(rocketUser.username, {
      msg: `_${this.rocket.convertSlackMsgTxtToRocketTxtFormat(slackMessage.text)}_`
    });
  }

  processChannelJoinMessage(rocketChannel, rocketUser, slackMessage, isImporting) {
    if (isImporting) {
      RocketChat.models.Messages.createUserJoinWithRoomIdAndUser(rocketChannel._id, rocketUser, {
        ts: new Date(parseInt(slackMessage.ts.split('.')[0]) * 1000),
        imported: 'slackbridge'
      });
    } else {
      RocketChat.addUserToRoom(rocketChannel._id, rocketUser);
    }
  }

  processGroupJoinMessage(rocketChannel, rocketUser, slackMessage, isImporting) {
    if (slackMessage.inviter) {
      const inviter = slackMessage.inviter ? this.rocket.findUser(slackMessage.inviter) || this.rocket.addUser(slackMessage.inviter) : null;

      if (isImporting) {
        RocketChat.models.Messages.createUserAddedWithRoomIdAndUser(rocketChannel._id, rocketUser, {
          ts: new Date(parseInt(slackMessage.ts.split('.')[0]) * 1000),
          u: {
            _id: inviter._id,
            username: inviter.username
          },
          imported: 'slackbridge'
        });
      } else {
        RocketChat.addUserToRoom(rocketChannel._id, rocketUser, inviter);
      }
    }
  }

  processLeaveMessage(rocketChannel, rocketUser, slackMessage, isImporting) {
    if (isImporting) {
      RocketChat.models.Messages.createUserLeaveWithRoomIdAndUser(rocketChannel._id, rocketUser, {
        ts: new Date(parseInt(slackMessage.ts.split('.')[0]) * 1000),
        imported: 'slackbridge'
      });
    } else {
      RocketChat.removeUserFromRoom(rocketChannel._id, rocketUser);
    }
  }

  processTopicMessage(rocketChannel, rocketUser, slackMessage, isImporting) {
    if (isImporting) {
      RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser('room_changed_topic', rocketChannel._id, slackMessage.topic, rocketUser, {
        ts: new Date(parseInt(slackMessage.ts.split('.')[0]) * 1000),
        imported: 'slackbridge'
      });
    } else {
      RocketChat.saveRoomTopic(rocketChannel._id, slackMessage.topic, rocketUser, false);
    }
  }

  processPurposeMessage(rocketChannel, rocketUser, slackMessage, isImporting) {
    if (isImporting) {
      RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser('room_changed_topic', rocketChannel._id, slackMessage.purpose, rocketUser, {
        ts: new Date(parseInt(slackMessage.ts.split('.')[0]) * 1000),
        imported: 'slackbridge'
      });
    } else {
      RocketChat.saveRoomTopic(rocketChannel._id, slackMessage.purpose, rocketUser, false);
    }
  }

  processNameMessage(rocketChannel, rocketUser, slackMessage, isImporting) {
    if (isImporting) {
      RocketChat.models.Messages.createRoomRenamedWithRoomIdRoomNameAndUser(rocketChannel._id, slackMessage.name, rocketUser, {
        ts: new Date(parseInt(slackMessage.ts.split('.')[0]) * 1000),
        imported: 'slackbridge'
      });
    } else {
      RocketChat.saveRoomName(rocketChannel._id, slackMessage.name, rocketUser, false);
    }
  }

  processShareMessage(rocketChannel, rocketUser, slackMessage, isImporting) {
    if (slackMessage.file && slackMessage.file.url_private_download !== undefined) {
      const details = {
        message_id: `slack-${slackMessage.ts.replace(/\./g, '-')}`,
        name: slackMessage.file.name,
        size: slackMessage.file.size,
        type: slackMessage.file.mimetype,
        rid: rocketChannel._id
      };
      return this.uploadFileFromSlack(details, slackMessage.file.url_private_download, rocketUser, rocketChannel, new Date(parseInt(slackMessage.ts.split('.')[0]) * 1000), isImporting);
    }
  }

  processPinnedItemMessage(rocketChannel, rocketUser, slackMessage, isImporting) {
    if (slackMessage.attachments && slackMessage.attachments[0] && slackMessage.attachments[0].text) {
      const rocketMsgObj = {
        rid: rocketChannel._id,
        t: 'message_pinned',
        msg: '',
        u: {
          _id: rocketUser._id,
          username: rocketUser.username
        },
        attachments: [{
          text: this.rocket.convertSlackMsgTxtToRocketTxtFormat(slackMessage.attachments[0].text),
          author_name: slackMessage.attachments[0].author_subname,
          author_icon: getAvatarUrlFromUsername(slackMessage.attachments[0].author_subname),
          ts: new Date(parseInt(slackMessage.attachments[0].ts.split('.')[0]) * 1000)
        }]
      };

      if (!isImporting) {
        RocketChat.models.Messages.setPinnedByIdAndUserId(`slack-${slackMessage.attachments[0].channel_id}-${slackMessage.attachments[0].ts.replace(/\./g, '-')}`, rocketMsgObj.u, true, new Date(parseInt(slackMessage.ts.split('.')[0]) * 1000));
      }

      return rocketMsgObj;
    } else {
      logger.slack.error('Pinned item with no attachment');
    }
  }

  processSubtypedMessage(rocketChannel, rocketUser, slackMessage, isImporting) {
    switch (slackMessage.subtype) {
      case 'bot_message':
        return this.processBotMessage(rocketChannel, slackMessage);

      case 'me_message':
        return this.processMeMessage(rocketUser, slackMessage);

      case 'channel_join':
        return this.processChannelJoinMessage(rocketChannel, rocketUser, slackMessage, isImporting);

      case 'group_join':
        return this.processGroupJoinMessage(rocketChannel, rocketUser, slackMessage, isImporting);

      case 'channel_leave':
      case 'group_leave':
        return this.processLeaveMessage(rocketChannel, rocketUser, slackMessage, isImporting);

      case 'channel_topic':
      case 'group_topic':
        return this.processTopicMessage(rocketChannel, rocketUser, slackMessage, isImporting);

      case 'channel_purpose':
      case 'group_purpose':
        return this.processPurposeMessage(rocketChannel, rocketUser, slackMessage, isImporting);

      case 'channel_name':
      case 'group_name':
        return this.processNameMessage(rocketChannel, rocketUser, slackMessage, isImporting);

      case 'channel_archive':
      case 'group_archive':
        if (!isImporting) {
          RocketChat.archiveRoom(rocketChannel);
        }

        return;

      case 'channel_unarchive':
      case 'group_unarchive':
        if (!isImporting) {
          RocketChat.unarchiveRoom(rocketChannel);
        }

        return;

      case 'file_share':
        return this.processShareMessage(rocketChannel, rocketUser, slackMessage, isImporting);

      case 'file_comment':
        logger.slack.error('File comment not implemented');
        return;

      case 'file_mention':
        logger.slack.error('File mentioned not implemented');
        return;

      case 'pinned_item':
        return this.processPinnedItemMessage(rocketChannel, rocketUser, slackMessage, isImporting);

      case 'unpinned_item':
        logger.slack.error('Unpinned item not implemented');
        return;
    }
  }
  /**
  Uploads the file to the storage.
  @param [Object] details an object with details about the upload. name, size, type, and rid
  @param [String] fileUrl url of the file to download/import
  @param [Object] user the Rocket.Chat user
  @param [Object] room the Rocket.Chat room
  @param [Date] timeStamp the timestamp the file was uploaded
  **/
  // details, slackMessage.file.url_private_download, rocketUser, rocketChannel, new Date(parseInt(slackMessage.ts.split('.')[0]) * 1000), isImporting);


  uploadFileFromSlack(details, slackFileURL, rocketUser, rocketChannel, timeStamp, isImporting) {
    const requestModule = /https/i.test(slackFileURL) ? https : http;
    const parsedUrl = url.parse(slackFileURL, true);
    parsedUrl.headers = {
      Authorization: `Bearer ${this.apiToken}`
    };
    requestModule.get(parsedUrl, Meteor.bindEnvironment(stream => {
      const fileStore = FileUpload.getStore('Uploads');
      fileStore.insert(details, stream, (err, file) => {
        if (err) {
          throw new Error(err);
        } else {
          const url = file.url.replace(Meteor.absoluteUrl(), '/');
          const attachment = {
            title: file.name,
            title_link: url
          };

          if (/^image\/.+/.test(file.type)) {
            attachment.image_url = url;
            attachment.image_type = file.type;
            attachment.image_size = file.size;
            attachment.image_dimensions = file.identify && file.identify.size;
          }

          if (/^audio\/.+/.test(file.type)) {
            attachment.audio_url = url;
            attachment.audio_type = file.type;
            attachment.audio_size = file.size;
          }

          if (/^video\/.+/.test(file.type)) {
            attachment.video_url = url;
            attachment.video_type = file.type;
            attachment.video_size = file.size;
          }

          const msg = {
            rid: details.rid,
            ts: timeStamp,
            msg: '',
            file: {
              _id: file._id
            },
            groupable: false,
            attachments: [attachment]
          };

          if (isImporting) {
            msg.imported = 'slackbridge';
          }

          if (details.message_id && typeof details.message_id === 'string') {
            msg._id = details.message_id;
          }

          return RocketChat.sendMessage(rocketUser, msg, rocketChannel, true);
        }
      });
    }));
  }

  importFromHistory(family, options) {
    logger.slack.debug('Importing messages history');
    const response = HTTP.get(`https://slack.com/api/${family}.history`, {
      params: _.extend({
        token: this.apiToken
      }, options)
    });

    if (response && response.data && _.isArray(response.data.messages) && response.data.messages.length > 0) {
      let latest = 0;

      for (const message of response.data.messages.reverse()) {
        logger.slack.debug('MESSAGE: ', message);

        if (!latest || message.ts > latest) {
          latest = message.ts;
        }

        message.channel = options.channel;
        this.onMessage(message, true);
      }

      return {
        has_more: response.data.has_more,
        ts: latest
      };
    }
  }

  copyChannelInfo(rid, channelMap) {
    logger.slack.debug('Copying users from Slack channel to Rocket.Chat', channelMap.id, rid);
    const response = HTTP.get(`https://slack.com/api/${channelMap.family}.info`, {
      params: {
        token: this.apiToken,
        channel: channelMap.id
      }
    });

    if (response && response.data) {
      const data = channelMap.family === 'channels' ? response.data.channel : response.data.group;

      if (data && _.isArray(data.members) && data.members.length > 0) {
        for (const member of data.members) {
          const user = this.rocket.findUser(member) || this.rocket.addUser(member);

          if (user) {
            logger.slack.debug('Adding user to room', user.username, rid);
            RocketChat.addUserToRoom(rid, user, null, true);
          }
        }
      }

      let topic = '';
      let topic_last_set = 0;
      let topic_creator = null;

      if (data && data.topic && data.topic.value) {
        topic = data.topic.value;
        topic_last_set = data.topic.last_set;
        topic_creator = data.topic.creator;
      }

      if (data && data.purpose && data.purpose.value) {
        if (topic_last_set) {
          if (topic_last_set < data.purpose.last_set) {
            topic = data.purpose.topic;
            topic_creator = data.purpose.creator;
          }
        } else {
          topic = data.purpose.topic;
          topic_creator = data.purpose.creator;
        }
      }

      if (topic) {
        const creator = this.rocket.findUser(topic_creator) || this.rocket.addUser(topic_creator);
        logger.slack.debug('Setting room topic', rid, topic, creator.username);
        RocketChat.saveRoomTopic(rid, topic, creator, false);
      }
    }
  }

  copyPins(rid, channelMap) {
    const response = HTTP.get('https://slack.com/api/pins.list', {
      params: {
        token: this.apiToken,
        channel: channelMap.id
      }
    });

    if (response && response.data && _.isArray(response.data.items) && response.data.items.length > 0) {
      for (const pin of response.data.items) {
        if (pin.message) {
          const user = this.rocket.findUser(pin.message.user);
          const msgObj = {
            rid,
            t: 'message_pinned',
            msg: '',
            u: {
              _id: user._id,
              username: user.username
            },
            attachments: [{
              text: this.rocket.convertSlackMsgTxtToRocketTxtFormat(pin.message.text),
              author_name: user.username,
              author_icon: getAvatarUrlFromUsername(user.username),
              ts: new Date(parseInt(pin.message.ts.split('.')[0]) * 1000)
            }]
          };
          RocketChat.models.Messages.setPinnedByIdAndUserId(`slack-${pin.channel}-${pin.message.ts.replace(/\./g, '-')}`, msgObj.u, true, new Date(parseInt(pin.message.ts.split('.')[0]) * 1000));
        }
      }
    }
  }

  importMessages(rid, callback) {
    logger.slack.info('importMessages: ', rid);
    const rocketchat_room = RocketChat.models.Rooms.findOneById(rid);

    if (rocketchat_room) {
      if (this.getSlackChannel(rid)) {
        this.copyChannelInfo(rid, this.getSlackChannel(rid));
        logger.slack.debug('Importing messages from Slack to Rocket.Chat', this.getSlackChannel(rid), rid);
        let results = this.importFromHistory(this.getSlackChannel(rid).family, {
          channel: this.getSlackChannel(rid).id,
          oldest: 1
        });

        while (results && results.has_more) {
          results = this.importFromHistory(this.getSlackChannel(rid).family, {
            channel: this.getSlackChannel(rid).id,
            oldest: results.ts
          });
        }

        logger.slack.debug('Pinning Slack channel messages to Rocket.Chat', this.getSlackChannel(rid), rid);
        this.copyPins(rid, this.getSlackChannel(rid));
        return callback();
      } else {
        const slack_room = this.postFindChannel(rocketchat_room.name);

        if (slack_room) {
          this.addSlackChannel(rid, slack_room.id);
          return this.importMessages(rid, callback);
        } else {
          logger.slack.error('Could not find Slack room with specified name', rocketchat_room.name);
          return callback(new Meteor.Error('error-slack-room-not-found', 'Could not find Slack room with specified name'));
        }
      }
    } else {
      logger.slack.error('Could not find Rocket.Chat room with specified id', rid);
      return callback(new Meteor.Error('error-invalid-room', 'Invalid room'));
    }
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:slackbridge/server/logger.js");
require("/node_modules/meteor/rocketchat:slackbridge/server/settings.js");
require("/node_modules/meteor/rocketchat:slackbridge/server/slackbridge.js");
require("/node_modules/meteor/rocketchat:slackbridge/server/slackbridge_import.server.js");
require("/node_modules/meteor/rocketchat:slackbridge/server/RocketAdapter.js");
require("/node_modules/meteor/rocketchat:slackbridge/server/SlackAdapter.js");

/* Exports */
Package._define("rocketchat:slackbridge");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_slackbridge.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbGFja2JyaWRnZS9zZXJ2ZXIvbG9nZ2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnNsYWNrYnJpZGdlL3NlcnZlci9zZXR0aW5ncy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzbGFja2JyaWRnZS9zZXJ2ZXIvc2xhY2ticmlkZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6c2xhY2ticmlkZ2Uvc2VydmVyL3NsYWNrYnJpZGdlX2ltcG9ydC5zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6c2xhY2ticmlkZ2Uvc2VydmVyL1JvY2tldEFkYXB0ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6c2xhY2ticmlkZ2Uvc2VydmVyL1NsYWNrQWRhcHRlci5qcyJdLCJuYW1lcyI6WyJsb2dnZXIiLCJMb2dnZXIiLCJzZWN0aW9ucyIsImNvbm5lY3Rpb24iLCJldmVudHMiLCJjbGFzcyIsInNsYWNrIiwicm9ja2V0IiwiTWV0ZW9yIiwic3RhcnR1cCIsIlJvY2tldENoYXQiLCJzZXR0aW5ncyIsImFkZEdyb3VwIiwiYWRkIiwidHlwZSIsImkxOG5MYWJlbCIsInB1YmxpYyIsImVuYWJsZVF1ZXJ5IiwiX2lkIiwidmFsdWUiLCJpMThuRGVzY3JpcHRpb24iLCJTbGFja0FkYXB0ZXIiLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsIlJvY2tldEFkYXB0ZXIiLCJTbGFja0JyaWRnZSIsImNvbnN0cnVjdG9yIiwicmVhY3Rpb25zTWFwIiwiTWFwIiwiY29ubmVjdGVkIiwic2V0U2xhY2siLCJzZXRSb2NrZXQiLCJhcGlUb2tlbiIsImFsaWFzRm9ybWF0IiwiZXhjbHVkZUJvdG5hbWVzIiwiaXNSZWFjdGlvbnNFbmFibGVkIiwicHJvY2Vzc1NldHRpbmdzIiwiY29ubmVjdCIsImdldCIsImluZm8iLCJkaXNjb25uZWN0Iiwia2V5IiwiZGVidWciLCJTbGFja0JyaWRnZUltcG9ydCIsImNvbW1hbmQiLCJwYXJhbXMiLCJpdGVtIiwiTWF0Y2giLCJ0ZXN0IiwiU3RyaW5nIiwicm9vbSIsIm1vZGVscyIsIlJvb21zIiwiZmluZE9uZUJ5SWQiLCJyaWQiLCJjaGFubmVsIiwibmFtZSIsInVzZXIiLCJ1c2VycyIsImZpbmRPbmUiLCJ1c2VySWQiLCJtc2dTdHJlYW0iLCJlbWl0IiwiUmFuZG9tIiwiaWQiLCJ1IiwidXNlcm5hbWUiLCJ0cyIsIkRhdGUiLCJtc2ciLCJUQVBpMThuIiwiX18iLCJwb3N0UHJvY2VzcyIsInNwcmludGYiLCJsYW5ndWFnZSIsImltcG9ydE1lc3NhZ2VzIiwiZXJyb3IiLCJtZXNzYWdlIiwic2xhc2hDb21tYW5kcyIsImV4cG9ydCIsIl8iLCJzbGFja0JyaWRnZSIsInV0aWwiLCJOcG0iLCJ1c2VyVGFncyIsInJlZ2lzdGVyRm9yRXZlbnRzIiwidW5yZWdpc3RlckZvckV2ZW50cyIsImNhbGxiYWNrcyIsIm9uTWVzc2FnZSIsImJpbmQiLCJwcmlvcml0eSIsIkxPVyIsIm9uTWVzc2FnZURlbGV0ZSIsIm9uU2V0UmVhY3Rpb24iLCJvblVuU2V0UmVhY3Rpb24iLCJyZW1vdmUiLCJyb2NrZXRNZXNzYWdlRGVsZXRlZCIsImdldFNsYWNrQ2hhbm5lbCIsInBvc3REZWxldGVNZXNzYWdlIiwiZXJyIiwicm9ja2V0TXNnSUQiLCJyZWFjdGlvbiIsImRlbGV0ZSIsInJvY2tldE1zZyIsIk1lc3NhZ2VzIiwic2xhY2tDaGFubmVsIiwic2xhY2tUUyIsImdldFRpbWVTdGFtcCIsInBvc3RSZWFjdGlvbkFkZGVkIiwicmVwbGFjZSIsInBvc3RSZWFjdGlvblJlbW92ZSIsInJvY2tldE1lc3NhZ2UiLCJlZGl0ZWRBdCIsInByb2Nlc3NNZXNzYWdlQ2hhbmdlZCIsImluZGV4T2YiLCJmaWxlIiwicHJvY2Vzc0ZpbGVTaGFyZSIsInByb2Nlc3NTZW5kTWVzc2FnZSIsInBvc3RNZXNzYWdlIiwib3V0U2xhY2tDaGFubmVscyIsInBsdWNrIiwiZ2V0TWVzc2FnZUF0dGFjaG1lbnQiLCJhdHRhY2htZW50cyIsImxlbmd0aCIsImZpbGVJZCIsImZpbmQiLCJhdHRhY2htZW50IiwidGl0bGVfbGluayIsImdldEZpbGVEb3dubG9hZFVybCIsImZpbGVfbmFtZSIsInRleHQiLCJhYnNvbHV0ZVVybCIsImRlc2NyaXB0aW9uIiwidXBkYXRlZEJ5U2xhY2siLCJwb3N0TWVzc2FnZVVwZGF0ZSIsImdldENoYW5uZWwiLCJzbGFja01lc3NhZ2UiLCJmaW5kQ2hhbm5lbCIsImFkZENoYW5uZWwiLCJnZXRVc2VyIiwic2xhY2tVc2VyIiwiZmluZFVzZXIiLCJhZGRVc2VyIiwiY3JlYXRlUm9ja2V0SUQiLCJzbGFja0NoYW5uZWxJZCIsImZpbmRPbmVCeUltcG9ydElkIiwic2xhY2tDaGFubmVsSUQiLCJoYXNSZXRyaWVkIiwic2xhY2tSZXN1bHRzIiwiaXNHcm91cCIsImNoYXJBdCIsIkhUVFAiLCJ0b2tlbiIsImRhdGEiLCJvayIsInJvY2tldENoYW5uZWxEYXRhIiwiZ3JvdXAiLCJleGlzdGluZ1JvY2tldFJvb20iLCJmaW5kT25lQnlOYW1lIiwiaXNfZ2VuZXJhbCIsInJvY2tldElkIiwiYWRkSW1wb3J0SWRzIiwicm9ja2V0VXNlcnMiLCJtZW1iZXIiLCJtZW1iZXJzIiwiY3JlYXRvciIsInJvY2tldFVzZXIiLCJwdXNoIiwicm9ja2V0VXNlckNyZWF0b3IiLCJyb2NrZXRDaGFubmVsIiwiY3JlYXRlUm9vbSIsImUiLCJfc2xlZXBGb3JNcyIsImNvbnNvbGUiLCJsb2ciLCJyb29tVXBkYXRlIiwiY3JlYXRlZCIsImxhc3RTZXRUb3BpYyIsImlzRW1wdHkiLCJ0b3BpYyIsImxhc3Rfc2V0IiwicHVycG9zZSIsImFkZFNsYWNrQ2hhbm5lbCIsInNsYWNrVXNlcklEIiwiVXNlcnMiLCJyb2NrZXRVc2VyRGF0YSIsImlzQm90IiwiaXNfYm90IiwiZW1haWwiLCJwcm9maWxlIiwiZXhpc3RpbmdSb2NrZXRVc2VyIiwiZmluZE9uZUJ5RW1haWxBZGRyZXNzIiwiZmluZE9uZUJ5VXNlcm5hbWUiLCJuZXdVc2VyIiwicGFzc3dvcmQiLCJqb2luRGVmYXVsdENoYW5uZWxzIiwiQWNjb3VudHMiLCJjcmVhdGVVc2VyIiwidXNlclVwZGF0ZSIsInV0Y09mZnNldCIsInR6X29mZnNldCIsInJvbGVzIiwicmVhbF9uYW1lIiwiZGVsZXRlZCIsImFjdGl2ZSIsInVwZGF0ZSIsIiRzZXQiLCJ1cmwiLCJpbWFnZV9vcmlnaW5hbCIsImltYWdlXzUxMiIsInNldFVzZXJBdmF0YXIiLCJpbXBvcnRJZHMiLCJib3RfaWQiLCJhZGRBbGlhc1RvTXNnIiwicm9ja2V0VXNlck5hbWUiLCJyb2NrZXRNc2dPYmoiLCJhbGlhcyIsImZvcm1hdCIsImNyZWF0ZUFuZFNhdmVNZXNzYWdlIiwicm9ja2V0TXNnRGF0YURlZmF1bHRzIiwiaXNJbXBvcnRpbmciLCJzdWJ0eXBlIiwicHJvY2Vzc1N1YnR5cGVkTWVzc2FnZSIsImNvbnZlcnRTbGFja01zZ1R4dFRvUm9ja2V0VHh0Rm9ybWF0IiwiZXh0ZW5kIiwiZWRpdGVkIiwicGFyc2VJbnQiLCJzcGxpdCIsImZpZWxkcyIsInBpbm5lZF90byIsInBpbm5lZCIsInBpbm5lZEF0Iiwibm93IiwicGlubmVkQnkiLCJwaWNrIiwic2V0VGltZW91dCIsImZpbmRPbmVCeVNsYWNrQm90SWRBbmRTbGFja1RzIiwic2VuZE1lc3NhZ2UiLCJzbGFja01zZ1R4dCIsIm1hdGNoIiwiaHR0cCIsImh0dHBzIiwic2xhY2tDbGllbnQiLCJydG0iLCJzbGFja0NoYW5uZWxSb2NrZXRCb3RNZW1iZXJzaGlwTWFwIiwiUlRNQ2xpZW50Iiwic3RhcnQiLCJwb3B1bGF0ZU1lbWJlcnNoaXBDaGFubmVsTWFwIiwib24iLCJiaW5kRW52aXJvbm1lbnQiLCJyZWFjdGlvbk1zZyIsIm9uUmVhY3Rpb25BZGRlZCIsIm9uUmVhY3Rpb25SZW1vdmVkIiwiY2hhbm5lbExlZnRNc2ciLCJvbkNoYW5uZWxMZWZ0Iiwic2xhY2tSZWFjdGlvbk1zZyIsImZpbmRPbmVCeVNsYWNrVHMiLCJyb2NrZXRJRCIsInJvY2tldFJlYWN0aW9uIiwicmVhY3Rpb25zIiwidGhlUmVhY3Rpb24iLCJ1c2VybmFtZXMiLCJzZXQiLCJydW5Bc1VzZXIiLCJjYWxsIiwiaW5jbHVkZXMiLCJyZW1vdmVTbGFja0NoYW5uZWwiLCJwcm9jZXNzTWVzc2FnZURlbGV0ZWQiLCJwcm9jZXNzQ2hhbm5lbEpvaW4iLCJwcm9jZXNzTmV3TWVzc2FnZSIsInBvc3RHZXRDaGFubmVsSW5mbyIsInNsYWNrQ2hJRCIsInJlc3BvbnNlIiwicG9zdEZpbmRDaGFubmVsIiwicm9ja2V0Q2hhbm5lbE5hbWUiLCJpc0FycmF5IiwiY2hhbm5lbHMiLCJpc19tZW1iZXIiLCJncm91cHMiLCJpbmRleCIsInN1YnN0ciIsInNsYWNrVHMiLCJyb2NrZXRDaElEIiwiY2giLCJmYW1pbHkiLCJrZXlzIiwibmV4dCIsInBvcHVsYXRlTWVtYmVyc2hpcENoYW5uZWxNYXBCeUNoYW5uZWxzIiwicm9ja2V0Y2hhdF9yb29tIiwicG9wdWxhdGVNZW1iZXJzaGlwQ2hhbm5lbE1hcEJ5R3JvdXBzIiwic2xhY2tHcm91cCIsInRpbWVzdGFtcCIsInBvc3RSZXN1bHQiLCJwb3N0Iiwic3RhdHVzQ29kZSIsImFzX3VzZXIiLCJpY29uVXJsIiwiZ2V0QXZhdGFyVXJsRnJvbVVzZXJuYW1lIiwiaWNvbl91cmwiLCJsaW5rX25hbWVzIiwic2V0U2xhY2tCb3RJZEFuZFNsYWNrVHMiLCJyb2NrZXRDaCIsInVybF9wcml2YXRlX2Rvd25sb2FkIiwidW5kZWZpbmVkIiwicGVybWFsaW5rIiwibXNnRGF0YURlZmF1bHRzIiwicHJldmlvdXNfbWVzc2FnZSIsImRlbGV0ZU1lc3NhZ2UiLCJjdXJyZW50TXNnIiwidXBkYXRlTWVzc2FnZSIsImltcG9ydGVkIiwiY29kZSIsInByb2Nlc3NCb3RNZXNzYWdlIiwiZXhjbHVkZUJvdE5hbWVzIiwiYm90IiwiaWNvbnMiLCJlbW9qaSIsInByb2Nlc3NNZU1lc3NhZ2UiLCJwcm9jZXNzQ2hhbm5lbEpvaW5NZXNzYWdlIiwiY3JlYXRlVXNlckpvaW5XaXRoUm9vbUlkQW5kVXNlciIsImFkZFVzZXJUb1Jvb20iLCJwcm9jZXNzR3JvdXBKb2luTWVzc2FnZSIsImludml0ZXIiLCJjcmVhdGVVc2VyQWRkZWRXaXRoUm9vbUlkQW5kVXNlciIsInByb2Nlc3NMZWF2ZU1lc3NhZ2UiLCJjcmVhdGVVc2VyTGVhdmVXaXRoUm9vbUlkQW5kVXNlciIsInJlbW92ZVVzZXJGcm9tUm9vbSIsInByb2Nlc3NUb3BpY01lc3NhZ2UiLCJjcmVhdGVSb29tU2V0dGluZ3NDaGFuZ2VkV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlciIsInNhdmVSb29tVG9waWMiLCJwcm9jZXNzUHVycG9zZU1lc3NhZ2UiLCJwcm9jZXNzTmFtZU1lc3NhZ2UiLCJjcmVhdGVSb29tUmVuYW1lZFdpdGhSb29tSWRSb29tTmFtZUFuZFVzZXIiLCJzYXZlUm9vbU5hbWUiLCJwcm9jZXNzU2hhcmVNZXNzYWdlIiwiZGV0YWlscyIsIm1lc3NhZ2VfaWQiLCJzaXplIiwibWltZXR5cGUiLCJ1cGxvYWRGaWxlRnJvbVNsYWNrIiwicHJvY2Vzc1Bpbm5lZEl0ZW1NZXNzYWdlIiwidCIsImF1dGhvcl9uYW1lIiwiYXV0aG9yX3N1Ym5hbWUiLCJhdXRob3JfaWNvbiIsInNldFBpbm5lZEJ5SWRBbmRVc2VySWQiLCJjaGFubmVsX2lkIiwiYXJjaGl2ZVJvb20iLCJ1bmFyY2hpdmVSb29tIiwic2xhY2tGaWxlVVJMIiwidGltZVN0YW1wIiwicmVxdWVzdE1vZHVsZSIsInBhcnNlZFVybCIsInBhcnNlIiwiaGVhZGVycyIsIkF1dGhvcml6YXRpb24iLCJzdHJlYW0iLCJmaWxlU3RvcmUiLCJGaWxlVXBsb2FkIiwiZ2V0U3RvcmUiLCJpbnNlcnQiLCJFcnJvciIsInRpdGxlIiwiaW1hZ2VfdXJsIiwiaW1hZ2VfdHlwZSIsImltYWdlX3NpemUiLCJpbWFnZV9kaW1lbnNpb25zIiwiaWRlbnRpZnkiLCJhdWRpb191cmwiLCJhdWRpb190eXBlIiwiYXVkaW9fc2l6ZSIsInZpZGVvX3VybCIsInZpZGVvX3R5cGUiLCJ2aWRlb19zaXplIiwiZ3JvdXBhYmxlIiwiaW1wb3J0RnJvbUhpc3RvcnkiLCJvcHRpb25zIiwibWVzc2FnZXMiLCJsYXRlc3QiLCJyZXZlcnNlIiwiaGFzX21vcmUiLCJjb3B5Q2hhbm5lbEluZm8iLCJjaGFubmVsTWFwIiwidG9waWNfbGFzdF9zZXQiLCJ0b3BpY19jcmVhdG9yIiwiY29weVBpbnMiLCJpdGVtcyIsInBpbiIsIm1zZ09iaiIsImNhbGxiYWNrIiwicmVzdWx0cyIsIm9sZGVzdCIsInNsYWNrX3Jvb20iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7QUFDQTtBQUVBQSxTQUFTLElBQUlDLE1BQUosQ0FBVyxhQUFYLEVBQTBCO0FBQ2xDQyxZQUFVO0FBQ1RDLGdCQUFZLFlBREg7QUFFVEMsWUFBUSxRQUZDO0FBR1RDLFdBQU8sT0FIRTtBQUlUQyxXQUFPLE9BSkU7QUFLVEMsWUFBUTtBQUxDO0FBRHdCLENBQTFCLENBQVQsQzs7Ozs7Ozs7Ozs7QUNIQUMsT0FBT0MsT0FBUCxDQUFlLFlBQVc7QUFDekJDLGFBQVdDLFFBQVgsQ0FBb0JDLFFBQXBCLENBQTZCLGFBQTdCLEVBQTRDLFlBQVc7QUFDdEQsU0FBS0MsR0FBTCxDQUFTLHFCQUFULEVBQWdDLEtBQWhDLEVBQXVDO0FBQ3RDQyxZQUFNLFNBRGdDO0FBRXRDQyxpQkFBVyxTQUYyQjtBQUd0Q0MsY0FBUTtBQUg4QixLQUF2QztBQU1BLFNBQUtILEdBQUwsQ0FBUyxzQkFBVCxFQUFpQyxFQUFqQyxFQUFxQztBQUNwQ0MsWUFBTSxRQUQ4QjtBQUVwQ0csbUJBQWE7QUFDWkMsYUFBSyxxQkFETztBQUVaQyxlQUFPO0FBRkssT0FGdUI7QUFNcENKLGlCQUFXO0FBTnlCLEtBQXJDO0FBU0EsU0FBS0YsR0FBTCxDQUFTLGdDQUFULEVBQTJDLElBQTNDLEVBQWlEO0FBQ2hEQyxZQUFNLFNBRDBDO0FBRWhERyxtQkFBYTtBQUNaQyxhQUFLLHFCQURPO0FBRVpDLGVBQU87QUFGSyxPQUZtQztBQU1oREosaUJBQVc7QUFOcUMsS0FBakQ7QUFTQSxTQUFLRixHQUFMLENBQVMseUJBQVQsRUFBb0MsS0FBcEMsRUFBMkM7QUFDMUNDLFlBQU0sU0FEb0M7QUFFMUNHLG1CQUFhO0FBQ1pDLGFBQUsscUJBRE87QUFFWkMsZUFBTztBQUZLO0FBRjZCLEtBQTNDO0FBUUEsU0FBS04sR0FBTCxDQUFTLHFCQUFULEVBQWdDLEtBQWhDLEVBQXVDO0FBQ3RDQyxZQUFNLFNBRGdDO0FBRXRDRyxtQkFBYSxDQUFDO0FBQ2JDLGFBQUsscUJBRFE7QUFFYkMsZUFBTztBQUZNLE9BQUQsRUFHVjtBQUNGRCxhQUFLLHlCQURIO0FBRUZDLGVBQU87QUFGTCxPQUhVO0FBRnlCLEtBQXZDO0FBV0EsU0FBS04sR0FBTCxDQUFTLDBCQUFULEVBQXFDLEVBQXJDLEVBQXlDO0FBQ3hDQyxZQUFNLFVBRGtDO0FBRXhDRyxtQkFBYSxDQUFDO0FBQ2JDLGFBQUsscUJBRFE7QUFFYkMsZUFBTztBQUZNLE9BQUQsRUFHVjtBQUNGRCxhQUFLLHlCQURIO0FBRUZDLGVBQU87QUFGTCxPQUhVLEVBTVY7QUFDRkQsYUFBSyxxQkFESDtBQUVGQyxlQUFPO0FBRkwsT0FOVTtBQUYyQixLQUF6QztBQWNBLFNBQUtOLEdBQUwsQ0FBUyx5QkFBVCxFQUFvQyxFQUFwQyxFQUF3QztBQUN2Q0MsWUFBTSxRQURpQztBQUV2Q0csbUJBQWE7QUFDWkMsYUFBSyxxQkFETztBQUVaQyxlQUFPO0FBRkssT0FGMEI7QUFNdkNKLGlCQUFXLGNBTjRCO0FBT3ZDSyx1QkFBaUI7QUFQc0IsS0FBeEM7QUFVQSxTQUFLUCxHQUFMLENBQVMsNkJBQVQsRUFBd0MsRUFBeEMsRUFBNEM7QUFDM0NDLFlBQU0sUUFEcUM7QUFFM0NHLG1CQUFhO0FBQ1pDLGFBQUsscUJBRE87QUFFWkMsZUFBTztBQUZLLE9BRjhCO0FBTTNDSixpQkFBVyxrQkFOZ0M7QUFPM0NLLHVCQUFpQjtBQVAwQixLQUE1QztBQVVBLFNBQUtQLEdBQUwsQ0FBUywrQkFBVCxFQUEwQyxJQUExQyxFQUFnRDtBQUMvQ0MsWUFBTSxTQUR5QztBQUUvQ0csbUJBQWE7QUFDWkMsYUFBSyxxQkFETztBQUVaQyxlQUFPO0FBRkssT0FGa0M7QUFNL0NKLGlCQUFXO0FBTm9DLEtBQWhEO0FBUUEsR0F0RkQ7QUF1RkEsQ0F4RkQsRTs7Ozs7Ozs7Ozs7QUNBQSxJQUFJTSxZQUFKO0FBQWlCQyxPQUFPQyxLQUFQLENBQWFDLFFBQVEsbUJBQVIsQ0FBYixFQUEwQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0wsbUJBQWFLLENBQWI7QUFBZTs7QUFBM0IsQ0FBMUMsRUFBdUUsQ0FBdkU7QUFBMEUsSUFBSUMsYUFBSjtBQUFrQkwsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLG9CQUFSLENBQWIsRUFBMkM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNDLG9CQUFjRCxDQUFkO0FBQWdCOztBQUE1QixDQUEzQyxFQUF5RSxDQUF6RTs7QUFLN0c7OztBQUdBLE1BQU1FLFdBQU4sQ0FBa0I7QUFFakJDLGdCQUFjO0FBQ2IsU0FBS3ZCLEtBQUwsR0FBYSxJQUFJZSxZQUFKLENBQWlCLElBQWpCLENBQWI7QUFDQSxTQUFLZCxNQUFMLEdBQWMsSUFBSW9CLGFBQUosQ0FBa0IsSUFBbEIsQ0FBZDtBQUNBLFNBQUtHLFlBQUwsR0FBb0IsSUFBSUMsR0FBSixFQUFwQixDQUhhLENBR2tCOztBQUUvQixTQUFLQyxTQUFMLEdBQWlCLEtBQWpCO0FBQ0EsU0FBS3pCLE1BQUwsQ0FBWTBCLFFBQVosQ0FBcUIsS0FBSzNCLEtBQTFCO0FBQ0EsU0FBS0EsS0FBTCxDQUFXNEIsU0FBWCxDQUFxQixLQUFLM0IsTUFBMUIsRUFQYSxDQVNiOztBQUNBLFNBQUs0QixRQUFMLEdBQWdCLEtBQWhCO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQixFQUFuQjtBQUNBLFNBQUtDLGVBQUwsR0FBdUIsRUFBdkI7QUFDQSxTQUFLQyxrQkFBTCxHQUEwQixJQUExQjtBQUVBLFNBQUtDLGVBQUw7QUFDQTs7QUFFREMsWUFBVTtBQUNULFFBQUksS0FBS1IsU0FBTCxLQUFtQixLQUF2QixFQUE4QjtBQUU3QixXQUFLMUIsS0FBTCxDQUFXa0MsT0FBWCxDQUFtQixLQUFLTCxRQUF4Qjs7QUFDQSxVQUFJekIsV0FBV0MsUUFBWCxDQUFvQjhCLEdBQXBCLENBQXdCLHlCQUF4QixDQUFKLEVBQXdEO0FBQ3ZELGFBQUtsQyxNQUFMLENBQVlpQyxPQUFaO0FBQ0E7O0FBRUQsV0FBS1IsU0FBTCxHQUFpQixJQUFqQjtBQUNBaEMsYUFBT0csVUFBUCxDQUFrQnVDLElBQWxCLENBQXVCLFNBQXZCO0FBQ0E7QUFDRDs7QUFFREMsZUFBYTtBQUNaLFFBQUksS0FBS1gsU0FBTCxLQUFtQixJQUF2QixFQUE2QjtBQUM1QixXQUFLekIsTUFBTCxDQUFZb0MsVUFBWjtBQUNBLFdBQUtyQyxLQUFMLENBQVdxQyxVQUFYO0FBQ0EsV0FBS1gsU0FBTCxHQUFpQixLQUFqQjtBQUNBaEMsYUFBT0csVUFBUCxDQUFrQnVDLElBQWxCLENBQXVCLFVBQXZCO0FBQ0E7QUFDRDs7QUFFREgsb0JBQWtCO0FBQ2pCO0FBQ0E3QixlQUFXQyxRQUFYLENBQW9COEIsR0FBcEIsQ0FBd0Isc0JBQXhCLEVBQWdELENBQUNHLEdBQUQsRUFBTXpCLEtBQU4sS0FBZ0I7QUFDL0QsVUFBSUEsVUFBVSxLQUFLZ0IsUUFBbkIsRUFBNkI7QUFDNUIsYUFBS0EsUUFBTCxHQUFnQmhCLEtBQWhCOztBQUNBLFlBQUksS0FBS2EsU0FBVCxFQUFvQjtBQUNuQixlQUFLVyxVQUFMO0FBQ0EsZUFBS0gsT0FBTDtBQUNBO0FBQ0Q7O0FBRUR4QyxhQUFPSyxLQUFQLENBQWF3QyxLQUFiLENBQW9CLFlBQVlELEdBQUssRUFBckMsRUFBd0N6QixLQUF4QztBQUNBLEtBVkQsRUFGaUIsQ0FjakI7O0FBQ0FULGVBQVdDLFFBQVgsQ0FBb0I4QixHQUFwQixDQUF3Qix5QkFBeEIsRUFBbUQsQ0FBQ0csR0FBRCxFQUFNekIsS0FBTixLQUFnQjtBQUNsRSxXQUFLaUIsV0FBTCxHQUFtQmpCLEtBQW5CO0FBQ0FuQixhQUFPSyxLQUFQLENBQWF3QyxLQUFiLENBQW9CLFlBQVlELEdBQUssRUFBckMsRUFBd0N6QixLQUF4QztBQUNBLEtBSEQsRUFmaUIsQ0FvQmpCOztBQUNBVCxlQUFXQyxRQUFYLENBQW9COEIsR0FBcEIsQ0FBd0IsNkJBQXhCLEVBQXVELENBQUNHLEdBQUQsRUFBTXpCLEtBQU4sS0FBZ0I7QUFDdEUsV0FBS2tCLGVBQUwsR0FBdUJsQixLQUF2QjtBQUNBbkIsYUFBT0ssS0FBUCxDQUFhd0MsS0FBYixDQUFvQixZQUFZRCxHQUFLLEVBQXJDLEVBQXdDekIsS0FBeEM7QUFDQSxLQUhELEVBckJpQixDQTBCakI7O0FBQ0FULGVBQVdDLFFBQVgsQ0FBb0I4QixHQUFwQixDQUF3QiwrQkFBeEIsRUFBeUQsQ0FBQ0csR0FBRCxFQUFNekIsS0FBTixLQUFnQjtBQUN4RSxXQUFLbUIsa0JBQUwsR0FBMEJuQixLQUExQjtBQUNBbkIsYUFBT0ssS0FBUCxDQUFhd0MsS0FBYixDQUFvQixZQUFZRCxHQUFLLEVBQXJDLEVBQXdDekIsS0FBeEM7QUFDQSxLQUhELEVBM0JpQixDQWdDakI7O0FBQ0FULGVBQVdDLFFBQVgsQ0FBb0I4QixHQUFwQixDQUF3QixxQkFBeEIsRUFBK0MsQ0FBQ0csR0FBRCxFQUFNekIsS0FBTixLQUFnQjtBQUM5RCxVQUFJQSxTQUFTLEtBQUtnQixRQUFsQixFQUE0QjtBQUMzQixhQUFLSyxPQUFMO0FBQ0EsT0FGRCxNQUVPO0FBQ04sYUFBS0csVUFBTDtBQUNBOztBQUNEM0MsYUFBT0ssS0FBUCxDQUFhd0MsS0FBYixDQUFvQixZQUFZRCxHQUFLLEVBQXJDLEVBQXdDekIsS0FBeEM7QUFDQSxLQVBEO0FBUUE7O0FBbkZnQjs7QUFzRmxCVCxXQUFXa0IsV0FBWCxHQUF5QixJQUFJQSxXQUFKLEVBQXpCLEM7Ozs7Ozs7Ozs7O0FDOUZBO0FBQ0EsU0FBU2tCLGlCQUFULENBQTJCQyxPQUEzQixFQUFvQ0MsTUFBcEMsRUFBNENDLElBQTVDLEVBQWtEO0FBQ2pELE1BQUlGLFlBQVksb0JBQVosSUFBb0MsQ0FBQ0csTUFBTUMsSUFBTixDQUFXSCxNQUFYLEVBQW1CSSxNQUFuQixDQUF6QyxFQUFxRTtBQUNwRTtBQUNBOztBQUVELFFBQU1DLE9BQU8zQyxXQUFXNEMsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0JDLFdBQXhCLENBQW9DUCxLQUFLUSxHQUF6QyxDQUFiO0FBQ0EsUUFBTUMsVUFBVUwsS0FBS00sSUFBckI7QUFDQSxRQUFNQyxPQUFPcEQsT0FBT3FELEtBQVAsQ0FBYUMsT0FBYixDQUFxQnRELE9BQU91RCxNQUFQLEVBQXJCLENBQWI7QUFFQUMsWUFBVUMsSUFBVixDQUFlaEIsS0FBS1EsR0FBcEIsRUFBeUI7QUFDeEJ2QyxTQUFLZ0QsT0FBT0MsRUFBUCxFQURtQjtBQUV4QlYsU0FBS1IsS0FBS1EsR0FGYztBQUd4QlcsT0FBRztBQUFFQyxnQkFBVTtBQUFaLEtBSHFCO0FBSXhCQyxRQUFJLElBQUlDLElBQUosRUFKb0I7QUFLeEJDLFNBQUtDLFFBQVFDLEVBQVIsQ0FBVyxtQkFBWCxFQUFnQztBQUNwQ0MsbUJBQWEsU0FEdUI7QUFFcENDLGVBQVMsQ0FBQ2hCLEtBQUtTLFFBQU4sRUFBZ0JYLE9BQWhCO0FBRjJCLEtBQWhDLEVBR0ZFLEtBQUtpQixRQUhIO0FBTG1CLEdBQXpCOztBQVdBLE1BQUk7QUFDSG5FLGVBQVdrQixXQUFYLENBQXVCa0QsY0FBdkIsQ0FBc0M3QixLQUFLUSxHQUEzQyxFQUFpRHNCLEtBQUQsSUFBVztBQUMxRCxVQUFJQSxLQUFKLEVBQVc7QUFDVmYsa0JBQVVDLElBQVYsQ0FBZWhCLEtBQUtRLEdBQXBCLEVBQXlCO0FBQ3hCdkMsZUFBS2dELE9BQU9DLEVBQVAsRUFEbUI7QUFFeEJWLGVBQUtSLEtBQUtRLEdBRmM7QUFHeEJXLGFBQUc7QUFBRUMsc0JBQVU7QUFBWixXQUhxQjtBQUl4QkMsY0FBSSxJQUFJQyxJQUFKLEVBSm9CO0FBS3hCQyxlQUFLQyxRQUFRQyxFQUFSLENBQVcsbUJBQVgsRUFBZ0M7QUFDcENDLHlCQUFhLFNBRHVCO0FBRXBDQyxxQkFBUyxDQUFDbEIsT0FBRCxFQUFVcUIsTUFBTUMsT0FBaEI7QUFGMkIsV0FBaEMsRUFHRnBCLEtBQUtpQixRQUhIO0FBTG1CLFNBQXpCO0FBVUEsT0FYRCxNQVdPO0FBQ05iLGtCQUFVQyxJQUFWLENBQWVoQixLQUFLUSxHQUFwQixFQUF5QjtBQUN4QnZDLGVBQUtnRCxPQUFPQyxFQUFQLEVBRG1CO0FBRXhCVixlQUFLUixLQUFLUSxHQUZjO0FBR3hCVyxhQUFHO0FBQUVDLHNCQUFVO0FBQVosV0FIcUI7QUFJeEJDLGNBQUksSUFBSUMsSUFBSixFQUpvQjtBQUt4QkMsZUFBS0MsUUFBUUMsRUFBUixDQUFXLG9CQUFYLEVBQWlDO0FBQ3JDQyx5QkFBYSxTQUR3QjtBQUVyQ0MscUJBQVMsQ0FBQ2xCLE9BQUQ7QUFGNEIsV0FBakMsRUFHRkUsS0FBS2lCLFFBSEg7QUFMbUIsU0FBekI7QUFVQTtBQUNELEtBeEJEO0FBeUJBLEdBMUJELENBMEJFLE9BQU9FLEtBQVAsRUFBYztBQUNmZixjQUFVQyxJQUFWLENBQWVoQixLQUFLUSxHQUFwQixFQUF5QjtBQUN4QnZDLFdBQUtnRCxPQUFPQyxFQUFQLEVBRG1CO0FBRXhCVixXQUFLUixLQUFLUSxHQUZjO0FBR3hCVyxTQUFHO0FBQUVDLGtCQUFVO0FBQVosT0FIcUI7QUFJeEJDLFVBQUksSUFBSUMsSUFBSixFQUpvQjtBQUt4QkMsV0FBS0MsUUFBUUMsRUFBUixDQUFXLG1CQUFYLEVBQWdDO0FBQ3BDQyxxQkFBYSxTQUR1QjtBQUVwQ0MsaUJBQVMsQ0FBQ2xCLE9BQUQsRUFBVXFCLE1BQU1DLE9BQWhCO0FBRjJCLE9BQWhDLEVBR0ZwQixLQUFLaUIsUUFISDtBQUxtQixLQUF6QjtBQVVBLFVBQU1FLEtBQU47QUFDQTs7QUFDRCxTQUFPakMsaUJBQVA7QUFDQTs7QUFFRHBDLFdBQVd1RSxhQUFYLENBQXlCcEUsR0FBekIsQ0FBNkIsb0JBQTdCLEVBQW1EaUMsaUJBQW5ELEU7Ozs7Ozs7Ozs7O0FDL0RBeEIsT0FBTzRELE1BQVAsQ0FBYztBQUFDekQsV0FBUSxNQUFJRTtBQUFiLENBQWQ7O0FBQTJDLElBQUl3RCxDQUFKOztBQUFNN0QsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLFlBQVIsQ0FBYixFQUFtQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ3lELFFBQUV6RCxDQUFGO0FBQUk7O0FBQWhCLENBQW5DLEVBQXFELENBQXJEOztBQUlsQyxNQUFNQyxhQUFOLENBQW9CO0FBQ2xDRSxjQUFZdUQsV0FBWixFQUF5QjtBQUN4QnBGLFdBQU9PLE1BQVAsQ0FBY3NDLEtBQWQsQ0FBb0IsYUFBcEI7QUFDQSxTQUFLdUMsV0FBTCxHQUFtQkEsV0FBbkI7QUFDQSxTQUFLQyxJQUFMLEdBQVlDLElBQUk5RCxPQUFKLENBQVksTUFBWixDQUFaO0FBRUEsU0FBSytELFFBQUwsR0FBZ0IsRUFBaEI7QUFDQSxTQUFLakYsS0FBTCxHQUFhLEVBQWI7QUFDQTs7QUFFRGtDLFlBQVU7QUFDVCxTQUFLZ0QsaUJBQUw7QUFDQTs7QUFFRDdDLGVBQWE7QUFDWixTQUFLOEMsbUJBQUw7QUFDQTs7QUFFRHhELFdBQVMzQixLQUFULEVBQWdCO0FBQ2YsU0FBS0EsS0FBTCxHQUFhQSxLQUFiO0FBQ0E7O0FBRURrRixzQkFBb0I7QUFDbkJ4RixXQUFPTyxNQUFQLENBQWNzQyxLQUFkLENBQW9CLHFCQUFwQjtBQUNBbkMsZUFBV2dGLFNBQVgsQ0FBcUI3RSxHQUFyQixDQUF5QixrQkFBekIsRUFBNkMsS0FBSzhFLFNBQUwsQ0FBZUMsSUFBZixDQUFvQixJQUFwQixDQUE3QyxFQUF3RWxGLFdBQVdnRixTQUFYLENBQXFCRyxRQUFyQixDQUE4QkMsR0FBdEcsRUFBMkcsaUJBQTNHO0FBQ0FwRixlQUFXZ0YsU0FBWCxDQUFxQjdFLEdBQXJCLENBQXlCLG9CQUF6QixFQUErQyxLQUFLa0YsZUFBTCxDQUFxQkgsSUFBckIsQ0FBMEIsSUFBMUIsQ0FBL0MsRUFBZ0ZsRixXQUFXZ0YsU0FBWCxDQUFxQkcsUUFBckIsQ0FBOEJDLEdBQTlHLEVBQW1ILG9CQUFuSDtBQUNBcEYsZUFBV2dGLFNBQVgsQ0FBcUI3RSxHQUFyQixDQUF5QixhQUF6QixFQUF3QyxLQUFLbUYsYUFBTCxDQUFtQkosSUFBbkIsQ0FBd0IsSUFBeEIsQ0FBeEMsRUFBdUVsRixXQUFXZ0YsU0FBWCxDQUFxQkcsUUFBckIsQ0FBOEJDLEdBQXJHLEVBQTBHLHlCQUExRztBQUNBcEYsZUFBV2dGLFNBQVgsQ0FBcUI3RSxHQUFyQixDQUF5QixlQUF6QixFQUEwQyxLQUFLb0YsZUFBTCxDQUFxQkwsSUFBckIsQ0FBMEIsSUFBMUIsQ0FBMUMsRUFBMkVsRixXQUFXZ0YsU0FBWCxDQUFxQkcsUUFBckIsQ0FBOEJDLEdBQXpHLEVBQThHLDJCQUE5RztBQUNBOztBQUVETCx3QkFBc0I7QUFDckJ6RixXQUFPTyxNQUFQLENBQWNzQyxLQUFkLENBQW9CLHVCQUFwQjtBQUNBbkMsZUFBV2dGLFNBQVgsQ0FBcUJRLE1BQXJCLENBQTRCLGtCQUE1QixFQUFnRCxpQkFBaEQ7QUFDQXhGLGVBQVdnRixTQUFYLENBQXFCUSxNQUFyQixDQUE0QixvQkFBNUIsRUFBa0Qsb0JBQWxEO0FBQ0F4RixlQUFXZ0YsU0FBWCxDQUFxQlEsTUFBckIsQ0FBNEIsYUFBNUIsRUFBMkMseUJBQTNDO0FBQ0F4RixlQUFXZ0YsU0FBWCxDQUFxQlEsTUFBckIsQ0FBNEIsZUFBNUIsRUFBNkMsMkJBQTdDO0FBQ0E7O0FBRURILGtCQUFnQkksb0JBQWhCLEVBQXNDO0FBQ3JDLFFBQUk7QUFDSCxVQUFJLENBQUUsS0FBSzdGLEtBQUwsQ0FBVzhGLGVBQVgsQ0FBMkJELHFCQUFxQjFDLEdBQWhELENBQU4sRUFBNEQ7QUFDM0Q7QUFDQTtBQUNBOztBQUNEekQsYUFBT08sTUFBUCxDQUFjc0MsS0FBZCxDQUFvQix1QkFBcEIsRUFBNkNzRCxvQkFBN0M7QUFFQSxXQUFLN0YsS0FBTCxDQUFXK0YsaUJBQVgsQ0FBNkJGLG9CQUE3QjtBQUNBLEtBUkQsQ0FRRSxPQUFPRyxHQUFQLEVBQVk7QUFDYnRHLGFBQU9PLE1BQVAsQ0FBY3dFLEtBQWQsQ0FBb0IsaUNBQXBCLEVBQXVEdUIsR0FBdkQ7QUFDQTtBQUNEOztBQUVETixnQkFBY08sV0FBZCxFQUEyQkMsUUFBM0IsRUFBcUM7QUFDcEMsUUFBSTtBQUNILFVBQUksQ0FBQyxLQUFLcEIsV0FBTCxDQUFpQjlDLGtCQUF0QixFQUEwQztBQUN6QztBQUNBOztBQUNEdEMsYUFBT08sTUFBUCxDQUFjc0MsS0FBZCxDQUFvQixxQkFBcEI7O0FBRUEsVUFBSTBELGVBQWVDLFFBQW5CLEVBQTZCO0FBQzVCLFlBQUksS0FBS3BCLFdBQUwsQ0FBaUJ0RCxZQUFqQixDQUE4QjJFLE1BQTlCLENBQXNDLE1BQU1GLFdBQWEsR0FBR0MsUUFBVSxFQUF0RSxDQUFKLEVBQThFO0FBQzdFO0FBQ0E7QUFDQTs7QUFDRCxjQUFNRSxZQUFZaEcsV0FBVzRDLE1BQVgsQ0FBa0JxRCxRQUFsQixDQUEyQm5ELFdBQTNCLENBQXVDK0MsV0FBdkMsQ0FBbEI7O0FBQ0EsWUFBSUcsU0FBSixFQUFlO0FBQ2QsZ0JBQU1FLGVBQWUsS0FBS3RHLEtBQUwsQ0FBVzhGLGVBQVgsQ0FBMkJNLFVBQVVqRCxHQUFyQyxDQUFyQjs7QUFDQSxjQUFJLFFBQVFtRCxZQUFaLEVBQTBCO0FBQ3pCLGtCQUFNQyxVQUFVLEtBQUt2RyxLQUFMLENBQVd3RyxZQUFYLENBQXdCSixTQUF4QixDQUFoQjtBQUNBLGlCQUFLcEcsS0FBTCxDQUFXeUcsaUJBQVgsQ0FBNkJQLFNBQVNRLE9BQVQsQ0FBaUIsSUFBakIsRUFBdUIsRUFBdkIsQ0FBN0IsRUFBeURKLGFBQWF6QyxFQUF0RSxFQUEwRTBDLE9BQTFFO0FBQ0E7QUFDRDtBQUNEO0FBQ0QsS0FwQkQsQ0FvQkUsT0FBT1AsR0FBUCxFQUFZO0FBQ2J0RyxhQUFPTyxNQUFQLENBQWN3RSxLQUFkLENBQW9CLCtCQUFwQixFQUFxRHVCLEdBQXJEO0FBQ0E7QUFDRDs7QUFFREwsa0JBQWdCTSxXQUFoQixFQUE2QkMsUUFBN0IsRUFBdUM7QUFDdEMsUUFBSTtBQUNILFVBQUksQ0FBQyxLQUFLcEIsV0FBTCxDQUFpQjlDLGtCQUF0QixFQUEwQztBQUN6QztBQUNBOztBQUNEdEMsYUFBT08sTUFBUCxDQUFjc0MsS0FBZCxDQUFvQix1QkFBcEI7O0FBRUEsVUFBSTBELGVBQWVDLFFBQW5CLEVBQTZCO0FBQzVCLFlBQUksS0FBS3BCLFdBQUwsQ0FBaUJ0RCxZQUFqQixDQUE4QjJFLE1BQTlCLENBQXNDLFFBQVFGLFdBQWEsR0FBR0MsUUFBVSxFQUF4RSxDQUFKLEVBQWdGO0FBQy9FO0FBQ0E7QUFDQTs7QUFFRCxjQUFNRSxZQUFZaEcsV0FBVzRDLE1BQVgsQ0FBa0JxRCxRQUFsQixDQUEyQm5ELFdBQTNCLENBQXVDK0MsV0FBdkMsQ0FBbEI7O0FBQ0EsWUFBSUcsU0FBSixFQUFlO0FBQ2QsZ0JBQU1FLGVBQWUsS0FBS3RHLEtBQUwsQ0FBVzhGLGVBQVgsQ0FBMkJNLFVBQVVqRCxHQUFyQyxDQUFyQjs7QUFDQSxjQUFJLFFBQVFtRCxZQUFaLEVBQTBCO0FBQ3pCLGtCQUFNQyxVQUFVLEtBQUt2RyxLQUFMLENBQVd3RyxZQUFYLENBQXdCSixTQUF4QixDQUFoQjtBQUNBLGlCQUFLcEcsS0FBTCxDQUFXMkcsa0JBQVgsQ0FBOEJULFNBQVNRLE9BQVQsQ0FBaUIsSUFBakIsRUFBdUIsRUFBdkIsQ0FBOUIsRUFBMERKLGFBQWF6QyxFQUF2RSxFQUEyRTBDLE9BQTNFO0FBQ0E7QUFDRDtBQUNEO0FBQ0QsS0FyQkQsQ0FxQkUsT0FBT1AsR0FBUCxFQUFZO0FBQ2J0RyxhQUFPTyxNQUFQLENBQWN3RSxLQUFkLENBQW9CLGlDQUFwQixFQUF1RHVCLEdBQXZEO0FBQ0E7QUFDRDs7QUFFRFgsWUFBVXVCLGFBQVYsRUFBeUI7QUFDeEIsUUFBSTtBQUNILFVBQUksQ0FBRSxLQUFLNUcsS0FBTCxDQUFXOEYsZUFBWCxDQUEyQmMsY0FBY3pELEdBQXpDLENBQU4sRUFBcUQ7QUFDcEQ7QUFDQTtBQUNBOztBQUNEekQsYUFBT08sTUFBUCxDQUFjc0MsS0FBZCxDQUFvQixpQkFBcEIsRUFBdUNxRSxhQUF2Qzs7QUFFQSxVQUFJQSxjQUFjQyxRQUFsQixFQUE0QjtBQUMzQjtBQUNBLGFBQUtDLHFCQUFMLENBQTJCRixhQUEzQjtBQUNBLGVBQU9BLGFBQVA7QUFDQSxPQVhFLENBWUg7OztBQUNBLFVBQUlBLGNBQWNoRyxHQUFkLENBQWtCbUcsT0FBbEIsQ0FBMEIsUUFBMUIsTUFBd0MsQ0FBNUMsRUFBK0M7QUFDOUMsZUFBT0gsYUFBUDtBQUNBOztBQUVELFVBQUlBLGNBQWNJLElBQWxCLEVBQXdCO0FBQ3ZCLGVBQU8sS0FBS0MsZ0JBQUwsQ0FBc0JMLGFBQXRCLENBQVA7QUFDQSxPQW5CRSxDQXFCSDs7O0FBQ0EsV0FBS00sa0JBQUwsQ0FBd0JOLGFBQXhCO0FBQ0EsS0F2QkQsQ0F1QkUsT0FBT1osR0FBUCxFQUFZO0FBQ2J0RyxhQUFPTyxNQUFQLENBQWN3RSxLQUFkLENBQW9CLDJCQUFwQixFQUFpRHVCLEdBQWpEO0FBQ0E7O0FBRUQsV0FBT1ksYUFBUDtBQUNBOztBQUVETSxxQkFBbUJOLGFBQW5CLEVBQWtDO0FBQ2pDO0FBRUEsUUFBSXhHLFdBQVdDLFFBQVgsQ0FBb0I4QixHQUFwQixDQUF3QixxQkFBeEIsTUFBbUQsSUFBdkQsRUFBNkQ7QUFDNUQsV0FBS25DLEtBQUwsQ0FBV21ILFdBQVgsQ0FBdUIsS0FBS25ILEtBQUwsQ0FBVzhGLGVBQVgsQ0FBMkJjLGNBQWN6RCxHQUF6QyxDQUF2QixFQUFzRXlELGFBQXRFO0FBQ0EsS0FGRCxNQUVPO0FBQ047QUFDQSxZQUFNUSxtQkFBbUJ2QyxFQUFFd0MsS0FBRixDQUFRakgsV0FBV0MsUUFBWCxDQUFvQjhCLEdBQXBCLENBQXdCLDBCQUF4QixDQUFSLEVBQTZELEtBQTdELEtBQXVFLEVBQWhHLENBRk0sQ0FHTjs7QUFDQSxVQUFJaUYsaUJBQWlCTCxPQUFqQixDQUF5QkgsY0FBY3pELEdBQXZDLE1BQWdELENBQUMsQ0FBckQsRUFBd0Q7QUFDdkQsYUFBS25ELEtBQUwsQ0FBV21ILFdBQVgsQ0FBdUIsS0FBS25ILEtBQUwsQ0FBVzhGLGVBQVgsQ0FBMkJjLGNBQWN6RCxHQUF6QyxDQUF2QixFQUFzRXlELGFBQXRFO0FBQ0E7QUFDRDtBQUNEOztBQUVEVSx1QkFBcUJWLGFBQXJCLEVBQW9DO0FBQ25DLFFBQUksQ0FBQ0EsY0FBY0ksSUFBbkIsRUFBeUI7QUFDeEI7QUFDQTs7QUFFRCxRQUFJLENBQUNKLGNBQWNXLFdBQWYsSUFBOEIsQ0FBQ1gsY0FBY1csV0FBZCxDQUEwQkMsTUFBN0QsRUFBcUU7QUFDcEU7QUFDQTs7QUFFRCxVQUFNQyxTQUFTYixjQUFjSSxJQUFkLENBQW1CcEcsR0FBbEM7QUFDQSxXQUFPZ0csY0FBY1csV0FBZCxDQUEwQkcsSUFBMUIsQ0FBZ0NDLFVBQUQsSUFBZ0JBLFdBQVdDLFVBQVgsSUFBeUJELFdBQVdDLFVBQVgsQ0FBc0JiLE9BQXRCLENBQStCLElBQUlVLE1BQVEsR0FBM0MsS0FBa0QsQ0FBMUgsQ0FBUDtBQUNBOztBQUVESSxxQkFBbUJqQixhQUFuQixFQUFrQztBQUNqQyxVQUFNZSxhQUFhLEtBQUtMLG9CQUFMLENBQTBCVixhQUExQixDQUFuQjs7QUFFQSxRQUFJZSxVQUFKLEVBQWdCO0FBQ2YsYUFBT0EsV0FBV0MsVUFBbEI7QUFDQTtBQUNEOztBQUVEWCxtQkFBaUJMLGFBQWpCLEVBQWdDO0FBQy9CLFFBQUksQ0FBRXhHLFdBQVdDLFFBQVgsQ0FBb0I4QixHQUFwQixDQUF3QixnQ0FBeEIsQ0FBTixFQUFpRTtBQUNoRTtBQUNBOztBQUVELFFBQUl5RSxjQUFjSSxJQUFkLENBQW1CM0QsSUFBdkIsRUFBNkI7QUFDNUIsVUFBSXlFLFlBQVlsQixjQUFjSSxJQUFkLENBQW1CM0QsSUFBbkM7QUFDQSxVQUFJMEUsT0FBT25CLGNBQWMxQyxHQUF6QjtBQUVBLFlBQU15RCxhQUFhLEtBQUtMLG9CQUFMLENBQTBCVixhQUExQixDQUFuQjs7QUFDQSxVQUFJZSxVQUFKLEVBQWdCO0FBQ2ZHLG9CQUFZNUgsT0FBTzhILFdBQVAsQ0FBbUJMLFdBQVdDLFVBQTlCLENBQVo7O0FBQ0EsWUFBSSxDQUFDRyxJQUFMLEVBQVc7QUFDVkEsaUJBQU9KLFdBQVdNLFdBQWxCO0FBQ0E7QUFDRDs7QUFFRCxZQUFNdkQsVUFBVyxHQUFHcUQsSUFBTSxJQUFJRCxTQUFXLEVBQXpDO0FBRUFsQixvQkFBYzFDLEdBQWQsR0FBb0JRLE9BQXBCO0FBQ0EsV0FBSzFFLEtBQUwsQ0FBV21ILFdBQVgsQ0FBdUIsS0FBS25ILEtBQUwsQ0FBVzhGLGVBQVgsQ0FBMkJjLGNBQWN6RCxHQUF6QyxDQUF2QixFQUFzRXlELGFBQXRFO0FBQ0E7QUFDRDs7QUFFREUsd0JBQXNCRixhQUF0QixFQUFxQztBQUNwQyxRQUFJQSxhQUFKLEVBQW1CO0FBQ2xCLFVBQUlBLGNBQWNzQixjQUFsQixFQUFrQztBQUNqQztBQUNBLGVBQU90QixjQUFjc0IsY0FBckI7QUFDQTtBQUNBLE9BTGlCLENBT2xCOzs7QUFDQSxZQUFNNUIsZUFBZSxLQUFLdEcsS0FBTCxDQUFXOEYsZUFBWCxDQUEyQmMsY0FBY3pELEdBQXpDLENBQXJCO0FBQ0EsV0FBS25ELEtBQUwsQ0FBV21JLGlCQUFYLENBQTZCN0IsWUFBN0IsRUFBMkNNLGFBQTNDO0FBQ0E7QUFDRDs7QUFFRHdCLGFBQVdDLFlBQVgsRUFBeUI7QUFDeEIsV0FBT0EsYUFBYWpGLE9BQWIsR0FBdUIsS0FBS2tGLFdBQUwsQ0FBaUJELGFBQWFqRixPQUE5QixLQUEwQyxLQUFLbUYsVUFBTCxDQUFnQkYsYUFBYWpGLE9BQTdCLENBQWpFLEdBQXlHLElBQWhIO0FBQ0E7O0FBRURvRixVQUFRQyxTQUFSLEVBQW1CO0FBQ2xCLFdBQU9BLFlBQVksS0FBS0MsUUFBTCxDQUFjRCxTQUFkLEtBQTRCLEtBQUtFLE9BQUwsQ0FBYUYsU0FBYixDQUF4QyxHQUFrRSxJQUF6RTtBQUNBOztBQUVERyxpQkFBZXRDLFlBQWYsRUFBNkJ0QyxFQUE3QixFQUFpQztBQUNoQyxXQUFRLFNBQVNzQyxZQUFjLElBQUl0QyxHQUFHMEMsT0FBSCxDQUFXLEtBQVgsRUFBa0IsR0FBbEIsQ0FBd0IsRUFBM0Q7QUFDQTs7QUFFRDRCLGNBQVlPLGNBQVosRUFBNEI7QUFDM0IsV0FBT3pJLFdBQVc0QyxNQUFYLENBQWtCQyxLQUFsQixDQUF3QjZGLGlCQUF4QixDQUEwQ0QsY0FBMUMsQ0FBUDtBQUNBOztBQUVETixhQUFXUSxjQUFYLEVBQTJCQyxhQUFhLEtBQXhDLEVBQStDO0FBQzlDdEosV0FBT08sTUFBUCxDQUFjc0MsS0FBZCxDQUFvQix1Q0FBcEIsRUFBNkR3RyxjQUE3RDtBQUNBLFFBQUlFLGVBQWUsSUFBbkI7QUFDQSxRQUFJQyxVQUFVLEtBQWQ7O0FBQ0EsUUFBSUgsZUFBZUksTUFBZixDQUFzQixDQUF0QixNQUE2QixHQUFqQyxFQUFzQztBQUNyQ0YscUJBQWVHLEtBQUtqSCxHQUFMLENBQVMscUNBQVQsRUFBZ0Q7QUFBRU8sZ0JBQVE7QUFBRTJHLGlCQUFPLEtBQUt2RSxXQUFMLENBQWlCakQsUUFBMUI7QUFBb0N1QixtQkFBUzJGO0FBQTdDO0FBQVYsT0FBaEQsQ0FBZjtBQUNBLEtBRkQsTUFFTyxJQUFJQSxlQUFlSSxNQUFmLENBQXNCLENBQXRCLE1BQTZCLEdBQWpDLEVBQXNDO0FBQzVDRixxQkFBZUcsS0FBS2pILEdBQUwsQ0FBUyxtQ0FBVCxFQUE4QztBQUFFTyxnQkFBUTtBQUFFMkcsaUJBQU8sS0FBS3ZFLFdBQUwsQ0FBaUJqRCxRQUExQjtBQUFvQ3VCLG1CQUFTMkY7QUFBN0M7QUFBVixPQUE5QyxDQUFmO0FBQ0FHLGdCQUFVLElBQVY7QUFDQTs7QUFDRCxRQUFJRCxnQkFBZ0JBLGFBQWFLLElBQTdCLElBQXFDTCxhQUFhSyxJQUFiLENBQWtCQyxFQUFsQixLQUF5QixJQUFsRSxFQUF3RTtBQUN2RSxZQUFNQyxvQkFBb0JOLFVBQVVELGFBQWFLLElBQWIsQ0FBa0JHLEtBQTVCLEdBQW9DUixhQUFhSyxJQUFiLENBQWtCbEcsT0FBaEY7QUFDQSxZQUFNc0cscUJBQXFCdEosV0FBVzRDLE1BQVgsQ0FBa0JDLEtBQWxCLENBQXdCMEcsYUFBeEIsQ0FBc0NILGtCQUFrQm5HLElBQXhELENBQTNCLENBRnVFLENBSXZFOztBQUNBLFVBQUlxRyxzQkFBc0JGLGtCQUFrQkksVUFBNUMsRUFBd0Q7QUFDdkRKLDBCQUFrQkssUUFBbEIsR0FBNkJMLGtCQUFrQkksVUFBbEIsR0FBK0IsU0FBL0IsR0FBMkNGLG1CQUFtQjlJLEdBQTNGO0FBQ0FSLG1CQUFXNEMsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0I2RyxZQUF4QixDQUFxQ04sa0JBQWtCSyxRQUF2RCxFQUFpRUwsa0JBQWtCM0YsRUFBbkY7QUFDQSxPQUhELE1BR087QUFDTixjQUFNa0csY0FBYyxFQUFwQjs7QUFDQSxhQUFLLE1BQU1DLE1BQVgsSUFBcUJSLGtCQUFrQlMsT0FBdkMsRUFBZ0Q7QUFDL0MsY0FBSUQsV0FBV1Isa0JBQWtCVSxPQUFqQyxFQUEwQztBQUN6QyxrQkFBTUMsYUFBYSxLQUFLekIsUUFBTCxDQUFjc0IsTUFBZCxLQUF5QixLQUFLckIsT0FBTCxDQUFhcUIsTUFBYixDQUE1Qzs7QUFDQSxnQkFBSUcsY0FBY0EsV0FBV3BHLFFBQTdCLEVBQXVDO0FBQ3RDZ0csMEJBQVlLLElBQVosQ0FBaUJELFdBQVdwRyxRQUE1QjtBQUNBO0FBQ0Q7QUFDRDs7QUFDRCxjQUFNc0csb0JBQW9CYixrQkFBa0JVLE9BQWxCLEdBQTRCLEtBQUt4QixRQUFMLENBQWNjLGtCQUFrQlUsT0FBaEMsS0FBNEMsS0FBS3ZCLE9BQUwsQ0FBYWEsa0JBQWtCVSxPQUEvQixDQUF4RSxHQUFrSCxJQUE1STs7QUFDQSxZQUFJLENBQUNHLGlCQUFMLEVBQXdCO0FBQ3ZCM0ssaUJBQU9PLE1BQVAsQ0FBY3dFLEtBQWQsQ0FBb0IsMENBQXBCLEVBQWdFK0Usa0JBQWtCVSxPQUFsRjtBQUNBO0FBQ0E7O0FBRUQsWUFBSTtBQUNILGdCQUFNSSxnQkFBZ0JsSyxXQUFXbUssVUFBWCxDQUFzQnJCLFVBQVUsR0FBVixHQUFnQixHQUF0QyxFQUEyQ00sa0JBQWtCbkcsSUFBN0QsRUFBbUVnSCxrQkFBa0J0RyxRQUFyRixFQUErRmdHLFdBQS9GLENBQXRCO0FBQ0FQLDRCQUFrQkssUUFBbEIsR0FBNkJTLGNBQWNuSCxHQUEzQztBQUNBLFNBSEQsQ0FHRSxPQUFPcUgsQ0FBUCxFQUFVO0FBQ1gsY0FBSSxDQUFDeEIsVUFBTCxFQUFpQjtBQUNoQnRKLG1CQUFPTyxNQUFQLENBQWNzQyxLQUFkLENBQW9CLG9EQUFwQixFQUEwRWlJLEVBQUU5RixPQUE1RSxFQURnQixDQUVoQjs7QUFDQXhFLG1CQUFPdUssV0FBUCxDQUFtQixJQUFuQjs7QUFDQSxtQkFBTyxLQUFLbkMsV0FBTCxDQUFpQlMsY0FBakIsS0FBb0MsS0FBS1IsVUFBTCxDQUFnQlEsY0FBaEIsRUFBZ0MsSUFBaEMsQ0FBM0M7QUFDQSxXQUxELE1BS087QUFDTjJCLG9CQUFRQyxHQUFSLENBQVlILEVBQUU5RixPQUFkO0FBQ0E7QUFDRDs7QUFFRCxjQUFNa0csYUFBYTtBQUNsQjVHLGNBQUksSUFBSUMsSUFBSixDQUFTdUYsa0JBQWtCcUIsT0FBbEIsR0FBNEIsSUFBckM7QUFEYyxTQUFuQjtBQUdBLFlBQUlDLGVBQWUsQ0FBbkI7O0FBQ0EsWUFBSSxDQUFDakcsRUFBRWtHLE9BQUYsQ0FBVXZCLGtCQUFrQndCLEtBQWxCLElBQTJCeEIsa0JBQWtCd0IsS0FBbEIsQ0FBd0JuSyxLQUE3RCxDQUFMLEVBQTBFO0FBQ3pFK0oscUJBQVdJLEtBQVgsR0FBbUJ4QixrQkFBa0J3QixLQUFsQixDQUF3Qm5LLEtBQTNDO0FBQ0FpSyx5QkFBZXRCLGtCQUFrQndCLEtBQWxCLENBQXdCQyxRQUF2QztBQUNBOztBQUNELFlBQUksQ0FBQ3BHLEVBQUVrRyxPQUFGLENBQVV2QixrQkFBa0IwQixPQUFsQixJQUE2QjFCLGtCQUFrQjBCLE9BQWxCLENBQTBCckssS0FBakUsQ0FBRCxJQUE0RTJJLGtCQUFrQjBCLE9BQWxCLENBQTBCRCxRQUExQixHQUFxQ0gsWUFBckgsRUFBbUk7QUFDbElGLHFCQUFXSSxLQUFYLEdBQW1CeEIsa0JBQWtCMEIsT0FBbEIsQ0FBMEJySyxLQUE3QztBQUNBOztBQUNEVCxtQkFBVzRDLE1BQVgsQ0FBa0JDLEtBQWxCLENBQXdCNkcsWUFBeEIsQ0FBcUNOLGtCQUFrQkssUUFBdkQsRUFBaUVMLGtCQUFrQjNGLEVBQW5GO0FBQ0EsYUFBSzdELEtBQUwsQ0FBV21MLGVBQVgsQ0FBMkIzQixrQkFBa0JLLFFBQTdDLEVBQXVEZCxjQUF2RDtBQUNBOztBQUNELGFBQU8zSSxXQUFXNEMsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0JDLFdBQXhCLENBQW9Dc0csa0JBQWtCSyxRQUF0RCxDQUFQO0FBQ0E7O0FBQ0RuSyxXQUFPTyxNQUFQLENBQWNzQyxLQUFkLENBQW9CLG1CQUFwQjtBQUNBO0FBQ0E7O0FBRURtRyxXQUFTMEMsV0FBVCxFQUFzQjtBQUNyQixVQUFNakIsYUFBYS9KLFdBQVc0QyxNQUFYLENBQWtCcUksS0FBbEIsQ0FBd0J2QyxpQkFBeEIsQ0FBMENzQyxXQUExQyxDQUFuQjs7QUFDQSxRQUFJakIsY0FBYyxDQUFDLEtBQUtsRixRQUFMLENBQWNtRyxXQUFkLENBQW5CLEVBQStDO0FBQzlDLFdBQUtuRyxRQUFMLENBQWNtRyxXQUFkLElBQTZCO0FBQUVwTCxlQUFRLEtBQUtvTCxXQUFhLEdBQTVCO0FBQWdDbkwsZ0JBQVMsSUFBSWtLLFdBQVdwRyxRQUFVO0FBQWxFLE9BQTdCO0FBQ0E7O0FBQ0QsV0FBT29HLFVBQVA7QUFDQTs7QUFFRHhCLFVBQVF5QyxXQUFSLEVBQXFCO0FBQ3BCMUwsV0FBT08sTUFBUCxDQUFjc0MsS0FBZCxDQUFvQixvQ0FBcEIsRUFBMEQ2SSxXQUExRDtBQUNBLFVBQU1uQyxlQUFlRyxLQUFLakgsR0FBTCxDQUFTLGtDQUFULEVBQTZDO0FBQUVPLGNBQVE7QUFBRTJHLGVBQU8sS0FBS3ZFLFdBQUwsQ0FBaUJqRCxRQUExQjtBQUFvQ3lCLGNBQU04SDtBQUExQztBQUFWLEtBQTdDLENBQXJCOztBQUNBLFFBQUluQyxnQkFBZ0JBLGFBQWFLLElBQTdCLElBQXFDTCxhQUFhSyxJQUFiLENBQWtCQyxFQUFsQixLQUF5QixJQUE5RCxJQUFzRU4sYUFBYUssSUFBYixDQUFrQmhHLElBQTVGLEVBQWtHO0FBQ2pHLFlBQU1nSSxpQkFBaUJyQyxhQUFhSyxJQUFiLENBQWtCaEcsSUFBekM7QUFDQSxZQUFNaUksUUFBUUQsZUFBZUUsTUFBZixLQUEwQixJQUF4QztBQUNBLFlBQU1DLFFBQVNILGVBQWVJLE9BQWYsSUFBMEJKLGVBQWVJLE9BQWYsQ0FBdUJELEtBQWxELElBQTRELEVBQTFFO0FBQ0EsVUFBSUUsa0JBQUo7O0FBQ0EsVUFBSSxDQUFDSixLQUFMLEVBQVk7QUFDWEksNkJBQXFCdkwsV0FBVzRDLE1BQVgsQ0FBa0JxSSxLQUFsQixDQUF3Qk8scUJBQXhCLENBQThDSCxLQUE5QyxLQUF3RHJMLFdBQVc0QyxNQUFYLENBQWtCcUksS0FBbEIsQ0FBd0JRLGlCQUF4QixDQUEwQ1AsZUFBZWpJLElBQXpELENBQTdFO0FBQ0EsT0FGRCxNQUVPO0FBQ05zSSw2QkFBcUJ2TCxXQUFXNEMsTUFBWCxDQUFrQnFJLEtBQWxCLENBQXdCUSxpQkFBeEIsQ0FBMENQLGVBQWVqSSxJQUF6RCxDQUFyQjtBQUNBOztBQUVELFVBQUlzSSxrQkFBSixFQUF3QjtBQUN2QkwsdUJBQWV6QixRQUFmLEdBQTBCOEIsbUJBQW1CL0ssR0FBN0M7QUFDQTBLLHVCQUFlakksSUFBZixHQUFzQnNJLG1CQUFtQjVILFFBQXpDO0FBQ0EsT0FIRCxNQUdPO0FBQ04sY0FBTStILFVBQVU7QUFDZkMsb0JBQVVuSSxPQUFPQyxFQUFQLEVBREs7QUFFZkUsb0JBQVV1SCxlQUFlakk7QUFGVixTQUFoQjs7QUFLQSxZQUFJLENBQUNrSSxLQUFELElBQVVFLEtBQWQsRUFBcUI7QUFDcEJLLGtCQUFRTCxLQUFSLEdBQWdCQSxLQUFoQjtBQUNBOztBQUVELFlBQUlGLEtBQUosRUFBVztBQUNWTyxrQkFBUUUsbUJBQVIsR0FBOEIsS0FBOUI7QUFDQTs7QUFFRFYsdUJBQWV6QixRQUFmLEdBQTBCb0MsU0FBU0MsVUFBVCxDQUFvQkosT0FBcEIsQ0FBMUI7QUFDQSxjQUFNSyxhQUFhO0FBQ2xCQyxxQkFBV2QsZUFBZWUsU0FBZixHQUEyQixJQURwQjtBQUMwQjtBQUM1Q0MsaUJBQU9mLFFBQVEsQ0FBQyxLQUFELENBQVIsR0FBa0IsQ0FBQyxNQUFEO0FBRlAsU0FBbkI7O0FBS0EsWUFBSUQsZUFBZUksT0FBZixJQUEwQkosZUFBZUksT0FBZixDQUF1QmEsU0FBckQsRUFBZ0U7QUFDL0RKLHFCQUFXOUksSUFBWCxHQUFrQmlJLGVBQWVJLE9BQWYsQ0FBdUJhLFNBQXpDO0FBQ0E7O0FBRUQsWUFBSWpCLGVBQWVrQixPQUFuQixFQUE0QjtBQUMzQkwscUJBQVdNLE1BQVgsR0FBb0IsS0FBcEI7QUFDQU4scUJBQVcsNkJBQVgsSUFBNEMsRUFBNUM7QUFDQTs7QUFFRC9MLG1CQUFXNEMsTUFBWCxDQUFrQnFJLEtBQWxCLENBQXdCcUIsTUFBeEIsQ0FBK0I7QUFBRTlMLGVBQUswSyxlQUFlekI7QUFBdEIsU0FBL0IsRUFBaUU7QUFBRThDLGdCQUFNUjtBQUFSLFNBQWpFO0FBRUEsY0FBTTdJLE9BQU9sRCxXQUFXNEMsTUFBWCxDQUFrQnFJLEtBQWxCLENBQXdCbkksV0FBeEIsQ0FBb0NvSSxlQUFlekIsUUFBbkQsQ0FBYjtBQUVBLFlBQUkrQyxNQUFNLElBQVY7O0FBQ0EsWUFBSXRCLGVBQWVJLE9BQW5CLEVBQTRCO0FBQzNCLGNBQUlKLGVBQWVJLE9BQWYsQ0FBdUJtQixjQUEzQixFQUEyQztBQUMxQ0Qsa0JBQU10QixlQUFlSSxPQUFmLENBQXVCbUIsY0FBN0I7QUFDQSxXQUZELE1BRU8sSUFBSXZCLGVBQWVJLE9BQWYsQ0FBdUJvQixTQUEzQixFQUFzQztBQUM1Q0Ysa0JBQU10QixlQUFlSSxPQUFmLENBQXVCb0IsU0FBN0I7QUFDQTtBQUNEOztBQUNELFlBQUlGLEdBQUosRUFBUztBQUNSLGNBQUk7QUFDSHhNLHVCQUFXMk0sYUFBWCxDQUF5QnpKLElBQXpCLEVBQStCc0osR0FBL0IsRUFBb0MsSUFBcEMsRUFBMEMsS0FBMUM7QUFDQSxXQUZELENBRUUsT0FBT25JLEtBQVAsRUFBYztBQUNmL0UsbUJBQU9PLE1BQVAsQ0FBY3NDLEtBQWQsQ0FBb0IsMkJBQXBCLEVBQWlEa0MsTUFBTUMsT0FBdkQ7QUFDQTtBQUNEO0FBQ0Q7O0FBRUQsWUFBTXNJLFlBQVksQ0FBQzFCLGVBQWV6SCxFQUFoQixDQUFsQjs7QUFDQSxVQUFJMEgsU0FBU0QsZUFBZUksT0FBeEIsSUFBbUNKLGVBQWVJLE9BQWYsQ0FBdUJ1QixNQUE5RCxFQUFzRTtBQUNyRUQsa0JBQVU1QyxJQUFWLENBQWVrQixlQUFlSSxPQUFmLENBQXVCdUIsTUFBdEM7QUFDQTs7QUFDRDdNLGlCQUFXNEMsTUFBWCxDQUFrQnFJLEtBQWxCLENBQXdCdkIsWUFBeEIsQ0FBcUN3QixlQUFlekIsUUFBcEQsRUFBOERtRCxTQUE5RDs7QUFDQSxVQUFJLENBQUMsS0FBSy9ILFFBQUwsQ0FBY21HLFdBQWQsQ0FBTCxFQUFpQztBQUNoQyxhQUFLbkcsUUFBTCxDQUFjbUcsV0FBZCxJQUE2QjtBQUFFcEwsaUJBQVEsS0FBS29MLFdBQWEsR0FBNUI7QUFBZ0NuTCxrQkFBUyxJQUFJcUwsZUFBZWpJLElBQU07QUFBbEUsU0FBN0I7QUFDQTs7QUFDRCxhQUFPakQsV0FBVzRDLE1BQVgsQ0FBa0JxSSxLQUFsQixDQUF3Qm5JLFdBQXhCLENBQW9Db0ksZUFBZXpCLFFBQW5ELENBQVA7QUFDQTs7QUFDRG5LLFdBQU9PLE1BQVAsQ0FBY3NDLEtBQWQsQ0FBb0IsZ0JBQXBCO0FBQ0E7QUFDQTs7QUFFRDJLLGdCQUFjQyxjQUFkLEVBQThCQyxZQUE5QixFQUE0QztBQUMzQyxVQUFNdEwsY0FBYzFCLFdBQVdDLFFBQVgsQ0FBb0I4QixHQUFwQixDQUF3Qix5QkFBeEIsQ0FBcEI7O0FBQ0EsUUFBSUwsV0FBSixFQUFpQjtBQUNoQixZQUFNdUwsUUFBUSxLQUFLdEksSUFBTCxDQUFVdUksTUFBVixDQUFpQnhMLFdBQWpCLEVBQThCcUwsY0FBOUIsQ0FBZDs7QUFFQSxVQUFJRSxVQUFVRixjQUFkLEVBQThCO0FBQzdCQyxxQkFBYUMsS0FBYixHQUFxQkEsS0FBckI7QUFDQTtBQUNEOztBQUVELFdBQU9ELFlBQVA7QUFDQTs7QUFFREcsdUJBQXFCakQsYUFBckIsRUFBb0NILFVBQXBDLEVBQWdEOUIsWUFBaEQsRUFBOERtRixxQkFBOUQsRUFBcUZDLFdBQXJGLEVBQWtHO0FBQ2pHLFFBQUlwRixhQUFhN0gsSUFBYixLQUFzQixTQUExQixFQUFxQztBQUNwQyxVQUFJNE0sZUFBZSxFQUFuQjs7QUFDQSxVQUFJLENBQUN2SSxFQUFFa0csT0FBRixDQUFVMUMsYUFBYXFGLE9BQXZCLENBQUwsRUFBc0M7QUFDckNOLHVCQUFlLEtBQUtwTixLQUFMLENBQVcyTixzQkFBWCxDQUFrQ3JELGFBQWxDLEVBQWlESCxVQUFqRCxFQUE2RDlCLFlBQTdELEVBQTJFb0YsV0FBM0UsQ0FBZjs7QUFDQSxZQUFJLENBQUNMLFlBQUwsRUFBbUI7QUFDbEI7QUFDQTtBQUNELE9BTEQsTUFLTztBQUNOQSx1QkFBZTtBQUNkbEosZUFBSyxLQUFLMEosbUNBQUwsQ0FBeUN2RixhQUFhTixJQUF0RCxDQURTO0FBRWQ1RSxlQUFLbUgsY0FBYzFKLEdBRkw7QUFHZGtELGFBQUc7QUFDRmxELGlCQUFLdUosV0FBV3ZKLEdBRGQ7QUFFRm1ELHNCQUFVb0csV0FBV3BHO0FBRm5CO0FBSFcsU0FBZjtBQVNBLGFBQUttSixhQUFMLENBQW1CL0MsV0FBV3BHLFFBQTlCLEVBQXdDcUosWUFBeEM7QUFDQTs7QUFDRHZJLFFBQUVnSixNQUFGLENBQVNULFlBQVQsRUFBdUJJLHFCQUF2Qjs7QUFDQSxVQUFJbkYsYUFBYXlGLE1BQWpCLEVBQXlCO0FBQ3hCVixxQkFBYXZHLFFBQWIsR0FBd0IsSUFBSTVDLElBQUosQ0FBUzhKLFNBQVMxRixhQUFheUYsTUFBYixDQUFvQjlKLEVBQXBCLENBQXVCZ0ssS0FBdkIsQ0FBNkIsR0FBN0IsRUFBa0MsQ0FBbEMsQ0FBVCxJQUFpRCxJQUExRCxDQUF4QjtBQUNBOztBQUNELFVBQUkzRixhQUFhcUYsT0FBYixLQUF5QixhQUE3QixFQUE0QztBQUMzQ3ZELHFCQUFhL0osV0FBVzRDLE1BQVgsQ0FBa0JxSSxLQUFsQixDQUF3Qm5JLFdBQXhCLENBQW9DLFlBQXBDLEVBQWtEO0FBQUUrSyxrQkFBUTtBQUFFbEssc0JBQVU7QUFBWjtBQUFWLFNBQWxELENBQWI7QUFDQTs7QUFFRCxVQUFJc0UsYUFBYTZGLFNBQWIsSUFBMEI3RixhQUFhNkYsU0FBYixDQUF1Qm5ILE9BQXZCLENBQStCc0IsYUFBYWpGLE9BQTVDLE1BQXlELENBQUMsQ0FBeEYsRUFBMkY7QUFDMUZnSyxxQkFBYWUsTUFBYixHQUFzQixJQUF0QjtBQUNBZixxQkFBYWdCLFFBQWIsR0FBd0JuSyxLQUFLb0ssR0FBN0I7QUFDQWpCLHFCQUFha0IsUUFBYixHQUF3QnpKLEVBQUUwSixJQUFGLENBQU9wRSxVQUFQLEVBQW1CLEtBQW5CLEVBQTBCLFVBQTFCLENBQXhCO0FBQ0E7O0FBQ0QsVUFBSTlCLGFBQWFxRixPQUFiLEtBQXlCLGFBQTdCLEVBQTRDO0FBQzNDeE4sZUFBT3NPLFVBQVAsQ0FBa0IsTUFBTTtBQUN2QixjQUFJbkcsYUFBYTRFLE1BQWIsSUFBdUI1RSxhQUFhckUsRUFBcEMsSUFBMEMsQ0FBQzVELFdBQVc0QyxNQUFYLENBQWtCcUQsUUFBbEIsQ0FBMkJvSSw2QkFBM0IsQ0FBeURwRyxhQUFhNEUsTUFBdEUsRUFBOEU1RSxhQUFhckUsRUFBM0YsQ0FBL0MsRUFBK0k7QUFDOUk1RCx1QkFBV3NPLFdBQVgsQ0FBdUJ2RSxVQUF2QixFQUFtQ2lELFlBQW5DLEVBQWlEOUMsYUFBakQsRUFBZ0UsSUFBaEU7QUFDQTtBQUNELFNBSkQsRUFJRyxHQUpIO0FBS0EsT0FORCxNQU1PO0FBQ041SyxlQUFPTyxNQUFQLENBQWNzQyxLQUFkLENBQW9CLDZCQUFwQjtBQUNBbkMsbUJBQVdzTyxXQUFYLENBQXVCdkUsVUFBdkIsRUFBbUNpRCxZQUFuQyxFQUFpRDlDLGFBQWpELEVBQWdFLElBQWhFO0FBQ0E7QUFDRDtBQUNEOztBQUVEc0Qsc0NBQW9DZSxXQUFwQyxFQUFpRDtBQUNoRCxRQUFJLENBQUM5SixFQUFFa0csT0FBRixDQUFVNEQsV0FBVixDQUFMLEVBQTZCO0FBQzVCQSxvQkFBY0EsWUFBWWpJLE9BQVosQ0FBb0IsY0FBcEIsRUFBb0MsTUFBcEMsQ0FBZDtBQUNBaUksb0JBQWNBLFlBQVlqSSxPQUFaLENBQW9CLGFBQXBCLEVBQW1DLE1BQW5DLENBQWQ7QUFDQWlJLG9CQUFjQSxZQUFZakksT0FBWixDQUFvQixVQUFwQixFQUFnQyxPQUFoQyxDQUFkO0FBQ0FpSSxvQkFBY0EsWUFBWWpJLE9BQVosQ0FBb0IsT0FBcEIsRUFBNkIsR0FBN0IsQ0FBZDtBQUNBaUksb0JBQWNBLFlBQVlqSSxPQUFaLENBQW9CLE9BQXBCLEVBQTZCLEdBQTdCLENBQWQ7QUFDQWlJLG9CQUFjQSxZQUFZakksT0FBWixDQUFvQixRQUFwQixFQUE4QixHQUE5QixDQUFkO0FBQ0FpSSxvQkFBY0EsWUFBWWpJLE9BQVosQ0FBb0IsaUJBQXBCLEVBQXVDLFNBQXZDLENBQWQ7QUFDQWlJLG9CQUFjQSxZQUFZakksT0FBWixDQUFvQixTQUFwQixFQUErQixVQUEvQixDQUFkO0FBQ0FpSSxvQkFBY0EsWUFBWWpJLE9BQVosQ0FBb0IsVUFBcEIsRUFBZ0MsT0FBaEMsQ0FBZDtBQUNBaUksb0JBQWNBLFlBQVlqSSxPQUFaLENBQW9CLE9BQXBCLEVBQTZCLE1BQTdCLENBQWQ7QUFDQWlJLG9CQUFjQSxZQUFZakksT0FBWixDQUFvQixxQkFBcEIsRUFBMkMsSUFBM0MsQ0FBZDtBQUVBaUksa0JBQVlqSSxPQUFaLENBQW9CLHFDQUFwQixFQUEyRCxDQUFDa0ksS0FBRCxFQUFRbkwsTUFBUixLQUFtQjtBQUM3RSxZQUFJLENBQUMsS0FBS3dCLFFBQUwsQ0FBY3hCLE1BQWQsQ0FBTCxFQUE0QjtBQUMzQixlQUFLaUYsUUFBTCxDQUFjakYsTUFBZCxLQUF5QixLQUFLa0YsT0FBTCxDQUFhbEYsTUFBYixDQUF6QixDQUQyQixDQUNvQjtBQUMvQzs7QUFDRCxjQUFNd0IsV0FBVyxLQUFLQSxRQUFMLENBQWN4QixNQUFkLENBQWpCOztBQUNBLFlBQUl3QixRQUFKLEVBQWM7QUFDYjBKLHdCQUFjQSxZQUFZakksT0FBWixDQUFvQnpCLFNBQVNqRixLQUE3QixFQUFvQ2lGLFNBQVNoRixNQUE3QyxDQUFkO0FBQ0E7QUFDRCxPQVJEO0FBU0EsS0F0QkQsTUFzQk87QUFDTjBPLG9CQUFjLEVBQWQ7QUFDQTs7QUFDRCxXQUFPQSxXQUFQO0FBQ0E7O0FBcmRpQyxDOzs7Ozs7Ozs7OztBQ0puQzNOLE9BQU80RCxNQUFQLENBQWM7QUFBQ3pELFdBQVEsTUFBSUo7QUFBYixDQUFkOztBQUEwQyxJQUFJOEQsQ0FBSjs7QUFBTTdELE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUN5RCxRQUFFekQsQ0FBRjtBQUFJOztBQUFoQixDQUFuQyxFQUFxRCxDQUFyRDtBQUF3RCxJQUFJd0wsR0FBSjtBQUFRNUwsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLEtBQVIsQ0FBYixFQUE0QjtBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ3dMLFVBQUl4TCxDQUFKO0FBQU07O0FBQWxCLENBQTVCLEVBQWdELENBQWhEO0FBQW1ELElBQUl5TixJQUFKO0FBQVM3TixPQUFPQyxLQUFQLENBQWFDLFFBQVEsTUFBUixDQUFiLEVBQTZCO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDeU4sV0FBS3pOLENBQUw7QUFBTzs7QUFBbkIsQ0FBN0IsRUFBa0QsQ0FBbEQ7QUFBcUQsSUFBSTBOLEtBQUo7QUFBVTlOLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxPQUFSLENBQWIsRUFBOEI7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUMwTixZQUFNMU4sQ0FBTjtBQUFROztBQUFwQixDQUE5QixFQUFvRCxDQUFwRDs7QUFPNU4sTUFBTUwsWUFBTixDQUFtQjtBQUVqQ1EsY0FBWXVELFdBQVosRUFBeUI7QUFDeEJwRixXQUFPTSxLQUFQLENBQWF1QyxLQUFiLENBQW1CLGFBQW5CO0FBQ0EsU0FBS3VDLFdBQUwsR0FBbUJBLFdBQW5CO0FBQ0EsU0FBS2lLLFdBQUwsR0FBbUI3TixRQUFRLGVBQVIsQ0FBbkI7QUFDQSxTQUFLOE4sR0FBTCxHQUFXLEVBQVgsQ0FKd0IsQ0FJVDs7QUFDZixTQUFLbk4sUUFBTCxHQUFnQixFQUFoQixDQUx3QixDQUtKO0FBQ3BCOztBQUNBLFNBQUtvTixrQ0FBTCxHQUEwQyxJQUFJeE4sR0FBSixFQUExQyxDQVB3QixDQU82Qjs7QUFDckQsU0FBS3hCLE1BQUwsR0FBYyxFQUFkO0FBQ0E7QUFFRDs7Ozs7O0FBSUFpQyxVQUFRTCxRQUFSLEVBQWtCO0FBQ2pCLFNBQUtBLFFBQUwsR0FBZ0JBLFFBQWhCO0FBRUEsVUFBTTtBQUFFcU47QUFBRixRQUFnQixLQUFLSCxXQUEzQjs7QUFDQSxRQUFJRyxhQUFhLElBQWpCLEVBQXVCO0FBQ3RCQSxnQkFBVTdNLFVBQVY7QUFDQTs7QUFDRCxTQUFLMk0sR0FBTCxHQUFXLElBQUlFLFNBQUosQ0FBYyxLQUFLck4sUUFBbkIsQ0FBWDtBQUNBLFNBQUttTixHQUFMLENBQVNHLEtBQVQ7QUFDQSxTQUFLakssaUJBQUw7QUFFQWhGLFdBQU9DLE9BQVAsQ0FBZSxNQUFNO0FBQ3BCLFVBQUk7QUFDSCxhQUFLaVAsNEJBQUwsR0FERyxDQUNrQztBQUNyQyxPQUZELENBRUUsT0FBT3BKLEdBQVAsRUFBWTtBQUNidEcsZUFBT00sS0FBUCxDQUFheUUsS0FBYixDQUFtQixzQ0FBbkIsRUFBMkR1QixHQUEzRDtBQUNBLGFBQUtsQixXQUFMLENBQWlCekMsVUFBakI7QUFDQTtBQUNELEtBUEQ7QUFRQTtBQUVEOzs7OztBQUdBQSxlQUFhO0FBQ1osU0FBSzJNLEdBQUwsQ0FBUzNNLFVBQVQsSUFBdUIsS0FBSzJNLEdBQUwsQ0FBUzNNLFVBQWhDO0FBQ0E7O0FBRURULFlBQVUzQixNQUFWLEVBQWtCO0FBQ2pCLFNBQUtBLE1BQUwsR0FBY0EsTUFBZDtBQUNBOztBQUVEaUYsc0JBQW9CO0FBQ25CeEYsV0FBT00sS0FBUCxDQUFhdUMsS0FBYixDQUFtQixxQkFBbkI7QUFDQSxTQUFLeU0sR0FBTCxDQUFTSyxFQUFULENBQVksZUFBWixFQUE2QixNQUFNO0FBQ2xDM1AsYUFBT00sS0FBUCxDQUFhb0MsSUFBYixDQUFrQixvQkFBbEI7QUFDQSxLQUZEO0FBSUEsU0FBSzRNLEdBQUwsQ0FBU0ssRUFBVCxDQUFZLHFCQUFaLEVBQW1DLE1BQU07QUFDeEMsV0FBS3ZLLFdBQUwsQ0FBaUJ6QyxVQUFqQjtBQUNBLEtBRkQ7QUFJQSxTQUFLMk0sR0FBTCxDQUFTSyxFQUFULENBQVksY0FBWixFQUE0QixNQUFNO0FBQ2pDM1AsYUFBT00sS0FBUCxDQUFhb0MsSUFBYixDQUFrQix5QkFBbEI7QUFDQSxXQUFLMEMsV0FBTCxDQUFpQnpDLFVBQWpCO0FBQ0EsS0FIRDtBQUtBOzs7Ozs7Ozs7Ozs7OztBQWFBLFNBQUsyTSxHQUFMLENBQVNLLEVBQVQsQ0FBWSxTQUFaLEVBQXVCblAsT0FBT29QLGVBQVAsQ0FBd0JqSCxZQUFELElBQWtCO0FBQy9EM0ksYUFBT00sS0FBUCxDQUFhdUMsS0FBYixDQUFtQix3QkFBbkIsRUFBNkM4RixZQUE3Qzs7QUFDQSxVQUFJQSxZQUFKLEVBQWtCO0FBQ2pCLFlBQUk7QUFDSCxlQUFLaEQsU0FBTCxDQUFlZ0QsWUFBZjtBQUNBLFNBRkQsQ0FFRSxPQUFPckMsR0FBUCxFQUFZO0FBQ2J0RyxpQkFBT00sS0FBUCxDQUFheUUsS0FBYixDQUFtQiwyQkFBbkIsRUFBZ0R1QixHQUFoRDtBQUNBO0FBQ0Q7QUFDRCxLQVRzQixDQUF2QjtBQVdBLFNBQUtnSixHQUFMLENBQVNLLEVBQVQsQ0FBWSxnQkFBWixFQUE4Qm5QLE9BQU9vUCxlQUFQLENBQXdCQyxXQUFELElBQWlCO0FBQ3JFN1AsYUFBT00sS0FBUCxDQUFhdUMsS0FBYixDQUFtQiwrQkFBbkIsRUFBb0RnTixXQUFwRDs7QUFDQSxVQUFJQSxXQUFKLEVBQWlCO0FBQ2hCLFlBQUk7QUFDSCxlQUFLQyxlQUFMLENBQXFCRCxXQUFyQjtBQUNBLFNBRkQsQ0FFRSxPQUFPdkosR0FBUCxFQUFZO0FBQ2J0RyxpQkFBT00sS0FBUCxDQUFheUUsS0FBYixDQUFtQixpQ0FBbkIsRUFBc0R1QixHQUF0RDtBQUNBO0FBQ0Q7QUFDRCxLQVQ2QixDQUE5QjtBQVdBLFNBQUtnSixHQUFMLENBQVNLLEVBQVQsQ0FBWSxrQkFBWixFQUFnQ25QLE9BQU9vUCxlQUFQLENBQXdCQyxXQUFELElBQWlCO0FBQ3ZFN1AsYUFBT00sS0FBUCxDQUFhdUMsS0FBYixDQUFtQixpQ0FBbkIsRUFBc0RnTixXQUF0RDs7QUFDQSxVQUFJQSxXQUFKLEVBQWlCO0FBQ2hCLFlBQUk7QUFDSCxlQUFLRSxpQkFBTCxDQUF1QkYsV0FBdkI7QUFDQSxTQUZELENBRUUsT0FBT3ZKLEdBQVAsRUFBWTtBQUNidEcsaUJBQU9NLEtBQVAsQ0FBYXlFLEtBQWIsQ0FBbUIsbUNBQW5CLEVBQXdEdUIsR0FBeEQ7QUFDQTtBQUNEO0FBQ0QsS0FUK0IsQ0FBaEM7QUFXQTs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkEsU0FBS2dKLEdBQUwsQ0FBU0ssRUFBVCxDQUFZLGlCQUFaLEVBQStCblAsT0FBT29QLGVBQVAsQ0FBdUIsTUFBTSxDQUFFLENBQS9CLENBQS9CO0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBK0JBLFNBQUtOLEdBQUwsQ0FBU0ssRUFBVCxDQUFZLGdCQUFaLEVBQThCblAsT0FBT29QLGVBQVAsQ0FBdUIsTUFBTSxDQUFFLENBQS9CLENBQTlCO0FBRUE7Ozs7Ozs7O0FBT0EsU0FBS04sR0FBTCxDQUFTSyxFQUFULENBQVksY0FBWixFQUE0Qm5QLE9BQU9vUCxlQUFQLENBQXdCSSxjQUFELElBQW9CO0FBQ3RFaFEsYUFBT00sS0FBUCxDQUFhdUMsS0FBYixDQUFtQiw2QkFBbkIsRUFBa0RtTixjQUFsRDs7QUFDQSxVQUFJQSxjQUFKLEVBQW9CO0FBQ25CLFlBQUk7QUFDSCxlQUFLQyxhQUFMLENBQW1CRCxjQUFuQjtBQUNBLFNBRkQsQ0FFRSxPQUFPMUosR0FBUCxFQUFZO0FBQ2J0RyxpQkFBT00sS0FBUCxDQUFheUUsS0FBYixDQUFtQiwrQkFBbkIsRUFBb0R1QixHQUFwRDtBQUNBO0FBQ0Q7QUFHRCxLQVgyQixDQUE1QjtBQWFBOzs7Ozs7Ozs7QUFRQSxTQUFLZ0osR0FBTCxDQUFTSyxFQUFULENBQVksaUJBQVosRUFBK0JuUCxPQUFPb1AsZUFBUCxDQUF1QixNQUFNLENBQUUsQ0FBL0IsQ0FBL0I7QUFFQTs7Ozs7Ozs7Ozs7Ozs7QUFhQSxTQUFLTixHQUFMLENBQVNLLEVBQVQsQ0FBWSxnQkFBWixFQUE4Qm5QLE9BQU9vUCxlQUFQLENBQXVCLE1BQU0sQ0FBRSxDQUEvQixDQUE5QjtBQUVBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQStCQSxTQUFLTixHQUFMLENBQVNLLEVBQVQsQ0FBWSxjQUFaLEVBQTRCblAsT0FBT29QLGVBQVAsQ0FBdUIsTUFBTSxDQUFFLENBQS9CLENBQTVCO0FBRUE7Ozs7Ozs7O0FBT0EsU0FBS04sR0FBTCxDQUFTSyxFQUFULENBQVksWUFBWixFQUEwQm5QLE9BQU9vUCxlQUFQLENBQXVCLE1BQU0sQ0FBRSxDQUEvQixDQUExQjtBQUVBOzs7Ozs7Ozs7Ozs7OztBQWFBLFNBQUtOLEdBQUwsQ0FBU0ssRUFBVCxDQUFZLGNBQVosRUFBNEJuUCxPQUFPb1AsZUFBUCxDQUF1QixNQUFNLENBQUUsQ0FBL0IsQ0FBNUI7QUFFQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBeUNBLFNBQUtOLEdBQUwsQ0FBU0ssRUFBVCxDQUFZLFdBQVosRUFBeUJuUCxPQUFPb1AsZUFBUCxDQUF1QixNQUFNLENBQUUsQ0FBL0IsQ0FBekI7QUFDQTtBQUVEOzs7OztBQUdBRyxvQkFBa0JHLGdCQUFsQixFQUFvQztBQUNuQyxRQUFJQSxnQkFBSixFQUFzQjtBQUNyQixVQUFJLENBQUUsS0FBSzlLLFdBQUwsQ0FBaUI5QyxrQkFBdkIsRUFBMkM7QUFDMUM7QUFDQTs7QUFDRCxZQUFNbUksYUFBYSxLQUFLbEssTUFBTCxDQUFZdUksT0FBWixDQUFvQm9ILGlCQUFpQnRNLElBQXJDLENBQW5CLENBSnFCLENBS3JCOztBQUNBLFVBQUk4QyxZQUFZaEcsV0FBVzRDLE1BQVgsQ0FBa0JxRCxRQUFsQixDQUEyQndKLGdCQUEzQixDQUE0Q0QsaUJBQWlCak4sSUFBakIsQ0FBc0JxQixFQUFsRSxDQUFoQjs7QUFFQSxVQUFJLENBQUNvQyxTQUFMLEVBQWdCO0FBQ2Y7QUFDQSxjQUFNMEosV0FBVyxLQUFLN1AsTUFBTCxDQUFZMkksY0FBWixDQUEyQmdILGlCQUFpQmpOLElBQWpCLENBQXNCUyxPQUFqRCxFQUEwRHdNLGlCQUFpQmpOLElBQWpCLENBQXNCcUIsRUFBaEYsQ0FBakI7QUFDQW9DLG9CQUFZaEcsV0FBVzRDLE1BQVgsQ0FBa0JxRCxRQUFsQixDQUEyQm5ELFdBQTNCLENBQXVDNE0sUUFBdkMsQ0FBWjtBQUNBOztBQUVELFVBQUkxSixhQUFhK0QsVUFBakIsRUFBNkI7QUFDNUIsY0FBTTRGLGlCQUFrQixJQUFJSCxpQkFBaUIxSixRQUFVLEdBQXZELENBRDRCLENBRzVCOztBQUNBLFlBQUlFLFVBQVU0SixTQUFkLEVBQXlCO0FBQ3hCLGdCQUFNQyxjQUFjN0osVUFBVTRKLFNBQVYsQ0FBb0JELGNBQXBCLENBQXBCOztBQUNBLGNBQUlFLFdBQUosRUFBaUI7QUFDaEIsZ0JBQUlBLFlBQVlDLFNBQVosQ0FBc0JuSixPQUF0QixDQUE4Qm9ELFdBQVdwRyxRQUF6QyxNQUF1RCxDQUFDLENBQTVELEVBQStEO0FBQzlELHFCQUQ4RCxDQUN0RDtBQUNSO0FBQ0Q7QUFDRCxTQVBELE1BT087QUFDTjtBQUNBO0FBQ0EsU0FkMkIsQ0FnQjVCOzs7QUFDQSxhQUFLZSxXQUFMLENBQWlCdEQsWUFBakIsQ0FBOEIyTyxHQUE5QixDQUFtQyxRQUFRL0osVUFBVXhGLEdBQUssR0FBR21QLGNBQWdCLEVBQTdFLEVBQWdGNUYsVUFBaEY7QUFDQXpLLGVBQU9NLEtBQVAsQ0FBYXVDLEtBQWIsQ0FBbUIsOEJBQW5CO0FBQ0FyQyxlQUFPa1EsU0FBUCxDQUFpQmpHLFdBQVd2SixHQUE1QixFQUFpQyxNQUFNO0FBQ3RDVixpQkFBT21RLElBQVAsQ0FBWSxhQUFaLEVBQTJCTixjQUEzQixFQUEyQzNKLFVBQVV4RixHQUFyRDtBQUNBLFNBRkQ7QUFHQTtBQUNEO0FBQ0Q7QUFFRDs7Ozs7QUFHQTRPLGtCQUFnQkksZ0JBQWhCLEVBQWtDO0FBQ2pDLFFBQUlBLGdCQUFKLEVBQXNCO0FBQ3JCLFVBQUksQ0FBRSxLQUFLOUssV0FBTCxDQUFpQjlDLGtCQUF2QixFQUEyQztBQUMxQztBQUNBOztBQUNELFlBQU1tSSxhQUFhLEtBQUtsSyxNQUFMLENBQVl1SSxPQUFaLENBQW9Cb0gsaUJBQWlCdE0sSUFBckMsQ0FBbkI7O0FBRUEsVUFBSTZHLFdBQVdtQyxLQUFYLENBQWlCZ0UsUUFBakIsQ0FBMEIsS0FBMUIsQ0FBSixFQUFzQztBQUNyQztBQUNBLE9BUm9CLENBVXJCOzs7QUFDQSxVQUFJbEssWUFBWWhHLFdBQVc0QyxNQUFYLENBQWtCcUQsUUFBbEIsQ0FBMkJ3SixnQkFBM0IsQ0FBNENELGlCQUFpQmpOLElBQWpCLENBQXNCcUIsRUFBbEUsQ0FBaEI7O0FBRUEsVUFBSSxDQUFDb0MsU0FBTCxFQUFnQjtBQUNmO0FBQ0EsY0FBTTBKLFdBQVcsS0FBSzdQLE1BQUwsQ0FBWTJJLGNBQVosQ0FBMkJnSCxpQkFBaUJqTixJQUFqQixDQUFzQlMsT0FBakQsRUFBMER3TSxpQkFBaUJqTixJQUFqQixDQUFzQnFCLEVBQWhGLENBQWpCO0FBQ0FvQyxvQkFBWWhHLFdBQVc0QyxNQUFYLENBQWtCcUQsUUFBbEIsQ0FBMkJuRCxXQUEzQixDQUF1QzRNLFFBQXZDLENBQVo7QUFDQTs7QUFFRCxVQUFJMUosYUFBYStELFVBQWpCLEVBQTZCO0FBQzVCLGNBQU00RixpQkFBa0IsSUFBSUgsaUJBQWlCMUosUUFBVSxHQUF2RCxDQUQ0QixDQUc1Qjs7QUFDQSxZQUFJRSxVQUFVNEosU0FBZCxFQUF5QjtBQUN4QixnQkFBTUMsY0FBYzdKLFVBQVU0SixTQUFWLENBQW9CRCxjQUFwQixDQUFwQjs7QUFDQSxjQUFJRSxXQUFKLEVBQWlCO0FBQ2hCLGdCQUFJQSxZQUFZQyxTQUFaLENBQXNCbkosT0FBdEIsQ0FBOEJvRCxXQUFXcEcsUUFBekMsTUFBdUQsQ0FBQyxDQUE1RCxFQUErRDtBQUM5RCxxQkFEOEQsQ0FDdEQ7QUFDUjtBQUNEO0FBQ0QsU0FYMkIsQ0FhNUI7OztBQUNBLGFBQUtlLFdBQUwsQ0FBaUJ0RCxZQUFqQixDQUE4QjJPLEdBQTlCLENBQW1DLE1BQU0vSixVQUFVeEYsR0FBSyxHQUFHbVAsY0FBZ0IsRUFBM0UsRUFBOEU1RixVQUE5RTtBQUNBekssZUFBT00sS0FBUCxDQUFhdUMsS0FBYixDQUFtQiw0QkFBbkI7QUFDQXJDLGVBQU9rUSxTQUFQLENBQWlCakcsV0FBV3ZKLEdBQTVCLEVBQWlDLE1BQU07QUFDdENWLGlCQUFPbVEsSUFBUCxDQUFZLGFBQVosRUFBMkJOLGNBQTNCLEVBQTJDM0osVUFBVXhGLEdBQXJEO0FBQ0EsU0FGRDtBQUdBO0FBQ0Q7QUFDRDs7QUFFRCtPLGdCQUFjRCxjQUFkLEVBQThCO0FBQzdCLFNBQUthLGtCQUFMLENBQXdCYixlQUFldE0sT0FBdkM7QUFDQTtBQUNEOzs7Ozs7QUFJQWlDLFlBQVVnRCxZQUFWLEVBQXdCb0YsV0FBeEIsRUFBcUM7QUFDcEMsUUFBSXBGLGFBQWFxRixPQUFqQixFQUEwQjtBQUN6QixjQUFRckYsYUFBYXFGLE9BQXJCO0FBQ0MsYUFBSyxpQkFBTDtBQUNDLGVBQUs4QyxxQkFBTCxDQUEyQm5JLFlBQTNCO0FBQ0E7O0FBQ0QsYUFBSyxpQkFBTDtBQUNDLGVBQUt2QixxQkFBTCxDQUEyQnVCLFlBQTNCO0FBQ0E7O0FBQ0QsYUFBSyxjQUFMO0FBQ0MsZUFBS29JLGtCQUFMLENBQXdCcEksWUFBeEI7QUFDQTs7QUFDRCxhQUFLLFlBQUw7QUFDQyxlQUFLcEIsZ0JBQUwsQ0FBc0JvQixZQUF0QjtBQUNBOztBQUNEO0FBQ0M7QUFDQSxlQUFLcUksaUJBQUwsQ0FBdUJySSxZQUF2QixFQUFxQ29GLFdBQXJDO0FBZkY7QUFpQkEsS0FsQkQsTUFrQk87QUFDTjtBQUNBLFdBQUtpRCxpQkFBTCxDQUF1QnJJLFlBQXZCLEVBQXFDb0YsV0FBckM7QUFDQTtBQUNEOztBQUVEa0QscUJBQW1CQyxTQUFuQixFQUE4QjtBQUM3QmxSLFdBQU9NLEtBQVAsQ0FBYXVDLEtBQWIsQ0FBbUIsNEJBQW5CLEVBQWlEcU8sU0FBakQ7QUFDQSxVQUFNQyxXQUFXekgsS0FBS2pILEdBQUwsQ0FBUyxxQ0FBVCxFQUFnRDtBQUFFTyxjQUFRO0FBQUUyRyxlQUFPLEtBQUt4SCxRQUFkO0FBQXdCdUIsaUJBQVN3TjtBQUFqQztBQUFWLEtBQWhELENBQWpCOztBQUNBLFFBQUlDLFlBQVlBLFNBQVN2SCxJQUF6QixFQUErQjtBQUM5QixhQUFPdUgsU0FBU3ZILElBQVQsQ0FBY2xHLE9BQXJCO0FBQ0E7QUFDRDs7QUFFRDBOLGtCQUFnQkMsaUJBQWhCLEVBQW1DO0FBQ2xDclIsV0FBT00sS0FBUCxDQUFhdUMsS0FBYixDQUFtQixzQ0FBbkIsRUFBMkR3TyxpQkFBM0Q7QUFDQSxRQUFJRixXQUFXekgsS0FBS2pILEdBQUwsQ0FBUyxxQ0FBVCxFQUFnRDtBQUFFTyxjQUFRO0FBQUUyRyxlQUFPLEtBQUt4SDtBQUFkO0FBQVYsS0FBaEQsQ0FBZjs7QUFDQSxRQUFJZ1AsWUFBWUEsU0FBU3ZILElBQXJCLElBQTZCekUsRUFBRW1NLE9BQUYsQ0FBVUgsU0FBU3ZILElBQVQsQ0FBYzJILFFBQXhCLENBQTdCLElBQWtFSixTQUFTdkgsSUFBVCxDQUFjMkgsUUFBZCxDQUF1QnpKLE1BQXZCLEdBQWdDLENBQXRHLEVBQXlHO0FBQ3hHLFdBQUssTUFBTXBFLE9BQVgsSUFBc0J5TixTQUFTdkgsSUFBVCxDQUFjMkgsUUFBcEMsRUFBOEM7QUFDN0MsWUFBSTdOLFFBQVFDLElBQVIsS0FBaUIwTixpQkFBakIsSUFBc0MzTixRQUFROE4sU0FBUixLQUFzQixJQUFoRSxFQUFzRTtBQUNyRSxpQkFBTzlOLE9BQVA7QUFDQTtBQUNEO0FBQ0Q7O0FBQ0R5TixlQUFXekgsS0FBS2pILEdBQUwsQ0FBUyxtQ0FBVCxFQUE4QztBQUFFTyxjQUFRO0FBQUUyRyxlQUFPLEtBQUt4SDtBQUFkO0FBQVYsS0FBOUMsQ0FBWDs7QUFDQSxRQUFJZ1AsWUFBWUEsU0FBU3ZILElBQXJCLElBQTZCekUsRUFBRW1NLE9BQUYsQ0FBVUgsU0FBU3ZILElBQVQsQ0FBYzZILE1BQXhCLENBQTdCLElBQWdFTixTQUFTdkgsSUFBVCxDQUFjNkgsTUFBZCxDQUFxQjNKLE1BQXJCLEdBQThCLENBQWxHLEVBQXFHO0FBQ3BHLFdBQUssTUFBTWlDLEtBQVgsSUFBb0JvSCxTQUFTdkgsSUFBVCxDQUFjNkgsTUFBbEMsRUFBMEM7QUFDekMsWUFBSTFILE1BQU1wRyxJQUFOLEtBQWUwTixpQkFBbkIsRUFBc0M7QUFDckMsaUJBQU90SCxLQUFQO0FBQ0E7QUFDRDtBQUNEO0FBQ0Q7QUFFRDs7Ozs7Ozs7QUFNQWpELGVBQWFKLFNBQWIsRUFBd0I7QUFDdkI7QUFDQSxRQUFJRyxPQUFKOztBQUNBLFFBQUk2SyxRQUFRaEwsVUFBVXhGLEdBQVYsQ0FBY21HLE9BQWQsQ0FBc0IsUUFBdEIsQ0FBWjs7QUFDQSxRQUFJcUssVUFBVSxDQUFkLEVBQWlCO0FBQ2hCO0FBQ0E3SyxnQkFBVUgsVUFBVXhGLEdBQVYsQ0FBY3lRLE1BQWQsQ0FBcUIsQ0FBckIsRUFBd0JqTCxVQUFVeEYsR0FBVixDQUFjNEcsTUFBdEMsQ0FBVjtBQUNBNEosY0FBUTdLLFFBQVFRLE9BQVIsQ0FBZ0IsR0FBaEIsQ0FBUjtBQUNBUixnQkFBVUEsUUFBUThLLE1BQVIsQ0FBZUQsUUFBUSxDQUF2QixFQUEwQjdLLFFBQVFpQixNQUFsQyxDQUFWO0FBQ0FqQixnQkFBVUEsUUFBUUcsT0FBUixDQUFnQixHQUFoQixFQUFxQixHQUFyQixDQUFWO0FBQ0EsS0FORCxNQU1PO0FBQ047QUFDQUgsZ0JBQVVILFVBQVVrTCxPQUFwQjtBQUNBOztBQUVELFdBQU8vSyxPQUFQO0FBQ0E7QUFFRDs7Ozs7OztBQUtBNEUsa0JBQWdCb0csVUFBaEIsRUFBNEJYLFNBQTVCLEVBQXVDO0FBQ3RDLFVBQU1ZLEtBQUssS0FBSzFMLGVBQUwsQ0FBcUJ5TCxVQUFyQixDQUFYOztBQUNBLFFBQUksUUFBUUMsRUFBWixFQUFnQjtBQUNmLFdBQUt2QyxrQ0FBTCxDQUF3Q2tCLEdBQXhDLENBQTRDb0IsVUFBNUMsRUFBd0Q7QUFBRTFOLFlBQUkrTSxTQUFOO0FBQWlCYSxnQkFBUWIsVUFBVXpILE1BQVYsQ0FBaUIsQ0FBakIsTUFBd0IsR0FBeEIsR0FBOEIsVUFBOUIsR0FBMkM7QUFBcEUsT0FBeEQ7QUFDQTtBQUNEOztBQUVEb0gscUJBQW1CSyxTQUFuQixFQUE4QjtBQUM3QixVQUFNYyxPQUFPLEtBQUt6QyxrQ0FBTCxDQUF3Q3lDLElBQXhDLEVBQWI7QUFDQSxRQUFJcEwsWUFBSjtBQUNBLFFBQUloRSxHQUFKOztBQUNBLFdBQU8sQ0FBQ0EsTUFBTW9QLEtBQUtDLElBQUwsR0FBWTlRLEtBQW5CLEtBQTZCLElBQXBDLEVBQTBDO0FBQ3pDeUYscUJBQWUsS0FBSzJJLGtDQUFMLENBQXdDOU0sR0FBeEMsQ0FBNENHLEdBQTVDLENBQWY7O0FBQ0EsVUFBSWdFLGFBQWF6QyxFQUFiLEtBQW9CK00sU0FBeEIsRUFBbUM7QUFDbEM7QUFDQSxhQUFLM0Isa0NBQUwsQ0FBd0M5SSxNQUF4QyxDQUErQzdELEdBQS9DO0FBQ0E7QUFDQTtBQUNEO0FBQ0Q7O0FBRUR3RCxrQkFBZ0J5TCxVQUFoQixFQUE0QjtBQUMzQixXQUFPLEtBQUt0QyxrQ0FBTCxDQUF3QzlNLEdBQXhDLENBQTRDb1AsVUFBNUMsQ0FBUDtBQUNBOztBQUVESywyQ0FBeUM7QUFDeEMsVUFBTWYsV0FBV3pILEtBQUtqSCxHQUFMLENBQVMscUNBQVQsRUFBZ0Q7QUFBRU8sY0FBUTtBQUFFMkcsZUFBTyxLQUFLeEg7QUFBZDtBQUFWLEtBQWhELENBQWpCOztBQUNBLFFBQUlnUCxZQUFZQSxTQUFTdkgsSUFBckIsSUFBNkJ6RSxFQUFFbU0sT0FBRixDQUFVSCxTQUFTdkgsSUFBVCxDQUFjMkgsUUFBeEIsQ0FBN0IsSUFBa0VKLFNBQVN2SCxJQUFULENBQWMySCxRQUFkLENBQXVCekosTUFBdkIsR0FBZ0MsQ0FBdEcsRUFBeUc7QUFDeEcsV0FBSyxNQUFNbEIsWUFBWCxJQUEyQnVLLFNBQVN2SCxJQUFULENBQWMySCxRQUF6QyxFQUFtRDtBQUNsRCxjQUFNWSxrQkFBa0J6UixXQUFXNEMsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0IwRyxhQUF4QixDQUFzQ3JELGFBQWFqRCxJQUFuRCxFQUF5RDtBQUFFNEssa0JBQVE7QUFBRXJOLGlCQUFLO0FBQVA7QUFBVixTQUF6RCxDQUF4Qjs7QUFDQSxZQUFJaVIsZUFBSixFQUFxQjtBQUNwQixjQUFJdkwsYUFBYTRLLFNBQWpCLEVBQTRCO0FBQzNCLGlCQUFLL0YsZUFBTCxDQUFxQjBHLGdCQUFnQmpSLEdBQXJDLEVBQTBDMEYsYUFBYXpDLEVBQXZEO0FBQ0E7QUFDRDtBQUNEO0FBQ0Q7QUFDRDs7QUFFRGlPLHlDQUF1QztBQUN0QyxVQUFNakIsV0FBV3pILEtBQUtqSCxHQUFMLENBQVMsbUNBQVQsRUFBOEM7QUFBRU8sY0FBUTtBQUFFMkcsZUFBTyxLQUFLeEg7QUFBZDtBQUFWLEtBQTlDLENBQWpCOztBQUNBLFFBQUlnUCxZQUFZQSxTQUFTdkgsSUFBckIsSUFBNkJ6RSxFQUFFbU0sT0FBRixDQUFVSCxTQUFTdkgsSUFBVCxDQUFjNkgsTUFBeEIsQ0FBN0IsSUFBZ0VOLFNBQVN2SCxJQUFULENBQWM2SCxNQUFkLENBQXFCM0osTUFBckIsR0FBOEIsQ0FBbEcsRUFBcUc7QUFDcEcsV0FBSyxNQUFNdUssVUFBWCxJQUF5QmxCLFNBQVN2SCxJQUFULENBQWM2SCxNQUF2QyxFQUErQztBQUM5QyxjQUFNVSxrQkFBa0J6UixXQUFXNEMsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0IwRyxhQUF4QixDQUFzQ29JLFdBQVcxTyxJQUFqRCxFQUF1RDtBQUFFNEssa0JBQVE7QUFBRXJOLGlCQUFLO0FBQVA7QUFBVixTQUF2RCxDQUF4Qjs7QUFDQSxZQUFJaVIsZUFBSixFQUFxQjtBQUNwQixjQUFJRSxXQUFXYixTQUFmLEVBQTBCO0FBQ3pCLGlCQUFLL0YsZUFBTCxDQUFxQjBHLGdCQUFnQmpSLEdBQXJDLEVBQTBDbVIsV0FBV2xPLEVBQXJEO0FBQ0E7QUFDRDtBQUNEO0FBQ0Q7QUFDRDs7QUFFRHVMLGlDQUErQjtBQUM5QjFQLFdBQU9NLEtBQVAsQ0FBYXVDLEtBQWIsQ0FBbUIsd0JBQW5CO0FBQ0EsU0FBS3FQLHNDQUFMO0FBQ0EsU0FBS0Usb0NBQUw7QUFDQTtBQUVEOzs7OztBQUdBckwsb0JBQWtCUCxRQUFsQixFQUE0QkksWUFBNUIsRUFBMENDLE9BQTFDLEVBQW1EO0FBQ2xELFFBQUlMLFlBQVlJLFlBQVosSUFBNEJDLE9BQWhDLEVBQXlDO0FBQ3hDLFlBQU0rQyxPQUFPO0FBQ1pELGVBQU8sS0FBS3hILFFBREE7QUFFWndCLGNBQU02QyxRQUZNO0FBR1o5QyxpQkFBU2tELFlBSEc7QUFJWjBMLG1CQUFXekw7QUFKQyxPQUFiO0FBT0E3RyxhQUFPTSxLQUFQLENBQWF1QyxLQUFiLENBQW1CLCtCQUFuQjtBQUNBLFlBQU0wUCxhQUFhN0ksS0FBSzhJLElBQUwsQ0FBVSxxQ0FBVixFQUFpRDtBQUFFeFAsZ0JBQVE0RztBQUFWLE9BQWpELENBQW5COztBQUNBLFVBQUkySSxXQUFXRSxVQUFYLEtBQTBCLEdBQTFCLElBQWlDRixXQUFXM0ksSUFBNUMsSUFBb0QySSxXQUFXM0ksSUFBWCxDQUFnQkMsRUFBaEIsS0FBdUIsSUFBL0UsRUFBcUY7QUFDcEY3SixlQUFPTSxLQUFQLENBQWF1QyxLQUFiLENBQW1CLHlCQUFuQjtBQUNBO0FBQ0Q7QUFDRDtBQUVEOzs7OztBQUdBb0UscUJBQW1CVCxRQUFuQixFQUE2QkksWUFBN0IsRUFBMkNDLE9BQTNDLEVBQW9EO0FBQ25ELFFBQUlMLFlBQVlJLFlBQVosSUFBNEJDLE9BQWhDLEVBQXlDO0FBQ3hDLFlBQU0rQyxPQUFPO0FBQ1pELGVBQU8sS0FBS3hILFFBREE7QUFFWndCLGNBQU02QyxRQUZNO0FBR1o5QyxpQkFBU2tELFlBSEc7QUFJWjBMLG1CQUFXekw7QUFKQyxPQUFiO0FBT0E3RyxhQUFPTSxLQUFQLENBQWF1QyxLQUFiLENBQW1CLGtDQUFuQjtBQUNBLFlBQU0wUCxhQUFhN0ksS0FBSzhJLElBQUwsQ0FBVSx3Q0FBVixFQUFvRDtBQUFFeFAsZ0JBQVE0RztBQUFWLE9BQXBELENBQW5COztBQUNBLFVBQUkySSxXQUFXRSxVQUFYLEtBQTBCLEdBQTFCLElBQWlDRixXQUFXM0ksSUFBNUMsSUFBb0QySSxXQUFXM0ksSUFBWCxDQUFnQkMsRUFBaEIsS0FBdUIsSUFBL0UsRUFBcUY7QUFDcEY3SixlQUFPTSxLQUFQLENBQWF1QyxLQUFiLENBQW1CLDZCQUFuQjtBQUNBO0FBQ0Q7QUFDRDs7QUFFRHdELG9CQUFrQmEsYUFBbEIsRUFBaUM7QUFDaEMsUUFBSUEsYUFBSixFQUFtQjtBQUNsQixZQUFNTixlQUFlLEtBQUtSLGVBQUwsQ0FBcUJjLGNBQWN6RCxHQUFuQyxDQUFyQjs7QUFFQSxVQUFJbUQsZ0JBQWdCLElBQXBCLEVBQTBCO0FBQ3pCLGNBQU1nRCxPQUFPO0FBQ1pELGlCQUFPLEtBQUt4SCxRQURBO0FBRVptQyxjQUFJLEtBQUt3QyxZQUFMLENBQWtCSSxhQUFsQixDQUZRO0FBR1p4RCxtQkFBUyxLQUFLMEMsZUFBTCxDQUFxQmMsY0FBY3pELEdBQW5DLEVBQXdDVSxFQUhyQztBQUladU8sbUJBQVM7QUFKRyxTQUFiO0FBT0ExUyxlQUFPTSxLQUFQLENBQWF1QyxLQUFiLENBQW1CLDhCQUFuQixFQUFtRCtHLElBQW5EO0FBQ0EsY0FBTTJJLGFBQWE3SSxLQUFLOEksSUFBTCxDQUFVLG1DQUFWLEVBQStDO0FBQUV4UCxrQkFBUTRHO0FBQVYsU0FBL0MsQ0FBbkI7O0FBQ0EsWUFBSTJJLFdBQVdFLFVBQVgsS0FBMEIsR0FBMUIsSUFBaUNGLFdBQVczSSxJQUE1QyxJQUFvRDJJLFdBQVczSSxJQUFYLENBQWdCQyxFQUFoQixLQUF1QixJQUEvRSxFQUFxRjtBQUNwRjdKLGlCQUFPTSxLQUFQLENBQWF1QyxLQUFiLENBQW1CLDBCQUFuQjtBQUNBO0FBQ0Q7QUFDRDtBQUNEOztBQUVENEUsY0FBWWIsWUFBWixFQUEwQk0sYUFBMUIsRUFBeUM7QUFDeEMsUUFBSU4sZ0JBQWdCQSxhQUFhekMsRUFBakMsRUFBcUM7QUFDcEMsVUFBSXdPLFVBQVVDLHlCQUF5QjFMLGNBQWM5QyxDQUFkLElBQW1COEMsY0FBYzlDLENBQWQsQ0FBZ0JDLFFBQTVELENBQWQ7O0FBQ0EsVUFBSXNPLE9BQUosRUFBYTtBQUNaQSxrQkFBVW5TLE9BQU84SCxXQUFQLEdBQXFCdEIsT0FBckIsQ0FBNkIsS0FBN0IsRUFBb0MsRUFBcEMsSUFBMEMyTCxPQUFwRDtBQUNBOztBQUNELFlBQU0vSSxPQUFPO0FBQ1pELGVBQU8sS0FBS3hILFFBREE7QUFFWmtHLGNBQU1uQixjQUFjMUMsR0FGUjtBQUdaZCxpQkFBU2tELGFBQWF6QyxFQUhWO0FBSVpFLGtCQUFVNkMsY0FBYzlDLENBQWQsSUFBbUI4QyxjQUFjOUMsQ0FBZCxDQUFnQkMsUUFKakM7QUFLWndPLGtCQUFVRixPQUxFO0FBTVpHLG9CQUFZO0FBTkEsT0FBYjtBQVFBOVMsYUFBT00sS0FBUCxDQUFhdUMsS0FBYixDQUFtQix1QkFBbkIsRUFBNEMrRyxJQUE1QztBQUNBLFlBQU0ySSxhQUFhN0ksS0FBSzhJLElBQUwsQ0FBVSx3Q0FBVixFQUFvRDtBQUFFeFAsZ0JBQVE0RztBQUFWLE9BQXBELENBQW5COztBQUNBLFVBQUkySSxXQUFXRSxVQUFYLEtBQTBCLEdBQTFCLElBQWlDRixXQUFXM0ksSUFBNUMsSUFBb0QySSxXQUFXM0ksSUFBWCxDQUFnQjVFLE9BQXBFLElBQStFdU4sV0FBVzNJLElBQVgsQ0FBZ0I1RSxPQUFoQixDQUF3QnVJLE1BQXZHLElBQWlIZ0YsV0FBVzNJLElBQVgsQ0FBZ0I1RSxPQUFoQixDQUF3QlYsRUFBN0ksRUFBaUo7QUFDaEo1RCxtQkFBVzRDLE1BQVgsQ0FBa0JxRCxRQUFsQixDQUEyQm9NLHVCQUEzQixDQUFtRDdMLGNBQWNoRyxHQUFqRSxFQUFzRXFSLFdBQVczSSxJQUFYLENBQWdCNUUsT0FBaEIsQ0FBd0J1SSxNQUE5RixFQUFzR2dGLFdBQVczSSxJQUFYLENBQWdCNUUsT0FBaEIsQ0FBd0JWLEVBQTlIO0FBQ0F0RSxlQUFPTSxLQUFQLENBQWF1QyxLQUFiLENBQW9CLGVBQWVxRSxjQUFjaEcsR0FBSyxlQUFlcVIsV0FBVzNJLElBQVgsQ0FBZ0I1RSxPQUFoQixDQUF3QlYsRUFBSSxlQUFlaU8sV0FBVzNJLElBQVgsQ0FBZ0I1RSxPQUFoQixDQUF3QnVJLE1BQVEsRUFBaEo7QUFDQTtBQUNEO0FBQ0Q7QUFFRDs7Ozs7QUFHQTlFLG9CQUFrQjdCLFlBQWxCLEVBQWdDTSxhQUFoQyxFQUErQztBQUM5QyxRQUFJTixnQkFBZ0JBLGFBQWF6QyxFQUFqQyxFQUFxQztBQUNwQyxZQUFNeUYsT0FBTztBQUNaRCxlQUFPLEtBQUt4SCxRQURBO0FBRVptQyxZQUFJLEtBQUt3QyxZQUFMLENBQWtCSSxhQUFsQixDQUZRO0FBR1p4RCxpQkFBU2tELGFBQWF6QyxFQUhWO0FBSVprRSxjQUFNbkIsY0FBYzFDLEdBSlI7QUFLWmtPLGlCQUFTO0FBTEcsT0FBYjtBQU9BMVMsYUFBT00sS0FBUCxDQUFhdUMsS0FBYixDQUFtQiw2QkFBbkIsRUFBa0QrRyxJQUFsRDtBQUNBLFlBQU0ySSxhQUFhN0ksS0FBSzhJLElBQUwsQ0FBVSxtQ0FBVixFQUErQztBQUFFeFAsZ0JBQVE0RztBQUFWLE9BQS9DLENBQW5COztBQUNBLFVBQUkySSxXQUFXRSxVQUFYLEtBQTBCLEdBQTFCLElBQWlDRixXQUFXM0ksSUFBNUMsSUFBb0QySSxXQUFXM0ksSUFBWCxDQUFnQkMsRUFBaEIsS0FBdUIsSUFBL0UsRUFBcUY7QUFDcEY3SixlQUFPTSxLQUFQLENBQWF1QyxLQUFiLENBQW1CLDBCQUFuQjtBQUNBO0FBQ0Q7QUFDRDs7QUFFRGtPLHFCQUFtQnBJLFlBQW5CLEVBQWlDO0FBQ2hDM0ksV0FBT00sS0FBUCxDQUFhdUMsS0FBYixDQUFtQixjQUFuQixFQUFtQzhGLGFBQWFqRixPQUFiLENBQXFCUyxFQUF4RDtBQUNBLFVBQU02TyxXQUFXLEtBQUt6UyxNQUFMLENBQVlzSSxVQUFaLENBQXVCRixhQUFhakYsT0FBcEMsQ0FBakI7O0FBQ0EsUUFBSSxRQUFRc1AsUUFBWixFQUFzQjtBQUNyQixXQUFLdkgsZUFBTCxDQUFxQnVILFNBQVM5UixHQUE5QixFQUFtQ3lILGFBQWFqRixPQUFoRDtBQUNBO0FBQ0Q7O0FBRUQ2RCxtQkFBaUJvQixZQUFqQixFQUErQjtBQUM5QixRQUFJLENBQUVqSSxXQUFXQyxRQUFYLENBQW9COEIsR0FBcEIsQ0FBd0IsZ0NBQXhCLENBQU4sRUFBaUU7QUFDaEU7QUFDQTs7QUFFRCxRQUFJa0csYUFBYXJCLElBQWIsSUFBcUJxQixhQUFhckIsSUFBYixDQUFrQjJMLG9CQUFsQixLQUEyQ0MsU0FBcEUsRUFBK0U7QUFDOUUsWUFBTXRJLGdCQUFnQixLQUFLckssTUFBTCxDQUFZbUksVUFBWixDQUF1QkMsWUFBdkIsQ0FBdEI7QUFDQSxZQUFNOEIsYUFBYSxLQUFLbEssTUFBTCxDQUFZdUksT0FBWixDQUFvQkgsYUFBYS9FLElBQWpDLENBQW5CLENBRjhFLENBSTlFOztBQUNBLGFBQU8rRSxhQUFhcUYsT0FBcEIsQ0FMOEUsQ0FPOUU7QUFDQTs7QUFFQSxVQUFJckYsYUFBYU4sSUFBYixDQUFrQmhCLE9BQWxCLENBQTBCc0IsYUFBYXJCLElBQWIsQ0FBa0I2TCxTQUE1QyxJQUF5RCxDQUE3RCxFQUFnRTtBQUMvRHhLLHFCQUFhTixJQUFiLEdBQW9CTSxhQUFhckIsSUFBYixDQUFrQjZMLFNBQXRDO0FBQ0E7O0FBRUQsWUFBTTdPLEtBQUssSUFBSUMsSUFBSixDQUFTOEosU0FBUzFGLGFBQWFyRSxFQUFiLENBQWdCZ0ssS0FBaEIsQ0FBc0IsR0FBdEIsRUFBMkIsQ0FBM0IsQ0FBVCxJQUEwQyxJQUFuRCxDQUFYO0FBQ0EsWUFBTThFLGtCQUFrQjtBQUN2QmxTLGFBQUssS0FBS1gsTUFBTCxDQUFZMkksY0FBWixDQUEyQlAsYUFBYWpGLE9BQXhDLEVBQWlEaUYsYUFBYXJFLEVBQTlELENBRGtCO0FBRXZCQSxVQUZ1QjtBQUd2QmtFLHdCQUFnQjtBQUhPLE9BQXhCO0FBTUEsV0FBS2pJLE1BQUwsQ0FBWXNOLG9CQUFaLENBQWlDakQsYUFBakMsRUFBZ0RILFVBQWhELEVBQTREOUIsWUFBNUQsRUFBMEV5SyxlQUExRSxFQUEyRixLQUEzRjtBQUNBO0FBQ0Q7QUFFRDs7Ozs7QUFHQXRDLHdCQUFzQm5JLFlBQXRCLEVBQW9DO0FBQ25DLFFBQUlBLGFBQWEwSyxnQkFBakIsRUFBbUM7QUFDbEMsWUFBTXpJLGdCQUFnQixLQUFLckssTUFBTCxDQUFZbUksVUFBWixDQUF1QkMsWUFBdkIsQ0FBdEI7QUFDQSxZQUFNOEIsYUFBYS9KLFdBQVc0QyxNQUFYLENBQWtCcUksS0FBbEIsQ0FBd0JuSSxXQUF4QixDQUFvQyxZQUFwQyxFQUFrRDtBQUFFK0ssZ0JBQVE7QUFBRWxLLG9CQUFVO0FBQVo7QUFBVixPQUFsRCxDQUFuQjs7QUFFQSxVQUFJdUcsaUJBQWlCSCxVQUFyQixFQUFpQztBQUNoQztBQUNBLFlBQUlpRCxlQUFlaE4sV0FBVzRDLE1BQVgsQ0FBa0JxRCxRQUFsQixDQUNqQm9JLDZCQURpQixDQUNhcEcsYUFBYTBLLGdCQUFiLENBQThCOUYsTUFEM0MsRUFDbUQ1RSxhQUFhMEssZ0JBQWIsQ0FBOEIvTyxFQURqRixDQUFuQjs7QUFHQSxZQUFJLENBQUNvSixZQUFMLEVBQW1CO0FBQ2xCO0FBQ0EsZ0JBQU14TSxNQUFNLEtBQUtYLE1BQUwsQ0FBWTJJLGNBQVosQ0FBMkJQLGFBQWFqRixPQUF4QyxFQUFpRGlGLGFBQWEwSyxnQkFBYixDQUE4Qi9PLEVBQS9FLENBQVo7O0FBQ0FvSix5QkFBZWhOLFdBQVc0QyxNQUFYLENBQWtCcUQsUUFBbEIsQ0FBMkJuRCxXQUEzQixDQUF1Q3RDLEdBQXZDLENBQWY7QUFDQTs7QUFFRCxZQUFJd00sWUFBSixFQUFrQjtBQUNqQmhOLHFCQUFXNFMsYUFBWCxDQUF5QjVGLFlBQXpCLEVBQXVDakQsVUFBdkM7QUFDQXpLLGlCQUFPTSxLQUFQLENBQWF1QyxLQUFiLENBQW1CLGlDQUFuQjtBQUNBO0FBQ0Q7QUFDRDtBQUNEO0FBRUQ7Ozs7O0FBR0F1RSx3QkFBc0J1QixZQUF0QixFQUFvQztBQUNuQyxRQUFJQSxhQUFhMEssZ0JBQWpCLEVBQW1DO0FBQ2xDLFlBQU1FLGFBQWE3UyxXQUFXNEMsTUFBWCxDQUFrQnFELFFBQWxCLENBQTJCbkQsV0FBM0IsQ0FBdUMsS0FBS2pELE1BQUwsQ0FBWTJJLGNBQVosQ0FBMkJQLGFBQWFqRixPQUF4QyxFQUFpRGlGLGFBQWEzRCxPQUFiLENBQXFCVixFQUF0RSxDQUF2QyxDQUFuQixDQURrQyxDQUdsQzs7QUFDQSxVQUFJaVAsY0FBZTVLLGFBQWEzRCxPQUFiLENBQXFCcUQsSUFBckIsS0FBOEJrTCxXQUFXL08sR0FBNUQsRUFBa0U7QUFDakUsY0FBTW9HLGdCQUFnQixLQUFLckssTUFBTCxDQUFZbUksVUFBWixDQUF1QkMsWUFBdkIsQ0FBdEI7QUFDQSxjQUFNOEIsYUFBYTlCLGFBQWEwSyxnQkFBYixDQUE4QnpQLElBQTlCLEdBQXFDLEtBQUtyRCxNQUFMLENBQVl5SSxRQUFaLENBQXFCTCxhQUFhMEssZ0JBQWIsQ0FBOEJ6UCxJQUFuRCxLQUE0RCxLQUFLckQsTUFBTCxDQUFZMEksT0FBWixDQUFvQk4sYUFBYTBLLGdCQUFiLENBQThCelAsSUFBbEQsQ0FBakcsR0FBMkosSUFBOUs7QUFFQSxjQUFNOEosZUFBZTtBQUNwQjtBQUNBeE0sZUFBSyxLQUFLWCxNQUFMLENBQVkySSxjQUFaLENBQTJCUCxhQUFhakYsT0FBeEMsRUFBaURpRixhQUFhMEssZ0JBQWIsQ0FBOEIvTyxFQUEvRSxDQUZlO0FBR3BCYixlQUFLbUgsY0FBYzFKLEdBSEM7QUFJcEJzRCxlQUFLLEtBQUtqRSxNQUFMLENBQVkyTixtQ0FBWixDQUFnRHZGLGFBQWEzRCxPQUFiLENBQXFCcUQsSUFBckUsQ0FKZTtBQUtwQkcsMEJBQWdCLElBTEksQ0FLRTs7QUFMRixTQUFyQjtBQVFBOUgsbUJBQVc4UyxhQUFYLENBQXlCOUYsWUFBekIsRUFBdUNqRCxVQUF2QztBQUNBekssZUFBT00sS0FBUCxDQUFhdUMsS0FBYixDQUFtQixpQ0FBbkI7QUFDQTtBQUNEO0FBQ0Q7QUFFRDs7Ozs7QUFHQW1PLG9CQUFrQnJJLFlBQWxCLEVBQWdDb0YsV0FBaEMsRUFBNkM7QUFDNUMsVUFBTW5ELGdCQUFnQixLQUFLckssTUFBTCxDQUFZbUksVUFBWixDQUF1QkMsWUFBdkIsQ0FBdEI7QUFDQSxRQUFJOEIsYUFBYSxJQUFqQjs7QUFDQSxRQUFJOUIsYUFBYXFGLE9BQWIsS0FBeUIsYUFBN0IsRUFBNEM7QUFDM0N2RCxtQkFBYS9KLFdBQVc0QyxNQUFYLENBQWtCcUksS0FBbEIsQ0FBd0JuSSxXQUF4QixDQUFvQyxZQUFwQyxFQUFrRDtBQUFFK0ssZ0JBQVE7QUFBRWxLLG9CQUFVO0FBQVo7QUFBVixPQUFsRCxDQUFiO0FBQ0EsS0FGRCxNQUVPO0FBQ05vRyxtQkFBYTlCLGFBQWEvRSxJQUFiLEdBQW9CLEtBQUtyRCxNQUFMLENBQVl5SSxRQUFaLENBQXFCTCxhQUFhL0UsSUFBbEMsS0FBMkMsS0FBS3JELE1BQUwsQ0FBWTBJLE9BQVosQ0FBb0JOLGFBQWEvRSxJQUFqQyxDQUEvRCxHQUF3RyxJQUFySDtBQUNBOztBQUNELFFBQUlnSCxpQkFBaUJILFVBQXJCLEVBQWlDO0FBQ2hDLFlBQU0ySSxrQkFBa0I7QUFDdkJsUyxhQUFLLEtBQUtYLE1BQUwsQ0FBWTJJLGNBQVosQ0FBMkJQLGFBQWFqRixPQUF4QyxFQUFpRGlGLGFBQWFyRSxFQUE5RCxDQURrQjtBQUV2QkEsWUFBSSxJQUFJQyxJQUFKLENBQVM4SixTQUFTMUYsYUFBYXJFLEVBQWIsQ0FBZ0JnSyxLQUFoQixDQUFzQixHQUF0QixFQUEyQixDQUEzQixDQUFULElBQTBDLElBQW5EO0FBRm1CLE9BQXhCOztBQUlBLFVBQUlQLFdBQUosRUFBaUI7QUFDaEJxRix3QkFBZ0JLLFFBQWhCLEdBQTJCLGFBQTNCO0FBQ0E7O0FBQ0QsVUFBSTtBQUNILGFBQUtsVCxNQUFMLENBQVlzTixvQkFBWixDQUFpQ2pELGFBQWpDLEVBQWdESCxVQUFoRCxFQUE0RDlCLFlBQTVELEVBQTBFeUssZUFBMUUsRUFBMkZyRixXQUEzRjtBQUNBLE9BRkQsQ0FFRSxPQUFPakQsQ0FBUCxFQUFVO0FBQ1g7QUFDQTtBQUNBLFlBQUlBLEVBQUVuSCxJQUFGLEtBQVcsWUFBWCxJQUEyQm1ILEVBQUU0SSxJQUFGLEtBQVcsS0FBMUMsRUFBaUQ7QUFDaEQ7QUFDQTs7QUFFRCxjQUFNNUksQ0FBTjtBQUNBO0FBQ0Q7QUFDRDs7QUFFRDZJLG9CQUFrQi9JLGFBQWxCLEVBQWlDakMsWUFBakMsRUFBK0M7QUFDOUMsVUFBTWlMLGtCQUFrQmxULFdBQVdDLFFBQVgsQ0FBb0I4QixHQUFwQixDQUF3Qiw2QkFBeEIsQ0FBeEI7O0FBQ0EsUUFBSWtHLGFBQWF0RSxRQUFiLEtBQTBCNk8sU0FBMUIsSUFBdUNVLGVBQXZDLElBQTBEakwsYUFBYXRFLFFBQWIsQ0FBc0I2SyxLQUF0QixDQUE0QjBFLGVBQTVCLENBQTlELEVBQTRHO0FBQzNHO0FBQ0E7O0FBRUQsVUFBTWxHLGVBQWU7QUFDcEJsSixXQUFLLEtBQUtqRSxNQUFMLENBQVkyTixtQ0FBWixDQUFnRHZGLGFBQWFOLElBQTdELENBRGU7QUFFcEI1RSxXQUFLbUgsY0FBYzFKLEdBRkM7QUFHcEIyUyxXQUFLLElBSGU7QUFJcEJoTSxtQkFBYWMsYUFBYWQsV0FKTjtBQUtwQnhELGdCQUFVc0UsYUFBYXRFLFFBQWIsSUFBeUJzRSxhQUFhNEU7QUFMNUIsS0FBckI7QUFPQSxTQUFLaE4sTUFBTCxDQUFZaU4sYUFBWixDQUEwQjdFLGFBQWF0RSxRQUFiLElBQXlCc0UsYUFBYTRFLE1BQWhFLEVBQXdFRyxZQUF4RTs7QUFDQSxRQUFJL0UsYUFBYW1MLEtBQWpCLEVBQXdCO0FBQ3ZCcEcsbUJBQWFxRyxLQUFiLEdBQXFCcEwsYUFBYW1MLEtBQWIsQ0FBbUJDLEtBQXhDO0FBQ0E7O0FBQ0QsV0FBT3JHLFlBQVA7QUFDQTs7QUFFRHNHLG1CQUFpQnZKLFVBQWpCLEVBQTZCOUIsWUFBN0IsRUFBMkM7QUFDMUMsV0FBTyxLQUFLcEksTUFBTCxDQUFZaU4sYUFBWixDQUEwQi9DLFdBQVdwRyxRQUFyQyxFQUErQztBQUNyREcsV0FBTSxJQUFJLEtBQUtqRSxNQUFMLENBQVkyTixtQ0FBWixDQUFnRHZGLGFBQWFOLElBQTdELENBQW9FO0FBRHpCLEtBQS9DLENBQVA7QUFHQTs7QUFFRDRMLDRCQUEwQnJKLGFBQTFCLEVBQXlDSCxVQUF6QyxFQUFxRDlCLFlBQXJELEVBQW1Fb0YsV0FBbkUsRUFBZ0Y7QUFDL0UsUUFBSUEsV0FBSixFQUFpQjtBQUNoQnJOLGlCQUFXNEMsTUFBWCxDQUFrQnFELFFBQWxCLENBQTJCdU4sK0JBQTNCLENBQTJEdEosY0FBYzFKLEdBQXpFLEVBQThFdUosVUFBOUUsRUFBMEY7QUFBRW5HLFlBQUksSUFBSUMsSUFBSixDQUFTOEosU0FBUzFGLGFBQWFyRSxFQUFiLENBQWdCZ0ssS0FBaEIsQ0FBc0IsR0FBdEIsRUFBMkIsQ0FBM0IsQ0FBVCxJQUEwQyxJQUFuRCxDQUFOO0FBQWdFbUYsa0JBQVU7QUFBMUUsT0FBMUY7QUFDQSxLQUZELE1BRU87QUFDTi9TLGlCQUFXeVQsYUFBWCxDQUF5QnZKLGNBQWMxSixHQUF2QyxFQUE0Q3VKLFVBQTVDO0FBQ0E7QUFDRDs7QUFFRDJKLDBCQUF3QnhKLGFBQXhCLEVBQXVDSCxVQUF2QyxFQUFtRDlCLFlBQW5ELEVBQWlFb0YsV0FBakUsRUFBOEU7QUFDN0UsUUFBSXBGLGFBQWEwTCxPQUFqQixFQUEwQjtBQUN6QixZQUFNQSxVQUFVMUwsYUFBYTBMLE9BQWIsR0FBdUIsS0FBSzlULE1BQUwsQ0FBWXlJLFFBQVosQ0FBcUJMLGFBQWEwTCxPQUFsQyxLQUE4QyxLQUFLOVQsTUFBTCxDQUFZMEksT0FBWixDQUFvQk4sYUFBYTBMLE9BQWpDLENBQXJFLEdBQWlILElBQWpJOztBQUNBLFVBQUl0RyxXQUFKLEVBQWlCO0FBQ2hCck4sbUJBQVc0QyxNQUFYLENBQWtCcUQsUUFBbEIsQ0FBMkIyTixnQ0FBM0IsQ0FBNEQxSixjQUFjMUosR0FBMUUsRUFBK0V1SixVQUEvRSxFQUEyRjtBQUMxRm5HLGNBQUksSUFBSUMsSUFBSixDQUFTOEosU0FBUzFGLGFBQWFyRSxFQUFiLENBQWdCZ0ssS0FBaEIsQ0FBc0IsR0FBdEIsRUFBMkIsQ0FBM0IsQ0FBVCxJQUEwQyxJQUFuRCxDQURzRjtBQUUxRmxLLGFBQUc7QUFDRmxELGlCQUFLbVQsUUFBUW5ULEdBRFg7QUFFRm1ELHNCQUFVZ1EsUUFBUWhRO0FBRmhCLFdBRnVGO0FBTTFGb1Asb0JBQVU7QUFOZ0YsU0FBM0Y7QUFRQSxPQVRELE1BU087QUFDTi9TLG1CQUFXeVQsYUFBWCxDQUF5QnZKLGNBQWMxSixHQUF2QyxFQUE0Q3VKLFVBQTVDLEVBQXdENEosT0FBeEQ7QUFDQTtBQUNEO0FBQ0Q7O0FBRURFLHNCQUFvQjNKLGFBQXBCLEVBQW1DSCxVQUFuQyxFQUErQzlCLFlBQS9DLEVBQTZEb0YsV0FBN0QsRUFBMEU7QUFDekUsUUFBSUEsV0FBSixFQUFpQjtBQUNoQnJOLGlCQUFXNEMsTUFBWCxDQUFrQnFELFFBQWxCLENBQTJCNk4sZ0NBQTNCLENBQTRENUosY0FBYzFKLEdBQTFFLEVBQStFdUosVUFBL0UsRUFBMkY7QUFDMUZuRyxZQUFJLElBQUlDLElBQUosQ0FBUzhKLFNBQVMxRixhQUFhckUsRUFBYixDQUFnQmdLLEtBQWhCLENBQXNCLEdBQXRCLEVBQTJCLENBQTNCLENBQVQsSUFBMEMsSUFBbkQsQ0FEc0Y7QUFFMUZtRixrQkFBVTtBQUZnRixPQUEzRjtBQUlBLEtBTEQsTUFLTztBQUNOL1MsaUJBQVcrVCxrQkFBWCxDQUE4QjdKLGNBQWMxSixHQUE1QyxFQUFpRHVKLFVBQWpEO0FBQ0E7QUFDRDs7QUFFRGlLLHNCQUFvQjlKLGFBQXBCLEVBQW1DSCxVQUFuQyxFQUErQzlCLFlBQS9DLEVBQTZEb0YsV0FBN0QsRUFBMEU7QUFDekUsUUFBSUEsV0FBSixFQUFpQjtBQUNoQnJOLGlCQUFXNEMsTUFBWCxDQUFrQnFELFFBQWxCLENBQTJCZ08scURBQTNCLENBQWlGLG9CQUFqRixFQUF1Ry9KLGNBQWMxSixHQUFySCxFQUEwSHlILGFBQWEyQyxLQUF2SSxFQUE4SWIsVUFBOUksRUFBMEo7QUFBRW5HLFlBQUksSUFBSUMsSUFBSixDQUFTOEosU0FBUzFGLGFBQWFyRSxFQUFiLENBQWdCZ0ssS0FBaEIsQ0FBc0IsR0FBdEIsRUFBMkIsQ0FBM0IsQ0FBVCxJQUEwQyxJQUFuRCxDQUFOO0FBQWdFbUYsa0JBQVU7QUFBMUUsT0FBMUo7QUFDQSxLQUZELE1BRU87QUFDTi9TLGlCQUFXa1UsYUFBWCxDQUF5QmhLLGNBQWMxSixHQUF2QyxFQUE0Q3lILGFBQWEyQyxLQUF6RCxFQUFnRWIsVUFBaEUsRUFBNEUsS0FBNUU7QUFDQTtBQUNEOztBQUVEb0ssd0JBQXNCakssYUFBdEIsRUFBcUNILFVBQXJDLEVBQWlEOUIsWUFBakQsRUFBK0RvRixXQUEvRCxFQUE0RTtBQUMzRSxRQUFJQSxXQUFKLEVBQWlCO0FBQ2hCck4saUJBQVc0QyxNQUFYLENBQWtCcUQsUUFBbEIsQ0FBMkJnTyxxREFBM0IsQ0FBaUYsb0JBQWpGLEVBQXVHL0osY0FBYzFKLEdBQXJILEVBQTBIeUgsYUFBYTZDLE9BQXZJLEVBQWdKZixVQUFoSixFQUE0SjtBQUFFbkcsWUFBSSxJQUFJQyxJQUFKLENBQVM4SixTQUFTMUYsYUFBYXJFLEVBQWIsQ0FBZ0JnSyxLQUFoQixDQUFzQixHQUF0QixFQUEyQixDQUEzQixDQUFULElBQTBDLElBQW5ELENBQU47QUFBZ0VtRixrQkFBVTtBQUExRSxPQUE1SjtBQUNBLEtBRkQsTUFFTztBQUNOL1MsaUJBQVdrVSxhQUFYLENBQXlCaEssY0FBYzFKLEdBQXZDLEVBQTRDeUgsYUFBYTZDLE9BQXpELEVBQWtFZixVQUFsRSxFQUE4RSxLQUE5RTtBQUNBO0FBQ0Q7O0FBRURxSyxxQkFBbUJsSyxhQUFuQixFQUFrQ0gsVUFBbEMsRUFBOEM5QixZQUE5QyxFQUE0RG9GLFdBQTVELEVBQXlFO0FBQ3hFLFFBQUlBLFdBQUosRUFBaUI7QUFDaEJyTixpQkFBVzRDLE1BQVgsQ0FBa0JxRCxRQUFsQixDQUEyQm9PLDBDQUEzQixDQUFzRW5LLGNBQWMxSixHQUFwRixFQUF5RnlILGFBQWFoRixJQUF0RyxFQUE0RzhHLFVBQTVHLEVBQXdIO0FBQUVuRyxZQUFJLElBQUlDLElBQUosQ0FBUzhKLFNBQVMxRixhQUFhckUsRUFBYixDQUFnQmdLLEtBQWhCLENBQXNCLEdBQXRCLEVBQTJCLENBQTNCLENBQVQsSUFBMEMsSUFBbkQsQ0FBTjtBQUFnRW1GLGtCQUFVO0FBQTFFLE9BQXhIO0FBQ0EsS0FGRCxNQUVPO0FBQ04vUyxpQkFBV3NVLFlBQVgsQ0FBd0JwSyxjQUFjMUosR0FBdEMsRUFBMkN5SCxhQUFhaEYsSUFBeEQsRUFBOEQ4RyxVQUE5RCxFQUEwRSxLQUExRTtBQUNBO0FBQ0Q7O0FBRUR3SyxzQkFBb0JySyxhQUFwQixFQUFtQ0gsVUFBbkMsRUFBK0M5QixZQUEvQyxFQUE2RG9GLFdBQTdELEVBQTBFO0FBQ3pFLFFBQUlwRixhQUFhckIsSUFBYixJQUFxQnFCLGFBQWFyQixJQUFiLENBQWtCMkwsb0JBQWxCLEtBQTJDQyxTQUFwRSxFQUErRTtBQUM5RSxZQUFNZ0MsVUFBVTtBQUNmQyxvQkFBYSxTQUFTeE0sYUFBYXJFLEVBQWIsQ0FBZ0IwQyxPQUFoQixDQUF3QixLQUF4QixFQUErQixHQUEvQixDQUFxQyxFQUQ1QztBQUVmckQsY0FBTWdGLGFBQWFyQixJQUFiLENBQWtCM0QsSUFGVDtBQUdmeVIsY0FBTXpNLGFBQWFyQixJQUFiLENBQWtCOE4sSUFIVDtBQUlmdFUsY0FBTTZILGFBQWFyQixJQUFiLENBQWtCK04sUUFKVDtBQUtmNVIsYUFBS21ILGNBQWMxSjtBQUxKLE9BQWhCO0FBT0EsYUFBTyxLQUFLb1UsbUJBQUwsQ0FBeUJKLE9BQXpCLEVBQWtDdk0sYUFBYXJCLElBQWIsQ0FBa0IyTCxvQkFBcEQsRUFBMEV4SSxVQUExRSxFQUFzRkcsYUFBdEYsRUFBcUcsSUFBSXJHLElBQUosQ0FBUzhKLFNBQVMxRixhQUFhckUsRUFBYixDQUFnQmdLLEtBQWhCLENBQXNCLEdBQXRCLEVBQTJCLENBQTNCLENBQVQsSUFBMEMsSUFBbkQsQ0FBckcsRUFBK0pQLFdBQS9KLENBQVA7QUFDQTtBQUNEOztBQUVEd0gsMkJBQXlCM0ssYUFBekIsRUFBd0NILFVBQXhDLEVBQW9EOUIsWUFBcEQsRUFBa0VvRixXQUFsRSxFQUErRTtBQUM5RSxRQUFJcEYsYUFBYWQsV0FBYixJQUE0QmMsYUFBYWQsV0FBYixDQUF5QixDQUF6QixDQUE1QixJQUEyRGMsYUFBYWQsV0FBYixDQUF5QixDQUF6QixFQUE0QlEsSUFBM0YsRUFBaUc7QUFDaEcsWUFBTXFGLGVBQWU7QUFDcEJqSyxhQUFLbUgsY0FBYzFKLEdBREM7QUFFcEJzVSxXQUFHLGdCQUZpQjtBQUdwQmhSLGFBQUssRUFIZTtBQUlwQkosV0FBRztBQUNGbEQsZUFBS3VKLFdBQVd2SixHQURkO0FBRUZtRCxvQkFBVW9HLFdBQVdwRztBQUZuQixTQUppQjtBQVFwQndELHFCQUFhLENBQUM7QUFDYlEsZ0JBQU8sS0FBSzlILE1BQUwsQ0FBWTJOLG1DQUFaLENBQWdEdkYsYUFBYWQsV0FBYixDQUF5QixDQUF6QixFQUE0QlEsSUFBNUUsQ0FETTtBQUVib04sdUJBQWM5TSxhQUFhZCxXQUFiLENBQXlCLENBQXpCLEVBQTRCNk4sY0FGN0I7QUFHYkMsdUJBQWMvQyx5QkFBeUJqSyxhQUFhZCxXQUFiLENBQXlCLENBQXpCLEVBQTRCNk4sY0FBckQsQ0FIRDtBQUlicFIsY0FBSyxJQUFJQyxJQUFKLENBQVM4SixTQUFTMUYsYUFBYWQsV0FBYixDQUF5QixDQUF6QixFQUE0QnZELEVBQTVCLENBQStCZ0ssS0FBL0IsQ0FBcUMsR0FBckMsRUFBMEMsQ0FBMUMsQ0FBVCxJQUF5RCxJQUFsRTtBQUpRLFNBQUQ7QUFSTyxPQUFyQjs7QUFnQkEsVUFBSSxDQUFDUCxXQUFMLEVBQWtCO0FBQ2pCck4sbUJBQVc0QyxNQUFYLENBQWtCcUQsUUFBbEIsQ0FBMkJpUCxzQkFBM0IsQ0FBbUQsU0FBU2pOLGFBQWFkLFdBQWIsQ0FBeUIsQ0FBekIsRUFBNEJnTyxVQUFZLElBQUlsTixhQUFhZCxXQUFiLENBQXlCLENBQXpCLEVBQTRCdkQsRUFBNUIsQ0FBK0IwQyxPQUEvQixDQUF1QyxLQUF2QyxFQUE4QyxHQUE5QyxDQUFvRCxFQUE1SixFQUErSjBHLGFBQWF0SixDQUE1SyxFQUErSyxJQUEvSyxFQUFxTCxJQUFJRyxJQUFKLENBQVM4SixTQUFTMUYsYUFBYXJFLEVBQWIsQ0FBZ0JnSyxLQUFoQixDQUFzQixHQUF0QixFQUEyQixDQUEzQixDQUFULElBQTBDLElBQW5ELENBQXJMO0FBQ0E7O0FBRUQsYUFBT1osWUFBUDtBQUNBLEtBdEJELE1Bc0JPO0FBQ04xTixhQUFPTSxLQUFQLENBQWF5RSxLQUFiLENBQW1CLGdDQUFuQjtBQUNBO0FBQ0Q7O0FBRURrSix5QkFBdUJyRCxhQUF2QixFQUFzQ0gsVUFBdEMsRUFBa0Q5QixZQUFsRCxFQUFnRW9GLFdBQWhFLEVBQTZFO0FBQzVFLFlBQVFwRixhQUFhcUYsT0FBckI7QUFDQyxXQUFLLGFBQUw7QUFDQyxlQUFPLEtBQUsyRixpQkFBTCxDQUF1Qi9JLGFBQXZCLEVBQXNDakMsWUFBdEMsQ0FBUDs7QUFDRCxXQUFLLFlBQUw7QUFDQyxlQUFPLEtBQUtxTCxnQkFBTCxDQUFzQnZKLFVBQXRCLEVBQWtDOUIsWUFBbEMsQ0FBUDs7QUFDRCxXQUFLLGNBQUw7QUFDQyxlQUFPLEtBQUtzTCx5QkFBTCxDQUErQnJKLGFBQS9CLEVBQThDSCxVQUE5QyxFQUEwRDlCLFlBQTFELEVBQXdFb0YsV0FBeEUsQ0FBUDs7QUFDRCxXQUFLLFlBQUw7QUFDQyxlQUFPLEtBQUtxRyx1QkFBTCxDQUE2QnhKLGFBQTdCLEVBQTRDSCxVQUE1QyxFQUF3RDlCLFlBQXhELEVBQXNFb0YsV0FBdEUsQ0FBUDs7QUFDRCxXQUFLLGVBQUw7QUFDQSxXQUFLLGFBQUw7QUFDQyxlQUFPLEtBQUt3RyxtQkFBTCxDQUF5QjNKLGFBQXpCLEVBQXdDSCxVQUF4QyxFQUFvRDlCLFlBQXBELEVBQWtFb0YsV0FBbEUsQ0FBUDs7QUFDRCxXQUFLLGVBQUw7QUFDQSxXQUFLLGFBQUw7QUFDQyxlQUFPLEtBQUsyRyxtQkFBTCxDQUF5QjlKLGFBQXpCLEVBQXdDSCxVQUF4QyxFQUFvRDlCLFlBQXBELEVBQWtFb0YsV0FBbEUsQ0FBUDs7QUFDRCxXQUFLLGlCQUFMO0FBQ0EsV0FBSyxlQUFMO0FBQ0MsZUFBTyxLQUFLOEcscUJBQUwsQ0FBMkJqSyxhQUEzQixFQUEwQ0gsVUFBMUMsRUFBc0Q5QixZQUF0RCxFQUFvRW9GLFdBQXBFLENBQVA7O0FBQ0QsV0FBSyxjQUFMO0FBQ0EsV0FBSyxZQUFMO0FBQ0MsZUFBTyxLQUFLK0csa0JBQUwsQ0FBd0JsSyxhQUF4QixFQUF1Q0gsVUFBdkMsRUFBbUQ5QixZQUFuRCxFQUFpRW9GLFdBQWpFLENBQVA7O0FBQ0QsV0FBSyxpQkFBTDtBQUNBLFdBQUssZUFBTDtBQUNDLFlBQUksQ0FBQ0EsV0FBTCxFQUFrQjtBQUNqQnJOLHFCQUFXb1YsV0FBWCxDQUF1QmxMLGFBQXZCO0FBQ0E7O0FBQ0Q7O0FBQ0QsV0FBSyxtQkFBTDtBQUNBLFdBQUssaUJBQUw7QUFDQyxZQUFJLENBQUNtRCxXQUFMLEVBQWtCO0FBQ2pCck4scUJBQVdxVixhQUFYLENBQXlCbkwsYUFBekI7QUFDQTs7QUFDRDs7QUFDRCxXQUFLLFlBQUw7QUFDQyxlQUFPLEtBQUtxSyxtQkFBTCxDQUF5QnJLLGFBQXpCLEVBQXdDSCxVQUF4QyxFQUFvRDlCLFlBQXBELEVBQWtFb0YsV0FBbEUsQ0FBUDs7QUFDRCxXQUFLLGNBQUw7QUFDQy9OLGVBQU9NLEtBQVAsQ0FBYXlFLEtBQWIsQ0FBbUIsOEJBQW5CO0FBQ0E7O0FBQ0QsV0FBSyxjQUFMO0FBQ0MvRSxlQUFPTSxLQUFQLENBQWF5RSxLQUFiLENBQW1CLGdDQUFuQjtBQUNBOztBQUNELFdBQUssYUFBTDtBQUNDLGVBQU8sS0FBS3dRLHdCQUFMLENBQThCM0ssYUFBOUIsRUFBNkNILFVBQTdDLEVBQXlEOUIsWUFBekQsRUFBdUVvRixXQUF2RSxDQUFQOztBQUNELFdBQUssZUFBTDtBQUNDL04sZUFBT00sS0FBUCxDQUFheUUsS0FBYixDQUFtQiwrQkFBbkI7QUFDQTtBQTdDRjtBQStDQTtBQUVEOzs7Ozs7OztBQVFBOzs7QUFDQXVRLHNCQUFvQkosT0FBcEIsRUFBNkJjLFlBQTdCLEVBQTJDdkwsVUFBM0MsRUFBdURHLGFBQXZELEVBQXNFcUwsU0FBdEUsRUFBaUZsSSxXQUFqRixFQUE4RjtBQUM3RixVQUFNbUksZ0JBQWdCLFNBQVMvUyxJQUFULENBQWM2UyxZQUFkLElBQThCNUcsS0FBOUIsR0FBc0NELElBQTVEO0FBQ0EsVUFBTWdILFlBQVlqSixJQUFJa0osS0FBSixDQUFVSixZQUFWLEVBQXdCLElBQXhCLENBQWxCO0FBQ0FHLGNBQVVFLE9BQVYsR0FBb0I7QUFBRUMscUJBQWdCLFVBQVUsS0FBS25VLFFBQVU7QUFBM0MsS0FBcEI7QUFDQStULGtCQUFjelQsR0FBZCxDQUFrQjBULFNBQWxCLEVBQTZCM1YsT0FBT29QLGVBQVAsQ0FBd0IyRyxNQUFELElBQVk7QUFDL0QsWUFBTUMsWUFBWUMsV0FBV0MsUUFBWCxDQUFvQixTQUFwQixDQUFsQjtBQUVBRixnQkFBVUcsTUFBVixDQUFpQnpCLE9BQWpCLEVBQTBCcUIsTUFBMUIsRUFBa0MsQ0FBQ2pRLEdBQUQsRUFBTWdCLElBQU4sS0FBZTtBQUNoRCxZQUFJaEIsR0FBSixFQUFTO0FBQ1IsZ0JBQU0sSUFBSXNRLEtBQUosQ0FBVXRRLEdBQVYsQ0FBTjtBQUNBLFNBRkQsTUFFTztBQUNOLGdCQUFNNEcsTUFBTTVGLEtBQUs0RixHQUFMLENBQVNsRyxPQUFULENBQWlCeEcsT0FBTzhILFdBQVAsRUFBakIsRUFBdUMsR0FBdkMsQ0FBWjtBQUNBLGdCQUFNTCxhQUFhO0FBQ2xCNE8sbUJBQU92UCxLQUFLM0QsSUFETTtBQUVsQnVFLHdCQUFZZ0Y7QUFGTSxXQUFuQjs7QUFLQSxjQUFJLGFBQWEvSixJQUFiLENBQWtCbUUsS0FBS3hHLElBQXZCLENBQUosRUFBa0M7QUFDakNtSCx1QkFBVzZPLFNBQVgsR0FBdUI1SixHQUF2QjtBQUNBakYsdUJBQVc4TyxVQUFYLEdBQXdCelAsS0FBS3hHLElBQTdCO0FBQ0FtSCx1QkFBVytPLFVBQVgsR0FBd0IxUCxLQUFLOE4sSUFBN0I7QUFDQW5OLHVCQUFXZ1AsZ0JBQVgsR0FBOEIzUCxLQUFLNFAsUUFBTCxJQUFpQjVQLEtBQUs0UCxRQUFMLENBQWM5QixJQUE3RDtBQUNBOztBQUNELGNBQUksYUFBYWpTLElBQWIsQ0FBa0JtRSxLQUFLeEcsSUFBdkIsQ0FBSixFQUFrQztBQUNqQ21ILHVCQUFXa1AsU0FBWCxHQUF1QmpLLEdBQXZCO0FBQ0FqRix1QkFBV21QLFVBQVgsR0FBd0I5UCxLQUFLeEcsSUFBN0I7QUFDQW1ILHVCQUFXb1AsVUFBWCxHQUF3Qi9QLEtBQUs4TixJQUE3QjtBQUNBOztBQUNELGNBQUksYUFBYWpTLElBQWIsQ0FBa0JtRSxLQUFLeEcsSUFBdkIsQ0FBSixFQUFrQztBQUNqQ21ILHVCQUFXcVAsU0FBWCxHQUF1QnBLLEdBQXZCO0FBQ0FqRix1QkFBV3NQLFVBQVgsR0FBd0JqUSxLQUFLeEcsSUFBN0I7QUFDQW1ILHVCQUFXdVAsVUFBWCxHQUF3QmxRLEtBQUs4TixJQUE3QjtBQUNBOztBQUVELGdCQUFNNVEsTUFBTTtBQUNYZixpQkFBS3lSLFFBQVF6UixHQURGO0FBRVhhLGdCQUFJMlIsU0FGTztBQUdYelIsaUJBQUssRUFITTtBQUlYOEMsa0JBQU07QUFDTHBHLG1CQUFLb0csS0FBS3BHO0FBREwsYUFKSztBQU9YdVcsdUJBQVcsS0FQQTtBQVFYNVAseUJBQWEsQ0FBQ0ksVUFBRDtBQVJGLFdBQVo7O0FBV0EsY0FBSThGLFdBQUosRUFBaUI7QUFDaEJ2SixnQkFBSWlQLFFBQUosR0FBZSxhQUFmO0FBQ0E7O0FBRUQsY0FBSXlCLFFBQVFDLFVBQVIsSUFBdUIsT0FBT0QsUUFBUUMsVUFBZixLQUE4QixRQUF6RCxFQUFvRTtBQUNuRTNRLGdCQUFJdEQsR0FBSixHQUFVZ1UsUUFBUUMsVUFBbEI7QUFDQTs7QUFFRCxpQkFBT3pVLFdBQVdzTyxXQUFYLENBQXVCdkUsVUFBdkIsRUFBbUNqRyxHQUFuQyxFQUF3Q29HLGFBQXhDLEVBQXVELElBQXZELENBQVA7QUFDQTtBQUNELE9BaEREO0FBaURBLEtBcEQ0QixDQUE3QjtBQXFEQTs7QUFFRDhNLG9CQUFrQjNGLE1BQWxCLEVBQTBCNEYsT0FBMUIsRUFBbUM7QUFDbEMzWCxXQUFPTSxLQUFQLENBQWF1QyxLQUFiLENBQW1CLDRCQUFuQjtBQUNBLFVBQU1zTyxXQUFXekgsS0FBS2pILEdBQUwsQ0FBVSx5QkFBeUJzUCxNQUFRLFVBQTNDLEVBQXNEO0FBQUUvTyxjQUFRbUMsRUFBRWdKLE1BQUYsQ0FBUztBQUFFeEUsZUFBTyxLQUFLeEg7QUFBZCxPQUFULEVBQW1Dd1YsT0FBbkM7QUFBVixLQUF0RCxDQUFqQjs7QUFDQSxRQUFJeEcsWUFBWUEsU0FBU3ZILElBQXJCLElBQTZCekUsRUFBRW1NLE9BQUYsQ0FBVUgsU0FBU3ZILElBQVQsQ0FBY2dPLFFBQXhCLENBQTdCLElBQWtFekcsU0FBU3ZILElBQVQsQ0FBY2dPLFFBQWQsQ0FBdUI5UCxNQUF2QixHQUFnQyxDQUF0RyxFQUF5RztBQUN4RyxVQUFJK1AsU0FBUyxDQUFiOztBQUNBLFdBQUssTUFBTTdTLE9BQVgsSUFBc0JtTSxTQUFTdkgsSUFBVCxDQUFjZ08sUUFBZCxDQUF1QkUsT0FBdkIsRUFBdEIsRUFBd0Q7QUFDdkQ5WCxlQUFPTSxLQUFQLENBQWF1QyxLQUFiLENBQW1CLFdBQW5CLEVBQWdDbUMsT0FBaEM7O0FBQ0EsWUFBSSxDQUFDNlMsTUFBRCxJQUFXN1MsUUFBUVYsRUFBUixHQUFhdVQsTUFBNUIsRUFBb0M7QUFDbkNBLG1CQUFTN1MsUUFBUVYsRUFBakI7QUFDQTs7QUFDRFUsZ0JBQVF0QixPQUFSLEdBQWtCaVUsUUFBUWpVLE9BQTFCO0FBQ0EsYUFBS2lDLFNBQUwsQ0FBZVgsT0FBZixFQUF3QixJQUF4QjtBQUNBOztBQUNELGFBQU87QUFBRStTLGtCQUFVNUcsU0FBU3ZILElBQVQsQ0FBY21PLFFBQTFCO0FBQW9DelQsWUFBSXVUO0FBQXhDLE9BQVA7QUFDQTtBQUNEOztBQUVERyxrQkFBZ0J2VSxHQUFoQixFQUFxQndVLFVBQXJCLEVBQWlDO0FBQ2hDalksV0FBT00sS0FBUCxDQUFhdUMsS0FBYixDQUFtQixpREFBbkIsRUFBc0VvVixXQUFXOVQsRUFBakYsRUFBcUZWLEdBQXJGO0FBQ0EsVUFBTTBOLFdBQVd6SCxLQUFLakgsR0FBTCxDQUFVLHlCQUF5QndWLFdBQVdsRyxNQUFRLE9BQXRELEVBQThEO0FBQUUvTyxjQUFRO0FBQUUyRyxlQUFPLEtBQUt4SCxRQUFkO0FBQXdCdUIsaUJBQVN1VSxXQUFXOVQ7QUFBNUM7QUFBVixLQUE5RCxDQUFqQjs7QUFDQSxRQUFJZ04sWUFBWUEsU0FBU3ZILElBQXpCLEVBQStCO0FBQzlCLFlBQU1BLE9BQU9xTyxXQUFXbEcsTUFBWCxLQUFzQixVQUF0QixHQUFtQ1osU0FBU3ZILElBQVQsQ0FBY2xHLE9BQWpELEdBQTJEeU4sU0FBU3ZILElBQVQsQ0FBY0csS0FBdEY7O0FBQ0EsVUFBSUgsUUFBUXpFLEVBQUVtTSxPQUFGLENBQVUxSCxLQUFLVyxPQUFmLENBQVIsSUFBbUNYLEtBQUtXLE9BQUwsQ0FBYXpDLE1BQWIsR0FBc0IsQ0FBN0QsRUFBZ0U7QUFDL0QsYUFBSyxNQUFNd0MsTUFBWCxJQUFxQlYsS0FBS1csT0FBMUIsRUFBbUM7QUFDbEMsZ0JBQU0zRyxPQUFPLEtBQUtyRCxNQUFMLENBQVl5SSxRQUFaLENBQXFCc0IsTUFBckIsS0FBZ0MsS0FBSy9KLE1BQUwsQ0FBWTBJLE9BQVosQ0FBb0JxQixNQUFwQixDQUE3Qzs7QUFDQSxjQUFJMUcsSUFBSixFQUFVO0FBQ1Q1RCxtQkFBT00sS0FBUCxDQUFhdUMsS0FBYixDQUFtQixxQkFBbkIsRUFBMENlLEtBQUtTLFFBQS9DLEVBQXlEWixHQUF6RDtBQUNBL0MsdUJBQVd5VCxhQUFYLENBQXlCMVEsR0FBekIsRUFBOEJHLElBQTlCLEVBQW9DLElBQXBDLEVBQTBDLElBQTFDO0FBQ0E7QUFDRDtBQUNEOztBQUVELFVBQUkwSCxRQUFRLEVBQVo7QUFDQSxVQUFJNE0saUJBQWlCLENBQXJCO0FBQ0EsVUFBSUMsZ0JBQWdCLElBQXBCOztBQUNBLFVBQUl2TyxRQUFRQSxLQUFLMEIsS0FBYixJQUFzQjFCLEtBQUswQixLQUFMLENBQVduSyxLQUFyQyxFQUE0QztBQUMzQ21LLGdCQUFRMUIsS0FBSzBCLEtBQUwsQ0FBV25LLEtBQW5CO0FBQ0ErVyx5QkFBaUJ0TyxLQUFLMEIsS0FBTCxDQUFXQyxRQUE1QjtBQUNBNE0sd0JBQWdCdk8sS0FBSzBCLEtBQUwsQ0FBV2QsT0FBM0I7QUFDQTs7QUFFRCxVQUFJWixRQUFRQSxLQUFLNEIsT0FBYixJQUF3QjVCLEtBQUs0QixPQUFMLENBQWFySyxLQUF6QyxFQUFnRDtBQUMvQyxZQUFJK1csY0FBSixFQUFvQjtBQUNuQixjQUFJQSxpQkFBaUJ0TyxLQUFLNEIsT0FBTCxDQUFhRCxRQUFsQyxFQUE0QztBQUMzQ0Qsb0JBQVExQixLQUFLNEIsT0FBTCxDQUFhRixLQUFyQjtBQUNBNk0sNEJBQWdCdk8sS0FBSzRCLE9BQUwsQ0FBYWhCLE9BQTdCO0FBQ0E7QUFDRCxTQUxELE1BS087QUFDTmMsa0JBQVExQixLQUFLNEIsT0FBTCxDQUFhRixLQUFyQjtBQUNBNk0sMEJBQWdCdk8sS0FBSzRCLE9BQUwsQ0FBYWhCLE9BQTdCO0FBQ0E7QUFDRDs7QUFFRCxVQUFJYyxLQUFKLEVBQVc7QUFDVixjQUFNZCxVQUFVLEtBQUtqSyxNQUFMLENBQVl5SSxRQUFaLENBQXFCbVAsYUFBckIsS0FBdUMsS0FBSzVYLE1BQUwsQ0FBWTBJLE9BQVosQ0FBb0JrUCxhQUFwQixDQUF2RDtBQUNBblksZUFBT00sS0FBUCxDQUFhdUMsS0FBYixDQUFtQixvQkFBbkIsRUFBeUNZLEdBQXpDLEVBQThDNkgsS0FBOUMsRUFBcURkLFFBQVFuRyxRQUE3RDtBQUNBM0QsbUJBQVdrVSxhQUFYLENBQXlCblIsR0FBekIsRUFBOEI2SCxLQUE5QixFQUFxQ2QsT0FBckMsRUFBOEMsS0FBOUM7QUFDQTtBQUNEO0FBQ0Q7O0FBRUQ0TixXQUFTM1UsR0FBVCxFQUFjd1UsVUFBZCxFQUEwQjtBQUN6QixVQUFNOUcsV0FBV3pILEtBQUtqSCxHQUFMLENBQVMsaUNBQVQsRUFBNEM7QUFBRU8sY0FBUTtBQUFFMkcsZUFBTyxLQUFLeEgsUUFBZDtBQUF3QnVCLGlCQUFTdVUsV0FBVzlUO0FBQTVDO0FBQVYsS0FBNUMsQ0FBakI7O0FBQ0EsUUFBSWdOLFlBQVlBLFNBQVN2SCxJQUFyQixJQUE2QnpFLEVBQUVtTSxPQUFGLENBQVVILFNBQVN2SCxJQUFULENBQWN5TyxLQUF4QixDQUE3QixJQUErRGxILFNBQVN2SCxJQUFULENBQWN5TyxLQUFkLENBQW9CdlEsTUFBcEIsR0FBNkIsQ0FBaEcsRUFBbUc7QUFDbEcsV0FBSyxNQUFNd1EsR0FBWCxJQUFrQm5ILFNBQVN2SCxJQUFULENBQWN5TyxLQUFoQyxFQUF1QztBQUN0QyxZQUFJQyxJQUFJdFQsT0FBUixFQUFpQjtBQUNoQixnQkFBTXBCLE9BQU8sS0FBS3JELE1BQUwsQ0FBWXlJLFFBQVosQ0FBcUJzUCxJQUFJdFQsT0FBSixDQUFZcEIsSUFBakMsQ0FBYjtBQUNBLGdCQUFNMlUsU0FBUztBQUNkOVUsZUFEYztBQUVkK1IsZUFBRyxnQkFGVztBQUdkaFIsaUJBQUssRUFIUztBQUlkSixlQUFHO0FBQ0ZsRCxtQkFBSzBDLEtBQUsxQyxHQURSO0FBRUZtRCx3QkFBVVQsS0FBS1M7QUFGYixhQUpXO0FBUWR3RCx5QkFBYSxDQUFDO0FBQ2JRLG9CQUFPLEtBQUs5SCxNQUFMLENBQVkyTixtQ0FBWixDQUFnRG9LLElBQUl0VCxPQUFKLENBQVlxRCxJQUE1RCxDQURNO0FBRWJvTiwyQkFBYzdSLEtBQUtTLFFBRk47QUFHYnNSLDJCQUFjL0MseUJBQXlCaFAsS0FBS1MsUUFBOUIsQ0FIRDtBQUliQyxrQkFBSyxJQUFJQyxJQUFKLENBQVM4SixTQUFTaUssSUFBSXRULE9BQUosQ0FBWVYsRUFBWixDQUFlZ0ssS0FBZixDQUFxQixHQUFyQixFQUEwQixDQUExQixDQUFULElBQXlDLElBQWxEO0FBSlEsYUFBRDtBQVJDLFdBQWY7QUFnQkE1TixxQkFBVzRDLE1BQVgsQ0FBa0JxRCxRQUFsQixDQUEyQmlQLHNCQUEzQixDQUFtRCxTQUFTMEMsSUFBSTVVLE9BQVMsSUFBSTRVLElBQUl0VCxPQUFKLENBQVlWLEVBQVosQ0FBZTBDLE9BQWYsQ0FBdUIsS0FBdkIsRUFBOEIsR0FBOUIsQ0FBb0MsRUFBakgsRUFBb0h1UixPQUFPblUsQ0FBM0gsRUFBOEgsSUFBOUgsRUFBb0ksSUFBSUcsSUFBSixDQUFTOEosU0FBU2lLLElBQUl0VCxPQUFKLENBQVlWLEVBQVosQ0FBZWdLLEtBQWYsQ0FBcUIsR0FBckIsRUFBMEIsQ0FBMUIsQ0FBVCxJQUF5QyxJQUFsRCxDQUFwSTtBQUNBO0FBQ0Q7QUFDRDtBQUNEOztBQUVEeEosaUJBQWVyQixHQUFmLEVBQW9CK1UsUUFBcEIsRUFBOEI7QUFDN0J4WSxXQUFPTSxLQUFQLENBQWFvQyxJQUFiLENBQWtCLGtCQUFsQixFQUFzQ2UsR0FBdEM7QUFDQSxVQUFNME8sa0JBQWtCelIsV0FBVzRDLE1BQVgsQ0FBa0JDLEtBQWxCLENBQXdCQyxXQUF4QixDQUFvQ0MsR0FBcEMsQ0FBeEI7O0FBQ0EsUUFBSTBPLGVBQUosRUFBcUI7QUFDcEIsVUFBSSxLQUFLL0wsZUFBTCxDQUFxQjNDLEdBQXJCLENBQUosRUFBK0I7QUFDOUIsYUFBS3VVLGVBQUwsQ0FBcUJ2VSxHQUFyQixFQUEwQixLQUFLMkMsZUFBTCxDQUFxQjNDLEdBQXJCLENBQTFCO0FBRUF6RCxlQUFPTSxLQUFQLENBQWF1QyxLQUFiLENBQW1CLDhDQUFuQixFQUFtRSxLQUFLdUQsZUFBTCxDQUFxQjNDLEdBQXJCLENBQW5FLEVBQThGQSxHQUE5RjtBQUNBLFlBQUlnVixVQUFVLEtBQUtmLGlCQUFMLENBQXVCLEtBQUt0UixlQUFMLENBQXFCM0MsR0FBckIsRUFBMEJzTyxNQUFqRCxFQUF5RDtBQUFFck8sbUJBQVMsS0FBSzBDLGVBQUwsQ0FBcUIzQyxHQUFyQixFQUEwQlUsRUFBckM7QUFBeUN1VSxrQkFBUTtBQUFqRCxTQUF6RCxDQUFkOztBQUNBLGVBQU9ELFdBQVdBLFFBQVFWLFFBQTFCLEVBQW9DO0FBQ25DVSxvQkFBVSxLQUFLZixpQkFBTCxDQUF1QixLQUFLdFIsZUFBTCxDQUFxQjNDLEdBQXJCLEVBQTBCc08sTUFBakQsRUFBeUQ7QUFBRXJPLHFCQUFTLEtBQUswQyxlQUFMLENBQXFCM0MsR0FBckIsRUFBMEJVLEVBQXJDO0FBQXlDdVUsb0JBQVFELFFBQVFuVTtBQUF6RCxXQUF6RCxDQUFWO0FBQ0E7O0FBRUR0RSxlQUFPTSxLQUFQLENBQWF1QyxLQUFiLENBQW1CLCtDQUFuQixFQUFvRSxLQUFLdUQsZUFBTCxDQUFxQjNDLEdBQXJCLENBQXBFLEVBQStGQSxHQUEvRjtBQUNBLGFBQUsyVSxRQUFMLENBQWMzVSxHQUFkLEVBQW1CLEtBQUsyQyxlQUFMLENBQXFCM0MsR0FBckIsQ0FBbkI7QUFFQSxlQUFPK1UsVUFBUDtBQUNBLE9BYkQsTUFhTztBQUNOLGNBQU1HLGFBQWEsS0FBS3ZILGVBQUwsQ0FBcUJlLGdCQUFnQnhPLElBQXJDLENBQW5COztBQUNBLFlBQUlnVixVQUFKLEVBQWdCO0FBQ2YsZUFBS2xOLGVBQUwsQ0FBcUJoSSxHQUFyQixFQUEwQmtWLFdBQVd4VSxFQUFyQztBQUNBLGlCQUFPLEtBQUtXLGNBQUwsQ0FBb0JyQixHQUFwQixFQUF5QitVLFFBQXpCLENBQVA7QUFDQSxTQUhELE1BR087QUFDTnhZLGlCQUFPTSxLQUFQLENBQWF5RSxLQUFiLENBQW1CLCtDQUFuQixFQUFvRW9OLGdCQUFnQnhPLElBQXBGO0FBQ0EsaUJBQU82VSxTQUFTLElBQUloWSxPQUFPb1csS0FBWCxDQUFpQiw0QkFBakIsRUFBK0MsK0NBQS9DLENBQVQsQ0FBUDtBQUNBO0FBQ0Q7QUFDRCxLQXhCRCxNQXdCTztBQUNONVcsYUFBT00sS0FBUCxDQUFheUUsS0FBYixDQUFtQixtREFBbkIsRUFBd0V0QixHQUF4RTtBQUNBLGFBQU8rVSxTQUFTLElBQUloWSxPQUFPb1csS0FBWCxDQUFpQixvQkFBakIsRUFBdUMsY0FBdkMsQ0FBVCxDQUFQO0FBQ0E7QUFDRDs7QUFubkNnQyxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X3NsYWNrYnJpZGdlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFscyBsb2dnZXI6dHJ1ZSAqL1xuLyogZXhwb3J0ZWQgbG9nZ2VyICovXG5cbmxvZ2dlciA9IG5ldyBMb2dnZXIoJ1NsYWNrQnJpZGdlJywge1xuXHRzZWN0aW9uczoge1xuXHRcdGNvbm5lY3Rpb246ICdDb25uZWN0aW9uJyxcblx0XHRldmVudHM6ICdFdmVudHMnLFxuXHRcdGNsYXNzOiAnQ2xhc3MnLFxuXHRcdHNsYWNrOiAnU2xhY2snLFxuXHRcdHJvY2tldDogJ1JvY2tldCcsXG5cdH0sXG59KTtcbiIsIk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdTbGFja0JyaWRnZScsIGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWRkKCdTbGFja0JyaWRnZV9FbmFibGVkJywgZmFsc2UsIHtcblx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdGkxOG5MYWJlbDogJ0VuYWJsZWQnLFxuXHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hZGQoJ1NsYWNrQnJpZGdlX0FQSVRva2VuJywgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnU2xhY2tCcmlkZ2VfRW5hYmxlZCcsXG5cdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0fSxcblx0XHRcdGkxOG5MYWJlbDogJ0FQSV9Ub2tlbicsXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZCgnU2xhY2tCcmlkZ2VfRmlsZVVwbG9hZF9FbmFibGVkJywgdHJ1ZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnU2xhY2tCcmlkZ2VfRW5hYmxlZCcsXG5cdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0fSxcblx0XHRcdGkxOG5MYWJlbDogJ0ZpbGVVcGxvYWQnLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hZGQoJ1NsYWNrQnJpZGdlX091dF9FbmFibGVkJywgZmFsc2UsIHtcblx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ1NsYWNrQnJpZGdlX0VuYWJsZWQnLFxuXHRcdFx0XHR2YWx1ZTogdHJ1ZSxcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZCgnU2xhY2tCcmlkZ2VfT3V0X0FsbCcsIGZhbHNlLCB7XG5cdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRlbmFibGVRdWVyeTogW3tcblx0XHRcdFx0X2lkOiAnU2xhY2tCcmlkZ2VfRW5hYmxlZCcsXG5cdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0fSwge1xuXHRcdFx0XHRfaWQ6ICdTbGFja0JyaWRnZV9PdXRfRW5hYmxlZCcsXG5cdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0fV0sXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZCgnU2xhY2tCcmlkZ2VfT3V0X0NoYW5uZWxzJywgJycsIHtcblx0XHRcdHR5cGU6ICdyb29tUGljaycsXG5cdFx0XHRlbmFibGVRdWVyeTogW3tcblx0XHRcdFx0X2lkOiAnU2xhY2tCcmlkZ2VfRW5hYmxlZCcsXG5cdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0fSwge1xuXHRcdFx0XHRfaWQ6ICdTbGFja0JyaWRnZV9PdXRfRW5hYmxlZCcsXG5cdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0fSwge1xuXHRcdFx0XHRfaWQ6ICdTbGFja0JyaWRnZV9PdXRfQWxsJyxcblx0XHRcdFx0dmFsdWU6IGZhbHNlLFxuXHRcdFx0fV0sXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZCgnU2xhY2tCcmlkZ2VfQWxpYXNGb3JtYXQnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdTbGFja0JyaWRnZV9FbmFibGVkJyxcblx0XHRcdFx0dmFsdWU6IHRydWUsXG5cdFx0XHR9LFxuXHRcdFx0aTE4bkxhYmVsOiAnQWxpYXNfRm9ybWF0Jyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0FsaWFzX0Zvcm1hdF9EZXNjcmlwdGlvbicsXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZCgnU2xhY2tCcmlkZ2VfRXhjbHVkZUJvdG5hbWVzJywgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnU2xhY2tCcmlkZ2VfRW5hYmxlZCcsXG5cdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0fSxcblx0XHRcdGkxOG5MYWJlbDogJ0V4Y2x1ZGVfQm90bmFtZXMnLFxuXHRcdFx0aTE4bkRlc2NyaXB0aW9uOiAnRXhjbHVkZV9Cb3RuYW1lc19EZXNjcmlwdGlvbicsXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZCgnU2xhY2tCcmlkZ2VfUmVhY3Rpb25zX0VuYWJsZWQnLCB0cnVlLCB7XG5cdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdTbGFja0JyaWRnZV9FbmFibGVkJyxcblx0XHRcdFx0dmFsdWU6IHRydWUsXG5cdFx0XHR9LFxuXHRcdFx0aTE4bkxhYmVsOiAnUmVhY3Rpb25zJyxcblx0XHR9KTtcblx0fSk7XG59KTtcbiIsIi8qIGdsb2JhbHMgbG9nZ2VyICovXG5cbmltcG9ydCBTbGFja0FkYXB0ZXIgZnJvbSAnLi9TbGFja0FkYXB0ZXIuanMnO1xuaW1wb3J0IFJvY2tldEFkYXB0ZXIgZnJvbSAnLi9Sb2NrZXRBZGFwdGVyLmpzJztcblxuLyoqXG4gKiBTbGFja0JyaWRnZSBpbnRlcmZhY2VzIGJldHdlZW4gdGhpcyBSb2NrZXQgaW5zdGFsbGF0aW9uIGFuZCBhIHJlbW90ZSBTbGFjayBpbnN0YWxsYXRpb24uXG4gKi9cbmNsYXNzIFNsYWNrQnJpZGdlIHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR0aGlzLnNsYWNrID0gbmV3IFNsYWNrQWRhcHRlcih0aGlzKTtcblx0XHR0aGlzLnJvY2tldCA9IG5ldyBSb2NrZXRBZGFwdGVyKHRoaXMpO1xuXHRcdHRoaXMucmVhY3Rpb25zTWFwID0gbmV3IE1hcCgpO1x0Ly8gU3luYyBvYmplY3QgYmV0d2VlbiByb2NrZXQgYW5kIHNsYWNrXG5cblx0XHR0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuXHRcdHRoaXMucm9ja2V0LnNldFNsYWNrKHRoaXMuc2xhY2spO1xuXHRcdHRoaXMuc2xhY2suc2V0Um9ja2V0KHRoaXMucm9ja2V0KTtcblxuXHRcdC8vIFNldHRpbmdzIHRoYXQgd2UgY2FjaGUgdmVyc3VzIGxvb2tpbmcgdXAgYXQgcnVudGltZVxuXHRcdHRoaXMuYXBpVG9rZW4gPSBmYWxzZTtcblx0XHR0aGlzLmFsaWFzRm9ybWF0ID0gJyc7XG5cdFx0dGhpcy5leGNsdWRlQm90bmFtZXMgPSAnJztcblx0XHR0aGlzLmlzUmVhY3Rpb25zRW5hYmxlZCA9IHRydWU7XG5cblx0XHR0aGlzLnByb2Nlc3NTZXR0aW5ncygpO1xuXHR9XG5cblx0Y29ubmVjdCgpIHtcblx0XHRpZiAodGhpcy5jb25uZWN0ZWQgPT09IGZhbHNlKSB7XG5cblx0XHRcdHRoaXMuc2xhY2suY29ubmVjdCh0aGlzLmFwaVRva2VuKTtcblx0XHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnU2xhY2tCcmlkZ2VfT3V0X0VuYWJsZWQnKSkge1xuXHRcdFx0XHR0aGlzLnJvY2tldC5jb25uZWN0KCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcblx0XHRcdGxvZ2dlci5jb25uZWN0aW9uLmluZm8oJ0VuYWJsZWQnKTtcblx0XHR9XG5cdH1cblxuXHRkaXNjb25uZWN0KCkge1xuXHRcdGlmICh0aGlzLmNvbm5lY3RlZCA9PT0gdHJ1ZSkge1xuXHRcdFx0dGhpcy5yb2NrZXQuZGlzY29ubmVjdCgpO1xuXHRcdFx0dGhpcy5zbGFjay5kaXNjb25uZWN0KCk7XG5cdFx0XHR0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuXHRcdFx0bG9nZ2VyLmNvbm5lY3Rpb24uaW5mbygnRGlzYWJsZWQnKTtcblx0XHR9XG5cdH1cblxuXHRwcm9jZXNzU2V0dGluZ3MoKSB7XG5cdFx0Ly8gU2xhY2sgaW5zdGFsbGF0aW9uIEFQSSB0b2tlblxuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTbGFja0JyaWRnZV9BUElUb2tlbicsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRpZiAodmFsdWUgIT09IHRoaXMuYXBpVG9rZW4pIHtcblx0XHRcdFx0dGhpcy5hcGlUb2tlbiA9IHZhbHVlO1xuXHRcdFx0XHRpZiAodGhpcy5jb25uZWN0ZWQpIHtcblx0XHRcdFx0XHR0aGlzLmRpc2Nvbm5lY3QoKTtcblx0XHRcdFx0XHR0aGlzLmNvbm5lY3QoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRsb2dnZXIuY2xhc3MuZGVidWcoYFNldHRpbmc6ICR7IGtleSB9YCwgdmFsdWUpO1xuXHRcdH0pO1xuXG5cdFx0Ly8gSW1wb3J0IG1lc3NhZ2VzIGZyb20gU2xhY2sgd2l0aCBhbiBhbGlhczsgJXMgaXMgcmVwbGFjZWQgYnkgdGhlIHVzZXJuYW1lIG9mIHRoZSB1c2VyLiBJZiBlbXB0eSwgbm8gYWxpYXMgd2lsbCBiZSB1c2VkLlxuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTbGFja0JyaWRnZV9BbGlhc0Zvcm1hdCcsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHR0aGlzLmFsaWFzRm9ybWF0ID0gdmFsdWU7XG5cdFx0XHRsb2dnZXIuY2xhc3MuZGVidWcoYFNldHRpbmc6ICR7IGtleSB9YCwgdmFsdWUpO1xuXHRcdH0pO1xuXG5cdFx0Ly8gRG8gbm90IHByb3BhZ2F0ZSBtZXNzYWdlcyBmcm9tIGJvdHMgd2hvc2UgbmFtZSBtYXRjaGVzIHRoZSByZWd1bGFyIGV4cHJlc3Npb24gYWJvdmUuIElmIGxlZnQgZW1wdHksIGFsbCBtZXNzYWdlcyBmcm9tIGJvdHMgd2lsbCBiZSBwcm9wYWdhdGVkLlxuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTbGFja0JyaWRnZV9FeGNsdWRlQm90bmFtZXMnLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0dGhpcy5leGNsdWRlQm90bmFtZXMgPSB2YWx1ZTtcblx0XHRcdGxvZ2dlci5jbGFzcy5kZWJ1ZyhgU2V0dGluZzogJHsga2V5IH1gLCB2YWx1ZSk7XG5cdFx0fSk7XG5cblx0XHQvLyBSZWFjdGlvbnNcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnU2xhY2tCcmlkZ2VfUmVhY3Rpb25zX0VuYWJsZWQnLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0dGhpcy5pc1JlYWN0aW9uc0VuYWJsZWQgPSB2YWx1ZTtcblx0XHRcdGxvZ2dlci5jbGFzcy5kZWJ1ZyhgU2V0dGluZzogJHsga2V5IH1gLCB2YWx1ZSk7XG5cdFx0fSk7XG5cblx0XHQvLyBJcyB0aGlzIGVudGlyZSBTbGFja0JyaWRnZSBlbmFibGVkXG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NsYWNrQnJpZGdlX0VuYWJsZWQnLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0aWYgKHZhbHVlICYmIHRoaXMuYXBpVG9rZW4pIHtcblx0XHRcdFx0dGhpcy5jb25uZWN0KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLmRpc2Nvbm5lY3QoKTtcblx0XHRcdH1cblx0XHRcdGxvZ2dlci5jbGFzcy5kZWJ1ZyhgU2V0dGluZzogJHsga2V5IH1gLCB2YWx1ZSk7XG5cdFx0fSk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5TbGFja0JyaWRnZSA9IG5ldyBTbGFja0JyaWRnZTtcbiIsIi8qIGdsb2JhbHMgbXNnU3RyZWFtICovXG5mdW5jdGlvbiBTbGFja0JyaWRnZUltcG9ydChjb21tYW5kLCBwYXJhbXMsIGl0ZW0pIHtcblx0aWYgKGNvbW1hbmQgIT09ICdzbGFja2JyaWRnZS1pbXBvcnQnIHx8ICFNYXRjaC50ZXN0KHBhcmFtcywgU3RyaW5nKSkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChpdGVtLnJpZCk7XG5cdGNvbnN0IGNoYW5uZWwgPSByb29tLm5hbWU7XG5cdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZShNZXRlb3IudXNlcklkKCkpO1xuXG5cdG1zZ1N0cmVhbS5lbWl0KGl0ZW0ucmlkLCB7XG5cdFx0X2lkOiBSYW5kb20uaWQoKSxcblx0XHRyaWQ6IGl0ZW0ucmlkLFxuXHRcdHU6IHsgdXNlcm5hbWU6ICdyb2NrZXQuY2F0JyB9LFxuXHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdG1zZzogVEFQaTE4bi5fXygnU2xhY2tCcmlkZ2Vfc3RhcnQnLCB7XG5cdFx0XHRwb3N0UHJvY2VzczogJ3NwcmludGYnLFxuXHRcdFx0c3ByaW50ZjogW3VzZXIudXNlcm5hbWUsIGNoYW5uZWxdLFxuXHRcdH0sIHVzZXIubGFuZ3VhZ2UpLFxuXHR9KTtcblxuXHR0cnkge1xuXHRcdFJvY2tldENoYXQuU2xhY2tCcmlkZ2UuaW1wb3J0TWVzc2FnZXMoaXRlbS5yaWQsIChlcnJvcikgPT4ge1xuXHRcdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRcdG1zZ1N0cmVhbS5lbWl0KGl0ZW0ucmlkLCB7XG5cdFx0XHRcdFx0X2lkOiBSYW5kb20uaWQoKSxcblx0XHRcdFx0XHRyaWQ6IGl0ZW0ucmlkLFxuXHRcdFx0XHRcdHU6IHsgdXNlcm5hbWU6ICdyb2NrZXQuY2F0JyB9LFxuXHRcdFx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0XHRcdG1zZzogVEFQaTE4bi5fXygnU2xhY2tCcmlkZ2VfZXJyb3InLCB7XG5cdFx0XHRcdFx0XHRwb3N0UHJvY2VzczogJ3NwcmludGYnLFxuXHRcdFx0XHRcdFx0c3ByaW50ZjogW2NoYW5uZWwsIGVycm9yLm1lc3NhZ2VdLFxuXHRcdFx0XHRcdH0sIHVzZXIubGFuZ3VhZ2UpLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG1zZ1N0cmVhbS5lbWl0KGl0ZW0ucmlkLCB7XG5cdFx0XHRcdFx0X2lkOiBSYW5kb20uaWQoKSxcblx0XHRcdFx0XHRyaWQ6IGl0ZW0ucmlkLFxuXHRcdFx0XHRcdHU6IHsgdXNlcm5hbWU6ICdyb2NrZXQuY2F0JyB9LFxuXHRcdFx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0XHRcdG1zZzogVEFQaTE4bi5fXygnU2xhY2tCcmlkZ2VfZmluaXNoJywge1xuXHRcdFx0XHRcdFx0cG9zdFByb2Nlc3M6ICdzcHJpbnRmJyxcblx0XHRcdFx0XHRcdHNwcmludGY6IFtjaGFubmVsXSxcblx0XHRcdFx0XHR9LCB1c2VyLmxhbmd1YWdlKSxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0bXNnU3RyZWFtLmVtaXQoaXRlbS5yaWQsIHtcblx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRyaWQ6IGl0ZW0ucmlkLFxuXHRcdFx0dTogeyB1c2VybmFtZTogJ3JvY2tldC5jYXQnIH0sXG5cdFx0XHR0czogbmV3IERhdGUoKSxcblx0XHRcdG1zZzogVEFQaTE4bi5fXygnU2xhY2tCcmlkZ2VfZXJyb3InLCB7XG5cdFx0XHRcdHBvc3RQcm9jZXNzOiAnc3ByaW50ZicsXG5cdFx0XHRcdHNwcmludGY6IFtjaGFubmVsLCBlcnJvci5tZXNzYWdlXSxcblx0XHRcdH0sIHVzZXIubGFuZ3VhZ2UpLFxuXHRcdH0pO1xuXHRcdHRocm93IGVycm9yO1xuXHR9XG5cdHJldHVybiBTbGFja0JyaWRnZUltcG9ydDtcbn1cblxuUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmFkZCgnc2xhY2ticmlkZ2UtaW1wb3J0JywgU2xhY2tCcmlkZ2VJbXBvcnQpO1xuIiwiLyogZ2xvYmFscyBsb2dnZXIqL1xuXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUm9ja2V0QWRhcHRlciB7XG5cdGNvbnN0cnVjdG9yKHNsYWNrQnJpZGdlKSB7XG5cdFx0bG9nZ2VyLnJvY2tldC5kZWJ1ZygnY29uc3RydWN0b3InKTtcblx0XHR0aGlzLnNsYWNrQnJpZGdlID0gc2xhY2tCcmlkZ2U7XG5cdFx0dGhpcy51dGlsID0gTnBtLnJlcXVpcmUoJ3V0aWwnKTtcblxuXHRcdHRoaXMudXNlclRhZ3MgPSB7fTtcblx0XHR0aGlzLnNsYWNrID0ge307XG5cdH1cblxuXHRjb25uZWN0KCkge1xuXHRcdHRoaXMucmVnaXN0ZXJGb3JFdmVudHMoKTtcblx0fVxuXG5cdGRpc2Nvbm5lY3QoKSB7XG5cdFx0dGhpcy51bnJlZ2lzdGVyRm9yRXZlbnRzKCk7XG5cdH1cblxuXHRzZXRTbGFjayhzbGFjaykge1xuXHRcdHRoaXMuc2xhY2sgPSBzbGFjaztcblx0fVxuXG5cdHJlZ2lzdGVyRm9yRXZlbnRzKCkge1xuXHRcdGxvZ2dlci5yb2NrZXQuZGVidWcoJ1JlZ2lzdGVyIGZvciBldmVudHMnKTtcblx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyU2F2ZU1lc3NhZ2UnLCB0aGlzLm9uTWVzc2FnZS5iaW5kKHRoaXMpLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdTbGFja0JyaWRnZV9PdXQnKTtcblx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyRGVsZXRlTWVzc2FnZScsIHRoaXMub25NZXNzYWdlRGVsZXRlLmJpbmQodGhpcyksIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVywgJ1NsYWNrQnJpZGdlX0RlbGV0ZScpO1xuXHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnc2V0UmVhY3Rpb24nLCB0aGlzLm9uU2V0UmVhY3Rpb24uYmluZCh0aGlzKSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnU2xhY2tCcmlkZ2VfU2V0UmVhY3Rpb24nKTtcblx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ3Vuc2V0UmVhY3Rpb24nLCB0aGlzLm9uVW5TZXRSZWFjdGlvbi5iaW5kKHRoaXMpLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdTbGFja0JyaWRnZV9VblNldFJlYWN0aW9uJyk7XG5cdH1cblxuXHR1bnJlZ2lzdGVyRm9yRXZlbnRzKCkge1xuXHRcdGxvZ2dlci5yb2NrZXQuZGVidWcoJ1VucmVnaXN0ZXIgZm9yIGV2ZW50cycpO1xuXHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLnJlbW92ZSgnYWZ0ZXJTYXZlTWVzc2FnZScsICdTbGFja0JyaWRnZV9PdXQnKTtcblx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5yZW1vdmUoJ2FmdGVyRGVsZXRlTWVzc2FnZScsICdTbGFja0JyaWRnZV9EZWxldGUnKTtcblx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5yZW1vdmUoJ3NldFJlYWN0aW9uJywgJ1NsYWNrQnJpZGdlX1NldFJlYWN0aW9uJyk7XG5cdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MucmVtb3ZlKCd1bnNldFJlYWN0aW9uJywgJ1NsYWNrQnJpZGdlX1VuU2V0UmVhY3Rpb24nKTtcblx0fVxuXG5cdG9uTWVzc2FnZURlbGV0ZShyb2NrZXRNZXNzYWdlRGVsZXRlZCkge1xuXHRcdHRyeSB7XG5cdFx0XHRpZiAoISB0aGlzLnNsYWNrLmdldFNsYWNrQ2hhbm5lbChyb2NrZXRNZXNzYWdlRGVsZXRlZC5yaWQpKSB7XG5cdFx0XHRcdC8vIFRoaXMgaXMgb24gYSBjaGFubmVsIHRoYXQgdGhlIHJvY2tldCBib3QgaXMgbm90IHN1YnNjcmliZWRcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0bG9nZ2VyLnJvY2tldC5kZWJ1Zygnb25Sb2NrZXRNZXNzYWdlRGVsZXRlJywgcm9ja2V0TWVzc2FnZURlbGV0ZWQpO1xuXG5cdFx0XHR0aGlzLnNsYWNrLnBvc3REZWxldGVNZXNzYWdlKHJvY2tldE1lc3NhZ2VEZWxldGVkKTtcblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdGxvZ2dlci5yb2NrZXQuZXJyb3IoJ1VuaGFuZGxlZCBlcnJvciBvbk1lc3NhZ2VEZWxldGUnLCBlcnIpO1xuXHRcdH1cblx0fVxuXG5cdG9uU2V0UmVhY3Rpb24ocm9ja2V0TXNnSUQsIHJlYWN0aW9uKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGlmICghdGhpcy5zbGFja0JyaWRnZS5pc1JlYWN0aW9uc0VuYWJsZWQpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0bG9nZ2VyLnJvY2tldC5kZWJ1Zygnb25Sb2NrZXRTZXRSZWFjdGlvbicpO1xuXG5cdFx0XHRpZiAocm9ja2V0TXNnSUQgJiYgcmVhY3Rpb24pIHtcblx0XHRcdFx0aWYgKHRoaXMuc2xhY2tCcmlkZ2UucmVhY3Rpb25zTWFwLmRlbGV0ZShgc2V0JHsgcm9ja2V0TXNnSUQgfSR7IHJlYWN0aW9uIH1gKSkge1xuXHRcdFx0XHRcdC8vIFRoaXMgd2FzIGEgU2xhY2sgcmVhY3Rpb24sIHdlIGRvbid0IG5lZWQgdG8gdGVsbCBTbGFjayBhYm91dCBpdFxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCByb2NrZXRNc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZChyb2NrZXRNc2dJRCk7XG5cdFx0XHRcdGlmIChyb2NrZXRNc2cpIHtcblx0XHRcdFx0XHRjb25zdCBzbGFja0NoYW5uZWwgPSB0aGlzLnNsYWNrLmdldFNsYWNrQ2hhbm5lbChyb2NrZXRNc2cucmlkKTtcblx0XHRcdFx0XHRpZiAobnVsbCAhPSBzbGFja0NoYW5uZWwpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHNsYWNrVFMgPSB0aGlzLnNsYWNrLmdldFRpbWVTdGFtcChyb2NrZXRNc2cpO1xuXHRcdFx0XHRcdFx0dGhpcy5zbGFjay5wb3N0UmVhY3Rpb25BZGRlZChyZWFjdGlvbi5yZXBsYWNlKC86L2csICcnKSwgc2xhY2tDaGFubmVsLmlkLCBzbGFja1RTKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdGxvZ2dlci5yb2NrZXQuZXJyb3IoJ1VuaGFuZGxlZCBlcnJvciBvblNldFJlYWN0aW9uJywgZXJyKTtcblx0XHR9XG5cdH1cblxuXHRvblVuU2V0UmVhY3Rpb24ocm9ja2V0TXNnSUQsIHJlYWN0aW9uKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGlmICghdGhpcy5zbGFja0JyaWRnZS5pc1JlYWN0aW9uc0VuYWJsZWQpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0bG9nZ2VyLnJvY2tldC5kZWJ1Zygnb25Sb2NrZXRVblNldFJlYWN0aW9uJyk7XG5cblx0XHRcdGlmIChyb2NrZXRNc2dJRCAmJiByZWFjdGlvbikge1xuXHRcdFx0XHRpZiAodGhpcy5zbGFja0JyaWRnZS5yZWFjdGlvbnNNYXAuZGVsZXRlKGB1bnNldCR7IHJvY2tldE1zZ0lEIH0keyByZWFjdGlvbiB9YCkpIHtcblx0XHRcdFx0XHQvLyBUaGlzIHdhcyBhIFNsYWNrIHVuc2V0IHJlYWN0aW9uLCB3ZSBkb24ndCBuZWVkIHRvIHRlbGwgU2xhY2sgYWJvdXQgaXRcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCByb2NrZXRNc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZChyb2NrZXRNc2dJRCk7XG5cdFx0XHRcdGlmIChyb2NrZXRNc2cpIHtcblx0XHRcdFx0XHRjb25zdCBzbGFja0NoYW5uZWwgPSB0aGlzLnNsYWNrLmdldFNsYWNrQ2hhbm5lbChyb2NrZXRNc2cucmlkKTtcblx0XHRcdFx0XHRpZiAobnVsbCAhPSBzbGFja0NoYW5uZWwpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHNsYWNrVFMgPSB0aGlzLnNsYWNrLmdldFRpbWVTdGFtcChyb2NrZXRNc2cpO1xuXHRcdFx0XHRcdFx0dGhpcy5zbGFjay5wb3N0UmVhY3Rpb25SZW1vdmUocmVhY3Rpb24ucmVwbGFjZSgvOi9nLCAnJyksIHNsYWNrQ2hhbm5lbC5pZCwgc2xhY2tUUyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRsb2dnZXIucm9ja2V0LmVycm9yKCdVbmhhbmRsZWQgZXJyb3Igb25VblNldFJlYWN0aW9uJywgZXJyKTtcblx0XHR9XG5cdH1cblxuXHRvbk1lc3NhZ2Uocm9ja2V0TWVzc2FnZSkge1xuXHRcdHRyeSB7XG5cdFx0XHRpZiAoISB0aGlzLnNsYWNrLmdldFNsYWNrQ2hhbm5lbChyb2NrZXRNZXNzYWdlLnJpZCkpIHtcblx0XHRcdFx0Ly8gVGhpcyBpcyBvbiBhIGNoYW5uZWwgdGhhdCB0aGUgcm9ja2V0IGJvdCBpcyBub3Qgc3Vic2NyaWJlZFxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRsb2dnZXIucm9ja2V0LmRlYnVnKCdvblJvY2tldE1lc3NhZ2UnLCByb2NrZXRNZXNzYWdlKTtcblxuXHRcdFx0aWYgKHJvY2tldE1lc3NhZ2UuZWRpdGVkQXQpIHtcblx0XHRcdFx0Ly8gVGhpcyBpcyBhbiBFZGl0IEV2ZW50XG5cdFx0XHRcdHRoaXMucHJvY2Vzc01lc3NhZ2VDaGFuZ2VkKHJvY2tldE1lc3NhZ2UpO1xuXHRcdFx0XHRyZXR1cm4gcm9ja2V0TWVzc2FnZTtcblx0XHRcdH1cblx0XHRcdC8vIElnbm9yZSBtZXNzYWdlcyBvcmlnaW5hdGluZyBmcm9tIFNsYWNrXG5cdFx0XHRpZiAocm9ja2V0TWVzc2FnZS5faWQuaW5kZXhPZignc2xhY2stJykgPT09IDApIHtcblx0XHRcdFx0cmV0dXJuIHJvY2tldE1lc3NhZ2U7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChyb2NrZXRNZXNzYWdlLmZpbGUpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMucHJvY2Vzc0ZpbGVTaGFyZShyb2NrZXRNZXNzYWdlKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gQSBuZXcgbWVzc2FnZSBmcm9tIFJvY2tldC5DaGF0XG5cdFx0XHR0aGlzLnByb2Nlc3NTZW5kTWVzc2FnZShyb2NrZXRNZXNzYWdlKTtcblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdGxvZ2dlci5yb2NrZXQuZXJyb3IoJ1VuaGFuZGxlZCBlcnJvciBvbk1lc3NhZ2UnLCBlcnIpO1xuXHRcdH1cblxuXHRcdHJldHVybiByb2NrZXRNZXNzYWdlO1xuXHR9XG5cblx0cHJvY2Vzc1NlbmRNZXNzYWdlKHJvY2tldE1lc3NhZ2UpIHtcblx0XHQvLyBTaW5jZSB3ZSBnb3QgdGhpcyBtZXNzYWdlLCBTbGFja0JyaWRnZV9PdXRfRW5hYmxlZCBpcyB0cnVlXG5cblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NsYWNrQnJpZGdlX091dF9BbGwnKSA9PT0gdHJ1ZSkge1xuXHRcdFx0dGhpcy5zbGFjay5wb3N0TWVzc2FnZSh0aGlzLnNsYWNrLmdldFNsYWNrQ2hhbm5lbChyb2NrZXRNZXNzYWdlLnJpZCksIHJvY2tldE1lc3NhZ2UpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBUaGV5IHdhbnQgdG8gbGltaXQgdG8gY2VydGFpbiBncm91cHNcblx0XHRcdGNvbnN0IG91dFNsYWNrQ2hhbm5lbHMgPSBfLnBsdWNrKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTbGFja0JyaWRnZV9PdXRfQ2hhbm5lbHMnKSwgJ19pZCcpIHx8IFtdO1xuXHRcdFx0Ly8gbG9nZ2VyLnJvY2tldC5kZWJ1ZygnT3V0IFNsYWNrQ2hhbm5lbHM6ICcsIG91dFNsYWNrQ2hhbm5lbHMpO1xuXHRcdFx0aWYgKG91dFNsYWNrQ2hhbm5lbHMuaW5kZXhPZihyb2NrZXRNZXNzYWdlLnJpZCkgIT09IC0xKSB7XG5cdFx0XHRcdHRoaXMuc2xhY2sucG9zdE1lc3NhZ2UodGhpcy5zbGFjay5nZXRTbGFja0NoYW5uZWwocm9ja2V0TWVzc2FnZS5yaWQpLCByb2NrZXRNZXNzYWdlKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRnZXRNZXNzYWdlQXR0YWNobWVudChyb2NrZXRNZXNzYWdlKSB7XG5cdFx0aWYgKCFyb2NrZXRNZXNzYWdlLmZpbGUpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAoIXJvY2tldE1lc3NhZ2UuYXR0YWNobWVudHMgfHwgIXJvY2tldE1lc3NhZ2UuYXR0YWNobWVudHMubGVuZ3RoKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmlsZUlkID0gcm9ja2V0TWVzc2FnZS5maWxlLl9pZDtcblx0XHRyZXR1cm4gcm9ja2V0TWVzc2FnZS5hdHRhY2htZW50cy5maW5kKChhdHRhY2htZW50KSA9PiBhdHRhY2htZW50LnRpdGxlX2xpbmsgJiYgYXR0YWNobWVudC50aXRsZV9saW5rLmluZGV4T2YoYC8keyBmaWxlSWQgfS9gKSA+PSAwKTtcblx0fVxuXG5cdGdldEZpbGVEb3dubG9hZFVybChyb2NrZXRNZXNzYWdlKSB7XG5cdFx0Y29uc3QgYXR0YWNobWVudCA9IHRoaXMuZ2V0TWVzc2FnZUF0dGFjaG1lbnQocm9ja2V0TWVzc2FnZSk7XG5cblx0XHRpZiAoYXR0YWNobWVudCkge1xuXHRcdFx0cmV0dXJuIGF0dGFjaG1lbnQudGl0bGVfbGluaztcblx0XHR9XG5cdH1cblxuXHRwcm9jZXNzRmlsZVNoYXJlKHJvY2tldE1lc3NhZ2UpIHtcblx0XHRpZiAoISBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnU2xhY2tCcmlkZ2VfRmlsZVVwbG9hZF9FbmFibGVkJykpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAocm9ja2V0TWVzc2FnZS5maWxlLm5hbWUpIHtcblx0XHRcdGxldCBmaWxlX25hbWUgPSByb2NrZXRNZXNzYWdlLmZpbGUubmFtZTtcblx0XHRcdGxldCB0ZXh0ID0gcm9ja2V0TWVzc2FnZS5tc2c7XG5cblx0XHRcdGNvbnN0IGF0dGFjaG1lbnQgPSB0aGlzLmdldE1lc3NhZ2VBdHRhY2htZW50KHJvY2tldE1lc3NhZ2UpO1xuXHRcdFx0aWYgKGF0dGFjaG1lbnQpIHtcblx0XHRcdFx0ZmlsZV9uYW1lID0gTWV0ZW9yLmFic29sdXRlVXJsKGF0dGFjaG1lbnQudGl0bGVfbGluayk7XG5cdFx0XHRcdGlmICghdGV4dCkge1xuXHRcdFx0XHRcdHRleHQgPSBhdHRhY2htZW50LmRlc2NyaXB0aW9uO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IG1lc3NhZ2UgPSBgJHsgdGV4dCB9ICR7IGZpbGVfbmFtZSB9YDtcblxuXHRcdFx0cm9ja2V0TWVzc2FnZS5tc2cgPSBtZXNzYWdlO1xuXHRcdFx0dGhpcy5zbGFjay5wb3N0TWVzc2FnZSh0aGlzLnNsYWNrLmdldFNsYWNrQ2hhbm5lbChyb2NrZXRNZXNzYWdlLnJpZCksIHJvY2tldE1lc3NhZ2UpO1xuXHRcdH1cblx0fVxuXG5cdHByb2Nlc3NNZXNzYWdlQ2hhbmdlZChyb2NrZXRNZXNzYWdlKSB7XG5cdFx0aWYgKHJvY2tldE1lc3NhZ2UpIHtcblx0XHRcdGlmIChyb2NrZXRNZXNzYWdlLnVwZGF0ZWRCeVNsYWNrKSB7XG5cdFx0XHRcdC8vIFdlIGhhdmUgYWxyZWFkeSBwcm9jZXNzZWQgdGhpc1xuXHRcdFx0XHRkZWxldGUgcm9ja2V0TWVzc2FnZS51cGRhdGVkQnlTbGFjaztcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUaGlzIHdhcyBhIGNoYW5nZSBmcm9tIFJvY2tldC5DaGF0XG5cdFx0XHRjb25zdCBzbGFja0NoYW5uZWwgPSB0aGlzLnNsYWNrLmdldFNsYWNrQ2hhbm5lbChyb2NrZXRNZXNzYWdlLnJpZCk7XG5cdFx0XHR0aGlzLnNsYWNrLnBvc3RNZXNzYWdlVXBkYXRlKHNsYWNrQ2hhbm5lbCwgcm9ja2V0TWVzc2FnZSk7XG5cdFx0fVxuXHR9XG5cblx0Z2V0Q2hhbm5lbChzbGFja01lc3NhZ2UpIHtcblx0XHRyZXR1cm4gc2xhY2tNZXNzYWdlLmNoYW5uZWwgPyB0aGlzLmZpbmRDaGFubmVsKHNsYWNrTWVzc2FnZS5jaGFubmVsKSB8fCB0aGlzLmFkZENoYW5uZWwoc2xhY2tNZXNzYWdlLmNoYW5uZWwpIDogbnVsbDtcblx0fVxuXG5cdGdldFVzZXIoc2xhY2tVc2VyKSB7XG5cdFx0cmV0dXJuIHNsYWNrVXNlciA/IHRoaXMuZmluZFVzZXIoc2xhY2tVc2VyKSB8fCB0aGlzLmFkZFVzZXIoc2xhY2tVc2VyKSA6IG51bGw7XG5cdH1cblxuXHRjcmVhdGVSb2NrZXRJRChzbGFja0NoYW5uZWwsIHRzKSB7XG5cdFx0cmV0dXJuIGBzbGFjay0keyBzbGFja0NoYW5uZWwgfS0keyB0cy5yZXBsYWNlKC9cXC4vZywgJy0nKSB9YDtcblx0fVxuXG5cdGZpbmRDaGFubmVsKHNsYWNrQ2hhbm5lbElkKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUltcG9ydElkKHNsYWNrQ2hhbm5lbElkKTtcblx0fVxuXG5cdGFkZENoYW5uZWwoc2xhY2tDaGFubmVsSUQsIGhhc1JldHJpZWQgPSBmYWxzZSkge1xuXHRcdGxvZ2dlci5yb2NrZXQuZGVidWcoJ0FkZGluZyBSb2NrZXQuQ2hhdCBjaGFubmVsIGZyb20gU2xhY2snLCBzbGFja0NoYW5uZWxJRCk7XG5cdFx0bGV0IHNsYWNrUmVzdWx0cyA9IG51bGw7XG5cdFx0bGV0IGlzR3JvdXAgPSBmYWxzZTtcblx0XHRpZiAoc2xhY2tDaGFubmVsSUQuY2hhckF0KDApID09PSAnQycpIHtcblx0XHRcdHNsYWNrUmVzdWx0cyA9IEhUVFAuZ2V0KCdodHRwczovL3NsYWNrLmNvbS9hcGkvY2hhbm5lbHMuaW5mbycsIHsgcGFyYW1zOiB7IHRva2VuOiB0aGlzLnNsYWNrQnJpZGdlLmFwaVRva2VuLCBjaGFubmVsOiBzbGFja0NoYW5uZWxJRCB9IH0pO1xuXHRcdH0gZWxzZSBpZiAoc2xhY2tDaGFubmVsSUQuY2hhckF0KDApID09PSAnRycpIHtcblx0XHRcdHNsYWNrUmVzdWx0cyA9IEhUVFAuZ2V0KCdodHRwczovL3NsYWNrLmNvbS9hcGkvZ3JvdXBzLmluZm8nLCB7IHBhcmFtczogeyB0b2tlbjogdGhpcy5zbGFja0JyaWRnZS5hcGlUb2tlbiwgY2hhbm5lbDogc2xhY2tDaGFubmVsSUQgfSB9KTtcblx0XHRcdGlzR3JvdXAgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAoc2xhY2tSZXN1bHRzICYmIHNsYWNrUmVzdWx0cy5kYXRhICYmIHNsYWNrUmVzdWx0cy5kYXRhLm9rID09PSB0cnVlKSB7XG5cdFx0XHRjb25zdCByb2NrZXRDaGFubmVsRGF0YSA9IGlzR3JvdXAgPyBzbGFja1Jlc3VsdHMuZGF0YS5ncm91cCA6IHNsYWNrUmVzdWx0cy5kYXRhLmNoYW5uZWw7XG5cdFx0XHRjb25zdCBleGlzdGluZ1JvY2tldFJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlOYW1lKHJvY2tldENoYW5uZWxEYXRhLm5hbWUpO1xuXG5cdFx0XHQvLyBJZiB0aGUgcm9vbSBleGlzdHMsIG1ha2Ugc3VyZSB3ZSBoYXZlIGl0cyBpZCBpbiBpbXBvcnRJZHNcblx0XHRcdGlmIChleGlzdGluZ1JvY2tldFJvb20gfHwgcm9ja2V0Q2hhbm5lbERhdGEuaXNfZ2VuZXJhbCkge1xuXHRcdFx0XHRyb2NrZXRDaGFubmVsRGF0YS5yb2NrZXRJZCA9IHJvY2tldENoYW5uZWxEYXRhLmlzX2dlbmVyYWwgPyAnR0VORVJBTCcgOiBleGlzdGluZ1JvY2tldFJvb20uX2lkO1xuXHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5hZGRJbXBvcnRJZHMocm9ja2V0Q2hhbm5lbERhdGEucm9ja2V0SWQsIHJvY2tldENoYW5uZWxEYXRhLmlkKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnN0IHJvY2tldFVzZXJzID0gW107XG5cdFx0XHRcdGZvciAoY29uc3QgbWVtYmVyIG9mIHJvY2tldENoYW5uZWxEYXRhLm1lbWJlcnMpIHtcblx0XHRcdFx0XHRpZiAobWVtYmVyICE9PSByb2NrZXRDaGFubmVsRGF0YS5jcmVhdG9yKSB7XG5cdFx0XHRcdFx0XHRjb25zdCByb2NrZXRVc2VyID0gdGhpcy5maW5kVXNlcihtZW1iZXIpIHx8IHRoaXMuYWRkVXNlcihtZW1iZXIpO1xuXHRcdFx0XHRcdFx0aWYgKHJvY2tldFVzZXIgJiYgcm9ja2V0VXNlci51c2VybmFtZSkge1xuXHRcdFx0XHRcdFx0XHRyb2NrZXRVc2Vycy5wdXNoKHJvY2tldFVzZXIudXNlcm5hbWUpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCByb2NrZXRVc2VyQ3JlYXRvciA9IHJvY2tldENoYW5uZWxEYXRhLmNyZWF0b3IgPyB0aGlzLmZpbmRVc2VyKHJvY2tldENoYW5uZWxEYXRhLmNyZWF0b3IpIHx8IHRoaXMuYWRkVXNlcihyb2NrZXRDaGFubmVsRGF0YS5jcmVhdG9yKSA6IG51bGw7XG5cdFx0XHRcdGlmICghcm9ja2V0VXNlckNyZWF0b3IpIHtcblx0XHRcdFx0XHRsb2dnZXIucm9ja2V0LmVycm9yKCdDb3VsZCBub3QgZmV0Y2ggcm9vbSBjcmVhdG9yIGluZm9ybWF0aW9uJywgcm9ja2V0Q2hhbm5lbERhdGEuY3JlYXRvcik7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRjb25zdCByb2NrZXRDaGFubmVsID0gUm9ja2V0Q2hhdC5jcmVhdGVSb29tKGlzR3JvdXAgPyAncCcgOiAnYycsIHJvY2tldENoYW5uZWxEYXRhLm5hbWUsIHJvY2tldFVzZXJDcmVhdG9yLnVzZXJuYW1lLCByb2NrZXRVc2Vycyk7XG5cdFx0XHRcdFx0cm9ja2V0Q2hhbm5lbERhdGEucm9ja2V0SWQgPSByb2NrZXRDaGFubmVsLnJpZDtcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdGlmICghaGFzUmV0cmllZCkge1xuXHRcdFx0XHRcdFx0bG9nZ2VyLnJvY2tldC5kZWJ1ZygnRXJyb3IgYWRkaW5nIGNoYW5uZWwgZnJvbSBTbGFjay4gV2lsbCByZXRyeSBpbiAxcy4nLCBlLm1lc3NhZ2UpO1xuXHRcdFx0XHRcdFx0Ly8gSWYgZmlyc3QgdGltZSB0cnlpbmcgdG8gY3JlYXRlIGNoYW5uZWwgZmFpbHMsIGNvdWxkIGJlIGJlY2F1c2Ugb2YgbXVsdGlwbGUgbWVzc2FnZXMgcmVjZWl2ZWQgYXQgdGhlIHNhbWUgdGltZS4gVHJ5IGFnYWluIG9uY2UgYWZ0ZXIgMXMuXG5cdFx0XHRcdFx0XHRNZXRlb3IuX3NsZWVwRm9yTXMoMTAwMCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5maW5kQ2hhbm5lbChzbGFja0NoYW5uZWxJRCkgfHwgdGhpcy5hZGRDaGFubmVsKHNsYWNrQ2hhbm5lbElELCB0cnVlKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coZS5tZXNzYWdlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCByb29tVXBkYXRlID0ge1xuXHRcdFx0XHRcdHRzOiBuZXcgRGF0ZShyb2NrZXRDaGFubmVsRGF0YS5jcmVhdGVkICogMTAwMCksXG5cdFx0XHRcdH07XG5cdFx0XHRcdGxldCBsYXN0U2V0VG9waWMgPSAwO1xuXHRcdFx0XHRpZiAoIV8uaXNFbXB0eShyb2NrZXRDaGFubmVsRGF0YS50b3BpYyAmJiByb2NrZXRDaGFubmVsRGF0YS50b3BpYy52YWx1ZSkpIHtcblx0XHRcdFx0XHRyb29tVXBkYXRlLnRvcGljID0gcm9ja2V0Q2hhbm5lbERhdGEudG9waWMudmFsdWU7XG5cdFx0XHRcdFx0bGFzdFNldFRvcGljID0gcm9ja2V0Q2hhbm5lbERhdGEudG9waWMubGFzdF9zZXQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCFfLmlzRW1wdHkocm9ja2V0Q2hhbm5lbERhdGEucHVycG9zZSAmJiByb2NrZXRDaGFubmVsRGF0YS5wdXJwb3NlLnZhbHVlKSAmJiByb2NrZXRDaGFubmVsRGF0YS5wdXJwb3NlLmxhc3Rfc2V0ID4gbGFzdFNldFRvcGljKSB7XG5cdFx0XHRcdFx0cm9vbVVwZGF0ZS50b3BpYyA9IHJvY2tldENoYW5uZWxEYXRhLnB1cnBvc2UudmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuYWRkSW1wb3J0SWRzKHJvY2tldENoYW5uZWxEYXRhLnJvY2tldElkLCByb2NrZXRDaGFubmVsRGF0YS5pZCk7XG5cdFx0XHRcdHRoaXMuc2xhY2suYWRkU2xhY2tDaGFubmVsKHJvY2tldENoYW5uZWxEYXRhLnJvY2tldElkLCBzbGFja0NoYW5uZWxJRCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocm9ja2V0Q2hhbm5lbERhdGEucm9ja2V0SWQpO1xuXHRcdH1cblx0XHRsb2dnZXIucm9ja2V0LmRlYnVnKCdDaGFubmVsIG5vdCBhZGRlZCcpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGZpbmRVc2VyKHNsYWNrVXNlcklEKSB7XG5cdFx0Y29uc3Qgcm9ja2V0VXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUltcG9ydElkKHNsYWNrVXNlcklEKTtcblx0XHRpZiAocm9ja2V0VXNlciAmJiAhdGhpcy51c2VyVGFnc1tzbGFja1VzZXJJRF0pIHtcblx0XHRcdHRoaXMudXNlclRhZ3Nbc2xhY2tVc2VySURdID0geyBzbGFjazogYDxAJHsgc2xhY2tVc2VySUQgfT5gLCByb2NrZXQ6IGBAJHsgcm9ja2V0VXNlci51c2VybmFtZSB9YCB9O1xuXHRcdH1cblx0XHRyZXR1cm4gcm9ja2V0VXNlcjtcblx0fVxuXG5cdGFkZFVzZXIoc2xhY2tVc2VySUQpIHtcblx0XHRsb2dnZXIucm9ja2V0LmRlYnVnKCdBZGRpbmcgUm9ja2V0LkNoYXQgdXNlciBmcm9tIFNsYWNrJywgc2xhY2tVc2VySUQpO1xuXHRcdGNvbnN0IHNsYWNrUmVzdWx0cyA9IEhUVFAuZ2V0KCdodHRwczovL3NsYWNrLmNvbS9hcGkvdXNlcnMuaW5mbycsIHsgcGFyYW1zOiB7IHRva2VuOiB0aGlzLnNsYWNrQnJpZGdlLmFwaVRva2VuLCB1c2VyOiBzbGFja1VzZXJJRCB9IH0pO1xuXHRcdGlmIChzbGFja1Jlc3VsdHMgJiYgc2xhY2tSZXN1bHRzLmRhdGEgJiYgc2xhY2tSZXN1bHRzLmRhdGEub2sgPT09IHRydWUgJiYgc2xhY2tSZXN1bHRzLmRhdGEudXNlcikge1xuXHRcdFx0Y29uc3Qgcm9ja2V0VXNlckRhdGEgPSBzbGFja1Jlc3VsdHMuZGF0YS51c2VyO1xuXHRcdFx0Y29uc3QgaXNCb3QgPSByb2NrZXRVc2VyRGF0YS5pc19ib3QgPT09IHRydWU7XG5cdFx0XHRjb25zdCBlbWFpbCA9IChyb2NrZXRVc2VyRGF0YS5wcm9maWxlICYmIHJvY2tldFVzZXJEYXRhLnByb2ZpbGUuZW1haWwpIHx8ICcnO1xuXHRcdFx0bGV0IGV4aXN0aW5nUm9ja2V0VXNlcjtcblx0XHRcdGlmICghaXNCb3QpIHtcblx0XHRcdFx0ZXhpc3RpbmdSb2NrZXRVc2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5RW1haWxBZGRyZXNzKGVtYWlsKSB8fCBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlVc2VybmFtZShyb2NrZXRVc2VyRGF0YS5uYW1lKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGV4aXN0aW5nUm9ja2V0VXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeVVzZXJuYW1lKHJvY2tldFVzZXJEYXRhLm5hbWUpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZXhpc3RpbmdSb2NrZXRVc2VyKSB7XG5cdFx0XHRcdHJvY2tldFVzZXJEYXRhLnJvY2tldElkID0gZXhpc3RpbmdSb2NrZXRVc2VyLl9pZDtcblx0XHRcdFx0cm9ja2V0VXNlckRhdGEubmFtZSA9IGV4aXN0aW5nUm9ja2V0VXNlci51c2VybmFtZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnN0IG5ld1VzZXIgPSB7XG5cdFx0XHRcdFx0cGFzc3dvcmQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0XHRcdHVzZXJuYW1lOiByb2NrZXRVc2VyRGF0YS5uYW1lLFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGlmICghaXNCb3QgJiYgZW1haWwpIHtcblx0XHRcdFx0XHRuZXdVc2VyLmVtYWlsID0gZW1haWw7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoaXNCb3QpIHtcblx0XHRcdFx0XHRuZXdVc2VyLmpvaW5EZWZhdWx0Q2hhbm5lbHMgPSBmYWxzZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJvY2tldFVzZXJEYXRhLnJvY2tldElkID0gQWNjb3VudHMuY3JlYXRlVXNlcihuZXdVc2VyKTtcblx0XHRcdFx0Y29uc3QgdXNlclVwZGF0ZSA9IHtcblx0XHRcdFx0XHR1dGNPZmZzZXQ6IHJvY2tldFVzZXJEYXRhLnR6X29mZnNldCAvIDM2MDAsIC8vIFNsYWNrJ3MgaXMgLTE4MDAwIHdoaWNoIHRyYW5zbGF0ZXMgdG8gUm9ja2V0LkNoYXQncyBhZnRlciBkaXZpZGluZyBieSAzNjAwLFxuXHRcdFx0XHRcdHJvbGVzOiBpc0JvdCA/IFsnYm90J10gOiBbJ3VzZXInXSxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRpZiAocm9ja2V0VXNlckRhdGEucHJvZmlsZSAmJiByb2NrZXRVc2VyRGF0YS5wcm9maWxlLnJlYWxfbmFtZSkge1xuXHRcdFx0XHRcdHVzZXJVcGRhdGUubmFtZSA9IHJvY2tldFVzZXJEYXRhLnByb2ZpbGUucmVhbF9uYW1lO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHJvY2tldFVzZXJEYXRhLmRlbGV0ZWQpIHtcblx0XHRcdFx0XHR1c2VyVXBkYXRlLmFjdGl2ZSA9IGZhbHNlO1xuXHRcdFx0XHRcdHVzZXJVcGRhdGVbJ3NlcnZpY2VzLnJlc3VtZS5sb2dpblRva2VucyddID0gW107XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy51cGRhdGUoeyBfaWQ6IHJvY2tldFVzZXJEYXRhLnJvY2tldElkIH0sIHsgJHNldDogdXNlclVwZGF0ZSB9KTtcblxuXHRcdFx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQocm9ja2V0VXNlckRhdGEucm9ja2V0SWQpO1xuXG5cdFx0XHRcdGxldCB1cmwgPSBudWxsO1xuXHRcdFx0XHRpZiAocm9ja2V0VXNlckRhdGEucHJvZmlsZSkge1xuXHRcdFx0XHRcdGlmIChyb2NrZXRVc2VyRGF0YS5wcm9maWxlLmltYWdlX29yaWdpbmFsKSB7XG5cdFx0XHRcdFx0XHR1cmwgPSByb2NrZXRVc2VyRGF0YS5wcm9maWxlLmltYWdlX29yaWdpbmFsO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAocm9ja2V0VXNlckRhdGEucHJvZmlsZS5pbWFnZV81MTIpIHtcblx0XHRcdFx0XHRcdHVybCA9IHJvY2tldFVzZXJEYXRhLnByb2ZpbGUuaW1hZ2VfNTEyO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodXJsKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFJvY2tldENoYXQuc2V0VXNlckF2YXRhcih1c2VyLCB1cmwsIG51bGwsICd1cmwnKTtcblx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHRcdFx0bG9nZ2VyLnJvY2tldC5kZWJ1ZygnRXJyb3Igc2V0dGluZyB1c2VyIGF2YXRhcicsIGVycm9yLm1lc3NhZ2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBpbXBvcnRJZHMgPSBbcm9ja2V0VXNlckRhdGEuaWRdO1xuXHRcdFx0aWYgKGlzQm90ICYmIHJvY2tldFVzZXJEYXRhLnByb2ZpbGUgJiYgcm9ja2V0VXNlckRhdGEucHJvZmlsZS5ib3RfaWQpIHtcblx0XHRcdFx0aW1wb3J0SWRzLnB1c2gocm9ja2V0VXNlckRhdGEucHJvZmlsZS5ib3RfaWQpO1xuXHRcdFx0fVxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuYWRkSW1wb3J0SWRzKHJvY2tldFVzZXJEYXRhLnJvY2tldElkLCBpbXBvcnRJZHMpO1xuXHRcdFx0aWYgKCF0aGlzLnVzZXJUYWdzW3NsYWNrVXNlcklEXSkge1xuXHRcdFx0XHR0aGlzLnVzZXJUYWdzW3NsYWNrVXNlcklEXSA9IHsgc2xhY2s6IGA8QCR7IHNsYWNrVXNlcklEIH0+YCwgcm9ja2V0OiBgQCR7IHJvY2tldFVzZXJEYXRhLm5hbWUgfWAgfTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChyb2NrZXRVc2VyRGF0YS5yb2NrZXRJZCk7XG5cdFx0fVxuXHRcdGxvZ2dlci5yb2NrZXQuZGVidWcoJ1VzZXIgbm90IGFkZGVkJyk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0YWRkQWxpYXNUb01zZyhyb2NrZXRVc2VyTmFtZSwgcm9ja2V0TXNnT2JqKSB7XG5cdFx0Y29uc3QgYWxpYXNGb3JtYXQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnU2xhY2tCcmlkZ2VfQWxpYXNGb3JtYXQnKTtcblx0XHRpZiAoYWxpYXNGb3JtYXQpIHtcblx0XHRcdGNvbnN0IGFsaWFzID0gdGhpcy51dGlsLmZvcm1hdChhbGlhc0Zvcm1hdCwgcm9ja2V0VXNlck5hbWUpO1xuXG5cdFx0XHRpZiAoYWxpYXMgIT09IHJvY2tldFVzZXJOYW1lKSB7XG5cdFx0XHRcdHJvY2tldE1zZ09iai5hbGlhcyA9IGFsaWFzO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiByb2NrZXRNc2dPYmo7XG5cdH1cblxuXHRjcmVhdGVBbmRTYXZlTWVzc2FnZShyb2NrZXRDaGFubmVsLCByb2NrZXRVc2VyLCBzbGFja01lc3NhZ2UsIHJvY2tldE1zZ0RhdGFEZWZhdWx0cywgaXNJbXBvcnRpbmcpIHtcblx0XHRpZiAoc2xhY2tNZXNzYWdlLnR5cGUgPT09ICdtZXNzYWdlJykge1xuXHRcdFx0bGV0IHJvY2tldE1zZ09iaiA9IHt9O1xuXHRcdFx0aWYgKCFfLmlzRW1wdHkoc2xhY2tNZXNzYWdlLnN1YnR5cGUpKSB7XG5cdFx0XHRcdHJvY2tldE1zZ09iaiA9IHRoaXMuc2xhY2sucHJvY2Vzc1N1YnR5cGVkTWVzc2FnZShyb2NrZXRDaGFubmVsLCByb2NrZXRVc2VyLCBzbGFja01lc3NhZ2UsIGlzSW1wb3J0aW5nKTtcblx0XHRcdFx0aWYgKCFyb2NrZXRNc2dPYmopIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJvY2tldE1zZ09iaiA9IHtcblx0XHRcdFx0XHRtc2c6IHRoaXMuY29udmVydFNsYWNrTXNnVHh0VG9Sb2NrZXRUeHRGb3JtYXQoc2xhY2tNZXNzYWdlLnRleHQpLFxuXHRcdFx0XHRcdHJpZDogcm9ja2V0Q2hhbm5lbC5faWQsXG5cdFx0XHRcdFx0dToge1xuXHRcdFx0XHRcdFx0X2lkOiByb2NrZXRVc2VyLl9pZCxcblx0XHRcdFx0XHRcdHVzZXJuYW1lOiByb2NrZXRVc2VyLnVzZXJuYW1lLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dGhpcy5hZGRBbGlhc1RvTXNnKHJvY2tldFVzZXIudXNlcm5hbWUsIHJvY2tldE1zZ09iaik7XG5cdFx0XHR9XG5cdFx0XHRfLmV4dGVuZChyb2NrZXRNc2dPYmosIHJvY2tldE1zZ0RhdGFEZWZhdWx0cyk7XG5cdFx0XHRpZiAoc2xhY2tNZXNzYWdlLmVkaXRlZCkge1xuXHRcdFx0XHRyb2NrZXRNc2dPYmouZWRpdGVkQXQgPSBuZXcgRGF0ZShwYXJzZUludChzbGFja01lc3NhZ2UuZWRpdGVkLnRzLnNwbGl0KCcuJylbMF0pICogMTAwMCk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoc2xhY2tNZXNzYWdlLnN1YnR5cGUgPT09ICdib3RfbWVzc2FnZScpIHtcblx0XHRcdFx0cm9ja2V0VXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKCdyb2NrZXQuY2F0JywgeyBmaWVsZHM6IHsgdXNlcm5hbWU6IDEgfSB9KTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHNsYWNrTWVzc2FnZS5waW5uZWRfdG8gJiYgc2xhY2tNZXNzYWdlLnBpbm5lZF90by5pbmRleE9mKHNsYWNrTWVzc2FnZS5jaGFubmVsKSAhPT0gLTEpIHtcblx0XHRcdFx0cm9ja2V0TXNnT2JqLnBpbm5lZCA9IHRydWU7XG5cdFx0XHRcdHJvY2tldE1zZ09iai5waW5uZWRBdCA9IERhdGUubm93O1xuXHRcdFx0XHRyb2NrZXRNc2dPYmoucGlubmVkQnkgPSBfLnBpY2socm9ja2V0VXNlciwgJ19pZCcsICd1c2VybmFtZScpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNsYWNrTWVzc2FnZS5zdWJ0eXBlID09PSAnYm90X21lc3NhZ2UnKSB7XG5cdFx0XHRcdE1ldGVvci5zZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0XHRpZiAoc2xhY2tNZXNzYWdlLmJvdF9pZCAmJiBzbGFja01lc3NhZ2UudHMgJiYgIVJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeVNsYWNrQm90SWRBbmRTbGFja1RzKHNsYWNrTWVzc2FnZS5ib3RfaWQsIHNsYWNrTWVzc2FnZS50cykpIHtcblx0XHRcdFx0XHRcdFJvY2tldENoYXQuc2VuZE1lc3NhZ2Uocm9ja2V0VXNlciwgcm9ja2V0TXNnT2JqLCByb2NrZXRDaGFubmVsLCB0cnVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIDUwMCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRsb2dnZXIucm9ja2V0LmRlYnVnKCdTZW5kIG1lc3NhZ2UgdG8gUm9ja2V0LkNoYXQnKTtcblx0XHRcdFx0Um9ja2V0Q2hhdC5zZW5kTWVzc2FnZShyb2NrZXRVc2VyLCByb2NrZXRNc2dPYmosIHJvY2tldENoYW5uZWwsIHRydWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGNvbnZlcnRTbGFja01zZ1R4dFRvUm9ja2V0VHh0Rm9ybWF0KHNsYWNrTXNnVHh0KSB7XG5cdFx0aWYgKCFfLmlzRW1wdHkoc2xhY2tNc2dUeHQpKSB7XG5cdFx0XHRzbGFja01zZ1R4dCA9IHNsYWNrTXNnVHh0LnJlcGxhY2UoLzwhZXZlcnlvbmU+L2csICdAYWxsJyk7XG5cdFx0XHRzbGFja01zZ1R4dCA9IHNsYWNrTXNnVHh0LnJlcGxhY2UoLzwhY2hhbm5lbD4vZywgJ0BhbGwnKTtcblx0XHRcdHNsYWNrTXNnVHh0ID0gc2xhY2tNc2dUeHQucmVwbGFjZSgvPCFoZXJlPi9nLCAnQGhlcmUnKTtcblx0XHRcdHNsYWNrTXNnVHh0ID0gc2xhY2tNc2dUeHQucmVwbGFjZSgvJmd0Oy9nLCAnPicpO1xuXHRcdFx0c2xhY2tNc2dUeHQgPSBzbGFja01zZ1R4dC5yZXBsYWNlKC8mbHQ7L2csICc8Jyk7XG5cdFx0XHRzbGFja01zZ1R4dCA9IHNsYWNrTXNnVHh0LnJlcGxhY2UoLyZhbXA7L2csICcmJyk7XG5cdFx0XHRzbGFja01zZ1R4dCA9IHNsYWNrTXNnVHh0LnJlcGxhY2UoLzpzaW1wbGVfc21pbGU6L2csICc6c21pbGU6Jyk7XG5cdFx0XHRzbGFja01zZ1R4dCA9IHNsYWNrTXNnVHh0LnJlcGxhY2UoLzptZW1vOi9nLCAnOnBlbmNpbDonKTtcblx0XHRcdHNsYWNrTXNnVHh0ID0gc2xhY2tNc2dUeHQucmVwbGFjZSgvOnBpZ2d5Oi9nLCAnOnBpZzonKTtcblx0XHRcdHNsYWNrTXNnVHh0ID0gc2xhY2tNc2dUeHQucmVwbGFjZSgvOnVrOi9nLCAnOmdiOicpO1xuXHRcdFx0c2xhY2tNc2dUeHQgPSBzbGFja01zZ1R4dC5yZXBsYWNlKC88KGh0dHBbc10/OltePl0qKT4vZywgJyQxJyk7XG5cblx0XHRcdHNsYWNrTXNnVHh0LnJlcGxhY2UoLyg/OjxAKShbYS16QS1aMC05XSspKD86XFx8LispPyg/Oj4pL2csIChtYXRjaCwgdXNlcklkKSA9PiB7XG5cdFx0XHRcdGlmICghdGhpcy51c2VyVGFnc1t1c2VySWRdKSB7XG5cdFx0XHRcdFx0dGhpcy5maW5kVXNlcih1c2VySWQpIHx8IHRoaXMuYWRkVXNlcih1c2VySWQpOyAvLyBUaGlzIGFkZHMgdXNlclRhZ3MgZm9yIHRoZSB1c2VySWRcblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCB1c2VyVGFncyA9IHRoaXMudXNlclRhZ3NbdXNlcklkXTtcblx0XHRcdFx0aWYgKHVzZXJUYWdzKSB7XG5cdFx0XHRcdFx0c2xhY2tNc2dUeHQgPSBzbGFja01zZ1R4dC5yZXBsYWNlKHVzZXJUYWdzLnNsYWNrLCB1c2VyVGFncy5yb2NrZXQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2xhY2tNc2dUeHQgPSAnJztcblx0XHR9XG5cdFx0cmV0dXJuIHNsYWNrTXNnVHh0O1xuXHR9XG5cbn1cbiIsIi8qIGdsb2JhbHMgbG9nZ2VyKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IHVybCBmcm9tICd1cmwnO1xuaW1wb3J0IGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgaHR0cHMgZnJvbSAnaHR0cHMnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNsYWNrQWRhcHRlciB7XG5cblx0Y29uc3RydWN0b3Ioc2xhY2tCcmlkZ2UpIHtcblx0XHRsb2dnZXIuc2xhY2suZGVidWcoJ2NvbnN0cnVjdG9yJyk7XG5cdFx0dGhpcy5zbGFja0JyaWRnZSA9IHNsYWNrQnJpZGdlO1xuXHRcdHRoaXMuc2xhY2tDbGllbnQgPSByZXF1aXJlKCdAc2xhY2svY2xpZW50Jyk7XG5cdFx0dGhpcy5ydG0gPSB7fTtcdC8vIHNsYWNrLWNsaWVudCBSZWFsIFRpbWUgTWVzc2FnaW5nIEFQSVxuXHRcdHRoaXMuYXBpVG9rZW4gPSB7fTtcdC8vIFNsYWNrIEFQSSBUb2tlbiBwYXNzZWQgaW4gdmlhIENvbm5lY3Rcblx0XHQvLyBPbiBTbGFjaywgYSByb2NrZXQgaW50ZWdyYXRpb24gYm90IHdpbGwgYmUgYWRkZWQgdG8gc2xhY2sgY2hhbm5lbHMsIHRoaXMgaXMgdGhlIGxpc3Qgb2YgdGhvc2UgY2hhbm5lbHMsIGtleSBpcyBSb2NrZXQgQ2ggSURcblx0XHR0aGlzLnNsYWNrQ2hhbm5lbFJvY2tldEJvdE1lbWJlcnNoaXBNYXAgPSBuZXcgTWFwKCk7IC8vIEtleT1Sb2NrZXRDaGFubmVsSUQsIFZhbHVlPVNsYWNrQ2hhbm5lbFxuXHRcdHRoaXMucm9ja2V0ID0ge307XG5cdH1cblxuXHQvKipcblx0ICogQ29ubmVjdCB0byB0aGUgcmVtb3RlIFNsYWNrIHNlcnZlciB1c2luZyB0aGUgcGFzc2VkIGluIHRva2VuIEFQSSBhbmQgcmVnaXN0ZXIgZm9yIFNsYWNrIGV2ZW50c1xuXHQgKiBAcGFyYW0gYXBpVG9rZW5cblx0ICovXG5cdGNvbm5lY3QoYXBpVG9rZW4pIHtcblx0XHR0aGlzLmFwaVRva2VuID0gYXBpVG9rZW47XG5cblx0XHRjb25zdCB7IFJUTUNsaWVudCB9ID0gdGhpcy5zbGFja0NsaWVudDtcblx0XHRpZiAoUlRNQ2xpZW50ICE9IG51bGwpIHtcblx0XHRcdFJUTUNsaWVudC5kaXNjb25uZWN0O1xuXHRcdH1cblx0XHR0aGlzLnJ0bSA9IG5ldyBSVE1DbGllbnQodGhpcy5hcGlUb2tlbik7XG5cdFx0dGhpcy5ydG0uc3RhcnQoKTtcblx0XHR0aGlzLnJlZ2lzdGVyRm9yRXZlbnRzKCk7XG5cblx0XHRNZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHR0aGlzLnBvcHVsYXRlTWVtYmVyc2hpcENoYW5uZWxNYXAoKTsgLy8gSWYgcnVuIG91dHNpZGUgb2YgTWV0ZW9yLnN0YXJ0dXAsIEhUVFAgaXMgbm90IGRlZmluZWRcblx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRsb2dnZXIuc2xhY2suZXJyb3IoJ0Vycm9yIGF0dGVtcHRpbmcgdG8gY29ubmVjdCB0byBTbGFjaycsIGVycik7XG5cdFx0XHRcdHRoaXMuc2xhY2tCcmlkZ2UuZGlzY29ubmVjdCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIFVucmVnaXN0ZXIgZm9yIHNsYWNrIGV2ZW50cyBhbmQgZGlzY29ubmVjdCBmcm9tIFNsYWNrXG5cdCAqL1xuXHRkaXNjb25uZWN0KCkge1xuXHRcdHRoaXMucnRtLmRpc2Nvbm5lY3QgJiYgdGhpcy5ydG0uZGlzY29ubmVjdDtcblx0fVxuXG5cdHNldFJvY2tldChyb2NrZXQpIHtcblx0XHR0aGlzLnJvY2tldCA9IHJvY2tldDtcblx0fVxuXG5cdHJlZ2lzdGVyRm9yRXZlbnRzKCkge1xuXHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnUmVnaXN0ZXIgZm9yIGV2ZW50cycpO1xuXHRcdHRoaXMucnRtLm9uKCdhdXRoZW50aWNhdGVkJywgKCkgPT4ge1xuXHRcdFx0bG9nZ2VyLnNsYWNrLmluZm8oJ0Nvbm5lY3RlZCB0byBTbGFjaycpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5ydG0ub24oJ3VuYWJsZV90b19ydG1fc3RhcnQnLCAoKSA9PiB7XG5cdFx0XHR0aGlzLnNsYWNrQnJpZGdlLmRpc2Nvbm5lY3QoKTtcblx0XHR9KTtcblxuXHRcdHRoaXMucnRtLm9uKCdkaXNjb25uZWN0ZWQnLCAoKSA9PiB7XG5cdFx0XHRsb2dnZXIuc2xhY2suaW5mbygnRGlzY29ubmVjdGVkIGZyb20gU2xhY2snKTtcblx0XHRcdHRoaXMuc2xhY2tCcmlkZ2UuZGlzY29ubmVjdCgpO1xuXHRcdH0pO1xuXG5cdFx0LyoqXG5cdFx0KiBFdmVudCBmaXJlZCB3aGVuIHNvbWVvbmUgbWVzc2FnZXMgYSBjaGFubmVsIHRoZSBib3QgaXMgaW5cblx0XHQqIHtcblx0XHQqXHR0eXBlOiAnbWVzc2FnZScsXG5cdFx0KiBcdGNoYW5uZWw6IFtjaGFubmVsX2lkXSxcblx0XHQqIFx0dXNlcjogW3VzZXJfaWRdLFxuXHRcdCogXHR0ZXh0OiBbbWVzc2FnZV0sXG5cdFx0KiBcdHRzOiBbdHMubWlsbGldLFxuXHRcdCogXHR0ZWFtOiBbdGVhbV9pZF0sXG5cdFx0KiBcdHN1YnR5cGU6IFttZXNzYWdlX3N1YnR5cGVdLFxuXHRcdCogXHRpbnZpdGVyOiBbbWVzc2FnZV9zdWJ0eXBlID0gJ2dyb3VwX2pvaW58Y2hhbm5lbF9qb2luJyAtPiB1c2VyX2lkXVxuXHRcdCogfVxuXHRcdCoqL1xuXHRcdHRoaXMucnRtLm9uKCdtZXNzYWdlJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoc2xhY2tNZXNzYWdlKSA9PiB7XG5cdFx0XHRsb2dnZXIuc2xhY2suZGVidWcoJ09uU2xhY2tFdmVudC1NRVNTQUdFOiAnLCBzbGFja01lc3NhZ2UpO1xuXHRcdFx0aWYgKHNsYWNrTWVzc2FnZSkge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHRoaXMub25NZXNzYWdlKHNsYWNrTWVzc2FnZSk7XG5cdFx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRcdGxvZ2dlci5zbGFjay5lcnJvcignVW5oYW5kbGVkIGVycm9yIG9uTWVzc2FnZScsIGVycik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KSk7XG5cblx0XHR0aGlzLnJ0bS5vbigncmVhY3Rpb25fYWRkZWQnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChyZWFjdGlvbk1zZykgPT4ge1xuXHRcdFx0bG9nZ2VyLnNsYWNrLmRlYnVnKCdPblNsYWNrRXZlbnQtUkVBQ1RJT05fQURERUQ6ICcsIHJlYWN0aW9uTXNnKTtcblx0XHRcdGlmIChyZWFjdGlvbk1zZykge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHRoaXMub25SZWFjdGlvbkFkZGVkKHJlYWN0aW9uTXNnKTtcblx0XHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdFx0bG9nZ2VyLnNsYWNrLmVycm9yKCdVbmhhbmRsZWQgZXJyb3Igb25SZWFjdGlvbkFkZGVkJywgZXJyKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pKTtcblxuXHRcdHRoaXMucnRtLm9uKCdyZWFjdGlvbl9yZW1vdmVkJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgocmVhY3Rpb25Nc2cpID0+IHtcblx0XHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnT25TbGFja0V2ZW50LVJFQUNUSU9OX1JFTU9WRUQ6ICcsIHJlYWN0aW9uTXNnKTtcblx0XHRcdGlmIChyZWFjdGlvbk1zZykge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHRoaXMub25SZWFjdGlvblJlbW92ZWQocmVhY3Rpb25Nc2cpO1xuXHRcdFx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdFx0XHRsb2dnZXIuc2xhY2suZXJyb3IoJ1VuaGFuZGxlZCBlcnJvciBvblJlYWN0aW9uUmVtb3ZlZCcsIGVycik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KSk7XG5cblx0XHQvKipcblx0XHQgKiBFdmVudCBmaXJlZCB3aGVuIHNvbWVvbmUgY3JlYXRlcyBhIHB1YmxpYyBjaGFubmVsXG5cdFx0ICoge1xuXHRcdCpcdHR5cGU6ICdjaGFubmVsX2NyZWF0ZWQnLFxuXHRcdCpcdGNoYW5uZWw6IHtcblx0XHQqXHRcdGlkOiBbY2hhbm5lbF9pZF0sXG5cdFx0Klx0XHRpc19jaGFubmVsOiB0cnVlLFxuXHRcdCpcdFx0bmFtZTogW2NoYW5uZWxfbmFtZV0sXG5cdFx0Klx0XHRjcmVhdGVkOiBbdHNdLFxuXHRcdCpcdFx0Y3JlYXRvcjogW3VzZXJfaWRdLFxuXHRcdCpcdFx0aXNfc2hhcmVkOiBmYWxzZSxcblx0XHQqXHRcdGlzX29yZ19zaGFyZWQ6IGZhbHNlXG5cdFx0Klx0fSxcblx0XHQqXHRldmVudF90czogW3RzLm1pbGxpXVxuXHRcdCogfVxuXHRcdCAqKi9cblx0XHR0aGlzLnJ0bS5vbignY2hhbm5lbF9jcmVhdGVkJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7fSkpO1xuXG5cdFx0LyoqXG5cdFx0ICogRXZlbnQgZmlyZWQgd2hlbiB0aGUgYm90IGpvaW5zIGEgcHVibGljIGNoYW5uZWxcblx0XHQgKiB7XG5cdFx0KiBcdHR5cGU6ICdjaGFubmVsX2pvaW5lZCcsXG5cdFx0KiBcdGNoYW5uZWw6IHtcblx0XHQqIFx0XHRpZDogW2NoYW5uZWxfaWRdLFxuXHRcdCogXHRcdG5hbWU6IFtjaGFubmVsX25hbWVdLFxuXHRcdCogXHRcdGlzX2NoYW5uZWw6IHRydWUsXG5cdFx0KiBcdFx0Y3JlYXRlZDogW3RzXSxcblx0XHQqIFx0XHRjcmVhdG9yOiBbdXNlcl9pZF0sXG5cdFx0KiBcdFx0aXNfYXJjaGl2ZWQ6IGZhbHNlLFxuXHRcdCogXHRcdGlzX2dlbmVyYWw6IGZhbHNlLFxuXHRcdCogXHRcdGlzX21lbWJlcjogdHJ1ZSxcblx0XHQqIFx0XHRsYXN0X3JlYWQ6IFt0cy5taWxsaV0sXG5cdFx0KiBcdFx0bGF0ZXN0OiBbbWVzc2FnZV9vYmpdLFxuXHRcdCogXHRcdHVucmVhZF9jb3VudDogMCxcblx0XHQqIFx0XHR1bnJlYWRfY291bnRfZGlzcGxheTogMCxcblx0XHQqIFx0XHRtZW1iZXJzOiBbIHVzZXJfaWRzIF0sXG5cdFx0KiBcdFx0dG9waWM6IHtcblx0XHQqIFx0XHRcdHZhbHVlOiBbY2hhbm5lbF90b3BpY10sXG5cdFx0KiBcdFx0XHRjcmVhdG9yOiBbdXNlcl9pZF0sXG5cdFx0KiBcdFx0XHRsYXN0X3NldDogMFxuXHRcdCogXHRcdH0sXG5cdFx0KiBcdFx0cHVycG9zZToge1xuXHRcdCogXHRcdFx0dmFsdWU6IFtjaGFubmVsX3B1cnBvc2VdLFxuXHRcdCogXHRcdFx0Y3JlYXRvcjogW3VzZXJfaWRdLFxuXHRcdCogXHRcdFx0bGFzdF9zZXQ6IDBcblx0XHQqIFx0XHR9XG5cdFx0KiBcdH1cblx0XHQqIH1cblx0XHQgKiovXG5cdFx0dGhpcy5ydG0ub24oJ2NoYW5uZWxfam9pbmVkJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7fSkpO1xuXG5cdFx0LyoqXG5cdFx0ICogRXZlbnQgZmlyZWQgd2hlbiB0aGUgYm90IGxlYXZlcyAob3IgaXMgcmVtb3ZlZCBmcm9tKSBhIHB1YmxpYyBjaGFubmVsXG5cdFx0ICoge1xuXHRcdCogXHR0eXBlOiAnY2hhbm5lbF9sZWZ0Jyxcblx0XHQqIFx0Y2hhbm5lbDogW2NoYW5uZWxfaWRdXG5cdFx0KiB9XG5cdFx0ICoqL1xuXHRcdHRoaXMucnRtLm9uKCdjaGFubmVsX2xlZnQnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChjaGFubmVsTGVmdE1zZykgPT4ge1xuXHRcdFx0bG9nZ2VyLnNsYWNrLmRlYnVnKCdPblNsYWNrRXZlbnQtQ0hBTk5FTF9MRUZUOiAnLCBjaGFubmVsTGVmdE1zZyk7XG5cdFx0XHRpZiAoY2hhbm5lbExlZnRNc2cpIHtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHR0aGlzLm9uQ2hhbm5lbExlZnQoY2hhbm5lbExlZnRNc2cpO1xuXHRcdFx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdFx0XHRsb2dnZXIuc2xhY2suZXJyb3IoJ1VuaGFuZGxlZCBlcnJvciBvbkNoYW5uZWxMZWZ0JywgZXJyKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cblx0XHR9KSk7XG5cblx0XHQvKipcblx0XHQgKiBFdmVudCBmaXJlZCB3aGVuIGFuIGFyY2hpdmVkIGNoYW5uZWwgaXMgZGVsZXRlZCBieSBhbiBhZG1pblxuXHRcdCAqIHtcblx0XHQqIFx0dHlwZTogJ2NoYW5uZWxfZGVsZXRlZCcsXG5cdFx0KiBcdGNoYW5uZWw6IFtjaGFubmVsX2lkXSxcblx0XHQqXHRldmVudF90czogW3RzLm1pbGxpXVxuXHRcdCogfVxuXHRcdCAqKi9cblx0XHR0aGlzLnJ0bS5vbignY2hhbm5lbF9kZWxldGVkJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7fSkpO1xuXG5cdFx0LyoqXG5cdFx0ICogRXZlbnQgZmlyZWQgd2hlbiB0aGUgY2hhbm5lbCBoYXMgaXRzIG5hbWUgY2hhbmdlZFxuXHRcdCAqIHtcblx0XHQqIFx0dHlwZTogJ2NoYW5uZWxfcmVuYW1lJyxcblx0XHQqIFx0Y2hhbm5lbDoge1xuXHRcdCogXHRcdGlkOiBbY2hhbm5lbF9pZF0sXG5cdFx0KiBcdFx0bmFtZTogW2NoYW5uZWxfbmFtZV0sXG5cdFx0KiBcdFx0aXNfY2hhbm5lbDogdHJ1ZSxcblx0XHQqIFx0XHRjcmVhdGVkOiBbdHNdXG5cdFx0KiBcdH0sXG5cdFx0Klx0ZXZlbnRfdHM6IFt0cy5taWxsaV1cblx0XHQqIH1cblx0XHQgKiovXG5cdFx0dGhpcy5ydG0ub24oJ2NoYW5uZWxfcmVuYW1lJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7fSkpO1xuXG5cdFx0LyoqXG5cdFx0ICogRXZlbnQgZmlyZWQgd2hlbiB0aGUgYm90IGpvaW5zIGEgcHJpdmF0ZSBjaGFubmVsXG5cdFx0ICoge1xuXHRcdCogXHR0eXBlOiAnZ3JvdXBfam9pbmVkJyxcblx0XHQqIFx0Y2hhbm5lbDoge1xuXHRcdCogXHRcdGlkOiBbY2hhbm5lbF9pZF0sXG5cdFx0KiBcdFx0bmFtZTogW2NoYW5uZWxfbmFtZV0sXG5cdFx0KiBcdFx0aXNfZ3JvdXA6IHRydWUsXG5cdFx0KiBcdFx0Y3JlYXRlZDogW3RzXSxcblx0XHQqIFx0XHRjcmVhdG9yOiBbdXNlcl9pZF0sXG5cdFx0KiBcdFx0aXNfYXJjaGl2ZWQ6IGZhbHNlLFxuXHRcdCogXHRcdGlzX21waW06IGZhbHNlLFxuXHRcdCogXHRcdGlzX29wZW46IHRydWUsXG5cdFx0KiBcdFx0bGFzdF9yZWFkOiBbdHMubWlsbGldLFxuXHRcdCogXHRcdGxhdGVzdDogW21lc3NhZ2Vfb2JqXSxcblx0XHQqIFx0XHR1bnJlYWRfY291bnQ6IDAsXG5cdFx0KiBcdFx0dW5yZWFkX2NvdW50X2Rpc3BsYXk6IDAsXG5cdFx0KiBcdFx0bWVtYmVyczogWyB1c2VyX2lkcyBdLFxuXHRcdCogXHRcdHRvcGljOiB7XG5cdFx0KiBcdFx0XHR2YWx1ZTogW2NoYW5uZWxfdG9waWNdLFxuXHRcdCogXHRcdFx0Y3JlYXRvcjogW3VzZXJfaWRdLFxuXHRcdCogXHRcdFx0bGFzdF9zZXQ6IDBcblx0XHQqIFx0XHR9LFxuXHRcdCogXHRcdHB1cnBvc2U6IHtcblx0XHQqIFx0XHRcdHZhbHVlOiBbY2hhbm5lbF9wdXJwb3NlXSxcblx0XHQqIFx0XHRcdGNyZWF0b3I6IFt1c2VyX2lkXSxcblx0XHQqIFx0XHRcdGxhc3Rfc2V0OiAwXG5cdFx0KiBcdFx0fVxuXHRcdCogXHR9XG5cdFx0KiB9XG5cdFx0ICoqL1xuXHRcdHRoaXMucnRtLm9uKCdncm91cF9qb2luZWQnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHt9KSk7XG5cblx0XHQvKipcblx0XHQgKiBFdmVudCBmaXJlZCB3aGVuIHRoZSBib3QgbGVhdmVzIChvciBpcyByZW1vdmVkIGZyb20pIGEgcHJpdmF0ZSBjaGFubmVsXG5cdFx0ICoge1xuXHRcdCogXHR0eXBlOiAnZ3JvdXBfbGVmdCcsXG5cdFx0KiBcdGNoYW5uZWw6IFtjaGFubmVsX2lkXVxuXHRcdCogfVxuXHRcdCAqKi9cblx0XHR0aGlzLnJ0bS5vbignZ3JvdXBfbGVmdCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge30pKTtcblxuXHRcdC8qKlxuXHRcdCAqIEV2ZW50IGZpcmVkIHdoZW4gdGhlIHByaXZhdGUgY2hhbm5lbCBoYXMgaXRzIG5hbWUgY2hhbmdlZFxuXHRcdCAqIHtcblx0XHQqIFx0dHlwZTogJ2dyb3VwX3JlbmFtZScsXG5cdFx0KiBcdGNoYW5uZWw6IHtcblx0XHQqIFx0XHRpZDogW2NoYW5uZWxfaWRdLFxuXHRcdCogXHRcdG5hbWU6IFtjaGFubmVsX25hbWVdLFxuXHRcdCogXHRcdGlzX2dyb3VwOiB0cnVlLFxuXHRcdCogXHRcdGNyZWF0ZWQ6IFt0c11cblx0XHQqIFx0fSxcblx0XHQqXHRldmVudF90czogW3RzLm1pbGxpXVxuXHRcdCogfVxuXHRcdCAqKi9cblx0XHR0aGlzLnJ0bS5vbignZ3JvdXBfcmVuYW1lJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7fSkpO1xuXG5cdFx0LyoqXG5cdFx0ICogRXZlbnQgZmlyZWQgd2hlbiBhIG5ldyB1c2VyIGpvaW5zIHRoZSB0ZWFtXG5cdFx0ICoge1xuXHRcdCogXHR0eXBlOiAndGVhbV9qb2luJyxcblx0XHQqIFx0dXNlcjpcblx0XHQqIFx0e1xuXHRcdCogXHRcdGlkOiBbdXNlcl9pZF0sXG5cdFx0KiBcdFx0dGVhbV9pZDogW3RlYW1faWRdLFxuXHRcdCogXHRcdG5hbWU6IFt1c2VyX25hbWVdLFxuXHRcdCogXHRcdGRlbGV0ZWQ6IGZhbHNlLFxuXHRcdCogXHRcdHN0YXR1czogbnVsbCxcblx0XHQqIFx0XHRjb2xvcjogW2NvbG9yX2NvZGVdLFxuXHRcdCogXHRcdHJlYWxfbmFtZTogJycsXG5cdFx0KiBcdFx0dHo6IFt0aW1lem9uZV0sXG5cdFx0KiBcdFx0dHpfbGFiZWw6IFt0aW1lem9uZV9sYWJlbF0sXG5cdFx0KiBcdFx0dHpfb2Zmc2V0OiBbdGltZXpvbmVfb2Zmc2V0XSxcblx0XHQqIFx0XHRwcm9maWxlOlxuXHRcdCogXHRcdHtcblx0XHQqIFx0XHRcdGF2YXRhcl9oYXNoOiAnJyxcblx0XHQqIFx0XHRcdHJlYWxfbmFtZTogJycsXG5cdFx0KiBcdFx0XHRyZWFsX25hbWVfbm9ybWFsaXplZDogJycsXG5cdFx0KiBcdFx0XHRlbWFpbDogJycsXG5cdFx0KiBcdFx0XHRpbWFnZV8yNDogJycsXG5cdFx0KiBcdFx0XHRpbWFnZV8zMjogJycsXG5cdFx0KiBcdFx0XHRpbWFnZV80ODogJycsXG5cdFx0KiBcdFx0XHRpbWFnZV83MjogJycsXG5cdFx0KiBcdFx0XHRpbWFnZV8xOTI6ICcnLFxuXHRcdCogXHRcdFx0aW1hZ2VfNTEyOiAnJyxcblx0XHQqIFx0XHRcdGZpZWxkczogbnVsbFxuXHRcdCogXHRcdH0sXG5cdFx0KiBcdFx0aXNfYWRtaW46IGZhbHNlLFxuXHRcdCogXHRcdGlzX293bmVyOiBmYWxzZSxcblx0XHQqIFx0XHRpc19wcmltYXJ5X293bmVyOiBmYWxzZSxcblx0XHQqIFx0XHRpc19yZXN0cmljdGVkOiBmYWxzZSxcblx0XHQqIFx0XHRpc191bHRyYV9yZXN0cmljdGVkOiBmYWxzZSxcblx0XHQqIFx0XHRpc19ib3Q6IGZhbHNlLFxuXHRcdCogXHRcdHByZXNlbmNlOiBbdXNlcl9wcmVzZW5jZV1cblx0XHQqIFx0fSxcblx0XHQqIFx0Y2FjaGVfdHM6IFt0c11cblx0XHQqIH1cblx0XHQgKiovXG5cdFx0dGhpcy5ydG0ub24oJ3RlYW1fam9pbicsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge30pKTtcblx0fVxuXG5cdC8qXG5cdCBodHRwczovL2FwaS5zbGFjay5jb20vZXZlbnRzL3JlYWN0aW9uX3JlbW92ZWRcblx0ICovXG5cdG9uUmVhY3Rpb25SZW1vdmVkKHNsYWNrUmVhY3Rpb25Nc2cpIHtcblx0XHRpZiAoc2xhY2tSZWFjdGlvbk1zZykge1xuXHRcdFx0aWYgKCEgdGhpcy5zbGFja0JyaWRnZS5pc1JlYWN0aW9uc0VuYWJsZWQpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3Qgcm9ja2V0VXNlciA9IHRoaXMucm9ja2V0LmdldFVzZXIoc2xhY2tSZWFjdGlvbk1zZy51c2VyKTtcblx0XHRcdC8vIExldHMgZmluZCBvdXIgUm9ja2V0IG9yaWdpbmF0ZWQgbWVzc2FnZVxuXHRcdFx0bGV0IHJvY2tldE1zZyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeVNsYWNrVHMoc2xhY2tSZWFjdGlvbk1zZy5pdGVtLnRzKTtcblxuXHRcdFx0aWYgKCFyb2NrZXRNc2cpIHtcblx0XHRcdFx0Ly8gTXVzdCBoYXZlIG9yaWdpbmF0ZWQgZnJvbSBTbGFja1xuXHRcdFx0XHRjb25zdCByb2NrZXRJRCA9IHRoaXMucm9ja2V0LmNyZWF0ZVJvY2tldElEKHNsYWNrUmVhY3Rpb25Nc2cuaXRlbS5jaGFubmVsLCBzbGFja1JlYWN0aW9uTXNnLml0ZW0udHMpO1xuXHRcdFx0XHRyb2NrZXRNc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZChyb2NrZXRJRCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChyb2NrZXRNc2cgJiYgcm9ja2V0VXNlcikge1xuXHRcdFx0XHRjb25zdCByb2NrZXRSZWFjdGlvbiA9IGA6JHsgc2xhY2tSZWFjdGlvbk1zZy5yZWFjdGlvbiB9OmA7XG5cblx0XHRcdFx0Ly8gSWYgdGhlIFJvY2tldCB1c2VyIGhhcyBhbHJlYWR5IGJlZW4gcmVtb3ZlZCwgdGhlbiB0aGlzIGlzIGFuIGVjaG8gYmFjayBmcm9tIHNsYWNrXG5cdFx0XHRcdGlmIChyb2NrZXRNc2cucmVhY3Rpb25zKSB7XG5cdFx0XHRcdFx0Y29uc3QgdGhlUmVhY3Rpb24gPSByb2NrZXRNc2cucmVhY3Rpb25zW3JvY2tldFJlYWN0aW9uXTtcblx0XHRcdFx0XHRpZiAodGhlUmVhY3Rpb24pIHtcblx0XHRcdFx0XHRcdGlmICh0aGVSZWFjdGlvbi51c2VybmFtZXMuaW5kZXhPZihyb2NrZXRVc2VyLnVzZXJuYW1lKSA9PT0gLTEpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuOyAvLyBSZWFjdGlvbiBhbHJlYWR5IHJlbW92ZWRcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gUmVhY3Rpb24gYWxyZWFkeSByZW1vdmVkXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gU3Rhc2ggdGhpcyBhd2F5IHRvIGtleSBvZmYgaXQgbGF0ZXIgc28gd2UgZG9uJ3Qgc2VuZCBpdCBiYWNrIHRvIFNsYWNrXG5cdFx0XHRcdHRoaXMuc2xhY2tCcmlkZ2UucmVhY3Rpb25zTWFwLnNldChgdW5zZXQkeyByb2NrZXRNc2cuX2lkIH0keyByb2NrZXRSZWFjdGlvbiB9YCwgcm9ja2V0VXNlcik7XG5cdFx0XHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnUmVtb3ZpbmcgcmVhY3Rpb24gZnJvbSBTbGFjaycpO1xuXHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKHJvY2tldFVzZXIuX2lkLCAoKSA9PiB7XG5cdFx0XHRcdFx0TWV0ZW9yLmNhbGwoJ3NldFJlYWN0aW9uJywgcm9ja2V0UmVhY3Rpb24sIHJvY2tldE1zZy5faWQpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKlxuXHQgaHR0cHM6Ly9hcGkuc2xhY2suY29tL2V2ZW50cy9yZWFjdGlvbl9hZGRlZFxuXHQgKi9cblx0b25SZWFjdGlvbkFkZGVkKHNsYWNrUmVhY3Rpb25Nc2cpIHtcblx0XHRpZiAoc2xhY2tSZWFjdGlvbk1zZykge1xuXHRcdFx0aWYgKCEgdGhpcy5zbGFja0JyaWRnZS5pc1JlYWN0aW9uc0VuYWJsZWQpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3Qgcm9ja2V0VXNlciA9IHRoaXMucm9ja2V0LmdldFVzZXIoc2xhY2tSZWFjdGlvbk1zZy51c2VyKTtcblxuXHRcdFx0aWYgKHJvY2tldFVzZXIucm9sZXMuaW5jbHVkZXMoJ2JvdCcpKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gTGV0cyBmaW5kIG91ciBSb2NrZXQgb3JpZ2luYXRlZCBtZXNzYWdlXG5cdFx0XHRsZXQgcm9ja2V0TXNnID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZUJ5U2xhY2tUcyhzbGFja1JlYWN0aW9uTXNnLml0ZW0udHMpO1xuXG5cdFx0XHRpZiAoIXJvY2tldE1zZykge1xuXHRcdFx0XHQvLyBNdXN0IGhhdmUgb3JpZ2luYXRlZCBmcm9tIFNsYWNrXG5cdFx0XHRcdGNvbnN0IHJvY2tldElEID0gdGhpcy5yb2NrZXQuY3JlYXRlUm9ja2V0SUQoc2xhY2tSZWFjdGlvbk1zZy5pdGVtLmNoYW5uZWwsIHNsYWNrUmVhY3Rpb25Nc2cuaXRlbS50cyk7XG5cdFx0XHRcdHJvY2tldE1zZyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKHJvY2tldElEKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHJvY2tldE1zZyAmJiByb2NrZXRVc2VyKSB7XG5cdFx0XHRcdGNvbnN0IHJvY2tldFJlYWN0aW9uID0gYDokeyBzbGFja1JlYWN0aW9uTXNnLnJlYWN0aW9uIH06YDtcblxuXHRcdFx0XHQvLyBJZiB0aGUgUm9ja2V0IHVzZXIgaGFzIGFscmVhZHkgcmVhY3RlZCwgdGhlbiB0aGlzIGlzIFNsYWNrIGVjaG9pbmcgYmFjayB0byB1c1xuXHRcdFx0XHRpZiAocm9ja2V0TXNnLnJlYWN0aW9ucykge1xuXHRcdFx0XHRcdGNvbnN0IHRoZVJlYWN0aW9uID0gcm9ja2V0TXNnLnJlYWN0aW9uc1tyb2NrZXRSZWFjdGlvbl07XG5cdFx0XHRcdFx0aWYgKHRoZVJlYWN0aW9uKSB7XG5cdFx0XHRcdFx0XHRpZiAodGhlUmVhY3Rpb24udXNlcm5hbWVzLmluZGV4T2Yocm9ja2V0VXNlci51c2VybmFtZSkgIT09IC0xKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybjsgLy8gQWxyZWFkeSByZWFjdGVkXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gU3Rhc2ggdGhpcyBhd2F5IHRvIGtleSBvZmYgaXQgbGF0ZXIgc28gd2UgZG9uJ3Qgc2VuZCBpdCBiYWNrIHRvIFNsYWNrXG5cdFx0XHRcdHRoaXMuc2xhY2tCcmlkZ2UucmVhY3Rpb25zTWFwLnNldChgc2V0JHsgcm9ja2V0TXNnLl9pZCB9JHsgcm9ja2V0UmVhY3Rpb24gfWAsIHJvY2tldFVzZXIpO1xuXHRcdFx0XHRsb2dnZXIuc2xhY2suZGVidWcoJ0FkZGluZyByZWFjdGlvbiBmcm9tIFNsYWNrJyk7XG5cdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIocm9ja2V0VXNlci5faWQsICgpID0+IHtcblx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnc2V0UmVhY3Rpb24nLCByb2NrZXRSZWFjdGlvbiwgcm9ja2V0TXNnLl9pZCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdG9uQ2hhbm5lbExlZnQoY2hhbm5lbExlZnRNc2cpIHtcblx0XHR0aGlzLnJlbW92ZVNsYWNrQ2hhbm5lbChjaGFubmVsTGVmdE1zZy5jaGFubmVsKTtcblx0fVxuXHQvKipcblx0ICogV2UgaGF2ZSByZWNlaXZlZCBhIG1lc3NhZ2UgZnJvbSBzbGFjayBhbmQgd2UgbmVlZCB0byBzYXZlL2RlbGV0ZS91cGRhdGUgaXQgaW50byByb2NrZXRcblx0ICogaHR0cHM6Ly9hcGkuc2xhY2suY29tL2V2ZW50cy9tZXNzYWdlXG5cdCAqL1xuXHRvbk1lc3NhZ2Uoc2xhY2tNZXNzYWdlLCBpc0ltcG9ydGluZykge1xuXHRcdGlmIChzbGFja01lc3NhZ2Uuc3VidHlwZSkge1xuXHRcdFx0c3dpdGNoIChzbGFja01lc3NhZ2Uuc3VidHlwZSkge1xuXHRcdFx0XHRjYXNlICdtZXNzYWdlX2RlbGV0ZWQnOlxuXHRcdFx0XHRcdHRoaXMucHJvY2Vzc01lc3NhZ2VEZWxldGVkKHNsYWNrTWVzc2FnZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ21lc3NhZ2VfY2hhbmdlZCc6XG5cdFx0XHRcdFx0dGhpcy5wcm9jZXNzTWVzc2FnZUNoYW5nZWQoc2xhY2tNZXNzYWdlKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAnY2hhbm5lbF9qb2luJzpcblx0XHRcdFx0XHR0aGlzLnByb2Nlc3NDaGFubmVsSm9pbihzbGFja01lc3NhZ2UpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdmaWxlX3NoYXJlJzpcblx0XHRcdFx0XHR0aGlzLnByb2Nlc3NGaWxlU2hhcmUoc2xhY2tNZXNzYWdlKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHQvLyBLZWVwaW5nIGJhY2t3YXJkcyBjb21wYXRhYmlsaXR5IGZvciBub3csIHJlZmFjdG9yIGxhdGVyXG5cdFx0XHRcdFx0dGhpcy5wcm9jZXNzTmV3TWVzc2FnZShzbGFja01lc3NhZ2UsIGlzSW1wb3J0aW5nKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gU2ltcGxlIG1lc3NhZ2Vcblx0XHRcdHRoaXMucHJvY2Vzc05ld01lc3NhZ2Uoc2xhY2tNZXNzYWdlLCBpc0ltcG9ydGluZyk7XG5cdFx0fVxuXHR9XG5cblx0cG9zdEdldENoYW5uZWxJbmZvKHNsYWNrQ2hJRCkge1xuXHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnR2V0dGluZyBzbGFjayBjaGFubmVsIGluZm8nLCBzbGFja0NoSUQpO1xuXHRcdGNvbnN0IHJlc3BvbnNlID0gSFRUUC5nZXQoJ2h0dHBzOi8vc2xhY2suY29tL2FwaS9jaGFubmVscy5pbmZvJywgeyBwYXJhbXM6IHsgdG9rZW46IHRoaXMuYXBpVG9rZW4sIGNoYW5uZWw6IHNsYWNrQ2hJRCB9IH0pO1xuXHRcdGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5kYXRhKSB7XG5cdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YS5jaGFubmVsO1xuXHRcdH1cblx0fVxuXG5cdHBvc3RGaW5kQ2hhbm5lbChyb2NrZXRDaGFubmVsTmFtZSkge1xuXHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnU2VhcmNoaW5nIGZvciBTbGFjayBjaGFubmVsIG9yIGdyb3VwJywgcm9ja2V0Q2hhbm5lbE5hbWUpO1xuXHRcdGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KCdodHRwczovL3NsYWNrLmNvbS9hcGkvY2hhbm5lbHMubGlzdCcsIHsgcGFyYW1zOiB7IHRva2VuOiB0aGlzLmFwaVRva2VuIH0gfSk7XG5cdFx0aWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmRhdGEgJiYgXy5pc0FycmF5KHJlc3BvbnNlLmRhdGEuY2hhbm5lbHMpICYmIHJlc3BvbnNlLmRhdGEuY2hhbm5lbHMubGVuZ3RoID4gMCkge1xuXHRcdFx0Zm9yIChjb25zdCBjaGFubmVsIG9mIHJlc3BvbnNlLmRhdGEuY2hhbm5lbHMpIHtcblx0XHRcdFx0aWYgKGNoYW5uZWwubmFtZSA9PT0gcm9ja2V0Q2hhbm5lbE5hbWUgJiYgY2hhbm5lbC5pc19tZW1iZXIgPT09IHRydWUpIHtcblx0XHRcdFx0XHRyZXR1cm4gY2hhbm5lbDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXNwb25zZSA9IEhUVFAuZ2V0KCdodHRwczovL3NsYWNrLmNvbS9hcGkvZ3JvdXBzLmxpc3QnLCB7IHBhcmFtczogeyB0b2tlbjogdGhpcy5hcGlUb2tlbiB9IH0pO1xuXHRcdGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5kYXRhICYmIF8uaXNBcnJheShyZXNwb25zZS5kYXRhLmdyb3VwcykgJiYgcmVzcG9uc2UuZGF0YS5ncm91cHMubGVuZ3RoID4gMCkge1xuXHRcdFx0Zm9yIChjb25zdCBncm91cCBvZiByZXNwb25zZS5kYXRhLmdyb3Vwcykge1xuXHRcdFx0XHRpZiAoZ3JvdXAubmFtZSA9PT0gcm9ja2V0Q2hhbm5lbE5hbWUpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ3JvdXA7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogUmV0cmlldmVzIHRoZSBTbGFjayBUUyBmcm9tIGEgUm9ja2V0IG1zZyB0aGF0IG9yaWdpbmF0ZWQgZnJvbSBTbGFja1xuXHQgKiBAcGFyYW0gcm9ja2V0TXNnXG5cdCAqIEByZXR1cm5zIFNsYWNrIFRTIG9yIHVuZGVmaW5lZCBpZiBub3QgYSBtZXNzYWdlIHRoYXQgb3JpZ2luYXRlZCBmcm9tIHNsYWNrXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRnZXRUaW1lU3RhbXAocm9ja2V0TXNnKSB7XG5cdFx0Ly8gc2xhY2stRzNLSkdHRTE1LTE0ODMwODEwNjEtMDAwMTY5XG5cdFx0bGV0IHNsYWNrVFM7XG5cdFx0bGV0IGluZGV4ID0gcm9ja2V0TXNnLl9pZC5pbmRleE9mKCdzbGFjay0nKTtcblx0XHRpZiAoaW5kZXggPT09IDApIHtcblx0XHRcdC8vIFRoaXMgaXMgYSBtc2cgdGhhdCBvcmlnaW5hdGVkIGZyb20gU2xhY2tcblx0XHRcdHNsYWNrVFMgPSByb2NrZXRNc2cuX2lkLnN1YnN0cig2LCByb2NrZXRNc2cuX2lkLmxlbmd0aCk7XG5cdFx0XHRpbmRleCA9IHNsYWNrVFMuaW5kZXhPZignLScpO1xuXHRcdFx0c2xhY2tUUyA9IHNsYWNrVFMuc3Vic3RyKGluZGV4ICsgMSwgc2xhY2tUUy5sZW5ndGgpO1xuXHRcdFx0c2xhY2tUUyA9IHNsYWNrVFMucmVwbGFjZSgnLScsICcuJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIFRoaXMgcHJvYmFibHkgb3JpZ2luYXRlZCBhcyBhIFJvY2tldCBtc2csIGJ1dCBoYXMgYmVlbiBzZW50IHRvIFNsYWNrXG5cdFx0XHRzbGFja1RTID0gcm9ja2V0TXNnLnNsYWNrVHM7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHNsYWNrVFM7XG5cdH1cblxuXHQvKipcblx0ICogQWRkcyBhIHNsYWNrIGNoYW5uZWwgdG8gb3VyIGNvbGxlY3Rpb24gdGhhdCB0aGUgcm9ja2V0Ym90IGlzIGEgbWVtYmVyIG9mIG9uIHNsYWNrXG5cdCAqIEBwYXJhbSByb2NrZXRDaElEXG5cdCAqIEBwYXJhbSBzbGFja0NoSURcblx0ICovXG5cdGFkZFNsYWNrQ2hhbm5lbChyb2NrZXRDaElELCBzbGFja0NoSUQpIHtcblx0XHRjb25zdCBjaCA9IHRoaXMuZ2V0U2xhY2tDaGFubmVsKHJvY2tldENoSUQpO1xuXHRcdGlmIChudWxsID09IGNoKSB7XG5cdFx0XHR0aGlzLnNsYWNrQ2hhbm5lbFJvY2tldEJvdE1lbWJlcnNoaXBNYXAuc2V0KHJvY2tldENoSUQsIHsgaWQ6IHNsYWNrQ2hJRCwgZmFtaWx5OiBzbGFja0NoSUQuY2hhckF0KDApID09PSAnQycgPyAnY2hhbm5lbHMnIDogJ2dyb3VwcycgfSk7XG5cdFx0fVxuXHR9XG5cblx0cmVtb3ZlU2xhY2tDaGFubmVsKHNsYWNrQ2hJRCkge1xuXHRcdGNvbnN0IGtleXMgPSB0aGlzLnNsYWNrQ2hhbm5lbFJvY2tldEJvdE1lbWJlcnNoaXBNYXAua2V5cygpO1xuXHRcdGxldCBzbGFja0NoYW5uZWw7XG5cdFx0bGV0IGtleTtcblx0XHR3aGlsZSAoKGtleSA9IGtleXMubmV4dCgpLnZhbHVlKSAhPSBudWxsKSB7XG5cdFx0XHRzbGFja0NoYW5uZWwgPSB0aGlzLnNsYWNrQ2hhbm5lbFJvY2tldEJvdE1lbWJlcnNoaXBNYXAuZ2V0KGtleSk7XG5cdFx0XHRpZiAoc2xhY2tDaGFubmVsLmlkID09PSBzbGFja0NoSUQpIHtcblx0XHRcdFx0Ly8gRm91bmQgaXQsIG5lZWQgdG8gZGVsZXRlIGl0XG5cdFx0XHRcdHRoaXMuc2xhY2tDaGFubmVsUm9ja2V0Qm90TWVtYmVyc2hpcE1hcC5kZWxldGUoa2V5KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Z2V0U2xhY2tDaGFubmVsKHJvY2tldENoSUQpIHtcblx0XHRyZXR1cm4gdGhpcy5zbGFja0NoYW5uZWxSb2NrZXRCb3RNZW1iZXJzaGlwTWFwLmdldChyb2NrZXRDaElEKTtcblx0fVxuXG5cdHBvcHVsYXRlTWVtYmVyc2hpcENoYW5uZWxNYXBCeUNoYW5uZWxzKCkge1xuXHRcdGNvbnN0IHJlc3BvbnNlID0gSFRUUC5nZXQoJ2h0dHBzOi8vc2xhY2suY29tL2FwaS9jaGFubmVscy5saXN0JywgeyBwYXJhbXM6IHsgdG9rZW46IHRoaXMuYXBpVG9rZW4gfSB9KTtcblx0XHRpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuZGF0YSAmJiBfLmlzQXJyYXkocmVzcG9uc2UuZGF0YS5jaGFubmVscykgJiYgcmVzcG9uc2UuZGF0YS5jaGFubmVscy5sZW5ndGggPiAwKSB7XG5cdFx0XHRmb3IgKGNvbnN0IHNsYWNrQ2hhbm5lbCBvZiByZXNwb25zZS5kYXRhLmNoYW5uZWxzKSB7XG5cdFx0XHRcdGNvbnN0IHJvY2tldGNoYXRfcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeU5hbWUoc2xhY2tDaGFubmVsLm5hbWUsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXHRcdFx0XHRpZiAocm9ja2V0Y2hhdF9yb29tKSB7XG5cdFx0XHRcdFx0aWYgKHNsYWNrQ2hhbm5lbC5pc19tZW1iZXIpIHtcblx0XHRcdFx0XHRcdHRoaXMuYWRkU2xhY2tDaGFubmVsKHJvY2tldGNoYXRfcm9vbS5faWQsIHNsYWNrQ2hhbm5lbC5pZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cG9wdWxhdGVNZW1iZXJzaGlwQ2hhbm5lbE1hcEJ5R3JvdXBzKCkge1xuXHRcdGNvbnN0IHJlc3BvbnNlID0gSFRUUC5nZXQoJ2h0dHBzOi8vc2xhY2suY29tL2FwaS9ncm91cHMubGlzdCcsIHsgcGFyYW1zOiB7IHRva2VuOiB0aGlzLmFwaVRva2VuIH0gfSk7XG5cdFx0aWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmRhdGEgJiYgXy5pc0FycmF5KHJlc3BvbnNlLmRhdGEuZ3JvdXBzKSAmJiByZXNwb25zZS5kYXRhLmdyb3Vwcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRmb3IgKGNvbnN0IHNsYWNrR3JvdXAgb2YgcmVzcG9uc2UuZGF0YS5ncm91cHMpIHtcblx0XHRcdFx0Y29uc3Qgcm9ja2V0Y2hhdF9yb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5TmFtZShzbGFja0dyb3VwLm5hbWUsIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXHRcdFx0XHRpZiAocm9ja2V0Y2hhdF9yb29tKSB7XG5cdFx0XHRcdFx0aWYgKHNsYWNrR3JvdXAuaXNfbWVtYmVyKSB7XG5cdFx0XHRcdFx0XHR0aGlzLmFkZFNsYWNrQ2hhbm5lbChyb2NrZXRjaGF0X3Jvb20uX2lkLCBzbGFja0dyb3VwLmlkKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRwb3B1bGF0ZU1lbWJlcnNoaXBDaGFubmVsTWFwKCkge1xuXHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnUG9wdWxhdGluZyBjaGFubmVsIG1hcCcpO1xuXHRcdHRoaXMucG9wdWxhdGVNZW1iZXJzaGlwQ2hhbm5lbE1hcEJ5Q2hhbm5lbHMoKTtcblx0XHR0aGlzLnBvcHVsYXRlTWVtYmVyc2hpcENoYW5uZWxNYXBCeUdyb3VwcygpO1xuXHR9XG5cblx0Lypcblx0IGh0dHBzOi8vYXBpLnNsYWNrLmNvbS9tZXRob2RzL3JlYWN0aW9ucy5hZGRcblx0ICovXG5cdHBvc3RSZWFjdGlvbkFkZGVkKHJlYWN0aW9uLCBzbGFja0NoYW5uZWwsIHNsYWNrVFMpIHtcblx0XHRpZiAocmVhY3Rpb24gJiYgc2xhY2tDaGFubmVsICYmIHNsYWNrVFMpIHtcblx0XHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHRcdHRva2VuOiB0aGlzLmFwaVRva2VuLFxuXHRcdFx0XHRuYW1lOiByZWFjdGlvbixcblx0XHRcdFx0Y2hhbm5lbDogc2xhY2tDaGFubmVsLFxuXHRcdFx0XHR0aW1lc3RhbXA6IHNsYWNrVFMsXG5cdFx0XHR9O1xuXG5cdFx0XHRsb2dnZXIuc2xhY2suZGVidWcoJ1Bvc3RpbmcgQWRkIFJlYWN0aW9uIHRvIFNsYWNrJyk7XG5cdFx0XHRjb25zdCBwb3N0UmVzdWx0ID0gSFRUUC5wb3N0KCdodHRwczovL3NsYWNrLmNvbS9hcGkvcmVhY3Rpb25zLmFkZCcsIHsgcGFyYW1zOiBkYXRhIH0pO1xuXHRcdFx0aWYgKHBvc3RSZXN1bHQuc3RhdHVzQ29kZSA9PT0gMjAwICYmIHBvc3RSZXN1bHQuZGF0YSAmJiBwb3N0UmVzdWx0LmRhdGEub2sgPT09IHRydWUpIHtcblx0XHRcdFx0bG9nZ2VyLnNsYWNrLmRlYnVnKCdSZWFjdGlvbiBhZGRlZCB0byBTbGFjaycpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qXG5cdCBodHRwczovL2FwaS5zbGFjay5jb20vbWV0aG9kcy9yZWFjdGlvbnMucmVtb3ZlXG5cdCAqL1xuXHRwb3N0UmVhY3Rpb25SZW1vdmUocmVhY3Rpb24sIHNsYWNrQ2hhbm5lbCwgc2xhY2tUUykge1xuXHRcdGlmIChyZWFjdGlvbiAmJiBzbGFja0NoYW5uZWwgJiYgc2xhY2tUUykge1xuXHRcdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdFx0dG9rZW46IHRoaXMuYXBpVG9rZW4sXG5cdFx0XHRcdG5hbWU6IHJlYWN0aW9uLFxuXHRcdFx0XHRjaGFubmVsOiBzbGFja0NoYW5uZWwsXG5cdFx0XHRcdHRpbWVzdGFtcDogc2xhY2tUUyxcblx0XHRcdH07XG5cblx0XHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnUG9zdGluZyBSZW1vdmUgUmVhY3Rpb24gdG8gU2xhY2snKTtcblx0XHRcdGNvbnN0IHBvc3RSZXN1bHQgPSBIVFRQLnBvc3QoJ2h0dHBzOi8vc2xhY2suY29tL2FwaS9yZWFjdGlvbnMucmVtb3ZlJywgeyBwYXJhbXM6IGRhdGEgfSk7XG5cdFx0XHRpZiAocG9zdFJlc3VsdC5zdGF0dXNDb2RlID09PSAyMDAgJiYgcG9zdFJlc3VsdC5kYXRhICYmIHBvc3RSZXN1bHQuZGF0YS5vayA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRsb2dnZXIuc2xhY2suZGVidWcoJ1JlYWN0aW9uIHJlbW92ZWQgZnJvbSBTbGFjaycpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHBvc3REZWxldGVNZXNzYWdlKHJvY2tldE1lc3NhZ2UpIHtcblx0XHRpZiAocm9ja2V0TWVzc2FnZSkge1xuXHRcdFx0Y29uc3Qgc2xhY2tDaGFubmVsID0gdGhpcy5nZXRTbGFja0NoYW5uZWwocm9ja2V0TWVzc2FnZS5yaWQpO1xuXG5cdFx0XHRpZiAoc2xhY2tDaGFubmVsICE9IG51bGwpIHtcblx0XHRcdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdFx0XHR0b2tlbjogdGhpcy5hcGlUb2tlbixcblx0XHRcdFx0XHR0czogdGhpcy5nZXRUaW1lU3RhbXAocm9ja2V0TWVzc2FnZSksXG5cdFx0XHRcdFx0Y2hhbm5lbDogdGhpcy5nZXRTbGFja0NoYW5uZWwocm9ja2V0TWVzc2FnZS5yaWQpLmlkLFxuXHRcdFx0XHRcdGFzX3VzZXI6IHRydWUsXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0bG9nZ2VyLnNsYWNrLmRlYnVnKCdQb3N0IERlbGV0ZSBNZXNzYWdlIHRvIFNsYWNrJywgZGF0YSk7XG5cdFx0XHRcdGNvbnN0IHBvc3RSZXN1bHQgPSBIVFRQLnBvc3QoJ2h0dHBzOi8vc2xhY2suY29tL2FwaS9jaGF0LmRlbGV0ZScsIHsgcGFyYW1zOiBkYXRhIH0pO1xuXHRcdFx0XHRpZiAocG9zdFJlc3VsdC5zdGF0dXNDb2RlID09PSAyMDAgJiYgcG9zdFJlc3VsdC5kYXRhICYmIHBvc3RSZXN1bHQuZGF0YS5vayA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnTWVzc2FnZSBkZWxldGVkIG9uIFNsYWNrJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRwb3N0TWVzc2FnZShzbGFja0NoYW5uZWwsIHJvY2tldE1lc3NhZ2UpIHtcblx0XHRpZiAoc2xhY2tDaGFubmVsICYmIHNsYWNrQ2hhbm5lbC5pZCkge1xuXHRcdFx0bGV0IGljb25VcmwgPSBnZXRBdmF0YXJVcmxGcm9tVXNlcm5hbWUocm9ja2V0TWVzc2FnZS51ICYmIHJvY2tldE1lc3NhZ2UudS51c2VybmFtZSk7XG5cdFx0XHRpZiAoaWNvblVybCkge1xuXHRcdFx0XHRpY29uVXJsID0gTWV0ZW9yLmFic29sdXRlVXJsKCkucmVwbGFjZSgvXFwvJC8sICcnKSArIGljb25Vcmw7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0XHR0b2tlbjogdGhpcy5hcGlUb2tlbixcblx0XHRcdFx0dGV4dDogcm9ja2V0TWVzc2FnZS5tc2csXG5cdFx0XHRcdGNoYW5uZWw6IHNsYWNrQ2hhbm5lbC5pZCxcblx0XHRcdFx0dXNlcm5hbWU6IHJvY2tldE1lc3NhZ2UudSAmJiByb2NrZXRNZXNzYWdlLnUudXNlcm5hbWUsXG5cdFx0XHRcdGljb25fdXJsOiBpY29uVXJsLFxuXHRcdFx0XHRsaW5rX25hbWVzOiAxLFxuXHRcdFx0fTtcblx0XHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnUG9zdCBNZXNzYWdlIFRvIFNsYWNrJywgZGF0YSk7XG5cdFx0XHRjb25zdCBwb3N0UmVzdWx0ID0gSFRUUC5wb3N0KCdodHRwczovL3NsYWNrLmNvbS9hcGkvY2hhdC5wb3N0TWVzc2FnZScsIHsgcGFyYW1zOiBkYXRhIH0pO1xuXHRcdFx0aWYgKHBvc3RSZXN1bHQuc3RhdHVzQ29kZSA9PT0gMjAwICYmIHBvc3RSZXN1bHQuZGF0YSAmJiBwb3N0UmVzdWx0LmRhdGEubWVzc2FnZSAmJiBwb3N0UmVzdWx0LmRhdGEubWVzc2FnZS5ib3RfaWQgJiYgcG9zdFJlc3VsdC5kYXRhLm1lc3NhZ2UudHMpIHtcblx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuc2V0U2xhY2tCb3RJZEFuZFNsYWNrVHMocm9ja2V0TWVzc2FnZS5faWQsIHBvc3RSZXN1bHQuZGF0YS5tZXNzYWdlLmJvdF9pZCwgcG9zdFJlc3VsdC5kYXRhLm1lc3NhZ2UudHMpO1xuXHRcdFx0XHRsb2dnZXIuc2xhY2suZGVidWcoYFJvY2tldE1zZ0lEPSR7IHJvY2tldE1lc3NhZ2UuX2lkIH0gU2xhY2tNc2dJRD0keyBwb3N0UmVzdWx0LmRhdGEubWVzc2FnZS50cyB9IFNsYWNrQm90SUQ9JHsgcG9zdFJlc3VsdC5kYXRhLm1lc3NhZ2UuYm90X2lkIH1gKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKlxuXHQgaHR0cHM6Ly9hcGkuc2xhY2suY29tL21ldGhvZHMvY2hhdC51cGRhdGVcblx0ICovXG5cdHBvc3RNZXNzYWdlVXBkYXRlKHNsYWNrQ2hhbm5lbCwgcm9ja2V0TWVzc2FnZSkge1xuXHRcdGlmIChzbGFja0NoYW5uZWwgJiYgc2xhY2tDaGFubmVsLmlkKSB7XG5cdFx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0XHR0b2tlbjogdGhpcy5hcGlUb2tlbixcblx0XHRcdFx0dHM6IHRoaXMuZ2V0VGltZVN0YW1wKHJvY2tldE1lc3NhZ2UpLFxuXHRcdFx0XHRjaGFubmVsOiBzbGFja0NoYW5uZWwuaWQsXG5cdFx0XHRcdHRleHQ6IHJvY2tldE1lc3NhZ2UubXNnLFxuXHRcdFx0XHRhc191c2VyOiB0cnVlLFxuXHRcdFx0fTtcblx0XHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnUG9zdCBVcGRhdGVNZXNzYWdlIFRvIFNsYWNrJywgZGF0YSk7XG5cdFx0XHRjb25zdCBwb3N0UmVzdWx0ID0gSFRUUC5wb3N0KCdodHRwczovL3NsYWNrLmNvbS9hcGkvY2hhdC51cGRhdGUnLCB7IHBhcmFtczogZGF0YSB9KTtcblx0XHRcdGlmIChwb3N0UmVzdWx0LnN0YXR1c0NvZGUgPT09IDIwMCAmJiBwb3N0UmVzdWx0LmRhdGEgJiYgcG9zdFJlc3VsdC5kYXRhLm9rID09PSB0cnVlKSB7XG5cdFx0XHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnTWVzc2FnZSB1cGRhdGVkIG9uIFNsYWNrJyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cHJvY2Vzc0NoYW5uZWxKb2luKHNsYWNrTWVzc2FnZSkge1xuXHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnQ2hhbm5lbCBqb2luJywgc2xhY2tNZXNzYWdlLmNoYW5uZWwuaWQpO1xuXHRcdGNvbnN0IHJvY2tldENoID0gdGhpcy5yb2NrZXQuYWRkQ2hhbm5lbChzbGFja01lc3NhZ2UuY2hhbm5lbCk7XG5cdFx0aWYgKG51bGwgIT0gcm9ja2V0Q2gpIHtcblx0XHRcdHRoaXMuYWRkU2xhY2tDaGFubmVsKHJvY2tldENoLl9pZCwgc2xhY2tNZXNzYWdlLmNoYW5uZWwpO1xuXHRcdH1cblx0fVxuXG5cdHByb2Nlc3NGaWxlU2hhcmUoc2xhY2tNZXNzYWdlKSB7XG5cdFx0aWYgKCEgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NsYWNrQnJpZGdlX0ZpbGVVcGxvYWRfRW5hYmxlZCcpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKHNsYWNrTWVzc2FnZS5maWxlICYmIHNsYWNrTWVzc2FnZS5maWxlLnVybF9wcml2YXRlX2Rvd25sb2FkICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGNvbnN0IHJvY2tldENoYW5uZWwgPSB0aGlzLnJvY2tldC5nZXRDaGFubmVsKHNsYWNrTWVzc2FnZSk7XG5cdFx0XHRjb25zdCByb2NrZXRVc2VyID0gdGhpcy5yb2NrZXQuZ2V0VXNlcihzbGFja01lc3NhZ2UudXNlcik7XG5cblx0XHRcdC8vIEhhY2sgdG8gbm90aWZ5IHRoYXQgYSBmaWxlIHdhcyBhdHRlbXB0ZWQgdG8gYmUgdXBsb2FkZWRcblx0XHRcdGRlbGV0ZSBzbGFja01lc3NhZ2Uuc3VidHlwZTtcblxuXHRcdFx0Ly8gSWYgdGhlIHRleHQgaW5jbHVkZXMgdGhlIGZpbGUgbGluaywgc2ltcGx5IHVzZSB0aGUgc2FtZSB0ZXh0IGZvciB0aGUgcm9ja2V0IG1lc3NhZ2UuXG5cdFx0XHQvLyBJZiB0aGUgbGluayB3YXMgbm90IGluY2x1ZGVkLCB0aGVuIHVzZSBpdCBpbnN0ZWFkIG9mIHRoZSBtZXNzYWdlLlxuXG5cdFx0XHRpZiAoc2xhY2tNZXNzYWdlLnRleHQuaW5kZXhPZihzbGFja01lc3NhZ2UuZmlsZS5wZXJtYWxpbmspIDwgMCkge1xuXHRcdFx0XHRzbGFja01lc3NhZ2UudGV4dCA9IHNsYWNrTWVzc2FnZS5maWxlLnBlcm1hbGluaztcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgdHMgPSBuZXcgRGF0ZShwYXJzZUludChzbGFja01lc3NhZ2UudHMuc3BsaXQoJy4nKVswXSkgKiAxMDAwKTtcblx0XHRcdGNvbnN0IG1zZ0RhdGFEZWZhdWx0cyA9IHtcblx0XHRcdFx0X2lkOiB0aGlzLnJvY2tldC5jcmVhdGVSb2NrZXRJRChzbGFja01lc3NhZ2UuY2hhbm5lbCwgc2xhY2tNZXNzYWdlLnRzKSxcblx0XHRcdFx0dHMsXG5cdFx0XHRcdHVwZGF0ZWRCeVNsYWNrOiB0cnVlLFxuXHRcdFx0fTtcblxuXHRcdFx0dGhpcy5yb2NrZXQuY3JlYXRlQW5kU2F2ZU1lc3NhZ2Uocm9ja2V0Q2hhbm5lbCwgcm9ja2V0VXNlciwgc2xhY2tNZXNzYWdlLCBtc2dEYXRhRGVmYXVsdHMsIGZhbHNlKTtcblx0XHR9XG5cdH1cblxuXHQvKlxuXHQgaHR0cHM6Ly9hcGkuc2xhY2suY29tL2V2ZW50cy9tZXNzYWdlL21lc3NhZ2VfZGVsZXRlZFxuXHQgKi9cblx0cHJvY2Vzc01lc3NhZ2VEZWxldGVkKHNsYWNrTWVzc2FnZSkge1xuXHRcdGlmIChzbGFja01lc3NhZ2UucHJldmlvdXNfbWVzc2FnZSkge1xuXHRcdFx0Y29uc3Qgcm9ja2V0Q2hhbm5lbCA9IHRoaXMucm9ja2V0LmdldENoYW5uZWwoc2xhY2tNZXNzYWdlKTtcblx0XHRcdGNvbnN0IHJvY2tldFVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCgncm9ja2V0LmNhdCcsIHsgZmllbGRzOiB7IHVzZXJuYW1lOiAxIH0gfSk7XG5cblx0XHRcdGlmIChyb2NrZXRDaGFubmVsICYmIHJvY2tldFVzZXIpIHtcblx0XHRcdFx0Ly8gRmluZCB0aGUgUm9ja2V0IG1lc3NhZ2UgdG8gZGVsZXRlXG5cdFx0XHRcdGxldCByb2NrZXRNc2dPYmogPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlc1xuXHRcdFx0XHRcdC5maW5kT25lQnlTbGFja0JvdElkQW5kU2xhY2tUcyhzbGFja01lc3NhZ2UucHJldmlvdXNfbWVzc2FnZS5ib3RfaWQsIHNsYWNrTWVzc2FnZS5wcmV2aW91c19tZXNzYWdlLnRzKTtcblxuXHRcdFx0XHRpZiAoIXJvY2tldE1zZ09iaikge1xuXHRcdFx0XHRcdC8vIE11c3QgaGF2ZSBiZWVuIGEgU2xhY2sgb3JpZ2luYXRlZCBtc2dcblx0XHRcdFx0XHRjb25zdCBfaWQgPSB0aGlzLnJvY2tldC5jcmVhdGVSb2NrZXRJRChzbGFja01lc3NhZ2UuY2hhbm5lbCwgc2xhY2tNZXNzYWdlLnByZXZpb3VzX21lc3NhZ2UudHMpO1xuXHRcdFx0XHRcdHJvY2tldE1zZ09iaiA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKF9pZCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAocm9ja2V0TXNnT2JqKSB7XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5kZWxldGVNZXNzYWdlKHJvY2tldE1zZ09iaiwgcm9ja2V0VXNlcik7XG5cdFx0XHRcdFx0bG9nZ2VyLnNsYWNrLmRlYnVnKCdSb2NrZXQgbWVzc2FnZSBkZWxldGVkIGJ5IFNsYWNrJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKlxuXHQgaHR0cHM6Ly9hcGkuc2xhY2suY29tL2V2ZW50cy9tZXNzYWdlL21lc3NhZ2VfY2hhbmdlZFxuXHQgKi9cblx0cHJvY2Vzc01lc3NhZ2VDaGFuZ2VkKHNsYWNrTWVzc2FnZSkge1xuXHRcdGlmIChzbGFja01lc3NhZ2UucHJldmlvdXNfbWVzc2FnZSkge1xuXHRcdFx0Y29uc3QgY3VycmVudE1zZyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKHRoaXMucm9ja2V0LmNyZWF0ZVJvY2tldElEKHNsYWNrTWVzc2FnZS5jaGFubmVsLCBzbGFja01lc3NhZ2UubWVzc2FnZS50cykpO1xuXG5cdFx0XHQvLyBPbmx5IHByb2Nlc3MgdGhpcyBjaGFuZ2UsIGlmIGl0cyBhbiBhY3R1YWwgdXBkYXRlIChub3QganVzdCBTbGFjayByZXBlYXRpbmcgYmFjayBvdXIgUm9ja2V0IG9yaWdpbmFsIGNoYW5nZSlcblx0XHRcdGlmIChjdXJyZW50TXNnICYmIChzbGFja01lc3NhZ2UubWVzc2FnZS50ZXh0ICE9PSBjdXJyZW50TXNnLm1zZykpIHtcblx0XHRcdFx0Y29uc3Qgcm9ja2V0Q2hhbm5lbCA9IHRoaXMucm9ja2V0LmdldENoYW5uZWwoc2xhY2tNZXNzYWdlKTtcblx0XHRcdFx0Y29uc3Qgcm9ja2V0VXNlciA9IHNsYWNrTWVzc2FnZS5wcmV2aW91c19tZXNzYWdlLnVzZXIgPyB0aGlzLnJvY2tldC5maW5kVXNlcihzbGFja01lc3NhZ2UucHJldmlvdXNfbWVzc2FnZS51c2VyKSB8fCB0aGlzLnJvY2tldC5hZGRVc2VyKHNsYWNrTWVzc2FnZS5wcmV2aW91c19tZXNzYWdlLnVzZXIpIDogbnVsbDtcblxuXHRcdFx0XHRjb25zdCByb2NrZXRNc2dPYmogPSB7XG5cdFx0XHRcdFx0Ly8gQFRPRE8gX2lkXG5cdFx0XHRcdFx0X2lkOiB0aGlzLnJvY2tldC5jcmVhdGVSb2NrZXRJRChzbGFja01lc3NhZ2UuY2hhbm5lbCwgc2xhY2tNZXNzYWdlLnByZXZpb3VzX21lc3NhZ2UudHMpLFxuXHRcdFx0XHRcdHJpZDogcm9ja2V0Q2hhbm5lbC5faWQsXG5cdFx0XHRcdFx0bXNnOiB0aGlzLnJvY2tldC5jb252ZXJ0U2xhY2tNc2dUeHRUb1JvY2tldFR4dEZvcm1hdChzbGFja01lc3NhZ2UubWVzc2FnZS50ZXh0KSxcblx0XHRcdFx0XHR1cGRhdGVkQnlTbGFjazogdHJ1ZSxcdC8vIFdlIGRvbid0IHdhbnQgdG8gbm90aWZ5IHNsYWNrIGFib3V0IHRoaXMgY2hhbmdlIHNpbmNlIFNsYWNrIGluaXRpYXRlZCBpdFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdFJvY2tldENoYXQudXBkYXRlTWVzc2FnZShyb2NrZXRNc2dPYmosIHJvY2tldFVzZXIpO1xuXHRcdFx0XHRsb2dnZXIuc2xhY2suZGVidWcoJ1JvY2tldCBtZXNzYWdlIHVwZGF0ZWQgYnkgU2xhY2snKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKlxuXHQgVGhpcyBtZXRob2Qgd2lsbCBnZXQgcmVmYWN0b3JlZCBhbmQgYnJva2VuIGRvd24gaW50byBzaW5nbGUgcmVzcG9uc2liaWxpdGllc1xuXHQgKi9cblx0cHJvY2Vzc05ld01lc3NhZ2Uoc2xhY2tNZXNzYWdlLCBpc0ltcG9ydGluZykge1xuXHRcdGNvbnN0IHJvY2tldENoYW5uZWwgPSB0aGlzLnJvY2tldC5nZXRDaGFubmVsKHNsYWNrTWVzc2FnZSk7XG5cdFx0bGV0IHJvY2tldFVzZXIgPSBudWxsO1xuXHRcdGlmIChzbGFja01lc3NhZ2Uuc3VidHlwZSA9PT0gJ2JvdF9tZXNzYWdlJykge1xuXHRcdFx0cm9ja2V0VXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKCdyb2NrZXQuY2F0JywgeyBmaWVsZHM6IHsgdXNlcm5hbWU6IDEgfSB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cm9ja2V0VXNlciA9IHNsYWNrTWVzc2FnZS51c2VyID8gdGhpcy5yb2NrZXQuZmluZFVzZXIoc2xhY2tNZXNzYWdlLnVzZXIpIHx8IHRoaXMucm9ja2V0LmFkZFVzZXIoc2xhY2tNZXNzYWdlLnVzZXIpIDogbnVsbDtcblx0XHR9XG5cdFx0aWYgKHJvY2tldENoYW5uZWwgJiYgcm9ja2V0VXNlcikge1xuXHRcdFx0Y29uc3QgbXNnRGF0YURlZmF1bHRzID0ge1xuXHRcdFx0XHRfaWQ6IHRoaXMucm9ja2V0LmNyZWF0ZVJvY2tldElEKHNsYWNrTWVzc2FnZS5jaGFubmVsLCBzbGFja01lc3NhZ2UudHMpLFxuXHRcdFx0XHR0czogbmV3IERhdGUocGFyc2VJbnQoc2xhY2tNZXNzYWdlLnRzLnNwbGl0KCcuJylbMF0pICogMTAwMCksXG5cdFx0XHR9O1xuXHRcdFx0aWYgKGlzSW1wb3J0aW5nKSB7XG5cdFx0XHRcdG1zZ0RhdGFEZWZhdWx0cy5pbXBvcnRlZCA9ICdzbGFja2JyaWRnZSc7XG5cdFx0XHR9XG5cdFx0XHR0cnkge1xuXHRcdFx0XHR0aGlzLnJvY2tldC5jcmVhdGVBbmRTYXZlTWVzc2FnZShyb2NrZXRDaGFubmVsLCByb2NrZXRVc2VyLCBzbGFja01lc3NhZ2UsIG1zZ0RhdGFEZWZhdWx0cywgaXNJbXBvcnRpbmcpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHQvLyBodHRwOi8vd3d3Lm1vbmdvZGIub3JnL2Fib3V0L2NvbnRyaWJ1dG9ycy9lcnJvci1jb2Rlcy9cblx0XHRcdFx0Ly8gMTEwMDAgPT0gZHVwbGljYXRlIGtleSBlcnJvclxuXHRcdFx0XHRpZiAoZS5uYW1lID09PSAnTW9uZ29FcnJvcicgJiYgZS5jb2RlID09PSAxMTAwMCkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRocm93IGU7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cHJvY2Vzc0JvdE1lc3NhZ2Uocm9ja2V0Q2hhbm5lbCwgc2xhY2tNZXNzYWdlKSB7XG5cdFx0Y29uc3QgZXhjbHVkZUJvdE5hbWVzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NsYWNrQnJpZGdlX0V4Y2x1ZGVCb3RuYW1lcycpO1xuXHRcdGlmIChzbGFja01lc3NhZ2UudXNlcm5hbWUgIT09IHVuZGVmaW5lZCAmJiBleGNsdWRlQm90TmFtZXMgJiYgc2xhY2tNZXNzYWdlLnVzZXJuYW1lLm1hdGNoKGV4Y2x1ZGVCb3ROYW1lcykpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCByb2NrZXRNc2dPYmogPSB7XG5cdFx0XHRtc2c6IHRoaXMucm9ja2V0LmNvbnZlcnRTbGFja01zZ1R4dFRvUm9ja2V0VHh0Rm9ybWF0KHNsYWNrTWVzc2FnZS50ZXh0KSxcblx0XHRcdHJpZDogcm9ja2V0Q2hhbm5lbC5faWQsXG5cdFx0XHRib3Q6IHRydWUsXG5cdFx0XHRhdHRhY2htZW50czogc2xhY2tNZXNzYWdlLmF0dGFjaG1lbnRzLFxuXHRcdFx0dXNlcm5hbWU6IHNsYWNrTWVzc2FnZS51c2VybmFtZSB8fCBzbGFja01lc3NhZ2UuYm90X2lkLFxuXHRcdH07XG5cdFx0dGhpcy5yb2NrZXQuYWRkQWxpYXNUb01zZyhzbGFja01lc3NhZ2UudXNlcm5hbWUgfHwgc2xhY2tNZXNzYWdlLmJvdF9pZCwgcm9ja2V0TXNnT2JqKTtcblx0XHRpZiAoc2xhY2tNZXNzYWdlLmljb25zKSB7XG5cdFx0XHRyb2NrZXRNc2dPYmouZW1vamkgPSBzbGFja01lc3NhZ2UuaWNvbnMuZW1vamk7XG5cdFx0fVxuXHRcdHJldHVybiByb2NrZXRNc2dPYmo7XG5cdH1cblxuXHRwcm9jZXNzTWVNZXNzYWdlKHJvY2tldFVzZXIsIHNsYWNrTWVzc2FnZSkge1xuXHRcdHJldHVybiB0aGlzLnJvY2tldC5hZGRBbGlhc1RvTXNnKHJvY2tldFVzZXIudXNlcm5hbWUsIHtcblx0XHRcdG1zZzogYF8keyB0aGlzLnJvY2tldC5jb252ZXJ0U2xhY2tNc2dUeHRUb1JvY2tldFR4dEZvcm1hdChzbGFja01lc3NhZ2UudGV4dCkgfV9gLFxuXHRcdH0pO1xuXHR9XG5cblx0cHJvY2Vzc0NoYW5uZWxKb2luTWVzc2FnZShyb2NrZXRDaGFubmVsLCByb2NrZXRVc2VyLCBzbGFja01lc3NhZ2UsIGlzSW1wb3J0aW5nKSB7XG5cdFx0aWYgKGlzSW1wb3J0aW5nKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVVc2VySm9pbldpdGhSb29tSWRBbmRVc2VyKHJvY2tldENoYW5uZWwuX2lkLCByb2NrZXRVc2VyLCB7IHRzOiBuZXcgRGF0ZShwYXJzZUludChzbGFja01lc3NhZ2UudHMuc3BsaXQoJy4nKVswXSkgKiAxMDAwKSwgaW1wb3J0ZWQ6ICdzbGFja2JyaWRnZScgfSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFJvY2tldENoYXQuYWRkVXNlclRvUm9vbShyb2NrZXRDaGFubmVsLl9pZCwgcm9ja2V0VXNlcik7XG5cdFx0fVxuXHR9XG5cblx0cHJvY2Vzc0dyb3VwSm9pbk1lc3NhZ2Uocm9ja2V0Q2hhbm5lbCwgcm9ja2V0VXNlciwgc2xhY2tNZXNzYWdlLCBpc0ltcG9ydGluZykge1xuXHRcdGlmIChzbGFja01lc3NhZ2UuaW52aXRlcikge1xuXHRcdFx0Y29uc3QgaW52aXRlciA9IHNsYWNrTWVzc2FnZS5pbnZpdGVyID8gdGhpcy5yb2NrZXQuZmluZFVzZXIoc2xhY2tNZXNzYWdlLmludml0ZXIpIHx8IHRoaXMucm9ja2V0LmFkZFVzZXIoc2xhY2tNZXNzYWdlLmludml0ZXIpIDogbnVsbDtcblx0XHRcdGlmIChpc0ltcG9ydGluZykge1xuXHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVVc2VyQWRkZWRXaXRoUm9vbUlkQW5kVXNlcihyb2NrZXRDaGFubmVsLl9pZCwgcm9ja2V0VXNlciwge1xuXHRcdFx0XHRcdHRzOiBuZXcgRGF0ZShwYXJzZUludChzbGFja01lc3NhZ2UudHMuc3BsaXQoJy4nKVswXSkgKiAxMDAwKSxcblx0XHRcdFx0XHR1OiB7XG5cdFx0XHRcdFx0XHRfaWQ6IGludml0ZXIuX2lkLFxuXHRcdFx0XHRcdFx0dXNlcm5hbWU6IGludml0ZXIudXNlcm5hbWUsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpbXBvcnRlZDogJ3NsYWNrYnJpZGdlJyxcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRSb2NrZXRDaGF0LmFkZFVzZXJUb1Jvb20ocm9ja2V0Q2hhbm5lbC5faWQsIHJvY2tldFVzZXIsIGludml0ZXIpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHByb2Nlc3NMZWF2ZU1lc3NhZ2Uocm9ja2V0Q2hhbm5lbCwgcm9ja2V0VXNlciwgc2xhY2tNZXNzYWdlLCBpc0ltcG9ydGluZykge1xuXHRcdGlmIChpc0ltcG9ydGluZykge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlVXNlckxlYXZlV2l0aFJvb21JZEFuZFVzZXIocm9ja2V0Q2hhbm5lbC5faWQsIHJvY2tldFVzZXIsIHtcblx0XHRcdFx0dHM6IG5ldyBEYXRlKHBhcnNlSW50KHNsYWNrTWVzc2FnZS50cy5zcGxpdCgnLicpWzBdKSAqIDEwMDApLFxuXHRcdFx0XHRpbXBvcnRlZDogJ3NsYWNrYnJpZGdlJyxcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRSb2NrZXRDaGF0LnJlbW92ZVVzZXJGcm9tUm9vbShyb2NrZXRDaGFubmVsLl9pZCwgcm9ja2V0VXNlcik7XG5cdFx0fVxuXHR9XG5cblx0cHJvY2Vzc1RvcGljTWVzc2FnZShyb2NrZXRDaGFubmVsLCByb2NrZXRVc2VyLCBzbGFja01lc3NhZ2UsIGlzSW1wb3J0aW5nKSB7XG5cdFx0aWYgKGlzSW1wb3J0aW5nKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVSb29tU2V0dGluZ3NDaGFuZ2VkV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlcigncm9vbV9jaGFuZ2VkX3RvcGljJywgcm9ja2V0Q2hhbm5lbC5faWQsIHNsYWNrTWVzc2FnZS50b3BpYywgcm9ja2V0VXNlciwgeyB0czogbmV3IERhdGUocGFyc2VJbnQoc2xhY2tNZXNzYWdlLnRzLnNwbGl0KCcuJylbMF0pICogMTAwMCksIGltcG9ydGVkOiAnc2xhY2ticmlkZ2UnIH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRSb2NrZXRDaGF0LnNhdmVSb29tVG9waWMocm9ja2V0Q2hhbm5lbC5faWQsIHNsYWNrTWVzc2FnZS50b3BpYywgcm9ja2V0VXNlciwgZmFsc2UpO1xuXHRcdH1cblx0fVxuXG5cdHByb2Nlc3NQdXJwb3NlTWVzc2FnZShyb2NrZXRDaGFubmVsLCByb2NrZXRVc2VyLCBzbGFja01lc3NhZ2UsIGlzSW1wb3J0aW5nKSB7XG5cdFx0aWYgKGlzSW1wb3J0aW5nKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVSb29tU2V0dGluZ3NDaGFuZ2VkV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlcigncm9vbV9jaGFuZ2VkX3RvcGljJywgcm9ja2V0Q2hhbm5lbC5faWQsIHNsYWNrTWVzc2FnZS5wdXJwb3NlLCByb2NrZXRVc2VyLCB7IHRzOiBuZXcgRGF0ZShwYXJzZUludChzbGFja01lc3NhZ2UudHMuc3BsaXQoJy4nKVswXSkgKiAxMDAwKSwgaW1wb3J0ZWQ6ICdzbGFja2JyaWRnZScgfSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFJvY2tldENoYXQuc2F2ZVJvb21Ub3BpYyhyb2NrZXRDaGFubmVsLl9pZCwgc2xhY2tNZXNzYWdlLnB1cnBvc2UsIHJvY2tldFVzZXIsIGZhbHNlKTtcblx0XHR9XG5cdH1cblxuXHRwcm9jZXNzTmFtZU1lc3NhZ2Uocm9ja2V0Q2hhbm5lbCwgcm9ja2V0VXNlciwgc2xhY2tNZXNzYWdlLCBpc0ltcG9ydGluZykge1xuXHRcdGlmIChpc0ltcG9ydGluZykge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlUm9vbVJlbmFtZWRXaXRoUm9vbUlkUm9vbU5hbWVBbmRVc2VyKHJvY2tldENoYW5uZWwuX2lkLCBzbGFja01lc3NhZ2UubmFtZSwgcm9ja2V0VXNlciwgeyB0czogbmV3IERhdGUocGFyc2VJbnQoc2xhY2tNZXNzYWdlLnRzLnNwbGl0KCcuJylbMF0pICogMTAwMCksIGltcG9ydGVkOiAnc2xhY2ticmlkZ2UnIH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRSb2NrZXRDaGF0LnNhdmVSb29tTmFtZShyb2NrZXRDaGFubmVsLl9pZCwgc2xhY2tNZXNzYWdlLm5hbWUsIHJvY2tldFVzZXIsIGZhbHNlKTtcblx0XHR9XG5cdH1cblxuXHRwcm9jZXNzU2hhcmVNZXNzYWdlKHJvY2tldENoYW5uZWwsIHJvY2tldFVzZXIsIHNsYWNrTWVzc2FnZSwgaXNJbXBvcnRpbmcpIHtcblx0XHRpZiAoc2xhY2tNZXNzYWdlLmZpbGUgJiYgc2xhY2tNZXNzYWdlLmZpbGUudXJsX3ByaXZhdGVfZG93bmxvYWQgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0Y29uc3QgZGV0YWlscyA9IHtcblx0XHRcdFx0bWVzc2FnZV9pZDogYHNsYWNrLSR7IHNsYWNrTWVzc2FnZS50cy5yZXBsYWNlKC9cXC4vZywgJy0nKSB9YCxcblx0XHRcdFx0bmFtZTogc2xhY2tNZXNzYWdlLmZpbGUubmFtZSxcblx0XHRcdFx0c2l6ZTogc2xhY2tNZXNzYWdlLmZpbGUuc2l6ZSxcblx0XHRcdFx0dHlwZTogc2xhY2tNZXNzYWdlLmZpbGUubWltZXR5cGUsXG5cdFx0XHRcdHJpZDogcm9ja2V0Q2hhbm5lbC5faWQsXG5cdFx0XHR9O1xuXHRcdFx0cmV0dXJuIHRoaXMudXBsb2FkRmlsZUZyb21TbGFjayhkZXRhaWxzLCBzbGFja01lc3NhZ2UuZmlsZS51cmxfcHJpdmF0ZV9kb3dubG9hZCwgcm9ja2V0VXNlciwgcm9ja2V0Q2hhbm5lbCwgbmV3IERhdGUocGFyc2VJbnQoc2xhY2tNZXNzYWdlLnRzLnNwbGl0KCcuJylbMF0pICogMTAwMCksIGlzSW1wb3J0aW5nKTtcblx0XHR9XG5cdH1cblxuXHRwcm9jZXNzUGlubmVkSXRlbU1lc3NhZ2Uocm9ja2V0Q2hhbm5lbCwgcm9ja2V0VXNlciwgc2xhY2tNZXNzYWdlLCBpc0ltcG9ydGluZykge1xuXHRcdGlmIChzbGFja01lc3NhZ2UuYXR0YWNobWVudHMgJiYgc2xhY2tNZXNzYWdlLmF0dGFjaG1lbnRzWzBdICYmIHNsYWNrTWVzc2FnZS5hdHRhY2htZW50c1swXS50ZXh0KSB7XG5cdFx0XHRjb25zdCByb2NrZXRNc2dPYmogPSB7XG5cdFx0XHRcdHJpZDogcm9ja2V0Q2hhbm5lbC5faWQsXG5cdFx0XHRcdHQ6ICdtZXNzYWdlX3Bpbm5lZCcsXG5cdFx0XHRcdG1zZzogJycsXG5cdFx0XHRcdHU6IHtcblx0XHRcdFx0XHRfaWQ6IHJvY2tldFVzZXIuX2lkLFxuXHRcdFx0XHRcdHVzZXJuYW1lOiByb2NrZXRVc2VyLnVzZXJuYW1lLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRhdHRhY2htZW50czogW3tcblx0XHRcdFx0XHR0ZXh0IDogdGhpcy5yb2NrZXQuY29udmVydFNsYWNrTXNnVHh0VG9Sb2NrZXRUeHRGb3JtYXQoc2xhY2tNZXNzYWdlLmF0dGFjaG1lbnRzWzBdLnRleHQpLFxuXHRcdFx0XHRcdGF1dGhvcl9uYW1lIDogc2xhY2tNZXNzYWdlLmF0dGFjaG1lbnRzWzBdLmF1dGhvcl9zdWJuYW1lLFxuXHRcdFx0XHRcdGF1dGhvcl9pY29uIDogZ2V0QXZhdGFyVXJsRnJvbVVzZXJuYW1lKHNsYWNrTWVzc2FnZS5hdHRhY2htZW50c1swXS5hdXRob3Jfc3VibmFtZSksXG5cdFx0XHRcdFx0dHMgOiBuZXcgRGF0ZShwYXJzZUludChzbGFja01lc3NhZ2UuYXR0YWNobWVudHNbMF0udHMuc3BsaXQoJy4nKVswXSkgKiAxMDAwKSxcblx0XHRcdFx0fV0sXG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAoIWlzSW1wb3J0aW5nKSB7XG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLnNldFBpbm5lZEJ5SWRBbmRVc2VySWQoYHNsYWNrLSR7IHNsYWNrTWVzc2FnZS5hdHRhY2htZW50c1swXS5jaGFubmVsX2lkIH0tJHsgc2xhY2tNZXNzYWdlLmF0dGFjaG1lbnRzWzBdLnRzLnJlcGxhY2UoL1xcLi9nLCAnLScpIH1gLCByb2NrZXRNc2dPYmoudSwgdHJ1ZSwgbmV3IERhdGUocGFyc2VJbnQoc2xhY2tNZXNzYWdlLnRzLnNwbGl0KCcuJylbMF0pICogMTAwMCkpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gcm9ja2V0TXNnT2JqO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsb2dnZXIuc2xhY2suZXJyb3IoJ1Bpbm5lZCBpdGVtIHdpdGggbm8gYXR0YWNobWVudCcpO1xuXHRcdH1cblx0fVxuXG5cdHByb2Nlc3NTdWJ0eXBlZE1lc3NhZ2Uocm9ja2V0Q2hhbm5lbCwgcm9ja2V0VXNlciwgc2xhY2tNZXNzYWdlLCBpc0ltcG9ydGluZykge1xuXHRcdHN3aXRjaCAoc2xhY2tNZXNzYWdlLnN1YnR5cGUpIHtcblx0XHRcdGNhc2UgJ2JvdF9tZXNzYWdlJzpcblx0XHRcdFx0cmV0dXJuIHRoaXMucHJvY2Vzc0JvdE1lc3NhZ2Uocm9ja2V0Q2hhbm5lbCwgc2xhY2tNZXNzYWdlKTtcblx0XHRcdGNhc2UgJ21lX21lc3NhZ2UnOlxuXHRcdFx0XHRyZXR1cm4gdGhpcy5wcm9jZXNzTWVNZXNzYWdlKHJvY2tldFVzZXIsIHNsYWNrTWVzc2FnZSk7XG5cdFx0XHRjYXNlICdjaGFubmVsX2pvaW4nOlxuXHRcdFx0XHRyZXR1cm4gdGhpcy5wcm9jZXNzQ2hhbm5lbEpvaW5NZXNzYWdlKHJvY2tldENoYW5uZWwsIHJvY2tldFVzZXIsIHNsYWNrTWVzc2FnZSwgaXNJbXBvcnRpbmcpO1xuXHRcdFx0Y2FzZSAnZ3JvdXBfam9pbic6XG5cdFx0XHRcdHJldHVybiB0aGlzLnByb2Nlc3NHcm91cEpvaW5NZXNzYWdlKHJvY2tldENoYW5uZWwsIHJvY2tldFVzZXIsIHNsYWNrTWVzc2FnZSwgaXNJbXBvcnRpbmcpO1xuXHRcdFx0Y2FzZSAnY2hhbm5lbF9sZWF2ZSc6XG5cdFx0XHRjYXNlICdncm91cF9sZWF2ZSc6XG5cdFx0XHRcdHJldHVybiB0aGlzLnByb2Nlc3NMZWF2ZU1lc3NhZ2Uocm9ja2V0Q2hhbm5lbCwgcm9ja2V0VXNlciwgc2xhY2tNZXNzYWdlLCBpc0ltcG9ydGluZyk7XG5cdFx0XHRjYXNlICdjaGFubmVsX3RvcGljJzpcblx0XHRcdGNhc2UgJ2dyb3VwX3RvcGljJzpcblx0XHRcdFx0cmV0dXJuIHRoaXMucHJvY2Vzc1RvcGljTWVzc2FnZShyb2NrZXRDaGFubmVsLCByb2NrZXRVc2VyLCBzbGFja01lc3NhZ2UsIGlzSW1wb3J0aW5nKTtcblx0XHRcdGNhc2UgJ2NoYW5uZWxfcHVycG9zZSc6XG5cdFx0XHRjYXNlICdncm91cF9wdXJwb3NlJzpcblx0XHRcdFx0cmV0dXJuIHRoaXMucHJvY2Vzc1B1cnBvc2VNZXNzYWdlKHJvY2tldENoYW5uZWwsIHJvY2tldFVzZXIsIHNsYWNrTWVzc2FnZSwgaXNJbXBvcnRpbmcpO1xuXHRcdFx0Y2FzZSAnY2hhbm5lbF9uYW1lJzpcblx0XHRcdGNhc2UgJ2dyb3VwX25hbWUnOlxuXHRcdFx0XHRyZXR1cm4gdGhpcy5wcm9jZXNzTmFtZU1lc3NhZ2Uocm9ja2V0Q2hhbm5lbCwgcm9ja2V0VXNlciwgc2xhY2tNZXNzYWdlLCBpc0ltcG9ydGluZyk7XG5cdFx0XHRjYXNlICdjaGFubmVsX2FyY2hpdmUnOlxuXHRcdFx0Y2FzZSAnZ3JvdXBfYXJjaGl2ZSc6XG5cdFx0XHRcdGlmICghaXNJbXBvcnRpbmcpIHtcblx0XHRcdFx0XHRSb2NrZXRDaGF0LmFyY2hpdmVSb29tKHJvY2tldENoYW5uZWwpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdGNhc2UgJ2NoYW5uZWxfdW5hcmNoaXZlJzpcblx0XHRcdGNhc2UgJ2dyb3VwX3VuYXJjaGl2ZSc6XG5cdFx0XHRcdGlmICghaXNJbXBvcnRpbmcpIHtcblx0XHRcdFx0XHRSb2NrZXRDaGF0LnVuYXJjaGl2ZVJvb20ocm9ja2V0Q2hhbm5lbCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0Y2FzZSAnZmlsZV9zaGFyZSc6XG5cdFx0XHRcdHJldHVybiB0aGlzLnByb2Nlc3NTaGFyZU1lc3NhZ2Uocm9ja2V0Q2hhbm5lbCwgcm9ja2V0VXNlciwgc2xhY2tNZXNzYWdlLCBpc0ltcG9ydGluZyk7XG5cdFx0XHRjYXNlICdmaWxlX2NvbW1lbnQnOlxuXHRcdFx0XHRsb2dnZXIuc2xhY2suZXJyb3IoJ0ZpbGUgY29tbWVudCBub3QgaW1wbGVtZW50ZWQnKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0Y2FzZSAnZmlsZV9tZW50aW9uJzpcblx0XHRcdFx0bG9nZ2VyLnNsYWNrLmVycm9yKCdGaWxlIG1lbnRpb25lZCBub3QgaW1wbGVtZW50ZWQnKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0Y2FzZSAncGlubmVkX2l0ZW0nOlxuXHRcdFx0XHRyZXR1cm4gdGhpcy5wcm9jZXNzUGlubmVkSXRlbU1lc3NhZ2Uocm9ja2V0Q2hhbm5lbCwgcm9ja2V0VXNlciwgc2xhY2tNZXNzYWdlLCBpc0ltcG9ydGluZyk7XG5cdFx0XHRjYXNlICd1bnBpbm5lZF9pdGVtJzpcblx0XHRcdFx0bG9nZ2VyLnNsYWNrLmVycm9yKCdVbnBpbm5lZCBpdGVtIG5vdCBpbXBsZW1lbnRlZCcpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdFVwbG9hZHMgdGhlIGZpbGUgdG8gdGhlIHN0b3JhZ2UuXG5cdEBwYXJhbSBbT2JqZWN0XSBkZXRhaWxzIGFuIG9iamVjdCB3aXRoIGRldGFpbHMgYWJvdXQgdGhlIHVwbG9hZC4gbmFtZSwgc2l6ZSwgdHlwZSwgYW5kIHJpZFxuXHRAcGFyYW0gW1N0cmluZ10gZmlsZVVybCB1cmwgb2YgdGhlIGZpbGUgdG8gZG93bmxvYWQvaW1wb3J0XG5cdEBwYXJhbSBbT2JqZWN0XSB1c2VyIHRoZSBSb2NrZXQuQ2hhdCB1c2VyXG5cdEBwYXJhbSBbT2JqZWN0XSByb29tIHRoZSBSb2NrZXQuQ2hhdCByb29tXG5cdEBwYXJhbSBbRGF0ZV0gdGltZVN0YW1wIHRoZSB0aW1lc3RhbXAgdGhlIGZpbGUgd2FzIHVwbG9hZGVkXG5cdCoqL1xuXHQvLyBkZXRhaWxzLCBzbGFja01lc3NhZ2UuZmlsZS51cmxfcHJpdmF0ZV9kb3dubG9hZCwgcm9ja2V0VXNlciwgcm9ja2V0Q2hhbm5lbCwgbmV3IERhdGUocGFyc2VJbnQoc2xhY2tNZXNzYWdlLnRzLnNwbGl0KCcuJylbMF0pICogMTAwMCksIGlzSW1wb3J0aW5nKTtcblx0dXBsb2FkRmlsZUZyb21TbGFjayhkZXRhaWxzLCBzbGFja0ZpbGVVUkwsIHJvY2tldFVzZXIsIHJvY2tldENoYW5uZWwsIHRpbWVTdGFtcCwgaXNJbXBvcnRpbmcpIHtcblx0XHRjb25zdCByZXF1ZXN0TW9kdWxlID0gL2h0dHBzL2kudGVzdChzbGFja0ZpbGVVUkwpID8gaHR0cHMgOiBodHRwO1xuXHRcdGNvbnN0IHBhcnNlZFVybCA9IHVybC5wYXJzZShzbGFja0ZpbGVVUkwsIHRydWUpO1xuXHRcdHBhcnNlZFVybC5oZWFkZXJzID0geyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7IHRoaXMuYXBpVG9rZW4gfWAgfTtcblx0XHRyZXF1ZXN0TW9kdWxlLmdldChwYXJzZWRVcmwsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKHN0cmVhbSkgPT4ge1xuXHRcdFx0Y29uc3QgZmlsZVN0b3JlID0gRmlsZVVwbG9hZC5nZXRTdG9yZSgnVXBsb2FkcycpO1xuXG5cdFx0XHRmaWxlU3RvcmUuaW5zZXJ0KGRldGFpbHMsIHN0cmVhbSwgKGVyciwgZmlsZSkgPT4ge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGVycik7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y29uc3QgdXJsID0gZmlsZS51cmwucmVwbGFjZShNZXRlb3IuYWJzb2x1dGVVcmwoKSwgJy8nKTtcblx0XHRcdFx0XHRjb25zdCBhdHRhY2htZW50ID0ge1xuXHRcdFx0XHRcdFx0dGl0bGU6IGZpbGUubmFtZSxcblx0XHRcdFx0XHRcdHRpdGxlX2xpbms6IHVybCxcblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0aWYgKC9eaW1hZ2VcXC8uKy8udGVzdChmaWxlLnR5cGUpKSB7XG5cdFx0XHRcdFx0XHRhdHRhY2htZW50LmltYWdlX3VybCA9IHVybDtcblx0XHRcdFx0XHRcdGF0dGFjaG1lbnQuaW1hZ2VfdHlwZSA9IGZpbGUudHlwZTtcblx0XHRcdFx0XHRcdGF0dGFjaG1lbnQuaW1hZ2Vfc2l6ZSA9IGZpbGUuc2l6ZTtcblx0XHRcdFx0XHRcdGF0dGFjaG1lbnQuaW1hZ2VfZGltZW5zaW9ucyA9IGZpbGUuaWRlbnRpZnkgJiYgZmlsZS5pZGVudGlmeS5zaXplO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoL15hdWRpb1xcLy4rLy50ZXN0KGZpbGUudHlwZSkpIHtcblx0XHRcdFx0XHRcdGF0dGFjaG1lbnQuYXVkaW9fdXJsID0gdXJsO1xuXHRcdFx0XHRcdFx0YXR0YWNobWVudC5hdWRpb190eXBlID0gZmlsZS50eXBlO1xuXHRcdFx0XHRcdFx0YXR0YWNobWVudC5hdWRpb19zaXplID0gZmlsZS5zaXplO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoL152aWRlb1xcLy4rLy50ZXN0KGZpbGUudHlwZSkpIHtcblx0XHRcdFx0XHRcdGF0dGFjaG1lbnQudmlkZW9fdXJsID0gdXJsO1xuXHRcdFx0XHRcdFx0YXR0YWNobWVudC52aWRlb190eXBlID0gZmlsZS50eXBlO1xuXHRcdFx0XHRcdFx0YXR0YWNobWVudC52aWRlb19zaXplID0gZmlsZS5zaXplO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGNvbnN0IG1zZyA9IHtcblx0XHRcdFx0XHRcdHJpZDogZGV0YWlscy5yaWQsXG5cdFx0XHRcdFx0XHR0czogdGltZVN0YW1wLFxuXHRcdFx0XHRcdFx0bXNnOiAnJyxcblx0XHRcdFx0XHRcdGZpbGU6IHtcblx0XHRcdFx0XHRcdFx0X2lkOiBmaWxlLl9pZCxcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRncm91cGFibGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0YXR0YWNobWVudHM6IFthdHRhY2htZW50XSxcblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0aWYgKGlzSW1wb3J0aW5nKSB7XG5cdFx0XHRcdFx0XHRtc2cuaW1wb3J0ZWQgPSAnc2xhY2ticmlkZ2UnO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChkZXRhaWxzLm1lc3NhZ2VfaWQgJiYgKHR5cGVvZiBkZXRhaWxzLm1lc3NhZ2VfaWQgPT09ICdzdHJpbmcnKSkge1xuXHRcdFx0XHRcdFx0bXNnLl9pZCA9IGRldGFpbHMubWVzc2FnZV9pZDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5zZW5kTWVzc2FnZShyb2NrZXRVc2VyLCBtc2csIHJvY2tldENoYW5uZWwsIHRydWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KSk7XG5cdH1cblxuXHRpbXBvcnRGcm9tSGlzdG9yeShmYW1pbHksIG9wdGlvbnMpIHtcblx0XHRsb2dnZXIuc2xhY2suZGVidWcoJ0ltcG9ydGluZyBtZXNzYWdlcyBoaXN0b3J5Jyk7XG5cdFx0Y29uc3QgcmVzcG9uc2UgPSBIVFRQLmdldChgaHR0cHM6Ly9zbGFjay5jb20vYXBpLyR7IGZhbWlseSB9Lmhpc3RvcnlgLCB7IHBhcmFtczogXy5leHRlbmQoeyB0b2tlbjogdGhpcy5hcGlUb2tlbiB9LCBvcHRpb25zKSB9KTtcblx0XHRpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuZGF0YSAmJiBfLmlzQXJyYXkocmVzcG9uc2UuZGF0YS5tZXNzYWdlcykgJiYgcmVzcG9uc2UuZGF0YS5tZXNzYWdlcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRsZXQgbGF0ZXN0ID0gMDtcblx0XHRcdGZvciAoY29uc3QgbWVzc2FnZSBvZiByZXNwb25zZS5kYXRhLm1lc3NhZ2VzLnJldmVyc2UoKSkge1xuXHRcdFx0XHRsb2dnZXIuc2xhY2suZGVidWcoJ01FU1NBR0U6ICcsIG1lc3NhZ2UpO1xuXHRcdFx0XHRpZiAoIWxhdGVzdCB8fCBtZXNzYWdlLnRzID4gbGF0ZXN0KSB7XG5cdFx0XHRcdFx0bGF0ZXN0ID0gbWVzc2FnZS50cztcblx0XHRcdFx0fVxuXHRcdFx0XHRtZXNzYWdlLmNoYW5uZWwgPSBvcHRpb25zLmNoYW5uZWw7XG5cdFx0XHRcdHRoaXMub25NZXNzYWdlKG1lc3NhZ2UsIHRydWUpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHsgaGFzX21vcmU6IHJlc3BvbnNlLmRhdGEuaGFzX21vcmUsIHRzOiBsYXRlc3QgfTtcblx0XHR9XG5cdH1cblxuXHRjb3B5Q2hhbm5lbEluZm8ocmlkLCBjaGFubmVsTWFwKSB7XG5cdFx0bG9nZ2VyLnNsYWNrLmRlYnVnKCdDb3B5aW5nIHVzZXJzIGZyb20gU2xhY2sgY2hhbm5lbCB0byBSb2NrZXQuQ2hhdCcsIGNoYW5uZWxNYXAuaWQsIHJpZCk7XG5cdFx0Y29uc3QgcmVzcG9uc2UgPSBIVFRQLmdldChgaHR0cHM6Ly9zbGFjay5jb20vYXBpLyR7IGNoYW5uZWxNYXAuZmFtaWx5IH0uaW5mb2AsIHsgcGFyYW1zOiB7IHRva2VuOiB0aGlzLmFwaVRva2VuLCBjaGFubmVsOiBjaGFubmVsTWFwLmlkIH0gfSk7XG5cdFx0aWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmRhdGEpIHtcblx0XHRcdGNvbnN0IGRhdGEgPSBjaGFubmVsTWFwLmZhbWlseSA9PT0gJ2NoYW5uZWxzJyA/IHJlc3BvbnNlLmRhdGEuY2hhbm5lbCA6IHJlc3BvbnNlLmRhdGEuZ3JvdXA7XG5cdFx0XHRpZiAoZGF0YSAmJiBfLmlzQXJyYXkoZGF0YS5tZW1iZXJzKSAmJiBkYXRhLm1lbWJlcnMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRmb3IgKGNvbnN0IG1lbWJlciBvZiBkYXRhLm1lbWJlcnMpIHtcblx0XHRcdFx0XHRjb25zdCB1c2VyID0gdGhpcy5yb2NrZXQuZmluZFVzZXIobWVtYmVyKSB8fCB0aGlzLnJvY2tldC5hZGRVc2VyKG1lbWJlcik7XG5cdFx0XHRcdFx0aWYgKHVzZXIpIHtcblx0XHRcdFx0XHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnQWRkaW5nIHVzZXIgdG8gcm9vbScsIHVzZXIudXNlcm5hbWUsIHJpZCk7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0LmFkZFVzZXJUb1Jvb20ocmlkLCB1c2VyLCBudWxsLCB0cnVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0bGV0IHRvcGljID0gJyc7XG5cdFx0XHRsZXQgdG9waWNfbGFzdF9zZXQgPSAwO1xuXHRcdFx0bGV0IHRvcGljX2NyZWF0b3IgPSBudWxsO1xuXHRcdFx0aWYgKGRhdGEgJiYgZGF0YS50b3BpYyAmJiBkYXRhLnRvcGljLnZhbHVlKSB7XG5cdFx0XHRcdHRvcGljID0gZGF0YS50b3BpYy52YWx1ZTtcblx0XHRcdFx0dG9waWNfbGFzdF9zZXQgPSBkYXRhLnRvcGljLmxhc3Rfc2V0O1xuXHRcdFx0XHR0b3BpY19jcmVhdG9yID0gZGF0YS50b3BpYy5jcmVhdG9yO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZGF0YSAmJiBkYXRhLnB1cnBvc2UgJiYgZGF0YS5wdXJwb3NlLnZhbHVlKSB7XG5cdFx0XHRcdGlmICh0b3BpY19sYXN0X3NldCkge1xuXHRcdFx0XHRcdGlmICh0b3BpY19sYXN0X3NldCA8IGRhdGEucHVycG9zZS5sYXN0X3NldCkge1xuXHRcdFx0XHRcdFx0dG9waWMgPSBkYXRhLnB1cnBvc2UudG9waWM7XG5cdFx0XHRcdFx0XHR0b3BpY19jcmVhdG9yID0gZGF0YS5wdXJwb3NlLmNyZWF0b3I7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRvcGljID0gZGF0YS5wdXJwb3NlLnRvcGljO1xuXHRcdFx0XHRcdHRvcGljX2NyZWF0b3IgPSBkYXRhLnB1cnBvc2UuY3JlYXRvcjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAodG9waWMpIHtcblx0XHRcdFx0Y29uc3QgY3JlYXRvciA9IHRoaXMucm9ja2V0LmZpbmRVc2VyKHRvcGljX2NyZWF0b3IpIHx8IHRoaXMucm9ja2V0LmFkZFVzZXIodG9waWNfY3JlYXRvcik7XG5cdFx0XHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnU2V0dGluZyByb29tIHRvcGljJywgcmlkLCB0b3BpYywgY3JlYXRvci51c2VybmFtZSk7XG5cdFx0XHRcdFJvY2tldENoYXQuc2F2ZVJvb21Ub3BpYyhyaWQsIHRvcGljLCBjcmVhdG9yLCBmYWxzZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Y29weVBpbnMocmlkLCBjaGFubmVsTWFwKSB7XG5cdFx0Y29uc3QgcmVzcG9uc2UgPSBIVFRQLmdldCgnaHR0cHM6Ly9zbGFjay5jb20vYXBpL3BpbnMubGlzdCcsIHsgcGFyYW1zOiB7IHRva2VuOiB0aGlzLmFwaVRva2VuLCBjaGFubmVsOiBjaGFubmVsTWFwLmlkIH0gfSk7XG5cdFx0aWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmRhdGEgJiYgXy5pc0FycmF5KHJlc3BvbnNlLmRhdGEuaXRlbXMpICYmIHJlc3BvbnNlLmRhdGEuaXRlbXMubGVuZ3RoID4gMCkge1xuXHRcdFx0Zm9yIChjb25zdCBwaW4gb2YgcmVzcG9uc2UuZGF0YS5pdGVtcykge1xuXHRcdFx0XHRpZiAocGluLm1lc3NhZ2UpIHtcblx0XHRcdFx0XHRjb25zdCB1c2VyID0gdGhpcy5yb2NrZXQuZmluZFVzZXIocGluLm1lc3NhZ2UudXNlcik7XG5cdFx0XHRcdFx0Y29uc3QgbXNnT2JqID0ge1xuXHRcdFx0XHRcdFx0cmlkLFxuXHRcdFx0XHRcdFx0dDogJ21lc3NhZ2VfcGlubmVkJyxcblx0XHRcdFx0XHRcdG1zZzogJycsXG5cdFx0XHRcdFx0XHR1OiB7XG5cdFx0XHRcdFx0XHRcdF9pZDogdXNlci5faWQsXG5cdFx0XHRcdFx0XHRcdHVzZXJuYW1lOiB1c2VyLnVzZXJuYW1lLFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGF0dGFjaG1lbnRzOiBbe1xuXHRcdFx0XHRcdFx0XHR0ZXh0IDogdGhpcy5yb2NrZXQuY29udmVydFNsYWNrTXNnVHh0VG9Sb2NrZXRUeHRGb3JtYXQocGluLm1lc3NhZ2UudGV4dCksXG5cdFx0XHRcdFx0XHRcdGF1dGhvcl9uYW1lIDogdXNlci51c2VybmFtZSxcblx0XHRcdFx0XHRcdFx0YXV0aG9yX2ljb24gOiBnZXRBdmF0YXJVcmxGcm9tVXNlcm5hbWUodXNlci51c2VybmFtZSksXG5cdFx0XHRcdFx0XHRcdHRzIDogbmV3IERhdGUocGFyc2VJbnQocGluLm1lc3NhZ2UudHMuc3BsaXQoJy4nKVswXSkgKiAxMDAwKSxcblx0XHRcdFx0XHRcdH1dLFxuXHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5zZXRQaW5uZWRCeUlkQW5kVXNlcklkKGBzbGFjay0keyBwaW4uY2hhbm5lbCB9LSR7IHBpbi5tZXNzYWdlLnRzLnJlcGxhY2UoL1xcLi9nLCAnLScpIH1gLCBtc2dPYmoudSwgdHJ1ZSwgbmV3IERhdGUocGFyc2VJbnQocGluLm1lc3NhZ2UudHMuc3BsaXQoJy4nKVswXSkgKiAxMDAwKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpbXBvcnRNZXNzYWdlcyhyaWQsIGNhbGxiYWNrKSB7XG5cdFx0bG9nZ2VyLnNsYWNrLmluZm8oJ2ltcG9ydE1lc3NhZ2VzOiAnLCByaWQpO1xuXHRcdGNvbnN0IHJvY2tldGNoYXRfcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJpZCk7XG5cdFx0aWYgKHJvY2tldGNoYXRfcm9vbSkge1xuXHRcdFx0aWYgKHRoaXMuZ2V0U2xhY2tDaGFubmVsKHJpZCkpIHtcblx0XHRcdFx0dGhpcy5jb3B5Q2hhbm5lbEluZm8ocmlkLCB0aGlzLmdldFNsYWNrQ2hhbm5lbChyaWQpKTtcblxuXHRcdFx0XHRsb2dnZXIuc2xhY2suZGVidWcoJ0ltcG9ydGluZyBtZXNzYWdlcyBmcm9tIFNsYWNrIHRvIFJvY2tldC5DaGF0JywgdGhpcy5nZXRTbGFja0NoYW5uZWwocmlkKSwgcmlkKTtcblx0XHRcdFx0bGV0IHJlc3VsdHMgPSB0aGlzLmltcG9ydEZyb21IaXN0b3J5KHRoaXMuZ2V0U2xhY2tDaGFubmVsKHJpZCkuZmFtaWx5LCB7IGNoYW5uZWw6IHRoaXMuZ2V0U2xhY2tDaGFubmVsKHJpZCkuaWQsIG9sZGVzdDogMSB9KTtcblx0XHRcdFx0d2hpbGUgKHJlc3VsdHMgJiYgcmVzdWx0cy5oYXNfbW9yZSkge1xuXHRcdFx0XHRcdHJlc3VsdHMgPSB0aGlzLmltcG9ydEZyb21IaXN0b3J5KHRoaXMuZ2V0U2xhY2tDaGFubmVsKHJpZCkuZmFtaWx5LCB7IGNoYW5uZWw6IHRoaXMuZ2V0U2xhY2tDaGFubmVsKHJpZCkuaWQsIG9sZGVzdDogcmVzdWx0cy50cyB9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGxvZ2dlci5zbGFjay5kZWJ1ZygnUGlubmluZyBTbGFjayBjaGFubmVsIG1lc3NhZ2VzIHRvIFJvY2tldC5DaGF0JywgdGhpcy5nZXRTbGFja0NoYW5uZWwocmlkKSwgcmlkKTtcblx0XHRcdFx0dGhpcy5jb3B5UGlucyhyaWQsIHRoaXMuZ2V0U2xhY2tDaGFubmVsKHJpZCkpO1xuXG5cdFx0XHRcdHJldHVybiBjYWxsYmFjaygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc3Qgc2xhY2tfcm9vbSA9IHRoaXMucG9zdEZpbmRDaGFubmVsKHJvY2tldGNoYXRfcm9vbS5uYW1lKTtcblx0XHRcdFx0aWYgKHNsYWNrX3Jvb20pIHtcblx0XHRcdFx0XHR0aGlzLmFkZFNsYWNrQ2hhbm5lbChyaWQsIHNsYWNrX3Jvb20uaWQpO1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmltcG9ydE1lc3NhZ2VzKHJpZCwgY2FsbGJhY2spO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGxvZ2dlci5zbGFjay5lcnJvcignQ291bGQgbm90IGZpbmQgU2xhY2sgcm9vbSB3aXRoIHNwZWNpZmllZCBuYW1lJywgcm9ja2V0Y2hhdF9yb29tLm5hbWUpO1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1zbGFjay1yb29tLW5vdC1mb3VuZCcsICdDb3VsZCBub3QgZmluZCBTbGFjayByb29tIHdpdGggc3BlY2lmaWVkIG5hbWUnKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0bG9nZ2VyLnNsYWNrLmVycm9yKCdDb3VsZCBub3QgZmluZCBSb2NrZXQuQ2hhdCByb29tIHdpdGggc3BlY2lmaWVkIGlkJywgcmlkKTtcblx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJykpO1xuXHRcdH1cblx0fVxuXG59XG5cbiJdfQ==
