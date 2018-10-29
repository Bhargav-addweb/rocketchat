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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:livestream":{"server":{"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_livestream/server/index.js                                                                 //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
module.watch(require("./routes.js"));
module.watch(require("./methods.js"));
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"models":{"Rooms.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_livestream/server/models/Rooms.js                                                          //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
RocketChat.models.Rooms.setStreamingOptionsById = function (_id, streamingOptions) {
  const update = {
    $set: {
      streamingOptions
    }
  };
  return this.update({
    _id
  }, update);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"functions":{"saveStreamingOptions.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_livestream/server/functions/saveStreamingOptions.js                                        //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
RocketChat.saveStreamingOptions = function (rid, options) {
  if (!Match.test(rid, String)) {
    throw new Meteor.Error('invalid-room', 'Invalid room', {
      function: 'RocketChat.saveStreamingOptions'
    });
  }

  check(options, {
    type: Match.Optional(String),
    url: Match.Optional(String),
    thumbnail: Match.Optional(String),
    isAudioOnly: Match.Optional(String),
    message: Match.Optional(String)
  });
  RocketChat.models.Rooms.setStreamingOptionsById(rid, options);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livestream.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_livestream/server/functions/livestream.js                                                  //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
module.export({
  getBroadcastStatus: () => getBroadcastStatus,
  statusStreamLiveStream: () => statusStreamLiveStream,
  statusLiveStream: () => statusLiveStream,
  setBroadcastStatus: () => setBroadcastStatus,
  createLiveStream: () => createLiveStream
});
let google;
module.watch(require("googleapis"), {
  default(v) {
    google = v;
  }

}, 0);
const {
  OAuth2
} = google.auth;

const p = fn => new Promise(function (resolve, reject) {
  fn(function (err, value) {
    if (err) {
      return reject(err);
    }

    resolve(value.data);
  });
});

const getBroadcastStatus = ({
  id,
  access_token,
  refresh_token,
  clientId,
  clientSecret
}) => Promise.asyncApply(() => {
  const auth = new OAuth2(clientId, clientSecret);
  auth.setCredentials({
    access_token,
    refresh_token
  });
  const youtube = google.youtube({
    version: 'v3',
    auth
  });
  const result = Promise.await(p(resolve => youtube.liveBroadcasts.list({
    part: 'id,status',
    id
  }, resolve)));
  return result.items && result.items[0] && result.items[0].status.lifeCycleStatus;
});

const statusStreamLiveStream = ({
  id,
  access_token,
  refresh_token,
  clientId,
  clientSecret
}) => Promise.asyncApply(() => {
  const auth = new OAuth2(clientId, clientSecret);
  auth.setCredentials({
    access_token,
    refresh_token
  });
  const youtube = google.youtube({
    version: 'v3',
    auth
  });
  const result = Promise.await(p(resolve => youtube.liveStreams.list({
    part: 'id,status',
    id
  }, resolve)));
  return result.items && result.items[0].status.streamStatus;
});

const statusLiveStream = ({
  id,
  access_token,
  refresh_token,
  clientId,
  clientSecret,
  status
}) => {
  const auth = new OAuth2(clientId, clientSecret);
  auth.setCredentials({
    access_token,
    refresh_token
  });
  const youtube = google.youtube({
    version: 'v3',
    auth
  });
  return p(resolve => youtube.liveBroadcasts.transition({
    part: 'id,status',
    id,
    broadcastStatus: status
  }, resolve));
};

const setBroadcastStatus = ({
  id,
  access_token,
  refresh_token,
  clientId,
  clientSecret,
  status
}) => {
  const auth = new OAuth2(clientId, clientSecret);
  auth.setCredentials({
    access_token,
    refresh_token
  });
  const youtube = google.youtube({
    version: 'v3',
    auth
  });
  return p(resolve => youtube.liveBroadcasts.transition({
    part: 'id,status',
    id,
    broadcastStatus: status
  }, resolve));
};

const createLiveStream = ({
  room,
  access_token,
  refresh_token,
  clientId,
  clientSecret
}) => Promise.asyncApply(() => {
  const auth = new OAuth2(clientId, clientSecret);
  auth.setCredentials({
    access_token,
    refresh_token
  });
  const youtube = google.youtube({
    version: 'v3',
    auth
  });
  const [stream, broadcast] = Promise.await(Promise.all([p(resolve => youtube.liveStreams.insert({
    part: 'id,snippet,cdn,contentDetails,status',
    resource: {
      snippet: {
        title: room.name || 'RocketChat Broadcast'
      },
      cdn: {
        format: '480p',
        ingestionType: 'rtmp'
      }
    }
  }, resolve)), p(resolve => youtube.liveBroadcasts.insert({
    part: 'id,snippet,contentDetails,status',
    resource: {
      snippet: {
        title: room.name || 'RocketChat Broadcast',
        scheduledStartTime: new Date().toISOString()
      },
      status: {
        privacyStatus: 'unlisted'
      }
    }
  }, resolve))]));
  Promise.await(p(resolve => youtube.liveBroadcasts.bind({
    part: 'id,snippet,status',
    // resource: {
    id: broadcast.id,
    streamId: stream.id
  }, resolve)));
  return {
    id: stream.cdn.ingestionInfo.streamName,
    stream,
    broadcast
  };
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"settings.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_livestream/server/settings.js                                                              //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Meteor.startup(function () {
  RocketChat.settings.addGroup('LiveStream & Broadcasting', function () {
    this.add('Livestream_enabled', false, {
      type: 'boolean',
      public: true,
      alert: 'This feature is currently in beta! Please report bugs to github.com/RocketChat/Rocket.Chat/issues'
    });
    this.add('Broadcasting_enabled', false, {
      type: 'boolean',
      public: true,
      alert: 'This feature is currently in beta! Please report bugs to github.com/RocketChat/Rocket.Chat/issues',
      enableQuery: {
        _id: 'Livestream_enabled',
        value: true
      }
    });
    this.add('Broadcasting_client_id', '', {
      type: 'string',
      public: false,
      enableQuery: {
        _id: 'Broadcasting_enabled',
        value: true
      }
    });
    this.add('Broadcasting_client_secret', '', {
      type: 'string',
      public: false,
      enableQuery: {
        _id: 'Broadcasting_enabled',
        value: true
      }
    });
    this.add('Broadcasting_api_key', '', {
      type: 'string',
      public: false,
      enableQuery: {
        _id: 'Broadcasting_enabled',
        value: true
      }
    });
    this.add('Broadcasting_media_server_url', '', {
      type: 'string',
      public: true,
      enableQuery: {
        _id: 'Broadcasting_enabled',
        value: true
      }
    });
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_livestream/server/methods.js                                                               //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let createLiveStream, statusLiveStream, statusStreamLiveStream, getBroadcastStatus, setBroadcastStatus;
module.watch(require("./functions/livestream"), {
  createLiveStream(v) {
    createLiveStream = v;
  },

  statusLiveStream(v) {
    statusLiveStream = v;
  },

  statusStreamLiveStream(v) {
    statusStreamLiveStream = v;
  },

  getBroadcastStatus(v) {
    getBroadcastStatus = v;
  },

  setBroadcastStatus(v) {
    setBroadcastStatus = v;
  }

}, 1);

const selectLivestreamSettings = user => user && user.settings && user.settings.livestream;

Meteor.methods({
  livestreamStreamStatus({
    streamId
  }) {
    return Promise.asyncApply(() => {
      if (!streamId) {
        // TODO: change error
        throw new Meteor.Error('error-not-allowed', 'Livestream ID not found', {
          method: 'livestreamStreamStatus'
        });
      }

      const livestreamSettings = selectLivestreamSettings(Meteor.user());

      if (!livestreamSettings) {
        throw new Meteor.Error('error-not-allowed', 'You have no settings to stream', {
          method: 'livestreamStreamStatus'
        });
      }

      const {
        access_token,
        refresh_token
      } = livestreamSettings;
      return Promise.await(statusStreamLiveStream({
        id: streamId,
        access_token,
        refresh_token,
        clientId: RocketChat.settings.get('Broadcasting_client_id'),
        clientSecret: RocketChat.settings.get('Broadcasting_client_secret')
      }));
    });
  },

  setLivestreamStatus({
    broadcastId,
    status
  }) {
    return Promise.asyncApply(() => {
      if (!broadcastId) {
        // TODO: change error
        throw new Meteor.Error('error-not-allowed', 'You have no settings to livestream', {
          method: 'livestreamStart'
        });
      }

      const livestreamSettings = selectLivestreamSettings(Meteor.user());

      if (!livestreamSettings) {
        throw new Meteor.Error('error-not-allowed', 'You have no settings to livestream', {
          method: 'livestreamStart'
        });
      }

      const {
        access_token,
        refresh_token
      } = livestreamSettings;
      return Promise.await(statusLiveStream({
        id: broadcastId,
        access_token,
        refresh_token,
        status,
        clientId: RocketChat.settings.get('Broadcasting_client_id'),
        clientSecret: RocketChat.settings.get('Broadcasting_client_secret')
      }));
    });
  },

  livestreamGet({
    rid
  }) {
    return Promise.asyncApply(() => {
      const livestreamSettings = selectLivestreamSettings(Meteor.user());

      if (!livestreamSettings) {
        throw new Meteor.Error('error-not-allowed', 'You have no settings to livestream', {
          method: 'livestreamGet'
        });
      }

      const room = RocketChat.models.Rooms.findOne({
        _id: rid
      });

      if (!room) {
        // TODO: change error
        throw new Meteor.Error('error-not-allowed', 'You have no settings to livestream', {
          method: 'livestreamGet'
        });
      }

      const {
        access_token,
        refresh_token
      } = livestreamSettings;
      return Promise.await(createLiveStream({
        room,
        access_token,
        refresh_token,
        clientId: RocketChat.settings.get('Broadcasting_client_id'),
        clientSecret: RocketChat.settings.get('Broadcasting_client_secret')
      }));
    });
  },

  getBroadcastStatus({
    broadcastId
  }) {
    return Promise.asyncApply(() => {
      if (!broadcastId) {
        // TODO: change error
        throw new Meteor.Error('error-not-allowed', 'Broadcast ID not found', {
          method: 'getBroadcastStatus'
        });
      }

      const livestreamSettings = selectLivestreamSettings(Meteor.user());

      if (!livestreamSettings) {
        throw new Meteor.Error('error-not-allowed', 'You have no settings to stream', {
          method: 'getBroadcastStatus'
        });
      }

      const {
        access_token,
        refresh_token
      } = livestreamSettings;
      return Promise.await(getBroadcastStatus({
        id: broadcastId,
        access_token,
        refresh_token,
        clientId: RocketChat.settings.get('Broadcasting_client_id'),
        clientSecret: RocketChat.settings.get('Broadcasting_client_secret')
      }));
    });
  },

  setBroadcastStatus({
    broadcastId,
    status
  }) {
    return Promise.asyncApply(() => {
      if (!broadcastId) {
        // TODO: change error
        throw new Meteor.Error('error-not-allowed', 'Broadcast ID not found', {
          method: 'setBroadcastStatus'
        });
      }

      const livestreamSettings = selectLivestreamSettings(Meteor.user());

      if (!livestreamSettings) {
        throw new Meteor.Error('error-not-allowed', 'You have no settings to stream', {
          method: 'setBroadcastStatus'
        });
      }

      const {
        access_token,
        refresh_token
      } = livestreamSettings;
      return Promise.await(setBroadcastStatus({
        id: broadcastId,
        access_token,
        refresh_token,
        status,
        clientId: RocketChat.settings.get('Broadcasting_client_id'),
        clientSecret: RocketChat.settings.get('Broadcasting_client_secret')
      }));
    });
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"routes.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_livestream/server/routes.js                                                                //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
let google;
module.watch(require("googleapis"), {
  default(v) {
    google = v;
  }

}, 0);
const {
  OAuth2
} = google.auth;
RocketChat.API.v1.addRoute('livestream/oauth', {
  get: function functionName() {
    const clientAuth = new OAuth2(RocketChat.settings.get('Broadcasting_client_id'), RocketChat.settings.get('Broadcasting_client_secret'), `${RocketChat.settings.get('Site_Url')}/api/v1/livestream/oauth/callback`.replace(/\/{2}api/g, '/api'));
    const {
      userId
    } = this.queryParams;
    const url = clientAuth.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/youtube'],
      state: JSON.stringify({
        userId
      })
    });
    return {
      statusCode: 302,
      headers: {
        Location: url
      },
      body: 'Oauth redirect'
    };
  }
});
RocketChat.API.v1.addRoute('livestream/oauth/callback', {
  get: function functionName() {
    const {
      code,
      state
    } = this.queryParams;
    const {
      userId
    } = JSON.parse(state);
    const clientAuth = new OAuth2(RocketChat.settings.get('Broadcasting_client_id'), RocketChat.settings.get('Broadcasting_client_secret'), `${RocketChat.settings.get('Site_Url')}/api/v1/livestream/oauth/callback`.replace(/\/{2}api/g, '/api'));
    const ret = Meteor.wrapAsync(clientAuth.getToken.bind(clientAuth))(code);
    RocketChat.models.Users.update({
      _id: userId
    }, {
      $set: {
        'settings.livestream': ret
      }
    });
    return {
      headers: {
        'content-type': 'text/html'
      },
      body: '<script>window.close()</script>'
    };
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"node_modules":{"googleapis":{"package.json":function(require,exports){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// node_modules/meteor/rocketchat_livestream/node_modules/googleapis/package.json                                 //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
exports.name = "googleapis";
exports.version = "25.0.0";
exports.main = "./build/src/lib/googleapis.js";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"build":{"src":{"lib":{"googleapis.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// node_modules/meteor/rocketchat_livestream/node_modules/googleapis/build/src/lib/googleapis.js                  //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
"use strict";
// Copyright 2012-2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var apis = require("../apis");
var discovery_1 = require("./discovery");
var discovery = new discovery_1.Discovery({ debug: false, includePrivate: false });
/**
 * @class GoogleAuth
 */
var google_auth_library_1 = require("google-auth-library");
/**
 * GoogleApis constructor.
 *
 * @example
 * const GoogleApis = require('googleapis').GoogleApis;
 * const google = new GoogleApis();
 *
 * @class GoogleApis
 * @param {Object} [options] Configuration options.
 */
function GoogleApis(options) {
    this.options(options);
    this.addAPIs(apis);
    /**
     * A reference to an instance of GoogleAuth.
     *
     * @name GoogleApis#auth
     * @type {GoogleAuth}
     */
    this.auth = new google_auth_library_1.GoogleAuth();
    this.auth.JWT = google_auth_library_1.JWT;
    this.auth.Compute = google_auth_library_1.Compute;
    this.auth.OAuth2 = google_auth_library_1.OAuth2Client;
    /**
     * A reference to the {@link GoogleApis} constructor function.
     *
     * @name GoogleApis#GoogleApis
     * @see GoogleApis
     * @type {Function}
     */
    this.GoogleApis = GoogleApis;
}
/**
 * Set options.
 *
 * @param  {Object} [options] Configuration options.
 */
GoogleApis.prototype.options = function (options) {
    this._options = options || {};
};
/**
 * Add APIs endpoints to googleapis object
 * E.g. googleapis.drive and googleapis.datastore
 *
 * @name GoogleApis#addAPIs
 * @method
 * @param {Object} apis Apis to be added to this GoogleApis instance.
 * @private
 */
GoogleApis.prototype.addAPIs = function (apisToAdd) {
    for (var apiName in apisToAdd) {
        if (apisToAdd.hasOwnProperty(apiName)) {
            this[apiName] = apisToAdd[apiName].bind(this);
        }
    }
};
/**
 * Dynamically generate an apis object that can provide Endpoint objects for the
 * discovered APIs.
 *
 * @example
 * const google = require('googleapis');
 * const discoveryUrl = 'https://myapp.appspot.com/_ah/api/discovery/v1/apis/';
 * google.discover(discoveryUrl, function (err) {
 *   const someapi = google.someapi('v1');
 * });
 *
 * @name GoogleApis#discover
 * @method
 * @param {string} url Url to the discovery service for a set of APIs. e.g.,
 * https://www.googleapis.com/discovery/v1/apis
 * @param {Function} callback Callback function.
 */
GoogleApis.prototype.discover = function (url, callback) {
    var self = this;
    discovery.discoverAllAPIs(url, function (err, allApis) {
        if (err) {
            return callback(err);
        }
        self.addAPIs(allApis);
        callback();
    });
};
/**
 * Dynamically generate an Endpoint object from a discovery doc.
 *
 * @example
 * const google = require('google');
 * const discoveryDocUrl =
 * 'https://myapp.appspot.com/_ah/api/discovery/v1/apis/someapi/v1/rest';
 * google.discoverApi(discoveryDocUrl, function (err, someapi) {
 *   // use someapi
 * });
 *
 * @name GoogleApis#discoverAPI
 * @method
 * @param {string} path Url or file path to discover doc for a single API.
 * @param {object} [options] Options to configure the Endpoint object generated
 * from the discovery doc.
 * @param {Function} callback Callback function.
 */
GoogleApis.prototype.discoverAPI = function (apiPath, options, callback) {
    var self = this;
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    if (!options) {
        options = {};
    }
    // Creating an object, so Pascal case is appropriate.
    // tslint:disable-next-line
    discovery.discoverAPI(apiPath, function (err, Endpoint) {
        if (err) {
            return callback(err);
        }
        var ep = new Endpoint(options);
        ep.google = self; // for drive.google.transporter
        return callback(null, Object.freeze(ep)); // create new & freeze
    });
};
module.exports = new GoogleApis();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:livestream/server/index.js");
require("/node_modules/meteor/rocketchat:livestream/server/models/Rooms.js");
require("/node_modules/meteor/rocketchat:livestream/server/functions/saveStreamingOptions.js");
require("/node_modules/meteor/rocketchat:livestream/server/settings.js");

/* Exports */
Package._define("rocketchat:livestream");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_livestream.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlc3RyZWFtL3NlcnZlci9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsaXZlc3RyZWFtL3NlcnZlci9tb2RlbHMvUm9vbXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZXN0cmVhbS9zZXJ2ZXIvZnVuY3Rpb25zL3NhdmVTdHJlYW1pbmdPcHRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVzdHJlYW0vc2VydmVyL2Z1bmN0aW9ucy9saXZlc3RyZWFtLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVzdHJlYW0vc2VydmVyL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxpdmVzdHJlYW0vc2VydmVyL21ldGhvZHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bGl2ZXN0cmVhbS9zZXJ2ZXIvcm91dGVzLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsIlJvY2tldENoYXQiLCJtb2RlbHMiLCJSb29tcyIsInNldFN0cmVhbWluZ09wdGlvbnNCeUlkIiwiX2lkIiwic3RyZWFtaW5nT3B0aW9ucyIsInVwZGF0ZSIsIiRzZXQiLCJzYXZlU3RyZWFtaW5nT3B0aW9ucyIsInJpZCIsIm9wdGlvbnMiLCJNYXRjaCIsInRlc3QiLCJTdHJpbmciLCJNZXRlb3IiLCJFcnJvciIsImZ1bmN0aW9uIiwiY2hlY2siLCJ0eXBlIiwiT3B0aW9uYWwiLCJ1cmwiLCJ0aHVtYm5haWwiLCJpc0F1ZGlvT25seSIsIm1lc3NhZ2UiLCJleHBvcnQiLCJnZXRCcm9hZGNhc3RTdGF0dXMiLCJzdGF0dXNTdHJlYW1MaXZlU3RyZWFtIiwic3RhdHVzTGl2ZVN0cmVhbSIsInNldEJyb2FkY2FzdFN0YXR1cyIsImNyZWF0ZUxpdmVTdHJlYW0iLCJnb29nbGUiLCJkZWZhdWx0IiwidiIsIk9BdXRoMiIsImF1dGgiLCJwIiwiZm4iLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImVyciIsInZhbHVlIiwiZGF0YSIsImlkIiwiYWNjZXNzX3Rva2VuIiwicmVmcmVzaF90b2tlbiIsImNsaWVudElkIiwiY2xpZW50U2VjcmV0Iiwic2V0Q3JlZGVudGlhbHMiLCJ5b3V0dWJlIiwidmVyc2lvbiIsInJlc3VsdCIsImxpdmVCcm9hZGNhc3RzIiwibGlzdCIsInBhcnQiLCJpdGVtcyIsInN0YXR1cyIsImxpZmVDeWNsZVN0YXR1cyIsImxpdmVTdHJlYW1zIiwic3RyZWFtU3RhdHVzIiwidHJhbnNpdGlvbiIsImJyb2FkY2FzdFN0YXR1cyIsInJvb20iLCJzdHJlYW0iLCJicm9hZGNhc3QiLCJhbGwiLCJpbnNlcnQiLCJyZXNvdXJjZSIsInNuaXBwZXQiLCJ0aXRsZSIsIm5hbWUiLCJjZG4iLCJmb3JtYXQiLCJpbmdlc3Rpb25UeXBlIiwic2NoZWR1bGVkU3RhcnRUaW1lIiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwicHJpdmFjeVN0YXR1cyIsImJpbmQiLCJzdHJlYW1JZCIsImluZ2VzdGlvbkluZm8iLCJzdHJlYW1OYW1lIiwic3RhcnR1cCIsInNldHRpbmdzIiwiYWRkR3JvdXAiLCJhZGQiLCJwdWJsaWMiLCJhbGVydCIsImVuYWJsZVF1ZXJ5Iiwic2VsZWN0TGl2ZXN0cmVhbVNldHRpbmdzIiwidXNlciIsImxpdmVzdHJlYW0iLCJtZXRob2RzIiwibGl2ZXN0cmVhbVN0cmVhbVN0YXR1cyIsIm1ldGhvZCIsImxpdmVzdHJlYW1TZXR0aW5ncyIsImdldCIsInNldExpdmVzdHJlYW1TdGF0dXMiLCJicm9hZGNhc3RJZCIsImxpdmVzdHJlYW1HZXQiLCJmaW5kT25lIiwiQVBJIiwidjEiLCJhZGRSb3V0ZSIsImZ1bmN0aW9uTmFtZSIsImNsaWVudEF1dGgiLCJyZXBsYWNlIiwidXNlcklkIiwicXVlcnlQYXJhbXMiLCJnZW5lcmF0ZUF1dGhVcmwiLCJhY2Nlc3NfdHlwZSIsInNjb3BlIiwic3RhdGUiLCJKU09OIiwic3RyaW5naWZ5Iiwic3RhdHVzQ29kZSIsImhlYWRlcnMiLCJMb2NhdGlvbiIsImJvZHkiLCJjb2RlIiwicGFyc2UiLCJyZXQiLCJ3cmFwQXN5bmMiLCJnZXRUb2tlbiIsIlVzZXJzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxhQUFSLENBQWI7QUFBcUNGLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxjQUFSLENBQWIsRTs7Ozs7Ozs7Ozs7QUNBckNDLFdBQVdDLE1BQVgsQ0FBa0JDLEtBQWxCLENBQXdCQyx1QkFBeEIsR0FBa0QsVUFBU0MsR0FBVCxFQUFjQyxnQkFBZCxFQUFnQztBQUNqRixRQUFNQyxTQUFTO0FBQ2RDLFVBQU07QUFDTEY7QUFESztBQURRLEdBQWY7QUFLQSxTQUFPLEtBQUtDLE1BQUwsQ0FBWTtBQUFFRjtBQUFGLEdBQVosRUFBcUJFLE1BQXJCLENBQVA7QUFDQSxDQVBELEM7Ozs7Ozs7Ozs7O0FDQUFOLFdBQVdRLG9CQUFYLEdBQWtDLFVBQVNDLEdBQVQsRUFBY0MsT0FBZCxFQUF1QjtBQUN4RCxNQUFJLENBQUNDLE1BQU1DLElBQU4sQ0FBV0gsR0FBWCxFQUFnQkksTUFBaEIsQ0FBTCxFQUE4QjtBQUM3QixVQUFNLElBQUlDLE9BQU9DLEtBQVgsQ0FBaUIsY0FBakIsRUFBaUMsY0FBakMsRUFBaUQ7QUFDdERDLGdCQUFVO0FBRDRDLEtBQWpELENBQU47QUFHQTs7QUFFREMsUUFBTVAsT0FBTixFQUFlO0FBQ2RRLFVBQU1QLE1BQU1RLFFBQU4sQ0FBZU4sTUFBZixDQURRO0FBRWRPLFNBQUtULE1BQU1RLFFBQU4sQ0FBZU4sTUFBZixDQUZTO0FBR2RRLGVBQVdWLE1BQU1RLFFBQU4sQ0FBZU4sTUFBZixDQUhHO0FBSWRTLGlCQUFhWCxNQUFNUSxRQUFOLENBQWVOLE1B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bUYsUUFBWCxDQUFvQmEsR0FBcEIsQ0FBd0IsVUFBeEIsQ0FBcUMsbUNBQXpDLENBQTRFVSxPQUE1RSxDQUFvRixXQUFwRixFQUFpRyxNQUFqRyxDQUFySCxDQUFuQjtBQUVBLFVBQU1lLE1BQU0zRyxPQUFPNEcsU0FBUCxDQUFpQmpCLFdBQVdrQixRQUFYLENBQW9CN0MsSUFBcEIsQ0FBeUIyQixVQUF6QixDQUFqQixFQUF1RGMsSUFBdkQsQ0FBWjtBQUVBdkgsZUFBV0MsTUFBWCxDQUFrQjJILEtBQWxCLENBQXdCdEgsTUFBeEIsQ0FBK0I7QUFBRUYsV0FBS3VHO0FBQVAsS0FBL0IsRUFBZ0Q7QUFBRXBHLFlBQU07QUFDdkQsK0JBQXdCa0g7QUFEK0I7QUFBUixLQUFoRDtBQUlBLFdBQU87QUFDTkwsZUFBUztBQUNSLHdCQUFpQjtBQURULE9BREg7QUFHSEUsWUFBTTtBQUhILEtBQVA7QUFLQTtBQW5Cc0QsQ0FBeEQsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9saXZlc3RyZWFtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICcuL3JvdXRlcy5qcyc7XG5pbXBvcnQgJy4vbWV0aG9kcy5qcyc7XG4iLCJSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5zZXRTdHJlYW1pbmdPcHRpb25zQnlJZCA9IGZ1bmN0aW9uKF9pZCwgc3RyZWFtaW5nT3B0aW9ucykge1xuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHNldDoge1xuXHRcdFx0c3RyZWFtaW5nT3B0aW9ucyxcblx0XHR9LFxuXHR9O1xuXHRyZXR1cm4gdGhpcy51cGRhdGUoeyBfaWQgfSwgdXBkYXRlKTtcbn07XG4iLCJSb2NrZXRDaGF0LnNhdmVTdHJlYW1pbmdPcHRpb25zID0gZnVuY3Rpb24ocmlkLCBvcHRpb25zKSB7XG5cdGlmICghTWF0Y2gudGVzdChyaWQsIFN0cmluZykpIHtcblx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLXJvb20nLCAnSW52YWxpZCByb29tJywge1xuXHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LnNhdmVTdHJlYW1pbmdPcHRpb25zJyxcblx0XHR9KTtcblx0fVxuXG5cdGNoZWNrKG9wdGlvbnMsIHtcblx0XHR0eXBlOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuXHRcdHVybDogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHR0aHVtYm5haWw6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0aXNBdWRpb09ubHk6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0bWVzc2FnZTogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0fSk7XG5cblx0Um9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuc2V0U3RyZWFtaW5nT3B0aW9uc0J5SWQocmlkLCBvcHRpb25zKTtcbn07XG4iLCJpbXBvcnQgZ29vZ2xlIGZyb20gJ2dvb2dsZWFwaXMnO1xuY29uc3QgeyBPQXV0aDIgfSA9IGdvb2dsZS5hdXRoO1xuXG5cbmNvbnN0IHAgPSAoZm4pID0+IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuXHRmbihmdW5jdGlvbihlcnIsIHZhbHVlKSB7XG5cdFx0aWYgKGVycikge1xuXHRcdFx0cmV0dXJuIHJlamVjdChlcnIpO1xuXHRcdH1cblx0XHRyZXNvbHZlKHZhbHVlLmRhdGEpO1xuXHR9KTtcbn0pO1xuXG5leHBvcnQgY29uc3QgZ2V0QnJvYWRjYXN0U3RhdHVzID0gYXN5bmMoe1xuXHRpZCxcblx0YWNjZXNzX3Rva2VuLFxuXHRyZWZyZXNoX3Rva2VuLFxuXHRjbGllbnRJZCxcblx0Y2xpZW50U2VjcmV0LFxufSkgPT4ge1xuXHRjb25zdCBhdXRoID0gbmV3IE9BdXRoMihjbGllbnRJZCwgY2xpZW50U2VjcmV0KTtcblxuXHRhdXRoLnNldENyZWRlbnRpYWxzKHtcblx0XHRhY2Nlc3NfdG9rZW4sXG5cdFx0cmVmcmVzaF90b2tlbixcblx0fSk7XG5cdGNvbnN0IHlvdXR1YmUgPSBnb29nbGUueW91dHViZSh7IHZlcnNpb246J3YzJywgYXV0aCB9KTtcblx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgcCgocmVzb2x2ZSkgPT4geW91dHViZS5saXZlQnJvYWRjYXN0cy5saXN0KHtcblx0XHRwYXJ0OidpZCxzdGF0dXMnLFxuXHRcdGlkLFxuXHR9LCByZXNvbHZlKSk7XG5cdHJldHVybiByZXN1bHQuaXRlbXMgJiYgcmVzdWx0Lml0ZW1zWzBdICYmIHJlc3VsdC5pdGVtc1swXS5zdGF0dXMubGlmZUN5Y2xlU3RhdHVzO1xufTtcblxuZXhwb3J0IGNvbnN0IHN0YXR1c1N0cmVhbUxpdmVTdHJlYW0gPSBhc3luYyh7XG5cdGlkLFxuXHRhY2Nlc3NfdG9rZW4sXG5cdHJlZnJlc2hfdG9rZW4sXG5cdGNsaWVudElkLFxuXHRjbGllbnRTZWNyZXQsXG59KSA9PiB7XG5cdGNvbnN0IGF1dGggPSBuZXcgT0F1dGgyKGNsaWVudElkLCBjbGllbnRTZWNyZXQpO1xuXG5cdGF1dGguc2V0Q3JlZGVudGlhbHMoe1xuXHRcdGFjY2Vzc190b2tlbixcblx0XHRyZWZyZXNoX3Rva2VuLFxuXHR9KTtcblxuXHRjb25zdCB5b3V0dWJlID0gZ29vZ2xlLnlvdXR1YmUoeyB2ZXJzaW9uOid2MycsIGF1dGggfSk7XG5cdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHAoKHJlc29sdmUpID0+IHlvdXR1YmUubGl2ZVN0cmVhbXMubGlzdCh7XG5cdFx0cGFydDonaWQsc3RhdHVzJyxcblx0XHRpZCxcblx0fSwgcmVzb2x2ZSkpO1xuXHRyZXR1cm4gcmVzdWx0Lml0ZW1zICYmIHJlc3VsdC5pdGVtc1swXS5zdGF0dXMuc3RyZWFtU3RhdHVzO1xufTtcblxuZXhwb3J0IGNvbnN0IHN0YXR1c0xpdmVTdHJlYW0gPSAoe1xuXHRpZCxcblx0YWNjZXNzX3Rva2VuLFxuXHRyZWZyZXNoX3Rva2VuLFxuXHRjbGllbnRJZCxcblx0Y2xpZW50U2VjcmV0LFxuXHRzdGF0dXMsXG59KSA9PiB7XG5cdGNvbnN0IGF1dGggPSBuZXcgT0F1dGgyKGNsaWVudElkLCBjbGllbnRTZWNyZXQpO1xuXG5cdGF1dGguc2V0Q3JlZGVudGlhbHMoe1xuXHRcdGFjY2Vzc190b2tlbixcblx0XHRyZWZyZXNoX3Rva2VuLFxuXHR9KTtcblxuXHRjb25zdCB5b3V0dWJlID0gZ29vZ2xlLnlvdXR1YmUoeyB2ZXJzaW9uOid2MycsIGF1dGggfSk7XG5cblx0cmV0dXJuIHAoKHJlc29sdmUpID0+IHlvdXR1YmUubGl2ZUJyb2FkY2FzdHMudHJhbnNpdGlvbih7XG5cdFx0cGFydDonaWQsc3RhdHVzJyxcblx0XHRpZCxcblx0XHRicm9hZGNhc3RTdGF0dXM6IHN0YXR1cyxcblx0fSwgcmVzb2x2ZSkpO1xufTtcblxuZXhwb3J0IGNvbnN0IHNldEJyb2FkY2FzdFN0YXR1cyA9ICh7XG5cdGlkLFxuXHRhY2Nlc3NfdG9rZW4sXG5cdHJlZnJlc2hfdG9rZW4sXG5cdGNsaWVudElkLFxuXHRjbGllbnRTZWNyZXQsXG5cdHN0YXR1cyxcbn0pID0+IHtcblx0Y29uc3QgYXV0aCA9IG5ldyBPQXV0aDIoY2xpZW50SWQsIGNsaWVudFNlY3JldCk7XG5cblx0YXV0aC5zZXRDcmVkZW50aWFscyh7XG5cdFx0YWNjZXNzX3Rva2VuLFxuXHRcdHJlZnJlc2hfdG9rZW4sXG5cdH0pO1xuXG5cdGNvbnN0IHlvdXR1YmUgPSBnb29nbGUueW91dHViZSh7IHZlcnNpb246J3YzJywgYXV0aCB9KTtcblxuXHRyZXR1cm4gcCgocmVzb2x2ZSkgPT4geW91dHViZS5saXZlQnJvYWRjYXN0cy50cmFuc2l0aW9uKHtcblx0XHRwYXJ0OidpZCxzdGF0dXMnLFxuXHRcdGlkLFxuXHRcdGJyb2FkY2FzdFN0YXR1czogc3RhdHVzLFxuXHR9LCByZXNvbHZlKSk7XG59O1xuXG5leHBvcnQgY29uc3QgY3JlYXRlTGl2ZVN0cmVhbSA9IGFzeW5jKHtcblx0cm9vbSxcblx0YWNjZXNzX3Rva2VuLFxuXHRyZWZyZXNoX3Rva2VuLFxuXHRjbGllbnRJZCxcblx0Y2xpZW50U2VjcmV0LFxufSkgPT4ge1xuXHRjb25zdCBhdXRoID0gbmV3IE9BdXRoMihjbGllbnRJZCwgY2xpZW50U2VjcmV0KTtcblx0YXV0aC5zZXRDcmVkZW50aWFscyh7XG5cdFx0YWNjZXNzX3Rva2VuLFxuXHRcdHJlZnJlc2hfdG9rZW4sXG5cdH0pO1xuXHRjb25zdCB5b3V0dWJlID0gZ29vZ2xlLnlvdXR1YmUoeyB2ZXJzaW9uOid2MycsIGF1dGggfSk7XG5cblx0Y29uc3QgW3N0cmVhbSwgYnJvYWRjYXN0XSA9IGF3YWl0IFByb21pc2UuYWxsKFtwKChyZXNvbHZlKSA9PiB5b3V0dWJlLmxpdmVTdHJlYW1zLmluc2VydCh7XG5cdFx0cGFydDogJ2lkLHNuaXBwZXQsY2RuLGNvbnRlbnREZXRhaWxzLHN0YXR1cycsXG5cdFx0cmVzb3VyY2U6IHtcblx0XHRcdHNuaXBwZXQ6IHtcblx0XHRcdFx0dGl0bGU6IHJvb20ubmFtZSB8fCAnUm9ja2V0Q2hhdCBCcm9hZGNhc3QnLFxuXHRcdFx0fSxcblx0XHRcdGNkbjoge1xuXHRcdFx0XHRmb3JtYXQ6ICc0ODBwJyxcblx0XHRcdFx0aW5nZXN0aW9uVHlwZTogJ3J0bXAnLFxuXHRcdFx0fSxcblx0XHR9LFxuXHR9LCByZXNvbHZlKSksIHAoKHJlc29sdmUpID0+IHlvdXR1YmUubGl2ZUJyb2FkY2FzdHMuaW5zZXJ0KHtcblx0XHRwYXJ0OiAnaWQsc25pcHBldCxjb250ZW50RGV0YWlscyxzdGF0dXMnLFxuXHRcdHJlc291cmNlOiB7XG5cdFx0XHRzbmlwcGV0OiB7XG5cdFx0XHRcdHRpdGxlOiByb29tLm5hbWUgfHwgJ1JvY2tldENoYXQgQnJvYWRjYXN0Jyxcblx0XHRcdFx0c2NoZWR1bGVkU3RhcnRUaW1lIDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuXHRcdFx0fSxcblx0XHRcdHN0YXR1czoge1xuXHRcdFx0XHRwcml2YWN5U3RhdHVzOiAndW5saXN0ZWQnLFxuXHRcdFx0fSxcblx0XHR9LFxuXHR9LCByZXNvbHZlKSldKTtcblxuXHRhd2FpdCBwKChyZXNvbHZlKSA9PiB5b3V0dWJlLmxpdmVCcm9hZGNhc3RzLmJpbmQoe1xuXHRcdHBhcnQ6ICdpZCxzbmlwcGV0LHN0YXR1cycsXG5cdFx0Ly8gcmVzb3VyY2U6IHtcblx0XHRpZDogYnJvYWRjYXN0LmlkLFxuXHRcdHN0cmVhbUlkOiBzdHJlYW0uaWQsXG5cdH0sIHJlc29sdmUpKTtcblxuXHRyZXR1cm4geyBpZDogc3RyZWFtLmNkbi5pbmdlc3Rpb25JbmZvLnN0cmVhbU5hbWUsIHN0cmVhbSwgYnJvYWRjYXN0IH07XG59O1xuIiwiTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkR3JvdXAoJ0xpdmVTdHJlYW0gJiBCcm9hZGNhc3RpbmcnLCBmdW5jdGlvbigpIHtcblxuXHRcdHRoaXMuYWRkKCdMaXZlc3RyZWFtX2VuYWJsZWQnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0YWxlcnQ6ICdUaGlzIGZlYXR1cmUgaXMgY3VycmVudGx5IGluIGJldGEhIFBsZWFzZSByZXBvcnQgYnVncyB0byBnaXRodWIuY29tL1JvY2tldENoYXQvUm9ja2V0LkNoYXQvaXNzdWVzJyxcblx0XHR9KTtcblxuXHRcdHRoaXMuYWRkKCdCcm9hZGNhc3RpbmdfZW5hYmxlZCcsIGZhbHNlLCB7XG5cdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRwdWJsaWM6IHRydWUsXG5cdFx0XHRhbGVydDogJ1RoaXMgZmVhdHVyZSBpcyBjdXJyZW50bHkgaW4gYmV0YSEgUGxlYXNlIHJlcG9ydCBidWdzIHRvIGdpdGh1Yi5jb20vUm9ja2V0Q2hhdC9Sb2NrZXQuQ2hhdC9pc3N1ZXMnLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHsgX2lkOiAnTGl2ZXN0cmVhbV9lbmFibGVkJywgdmFsdWU6IHRydWUgfSxcblx0XHR9KTtcblxuXHRcdHRoaXMuYWRkKCdCcm9hZGNhc3RpbmdfY2xpZW50X2lkJywgJycsIHsgdHlwZTogJ3N0cmluZycsIHB1YmxpYzogZmFsc2UsIGVuYWJsZVF1ZXJ5OiB7IF9pZDogJ0Jyb2FkY2FzdGluZ19lbmFibGVkJywgdmFsdWU6IHRydWUgfSB9KTtcblx0XHR0aGlzLmFkZCgnQnJvYWRjYXN0aW5nX2NsaWVudF9zZWNyZXQnLCAnJywgeyB0eXBlOiAnc3RyaW5nJywgcHVibGljOiBmYWxzZSwgZW5hYmxlUXVlcnk6IHsgX2lkOiAnQnJvYWRjYXN0aW5nX2VuYWJsZWQnLCB2YWx1ZTogdHJ1ZSB9IH0pO1xuXHRcdHRoaXMuYWRkKCdCcm9hZGNhc3RpbmdfYXBpX2tleScsICcnLCB7IHR5cGU6ICdzdHJpbmcnLCBwdWJsaWM6IGZhbHNlLCBlbmFibGVRdWVyeTogeyBfaWQ6ICdCcm9hZGNhc3RpbmdfZW5hYmxlZCcsIHZhbHVlOiB0cnVlIH0gfSk7XG5cdFx0dGhpcy5hZGQoJ0Jyb2FkY2FzdGluZ19tZWRpYV9zZXJ2ZXJfdXJsJywgJycsIHsgdHlwZTogJ3N0cmluZycsIHB1YmxpYzogdHJ1ZSwgZW5hYmxlUXVlcnk6IHsgX2lkOiAnQnJvYWRjYXN0aW5nX2VuYWJsZWQnLCB2YWx1ZTogdHJ1ZSB9IH0pO1xuXHR9KTtcbn0pO1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBjcmVhdGVMaXZlU3RyZWFtLCBzdGF0dXNMaXZlU3RyZWFtLCBzdGF0dXNTdHJlYW1MaXZlU3RyZWFtLCBnZXRCcm9hZGNhc3RTdGF0dXMsIHNldEJyb2FkY2FzdFN0YXR1cyB9IGZyb20gJy4vZnVuY3Rpb25zL2xpdmVzdHJlYW0nO1xuXG5jb25zdCBzZWxlY3RMaXZlc3RyZWFtU2V0dGluZ3MgPSAodXNlcikgPT4gdXNlciAmJiB1c2VyLnNldHRpbmdzICYmIHVzZXIuc2V0dGluZ3MubGl2ZXN0cmVhbTtcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXG5cdGFzeW5jIGxpdmVzdHJlYW1TdHJlYW1TdGF0dXMoeyBzdHJlYW1JZCB9KSB7XG5cdFx0aWYgKCFzdHJlYW1JZCkge1xuXHRcdFx0Ly8gVE9ETzogY2hhbmdlIGVycm9yXG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdMaXZlc3RyZWFtIElEIG5vdCBmb3VuZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAnbGl2ZXN0cmVhbVN0cmVhbVN0YXR1cycsXG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0Y29uc3QgbGl2ZXN0cmVhbVNldHRpbmdzID0gc2VsZWN0TGl2ZXN0cmVhbVNldHRpbmdzKE1ldGVvci51c2VyKCkpO1xuXG5cdFx0aWYgKCFsaXZlc3RyZWFtU2V0dGluZ3MpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ1lvdSBoYXZlIG5vIHNldHRpbmdzIHRvIHN0cmVhbScsIHtcblx0XHRcdFx0bWV0aG9kOiAnbGl2ZXN0cmVhbVN0cmVhbVN0YXR1cycsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCB7IGFjY2Vzc190b2tlbiwgcmVmcmVzaF90b2tlbiB9ID0gbGl2ZXN0cmVhbVNldHRpbmdzO1xuXG5cdFx0cmV0dXJuIGF3YWl0IHN0YXR1c1N0cmVhbUxpdmVTdHJlYW0oe1xuXHRcdFx0aWQ6IHN0cmVhbUlkLFxuXHRcdFx0YWNjZXNzX3Rva2VuLFxuXHRcdFx0cmVmcmVzaF90b2tlbixcblx0XHRcdGNsaWVudElkOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQnJvYWRjYXN0aW5nX2NsaWVudF9pZCcpLFxuXHRcdFx0Y2xpZW50U2VjcmV0OiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQnJvYWRjYXN0aW5nX2NsaWVudF9zZWNyZXQnKSxcblx0XHR9KTtcblxuXHR9LFxuXHRhc3luYyBzZXRMaXZlc3RyZWFtU3RhdHVzKHsgYnJvYWRjYXN0SWQsIHN0YXR1cyB9KSB7XG5cdFx0aWYgKCFicm9hZGNhc3RJZCkge1xuXHRcdFx0Ly8gVE9ETzogY2hhbmdlIGVycm9yXG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdZb3UgaGF2ZSBubyBzZXR0aW5ncyB0byBsaXZlc3RyZWFtJywge1xuXHRcdFx0XHRtZXRob2Q6ICdsaXZlc3RyZWFtU3RhcnQnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGNvbnN0IGxpdmVzdHJlYW1TZXR0aW5ncyA9IHNlbGVjdExpdmVzdHJlYW1TZXR0aW5ncyhNZXRlb3IudXNlcigpKTtcblxuXHRcdGlmICghbGl2ZXN0cmVhbVNldHRpbmdzKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdZb3UgaGF2ZSBubyBzZXR0aW5ncyB0byBsaXZlc3RyZWFtJywge1xuXHRcdFx0XHRtZXRob2Q6ICdsaXZlc3RyZWFtU3RhcnQnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBhY2Nlc3NfdG9rZW4sIHJlZnJlc2hfdG9rZW4gfSA9IGxpdmVzdHJlYW1TZXR0aW5ncztcblxuXHRcdHJldHVybiBhd2FpdCBzdGF0dXNMaXZlU3RyZWFtKHtcblx0XHRcdGlkOiBicm9hZGNhc3RJZCxcblx0XHRcdGFjY2Vzc190b2tlbixcblx0XHRcdHJlZnJlc2hfdG9rZW4sXG5cdFx0XHRzdGF0dXMsXG5cdFx0XHRjbGllbnRJZDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Jyb2FkY2FzdGluZ19jbGllbnRfaWQnKSxcblx0XHRcdGNsaWVudFNlY3JldDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Jyb2FkY2FzdGluZ19jbGllbnRfc2VjcmV0JyksXG5cdFx0fSk7XG5cblx0fSxcblx0YXN5bmMgbGl2ZXN0cmVhbUdldCh7IHJpZCB9KSB7XG5cdFx0Y29uc3QgbGl2ZXN0cmVhbVNldHRpbmdzID0gc2VsZWN0TGl2ZXN0cmVhbVNldHRpbmdzKE1ldGVvci51c2VyKCkpO1xuXG5cdFx0aWYgKCFsaXZlc3RyZWFtU2V0dGluZ3MpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ1lvdSBoYXZlIG5vIHNldHRpbmdzIHRvIGxpdmVzdHJlYW0nLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2xpdmVzdHJlYW1HZXQnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmUoeyBfaWQ6IHJpZCB9KTtcblxuXHRcdGlmICghcm9vbSkge1xuXHRcdFx0Ly8gVE9ETzogY2hhbmdlIGVycm9yXG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdZb3UgaGF2ZSBubyBzZXR0aW5ncyB0byBsaXZlc3RyZWFtJywge1xuXHRcdFx0XHRtZXRob2Q6ICdsaXZlc3RyZWFtR2V0Jyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHsgYWNjZXNzX3Rva2VuLCByZWZyZXNoX3Rva2VuIH0gPSBsaXZlc3RyZWFtU2V0dGluZ3M7XG5cdFx0cmV0dXJuIGF3YWl0IGNyZWF0ZUxpdmVTdHJlYW0oe1xuXHRcdFx0cm9vbSxcblx0XHRcdGFjY2Vzc190b2tlbixcblx0XHRcdHJlZnJlc2hfdG9rZW4sXG5cdFx0XHRjbGllbnRJZDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Jyb2FkY2FzdGluZ19jbGllbnRfaWQnKSxcblx0XHRcdGNsaWVudFNlY3JldDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Jyb2FkY2FzdGluZ19jbGllbnRfc2VjcmV0JyksXG5cdFx0fSk7XG5cblx0fSxcblx0YXN5bmMgZ2V0QnJvYWRjYXN0U3RhdHVzKHsgYnJvYWRjYXN0SWQgfSkge1xuXHRcdGlmICghYnJvYWRjYXN0SWQpIHtcblx0XHRcdC8vIFRPRE86IGNoYW5nZSBlcnJvclxuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnQnJvYWRjYXN0IElEIG5vdCBmb3VuZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAnZ2V0QnJvYWRjYXN0U3RhdHVzJyxcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRjb25zdCBsaXZlc3RyZWFtU2V0dGluZ3MgPSBzZWxlY3RMaXZlc3RyZWFtU2V0dGluZ3MoTWV0ZW9yLnVzZXIoKSk7XG5cblx0XHRpZiAoIWxpdmVzdHJlYW1TZXR0aW5ncykge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnWW91IGhhdmUgbm8gc2V0dGluZ3MgdG8gc3RyZWFtJywge1xuXHRcdFx0XHRtZXRob2Q6ICdnZXRCcm9hZGNhc3RTdGF0dXMnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBhY2Nlc3NfdG9rZW4sIHJlZnJlc2hfdG9rZW4gfSA9IGxpdmVzdHJlYW1TZXR0aW5ncztcblxuXHRcdHJldHVybiBhd2FpdCBnZXRCcm9hZGNhc3RTdGF0dXMoe1xuXHRcdFx0aWQ6IGJyb2FkY2FzdElkLFxuXHRcdFx0YWNjZXNzX3Rva2VuLFxuXHRcdFx0cmVmcmVzaF90b2tlbixcblx0XHRcdGNsaWVudElkOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQnJvYWRjYXN0aW5nX2NsaWVudF9pZCcpLFxuXHRcdFx0Y2xpZW50U2VjcmV0OiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQnJvYWRjYXN0aW5nX2NsaWVudF9zZWNyZXQnKSxcblx0XHR9KTtcblx0fSxcblx0YXN5bmMgc2V0QnJvYWRjYXN0U3RhdHVzKHsgYnJvYWRjYXN0SWQsIHN0YXR1cyB9KSB7XG5cdFx0aWYgKCFicm9hZGNhc3RJZCkge1xuXHRcdFx0Ly8gVE9ETzogY2hhbmdlIGVycm9yXG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdCcm9hZGNhc3QgSUQgbm90IGZvdW5kJywge1xuXHRcdFx0XHRtZXRob2Q6ICdzZXRCcm9hZGNhc3RTdGF0dXMnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGNvbnN0IGxpdmVzdHJlYW1TZXR0aW5ncyA9IHNlbGVjdExpdmVzdHJlYW1TZXR0aW5ncyhNZXRlb3IudXNlcigpKTtcblxuXHRcdGlmICghbGl2ZXN0cmVhbVNldHRpbmdzKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdZb3UgaGF2ZSBubyBzZXR0aW5ncyB0byBzdHJlYW0nLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3NldEJyb2FkY2FzdFN0YXR1cycsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCB7IGFjY2Vzc190b2tlbiwgcmVmcmVzaF90b2tlbiB9ID0gbGl2ZXN0cmVhbVNldHRpbmdzO1xuXG5cdFx0cmV0dXJuIGF3YWl0IHNldEJyb2FkY2FzdFN0YXR1cyh7XG5cdFx0XHRpZDogYnJvYWRjYXN0SWQsXG5cdFx0XHRhY2Nlc3NfdG9rZW4sXG5cdFx0XHRyZWZyZXNoX3Rva2VuLFxuXHRcdFx0c3RhdHVzLFxuXHRcdFx0Y2xpZW50SWQ6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdCcm9hZGNhc3RpbmdfY2xpZW50X2lkJyksXG5cdFx0XHRjbGllbnRTZWNyZXQ6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdCcm9hZGNhc3RpbmdfY2xpZW50X3NlY3JldCcpLFxuXHRcdH0pO1xuXG5cdH0sXG59KTtcbiIsImltcG9ydCBnb29nbGUgZnJvbSAnZ29vZ2xlYXBpcyc7XG5jb25zdCB7IE9BdXRoMiB9ID0gZ29vZ2xlLmF1dGg7XG5cblJvY2tldENoYXQuQVBJLnYxLmFkZFJvdXRlKCdsaXZlc3RyZWFtL29hdXRoJywge1xuXHRnZXQ6IGZ1bmN0aW9uIGZ1bmN0aW9uTmFtZSgpIHtcblx0XHRjb25zdCBjbGllbnRBdXRoID0gbmV3IE9BdXRoMihSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQnJvYWRjYXN0aW5nX2NsaWVudF9pZCcpLCBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQnJvYWRjYXN0aW5nX2NsaWVudF9zZWNyZXQnKSwgYCR7IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTaXRlX1VybCcpIH0vYXBpL3YxL2xpdmVzdHJlYW0vb2F1dGgvY2FsbGJhY2tgLnJlcGxhY2UoL1xcL3syfWFwaS9nLCAnL2FwaScpKTtcblx0XHRjb25zdCB7IHVzZXJJZCB9ID0gdGhpcy5xdWVyeVBhcmFtcztcblx0XHRjb25zdCB1cmwgPSBjbGllbnRBdXRoLmdlbmVyYXRlQXV0aFVybCh7XG5cdFx0XHRhY2Nlc3NfdHlwZTogJ29mZmxpbmUnLFxuXHRcdFx0c2NvcGU6IFsnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC95b3V0dWJlJ10sXG5cdFx0XHRzdGF0ZTogSlNPTi5zdHJpbmdpZnkoe1xuXHRcdFx0XHR1c2VySWQsXG5cdFx0XHR9KSxcblx0XHR9KTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRzdGF0dXNDb2RlOiAzMDIsXG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdExvY2F0aW9uOiB1cmwsXG5cdFx0XHR9LCBib2R5OiAnT2F1dGggcmVkaXJlY3QnLFxuXHRcdH07XG5cdH0sXG59KTtcblxuUm9ja2V0Q2hhdC5BUEkudjEuYWRkUm91dGUoJ2xpdmVzdHJlYW0vb2F1dGgvY2FsbGJhY2snLCB7XG5cdGdldDogZnVuY3Rpb24gZnVuY3Rpb25OYW1lKCkge1xuXHRcdGNvbnN0IHsgY29kZSwgc3RhdGUgfSA9IHRoaXMucXVlcnlQYXJhbXM7XG5cblx0XHRjb25zdCB7IHVzZXJJZCB9ID0gSlNPTi5wYXJzZShzdGF0ZSk7XG5cblx0XHRjb25zdCBjbGllbnRBdXRoID0gbmV3IE9BdXRoMihSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQnJvYWRjYXN0aW5nX2NsaWVudF9pZCcpLCBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQnJvYWRjYXN0aW5nX2NsaWVudF9zZWNyZXQnKSwgYCR7IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTaXRlX1VybCcpIH0vYXBpL3YxL2xpdmVzdHJlYW0vb2F1dGgvY2FsbGJhY2tgLnJlcGxhY2UoL1xcL3syfWFwaS9nLCAnL2FwaScpKTtcblxuXHRcdGNvbnN0IHJldCA9IE1ldGVvci53cmFwQXN5bmMoY2xpZW50QXV0aC5nZXRUb2tlbi5iaW5kKGNsaWVudEF1dGgpKShjb2RlKTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLnVwZGF0ZSh7IF9pZDogdXNlcklkIH0sIHsgJHNldDoge1xuXHRcdFx0J3NldHRpbmdzLmxpdmVzdHJlYW0nIDogcmV0LFxuXHRcdH0gfSk7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0aGVhZGVyczoge1xuXHRcdFx0XHQnY29udGVudC10eXBlJyA6ICd0ZXh0L2h0bWwnLFxuXHRcdFx0fSwgYm9keTogJzxzY3JpcHQ+d2luZG93LmNsb3NlKCk8L3NjcmlwdD4nLFxuXHRcdH07XG5cdH0sXG59KTtcbiJdfQ==
