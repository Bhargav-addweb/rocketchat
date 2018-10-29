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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:importer-hipchat":{"info.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_importer-hipchat/info.js                                                            //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.export({
  HipChatImporterInfo: () => HipChatImporterInfo
});
let ImporterInfo;
module.watch(require("meteor/rocketchat:importer"), {
  ImporterInfo(v) {
    ImporterInfo = v;
  }

}, 0);

class HipChatImporterInfo extends ImporterInfo {
  constructor() {
    super('hipchat', 'HipChat (zip)', 'application/zip');
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server":{"importer.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_importer-hipchat/server/importer.js                                                 //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.export({
  HipChatImporter: () => HipChatImporter
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
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 2);
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 3);
module.watch(require("moment-timezone"));

class HipChatImporter extends Base {
  constructor(info) {
    super(info);
    this.userTags = [];
    this.roomPrefix = 'hipchat_export/rooms/';
    this.usersPrefix = 'hipchat_export/users/';
  }

  prepare(dataURI, sentContentType, fileName) {
    super.prepare(dataURI, sentContentType, fileName);
    const {
      image
    } = RocketChatFile.dataURIParse(dataURI); // const contentType = ref.contentType;

    const zip = new this.AdmZip(new Buffer(image, 'base64'));
    const zipEntries = zip.getEntries();
    let tempRooms = [];
    let tempUsers = [];
    const tempMessages = {};
    zipEntries.forEach(entry => {
      if (entry.entryName.indexOf('__MACOSX') > -1) {
        this.logger.debug(`Ignoring the file: ${entry.entryName}`);
      }

      if (entry.isDirectory) {
        return;
      }

      if (entry.entryName.indexOf(this.roomPrefix) > -1) {
        let roomName = entry.entryName.split(this.roomPrefix)[1];

        if (roomName === 'list.json') {
          super.updateProgress(ProgressStep.PREPARING_CHANNELS);
          tempRooms = JSON.parse(entry.getData().toString()).rooms;
          tempRooms.forEach(room => {
            room.name = s.slugify(room.name);
          });
        } else if (roomName.indexOf('/') > -1) {
          const item = roomName.split('/');
          roomName = s.slugify(item[0]);
          const msgGroupData = item[1].split('.')[0];

          if (!tempMessages[roomName]) {
            tempMessages[roomName] = {};
          }

          try {
            return tempMessages[roomName][msgGroupData] = JSON.parse(entry.getData().toString());
          } catch (error) {
            return this.logger.warn(`${entry.entryName} is not a valid JSON file! Unable to import it.`);
          }
        }
      } else if (entry.entryName.indexOf(this.usersPrefix) > -1) {
        const usersName = entry.entryName.split(this.usersPrefix)[1];

        if (usersName === 'list.json') {
          super.updateProgress(ProgressStep.PREPARING_USERS);
          return tempUsers = JSON.parse(entry.getData().toString()).users;
        } else {
          return this.logger.warn(`Unexpected file in the ${this.name} import: ${entry.entryName}`);
        }
      }
    });
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
    this.addCountToTotal(tempUsers.length);
    const channelsId = this.collection.insert({
      import: this.importRecord._id,
      importer: this.name,
      type: 'channels',
      channels: tempRooms
    });
    this.channels = this.collection.findOne(channelsId);
    this.updateRecord({
      'count.channels': tempRooms.length
    });
    this.addCountToTotal(tempRooms.length);
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
          Base.getBSONSafeArraysFromAnArray(msgs).forEach((splitMsg, i) => {
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

    if (tempUsers.length === 0 || tempRooms.length === 0 || messagesCount === 0) {
      this.logger.warn(`The loaded users count ${tempUsers.length}, the loaded channels ${tempRooms.length}, and the loaded messages ${messagesCount}`);
      super.updateProgress(ProgressStep.ERROR);
      return this.getProgress();
    }

    const selectionUsers = tempUsers.map(function (user) {
      return new SelectionUser(user.user_id, user.name, user.email, user.is_deleted, false, !user.is_bot);
    });
    const selectionChannels = tempRooms.map(function (room) {
      return new SelectionChannel(room.room_id, room.name, room.is_archived, true, false);
    });
    const selectionMessages = this.importRecord.count.messages;
    super.updateProgress(ProgressStep.USER_SELECTION);
    return new Selection(this.name, selectionUsers, selectionChannels, selectionMessages);
  }

  startImport(importSelection) {
    super.startImport(importSelection);
    const start = Date.now();
    importSelection.users.forEach(user => {
      this.users.users.forEach(u => {
        if (u.user_id === user.user_id) {
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
    importSelection.channels.forEach(channel => this.channels.channels.forEach(c => c.room_id === channel.channel_id && (c.do_import = channel.do_import)));
    this.collection.update({
      _id: this.channels._id
    }, {
      $set: {
        channels: this.channels.channels
      }
    });
    const startedByUserId = Meteor.userId();
    Meteor.defer(() => {
      super.updateProgress(ProgressStep.IMPORTING_USERS);

      try {
        this.users.users.forEach(user => {
          if (!user.do_import) {
            return;
          }

          Meteor.runAsUser(startedByUserId, () => {
            const existantUser = RocketChat.models.Users.findOneByEmailAddress(user.email);

            if (existantUser) {
              user.rocketId = existantUser._id;
              this.userTags.push({
                hipchat: `@${user.mention_name}`,
                rocket: `@${existantUser.username}`
              });
            } else {
              const userId = Accounts.createUser({
                email: user.email,
                password: Date.now() + user.name + user.email.toUpperCase()
              });
              user.rocketId = userId;
              this.userTags.push({
                hipchat: `@${user.mention_name}`,
                rocket: `@${user.mention_name}`
              });
              Meteor.runAsUser(userId, () => {
                Meteor.call('setUsername', user.mention_name, {
                  joinDefaultChannelsSilenced: true
                });
                Meteor.call('setAvatarFromService', user.photo_url, undefined, 'url');
                return Meteor.call('userSetUtcOffset', parseInt(moment().tz(user.timezone).format('Z').toString().split(':')[0]));
              });

              if (user.name != null) {
                RocketChat.models.Users.setName(userId, user.name);
              }

              if (user.is_deleted) {
                Meteor.call('setUserActiveStatus', userId, false);
              }
            }

            return this.addCountCompleted(1);
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
            channel.name = channel.name.replace(/ /g, '');
            const existantRoom = RocketChat.models.Rooms.findOneByName(channel.name);

            if (existantRoom) {
              channel.rocketId = existantRoom._id;
            } else {
              let userId = '';
              this.users.users.forEach(user => {
                if (user.user_id === channel.owner_user_id) {
                  userId = user.rocketId;
                }
              });

              if (userId === '') {
                this.logger.warn(`Failed to find the channel creator for ${channel.name}, setting it to the current running user.`);
                userId = startedByUserId;
              }

              Meteor.runAsUser(userId, () => {
                const returned = Meteor.call('createChannel', channel.name, []);
                return channel.rocketId = returned.rid;
              });
              RocketChat.models.Rooms.update({
                _id: channel.rocketId
              }, {
                $set: {
                  ts: new Date(channel.created * 1000)
                }
              });
            }

            return this.addCountCompleted(1);
          });
        });
        this.collection.update({
          _id: this.channels._id
        }, {
          $set: {
            channels: this.channels.channels
          }
        });
        super.updateProgress(ProgressStep.IMPORTING_MESSAGES);
        const nousers = {};
        Object.keys(this.messages).forEach(channel => {
          const messagesObj = this.messages[channel];
          Meteor.runAsUser(startedByUserId, () => {
            const hipchatChannel = this.getHipChatChannelFromName(channel);

            if (hipchatChannel != null ? hipchatChannel.do_import : undefined) {
              const room = RocketChat.models.Rooms.findOneById(hipchatChannel.rocketId, {
                fields: {
                  usernames: 1,
                  t: 1,
                  name: 1
                }
              });
              Object.keys(messagesObj).forEach(date => {
                const msgs = messagesObj[date];
                this.updateRecord({
                  messagesstatus: `${channel}/${date}.${msgs.messages.length}`
                });
                msgs.messages.forEach(message => {
                  if (message.from != null) {
                    const user = this.getRocketUser(message.from.user_id);

                    if (user != null) {
                      const msgObj = {
                        msg: this.convertHipChatMessageToRocketChat(message.message),
                        ts: new Date(message.date),
                        u: {
                          _id: user._id,
                          username: user.username
                        }
                      };
                      RocketChat.sendMessage(user, msgObj, room, true);
                    } else if (!nousers[message.from.user_id]) {
                      nousers[message.from.user_id] = message.from;
                    }
                  } else if (!_.isArray(message)) {
                    console.warn('Please report the following:', message);
                  }

                  this.addCountCompleted(1);
                });
              });
            }
          });
        });
        this.logger.warn('The following did not have users:', nousers);
        super.updateProgress(ProgressStep.FINISHING);
        this.channels.channels.forEach(channel => {
          if (channel.do_import && channel.is_archived) {
            Meteor.runAsUser(startedByUserId, () => Meteor.call('archiveRoom', channel.rocketId));
          }
        });
        super.updateProgress(ProgressStep.DONE);
      } catch (e) {
        this.logger.error(e);
        super.updateProgress(ProgressStep.ERROR);
      }

      const timeTook = Date.now() - start;
      return this.logger.log(`Import took ${timeTook} milliseconds.`);
    });
    return this.getProgress();
  }

  getHipChatChannelFromName(channelName) {
    return this.channels.channels.find(channel => channel.name === channelName);
  }

  getRocketUser(hipchatId) {
    const user = this.users.users.find(user => user.user_id === hipchatId);
    return user ? RocketChat.models.Users.findOneById(user.rocketId, {
      fields: {
        username: 1,
        name: 1
      }
    }) : undefined;
  }

  convertHipChatMessageToRocketChat(message) {
    if (message != null) {
      this.userTags.forEach(userReplace => {
        message = message.replace(userReplace.hipchat, userReplace.rocket);
      });
    } else {
      message = '';
    }

    return message;
  }

  getSelection() {
    const selectionUsers = this.users.users.map(function (user) {
      return new SelectionUser(user.user_id, user.name, user.email, user.is_deleted, false, !user.is_bot);
    });
    const selectionChannels = this.channels.channels.map(function (room) {
      return new SelectionChannel(room.room_id, room.name, room.is_archived, true, false);
    });
    return new Selection(this.name, selectionUsers, selectionChannels, this.importRecord.count.messages);
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"adder.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/rocketchat_importer-hipchat/server/adder.js                                                    //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
let Importers;
module.watch(require("meteor/rocketchat:importer"), {
  Importers(v) {
    Importers = v;
  }

}, 0);
let HipChatImporterInfo;
module.watch(require("../info"), {
  HipChatImporterInfo(v) {
    HipChatImporterInfo = v;
  }

}, 1);
let HipChatImporter;
module.watch(require("./importer"), {
  HipChatImporter(v) {
    HipChatImporter = v;
  }

}, 2);
Importers.add(new HipChatImporterInfo(), HipChatImporter);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:importer-hipchat/info.js");
require("/node_modules/meteor/rocketchat:importer-hipchat/server/importer.js");
require("/node_modules/meteor/rocketchat:importer-hipchat/server/adder.js");

/* Exports */
Package._define("rocketchat:importer-hipchat");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_importer-hipchat.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci1oaXBjaGF0L2luZm8uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW1wb3J0ZXItaGlwY2hhdC9zZXJ2ZXIvaW1wb3J0ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aW1wb3J0ZXItaGlwY2hhdC9zZXJ2ZXIvYWRkZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiSGlwQ2hhdEltcG9ydGVySW5mbyIsIkltcG9ydGVySW5mbyIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJjb25zdHJ1Y3RvciIsIkhpcENoYXRJbXBvcnRlciIsIkJhc2UiLCJQcm9ncmVzc1N0ZXAiLCJTZWxlY3Rpb24iLCJTZWxlY3Rpb25DaGFubmVsIiwiU2VsZWN0aW9uVXNlciIsIl8iLCJkZWZhdWx0IiwicyIsIm1vbWVudCIsImluZm8iLCJ1c2VyVGFncyIsInJvb21QcmVmaXgiLCJ1c2Vyc1ByZWZpeCIsInByZXBhcmUiLCJkYXRhVVJJIiwic2VudENvbnRlbnRUeXBlIiwiZmlsZU5hbWUiLCJpbWFnZSIsIlJvY2tldENoYXRGaWxlIiwiZGF0YVVSSVBhcnNlIiwiemlwIiwiQWRtWmlwIiwiQnVmZmVyIiwiemlwRW50cmllcyIsImdldEVudHJpZXMiLCJ0ZW1wUm9vbXMiLCJ0ZW1wVXNlcnMiLCJ0ZW1wTWVzc2FnZXMiLCJmb3JFYWNoIiwiZW50cnkiLCJlbnRyeU5hbWUiLCJpbmRleE9mIiwibG9nZ2VyIiwiZGVidWciLCJpc0RpcmVjdG9yeSIsInJvb21OYW1lIiwic3BsaXQiLCJ1cGRhdGVQcm9ncmVzcyIsIlBSRVBBUklOR19DSEFOTkVMUyIsIkpTT04iLCJwYXJzZSIsImdldERhdGEiLCJ0b1N0cmluZyIsInJvb21zIiwicm9vbSIsIm5hbWUiLCJzbHVnaWZ5IiwiaXRlbSIsIm1zZ0dyb3VwRGF0YSIsImVycm9yIiwid2FybiIsInVzZXJzTmFtZSIsIlBSRVBBUklOR19VU0VSUyIsInVzZXJzIiwidXNlcnNJZCIsImNvbGxlY3Rpb24iLCJpbnNlcnQiLCJpbXBvcnQiLCJpbXBvcnRSZWNvcmQiLCJfaWQiLCJpbXBvcnRlciIsInR5cGUiLCJmaW5kT25lIiwidXBkYXRlUmVjb3JkIiwibGVuZ3RoIiwiYWRkQ291bnRUb1RvdGFsIiwiY2hhbm5lbHNJZCIsImNoYW5uZWxzIiwiUFJFUEFSSU5HX01FU1NBR0VTIiwibWVzc2FnZXNDb3VudCIsIk9iamVjdCIsImtleXMiLCJjaGFubmVsIiwibWVzc2FnZXNPYmoiLCJtZXNzYWdlcyIsImRhdGUiLCJtc2dzIiwibWVzc2FnZXNzdGF0dXMiLCJnZXRCU09OU2l6ZSIsImdldE1heEJTT05TaXplIiwiZ2V0QlNPTlNhZmVBcnJheXNGcm9tQW5BcnJheSIsInNwbGl0TXNnIiwiaSIsIm1lc3NhZ2VzSWQiLCJFUlJPUiIsImdldFByb2dyZXNzIiwic2VsZWN0aW9uVXNlcnMiLCJtYXAiLCJ1c2VyIiwidXNlcl9pZCIsImVtYWlsIiwiaXNfZGVsZXRlZCIsImlzX2JvdCIsInNlbGVjdGlvbkNoYW5uZWxzIiwicm9vbV9pZCIsImlzX2FyY2hpdmVkIiwic2VsZWN0aW9uTWVzc2FnZXMiLCJjb3VudCIsIlVTRVJfU0VMRUNUSU9OIiwic3RhcnRJbXBvcnQiLCJpbXBvcnRTZWxlY3Rpb24iLCJzdGFydCIsIkRhdGUiLCJub3ciLCJ1IiwiZG9faW1wb3J0IiwidXBkYXRlIiwiJHNldCIsImMiLCJjaGFubmVsX2lkIiwic3RhcnRlZEJ5VXNlcklkIiwiTWV0ZW9yIiwidXNlcklkIiwiZGVmZXIiLCJJTVBPUlRJTkdfVVNFUlMiLCJydW5Bc1VzZXIiLCJleGlzdGFudFVzZXIiLCJSb2NrZXRDaGF0IiwibW9kZWxzIiwiVXNlcnMiLCJmaW5kT25lQnlFbWFpbEFkZHJlc3MiLCJyb2NrZXRJZCIsInB1c2giLCJoaXBjaGF0IiwibWVudGlvbl9uYW1lIiwicm9ja2V0IiwidXNlcm5hbWUiLCJBY2NvdW50cyIsImNyZWF0ZVVzZXIiLCJwYXNzd29yZCIsInRvVXBwZXJDYXNlIiwiY2FsbCIsImpvaW5EZWZhdWx0Q2hhbm5lbHNTaWxlbmNlZCIsInBob3RvX3VybCIsInVuZGVmaW5lZCIsInBhcnNlSW50IiwidHoiLCJ0aW1lem9uZSIsImZvcm1hdCIsInNldE5hbWUiLCJhZGRDb3VudENvbXBsZXRlZCIsIklNUE9SVElOR19DSEFOTkVMUyIsInJlcGxhY2UiLCJleGlzdGFudFJvb20iLCJSb29tcyIsImZpbmRPbmVCeU5hbWUiLCJvd25lcl91c2VyX2lkIiwicmV0dXJuZWQiLCJyaWQiLCJ0cyIsImNyZWF0ZWQiLCJJTVBPUlRJTkdfTUVTU0FHRVMiLCJub3VzZXJzIiwiaGlwY2hhdENoYW5uZWwiLCJnZXRIaXBDaGF0Q2hhbm5lbEZyb21OYW1lIiwiZmluZE9uZUJ5SWQiLCJmaWVsZHMiLCJ1c2VybmFtZXMiLCJ0IiwibWVzc2FnZSIsImZyb20iLCJnZXRSb2NrZXRVc2VyIiwibXNnT2JqIiwibXNnIiwiY29udmVydEhpcENoYXRNZXNzYWdlVG9Sb2NrZXRDaGF0Iiwic2VuZE1lc3NhZ2UiLCJpc0FycmF5IiwiY29uc29sZSIsIkZJTklTSElORyIsIkRPTkUiLCJlIiwidGltZVRvb2siLCJsb2ciLCJjaGFubmVsTmFtZSIsImZpbmQiLCJoaXBjaGF0SWQiLCJ1c2VyUmVwbGFjZSIsImdldFNlbGVjdGlvbiIsIkltcG9ydGVycyIsImFkZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxPQUFPQyxNQUFQLENBQWM7QUFBQ0MsdUJBQW9CLE1BQUlBO0FBQXpCLENBQWQ7QUFBNkQsSUFBSUMsWUFBSjtBQUFpQkgsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLDRCQUFSLENBQWIsRUFBbUQ7QUFBQ0YsZUFBYUcsQ0FBYixFQUFlO0FBQUNILG1CQUFhRyxDQUFiO0FBQWU7O0FBQWhDLENBQW5ELEVBQXFGLENBQXJGOztBQUV2RSxNQUFNSixtQkFBTixTQUFrQ0MsWUFB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LG1CQUFKLEVBQWQsRUFBeUNNLGVBQXpDLEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfaW1wb3J0ZXItaGlwY2hhdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEltcG9ydGVySW5mbyB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmltcG9ydGVyJztcblxuZXhwb3J0IGNsYXNzIEhpcENoYXRJbXBvcnRlckluZm8gZXh0ZW5kcyBJbXBvcnRlckluZm8ge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignaGlwY2hhdCcsICdIaXBDaGF0ICh6aXApJywgJ2FwcGxpY2F0aW9uL3ppcCcpO1xuXHR9XG59XG4iLCJpbXBvcnQge1xuXHRCYXNlLFxuXHRQcm9ncmVzc1N0ZXAsXG5cdFNlbGVjdGlvbixcblx0U2VsZWN0aW9uQ2hhbm5lbCxcblx0U2VsZWN0aW9uVXNlcixcbn0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6aW1wb3J0ZXInO1xuXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50JztcblxuaW1wb3J0ICdtb21lbnQtdGltZXpvbmUnO1xuXG5leHBvcnQgY2xhc3MgSGlwQ2hhdEltcG9ydGVyIGV4dGVuZHMgQmFzZSB7XG5cdGNvbnN0cnVjdG9yKGluZm8pIHtcblx0XHRzdXBlcihpbmZvKTtcblxuXHRcdHRoaXMudXNlclRhZ3MgPSBbXTtcblx0XHR0aGlzLnJvb21QcmVmaXggPSAnaGlwY2hhdF9leHBvcnQvcm9vbXMvJztcblx0XHR0aGlzLnVzZXJzUHJlZml4ID0gJ2hpcGNoYXRfZXhwb3J0L3VzZXJzLyc7XG5cdH1cblxuXHRwcmVwYXJlKGRhdGFVUkksIHNlbnRDb250ZW50VHlwZSwgZmlsZU5hbWUpIHtcblx0XHRzdXBlci5wcmVwYXJlKGRhdGFVUkksIHNlbnRDb250ZW50VHlwZSwgZmlsZU5hbWUpO1xuXHRcdGNvbnN0IHsgaW1hZ2UgfSA9IFJvY2tldENoYXRGaWxlLmRhdGFVUklQYXJzZShkYXRhVVJJKTtcblx0XHQvLyBjb25zdCBjb250ZW50VHlwZSA9IHJlZi5jb250ZW50VHlwZTtcblx0XHRjb25zdCB6aXAgPSBuZXcgdGhpcy5BZG1aaXAobmV3IEJ1ZmZlcihpbWFnZSwgJ2Jhc2U2NCcpKTtcblx0XHRjb25zdCB6aXBFbnRyaWVzID0gemlwLmdldEVudHJpZXMoKTtcblx0XHRsZXQgdGVtcFJvb21zID0gW107XG5cdFx0bGV0IHRlbXBVc2VycyA9IFtdO1xuXHRcdGNvbnN0IHRlbXBNZXNzYWdlcyA9IHt9O1xuXG5cdFx0emlwRW50cmllcy5mb3JFYWNoKChlbnRyeSkgPT4ge1xuXHRcdFx0aWYgKGVudHJ5LmVudHJ5TmFtZS5pbmRleE9mKCdfX01BQ09TWCcpID4gLTEpIHtcblx0XHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoYElnbm9yaW5nIHRoZSBmaWxlOiAkeyBlbnRyeS5lbnRyeU5hbWUgfWApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGVudHJ5LmlzRGlyZWN0b3J5KSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGlmIChlbnRyeS5lbnRyeU5hbWUuaW5kZXhPZih0aGlzLnJvb21QcmVmaXgpID4gLTEpIHtcblx0XHRcdFx0bGV0IHJvb21OYW1lID0gZW50cnkuZW50cnlOYW1lLnNwbGl0KHRoaXMucm9vbVByZWZpeClbMV07XG5cdFx0XHRcdGlmIChyb29tTmFtZSA9PT0gJ2xpc3QuanNvbicpIHtcblx0XHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuUFJFUEFSSU5HX0NIQU5ORUxTKTtcblx0XHRcdFx0XHR0ZW1wUm9vbXMgPSBKU09OLnBhcnNlKGVudHJ5LmdldERhdGEoKS50b1N0cmluZygpKS5yb29tcztcblx0XHRcdFx0XHR0ZW1wUm9vbXMuZm9yRWFjaCgocm9vbSkgPT4ge1xuXHRcdFx0XHRcdFx0cm9vbS5uYW1lID0gcy5zbHVnaWZ5KHJvb20ubmFtZSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSBpZiAocm9vbU5hbWUuaW5kZXhPZignLycpID4gLTEpIHtcblx0XHRcdFx0XHRjb25zdCBpdGVtID0gcm9vbU5hbWUuc3BsaXQoJy8nKTtcblx0XHRcdFx0XHRyb29tTmFtZSA9IHMuc2x1Z2lmeShpdGVtWzBdKTtcblx0XHRcdFx0XHRjb25zdCBtc2dHcm91cERhdGEgPSBpdGVtWzFdLnNwbGl0KCcuJylbMF07XG5cdFx0XHRcdFx0aWYgKCF0ZW1wTWVzc2FnZXNbcm9vbU5hbWVdKSB7XG5cdFx0XHRcdFx0XHR0ZW1wTWVzc2FnZXNbcm9vbU5hbWVdID0ge307XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGVtcE1lc3NhZ2VzW3Jvb21OYW1lXVttc2dHcm91cERhdGFdID0gSlNPTi5wYXJzZShlbnRyeS5nZXREYXRhKCkudG9TdHJpbmcoKSk7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmxvZ2dlci53YXJuKGAkeyBlbnRyeS5lbnRyeU5hbWUgfSBpcyBub3QgYSB2YWxpZCBKU09OIGZpbGUhIFVuYWJsZSB0byBpbXBvcnQgaXQuYCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKGVudHJ5LmVudHJ5TmFtZS5pbmRleE9mKHRoaXMudXNlcnNQcmVmaXgpID4gLTEpIHtcblx0XHRcdFx0Y29uc3QgdXNlcnNOYW1lID0gZW50cnkuZW50cnlOYW1lLnNwbGl0KHRoaXMudXNlcnNQcmVmaXgpWzFdO1xuXHRcdFx0XHRpZiAodXNlcnNOYW1lID09PSAnbGlzdC5qc29uJykge1xuXHRcdFx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5QUkVQQVJJTkdfVVNFUlMpO1xuXHRcdFx0XHRcdHJldHVybiB0ZW1wVXNlcnMgPSBKU09OLnBhcnNlKGVudHJ5LmdldERhdGEoKS50b1N0cmluZygpKS51c2Vycztcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5sb2dnZXIud2FybihgVW5leHBlY3RlZCBmaWxlIGluIHRoZSAkeyB0aGlzLm5hbWUgfSBpbXBvcnQ6ICR7IGVudHJ5LmVudHJ5TmFtZSB9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0XHRjb25zdCB1c2Vyc0lkID0gdGhpcy5jb2xsZWN0aW9uLmluc2VydCh7XG5cdFx0XHRpbXBvcnQ6IHRoaXMuaW1wb3J0UmVjb3JkLl9pZCxcblx0XHRcdGltcG9ydGVyOiB0aGlzLm5hbWUsXG5cdFx0XHR0eXBlOiAndXNlcnMnLFxuXHRcdFx0dXNlcnM6IHRlbXBVc2Vycyxcblx0XHR9KTtcblx0XHR0aGlzLnVzZXJzID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUodXNlcnNJZCk7XG5cdFx0dGhpcy51cGRhdGVSZWNvcmQoe1xuXHRcdFx0J2NvdW50LnVzZXJzJzogdGVtcFVzZXJzLmxlbmd0aCxcblx0XHR9KTtcblx0XHR0aGlzLmFkZENvdW50VG9Ub3RhbCh0ZW1wVXNlcnMubGVuZ3RoKTtcblx0XHRjb25zdCBjaGFubmVsc0lkID0gdGhpcy5jb2xsZWN0aW9uLmluc2VydCh7XG5cdFx0XHRpbXBvcnQ6IHRoaXMuaW1wb3J0UmVjb3JkLl9pZCxcblx0XHRcdGltcG9ydGVyOiB0aGlzLm5hbWUsXG5cdFx0XHR0eXBlOiAnY2hhbm5lbHMnLFxuXHRcdFx0Y2hhbm5lbHM6IHRlbXBSb29tcyxcblx0XHR9KTtcblx0XHR0aGlzLmNoYW5uZWxzID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoY2hhbm5lbHNJZCk7XG5cdFx0dGhpcy51cGRhdGVSZWNvcmQoe1xuXHRcdFx0J2NvdW50LmNoYW5uZWxzJzogdGVtcFJvb21zLmxlbmd0aCxcblx0XHR9KTtcblx0XHR0aGlzLmFkZENvdW50VG9Ub3RhbCh0ZW1wUm9vbXMubGVuZ3RoKTtcblx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuUFJFUEFSSU5HX01FU1NBR0VTKTtcblx0XHRsZXQgbWVzc2FnZXNDb3VudCA9IDA7XG5cdFx0T2JqZWN0LmtleXModGVtcE1lc3NhZ2VzKS5mb3JFYWNoKChjaGFubmVsKSA9PiB7XG5cdFx0XHRjb25zdCBtZXNzYWdlc09iaiA9IHRlbXBNZXNzYWdlc1tjaGFubmVsXTtcblx0XHRcdHRoaXMubWVzc2FnZXNbY2hhbm5lbF0gPSB0aGlzLm1lc3NhZ2VzW2NoYW5uZWxdIHx8IHt9O1xuXHRcdFx0T2JqZWN0LmtleXMobWVzc2FnZXNPYmopLmZvckVhY2goKGRhdGUpID0+IHtcblx0XHRcdFx0Y29uc3QgbXNncyA9IG1lc3NhZ2VzT2JqW2RhdGVdO1xuXHRcdFx0XHRtZXNzYWdlc0NvdW50ICs9IG1zZ3MubGVuZ3RoO1xuXHRcdFx0XHR0aGlzLnVwZGF0ZVJlY29yZCh7XG5cdFx0XHRcdFx0bWVzc2FnZXNzdGF0dXM6IGAkeyBjaGFubmVsIH0vJHsgZGF0ZSB9YCxcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGlmIChCYXNlLmdldEJTT05TaXplKG1zZ3MpID4gQmFzZS5nZXRNYXhCU09OU2l6ZSgpKSB7XG5cdFx0XHRcdFx0QmFzZS5nZXRCU09OU2FmZUFycmF5c0Zyb21BbkFycmF5KG1zZ3MpLmZvckVhY2goKHNwbGl0TXNnLCBpKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zdCBtZXNzYWdlc0lkID0gdGhpcy5jb2xsZWN0aW9uLmluc2VydCh7XG5cdFx0XHRcdFx0XHRcdGltcG9ydDogdGhpcy5pbXBvcnRSZWNvcmQuX2lkLFxuXHRcdFx0XHRcdFx0XHRpbXBvcnRlcjogdGhpcy5uYW1lLFxuXHRcdFx0XHRcdFx0XHR0eXBlOiAnbWVzc2FnZXMnLFxuXHRcdFx0XHRcdFx0XHRuYW1lOiBgJHsgY2hhbm5lbCB9LyR7IGRhdGUgfS4keyBpIH1gLFxuXHRcdFx0XHRcdFx0XHRtZXNzYWdlczogc3BsaXRNc2csXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHRoaXMubWVzc2FnZXNbY2hhbm5lbF1bYCR7IGRhdGUgfS4keyBpIH1gXSA9IHRoaXMuY29sbGVjdGlvbi5maW5kT25lKG1lc3NhZ2VzSWQpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNvbnN0IG1lc3NhZ2VzSWQgPSB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHtcblx0XHRcdFx0XHRcdGltcG9ydDogdGhpcy5pbXBvcnRSZWNvcmQuX2lkLFxuXHRcdFx0XHRcdFx0aW1wb3J0ZXI6IHRoaXMubmFtZSxcblx0XHRcdFx0XHRcdHR5cGU6ICdtZXNzYWdlcycsXG5cdFx0XHRcdFx0XHRuYW1lOiBgJHsgY2hhbm5lbCB9LyR7IGRhdGUgfWAsXG5cdFx0XHRcdFx0XHRtZXNzYWdlczogbXNncyxcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR0aGlzLm1lc3NhZ2VzW2NoYW5uZWxdW2RhdGVdID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUobWVzc2FnZXNJZCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdHRoaXMudXBkYXRlUmVjb3JkKHtcblx0XHRcdCdjb3VudC5tZXNzYWdlcyc6IG1lc3NhZ2VzQ291bnQsXG5cdFx0XHRtZXNzYWdlc3N0YXR1czogbnVsbCxcblx0XHR9KTtcblx0XHR0aGlzLmFkZENvdW50VG9Ub3RhbChtZXNzYWdlc0NvdW50KTtcblx0XHRpZiAodGVtcFVzZXJzLmxlbmd0aCA9PT0gMCB8fCB0ZW1wUm9vbXMubGVuZ3RoID09PSAwIHx8IG1lc3NhZ2VzQ291bnQgPT09IDApIHtcblx0XHRcdHRoaXMubG9nZ2VyLndhcm4oYFRoZSBsb2FkZWQgdXNlcnMgY291bnQgJHsgdGVtcFVzZXJzLmxlbmd0aCB9LCB0aGUgbG9hZGVkIGNoYW5uZWxzICR7IHRlbXBSb29tcy5sZW5ndGggfSwgYW5kIHRoZSBsb2FkZWQgbWVzc2FnZXMgJHsgbWVzc2FnZXNDb3VudCB9YCk7XG5cdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuRVJST1IpO1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0UHJvZ3Jlc3MoKTtcblx0XHR9XG5cdFx0Y29uc3Qgc2VsZWN0aW9uVXNlcnMgPSB0ZW1wVXNlcnMubWFwKGZ1bmN0aW9uKHVzZXIpIHtcblx0XHRcdHJldHVybiBuZXcgU2VsZWN0aW9uVXNlcih1c2VyLnVzZXJfaWQsIHVzZXIubmFtZSwgdXNlci5lbWFpbCwgdXNlci5pc19kZWxldGVkLCBmYWxzZSwgIXVzZXIuaXNfYm90KTtcblx0XHR9KTtcblx0XHRjb25zdCBzZWxlY3Rpb25DaGFubmVscyA9IHRlbXBSb29tcy5tYXAoZnVuY3Rpb24ocm9vbSkge1xuXHRcdFx0cmV0dXJuIG5ldyBTZWxlY3Rpb25DaGFubmVsKHJvb20ucm9vbV9pZCwgcm9vbS5uYW1lLCByb29tLmlzX2FyY2hpdmVkLCB0cnVlLCBmYWxzZSk7XG5cdFx0fSk7XG5cdFx0Y29uc3Qgc2VsZWN0aW9uTWVzc2FnZXMgPSB0aGlzLmltcG9ydFJlY29yZC5jb3VudC5tZXNzYWdlcztcblx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuVVNFUl9TRUxFQ1RJT04pO1xuXHRcdHJldHVybiBuZXcgU2VsZWN0aW9uKHRoaXMubmFtZSwgc2VsZWN0aW9uVXNlcnMsIHNlbGVjdGlvbkNoYW5uZWxzLCBzZWxlY3Rpb25NZXNzYWdlcyk7XG5cdH1cblxuXHRzdGFydEltcG9ydChpbXBvcnRTZWxlY3Rpb24pIHtcblx0XHRzdXBlci5zdGFydEltcG9ydChpbXBvcnRTZWxlY3Rpb24pO1xuXHRcdGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcblxuXHRcdGltcG9ydFNlbGVjdGlvbi51c2Vycy5mb3JFYWNoKCh1c2VyKSA9PiB7XG5cdFx0XHR0aGlzLnVzZXJzLnVzZXJzLmZvckVhY2goKHUpID0+IHtcblx0XHRcdFx0aWYgKHUudXNlcl9pZCA9PT0gdXNlci51c2VyX2lkKSB7XG5cdFx0XHRcdFx0dS5kb19pbXBvcnQgPSB1c2VyLmRvX2ltcG9ydDtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFx0dGhpcy5jb2xsZWN0aW9uLnVwZGF0ZSh7IF9pZDogdGhpcy51c2Vycy5faWQgfSwgeyAkc2V0OiB7IHVzZXJzOiB0aGlzLnVzZXJzLnVzZXJzIH0gfSk7XG5cblx0XHRpbXBvcnRTZWxlY3Rpb24uY2hhbm5lbHMuZm9yRWFjaCgoY2hhbm5lbCkgPT5cblx0XHRcdHRoaXMuY2hhbm5lbHMuY2hhbm5lbHMuZm9yRWFjaCgoYykgPT4gYy5yb29tX2lkID09PSBjaGFubmVsLmNoYW5uZWxfaWQgJiYgKGMuZG9faW1wb3J0ID0gY2hhbm5lbC5kb19pbXBvcnQpKVxuXHRcdCk7XG5cdFx0dGhpcy5jb2xsZWN0aW9uLnVwZGF0ZSh7IF9pZDogdGhpcy5jaGFubmVscy5faWQgfSwgeyAkc2V0OiB7IGNoYW5uZWxzOiB0aGlzLmNoYW5uZWxzLmNoYW5uZWxzIH0gfSk7XG5cblx0XHRjb25zdCBzdGFydGVkQnlVc2VySWQgPSBNZXRlb3IudXNlcklkKCk7XG5cdFx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5JTVBPUlRJTkdfVVNFUlMpO1xuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHR0aGlzLnVzZXJzLnVzZXJzLmZvckVhY2goKHVzZXIpID0+IHtcblx0XHRcdFx0XHRpZiAoIXVzZXIuZG9faW1wb3J0KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcihzdGFydGVkQnlVc2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IGV4aXN0YW50VXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUVtYWlsQWRkcmVzcyh1c2VyLmVtYWlsKTtcblx0XHRcdFx0XHRcdGlmIChleGlzdGFudFVzZXIpIHtcblx0XHRcdFx0XHRcdFx0dXNlci5yb2NrZXRJZCA9IGV4aXN0YW50VXNlci5faWQ7XG5cdFx0XHRcdFx0XHRcdHRoaXMudXNlclRhZ3MucHVzaCh7XG5cdFx0XHRcdFx0XHRcdFx0aGlwY2hhdDogYEAkeyB1c2VyLm1lbnRpb25fbmFtZSB9YCxcblx0XHRcdFx0XHRcdFx0XHRyb2NrZXQ6IGBAJHsgZXhpc3RhbnRVc2VyLnVzZXJuYW1lIH1gLFxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHVzZXJJZCA9IEFjY291bnRzLmNyZWF0ZVVzZXIoe1xuXHRcdFx0XHRcdFx0XHRcdGVtYWlsOiB1c2VyLmVtYWlsLFxuXHRcdFx0XHRcdFx0XHRcdHBhc3N3b3JkOiBEYXRlLm5vdygpICsgdXNlci5uYW1lICsgdXNlci5lbWFpbC50b1VwcGVyQ2FzZSgpLFxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0dXNlci5yb2NrZXRJZCA9IHVzZXJJZDtcblx0XHRcdFx0XHRcdFx0dGhpcy51c2VyVGFncy5wdXNoKHtcblx0XHRcdFx0XHRcdFx0XHRoaXBjaGF0OiBgQCR7IHVzZXIubWVudGlvbl9uYW1lIH1gLFxuXHRcdFx0XHRcdFx0XHRcdHJvY2tldDogYEAkeyB1c2VyLm1lbnRpb25fbmFtZSB9YCxcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodXNlcklkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0TWV0ZW9yLmNhbGwoJ3NldFVzZXJuYW1lJywgdXNlci5tZW50aW9uX25hbWUsIHtcblx0XHRcdFx0XHRcdFx0XHRcdGpvaW5EZWZhdWx0Q2hhbm5lbHNTaWxlbmNlZDogdHJ1ZSxcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnc2V0QXZhdGFyRnJvbVNlcnZpY2UnLCB1c2VyLnBob3RvX3VybCwgdW5kZWZpbmVkLCAndXJsJyk7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIE1ldGVvci5jYWxsKCd1c2VyU2V0VXRjT2Zmc2V0JywgcGFyc2VJbnQobW9tZW50KCkudHoodXNlci50aW1lem9uZSkuZm9ybWF0KCdaJykudG9TdHJpbmcoKS5zcGxpdCgnOicpWzBdKSk7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRpZiAodXNlci5uYW1lICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXROYW1lKHVzZXJJZCwgdXNlci5uYW1lKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAodXNlci5pc19kZWxldGVkKSB7XG5cdFx0XHRcdFx0XHRcdFx0TWV0ZW9yLmNhbGwoJ3NldFVzZXJBY3RpdmVTdGF0dXMnLCB1c2VySWQsIGZhbHNlKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuYWRkQ291bnRDb21wbGV0ZWQoMSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHRoaXMuY29sbGVjdGlvbi51cGRhdGUoeyBfaWQ6IHRoaXMudXNlcnMuX2lkIH0sIHsgJHNldDogeyB1c2VyczogdGhpcy51c2Vycy51c2VycyB9IH0pO1xuXG5cdFx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5JTVBPUlRJTkdfQ0hBTk5FTFMpO1xuXHRcdFx0XHR0aGlzLmNoYW5uZWxzLmNoYW5uZWxzLmZvckVhY2goKGNoYW5uZWwpID0+IHtcblx0XHRcdFx0XHRpZiAoIWNoYW5uZWwuZG9faW1wb3J0KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIoc3RhcnRlZEJ5VXNlcklkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRjaGFubmVsLm5hbWUgPSBjaGFubmVsLm5hbWUucmVwbGFjZSgvIC9nLCAnJyk7XG5cdFx0XHRcdFx0XHRjb25zdCBleGlzdGFudFJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlOYW1lKGNoYW5uZWwubmFtZSk7XG5cdFx0XHRcdFx0XHRpZiAoZXhpc3RhbnRSb29tKSB7XG5cdFx0XHRcdFx0XHRcdGNoYW5uZWwucm9ja2V0SWQgPSBleGlzdGFudFJvb20uX2lkO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0bGV0IHVzZXJJZCA9ICcnO1xuXHRcdFx0XHRcdFx0XHR0aGlzLnVzZXJzLnVzZXJzLmZvckVhY2goKHVzZXIpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRpZiAodXNlci51c2VyX2lkID09PSBjaGFubmVsLm93bmVyX3VzZXJfaWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHVzZXJJZCA9IHVzZXIucm9ja2V0SWQ7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0aWYgKHVzZXJJZCA9PT0gJycpIHtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKGBGYWlsZWQgdG8gZmluZCB0aGUgY2hhbm5lbCBjcmVhdG9yIGZvciAkeyBjaGFubmVsLm5hbWUgfSwgc2V0dGluZyBpdCB0byB0aGUgY3VycmVudCBydW5uaW5nIHVzZXIuYCk7XG5cdFx0XHRcdFx0XHRcdFx0dXNlcklkID0gc3RhcnRlZEJ5VXNlcklkO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodXNlcklkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgcmV0dXJuZWQgPSBNZXRlb3IuY2FsbCgnY3JlYXRlQ2hhbm5lbCcsIGNoYW5uZWwubmFtZSwgW10pO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBjaGFubmVsLnJvY2tldElkID0gcmV0dXJuZWQucmlkO1xuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMudXBkYXRlKHtcblx0XHRcdFx0XHRcdFx0XHRfaWQ6IGNoYW5uZWwucm9ja2V0SWQsXG5cdFx0XHRcdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRcdFx0XHQkc2V0OiB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0czogbmV3IERhdGUoY2hhbm5lbC5jcmVhdGVkICogMTAwMCksXG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5hZGRDb3VudENvbXBsZXRlZCgxKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0dGhpcy5jb2xsZWN0aW9uLnVwZGF0ZSh7IF9pZDogdGhpcy5jaGFubmVscy5faWQgfSwgeyAkc2V0OiB7IGNoYW5uZWxzOiB0aGlzLmNoYW5uZWxzLmNoYW5uZWxzIH0gfSk7XG5cblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLklNUE9SVElOR19NRVNTQUdFUyk7XG5cdFx0XHRcdGNvbnN0IG5vdXNlcnMgPSB7fTtcblxuXHRcdFx0XHRPYmplY3Qua2V5cyh0aGlzLm1lc3NhZ2VzKS5mb3JFYWNoKChjaGFubmVsKSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgbWVzc2FnZXNPYmogPSB0aGlzLm1lc3NhZ2VzW2NoYW5uZWxdO1xuXHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIoc3RhcnRlZEJ5VXNlcklkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zdCBoaXBjaGF0Q2hhbm5lbCA9IHRoaXMuZ2V0SGlwQ2hhdENoYW5uZWxGcm9tTmFtZShjaGFubmVsKTtcblx0XHRcdFx0XHRcdGlmIChoaXBjaGF0Q2hhbm5lbCAhPSBudWxsID8gaGlwY2hhdENoYW5uZWwuZG9faW1wb3J0IDogdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChoaXBjaGF0Q2hhbm5lbC5yb2NrZXRJZCwge1xuXHRcdFx0XHRcdFx0XHRcdGZpZWxkczoge1xuXHRcdFx0XHRcdFx0XHRcdFx0dXNlcm5hbWVzOiAxLFxuXHRcdFx0XHRcdFx0XHRcdFx0dDogMSxcblx0XHRcdFx0XHRcdFx0XHRcdG5hbWU6IDEsXG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdFx0T2JqZWN0LmtleXMobWVzc2FnZXNPYmopLmZvckVhY2goKGRhdGUpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBtc2dzID0gbWVzc2FnZXNPYmpbZGF0ZV07XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy51cGRhdGVSZWNvcmQoe1xuXHRcdFx0XHRcdFx0XHRcdFx0bWVzc2FnZXNzdGF0dXM6IGAkeyBjaGFubmVsIH0vJHsgZGF0ZSB9LiR7IG1zZ3MubWVzc2FnZXMubGVuZ3RoIH1gLFxuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0bXNncy5tZXNzYWdlcy5mb3JFYWNoKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAobWVzc2FnZS5mcm9tICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgdXNlciA9IHRoaXMuZ2V0Um9ja2V0VXNlcihtZXNzYWdlLmZyb20udXNlcl9pZCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmICh1c2VyICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBtc2dPYmogPSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRtc2c6IHRoaXMuY29udmVydEhpcENoYXRNZXNzYWdlVG9Sb2NrZXRDaGF0KG1lc3NhZ2UubWVzc2FnZSksXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0czogbmV3IERhdGUobWVzc2FnZS5kYXRlKSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHU6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0X2lkOiB1c2VyLl9pZCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dXNlcm5hbWU6IHVzZXIudXNlcm5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5zZW5kTWVzc2FnZSh1c2VyLCBtc2dPYmosIHJvb20sIHRydWUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCFub3VzZXJzW21lc3NhZ2UuZnJvbS51c2VyX2lkXSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdG5vdXNlcnNbbWVzc2FnZS5mcm9tLnVzZXJfaWRdID0gbWVzc2FnZS5mcm9tO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCFfLmlzQXJyYXkobWVzc2FnZSkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKCdQbGVhc2UgcmVwb3J0IHRoZSBmb2xsb3dpbmc6JywgbWVzc2FnZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmFkZENvdW50Q29tcGxldGVkKDEpO1xuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0dGhpcy5sb2dnZXIud2FybignVGhlIGZvbGxvd2luZyBkaWQgbm90IGhhdmUgdXNlcnM6Jywgbm91c2Vycyk7XG5cdFx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5GSU5JU0hJTkcpO1xuXG5cdFx0XHRcdHRoaXMuY2hhbm5lbHMuY2hhbm5lbHMuZm9yRWFjaCgoY2hhbm5lbCkgPT4ge1xuXHRcdFx0XHRcdGlmIChjaGFubmVsLmRvX2ltcG9ydCAmJiBjaGFubmVsLmlzX2FyY2hpdmVkKSB7XG5cdFx0XHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKHN0YXJ0ZWRCeVVzZXJJZCwgKCkgPT4gTWV0ZW9yLmNhbGwoJ2FyY2hpdmVSb29tJywgY2hhbm5lbC5yb2NrZXRJZCkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLkRPTkUpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHR0aGlzLmxvZ2dlci5lcnJvcihlKTtcblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLkVSUk9SKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgdGltZVRvb2sgPSBEYXRlLm5vdygpIC0gc3RhcnQ7XG5cdFx0XHRyZXR1cm4gdGhpcy5sb2dnZXIubG9nKGBJbXBvcnQgdG9vayAkeyB0aW1lVG9vayB9IG1pbGxpc2Vjb25kcy5gKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzLmdldFByb2dyZXNzKCk7XG5cdH1cblxuXHRnZXRIaXBDaGF0Q2hhbm5lbEZyb21OYW1lKGNoYW5uZWxOYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMuY2hhbm5lbHMuY2hhbm5lbHMuZmluZCgoY2hhbm5lbCkgPT4gY2hhbm5lbC5uYW1lID09PSBjaGFubmVsTmFtZSk7XG5cdH1cblxuXHRnZXRSb2NrZXRVc2VyKGhpcGNoYXRJZCkge1xuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLnVzZXJzLnVzZXJzLmZpbmQoKHVzZXIpID0+IHVzZXIudXNlcl9pZCA9PT0gaGlwY2hhdElkKTtcblx0XHRyZXR1cm4gdXNlciA/IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHVzZXIucm9ja2V0SWQsIHtcblx0XHRcdGZpZWxkczoge1xuXHRcdFx0XHR1c2VybmFtZTogMSxcblx0XHRcdFx0bmFtZTogMSxcblx0XHRcdH0sXG5cdFx0fSkgOiB1bmRlZmluZWQ7XG5cdH1cblxuXHRjb252ZXJ0SGlwQ2hhdE1lc3NhZ2VUb1JvY2tldENoYXQobWVzc2FnZSkge1xuXHRcdGlmIChtZXNzYWdlICE9IG51bGwpIHtcblx0XHRcdHRoaXMudXNlclRhZ3MuZm9yRWFjaCgodXNlclJlcGxhY2UpID0+IHtcblx0XHRcdFx0bWVzc2FnZSA9IG1lc3NhZ2UucmVwbGFjZSh1c2VyUmVwbGFjZS5oaXBjaGF0LCB1c2VyUmVwbGFjZS5yb2NrZXQpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1lc3NhZ2UgPSAnJztcblx0XHR9XG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHRnZXRTZWxlY3Rpb24oKSB7XG5cdFx0Y29uc3Qgc2VsZWN0aW9uVXNlcnMgPSB0aGlzLnVzZXJzLnVzZXJzLm1hcChmdW5jdGlvbih1c2VyKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFNlbGVjdGlvblVzZXIodXNlci51c2VyX2lkLCB1c2VyLm5hbWUsIHVzZXIuZW1haWwsIHVzZXIuaXNfZGVsZXRlZCwgZmFsc2UsICF1c2VyLmlzX2JvdCk7XG5cdFx0fSk7XG5cdFx0Y29uc3Qgc2VsZWN0aW9uQ2hhbm5lbHMgPSB0aGlzLmNoYW5uZWxzLmNoYW5uZWxzLm1hcChmdW5jdGlvbihyb29tKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFNlbGVjdGlvbkNoYW5uZWwocm9vbS5yb29tX2lkLCByb29tLm5hbWUsIHJvb20uaXNfYXJjaGl2ZWQsIHRydWUsIGZhbHNlKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gbmV3IFNlbGVjdGlvbih0aGlzLm5hbWUsIHNlbGVjdGlvblVzZXJzLCBzZWxlY3Rpb25DaGFubmVscywgdGhpcy5pbXBvcnRSZWNvcmQuY291bnQubWVzc2FnZXMpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBJbXBvcnRlcnMgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDppbXBvcnRlcic7XG5pbXBvcnQgeyBIaXBDaGF0SW1wb3J0ZXJJbmZvIH0gZnJvbSAnLi4vaW5mbyc7XG5pbXBvcnQgeyBIaXBDaGF0SW1wb3J0ZXIgfSBmcm9tICcuL2ltcG9ydGVyJztcblxuSW1wb3J0ZXJzLmFkZChuZXcgSGlwQ2hhdEltcG9ydGVySW5mbygpLCBIaXBDaGF0SW1wb3J0ZXIpO1xuIl19
