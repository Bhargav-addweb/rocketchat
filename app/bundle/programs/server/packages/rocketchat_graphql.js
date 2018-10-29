(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;
var ECMAScript = Package.ecmascript.ECMAScript;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var exports, __g, __e;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:graphql":{"server":{"settings.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/settings.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.settings.addGroup('General', function () {
  this.section('GraphQL API', function () {
    this.add('Graphql_Enabled', false, {
      type: 'boolean',
      public: false
    });
    this.add('Graphql_CORS', true, {
      type: 'boolean',
      public: false,
      enableQuery: {
        _id: 'Graphql_Enabled',
        value: true
      }
    });
    this.add('Graphql_Subscription_Port', 3100, {
      type: 'int',
      public: false,
      enableQuery: {
        _id: 'Graphql_Enabled',
        value: true
      }
    });
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"api.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/api.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let graphqlExpress, graphiqlExpress;
module.watch(require("apollo-server-express"), {
  graphqlExpress(v) {
    graphqlExpress = v;
  },

  graphiqlExpress(v) {
    graphiqlExpress = v;
  }

}, 0);
let jsAccountsContext;
module.watch(require("@accounts/graphql-api"), {
  JSAccountsContext(v) {
    jsAccountsContext = v;
  }

}, 1);
let SubscriptionServer;
module.watch(require("subscriptions-transport-ws"), {
  SubscriptionServer(v) {
    SubscriptionServer = v;
  }

}, 2);
let execute, subscribe;
module.watch(require("graphql"), {
  execute(v) {
    execute = v;
  },

  subscribe(v) {
    subscribe = v;
  }

}, 3);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 4);
let WebApp;
module.watch(require("meteor/webapp"), {
  WebApp(v) {
    WebApp = v;
  }

}, 5);
let bodyParser;
module.watch(require("body-parser"), {
  default(v) {
    bodyParser = v;
  }

}, 6);
let express;
module.watch(require("express"), {
  default(v) {
    express = v;
  }

}, 7);
let cors;
module.watch(require("cors"), {
  default(v) {
    cors = v;
  }

}, 8);
let executableSchema;
module.watch(require("./schema"), {
  executableSchema(v) {
    executableSchema = v;
  }

}, 9);
const subscriptionPort = RocketChat.settings.get('Graphql_Subscription_Port') || 3100; // the Meteor GraphQL server is an Express server

const graphQLServer = express();

if (RocketChat.settings.get('Graphql_CORS')) {
  graphQLServer.use(cors());
}

graphQLServer.use('/api/graphql', (req, res, next) => {
  if (RocketChat.settings.get('Graphql_Enabled')) {
    next();
  } else {
    res.status(400).send('Graphql is not enabled in this server');
  }
});
graphQLServer.use('/api/graphql', bodyParser.json(), graphqlExpress(request => ({
  schema: executableSchema,
  context: jsAccountsContext(request),
  formatError: e => ({
    message: e.message,
    locations: e.locations,
    path: e.path
  }),
  debug: Meteor.isDevelopment
})));
graphQLServer.use('/graphiql', graphiqlExpress({
  endpointURL: '/api/graphql',
  subscriptionsEndpoint: `ws://localhost:${subscriptionPort}`
}));

const startSubscriptionServer = () => {
  if (RocketChat.settings.get('Graphql_Enabled')) {
    SubscriptionServer.create({
      schema: executableSchema,
      execute,
      subscribe,
      onConnect: connectionParams => ({
        authToken: connectionParams.Authorization
      })
    }, {
      port: subscriptionPort,
      host: process.env.BIND_IP || '0.0.0.0'
    });
    console.log('GraphQL Subscription server runs on port:', subscriptionPort);
  }
};

WebApp.onListening(() => {
  startSubscriptionServer();
}); // this binds the specified paths to the Express server running Apollo + GraphiQL

WebApp.connectHandlers.use(graphQLServer);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"schema.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schema.js                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  executableSchema: () => executableSchema
});
let makeExecutableSchema;
module.watch(require("graphql-tools"), {
  makeExecutableSchema(v) {
    makeExecutableSchema = v;
  }

}, 0);
let mergeTypes, mergeResolvers;
module.watch(require("merge-graphql-schemas"), {
  mergeTypes(v) {
    mergeTypes = v;
  },

  mergeResolvers(v) {
    mergeResolvers = v;
  }

}, 1);
let channels;
module.watch(require("./resolvers/channels"), {
  "*"(v) {
    channels = v;
  }

}, 2);
let messages;
module.watch(require("./resolvers/messages"), {
  "*"(v) {
    messages = v;
  }

}, 3);
let accounts;
module.watch(require("./resolvers/accounts"), {
  "*"(v) {
    accounts = v;
  }

}, 4);
let users;
module.watch(require("./resolvers/users"), {
  "*"(v) {
    users = v;
  }

}, 5);
const schema = mergeTypes([channels.schema, messages.schema, accounts.schema, users.schema]);
const resolvers = mergeResolvers([channels.resolvers, messages.resolvers, accounts.resolvers, users.resolvers]);
const executableSchema = makeExecutableSchema({
  typeDefs: [schema],
  resolvers,
  logger: {
    log: e => console.log(e)
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"subscriptions.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/subscriptions.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  pubsub: () => pubsub
});
let PubSub;
module.watch(require("graphql-subscriptions"), {
  PubSub(v) {
    PubSub = v;
  }

}, 0);
const pubsub = new PubSub();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"helpers":{"authenticated.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/helpers/authenticated.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  authenticated: () => authenticated
});
let AccountsServer;
module.watch(require("meteor/rocketchat:accounts"), {
  AccountsServer(v) {
    AccountsServer = v;
  }

}, 0);

let _authenticated;

module.watch(require("../mocks/accounts/graphql-api"), {
  authenticated(v) {
    _authenticated = v;
  }

}, 1);

const authenticated = resolver => _authenticated(AccountsServer, resolver);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"dateToFloat.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/helpers/dateToFloat.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  dateToFloat: () => dateToFloat
});

function dateToFloat(date) {
  if (date) {
    return new Date(date).getTime();
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"mocks":{"accounts":{"graphql-api.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/mocks/accounts/graphql-api.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  authenticated: () => authenticated
});

const authenticated = (Accounts, func) => (root, args, context, info) => Promise.asyncApply(() => {
  const {
    authToken
  } = context;

  if (!authToken || authToken === '' || authToken === null) {
    throw new Error('Unable to find authorization token in request');
  }

  const userObject = Promise.await(Accounts.resumeSession(authToken));

  if (userObject === null) {
    throw new Error('Invalid or expired token!');
  }

  return Promise.await(func(root, args, Object.assign(context, {
    user: userObject
  }), info));
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"resolvers":{"accounts":{"OauthProvider-type.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/accounts/OauthProvider-type.js                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema
});
let schema;
module.watch(require("../../schemas/accounts/OauthProvider-type.graphqls"), {
  default(v) {
    schema = v;
  }

}, 0);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/accounts/index.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolvers: () => resolvers
});
let createJSAccountsGraphQL;
module.watch(require("@accounts/graphql-api"), {
  createJSAccountsGraphQL(v) {
    createJSAccountsGraphQL = v;
  }

}, 0);
let AccountsServer;
module.watch(require("meteor/rocketchat:accounts"), {
  AccountsServer(v) {
    AccountsServer = v;
  }

}, 1);
let mergeTypes, mergeResolvers;
module.watch(require("merge-graphql-schemas"), {
  mergeTypes(v) {
    mergeTypes = v;
  },

  mergeResolvers(v) {
    mergeResolvers = v;
  }

}, 2);
let oauthProviders;
module.watch(require("./oauthProviders"), {
  "*"(v) {
    oauthProviders = v;
  }

}, 3);
let OauthProviderType;
module.watch(require("./OauthProvider-type"), {
  "*"(v) {
    OauthProviderType = v;
  }

}, 4);
const accountsGraphQL = createJSAccountsGraphQL(AccountsServer);
const schema = mergeTypes([accountsGraphQL.schema, oauthProviders.schema, OauthProviderType.schema]);
const resolvers = mergeResolvers([accountsGraphQL.extendWithResolvers({}), oauthProviders.resolver]);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oauthProviders.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/accounts/oauthProviders.js                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
let HTTP;
module.watch(require("meteor/http"), {
  HTTP(v) {
    HTTP = v;
  }

}, 0);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
let schema;
module.watch(require("../../schemas/accounts/oauthProviders.graphqls"), {
  default(v) {
    schema = v;
  }

}, 2);

function isJSON(obj) {
  try {
    JSON.parse(obj);
    return true;
  } catch (e) {
    return false;
  }
}

const resolver = {
  Query: {
    oauthProviders: () => Promise.asyncApply(() => {
      // depends on rocketchat:grant package
      try {
        const result = HTTP.get(Meteor.absoluteUrl('_oauth_apps/providers')).content;

        if (isJSON(result)) {
          const providers = JSON.parse(result).data;
          return providers.map(name => ({
            name
          }));
        } else {
          throw new Error('Could not parse the result');
        }
      } catch (e) {
        throw new Error('rocketchat:grant not installed');
      }
    })
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"channels":{"Channel-type.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/channels/Channel-type.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
let property;
module.watch(require("lodash.property"), {
  default(v) {
    property = v;
  }

}, 1);
let schema;
module.watch(require("../../schemas/channels/Channel-type.graphqls"), {
  default(v) {
    schema = v;
  }

}, 2);
const resolver = {
  Channel: {
    id: property('_id'),
    name: (root, args, {
      user
    }) => {
      if (root.t === 'd') {
        return root.usernames.find(u => u !== user.username);
      }

      return root.name;
    },
    members: root => {
      const ids = RocketChat.models.Subscriptions.findByRoomIdWhenUserIdExists(root._id, {
        fields: {
          'u._id': 1
        }
      }).fetch().map(sub => sub.u._id);
      return RocketChat.models.Users.findByIds(ids).fetch();
    },
    owners: root => {
      // there might be no owner
      if (!root.u) {
        return;
      }

      return [RocketChat.models.Users.findOneByUsername(root.u.username)];
    },
    numberOfMembers: root => RocketChat.models.Subscriptions.findByRoomId(root._id).count(),
    numberOfMessages: property('msgs'),
    readOnly: root => root.ro === true,
    direct: root => root.t === 'd',
    privateChannel: root => root.t === 'p',
    favourite: (root, args, {
      user
    }) => {
      const room = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(root._id, user._id);
      return room && room.f === true;
    },
    unseenMessages: (root, args, {
      user
    }) => {
      const room = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(root._id, user._id);
      return (room || {}).unread;
    }
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ChannelFilter-input.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/channels/ChannelFilter-input.js                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema
});
let schema;
module.watch(require("../../schemas/channels/ChannelFilter-input.graphqls"), {
  default(v) {
    schema = v;
  }

}, 0);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ChannelNameAndDirect-input.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/channels/ChannelNameAndDirect-input.js                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema
});
let schema;
module.watch(require("../../schemas/channels/ChannelNameAndDirect-input.graphqls"), {
  default(v) {
    schema = v;
  }

}, 0);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ChannelSort-enum.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/channels/ChannelSort-enum.js                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema
});
let schema;
module.watch(require("../../schemas/channels/ChannelSort-enum.graphqls"), {
  default(v) {
    schema = v;
  }

}, 0);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Privacy-enum.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/channels/Privacy-enum.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema
});
let schema;
module.watch(require("../../schemas/channels/Privacy-enum.graphqls"), {
  default(v) {
    schema = v;
  }

}, 0);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"channelByName.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/channels/channelByName.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
let authenticated;
module.watch(require("../../helpers/authenticated"), {
  authenticated(v) {
    authenticated = v;
  }

}, 1);
let roomPublicFields;
module.watch(require("./settings"), {
  roomPublicFields(v) {
    roomPublicFields = v;
  }

}, 2);
let schema;
module.watch(require("../../schemas/channels/channelByName.graphqls"), {
  default(v) {
    schema = v;
  }

}, 3);
const resolver = {
  Query: {
    channelByName: authenticated((root, {
      name
    }) => {
      const query = {
        name,
        t: 'c'
      };
      return RocketChat.models.Rooms.findOne(query, {
        fields: roomPublicFields
      });
    })
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"channels.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/channels/channels.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
let authenticated;
module.watch(require("../../helpers/authenticated"), {
  authenticated(v) {
    authenticated = v;
  }

}, 1);
let roomPublicFields;
module.watch(require("./settings"), {
  roomPublicFields(v) {
    roomPublicFields = v;
  }

}, 2);
let schema;
module.watch(require("../../schemas/channels/channels.graphqls"), {
  default(v) {
    schema = v;
  }

}, 3);
const resolver = {
  Query: {
    channels: authenticated((root, args) => {
      const query = {};
      const options = {
        sort: {
          name: 1
        },
        fields: roomPublicFields
      }; // Filter

      if (typeof args.filter !== 'undefined') {
        // nameFilter
        if (typeof args.filter.nameFilter !== undefined) {
          query.name = {
            $regex: new RegExp(args.filter.nameFilter, 'i')
          };
        } // sortBy


        if (args.filter.sortBy === 'NUMBER_OF_MESSAGES') {
          options.sort = {
            msgs: -1
          };
        } // privacy


        switch (args.filter.privacy) {
          case 'PRIVATE':
            query.t = 'p';
            break;

          case 'PUBLIC':
            query.t = {
              $ne: 'p'
            };
            break;
        }
      }

      return RocketChat.models.Rooms.find(query, options).fetch();
    })
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"channelsByUser.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/channels/channelsByUser.js                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
let authenticated;
module.watch(require("../../helpers/authenticated"), {
  authenticated(v) {
    authenticated = v;
  }

}, 1);
let roomPublicFields;
module.watch(require("./settings"), {
  roomPublicFields(v) {
    roomPublicFields = v;
  }

}, 2);
let schema;
module.watch(require("../../schemas/channels/channelsByUser.graphqls"), {
  default(v) {
    schema = v;
  }

}, 3);
const resolver = {
  Query: {
    channelsByUser: authenticated((root, {
      userId
    }) => {
      const user = RocketChat.models.Users.findOneById(userId);

      if (!user) {
        throw new Error('No user');
      }

      const roomIds = RocketChat.models.Subscriptions.findByUserId(userId, {
        fields: {
          rid: 1
        }
      }).fetch().map(s => s.rid);
      const rooms = RocketChat.models.Rooms.findByIds(roomIds, {
        sort: {
          name: 1
        },
        fields: roomPublicFields
      }).fetch();
      return rooms;
    })
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"createChannel.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/channels/createChannel.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
let authenticated;
module.watch(require("../../helpers/authenticated"), {
  authenticated(v) {
    authenticated = v;
  }

}, 1);
let schema;
module.watch(require("../../schemas/channels/createChannel.graphqls"), {
  default(v) {
    schema = v;
  }

}, 2);
const resolver = {
  Mutation: {
    createChannel: authenticated((root, args, {
      user
    }) => {
      try {
        RocketChat.API.channels.create.validate({
          user: {
            value: user._id
          },
          name: {
            value: args.name,
            key: 'name'
          },
          members: {
            value: args.membersId,
            key: 'membersId'
          }
        });
      } catch (e) {
        throw e;
      }

      const {
        channel
      } = RocketChat.API.channels.create.execute(user._id, {
        name: args.name,
        members: args.membersId
      });
      return channel;
    })
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"directChannel.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/channels/directChannel.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
let authenticated;
module.watch(require("../../helpers/authenticated"), {
  authenticated(v) {
    authenticated = v;
  }

}, 1);
let roomPublicFields;
module.watch(require("./settings"), {
  roomPublicFields(v) {
    roomPublicFields = v;
  }

}, 2);
let schema;
module.watch(require("../../schemas/channels/directChannel.graphqls"), {
  default(v) {
    schema = v;
  }

}, 3);
const resolver = {
  Query: {
    directChannel: authenticated((root, {
      username,
      channelId
    }, {
      user
    }) => {
      const query = {
        t: 'd',
        usernames: user.username
      };

      if (typeof username !== 'undefined') {
        if (username === user.username) {
          throw new Error('You cannot specify your username');
        }

        query.usernames = {
          $all: [user.username, username]
        };
      } else if (typeof channelId !== 'undefined') {
        query.id = channelId;
      } else {
        throw new Error('Use one of those fields: username, channelId');
      }

      return RocketChat.models.Rooms.findOne(query, {
        fields: roomPublicFields
      });
    })
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"hideChannel.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/channels/hideChannel.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
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
let authenticated;
module.watch(require("../../helpers/authenticated"), {
  authenticated(v) {
    authenticated = v;
  }

}, 2);
let schema;
module.watch(require("../../schemas/channels/hideChannel.graphqls"), {
  default(v) {
    schema = v;
  }

}, 3);
const resolver = {
  Mutation: {
    hideChannel: authenticated((root, args, {
      user
    }) => {
      const channel = RocketChat.models.Rooms.findOne({
        _id: args.channelId,
        t: 'c'
      });

      if (!channel) {
        throw new Error('error-room-not-found', 'The required "channelId" param provided does not match any channel');
      }

      const sub = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(channel._id, user._id);

      if (!sub) {
        throw new Error(`The user/callee is not in the channel "${channel.name}.`);
      }

      if (!sub.open) {
        throw new Error(`The channel, ${channel.name}, is already closed to the sender`);
      }

      Meteor.runAsUser(user._id, () => {
        Meteor.call('hideRoom', channel._id);
      });
      return true;
    })
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/channels/index.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolvers: () => resolvers
});
let mergeTypes, mergeResolvers;
module.watch(require("merge-graphql-schemas"), {
  mergeTypes(v) {
    mergeTypes = v;
  },

  mergeResolvers(v) {
    mergeResolvers = v;
  }

}, 0);
let channels;
module.watch(require("./channels"), {
  "*"(v) {
    channels = v;
  }

}, 1);
let channelByName;
module.watch(require("./channelByName"), {
  "*"(v) {
    channelByName = v;
  }

}, 2);
let directChannel;
module.watch(require("./directChannel"), {
  "*"(v) {
    directChannel = v;
  }

}, 3);
let channelsByUser;
module.watch(require("./channelsByUser"), {
  "*"(v) {
    channelsByUser = v;
  }

}, 4);
let createChannel;
module.watch(require("./createChannel"), {
  "*"(v) {
    createChannel = v;
  }

}, 5);
let leaveChannel;
module.watch(require("./leaveChannel"), {
  "*"(v) {
    leaveChannel = v;
  }

}, 6);
let hideChannel;
module.watch(require("./hideChannel"), {
  "*"(v) {
    hideChannel = v;
  }

}, 7);
let ChannelType;
module.watch(require("./Channel-type"), {
  "*"(v) {
    ChannelType = v;
  }

}, 8);
let ChannelSort;
module.watch(require("./ChannelSort-enum"), {
  "*"(v) {
    ChannelSort = v;
  }

}, 9);
let ChannelFilter;
module.watch(require("./ChannelFilter-input"), {
  "*"(v) {
    ChannelFilter = v;
  }

}, 10);
let Privacy;
module.watch(require("./Privacy-enum"), {
  "*"(v) {
    Privacy = v;
  }

}, 11);
let ChannelNameAndDirect;
module.watch(require("./ChannelNameAndDirect-input"), {
  "*"(v) {
    ChannelNameAndDirect = v;
  }

}, 12);
const schema = mergeTypes([// queries
channels.schema, channelByName.schema, directChannel.schema, channelsByUser.schema, // mutations
createChannel.schema, leaveChannel.schema, hideChannel.schema, // types
ChannelType.schema, ChannelSort.schema, ChannelFilter.schema, Privacy.schema, ChannelNameAndDirect.schema]);
const resolvers = mergeResolvers([// queries
channels.resolver, channelByName.resolver, directChannel.resolver, channelsByUser.resolver, // mutations
createChannel.resolver, leaveChannel.resolver, hideChannel.resolver, // types
ChannelType.resolver]);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"leaveChannel.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/channels/leaveChannel.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
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
let authenticated;
module.watch(require("../../helpers/authenticated"), {
  authenticated(v) {
    authenticated = v;
  }

}, 2);
let schema;
module.watch(require("../../schemas/channels/leaveChannel.graphqls"), {
  default(v) {
    schema = v;
  }

}, 3);
const resolver = {
  Mutation: {
    leaveChannel: authenticated((root, args, {
      user
    }) => {
      const channel = RocketChat.models.Rooms.findOne({
        _id: args.channelId,
        t: 'c'
      });

      if (!channel) {
        throw new Error('error-room-not-found', 'The required "channelId" param provided does not match any channel');
      }

      Meteor.runAsUser(user._id, () => {
        Meteor.call('leaveRoom', channel._id);
      });
      return true;
    })
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/channels/settings.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  roomPublicFields: () => roomPublicFields
});
const roomPublicFields = {
  t: 1,
  name: 1,
  description: 1,
  announcement: 1,
  topic: 1,
  usernames: 1,
  msgs: 1,
  ro: 1,
  u: 1,
  archived: 1
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"messages":{"Message-type.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/messages/Message-type.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
let property;
module.watch(require("lodash.property"), {
  default(v) {
    property = v;
  }

}, 1);
let dateToFloat;
module.watch(require("../../helpers/dateToFloat"), {
  dateToFloat(v) {
    dateToFloat = v;
  }

}, 2);
let schema;
module.watch(require("../../schemas/messages/Message-type.graphqls"), {
  default(v) {
    schema = v;
  }

}, 3);
const resolver = {
  Message: {
    id: property('_id'),
    content: property('msg'),
    creationTime: root => dateToFloat(root.ts),
    author: root => {
      const user = RocketChat.models.Users.findOne(root.u._id);
      return user || root.u;
    },
    channel: root => RocketChat.models.Rooms.findOne(root.rid),
    fromServer: root => typeof root.t !== 'undefined',
    // on a message sent by user `true` otherwise `false`
    type: property('t'),
    channelRef: root => {
      if (!root.channels) {
        return;
      }

      return RocketChat.models.Rooms.find({
        _id: {
          $in: root.channels.map(c => c._id)
        }
      }, {
        sort: {
          name: 1
        }
      }).fetch();
    },
    userRef: root => {
      if (!root.mentions) {
        return;
      }

      return RocketChat.models.Users.find({
        _id: {
          $in: root.mentions.map(c => c._id)
        }
      }, {
        sort: {
          username: 1
        }
      }).fetch();
    },
    reactions: root => {
      if (!root.reactions || Object.keys(root.reactions).length === 0) {
        return;
      }

      const reactions = [];
      Object.keys(root.reactions).forEach(icon => {
        root.reactions[icon].usernames.forEach(username => {
          reactions.push({
            icon,
            username
          });
        });
      });
      return reactions;
    }
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"MessageIdentifier-input.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/messages/MessageIdentifier-input.js                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema
});
let schema;
module.watch(require("../../schemas/messages/MessageIdentifier-input.graphqls"), {
  default(v) {
    schema = v;
  }

}, 0);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"MessagesWithCursor-type.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/messages/MessagesWithCursor-type.js                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema
});
let schema;
module.watch(require("../../schemas/messages/MessagesWithCursor-type.graphqls"), {
  default(v) {
    schema = v;
  }

}, 0);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Reaction-type.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/messages/Reaction-type.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema
});
let schema;
module.watch(require("../../schemas/messages/Reaction-type.graphqls"), {
  default(v) {
    schema = v;
  }

}, 0);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"addReactionToMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/messages/addReactionToMessage.js                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
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
let authenticated;
module.watch(require("../../helpers/authenticated"), {
  authenticated(v) {
    authenticated = v;
  }

}, 2);
let schema;
module.watch(require("../../schemas/messages/addReactionToMessage.graphqls"), {
  default(v) {
    schema = v;
  }

}, 3);
const resolver = {
  Mutation: {
    addReactionToMessage: authenticated((root, {
      id,
      icon,
      shouldReact
    }, {
      user
    }) => new Promise(resolve => {
      Meteor.runAsUser(user._id, () => {
        Meteor.call('setReaction', icon, id.messageId, shouldReact, () => {
          resolve(RocketChat.models.Messages.findOne(id.messageId));
        });
      });
    }))
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"chatMessageAdded.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/messages/chatMessageAdded.js                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  CHAT_MESSAGE_SUBSCRIPTION_TOPIC: () => CHAT_MESSAGE_SUBSCRIPTION_TOPIC,
  publishMessage: () => publishMessage,
  schema: () => schema,
  resolver: () => resolver
});
let withFilter;
module.watch(require("graphql-subscriptions"), {
  withFilter(v) {
    withFilter = v;
  }

}, 0);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 1);
let pubsub;
module.watch(require("../../subscriptions"), {
  pubsub(v) {
    pubsub = v;
  }

}, 2);
let authenticated;
module.watch(require("../../helpers/authenticated"), {
  authenticated(v) {
    authenticated = v;
  }

}, 3);
let schema;
module.watch(require("../../schemas/messages/chatMessageAdded.graphqls"), {
  default(v) {
    schema = v;
  }

}, 4);
const CHAT_MESSAGE_SUBSCRIPTION_TOPIC = 'CHAT_MESSAGE_ADDED';

function publishMessage(message) {
  pubsub.publish(CHAT_MESSAGE_SUBSCRIPTION_TOPIC, {
    chatMessageAdded: message
  });
}

function shouldPublish(message, {
  id,
  directTo
}, username) {
  if (id) {
    return message.rid === id;
  } else if (directTo) {
    const room = RocketChat.models.Rooms.findOne({
      usernames: {
        $all: [directTo, username]
      },
      t: 'd'
    });
    return room && room._id === message.rid;
  }

  return false;
}

const resolver = {
  Subscription: {
    chatMessageAdded: {
      subscribe: withFilter(() => pubsub.asyncIterator(CHAT_MESSAGE_SUBSCRIPTION_TOPIC), authenticated((payload, args, {
        user
      }) => {
        const channel = {
          id: args.channelId,
          directTo: args.directTo
        };
        return shouldPublish(payload.chatMessageAdded, channel, user.username);
      }))
    }
  }
};
RocketChat.callbacks.add('afterSaveMessage', message => {
  publishMessage(message);
}, null, 'chatMessageAddedSubscription');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deleteMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/messages/deleteMessage.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
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
let authenticated;
module.watch(require("../../helpers/authenticated"), {
  authenticated(v) {
    authenticated = v;
  }

}, 2);
let schema;
module.watch(require("../../schemas/messages/deleteMessage.graphqls"), {
  default(v) {
    schema = v;
  }

}, 3);
const resolver = {
  Mutation: {
    deleteMessage: authenticated((root, {
      id
    }, {
      user
    }) => {
      const msg = RocketChat.models.Messages.findOneById(id.messageId, {
        fields: {
          u: 1,
          rid: 1
        }
      });

      if (!msg) {
        throw new Error(`No message found with the id of "${id.messageId}".`);
      }

      if (id.channelId !== msg.rid) {
        throw new Error('The room id provided does not match where the message is from.');
      }

      Meteor.runAsUser(user._id, () => {
        Meteor.call('deleteMessage', {
          _id: msg._id
        });
      });
      return msg;
    })
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"editMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/messages/editMessage.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
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
let authenticated;
module.watch(require("../../helpers/authenticated"), {
  authenticated(v) {
    authenticated = v;
  }

}, 2);
let schema;
module.watch(require("../../schemas/messages/editMessage.graphqls"), {
  default(v) {
    schema = v;
  }

}, 3);
const resolver = {
  Mutation: {
    editMessage: authenticated((root, {
      id,
      content
    }, {
      user
    }) => {
      const msg = RocketChat.models.Messages.findOneById(id.messageId); // Ensure the message exists

      if (!msg) {
        throw new Error(`No message found with the id of "${id.messageId}".`);
      }

      if (id.channelId !== msg.rid) {
        throw new Error('The channel id provided does not match where the message is from.');
      } // Permission checks are already done in the updateMessage method, so no need to duplicate them


      Meteor.runAsUser(user._id, () => {
        Meteor.call('updateMessage', {
          _id: msg._id,
          msg: content,
          rid: msg.rid
        });
      });
      return RocketChat.models.Messages.findOneById(msg._id);
    })
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/messages/index.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolvers: () => resolvers
});
let mergeTypes, mergeResolvers;
module.watch(require("merge-graphql-schemas"), {
  mergeTypes(v) {
    mergeTypes = v;
  },

  mergeResolvers(v) {
    mergeResolvers = v;
  }

}, 0);
let messages;
module.watch(require("./messages"), {
  "*"(v) {
    messages = v;
  }

}, 1);
let sendMessage;
module.watch(require("./sendMessage"), {
  "*"(v) {
    sendMessage = v;
  }

}, 2);
let editMessage;
module.watch(require("./editMessage"), {
  "*"(v) {
    editMessage = v;
  }

}, 3);
let deleteMessage;
module.watch(require("./deleteMessage"), {
  "*"(v) {
    deleteMessage = v;
  }

}, 4);
let addReactionToMessage;
module.watch(require("./addReactionToMessage"), {
  "*"(v) {
    addReactionToMessage = v;
  }

}, 5);
let chatMessageAdded;
module.watch(require("./chatMessageAdded"), {
  "*"(v) {
    chatMessageAdded = v;
  }

}, 6);
let MessageType;
module.watch(require("./Message-type"), {
  "*"(v) {
    MessageType = v;
  }

}, 7);
let MessagesWithCursorType;
module.watch(require("./MessagesWithCursor-type"), {
  "*"(v) {
    MessagesWithCursorType = v;
  }

}, 8);
let MessageIdentifier;
module.watch(require("./MessageIdentifier-input"), {
  "*"(v) {
    MessageIdentifier = v;
  }

}, 9);
let ReactionType;
module.watch(require("./Reaction-type"), {
  "*"(v) {
    ReactionType = v;
  }

}, 10);
const schema = mergeTypes([// queries
messages.schema, // mutations
sendMessage.schema, editMessage.schema, deleteMessage.schema, addReactionToMessage.schema, // subscriptions
chatMessageAdded.schema, // types
MessageType.schema, MessagesWithCursorType.schema, MessageIdentifier.schema, ReactionType.schema]);
const resolvers = mergeResolvers([// queries
messages.resolver, // mutations
sendMessage.resolver, editMessage.resolver, deleteMessage.resolver, addReactionToMessage.resolver, // subscriptions
chatMessageAdded.resolver, // types
MessageType.resolver]);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"messages.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/messages/messages.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
let authenticated;
module.watch(require("../../helpers/authenticated"), {
  authenticated(v) {
    authenticated = v;
  }

}, 1);
let schema;
module.watch(require("../../schemas/messages/messages.graphqls"), {
  default(v) {
    schema = v;
  }

}, 2);
const resolver = {
  Query: {
    messages: authenticated((root, args, {
      user
    }) => {
      const messagesQuery = {};
      const messagesOptions = {
        sort: {
          ts: -1
        }
      };
      const channelQuery = {};
      const isPagination = !!args.cursor || args.count > 0;
      let cursor;

      if (args.channelId) {
        // channelId
        channelQuery._id = args.channelId;
      } else if (args.directTo) {
        // direct message where directTo is a user id
        channelQuery.t = 'd';
        channelQuery.usernames = {
          $all: [args.directTo, user.username]
        };
      } else if (args.channelName) {
        // non-direct channel
        channelQuery.t = {
          $ne: 'd'
        };
        channelQuery.name = args.channelName;
      } else {
        console.error('messages query must be called with channelId or directTo');
        return null;
      }

      const channel = RocketChat.models.Rooms.findOne(channelQuery);
      let messagesArray = [];

      if (channel) {
        // cursor
        if (isPagination && args.cursor) {
          const cursorMsg = RocketChat.models.Messages.findOne(args.cursor, {
            fields: {
              ts: 1
            }
          });
          messagesQuery.ts = {
            $lt: cursorMsg.ts
          };
        } // search


        if (typeof args.searchRegex === 'string') {
          messagesQuery.msg = {
            $regex: new RegExp(args.searchRegex, 'i')
          };
        } // count


        if (isPagination && args.count) {
          messagesOptions.limit = args.count;
        } // exclude messages generated by server


        if (args.excludeServer === true) {
          messagesQuery.t = {
            $exists: false
          };
        } // look for messages that belongs to specific channel


        messagesQuery.rid = channel._id;
        const messages = RocketChat.models.Messages.find(messagesQuery, messagesOptions);
        messagesArray = messages.fetch();

        if (isPagination) {
          // oldest first (because of findOne)
          messagesOptions.sort.ts = 1;
          const firstMessage = RocketChat.models.Messages.findOne(messagesQuery, messagesOptions);
          const lastId = (messagesArray[messagesArray.length - 1] || {})._id;
          cursor = !lastId || lastId === firstMessage._id ? null : lastId;
        }
      }

      return {
        cursor,
        channel,
        messagesArray
      };
    })
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/messages/sendMessage.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
let authenticated;
module.watch(require("../../helpers/authenticated"), {
  authenticated(v) {
    authenticated = v;
  }

}, 0);
let schema;
module.watch(require("../../schemas/messages/sendMessage.graphqls"), {
  default(v) {
    schema = v;
  }

}, 1);
const resolver = {
  Mutation: {
    sendMessage: authenticated((root, {
      channelId,
      directTo,
      content
    }, {
      user
    }) => {
      const options = {
        text: content,
        channel: channelId || directTo
      };
      const messageReturn = processWebhookMessage(options, user)[0];

      if (!messageReturn) {
        throw new Error('Unknown error');
      }

      return messageReturn.message;
    })
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"users":{"User-type.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/users/User-type.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
let property;
module.watch(require("lodash.property"), {
  default(v) {
    property = v;
  }

}, 1);
let schema;
module.watch(require("../../schemas/users/User-type.graphqls"), {
  default(v) {
    schema = v;
  }

}, 2);
const resolver = {
  User: {
    id: property('_id'),
    status: ({
      status
    }) => status.toUpperCase(),
    avatar: ({
      _id
    }) => Promise.asyncApply(() => {
      // XXX js-accounts/graphql#16
      const avatar = Promise.await(RocketChat.models.Avatars.model.rawCollection().findOne({
        userId: _id
      }, {
        fields: {
          url: 1
        }
      }));

      if (avatar) {
        return avatar.url;
      }
    }),
    channels: Meteor.bindEnvironment(({
      _id
    }) => Promise.asyncApply(() => Promise.await(RocketChat.models.Rooms.findBySubscriptionUserId(_id).fetch()))),
    directMessages: ({
      username
    }) => RocketChat.models.Rooms.findDirectRoomContainingUsername(username).fetch()
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"UserStatus-enum.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/users/UserStatus-enum.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema
});
let schema;
module.watch(require("../../schemas/users/UserStatus-enum.graphqls"), {
  default(v) {
    schema = v;
  }

}, 0);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/users/index.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolvers: () => resolvers
});
let mergeTypes, mergeResolvers;
module.watch(require("merge-graphql-schemas"), {
  mergeTypes(v) {
    mergeTypes = v;
  },

  mergeResolvers(v) {
    mergeResolvers = v;
  }

}, 0);
let setStatus;
module.watch(require("./setStatus"), {
  "*"(v) {
    setStatus = v;
  }

}, 1);
let UserType;
module.watch(require("./User-type"), {
  "*"(v) {
    UserType = v;
  }

}, 2);
let UserStatus;
module.watch(require("./UserStatus-enum"), {
  "*"(v) {
    UserStatus = v;
  }

}, 3);
const schema = mergeTypes([// mutations
setStatus.schema, // types
UserType.schema, UserStatus.schema]);
const resolvers = mergeResolvers([// mutations
setStatus.resolver, // types
UserType.resolver]);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setStatus.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/resolvers/users/setStatus.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  schema: () => schema,
  resolver: () => resolver
});
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
let authenticated;
module.watch(require("../../helpers/authenticated"), {
  authenticated(v) {
    authenticated = v;
  }

}, 1);
let schema;
module.watch(require("../../schemas/users/setStatus.graphqls"), {
  default(v) {
    schema = v;
  }

}, 2);
const resolver = {
  Mutation: {
    setStatus: authenticated((root, {
      status
    }, {
      user
    }) => {
      RocketChat.models.Users.update(user._id, {
        $set: {
          status: status.toLowerCase()
        }
      });
      return RocketChat.models.Users.findOne(user._id);
    })
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"schemas":{"accounts":{"OauthProvider-type.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/accounts/OauthProvider-type.graphqls                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./OauthProvider-type.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"OauthProvider-type.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/accounts/OauthProvider-type.graphqls.js                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"OauthProvider"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"name"},"arguments":[],"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"directives":[]}]}],"loc":{"start":0,"end":38}};
    doc.loc.source = {"body":"type OauthProvider {\n  name: String!\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oauthProviders.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/accounts/oauthProviders.graphqls                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./oauthProviders.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oauthProviders.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/accounts/oauthProviders.graphqls.js                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Query"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"oauthProviders"},"arguments":[],"type":{"kind":"ListType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OauthProvider"}}},"directives":[]}]}],"loc":{"start":0,"end":48}};
    doc.loc.source = {"body":"type Query {\n  oauthProviders: [OauthProvider]\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"channels":{"Channel-type.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/channels/Channel-type.graphqls                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./Channel-type.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Channel-type.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/channels/Channel-type.graphqls.js                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Channel"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"id"},"arguments":[],"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"name"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"description"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"announcement"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"topic"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"members"},"arguments":[],"type":{"kind":"ListType","type":{"kind":"NamedType","name":{"kind":"Name","value":"User"}}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"owners"},"arguments":[],"type":{"kind":"ListType","type":{"kind":"NamedType","name":{"kind":"Name","value":"User"}}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"numberOfMembers"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"numberOfMessages"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"readOnly"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"direct"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"privateChannel"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"favourite"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"unseenMessages"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"directives":[]}]}],"loc":{"start":0,"end":282}};
    doc.loc.source = {"body":"type Channel {\n \tid: String!\n\tname: String\n\tdescription: String\n\tannouncement: String\n\ttopic: String\n\tmembers: [User]\n\towners: [User]\n\tnumberOfMembers: Int\n\tnumberOfMessages: Int\n\treadOnly: Boolean\n\tdirect: Boolean\n\tprivateChannel: Boolean\n\tfavourite: Boolean\n\tunseenMessages: Int\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ChannelFilter-input.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/channels/ChannelFilter-input.graphqls                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./ChannelFilter-input.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ChannelFilter-input.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/channels/ChannelFilter-input.graphqls.js                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"InputObjectTypeDefinition","name":{"kind":"Name","value":"ChannelFilter"},"directives":[],"fields":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"nameFilter"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"privacy"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Privacy"}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"joinedChannels"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"sortBy"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ChannelSort"}},"directives":[]}]}],"loc":{"start":0,"end":107}};
    doc.loc.source = {"body":"input ChannelFilter {\n\tnameFilter: String\n\tprivacy: Privacy\n\tjoinedChannels: Boolean\n\tsortBy: ChannelSort\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ChannelNameAndDirect-input.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/channels/ChannelNameAndDirect-input.graphqls                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./ChannelNameAndDirect-input.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ChannelNameAndDirect-input.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/channels/ChannelNameAndDirect-input.graphqls.js                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"InputObjectTypeDefinition","name":{"kind":"Name","value":"ChannelNameAndDirect"},"directives":[],"fields":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"name"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"direct"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"directives":[]}]}],"loc":{"start":0,"end":63}};
    doc.loc.source = {"body":"input ChannelNameAndDirect {\n\tname: String!\n\tdirect: Boolean!\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ChannelSort-enum.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/channels/ChannelSort-enum.graphqls                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./ChannelSort-enum.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ChannelSort-enum.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/channels/ChannelSort-enum.graphqls.js                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"EnumTypeDefinition","name":{"kind":"Name","value":"ChannelSort"},"directives":[],"values":[{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"NAME"},"directives":[]},{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"NUMBER_OF_MESSAGES"},"directives":[]}]}],"loc":{"start":0,"end":46}};
    doc.loc.source = {"body":"enum ChannelSort {\n\tNAME\n\tNUMBER_OF_MESSAGES\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Privacy-enum.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/channels/Privacy-enum.graphqls                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./Privacy-enum.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Privacy-enum.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/channels/Privacy-enum.graphqls.js                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"EnumTypeDefinition","name":{"kind":"Name","value":"Privacy"},"directives":[],"values":[{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"PRIVATE"},"directives":[]},{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"PUBLIC"},"directives":[]},{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"ALL"},"directives":[]}]}],"loc":{"start":0,"end":38}};
    doc.loc.source = {"body":"enum Privacy {\n\tPRIVATE\n\tPUBLIC\n\tALL\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"channelByName.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/channels/channelByName.graphqls                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./channelByName.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"channelByName.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/channels/channelByName.graphqls.js                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Query"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"channelByName"},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"name"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"directives":[]}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Channel"}},"directives":[]}]}],"loc":{"start":0,"end":53}};
    doc.loc.source = {"body":"type Query {\n\tchannelByName(name: String!): Channel\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"channels.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/channels/channels.graphqls                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./channels.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"channels.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/channels/channels.graphqls.js                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Query"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"channels"},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"filter"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ChannelFilter"}},"defaultValue":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"privacy"},"value":{"kind":"EnumValue","value":"ALL"}},{"kind":"ObjectField","name":{"kind":"Name","value":"joinedChannels"},"value":{"kind":"BooleanValue","value":false}},{"kind":"ObjectField","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"EnumValue","value":"NAME"}}]},"directives":[]}],"type":{"kind":"ListType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Channel"}}},"directives":[]}]}],"loc":{"start":0,"end":121}};
    doc.loc.source = {"body":"type Query {\n\tchannels(filter: ChannelFilter = {\n\t\tprivacy: ALL,\n\t\tjoinedChannels: false,\n\t\tsortBy: NAME\n\t}): [Channel]\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"channelsByUser.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/channels/channelsByUser.graphqls                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./channelsByUser.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"channelsByUser.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/channels/channelsByUser.graphqls.js                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Query"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"channelsByUser"},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"userId"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"directives":[]}],"type":{"kind":"ListType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Channel"}}},"directives":[]}]}],"loc":{"start":0,"end":58}};
    doc.loc.source = {"body":"type Query {\n\tchannelsByUser(userId: String!): [Channel]\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"createChannel.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/channels/createChannel.graphqls                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./createChannel.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"createChannel.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/channels/createChannel.graphqls.js                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Mutation"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"createChannel"},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"name"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"private"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}},"defaultValue":{"kind":"BooleanValue","value":false},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"readOnly"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}},"defaultValue":{"kind":"BooleanValue","value":false},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"membersId"},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},"directives":[]}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Channel"}},"directives":[]}]}],"loc":{"start":0,"end":142}};
    doc.loc.source = {"body":"type Mutation {\n\tcreateChannel(\n\t\tname: String!,\n\t\tprivate: Boolean = false,\n\t\treadOnly: Boolean = false,\n\t\tmembersId: [String!]\n\t): Channel\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"directChannel.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/channels/directChannel.graphqls                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./directChannel.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"directChannel.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/channels/directChannel.graphqls.js                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Query"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"directChannel"},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"username"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"channelId"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Channel"}},"directives":[]}]}],"loc":{"start":0,"end":75}};
    doc.loc.source = {"body":"type Query {\n\tdirectChannel(username: String, channelId: String): Channel\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"hideChannel.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/channels/hideChannel.graphqls                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./hideChannel.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"hideChannel.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/channels/hideChannel.graphqls.js                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Mutation"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"hideChannel"},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"channelId"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"directives":[]}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}},"directives":[]}]}],"loc":{"start":0,"end":59}};
    doc.loc.source = {"body":"type Mutation {\n\thideChannel(channelId: String!): Boolean\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"leaveChannel.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/channels/leaveChannel.graphqls                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./leaveChannel.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"leaveChannel.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/channels/leaveChannel.graphqls.js                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Mutation"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"leaveChannel"},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"channelId"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"directives":[]}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}},"directives":[]}]}],"loc":{"start":0,"end":60}};
    doc.loc.source = {"body":"type Mutation {\n\tleaveChannel(channelId: String!): Boolean\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"messages":{"Message-type.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/messages/Message-type.graphqls                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./Message-type.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Message-type.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/messages/Message-type.graphqls.js                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Message"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"id"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"author"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"content"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"channel"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Channel"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"creationTime"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"fromServer"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"type"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"userRef"},"arguments":[],"type":{"kind":"ListType","type":{"kind":"NamedType","name":{"kind":"Name","value":"User"}}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"channelRef"},"arguments":[],"type":{"kind":"ListType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Channel"}}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"reactions"},"arguments":[],"type":{"kind":"ListType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Reaction"}}},"directives":[]}]}],"loc":{"start":0,"end":304}};
    doc.loc.source = {"body":"type Message {\n\tid: String\n\tauthor: User\n\tcontent: String\n\tchannel: Channel\n\tcreationTime: Float\n\t# Message sent by server e.g. User joined channel\n\tfromServer: Boolean\n\ttype: String\n\t# List of mentioned users\n\tuserRef: [User]\n\t# list of mentioned channels\n\tchannelRef: [Channel]\n\treactions: [Reaction]\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"MessageIdentifier-input.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/messages/MessageIdentifier-input.graphqls                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./MessageIdentifier-input.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"MessageIdentifier-input.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/messages/MessageIdentifier-input.graphqls.js                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"InputObjectTypeDefinition","name":{"kind":"Name","value":"MessageIdentifier"},"directives":[],"fields":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"channelId"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"messageId"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"directives":[]}]}],"loc":{"start":0,"end":67}};
    doc.loc.source = {"body":"input MessageIdentifier {\n\tchannelId: String!\n\tmessageId: String!\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"MessagesWithCursor-type.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/messages/MessagesWithCursor-type.graphqls                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./MessagesWithCursor-type.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"MessagesWithCursor-type.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/messages/MessagesWithCursor-type.graphqls.js                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"MessagesWithCursor"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"cursor"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"channel"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Channel"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"messagesArray"},"arguments":[],"type":{"kind":"ListType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}}},"directives":[]}]}],"loc":{"start":0,"end":87}};
    doc.loc.source = {"body":"type MessagesWithCursor {\n\tcursor: String\n\tchannel: Channel\n\tmessagesArray: [Message]\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Reaction-type.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/messages/Reaction-type.graphqls                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./Reaction-type.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Reaction-type.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/messages/Reaction-type.graphqls.js                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Reaction"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"username"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"icon"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]}]}],"loc":{"start":0,"end":49}};
    doc.loc.source = {"body":"type Reaction {\n\tusername: String\n\ticon: String\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"addReactionToMessage.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/messages/addReactionToMessage.graphqls                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./addReactionToMessage.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"addReactionToMessage.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/messages/addReactionToMessage.graphqls.js                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Mutation"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"addReactionToMessage"},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"id"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MessageIdentifier"}}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"icon"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"shouldReact"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}},"directives":[]}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"directives":[]}]}],"loc":{"start":0,"end":109}};
    doc.loc.source = {"body":"type Mutation {\n\taddReactionToMessage(id: MessageIdentifier!, icon: String!, shouldReact: Boolean): Message\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"chatMessageAdded.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/messages/chatMessageAdded.graphqls                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./chatMessageAdded.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"chatMessageAdded.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/messages/chatMessageAdded.graphqls.js                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Subscription"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"chatMessageAdded"},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"channelId"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"directTo"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"directives":[]}]}],"loc":{"start":0,"end":86}};
    doc.loc.source = {"body":"type Subscription {\n  chatMessageAdded(channelId: String, directTo: String): Message\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deleteMessage.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/messages/deleteMessage.graphqls                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./deleteMessage.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deleteMessage.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/messages/deleteMessage.graphqls.js                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Mutation"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"deleteMessage"},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"id"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MessageIdentifier"}}},"directives":[]}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"directives":[]}]}],"loc":{"start":0,"end":65}};
    doc.loc.source = {"body":"type Mutation {\n\tdeleteMessage(id: MessageIdentifier!): Message\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"editMessage.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/messages/editMessage.graphqls                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./editMessage.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"editMessage.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/messages/editMessage.graphqls.js                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Mutation"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"editMessage"},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"id"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MessageIdentifier"}}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"content"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"directives":[]}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"directives":[]}]}],"loc":{"start":0,"end":81}};
    doc.loc.source = {"body":"type Mutation {\n\teditMessage(id: MessageIdentifier!, content: String!): Message\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"messages.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/messages/messages.graphqls                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./messages.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"messages.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/messages/messages.graphqls.js                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Query"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"messages"},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"channelId"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"channelName"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"directTo"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"cursor"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"count"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"searchRegex"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"excludeServer"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}},"directives":[]}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"MessagesWithCursor"}},"directives":[]}]}],"loc":{"start":0,"end":192}};
    doc.loc.source = {"body":"type Query {\n\tmessages(\n\t\tchannelId: String,\n\t\tchannelName: String,\n\t\tdirectTo: String,\n\t\tcursor: String,\n\t\tcount: Int,\n\t\tsearchRegex: String,\n\t\texcludeServer: Boolean\n\t): MessagesWithCursor\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendMessage.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/messages/sendMessage.graphqls                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./sendMessage.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sendMessage.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/messages/sendMessage.graphqls.js                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Mutation"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"sendMessage"},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"channelId"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"directTo"},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"InputValueDefinition","name":{"kind":"Name","value":"content"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},"directives":[]}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Message"}},"directives":[]}]}],"loc":{"start":0,"end":94}};
    doc.loc.source = {"body":"type Mutation {\n\tsendMessage(channelId: String, directTo: String, content: String!): Message\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"users":{"User-type.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/users/User-type.graphqls                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./User-type.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"User-type.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/users/User-type.graphqls.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeExtension","name":{"kind":"Name","value":"User"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"status"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"UserStatus"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"avatar"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"name"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"lastLogin"},"arguments":[],"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"channels"},"arguments":[],"type":{"kind":"ListType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Channel"}}},"directives":[]},{"kind":"FieldDefinition","name":{"kind":"Name","value":"directMessages"},"arguments":[],"type":{"kind":"ListType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Channel"}}},"directives":[]}]}],"loc":{"start":0,"end":137}};
    doc.loc.source = {"body":"extend type User {\n\tstatus: UserStatus\n\tavatar: String\n\tname: String\n\tlastLogin: String\n\tchannels: [Channel]\n\tdirectMessages: [Channel]\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"UserStatus-enum.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/users/UserStatus-enum.graphqls                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./UserStatus-enum.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"UserStatus-enum.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/users/UserStatus-enum.graphqls.js                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"EnumTypeDefinition","name":{"kind":"Name","value":"UserStatus"},"directives":[],"values":[{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"ONLINE"},"directives":[]},{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"AWAY"},"directives":[]},{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"BUSY"},"directives":[]},{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"INVISIBLE"},"directives":[]},{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"OFFLINE"},"directives":[]}]}],"loc":{"start":0,"end":59}};
    doc.loc.source = {"body":"enum UserStatus {\n\tONLINE\n\tAWAY\n\tBUSY\n\tINVISIBLE\n\tOFFLINE\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setStatus.graphqls":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/server/schemas/users/setStatus.graphqls                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./setStatus.graphqls.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"setStatus.graphqls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_graphql/server/schemas/users/setStatus.graphqls.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

    var doc = {"kind":"Document","definitions":[{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Mutation"},"interfaces":[],"directives":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"setStatus"},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"status"},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserStatus"}}},"directives":[]}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"directives":[]}]}],"loc":{"start":0,"end":55}};
    doc.loc.source = {"body":"type Mutation {\n\tsetStatus(status: UserStatus!): User\n}","name":"GraphQL request","locationOffset":{"line":1,"column":1}};
  

    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  

      module.exports = doc;
    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}},"node_modules":{"apollo-server-express":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/apollo-server-express/package.json                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "apollo-server-express";
exports.version = "1.3.6";
exports.main = "dist/index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"dist":{"index.js":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/apollo-server-express/dist/index.js                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var expressApollo_1 = require("./expressApollo");
exports.graphqlExpress = expressApollo_1.graphqlExpress;
exports.graphiqlExpress = expressApollo_1.graphiqlExpress;
var connectApollo_1 = require("./connectApollo");
exports.graphqlConnect = connectApollo_1.graphqlConnect;
exports.graphiqlConnect = connectApollo_1.graphiqlConnect;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"@accounts":{"graphql-api":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/@accounts/graphql-api/package.json                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "@accounts/graphql-api";
exports.version = "0.2.3";
exports.main = "lib/index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/@accounts/graphql-api/lib/index.js                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var schema_builder_1 = require("./schema-builder");
exports.createJSAccountsGraphQL = schema_builder_1.createJSAccountsGraphQL;
var authenticated_resolver_1 = require("./utils/authenticated-resolver");
exports.authenticated = authenticated_resolver_1.authenticated;
var context_builder_1 = require("./utils/context-builder");
exports.JSAccountsContext = context_builder_1.JSAccountsContext;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}},"subscriptions-transport-ws":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/subscriptions-transport-ws/package.json                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "subscriptions-transport-ws";
exports.version = "0.9.11";
exports.main = "dist/index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"dist":{"index.js":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/subscriptions-transport-ws/dist/index.js                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./client"));
__export(require("./server"));
__export(require("./message-types"));
__export(require("./protocol"));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"graphql":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/graphql/package.json                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "graphql";
exports.version = "0.13.2";
exports.main = "index";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/graphql/index.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _graphql = require('./graphql');

Object.defineProperty(exports, 'graphql', {
  enumerable: true,
  get: function get() {
    return _graphql.graphql;
  }
});
Object.defineProperty(exports, 'graphqlSync', {
  enumerable: true,
  get: function get() {
    return _graphql.graphqlSync;
  }
});

var _type = require('./type');

Object.defineProperty(exports, 'GraphQLSchema', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLSchema;
  }
});
Object.defineProperty(exports, 'GraphQLScalarType', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLScalarType;
  }
});
Object.defineProperty(exports, 'GraphQLObjectType', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLObjectType;
  }
});
Object.defineProperty(exports, 'GraphQLInterfaceType', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLInterfaceType;
  }
});
Object.defineProperty(exports, 'GraphQLUnionType', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLUnionType;
  }
});
Object.defineProperty(exports, 'GraphQLEnumType', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLEnumType;
  }
});
Object.defineProperty(exports, 'GraphQLInputObjectType', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLInputObjectType;
  }
});
Object.defineProperty(exports, 'GraphQLList', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLList;
  }
});
Object.defineProperty(exports, 'GraphQLNonNull', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLNonNull;
  }
});
Object.defineProperty(exports, 'GraphQLDirective', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLDirective;
  }
});
Object.defineProperty(exports, 'TypeKind', {
  enumerable: true,
  get: function get() {
    return _type.TypeKind;
  }
});
Object.defineProperty(exports, 'specifiedScalarTypes', {
  enumerable: true,
  get: function get() {
    return _type.specifiedScalarTypes;
  }
});
Object.defineProperty(exports, 'GraphQLInt', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLInt;
  }
});
Object.defineProperty(exports, 'GraphQLFloat', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLFloat;
  }
});
Object.defineProperty(exports, 'GraphQLString', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLString;
  }
});
Object.defineProperty(exports, 'GraphQLBoolean', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLBoolean;
  }
});
Object.defineProperty(exports, 'GraphQLID', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLID;
  }
});
Object.defineProperty(exports, 'specifiedDirectives', {
  enumerable: true,
  get: function get() {
    return _type.specifiedDirectives;
  }
});
Object.defineProperty(exports, 'GraphQLIncludeDirective', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLIncludeDirective;
  }
});
Object.defineProperty(exports, 'GraphQLSkipDirective', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLSkipDirective;
  }
});
Object.defineProperty(exports, 'GraphQLDeprecatedDirective', {
  enumerable: true,
  get: function get() {
    return _type.GraphQLDeprecatedDirective;
  }
});
Object.defineProperty(exports, 'DEFAULT_DEPRECATION_REASON', {
  enumerable: true,
  get: function get() {
    return _type.DEFAULT_DEPRECATION_REASON;
  }
});
Object.defineProperty(exports, 'SchemaMetaFieldDef', {
  enumerable: true,
  get: function get() {
    return _type.SchemaMetaFieldDef;
  }
});
Object.defineProperty(exports, 'TypeMetaFieldDef', {
  enumerable: true,
  get: function get() {
    return _type.TypeMetaFieldDef;
  }
});
Object.defineProperty(exports, 'TypeNameMetaFieldDef', {
  enumerable: true,
  get: function get() {
    return _type.TypeNameMetaFieldDef;
  }
});
Object.defineProperty(exports, 'introspectionTypes', {
  enumerable: true,
  get: function get() {
    return _type.introspectionTypes;
  }
});
Object.defineProperty(exports, '__Schema', {
  enumerable: true,
  get: function get() {
    return _type.__Schema;
  }
});
Object.defineProperty(exports, '__Directive', {
  enumerable: true,
  get: function get() {
    return _type.__Directive;
  }
});
Object.defineProperty(exports, '__DirectiveLocation', {
  enumerable: true,
  get: function get() {
    return _type.__DirectiveLocation;
  }
});
Object.defineProperty(exports, '__Type', {
  enumerable: true,
  get: function get() {
    return _type.__Type;
  }
});
Object.defineProperty(exports, '__Field', {
  enumerable: true,
  get: function get() {
    return _type.__Field;
  }
});
Object.defineProperty(exports, '__InputValue', {
  enumerable: true,
  get: function get() {
    return _type.__InputValue;
  }
});
Object.defineProperty(exports, '__EnumValue', {
  enumerable: true,
  get: function get() {
    return _type.__EnumValue;
  }
});
Object.defineProperty(exports, '__TypeKind', {
  enumerable: true,
  get: function get() {
    return _type.__TypeKind;
  }
});
Object.defineProperty(exports, 'isSchema', {
  enumerable: true,
  get: function get() {
    return _type.isSchema;
  }
});
Object.defineProperty(exports, 'isDirective', {
  enumerable: true,
  get: function get() {
    return _type.isDirective;
  }
});
Object.defineProperty(exports, 'isType', {
  enumerable: true,
  get: function get() {
    return _type.isType;
  }
});
Object.defineProperty(exports, 'isScalarType', {
  enumerable: true,
  get: function get() {
    return _type.isScalarType;
  }
});
Object.defineProperty(exports, 'isObjectType', {
  enumerable: true,
  get: function get() {
    return _type.isObjectType;
  }
});
Object.defineProperty(exports, 'isInterfaceType', {
  enumerable: true,
  get: function get() {
    return _type.isInterfaceType;
  }
});
Object.defineProperty(exports, 'isUnionType', {
  enumerable: true,
  get: function get() {
    return _type.isUnionType;
  }
});
Object.defineProperty(exports, 'isEnumType', {
  enumerable: true,
  get: function get() {
    return _type.isEnumType;
  }
});
Object.defineProperty(exports, 'isInputObjectType', {
  enumerable: true,
  get: function get() {
    return _type.isInputObjectType;
  }
});
Object.defineProperty(exports, 'isListType', {
  enumerable: true,
  get: function get() {
    return _type.isListType;
  }
});
Object.defineProperty(exports, 'isNonNullType', {
  enumerable: true,
  get: function get() {
    return _type.isNonNullType;
  }
});
Object.defineProperty(exports, 'isInputType', {
  enumerable: true,
  get: function get() {
    return _type.isInputType;
  }
});
Object.defineProperty(exports, 'isOutputType', {
  enumerable: true,
  get: function get() {
    return _type.isOutputType;
  }
});
Object.defineProperty(exports, 'isLeafType', {
  enumerable: true,
  get: function get() {
    return _type.isLeafType;
  }
});
Object.defineProperty(exports, 'isCompositeType', {
  enumerable: true,
  get: function get() {
    return _type.isCompositeType;
  }
});
Object.defineProperty(exports, 'isAbstractType', {
  enumerable: true,
  get: function get() {
    return _type.isAbstractType;
  }
});
Object.defineProperty(exports, 'isWrappingType', {
  enumerable: true,
  get: function get() {
    return _type.isWrappingType;
  }
});
Object.defineProperty(exports, 'isNullableType', {
  enumerable: true,
  get: function get() {
    return _type.isNullableType;
  }
});
Object.defineProperty(exports, 'isNamedType', {
  enumerable: true,
  get: function get() {
    return _type.isNamedType;
  }
});
Object.defineProperty(exports, 'isSpecifiedScalarType', {
  enumerable: true,
  get: function get() {
    return _type.isSpecifiedScalarType;
  }
});
Object.defineProperty(exports, 'isIntrospectionType', {
  enumerable: true,
  get: function get() {
    return _type.isIntrospectionType;
  }
});
Object.defineProperty(exports, 'isSpecifiedDirective', {
  enumerable: true,
  get: function get() {
    return _type.isSpecifiedDirective;
  }
});
Object.defineProperty(exports, 'assertType', {
  enumerable: true,
  get: function get() {
    return _type.assertType;
  }
});
Object.defineProperty(exports, 'assertScalarType', {
  enumerable: true,
  get: function get() {
    return _type.assertScalarType;
  }
});
Object.defineProperty(exports, 'assertObjectType', {
  enumerable: true,
  get: function get() {
    return _type.assertObjectType;
  }
});
Object.defineProperty(exports, 'assertInterfaceType', {
  enumerable: true,
  get: function get() {
    return _type.assertInterfaceType;
  }
});
Object.defineProperty(exports, 'assertUnionType', {
  enumerable: true,
  get: function get() {
    return _type.assertUnionType;
  }
});
Object.defineProperty(exports, 'assertEnumType', {
  enumerable: true,
  get: function get() {
    return _type.assertEnumType;
  }
});
Object.defineProperty(exports, 'assertInputObjectType', {
  enumerable: true,
  get: function get() {
    return _type.assertInputObjectType;
  }
});
Object.defineProperty(exports, 'assertListType', {
  enumerable: true,
  get: function get() {
    return _type.assertListType;
  }
});
Object.defineProperty(exports, 'assertNonNullType', {
  enumerable: true,
  get: function get() {
    return _type.assertNonNullType;
  }
});
Object.defineProperty(exports, 'assertInputType', {
  enumerable: true,
  get: function get() {
    return _type.assertInputType;
  }
});
Object.defineProperty(exports, 'assertOutputType', {
  enumerable: true,
  get: function get() {
    return _type.assertOutputType;
  }
});
Object.defineProperty(exports, 'assertLeafType', {
  enumerable: true,
  get: function get() {
    return _type.assertLeafType;
  }
});
Object.defineProperty(exports, 'assertCompositeType', {
  enumerable: true,
  get: function get() {
    return _type.assertCompositeType;
  }
});
Object.defineProperty(exports, 'assertAbstractType', {
  enumerable: true,
  get: function get() {
    return _type.assertAbstractType;
  }
});
Object.defineProperty(exports, 'assertWrappingType', {
  enumerable: true,
  get: function get() {
    return _type.assertWrappingType;
  }
});
Object.defineProperty(exports, 'assertNullableType', {
  enumerable: true,
  get: function get() {
    return _type.assertNullableType;
  }
});
Object.defineProperty(exports, 'assertNamedType', {
  enumerable: true,
  get: function get() {
    return _type.assertNamedType;
  }
});
Object.defineProperty(exports, 'getNullableType', {
  enumerable: true,
  get: function get() {
    return _type.getNullableType;
  }
});
Object.defineProperty(exports, 'getNamedType', {
  enumerable: true,
  get: function get() {
    return _type.getNamedType;
  }
});
Object.defineProperty(exports, 'validateSchema', {
  enumerable: true,
  get: function get() {
    return _type.validateSchema;
  }
});
Object.defineProperty(exports, 'assertValidSchema', {
  enumerable: true,
  get: function get() {
    return _type.assertValidSchema;
  }
});

var _language = require('./language');

Object.defineProperty(exports, 'Source', {
  enumerable: true,
  get: function get() {
    return _language.Source;
  }
});
Object.defineProperty(exports, 'getLocation', {
  enumerable: true,
  get: function get() {
    return _language.getLocation;
  }
});
Object.defineProperty(exports, 'parse', {
  enumerable: true,
  get: function get() {
    return _language.parse;
  }
});
Object.defineProperty(exports, 'parseValue', {
  enumerable: true,
  get: function get() {
    return _language.parseValue;
  }
});
Object.defineProperty(exports, 'parseType', {
  enumerable: true,
  get: function get() {
    return _language.parseType;
  }
});
Object.defineProperty(exports, 'print', {
  enumerable: true,
  get: function get() {
    return _language.print;
  }
});
Object.defineProperty(exports, 'visit', {
  enumerable: true,
  get: function get() {
    return _language.visit;
  }
});
Object.defineProperty(exports, 'visitInParallel', {
  enumerable: true,
  get: function get() {
    return _language.visitInParallel;
  }
});
Object.defineProperty(exports, 'visitWithTypeInfo', {
  enumerable: true,
  get: function get() {
    return _language.visitWithTypeInfo;
  }
});
Object.defineProperty(exports, 'getVisitFn', {
  enumerable: true,
  get: function get() {
    return _language.getVisitFn;
  }
});
Object.defineProperty(exports, 'Kind', {
  enumerable: true,
  get: function get() {
    return _language.Kind;
  }
});
Object.defineProperty(exports, 'TokenKind', {
  enumerable: true,
  get: function get() {
    return _language.TokenKind;
  }
});
Object.defineProperty(exports, 'DirectiveLocation', {
  enumerable: true,
  get: function get() {
    return _language.DirectiveLocation;
  }
});
Object.defineProperty(exports, 'BREAK', {
  enumerable: true,
  get: function get() {
    return _language.BREAK;
  }
});

var _execution = require('./execution');

Object.defineProperty(exports, 'execute', {
  enumerable: true,
  get: function get() {
    return _execution.execute;
  }
});
Object.defineProperty(exports, 'defaultFieldResolver', {
  enumerable: true,
  get: function get() {
    return _execution.defaultFieldResolver;
  }
});
Object.defineProperty(exports, 'responsePathAsArray', {
  enumerable: true,
  get: function get() {
    return _execution.responsePathAsArray;
  }
});
Object.defineProperty(exports, 'getDirectiveValues', {
  enumerable: true,
  get: function get() {
    return _execution.getDirectiveValues;
  }
});

var _subscription = require('./subscription');

Object.defineProperty(exports, 'subscribe', {
  enumerable: true,
  get: function get() {
    return _subscription.subscribe;
  }
});
Object.defineProperty(exports, 'createSourceEventStream', {
  enumerable: true,
  get: function get() {
    return _subscription.createSourceEventStream;
  }
});

var _validation = require('./validation');

Object.defineProperty(exports, 'validate', {
  enumerable: true,
  get: function get() {
    return _validation.validate;
  }
});
Object.defineProperty(exports, 'ValidationContext', {
  enumerable: true,
  get: function get() {
    return _validation.ValidationContext;
  }
});
Object.defineProperty(exports, 'specifiedRules', {
  enumerable: true,
  get: function get() {
    return _validation.specifiedRules;
  }
});
Object.defineProperty(exports, 'FieldsOnCorrectTypeRule', {
  enumerable: true,
  get: function get() {
    return _validation.FieldsOnCorrectTypeRule;
  }
});
Object.defineProperty(exports, 'FragmentsOnCompositeTypesRule', {
  enumerable: true,
  get: function get() {
    return _validation.FragmentsOnCompositeTypesRule;
  }
});
Object.defineProperty(exports, 'KnownArgumentNamesRule', {
  enumerable: true,
  get: function get() {
    return _validation.KnownArgumentNamesRule;
  }
});
Object.defineProperty(exports, 'KnownDirectivesRule', {
  enumerable: true,
  get: function get() {
    return _validation.KnownDirectivesRule;
  }
});
Object.defineProperty(exports, 'KnownFragmentNamesRule', {
  enumerable: true,
  get: function get() {
    return _validation.KnownFragmentNamesRule;
  }
});
Object.defineProperty(exports, 'KnownTypeNamesRule', {
  enumerable: true,
  get: function get() {
    return _validation.KnownTypeNamesRule;
  }
});
Object.defineProperty(exports, 'LoneAnonymousOperationRule', {
  enumerable: true,
  get: function get() {
    return _validation.LoneAnonymousOperationRule;
  }
});
Object.defineProperty(exports, 'NoFragmentCyclesRule', {
  enumerable: true,
  get: function get() {
    return _validation.NoFragmentCyclesRule;
  }
});
Object.defineProperty(exports, 'NoUndefinedVariablesRule', {
  enumerable: true,
  get: function get() {
    return _validation.NoUndefinedVariablesRule;
  }
});
Object.defineProperty(exports, 'NoUnusedFragmentsRule', {
  enumerable: true,
  get: function get() {
    return _validation.NoUnusedFragmentsRule;
  }
});
Object.defineProperty(exports, 'NoUnusedVariablesRule', {
  enumerable: true,
  get: function get() {
    return _validation.NoUnusedVariablesRule;
  }
});
Object.defineProperty(exports, 'OverlappingFieldsCanBeMergedRule', {
  enumerable: true,
  get: function get() {
    return _validation.OverlappingFieldsCanBeMergedRule;
  }
});
Object.defineProperty(exports, 'PossibleFragmentSpreadsRule', {
  enumerable: true,
  get: function get() {
    return _validation.PossibleFragmentSpreadsRule;
  }
});
Object.defineProperty(exports, 'ProvidedNonNullArgumentsRule', {
  enumerable: true,
  get: function get() {
    return _validation.ProvidedNonNullArgumentsRule;
  }
});
Object.defineProperty(exports, 'ScalarLeafsRule', {
  enumerable: true,
  get: function get() {
    return _validation.ScalarLeafsRule;
  }
});
Object.defineProperty(exports, 'SingleFieldSubscriptionsRule', {
  enumerable: true,
  get: function get() {
    return _validation.SingleFieldSubscriptionsRule;
  }
});
Object.defineProperty(exports, 'UniqueArgumentNamesRule', {
  enumerable: true,
  get: function get() {
    return _validation.UniqueArgumentNamesRule;
  }
});
Object.defineProperty(exports, 'UniqueDirectivesPerLocationRule', {
  enumerable: true,
  get: function get() {
    return _validation.UniqueDirectivesPerLocationRule;
  }
});
Object.defineProperty(exports, 'UniqueFragmentNamesRule', {
  enumerable: true,
  get: function get() {
    return _validation.UniqueFragmentNamesRule;
  }
});
Object.defineProperty(exports, 'UniqueInputFieldNamesRule', {
  enumerable: true,
  get: function get() {
    return _validation.UniqueInputFieldNamesRule;
  }
});
Object.defineProperty(exports, 'UniqueOperationNamesRule', {
  enumerable: true,
  get: function get() {
    return _validation.UniqueOperationNamesRule;
  }
});
Object.defineProperty(exports, 'UniqueVariableNamesRule', {
  enumerable: true,
  get: function get() {
    return _validation.UniqueVariableNamesRule;
  }
});
Object.defineProperty(exports, 'ValuesOfCorrectTypeRule', {
  enumerable: true,
  get: function get() {
    return _validation.ValuesOfCorrectTypeRule;
  }
});
Object.defineProperty(exports, 'VariablesAreInputTypesRule', {
  enumerable: true,
  get: function get() {
    return _validation.VariablesAreInputTypesRule;
  }
});
Object.defineProperty(exports, 'VariablesDefaultValueAllowedRule', {
  enumerable: true,
  get: function get() {
    return _validation.VariablesDefaultValueAllowedRule;
  }
});
Object.defineProperty(exports, 'VariablesInAllowedPositionRule', {
  enumerable: true,
  get: function get() {
    return _validation.VariablesInAllowedPositionRule;
  }
});

var _error = require('./error');

Object.defineProperty(exports, 'GraphQLError', {
  enumerable: true,
  get: function get() {
    return _error.GraphQLError;
  }
});
Object.defineProperty(exports, 'formatError', {
  enumerable: true,
  get: function get() {
    return _error.formatError;
  }
});
Object.defineProperty(exports, 'printError', {
  enumerable: true,
  get: function get() {
    return _error.printError;
  }
});

var _utilities = require('./utilities');

Object.defineProperty(exports, 'getIntrospectionQuery', {
  enumerable: true,
  get: function get() {
    return _utilities.getIntrospectionQuery;
  }
});
Object.defineProperty(exports, 'introspectionQuery', {
  enumerable: true,
  get: function get() {
    return _utilities.introspectionQuery;
  }
});
Object.defineProperty(exports, 'getOperationAST', {
  enumerable: true,
  get: function get() {
    return _utilities.getOperationAST;
  }
});
Object.defineProperty(exports, 'introspectionFromSchema', {
  enumerable: true,
  get: function get() {
    return _utilities.introspectionFromSchema;
  }
});
Object.defineProperty(exports, 'buildClientSchema', {
  enumerable: true,
  get: function get() {
    return _utilities.buildClientSchema;
  }
});
Object.defineProperty(exports, 'buildASTSchema', {
  enumerable: true,
  get: function get() {
    return _utilities.buildASTSchema;
  }
});
Object.defineProperty(exports, 'buildSchema', {
  enumerable: true,
  get: function get() {
    return _utilities.buildSchema;
  }
});
Object.defineProperty(exports, 'getDescription', {
  enumerable: true,
  get: function get() {
    return _utilities.getDescription;
  }
});
Object.defineProperty(exports, 'extendSchema', {
  enumerable: true,
  get: function get() {
    return _utilities.extendSchema;
  }
});
Object.defineProperty(exports, 'lexicographicSortSchema', {
  enumerable: true,
  get: function get() {
    return _utilities.lexicographicSortSchema;
  }
});
Object.defineProperty(exports, 'printSchema', {
  enumerable: true,
  get: function get() {
    return _utilities.printSchema;
  }
});
Object.defineProperty(exports, 'printIntrospectionSchema', {
  enumerable: true,
  get: function get() {
    return _utilities.printIntrospectionSchema;
  }
});
Object.defineProperty(exports, 'printType', {
  enumerable: true,
  get: function get() {
    return _utilities.printType;
  }
});
Object.defineProperty(exports, 'typeFromAST', {
  enumerable: true,
  get: function get() {
    return _utilities.typeFromAST;
  }
});
Object.defineProperty(exports, 'valueFromAST', {
  enumerable: true,
  get: function get() {
    return _utilities.valueFromAST;
  }
});
Object.defineProperty(exports, 'valueFromASTUntyped', {
  enumerable: true,
  get: function get() {
    return _utilities.valueFromASTUntyped;
  }
});
Object.defineProperty(exports, 'astFromValue', {
  enumerable: true,
  get: function get() {
    return _utilities.astFromValue;
  }
});
Object.defineProperty(exports, 'TypeInfo', {
  enumerable: true,
  get: function get() {
    return _utilities.TypeInfo;
  }
});
Object.defineProperty(exports, 'coerceValue', {
  enumerable: true,
  get: function get() {
    return _utilities.coerceValue;
  }
});
Object.defineProperty(exports, 'isValidJSValue', {
  enumerable: true,
  get: function get() {
    return _utilities.isValidJSValue;
  }
});
Object.defineProperty(exports, 'isValidLiteralValue', {
  enumerable: true,
  get: function get() {
    return _utilities.isValidLiteralValue;
  }
});
Object.defineProperty(exports, 'concatAST', {
  enumerable: true,
  get: function get() {
    return _utilities.concatAST;
  }
});
Object.defineProperty(exports, 'separateOperations', {
  enumerable: true,
  get: function get() {
    return _utilities.separateOperations;
  }
});
Object.defineProperty(exports, 'isEqualType', {
  enumerable: true,
  get: function get() {
    return _utilities.isEqualType;
  }
});
Object.defineProperty(exports, 'isTypeSubTypeOf', {
  enumerable: true,
  get: function get() {
    return _utilities.isTypeSubTypeOf;
  }
});
Object.defineProperty(exports, 'doTypesOverlap', {
  enumerable: true,
  get: function get() {
    return _utilities.doTypesOverlap;
  }
});
Object.defineProperty(exports, 'assertValidName', {
  enumerable: true,
  get: function get() {
    return _utilities.assertValidName;
  }
});
Object.defineProperty(exports, 'isValidNameError', {
  enumerable: true,
  get: function get() {
    return _utilities.isValidNameError;
  }
});
Object.defineProperty(exports, 'findBreakingChanges', {
  enumerable: true,
  get: function get() {
    return _utilities.findBreakingChanges;
  }
});
Object.defineProperty(exports, 'findDangerousChanges', {
  enumerable: true,
  get: function get() {
    return _utilities.findDangerousChanges;
  }
});
Object.defineProperty(exports, 'BreakingChangeType', {
  enumerable: true,
  get: function get() {
    return _utilities.BreakingChangeType;
  }
});
Object.defineProperty(exports, 'DangerousChangeType', {
  enumerable: true,
  get: function get() {
    return _utilities.DangerousChangeType;
  }
});
Object.defineProperty(exports, 'findDeprecatedUsages', {
  enumerable: true,
  get: function get() {
    return _utilities.findDeprecatedUsages;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"body-parser":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/body-parser/package.json                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "body-parser";
exports.version = "1.18.3";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/body-parser/index.js                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/*!
 * body-parser
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var deprecate = require('depd')('body-parser')

/**
 * Cache of loaded parsers.
 * @private
 */

var parsers = Object.create(null)

/**
 * @typedef Parsers
 * @type {function}
 * @property {function} json
 * @property {function} raw
 * @property {function} text
 * @property {function} urlencoded
 */

/**
 * Module exports.
 * @type {Parsers}
 */

exports = module.exports = deprecate.function(bodyParser,
  'bodyParser: use individual json/urlencoded middlewares')

/**
 * JSON parser.
 * @public
 */

Object.defineProperty(exports, 'json', {
  configurable: true,
  enumerable: true,
  get: createParserGetter('json')
})

/**
 * Raw parser.
 * @public
 */

Object.defineProperty(exports, 'raw', {
  configurable: true,
  enumerable: true,
  get: createParserGetter('raw')
})

/**
 * Text parser.
 * @public
 */

Object.defineProperty(exports, 'text', {
  configurable: true,
  enumerable: true,
  get: createParserGetter('text')
})

/**
 * URL-encoded parser.
 * @public
 */

Object.defineProperty(exports, 'urlencoded', {
  configurable: true,
  enumerable: true,
  get: createParserGetter('urlencoded')
})

/**
 * Create a middleware to parse json and urlencoded bodies.
 *
 * @param {object} [options]
 * @return {function}
 * @deprecated
 * @public
 */

function bodyParser (options) {
  var opts = {}

  // exclude type option
  if (options) {
    for (var prop in options) {
      if (prop !== 'type') {
        opts[prop] = options[prop]
      }
    }
  }

  var _urlencoded = exports.urlencoded(opts)
  var _json = exports.json(opts)

  return function bodyParser (req, res, next) {
    _json(req, res, function (err) {
      if (err) return next(err)
      _urlencoded(req, res, next)
    })
  }
}

/**
 * Create a getter for loading a parser.
 * @private
 */

function createParserGetter (name) {
  return function get () {
    return loadParser(name)
  }
}

/**
 * Load a parser module.
 * @private
 */

function loadParser (parserName) {
  var parser = parsers[parserName]

  if (parser !== undefined) {
    return parser
  }

  // this uses a switch for static require analysis
  switch (parserName) {
    case 'json':
      parser = require('./lib/types/json')
      break
    case 'raw':
      parser = require('./lib/types/raw')
      break
    case 'text':
      parser = require('./lib/types/text')
      break
    case 'urlencoded':
      parser = require('./lib/types/urlencoded')
      break
  }

  // store to prevent invoking require()
  return (parsers[parserName] = parser)
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"express":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/express/package.json                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "express";
exports.version = "4.16.3";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/express/index.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

module.exports = require('./lib/express');

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"cors":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/cors/package.json                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "cors";
exports.version = "2.8.4";
exports.main = "./lib/index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/cors/lib/index.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
(function () {

  'use strict';

  var assign = require('object-assign');
  var vary = require('vary');

  var defaults = {
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      preflightContinue: false,
      optionsSuccessStatus: 204
    };

  function isString(s) {
    return typeof s === 'string' || s instanceof String;
  }

  function isOriginAllowed(origin, allowedOrigin) {
    if (Array.isArray(allowedOrigin)) {
      for (var i = 0; i < allowedOrigin.length; ++i) {
        if (isOriginAllowed(origin, allowedOrigin[i])) {
          return true;
        }
      }
      return false;
    } else if (isString(allowedOrigin)) {
      return origin === allowedOrigin;
    } else if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(origin);
    } else {
      return !!allowedOrigin;
    }
  }

  function configureOrigin(options, req) {
    var requestOrigin = req.headers.origin,
      headers = [],
      isAllowed;

    if (!options.origin || options.origin === '*') {
      // allow any origin
      headers.push([{
        key: 'Access-Control-Allow-Origin',
        value: '*'
      }]);
    } else if (isString(options.origin)) {
      // fixed origin
      headers.push([{
        key: 'Access-Control-Allow-Origin',
        value: options.origin
      }]);
      headers.push([{
        key: 'Vary',
        value: 'Origin'
      }]);
    } else {
      isAllowed = isOriginAllowed(requestOrigin, options.origin);
      // reflect origin
      headers.push([{
        key: 'Access-Control-Allow-Origin',
        value: isAllowed ? requestOrigin : false
      }]);
      headers.push([{
        key: 'Vary',
        value: 'Origin'
      }]);
    }

    return headers;
  }

  function configureMethods(options) {
    var methods = options.methods;
    if (methods.join) {
      methods = options.methods.join(','); // .methods is an array, so turn it into a string
    }
    return {
      key: 'Access-Control-Allow-Methods',
      value: methods
    };
  }

  function configureCredentials(options) {
    if (options.credentials === true) {
      return {
        key: 'Access-Control-Allow-Credentials',
        value: 'true'
      };
    }
    return null;
  }

  function configureAllowedHeaders(options, req) {
    var allowedHeaders = options.allowedHeaders || options.headers;
    var headers = [];

    if (!allowedHeaders) {
      allowedHeaders = req.headers['access-control-request-headers']; // .headers wasn't specified, so reflect the request headers
      headers.push([{
        key: 'Vary',
        value: 'Access-Control-Request-Headers'
      }]);
    } else if (allowedHeaders.join) {
      allowedHeaders = allowedHeaders.join(','); // .headers is an array, so turn it into a string
    }
    if (allowedHeaders && allowedHeaders.length) {
      headers.push([{
        key: 'Access-Control-Allow-Headers',
        value: allowedHeaders
      }]);
    }

    return headers;
  }

  function configureExposedHeaders(options) {
    var headers = options.exposedHeaders;
    if (!headers) {
      return null;
    } else if (headers.join) {
      headers = headers.join(','); // .headers is an array, so turn it into a string
    }
    if (headers && headers.length) {
      return {
        key: 'Access-Control-Expose-Headers',
        value: headers
      };
    }
    return null;
  }

  function configureMaxAge(options) {
    var maxAge = options.maxAge && options.maxAge.toString();
    if (maxAge && maxAge.length) {
      return {
        key: 'Access-Control-Max-Age',
        value: maxAge
      };
    }
    return null;
  }

  function applyHeaders(headers, res) {
    for (var i = 0, n = headers.length; i < n; i++) {
      var header = headers[i];
      if (header) {
        if (Array.isArray(header)) {
          applyHeaders(header, res);
        } else if (header.key === 'Vary' && header.value) {
          vary(res, header.value);
        } else if (header.value) {
          res.setHeader(header.key, header.value);
        }
      }
    }
  }

  function cors(options, req, res, next) {
    var headers = [],
      method = req.method && req.method.toUpperCase && req.method.toUpperCase();

    if (method === 'OPTIONS') {
      // preflight
      headers.push(configureOrigin(options, req));
      headers.push(configureCredentials(options, req));
      headers.push(configureMethods(options, req));
      headers.push(configureAllowedHeaders(options, req));
      headers.push(configureMaxAge(options, req));
      headers.push(configureExposedHeaders(options, req));
      applyHeaders(headers, res);

      if (options.preflightContinue ) {
        next();
      } else {
        // Safari (and potentially other browsers) need content-length 0,
        //   for 204 or they just hang waiting for a body
        res.statusCode = options.optionsSuccessStatus || defaults.optionsSuccessStatus;
        res.setHeader('Content-Length', '0');
        res.end();
      }
    } else {
      // actual response
      headers.push(configureOrigin(options, req));
      headers.push(configureCredentials(options, req));
      headers.push(configureExposedHeaders(options, req));
      applyHeaders(headers, res);
      next();
    }
  }

  function middlewareWrapper(o) {
    // if options are static (either via defaults or custom options passed in), wrap in a function
    var optionsCallback = null;
    if (typeof o === 'function') {
      optionsCallback = o;
    } else {
      optionsCallback = function (req, cb) {
        cb(null, o);
      };
    }

    return function corsMiddleware(req, res, next) {
      optionsCallback(req, function (err, options) {
        if (err) {
          next(err);
        } else {
          var corsOptions = assign({}, defaults, options);
          var originCallback = null;
          if (corsOptions.origin && typeof corsOptions.origin === 'function') {
            originCallback = corsOptions.origin;
          } else if (corsOptions.origin) {
            originCallback = function (origin, cb) {
              cb(null, corsOptions.origin);
            };
          }

          if (originCallback) {
            originCallback(req.headers.origin, function (err2, origin) {
              if (err2 || !origin) {
                next(err2);
              } else {
                corsOptions.origin = origin;
                cors(corsOptions, req, res, next);
              }
            });
          } else {
            next();
          }
        }
      });
    };
  }

  // can pass either an options hash, an options delegate, or nothing
  module.exports = middlewareWrapper;

}());

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"graphql-tools":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/graphql-tools/package.json                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "graphql-tools";
exports.version = "3.0.2";
exports.main = "dist/index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"dist":{"index.js":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/graphql-tools/dist/index.js                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./schemaGenerator"));
__export(require("./mock"));
__export(require("./stitching"));
__export(require("./transforms"));
var schemaVisitor_1 = require("./schemaVisitor");
exports.SchemaDirectiveVisitor = schemaVisitor_1.SchemaDirectiveVisitor;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"merge-graphql-schemas":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/merge-graphql-schemas/package.json                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "merge-graphql-schemas";
exports.version = "1.5.2";
exports.main = "dist/index.cjs.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"dist":{"index.cjs.js":function(require,exports,module,__filename,__dirname){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/merge-graphql-schemas/dist/index.cjs.js                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var fs = _interopDefault(require('fs'));
var util = _interopDefault(require('util'));
var assert = _interopDefault(require('assert'));
var events = _interopDefault(require('events'));
var visitor = require('graphql/language/visitor');
var graphql = require('graphql');
var buildASTSchema = require('graphql/utilities/buildASTSchema');

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var _global = createCommonjsModule(function (module) {
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self
  // eslint-disable-next-line no-new-func
  : Function('return this')();
if (typeof __g == 'number') __g = global; // eslint-disable-line no-undef
});

var _core = createCommonjsModule(function (module) {
var core = module.exports = { version: '2.5.3' };
if (typeof __e == 'number') __e = core; // eslint-disable-line no-undef
});
var _core_1 = _core.version;

var _isObject = function (it) {
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

var _anObject = function (it) {
  if (!_isObject(it)) throw TypeError(it + ' is not an object!');
  return it;
};

var _fails = function (exec) {
  try {
    return !!exec();
  } catch (e) {
    return true;
  }
};

// Thank's IE8 for his funny defineProperty
var _descriptors = !_fails(function () {
  return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
});

var document = _global.document;
// typeof document.createElement is 'object' in old IE
var is = _isObject(document) && _isObject(document.createElement);
var _domCreate = function (it) {
  return is ? document.createElement(it) : {};
};

var _ie8DomDefine = !_descriptors && !_fails(function () {
  return Object.defineProperty(_domCreate('div'), 'a', { get: function () { return 7; } }).a != 7;
});

// 7.1.1 ToPrimitive(input [, PreferredType])

// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
var _toPrimitive = function (it, S) {
  if (!_isObject(it)) return it;
  var fn, val;
  if (S && typeof (fn = it.toString) == 'function' && !_isObject(val = fn.call(it))) return val;
  if (typeof (fn = it.valueOf) == 'function' && !_isObject(val = fn.call(it))) return val;
  if (!S && typeof (fn = it.toString) == 'function' && !_isObject(val = fn.call(it))) return val;
  throw TypeError("Can't convert object to primitive value");
};

var dP = Object.defineProperty;

var f = _descriptors ? Object.defineProperty : function defineProperty(O, P, Attributes) {
  _anObject(O);
  P = _toPrimitive(P, true);
  _anObject(Attributes);
  if (_ie8DomDefine) try {
    return dP(O, P, Attributes);
  } catch (e) { /* empty */ }
  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported!');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};

var _objectDp = {
	f: f
};

var _propertyDesc = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

var _hide = _descriptors ? function (object, key, value) {
  return _objectDp.f(object, key, _propertyDesc(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

var hasOwnProperty = {}.hasOwnProperty;
var _has = function (it, key) {
  return hasOwnProperty.call(it, key);
};

var id = 0;
var px = Math.random();
var _uid = function (key) {
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};

var _redefine = createCommonjsModule(function (module) {
var SRC = _uid('src');
var TO_STRING = 'toString';
var $toString = Function[TO_STRING];
var TPL = ('' + $toString).split(TO_STRING);

_core.inspectSource = function (it) {
  return $toString.call(it);
};

(module.exports = function (O, key, val, safe) {
  var isFunction = typeof val == 'function';
  if (isFunction) _has(val, 'name') || _hide(val, 'name', key);
  if (O[key] === val) return;
  if (isFunction) _has(val, SRC) || _hide(val, SRC, O[key] ? '' + O[key] : TPL.join(String(key)));
  if (O === _global) {
    O[key] = val;
  } else if (!safe) {
    delete O[key];
    _hide(O, key, val);
  } else if (O[key]) {
    O[key] = val;
  } else {
    _hide(O, key, val);
  }
// add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
})(Function.prototype, TO_STRING, function toString() {
  return typeof this == 'function' && this[SRC] || $toString.call(this);
});
});

var _aFunction = function (it) {
  if (typeof it != 'function') throw TypeError(it + ' is not a function!');
  return it;
};

// optional / simple context binding

var _ctx = function (fn, that, length) {
  _aFunction(fn);
  if (that === undefined) return fn;
  switch (length) {
    case 1: return function (a) {
      return fn.call(that, a);
    };
    case 2: return function (a, b) {
      return fn.call(that, a, b);
    };
    case 3: return function (a, b, c) {
      return fn.call(that, a, b, c);
    };
  }
  return function (/* ...args */) {
    return fn.apply(that, arguments);
  };
};

var PROTOTYPE = 'prototype';

var $export = function (type, name, source) {
  var IS_FORCED = type & $export.F;
  var IS_GLOBAL = type & $export.G;
  var IS_STATIC = type & $export.S;
  var IS_PROTO = type & $export.P;
  var IS_BIND = type & $export.B;
  var target = IS_GLOBAL ? _global : IS_STATIC ? _global[name] || (_global[name] = {}) : (_global[name] || {})[PROTOTYPE];
  var exports = IS_GLOBAL ? _core : _core[name] || (_core[name] = {});
  var expProto = exports[PROTOTYPE] || (exports[PROTOTYPE] = {});
  var key, own, out, exp;
  if (IS_GLOBAL) source = name;
  for (key in source) {
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    // export native or passed
    out = (own ? target : source)[key];
    // bind timers to global for call from export context
    exp = IS_BIND && own ? _ctx(out, _global) : IS_PROTO && typeof out == 'function' ? _ctx(Function.call, out) : out;
    // extend global
    if (target) _redefine(target, key, out, type & $export.U);
    // export
    if (exports[key] != out) _hide(exports, key, exp);
    if (IS_PROTO && expProto[key] != out) expProto[key] = out;
  }
};
_global.core = _core;
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library`
var _export = $export;

var toString = {}.toString;

var _cof = function (it) {
  return toString.call(it).slice(8, -1);
};

// fallback for non-array-like ES3 and non-enumerable old V8 strings

// eslint-disable-next-line no-prototype-builtins
var _iobject = Object('z').propertyIsEnumerable(0) ? Object : function (it) {
  return _cof(it) == 'String' ? it.split('') : Object(it);
};

// 7.2.1 RequireObjectCoercible(argument)
var _defined = function (it) {
  if (it == undefined) throw TypeError("Can't call method on  " + it);
  return it;
};

// to indexed object, toObject with fallback for non-array-like ES3 strings


var _toIobject = function (it) {
  return _iobject(_defined(it));
};

// 7.1.4 ToInteger
var ceil = Math.ceil;
var floor = Math.floor;
var _toInteger = function (it) {
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};

// 7.1.15 ToLength

var min = Math.min;
var _toLength = function (it) {
  return it > 0 ? min(_toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};

var max = Math.max;
var min$1 = Math.min;
var _toAbsoluteIndex = function (index, length) {
  index = _toInteger(index);
  return index < 0 ? max(index + length, 0) : min$1(index, length);
};

// false -> Array#indexOf
// true  -> Array#includes



var _arrayIncludes = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = _toIobject($this);
    var length = _toLength(O.length);
    var index = _toAbsoluteIndex(fromIndex, length);
    var value;
    // Array#includes uses SameValueZero equality algorithm
    // eslint-disable-next-line no-self-compare
    if (IS_INCLUDES && el != el) while (length > index) {
      value = O[index++];
      // eslint-disable-next-line no-self-compare
      if (value != value) return true;
    // Array#indexOf ignores holes, Array#includes - not
    } else for (;length > index; index++) if (IS_INCLUDES || index in O) {
      if (O[index] === el) return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

var SHARED = '__core-js_shared__';
var store = _global[SHARED] || (_global[SHARED] = {});
var _shared = function (key) {
  return store[key] || (store[key] = {});
};

var shared = _shared('keys');

var _sharedKey = function (key) {
  return shared[key] || (shared[key] = _uid(key));
};

var arrayIndexOf = _arrayIncludes(false);
var IE_PROTO = _sharedKey('IE_PROTO');

var _objectKeysInternal = function (object, names) {
  var O = _toIobject(object);
  var i = 0;
  var result = [];
  var key;
  for (key in O) if (key != IE_PROTO) _has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while (names.length > i) if (_has(O, key = names[i++])) {
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};

// IE 8- don't enum bug keys
var _enumBugKeys = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');

// 19.1.2.14 / 15.2.3.14 Object.keys(O)



var _objectKeys = Object.keys || function keys(O) {
  return _objectKeysInternal(O, _enumBugKeys);
};

var f$1 = {}.propertyIsEnumerable;

var _objectPie = {
	f: f$1
};

var isEnum = _objectPie.f;
var _objectToArray = function (isEntries) {
  return function (it) {
    var O = _toIobject(it);
    var keys = _objectKeys(O);
    var length = keys.length;
    var i = 0;
    var result = [];
    var key;
    while (length > i) if (isEnum.call(O, key = keys[i++])) {
      result.push(isEntries ? [key, O[key]] : O[key]);
    } return result;
  };
};

// https://github.com/tc39/proposal-object-values-entries

var $values = _objectToArray(false);

_export(_export.S, 'Object', {
  values: function values(it) {
    return $values(it);
  }
});

var _wks = createCommonjsModule(function (module) {
var store = _shared('wks');

var Symbol = _global.Symbol;
var USE_SYMBOL = typeof Symbol == 'function';

var $exports = module.exports = function (name) {
  return store[name] || (store[name] =
    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : _uid)('Symbol.' + name));
};

$exports.store = store;
});

// 22.1.3.31 Array.prototype[@@unscopables]
var UNSCOPABLES = _wks('unscopables');
var ArrayProto = Array.prototype;
if (ArrayProto[UNSCOPABLES] == undefined) _hide(ArrayProto, UNSCOPABLES, {});
var _addToUnscopables = function (key) {
  ArrayProto[UNSCOPABLES][key] = true;
};

// https://github.com/tc39/Array.prototype.includes

var $includes = _arrayIncludes(true);

_export(_export.P, 'Array', {
  includes: function includes(el /* , fromIndex = 0 */) {
    return $includes(this, el, arguments.length > 1 ? arguments[1] : undefined);
  }
});

_addToUnscopables('includes');

/*!
 * is-extglob <https://github.com/jonschlinkert/is-extglob>
 *
 * Copyright (c) 2014-2016, Jon Schlinkert.
 * Licensed under the MIT License.
 */

var isExtglob = function isExtglob(str) {
  if (typeof str !== 'string' || str === '') {
    return false;
  }

  var match;
  while ((match = /(\\).|([@?!+*]\(.*\))/g.exec(str))) {
    if (match[2]) return true;
    str = str.slice(match.index + match[0].length);
  }

  return false;
};

/*!
 * is-glob <https://github.com/jonschlinkert/is-glob>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */


var chars = { '{': '}', '(': ')', '[': ']'};

var isGlob = function isGlob(str, options) {
  if (typeof str !== 'string' || str === '') {
    return false;
  }

  if (isExtglob(str)) {
    return true;
  }

  var regex = /\\(.)|(^!|\*|[\].+)]\?|\[[^\\\]]+\]|\{[^\\}]+\}|\(\?[:!=][^\\)]+\)|\([^|]+\|[^\\)]+\))/;
  var match;

  // optionally relax regex
  if (options && options.strict === false) {
    regex = /\\(.)|(^!|[*?{}()[\]]|\(\?)/;
  }

  while ((match = regex.exec(str))) {
    if (match[2]) return true;
    var idx = match.index + match[0].length;

    // if an open bracket/brace/paren is escaped,
    // set the index to the next closing character
    var open = match[1];
    var close = open ? chars[open] : null;
    if (open && close) {
      var n = str.indexOf(close, idx);
      if (n !== -1) {
        idx = n + 1;
      }
    }

    str = str.slice(idx);
  }
  return false;
};

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


var isWindows = process.platform === 'win32';


// JavaScript implementation of realpath, ported from node pre-v6

var DEBUG = process.env.NODE_DEBUG && /fs/.test(process.env.NODE_DEBUG);

function rethrow() {
  // Only enable in debug mode. A backtrace uses ~1000 bytes of heap space and
  // is fairly slow to generate.
  var callback;
  if (DEBUG) {
    var backtrace = new Error;
    callback = debugCallback;
  } else
    callback = missingCallback;

  return callback;

  function debugCallback(err) {
    if (err) {
      backtrace.message = err.message;
      err = backtrace;
      missingCallback(err);
    }
  }

  function missingCallback(err) {
    if (err) {
      if (process.throwDeprecation)
        throw err;  // Forgot a callback but don't know where? Use NODE_DEBUG=fs
      else if (!process.noDeprecation) {
        var msg = 'fs: missing callback ' + (err.stack || err.message);
        if (process.traceDeprecation)
          console.trace(msg);
        else
          console.error(msg);
      }
    }
  }
}

function maybeCallback(cb) {
  return typeof cb === 'function' ? cb : rethrow();
}

var normalize = path.normalize;

// Regexp that finds the next partion of a (partial) path
// result is [base_with_slash, base], e.g. ['somedir/', 'somedir']
if (isWindows) {
  var nextPartRe = /(.*?)(?:[\/\\]+|$)/g;
} else {
  var nextPartRe = /(.*?)(?:[\/]+|$)/g;
}

// Regex to find the device root, including trailing slash. E.g. 'c:\\'.
if (isWindows) {
  var splitRootRe = /^(?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/][^\\\/]+)?[\\\/]*/;
} else {
  var splitRootRe = /^[\/]*/;
}

var realpathSync = function realpathSync(p, cache) {
  // make p is absolute
  p = path.resolve(p);

  if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
    return cache[p];
  }

  var original = p,
      seenLinks = {},
      knownHard = {};

  // current character position in p
  var pos;
  // the partial path so far, including a trailing slash if any
  var current;
  // the partial path without a trailing slash (except when pointing at a root)
  var base;
  // the partial path scanned in the previous round, with slash
  var previous;

  start();

  function start() {
    // Skip over roots
    var m = splitRootRe.exec(p);
    pos = m[0].length;
    current = m[0];
    base = m[0];
    previous = '';

    // On windows, check that the root exists. On unix there is no need.
    if (isWindows && !knownHard[base]) {
      fs.lstatSync(base);
      knownHard[base] = true;
    }
  }

  // walk down the path, swapping out linked pathparts for their real
  // values
  // NB: p.length changes.
  while (pos < p.length) {
    // find the next part
    nextPartRe.lastIndex = pos;
    var result = nextPartRe.exec(p);
    previous = current;
    current += result[0];
    base = previous + result[1];
    pos = nextPartRe.lastIndex;

    // continue if not a symlink
    if (knownHard[base] || (cache && cache[base] === base)) {
      continue;
    }

    var resolvedLink;
    if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
      // some known symbolic link.  no need to stat again.
      resolvedLink = cache[base];
    } else {
      var stat = fs.lstatSync(base);
      if (!stat.isSymbolicLink()) {
        knownHard[base] = true;
        if (cache) cache[base] = base;
        continue;
      }

      // read the link if it wasn't read before
      // dev/ino always return 0 on windows, so skip the check.
      var linkTarget = null;
      if (!isWindows) {
        var id = stat.dev.toString(32) + ':' + stat.ino.toString(32);
        if (seenLinks.hasOwnProperty(id)) {
          linkTarget = seenLinks[id];
        }
      }
      if (linkTarget === null) {
        fs.statSync(base);
        linkTarget = fs.readlinkSync(base);
      }
      resolvedLink = path.resolve(previous, linkTarget);
      // track this, if given a cache.
      if (cache) cache[base] = resolvedLink;
      if (!isWindows) seenLinks[id] = linkTarget;
    }

    // resolve the link, then start over
    p = path.resolve(resolvedLink, p.slice(pos));
    start();
  }

  if (cache) cache[original] = p;

  return p;
};


var realpath = function realpath(p, cache, cb) {
  if (typeof cb !== 'function') {
    cb = maybeCallback(cache);
    cache = null;
  }

  // make p is absolute
  p = path.resolve(p);

  if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
    return process.nextTick(cb.bind(null, null, cache[p]));
  }

  var original = p,
      seenLinks = {},
      knownHard = {};

  // current character position in p
  var pos;
  // the partial path so far, including a trailing slash if any
  var current;
  // the partial path without a trailing slash (except when pointing at a root)
  var base;
  // the partial path scanned in the previous round, with slash
  var previous;

  start();

  function start() {
    // Skip over roots
    var m = splitRootRe.exec(p);
    pos = m[0].length;
    current = m[0];
    base = m[0];
    previous = '';

    // On windows, check that the root exists. On unix there is no need.
    if (isWindows && !knownHard[base]) {
      fs.lstat(base, function(err) {
        if (err) return cb(err);
        knownHard[base] = true;
        LOOP();
      });
    } else {
      process.nextTick(LOOP);
    }
  }

  // walk down the path, swapping out linked pathparts for their real
  // values
  function LOOP() {
    // stop if scanned past end of path
    if (pos >= p.length) {
      if (cache) cache[original] = p;
      return cb(null, p);
    }

    // find the next part
    nextPartRe.lastIndex = pos;
    var result = nextPartRe.exec(p);
    previous = current;
    current += result[0];
    base = previous + result[1];
    pos = nextPartRe.lastIndex;

    // continue if not a symlink
    if (knownHard[base] || (cache && cache[base] === base)) {
      return process.nextTick(LOOP);
    }

    if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
      // known symbolic link.  no need to stat again.
      return gotResolvedLink(cache[base]);
    }

    return fs.lstat(base, gotStat);
  }

  function gotStat(err, stat) {
    if (err) return cb(err);

    // if not a symlink, skip to the next path part
    if (!stat.isSymbolicLink()) {
      knownHard[base] = true;
      if (cache) cache[base] = base;
      return process.nextTick(LOOP);
    }

    // stat & read the link if not read before
    // call gotTarget as soon as the link target is known
    // dev/ino always return 0 on windows, so skip the check.
    if (!isWindows) {
      var id = stat.dev.toString(32) + ':' + stat.ino.toString(32);
      if (seenLinks.hasOwnProperty(id)) {
        return gotTarget(null, seenLinks[id], base);
      }
    }
    fs.stat(base, function(err) {
      if (err) return cb(err);

      fs.readlink(base, function(err, target) {
        if (!isWindows) seenLinks[id] = target;
        gotTarget(err, target);
      });
    });
  }

  function gotTarget(err, target, base) {
    if (err) return cb(err);

    var resolvedLink = path.resolve(previous, target);
    if (cache) cache[base] = resolvedLink;
    gotResolvedLink(resolvedLink);
  }

  function gotResolvedLink(resolvedLink) {
    // resolve the link, then start over
    p = path.resolve(resolvedLink, p.slice(pos));
    start();
  }
};

var old = {
	realpathSync: realpathSync,
	realpath: realpath
};

var fs_realpath = realpath$1;
realpath$1.realpath = realpath$1;
realpath$1.sync = realpathSync$1;
realpath$1.realpathSync = realpathSync$1;
realpath$1.monkeypatch = monkeypatch;
realpath$1.unmonkeypatch = unmonkeypatch;


var origRealpath = fs.realpath;
var origRealpathSync = fs.realpathSync;

var version = process.version;
var ok = /^v[0-5]\./.test(version);


function newError (er) {
  return er && er.syscall === 'realpath' && (
    er.code === 'ELOOP' ||
    er.code === 'ENOMEM' ||
    er.code === 'ENAMETOOLONG'
  )
}

function realpath$1 (p, cache, cb) {
  if (ok) {
    return origRealpath(p, cache, cb)
  }

  if (typeof cache === 'function') {
    cb = cache;
    cache = null;
  }
  origRealpath(p, cache, function (er, result) {
    if (newError(er)) {
      old.realpath(p, cache, cb);
    } else {
      cb(er, result);
    }
  });
}

function realpathSync$1 (p, cache) {
  if (ok) {
    return origRealpathSync(p, cache)
  }

  try {
    return origRealpathSync(p, cache)
  } catch (er) {
    if (newError(er)) {
      return old.realpathSync(p, cache)
    } else {
      throw er
    }
  }
}

function monkeypatch () {
  fs.realpath = realpath$1;
  fs.realpathSync = realpathSync$1;
}

function unmonkeypatch () {
  fs.realpath = origRealpath;
  fs.realpathSync = origRealpathSync;
}

var concatMap = function (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        var x = fn(xs[i], i);
        if (isArray(x)) res.push.apply(res, x);
        else res.push(x);
    }
    return res;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

var balancedMatch = balanced;
function balanced(a, b, str) {
  if (a instanceof RegExp) a = maybeMatch(a, str);
  if (b instanceof RegExp) b = maybeMatch(b, str);

  var r = range(a, b, str);

  return r && {
    start: r[0],
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + a.length, r[1]),
    post: str.slice(r[1] + b.length)
  };
}

function maybeMatch(reg, str) {
  var m = str.match(reg);
  return m ? m[0] : null;
}

balanced.range = range;
function range(a, b, str) {
  var begs, beg, left, right, result;
  var ai = str.indexOf(a);
  var bi = str.indexOf(b, ai + 1);
  var i = ai;

  if (ai >= 0 && bi > 0) {
    begs = [];
    left = str.length;

    while (i >= 0 && !result) {
      if (i == ai) {
        begs.push(i);
        ai = str.indexOf(a, i + 1);
      } else if (begs.length == 1) {
        result = [ begs.pop(), bi ];
      } else {
        beg = begs.pop();
        if (beg < left) {
          left = beg;
          right = bi;
        }

        bi = str.indexOf(b, i + 1);
      }

      i = ai < bi && ai >= 0 ? ai : bi;
    }

    if (begs.length) {
      result = [ left, right ];
    }
  }

  return result;
}

var braceExpansion = expandTop;

var escSlash = '\0SLASH'+Math.random()+'\0';
var escOpen = '\0OPEN'+Math.random()+'\0';
var escClose = '\0CLOSE'+Math.random()+'\0';
var escComma = '\0COMMA'+Math.random()+'\0';
var escPeriod = '\0PERIOD'+Math.random()+'\0';

function numeric(str) {
  return parseInt(str, 10) == str
    ? parseInt(str, 10)
    : str.charCodeAt(0);
}

function escapeBraces(str) {
  return str.split('\\\\').join(escSlash)
            .split('\\{').join(escOpen)
            .split('\\}').join(escClose)
            .split('\\,').join(escComma)
            .split('\\.').join(escPeriod);
}

function unescapeBraces(str) {
  return str.split(escSlash).join('\\')
            .split(escOpen).join('{')
            .split(escClose).join('}')
            .split(escComma).join(',')
            .split(escPeriod).join('.');
}


// Basically just str.split(","), but handling cases
// where we have nested braced sections, which should be
// treated as individual members, like {a,{b,c},d}
function parseCommaParts(str) {
  if (!str)
    return [''];

  var parts = [];
  var m = balancedMatch('{', '}', str);

  if (!m)
    return str.split(',');

  var pre = m.pre;
  var body = m.body;
  var post = m.post;
  var p = pre.split(',');

  p[p.length-1] += '{' + body + '}';
  var postParts = parseCommaParts(post);
  if (post.length) {
    p[p.length-1] += postParts.shift();
    p.push.apply(p, postParts);
  }

  parts.push.apply(parts, p);

  return parts;
}

function expandTop(str) {
  if (!str)
    return [];

  // I don't know why Bash 4.3 does this, but it does.
  // Anything starting with {} will have the first two bytes preserved
  // but *only* at the top level, so {},a}b will not expand to anything,
  // but a{},b}c will be expanded to [a}c,abc].
  // One could argue that this is a bug in Bash, but since the goal of
  // this module is to match Bash's rules, we escape a leading {}
  if (str.substr(0, 2) === '{}') {
    str = '\\{\\}' + str.substr(2);
  }

  return expand(escapeBraces(str), true).map(unescapeBraces);
}

function embrace(str) {
  return '{' + str + '}';
}
function isPadded(el) {
  return /^-?0\d/.test(el);
}

function lte(i, y) {
  return i <= y;
}
function gte(i, y) {
  return i >= y;
}

function expand(str, isTop) {
  var expansions = [];

  var m = balancedMatch('{', '}', str);
  if (!m || /\$$/.test(m.pre)) return [str];

  var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
  var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
  var isSequence = isNumericSequence || isAlphaSequence;
  var isOptions = m.body.indexOf(',') >= 0;
  if (!isSequence && !isOptions) {
    // {a},b}
    if (m.post.match(/,.*\}/)) {
      str = m.pre + '{' + m.body + escClose + m.post;
      return expand(str);
    }
    return [str];
  }

  var n;
  if (isSequence) {
    n = m.body.split(/\.\./);
  } else {
    n = parseCommaParts(m.body);
    if (n.length === 1) {
      // x{{a,b}}y ==> x{a}y x{b}y
      n = expand(n[0], false).map(embrace);
      if (n.length === 1) {
        var post = m.post.length
          ? expand(m.post, false)
          : [''];
        return post.map(function(p) {
          return m.pre + n[0] + p;
        });
      }
    }
  }

  // at this point, n is the parts, and we know it's not a comma set
  // with a single entry.

  // no need to expand pre, since it is guaranteed to be free of brace-sets
  var pre = m.pre;
  var post = m.post.length
    ? expand(m.post, false)
    : [''];

  var N;

  if (isSequence) {
    var x = numeric(n[0]);
    var y = numeric(n[1]);
    var width = Math.max(n[0].length, n[1].length);
    var incr = n.length == 3
      ? Math.abs(numeric(n[2]))
      : 1;
    var test = lte;
    var reverse = y < x;
    if (reverse) {
      incr *= -1;
      test = gte;
    }
    var pad = n.some(isPadded);

    N = [];

    for (var i = x; test(i, y); i += incr) {
      var c;
      if (isAlphaSequence) {
        c = String.fromCharCode(i);
        if (c === '\\')
          c = '';
      } else {
        c = String(i);
        if (pad) {
          var need = width - c.length;
          if (need > 0) {
            var z = new Array(need + 1).join('0');
            if (i < 0)
              c = '-' + z + c.slice(1);
            else
              c = z + c;
          }
        }
      }
      N.push(c);
    }
  } else {
    N = concatMap(n, function(el) { return expand(el, false) });
  }

  for (var j = 0; j < N.length; j++) {
    for (var k = 0; k < post.length; k++) {
      var expansion = pre + N[j] + post[k];
      if (!isTop || isSequence || expansion)
        expansions.push(expansion);
    }
  }

  return expansions;
}

var minimatch_1 = minimatch;
minimatch.Minimatch = Minimatch;

var path$1 = { sep: '/' };
try {
  path$1 = path;
} catch (er) {}

var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {};


var plTypes = {
  '!': { open: '(?:(?!(?:', close: '))[^/]*?)'},
  '?': { open: '(?:', close: ')?' },
  '+': { open: '(?:', close: ')+' },
  '*': { open: '(?:', close: ')*' },
  '@': { open: '(?:', close: ')' }
};

// any single thing other than /
// don't need to escape / when using new RegExp()
var qmark = '[^/]';

// * => any number of characters
var star = qmark + '*?';

// ** when dots are allowed.  Anything goes, except .. and .
// not (^ or / followed by one or two dots followed by $ or /),
// followed by anything, any number of times.
var twoStarDot = '(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?';

// not a ^ or / followed by a dot,
// followed by anything, any number of times.
var twoStarNoDot = '(?:(?!(?:\\\/|^)\\.).)*?';

// characters that need to be escaped in RegExp.
var reSpecials = charSet('().*{}+?[]^$\\!');

// "abc" -> { a:true, b:true, c:true }
function charSet (s) {
  return s.split('').reduce(function (set, c) {
    set[c] = true;
    return set
  }, {})
}

// normalizes slashes.
var slashSplit = /\/+/;

minimatch.filter = filter;
function filter (pattern, options) {
  options = options || {};
  return function (p, i, list) {
    return minimatch(p, pattern, options)
  }
}

function ext (a, b) {
  a = a || {};
  b = b || {};
  var t = {};
  Object.keys(b).forEach(function (k) {
    t[k] = b[k];
  });
  Object.keys(a).forEach(function (k) {
    t[k] = a[k];
  });
  return t
}

minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return minimatch

  var orig = minimatch;

  var m = function minimatch (p, pattern, options) {
    return orig.minimatch(p, pattern, ext(def, options))
  };

  m.Minimatch = function Minimatch (pattern, options) {
    return new orig.Minimatch(pattern, ext(def, options))
  };

  return m
};

Minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return Minimatch
  return minimatch.defaults(def).Minimatch
};

function minimatch (p, pattern, options) {
  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {};

  // shortcut: comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    return false
  }

  // "" only matches ""
  if (pattern.trim() === '') return p === ''

  return new Minimatch(pattern, options).match(p)
}

function Minimatch (pattern, options) {
  if (!(this instanceof Minimatch)) {
    return new Minimatch(pattern, options)
  }

  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {};
  pattern = pattern.trim();

  // windows support: need to use /, not \
  if (path$1.sep !== '/') {
    pattern = pattern.split(path$1.sep).join('/');
  }

  this.options = options;
  this.set = [];
  this.pattern = pattern;
  this.regexp = null;
  this.negate = false;
  this.comment = false;
  this.empty = false;

  // make the set of regexps etc.
  this.make();
}

Minimatch.prototype.debug = function () {};

Minimatch.prototype.make = make;
function make () {
  // don't do it more than once.
  if (this._made) return

  var pattern = this.pattern;
  var options = this.options;

  // empty patterns and comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    this.comment = true;
    return
  }
  if (!pattern) {
    this.empty = true;
    return
  }

  // step 1: figure out negation, etc.
  this.parseNegate();

  // step 2: expand braces
  var set = this.globSet = this.braceExpand();

  if (options.debug) this.debug = console.error;

  this.debug(this.pattern, set);

  // step 3: now we have a set, so turn each one into a series of path-portion
  // matching patterns.
  // These will be regexps, except in the case of "**", which is
  // set to the GLOBSTAR object for globstar behavior,
  // and will not contain any / characters
  set = this.globParts = set.map(function (s) {
    return s.split(slashSplit)
  });

  this.debug(this.pattern, set);

  // glob --> regexps
  set = set.map(function (s, si, set) {
    return s.map(this.parse, this)
  }, this);

  this.debug(this.pattern, set);

  // filter out everything that didn't compile properly.
  set = set.filter(function (s) {
    return s.indexOf(false) === -1
  });

  this.debug(this.pattern, set);

  this.set = set;
}

Minimatch.prototype.parseNegate = parseNegate;
function parseNegate () {
  var pattern = this.pattern;
  var negate = false;
  var options = this.options;
  var negateOffset = 0;

  if (options.nonegate) return

  for (var i = 0, l = pattern.length
    ; i < l && pattern.charAt(i) === '!'
    ; i++) {
    negate = !negate;
    negateOffset++;
  }

  if (negateOffset) this.pattern = pattern.substr(negateOffset);
  this.negate = negate;
}

// Brace expansion:
// a{b,c}d -> abd acd
// a{b,}c -> abc ac
// a{0..3}d -> a0d a1d a2d a3d
// a{b,c{d,e}f}g -> abg acdfg acefg
// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
//
// Invalid sets are not expanded.
// a{2..}b -> a{2..}b
// a{b}c -> a{b}c
minimatch.braceExpand = function (pattern, options) {
  return braceExpand(pattern, options)
};

Minimatch.prototype.braceExpand = braceExpand;

function braceExpand (pattern, options) {
  if (!options) {
    if (this instanceof Minimatch) {
      options = this.options;
    } else {
      options = {};
    }
  }

  pattern = typeof pattern === 'undefined'
    ? this.pattern : pattern;

  if (typeof pattern === 'undefined') {
    throw new TypeError('undefined pattern')
  }

  if (options.nobrace ||
    !pattern.match(/\{.*\}/)) {
    // shortcut. no need to expand.
    return [pattern]
  }

  return braceExpansion(pattern)
}

// parse a component of the expanded set.
// At this point, no pattern may contain "/" in it
// so we're going to return a 2d array, where each entry is the full
// pattern, split on '/', and then turned into a regular expression.
// A regexp is made at the end which joins each array with an
// escaped /, and another full one which joins each regexp with |.
//
// Following the lead of Bash 4.1, note that "**" only has special meaning
// when it is the *only* thing in a path portion.  Otherwise, any series
// of * is equivalent to a single *.  Globstar behavior is enabled by
// default, and can be disabled by setting options.noglobstar.
Minimatch.prototype.parse = parse;
var SUBPARSE = {};
function parse (pattern, isSub) {
  if (pattern.length > 1024 * 64) {
    throw new TypeError('pattern is too long')
  }

  var options = this.options;

  // shortcuts
  if (!options.noglobstar && pattern === '**') return GLOBSTAR
  if (pattern === '') return ''

  var re = '';
  var hasMagic = !!options.nocase;
  var escaping = false;
  // ? => one single character
  var patternListStack = [];
  var negativeLists = [];
  var stateChar;
  var inClass = false;
  var reClassStart = -1;
  var classStart = -1;
  // . and .. never match anything that doesn't start with .,
  // even when options.dot is set.
  var patternStart = pattern.charAt(0) === '.' ? '' // anything
  // not (start or / followed by . or .. followed by / or end)
  : options.dot ? '(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))'
  : '(?!\\.)';
  var self = this;

  function clearStateChar () {
    if (stateChar) {
      // we had some state-tracking character
      // that wasn't consumed by this pass.
      switch (stateChar) {
        case '*':
          re += star;
          hasMagic = true;
        break
        case '?':
          re += qmark;
          hasMagic = true;
        break
        default:
          re += '\\' + stateChar;
        break
      }
      self.debug('clearStateChar %j %j', stateChar, re);
      stateChar = false;
    }
  }

  for (var i = 0, len = pattern.length, c
    ; (i < len) && (c = pattern.charAt(i))
    ; i++) {
    this.debug('%s\t%s %s %j', pattern, i, re, c);

    // skip over any that are escaped.
    if (escaping && reSpecials[c]) {
      re += '\\' + c;
      escaping = false;
      continue
    }

    switch (c) {
      case '/':
        // completely not allowed, even escaped.
        // Should already be path-split by now.
        return false

      case '\\':
        clearStateChar();
        escaping = true;
      continue

      // the various stateChar values
      // for the "extglob" stuff.
      case '?':
      case '*':
      case '+':
      case '@':
      case '!':
        this.debug('%s\t%s %s %j <-- stateChar', pattern, i, re, c);

        // all of those are literals inside a class, except that
        // the glob [!a] means [^a] in regexp
        if (inClass) {
          this.debug('  in class');
          if (c === '!' && i === classStart + 1) c = '^';
          re += c;
          continue
        }

        // if we already have a stateChar, then it means
        // that there was something like ** or +? in there.
        // Handle the stateChar, then proceed with this one.
        self.debug('call clearStateChar %j', stateChar);
        clearStateChar();
        stateChar = c;
        // if extglob is disabled, then +(asdf|foo) isn't a thing.
        // just clear the statechar *now*, rather than even diving into
        // the patternList stuff.
        if (options.noext) clearStateChar();
      continue

      case '(':
        if (inClass) {
          re += '(';
          continue
        }

        if (!stateChar) {
          re += '\\(';
          continue
        }

        patternListStack.push({
          type: stateChar,
          start: i - 1,
          reStart: re.length,
          open: plTypes[stateChar].open,
          close: plTypes[stateChar].close
        });
        // negation is (?:(?!js)[^/]*)
        re += stateChar === '!' ? '(?:(?!(?:' : '(?:';
        this.debug('plType %j %j', stateChar, re);
        stateChar = false;
      continue

      case ')':
        if (inClass || !patternListStack.length) {
          re += '\\)';
          continue
        }

        clearStateChar();
        hasMagic = true;
        var pl = patternListStack.pop();
        // negation is (?:(?!js)[^/]*)
        // The others are (?:<pattern>)<type>
        re += pl.close;
        if (pl.type === '!') {
          negativeLists.push(pl);
        }
        pl.reEnd = re.length;
      continue

      case '|':
        if (inClass || !patternListStack.length || escaping) {
          re += '\\|';
          escaping = false;
          continue
        }

        clearStateChar();
        re += '|';
      continue

      // these are mostly the same in regexp and glob
      case '[':
        // swallow any state-tracking char before the [
        clearStateChar();

        if (inClass) {
          re += '\\' + c;
          continue
        }

        inClass = true;
        classStart = i;
        reClassStart = re.length;
        re += c;
      continue

      case ']':
        //  a right bracket shall lose its special
        //  meaning and represent itself in
        //  a bracket expression if it occurs
        //  first in the list.  -- POSIX.2 2.8.3.2
        if (i === classStart + 1 || !inClass) {
          re += '\\' + c;
          escaping = false;
          continue
        }

        // handle the case where we left a class open.
        // "[z-a]" is valid, equivalent to "\[z-a\]"
        if (inClass) {
          // split where the last [ was, make sure we don't have
          // an invalid re. if so, re-walk the contents of the
          // would-be class to re-translate any characters that
          // were passed through as-is
          // TODO: It would probably be faster to determine this
          // without a try/catch and a new RegExp, but it's tricky
          // to do safely.  For now, this is safe and works.
          var cs = pattern.substring(classStart + 1, i);
          try {
          } catch (er) {
            // not a valid class!
            var sp = this.parse(cs, SUBPARSE);
            re = re.substr(0, reClassStart) + '\\[' + sp[0] + '\\]';
            hasMagic = hasMagic || sp[1];
            inClass = false;
            continue
          }
        }

        // finish up the class.
        hasMagic = true;
        inClass = false;
        re += c;
      continue

      default:
        // swallow any state char that wasn't consumed
        clearStateChar();

        if (escaping) {
          // no need
          escaping = false;
        } else if (reSpecials[c]
          && !(c === '^' && inClass)) {
          re += '\\';
        }

        re += c;

    } // switch
  } // for

  // handle the case where we left a class open.
  // "[abc" is valid, equivalent to "\[abc"
  if (inClass) {
    // split where the last [ was, and escape it
    // this is a huge pita.  We now have to re-walk
    // the contents of the would-be class to re-translate
    // any characters that were passed through as-is
    cs = pattern.substr(classStart + 1);
    sp = this.parse(cs, SUBPARSE);
    re = re.substr(0, reClassStart) + '\\[' + sp[0];
    hasMagic = hasMagic || sp[1];
  }

  // handle the case where we had a +( thing at the *end*
  // of the pattern.
  // each pattern list stack adds 3 chars, and we need to go through
  // and escape any | chars that were passed through as-is for the regexp.
  // Go through and escape them, taking care not to double-escape any
  // | chars that were already escaped.
  for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
    var tail = re.slice(pl.reStart + pl.open.length);
    this.debug('setting tail', re, pl);
    // maybe some even number of \, then maybe 1 \, followed by a |
    tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function (_, $1, $2) {
      if (!$2) {
        // the | isn't already escaped, so escape it.
        $2 = '\\';
      }

      // need to escape all those slashes *again*, without escaping the
      // one that we need for escaping the | character.  As it works out,
      // escaping an even number of slashes can be done by simply repeating
      // it exactly after itself.  That's why this trick works.
      //
      // I am sorry that you have to see this.
      return $1 + $1 + $2 + '|'
    });

    this.debug('tail=%j\n   %s', tail, tail, pl, re);
    var t = pl.type === '*' ? star
      : pl.type === '?' ? qmark
      : '\\' + pl.type;

    hasMagic = true;
    re = re.slice(0, pl.reStart) + t + '\\(' + tail;
  }

  // handle trailing things that only matter at the very end.
  clearStateChar();
  if (escaping) {
    // trailing \\
    re += '\\\\';
  }

  // only need to apply the nodot start if the re starts with
  // something that could conceivably capture a dot
  var addPatternStart = false;
  switch (re.charAt(0)) {
    case '.':
    case '[':
    case '(': addPatternStart = true;
  }

  // Hack to work around lack of negative lookbehind in JS
  // A pattern like: *.!(x).!(y|z) needs to ensure that a name
  // like 'a.xyz.yz' doesn't match.  So, the first negative
  // lookahead, has to look ALL the way ahead, to the end of
  // the pattern.
  for (var n = negativeLists.length - 1; n > -1; n--) {
    var nl = negativeLists[n];

    var nlBefore = re.slice(0, nl.reStart);
    var nlFirst = re.slice(nl.reStart, nl.reEnd - 8);
    var nlLast = re.slice(nl.reEnd - 8, nl.reEnd);
    var nlAfter = re.slice(nl.reEnd);

    nlLast += nlAfter;

    // Handle nested stuff like *(*.js|!(*.json)), where open parens
    // mean that we should *not* include the ) in the bit that is considered
    // "after" the negated section.
    var openParensBefore = nlBefore.split('(').length - 1;
    var cleanAfter = nlAfter;
    for (i = 0; i < openParensBefore; i++) {
      cleanAfter = cleanAfter.replace(/\)[+*?]?/, '');
    }
    nlAfter = cleanAfter;

    var dollar = '';
    if (nlAfter === '' && isSub !== SUBPARSE) {
      dollar = '$';
    }
    var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast;
    re = newRe;
  }

  // if the re is not "" at this point, then we need to make sure
  // it doesn't match against an empty path part.
  // Otherwise a/* will match a/, which it should not.
  if (re !== '' && hasMagic) {
    re = '(?=.)' + re;
  }

  if (addPatternStart) {
    re = patternStart + re;
  }

  // parsing just a piece of a larger pattern.
  if (isSub === SUBPARSE) {
    return [re, hasMagic]
  }

  // skip the regexp for non-magical patterns
  // unescape anything in it, though, so that it'll be
  // an exact match against a file etc.
  if (!hasMagic) {
    return globUnescape(pattern)
  }

  var flags = options.nocase ? 'i' : '';
  try {
    var regExp = new RegExp('^' + re + '$', flags);
  } catch (er) {
    // If it was an invalid regular expression, then it can't match
    // anything.  This trick looks for a character after the end of
    // the string, which is of course impossible, except in multi-line
    // mode, but it's not a /m regex.
    return new RegExp('$.')
  }

  regExp._glob = pattern;
  regExp._src = re;

  return regExp
}

minimatch.makeRe = function (pattern, options) {
  return new Minimatch(pattern, options || {}).makeRe()
};

Minimatch.prototype.makeRe = makeRe;
function makeRe () {
  if (this.regexp || this.regexp === false) return this.regexp

  // at this point, this.set is a 2d array of partial
  // pattern strings, or "**".
  //
  // It's better to use .match().  This function shouldn't
  // be used, really, but it's pretty convenient sometimes,
  // when you just want to work with a regex.
  var set = this.set;

  if (!set.length) {
    this.regexp = false;
    return this.regexp
  }
  var options = this.options;

  var twoStar = options.noglobstar ? star
    : options.dot ? twoStarDot
    : twoStarNoDot;
  var flags = options.nocase ? 'i' : '';

  var re = set.map(function (pattern) {
    return pattern.map(function (p) {
      return (p === GLOBSTAR) ? twoStar
      : (typeof p === 'string') ? regExpEscape(p)
      : p._src
    }).join('\\\/')
  }).join('|');

  // must match entire pattern
  // ending in a * or ** will make it less strict.
  re = '^(?:' + re + ')$';

  // can match anything, as long as it's not this.
  if (this.negate) re = '^(?!' + re + ').*$';

  try {
    this.regexp = new RegExp(re, flags);
  } catch (ex) {
    this.regexp = false;
  }
  return this.regexp
}

minimatch.match = function (list, pattern, options) {
  options = options || {};
  var mm = new Minimatch(pattern, options);
  list = list.filter(function (f) {
    return mm.match(f)
  });
  if (mm.options.nonull && !list.length) {
    list.push(pattern);
  }
  return list
};

Minimatch.prototype.match = match;
function match (f, partial) {
  this.debug('match', f, this.pattern);
  // short-circuit in the case of busted things.
  // comments, etc.
  if (this.comment) return false
  if (this.empty) return f === ''

  if (f === '/' && partial) return true

  var options = this.options;

  // windows: need to use /, not \
  if (path$1.sep !== '/') {
    f = f.split(path$1.sep).join('/');
  }

  // treat the test path as a set of pathparts.
  f = f.split(slashSplit);
  this.debug(this.pattern, 'split', f);

  // just ONE of the pattern sets in this.set needs to match
  // in order for it to be valid.  If negating, then just one
  // match means that we have failed.
  // Either way, return on the first hit.

  var set = this.set;
  this.debug(this.pattern, 'set', set);

  // Find the basename of the path by looking for the last non-empty segment
  var filename;
  var i;
  for (i = f.length - 1; i >= 0; i--) {
    filename = f[i];
    if (filename) break
  }

  for (i = 0; i < set.length; i++) {
    var pattern = set[i];
    var file = f;
    if (options.matchBase && pattern.length === 1) {
      file = [filename];
    }
    var hit = this.matchOne(file, pattern, partial);
    if (hit) {
      if (options.flipNegate) return true
      return !this.negate
    }
  }

  // didn't get any hits.  this is success if it's a negative
  // pattern, failure otherwise.
  if (options.flipNegate) return false
  return this.negate
}

// set partial to true to test if, for example,
// "/a/b" matches the start of "/*/b/*/d"
// Partial means, if you run out of file before you run
// out of pattern, then that's fine, as long as all
// the parts match.
Minimatch.prototype.matchOne = function (file, pattern, partial) {
  var options = this.options;

  this.debug('matchOne',
    { 'this': this, file: file, pattern: pattern });

  this.debug('matchOne', file.length, pattern.length);

  for (var fi = 0,
      pi = 0,
      fl = file.length,
      pl = pattern.length
      ; (fi < fl) && (pi < pl)
      ; fi++, pi++) {
    this.debug('matchOne loop');
    var p = pattern[pi];
    var f = file[fi];

    this.debug(pattern, p, f);

    // should be impossible.
    // some invalid regexp stuff in the set.
    if (p === false) return false

    if (p === GLOBSTAR) {
      this.debug('GLOBSTAR', [pattern, p, f]);

      // "**"
      // a/**/b/**/c would match the following:
      // a/b/x/y/z/c
      // a/x/y/z/b/c
      // a/b/x/b/x/c
      // a/b/c
      // To do this, take the rest of the pattern after
      // the **, and see if it would match the file remainder.
      // If so, return success.
      // If not, the ** "swallows" a segment, and try again.
      // This is recursively awful.
      //
      // a/**/b/**/c matching a/b/x/y/z/c
      // - a matches a
      // - doublestar
      //   - matchOne(b/x/y/z/c, b/**/c)
      //     - b matches b
      //     - doublestar
      //       - matchOne(x/y/z/c, c) -> no
      //       - matchOne(y/z/c, c) -> no
      //       - matchOne(z/c, c) -> no
      //       - matchOne(c, c) yes, hit
      var fr = fi;
      var pr = pi + 1;
      if (pr === pl) {
        this.debug('** at the end');
        // a ** at the end will just swallow the rest.
        // We have found a match.
        // however, it will not swallow /.x, unless
        // options.dot is set.
        // . and .. are *never* matched by **, for explosively
        // exponential reasons.
        for (; fi < fl; fi++) {
          if (file[fi] === '.' || file[fi] === '..' ||
            (!options.dot && file[fi].charAt(0) === '.')) return false
        }
        return true
      }

      // ok, let's see if we can swallow whatever we can.
      while (fr < fl) {
        var swallowee = file[fr];

        this.debug('\nglobstar while', file, fr, pattern, pr, swallowee);

        // XXX remove this slice.  Just pass the start index.
        if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
          this.debug('globstar found match!', fr, fl, swallowee);
          // found a match.
          return true
        } else {
          // can't swallow "." or ".." ever.
          // can only swallow ".foo" when explicitly asked.
          if (swallowee === '.' || swallowee === '..' ||
            (!options.dot && swallowee.charAt(0) === '.')) {
            this.debug('dot detected!', file, fr, pattern, pr);
            break
          }

          // ** swallows a segment, and continue.
          this.debug('globstar swallow a segment, and continue');
          fr++;
        }
      }

      // no match was found.
      // However, in partial mode, we can't say this is necessarily over.
      // If there's more *pattern* left, then
      if (partial) {
        // ran out of file
        this.debug('\n>>> no match, partial?', file, fr, pattern, pr);
        if (fr === fl) return true
      }
      return false
    }

    // something other than **
    // non-magic patterns just have to match exactly
    // patterns with magic have been turned into regexps.
    var hit;
    if (typeof p === 'string') {
      if (options.nocase) {
        hit = f.toLowerCase() === p.toLowerCase();
      } else {
        hit = f === p;
      }
      this.debug('string match', p, f, hit);
    } else {
      hit = f.match(p);
      this.debug('pattern match', p, f, hit);
    }

    if (!hit) return false
  }

  // Note: ending in / means that we'll get a final ""
  // at the end of the pattern.  This can only match a
  // corresponding "" at the end of the file.
  // If the file ends in /, then it can only match a
  // a pattern that ends in /, unless the pattern just
  // doesn't have any more for it. But, a/b/ should *not*
  // match "a/b/*", even though "" matches against the
  // [^/]*? pattern, except in partial mode, where it might
  // simply not be reached yet.
  // However, a/b/ should still satisfy a/*

  // now either we fell off the end of the pattern, or we're done.
  if (fi === fl && pi === pl) {
    // ran out of pattern and filename at the same time.
    // an exact hit!
    return true
  } else if (fi === fl) {
    // ran out of file, but still had pattern left.
    // this is ok if we're doing the match as part of
    // a glob fs traversal.
    return partial
  } else if (pi === pl) {
    // ran out of pattern, still have file left.
    // this is only acceptable if we're on the very last
    // empty segment of a file with a trailing slash.
    // a/* should match a/b/
    var emptyFileEnd = (fi === fl - 1) && (file[fi] === '');
    return emptyFileEnd
  }

  // should be unreachable.
  throw new Error('wtf?')
};

// replace stuff like \* with *
function globUnescape (s) {
  return s.replace(/\\(.)/g, '$1')
}

function regExpEscape (s) {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}

var inherits_browser = createCommonjsModule(function (module) {
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    var TempCtor = function () {};
    TempCtor.prototype = superCtor.prototype;
    ctor.prototype = new TempCtor();
    ctor.prototype.constructor = ctor;
  };
}
});

var inherits = createCommonjsModule(function (module) {
try {
  var util$$1 = util;
  if (typeof util$$1.inherits !== 'function') throw '';
  module.exports = util$$1.inherits;
} catch (e) {
  module.exports = inherits_browser;
}
});

function posix(path$$1) {
	return path$$1.charAt(0) === '/';
}

function win32(path$$1) {
	// https://github.com/nodejs/node/blob/b3fcc245fb25539909ef1d5eaa01dbf92e168633/lib/path.js#L56
	var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
	var result = splitDeviceRe.exec(path$$1);
	var device = result[1] || '';
	var isUnc = Boolean(device && device.charAt(1) !== ':');

	// UNC paths are always absolute
	return Boolean(result[2] || isUnc);
}

var pathIsAbsolute = process.platform === 'win32' ? win32 : posix;
var posix_1 = posix;
var win32_1 = win32;
pathIsAbsolute.posix = posix_1;
pathIsAbsolute.win32 = win32_1;

var alphasort_1 = alphasort;
var alphasorti_1 = alphasorti;
var setopts_1 = setopts;
var ownProp_1 = ownProp;
var makeAbs_1 = makeAbs;
var finish_1 = finish;
var mark_1 = mark;
var isIgnored_1 = isIgnored;
var childrenIgnored_1 = childrenIgnored;

function ownProp (obj, field) {
  return Object.prototype.hasOwnProperty.call(obj, field)
}




var Minimatch$1 = minimatch_1.Minimatch;

function alphasorti (a, b) {
  return a.toLowerCase().localeCompare(b.toLowerCase())
}

function alphasort (a, b) {
  return a.localeCompare(b)
}

function setupIgnores (self, options) {
  self.ignore = options.ignore || [];

  if (!Array.isArray(self.ignore))
    self.ignore = [self.ignore];

  if (self.ignore.length) {
    self.ignore = self.ignore.map(ignoreMap);
  }
}

// ignore patterns are always in dot:true mode.
function ignoreMap (pattern) {
  var gmatcher = null;
  if (pattern.slice(-3) === '/**') {
    var gpattern = pattern.replace(/(\/\*\*)+$/, '');
    gmatcher = new Minimatch$1(gpattern, { dot: true });
  }

  return {
    matcher: new Minimatch$1(pattern, { dot: true }),
    gmatcher: gmatcher
  }
}

function setopts (self, pattern, options) {
  if (!options)
    options = {};

  // base-matching: just use globstar for that.
  if (options.matchBase && -1 === pattern.indexOf("/")) {
    if (options.noglobstar) {
      throw new Error("base matching requires globstar")
    }
    pattern = "**/" + pattern;
  }

  self.silent = !!options.silent;
  self.pattern = pattern;
  self.strict = options.strict !== false;
  self.realpath = !!options.realpath;
  self.realpathCache = options.realpathCache || Object.create(null);
  self.follow = !!options.follow;
  self.dot = !!options.dot;
  self.mark = !!options.mark;
  self.nodir = !!options.nodir;
  if (self.nodir)
    self.mark = true;
  self.sync = !!options.sync;
  self.nounique = !!options.nounique;
  self.nonull = !!options.nonull;
  self.nosort = !!options.nosort;
  self.nocase = !!options.nocase;
  self.stat = !!options.stat;
  self.noprocess = !!options.noprocess;
  self.absolute = !!options.absolute;

  self.maxLength = options.maxLength || Infinity;
  self.cache = options.cache || Object.create(null);
  self.statCache = options.statCache || Object.create(null);
  self.symlinks = options.symlinks || Object.create(null);

  setupIgnores(self, options);

  self.changedCwd = false;
  var cwd = process.cwd();
  if (!ownProp(options, "cwd"))
    self.cwd = cwd;
  else {
    self.cwd = path.resolve(options.cwd);
    self.changedCwd = self.cwd !== cwd;
  }

  self.root = options.root || path.resolve(self.cwd, "/");
  self.root = path.resolve(self.root);
  if (process.platform === "win32")
    self.root = self.root.replace(/\\/g, "/");

  // TODO: is an absolute `cwd` supposed to be resolved against `root`?
  // e.g. { cwd: '/test', root: __dirname } === path.join(__dirname, '/test')
  self.cwdAbs = pathIsAbsolute(self.cwd) ? self.cwd : makeAbs(self, self.cwd);
  if (process.platform === "win32")
    self.cwdAbs = self.cwdAbs.replace(/\\/g, "/");
  self.nomount = !!options.nomount;

  // disable comments and negation in Minimatch.
  // Note that they are not supported in Glob itself anyway.
  options.nonegate = true;
  options.nocomment = true;

  self.minimatch = new Minimatch$1(pattern, options);
  self.options = self.minimatch.options;
}

function finish (self) {
  var nou = self.nounique;
  var all = nou ? [] : Object.create(null);

  for (var i = 0, l = self.matches.length; i < l; i ++) {
    var matches = self.matches[i];
    if (!matches || Object.keys(matches).length === 0) {
      if (self.nonull) {
        // do like the shell, and spit out the literal glob
        var literal = self.minimatch.globSet[i];
        if (nou)
          all.push(literal);
        else
          all[literal] = true;
      }
    } else {
      // had matches
      var m = Object.keys(matches);
      if (nou)
        all.push.apply(all, m);
      else
        m.forEach(function (m) {
          all[m] = true;
        });
    }
  }

  if (!nou)
    all = Object.keys(all);

  if (!self.nosort)
    all = all.sort(self.nocase ? alphasorti : alphasort);

  // at *some* point we statted all of these
  if (self.mark) {
    for (var i = 0; i < all.length; i++) {
      all[i] = self._mark(all[i]);
    }
    if (self.nodir) {
      all = all.filter(function (e) {
        var notDir = !(/\/$/.test(e));
        var c = self.cache[e] || self.cache[makeAbs(self, e)];
        if (notDir && c)
          notDir = c !== 'DIR' && !Array.isArray(c);
        return notDir
      });
    }
  }

  if (self.ignore.length)
    all = all.filter(function(m) {
      return !isIgnored(self, m)
    });

  self.found = all;
}

function mark (self, p) {
  var abs = makeAbs(self, p);
  var c = self.cache[abs];
  var m = p;
  if (c) {
    var isDir = c === 'DIR' || Array.isArray(c);
    var slash = p.slice(-1) === '/';

    if (isDir && !slash)
      m += '/';
    else if (!isDir && slash)
      m = m.slice(0, -1);

    if (m !== p) {
      var mabs = makeAbs(self, m);
      self.statCache[mabs] = self.statCache[abs];
      self.cache[mabs] = self.cache[abs];
    }
  }

  return m
}

// lotta situps...
function makeAbs (self, f) {
  var abs = f;
  if (f.charAt(0) === '/') {
    abs = path.join(self.root, f);
  } else if (pathIsAbsolute(f) || f === '') {
    abs = f;
  } else if (self.changedCwd) {
    abs = path.resolve(self.cwd, f);
  } else {
    abs = path.resolve(f);
  }

  if (process.platform === 'win32')
    abs = abs.replace(/\\/g, '/');

  return abs
}


// Return true, if pattern ends with globstar '**', for the accompanying parent directory.
// Ex:- If node_modules/** is the pattern, add 'node_modules' to ignore list along with it's contents
function isIgnored (self, path$$1) {
  if (!self.ignore.length)
    return false

  return self.ignore.some(function(item) {
    return item.matcher.match(path$$1) || !!(item.gmatcher && item.gmatcher.match(path$$1))
  })
}

function childrenIgnored (self, path$$1) {
  if (!self.ignore.length)
    return false

  return self.ignore.some(function(item) {
    return !!(item.gmatcher && item.gmatcher.match(path$$1))
  })
}

var common = {
	alphasort: alphasort_1,
	alphasorti: alphasorti_1,
	setopts: setopts_1,
	ownProp: ownProp_1,
	makeAbs: makeAbs_1,
	finish: finish_1,
	mark: mark_1,
	isIgnored: isIgnored_1,
	childrenIgnored: childrenIgnored_1
};

var sync = globSync;
globSync.GlobSync = GlobSync;
var setopts$1 = common.setopts;
var ownProp$1 = common.ownProp;
var childrenIgnored$1 = common.childrenIgnored;
var isIgnored$1 = common.isIgnored;

function globSync (pattern, options) {
  if (typeof options === 'function' || arguments.length === 3)
    throw new TypeError('callback provided to sync glob\n'+
                        'See: https://github.com/isaacs/node-glob/issues/167')

  return new GlobSync(pattern, options).found
}

function GlobSync (pattern, options) {
  if (!pattern)
    throw new Error('must provide pattern')

  if (typeof options === 'function' || arguments.length === 3)
    throw new TypeError('callback provided to sync glob\n'+
                        'See: https://github.com/isaacs/node-glob/issues/167')

  if (!(this instanceof GlobSync))
    return new GlobSync(pattern, options)

  setopts$1(this, pattern, options);

  if (this.noprocess)
    return this

  var n = this.minimatch.set.length;
  this.matches = new Array(n);
  for (var i = 0; i < n; i ++) {
    this._process(this.minimatch.set[i], i, false);
  }
  this._finish();
}

GlobSync.prototype._finish = function () {
  assert(this instanceof GlobSync);
  if (this.realpath) {
    var self = this;
    this.matches.forEach(function (matchset, index) {
      var set = self.matches[index] = Object.create(null);
      for (var p in matchset) {
        try {
          p = self._makeAbs(p);
          var real = fs_realpath.realpathSync(p, self.realpathCache);
          set[real] = true;
        } catch (er) {
          if (er.syscall === 'stat')
            set[self._makeAbs(p)] = true;
          else
            throw er
        }
      }
    });
  }
  common.finish(this);
};


GlobSync.prototype._process = function (pattern, index, inGlobStar) {
  assert(this instanceof GlobSync);

  // Get the first [n] parts of pattern that are all strings.
  var n = 0;
  while (typeof pattern[n] === 'string') {
    n ++;
  }
  // now n is the index of the first one that is *not* a string.

  // See if there's anything else
  var prefix;
  switch (n) {
    // if not, then this is rather simple
    case pattern.length:
      this._processSimple(pattern.join('/'), index);
      return

    case 0:
      // pattern *starts* with some non-trivial item.
      // going to readdir(cwd), but not include the prefix in matches.
      prefix = null;
      break

    default:
      // pattern has some string bits in the front.
      // whatever it starts with, whether that's 'absolute' like /foo/bar,
      // or 'relative' like '../baz'
      prefix = pattern.slice(0, n).join('/');
      break
  }

  var remain = pattern.slice(n);

  // get the list of entries.
  var read;
  if (prefix === null)
    read = '.';
  else if (pathIsAbsolute(prefix) || pathIsAbsolute(pattern.join('/'))) {
    if (!prefix || !pathIsAbsolute(prefix))
      prefix = '/' + prefix;
    read = prefix;
  } else
    read = prefix;

  var abs = this._makeAbs(read);

  //if ignored, skip processing
  if (childrenIgnored$1(this, read))
    return

  var isGlobStar = remain[0] === minimatch_1.GLOBSTAR;
  if (isGlobStar)
    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar);
  else
    this._processReaddir(prefix, read, abs, remain, index, inGlobStar);
};


GlobSync.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar) {
  var entries = this._readdir(abs, inGlobStar);

  // if the abs isn't a dir, then nothing can match!
  if (!entries)
    return

  // It will only match dot entries if it starts with a dot, or if
  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
  var pn = remain[0];
  var negate = !!this.minimatch.negate;
  var rawGlob = pn._glob;
  var dotOk = this.dot || rawGlob.charAt(0) === '.';

  var matchedEntries = [];
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (e.charAt(0) !== '.' || dotOk) {
      var m;
      if (negate && !prefix) {
        m = !e.match(pn);
      } else {
        m = e.match(pn);
      }
      if (m)
        matchedEntries.push(e);
    }
  }

  var len = matchedEntries.length;
  // If there are no matched entries, then nothing matches.
  if (len === 0)
    return

  // if this is the last remaining pattern bit, then no need for
  // an additional stat *unless* the user has specified mark or
  // stat explicitly.  We know they exist, since readdir returned
  // them.

  if (remain.length === 1 && !this.mark && !this.stat) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null);

    for (var i = 0; i < len; i ++) {
      var e = matchedEntries[i];
      if (prefix) {
        if (prefix.slice(-1) !== '/')
          e = prefix + '/' + e;
        else
          e = prefix + e;
      }

      if (e.charAt(0) === '/' && !this.nomount) {
        e = path.join(this.root, e);
      }
      this._emitMatch(index, e);
    }
    // This was the last one, and no stats were needed
    return
  }

  // now test all matched entries as stand-ins for that part
  // of the pattern.
  remain.shift();
  for (var i = 0; i < len; i ++) {
    var e = matchedEntries[i];
    var newPattern;
    if (prefix)
      newPattern = [prefix, e];
    else
      newPattern = [e];
    this._process(newPattern.concat(remain), index, inGlobStar);
  }
};


GlobSync.prototype._emitMatch = function (index, e) {
  if (isIgnored$1(this, e))
    return

  var abs = this._makeAbs(e);

  if (this.mark)
    e = this._mark(e);

  if (this.absolute) {
    e = abs;
  }

  if (this.matches[index][e])
    return

  if (this.nodir) {
    var c = this.cache[abs];
    if (c === 'DIR' || Array.isArray(c))
      return
  }

  this.matches[index][e] = true;

  if (this.stat)
    this._stat(e);
};


GlobSync.prototype._readdirInGlobStar = function (abs) {
  // follow all symlinked directories forever
  // just proceed as if this is a non-globstar situation
  if (this.follow)
    return this._readdir(abs, false)

  var entries;
  var lstat;
  try {
    lstat = fs.lstatSync(abs);
  } catch (er) {
    if (er.code === 'ENOENT') {
      // lstat failed, doesn't exist
      return null
    }
  }

  var isSym = lstat && lstat.isSymbolicLink();
  this.symlinks[abs] = isSym;

  // If it's not a symlink or a dir, then it's definitely a regular file.
  // don't bother doing a readdir in that case.
  if (!isSym && lstat && !lstat.isDirectory())
    this.cache[abs] = 'FILE';
  else
    entries = this._readdir(abs, false);

  return entries
};

GlobSync.prototype._readdir = function (abs, inGlobStar) {

  if (inGlobStar && !ownProp$1(this.symlinks, abs))
    return this._readdirInGlobStar(abs)

  if (ownProp$1(this.cache, abs)) {
    var c = this.cache[abs];
    if (!c || c === 'FILE')
      return null

    if (Array.isArray(c))
      return c
  }

  try {
    return this._readdirEntries(abs, fs.readdirSync(abs))
  } catch (er) {
    this._readdirError(abs, er);
    return null
  }
};

GlobSync.prototype._readdirEntries = function (abs, entries) {
  // if we haven't asked to stat everything, then just
  // assume that everything in there exists, so we can avoid
  // having to stat it a second time.
  if (!this.mark && !this.stat) {
    for (var i = 0; i < entries.length; i ++) {
      var e = entries[i];
      if (abs === '/')
        e = abs + e;
      else
        e = abs + '/' + e;
      this.cache[e] = true;
    }
  }

  this.cache[abs] = entries;

  // mark and cache dir-ness
  return entries
};

GlobSync.prototype._readdirError = function (f, er) {
  // handle errors, and cache the information
  switch (er.code) {
    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
    case 'ENOTDIR': // totally normal. means it *does* exist.
      var abs = this._makeAbs(f);
      this.cache[abs] = 'FILE';
      if (abs === this.cwdAbs) {
        var error = new Error(er.code + ' invalid cwd ' + this.cwd);
        error.path = this.cwd;
        error.code = er.code;
        throw error
      }
      break

    case 'ENOENT': // not terribly unusual
    case 'ELOOP':
    case 'ENAMETOOLONG':
    case 'UNKNOWN':
      this.cache[this._makeAbs(f)] = false;
      break

    default: // some unusual error.  Treat as failure.
      this.cache[this._makeAbs(f)] = false;
      if (this.strict)
        throw er
      if (!this.silent)
        console.error('glob error', er);
      break
  }
};

GlobSync.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar) {

  var entries = this._readdir(abs, inGlobStar);

  // no entries means not a dir, so it can never have matches
  // foo.txt/** doesn't match foo.txt
  if (!entries)
    return

  // test without the globstar, and with every child both below
  // and replacing the globstar.
  var remainWithoutGlobStar = remain.slice(1);
  var gspref = prefix ? [ prefix ] : [];
  var noGlobStar = gspref.concat(remainWithoutGlobStar);

  // the noGlobStar pattern exits the inGlobStar state
  this._process(noGlobStar, index, false);

  var len = entries.length;
  var isSym = this.symlinks[abs];

  // If it's a symlink, and we're in a globstar, then stop
  if (isSym && inGlobStar)
    return

  for (var i = 0; i < len; i++) {
    var e = entries[i];
    if (e.charAt(0) === '.' && !this.dot)
      continue

    // these two cases enter the inGlobStar state
    var instead = gspref.concat(entries[i], remainWithoutGlobStar);
    this._process(instead, index, true);

    var below = gspref.concat(entries[i], remain);
    this._process(below, index, true);
  }
};

GlobSync.prototype._processSimple = function (prefix, index) {
  // XXX review this.  Shouldn't it be doing the mounting etc
  // before doing stat?  kinda weird?
  var exists = this._stat(prefix);

  if (!this.matches[index])
    this.matches[index] = Object.create(null);

  // If it doesn't exist, then just mark the lack of results
  if (!exists)
    return

  if (prefix && pathIsAbsolute(prefix) && !this.nomount) {
    var trail = /[\/\\]$/.test(prefix);
    if (prefix.charAt(0) === '/') {
      prefix = path.join(this.root, prefix);
    } else {
      prefix = path.resolve(this.root, prefix);
      if (trail)
        prefix += '/';
    }
  }

  if (process.platform === 'win32')
    prefix = prefix.replace(/\\/g, '/');

  // Mark this as a match
  this._emitMatch(index, prefix);
};

// Returns either 'DIR', 'FILE', or false
GlobSync.prototype._stat = function (f) {
  var abs = this._makeAbs(f);
  var needDir = f.slice(-1) === '/';

  if (f.length > this.maxLength)
    return false

  if (!this.stat && ownProp$1(this.cache, abs)) {
    var c = this.cache[abs];

    if (Array.isArray(c))
      c = 'DIR';

    // It exists, but maybe not how we need it
    if (!needDir || c === 'DIR')
      return c

    if (needDir && c === 'FILE')
      return false

    // otherwise we have to stat, because maybe c=true
    // if we know it exists, but not what it is.
  }
  var stat = this.statCache[abs];
  if (!stat) {
    var lstat;
    try {
      lstat = fs.lstatSync(abs);
    } catch (er) {
      if (er && (er.code === 'ENOENT' || er.code === 'ENOTDIR')) {
        this.statCache[abs] = false;
        return false
      }
    }

    if (lstat && lstat.isSymbolicLink()) {
      try {
        stat = fs.statSync(abs);
      } catch (er) {
        stat = lstat;
      }
    } else {
      stat = lstat;
    }
  }

  this.statCache[abs] = stat;

  var c = true;
  if (stat)
    c = stat.isDirectory() ? 'DIR' : 'FILE';

  this.cache[abs] = this.cache[abs] || c;

  if (needDir && c === 'FILE')
    return false

  return c
};

GlobSync.prototype._mark = function (p) {
  return common.mark(this, p)
};

GlobSync.prototype._makeAbs = function (f) {
  return common.makeAbs(this, f)
};

// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
var wrappy_1 = wrappy;
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k];
  });

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    var ret = fn.apply(this, args);
    var cb = args[args.length-1];
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k];
      });
    }
    return ret
  }
}

var once_1 = wrappy_1(once);
var strict = wrappy_1(onceStrict);

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  });

  Object.defineProperty(Function.prototype, 'onceStrict', {
    value: function () {
      return onceStrict(this)
    },
    configurable: true
  });
});

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true;
    return f.value = fn.apply(this, arguments)
  };
  f.called = false;
  return f
}

function onceStrict (fn) {
  var f = function () {
    if (f.called)
      throw new Error(f.onceError)
    f.called = true;
    return f.value = fn.apply(this, arguments)
  };
  var name = fn.name || 'Function wrapped with `once`';
  f.onceError = name + " shouldn't be called more than once";
  f.called = false;
  return f
}
once_1.strict = strict;

var reqs = Object.create(null);


var inflight_1 = wrappy_1(inflight);

function inflight (key, cb) {
  if (reqs[key]) {
    reqs[key].push(cb);
    return null
  } else {
    reqs[key] = [cb];
    return makeres(key)
  }
}

function makeres (key) {
  return once_1(function RES () {
    var cbs = reqs[key];
    var len = cbs.length;
    var args = slice(arguments);

    // XXX It's somewhat ambiguous whether a new callback added in this
    // pass should be queued for later execution if something in the
    // list of callbacks throws, or if it should just be discarded.
    // However, it's such an edge case that it hardly matters, and either
    // choice is likely as surprising as the other.
    // As it happens, we do go ahead and schedule it for later execution.
    try {
      for (var i = 0; i < len; i++) {
        cbs[i].apply(null, args);
      }
    } finally {
      if (cbs.length > len) {
        // added more in the interim.
        // de-zalgo, just in case, but don't call again.
        cbs.splice(0, len);
        process.nextTick(function () {
          RES.apply(null, args);
        });
      } else {
        delete reqs[key];
      }
    }
  })
}

function slice (args) {
  var length = args.length;
  var array = [];

  for (var i = 0; i < length; i++) array[i] = args[i];
  return array
}

// Approach:
//
// 1. Get the minimatch set
// 2. For each pattern in the set, PROCESS(pattern, false)
// 3. Store matches per-set, then uniq them
//
// PROCESS(pattern, inGlobStar)
// Get the first [n] items from pattern that are all strings
// Join these together.  This is PREFIX.
//   If there is no more remaining, then stat(PREFIX) and
//   add to matches if it succeeds.  END.
//
// If inGlobStar and PREFIX is symlink and points to dir
//   set ENTRIES = []
// else readdir(PREFIX) as ENTRIES
//   If fail, END
//
// with ENTRIES
//   If pattern[n] is GLOBSTAR
//     // handle the case where the globstar match is empty
//     // by pruning it out, and testing the resulting pattern
//     PROCESS(pattern[0..n] + pattern[n+1 .. $], false)
//     // handle other cases.
//     for ENTRY in ENTRIES (not dotfiles)
//       // attach globstar + tail onto the entry
//       // Mark that this entry is a globstar match
//       PROCESS(pattern[0..n] + ENTRY + pattern[n .. $], true)
//
//   else // not globstar
//     for ENTRY in ENTRIES (not dotfiles, unless pattern[n] is dot)
//       Test ENTRY against pattern[n]
//       If fails, continue
//       If passes, PROCESS(pattern[0..n] + item + pattern[n+1 .. $])
//
// Caveat:
//   Cache all stats and readdirs results to minimize syscall.  Since all
//   we ever care about is existence and directory-ness, we can just keep
//   `true` for files, and [children,...] for directories, or `false` for
//   things that don't exist.

var glob_1 = glob;

var EE = events.EventEmitter;
var setopts$2 = common.setopts;
var ownProp$2 = common.ownProp;


var childrenIgnored$2 = common.childrenIgnored;
var isIgnored$2 = common.isIgnored;



function glob (pattern, options, cb) {
  if (typeof options === 'function') cb = options, options = {};
  if (!options) options = {};

  if (options.sync) {
    if (cb)
      throw new TypeError('callback provided to sync glob')
    return sync(pattern, options)
  }

  return new Glob$1(pattern, options, cb)
}

glob.sync = sync;
var GlobSync$1 = glob.GlobSync = sync.GlobSync;

// old api surface
glob.glob = glob;

function extend (origin, add) {
  if (add === null || typeof add !== 'object') {
    return origin
  }

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin
}

glob.hasMagic = function (pattern, options_) {
  var options = extend({}, options_);
  options.noprocess = true;

  var g = new Glob$1(pattern, options);
  var set = g.minimatch.set;

  if (!pattern)
    return false

  if (set.length > 1)
    return true

  for (var j = 0; j < set[0].length; j++) {
    if (typeof set[0][j] !== 'string')
      return true
  }

  return false
};

glob.Glob = Glob$1;
inherits(Glob$1, EE);
function Glob$1 (pattern, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = null;
  }

  if (options && options.sync) {
    if (cb)
      throw new TypeError('callback provided to sync glob')
    return new GlobSync$1(pattern, options)
  }

  if (!(this instanceof Glob$1))
    return new Glob$1(pattern, options, cb)

  setopts$2(this, pattern, options);
  this._didRealPath = false;

  // process each pattern in the minimatch set
  var n = this.minimatch.set.length;

  // The matches are stored as {<filename>: true,...} so that
  // duplicates are automagically pruned.
  // Later, we do an Object.keys() on these.
  // Keep them as a list so we can fill in when nonull is set.
  this.matches = new Array(n);

  if (typeof cb === 'function') {
    cb = once_1(cb);
    this.on('error', cb);
    this.on('end', function (matches) {
      cb(null, matches);
    });
  }

  var self = this;
  this._processing = 0;

  this._emitQueue = [];
  this._processQueue = [];
  this.paused = false;

  if (this.noprocess)
    return this

  if (n === 0)
    return done()

  var sync$$1 = true;
  for (var i = 0; i < n; i ++) {
    this._process(this.minimatch.set[i], i, false, done);
  }
  sync$$1 = false;

  function done () {
    --self._processing;
    if (self._processing <= 0) {
      if (sync$$1) {
        process.nextTick(function () {
          self._finish();
        });
      } else {
        self._finish();
      }
    }
  }
}

Glob$1.prototype._finish = function () {
  assert(this instanceof Glob$1);
  if (this.aborted)
    return

  if (this.realpath && !this._didRealpath)
    return this._realpath()

  common.finish(this);
  this.emit('end', this.found);
};

Glob$1.prototype._realpath = function () {
  if (this._didRealpath)
    return

  this._didRealpath = true;

  var n = this.matches.length;
  if (n === 0)
    return this._finish()

  var self = this;
  for (var i = 0; i < this.matches.length; i++)
    this._realpathSet(i, next);

  function next () {
    if (--n === 0)
      self._finish();
  }
};

Glob$1.prototype._realpathSet = function (index, cb) {
  var matchset = this.matches[index];
  if (!matchset)
    return cb()

  var found = Object.keys(matchset);
  var self = this;
  var n = found.length;

  if (n === 0)
    return cb()

  var set = this.matches[index] = Object.create(null);
  found.forEach(function (p, i) {
    // If there's a problem with the stat, then it means that
    // one or more of the links in the realpath couldn't be
    // resolved.  just return the abs value in that case.
    p = self._makeAbs(p);
    fs_realpath.realpath(p, self.realpathCache, function (er, real) {
      if (!er)
        set[real] = true;
      else if (er.syscall === 'stat')
        set[p] = true;
      else
        self.emit('error', er); // srsly wtf right here

      if (--n === 0) {
        self.matches[index] = set;
        cb();
      }
    });
  });
};

Glob$1.prototype._mark = function (p) {
  return common.mark(this, p)
};

Glob$1.prototype._makeAbs = function (f) {
  return common.makeAbs(this, f)
};

Glob$1.prototype.abort = function () {
  this.aborted = true;
  this.emit('abort');
};

Glob$1.prototype.pause = function () {
  if (!this.paused) {
    this.paused = true;
    this.emit('pause');
  }
};

Glob$1.prototype.resume = function () {
  if (this.paused) {
    this.emit('resume');
    this.paused = false;
    if (this._emitQueue.length) {
      var eq = this._emitQueue.slice(0);
      this._emitQueue.length = 0;
      for (var i = 0; i < eq.length; i ++) {
        var e = eq[i];
        this._emitMatch(e[0], e[1]);
      }
    }
    if (this._processQueue.length) {
      var pq = this._processQueue.slice(0);
      this._processQueue.length = 0;
      for (var i = 0; i < pq.length; i ++) {
        var p = pq[i];
        this._processing--;
        this._process(p[0], p[1], p[2], p[3]);
      }
    }
  }
};

Glob$1.prototype._process = function (pattern, index, inGlobStar, cb) {
  assert(this instanceof Glob$1);
  assert(typeof cb === 'function');

  if (this.aborted)
    return

  this._processing++;
  if (this.paused) {
    this._processQueue.push([pattern, index, inGlobStar, cb]);
    return
  }

  //console.error('PROCESS %d', this._processing, pattern)

  // Get the first [n] parts of pattern that are all strings.
  var n = 0;
  while (typeof pattern[n] === 'string') {
    n ++;
  }
  // now n is the index of the first one that is *not* a string.

  // see if there's anything else
  var prefix;
  switch (n) {
    // if not, then this is rather simple
    case pattern.length:
      this._processSimple(pattern.join('/'), index, cb);
      return

    case 0:
      // pattern *starts* with some non-trivial item.
      // going to readdir(cwd), but not include the prefix in matches.
      prefix = null;
      break

    default:
      // pattern has some string bits in the front.
      // whatever it starts with, whether that's 'absolute' like /foo/bar,
      // or 'relative' like '../baz'
      prefix = pattern.slice(0, n).join('/');
      break
  }

  var remain = pattern.slice(n);

  // get the list of entries.
  var read;
  if (prefix === null)
    read = '.';
  else if (pathIsAbsolute(prefix) || pathIsAbsolute(pattern.join('/'))) {
    if (!prefix || !pathIsAbsolute(prefix))
      prefix = '/' + prefix;
    read = prefix;
  } else
    read = prefix;

  var abs = this._makeAbs(read);

  //if ignored, skip _processing
  if (childrenIgnored$2(this, read))
    return cb()

  var isGlobStar = remain[0] === minimatch_1.GLOBSTAR;
  if (isGlobStar)
    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb);
  else
    this._processReaddir(prefix, read, abs, remain, index, inGlobStar, cb);
};

Glob$1.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar, cb) {
  var self = this;
  this._readdir(abs, inGlobStar, function (er, entries) {
    return self._processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
  });
};

Glob$1.prototype._processReaddir2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {

  // if the abs isn't a dir, then nothing can match!
  if (!entries)
    return cb()

  // It will only match dot entries if it starts with a dot, or if
  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
  var pn = remain[0];
  var negate = !!this.minimatch.negate;
  var rawGlob = pn._glob;
  var dotOk = this.dot || rawGlob.charAt(0) === '.';

  var matchedEntries = [];
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (e.charAt(0) !== '.' || dotOk) {
      var m;
      if (negate && !prefix) {
        m = !e.match(pn);
      } else {
        m = e.match(pn);
      }
      if (m)
        matchedEntries.push(e);
    }
  }

  //console.error('prd2', prefix, entries, remain[0]._glob, matchedEntries)

  var len = matchedEntries.length;
  // If there are no matched entries, then nothing matches.
  if (len === 0)
    return cb()

  // if this is the last remaining pattern bit, then no need for
  // an additional stat *unless* the user has specified mark or
  // stat explicitly.  We know they exist, since readdir returned
  // them.

  if (remain.length === 1 && !this.mark && !this.stat) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null);

    for (var i = 0; i < len; i ++) {
      var e = matchedEntries[i];
      if (prefix) {
        if (prefix !== '/')
          e = prefix + '/' + e;
        else
          e = prefix + e;
      }

      if (e.charAt(0) === '/' && !this.nomount) {
        e = path.join(this.root, e);
      }
      this._emitMatch(index, e);
    }
    // This was the last one, and no stats were needed
    return cb()
  }

  // now test all matched entries as stand-ins for that part
  // of the pattern.
  remain.shift();
  for (var i = 0; i < len; i ++) {
    var e = matchedEntries[i];
    if (prefix) {
      if (prefix !== '/')
        e = prefix + '/' + e;
      else
        e = prefix + e;
    }
    this._process([e].concat(remain), index, inGlobStar, cb);
  }
  cb();
};

Glob$1.prototype._emitMatch = function (index, e) {
  if (this.aborted)
    return

  if (isIgnored$2(this, e))
    return

  if (this.paused) {
    this._emitQueue.push([index, e]);
    return
  }

  var abs = pathIsAbsolute(e) ? e : this._makeAbs(e);

  if (this.mark)
    e = this._mark(e);

  if (this.absolute)
    e = abs;

  if (this.matches[index][e])
    return

  if (this.nodir) {
    var c = this.cache[abs];
    if (c === 'DIR' || Array.isArray(c))
      return
  }

  this.matches[index][e] = true;

  var st = this.statCache[abs];
  if (st)
    this.emit('stat', e, st);

  this.emit('match', e);
};

Glob$1.prototype._readdirInGlobStar = function (abs, cb) {
  if (this.aborted)
    return

  // follow all symlinked directories forever
  // just proceed as if this is a non-globstar situation
  if (this.follow)
    return this._readdir(abs, false, cb)

  var lstatkey = 'lstat\0' + abs;
  var self = this;
  var lstatcb = inflight_1(lstatkey, lstatcb_);

  if (lstatcb)
    fs.lstat(abs, lstatcb);

  function lstatcb_ (er, lstat) {
    if (er && er.code === 'ENOENT')
      return cb()

    var isSym = lstat && lstat.isSymbolicLink();
    self.symlinks[abs] = isSym;

    // If it's not a symlink or a dir, then it's definitely a regular file.
    // don't bother doing a readdir in that case.
    if (!isSym && lstat && !lstat.isDirectory()) {
      self.cache[abs] = 'FILE';
      cb();
    } else
      self._readdir(abs, false, cb);
  }
};

Glob$1.prototype._readdir = function (abs, inGlobStar, cb) {
  if (this.aborted)
    return

  cb = inflight_1('readdir\0'+abs+'\0'+inGlobStar, cb);
  if (!cb)
    return

  //console.error('RD %j %j', +inGlobStar, abs)
  if (inGlobStar && !ownProp$2(this.symlinks, abs))
    return this._readdirInGlobStar(abs, cb)

  if (ownProp$2(this.cache, abs)) {
    var c = this.cache[abs];
    if (!c || c === 'FILE')
      return cb()

    if (Array.isArray(c))
      return cb(null, c)
  }
  fs.readdir(abs, readdirCb(this, abs, cb));
};

function readdirCb (self, abs, cb) {
  return function (er, entries) {
    if (er)
      self._readdirError(abs, er, cb);
    else
      self._readdirEntries(abs, entries, cb);
  }
}

Glob$1.prototype._readdirEntries = function (abs, entries, cb) {
  if (this.aborted)
    return

  // if we haven't asked to stat everything, then just
  // assume that everything in there exists, so we can avoid
  // having to stat it a second time.
  if (!this.mark && !this.stat) {
    for (var i = 0; i < entries.length; i ++) {
      var e = entries[i];
      if (abs === '/')
        e = abs + e;
      else
        e = abs + '/' + e;
      this.cache[e] = true;
    }
  }

  this.cache[abs] = entries;
  return cb(null, entries)
};

Glob$1.prototype._readdirError = function (f, er, cb) {
  if (this.aborted)
    return

  // handle errors, and cache the information
  switch (er.code) {
    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
    case 'ENOTDIR': // totally normal. means it *does* exist.
      var abs = this._makeAbs(f);
      this.cache[abs] = 'FILE';
      if (abs === this.cwdAbs) {
        var error = new Error(er.code + ' invalid cwd ' + this.cwd);
        error.path = this.cwd;
        error.code = er.code;
        this.emit('error', error);
        this.abort();
      }
      break

    case 'ENOENT': // not terribly unusual
    case 'ELOOP':
    case 'ENAMETOOLONG':
    case 'UNKNOWN':
      this.cache[this._makeAbs(f)] = false;
      break

    default: // some unusual error.  Treat as failure.
      this.cache[this._makeAbs(f)] = false;
      if (this.strict) {
        this.emit('error', er);
        // If the error is handled, then we abort
        // if not, we threw out of here
        this.abort();
      }
      if (!this.silent)
        console.error('glob error', er);
      break
  }

  return cb()
};

Glob$1.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar, cb) {
  var self = this;
  this._readdir(abs, inGlobStar, function (er, entries) {
    self._processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb);
  });
};


Glob$1.prototype._processGlobStar2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {
  //console.error('pgs2', prefix, remain[0], entries)

  // no entries means not a dir, so it can never have matches
  // foo.txt/** doesn't match foo.txt
  if (!entries)
    return cb()

  // test without the globstar, and with every child both below
  // and replacing the globstar.
  var remainWithoutGlobStar = remain.slice(1);
  var gspref = prefix ? [ prefix ] : [];
  var noGlobStar = gspref.concat(remainWithoutGlobStar);

  // the noGlobStar pattern exits the inGlobStar state
  this._process(noGlobStar, index, false, cb);

  var isSym = this.symlinks[abs];
  var len = entries.length;

  // If it's a symlink, and we're in a globstar, then stop
  if (isSym && inGlobStar)
    return cb()

  for (var i = 0; i < len; i++) {
    var e = entries[i];
    if (e.charAt(0) === '.' && !this.dot)
      continue

    // these two cases enter the inGlobStar state
    var instead = gspref.concat(entries[i], remainWithoutGlobStar);
    this._process(instead, index, true, cb);

    var below = gspref.concat(entries[i], remain);
    this._process(below, index, true, cb);
  }

  cb();
};

Glob$1.prototype._processSimple = function (prefix, index, cb) {
  // XXX review this.  Shouldn't it be doing the mounting etc
  // before doing stat?  kinda weird?
  var self = this;
  this._stat(prefix, function (er, exists) {
    self._processSimple2(prefix, index, er, exists, cb);
  });
};
Glob$1.prototype._processSimple2 = function (prefix, index, er, exists, cb) {

  //console.error('ps2', prefix, exists)

  if (!this.matches[index])
    this.matches[index] = Object.create(null);

  // If it doesn't exist, then just mark the lack of results
  if (!exists)
    return cb()

  if (prefix && pathIsAbsolute(prefix) && !this.nomount) {
    var trail = /[\/\\]$/.test(prefix);
    if (prefix.charAt(0) === '/') {
      prefix = path.join(this.root, prefix);
    } else {
      prefix = path.resolve(this.root, prefix);
      if (trail)
        prefix += '/';
    }
  }

  if (process.platform === 'win32')
    prefix = prefix.replace(/\\/g, '/');

  // Mark this as a match
  this._emitMatch(index, prefix);
  cb();
};

// Returns either 'DIR', 'FILE', or false
Glob$1.prototype._stat = function (f, cb) {
  var abs = this._makeAbs(f);
  var needDir = f.slice(-1) === '/';

  if (f.length > this.maxLength)
    return cb()

  if (!this.stat && ownProp$2(this.cache, abs)) {
    var c = this.cache[abs];

    if (Array.isArray(c))
      c = 'DIR';

    // It exists, but maybe not how we need it
    if (!needDir || c === 'DIR')
      return cb(null, c)

    if (needDir && c === 'FILE')
      return cb()

    // otherwise we have to stat, because maybe c=true
    // if we know it exists, but not what it is.
  }
  var stat = this.statCache[abs];
  if (stat !== undefined) {
    if (stat === false)
      return cb(null, stat)
    else {
      var type = stat.isDirectory() ? 'DIR' : 'FILE';
      if (needDir && type === 'FILE')
        return cb()
      else
        return cb(null, type, stat)
    }
  }

  var self = this;
  var statcb = inflight_1('stat\0' + abs, lstatcb_);
  if (statcb)
    fs.lstat(abs, statcb);

  function lstatcb_ (er, lstat) {
    if (lstat && lstat.isSymbolicLink()) {
      // If it's a symlink, then treat it as the target, unless
      // the target does not exist, then treat it as a file.
      return fs.stat(abs, function (er, stat) {
        if (er)
          self._stat2(f, abs, null, lstat, cb);
        else
          self._stat2(f, abs, er, stat, cb);
      })
    } else {
      self._stat2(f, abs, er, lstat, cb);
    }
  }
};

Glob$1.prototype._stat2 = function (f, abs, er, stat, cb) {
  if (er && (er.code === 'ENOENT' || er.code === 'ENOTDIR')) {
    this.statCache[abs] = false;
    return cb()
  }

  var needDir = f.slice(-1) === '/';
  this.statCache[abs] = stat;

  if (abs.slice(-1) === '/' && stat && !stat.isDirectory())
    return cb(null, false, stat)

  var c = true;
  if (stat)
    c = stat.isDirectory() ? 'DIR' : 'FILE';
  this.cache[abs] = this.cache[abs] || c;

  if (needDir && c === 'FILE')
    return cb()

  return cb(null, c, stat)
};

var recursiveReadDirSync = function recursiveReadDirSync(dir) {
  return fs.readdirSync(dir).reduce(function (files, file) {
    return fs.statSync(path.join(dir, file)).isDirectory() ? files.concat(recursiveReadDirSync(path.join(dir, file))) : files.concat(path.join(dir, file));
  }, []);
};

var readDirSync = function readDirSync(dir) {
  return fs.readdirSync(dir).reduce(function (files, file) {
    return fs.statSync(path.join(dir, file)).isDirectory() ? files : files.concat(path.join(dir, file));
  }, []);
};

var readGlobSync = function readGlobSync(pattern, options) {
  return glob_1.sync(pattern, options);
};

var getSchemaFiles = function getSchemaFiles(dir, recursive, globOptions) {
  if (isGlob(dir)) {
    return readGlobSync(dir, globOptions);
  }

  if (recursive === true) {
    return recursiveReadDirSync(dir);
  }

  return readDirSync(dir);
};

var DEFAULT_EXTENSIONS = ['.ts', '.js', '.gql', '.graphql', '.graphqls'];

var fileLoader = function fileLoader(folderPath) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$recursive = _ref.recursive,
      recursive = _ref$recursive === undefined ? false : _ref$recursive,
      _ref$extensions = _ref.extensions,
      extensions = _ref$extensions === undefined ? DEFAULT_EXTENSIONS : _ref$extensions,
      _ref$globOptions = _ref.globOptions,
      globOptions = _ref$globOptions === undefined ? {} : _ref$globOptions;

  var dir = folderPath;
  var schemafiles = getSchemaFiles(dir, recursive, globOptions);

  var files = schemafiles.map(function (f) {
    return { f, pathObj: path.parse(f) };
  }).filter(function (_ref2) {
    var pathObj = _ref2.pathObj;
    return pathObj.name.toLowerCase() !== 'index';
  }).filter(function (_ref3) {
    var pathObj = _ref3.pathObj;
    return extensions.includes(pathObj.ext);
  }).map(function (_ref4) {
    var f = _ref4.f,
        pathObj = _ref4.pathObj;

    var returnVal = void 0;

    switch (pathObj.ext) {
      case '.ts':
      case '.js':
        {
          var file = require(f); // eslint-disable-line
          returnVal = file.default || file;
          break;
        }

      case '.graphqls':
      case '.gql':
      case '.graphql':
        {
          var _file = fs.readFileSync(f, 'utf8');
          returnVal = _file;
          break;
        }

      default:
      // we don't know how to handle other extensions
    }

    return returnVal;
  }).filter(function (v) {
    return !!v;
  }); // filter files that we don't know how to handle

  return files;
};

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Given maybeArray, print an empty string if it is null or empty, otherwise
 * print all items together separated by separator if provided
 */
function join(maybeArray, separator) {
  return maybeArray ? maybeArray.filter(function (x) {
    return x;
  }).join(separator || '') : '';
}

function addDescription(cb) {
  return function (node) {
    return join([node.description, cb(node)], '\n');
  };
}

function indent(maybeString) {
  return maybeString && `  ${maybeString.replace(/\n/g, '\n  ')}`;
}

/**
 * Given array, print each item on its own line, wrapped in an
 * indented "{ }" block.
 */
function block(array) {
  return array && array.length !== 0 ? `{\n${indent(join(array, '\n'))}\n}` : '';
}

/**
 * If maybeString is not null or empty, then wrap with start and end, otherwise
 * print an empty string.
 */
function wrap(start, maybeString, end) {
  return maybeString ? start + maybeString + (end || '') : '';
}

/**
 * Print a block string in the indented block form by adding a leading and
 * trailing blank line. However, if a block string starts with whitespace and is
 * a single-line, adding a leading blank line would strip that whitespace.
 */
function printBlockString(value, isDescription) {
  var escaped = value.replace(/"""/g, '\\"""');
  return (value[0] === ' ' || value[0] === '\t') && value.indexOf('\n') === -1 ? `"""${escaped.replace(/"$/, '"\n')}"""` : `"""\n${isDescription ? escaped : indent(escaped)}\n"""`;
}

var printDocASTReducer = {
  Name: function Name(node) {
    return node.value;
  },
  Variable: function Variable(node) {
    return `$${node.name}`;
  },

  // Document

  Document: function Document(node) {
    return `${node.definitions.map(function (defNode) {
      return `${defNode}\n${defNode[0] === '#' ? '' : '\n'}`;
    }).join('').trim()}\n`;
  },

  OperationDefinition(node) {
    var op = node.operation;
    var name = node.name;
    var varDefs = wrap('(', join(node.variableDefinitions, ', '), ')');
    var directives = join(node.directives, ' ');
    var selectionSet = node.selectionSet;
    // Anonymous queries with no directives or variable definitions can use
    // the query short form.
    return !name && !directives && !varDefs && op === 'query' ? selectionSet : join([op, join([name, varDefs]), directives, selectionSet], ' ');
  },

  VariableDefinition: function VariableDefinition(_ref) {
    var variable = _ref.variable,
        type = _ref.type,
        defaultValue = _ref.defaultValue;
    return `${variable}: ${type}${wrap(' = ', defaultValue)}`;
  },

  SelectionSet: function SelectionSet(_ref2) {
    var selections = _ref2.selections;
    return block(selections);
  },

  Field: function Field(_ref3) {
    var alias = _ref3.alias,
        name = _ref3.name,
        args = _ref3.arguments,
        directives = _ref3.directives,
        selectionSet = _ref3.selectionSet;
    return join([wrap('', alias, ': ') + name + wrap('(', join(args, ', '), ')'), join(directives, ' '), selectionSet], '  ');
  },

  Argument: function Argument(_ref4) {
    var name = _ref4.name,
        value = _ref4.value;
    return `${name}: ${value}`;
  },

  // Fragments

  FragmentSpread: function FragmentSpread(_ref5) {
    var name = _ref5.name,
        directives = _ref5.directives;
    return `...${name}${wrap(' ', join(directives, ' '))}`;
  },

  InlineFragment: function InlineFragment(_ref6) {
    var typeCondition = _ref6.typeCondition,
        directives = _ref6.directives,
        selectionSet = _ref6.selectionSet;
    return join(['...', wrap('on ', typeCondition), join(directives, ' '), selectionSet], ' ');
  },

  FragmentDefinition: function FragmentDefinition(_ref7) {
    var name = _ref7.name,
        typeCondition = _ref7.typeCondition,
        variableDefinitions = _ref7.variableDefinitions,
        directives = _ref7.directives,
        selectionSet = _ref7.selectionSet;
    return (
      // Note: fragment variable definitions are experimental and may be changed
      // or removed in the future.
      `${`fragment ${name}${wrap('(', join(variableDefinitions, ', '), ')')} ` + `on ${typeCondition} ${wrap('', join(directives, ' '), ' ')}`}${selectionSet}`
    );
  },

  // Value

  IntValue: function IntValue(_ref8) {
    var value = _ref8.value;
    return value;
  },
  FloatValue: function FloatValue(_ref9) {
    var value = _ref9.value;
    return value;
  },
  StringValue: function StringValue(_ref10, key) {
    var value = _ref10.value,
        isBlockString = _ref10.block;
    return isBlockString ? printBlockString(value, key === 'description') : JSON.stringify(value);
  },
  BooleanValue: function BooleanValue(_ref11) {
    var value = _ref11.value;
    return value ? 'true' : 'false';
  },
  NullValue: function NullValue() {
    return 'null';
  },
  EnumValue: function EnumValue(_ref12) {
    var value = _ref12.value;
    return value;
  },
  ListValue: function ListValue(_ref13) {
    var values = _ref13.values;
    return `[${join(values, ', ')}]`;
  },
  ObjectValue: function ObjectValue(_ref14) {
    var fields = _ref14.fields;
    return `{${join(fields, ', ')}}`;
  },
  ObjectField: function ObjectField(_ref15) {
    var name = _ref15.name,
        value = _ref15.value;
    return `${name}: ${value}`;
  },

  // Directive

  Directive: function Directive(_ref16) {
    var name = _ref16.name,
        args = _ref16.arguments;
    return `@${name}${wrap('(', join(args, ', '), ')')}`;
  },

  // Type

  NamedType: function NamedType(_ref17) {
    var name = _ref17.name;
    return name;
  },
  ListType: function ListType(_ref18) {
    var type = _ref18.type;
    return `[${type}]`;
  },
  NonNullType: function NonNullType(_ref19) {
    var type = _ref19.type;
    return `${type}!`;
  },

  // Type System Definitions

  SchemaDefinition: function SchemaDefinition(_ref20) {
    var directives = _ref20.directives,
        operationTypes = _ref20.operationTypes;
    return join(['schema', join(directives, ' '), block(operationTypes)], ' ');
  },

  OperationTypeDefinition: function OperationTypeDefinition(_ref21) {
    var operation = _ref21.operation,
        type = _ref21.type;
    return `${operation}: ${type}`;
  },

  ScalarTypeDefinition: addDescription(function (_ref22) {
    var name = _ref22.name,
        directives = _ref22.directives;
    return join(['scalar', name, join(directives, ' ')], ' ');
  }),

  ObjectTypeDefinition: addDescription(function (_ref23) {
    var name = _ref23.name,
        interfaces = _ref23.interfaces,
        directives = _ref23.directives,
        fields = _ref23.fields;
    return join(['type', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)], ' ');
  }),

  FieldDefinition: addDescription(function (_ref24) {
    var name = _ref24.name,
        args = _ref24.arguments,
        type = _ref24.type,
        directives = _ref24.directives;
    return `${name + wrap('(', join(args, ', '), ')')}: ${type}${wrap(' ', join(directives, ' '))}`;
  }),

  InputValueDefinition: addDescription(function (_ref25) {
    var name = _ref25.name,
        type = _ref25.type,
        defaultValue = _ref25.defaultValue,
        directives = _ref25.directives;
    return join([`${name}: ${type}`, wrap('= ', defaultValue), join(directives, ' ')], ' ');
  }),

  InterfaceTypeDefinition: addDescription(function (_ref26) {
    var name = _ref26.name,
        directives = _ref26.directives,
        fields = _ref26.fields;
    return join(['interface', name, join(directives, ' '), block(fields)], ' ');
  }),

  UnionTypeDefinition: addDescription(function (_ref27) {
    var name = _ref27.name,
        directives = _ref27.directives,
        types = _ref27.types;
    return join(['union', name, join(directives, ' '), types && types.length !== 0 ? `= ${join(types, ' | ')}` : ''], ' ');
  }),

  EnumTypeDefinition: addDescription(function (_ref28) {
    var name = _ref28.name,
        directives = _ref28.directives,
        values = _ref28.values;
    return join(['enum', name, join(directives, ' '), block(values)], ' ');
  }),

  EnumValueDefinition: addDescription(function (_ref29) {
    var name = _ref29.name,
        directives = _ref29.directives;
    return join([name, join(directives, ' ')], ' ');
  }),

  InputObjectTypeDefinition: addDescription(function (_ref30) {
    var name = _ref30.name,
        directives = _ref30.directives,
        fields = _ref30.fields;
    return join(['input', name, join(directives, ' '), block(fields)], ' ');
  }),

  ScalarTypeExtension: function ScalarTypeExtension(_ref31) {
    var name = _ref31.name,
        directives = _ref31.directives;
    return join(['extend scalar', name, join(directives, ' ')], ' ');
  },

  ObjectTypeExtension: function ObjectTypeExtension(_ref32) {
    var name = _ref32.name,
        interfaces = _ref32.interfaces,
        directives = _ref32.directives,
        fields = _ref32.fields;
    return join(['extend type', name, wrap('implements ', join(interfaces, ' & ')), join(directives, ' '), block(fields)], ' ');
  },

  InterfaceTypeExtension: function InterfaceTypeExtension(_ref33) {
    var name = _ref33.name,
        directives = _ref33.directives,
        fields = _ref33.fields;
    return join(['extend interface', name, join(directives, ' '), block(fields)], ' ');
  },

  UnionTypeExtension: function UnionTypeExtension(_ref34) {
    var name = _ref34.name,
        directives = _ref34.directives,
        types = _ref34.types;
    return join(['extend union', name, join(directives, ' '), types && types.length !== 0 ? `= ${join(types, ' | ')}` : ''], ' ');
  },

  EnumTypeExtension: function EnumTypeExtension(_ref35) {
    var name = _ref35.name,
        directives = _ref35.directives,
        values = _ref35.values;
    return join(['extend enum', name, join(directives, ' '), block(values)], ' ');
  },

  InputObjectTypeExtension: function InputObjectTypeExtension(_ref36) {
    var name = _ref36.name,
        directives = _ref36.directives,
        fields = _ref36.fields;
    return join(['extend input', name, join(directives, ' '), block(fields)], ' ');
  },

  DirectiveDefinition: addDescription(function (_ref37) {
    var name = _ref37.name,
        args = _ref37.arguments,
        locations = _ref37.locations;
    return `directive @${name}${wrap('(', join(args, ', '), ')')} on ${join(locations, ' | ')}`;
  }),

  Comment: function Comment(_ref38) {
    var value = _ref38.value;
    return `# ${value.replace(/\n/g, '\n # ')}`;
  }
};

/**
 * Converts an AST into a string, using one set of reasonable
 * formatting rules.
 */
function print(ast) {
  return visitor.visit(ast, { leave: printDocASTReducer });
}

var hasDefinitionWithName = function hasDefinitionWithName(nodes, name) {
  return nodes.findIndex(function (node) {
    return node.name.value === name;
  }) !== -1;
};

var isObjectTypeDefinition = function isObjectTypeDefinition(def) {
  return def.kind === graphql.Kind.OBJECT_TYPE_DEFINITION || def.kind === graphql.Kind.INPUT_OBJECT_TYPE_DEFINITION;
};

var isObjectSchemaDefinition = function isObjectSchemaDefinition(def) {
  return def.kind === graphql.Kind.SCHEMA_DEFINITION;
};

var typesMap = {
  query: 'Query',
  mutation: 'Mutation',
  subscription: 'Subscription'
};

var _mergeableOperationTypes = Object.keys(typesMap);

var _makeOperationType = function _makeOperationType(operation, value) {
  return {
    kind: graphql.Kind.OPERATION_TYPE_DEFINITION,
    operation,
    type: {
      kind: graphql.Kind.NAMED_TYPE,
      name: {
        kind: graphql.Kind.NAME,
        value
      }
    }
  };
};

var mergeableTypes = Object.values(typesMap);

var makeSchema = function makeSchema(definitions, schemaDefs) {
  var operationMap = {
    query: _makeOperationType(_mergeableOperationTypes[0], mergeableTypes[0]),
    mutation: null,
    subscription: null
  };

  mergeableTypes.slice(1).forEach(function (type, key) {
    if (hasDefinitionWithName(definitions, type)) {
      var operation = _mergeableOperationTypes[key + 1];

      operationMap[operation] = _makeOperationType(operation, type);
    }
  });

  var operationTypes = Object.values(operationMap).map(function (operation, i) {
    if (!operation) {
      var type = Object.keys(operationMap)[i];

      if (schemaDefs.some(function (def) {
        return def.operationTypes.some(function (op) {
          return op.operation === type;
        });
      })) {
        return _makeOperationType(type, typesMap[type]);
      }
    }

    return operation;
  }).filter(function (op) {
    return op;
  });

  return {
    kind: graphql.Kind.SCHEMA_DEFINITION,
    directives: [],
    operationTypes
  };
};

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

// NOTE: Currently using a slightly modified print instead of the exported graphql version.

var _isMergeableTypeDefinition = function _isMergeableTypeDefinition(def, all) {
  return isObjectTypeDefinition(def) && (mergeableTypes.includes(def.name.value) || all);
};

var _isNonMergeableTypeDefinition = function _isNonMergeableTypeDefinition(def, all) {
  return !_isMergeableTypeDefinition(def, all);
};

var _makeCommentNode = function _makeCommentNode(value) {
  return { kind: 'Comment', value };
};

var _addCommentsToAST = function _addCommentsToAST(nodes) {
  var flatten = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

  var astWithComments = nodes.map(function (node) {
    var description = buildASTSchema.getDescription(node, { commentDescriptions: true });
    if (description) {
      return [_makeCommentNode(description), node];
    }

    return [node];
  });

  if (flatten) {
    return astWithComments.reduce(function (a, b) {
      return a.concat(b);
    }, []);
  }

  return astWithComments;
};

var _makeRestDefinitions = function _makeRestDefinitions(defs) {
  var all = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  return defs.filter(function (def) {
    return _isNonMergeableTypeDefinition(def, all) && !isObjectSchemaDefinition(def);
  }).map(function (def) {
    if (isObjectTypeDefinition(def)) {
      return _extends({}, def, {
        fields: _addCommentsToAST(def.fields)
      });
    }

    return def;
  });
};

var _makeMergedFieldDefinitions = function _makeMergedFieldDefinitions(merged, candidate) {
  return _addCommentsToAST(candidate.fields).reduce(function (fields, field) {
    var original = merged.fields.find(function (base) {
      return base.name && typeof base.name.value !== 'undefined' && field.name && typeof field.name.value !== 'undefined' && base.name.value === field.name.value;
    });
    if (!original) {
      fields.push(field);
    } else if (field.type.kind === 'NamedType') {
      if (field.type.name.value !== original.type.name.value) {
        throw new Error(`Conflicting types for ${merged.name.value}.${field.name.value}: ` + `${field.type.name.value} != ${original.type.name.value}`);
      }
    } else if (field.type.kind === 'NonNullType') {
      if (field.type.type.name.value !== original.type.type.name.value) {
        throw new Error(`Conflicting types for ${merged.name.value}.${field.name.value}: ` + `${field.type.type.name.value} != ${original.type.type.name.value}`);
      }
    }

    // retain directives of both fields.
    if (original) {
      original.directives = original.directives.concat(field.directives);
    }
    return fields;
  }, merged.fields);
};

var _makeMergedDefinitions = function _makeMergedDefinitions(defs) {
  var all = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  // TODO: This function can be cleaner!
  var groupedMergableDefinitions = defs.filter(function (def) {
    return _isMergeableTypeDefinition(def, all);
  }).reduce(function (mergableDefs, def) {
    var name = def.name.value;

    if (!mergableDefs[name]) {
      return _extends({}, mergableDefs, {
        [name]: _extends({}, def, {
          fields: _addCommentsToAST(def.fields)
        })
      });
    }

    return _extends({}, mergableDefs, {
      [name]: _extends({}, mergableDefs[name], {
        fields: _makeMergedFieldDefinitions(mergableDefs[name], def)
      })
    });
  }, {
    Query: null,
    Mutation: null,
    Subscription: null
  });

  return Object.values(groupedMergableDefinitions).reduce(function (array, def) {
    return def ? [].concat(toConsumableArray(array), [def]) : array;
  }, []);
};

var _makeDocumentWithDefinitions = function _makeDocumentWithDefinitions(definitions) {
  return {
    kind: 'Document',
    definitions: definitions instanceof Array ? definitions : [definitions]
  };
};

var printDefinitions = function printDefinitions(defs) {
  return print(_makeDocumentWithDefinitions(defs));
};

var mergeTypes = function mergeTypes(types) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { all: false };

  var allDefs = types.map(function (type) {
    if (typeof type === 'string') {
      return graphql.parse(type);
    }
    return type;
  }).map(function (ast) {
    return ast.definitions;
  }).reduce(function (defs, newDef) {
    return [].concat(toConsumableArray(defs), toConsumableArray(newDef));
  }, []);

  var mergedDefs = _makeMergedDefinitions(allDefs, options.all);
  var rest = _addCommentsToAST(_makeRestDefinitions(allDefs, options.all), false).map(printDefinitions);
  var schemaDefs = allDefs.filter(isObjectSchemaDefinition);
  var schema = printDefinitions([makeSchema(mergedDefs, schemaDefs)].concat(toConsumableArray(mergedDefs)));

  return [schema].concat(toConsumableArray(rest)).join('\n');
};

var isMergeableObject = function isMergeableObject(value) {
	return isNonNullObject(value)
		&& !isSpecial(value)
};

function isNonNullObject(value) {
	return !!value && typeof value === 'object'
}

function isSpecial(value) {
	var stringValue = Object.prototype.toString.call(value);

	return stringValue === '[object RegExp]'
		|| stringValue === '[object Date]'
		|| isReactElement(value)
}

// see https://github.com/facebook/react/blob/b5ac963fb791d1298e7f396236383bc955f916c1/src/isomorphic/classic/element/ReactElement.js#L21-L25
var canUseSymbol = typeof Symbol === 'function' && Symbol.for;
var REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for('react.element') : 0xeac7;

function isReactElement(value) {
	return value.$$typeof === REACT_ELEMENT_TYPE
}

function emptyTarget(val) {
	return Array.isArray(val) ? [] : {}
}

function cloneUnlessOtherwiseSpecified(value, options) {
	return (options.clone !== false && options.isMergeableObject(value))
		? deepmerge(emptyTarget(value), value, options)
		: value
}

function defaultArrayMerge(target, source, options) {
	return target.concat(source).map(function(element) {
		return cloneUnlessOtherwiseSpecified(element, options)
	})
}

function mergeObject(target, source, options) {
	var destination = {};
	if (options.isMergeableObject(target)) {
		Object.keys(target).forEach(function(key) {
			destination[key] = cloneUnlessOtherwiseSpecified(target[key], options);
		});
	}
	Object.keys(source).forEach(function(key) {
		if (!options.isMergeableObject(source[key]) || !target[key]) {
			destination[key] = cloneUnlessOtherwiseSpecified(source[key], options);
		} else {
			destination[key] = deepmerge(target[key], source[key], options);
		}
	});
	return destination
}

function deepmerge(target, source, options) {
	options = options || {};
	options.arrayMerge = options.arrayMerge || defaultArrayMerge;
	options.isMergeableObject = options.isMergeableObject || isMergeableObject;

	var sourceIsArray = Array.isArray(source);
	var targetIsArray = Array.isArray(target);
	var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;

	if (!sourceAndTargetTypesMatch) {
		return cloneUnlessOtherwiseSpecified(source, options)
	} else if (sourceIsArray) {
		return options.arrayMerge(target, source, options)
	} else {
		return mergeObject(target, source, options)
	}
}

deepmerge.all = function deepmergeAll(array, options) {
	if (!Array.isArray(array)) {
		throw new Error('first argument should be an array')
	}

	return array.reduce(function(prev, next) {
		return deepmerge(prev, next, options)
	}, {})
};

var deepmerge_1 = deepmerge;

var mergeResolvers = function mergeResolvers(resolvers) {
  return resolvers.length === 1 ? resolvers[0] : deepmerge_1.all(resolvers);
};

// Import these two es7 features until we drop Node 4 support

exports.mergeResolvers = mergeResolvers;
exports.mergeTypes = mergeTypes;
exports.fileLoader = fileLoader;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"lodash.property":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/lodash.property/package.json                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "lodash.property";
exports.version = "4.4.2";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/lodash.property/index.js                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** `Object#toString` result references. */
var funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    symbolTag = '[object Symbol]';

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/,
    reLeadingDot = /^\./,
    rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Checks if `value` is a host object in IE < 9.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
 */
function isHostObject(value) {
  // Many host objects are `Object` objects that can coerce to strings
  // despite having improperly defined `toString` methods.
  var result = false;
  if (value != null && typeof value.toString != 'function') {
    try {
      result = !!(value + '');
    } catch (e) {}
  }
  return result;
}

/** Used for built-in method references. */
var arrayProto = Array.prototype,
    funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/** Built-in value references. */
var Symbol = root.Symbol,
    splice = arrayProto.splice;

/* Built-in method references that are verified to be native. */
var Map = getNative(root, 'Map'),
    nativeCreate = getNative(Object, 'create');

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
}

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  return this.has(key) && delete this.__data__[key];
}

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? data[key] !== undefined : hasOwnProperty.call(data, key);
}

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
}

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  return true;
}

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  return getMapData(this, key)['delete'](key);
}

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  getMapData(this, key).set(key, value);
  return this;
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.get` without support for default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path) {
  path = isKey(path, object) ? [path] : castPath(path);

  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return (index && index == length) ? object : undefined;
}

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = (isFunction(value) || isHostObject(value)) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * A specialized version of `baseProperty` which supports deep paths.
 *
 * @private
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function basePropertyDeep(path) {
  return function(object) {
    return baseGet(object, path);
  };
}

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value) {
  return isArray(value) ? value : stringToPath(value);
}

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  if (isArray(value)) {
    return false;
  }
  var type = typeof value;
  if (type == 'number' || type == 'symbol' || type == 'boolean' ||
      value == null || isSymbol(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
    (object != null && value in Object(object));
}

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

/**
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
var stringToPath = memoize(function(string) {
  string = toString(string);

  var result = [];
  if (reLeadingDot.test(string)) {
    result.push('');
  }
  string.replace(rePropName, function(match, number, quote, string) {
    result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
});

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to process.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

/**
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided, it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is used as the map cache key. The `func`
 * is invoked with the `this` binding of the memoized function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the
 * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `delete`, `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoized function.
 * @example
 *
 * var object = { 'a': 1, 'b': 2 };
 * var other = { 'c': 3, 'd': 4 };
 *
 * var values = _.memoize(_.values);
 * values(object);
 * // => [1, 2]
 *
 * values(other);
 * // => [3, 4]
 *
 * object.a = 2;
 * values(object);
 * // => [1, 2]
 *
 * // Modify the result cache.
 * values.cache.set(object, ['a', 'b']);
 * values(object);
 * // => ['a', 'b']
 *
 * // Replace `_.memoize.Cache`.
 * _.memoize.Cache = WeakMap;
 */
function memoize(func, resolver) {
  if (typeof func != 'function' || (resolver && typeof resolver != 'function')) {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments,
        key = resolver ? resolver.apply(this, args) : args[0],
        cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result);
    return result;
  };
  memoized.cache = new (memoize.Cache || MapCache);
  return memoized;
}

// Assign cache to `_.memoize`.
memoize.Cache = MapCache;

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8-9 which returns 'object' for typed array and other constructors.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

/**
 * Creates a function that returns the value at `path` of a given object.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new accessor function.
 * @example
 *
 * var objects = [
 *   { 'a': { 'b': 2 } },
 *   { 'a': { 'b': 1 } }
 * ];
 *
 * _.map(objects, _.property('a.b'));
 * // => [2, 1]
 *
 * _.map(_.sortBy(objects, _.property(['a', 'b'])), 'a.b');
 * // => [1, 2]
 */
function property(path) {
  return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
}

module.exports = property;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"graphql-subscriptions":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/graphql-subscriptions/package.json                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "graphql-subscriptions";
exports.version = "0.5.8";
exports.main = "dist/index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"dist":{"index.js":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/rocketchat_graphql/node_modules/graphql-subscriptions/dist/index.js                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pubsub_1 = require("./pubsub");
exports.PubSub = pubsub_1.PubSub;
var with_filter_1 = require("./with-filter");
exports.withFilter = with_filter_1.withFilter;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}},{
  "extensions": [
    ".js",
    ".json",
    ".graphqls"
  ]
});
require("/node_modules/meteor/rocketchat:graphql/server/settings.js");
var exports = require("/node_modules/meteor/rocketchat:graphql/server/api.js");

/* Exports */
Package._define("rocketchat:graphql", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_graphql.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpncmFwaHFsL3NlcnZlci9zZXR0aW5ncy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpncmFwaHFsL3NlcnZlci9hcGkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvc2NoZW1hLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmdyYXBocWwvc2VydmVyL3N1YnNjcmlwdGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvaGVscGVycy9hdXRoZW50aWNhdGVkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmdyYXBocWwvc2VydmVyL2hlbHBlcnMvZGF0ZVRvRmxvYXQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvbW9ja3MvYWNjb3VudHMvZ3JhcGhxbC1hcGkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL2FjY291bnRzL09hdXRoUHJvdmlkZXItdHlwZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpncmFwaHFsL3NlcnZlci9yZXNvbHZlcnMvYWNjb3VudHMvaW5kZXguanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL2FjY291bnRzL29hdXRoUHJvdmlkZXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmdyYXBocWwvc2VydmVyL3Jlc29sdmVycy9jaGFubmVscy9DaGFubmVsLXR5cGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL2NoYW5uZWxzL0NoYW5uZWxGaWx0ZXItaW5wdXQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL2NoYW5uZWxzL0NoYW5uZWxOYW1lQW5kRGlyZWN0LWlucHV0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmdyYXBocWwvc2VydmVyL3Jlc29sdmVycy9jaGFubmVscy9DaGFubmVsU29ydC1lbnVtLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmdyYXBocWwvc2VydmVyL3Jlc29sdmVycy9jaGFubmVscy9Qcml2YWN5LWVudW0uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL2NoYW5uZWxzL2NoYW5uZWxCeU5hbWUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL2NoYW5uZWxzL2NoYW5uZWxzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmdyYXBocWwvc2VydmVyL3Jlc29sdmVycy9jaGFubmVscy9jaGFubmVsc0J5VXNlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpncmFwaHFsL3NlcnZlci9yZXNvbHZlcnMvY2hhbm5lbHMvY3JlYXRlQ2hhbm5lbC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpncmFwaHFsL3NlcnZlci9yZXNvbHZlcnMvY2hhbm5lbHMvZGlyZWN0Q2hhbm5lbC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpncmFwaHFsL3NlcnZlci9yZXNvbHZlcnMvY2hhbm5lbHMvaGlkZUNoYW5uZWwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL2NoYW5uZWxzL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmdyYXBocWwvc2VydmVyL3Jlc29sdmVycy9jaGFubmVscy9sZWF2ZUNoYW5uZWwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL2NoYW5uZWxzL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmdyYXBocWwvc2VydmVyL3Jlc29sdmVycy9tZXNzYWdlcy9NZXNzYWdlLXR5cGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL21lc3NhZ2VzL01lc3NhZ2VJZGVudGlmaWVyLWlucHV0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmdyYXBocWwvc2VydmVyL3Jlc29sdmVycy9tZXNzYWdlcy9NZXNzYWdlc1dpdGhDdXJzb3ItdHlwZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpncmFwaHFsL3NlcnZlci9yZXNvbHZlcnMvbWVzc2FnZXMvUmVhY3Rpb24tdHlwZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpncmFwaHFsL3NlcnZlci9yZXNvbHZlcnMvbWVzc2FnZXMvYWRkUmVhY3Rpb25Ub01lc3NhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL21lc3NhZ2VzL2NoYXRNZXNzYWdlQWRkZWQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL21lc3NhZ2VzL2RlbGV0ZU1lc3NhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL21lc3NhZ2VzL2VkaXRNZXNzYWdlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmdyYXBocWwvc2VydmVyL3Jlc29sdmVycy9tZXNzYWdlcy9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpncmFwaHFsL3NlcnZlci9yZXNvbHZlcnMvbWVzc2FnZXMvbWVzc2FnZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL21lc3NhZ2VzL3NlbmRNZXNzYWdlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmdyYXBocWwvc2VydmVyL3Jlc29sdmVycy91c2Vycy9Vc2VyLXR5cGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL3VzZXJzL1VzZXJTdGF0dXMtZW51bS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpncmFwaHFsL3NlcnZlci9yZXNvbHZlcnMvdXNlcnMvaW5kZXguanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Z3JhcGhxbC9zZXJ2ZXIvcmVzb2x2ZXJzL3VzZXJzL3NldFN0YXR1cy5qcyJdLCJuYW1lcyI6WyJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJhZGRHcm91cCIsInNlY3Rpb24iLCJhZGQiLCJ0eXBlIiwicHVibGljIiwiZW5hYmxlUXVlcnkiLCJfaWQiLCJ2YWx1ZSIsImdyYXBocWxFeHByZXNzIiwiZ3JhcGhpcWxFeHByZXNzIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwidiIsImpzQWNjb3VudHNDb250ZXh0IiwiSlNBY2NvdW50c0NvbnRleHQiLCJTdWJzY3JpcHRpb25TZXJ2ZXIiLCJleGVjdXRlIiwic3Vic2NyaWJlIiwiTWV0ZW9yIiwiV2ViQXBwIiwiYm9keVBhcnNlciIsImRlZmF1bHQiLCJleHByZXNzIiwiY29ycyIsImV4ZWN1dGFibGVTY2hlbWEiLCJzdWJzY3JpcHRpb25Qb3J0IiwiZ2V0IiwiZ3JhcGhRTFNlcnZlciIsInVzZSIsInJlcSIsInJlcyIsIm5leHQiLCJzdGF0dXMiLCJzZW5kIiwianNvbiIsInJlcXVlc3QiLCJzY2hlbWEiLCJjb250ZXh0IiwiZm9ybWF0RXJyb3IiLCJlIiwibWVzc2FnZSIsImxvY2F0aW9ucyIsInBhdGgiLCJkZWJ1ZyIsImlzRGV2ZWxvcG1lbnQiLCJlbmRwb2ludFVSTCIsInN1YnNjcmlwdGlvbnNFbmRwb2ludCIsInN0YXJ0U3Vic2NyaXB0aW9uU2VydmVyIiwiY3JlYXRlIiwib25Db25uZWN0IiwiY29ubmVjdGlvblBhcmFtcyIsImF1dGhUb2tlbiIsIkF1dGhvcml6YXRpb24iLCJwb3J0IiwiaG9zdCIsInByb2Nlc3MiLCJlbnYiLCJCSU5EX0lQIiwiY29uc29sZSIsImxvZyIsIm9uTGlzdGVuaW5nIiwiY29ubmVjdEhhbmRsZXJzIiwiZXhwb3J0IiwibWFrZUV4ZWN1dGFibGVTY2hlbWEiLCJtZXJnZVR5cGVzIiwibWVyZ2VSZXNvbHZlcnMiLCJjaGFubmVscyIsIm1lc3NhZ2VzIiwiYWNjb3VudHMiLCJ1c2VycyIsInJlc29sdmVycyIsInR5cGVEZWZzIiwibG9nZ2VyIiwicHVic3ViIiwiUHViU3ViIiwiYXV0aGVudGljYXRlZCIsIkFjY291bnRzU2VydmVyIiwiX2F1dGhlbnRpY2F0ZWQiLCJyZXNvbHZlciIsImRhdGVUb0Zsb2F0IiwiZGF0ZSIsIkRhdGUiLCJnZXRUaW1lIiwiQWNjb3VudHMiLCJmdW5jIiwicm9vdCIsImFyZ3MiLCJpbmZvIiwiRXJyb3IiLCJ1c2VyT2JqZWN0IiwicmVzdW1lU2Vzc2lvbiIsIk9iamVjdCIsImFzc2lnbiIsInVzZXIiLCJjcmVhdGVKU0FjY291bnRzR3JhcGhRTCIsIm9hdXRoUHJvdmlkZXJzIiwiT2F1dGhQcm92aWRlclR5cGUiLCJhY2NvdW50c0dyYXBoUUwiLCJleHRlbmRXaXRoUmVzb2x2ZXJzIiwiSFRUUCIsImlzSlNPTiIsIm9iaiIsIkpTT04iLCJwYXJzZSIsIlF1ZXJ5IiwicmVzdWx0IiwiYWJzb2x1dGVVcmwiLCJjb250ZW50IiwicHJvdmlkZXJzIiwiZGF0YSIsIm1hcCIsIm5hbWUiLCJwcm9wZXJ0eSIsIkNoYW5uZWwiLCJpZCIsInQiLCJ1c2VybmFtZXMiLCJmaW5kIiwidSIsInVzZXJuYW1lIiwibWVtYmVycyIsImlkcyIsIm1vZGVscyIsIlN1YnNjcmlwdGlvbnMiLCJmaW5kQnlSb29tSWRXaGVuVXNlcklkRXhpc3RzIiwiZmllbGRzIiwiZmV0Y2giLCJzdWIiLCJVc2VycyIsImZpbmRCeUlkcyIsIm93bmVycyIsImZpbmRPbmVCeVVzZXJuYW1lIiwibnVtYmVyT2ZNZW1iZXJzIiwiZmluZEJ5Um9vbUlkIiwiY291bnQiLCJudW1iZXJPZk1lc3NhZ2VzIiwicmVhZE9ubHkiLCJybyIsImRpcmVjdCIsInByaXZhdGVDaGFubmVsIiwiZmF2b3VyaXRlIiwicm9vbSIsImZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZCIsImYiLCJ1bnNlZW5NZXNzYWdlcyIsInVucmVhZCIsInJvb21QdWJsaWNGaWVsZHMiLCJjaGFubmVsQnlOYW1lIiwicXVlcnkiLCJSb29tcyIsImZpbmRPbmUiLCJvcHRpb25zIiwic29ydCIsImZpbHRlciIsIm5hbWVGaWx0ZXIiLCJ1bmRlZmluZWQiLCIkcmVnZXgiLCJSZWdFeHAiLCJzb3J0QnkiLCJtc2dzIiwicHJpdmFjeSIsIiRuZSIsImNoYW5uZWxzQnlVc2VyIiwidXNlcklkIiwiZmluZE9uZUJ5SWQiLCJyb29tSWRzIiwiZmluZEJ5VXNlcklkIiwicmlkIiwicyIsInJvb21zIiwiTXV0YXRpb24iLCJjcmVhdGVDaGFubmVsIiwiQVBJIiwidmFsaWRhdGUiLCJrZXkiLCJtZW1iZXJzSWQiLCJjaGFubmVsIiwiZGlyZWN0Q2hhbm5lbCIsImNoYW5uZWxJZCIsIiRhbGwiLCJoaWRlQ2hhbm5lbCIsIm9wZW4iLCJydW5Bc1VzZXIiLCJjYWxsIiwibGVhdmVDaGFubmVsIiwiQ2hhbm5lbFR5cGUiLCJDaGFubmVsU29ydCIsIkNoYW5uZWxGaWx0ZXIiLCJQcml2YWN5IiwiQ2hhbm5lbE5hbWVBbmREaXJlY3QiLCJkZXNjcmlwdGlvbiIsImFubm91bmNlbWVudCIsInRvcGljIiwiYXJjaGl2ZWQiLCJNZXNzYWdlIiwiY3JlYXRpb25UaW1lIiwidHMiLCJhdXRob3IiLCJmcm9tU2VydmVyIiwiY2hhbm5lbFJlZiIsIiRpbiIsImMiLCJ1c2VyUmVmIiwibWVudGlvbnMiLCJyZWFjdGlvbnMiLCJrZXlzIiwibGVuZ3RoIiwiZm9yRWFjaCIsImljb24iLCJwdXNoIiwiYWRkUmVhY3Rpb25Ub01lc3NhZ2UiLCJzaG91bGRSZWFjdCIsIlByb21pc2UiLCJyZXNvbHZlIiwibWVzc2FnZUlkIiwiTWVzc2FnZXMiLCJDSEFUX01FU1NBR0VfU1VCU0NSSVBUSU9OX1RPUElDIiwicHVibGlzaE1lc3NhZ2UiLCJ3aXRoRmlsdGVyIiwicHVibGlzaCIsImNoYXRNZXNzYWdlQWRkZWQiLCJzaG91bGRQdWJsaXNoIiwiZGlyZWN0VG8iLCJTdWJzY3JpcHRpb24iLCJhc3luY0l0ZXJhdG9yIiwicGF5bG9hZCIsImNhbGxiYWNrcyIsImRlbGV0ZU1lc3NhZ2UiLCJtc2ciLCJlZGl0TWVzc2FnZSIsInNlbmRNZXNzYWdlIiwiTWVzc2FnZVR5cGUiLCJNZXNzYWdlc1dpdGhDdXJzb3JUeXBlIiwiTWVzc2FnZUlkZW50aWZpZXIiLCJSZWFjdGlvblR5cGUiLCJtZXNzYWdlc1F1ZXJ5IiwibWVzc2FnZXNPcHRpb25zIiwiY2hhbm5lbFF1ZXJ5IiwiaXNQYWdpbmF0aW9uIiwiY3Vyc29yIiwiY2hhbm5lbE5hbWUiLCJlcnJvciIsIm1lc3NhZ2VzQXJyYXkiLCJjdXJzb3JNc2ciLCIkbHQiLCJzZWFyY2hSZWdleCIsImxpbWl0IiwiZXhjbHVkZVNlcnZlciIsIiRleGlzdHMiLCJmaXJzdE1lc3NhZ2UiLCJsYXN0SWQiLCJ0ZXh0IiwibWVzc2FnZVJldHVybiIsInByb2Nlc3NXZWJob29rTWVzc2FnZSIsIlVzZXIiLCJ0b1VwcGVyQ2FzZSIsImF2YXRhciIsIkF2YXRhcnMiLCJtb2RlbCIsInJhd0NvbGxlY3Rpb24iLCJ1cmwiLCJiaW5kRW52aXJvbm1lbnQiLCJmaW5kQnlTdWJzY3JpcHRpb25Vc2VySWQiLCJkaXJlY3RNZXNzYWdlcyIsImZpbmREaXJlY3RSb29tQ29udGFpbmluZ1VzZXJuYW1lIiwic2V0U3RhdHVzIiwiVXNlclR5cGUiLCJVc2VyU3RhdHVzIiwidXBkYXRlIiwiJHNldCIsInRvTG93ZXJDYXNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLFdBQVdDLFFBQVgsQ0FBb0JDLFFBQXBCLENBQTZCLFNBQTdCLEVBQXdDLFlBQVc7QUFDbEQsT0FBS0MsT0FBTCxDQUFhLGFBQWIsRUFBNEIsWUFBVztBQUN0QyxTQUFLQyxHQUFMLENBQVMsaUJBQVQsRUFBNEIsS0FBNUIsRUFBbUM7QUFBRUMsWUFBTSxTQUFSO0FBQW1CQyxjQUFRO0FBQTNCLEtBQW5DO0FBQ0EsU0FBS0YsR0FBTCxDQUFTLGNBQVQsRUFBeUIsSUFBekIsRUFBK0I7QUFBRUMsWUFBTSxTQUFSO0FBQW1CQyxjQUFRLEtBQTNCO0FBQWtDQyxtQkFBYTtBQUFFQyxhQUFLLGlCQUFQO0FBQTBCQyxlQUFPO0FBQWpDO0FBQS9DLEtBQS9CO0FBQ0EsU0FBS0wsR0FBTCxDQUFTLDJCQUFULEVBQXNDLElBQXRDLEVBQTRDO0FBQUVDLFlBQU0sS0FBUjtBQUFlQyxjQUFRLEtBQXZCO0FBQThCQyxtQkFBYTtBQUFFQyxhQUFLLGlCQUFQO0FBQTBCQyxlQUFPO0FBQWpDO0FBQTNDLEtBQTVDO0FBQ0EsR0FKRDtBQUtBLENBTkQsRTs7Ozs7Ozs7Ozs7QUNBQSxJQUFJQyxjQUFKLEVBQW1CQyxlQUFuQjtBQUFtQ0MsT0FBT0MsS0FBUCxDQUFhQyxR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LEtBQWxCLENBQXdCc0IsT0FBeEIsQ0FBZ0N6RCxLQUFLeEYsR0FBckMsQ0FBUDtBQUNBLEtBUlU7QUFERjtBQURNLENBQWpCLEMiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfZ3JhcGhxbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlJvY2tldENoYXQuc2V0dGluZ3MuYWRkR3JvdXAoJ0dlbmVyYWwnLCBmdW5jdGlvbigpIHtcblx0dGhpcy5zZWN0aW9uKCdHcmFwaFFMIEFQSScsIGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWRkKCdHcmFwaHFsX0VuYWJsZWQnLCBmYWxzZSwgeyB0eXBlOiAnYm9vbGVhbicsIHB1YmxpYzogZmFsc2UgfSk7XG5cdFx0dGhpcy5hZGQoJ0dyYXBocWxfQ09SUycsIHRydWUsIHsgdHlwZTogJ2Jvb2xlYW4nLCBwdWJsaWM6IGZhbHNlLCBlbmFibGVRdWVyeTogeyBfaWQ6ICdHcmFwaHFsX0VuYWJsZWQnLCB2YWx1ZTogdHJ1ZSB9IH0pO1xuXHRcdHRoaXMuYWRkKCdHcmFwaHFsX1N1YnNjcmlwdGlvbl9Qb3J0JywgMzEwMCwgeyB0eXBlOiAnaW50JywgcHVibGljOiBmYWxzZSwgZW5hYmxlUXVlcnk6IHsgX2lkOiAnR3JhcGhxbF9FbmFibGVkJywgdmFsdWU6IHRydWUgfSB9KTtcblx0fSk7XG59KTtcbiIsImltcG9ydCB7IGdyYXBocWxFeHByZXNzLCBncmFwaGlxbEV4cHJlc3MgfSBmcm9tICdhcG9sbG8tc2VydmVyLWV4cHJlc3MnO1xuaW1wb3J0IHsgSlNBY2NvdW50c0NvbnRleHQgYXMganNBY2NvdW50c0NvbnRleHQgfSBmcm9tICdAYWNjb3VudHMvZ3JhcGhxbC1hcGknO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uU2VydmVyIH0gZnJvbSAnc3Vic2NyaXB0aW9ucy10cmFuc3BvcnQtd3MnO1xuaW1wb3J0IHsgZXhlY3V0ZSwgc3Vic2NyaWJlIH0gZnJvbSAnZ3JhcGhxbCc7XG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IFdlYkFwcCB9IGZyb20gJ21ldGVvci93ZWJhcHAnO1xuaW1wb3J0IGJvZHlQYXJzZXIgZnJvbSAnYm9keS1wYXJzZXInO1xuaW1wb3J0IGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgY29ycyBmcm9tICdjb3JzJztcblxuaW1wb3J0IHsgZXhlY3V0YWJsZVNjaGVtYSB9IGZyb20gJy4vc2NoZW1hJztcblxuY29uc3Qgc3Vic2NyaXB0aW9uUG9ydCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdHcmFwaHFsX1N1YnNjcmlwdGlvbl9Qb3J0JykgfHwgMzEwMDtcblxuLy8gdGhlIE1ldGVvciBHcmFwaFFMIHNlcnZlciBpcyBhbiBFeHByZXNzIHNlcnZlclxuY29uc3QgZ3JhcGhRTFNlcnZlciA9IGV4cHJlc3MoKTtcblxuaWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdHcmFwaHFsX0NPUlMnKSkge1xuXHRncmFwaFFMU2VydmVyLnVzZShjb3JzKCkpO1xufVxuXG5ncmFwaFFMU2VydmVyLnVzZSgnL2FwaS9ncmFwaHFsJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG5cdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnR3JhcGhxbF9FbmFibGVkJykpIHtcblx0XHRuZXh0KCk7XG5cdH0gZWxzZSB7XG5cdFx0cmVzLnN0YXR1cyg0MDApLnNlbmQoJ0dyYXBocWwgaXMgbm90IGVuYWJsZWQgaW4gdGhpcyBzZXJ2ZXInKTtcblx0fVxufSk7XG5cbmdyYXBoUUxTZXJ2ZXIudXNlKFxuXHQnL2FwaS9ncmFwaHFsJyxcblx0Ym9keVBhcnNlci5qc29uKCksXG5cdGdyYXBocWxFeHByZXNzKChyZXF1ZXN0KSA9PiAoe1xuXHRcdHNjaGVtYTogZXhlY3V0YWJsZVNjaGVtYSxcblx0XHRjb250ZXh0OiBqc0FjY291bnRzQ29udGV4dChyZXF1ZXN0KSxcblx0XHRmb3JtYXRFcnJvcjogKGUpID0+ICh7XG5cdFx0XHRtZXNzYWdlOiBlLm1lc3NhZ2UsXG5cdFx0XHRsb2NhdGlvbnM6IGUubG9jYXRpb25zLFxuXHRcdFx0cGF0aDogZS5wYXRoLFxuXHRcdH0pLFxuXHRcdGRlYnVnOiBNZXRlb3IuaXNEZXZlbG9wbWVudCxcblx0fSkpXG4pO1xuXG5ncmFwaFFMU2VydmVyLnVzZShcblx0Jy9ncmFwaGlxbCcsXG5cdGdyYXBoaXFsRXhwcmVzcyh7XG5cdFx0ZW5kcG9pbnRVUkw6ICcvYXBpL2dyYXBocWwnLFxuXHRcdHN1YnNjcmlwdGlvbnNFbmRwb2ludDogYHdzOi8vbG9jYWxob3N0OiR7IHN1YnNjcmlwdGlvblBvcnQgfWAsXG5cdH0pXG4pO1xuXG5jb25zdCBzdGFydFN1YnNjcmlwdGlvblNlcnZlciA9ICgpID0+IHtcblx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdHcmFwaHFsX0VuYWJsZWQnKSkge1xuXHRcdFN1YnNjcmlwdGlvblNlcnZlci5jcmVhdGUoe1xuXHRcdFx0c2NoZW1hOiBleGVjdXRhYmxlU2NoZW1hLFxuXHRcdFx0ZXhlY3V0ZSxcblx0XHRcdHN1YnNjcmliZSxcblx0XHRcdG9uQ29ubmVjdDogKGNvbm5lY3Rpb25QYXJhbXMpID0+ICh7IGF1dGhUb2tlbjogY29ubmVjdGlvblBhcmFtcy5BdXRob3JpemF0aW9uIH0pLFxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0cG9ydDogc3Vic2NyaXB0aW9uUG9ydCxcblx0XHRcdGhvc3Q6IHByb2Nlc3MuZW52LkJJTkRfSVAgfHwgJzAuMC4wLjAnLFxuXHRcdH0pO1xuXG5cdFx0Y29uc29sZS5sb2coJ0dyYXBoUUwgU3Vic2NyaXB0aW9uIHNlcnZlciBydW5zIG9uIHBvcnQ6Jywgc3Vic2NyaXB0aW9uUG9ydCk7XG5cdH1cbn07XG5cbldlYkFwcC5vbkxpc3RlbmluZygoKSA9PiB7XG5cdHN0YXJ0U3Vic2NyaXB0aW9uU2VydmVyKCk7XG59KTtcblxuLy8gdGhpcyBiaW5kcyB0aGUgc3BlY2lmaWVkIHBhdGhzIHRvIHRoZSBFeHByZXNzIHNlcnZlciBydW5uaW5nIEFwb2xsbyArIEdyYXBoaVFMXG5XZWJBcHAuY29ubmVjdEhhbmRsZXJzLnVzZShncmFwaFFMU2VydmVyKTtcbiIsImltcG9ydCB7IG1ha2VFeGVjdXRhYmxlU2NoZW1hIH0gZnJvbSAnZ3JhcGhxbC10b29scyc7XG5pbXBvcnQgeyBtZXJnZVR5cGVzLCBtZXJnZVJlc29sdmVycyB9IGZyb20gJ21lcmdlLWdyYXBocWwtc2NoZW1hcyc7XG5cbmltcG9ydCAqIGFzIGNoYW5uZWxzIGZyb20gJy4vcmVzb2x2ZXJzL2NoYW5uZWxzJztcbmltcG9ydCAqIGFzIG1lc3NhZ2VzIGZyb20gJy4vcmVzb2x2ZXJzL21lc3NhZ2VzJztcbmltcG9ydCAqIGFzIGFjY291bnRzIGZyb20gJy4vcmVzb2x2ZXJzL2FjY291bnRzJztcbmltcG9ydCAqIGFzIHVzZXJzIGZyb20gJy4vcmVzb2x2ZXJzL3VzZXJzJztcblxuY29uc3Qgc2NoZW1hID0gbWVyZ2VUeXBlcyhbXG5cdGNoYW5uZWxzLnNjaGVtYSxcblx0bWVzc2FnZXMuc2NoZW1hLFxuXHRhY2NvdW50cy5zY2hlbWEsXG5cdHVzZXJzLnNjaGVtYSxcbl0pO1xuXG5jb25zdCByZXNvbHZlcnMgPSBtZXJnZVJlc29sdmVycyhbXG5cdGNoYW5uZWxzLnJlc29sdmVycyxcblx0bWVzc2FnZXMucmVzb2x2ZXJzLFxuXHRhY2NvdW50cy5yZXNvbHZlcnMsXG5cdHVzZXJzLnJlc29sdmVycyxcbl0pO1xuXG5leHBvcnQgY29uc3QgZXhlY3V0YWJsZVNjaGVtYSA9IG1ha2VFeGVjdXRhYmxlU2NoZW1hKHtcblx0dHlwZURlZnM6IFtzY2hlbWFdLFxuXHRyZXNvbHZlcnMsXG5cdGxvZ2dlcjoge1xuXHRcdGxvZzogKGUpID0+IGNvbnNvbGUubG9nKGUpLFxuXHR9LFxufSk7XG4iLCJpbXBvcnQgeyBQdWJTdWIgfSBmcm9tICdncmFwaHFsLXN1YnNjcmlwdGlvbnMnO1xuXG5leHBvcnQgY29uc3QgcHVic3ViID0gbmV3IFB1YlN1YigpO1xuIiwiaW1wb3J0IHsgQWNjb3VudHNTZXJ2ZXIgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDphY2NvdW50cyc7XG4vLyBpbXBvcnQgeyBhdXRoZW50aWNhdGVkIGFzIF9hdXRoZW50aWNhdGVkIH0gZnJvbSAnQGFjY291bnRzL2dyYXBocWwtYXBpJztcbmltcG9ydCB7IGF1dGhlbnRpY2F0ZWQgYXMgX2F1dGhlbnRpY2F0ZWQgfSBmcm9tICcuLi9tb2Nrcy9hY2NvdW50cy9ncmFwaHFsLWFwaSc7XG5cbmV4cG9ydCBjb25zdCBhdXRoZW50aWNhdGVkID0gKHJlc29sdmVyKSA9PiBfYXV0aGVudGljYXRlZChBY2NvdW50c1NlcnZlciwgcmVzb2x2ZXIpO1xuIiwiZXhwb3J0IGZ1bmN0aW9uIGRhdGVUb0Zsb2F0KGRhdGUpIHtcblx0aWYgKGRhdGUpIHtcblx0XHRyZXR1cm4gbmV3IERhdGUoZGF0ZSkuZ2V0VGltZSgpO1xuXHR9XG59XG4iLCIvLyBTYW1lIGFzIGhlcmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9qcy1hY2NvdW50cy9ncmFwaHFsL2Jsb2IvbWFzdGVyL3BhY2thZ2VzL2dyYXBocWwtYXBpL3NyYy91dGlscy9hdXRoZW50aWNhdGVkLXJlc29sdmVyLmpzXG4vLyBleGNlcHQgY29kZSBiZWxvdyB3b3Jrc1xuLy8gSXQgbWlnaHQgYmUgbGlrZSB0aGF0IGJlY2F1c2Ugb2YgYXN5bmMvYXdhaXQsXG4vLyBtYXliZSBQcm9taXNlIGlzIG5vdCB3cmFwcGVkIHdpdGggRmliZXJcbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvYmxvYi9hMzYyZTIwYTM3NTQ3MzYyYjU4MWZlZDUyZjcxNzFkMDIyZTgzYjYyL3BhY2thZ2VzL3Byb21pc2Uvc2VydmVyLmpzXG4vLyBPcGVuZWQgaXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9qcy1hY2NvdW50cy9ncmFwaHFsL2lzc3Vlcy8xNlxuZXhwb3J0IGNvbnN0IGF1dGhlbnRpY2F0ZWQgPSAoQWNjb3VudHMsIGZ1bmMpID0+IChhc3luYyhyb290LCBhcmdzLCBjb250ZXh0LCBpbmZvKSA9PiB7XG5cdGNvbnN0IHsgYXV0aFRva2VuIH0gPSBjb250ZXh0O1xuXG5cdGlmICghYXV0aFRva2VuIHx8IGF1dGhUb2tlbiA9PT0gJycgfHwgYXV0aFRva2VuID09PSBudWxsKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBhdXRob3JpemF0aW9uIHRva2VuIGluIHJlcXVlc3QnKTtcblx0fVxuXG5cdGNvbnN0IHVzZXJPYmplY3QgPSBhd2FpdCBBY2NvdW50cy5yZXN1bWVTZXNzaW9uKGF1dGhUb2tlbik7XG5cblx0aWYgKHVzZXJPYmplY3QgPT09IG51bGwpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgb3IgZXhwaXJlZCB0b2tlbiEnKTtcblx0fVxuXG5cdHJldHVybiBhd2FpdCBmdW5jKHJvb3QsIGFyZ3MsIE9iamVjdC5hc3NpZ24oY29udGV4dCwgeyB1c2VyOiB1c2VyT2JqZWN0IH0pLCBpbmZvKTtcbn0pO1xuIiwiaW1wb3J0IHNjaGVtYSBmcm9tICcuLi8uLi9zY2hlbWFzL2FjY291bnRzL09hdXRoUHJvdmlkZXItdHlwZS5ncmFwaHFscyc7XG5cbmV4cG9ydCB7XG5cdHNjaGVtYSxcbn07XG4iLCJpbXBvcnQgeyBjcmVhdGVKU0FjY291bnRzR3JhcGhRTCB9IGZyb20gJ0BhY2NvdW50cy9ncmFwaHFsLWFwaSc7XG5pbXBvcnQgeyBBY2NvdW50c1NlcnZlciB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmFjY291bnRzJztcbmltcG9ydCB7IG1lcmdlVHlwZXMsIG1lcmdlUmVzb2x2ZXJzIH0gZnJvbSAnbWVyZ2UtZ3JhcGhxbC1zY2hlbWFzJztcblxuLy8gcXVlcmllc1xuaW1wb3J0ICogYXMgb2F1dGhQcm92aWRlcnMgZnJvbSAnLi9vYXV0aFByb3ZpZGVycyc7XG4vLyB0eXBlc1xuaW1wb3J0ICogYXMgT2F1dGhQcm92aWRlclR5cGUgZnJvbSAnLi9PYXV0aFByb3ZpZGVyLXR5cGUnO1xuXG5jb25zdCBhY2NvdW50c0dyYXBoUUwgPSBjcmVhdGVKU0FjY291bnRzR3JhcGhRTChBY2NvdW50c1NlcnZlcik7XG5cbmV4cG9ydCBjb25zdCBzY2hlbWEgPSBtZXJnZVR5cGVzKFtcblx0YWNjb3VudHNHcmFwaFFMLnNjaGVtYSxcblx0b2F1dGhQcm92aWRlcnMuc2NoZW1hLFxuXHRPYXV0aFByb3ZpZGVyVHlwZS5zY2hlbWEsXG5dKTtcblxuZXhwb3J0IGNvbnN0IHJlc29sdmVycyA9IG1lcmdlUmVzb2x2ZXJzKFtcblx0YWNjb3VudHNHcmFwaFFMLmV4dGVuZFdpdGhSZXNvbHZlcnMoe30pLFxuXHRvYXV0aFByb3ZpZGVycy5yZXNvbHZlcixcbl0pO1xuIiwiaW1wb3J0IHsgSFRUUCB9IGZyb20gJ21ldGVvci9odHRwJztcbmltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuXG5pbXBvcnQgc2NoZW1hIGZyb20gJy4uLy4uL3NjaGVtYXMvYWNjb3VudHMvb2F1dGhQcm92aWRlcnMuZ3JhcGhxbHMnO1xuXG5mdW5jdGlvbiBpc0pTT04ob2JqKSB7XG5cdHRyeSB7XG5cdFx0SlNPTi5wYXJzZShvYmopO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59XG5cbmNvbnN0IHJlc29sdmVyID0ge1xuXHRRdWVyeToge1xuXHRcdG9hdXRoUHJvdmlkZXJzOiBhc3luYygpID0+IHtcblx0XHRcdC8vIGRlcGVuZHMgb24gcm9ja2V0Y2hhdDpncmFudCBwYWNrYWdlXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBIVFRQLmdldChNZXRlb3IuYWJzb2x1dGVVcmwoJ19vYXV0aF9hcHBzL3Byb3ZpZGVycycpKS5jb250ZW50O1xuXG5cdFx0XHRcdGlmIChpc0pTT04ocmVzdWx0KSkge1xuXHRcdFx0XHRcdGNvbnN0IHByb3ZpZGVycyA9IEpTT04ucGFyc2UocmVzdWx0KS5kYXRhO1xuXG5cdFx0XHRcdFx0cmV0dXJuIHByb3ZpZGVycy5tYXAoKG5hbWUpID0+ICh7IG5hbWUgfSkpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IHBhcnNlIHRoZSByZXN1bHQnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3JvY2tldGNoYXQ6Z3JhbnQgbm90IGluc3RhbGxlZCcpO1xuXHRcdFx0fVxuXHRcdH0sXG5cdH0sXG59O1xuXG5leHBvcnQge1xuXHRzY2hlbWEsXG5cdHJlc29sdmVyLFxufTtcbiIsImltcG9ydCB7IFJvY2tldENoYXQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuaW1wb3J0IHByb3BlcnR5IGZyb20gJ2xvZGFzaC5wcm9wZXJ0eSc7XG5cbmltcG9ydCBzY2hlbWEgZnJvbSAnLi4vLi4vc2NoZW1hcy9jaGFubmVscy9DaGFubmVsLXR5cGUuZ3JhcGhxbHMnO1xuXG5jb25zdCByZXNvbHZlciA9IHtcblx0Q2hhbm5lbDoge1xuXHRcdGlkOiBwcm9wZXJ0eSgnX2lkJyksXG5cdFx0bmFtZTogKHJvb3QsIGFyZ3MsIHsgdXNlciB9KSA9PiB7XG5cdFx0XHRpZiAocm9vdC50ID09PSAnZCcpIHtcblx0XHRcdFx0cmV0dXJuIHJvb3QudXNlcm5hbWVzLmZpbmQoKHUpID0+IHUgIT09IHVzZXIudXNlcm5hbWUpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gcm9vdC5uYW1lO1xuXHRcdH0sXG5cdFx0bWVtYmVyczogKHJvb3QpID0+IHtcblx0XHRcdGNvbnN0IGlkcyA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZEJ5Um9vbUlkV2hlblVzZXJJZEV4aXN0cyhyb290Ll9pZCwgeyBmaWVsZHM6IHsgJ3UuX2lkJzogMSB9IH0pXG5cdFx0XHRcdC5mZXRjaCgpXG5cdFx0XHRcdC5tYXAoKHN1YikgPT4gc3ViLnUuX2lkKTtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kQnlJZHMoaWRzKS5mZXRjaCgpO1xuXHRcdH0sXG5cdFx0b3duZXJzOiAocm9vdCkgPT4ge1xuXHRcdFx0Ly8gdGhlcmUgbWlnaHQgYmUgbm8gb3duZXJcblx0XHRcdGlmICghcm9vdC51KSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIFtSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlVc2VybmFtZShyb290LnUudXNlcm5hbWUpXTtcblx0XHR9LFxuXHRcdG51bWJlck9mTWVtYmVyczogKHJvb3QpID0+IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZEJ5Um9vbUlkKHJvb3QuX2lkKS5jb3VudCgpLFxuXHRcdG51bWJlck9mTWVzc2FnZXM6IHByb3BlcnR5KCdtc2dzJyksXG5cdFx0cmVhZE9ubHk6IChyb290KSA9PiByb290LnJvID09PSB0cnVlLFxuXHRcdGRpcmVjdDogKHJvb3QpID0+IHJvb3QudCA9PT0gJ2QnLFxuXHRcdHByaXZhdGVDaGFubmVsOiAocm9vdCkgPT4gcm9vdC50ID09PSAncCcsXG5cdFx0ZmF2b3VyaXRlOiAocm9vdCwgYXJncywgeyB1c2VyIH0pID0+IHtcblx0XHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChyb290Ll9pZCwgdXNlci5faWQpO1xuXG5cdFx0XHRyZXR1cm4gcm9vbSAmJiByb29tLmYgPT09IHRydWU7XG5cdFx0fSxcblx0XHR1bnNlZW5NZXNzYWdlczogKHJvb3QsIGFyZ3MsIHsgdXNlciB9KSA9PiB7XG5cdFx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocm9vdC5faWQsIHVzZXIuX2lkKTtcblxuXHRcdFx0cmV0dXJuIChyb29tIHx8IHt9KS51bnJlYWQ7XG5cdFx0fSxcblx0fSxcbn07XG5cbmV4cG9ydCB7XG5cdHNjaGVtYSxcblx0cmVzb2x2ZXIsXG59O1xuIiwiaW1wb3J0IHNjaGVtYSBmcm9tICcuLi8uLi9zY2hlbWFzL2NoYW5uZWxzL0NoYW5uZWxGaWx0ZXItaW5wdXQuZ3JhcGhxbHMnO1xuXG5leHBvcnQge1xuXHRzY2hlbWEsXG59O1xuIiwiaW1wb3J0IHNjaGVtYSBmcm9tICcuLi8uLi9zY2hlbWFzL2NoYW5uZWxzL0NoYW5uZWxOYW1lQW5kRGlyZWN0LWlucHV0LmdyYXBocWxzJztcblxuZXhwb3J0IHtcblx0c2NoZW1hLFxufTtcbiIsImltcG9ydCBzY2hlbWEgZnJvbSAnLi4vLi4vc2NoZW1hcy9jaGFubmVscy9DaGFubmVsU29ydC1lbnVtLmdyYXBocWxzJztcblxuZXhwb3J0IHtcblx0c2NoZW1hLFxufTtcbiIsImltcG9ydCBzY2hlbWEgZnJvbSAnLi4vLi4vc2NoZW1hcy9jaGFubmVscy9Qcml2YWN5LWVudW0uZ3JhcGhxbHMnO1xuXG5leHBvcnQge1xuXHRzY2hlbWEsXG59O1xuIiwiaW1wb3J0IHsgUm9ja2V0Q2hhdCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5cbmltcG9ydCB7IGF1dGhlbnRpY2F0ZWQgfSBmcm9tICcuLi8uLi9oZWxwZXJzL2F1dGhlbnRpY2F0ZWQnO1xuaW1wb3J0IHsgcm9vbVB1YmxpY0ZpZWxkcyB9IGZyb20gJy4vc2V0dGluZ3MnO1xuaW1wb3J0IHNjaGVtYSBmcm9tICcuLi8uLi9zY2hlbWFzL2NoYW5uZWxzL2NoYW5uZWxCeU5hbWUuZ3JhcGhxbHMnO1xuXG5jb25zdCByZXNvbHZlciA9IHtcblx0UXVlcnk6IHtcblx0XHRjaGFubmVsQnlOYW1lOiBhdXRoZW50aWNhdGVkKChyb290LCB7IG5hbWUgfSkgPT4ge1xuXHRcdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHRcdG5hbWUsXG5cdFx0XHRcdHQ6ICdjJyxcblx0XHRcdH07XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lKHF1ZXJ5LCB7XG5cdFx0XHRcdGZpZWxkczogcm9vbVB1YmxpY0ZpZWxkcyxcblx0XHRcdH0pO1xuXHRcdH0pLFxuXHR9LFxufTtcblxuZXhwb3J0IHtcblx0c2NoZW1hLFxuXHRyZXNvbHZlcixcbn07XG4iLCJpbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcblxuaW1wb3J0IHsgYXV0aGVudGljYXRlZCB9IGZyb20gJy4uLy4uL2hlbHBlcnMvYXV0aGVudGljYXRlZCc7XG5pbXBvcnQgeyByb29tUHVibGljRmllbGRzIH0gZnJvbSAnLi9zZXR0aW5ncyc7XG5pbXBvcnQgc2NoZW1hIGZyb20gJy4uLy4uL3NjaGVtYXMvY2hhbm5lbHMvY2hhbm5lbHMuZ3JhcGhxbHMnO1xuXG5jb25zdCByZXNvbHZlciA9IHtcblx0UXVlcnk6IHtcblx0XHRjaGFubmVsczogYXV0aGVudGljYXRlZCgocm9vdCwgYXJncykgPT4ge1xuXHRcdFx0Y29uc3QgcXVlcnkgPSB7fTtcblx0XHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRcdHNvcnQ6IHtcblx0XHRcdFx0XHRuYW1lOiAxLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRmaWVsZHM6IHJvb21QdWJsaWNGaWVsZHMsXG5cdFx0XHR9O1xuXG5cdFx0XHQvLyBGaWx0ZXJcblx0XHRcdGlmICh0eXBlb2YgYXJncy5maWx0ZXIgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdC8vIG5hbWVGaWx0ZXJcblx0XHRcdFx0aWYgKHR5cGVvZiBhcmdzLmZpbHRlci5uYW1lRmlsdGVyICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRxdWVyeS5uYW1lID0ge1xuXHRcdFx0XHRcdFx0JHJlZ2V4OiBuZXcgUmVnRXhwKGFyZ3MuZmlsdGVyLm5hbWVGaWx0ZXIsICdpJyksXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIHNvcnRCeVxuXHRcdFx0XHRpZiAoYXJncy5maWx0ZXIuc29ydEJ5ID09PSAnTlVNQkVSX09GX01FU1NBR0VTJykge1xuXHRcdFx0XHRcdG9wdGlvbnMuc29ydCA9IHtcblx0XHRcdFx0XHRcdG1zZ3M6IC0xLFxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBwcml2YWN5XG5cdFx0XHRcdHN3aXRjaCAoYXJncy5maWx0ZXIucHJpdmFjeSkge1xuXHRcdFx0XHRcdGNhc2UgJ1BSSVZBVEUnOlxuXHRcdFx0XHRcdFx0cXVlcnkudCA9ICdwJztcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ1BVQkxJQyc6XG5cdFx0XHRcdFx0XHRxdWVyeS50ID0ge1xuXHRcdFx0XHRcdFx0XHQkbmU6ICdwJyxcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZChxdWVyeSwgb3B0aW9ucykuZmV0Y2goKTtcblx0XHR9KSxcblx0fSxcbn07XG5cblxuZXhwb3J0IHtcblx0c2NoZW1hLFxuXHRyZXNvbHZlcixcbn07XG4iLCJpbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcblxuaW1wb3J0IHsgYXV0aGVudGljYXRlZCB9IGZyb20gJy4uLy4uL2hlbHBlcnMvYXV0aGVudGljYXRlZCc7XG5pbXBvcnQgeyByb29tUHVibGljRmllbGRzIH0gZnJvbSAnLi9zZXR0aW5ncyc7XG5pbXBvcnQgc2NoZW1hIGZyb20gJy4uLy4uL3NjaGVtYXMvY2hhbm5lbHMvY2hhbm5lbHNCeVVzZXIuZ3JhcGhxbHMnO1xuXG5jb25zdCByZXNvbHZlciA9IHtcblx0UXVlcnk6IHtcblx0XHRjaGFubmVsc0J5VXNlcjogYXV0aGVudGljYXRlZCgocm9vdCwgeyB1c2VySWQgfSkgPT4ge1xuXHRcdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKHVzZXJJZCk7XG5cblx0XHRcdGlmICghdXNlcikge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ05vIHVzZXInKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3Qgcm9vbUlkcyA9IFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZEJ5VXNlcklkKHVzZXJJZCwgeyBmaWVsZHM6IHsgcmlkOiAxIH0gfSkuZmV0Y2goKS5tYXAoKHMpID0+IHMucmlkKTtcblx0XHRcdGNvbnN0IHJvb21zID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5SWRzKHJvb21JZHMsIHtcblx0XHRcdFx0c29ydDoge1xuXHRcdFx0XHRcdG5hbWU6IDEsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZpZWxkczogcm9vbVB1YmxpY0ZpZWxkcyxcblx0XHRcdH0pLmZldGNoKCk7XG5cblx0XHRcdHJldHVybiByb29tcztcblx0XHR9KSxcblx0fSxcbn07XG5cbmV4cG9ydCB7XG5cdHNjaGVtYSxcblx0cmVzb2x2ZXIsXG59O1xuIiwiaW1wb3J0IHsgUm9ja2V0Q2hhdCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5cbmltcG9ydCB7IGF1dGhlbnRpY2F0ZWQgfSBmcm9tICcuLi8uLi9oZWxwZXJzL2F1dGhlbnRpY2F0ZWQnO1xuaW1wb3J0IHNjaGVtYSBmcm9tICcuLi8uLi9zY2hlbWFzL2NoYW5uZWxzL2NyZWF0ZUNoYW5uZWwuZ3JhcGhxbHMnO1xuXG5jb25zdCByZXNvbHZlciA9IHtcblx0TXV0YXRpb246IHtcblx0XHRjcmVhdGVDaGFubmVsOiBhdXRoZW50aWNhdGVkKChyb290LCBhcmdzLCB7IHVzZXIgfSkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Um9ja2V0Q2hhdC5BUEkuY2hhbm5lbHMuY3JlYXRlLnZhbGlkYXRlKHtcblx0XHRcdFx0XHR1c2VyOiB7XG5cdFx0XHRcdFx0XHR2YWx1ZTogdXNlci5faWQsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRuYW1lOiB7XG5cdFx0XHRcdFx0XHR2YWx1ZTogYXJncy5uYW1lLFxuXHRcdFx0XHRcdFx0a2V5OiAnbmFtZScsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRtZW1iZXJzOiB7XG5cdFx0XHRcdFx0XHR2YWx1ZTogYXJncy5tZW1iZXJzSWQsXG5cdFx0XHRcdFx0XHRrZXk6ICdtZW1iZXJzSWQnLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHR0aHJvdyBlO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCB7IGNoYW5uZWwgfSA9IFJvY2tldENoYXQuQVBJLmNoYW5uZWxzLmNyZWF0ZS5leGVjdXRlKHVzZXIuX2lkLCB7XG5cdFx0XHRcdG5hbWU6IGFyZ3MubmFtZSxcblx0XHRcdFx0bWVtYmVyczogYXJncy5tZW1iZXJzSWQsXG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIGNoYW5uZWw7XG5cdFx0fSksXG5cdH0sXG59O1xuXG5leHBvcnQge1xuXHRzY2hlbWEsXG5cdHJlc29sdmVyLFxufTtcbiIsImltcG9ydCB7IFJvY2tldENoYXQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuXG5pbXBvcnQgeyBhdXRoZW50aWNhdGVkIH0gZnJvbSAnLi4vLi4vaGVscGVycy9hdXRoZW50aWNhdGVkJztcbmltcG9ydCB7IHJvb21QdWJsaWNGaWVsZHMgfSBmcm9tICcuL3NldHRpbmdzJztcbmltcG9ydCBzY2hlbWEgZnJvbSAnLi4vLi4vc2NoZW1hcy9jaGFubmVscy9kaXJlY3RDaGFubmVsLmdyYXBocWxzJztcblxuY29uc3QgcmVzb2x2ZXIgPSB7XG5cdFF1ZXJ5OiB7XG5cdFx0ZGlyZWN0Q2hhbm5lbDogYXV0aGVudGljYXRlZCgocm9vdCwgeyB1c2VybmFtZSwgY2hhbm5lbElkIH0sIHsgdXNlciB9KSA9PiB7XG5cdFx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdFx0dDogJ2QnLFxuXHRcdFx0XHR1c2VybmFtZXM6IHVzZXIudXNlcm5hbWUsXG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAodHlwZW9mIHVzZXJuYW1lICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRpZiAodXNlcm5hbWUgPT09IHVzZXIudXNlcm5hbWUpIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1lvdSBjYW5ub3Qgc3BlY2lmeSB5b3VyIHVzZXJuYW1lJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRxdWVyeS51c2VybmFtZXMgPSB7ICRhbGw6IFt1c2VyLnVzZXJuYW1lLCB1c2VybmFtZV0gfTtcblx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIGNoYW5uZWxJZCAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0cXVlcnkuaWQgPSBjaGFubmVsSWQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1VzZSBvbmUgb2YgdGhvc2UgZmllbGRzOiB1c2VybmFtZSwgY2hhbm5lbElkJyk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lKHF1ZXJ5LCB7XG5cdFx0XHRcdGZpZWxkczogcm9vbVB1YmxpY0ZpZWxkcyxcblx0XHRcdH0pO1xuXHRcdH0pLFxuXHR9LFxufTtcblxuZXhwb3J0IHtcblx0c2NoZW1hLFxuXHRyZXNvbHZlcixcbn07XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IFJvY2tldENoYXQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuXG5pbXBvcnQgeyBhdXRoZW50aWNhdGVkIH0gZnJvbSAnLi4vLi4vaGVscGVycy9hdXRoZW50aWNhdGVkJztcbmltcG9ydCBzY2hlbWEgZnJvbSAnLi4vLi4vc2NoZW1hcy9jaGFubmVscy9oaWRlQ2hhbm5lbC5ncmFwaHFscyc7XG5cbmNvbnN0IHJlc29sdmVyID0ge1xuXHRNdXRhdGlvbjoge1xuXHRcdGhpZGVDaGFubmVsOiBhdXRoZW50aWNhdGVkKChyb290LCBhcmdzLCB7IHVzZXIgfSkgPT4ge1xuXHRcdFx0Y29uc3QgY2hhbm5lbCA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmUoe1xuXHRcdFx0XHRfaWQ6IGFyZ3MuY2hhbm5lbElkLFxuXHRcdFx0XHR0OiAnYycsXG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKCFjaGFubmVsKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignZXJyb3Itcm9vbS1ub3QtZm91bmQnLCAnVGhlIHJlcXVpcmVkIFwiY2hhbm5lbElkXCIgcGFyYW0gcHJvdmlkZWQgZG9lcyBub3QgbWF0Y2ggYW55IGNoYW5uZWwnKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3Qgc3ViID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQoY2hhbm5lbC5faWQsIHVzZXIuX2lkKTtcblxuXHRcdFx0aWYgKCFzdWIpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBUaGUgdXNlci9jYWxsZWUgaXMgbm90IGluIHRoZSBjaGFubmVsIFwiJHsgY2hhbm5lbC5uYW1lIH0uYCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghc3ViLm9wZW4pIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBUaGUgY2hhbm5lbCwgJHsgY2hhbm5lbC5uYW1lIH0sIGlzIGFscmVhZHkgY2xvc2VkIHRvIHRoZSBzZW5kZXJgKTtcblx0XHRcdH1cblxuXHRcdFx0TWV0ZW9yLnJ1bkFzVXNlcih1c2VyLl9pZCwgKCkgPT4ge1xuXHRcdFx0XHRNZXRlb3IuY2FsbCgnaGlkZVJvb20nLCBjaGFubmVsLl9pZCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSksXG5cdH0sXG59O1xuXG5leHBvcnQge1xuXHRzY2hlbWEsXG5cdHJlc29sdmVyLFxufTtcbiIsImltcG9ydCB7IG1lcmdlVHlwZXMsIG1lcmdlUmVzb2x2ZXJzIH0gZnJvbSAnbWVyZ2UtZ3JhcGhxbC1zY2hlbWFzJztcblxuLy8gcXVlcmllc1xuaW1wb3J0ICogYXMgY2hhbm5lbHMgZnJvbSAnLi9jaGFubmVscyc7XG5pbXBvcnQgKiBhcyBjaGFubmVsQnlOYW1lIGZyb20gJy4vY2hhbm5lbEJ5TmFtZSc7XG5pbXBvcnQgKiBhcyBkaXJlY3RDaGFubmVsIGZyb20gJy4vZGlyZWN0Q2hhbm5lbCc7XG5pbXBvcnQgKiBhcyBjaGFubmVsc0J5VXNlciBmcm9tICcuL2NoYW5uZWxzQnlVc2VyJztcbi8vIG11dGF0aW9uc1xuaW1wb3J0ICogYXMgY3JlYXRlQ2hhbm5lbCBmcm9tICcuL2NyZWF0ZUNoYW5uZWwnO1xuaW1wb3J0ICogYXMgbGVhdmVDaGFubmVsIGZyb20gJy4vbGVhdmVDaGFubmVsJztcbmltcG9ydCAqIGFzIGhpZGVDaGFubmVsIGZyb20gJy4vaGlkZUNoYW5uZWwnO1xuLy8gdHlwZXNcbmltcG9ydCAqIGFzIENoYW5uZWxUeXBlIGZyb20gJy4vQ2hhbm5lbC10eXBlJztcbmltcG9ydCAqIGFzIENoYW5uZWxTb3J0IGZyb20gJy4vQ2hhbm5lbFNvcnQtZW51bSc7XG5pbXBvcnQgKiBhcyBDaGFubmVsRmlsdGVyIGZyb20gJy4vQ2hhbm5lbEZpbHRlci1pbnB1dCc7XG5pbXBvcnQgKiBhcyBQcml2YWN5IGZyb20gJy4vUHJpdmFjeS1lbnVtJztcbmltcG9ydCAqIGFzIENoYW5uZWxOYW1lQW5kRGlyZWN0IGZyb20gJy4vQ2hhbm5lbE5hbWVBbmREaXJlY3QtaW5wdXQnO1xuXG5leHBvcnQgY29uc3Qgc2NoZW1hID0gbWVyZ2VUeXBlcyhbXG5cdC8vIHF1ZXJpZXNcblx0Y2hhbm5lbHMuc2NoZW1hLFxuXHRjaGFubmVsQnlOYW1lLnNjaGVtYSxcblx0ZGlyZWN0Q2hhbm5lbC5zY2hlbWEsXG5cdGNoYW5uZWxzQnlVc2VyLnNjaGVtYSxcblx0Ly8gbXV0YXRpb25zXG5cdGNyZWF0ZUNoYW5uZWwuc2NoZW1hLFxuXHRsZWF2ZUNoYW5uZWwuc2NoZW1hLFxuXHRoaWRlQ2hhbm5lbC5zY2hlbWEsXG5cdC8vIHR5cGVzXG5cdENoYW5uZWxUeXBlLnNjaGVtYSxcblx0Q2hhbm5lbFNvcnQuc2NoZW1hLFxuXHRDaGFubmVsRmlsdGVyLnNjaGVtYSxcblx0UHJpdmFjeS5zY2hlbWEsXG5cdENoYW5uZWxOYW1lQW5kRGlyZWN0LnNjaGVtYSxcbl0pO1xuXG5leHBvcnQgY29uc3QgcmVzb2x2ZXJzID0gbWVyZ2VSZXNvbHZlcnMoW1xuXHQvLyBxdWVyaWVzXG5cdGNoYW5uZWxzLnJlc29sdmVyLFxuXHRjaGFubmVsQnlOYW1lLnJlc29sdmVyLFxuXHRkaXJlY3RDaGFubmVsLnJlc29sdmVyLFxuXHRjaGFubmVsc0J5VXNlci5yZXNvbHZlcixcblx0Ly8gbXV0YXRpb25zXG5cdGNyZWF0ZUNoYW5uZWwucmVzb2x2ZXIsXG5cdGxlYXZlQ2hhbm5lbC5yZXNvbHZlcixcblx0aGlkZUNoYW5uZWwucmVzb2x2ZXIsXG5cdC8vIHR5cGVzXG5cdENoYW5uZWxUeXBlLnJlc29sdmVyLFxuXSk7XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IFJvY2tldENoYXQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuXG5pbXBvcnQgeyBhdXRoZW50aWNhdGVkIH0gZnJvbSAnLi4vLi4vaGVscGVycy9hdXRoZW50aWNhdGVkJztcbmltcG9ydCBzY2hlbWEgZnJvbSAnLi4vLi4vc2NoZW1hcy9jaGFubmVscy9sZWF2ZUNoYW5uZWwuZ3JhcGhxbHMnO1xuXG5jb25zdCByZXNvbHZlciA9IHtcblx0TXV0YXRpb246IHtcblx0XHRsZWF2ZUNoYW5uZWw6IGF1dGhlbnRpY2F0ZWQoKHJvb3QsIGFyZ3MsIHsgdXNlciB9KSA9PiB7XG5cdFx0XHRjb25zdCBjaGFubmVsID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZSh7XG5cdFx0XHRcdF9pZDogYXJncy5jaGFubmVsSWQsXG5cdFx0XHRcdHQ6ICdjJyxcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoIWNoYW5uZWwpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdlcnJvci1yb29tLW5vdC1mb3VuZCcsICdUaGUgcmVxdWlyZWQgXCJjaGFubmVsSWRcIiBwYXJhbSBwcm92aWRlZCBkb2VzIG5vdCBtYXRjaCBhbnkgY2hhbm5lbCcpO1xuXHRcdFx0fVxuXG5cdFx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXIuX2lkLCAoKSA9PiB7XG5cdFx0XHRcdE1ldGVvci5jYWxsKCdsZWF2ZVJvb20nLCBjaGFubmVsLl9pZCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSksXG5cdH0sXG59O1xuXG5leHBvcnQge1xuXHRzY2hlbWEsXG5cdHJlc29sdmVyLFxufTtcbiIsImV4cG9ydCBjb25zdCByb29tUHVibGljRmllbGRzID0ge1xuXHR0OiAxLFxuXHRuYW1lOiAxLFxuXHRkZXNjcmlwdGlvbjogMSxcblx0YW5ub3VuY2VtZW50OiAxLFxuXHR0b3BpYzogMSxcblx0dXNlcm5hbWVzOiAxLFxuXHRtc2dzOiAxLFxuXHRybzogMSxcblx0dTogMSxcblx0YXJjaGl2ZWQ6IDEsXG59O1xuIiwiaW1wb3J0IHsgUm9ja2V0Q2hhdCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5pbXBvcnQgcHJvcGVydHkgZnJvbSAnbG9kYXNoLnByb3BlcnR5JztcblxuaW1wb3J0IHsgZGF0ZVRvRmxvYXQgfSBmcm9tICcuLi8uLi9oZWxwZXJzL2RhdGVUb0Zsb2F0JztcbmltcG9ydCBzY2hlbWEgZnJvbSAnLi4vLi4vc2NoZW1hcy9tZXNzYWdlcy9NZXNzYWdlLXR5cGUuZ3JhcGhxbHMnO1xuXG5jb25zdCByZXNvbHZlciA9IHtcblx0TWVzc2FnZToge1xuXHRcdGlkOiBwcm9wZXJ0eSgnX2lkJyksXG5cdFx0Y29udGVudDogcHJvcGVydHkoJ21zZycpLFxuXHRcdGNyZWF0aW9uVGltZTogKHJvb3QpID0+IGRhdGVUb0Zsb2F0KHJvb3QudHMpLFxuXHRcdGF1dGhvcjogKHJvb3QpID0+IHtcblx0XHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHJvb3QudS5faWQpO1xuXG5cdFx0XHRyZXR1cm4gdXNlciB8fCByb290LnU7XG5cdFx0fSxcblx0XHRjaGFubmVsOiAocm9vdCkgPT4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZShyb290LnJpZCksXG5cdFx0ZnJvbVNlcnZlcjogKHJvb3QpID0+IHR5cGVvZiByb290LnQgIT09ICd1bmRlZmluZWQnLCAvLyBvbiBhIG1lc3NhZ2Ugc2VudCBieSB1c2VyIGB0cnVlYCBvdGhlcndpc2UgYGZhbHNlYFxuXHRcdHR5cGU6IHByb3BlcnR5KCd0JyksXG5cdFx0Y2hhbm5lbFJlZjogKHJvb3QpID0+IHtcblx0XHRcdGlmICghcm9vdC5jaGFubmVscykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kKHtcblx0XHRcdFx0X2lkOiB7XG5cdFx0XHRcdFx0JGluOiByb290LmNoYW5uZWxzLm1hcCgoYykgPT4gYy5faWQpLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSwge1xuXHRcdFx0XHRzb3J0OiB7XG5cdFx0XHRcdFx0bmFtZTogMSxcblx0XHRcdFx0fSxcblx0XHRcdH0pLmZldGNoKCk7XG5cdFx0fSxcblx0XHR1c2VyUmVmOiAocm9vdCkgPT4ge1xuXHRcdFx0aWYgKCFyb290Lm1lbnRpb25zKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmQoe1xuXHRcdFx0XHRfaWQ6IHtcblx0XHRcdFx0XHQkaW46IHJvb3QubWVudGlvbnMubWFwKChjKSA9PiBjLl9pZCksXG5cdFx0XHRcdH0sXG5cdFx0XHR9LCB7XG5cdFx0XHRcdHNvcnQ6IHtcblx0XHRcdFx0XHR1c2VybmFtZTogMSxcblx0XHRcdFx0fSxcblx0XHRcdH0pLmZldGNoKCk7XG5cdFx0fSxcblx0XHRyZWFjdGlvbnM6IChyb290KSA9PiB7XG5cdFx0XHRpZiAoIXJvb3QucmVhY3Rpb25zIHx8IE9iamVjdC5rZXlzKHJvb3QucmVhY3Rpb25zKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCByZWFjdGlvbnMgPSBbXTtcblxuXHRcdFx0T2JqZWN0LmtleXMocm9vdC5yZWFjdGlvbnMpLmZvckVhY2goKGljb24pID0+IHtcblx0XHRcdFx0cm9vdC5yZWFjdGlvbnNbaWNvbl0udXNlcm5hbWVzLmZvckVhY2goKHVzZXJuYW1lKSA9PiB7XG5cdFx0XHRcdFx0cmVhY3Rpb25zLnB1c2goe1xuXHRcdFx0XHRcdFx0aWNvbixcblx0XHRcdFx0XHRcdHVzZXJuYW1lLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gcmVhY3Rpb25zO1xuXHRcdH0sXG5cdH0sXG59O1xuXG5leHBvcnQge1xuXHRzY2hlbWEsXG5cdHJlc29sdmVyLFxufTtcbiIsImltcG9ydCBzY2hlbWEgZnJvbSAnLi4vLi4vc2NoZW1hcy9tZXNzYWdlcy9NZXNzYWdlSWRlbnRpZmllci1pbnB1dC5ncmFwaHFscyc7XG5cbmV4cG9ydCB7XG5cdHNjaGVtYSxcbn07XG4iLCJpbXBvcnQgc2NoZW1hIGZyb20gJy4uLy4uL3NjaGVtYXMvbWVzc2FnZXMvTWVzc2FnZXNXaXRoQ3Vyc29yLXR5cGUuZ3JhcGhxbHMnO1xuXG5leHBvcnQge1xuXHRzY2hlbWEsXG59O1xuIiwiaW1wb3J0IHNjaGVtYSBmcm9tICcuLi8uLi9zY2hlbWFzL21lc3NhZ2VzL1JlYWN0aW9uLXR5cGUuZ3JhcGhxbHMnO1xuXG5leHBvcnQge1xuXHRzY2hlbWEsXG59O1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcblxuaW1wb3J0IHsgYXV0aGVudGljYXRlZCB9IGZyb20gJy4uLy4uL2hlbHBlcnMvYXV0aGVudGljYXRlZCc7XG5pbXBvcnQgc2NoZW1hIGZyb20gJy4uLy4uL3NjaGVtYXMvbWVzc2FnZXMvYWRkUmVhY3Rpb25Ub01lc3NhZ2UuZ3JhcGhxbHMnO1xuXG5jb25zdCByZXNvbHZlciA9IHtcblx0TXV0YXRpb246IHtcblx0XHRhZGRSZWFjdGlvblRvTWVzc2FnZTogYXV0aGVudGljYXRlZCgocm9vdCwgeyBpZCwgaWNvbiwgc2hvdWxkUmVhY3QgfSwgeyB1c2VyIH0pID0+IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG5cdFx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXIuX2lkLCAoKSA9PiB7XG5cdFx0XHRcdE1ldGVvci5jYWxsKCdzZXRSZWFjdGlvbicsIGljb24sIGlkLm1lc3NhZ2VJZCwgc2hvdWxkUmVhY3QsICgpID0+IHtcblx0XHRcdFx0XHRyZXNvbHZlKFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmUoaWQubWVzc2FnZUlkKSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fSkpLFxuXHR9LFxufTtcblxuZXhwb3J0IHtcblx0c2NoZW1hLFxuXHRyZXNvbHZlcixcbn07XG4iLCJpbXBvcnQgeyB3aXRoRmlsdGVyIH0gZnJvbSAnZ3JhcGhxbC1zdWJzY3JpcHRpb25zJztcbmltcG9ydCB7IFJvY2tldENoYXQgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpsaWInO1xuXG5pbXBvcnQgeyBwdWJzdWIgfSBmcm9tICcuLi8uLi9zdWJzY3JpcHRpb25zJztcbmltcG9ydCB7IGF1dGhlbnRpY2F0ZWQgfSBmcm9tICcuLi8uLi9oZWxwZXJzL2F1dGhlbnRpY2F0ZWQnO1xuaW1wb3J0IHNjaGVtYSBmcm9tICcuLi8uLi9zY2hlbWFzL21lc3NhZ2VzL2NoYXRNZXNzYWdlQWRkZWQuZ3JhcGhxbHMnO1xuXG5leHBvcnQgY29uc3QgQ0hBVF9NRVNTQUdFX1NVQlNDUklQVElPTl9UT1BJQyA9ICdDSEFUX01FU1NBR0VfQURERUQnO1xuXG5leHBvcnQgZnVuY3Rpb24gcHVibGlzaE1lc3NhZ2UobWVzc2FnZSkge1xuXHRwdWJzdWIucHVibGlzaChDSEFUX01FU1NBR0VfU1VCU0NSSVBUSU9OX1RPUElDLCB7IGNoYXRNZXNzYWdlQWRkZWQ6IG1lc3NhZ2UgfSk7XG59XG5cbmZ1bmN0aW9uIHNob3VsZFB1Ymxpc2gobWVzc2FnZSwgeyBpZCwgZGlyZWN0VG8gfSwgdXNlcm5hbWUpIHtcblx0aWYgKGlkKSB7XG5cdFx0cmV0dXJuIG1lc3NhZ2UucmlkID09PSBpZDtcblx0fSBlbHNlIGlmIChkaXJlY3RUbykge1xuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lKHtcblx0XHRcdHVzZXJuYW1lczogeyAkYWxsOiBbZGlyZWN0VG8sIHVzZXJuYW1lXSB9LFxuXHRcdFx0dDogJ2QnLFxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHJvb20gJiYgcm9vbS5faWQgPT09IG1lc3NhZ2UucmlkO1xuXHR9XG5cblx0cmV0dXJuIGZhbHNlO1xufVxuXG5jb25zdCByZXNvbHZlciA9IHtcblx0U3Vic2NyaXB0aW9uOiB7XG5cdFx0Y2hhdE1lc3NhZ2VBZGRlZDoge1xuXHRcdFx0c3Vic2NyaWJlOiB3aXRoRmlsdGVyKCgpID0+IHB1YnN1Yi5hc3luY0l0ZXJhdG9yKENIQVRfTUVTU0FHRV9TVUJTQ1JJUFRJT05fVE9QSUMpLCBhdXRoZW50aWNhdGVkKChwYXlsb2FkLCBhcmdzLCB7IHVzZXIgfSkgPT4ge1xuXHRcdFx0XHRjb25zdCBjaGFubmVsID0ge1xuXHRcdFx0XHRcdGlkOiBhcmdzLmNoYW5uZWxJZCxcblx0XHRcdFx0XHRkaXJlY3RUbzogYXJncy5kaXJlY3RUbyxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRyZXR1cm4gc2hvdWxkUHVibGlzaChwYXlsb2FkLmNoYXRNZXNzYWdlQWRkZWQsIGNoYW5uZWwsIHVzZXIudXNlcm5hbWUpO1xuXHRcdFx0fSkpLFxuXHRcdH0sXG5cdH0sXG59O1xuXG5Sb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyU2F2ZU1lc3NhZ2UnLCAobWVzc2FnZSkgPT4ge1xuXHRwdWJsaXNoTWVzc2FnZShtZXNzYWdlKTtcbn0sIG51bGwsICdjaGF0TWVzc2FnZUFkZGVkU3Vic2NyaXB0aW9uJyk7XG5cbmV4cG9ydCB7XG5cdHNjaGVtYSxcblx0cmVzb2x2ZXIsXG59O1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcblxuaW1wb3J0IHsgYXV0aGVudGljYXRlZCB9IGZyb20gJy4uLy4uL2hlbHBlcnMvYXV0aGVudGljYXRlZCc7XG5pbXBvcnQgc2NoZW1hIGZyb20gJy4uLy4uL3NjaGVtYXMvbWVzc2FnZXMvZGVsZXRlTWVzc2FnZS5ncmFwaHFscyc7XG5cbmNvbnN0IHJlc29sdmVyID0ge1xuXHRNdXRhdGlvbjoge1xuXHRcdGRlbGV0ZU1lc3NhZ2U6IGF1dGhlbnRpY2F0ZWQoKHJvb3QsIHsgaWQgfSwgeyB1c2VyIH0pID0+IHtcblx0XHRcdGNvbnN0IG1zZyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKGlkLm1lc3NhZ2VJZCwgeyBmaWVsZHM6IHsgdTogMSwgcmlkOiAxIH0gfSk7XG5cblx0XHRcdGlmICghbXNnKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihgTm8gbWVzc2FnZSBmb3VuZCB3aXRoIHRoZSBpZCBvZiBcIiR7IGlkLm1lc3NhZ2VJZCB9XCIuYCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChpZC5jaGFubmVsSWQgIT09IG1zZy5yaWQpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdUaGUgcm9vbSBpZCBwcm92aWRlZCBkb2VzIG5vdCBtYXRjaCB3aGVyZSB0aGUgbWVzc2FnZSBpcyBmcm9tLicpO1xuXHRcdFx0fVxuXG5cdFx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXIuX2lkLCAoKSA9PiB7XG5cdFx0XHRcdE1ldGVvci5jYWxsKCdkZWxldGVNZXNzYWdlJywgeyBfaWQ6IG1zZy5faWQgfSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIG1zZztcblx0XHR9KSxcblx0fSxcbn07XG5cbmV4cG9ydCB7XG5cdHNjaGVtYSxcblx0cmVzb2x2ZXIsXG59O1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcblxuaW1wb3J0IHsgYXV0aGVudGljYXRlZCB9IGZyb20gJy4uLy4uL2hlbHBlcnMvYXV0aGVudGljYXRlZCc7XG5pbXBvcnQgc2NoZW1hIGZyb20gJy4uLy4uL3NjaGVtYXMvbWVzc2FnZXMvZWRpdE1lc3NhZ2UuZ3JhcGhxbHMnO1xuXG5jb25zdCByZXNvbHZlciA9IHtcblx0TXV0YXRpb246IHtcblx0XHRlZGl0TWVzc2FnZTogYXV0aGVudGljYXRlZCgocm9vdCwgeyBpZCwgY29udGVudCB9LCB7IHVzZXIgfSkgPT4ge1xuXHRcdFx0Y29uc3QgbXNnID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZUJ5SWQoaWQubWVzc2FnZUlkKTtcblxuXHRcdFx0Ly8gRW5zdXJlIHRoZSBtZXNzYWdlIGV4aXN0c1xuXHRcdFx0aWYgKCFtc2cpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBObyBtZXNzYWdlIGZvdW5kIHdpdGggdGhlIGlkIG9mIFwiJHsgaWQubWVzc2FnZUlkIH1cIi5gKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGlkLmNoYW5uZWxJZCAhPT0gbXNnLnJpZCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1RoZSBjaGFubmVsIGlkIHByb3ZpZGVkIGRvZXMgbm90IG1hdGNoIHdoZXJlIHRoZSBtZXNzYWdlIGlzIGZyb20uJyk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFBlcm1pc3Npb24gY2hlY2tzIGFyZSBhbHJlYWR5IGRvbmUgaW4gdGhlIHVwZGF0ZU1lc3NhZ2UgbWV0aG9kLCBzbyBubyBuZWVkIHRvIGR1cGxpY2F0ZSB0aGVtXG5cdFx0XHRNZXRlb3IucnVuQXNVc2VyKHVzZXIuX2lkLCAoKSA9PiB7XG5cdFx0XHRcdE1ldGVvci5jYWxsKCd1cGRhdGVNZXNzYWdlJywgeyBfaWQ6IG1zZy5faWQsIG1zZzogY29udGVudCwgcmlkOiBtc2cucmlkIH0pO1xuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5maW5kT25lQnlJZChtc2cuX2lkKTtcblx0XHR9KSxcblx0fSxcbn07XG5cbmV4cG9ydCB7XG5cdHNjaGVtYSxcblx0cmVzb2x2ZXIsXG59O1xuIiwiaW1wb3J0IHsgbWVyZ2VUeXBlcywgbWVyZ2VSZXNvbHZlcnMgfSBmcm9tICdtZXJnZS1ncmFwaHFsLXNjaGVtYXMnO1xuXG4vLyBxdWVyaWVzXG5pbXBvcnQgKiBhcyBtZXNzYWdlcyBmcm9tICcuL21lc3NhZ2VzJztcbi8vIG11dGF0aW9uc1xuaW1wb3J0ICogYXMgc2VuZE1lc3NhZ2UgZnJvbSAnLi9zZW5kTWVzc2FnZSc7XG5pbXBvcnQgKiBhcyBlZGl0TWVzc2FnZSBmcm9tICcuL2VkaXRNZXNzYWdlJztcbmltcG9ydCAqIGFzIGRlbGV0ZU1lc3NhZ2UgZnJvbSAnLi9kZWxldGVNZXNzYWdlJztcbmltcG9ydCAqIGFzIGFkZFJlYWN0aW9uVG9NZXNzYWdlIGZyb20gJy4vYWRkUmVhY3Rpb25Ub01lc3NhZ2UnO1xuLy8gc3Vic2NyaXB0aW9uc1xuaW1wb3J0ICogYXMgY2hhdE1lc3NhZ2VBZGRlZCBmcm9tICcuL2NoYXRNZXNzYWdlQWRkZWQnO1xuLy8gdHlwZXNcbmltcG9ydCAqIGFzIE1lc3NhZ2VUeXBlIGZyb20gJy4vTWVzc2FnZS10eXBlJztcbmltcG9ydCAqIGFzIE1lc3NhZ2VzV2l0aEN1cnNvclR5cGUgZnJvbSAnLi9NZXNzYWdlc1dpdGhDdXJzb3ItdHlwZSc7XG5pbXBvcnQgKiBhcyBNZXNzYWdlSWRlbnRpZmllciBmcm9tICcuL01lc3NhZ2VJZGVudGlmaWVyLWlucHV0JztcbmltcG9ydCAqIGFzIFJlYWN0aW9uVHlwZSBmcm9tICcuL1JlYWN0aW9uLXR5cGUnO1xuXG5leHBvcnQgY29uc3Qgc2NoZW1hID0gbWVyZ2VUeXBlcyhbXG5cdC8vIHF1ZXJpZXNcblx0bWVzc2FnZXMuc2NoZW1hLFxuXHQvLyBtdXRhdGlvbnNcblx0c2VuZE1lc3NhZ2Uuc2NoZW1hLFxuXHRlZGl0TWVzc2FnZS5zY2hlbWEsXG5cdGRlbGV0ZU1lc3NhZ2Uuc2NoZW1hLFxuXHRhZGRSZWFjdGlvblRvTWVzc2FnZS5zY2hlbWEsXG5cdC8vIHN1YnNjcmlwdGlvbnNcblx0Y2hhdE1lc3NhZ2VBZGRlZC5zY2hlbWEsXG5cdC8vIHR5cGVzXG5cdE1lc3NhZ2VUeXBlLnNjaGVtYSxcblx0TWVzc2FnZXNXaXRoQ3Vyc29yVHlwZS5zY2hlbWEsXG5cdE1lc3NhZ2VJZGVudGlmaWVyLnNjaGVtYSxcblx0UmVhY3Rpb25UeXBlLnNjaGVtYSxcbl0pO1xuXG5leHBvcnQgY29uc3QgcmVzb2x2ZXJzID0gbWVyZ2VSZXNvbHZlcnMoW1xuXHQvLyBxdWVyaWVzXG5cdG1lc3NhZ2VzLnJlc29sdmVyLFxuXHQvLyBtdXRhdGlvbnNcblx0c2VuZE1lc3NhZ2UucmVzb2x2ZXIsXG5cdGVkaXRNZXNzYWdlLnJlc29sdmVyLFxuXHRkZWxldGVNZXNzYWdlLnJlc29sdmVyLFxuXHRhZGRSZWFjdGlvblRvTWVzc2FnZS5yZXNvbHZlcixcblx0Ly8gc3Vic2NyaXB0aW9uc1xuXHRjaGF0TWVzc2FnZUFkZGVkLnJlc29sdmVyLFxuXHQvLyB0eXBlc1xuXHRNZXNzYWdlVHlwZS5yZXNvbHZlcixcbl0pO1xuIiwiaW1wb3J0IHsgUm9ja2V0Q2hhdCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5cbmltcG9ydCB7IGF1dGhlbnRpY2F0ZWQgfSBmcm9tICcuLi8uLi9oZWxwZXJzL2F1dGhlbnRpY2F0ZWQnO1xuaW1wb3J0IHNjaGVtYSBmcm9tICcuLi8uLi9zY2hlbWFzL21lc3NhZ2VzL21lc3NhZ2VzLmdyYXBocWxzJztcblxuY29uc3QgcmVzb2x2ZXIgPSB7XG5cdFF1ZXJ5OiB7XG5cdFx0bWVzc2FnZXM6IGF1dGhlbnRpY2F0ZWQoKHJvb3QsIGFyZ3MsIHsgdXNlciB9KSA9PiB7XG5cdFx0XHRjb25zdCBtZXNzYWdlc1F1ZXJ5ID0ge307XG5cdFx0XHRjb25zdCBtZXNzYWdlc09wdGlvbnMgPSB7XG5cdFx0XHRcdHNvcnQ6IHsgdHM6IC0xIH0sXG5cdFx0XHR9O1xuXHRcdFx0Y29uc3QgY2hhbm5lbFF1ZXJ5ID0ge307XG5cdFx0XHRjb25zdCBpc1BhZ2luYXRpb24gPSAhIWFyZ3MuY3Vyc29yIHx8IGFyZ3MuY291bnQgPiAwO1xuXHRcdFx0bGV0IGN1cnNvcjtcblxuXHRcdFx0aWYgKGFyZ3MuY2hhbm5lbElkKSB7XG5cdFx0XHRcdC8vIGNoYW5uZWxJZFxuXHRcdFx0XHRjaGFubmVsUXVlcnkuX2lkID0gYXJncy5jaGFubmVsSWQ7XG5cdFx0XHR9IGVsc2UgaWYgKGFyZ3MuZGlyZWN0VG8pIHtcblx0XHRcdFx0Ly8gZGlyZWN0IG1lc3NhZ2Ugd2hlcmUgZGlyZWN0VG8gaXMgYSB1c2VyIGlkXG5cdFx0XHRcdGNoYW5uZWxRdWVyeS50ID0gJ2QnO1xuXHRcdFx0XHRjaGFubmVsUXVlcnkudXNlcm5hbWVzID0geyAkYWxsOiBbYXJncy5kaXJlY3RUbywgdXNlci51c2VybmFtZV0gfTtcblx0XHRcdH0gZWxzZSBpZiAoYXJncy5jaGFubmVsTmFtZSkge1xuXHRcdFx0XHQvLyBub24tZGlyZWN0IGNoYW5uZWxcblx0XHRcdFx0Y2hhbm5lbFF1ZXJ5LnQgPSB7ICRuZTogJ2QnIH07XG5cdFx0XHRcdGNoYW5uZWxRdWVyeS5uYW1lID0gYXJncy5jaGFubmVsTmFtZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ21lc3NhZ2VzIHF1ZXJ5IG11c3QgYmUgY2FsbGVkIHdpdGggY2hhbm5lbElkIG9yIGRpcmVjdFRvJyk7XG5cdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBjaGFubmVsID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZShjaGFubmVsUXVlcnkpO1xuXG5cdFx0XHRsZXQgbWVzc2FnZXNBcnJheSA9IFtdO1xuXG5cdFx0XHRpZiAoY2hhbm5lbCkge1xuXHRcdFx0XHQvLyBjdXJzb3Jcblx0XHRcdFx0aWYgKGlzUGFnaW5hdGlvbiAmJiBhcmdzLmN1cnNvcikge1xuXHRcdFx0XHRcdGNvbnN0IGN1cnNvck1zZyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmUoYXJncy5jdXJzb3IsIHsgZmllbGRzOiB7IHRzOiAxIH0gfSk7XG5cdFx0XHRcdFx0bWVzc2FnZXNRdWVyeS50cyA9IHsgJGx0OiBjdXJzb3JNc2cudHMgfTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIHNlYXJjaFxuXHRcdFx0XHRpZiAodHlwZW9mIGFyZ3Muc2VhcmNoUmVnZXggPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0bWVzc2FnZXNRdWVyeS5tc2cgPSB7XG5cdFx0XHRcdFx0XHQkcmVnZXg6IG5ldyBSZWdFeHAoYXJncy5zZWFyY2hSZWdleCwgJ2knKSxcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gY291bnRcblx0XHRcdFx0aWYgKGlzUGFnaW5hdGlvbiAmJiBhcmdzLmNvdW50KSB7XG5cdFx0XHRcdFx0bWVzc2FnZXNPcHRpb25zLmxpbWl0ID0gYXJncy5jb3VudDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIGV4Y2x1ZGUgbWVzc2FnZXMgZ2VuZXJhdGVkIGJ5IHNlcnZlclxuXHRcdFx0XHRpZiAoYXJncy5leGNsdWRlU2VydmVyID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0bWVzc2FnZXNRdWVyeS50ID0geyAkZXhpc3RzOiBmYWxzZSB9O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gbG9vayBmb3IgbWVzc2FnZXMgdGhhdCBiZWxvbmdzIHRvIHNwZWNpZmljIGNoYW5uZWxcblx0XHRcdFx0bWVzc2FnZXNRdWVyeS5yaWQgPSBjaGFubmVsLl9pZDtcblxuXHRcdFx0XHRjb25zdCBtZXNzYWdlcyA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmQobWVzc2FnZXNRdWVyeSwgbWVzc2FnZXNPcHRpb25zKTtcblxuXHRcdFx0XHRtZXNzYWdlc0FycmF5ID0gbWVzc2FnZXMuZmV0Y2goKTtcblxuXHRcdFx0XHRpZiAoaXNQYWdpbmF0aW9uKSB7XG5cdFx0XHRcdFx0Ly8gb2xkZXN0IGZpcnN0IChiZWNhdXNlIG9mIGZpbmRPbmUpXG5cdFx0XHRcdFx0bWVzc2FnZXNPcHRpb25zLnNvcnQudHMgPSAxO1xuXG5cdFx0XHRcdFx0Y29uc3QgZmlyc3RNZXNzYWdlID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZShtZXNzYWdlc1F1ZXJ5LCBtZXNzYWdlc09wdGlvbnMpO1xuXHRcdFx0XHRcdGNvbnN0IGxhc3RJZCA9IChtZXNzYWdlc0FycmF5W21lc3NhZ2VzQXJyYXkubGVuZ3RoIC0gMV0gfHwge30pLl9pZDtcblxuXHRcdFx0XHRcdGN1cnNvciA9ICFsYXN0SWQgfHwgbGFzdElkID09PSBmaXJzdE1lc3NhZ2UuX2lkID8gbnVsbCA6IGxhc3RJZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjdXJzb3IsXG5cdFx0XHRcdGNoYW5uZWwsXG5cdFx0XHRcdG1lc3NhZ2VzQXJyYXksXG5cdFx0XHR9O1xuXHRcdH0pLFxuXHR9LFxufTtcblxuZXhwb3J0IHtcblx0c2NoZW1hLFxuXHRyZXNvbHZlcixcbn07XG4iLCIvKiBnbG9iYWwgcHJvY2Vzc1dlYmhvb2tNZXNzYWdlICovXG5cbmltcG9ydCB7IGF1dGhlbnRpY2F0ZWQgfSBmcm9tICcuLi8uLi9oZWxwZXJzL2F1dGhlbnRpY2F0ZWQnO1xuaW1wb3J0IHNjaGVtYSBmcm9tICcuLi8uLi9zY2hlbWFzL21lc3NhZ2VzL3NlbmRNZXNzYWdlLmdyYXBocWxzJztcblxuY29uc3QgcmVzb2x2ZXIgPSB7XG5cdE11dGF0aW9uOiB7XG5cdFx0c2VuZE1lc3NhZ2U6IGF1dGhlbnRpY2F0ZWQoKHJvb3QsIHsgY2hhbm5lbElkLCBkaXJlY3RUbywgY29udGVudCB9LCB7IHVzZXIgfSkgPT4ge1xuXHRcdFx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRcdFx0dGV4dDogY29udGVudCxcblx0XHRcdFx0Y2hhbm5lbDogY2hhbm5lbElkIHx8IGRpcmVjdFRvLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgbWVzc2FnZVJldHVybiA9IHByb2Nlc3NXZWJob29rTWVzc2FnZShvcHRpb25zLCB1c2VyKVswXTtcblxuXHRcdFx0aWYgKCFtZXNzYWdlUmV0dXJuKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignVW5rbm93biBlcnJvcicpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gbWVzc2FnZVJldHVybi5tZXNzYWdlO1xuXHRcdH0pLFxuXHR9LFxufTtcblxuZXhwb3J0IHtcblx0c2NoZW1hLFxuXHRyZXNvbHZlcixcbn07XG4iLCJpbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcbmltcG9ydCBwcm9wZXJ0eSBmcm9tICdsb2Rhc2gucHJvcGVydHknO1xuXG5pbXBvcnQgc2NoZW1hIGZyb20gJy4uLy4uL3NjaGVtYXMvdXNlcnMvVXNlci10eXBlLmdyYXBocWxzJztcblxuY29uc3QgcmVzb2x2ZXIgPSB7XG5cdFVzZXI6IHtcblx0XHRpZDogcHJvcGVydHkoJ19pZCcpLFxuXHRcdHN0YXR1czogKHsgc3RhdHVzIH0pID0+IHN0YXR1cy50b1VwcGVyQ2FzZSgpLFxuXHRcdGF2YXRhcjogYXN5bmMoeyBfaWQgfSkgPT4ge1xuXHRcdFx0Ly8gWFhYIGpzLWFjY291bnRzL2dyYXBocWwjMTZcblx0XHRcdGNvbnN0IGF2YXRhciA9IGF3YWl0IFJvY2tldENoYXQubW9kZWxzLkF2YXRhcnMubW9kZWwucmF3Q29sbGVjdGlvbigpLmZpbmRPbmUoe1xuXHRcdFx0XHR1c2VySWQ6IF9pZCxcblx0XHRcdH0sIHsgZmllbGRzOiB7IHVybDogMSB9IH0pO1xuXG5cdFx0XHRpZiAoYXZhdGFyKSB7XG5cdFx0XHRcdHJldHVybiBhdmF0YXIudXJsO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y2hhbm5lbHM6IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoYXN5bmMoeyBfaWQgfSkgPT4gYXdhaXQgUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZEJ5U3Vic2NyaXB0aW9uVXNlcklkKF9pZCkuZmV0Y2goKSksXG5cdFx0ZGlyZWN0TWVzc2FnZXM6ICh7IHVzZXJuYW1lIH0pID0+IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmREaXJlY3RSb29tQ29udGFpbmluZ1VzZXJuYW1lKHVzZXJuYW1lKS5mZXRjaCgpLFxuXHR9LFxufTtcblxuZXhwb3J0IHtcblx0c2NoZW1hLFxuXHRyZXNvbHZlcixcbn07XG4iLCJpbXBvcnQgc2NoZW1hIGZyb20gJy4uLy4uL3NjaGVtYXMvdXNlcnMvVXNlclN0YXR1cy1lbnVtLmdyYXBocWxzJztcblxuZXhwb3J0IHtcblx0c2NoZW1hLFxufTtcbiIsImltcG9ydCB7IG1lcmdlVHlwZXMsIG1lcmdlUmVzb2x2ZXJzIH0gZnJvbSAnbWVyZ2UtZ3JhcGhxbC1zY2hlbWFzJztcblxuLy8gbXV0YXRpb25zXG5pbXBvcnQgKiBhcyBzZXRTdGF0dXMgZnJvbSAnLi9zZXRTdGF0dXMnO1xuLy8gdHlwZXNcbmltcG9ydCAqIGFzIFVzZXJUeXBlIGZyb20gJy4vVXNlci10eXBlJztcbmltcG9ydCAqIGFzIFVzZXJTdGF0dXMgZnJvbSAnLi9Vc2VyU3RhdHVzLWVudW0nO1xuXG5leHBvcnQgY29uc3Qgc2NoZW1hID0gbWVyZ2VUeXBlcyhbXG5cdC8vIG11dGF0aW9uc1xuXHRzZXRTdGF0dXMuc2NoZW1hLFxuXHQvLyB0eXBlc1xuXHRVc2VyVHlwZS5zY2hlbWEsXG5cdFVzZXJTdGF0dXMuc2NoZW1hLFxuXSk7XG5cbmV4cG9ydCBjb25zdCByZXNvbHZlcnMgPSBtZXJnZVJlc29sdmVycyhbXG5cdC8vIG11dGF0aW9uc1xuXHRzZXRTdGF0dXMucmVzb2x2ZXIsXG5cdC8vIHR5cGVzXG5cdFVzZXJUeXBlLnJlc29sdmVyLFxuXSk7XG4iLCJpbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcblxuaW1wb3J0IHsgYXV0aGVudGljYXRlZCB9IGZyb20gJy4uLy4uL2hlbHBlcnMvYXV0aGVudGljYXRlZCc7XG5pbXBvcnQgc2NoZW1hIGZyb20gJy4uLy4uL3NjaGVtYXMvdXNlcnMvc2V0U3RhdHVzLmdyYXBocWxzJztcblxuY29uc3QgcmVzb2x2ZXIgPSB7XG5cdE11dGF0aW9uOiB7XG5cdFx0c2V0U3RhdHVzOiBhdXRoZW50aWNhdGVkKChyb290LCB7IHN0YXR1cyB9LCB7IHVzZXIgfSkgPT4ge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMudXBkYXRlKHVzZXIuX2lkLCB7XG5cdFx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0XHRzdGF0dXM6IHN0YXR1cy50b0xvd2VyQ2FzZSgpLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lKHVzZXIuX2lkKTtcblx0XHR9KSxcblx0fSxcbn07XG5cbmV4cG9ydCB7XG5cdHNjaGVtYSxcblx0cmVzb2x2ZXIsXG59O1xuIl19
