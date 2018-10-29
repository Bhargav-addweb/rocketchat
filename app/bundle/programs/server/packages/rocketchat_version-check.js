(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Logger = Package['rocketchat:logger'].Logger;
var SystemLogger = Package['rocketchat:logger'].SystemLogger;
var LoggerManager = Package['rocketchat:logger'].LoggerManager;
var SyncedCron = Package['percolate:synced-cron'].SyncedCron;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:version-check":{"server":{"server.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/rocketchat_version-check/server/server.js                                               //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
let checkVersionUpdate;
module.watch(require("./functions/checkVersionUpdate"), {
  default(v) {
    checkVersionUpdate = v;
  }

}, 0);
module.watch(require("./methods/banner_dismiss"));
module.watch(require("./addSettings"));
const jobName = 'version_check';

if (SyncedCron.nextScheduledAtDate(jobName)) {
  SyncedCron.remove(jobName);
}

SyncedCron.add({
  name: jobName,
  schedule: parser => parser.text('at 2:00 am'),

  job() {
    checkVersionUpdate();
  }

});
SyncedCron.start();
Meteor.startup(() => {
  checkVersionUpdate();
}); // Send email to admins
// Save latest alert
// ENV var to disable the check for update for our cloud
//////////////////////////////////////////////////////////////////////////////////////////////////////

},"addSettings.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/rocketchat_version-check/server/addSettings.js                                          //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
RocketChat.settings.addGroup('General', function () {
  this.section('Update', function () {
    this.add('Update_LatestAvailableVersion', '0.0.0', {
      type: 'string',
      readonly: true
    });
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////

},"logger.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/rocketchat_version-check/server/logger.js                                               //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.exportDefault(new Logger('VersionCheck'));
//////////////////////////////////////////////////////////////////////////////////////////////////////

},"functions":{"checkVersionUpdate.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/rocketchat_version-check/server/functions/checkVersionUpdate.js                         //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
let semver;
module.watch(require("semver"), {
  default(v) {
    semver = v;
  }

}, 0);
let getNewUpdates;
module.watch(require("./getNewUpdates"), {
  default(v) {
    getNewUpdates = v;
  }

}, 1);
let logger;
module.watch(require("../logger"), {
  default(v) {
    logger = v;
  }

}, 2);
module.exportDefault(() => {
  logger.info('Checking for version updates');
  const {
    versions
  } = getNewUpdates();
  const update = {
    exists: false,
    lastestVersion: null,
    security: false
  };
  const lastCheckedVersion = RocketChat.settings.get('Update_LatestAvailableVersion');
  versions.forEach(version => {
    if (semver.lte(version.version, lastCheckedVersion)) {
      return;
    }

    if (semver.lte(version.version, RocketChat.Info.version)) {
      return;
    }

    update.exists = true;
    update.lastestVersion = version;

    if (version.security === true) {
      update.security = true;
    }
  });

  if (update.exists) {
    RocketChat.settings.updateById('Update_LatestAvailableVersion', update.lastestVersion.version);
    RocketChat.models.Roles.findUsersInRole('admin').forEach(adminUser => {
      const msg = {
        msg: `*${TAPi18n.__('Update_your_RocketChat', adminUser.language)}*\n${TAPi18n.__('New_version_available_(s)', update.lastestVersion.version, adminUser.language)}\n${update.lastestVersion.infoUrl}`,
        rid: [adminUser._id, 'rocket.cat'].sort().join('')
      };
      Meteor.runAsUser('rocket.cat', () => Meteor.call('sendMessage', msg));
      RocketChat.models.Users.addBannerById(adminUser._id, {
        id: 'versionUpdate',
        priority: 10,
        title: 'Update_your_RocketChat',
        text: 'New_version_available_(s)',
        textArguments: [update.lastestVersion.version],
        link: update.lastestVersion.infoUrl
      });
    });
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////

},"getNewUpdates.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/rocketchat_version-check/server/functions/getNewUpdates.js                              //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
let os;
module.watch(require("os"), {
  default(v) {
    os = v;
  }

}, 0);
let HTTP;
module.watch(require("meteor/http"), {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
module.exportDefault(() => {
  try {
    const uniqueID = RocketChat.models.Settings.findOne('uniqueID');
    const {
      _oplogHandle
    } = MongoInternals.defaultRemoteCollectionDriver().mongo;
    const oplogEnabled = _oplogHandle && _oplogHandle.onOplogEntry && RocketChat.settings.get('Force_Disable_OpLog_For_Cache') !== true;
    const data = {
      uniqueId: uniqueID.value,
      installedAt: uniqueID.createdAt,
      version: RocketChat.Info.version,
      oplogEnabled,
      osType: os.type(),
      osPlatform: os.platform(),
      osArch: os.arch(),
      osRelease: os.release(),
      nodeVersion: process.version,
      deployMethod: process.env.DEPLOY_METHOD || 'tar',
      deployPlatform: process.env.DEPLOY_PLATFORM || 'selfinstall'
    };
    const result = HTTP.get('https://releases.rocket.chat/updates/check', {
      params: data
    });
    return result.data;
  } catch (error) {
    // There's no need to log this error
    // as it's pointless and the user
    // can't do anything about it anyways
    return {
      versions: [],
      alerts: []
    };
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"banner_dismiss.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/rocketchat_version-check/server/methods/banner_dismiss.js                               //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
Meteor.methods({
  'banner/dismiss'({
    id
  }) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'banner/dismiss'
      });
    }

    RocketChat.models.Users.removeBannerById(this.userId, {
      id
    });
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/rocketchat:version-check/server/server.js");

/* Exports */
Package._define("rocketchat:version-check", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_version-check.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp2ZXJzaW9uLWNoZWNrL3NlcnZlci9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6dmVyc2lvbi1jaGVjay9zZXJ2ZXIvYWRkU2V0dGluZ3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6dmVyc2lvbi1jaGVjay9zZXJ2ZXIvbG9nZ2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnZlcnNpb24tY2hlY2svc2VydmVyL2Z1bmN0aW9ucy9jaGVja1ZlcnNpb25VcGRhdGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6dmVyc2lvbi1jaGVjay9zZXJ2ZXIvZnVuY3Rpb25zL2dldE5ld1VwZGF0ZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6dmVyc2lvbi1jaGVjay9zZXJ2ZXIvbWV0aG9kcy9iYW5uZXJfZGlzbWlzcy5qcyJdLCJuYW1lcyI6WyJjaGVja1ZlcnNpb25VcGRhdGUiLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsImpvYk5hbWUiLCJTeW5jZWRDcm9uIiwibmV4dFNjaGVkdWxlZEF0RGF0ZSIsInJlbW92ZSIsImFkZCIsIm5hbWUiLCJzY2hlZHVsZSIsInBhcnNlciIsInRleHQiLCJqb2IiLCJzdGFydCIsIk1ldGVvciIsInN0YXJ0dXAiLCJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJhZGRHcm91cCIsInNlY3Rpb24iLCJ0eXBlIiwicmVhZG9ubHkiLCJleHBvcnREZWZhdWx0IiwiTG9nZ2VyIiwic2VtdmVyIiwiZ2V0TmV3VXBkYXRlcyIsImxvZ2dlciIsImluZm8iLCJ2ZXJzaW9ucyIsInVwZGF0ZSIsImV4aXN0cyIsImxhc3Rlc3RWZXJzaW9uIiwic2VjdXJpdHkiLCJsYXN0Q2hlY2tlZFZlcnNpb24iLCJnZXQiLCJmb3JFYWNoIiwidmVyc2lvbiIsImx0ZSIsIkluZm8iLCJ1cGRhdGVCeUlkIiwibW9kZWxzIiwiUm9sZXMiLCJmaW5kVXNlcnNJblJvbGUiLCJhZG1pblVzZXIiLCJtc2ciLCJUQVBpMThuIiwiX18iLCJsYW5ndWFnZSIsImluZm9VcmwiLCJyaWQiLCJfaWQiLCJzb3J0Iiwiam9pbiIsInJ1bkFzVXNlciIsImNhbGwiLCJVc2VycyIsImFkZEJhbm5lckJ5SWQiLCJpZCIsInByaW9yaXR5IiwidGl0bGUiLCJ0ZXh0QXJndW1lbnRzIiwibGluayIsIm9zIiwiSFRUUCIsInVuaXF1ZUlEIiwiU2V0dGluZ3MiLCJmaW5kT25lIiwiX29wbG9nSGFuZGxlIiwiTW9uZ29JbnRlcm5hbHMiLCJkZWZhdWx0UmVtb3RlQ29sbGVjdGlvbkRyaXZlciIsIm1vbmdvIiwib3Bsb2dFbmFibGVkIiwib25PcGxvZ0VudHJ5IiwiZGF0YSIsInVuaXF1ZUlkIiwidmFsdWUiLCJpbnN0YWxsZWRBdCIsImNyZWF0ZWRBdCIsIm9zVHlwZSIsIm9zUGxhdGZvcm0iLCJwbGF0Zm9ybSIsIm9zQXJjaCIsImFyY2giLCJvc1JlbGVhc2UiLCJyZWxlYXNlIiwibm9kZVZlcnNpb24iLCJwcm9jZXNzIiwiZGVwbG95TWV0aG9kIiwiZW52IiwiREVQTE9ZX01FVEhPRCIsImRlcGxveVBsYXRmb3JtIiwiREVQTE9ZX1BMQVRGT1JNIiwicmVzdWx0IiwicGFyYW1zIiwiZXJyb3IiLCJhbGVydHMiLCJtZXRob2RzIiwidXNlcklkIiwiRXJyb3IiLCJtZXRob2QiLCJyZW1vdmVCYW5uZXJCeUlkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsa0JBQUo7QUFBdUJDLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxnQ0FBUixDQUFiLEVBQXVEO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDTCx5QkFBbUJLLENBQW5CO0FBQXFCOztBQUFqQyxDQUF2RCxFQUEwRixDQUExRjtB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O0FBRkYsS0FBUDtBQUlBO0FBQ0QsQ0F4Q0QsRTs7Ozs7Ozs7Ozs7QUNBQWpGLE9BQU9rRixPQUFQLENBQWU7QUFDZCxtQkFBaUI7QUFBRXZDO0FBQUYsR0FBakIsRUFBeUI7QUFDeEIsUUFBSSxDQUFDM0MsT0FBT21GLE1BQVAsRUFBTCxFQUFzQjtBQUNyQixZQUFNLElBQUluRixPQUFPb0YsS0FBWCxDQUFpQixvQkFBakIsRUFBdUMsY0FBdkMsRUFBdUQ7QUFBRUMsZ0JBQVE7QUFBVixPQUF2RCxDQUFOO0FBQ0E7O0FBRURuRixlQUFXd0IsTUFBWCxDQUFrQmUsS0FBbEIsQ0FBd0I2QyxnQkFBeEIsQ0FBeUMsS0FBS0gsTUFBOUMsRUFBc0Q7QUFDckR4QztBQURxRCxLQUF0RDtBQUdBOztBQVRhLENBQWYsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF92ZXJzaW9uLWNoZWNrLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFscyBTeW5jZWRDcm9uICovXG5cbmltcG9ydCBjaGVja1ZlcnNpb25VcGRhdGUgZnJvbSAnLi9mdW5jdGlvbnMvY2hlY2tWZXJzaW9uVXBkYXRlJztcbmltcG9ydCAnLi9tZXRob2RzL2Jhbm5lcl9kaXNtaXNzJztcbmltcG9ydCAnLi9hZGRTZXR0aW5ncyc7XG5cbmNvbnN0IGpvYk5hbWUgPSAndmVyc2lvbl9jaGVjayc7XG5cbmlmIChTeW5jZWRDcm9uLm5leHRTY2hlZHVsZWRBdERhdGUoam9iTmFtZSkpIHtcblx0U3luY2VkQ3Jvbi5yZW1vdmUoam9iTmFtZSk7XG59XG5cblN5bmNlZENyb24uYWRkKHtcblx0bmFtZTogam9iTmFtZSxcblx0c2NoZWR1bGU6IChwYXJzZXIpID0+IHBhcnNlci50ZXh0KCdhdCAyOjAwIGFtJyksXG5cdGpvYigpIHtcblx0XHRjaGVja1ZlcnNpb25VcGRhdGUoKTtcblx0fSxcbn0pO1xuXG5TeW5jZWRDcm9uLnN0YXJ0KCk7XG5cbk1ldGVvci5zdGFydHVwKCgpID0+IHtcblx0Y2hlY2tWZXJzaW9uVXBkYXRlKCk7XG59KTtcblxuLy8gU2VuZCBlbWFpbCB0byBhZG1pbnNcbi8vIFNhdmUgbGF0ZXN0IGFsZXJ0XG4vLyBFTlYgdmFyIHRvIGRpc2FibGUgdGhlIGNoZWNrIGZvciB1cGRhdGUgZm9yIG91ciBjbG91ZFxuIiwiUm9ja2V0Q2hhdC5zZXR0aW5ncy5hZGRHcm91cCgnR2VuZXJhbCcsIGZ1bmN0aW9uKCkge1xuXHR0aGlzLnNlY3Rpb24oJ1VwZGF0ZScsIGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWRkKCdVcGRhdGVfTGF0ZXN0QXZhaWxhYmxlVmVyc2lvbicsICcwLjAuMCcsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0cmVhZG9ubHk6IHRydWUsXG5cdFx0fSk7XG5cdH0pO1xufSk7XG4iLCJleHBvcnQgZGVmYXVsdCBuZXcgTG9nZ2VyKCdWZXJzaW9uQ2hlY2snKTtcbiIsImltcG9ydCBzZW12ZXIgZnJvbSAnc2VtdmVyJztcbmltcG9ydCBnZXROZXdVcGRhdGVzIGZyb20gJy4vZ2V0TmV3VXBkYXRlcyc7XG5pbXBvcnQgbG9nZ2VyIGZyb20gJy4uL2xvZ2dlcic7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcblx0bG9nZ2VyLmluZm8oJ0NoZWNraW5nIGZvciB2ZXJzaW9uIHVwZGF0ZXMnKTtcblxuXHRjb25zdCB7IHZlcnNpb25zIH0gPSBnZXROZXdVcGRhdGVzKCk7XG5cblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdGV4aXN0czogZmFsc2UsXG5cdFx0bGFzdGVzdFZlcnNpb246IG51bGwsXG5cdFx0c2VjdXJpdHk6IGZhbHNlLFxuXHR9O1xuXG5cdGNvbnN0IGxhc3RDaGVja2VkVmVyc2lvbiA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdVcGRhdGVfTGF0ZXN0QXZhaWxhYmxlVmVyc2lvbicpO1xuXHR2ZXJzaW9ucy5mb3JFYWNoKCh2ZXJzaW9uKSA9PiB7XG5cdFx0aWYgKHNlbXZlci5sdGUodmVyc2lvbi52ZXJzaW9uLCBsYXN0Q2hlY2tlZFZlcnNpb24pKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKHNlbXZlci5sdGUodmVyc2lvbi52ZXJzaW9uLCBSb2NrZXRDaGF0LkluZm8udmVyc2lvbikpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR1cGRhdGUuZXhpc3RzID0gdHJ1ZTtcblx0XHR1cGRhdGUubGFzdGVzdFZlcnNpb24gPSB2ZXJzaW9uO1xuXG5cdFx0aWYgKHZlcnNpb24uc2VjdXJpdHkgPT09IHRydWUpIHtcblx0XHRcdHVwZGF0ZS5zZWN1cml0eSA9IHRydWU7XG5cdFx0fVxuXHR9KTtcblxuXHRpZiAodXBkYXRlLmV4aXN0cykge1xuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MudXBkYXRlQnlJZCgnVXBkYXRlX0xhdGVzdEF2YWlsYWJsZVZlcnNpb24nLCB1cGRhdGUubGFzdGVzdFZlcnNpb24udmVyc2lvbik7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuZmluZFVzZXJzSW5Sb2xlKCdhZG1pbicpLmZvckVhY2goKGFkbWluVXNlcikgPT4ge1xuXHRcdFx0Y29uc3QgbXNnID0ge1xuXHRcdFx0XHRtc2c6IGAqJHsgVEFQaTE4bi5fXygnVXBkYXRlX3lvdXJfUm9ja2V0Q2hhdCcsIGFkbWluVXNlci5sYW5ndWFnZSkgfSpcXG4keyBUQVBpMThuLl9fKCdOZXdfdmVyc2lvbl9hdmFpbGFibGVfKHMpJywgdXBkYXRlLmxhc3Rlc3RWZXJzaW9uLnZlcnNpb24sIGFkbWluVXNlci5sYW5ndWFnZSkgfVxcbiR7IHVwZGF0ZS5sYXN0ZXN0VmVyc2lvbi5pbmZvVXJsIH1gLFxuXHRcdFx0XHRyaWQ6IFthZG1pblVzZXIuX2lkLCAncm9ja2V0LmNhdCddLnNvcnQoKS5qb2luKCcnKSxcblx0XHRcdH07XG5cblx0XHRcdE1ldGVvci5ydW5Bc1VzZXIoJ3JvY2tldC5jYXQnLCAoKSA9PiBNZXRlb3IuY2FsbCgnc2VuZE1lc3NhZ2UnLCBtc2cpKTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuYWRkQmFubmVyQnlJZChhZG1pblVzZXIuX2lkLCB7XG5cdFx0XHRcdGlkOiAndmVyc2lvblVwZGF0ZScsXG5cdFx0XHRcdHByaW9yaXR5OiAxMCxcblx0XHRcdFx0dGl0bGU6ICdVcGRhdGVfeW91cl9Sb2NrZXRDaGF0Jyxcblx0XHRcdFx0dGV4dDogJ05ld192ZXJzaW9uX2F2YWlsYWJsZV8ocyknLFxuXHRcdFx0XHR0ZXh0QXJndW1lbnRzOiBbdXBkYXRlLmxhc3Rlc3RWZXJzaW9uLnZlcnNpb25dLFxuXHRcdFx0XHRsaW5rOiB1cGRhdGUubGFzdGVzdFZlcnNpb24uaW5mb1VybCxcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG59O1xuIiwiLyogZ2xvYmFsIE1vbmdvSW50ZXJuYWxzICovXG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHsgSFRUUCB9IGZyb20gJ21ldGVvci9odHRwJztcbi8vIGltcG9ydCBjaGVja1VwZGF0ZSBmcm9tICcuLi9jaGVja1VwZGF0ZSc7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcblx0dHJ5IHtcblx0XHRjb25zdCB1bmlxdWVJRCA9IFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmRPbmUoJ3VuaXF1ZUlEJyk7XG5cdFx0Y29uc3QgeyBfb3Bsb2dIYW5kbGUgfSA9IE1vbmdvSW50ZXJuYWxzLmRlZmF1bHRSZW1vdGVDb2xsZWN0aW9uRHJpdmVyKCkubW9uZ287XG5cdFx0Y29uc3Qgb3Bsb2dFbmFibGVkID0gX29wbG9nSGFuZGxlICYmIF9vcGxvZ0hhbmRsZS5vbk9wbG9nRW50cnkgJiYgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZvcmNlX0Rpc2FibGVfT3BMb2dfRm9yX0NhY2hlJykgIT09IHRydWU7XG5cblx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0dW5pcXVlSWQ6IHVuaXF1ZUlELnZhbHVlLFxuXHRcdFx0aW5zdGFsbGVkQXQ6IHVuaXF1ZUlELmNyZWF0ZWRBdCxcblx0XHRcdHZlcnNpb246IFJvY2tldENoYXQuSW5mby52ZXJzaW9uLFxuXHRcdFx0b3Bsb2dFbmFibGVkLFxuXHRcdFx0b3NUeXBlOiBvcy50eXBlKCksXG5cdFx0XHRvc1BsYXRmb3JtOiBvcy5wbGF0Zm9ybSgpLFxuXHRcdFx0b3NBcmNoOiBvcy5hcmNoKCksXG5cdFx0XHRvc1JlbGVhc2U6IG9zLnJlbGVhc2UoKSxcblx0XHRcdG5vZGVWZXJzaW9uOiBwcm9jZXNzLnZlcnNpb24sXG5cdFx0XHRkZXBsb3lNZXRob2Q6IHByb2Nlc3MuZW52LkRFUExPWV9NRVRIT0QgfHwgJ3RhcicsXG5cdFx0XHRkZXBsb3lQbGF0Zm9ybTogcHJvY2Vzcy5lbnYuREVQTE9ZX1BMQVRGT1JNIHx8ICdzZWxmaW5zdGFsbCcsXG5cdFx0fTtcblxuXHRcdGNvbnN0IHJlc3VsdCA9IEhUVFAuZ2V0KCdodHRwczovL3JlbGVhc2VzLnJvY2tldC5jaGF0L3VwZGF0ZXMvY2hlY2snLCB7XG5cdFx0XHRwYXJhbXM6IGRhdGEsXG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gcmVzdWx0LmRhdGE7XG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0Ly8gVGhlcmUncyBubyBuZWVkIHRvIGxvZyB0aGlzIGVycm9yXG5cdFx0Ly8gYXMgaXQncyBwb2ludGxlc3MgYW5kIHRoZSB1c2VyXG5cdFx0Ly8gY2FuJ3QgZG8gYW55dGhpbmcgYWJvdXQgaXQgYW55d2F5c1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHZlcnNpb25zOiBbXSxcblx0XHRcdGFsZXJ0czogW10sXG5cdFx0fTtcblx0fVxufTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2Jhbm5lci9kaXNtaXNzJyh7IGlkIH0pIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnYmFubmVyL2Rpc21pc3MnIH0pO1xuXHRcdH1cblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnJlbW92ZUJhbm5lckJ5SWQodGhpcy51c2VySWQsIHtcblx0XHRcdGlkLFxuXHRcdH0pO1xuXHR9LFxufSk7XG4iXX0=
