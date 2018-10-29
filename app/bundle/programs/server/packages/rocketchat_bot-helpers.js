(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Accounts = Package['accounts-base'].Accounts;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var fieldsSetting;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:bot-helpers":{"server":{"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// packages/rocketchat_bot-helpers/server/index.js                                                    //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

/**
 * BotHelpers helps bots
 * "private" properties use meteor collection cursors, so they stay reactive
 * "public" properties use getters to fetch and filter collections as array
 */
class BotHelpers {
  constructor() {
    this.queries = {
      online: {
        status: {
          $ne: 'offline'
        }
      },
      users: {
        roles: {
          $not: {
            $all: ['bot']
          }
        }
      }
    };
  } // setup collection cursors with array of fields from setting


  setupCursors(fieldsSetting) {
    this.userFields = {};

    if (typeof fieldsSetting === 'string') {
      fieldsSetting = fieldsSetting.split(',');
    }

    fieldsSetting.forEach(n => {
      this.userFields[n.trim()] = 1;
    });
    this._allUsers = RocketChat.models.Users.find(this.queries.users, {
      fields: this.userFields
    });
    this._onlineUsers = RocketChat.models.Users.find({
      $and: [this.queries.users, this.queries.online]
    }, {
      fields: this.userFields
    });
  } // request methods or props as arguments to Meteor.call


  request(prop, ...params) {
    if (typeof this[prop] === 'undefined') {
      return null;
    } else if (typeof this[prop] === 'function') {
      return this[prop](...params);
    } else {
      return this[prop];
    }
  }

  addUserToRole(userName, roleName) {
    Meteor.call('authorization:addUserToRole', roleName, userName);
  }

  removeUserFromRole(userName, roleName) {
    Meteor.call('authorization:removeUserFromRole', roleName, userName);
  }

  addUserToRoom(userName, room) {
    const foundRoom = RocketChat.models.Rooms.findOneByIdOrName(room);

    if (!_.isObject(foundRoom)) {
      throw new Meteor.Error('invalid-channel');
    }

    const data = {};
    data.rid = foundRoom._id;
    data.username = userName;
    Meteor.call('addUserToRoom', data);
  }

  removeUserFromRoom(userName, room) {
    const foundRoom = RocketChat.models.Rooms.findOneByIdOrName(room);

    if (!_.isObject(foundRoom)) {
      throw new Meteor.Error('invalid-channel');
    }

    const data = {};
    data.rid = foundRoom._id;
    data.username = userName;
    Meteor.call('removeUserFromRoom', data);
  } // generic error whenever property access insufficient to fill request


  requestError() {
    throw new Meteor.Error('error-not-allowed', 'Bot request not allowed', {
      method: 'botRequest',
      action: 'bot_request'
    });
  } // "public" properties accessed by getters
  // allUsers / onlineUsers return whichever properties are enabled by settings


  get allUsers() {
    if (!Object.keys(this.userFields).length) {
      this.requestError();
      return false;
    } else {
      return this._allUsers.fetch();
    }
  }

  get onlineUsers() {
    if (!Object.keys(this.userFields).length) {
      this.requestError();
      return false;
    } else {
      return this._onlineUsers.fetch();
    }
  }

  get allUsernames() {
    if (!this.userFields.hasOwnProperty('username')) {
      this.requestError();
      return false;
    } else {
      return this._allUsers.fetch().map(user => user.username);
    }
  }

  get onlineUsernames() {
    if (!this.userFields.hasOwnProperty('username')) {
      this.requestError();
      return false;
    } else {
      return this._onlineUsers.fetch().map(user => user.username);
    }
  }

  get allNames() {
    if (!this.userFields.hasOwnProperty('name')) {
      this.requestError();
      return false;
    } else {
      return this._allUsers.fetch().map(user => user.name);
    }
  }

  get onlineNames() {
    if (!this.userFields.hasOwnProperty('name')) {
      this.requestError();
      return false;
    } else {
      return this._onlineUsers.fetch().map(user => user.name);
    }
  }

  get allIDs() {
    if (!this.userFields.hasOwnProperty('_id') || !this.userFields.hasOwnProperty('username')) {
      this.requestError();
      return false;
    } else {
      return this._allUsers.fetch().map(user => ({
        id: user._id,
        name: user.username
      }));
    }
  }

  get onlineIDs() {
    if (!this.userFields.hasOwnProperty('_id') || !this.userFields.hasOwnProperty('username')) {
      this.requestError();
      return false;
    } else {
      return this._onlineUsers.fetch().map(user => ({
        id: user._id,
        name: user.username
      }));
    }
  }

} // add class to meteor methods


const botHelpers = new BotHelpers(); // init cursors with fields setting and update on setting change

RocketChat.settings.get('BotHelpers_userFields', function (settingKey, settingValue) {
  botHelpers.setupCursors(settingValue);
});
Meteor.methods({
  botRequest: (...args) => {
    const userID = Meteor.userId();

    if (userID && RocketChat.authz.hasRole(userID, 'bot')) {
      return botHelpers.request(...args);
    } else {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'botRequest'
      });
    }
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// packages/rocketchat_bot-helpers/server/settings.js                                                 //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
Meteor.startup(function () {
  RocketChat.settings.addGroup('Bots', function () {
    this.add('BotHelpers_userFields', '_id, name, username, emails, language, utcOffset', {
      type: 'string',
      section: 'Helpers',
      i18nLabel: 'BotHelpers_userFields',
      i18nDescription: 'BotHelpers_userFields_Description'
    });
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:bot-helpers/server/index.js");
require("/node_modules/meteor/rocketchat:bot-helpers/server/settings.js");

/* Exports */
Package._define("rocketchat:bot-helpers");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_bot-helpers.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpib3QtaGVscGVycy9zZXJ2ZXIvaW5kZXguanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Ym90LWhlbHBlcnMvc2VydmVyL3NldHRpbmdzLmpzIl0sIm5hbWVzIjpbIl8iLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsIkJvdEhlbHBlcnMiLCJjb25zdHJ1Y3RvciIsInF1ZXJpZXMiLCJvbmxpbmUiLCJzdGF0dXMiLCIkbmUiLCJ1c2VycyIsInJvbGVzIiwiJG5vdCIsIiRhbGwiLCJzZXR1cEN1cnNvcnMiLCJmaWVsZHNTZXR0aW5nIiwidXNlckZpZWxkcyIsInNwbGl0IiwiZm9yRWFjaCIsIm4iLCJ0cmltIiwiX2FsbFVzZXJzIiwiUm9ja2V0Q2hhdCIsIm1vZGVscyIsIlVzZXJzIiwiZmluZCIsImZpZWxkcyIsIl9vbmxpbmVVc2VycyIsIiRhbmQiLCJyZXF1ZXN0IiwicHJvcCIsInBhcmFtcyIsImFkZFVzZXJUb1JvbGUiLCJ1c2VyTmFtZSIsInJvbGVOYW1lIiwiTWV0ZW9yIiwiY2FsbCIsInJlbW92ZVVzZXJGcm9tUm9sZSIsImFkZFVzZXJUb1Jvb20iLCJyb29tIiwiZm91bmRSb29tIiwiUm9vbXMiLCJmaW5kT25lQnlJZE9yTmFtZSIsImlzT2JqZWN0IiwiRXJyb3IiLCJkYXRhIiwicmlkIiwiX2lkIiwidXNlcm5hbWUiLCJyZW1vdmVVc2VyRnJvbVJvb20iLCJyZXF1ZXN0RXJyb3IiLCJtZXRob2QiLCJhY3Rpb24iLCJhbGxVc2VycyIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJmZXRjaCIsIm9ubGluZVVzZXJzIiwiYWxsVXNlcm5hbWVzIiwiaGFzT3duUHJvcGVydHkiLCJtYXAiLCJ1c2VyIiwib25saW5lVXNlcm5hbWVzIiwiYWxsTmFtZXMiLCJuYW1lIiwib25saW5lTmFtZXMiLCJhbGxJRHMiLCJpZCIsIm9ubGluZUlEcyIsImJvdEhlbHBlcnMiLCJzZXR0aW5ncyIsImdldCIsInNldHRpbmdLZXkiLCJzZXR0aW5nVmFsdWUiLCJtZXRob2RzIiwiYm90UmVxdWVzdCIsImFyZ3MiLCJ1c2VySUQiLCJ1c2VySWQiLCJhdXRoeiIsImhhc1JvbGUiLCJzdGFydHVwIiwiYWRkR3JvdXAiLCJhZGQiLCJ0eXBlIiwic2VjdGlvbiIsImkxOG5MYWJlbCIsImkxOG5EZXNjcmlwdGlvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxDQUFKOztBQUFNQyxPQUFPQyxLQUFQLENBQWFDLFFBQVEsWUFBUixDQUFiLEVBQW1DO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDTCxRQUFFSyxDQUFGO0FBQUk7O0FBQWhCLENBQW5DLEVBQXFELENBQXJEOztBQUVOOzs7OztBQUtBLE1BQU1DLFVBQU4sQ0FBaUI7QUFDaEJDLGdCQUFjO0FBQ2IsU0FBS0MsT0FBTCxHQUFlO0FBQ2RDLGNBQVE7QUFBRUMsZ0JBQVE7QUFBRUMsZUFBSztBQUFQO0FBQVYsT0FETTtBQUVkQyxhQUFPO0FBQUVDLGVBQU87QUFBRUMsZ0JBQU07QUFBRUMsa0JBQU0sQ0FBQyxLQUFEO0FBQVI7QUFBUjtBQUFUO0FBRk8sS0FBZjtBQUlBLEdBTmUsQ0FRaEI7OztBQUNBQyxlQUFhQyxhQUFiLEVBQTRCO0FBQzNCLFNBQUtDLFVBQUwsR0FBa0IsRUFBbEI7O0FBQ0EsUUFBSSxPQUFPRCxhQUFQLEtBQXlCLFFBQTdCLEVBQXVDO0FBQ3RDQSxzQkFBZ0JBLGNBQWNFLEtBQWQsQ0FBb0IsR0FBcEIsQ0FBaEI7QUFDQTs7QUFDREYsa0JBQWNHLE9BQWQsQ0FBdUJDLENBQUQsSUFBTztBQUM1QixXQUFLSCxVQUFMLENBQWdCRyxFQUFFQyxJQUFGLEVBQWhCLElBQTRCLENBQTVCO0FBQ0EsS0FGRDtBQUdBLFNBQUtDLFNBQUwsR0FBaUJDLFdBQVdDLE1BQVgsQ0FBa0JDLEtBQWxCLENBQXdCQyxJQUF4QixDQUE2QixLQUFLbkIs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QUFvQkMsR0FBcEIsQ0FBd0IsdUJBQXhCLEVBQWlELFVBQVNDLFVBQVQsRUFBcUJDLFlBQXJCLEVBQW1DO0FBQ25GSixhQUFXeEQsWUFBWCxDQUF3QjRELFlBQXhCO0FBQ0EsQ0FGRDtBQUlBdkMsT0FBT3dDLE9BQVAsQ0FBZTtBQUNkQyxjQUFZLENBQUMsR0FBR0MsSUFBSixLQUFhO0FBQ3hCLFVBQU1DLFNBQVMzQyxPQUFPNEMsTUFBUCxFQUFmOztBQUNBLFFBQUlELFVBQVV4RCxXQUFXMEQsS0FBWCxDQUFpQkMsT0FBakIsQ0FBeUJILE1BQXpCLEVBQWlDLEtBQWpDLENBQWQsRUFBdUQ7QUFDdEQsYUFBT1IsV0FBV3pDLE9BQVgsQ0FBbUIsR0FBR2dELElBQXRCLENBQVA7QUFDQSxLQUZELE1BRU87QUFDTixZQUFNLElBQUkxQyxPQUFPUyxLQUFYLENBQWlCLG9CQUFqQixFQUF1QyxjQUF2QyxFQUF1RDtBQUFFTyxnQkFBUTtBQUFWLE9BQXZELENBQU47QUFDQTtBQUNEO0FBUmEsQ0FBZixFOzs7Ozs7Ozs7OztBQ3pKQWhCLE9BQU8rQyxPQUFQLENBQWUsWUFBVztBQUN6QjVELGFBQVdpRCxRQUFYLENBQW9CWSxRQUFwQixDQUE2QixNQUE3QixFQUFxQyxZQUFXO0FBQy9DLFNBQUtDLEdBQUwsQ0FBUyx1QkFBVCxFQUFrQyxrREFBbEMsRUFBc0Y7QUFDckZDLFlBQU0sUUFEK0U7QUFFckZDLGVBQVMsU0FGNEU7QUFHckZDLGlCQUFXLHVCQUgwRTtBQUlyRkMsdUJBQWlCO0FBSm9FLEtBQXRGO0FBTUEsR0FQRDtBQVFBLENBVEQsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9ib3QtaGVscGVycy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG4vKipcbiAqIEJvdEhlbHBlcnMgaGVscHMgYm90c1xuICogXCJwcml2YXRlXCIgcHJvcGVydGllcyB1c2UgbWV0ZW9yIGNvbGxlY3Rpb24gY3Vyc29ycywgc28gdGhleSBzdGF5IHJlYWN0aXZlXG4gKiBcInB1YmxpY1wiIHByb3BlcnRpZXMgdXNlIGdldHRlcnMgdG8gZmV0Y2ggYW5kIGZpbHRlciBjb2xsZWN0aW9ucyBhcyBhcnJheVxuICovXG5jbGFzcyBCb3RIZWxwZXJzIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dGhpcy5xdWVyaWVzID0ge1xuXHRcdFx0b25saW5lOiB7IHN0YXR1czogeyAkbmU6ICdvZmZsaW5lJyB9IH0sXG5cdFx0XHR1c2VyczogeyByb2xlczogeyAkbm90OiB7ICRhbGw6IFsnYm90J10gfSB9IH0sXG5cdFx0fTtcblx0fVxuXG5cdC8vIHNldHVwIGNvbGxlY3Rpb24gY3Vyc29ycyB3aXRoIGFycmF5IG9mIGZpZWxkcyBmcm9tIHNldHRpbmdcblx0c2V0dXBDdXJzb3JzKGZpZWxkc1NldHRpbmcpIHtcblx0XHR0aGlzLnVzZXJGaWVsZHMgPSB7fTtcblx0XHRpZiAodHlwZW9mIGZpZWxkc1NldHRpbmcgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRmaWVsZHNTZXR0aW5nID0gZmllbGRzU2V0dGluZy5zcGxpdCgnLCcpO1xuXHRcdH1cblx0XHRmaWVsZHNTZXR0aW5nLmZvckVhY2goKG4pID0+IHtcblx0XHRcdHRoaXMudXNlckZpZWxkc1tuLnRyaW0oKV0gPSAxO1xuXHRcdH0pO1xuXHRcdHRoaXMuX2FsbFVzZXJzID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZCh0aGlzLnF1ZXJpZXMudXNlcnMsIHsgZmllbGRzOiB0aGlzLnVzZXJGaWVsZHMgfSk7XG5cdFx0dGhpcy5fb25saW5lVXNlcnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kKHsgJGFuZDogW3RoaXMucXVlcmllcy51c2VycywgdGhpcy5xdWVyaWVzLm9ubGluZV0gfSwgeyBmaWVsZHM6IHRoaXMudXNlckZpZWxkcyB9KTtcblx0fVxuXG5cdC8vIHJlcXVlc3QgbWV0aG9kcyBvciBwcm9wcyBhcyBhcmd1bWVudHMgdG8gTWV0ZW9yLmNhbGxcblx0cmVxdWVzdChwcm9wLCAuLi5wYXJhbXMpIHtcblx0XHRpZiAodHlwZW9mIHRoaXNbcHJvcF0gPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiB0aGlzW3Byb3BdID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRyZXR1cm4gdGhpc1twcm9wXSguLi5wYXJhbXMpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpc1twcm9wXTtcblx0XHR9XG5cdH1cblxuXHRhZGRVc2VyVG9Sb2xlKHVzZXJOYW1lLCByb2xlTmFtZSkge1xuXHRcdE1ldGVvci5jYWxsKCdhdXRob3JpemF0aW9uOmFkZFVzZXJUb1JvbGUnLCByb2xlTmFtZSwgdXNlck5hbWUpO1xuXHR9XG5cblx0cmVtb3ZlVXNlckZyb21Sb2xlKHVzZXJOYW1lLCByb2xlTmFtZSkge1xuXHRcdE1ldGVvci5jYWxsKCdhdXRob3JpemF0aW9uOnJlbW92ZVVzZXJGcm9tUm9sZScsIHJvbGVOYW1lLCB1c2VyTmFtZSk7XG5cdH1cblxuXHRhZGRVc2VyVG9Sb29tKHVzZXJOYW1lLCByb29tKSB7XG5cdFx0Y29uc3QgZm91bmRSb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWRPck5hbWUocm9vbSk7XG5cblx0XHRpZiAoIV8uaXNPYmplY3QoZm91bmRSb29tKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1jaGFubmVsJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZGF0YSA9IHt9O1xuXHRcdGRhdGEucmlkID0gZm91bmRSb29tLl9pZDtcblx0XHRkYXRhLnVzZXJuYW1lID0gdXNlck5hbWU7XG5cdFx0TWV0ZW9yLmNhbGwoJ2FkZFVzZXJUb1Jvb20nLCBkYXRhKTtcblx0fVxuXG5cdHJlbW92ZVVzZXJGcm9tUm9vbSh1c2VyTmFtZSwgcm9vbSkge1xuXHRcdGNvbnN0IGZvdW5kUm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkT3JOYW1lKHJvb20pO1xuXG5cdFx0aWYgKCFfLmlzT2JqZWN0KGZvdW5kUm9vbSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2ludmFsaWQtY2hhbm5lbCcpO1xuXHRcdH1cblx0XHRjb25zdCBkYXRhID0ge307XG5cdFx0ZGF0YS5yaWQgPSBmb3VuZFJvb20uX2lkO1xuXHRcdGRhdGEudXNlcm5hbWUgPSB1c2VyTmFtZTtcblx0XHRNZXRlb3IuY2FsbCgncmVtb3ZlVXNlckZyb21Sb29tJywgZGF0YSk7XG5cdH1cblxuXHQvLyBnZW5lcmljIGVycm9yIHdoZW5ldmVyIHByb3BlcnR5IGFjY2VzcyBpbnN1ZmZpY2llbnQgdG8gZmlsbCByZXF1ZXN0XG5cdHJlcXVlc3RFcnJvcigpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdCb3QgcmVxdWVzdCBub3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnYm90UmVxdWVzdCcsIGFjdGlvbjogJ2JvdF9yZXF1ZXN0JyB9KTtcblx0fVxuXG5cdC8vIFwicHVibGljXCIgcHJvcGVydGllcyBhY2Nlc3NlZCBieSBnZXR0ZXJzXG5cdC8vIGFsbFVzZXJzIC8gb25saW5lVXNlcnMgcmV0dXJuIHdoaWNoZXZlciBwcm9wZXJ0aWVzIGFyZSBlbmFibGVkIGJ5IHNldHRpbmdzXG5cdGdldCBhbGxVc2VycygpIHtcblx0XHRpZiAoIU9iamVjdC5rZXlzKHRoaXMudXNlckZpZWxkcykubGVuZ3RoKSB7XG5cdFx0XHR0aGlzLnJlcXVlc3RFcnJvcigpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fYWxsVXNlcnMuZmV0Y2goKTtcblx0XHR9XG5cdH1cblx0Z2V0IG9ubGluZVVzZXJzKCkge1xuXHRcdGlmICghT2JqZWN0LmtleXModGhpcy51c2VyRmllbGRzKS5sZW5ndGgpIHtcblx0XHRcdHRoaXMucmVxdWVzdEVycm9yKCk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9vbmxpbmVVc2Vycy5mZXRjaCgpO1xuXHRcdH1cblx0fVxuXHRnZXQgYWxsVXNlcm5hbWVzKCkge1xuXHRcdGlmICghdGhpcy51c2VyRmllbGRzLmhhc093blByb3BlcnR5KCd1c2VybmFtZScpKSB7XG5cdFx0XHR0aGlzLnJlcXVlc3RFcnJvcigpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fYWxsVXNlcnMuZmV0Y2goKS5tYXAoKHVzZXIpID0+IHVzZXIudXNlcm5hbWUpO1xuXHRcdH1cblx0fVxuXHRnZXQgb25saW5lVXNlcm5hbWVzKCkge1xuXHRcdGlmICghdGhpcy51c2VyRmllbGRzLmhhc093blByb3BlcnR5KCd1c2VybmFtZScpKSB7XG5cdFx0XHR0aGlzLnJlcXVlc3RFcnJvcigpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fb25saW5lVXNlcnMuZmV0Y2goKS5tYXAoKHVzZXIpID0+IHVzZXIudXNlcm5hbWUpO1xuXHRcdH1cblx0fVxuXHRnZXQgYWxsTmFtZXMoKSB7XG5cdFx0aWYgKCF0aGlzLnVzZXJGaWVsZHMuaGFzT3duUHJvcGVydHkoJ25hbWUnKSkge1xuXHRcdFx0dGhpcy5yZXF1ZXN0RXJyb3IoKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2FsbFVzZXJzLmZldGNoKCkubWFwKCh1c2VyKSA9PiB1c2VyLm5hbWUpO1xuXHRcdH1cblx0fVxuXHRnZXQgb25saW5lTmFtZXMoKSB7XG5cdFx0aWYgKCF0aGlzLnVzZXJGaWVsZHMuaGFzT3duUHJvcGVydHkoJ25hbWUnKSkge1xuXHRcdFx0dGhpcy5yZXF1ZXN0RXJyb3IoKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX29ubGluZVVzZXJzLmZldGNoKCkubWFwKCh1c2VyKSA9PiB1c2VyLm5hbWUpO1xuXHRcdH1cblx0fVxuXHRnZXQgYWxsSURzKCkge1xuXHRcdGlmICghdGhpcy51c2VyRmllbGRzLmhhc093blByb3BlcnR5KCdfaWQnKSB8fCAhdGhpcy51c2VyRmllbGRzLmhhc093blByb3BlcnR5KCd1c2VybmFtZScpKSB7XG5cdFx0XHR0aGlzLnJlcXVlc3RFcnJvcigpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fYWxsVXNlcnMuZmV0Y2goKS5tYXAoKHVzZXIpID0+ICh7IGlkOiB1c2VyLl9pZCwgbmFtZTogdXNlci51c2VybmFtZSB9KSk7XG5cdFx0fVxuXHR9XG5cdGdldCBvbmxpbmVJRHMoKSB7XG5cdFx0aWYgKCF0aGlzLnVzZXJGaWVsZHMuaGFzT3duUHJvcGVydHkoJ19pZCcpIHx8ICF0aGlzLnVzZXJGaWVsZHMuaGFzT3duUHJvcGVydHkoJ3VzZXJuYW1lJykpIHtcblx0XHRcdHRoaXMucmVxdWVzdEVycm9yKCk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9vbmxpbmVVc2Vycy5mZXRjaCgpLm1hcCgodXNlcikgPT4gKHsgaWQ6IHVzZXIuX2lkLCBuYW1lOiB1c2VyLnVzZXJuYW1lIH0pKTtcblx0XHR9XG5cdH1cbn1cblxuLy8gYWRkIGNsYXNzIHRvIG1ldGVvciBtZXRob2RzXG5jb25zdCBib3RIZWxwZXJzID0gbmV3IEJvdEhlbHBlcnMoKTtcblxuLy8gaW5pdCBjdXJzb3JzIHdpdGggZmllbGRzIHNldHRpbmcgYW5kIHVwZGF0ZSBvbiBzZXR0aW5nIGNoYW5nZVxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0JvdEhlbHBlcnNfdXNlckZpZWxkcycsIGZ1bmN0aW9uKHNldHRpbmdLZXksIHNldHRpbmdWYWx1ZSkge1xuXHRib3RIZWxwZXJzLnNldHVwQ3Vyc29ycyhzZXR0aW5nVmFsdWUpO1xufSk7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0Ym90UmVxdWVzdDogKC4uLmFyZ3MpID0+IHtcblx0XHRjb25zdCB1c2VySUQgPSBNZXRlb3IudXNlcklkKCk7XG5cdFx0aWYgKHVzZXJJRCAmJiBSb2NrZXRDaGF0LmF1dGh6Lmhhc1JvbGUodXNlcklELCAnYm90JykpIHtcblx0XHRcdHJldHVybiBib3RIZWxwZXJzLnJlcXVlc3QoLi4uYXJncyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7IG1ldGhvZDogJ2JvdFJlcXVlc3QnIH0pO1xuXHRcdH1cblx0fSxcbn0pO1xuIiwiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkR3JvdXAoJ0JvdHMnLCBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmFkZCgnQm90SGVscGVyc191c2VyRmllbGRzJywgJ19pZCwgbmFtZSwgdXNlcm5hbWUsIGVtYWlscywgbGFuZ3VhZ2UsIHV0Y09mZnNldCcsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0c2VjdGlvbjogJ0hlbHBlcnMnLFxuXHRcdFx0aTE4bkxhYmVsOiAnQm90SGVscGVyc191c2VyRmllbGRzJyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0JvdEhlbHBlcnNfdXNlckZpZWxkc19EZXNjcmlwdGlvbicsXG5cdFx0fSk7XG5cdH0pO1xufSk7XG4iXX0=
