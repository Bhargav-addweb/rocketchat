(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var _ = Package.underscore._;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:irc":{"server":{"irc.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc.js                                                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let Bridge;
module.watch(require("./irc-bridge"), {
  default(v) {
    Bridge = v;
  }

}, 0);

if (!!RocketChat.settings.get('IRC_Enabled') === true) {
  // Normalize the config values
  const config = {
    server: {
      protocol: RocketChat.settings.get('IRC_Protocol'),
      host: RocketChat.settings.get('IRC_Host'),
      port: RocketChat.settings.get('IRC_Port'),
      name: RocketChat.settings.get('IRC_Name'),
      description: RocketChat.settings.get('IRC_Description')
    },
    passwords: {
      local: RocketChat.settings.get('IRC_Local_Password'),
      peer: RocketChat.settings.get('IRC_Peer_Password')
    }
  };
  Meteor.ircBridge = new Bridge(config);
  Meteor.startup(() => {
    Meteor.ircBridge.init();
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods":{"resetIrcConnection.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/methods/resetIrcConnection.js                                                     //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let Bridge;
module.watch(require("../irc-bridge"), {
  default(v) {
    Bridge = v;
  }

}, 0);
Meteor.methods({
  resetIrcConnection() {
    const ircEnabled = !!RocketChat.settings.get('IRC_Enabled') === true;

    if (Meteor.ircBridge) {
      Meteor.ircBridge.stop();

      if (!ircEnabled) {
        return {
          message: 'Connection_Closed',
          params: []
        };
      }
    }

    if (ircEnabled) {
      if (Meteor.ircBridge) {
        Meteor.ircBridge.init();
        return {
          message: 'Connection_Reset',
          params: []
        };
      } // Normalize the config values


      const config = {
        server: {
          protocol: RocketChat.settings.get('IRC_Protocol'),
          host: RocketChat.settings.get('IRC_Host'),
          port: RocketChat.settings.get('IRC_Port'),
          name: RocketChat.settings.get('IRC_Name'),
          description: RocketChat.settings.get('IRC_Description')
        },
        passwords: {
          local: RocketChat.settings.get('IRC_Local_Password'),
          peer: RocketChat.settings.get('IRC_Peer_Password')
        }
      };
      Meteor.ircBridge = new Bridge(config);
      Meteor.ircBridge.init();
      return {
        message: 'Connection_Reset',
        params: []
      };
    }

    throw new Meteor.Error(t('IRC_Federation_Disabled'));
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"irc-settings.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-settings.js                                                                   //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
Meteor.startup(function () {
  RocketChat.settings.addGroup('IRC_Federation', function () {
    this.add('IRC_Enabled', false, {
      type: 'boolean',
      i18nLabel: 'Enabled',
      i18nDescription: 'IRC_Enabled',
      alert: 'IRC_Enabled_Alert'
    });
    this.add('IRC_Protocol', 'RFC2813', {
      type: 'select',
      i18nLabel: 'Protocol',
      i18nDescription: 'IRC_Protocol',
      values: [{
        key: 'RFC2813',
        i18nLabel: 'RFC2813'
      }]
    });
    this.add('IRC_Host', 'localhost', {
      type: 'string',
      i18nLabel: 'Host',
      i18nDescription: 'IRC_Host'
    });
    this.add('IRC_Port', 6667, {
      type: 'int',
      i18nLabel: 'Port',
      i18nDescription: 'IRC_Port'
    });
    this.add('IRC_Name', 'irc.rocket.chat', {
      type: 'string',
      i18nLabel: 'Name',
      i18nDescription: 'IRC_Name'
    });
    this.add('IRC_Description', 'Rocket.Chat IRC Bridge', {
      type: 'string',
      i18nLabel: 'Description',
      i18nDescription: 'IRC_Description'
    });
    this.add('IRC_Local_Password', 'password', {
      type: 'string',
      i18nLabel: 'Local_Password',
      i18nDescription: 'IRC_Local_Password'
    });
    this.add('IRC_Peer_Password', 'password', {
      type: 'string',
      i18nLabel: 'Peer_Password',
      i18nDescription: 'IRC_Peer_Password'
    });
    this.add('IRC_Reset_Connection', 'resetIrcConnection', {
      type: 'action',
      actionText: 'Reset_Connection',
      i18nLabel: 'Reset_Connection'
    });
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"irc-bridge":{"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/index.js                                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let Queue;
module.watch(require("queue-fifo"), {
  default(v) {
    Queue = v;
  }

}, 0);
let servers;
module.watch(require("../servers"), {
  "*"(v) {
    servers = v;
  }

}, 1);
let peerCommandHandlers;
module.watch(require("./peerHandlers"), {
  "*"(v) {
    peerCommandHandlers = v;
  }

}, 2);
let localCommandHandlers;
module.watch(require("./localHandlers"), {
  "*"(v) {
    localCommandHandlers = v;
  }

}, 3);

class Bridge {
  constructor(config) {
    // General
    this.config = config; // Workaround for Rocket.Chat callbacks being called multiple times

    this.loggedInUsers = []; // Server

    const Server = servers[this.config.server.protocol];
    this.server = new Server(this.config);
    this.setupPeerHandlers();
    this.setupLocalHandlers(); // Command queue

    this.queue = new Queue();
    this.queueTimeout = 5;
  }

  init() {
    this.loggedInUsers = [];
    this.server.register();
    this.server.on('registered', () => {
      this.logQueue('Starting...');
      this.runQueue();
    });
  }

  stop() {
    this.server.disconnect();
  }
  /**
   * Log helper
   */


  log(message) {
    console.log(`[irc][bridge] ${message}`);
  }

  logQueue(message) {
    console.log(`[irc][bridge][queue] ${message}`);
  }
  /**
   *
   *
   * Queue
   *
   *
   */


  onMessageReceived(from, command, ...parameters) {
    this.queue.enqueue({
      from,
      command,
      parameters
    });
  }

  runQueue() {
    return Promise.asyncApply(() => {
      // If it is empty, skip and keep the queue going
      if (this.queue.isEmpty()) {
        return setTimeout(this.runQueue.bind(this), this.queueTimeout);
      } // Get the command


      const item = this.queue.dequeue();
      this.logQueue(`Processing "${item.command}" command from "${item.from}"`); // Handle the command accordingly

      switch (item.from) {
        case 'local':
          if (!localCommandHandlers[item.command]) {
            throw new Error(`Could not find handler for local:${item.command}`);
          }

          Promise.await(localCommandHandlers[item.command].apply(this, item.parameters));
          break;

        case 'peer':
          if (!peerCommandHandlers[item.command]) {
            throw new Error(`Could not find handler for peer:${item.command}`);
          }

          Promise.await(peerCommandHandlers[item.command].apply(this, item.parameters));
          break;
      } // Keep the queue going


      setTimeout(this.runQueue.bind(this), this.queueTimeout);
    });
  }
  /**
   *
   *
   * Peer
   *
   *
   */


  setupPeerHandlers() {
    this.server.on('peerCommand', cmd => {
      this.onMessageReceived('peer', cmd.identifier, cmd.args);
    });
  }
  /**
   *
   *
   * Local
   *
   *
   */


  setupLocalHandlers() {
    // Auth
    RocketChat.callbacks.add('afterValidateLogin', this.onMessageReceived.bind(this, 'local', 'onLogin'), RocketChat.callbacks.priority.LOW, 'irc-on-login');
    RocketChat.callbacks.add('afterCreateUser', this.onMessageReceived.bind(this, 'local', 'onCreateUser'), RocketChat.callbacks.priority.LOW, 'irc-on-create-user'); // Joining rooms or channels

    RocketChat.callbacks.add('afterCreateChannel', this.onMessageReceived.bind(this, 'local', 'onCreateRoom'), RocketChat.callbacks.priority.LOW, 'irc-on-create-channel');
    RocketChat.callbacks.add('afterCreateRoom', this.onMessageReceived.bind(this, 'local', 'onCreateRoom'), RocketChat.callbacks.priority.LOW, 'irc-on-create-room');
    RocketChat.callbacks.add('afterJoinRoom', this.onMessageReceived.bind(this, 'local', 'onJoinRoom'), RocketChat.callbacks.priority.LOW, 'irc-on-join-room'); // Leaving rooms or channels

    RocketChat.callbacks.add('afterLeaveRoom', this.onMessageReceived.bind(this, 'local', 'onLeaveRoom'), RocketChat.callbacks.priority.LOW, 'irc-on-leave-room'); // Chatting

    RocketChat.callbacks.add('afterSaveMessage', this.onMessageReceived.bind(this, 'local', 'onSaveMessage'), RocketChat.callbacks.priority.LOW, 'irc-on-save-message'); // Leaving

    RocketChat.callbacks.add('afterLogoutCleanUp', this.onMessageReceived.bind(this, 'local', 'onLogout'), RocketChat.callbacks.priority.LOW, 'irc-on-logout');
  }

  sendCommand(command, parameters) {
    this.server.emit('onReceiveFromLocal', command, parameters);
  }

}

module.exportDefault(Bridge);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"localHandlers":{"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/index.js                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  onCreateRoom: () => onCreateRoom,
  onJoinRoom: () => onJoinRoom,
  onLeaveRoom: () => onLeaveRoom,
  onLogin: () => onLogin,
  onLogout: () => onLogout,
  onSaveMessage: () => onSaveMessage,
  onCreateUser: () => onCreateUser
});
let onCreateRoom;
module.watch(require("./onCreateRoom"), {
  default(v) {
    onCreateRoom = v;
  }

}, 0);
let onJoinRoom;
module.watch(require("./onJoinRoom"), {
  default(v) {
    onJoinRoom = v;
  }

}, 1);
let onLeaveRoom;
module.watch(require("./onLeaveRoom"), {
  default(v) {
    onLeaveRoom = v;
  }

}, 2);
let onLogin;
module.watch(require("./onLogin"), {
  default(v) {
    onLogin = v;
  }

}, 3);
let onLogout;
module.watch(require("./onLogout"), {
  default(v) {
    onLogout = v;
  }

}, 4);
let onSaveMessage;
module.watch(require("./onSaveMessage"), {
  default(v) {
    onSaveMessage = v;
  }

}, 5);
let onCreateUser;
module.watch(require("./onCreateUser"), {
  default(v) {
    onCreateUser = v;
  }

}, 6);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"onCreateRoom.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/onCreateRoom.js                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleOnCreateRoom
});

function handleOnCreateRoom(user, room) {
  const users = RocketChat.models.Users.findByRoomId(room._id);
  users.forEach(user => {
    if (user.profile.irc.fromIRC) {
      this.sendCommand('joinChannel', {
        room,
        user
      });
    } else {
      this.sendCommand('joinedChannel', {
        room,
        user
      });
    }
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"onCreateUser.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/onCreateUser.js                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleOnCreateUser
});

function handleOnCreateUser(newUser) {
  if (!newUser) {
    return this.log('Invalid handleOnCreateUser call');
  }

  if (!newUser.username) {
    return this.log('Invalid handleOnCreateUser call (Missing username)');
  }

  if (this.loggedInUsers.indexOf(newUser._id) !== -1) {
    return this.log('Duplicate handleOnCreateUser call');
  }

  this.loggedInUsers.push(newUser._id);
  Meteor.users.update({
    _id: newUser._id
  }, {
    $set: {
      'profile.irc.fromIRC': false,
      'profile.irc.username': `${newUser.username}-rkt`,
      'profile.irc.nick': `${newUser.username}-rkt`,
      'profile.irc.hostname': 'rocket.chat'
    }
  });
  const user = RocketChat.models.Users.findOne({
    _id: newUser._id
  });
  this.sendCommand('registerUser', user);
  const rooms = RocketChat.models.Rooms.findBySubscriptionUserId(user._id).fetch();
  rooms.forEach(room => this.sendCommand('joinedChannel', {
    room,
    user
  }));
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"onJoinRoom.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/onJoinRoom.js                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleOnJoinRoom
});

function handleOnJoinRoom(user, room) {
  this.sendCommand('joinedChannel', {
    room,
    user
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"onLeaveRoom.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/onLeaveRoom.js                                           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleOnLeaveRoom
});

function handleOnLeaveRoom(user, room) {
  this.sendCommand('leftChannel', {
    room,
    user
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"onLogin.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/onLogin.js                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleOnLogin
});

function handleOnLogin(login) {
  if (login.user === null) {
    return this.log('Invalid handleOnLogin call');
  }

  if (!login.user.username) {
    return this.log('Invalid handleOnLogin call (Missing username)');
  }

  if (this.loggedInUsers.indexOf(login.user._id) !== -1) {
    return this.log('Duplicate handleOnLogin call');
  }

  this.loggedInUsers.push(login.user._id);
  Meteor.users.update({
    _id: login.user._id
  }, {
    $set: {
      'profile.irc.fromIRC': false,
      'profile.irc.username': `${login.user.username}-rkt`,
      'profile.irc.nick': `${login.user.username}-rkt`,
      'profile.irc.hostname': 'rocket.chat'
    }
  });
  const user = RocketChat.models.Users.findOne({
    _id: login.user._id
  });
  this.sendCommand('registerUser', user);
  const rooms = RocketChat.models.Rooms.findBySubscriptionUserId(user._id).fetch();
  rooms.forEach(room => this.sendCommand('joinedChannel', {
    room,
    user
  }));
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"onLogout.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/onLogout.js                                              //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleOnLogout
});

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

function handleOnLogout(user) {
  this.loggedInUsers = _.without(this.loggedInUsers, user._id);
  this.sendCommand('disconnected', {
    user
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"onSaveMessage.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/localHandlers/onSaveMessage.js                                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleOnSaveMessage
});

function handleOnSaveMessage(message, to) {
  let toIdentification = ''; // Direct message

  if (to.t === 'd') {
    const subscriptions = RocketChat.models.Subscriptions.findByRoomId(to._id);
    subscriptions.forEach(subscription => {
      if (subscription.u.username !== to.username) {
        const userData = RocketChat.models.Users.findOne({
          username: subscription.u.username
        });

        if (userData) {
          if (userData.profile && userData.profile.irc && userData.profile.irc.nick) {
            toIdentification = userData.profile.irc.nick;
          } else {
            toIdentification = userData.username;
          }
        } else {
          toIdentification = subscription.u.username;
        }
      }
    });

    if (!toIdentification) {
      console.error('[irc][server] Target user not found');
      return;
    }
  } else {
    toIdentification = `#${to.name}`;
  }

  const user = RocketChat.models.Users.findOne({
    _id: message.u._id
  });
  this.sendCommand('sentMessage', {
    to: toIdentification,
    user,
    message: message.msg
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"peerHandlers":{"disconnected.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/peerHandlers/disconnected.js                                           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleQUIT
});

function handleQUIT(args) {
  const user = RocketChat.models.Users.findOne({
    'profile.irc.nick': args.nick
  });
  Meteor.users.update({
    _id: user._id
  }, {
    $set: {
      status: 'offline'
    }
  });
  RocketChat.models.Rooms.removeUsernameFromAll(user.username);
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/peerHandlers/index.js                                                  //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  disconnected: () => disconnected,
  joinedChannel: () => joinedChannel,
  leftChannel: () => leftChannel,
  nickChanged: () => nickChanged,
  sentMessage: () => sentMessage,
  userRegistered: () => userRegistered
});
let disconnected;
module.watch(require("./disconnected"), {
  default(v) {
    disconnected = v;
  }

}, 0);
let joinedChannel;
module.watch(require("./joinedChannel"), {
  default(v) {
    joinedChannel = v;
  }

}, 1);
let leftChannel;
module.watch(require("./leftChannel"), {
  default(v) {
    leftChannel = v;
  }

}, 2);
let nickChanged;
module.watch(require("./nickChanged"), {
  default(v) {
    nickChanged = v;
  }

}, 3);
let sentMessage;
module.watch(require("./sentMessage"), {
  default(v) {
    sentMessage = v;
  }

}, 4);
let userRegistered;
module.watch(require("./userRegistered"), {
  default(v) {
    userRegistered = v;
  }

}, 5);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"joinedChannel.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/peerHandlers/joinedChannel.js                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleJoinedChannel
});

function handleJoinedChannel(args) {
  const user = RocketChat.models.Users.findOne({
    'profile.irc.nick': args.nick
  });

  if (!user) {
    throw new Error(`Could not find a user with nick ${args.nick}`);
  }

  let room = RocketChat.models.Rooms.findOneByName(args.roomName);

  if (!room) {
    const createdRoom = RocketChat.createRoom('c', args.roomName, user.username, []);
    room = RocketChat.models.Rooms.findOne({
      _id: createdRoom.rid
    });
    this.log(`${user.username} created room ${args.roomName}`);
  } else {
    RocketChat.addUserToRoom(room._id, user);
    this.log(`${user.username} joined room ${room.name}`);
  }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"leftChannel.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/peerHandlers/leftChannel.js                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleLeftChannel
});

function handleLeftChannel(args) {
  const user = RocketChat.models.Users.findOne({
    'profile.irc.nick': args.nick
  });

  if (!user) {
    throw new Error(`Could not find a user with nick ${args.nick}`);
  }

  const room = RocketChat.models.Rooms.findOneByName(args.roomName);

  if (!room) {
    throw new Error(`Could not find a room with name ${args.roomName}`);
  }

  this.log(`${user.username} left room ${room.name}`);
  RocketChat.removeUserFromRoom(room._id, user);
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"nickChanged.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/peerHandlers/nickChanged.js                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleNickChanged
});

function handleNickChanged(args) {
  const user = RocketChat.models.Users.findOne({
    'profile.irc.nick': args.nick
  });

  if (!user) {
    throw new Error(`Could not find an user with nick ${args.nick}`);
  }

  this.log(`${user.username} changed nick: ${args.nick} -> ${args.newNick}`); // Update on the database

  RocketChat.models.Users.update({
    _id: user._id
  }, {
    $set: {
      name: args.newNick,
      'profile.irc.nick': args.newNick
    }
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sentMessage.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/peerHandlers/sentMessage.js                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleSentMessage
});

/*
 *
 * Get direct chat room helper
 *
 *
 */
const getDirectRoom = (source, target) => {
  const rid = [source._id, target._id].sort().join('');
  RocketChat.models.Rooms.upsert({
    _id: rid
  }, {
    $setOnInsert: {
      t: 'd',
      msgs: 0,
      ts: new Date()
    }
  });
  RocketChat.models.Subscriptions.upsert({
    rid,
    'u._id': target._id
  }, {
    $setOnInsert: {
      name: source.username,
      t: 'd',
      open: false,
      alert: false,
      unread: 0,
      u: {
        _id: target._id,
        username: target.username
      }
    }
  });
  RocketChat.models.Subscriptions.upsert({
    rid,
    'u._id': source._id
  }, {
    $setOnInsert: {
      name: target.username,
      t: 'd',
      open: false,
      alert: false,
      unread: 0,
      u: {
        _id: source._id,
        username: source.username
      }
    }
  });
  return {
    _id: rid,
    t: 'd'
  };
};

function handleSentMessage(args) {
  const user = RocketChat.models.Users.findOne({
    'profile.irc.nick': args.nick
  });

  if (!user) {
    throw new Error(`Could not find a user with nick ${args.nick}`);
  }

  let room;

  if (args.roomName) {
    room = RocketChat.models.Rooms.findOneByName(args.roomName);
  } else {
    const recipientUser = RocketChat.models.Users.findOne({
      'profile.irc.nick': args.recipientNick
    });
    room = getDirectRoom(user, recipientUser);
  }

  const message = {
    msg: args.message,
    ts: new Date()
  };
  RocketChat.sendMessage(user, message, room);
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"userRegistered.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/irc-bridge/peerHandlers/userRegistered.js                                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  default: () => handleUserRegistered
});

function handleUserRegistered(args) {
  return Promise.asyncApply(() => {
    // Check if there is an user with the given username
    let user = RocketChat.models.Users.findOne({
      'profile.irc.username': args.username
    }); // If there is no user, create one...

    if (!user) {
      this.log(`Registering ${args.username} with nick: ${args.nick}`);
      const userToInsert = {
        name: args.nick,
        username: `${args.username}-irc`,
        status: 'online',
        utcOffset: 0,
        active: true,
        type: 'user',
        profile: {
          irc: {
            fromIRC: true,
            nick: args.nick,
            username: args.username,
            hostname: args.hostname
          }
        }
      };
      user = RocketChat.models.Users.create(userToInsert);
    } else {
      // ...otherwise, log the user in and update the information
      this.log(`Logging in ${args.username} with nick: ${args.nick}`);
      Meteor.users.update({
        _id: user._id
      }, {
        $set: {
          status: 'online',
          'profile.irc.nick': args.nick,
          'profile.irc.username': args.username,
          'profile.irc.hostname': args.hostname
        }
      });
    }
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"servers":{"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/servers/index.js                                                                  //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  RFC2813: () => RFC2813
});
let RFC2813;
module.watch(require("./RFC2813"), {
  default(v) {
    RFC2813 = v;
  }

}, 0);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"RFC2813":{"codes.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/servers/RFC2813/codes.js                                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/**
 * This file is part of https://github.com/martynsmith/node-irc
 * by https://github.com/martynsmith
 */
module.exports = {
  '001': {
    name: 'rpl_welcome',
    type: 'reply'
  },
  '002': {
    name: 'rpl_yourhost',
    type: 'reply'
  },
  '003': {
    name: 'rpl_created',
    type: 'reply'
  },
  '004': {
    name: 'rpl_myinfo',
    type: 'reply'
  },
  '005': {
    name: 'rpl_isupport',
    type: 'reply'
  },
  200: {
    name: 'rpl_tracelink',
    type: 'reply'
  },
  201: {
    name: 'rpl_traceconnecting',
    type: 'reply'
  },
  202: {
    name: 'rpl_tracehandshake',
    type: 'reply'
  },
  203: {
    name: 'rpl_traceunknown',
    type: 'reply'
  },
  204: {
    name: 'rpl_traceoperator',
    type: 'reply'
  },
  205: {
    name: 'rpl_traceuser',
    type: 'reply'
  },
  206: {
    name: 'rpl_traceserver',
    type: 'reply'
  },
  208: {
    name: 'rpl_tracenewtype',
    type: 'reply'
  },
  211: {
    name: 'rpl_statslinkinfo',
    type: 'reply'
  },
  212: {
    name: 'rpl_statscommands',
    type: 'reply'
  },
  213: {
    name: 'rpl_statscline',
    type: 'reply'
  },
  214: {
    name: 'rpl_statsnline',
    type: 'reply'
  },
  215: {
    name: 'rpl_statsiline',
    type: 'reply'
  },
  216: {
    name: 'rpl_statskline',
    type: 'reply'
  },
  218: {
    name: 'rpl_statsyline',
    type: 'reply'
  },
  219: {
    name: 'rpl_endofstats',
    type: 'reply'
  },
  221: {
    name: 'rpl_umodeis',
    type: 'reply'
  },
  241: {
    name: 'rpl_statslline',
    type: 'reply'
  },
  242: {
    name: 'rpl_statsuptime',
    type: 'reply'
  },
  243: {
    name: 'rpl_statsoline',
    type: 'reply'
  },
  244: {
    name: 'rpl_statshline',
    type: 'reply'
  },
  250: {
    name: 'rpl_statsconn',
    type: 'reply'
  },
  251: {
    name: 'rpl_luserclient',
    type: 'reply'
  },
  252: {
    name: 'rpl_luserop',
    type: 'reply'
  },
  253: {
    name: 'rpl_luserunknown',
    type: 'reply'
  },
  254: {
    name: 'rpl_luserchannels',
    type: 'reply'
  },
  255: {
    name: 'rpl_luserme',
    type: 'reply'
  },
  256: {
    name: 'rpl_adminme',
    type: 'reply'
  },
  257: {
    name: 'rpl_adminloc1',
    type: 'reply'
  },
  258: {
    name: 'rpl_adminloc2',
    type: 'reply'
  },
  259: {
    name: 'rpl_adminemail',
    type: 'reply'
  },
  261: {
    name: 'rpl_tracelog',
    type: 'reply'
  },
  265: {
    name: 'rpl_localusers',
    type: 'reply'
  },
  266: {
    name: 'rpl_globalusers',
    type: 'reply'
  },
  300: {
    name: 'rpl_none',
    type: 'reply'
  },
  301: {
    name: 'rpl_away',
    type: 'reply'
  },
  302: {
    name: 'rpl_userhost',
    type: 'reply'
  },
  303: {
    name: 'rpl_ison',
    type: 'reply'
  },
  305: {
    name: 'rpl_unaway',
    type: 'reply'
  },
  306: {
    name: 'rpl_nowaway',
    type: 'reply'
  },
  311: {
    name: 'rpl_whoisuser',
    type: 'reply'
  },
  312: {
    name: 'rpl_whoisserver',
    type: 'reply'
  },
  313: {
    name: 'rpl_whoisoperator',
    type: 'reply'
  },
  314: {
    name: 'rpl_whowasuser',
    type: 'reply'
  },
  315: {
    name: 'rpl_endofwho',
    type: 'reply'
  },
  317: {
    name: 'rpl_whoisidle',
    type: 'reply'
  },
  318: {
    name: 'rpl_endofwhois',
    type: 'reply'
  },
  319: {
    name: 'rpl_whoischannels',
    type: 'reply'
  },
  321: {
    name: 'rpl_liststart',
    type: 'reply'
  },
  322: {
    name: 'rpl_list',
    type: 'reply'
  },
  323: {
    name: 'rpl_listend',
    type: 'reply'
  },
  324: {
    name: 'rpl_channelmodeis',
    type: 'reply'
  },
  329: {
    name: 'rpl_creationtime',
    type: 'reply'
  },
  331: {
    name: 'rpl_notopic',
    type: 'reply'
  },
  332: {
    name: 'rpl_topic',
    type: 'reply'
  },
  333: {
    name: 'rpl_topicwhotime',
    type: 'reply'
  },
  341: {
    name: 'rpl_inviting',
    type: 'reply'
  },
  342: {
    name: 'rpl_summoning',
    type: 'reply'
  },
  351: {
    name: 'rpl_version',
    type: 'reply'
  },
  352: {
    name: 'rpl_whoreply',
    type: 'reply'
  },
  353: {
    name: 'rpl_namreply',
    type: 'reply'
  },
  364: {
    name: 'rpl_links',
    type: 'reply'
  },
  365: {
    name: 'rpl_endoflinks',
    type: 'reply'
  },
  366: {
    name: 'rpl_endofnames',
    type: 'reply'
  },
  367: {
    name: 'rpl_banlist',
    type: 'reply'
  },
  368: {
    name: 'rpl_endofbanlist',
    type: 'reply'
  },
  369: {
    name: 'rpl_endofwhowas',
    type: 'reply'
  },
  371: {
    name: 'rpl_info',
    type: 'reply'
  },
  372: {
    name: 'rpl_motd',
    type: 'reply'
  },
  374: {
    name: 'rpl_endofinfo',
    type: 'reply'
  },
  375: {
    name: 'rpl_motdstart',
    type: 'reply'
  },
  376: {
    name: 'rpl_endofmotd',
    type: 'reply'
  },
  381: {
    name: 'rpl_youreoper',
    type: 'reply'
  },
  382: {
    name: 'rpl_rehashing',
    type: 'reply'
  },
  391: {
    name: 'rpl_time',
    type: 'reply'
  },
  392: {
    name: 'rpl_usersstart',
    type: 'reply'
  },
  393: {
    name: 'rpl_users',
    type: 'reply'
  },
  394: {
    name: 'rpl_endofusers',
    type: 'reply'
  },
  395: {
    name: 'rpl_nousers',
    type: 'reply'
  },
  401: {
    name: 'err_nosuchnick',
    type: 'error'
  },
  402: {
    name: 'err_nosuchserver',
    type: 'error'
  },
  403: {
    name: 'err_nosuchchannel',
    type: 'error'
  },
  404: {
    name: 'err_cannotsendtochan',
    type: 'error'
  },
  405: {
    name: 'err_toomanychannels',
    type: 'error'
  },
  406: {
    name: 'err_wasnosuchnick',
    type: 'error'
  },
  407: {
    name: 'err_toomanytargets',
    type: 'error'
  },
  409: {
    name: 'err_noorigin',
    type: 'error'
  },
  411: {
    name: 'err_norecipient',
    type: 'error'
  },
  412: {
    name: 'err_notexttosend',
    type: 'error'
  },
  413: {
    name: 'err_notoplevel',
    type: 'error'
  },
  414: {
    name: 'err_wildtoplevel',
    type: 'error'
  },
  421: {
    name: 'err_unknowncommand',
    type: 'error'
  },
  422: {
    name: 'err_nomotd',
    type: 'error'
  },
  423: {
    name: 'err_noadmininfo',
    type: 'error'
  },
  424: {
    name: 'err_fileerror',
    type: 'error'
  },
  431: {
    name: 'err_nonicknamegiven',
    type: 'error'
  },
  432: {
    name: 'err_erroneusnickname',
    type: 'error'
  },
  433: {
    name: 'err_nicknameinuse',
    type: 'error'
  },
  436: {
    name: 'err_nickcollision',
    type: 'error'
  },
  441: {
    name: 'err_usernotinchannel',
    type: 'error'
  },
  442: {
    name: 'err_notonchannel',
    type: 'error'
  },
  443: {
    name: 'err_useronchannel',
    type: 'error'
  },
  444: {
    name: 'err_nologin',
    type: 'error'
  },
  445: {
    name: 'err_summondisabled',
    type: 'error'
  },
  446: {
    name: 'err_usersdisabled',
    type: 'error'
  },
  451: {
    name: 'err_notregistered',
    type: 'error'
  },
  461: {
    name: 'err_needmoreparams',
    type: 'error'
  },
  462: {
    name: 'err_alreadyregistred',
    type: 'error'
  },
  463: {
    name: 'err_nopermforhost',
    type: 'error'
  },
  464: {
    name: 'err_passwdmismatch',
    type: 'error'
  },
  465: {
    name: 'err_yourebannedcreep',
    type: 'error'
  },
  467: {
    name: 'err_keyset',
    type: 'error'
  },
  471: {
    name: 'err_channelisfull',
    type: 'error'
  },
  472: {
    name: 'err_unknownmode',
    type: 'error'
  },
  473: {
    name: 'err_inviteonlychan',
    type: 'error'
  },
  474: {
    name: 'err_bannedfromchan',
    type: 'error'
  },
  475: {
    name: 'err_badchannelkey',
    type: 'error'
  },
  481: {
    name: 'err_noprivileges',
    type: 'error'
  },
  482: {
    name: 'err_chanoprivsneeded',
    type: 'error'
  },
  483: {
    name: 'err_cantkillserver',
    type: 'error'
  },
  491: {
    name: 'err_nooperhost',
    type: 'error'
  },
  501: {
    name: 'err_umodeunknownflag',
    type: 'error'
  },
  502: {
    name: 'err_usersdontmatch',
    type: 'error'
  }
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/servers/RFC2813/index.js                                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let net;
module.watch(require("net"), {
  default(v) {
    net = v;
  }

}, 0);
let util;
module.watch(require("util"), {
  default(v) {
    util = v;
  }

}, 1);
let EventEmitter;
module.watch(require("events"), {
  EventEmitter(v) {
    EventEmitter = v;
  }

}, 2);
let parseMessage;
module.watch(require("./parseMessage"), {
  default(v) {
    parseMessage = v;
  }

}, 3);
let peerCommandHandlers;
module.watch(require("./peerCommandHandlers"), {
  default(v) {
    peerCommandHandlers = v;
  }

}, 4);
let localCommandHandlers;
module.watch(require("./localCommandHandlers"), {
  default(v) {
    localCommandHandlers = v;
  }

}, 5);

class RFC2813 {
  constructor(config) {
    this.config = config; // Hold registered state

    this.registerSteps = [];
    this.isRegistered = false; // Hold peer server information

    this.serverPrefix = null; // Hold the buffer while receiving

    this.receiveBuffer = new Buffer('');
  }
  /**
   * Setup socket
   */


  setupSocket() {
    // Setup socket
    this.socket = new net.Socket();
    this.socket.setNoDelay();
    this.socket.setEncoding('utf-8');
    this.socket.setKeepAlive(true);
    this.socket.setTimeout(90000);
    this.socket.on('data', this.onReceiveFromPeer.bind(this));
    this.socket.on('connect', this.onConnect.bind(this));
    this.socket.on('error', err => console.log('[irc][server][err]', err));
    this.socket.on('timeout', () => this.log('Timeout'));
    this.socket.on('close', () => this.log('Connection Closed')); // Setup local

    this.on('onReceiveFromLocal', this.onReceiveFromLocal.bind(this));
  }
  /**
   * Log helper
   */


  log(message) {
    console.log(`[irc][server] ${message}`);
  }
  /**
   * Connect
   */


  register() {
    this.log(`Connecting to @${this.config.server.host}:${this.config.server.port}`);

    if (!this.socket) {
      this.setupSocket();
    }

    this.socket.connect(this.config.server.port, this.config.server.host);
  }
  /**
   * Disconnect
   */


  disconnect() {
    this.log('Disconnecting from server.');

    if (this.socket) {
      this.socket.destroy();
      this.socket = undefined;
    }

    this.isRegistered = false;
    this.registerSteps = [];
  }
  /**
   * Setup the server connection
   */


  onConnect() {
    this.log('Connected! Registering as server...');
    this.write({
      command: 'PASS',
      parameters: [this.config.passwords.local, '0210', 'ngircd']
    });
    this.write({
      command: 'SERVER',
      parameters: [this.config.server.name],
      trailer: this.config.server.description
    });
  }
  /**
   * Sends a command message through the socket
   */


  write(command) {
    let buffer = command.prefix ? `:${command.prefix} ` : '';
    buffer += command.command;

    if (command.parameters && command.parameters.length > 0) {
      buffer += ` ${command.parameters.join(' ')}`;
    }

    if (command.trailer) {
      buffer += ` :${command.trailer}`;
    }

    this.log(`Sending Command: ${buffer}`);
    return this.socket.write(`${buffer}\r\n`);
  }
  /**
   *
   *
   * Peer message handling
   *
   *
   */


  onReceiveFromPeer(chunk) {
    if (typeof chunk === 'string') {
      this.receiveBuffer += chunk;
    } else {
      this.receiveBuffer = Buffer.concat([this.receiveBuffer, chunk]);
    }

    const lines = this.receiveBuffer.toString().split(/\r\n|\r|\n|\u0007/); // eslint-disable-line no-control-regex
    // If the buffer does not end with \r\n, more chunks are coming

    if (lines.pop()) {
      return;
    } // Reset the buffer


    this.receiveBuffer = new Buffer('');
    lines.forEach(line => {
      if (line.length && !line.startsWith('\a')) {
        const parsedMessage = parseMessage(line);

        if (peerCommandHandlers[parsedMessage.command]) {
          this.log(`Handling peer message: ${line}`);
          const command = peerCommandHandlers[parsedMessage.command].call(this, parsedMessage);

          if (command) {
            this.log(`Emitting peer command to local: ${JSON.stringify(command)}`);
            this.emit('peerCommand', command);
          }
        } else {
          this.log(`Unhandled peer message: ${JSON.stringify(parsedMessage)}`);
        }
      }
    });
  }
  /**
   *
   *
   * Local message handling
   *
   *
   */


  onReceiveFromLocal(command, parameters) {
    if (localCommandHandlers[command]) {
      this.log(`Handling local command: ${command}`);
      localCommandHandlers[command].call(this, parameters);
    } else {
      this.log(`Unhandled local command: ${JSON.stringify(command)}`);
    }
  }

}

util.inherits(RFC2813, EventEmitter);
module.exportDefault(RFC2813);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"localCommandHandlers.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/servers/RFC2813/localCommandHandlers.js                                           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
function registerUser(parameters) {
  const {
    name,
    profile: {
      irc: {
        nick,
        username
      }
    }
  } = parameters;
  this.write({
    prefix: this.config.server.name,
    command: 'NICK',
    parameters: [nick, 1, username, 'irc.rocket.chat', 1, '+i'],
    trailer: name
  });
}

function joinChannel(parameters) {
  const {
    room: {
      name: roomName
    },
    user: {
      profile: {
        irc: {
          nick
        }
      }
    }
  } = parameters;
  this.write({
    prefix: this.config.server.name,
    command: 'NJOIN',
    parameters: [`#${roomName}`],
    trailer: nick
  });
}

function joinedChannel(parameters) {
  const {
    room: {
      name: roomName
    },
    user: {
      profile: {
        irc: {
          nick
        }
      }
    }
  } = parameters;
  this.write({
    prefix: nick,
    command: 'JOIN',
    parameters: [`#${roomName}`]
  });
}

function leftChannel(parameters) {
  const {
    room: {
      name: roomName
    },
    user: {
      profile: {
        irc: {
          nick
        }
      }
    }
  } = parameters;
  this.write({
    prefix: nick,
    command: 'PART',
    parameters: [`#${roomName}`]
  });
}

function sentMessage(parameters) {
  const {
    user: {
      profile: {
        irc: {
          nick
        }
      }
    },
    to,
    message
  } = parameters;
  this.write({
    prefix: nick,
    command: 'PRIVMSG',
    parameters: [to],
    trailer: message
  });
}

function disconnected(parameters) {
  const {
    user: {
      profile: {
        irc: {
          nick
        }
      }
    }
  } = parameters;
  this.write({
    prefix: nick,
    command: 'QUIT'
  });
}

module.exportDefault({
  registerUser,
  joinChannel,
  joinedChannel,
  leftChannel,
  sentMessage,
  disconnected
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"parseMessage.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/servers/RFC2813/parseMessage.js                                                   //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/**
 * This file is part of https://github.com/martynsmith/node-irc
 * by https://github.com/martynsmith
 */
const replyFor = require('./codes');
/**
 * parseMessage(line, stripColors)
 *
 * takes a raw "line" from the IRC server and turns it into an object with
 * useful keys
 * @param {String} line Raw message from IRC server.
 * @return {Object} A parsed message object.
 */


module.exports = function parseMessage(line) {
  const message = {};
  let match; // Parse prefix

  match = line.match(/^:([^ ]+) +/);

  if (match) {
    message.prefix = match[1];
    line = line.replace(/^:[^ ]+ +/, '');
    match = message.prefix.match(/^([_a-zA-Z0-9\~\[\]\\`^{}|-]*)(!([^@]+)@(.*))?$/);

    if (match) {
      message.nick = match[1];
      message.user = match[3];
      message.host = match[4];
    } else {
      message.server = message.prefix;
    }
  } // Parse command


  match = line.match(/^([^ ]+) */);
  message.command = match[1];
  message.rawCommand = match[1];
  message.commandType = 'normal';
  line = line.replace(/^[^ ]+ +/, '');

  if (replyFor[message.rawCommand]) {
    message.command = replyFor[message.rawCommand].name;
    message.commandType = replyFor[message.rawCommand].type;
  }

  message.args = [];
  let middle;
  let trailing; // Parse parameters

  if (line.search(/^:|\s+:/) !== -1) {
    match = line.match(/(.*?)(?:^:|\s+:)(.*)/);
    middle = match[1].trimRight();
    trailing = match[2];
  } else {
    middle = line;
  }

  if (middle.length) {
    message.args = middle.split(/ +/);
  }

  if (typeof trailing !== 'undefined' && trailing.length) {
    message.args.push(trailing);
  }

  return message;
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"peerCommandHandlers.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_irc/server/servers/RFC2813/peerCommandHandlers.js                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
function PASS() {
  this.log('Received PASS command, continue registering...');
  this.registerSteps.push('PASS');
}

function SERVER(parsedMessage) {
  this.log('Received SERVER command, waiting for first PING...');
  this.serverPrefix = parsedMessage.prefix;
  this.registerSteps.push('SERVER');
}

function PING() {
  if (!this.isRegistered && this.registerSteps.length === 2) {
    this.log('Received first PING command, server is registered!');
    this.isRegistered = true;
    this.emit('registered');
  }

  this.write({
    prefix: this.config.server.name,
    command: 'PONG',
    parameters: [this.config.server.name]
  });
}

function NICK(parsedMessage) {
  let command; // Check if the message comes from the server,
  // which means it is a new user

  if (parsedMessage.prefix === this.serverPrefix) {
    command = {
      identifier: 'userRegistered',
      args: {
        nick: parsedMessage.args[0],
        username: parsedMessage.args[2],
        host: parsedMessage.args[3],
        name: parsedMessage.args[6]
      }
    };
  } else {
    // Otherwise, it is a nick change
    command = {
      identifier: 'nickChanged',
      args: {
        nick: parsedMessage.nick,
        newNick: parsedMessage.args[0]
      }
    };
  }

  return command;
}

function JOIN(parsedMessage) {
  const command = {
    identifier: 'joinedChannel',
    args: {
      roomName: parsedMessage.args[0].substring(1),
      nick: parsedMessage.prefix
    }
  };
  return command;
}

function PART(parsedMessage) {
  const command = {
    identifier: 'leftChannel',
    args: {
      roomName: parsedMessage.args[0].substring(1),
      nick: parsedMessage.prefix
    }
  };
  return command;
}

function PRIVMSG(parsedMessage) {
  const command = {
    identifier: 'sentMessage',
    args: {
      nick: parsedMessage.prefix,
      message: parsedMessage.args[1]
    }
  };

  if (parsedMessage.args[0][0] === '#') {
    command.args.roomName = parsedMessage.args[0].substring(1);
  } else {
    command.args.recipientNick = parsedMessage.args[0];
  }

  return command;
}

function QUIT(parsedMessage) {
  const command = {
    identifier: 'disconnected',
    args: {
      nick: parsedMessage.prefix
    }
  };
  return command;
}

module.exportDefault({
  PASS,
  SERVER,
  PING,
  NICK,
  JOIN,
  PART,
  PRIVMSG,
  QUIT
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}},"node_modules":{"queue-fifo":{"package.json":function(require,exports){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/rocketchat_irc/node_modules/queue-fifo/package.json                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
exports.name = "queue-fifo";
exports.version = "0.2.4";
exports.main = "index.js";

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/rocketchat_irc/node_modules/queue-fifo/index.js                                              //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/**
 * @fileOverview Implementation of a queue (FIFO) data structure
 * @author Jason S. Jones
 * @license MIT
 */

(function() {
    'use strict';

    /***********************************************************
     * Queue Data Structure
     *
     * This is a 'queue' data structure that implements the notion
     * of a 'First in First Out', or FIFO, protocol.  The underlying data
     * structure is a doubly linked list.  This linked list data structure
     * does all the heavy lifting, enabling this implementation to be a
     * simple wrapper around the linked list to leverage the applicable
     * methods and properties.  This provides a very clean and simple
     * implementation for this queue data structure.
     *
     ***********************************************************/

    // bring in the one dependency which will be the underlying
    // data structure for this queue implementation
    var LinkedList = require('dbly-linked-list');

    /**
     * Creates a new queue instance and initializes the underlying data
     * structure
     *
     * @constructor
     */
    function Queue() {
        this._list = new LinkedList();
    }

    /* Functions attached to the Queue prototype.  All queue instances
     * will share these methods, meaning there will NOT be copies made for each
     * instance.  This will be a huge memory savings since there may be several
     * different queue instances.
     */
    Queue.prototype = {

        /**
         * Determines if the queue is empty
         *
         * @returns {boolean} true if the queue is empty, false otherwise
         */
        isEmpty: function() {
            return this._list.isEmpty();
        },

        /**
         * Returns the size, or number of items in the queue
         *
         * @returns {number} the number of items in the queue
         */
        size: function() {
            return this._list.getSize();
        },

        /**
         * Clears the queue of all data
         */
        clear: function () {
            return this._list.clear();
        },

        /**
         * Adds a new item containing 'data' to the back of the queue
         *
         * @param {object} data the data to add to the back of the queue
         */
        enqueue: function (data) {
            return this._list.insert(data);
        },

        /**
         * Removes the item from the front of the queue
         *
         * @returns {object} the item, or data, from the front of the queue
         */
        dequeue: function () {
            return this._list.removeFirst().getData();
        },

        /**
         * Returns the data of the item at the front of the queue,
         * but does not remove it
         *
         * @returns {object} the item, or data, from the top of the stack
         */
        peek: function () {
            return this._list.getHeadNode().getData();
        }
    };

    // export the constructor fn to make it available for use outside
    // this file
    module.exports = Queue;
}());

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:irc/server/irc.js");
require("/node_modules/meteor/rocketchat:irc/server/methods/resetIrcConnection.js");
require("/node_modules/meteor/rocketchat:irc/server/irc-settings.js");

/* Exports */
Package._define("rocketchat:irc");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_irc.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL2lyYy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL21ldGhvZHMvcmVzZXRJcmNDb25uZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvaXJjLXNldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvaXJjLWJyaWRnZS9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL2lyYy1icmlkZ2UvbG9jYWxIYW5kbGVycy9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL2lyYy1icmlkZ2UvbG9jYWxIYW5kbGVycy9vbkNyZWF0ZVJvb20uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aXJjL3NlcnZlci9pcmMtYnJpZGdlL2xvY2FsSGFuZGxlcnMvb25DcmVhdGVVc2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvaXJjLWJyaWRnZS9sb2NhbEhhbmRsZXJzL29uSm9pblJvb20uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aXJjL3NlcnZlci9pcmMtYnJpZGdlL2xvY2FsSGFuZGxlcnMvb25MZWF2ZVJvb20uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aXJjL3NlcnZlci9pcmMtYnJpZGdlL2xvY2FsSGFuZGxlcnMvb25Mb2dpbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL2lyYy1icmlkZ2UvbG9jYWxIYW5kbGVycy9vbkxvZ291dC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL2lyYy1icmlkZ2UvbG9jYWxIYW5kbGVycy9vblNhdmVNZXNzYWdlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvaXJjLWJyaWRnZS9wZWVySGFuZGxlcnMvZGlzY29ubmVjdGVkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvaXJjLWJyaWRnZS9wZWVySGFuZGxlcnMvaW5kZXguanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aXJjL3NlcnZlci9pcmMtYnJpZGdlL3BlZXJIYW5kbGVycy9qb2luZWRDaGFubmVsLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvaXJjLWJyaWRnZS9wZWVySGFuZGxlcnMvbGVmdENoYW5uZWwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aXJjL3NlcnZlci9pcmMtYnJpZGdlL3BlZXJIYW5kbGVycy9uaWNrQ2hhbmdlZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL2lyYy1icmlkZ2UvcGVlckhhbmRsZXJzL3NlbnRNZXNzYWdlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvaXJjLWJyaWRnZS9wZWVySGFuZGxlcnMvdXNlclJlZ2lzdGVyZWQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6aXJjL3NlcnZlci9zZXJ2ZXJzL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvc2VydmVycy9SRkMyODEzL2NvZGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvc2VydmVycy9SRkMyODEzL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvc2VydmVycy9SRkMyODEzL2xvY2FsQ29tbWFuZEhhbmRsZXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmlyYy9zZXJ2ZXIvc2VydmVycy9SRkMyODEzL3BhcnNlTWVzc2FnZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDppcmMvc2VydmVyL3NlcnZlcnMvUkZDMjgxMy9wZWVyQ29tbWFuZEhhbmRsZXJzLmpzIl0sIm5hbWVzIjpbIkJyaWRnZSIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiUm9ja2V0Q2hhdCIsInNldHRpbmdzIiwiZ2V0IiwiY29uZmlnIiwic2VydmVyIiwicHJvdG9jb2wiLCJob3N0IiwicG9ydCIsIm5hbWUiLCJkZXNjcmlwdGlvbiIsInBhc3N3b3JkcyIsImxvY2FsIiwicGVlciIsIk1ldGVvciIsImlyY0JyaWRnZSIsInN0YXJ0dXAiLCJpbml0IiwibWV0aG9kcyIsInJlc2V0SXJjQ29ubmVjdGlvbiIsImlyY0VuYWJsZWQiLCJzdG9wIiwibWVzc2FnZSIsInBhcmFtcyIsIkVycm9yIiwidCIsImFkZEdyb3VwIiwiYWRkIiwidHlwZSIsImkxOG5MYWJlbCIsImkxOG5EZXNjcmlwdGlvbiIsImFsZXJ0IiwidmFsdWVzIiwia2V5IiwiYWN0aW9uVGV4dCIsIlF1ZXVlIiwic2VydmVycyIsInBlZXJDb21tYW5kSGFuZGxlcnMiLCJsb2NhbENvbW1hbmRIYW5kbGVycyIsImNvbnN0cnVjdG9yIiwibG9nZ2VkSW5Vc2VycyIsIlNlcnZlciIsInNldHVwUGVlckhhbmRsZXJzIiwic2V0dXBMb2NhbEhhbmRsZXJzIiwicXVldWUiLCJxdWV1ZVRpbWVvdXQiLCJyZWdpc3RlciIsIm9uIiwibG9nUXVldWUiLCJydW5RdWV1ZSIsImRpc2Nvbm5lY3QiLCJsb2ciLCJjb25zb2xlIiwib25NZXNzYWdlUmVjZWl2ZWQiLCJmcm9tIiwiY29tbWFuZCIsInBhcmFtZXRlcnMiLCJlbnF1ZXVlIiwiaXNFbXB0eSIsInNldFRpbWVvdXQiLCJiaW5kIiwiaXRlbSIsImRlcXVldWUiLCJhcHBseSIsImNtZCIsImlkZW50aWZpZXIiLCJhcmdzIiwiY2FsbGJhY2tzIiwicHJpb3JpdHkiLCJMT1ciLCJzZW5kQ29tbWFuZCIsImVtaXQiLCJleHBvcnREZWZhdWx0IiwiZXhwb3J0Iiwib25DcmVhdGVSb29tIiwib25Kb2luUm9vbSIsIm9uTGVhdmVSb29tIiwib25Mb2dpbiIsIm9uTG9nb3V0Iiwib25TYXZlTWVzc2FnZSIsIm9uQ3JlYXRlVXNlciIsImhhbmRsZU9uQ3JlYXRlUm9vbSIsInVzZXIiLCJyb29tIiwidXNlcnMiLCJtb2RlbHMiLCJVc2VycyIsImZpbmRCeVJvb21JZCIsIl9pZCIsImZvckVhY2giLCJwcm9maWxlIiwiaXJjIiwiZnJvbUlSQyIsImhhbmRsZU9uQ3JlYXRlVXNlciIsIm5ld1VzZXIiLCJ1c2VybmFtZSIsImluZGV4T2YiLCJwdXNoIiwidXBkYXRlIiwiJHNldCIsImZpbmRPbmUiLCJyb29tcyIsIlJvb21zIiwiZmluZEJ5U3Vic2NyaXB0aW9uVXNlcklkIiwiZmV0Y2giLCJoYW5kbGVPbkpvaW5Sb29tIiwiaGFuZGxlT25MZWF2ZVJvb20iLCJoYW5kbGVPbkxvZ2luIiwibG9naW4iLCJoYW5kbGVPbkxvZ291dCIsIl8iLCJ3aXRob3V0IiwiaGFuZGxlT25TYXZlTWVzc2FnZSIsInRvIiwidG9JZGVudGlmaWNhdGlvbiIsInN1YnNjcmlwdGlvbnMiLCJTdWJzY3JpcHRpb25zIiwic3Vic2NyaXB0aW9uIiwidSIsInVzZXJEYXRhIiwibmljayIsImVycm9yIiwibXNnIiwiaGFuZGxlUVVJVCIsInN0YXR1cyIsInJlbW92ZVVzZXJuYW1lRnJvbUFsbCIsImRpc2Nvbm5lY3RlZCIsImpvaW5lZENoYW5uZWwiLCJsZWZ0Q2hhbm5lbCIsIm5pY2tDaGFuZ2VkIiwic2VudE1lc3NhZ2UiLCJ1c2VyUmVnaXN0ZXJlZCIsImhhbmRsZUpvaW5lZENoYW5uZWwiLCJmaW5kT25lQnlOYW1lIiwicm9vbU5hbWUiLCJjcmVhdGVkUm9vbSIsImNyZWF0ZVJvb20iLCJyaWQiLCJhZGRVc2VyVG9Sb29tIiwiaGFuZGxlTGVmdENoYW5uZWwiLCJyZW1vdmVVc2VyRnJvbVJvb20iLCJoYW5kbGVOaWNrQ2hhbmdlZCIsIm5ld05pY2siLCJoYW5kbGVTZW50TWVzc2FnZSIsImdldERpcmVjdFJvb20iLCJzb3VyY2UiLCJ0YXJnZXQiLCJzb3J0Iiwiam9pbiIsInVwc2VydCIsIiRzZXRPbkluc2VydCIsIm1zZ3MiLCJ0cyIsIkRhdGUiLCJvcGVuIiwidW5yZWFkIiwicmVjaXBpZW50VXNlciIsInJlY2lwaWVudE5pY2siLCJzZW5kTWVzc2FnZSIsImhhbmRsZVVzZXJSZWdpc3RlcmVkIiwidXNlclRvSW5zZXJ0IiwidXRjT2Zmc2V0IiwiYWN0aXZlIiwiaG9zdG5hbWUiLCJjcmVhdGUiLCJSRkMyODEzIiwiZXhwb3J0cyIsIm5ldCIsInV0aWwiLCJFdmVudEVtaXR0ZXIiLCJwYXJzZU1lc3NhZ2UiLCJyZWdpc3RlclN0ZXBzIiwiaXNSZWdpc3RlcmVkIiwic2VydmVyUHJlZml4IiwicmVjZWl2ZUJ1ZmZlciIsIkJ1ZmZlciIsInNldHVwU29ja2V0Iiwic29ja2V0IiwiU29ja2V0Iiwic2V0Tm9EZWxheSIsInNldEVuY29kaW5nIiwic2V0S2VlcEFsaXZlIiwib25SZWNlaXZlRnJvbVBlZXIiLCJvbkNvbm5lY3QiLCJlcnIiLCJvblJlY2VpdmVGcm9tTG9jYWwiLCJjb25uZWN0IiwiZGVzdHJveSIsInVuZGVmaW5lZCIsIndyaXRlIiwidHJhaWxlciIsImJ1ZmZlciIsInByZWZpeCIsImxlbmd0aCIsImNodW5rIiwiY29uY2F0IiwibGluZXMiLCJ0b1N0cmluZyIsInNwbGl0IiwicG9wIiwibGluZSIsInN0YXJ0c1dpdGgiLCJwYXJzZWRNZXNzYWdlIiwiY2FsbCIsIkpTT04iLCJzdHJpbmdpZnkiLCJpbmhlcml0cyIsInJlZ2lzdGVyVXNlciIsImpvaW5DaGFubmVsIiwicmVwbHlGb3IiLCJtYXRjaCIsInJlcGxhY2UiLCJyYXdDb21tYW5kIiwiY29tbWFuZFR5cGUiLCJtaWRkbGUiLCJ0cmFpbGluZyIsInNlYXJjaCIsInRyaW1SaWdodCIsIlBBU1MiLCJTRVJWRVIiLCJQSU5HIiwiTklDSyIsIkpPSU4iLCJzdWJzdHJpbmciLCJQQVJUIiwiUFJJVk1TRyIsIlFVSVQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsTUFBSjtBQUFXQyxPQUFPQyxLQUFQLENBQWFDLFFBQVEsY0FBUixDQUFiLEVBQXFDO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDTCxhQUFPSyxDQUFQO0FBQVM7O0FBQXJCLENBQXJDLEVBQTRELENBQTVEOztBQUVYLElBQUksQ0FBQyxDQUFDQyxXQUFXQyxRQUFYLENBQW9CQyxHQUFwQixDQUF3QixhQUF4QixDQUFGLEtBQTZDLElBQWpELEVBQXVEO0FBQ3REO0FBQ0EsUUFBTUMsU0FBUztBQUNkQyxZQUFRO0FBQ1BDLGdCQUFVTCxXQUFXQyxRQUFYLENBQW9CQyxHQUFwQixDQUF3QixjQUF4QixDQURIO0FBRVBJLFlBQU1OLFdBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLFVBQXhCLENBRkM7QUFHUEssWUFBTVAsV0FBV0MsUUFBWCxDQUFvQkMsR0FBcEIsQ0FBd0IsVUFBeEIsQ0FIQztBQUlQTSxZQUFNUixXQUFXQyxRQUFYLENBQW9CQyxHQUFwQixDQUF3QixVQUF4QixDQUpDO0FBS1BPLG1CQUFhVCxXQUFXQyxRQUFYLENBQW9CQyxHQUFwQixDQUF3QixpQkFBeEI7QUFMTixLQURNO0FBUWRRLGVBQVc7QUFDVkMsYUFBT1gsV0FBV0MsUUFBWCxDQUFvQkMsR0FBcEIsQ0FBd0Isb0JBQXhCLENBREc7QUFFVlUsWUFBTVosV0FBV0MsUUFBWCxDQUFvQkMsR0FBcEIsQ0FBd0Is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REc7QUFFZkMsVUFBTTtBQUNMc0QsWUFBTWtGLGNBQWNWO0FBRGY7QUFGUyxHQUFoQjtBQU9BLFNBQU96SSxPQUFQO0FBQ0E7O0FBN0dEM0QsT0FBTzRFLGFBQVAsQ0ErR2U7QUFBRWtKLE1BQUY7QUFBUUMsUUFBUjtBQUFnQkMsTUFBaEI7QUFBc0JDLE1BQXRCO0FBQTRCQyxNQUE1QjtBQUFrQ0UsTUFBbEM7QUFBd0NDLFNBQXhDO0FBQWlEQztBQUFqRCxDQS9HZixFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2lyYy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBCcmlkZ2UgZnJvbSAnLi9pcmMtYnJpZGdlJztcblxuaWYgKCEhUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0lSQ19FbmFibGVkJykgPT09IHRydWUpIHtcblx0Ly8gTm9ybWFsaXplIHRoZSBjb25maWcgdmFsdWVzXG5cdGNvbnN0IGNvbmZpZyA9IHtcblx0XHRzZXJ2ZXI6IHtcblx0XHRcdHByb3RvY29sOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSVJDX1Byb3RvY29sJyksXG5cdFx0XHRob3N0OiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSVJDX0hvc3QnKSxcblx0XHRcdHBvcnQ6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdJUkNfUG9ydCcpLFxuXHRcdFx0bmFtZTogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0lSQ19OYW1lJyksXG5cdFx0XHRkZXNjcmlwdGlvbjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0lSQ19EZXNjcmlwdGlvbicpLFxuXHRcdH0sXG5cdFx0cGFzc3dvcmRzOiB7XG5cdFx0XHRsb2NhbDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0lSQ19Mb2NhbF9QYXNzd29yZCcpLFxuXHRcdFx0cGVlcjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0lSQ19QZWVyX1Bhc3N3b3JkJyksXG5cdFx0fSxcblx0fTtcblxuXHRNZXRlb3IuaXJjQnJpZGdlID0gbmV3IEJyaWRnZShjb25maWcpO1xuXG5cdE1ldGVvci5zdGFydHVwKCgpID0+IHtcblx0XHRNZXRlb3IuaXJjQnJpZGdlLmluaXQoKTtcblx0fSk7XG59XG4iLCJpbXBvcnQgQnJpZGdlIGZyb20gJy4uL2lyYy1icmlkZ2UnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdHJlc2V0SXJjQ29ubmVjdGlvbigpIHtcblx0XHRjb25zdCBpcmNFbmFibGVkID0gKCEhUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0lSQ19FbmFibGVkJykpID09PSB0cnVlO1xuXG5cdFx0aWYgKE1ldGVvci5pcmNCcmlkZ2UpIHtcblx0XHRcdE1ldGVvci5pcmNCcmlkZ2Uuc3RvcCgpO1xuXHRcdFx0aWYgKCFpcmNFbmFibGVkKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0bWVzc2FnZTogJ0Nvbm5lY3Rpb25fQ2xvc2VkJyxcblx0XHRcdFx0XHRwYXJhbXM6IFtdLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChpcmNFbmFibGVkKSB7XG5cdFx0XHRpZiAoTWV0ZW9yLmlyY0JyaWRnZSkge1xuXHRcdFx0XHRNZXRlb3IuaXJjQnJpZGdlLmluaXQoKTtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRtZXNzYWdlOiAnQ29ubmVjdGlvbl9SZXNldCcsXG5cdFx0XHRcdFx0cGFyYW1zOiBbXSxcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gTm9ybWFsaXplIHRoZSBjb25maWcgdmFsdWVzXG5cdFx0XHRjb25zdCBjb25maWcgPSB7XG5cdFx0XHRcdHNlcnZlcjoge1xuXHRcdFx0XHRcdHByb3RvY29sOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSVJDX1Byb3RvY29sJyksXG5cdFx0XHRcdFx0aG9zdDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0lSQ19Ib3N0JyksXG5cdFx0XHRcdFx0cG9ydDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0lSQ19Qb3J0JyksXG5cdFx0XHRcdFx0bmFtZTogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0lSQ19OYW1lJyksXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdJUkNfRGVzY3JpcHRpb24nKSxcblx0XHRcdFx0fSxcblx0XHRcdFx0cGFzc3dvcmRzOiB7XG5cdFx0XHRcdFx0bG9jYWw6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdJUkNfTG9jYWxfUGFzc3dvcmQnKSxcblx0XHRcdFx0XHRwZWVyOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnSVJDX1BlZXJfUGFzc3dvcmQnKSxcblx0XHRcdFx0fSxcblx0XHRcdH07XG5cblx0XHRcdE1ldGVvci5pcmNCcmlkZ2UgPSBuZXcgQnJpZGdlKGNvbmZpZyk7XG5cdFx0XHRNZXRlb3IuaXJjQnJpZGdlLmluaXQoKTtcblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0bWVzc2FnZTogJ0Nvbm5lY3Rpb25fUmVzZXQnLFxuXHRcdFx0XHRwYXJhbXM6IFtdLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKHQoJ0lSQ19GZWRlcmF0aW9uX0Rpc2FibGVkJykpO1xuXHR9LFxufSk7XG4iLCJNZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGRHcm91cCgnSVJDX0ZlZGVyYXRpb24nLCBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmFkZCgnSVJDX0VuYWJsZWQnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0aTE4bkxhYmVsOiAnRW5hYmxlZCcsXG5cdFx0XHRpMThuRGVzY3JpcHRpb246ICdJUkNfRW5hYmxlZCcsXG5cdFx0XHRhbGVydDogJ0lSQ19FbmFibGVkX0FsZXJ0Jyxcblx0XHR9KTtcblxuXHRcdHRoaXMuYWRkKCdJUkNfUHJvdG9jb2wnLCAnUkZDMjgxMycsIHtcblx0XHRcdHR5cGU6ICdzZWxlY3QnLFxuXHRcdFx0aTE4bkxhYmVsOiAnUHJvdG9jb2wnLFxuXHRcdFx0aTE4bkRlc2NyaXB0aW9uOiAnSVJDX1Byb3RvY29sJyxcblx0XHRcdHZhbHVlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0a2V5OiAnUkZDMjgxMycsXG5cdFx0XHRcdFx0aTE4bkxhYmVsOiAnUkZDMjgxMycsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hZGQoJ0lSQ19Ib3N0JywgJ2xvY2FsaG9zdCcsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0aTE4bkxhYmVsOiAnSG9zdCcsXG5cdFx0XHRpMThuRGVzY3JpcHRpb246ICdJUkNfSG9zdCcsXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZCgnSVJDX1BvcnQnLCA2NjY3LCB7XG5cdFx0XHR0eXBlOiAnaW50Jyxcblx0XHRcdGkxOG5MYWJlbDogJ1BvcnQnLFxuXHRcdFx0aTE4bkRlc2NyaXB0aW9uOiAnSVJDX1BvcnQnLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hZGQoJ0lSQ19OYW1lJywgJ2lyYy5yb2NrZXQuY2hhdCcsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0aTE4bkxhYmVsOiAnTmFtZScsXG5cdFx0XHRpMThuRGVzY3JpcHRpb246ICdJUkNfTmFtZScsXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZCgnSVJDX0Rlc2NyaXB0aW9uJywgJ1JvY2tldC5DaGF0IElSQyBCcmlkZ2UnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGkxOG5MYWJlbDogJ0Rlc2NyaXB0aW9uJyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0lSQ19EZXNjcmlwdGlvbicsXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZCgnSVJDX0xvY2FsX1Bhc3N3b3JkJywgJ3Bhc3N3b3JkJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRpMThuTGFiZWw6ICdMb2NhbF9QYXNzd29yZCcsXG5cdFx0XHRpMThuRGVzY3JpcHRpb246ICdJUkNfTG9jYWxfUGFzc3dvcmQnLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hZGQoJ0lSQ19QZWVyX1Bhc3N3b3JkJywgJ3Bhc3N3b3JkJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRpMThuTGFiZWw6ICdQZWVyX1Bhc3N3b3JkJyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0lSQ19QZWVyX1Bhc3N3b3JkJyxcblx0XHR9KTtcblxuXHRcdHRoaXMuYWRkKCdJUkNfUmVzZXRfQ29ubmVjdGlvbicsICdyZXNldElyY0Nvbm5lY3Rpb24nLCB7XG5cdFx0XHR0eXBlOiAnYWN0aW9uJyxcblx0XHRcdGFjdGlvblRleHQ6ICdSZXNldF9Db25uZWN0aW9uJyxcblx0XHRcdGkxOG5MYWJlbDogJ1Jlc2V0X0Nvbm5lY3Rpb24nLFxuXHRcdH0pO1xuXHR9KTtcbn0pO1xuIiwiaW1wb3J0IFF1ZXVlIGZyb20gJ3F1ZXVlLWZpZm8nO1xuaW1wb3J0ICogYXMgc2VydmVycyBmcm9tICcuLi9zZXJ2ZXJzJztcbmltcG9ydCAqIGFzIHBlZXJDb21tYW5kSGFuZGxlcnMgZnJvbSAnLi9wZWVySGFuZGxlcnMnO1xuaW1wb3J0ICogYXMgbG9jYWxDb21tYW5kSGFuZGxlcnMgZnJvbSAnLi9sb2NhbEhhbmRsZXJzJztcblxuY2xhc3MgQnJpZGdlIHtcblx0Y29uc3RydWN0b3IoY29uZmlnKSB7XG5cdFx0Ly8gR2VuZXJhbFxuXHRcdHRoaXMuY29uZmlnID0gY29uZmlnO1xuXG5cdFx0Ly8gV29ya2Fyb3VuZCBmb3IgUm9ja2V0LkNoYXQgY2FsbGJhY2tzIGJlaW5nIGNhbGxlZCBtdWx0aXBsZSB0aW1lc1xuXHRcdHRoaXMubG9nZ2VkSW5Vc2VycyA9IFtdO1xuXG5cdFx0Ly8gU2VydmVyXG5cdFx0Y29uc3QgU2VydmVyID0gc2VydmVyc1t0aGlzLmNvbmZpZy5zZXJ2ZXIucHJvdG9jb2xdO1xuXG5cdFx0dGhpcy5zZXJ2ZXIgPSBuZXcgU2VydmVyKHRoaXMuY29uZmlnKTtcblxuXHRcdHRoaXMuc2V0dXBQZWVySGFuZGxlcnMoKTtcblx0XHR0aGlzLnNldHVwTG9jYWxIYW5kbGVycygpO1xuXG5cdFx0Ly8gQ29tbWFuZCBxdWV1ZVxuXHRcdHRoaXMucXVldWUgPSBuZXcgUXVldWUoKTtcblx0XHR0aGlzLnF1ZXVlVGltZW91dCA9IDU7XG5cdH1cblxuXHRpbml0KCkge1xuXHRcdHRoaXMubG9nZ2VkSW5Vc2VycyA9IFtdO1xuXHRcdHRoaXMuc2VydmVyLnJlZ2lzdGVyKCk7XG5cblx0XHR0aGlzLnNlcnZlci5vbigncmVnaXN0ZXJlZCcsICgpID0+IHtcblx0XHRcdHRoaXMubG9nUXVldWUoJ1N0YXJ0aW5nLi4uJyk7XG5cblx0XHRcdHRoaXMucnVuUXVldWUoKTtcblx0XHR9KTtcblx0fVxuXG5cdHN0b3AoKSB7XG5cdFx0dGhpcy5zZXJ2ZXIuZGlzY29ubmVjdCgpO1xuXHR9XG5cblx0LyoqXG5cdCAqIExvZyBoZWxwZXJcblx0ICovXG5cdGxvZyhtZXNzYWdlKSB7XG5cdFx0Y29uc29sZS5sb2coYFtpcmNdW2JyaWRnZV0gJHsgbWVzc2FnZSB9YCk7XG5cdH1cblxuXHRsb2dRdWV1ZShtZXNzYWdlKSB7XG5cdFx0Y29uc29sZS5sb2coYFtpcmNdW2JyaWRnZV1bcXVldWVdICR7IG1lc3NhZ2UgfWApO1xuXHR9XG5cblx0LyoqXG5cdCAqXG5cdCAqXG5cdCAqIFF1ZXVlXG5cdCAqXG5cdCAqXG5cdCAqL1xuXHRvbk1lc3NhZ2VSZWNlaXZlZChmcm9tLCBjb21tYW5kLCAuLi5wYXJhbWV0ZXJzKSB7XG5cdFx0dGhpcy5xdWV1ZS5lbnF1ZXVlKHsgZnJvbSwgY29tbWFuZCwgcGFyYW1ldGVycyB9KTtcblx0fVxuXG5cdGFzeW5jIHJ1blF1ZXVlKCkge1xuXHRcdC8vIElmIGl0IGlzIGVtcHR5LCBza2lwIGFuZCBrZWVwIHRoZSBxdWV1ZSBnb2luZ1xuXHRcdGlmICh0aGlzLnF1ZXVlLmlzRW1wdHkoKSkge1xuXHRcdFx0cmV0dXJuIHNldFRpbWVvdXQodGhpcy5ydW5RdWV1ZS5iaW5kKHRoaXMpLCB0aGlzLnF1ZXVlVGltZW91dCk7XG5cdFx0fVxuXG5cdFx0Ly8gR2V0IHRoZSBjb21tYW5kXG5cdFx0Y29uc3QgaXRlbSA9IHRoaXMucXVldWUuZGVxdWV1ZSgpO1xuXG5cdFx0dGhpcy5sb2dRdWV1ZShgUHJvY2Vzc2luZyBcIiR7IGl0ZW0uY29tbWFuZCB9XCIgY29tbWFuZCBmcm9tIFwiJHsgaXRlbS5mcm9tIH1cImApO1xuXG5cdFx0Ly8gSGFuZGxlIHRoZSBjb21tYW5kIGFjY29yZGluZ2x5XG5cdFx0c3dpdGNoIChpdGVtLmZyb20pIHtcblx0XHRcdGNhc2UgJ2xvY2FsJzpcblx0XHRcdFx0aWYgKCFsb2NhbENvbW1hbmRIYW5kbGVyc1tpdGVtLmNvbW1hbmRdKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBoYW5kbGVyIGZvciBsb2NhbDokeyBpdGVtLmNvbW1hbmQgfWApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YXdhaXQgbG9jYWxDb21tYW5kSGFuZGxlcnNbaXRlbS5jb21tYW5kXS5hcHBseSh0aGlzLCBpdGVtLnBhcmFtZXRlcnMpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3BlZXInOlxuXHRcdFx0XHRpZiAoIXBlZXJDb21tYW5kSGFuZGxlcnNbaXRlbS5jb21tYW5kXSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgaGFuZGxlciBmb3IgcGVlcjokeyBpdGVtLmNvbW1hbmQgfWApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YXdhaXQgcGVlckNvbW1hbmRIYW5kbGVyc1tpdGVtLmNvbW1hbmRdLmFwcGx5KHRoaXMsIGl0ZW0ucGFyYW1ldGVycyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdC8vIEtlZXAgdGhlIHF1ZXVlIGdvaW5nXG5cdFx0c2V0VGltZW91dCh0aGlzLnJ1blF1ZXVlLmJpbmQodGhpcyksIHRoaXMucXVldWVUaW1lb3V0KTtcblx0fVxuXG5cdC8qKlxuXHQgKlxuXHQgKlxuXHQgKiBQZWVyXG5cdCAqXG5cdCAqXG5cdCAqL1xuXHRzZXR1cFBlZXJIYW5kbGVycygpIHtcblx0XHR0aGlzLnNlcnZlci5vbigncGVlckNvbW1hbmQnLCAoY21kKSA9PiB7XG5cdFx0XHR0aGlzLm9uTWVzc2FnZVJlY2VpdmVkKCdwZWVyJywgY21kLmlkZW50aWZpZXIsIGNtZC5hcmdzKTtcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKlxuXHQgKlxuXHQgKiBMb2NhbFxuXHQgKlxuXHQgKlxuXHQgKi9cblx0c2V0dXBMb2NhbEhhbmRsZXJzKCkge1xuXHRcdC8vIEF1dGhcblx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyVmFsaWRhdGVMb2dpbicsIHRoaXMub25NZXNzYWdlUmVjZWl2ZWQuYmluZCh0aGlzLCAnbG9jYWwnLCAnb25Mb2dpbicpLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdpcmMtb24tbG9naW4nKTtcblx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyQ3JlYXRlVXNlcicsIHRoaXMub25NZXNzYWdlUmVjZWl2ZWQuYmluZCh0aGlzLCAnbG9jYWwnLCAnb25DcmVhdGVVc2VyJyksIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVywgJ2lyYy1vbi1jcmVhdGUtdXNlcicpO1xuXHRcdC8vIEpvaW5pbmcgcm9vbXMgb3IgY2hhbm5lbHNcblx0XHRSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyQ3JlYXRlQ2hhbm5lbCcsIHRoaXMub25NZXNzYWdlUmVjZWl2ZWQuYmluZCh0aGlzLCAnbG9jYWwnLCAnb25DcmVhdGVSb29tJyksIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVywgJ2lyYy1vbi1jcmVhdGUtY2hhbm5lbCcpO1xuXHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJDcmVhdGVSb29tJywgdGhpcy5vbk1lc3NhZ2VSZWNlaXZlZC5iaW5kKHRoaXMsICdsb2NhbCcsICdvbkNyZWF0ZVJvb20nKSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnaXJjLW9uLWNyZWF0ZS1yb29tJyk7XG5cdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdhZnRlckpvaW5Sb29tJywgdGhpcy5vbk1lc3NhZ2VSZWNlaXZlZC5iaW5kKHRoaXMsICdsb2NhbCcsICdvbkpvaW5Sb29tJyksIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVywgJ2lyYy1vbi1qb2luLXJvb20nKTtcblx0XHQvLyBMZWF2aW5nIHJvb21zIG9yIGNoYW5uZWxzXG5cdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdhZnRlckxlYXZlUm9vbScsIHRoaXMub25NZXNzYWdlUmVjZWl2ZWQuYmluZCh0aGlzLCAnbG9jYWwnLCAnb25MZWF2ZVJvb20nKSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTE9XLCAnaXJjLW9uLWxlYXZlLXJvb20nKTtcblx0XHQvLyBDaGF0dGluZ1xuXHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJTYXZlTWVzc2FnZScsIHRoaXMub25NZXNzYWdlUmVjZWl2ZWQuYmluZCh0aGlzLCAnbG9jYWwnLCAnb25TYXZlTWVzc2FnZScpLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdpcmMtb24tc2F2ZS1tZXNzYWdlJyk7XG5cdFx0Ly8gTGVhdmluZ1xuXHRcdFJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJMb2dvdXRDbGVhblVwJywgdGhpcy5vbk1lc3NhZ2VSZWNlaXZlZC5iaW5kKHRoaXMsICdsb2NhbCcsICdvbkxvZ291dCcpLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdpcmMtb24tbG9nb3V0Jyk7XG5cdH1cblxuXHRzZW5kQ29tbWFuZChjb21tYW5kLCBwYXJhbWV0ZXJzKSB7XG5cdFx0dGhpcy5zZXJ2ZXIuZW1pdCgnb25SZWNlaXZlRnJvbUxvY2FsJywgY29tbWFuZCwgcGFyYW1ldGVycyk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQnJpZGdlO1xuIiwiaW1wb3J0IG9uQ3JlYXRlUm9vbSBmcm9tICcuL29uQ3JlYXRlUm9vbSc7XG5pbXBvcnQgb25Kb2luUm9vbSBmcm9tICcuL29uSm9pblJvb20nO1xuaW1wb3J0IG9uTGVhdmVSb29tIGZyb20gJy4vb25MZWF2ZVJvb20nO1xuaW1wb3J0IG9uTG9naW4gZnJvbSAnLi9vbkxvZ2luJztcbmltcG9ydCBvbkxvZ291dCBmcm9tICcuL29uTG9nb3V0JztcbmltcG9ydCBvblNhdmVNZXNzYWdlIGZyb20gJy4vb25TYXZlTWVzc2FnZSc7XG5pbXBvcnQgb25DcmVhdGVVc2VyIGZyb20gJy4vb25DcmVhdGVVc2VyJztcblxuZXhwb3J0IHsgb25DcmVhdGVSb29tLCBvbkpvaW5Sb29tLCBvbkxlYXZlUm9vbSwgb25Mb2dpbiwgb25Mb2dvdXQsIG9uU2F2ZU1lc3NhZ2UsIG9uQ3JlYXRlVXNlciB9O1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaGFuZGxlT25DcmVhdGVSb29tKHVzZXIsIHJvb20pIHtcblx0Y29uc3QgdXNlcnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kQnlSb29tSWQocm9vbS5faWQpO1xuXG5cdHVzZXJzLmZvckVhY2goKHVzZXIpID0+IHtcblx0XHRpZiAodXNlci5wcm9maWxlLmlyYy5mcm9tSVJDKSB7XG5cdFx0XHR0aGlzLnNlbmRDb21tYW5kKCdqb2luQ2hhbm5lbCcsIHsgcm9vbSwgdXNlciB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5zZW5kQ29tbWFuZCgnam9pbmVkQ2hhbm5lbCcsIHsgcm9vbSwgdXNlciB9KTtcblx0XHR9XG5cdH0pO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaGFuZGxlT25DcmVhdGVVc2VyKG5ld1VzZXIpIHtcblx0aWYgKCFuZXdVc2VyKSB7XG5cdFx0cmV0dXJuIHRoaXMubG9nKCdJbnZhbGlkIGhhbmRsZU9uQ3JlYXRlVXNlciBjYWxsJyk7XG5cdH1cblx0aWYgKCFuZXdVc2VyLnVzZXJuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMubG9nKCdJbnZhbGlkIGhhbmRsZU9uQ3JlYXRlVXNlciBjYWxsIChNaXNzaW5nIHVzZXJuYW1lKScpO1xuXHR9XG5cdGlmICh0aGlzLmxvZ2dlZEluVXNlcnMuaW5kZXhPZihuZXdVc2VyLl9pZCkgIT09IC0xKSB7XG5cdFx0cmV0dXJuIHRoaXMubG9nKCdEdXBsaWNhdGUgaGFuZGxlT25DcmVhdGVVc2VyIGNhbGwnKTtcblx0fVxuXG5cdHRoaXMubG9nZ2VkSW5Vc2Vycy5wdXNoKG5ld1VzZXIuX2lkKTtcblxuXHRNZXRlb3IudXNlcnMudXBkYXRlKHsgX2lkOiBuZXdVc2VyLl9pZCB9LCB7XG5cdFx0JHNldDoge1xuXHRcdFx0J3Byb2ZpbGUuaXJjLmZyb21JUkMnOiBmYWxzZSxcblx0XHRcdCdwcm9maWxlLmlyYy51c2VybmFtZSc6IGAkeyBuZXdVc2VyLnVzZXJuYW1lIH0tcmt0YCxcblx0XHRcdCdwcm9maWxlLmlyYy5uaWNrJzogYCR7IG5ld1VzZXIudXNlcm5hbWUgfS1ya3RgLFxuXHRcdFx0J3Byb2ZpbGUuaXJjLmhvc3RuYW1lJzogJ3JvY2tldC5jaGF0Jyxcblx0XHR9LFxuXHR9KTtcblxuXHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZSh7XG5cdFx0X2lkOiBuZXdVc2VyLl9pZCxcblx0fSk7XG5cblx0dGhpcy5zZW5kQ29tbWFuZCgncmVnaXN0ZXJVc2VyJywgdXNlcik7XG5cblx0Y29uc3Qgcm9vbXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlTdWJzY3JpcHRpb25Vc2VySWQodXNlci5faWQpLmZldGNoKCk7XG5cblx0cm9vbXMuZm9yRWFjaCgocm9vbSkgPT4gdGhpcy5zZW5kQ29tbWFuZCgnam9pbmVkQ2hhbm5lbCcsIHsgcm9vbSwgdXNlciB9KSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBoYW5kbGVPbkpvaW5Sb29tKHVzZXIsIHJvb20pIHtcblx0dGhpcy5zZW5kQ29tbWFuZCgnam9pbmVkQ2hhbm5lbCcsIHsgcm9vbSwgdXNlciB9KTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGhhbmRsZU9uTGVhdmVSb29tKHVzZXIsIHJvb20pIHtcblx0dGhpcy5zZW5kQ29tbWFuZCgnbGVmdENoYW5uZWwnLCB7IHJvb20sIHVzZXIgfSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBoYW5kbGVPbkxvZ2luKGxvZ2luKSB7XG5cdGlmIChsb2dpbi51c2VyID09PSBudWxsKSB7XG5cdFx0cmV0dXJuIHRoaXMubG9nKCdJbnZhbGlkIGhhbmRsZU9uTG9naW4gY2FsbCcpO1xuXHR9XG5cdGlmICghbG9naW4udXNlci51c2VybmFtZSkge1xuXHRcdHJldHVybiB0aGlzLmxvZygnSW52YWxpZCBoYW5kbGVPbkxvZ2luIGNhbGwgKE1pc3NpbmcgdXNlcm5hbWUpJyk7XG5cdH1cblx0aWYgKHRoaXMubG9nZ2VkSW5Vc2Vycy5pbmRleE9mKGxvZ2luLnVzZXIuX2lkKSAhPT0gLTEpIHtcblx0XHRyZXR1cm4gdGhpcy5sb2coJ0R1cGxpY2F0ZSBoYW5kbGVPbkxvZ2luIGNhbGwnKTtcblx0fVxuXG5cdHRoaXMubG9nZ2VkSW5Vc2Vycy5wdXNoKGxvZ2luLnVzZXIuX2lkKTtcblxuXHRNZXRlb3IudXNlcnMudXBkYXRlKHsgX2lkOiBsb2dpbi51c2VyLl9pZCB9LCB7XG5cdFx0JHNldDoge1xuXHRcdFx0J3Byb2ZpbGUuaXJjLmZyb21JUkMnOiBmYWxzZSxcblx0XHRcdCdwcm9maWxlLmlyYy51c2VybmFtZSc6IGAkeyBsb2dpbi51c2VyLnVzZXJuYW1lIH0tcmt0YCxcblx0XHRcdCdwcm9maWxlLmlyYy5uaWNrJzogYCR7IGxvZ2luLnVzZXIudXNlcm5hbWUgfS1ya3RgLFxuXHRcdFx0J3Byb2ZpbGUuaXJjLmhvc3RuYW1lJzogJ3JvY2tldC5jaGF0Jyxcblx0XHR9LFxuXHR9KTtcblxuXHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZSh7XG5cdFx0X2lkOiBsb2dpbi51c2VyLl9pZCxcblx0fSk7XG5cblx0dGhpcy5zZW5kQ29tbWFuZCgncmVnaXN0ZXJVc2VyJywgdXNlcik7XG5cblx0Y29uc3Qgcm9vbXMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kQnlTdWJzY3JpcHRpb25Vc2VySWQodXNlci5faWQpLmZldGNoKCk7XG5cblx0cm9vbXMuZm9yRWFjaCgocm9vbSkgPT4gdGhpcy5zZW5kQ29tbWFuZCgnam9pbmVkQ2hhbm5lbCcsIHsgcm9vbSwgdXNlciB9KSk7XG59XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaGFuZGxlT25Mb2dvdXQodXNlcikge1xuXHR0aGlzLmxvZ2dlZEluVXNlcnMgPSBfLndpdGhvdXQodGhpcy5sb2dnZWRJblVzZXJzLCB1c2VyLl9pZCk7XG5cblx0dGhpcy5zZW5kQ29tbWFuZCgnZGlzY29ubmVjdGVkJywgeyB1c2VyIH0pO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaGFuZGxlT25TYXZlTWVzc2FnZShtZXNzYWdlLCB0bykge1xuXHRsZXQgdG9JZGVudGlmaWNhdGlvbiA9ICcnO1xuXHQvLyBEaXJlY3QgbWVzc2FnZVxuXHRpZiAodG8udCA9PT0gJ2QnKSB7XG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9ucyA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZEJ5Um9vbUlkKHRvLl9pZCk7XG5cdFx0c3Vic2NyaXB0aW9ucy5mb3JFYWNoKChzdWJzY3JpcHRpb24pID0+IHtcblx0XHRcdGlmIChzdWJzY3JpcHRpb24udS51c2VybmFtZSAhPT0gdG8udXNlcm5hbWUpIHtcblx0XHRcdFx0Y29uc3QgdXNlckRhdGEgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHsgdXNlcm5hbWU6IHN1YnNjcmlwdGlvbi51LnVzZXJuYW1lIH0pO1xuXHRcdFx0XHRpZiAodXNlckRhdGEpIHtcblx0XHRcdFx0XHRpZiAodXNlckRhdGEucHJvZmlsZSAmJiB1c2VyRGF0YS5wcm9maWxlLmlyYyAmJiB1c2VyRGF0YS5wcm9maWxlLmlyYy5uaWNrKSB7XG5cdFx0XHRcdFx0XHR0b0lkZW50aWZpY2F0aW9uID0gdXNlckRhdGEucHJvZmlsZS5pcmMubmljaztcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dG9JZGVudGlmaWNhdGlvbiA9IHVzZXJEYXRhLnVzZXJuYW1lO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0b0lkZW50aWZpY2F0aW9uID0gc3Vic2NyaXB0aW9uLnUudXNlcm5hbWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGlmICghdG9JZGVudGlmaWNhdGlvbikge1xuXHRcdFx0Y29uc29sZS5lcnJvcignW2lyY11bc2VydmVyXSBUYXJnZXQgdXNlciBub3QgZm91bmQnKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0dG9JZGVudGlmaWNhdGlvbiA9IGAjJHsgdG8ubmFtZSB9YDtcblx0fVxuXG5cdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHsgX2lkOiBtZXNzYWdlLnUuX2lkIH0pO1xuXG5cdHRoaXMuc2VuZENvbW1hbmQoJ3NlbnRNZXNzYWdlJywgeyB0bzogdG9JZGVudGlmaWNhdGlvbiwgdXNlciwgbWVzc2FnZTogbWVzc2FnZS5tc2cgfSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBoYW5kbGVRVUlUKGFyZ3MpIHtcblx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmUoe1xuXHRcdCdwcm9maWxlLmlyYy5uaWNrJzogYXJncy5uaWNrLFxuXHR9KTtcblxuXHRNZXRlb3IudXNlcnMudXBkYXRlKHsgX2lkOiB1c2VyLl9pZCB9LCB7XG5cdFx0JHNldDoge1xuXHRcdFx0c3RhdHVzOiAnb2ZmbGluZScsXG5cdFx0fSxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMucmVtb3ZlVXNlcm5hbWVGcm9tQWxsKHVzZXIudXNlcm5hbWUpO1xufVxuIiwiaW1wb3J0IGRpc2Nvbm5lY3RlZCBmcm9tICcuL2Rpc2Nvbm5lY3RlZCc7XG5pbXBvcnQgam9pbmVkQ2hhbm5lbCBmcm9tICcuL2pvaW5lZENoYW5uZWwnO1xuaW1wb3J0IGxlZnRDaGFubmVsIGZyb20gJy4vbGVmdENoYW5uZWwnO1xuaW1wb3J0IG5pY2tDaGFuZ2VkIGZyb20gJy4vbmlja0NoYW5nZWQnO1xuaW1wb3J0IHNlbnRNZXNzYWdlIGZyb20gJy4vc2VudE1lc3NhZ2UnO1xuaW1wb3J0IHVzZXJSZWdpc3RlcmVkIGZyb20gJy4vdXNlclJlZ2lzdGVyZWQnO1xuXG5leHBvcnQgeyBkaXNjb25uZWN0ZWQsIGpvaW5lZENoYW5uZWwsIGxlZnRDaGFubmVsLCBuaWNrQ2hhbmdlZCwgc2VudE1lc3NhZ2UsIHVzZXJSZWdpc3RlcmVkIH07XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBoYW5kbGVKb2luZWRDaGFubmVsKGFyZ3MpIHtcblx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmUoe1xuXHRcdCdwcm9maWxlLmlyYy5uaWNrJzogYXJncy5uaWNrLFxuXHR9KTtcblxuXHRpZiAoIXVzZXIpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGEgdXNlciB3aXRoIG5pY2sgJHsgYXJncy5uaWNrIH1gKTtcblx0fVxuXG5cdGxldCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5TmFtZShhcmdzLnJvb21OYW1lKTtcblxuXHRpZiAoIXJvb20pIHtcblx0XHRjb25zdCBjcmVhdGVkUm9vbSA9IFJvY2tldENoYXQuY3JlYXRlUm9vbSgnYycsIGFyZ3Mucm9vbU5hbWUsIHVzZXIudXNlcm5hbWUsIFtdKTtcblx0XHRyb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZSh7IF9pZDogY3JlYXRlZFJvb20ucmlkIH0pO1xuXG5cdFx0dGhpcy5sb2coYCR7IHVzZXIudXNlcm5hbWUgfSBjcmVhdGVkIHJvb20gJHsgYXJncy5yb29tTmFtZSB9YCk7XG5cdH0gZWxzZSB7XG5cdFx0Um9ja2V0Q2hhdC5hZGRVc2VyVG9Sb29tKHJvb20uX2lkLCB1c2VyKTtcblxuXHRcdHRoaXMubG9nKGAkeyB1c2VyLnVzZXJuYW1lIH0gam9pbmVkIHJvb20gJHsgcm9vbS5uYW1lIH1gKTtcblx0fVxufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaGFuZGxlTGVmdENoYW5uZWwoYXJncykge1xuXHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZSh7XG5cdFx0J3Byb2ZpbGUuaXJjLm5pY2snOiBhcmdzLm5pY2ssXG5cdH0pO1xuXG5cdGlmICghdXNlcikge1xuXHRcdHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgYSB1c2VyIHdpdGggbmljayAkeyBhcmdzLm5pY2sgfWApO1xuXHR9XG5cblx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeU5hbWUoYXJncy5yb29tTmFtZSk7XG5cblx0aWYgKCFyb29tKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBhIHJvb20gd2l0aCBuYW1lICR7IGFyZ3Mucm9vbU5hbWUgfWApO1xuXHR9XG5cblx0dGhpcy5sb2coYCR7IHVzZXIudXNlcm5hbWUgfSBsZWZ0IHJvb20gJHsgcm9vbS5uYW1lIH1gKTtcblx0Um9ja2V0Q2hhdC5yZW1vdmVVc2VyRnJvbVJvb20ocm9vbS5faWQsIHVzZXIpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaGFuZGxlTmlja0NoYW5nZWQoYXJncykge1xuXHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZSh7XG5cdFx0J3Byb2ZpbGUuaXJjLm5pY2snOiBhcmdzLm5pY2ssXG5cdH0pO1xuXG5cdGlmICghdXNlcikge1xuXHRcdHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgYW4gdXNlciB3aXRoIG5pY2sgJHsgYXJncy5uaWNrIH1gKTtcblx0fVxuXG5cdHRoaXMubG9nKGAkeyB1c2VyLnVzZXJuYW1lIH0gY2hhbmdlZCBuaWNrOiAkeyBhcmdzLm5pY2sgfSAtPiAkeyBhcmdzLm5ld05pY2sgfWApO1xuXG5cdC8vIFVwZGF0ZSBvbiB0aGUgZGF0YWJhc2Vcblx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMudXBkYXRlKHsgX2lkOiB1c2VyLl9pZCB9LCB7XG5cdFx0JHNldDoge1xuXHRcdFx0bmFtZTogYXJncy5uZXdOaWNrLFxuXHRcdFx0J3Byb2ZpbGUuaXJjLm5pY2snOiBhcmdzLm5ld05pY2ssXG5cdFx0fSxcblx0fSk7XG59XG4iLCIvKlxuICpcbiAqIEdldCBkaXJlY3QgY2hhdCByb29tIGhlbHBlclxuICpcbiAqXG4gKi9cbmNvbnN0IGdldERpcmVjdFJvb20gPSAoc291cmNlLCB0YXJnZXQpID0+IHtcblx0Y29uc3QgcmlkID0gW3NvdXJjZS5faWQsIHRhcmdldC5faWRdLnNvcnQoKS5qb2luKCcnKTtcblxuXHRSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy51cHNlcnQoeyBfaWQ6IHJpZCB9LCB7XG5cdFx0JHNldE9uSW5zZXJ0OiB7XG5cdFx0XHR0OiAnZCcsXG5cdFx0XHRtc2dzOiAwLFxuXHRcdFx0dHM6IG5ldyBEYXRlKCksXG5cdFx0fSxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cHNlcnQoeyByaWQsICd1Ll9pZCc6IHRhcmdldC5faWQgfSwge1xuXHRcdCRzZXRPbkluc2VydDoge1xuXHRcdFx0bmFtZTogc291cmNlLnVzZXJuYW1lLFxuXHRcdFx0dDogJ2QnLFxuXHRcdFx0b3BlbjogZmFsc2UsXG5cdFx0XHRhbGVydDogZmFsc2UsXG5cdFx0XHR1bnJlYWQ6IDAsXG5cdFx0XHR1OiB7XG5cdFx0XHRcdF9pZDogdGFyZ2V0Ll9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IHRhcmdldC51c2VybmFtZSxcblx0XHRcdH0sXG5cdFx0fSxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cHNlcnQoeyByaWQsICd1Ll9pZCc6IHNvdXJjZS5faWQgfSwge1xuXHRcdCRzZXRPbkluc2VydDoge1xuXHRcdFx0bmFtZTogdGFyZ2V0LnVzZXJuYW1lLFxuXHRcdFx0dDogJ2QnLFxuXHRcdFx0b3BlbjogZmFsc2UsXG5cdFx0XHRhbGVydDogZmFsc2UsXG5cdFx0XHR1bnJlYWQ6IDAsXG5cdFx0XHR1OiB7XG5cdFx0XHRcdF9pZDogc291cmNlLl9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IHNvdXJjZS51c2VybmFtZSxcblx0XHRcdH0sXG5cdFx0fSxcblx0fSk7XG5cblx0cmV0dXJuIHtcblx0XHRfaWQ6IHJpZCxcblx0XHR0OiAnZCcsXG5cdH07XG59O1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBoYW5kbGVTZW50TWVzc2FnZShhcmdzKSB7XG5cdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHtcblx0XHQncHJvZmlsZS5pcmMubmljayc6IGFyZ3Mubmljayxcblx0fSk7XG5cblx0aWYgKCF1c2VyKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBhIHVzZXIgd2l0aCBuaWNrICR7IGFyZ3MubmljayB9YCk7XG5cdH1cblxuXHRsZXQgcm9vbTtcblxuXHRpZiAoYXJncy5yb29tTmFtZSkge1xuXHRcdHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlOYW1lKGFyZ3Mucm9vbU5hbWUpO1xuXHR9IGVsc2Uge1xuXHRcdGNvbnN0IHJlY2lwaWVudFVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHtcblx0XHRcdCdwcm9maWxlLmlyYy5uaWNrJzogYXJncy5yZWNpcGllbnROaWNrLFxuXHRcdH0pO1xuXG5cdFx0cm9vbSA9IGdldERpcmVjdFJvb20odXNlciwgcmVjaXBpZW50VXNlcik7XG5cdH1cblxuXHRjb25zdCBtZXNzYWdlID0ge1xuXHRcdG1zZzogYXJncy5tZXNzYWdlLFxuXHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHR9O1xuXG5cdFJvY2tldENoYXQuc2VuZE1lc3NhZ2UodXNlciwgbWVzc2FnZSwgcm9vbSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBoYW5kbGVVc2VyUmVnaXN0ZXJlZChhcmdzKSB7XG5cdC8vIENoZWNrIGlmIHRoZXJlIGlzIGFuIHVzZXIgd2l0aCB0aGUgZ2l2ZW4gdXNlcm5hbWVcblx0bGV0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHtcblx0XHQncHJvZmlsZS5pcmMudXNlcm5hbWUnOiBhcmdzLnVzZXJuYW1lLFxuXHR9KTtcblxuXHQvLyBJZiB0aGVyZSBpcyBubyB1c2VyLCBjcmVhdGUgb25lLi4uXG5cdGlmICghdXNlcikge1xuXHRcdHRoaXMubG9nKGBSZWdpc3RlcmluZyAkeyBhcmdzLnVzZXJuYW1lIH0gd2l0aCBuaWNrOiAkeyBhcmdzLm5pY2sgfWApO1xuXG5cdFx0Y29uc3QgdXNlclRvSW5zZXJ0ID0ge1xuXHRcdFx0bmFtZTogYXJncy5uaWNrLFxuXHRcdFx0dXNlcm5hbWU6IGAkeyBhcmdzLnVzZXJuYW1lIH0taXJjYCxcblx0XHRcdHN0YXR1czogJ29ubGluZScsXG5cdFx0XHR1dGNPZmZzZXQ6IDAsXG5cdFx0XHRhY3RpdmU6IHRydWUsXG5cdFx0XHR0eXBlOiAndXNlcicsXG5cdFx0XHRwcm9maWxlOiB7XG5cdFx0XHRcdGlyYzoge1xuXHRcdFx0XHRcdGZyb21JUkM6IHRydWUsXG5cdFx0XHRcdFx0bmljazogYXJncy5uaWNrLFxuXHRcdFx0XHRcdHVzZXJuYW1lOiBhcmdzLnVzZXJuYW1lLFxuXHRcdFx0XHRcdGhvc3RuYW1lOiBhcmdzLmhvc3RuYW1lLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHR9O1xuXG5cdFx0dXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmNyZWF0ZSh1c2VyVG9JbnNlcnQpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIC4uLm90aGVyd2lzZSwgbG9nIHRoZSB1c2VyIGluIGFuZCB1cGRhdGUgdGhlIGluZm9ybWF0aW9uXG5cdFx0dGhpcy5sb2coYExvZ2dpbmcgaW4gJHsgYXJncy51c2VybmFtZSB9IHdpdGggbmljazogJHsgYXJncy5uaWNrIH1gKTtcblxuXHRcdE1ldGVvci51c2Vycy51cGRhdGUoeyBfaWQ6IHVzZXIuX2lkIH0sIHtcblx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0c3RhdHVzOiAnb25saW5lJyxcblx0XHRcdFx0J3Byb2ZpbGUuaXJjLm5pY2snOiBhcmdzLm5pY2ssXG5cdFx0XHRcdCdwcm9maWxlLmlyYy51c2VybmFtZSc6IGFyZ3MudXNlcm5hbWUsXG5cdFx0XHRcdCdwcm9maWxlLmlyYy5ob3N0bmFtZSc6IGFyZ3MuaG9zdG5hbWUsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9XG59XG4iLCJpbXBvcnQgUkZDMjgxMyBmcm9tICcuL1JGQzI4MTMnO1xuXG5leHBvcnQgeyBSRkMyODEzIH07XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXJ0eW5zbWl0aC9ub2RlLWlyY1xuICogYnkgaHR0cHM6Ly9naXRodWIuY29tL21hcnR5bnNtaXRoXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdCcwMDEnOiB7XG5cdFx0bmFtZTogJ3JwbF93ZWxjb21lJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQnMDAyJzoge1xuXHRcdG5hbWU6ICdycGxfeW91cmhvc3QnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdCcwMDMnOiB7XG5cdFx0bmFtZTogJ3JwbF9jcmVhdGVkJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQnMDA0Jzoge1xuXHRcdG5hbWU6ICdycGxfbXlpbmZvJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQnMDA1Jzoge1xuXHRcdG5hbWU6ICdycGxfaXN1cHBvcnQnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDIwMDoge1xuXHRcdG5hbWU6ICdycGxfdHJhY2VsaW5rJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyMDE6IHtcblx0XHRuYW1lOiAncnBsX3RyYWNlY29ubmVjdGluZycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjAyOiB7XG5cdFx0bmFtZTogJ3JwbF90cmFjZWhhbmRzaGFrZScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjAzOiB7XG5cdFx0bmFtZTogJ3JwbF90cmFjZXVua25vd24nLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDIwNDoge1xuXHRcdG5hbWU6ICdycGxfdHJhY2VvcGVyYXRvcicsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjA1OiB7XG5cdFx0bmFtZTogJ3JwbF90cmFjZXVzZXInLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDIwNjoge1xuXHRcdG5hbWU6ICdycGxfdHJhY2VzZXJ2ZXInLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDIwODoge1xuXHRcdG5hbWU6ICdycGxfdHJhY2VuZXd0eXBlJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyMTE6IHtcblx0XHRuYW1lOiAncnBsX3N0YXRzbGlua2luZm8nLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDIxMjoge1xuXHRcdG5hbWU6ICdycGxfc3RhdHNjb21tYW5kcycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjEzOiB7XG5cdFx0bmFtZTogJ3JwbF9zdGF0c2NsaW5lJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyMTQ6IHtcblx0XHRuYW1lOiAncnBsX3N0YXRzbmxpbmUnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDIxNToge1xuXHRcdG5hbWU6ICdycGxfc3RhdHNpbGluZScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjE2OiB7XG5cdFx0bmFtZTogJ3JwbF9zdGF0c2tsaW5lJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyMTg6IHtcblx0XHRuYW1lOiAncnBsX3N0YXRzeWxpbmUnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDIxOToge1xuXHRcdG5hbWU6ICdycGxfZW5kb2ZzdGF0cycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjIxOiB7XG5cdFx0bmFtZTogJ3JwbF91bW9kZWlzJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyNDE6IHtcblx0XHRuYW1lOiAncnBsX3N0YXRzbGxpbmUnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDI0Mjoge1xuXHRcdG5hbWU6ICdycGxfc3RhdHN1cHRpbWUnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDI0Mzoge1xuXHRcdG5hbWU6ICdycGxfc3RhdHNvbGluZScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjQ0OiB7XG5cdFx0bmFtZTogJ3JwbF9zdGF0c2hsaW5lJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyNTA6IHtcblx0XHRuYW1lOiAncnBsX3N0YXRzY29ubicsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjUxOiB7XG5cdFx0bmFtZTogJ3JwbF9sdXNlcmNsaWVudCcsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjUyOiB7XG5cdFx0bmFtZTogJ3JwbF9sdXNlcm9wJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyNTM6IHtcblx0XHRuYW1lOiAncnBsX2x1c2VydW5rbm93bicsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjU0OiB7XG5cdFx0bmFtZTogJ3JwbF9sdXNlcmNoYW5uZWxzJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyNTU6IHtcblx0XHRuYW1lOiAncnBsX2x1c2VybWUnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDI1Njoge1xuXHRcdG5hbWU6ICdycGxfYWRtaW5tZScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjU3OiB7XG5cdFx0bmFtZTogJ3JwbF9hZG1pbmxvYzEnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDI1ODoge1xuXHRcdG5hbWU6ICdycGxfYWRtaW5sb2MyJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQyNTk6IHtcblx0XHRuYW1lOiAncnBsX2FkbWluZW1haWwnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDI2MToge1xuXHRcdG5hbWU6ICdycGxfdHJhY2Vsb2cnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDI2NToge1xuXHRcdG5hbWU6ICdycGxfbG9jYWx1c2VycycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MjY2OiB7XG5cdFx0bmFtZTogJ3JwbF9nbG9iYWx1c2VycycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzAwOiB7XG5cdFx0bmFtZTogJ3JwbF9ub25lJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMDE6IHtcblx0XHRuYW1lOiAncnBsX2F3YXknLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDMwMjoge1xuXHRcdG5hbWU6ICdycGxfdXNlcmhvc3QnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDMwMzoge1xuXHRcdG5hbWU6ICdycGxfaXNvbicsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzA1OiB7XG5cdFx0bmFtZTogJ3JwbF91bmF3YXknLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDMwNjoge1xuXHRcdG5hbWU6ICdycGxfbm93YXdheScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzExOiB7XG5cdFx0bmFtZTogJ3JwbF93aG9pc3VzZXInLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDMxMjoge1xuXHRcdG5hbWU6ICdycGxfd2hvaXNzZXJ2ZXInLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDMxMzoge1xuXHRcdG5hbWU6ICdycGxfd2hvaXNvcGVyYXRvcicsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzE0OiB7XG5cdFx0bmFtZTogJ3JwbF93aG93YXN1c2VyJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMTU6IHtcblx0XHRuYW1lOiAncnBsX2VuZG9md2hvJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMTc6IHtcblx0XHRuYW1lOiAncnBsX3dob2lzaWRsZScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzE4OiB7XG5cdFx0bmFtZTogJ3JwbF9lbmRvZndob2lzJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMTk6IHtcblx0XHRuYW1lOiAncnBsX3dob2lzY2hhbm5lbHMnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDMyMToge1xuXHRcdG5hbWU6ICdycGxfbGlzdHN0YXJ0Jyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMjI6IHtcblx0XHRuYW1lOiAncnBsX2xpc3QnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDMyMzoge1xuXHRcdG5hbWU6ICdycGxfbGlzdGVuZCcsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzI0OiB7XG5cdFx0bmFtZTogJ3JwbF9jaGFubmVsbW9kZWlzJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMjk6IHtcblx0XHRuYW1lOiAncnBsX2NyZWF0aW9udGltZScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzMxOiB7XG5cdFx0bmFtZTogJ3JwbF9ub3RvcGljJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMzI6IHtcblx0XHRuYW1lOiAncnBsX3RvcGljJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzMzM6IHtcblx0XHRuYW1lOiAncnBsX3RvcGljd2hvdGltZScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzQxOiB7XG5cdFx0bmFtZTogJ3JwbF9pbnZpdGluZycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzQyOiB7XG5cdFx0bmFtZTogJ3JwbF9zdW1tb25pbmcnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM1MToge1xuXHRcdG5hbWU6ICdycGxfdmVyc2lvbicsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzUyOiB7XG5cdFx0bmFtZTogJ3JwbF93aG9yZXBseScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzUzOiB7XG5cdFx0bmFtZTogJ3JwbF9uYW1yZXBseScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzY0OiB7XG5cdFx0bmFtZTogJ3JwbF9saW5rcycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzY1OiB7XG5cdFx0bmFtZTogJ3JwbF9lbmRvZmxpbmtzJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzNjY6IHtcblx0XHRuYW1lOiAncnBsX2VuZG9mbmFtZXMnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM2Nzoge1xuXHRcdG5hbWU6ICdycGxfYmFubGlzdCcsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzY4OiB7XG5cdFx0bmFtZTogJ3JwbF9lbmRvZmJhbmxpc3QnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM2OToge1xuXHRcdG5hbWU6ICdycGxfZW5kb2Z3aG93YXMnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM3MToge1xuXHRcdG5hbWU6ICdycGxfaW5mbycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzcyOiB7XG5cdFx0bmFtZTogJ3JwbF9tb3RkJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzNzQ6IHtcblx0XHRuYW1lOiAncnBsX2VuZG9maW5mbycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0Mzc1OiB7XG5cdFx0bmFtZTogJ3JwbF9tb3Rkc3RhcnQnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM3Njoge1xuXHRcdG5hbWU6ICdycGxfZW5kb2Ztb3RkJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzODE6IHtcblx0XHRuYW1lOiAncnBsX3lvdXJlb3BlcicsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzgyOiB7XG5cdFx0bmFtZTogJ3JwbF9yZWhhc2hpbmcnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM5MToge1xuXHRcdG5hbWU6ICdycGxfdGltZScsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0MzkyOiB7XG5cdFx0bmFtZTogJ3JwbF91c2Vyc3N0YXJ0Jyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzOTM6IHtcblx0XHRuYW1lOiAncnBsX3VzZXJzJyxcblx0XHR0eXBlOiAncmVwbHknLFxuXHR9LFxuXHQzOTQ6IHtcblx0XHRuYW1lOiAncnBsX2VuZG9mdXNlcnMnLFxuXHRcdHR5cGU6ICdyZXBseScsXG5cdH0sXG5cdDM5NToge1xuXHRcdG5hbWU6ICdycGxfbm91c2VycycsXG5cdFx0dHlwZTogJ3JlcGx5Jyxcblx0fSxcblx0NDAxOiB7XG5cdFx0bmFtZTogJ2Vycl9ub3N1Y2huaWNrJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MDI6IHtcblx0XHRuYW1lOiAnZXJyX25vc3VjaHNlcnZlcicsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDAzOiB7XG5cdFx0bmFtZTogJ2Vycl9ub3N1Y2hjaGFubmVsJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MDQ6IHtcblx0XHRuYW1lOiAnZXJyX2Nhbm5vdHNlbmR0b2NoYW4nLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQwNToge1xuXHRcdG5hbWU6ICdlcnJfdG9vbWFueWNoYW5uZWxzJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MDY6IHtcblx0XHRuYW1lOiAnZXJyX3dhc25vc3VjaG5pY2snLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQwNzoge1xuXHRcdG5hbWU6ICdlcnJfdG9vbWFueXRhcmdldHMnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQwOToge1xuXHRcdG5hbWU6ICdlcnJfbm9vcmlnaW4nLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQxMToge1xuXHRcdG5hbWU6ICdlcnJfbm9yZWNpcGllbnQnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQxMjoge1xuXHRcdG5hbWU6ICdlcnJfbm90ZXh0dG9zZW5kJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MTM6IHtcblx0XHRuYW1lOiAnZXJyX25vdG9wbGV2ZWwnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQxNDoge1xuXHRcdG5hbWU6ICdlcnJfd2lsZHRvcGxldmVsJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MjE6IHtcblx0XHRuYW1lOiAnZXJyX3Vua25vd25jb21tYW5kJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MjI6IHtcblx0XHRuYW1lOiAnZXJyX25vbW90ZCcsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDIzOiB7XG5cdFx0bmFtZTogJ2Vycl9ub2FkbWluaW5mbycsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDI0OiB7XG5cdFx0bmFtZTogJ2Vycl9maWxlZXJyb3InLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQzMToge1xuXHRcdG5hbWU6ICdlcnJfbm9uaWNrbmFtZWdpdmVuJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0MzI6IHtcblx0XHRuYW1lOiAnZXJyX2Vycm9uZXVzbmlja25hbWUnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQzMzoge1xuXHRcdG5hbWU6ICdlcnJfbmlja25hbWVpbnVzZScsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDM2OiB7XG5cdFx0bmFtZTogJ2Vycl9uaWNrY29sbGlzaW9uJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0NDE6IHtcblx0XHRuYW1lOiAnZXJyX3VzZXJub3RpbmNoYW5uZWwnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ0Mjoge1xuXHRcdG5hbWU6ICdlcnJfbm90b25jaGFubmVsJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0NDM6IHtcblx0XHRuYW1lOiAnZXJyX3VzZXJvbmNoYW5uZWwnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ0NDoge1xuXHRcdG5hbWU6ICdlcnJfbm9sb2dpbicsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDQ1OiB7XG5cdFx0bmFtZTogJ2Vycl9zdW1tb25kaXNhYmxlZCcsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDQ2OiB7XG5cdFx0bmFtZTogJ2Vycl91c2Vyc2Rpc2FibGVkJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0NTE6IHtcblx0XHRuYW1lOiAnZXJyX25vdHJlZ2lzdGVyZWQnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ2MToge1xuXHRcdG5hbWU6ICdlcnJfbmVlZG1vcmVwYXJhbXMnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ2Mjoge1xuXHRcdG5hbWU6ICdlcnJfYWxyZWFkeXJlZ2lzdHJlZCcsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDYzOiB7XG5cdFx0bmFtZTogJ2Vycl9ub3Blcm1mb3Job3N0Jyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0NjQ6IHtcblx0XHRuYW1lOiAnZXJyX3Bhc3N3ZG1pc21hdGNoJyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0NjU6IHtcblx0XHRuYW1lOiAnZXJyX3lvdXJlYmFubmVkY3JlZXAnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ2Nzoge1xuXHRcdG5hbWU6ICdlcnJfa2V5c2V0Jyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ0NzE6IHtcblx0XHRuYW1lOiAnZXJyX2NoYW5uZWxpc2Z1bGwnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ3Mjoge1xuXHRcdG5hbWU6ICdlcnJfdW5rbm93bm1vZGUnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ3Mzoge1xuXHRcdG5hbWU6ICdlcnJfaW52aXRlb25seWNoYW4nLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ3NDoge1xuXHRcdG5hbWU6ICdlcnJfYmFubmVkZnJvbWNoYW4nLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ3NToge1xuXHRcdG5hbWU6ICdlcnJfYmFkY2hhbm5lbGtleScsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDgxOiB7XG5cdFx0bmFtZTogJ2Vycl9ub3ByaXZpbGVnZXMnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDQ4Mjoge1xuXHRcdG5hbWU6ICdlcnJfY2hhbm9wcml2c25lZWRlZCcsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDgzOiB7XG5cdFx0bmFtZTogJ2Vycl9jYW50a2lsbHNlcnZlcicsXG5cdFx0dHlwZTogJ2Vycm9yJyxcblx0fSxcblx0NDkxOiB7XG5cdFx0bmFtZTogJ2Vycl9ub29wZXJob3N0Jyxcblx0XHR0eXBlOiAnZXJyb3InLFxuXHR9LFxuXHQ1MDE6IHtcblx0XHRuYW1lOiAnZXJyX3Vtb2RldW5rbm93bmZsYWcnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG5cdDUwMjoge1xuXHRcdG5hbWU6ICdlcnJfdXNlcnNkb250bWF0Y2gnLFxuXHRcdHR5cGU6ICdlcnJvcicsXG5cdH0sXG59O1xuIiwiaW1wb3J0IG5ldCBmcm9tICduZXQnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnO1xuXG5pbXBvcnQgcGFyc2VNZXNzYWdlIGZyb20gJy4vcGFyc2VNZXNzYWdlJztcblxuaW1wb3J0IHBlZXJDb21tYW5kSGFuZGxlcnMgZnJvbSAnLi9wZWVyQ29tbWFuZEhhbmRsZXJzJztcbmltcG9ydCBsb2NhbENvbW1hbmRIYW5kbGVycyBmcm9tICcuL2xvY2FsQ29tbWFuZEhhbmRsZXJzJztcblxuY2xhc3MgUkZDMjgxMyB7XG5cdGNvbnN0cnVjdG9yKGNvbmZpZykge1xuXHRcdHRoaXMuY29uZmlnID0gY29uZmlnO1xuXG5cdFx0Ly8gSG9sZCByZWdpc3RlcmVkIHN0YXRlXG5cdFx0dGhpcy5yZWdpc3RlclN0ZXBzID0gW107XG5cdFx0dGhpcy5pc1JlZ2lzdGVyZWQgPSBmYWxzZTtcblxuXHRcdC8vIEhvbGQgcGVlciBzZXJ2ZXIgaW5mb3JtYXRpb25cblx0XHR0aGlzLnNlcnZlclByZWZpeCA9IG51bGw7XG5cblx0XHQvLyBIb2xkIHRoZSBidWZmZXIgd2hpbGUgcmVjZWl2aW5nXG5cdFx0dGhpcy5yZWNlaXZlQnVmZmVyID0gbmV3IEJ1ZmZlcignJyk7XG5cblx0fVxuXG5cdC8qKlxuXHQgKiBTZXR1cCBzb2NrZXRcblx0ICovXG5cdHNldHVwU29ja2V0KCkge1xuXHRcdC8vIFNldHVwIHNvY2tldFxuXHRcdHRoaXMuc29ja2V0ID0gbmV3IG5ldC5Tb2NrZXQoKTtcblx0XHR0aGlzLnNvY2tldC5zZXROb0RlbGF5KCk7XG5cdFx0dGhpcy5zb2NrZXQuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG5cdFx0dGhpcy5zb2NrZXQuc2V0S2VlcEFsaXZlKHRydWUpO1xuXHRcdHRoaXMuc29ja2V0LnNldFRpbWVvdXQoOTAwMDApO1xuXG5cdFx0dGhpcy5zb2NrZXQub24oJ2RhdGEnLCB0aGlzLm9uUmVjZWl2ZUZyb21QZWVyLmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5zb2NrZXQub24oJ2Nvbm5lY3QnLCB0aGlzLm9uQ29ubmVjdC5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLnNvY2tldC5vbignZXJyb3InLCAoZXJyKSA9PiBjb25zb2xlLmxvZygnW2lyY11bc2VydmVyXVtlcnJdJywgZXJyKSk7XG5cdFx0dGhpcy5zb2NrZXQub24oJ3RpbWVvdXQnLCAoKSA9PiB0aGlzLmxvZygnVGltZW91dCcpKTtcblx0XHR0aGlzLnNvY2tldC5vbignY2xvc2UnLCAoKSA9PiB0aGlzLmxvZygnQ29ubmVjdGlvbiBDbG9zZWQnKSk7XG5cdFx0Ly8gU2V0dXAgbG9jYWxcblx0XHR0aGlzLm9uKCdvblJlY2VpdmVGcm9tTG9jYWwnLCB0aGlzLm9uUmVjZWl2ZUZyb21Mb2NhbC5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBMb2cgaGVscGVyXG5cdCAqL1xuXHRsb2cobWVzc2FnZSkge1xuXHRcdGNvbnNvbGUubG9nKGBbaXJjXVtzZXJ2ZXJdICR7IG1lc3NhZ2UgfWApO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbm5lY3Rcblx0ICovXG5cdHJlZ2lzdGVyKCkge1xuXHRcdHRoaXMubG9nKGBDb25uZWN0aW5nIHRvIEAkeyB0aGlzLmNvbmZpZy5zZXJ2ZXIuaG9zdCB9OiR7IHRoaXMuY29uZmlnLnNlcnZlci5wb3J0IH1gKTtcblxuXHRcdGlmICghdGhpcy5zb2NrZXQpIHtcblx0XHRcdHRoaXMuc2V0dXBTb2NrZXQoKTtcblx0XHR9XG5cblx0XHR0aGlzLnNvY2tldC5jb25uZWN0KHRoaXMuY29uZmlnLnNlcnZlci5wb3J0LCB0aGlzLmNvbmZpZy5zZXJ2ZXIuaG9zdCk7XG5cdH1cblxuXHQvKipcblx0ICogRGlzY29ubmVjdFxuXHQgKi9cblx0ZGlzY29ubmVjdCgpIHtcblx0XHR0aGlzLmxvZygnRGlzY29ubmVjdGluZyBmcm9tIHNlcnZlci4nKTtcblxuXHRcdGlmICh0aGlzLnNvY2tldCkge1xuXHRcdFx0dGhpcy5zb2NrZXQuZGVzdHJveSgpO1xuXHRcdFx0dGhpcy5zb2NrZXQgPSB1bmRlZmluZWQ7XG5cdFx0fVxuXHRcdHRoaXMuaXNSZWdpc3RlcmVkID0gZmFsc2U7XG5cdFx0dGhpcy5yZWdpc3RlclN0ZXBzID0gW107XG5cdH1cblxuXHQvKipcblx0ICogU2V0dXAgdGhlIHNlcnZlciBjb25uZWN0aW9uXG5cdCAqL1xuXHRvbkNvbm5lY3QoKSB7XG5cdFx0dGhpcy5sb2coJ0Nvbm5lY3RlZCEgUmVnaXN0ZXJpbmcgYXMgc2VydmVyLi4uJyk7XG5cblx0XHR0aGlzLndyaXRlKHtcblx0XHRcdGNvbW1hbmQ6ICdQQVNTJyxcblx0XHRcdHBhcmFtZXRlcnM6IFt0aGlzLmNvbmZpZy5wYXNzd29yZHMubG9jYWwsICcwMjEwJywgJ25naXJjZCddLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy53cml0ZSh7XG5cdFx0XHRjb21tYW5kOiAnU0VSVkVSJywgcGFyYW1ldGVyczogW3RoaXMuY29uZmlnLnNlcnZlci5uYW1lXSxcblx0XHRcdHRyYWlsZXI6IHRoaXMuY29uZmlnLnNlcnZlci5kZXNjcmlwdGlvbixcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBTZW5kcyBhIGNvbW1hbmQgbWVzc2FnZSB0aHJvdWdoIHRoZSBzb2NrZXRcblx0ICovXG5cdHdyaXRlKGNvbW1hbmQpIHtcblx0XHRsZXQgYnVmZmVyID0gY29tbWFuZC5wcmVmaXggPyBgOiR7IGNvbW1hbmQucHJlZml4IH0gYCA6ICcnO1xuXHRcdGJ1ZmZlciArPSBjb21tYW5kLmNvbW1hbmQ7XG5cblx0XHRpZiAoY29tbWFuZC5wYXJhbWV0ZXJzICYmIGNvbW1hbmQucGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG5cdFx0XHRidWZmZXIgKz0gYCAkeyBjb21tYW5kLnBhcmFtZXRlcnMuam9pbignICcpIH1gO1xuXHRcdH1cblxuXHRcdGlmIChjb21tYW5kLnRyYWlsZXIpIHtcblx0XHRcdGJ1ZmZlciArPSBgIDokeyBjb21tYW5kLnRyYWlsZXIgfWA7XG5cdFx0fVxuXG5cdFx0dGhpcy5sb2coYFNlbmRpbmcgQ29tbWFuZDogJHsgYnVmZmVyIH1gKTtcblxuXHRcdHJldHVybiB0aGlzLnNvY2tldC53cml0ZShgJHsgYnVmZmVyIH1cXHJcXG5gKTtcblx0fVxuXG5cdC8qKlxuXHQgKlxuXHQgKlxuXHQgKiBQZWVyIG1lc3NhZ2UgaGFuZGxpbmdcblx0ICpcblx0ICpcblx0ICovXG5cdG9uUmVjZWl2ZUZyb21QZWVyKGNodW5rKSB7XG5cdFx0aWYgKHR5cGVvZiAoY2h1bmspID09PSAnc3RyaW5nJykge1xuXHRcdFx0dGhpcy5yZWNlaXZlQnVmZmVyICs9IGNodW5rO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnJlY2VpdmVCdWZmZXIgPSBCdWZmZXIuY29uY2F0KFt0aGlzLnJlY2VpdmVCdWZmZXIsIGNodW5rXSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgbGluZXMgPSB0aGlzLnJlY2VpdmVCdWZmZXIudG9TdHJpbmcoKS5zcGxpdCgvXFxyXFxufFxccnxcXG58XFx1MDAwNy8pOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnRyb2wtcmVnZXhcblxuXHRcdC8vIElmIHRoZSBidWZmZXIgZG9lcyBub3QgZW5kIHdpdGggXFxyXFxuLCBtb3JlIGNodW5rcyBhcmUgY29taW5nXG5cdFx0aWYgKGxpbmVzLnBvcCgpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gUmVzZXQgdGhlIGJ1ZmZlclxuXHRcdHRoaXMucmVjZWl2ZUJ1ZmZlciA9IG5ldyBCdWZmZXIoJycpO1xuXG5cdFx0bGluZXMuZm9yRWFjaCgobGluZSkgPT4ge1xuXHRcdFx0aWYgKGxpbmUubGVuZ3RoICYmICFsaW5lLnN0YXJ0c1dpdGgoJ1xcYScpKSB7XG5cdFx0XHRcdGNvbnN0IHBhcnNlZE1lc3NhZ2UgPSBwYXJzZU1lc3NhZ2UobGluZSk7XG5cblx0XHRcdFx0aWYgKHBlZXJDb21tYW5kSGFuZGxlcnNbcGFyc2VkTWVzc2FnZS5jb21tYW5kXSkge1xuXHRcdFx0XHRcdHRoaXMubG9nKGBIYW5kbGluZyBwZWVyIG1lc3NhZ2U6ICR7IGxpbmUgfWApO1xuXG5cdFx0XHRcdFx0Y29uc3QgY29tbWFuZCA9IHBlZXJDb21tYW5kSGFuZGxlcnNbcGFyc2VkTWVzc2FnZS5jb21tYW5kXS5jYWxsKHRoaXMsIHBhcnNlZE1lc3NhZ2UpO1xuXG5cdFx0XHRcdFx0aWYgKGNvbW1hbmQpIHtcblx0XHRcdFx0XHRcdHRoaXMubG9nKGBFbWl0dGluZyBwZWVyIGNvbW1hbmQgdG8gbG9jYWw6ICR7IEpTT04uc3RyaW5naWZ5KGNvbW1hbmQpIH1gKTtcblx0XHRcdFx0XHRcdHRoaXMuZW1pdCgncGVlckNvbW1hbmQnLCBjb21tYW5kKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5sb2coYFVuaGFuZGxlZCBwZWVyIG1lc3NhZ2U6ICR7IEpTT04uc3RyaW5naWZ5KHBhcnNlZE1lc3NhZ2UpIH1gKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqXG5cdCAqXG5cdCAqIExvY2FsIG1lc3NhZ2UgaGFuZGxpbmdcblx0ICpcblx0ICpcblx0ICovXG5cdG9uUmVjZWl2ZUZyb21Mb2NhbChjb21tYW5kLCBwYXJhbWV0ZXJzKSB7XG5cdFx0aWYgKGxvY2FsQ29tbWFuZEhhbmRsZXJzW2NvbW1hbmRdKSB7XG5cdFx0XHR0aGlzLmxvZyhgSGFuZGxpbmcgbG9jYWwgY29tbWFuZDogJHsgY29tbWFuZCB9YCk7XG5cblx0XHRcdGxvY2FsQ29tbWFuZEhhbmRsZXJzW2NvbW1hbmRdLmNhbGwodGhpcywgcGFyYW1ldGVycyk7XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5sb2coYFVuaGFuZGxlZCBsb2NhbCBjb21tYW5kOiAkeyBKU09OLnN0cmluZ2lmeShjb21tYW5kKSB9YCk7XG5cdFx0fVxuXHR9XG59XG5cbnV0aWwuaW5oZXJpdHMoUkZDMjgxMywgRXZlbnRFbWl0dGVyKTtcblxuZXhwb3J0IGRlZmF1bHQgUkZDMjgxMztcbiIsImZ1bmN0aW9uIHJlZ2lzdGVyVXNlcihwYXJhbWV0ZXJzKSB7XG5cdGNvbnN0IHsgbmFtZSwgcHJvZmlsZTogeyBpcmM6IHsgbmljaywgdXNlcm5hbWUgfSB9IH0gPSBwYXJhbWV0ZXJzO1xuXG5cdHRoaXMud3JpdGUoe1xuXHRcdHByZWZpeDogdGhpcy5jb25maWcuc2VydmVyLm5hbWUsXG5cdFx0Y29tbWFuZDogJ05JQ0snLCBwYXJhbWV0ZXJzOiBbbmljaywgMSwgdXNlcm5hbWUsICdpcmMucm9ja2V0LmNoYXQnLCAxLCAnK2knXSxcblx0XHR0cmFpbGVyOiBuYW1lLFxuXHR9KTtcbn1cblxuZnVuY3Rpb24gam9pbkNoYW5uZWwocGFyYW1ldGVycykge1xuXHRjb25zdCB7XG5cdFx0cm9vbTogeyBuYW1lOiByb29tTmFtZSB9LFxuXHRcdHVzZXI6IHsgcHJvZmlsZTogeyBpcmM6IHsgbmljayB9IH0gfSxcblx0fSA9IHBhcmFtZXRlcnM7XG5cblx0dGhpcy53cml0ZSh7XG5cdFx0cHJlZml4OiB0aGlzLmNvbmZpZy5zZXJ2ZXIubmFtZSxcblx0XHRjb21tYW5kOiAnTkpPSU4nLCBwYXJhbWV0ZXJzOiBbYCMkeyByb29tTmFtZSB9YF0sXG5cdFx0dHJhaWxlcjogbmljayxcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGpvaW5lZENoYW5uZWwocGFyYW1ldGVycykge1xuXHRjb25zdCB7XG5cdFx0cm9vbTogeyBuYW1lOiByb29tTmFtZSB9LFxuXHRcdHVzZXI6IHsgcHJvZmlsZTogeyBpcmM6IHsgbmljayB9IH0gfSxcblx0fSA9IHBhcmFtZXRlcnM7XG5cblx0dGhpcy53cml0ZSh7XG5cdFx0cHJlZml4OiBuaWNrLFxuXHRcdGNvbW1hbmQ6ICdKT0lOJywgcGFyYW1ldGVyczogW2AjJHsgcm9vbU5hbWUgfWBdLFxuXHR9KTtcbn1cblxuZnVuY3Rpb24gbGVmdENoYW5uZWwocGFyYW1ldGVycykge1xuXHRjb25zdCB7XG5cdFx0cm9vbTogeyBuYW1lOiByb29tTmFtZSB9LFxuXHRcdHVzZXI6IHsgcHJvZmlsZTogeyBpcmM6IHsgbmljayB9IH0gfSxcblx0fSA9IHBhcmFtZXRlcnM7XG5cblx0dGhpcy53cml0ZSh7XG5cdFx0cHJlZml4OiBuaWNrLFxuXHRcdGNvbW1hbmQ6ICdQQVJUJywgcGFyYW1ldGVyczogW2AjJHsgcm9vbU5hbWUgfWBdLFxuXHR9KTtcbn1cblxuZnVuY3Rpb24gc2VudE1lc3NhZ2UocGFyYW1ldGVycykge1xuXHRjb25zdCB7XG5cdFx0dXNlcjogeyBwcm9maWxlOiB7IGlyYzogeyBuaWNrIH0gfSB9LFxuXHRcdHRvLFxuXHRcdG1lc3NhZ2UsXG5cdH0gPSBwYXJhbWV0ZXJzO1xuXG5cdHRoaXMud3JpdGUoe1xuXHRcdHByZWZpeDogbmljayxcblx0XHRjb21tYW5kOiAnUFJJVk1TRycsIHBhcmFtZXRlcnM6IFt0b10sXG5cdFx0dHJhaWxlcjogbWVzc2FnZSxcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGRpc2Nvbm5lY3RlZChwYXJhbWV0ZXJzKSB7XG5cdGNvbnN0IHtcblx0XHR1c2VyOiB7IHByb2ZpbGU6IHsgaXJjOiB7IG5pY2sgfSB9IH0sXG5cdH0gPSBwYXJhbWV0ZXJzO1xuXG5cdHRoaXMud3JpdGUoe1xuXHRcdHByZWZpeDogbmljayxcblx0XHRjb21tYW5kOiAnUVVJVCcsXG5cdH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7IHJlZ2lzdGVyVXNlciwgam9pbkNoYW5uZWwsIGpvaW5lZENoYW5uZWwsIGxlZnRDaGFubmVsLCBzZW50TWVzc2FnZSwgZGlzY29ubmVjdGVkIH07XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXJ0eW5zbWl0aC9ub2RlLWlyY1xuICogYnkgaHR0cHM6Ly9naXRodWIuY29tL21hcnR5bnNtaXRoXG4gKi9cblxuY29uc3QgcmVwbHlGb3IgPSByZXF1aXJlKCcuL2NvZGVzJyk7XG5cbi8qKlxuICogcGFyc2VNZXNzYWdlKGxpbmUsIHN0cmlwQ29sb3JzKVxuICpcbiAqIHRha2VzIGEgcmF3IFwibGluZVwiIGZyb20gdGhlIElSQyBzZXJ2ZXIgYW5kIHR1cm5zIGl0IGludG8gYW4gb2JqZWN0IHdpdGhcbiAqIHVzZWZ1bCBrZXlzXG4gKiBAcGFyYW0ge1N0cmluZ30gbGluZSBSYXcgbWVzc2FnZSBmcm9tIElSQyBzZXJ2ZXIuXG4gKiBAcmV0dXJuIHtPYmplY3R9IEEgcGFyc2VkIG1lc3NhZ2Ugb2JqZWN0LlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNlTWVzc2FnZShsaW5lKSB7XG5cdGNvbnN0IG1lc3NhZ2UgPSB7fTtcblx0bGV0IG1hdGNoO1xuXG5cdC8vIFBhcnNlIHByZWZpeFxuXHRtYXRjaCA9IGxpbmUubWF0Y2goL146KFteIF0rKSArLyk7XG5cdGlmIChtYXRjaCkge1xuXHRcdG1lc3NhZ2UucHJlZml4ID0gbWF0Y2hbMV07XG5cdFx0bGluZSA9IGxpbmUucmVwbGFjZSgvXjpbXiBdKyArLywgJycpO1xuXHRcdG1hdGNoID0gbWVzc2FnZS5wcmVmaXgubWF0Y2goL14oW19hLXpBLVowLTlcXH5cXFtcXF1cXFxcYF57fXwtXSopKCEoW15AXSspQCguKikpPyQvKTtcblx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdG1lc3NhZ2UubmljayA9IG1hdGNoWzFdO1xuXHRcdFx0bWVzc2FnZS51c2VyID0gbWF0Y2hbM107XG5cdFx0XHRtZXNzYWdlLmhvc3QgPSBtYXRjaFs0XTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bWVzc2FnZS5zZXJ2ZXIgPSBtZXNzYWdlLnByZWZpeDtcblx0XHR9XG5cdH1cblxuXHQvLyBQYXJzZSBjb21tYW5kXG5cdG1hdGNoID0gbGluZS5tYXRjaCgvXihbXiBdKykgKi8pO1xuXHRtZXNzYWdlLmNvbW1hbmQgPSBtYXRjaFsxXTtcblx0bWVzc2FnZS5yYXdDb21tYW5kID0gbWF0Y2hbMV07XG5cdG1lc3NhZ2UuY29tbWFuZFR5cGUgPSAnbm9ybWFsJztcblx0bGluZSA9IGxpbmUucmVwbGFjZSgvXlteIF0rICsvLCAnJyk7XG5cblx0aWYgKHJlcGx5Rm9yW21lc3NhZ2UucmF3Q29tbWFuZF0pIHtcblx0XHRtZXNzYWdlLmNvbW1hbmQgPSByZXBseUZvclttZXNzYWdlLnJhd0NvbW1hbmRdLm5hbWU7XG5cdFx0bWVzc2FnZS5jb21tYW5kVHlwZSA9IHJlcGx5Rm9yW21lc3NhZ2UucmF3Q29tbWFuZF0udHlwZTtcblx0fVxuXG5cdG1lc3NhZ2UuYXJncyA9IFtdO1xuXHRsZXQgbWlkZGxlO1xuXHRsZXQgdHJhaWxpbmc7XG5cblx0Ly8gUGFyc2UgcGFyYW1ldGVyc1xuXHRpZiAobGluZS5zZWFyY2goL146fFxccys6LykgIT09IC0xKSB7XG5cdFx0bWF0Y2ggPSBsaW5lLm1hdGNoKC8oLio/KSg/Ol46fFxccys6KSguKikvKTtcblx0XHRtaWRkbGUgPSBtYXRjaFsxXS50cmltUmlnaHQoKTtcblx0XHR0cmFpbGluZyA9IG1hdGNoWzJdO1xuXHR9IGVsc2Uge1xuXHRcdG1pZGRsZSA9IGxpbmU7XG5cdH1cblxuXHRpZiAobWlkZGxlLmxlbmd0aCkge1xuXHRcdG1lc3NhZ2UuYXJncyA9IG1pZGRsZS5zcGxpdCgvICsvKTtcblx0fVxuXG5cdGlmICh0eXBlb2YgKHRyYWlsaW5nKSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHJhaWxpbmcubGVuZ3RoKSB7XG5cdFx0bWVzc2FnZS5hcmdzLnB1c2godHJhaWxpbmcpO1xuXHR9XG5cblx0cmV0dXJuIG1lc3NhZ2U7XG59O1xuIiwiZnVuY3Rpb24gUEFTUygpIHtcblx0dGhpcy5sb2coJ1JlY2VpdmVkIFBBU1MgY29tbWFuZCwgY29udGludWUgcmVnaXN0ZXJpbmcuLi4nKTtcblxuXHR0aGlzLnJlZ2lzdGVyU3RlcHMucHVzaCgnUEFTUycpO1xufVxuXG5mdW5jdGlvbiBTRVJWRVIocGFyc2VkTWVzc2FnZSkge1xuXHR0aGlzLmxvZygnUmVjZWl2ZWQgU0VSVkVSIGNvbW1hbmQsIHdhaXRpbmcgZm9yIGZpcnN0IFBJTkcuLi4nKTtcblxuXHR0aGlzLnNlcnZlclByZWZpeCA9IHBhcnNlZE1lc3NhZ2UucHJlZml4O1xuXG5cdHRoaXMucmVnaXN0ZXJTdGVwcy5wdXNoKCdTRVJWRVInKTtcbn1cblxuZnVuY3Rpb24gUElORygpIHtcblx0aWYgKCF0aGlzLmlzUmVnaXN0ZXJlZCAmJiB0aGlzLnJlZ2lzdGVyU3RlcHMubGVuZ3RoID09PSAyKSB7XG5cdFx0dGhpcy5sb2coJ1JlY2VpdmVkIGZpcnN0IFBJTkcgY29tbWFuZCwgc2VydmVyIGlzIHJlZ2lzdGVyZWQhJyk7XG5cblx0XHR0aGlzLmlzUmVnaXN0ZXJlZCA9IHRydWU7XG5cblx0XHR0aGlzLmVtaXQoJ3JlZ2lzdGVyZWQnKTtcblx0fVxuXG5cdHRoaXMud3JpdGUoe1xuXHRcdHByZWZpeDogdGhpcy5jb25maWcuc2VydmVyLm5hbWUsXG5cdFx0Y29tbWFuZDogJ1BPTkcnLFxuXHRcdHBhcmFtZXRlcnM6IFt0aGlzLmNvbmZpZy5zZXJ2ZXIubmFtZV0sXG5cdH0pO1xufVxuXG5mdW5jdGlvbiBOSUNLKHBhcnNlZE1lc3NhZ2UpIHtcblx0bGV0IGNvbW1hbmQ7XG5cblx0Ly8gQ2hlY2sgaWYgdGhlIG1lc3NhZ2UgY29tZXMgZnJvbSB0aGUgc2VydmVyLFxuXHQvLyB3aGljaCBtZWFucyBpdCBpcyBhIG5ldyB1c2VyXG5cdGlmIChwYXJzZWRNZXNzYWdlLnByZWZpeCA9PT0gdGhpcy5zZXJ2ZXJQcmVmaXgpIHtcblx0XHRjb21tYW5kID0ge1xuXHRcdFx0aWRlbnRpZmllcjogJ3VzZXJSZWdpc3RlcmVkJyxcblx0XHRcdGFyZ3M6IHtcblx0XHRcdFx0bmljazogcGFyc2VkTWVzc2FnZS5hcmdzWzBdLFxuXHRcdFx0XHR1c2VybmFtZTogcGFyc2VkTWVzc2FnZS5hcmdzWzJdLFxuXHRcdFx0XHRob3N0OiBwYXJzZWRNZXNzYWdlLmFyZ3NbM10sXG5cdFx0XHRcdG5hbWU6IHBhcnNlZE1lc3NhZ2UuYXJnc1s2XSxcblx0XHRcdH0sXG5cdFx0fTtcblx0fSBlbHNlIHsgLy8gT3RoZXJ3aXNlLCBpdCBpcyBhIG5pY2sgY2hhbmdlXG5cdFx0Y29tbWFuZCA9IHtcblx0XHRcdGlkZW50aWZpZXI6ICduaWNrQ2hhbmdlZCcsXG5cdFx0XHRhcmdzOiB7XG5cdFx0XHRcdG5pY2s6IHBhcnNlZE1lc3NhZ2Uubmljayxcblx0XHRcdFx0bmV3TmljazogcGFyc2VkTWVzc2FnZS5hcmdzWzBdLFxuXHRcdFx0fSxcblx0XHR9O1xuXHR9XG5cblx0cmV0dXJuIGNvbW1hbmQ7XG59XG5cbmZ1bmN0aW9uIEpPSU4ocGFyc2VkTWVzc2FnZSkge1xuXHRjb25zdCBjb21tYW5kID0ge1xuXHRcdGlkZW50aWZpZXI6ICdqb2luZWRDaGFubmVsJyxcblx0XHRhcmdzOiB7XG5cdFx0XHRyb29tTmFtZTogcGFyc2VkTWVzc2FnZS5hcmdzWzBdLnN1YnN0cmluZygxKSxcblx0XHRcdG5pY2s6IHBhcnNlZE1lc3NhZ2UucHJlZml4LFxuXHRcdH0sXG5cdH07XG5cblx0cmV0dXJuIGNvbW1hbmQ7XG59XG5cbmZ1bmN0aW9uIFBBUlQocGFyc2VkTWVzc2FnZSkge1xuXHRjb25zdCBjb21tYW5kID0ge1xuXHRcdGlkZW50aWZpZXI6ICdsZWZ0Q2hhbm5lbCcsXG5cdFx0YXJnczoge1xuXHRcdFx0cm9vbU5hbWU6IHBhcnNlZE1lc3NhZ2UuYXJnc1swXS5zdWJzdHJpbmcoMSksXG5cdFx0XHRuaWNrOiBwYXJzZWRNZXNzYWdlLnByZWZpeCxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiBjb21tYW5kO1xufVxuXG5mdW5jdGlvbiBQUklWTVNHKHBhcnNlZE1lc3NhZ2UpIHtcblx0Y29uc3QgY29tbWFuZCA9IHtcblx0XHRpZGVudGlmaWVyOiAnc2VudE1lc3NhZ2UnLFxuXHRcdGFyZ3M6IHtcblx0XHRcdG5pY2s6IHBhcnNlZE1lc3NhZ2UucHJlZml4LFxuXHRcdFx0bWVzc2FnZTogcGFyc2VkTWVzc2FnZS5hcmdzWzFdLFxuXHRcdH0sXG5cdH07XG5cblx0aWYgKHBhcnNlZE1lc3NhZ2UuYXJnc1swXVswXSA9PT0gJyMnKSB7XG5cdFx0Y29tbWFuZC5hcmdzLnJvb21OYW1lID0gcGFyc2VkTWVzc2FnZS5hcmdzWzBdLnN1YnN0cmluZygxKTtcblx0fSBlbHNlIHtcblx0XHRjb21tYW5kLmFyZ3MucmVjaXBpZW50TmljayA9IHBhcnNlZE1lc3NhZ2UuYXJnc1swXTtcblx0fVxuXG5cdHJldHVybiBjb21tYW5kO1xufVxuXG5mdW5jdGlvbiBRVUlUKHBhcnNlZE1lc3NhZ2UpIHtcblx0Y29uc3QgY29tbWFuZCA9IHtcblx0XHRpZGVudGlmaWVyOiAnZGlzY29ubmVjdGVkJyxcblx0XHRhcmdzOiB7XG5cdFx0XHRuaWNrOiBwYXJzZWRNZXNzYWdlLnByZWZpeCxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiBjb21tYW5kO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7IFBBU1MsIFNFUlZFUiwgUElORywgTklDSywgSk9JTiwgUEFSVCwgUFJJVk1TRywgUVVJVCB9O1xuIl19
