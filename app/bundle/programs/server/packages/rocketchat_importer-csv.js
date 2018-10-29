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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:importer-csv":{"info.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer-csv/info.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  CsvImporterInfo: () => CsvImporterInfo
});
let ImporterInfo;
module.watch(require("meteor/rocketchat:importer"), {
  ImporterInfo(v) {
    ImporterInfo = v;
  }

}, 0);

class CsvImporterInfo extends ImporterInfo {
  constructor() {
    super('csv', 'CSV', 'application/zip', [{
      text: 'Importer_CSV_Information',
      href: 'https://rocket.chat/docs/administrator-guides/import/csv/'
    }]);
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server":{"importer.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer-csv/server/importer.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  CsvImporter: () => CsvImporter
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

class CsvImporter extends Base {
  constructor(info) {
    super(info);
    this.csvParser = require('csv-parse/lib/sync');
    this.messages = new Map();
  }

  prepare(dataURI, sentContentType, fileName) {
    super.prepare(dataURI, sentContentType, fileName);
    const uriResult = RocketChatFile.dataURIParse(dataURI);
    const zip = new this.AdmZip(new Buffer(uriResult.image, 'base64'));
    const zipEntries = zip.getEntries();
    let tempChannels = [];
    let tempUsers = [];
    const tempMessages = new Map();

    for (const entry of zipEntries) {
      this.logger.debug(`Entry: ${entry.entryName}`); // Ignore anything that has `__MACOSX` in it's name, as sadly these things seem to mess everything up

      if (entry.entryName.indexOf('__MACOSX') > -1) {
        this.logger.debug(`Ignoring the file: ${entry.entryName}`);
        continue;
      } // Directories are ignored, since they are "virtual" in a zip file


      if (entry.isDirectory) {
        this.logger.debug(`Ignoring the directory entry: ${entry.entryName}`);
        continue;
      } // Parse the channels


      if (entry.entryName.toLowerCase() === 'channels.csv') {
        super.updateProgress(ProgressStep.PREPARING_CHANNELS);
        const parsedChannels = this.csvParser(entry.getData().toString());
        tempChannels = parsedChannels.map(c => ({
          id: c[0].trim().replace('.', '_'),
          name: c[0].trim(),
          creator: c[1].trim(),
          isPrivate: c[2].trim().toLowerCase() === 'private',
          members: c[3].trim().split(';').map(m => m.trim())
        }));
        continue;
      } // Parse the users


      if (entry.entryName.toLowerCase() === 'users.csv') {
        super.updateProgress(ProgressStep.PREPARING_USERS);
        const parsedUsers = this.csvParser(entry.getData().toString());
        tempUsers = parsedUsers.map(u => ({
          id: u[0].trim().replace('.', '_'),
          username: u[0].trim(),
          email: u[1].trim(),
          name: u[2].trim()
        }));
        continue;
      } // Parse the messages


      if (entry.entryName.indexOf('/') > -1) {
        const item = entry.entryName.split('/'); // random/messages.csv

        const channelName = item[0]; // random

        const msgGroupData = item[1].split('.')[0]; // 2015-10-04

        if (!tempMessages.get(channelName)) {
          tempMessages.set(channelName, new Map());
        }

        let msgs = [];

        try {
          msgs = this.csvParser(entry.getData().toString());
        } catch (e) {
          this.logger.warn(`The file ${entry.entryName} contains invalid syntax`, e);
          continue;
        }

        tempMessages.get(channelName).set(msgGroupData, msgs.map(m => ({
          username: m[0],
          ts: m[1],
          text: m[2]
        })));
        continue;
      }
    } // Insert the users record, eventually this might have to be split into several ones as well
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
      channels: tempChannels
    });
    this.channels = this.collection.findOne(channelsId);
    super.updateRecord({
      'count.channels': tempChannels.length
    });
    super.addCountToTotal(tempChannels.length); // Save the messages records to the import record for `startImport` usage

    super.updateProgress(ProgressStep.PREPARING_MESSAGES);
    let messagesCount = 0;

    for (const [channel, messagesMap] of tempMessages.entries()) {
      if (!this.messages.get(channel)) {
        this.messages.set(channel, new Map());
      }

      for (const [msgGroupData, msgs] of messagesMap.entries()) {
        messagesCount += msgs.length;
        super.updateRecord({
          messagesstatus: `${channel}/${msgGroupData}`
        });

        if (Base.getBSONSize(msgs) > Base.getMaxBSONSize()) {
          Base.getBSONSafeArraysFromAnArray(msgs).forEach((splitMsg, i) => {
            const messagesId = this.collection.insert({
              import: this.importRecord._id,
              importer: this.name,
              type: 'messages',
              name: `${channel}/${msgGroupData}.${i}`,
              messages: splitMsg
            });
            this.messages.get(channel).set(`${msgGroupData}.${i}`, this.collection.findOne(messagesId));
          });
        } else {
          const messagesId = this.collection.insert({
            import: this.importRecord._id,
            importer: this.name,
            type: 'messages',
            name: `${channel}/${msgGroupData}`,
            messages: msgs
          });
          this.messages.get(channel).set(msgGroupData, this.collection.findOne(messagesId));
        }
      }
    }

    super.updateRecord({
      'count.messages': messagesCount,
      messagesstatus: null
    });
    super.addCountToTotal(messagesCount); // Ensure we have at least a single user, channel, or message

    if (tempUsers.length === 0 && tempChannels.length === 0 && messagesCount === 0) {
      this.logger.error('No users, channels, or messages found in the import file.');
      super.updateProgress(ProgressStep.ERROR);
      return super.getProgress();
    }

    const selectionUsers = tempUsers.map(u => new SelectionUser(u.id, u.username, u.email, false, false, true));
    const selectionChannels = tempChannels.map(c => new SelectionChannel(c.id, c.name, false, true, c.isPrivate));
    const selectionMessages = this.importRecord.count.messages;
    super.updateProgress(ProgressStep.USER_SELECTION);
    return new Selection(this.name, selectionUsers, selectionChannels, selectionMessages);
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
          if (!u.do_import) {
            continue;
          }

          Meteor.runAsUser(startedByUserId, () => {
            let existantUser = RocketChat.models.Users.findOneByEmailAddress(u.email); // If we couldn't find one by their email address, try to find an existing user by their username

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
              const userId = Accounts.createUser({
                email: u.email,
                password: Date.now() + u.name + u.email.toUpperCase()
              });
              Meteor.runAsUser(userId, () => {
                Meteor.call('setUsername', u.username, {
                  joinDefaultChannelsSilenced: true
                });
                RocketChat.models.Users.setName(userId, u.name);
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
                if (u.username === c.creator && u.do_import) {
                  creatorId = u.rocketId;
                }
              } // Create the channel


              Meteor.runAsUser(creatorId, () => {
                const roomInfo = Meteor.call(c.isPrivate ? 'createPrivateGroup' : 'createChannel', c.name, c.members);
                c.rocketId = roomInfo.rid;
              });
              RocketChat.models.Rooms.update({
                _id: c.rocketId
              }, {
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
        }); // If no channels file, collect channel map from DB for message-only import

        if (this.channels.channels.length === 0) {
          for (const cname of this.messages.keys()) {
            Meteor.runAsUser(startedByUserId, () => {
              const existantRoom = RocketChat.models.Rooms.findOneByName(cname);

              if (existantRoom || cname.toUpperCase() === 'GENERAL') {
                this.channels.channels.push({
                  id: cname.replace('.', '_'),
                  name: cname,
                  rocketId: cname.toUpperCase() === 'GENERAL' ? 'GENERAL' : existantRoom._id,
                  do_import: true
                });
              }
            });
          }
        } // If no users file, collect user map from DB for message-only import


        if (this.users.users.length === 0) {
          for (const [ch, messagesMap] of this.messages.entries()) {
            const csvChannel = this.getChannelFromName(ch);

            if (!csvChannel || !csvChannel.do_import) {
              continue;
            }

            Meteor.runAsUser(startedByUserId, () => {
              for (const msgs of messagesMap.values()) {
                for (const msg of msgs.messages) {
                  if (!this.getUserFromUsername(msg.username)) {
                    const user = RocketChat.models.Users.findOneByUsername(msg.username);

                    if (user) {
                      this.users.users.push({
                        rocketId: user._id,
                        username: user.username
                      });
                    }
                  }
                }
              }
            });
          }
        } // Import the Messages


        super.updateProgress(ProgressStep.IMPORTING_MESSAGES);

        for (const [ch, messagesMap] of this.messages.entries()) {
          const csvChannel = this.getChannelFromName(ch);

          if (!csvChannel || !csvChannel.do_import) {
            continue;
          }

          const room = RocketChat.models.Rooms.findOneById(csvChannel.rocketId, {
            fields: {
              usernames: 1,
              t: 1,
              name: 1
            }
          });
          Meteor.runAsUser(startedByUserId, () => {
            const timestamps = {};

            for (const [msgGroupData, msgs] of messagesMap.entries()) {
              super.updateRecord({
                messagesstatus: `${ch}/${msgGroupData}.${msgs.messages.length}`
              });

              for (const msg of msgs.messages) {
                if (isNaN(new Date(parseInt(msg.ts)))) {
                  this.logger.warn(`Timestamp on a message in ${ch}/${msgGroupData} is invalid`);
                  super.addCountCompleted(1);
                  continue;
                }

                const creator = this.getUserFromUsername(msg.username);

                if (creator) {
                  let suffix = '';

                  if (timestamps[msg.ts] === undefined) {
                    timestamps[msg.ts] = 1;
                  } else {
                    suffix = `-${timestamps[msg.ts]}`;
                    timestamps[msg.ts] += 1;
                  }

                  const msgObj = {
                    _id: `csv-${csvChannel.id}-${msg.ts}${suffix}`,
                    ts: new Date(parseInt(msg.ts)),
                    msg: msg.text,
                    rid: room._id,
                    u: {
                      _id: creator._id,
                      username: creator.username
                    }
                  };
                  RocketChat.sendMessage(creator, msgObj, room, true);
                }

                super.addCountCompleted(1);
              }
            }
          });
        }

        super.updateProgress(ProgressStep.FINISHING);
        super.updateProgress(ProgressStep.DONE);
      } catch (e) {
        this.logger.error(e);
        super.updateProgress(ProgressStep.ERROR);
      }

      const timeTook = Date.now() - started;
      this.logger.log(`CSV Import took ${timeTook} milliseconds.`);
    });
    return super.getProgress();
  }

  getSelection() {
    const selectionUsers = this.users.users.map(u => new SelectionUser(u.id, u.username, u.email, false, false, true));
    const selectionChannels = this.channels.channels.map(c => new SelectionChannel(c.id, c.name, false, true, c.isPrivate));
    const selectionMessages = this.importRecord.count.messages;
    return new Selection(this.name, selectionUsers, selectionChannels, selectionMessages);
  }

  getChannelFromName(channelName) {
    for (const ch of this.channels.channels) {
      if (ch.name === channelName) {
        return ch;
      }
    }
  }

  getUserFromUsername(username) {
    for (const u of this.users.users) {
      if (u.username === username) {
        return RocketChat.models.Users.findOneById(u.rocketId, {
          fields: {
            username: 1
          }
        });
      }
    }
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"adder.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_importer-csv/server/adder.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Importers;
module.watch(require("meteor/rocketchat:importer"), {
  Importers(v) {
    Importers = v;
  }

}, 0);
let CsvImporterInfo;
module.watch(require("../info"), {
  CsvImporterInfo(v) {
    CsvImporterInfo = v;
  }

}, 1);
let CsvImporter;
module.watch(require("./importer"), {
  CsvImporter(v) {
    CsvImporter = v;
  }

}, 2);
Importers.add(new CsvImporterInfo(), CsvImporter);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:importer-csv/info.js");
require("/node_modules/meteor/rocketchat:importer-csv/server/importer.js");
require("/node_modules/meteor/rocketchat:importer-csv/server/adder.js");

/* Exports */
Package._define("rocketchat:importer-csv");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_importer-csv.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci1jc3YvaW5mby5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci1jc3Yvc2VydmVyL2ltcG9ydGVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmltcG9ydGVyLWNzdi9zZXJ2ZXIvYWRkZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiQ3N2SW1wb3J0ZXJJbmZvIiwiSW1wb3J0ZXJJbmZvIiwid2F0Y2giLCJyZXF1aXJlIiwidiIsImNvbnN0cnVjdG9yIiwidGV4dCIsImhyZWYiLCJDc3ZJbXBvcnRlciIsIkJhc2UiLCJQcm9ncmVzc1N0ZXAiLCJTZWxlY3Rpb24iLCJTZWxlY3Rpb25DaGFubmVsIiwiU2VsZWN0aW9uVXNlciIsImluZm8iLCJjc3ZQYXJzZXIiLCJtZXNzYWdlcyIsIk1hcCIsInByZXBhcmUiLCJkYXRhVVJJIiwic2VudENvbnRlbnRUeXBlIiwiZmlsZU5hbWUiLCJ1cmlSZXN1bHQiLCJSb2NrZXRDaGF0RmlsZSIsImRhdGFVUklQYXJzZSIsInppcCIsIkFkbVppcCIsIkJ1ZmZlciIsImltYWdlIiwiemlwRW50cmllcyIsImdldEVudHJpZXMiLCJ0ZW1wQ2hhbm5lbHMiLCJ0ZW1wVXNlcnMiLCJ0ZW1wTWVzc2FnZXMiLCJlbnRyeSIsImxvZ2dlciIsImRlYnVnIiwiZW50cnlOYW1lIiwiaW5kZXhPZiIsImlzRGlyZWN0b3J5IiwidG9Mb3dlckNhc2UiLCJ1cGRhdGVQcm9ncmVzcyIsIlBSRVBBUklOR19DSEFOTkVMUyIsInBhcnNlZENoYW5uZWxzIiwiZ2V0RGF0YSIsInRvU3RyaW5nIiwibWFwIiwiYyIsImlkIiwidHJpbSIsInJlcGxhY2UiLCJuYW1lIiwiY3JlYXRvciIsImlzUHJpdmF0ZSIsIm1lbWJlcnMiLCJzcGxpdCIsIm0iLCJQUkVQQVJJTkdfVVNFUlMiLCJwYXJzZWRVc2VycyIsInUiLCJ1c2VybmFtZSIsImVtYWlsIiwiaXRlbSIsImNoYW5uZWxOYW1lIiwibXNnR3JvdXBEYXRhIiwiZ2V0Iiwic2V0IiwibXNncyIsImUiLCJ3YXJuIiwidHMiLCJ1c2Vyc0lkIiwiY29sbGVjdGlvbiIsImluc2VydCIsImltcG9ydCIsImltcG9ydFJlY29yZCIsIl9pZCIsImltcG9ydGVyIiwidHlwZSIsInVzZXJzIiwiZmluZE9uZSIsInVwZGF0ZVJlY29yZCIsImxlbmd0aCIsImFkZENvdW50VG9Ub3RhbCIsImNoYW5uZWxzSWQiLCJjaGFubmVscyIsIlBSRVBBUklOR19NRVNTQUdFUyIsIm1lc3NhZ2VzQ291bnQiLCJjaGFubmVsIiwibWVzc2FnZXNNYXAiLCJlbnRyaWVzIiwibWVzc2FnZXNzdGF0dXMiLCJnZXRCU09OU2l6ZSIsImdldE1heEJTT05TaXplIiwiZ2V0QlNPTlNhZmVBcnJheXNGcm9tQW5BcnJheSIsImZvckVhY2giLCJzcGxpdE1zZyIsImkiLCJtZXNzYWdlc0lkIiwiZXJyb3IiLCJFUlJPUiIsImdldFByb2dyZXNzIiwic2VsZWN0aW9uVXNlcnMiLCJzZWxlY3Rpb25DaGFubmVscyIsInNlbGVjdGlvbk1lc3NhZ2VzIiwiY291bnQiLCJVU0VSX1NFTEVDVElPTiIsInN0YXJ0SW1wb3J0IiwiaW1wb3J0U2VsZWN0aW9uIiwic3RhcnRlZCIsIkRhdGUiLCJub3ciLCJ1c2VyIiwidXNlcl9pZCIsImRvX2ltcG9ydCIsInVwZGF0ZSIsIiRzZXQiLCJjaGFubmVsX2lkIiwic3RhcnRlZEJ5VXNlcklkIiwiTWV0ZW9yIiwidXNlcklkIiwiZGVmZXIiLCJJTVBPUlRJTkdfVVNFUlMiLCJydW5Bc1VzZXIiLCJleGlzdGFudFVzZXIiLCJSb2NrZXRDaGF0IiwibW9kZWxzIiwiVXNlcnMiLCJmaW5kT25lQnlFbWFpbEFkZHJlc3MiLCJmaW5kT25lQnlVc2VybmFtZSIsInJvY2tldElkIiwiJGFkZFRvU2V0IiwiaW1wb3J0SWRzIiwiQWNjb3VudHMiLCJjcmVhdGVVc2VyIiwicGFzc3dvcmQiLCJ0b1VwcGVyQ2FzZSIsImNhbGwiLCJqb2luRGVmYXVsdENoYW5uZWxzU2lsZW5jZWQiLCJzZXROYW1lIiwiYWRkQ291bnRDb21wbGV0ZWQiLCJJTVBPUlRJTkdfQ0hBTk5FTFMiLCJleGlzdGFudFJvb20iLCJSb29tcyIsImZpbmRPbmVCeU5hbWUiLCJjcmVhdG9ySWQiLCJyb29tSW5mbyIsInJpZCIsImNuYW1lIiwia2V5cyIsInB1c2giLCJjaCIsImNzdkNoYW5uZWwiLCJnZXRDaGFubmVsRnJvbU5hbWUiLCJ2YWx1ZXMiLCJtc2ciLCJnZXRVc2VyRnJvbVVzZXJuYW1lIiwiSU1QT1JUSU5HX01FU1NBR0VTIiwicm9vbSIsImZpbmRPbmVCeUlkIiwiZmllbGRzIiwidXNlcm5hbWVzIiwidCIsInRpbWVzdGFtcHMiLCJpc05hTiIsInBhcnNlSW50Iiwic3VmZml4IiwidW5kZWZpbmVkIiwibXNnT2JqIiwic2VuZE1lc3NhZ2UiLCJGSU5JU0hJTkciLCJET05FIiwidGltZVRvb2siLCJsb2ciLCJnZXRTZWxlY3Rpb24iLCJJbXBvcnRlcnMiLCJhZGQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsTUFBUCxDQUFjO0FBQUNDLG1CQUFnQixNQUFJQTtBQUFyQixDQUFkO0FBQXFELElBQUlDLFlBQUo7QUFBaUJILE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSw0QkFBUixDQUFiLEVBQW1EO0FBQUNGLGVBQWFHLENBQWIsRUFBZTtBQUFDSCxtQkFBYUcsQ0FBYjtBQUFlOztBQUFoQyxDQUFuRCxFQUFxRixDQUFyRjs7QUFFL0QsTUFBTUosZUFBTixTQUE4QkMsWUFBOUIsQ0FBMkM7QUFDakRJLGdCQUFjO0FBQ2IsVUFBTSxLQUFOLEVBQWEsS0FBYixFQUFvQixpQkFBcEIsRUFBdUMsQ0FBQztBQUN2Q0MsWUFBTSwwQkFEaUM7QUFFdkNDLFlBQU07QUFGaUMsS0FBRCxDQUF2QztBQUlBOztBQU5nRCxDOzs7Ozs7Ozs7OztBQ0ZsRFQsT0FBT0MsTUFBUCxDQUFjO0FBQUNTLGVBQVksTUFBSUE7QUFBakIsQ0FBZDtBQUE2QyxJQUFJQyxJQUFKLEVBQVNDLFlBQVQsRUFBc0JDLFNBQXRCLEVBQWdDQyxnQkFBaEMsRUFBaURDLGFBQWpEO0FBQStEZixPQUFPSSxLQUFQLENBQWFDLFFBQVEsNEJBQVIsQ0FBYixFQUFtRDtBQUFDTSxPQUFLTCxDQUFMLEVBQU87QUFBQ0ssV0FBS0wsQ0FBTDtBQUFPLEdBQWhCOztBQUFpQk0sZUFBYU4sQ0FBYixFQUFlO0FBQUNNLG1CQUFhTixDQUFiO0FBQWUsR0FBaEQ7O0FBQWlETyxZQUFVUCxDQUFWLEVBQVk7QUFBQ08sZ0JBQVVQLENBQVY7QUFBWSxHQUExRTs7QUFBMkVRLG1CQUFpQlIsQ0FBakIsRUFBbUI7QUFBQ1EsdUJBQWlCUixDQUFqQjtBQUFtQixHQUFsSDs7QUFBbUhTLGdCQUFjVCxDQUFkLEVBQWdCO0FBQUNTLG9CQUFjVCxDQUFkO0FBQWdCOztBQUFwSixDQUFuRCxFQUF5TSxDQUF6TTs7QUFRckcsTUFBTUksV0FBTixTQUEwQkMsSUFBMUIsQ0FBK0I7QUFDckNKLGNBQVlTLElBQVosRUFBa0I7QUFDakIsVUFBTUEsSUFBTjtBQUVBLFNBQUtDLFNBQUwsR0FBaUJaLFFBQVEsb0JBQVIsQ0FBakI7QUFDQSxTQUFLYSxRQUFMLEdBQWdCLElBQUlDLEdBQUosRUFBaEI7QUFDQTs7QUFFREMsVUFBUUMsT0FBUixFQUFpQkMsZUFBakIsRUFBa0NDLFFBQWxDLEVBQTRDO0FBQzNDLFVBQU1ILE9BQU4sQ0FBY0MsT0FBZCxFQUF1QkMsZUFBdkIsRUFBd0NDLFFBQXhDO0FBRUEsVUFBTUMsWUFBWUMsZUFBZUMsWUFBZixDQUE0QkwsT0FBNUIsQ0FBbEI7QUFDQSxVQUFNTSxNQUFNLElBQUksS0FBS0MsTUFBVCxDQUFnQixJQUFJQyxNQUFKLENBQVdMLFVBQVVNLEtBQXJCLEVBQTRCLFFBQTVCLENBQWhCLENBQVo7QUFDQSxVQUFNQyxhQUFhSixJQUFJSyxVQUFKLEVBQW5CO0FBRUEsUUFBSUMsZUFBZSxFQUFuQjtBQUNBLFFBQUlDLFlBQVksRUFBaEI7QUFDQSxVQUFNQyxlQUFlLElBQUloQixHQUFKLEVBQXJCOztBQUNBLFNBQUssTUFBTWlCLEtBQVgsSUFBb0JMLFVBQXBCLEVBQWdDO0FBQy9CLFdBQUtNLE1BQUwsQ0FBWUMsS0FBWixDQUFtQixVQUFVRixNQUFNRyxTQUFXLEVBQTlDLEVBRCtCLENBRy9COztBQUNBLFVBQUlILE1BQU1HLFNBQU4sQ0FBZ0JDLE9BQWhCLENBQXdCLFVBQXhCLElBQXNDLENBQUMsQ0FBM0MsRUFBOEM7QUFDN0MsYUFBS0gsTUFBTCxDQUFZQyxLQUFaLENBQW1CLHNCQUFzQkYsTUFBTUcsU0FBVyxFQUExRDtBQUNBO0FBQ0EsT0FQOEIsQ0FTL0I7OztBQUNBLFVBQUlILE1BQU1LLFdBQVYsRUFBdUI7QUFDdEIsYUFBS0osTUFBTCxDQUFZQyxLQUFaLENBQW1CLGlDQUFpQ0YsTUFBTUcsU0FBVyxFQUFyRTtBQUNBO0FBQ0EsT0FiOEIsQ0FlL0I7OztBQUNBLFVBQUlILE1BQU1HLFNBQU4sQ0FBZ0JHLFdBQWhCLE9BQWtDLGNBQXRDLEVBQXNEO0FBQ3JELGNBQU1DLGNBQU4sQ0FBcUIvQixhQUFhZ0Msa0JBQWxDO0FBQ0EsY0FBTUMsaUJBQWlCLEtBQUs1QixTQUFMLENBQWVtQixNQUFNVSxPQUFOLEdBQWdCQyxRQUFoQixFQUFmLENBQXZCO0FBQ0FkLHVCQUFlWSxlQUFlRyxHQUFmLENBQW9CQyxDQUFELEtBQVE7QUFDekNDLGNBQUlELEVBQUUsQ0FBRixFQUFLRSxJQUFMLEdBQVlDLE9BQVosQ0FBb0IsR0FBcEIsRUFBeUIsR0FBekIsQ0FEcUM7QUFFekNDLGdCQUFNSixFQUFFLENBQUYsRUFBS0UsSUFBTCxFQUZtQztBQUd6Q0csbUJBQVNMLEVBQUUsQ0FBRixFQUFLRSxJQUFMLEVBSGdDO0FBSXpDSSxxQkFBV04sRUFBRSxDQUFGLEVBQUtFLElBQUwsR0FBWVQsV0FBWixPQUE4QixTQUpBO0FBS3pDYyxtQkFBU1AsRUFBRSxDQUFGLEVBQUtFLElBQUwsR0FBWU0sS0FBWixDQUFrQixHQUFsQixFQUF1QlQsR0FBdkIsQ0FBNEJVLENBQUQsSUFBT0EsRUFBRVAsSUFBRixFQUFsQztBQUxnQyxTQUFSLENBQW5CLENBQWY7QUFPQTtBQUNBLE9BM0I4QixDQTZCL0I7OztBQUNBLFVBQUlmLE1BQU1HLFNBQU4sQ0FBZ0JHLFdBQWhCLE9BQWtDLFdBQXRDLEVBQW1EO0FBQ2xELGNBQU1DLGNBQU4sQ0FBcUIvQixhQUFhK0MsZUFBbEM7QUFDQSxjQUFNQyxjQUFjLEtBQUszQyxTQUFMLENBQWVtQixNQUFNVSxPQUFOLEdBQWdCQyxRQUFoQixFQUFmLENBQXBCO0FBQ0FiLG9CQUFZMEIsWUFBWVosR0FBWixDQUFpQmEsQ0FBRCxLQUFRO0FBQUVYLGNBQUlXLEVBQUUsQ0FBRixFQUFLVixJQUFMLEdBQVlDLE9BQVosQ0FBb0IsR0FBcEIsRUFBeUIsR0FBekIsQ0FBTjtBQUFxQ1Usb0JBQVVELEVBQUUsQ0FBRixFQUFLVixJQUFMLEVBQS9DO0FBQTREWSxpQkFBT0YsRUFBRSxDQUFGLEVBQUtWLElBQUwsRUFBbkU7QUFBZ0ZFLGdCQUFNUSxFQUFFLENBQUYsRUFBS1YsSUFBTDtBQUF0RixTQUFSLENBQWhCLENBQVo7QUFDQTtBQUNBLE9BbkM4QixDQXFDL0I7OztBQUNBLFVBQUlmLE1BQU1HLFNBQU4sQ0FBZ0JDLE9BQWhCLENBQXdCLEdBQXhCLElBQStCLENBQUMsQ0FBcEMsRUFBdUM7QUFDdEMsY0FBTXdCLE9BQU81QixNQUFNRyxTQUFOLENBQWdCa0IsS0FBaEIsQ0FBc0IsR0FBdEIsQ0FBYixDQURzQyxDQUNHOztBQUN6QyxjQUFNUSxjQUFjRCxLQUFLLENBQUwsQ0FBcEIsQ0FGc0MsQ0FFVDs7QUFDN0IsY0FBTUUsZUFBZUYsS0FBSyxDQUFMLEVBQVFQLEtBQVIsQ0FBYyxHQUFkLEVBQW1CLENBQW5CLENBQXJCLENBSHNDLENBR007O0FBRTVDLFlBQUksQ0FBQ3RCLGFBQWFnQyxHQUFiLENBQWlCRixXQUFqQixDQUFMLEVBQW9DO0FBQ25DOUIsdUJBQWFpQyxHQUFiLENBQWlCSCxXQUFqQixFQUE4QixJQUFJOUMsR0FBSixFQUE5QjtBQUNBOztBQUVELFlBQUlrRCxPQUFPLEVBQVg7O0FBRUEsWUFBSTtBQUNIQSxpQkFBTyxLQUFLcEQsU0FBTCxDQUFlbUIsTUFBTVUsT0FBTixHQUFnQkMsUUFBaEIsRUFBZixDQUFQO0FBQ0EsU0FGRCxDQUVFLE9BQU91QixDQUFQLEVBQVU7QUFDWCxlQUFLakMsTUFBTCxDQUFZa0MsSUFBWixDQUFrQixZQUFZbkMsTUFBTUcsU0FBVywwQkFBL0MsRUFBMEUrQixDQUExRTtBQUNBO0FBQ0E7O0FBRURuQyxxQkFBYWdDLEdBQWIsQ0FBaUJGLFdBQWpCLEVBQThCRyxHQUE5QixDQUFrQ0YsWUFBbEMsRUFBZ0RHLEtBQUtyQixHQUFMLENBQVVVLENBQUQsS0FBUTtBQUFFSSxvQkFBVUosRUFBRSxDQUFGLENBQVo7QUFBa0JjLGNBQUlkLEVBQUUsQ0FBRixDQUF0QjtBQUE0QmxELGdCQUFNa0QsRUFBRSxDQUFGO0FBQWxDLFNBQVIsQ0FBVCxDQUFoRDtBQUNBO0FBQ0E7QUFDRCxLQXJFMEMsQ0F1RTNDO0FBQ0E7OztBQUNBLFVBQU1lLFVBQVUsS0FBS0MsVUFBTCxDQUFnQkMsTUFBaEIsQ0FBdUI7QUFBRUMsY0FBUSxLQUFLQyxZQUFMLENBQWtCQyxHQUE1QjtBQUFpQ0MsZ0JBQVUsS0FBSzFCLElBQWhEO0FBQXNEMkIsWUFBTSxPQUE1RDtBQUFxRUMsYUFBTy9DO0FBQTVFLEtBQXZCLENBQWhCO0FBQ0EsU0FBSytDLEtBQUwsR0FBYSxLQUFLUCxVQUFMLENBQWdCUSxPQUFoQixDQUF3QlQsT0FBeEIsQ0FBYjtBQUNBLFVBQU1VLFlBQU4sQ0FBbUI7QUFBRSxxQkFBZWpELFVBQVVrRDtBQUEzQixLQUFuQjtBQUNBLFVBQU1DLGVBQU4sQ0FBc0JuRCxVQUFVa0QsTUFBaEMsRUE1RTJDLENBOEUzQzs7QUFDQSxVQUFNRSxhQUFhLEtBQUtaLFVBQUwsQ0FBZ0JDLE1BQWhCLENBQXVCO0FBQUVDLGNBQVEsS0FBS0MsWUFBTCxDQUFrQkMsR0FBNUI7QUFBaUNDLGdCQUFVLEtBQUsxQixJQUFoRDtBQUFzRDJCLFlBQU0sVUFBNUQ7QUFBd0VPLGdCQUFVdEQ7QUFBbEYsS0FBdkIsQ0FBbkI7QUFDQSxTQUFLc0QsUUFBTCxHQUFnQixLQUFLYixVQUFMLENBQWdCUSxPQUFoQixDQUF3QkksVUFBeEIsQ0FBaEI7QUFDQSxVQUFNSCxZQUFOLENBQW1CO0FBQUUsd0JBQWtCbEQsYUFBYW1EO0FBQWpDLEtBQW5CO0FBQ0EsVUFBTUMsZUFBTixDQUFzQnBELGFBQWFtRCxNQUFuQyxFQWxGMkMsQ0FvRjNDOztBQUNBLFVBQU16QyxjQUFOLENBQXFCL0IsYUFBYTRFLGtCQUFsQztBQUNBLFFBQUlDLGdCQUFnQixDQUFwQjs7QUFDQSxTQUFLLE1BQU0sQ0FBQ0MsT0FBRCxFQUFVQyxXQUFWLENBQVgsSUFBcUN4RCxhQUFheUQsT0FBYixFQUFyQyxFQUE2RDtBQUM1RCxVQUFJLENBQUMsS0FBSzFFLFFBQUwsQ0FBY2lELEdBQWQsQ0FBa0J1QixPQUFsQixDQUFMLEVBQWlDO0FBQ2hDLGFBQUt4RSxRQUFMLENBQWNrRCxHQUFkLENBQWtCc0IsT0FBbEIsRUFBMkIsSUFBSXZFLEdBQUosRUFBM0I7QUFDQTs7QUFFRCxXQUFLLE1BQU0sQ0FBQytDLFlBQUQsRUFBZUcsSUFBZixDQUFYLElBQW1Dc0IsWUFBWUMsT0FBWixFQUFuQyxFQUEwRDtBQUN6REgseUJBQWlCcEIsS0FBS2UsTUFBdEI7QUFDQSxjQUFNRCxZQUFOLENBQW1CO0FBQUVVLDBCQUFpQixHQUFHSCxPQUFTLElBQUl4QixZQUFjO0FBQWpELFNBQW5COztBQUVBLFlBQUl2RCxLQUFLbUYsV0FBTCxDQUFpQnpCLElBQWpCLElBQXlCMUQsS0FBS29GLGNBQUwsRUFBN0IsRUFBb0Q7QUFDbkRwRixlQUFLcUYsNEJBQUwsQ0FBa0MzQixJQUFsQyxFQUF3QzRCLE9BQXhDLENBQWdELENBQUNDLFFBQUQsRUFBV0MsQ0FBWCxLQUFpQjtBQUNoRSxrQkFBTUMsYUFBYSxLQUFLMUIsVUFBTCxDQUFnQkMsTUFBaEIsQ0FBdUI7QUFBRUMsc0JBQVEsS0FBS0MsWUFBTCxDQUFrQkMsR0FBNUI7QUFBaUNDLHdCQUFVLEtBQUsxQixJQUFoRDtBQUFzRDJCLG9CQUFNLFVBQTVEO0FBQXdFM0Isb0JBQU8sR0FBR3FDLE9BQVMsSUFBSXhCLFlBQWMsSUFBSWlDLENBQUcsRUFBcEg7QUFBdUhqRix3QkFBVWdGO0FBQWpJLGFBQXZCLENBQW5CO0FBQ0EsaUJBQUtoRixRQUFMLENBQWNpRCxHQUFkLENBQWtCdUIsT0FBbEIsRUFBMkJ0QixHQUEzQixDQUFnQyxHQUFHRixZQUFjLElBQUlpQyxDQUFHLEVBQXhELEVBQTJELEtBQUt6QixVQUFMLENBQWdCUSxPQUFoQixDQUF3QmtCLFVBQXhCLENBQTNEO0FBQ0EsV0FIRDtBQUlBLFNBTEQsTUFLTztBQUNOLGdCQUFNQSxhQUFhLEtBQUsxQixVQUFMLENBQWdCQyxNQUFoQixDQUF1QjtBQUFFQyxvQkFBUSxLQUFLQyxZQUFMLENBQWtCQyxHQUE1QjtBQUFpQ0Msc0JBQVUsS0FBSzFCLElBQWhEO0FBQXNEMkIsa0JBQU0sVUFBNUQ7QUFBd0UzQixrQkFBTyxHQUFHcUMsT0FBUyxJQUFJeEIsWUFBYyxFQUE3RztBQUFnSGhELHNCQUFVbUQ7QUFBMUgsV0FBdkIsQ0FBbkI7QUFDQSxlQUFLbkQsUUFBTCxDQUFjaUQsR0FBZCxDQUFrQnVCLE9BQWxCLEVBQTJCdEIsR0FBM0IsQ0FBK0JGLFlBQS9CLEVBQTZDLEtBQUtRLFVBQUwsQ0FBZ0JRLE9BQWhCLENBQXdCa0IsVUFBeEIsQ0FBN0M7QUFDQTtBQUNEO0FBQ0Q7O0FBRUQsVUFBTWpCLFlBQU4sQ0FBbUI7QUFBRSx3QkFBa0JNLGFBQXBCO0FBQW1DSSxzQkFBZ0I7QUFBbkQsS0FBbkI7QUFDQSxVQUFNUixlQUFOLENBQXNCSSxhQUF0QixFQTdHMkMsQ0ErRzNDOztBQUNBLFFBQUl2RCxVQUFVa0QsTUFBVixLQUFxQixDQUFyQixJQUEwQm5ELGFBQWFtRCxNQUFiLEtBQXdCLENBQWxELElBQXVESyxrQkFBa0IsQ0FBN0UsRUFBZ0Y7QUFDL0UsV0FBS3BELE1BQUwsQ0FBWWdFLEtBQVosQ0FBa0IsMkRBQWxCO0FBQ0EsWUFBTTFELGNBQU4sQ0FBcUIvQixhQUFhMEYsS0FBbEM7QUFDQSxhQUFPLE1BQU1DLFdBQU4sRUFBUDtBQUNBOztBQUVELFVBQU1DLGlCQUFpQnRFLFVBQVVjLEdBQVYsQ0FBZWEsQ0FBRCxJQUFPLElBQUk5QyxhQUFKLENBQWtCOEMsRUFBRVgsRUFBcEIsRUFBd0JXLEVBQUVDLFFBQTFCLEVBQW9DRCxFQUFFRSxLQUF0QyxFQUE2QyxLQUE3QyxFQUFvRCxLQUFwRCxFQUEyRCxJQUEzRCxDQUFyQixDQUF2QjtBQUNBLFVBQU0wQyxvQkFBb0J4RSxhQUFhZSxHQUFiLENBQWtCQyxDQUFELElBQU8sSUFBSW5DLGdCQUFKLENBQXFCbUMsRUFBRUMsRUFBdkIsRUFBMkJELEVBQUVJLElBQTdCLEVBQW1DLEtBQW5DLEVBQTBDLElBQTFDLEVBQWdESixFQUFFTSxTQUFsRCxDQUF4QixDQUExQjtBQUNBLFVBQU1tRCxvQkFBb0IsS0FBSzdCLFlBQUwsQ0FBa0I4QixLQUFsQixDQUF3QnpGLFFBQWxEO0FBRUEsVUFBTXlCLGNBQU4sQ0FBcUIvQixhQUFhZ0csY0FBbEM7QUFDQSxXQUFPLElBQUkvRixTQUFKLENBQWMsS0FBS3dDLElBQW5CLEVBQXlCbUQsY0FBekIsRUFBeUNDLGlCQUF6QyxFQUE0REMsaUJBQTVELENBQVA7QUFDQTs7QUFFREcsY0FBWUMsZUFBWixFQUE2QjtBQUM1QixVQUFNRCxXQUFOLENBQWtCQyxlQUFsQjtBQUNBLFVBQU1DLFVBQVVDLEtBQUtDLEdBQUwsRUFBaEIsQ0FGNEIsQ0FJNUI7O0FBQ0EsU0FBSyxNQUFNQyxJQUFYLElBQW1CSixnQkFBZ0I3QixLQUFuQyxFQUEwQztBQUN6QyxXQUFLLE1BQU1wQixDQUFYLElBQWdCLEtBQUtvQixLQUFMLENBQVdBLEtBQTNCLEVBQWtDO0FBQ2pDLFlBQUlwQixFQUFFWCxFQUFGLEtBQVNnRSxLQUFLQyxPQUFsQixFQUEyQjtBQUMxQnRELFlBQUV1RCxTQUFGLEdBQWNGLEtBQUtFLFNBQW5CO0FBQ0E7QUFDRDtBQUNEOztBQUNELFNBQUsxQyxVQUFMLENBQWdCMkMsTUFBaEIsQ0FBdUI7QUFBRXZDLFdBQUssS0FBS0csS0FBTCxDQUFXSDtBQUFsQixLQUF2QixFQUFnRDtBQUFFd0MsWUFBTTtBQUFFckMsZUFBTyxLQUFLQSxLQUFMLENBQVdBO0FBQXBCO0FBQVIsS0FBaEQsRUFaNEIsQ0FjNUI7O0FBQ0EsU0FBSyxNQUFNUyxPQUFYLElBQXNCb0IsZ0JBQWdCdkIsUUFBdEMsRUFBZ0Q7QUFDL0MsV0FBSyxNQUFNdEMsQ0FBWCxJQUFnQixLQUFLc0MsUUFBTCxDQUFjQSxRQUE5QixFQUF3QztBQUN2QyxZQUFJdEMsRUFBRUMsRUFBRixLQUFTd0MsUUFBUTZCLFVBQXJCLEVBQWlDO0FBQ2hDdEUsWUFBRW1FLFNBQUYsR0FBYzFCLFFBQVEwQixTQUF0QjtBQUNBO0FBQ0Q7QUFDRDs7QUFDRCxTQUFLMUMsVUFBTCxDQUFnQjJDLE1BQWhCLENBQXVCO0FBQUV2QyxXQUFLLEtBQUtTLFFBQUwsQ0FBY1Q7QUFBckIsS0FBdkIsRUFBbUQ7QUFBRXdDLFlBQU07QUFBRS9CLGtCQUFVLEtBQUtBLFFBQUwsQ0FBY0E7QUFBMUI7QUFBUixLQUFuRDtBQUVBLFVBQU1pQyxrQkFBa0JDLE9BQU9DLE1BQVAsRUFBeEI7QUFDQUQsV0FBT0UsS0FBUCxDQUFhLE1BQU07QUFDbEIsWUFBTWhGLGNBQU4sQ0FBcUIvQixhQUFhZ0gsZUFBbEM7O0FBRUEsVUFBSTtBQUNIO0FBQ0EsYUFBSyxNQUFNL0QsQ0FBWCxJQUFnQixLQUFLb0IsS0FBTCxDQUFXQSxLQUEzQixFQUFrQztBQUNqQyxjQUFJLENBQUNwQixFQUFFdUQsU0FBUCxFQUFrQjtBQUNqQjtBQUNBOztBQUVESyxpQkFBT0ksU0FBUCxDQUFpQkwsZUFBakIsRUFBa0MsTUFBTTtBQUN2QyxnQkFBSU0sZUFBZUMsV0FBV0MsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0JDLHFCQUF4QixDQUE4Q3JFLEVBQUVFLEtBQWhELENBQW5CLENBRHVDLENBR3ZDOztBQUNBLGdCQUFJLENBQUMrRCxZQUFMLEVBQW1CO0FBQ2xCQSw2QkFBZUMsV0FBV0MsTUFBWCxDQUFrQkMsS0FBbEIsQ0FBd0JFLGlCQUF4QixDQUEwQ3RFLEVBQUVDLFFBQTVDLENBQWY7QUFDQTs7QUFFRCxnQkFBSWdFLFlBQUosRUFBa0I7QUFDakI7QUFDQWpFLGdCQUFFdUUsUUFBRixHQUFhTixhQUFhaEQsR0FBMUI7QUFDQWlELHlCQUFXQyxNQUFYLENBQWtCQyxLQUFsQixDQUF3QlosTUFBeEIsQ0FBK0I7QUFBRXZDLHFCQUFLakIsRUFBRXVFO0FBQVQsZUFBL0IsRUFBb0Q7QUFBRUMsMkJBQVc7QUFBRUMsNkJBQVd6RSxFQUFFWDtBQUFmO0FBQWIsZUFBcEQ7QUFDQSxhQUpELE1BSU87QUFDTixvQkFBTXdFLFNBQVNhLFNBQVNDLFVBQVQsQ0FBb0I7QUFBRXpFLHVCQUFPRixFQUFFRSxLQUFYO0FBQWtCMEUsMEJBQVV6QixLQUFLQyxHQUFMLEtBQWFwRCxFQUFFUixJQUFmLEdBQXNCUSxFQUFFRSxLQUFGLENBQVEyRSxXQUFSO0FBQWxELGVBQXBCLENBQWY7QUFDQWpCLHFCQUFPSSxTQUFQLENBQWlCSCxNQUFqQixFQUF5QixNQUFNO0FBQzlCRCx1QkFBT2tCLElBQVAsQ0FBWSxhQUFaLEVBQTJCOUUsRUFBRUMsUUFBN0IsRUFBdUM7QUFBRThFLCtDQUE2QjtBQUEvQixpQkFBdkM7QUFDQWIsMkJBQVdDLE1BQVgsQ0FBa0JDLEtBQWxCLENBQXdCWSxPQUF4QixDQUFnQ25CLE1BQWhDLEVBQXdDN0QsRUFBRVIsSUFBMUM7QUFDQTBFLDJCQUFXQyxNQUFYLENBQWtCQyxLQUFsQixDQUF3QlosTUFBeEIsQ0FBK0I7QUFBRXZDLHVCQUFLNEM7QUFBUCxpQkFBL0IsRUFBZ0Q7QUFBRVcsNkJBQVc7QUFBRUMsK0JBQVd6RSxFQUFFWDtBQUFmO0FBQWIsaUJBQWhEO0FBQ0FXLGtCQUFFdUUsUUFBRixHQUFhVixNQUFiO0FBQ0EsZUFMRDtBQU1BOztBQUVELGtCQUFNb0IsaUJBQU4sQ0FBd0IsQ0FBeEI7QUFDQSxXQXZCRDtBQXdCQTs7QUFDRCxhQUFLcEUsVUFBTCxDQUFnQjJDLE1BQWhCLENBQXVCO0FBQUV2QyxlQUFLLEtBQUtHLEtBQUwsQ0FBV0g7QUFBbEIsU0FBdkIsRUFBZ0Q7QUFBRXdDLGdCQUFNO0FBQUVyQyxtQkFBTyxLQUFLQSxLQUFMLENBQVdBO0FBQXBCO0FBQVIsU0FBaEQsRUFoQ0csQ0FrQ0g7O0FBQ0EsY0FBTXRDLGNBQU4sQ0FBcUIvQixhQUFhbUksa0JBQWxDOztBQUNBLGFBQUssTUFBTTlGLENBQVgsSUFBZ0IsS0FBS3NDLFFBQUwsQ0FBY0EsUUFBOUIsRUFBd0M7QUFDdkMsY0FBSSxDQUFDdEMsRUFBRW1FLFNBQVAsRUFBa0I7QUFDakI7QUFDQTs7QUFFREssaUJBQU9JLFNBQVAsQ0FBaUJMLGVBQWpCLEVBQWtDLE1BQU07QUFDdkMsa0JBQU13QixlQUFlakIsV0FBV0MsTUFBWCxDQUFrQmlCLEtBQWxCLENBQXdCQyxhQUF4QixDQUFzQ2pHLEVBQUVJLElBQXhDLENBQXJCLENBRHVDLENBRXZDOztBQUNBLGdCQUFJMkYsZ0JBQWdCL0YsRUFBRUksSUFBRixDQUFPcUYsV0FBUCxPQUF5QixTQUE3QyxFQUF3RDtBQUN2RHpGLGdCQUFFbUYsUUFBRixHQUFhbkYsRUFBRUksSUFBRixDQUFPcUYsV0FBUCxPQUF5QixTQUF6QixHQUFxQyxTQUFyQyxHQUFpRE0sYUFBYWxFLEdBQTNFO0FBQ0FpRCx5QkFBV0MsTUFBWCxDQUFrQmlCLEtBQWxCLENBQXdCNUIsTUFBeEIsQ0FBK0I7QUFBRXZDLHFCQUFLN0IsRUFBRW1GO0FBQVQsZUFBL0IsRUFBb0Q7QUFBRUMsMkJBQVc7QUFBRUMsNkJBQVdyRixFQUFFQztBQUFmO0FBQWIsZUFBcEQ7QUFDQSxhQUhELE1BR087QUFDTjtBQUNBLGtCQUFJaUcsWUFBWTNCLGVBQWhCOztBQUNBLG1CQUFLLE1BQU0zRCxDQUFYLElBQWdCLEtBQUtvQixLQUFMLENBQVdBLEtBQTNCLEVBQWtDO0FBQ2pDLG9CQUFJcEIsRUFBRUMsUUFBRixLQUFlYixFQUFFSyxPQUFqQixJQUE0Qk8sRUFBRXVELFNBQWxDLEVBQTZDO0FBQzVDK0IsOEJBQVl0RixFQUFFdUUsUUFBZDtBQUNBO0FBQ0QsZUFQSyxDQVNOOzs7QUFDQVgscUJBQU9JLFNBQVAsQ0FBaUJzQixTQUFqQixFQUE0QixNQUFNO0FBQ2pDLHNCQUFNQyxXQUFXM0IsT0FBT2tCLElBQVAsQ0FBWTFGLEVBQUVNLFNBQUYsR0FBYyxvQkFBZCxHQUFxQyxlQUFqRCxFQUFrRU4sRUFBRUksSUFBcEUsRUFBMEVKLEVBQUVPLE9BQTVFLENBQWpCO0FBQ0FQLGtCQUFFbUYsUUFBRixHQUFhZ0IsU0FBU0MsR0FBdEI7QUFDQSxlQUhEO0FBS0F0Qix5QkFBV0MsTUFBWCxDQUFrQmlCLEtBQWxCLENBQXdCNUIsTUFBeEIsQ0FBK0I7QUFBRXZDLHFCQUFLN0IsRUFBRW1GO0FBQVQsZUFBL0IsRUFBb0Q7QUFBRUMsMkJBQVc7QUFBRUMsNkJBQVdyRixFQUFFQztBQUFmO0FBQWIsZUFBcEQ7QUFDQTs7QUFFRCxrQkFBTTRGLGlCQUFOLENBQXdCLENBQXhCO0FBQ0EsV0F6QkQ7QUEwQkE7O0FBQ0QsYUFBS3BFLFVBQUwsQ0FBZ0IyQyxNQUFoQixDQUF1QjtBQUFFdkMsZUFBSyxLQUFLUyxRQUFMLENBQWNUO0FBQXJCLFNBQXZCLEVBQW1EO0FBQUV3QyxnQkFBTTtBQUFFL0Isc0JBQVUsS0FBS0EsUUFBTCxDQUFjQTtBQUExQjtBQUFSLFNBQW5ELEVBcEVHLENBc0VIOztBQUNBLFlBQUksS0FBS0EsUUFBTCxDQUFjQSxRQUFkLENBQXVCSCxNQUF2QixLQUFrQyxDQUF0QyxFQUF5QztBQUN4QyxlQUFLLE1BQU1rRSxLQUFYLElBQW9CLEtBQUtwSSxRQUFMLENBQWNxSSxJQUFkLEVBQXBCLEVBQTBDO0FBQ3pDOUIsbUJBQU9JLFNBQVAsQ0FBaUJMLGVBQWpCLEVBQWtDLE1BQU07QUFDdkMsb0JBQU13QixlQUFlakIsV0FBV0MsTUFBWCxDQUFrQmlCLEtBQWxCLENBQXdCQyxhQUF4QixDQUFzQ0ksS0FBdEMsQ0FBckI7O0FBQ0Esa0JBQUlOLGdCQUFnQk0sTUFBTVosV0FBTixPQUF3QixTQUE1QyxFQUF1RDtBQUN0RCxxQkFBS25ELFFBQUwsQ0FBY0EsUUFBZCxDQUF1QmlFLElBQXZCLENBQTRCO0FBQzNCdEcsc0JBQUlvRyxNQUFNbEcsT0FBTixDQUFjLEdBQWQsRUFBbUIsR0FBbkIsQ0FEdUI7QUFFM0JDLHdCQUFNaUcsS0FGcUI7QUFHM0JsQiw0QkFBV2tCLE1BQU1aLFdBQU4sT0FBd0IsU0FBeEIsR0FBb0MsU0FBcEMsR0FBZ0RNLGFBQWFsRSxHQUg3QztBQUkzQnNDLDZCQUFXO0FBSmdCLGlCQUE1QjtBQU1BO0FBQ0QsYUFWRDtBQVdBO0FBQ0QsU0FyRkUsQ0F1Rkg7OztBQUNBLFlBQUksS0FBS25DLEtBQUwsQ0FBV0EsS0FBWCxDQUFpQkcsTUFBakIsS0FBNEIsQ0FBaEMsRUFBbUM7QUFDbEMsZUFBSyxNQUFNLENBQUNxRSxFQUFELEVBQUs5RCxXQUFMLENBQVgsSUFBZ0MsS0FBS3pFLFFBQUwsQ0FBYzBFLE9BQWQsRUFBaEMsRUFBeUQ7QUFDeEQsa0JBQU04RCxhQUFhLEtBQUtDLGtCQUFMLENBQXdCRixFQUF4QixDQUFuQjs7QUFDQSxnQkFBSSxDQUFDQyxVQUFELElBQWUsQ0FBQ0EsV0FBV3RDLFNBQS9CLEVBQTBDO0FBQ3pDO0FBQ0E7O0FBQ0RLLG1CQUFPSSxTQUFQLENBQWlCTCxlQUFqQixFQUFrQyxNQUFNO0FBQ3ZDLG1CQUFLLE1BQU1uRCxJQUFYLElBQW1Cc0IsWUFBWWlFLE1BQVosRUFBbkIsRUFBeUM7QUFDeEMscUJBQUssTUFBTUMsR0FBWCxJQUFrQnhGLEtBQUtuRCxRQUF2QixFQUFpQztBQUNoQyxzQkFBSSxDQUFDLEtBQUs0SSxtQkFBTCxDQUF5QkQsSUFBSS9GLFFBQTdCLENBQUwsRUFBNkM7QUFDNUMsMEJBQU1vRCxPQUFPYSxXQUFXQyxNQUFYLENBQWtCQyxLQUFsQixDQUF3QkUsaUJBQXhCLENBQTBDMEIsSUFBSS9GLFFBQTlDLENBQWI7O0FBQ0Esd0JBQUlvRCxJQUFKLEVBQVU7QUFDVCwyQkFBS2pDLEtBQUwsQ0FBV0EsS0FBWCxDQUFpQnVFLElBQWpCLENBQXNCO0FBQ3JCcEIsa0NBQVVsQixLQUFLcEMsR0FETTtBQUVyQmhCLGtDQUFVb0QsS0FBS3BEO0FBRk0sdUJBQXRCO0FBSUE7QUFDRDtBQUNEO0FBQ0Q7QUFDRCxhQWREO0FBZUE7QUFDRCxTQTlHRSxDQWdISDs7O0FBQ0EsY0FBTW5CLGNBQU4sQ0FBcUIvQixhQUFhbUosa0JBQWxDOztBQUNBLGFBQUssTUFBTSxDQUFDTixFQUFELEVBQUs5RCxXQUFMLENBQVgsSUFBZ0MsS0FBS3pFLFFBQUwsQ0FBYzBFLE9BQWQsRUFBaEMsRUFBeUQ7QUFDeEQsZ0JBQU04RCxhQUFhLEtBQUtDLGtCQUFMLENBQXdCRixFQUF4QixDQUFuQjs7QUFDQSxjQUFJLENBQUNDLFVBQUQsSUFBZSxDQUFDQSxXQUFXdEMsU0FBL0IsRUFBMEM7QUFDekM7QUFDQTs7QUFFRCxnQkFBTTRDLE9BQU9qQyxXQUFXQyxNQUFYLENBQWtCaUIsS0FBbEIsQ0FBd0JnQixXQUF4QixDQUFvQ1AsV0FBV3RCLFFBQS9DLEVBQXlEO0FBQUU4QixvQkFBUTtBQUFFQyx5QkFBVyxDQUFiO0FBQWdCQyxpQkFBRyxDQUFuQjtBQUFzQi9HLG9CQUFNO0FBQTVCO0FBQVYsV0FBekQsQ0FBYjtBQUNBb0UsaUJBQU9JLFNBQVAsQ0FBaUJMLGVBQWpCLEVBQWtDLE1BQU07QUFDdkMsa0JBQU02QyxhQUFhLEVBQW5COztBQUNBLGlCQUFLLE1BQU0sQ0FBQ25HLFlBQUQsRUFBZUcsSUFBZixDQUFYLElBQW1Dc0IsWUFBWUMsT0FBWixFQUFuQyxFQUEwRDtBQUN6RCxvQkFBTVQsWUFBTixDQUFtQjtBQUFFVSxnQ0FBaUIsR0FBRzRELEVBQUksSUFBSXZGLFlBQWMsSUFBSUcsS0FBS25ELFFBQUwsQ0FBY2tFLE1BQVE7QUFBdEUsZUFBbkI7O0FBQ0EsbUJBQUssTUFBTXlFLEdBQVgsSUFBa0J4RixLQUFLbkQsUUFBdkIsRUFBaUM7QUFDaEMsb0JBQUlvSixNQUFNLElBQUl0RCxJQUFKLENBQVN1RCxTQUFTVixJQUFJckYsRUFBYixDQUFULENBQU4sQ0FBSixFQUF1QztBQUN0Qyx1QkFBS25DLE1BQUwsQ0FBWWtDLElBQVosQ0FBa0IsNkJBQTZCa0YsRUFBSSxJQUFJdkYsWUFBYyxhQUFyRTtBQUNBLHdCQUFNNEUsaUJBQU4sQ0FBd0IsQ0FBeEI7QUFDQTtBQUNBOztBQUVELHNCQUFNeEYsVUFBVSxLQUFLd0csbUJBQUwsQ0FBeUJELElBQUkvRixRQUE3QixDQUFoQjs7QUFDQSxvQkFBSVIsT0FBSixFQUFhO0FBQ1osc0JBQUlrSCxTQUFTLEVBQWI7O0FBQ0Esc0JBQUlILFdBQVdSLElBQUlyRixFQUFmLE1BQXVCaUcsU0FBM0IsRUFBc0M7QUFDckNKLCtCQUFXUixJQUFJckYsRUFBZixJQUFxQixDQUFyQjtBQUNBLG1CQUZELE1BRU87QUFDTmdHLDZCQUFVLElBQUlILFdBQVdSLElBQUlyRixFQUFmLENBQW9CLEVBQWxDO0FBQ0E2RiwrQkFBV1IsSUFBSXJGLEVBQWYsS0FBc0IsQ0FBdEI7QUFDQTs7QUFDRCx3QkFBTWtHLFNBQVM7QUFDZDVGLHlCQUFNLE9BQU80RSxXQUFXeEcsRUFBSSxJQUFJMkcsSUFBSXJGLEVBQUksR0FBR2dHLE1BQVEsRUFEckM7QUFFZGhHLHdCQUFJLElBQUl3QyxJQUFKLENBQVN1RCxTQUFTVixJQUFJckYsRUFBYixDQUFULENBRlU7QUFHZHFGLHlCQUFLQSxJQUFJckosSUFISztBQUlkNkkseUJBQUtXLEtBQUtsRixHQUpJO0FBS2RqQix1QkFBRztBQUNGaUIsMkJBQUt4QixRQUFRd0IsR0FEWDtBQUVGaEIsZ0NBQVVSLFFBQVFRO0FBRmhCO0FBTFcsbUJBQWY7QUFXQWlFLDZCQUFXNEMsV0FBWCxDQUF1QnJILE9BQXZCLEVBQWdDb0gsTUFBaEMsRUFBd0NWLElBQXhDLEVBQThDLElBQTlDO0FBQ0E7O0FBRUQsc0JBQU1sQixpQkFBTixDQUF3QixDQUF4QjtBQUNBO0FBQ0Q7QUFDRCxXQXJDRDtBQXNDQTs7QUFFRCxjQUFNbkcsY0FBTixDQUFxQi9CLGFBQWFnSyxTQUFsQztBQUNBLGNBQU1qSSxjQUFOLENBQXFCL0IsYUFBYWlLLElBQWxDO0FBQ0EsT0FuS0QsQ0FtS0UsT0FBT3ZHLENBQVAsRUFBVTtBQUNYLGFBQUtqQyxNQUFMLENBQVlnRSxLQUFaLENBQWtCL0IsQ0FBbEI7QUFDQSxjQUFNM0IsY0FBTixDQUFxQi9CLGFBQWEwRixLQUFsQztBQUNBOztBQUVELFlBQU13RSxXQUFXOUQsS0FBS0MsR0FBTCxLQUFhRixPQUE5QjtBQUNBLFdBQUsxRSxNQUFMLENBQVkwSSxHQUFaLENBQWlCLG1CQUFtQkQsUUFBVSxnQkFBOUM7QUFDQSxLQTdLRDtBQStLQSxXQUFPLE1BQU12RSxXQUFOLEVBQVA7QUFDQTs7QUFFRHlFLGlCQUFlO0FBQ2QsVUFBTXhFLGlCQUFpQixLQUFLdkIsS0FBTCxDQUFXQSxLQUFYLENBQWlCakMsR0FBakIsQ0FBc0JhLENBQUQsSUFBTyxJQUFJOUMsYUFBSixDQUFrQjhDLEVBQUVYLEVBQXBCLEVBQXdCVyxFQUFFQyxRQUExQixFQUFvQ0QsRUFBRUUsS0FBdEMsRUFBNkMsS0FBN0MsRUFBb0QsS0FBcEQsRUFBMkQsSUFBM0QsQ0FBNUIsQ0FBdkI7QUFDQSxVQUFNMEMsb0JBQW9CLEtBQUtsQixRQUFMLENBQWNBLFFBQWQsQ0FBdUJ2QyxHQUF2QixDQUE0QkMsQ0FBRCxJQUFPLElBQUluQyxnQkFBSixDQUFxQm1DLEVBQUVDLEVBQXZCLEVBQTJCRCxFQUFFSSxJQUE3QixFQUFtQyxLQUFuQyxFQUEwQyxJQUExQyxFQUFnREosRUFBRU0sU0FBbEQsQ0FBbEMsQ0FBMUI7QUFDQSxVQUFNbUQsb0JBQW9CLEtBQUs3QixZQUFMLENBQWtCOEIsS0FBbEIsQ0FBd0J6RixRQUFsRDtBQUVBLFdBQU8sSUFBSUwsU0FBSixDQUFjLEtBQUt3QyxJQUFuQixFQUF5Qm1ELGNBQXpCLEVBQXlDQyxpQkFBekMsRUFBNERDLGlCQUE1RCxDQUFQO0FBQ0E7O0FBRURpRCxxQkFBbUIxRixXQUFuQixFQUFnQztBQUMvQixTQUFLLE1BQU13RixFQUFYLElBQWlCLEtBQUtsRSxRQUFMLENBQWNBLFFBQS9CLEVBQXlDO0FBQ3hDLFVBQUlrRSxHQUFHcEcsSUFBSCxLQUFZWSxXQUFoQixFQUE2QjtBQUM1QixlQUFPd0YsRUFBUDtBQUNBO0FBQ0Q7QUFDRDs7QUFFREssc0JBQW9CaEcsUUFBcEIsRUFBOEI7QUFDN0IsU0FBSyxNQUFNRCxDQUFYLElBQWdCLEtBQUtvQixLQUFMLENBQVdBLEtBQTNCLEVBQWtDO0FBQ2pDLFVBQUlwQixFQUFFQyxRQUFGLEtBQWVBLFFBQW5CLEVBQTZCO0FBQzVCLGVBQU9pRSxXQUFXQyxNQUFYLENBQWtCQyxLQUFsQixDQUF3QmdDLFdBQXhCLENBQW9DcEcsRUFBRXVFLFFBQXRDLEVBQWdEO0FBQUU4QixrQkFBUTtBQUFFcEcsc0JBQVU7QUFBWjtBQUFWLFNBQWhELENBQVA7QUFDQTtBQUNEO0FBQ0Q7O0FBdldvQyxDOzs7Ozs7Ozs7OztBQ1J0QyxJQUFJbUgsU0FBSjtBQUFjakwsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLDRCQUFSLENBQWIsRUFBbUQ7QUFBQzRLLFlBQVUzSyxDQUFWLEVBQVk7QUFBQzJLLGdCQUFVM0ssQ0FBVjtBQUFZOztBQUExQixDQUFuRCxFQUErRSxDQUEvRTtBQUFrRixJQUFJSixlQUFKO0FBQW9CRixPQUFPSSxLQUFQLENBQWFDLFFBQVEsU0FBUixDQUFiLEVBQWdDO0FBQUNILGtCQUFnQkksQ0FBaEIsRUFBa0I7QUFBQ0osc0JBQWdCSSxDQUFoQjtBQUFrQjs7QUFBdEMsQ0FBaEMsRUFBd0UsQ0FBeEU7QUFBMkUsSUFBSUksV0FBSjtBQUFnQlYsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLFlBQVIsQ0FBYixFQUFtQztBQUFDSyxjQUFZSixDQUFaLEVBQWM7QUFBQ0ksa0JBQVlKLENBQVo7QUFBYzs7QUFBOUIsQ0FBbkMsRUFBbUUsQ0FBbkU7QUFJL00ySyxVQUFVQyxHQUFWLENBQWMsSUFBSWhMLGVBQUosRUFBZCxFQUFxQ1EsV0FBckMsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9pbXBvcnRlci1jc3YuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbXBvcnRlckluZm8gfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDppbXBvcnRlcic7XG5cbmV4cG9ydCBjbGFzcyBDc3ZJbXBvcnRlckluZm8gZXh0ZW5kcyBJbXBvcnRlckluZm8ge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignY3N2JywgJ0NTVicsICdhcHBsaWNhdGlvbi96aXAnLCBbe1xuXHRcdFx0dGV4dDogJ0ltcG9ydGVyX0NTVl9JbmZvcm1hdGlvbicsXG5cdFx0XHRocmVmOiAnaHR0cHM6Ly9yb2NrZXQuY2hhdC9kb2NzL2FkbWluaXN0cmF0b3ItZ3VpZGVzL2ltcG9ydC9jc3YvJyxcblx0XHR9XSk7XG5cdH1cbn1cbiIsImltcG9ydCB7XG5cdEJhc2UsXG5cdFByb2dyZXNzU3RlcCxcblx0U2VsZWN0aW9uLFxuXHRTZWxlY3Rpb25DaGFubmVsLFxuXHRTZWxlY3Rpb25Vc2VyLFxufSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDppbXBvcnRlcic7XG5cbmV4cG9ydCBjbGFzcyBDc3ZJbXBvcnRlciBleHRlbmRzIEJhc2Uge1xuXHRjb25zdHJ1Y3RvcihpbmZvKSB7XG5cdFx0c3VwZXIoaW5mbyk7XG5cblx0XHR0aGlzLmNzdlBhcnNlciA9IHJlcXVpcmUoJ2Nzdi1wYXJzZS9saWIvc3luYycpO1xuXHRcdHRoaXMubWVzc2FnZXMgPSBuZXcgTWFwKCk7XG5cdH1cblxuXHRwcmVwYXJlKGRhdGFVUkksIHNlbnRDb250ZW50VHlwZSwgZmlsZU5hbWUpIHtcblx0XHRzdXBlci5wcmVwYXJlKGRhdGFVUkksIHNlbnRDb250ZW50VHlwZSwgZmlsZU5hbWUpO1xuXG5cdFx0Y29uc3QgdXJpUmVzdWx0ID0gUm9ja2V0Q2hhdEZpbGUuZGF0YVVSSVBhcnNlKGRhdGFVUkkpO1xuXHRcdGNvbnN0IHppcCA9IG5ldyB0aGlzLkFkbVppcChuZXcgQnVmZmVyKHVyaVJlc3VsdC5pbWFnZSwgJ2Jhc2U2NCcpKTtcblx0XHRjb25zdCB6aXBFbnRyaWVzID0gemlwLmdldEVudHJpZXMoKTtcblxuXHRcdGxldCB0ZW1wQ2hhbm5lbHMgPSBbXTtcblx0XHRsZXQgdGVtcFVzZXJzID0gW107XG5cdFx0Y29uc3QgdGVtcE1lc3NhZ2VzID0gbmV3IE1hcCgpO1xuXHRcdGZvciAoY29uc3QgZW50cnkgb2YgemlwRW50cmllcykge1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoYEVudHJ5OiAkeyBlbnRyeS5lbnRyeU5hbWUgfWApO1xuXG5cdFx0XHQvLyBJZ25vcmUgYW55dGhpbmcgdGhhdCBoYXMgYF9fTUFDT1NYYCBpbiBpdCdzIG5hbWUsIGFzIHNhZGx5IHRoZXNlIHRoaW5ncyBzZWVtIHRvIG1lc3MgZXZlcnl0aGluZyB1cFxuXHRcdFx0aWYgKGVudHJ5LmVudHJ5TmFtZS5pbmRleE9mKCdfX01BQ09TWCcpID4gLTEpIHtcblx0XHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoYElnbm9yaW5nIHRoZSBmaWxlOiAkeyBlbnRyeS5lbnRyeU5hbWUgfWApO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRGlyZWN0b3JpZXMgYXJlIGlnbm9yZWQsIHNpbmNlIHRoZXkgYXJlIFwidmlydHVhbFwiIGluIGEgemlwIGZpbGVcblx0XHRcdGlmIChlbnRyeS5pc0RpcmVjdG9yeSkge1xuXHRcdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZyhgSWdub3JpbmcgdGhlIGRpcmVjdG9yeSBlbnRyeTogJHsgZW50cnkuZW50cnlOYW1lIH1gKTtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFBhcnNlIHRoZSBjaGFubmVsc1xuXHRcdFx0aWYgKGVudHJ5LmVudHJ5TmFtZS50b0xvd2VyQ2FzZSgpID09PSAnY2hhbm5lbHMuY3N2Jykge1xuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuUFJFUEFSSU5HX0NIQU5ORUxTKTtcblx0XHRcdFx0Y29uc3QgcGFyc2VkQ2hhbm5lbHMgPSB0aGlzLmNzdlBhcnNlcihlbnRyeS5nZXREYXRhKCkudG9TdHJpbmcoKSk7XG5cdFx0XHRcdHRlbXBDaGFubmVscyA9IHBhcnNlZENoYW5uZWxzLm1hcCgoYykgPT4gKHtcblx0XHRcdFx0XHRpZDogY1swXS50cmltKCkucmVwbGFjZSgnLicsICdfJyksXG5cdFx0XHRcdFx0bmFtZTogY1swXS50cmltKCksXG5cdFx0XHRcdFx0Y3JlYXRvcjogY1sxXS50cmltKCksXG5cdFx0XHRcdFx0aXNQcml2YXRlOiBjWzJdLnRyaW0oKS50b0xvd2VyQ2FzZSgpID09PSAncHJpdmF0ZScsXG5cdFx0XHRcdFx0bWVtYmVyczogY1szXS50cmltKCkuc3BsaXQoJzsnKS5tYXAoKG0pID0+IG0udHJpbSgpKSxcblx0XHRcdFx0fSkpO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gUGFyc2UgdGhlIHVzZXJzXG5cdFx0XHRpZiAoZW50cnkuZW50cnlOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICd1c2Vycy5jc3YnKSB7XG5cdFx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5QUkVQQVJJTkdfVVNFUlMpO1xuXHRcdFx0XHRjb25zdCBwYXJzZWRVc2VycyA9IHRoaXMuY3N2UGFyc2VyKGVudHJ5LmdldERhdGEoKS50b1N0cmluZygpKTtcblx0XHRcdFx0dGVtcFVzZXJzID0gcGFyc2VkVXNlcnMubWFwKCh1KSA9PiAoeyBpZDogdVswXS50cmltKCkucmVwbGFjZSgnLicsICdfJyksIHVzZXJuYW1lOiB1WzBdLnRyaW0oKSwgZW1haWw6IHVbMV0udHJpbSgpLCBuYW1lOiB1WzJdLnRyaW0oKSB9KSk7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBQYXJzZSB0aGUgbWVzc2FnZXNcblx0XHRcdGlmIChlbnRyeS5lbnRyeU5hbWUuaW5kZXhPZignLycpID4gLTEpIHtcblx0XHRcdFx0Y29uc3QgaXRlbSA9IGVudHJ5LmVudHJ5TmFtZS5zcGxpdCgnLycpOyAvLyByYW5kb20vbWVzc2FnZXMuY3N2XG5cdFx0XHRcdGNvbnN0IGNoYW5uZWxOYW1lID0gaXRlbVswXTsgLy8gcmFuZG9tXG5cdFx0XHRcdGNvbnN0IG1zZ0dyb3VwRGF0YSA9IGl0ZW1bMV0uc3BsaXQoJy4nKVswXTsgLy8gMjAxNS0xMC0wNFxuXG5cdFx0XHRcdGlmICghdGVtcE1lc3NhZ2VzLmdldChjaGFubmVsTmFtZSkpIHtcblx0XHRcdFx0XHR0ZW1wTWVzc2FnZXMuc2V0KGNoYW5uZWxOYW1lLCBuZXcgTWFwKCkpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0bGV0IG1zZ3MgPSBbXTtcblxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdG1zZ3MgPSB0aGlzLmNzdlBhcnNlcihlbnRyeS5nZXREYXRhKCkudG9TdHJpbmcoKSk7XG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKGBUaGUgZmlsZSAkeyBlbnRyeS5lbnRyeU5hbWUgfSBjb250YWlucyBpbnZhbGlkIHN5bnRheGAsIGUpO1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGVtcE1lc3NhZ2VzLmdldChjaGFubmVsTmFtZSkuc2V0KG1zZ0dyb3VwRGF0YSwgbXNncy5tYXAoKG0pID0+ICh7IHVzZXJuYW1lOiBtWzBdLCB0czogbVsxXSwgdGV4dDogbVsyXSB9KSkpO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBJbnNlcnQgdGhlIHVzZXJzIHJlY29yZCwgZXZlbnR1YWxseSB0aGlzIG1pZ2h0IGhhdmUgdG8gYmUgc3BsaXQgaW50byBzZXZlcmFsIG9uZXMgYXMgd2VsbFxuXHRcdC8vIGlmIHNvbWVvbmUgdHJpZXMgdG8gaW1wb3J0IGEgc2V2ZXJhbCB0aG91c2FuZHMgdXNlcnMgaW5zdGFuY2Vcblx0XHRjb25zdCB1c2Vyc0lkID0gdGhpcy5jb2xsZWN0aW9uLmluc2VydCh7IGltcG9ydDogdGhpcy5pbXBvcnRSZWNvcmQuX2lkLCBpbXBvcnRlcjogdGhpcy5uYW1lLCB0eXBlOiAndXNlcnMnLCB1c2VyczogdGVtcFVzZXJzIH0pO1xuXHRcdHRoaXMudXNlcnMgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZSh1c2Vyc0lkKTtcblx0XHRzdXBlci51cGRhdGVSZWNvcmQoeyAnY291bnQudXNlcnMnOiB0ZW1wVXNlcnMubGVuZ3RoIH0pO1xuXHRcdHN1cGVyLmFkZENvdW50VG9Ub3RhbCh0ZW1wVXNlcnMubGVuZ3RoKTtcblxuXHRcdC8vIEluc2VydCB0aGUgY2hhbm5lbHMgcmVjb3Jkcy5cblx0XHRjb25zdCBjaGFubmVsc0lkID0gdGhpcy5jb2xsZWN0aW9uLmluc2VydCh7IGltcG9ydDogdGhpcy5pbXBvcnRSZWNvcmQuX2lkLCBpbXBvcnRlcjogdGhpcy5uYW1lLCB0eXBlOiAnY2hhbm5lbHMnLCBjaGFubmVsczogdGVtcENoYW5uZWxzIH0pO1xuXHRcdHRoaXMuY2hhbm5lbHMgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShjaGFubmVsc0lkKTtcblx0XHRzdXBlci51cGRhdGVSZWNvcmQoeyAnY291bnQuY2hhbm5lbHMnOiB0ZW1wQ2hhbm5lbHMubGVuZ3RoIH0pO1xuXHRcdHN1cGVyLmFkZENvdW50VG9Ub3RhbCh0ZW1wQ2hhbm5lbHMubGVuZ3RoKTtcblxuXHRcdC8vIFNhdmUgdGhlIG1lc3NhZ2VzIHJlY29yZHMgdG8gdGhlIGltcG9ydCByZWNvcmQgZm9yIGBzdGFydEltcG9ydGAgdXNhZ2Vcblx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuUFJFUEFSSU5HX01FU1NBR0VTKTtcblx0XHRsZXQgbWVzc2FnZXNDb3VudCA9IDA7XG5cdFx0Zm9yIChjb25zdCBbY2hhbm5lbCwgbWVzc2FnZXNNYXBdIG9mIHRlbXBNZXNzYWdlcy5lbnRyaWVzKCkpIHtcblx0XHRcdGlmICghdGhpcy5tZXNzYWdlcy5nZXQoY2hhbm5lbCkpIHtcblx0XHRcdFx0dGhpcy5tZXNzYWdlcy5zZXQoY2hhbm5lbCwgbmV3IE1hcCgpKTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yIChjb25zdCBbbXNnR3JvdXBEYXRhLCBtc2dzXSBvZiBtZXNzYWdlc01hcC5lbnRyaWVzKCkpIHtcblx0XHRcdFx0bWVzc2FnZXNDb3VudCArPSBtc2dzLmxlbmd0aDtcblx0XHRcdFx0c3VwZXIudXBkYXRlUmVjb3JkKHsgbWVzc2FnZXNzdGF0dXM6IGAkeyBjaGFubmVsIH0vJHsgbXNnR3JvdXBEYXRhIH1gIH0pO1xuXG5cdFx0XHRcdGlmIChCYXNlLmdldEJTT05TaXplKG1zZ3MpID4gQmFzZS5nZXRNYXhCU09OU2l6ZSgpKSB7XG5cdFx0XHRcdFx0QmFzZS5nZXRCU09OU2FmZUFycmF5c0Zyb21BbkFycmF5KG1zZ3MpLmZvckVhY2goKHNwbGl0TXNnLCBpKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zdCBtZXNzYWdlc0lkID0gdGhpcy5jb2xsZWN0aW9uLmluc2VydCh7IGltcG9ydDogdGhpcy5pbXBvcnRSZWNvcmQuX2lkLCBpbXBvcnRlcjogdGhpcy5uYW1lLCB0eXBlOiAnbWVzc2FnZXMnLCBuYW1lOiBgJHsgY2hhbm5lbCB9LyR7IG1zZ0dyb3VwRGF0YSB9LiR7IGkgfWAsIG1lc3NhZ2VzOiBzcGxpdE1zZyB9KTtcblx0XHRcdFx0XHRcdHRoaXMubWVzc2FnZXMuZ2V0KGNoYW5uZWwpLnNldChgJHsgbXNnR3JvdXBEYXRhIH0uJHsgaSB9YCwgdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUobWVzc2FnZXNJZCkpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNvbnN0IG1lc3NhZ2VzSWQgPSB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHsgaW1wb3J0OiB0aGlzLmltcG9ydFJlY29yZC5faWQsIGltcG9ydGVyOiB0aGlzLm5hbWUsIHR5cGU6ICdtZXNzYWdlcycsIG5hbWU6IGAkeyBjaGFubmVsIH0vJHsgbXNnR3JvdXBEYXRhIH1gLCBtZXNzYWdlczogbXNncyB9KTtcblx0XHRcdFx0XHR0aGlzLm1lc3NhZ2VzLmdldChjaGFubmVsKS5zZXQobXNnR3JvdXBEYXRhLCB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShtZXNzYWdlc0lkKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRzdXBlci51cGRhdGVSZWNvcmQoeyAnY291bnQubWVzc2FnZXMnOiBtZXNzYWdlc0NvdW50LCBtZXNzYWdlc3N0YXR1czogbnVsbCB9KTtcblx0XHRzdXBlci5hZGRDb3VudFRvVG90YWwobWVzc2FnZXNDb3VudCk7XG5cblx0XHQvLyBFbnN1cmUgd2UgaGF2ZSBhdCBsZWFzdCBhIHNpbmdsZSB1c2VyLCBjaGFubmVsLCBvciBtZXNzYWdlXG5cdFx0aWYgKHRlbXBVc2Vycy5sZW5ndGggPT09IDAgJiYgdGVtcENoYW5uZWxzLmxlbmd0aCA9PT0gMCAmJiBtZXNzYWdlc0NvdW50ID09PSAwKSB7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignTm8gdXNlcnMsIGNoYW5uZWxzLCBvciBtZXNzYWdlcyBmb3VuZCBpbiB0aGUgaW1wb3J0IGZpbGUuJyk7XG5cdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuRVJST1IpO1xuXHRcdFx0cmV0dXJuIHN1cGVyLmdldFByb2dyZXNzKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2VsZWN0aW9uVXNlcnMgPSB0ZW1wVXNlcnMubWFwKCh1KSA9PiBuZXcgU2VsZWN0aW9uVXNlcih1LmlkLCB1LnVzZXJuYW1lLCB1LmVtYWlsLCBmYWxzZSwgZmFsc2UsIHRydWUpKTtcblx0XHRjb25zdCBzZWxlY3Rpb25DaGFubmVscyA9IHRlbXBDaGFubmVscy5tYXAoKGMpID0+IG5ldyBTZWxlY3Rpb25DaGFubmVsKGMuaWQsIGMubmFtZSwgZmFsc2UsIHRydWUsIGMuaXNQcml2YXRlKSk7XG5cdFx0Y29uc3Qgc2VsZWN0aW9uTWVzc2FnZXMgPSB0aGlzLmltcG9ydFJlY29yZC5jb3VudC5tZXNzYWdlcztcblxuXHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5VU0VSX1NFTEVDVElPTik7XG5cdFx0cmV0dXJuIG5ldyBTZWxlY3Rpb24odGhpcy5uYW1lLCBzZWxlY3Rpb25Vc2Vycywgc2VsZWN0aW9uQ2hhbm5lbHMsIHNlbGVjdGlvbk1lc3NhZ2VzKTtcblx0fVxuXG5cdHN0YXJ0SW1wb3J0KGltcG9ydFNlbGVjdGlvbikge1xuXHRcdHN1cGVyLnN0YXJ0SW1wb3J0KGltcG9ydFNlbGVjdGlvbik7XG5cdFx0Y29uc3Qgc3RhcnRlZCA9IERhdGUubm93KCk7XG5cblx0XHQvLyBFbnN1cmUgd2UncmUgb25seSBnb2luZyB0byBpbXBvcnQgdGhlIHVzZXJzIHRoYXQgdGhlIHVzZXIgaGFzIHNlbGVjdGVkXG5cdFx0Zm9yIChjb25zdCB1c2VyIG9mIGltcG9ydFNlbGVjdGlvbi51c2Vycykge1xuXHRcdFx0Zm9yIChjb25zdCB1IG9mIHRoaXMudXNlcnMudXNlcnMpIHtcblx0XHRcdFx0aWYgKHUuaWQgPT09IHVzZXIudXNlcl9pZCkge1xuXHRcdFx0XHRcdHUuZG9faW1wb3J0ID0gdXNlci5kb19pbXBvcnQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy5jb2xsZWN0aW9uLnVwZGF0ZSh7IF9pZDogdGhpcy51c2Vycy5faWQgfSwgeyAkc2V0OiB7IHVzZXJzOiB0aGlzLnVzZXJzLnVzZXJzIH0gfSk7XG5cblx0XHQvLyBFbnN1cmUgd2UncmUgb25seSBpbXBvcnRpbmcgdGhlIGNoYW5uZWxzIHRoZSB1c2VyIGhhcyBzZWxlY3RlZC5cblx0XHRmb3IgKGNvbnN0IGNoYW5uZWwgb2YgaW1wb3J0U2VsZWN0aW9uLmNoYW5uZWxzKSB7XG5cdFx0XHRmb3IgKGNvbnN0IGMgb2YgdGhpcy5jaGFubmVscy5jaGFubmVscykge1xuXHRcdFx0XHRpZiAoYy5pZCA9PT0gY2hhbm5lbC5jaGFubmVsX2lkKSB7XG5cdFx0XHRcdFx0Yy5kb19pbXBvcnQgPSBjaGFubmVsLmRvX2ltcG9ydDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLmNvbGxlY3Rpb24udXBkYXRlKHsgX2lkOiB0aGlzLmNoYW5uZWxzLl9pZCB9LCB7ICRzZXQ6IHsgY2hhbm5lbHM6IHRoaXMuY2hhbm5lbHMuY2hhbm5lbHMgfSB9KTtcblxuXHRcdGNvbnN0IHN0YXJ0ZWRCeVVzZXJJZCA9IE1ldGVvci51c2VySWQoKTtcblx0XHRNZXRlb3IuZGVmZXIoKCkgPT4ge1xuXHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLklNUE9SVElOR19VU0VSUyk7XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdC8vIEltcG9ydCB0aGUgdXNlcnNcblx0XHRcdFx0Zm9yIChjb25zdCB1IG9mIHRoaXMudXNlcnMudXNlcnMpIHtcblx0XHRcdFx0XHRpZiAoIXUuZG9faW1wb3J0KSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKHN0YXJ0ZWRCeVVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0bGV0IGV4aXN0YW50VXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUVtYWlsQWRkcmVzcyh1LmVtYWlsKTtcblxuXHRcdFx0XHRcdFx0Ly8gSWYgd2UgY291bGRuJ3QgZmluZCBvbmUgYnkgdGhlaXIgZW1haWwgYWRkcmVzcywgdHJ5IHRvIGZpbmQgYW4gZXhpc3RpbmcgdXNlciBieSB0aGVpciB1c2VybmFtZVxuXHRcdFx0XHRcdFx0aWYgKCFleGlzdGFudFVzZXIpIHtcblx0XHRcdFx0XHRcdFx0ZXhpc3RhbnRVc2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5VXNlcm5hbWUodS51c2VybmFtZSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmIChleGlzdGFudFVzZXIpIHtcblx0XHRcdFx0XHRcdFx0Ly8gc2luY2Ugd2UgaGF2ZSBhbiBleGlzdGluZyB1c2VyLCBsZXQncyB0cnkgYSBmZXcgdGhpbmdzXG5cdFx0XHRcdFx0XHRcdHUucm9ja2V0SWQgPSBleGlzdGFudFVzZXIuX2lkO1xuXHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy51cGRhdGUoeyBfaWQ6IHUucm9ja2V0SWQgfSwgeyAkYWRkVG9TZXQ6IHsgaW1wb3J0SWRzOiB1LmlkIH0gfSk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRjb25zdCB1c2VySWQgPSBBY2NvdW50cy5jcmVhdGVVc2VyKHsgZW1haWw6IHUuZW1haWwsIHBhc3N3b3JkOiBEYXRlLm5vdygpICsgdS5uYW1lICsgdS5lbWFpbC50b1VwcGVyQ2FzZSgpIH0pO1xuXHRcdFx0XHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdE1ldGVvci5jYWxsKCdzZXRVc2VybmFtZScsIHUudXNlcm5hbWUsIHsgam9pbkRlZmF1bHRDaGFubmVsc1NpbGVuY2VkOiB0cnVlIH0pO1xuXHRcdFx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnNldE5hbWUodXNlcklkLCB1Lm5hbWUpO1xuXHRcdFx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnVwZGF0ZSh7IF9pZDogdXNlcklkIH0sIHsgJGFkZFRvU2V0OiB7IGltcG9ydElkczogdS5pZCB9IH0pO1xuXHRcdFx0XHRcdFx0XHRcdHUucm9ja2V0SWQgPSB1c2VySWQ7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRzdXBlci5hZGRDb3VudENvbXBsZXRlZCgxKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLmNvbGxlY3Rpb24udXBkYXRlKHsgX2lkOiB0aGlzLnVzZXJzLl9pZCB9LCB7ICRzZXQ6IHsgdXNlcnM6IHRoaXMudXNlcnMudXNlcnMgfSB9KTtcblxuXHRcdFx0XHQvLyBJbXBvcnQgdGhlIGNoYW5uZWxzXG5cdFx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5JTVBPUlRJTkdfQ0hBTk5FTFMpO1xuXHRcdFx0XHRmb3IgKGNvbnN0IGMgb2YgdGhpcy5jaGFubmVscy5jaGFubmVscykge1xuXHRcdFx0XHRcdGlmICghYy5kb19pbXBvcnQpIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIoc3RhcnRlZEJ5VXNlcklkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zdCBleGlzdGFudFJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlOYW1lKGMubmFtZSk7XG5cdFx0XHRcdFx0XHQvLyBJZiB0aGUgcm9vbSBleGlzdHMgb3IgdGhlIG5hbWUgb2YgaXQgaXMgJ2dlbmVyYWwnLCB0aGVuIHdlIGRvbid0IG5lZWQgdG8gY3JlYXRlIGl0IGFnYWluXG5cdFx0XHRcdFx0XHRpZiAoZXhpc3RhbnRSb29tIHx8IGMubmFtZS50b1VwcGVyQ2FzZSgpID09PSAnR0VORVJBTCcpIHtcblx0XHRcdFx0XHRcdFx0Yy5yb2NrZXRJZCA9IGMubmFtZS50b1VwcGVyQ2FzZSgpID09PSAnR0VORVJBTCcgPyAnR0VORVJBTCcgOiBleGlzdGFudFJvb20uX2lkO1xuXHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy51cGRhdGUoeyBfaWQ6IGMucm9ja2V0SWQgfSwgeyAkYWRkVG9TZXQ6IHsgaW1wb3J0SWRzOiBjLmlkIH0gfSk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHQvLyBGaW5kIHRoZSByb2NrZXRjaGF0SWQgb2YgdGhlIHVzZXIgd2hvIGNyZWF0ZWQgdGhpcyBjaGFubmVsXG5cdFx0XHRcdFx0XHRcdGxldCBjcmVhdG9ySWQgPSBzdGFydGVkQnlVc2VySWQ7XG5cdFx0XHRcdFx0XHRcdGZvciAoY29uc3QgdSBvZiB0aGlzLnVzZXJzLnVzZXJzKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHUudXNlcm5hbWUgPT09IGMuY3JlYXRvciAmJiB1LmRvX2ltcG9ydCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Y3JlYXRvcklkID0gdS5yb2NrZXRJZDtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvLyBDcmVhdGUgdGhlIGNoYW5uZWxcblx0XHRcdFx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcihjcmVhdG9ySWQsICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCByb29tSW5mbyA9IE1ldGVvci5jYWxsKGMuaXNQcml2YXRlID8gJ2NyZWF0ZVByaXZhdGVHcm91cCcgOiAnY3JlYXRlQ2hhbm5lbCcsIGMubmFtZSwgYy5tZW1iZXJzKTtcblx0XHRcdFx0XHRcdFx0XHRjLnJvY2tldElkID0gcm9vbUluZm8ucmlkO1xuXHRcdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy51cGRhdGUoeyBfaWQ6IGMucm9ja2V0SWQgfSwgeyAkYWRkVG9TZXQ6IHsgaW1wb3J0SWRzOiBjLmlkIH0gfSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHN1cGVyLmFkZENvdW50Q29tcGxldGVkKDEpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuY29sbGVjdGlvbi51cGRhdGUoeyBfaWQ6IHRoaXMuY2hhbm5lbHMuX2lkIH0sIHsgJHNldDogeyBjaGFubmVsczogdGhpcy5jaGFubmVscy5jaGFubmVscyB9IH0pO1xuXG5cdFx0XHRcdC8vIElmIG5vIGNoYW5uZWxzIGZpbGUsIGNvbGxlY3QgY2hhbm5lbCBtYXAgZnJvbSBEQiBmb3IgbWVzc2FnZS1vbmx5IGltcG9ydFxuXHRcdFx0XHRpZiAodGhpcy5jaGFubmVscy5jaGFubmVscy5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRmb3IgKGNvbnN0IGNuYW1lIG9mIHRoaXMubWVzc2FnZXMua2V5cygpKSB7XG5cdFx0XHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKHN0YXJ0ZWRCeVVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBleGlzdGFudFJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlOYW1lKGNuYW1lKTtcblx0XHRcdFx0XHRcdFx0aWYgKGV4aXN0YW50Um9vbSB8fCBjbmFtZS50b1VwcGVyQ2FzZSgpID09PSAnR0VORVJBTCcpIHtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmNoYW5uZWxzLmNoYW5uZWxzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdFx0aWQ6IGNuYW1lLnJlcGxhY2UoJy4nLCAnXycpLFxuXHRcdFx0XHRcdFx0XHRcdFx0bmFtZTogY25hbWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRyb2NrZXRJZDogKGNuYW1lLnRvVXBwZXJDYXNlKCkgPT09ICdHRU5FUkFMJyA/ICdHRU5FUkFMJyA6IGV4aXN0YW50Um9vbS5faWQpLFxuXHRcdFx0XHRcdFx0XHRcdFx0ZG9faW1wb3J0OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBJZiBubyB1c2VycyBmaWxlLCBjb2xsZWN0IHVzZXIgbWFwIGZyb20gREIgZm9yIG1lc3NhZ2Utb25seSBpbXBvcnRcblx0XHRcdFx0aWYgKHRoaXMudXNlcnMudXNlcnMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0Zm9yIChjb25zdCBbY2gsIG1lc3NhZ2VzTWFwXSBvZiB0aGlzLm1lc3NhZ2VzLmVudHJpZXMoKSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgY3N2Q2hhbm5lbCA9IHRoaXMuZ2V0Q2hhbm5lbEZyb21OYW1lKGNoKTtcblx0XHRcdFx0XHRcdGlmICghY3N2Q2hhbm5lbCB8fCAhY3N2Q2hhbm5lbC5kb19pbXBvcnQpIHtcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKHN0YXJ0ZWRCeVVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IG1zZ3Mgb2YgbWVzc2FnZXNNYXAudmFsdWVzKCkpIHtcblx0XHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IG1zZyBvZiBtc2dzLm1lc3NhZ2VzKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIXRoaXMuZ2V0VXNlckZyb21Vc2VybmFtZShtc2cudXNlcm5hbWUpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlVc2VybmFtZShtc2cudXNlcm5hbWUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAodXNlcikge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudXNlcnMudXNlcnMucHVzaCh7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyb2NrZXRJZDogdXNlci5faWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR1c2VybmFtZTogdXNlci51c2VybmFtZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gSW1wb3J0IHRoZSBNZXNzYWdlc1xuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuSU1QT1JUSU5HX01FU1NBR0VTKTtcblx0XHRcdFx0Zm9yIChjb25zdCBbY2gsIG1lc3NhZ2VzTWFwXSBvZiB0aGlzLm1lc3NhZ2VzLmVudHJpZXMoKSkge1xuXHRcdFx0XHRcdGNvbnN0IGNzdkNoYW5uZWwgPSB0aGlzLmdldENoYW5uZWxGcm9tTmFtZShjaCk7XG5cdFx0XHRcdFx0aWYgKCFjc3ZDaGFubmVsIHx8ICFjc3ZDaGFubmVsLmRvX2ltcG9ydCkge1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGNzdkNoYW5uZWwucm9ja2V0SWQsIHsgZmllbGRzOiB7IHVzZXJuYW1lczogMSwgdDogMSwgbmFtZTogMSB9IH0pO1xuXHRcdFx0XHRcdE1ldGVvci5ydW5Bc1VzZXIoc3RhcnRlZEJ5VXNlcklkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zdCB0aW1lc3RhbXBzID0ge307XG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IFttc2dHcm91cERhdGEsIG1zZ3NdIG9mIG1lc3NhZ2VzTWFwLmVudHJpZXMoKSkge1xuXHRcdFx0XHRcdFx0XHRzdXBlci51cGRhdGVSZWNvcmQoeyBtZXNzYWdlc3N0YXR1czogYCR7IGNoIH0vJHsgbXNnR3JvdXBEYXRhIH0uJHsgbXNncy5tZXNzYWdlcy5sZW5ndGggfWAgfSk7XG5cdFx0XHRcdFx0XHRcdGZvciAoY29uc3QgbXNnIG9mIG1zZ3MubWVzc2FnZXMpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoaXNOYU4obmV3IERhdGUocGFyc2VJbnQobXNnLnRzKSkpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKGBUaW1lc3RhbXAgb24gYSBtZXNzYWdlIGluICR7IGNoIH0vJHsgbXNnR3JvdXBEYXRhIH0gaXMgaW52YWxpZGApO1xuXHRcdFx0XHRcdFx0XHRcdFx0c3VwZXIuYWRkQ291bnRDb21wbGV0ZWQoMSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRjb25zdCBjcmVhdG9yID0gdGhpcy5nZXRVc2VyRnJvbVVzZXJuYW1lKG1zZy51c2VybmFtZSk7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGNyZWF0b3IpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGxldCBzdWZmaXggPSAnJztcblx0XHRcdFx0XHRcdFx0XHRcdGlmICh0aW1lc3RhbXBzW21zZy50c10gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aW1lc3RhbXBzW21zZy50c10gPSAxO1xuXHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0c3VmZml4ID0gYC0keyB0aW1lc3RhbXBzW21zZy50c10gfWA7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRpbWVzdGFtcHNbbXNnLnRzXSArPSAxO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgbXNnT2JqID0ge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRfaWQ6IGBjc3YtJHsgY3N2Q2hhbm5lbC5pZCB9LSR7IG1zZy50cyB9JHsgc3VmZml4IH1gLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0czogbmV3IERhdGUocGFyc2VJbnQobXNnLnRzKSksXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG1zZzogbXNnLnRleHQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJpZDogcm9vbS5faWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHU6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRfaWQ6IGNyZWF0b3IuX2lkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHVzZXJuYW1lOiBjcmVhdG9yLnVzZXJuYW1lLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5zZW5kTWVzc2FnZShjcmVhdG9yLCBtc2dPYmosIHJvb20sIHRydWUpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdHN1cGVyLmFkZENvdW50Q29tcGxldGVkKDEpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuRklOSVNISU5HKTtcblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLkRPTkUpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHR0aGlzLmxvZ2dlci5lcnJvcihlKTtcblx0XHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLkVSUk9SKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgdGltZVRvb2sgPSBEYXRlLm5vdygpIC0gc3RhcnRlZDtcblx0XHRcdHRoaXMubG9nZ2VyLmxvZyhgQ1NWIEltcG9ydCB0b29rICR7IHRpbWVUb29rIH0gbWlsbGlzZWNvbmRzLmApO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHN1cGVyLmdldFByb2dyZXNzKCk7XG5cdH1cblxuXHRnZXRTZWxlY3Rpb24oKSB7XG5cdFx0Y29uc3Qgc2VsZWN0aW9uVXNlcnMgPSB0aGlzLnVzZXJzLnVzZXJzLm1hcCgodSkgPT4gbmV3IFNlbGVjdGlvblVzZXIodS5pZCwgdS51c2VybmFtZSwgdS5lbWFpbCwgZmFsc2UsIGZhbHNlLCB0cnVlKSk7XG5cdFx0Y29uc3Qgc2VsZWN0aW9uQ2hhbm5lbHMgPSB0aGlzLmNoYW5uZWxzLmNoYW5uZWxzLm1hcCgoYykgPT4gbmV3IFNlbGVjdGlvbkNoYW5uZWwoYy5pZCwgYy5uYW1lLCBmYWxzZSwgdHJ1ZSwgYy5pc1ByaXZhdGUpKTtcblx0XHRjb25zdCBzZWxlY3Rpb25NZXNzYWdlcyA9IHRoaXMuaW1wb3J0UmVjb3JkLmNvdW50Lm1lc3NhZ2VzO1xuXG5cdFx0cmV0dXJuIG5ldyBTZWxlY3Rpb24odGhpcy5uYW1lLCBzZWxlY3Rpb25Vc2Vycywgc2VsZWN0aW9uQ2hhbm5lbHMsIHNlbGVjdGlvbk1lc3NhZ2VzKTtcblx0fVxuXG5cdGdldENoYW5uZWxGcm9tTmFtZShjaGFubmVsTmFtZSkge1xuXHRcdGZvciAoY29uc3QgY2ggb2YgdGhpcy5jaGFubmVscy5jaGFubmVscykge1xuXHRcdFx0aWYgKGNoLm5hbWUgPT09IGNoYW5uZWxOYW1lKSB7XG5cdFx0XHRcdHJldHVybiBjaDtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRnZXRVc2VyRnJvbVVzZXJuYW1lKHVzZXJuYW1lKSB7XG5cdFx0Zm9yIChjb25zdCB1IG9mIHRoaXMudXNlcnMudXNlcnMpIHtcblx0XHRcdGlmICh1LnVzZXJuYW1lID09PSB1c2VybmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodS5yb2NrZXRJZCwgeyBmaWVsZHM6IHsgdXNlcm5hbWU6IDEgfSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cbiIsImltcG9ydCB7IEltcG9ydGVycyB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmltcG9ydGVyJztcbmltcG9ydCB7IENzdkltcG9ydGVySW5mbyB9IGZyb20gJy4uL2luZm8nO1xuaW1wb3J0IHsgQ3N2SW1wb3J0ZXIgfSBmcm9tICcuL2ltcG9ydGVyJztcblxuSW1wb3J0ZXJzLmFkZChuZXcgQ3N2SW1wb3J0ZXJJbmZvKCksIENzdkltcG9ydGVyKTtcbiJdfQ==
