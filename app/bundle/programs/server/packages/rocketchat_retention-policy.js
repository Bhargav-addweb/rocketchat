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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:retention-policy":{"server":{"startup":{"settings.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_retention-policy/server/startup/settings.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.settings.addGroup('RetentionPolicy', function () {
  this.add('RetentionPolicy_Enabled', false, {
    type: 'boolean',
    public: true,
    i18nLabel: 'RetentionPolicy_Enabled',
    alert: 'Watch out! Tweaking these settings without utmost care can destroy all message history. Please read the documentation before turning the feature on at rocket.chat/docs/administrator-guides/retention-policies/'
  });
  this.add('RetentionPolicy_Precision', '0', {
    type: 'select',
    values: [{
      key: '0',
      i18nLabel: 'every_30_minutes'
    }, {
      key: '1',
      i18nLabel: 'every_hour'
    }, {
      key: '2',
      i18nLabel: 'every_six_hours'
    }, {
      key: '3',
      i18nLabel: 'every_day'
    }],
    public: true,
    i18nLabel: 'RetentionPolicy_Precision',
    i18nDescription: 'RetentionPolicy_Precision_Description',
    enableQuery: {
      _id: 'RetentionPolicy_Enabled',
      value: true
    }
  });
  this.section('Global Policy', function () {
    const globalQuery = {
      _id: 'RetentionPolicy_Enabled',
      value: true
    };
    this.add('RetentionPolicy_AppliesToChannels', false, {
      type: 'boolean',
      public: true,
      i18nLabel: 'RetentionPolicy_AppliesToChannels',
      enableQuery: globalQuery
    });
    this.add('RetentionPolicy_MaxAge_Channels', 30, {
      type: 'int',
      public: true,
      i18nLabel: 'RetentionPolicy_MaxAge_Channels',
      i18nDescription: 'RetentionPolicy_MaxAge_Description',
      enableQuery: [{
        _id: 'RetentionPolicy_AppliesToChannels',
        value: true
      }, globalQuery]
    });
    this.add('RetentionPolicy_AppliesToGroups', false, {
      type: 'boolean',
      public: true,
      i18nLabel: 'RetentionPolicy_AppliesToGroups',
      enableQuery: globalQuery
    });
    this.add('RetentionPolicy_MaxAge_Groups', 30, {
      type: 'int',
      public: true,
      i18nLabel: 'RetentionPolicy_MaxAge_Groups',
      i18nDescription: 'RetentionPolicy_MaxAge_Description',
      enableQuery: [{
        _id: 'RetentionPolicy_AppliesToGroups',
        value: true
      }, globalQuery]
    });
    this.add('RetentionPolicy_AppliesToDMs', false, {
      type: 'boolean',
      public: true,
      i18nLabel: 'RetentionPolicy_AppliesToDMs',
      enableQuery: globalQuery
    });
    this.add('RetentionPolicy_MaxAge_DMs', 30, {
      type: 'int',
      public: true,
      i18nLabel: 'RetentionPolicy_MaxAge_DMs',
      i18nDescription: 'RetentionPolicy_MaxAge_Description',
      enableQuery: [{
        _id: 'RetentionPolicy_AppliesToDMs',
        value: true
      }, globalQuery]
    });
    this.add('RetentionPolicy_ExcludePinned', false, {
      type: 'boolean',
      public: true,
      i18nLabel: 'RetentionPolicy_ExcludePinned',
      enableQuery: globalQuery
    });
    this.add('RetentionPolicy_FilesOnly', false, {
      type: 'boolean',
      public: true,
      i18nLabel: 'RetentionPolicy_FilesOnly',
      i18nDescription: 'RetentionPolicy_FilesOnly_Description',
      enableQuery: globalQuery
    });
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"cronPruneMessages.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_retention-policy/server/cronPruneMessages.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals SyncedCron */
let types = [];
const oldest = new Date('0001-01-01T00:00:00Z');
let lastPrune = oldest;
const maxTimes = {
  c: 0,
  p: 0,
  d: 0
};
const toDays = 1000 * 60 * 60 * 24;
const gracePeriod = 5000;

function job() {
  const now = new Date();
  const filesOnly = RocketChat.settings.get('RetentionPolicy_FilesOnly');
  const excludePinned = RocketChat.settings.get('RetentionPolicy_ExcludePinned'); // get all rooms with default values

  types.forEach(type => {
    const maxAge = maxTimes[type] || 0;
    const latest = new Date(now.getTime() - maxAge * toDays);
    RocketChat.models.Rooms.find({
      t: type,
      _updatedAt: {
        $gte: lastPrune
      },
      $or: [{
        'retention.enabled': {
          $eq: true
        }
      }, {
        'retention.enabled': {
          $exists: false
        }
      }],
      'retention.overrideGlobal': {
        $ne: true
      }
    }).forEach(({
      _id: rid
    }) => {
      RocketChat.cleanRoomHistory({
        rid,
        latest,
        oldest,
        filesOnly,
        excludePinned
      });
    });
  });
  RocketChat.models.Rooms.find({
    'retention.enabled': {
      $eq: true
    },
    'retention.overrideGlobal': {
      $eq: true
    },
    'retention.maxAge': {
      $gte: 0
    },
    _updatedAt: {
      $gte: lastPrune
    }
  }).forEach(room => {
    const {
      maxAge = 30,
      filesOnly,
      excludePinned
    } = room.retention;
    const latest = new Date(now.getTime() - maxAge * toDays);
    RocketChat.cleanRoomHistory({
      rid: room._id,
      latest,
      oldest,
      filesOnly,
      excludePinned
    });
  });
  lastPrune = new Date(now.getTime() - gracePeriod);
}

function getSchedule(precision) {
  switch (precision) {
    case '0':
      return '0 */30 * * * *';

    case '1':
      return '0 0 * * * *';

    case '2':
      return '0 0 */6 * * *';

    case '3':
      return '0 0 0 * * *';
  }
}

const pruneCronName = 'Prune old messages by retention policy';

function deployCron(precision) {
  const schedule = parser => parser.cron(getSchedule(precision), true);

  SyncedCron.remove(pruneCronName);
  SyncedCron.add({
    name: pruneCronName,
    schedule,
    job
  });
}

function reloadPolicy() {
  types = [];

  if (RocketChat.settings.get('RetentionPolicy_Enabled')) {
    if (RocketChat.settings.get('RetentionPolicy_AppliesToChannels')) {
      types.push('c');
    }

    if (RocketChat.settings.get('RetentionPolicy_AppliesToGroups')) {
      types.push('p');
    }

    if (RocketChat.settings.get('RetentionPolicy_AppliesToDMs')) {
      types.push('d');
    }

    maxTimes.c = RocketChat.settings.get('RetentionPolicy_MaxAge_Channels');
    maxTimes.p = RocketChat.settings.get('RetentionPolicy_MaxAge_Groups');
    maxTimes.d = RocketChat.settings.get('RetentionPolicy_MaxAge_DMs');
    return deployCron(RocketChat.settings.get('RetentionPolicy_Precision'));
  }

  return SyncedCron.remove(pruneCronName);
}

Meteor.startup(function () {
  Meteor.defer(function () {
    RocketChat.models.Settings.find({
      _id: {
        $in: ['RetentionPolicy_Enabled', 'RetentionPolicy_Precision', 'RetentionPolicy_AppliesToChannels', 'RetentionPolicy_AppliesToGroups', 'RetentionPolicy_AppliesToDMs', 'RetentionPolicy_MaxAge_Channels', 'RetentionPolicy_MaxAge_Groups', 'RetentionPolicy_MaxAge_DMs']
      }
    }).observe({
      changed() {
        reloadPolicy();
      }

    });
    reloadPolicy();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:retention-policy/server/startup/settings.js");
require("/node_modules/meteor/rocketchat:retention-policy/server/cronPruneMessages.js");

/* Exports */
Package._define("rocketchat:retention-policy");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_retention-policy.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpyZXRlbnRpb24tcG9saWN5L3NlcnZlci9zdGFydHVwL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnJldGVudGlvbi1wb2xpY3kvc2VydmVyL2Nyb25QcnVuZU1lc3NhZ2VzLmpzIl0sIm5hbWVzIjpbIlJvY2tldENoYXQiLCJzZXR0aW5ncyIsImFkZEdyb3VwIiwiYWRkIiwidHlwZSIsInB1YmxpYyIsImkxOG5MYWJlbCIsImFsZXJ0IiwidmFsdWVzIiwia2V5IiwiaTE4bkRlc2NyaXB0aW9uIiwiZW5hYmxlUXVlcnkiLCJfaWQiLCJ2YWx1ZSIsInNlY3Rpb24iLCJnbG9iYWxRdWVyeSIsInR5cGVzIiwib2xkZXN0IiwiRGF0ZSIsImxhc3RQcnVuZSIsIm1heFRpbWVzIiwiYyIsInAiLCJkIiwidG9EYXlzIiwiZ3JhY2VQZXJpb2QiLCJqb2IiLCJub3ciLCJmaWxlc09ubHkiLCJnZXQiLCJleGNsdWRlUGlubmVkIiwiZm9yRWFjaCIsIm1heEFnZSIsImxhdGVzdCIsImdldFRpbWUiLCJtb2RlbHMiLCJSb29tcyIsImZpbmQiLCJ0IiwiX3VwZGF0ZWRBdCIsIiRndGUiLCIkb3IiLCIkZXEiLCIkZXhpc3RzIiwiJG5lIiwicmlkIiwiY2xlYW5Sb29tSGlzdG9yeSIsInJvb20iLCJyZXRlbnRpb24iLCJnZXRTY2hlZHVsZSIsInByZWNpc2lvbiIsInBydW5lQ3Jvbk5hbWUiLCJkZXBsb3lDcm9uIiwic2NoZWR1bGUiLCJwYXJzZXIiLCJjcm9uIiwiU3luY2VkQ3JvbiIsInJlbW92ZSIsIm5hbWUiLCJyZWxvYWRQb2xpY3kiLCJwdXNoIiwiTWV0ZW9yIiwic3RhcnR1cCIsImRlZmVyIiwiU2V0dGluZ3MiLCIkaW4iLCJvYnNlcnZlIiwiY2hhbmdlZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLFdBQVdDLFFBQVgs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O0FBRUEsV0FBT3VCLFdBQVdwRCxXQUFXQyxRQUFYLENBQW9CNEIsR0FBcEIsQ0FBd0IsMkJBQXhCLENBQVgsQ0FBUDtBQUNBOztBQUNELFNBQU8yQixXQUFXQyxNQUFYLENBQWtCTixhQUFsQixDQUFQO0FBQ0E7O0FBRURVLE9BQU9DLE9BQVAsQ0FBZSxZQUFXO0FBQ3pCRCxTQUFPRSxLQUFQLENBQWEsWUFBVztBQUN2Qi9ELGVBQVdtQyxNQUFYLENBQWtCNkIsUUFBbEIsQ0FBMkIzQixJQUEzQixDQUFnQztBQUMvQnpCLFdBQUs7QUFDSnFELGFBQUssQ0FDSix5QkFESSxFQUVKLDJCQUZJLEVBR0osbUNBSEksRUFJSixpQ0FKSSxFQUtKLDhCQUxJLEVBTUosaUNBTkksRUFPSiwrQkFQSSxFQVFKLDRCQVJJO0FBREQ7QUFEMEIsS0FBaEMsRUFhR0MsT0FiSCxDQWFXO0FBQ1ZDLGdCQUFVO0FBQ1RSO0FBQ0E7O0FBSFMsS0FiWDtBQW1CQUE7QUFDQSxHQXJCRDtBQXNCQSxDQXZCRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X3JldGVudGlvbi1wb2xpY3kuanMiLCJzb3VyY2VzQ29udGVudCI6WyJSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdSZXRlbnRpb25Qb2xpY3knLCBmdW5jdGlvbigpIHtcblxuXHR0aGlzLmFkZCgnUmV0ZW50aW9uUG9saWN5X0VuYWJsZWQnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnUmV0ZW50aW9uUG9saWN5X0VuYWJsZWQnLFxuXHRcdGFsZXJ0OiAnV2F0Y2ggb3V0ISBUd2Vha2luZyB0aGVzZSBzZXR0aW5ncyB3aXRob3V0IHV0bW9zdCBjYXJlIGNhbiBkZXN0cm95IGFsbCBtZXNzYWdlIGhpc3RvcnkuIFBsZWFzZSByZWFkIHRoZSBkb2N1bWVudGF0aW9uIGJlZm9yZSB0dXJuaW5nIHRoZSBmZWF0dXJlIG9uIGF0IHJvY2tldC5jaGF0L2RvY3MvYWRtaW5pc3RyYXRvci1ndWlkZXMvcmV0ZW50aW9uLXBvbGljaWVzLycsXG5cdH0pO1xuXG5cdHRoaXMuYWRkKCdSZXRlbnRpb25Qb2xpY3lfUHJlY2lzaW9uJywgJzAnLCB7XG5cdFx0dHlwZTogJ3NlbGVjdCcsXG5cdFx0dmFsdWVzOiBbXG5cdFx0XHR7XG5cdFx0XHRcdGtleTogJzAnLFxuXHRcdFx0XHRpMThuTGFiZWw6ICdldmVyeV8zMF9taW51dGVzJyxcblx0XHRcdH0sIHtcblx0XHRcdFx0a2V5OiAnMScsXG5cdFx0XHRcdGkxOG5MYWJlbDogJ2V2ZXJ5X2hvdXInLFxuXHRcdFx0fSwge1xuXHRcdFx0XHRrZXk6ICcyJyxcblx0XHRcdFx0aTE4bkxhYmVsOiAnZXZlcnlfc2l4X2hvdXJzJyxcblx0XHRcdH0sIHtcblx0XHRcdFx0a2V5OiAnMycsXG5cdFx0XHRcdGkxOG5MYWJlbDogJ2V2ZXJ5X2RheScsXG5cdFx0XHR9LFxuXHRcdF0sXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ1JldGVudGlvblBvbGljeV9QcmVjaXNpb24nLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ1JldGVudGlvblBvbGljeV9QcmVjaXNpb25fRGVzY3JpcHRpb24nLFxuXHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRfaWQ6ICdSZXRlbnRpb25Qb2xpY3lfRW5hYmxlZCcsXG5cdFx0XHR2YWx1ZTogdHJ1ZSxcblx0XHR9LFxuXHR9KTtcblxuXHR0aGlzLnNlY3Rpb24oJ0dsb2JhbCBQb2xpY3knLCBmdW5jdGlvbigpIHtcblx0XHRjb25zdCBnbG9iYWxRdWVyeSA9IHtcblx0XHRcdF9pZDogJ1JldGVudGlvblBvbGljeV9FbmFibGVkJyxcblx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdH07XG5cblx0XHR0aGlzLmFkZCgnUmV0ZW50aW9uUG9saWN5X0FwcGxpZXNUb0NoYW5uZWxzJywgZmFsc2UsIHtcblx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdGkxOG5MYWJlbDogJ1JldGVudGlvblBvbGljeV9BcHBsaWVzVG9DaGFubmVscycsXG5cdFx0XHRlbmFibGVRdWVyeTogZ2xvYmFsUXVlcnksXG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ1JldGVudGlvblBvbGljeV9NYXhBZ2VfQ2hhbm5lbHMnLCAzMCwge1xuXHRcdFx0dHlwZTogJ2ludCcsXG5cdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0XHRpMThuTGFiZWw6ICdSZXRlbnRpb25Qb2xpY3lfTWF4QWdlX0NoYW5uZWxzJyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ1JldGVudGlvblBvbGljeV9NYXhBZ2VfRGVzY3JpcHRpb24nLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IFt7XG5cdFx0XHRcdF9pZDogJ1JldGVudGlvblBvbGljeV9BcHBsaWVzVG9DaGFubmVscycsXG5cdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0fSwgZ2xvYmFsUXVlcnldLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hZGQoJ1JldGVudGlvblBvbGljeV9BcHBsaWVzVG9Hcm91cHMnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0aTE4bkxhYmVsOiAnUmV0ZW50aW9uUG9saWN5X0FwcGxpZXNUb0dyb3VwcycsXG5cdFx0XHRlbmFibGVRdWVyeTogZ2xvYmFsUXVlcnksXG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ1JldGVudGlvblBvbGljeV9NYXhBZ2VfR3JvdXBzJywgMzAsIHtcblx0XHRcdHR5cGU6ICdpbnQnLFxuXHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0aTE4bkxhYmVsOiAnUmV0ZW50aW9uUG9saWN5X01heEFnZV9Hcm91cHMnLFxuXHRcdFx0aTE4bkRlc2NyaXB0aW9uOiAnUmV0ZW50aW9uUG9saWN5X01heEFnZV9EZXNjcmlwdGlvbicsXG5cdFx0XHRlbmFibGVRdWVyeTogW3tcblx0XHRcdFx0X2lkOiAnUmV0ZW50aW9uUG9saWN5X0FwcGxpZXNUb0dyb3VwcycsXG5cdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0fSwgZ2xvYmFsUXVlcnldLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hZGQoJ1JldGVudGlvblBvbGljeV9BcHBsaWVzVG9ETXMnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0aTE4bkxhYmVsOiAnUmV0ZW50aW9uUG9saWN5X0FwcGxpZXNUb0RNcycsXG5cdFx0XHRlbmFibGVRdWVyeTogZ2xvYmFsUXVlcnksXG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ1JldGVudGlvblBvbGljeV9NYXhBZ2VfRE1zJywgMzAsIHtcblx0XHRcdHR5cGU6ICdpbnQnLFxuXHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0aTE4bkxhYmVsOiAnUmV0ZW50aW9uUG9saWN5X01heEFnZV9ETXMnLFxuXHRcdFx0aTE4bkRlc2NyaXB0aW9uOiAnUmV0ZW50aW9uUG9saWN5X01heEFnZV9EZXNjcmlwdGlvbicsXG5cdFx0XHRlbmFibGVRdWVyeTogW3tcblx0XHRcdFx0X2lkOiAnUmV0ZW50aW9uUG9saWN5X0FwcGxpZXNUb0RNcycsXG5cdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0fSwgZ2xvYmFsUXVlcnldLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hZGQoJ1JldGVudGlvblBvbGljeV9FeGNsdWRlUGlubmVkJywgZmFsc2UsIHtcblx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdGkxOG5MYWJlbDogJ1JldGVudGlvblBvbGljeV9FeGNsdWRlUGlubmVkJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiBnbG9iYWxRdWVyeSxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnUmV0ZW50aW9uUG9saWN5X0ZpbGVzT25seScsIGZhbHNlLCB7XG5cdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0XHRpMThuTGFiZWw6ICdSZXRlbnRpb25Qb2xpY3lfRmlsZXNPbmx5Jyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ1JldGVudGlvblBvbGljeV9GaWxlc09ubHlfRGVzY3JpcHRpb24nLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IGdsb2JhbFF1ZXJ5LFxuXHRcdH0pO1xuXHR9KTtcbn0pO1xuIiwiLyogZ2xvYmFscyBTeW5jZWRDcm9uICovXG5cbmxldCB0eXBlcyA9IFtdO1xuXG5jb25zdCBvbGRlc3QgPSBuZXcgRGF0ZSgnMDAwMS0wMS0wMVQwMDowMDowMFonKTtcblxubGV0IGxhc3RQcnVuZSA9IG9sZGVzdDtcblxuY29uc3QgbWF4VGltZXMgPSB7XG5cdGM6IDAsXG5cdHA6IDAsXG5cdGQ6IDAsXG59O1xuY29uc3QgdG9EYXlzID0gMTAwMCAqIDYwICogNjAgKiAyNDtcbmNvbnN0IGdyYWNlUGVyaW9kID0gNTAwMDtcbmZ1bmN0aW9uIGpvYigpIHtcblx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcblx0Y29uc3QgZmlsZXNPbmx5ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1JldGVudGlvblBvbGljeV9GaWxlc09ubHknKTtcblx0Y29uc3QgZXhjbHVkZVBpbm5lZCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdSZXRlbnRpb25Qb2xpY3lfRXhjbHVkZVBpbm5lZCcpO1xuXG5cdC8vIGdldCBhbGwgcm9vbXMgd2l0aCBkZWZhdWx0IHZhbHVlc1xuXHR0eXBlcy5mb3JFYWNoKCh0eXBlKSA9PiB7XG5cdFx0Y29uc3QgbWF4QWdlID0gbWF4VGltZXNbdHlwZV0gfHwgMDtcblx0XHRjb25zdCBsYXRlc3QgPSBuZXcgRGF0ZShub3cuZ2V0VGltZSgpIC0gbWF4QWdlICogdG9EYXlzKTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmQoe1xuXHRcdFx0dDogdHlwZSxcblx0XHRcdF91cGRhdGVkQXQ6IHsgJGd0ZTogbGFzdFBydW5lIH0sXG5cdFx0XHQkb3I6IFt7ICdyZXRlbnRpb24uZW5hYmxlZCc6IHsgJGVxOiB0cnVlIH0gfSwgeyAncmV0ZW50aW9uLmVuYWJsZWQnOiB7ICRleGlzdHM6IGZhbHNlIH0gfV0sXG5cdFx0XHQncmV0ZW50aW9uLm92ZXJyaWRlR2xvYmFsJzogeyAkbmU6IHRydWUgfSxcblx0XHR9KS5mb3JFYWNoKCh7IF9pZDogcmlkIH0pID0+IHtcblx0XHRcdFJvY2tldENoYXQuY2xlYW5Sb29tSGlzdG9yeSh7IHJpZCwgbGF0ZXN0LCBvbGRlc3QsIGZpbGVzT25seSwgZXhjbHVkZVBpbm5lZCB9KTtcblx0XHR9KTtcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZCh7XG5cdFx0J3JldGVudGlvbi5lbmFibGVkJzogeyAkZXE6IHRydWUgfSxcblx0XHQncmV0ZW50aW9uLm92ZXJyaWRlR2xvYmFsJzogeyAkZXE6IHRydWUgfSxcblx0XHQncmV0ZW50aW9uLm1heEFnZSc6IHsgJGd0ZTogMCB9LFxuXHRcdF91cGRhdGVkQXQ6IHsgJGd0ZTogbGFzdFBydW5lIH0sXG5cdH0pLmZvckVhY2goKHJvb20pID0+IHtcblx0XHRjb25zdCB7IG1heEFnZSA9IDMwLCBmaWxlc09ubHksIGV4Y2x1ZGVQaW5uZWQgfSA9IHJvb20ucmV0ZW50aW9uO1xuXHRcdGNvbnN0IGxhdGVzdCA9IG5ldyBEYXRlKG5vdy5nZXRUaW1lKCkgLSBtYXhBZ2UgKiB0b0RheXMpO1xuXHRcdFJvY2tldENoYXQuY2xlYW5Sb29tSGlzdG9yeSh7IHJpZDogcm9vbS5faWQsIGxhdGVzdCwgb2xkZXN0LCBmaWxlc09ubHksIGV4Y2x1ZGVQaW5uZWQgfSk7XG5cdH0pO1xuXHRsYXN0UHJ1bmUgPSBuZXcgRGF0ZShub3cuZ2V0VGltZSgpIC0gZ3JhY2VQZXJpb2QpO1xufVxuXG5mdW5jdGlvbiBnZXRTY2hlZHVsZShwcmVjaXNpb24pIHtcblx0c3dpdGNoIChwcmVjaXNpb24pIHtcblx0XHRjYXNlICcwJzpcblx0XHRcdHJldHVybiAnMCAqLzMwICogKiAqIConO1xuXHRcdGNhc2UgJzEnOlxuXHRcdFx0cmV0dXJuICcwIDAgKiAqICogKic7XG5cdFx0Y2FzZSAnMic6XG5cdFx0XHRyZXR1cm4gJzAgMCAqLzYgKiAqIConO1xuXHRcdGNhc2UgJzMnOlxuXHRcdFx0cmV0dXJuICcwIDAgMCAqICogKic7XG5cdH1cbn1cblxuY29uc3QgcHJ1bmVDcm9uTmFtZSA9ICdQcnVuZSBvbGQgbWVzc2FnZXMgYnkgcmV0ZW50aW9uIHBvbGljeSc7XG5cbmZ1bmN0aW9uIGRlcGxveUNyb24ocHJlY2lzaW9uKSB7XG5cdGNvbnN0IHNjaGVkdWxlID0gKHBhcnNlcikgPT4gcGFyc2VyLmNyb24oZ2V0U2NoZWR1bGUocHJlY2lzaW9uKSwgdHJ1ZSk7XG5cblx0U3luY2VkQ3Jvbi5yZW1vdmUocHJ1bmVDcm9uTmFtZSk7XG5cdFN5bmNlZENyb24uYWRkKHtcblx0XHRuYW1lOiBwcnVuZUNyb25OYW1lLFxuXHRcdHNjaGVkdWxlLFxuXHRcdGpvYixcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHJlbG9hZFBvbGljeSgpIHtcblx0dHlwZXMgPSBbXTtcblxuXHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1JldGVudGlvblBvbGljeV9FbmFibGVkJykpIHtcblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1JldGVudGlvblBvbGljeV9BcHBsaWVzVG9DaGFubmVscycpKSB7XG5cdFx0XHR0eXBlcy5wdXNoKCdjJyk7XG5cdFx0fVxuXG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdSZXRlbnRpb25Qb2xpY3lfQXBwbGllc1RvR3JvdXBzJykpIHtcblx0XHRcdHR5cGVzLnB1c2goJ3AnKTtcblx0XHR9XG5cblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1JldGVudGlvblBvbGljeV9BcHBsaWVzVG9ETXMnKSkge1xuXHRcdFx0dHlwZXMucHVzaCgnZCcpO1xuXHRcdH1cblxuXHRcdG1heFRpbWVzLmMgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnUmV0ZW50aW9uUG9saWN5X01heEFnZV9DaGFubmVscycpO1xuXHRcdG1heFRpbWVzLnAgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnUmV0ZW50aW9uUG9saWN5X01heEFnZV9Hcm91cHMnKTtcblx0XHRtYXhUaW1lcy5kID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1JldGVudGlvblBvbGljeV9NYXhBZ2VfRE1zJyk7XG5cblx0XHRyZXR1cm4gZGVwbG95Q3JvbihSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnUmV0ZW50aW9uUG9saWN5X1ByZWNpc2lvbicpKTtcblx0fVxuXHRyZXR1cm4gU3luY2VkQ3Jvbi5yZW1vdmUocHJ1bmVDcm9uTmFtZSk7XG59XG5cbk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRNZXRlb3IuZGVmZXIoZnVuY3Rpb24oKSB7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZCh7XG5cdFx0XHRfaWQ6IHtcblx0XHRcdFx0JGluOiBbXG5cdFx0XHRcdFx0J1JldGVudGlvblBvbGljeV9FbmFibGVkJyxcblx0XHRcdFx0XHQnUmV0ZW50aW9uUG9saWN5X1ByZWNpc2lvbicsXG5cdFx0XHRcdFx0J1JldGVudGlvblBvbGljeV9BcHBsaWVzVG9DaGFubmVscycsXG5cdFx0XHRcdFx0J1JldGVudGlvblBvbGljeV9BcHBsaWVzVG9Hcm91cHMnLFxuXHRcdFx0XHRcdCdSZXRlbnRpb25Qb2xpY3lfQXBwbGllc1RvRE1zJyxcblx0XHRcdFx0XHQnUmV0ZW50aW9uUG9saWN5X01heEFnZV9DaGFubmVscycsXG5cdFx0XHRcdFx0J1JldGVudGlvblBvbGljeV9NYXhBZ2VfR3JvdXBzJyxcblx0XHRcdFx0XHQnUmV0ZW50aW9uUG9saWN5X01heEFnZV9ETXMnLFxuXHRcdFx0XHRdLFxuXHRcdFx0fSxcblx0XHR9KS5vYnNlcnZlKHtcblx0XHRcdGNoYW5nZWQoKSB7XG5cdFx0XHRcdHJlbG9hZFBvbGljeSgpO1xuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdHJlbG9hZFBvbGljeSgpO1xuXHR9KTtcbn0pO1xuIl19
