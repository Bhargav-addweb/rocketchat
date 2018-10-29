(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:push-notifications":{"server":{"methods":{"saveNotificationSettings.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/rocketchat_push-notifications/server/methods/saveNotificationSettings.js                          //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
Meteor.methods({
  saveNotificationSettings(roomId, field, value) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'saveNotificationSettings'
      });
    }

    check(roomId, String);
    check(field, String);
    check(value, String);
    const notifications = {
      audioNotifications: {
        updateMethod: (subscription, value) => RocketChat.models.Subscriptions.updateAudioNotificationsById(subscription._id, value)
      },
      desktopNotifications: {
        updateMethod: (subscription, value) => {
          if (value === 'default') {
            const userPref = RocketChat.getUserNotificationPreference(Meteor.userId(), 'desktop');
            RocketChat.models.Subscriptions.updateDesktopNotificationsById(subscription._id, userPref.origin === 'server' ? null : userPref);
          } else {
            RocketChat.models.Subscriptions.updateDesktopNotificationsById(subscription._id, {
              value,
              origin: 'subscription'
            });
          }
        }
      },
      mobilePushNotifications: {
        updateMethod: (subscription, value) => {
          if (value === 'default') {
            const userPref = RocketChat.getUserNotificationPreference(Meteor.userId(), 'mobile');
            RocketChat.models.Subscriptions.updateMobilePushNotificationsById(subscription._id, userPref.origin === 'server' ? null : userPref);
          } else {
            RocketChat.models.Subscriptions.updateMobilePushNotificationsById(subscription._id, {
              value,
              origin: 'subscription'
            });
          }
        }
      },
      emailNotifications: {
        updateMethod: (subscription, value) => {
          if (value === 'default') {
            const userPref = RocketChat.getUserNotificationPreference(Meteor.userId(), 'email');
            RocketChat.models.Subscriptions.updateEmailNotificationsById(subscription._id, userPref.origin === 'server' ? null : userPref);
          } else {
            RocketChat.models.Subscriptions.updateEmailNotificationsById(subscription._id, {
              value,
              origin: 'subscription'
            });
          }
        }
      },
      unreadAlert: {
        updateMethod: (subscription, value) => RocketChat.models.Subscriptions.updateUnreadAlertById(subscription._id, value)
      },
      disableNotifications: {
        updateMethod: (subscription, value) => RocketChat.models.Subscriptions.updateDisableNotificationsById(subscription._id, value === '1')
      },
      hideUnreadStatus: {
        updateMethod: (subscription, value) => RocketChat.models.Subscriptions.updateHideUnreadStatusById(subscription._id, value === '1')
      },
      muteGroupMentions: {
        updateMethod: (subscription, value) => RocketChat.models.Subscriptions.updateMuteGroupMentions(subscription._id, value === '1')
      },
      desktopNotificationDuration: {
        updateMethod: (subscription, value) => RocketChat.models.Subscriptions.updateDesktopNotificationDurationById(subscription._id, value)
      },
      audioNotificationValue: {
        updateMethod: (subscription, value) => RocketChat.models.Subscriptions.updateAudioNotificationValueById(subscription._id, value)
      }
    };
    const isInvalidNotification = !Object.keys(notifications).includes(field);
    const basicValuesForNotifications = ['all', 'mentions', 'nothing', 'default'];
    const fieldsMustHaveBasicValues = ['emailNotifications', 'audioNotifications', 'mobilePushNotifications', 'desktopNotifications'];

    if (isInvalidNotification) {
      throw new Meteor.Error('error-invalid-settings', 'Invalid settings field', {
        method: 'saveNotificationSettings'
      });
    }

    if (fieldsMustHaveBasicValues.includes(field) && !basicValuesForNotifications.includes(value)) {
      throw new Meteor.Error('error-invalid-settings', 'Invalid settings value', {
        method: 'saveNotificationSettings'
      });
    }

    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(roomId, Meteor.userId());

    if (!subscription) {
      throw new Meteor.Error('error-invalid-subscription', 'Invalid subscription', {
        method: 'saveNotificationSettings'
      });
    }

    notifications[field].updateMethod(subscription, value);
    return true;
  },

  saveAudioNotificationValue(rid, value) {
    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(rid, Meteor.userId());

    if (!subscription) {
      throw new Meteor.Error('error-invalid-subscription', 'Invalid subscription', {
        method: 'saveAudioNotificationValue'
      });
    }

    RocketChat.models.Subscriptions.updateAudioNotificationValueById(subscription._id, value);
    return true;
  },

  saveDesktopNotificationDuration(rid, value) {
    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(rid, Meteor.userId());

    if (!subscription) {
      throw new Meteor.Error('error-invalid-subscription', 'Invalid subscription', {
        method: 'saveDesktopNotificationDuration'
      });
    }

    RocketChat.models.Subscriptions.updateDesktopNotificationDurationById(subscription._id, value);
    return true;
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"models":{"Subscriptions.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/rocketchat_push-notifications/server/models/Subscriptions.js                                      //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
RocketChat.models.Subscriptions.updateAudioNotificationsById = function (_id, audioNotifications) {
  const query = {
    _id
  };
  const update = {};

  if (audioNotifications === 'default') {
    update.$unset = {
      audioNotifications: 1
    };
  } else {
    update.$set = {
      audioNotifications
    };
  }

  return this.update(query, update);
};

RocketChat.models.Subscriptions.updateAudioNotificationValueById = function (_id, audioNotificationValue) {
  const query = {
    _id
  };
  const update = {
    $set: {
      audioNotificationValue
    }
  };
  return this.update(query, update);
};

RocketChat.models.Subscriptions.updateDesktopNotificationsById = function (_id, desktopNotifications) {
  const query = {
    _id
  };
  const update = {};

  if (desktopNotifications === null) {
    update.$unset = {
      desktopNotifications: 1,
      desktopPrefOrigin: 1
    };
  } else {
    update.$set = {
      desktopNotifications: desktopNotifications.value,
      desktopPrefOrigin: desktopNotifications.origin
    };
  }

  return this.update(query, update);
};

RocketChat.models.Subscriptions.updateDesktopNotificationDurationById = function (_id, value) {
  const query = {
    _id
  };
  const update = {
    $set: {
      desktopNotificationDuration: parseInt(value)
    }
  };
  return this.update(query, update);
};

RocketChat.models.Subscriptions.updateMobilePushNotificationsById = function (_id, mobilePushNotifications) {
  const query = {
    _id
  };
  const update = {};

  if (mobilePushNotifications === null) {
    update.$unset = {
      mobilePushNotifications: 1,
      mobilePrefOrigin: 1
    };
  } else {
    update.$set = {
      mobilePushNotifications: mobilePushNotifications.value,
      mobilePrefOrigin: mobilePushNotifications.origin
    };
  }

  return this.update(query, update);
};

RocketChat.models.Subscriptions.updateEmailNotificationsById = function (_id, emailNotifications) {
  const query = {
    _id
  };
  const update = {};

  if (emailNotifications === null) {
    update.$unset = {
      emailNotifications: 1,
      emailPrefOrigin: 1
    };
  } else {
    update.$set = {
      emailNotifications: emailNotifications.value,
      emailPrefOrigin: emailNotifications.origin
    };
  }

  return this.update(query, update);
};

RocketChat.models.Subscriptions.updateUnreadAlertById = function (_id, unreadAlert) {
  const query = {
    _id
  };
  const update = {
    $set: {
      unreadAlert
    }
  };
  return this.update(query, update);
};

RocketChat.models.Subscriptions.updateDisableNotificationsById = function (_id, disableNotifications) {
  const query = {
    _id
  };
  const update = {
    $set: {
      disableNotifications
    }
  };
  return this.update(query, update);
};

RocketChat.models.Subscriptions.updateHideUnreadStatusById = function (_id, hideUnreadStatus) {
  const query = {
    _id
  };
  const update = {
    $set: {
      hideUnreadStatus
    }
  };
  return this.update(query, update);
};

RocketChat.models.Subscriptions.updateMuteGroupMentions = function (_id, muteGroupMentions) {
  const query = {
    _id
  };
  const update = {
    $set: {
      muteGroupMentions
    }
  };
  return this.update(query, update);
};

RocketChat.models.Subscriptions.findAlwaysNotifyAudioUsersByRoomId = function (roomId) {
  const query = {
    rid: roomId,
    audioNotifications: 'all'
  };
  return this.find(query);
};

RocketChat.models.Subscriptions.findAlwaysNotifyDesktopUsersByRoomId = function (roomId) {
  const query = {
    rid: roomId,
    desktopNotifications: 'all'
  };
  return this.find(query);
};

RocketChat.models.Subscriptions.findDontNotifyDesktopUsersByRoomId = function (roomId) {
  const query = {
    rid: roomId,
    desktopNotifications: 'nothing'
  };
  return this.find(query);
};

RocketChat.models.Subscriptions.findAlwaysNotifyMobileUsersByRoomId = function (roomId) {
  const query = {
    rid: roomId,
    mobilePushNotifications: 'all'
  };
  return this.find(query);
};

RocketChat.models.Subscriptions.findDontNotifyMobileUsersByRoomId = function (roomId) {
  const query = {
    rid: roomId,
    mobilePushNotifications: 'nothing'
  };
  return this.find(query);
};

RocketChat.models.Subscriptions.findWithSendEmailByRoomId = function (roomId) {
  const query = {
    rid: roomId,
    emailNotifications: {
      $exists: true
    }
  };
  return this.find(query, {
    fields: {
      emailNotifications: 1,
      u: 1
    }
  });
};

RocketChat.models.Subscriptions.findNotificationPreferencesByRoom = function (query
/* { roomId: rid, desktopFilter: desktopNotifications, mobileFilter: mobilePushNotifications, emailFilter: emailNotifications }*/
) {
  return this._db.find(query, {
    fields: {
      // fields needed for notifications
      rid: 1,
      t: 1,
      u: 1,
      name: 1,
      fname: 1,
      code: 1,
      // fields to define if should send a notification
      ignored: 1,
      audioNotifications: 1,
      audioNotificationValue: 1,
      desktopNotificationDuration: 1,
      desktopNotifications: 1,
      mobilePushNotifications: 1,
      emailNotifications: 1,
      disableNotifications: 1,
      muteGroupMentions: 1,
      userHighlights: 1
    }
  });
};

RocketChat.models.Subscriptions.findAllMessagesNotificationPreferencesByRoom = function (roomId) {
  const query = {
    rid: roomId,
    'u._id': {
      $exists: true
    },
    $or: [{
      desktopNotifications: {
        $in: ['all', 'mentions']
      }
    }, {
      mobilePushNotifications: {
        $in: ['all', 'mentions']
      }
    }, {
      emailNotifications: {
        $in: ['all', 'mentions']
      }
    }]
  };
  return this._db.find(query, {
    fields: {
      'u._id': 1,
      audioNotifications: 1,
      audioNotificationValue: 1,
      desktopNotificationDuration: 1,
      desktopNotifications: 1,
      mobilePushNotifications: 1,
      emailNotifications: 1,
      disableNotifications: 1,
      muteGroupMentions: 1
    }
  });
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:push-notifications/server/methods/saveNotificationSettings.js");
require("/node_modules/meteor/rocketchat:push-notifications/server/models/Subscriptions.js");

/* Exports */
Package._define("rocketchat:push-notifications");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_push-notifications.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpwdXNoLW5vdGlmaWNhdGlvbnMvc2VydmVyL21ldGhvZHMvc2F2ZU5vdGlmaWNhdGlvblNldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnB1c2gtbm90aWZpY2F0aW9ucy9zZXJ2ZXIvbW9kZWxzL1N1YnNjcmlwdGlvbnMuanMiXSwibmFtZXMiOlsiTWV0ZW9yIiwibWV0aG9kcyIsInNhdmVOb3RpZmljYXRpb25TZXR0aW5ncyIsInJvb21JZCIsImZpZWxkIiwidmFsdWUiLCJ1c2VySWQiLCJFcnJvciIsIm1ldGhvZCIsImNoZWNrIiwiU3RyaW5nIiwibm90aWZpY2F0aW9ucyIsImF1ZGlvTm90aWZpY2F0aW9ucyIsInVwZGF0ZU1ldGhvZCIsInN1YnNjcmlwdGlvbiIsIlJvY2tldENoYXQiLCJtb2RlbHMiLCJTdWJzY3JpcHRpb25zIiwidXBkYXRlQXVkaW9Ob3RpZmljYXRpb25zQnlJZCIsIl9pZCIsImRlc2t0b3BOb3RpZmljYXRpb25zIiwidXNlclByZWYiLCJnZXRVc2VyTm90aWZpY2F0aW9uUHJlZmVyZW5jZSIsInVwZGF0ZURlc2t0b3BOb3RpZmljYXRpb25zQnlJZCIsIm9yaWdpbiIsIm1vYmlsZVB1c2hOb3RpZmljYXRpb25zIiwidXBkYXRlTW9iaWxlUHVzaE5vdGlmaWNhdGlvbnNCeUlkIiwiZW1haWxOb3RpZmljYXRpb25zIiwidXBkYXRlRW1haWxOb3RpZmljYXRpb25zQnlJZCIsInVucmVhZEFsZXJ0IiwidXBkYXRlVW5yZWFkQWxlcnRCeUlkIiwiZGlzYWJsZU5vdGlmaWNhdGlvbnMiLCJ1cGRhdGVEaXNhYmxlTm90aWZpY2F0aW9uc0J5SWQiLCJoaWRlVW5yZWFkU3RhdHVzIiwidXBkYXRlSGlkZVVucmVhZFN0YXR1c0J5SWQiLCJtdXRlR3JvdXBNZW50aW9ucyIsInVwZGF0ZU11dGVHcm91cE1lbnRpb25zIiwiZGVza3RvcE5vdGlmaWNhdGlvbkR1cmF0aW9uIiwidXBkYXRlRGVza3RvcE5vdGlmaWNhdGlvbkR1cmF0aW9uQnlJZCIsImF1ZGlvTm90aWZpY2F0aW9uVmFsdWUiLCJ1cGRhdGVBdWRpb05vdGlmaWNhdGlvblZhbHVlQnlJZCIsImlzSW52YWxpZE5vdGlmaWNhdGlvbiIsIk9iamVjdCIsImtleXMiLCJpbmNsdWRlcyIsImJhc2ljVmFsdWVzRm9yTm90aWZpY2F0aW9ucyIsImZpZWxkc011c3RIYXZlQmFzaWNWYWx1ZXMiLCJmaW5kT25lQnlSb29tSWRBbmRVc2VySWQiLCJzYXZlQXVkaW9Ob3RpZmljYXRpb25WYWx1ZSIsInJpZCIsInNhdmVEZXNrdG9wTm90aWZpY2F0aW9uRHVyYXRpb24iLCJxdWVyeSIsInVwZGF0ZSIsIiR1bnNldCIsIiRzZXQiLCJkZXNrdG9wUHJlZk9yaWdpbiIsInBhcnNlSW50IiwibW9iaWxlUHJlZk9yaWdpbiIsImVtYWlsUHJlZk9yaWdpbiIsImZpbmRBbHdheXNOb3RpZnlBdWRpb1VzZXJzQnlSb29tSWQiLCJmaW5kIiwiZmluZEFsd2F5c05vdGlmeURlc2t0b3BVc2Vyc0J5Um9vbUlkIiwiZmluZERvbnROb3RpZnlEZXNrdG9wVXNlcnNCeVJvb21JZCIsImZpbmRBbHdheXNOb3RpZnlNb2JpbGVVc2Vyc0J5Um9vbUlkIiwiZmluZERvbnROb3RpZnlNb2JpbGVVc2Vyc0J5Um9vbUlkIiwiZmluZFdpdGhTZW5kRW1haWxCeVJvb21JZCIsIiRleGlzdHMiLCJmaWVsZHMiLCJ1IiwiZmluZE5vdGlmaWNhdGlvblByZWZlcmVuY2VzQnlSb29tIiwiX2RiIiwidCIsIm5hbWUiLCJmbmFtZSIsImNvZGUiLCJpZ25vcmVkIiwidXNlckhpZ2hsaWdodHMiLCJmaW5kQWxsTWVzc2FnZXNOb3RpZmljYXRpb25QcmVmZXJlbmNlc0J5Um9vbSIsIiRvciIsIiRpbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxPQUFPQyxPQUFQLENBQWU7QUFDZEMsMkJBQXlCQyxNQUF6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QTNCLEtBRkksRUFHSjtBQUFFcEQsMEJBQW9CO0FBQUVvRCxhQUFLLENBQUMsS0FBRCxFQUFRLFVBQVI7QUFBUDtBQUF0QixLQUhJO0FBSFEsR0FBZDtBQVVBLFNBQU8sS0FBS1QsR0FBTCxDQUFTVixJQUFULENBQWNULEtBQWQsRUFBcUI7QUFDM0JnQixZQUFRO0FBQ1AsZUFBUyxDQURGO0FBRVB2RCwwQkFBb0IsQ0FGYjtBQUdQMkIsOEJBQXdCLENBSGpCO0FBSVBGLG1DQUE2QixDQUp0QjtBQUtQakIsNEJBQXNCLENBTGY7QUFNUEssK0JBQXlCLENBTmxCO0FBT1BFLDBCQUFvQixDQVBiO0FBUVBJLDRCQUFzQixDQVJmO0FBU1BJLHlCQUFtQjtBQVRaO0FBRG1CLEdBQXJCLENBQVA7QUFhQSxDQXhCRCxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X3B1c2gtbm90aWZpY2F0aW9ucy5qcyIsInNvdXJjZXNDb250ZW50IjpbIk1ldGVvci5tZXRob2RzKHtcblx0c2F2ZU5vdGlmaWNhdGlvblNldHRpbmdzKHJvb21JZCwgZmllbGQsIHZhbHVlKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ3NhdmVOb3RpZmljYXRpb25TZXR0aW5ncycgfSk7XG5cdFx0fVxuXHRcdGNoZWNrKHJvb21JZCwgU3RyaW5nKTtcblx0XHRjaGVjayhmaWVsZCwgU3RyaW5nKTtcblx0XHRjaGVjayh2YWx1ZSwgU3RyaW5nKTtcblxuXHRcdGNvbnN0IG5vdGlmaWNhdGlvbnMgPSB7XG5cdFx0XHRhdWRpb05vdGlmaWNhdGlvbnM6IHtcblx0XHRcdFx0dXBkYXRlTWV0aG9kOiAoc3Vic2NyaXB0aW9uLCB2YWx1ZSkgPT4gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVBdWRpb05vdGlmaWNhdGlvbnNCeUlkKHN1YnNjcmlwdGlvbi5faWQsIHZhbHVlKSxcblx0XHRcdH0sXG5cdFx0XHRkZXNrdG9wTm90aWZpY2F0aW9uczoge1xuXHRcdFx0XHR1cGRhdGVNZXRob2Q6IChzdWJzY3JpcHRpb24sIHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0aWYgKHZhbHVlID09PSAnZGVmYXVsdCcpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHVzZXJQcmVmID0gUm9ja2V0Q2hhdC5nZXRVc2VyTm90aWZpY2F0aW9uUHJlZmVyZW5jZShNZXRlb3IudXNlcklkKCksICdkZXNrdG9wJyk7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZURlc2t0b3BOb3RpZmljYXRpb25zQnlJZChzdWJzY3JpcHRpb24uX2lkLCB1c2VyUHJlZi5vcmlnaW4gPT09ICdzZXJ2ZXInID8gbnVsbCA6IHVzZXJQcmVmKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVEZXNrdG9wTm90aWZpY2F0aW9uc0J5SWQoc3Vic2NyaXB0aW9uLl9pZCwgeyB2YWx1ZSwgb3JpZ2luOiAnc3Vic2NyaXB0aW9uJyB9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0bW9iaWxlUHVzaE5vdGlmaWNhdGlvbnM6IHtcblx0XHRcdFx0dXBkYXRlTWV0aG9kOiAoc3Vic2NyaXB0aW9uLCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGlmICh2YWx1ZSA9PT0gJ2RlZmF1bHQnKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB1c2VyUHJlZiA9IFJvY2tldENoYXQuZ2V0VXNlck5vdGlmaWNhdGlvblByZWZlcmVuY2UoTWV0ZW9yLnVzZXJJZCgpLCAnbW9iaWxlJyk7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZU1vYmlsZVB1c2hOb3RpZmljYXRpb25zQnlJZChzdWJzY3JpcHRpb24uX2lkLCB1c2VyUHJlZi5vcmlnaW4gPT09ICdzZXJ2ZXInID8gbnVsbCA6IHVzZXJQcmVmKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVNb2JpbGVQdXNoTm90aWZpY2F0aW9uc0J5SWQoc3Vic2NyaXB0aW9uLl9pZCwgeyB2YWx1ZSwgb3JpZ2luOiAnc3Vic2NyaXB0aW9uJyB9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0ZW1haWxOb3RpZmljYXRpb25zOiB7XG5cdFx0XHRcdHVwZGF0ZU1ldGhvZDogKHN1YnNjcmlwdGlvbiwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRpZiAodmFsdWUgPT09ICdkZWZhdWx0Jykge1xuXHRcdFx0XHRcdFx0Y29uc3QgdXNlclByZWYgPSBSb2NrZXRDaGF0LmdldFVzZXJOb3RpZmljYXRpb25QcmVmZXJlbmNlKE1ldGVvci51c2VySWQoKSwgJ2VtYWlsJyk7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZUVtYWlsTm90aWZpY2F0aW9uc0J5SWQoc3Vic2NyaXB0aW9uLl9pZCwgdXNlclByZWYub3JpZ2luID09PSAnc2VydmVyJyA/IG51bGwgOiB1c2VyUHJlZik7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBkYXRlRW1haWxOb3RpZmljYXRpb25zQnlJZChzdWJzY3JpcHRpb24uX2lkLCB7IHZhbHVlLCBvcmlnaW46ICdzdWJzY3JpcHRpb24nIH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHR1bnJlYWRBbGVydDoge1xuXHRcdFx0XHR1cGRhdGVNZXRob2Q6IChzdWJzY3JpcHRpb24sIHZhbHVlKSA9PiBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZVVucmVhZEFsZXJ0QnlJZChzdWJzY3JpcHRpb24uX2lkLCB2YWx1ZSksXG5cdFx0XHR9LFxuXHRcdFx0ZGlzYWJsZU5vdGlmaWNhdGlvbnM6IHtcblx0XHRcdFx0dXBkYXRlTWV0aG9kOiAoc3Vic2NyaXB0aW9uLCB2YWx1ZSkgPT4gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVEaXNhYmxlTm90aWZpY2F0aW9uc0J5SWQoc3Vic2NyaXB0aW9uLl9pZCwgdmFsdWUgPT09ICcxJyksXG5cdFx0XHR9LFxuXHRcdFx0aGlkZVVucmVhZFN0YXR1czoge1xuXHRcdFx0XHR1cGRhdGVNZXRob2Q6IChzdWJzY3JpcHRpb24sIHZhbHVlKSA9PiBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZUhpZGVVbnJlYWRTdGF0dXNCeUlkKHN1YnNjcmlwdGlvbi5faWQsIHZhbHVlID09PSAnMScpLFxuXHRcdFx0fSxcblx0XHRcdG11dGVHcm91cE1lbnRpb25zOiB7XG5cdFx0XHRcdHVwZGF0ZU1ldGhvZDogKHN1YnNjcmlwdGlvbiwgdmFsdWUpID0+IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBkYXRlTXV0ZUdyb3VwTWVudGlvbnMoc3Vic2NyaXB0aW9uLl9pZCwgdmFsdWUgPT09ICcxJyksXG5cdFx0XHR9LFxuXHRcdFx0ZGVza3RvcE5vdGlmaWNhdGlvbkR1cmF0aW9uOiB7XG5cdFx0XHRcdHVwZGF0ZU1ldGhvZDogKHN1YnNjcmlwdGlvbiwgdmFsdWUpID0+IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBkYXRlRGVza3RvcE5vdGlmaWNhdGlvbkR1cmF0aW9uQnlJZChzdWJzY3JpcHRpb24uX2lkLCB2YWx1ZSksXG5cdFx0XHR9LFxuXHRcdFx0YXVkaW9Ob3RpZmljYXRpb25WYWx1ZToge1xuXHRcdFx0XHR1cGRhdGVNZXRob2Q6IChzdWJzY3JpcHRpb24sIHZhbHVlKSA9PiBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZUF1ZGlvTm90aWZpY2F0aW9uVmFsdWVCeUlkKHN1YnNjcmlwdGlvbi5faWQsIHZhbHVlKSxcblx0XHRcdH0sXG5cdFx0fTtcblx0XHRjb25zdCBpc0ludmFsaWROb3RpZmljYXRpb24gPSAhT2JqZWN0LmtleXMobm90aWZpY2F0aW9ucykuaW5jbHVkZXMoZmllbGQpO1xuXHRcdGNvbnN0IGJhc2ljVmFsdWVzRm9yTm90aWZpY2F0aW9ucyA9IFsnYWxsJywgJ21lbnRpb25zJywgJ25vdGhpbmcnLCAnZGVmYXVsdCddO1xuXHRcdGNvbnN0IGZpZWxkc011c3RIYXZlQmFzaWNWYWx1ZXMgPSBbJ2VtYWlsTm90aWZpY2F0aW9ucycsICdhdWRpb05vdGlmaWNhdGlvbnMnLCAnbW9iaWxlUHVzaE5vdGlmaWNhdGlvbnMnLCAnZGVza3RvcE5vdGlmaWNhdGlvbnMnXTtcblxuXHRcdGlmIChpc0ludmFsaWROb3RpZmljYXRpb24pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtc2V0dGluZ3MnLCAnSW52YWxpZCBzZXR0aW5ncyBmaWVsZCcsIHsgbWV0aG9kOiAnc2F2ZU5vdGlmaWNhdGlvblNldHRpbmdzJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoZmllbGRzTXVzdEhhdmVCYXNpY1ZhbHVlcy5pbmNsdWRlcyhmaWVsZCkgJiYgIWJhc2ljVmFsdWVzRm9yTm90aWZpY2F0aW9ucy5pbmNsdWRlcyh2YWx1ZSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtc2V0dGluZ3MnLCAnSW52YWxpZCBzZXR0aW5ncyB2YWx1ZScsIHsgbWV0aG9kOiAnc2F2ZU5vdGlmaWNhdGlvblNldHRpbmdzJyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChyb29tSWQsIE1ldGVvci51c2VySWQoKSk7XG5cdFx0aWYgKCFzdWJzY3JpcHRpb24pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtc3Vic2NyaXB0aW9uJywgJ0ludmFsaWQgc3Vic2NyaXB0aW9uJywgeyBtZXRob2Q6ICdzYXZlTm90aWZpY2F0aW9uU2V0dGluZ3MnIH0pO1xuXHRcdH1cblxuXHRcdG5vdGlmaWNhdGlvbnNbZmllbGRdLnVwZGF0ZU1ldGhvZChzdWJzY3JpcHRpb24sIHZhbHVlKTtcblxuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxuXG5cdHNhdmVBdWRpb05vdGlmaWNhdGlvblZhbHVlKHJpZCwgdmFsdWUpIHtcblx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChyaWQsIE1ldGVvci51c2VySWQoKSk7XG5cdFx0aWYgKCFzdWJzY3JpcHRpb24pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtc3Vic2NyaXB0aW9uJywgJ0ludmFsaWQgc3Vic2NyaXB0aW9uJywgeyBtZXRob2Q6ICdzYXZlQXVkaW9Ob3RpZmljYXRpb25WYWx1ZScgfSk7XG5cdFx0fVxuXHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBkYXRlQXVkaW9Ob3RpZmljYXRpb25WYWx1ZUJ5SWQoc3Vic2NyaXB0aW9uLl9pZCwgdmFsdWUpO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxuXG5cdHNhdmVEZXNrdG9wTm90aWZpY2F0aW9uRHVyYXRpb24ocmlkLCB2YWx1ZSkge1xuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbiA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkKHJpZCwgTWV0ZW9yLnVzZXJJZCgpKTtcblx0XHRpZiAoIXN1YnNjcmlwdGlvbikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1zdWJzY3JpcHRpb24nLCAnSW52YWxpZCBzdWJzY3JpcHRpb24nLCB7IG1ldGhvZDogJ3NhdmVEZXNrdG9wTm90aWZpY2F0aW9uRHVyYXRpb24nIH0pO1xuXHRcdH1cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZURlc2t0b3BOb3RpZmljYXRpb25EdXJhdGlvbkJ5SWQoc3Vic2NyaXB0aW9uLl9pZCwgdmFsdWUpO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxufSk7XG4iLCJSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZUF1ZGlvTm90aWZpY2F0aW9uc0J5SWQgPSBmdW5jdGlvbihfaWQsIGF1ZGlvTm90aWZpY2F0aW9ucykge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQsXG5cdH07XG5cblx0Y29uc3QgdXBkYXRlID0ge307XG5cblx0aWYgKGF1ZGlvTm90aWZpY2F0aW9ucyA9PT0gJ2RlZmF1bHQnKSB7XG5cdFx0dXBkYXRlLiR1bnNldCA9IHsgYXVkaW9Ob3RpZmljYXRpb25zOiAxIH07XG5cdH0gZWxzZSB7XG5cdFx0dXBkYXRlLiRzZXQgPSB7IGF1ZGlvTm90aWZpY2F0aW9ucyB9O1xuXHR9XG5cblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVBdWRpb05vdGlmaWNhdGlvblZhbHVlQnlJZCA9IGZ1bmN0aW9uKF9pZCwgYXVkaW9Ob3RpZmljYXRpb25WYWx1ZSkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQsXG5cdH07XG5cblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdGF1ZGlvTm90aWZpY2F0aW9uVmFsdWUsXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZURlc2t0b3BOb3RpZmljYXRpb25zQnlJZCA9IGZ1bmN0aW9uKF9pZCwgZGVza3RvcE5vdGlmaWNhdGlvbnMpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkLFxuXHR9O1xuXG5cdGNvbnN0IHVwZGF0ZSA9IHt9O1xuXG5cdGlmIChkZXNrdG9wTm90aWZpY2F0aW9ucyA9PT0gbnVsbCkge1xuXHRcdHVwZGF0ZS4kdW5zZXQgPSB7XG5cdFx0XHRkZXNrdG9wTm90aWZpY2F0aW9uczogMSxcblx0XHRcdGRlc2t0b3BQcmVmT3JpZ2luOiAxLFxuXHRcdH07XG5cdH0gZWxzZSB7XG5cdFx0dXBkYXRlLiRzZXQgPSB7XG5cdFx0XHRkZXNrdG9wTm90aWZpY2F0aW9uczogZGVza3RvcE5vdGlmaWNhdGlvbnMudmFsdWUsXG5cdFx0XHRkZXNrdG9wUHJlZk9yaWdpbjogZGVza3RvcE5vdGlmaWNhdGlvbnMub3JpZ2luLFxuXHRcdH07XG5cdH1cblxuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZURlc2t0b3BOb3RpZmljYXRpb25EdXJhdGlvbkJ5SWQgPSBmdW5jdGlvbihfaWQsIHZhbHVlKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZCxcblx0fTtcblxuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0ZGVza3RvcE5vdGlmaWNhdGlvbkR1cmF0aW9uOiBwYXJzZUludCh2YWx1ZSksXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZU1vYmlsZVB1c2hOb3RpZmljYXRpb25zQnlJZCA9IGZ1bmN0aW9uKF9pZCwgbW9iaWxlUHVzaE5vdGlmaWNhdGlvbnMpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkLFxuXHR9O1xuXG5cdGNvbnN0IHVwZGF0ZSA9IHt9O1xuXG5cdGlmIChtb2JpbGVQdXNoTm90aWZpY2F0aW9ucyA9PT0gbnVsbCkge1xuXHRcdHVwZGF0ZS4kdW5zZXQgPSB7XG5cdFx0XHRtb2JpbGVQdXNoTm90aWZpY2F0aW9uczogMSxcblx0XHRcdG1vYmlsZVByZWZPcmlnaW46IDEsXG5cdFx0fTtcblx0fSBlbHNlIHtcblx0XHR1cGRhdGUuJHNldCA9IHtcblx0XHRcdG1vYmlsZVB1c2hOb3RpZmljYXRpb25zOiBtb2JpbGVQdXNoTm90aWZpY2F0aW9ucy52YWx1ZSxcblx0XHRcdG1vYmlsZVByZWZPcmlnaW46IG1vYmlsZVB1c2hOb3RpZmljYXRpb25zLm9yaWdpbixcblx0XHR9O1xuXHR9XG5cblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVFbWFpbE5vdGlmaWNhdGlvbnNCeUlkID0gZnVuY3Rpb24oX2lkLCBlbWFpbE5vdGlmaWNhdGlvbnMpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkLFxuXHR9O1xuXG5cdGNvbnN0IHVwZGF0ZSA9IHt9O1xuXG5cdGlmIChlbWFpbE5vdGlmaWNhdGlvbnMgPT09IG51bGwpIHtcblx0XHR1cGRhdGUuJHVuc2V0ID0ge1xuXHRcdFx0ZW1haWxOb3RpZmljYXRpb25zOiAxLFxuXHRcdFx0ZW1haWxQcmVmT3JpZ2luOiAxLFxuXHRcdH07XG5cdH0gZWxzZSB7XG5cdFx0dXBkYXRlLiRzZXQgPSB7XG5cdFx0XHRlbWFpbE5vdGlmaWNhdGlvbnM6IGVtYWlsTm90aWZpY2F0aW9ucy52YWx1ZSxcblx0XHRcdGVtYWlsUHJlZk9yaWdpbjogZW1haWxOb3RpZmljYXRpb25zLm9yaWdpbixcblx0XHR9O1xuXHR9XG5cblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVVbnJlYWRBbGVydEJ5SWQgPSBmdW5jdGlvbihfaWQsIHVucmVhZEFsZXJ0KSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZCxcblx0fTtcblxuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0dW5yZWFkQWxlcnQsXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZURpc2FibGVOb3RpZmljYXRpb25zQnlJZCA9IGZ1bmN0aW9uKF9pZCwgZGlzYWJsZU5vdGlmaWNhdGlvbnMpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkLFxuXHR9O1xuXG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHRkaXNhYmxlTm90aWZpY2F0aW9ucyxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBkYXRlSGlkZVVucmVhZFN0YXR1c0J5SWQgPSBmdW5jdGlvbihfaWQsIGhpZGVVbnJlYWRTdGF0dXMpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkLFxuXHR9O1xuXG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHRoaWRlVW5yZWFkU3RhdHVzLFxuXHRcdH0sXG5cdH07XG5cblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVNdXRlR3JvdXBNZW50aW9ucyA9IGZ1bmN0aW9uKF9pZCwgbXV0ZUdyb3VwTWVudGlvbnMpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkLFxuXHR9O1xuXG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHRtdXRlR3JvdXBNZW50aW9ucyxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZEFsd2F5c05vdGlmeUF1ZGlvVXNlcnNCeVJvb21JZCA9IGZ1bmN0aW9uKHJvb21JZCkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRyaWQ6IHJvb21JZCxcblx0XHRhdWRpb05vdGlmaWNhdGlvbnM6ICdhbGwnLFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmQocXVlcnkpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kQWx3YXlzTm90aWZ5RGVza3RvcFVzZXJzQnlSb29tSWQgPSBmdW5jdGlvbihyb29tSWQpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0cmlkOiByb29tSWQsXG5cdFx0ZGVza3RvcE5vdGlmaWNhdGlvbnM6ICdhbGwnLFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmQocXVlcnkpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kRG9udE5vdGlmeURlc2t0b3BVc2Vyc0J5Um9vbUlkID0gZnVuY3Rpb24ocm9vbUlkKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdHJpZDogcm9vbUlkLFxuXHRcdGRlc2t0b3BOb3RpZmljYXRpb25zOiAnbm90aGluZycsXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRBbHdheXNOb3RpZnlNb2JpbGVVc2Vyc0J5Um9vbUlkID0gZnVuY3Rpb24ocm9vbUlkKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdHJpZDogcm9vbUlkLFxuXHRcdG1vYmlsZVB1c2hOb3RpZmljYXRpb25zOiAnYWxsJyxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5KTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZERvbnROb3RpZnlNb2JpbGVVc2Vyc0J5Um9vbUlkID0gZnVuY3Rpb24ocm9vbUlkKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdHJpZDogcm9vbUlkLFxuXHRcdG1vYmlsZVB1c2hOb3RpZmljYXRpb25zOiAnbm90aGluZycsXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRXaXRoU2VuZEVtYWlsQnlSb29tSWQgPSBmdW5jdGlvbihyb29tSWQpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0cmlkOiByb29tSWQsXG5cdFx0ZW1haWxOb3RpZmljYXRpb25zOiB7XG5cdFx0XHQkZXhpc3RzOiB0cnVlLFxuXHRcdH0sXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgeyBmaWVsZHM6IHsgZW1haWxOb3RpZmljYXRpb25zOiAxLCB1OiAxIH0gfSk7XG59O1xuXG5cblJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZE5vdGlmaWNhdGlvblByZWZlcmVuY2VzQnlSb29tID0gZnVuY3Rpb24ocXVlcnkvKiB7IHJvb21JZDogcmlkLCBkZXNrdG9wRmlsdGVyOiBkZXNrdG9wTm90aWZpY2F0aW9ucywgbW9iaWxlRmlsdGVyOiBtb2JpbGVQdXNoTm90aWZpY2F0aW9ucywgZW1haWxGaWx0ZXI6IGVtYWlsTm90aWZpY2F0aW9ucyB9Ki8pIHtcblxuXHRyZXR1cm4gdGhpcy5fZGIuZmluZChxdWVyeSwge1xuXHRcdGZpZWxkczoge1xuXG5cdFx0XHQvLyBmaWVsZHMgbmVlZGVkIGZvciBub3RpZmljYXRpb25zXG5cdFx0XHRyaWQ6IDEsXG5cdFx0XHR0OiAxLFxuXHRcdFx0dTogMSxcblx0XHRcdG5hbWU6IDEsXG5cdFx0XHRmbmFtZTogMSxcblx0XHRcdGNvZGU6IDEsXG5cblx0XHRcdC8vIGZpZWxkcyB0byBkZWZpbmUgaWYgc2hvdWxkIHNlbmQgYSBub3RpZmljYXRpb25cblx0XHRcdGlnbm9yZWQ6IDEsXG5cdFx0XHRhdWRpb05vdGlmaWNhdGlvbnM6IDEsXG5cdFx0XHRhdWRpb05vdGlmaWNhdGlvblZhbHVlOiAxLFxuXHRcdFx0ZGVza3RvcE5vdGlmaWNhdGlvbkR1cmF0aW9uOiAxLFxuXHRcdFx0ZGVza3RvcE5vdGlmaWNhdGlvbnM6IDEsXG5cdFx0XHRtb2JpbGVQdXNoTm90aWZpY2F0aW9uczogMSxcblx0XHRcdGVtYWlsTm90aWZpY2F0aW9uczogMSxcblx0XHRcdGRpc2FibGVOb3RpZmljYXRpb25zOiAxLFxuXHRcdFx0bXV0ZUdyb3VwTWVudGlvbnM6IDEsXG5cdFx0XHR1c2VySGlnaGxpZ2h0czogMSxcblx0XHR9LFxuXHR9KTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZEFsbE1lc3NhZ2VzTm90aWZpY2F0aW9uUHJlZmVyZW5jZXNCeVJvb20gPSBmdW5jdGlvbihyb29tSWQpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0cmlkOiByb29tSWQsXG5cdFx0J3UuX2lkJzogeyAkZXhpc3RzOiB0cnVlIH0sXG5cdFx0JG9yOiBbXG5cdFx0XHR7IGRlc2t0b3BOb3RpZmljYXRpb25zOiB7ICRpbjogWydhbGwnLCAnbWVudGlvbnMnXSB9IH0sXG5cdFx0XHR7IG1vYmlsZVB1c2hOb3RpZmljYXRpb25zOiB7ICRpbjogWydhbGwnLCAnbWVudGlvbnMnXSB9IH0sXG5cdFx0XHR7IGVtYWlsTm90aWZpY2F0aW9uczogeyAkaW46IFsnYWxsJywgJ21lbnRpb25zJ10gfSB9LFxuXHRcdF0sXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuX2RiLmZpbmQocXVlcnksIHtcblx0XHRmaWVsZHM6IHtcblx0XHRcdCd1Ll9pZCc6IDEsXG5cdFx0XHRhdWRpb05vdGlmaWNhdGlvbnM6IDEsXG5cdFx0XHRhdWRpb05vdGlmaWNhdGlvblZhbHVlOiAxLFxuXHRcdFx0ZGVza3RvcE5vdGlmaWNhdGlvbkR1cmF0aW9uOiAxLFxuXHRcdFx0ZGVza3RvcE5vdGlmaWNhdGlvbnM6IDEsXG5cdFx0XHRtb2JpbGVQdXNoTm90aWZpY2F0aW9uczogMSxcblx0XHRcdGVtYWlsTm90aWZpY2F0aW9uczogMSxcblx0XHRcdGRpc2FibGVOb3RpZmljYXRpb25zOiAxLFxuXHRcdFx0bXV0ZUdyb3VwTWVudGlvbnM6IDEsXG5cdFx0fSxcblx0fSk7XG59O1xuIl19
