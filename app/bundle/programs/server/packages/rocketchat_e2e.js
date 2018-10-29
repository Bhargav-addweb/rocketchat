(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var SHA256 = Package.sha.SHA256;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:e2e":{"server":{"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/rocketchat_e2e/server/index.js                                                        //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
module.watch(require("./settings"));
module.watch(require("./models/Users"));
module.watch(require("./models/Rooms"));
module.watch(require("./models/Subscriptions"));
module.watch(require("./methods/setUserPublicAndPivateKeys"));
module.watch(require("./methods/getUsersOfRoomWithoutKey"));
module.watch(require("./methods/updateGroupKey"));
module.watch(require("./methods/setRoomKeyID"));
module.watch(require("./methods/fetchMyKeys"));
RocketChat.callbacks.add('afterJoinRoom', (user, room) => {
  RocketChat.Notifications.notifyRoom('e2e.keyRequest', room._id, room.e2eKeyId);
});
////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/rocketchat_e2e/server/settings.js                                                     //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
RocketChat.settings.addGroup('E2E Encryption', function () {
  this.add('E2E_Enable', false, {
    type: 'boolean',
    i18nLabel: 'Enabled',
    i18nDescription: 'E2E_Enable_description',
    public: true,
    alert: 'E2E_Enable_alert'
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods":{"fetchMyKeys.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/rocketchat_e2e/server/methods/fetchMyKeys.js                                          //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 1);
Meteor.methods({
  'e2e.fetchMyKeys'() {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'e2e.fetchMyKeys'
      });
    }

    return RocketChat.models.Users.fetchKeysByUserId(userId);
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////

},"getUsersOfRoomWithoutKey.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/rocketchat_e2e/server/methods/getUsersOfRoomWithoutKey.js                             //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 1);
Meteor.methods({
  'e2e.getUsersOfRoomWithoutKey'(rid) {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'e2e.getUsersOfRoomWithoutKey'
      });
    }

    const room = Meteor.call('canAccessRoom', rid, userId);

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'e2e.getUsersOfRoomWithoutKey'
      });
    }

    const subscriptions = RocketChat.models.Subscriptions.findByRidWithoutE2EKey(rid, {
      fields: {
        'u._id': 1
      }
    }).fetch();
    const userIds = subscriptions.map(s => s.u._id);
    const options = {
      fields: {
        'e2e.public_key': 1
      }
    };
    const users = RocketChat.models.Users.findByIdsWithPublicE2EKey(userIds, options).fetch();
    return {
      users
    };
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////

},"setRoomKeyID.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/rocketchat_e2e/server/methods/setRoomKeyID.js                                         //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 1);
Meteor.methods({
  'e2e.setRoomKeyID'(rid, keyID) {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'e2e.setRoomKeyID'
      });
    }

    const room = Meteor.call('canAccessRoom', rid, userId);

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'e2e.setRoomKeyID'
      });
    }

    if (room.e2eKeyId) {
      throw new Meteor.Error('error-room-e2e-key-already-exists', 'E2E Key ID already exists', {
        method: 'e2e.setRoomKeyID'
      });
    }

    return RocketChat.models.Rooms.setE2eKeyId(room._id, keyID);
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////

},"setUserPublicAndPivateKeys.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/rocketchat_e2e/server/methods/setUserPublicAndPivateKeys.js                           //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 1);
Meteor.methods({
  'e2e.setUserPublicAndPivateKeys'({
    public_key,
    private_key
  }) {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'e2e.setUserPublicAndPivateKeys'
      });
    }

    return RocketChat.models.Users.setE2EPublicAndPivateKeysByUserId(userId, {
      public_key,
      private_key
    });
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////

},"updateGroupKey.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/rocketchat_e2e/server/methods/updateGroupKey.js                                       //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 1);
Meteor.methods({
  'e2e.updateGroupKey'(rid, uid, key) {
    const mySub = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(rid, Meteor.userId());

    if (mySub) {
      // I have a subscription to this room
      const userSub = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(rid, uid);

      if (userSub) {
        // uid also has subscription to this room
        return RocketChat.models.Subscriptions.updateGroupE2EKey(userSub._id, key);
      }
    }
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////

}},"models":{"Rooms.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/rocketchat_e2e/server/models/Rooms.js                                                 //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);

RocketChat.models.Rooms.setE2eKeyId = function (_id, e2eKeyId, options) {
  const query = {
    _id
  };
  const update = {
    $set: {
      e2eKeyId
    }
  };
  return this.update(query, update, options);
};
////////////////////////////////////////////////////////////////////////////////////////////////////

},"Subscriptions.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/rocketchat_e2e/server/models/Subscriptions.js                                         //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);

RocketChat.models.Subscriptions.updateGroupE2EKey = function (_id, key) {
  const query = {
    _id
  };
  const update = {
    $set: {
      E2EKey: key
    }
  };
  this.update(query, update);
  return this.findOne({
    _id
  });
};

RocketChat.models.Subscriptions.findByRidWithoutE2EKey = function (rid, options) {
  const query = {
    rid,
    E2EKey: {
      $exists: false
    }
  };
  return this.find(query, options);
};
////////////////////////////////////////////////////////////////////////////////////////////////////

},"Users.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/rocketchat_e2e/server/models/Users.js                                                 //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);

RocketChat.models.Users.setE2EPublicAndPivateKeysByUserId = function (userId, {
  public_key,
  private_key
}) {
  this.update({
    _id: userId
  }, {
    $set: {
      'e2e.public_key': public_key,
      'e2e.private_key': private_key
    }
  });
};

RocketChat.models.Users.fetchKeysByUserId = function (userId) {
  const user = this.findOne({
    _id: userId
  }, {
    fields: {
      e2e: 1
    }
  });

  if (!user || !user.e2e || !user.e2e.public_key) {
    return {};
  }

  return {
    public_key: user.e2e.public_key,
    private_key: user.e2e.private_key
  };
};

RocketChat.models.Users.findByIdsWithPublicE2EKey = function (ids, options) {
  const query = {
    _id: {
      $in: ids
    },
    'e2e.public_key': {
      $exists: 1
    }
  };
  return this.find(query, options);
};
////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/rocketchat:e2e/server/index.js");

/* Exports */
Package._define("rocketchat:e2e", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_e2e.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDplMmUvc2VydmVyL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmUyZS9zZXJ2ZXIvc2V0dGluZ3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZTJlL3NlcnZlci9tZXRob2RzL2ZldGNoTXlLZXlzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmUyZS9zZXJ2ZXIvbWV0aG9kcy9nZXRVc2Vyc09mUm9vbVdpdGhvdXRLZXkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZTJlL3NlcnZlci9tZXRob2RzL3NldFJvb21LZXlJRC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDplMmUvc2VydmVyL21ldGhvZHMvc2V0VXNlclB1YmxpY0FuZFBpdmF0ZUtleXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZTJlL3NlcnZlci9tZXRob2RzL3VwZGF0ZUdyb3VwS2V5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmUyZS9zZXJ2ZXIvbW9kZWxzL1Jvb21zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmUyZS9zZXJ2ZXIvbW9kZWxzL1N1YnNjcmlwdGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZTJlL3NlcnZlci9tb2RlbHMvVXNlcnMuanMiXSwibmFtZXMiOlsiUm9ja2V0Q2hhdCIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJjYWxsYmFja3MiLCJhZGQiLCJ1c2VyIiwicm9vbSIsIk5vdGlmaWNhdGlvbnMiLCJub3RpZnlSb29tIiwiX2lkIiwiZTJlS2V5SWQiLCJzZXR0aW5ncyIsImFkZEdyb3VwIiwidHlwZSIsImkxOG5MYWJlbCIsImkxOG5EZXNjcmlwdGlvbiIsInB1YmxpYyIsImFsZXJ0IiwiTWV0ZW9yIiwibWV0aG9kcyIsInVzZXJJZCIsIkVycm9yIiwibWV0aG9kIiwibW9kZWxzIiwiVXNlcnMiLCJmZXRjaEtleXNCeVVzZXJJZCIsInJpZCIsImNhbGwiLCJzdWJzY3JpcHRpb25zIiwiU3Vic2NyaXB0aW9ucyIsImZpbmRCeVJpZFdpdGhvdXRFMkVLZXkiLCJmaWVsZHMiLCJmZXRjaCIsInVzZXJJZHMiLCJtYXAiLCJzIiwidSIsIm9wdGlvbnMiLCJ1c2VycyIsImZpbmRCeUlkc1dpdGhQdWJsaWNFMkVLZXkiLCJrZXlJRCIsIlJvb21zIiwic2V0RTJlS2V5SWQiLCJwdWJsaWNfa2V5IiwicHJpdmF0ZV9rZXkiLCJzZXRFMkVQdWJsaWNBbmRQaXZhdGVLZXlzQnlVc2VySWQiLCJ1aWQiLCJrZXkiLCJteVN1YiIsImZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZCIsInVzZXJTdWIiLCJ1cGRhdGVHcm91cEUyRUtleSIsInF1ZXJ5IiwidXBkYXRlIiwiJHNldCIsIkUyRUtleSIsImZpbmRPbmUiLCIkZXhpc3RzIiwiZmluZCIsImUyZSIsImlkcyIsIiRpbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxVQUFKO0FBQWVDLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSx1QkFBUixDQUFiLEVBQThDO0FBQUNILGFBQVdJLENBQVgsRUFBYTtBQUFDSixpQkFBV0ksQ0FBWDtBQUFhOztBQUE1QixDQUE5QyxFQUE0RSxDQUE1RTtBQUErRUgsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLFlBQVIsQ0FBYjtBQUFvQ0YsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLGdCQUFSLENBQWI7QUFBd0NGLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxnQkFBUixDQUFiO0FBQXdDRixPQUFPQyxLQUFQLENBQWFDLFFBQVEsd0JBQVIsQ0FBYjtBQUFnREYsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLHND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QUFTaEIsVUFEZjtBQUVOQyxpQkFBYXZDLEtBQUtzRCxHQUFMLENBQVNmO0FBRmhCLEdBQVA7QUFJQSxDQVhEOztBQWFBOUMsV0FBV3lCLE1BQVgsQ0FBa0JDLEtBQWxCLENBQXdCZSx5QkFBeEIsR0FBb0QsVUFBU3FCLEdBQVQsRUFBY3ZCLE9BQWQsRUFBdUI7QUFDMUUsUUFBTWUsUUFBUTtBQUNiM0MsU0FBSztBQUNKb0QsV0FBS0Q7QUFERCxLQURRO0FBSWIsc0JBQWtCO0FBQ2pCSCxlQUFTO0FBRFE7QUFKTCxHQUFkO0FBU0EsU0FBTyxLQUFLQyxJQUFMLENBQVVOLEtBQVYsRUFBaUJmLE9BQWpCLENBQVA7QUFDQSxDQVhELEMiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfZTJlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUm9ja2V0Q2hhdCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5cbmltcG9ydCAnLi9zZXR0aW5ncyc7XG5pbXBvcnQgJy4vbW9kZWxzL1VzZXJzJztcbmltcG9ydCAnLi9tb2RlbHMvUm9vbXMnO1xuaW1wb3J0ICcuL21vZGVscy9TdWJzY3JpcHRpb25zJztcbmltcG9ydCAnLi9tZXRob2RzL3NldFVzZXJQdWJsaWNBbmRQaXZhdGVLZXlzJztcbmltcG9ydCAnLi9tZXRob2RzL2dldFVzZXJzT2ZSb29tV2l0aG91dEtleSc7XG5pbXBvcnQgJy4vbWV0aG9kcy91cGRhdGVHcm91cEtleSc7XG5pbXBvcnQgJy4vbWV0aG9kcy9zZXRSb29tS2V5SUQnO1xuaW1wb3J0ICcuL21ldGhvZHMvZmV0Y2hNeUtleXMnO1xuXG5Sb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVySm9pblJvb20nLCAodXNlciwgcm9vbSkgPT4ge1xuXHRSb2NrZXRDaGF0Lk5vdGlmaWNhdGlvbnMubm90aWZ5Um9vbSgnZTJlLmtleVJlcXVlc3QnLCByb29tLl9pZCwgcm9vbS5lMmVLZXlJZCk7XG59KTtcbiIsImltcG9ydCB7IFJvY2tldENoYXQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdFMkUgRW5jcnlwdGlvbicsIGZ1bmN0aW9uKCkge1xuXHR0aGlzLmFkZCgnRTJFX0VuYWJsZScsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGkxOG5MYWJlbDogJ0VuYWJsZWQnLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ0UyRV9FbmFibGVfZGVzY3JpcHRpb24nLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRhbGVydDogJ0UyRV9FbmFibGVfYWxlcnQnLFxuXHR9KTtcbn0pO1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnZTJlLmZldGNoTXlLZXlzJygpIHtcblx0XHRjb25zdCB1c2VySWQgPSBNZXRlb3IudXNlcklkKCk7XG5cdFx0aWYgKCF1c2VySWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2UyZS5mZXRjaE15S2V5cycgfSk7XG5cdFx0fVxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5mZXRjaEtleXNCeVVzZXJJZCh1c2VySWQpO1xuXHR9LFxufSk7XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IFJvY2tldENoYXQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdCdlMmUuZ2V0VXNlcnNPZlJvb21XaXRob3V0S2V5JyhyaWQpIHtcblx0XHRjb25zdCB1c2VySWQgPSBNZXRlb3IudXNlcklkKCk7XG5cdFx0aWYgKCF1c2VySWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2UyZS5nZXRVc2Vyc09mUm9vbVdpdGhvdXRLZXknIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvb20gPSBNZXRlb3IuY2FsbCgnY2FuQWNjZXNzUm9vbScsIHJpZCwgdXNlcklkKTtcblx0XHRpZiAoIXJvb20pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nLCB7IG1ldGhvZDogJ2UyZS5nZXRVc2Vyc09mUm9vbVdpdGhvdXRLZXknIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRCeVJpZFdpdGhvdXRFMkVLZXkocmlkLCB7IGZpZWxkczogeyAndS5faWQnOiAxIH0gfSkuZmV0Y2goKTtcblx0XHRjb25zdCB1c2VySWRzID0gc3Vic2NyaXB0aW9ucy5tYXAoKHMpID0+IHMudS5faWQpO1xuXHRcdGNvbnN0IG9wdGlvbnMgPSB7IGZpZWxkczogeyAnZTJlLnB1YmxpY19rZXknOiAxIH0gfTtcblxuXHRcdGNvbnN0IHVzZXJzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZEJ5SWRzV2l0aFB1YmxpY0UyRUtleSh1c2VySWRzLCBvcHRpb25zKS5mZXRjaCgpO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHVzZXJzLFxuXHRcdH07XG5cdH0sXG59KTtcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgUm9ja2V0Q2hhdCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2UyZS5zZXRSb29tS2V5SUQnKHJpZCwga2V5SUQpIHtcblx0XHRjb25zdCB1c2VySWQgPSBNZXRlb3IudXNlcklkKCk7XG5cdFx0aWYgKCF1c2VySWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2UyZS5zZXRSb29tS2V5SUQnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvb20gPSBNZXRlb3IuY2FsbCgnY2FuQWNjZXNzUm9vbScsIHJpZCwgdXNlcklkKTtcblx0XHRpZiAoIXJvb20pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9vbScsICdJbnZhbGlkIHJvb20nLCB7IG1ldGhvZDogJ2UyZS5zZXRSb29tS2V5SUQnIH0pO1xuXHRcdH1cblxuXHRcdGlmIChyb29tLmUyZUtleUlkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb29tLWUyZS1rZXktYWxyZWFkeS1leGlzdHMnLCAnRTJFIEtleSBJRCBhbHJlYWR5IGV4aXN0cycsIHsgbWV0aG9kOiAnZTJlLnNldFJvb21LZXlJRCcgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvb21zLnNldEUyZUtleUlkKHJvb20uX2lkLCBrZXlJRCk7XG5cdH0sXG59KTtcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgUm9ja2V0Q2hhdCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2UyZS5zZXRVc2VyUHVibGljQW5kUGl2YXRlS2V5cycoeyBwdWJsaWNfa2V5LCBwcml2YXRlX2tleSB9KSB7XG5cdFx0Y29uc3QgdXNlcklkID0gTWV0ZW9yLnVzZXJJZCgpO1xuXG5cdFx0aWYgKCF1c2VySWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2UyZS5zZXRVc2VyUHVibGljQW5kUGl2YXRlS2V5cycgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnNldEUyRVB1YmxpY0FuZFBpdmF0ZUtleXNCeVVzZXJJZCh1c2VySWQsIHsgcHVibGljX2tleSwgcHJpdmF0ZV9rZXkgfSk7XG5cdH0sXG59KTtcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgUm9ja2V0Q2hhdCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2UyZS51cGRhdGVHcm91cEtleScocmlkLCB1aWQsIGtleSkge1xuXHRcdGNvbnN0IG15U3ViID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocmlkLCBNZXRlb3IudXNlcklkKCkpO1xuXHRcdGlmIChteVN1YikgeyAvLyBJIGhhdmUgYSBzdWJzY3JpcHRpb24gdG8gdGhpcyByb29tXG5cdFx0XHRjb25zdCB1c2VyU3ViID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocmlkLCB1aWQpO1xuXHRcdFx0aWYgKHVzZXJTdWIpIHsgLy8gdWlkIGFsc28gaGFzIHN1YnNjcmlwdGlvbiB0byB0aGlzIHJvb21cblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBkYXRlR3JvdXBFMkVLZXkodXNlclN1Yi5faWQsIGtleSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxufSk7XG4iLCJpbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0RTJlS2V5SWQgPSBmdW5jdGlvbihfaWQsIGUyZUtleUlkLCBvcHRpb25zKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZCxcblx0fTtcblxuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0ZTJlS2V5SWQsXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSwgb3B0aW9ucyk7XG59O1xuIiwiaW1wb3J0IHsgUm9ja2V0Q2hhdCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5cblJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBkYXRlR3JvdXBFMkVLZXkgPSBmdW5jdGlvbihfaWQsIGtleSkge1xuXHRjb25zdCBxdWVyeSA9IHsgX2lkIH07XG5cdGNvbnN0IHVwZGF0ZSA9IHsgJHNldDogeyBFMkVLZXk6IGtleSB9IH07XG5cdHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xuXHRyZXR1cm4gdGhpcy5maW5kT25lKHsgX2lkIH0pO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kQnlSaWRXaXRob3V0RTJFS2V5ID0gZnVuY3Rpb24ocmlkLCBvcHRpb25zKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdHJpZCxcblx0XHRFMkVLZXk6IHtcblx0XHRcdCRleGlzdHM6IGZhbHNlLFxuXHRcdH0sXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG59O1xuIiwiaW1wb3J0IHsgUm9ja2V0Q2hhdCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5cblJvY2tldENoYXQubW9kZWxzLlVzZXJzLnNldEUyRVB1YmxpY0FuZFBpdmF0ZUtleXNCeVVzZXJJZCA9IGZ1bmN0aW9uKHVzZXJJZCwgeyBwdWJsaWNfa2V5LCBwcml2YXRlX2tleSB9KSB7XG5cdHRoaXMudXBkYXRlKHsgX2lkOiB1c2VySWQgfSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdCdlMmUucHVibGljX2tleSc6IHB1YmxpY19rZXksXG5cdFx0XHQnZTJlLnByaXZhdGVfa2V5JzogcHJpdmF0ZV9rZXksXG5cdFx0fSxcblx0fSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5mZXRjaEtleXNCeVVzZXJJZCA9IGZ1bmN0aW9uKHVzZXJJZCkge1xuXHRjb25zdCB1c2VyID0gdGhpcy5maW5kT25lKHsgX2lkOiB1c2VySWQgfSwgeyBmaWVsZHM6IHsgZTJlOiAxIH0gfSk7XG5cblx0aWYgKCF1c2VyIHx8ICF1c2VyLmUyZSB8fCAhdXNlci5lMmUucHVibGljX2tleSkge1xuXHRcdHJldHVybiB7fTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0cHVibGljX2tleTogdXNlci5lMmUucHVibGljX2tleSxcblx0XHRwcml2YXRlX2tleTogdXNlci5lMmUucHJpdmF0ZV9rZXksXG5cdH07XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kQnlJZHNXaXRoUHVibGljRTJFS2V5ID0gZnVuY3Rpb24oaWRzLCBvcHRpb25zKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZDoge1xuXHRcdFx0JGluOiBpZHMsXG5cdFx0fSxcblx0XHQnZTJlLnB1YmxpY19rZXknOiB7XG5cdFx0XHQkZXhpc3RzOiAxLFxuXHRcdH0sXG5cdH07XG5cblx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG59O1xuIl19
