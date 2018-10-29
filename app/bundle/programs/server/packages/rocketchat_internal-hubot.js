(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var Hubot, HubotScripts, InternalHubot, InternalHubotReceiver, RocketChatAdapter;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:internal-hubot":{"hubot.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_internal-hubot/hubot.js                                                                        //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 1);
module.watch(require("coffeescript/register"));

const Hubot = Npm.require('hubot'); // Start a hubot, connected to our chat room.
// 'use strict'
// Log messages?


const DEBUG = false;
let InternalHubot = {};
const sendHelper = Meteor.bindEnvironment((robot, envelope, strings, map) => {
  while (strings.length > 0) {
    const string = strings.shift();

    if (typeof string === 'function') {
      string();
    } else {
      try {
        map(string);
      } catch (err) {
        if (DEBUG) {
          console.error(`Hubot error: ${err}`);
        }

        robot.logger.error(`RocketChat send error: ${err}`);
      }
    }
  }
}); // Monkey-patch Hubot to support private messages

Hubot.Response.prototype.priv = (...strings) => this.robot.adapter.priv(this.envelope, ...strings); // More monkey-patching


Hubot.Robot.prototype.loadAdapter = () => {}; // disable
// grrrr, Meteor.bindEnvironment doesn't preserve `this` apparently


const bind = function (f) {
  const g = Meteor.bindEnvironment((self, ...args) => f.apply(self, args));
  return function (...args) {
    return g(this, ...Array.from(args));
  };
};

class Robot extends Hubot.Robot {
  constructor(...args) {
    super(...(args || []));
    this.hear = bind(this.hear);
    this.respond = bind(this.respond);
    this.enter = bind(this.enter);
    this.leave = bind(this.leave);
    this.topic = bind(this.topic);
    this.error = bind(this.error);
    this.catchAll = bind(this.catchAll);
    this.user = Meteor.users.findOne({
      username: this.name
    }, {
      fields: {
        username: 1
      }
    });
  }

  loadAdapter() {
    return false;
  }

  hear(regex, callback) {
    return super.hear(regex, Meteor.bindEnvironment(callback));
  }

  respond(regex, callback) {
    return super.respond(regex, Meteor.bindEnvironment(callback));
  }

  enter(callback) {
    return super.enter(Meteor.bindEnvironment(callback));
  }

  leave(callback) {
    return super.leave(Meteor.bindEnvironment(callback));
  }

  topic(callback) {
    return super.topic(Meteor.bindEnvironment(callback));
  }

  error(callback) {
    return super.error(Meteor.bindEnvironment(callback));
  }

  catchAll(callback) {
    return super.catchAll(Meteor.bindEnvironment(callback));
  }

}

class RocketChatAdapter extends Hubot.Adapter {
  // Public: Raw method for sending data back to the chat source. Extend this.
  //
  // envelope - A Object with message, room and user details.
  // strings  - One or more Strings for each message to send.
  //
  // Returns nothing.
  send(envelope, ...strings) {
    if (DEBUG) {
      console.log('ROCKETCHATADAPTER -> send'.blue);
    } // console.log envelope, strings


    return sendHelper(this.robot, envelope, strings, string => {
      if (DEBUG) {
        console.log(`send ${envelope.room}: ${string} (${envelope.user.id})`);
      }

      return RocketChat.sendMessage(InternalHubot.user, {
        msg: string
      }, {
        _id: envelope.room
      });
    });
  } // Public: Raw method for sending emote data back to the chat source.
  //
  // envelope - A Object with message, room and user details.
  // strings  - One or more Strings for each message to send.
  //
  // Returns nothing.


  emote(envelope, ...strings) {
    if (DEBUG) {
      console.log('ROCKETCHATADAPTER -> emote'.blue);
    }

    return sendHelper(this.robot, envelope, strings, string => {
      if (DEBUG) {
        console.log(`emote ${envelope.rid}: ${string} (${envelope.u.username})`);
      }

      if (envelope.message.private) {
        return this.priv(envelope, `*** ${string} ***`);
      }

      return Meteor.call('sendMessage', {
        msg: string,
        rid: envelope.rid,
        action: true
      });
    });
  } // Priv: our extension -- send a PM to user


  priv(envelope, ...strings) {
    if (DEBUG) {
      console.log('ROCKETCHATADAPTER -> priv'.blue);
    }

    return sendHelper(this.robot, envelope, strings, function (string) {
      if (DEBUG) {
        console.log(`priv ${envelope.room}: ${string} (${envelope.user.id})`);
      }

      return Meteor.call('sendMessage', {
        u: {
          username: RocketChat.settings.get('InternalHubot_Username')
        },
        to: `${envelope.user.id}`,
        msg: string,
        rid: envelope.room
      });
    });
  } // Public: Raw method for building a reply and sending it back to the chat
  // source. Extend this.
  //
  // envelope - A Object with message, room and user details.
  // strings  - One or more Strings for each reply to send.
  //
  // Returns nothing.


  reply(envelope, ...strings) {
    if (DEBUG) {
      console.log('ROCKETCHATADAPTER -> reply'.blue);
    }

    if (envelope.message.private) {
      return this.priv(envelope, ...strings);
    } else {
      return this.send(envelope, ...strings.map(str => `${envelope.user.name}: ${str}`));
    }
  } // Public: Raw method for setting a topic on the chat source. Extend this.
  //
  // envelope - A Object with message, room and user details.
  // strings  - One more more Strings to set as the topic.
  //
  // Returns nothing.


  topic()
  /* envelope, ...strings*/
  {
    if (DEBUG) {
      return console.log('ROCKETCHATADAPTER -> topic'.blue);
    }
  } // Public: Raw method for playing a sound in the chat source. Extend this.
  //
  // envelope - A Object with message, room and user details.
  // strings  - One or more strings for each play message to send.
  //
  // Returns nothing


  play()
  /* envelope, ...strings*/
  {
    if (DEBUG) {
      return console.log('ROCKETCHATADAPTER -> play'.blue);
    }
  } // Public: Raw method for invoking the bot to run. Extend this.
  //
  // Returns nothing.


  run() {
    if (DEBUG) {
      console.log('ROCKETCHATADAPTER -> run'.blue);
    }

    this.robot.emit('connected');
    return this.robot.brain.mergeData({});
  } // @robot.brain.emit 'loaded'
  // Public: Raw method for shutting the bot down. Extend this.
  //
  // Returns nothing.


  close() {
    if (DEBUG) {
      return console.log('ROCKETCHATADAPTER -> close'.blue);
    }
  }

}

const InternalHubotReceiver = message => {
  if (DEBUG) {
    console.log(message);
  }

  if (message.u.username !== InternalHubot.name) {
    const room = RocketChat.models.Rooms.findOneById(message.rid);
    const enabledForC = RocketChat.settings.get('InternalHubot_EnableForChannels');
    const enabledForD = RocketChat.settings.get('InternalHubot_EnableForDirectMessages');
    const enabledForP = RocketChat.settings.get('InternalHubot_EnableForPrivateGroups');
    const subscribedToP = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, InternalHubot.user._id);

    if (room.t === 'c' && enabledForC || room.t === 'd' && enabledForD || room.t === 'p' && enabledForP && subscribedToP) {
      const InternalHubotUser = new Hubot.User(message.u.username, {
        room: message.rid
      });
      const InternalHubotTextMessage = new Hubot.TextMessage(InternalHubotUser, message.msg, message._id);
      InternalHubot.adapter.receive(InternalHubotTextMessage);
    }
  }

  return message;
};

class HubotScripts {
  constructor(robot) {
    const modulesToLoad = ['hubot-help/src/help.coffee'];
    const customPath = RocketChat.settings.get('InternalHubot_PathToLoadCustomScripts');
    HubotScripts.load(`${__meteor_bootstrap__.serverDir}/npm/node_modules/meteor/rocketchat_internal-hubot/node_modules/`, modulesToLoad, robot);
    HubotScripts.load(customPath, RocketChat.settings.get('InternalHubot_ScriptsToLoad').split(',') || [], robot);
  }

  static load(path, scriptsToLoad, robot) {
    if (!path || !scriptsToLoad) {
      return;
    }

    scriptsToLoad.forEach(scriptFile => {
      try {
        scriptFile = s.trim(scriptFile);

        if (scriptFile === '') {
          return;
        } // delete require.cache[require.resolve(path+scriptFile)];


        const fn = Npm.require(path + scriptFile);

        if (typeof fn === 'function') {
          fn(robot);
        } else {
          fn.default(robot);
        }

        robot.parseHelp(path + scriptFile);
        console.log(`Loaded ${scriptFile}`.green);
      } catch (e) {
        console.log(`Can't load ${scriptFile}`.red);
        console.log(e);
      }
    });
  }

}

const init = _.debounce(Meteor.bindEnvironment(() => {
  if (RocketChat.settings.get('InternalHubot_Enabled')) {
    InternalHubot = new Robot(null, null, false, RocketChat.settings.get('InternalHubot_Username'));
    InternalHubot.alias = 'bot';
    InternalHubot.adapter = new RocketChatAdapter(InternalHubot);
    new HubotScripts(InternalHubot);
    InternalHubot.run();
    return RocketChat.callbacks.add('afterSaveMessage', InternalHubotReceiver, RocketChat.callbacks.priority.LOW, 'InternalHubot');
  } else {
    InternalHubot = {};
    return RocketChat.callbacks.remove('afterSaveMessage', 'InternalHubot');
  }
}), 1000);

Meteor.startup(function () {
  init();
  RocketChat.models.Settings.findByIds(['InternalHubot_Username', 'InternalHubot_Enabled', 'InternalHubot_ScriptsToLoad', 'InternalHubot_PathToLoadCustomScripts']).observe({
    changed() {
      return init();
    }

  }); // TODO useful when we have the ability to invalidate `require` cache
  // RocketChat.RateLimiter.limitMethod('reloadInternalHubot', 1, 5000, {
  // 	userId(/*userId*/) { return true; }
  // });
  // Meteor.methods({
  // 	reloadInternalHubot: () => init()
  // });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_internal-hubot/settings.js                                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
RocketChat.settings.addGroup('InternalHubot', function () {
  this.add('InternalHubot_Enabled', false, {
    type: 'boolean',
    i18nLabel: 'Enabled'
  });
  this.add('InternalHubot_Username', 'rocket.cat', {
    type: 'string',
    i18nLabel: 'Username',
    i18nDescription: 'InternalHubot_Username_Description',
    public: true
  });
  this.add('InternalHubot_ScriptsToLoad', '', {
    type: 'string'
  });
  this.add('InternalHubot_PathToLoadCustomScripts', '', {
    type: 'string'
  });
  this.add('InternalHubot_EnableForChannels', true, {
    type: 'boolean'
  });
  this.add('InternalHubot_EnableForDirectMessages', false, {
    type: 'boolean'
  });
  this.add('InternalHubot_EnableForPrivateGroups', false, {
    type: 'boolean'
  }); // this.add('InternalHubot_reload', 'reloadInternalHubot', {
  // 	type: 'action',
  // 	actionText: 'reload'
  // });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:internal-hubot/hubot.js");
require("/node_modules/meteor/rocketchat:internal-hubot/settings.js");

/* Exports */
Package._define("rocketchat:internal-hubot", {
  Hubot: Hubot,
  HubotScripts: HubotScripts,
  InternalHubot: InternalHubot,
  InternalHubotReceiver: InternalHubotReceiver,
  RocketChatAdapter: RocketChatAdapter
});

})();

//# sourceURL=meteor://💻app/packages/rocketchat_internal-hubot.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbnRlcm5hbC1odWJvdC9odWJvdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppbnRlcm5hbC1odWJvdC9zZXR0aW5ncy5qcyJdLCJuYW1lcyI6WyJfIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJzIiwiSHVib3QiLCJOcG0iLCJERUJVRyIsIkludGVybmFsSHVib3QiLCJzZW5kSGVscGVyIiwiTWV0ZW9yIiwiYmluZEVudmlyb25tZW50Iiwicm9ib3QiLCJlbnZlbG9wZSIsInN0cmluZ3MiLCJtYXAiLCJsZW5ndGgiLCJzdHJpbmciLCJzaGlmdCIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsImxvZ2dlciIsIlJlc3BvbnNlIiwicHJvdG90eXBlIiwicHJpdiIsImFkYXB0ZXIiLCJSb2JvdCIsImxvYWRBZGFwdGVyIiwiYmluZCIsImYiLCJnIiwic2VsZiIsImFyZ3MiLCJhcHBseSIsIkFycmF5IiwiZnJvbSIsImNvbnN0cnVjdG9yIiwiaGVhciIsInJlc3BvbmQiLCJlbnRlciIsImxlYXZlIiwidG9waWMiLCJjYXRjaEFsbCIsInVzZXIiLCJ1c2VycyIsImZpbmRPbmUiLCJ1c2VybmFtZSIsIm5hbWUiLCJmaWVsZHMiLCJyZWdleCIsImNhbGxiYWNrIiwiUm9ja2V0Q2hhdEFkYXB0ZXIiLCJBZGFwdGVyIiwic2VuZCIsImxvZyIsImJsdWUiLCJyb29tIiwiaWQiLCJSb2NrZXRDaGF0Iiwic2VuZE1lc3NhZ2UiLCJtc2ciLCJfaWQiLCJlbW90ZSIsInJpZCIsInUiLCJtZXNzYWdlIiwicHJpdmF0ZSIsImNhbGwiLCJhY3Rpb24iLCJzZXR0aW5ncyIsImdldCIsInRvIiwicmVwbHkiLCJzdHIiLCJwbGF5IiwicnVuIiwiZW1pdCIsImJyYWluIiwibWVyZ2VEYXRhIiwiY2xvc2UiLCJJbnRlcm5hbEh1Ym90UmVjZWl2ZXIiLCJtb2RlbHMiLCJSb29tcyIsImZpbmRPbmVCeUlkIiwiZW5hYmxlZEZvckMiLCJlbmFibGVkRm9yRCIsImVuYWJsZWRGb3JQIiwic3Vic2NyaWJlZFRvUCIsIlN1YnNjcmlwdGlvbnMiLCJmaW5kT25lQnlSb29tSWRBbmRVc2VySWQiLCJ0IiwiSW50ZXJuYWxIdWJvdFVzZXIiLCJVc2VyIiwiSW50ZXJuYWxIdWJvdFRleHRNZXNzYWdlIiwiVGV4dE1lc3NhZ2UiLCJyZWNlaXZlIiwiSHVib3RTY3JpcHRzIiwibW9kdWxlc1RvTG9hZCIsImN1c3RvbVBhdGgiLCJsb2FkIiwiX19tZXRlb3JfYm9vdHN0cmFwX18iLCJzZXJ2ZXJEaXIiLCJzcGxpdCIsInBhdGgiLCJzY3JpcHRzVG9Mb2FkIiwiZm9yRWFjaCIsInNjcmlwdEZpbGUiLCJ0cmltIiwiZm4iLCJwYXJzZUhlbHAiLCJncmVlbiIsImUiLCJyZWQiLCJpbml0IiwiZGVib3VuY2UiLCJhbGlhcyIsImNhbGxiYWNrcyIsImFkZCIsInByaW9yaXR5IiwiTE9XIiwicmVtb3ZlIiwic3RhcnR1cCIsIlNldHRpbmdzIiwiZmluZEJ5SWRzIiwib2JzZXJ2ZSIsImNoYW5nZWQiLCJhZGRHcm91cCIsInR5cGUiLCJpMThuTGFiZWwiLCJpMThuRGVzY3JpcHRpb24iLCJwdWJsaWMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLENBQUo7O0FBQU1DLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLFFBQUVLLENBQUY7QUFBSTs7QUFBaEIsQ0FBbkMsRUFBcUQsQ0FBckQ7QUFBd0QsSUFBSUMsQ0FBSjtBQUFNTCxPQUFPQyxLQUFQLENBQWFDLFFBQVEsbUJBQVIsQ0FBYixFQUEwQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0MsUUFBRUQsQ0FBRjtBQUFJOztBQUFoQixDQUExQyxFQUE0RCxDQUE1RDtBQUErREosT0FBT0MsS0FBUCxDQUFhQyxR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QVMsdUJBQVQsRUFBa0MsS0FBbEMsRUFBeUM7QUFBRVUsVUFBTSxTQUFSO0FBQW1CQyxlQUFXO0FBQTlCLEdBQXpDO0FBQ0EsT0FBS1gsR0FBTCxDQUFTLHdCQUFULEVBQW1DLFlBQW5DLEVBQWlEO0FBQUVVLFVBQU0sUUFBUjtBQUFrQkMsZUFBVyxVQUE3QjtBQUF5Q0MscUJBQWlCLG9DQUExRDtBQUFnR0MsWUFBUTtBQUF4RyxHQUFqRDtBQUNBLE9BQUtiLEdBQUwsQ0FBUyw2QkFBVCxFQUF3QyxFQUF4QyxFQUE0QztBQUFFVSxVQUFNO0FBQVIsR0FBNUM7QUFDQSxPQUFLVixHQUFMLENBQVMsdUNBQVQsRUFBa0QsRUFBbEQsRUFBc0Q7QUFBRVUsVUFBTTtBQUFSLEdBQXREO0FBQ0EsT0FBS1YsR0FBTCxDQUFTLGlDQUFULEVBQTRDLElBQTVDLEVBQWtEO0FBQUVVLFVBQU07QUFBUixHQUFsRDtBQUNBLE9BQUtWLEdBQUwsQ0FBUyx1Q0FBVCxFQUFrRCxLQUFsRCxFQUF5RDtBQUFFVSxVQUFNO0FBQVIsR0FBekQ7QUFDQSxPQUFLVixHQUFMLENBQVMsc0NBQVQsRUFBaUQsS0FBakQsRUFBd0Q7QUFBRVUsVUFBTTtBQUFSLEdBQXhELEVBUHdELENBUXhEO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FaRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2ludGVybmFsLWh1Ym90LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFscyBfX21ldGVvcl9ib290c3RyYXBfXyAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5cbmltcG9ydCAnY29mZmVlc2NyaXB0L3JlZ2lzdGVyJztcblxuY29uc3QgSHVib3QgPSBOcG0ucmVxdWlyZSgnaHVib3QnKTtcblxuLy8gU3RhcnQgYSBodWJvdCwgY29ubmVjdGVkIHRvIG91ciBjaGF0IHJvb20uXG4vLyAndXNlIHN0cmljdCdcbi8vIExvZyBtZXNzYWdlcz9cbmNvbnN0IERFQlVHID0gZmFsc2U7XG5cbmxldCBJbnRlcm5hbEh1Ym90ID0ge307XG5cbmNvbnN0IHNlbmRIZWxwZXIgPSBNZXRlb3IuYmluZEVudmlyb25tZW50KChyb2JvdCwgZW52ZWxvcGUsIHN0cmluZ3MsIG1hcCkgPT4ge1xuXHR3aGlsZSAoc3RyaW5ncy5sZW5ndGggPiAwKSB7XG5cdFx0Y29uc3Qgc3RyaW5nID0gc3RyaW5ncy5zaGlmdCgpO1xuXHRcdGlmICh0eXBlb2Yoc3RyaW5nKSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0c3RyaW5nKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdG1hcChzdHJpbmcpO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdGlmIChERUJVRykgeyBjb25zb2xlLmVycm9yKGBIdWJvdCBlcnJvcjogJHsgZXJyIH1gKTsgfVxuXHRcdFx0XHRyb2JvdC5sb2dnZXIuZXJyb3IoYFJvY2tldENoYXQgc2VuZCBlcnJvcjogJHsgZXJyIH1gKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pO1xuXG4vLyBNb25rZXktcGF0Y2ggSHVib3QgdG8gc3VwcG9ydCBwcml2YXRlIG1lc3NhZ2VzXG5IdWJvdC5SZXNwb25zZS5wcm90b3R5cGUucHJpdiA9ICguLi5zdHJpbmdzKSA9PiB0aGlzLnJvYm90LmFkYXB0ZXIucHJpdih0aGlzLmVudmVsb3BlLCAuLi5zdHJpbmdzKTtcblxuLy8gTW9yZSBtb25rZXktcGF0Y2hpbmdcbkh1Ym90LlJvYm90LnByb3RvdHlwZS5sb2FkQWRhcHRlciA9ICgpID0+IHt9OyAvLyBkaXNhYmxlXG5cbi8vIGdycnJyLCBNZXRlb3IuYmluZEVudmlyb25tZW50IGRvZXNuJ3QgcHJlc2VydmUgYHRoaXNgIGFwcGFyZW50bHlcbmNvbnN0IGJpbmQgPSBmdW5jdGlvbihmKSB7XG5cdGNvbnN0IGcgPSBNZXRlb3IuYmluZEVudmlyb25tZW50KChzZWxmLCAuLi5hcmdzKSA9PiBmLmFwcGx5KHNlbGYsIGFyZ3MpKTtcblx0cmV0dXJuIGZ1bmN0aW9uKC4uLmFyZ3MpIHsgcmV0dXJuIGcodGhpcywgLi4uQXJyYXkuZnJvbShhcmdzKSk7IH07XG59O1xuXG5jbGFzcyBSb2JvdCBleHRlbmRzIEh1Ym90LlJvYm90IHtcblx0Y29uc3RydWN0b3IoLi4uYXJncykge1xuXHRcdHN1cGVyKC4uLihhcmdzIHx8IFtdKSk7XG5cdFx0dGhpcy5oZWFyID0gYmluZCh0aGlzLmhlYXIpO1xuXHRcdHRoaXMucmVzcG9uZCA9IGJpbmQodGhpcy5yZXNwb25kKTtcblx0XHR0aGlzLmVudGVyID0gYmluZCh0aGlzLmVudGVyKTtcblx0XHR0aGlzLmxlYXZlID0gYmluZCh0aGlzLmxlYXZlKTtcblx0XHR0aGlzLnRvcGljID0gYmluZCh0aGlzLnRvcGljKTtcblx0XHR0aGlzLmVycm9yID0gYmluZCh0aGlzLmVycm9yKTtcblx0XHR0aGlzLmNhdGNoQWxsID0gYmluZCh0aGlzLmNhdGNoQWxsKTtcblx0XHR0aGlzLnVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh7IHVzZXJuYW1lOiB0aGlzLm5hbWUgfSwgeyBmaWVsZHM6IHsgdXNlcm5hbWU6IDEgfSB9KTtcblx0fVxuXHRsb2FkQWRhcHRlcigpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdGhlYXIocmVnZXgsIGNhbGxiYWNrKSB7IHJldHVybiBzdXBlci5oZWFyKHJlZ2V4LCBNZXRlb3IuYmluZEVudmlyb25tZW50KGNhbGxiYWNrKSk7IH1cblx0cmVzcG9uZChyZWdleCwgY2FsbGJhY2spIHsgcmV0dXJuIHN1cGVyLnJlc3BvbmQocmVnZXgsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2spKTsgfVxuXHRlbnRlcihjYWxsYmFjaykgeyByZXR1cm4gc3VwZXIuZW50ZXIoTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChjYWxsYmFjaykpOyB9XG5cdGxlYXZlKGNhbGxiYWNrKSB7IHJldHVybiBzdXBlci5sZWF2ZShNZXRlb3IuYmluZEVudmlyb25tZW50KGNhbGxiYWNrKSk7IH1cblx0dG9waWMoY2FsbGJhY2spIHsgcmV0dXJuIHN1cGVyLnRvcGljKE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2spKTsgfVxuXHRlcnJvcihjYWxsYmFjaykgeyByZXR1cm4gc3VwZXIuZXJyb3IoTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChjYWxsYmFjaykpOyB9XG5cdGNhdGNoQWxsKGNhbGxiYWNrKSB7IHJldHVybiBzdXBlci5jYXRjaEFsbChNZXRlb3IuYmluZEVudmlyb25tZW50KGNhbGxiYWNrKSk7IH1cbn1cblxuY2xhc3MgUm9ja2V0Q2hhdEFkYXB0ZXIgZXh0ZW5kcyBIdWJvdC5BZGFwdGVyIHtcblx0Ly8gUHVibGljOiBSYXcgbWV0aG9kIGZvciBzZW5kaW5nIGRhdGEgYmFjayB0byB0aGUgY2hhdCBzb3VyY2UuIEV4dGVuZCB0aGlzLlxuXHQvL1xuXHQvLyBlbnZlbG9wZSAtIEEgT2JqZWN0IHdpdGggbWVzc2FnZSwgcm9vbSBhbmQgdXNlciBkZXRhaWxzLlxuXHQvLyBzdHJpbmdzICAtIE9uZSBvciBtb3JlIFN0cmluZ3MgZm9yIGVhY2ggbWVzc2FnZSB0byBzZW5kLlxuXHQvL1xuXHQvLyBSZXR1cm5zIG5vdGhpbmcuXG5cdHNlbmQoZW52ZWxvcGUsIC4uLnN0cmluZ3MpIHtcblx0XHRpZiAoREVCVUcpIHsgY29uc29sZS5sb2coJ1JPQ0tFVENIQVRBREFQVEVSIC0+IHNlbmQnLmJsdWUpOyB9XG5cdFx0Ly8gY29uc29sZS5sb2cgZW52ZWxvcGUsIHN0cmluZ3Ncblx0XHRyZXR1cm4gc2VuZEhlbHBlcih0aGlzLnJvYm90LCBlbnZlbG9wZSwgc3RyaW5ncywgKHN0cmluZykgPT4ge1xuXHRcdFx0aWYgKERFQlVHKSB7IGNvbnNvbGUubG9nKGBzZW5kICR7IGVudmVsb3BlLnJvb20gfTogJHsgc3RyaW5nIH0gKCR7IGVudmVsb3BlLnVzZXIuaWQgfSlgKTsgfVxuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuc2VuZE1lc3NhZ2UoSW50ZXJuYWxIdWJvdC51c2VyLCB7IG1zZzogc3RyaW5nIH0sIHsgX2lkOiBlbnZlbG9wZS5yb29tIH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUHVibGljOiBSYXcgbWV0aG9kIGZvciBzZW5kaW5nIGVtb3RlIGRhdGEgYmFjayB0byB0aGUgY2hhdCBzb3VyY2UuXG5cdC8vXG5cdC8vIGVudmVsb3BlIC0gQSBPYmplY3Qgd2l0aCBtZXNzYWdlLCByb29tIGFuZCB1c2VyIGRldGFpbHMuXG5cdC8vIHN0cmluZ3MgIC0gT25lIG9yIG1vcmUgU3RyaW5ncyBmb3IgZWFjaCBtZXNzYWdlIHRvIHNlbmQuXG5cdC8vXG5cdC8vIFJldHVybnMgbm90aGluZy5cblx0ZW1vdGUoZW52ZWxvcGUsIC4uLnN0cmluZ3MpIHtcblx0XHRpZiAoREVCVUcpIHsgY29uc29sZS5sb2coJ1JPQ0tFVENIQVRBREFQVEVSIC0+IGVtb3RlJy5ibHVlKTsgfVxuXHRcdHJldHVybiBzZW5kSGVscGVyKHRoaXMucm9ib3QsIGVudmVsb3BlLCBzdHJpbmdzLCAoc3RyaW5nKSA9PiB7XG5cdFx0XHRpZiAoREVCVUcpIHsgY29uc29sZS5sb2coYGVtb3RlICR7IGVudmVsb3BlLnJpZCB9OiAkeyBzdHJpbmcgfSAoJHsgZW52ZWxvcGUudS51c2VybmFtZSB9KWApOyB9XG5cdFx0XHRpZiAoZW52ZWxvcGUubWVzc2FnZS5wcml2YXRlKSB7IHJldHVybiB0aGlzLnByaXYoZW52ZWxvcGUsIGAqKiogJHsgc3RyaW5nIH0gKioqYCk7IH1cblx0XHRcdHJldHVybiBNZXRlb3IuY2FsbCgnc2VuZE1lc3NhZ2UnLCB7XG5cdFx0XHRcdG1zZzogc3RyaW5nLFxuXHRcdFx0XHRyaWQ6IGVudmVsb3BlLnJpZCxcblx0XHRcdFx0YWN0aW9uOiB0cnVlLFxuXHRcdFx0fVxuXHRcdFx0KTtcblx0XHR9KTtcblx0fVxuXG5cdC8vIFByaXY6IG91ciBleHRlbnNpb24gLS0gc2VuZCBhIFBNIHRvIHVzZXJcblx0cHJpdihlbnZlbG9wZSwgLi4uc3RyaW5ncykge1xuXHRcdGlmIChERUJVRykgeyBjb25zb2xlLmxvZygnUk9DS0VUQ0hBVEFEQVBURVIgLT4gcHJpdicuYmx1ZSk7IH1cblx0XHRyZXR1cm4gc2VuZEhlbHBlcih0aGlzLnJvYm90LCBlbnZlbG9wZSwgc3RyaW5ncywgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRpZiAoREVCVUcpIHsgY29uc29sZS5sb2coYHByaXYgJHsgZW52ZWxvcGUucm9vbSB9OiAkeyBzdHJpbmcgfSAoJHsgZW52ZWxvcGUudXNlci5pZCB9KWApOyB9XG5cdFx0XHRyZXR1cm4gTWV0ZW9yLmNhbGwoJ3NlbmRNZXNzYWdlJywge1xuXHRcdFx0XHR1OiB7XG5cdFx0XHRcdFx0dXNlcm5hbWU6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdJbnRlcm5hbEh1Ym90X1VzZXJuYW1lJyksXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRvOiBgJHsgZW52ZWxvcGUudXNlci5pZCB9YCxcblx0XHRcdFx0bXNnOiBzdHJpbmcsXG5cdFx0XHRcdHJpZDogZW52ZWxvcGUucm9vbSxcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUHVibGljOiBSYXcgbWV0aG9kIGZvciBidWlsZGluZyBhIHJlcGx5IGFuZCBzZW5kaW5nIGl0IGJhY2sgdG8gdGhlIGNoYXRcblx0Ly8gc291cmNlLiBFeHRlbmQgdGhpcy5cblx0Ly9cblx0Ly8gZW52ZWxvcGUgLSBBIE9iamVjdCB3aXRoIG1lc3NhZ2UsIHJvb20gYW5kIHVzZXIgZGV0YWlscy5cblx0Ly8gc3RyaW5ncyAgLSBPbmUgb3IgbW9yZSBTdHJpbmdzIGZvciBlYWNoIHJlcGx5IHRvIHNlbmQuXG5cdC8vXG5cdC8vIFJldHVybnMgbm90aGluZy5cblx0cmVwbHkoZW52ZWxvcGUsIC4uLnN0cmluZ3MpIHtcblx0XHRpZiAoREVCVUcpIHsgY29uc29sZS5sb2coJ1JPQ0tFVENIQVRBREFQVEVSIC0+IHJlcGx5Jy5ibHVlKTsgfVxuXHRcdGlmIChlbnZlbG9wZS5tZXNzYWdlLnByaXZhdGUpIHtcblx0XHRcdHJldHVybiB0aGlzLnByaXYoZW52ZWxvcGUsIC4uLnN0cmluZ3MpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5zZW5kKGVudmVsb3BlLCAuLi5zdHJpbmdzLm1hcCgoc3RyKSA9PiBgJHsgZW52ZWxvcGUudXNlci5uYW1lIH06ICR7IHN0ciB9YCkpO1xuXHRcdH1cblx0fVxuXG5cdC8vIFB1YmxpYzogUmF3IG1ldGhvZCBmb3Igc2V0dGluZyBhIHRvcGljIG9uIHRoZSBjaGF0IHNvdXJjZS4gRXh0ZW5kIHRoaXMuXG5cdC8vXG5cdC8vIGVudmVsb3BlIC0gQSBPYmplY3Qgd2l0aCBtZXNzYWdlLCByb29tIGFuZCB1c2VyIGRldGFpbHMuXG5cdC8vIHN0cmluZ3MgIC0gT25lIG1vcmUgbW9yZSBTdHJpbmdzIHRvIHNldCBhcyB0aGUgdG9waWMuXG5cdC8vXG5cdC8vIFJldHVybnMgbm90aGluZy5cblx0dG9waWMoLyogZW52ZWxvcGUsIC4uLnN0cmluZ3MqLykge1xuXHRcdGlmIChERUJVRykgeyByZXR1cm4gY29uc29sZS5sb2coJ1JPQ0tFVENIQVRBREFQVEVSIC0+IHRvcGljJy5ibHVlKTsgfVxuXHR9XG5cblx0Ly8gUHVibGljOiBSYXcgbWV0aG9kIGZvciBwbGF5aW5nIGEgc291bmQgaW4gdGhlIGNoYXQgc291cmNlLiBFeHRlbmQgdGhpcy5cblx0Ly9cblx0Ly8gZW52ZWxvcGUgLSBBIE9iamVjdCB3aXRoIG1lc3NhZ2UsIHJvb20gYW5kIHVzZXIgZGV0YWlscy5cblx0Ly8gc3RyaW5ncyAgLSBPbmUgb3IgbW9yZSBzdHJpbmdzIGZvciBlYWNoIHBsYXkgbWVzc2FnZSB0byBzZW5kLlxuXHQvL1xuXHQvLyBSZXR1cm5zIG5vdGhpbmdcblx0cGxheSgvKiBlbnZlbG9wZSwgLi4uc3RyaW5ncyovKSB7XG5cdFx0aWYgKERFQlVHKSB7IHJldHVybiBjb25zb2xlLmxvZygnUk9DS0VUQ0hBVEFEQVBURVIgLT4gcGxheScuYmx1ZSk7IH1cblx0fVxuXG5cdC8vIFB1YmxpYzogUmF3IG1ldGhvZCBmb3IgaW52b2tpbmcgdGhlIGJvdCB0byBydW4uIEV4dGVuZCB0aGlzLlxuXHQvL1xuXHQvLyBSZXR1cm5zIG5vdGhpbmcuXG5cdHJ1bigpIHtcblx0XHRpZiAoREVCVUcpIHsgY29uc29sZS5sb2coJ1JPQ0tFVENIQVRBREFQVEVSIC0+IHJ1bicuYmx1ZSk7IH1cblx0XHR0aGlzLnJvYm90LmVtaXQoJ2Nvbm5lY3RlZCcpO1xuXHRcdHJldHVybiB0aGlzLnJvYm90LmJyYWluLm1lcmdlRGF0YSh7fSk7XG5cdH1cblx0Ly8gQHJvYm90LmJyYWluLmVtaXQgJ2xvYWRlZCdcblxuXHQvLyBQdWJsaWM6IFJhdyBtZXRob2QgZm9yIHNodXR0aW5nIHRoZSBib3QgZG93bi4gRXh0ZW5kIHRoaXMuXG5cdC8vXG5cdC8vIFJldHVybnMgbm90aGluZy5cblx0Y2xvc2UoKSB7XG5cdFx0aWYgKERFQlVHKSB7IHJldHVybiBjb25zb2xlLmxvZygnUk9DS0VUQ0hBVEFEQVBURVIgLT4gY2xvc2UnLmJsdWUpOyB9XG5cdH1cbn1cblxuY29uc3QgSW50ZXJuYWxIdWJvdFJlY2VpdmVyID0gKG1lc3NhZ2UpID0+IHtcblx0aWYgKERFQlVHKSB7IGNvbnNvbGUubG9nKG1lc3NhZ2UpOyB9XG5cdGlmIChtZXNzYWdlLnUudXNlcm5hbWUgIT09IEludGVybmFsSHVib3QubmFtZSkge1xuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChtZXNzYWdlLnJpZCk7XG5cdFx0Y29uc3QgZW5hYmxlZEZvckMgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSW50ZXJuYWxIdWJvdF9FbmFibGVGb3JDaGFubmVscycpO1xuXHRcdGNvbnN0IGVuYWJsZWRGb3JEID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ludGVybmFsSHVib3RfRW5hYmxlRm9yRGlyZWN0TWVzc2FnZXMnKTtcblx0XHRjb25zdCBlbmFibGVkRm9yUCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdJbnRlcm5hbEh1Ym90X0VuYWJsZUZvclByaXZhdGVHcm91cHMnKTtcblx0XHRjb25zdCBzdWJzY3JpYmVkVG9QID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocm9vbS5faWQsIEludGVybmFsSHVib3QudXNlci5faWQpO1xuXG5cdFx0aWYgKFxuXHRcdFx0KHJvb20udCA9PT0gJ2MnICYmIGVuYWJsZWRGb3JDKVxuXHRcdFx0fHwgKHJvb20udCA9PT0gJ2QnICYmIGVuYWJsZWRGb3JEKVxuXHRcdFx0fHwgKHJvb20udCA9PT0gJ3AnICYmIGVuYWJsZWRGb3JQICYmIHN1YnNjcmliZWRUb1ApXG5cdFx0KSB7XG5cdFx0XHRjb25zdCBJbnRlcm5hbEh1Ym90VXNlciA9IG5ldyBIdWJvdC5Vc2VyKG1lc3NhZ2UudS51c2VybmFtZSwgeyByb29tOiBtZXNzYWdlLnJpZCB9KTtcblx0XHRcdGNvbnN0IEludGVybmFsSHVib3RUZXh0TWVzc2FnZSA9IG5ldyBIdWJvdC5UZXh0TWVzc2FnZShJbnRlcm5hbEh1Ym90VXNlciwgbWVzc2FnZS5tc2csIG1lc3NhZ2UuX2lkKTtcblx0XHRcdEludGVybmFsSHVib3QuYWRhcHRlci5yZWNlaXZlKEludGVybmFsSHVib3RUZXh0TWVzc2FnZSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBtZXNzYWdlO1xufTtcblxuY2xhc3MgSHVib3RTY3JpcHRzIHtcblx0Y29uc3RydWN0b3Iocm9ib3QpIHtcblx0XHRjb25zdCBtb2R1bGVzVG9Mb2FkID0gW1xuXHRcdFx0J2h1Ym90LWhlbHAvc3JjL2hlbHAuY29mZmVlJyxcblx0XHRdO1xuXHRcdGNvbnN0IGN1c3RvbVBhdGggPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSW50ZXJuYWxIdWJvdF9QYXRoVG9Mb2FkQ3VzdG9tU2NyaXB0cycpO1xuXHRcdEh1Ym90U2NyaXB0cy5sb2FkKGAkeyBfX21ldGVvcl9ib290c3RyYXBfXy5zZXJ2ZXJEaXIgfS9ucG0vbm9kZV9tb2R1bGVzL21ldGVvci9yb2NrZXRjaGF0X2ludGVybmFsLWh1Ym90L25vZGVfbW9kdWxlcy9gLCBtb2R1bGVzVG9Mb2FkLCByb2JvdCk7XG5cdFx0SHVib3RTY3JpcHRzLmxvYWQoY3VzdG9tUGF0aCwgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ludGVybmFsSHVib3RfU2NyaXB0c1RvTG9hZCcpLnNwbGl0KCcsJykgfHwgW10sIHJvYm90KTtcblx0fVxuXG5cdHN0YXRpYyBsb2FkKHBhdGgsIHNjcmlwdHNUb0xvYWQsIHJvYm90KSB7XG5cdFx0aWYgKCFwYXRoIHx8ICFzY3JpcHRzVG9Mb2FkKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHNjcmlwdHNUb0xvYWQuZm9yRWFjaCgoc2NyaXB0RmlsZSkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0c2NyaXB0RmlsZSA9IHMudHJpbShzY3JpcHRGaWxlKTtcblx0XHRcdFx0aWYgKHNjcmlwdEZpbGUgPT09ICcnKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGRlbGV0ZSByZXF1aXJlLmNhY2hlW3JlcXVpcmUucmVzb2x2ZShwYXRoK3NjcmlwdEZpbGUpXTtcblx0XHRcdFx0Y29uc3QgZm4gPSBOcG0ucmVxdWlyZShwYXRoICsgc2NyaXB0RmlsZSk7XG5cdFx0XHRcdGlmICh0eXBlb2YoZm4pID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0Zm4ocm9ib3QpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGZuLmRlZmF1bHQocm9ib3QpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJvYm90LnBhcnNlSGVscChwYXRoICsgc2NyaXB0RmlsZSk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGBMb2FkZWQgJHsgc2NyaXB0RmlsZSB9YC5ncmVlbik7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGBDYW4ndCBsb2FkICR7IHNjcmlwdEZpbGUgfWAucmVkKTtcblx0XHRcdFx0Y29uc29sZS5sb2coZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn1cblxuY29uc3QgaW5pdCA9IF8uZGVib3VuY2UoTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG5cdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSW50ZXJuYWxIdWJvdF9FbmFibGVkJykpIHtcblx0XHRJbnRlcm5hbEh1Ym90ID0gbmV3IFJvYm90KG51bGwsIG51bGwsIGZhbHNlLCBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSW50ZXJuYWxIdWJvdF9Vc2VybmFtZScpKTtcblx0XHRJbnRlcm5hbEh1Ym90LmFsaWFzID0gJ2JvdCc7XG5cdFx0SW50ZXJuYWxIdWJvdC5hZGFwdGVyID0gbmV3IFJvY2tldENoYXRBZGFwdGVyKEludGVybmFsSHVib3QpO1xuXHRcdG5ldyBIdWJvdFNjcmlwdHMoSW50ZXJuYWxIdWJvdCk7XG5cdFx0SW50ZXJuYWxIdWJvdC5ydW4oKTtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdhZnRlclNhdmVNZXNzYWdlJywgSW50ZXJuYWxIdWJvdFJlY2VpdmVyLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdJbnRlcm5hbEh1Ym90Jyk7XG5cdH0gZWxzZSB7XG5cdFx0SW50ZXJuYWxIdWJvdCA9IHt9O1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LmNhbGxiYWNrcy5yZW1vdmUoJ2FmdGVyU2F2ZU1lc3NhZ2UnLCAnSW50ZXJuYWxIdWJvdCcpO1xuXHR9XG59KSwgMTAwMCk7XG5cbk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRpbml0KCk7XG5cdFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmRCeUlkcyhbJ0ludGVybmFsSHVib3RfVXNlcm5hbWUnLCAnSW50ZXJuYWxIdWJvdF9FbmFibGVkJywgJ0ludGVybmFsSHVib3RfU2NyaXB0c1RvTG9hZCcsICdJbnRlcm5hbEh1Ym90X1BhdGhUb0xvYWRDdXN0b21TY3JpcHRzJ10pLm9ic2VydmUoe1xuXHRcdGNoYW5nZWQoKSB7XG5cdFx0XHRyZXR1cm4gaW5pdCgpO1xuXHRcdH0sXG5cdH0pO1xuXHQvLyBUT0RPIHVzZWZ1bCB3aGVuIHdlIGhhdmUgdGhlIGFiaWxpdHkgdG8gaW52YWxpZGF0ZSBgcmVxdWlyZWAgY2FjaGVcblx0Ly8gUm9ja2V0Q2hhdC5SYXRlTGltaXRlci5saW1pdE1ldGhvZCgncmVsb2FkSW50ZXJuYWxIdWJvdCcsIDEsIDUwMDAsIHtcblx0Ly8gXHR1c2VySWQoLyp1c2VySWQqLykgeyByZXR1cm4gdHJ1ZTsgfVxuXHQvLyB9KTtcblx0Ly8gTWV0ZW9yLm1ldGhvZHMoe1xuXHQvLyBcdHJlbG9hZEludGVybmFsSHVib3Q6ICgpID0+IGluaXQoKVxuXHQvLyB9KTtcbn0pO1xuIiwiUm9ja2V0Q2hhdC5zZXR0aW5ncy5hZGRHcm91cCgnSW50ZXJuYWxIdWJvdCcsIGZ1bmN0aW9uKCkge1xuXHR0aGlzLmFkZCgnSW50ZXJuYWxIdWJvdF9FbmFibGVkJywgZmFsc2UsIHsgdHlwZTogJ2Jvb2xlYW4nLCBpMThuTGFiZWw6ICdFbmFibGVkJyB9KTtcblx0dGhpcy5hZGQoJ0ludGVybmFsSHVib3RfVXNlcm5hbWUnLCAncm9ja2V0LmNhdCcsIHsgdHlwZTogJ3N0cmluZycsIGkxOG5MYWJlbDogJ1VzZXJuYW1lJywgaTE4bkRlc2NyaXB0aW9uOiAnSW50ZXJuYWxIdWJvdF9Vc2VybmFtZV9EZXNjcmlwdGlvbicsIHB1YmxpYzogdHJ1ZSB9KTtcblx0dGhpcy5hZGQoJ0ludGVybmFsSHVib3RfU2NyaXB0c1RvTG9hZCcsICcnLCB7IHR5cGU6ICdzdHJpbmcnIH0pO1xuXHR0aGlzLmFkZCgnSW50ZXJuYWxIdWJvdF9QYXRoVG9Mb2FkQ3VzdG9tU2NyaXB0cycsICcnLCB7IHR5cGU6ICdzdHJpbmcnIH0pO1xuXHR0aGlzLmFkZCgnSW50ZXJuYWxIdWJvdF9FbmFibGVGb3JDaGFubmVscycsIHRydWUsIHsgdHlwZTogJ2Jvb2xlYW4nIH0pO1xuXHR0aGlzLmFkZCgnSW50ZXJuYWxIdWJvdF9FbmFibGVGb3JEaXJlY3RNZXNzYWdlcycsIGZhbHNlLCB7IHR5cGU6ICdib29sZWFuJyB9KTtcblx0dGhpcy5hZGQoJ0ludGVybmFsSHVib3RfRW5hYmxlRm9yUHJpdmF0ZUdyb3VwcycsIGZhbHNlLCB7IHR5cGU6ICdib29sZWFuJyB9KTtcblx0Ly8gdGhpcy5hZGQoJ0ludGVybmFsSHVib3RfcmVsb2FkJywgJ3JlbG9hZEludGVybmFsSHVib3QnLCB7XG5cdC8vIFx0dHlwZTogJ2FjdGlvbicsXG5cdC8vIFx0YWN0aW9uVGV4dDogJ3JlbG9hZCdcblx0Ly8gfSk7XG59KTtcbiJdfQ==
