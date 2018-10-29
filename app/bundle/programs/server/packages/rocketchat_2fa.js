(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var Accounts = Package['accounts-base'].Accounts;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var SHA256 = Package.sha.SHA256;
var Random = Package.random.Random;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:2fa":{"server":{"lib":{"totp.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/rocketchat_2fa/server/lib/totp.js                                                            //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
let speakeasy;
module.watch(require("speakeasy"), {
  default(v) {
    speakeasy = v;
  }

}, 0);
RocketChat.TOTP = {
  generateSecret() {
    return speakeasy.generateSecret();
  },

  generateOtpauthURL(secret, username) {
    return speakeasy.otpauthURL({
      secret: secret.ascii,
      label: `Rocket.Chat:${username}`
    });
  },

  verify({
    secret,
    token,
    backupTokens,
    userId
  }) {
    // validates a backup code
    if (token.length === 8 && backupTokens) {
      const hashedCode = SHA256(token);
      const usedCode = backupTokens.indexOf(hashedCode);

      if (usedCode !== -1) {
        backupTokens.splice(usedCode, 1); // mark the code as used (remove it from the list)

        RocketChat.models.Users.update2FABackupCodesByUserId(userId, backupTokens);
        return true;
      }

      return false;
    }

    const maxDelta = RocketChat.settings.get('Accounts_TwoFactorAuthentication_MaxDelta');

    if (maxDelta) {
      const verifiedDelta = speakeasy.totp.verifyDelta({
        secret,
        encoding: 'base32',
        token,
        window: maxDelta
      });
      return verifiedDelta !== undefined;
    }

    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token
    });
  },

  generateCodes() {
    // generate 12 backup codes
    const codes = [];
    const hashedCodes = [];

    for (let i = 0; i < 12; i++) {
      const code = Random.id(8);
      codes.push(code);
      hashedCodes.push(SHA256(code));
    }

    return {
      codes,
      hashedCodes
    };
  }

};
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"checkCodesRemaining.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/rocketchat_2fa/server/methods/checkCodesRemaining.js                                         //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
Meteor.methods({
  '2fa:checkCodesRemaining'() {
    if (!Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    const user = Meteor.user();

    if (!user.services || !user.services.totp || !user.services.totp.enabled) {
      throw new Meteor.Error('invalid-totp');
    }

    return {
      remaining: user.services.totp.hashedBackup.length
    };
  }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////////

},"disable.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/rocketchat_2fa/server/methods/disable.js                                                     //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
Meteor.methods({
  '2fa:disable'(code) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    const user = Meteor.user();
    const verified = RocketChat.TOTP.verify({
      secret: user.services.totp.secret,
      token: code,
      userId: Meteor.userId(),
      backupTokens: user.services.totp.hashedBackup
    });

    if (!verified) {
      return false;
    }

    return RocketChat.models.Users.disable2FAByUserId(Meteor.userId());
  }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////////

},"enable.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/rocketchat_2fa/server/methods/enable.js                                                      //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
Meteor.methods({
  '2fa:enable'() {
    if (!Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    const user = Meteor.user();
    const secret = RocketChat.TOTP.generateSecret();
    RocketChat.models.Users.disable2FAAndSetTempSecretByUserId(Meteor.userId(), secret.base32);
    return {
      secret: secret.base32,
      url: RocketChat.TOTP.generateOtpauthURL(secret, user.username)
    };
  }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////////

},"regenerateCodes.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/rocketchat_2fa/server/methods/regenerateCodes.js                                             //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
Meteor.methods({
  '2fa:regenerateCodes'(userToken) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    const user = Meteor.user();

    if (!user.services || !user.services.totp || !user.services.totp.enabled) {
      throw new Meteor.Error('invalid-totp');
    }

    const verified = RocketChat.TOTP.verify({
      secret: user.services.totp.secret,
      token: userToken,
      userId: Meteor.userId(),
      backupTokens: user.services.totp.hashedBackup
    });

    if (verified) {
      const {
        codes,
        hashedCodes
      } = RocketChat.TOTP.generateCodes();
      RocketChat.models.Users.update2FABackupCodesByUserId(Meteor.userId(), hashedCodes);
      return {
        codes
      };
    }
  }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////////

},"validateTempToken.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/rocketchat_2fa/server/methods/validateTempToken.js                                           //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
Meteor.methods({
  '2fa:validateTempToken'(userToken) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    const user = Meteor.user();

    if (!user.services || !user.services.totp || !user.services.totp.tempSecret) {
      throw new Meteor.Error('invalid-totp');
    }

    const verified = RocketChat.TOTP.verify({
      secret: user.services.totp.tempSecret,
      token: userToken
    });

    if (verified) {
      const {
        codes,
        hashedCodes
      } = RocketChat.TOTP.generateCodes();
      RocketChat.models.Users.enable2FAAndSetSecretAndCodesByUserId(Meteor.userId(), user.services.totp.tempSecret, hashedCodes);
      return {
        codes
      };
    }
  }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"models":{"users.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/rocketchat_2fa/server/models/users.js                                                        //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
RocketChat.models.Users.disable2FAAndSetTempSecretByUserId = function (userId, tempToken) {
  return this.update({
    _id: userId
  }, {
    $set: {
      'services.totp': {
        enabled: false,
        tempSecret: tempToken
      }
    }
  });
};

RocketChat.models.Users.enable2FAAndSetSecretAndCodesByUserId = function (userId, secret, backupCodes) {
  return this.update({
    _id: userId
  }, {
    $set: {
      'services.totp.enabled': true,
      'services.totp.secret': secret,
      'services.totp.hashedBackup': backupCodes
    },
    $unset: {
      'services.totp.tempSecret': 1
    }
  });
};

RocketChat.models.Users.disable2FAByUserId = function (userId) {
  return this.update({
    _id: userId
  }, {
    $set: {
      'services.totp': {
        enabled: false
      }
    }
  });
};

RocketChat.models.Users.update2FABackupCodesByUserId = function (userId, backupCodes) {
  return this.update({
    _id: userId
  }, {
    $set: {
      'services.totp.hashedBackup': backupCodes
    }
  });
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup":{"settings.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/rocketchat_2fa/server/startup/settings.js                                                    //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
RocketChat.settings.addGroup('Accounts', function () {
  this.section('Two Factor Authentication', function () {
    this.add('Accounts_TwoFactorAuthentication_Enabled', true, {
      type: 'boolean',
      public: true
    });
    this.add('Accounts_TwoFactorAuthentication_MaxDelta', 1, {
      type: 'int',
      public: true,
      i18nLabel: 'Accounts_TwoFactorAuthentication_MaxDelta',
      enableQuery: {
        _id: 'Accounts_TwoFactorAuthentication_Enabled',
        value: true
      }
    });
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"loginHandler.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/rocketchat_2fa/server/loginHandler.js                                                        //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
Accounts.registerLoginHandler('totp', function (options) {
  if (!options.totp || !options.totp.code) {
    return;
  }

  return Accounts._runLoginHandlers(this, options.totp.login);
});
RocketChat.callbacks.add('onValidateLogin', login => {
  if (!RocketChat.settings.get('Accounts_TwoFactorAuthentication_Enabled')) {
    return;
  }

  if (login.type === 'password' && login.user.services && login.user.services.totp && login.user.services.totp.enabled === true) {
    const {
      totp
    } = login.methodArguments[0];

    if (!totp || !totp.code) {
      throw new Meteor.Error('totp-required', 'TOTP Required');
    }

    const verified = RocketChat.TOTP.verify({
      secret: login.user.services.totp.secret,
      token: totp.code,
      userId: login.user._id,
      backupTokens: login.user.services.totp.hashedBackup
    });

    if (verified !== true) {
      throw new Meteor.Error('totp-invalid', 'TOTP Invalid');
    }
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:2fa/server/lib/totp.js");
require("/node_modules/meteor/rocketchat:2fa/server/methods/checkCodesRemaining.js");
require("/node_modules/meteor/rocketchat:2fa/server/methods/disable.js");
require("/node_modules/meteor/rocketchat:2fa/server/methods/enable.js");
require("/node_modules/meteor/rocketchat:2fa/server/methods/regenerateCodes.js");
require("/node_modules/meteor/rocketchat:2fa/server/methods/validateTempToken.js");
require("/node_modules/meteor/rocketchat:2fa/server/models/users.js");
require("/node_modules/meteor/rocketchat:2fa/server/startup/settings.js");
require("/node_modules/meteor/rocketchat:2fa/server/loginHandler.js");

/* Exports */
Package._define("rocketchat:2fa");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_2fa.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDoyZmEvc2VydmVyL2xpYi90b3RwLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OjJmYS9zZXJ2ZXIvbWV0aG9kcy9jaGVja0NvZGVzUmVtYWluaW5nLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OjJmYS9zZXJ2ZXIvbWV0aG9kcy9kaXNhYmxlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OjJmYS9zZXJ2ZXIvbWV0aG9kcy9lbmFibGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6MmZhL3NlcnZlci9tZXRob2RzL3JlZ2VuZXJhdGVDb2Rlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDoyZmEvc2VydmVyL21ldGhvZHMvdmFsaWRhdGVUZW1wVG9rZW4uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6MmZhL3NlcnZlci9tb2RlbHMvdXNlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6MmZhL3NlcnZlci9zdGFydHVwL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OjJmYS9zZXJ2ZXIvbG9naW5IYW5kbGVyLmpzIl0sIm5hbWVzIjpbInNwZWFrZWFzeSIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiUm9ja2V0Q2hhdCIsIlRPVFAiLCJnZW5lcmF0ZVNlY3JldCIsImdlbmVyYXRlT3RwYXV0aFVSTCIsInNlY3JldCIsInVzZXJuYW1lIiwib3RwYXV0aFVSTCIsImFzY2lpIiwibGFiZWwiLCJ2ZXJpZnkiLCJ0b2tlbiIsImJhY2t1cFRva2VucyIsInVzZXJJZCIsImxlbmd0aCIsImhhc2hlZENvZGUiLCJTSEEyNTYiLCJ1c2VkQ29kZSIsImluZGV4T2YiLCJzcGxpY2UiLCJtb2RlbHMiLCJVc2VycyIsInVwZGF0ZTJGQUJhY2t1cENvZGVzQnlVc2VySWQiLCJtYXhEZWx0YSIsInNldHRpbmdzIiwiZ2V0IiwidmVyaWZpZWREZWx0YSIsInRvdHAiLCJ2ZXJpZnlEZWx0YSIsImVuY29kaW5nIiwid2luZG93IiwidW5kZWZpbmVkIiwiZ2VuZXJhdGVDb2RlcyIsImNvZGVzIiwiaGFzaGVkQ29kZXMiLCJpIiwiY29kZSIsIlJhbmRvbSIsImlkIiwicHVzaCIsIk1ldGVvciIsIm1ldGhvZHMiLCJFcnJvciIsInVzZXIiLCJzZXJ2aWNlcyIsImVuYWJsZWQiLCJyZW1haW5pbmciLCJoYXNoZWRCYWNrdXAiLCJ2ZXJpZmllZCIsImRpc2FibGUyRkFCeVVzZXJJZCIsImRpc2FibGUyRkFBbmRTZXRUZW1wU2VjcmV0QnlVc2VySWQiLCJiYXNlMzIiLCJ1cmwiLCJ1c2VyVG9rZW4iLCJ0ZW1wU2VjcmV0IiwiZW5hYmxlMkZBQW5kU2V0U2VjcmV0QW5kQ29kZXNCeVVzZXJJZCIsInRlbXBUb2tlbiIsInVwZGF0ZSIsIl9pZCIsIiRzZXQiLCJiYWNrdXBDb2RlcyIsIiR1bnNldCIsImFkZEdyb3VwIiwic2VjdGlvbiIsImFkZCIsInR5cGUiLCJwdWJsaWMiLCJpMThuTGFiZWwiLCJlbmFibGVRdWVyeSIsInZhbHVlIiwiQWNjb3VudHMiLCJyZWdpc3RlckxvZ2luSGFuZGxlciIsIm9wdGlvbnMiLCJfcnVuTG9naW5IYW5kbGVycyIsImxvZ2luIiwiY2FsbGJhY2tzIiwibWV0aG9kQXJndW1lbnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsU0FBSjtBQUFjQyxPQUFPQyxLQUFQLENBQWFDLFFBQVEsV0FBUixDQUFiLEVBQWtDO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDTCxnQkFBVUssQ0FBVjtBQUFZOztBQUF4QixDQUFsQyxFQUE0RCxDQUE1RDtBQUVkQyxXQUFXQyxJQUFY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O0FBQ0E7O0FBRUQsVUFBTU0sV0FBVy9DLFdBQVdDLElBQVgsQ0FBZ0JRLE1BQWhCLENBQXVCO0FBQ3ZDTCxjQUFRcUUsTUFBTS9CLElBQU4sQ0FBV0MsUUFBWCxDQUFvQmpCLElBQXBCLENBQXlCdEIsTUFETTtBQUV2Q00sYUFBT2dCLEtBQUtTLElBRjJCO0FBR3ZDdkIsY0FBUTZELE1BQU0vQixJQUFOLENBQVdlLEdBSG9CO0FBSXZDOUMsb0JBQWM4RCxNQUFNL0IsSUFBTixDQUFXQyxRQUFYLENBQW9CakIsSUFBcEIsQ0FBeUJvQjtBQUpBLEtBQXZCLENBQWpCOztBQU9BLFFBQUlDLGFBQWEsSUFBakIsRUFBdUI7QUFDdEIsWUFBTSxJQUFJUixPQUFPRSxLQUFYLENBQWlCLGNBQWpCLEVBQWlDLGNBQWpDLENBQU47QUFDQTtBQUNEO0FBQ0QsQ0F2QkQsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF8yZmEuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgc3BlYWtlYXN5IGZyb20gJ3NwZWFrZWFzeSc7XG5cblJvY2tldENoYXQuVE9UUCA9IHtcblx0Z2VuZXJhdGVTZWNyZXQoKSB7XG5cdFx0cmV0dXJuIHNwZWFrZWFzeS5nZW5lcmF0ZVNlY3JldCgpO1xuXHR9LFxuXG5cdGdlbmVyYXRlT3RwYXV0aFVSTChzZWNyZXQsIHVzZXJuYW1lKSB7XG5cdFx0cmV0dXJuIHNwZWFrZWFzeS5vdHBhdXRoVVJMKHtcblx0XHRcdHNlY3JldDogc2VjcmV0LmFzY2lpLFxuXHRcdFx0bGFiZWw6IGBSb2NrZXQuQ2hhdDokeyB1c2VybmFtZSB9YCxcblx0XHR9KTtcblx0fSxcblxuXHR2ZXJpZnkoeyBzZWNyZXQsIHRva2VuLCBiYWNrdXBUb2tlbnMsIHVzZXJJZCB9KSB7XG5cdFx0Ly8gdmFsaWRhdGVzIGEgYmFja3VwIGNvZGVcblx0XHRpZiAodG9rZW4ubGVuZ3RoID09PSA4ICYmIGJhY2t1cFRva2Vucykge1xuXHRcdFx0Y29uc3QgaGFzaGVkQ29kZSA9IFNIQTI1Nih0b2tlbik7XG5cdFx0XHRjb25zdCB1c2VkQ29kZSA9IGJhY2t1cFRva2Vucy5pbmRleE9mKGhhc2hlZENvZGUpO1xuXG5cdFx0XHRpZiAodXNlZENvZGUgIT09IC0xKSB7XG5cdFx0XHRcdGJhY2t1cFRva2Vucy5zcGxpY2UodXNlZENvZGUsIDEpO1xuXG5cdFx0XHRcdC8vIG1hcmsgdGhlIGNvZGUgYXMgdXNlZCAocmVtb3ZlIGl0IGZyb20gdGhlIGxpc3QpXG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnVwZGF0ZTJGQUJhY2t1cENvZGVzQnlVc2VySWQodXNlcklkLCBiYWNrdXBUb2tlbnMpO1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNvbnN0IG1heERlbHRhID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FjY291bnRzX1R3b0ZhY3RvckF1dGhlbnRpY2F0aW9uX01heERlbHRhJyk7XG5cdFx0aWYgKG1heERlbHRhKSB7XG5cdFx0XHRjb25zdCB2ZXJpZmllZERlbHRhID0gc3BlYWtlYXN5LnRvdHAudmVyaWZ5RGVsdGEoe1xuXHRcdFx0XHRzZWNyZXQsXG5cdFx0XHRcdGVuY29kaW5nOiAnYmFzZTMyJyxcblx0XHRcdFx0dG9rZW4sXG5cdFx0XHRcdHdpbmRvdzogbWF4RGVsdGEsXG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHZlcmlmaWVkRGVsdGEgIT09IHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRyZXR1cm4gc3BlYWtlYXN5LnRvdHAudmVyaWZ5KHtcblx0XHRcdHNlY3JldCxcblx0XHRcdGVuY29kaW5nOiAnYmFzZTMyJyxcblx0XHRcdHRva2VuLFxuXHRcdH0pO1xuXHR9LFxuXG5cdGdlbmVyYXRlQ29kZXMoKSB7XG5cdFx0Ly8gZ2VuZXJhdGUgMTIgYmFja3VwIGNvZGVzXG5cdFx0Y29uc3QgY29kZXMgPSBbXTtcblx0XHRjb25zdCBoYXNoZWRDb2RlcyA9IFtdO1xuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMTI7IGkrKykge1xuXHRcdFx0Y29uc3QgY29kZSA9IFJhbmRvbS5pZCg4KTtcblx0XHRcdGNvZGVzLnB1c2goY29kZSk7XG5cdFx0XHRoYXNoZWRDb2Rlcy5wdXNoKFNIQTI1Nihjb2RlKSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHsgY29kZXMsIGhhc2hlZENvZGVzIH07XG5cdH0sXG59O1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnMmZhOmNoZWNrQ29kZXNSZW1haW5pbmcnKCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdub3QtYXV0aG9yaXplZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcigpO1xuXG5cdFx0aWYgKCF1c2VyLnNlcnZpY2VzIHx8ICF1c2VyLnNlcnZpY2VzLnRvdHAgfHwgIXVzZXIuc2VydmljZXMudG90cC5lbmFibGVkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXRvdHAnKTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVtYWluaW5nOiB1c2VyLnNlcnZpY2VzLnRvdHAuaGFzaGVkQmFja3VwLmxlbmd0aCxcblx0XHR9O1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCcyZmE6ZGlzYWJsZScoY29kZSkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdub3QtYXV0aG9yaXplZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcigpO1xuXG5cdFx0Y29uc3QgdmVyaWZpZWQgPSBSb2NrZXRDaGF0LlRPVFAudmVyaWZ5KHtcblx0XHRcdHNlY3JldDogdXNlci5zZXJ2aWNlcy50b3RwLnNlY3JldCxcblx0XHRcdHRva2VuOiBjb2RlLFxuXHRcdFx0dXNlcklkOiBNZXRlb3IudXNlcklkKCksXG5cdFx0XHRiYWNrdXBUb2tlbnM6IHVzZXIuc2VydmljZXMudG90cC5oYXNoZWRCYWNrdXAsXG5cdFx0fSk7XG5cblx0XHRpZiAoIXZlcmlmaWVkKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmRpc2FibGUyRkFCeVVzZXJJZChNZXRlb3IudXNlcklkKCkpO1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCcyZmE6ZW5hYmxlJygpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm90LWF1dGhvcml6ZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXIoKTtcblxuXHRcdGNvbnN0IHNlY3JldCA9IFJvY2tldENoYXQuVE9UUC5nZW5lcmF0ZVNlY3JldCgpO1xuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZGlzYWJsZTJGQUFuZFNldFRlbXBTZWNyZXRCeVVzZXJJZChNZXRlb3IudXNlcklkKCksIHNlY3JldC5iYXNlMzIpO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHNlY3JldDogc2VjcmV0LmJhc2UzMixcblx0XHRcdHVybDogUm9ja2V0Q2hhdC5UT1RQLmdlbmVyYXRlT3RwYXV0aFVSTChzZWNyZXQsIHVzZXIudXNlcm5hbWUpLFxuXHRcdH07XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0JzJmYTpyZWdlbmVyYXRlQ29kZXMnKHVzZXJUb2tlbikge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdub3QtYXV0aG9yaXplZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcigpO1xuXG5cdFx0aWYgKCF1c2VyLnNlcnZpY2VzIHx8ICF1c2VyLnNlcnZpY2VzLnRvdHAgfHwgIXVzZXIuc2VydmljZXMudG90cC5lbmFibGVkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXRvdHAnKTtcblx0XHR9XG5cblx0XHRjb25zdCB2ZXJpZmllZCA9IFJvY2tldENoYXQuVE9UUC52ZXJpZnkoe1xuXHRcdFx0c2VjcmV0OiB1c2VyLnNlcnZpY2VzLnRvdHAuc2VjcmV0LFxuXHRcdFx0dG9rZW46IHVzZXJUb2tlbixcblx0XHRcdHVzZXJJZDogTWV0ZW9yLnVzZXJJZCgpLFxuXHRcdFx0YmFja3VwVG9rZW5zOiB1c2VyLnNlcnZpY2VzLnRvdHAuaGFzaGVkQmFja3VwLFxuXHRcdH0pO1xuXG5cdFx0aWYgKHZlcmlmaWVkKSB7XG5cdFx0XHRjb25zdCB7IGNvZGVzLCBoYXNoZWRDb2RlcyB9ID0gUm9ja2V0Q2hhdC5UT1RQLmdlbmVyYXRlQ29kZXMoKTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMudXBkYXRlMkZBQmFja3VwQ29kZXNCeVVzZXJJZChNZXRlb3IudXNlcklkKCksIGhhc2hlZENvZGVzKTtcblx0XHRcdHJldHVybiB7IGNvZGVzIH07XG5cdFx0fVxuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCcyZmE6dmFsaWRhdGVUZW1wVG9rZW4nKHVzZXJUb2tlbikge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdub3QtYXV0aG9yaXplZCcpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcigpO1xuXG5cdFx0aWYgKCF1c2VyLnNlcnZpY2VzIHx8ICF1c2VyLnNlcnZpY2VzLnRvdHAgfHwgIXVzZXIuc2VydmljZXMudG90cC50ZW1wU2VjcmV0KSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXRvdHAnKTtcblx0XHR9XG5cblx0XHRjb25zdCB2ZXJpZmllZCA9IFJvY2tldENoYXQuVE9UUC52ZXJpZnkoe1xuXHRcdFx0c2VjcmV0OiB1c2VyLnNlcnZpY2VzLnRvdHAudGVtcFNlY3JldCxcblx0XHRcdHRva2VuOiB1c2VyVG9rZW4sXG5cdFx0fSk7XG5cblx0XHRpZiAodmVyaWZpZWQpIHtcblx0XHRcdGNvbnN0IHsgY29kZXMsIGhhc2hlZENvZGVzIH0gPSBSb2NrZXRDaGF0LlRPVFAuZ2VuZXJhdGVDb2RlcygpO1xuXG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5lbmFibGUyRkFBbmRTZXRTZWNyZXRBbmRDb2Rlc0J5VXNlcklkKE1ldGVvci51c2VySWQoKSwgdXNlci5zZXJ2aWNlcy50b3RwLnRlbXBTZWNyZXQsIGhhc2hlZENvZGVzKTtcblx0XHRcdHJldHVybiB7IGNvZGVzIH07XG5cdFx0fVxuXHR9LFxufSk7XG4iLCJSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5kaXNhYmxlMkZBQW5kU2V0VGVtcFNlY3JldEJ5VXNlcklkID0gZnVuY3Rpb24odXNlcklkLCB0ZW1wVG9rZW4pIHtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHtcblx0XHRfaWQ6IHVzZXJJZCxcblx0fSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdCdzZXJ2aWNlcy50b3RwJzoge1xuXHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcblx0XHRcdFx0dGVtcFNlY3JldDogdGVtcFRva2VuLFxuXHRcdFx0fSxcblx0XHR9LFxuXHR9KTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlVzZXJzLmVuYWJsZTJGQUFuZFNldFNlY3JldEFuZENvZGVzQnlVc2VySWQgPSBmdW5jdGlvbih1c2VySWQsIHNlY3JldCwgYmFja3VwQ29kZXMpIHtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHtcblx0XHRfaWQ6IHVzZXJJZCxcblx0fSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdCdzZXJ2aWNlcy50b3RwLmVuYWJsZWQnOiB0cnVlLFxuXHRcdFx0J3NlcnZpY2VzLnRvdHAuc2VjcmV0Jzogc2VjcmV0LFxuXHRcdFx0J3NlcnZpY2VzLnRvdHAuaGFzaGVkQmFja3VwJzogYmFja3VwQ29kZXMsXG5cdFx0fSxcblx0XHQkdW5zZXQ6IHtcblx0XHRcdCdzZXJ2aWNlcy50b3RwLnRlbXBTZWNyZXQnOiAxLFxuXHRcdH0sXG5cdH0pO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZGlzYWJsZTJGQUJ5VXNlcklkID0gZnVuY3Rpb24odXNlcklkKSB7XG5cdHJldHVybiB0aGlzLnVwZGF0ZSh7XG5cdFx0X2lkOiB1c2VySWQsXG5cdH0sIHtcblx0XHQkc2V0OiB7XG5cdFx0XHQnc2VydmljZXMudG90cCc6IHtcblx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXG5cdFx0XHR9LFxuXHRcdH0sXG5cdH0pO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMudXBkYXRlMkZBQmFja3VwQ29kZXNCeVVzZXJJZCA9IGZ1bmN0aW9uKHVzZXJJZCwgYmFja3VwQ29kZXMpIHtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHtcblx0XHRfaWQ6IHVzZXJJZCxcblx0fSwge1xuXHRcdCRzZXQ6IHtcblx0XHRcdCdzZXJ2aWNlcy50b3RwLmhhc2hlZEJhY2t1cCc6IGJhY2t1cENvZGVzLFxuXHRcdH0sXG5cdH0pO1xufTtcbiIsIlJvY2tldENoYXQuc2V0dGluZ3MuYWRkR3JvdXAoJ0FjY291bnRzJywgZnVuY3Rpb24oKSB7XG5cdHRoaXMuc2VjdGlvbignVHdvIEZhY3RvciBBdXRoZW50aWNhdGlvbicsIGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWRkKCdBY2NvdW50c19Ud29GYWN0b3JBdXRoZW50aWNhdGlvbl9FbmFibGVkJywgdHJ1ZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdBY2NvdW50c19Ud29GYWN0b3JBdXRoZW50aWNhdGlvbl9NYXhEZWx0YScsIDEsIHtcblx0XHRcdHR5cGU6ICdpbnQnLFxuXHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0aTE4bkxhYmVsOiAnQWNjb3VudHNfVHdvRmFjdG9yQXV0aGVudGljYXRpb25fTWF4RGVsdGEnLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnQWNjb3VudHNfVHdvRmFjdG9yQXV0aGVudGljYXRpb25fRW5hYmxlZCcsXG5cdFx0XHRcdHZhbHVlOiB0cnVlLFxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSk7XG59KTtcblxuXG4iLCJBY2NvdW50cy5yZWdpc3RlckxvZ2luSGFuZGxlcigndG90cCcsIGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0aWYgKCFvcHRpb25zLnRvdHAgfHwgIW9wdGlvbnMudG90cC5jb2RlKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0cmV0dXJuIEFjY291bnRzLl9ydW5Mb2dpbkhhbmRsZXJzKHRoaXMsIG9wdGlvbnMudG90cC5sb2dpbik7XG59KTtcblxuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdvblZhbGlkYXRlTG9naW4nLCAobG9naW4pID0+IHtcblx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfVHdvRmFjdG9yQXV0aGVudGljYXRpb25fRW5hYmxlZCcpKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYgKGxvZ2luLnR5cGUgPT09ICdwYXNzd29yZCcgJiYgbG9naW4udXNlci5zZXJ2aWNlcyAmJiBsb2dpbi51c2VyLnNlcnZpY2VzLnRvdHAgJiYgbG9naW4udXNlci5zZXJ2aWNlcy50b3RwLmVuYWJsZWQgPT09IHRydWUpIHtcblx0XHRjb25zdCB7IHRvdHAgfSA9IGxvZ2luLm1ldGhvZEFyZ3VtZW50c1swXTtcblxuXHRcdGlmICghdG90cCB8fCAhdG90cC5jb2RlKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCd0b3RwLXJlcXVpcmVkJywgJ1RPVFAgUmVxdWlyZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCB2ZXJpZmllZCA9IFJvY2tldENoYXQuVE9UUC52ZXJpZnkoe1xuXHRcdFx0c2VjcmV0OiBsb2dpbi51c2VyLnNlcnZpY2VzLnRvdHAuc2VjcmV0LFxuXHRcdFx0dG9rZW46IHRvdHAuY29kZSxcblx0XHRcdHVzZXJJZDogbG9naW4udXNlci5faWQsXG5cdFx0XHRiYWNrdXBUb2tlbnM6IGxvZ2luLnVzZXIuc2VydmljZXMudG90cC5oYXNoZWRCYWNrdXAsXG5cdFx0fSk7XG5cblx0XHRpZiAodmVyaWZpZWQgIT09IHRydWUpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ3RvdHAtaW52YWxpZCcsICdUT1RQIEludmFsaWQnKTtcblx0XHR9XG5cdH1cbn0pO1xuIl19
