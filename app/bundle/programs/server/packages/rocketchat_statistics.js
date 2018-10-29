(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:statistics":{"lib":{"rocketchat.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_statistics/lib/rocketchat.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
RocketChat.statistics = {};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"models":{"Statistics.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_statistics/server/models/Statistics.js                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
RocketChat.models.Statistics = new class extends RocketChat.models._Base {
  constructor() {
    super('statistics');
    this.tryEnsureIndex({
      createdAt: 1
    });
  } // FIND ONE


  findOneById(_id, options) {
    const query = {
      _id
    };
    return this.findOne(query, options);
  }

  findLast() {
    const options = {
      sort: {
        createdAt: -1
      },
      limit: 1
    };
    const records = this.find({}, options).fetch();
    return records && records[0];
  }

}();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"functions":{"get.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_statistics/server/functions/get.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let os;
module.watch(require("os"), {
  default(v) {
    os = v;
  }

}, 1);
let LivechatVisitors;
module.watch(require("meteor/rocketchat:livechat/server/models/LivechatVisitors"), {
  default(v) {
    LivechatVisitors = v;
  }

}, 2);
const wizardFields = ['Organization_Type', 'Organization_Name', 'Industry', 'Size', 'Country', 'Website', 'Site_Name', 'Language', 'Server_Type', 'Allow_Marketing_Emails'];

RocketChat.statistics.get = function _getStatistics() {
  const statistics = {}; // Setup Wizard

  statistics.wizard = {};
  wizardFields.forEach(field => {
    const record = RocketChat.models.Settings.findOne(field);

    if (record) {
      const wizardField = field.replace(/_/g, '').replace(field[0], field[0].toLowerCase());
      statistics.wizard[wizardField] = record.value;
    }
  });

  if (statistics.wizard.allowMarketingEmails) {
    const firstUser = RocketChat.models.Users.getOldest({
      name: 1,
      emails: 1
    });
    statistics.wizard.contactName = firstUser && firstUser.name;
    statistics.wizard.contactEmail = firstUser && firstUser.emails[0].address;
  } // Version


  statistics.uniqueId = RocketChat.settings.get('uniqueID');

  if (RocketChat.models.Settings.findOne('uniqueID')) {
    statistics.installedAt = RocketChat.models.Settings.findOne('uniqueID').createdAt;
  }

  if (RocketChat.Info) {
    statistics.version = RocketChat.Info.version;
    statistics.tag = RocketChat.Info.tag;
    statistics.branch = RocketChat.Info.branch;
  } // User statistics


  statistics.totalUsers = Meteor.users.find().count();
  statistics.activeUsers = Meteor.users.find({
    active: true
  }).count();
  statistics.nonActiveUsers = statistics.totalUsers - statistics.activeUsers;
  statistics.onlineUsers = Meteor.users.find({
    statusConnection: 'online'
  }).count();
  statistics.awayUsers = Meteor.users.find({
    statusConnection: 'away'
  }).count();
  statistics.offlineUsers = statistics.totalUsers - statistics.onlineUsers - statistics.awayUsers; // Room statistics

  statistics.totalRooms = RocketChat.models.Rooms.find().count();
  statistics.totalChannels = RocketChat.models.Rooms.findByType('c').count();
  statistics.totalPrivateGroups = RocketChat.models.Rooms.findByType('p').count();
  statistics.totalDirect = RocketChat.models.Rooms.findByType('d').count();
  statistics.totalLivechat = RocketChat.models.Rooms.findByType('l').count(); // livechat visitors

  statistics.totalLivechatVisitors = LivechatVisitors.find().count(); // Message statistics

  statistics.totalMessages = RocketChat.models.Messages.find().count();
  statistics.totalChannelMessages = _.reduce(RocketChat.models.Rooms.findByType('c', {
    fields: {
      msgs: 1
    }
  }).fetch(), function _countChannelMessages(num, room) {
    return num + room.msgs;
  }, 0);
  statistics.totalPrivateGroupMessages = _.reduce(RocketChat.models.Rooms.findByType('p', {
    fields: {
      msgs: 1
    }
  }).fetch(), function _countPrivateGroupMessages(num, room) {
    return num + room.msgs;
  }, 0);
  statistics.totalDirectMessages = _.reduce(RocketChat.models.Rooms.findByType('d', {
    fields: {
      msgs: 1
    }
  }).fetch(), function _countDirectMessages(num, room) {
    return num + room.msgs;
  }, 0);
  statistics.totalLivechatMessages = _.reduce(RocketChat.models.Rooms.findByType('l', {
    fields: {
      msgs: 1
    }
  }).fetch(), function _countLivechatMessages(num, room) {
    return num + room.msgs;
  }, 0);
  statistics.lastLogin = RocketChat.models.Users.getLastLogin();
  statistics.lastMessageSentAt = RocketChat.models.Messages.getLastTimestamp();
  statistics.lastSeenSubscription = RocketChat.models.Subscriptions.getLastSeen();
  statistics.os = {
    type: os.type(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    uptime: os.uptime(),
    loadavg: os.loadavg(),
    totalmem: os.totalmem(),
    freemem: os.freemem(),
    cpus: os.cpus()
  };
  statistics.process = {
    nodeVersion: process.version,
    pid: process.pid,
    uptime: process.uptime()
  };
  statistics.deploy = {
    method: process.env.DEPLOY_METHOD || 'tar',
    platform: process.env.DEPLOY_PLATFORM || 'selfinstall'
  };
  statistics.migration = RocketChat.Migrations._getControl();
  statistics.instanceCount = InstanceStatus.getCollection().find({
    _updatedAt: {
      $gt: new Date(Date.now() - process.uptime() * 1000 - 2000)
    }
  }).count();

  if (MongoInternals.defaultRemoteCollectionDriver().mongo._oplogHandle && MongoInternals.defaultRemoteCollectionDriver().mongo._oplogHandle.onOplogEntry && RocketChat.settings.get('Force_Disable_OpLog_For_Cache') !== true) {
    statistics.oplogEnabled = true;
  }

  return statistics;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"save.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_statistics/server/functions/save.js                                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
RocketChat.statistics.save = function () {
  const statistics = RocketChat.statistics.get();
  statistics.createdAt = new Date();
  RocketChat.models.Statistics.insert(statistics);
  return statistics;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"getStatistics.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_statistics/server/methods/getStatistics.js                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.methods({
  getStatistics(refresh) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'getStatistics'
      });
    }

    if (RocketChat.authz.hasPermission(Meteor.userId(), 'view-statistics') !== true) {
      throw new Meteor.Error('error-not-allowed', 'Not allowed', {
        method: 'getStatistics'
      });
    }

    if (refresh) {
      return RocketChat.statistics.save();
    } else {
      return RocketChat.models.Statistics.findLast();
    }
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:statistics/lib/rocketchat.js");
require("/node_modules/meteor/rocketchat:statistics/server/models/Statistics.js");
require("/node_modules/meteor/rocketchat:statistics/server/functions/get.js");
require("/node_modules/meteor/rocketchat:statistics/server/functions/save.js");
require("/node_modules/meteor/rocketchat:statistics/server/methods/getStatistics.js");

/* Exports */
Package._define("rocketchat:statistics");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_statistics.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzdGF0aXN0aWNzL2xpYi9yb2NrZXRjaGF0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnN0YXRpc3RpY3Mvc2VydmVyL21vZGVscy9TdGF0aXN0aWNzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnN0YXRpc3RpY3Mvc2VydmVyL2Z1bmN0aW9ucy9nZXQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6c3RhdGlzdGljcy9zZXJ2ZXIvZnVuY3Rpb25zL3NhdmUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6c3RhdGlzdGljcy9zZXJ2ZXIvbWV0aG9kcy9nZXRTdGF0aXN0aWNzLmpzIl0sIm5hbWVzIjpbIlJvY2tldENoYXQiLCJzdGF0aXN0aWNzIiwibW9kZWxzIiwiU3RhdGlzdGljcyIsIl9CYXNlIiwiY29uc3RydWN0b3IiLCJ0cnlFbnN1cmVJbmRleCIsImNyZWF0ZWRBdCIsImZpbmRPbmVCeUlkIiwiX2lkIiwib3B0aW9ucyIsInF1ZXJ5IiwiZmluZE9uZSIsImZpbmRMYXN0Iiwic29ydCIsImxpbWl0IiwicmVjb3JkcyIsImZpbmQiLCJmZXRjaCIsIl8iLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsIm9zIiwiTGl2ZWNoYXRWaXNpdG9ycyIsIndpemFyZEZpZWxkcyIsImdldCIsIl9nZXRTdGF0aXN0aWNzIiwid2l6YXJkIiwiZm9yRWFjaCIsImZpZWxkIiwicmVjb3JkIiwiU2V0dGluZ3MiLCJ3aXphcmRGaWVsZCIsInJlcGxhY2UiLCJ0b0xvd2VyQ2FzZSIsInZhbHVlIiwiYWxsb3dNYXJrZXRpbmdFbWFpbHMiLCJmaXJzdFVzZXIiLCJVc2VycyIsImdldE9sZGVzdCIsIm5hbWUiLCJlbWFpbHMiLCJjb250YWN0TmFtZSIsImNvbnRhY3RFbWFpbCIsImFkZHJlc3MiLCJ1bmlxdWVJZCIsInNldHRpbmdzIiwiaW5zdGFsbGVkQXQiLCJJbmZvIiwidmVyc2lvbiIsInRhZyIsImJyYW5jaCIsInRvdGFsVXNlcnMiLCJNZXRlb3IiLCJ1c2VycyIsImNvdW50IiwiYWN0aXZlVXNlcnMiLCJhY3RpdmUiLCJub25BY3RpdmVVc2VycyIsIm9ubGluZVVzZXJzIiwic3RhdHVzQ29ubmVjdGlvbiIsImF3YXlVc2VycyIsIm9mZmxpbmVVc2VycyIsInRvdGFsUm9vbXMiLCJSb29tcyIsInRvdGFsQ2hhbm5lbHMiLCJmaW5kQnlUeXBlIiwidG90YWxQcml2YXRlR3JvdXBzIiwidG90YWxEaXJlY3QiLCJ0b3RhbExpdmVjaGF0IiwidG90YWxMaXZlY2hhdFZpc2l0b3JzIiwidG90YWxNZXNzYWdlcyIsIk1lc3NhZ2VzIiwidG90YWxDaGFubmVsTWVzc2FnZXMiLCJyZWR1Y2UiLCJmaWVsZHMiLCJtc2dzIiwiX2NvdW50Q2hhbm5lbE1lc3NhZ2VzIiwibnVtIiwicm9vbSIsInRvdGFsUHJpdmF0ZUdyb3VwTWVzc2FnZXMiLCJfY291bnRQcml2YXRlR3JvdXBNZXNzYWdlcyIsInRvdGFsRGlyZWN0TWVzc2FnZXMiLCJfY291bnREaXJlY3RNZXNzYWdlcyIsInRvdGFsTGl2ZWNoYXRNZXNzYWdlcyIsIl9jb3VudExpdmVjaGF0TWVzc2FnZXMiLCJsYXN0TG9naW4iLCJnZXRMYXN0TG9naW4iLCJsYXN0TWVzc2FnZVNlbnRBdCIsImdldExhc3RUaW1lc3RhbXAiLCJsYXN0U2VlblN1YnNjcmlwdGlvbiIsIlN1YnNjcmlwdGlvbnMiLCJnZXRMYXN0U2VlbiIsInR5cGUiLCJwbGF0Zm9ybSIsImFyY2giLCJyZWxlYXNlIiwidXB0aW1lIiwibG9hZGF2ZyIsInRvdGFsbWVtIiwiZnJlZW1lbSIsImNwdXMiLCJwcm9jZXNzIiwibm9kZVZlcnNpb24iLCJwaWQiLCJkZXBsb3kiLCJtZXRob2QiLCJlbnYiLCJERVBMT1lfTUVUSE9EIiwiREVQTE9ZX1BMQVRGT1JNIiwibWlncmF0aW9uIiwiTWlncmF0aW9ucyIsIl9nZXRDb250cm9sIiwiaW5zdGFuY2VDb3VudCIsIkluc3RhbmNlU3RhdHVzIiwiZ2V0Q29sbGVjdGlvbiIsIl91cGRhdGVkQXQiLCIkZ3QiLCJEYXRlIiwibm93IiwiTW9uZ29JbnRlcm5hbHMiLCJkZWZhdWx0UmVtb3RlQ29sbGVjdGlvbkRyaXZlciIsIm1vbmdvIiwiX29wbG9nSGFuZGxlIiwib25PcGxvZ0VudHJ5Iiwib3Bsb2dFbmFibGVkIiwic2F2ZSIsImluc2VydCIsIm1ldGhvZHMiLCJnZXRTdGF0aXN0aWNzIiwicmVmcmVzaCIsInVzZXJJZCIsIkVycm9yIiwiYXV0aHoiLCJoYXNQZXJtaXNzaW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsV0FBV0MsVUFBWCxHQUF3QixFQUF4QixDOzs7Ozs7Ozs7OztBQ0FBRCxXQUFXRSxNQUFYLENBQWtCQyxVQUFsQixHQUErQixJQUFJLGNBQWNILFdBQVdFLE1BQVgsQ0FBa0JFLEtBQWhDLENBQXNDO0FBQ3hFQyxnQkFBYztBQUNiLFVBQU0sWUFBTjtBQUVBLFNBQUtDLGNBQUwsQ0FBb0I7QUFBRUMsaUJBQVc7QUFBYixLQUFwQjtBQUNBLEdBTHVFLENBT3hFOzs7QUFDQUMsY0FBWUMsR0FBWixFQUFpQkMsT0FBakIsRUFBMEI7QUFDekIsVUFBTUMsUUFBUTtBQUFFRjtBQUFGLEtBQWQ7QUFDQSxXQUFPLEtBQUtHLE9BQUwsQ0FBYUQsS0FBYixFQUFvQkQsT0FBcEIsQ0FBUDtBQUNBOztBQUVERyxhQUFXO0FBQ1YsVUFBTUgsVUFBVTtBQUNmSSxZQUFNO0FBQ0xQLG1CQUFXLENBQUM7QUFEUCxPQURTO0FBSWZRLGFBQU87QUFKUSxLQUFoQjtBQU1BLFVBQU1DLFVBQVUsS0FBS0MsSUFBTCxDQUFVLEVBQVYsRUFBY1AsT0FBZCxFQUF1QlEsS0FBdkIsRUFBaEI7QUFDQSxXQUFPRixXQUFXQSxRQUFRLENBQVIsQ0FBbEI7QUFDQTs7QUF0QnVFLENBQTFDLEVBQS9C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LEVBQXZCO0FBQ0F6SCxhQUFXRSxNQUFYLENBQWtCQyxVQUFsQixDQUE2QitILE1BQTdCLENBQW9DakksVUFBcEM7QUFDQSxTQUFPQSxVQUFQO0FBQ0EsQ0FMRCxDOzs7Ozs7Ozs7OztBQ0FBdUQsT0FBTzJFLE9BQVAsQ0FBZTtBQUNkQyxnQkFBY0MsT0FBZCxFQUF1QjtBQUN0QixRQUFJLENBQUM3RSxPQUFPOEUsTUFBUCxFQUFMLEVBQXNCO0FBQ3JCLFlBQU0sSUFBSTlFLE9BQU8rRSxLQUFYLENBQWlCLG9CQUFqQixFQUF1QyxjQUF2QyxFQUF1RDtBQUFFMUIsZ0JBQVE7QUFBVixPQUF2RCxDQUFOO0FBQ0E7O0FBRUQsUUFBSTdHLFdBQVd3SSxLQUFYLENBQWlCQyxhQUFqQixDQUErQmpGLE9BQU84RSxNQUFQLEVBQS9CLEVBQWdELGlCQUFoRCxNQUF1RSxJQUEzRSxFQUFpRjtBQUNoRixZQUFNLElBQUk5RSxPQUFPK0UsS0FBWCxDQUFpQixtQkFBakIsRUFBc0MsYUFBdEMsRUFBcUQ7QUFBRTFCLGdCQUFRO0FBQVYsT0FBckQsQ0FBTjtBQUNBOztBQUVELFFBQUl3QixPQUFKLEVBQWE7QUFDWixhQUFPckksV0FBV0MsVUFBWCxDQUFzQmdJLElBQXRCLEVBQVA7QUFDQSxLQUZELE1BRU87QUFDTixhQUFPakksV0FBV0UsTUFBWCxDQUFrQkMsVUFBbEIsQ0FBNkJVLFFBQTdCLEVBQVA7QUFDQTtBQUNEOztBQWZhLENBQWYsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9zdGF0aXN0aWNzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiUm9ja2V0Q2hhdC5zdGF0aXN0aWNzID0ge307XG4iLCJSb2NrZXRDaGF0Lm1vZGVscy5TdGF0aXN0aWNzID0gbmV3IGNsYXNzIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignc3RhdGlzdGljcycpO1xuXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IGNyZWF0ZWRBdDogMSB9KTtcblx0fVxuXG5cdC8vIEZJTkQgT05FXG5cdGZpbmRPbmVCeUlkKF9pZCwgb3B0aW9ucykge1xuXHRcdGNvbnN0IHF1ZXJ5ID0geyBfaWQgfTtcblx0XHRyZXR1cm4gdGhpcy5maW5kT25lKHF1ZXJ5LCBvcHRpb25zKTtcblx0fVxuXG5cdGZpbmRMYXN0KCkge1xuXHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRzb3J0OiB7XG5cdFx0XHRcdGNyZWF0ZWRBdDogLTEsXG5cdFx0XHR9LFxuXHRcdFx0bGltaXQ6IDEsXG5cdFx0fTtcblx0XHRjb25zdCByZWNvcmRzID0gdGhpcy5maW5kKHt9LCBvcHRpb25zKS5mZXRjaCgpO1xuXHRcdHJldHVybiByZWNvcmRzICYmIHJlY29yZHNbMF07XG5cdH1cbn07XG4iLCIvKiBnbG9iYWwgSW5zdGFuY2VTdGF0dXMsIE1vbmdvSW50ZXJuYWxzICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgTGl2ZWNoYXRWaXNpdG9ycyBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaXZlY2hhdC9zZXJ2ZXIvbW9kZWxzL0xpdmVjaGF0VmlzaXRvcnMnO1xuXG5jb25zdCB3aXphcmRGaWVsZHMgPSBbXG5cdCdPcmdhbml6YXRpb25fVHlwZScsXG5cdCdPcmdhbml6YXRpb25fTmFtZScsXG5cdCdJbmR1c3RyeScsXG5cdCdTaXplJyxcblx0J0NvdW50cnknLFxuXHQnV2Vic2l0ZScsXG5cdCdTaXRlX05hbWUnLFxuXHQnTGFuZ3VhZ2UnLFxuXHQnU2VydmVyX1R5cGUnLFxuXHQnQWxsb3dfTWFya2V0aW5nX0VtYWlscycsXG5dO1xuXG5Sb2NrZXRDaGF0LnN0YXRpc3RpY3MuZ2V0ID0gZnVuY3Rpb24gX2dldFN0YXRpc3RpY3MoKSB7XG5cdGNvbnN0IHN0YXRpc3RpY3MgPSB7fTtcblxuXHQvLyBTZXR1cCBXaXphcmRcblx0c3RhdGlzdGljcy53aXphcmQgPSB7fTtcblx0d2l6YXJkRmllbGRzLmZvckVhY2goKGZpZWxkKSA9PiB7XG5cdFx0Y29uc3QgcmVjb3JkID0gUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZE9uZShmaWVsZCk7XG5cdFx0aWYgKHJlY29yZCkge1xuXHRcdFx0Y29uc3Qgd2l6YXJkRmllbGQgPSBmaWVsZC5yZXBsYWNlKC9fL2csICcnKS5yZXBsYWNlKGZpZWxkWzBdLCBmaWVsZFswXS50b0xvd2VyQ2FzZSgpKTtcblx0XHRcdHN0YXRpc3RpY3Mud2l6YXJkW3dpemFyZEZpZWxkXSA9IHJlY29yZC52YWx1ZTtcblx0XHR9XG5cdH0pO1xuXG5cdGlmIChzdGF0aXN0aWNzLndpemFyZC5hbGxvd01hcmtldGluZ0VtYWlscykge1xuXHRcdGNvbnN0IGZpcnN0VXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmdldE9sZGVzdCh7IG5hbWU6IDEsIGVtYWlsczogMSB9KTtcblx0XHRzdGF0aXN0aWNzLndpemFyZC5jb250YWN0TmFtZSA9IGZpcnN0VXNlciAmJiBmaXJzdFVzZXIubmFtZTtcblx0XHRzdGF0aXN0aWNzLndpemFyZC5jb250YWN0RW1haWwgPSBmaXJzdFVzZXIgJiYgZmlyc3RVc2VyLmVtYWlsc1swXS5hZGRyZXNzO1xuXHR9XG5cblx0Ly8gVmVyc2lvblxuXHRzdGF0aXN0aWNzLnVuaXF1ZUlkID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ3VuaXF1ZUlEJyk7XG5cdGlmIChSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kT25lKCd1bmlxdWVJRCcpKSB7XG5cdFx0c3RhdGlzdGljcy5pbnN0YWxsZWRBdCA9IFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmRPbmUoJ3VuaXF1ZUlEJykuY3JlYXRlZEF0O1xuXHR9XG5cblx0aWYgKFJvY2tldENoYXQuSW5mbykge1xuXHRcdHN0YXRpc3RpY3MudmVyc2lvbiA9IFJvY2tldENoYXQuSW5mby52ZXJzaW9uO1xuXHRcdHN0YXRpc3RpY3MudGFnID0gUm9ja2V0Q2hhdC5JbmZvLnRhZztcblx0XHRzdGF0aXN0aWNzLmJyYW5jaCA9IFJvY2tldENoYXQuSW5mby5icmFuY2g7XG5cdH1cblxuXHQvLyBVc2VyIHN0YXRpc3RpY3Ncblx0c3RhdGlzdGljcy50b3RhbFVzZXJzID0gTWV0ZW9yLnVzZXJzLmZpbmQoKS5jb3VudCgpO1xuXHRzdGF0aXN0aWNzLmFjdGl2ZVVzZXJzID0gTWV0ZW9yLnVzZXJzLmZpbmQoeyBhY3RpdmU6IHRydWUgfSkuY291bnQoKTtcblx0c3RhdGlzdGljcy5ub25BY3RpdmVVc2VycyA9IHN0YXRpc3RpY3MudG90YWxVc2VycyAtIHN0YXRpc3RpY3MuYWN0aXZlVXNlcnM7XG5cdHN0YXRpc3RpY3Mub25saW5lVXNlcnMgPSBNZXRlb3IudXNlcnMuZmluZCh7IHN0YXR1c0Nvbm5lY3Rpb246ICdvbmxpbmUnIH0pLmNvdW50KCk7XG5cdHN0YXRpc3RpY3MuYXdheVVzZXJzID0gTWV0ZW9yLnVzZXJzLmZpbmQoeyBzdGF0dXNDb25uZWN0aW9uOiAnYXdheScgfSkuY291bnQoKTtcblx0c3RhdGlzdGljcy5vZmZsaW5lVXNlcnMgPSBzdGF0aXN0aWNzLnRvdGFsVXNlcnMgLSBzdGF0aXN0aWNzLm9ubGluZVVzZXJzIC0gc3RhdGlzdGljcy5hd2F5VXNlcnM7XG5cblx0Ly8gUm9vbSBzdGF0aXN0aWNzXG5cdHN0YXRpc3RpY3MudG90YWxSb29tcyA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmQoKS5jb3VudCgpO1xuXHRzdGF0aXN0aWNzLnRvdGFsQ2hhbm5lbHMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlUeXBlKCdjJykuY291bnQoKTtcblx0c3RhdGlzdGljcy50b3RhbFByaXZhdGVHcm91cHMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlUeXBlKCdwJykuY291bnQoKTtcblx0c3RhdGlzdGljcy50b3RhbERpcmVjdCA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRCeVR5cGUoJ2QnKS5jb3VudCgpO1xuXHRzdGF0aXN0aWNzLnRvdGFsTGl2ZWNoYXQgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlUeXBlKCdsJykuY291bnQoKTtcblxuXHQvLyBsaXZlY2hhdCB2aXNpdG9yc1xuXHRzdGF0aXN0aWNzLnRvdGFsTGl2ZWNoYXRWaXNpdG9ycyA9IExpdmVjaGF0VmlzaXRvcnMuZmluZCgpLmNvdW50KCk7XG5cblx0Ly8gTWVzc2FnZSBzdGF0aXN0aWNzXG5cdHN0YXRpc3RpY3MudG90YWxNZXNzYWdlcyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmQoKS5jb3VudCgpO1xuXHRzdGF0aXN0aWNzLnRvdGFsQ2hhbm5lbE1lc3NhZ2VzID0gXy5yZWR1Y2UoUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5VHlwZSgnYycsIHsgZmllbGRzOiB7IG1zZ3M6IDEgfSB9KS5mZXRjaCgpLCBmdW5jdGlvbiBfY291bnRDaGFubmVsTWVzc2FnZXMobnVtLCByb29tKSB7IHJldHVybiBudW0gKyByb29tLm1zZ3M7IH0sIDApO1xuXHRzdGF0aXN0aWNzLnRvdGFsUHJpdmF0ZUdyb3VwTWVzc2FnZXMgPSBfLnJlZHVjZShSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlUeXBlKCdwJywgeyBmaWVsZHM6IHsgbXNnczogMSB9IH0pLmZldGNoKCksIGZ1bmN0aW9uIF9jb3VudFByaXZhdGVHcm91cE1lc3NhZ2VzKG51bSwgcm9vbSkgeyByZXR1cm4gbnVtICsgcm9vbS5tc2dzOyB9LCAwKTtcblx0c3RhdGlzdGljcy50b3RhbERpcmVjdE1lc3NhZ2VzID0gXy5yZWR1Y2UoUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5VHlwZSgnZCcsIHsgZmllbGRzOiB7IG1zZ3M6IDEgfSB9KS5mZXRjaCgpLCBmdW5jdGlvbiBfY291bnREaXJlY3RNZXNzYWdlcyhudW0sIHJvb20pIHsgcmV0dXJuIG51bSArIHJvb20ubXNnczsgfSwgMCk7XG5cdHN0YXRpc3RpY3MudG90YWxMaXZlY2hhdE1lc3NhZ2VzID0gXy5yZWR1Y2UoUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5VHlwZSgnbCcsIHsgZmllbGRzOiB7IG1zZ3M6IDEgfSB9KS5mZXRjaCgpLCBmdW5jdGlvbiBfY291bnRMaXZlY2hhdE1lc3NhZ2VzKG51bSwgcm9vbSkgeyByZXR1cm4gbnVtICsgcm9vbS5tc2dzOyB9LCAwKTtcblxuXHRzdGF0aXN0aWNzLmxhc3RMb2dpbiA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmdldExhc3RMb2dpbigpO1xuXHRzdGF0aXN0aWNzLmxhc3RNZXNzYWdlU2VudEF0ID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZ2V0TGFzdFRpbWVzdGFtcCgpO1xuXHRzdGF0aXN0aWNzLmxhc3RTZWVuU3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5nZXRMYXN0U2VlbigpO1xuXG5cdHN0YXRpc3RpY3Mub3MgPSB7XG5cdFx0dHlwZTogb3MudHlwZSgpLFxuXHRcdHBsYXRmb3JtOiBvcy5wbGF0Zm9ybSgpLFxuXHRcdGFyY2g6IG9zLmFyY2goKSxcblx0XHRyZWxlYXNlOiBvcy5yZWxlYXNlKCksXG5cdFx0dXB0aW1lOiBvcy51cHRpbWUoKSxcblx0XHRsb2FkYXZnOiBvcy5sb2FkYXZnKCksXG5cdFx0dG90YWxtZW06IG9zLnRvdGFsbWVtKCksXG5cdFx0ZnJlZW1lbTogb3MuZnJlZW1lbSgpLFxuXHRcdGNwdXM6IG9zLmNwdXMoKSxcblx0fTtcblxuXHRzdGF0aXN0aWNzLnByb2Nlc3MgPSB7XG5cdFx0bm9kZVZlcnNpb246IHByb2Nlc3MudmVyc2lvbixcblx0XHRwaWQ6IHByb2Nlc3MucGlkLFxuXHRcdHVwdGltZTogcHJvY2Vzcy51cHRpbWUoKSxcblx0fTtcblxuXHRzdGF0aXN0aWNzLmRlcGxveSA9IHtcblx0XHRtZXRob2Q6IHByb2Nlc3MuZW52LkRFUExPWV9NRVRIT0QgfHwgJ3RhcicsXG5cdFx0cGxhdGZvcm06IHByb2Nlc3MuZW52LkRFUExPWV9QTEFURk9STSB8fCAnc2VsZmluc3RhbGwnLFxuXHR9O1xuXG5cdHN0YXRpc3RpY3MubWlncmF0aW9uID0gUm9ja2V0Q2hhdC5NaWdyYXRpb25zLl9nZXRDb250cm9sKCk7XG5cdHN0YXRpc3RpY3MuaW5zdGFuY2VDb3VudCA9IEluc3RhbmNlU3RhdHVzLmdldENvbGxlY3Rpb24oKS5maW5kKHsgX3VwZGF0ZWRBdDogeyAkZ3Q6IG5ldyBEYXRlKERhdGUubm93KCkgLSBwcm9jZXNzLnVwdGltZSgpICogMTAwMCAtIDIwMDApIH0gfSkuY291bnQoKTtcblxuXHRpZiAoTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIoKS5tb25nby5fb3Bsb2dIYW5kbGUgJiYgTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIoKS5tb25nby5fb3Bsb2dIYW5kbGUub25PcGxvZ0VudHJ5ICYmIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGb3JjZV9EaXNhYmxlX09wTG9nX0Zvcl9DYWNoZScpICE9PSB0cnVlKSB7XG5cdFx0c3RhdGlzdGljcy5vcGxvZ0VuYWJsZWQgPSB0cnVlO1xuXHR9XG5cblx0cmV0dXJuIHN0YXRpc3RpY3M7XG59O1xuIiwiUm9ja2V0Q2hhdC5zdGF0aXN0aWNzLnNhdmUgPSBmdW5jdGlvbigpIHtcblx0Y29uc3Qgc3RhdGlzdGljcyA9IFJvY2tldENoYXQuc3RhdGlzdGljcy5nZXQoKTtcblx0c3RhdGlzdGljcy5jcmVhdGVkQXQgPSBuZXcgRGF0ZTtcblx0Um9ja2V0Q2hhdC5tb2RlbHMuU3RhdGlzdGljcy5pbnNlcnQoc3RhdGlzdGljcyk7XG5cdHJldHVybiBzdGF0aXN0aWNzO1xufTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0Z2V0U3RhdGlzdGljcyhyZWZyZXNoKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2dldFN0YXRpc3RpY3MnIH0pO1xuXHRcdH1cblxuXHRcdGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAndmlldy1zdGF0aXN0aWNzJykgIT09IHRydWUpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdnZXRTdGF0aXN0aWNzJyB9KTtcblx0XHR9XG5cblx0XHRpZiAocmVmcmVzaCkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuc3RhdGlzdGljcy5zYXZlKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5TdGF0aXN0aWNzLmZpbmRMYXN0KCk7XG5cdFx0fVxuXHR9LFxufSk7XG4iXX0=
