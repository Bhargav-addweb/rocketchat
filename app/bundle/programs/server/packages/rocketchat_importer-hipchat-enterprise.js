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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:importer-hipchat-enterprise":{"info.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/rocketchat_importer-hipchat-enterprise/info.js                                                         //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.export({
  HipChatEnterpriseImporterInfo: () => HipChatEnterpriseImporterInfo
});
let ImporterInfo;
module.watch(require("meteor/rocketchat:importer"), {
  ImporterInfo(v) {
    ImporterInfo = v;
  }

}, 0);

class HipChatEnterpriseImporterInfo extends ImporterInfo {
  constructor() {
    super('hipchatenterprise', 'HipChat (tar.gz)', 'application/gzip', [{
      text: 'Importer_HipChatEnterprise_Information',
      href: 'https://rocket.chat/docs/administrator-guides/import/hipchat/enterprise/'
    }]);
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server":{"importer.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/rocketchat_importer-hipchat-enterprise/server/importer.js                                              //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.export({
  HipChatEnterpriseImporter: () => HipChatEnterpriseImporter
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
let Readable;
module.watch(require("stream"), {
  Readable(v) {
    Readable = v;
  }

}, 1);
let path;
module.watch(require("path"), {
  default(v) {
    path = v;
  }

}, 2);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 3);
let TurndownService;
module.watch(require("turndown"), {
  default(v) {
    TurndownService = v;
  }

}, 4);
const turndownService = new TurndownService({
  strongDelimiter: '*',
  hr: '',
  br: '\n'
});
turndownService.addRule('strikethrough', {
  filter: 'img',

  replacement(content, node) {
    const src = node.getAttribute('src') || '';
    const alt = node.alt || node.title || src;
    return src ? `[${alt}](${src})` : '';
  }

});

class HipChatEnterpriseImporter extends Base {
  constructor(info) {
    super(info);
    this.Readable = Readable;
    this.zlib = require('zlib');
    this.tarStream = require('tar-stream');
    this.extract = this.tarStream.extract();
    this.path = path;
    this.messages = new Map();
    this.directMessages = new Map();
  }

  prepare(dataURI, sentContentType, fileName) {
    super.prepare(dataURI, sentContentType, fileName);
    const tempUsers = [];
    const tempRooms = [];
    const tempMessages = new Map();
    const tempDirectMessages = new Map();
    const promise = new Promise((resolve, reject) => {
      this.extract.on('entry', Meteor.bindEnvironment((header, stream, next) => {
        if (!header.name.endsWith('.json')) {
          stream.resume();
          return next();
        }

        const info = this.path.parse(header.name);
        const data = [];
        stream.on('data', Meteor.bindEnvironment(chunk => {
          data.push(chunk);
        }));
        stream.on('end', Meteor.bindEnvironment(() => {
          this.logger.debug(`Processing the file: ${header.name}`);
          const dataString = Buffer.concat(data).toString();
          const file = JSON.parse(dataString);

          if (info.base === 'users.json') {
            super.updateProgress(ProgressStep.PREPARING_USERS);

            for (const u of file) {
              // if (!u.User.email) {
              // 	// continue;
              // }
              tempUsers.push({
                id: u.User.id,
                email: u.User.email,
                name: u.User.name,
                username: u.User.mention_name,
                avatar: u.User.avatar && u.User.avatar.replace(/\n/g, ''),
                timezone: u.User.timezone,
                isDeleted: u.User.is_deleted
              });
            }
          } else if (info.base === 'rooms.json') {
            super.updateProgress(ProgressStep.PREPARING_CHANNELS);

            for (const r of file) {
              tempRooms.push({
                id: r.Room.id,
                creator: r.Room.owner,
                created: new Date(r.Room.created),
                name: s.slugify(r.Room.name),
                isPrivate: r.Room.privacy === 'private',
                isArchived: r.Room.is_archived,
                topic: r.Room.topic
              });
            }
          } else if (info.base === 'history.json') {
            const [type, id] = info.dir.split('/'); // ['users', '1']

            const roomIdentifier = `${type}/${id}`;

            if (type === 'users') {
              const msgs = [];

              for (const m of file) {
                if (m.PrivateUserMessage) {
                  msgs.push({
                    type: 'user',
                    id: `hipchatenterprise-${m.PrivateUserMessage.id}`,
                    senderId: m.PrivateUserMessage.sender.id,
                    receiverId: m.PrivateUserMessage.receiver.id,
                    text: m.PrivateUserMessage.message.indexOf('/me ') === -1 ? m.PrivateUserMessage.message : `${m.PrivateUserMessage.message.replace(/\/me /, '_')}_`,
                    ts: new Date(m.PrivateUserMessage.timestamp.split(' ')[0]),
                    attachment: m.PrivateUserMessage.attachment,
                    attachment_path: m.PrivateUserMessage.attachment_path
                  });
                }
              }

              tempDirectMessages.set(roomIdentifier, msgs);
            } else if (type === 'rooms') {
              const roomMsgs = [];

              for (const m of file) {
                if (m.UserMessage) {
                  roomMsgs.push({
                    type: 'user',
                    id: `hipchatenterprise-${id}-${m.UserMessage.id}`,
                    userId: m.UserMessage.sender.id,
                    text: m.UserMessage.message.indexOf('/me ') === -1 ? m.UserMessage.message : `${m.UserMessage.message.replace(/\/me /, '_')}_`,
                    ts: new Date(m.UserMessage.timestamp.split(' ')[0])
                  });
                } else if (m.NotificationMessage) {
                  const text = m.NotificationMessage.message.indexOf('/me ') === -1 ? m.NotificationMessage.message : `${m.NotificationMessage.message.replace(/\/me /, '_')}_`;
                  roomMsgs.push({
                    type: 'user',
                    id: `hipchatenterprise-${id}-${m.NotificationMessage.id}`,
                    userId: 'rocket.cat',
                    alias: m.NotificationMessage.sender,
                    text: m.NotificationMessage.message_format === 'html' ? turndownService.turndown(text) : text,
                    ts: new Date(m.NotificationMessage.timestamp.split(' ')[0])
                  });
                } else if (m.TopicRoomMessage) {
                  roomMsgs.push({
                    type: 'topic',
                    id: `hipchatenterprise-${id}-${m.TopicRoomMessage.id}`,
                    userId: m.TopicRoomMessage.sender.id,
                    ts: new Date(m.TopicRoomMessage.timestamp.split(' ')[0]),
                    text: m.TopicRoomMessage.message
                  });
                } else {
                  this.logger.warn('HipChat Enterprise importer isn\'t configured to handle this message:', m);
                }
              }

              tempMessages.set(roomIdentifier, roomMsgs);
            } else {
              this.logger.warn(`HipChat Enterprise importer isn't configured to handle "${type}" files.`);
            }
          } else {
            // What are these files!?
            this.logger.warn(`HipChat Enterprise importer doesn't know what to do with the file "${header.name}" :o`, info);
          }

          next();
        }));
        stream.on('error', () => next());
        stream.resume();
      }));
      this.extract.on('error', err => {
        this.logger.warn('extract error:', err);
        reject();
      });
      this.extract.on('finish', Meteor.bindEnvironment(() => {
        // Insert the users record, eventually this might have to be split into several ones as well
        // if someone tries to import a several thousands users instance
        const usersId = this.collection.insert({
          import: this.importRecord._id,
          importer: this.name,
          type: 'users',
          users: tempUsers
        });
        this.users = this.collection.findOne(usersId);
        super.updateRecord({
          'count.users': tempUsers.length
        });
        super.addCountToTotal(tempUsers.length); // Insert the channels records.

        const channelsId = this.collection.insert({
          import: this.importRecord._id,
          importer: this.name,
          type: 'channels',
          channels: tempRooms
        });
        this.channels = this.collection.findOne(channelsId);
        super.updateRecord({
          'count.channels': tempRooms.length
        });
        super.addCountToTotal(tempRooms.length); // Save the messages records to the import record for `startImport` usage

        super.updateProgress(ProgressStep.PREPARING_MESSAGES);
        let messagesCount = 0;

        for (const [channel, msgs] of tempMessages.entries()) {
          if (!this.messages.get(channel)) {
            this.messages.set(channel, new Map());
          }

          messagesCount += msgs.length;
          super.updateRecord({
            messagesstatus: channel
          });

          if (Base.getBSONSize(msgs) > Base.getMaxBSONSize()) {
            Base.getBSONSafeArraysFromAnArray(msgs).forEach((splitMsg, i) => {
              const messagesId = this.collection.insert({
                import: this.importRecord._id,
                importer: this.name,
                type: 'messages',
                name: `${channel}/${i}`,
                messages: splitMsg
              });
              this.messages.get(channel).set(`${channel}.${i}`, this.collection.findOne(messagesId));
            });
          } else {
            const messagesId = this.collection.insert({
              import: this.importRecord._id,
              importer: this.name,
              type: 'messages',
              name: `${channel}`,
              messages: msgs
            });
            this.messages.get(channel).set(channel, this.collection.findOne(messagesId));
          }
        }

        for (const [directMsgUser, msgs] of tempDirectMessages.entries()) {
          this.logger.debug(`Preparing the direct messages for: ${directMsgUser}`);

          if (!this.directMessages.get(directMsgUser)) {
            this.directMessages.set(directMsgUser, new Map());
          }

          messagesCount += msgs.length;
          super.updateRecord({
            messagesstatus: directMsgUser
          });

          if (Base.getBSONSize(msgs) > Base.getMaxBSONSize()) {
            Base.getBSONSafeArraysFromAnArray(msgs).forEach((splitMsg, i) => {
              const messagesId = this.collection.insert({
                import: this.importRecord._id,
                importer: this.name,
                type: 'directMessages',
                name: `${directMsgUser}/${i}`,
                messages: splitMsg
              });
              this.directMessages.get(directMsgUser).set(`${directMsgUser}.${i}`, this.collection.findOne(messagesId));
            });
          } else {
            const messagesId = this.collection.insert({
              import: this.importRecord._id,
              importer: this.name,
              type: 'directMessages',
              name: `${directMsgUser}`,
              messages: msgs
            });
            this.directMessages.get(directMsgUser).set(directMsgUser, this.collection.findOne(messagesId));
          }
        }

        super.updateRecord({
          'count.messages': messagesCount,
          messagesstatus: null
        });
        super.addCountToTotal(messagesCount); // Ensure we have some users, channels, and messages

        if (tempUsers.length === 0 || tempRooms.length === 0 || messagesCount === 0) {
          this.logger.warn(`The loaded users count ${tempUsers.length}, the loaded rooms ${tempRooms.length}, and the loaded messages ${messagesCount}`);
          super.updateProgress(ProgressStep.ERROR);
          reject();
          return;
        }

        const selectionUsers = tempUsers.map(u => new SelectionUser(u.id, u.username, u.email, u.isDeleted, false, true));
        const selectionChannels = tempRooms.map(r => new SelectionChannel(r.id, r.name, r.isArchived, true, r.isPrivate));
        const selectionMessages = this.importRecord.count.messages;
        super.updateProgress(ProgressStep.USER_SELECTION);
        resolve(new Selection(this.name, selectionUsers, selectionChannels, selectionMessages));
      })); // Wish I could make this cleaner :(

      const split = dataURI.split(',');
      const read = new this.Readable();
      read.push(new Buffer(split[split.length - 1], 'base64'));
      read.push(null);
      read.pipe(this.zlib.createGunzip()).pipe(this.extract);
    });
    return promise;
  }

  startImport(importSelection) {
    super.startImport(importSelection);
    const started = Date.now(); // Ensure we're only going to import the users that the user has selected

    for (const user of importSelection.users) {
      for (const u of this.users.users) {
        if (u.id === user.user_id) {
          u.do_import = user.do_import;
        }
      }
    }

    this.collection.update({
      _id: this.users._id
    }, {
      $set: {
        users: this.users.users
      }
    }); // Ensure we're only importing the channels the user has selected.

    for (const channel of importSelection.channels) {
      for (const c of this.channels.channels) {
        if (c.id === channel.channel_id) {
          c.do_import = channel.do_import;
        }
      }
    }

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
        // Import the users
        for (const u of this.users.users) {
          this.logger.debug(`Starting the user import: ${u.username} and are we importing them? ${u.do_import}`);

          if (!u.do_import) {
            continue;
          }

          Meteor.runAsUser(startedByUserId, () => {
            let existantUser;

            if (u.email) {
              RocketChat.models.Users.findOneByEmailAddress(u.email);
            } // If we couldn't find one by their email address, try to find an existing user by their username


            if (!existantUser) {
              existantUser = RocketChat.models.Users.findOneByUsername(u.username);
            }

            if (existantUser) {
              // since we have an existing user, let's try a few things
              u.rocketId = existantUser._id;
              RocketChat.models.Users.update({
                _id: u.rocketId
              }, {
                $addToSet: {
                  importIds: u.id
                }
              });
            } else {
              const user = {
                email: u.email,
                password: Random.id()
              };

              if (!user.email) {
                delete user.email;
                user.username = u.username;
              }

              const userId = Accounts.createUser(user);
              Meteor.runAsUser(userId, () => {
                Meteor.call('setUsername', u.username, {
                  joinDefaultChannelsSilenced: true
                }); // TODO: Use moment timezone to calc the time offset - Meteor.call 'userSetUtcOffset', user.tz_offset / 3600

                RocketChat.models.Users.setName(userId, u.name); // TODO: Think about using a custom field for the users "title" field

                if (u.avatar) {
                  Meteor.call('setAvatarFromService', `data:image/png;base64,${u.avatar}`);
                } // Deleted users are 'inactive' users in Rocket.Chat


                if (u.deleted) {
                  Meteor.call('setUserActiveStatus', userId, false);
                }

                RocketChat.models.Users.update({
                  _id: userId
                }, {
                  $addToSet: {
                    importIds: u.id
                  }
                });
                u.rocketId = userId;
              });
            }

            super.addCountCompleted(1);
          });
        }

        this.collection.update({
          _id: this.users._id
        }, {
          $set: {
            users: this.users.users
          }
        }); // Import the channels

        super.updateProgress(ProgressStep.IMPORTING_CHANNELS);

        for (const c of this.channels.channels) {
          if (!c.do_import) {
            continue;
          }

          Meteor.runAsUser(startedByUserId, () => {
            const existantRoom = RocketChat.models.Rooms.findOneByName(c.name); // If the room exists or the name of it is 'general', then we don't need to create it again

            if (existantRoom || c.name.toUpperCase() === 'GENERAL') {
              c.rocketId = c.name.toUpperCase() === 'GENERAL' ? 'GENERAL' : existantRoom._id;
              RocketChat.models.Rooms.update({
                _id: c.rocketId
              }, {
                $addToSet: {
                  importIds: c.id
                }
              });
            } else {
              // Find the rocketchatId of the user who created this channel
              let creatorId = startedByUserId;

              for (const u of this.users.users) {
                if (u.id === c.creator && u.do_import) {
                  creatorId = u.rocketId;
                }
              } // Create the channel


              Meteor.runAsUser(creatorId, () => {
                const roomInfo = Meteor.call(c.isPrivate ? 'createPrivateGroup' : 'createChannel', c.name, []);
                c.rocketId = roomInfo.rid;
              });
              RocketChat.models.Rooms.update({
                _id: c.rocketId
              }, {
                $set: {
                  ts: c.created,
                  topic: c.topic
                },
                $addToSet: {
                  importIds: c.id
                }
              });
            }

            super.addCountCompleted(1);
          });
        }

        this.collection.update({
          _id: this.channels._id
        }, {
          $set: {
            channels: this.channels.channels
          }
        }); // Import the Messages

        super.updateProgress(ProgressStep.IMPORTING_MESSAGES);

        for (const [ch, messagesMap] of this.messages.entries()) {
          const hipChannel = this.getChannelFromRoomIdentifier(ch);

          if (!hipChannel.do_import) {
            continue;
          }

          const room = RocketChat.models.Rooms.findOneById(hipChannel.rocketId, {
            fields: {
              usernames: 1,
              t: 1,
              name: 1
            }
          });
          Meteor.runAsUser(startedByUserId, () => {
            for (const [msgGroupData, msgs] of messagesMap.entries()) {
              super.updateRecord({
                messagesstatus: `${ch}/${msgGroupData}.${msgs.messages.length}`
              });

              for (const msg of msgs.messages) {
                if (isNaN(msg.ts)) {
                  this.logger.warn(`Timestamp on a message in ${ch}/${msgGroupData} is invalid`);
                  super.addCountCompleted(1);
                  continue;
                }

                const creator = this.getRocketUserFromUserId(msg.userId);

                if (creator) {
                  switch (msg.type) {
                    case 'user':
                      RocketChat.sendMessage(creator, {
                        _id: msg.id,
                        ts: msg.ts,
                        msg: msg.text,
                        rid: room._id,
                        alias: msg.alias,
                        u: {
                          _id: creator._id,
                          username: creator.username
                        }
                      }, room, true);
                      break;

                    case 'topic':
                      RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser('room_changed_topic', room._id, msg.text, creator, {
                        _id: msg.id,
                        ts: msg.ts
                      });
                      break;
                  }
                }

                super.addCountCompleted(1);
              }
            }
          });
        } // Import the Direct Messages


        for (const [directMsgRoom, directMessagesMap] of this.directMessages.entries()) {
          const hipUser = this.getUserFromDirectMessageIdentifier(directMsgRoom);

          if (!hipUser || !hipUser.do_import) {
            continue;
          } // Verify this direct message user's room is valid (confusing but idk how else to explain it)


          if (!this.getRocketUserFromUserId(hipUser.id)) {
            continue;
          }

          for (const [msgGroupData, msgs] of directMessagesMap.entries()) {
            super.updateRecord({
              messagesstatus: `${directMsgRoom}/${msgGroupData}.${msgs.messages.length}`
            });

            for (const msg of msgs.messages) {
              if (isNaN(msg.ts)) {
                this.logger.warn(`Timestamp on a message in ${directMsgRoom}/${msgGroupData} is invalid`);
                super.addCountCompleted(1);
                continue;
              } // make sure the message sender is a valid user inside rocket.chat


              const sender = this.getRocketUserFromUserId(msg.senderId);

              if (!sender) {
                continue;
              } // make sure the receiver of the message is a valid rocket.chat user


              const receiver = this.getRocketUserFromUserId(msg.receiverId);

              if (!receiver) {
                continue;
              }

              let room = RocketChat.models.Rooms.findOneById([receiver._id, sender._id].sort().join(''));

              if (!room) {
                Meteor.runAsUser(sender._id, () => {
                  const roomInfo = Meteor.call('createDirectMessage', receiver.username);
                  room = RocketChat.models.Rooms.findOneById(roomInfo.rid);
                });
              }

              Meteor.runAsUser(sender._id, () => {
                if (msg.attachment_path) {
                  const details = {
                    message_id: msg.id,
                    name: msg.attachment.name,
                    size: msg.attachment.size,
                    userId: sender._id,
                    rid: room._id
                  };
                  this.uploadFile(details, msg.attachment.url, sender, room, msg.ts);
                } else {
                  RocketChat.sendMessage(sender, {
                    _id: msg.id,
                    ts: msg.ts,
                    msg: msg.text,
                    rid: room._id,
                    u: {
                      _id: sender._id,
                      username: sender.username
                    }
                  }, room, true);
                }
              });
            }
          }
        }

        super.updateProgress(ProgressStep.FINISHING);
        super.updateProgress(ProgressStep.DONE);
      } catch (e) {
        this.logger.error(e);
        super.updateProgress(ProgressStep.ERROR);
      }

      const timeTook = Date.now() - started;
      this.logger.log(`HipChat Enterprise Import took ${timeTook} milliseconds.`);
    });
    return super.getProgress();
  }

  getSelection() {
    const selectionUsers = this.users.users.map(u => new SelectionUser(u.id, u.username, u.email, false, false, true));
    const selectionChannels = this.channels.channels.map(c => new SelectionChannel(c.id, c.name, false, true, c.isPrivate));
    const selectionMessages = this.importRecord.count.messages;
    return new Selection(this.name, selectionUsers, selectionChannels, selectionMessages);
  }

  getChannelFromRoomIdentifier(roomIdentifier) {
    for (const ch of this.channels.channels) {
      if (`rooms/${ch.id}` === roomIdentifier) {
        return ch;
      }
    }
  }

  getUserFromDirectMessageIdentifier(directIdentifier) {
    for (const u of this.users.users) {
      if (`users/${u.id}` === directIdentifier) {
        return u;
      }
    }
  }

  getRocketUserFromUserId(userId) {
    if (userId === 'rocket.cat') {
      return RocketChat.models.Users.findOneById(userId, {
        fields: {
          username: 1
        }
      });
    }

    for (const u of this.users.users) {
      if (u.id === userId) {
        return RocketChat.models.Users.findOneById(u.rocketId, {
          fields: {
            username: 1
          }
        });
      }
    }
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"adder.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/rocketchat_importer-hipchat-enterprise/server/adder.js                                                 //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
let Importers;
module.watch(require("meteor/rocketchat:importer"), {
  Importers(v) {
    Importers = v;
  }

}, 0);
let HipChatEnterpriseImporterInfo;
module.watch(require("../info"), {
  HipChatEnterpriseImporterInfo(v) {
    HipChatEnterpriseImporterInfo = v;
  }

}, 1);
let HipChatEnterpriseImporter;
module.watch(require("./importer"), {
  HipChatEnterpriseImporter(v) {
    HipChatEnterpriseImporter = v;
  }

}, 2);
Importers.add(new HipChatEnterpriseImporterInfo(), HipChatEnterpriseImporter);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:importer-hipchat-enterprise/info.js");
require("/node_modules/meteor/rocketchat:importer-hipchat-enterprise/server/importer.js");
require("/node_modules/meteor/rocketchat:importer-hipchat-enterprise/server/adder.js");

/* Exports */
Package._define("rocketchat:importer-hipchat-enterprise");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_importer-hipchat-enterprise.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci1oaXBjaGF0LWVudGVycHJpc2UvaW5mby5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci1oaXBjaGF0LWVudGVycHJpc2Uvc2VydmVyL2ltcG9ydGVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmltcG9ydGVyLWhpcGNoYXQtZW50ZXJwcmlzZS9zZXJ2ZXIvYWRkZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiSGlwQ2hhdEVudGVycHJpc2VJbXBvcnRlckluZm8iLCJJbXBvcnRlckluZm8iLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwiY29uc3RydWN0b3IiLCJ0ZXh0IiwiaHJlZiIsIkhpcENoYXRFbnRlcnByaXNlSW1wb3J0ZXIiLCJCYXNlIiwiUHJvZ3Jlc3NTdGVwIiwiU2VsZWN0aW9uIiwiU2VsZWN0aW9uQ2hhbm5lbCIsIlNlbGVjdGlvblVzZXIiLCJSZWFkYWJsZSIsInBhdGgiLCJkZWZhdWx0IiwicyIsIlR1cm5kb3duU2VydmljZSIsInR1cm5kb3duU2VydmljZSIsInN0cm9uZ0RlbGltaXRlciIsImhyIiwiYnIiLCJhZGRSdWxlIiwiZmlsdGVyIiwicmVwbGFjZW1lbnQiLCJjb250ZW50Iiwibm9kZSIsInNyYyIsImdldEF0dHJpYnV0ZSIsImFsdCIsInRpdGxlIiwiaW5mbyIsInpsaWIiLCJ0YXJTdHJlYW0iLCJleHRyYWN0IiwibWVzc2FnZXMiLCJNYXAiLCJkaXJlY3RNZXNzYWdlcyIsInByZXBhcmUiLCJkYXRhVVJJIiwic2VudENvbnRlbnRUeXBlIiwiZmlsZU5hbWUiLCJ0ZW1wVXNlcnMiLCJ0ZW1wUm9vbXMiLCJ0ZW1wTWVzc2FnZXMiLCJ0ZW1wRGlyZWN0TWVzc2FnZXMiLCJwcm9taXNlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJvbiIsIk1ldGVvciIsImJpbmRFbnZpcm9ubWVudCIsImhlYWRlciIsInN0cmVhbSIsIm5leHQiLCJuYW1lIiwiZW5kc1dpdGgiLCJyZXN1bWUiLCJwYXJzZSIsImRhdGEiLCJjaHVuayIsInB1c2giLCJsb2dnZXIiLCJkZWJ1ZyIsImRhdGFTdHJpbmciLCJCdWZmZXIiLCJjb25jYXQiLCJ0b1N0cmluZyIsImZpbGUiLCJKU09OIiwiYmFzZSIsInVwZGF0ZVByb2dyZXNzIiwiUFJFUEFSSU5HX1VTRVJTIiwidSIsImlkIiwiVXNlciIsImVtYWlsIiwidXNlcm5hbWUiLCJtZW50aW9uX25hbWUiLCJhdmF0YXIiLCJyZXBsYWNlIiwidGltZXpvbmUiLCJpc0RlbGV0ZWQiLCJpc19kZWxldGVkIiwiUFJFUEFSSU5HX0NIQU5ORUxTIiwiciIsIlJvb20iLCJjcmVhdG9yIiwib3duZXIiLCJjcmVhdGVkIiwiRGF0ZSIsInNsdWdpZnkiLCJpc1ByaXZhdGUiLCJwcml2YWN5IiwiaXNBcmNoaXZlZCIsImlzX2FyY2hpdmVkIiwidG9waWMiLCJ0eXBlIiwiZGlyIiwic3BsaXQiLCJyb29tSWRlbnRpZmllciIsIm1zZ3MiLCJtIiwiUHJpdmF0ZVVzZXJNZXNzYWdlIiwic2VuZGVySWQiLCJzZW5kZXIiLCJyZWNlaXZlcklkIiwicmVjZWl2ZXIiLCJtZXNzYWdlIiwiaW5kZXhPZiIsInRzIiwidGltZXN0YW1wIiwiYXR0YWNobWVudCIsImF0dGFjaG1lbnRfcGF0aCIsInNldCIsInJvb21Nc2dzIiwiVXNlck1lc3NhZ2UiLCJ1c2VySWQiLCJOb3RpZmljYXRpb25NZXNzYWdlIiwiYWxpYXMiLCJtZXNzYWdlX2Zvcm1hdCIsInR1cm5kb3duIiwiVG9waWNSb29tTWVzc2FnZSIsIndhcm4iLCJlcnIiLCJ1c2Vyc0lkIiwiY29sbGVjdGlvbiIsImluc2VydCIsImltcG9ydCIsImltcG9ydFJlY29yZCIsIl9pZCIsImltcG9ydGVyIiwidXNlcnMiLCJmaW5kT25lIiwidXBkYXRlUmVjb3JkIiwibGVuZ3RoIiwiYWRkQ291bnRUb1RvdGFsIiwiY2hhbm5lbHNJZCIsImNoYW5uZWxzIiwiUFJFUEFSSU5HX01FU1NBR0VTIiwibWVzc2FnZXNDb3VudCIsImNoYW5uZWwiLCJlbnRyaWVzIiwiZ2V0IiwibWVzc2FnZXNzdGF0dXMiLCJnZXRCU09OU2l6ZSIsImdldE1heEJTT05TaXplIiwiZ2V0QlNPTlNhZmVBcnJheXNGcm9tQW5BcnJheSIsImZvckVhY2giLCJzcGxpdE1zZyIsImkiLCJtZXNzYWdlc0lkIiwiZGlyZWN0TXNnVXNlciIsIkVSUk9SIiwic2VsZWN0aW9uVXNlcnMiLCJtYXAiLCJzZWxlY3Rpb25DaGFubmVscyIsInNlbGVjdGlvbk1lc3NhZ2VzIiwiY291bnQiLCJVU0VSX1NFTEVDVElPTiIsInJlYWQiLCJwaXBlIiwiY3JlYXRlR3VuemlwIiwic3RhcnRJbXBvcnQiLCJpbXBvcnRTZWxlY3Rpb24iLCJzdGFydGVkIiwibm93IiwidXNlciIsInVzZXJfaWQiLCJkb19pbXBvcnQiLCJ1cGRhdGUiLCIkc2V0IiwiYyIsImNoYW5uZWxfaWQiLCJzdGFydGVkQnlVc2VySWQiLCJkZWZlciIsIklNUE9SVElOR19VU0VSUyIsInJ1bkFzVXNlciIsImV4aXN0YW50VXNlciIsIlJvY2tldENoYXQiLCJtb2RlbHMiLCJVc2VycyIsImZpbmRPbmVCeUVtYWlsQWRkcmVzcyIsImZpbmRPbmVCeVVzZXJuYW1lIiwicm9ja2V0SWQiLCIkYWRkVG9TZXQiLCJpbXBvcnRJZHMiLCJwYXNzd29yZCIsIlJhbmRvbSIsIkFjY291bnRzIiwiY3JlYXRlVXNlciIsImNhbGwiLCJqb2luRGVmYXVsdENoYW5uZWxzU2lsZW5jZWQiLCJzZXROYW1lIiwiZGVsZXRlZCIsImFkZENvdW50Q29tcGxldGVkIiwiSU1QT1JUSU5HX0NIQU5ORUxTIiwiZXhpc3RhbnRSb29tIiwiUm9vbXMiLCJmaW5kT25lQnlOYW1lIiwidG9VcHBlckNhc2UiLCJjcmVhdG9ySWQiLCJyb29tSW5mbyIsInJpZCIsIklNUE9SVElOR19NRVNTQUdFUyIsImNoIiwibWVzc2FnZXNNYXAiLCJoaXBDaGFubmVsIiwiZ2V0Q2hhbm5lbEZyb21Sb29tSWRlbnRpZmllciIsInJvb20iLCJmaW5kT25lQnlJZCIsImZpZWxkcyIsInVzZXJuYW1lcyIsInQiLCJtc2dHcm91cERhdGEiLCJtc2ciLCJpc05hTiIsImdldFJvY2tldFVzZXJGcm9tVXNlcklkIiwic2VuZE1lc3NhZ2UiLCJNZXNzYWdlcyIsImNyZWF0ZVJvb21TZXR0aW5nc0NoYW5nZWRXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyIiwiZGlyZWN0TXNnUm9vbSIsImRpcmVjdE1lc3NhZ2VzTWFwIiwiaGlwVXNlciIsImdldFVzZXJGcm9tRGlyZWN0TWVzc2FnZUlkZW50aWZpZXIiLCJzb3J0Iiwiam9pbiIsImRldGFpbHMiLCJtZXNzYWdlX2lkIiwic2l6ZSIsInVwbG9hZEZpbGUiLCJ1cmwiLCJGSU5JU0hJTkciLCJET05FIiwiZSIsImVycm9yIiwidGltZVRvb2siLCJsb2ciLCJnZXRQcm9ncmVzcyIsImdldFNlbGVjdGlvbiIsImRpcmVjdElkZW50aWZpZXIiLCJJbXBvcnRlcnMiLCJhZGQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsTUFBUCxDQUFjO0FBQUNDLGlDQUE4QixNQUFJQTtBQUFuQyxDQUFkO0FBQWlGLElBQUlDLFlBQUo7QUFBaUJILE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSw0QkFBUixDQUFiLEVBQW1EO0FBQUNGLGVBQWFHLENBQWIsRUFBZTtBQUFDSCxtQkFBYUcsQ0FBYjtBQUFlOztBQUFoQyxDQUFuRCxFQUFxRixDQUFyRjs7QUFFM0YsTUFBTUosNkJBQU4sU0FBNENDLFlBQTVDLENBQXlEO0FBQy9ESSxnQkFBYztBQUNiLFVBQU0sbUJBQU4sRUFBMkIsa0JBQTNCLEVBQStDLGtCQUEvQyxFQUFtRSxDQUNsRTtBQUNDQyxZQUFNLHdDQURQO0FBRUNDLFlBQU07QUFGUCxLQURrRSxDQUFuRTtBQU1BOztBQVI4RCxDOzs7Ozs7Ozs7OztBQ0ZoRVQsT0FBT0MsTUFB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RUFBb0csQ0FBcEc7QUFBdUcsSUFBSUkseUJBQUo7QUFBOEJWLE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFBQ0ssNEJBQTBCSixDQUExQixFQUE0QjtBQUFDSSxnQ0FBMEJKLENBQTFCO0FBQTRCOztBQUExRCxDQUFuQyxFQUErRixDQUEvRjtBQUl2UStPLFVBQVVDLEdBQVYsQ0FBYyxJQUFJcFAsNkJBQUosRUFBZCxFQUFtRFEseUJBQW5ELEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfaW1wb3J0ZXItaGlwY2hhdC1lbnRlcnByaXNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSW1wb3J0ZXJJbmZvIH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6aW1wb3J0ZXInO1xuXG5leHBvcnQgY2xhc3MgSGlwQ2hhdEVudGVycHJpc2VJbXBvcnRlckluZm8gZXh0ZW5kcyBJbXBvcnRlckluZm8ge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignaGlwY2hhdGVudGVycHJpc2UnLCAnSGlwQ2hhdCAodGFyLmd6KScsICdhcHBsaWNhdGlvbi9nemlwJywgW1xuXHRcdFx0e1xuXHRcdFx0XHR0ZXh0OiAnSW1wb3J0ZXJfSGlwQ2hhdEVudGVycHJpc2VfSW5mb3JtYXRpb24nLFxuXHRcdFx0XHRocmVmOiAnaHR0cHM6Ly9yb2NrZXQuY2hhdC9kb2NzL2FkbWluaXN0cmF0b3ItZ3VpZGVzL2ltcG9ydC9oaXBjaGF0L2VudGVycHJpc2UvJyxcblx0XHRcdH0sXG5cdFx0XSk7XG5cdH1cbn1cbiIsImltcG9ydCB7XG5cdEJhc2UsXG5cdFByb2dyZXNzU3RlcCxcblx0U2VsZWN0aW9uLFxuXHRTZWxlY3Rpb25DaGFubmVsLFxuXHRTZWxlY3Rpb25Vc2VyLFxufSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDppbXBvcnRlcic7XG5pbXBvcnQgeyBSZWFkYWJsZSB9IGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcbmltcG9ydCBUdXJuZG93blNlcnZpY2UgZnJvbSAndHVybmRvd24nO1xuXG5jb25zdCB0dXJuZG93blNlcnZpY2UgPSBuZXcgVHVybmRvd25TZXJ2aWNlKHtcblx0c3Ryb25nRGVsaW1pdGVyOiAnKicsXG5cdGhyOiAnJyxcblx0YnI6ICdcXG4nLFxufSk7XG5cbnR1cm5kb3duU2VydmljZS5hZGRSdWxlKCdzdHJpa2V0aHJvdWdoJywge1xuXHRmaWx0ZXI6ICdpbWcnLFxuXG5cdHJlcGxhY2VtZW50KGNvbnRlbnQsIG5vZGUpIHtcblx0XHRjb25zdCBzcmMgPSBub2RlLmdldEF0dHJpYnV0ZSgnc3JjJykgfHwgJyc7XG5cdFx0Y29uc3QgYWx0ID0gbm9kZS5hbHQgfHwgbm9kZS50aXRsZSB8fCBzcmM7XG5cdFx0cmV0dXJuIHNyYyA/IGBbJHsgYWx0IH1dKCR7IHNyYyB9KWAgOiAnJztcblx0fSxcbn0pO1xuXG5leHBvcnQgY2xhc3MgSGlwQ2hhdEVudGVycHJpc2VJbXBvcnRlciBleHRlbmRzIEJhc2Uge1xuXHRjb25zdHJ1Y3RvcihpbmZvKSB7XG5cdFx0c3VwZXIoaW5mbyk7XG5cblx0XHR0aGlzLlJlYWRhYmxlID0gUmVhZGFibGU7XG5cdFx0dGhpcy56bGliID0gcmVxdWlyZSgnemxpYicpO1xuXHRcdHRoaXMudGFyU3RyZWFtID0gcmVxdWlyZSgndGFyLXN0cmVhbScpO1xuXHRcdHRoaXMuZXh0cmFjdCA9IHRoaXMudGFyU3RyZWFtLmV4dHJhY3QoKTtcblx0XHR0aGlzLnBhdGggPSBwYXRoO1xuXHRcdHRoaXMubWVzc2FnZXMgPSBuZXcgTWFwKCk7XG5cdFx0dGhpcy5kaXJlY3RNZXNzYWdlcyA9IG5ldyBNYXAoKTtcblx0fVxuXG5cdHByZXBhcmUoZGF0YVVSSSwgc2VudENvbnRlbnRUeXBlLCBmaWxlTmFtZSkge1xuXHRcdHN1cGVyLnByZXBhcmUoZGF0YVVSSSwgc2VudENvbnRlbnRUeXBlLCBmaWxlTmFtZSk7XG5cblx0XHRjb25zdCB0ZW1wVXNlcnMgPSBbXTtcblx0XHRjb25zdCB0ZW1wUm9vbXMgPSBbXTtcblx0XHRjb25zdCB0ZW1wTWVzc2FnZXMgPSBuZXcgTWFwKCk7XG5cdFx0Y29uc3QgdGVtcERpcmVjdE1lc3NhZ2VzID0gbmV3IE1hcCgpO1xuXHRcdGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHR0aGlzLmV4dHJhY3Qub24oJ2VudHJ5JywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoaGVhZGVyLCBzdHJlYW0sIG5leHQpID0+IHtcblx0XHRcdFx0aWYgKCFoZWFkZXIubmFtZS5lbmRzV2l0aCgnLmpzb24nKSkge1xuXHRcdFx0XHRcdHN0cmVhbS5yZXN1bWUoKTtcblx0XHRcdFx0XHRyZXR1cm4gbmV4dCgpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3QgaW5mbyA9IHRoaXMucGF0aC5wYXJzZShoZWFkZXIubmFtZSk7XG5cdFx0XHRcdGNvbnN0IGRhdGEgPSBbXTtcblxuXHRcdFx0XHRzdHJlYW0ub24oJ2RhdGEnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChjaHVuaykgPT4ge1xuXHRcdFx0XHRcdGRhdGEucHVzaChjaHVuayk7XG5cdFx0XHRcdH0pKTtcblxuXHRcdFx0XHRzdHJlYW0ub24oJ2VuZCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuXHRcdFx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKGBQcm9jZXNzaW5nIHRoZSBmaWxlOiAkeyBoZWFkZXIubmFtZSB9YCk7XG5cdFx0XHRcdFx0Y29uc3QgZGF0YVN0cmluZyA9IEJ1ZmZlci5jb25jYXQoZGF0YSkudG9TdHJpbmcoKTtcblx0XHRcdFx0XHRjb25zdCBmaWxlID0gSlNPTi5wYXJzZShkYXRhU3RyaW5nKTtcblxuXHRcdFx0XHRcdGlmIChpbmZvLmJhc2UgPT09ICd1c2Vycy5qc29uJykge1xuXHRcdFx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLlBSRVBBUklOR19VU0VSUyk7XG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IHUgb2YgZmlsZSkge1xuXHRcdFx0XHRcdFx0XHQvLyBpZiAoIXUuVXNlci5lbWFpbCkge1xuXHRcdFx0XHRcdFx0XHQvLyBcdC8vIGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0XHQvLyB9XG5cdFx0XHRcdFx0XHRcdHRlbXBVc2Vycy5wdXNoKHtcblx0XHRcdFx0XHRcdFx0XHRpZDogdS5Vc2VyLmlkLFxuXHRcdFx0XHRcdFx0XHRcdGVtYWlsOiB1LlVzZXIuZW1haWwsXG5cdFx0XHRcdFx0XHRcdFx0bmFtZTogdS5Vc2VyLm5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0dXNlcm5hbWU6IHUuVXNlci5tZW50aW9uX25hbWUsXG5cdFx0XHRcdFx0XHRcdFx0YXZhdGFyOiB1LlVzZXIuYXZhdGFyICYmIHUuVXNlci5hdmF0YXIucmVwbGFjZSgvXFxuL2csICcnKSxcblx0XHRcdFx0XHRcdFx0XHR0aW1lem9uZTogdS5Vc2VyLnRpbWV6b25lLFxuXHRcdFx0XHRcdFx0XHRcdGlzRGVsZXRlZDogdS5Vc2VyLmlzX2RlbGV0ZWQsXG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoaW5mby5iYXNlID09PSAncm9vbXMuanNvbicpIHtcblx0XHRcdFx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5QUkVQQVJJTkdfQ0hBTk5FTFMpO1xuXHRcdFx0XHRcdFx0Zm9yIChjb25zdCByIG9mIGZpbGUpIHtcblx0XHRcdFx0XHRcdFx0dGVtcFJvb21zLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdGlkOiByLlJvb20uaWQsXG5cdFx0XHRcdFx0XHRcdFx0Y3JlYXRvcjogci5Sb29tLm93bmVyLFxuXHRcdFx0XHRcdFx0XHRcdGNyZWF0ZWQ6IG5ldyBEYXRlKHIuUm9vbS5jcmVhdGVkKSxcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiBzLnNsdWdpZnkoci5Sb29tLm5hbWUpLFxuXHRcdFx0XHRcdFx0XHRcdGlzUHJpdmF0ZTogci5Sb29tLnByaXZhY3kgPT09ICdwcml2YXRlJyxcblx0XHRcdFx0XHRcdFx0XHRpc0FyY2hpdmVkOiByLlJvb20uaXNfYXJjaGl2ZWQsXG5cdFx0XHRcdFx0XHRcdFx0dG9waWM6IHIuUm9vbS50b3BpYyxcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChpbmZvLmJhc2UgPT09ICdoaXN0b3J5Lmpzb24nKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBbdHlwZSwgaWRdID0gaW5mby5kaXIuc3BsaXQoJy8nKTsgLy8gWyd1c2VycycsICcxJ11cblx0XHRcdFx0XHRcdGNvbnN0IHJvb21JZGVudGlmaWVyID0gYCR7IHR5cGUgfS8keyBpZCB9YDtcblx0XHRcdFx0XHRcdGlmICh0eXBlID09PSAndXNlcnMnKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IG1zZ3MgPSBbXTtcblx0XHRcdFx0XHRcdFx0Zm9yIChjb25zdCBtIG9mIGZpbGUpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAobS5Qcml2YXRlVXNlck1lc3NhZ2UpIHtcblx0XHRcdFx0XHRcdFx0XHRcdG1zZ3MucHVzaCh7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6ICd1c2VyJyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWQ6IGBoaXBjaGF0ZW50ZXJwcmlzZS0keyBtLlByaXZhdGVVc2VyTWVzc2FnZS5pZCB9YCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0c2VuZGVySWQ6IG0uUHJpdmF0ZVVzZXJNZXNzYWdlLnNlbmRlci5pZCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmVjZWl2ZXJJZDogbS5Qcml2YXRlVXNlck1lc3NhZ2UucmVjZWl2ZXIuaWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRleHQ6IG0uUHJpdmF0ZVVzZXJNZXNzYWdlLm1lc3NhZ2UuaW5kZXhPZignL21lICcpID09PSAtMSA/IG0uUHJpdmF0ZVVzZXJNZXNzYWdlLm1lc3NhZ2UgOiBgJHsgbS5Qcml2YXRlVXNlck1lc3NhZ2UubWVzc2FnZS5yZXBsYWNlKC9cXC9tZSAvLCAnXycpIH1fYCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0dHM6IG5ldyBEYXRlKG0uUHJpdmF0ZVVzZXJNZXNzYWdlLnRpbWVzdGFtcC5zcGxpdCgnICcpWzBdKSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0YXR0YWNobWVudDogbS5Qcml2YXRlVXNlck1lc3NhZ2UuYXR0YWNobWVudCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0YXR0YWNobWVudF9wYXRoOiBtLlByaXZhdGVVc2VyTWVzc2FnZS5hdHRhY2htZW50X3BhdGgsXG5cdFx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0dGVtcERpcmVjdE1lc3NhZ2VzLnNldChyb29tSWRlbnRpZmllciwgbXNncyk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHR5cGUgPT09ICdyb29tcycpIHtcblx0XHRcdFx0XHRcdFx0Y29uc3Qgcm9vbU1zZ3MgPSBbXTtcblxuXHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IG0gb2YgZmlsZSkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChtLlVzZXJNZXNzYWdlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyb29tTXNncy5wdXNoKHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogJ3VzZXInLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZDogYGhpcGNoYXRlbnRlcnByaXNlLSR7IGlkIH0tJHsgbS5Vc2VyTWVzc2FnZS5pZCB9YCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0dXNlcklkOiBtLlVzZXJNZXNzYWdlLnNlbmRlci5pZCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogbS5Vc2VyTWVzc2FnZS5tZXNzYWdlLmluZGV4T2YoJy9tZSAnKSA9PT0gLTEgPyBtLlVzZXJNZXNzYWdlLm1lc3NhZ2UgOiBgJHsgbS5Vc2VyTWVzc2FnZS5tZXNzYWdlLnJlcGxhY2UoL1xcL21lIC8sICdfJykgfV9gLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0czogbmV3IERhdGUobS5Vc2VyTWVzc2FnZS50aW1lc3RhbXAuc3BsaXQoJyAnKVswXSksXG5cdFx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKG0uTm90aWZpY2F0aW9uTWVzc2FnZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgdGV4dCA9IG0uTm90aWZpY2F0aW9uTWVzc2FnZS5tZXNzYWdlLmluZGV4T2YoJy9tZSAnKSA9PT0gLTEgPyBtLk5vdGlmaWNhdGlvbk1lc3NhZ2UubWVzc2FnZSA6IGAkeyBtLk5vdGlmaWNhdGlvbk1lc3NhZ2UubWVzc2FnZS5yZXBsYWNlKC9cXC9tZSAvLCAnXycpIH1fYDtcblxuXHRcdFx0XHRcdFx0XHRcdFx0cm9vbU1zZ3MucHVzaCh7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6ICd1c2VyJyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWQ6IGBoaXBjaGF0ZW50ZXJwcmlzZS0keyBpZCB9LSR7IG0uTm90aWZpY2F0aW9uTWVzc2FnZS5pZCB9YCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0dXNlcklkOiAncm9ja2V0LmNhdCcsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGFsaWFzOiBtLk5vdGlmaWNhdGlvbk1lc3NhZ2Uuc2VuZGVyLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBtLk5vdGlmaWNhdGlvbk1lc3NhZ2UubWVzc2FnZV9mb3JtYXQgPT09ICdodG1sJyA/IHR1cm5kb3duU2VydmljZS50dXJuZG93bih0ZXh0KSA6IHRleHQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRzOiBuZXcgRGF0ZShtLk5vdGlmaWNhdGlvbk1lc3NhZ2UudGltZXN0YW1wLnNwbGl0KCcgJylbMF0pLFxuXHRcdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChtLlRvcGljUm9vbU1lc3NhZ2UpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJvb21Nc2dzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiAndG9waWMnLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZDogYGhpcGNoYXRlbnRlcnByaXNlLSR7IGlkIH0tJHsgbS5Ub3BpY1Jvb21NZXNzYWdlLmlkIH1gLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR1c2VySWQ6IG0uVG9waWNSb29tTWVzc2FnZS5zZW5kZXIuaWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRzOiBuZXcgRGF0ZShtLlRvcGljUm9vbU1lc3NhZ2UudGltZXN0YW1wLnNwbGl0KCcgJylbMF0pLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBtLlRvcGljUm9vbU1lc3NhZ2UubWVzc2FnZSxcblx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKCdIaXBDaGF0IEVudGVycHJpc2UgaW1wb3J0ZXIgaXNuXFwndCBjb25maWd1cmVkIHRvIGhhbmRsZSB0aGlzIG1lc3NhZ2U6JywgbSk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHRlbXBNZXNzYWdlcy5zZXQocm9vbUlkZW50aWZpZXIsIHJvb21Nc2dzKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMubG9nZ2VyLndhcm4oYEhpcENoYXQgRW50ZXJwcmlzZSBpbXBvcnRlciBpc24ndCBjb25maWd1cmVkIHRvIGhhbmRsZSBcIiR7IHR5cGUgfVwiIGZpbGVzLmApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBXaGF0IGFyZSB0aGVzZSBmaWxlcyE/XG5cdFx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKGBIaXBDaGF0IEVudGVycHJpc2UgaW1wb3J0ZXIgZG9lc24ndCBrbm93IHdoYXQgdG8gZG8gd2l0aCB0aGUgZmlsZSBcIiR7IGhlYWRlci5uYW1lIH1cIiA6b2AsIGluZm8pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRuZXh0KCk7XG5cdFx0XHRcdH0pKTtcblx0XHRcdFx0c3RyZWFtLm9uKCdlcnJvcicsICgpID0+IG5leHQoKSk7XG5cblx0XHRcdFx0c3RyZWFtLnJlc3VtZSgpO1xuXHRcdFx0fSkpO1xuXG5cdFx0XHR0aGlzLmV4dHJhY3Qub24oJ2Vycm9yJywgKGVycikgPT4ge1xuXHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKCdleHRyYWN0IGVycm9yOicsIGVycik7XG5cdFx0XHRcdHJlamVjdCgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuZXh0cmFjdC5vbignZmluaXNoJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG5cdFx0XHRcdC8vIEluc2VydCB0aGUgdXNlcnMgcmVjb3JkLCBldmVudHVhbGx5IHRoaXMgbWlnaHQgaGF2ZSB0byBiZSBzcGxpdCBpbnRvIHNldmVyYWwgb25lcyBhcyB3ZWxsXG5cdFx0XHRcdC8vIGlmIHNvbWVvbmUgdHJpZXMgdG8gaW1wb3J0IGEgc2V2ZXJhbCB0aG91c2FuZHMgdXNlcnMgaW5zdGFuY2Vcblx0XHRcdFx0Y29uc3QgdXNlcnNJZCA9IHRoaXMuY29sbGVjdGlvbi5pbnNlcnQoeyBpbXBvcnQ6IHRoaXMuaW1wb3J0UmVjb3JkLl9pZCwgaW1wb3J0ZXI6IHRoaXMubmFtZSwgdHlwZTogJ3VzZXJzJywgdXNlcnM6IHRlbXBVc2VycyB9KTtcblx0XHRcdFx0dGhpcy51c2VycyA9IHRoaXMuY29sbGVjdGlvbi5maW5kT25lKHVzZXJzSWQpO1xuXHRcdFx0XHRzdXBlci51cGRhdGVSZWNvcmQoeyAnY291bnQudXNlcnMnOiB0ZW1wVXNlcnMubGVuZ3RoIH0pO1xuXHRcdFx0XHRzdXBlci5hZGRDb3VudFRvVG90YWwodGVtcFVzZXJzLmxlbmd0aCk7XG5cblx0XHRcdFx0Ly8gSW5zZXJ0IHRoZSBjaGFubmVscyByZWNvcmRzLlxuXHRcdFx0XHRjb25zdCBjaGFubmVsc0lkID0gdGhpcy5jb2xsZWN0aW9uLmluc2VydCh7IGltcG9ydDogdGhpcy5pbXBvcnRSZWNvcmQuX2lkLCBpbXBvcnRlcjogdGhpcy5uYW1lLCB0eXBlOiAnY2hhbm5lbHMnLCBjaGFubmVsczogdGVtcFJvb21zIH0pO1xuXHRcdFx0XHR0aGlzLmNoYW5uZWxzID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoY2hhbm5lbHNJZCk7XG5cdFx0XHRcdHN1cGVyLnVwZGF0ZVJlY29yZCh7ICdjb3VudC5jaGFubmVscyc6IHRlbXBSb29tcy5sZW5ndGggfSk7XG5cdFx0XHRcdHN1cGVyLmFkZENvdW50VG9Ub3RhbCh0ZW1wUm9vbXMubGVuZ3RoKTtcblxuXHRcdFx0XHQvLyBTYXZlIHRoZSBtZXNzYWdlcyByZWNvcmRzIHRvIHRoZSBpbXBvcnQgcmVjb3JkIGZvciBgc3RhcnRJbXBvcnRgIHVzYWdlXG5cdFx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5QUkVQQVJJTkdfTUVTU0FHRVMpO1xuXHRcdFx0XHRsZXQgbWVzc2FnZXNDb3VudCA9IDA7XG5cdFx0XHRcdGZvciAoY29uc3QgW2NoYW5uZWwsIG1zZ3NdIG9mIHRlbXBNZXNzYWdlcy5lbnRyaWVzKCkpIHtcblx0XHRcdFx0XHRpZiAoIXRoaXMubWVzc2FnZXMuZ2V0KGNoYW5uZWwpKSB7XG5cdFx0XHRcdFx0XHR0aGlzLm1lc3NhZ2VzLnNldChjaGFubmVsLCBuZXcgTWFwKCkpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG1lc3NhZ2VzQ291bnQgKz0gbXNncy5sZW5ndGg7XG5cdFx0XHRcdFx0c3VwZXIudXBkYXRlUmVjb3JkKHsgbWVzc2FnZXNzdGF0dXM6IGNoYW5uZWwgfSk7XG5cblx0XHRcdFx0XHRpZiAoQmFzZS5nZXRCU09OU2l6ZShtc2dzKSA+IEJhc2UuZ2V0TWF4QlNPTlNpemUoKSkge1xuXHRcdFx0XHRcdFx0QmFzZS5nZXRCU09OU2FmZUFycmF5c0Zyb21BbkFycmF5KG1zZ3MpLmZvckVhY2goKHNwbGl0TXNnLCBpKSA9PiB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IG1lc3NhZ2VzSWQgPSB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHsgaW1wb3J0OiB0aGlzLmltcG9ydFJlY29yZC5faWQsIGltcG9ydGVyOiB0aGlzLm5hbWUsIHR5cGU6ICdtZXNzYWdlcycsIG5hbWU6IGAkeyBjaGFubmVsIH0vJHsgaSB9YCwgbWVzc2FnZXM6IHNwbGl0TXNnIH0pO1xuXHRcdFx0XHRcdFx0XHR0aGlzLm1lc3NhZ2VzLmdldChjaGFubmVsKS5zZXQoYCR7IGNoYW5uZWwgfS4keyBpIH1gLCB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShtZXNzYWdlc0lkKSk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y29uc3QgbWVzc2FnZXNJZCA9IHRoaXMuY29sbGVjdGlvbi5pbnNlcnQoeyBpbXBvcnQ6IHRoaXMuaW1wb3J0UmVjb3JkLl9pZCwgaW1wb3J0ZXI6IHRoaXMubmFtZSwgdHlwZTogJ21lc3NhZ2VzJywgbmFtZTogYCR7IGNoYW5uZWwgfWAsIG1lc3NhZ2VzOiBtc2dzIH0pO1xuXHRcdFx0XHRcdFx0dGhpcy5tZXNzYWdlcy5nZXQoY2hhbm5lbCkuc2V0KGNoYW5uZWwsIHRoaXMuY29sbGVjdGlvbi5maW5kT25lKG1lc3NhZ2VzSWQpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmb3IgKGNvbnN0IFtkaXJlY3RNc2dVc2VyLCBtc2dzXSBvZiB0ZW1wRGlyZWN0TWVzc2FnZXMuZW50cmllcygpKSB7XG5cdFx0XHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoYFByZXBhcmluZyB0aGUgZGlyZWN0IG1lc3NhZ2VzIGZvcjogJHsgZGlyZWN0TXNnVXNlciB9YCk7XG5cdFx0XHRcdFx0aWYgKCF0aGlzLmRpcmVjdE1lc3NhZ2VzLmdldChkaXJlY3RNc2dVc2VyKSkge1xuXHRcdFx0XHRcdFx0dGhpcy5kaXJlY3RNZXNzYWdlcy5zZXQoZGlyZWN0TXNnVXNlciwgbmV3IE1hcCgpKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRtZXNzYWdlc0NvdW50ICs9IG1zZ3MubGVuZ3RoO1xuXHRcdFx0XHRcdHN1cGVyLnVwZGF0ZVJlY29yZCh7IG1lc3NhZ2Vzc3RhdHVzOiBkaXJlY3RNc2dVc2VyIH0pO1xuXG5cdFx0XHRcdFx0aWYgKEJhc2UuZ2V0QlNPTlNpemUobXNncykgPiBCYXNlLmdldE1heEJTT05TaXplKCkpIHtcblx0XHRcdFx0XHRcdEJhc2UuZ2V0QlNPTlNhZmVBcnJheXNGcm9tQW5BcnJheShtc2dzKS5mb3JFYWNoKChzcGxpdE1zZywgaSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBtZXNzYWdlc0lkID0gdGhpcy5jb2xsZWN0aW9uLmluc2VydCh7IGltcG9ydDogdGhpcy5pbXBvcnRSZWNvcmQuX2lkLCBpbXBvcnRlcjogdGhpcy5uYW1lLCB0eXBlOiAnZGlyZWN0TWVzc2FnZXMnLCBuYW1lOiBgJHsgZGlyZWN0TXNnVXNlciB9LyR7IGkgfWAsIG1lc3NhZ2VzOiBzcGxpdE1zZyB9KTtcblx0XHRcdFx0XHRcdFx0dGhpcy5kaXJlY3RNZXNzYWdlcy5nZXQoZGlyZWN0TXNnVXNlcikuc2V0KGAkeyBkaXJlY3RNc2dVc2VyIH0uJHsgaSB9YCwgdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUobWVzc2FnZXNJZCkpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNvbnN0IG1lc3NhZ2VzSWQgPSB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHsgaW1wb3J0OiB0aGlzLmltcG9ydFJlY29yZC5faWQsIGltcG9ydGVyOiB0aGlzLm5hbWUsIHR5cGU6ICdkaXJlY3RNZXNzYWdlcycsIG5hbWU6IGAkeyBkaXJlY3RNc2dVc2VyIH1gLCBtZXNzYWdlczogbXNncyB9KTtcblx0XHRcdFx0XHRcdHRoaXMuZGlyZWN0TWVzc2FnZXMuZ2V0KGRpcmVjdE1zZ1VzZXIpLnNldChkaXJlY3RNc2dVc2VyLCB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShtZXNzYWdlc0lkKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0c3VwZXIudXBkYXRlUmVjb3JkKHsgJ2NvdW50Lm1lc3NhZ2VzJzogbWVzc2FnZXNDb3VudCwgbWVzc2FnZXNzdGF0dXM6IG51bGwgfSk7XG5cdFx0XHRcdHN1cGVyLmFkZENvdW50VG9Ub3RhbChtZXNzYWdlc0NvdW50KTtcblxuXHRcdFx0XHQvLyBFbnN1cmUgd2UgaGF2ZSBzb21lIHVzZXJzLCBjaGFubmVscywgYW5kIG1lc3NhZ2VzXG5cdFx0XHRcdGlmICh0ZW1wVXNlcnMubGVuZ3RoID09PSAwIHx8IHRlbXBSb29tcy5sZW5ndGggPT09IDAgfHwgbWVzc2FnZXNDb3VudCA9PT0gMCkge1xuXHRcdFx0XHRcdHRoaXMubG9nZ2VyLndhcm4oYFRoZSBsb2FkZWQgdXNlcnMgY291bnQgJHsgdGVtcFVzZXJzLmxlbmd0aCB9LCB0aGUgbG9hZGVkIHJvb21zICR7IHRlbXBSb29tcy5sZW5ndGggfSwgYW5kIHRoZSBsb2FkZWQgbWVzc2FnZXMgJHsgbWVzc2FnZXNDb3VudCB9YCk7XG5cdFx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLkVSUk9SKTtcblx0XHRcdFx0XHRyZWplY3QoKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBzZWxlY3Rpb25Vc2VycyA9IHRlbXBVc2Vycy5tYXAoKHUpID0+IG5ldyBTZWxlY3Rpb25Vc2VyKHUuaWQsIHUudXNlcm5hbWUsIHUuZW1haWwsIHUuaXNEZWxldGVkLCBmYWxzZSwgdHJ1ZSkpO1xuXHRcdFx0XHRjb25zdCBzZWxlY3Rpb25DaGFubmVscyA9IHRlbXBSb29tcy5tYXAoKHIpID0+IG5ldyBTZWxlY3Rpb25DaGFubmVsKHIuaWQsIHIubmFtZSwgci5pc0FyY2hpdmVkLCB0cnVlLCByLmlzUHJpdmF0ZSkpO1xuXHRcdFx0XHRjb25zdCBzZWxlY3Rpb25NZXNzYWdlcyA9IHRoaXMuaW1wb3J0UmVjb3JkLmNvdW50Lm1lc3NhZ2VzO1xuXG5cdFx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5VU0VSX1NFTEVDVElPTik7XG5cblx0XHRcdFx0cmVzb2x2ZShuZXcgU2VsZWN0aW9uKHRoaXMubmFtZSwgc2VsZWN0aW9uVXNlcnMsIHNlbGVjdGlvbkNoYW5uZWxzLCBzZWxlY3Rpb25NZXNzYWdlcykpO1xuXHRcdFx0fSkpO1xuXG5cdFx0XHQvLyBXaXNoIEkgY291bGQgbWFrZSB0aGlzIGNsZWFuZXIgOihcblx0XHRcdGNvbnN0IHNwbGl0ID0gZGF0YVVSSS5zcGxpdCgnLCcpO1xuXHRcdFx0Y29uc3QgcmVhZCA9IG5ldyB0aGlzLlJlYWRhYmxlO1xuXHRcdFx0cmVhZC5wdXNoKG5ldyBCdWZmZXIoc3BsaXRbc3BsaXQubGVuZ3RoIC0gMV0sICdiYXNlNjQnKSk7XG5cdFx0XHRyZWFkLnB1c2gobnVsbCk7XG5cdFx0XHRyZWFkLnBpcGUodGhpcy56bGliLmNyZWF0ZUd1bnppcCgpKS5waXBlKHRoaXMuZXh0cmFjdCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gcHJvbWlzZTtcblx0fVxuXG5cdHN0YXJ0SW1wb3J0KGltcG9ydFNlbGVjdGlvbikge1xuXHRcdHN1cGVyLnN0YXJ0SW1wb3J0KGltcG9ydFNlbGVjdGlvbik7XG5cdFx0Y29uc3Qgc3RhcnRlZCA9IERhdGUubm93KCk7XG5cblx0XHQvLyBFbnN1cmUgd2UncmUgb25seSBnb2luZyB0byBpbXBvcnQgdGhlIHVzZXJzIHRoYXQgdGhlIHVzZXIgaGFzIHNlbGVjdGVkXG5cdFx0Zm9yIChjb25zdCB1c2VyIG9mIGltcG9ydFNlbGVjdGlvbi51c2Vycykge1xuXHRcdFx0Zm9yIChjb25zdCB1IG9mIHRoaXMudXNlcnMudXNlcnMpIHtcblx0XHRcdFx0aWYgKHUuaWQgPT09IHVzZXIudXNlcl9pZCkge1xuXHRcdFx0XHRcdHUuZG9faW1wb3J0ID0gdXNlci5kb19pbXBvcnQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy5jb2xsZWN0aW9uLnVwZGF0ZSh7IF9pZDogdGhpcy51c2Vycy5faWQgfSwgeyAkc2V0OiB7IHVzZXJzOiB0aGlzLnVzZXJzLnVzZXJzIH0gfSk7XG5cblx0XHQvLyBFbnN1cmUgd2UncmUgb25seSBpbXBvcnRpbmcgdGhlIGNoYW5uZWxzIHRoZSB1c2VyIGhhcyBzZWxlY3RlZC5cblx0XHRmb3IgKGNvbnN0IGNoYW5uZWwgb2YgaW1wb3J0U2VsZWN0aW9uLmNoYW5uZWxzKSB7XG5cdFx0XHRmb3IgKGNvbnN0IGMgb2YgdGhpcy5jaGFubmVscy5jaGFubmVscykge1xuXHRcdFx0XHRpZiAoYy5pZCA9PT0gY2hhbm5lbC5jaGFubmVsX2lkKSB7XG5cdFx0XHRcdFx0Yy5kb19pbXBvcnQgPSBjaGFubmVsLmRvX2ltcG9ydDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLmNvbGxlY3Rpb24udXBkYXRlKHsgX2lkOiB0aGlzLmNoYW5uZWxzLl9pZCB9LCB7ICRzZXQ6IHsgY2hhbm5lbHM6IHRoaXMuY2hhbm5lbHMuY2hhbm5lbHMgfSB9KTtcblxuXHRcdGNvbnN0IHN0YXJ0ZWRCeVVzZXJJZCA9IE1ldGVvci51c2VySWQoKTtcblx0XHRNZXRlb3IuZGVmZXIoKCkgPT4ge1xuXHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLklNUE9SVElOR19VU0VSUyk7XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdC8vIEltcG9ydCB0aGUgdXNlcnNcblx0XHRcdFx0Zm9yIChjb25zdCB1IG9mIHRoaXMudXNlcnMudXNlcnMpIHtcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZyhgU3RhcnRpbmcgdGhlIHVzZXIgaW1wb3J0OiAkeyB1LnVzZXJuYW1lIH0gYW5kIGFyZSB3ZSBpbXBvcnRpbmcgdGhlbT8gJHsgdS5kb19pbXBvcnQgfWApO1xuXHRcdFx0XHRcdGlmICghdS5kb19pbXBvcnQpIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIoc3RhcnRlZEJ5VXNlcklkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRsZXQgZXhpc3RhbnRVc2VyO1xuXG5cdFx0XHRcdFx0XHRpZiAodS5lbWFpbCkge1xuXHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlFbWFpbEFkZHJlc3ModS5lbWFpbCk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdC8vIElmIHdlIGNvdWxkbid0IGZpbmQgb25lIGJ5IHRoZWlyIGVtYWlsIGFkZHJlc3MsIHRyeSB0byBmaW5kIGFuIGV4aXN0aW5nIHVzZXIgYnkgdGhlaXIgdXNlcm5hbWVcblx0XHRcdFx0XHRcdGlmICghZXhpc3RhbnRVc2VyKSB7XG5cdFx0XHRcdFx0XHRcdGV4aXN0YW50VXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeVVzZXJuYW1lKHUudXNlcm5hbWUpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoZXhpc3RhbnRVc2VyKSB7XG5cdFx0XHRcdFx0XHRcdC8vIHNpbmNlIHdlIGhhdmUgYW4gZXhpc3RpbmcgdXNlciwgbGV0J3MgdHJ5IGEgZmV3IHRoaW5nc1xuXHRcdFx0XHRcdFx0XHR1LnJvY2tldElkID0gZXhpc3RhbnRVc2VyLl9pZDtcblx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMudXBkYXRlKHsgX2lkOiB1LnJvY2tldElkIH0sIHsgJGFkZFRvU2V0OiB7IGltcG9ydElkczogdS5pZCB9IH0pO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgdXNlciA9IHsgZW1haWw6IHUuZW1haWwsIHBhc3N3b3JkOiBSYW5kb20uaWQoKSB9O1xuXHRcdFx0XHRcdFx0XHRpZiAoIXVzZXIuZW1haWwpIHtcblx0XHRcdFx0XHRcdFx0XHRkZWxldGUgdXNlci5lbWFpbDtcblx0XHRcdFx0XHRcdFx0XHR1c2VyLnVzZXJuYW1lID0gdS51c2VybmFtZTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHVzZXJJZCA9IEFjY291bnRzLmNyZWF0ZVVzZXIodXNlcik7XG5cdFx0XHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodXNlcklkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0TWV0ZW9yLmNhbGwoJ3NldFVzZXJuYW1lJywgdS51c2VybmFtZSwgeyBqb2luRGVmYXVsdENoYW5uZWxzU2lsZW5jZWQ6IHRydWUgfSk7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gVE9ETzogVXNlIG1vbWVudCB0aW1lem9uZSB0byBjYWxjIHRoZSB0aW1lIG9mZnNldCAtIE1ldGVvci5jYWxsICd1c2VyU2V0VXRjT2Zmc2V0JywgdXNlci50el9vZmZzZXQgLyAzNjAwXG5cdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuc2V0TmFtZSh1c2VySWQsIHUubmFtZSk7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gVE9ETzogVGhpbmsgYWJvdXQgdXNpbmcgYSBjdXN0b20gZmllbGQgZm9yIHRoZSB1c2VycyBcInRpdGxlXCIgZmllbGRcblxuXHRcdFx0XHRcdFx0XHRcdGlmICh1LmF2YXRhcikge1xuXHRcdFx0XHRcdFx0XHRcdFx0TWV0ZW9yLmNhbGwoJ3NldEF2YXRhckZyb21TZXJ2aWNlJywgYGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCwkeyB1LmF2YXRhciB9YCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gRGVsZXRlZCB1c2VycyBhcmUgJ2luYWN0aXZlJyB1c2VycyBpbiBSb2NrZXQuQ2hhdFxuXHRcdFx0XHRcdFx0XHRcdGlmICh1LmRlbGV0ZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdE1ldGVvci5jYWxsKCdzZXRVc2VyQWN0aXZlU3RhdHVzJywgdXNlcklkLCBmYWxzZSk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMudXBkYXRlKHsgX2lkOiB1c2VySWQgfSwgeyAkYWRkVG9TZXQ6IHsgaW1wb3J0SWRzOiB1LmlkIH0gfSk7XG5cdFx0XHRcdFx0XHRcdFx0dS5yb2NrZXRJZCA9IHVzZXJJZDtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHN1cGVyLmFkZENvdW50Q29tcGxldGVkKDEpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuY29sbGVjdGlvbi51cGRhdGUoeyBfaWQ6IHRoaXMudXNlcnMuX2lkIH0sIHsgJHNldDogeyB1c2VyczogdGhpcy51c2Vycy51c2VycyB9IH0pO1xuXG5cdFx0XHRcdC8vIEltcG9ydCB0aGUgY2hhbm5lbHNcblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLklNUE9SVElOR19DSEFOTkVMUyk7XG5cdFx0XHRcdGZvciAoY29uc3QgYyBvZiB0aGlzLmNoYW5uZWxzLmNoYW5uZWxzKSB7XG5cdFx0XHRcdFx0aWYgKCFjLmRvX2ltcG9ydCkge1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcihzdGFydGVkQnlVc2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IGV4aXN0YW50Um9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeU5hbWUoYy5uYW1lKTtcblx0XHRcdFx0XHRcdC8vIElmIHRoZSByb29tIGV4aXN0cyBvciB0aGUgbmFtZSBvZiBpdCBpcyAnZ2VuZXJhbCcsIHRoZW4gd2UgZG9uJ3QgbmVlZCB0byBjcmVhdGUgaXQgYWdhaW5cblx0XHRcdFx0XHRcdGlmIChleGlzdGFudFJvb20gfHwgYy5uYW1lLnRvVXBwZXJDYXNlKCkgPT09ICdHRU5FUkFMJykge1xuXHRcdFx0XHRcdFx0XHRjLnJvY2tldElkID0gYy5uYW1lLnRvVXBwZXJDYXNlKCkgPT09ICdHRU5FUkFMJyA/ICdHRU5FUkFMJyA6IGV4aXN0YW50Um9vbS5faWQ7XG5cdFx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZSh7IF9pZDogYy5yb2NrZXRJZCB9LCB7ICRhZGRUb1NldDogeyBpbXBvcnRJZHM6IGMuaWQgfSB9KTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdC8vIEZpbmQgdGhlIHJvY2tldGNoYXRJZCBvZiB0aGUgdXNlciB3aG8gY3JlYXRlZCB0aGlzIGNoYW5uZWxcblx0XHRcdFx0XHRcdFx0bGV0IGNyZWF0b3JJZCA9IHN0YXJ0ZWRCeVVzZXJJZDtcblx0XHRcdFx0XHRcdFx0Zm9yIChjb25zdCB1IG9mIHRoaXMudXNlcnMudXNlcnMpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAodS5pZCA9PT0gYy5jcmVhdG9yICYmIHUuZG9faW1wb3J0KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjcmVhdG9ySWQgPSB1LnJvY2tldElkO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdC8vIENyZWF0ZSB0aGUgY2hhbm5lbFxuXHRcdFx0XHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKGNyZWF0b3JJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHJvb21JbmZvID0gTWV0ZW9yLmNhbGwoYy5pc1ByaXZhdGUgPyAnY3JlYXRlUHJpdmF0ZUdyb3VwJyA6ICdjcmVhdGVDaGFubmVsJywgYy5uYW1lLCBbXSk7XG5cdFx0XHRcdFx0XHRcdFx0Yy5yb2NrZXRJZCA9IHJvb21JbmZvLnJpZDtcblx0XHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMudXBkYXRlKHsgX2lkOiBjLnJvY2tldElkIH0sIHsgJHNldDogeyB0czogYy5jcmVhdGVkLCB0b3BpYzogYy50b3BpYyB9LCAkYWRkVG9TZXQ6IHsgaW1wb3J0SWRzOiBjLmlkIH0gfSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHN1cGVyLmFkZENvdW50Q29tcGxldGVkKDEpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuY29sbGVjdGlvbi51cGRhdGUoeyBfaWQ6IHRoaXMuY2hhbm5lbHMuX2lkIH0sIHsgJHNldDogeyBjaGFubmVsczogdGhpcy5jaGFubmVscy5jaGFubmVscyB9IH0pO1xuXG5cdFx0XHRcdC8vIEltcG9ydCB0aGUgTWVzc2FnZXNcblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLklNUE9SVElOR19NRVNTQUdFUyk7XG5cdFx0XHRcdGZvciAoY29uc3QgW2NoLCBtZXNzYWdlc01hcF0gb2YgdGhpcy5tZXNzYWdlcy5lbnRyaWVzKCkpIHtcblx0XHRcdFx0XHRjb25zdCBoaXBDaGFubmVsID0gdGhpcy5nZXRDaGFubmVsRnJvbVJvb21JZGVudGlmaWVyKGNoKTtcblx0XHRcdFx0XHRpZiAoIWhpcENoYW5uZWwuZG9faW1wb3J0KSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoaGlwQ2hhbm5lbC5yb2NrZXRJZCwgeyBmaWVsZHM6IHsgdXNlcm5hbWVzOiAxLCB0OiAxLCBuYW1lOiAxIH0gfSk7XG5cdFx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcihzdGFydGVkQnlVc2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRcdGZvciAoY29uc3QgW21zZ0dyb3VwRGF0YSwgbXNnc10gb2YgbWVzc2FnZXNNYXAuZW50cmllcygpKSB7XG5cdFx0XHRcdFx0XHRcdHN1cGVyLnVwZGF0ZVJlY29yZCh7IG1lc3NhZ2Vzc3RhdHVzOiBgJHsgY2ggfS8keyBtc2dHcm91cERhdGEgfS4keyBtc2dzLm1lc3NhZ2VzLmxlbmd0aCB9YCB9KTtcblx0XHRcdFx0XHRcdFx0Zm9yIChjb25zdCBtc2cgb2YgbXNncy5tZXNzYWdlcykge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChpc05hTihtc2cudHMpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKGBUaW1lc3RhbXAgb24gYSBtZXNzYWdlIGluICR7IGNoIH0vJHsgbXNnR3JvdXBEYXRhIH0gaXMgaW52YWxpZGApO1xuXHRcdFx0XHRcdFx0XHRcdFx0c3VwZXIuYWRkQ291bnRDb21wbGV0ZWQoMSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRjb25zdCBjcmVhdG9yID0gdGhpcy5nZXRSb2NrZXRVc2VyRnJvbVVzZXJJZChtc2cudXNlcklkKTtcblx0XHRcdFx0XHRcdFx0XHRpZiAoY3JlYXRvcikge1xuXHRcdFx0XHRcdFx0XHRcdFx0c3dpdGNoIChtc2cudHlwZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjYXNlICd1c2VyJzpcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNlbmRNZXNzYWdlKGNyZWF0b3IsIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdF9pZDogbXNnLmlkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dHM6IG1zZy50cyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdG1zZzogbXNnLnRleHQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyaWQ6IHJvb20uX2lkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0YWxpYXM6IG1zZy5hbGlhcyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHU6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0X2lkOiBjcmVhdG9yLl9pZCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dXNlcm5hbWU6IGNyZWF0b3IudXNlcm5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0sIHJvb20sIHRydWUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjYXNlICd0b3BpYyc6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlUm9vbVNldHRpbmdzQ2hhbmdlZFdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIoJ3Jvb21fY2hhbmdlZF90b3BpYycsIHJvb20uX2lkLCBtc2cudGV4dCwgY3JlYXRvciwgeyBfaWQ6IG1zZy5pZCwgdHM6IG1zZy50cyB9KTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRzdXBlci5hZGRDb3VudENvbXBsZXRlZCgxKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gSW1wb3J0IHRoZSBEaXJlY3QgTWVzc2FnZXNcblx0XHRcdFx0Zm9yIChjb25zdCBbZGlyZWN0TXNnUm9vbSwgZGlyZWN0TWVzc2FnZXNNYXBdIG9mIHRoaXMuZGlyZWN0TWVzc2FnZXMuZW50cmllcygpKSB7XG5cdFx0XHRcdFx0Y29uc3QgaGlwVXNlciA9IHRoaXMuZ2V0VXNlckZyb21EaXJlY3RNZXNzYWdlSWRlbnRpZmllcihkaXJlY3RNc2dSb29tKTtcblx0XHRcdFx0XHRpZiAoIWhpcFVzZXIgfHwgIWhpcFVzZXIuZG9faW1wb3J0KSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBWZXJpZnkgdGhpcyBkaXJlY3QgbWVzc2FnZSB1c2VyJ3Mgcm9vbSBpcyB2YWxpZCAoY29uZnVzaW5nIGJ1dCBpZGsgaG93IGVsc2UgdG8gZXhwbGFpbiBpdClcblx0XHRcdFx0XHRpZiAoIXRoaXMuZ2V0Um9ja2V0VXNlckZyb21Vc2VySWQoaGlwVXNlci5pZCkpIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGZvciAoY29uc3QgW21zZ0dyb3VwRGF0YSwgbXNnc10gb2YgZGlyZWN0TWVzc2FnZXNNYXAuZW50cmllcygpKSB7XG5cdFx0XHRcdFx0XHRzdXBlci51cGRhdGVSZWNvcmQoeyBtZXNzYWdlc3N0YXR1czogYCR7IGRpcmVjdE1zZ1Jvb20gfS8keyBtc2dHcm91cERhdGEgfS4keyBtc2dzLm1lc3NhZ2VzLmxlbmd0aCB9YCB9KTtcblx0XHRcdFx0XHRcdGZvciAoY29uc3QgbXNnIG9mIG1zZ3MubWVzc2FnZXMpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGlzTmFOKG1zZy50cykpIHtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKGBUaW1lc3RhbXAgb24gYSBtZXNzYWdlIGluICR7IGRpcmVjdE1zZ1Jvb20gfS8keyBtc2dHcm91cERhdGEgfSBpcyBpbnZhbGlkYCk7XG5cdFx0XHRcdFx0XHRcdFx0c3VwZXIuYWRkQ291bnRDb21wbGV0ZWQoMSk7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvLyBtYWtlIHN1cmUgdGhlIG1lc3NhZ2Ugc2VuZGVyIGlzIGEgdmFsaWQgdXNlciBpbnNpZGUgcm9ja2V0LmNoYXRcblx0XHRcdFx0XHRcdFx0Y29uc3Qgc2VuZGVyID0gdGhpcy5nZXRSb2NrZXRVc2VyRnJvbVVzZXJJZChtc2cuc2VuZGVySWQpO1xuXHRcdFx0XHRcdFx0XHRpZiAoIXNlbmRlcikge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSByZWNlaXZlciBvZiB0aGUgbWVzc2FnZSBpcyBhIHZhbGlkIHJvY2tldC5jaGF0IHVzZXJcblx0XHRcdFx0XHRcdFx0Y29uc3QgcmVjZWl2ZXIgPSB0aGlzLmdldFJvY2tldFVzZXJGcm9tVXNlcklkKG1zZy5yZWNlaXZlcklkKTtcblx0XHRcdFx0XHRcdFx0aWYgKCFyZWNlaXZlcikge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0bGV0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChbcmVjZWl2ZXIuX2lkLCBzZW5kZXIuX2lkXS5zb3J0KCkuam9pbignJykpO1xuXHRcdFx0XHRcdFx0XHRpZiAoIXJvb20pIHtcblx0XHRcdFx0XHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKHNlbmRlci5faWQsICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHJvb21JbmZvID0gTWV0ZW9yLmNhbGwoJ2NyZWF0ZURpcmVjdE1lc3NhZ2UnLCByZWNlaXZlci51c2VybmFtZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRyb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocm9vbUluZm8ucmlkKTtcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIoc2VuZGVyLl9pZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChtc2cuYXR0YWNobWVudF9wYXRoKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBkZXRhaWxzID0ge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRtZXNzYWdlX2lkOiBtc2cuaWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU6IG1zZy5hdHRhY2htZW50Lm5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHNpemU6IG1zZy5hdHRhY2htZW50LnNpemUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHVzZXJJZDogc2VuZGVyLl9pZCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmlkOiByb29tLl9pZCxcblx0XHRcdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnVwbG9hZEZpbGUoZGV0YWlscywgbXNnLmF0dGFjaG1lbnQudXJsLCBzZW5kZXIsIHJvb20sIG1zZy50cyk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFJvY2tldENoYXQuc2VuZE1lc3NhZ2Uoc2VuZGVyLCB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdF9pZDogbXNnLmlkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0czogbXNnLnRzLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRtc2c6IG1zZy50ZXh0LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyaWQ6IHJvb20uX2lkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR1OiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0X2lkOiBzZW5kZXIuX2lkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHVzZXJuYW1lOiBzZW5kZXIudXNlcm5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHR9LCByb29tLCB0cnVlKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5GSU5JU0hJTkcpO1xuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuRE9ORSk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKGUpO1xuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuRVJST1IpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCB0aW1lVG9vayA9IERhdGUubm93KCkgLSBzdGFydGVkO1xuXHRcdFx0dGhpcy5sb2dnZXIubG9nKGBIaXBDaGF0IEVudGVycHJpc2UgSW1wb3J0IHRvb2sgJHsgdGltZVRvb2sgfSBtaWxsaXNlY29uZHMuYCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gc3VwZXIuZ2V0UHJvZ3Jlc3MoKTtcblx0fVxuXG5cdGdldFNlbGVjdGlvbigpIHtcblx0XHRjb25zdCBzZWxlY3Rpb25Vc2VycyA9IHRoaXMudXNlcnMudXNlcnMubWFwKCh1KSA9PiBuZXcgU2VsZWN0aW9uVXNlcih1LmlkLCB1LnVzZXJuYW1lLCB1LmVtYWlsLCBmYWxzZSwgZmFsc2UsIHRydWUpKTtcblx0XHRjb25zdCBzZWxlY3Rpb25DaGFubmVscyA9IHRoaXMuY2hhbm5lbHMuY2hhbm5lbHMubWFwKChjKSA9PiBuZXcgU2VsZWN0aW9uQ2hhbm5lbChjLmlkLCBjLm5hbWUsIGZhbHNlLCB0cnVlLCBjLmlzUHJpdmF0ZSkpO1xuXHRcdGNvbnN0IHNlbGVjdGlvbk1lc3NhZ2VzID0gdGhpcy5pbXBvcnRSZWNvcmQuY291bnQubWVzc2FnZXM7XG5cblx0XHRyZXR1cm4gbmV3IFNlbGVjdGlvbih0aGlzLm5hbWUsIHNlbGVjdGlvblVzZXJzLCBzZWxlY3Rpb25DaGFubmVscywgc2VsZWN0aW9uTWVzc2FnZXMpO1xuXHR9XG5cblx0Z2V0Q2hhbm5lbEZyb21Sb29tSWRlbnRpZmllcihyb29tSWRlbnRpZmllcikge1xuXHRcdGZvciAoY29uc3QgY2ggb2YgdGhpcy5jaGFubmVscy5jaGFubmVscykge1xuXHRcdFx0aWYgKGByb29tcy8keyBjaC5pZCB9YCA9PT0gcm9vbUlkZW50aWZpZXIpIHtcblx0XHRcdFx0cmV0dXJuIGNoO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGdldFVzZXJGcm9tRGlyZWN0TWVzc2FnZUlkZW50aWZpZXIoZGlyZWN0SWRlbnRpZmllcikge1xuXHRcdGZvciAoY29uc3QgdSBvZiB0aGlzLnVzZXJzLnVzZXJzKSB7XG5cdFx0XHRpZiAoYHVzZXJzLyR7IHUuaWQgfWAgPT09IGRpcmVjdElkZW50aWZpZXIpIHtcblx0XHRcdFx0cmV0dXJuIHU7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Z2V0Um9ja2V0VXNlckZyb21Vc2VySWQodXNlcklkKSB7XG5cdFx0aWYgKHVzZXJJZCA9PT0gJ3JvY2tldC5jYXQnKSB7XG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodXNlcklkLCB7IGZpZWxkczogeyB1c2VybmFtZTogMSB9IH0pO1xuXHRcdH1cblxuXHRcdGZvciAoY29uc3QgdSBvZiB0aGlzLnVzZXJzLnVzZXJzKSB7XG5cdFx0XHRpZiAodS5pZCA9PT0gdXNlcklkKSB7XG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh1LnJvY2tldElkLCB7IGZpZWxkczogeyB1c2VybmFtZTogMSB9IH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuIiwiaW1wb3J0IHsgSW1wb3J0ZXJzIH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6aW1wb3J0ZXInO1xuaW1wb3J0IHsgSGlwQ2hhdEVudGVycHJpc2VJbXBvcnRlckluZm8gfSBmcm9tICcuLi9pbmZvJztcbmltcG9ydCB7IEhpcENoYXRFbnRlcnByaXNlSW1wb3J0ZXIgfSBmcm9tICcuL2ltcG9ydGVyJztcblxuSW1wb3J0ZXJzLmFkZChuZXcgSGlwQ2hhdEVudGVycHJpc2VJbXBvcnRlckluZm8oKSwgSGlwQ2hhdEVudGVycHJpc2VJbXBvcnRlcik7XG4iXX0=
