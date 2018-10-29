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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:importer-slack-users":{"info.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                          //
// packages/rocketchat_importer-slack-users/info.js                                         //
//                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////
                                                                                            //
module.export({
  SlackUsersImporterInfo: () => SlackUsersImporterInfo
});
let ImporterInfo;
module.watch(require("meteor/rocketchat:importer"), {
  ImporterInfo(v) {
    ImporterInfo = v;
  }

}, 0);

class SlackUsersImporterInfo extends ImporterInfo {
  constructor() {
    super('slack-users', 'Slack_Users', 'text/csv', [{
      text: 'Importer_Slack_Users_CSV_Information',
      href: 'https://rocket.chat/docs/administrator-guides/import/slack/users'
    }]);
  }

}
//////////////////////////////////////////////////////////////////////////////////////////////

},"server":{"importer.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                          //
// packages/rocketchat_importer-slack-users/server/importer.js                              //
//                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////
                                                                                            //
module.export({
  SlackUsersImporter: () => SlackUsersImporter
});
let Base, ProgressStep, Selection, SelectionUser;
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

  SelectionUser(v) {
    SelectionUser = v;
  }

}, 0);

class SlackUsersImporter extends Base {
  constructor(info) {
    super(info);
    this.csvParser = require('csv-parse/lib/sync');
    this.userMap = new Map();
    this.admins = []; // Array of ids of the users which are admins
  }

  prepare(dataURI, sentContentType, fileName) {
    super.prepare(dataURI, sentContentType, fileName, true);
    super.updateProgress(ProgressStep.PREPARING_USERS);
    const uriResult = RocketChatFile.dataURIParse(dataURI);
    const buf = new Buffer(uriResult.image, 'base64');
    const parsed = this.csvParser(buf.toString());
    parsed.forEach((user, index) => {
      // Ignore the first column
      if (index === 0) {
        return;
      }

      const id = Random.id();
      const username = user[0];
      const email = user[1];
      let isBot = false;
      let isDeleted = false;

      switch (user[2]) {
        case 'Admin':
          this.admins.push(id);
          break;

        case 'Bot':
          isBot = true;
          break;

        case 'Deactivated':
          isDeleted = true;
          break;
      }

      this.userMap.set(id, new SelectionUser(id, username, email, isDeleted, isBot, true));
    });
    const userArray = Array.from(this.userMap.values());
    const usersId = this.collection.insert({
      import: this.importRecord._id,
      importer: this.name,
      type: 'users',
      users: userArray
    });
    this.users = this.collection.findOne(usersId);
    super.updateRecord({
      'count.users': this.userMap.size
    });
    super.addCountToTotal(this.userMap.size);

    if (this.userMap.size === 0) {
      this.logger.error('No users found in the import file.');
      super.updateProgress(ProgressStep.ERROR);
      return super.getProgress();
    }

    super.updateProgress(ProgressStep.USER_SELECTION);
    return new Selection(this.name, userArray, [], 0);
  }

  startImport(importSelection) {
    super.startImport(importSelection);
    const started = Date.now();

    for (const user of importSelection.users) {
      const u = this.userMap.get(user.user_id);
      u.do_import = user.do_import;
      this.userMap.set(user.user_id, u);
    }

    this.collection.update({
      _id: this.users._id
    }, {
      $set: {
        users: Array.from(this.userMap.values())
      }
    });
    const startedByUserId = Meteor.userId();
    Meteor.defer(() => {
      super.updateProgress(ProgressStep.IMPORTING_USERS);

      try {
        for (const u of this.users.users) {
          if (!u.do_import) {
            continue;
          }

          Meteor.runAsUser(startedByUserId, () => {
            const existantUser = RocketChat.models.Users.findOneByEmailAddress(u.email) || RocketChat.models.Users.findOneByUsername(u.username);
            let userId;

            if (existantUser) {
              // since we have an existing user, let's try a few things
              userId = existantUser._id;
              u.rocketId = existantUser._id;
              RocketChat.models.Users.update({
                _id: u.rocketId
              }, {
                $addToSet: {
                  importIds: u.id
                }
              });
              RocketChat.models.Users.setEmail(existantUser._id, u.email);
              RocketChat.models.Users.setEmailVerified(existantUser._id, u.email);
            } else {
              userId = Accounts.createUser({
                username: u.username + Random.id(),
                password: Date.now() + u.name + u.email.toUpperCase()
              });

              if (!userId) {
                console.warn('An error happened while creating a user.');
                return;
              }

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
                RocketChat.models.Users.setEmail(userId, u.email);
                RocketChat.models.Users.setEmailVerified(userId, u.email);
                u.rocketId = userId;
              });
            }

            if (this.admins.includes(u.user_id)) {
              Meteor.call('setAdminStatus', userId, true);
            }

            super.addCountCompleted(1);
          });
        }

        super.updateProgress(ProgressStep.FINISHING);
        super.updateProgress(ProgressStep.DONE);
      } catch (e) {
        this.logger.error(e);
        super.updateProgress(ProgressStep.ERROR);
      }

      const timeTook = Date.now() - started;
      this.logger.log(`Slack Users Import took ${timeTook} milliseconds.`);
    });
    return super.getProgress();
  }

}
//////////////////////////////////////////////////////////////////////////////////////////////

},"adder.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                          //
// packages/rocketchat_importer-slack-users/server/adder.js                                 //
//                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////
                                                                                            //
let Importers;
module.watch(require("meteor/rocketchat:importer"), {
  Importers(v) {
    Importers = v;
  }

}, 0);
let SlackUsersImporterInfo;
module.watch(require("../info"), {
  SlackUsersImporterInfo(v) {
    SlackUsersImporterInfo = v;
  }

}, 1);
let SlackUsersImporter;
module.watch(require("./importer"), {
  SlackUsersImporter(v) {
    SlackUsersImporter = v;
  }

}, 2);
Importers.add(new SlackUsersImporterInfo(), SlackUsersImporter);
//////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:importer-slack-users/info.js");
require("/node_modules/meteor/rocketchat:importer-slack-users/server/importer.js");
require("/node_modules/meteor/rocketchat:importer-slack-users/server/adder.js");

/* Exports */
Package._define("rocketchat:importer-slack-users");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_importer-slack-users.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci1zbGFjay11c2Vycy9pbmZvLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmltcG9ydGVyLXNsYWNrLXVzZXJzL3NlcnZlci9pbXBvcnRlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbXBvcnRlci1zbGFjay11c2Vycy9zZXJ2ZXIvYWRkZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiU2xhY2tVc2Vyc0ltcG9ydGVySW5mbyIsIkltcG9ydGVySW5mbyIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJjb25zdHJ1Y3RvciIsInRleHQiLCJocmVmIiwiU2xhY2tVc2Vyc0ltcG9ydGVyIiwiQmFzZSIsIlByb2dyZXNzU3RlcCIsIlNlbGVjdGlvbiIsIlNlbGVjdGlvblVzZXIiLCJpbmZvIiwiY3N2UGFyc2VyIiwidXNlck1hcCIsIk1hcCIsImFkbWlucyIsInByZXBhcmUiLCJkYXRhVVJJIiwic2VudENvbnRlbnRUeXBlIiwiZmlsZU5hbWUiLCJ1cGRhdGVQcm9ncmVzcyIsIlBSRVBBUklOR19VU0VSUyIsInVyaVJlc3VsdCIsIlJvY2tldENoYXRGaWxlIiwiZGF0YVVSSVBhcnNlIiwiYnVmIiwiQnVmZmVyIiwiaW1hZ2UiLCJwYXJzZWQiLCJ0b1N0cmluZyIsImZvckVhY2giLCJ1c2VyIiwiaW5kZXgiLCJpZCIsIlJhbmRvbSIsInVzZXJuYW1lIiwiZW1haWwiLCJpc0JvdCIsImlzRGVsZXRlZCIsInB1c2giLCJzZXQiLCJ1c2VyQXJyYXkiLCJBcnJheSIsImZyb20iLCJ2YWx1ZXMiLCJ1c2Vyc0lkIiwiY29sbGVjdGlvbiIsImluc2VydCIsImltcG9ydCIsImltcG9ydFJlY29yZCIsIl9pZCIsImltcG9ydGVyIiwibmFtZSIsInR5cGUiLCJ1c2VycyIsImZpbmRPbmUiLCJ1cGRhdGVSZWNvcmQiLCJzaXplIiwiYWRkQ291bnRUb1RvdGFsIiwibG9nZ2VyIiwiZXJyb3IiLCJFUlJPUiIsImdldFByb2dyZXNzIiwiVVNFUl9TRUxFQ1RJT04iLCJzdGFydEltcG9ydCIsImltcG9ydFNlbGVjdGlvbiIsInN0YXJ0ZWQiLCJEYXRlIiwibm93IiwidSIsImdldCIsInVzZXJfaWQiLCJkb19pbXBvcnQiLCJ1cGRhdGUiLCIkc2V0Iiwic3RhcnRlZEJ5VXNlcklkIiwiTWV0ZW9yIiwidXNlcklkIiwiZGVmZXIiLCJJTVBPUlRJTkdfVVNFUlMiLCJydW5Bc1VzZXIiLCJleGlzdGFudFVzZXIiLCJSb2NrZXRDaGF0IiwibW9kZWxzIiwiVXNlcnMiLCJmaW5kT25lQnlFbWFpbEFkZHJlc3MiLCJmaW5kT25lQnlVc2VybmFtZSIsInJvY2tldElkIiwiJGFkZFRvU2V0IiwiaW1wb3J0SWRzIiwic2V0RW1haWwiLCJzZXRFbWFpbFZlcmlmaWVkIiwiQWNjb3VudHMiLCJjcmVhdGVVc2VyIiwicGFzc3dvcmQiLCJ0b1VwcGVyQ2FzZSIsImNvbnNvbGUiLCJ3YXJuIiwiY2FsbCIsImpvaW5EZWZhdWx0Q2hhbm5lbHNTaWxlbmNlZCIsInNldE5hbWUiLCJpbmNsdWRlcyIsImFkZENvdW50Q29tcGxldGVkIiwiRklOSVNISU5HIiwiRE9ORSIsImUiLCJ0aW1lVG9vayIsImxvZyIsIkltcG9ydGVycyIsImFkZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxPQUFPQyxNQUFQLENBQWM7QUFBQ0MsMEJBQXVCLE1BQUlBO0FBQTVCLENBQWQ7QUFBbUUsSUFBSUMsWUFBSjtBQUFpQkgsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLDRCQUFSLENBQWIsRUFBbUQ7QUFBQ0YsZUFBYUcsQ0FBYixFQUFlO0FBQUNILG1CQUFhRyxDQUFiO0FBQWU7O0FBQWhDLENBQW5ELEVBQXFGLENBQXJGOztBQUU3RSxNQUFNSixzQkFBTixTQUFxQ0MsWUFBckMsQ0FBa0Q7QUFDeERJLGdCQUFjO0FBQ2IsVUFBTSxhQUFO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Y2tldGNoYXRfaW1wb3J0ZXItc2xhY2stdXNlcnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbXBvcnRlckluZm8gfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDppbXBvcnRlcic7XG5cbmV4cG9ydCBjbGFzcyBTbGFja1VzZXJzSW1wb3J0ZXJJbmZvIGV4dGVuZHMgSW1wb3J0ZXJJbmZvIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ3NsYWNrLXVzZXJzJywgJ1NsYWNrX1VzZXJzJywgJ3RleHQvY3N2JywgW3tcblx0XHRcdHRleHQ6ICdJbXBvcnRlcl9TbGFja19Vc2Vyc19DU1ZfSW5mb3JtYXRpb24nLFxuXHRcdFx0aHJlZjogJ2h0dHBzOi8vcm9ja2V0LmNoYXQvZG9jcy9hZG1pbmlzdHJhdG9yLWd1aWRlcy9pbXBvcnQvc2xhY2svdXNlcnMnLFxuXHRcdH1dKTtcblx0fVxufVxuIiwiaW1wb3J0IHtcblx0QmFzZSxcblx0UHJvZ3Jlc3NTdGVwLFxuXHRTZWxlY3Rpb24sXG5cdFNlbGVjdGlvblVzZXIsXG59IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmltcG9ydGVyJztcblxuZXhwb3J0IGNsYXNzIFNsYWNrVXNlcnNJbXBvcnRlciBleHRlbmRzIEJhc2Uge1xuXHRjb25zdHJ1Y3RvcihpbmZvKSB7XG5cdFx0c3VwZXIoaW5mbyk7XG5cblx0XHR0aGlzLmNzdlBhcnNlciA9IHJlcXVpcmUoJ2Nzdi1wYXJzZS9saWIvc3luYycpO1xuXHRcdHRoaXMudXNlck1hcCA9IG5ldyBNYXAoKTtcblx0XHR0aGlzLmFkbWlucyA9IFtdOyAvLyBBcnJheSBvZiBpZHMgb2YgdGhlIHVzZXJzIHdoaWNoIGFyZSBhZG1pbnNcblx0fVxuXG5cdHByZXBhcmUoZGF0YVVSSSwgc2VudENvbnRlbnRUeXBlLCBmaWxlTmFtZSkge1xuXHRcdHN1cGVyLnByZXBhcmUoZGF0YVVSSSwgc2VudENvbnRlbnRUeXBlLCBmaWxlTmFtZSwgdHJ1ZSk7XG5cblx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuUFJFUEFSSU5HX1VTRVJTKTtcblx0XHRjb25zdCB1cmlSZXN1bHQgPSBSb2NrZXRDaGF0RmlsZS5kYXRhVVJJUGFyc2UoZGF0YVVSSSk7XG5cdFx0Y29uc3QgYnVmID0gbmV3IEJ1ZmZlcih1cmlSZXN1bHQuaW1hZ2UsICdiYXNlNjQnKTtcblx0XHRjb25zdCBwYXJzZWQgPSB0aGlzLmNzdlBhcnNlcihidWYudG9TdHJpbmcoKSk7XG5cblx0XHRwYXJzZWQuZm9yRWFjaCgodXNlciwgaW5kZXgpID0+IHtcblx0XHRcdC8vIElnbm9yZSB0aGUgZmlyc3QgY29sdW1uXG5cdFx0XHRpZiAoaW5kZXggPT09IDApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBpZCA9IFJhbmRvbS5pZCgpO1xuXHRcdFx0Y29uc3QgdXNlcm5hbWUgPSB1c2VyWzBdO1xuXHRcdFx0Y29uc3QgZW1haWwgPSB1c2VyWzFdO1xuXHRcdFx0bGV0IGlzQm90ID0gZmFsc2U7XG5cdFx0XHRsZXQgaXNEZWxldGVkID0gZmFsc2U7XG5cblx0XHRcdHN3aXRjaCAodXNlclsyXSkge1xuXHRcdFx0XHRjYXNlICdBZG1pbic6XG5cdFx0XHRcdFx0dGhpcy5hZG1pbnMucHVzaChpZCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ0JvdCc6XG5cdFx0XHRcdFx0aXNCb3QgPSB0cnVlO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdEZWFjdGl2YXRlZCc6XG5cdFx0XHRcdFx0aXNEZWxldGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy51c2VyTWFwLnNldChpZCwgbmV3IFNlbGVjdGlvblVzZXIoaWQsIHVzZXJuYW1lLCBlbWFpbCwgaXNEZWxldGVkLCBpc0JvdCwgdHJ1ZSkpO1xuXHRcdH0pO1xuXG5cdFx0Y29uc3QgdXNlckFycmF5ID0gQXJyYXkuZnJvbSh0aGlzLnVzZXJNYXAudmFsdWVzKCkpO1xuXG5cdFx0Y29uc3QgdXNlcnNJZCA9IHRoaXMuY29sbGVjdGlvbi5pbnNlcnQoeyBpbXBvcnQ6IHRoaXMuaW1wb3J0UmVjb3JkLl9pZCwgaW1wb3J0ZXI6IHRoaXMubmFtZSwgdHlwZTogJ3VzZXJzJywgdXNlcnM6IHVzZXJBcnJheSB9KTtcblx0XHR0aGlzLnVzZXJzID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUodXNlcnNJZCk7XG5cdFx0c3VwZXIudXBkYXRlUmVjb3JkKHsgJ2NvdW50LnVzZXJzJzogdGhpcy51c2VyTWFwLnNpemUgfSk7XG5cdFx0c3VwZXIuYWRkQ291bnRUb1RvdGFsKHRoaXMudXNlck1hcC5zaXplKTtcblxuXHRcdGlmICh0aGlzLnVzZXJNYXAuc2l6ZSA9PT0gMCkge1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ05vIHVzZXJzIGZvdW5kIGluIHRoZSBpbXBvcnQgZmlsZS4nKTtcblx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5FUlJPUik7XG5cdFx0XHRyZXR1cm4gc3VwZXIuZ2V0UHJvZ3Jlc3MoKTtcblx0XHR9XG5cblx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuVVNFUl9TRUxFQ1RJT04pO1xuXHRcdHJldHVybiBuZXcgU2VsZWN0aW9uKHRoaXMubmFtZSwgdXNlckFycmF5LCBbXSwgMCk7XG5cdH1cblxuXHRzdGFydEltcG9ydChpbXBvcnRTZWxlY3Rpb24pIHtcblx0XHRzdXBlci5zdGFydEltcG9ydChpbXBvcnRTZWxlY3Rpb24pO1xuXHRcdGNvbnN0IHN0YXJ0ZWQgPSBEYXRlLm5vdygpO1xuXG5cdFx0Zm9yIChjb25zdCB1c2VyIG9mIGltcG9ydFNlbGVjdGlvbi51c2Vycykge1xuXHRcdFx0Y29uc3QgdSA9IHRoaXMudXNlck1hcC5nZXQodXNlci51c2VyX2lkKTtcblx0XHRcdHUuZG9faW1wb3J0ID0gdXNlci5kb19pbXBvcnQ7XG5cblx0XHRcdHRoaXMudXNlck1hcC5zZXQodXNlci51c2VyX2lkLCB1KTtcblx0XHR9XG5cdFx0dGhpcy5jb2xsZWN0aW9uLnVwZGF0ZSh7IF9pZDogdGhpcy51c2Vycy5faWQgfSwgeyAkc2V0OiB7IHVzZXJzOiBBcnJheS5mcm9tKHRoaXMudXNlck1hcC52YWx1ZXMoKSkgfSB9KTtcblxuXHRcdGNvbnN0IHN0YXJ0ZWRCeVVzZXJJZCA9IE1ldGVvci51c2VySWQoKTtcblx0XHRNZXRlb3IuZGVmZXIoKCkgPT4ge1xuXHRcdFx0c3VwZXIudXBkYXRlUHJvZ3Jlc3MoUHJvZ3Jlc3NTdGVwLklNUE9SVElOR19VU0VSUyk7XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGZvciAoY29uc3QgdSBvZiB0aGlzLnVzZXJzLnVzZXJzKSB7XG5cdFx0XHRcdFx0aWYgKCF1LmRvX2ltcG9ydCkge1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcihzdGFydGVkQnlVc2VySWQsICgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IGV4aXN0YW50VXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUVtYWlsQWRkcmVzcyh1LmVtYWlsKSB8fCBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlVc2VybmFtZSh1LnVzZXJuYW1lKTtcblxuXHRcdFx0XHRcdFx0bGV0IHVzZXJJZDtcblx0XHRcdFx0XHRcdGlmIChleGlzdGFudFVzZXIpIHtcblx0XHRcdFx0XHRcdFx0Ly8gc2luY2Ugd2UgaGF2ZSBhbiBleGlzdGluZyB1c2VyLCBsZXQncyB0cnkgYSBmZXcgdGhpbmdzXG5cdFx0XHRcdFx0XHRcdHVzZXJJZCA9IGV4aXN0YW50VXNlci5faWQ7XG5cdFx0XHRcdFx0XHRcdHUucm9ja2V0SWQgPSBleGlzdGFudFVzZXIuX2lkO1xuXHRcdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy51cGRhdGUoeyBfaWQ6IHUucm9ja2V0SWQgfSwgeyAkYWRkVG9TZXQ6IHsgaW1wb3J0SWRzOiB1LmlkIH0gfSk7XG5cblx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuc2V0RW1haWwoZXhpc3RhbnRVc2VyLl9pZCwgdS5lbWFpbCk7XG5cdFx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnNldEVtYWlsVmVyaWZpZWQoZXhpc3RhbnRVc2VyLl9pZCwgdS5lbWFpbCk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR1c2VySWQgPSBBY2NvdW50cy5jcmVhdGVVc2VyKHsgdXNlcm5hbWU6IHUudXNlcm5hbWUgKyBSYW5kb20uaWQoKSwgcGFzc3dvcmQ6IERhdGUubm93KCkgKyB1Lm5hbWUgKyB1LmVtYWlsLnRvVXBwZXJDYXNlKCkgfSk7XG5cblx0XHRcdFx0XHRcdFx0aWYgKCF1c2VySWQpIHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLndhcm4oJ0FuIGVycm9yIGhhcHBlbmVkIHdoaWxlIGNyZWF0aW5nIGEgdXNlci4nKTtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXJJZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdE1ldGVvci5jYWxsKCdzZXRVc2VybmFtZScsIHUudXNlcm5hbWUsIHsgam9pbkRlZmF1bHRDaGFubmVsc1NpbGVuY2VkOiB0cnVlIH0pO1xuXHRcdFx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnNldE5hbWUodXNlcklkLCB1Lm5hbWUpO1xuXHRcdFx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnVwZGF0ZSh7IF9pZDogdXNlcklkIH0sIHsgJGFkZFRvU2V0OiB7IGltcG9ydElkczogdS5pZCB9IH0pO1xuXHRcdFx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnNldEVtYWlsKHVzZXJJZCwgdS5lbWFpbCk7XG5cdFx0XHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuc2V0RW1haWxWZXJpZmllZCh1c2VySWQsIHUuZW1haWwpO1xuXHRcdFx0XHRcdFx0XHRcdHUucm9ja2V0SWQgPSB1c2VySWQ7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAodGhpcy5hZG1pbnMuaW5jbHVkZXModS51c2VyX2lkKSkge1xuXHRcdFx0XHRcdFx0XHRNZXRlb3IuY2FsbCgnc2V0QWRtaW5TdGF0dXMnLCB1c2VySWQsIHRydWUpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRzdXBlci5hZGRDb3VudENvbXBsZXRlZCgxKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHN1cGVyLnVwZGF0ZVByb2dyZXNzKFByb2dyZXNzU3RlcC5GSU5JU0hJTkcpO1xuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuRE9ORSk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKGUpO1xuXHRcdFx0XHRzdXBlci51cGRhdGVQcm9ncmVzcyhQcm9ncmVzc1N0ZXAuRVJST1IpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCB0aW1lVG9vayA9IERhdGUubm93KCkgLSBzdGFydGVkO1xuXHRcdFx0dGhpcy5sb2dnZXIubG9nKGBTbGFjayBVc2VycyBJbXBvcnQgdG9vayAkeyB0aW1lVG9vayB9IG1pbGxpc2Vjb25kcy5gKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBzdXBlci5nZXRQcm9ncmVzcygpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBJbXBvcnRlcnMgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDppbXBvcnRlcic7XG5pbXBvcnQgeyBTbGFja1VzZXJzSW1wb3J0ZXJJbmZvIH0gZnJvbSAnLi4vaW5mbyc7XG5pbXBvcnQgeyBTbGFja1VzZXJzSW1wb3J0ZXIgfSBmcm9tICcuL2ltcG9ydGVyJztcblxuSW1wb3J0ZXJzLmFkZChuZXcgU2xhY2tVc2Vyc0ltcG9ydGVySW5mbygpLCBTbGFja1VzZXJzSW1wb3J0ZXIpO1xuIl19
