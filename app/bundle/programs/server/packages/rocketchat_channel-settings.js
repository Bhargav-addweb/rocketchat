(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var settings;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:channel-settings":{"server":{"functions":{"saveReactWhenReadOnly.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveReactWhenReadOnly.js                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveReactWhenReadOnly = function (rid, allowReact) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      function: 'RocketChat.saveReactWhenReadOnly'
    });
  }

  return RocketChat.models.Rooms.setAllowReactingWhenReadOnlyById(rid, allowReact);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomType.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomType.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveRoomType = function (rid, roomType, user, sendMessage = true) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      function: 'RocketChat.saveRoomType'
    });
  }

  if (roomType !== 'c' && roomType !== 'p') {
    throw new Meteor.Error('error-invalid-room-type', 'error-invalid-room-type', {
      function: 'RocketChat.saveRoomType',
      type: roomType
    });
  }

  const room = RocketChat.models.Rooms.findOneById(rid);

  if (room == null) {
    throw new Meteor.Error('error-invalid-room', 'error-invalid-room', {
      function: 'RocketChat.saveRoomType',
      _id: rid
    });
  }

  if (room.t === 'd') {
    throw new Meteor.Error('error-direct-room', 'Can\'t change type of direct rooms', {
      function: 'RocketChat.saveRoomType'
    });
  }

  const result = RocketChat.models.Rooms.setTypeById(rid, roomType) && RocketChat.models.Subscriptions.updateTypeByRoomId(rid, roomType);

  if (result && sendMessage) {
    let message;

    if (roomType === 'c') {
      message = TAPi18n.__('Channel', {
        lng: user && user.language || RocketChat.settings.get('language') || 'en'
      });
    } else {
      message = TAPi18n.__('Private_Group', {
        lng: user && user.language || RocketChat.settings.get('language') || 'en'
      });
    }

    RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser('room_changed_privacy', rid, message, user);
  }

  return result;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomTopic.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomTopic.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveRoomTopic = function (rid, roomTopic, user, sendMessage = true) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      function: 'RocketChat.saveRoomTopic'
    });
  }

  const update = RocketChat.models.Rooms.setTopicById(rid, roomTopic);

  if (update && sendMessage) {
    RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser('room_changed_topic', rid, roomTopic, user);
  }

  return update;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomCustomFields.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomCustomFields.js                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveRoomCustomFields = function (rid, roomCustomFields) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      function: 'RocketChat.saveRoomCustomFields'
    });
  }

  if (!Match.test(roomCustomFields, Object)) {
    throw new Meteor.Error('invalid-roomCustomFields-type', 'Invalid roomCustomFields type', {
      function: 'RocketChat.saveRoomCustomFields'
    });
  }

  const ret = RocketChat.models.Rooms.setCustomFieldsById(rid, roomCustomFields); // Update customFields of any user's Subscription related with this rid

  RocketChat.models.Subscriptions.updateCustomFieldsByRoomId(rid, roomCustomFields);
  return ret;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomAnnouncement.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomAnnouncement.js                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectWithoutProperties"));

RocketChat.saveRoomAnnouncement = function (rid, roomAnnouncement, user, sendMessage = true) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      function: 'RocketChat.saveRoomAnnouncement'
    });
  }

  let message;
  let announcementDetails;

  if (typeof roomAnnouncement === 'string') {
    message = roomAnnouncement;
  } else {
    var _roomAnnouncement = roomAnnouncement;
    ({
      message
    } = _roomAnnouncement);
    announcementDetails = (0, _objectWithoutProperties2.default)(_roomAnnouncement, ["message"]);
    _roomAnnouncement;
  }

  const updated = RocketChat.models.Rooms.setAnnouncementById(rid, message, announcementDetails);

  if (updated && sendMessage) {
    RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser('room_changed_announcement', rid, message, user);
  }

  return updated;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomName.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomName.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveRoomName = function (rid, displayName, user, sendMessage = true) {
  const room = RocketChat.models.Rooms.findOneById(rid);

  if (RocketChat.roomTypes.roomTypes[room.t].preventRenaming()) {
    throw new Meteor.Error('error-not-allowed', 'Not allowed', {
      function: 'RocketChat.saveRoomdisplayName'
    });
  }

  if (displayName === room.name) {
    return;
  }

  const slugifiedRoomName = RocketChat.getValidRoomName(displayName, rid);
  const update = RocketChat.models.Rooms.setNameById(rid, slugifiedRoomName, displayName) && RocketChat.models.Subscriptions.updateNameAndAlertByRoomId(rid, slugifiedRoomName, displayName);

  if (update && sendMessage) {
    RocketChat.models.Messages.createRoomRenamedWithRoomIdRoomNameAndUser(rid, displayName, user);
  }

  return displayName;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomReadOnly.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomReadOnly.js                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveRoomReadOnly = function (rid, readOnly) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      function: 'RocketChat.saveRoomReadOnly'
    });
  }

  return RocketChat.models.Rooms.setReadOnlyById(rid, readOnly);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomDescription.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomDescription.js                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveRoomDescription = function (rid, roomDescription, user) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      function: 'RocketChat.saveRoomDescription'
    });
  }

  const update = RocketChat.models.Rooms.setDescriptionById(rid, roomDescription);
  RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser('room_changed_description', rid, roomDescription, user);
  return update;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomSystemMessages.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/functions/saveRoomSystemMessages.js                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.saveRoomSystemMessages = function (rid, systemMessages) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      function: 'RocketChat.saveRoomSystemMessages'
    });
  }

  return RocketChat.models.Rooms.setSystemMessagesById(rid, systemMessages);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"saveRoomSettings.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/methods/saveRoomSettings.js                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const fields = ['roomName', 'roomTopic', 'roomAnnouncement', 'roomCustomFields', 'roomDescription', 'roomType', 'readOnly', 'reactWhenReadOnly', 'systemMessages', 'default', 'joinCode', 'tokenpass', 'streamingOptions', 'retentionEnabled', 'retentionMaxAge', 'retentionExcludePinned', 'retentionFilesOnly', 'retentionOverrideGlobal', 'encrypted'];
Meteor.methods({
  saveRoomSettings(rid, settings, value) {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        function: 'RocketChat.saveRoomName'
      });
    }

    if (!Match.test(rid, String)) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'saveRoomSettings'
      });
    }

    if (typeof settings !== 'object') {
      settings = {
        [settings]: value
      };
    }

    if (!Object.keys(settings).every(key => fields.includes(key))) {
      throw new Meteor.Error('error-invalid-settings', 'Invalid settings provided', {
        method: 'saveRoomSettings'
      });
    }

    if (!RocketChat.authz.hasPermission(userId, 'edit-room', rid)) {
      throw new Meteor.Error('error-action-not-allowed', 'Editing room is not allowed', {
        method: 'saveRoomSettings',
        action: 'Editing_room'
      });
    }

    const room = RocketChat.models.Rooms.findOneById(rid);

    if (room.broadcast && (settings.readOnly || settings.reactWhenReadOnly)) {
      throw new Meteor.Error('error-action-not-allowed', 'Editing readOnly/reactWhenReadOnly are not allowed for broadcast rooms', {
        method: 'saveRoomSettings',
        action: 'Editing_room'
      });
    }

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'saveRoomSettings'
      });
    }

    const user = Meteor.user(); // validations

    Object.keys(settings).forEach(setting => {
      const value = settings[setting];

      if (settings === 'default' && !RocketChat.authz.hasPermission(userId, 'view-room-administration')) {
        throw new Meteor.Error('error-action-not-allowed', 'Viewing room administration is not allowed', {
          method: 'saveRoomSettings',
          action: 'Viewing_room_administration'
        });
      }

      if (setting === 'roomType' && value !== room.t && value === 'c' && !RocketChat.authz.hasPermission(userId, 'create-c')) {
        throw new Meteor.Error('error-action-not-allowed', 'Changing a private group to a public channel is not allowed', {
          method: 'saveRoomSettings',
          action: 'Change_Room_Type'
        });
      }

      if (setting === 'roomType' && value !== room.t && value === 'p' && !RocketChat.authz.hasPermission(userId, 'create-p')) {
        throw new Meteor.Error('error-action-not-allowed', 'Changing a public channel to a private room is not allowed', {
          method: 'saveRoomSettings',
          action: 'Change_Room_Type'
        });
      }

      if (setting === 'encrypted' && value !== room.encrypted && room.t !== 'd' && room.t !== 'p') {
        throw new Meteor.Error('error-action-not-allowed', 'Only groups or direct channels can enable encryption', {
          method: 'saveRoomSettings',
          action: 'Change_Room_Encrypted'
        });
      }

      if (setting === 'retentionEnabled' && !RocketChat.authz.hasPermission(userId, 'edit-room-retention-policy', rid) && value !== room.retention.enabled) {
        throw new Meteor.Error('error-action-not-allowed', 'Editing room retention policy is not allowed', {
          method: 'saveRoomSettings',
          action: 'Editing_room'
        });
      }

      if (setting === 'retentionMaxAge' && !RocketChat.authz.hasPermission(userId, 'edit-room-retention-policy', rid) && value !== room.retention.maxAge) {
        throw new Meteor.Error('error-action-not-allowed', 'Editing room retention policy is not allowed', {
          method: 'saveRoomSettings',
          action: 'Editing_room'
        });
      }

      if (setting === 'retentionExcludePinned' && !RocketChat.authz.hasPermission(userId, 'edit-room-retention-policy', rid) && value !== room.retention.excludePinned) {
        throw new Meteor.Error('error-action-not-allowed', 'Editing room retention policy is not allowed', {
          method: 'saveRoomSettings',
          action: 'Editing_room'
        });
      }

      if (setting === 'retentionFilesOnly' && !RocketChat.authz.hasPermission(userId, 'edit-room-retention-policy', rid) && value !== room.retention.filesOnly) {
        throw new Meteor.Error('error-action-not-allowed', 'Editing room retention policy is not allowed', {
          method: 'saveRoomSettings',
          action: 'Editing_room'
        });
      }

      if (setting === 'retentionOverrideGlobal') {
        delete settings.retentionMaxAge;
        delete settings.retentionExcludePinned;
        delete settings.retentionFilesOnly;
      }
    });
    Object.keys(settings).forEach(setting => {
      const value = settings[setting];

      switch (setting) {
        case 'roomName':
          RocketChat.saveRoomName(rid, value, user);
          break;

        case 'roomTopic':
          if (value !== room.topic) {
            RocketChat.saveRoomTopic(rid, value, user);
          }

          break;

        case 'roomAnnouncement':
          if (value !== room.announcement) {
            RocketChat.saveRoomAnnouncement(rid, value, user);
          }

          break;

        case 'roomCustomFields':
          if (value !== room.customFields) {
            RocketChat.saveRoomCustomFields(rid, value);
          }

          break;

        case 'roomDescription':
          if (value !== room.description) {
            RocketChat.saveRoomDescription(rid, value, user);
          }

          break;

        case 'roomType':
          if (value !== room.t) {
            RocketChat.saveRoomType(rid, value, user);
          }

          break;

        case 'tokenpass':
          check(value, {
            require: String,
            tokens: [{
              token: String,
              balance: String
            }]
          });
          RocketChat.saveRoomTokenpass(rid, value);
          break;

        case 'streamingOptions':
          RocketChat.saveStreamingOptions(rid, value);
          break;

        case 'readOnly':
          if (value !== room.ro) {
            RocketChat.saveRoomReadOnly(rid, value, user);
          }

          break;

        case 'reactWhenReadOnly':
          if (value !== room.reactWhenReadOnly) {
            RocketChat.saveReactWhenReadOnly(rid, value, user);
          }

          break;

        case 'systemMessages':
          if (value !== room.sysMes) {
            RocketChat.saveRoomSystemMessages(rid, value, user);
          }

          break;

        case 'joinCode':
          RocketChat.models.Rooms.setJoinCodeById(rid, String(value));
          break;

        case 'default':
          RocketChat.models.Rooms.saveDefaultById(rid, value);
          break;

        case 'retentionEnabled':
          RocketChat.models.Rooms.saveRetentionEnabledById(rid, value);
          break;

        case 'retentionMaxAge':
          RocketChat.models.Rooms.saveRetentionMaxAgeById(rid, value);
          break;

        case 'retentionExcludePinned':
          RocketChat.models.Rooms.saveRetentionExcludePinnedById(rid, value);
          break;

        case 'retentionFilesOnly':
          RocketChat.models.Rooms.saveRetentionFilesOnlyById(rid, value);
          break;

        case 'retentionOverrideGlobal':
          RocketChat.models.Rooms.saveRetentionOverrideGlobalById(rid, value);
          break;

        case 'encrypted':
          RocketChat.models.Rooms.saveEncryptedById(rid, value);
          break;
      }
    });
    return {
      result: true,
      rid: room._id
    };
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"models":{"Messages.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/models/Messages.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.models.Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser = function (type, roomId, message, user, extraData) {
  return this.createWithTypeRoomIdMessageAndUser(type, roomId, message, user, extraData);
};

RocketChat.models.Messages.createRoomRenamedWithRoomIdRoomNameAndUser = function (roomId, roomName, user, extraData) {
  return this.createWithTypeRoomIdMessageAndUser('r', roomId, roomName, user, extraData);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Rooms.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/models/Rooms.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.models.Rooms.setDescriptionById = function (_id, description) {
  const query = {
    _id
  };
  const update = {
    $set: {
      description
    }
  };
  return this.update(query, update);
};

RocketChat.models.Rooms.setReadOnlyById = function (_id, readOnly) {
  const query = {
    _id
  };
  const update = {
    $set: {
      ro: readOnly,
      muted: []
    }
  };

  if (readOnly) {
    RocketChat.models.Subscriptions.findByRoomIdWhenUsernameExists(_id, {
      fields: {
        'u._id': 1,
        'u.username': 1
      }
    }).forEach(function ({
      u: user
    }) {
      if (RocketChat.authz.hasPermission(user._id, 'post-readonly')) {
        return;
      }

      return update.$set.muted.push(user.username);
    });
  } else {
    update.$unset = {
      muted: ''
    };
  }

  if (update.$set.muted.length === 0) {
    delete update.$set.muted;
  }

  return this.update(query, update);
};

RocketChat.models.Rooms.setAllowReactingWhenReadOnlyById = function (_id, allowReacting) {
  const query = {
    _id
  };
  const update = {
    $set: {
      reactWhenReadOnly: allowReacting
    }
  };
  return this.update(query, update);
};

RocketChat.models.Rooms.setSystemMessagesById = function (_id, systemMessages) {
  const query = {
    _id
  };
  const update = {
    $set: {
      sysMes: systemMessages
    }
  };
  return this.update(query, update);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_channel-settings/server/startup.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.startup(function () {
  RocketChat.models.Permissions.upsert('post-readonly', {
    $setOnInsert: {
      roles: ['admin', 'owner', 'moderator']
    }
  });
  RocketChat.models.Permissions.upsert('set-readonly', {
    $setOnInsert: {
      roles: ['admin', 'owner']
    }
  });
  RocketChat.models.Permissions.upsert('set-react-when-readonly', {
    $setOnInsert: {
      roles: ['admin', 'owner']
    }
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveReactWhenReadOnly.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomType.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomTopic.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomCustomFields.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomAnnouncement.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomName.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomReadOnly.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomDescription.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/functions/saveRoomSystemMessages.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/methods/saveRoomSettings.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/models/Messages.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/models/Rooms.js");
require("/node_modules/meteor/rocketchat:channel-settings/server/startup.js");

/* Exports */
Package._define("rocketchat:channel-settings");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_channel-settings.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjaGFubmVsLXNldHRpbmdzL3NlcnZlci9mdW5jdGlvbnMvc2F2ZVJlYWN0V2hlblJlYWRPbmx5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbVR5cGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Y2hhbm5lbC1zZXR0aW5ncy9zZXJ2ZXIvZnVuY3Rpb25zL3NhdmVSb29tVG9waWMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Y2hhbm5lbC1zZXR0aW5ncy9zZXJ2ZXIvZnVuY3Rpb25zL3NhdmVSb29tQ3VzdG9tRmllbGRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbUFubm91bmNlbWVudC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjaGFubmVsLXNldHRpbmdzL3NlcnZlci9mdW5jdGlvbnMvc2F2ZVJvb21OYW1lLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbVJlYWRPbmx5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbURlc2NyaXB0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbVN5c3RlbU1lc3NhZ2VzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL21ldGhvZHMvc2F2ZVJvb21TZXR0aW5ncy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjaGFubmVsLXNldHRpbmdzL3NlcnZlci9tb2RlbHMvTWVzc2FnZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Y2hhbm5lbC1zZXR0aW5ncy9zZXJ2ZXIvbW9kZWxzL1Jvb21zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmNoYW5uZWwtc2V0dGluZ3Mvc2VydmVyL3N0YXJ0dXAuanMiXSwibmFtZXMiOlsiUm9ja2V0Q2hhdCIsInNhdmVSZWFjdFdoZW5SZWFkT25seSIsInJpZCIsImFsbG93UmVhY3QiLCJNYXRjaCIsInRlc3QiLCJTdHJpbmciLCJNZXRlb3IiLCJFcnJvciIsImZ1bmN0aW9uIiwibW9kZWxzIiwiUm9vbXMiLCJzZXRBbGxvd1JlYWN0aW5nV2hlblJlYWRPbmx5QnlJZCIsInNhdmVSb29tVHlwZSIsInJvb21UeXBlIiwidXNlciIsInNlbmRNZXNzYWdlIiwidHlwZSIsInJvb20iLCJmaW5kT25lQnlJZCIsIl9pZCIsInQiLCJyZXN1bHQiLCJzZXRUeXBlQnlJZCIsIlN1YnNjcmlwdGlvbnMiLCJ1cGRhdGVUeXBlQnlSb29tSWQiLCJtZXNzYWdlIiwiVEFQaTE4biIsIl9fIiwibG5nIiwibGFuZ3VhZ2UiLCJzZXR0aW5ncyIsImdldCIsIk1lc3NhZ2VzIiwiY3JlYXRlUm9vbVNldHRpbmdzQ2hhbmdlZFdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIiLCJzYXZlUm9vbVRvcGljIiwicm9vbVRvcGljIiwidXBkYXRlIiwic2V0VG9waWNCeUlkIiwic2F2ZVJvb21DdXN0b21GaWVsZHMiLCJyb29tQ3VzdG9tRmllbGRzIiwiT2JqZWN0IiwicmV0Iiwic2V0Q3VzdG9tRmllbGRzQnlJZCIsInVwZGF0ZUN1c3RvbUZpZWxkc0J5Um9vbUlkIiwic2F2ZVJvb21Bbm5vdW5jZW1lbnQiLCJyb29tQW5ub3VuY2VtZW50IiwiYW5ub3VuY2VtZW50RGV0YWlscyIsInVwZGF0ZWQiLCJzZXRBbm5vdW5jZW1lbnRCeUlkIiwic2F2ZVJvb21OYW1lIiwiZGlzcGxheU5hbWUiLCJyb29tVHlwZXMiLCJwcmV2ZW50UmVuYW1pbmciLCJuYW1lIiwic2x1Z2lmaWVkUm9vbU5hbWUiLCJnZXRWYWxpZFJvb21OYW1lIiwic2V0TmFtZUJ5SWQiLCJ1cGRhdGVOYW1lQW5kQWxlcnRCeVJvb21JZCIsImNyZWF0ZVJvb21SZW5hbWVkV2l0aFJvb21JZFJvb21OYW1lQW5kVXNlciIsInNhdmVSb29tUmVhZE9ubHkiLCJyZWFkT25seSIsInNldFJlYWRPbmx5QnlJZCIsInNhdmVSb29tRGVzY3JpcHRpb24iLCJyb29tRGVzY3JpcHRpb24iLCJzZXREZXNjcmlwdGlvbkJ5SWQiLCJzYXZlUm9vbVN5c3RlbU1lc3NhZ2VzIiwic3lzdGVtTWVzc2FnZXMiLCJzZXRTeXN0ZW1NZXNzYWdlc0J5SWQiLCJmaWVsZHMiLCJtZXRob2RzIiwic2F2ZVJvb21TZXR0aW5ncyIsInZhbHVlIiwidXNlcklkIiwibWV0aG9kIiwia2V5cyIsImV2ZXJ5Iiwia2V5IiwiaW5jbHVkZXMiLCJhdXRoeiIsImhhc1Blcm1pc3Npb24iLCJhY3Rpb24iLCJicm9hZGNhc3QiLCJyZWFjdFdoZW5SZWFkT25seSIsImZvckVhY2giLCJzZXR0aW5nIiwiZW5jcnlwdGVkIiwicmV0ZW50aW9uIiwiZW5hYmxlZCIsIm1heEFnZSIsImV4Y2x1ZGVQaW5uZWQiLCJmaWxlc09ubHkiLCJyZXRlbnRpb25NYXhBZ2UiLCJyZXRlbnRpb25FeGNsdWRlUGlubmVkIiwicmV0ZW50aW9uRmlsZXNPbmx5IiwidG9waWMiLCJhbm5vdW5jZW1lbnQiLCJjdXN0b21GaWVsZHMiLCJkZXNjcmlwdGlvbiIsImNoZWNrIiwicmVxdWlyZSIsInRva2VucyIsInRva2VuIiwiYmFsYW5jZSIsInNhdmVSb29tVG9rZW5wYXNzIiwic2F2ZVN0cmVhbWluZ09wdGlvbnMiLCJybyIsInN5c01lcyIsInNldEpvaW5Db2RlQnlJZCIsInNhdmVEZWZhdWx0QnlJZCIsInNhdmVSZXRlbnRpb25FbmFibGVkQnlJZCIsInNhdmVSZXRlbnRpb25NYXhBZ2VCeUlkIiwic2F2ZVJldGVudGlvbkV4Y2x1ZGVQaW5uZWRCeUlkIiwic2F2ZVJldGVudGlvbkZpbGVzT25seUJ5SWQiLCJzYXZlUmV0ZW50aW9uT3ZlcnJpZGVHbG9iYWxCeUlkIiwic2F2ZUVuY3J5cHRlZEJ5SWQiLCJyb29tSWQiLCJleHRyYURhdGEiLCJjcmVhdGVXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyIiwicm9vbU5hbWUiLCJxdWVyeSIsIiRzZXQiLCJtdXRlZCIsImZpbmRCeVJvb21JZFdoZW5Vc2VybmFtZUV4aXN0cyIsInUiLCJwdXNoIiwidXNlcm5hbWUiLCIkdW5zZXQiLCJsZW5ndGgiLCJhbGxvd1JlYWN0aW5nIiwic3RhcnR1cCIsIlBlcm1pc3Npb25zIiwidXBzZXJ0IiwiJHNldE9uSW5zZXJ0Iiwicm9sZXMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsV0FBV0MscUJBQVgsR0FBbUMsVUFBU0MsR0FBVCxFQUFjQyxVQUFkLEVBQTBCO0FBQzVELE1BQUksQ0FBQ0MsTUFBTUMsSUFBTixDQUFXSCxHQUFYLEVBQWdCSSxNQUFoQixDQUFMLEVBQThCO0FBQzdCLFVBQU0sSUFBSUMsT0FBT0MsS0FBWCxDQUFpQixjQUFqQixFQUFpQyxjQUFqQyxFQUFpRDtBQUFFQyxnQkFBVTtBQUFaLEtBQWpELENBQU47QUFDQTs7QUFFRCxTQUFPVCxXQUFXVSxNQUFYLENBQWtCQyxLQUFsQixDQUF3QkMsZ0NBQXhCLENBQXlEVixHQUF6RCxFQUE4REMsVUFBOUQsQ0FBUDtBQUNBLENBTkQsQzs7Ozs7Ozs7Ozs7QUNDQUgsV0FBV2EsWUFBWCxHQUEwQixVQUFTWCxHQUFULEVBQWNZLFFBQWQsRUFBd0JDLElBQXhCLEVBQThCQyxjQUFjLElBQTVD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a0J5SCxXQUFsQixDQUE4QkMsTUFBOUIsQ0FBcUMsY0FBckMsRUFBcUQ7QUFBRUMsa0JBQWM7QUFBRUMsYUFBTyxDQUFDLE9BQUQsRUFBVSxPQUFWO0FBQVQ7QUFBaEIsR0FBckQ7QUFDQXRJLGFBQVdVLE1BQVgsQ0FBa0J5SCxXQUFsQixDQUE4QkMsTUFBOUIsQ0FBcUMseUJBQXJDLEVBQWdFO0FBQUVDLGtCQUFjO0FBQUVDLGFBQU8sQ0FBQyxPQUFELEVBQVUsT0FBVjtBQUFUO0FBQWhCLEdBQWhFO0FBQ0EsQ0FKRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2NoYW5uZWwtc2V0dGluZ3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyJSb2NrZXRDaGF0LnNhdmVSZWFjdFdoZW5SZWFkT25seSA9IGZ1bmN0aW9uKHJpZCwgYWxsb3dSZWFjdCkge1xuXHRpZiAoIU1hdGNoLnRlc3QocmlkLCBTdHJpbmcpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHsgZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSZWFjdFdoZW5SZWFkT25seScgfSk7XG5cdH1cblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0QWxsb3dSZWFjdGluZ1doZW5SZWFkT25seUJ5SWQocmlkLCBhbGxvd1JlYWN0KTtcbn07XG4iLCJcblJvY2tldENoYXQuc2F2ZVJvb21UeXBlID0gZnVuY3Rpb24ocmlkLCByb29tVHlwZSwgdXNlciwgc2VuZE1lc3NhZ2UgPSB0cnVlKSB7XG5cdGlmICghTWF0Y2gudGVzdChyaWQsIFN0cmluZykpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSb29tVHlwZScsXG5cdFx0fSk7XG5cdH1cblx0aWYgKHJvb21UeXBlICE9PSAnYycgJiYgcm9vbVR5cGUgIT09ICdwJykge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbS10eXBlJywgJ2Vycm9yLWludmFsaWQtcm9vbS10eXBlJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSb29tVHlwZScsXG5cdFx0XHR0eXBlOiByb29tVHlwZSxcblx0XHR9KTtcblx0fVxuXHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQocmlkKTtcblx0aWYgKHJvb20gPT0gbnVsbCkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbScsICdlcnJvci1pbnZhbGlkLXJvb20nLCB7XG5cdFx0XHRmdW5jdGlvbjogJ1JvY2tldENoYXQuc2F2ZVJvb21UeXBlJyxcblx0XHRcdF9pZDogcmlkLFxuXHRcdH0pO1xuXHR9XG5cdGlmIChyb29tLnQgPT09ICdkJykge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWRpcmVjdC1yb29tJywgJ0NhblxcJ3QgY2hhbmdlIHR5cGUgb2YgZGlyZWN0IHJvb21zJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSb29tVHlwZScsXG5cdFx0fSk7XG5cdH1cblx0Y29uc3QgcmVzdWx0ID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0VHlwZUJ5SWQocmlkLCByb29tVHlwZSkgJiYgUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVUeXBlQnlSb29tSWQocmlkLCByb29tVHlwZSk7XG5cdGlmIChyZXN1bHQgJiYgc2VuZE1lc3NhZ2UpIHtcblx0XHRsZXQgbWVzc2FnZTtcblx0XHRpZiAocm9vbVR5cGUgPT09ICdjJykge1xuXHRcdFx0bWVzc2FnZSA9IFRBUGkxOG4uX18oJ0NoYW5uZWwnLCB7XG5cdFx0XHRcdGxuZzogKHVzZXIgJiYgdXNlci5sYW5ndWFnZSkgfHwgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ2xhbmd1YWdlJykgfHwgJ2VuJyxcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtZXNzYWdlID0gVEFQaTE4bi5fXygnUHJpdmF0ZV9Hcm91cCcsIHtcblx0XHRcdFx0bG5nOiAodXNlciAmJiB1c2VyLmxhbmd1YWdlKSB8fCBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnbGFuZ3VhZ2UnKSB8fCAnZW4nLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVJvb21TZXR0aW5nc0NoYW5nZWRXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKCdyb29tX2NoYW5nZWRfcHJpdmFjeScsIHJpZCwgbWVzc2FnZSwgdXNlcik7XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn07XG4iLCJSb2NrZXRDaGF0LnNhdmVSb29tVG9waWMgPSBmdW5jdGlvbihyaWQsIHJvb21Ub3BpYywgdXNlciwgc2VuZE1lc3NhZ2UgPSB0cnVlKSB7XG5cdGlmICghTWF0Y2gudGVzdChyaWQsIFN0cmluZykpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSb29tVG9waWMnLFxuXHRcdH0pO1xuXHR9XG5cblx0Y29uc3QgdXBkYXRlID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0VG9waWNCeUlkKHJpZCwgcm9vbVRvcGljKTtcblx0aWYgKHVwZGF0ZSAmJiBzZW5kTWVzc2FnZSkge1xuXHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVJvb21TZXR0aW5nc0NoYW5nZWRXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKCdyb29tX2NoYW5nZWRfdG9waWMnLCByaWQsIHJvb21Ub3BpYywgdXNlcik7XG5cdH1cblx0cmV0dXJuIHVwZGF0ZTtcbn07XG4iLCJSb2NrZXRDaGF0LnNhdmVSb29tQ3VzdG9tRmllbGRzID0gZnVuY3Rpb24ocmlkLCByb29tQ3VzdG9tRmllbGRzKSB7XG5cdGlmICghTWF0Y2gudGVzdChyaWQsIFN0cmluZykpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSb29tQ3VzdG9tRmllbGRzJyxcblx0XHR9KTtcblx0fVxuXHRpZiAoIU1hdGNoLnRlc3Qocm9vbUN1c3RvbUZpZWxkcywgT2JqZWN0KSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtcm9vbUN1c3RvbUZpZWxkcy10eXBlJywgJ0ludmFsaWQgcm9vbUN1c3RvbUZpZWxkcyB0eXBlJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSb29tQ3VzdG9tRmllbGRzJyxcblx0XHR9KTtcblx0fVxuXHRjb25zdCByZXQgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRDdXN0b21GaWVsZHNCeUlkKHJpZCwgcm9vbUN1c3RvbUZpZWxkcyk7XG5cblx0Ly8gVXBkYXRlIGN1c3RvbUZpZWxkcyBvZiBhbnkgdXNlcidzIFN1YnNjcmlwdGlvbiByZWxhdGVkIHdpdGggdGhpcyByaWRcblx0Um9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVDdXN0b21GaWVsZHNCeVJvb21JZChyaWQsIHJvb21DdXN0b21GaWVsZHMpO1xuXG5cdHJldHVybiByZXQ7XG59O1xuIiwiUm9ja2V0Q2hhdC5zYXZlUm9vbUFubm91bmNlbWVudCA9IGZ1bmN0aW9uKHJpZCwgcm9vbUFubm91bmNlbWVudCwgdXNlciwgc2VuZE1lc3NhZ2UgPSB0cnVlKSB7XG5cdGlmICghTWF0Y2gudGVzdChyaWQsIFN0cmluZykpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywgeyBmdW5jdGlvbjogJ1JvY2tldENoYXQuc2F2ZVJvb21Bbm5vdW5jZW1lbnQnIH0pO1xuXHR9XG5cblx0bGV0IG1lc3NhZ2U7XG5cdGxldCBhbm5vdW5jZW1lbnREZXRhaWxzO1xuXHRpZiAodHlwZW9mIHJvb21Bbm5vdW5jZW1lbnQgPT09ICdzdHJpbmcnKSB7XG5cdFx0bWVzc2FnZSA9IHJvb21Bbm5vdW5jZW1lbnQ7XG5cdH0gZWxzZSB7XG5cdFx0KHsgbWVzc2FnZSwgLi4uYW5ub3VuY2VtZW50RGV0YWlscyB9ID0gcm9vbUFubm91bmNlbWVudCk7XG5cdH1cblxuXHRjb25zdCB1cGRhdGVkID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0QW5ub3VuY2VtZW50QnlJZChyaWQsIG1lc3NhZ2UsIGFubm91bmNlbWVudERldGFpbHMpO1xuXHRpZiAodXBkYXRlZCAmJiBzZW5kTWVzc2FnZSkge1xuXHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVJvb21TZXR0aW5nc0NoYW5nZWRXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKCdyb29tX2NoYW5nZWRfYW5ub3VuY2VtZW50JywgcmlkLCBtZXNzYWdlLCB1c2VyKTtcblx0fVxuXG5cdHJldHVybiB1cGRhdGVkO1xufTtcbiIsIlxuUm9ja2V0Q2hhdC5zYXZlUm9vbU5hbWUgPSBmdW5jdGlvbihyaWQsIGRpc3BsYXlOYW1lLCB1c2VyLCBzZW5kTWVzc2FnZSA9IHRydWUpIHtcblx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKHJpZCk7XG5cdGlmIChSb2NrZXRDaGF0LnJvb21UeXBlcy5yb29tVHlwZXNbcm9vbS50XS5wcmV2ZW50UmVuYW1pbmcoKSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVSb29tZGlzcGxheU5hbWUnLFxuXHRcdH0pO1xuXHR9XG5cdGlmIChkaXNwbGF5TmFtZSA9PT0gcm9vbS5uYW1lKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3Qgc2x1Z2lmaWVkUm9vbU5hbWUgPSBSb2NrZXRDaGF0LmdldFZhbGlkUm9vbU5hbWUoZGlzcGxheU5hbWUsIHJpZCk7XG5cblx0Y29uc3QgdXBkYXRlID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0TmFtZUJ5SWQocmlkLCBzbHVnaWZpZWRSb29tTmFtZSwgZGlzcGxheU5hbWUpICYmIFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBkYXRlTmFtZUFuZEFsZXJ0QnlSb29tSWQocmlkLCBzbHVnaWZpZWRSb29tTmFtZSwgZGlzcGxheU5hbWUpO1xuXG5cdGlmICh1cGRhdGUgJiYgc2VuZE1lc3NhZ2UpIHtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5jcmVhdGVSb29tUmVuYW1lZFdpdGhSb29tSWRSb29tTmFtZUFuZFVzZXIocmlkLCBkaXNwbGF5TmFtZSwgdXNlcik7XG5cdH1cblx0cmV0dXJuIGRpc3BsYXlOYW1lO1xufTtcbiIsIlJvY2tldENoYXQuc2F2ZVJvb21SZWFkT25seSA9IGZ1bmN0aW9uKHJpZCwgcmVhZE9ubHkpIHtcblx0aWYgKCFNYXRjaC50ZXN0KHJpZCwgU3RyaW5nKSkge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nLCB7XG5cdFx0XHRmdW5jdGlvbjogJ1JvY2tldENoYXQuc2F2ZVJvb21SZWFkT25seScsXG5cdFx0fSk7XG5cdH1cblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldFJlYWRPbmx5QnlJZChyaWQsIHJlYWRPbmx5KTtcbn07XG4iLCJSb2NrZXRDaGF0LnNhdmVSb29tRGVzY3JpcHRpb24gPSBmdW5jdGlvbihyaWQsIHJvb21EZXNjcmlwdGlvbiwgdXNlcikge1xuXHRpZiAoIU1hdGNoLnRlc3QocmlkLCBTdHJpbmcpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHtcblx0XHRcdGZ1bmN0aW9uOiAnUm9ja2V0Q2hhdC5zYXZlUm9vbURlc2NyaXB0aW9uJyxcblx0XHR9KTtcblx0fVxuXG5cdGNvbnN0IHVwZGF0ZSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldERlc2NyaXB0aW9uQnlJZChyaWQsIHJvb21EZXNjcmlwdGlvbik7XG5cdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVJvb21TZXR0aW5nc0NoYW5nZWRXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKCdyb29tX2NoYW5nZWRfZGVzY3JpcHRpb24nLCByaWQsIHJvb21EZXNjcmlwdGlvbiwgdXNlcik7XG5cdHJldHVybiB1cGRhdGU7XG59O1xuIiwiUm9ja2V0Q2hhdC5zYXZlUm9vbVN5c3RlbU1lc3NhZ2VzID0gZnVuY3Rpb24ocmlkLCBzeXN0ZW1NZXNzYWdlcykge1xuXHRpZiAoIU1hdGNoLnRlc3QocmlkLCBTdHJpbmcpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHtcblx0XHRcdGZ1bmN0aW9uOiAnUm9ja2V0Q2hhdC5zYXZlUm9vbVN5c3RlbU1lc3NhZ2VzJyxcblx0XHR9KTtcblx0fVxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0U3lzdGVtTWVzc2FnZXNCeUlkKHJpZCwgc3lzdGVtTWVzc2FnZXMpO1xufTtcbiIsImNvbnN0IGZpZWxkcyA9IFsncm9vbU5hbWUnLCAncm9vbVRvcGljJywgJ3Jvb21Bbm5vdW5jZW1lbnQnLCAncm9vbUN1c3RvbUZpZWxkcycsICdyb29tRGVzY3JpcHRpb24nLCAncm9vbVR5cGUnLCAncmVhZE9ubHknLCAncmVhY3RXaGVuUmVhZE9ubHknLCAnc3lzdGVtTWVzc2FnZXMnLCAnZGVmYXVsdCcsICdqb2luQ29kZScsICd0b2tlbnBhc3MnLCAnc3RyZWFtaW5nT3B0aW9ucycsICdyZXRlbnRpb25FbmFibGVkJywgJ3JldGVudGlvbk1heEFnZScsICdyZXRlbnRpb25FeGNsdWRlUGlubmVkJywgJ3JldGVudGlvbkZpbGVzT25seScsICdyZXRlbnRpb25PdmVycmlkZUdsb2JhbCcsICdlbmNyeXB0ZWQnXTtcbk1ldGVvci5tZXRob2RzKHtcblx0c2F2ZVJvb21TZXR0aW5ncyhyaWQsIHNldHRpbmdzLCB2YWx1ZSkge1xuXHRcdGNvbnN0IHVzZXJJZCA9IE1ldGVvci51c2VySWQoKTtcblxuXHRcdGlmICghdXNlcklkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywge1xuXHRcdFx0XHRmdW5jdGlvbjogJ1JvY2tldENoYXQuc2F2ZVJvb21OYW1lJyxcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRpZiAoIU1hdGNoLnRlc3QocmlkLCBTdHJpbmcpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywge1xuXHRcdFx0XHRtZXRob2Q6ICdzYXZlUm9vbVNldHRpbmdzJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2Ygc2V0dGluZ3MgIT09ICdvYmplY3QnKSB7XG5cdFx0XHRzZXR0aW5ncyA9IHtcblx0XHRcdFx0W3NldHRpbmdzXSA6IHZhbHVlLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAoIU9iamVjdC5rZXlzKHNldHRpbmdzKS5ldmVyeSgoa2V5KSA9PiBmaWVsZHMuaW5jbHVkZXMoa2V5KSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtc2V0dGluZ3MnLCAnSW52YWxpZCBzZXR0aW5ncyBwcm92aWRlZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAnc2F2ZVJvb21TZXR0aW5ncycsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih1c2VySWQsICdlZGl0LXJvb20nLCByaWQpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnRWRpdGluZyByb29tIGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdzYXZlUm9vbVNldHRpbmdzJyxcblx0XHRcdFx0YWN0aW9uOiAnRWRpdGluZ19yb29tJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyaWQpO1xuXG5cdFx0aWYgKHJvb20uYnJvYWRjYXN0ICYmIChzZXR0aW5ncy5yZWFkT25seSB8fCBzZXR0aW5ncy5yZWFjdFdoZW5SZWFkT25seSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdFZGl0aW5nIHJlYWRPbmx5L3JlYWN0V2hlblJlYWRPbmx5IGFyZSBub3QgYWxsb3dlZCBmb3IgYnJvYWRjYXN0IHJvb21zJywge1xuXHRcdFx0XHRtZXRob2Q6ICdzYXZlUm9vbVNldHRpbmdzJyxcblx0XHRcdFx0YWN0aW9uOiAnRWRpdGluZ19yb29tJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmICghcm9vbSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHtcblx0XHRcdFx0bWV0aG9kOiAnc2F2ZVJvb21TZXR0aW5ncycsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXIoKTtcblxuXHRcdC8vIHZhbGlkYXRpb25zXG5cblx0XHRPYmplY3Qua2V5cyhzZXR0aW5ncykuZm9yRWFjaCgoc2V0dGluZykgPT4ge1xuXHRcdFx0Y29uc3QgdmFsdWUgPSBzZXR0aW5nc1tzZXR0aW5nXTtcblx0XHRcdGlmIChzZXR0aW5ncyA9PT0gJ2RlZmF1bHQnICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAndmlldy1yb29tLWFkbWluaXN0cmF0aW9uJykpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ1ZpZXdpbmcgcm9vbSBhZG1pbmlzdHJhdGlvbiBpcyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0XHRtZXRob2Q6ICdzYXZlUm9vbVNldHRpbmdzJyxcblx0XHRcdFx0XHRhY3Rpb246ICdWaWV3aW5nX3Jvb21fYWRtaW5pc3RyYXRpb24nLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmIChzZXR0aW5nID09PSAncm9vbVR5cGUnICYmIHZhbHVlICE9PSByb29tLnQgJiYgdmFsdWUgPT09ICdjJyAmJiAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHVzZXJJZCwgJ2NyZWF0ZS1jJykpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0NoYW5naW5nIGEgcHJpdmF0ZSBncm91cCB0byBhIHB1YmxpYyBjaGFubmVsIGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRcdG1ldGhvZDogJ3NhdmVSb29tU2V0dGluZ3MnLFxuXHRcdFx0XHRcdGFjdGlvbjogJ0NoYW5nZV9Sb29tX1R5cGUnLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmIChzZXR0aW5nID09PSAncm9vbVR5cGUnICYmIHZhbHVlICE9PSByb29tLnQgJiYgdmFsdWUgPT09ICdwJyAmJiAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHVzZXJJZCwgJ2NyZWF0ZS1wJykpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0NoYW5naW5nIGEgcHVibGljIGNoYW5uZWwgdG8gYSBwcml2YXRlIHJvb20gaXMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdFx0bWV0aG9kOiAnc2F2ZVJvb21TZXR0aW5ncycsXG5cdFx0XHRcdFx0YWN0aW9uOiAnQ2hhbmdlX1Jvb21fVHlwZScsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNldHRpbmcgPT09ICdlbmNyeXB0ZWQnICYmIHZhbHVlICE9PSByb29tLmVuY3J5cHRlZCAmJiAocm9vbS50ICE9PSAnZCcgJiYgcm9vbS50ICE9PSAncCcpKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdPbmx5IGdyb3VwcyBvciBkaXJlY3QgY2hhbm5lbHMgY2FuIGVuYWJsZSBlbmNyeXB0aW9uJywge1xuXHRcdFx0XHRcdG1ldGhvZDogJ3NhdmVSb29tU2V0dGluZ3MnLFxuXHRcdFx0XHRcdGFjdGlvbjogJ0NoYW5nZV9Sb29tX0VuY3J5cHRlZCcsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoc2V0dGluZyA9PT0gJ3JldGVudGlvbkVuYWJsZWQnICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAnZWRpdC1yb29tLXJldGVudGlvbi1wb2xpY3knLCByaWQpICYmIHZhbHVlICE9PSByb29tLnJldGVudGlvbi5lbmFibGVkKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdFZGl0aW5nIHJvb20gcmV0ZW50aW9uIHBvbGljeSBpcyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0XHRtZXRob2Q6ICdzYXZlUm9vbVNldHRpbmdzJyxcblx0XHRcdFx0XHRhY3Rpb246ICdFZGl0aW5nX3Jvb20nLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmIChzZXR0aW5nID09PSAncmV0ZW50aW9uTWF4QWdlJyAmJiAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHVzZXJJZCwgJ2VkaXQtcm9vbS1yZXRlbnRpb24tcG9saWN5JywgcmlkKSAmJiB2YWx1ZSAhPT0gcm9vbS5yZXRlbnRpb24ubWF4QWdlKSB7XG5cdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdFZGl0aW5nIHJvb20gcmV0ZW50aW9uIHBvbGljeSBpcyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0XHRtZXRob2Q6ICdzYXZlUm9vbVNldHRpbmdzJyxcblx0XHRcdFx0XHRhY3Rpb246ICdFZGl0aW5nX3Jvb20nLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmIChzZXR0aW5nID09PSAncmV0ZW50aW9uRXhjbHVkZVBpbm5lZCcgJiYgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih1c2VySWQsICdlZGl0LXJvb20tcmV0ZW50aW9uLXBvbGljeScsIHJpZCkgJiYgdmFsdWUgIT09IHJvb20ucmV0ZW50aW9uLmV4Y2x1ZGVQaW5uZWQpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0VkaXRpbmcgcm9vbSByZXRlbnRpb24gcG9saWN5IGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRcdG1ldGhvZDogJ3NhdmVSb29tU2V0dGluZ3MnLFxuXHRcdFx0XHRcdGFjdGlvbjogJ0VkaXRpbmdfcm9vbScsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNldHRpbmcgPT09ICdyZXRlbnRpb25GaWxlc09ubHknICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odXNlcklkLCAnZWRpdC1yb29tLXJldGVudGlvbi1wb2xpY3knLCByaWQpICYmIHZhbHVlICE9PSByb29tLnJldGVudGlvbi5maWxlc09ubHkpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0VkaXRpbmcgcm9vbSByZXRlbnRpb24gcG9saWN5IGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRcdG1ldGhvZDogJ3NhdmVSb29tU2V0dGluZ3MnLFxuXHRcdFx0XHRcdGFjdGlvbjogJ0VkaXRpbmdfcm9vbScsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNldHRpbmcgPT09ICdyZXRlbnRpb25PdmVycmlkZUdsb2JhbCcpIHtcblx0XHRcdFx0ZGVsZXRlIHNldHRpbmdzLnJldGVudGlvbk1heEFnZTtcblx0XHRcdFx0ZGVsZXRlIHNldHRpbmdzLnJldGVudGlvbkV4Y2x1ZGVQaW5uZWQ7XG5cdFx0XHRcdGRlbGV0ZSBzZXR0aW5ncy5yZXRlbnRpb25GaWxlc09ubHk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRPYmplY3Qua2V5cyhzZXR0aW5ncykuZm9yRWFjaCgoc2V0dGluZykgPT4ge1xuXHRcdFx0Y29uc3QgdmFsdWUgPSBzZXR0aW5nc1tzZXR0aW5nXTtcblx0XHRcdHN3aXRjaCAoc2V0dGluZykge1xuXHRcdFx0XHRjYXNlICdyb29tTmFtZSc6XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5zYXZlUm9vbU5hbWUocmlkLCB2YWx1ZSwgdXNlcik7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3Jvb21Ub3BpYyc6XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSByb29tLnRvcGljKSB7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNhdmVSb29tVG9waWMocmlkLCB2YWx1ZSwgdXNlcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdyb29tQW5ub3VuY2VtZW50Jzpcblx0XHRcdFx0XHRpZiAodmFsdWUgIT09IHJvb20uYW5ub3VuY2VtZW50KSB7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNhdmVSb29tQW5ub3VuY2VtZW50KHJpZCwgdmFsdWUsIHVzZXIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAncm9vbUN1c3RvbUZpZWxkcyc6XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSByb29tLmN1c3RvbUZpZWxkcykge1xuXHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5zYXZlUm9vbUN1c3RvbUZpZWxkcyhyaWQsIHZhbHVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3Jvb21EZXNjcmlwdGlvbic6XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSByb29tLmRlc2NyaXB0aW9uKSB7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNhdmVSb29tRGVzY3JpcHRpb24ocmlkLCB2YWx1ZSwgdXNlcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdyb29tVHlwZSc6XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSByb29tLnQpIHtcblx0XHRcdFx0XHRcdFJvY2tldENoYXQuc2F2ZVJvb21UeXBlKHJpZCwgdmFsdWUsIHVzZXIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAndG9rZW5wYXNzJzpcblx0XHRcdFx0XHRjaGVjayh2YWx1ZSwge1xuXHRcdFx0XHRcdFx0cmVxdWlyZTogU3RyaW5nLFxuXHRcdFx0XHRcdFx0dG9rZW5zOiBbe1xuXHRcdFx0XHRcdFx0XHR0b2tlbjogU3RyaW5nLFxuXHRcdFx0XHRcdFx0XHRiYWxhbmNlOiBTdHJpbmcsXG5cdFx0XHRcdFx0XHR9XSxcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRSb2NrZXRDaGF0LnNhdmVSb29tVG9rZW5wYXNzKHJpZCwgdmFsdWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdzdHJlYW1pbmdPcHRpb25zJzpcblx0XHRcdFx0XHRSb2NrZXRDaGF0LnNhdmVTdHJlYW1pbmdPcHRpb25zKHJpZCwgdmFsdWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdyZWFkT25seSc6XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSByb29tLnJvKSB7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNhdmVSb29tUmVhZE9ubHkocmlkLCB2YWx1ZSwgdXNlcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdyZWFjdFdoZW5SZWFkT25seSc6XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSByb29tLnJlYWN0V2hlblJlYWRPbmx5KSB7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNhdmVSZWFjdFdoZW5SZWFkT25seShyaWQsIHZhbHVlLCB1c2VyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3N5c3RlbU1lc3NhZ2VzJzpcblx0XHRcdFx0XHRpZiAodmFsdWUgIT09IHJvb20uc3lzTWVzKSB7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0LnNhdmVSb29tU3lzdGVtTWVzc2FnZXMocmlkLCB2YWx1ZSwgdXNlcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdqb2luQ29kZSc6XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0Sm9pbkNvZGVCeUlkKHJpZCwgU3RyaW5nKHZhbHVlKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ2RlZmF1bHQnOlxuXHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNhdmVEZWZhdWx0QnlJZChyaWQsIHZhbHVlKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAncmV0ZW50aW9uRW5hYmxlZCc6XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2F2ZVJldGVudGlvbkVuYWJsZWRCeUlkKHJpZCwgdmFsdWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdyZXRlbnRpb25NYXhBZ2UnOlxuXHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNhdmVSZXRlbnRpb25NYXhBZ2VCeUlkKHJpZCwgdmFsdWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdyZXRlbnRpb25FeGNsdWRlUGlubmVkJzpcblx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zYXZlUmV0ZW50aW9uRXhjbHVkZVBpbm5lZEJ5SWQocmlkLCB2YWx1ZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3JldGVudGlvbkZpbGVzT25seSc6XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2F2ZVJldGVudGlvbkZpbGVzT25seUJ5SWQocmlkLCB2YWx1ZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3JldGVudGlvbk92ZXJyaWRlR2xvYmFsJzpcblx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zYXZlUmV0ZW50aW9uT3ZlcnJpZGVHbG9iYWxCeUlkKHJpZCwgdmFsdWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdlbmNyeXB0ZWQnOlxuXHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNhdmVFbmNyeXB0ZWRCeUlkKHJpZCwgdmFsdWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3VsdDogdHJ1ZSxcblx0XHRcdHJpZDogcm9vbS5faWQsXG5cdFx0fTtcblx0fSxcbn0pO1xuIiwiUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuY3JlYXRlUm9vbVNldHRpbmdzQ2hhbmdlZFdpdGhUeXBlUm9vbUlkTWVzc2FnZUFuZFVzZXIgPSBmdW5jdGlvbih0eXBlLCByb29tSWQsIG1lc3NhZ2UsIHVzZXIsIGV4dHJhRGF0YSkge1xuXHRyZXR1cm4gdGhpcy5jcmVhdGVXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKHR5cGUsIHJvb21JZCwgbWVzc2FnZSwgdXNlciwgZXh0cmFEYXRhKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmNyZWF0ZVJvb21SZW5hbWVkV2l0aFJvb21JZFJvb21OYW1lQW5kVXNlciA9IGZ1bmN0aW9uKHJvb21JZCwgcm9vbU5hbWUsIHVzZXIsIGV4dHJhRGF0YSkge1xuXHRyZXR1cm4gdGhpcy5jcmVhdGVXaXRoVHlwZVJvb21JZE1lc3NhZ2VBbmRVc2VyKCdyJywgcm9vbUlkLCByb29tTmFtZSwgdXNlciwgZXh0cmFEYXRhKTtcbn07XG4iLCJSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXREZXNjcmlwdGlvbkJ5SWQgPSBmdW5jdGlvbihfaWQsIGRlc2NyaXB0aW9uKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZCxcblx0fTtcblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdGRlc2NyaXB0aW9uLFxuXHRcdH0sXG5cdH07XG5cdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldFJlYWRPbmx5QnlJZCA9IGZ1bmN0aW9uKF9pZCwgcmVhZE9ubHkpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkLFxuXHR9O1xuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0cm86IHJlYWRPbmx5LFxuXHRcdFx0bXV0ZWQ6IFtdLFxuXHRcdH0sXG5cdH07XG5cdGlmIChyZWFkT25seSkge1xuXHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZEJ5Um9vbUlkV2hlblVzZXJuYW1lRXhpc3RzKF9pZCwgeyBmaWVsZHM6IHsgJ3UuX2lkJzogMSwgJ3UudXNlcm5hbWUnOiAxIH0gfSkuZm9yRWFjaChmdW5jdGlvbih7IHU6IHVzZXIgfSkge1xuXHRcdFx0aWYgKFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih1c2VyLl9pZCwgJ3Bvc3QtcmVhZG9ubHknKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdXBkYXRlLiRzZXQubXV0ZWQucHVzaCh1c2VyLnVzZXJuYW1lKTtcblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHR1cGRhdGUuJHVuc2V0ID0ge1xuXHRcdFx0bXV0ZWQ6ICcnLFxuXHRcdH07XG5cdH1cblxuXHRpZiAodXBkYXRlLiRzZXQubXV0ZWQubGVuZ3RoID09PSAwKSB7XG5cdFx0ZGVsZXRlIHVwZGF0ZS4kc2V0Lm11dGVkO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0QWxsb3dSZWFjdGluZ1doZW5SZWFkT25seUJ5SWQgPSBmdW5jdGlvbihfaWQsIGFsbG93UmVhY3RpbmcpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0X2lkLFxuXHR9O1xuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0cmVhY3RXaGVuUmVhZE9ubHk6IGFsbG93UmVhY3RpbmcsXG5cdFx0fSxcblx0fTtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0U3lzdGVtTWVzc2FnZXNCeUlkID0gZnVuY3Rpb24oX2lkLCBzeXN0ZW1NZXNzYWdlcykge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQsXG5cdH07XG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHRzeXNNZXM6IHN5c3RlbU1lc3NhZ2VzLFxuXHRcdH0sXG5cdH07XG5cdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG4iLCJNZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMudXBzZXJ0KCdwb3N0LXJlYWRvbmx5JywgeyAkc2V0T25JbnNlcnQ6IHsgcm9sZXM6IFsnYWRtaW4nLCAnb3duZXInLCAnbW9kZXJhdG9yJ10gfSB9KTtcblx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMudXBzZXJ0KCdzZXQtcmVhZG9ubHknLCB7ICRzZXRPbkluc2VydDogeyByb2xlczogWydhZG1pbicsICdvd25lciddIH0gfSk7XG5cdFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLnVwc2VydCgnc2V0LXJlYWN0LXdoZW4tcmVhZG9ubHknLCB7ICRzZXRPbkluc2VydDogeyByb2xlczogWydhZG1pbicsICdvd25lciddIH0gfSk7XG59KTtcbiJdfQ==
