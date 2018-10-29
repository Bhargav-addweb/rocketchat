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
var message;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:importer-slack":{"info.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/rocketchat_importer-slack/info.js                                                                  //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
module.export({
  SlackImporterInfo: () => SlackImporterInfo
});
let ImporterInfo;
module.watch(require("meteor/rocketchat:importer"), {
  ImporterInfo(v) {
    ImporterInfo = v;
  }

}, 0);

class SlackImporterInfo extends ImporterInfo {
  constructor() {
    super('slack', 'Slack', 'application/zip');
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server":{"importer.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/rocketchat_importer-slack/server/importer.js                                                       //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

module.export({
  SlackImporter: () => SlackImporter
});
let Base, ProgressStep, Selection, SelectionChannel, SelectionUser;
module.watch(require("meteor/rocketchat:importer"), {
  Base(v) {
    Base = v;
  },

  ProgressStep(v) {
    ProgressStep = v;
  },

  Selection(v) {
    Selection = v;
  },

  SelectionChannel(v) {
    SelectionChannel = v;
  },

  SelectionUser(v) {
    SelectionUser = v;
  }

}, 0);

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 1);

class SlackImporter extends Base {
  constructor(info) {
    super(info);
    this.userTags = [];
    this.bots = {};
  }

  prepare(dataURI, sentContentType, fileName) {
    super.prepare(dataURI, sentContentType, fileName);
    const {
      image
    } = RocketChatFile.dataURIParse(dataURI);
    const zip = new this.AdmZip(new Buffer(image, 'base64'));
    const zipEntries = zip.getEntries();
    let tempChannels = [];
    let tempUsers = [];
    const tempMessages = {};
    zipEntries.forEach(entry => {
      if (entry.entryName.indexOf('__MACOSX') > -1) {
        return this.logger.debug(`Ignoring the file: ${entry.entryName}`);
      }

      if (entry.entryName === 'channels.json') {
        super.updateProgress(ProgressStep.PREPARING_CHANNELS);
        tempChannels = JSON.parse(entry.getData().toString()).filter(channel => channel.creator != null);
        return;
      }

      if (entry.entryName === 'users.json') {
        super.updateProgress(ProgressStep.PREPARING_USERS);
        tempUsers = JSON.parse(entry.getData().toString());
        tempUsers.forEach(user => {
          if (user.is_bot) {
            this.bots[user.profile.bot_id] = user;
          }
        });
        return;
      }

      if (!entry.isDirectory && entry.entryName.indexOf('/') > -1) {
        const item = entry.entryName.split('/');
        const channelName = item[0];
        const msgGroupData = item[1].split('.')[0];
        tempMessages[channelName] = tempMessages[channelName] || {};

        try {
          tempMessages[channelName][msgGroupData] = JSON.parse(entry.getData().toString());
        } catch (error) {
          this.logger.warn(`${entry.entryName} is not a valid JSON file! Unable to import it.`);
        }
      }
    }); // Insert the users record, eventually this might have to be split into several ones as well
    // if someone tries to import a several thousands users instance

    const usersId = this.collection.insert({
      import: this.importRecord._id,
      importer: this.name,
      type: 'users',
      users: tempUsers
    });
    this.users = this.collection.findOne(usersId);
    this.updateRecord({
      'count.users': tempUsers.length
    });
    this.addCountToTotal(tempUsers.length); // Insert the channels records.

    const channelsId = this.collection.insert({
      import: this.importRecord._id,
      importer: this.name,
      type: 'channels',
      channels: tempChannels
    });
    this.channels = this.collection.findOne(channelsId);
    this.updateRecord({
      'count.channels': tempChannels.length
    });
    this.addCountToTotal(tempChannels.length); // Insert the messages records

    super.updateProgress(ProgressStep.PREPARING_MESSAGES);
    let messagesCount = 0;
    Object.keys(tempMessages).forEach(channel => {
      const messagesObj = tempMessages[channel];
      this.messages[channel] = this.messages[channel] || {};
      Object.keys(messagesObj).forEach(date => {
        const msgs = messagesObj[date];
        messagesCount += msgs.length;
        this.updateRecord({
          messagesstatus: `${channel}/${date}`
        });

        if (Base.getBSONSize(msgs) > Base.getMaxBSONSize()) {
          const tmp = Base.getBSONSafeArraysFromAnArray(msgs);
          Object.keys(tmp).forEach(i => {
            const splitMsg = tmp[i];
            const messagesId = this.collection.insert({
              import: this.importRecord._id,
              importer: this.name,
              type: 'messages',
              name: `${channel}/${date}.${i}`,
              messages: splitMsg
            });
            this.messages[channel][`${date}.${i}`] = this.collection.findOne(messagesId);
          });
        } else {
          const messagesId = this.collection.insert({
            import: this.importRecord._id,
            importer: this.name,
            type: 'messages',
            name: `${channel}/${date}`,
            messages: msgs
          });
          this.messages[channel][date] = this.collection.findOne(messagesId);
        }
      });
    });
    this.updateRecord({
      'count.messages': messagesCount,
      messagesstatus: null
    });
    this.addCountToTotal(messagesCount);

    if ([tempUsers.length, tempChannels.length, messagesCount].some(e => e === 0)) {
      this.logger.warn(`The loaded users count ${tempUsers.length}, the loaded channels ${tempChannels.length}, and the loaded messages ${messagesCount}`);
      console.log(`The loaded users count ${tempUsers.length}, the loaded channels ${tempChannels.length}, and the loaded messages ${messagesCount}`);
      super.updateProgress(ProgressStep.ERROR);
      return this.getProgress();
    }

    const selectionUsers = tempUsers.map(user => new SelectionUser(user.id, user.name, user.profile.email, user.deleted, user.is_bot, !user.is_bot));
    const selectionChannels = tempChannels.map(channel => new SelectionChannel(channel.id, channel.name, channel.is_archived, true, false));
    const selectionMessages = this.importRecord.count.messages;
    super.updateProgress(ProgressStep.USER_SELECTION);
    return new Selection(this.name, selectionUsers, selectionChannels, selectionMessages);
  }

  startImport(importSelection) {
    super.startImport(importSelection);
    const start = Date.now();
    Object.keys(importSelection.users).forEach(key => {
      const user = importSelection.users[key];
      Object.keys(this.users.users).forEach(k => {
        const u = this.users.users[k];

        if (u.id === user.user_id) {
          u.do_import = user.do_import;
        }
      });
    });
    this.collection.update({
      _id: this.users._id
    }, {
      $set: {
        users: this.users.users
      }
    });
    Object.keys(importSelection.channels).forEach(key => {
      const channel = importSelection.channels[key];
      Object.keys(this.channels.channels).forEach(k => {
        const c = this.channels.channels[k];

        if (c.id === channel.channel_id) {
          c.do_import = channel.do_import;
        }
      });
    });
    this.collection.update({
      _id: this.channels._id
    }, {
      $set: {
        channels: this.channels.channels
      }
    });
    const startedByUserId = Meteor.userId();
    Meteor.defer(() => {
      try {
        super.updateProgress(ProgressStep.IMPORTING_USERS);
        this.users.users.forEach(user => {
          if (!user.do_import) {
            return;
          }

          Meteor.runAsUser(startedByUserId, () => {
            const existantUser = RocketChat.models.Users.findOneByEmailAddress(user.profile.email) || RocketChat.models.Users.findOneByUsername(user.name);

            if (existantUser) {
              user.rocketId = existantUser._id;
              RocketChat.models.Users.update({
                _id: user.rocketId
              }, {
                $addToSet: {
                  importIds: user.id
                }
              });
              this.userTags.push({
                slack: `<@${user.id}>`,
                slackLong: `<@${user.id}|${user.name}>`,
                rocket: `@${existantUser.username}`
              });
            } else {
              const userId = user.profile.email ? Accounts.createUser({
                email: user.profile.email,
                password: Date.now() + user.name + user.profile.email.toUpperCase()
              }) : Accounts.createUser({
                username: user.name,
                password: Date.now() + user.name,
                joinDefaultChannelsSilenced: true
              });
              Meteor.runAsUser(userId, () => {
                Meteor.call('setUsername', user.name, {
                  joinDefaultChannelsSilenced: true
                });
                const url = user.profile.image_original || user.profile.image_512;

                try {
                  Meteor.call('setAvatarFromService', url, undefined, 'url');
                } catch (error) {
                  this.logger.warn(`Failed to set ${user.name}'s avatar from url ${url}`);
                  console.log(`Failed to set ${user.name}'s avatar from url ${url}`);
                } // Slack's is -18000 which translates to Rocket.Chat's after dividing by 3600


                if (user.tz_offset) {
                  Meteor.call('userSetUtcOffset', user.tz_offset / 3600);
                }
              });
              RocketChat.models.Users.update({
                _id: userId
              }, {
                $addToSet: {
                  importIds: user.id
                }
              });

              if (user.profile.real_name) {
                RocketChat.models.Users.setName(userId, user.profile.real_name);
              } // Deleted users are 'inactive' users in Rocket.Chat


              if (user.deleted) {
                Meteor.call('setUserActiveStatus', userId, false);
              }

              user.rocketId = userId;
              this.userTags.push({
                slack: `<@${user.id}>`,
                slackLong: `<@${user.id}|${user.name}>`,
                rocket: `@${user.name}`
              });
            }

            this.addCountCompleted(1);
          });
        });
        this.collection.update({
          _id: this.users._id
        }, {
          $set: {
            users: this.users.users
          }
        });
        super.updateProgress(ProgressStep.IMPORTING_CHANNELS);
        this.channels.channels.forEach(channel => {
          if (!channel.do_import) {
            return;
          }

          Meteor.runAsUser(startedByUserId, () => {
            const existantRoom = RocketChat.models.Rooms.findOneByName(channel.name);

            if (existantRoom || channel.is_general) {
              if (channel.is_general && existantRoom && channel.name !== existantRoom.name) {
                Meteor.call('saveRoomSettings', 'GENERAL', 'roomName', channel.name);
              }

              channel.rocketId = channel.is_general ? 'GENERAL' : existantRoom._id;
              RocketChat.models.Rooms.update({
                _id: channel.rocketId
              }, {
                $addToSet: {
                  importIds: channel.id
                }
              });
            } else {
              const users = channel.members.reduce((ret, member) => {
                if (member !== channel.creator) {
                  const user = this.getRocketUser(member);

                  if (user && user.username) {
                    ret.push(user.username);
                  }
                }

                return ret;
              }, []);
              let userId = startedByUserId;
              this.users.users.forEach(user => {
                if (user.id === channel.creator && user.do_import) {
                  userId = user.rocketId;
                }
              });
              Meteor.runAsUser(userId, () => {
                const returned = Meteor.call('createChannel', channel.name, users);
                channel.rocketId = returned.rid;
              }); // @TODO implement model specific function

              const roomUpdate = {
                ts: new Date(channel.created * 1000)
              };

              if (!_.isEmpty(channel.topic && channel.topic.value)) {
                roomUpdate.topic = channel.topic.value;
              }

              if (!_.isEmpty(channel.purpose && channel.purpose.value)) {
                roomUpdate.description = channel.purpose.value;
              }

              RocketChat.models.Rooms.update({
                _id: channel.rocketId
              }, {
                $set: roomUpdate,
                $addToSet: {
                  importIds: channel.id
                }
              });
            }

            this.addCountCompleted(1);
          });
        });
        this.collection.update({
          _id: this.channels._id
        }, {
          $set: {
            channels: this.channels.channels
          }
        });
        const missedTypes = {};
        const ignoreTypes = {
          bot_add: true,
          file_comment: true,
          file_mention: true
        };
        super.updateProgress(ProgressStep.IMPORTING_MESSAGES);
        Object.keys(this.messages).forEach(channel => {
          const messagesObj = this.messages[channel];
          Meteor.runAsUser(startedByUserId, () => {
            const slackChannel = this.getSlackChannelFromName(channel);

            if (!slackChannel || !slackChannel.do_import) {
              return;
            }

            const room = RocketChat.models.Rooms.findOneById(slackChannel.rocketId, {
              fields: {
                usernames: 1,
                t: 1,
                name: 1
              }
            });
            Object.keys(messagesObj).forEach(date => {
              const msgs = messagesObj[date];
              msgs.messages.forEach(message => {
                this.updateRecord({
                  messagesstatus: `${channel}/${date}.${msgs.messages.length}`
                });
                const msgDataDefaults = {
                  _id: `slack-${slackChannel.id}-${message.ts.replace(/\./g, '-')}`,
                  ts: new Date(parseInt(message.ts.split('.')[0]) * 1000)
                }; // Process the reactions

                if (message.reactions && message.reactions.length > 0) {
                  msgDataDefaults.reactions = {};
                  message.reactions.forEach(reaction => {
                    reaction.name = `:${reaction.name}:`;
                    msgDataDefaults.reactions[reaction.name] = {
                      usernames: []
                    };
                    reaction.users.forEach(u => {
                      const rcUser = this.getRocketUser(u);

                      if (!rcUser) {
                        return;
                      }

                      msgDataDefaults.reactions[reaction.name].usernames.push(rcUser.username);
                    });

                    if (msgDataDefaults.reactions[reaction.name].usernames.length === 0) {
                      delete msgDataDefaults.reactions[reaction.name];
                    }
                  });
                }

                if (message.type === 'message') {
                  if (message.subtype) {
                    if (message.subtype === 'channel_join') {
                      if (this.getRocketUser(message.user)) {
                        RocketChat.models.Messages.createUserJoinWithRoomIdAndUser(room._id, this.getRocketUser(message.user), msgDataDefaults);
                      }
                    } else if (message.subtype === 'channel_leave') {
                      if (this.getRocketUser(message.user)) {
                        RocketChat.models.Messages.createUserLeaveWithRoomIdAndUser(room._id, this.getRocketUser(message.user), msgDataDefaults);
                      }
                    } else if (message.subtype === 'me_message') {
                      const msgObj = (0, _objectSpread2.default)({}, msgDataDefaults, {
                        msg: `_${this.convertSlackMessageToRocketChat(message.text)}_`
                      });
                      RocketChat.sendMessage(this.getRocketUser(message.user), msgObj, room, true);
                    } else if (message.subtype === 'bot_message' || message.subtype === 'slackbot_response') {
                      const botUser = RocketChat.models.Users.findOneById('rocket.cat', {
                        fields: {
                          username: 1
                        }
                      });
                      const botUsername = this.bots[message.bot_id] ? this.bots[message.bot_id].name : message.username;
                      const msgObj = (0, _objectSpread2.default)({}, msgDataDefaults, {
                        msg: this.convertSlackMessageToRocketChat(message.text),
                        rid: room._id,
                        bot: true,
                        attachments: message.attachments,
                        username: botUsername || undefined
                      });

                      if (message.edited) {
                        msgObj.editedAt = new Date(parseInt(message.edited.ts.split('.')[0]) * 1000);
                        const editedBy = this.getRocketUser(message.edited.user);

                        if (editedBy) {
                          msgObj.editedBy = {
                            _id: editedBy._id,
                            username: editedBy.username
                          };
                        }
                      }

                      if (message.icons) {
                        msgObj.emoji = message.icons.emoji;
                      }

                      RocketChat.sendMessage(botUser, msgObj, room, true);
                    } else if (message.subtype === 'channel_purpose') {
                      if (this.getRocketUser(message.user)) {
                        RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser('room_changed_description', room._id, message.purpose, this.getRocketUser(message.user), msgDataDefaults);
                      }
                    } else if (message.subtype === 'channel_topic') {
                      if (this.getRocketUser(message.user)) {
                        RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser('room_changed_topic', room._id, message.topic, this.getRocketUser(message.user), msgDataDefaults);
                      }
                    } else if (message.subtype === 'channel_name') {
                      if (this.getRocketUser(message.user)) {
                        RocketChat.models.Messages.createRoomRenamedWithRoomIdRoomNameAndUser(room._id, message.name, this.getRocketUser(message.user), msgDataDefaults);
                      }
                    } else if (message.subtype === 'pinned_item') {
                      if (message.attachments) {
                        const msgObj = (0, _objectSpread2.default)({}, msgDataDefaults, {
                          attachments: [{
                            text: this.convertSlackMessageToRocketChat(message.attachments[0].text),
                            author_name: message.attachments[0].author_subname,
                            author_icon: getAvatarUrlFromUsername(message.attachments[0].author_subname)
                          }]
                        });
                        RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser('message_pinned', room._id, '', this.getRocketUser(message.user), msgObj);
                      } else {
                        // TODO: make this better
                        this.logger.debug('Pinned item with no attachment, needs work.'); // RocketChat.models.Messages.createWithTypeRoomIdMessageAndUser 'message_pinned', room._id, '', @getRocketUser(message.user), msgDataDefaults
                      }
                    } else if (message.subtype === 'file_share') {
                      if (message.file && message.file.url_private_download !== undefined) {
                        const details = {
                          message_id: `slack-${message.ts.replace(/\./g, '-')}`,
                          name: message.file.name,
                          size: message.file.size,
                          type: message.file.mimetype,
                          rid: room._id
                        };
                        this.uploadFile(details, message.file.url_private_download, this.getRocketUser(message.user), room, new Date(parseInt(message.ts.split('.')[0]) * 1000));
                      }
                    } else if (!missedTypes[message.subtype] && !ignoreTypes[message.subtype]) {
                      missedTypes[message.subtype] = message;
                    }
                  } else {
                    const user = this.getRocketUser(message.user);

                    if (user) {
                      const msgObj = (0, _objectSpread2.default)({}, msgDataDefaults, {
                        msg: this.convertSlackMessageToRocketChat(message.text),
                        rid: room._id,
                        u: {
                          _id: user._id,
                          username: user.username
                        }
                      });

                      if (message.edited) {
                        msgObj.editedAt = new Date(parseInt(message.edited.ts.split('.')[0]) * 1000);
                        const editedBy = this.getRocketUser(message.edited.user);

                        if (editedBy) {
                          msgObj.editedBy = {
                            _id: editedBy._id,
                            username: editedBy.username
                          };
                        }
                      }

                      try {
                        RocketChat.sendMessage(this.getRocketUser(message.user), msgObj, room, true);
                      } catch (e) {
                        this.logger.warn(`Failed to import the message: ${msgDataDefaults._id}`);
                      }
                    }
                  }
                }

                this.addCountCompleted(1);
              });
            });
          });
        });

        if (!_.isEmpty(missedTypes)) {
          console.log('Missed import types:', missedTypes);
        }

        super.updateProgress(ProgressStep.FINISHING);
        this.channels.channels.forEach(channel => {
          if (channel.do_import && channel.is_archived) {
            Meteor.runAsUser(startedByUserId, function () {
              Meteor.call('archiveRoom', channel.rocketId);
            });
          }
        });
        super.updateProgress(ProgressStep.DONE);
        this.logger.log(`Import took ${Date.now() - start} milliseconds.`);
      } catch (e) {
        this.logger.error(e);
        super.updateProgress(ProgressStep.ERROR);
      }
    });
    return this.getProgress();
  }

  getSlackChannelFromName(channelName) {
    return this.channels.channels.find(channel => channel.name === channelName);
  }

  getRocketUser(slackId) {
    const user = this.users.users.find(user => user.id === slackId);

    if (user) {
      return RocketChat.models.Users.findOneById(user.rocketId, {
        fields: {
          username: 1,
          name: 1
        }
      });
    }
  }

  convertSlackMessageToRocketChat(message) {
    if (message) {
      message = message.replace(/<!everyone>/g, '@all');
      message = message.replace(/<!channel>/g, '@all');
      message = message.replace(/<!here>/g, '@here');
      message = message.replace(/&gt;/g, '>');
      message = message.replace(/&lt;/g, '<');
      message = message.replace(/&amp;/g, '&');
      message = message.replace(/:simple_smile:/g, ':smile:');
      message = message.replace(/:memo:/g, ':pencil:');
      message = message.replace(/:piggy:/g, ':pig:');
      message = message.replace(/:uk:/g, ':gb:');
      message = message.replace(/<(http[s]?:[^>]*)>/g, '$1');

      for (const userReplace of Array.from(this.userTags)) {
        message = message.replace(userReplace.slack, userReplace.rocket);
        message = message.replace(userReplace.slackLong, userReplace.rocket);
      }
    } else {
      message = '';
    }

    return message;
  }

  getSelection() {
    const selectionUsers = this.users.users.map(user => new SelectionUser(user.id, user.name, user.profile.email, user.deleted, user.is_bot, !user.is_bot));
    const selectionChannels = this.channels.channels.map(channel => new SelectionChannel(channel.id, channel.name, channel.is_archived, true, false));
    return new Selection(this.name, selectionUsers, selectionChannels, this.importRecord.count.messages);
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"adder.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/rocketchat_importer-slack/server/adder.js                                                          //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
let Importers;
module.watch(require("meteor/rocketchat:importer"), {
  Importers(v) {
    Importers = v;
  }

}, 0);
let SlackImporterInfo;
module.watch(require("../info"), {
  SlackImporterInfo(v) {
    SlackImporterInfo = v;
  }

}, 1);
let SlackImporter;
module.watch(require("./importer"), {
  SlackImporter(v) {
    SlackImporter = v;
  }

}, 2);
Importers.add(new SlackImporterInfo(), SlackImporter);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:importer-slack/info.js");
require("/node_modules/meteor/rocketchat:importer-slack/server/importer.js");
require("/node_modules/meteor/rocketchat:importer-slack/server/adder.js");

/* Exports */
Package._define("rocketchat:importer-slack");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_importer-slack.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci1zbGFjay9pbmZvLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmltcG9ydGVyLXNsYWNrL3NlcnZlci9pbXBvcnRlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci1zbGFjay9zZXJ2ZXIvYWRkZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiU2xhY2tJbXBvcnRlckluZm8iLCJJbXBvcnRlckluZm8iLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwiY29uc3RydWN0b3IiLCJTbGFja0ltcG9ydGVyIiwiQmFzZSIsIlByb2dyZXNzU3RlcCIsIlNlbGVjdGlvbiIsIlNlbGVjdGlvbkNoYW5uZWwiLCJTZWxlY3Rpb25Vc2VyIiwiXyIsImRlZmF1bHQiLCJpbmZvIiwidXNlclRhZ3MiLCJib3RzIiwicHJlcGFyZSIsImRhdGFVUkkiLCJzZW50Q29udGVudFR5cGUiLCJmaWxlTmFtZSIsImltYWdlIiwiUm9ja2V0Q2hhdEZpbGUiLCJkYXRhVVJJUGFyc2UiLCJ6aXAiLCJBZG1aaXAiLCJCdWZmZXIiLCJ6aXBFbnRyaWVzIiwiZ2V0RW50cmllcyIsInRlbXBDaGFubmVscyIsInRlbXBVc2VycyIsInRlbXBNZXNzYWdlcyIsImZvckVhY2giLCJlbnRyeSIsImVudHJ5TmFtZSIsImluZGV4T2YiLCJsb2dnZXIiLCJkZWJ1ZyIsInVwZGF0ZVByb2dyZXNzIiwiUFJFUEFSSU5HX0NIQU5ORUxTIiwiSlNPTiIsInBhcnNlIiwiZ2V0RGF0YSIsInRvU3RyaW5nIiwiZmlsdGVyIiwiY2hhbm5lbCIsImNyZWF0b3IiLCJQUkVQQVJJTkdfVVNFUlMiLCJ1c2VyIiwiaXNfYm90IiwicHJvZmlsZSIsImJvdF9pZCIsImlzRGlyZWN0b3J5IiwiaXRlbSIsInNwbGl0IiwiY2hhbm5lbE5hbWUiLCJtc2dHcm91cERhdGEiLCJlcnJvciIsIndhcm4iLCJ1c2Vyc0lkIiwiY29sbGVjdGlvbiIsImluc2VydCIsImltcG9ydCIsImltcG9ydFJlY29yZCIsIl9pZCIsImltcG9ydGVyIiwibmFtZSIsInR5cGUiLCJ1c2VycyIsImZpbmRPbmUiLCJ1cGRhdGVSZWNvcmQiLCJsZW5ndGgiLCJhZGRDb3VudFRvVG90YWwiLCJjaGFubmVsc0lkIiwiY2hhbm5lbHMiLCJQUkVQQVJJTkdfTUVTU0FHRVMiLCJtZXNzYWdlc0NvdW50IiwiT2JqZWN0Iiwia2V5cyIsIm1lc3NhZ2VzT2JqIiwibWVzc2FnZXMiLCJkYXRlIiwibXNncyIsIm1lc3NhZ2Vzc3RhdHVzIiwiZ2V0QlNPTlNpemUiLCJnZXRNYXhCU09OU2l6ZSIsInRtcCIsImdldEJTT05TYWZlQXJyYXlzRnJvbUFuQXJyYXkiLCJpIiwic3BsaXRNc2ciLCJtZXNzYWdlc0lkIiwic29tZSIsImUiLCJjb25zb2xlIiwibG9nIiwiRVJST1IiLCJnZXRQcm9ncmVzcyIsInNlbGVjdGlvblVzZXJzIiwibWFwIiwiaWQiLCJlbWFpbCIsImRlbGV0ZWQiLCJzZWxlY3Rpb25DaGFubmVscyIsImlzX2FyY2hpdmVkIiwic2VsZWN0aW9uTWVzc2FnZXMiLCJjb3VudCIsIlVTRVJfU0VMRUNUSU9OIiwic3RhcnRJbXBvcnQiLCJpbXBvcnRTZWxlY3Rpb24iLCJzdGFydCIsIkRhdGUiLCJub3ciLCJrZXkiLCJrIiwidSIsInVzZXJfaWQiLCJkb19pbXBvcnQiLCJ1cGRhdGUiLCIkc2V0IiwiYyIsImNoYW5uZWxfaWQiLCJzdGFydGVkQnlVc2VySWQiLCJNZXRlb3IiLCJ1c2VySWQiLCJkZWZlciIsIklNUE9SVElOR19VU0VSUyIsInJ1bkFzVXNlciIsImV4aXN0YW50VXNlciIsIlJvY2tldENoYXQiLCJtb2RlbHMiLCJVc2VycyIsImZpbmRPbmVCeUVtYWlsQWRkcmVzcyIsImZpbmRPbmVCeVVzZXJuYW1lIiwicm9ja2V0SWQiLCIkYWRkVG9TZXQiLCJpbXBvcnRJZHMiLCJwdXNoIiwic2xhY2siLCJzbGFja0xvbmciLCJyb2NrZXQiLCJ1c2VybmFtZSIsIkFjY291bnRzIiwiY3JlYXRlVXNlciIsInBhc3N3b3JkIiwidG9VcHBlckNhc2UiLCJqb2luRGVmYXVsdENoYW5uZWxzU2lsZW5jZWQiLCJjYWxsIiwidXJsIiwiaW1hZ2Vfb3JpZ2luYWwiLCJpbWFnZV81MTIiLCJ1bmRlZmluZWQiLCJ0el9vZmZzZXQiLCJyZWFsX25hbWUiLCJzZXROYW1lIiwiYWRkQ291bnRDb21wbGV0ZWQiLCJJTVBPUlRJTkdfQ0hBTk5FTFMiLCJleGlzdGFudFJvb20iLCJSb29tcyIsImZpbmRPbmVCeU5hbWUiLCJpc19nZW5lcmFsIiwibWVtYmVycyIsInJlZHVjZSIsInJldCIsIm1lbWJlciIsImdldFJvY2tldFVzZXIiLCJyZXR1cm5lZCIsInJpZCIsInJvb21VcGRhdGUiLCJ0cyIsImNyZWF0ZWQiLCJpc0VtcHR5IiwidG9waWMiLCJ2YWx1ZSIsInB1cnBvc2UiLCJkZXNjcmlwdGlvbiIsIm1pc3NlZFR5cGVzIiwiaWdub3JlVHlwZXMiLCJib3RfYWRkIiwiZmlsZV9jb21tZW50IiwiZmlsZV9tZW50aW9uIiwiSU1QT1JUSU5HX01FU1NBR0VTIiwic2xhY2tDaGFubmVsIiwiZ2V0U2xhY2tDaGFubmVsRnJvbU5hbWUiLCJyb29tIiwiZmluZE9uZUJ5SWQiLCJmaWVsZHMiLCJ1c2VybmFtZXMiLCJ0IiwibWVzc2FnZSIsIm1zZ0RhdGFEZWZhdWx0cyIsInJlcGxhY2UiLCJwYXJzZUludCIsInJlYWN0aW9ucyIsInJlYWN0aW9uIiwicmNVc2VyIiwic3VidHlwZSIsIk1lc3NhZ2VzIiwiY3JlYXRlVXNlckpvaW5XaXRoUm9vbUlkQW5kVXNlciIsImNyZWF0ZVVzZXJMZWF2ZVdpdGhSb29tSWRBbmRVc2VyIiwibXNnT2JqIiwibXNnIiwiY29udmVydFNsYWNrTWVzc2FnZVRvUm9ja2V0Q2hhdCIsInRleHQiLCJzZW5kTWVzc2FnZSIsImJvdFVzZXIiLCJib3RVc2VybmFtZSIsImJvdCIsImF0dGFjaG1lbnRzIiwiZWRpdGVkIiwiZWRpdGVkQXQiLCJlZGl0ZWRCeSIsImljb25zIiwiZW1vamkiLCJjcmVhdGVSb29tU2V0dGluZ3NDaGFuZ2VkV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlciIsImNyZWF0ZVJvb21SZW5hbWVkV2l0aFJvb21JZFJvb21OYW1lQW5kVXNlciIsImF1dGhvcl9uYW1lIiwiYXV0aG9yX3N1Ym5hbWUiLCJhdXRob3JfaWNvbiIsImdldEF2YXRhclVybEZyb21Vc2VybmFtZSIsImNyZWF0ZVdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIiLCJmaWxlIiwidXJsX3ByaXZhdGVfZG93bmxvYWQiLCJkZXRhaWxzIiwibWVzc2FnZV9pZCIsInNpemUiLCJtaW1ldHlwZSIsInVwbG9hZEZpbGUiLCJGSU5JU0hJTkciLCJET05FIiwiZmluZCIsInNsYWNrSWQiLCJ1c2VyUmVwbGFjZSIsIkFycmF5IiwiZnJvbSIsImdldFNlbGVjdGlvbiIsIkltcG9ydGVycyIsImFkZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxPQUFPQyxNQUFQLENBQWM7QUFBQ0MscUJBQWtCLE1BQUlBO0FBQXZCLENBQWQ7QUFBeUQsSUFBSUMsWUFBSjtBQUFpQkgsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLDRCQUFSLENBQWIsRUFBbUQ7QUFBQ0YsZUFBYUcsQ0FBYixFQUFlO0FBQUNILG1CQUFhRyxDQUFiO0FBQWU7O0FBQWhDLENBQW5ELEVBQXFGLENBQXJGOztBQUVuRSxNQUFNSixpQkFBTixTQUFnQ0MsWUFBaEMsQ0FBNkM7QUFDbkRJLGdCQUFjO0FBQ2IsVUFBTSxPQUFOLEVBQWUsT0FBZixFQUF3QixpQkFBeEI7QUFDQTs7QUFIa0QsQzs7Ozs7Ozs7Ozs7Ozs7O0FDRnBEUCxPQUFPQyxNQUFQLENBQWM7QUFBQ08saUJBQWMsTUFBSUE7QUFBbkIsQ0FBZDtBQUFpRCxJQUFJQyxJQUFKLEVBQVNDLFlBQVQsRUFBc0JDLFNBQXRCLEVBQWdDQyxnQkFBaEMsRUFBaURDLGFB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QXZDLEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfaW1wb3J0ZXItc2xhY2suanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbXBvcnRlckluZm8gfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDppbXBvcnRlcic7XG5cbmV4cG9ydCBjbGFzcyBTbGFja0ltcG9ydGVySW5mbyBleHRlbmRzIEltcG9ydGVySW5mbyB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdzbGFjaycsICdTbGFjaycsICdhcHBsaWNhdGlvbi96aXAnKTtcblx0fVxufVxuIiwiaW1wb3J0IHtcblx0QmFzZSxcblx0UHJvZ3Jlc3NTdGVwLFxuXHRTZWxlY3Rpb24sXG5cdFNlbGVjdGlvbkNoYW5uZWwsXG5cdFNlbGVjdGlvblVzZXIsXG59IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmltcG9ydGVyJztcblxuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbmV4cG9ydCBjbGFzcyBTbGFja0ltcG9ydGVyIGV4dGVuZHMgQmFzZSB7XG5cdGNvbnN0cnVjdG9yKGluZm8pIHtcblx0XHRzdXBlcihpbmZvKTtcblx0XHR0aGlzLnVzZXJUYWdzID0gW107XG5cdFx0dGhpcy5ib3RzID0ge307XG5cdH1cblxuXHRwcmVwYXJlKGRhdGFVUkksIHNlbnRDb250ZW50VHlwZSwgZmlsZU5hbWUpIHtcblx0XHRzdXBlci5wcmVwYXJlKGRhdGFVUkksIHNlbnRDb250ZW50VHlwZSwgZmlsZU5hbWUpO1xuXG5cdFx0Y29uc3QgeyBpbWFnZSB9ID0gUm9ja2V0Q2hhdEZpbGUuZGF0YVVSSVBhcnNlKGRhdGFVUkkpO1xuXHRcdGNvbnN0IHppcCA9IG5ldyB0aGlzLkFkbVppcChuZXcgQnVmZmVyKGltYWdlLCAnYmFzZTY0JykpO1xuXHRcdGNvbnN0IHppcEVudHJpZXMgPSB6aXAuZ2V0RW50cmllcygpO1xuXG5cdFx0bGV0IHRlbXBDaGFubmVscyA9IFtdO1xuXHRcdGxldCB0ZW1wVXNlcnMgPSBbXTtcblx0XHRjb25zdCB0ZW1wTWVzc2FnZXMgPSB7fTtcblxuXHRcdHppcEVudHJpZXMuZm9yRWFjaCgoZW50cnkpID0+IHtcblx0XHRcdGlmIChlbnRyeS5lbnRyeU5hbWUuaW5kZXhPZignX19NQUNPU1gnKSA+IC0xKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmxvZ2dlci5kZWJ1ZyhgSWdub3JpbmcgdGhlIGZpbGU6ICR7IGVudHJ5LmVudHJ5TmFtZSB9YCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChlbnRyeS5lbnRyeU5hbWUgPT09ICdjaGFubmVscy5qc29uJykge1xuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuUFJFUEFSSU5HX0NIQU5ORUxTKTtcblx0XHRcdFx0dGVtcENoYW5uZWxzID0gSlNPTi5wYXJzZShlbnRyeS5nZXREYXRhKCkudG9TdHJpbmcoKSkuZmlsdGVyKChjaGFubmVsKSA9PiBjaGFubmVsLmNyZWF0b3IgIT0gbnVsbCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGVudHJ5LmVudHJ5TmFtZSA9PT0gJ3VzZXJzLmpzb24nKSB7XG5cdFx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5QUkVQQVJJTkdfVVNFUlMpO1xuXHRcdFx0XHR0ZW1wVXNlcnMgPSBKU09OLnBhcnNlKGVudHJ5LmdldERhdGEoKS50b1N0cmluZygpKTtcblxuXHRcdFx0XHR0ZW1wVXNlcnMuZm9yRWFjaCgodXNlcikgPT4ge1xuXHRcdFx0XHRcdGlmICh1c2VyLmlzX2JvdCkge1xuXHRcdFx0XHRcdFx0dGhpcy5ib3RzW3VzZXIucHJvZmlsZS5ib3RfaWRdID0gdXNlcjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFlbnRyeS5pc0RpcmVjdG9yeSAmJiBlbnRyeS5lbnRyeU5hbWUuaW5kZXhPZignLycpID4gLTEpIHtcblx0XHRcdFx0Y29uc3QgaXRlbSA9IGVudHJ5LmVudHJ5TmFtZS5zcGxpdCgnLycpO1xuXHRcdFx0XHRjb25zdCBjaGFubmVsTmFtZSA9IGl0ZW1bMF07XG5cdFx0XHRcdGNvbnN0IG1zZ0dyb3VwRGF0YSA9IGl0ZW1bMV0uc3BsaXQoJy4nKVswXTtcblx0XHRcdFx0dGVtcE1lc3NhZ2VzW2NoYW5uZWxOYW1lXSA9IHRlbXBNZXNzYWdlc1tjaGFubmVsTmFtZV0gfHwge307XG5cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHR0ZW1wTWVzc2FnZXNbY2hhbm5lbE5hbWVdW21zZ0dyb3VwRGF0YV0gPSBKU09OLnBhcnNlKGVudHJ5LmdldERhdGEoKS50b1N0cmluZygpKTtcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKGAkeyBlbnRyeS5lbnRyeU5hbWUgfSBpcyBub3QgYSB2YWxpZCBKU09OIGZpbGUhIFVuYWJsZSB0byBpbXBvcnQgaXQuYCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIEluc2VydCB0aGUgdXNlcnMgcmVjb3JkLCBldmVudHVhbGx5IHRoaXMgbWlnaHQgaGF2ZSB0byBiZSBzcGxpdCBpbnRvIHNldmVyYWwgb25lcyBhcyB3ZWxsXG5cdFx0Ly8gaWYgc29tZW9uZSB0cmllcyB0byBpbXBvcnQgYSBzZXZlcmFsIHRob3VzYW5kcyB1c2VycyBpbnN0YW5jZVxuXHRcdGNvbnN0IHVzZXJzSWQgPSB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHsgaW1wb3J0OiB0aGlzLmltcG9ydFJlY29yZC5faWQsIGltcG9ydGVyOiB0aGlzLm5hbWUsIHR5cGU6ICd1c2VycycsIHVzZXJzOiB0ZW1wVXNlcnMgfSk7XG5cdFx0dGhpcy51c2VycyA9IHRoaXMuY29sbGVjdGlvbi5maW5kT25lKHVzZXJzSWQpO1xuXHRcdHRoaXMudXBkYXRlUmVjb3JkKHsgJ2NvdW50LnVzZXJzJzogdGVtcFVzZXJzLmxlbmd0aCB9KTtcblx0XHR0aGlzLmFkZENvdW50VG9Ub3RhbCh0ZW1wVXNlcnMubGVuZ3RoKTtcblxuXHRcdC8vIEluc2VydCB0aGUgY2hhbm5lbHMgcmVjb3Jkcy5cblx0XHRjb25zdCBjaGFubmVsc0lkID0gdGhpcy5jb2xsZWN0aW9uLmluc2VydCh7IGltcG9ydDogdGhpcy5pbXBvcnRSZWNvcmQuX2lkLCBpbXBvcnRlcjogdGhpcy5uYW1lLCB0eXBlOiAnY2hhbm5lbHMnLCBjaGFubmVsczogdGVtcENoYW5uZWxzIH0pO1xuXHRcdHRoaXMuY2hhbm5lbHMgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShjaGFubmVsc0lkKTtcblx0XHR0aGlzLnVwZGF0ZVJlY29yZCh7ICdjb3VudC5jaGFubmVscyc6IHRlbXBDaGFubmVscy5sZW5ndGggfSk7XG5cdFx0dGhpcy5hZGRDb3VudFRvVG90YWwodGVtcENoYW5uZWxzLmxlbmd0aCk7XG5cblx0XHQvLyBJbnNlcnQgdGhlIG1lc3NhZ2VzIHJlY29yZHNcblx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuUFJFUEFSSU5HX01FU1NBR0VTKTtcblxuXHRcdGxldCBtZXNzYWdlc0NvdW50ID0gMDtcblx0XHRPYmplY3Qua2V5cyh0ZW1wTWVzc2FnZXMpLmZvckVhY2goKGNoYW5uZWwpID0+IHtcblx0XHRcdGNvbnN0IG1lc3NhZ2VzT2JqID0gdGVtcE1lc3NhZ2VzW2NoYW5uZWxdO1xuXHRcdFx0dGhpcy5tZXNzYWdlc1tjaGFubmVsXSA9IHRoaXMubWVzc2FnZXNbY2hhbm5lbF0gfHwge307XG5cblx0XHRcdE9iamVjdC5rZXlzKG1lc3NhZ2VzT2JqKS5mb3JFYWNoKChkYXRlKSA9PiB7XG5cdFx0XHRcdGNvbnN0IG1zZ3MgPSBtZXNzYWdlc09ialtkYXRlXTtcblx0XHRcdFx0bWVzc2FnZXNDb3VudCArPSBtc2dzLmxlbmd0aDtcblx0XHRcdFx0dGhpcy51cGRhdGVSZWNvcmQoeyBtZXNzYWdlc3N0YXR1czogYCR7IGNoYW5uZWwgfS8keyBkYXRlIH1gIH0pO1xuXHRcdFx0XHRpZiAoQmFzZS5nZXRCU09OU2l6ZShtc2dzKSA+IEJhc2UuZ2V0TWF4QlNPTlNpemUoKSkge1xuXHRcdFx0XHRcdGNvbnN0IHRtcCA9IEJhc2UuZ2V0QlNPTlNhZmVBcnJheXNGcm9tQW5BcnJheShtc2dzKTtcblx0XHRcdFx0XHRPYmplY3Qua2V5cyh0bXApLmZvckVhY2goKGkpID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IHNwbGl0TXNnID0gdG1wW2ldO1xuXHRcdFx0XHRcdFx0Y29uc3QgbWVzc2FnZXNJZCA9IHRoaXMuY29sbGVjdGlvbi5pbnNlcnQoeyBpbXBvcnQ6IHRoaXMuaW1wb3J0UmVjb3JkLl9pZCwgaW1wb3J0ZXI6IHRoaXMubmFtZSwgdHlwZTogJ21lc3NhZ2VzJywgbmFtZTogYCR7IGNoYW5uZWwgfS8keyBkYXRlIH0uJHsgaSB9YCwgbWVzc2FnZXM6IHNwbGl0TXNnIH0pO1xuXHRcdFx0XHRcdFx0dGhpcy5tZXNzYWdlc1tjaGFubmVsXVtgJHsgZGF0ZSB9LiR7IGkgfWBdID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUobWVzc2FnZXNJZCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y29uc3QgbWVzc2FnZXNJZCA9IHRoaXMuY29sbGVjdGlvbi5pbnNlcnQoeyBpbXBvcnQ6IHRoaXMuaW1wb3J0UmVjb3JkLl9pZCwgaW1wb3J0ZXI6IHRoaXMubmFtZSwgdHlwZTogJ21lc3NhZ2VzJywgbmFtZTogYCR7IGNoYW5uZWwgfS8keyBkYXRlIH1gLCBtZXNzYWdlczogbXNncyB9KTtcblx0XHRcdFx0XHR0aGlzLm1lc3NhZ2VzW2NoYW5uZWxdW2RhdGVdID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUobWVzc2FnZXNJZCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy51cGRhdGVSZWNvcmQoeyAnY291bnQubWVzc2FnZXMnOiBtZXNzYWdlc0NvdW50LCBtZXNzYWdlc3N0YXR1czogbnVsbCB9KTtcblx0XHR0aGlzLmFkZENvdW50VG9Ub3RhbChtZXNzYWdlc0NvdW50KTtcblxuXHRcdGlmIChbdGVtcFVzZXJzLmxlbmd0aCwgdGVtcENoYW5uZWxzLmxlbmd0aCwgbWVzc2FnZXNDb3VudF0uc29tZSgoZSkgPT4gZSA9PT0gMCkpIHtcblx0XHRcdHRoaXMubG9nZ2VyLndhcm4oYFRoZSBsb2FkZWQgdXNlcnMgY291bnQgJHsgdGVtcFVzZXJzLmxlbmd0aCB9LCB0aGUgbG9hZGVkIGNoYW5uZWxzICR7IHRlbXBDaGFubmVscy5sZW5ndGggfSwgYW5kIHRoZSBsb2FkZWQgbWVzc2FnZXMgJHsgbWVzc2FnZXNDb3VudCB9YCk7XG5cdFx0XHRjb25zb2xlLmxvZyhgVGhlIGxvYWRlZCB1c2VycyBjb3VudCAkeyB0ZW1wVXNlcnMubGVuZ3RoIH0sIHRoZSBsb2FkZWQgY2hhbm5lbHMgJHsgdGVtcENoYW5uZWxzLmxlbmd0aCB9LCBhbmQgdGhlIGxvYWRlZCBtZXNzYWdlcyAkeyBtZXNzYWdlc0NvdW50IH1gKTtcblx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5FUlJPUik7XG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRQcm9ncmVzcygpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHNlbGVjdGlvblVzZXJzID0gdGVtcFVzZXJzLm1hcCgodXNlcikgPT4gbmV3IFNlbGVjdGlvblVzZXIodXNlci5pZCwgdXNlci5uYW1lLCB1c2VyLnByb2ZpbGUuZW1haWwsIHVzZXIuZGVsZXRlZCwgdXNlci5pc19ib3QsICF1c2VyLmlzX2JvdCkpO1xuXHRcdGNvbnN0IHNlbGVjdGlvbkNoYW5uZWxzID0gdGVtcENoYW5uZWxzLm1hcCgoY2hhbm5lbCkgPT4gbmV3IFNlbGVjdGlvbkNoYW5uZWwoY2hhbm5lbC5pZCwgY2hhbm5lbC5uYW1lLCBjaGFubmVsLmlzX2FyY2hpdmVkLCB0cnVlLCBmYWxzZSkpO1xuXHRcdGNvbnN0IHNlbGVjdGlvbk1lc3NhZ2VzID0gdGhpcy5pbXBvcnRSZWNvcmQuY291bnQubWVzc2FnZXM7XG5cdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLlVTRVJfU0VMRUNUSU9OKTtcblxuXHRcdHJldHVybiBuZXcgU2VsZWN0aW9uKHRoaXMubmFtZSwgc2VsZWN0aW9uVXNlcnMsIHNlbGVjdGlvbkNoYW5uZWxzLCBzZWxlY3Rpb25NZXNzYWdlcyk7XG5cdH1cblxuXHRzdGFydEltcG9ydChpbXBvcnRTZWxlY3Rpb24pIHtcblx0XHRzdXBlci5zdGFydEltcG9ydChpbXBvcnRTZWxlY3Rpb24pO1xuXHRcdGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcblxuXHRcdE9iamVjdC5rZXlzKGltcG9ydFNlbGVjdGlvbi51c2VycykuZm9yRWFjaCgoa2V5KSA9PiB7XG5cdFx0XHRjb25zdCB1c2VyID0gaW1wb3J0U2VsZWN0aW9uLnVzZXJzW2tleV07XG5cdFx0XHRPYmplY3Qua2V5cyh0aGlzLnVzZXJzLnVzZXJzKS5mb3JFYWNoKChrKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHUgPSB0aGlzLnVzZXJzLnVzZXJzW2tdO1xuXHRcdFx0XHRpZiAodS5pZCA9PT0gdXNlci51c2VyX2lkKSB7XG5cdFx0XHRcdFx0dS5kb19pbXBvcnQgPSB1c2VyLmRvX2ltcG9ydDtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFx0dGhpcy5jb2xsZWN0aW9uLnVwZGF0ZSh7IF9pZDogdGhpcy51c2Vycy5faWQgfSwgeyAkc2V0OiB7IHVzZXJzOiB0aGlzLnVzZXJzLnVzZXJzIH0gfSk7XG5cblx0XHRPYmplY3Qua2V5cyhpbXBvcnRTZWxlY3Rpb24uY2hhbm5lbHMpLmZvckVhY2goKGtleSkgPT4ge1xuXHRcdFx0Y29uc3QgY2hhbm5lbCA9IGltcG9ydFNlbGVjdGlvbi5jaGFubmVsc1trZXldO1xuXHRcdFx0T2JqZWN0LmtleXModGhpcy5jaGFubmVscy5jaGFubmVscykuZm9yRWFjaCgoaykgPT4ge1xuXHRcdFx0XHRjb25zdCBjID0gdGhpcy5jaGFubmVscy5jaGFubmVsc1trXTtcblx0XHRcdFx0aWYgKGMuaWQgPT09IGNoYW5uZWwuY2hhbm5lbF9pZCkge1xuXHRcdFx0XHRcdGMuZG9faW1wb3J0ID0gY2hhbm5lbC5kb19pbXBvcnQ7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdHRoaXMuY29sbGVjdGlvbi51cGRhdGUoeyBfaWQ6IHRoaXMuY2hhbm5lbHMuX2lkIH0sIHsgJHNldDogeyBjaGFubmVsczogdGhpcy5jaGFubmVscy5jaGFubmVscyB9IH0pO1xuXG5cdFx0Y29uc3Qgc3RhcnRlZEJ5VXNlcklkID0gTWV0ZW9yLnVzZXJJZCgpO1xuXHRcdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuSU1QT1JUSU5HX1VTRVJTKTtcblx0XHRcdFx0dGhpcy51c2Vycy51c2Vycy5mb3JFYWNoKCh1c2VyKSA9PiB7XG5cdFx0XHRcdFx0aWYgKCF1c2VyLmRvX2ltcG9ydCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIoc3RhcnRlZEJ5VXNlcklkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zdCBleGlzdGFudFVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlFbWFpbEFkZHJlc3ModXNlci5wcm9maWxlLmVtYWlsKSB8fCBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlVc2VybmFtZSh1c2VyLm5hbWUpO1xuXHRcdFx0XHRcdFx0aWYgKGV4aXN0YW50VXNlcikge1xuXHRcdFx0XHRcdFx0XHR1c2VyLnJvY2tldElkID0gZXhpc3RhbnRVc2VyLl9pZDtcblx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMudXBkYXRlKHsgX2lkOiB1c2VyLnJvY2tldElkIH0sIHsgJGFkZFRvU2V0OiB7IGltcG9ydElkczogdXNlci5pZCB9IH0pO1xuXHRcdFx0XHRcdFx0XHR0aGlzLnVzZXJUYWdzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdHNsYWNrOiBgPEAkeyB1c2VyLmlkIH0+YCxcblx0XHRcdFx0XHRcdFx0XHRzbGFja0xvbmc6IGA8QCR7IHVzZXIuaWQgfXwkeyB1c2VyLm5hbWUgfT5gLFxuXHRcdFx0XHRcdFx0XHRcdHJvY2tldDogYEAkeyBleGlzdGFudFVzZXIudXNlcm5hbWUgfWAsXG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgdXNlcklkID0gdXNlci5wcm9maWxlLmVtYWlsID8gQWNjb3VudHMuY3JlYXRlVXNlcih7IGVtYWlsOiB1c2VyLnByb2ZpbGUuZW1haWwsIHBhc3N3b3JkOiBEYXRlLm5vdygpICsgdXNlci5uYW1lICsgdXNlci5wcm9maWxlLmVtYWlsLnRvVXBwZXJDYXNlKCkgfSkgOiBBY2NvdW50cy5jcmVhdGVVc2VyKHsgdXNlcm5hbWU6IHVzZXIubmFtZSwgcGFzc3dvcmQ6IERhdGUubm93KCkgKyB1c2VyLm5hbWUsIGpvaW5EZWZhdWx0Q2hhbm5lbHNTaWxlbmNlZDogdHJ1ZSB9KTtcblx0XHRcdFx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih1c2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnc2V0VXNlcm5hbWUnLCB1c2VyLm5hbWUsIHsgam9pbkRlZmF1bHRDaGFubmVsc1NpbGVuY2VkOiB0cnVlIH0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgdXJsID0gdXNlci5wcm9maWxlLmltYWdlX29yaWdpbmFsIHx8IHVzZXIucHJvZmlsZS5pbWFnZV81MTI7XG5cdFx0XHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0XHRcdE1ldGVvci5jYWxsKCdzZXRBdmF0YXJGcm9tU2VydmljZScsIHVybCwgdW5kZWZpbmVkLCAndXJsJyk7XG5cdFx0XHRcdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMubG9nZ2VyLndhcm4oYEZhaWxlZCB0byBzZXQgJHsgdXNlci5uYW1lIH0ncyBhdmF0YXIgZnJvbSB1cmwgJHsgdXJsIH1gKTtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGBGYWlsZWQgdG8gc2V0ICR7IHVzZXIubmFtZSB9J3MgYXZhdGFyIGZyb20gdXJsICR7IHVybCB9YCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gU2xhY2sncyBpcyAtMTgwMDAgd2hpY2ggdHJhbnNsYXRlcyB0byBSb2NrZXQuQ2hhdCdzIGFmdGVyIGRpdmlkaW5nIGJ5IDM2MDBcblx0XHRcdFx0XHRcdFx0XHRpZiAodXNlci50el9vZmZzZXQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdE1ldGVvci5jYWxsKCd1c2VyU2V0VXRjT2Zmc2V0JywgdXNlci50el9vZmZzZXQgLyAzNjAwKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnVwZGF0ZSh7IF9pZDogdXNlcklkIH0sIHsgJGFkZFRvU2V0OiB7IGltcG9ydElkczogdXNlci5pZCB9IH0pO1xuXG5cdFx0XHRcdFx0XHRcdGlmICh1c2VyLnByb2ZpbGUucmVhbF9uYW1lKSB7XG5cdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuc2V0TmFtZSh1c2VySWQsIHVzZXIucHJvZmlsZS5yZWFsX25hbWUpO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0Ly8gRGVsZXRlZCB1c2VycyBhcmUgJ2luYWN0aXZlJyB1c2VycyBpbiBSb2NrZXQuQ2hhdFxuXHRcdFx0XHRcdFx0XHRpZiAodXNlci5kZWxldGVkKSB7XG5cdFx0XHRcdFx0XHRcdFx0TWV0ZW9yLmNhbGwoJ3NldFVzZXJBY3RpdmVTdGF0dXMnLCB1c2VySWQsIGZhbHNlKTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdHVzZXIucm9ja2V0SWQgPSB1c2VySWQ7XG5cdFx0XHRcdFx0XHRcdHRoaXMudXNlclRhZ3MucHVzaCh7XG5cdFx0XHRcdFx0XHRcdFx0c2xhY2s6IGA8QCR7IHVzZXIuaWQgfT5gLFxuXHRcdFx0XHRcdFx0XHRcdHNsYWNrTG9uZzogYDxAJHsgdXNlci5pZCB9fCR7IHVzZXIubmFtZSB9PmAsXG5cdFx0XHRcdFx0XHRcdFx0cm9ja2V0OiBgQCR7IHVzZXIubmFtZSB9YCxcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHRoaXMuYWRkQ291bnRDb21wbGV0ZWQoMSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHR0aGlzLmNvbGxlY3Rpb24udXBkYXRlKHsgX2lkOiB0aGlzLnVzZXJzLl9pZCB9LCB7ICRzZXQ6IHsgdXNlcnM6IHRoaXMudXNlcnMudXNlcnMgfSB9KTtcblxuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuSU1QT1JUSU5HX0NIQU5ORUxTKTtcblx0XHRcdFx0dGhpcy5jaGFubmVscy5jaGFubmVscy5mb3JFYWNoKChjaGFubmVsKSA9PiB7XG5cdFx0XHRcdFx0aWYgKCFjaGFubmVsLmRvX2ltcG9ydCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIgKHN0YXJ0ZWRCeVVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc3QgZXhpc3RhbnRSb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5TmFtZShjaGFubmVsLm5hbWUpO1xuXHRcdFx0XHRcdFx0aWYgKGV4aXN0YW50Um9vbSB8fCBjaGFubmVsLmlzX2dlbmVyYWwpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGNoYW5uZWwuaXNfZ2VuZXJhbCAmJiBleGlzdGFudFJvb20gJiYgY2hhbm5lbC5uYW1lICE9PSBleGlzdGFudFJvb20ubmFtZSkge1xuXHRcdFx0XHRcdFx0XHRcdE1ldGVvci5jYWxsKCdzYXZlUm9vbVNldHRpbmdzJywgJ0dFTkVSQUwnLCAncm9vbU5hbWUnLCBjaGFubmVsLm5hbWUpO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0Y2hhbm5lbC5yb2NrZXRJZCA9IGNoYW5uZWwuaXNfZ2VuZXJhbCA/ICdHRU5FUkFMJyA6IGV4aXN0YW50Um9vbS5faWQ7XG5cdFx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZSh7IF9pZDogY2hhbm5lbC5yb2NrZXRJZCB9LCB7ICRhZGRUb1NldDogeyBpbXBvcnRJZHM6IGNoYW5uZWwuaWQgfSB9KTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHVzZXJzID0gY2hhbm5lbC5tZW1iZXJzXG5cdFx0XHRcdFx0XHRcdFx0LnJlZHVjZSgocmV0LCBtZW1iZXIpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChtZW1iZXIgIT09IGNoYW5uZWwuY3JlYXRvcikge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCB1c2VyID0gdGhpcy5nZXRSb2NrZXRVc2VyKG1lbWJlcik7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmICh1c2VyICYmIHVzZXIudXNlcm5hbWUpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZXQucHVzaCh1c2VyLnVzZXJuYW1lKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHJldDtcblx0XHRcdFx0XHRcdFx0XHR9LCBbXSk7XG5cdFx0XHRcdFx0XHRcdGxldCB1c2VySWQgPSBzdGFydGVkQnlVc2VySWQ7XG5cdFx0XHRcdFx0XHRcdHRoaXMudXNlcnMudXNlcnMuZm9yRWFjaCgodXNlcikgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGlmICh1c2VyLmlkID09PSBjaGFubmVsLmNyZWF0b3IgJiYgdXNlci5kb19pbXBvcnQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHVzZXJJZCA9IHVzZXIucm9ja2V0SWQ7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih1c2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCByZXR1cm5lZCA9IE1ldGVvci5jYWxsKCdjcmVhdGVDaGFubmVsJywgY2hhbm5lbC5uYW1lLCB1c2Vycyk7XG5cdFx0XHRcdFx0XHRcdFx0Y2hhbm5lbC5yb2NrZXRJZCA9IHJldHVybmVkLnJpZDtcblx0XHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdFx0Ly8gQFRPRE8gaW1wbGVtZW50IG1vZGVsIHNwZWNpZmljIGZ1bmN0aW9uXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJvb21VcGRhdGUgPSB7XG5cdFx0XHRcdFx0XHRcdFx0dHM6IG5ldyBEYXRlKGNoYW5uZWwuY3JlYXRlZCAqIDEwMDApLFxuXHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRpZiAoIV8uaXNFbXB0eShjaGFubmVsLnRvcGljICYmIGNoYW5uZWwudG9waWMudmFsdWUpKSB7XG5cdFx0XHRcdFx0XHRcdFx0cm9vbVVwZGF0ZS50b3BpYyA9IGNoYW5uZWwudG9waWMudmFsdWU7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0aWYgKCFfLmlzRW1wdHkoY2hhbm5lbC5wdXJwb3NlICYmIGNoYW5uZWwucHVycG9zZS52YWx1ZSkpIHtcblx0XHRcdFx0XHRcdFx0XHRyb29tVXBkYXRlLmRlc2NyaXB0aW9uID0gY2hhbm5lbC5wdXJwb3NlLnZhbHVlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZSh7IF9pZDogY2hhbm5lbC5yb2NrZXRJZCB9LCB7ICRzZXQ6IHJvb21VcGRhdGUsICRhZGRUb1NldDogeyBpbXBvcnRJZHM6IGNoYW5uZWwuaWQgfSB9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRoaXMuYWRkQ291bnRDb21wbGV0ZWQoMSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHR0aGlzLmNvbGxlY3Rpb24udXBkYXRlKHsgX2lkOiB0aGlzLmNoYW5uZWxzLl9pZCB9LCB7ICRzZXQ6IHsgY2hhbm5lbHM6IHRoaXMuY2hhbm5lbHMuY2hhbm5lbHMgfSB9KTtcblxuXHRcdFx0XHRjb25zdCBtaXNzZWRUeXBlcyA9IHt9O1xuXHRcdFx0XHRjb25zdCBpZ25vcmVUeXBlcyA9IHsgYm90X2FkZDogdHJ1ZSwgZmlsZV9jb21tZW50OiB0cnVlLCBmaWxlX21lbnRpb246IHRydWUgfTtcblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLklNUE9SVElOR19NRVNTQUdFUyk7XG5cdFx0XHRcdE9iamVjdC5rZXlzKHRoaXMubWVzc2FnZXMpLmZvckVhY2goKGNoYW5uZWwpID0+IHtcblx0XHRcdFx0XHRjb25zdCBtZXNzYWdlc09iaiA9IHRoaXMubWVzc2FnZXNbY2hhbm5lbF07XG5cblx0XHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKHN0YXJ0ZWRCeVVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc3Qgc2xhY2tDaGFubmVsID0gdGhpcy5nZXRTbGFja0NoYW5uZWxGcm9tTmFtZShjaGFubmVsKTtcblx0XHRcdFx0XHRcdGlmICghc2xhY2tDaGFubmVsIHx8ICFzbGFja0NoYW5uZWwuZG9faW1wb3J0KSB7IHJldHVybjsgfVxuXHRcdFx0XHRcdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHNsYWNrQ2hhbm5lbC5yb2NrZXRJZCwgeyBmaWVsZHM6IHsgdXNlcm5hbWVzOiAxLCB0OiAxLCBuYW1lOiAxIH0gfSk7XG5cdFx0XHRcdFx0XHRPYmplY3Qua2V5cyhtZXNzYWdlc09iaikuZm9yRWFjaCgoZGF0ZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBtc2dzID0gbWVzc2FnZXNPYmpbZGF0ZV07XG5cdFx0XHRcdFx0XHRcdG1zZ3MubWVzc2FnZXMuZm9yRWFjaCgobWVzc2FnZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMudXBkYXRlUmVjb3JkKHsgbWVzc2FnZXNzdGF0dXM6IGAkeyBjaGFubmVsIH0vJHsgZGF0ZSB9LiR7IG1zZ3MubWVzc2FnZXMubGVuZ3RoIH1gIH0pO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IG1zZ0RhdGFEZWZhdWx0cyA9IHtcblx0XHRcdFx0XHRcdFx0XHRcdF9pZDogYHNsYWNrLSR7IHNsYWNrQ2hhbm5lbC5pZCB9LSR7IG1lc3NhZ2UudHMucmVwbGFjZSgvXFwuL2csICctJykgfWAsXG5cdFx0XHRcdFx0XHRcdFx0XHR0czogbmV3IERhdGUocGFyc2VJbnQobWVzc2FnZS50cy5zcGxpdCgnLicpWzBdKSAqIDEwMDApLFxuXHRcdFx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdFx0XHQvLyBQcm9jZXNzIHRoZSByZWFjdGlvbnNcblx0XHRcdFx0XHRcdFx0XHRpZiAobWVzc2FnZS5yZWFjdGlvbnMgJiYgbWVzc2FnZS5yZWFjdGlvbnMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0bXNnRGF0YURlZmF1bHRzLnJlYWN0aW9ucyA9IHt9O1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRtZXNzYWdlLnJlYWN0aW9ucy5mb3JFYWNoKChyZWFjdGlvbikgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZWFjdGlvbi5uYW1lID0gYDokeyByZWFjdGlvbi5uYW1lIH06YDtcblx0XHRcdFx0XHRcdFx0XHRcdFx0bXNnRGF0YURlZmF1bHRzLnJlYWN0aW9uc1tyZWFjdGlvbi5uYW1lXSA9IHsgdXNlcm5hbWVzOiBbXSB9O1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJlYWN0aW9uLnVzZXJzLmZvckVhY2goKHUpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCByY1VzZXIgPSB0aGlzLmdldFJvY2tldFVzZXIodSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKCFyY1VzZXIpIHsgcmV0dXJuOyB9XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRtc2dEYXRhRGVmYXVsdHMucmVhY3Rpb25zW3JlYWN0aW9uLm5hbWVdLnVzZXJuYW1lcy5wdXNoKHJjVXNlci51c2VybmFtZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChtc2dEYXRhRGVmYXVsdHMucmVhY3Rpb25zW3JlYWN0aW9uLm5hbWVdLnVzZXJuYW1lcy5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWxldGUgbXNnRGF0YURlZmF1bHRzLnJlYWN0aW9uc1tyZWFjdGlvbi5uYW1lXTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKG1lc3NhZ2UudHlwZSA9PT0gJ21lc3NhZ2UnKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAobWVzc2FnZS5zdWJ0eXBlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChtZXNzYWdlLnN1YnR5cGUgPT09ICdjaGFubmVsX2pvaW4nKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuZ2V0Um9ja2V0VXNlcihtZXNzYWdlLnVzZXIpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVVc2VySm9pbldpdGhSb29tSWRBbmRVc2VyKHJvb20uX2lkLCB0aGlzLmdldFJvY2tldFVzZXIobWVzc2FnZS51c2VyKSwgbXNnRGF0YURlZmF1bHRzKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAobWVzc2FnZS5zdWJ0eXBlID09PSAnY2hhbm5lbF9sZWF2ZScpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5nZXRSb2NrZXRVc2VyKG1lc3NhZ2UudXNlcikpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVVzZXJMZWF2ZVdpdGhSb29tSWRBbmRVc2VyKHJvb20uX2lkLCB0aGlzLmdldFJvY2tldFVzZXIobWVzc2FnZS51c2VyKSwgbXNnRGF0YURlZmF1bHRzKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAobWVzc2FnZS5zdWJ0eXBlID09PSAnbWVfbWVzc2FnZScpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBtc2dPYmogPSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuLi5tc2dEYXRhRGVmYXVsdHMsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRtc2c6IGBfJHsgdGhpcy5jb252ZXJ0U2xhY2tNZXNzYWdlVG9Sb2NrZXRDaGF0KG1lc3NhZ2UudGV4dCkgfV9gLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5zZW5kTWVzc2FnZSh0aGlzLmdldFJvY2tldFVzZXIobWVzc2FnZS51c2VyKSwgbXNnT2JqLCByb29tLCB0cnVlKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChtZXNzYWdlLnN1YnR5cGUgPT09ICdib3RfbWVzc2FnZScgfHwgbWVzc2FnZS5zdWJ0eXBlID09PSAnc2xhY2tib3RfcmVzcG9uc2UnKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgYm90VXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKCdyb2NrZXQuY2F0JywgeyBmaWVsZHM6IHsgdXNlcm5hbWU6IDEgfSB9KTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBib3RVc2VybmFtZSA9IHRoaXMuYm90c1ttZXNzYWdlLmJvdF9pZF0gPyB0aGlzLmJvdHNbbWVzc2FnZS5ib3RfaWRdLm5hbWUgOiBtZXNzYWdlLnVzZXJuYW1lO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IG1zZ09iaiA9IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC4uLm1zZ0RhdGFEZWZhdWx0cyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdG1zZzogdGhpcy5jb252ZXJ0U2xhY2tNZXNzYWdlVG9Sb2NrZXRDaGF0KG1lc3NhZ2UudGV4dCksXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyaWQ6IHJvb20uX2lkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ym90OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0YXR0YWNobWVudHM6IG1lc3NhZ2UuYXR0YWNobWVudHMsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR1c2VybmFtZTogYm90VXNlcm5hbWUgfHwgdW5kZWZpbmVkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAobWVzc2FnZS5lZGl0ZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdG1zZ09iai5lZGl0ZWRBdCA9IG5ldyBEYXRlKHBhcnNlSW50KG1lc3NhZ2UuZWRpdGVkLnRzLnNwbGl0KCcuJylbMF0pICogMTAwMCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBlZGl0ZWRCeSA9IHRoaXMuZ2V0Um9ja2V0VXNlcihtZXNzYWdlLmVkaXRlZC51c2VyKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChlZGl0ZWRCeSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRtc2dPYmouZWRpdGVkQnkgPSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0X2lkOiBlZGl0ZWRCeS5faWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dXNlcm5hbWU6IGVkaXRlZEJ5LnVzZXJuYW1lLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChtZXNzYWdlLmljb25zKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRtc2dPYmouZW1vamkgPSBtZXNzYWdlLmljb25zLmVtb2ppO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNlbmRNZXNzYWdlKGJvdFVzZXIsIG1zZ09iaiwgcm9vbSwgdHJ1ZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAobWVzc2FnZS5zdWJ0eXBlID09PSAnY2hhbm5lbF9wdXJwb3NlJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmICh0aGlzLmdldFJvY2tldFVzZXIobWVzc2FnZS51c2VyKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlUm9vbVNldHRpbmdzQ2hhbmdlZFdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIoJ3Jvb21fY2hhbmdlZF9kZXNjcmlwdGlvbicsIHJvb20uX2lkLCBtZXNzYWdlLnB1cnBvc2UsIHRoaXMuZ2V0Um9ja2V0VXNlcihtZXNzYWdlLnVzZXIpLCBtc2dEYXRhRGVmYXVsdHMpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChtZXNzYWdlLnN1YnR5cGUgPT09ICdjaGFubmVsX3RvcGljJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmICh0aGlzLmdldFJvY2tldFVzZXIobWVzc2FnZS51c2VyKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlUm9vbVNldHRpbmdzQ2hhbmdlZFdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIoJ3Jvb21fY2hhbmdlZF90b3BpYycsIHJvb20uX2lkLCBtZXNzYWdlLnRvcGljLCB0aGlzLmdldFJvY2tldFVzZXIobWVzc2FnZS51c2VyKSwgbXNnRGF0YURlZmF1bHRzKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAobWVzc2FnZS5zdWJ0eXBlID09PSAnY2hhbm5lbF9uYW1lJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmICh0aGlzLmdldFJvY2tldFVzZXIobWVzc2FnZS51c2VyKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlUm9vbVJlbmFtZWRXaXRoUm9vbUlkUm9vbU5hbWVBbmRVc2VyKHJvb20uX2lkLCBtZXNzYWdlLm5hbWUsIHRoaXMuZ2V0Um9ja2V0VXNlcihtZXNzYWdlLnVzZXIpLCBtc2dEYXRhRGVmYXVsdHMpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChtZXNzYWdlLnN1YnR5cGUgPT09ICdwaW5uZWRfaXRlbScpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAobWVzc2FnZS5hdHRhY2htZW50cykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgbXNnT2JqID0ge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuLi5tc2dEYXRhRGVmYXVsdHMsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGF0dGFjaG1lbnRzOiBbe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRleHQ6IHRoaXMuY29udmVydFNsYWNrTWVzc2FnZVRvUm9ja2V0Q2hhdChtZXNzYWdlLmF0dGFjaG1lbnRzWzBdLnRleHQpLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGF1dGhvcl9uYW1lIDogbWVzc2FnZS5hdHRhY2htZW50c1swXS5hdXRob3Jfc3VibmFtZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRhdXRob3JfaWNvbiA6IGdldEF2YXRhclVybEZyb21Vc2VybmFtZShtZXNzYWdlLmF0dGFjaG1lbnRzWzBdLmF1dGhvcl9zdWJuYW1lKSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fV0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlcignbWVzc2FnZV9waW5uZWQnLCByb29tLl9pZCwgJycsIHRoaXMuZ2V0Um9ja2V0VXNlcihtZXNzYWdlLnVzZXIpLCBtc2dPYmopO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBUT0RPOiBtYWtlIHRoaXMgYmV0dGVyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnUGlubmVkIGl0ZW0gd2l0aCBubyBhdHRhY2htZW50LCBuZWVkcyB3b3JrLicpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlV2l0aFR5cGVSb29tSWRNZXNzYWdlQW5kVXNlciAnbWVzc2FnZV9waW5uZWQnLCByb29tLl9pZCwgJycsIEBnZXRSb2NrZXRVc2VyKG1lc3NhZ2UudXNlciksIG1zZ0RhdGFEZWZhdWx0c1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChtZXNzYWdlLnN1YnR5cGUgPT09ICdmaWxlX3NoYXJlJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChtZXNzYWdlLmZpbGUgJiYgbWVzc2FnZS5maWxlLnVybF9wcml2YXRlX2Rvd25sb2FkICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IGRldGFpbHMgPSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdG1lc3NhZ2VfaWQ6IGBzbGFjay0keyBtZXNzYWdlLnRzLnJlcGxhY2UoL1xcLi9nLCAnLScpIH1gLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRuYW1lOiBtZXNzYWdlLmZpbGUubmFtZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c2l6ZTogbWVzc2FnZS5maWxlLnNpemUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6IG1lc3NhZ2UuZmlsZS5taW1ldHlwZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmlkOiByb29tLl9pZCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnVwbG9hZEZpbGUoZGV0YWlscywgbWVzc2FnZS5maWxlLnVybF9wcml2YXRlX2Rvd25sb2FkLCB0aGlzLmdldFJvY2tldFVzZXIobWVzc2FnZS51c2VyKSwgcm9vbSwgbmV3IERhdGUocGFyc2VJbnQobWVzc2FnZS50cy5zcGxpdCgnLicpWzBdKSAqIDEwMDApKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIW1pc3NlZFR5cGVzW21lc3NhZ2Uuc3VidHlwZV0gJiYgIWlnbm9yZVR5cGVzW21lc3NhZ2Uuc3VidHlwZV0pIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRtaXNzZWRUeXBlc1ttZXNzYWdlLnN1YnR5cGVdID0gbWVzc2FnZTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0Um9ja2V0VXNlcihtZXNzYWdlLnVzZXIpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAodXNlcikge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IG1zZ09iaiA9IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC4uLm1zZ0RhdGFEZWZhdWx0cyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdG1zZzogdGhpcy5jb252ZXJ0U2xhY2tNZXNzYWdlVG9Sb2NrZXRDaGF0KG1lc3NhZ2UudGV4dCksXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyaWQ6IHJvb20uX2lkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dToge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRfaWQ6IHVzZXIuX2lkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR1c2VybmFtZTogdXNlci51c2VybmFtZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChtZXNzYWdlLmVkaXRlZCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0bXNnT2JqLmVkaXRlZEF0ID0gbmV3IERhdGUocGFyc2VJbnQobWVzc2FnZS5lZGl0ZWQudHMuc3BsaXQoJy4nKVswXSkgKiAxMDAwKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IGVkaXRlZEJ5ID0gdGhpcy5nZXRSb2NrZXRVc2VyKG1lc3NhZ2UuZWRpdGVkLnVzZXIpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKGVkaXRlZEJ5KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdG1zZ09iai5lZGl0ZWRCeSA9IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRfaWQ6IGVkaXRlZEJ5Ll9pZCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR1c2VybmFtZTogZWRpdGVkQnkudXNlcm5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFJvY2tldENoYXQuc2VuZE1lc3NhZ2UodGhpcy5nZXRSb2NrZXRVc2VyKG1lc3NhZ2UudXNlciksIG1zZ09iaiwgcm9vbSwgdHJ1ZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5sb2dnZXIud2FybihgRmFpbGVkIHRvIGltcG9ydCB0aGUgbWVzc2FnZTogJHsgbXNnRGF0YURlZmF1bHRzLl9pZCB9YCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5hZGRDb3VudENvbXBsZXRlZCgxKTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0aWYgKCFfLmlzRW1wdHkobWlzc2VkVHlwZXMpKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ01pc3NlZCBpbXBvcnQgdHlwZXM6JywgbWlzc2VkVHlwZXMpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLkZJTklTSElORyk7XG5cblx0XHRcdFx0dGhpcy5jaGFubmVscy5jaGFubmVscy5mb3JFYWNoKChjaGFubmVsKSA9PiB7XG5cdFx0XHRcdFx0aWYgKGNoYW5uZWwuZG9faW1wb3J0ICYmIGNoYW5uZWwuaXNfYXJjaGl2ZWQpIHtcblx0XHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIoc3RhcnRlZEJ5VXNlcklkLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0TWV0ZW9yLmNhbGwoJ2FyY2hpdmVSb29tJywgY2hhbm5lbC5yb2NrZXRJZCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuRE9ORSk7XG5cblx0XHRcdFx0dGhpcy5sb2dnZXIubG9nKGBJbXBvcnQgdG9vayAkeyBEYXRlLm5vdygpIC0gc3RhcnQgfSBtaWxsaXNlY29uZHMuYCk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKGUpO1xuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuRVJST1IpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRoaXMuZ2V0UHJvZ3Jlc3MoKTtcblx0fVxuXG5cdGdldFNsYWNrQ2hhbm5lbEZyb21OYW1lKGNoYW5uZWxOYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMuY2hhbm5lbHMuY2hhbm5lbHMuZmluZCgoY2hhbm5lbCkgPT4gY2hhbm5lbC5uYW1lID09PSBjaGFubmVsTmFtZSk7XG5cdH1cblxuXHRnZXRSb2NrZXRVc2VyKHNsYWNrSWQpIHtcblx0XHRjb25zdCB1c2VyID0gdGhpcy51c2Vycy51c2Vycy5maW5kKCh1c2VyKSA9PiB1c2VyLmlkID09PSBzbGFja0lkKTtcblxuXHRcdGlmICh1c2VyKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodXNlci5yb2NrZXRJZCwgeyBmaWVsZHM6IHsgdXNlcm5hbWU6IDEsIG5hbWU6IDEgfSB9KTtcblx0XHR9XG5cdH1cblxuXHRjb252ZXJ0U2xhY2tNZXNzYWdlVG9Sb2NrZXRDaGF0KG1lc3NhZ2UpIHtcblx0XHRpZiAobWVzc2FnZSkge1xuXHRcdFx0bWVzc2FnZSA9IG1lc3NhZ2UucmVwbGFjZSgvPCFldmVyeW9uZT4vZywgJ0BhbGwnKTtcblx0XHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnJlcGxhY2UoLzwhY2hhbm5lbD4vZywgJ0BhbGwnKTtcblx0XHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnJlcGxhY2UoLzwhaGVyZT4vZywgJ0BoZXJlJyk7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS5yZXBsYWNlKC8mZ3Q7L2csICc+Jyk7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS5yZXBsYWNlKC8mbHQ7L2csICc8Jyk7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS5yZXBsYWNlKC8mYW1wOy9nLCAnJicpO1xuXHRcdFx0bWVzc2FnZSA9IG1lc3NhZ2UucmVwbGFjZSgvOnNpbXBsZV9zbWlsZTovZywgJzpzbWlsZTonKTtcblx0XHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnJlcGxhY2UoLzptZW1vOi9nLCAnOnBlbmNpbDonKTtcblx0XHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnJlcGxhY2UoLzpwaWdneTovZywgJzpwaWc6Jyk7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS5yZXBsYWNlKC86dWs6L2csICc6Z2I6Jyk7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS5yZXBsYWNlKC88KGh0dHBbc10/OltePl0qKT4vZywgJyQxJyk7XG5cblx0XHRcdGZvciAoY29uc3QgdXNlclJlcGxhY2Ugb2YgQXJyYXkuZnJvbSh0aGlzLnVzZXJUYWdzKSkge1xuXHRcdFx0XHRtZXNzYWdlID0gbWVzc2FnZS5yZXBsYWNlKHVzZXJSZXBsYWNlLnNsYWNrLCB1c2VyUmVwbGFjZS5yb2NrZXQpO1xuXHRcdFx0XHRtZXNzYWdlID0gbWVzc2FnZS5yZXBsYWNlKHVzZXJSZXBsYWNlLnNsYWNrTG9uZywgdXNlclJlcGxhY2Uucm9ja2V0KTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0bWVzc2FnZSA9ICcnO1xuXHRcdH1cblxuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0Z2V0U2VsZWN0aW9uKCkge1xuXHRcdGNvbnN0IHNlbGVjdGlvblVzZXJzID0gdGhpcy51c2Vycy51c2Vycy5tYXAoKHVzZXIpID0+IG5ldyBTZWxlY3Rpb25Vc2VyKHVzZXIuaWQsIHVzZXIubmFtZSwgdXNlci5wcm9maWxlLmVtYWlsLCB1c2VyLmRlbGV0ZWQsIHVzZXIuaXNfYm90LCAhdXNlci5pc19ib3QpKTtcblx0XHRjb25zdCBzZWxlY3Rpb25DaGFubmVscyA9IHRoaXMuY2hhbm5lbHMuY2hhbm5lbHMubWFwKChjaGFubmVsKSA9PiBuZXcgU2VsZWN0aW9uQ2hhbm5lbChjaGFubmVsLmlkLCBjaGFubmVsLm5hbWUsIGNoYW5uZWwuaXNfYXJjaGl2ZWQsIHRydWUsIGZhbHNlKSk7XG5cdFx0cmV0dXJuIG5ldyBTZWxlY3Rpb24odGhpcy5uYW1lLCBzZWxlY3Rpb25Vc2Vycywgc2VsZWN0aW9uQ2hhbm5lbHMsIHRoaXMuaW1wb3J0UmVjb3JkLmNvdW50Lm1lc3NhZ2VzKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgSW1wb3J0ZXJzIH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6aW1wb3J0ZXInO1xuaW1wb3J0IHsgU2xhY2tJbXBvcnRlckluZm8gfSBmcm9tICcuLi9pbmZvJztcbmltcG9ydCB7IFNsYWNrSW1wb3J0ZXIgfSBmcm9tICcuL2ltcG9ydGVyJztcblxuSW1wb3J0ZXJzLmFkZChuZXcgU2xhY2tJbXBvcnRlckluZm8oKSwgU2xhY2tJbXBvcnRlcik7XG4iXX0=
