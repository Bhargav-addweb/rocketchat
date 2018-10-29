(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var Accounts = Package['accounts-base'].Accounts;
var ECMAScript = Package.ecmascript.ECMAScript;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var SyncedCron = Package['percolate:synced-cron'].SyncedCron;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var CustomOAuth = Package['rocketchat:custom-oauth'].CustomOAuth;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:tokenpass":{"common.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/common.js                                                                           //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
/* global CustomOAuth */
const config = {
  serverURL: '',
  identityPath: '/oauth/user',
  authorizePath: '/oauth/authorize',
  tokenPath: '/oauth/access-token',
  scope: 'user,tca,private-balances',
  tokenSentVia: 'payload',
  usernameField: 'username',
  mergeUsers: true,
  addAutopublishFields: {
    forLoggedInUser: ['services.tokenpass'],
    forOtherUsers: ['services.tokenpass.name']
  }
};
const Tokenpass = new CustomOAuth('tokenpass', config);

if (Meteor.isServer) {
  Meteor.startup(function () {
    RocketChat.settings.get('API_Tokenpass_URL', function (key, value) {
      config.serverURL = value;
      Tokenpass.configure(config);
    });
  });
} else {
  Meteor.startup(function () {
    Tracker.autorun(function () {
      if (RocketChat.settings.get('API_Tokenpass_URL')) {
        config.serverURL = RocketChat.settings.get('API_Tokenpass_URL');
        Tokenpass.configure(config);
      }
    });
  });
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server":{"startup.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/server/startup.js                                                                   //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
RocketChat.settings.addGroup('OAuth', function () {
  this.section('Tokenpass', function () {
    const enableQuery = {
      _id: 'Accounts_OAuth_Tokenpass',
      value: true
    };
    this.add('Accounts_OAuth_Tokenpass', false, {
      type: 'boolean'
    });
    this.add('API_Tokenpass_URL', '', {
      type: 'string',
      public: true,
      enableQuery,
      i18nDescription: 'API_Tokenpass_URL_Description'
    });
    this.add('Accounts_OAuth_Tokenpass_id', '', {
      type: 'string',
      enableQuery
    });
    this.add('Accounts_OAuth_Tokenpass_secret', '', {
      type: 'string',
      enableQuery
    });
    this.add('Accounts_OAuth_Tokenpass_callback_url', '_oauth/tokenpass', {
      type: 'relativeUrl',
      readonly: true,
      force: true,
      enableQuery
    });
  });
});

function validateTokenAccess(userData, roomData) {
  if (!userData || !userData.services || !userData.services.tokenpass || !userData.services.tokenpass.tcaBalances) {
    return false;
  }

  return RocketChat.Tokenpass.validateAccess(roomData.tokenpass, userData.services.tokenpass.tcaBalances);
}

Meteor.startup(function () {
  RocketChat.authz.addRoomAccessValidator(function (room, user) {
    if (!room || !room.tokenpass || !user) {
      return false;
    }

    const userData = RocketChat.models.Users.getTokenBalancesByUserId(user._id);
    return validateTokenAccess(userData, room);
  });
  RocketChat.callbacks.add('beforeJoinRoom', function (user, room) {
    if (room.tokenpass && !validateTokenAccess(user, room)) {
      throw new Meteor.Error('error-not-allowed', 'Token required', {
        method: 'joinRoom'
      });
    }

    return room;
  });
});
Accounts.onLogin(function ({
  user
}) {
  if (user && user.services && user.services.tokenpass) {
    RocketChat.updateUserTokenpassBalances(user);
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"functions":{"getProtectedTokenpassBalances.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/server/functions/getProtectedTokenpassBalances.js                                   //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let userAgent = 'Meteor';

if (Meteor.release) {
  userAgent += `/${Meteor.release}`;
}

RocketChat.getProtectedTokenpassBalances = function (accessToken) {
  try {
    return HTTP.get(`${RocketChat.settings.get('API_Tokenpass_URL')}/api/v1/tca/protected/balances`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': userAgent
      },
      params: {
        oauth_token: accessToken
      }
    }).data;
  } catch (error) {
    throw new Error(`Failed to fetch protected tokenpass balances from Tokenpass. ${error.message}`);
  }
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getPublicTokenpassBalances.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/server/functions/getPublicTokenpassBalances.js                                      //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let userAgent = 'Meteor';

if (Meteor.release) {
  userAgent += `/${Meteor.release}`;
}

RocketChat.getPublicTokenpassBalances = function (accessToken) {
  try {
    return HTTP.get(`${RocketChat.settings.get('API_Tokenpass_URL')}/api/v1/tca/public/balances`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': userAgent
      },
      params: {
        oauth_token: accessToken
      }
    }).data;
  } catch (error) {
    throw new Error(`Failed to fetch public tokenpass balances from Tokenpass. ${error.message}`);
  }
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomTokens.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/server/functions/saveRoomTokens.js                                                  //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
RocketChat.saveRoomTokenpass = function (rid, tokenpass) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      function: 'RocketChat.saveRoomTokens'
    });
  }

  return RocketChat.models.Rooms.setTokenpassById(rid, tokenpass);
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRoomTokensMinimumBalance.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/server/functions/saveRoomTokensMinimumBalance.js                                    //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);

RocketChat.saveRoomTokensMinimumBalance = function (rid, roomTokensMinimumBalance) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      function: 'RocketChat.saveRoomTokensMinimumBalance'
    });
  }

  const minimumTokenBalance = parseFloat(s.escapeHTML(roomTokensMinimumBalance));
  return RocketChat.models.Rooms.setMinimumTokenBalanceById(rid, minimumTokenBalance);
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"updateUserTokenpassBalances.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/server/functions/updateUserTokenpassBalances.js                                     //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

RocketChat.updateUserTokenpassBalances = function (user) {
  if (user && user.services && user.services.tokenpass) {
    const tcaPublicBalances = RocketChat.getPublicTokenpassBalances(user.services.tokenpass.accessToken);
    const tcaProtectedBalances = RocketChat.getProtectedTokenpassBalances(user.services.tokenpass.accessToken);

    const balances = _.uniq(_.union(tcaPublicBalances, tcaProtectedBalances), false, item => item.asset);

    RocketChat.models.Users.setTokenpassTcaBalances(user._id, balances);
    return balances;
  }
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"models":{"indexes.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/server/models/indexes.js                                                            //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
Meteor.startup(function () {
  RocketChat.models.Rooms.tryEnsureIndex({
    'tokenpass.tokens.token': 1
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Rooms.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/server/models/Rooms.js                                                              //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
RocketChat.models.Rooms.findByTokenpass = function (tokens) {
  const query = {
    'tokenpass.tokens.token': {
      $in: tokens
    }
  };
  return this._db.find(query).fetch();
};

RocketChat.models.Rooms.setTokensById = function (_id, tokens) {
  const update = {
    $set: {
      'tokenpass.tokens.token': tokens
    }
  };
  return this.update({
    _id
  }, update);
};

RocketChat.models.Rooms.setTokenpassById = function (_id, tokenpass) {
  const update = {
    $set: {
      tokenpass
    }
  };
  return this.update({
    _id
  }, update);
};

RocketChat.models.Rooms.findAllTokenChannels = function () {
  const query = {
    tokenpass: {
      $exists: true
    }
  };
  const options = {
    fields: {
      tokenpass: 1
    }
  };
  return this._db.find(query, options);
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Subscriptions.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/server/models/Subscriptions.js                                                      //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
RocketChat.models.Subscriptions.findByRoomIds = function (roomIds) {
  const query = {
    rid: {
      $in: roomIds
    }
  };
  const options = {
    fields: {
      'u._id': 1,
      rid: 1
    }
  };
  return this._db.find(query, options);
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Users.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/server/models/Users.js                                                              //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
RocketChat.models.Users.setTokenpassTcaBalances = function (_id, tcaBalances) {
  const update = {
    $set: {
      'services.tokenpass.tcaBalances': tcaBalances
    }
  };
  return this.update(_id, update);
};

RocketChat.models.Users.getTokenBalancesByUserId = function (userId) {
  const query = {
    _id: userId
  };
  const options = {
    fields: {
      'services.tokenpass.tcaBalances': 1
    }
  };
  return this.findOne(query, options);
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"findTokenChannels.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/server/methods/findTokenChannels.js                                                 //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
Meteor.methods({
  findTokenChannels() {
    if (!Meteor.userId()) {
      return [];
    }

    const user = Meteor.user();

    if (user.services && user.services.tokenpass && user.services.tokenpass.tcaBalances) {
      const tokens = {};
      user.services.tokenpass.tcaBalances.forEach(token => {
        tokens[token.asset] = 1;
      });
      return RocketChat.models.Rooms.findByTokenpass(Object.keys(tokens)).filter(room => RocketChat.Tokenpass.validateAccess(room.tokenpass, user.services.tokenpass.tcaBalances));
    }

    return [];
  }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getChannelTokenpass.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/server/methods/getChannelTokenpass.js                                               //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
Meteor.methods({
  getChannelTokenpass(rid) {
    check(rid, String);

    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'getChannelTokenpass'
      });
    }

    const room = RocketChat.models.Rooms.findOneById(rid);

    if (!room) {
      throw new Meteor.Error('error-invalid-room', 'Invalid room', {
        method: 'getChannelTokenpass'
      });
    }

    return room.tokenpass;
  }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"cronRemoveUsers.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/server/cronRemoveUsers.js                                                           //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
/* globals SyncedCron */
function removeUsersFromTokenChannels() {
  const rooms = {};
  RocketChat.models.Rooms.findAllTokenChannels().forEach(room => {
    rooms[room._id] = room.tokenpass;
  });
  const users = {};
  RocketChat.models.Subscriptions.findByRoomIds(Object.keys(rooms)).forEach(sub => {
    if (!users[sub.u._id]) {
      users[sub.u._id] = [];
    }

    users[sub.u._id].push(sub.rid);
  });
  Object.keys(users).forEach(user => {
    const userInfo = RocketChat.models.Users.findOneById(user);

    if (userInfo && userInfo.services && userInfo.services.tokenpass) {
      const balances = RocketChat.updateUserTokenpassBalances(userInfo);
      users[user].forEach(roomId => {
        const valid = RocketChat.Tokenpass.validateAccess(rooms[roomId], balances);

        if (!valid) {
          RocketChat.removeUserFromRoom(roomId, userInfo);
        }
      });
    }
  });
}

Meteor.startup(function () {
  Meteor.defer(function () {
    removeUsersFromTokenChannels();
    SyncedCron.add({
      name: 'Remove users from Token Channels',
      schedule: parser => parser.cron('0 * * * *'),
      job: removeUsersFromTokenChannels
    });
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Tokenpass.js":function(require){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_tokenpass/server/Tokenpass.js                                                                 //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
RocketChat.Tokenpass = {
  validateAccess(tokenpass, balances) {
    const compFunc = tokenpass.require === 'any' ? 'some' : 'every';
    return tokenpass.tokens[compFunc](config => balances.some(userToken => config.token === userToken.asset && parseFloat(config.balance) <= parseFloat(userToken.balance)));
  }

};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:tokenpass/common.js");
require("/node_modules/meteor/rocketchat:tokenpass/server/startup.js");
require("/node_modules/meteor/rocketchat:tokenpass/server/functions/getProtectedTokenpassBalances.js");
require("/node_modules/meteor/rocketchat:tokenpass/server/functions/getPublicTokenpassBalances.js");
require("/node_modules/meteor/rocketchat:tokenpass/server/functions/saveRoomTokens.js");
require("/node_modules/meteor/rocketchat:tokenpass/server/functions/saveRoomTokensMinimumBalance.js");
require("/node_modules/meteor/rocketchat:tokenpass/server/functions/updateUserTokenpassBalances.js");
require("/node_modules/meteor/rocketchat:tokenpass/server/models/indexes.js");
require("/node_modules/meteor/rocketchat:tokenpass/server/models/Rooms.js");
require("/node_modules/meteor/rocketchat:tokenpass/server/models/Subscriptions.js");
require("/node_modules/meteor/rocketchat:tokenpass/server/models/Users.js");
require("/node_modules/meteor/rocketchat:tokenpass/server/methods/findTokenChannels.js");
require("/node_modules/meteor/rocketchat:tokenpass/server/methods/getChannelTokenpass.js");
require("/node_modules/meteor/rocketchat:tokenpass/server/cronRemoveUsers.js");
require("/node_modules/meteor/rocketchat:tokenpass/server/Tokenpass.js");

/* Exports */
Package._define("rocketchat:tokenpass");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_tokenpass.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp0b2tlbnBhc3MvY29tbW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnRva2VucGFzcy9zZXJ2ZXIvc3RhcnR1cC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp0b2tlbnBhc3Mvc2VydmVyL2Z1bmN0aW9ucy9nZXRQcm90ZWN0ZWRUb2tlbnBhc3NCYWxhbmNlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp0b2tlbnBhc3Mvc2VydmVyL2Z1bmN0aW9ucy9nZXRQdWJsaWNUb2tlbnBhc3NCYWxhbmNlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp0b2tlbnBhc3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbVRva2Vucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp0b2tlbnBhc3Mvc2VydmVyL2Z1bmN0aW9ucy9zYXZlUm9vbVRva2Vuc01pbmltdW1CYWxhbmNlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnRva2VucGFzcy9zZXJ2ZXIvZnVuY3Rpb25zL3VwZGF0ZVVzZXJUb2tlbnBhc3NCYWxhbmNlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp0b2tlbnBhc3Mvc2VydmVyL21vZGVscy9pbmRleGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnRva2VucGFzcy9zZXJ2ZXIvbW9kZWxzL1Jvb21zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnRva2VucGFzcy9zZXJ2ZXIvbW9kZWxzL1N1YnNjcmlwdGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6dG9rZW5wYXNzL3NlcnZlci9tb2RlbHMvVXNlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6dG9rZW5wYXNzL3NlcnZlci9tZXRob2RzL2ZpbmRUb2tlbkNoYW5uZWxzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnRva2VucGFzcy9zZXJ2ZXIvbWV0aG9kcy9nZXRDaGFubmVsVG9rZW5wYXNzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnRva2VucGFzcy9zZXJ2ZXIvY3JvblJlbW92ZVVzZXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnRva2VucGFzcy9zZXJ2ZXIvVG9rZW5wYXNzLmpzIl0sIm5hbWVzIjpbImNvbmZpZyIsInNlcnZlclVSTCIsImlkZW50aXR5UGF0aCIsImF1dGhvcml6ZVBhdGgiLCJ0b2tlblBhdGgiLCJzY29wZSIsInRva2VuU2VudFZpYSIsInVzZXJuYW1lRmllbGQiLCJtZXJnZVVzZXJzIiwiYWRkQXV0b3B1Ymxpc2hGaWVsZHMiLCJmb3JMb2dnZWRJblVzZXIiLCJmb3JPdGhlclVzZXJzIiwiVG9rZW5wYXNzIiwiQ3VzdG9tT0F1dGgiLCJNZXRlb3IiLCJpc1NlcnZlciIsInN0YXJ0dXAiLCJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJnZXQiLCJrZXkiLCJ2YWx1ZSIsImNvbmZpZ3VyZSIsIlRyYWNrZXIiLCJhdXRvcnVuIiwiYWRkR3JvdXAiLCJzZWN0aW9uIiwiZW5hYmxlUXVlcnkiLCJfaWQiLCJhZGQiLCJ0eXBlIiwicHVibGljIiwiaTE4bkRlc2NyaXB0aW9uIiwicmVhZG9ubHkiLCJmb3JjZSIsInZhbGlkYXRlVG9rZW5BY2Nlc3MiLCJ1c2VyRGF0YSIsInJvb21EYXRhIiwic2VydmljZXMiLCJ0b2tlbnBhc3MiLCJ0Y2FCYWxhbmNlcyIsInZhbGlkYXRlQWNjZXNzIiwiYXV0aHoiLCJhZGRSb29tQWNjZXNzVmFsaWRhdG9yIiwicm9vbSIsInVzZXIiLCJtb2RlbHMiLCJVc2VycyIsImdldFRva2VuQmFsYW5jZXNCeVVzZXJJZCIsImNhbGxiYWNrcyIsIkVycm9yIiwibWV0aG9kIiwiQWNjb3VudHMiLCJvbkxvZ2luIiwidXBkYXRlVXNlclRva2VucGFzc0JhbGFuY2VzIiwidXNlckFnZW50IiwicmVsZWFzZSIsImdldFByb3RlY3RlZFRva2VucGFzc0JhbGFuY2VzIiwiYWNjZXNzVG9rZW4iLCJIVFRQIiwiaGVhZGVycyIsIkFjY2VwdCIsInBhcmFtcyIsIm9hdXRoX3Rva2VuIiwiZGF0YSIsImVycm9yIiwibWVzc2FnZSIsImdldFB1YmxpY1Rva2VucGFzc0JhbGFuY2VzIiwic2F2ZVJvb21Ub2tlbnBhc3MiLCJyaWQiLCJNYXRjaCIsInRlc3QiLCJTdHJpbmciLCJmdW5jdGlvbiIsIlJvb21zIiwic2V0VG9rZW5wYXNzQnlJZCIsInMiLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsInNhdmVSb29tVG9rZW5zTWluaW11bUJhbGFuY2UiLCJyb29tVG9rZW5zTWluaW11bUJhbGFuY2UiLCJtaW5pbXVtVG9rZW5CYWxhbmNlIiwicGFyc2VGbG9hdCIsImVzY2FwZUhUTUwiLCJzZXRNaW5pbXVtVG9rZW5CYWxhbmNlQnlJZCIsIl8iLCJ0Y2FQdWJsaWNCYWxhbmNlcyIsInRjYVByb3RlY3RlZEJhbGFuY2VzIiwiYmFsYW5jZXMiLCJ1bmlxIiwidW5pb24iLCJpdGVtIiwiYXNzZXQiLCJzZXRUb2tlbnBhc3NUY2FCYWxhbmNlcyIsInRyeUVuc3VyZUluZGV4IiwiZmluZEJ5VG9rZW5wYXNzIiwidG9rZW5zIiwicXVlcnkiLCIkaW4iLCJfZGIiLCJmaW5kIiwiZmV0Y2giLCJzZXRUb2tlbnNCeUlkIiwidXBkYXRlIiwiJHNldCIsImZpbmRBbGxUb2tlbkNoYW5uZWxzIiwiJGV4aXN0cyIsIm9wdGlvbnMiLCJmaWVsZHMiLCJTdWJzY3JpcHRpb25zIiwiZmluZEJ5Um9vbUlkcyIsInJvb21JZHMiLCJ1c2VySWQiLCJmaW5kT25lIiwibWV0aG9kcyIsImZpbmRUb2tlbkNoYW5uZWxzIiwiZm9yRWFjaCIsInRva2VuIiwiT2JqZWN0Iiwia2V5cyIsImZpbHRlciIsImdldENoYW5uZWxUb2tlbnBhc3MiLCJjaGVjayIsImZpbmRPbmVCeUlkIiwicmVtb3ZlVXNlcnNGcm9tVG9rZW5DaGFubmVscyIsInJvb21zIiwidXNlcnMiLCJzdWIiLCJ1IiwicHVzaCIsInVzZXJJbmZvIiwicm9vbUlkIiwidmFsaWQiLCJyZW1vdmVVc2VyRnJvbVJvb20iLCJkZWZlciIsIlN5bmNlZENyb24iLCJuYW1lIiwic2NoZWR1bGUiLCJwYXJzZXIiLCJjcm9uIiwiam9iIiwiY29tcEZ1bmMiLCJzb21lIiwidXNlclRva2VuIiwiYmFsYW5jZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUVBLE1BQU1BLFNBQVM7QUFDZEMsYUFBVyxFQURHO0FBRWRDLGdCQUFjLGFBRkE7QUFHZEMsaUJBQWUsa0JBSEQ7QUFJZEMsYUFBVyxxQkFKRztBQUtkQyxTQUFPLDJCQUxPO0FBTWRDLGdCQUFjLFNBTkE7QUFPZEMsaUJBQWUsVUFQRDtBQVFkQyxjQUFZLElBUkU7QUFTZEMsd0JBQXNCO0FBQ3JCQyxxQkFBaUIsQ0FBQyxvQkFBRCxDQURJO0FBRXJCQyxtQkFBZSxDQUFDLHlCQUFEO0FBRk07QUFUUixDQUFmO0FBZUEsTUFBTUMsWUFBWSxJQUFJQyxXQUFKLENBQWdCLFdBQWhCLEVBQTZCYixNQUE3QixDQUFsQjs7QUFFQSxJQUFJYyxPQUFPQyxRQUFYLEVBQXFCO0FBQ3BCRCxTQUFPRSxPQUFQLENBQWUsWUFBVztBQUN6QkMsZUFBV0MsUUFBWCxDQUFvQkMsR0FBcEIsQ0FBd0IsbUJBQXhCLEVBQTZDLFVBQVNDLEdBQVQsRUFBY0MsS0FBZCxFQUFxQjtBQUNqRXJCLGFBQU9DLFNBQVAsR0FBbUJvQixLQUFuQjtBQUNBVCxnQkFBVVUsU0FBVixDQUFvQnRCLE1BQXBCO0FBQ0EsS0FIRDtBQUlBLEdBTEQ7QUFNQSxDQVBELE1BT087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SCxXQUFXTCxTQUFYLENBQXFCNkIsY0FBckIsQ0FBb0N1RixNQUFNTSxNQUFOLENBQXBDLEVBQW1EM0MsUUFBbkQsQ0FBZDs7QUFFQSxZQUFJLENBQUM0QyxLQUFMLEVBQVk7QUFDWHRILHFCQUFXdUgsa0JBQVgsQ0FBOEJGLE1BQTlCLEVBQXNDRCxRQUF0QztBQUNBO0FBQ0QsT0FORDtBQU9BO0FBQ0QsR0FkRDtBQWVBOztBQUVEdkgsT0FBT0UsT0FBUCxDQUFlLFlBQVc7QUFDekJGLFNBQU8ySCxLQUFQLENBQWEsWUFBVztBQUN2QlY7QUFFQVcsZUFBVzdHLEdBQVgsQ0FBZTtBQUNkOEcsWUFBTSxrQ0FEUTtBQUVkQyxnQkFBV0MsTUFBRCxJQUFZQSxPQUFPQyxJQUFQLENBQVksV0FBWixDQUZSO0FBR2RDLFdBQUtoQjtBQUhTLEtBQWY7QUFLQSxHQVJEO0FBU0EsQ0FWRCxFOzs7Ozs7Ozs7OztBQ2xDQTlHLFdBQVdMLFNBQVgsR0FBdUI7QUFDdEI2QixpQkFBZUYsU0FBZixFQUEwQm9ELFFBQTFCLEVBQW9DO0FBQ25DLFVBQU1xRCxXQUFXekcsVUFBVXdDLE9BQVYsS0FBc0IsS0FBdEIsR0FBOEIsTUFBOUIsR0FBdUMsT0FBeEQ7QUFDQSxXQUFPeEMsVUFBVTRELE1BQVYsQ0FBaUI2QyxRQUFqQixFQUE0QmhKLE1BQUQsSUFBWTJGLFNBQVNzRCxJQUFULENBQWVDLFNBQUQsSUFBZWxKLE9BQU93SCxLQUFQLEtBQWlCMEIsVUFBVW5ELEtBQTNCLElBQW9DVixXQUFXckYsT0FBT21KLE9BQWxCLEtBQThCOUQsV0FBVzZELFVBQVVDLE9BQXJCLENBQS9GLENBQXZDLENBQVA7QUFDQTs7QUFKcUIsQ0FBdkIsQyIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF90b2tlbnBhc3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWwgQ3VzdG9tT0F1dGggKi9cblxuY29uc3QgY29uZmlnID0ge1xuXHRzZXJ2ZXJVUkw6ICcnLFxuXHRpZGVudGl0eVBhdGg6ICcvb2F1dGgvdXNlcicsXG5cdGF1dGhvcml6ZVBhdGg6ICcvb2F1dGgvYXV0aG9yaXplJyxcblx0dG9rZW5QYXRoOiAnL29hdXRoL2FjY2Vzcy10b2tlbicsXG5cdHNjb3BlOiAndXNlcix0Y2EscHJpdmF0ZS1iYWxhbmNlcycsXG5cdHRva2VuU2VudFZpYTogJ3BheWxvYWQnLFxuXHR1c2VybmFtZUZpZWxkOiAndXNlcm5hbWUnLFxuXHRtZXJnZVVzZXJzOiB0cnVlLFxuXHRhZGRBdXRvcHVibGlzaEZpZWxkczoge1xuXHRcdGZvckxvZ2dlZEluVXNlcjogWydzZXJ2aWNlcy50b2tlbnBhc3MnXSxcblx0XHRmb3JPdGhlclVzZXJzOiBbJ3NlcnZpY2VzLnRva2VucGFzcy5uYW1lJ10sXG5cdH0sXG59O1xuXG5jb25zdCBUb2tlbnBhc3MgPSBuZXcgQ3VzdG9tT0F1dGgoJ3Rva2VucGFzcycsIGNvbmZpZyk7XG5cbmlmIChNZXRlb3IuaXNTZXJ2ZXIpIHtcblx0TWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FQSV9Ub2tlbnBhc3NfVVJMJywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHRcdFx0Y29uZmlnLnNlcnZlclVSTCA9IHZhbHVlO1xuXHRcdFx0VG9rZW5wYXNzLmNvbmZpZ3VyZShjb25maWcpO1xuXHRcdH0pO1xuXHR9KTtcbn0gZWxzZSB7XG5cdE1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRcdFRyYWNrZXIuYXV0b3J1bihmdW5jdGlvbigpIHtcblx0XHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX1Rva2VucGFzc19VUkwnKSkge1xuXHRcdFx0XHRjb25maWcuc2VydmVyVVJMID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FQSV9Ub2tlbnBhc3NfVVJMJyk7XG5cdFx0XHRcdFRva2VucGFzcy5jb25maWd1cmUoY29uZmlnKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG59XG4iLCJSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdPQXV0aCcsIGZ1bmN0aW9uKCkge1xuXHR0aGlzLnNlY3Rpb24oJ1Rva2VucGFzcycsIGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IGVuYWJsZVF1ZXJ5ID0ge1xuXHRcdFx0X2lkOiAnQWNjb3VudHNfT0F1dGhfVG9rZW5wYXNzJyxcblx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdH07XG5cblx0XHR0aGlzLmFkZCgnQWNjb3VudHNfT0F1dGhfVG9rZW5wYXNzJywgZmFsc2UsIHsgdHlwZTogJ2Jvb2xlYW4nIH0pO1xuXHRcdHRoaXMuYWRkKCdBUElfVG9rZW5wYXNzX1VSTCcsICcnLCB7IHR5cGU6ICdzdHJpbmcnLCBwdWJsaWM6IHRydWUsIGVuYWJsZVF1ZXJ5LCBpMThuRGVzY3JpcHRpb246ICdBUElfVG9rZW5wYXNzX1VSTF9EZXNjcmlwdGlvbicgfSk7XG5cdFx0dGhpcy5hZGQoJ0FjY291bnRzX09BdXRoX1Rva2VucGFzc19pZCcsICcnLCB7IHR5cGU6ICdzdHJpbmcnLCBlbmFibGVRdWVyeSB9KTtcblx0XHR0aGlzLmFkZCgnQWNjb3VudHNfT0F1dGhfVG9rZW5wYXNzX3NlY3JldCcsICcnLCB7IHR5cGU6ICdzdHJpbmcnLCBlbmFibGVRdWVyeSB9KTtcblx0XHR0aGlzLmFkZCgnQWNjb3VudHNfT0F1dGhfVG9rZW5wYXNzX2NhbGxiYWNrX3VybCcsICdfb2F1dGgvdG9rZW5wYXNzJywgeyB0eXBlOiAncmVsYXRpdmVVcmwnLCByZWFkb25seTogdHJ1ZSwgZm9yY2U6IHRydWUsIGVuYWJsZVF1ZXJ5IH0pO1xuXHR9KTtcbn0pO1xuXG5mdW5jdGlvbiB2YWxpZGF0ZVRva2VuQWNjZXNzKHVzZXJEYXRhLCByb29tRGF0YSkge1xuXHRpZiAoIXVzZXJEYXRhIHx8ICF1c2VyRGF0YS5zZXJ2aWNlcyB8fCAhdXNlckRhdGEuc2VydmljZXMudG9rZW5wYXNzIHx8ICF1c2VyRGF0YS5zZXJ2aWNlcy50b2tlbnBhc3MudGNhQmFsYW5jZXMpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5Ub2tlbnBhc3MudmFsaWRhdGVBY2Nlc3Mocm9vbURhdGEudG9rZW5wYXNzLCB1c2VyRGF0YS5zZXJ2aWNlcy50b2tlbnBhc3MudGNhQmFsYW5jZXMpO1xufVxuXG5NZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0Um9ja2V0Q2hhdC5hdXRoei5hZGRSb29tQWNjZXNzVmFsaWRhdG9yKGZ1bmN0aW9uKHJvb20sIHVzZXIpIHtcblx0XHRpZiAoIXJvb20gfHwgIXJvb20udG9rZW5wYXNzIHx8ICF1c2VyKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXNlckRhdGEgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5nZXRUb2tlbkJhbGFuY2VzQnlVc2VySWQodXNlci5faWQpO1xuXG5cdFx0cmV0dXJuIHZhbGlkYXRlVG9rZW5BY2Nlc3ModXNlckRhdGEsIHJvb20pO1xuXHR9KTtcblxuXHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2JlZm9yZUpvaW5Sb29tJywgZnVuY3Rpb24odXNlciwgcm9vbSkge1xuXHRcdGlmIChyb29tLnRva2VucGFzcyAmJiAhdmFsaWRhdGVUb2tlbkFjY2Vzcyh1c2VyLCByb29tKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnVG9rZW4gcmVxdWlyZWQnLCB7IG1ldGhvZDogJ2pvaW5Sb29tJyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcm9vbTtcblx0fSk7XG59KTtcblxuQWNjb3VudHMub25Mb2dpbihmdW5jdGlvbih7IHVzZXIgfSkge1xuXHRpZiAodXNlciAmJiB1c2VyLnNlcnZpY2VzICYmIHVzZXIuc2VydmljZXMudG9rZW5wYXNzKSB7XG5cdFx0Um9ja2V0Q2hhdC51cGRhdGVVc2VyVG9rZW5wYXNzQmFsYW5jZXModXNlcik7XG5cdH1cbn0pO1xuIiwibGV0IHVzZXJBZ2VudCA9ICdNZXRlb3InO1xuaWYgKE1ldGVvci5yZWxlYXNlKSB7IHVzZXJBZ2VudCArPSBgLyR7IE1ldGVvci5yZWxlYXNlIH1gOyB9XG5cblJvY2tldENoYXQuZ2V0UHJvdGVjdGVkVG9rZW5wYXNzQmFsYW5jZXMgPSBmdW5jdGlvbihhY2Nlc3NUb2tlbikge1xuXHR0cnkge1xuXHRcdHJldHVybiBIVFRQLmdldChcblx0XHRcdGAkeyBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX1Rva2VucGFzc19VUkwnKSB9L2FwaS92MS90Y2EvcHJvdGVjdGVkL2JhbGFuY2VzYCwge1xuXHRcdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdFx0QWNjZXB0OiAnYXBwbGljYXRpb24vanNvbicsXG5cdFx0XHRcdFx0J1VzZXItQWdlbnQnOiB1c2VyQWdlbnQsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRcdG9hdXRoX3Rva2VuOiBhY2Nlc3NUb2tlbixcblx0XHRcdFx0fSxcblx0XHRcdH0pLmRhdGE7XG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZmV0Y2ggcHJvdGVjdGVkIHRva2VucGFzcyBiYWxhbmNlcyBmcm9tIFRva2VucGFzcy4gJHsgZXJyb3IubWVzc2FnZSB9YCk7XG5cdH1cbn07XG4iLCJsZXQgdXNlckFnZW50ID0gJ01ldGVvcic7XG5pZiAoTWV0ZW9yLnJlbGVhc2UpIHsgdXNlckFnZW50ICs9IGAvJHsgTWV0ZW9yLnJlbGVhc2UgfWA7IH1cblxuUm9ja2V0Q2hhdC5nZXRQdWJsaWNUb2tlbnBhc3NCYWxhbmNlcyA9IGZ1bmN0aW9uKGFjY2Vzc1Rva2VuKSB7XG5cdHRyeSB7XG5cdFx0cmV0dXJuIEhUVFAuZ2V0KFxuXHRcdFx0YCR7IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfVG9rZW5wYXNzX1VSTCcpIH0vYXBpL3YxL3RjYS9wdWJsaWMvYmFsYW5jZXNgLCB7XG5cdFx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0XHRBY2NlcHQ6ICdhcHBsaWNhdGlvbi9qc29uJyxcblx0XHRcdFx0XHQnVXNlci1BZ2VudCc6IHVzZXJBZ2VudCxcblx0XHRcdFx0fSxcblx0XHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdFx0b2F1dGhfdG9rZW46IGFjY2Vzc1Rva2VuLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSkuZGF0YTtcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBmZXRjaCBwdWJsaWMgdG9rZW5wYXNzIGJhbGFuY2VzIGZyb20gVG9rZW5wYXNzLiAkeyBlcnJvci5tZXNzYWdlIH1gKTtcblx0fVxufTtcbiIsIlJvY2tldENoYXQuc2F2ZVJvb21Ub2tlbnBhc3MgPSBmdW5jdGlvbihyaWQsIHRva2VucGFzcykge1xuXHRpZiAoIU1hdGNoLnRlc3QocmlkLCBTdHJpbmcpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHtcblx0XHRcdGZ1bmN0aW9uOiAnUm9ja2V0Q2hhdC5zYXZlUm9vbVRva2VucycsXG5cdFx0fSk7XG5cdH1cblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0VG9rZW5wYXNzQnlJZChyaWQsIHRva2VucGFzcyk7XG59O1xuIiwiaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuXG5Sb2NrZXRDaGF0LnNhdmVSb29tVG9rZW5zTWluaW11bUJhbGFuY2UgPSBmdW5jdGlvbihyaWQsIHJvb21Ub2tlbnNNaW5pbXVtQmFsYW5jZSkge1xuXHRpZiAoIU1hdGNoLnRlc3QocmlkLCBTdHJpbmcpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1yb29tJywgJ0ludmFsaWQgcm9vbScsIHtcblx0XHRcdGZ1bmN0aW9uOiAnUm9ja2V0Q2hhdC5zYXZlUm9vbVRva2Vuc01pbmltdW1CYWxhbmNlJyxcblx0XHR9KTtcblx0fVxuXG5cdGNvbnN0IG1pbmltdW1Ub2tlbkJhbGFuY2UgPSBwYXJzZUZsb2F0KHMuZXNjYXBlSFRNTChyb29tVG9rZW5zTWluaW11bUJhbGFuY2UpKTtcblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0TWluaW11bVRva2VuQmFsYW5jZUJ5SWQocmlkLCBtaW5pbXVtVG9rZW5CYWxhbmNlKTtcbn07XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuUm9ja2V0Q2hhdC51cGRhdGVVc2VyVG9rZW5wYXNzQmFsYW5jZXMgPSBmdW5jdGlvbih1c2VyKSB7XG5cdGlmICh1c2VyICYmIHVzZXIuc2VydmljZXMgJiYgdXNlci5zZXJ2aWNlcy50b2tlbnBhc3MpIHtcblx0XHRjb25zdCB0Y2FQdWJsaWNCYWxhbmNlcyA9IFJvY2tldENoYXQuZ2V0UHVibGljVG9rZW5wYXNzQmFsYW5jZXModXNlci5zZXJ2aWNlcy50b2tlbnBhc3MuYWNjZXNzVG9rZW4pO1xuXHRcdGNvbnN0IHRjYVByb3RlY3RlZEJhbGFuY2VzID0gUm9ja2V0Q2hhdC5nZXRQcm90ZWN0ZWRUb2tlbnBhc3NCYWxhbmNlcyh1c2VyLnNlcnZpY2VzLnRva2VucGFzcy5hY2Nlc3NUb2tlbik7XG5cblx0XHRjb25zdCBiYWxhbmNlcyA9IF8udW5pcShfLnVuaW9uKHRjYVB1YmxpY0JhbGFuY2VzLCB0Y2FQcm90ZWN0ZWRCYWxhbmNlcyksIGZhbHNlLCAoaXRlbSkgPT4gaXRlbS5hc3NldCk7XG5cblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5zZXRUb2tlbnBhc3NUY2FCYWxhbmNlcyh1c2VyLl9pZCwgYmFsYW5jZXMpO1xuXG5cdFx0cmV0dXJuIGJhbGFuY2VzO1xuXHR9XG59O1xuIiwiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnRyeUVuc3VyZUluZGV4KHsgJ3Rva2VucGFzcy50b2tlbnMudG9rZW4nOiAxIH0pO1xufSk7XG4iLCJSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlUb2tlbnBhc3MgPSBmdW5jdGlvbih0b2tlbnMpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0J3Rva2VucGFzcy50b2tlbnMudG9rZW4nOiB7XG5cdFx0XHQkaW46IHRva2Vucyxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLl9kYi5maW5kKHF1ZXJ5KS5mZXRjaCgpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0VG9rZW5zQnlJZCA9IGZ1bmN0aW9uKF9pZCwgdG9rZW5zKSB7XG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHQndG9rZW5wYXNzLnRva2Vucy50b2tlbic6IHRva2Vucyxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLnVwZGF0ZSh7IF9pZCB9LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0VG9rZW5wYXNzQnlJZCA9IGZ1bmN0aW9uKF9pZCwgdG9rZW5wYXNzKSB7XG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHR0b2tlbnBhc3MsXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy51cGRhdGUoeyBfaWQgfSwgdXBkYXRlKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRBbGxUb2tlbkNoYW5uZWxzID0gZnVuY3Rpb24oKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdHRva2VucGFzczogeyAkZXhpc3RzOiB0cnVlIH0sXG5cdH07XG5cdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0ZmllbGRzOiB7XG5cdFx0XHR0b2tlbnBhc3M6IDEsXG5cdFx0fSxcblx0fTtcblx0cmV0dXJuIHRoaXMuX2RiLmZpbmQocXVlcnksIG9wdGlvbnMpO1xufTtcbiIsIlJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZEJ5Um9vbUlkcyA9IGZ1bmN0aW9uKHJvb21JZHMpIHtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0cmlkOiB7XG5cdFx0XHQkaW46IHJvb21JZHMsXG5cdFx0fSxcblx0fTtcblx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRmaWVsZHM6IHtcblx0XHRcdCd1Ll9pZCc6IDEsXG5cdFx0XHRyaWQ6IDEsXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy5fZGIuZmluZChxdWVyeSwgb3B0aW9ucyk7XG59O1xuIiwiUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuc2V0VG9rZW5wYXNzVGNhQmFsYW5jZXMgPSBmdW5jdGlvbihfaWQsIHRjYUJhbGFuY2VzKSB7XG5cdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHQkc2V0OiB7XG5cdFx0XHQnc2VydmljZXMudG9rZW5wYXNzLnRjYUJhbGFuY2VzJzogdGNhQmFsYW5jZXMsXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy51cGRhdGUoX2lkLCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZ2V0VG9rZW5CYWxhbmNlc0J5VXNlcklkID0gZnVuY3Rpb24odXNlcklkKSB7XG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdF9pZDogdXNlcklkLFxuXHR9O1xuXG5cdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0ZmllbGRzOiB7XG5cdFx0XHQnc2VydmljZXMudG9rZW5wYXNzLnRjYUJhbGFuY2VzJzogMSxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLmZpbmRPbmUocXVlcnksIG9wdGlvbnMpO1xufTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0ZmluZFRva2VuQ2hhbm5lbHMoKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHJldHVybiBbXTtcblx0XHR9XG5cblx0XHRjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXIoKTtcblxuXHRcdGlmICh1c2VyLnNlcnZpY2VzICYmIHVzZXIuc2VydmljZXMudG9rZW5wYXNzICYmIHVzZXIuc2VydmljZXMudG9rZW5wYXNzLnRjYUJhbGFuY2VzKSB7XG5cdFx0XHRjb25zdCB0b2tlbnMgPSB7fTtcblx0XHRcdHVzZXIuc2VydmljZXMudG9rZW5wYXNzLnRjYUJhbGFuY2VzLmZvckVhY2goKHRva2VuKSA9PiB7XG5cdFx0XHRcdHRva2Vuc1t0b2tlbi5hc3NldF0gPSAxO1xuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlUb2tlbnBhc3MoT2JqZWN0LmtleXModG9rZW5zKSlcblx0XHRcdFx0LmZpbHRlcigocm9vbSkgPT4gUm9ja2V0Q2hhdC5Ub2tlbnBhc3MudmFsaWRhdGVBY2Nlc3Mocm9vbS50b2tlbnBhc3MsIHVzZXIuc2VydmljZXMudG9rZW5wYXNzLnRjYUJhbGFuY2VzKSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFtdO1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdGdldENoYW5uZWxUb2tlbnBhc3MocmlkKSB7XG5cdFx0Y2hlY2socmlkLCBTdHJpbmcpO1xuXG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2dldENoYW5uZWxUb2tlbnBhc3MnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyaWQpO1xuXG5cdFx0aWYgKCFyb29tKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywgeyBtZXRob2Q6ICdnZXRDaGFubmVsVG9rZW5wYXNzJyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcm9vbS50b2tlbnBhc3M7XG5cdH0sXG59KTtcbiIsIi8qIGdsb2JhbHMgU3luY2VkQ3JvbiAqL1xuZnVuY3Rpb24gcmVtb3ZlVXNlcnNGcm9tVG9rZW5DaGFubmVscygpIHtcblx0Y29uc3Qgcm9vbXMgPSB7fTtcblxuXHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQWxsVG9rZW5DaGFubmVscygpLmZvckVhY2goKHJvb20pID0+IHtcblx0XHRyb29tc1tyb29tLl9pZF0gPSByb29tLnRva2VucGFzcztcblx0fSk7XG5cblx0Y29uc3QgdXNlcnMgPSB7fTtcblxuXHRSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRCeVJvb21JZHMoT2JqZWN0LmtleXMocm9vbXMpKS5mb3JFYWNoKChzdWIpID0+IHtcblx0XHRpZiAoIXVzZXJzW3N1Yi51Ll9pZF0pIHtcblx0XHRcdHVzZXJzW3N1Yi51Ll9pZF0gPSBbXTtcblx0XHR9XG5cdFx0dXNlcnNbc3ViLnUuX2lkXS5wdXNoKHN1Yi5yaWQpO1xuXHR9KTtcblxuXHRPYmplY3Qua2V5cyh1c2VycykuZm9yRWFjaCgodXNlcikgPT4ge1xuXHRcdGNvbnN0IHVzZXJJbmZvID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodXNlcik7XG5cblx0XHRpZiAodXNlckluZm8gJiYgdXNlckluZm8uc2VydmljZXMgJiYgdXNlckluZm8uc2VydmljZXMudG9rZW5wYXNzKSB7XG5cdFx0XHRjb25zdCBiYWxhbmNlcyA9IFJvY2tldENoYXQudXBkYXRlVXNlclRva2VucGFzc0JhbGFuY2VzKHVzZXJJbmZvKTtcblxuXHRcdFx0dXNlcnNbdXNlcl0uZm9yRWFjaCgocm9vbUlkKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHZhbGlkID0gUm9ja2V0Q2hhdC5Ub2tlbnBhc3MudmFsaWRhdGVBY2Nlc3Mocm9vbXNbcm9vbUlkXSwgYmFsYW5jZXMpO1xuXG5cdFx0XHRcdGlmICghdmFsaWQpIHtcblx0XHRcdFx0XHRSb2NrZXRDaGF0LnJlbW92ZVVzZXJGcm9tUm9vbShyb29tSWQsIHVzZXJJbmZvKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9KTtcbn1cblxuTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdE1ldGVvci5kZWZlcihmdW5jdGlvbigpIHtcblx0XHRyZW1vdmVVc2Vyc0Zyb21Ub2tlbkNoYW5uZWxzKCk7XG5cblx0XHRTeW5jZWRDcm9uLmFkZCh7XG5cdFx0XHRuYW1lOiAnUmVtb3ZlIHVzZXJzIGZyb20gVG9rZW4gQ2hhbm5lbHMnLFxuXHRcdFx0c2NoZWR1bGU6IChwYXJzZXIpID0+IHBhcnNlci5jcm9uKCcwICogKiAqIConKSxcblx0XHRcdGpvYjogcmVtb3ZlVXNlcnNGcm9tVG9rZW5DaGFubmVscyxcblx0XHR9KTtcblx0fSk7XG59KTtcbiIsIlJvY2tldENoYXQuVG9rZW5wYXNzID0ge1xuXHR2YWxpZGF0ZUFjY2Vzcyh0b2tlbnBhc3MsIGJhbGFuY2VzKSB7XG5cdFx0Y29uc3QgY29tcEZ1bmMgPSB0b2tlbnBhc3MucmVxdWlyZSA9PT0gJ2FueScgPyAnc29tZScgOiAnZXZlcnknO1xuXHRcdHJldHVybiB0b2tlbnBhc3MudG9rZW5zW2NvbXBGdW5jXSgoY29uZmlnKSA9PiBiYWxhbmNlcy5zb21lKCh1c2VyVG9rZW4pID0+IGNvbmZpZy50b2tlbiA9PT0gdXNlclRva2VuLmFzc2V0ICYmIHBhcnNlRmxvYXQoY29uZmlnLmJhbGFuY2UpIDw9IHBhcnNlRmxvYXQodXNlclRva2VuLmJhbGFuY2UpKSk7XG5cdH0sXG59O1xuIl19
