(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:bigbluebutton":{"server":{"bigbluebutton-api.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/rocketchat_bigbluebutton/server/bigbluebutton-api.js                                               //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
let crypto;
module.watch(require("crypto"), {
  default(v) {
    crypto = v;
  }

}, 0);

var BigBlueButtonApi,
    filterCustomParameters,
    include,
    noChecksumMethods,
    root,
    __indexOf = [].indexOf || function (item) {
  for (var i = 0, l = this.length; i < l; i++) {
    if (i in this && this[i] === item) return i;
  }

  return -1;
};

BigBlueButtonApi = function () {
  function BigBlueButtonApi(url, salt, debug, opts) {
    var _base;

    if (debug == null) {
      debug = false;
    }

    if (opts == null) {
      opts = {};
    }

    this.url = url;
    this.salt = salt;
    this.debug = debug;
    this.opts = opts;

    if ((_base = this.opts).shaType == null) {
      _base.shaType = 'sha1';
    }
  }

  BigBlueButtonApi.prototype.availableApiCalls = function () {
    return ['/', 'create', 'join', 'isMeetingRunning', 'getMeetingInfo', 'end', 'getMeetings', 'getDefaultConfigXML', 'setConfigXML', 'enter', 'configXML', 'signOut', 'getRecordings', 'publishRecordings', 'deleteRecordings', 'updateRecordings', 'hooks/create'];
  };

  BigBlueButtonApi.prototype.urlParamsFor = function (param) {
    switch (param) {
      case "create":
        return [["meetingID", true], ["name", true], ["attendeePW", false], ["moderatorPW", false], ["welcome", false], ["dialNumber", false], ["voiceBridge", false], ["webVoice", false], ["logoutURL", false], ["maxParticipants", false], ["record", false], ["duration", false], ["moderatorOnlyMessage", false], ["autoStartRecording", false], ["allowStartStopRecording", false], [/meta_\w+/, false]];

      case "join":
        return [["fullName", true], ["meetingID", true], ["password", true], ["createTime", false], ["userID", false], ["webVoiceConf", false], ["configToken", false], ["avatarURL", false], ["redirect", false], ["clientURL", false]];

      case "isMeetingRunning":
        return [["meetingID", true]];

      case "end":
        return [["meetingID", true], ["password", true]];

      case "getMeetingInfo":
        return [["meetingID", true], ["password", true]];

      case "getRecordings":
        return [["meetingID", false], ["recordID", false], ["state", false], [/meta_\w+/, false]];

      case "publishRecordings":
        return [["recordID", true], ["publish", true]];

      case "deleteRecordings":
        return [["recordID", true]];

      case "updateRecordings":
        return [["recordID", true], [/meta_\w+/, false]];

      case "hooks/create":
        return [["callbackURL", false], ["meetingID", false]];
    }
  };

  BigBlueButtonApi.prototype.filterParams = function (params, method) {
    var filters, r;
    filters = this.urlParamsFor(method);

    if (filters == null || filters.length === 0) {
      ({});
    } else {
      r = include(params, function (key, value) {
        var filter, _i, _len;

        for (_i = 0, _len = filters.length; _i < _len; _i++) {
          filter = filters[_i];

          if (filter[0] instanceof RegExp) {
            if (key.match(filter[0]) || key.match(/^custom_/)) {
              return true;
            }
          } else {
            if (key.match("^" + filter[0] + "$") || key.match(/^custom_/)) {
              return true;
            }
          }
        }

        return false;
      });
    }

    return filterCustomParameters(r);
  };

  BigBlueButtonApi.prototype.urlFor = function (method, params, filter) {
    var checksum, key, keys, param, paramList, property, query, sep, url, _i, _len;

    if (filter == null) {
      filter = true;
    }

    if (this.debug) {
      console.log("Generating URL for", method);
    }

    if (filter) {
      params = this.filterParams(params, method);
    } else {
      params = filterCustomParameters(params);
    }

    url = this.url;
    paramList = [];

    if (params != null) {
      keys = [];

      for (property in params) {
        keys.push(property);
      }

      keys = keys.sort();

      for (_i = 0, _len = keys.length; _i < _len; _i++) {
        key = keys[_i];

        if (key != null) {
          param = params[key];
        }

        if (param != null) {
          paramList.push("" + this.encodeForUrl(key) + "=" + this.encodeForUrl(param));
        }
      }

      if (paramList.length > 0) {
        query = paramList.join("&");
      }
    } else {
      query = '';
    }

    checksum = this.checksum(method, query);

    if (paramList.length > 0) {
      query = "" + method + "?" + query;
      sep = '&';
    } else {
      if (method !== '/') {
        query = method;
      }

      sep = '?';
    }

    if (__indexOf.call(noChecksumMethods(), method) < 0) {
      query = "" + query + sep + "checksum=" + checksum;
    }

    return "" + url + "/" + query;
  };

  BigBlueButtonApi.prototype.checksum = function (method, query) {
    var c, shaObj, str;
    query || (query = "");

    if (this.debug) {
      console.log("- Calculating the checksum using: '" + method + "', '" + query + "', '" + this.salt + "'");
    }

    str = method + query + this.salt;

    if (this.opts.shaType === 'sha256') {
      shaObj = crypto.createHash('sha256', "TEXT");
    } else {
      shaObj = crypto.createHash('sha1', "TEXT");
    }

    shaObj.update(str);
    c = shaObj.digest('hex');

    if (this.debug) {
      console.log("- Checksum calculated:", c);
    }

    return c;
  };

  BigBlueButtonApi.prototype.encodeForUrl = function (value) {
    return encodeURIComponent(value).replace(/%20/g, '+').replace(/[!'()]/g, escape).replace(/\*/g, "%2A");
  };

  BigBlueButtonApi.prototype.setMobileProtocol = function (url) {
    return url.replace(/http[s]?\:\/\//, "bigbluebutton://");
  };

  return BigBlueButtonApi;
}();

include = function (input, _function) {
  var key, value, _match, _obj;

  _obj = new Object();
  _match = null;

  for (key in input) {
    value = input[key];

    if (_function.call(input, key, value)) {
      _obj[key] = value;
    }
  }

  return _obj;
};

module.exportDefault(BigBlueButtonApi);

filterCustomParameters = function (params) {
  var key, v;

  for (key in params) {
    v = params[key];

    if (key.match(/^custom_/)) {
      params[key.replace(/^custom_/, "")] = v;
    }
  }

  for (key in params) {
    if (key.match(/^custom_/)) {
      delete params[key];
    }
  }

  return params;
};

noChecksumMethods = function () {
  return ['setConfigXML', '/', 'enter', 'configXML', 'signOut'];
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/rocketchat:bigbluebutton/server/bigbluebutton-api.js");

/* Exports */
Package._define("rocketchat:bigbluebutton", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_bigbluebutton.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpiaWdibHVlYnV0dG9uL3NlcnZlci9iaWdibHVlYnV0dG9uLWFwaS5qcyJdLCJuYW1lcyI6WyJjcnlwdG8iLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsIkJpZ0JsdWVCdXR0b25BcGkiLCJmaWx0ZXJDdXN0b21QYXJhbWV0ZXJzIiwiaW5jbHVkZSIsIm5vQ2hlY2tzdW1NZXRob2RzIiwicm9vdCIsIl9faW5kZXhPZiIsImluZGV4T2YiLCJpdGVtIiwiaSIsImwiLCJsZW5ndGgiLCJ1cmwiLCJzYWx0IiwiZGVidWciLCJvcHRzIiwiX2Jhc2UiLCJzaGFUeXBlIiwicHJvdG90eXBlIiwiYXZhaWxhYmxlQXBpQ2FsbHMiLCJ1cmxQYXJhbXNGb3IiLCJwYXJhbSIsImZpbHRlclBhcmFtcyIsInBhcmFtcyIsIm1ldGhvZCIsImZpbHRlcnMiLCJyIiwia2V5IiwidmFsdWUiLCJmaWx0ZXIiLCJfaSIsIl9sZW4iLCJSZWdFeHAiLCJtYXRjaCIsInVybEZvciIsImNoZWNrc3VtIiwia2V5cyIsInBhcmFtTGlzdCIsInByb3BlcnR5IiwicXVlcnkiLCJzZXAiLCJjb25zb2xlIiwibG9nIiwicHVzaCIsInNvcnQiLCJlbmNvZGVGb3JVcmwiLCJqb2luIiwiY2FsbCIsImMiLCJzaGFPYmoiLCJzdHIiLCJjcmVhdGVIYXNoIiwidXBkYXRlIiwiZGlnZXN0IiwiZW5jb2RlVVJJQ29tcG9uZW50IiwicmVwbGFjZSIsImVzY2FwZSIsInNldE1vYmlsZVByb3RvY29sIiwiaW5wdXQiLCJfZnVuY3Rpb24iLCJfbWF0Y2giLCJfb2JqIiwiT2JqZWN0IiwiZXhwb3J0RGVmYXVsdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLE1BQUo7QUFBV0MsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLFFBQVIsQ0FBYixFQUErQjtBQUFDQyxVQUFRQyxDQUFSLEVBQVU7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bHVlYnV0dG9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgKi9cbmltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcblxudmFyIEJpZ0JsdWVCdXR0b25BcGksIGZpbHRlckN1c3RvbVBhcmFtZXRlcnMsIGluY2x1ZGUsIG5vQ2hlY2tzdW1NZXRob2RzLCByb290LFxuXHRfX2luZGV4T2YgPSBbXS5pbmRleE9mIHx8IGZ1bmN0aW9uIChpdGVtKSB7IGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5sZW5ndGg7IGkgPCBsOyBpKyspIHsgaWYgKGkgaW4gdGhpcyAmJiB0aGlzW2ldID09PSBpdGVtKSByZXR1cm4gaTsgfSByZXR1cm4gLTE7IH07XG5cbkJpZ0JsdWVCdXR0b25BcGkgPSAoZnVuY3Rpb24gKCkge1xuXHRmdW5jdGlvbiBCaWdCbHVlQnV0dG9uQXBpKHVybCwgc2FsdCwgZGVidWcsIG9wdHMpIHtcblx0XHR2YXIgX2Jhc2U7XG5cdFx0aWYgKGRlYnVnID09IG51bGwpIHtcblx0XHRcdGRlYnVnID0gZmFsc2U7XG5cdFx0fVxuXHRcdGlmIChvcHRzID09IG51bGwpIHtcblx0XHRcdG9wdHMgPSB7fTtcblx0XHR9XG5cdFx0dGhpcy51cmwgPSB1cmw7XG5cdFx0dGhpcy5zYWx0ID0gc2FsdDtcblx0XHR0aGlzLmRlYnVnID0gZGVidWc7XG5cdFx0dGhpcy5vcHRzID0gb3B0cztcblx0XHRpZiAoKF9iYXNlID0gdGhpcy5vcHRzKS5zaGFUeXBlID09IG51bGwpIHtcblx0XHRcdF9iYXNlLnNoYVR5cGUgPSAnc2hhMSc7XG5cdFx0fVxuXHR9XG5cblx0QmlnQmx1ZUJ1dHRvbkFwaS5wcm90b3R5cGUuYXZhaWxhYmxlQXBpQ2FsbHMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIFsnLycsICdjcmVhdGUnLCAnam9pbicsICdpc01lZXRpbmdSdW5uaW5nJywgJ2dldE1lZXRpbmdJbmZvJywgJ2VuZCcsICdnZXRNZWV0aW5ncycsICdnZXREZWZhdWx0Q29uZmlnWE1MJywgJ3NldENvbmZpZ1hNTCcsICdlbnRlcicsICdjb25maWdYTUwnLCAnc2lnbk91dCcsICdnZXRSZWNvcmRpbmdzJywgJ3B1Ymxpc2hSZWNvcmRpbmdzJywgJ2RlbGV0ZVJlY29yZGluZ3MnLCAndXBkYXRlUmVjb3JkaW5ncycsICdob29rcy9jcmVhdGUnXTtcblx0fTtcblxuXHRCaWdCbHVlQnV0dG9uQXBpLnByb3RvdHlwZS51cmxQYXJhbXNGb3IgPSBmdW5jdGlvbiAocGFyYW0pIHtcblx0XHRzd2l0Y2ggKHBhcmFtKSB7XG5cdFx0XHRjYXNlIFwiY3JlYXRlXCI6XG5cdFx0XHRcdHJldHVybiBbW1wibWVldGluZ0lEXCIsIHRydWVdLCBbXCJuYW1lXCIsIHRydWVdLCBbXCJhdHRlbmRlZVBXXCIsIGZhbHNlXSwgW1wibW9kZXJhdG9yUFdcIiwgZmFsc2VdLCBbXCJ3ZWxjb21lXCIsIGZhbHNlXSwgW1wiZGlhbE51bWJlclwiLCBmYWxzZV0sIFtcInZvaWNlQnJpZGdlXCIsIGZhbHNlXSwgW1wid2ViVm9pY2VcIiwgZmFsc2VdLCBbXCJsb2dvdXRVUkxcIiwgZmFsc2VdLCBbXCJtYXhQYXJ0aWNpcGFudHNcIiwgZmFsc2VdLCBbXCJyZWNvcmRcIiwgZmFsc2VdLCBbXCJkdXJhdGlvblwiLCBmYWxzZV0sIFtcIm1vZGVyYXRvck9ubHlNZXNzYWdlXCIsIGZhbHNlXSwgW1wiYXV0b1N0YXJ0UmVjb3JkaW5nXCIsIGZhbHNlXSwgW1wiYWxsb3dTdGFydFN0b3BSZWNvcmRpbmdcIiwgZmFsc2VdLCBbL21ldGFfXFx3Ky8sIGZhbHNlXV07XG5cdFx0XHRjYXNlIFwiam9pblwiOlxuXHRcdFx0XHRyZXR1cm4gW1tcImZ1bGxOYW1lXCIsIHRydWVdLCBbXCJtZWV0aW5nSURcIiwgdHJ1ZV0sIFtcInBhc3N3b3JkXCIsIHRydWVdLCBbXCJjcmVhdGVUaW1lXCIsIGZhbHNlXSwgW1widXNlcklEXCIsIGZhbHNlXSwgW1wid2ViVm9pY2VDb25mXCIsIGZhbHNlXSwgW1wiY29uZmlnVG9rZW5cIiwgZmFsc2VdLCBbXCJhdmF0YXJVUkxcIiwgZmFsc2VdLCBbXCJyZWRpcmVjdFwiLCBmYWxzZV0sIFtcImNsaWVudFVSTFwiLCBmYWxzZV1dO1xuXHRcdFx0Y2FzZSBcImlzTWVldGluZ1J1bm5pbmdcIjpcblx0XHRcdFx0cmV0dXJuIFtbXCJtZWV0aW5nSURcIiwgdHJ1ZV1dO1xuXHRcdFx0Y2FzZSBcImVuZFwiOlxuXHRcdFx0XHRyZXR1cm4gW1tcIm1lZXRpbmdJRFwiLCB0cnVlXSwgW1wicGFzc3dvcmRcIiwgdHJ1ZV1dO1xuXHRcdFx0Y2FzZSBcImdldE1lZXRpbmdJbmZvXCI6XG5cdFx0XHRcdHJldHVybiBbW1wibWVldGluZ0lEXCIsIHRydWVdLCBbXCJwYXNzd29yZFwiLCB0cnVlXV07XG5cdFx0XHRjYXNlIFwiZ2V0UmVjb3JkaW5nc1wiOlxuXHRcdFx0XHRyZXR1cm4gW1tcIm1lZXRpbmdJRFwiLCBmYWxzZV0sIFtcInJlY29yZElEXCIsIGZhbHNlXSwgW1wic3RhdGVcIiwgZmFsc2VdLCBbL21ldGFfXFx3Ky8sIGZhbHNlXV07XG5cdFx0XHRjYXNlIFwicHVibGlzaFJlY29yZGluZ3NcIjpcblx0XHRcdFx0cmV0dXJuIFtbXCJyZWNvcmRJRFwiLCB0cnVlXSwgW1wicHVibGlzaFwiLCB0cnVlXV07XG5cdFx0XHRjYXNlIFwiZGVsZXRlUmVjb3JkaW5nc1wiOlxuXHRcdFx0XHRyZXR1cm4gW1tcInJlY29yZElEXCIsIHRydWVdXTtcblx0XHRcdGNhc2UgXCJ1cGRhdGVSZWNvcmRpbmdzXCI6XG5cdFx0XHRcdHJldHVybiBbW1wicmVjb3JkSURcIiwgdHJ1ZV0sIFsvbWV0YV9cXHcrLywgZmFsc2VdXTtcblx0XHRcdGNhc2UgXCJob29rcy9jcmVhdGVcIjpcblx0XHRcdFx0cmV0dXJuIFtbXCJjYWxsYmFja1VSTFwiLCBmYWxzZV0sIFtcIm1lZXRpbmdJRFwiLCBmYWxzZV1dO1xuXHRcdH1cblx0fTtcblxuXHRCaWdCbHVlQnV0dG9uQXBpLnByb3RvdHlwZS5maWx0ZXJQYXJhbXMgPSBmdW5jdGlvbiAocGFyYW1zLCBtZXRob2QpIHtcblx0XHR2YXIgZmlsdGVycywgcjtcblx0XHRmaWx0ZXJzID0gdGhpcy51cmxQYXJhbXNGb3IobWV0aG9kKTtcblx0XHRpZiAoKGZpbHRlcnMgPT0gbnVsbCkgfHwgZmlsdGVycy5sZW5ndGggPT09IDApIHtcblx0XHRcdCh7fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHIgPSBpbmNsdWRlKHBhcmFtcywgZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcblx0XHRcdFx0dmFyIGZpbHRlciwgX2ksIF9sZW47XG5cdFx0XHRcdGZvciAoX2kgPSAwLCBfbGVuID0gZmlsdGVycy5sZW5ndGg7IF9pIDwgX2xlbjsgX2krKykge1xuXHRcdFx0XHRcdGZpbHRlciA9IGZpbHRlcnNbX2ldO1xuXHRcdFx0XHRcdGlmIChmaWx0ZXJbMF0gaW5zdGFuY2VvZiBSZWdFeHApIHtcblx0XHRcdFx0XHRcdGlmIChrZXkubWF0Y2goZmlsdGVyWzBdKSB8fCBrZXkubWF0Y2goL15jdXN0b21fLykpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGlmIChrZXkubWF0Y2goXCJeXCIgKyBmaWx0ZXJbMF0gKyBcIiRcIikgfHwga2V5Lm1hdGNoKC9eY3VzdG9tXy8pKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIGZpbHRlckN1c3RvbVBhcmFtZXRlcnMocik7XG5cdH07XG5cblx0QmlnQmx1ZUJ1dHRvbkFwaS5wcm90b3R5cGUudXJsRm9yID0gZnVuY3Rpb24gKG1ldGhvZCwgcGFyYW1zLCBmaWx0ZXIpIHtcblx0XHR2YXIgY2hlY2tzdW0sIGtleSwga2V5cywgcGFyYW0sIHBhcmFtTGlzdCwgcHJvcGVydHksIHF1ZXJ5LCBzZXAsIHVybCwgX2ksIF9sZW47XG5cdFx0aWYgKGZpbHRlciA9PSBudWxsKSB7XG5cdFx0XHRmaWx0ZXIgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0Y29uc29sZS5sb2coXCJHZW5lcmF0aW5nIFVSTCBmb3JcIiwgbWV0aG9kKTtcblx0XHR9XG5cdFx0aWYgKGZpbHRlcikge1xuXHRcdFx0cGFyYW1zID0gdGhpcy5maWx0ZXJQYXJhbXMocGFyYW1zLCBtZXRob2QpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwYXJhbXMgPSBmaWx0ZXJDdXN0b21QYXJhbWV0ZXJzKHBhcmFtcyk7XG5cdFx0fVxuXHRcdHVybCA9IHRoaXMudXJsO1xuXHRcdHBhcmFtTGlzdCA9IFtdO1xuXHRcdGlmIChwYXJhbXMgIT0gbnVsbCkge1xuXHRcdFx0a2V5cyA9IFtdO1xuXHRcdFx0Zm9yIChwcm9wZXJ0eSBpbiBwYXJhbXMpIHtcblx0XHRcdFx0a2V5cy5wdXNoKHByb3BlcnR5KTtcblx0XHRcdH1cblx0XHRcdGtleXMgPSBrZXlzLnNvcnQoKTtcblx0XHRcdGZvciAoX2kgPSAwLCBfbGVuID0ga2V5cy5sZW5ndGg7IF9pIDwgX2xlbjsgX2krKykge1xuXHRcdFx0XHRrZXkgPSBrZXlzW19pXTtcblx0XHRcdFx0aWYgKGtleSAhPSBudWxsKSB7XG5cdFx0XHRcdFx0cGFyYW0gPSBwYXJhbXNba2V5XTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAocGFyYW0gIT0gbnVsbCkge1xuXHRcdFx0XHRcdHBhcmFtTGlzdC5wdXNoKFwiXCIgKyAodGhpcy5lbmNvZGVGb3JVcmwoa2V5KSkgKyBcIj1cIiArICh0aGlzLmVuY29kZUZvclVybChwYXJhbSkpKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKHBhcmFtTGlzdC5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdHF1ZXJ5ID0gcGFyYW1MaXN0LmpvaW4oXCImXCIpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRxdWVyeSA9ICcnO1xuXHRcdH1cblx0XHRjaGVja3N1bSA9IHRoaXMuY2hlY2tzdW0obWV0aG9kLCBxdWVyeSk7XG5cdFx0aWYgKHBhcmFtTGlzdC5sZW5ndGggPiAwKSB7XG5cdFx0XHRxdWVyeSA9IFwiXCIgKyBtZXRob2QgKyBcIj9cIiArIHF1ZXJ5O1xuXHRcdFx0c2VwID0gJyYnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAobWV0aG9kICE9PSAnLycpIHtcblx0XHRcdFx0cXVlcnkgPSBtZXRob2Q7XG5cdFx0XHR9XG5cdFx0XHRzZXAgPSAnPyc7XG5cdFx0fVxuXHRcdGlmIChfX2luZGV4T2YuY2FsbChub0NoZWNrc3VtTWV0aG9kcygpLCBtZXRob2QpIDwgMCkge1xuXHRcdFx0cXVlcnkgPSBcIlwiICsgcXVlcnkgKyBzZXAgKyBcImNoZWNrc3VtPVwiICsgY2hlY2tzdW07XG5cdFx0fVxuXHRcdHJldHVybiBcIlwiICsgdXJsICsgXCIvXCIgKyBxdWVyeTtcblx0fTtcblxuXHRCaWdCbHVlQnV0dG9uQXBpLnByb3RvdHlwZS5jaGVja3N1bSA9IGZ1bmN0aW9uIChtZXRob2QsIHF1ZXJ5KSB7XG5cdFx0dmFyIGMsIHNoYU9iaiwgc3RyO1xuXHRcdHF1ZXJ5IHx8IChxdWVyeSA9IFwiXCIpO1xuXHRcdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhcIi0gQ2FsY3VsYXRpbmcgdGhlIGNoZWNrc3VtIHVzaW5nOiAnXCIgKyBtZXRob2QgKyBcIicsICdcIiArIHF1ZXJ5ICsgXCInLCAnXCIgKyB0aGlzLnNhbHQgKyBcIidcIik7XG5cdFx0fVxuXHRcdHN0ciA9IG1ldGhvZCArIHF1ZXJ5ICsgdGhpcy5zYWx0O1xuXHRcdGlmICh0aGlzLm9wdHMuc2hhVHlwZSA9PT0gJ3NoYTI1NicpIHtcblx0XHRcdHNoYU9iaiA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnLCBcIlRFWFRcIilcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2hhT2JqID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTEnLCBcIlRFWFRcIilcblx0XHR9XG5cdFx0c2hhT2JqLnVwZGF0ZShzdHIpO1xuXHRcdGMgPSBzaGFPYmouZGlnZXN0KCdoZXgnKTtcblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0Y29uc29sZS5sb2coXCItIENoZWNrc3VtIGNhbGN1bGF0ZWQ6XCIsIGMpO1xuXHRcdH1cblx0XHRyZXR1cm4gYztcblx0fTtcblxuXHRCaWdCbHVlQnV0dG9uQXBpLnByb3RvdHlwZS5lbmNvZGVGb3JVcmwgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRyZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKS5yZXBsYWNlKC8lMjAvZywgJysnKS5yZXBsYWNlKC9bIScoKV0vZywgZXNjYXBlKS5yZXBsYWNlKC9cXCovZywgXCIlMkFcIik7XG5cdH07XG5cblx0QmlnQmx1ZUJ1dHRvbkFwaS5wcm90b3R5cGUuc2V0TW9iaWxlUHJvdG9jb2wgPSBmdW5jdGlvbiAodXJsKSB7XG5cdFx0cmV0dXJuIHVybC5yZXBsYWNlKC9odHRwW3NdP1xcOlxcL1xcLy8sIFwiYmlnYmx1ZWJ1dHRvbjovL1wiKTtcblx0fTtcblxuXHRyZXR1cm4gQmlnQmx1ZUJ1dHRvbkFwaTtcblxufSkoKTtcblxuaW5jbHVkZSA9IGZ1bmN0aW9uIChpbnB1dCwgX2Z1bmN0aW9uKSB7XG5cdHZhciBrZXksIHZhbHVlLCBfbWF0Y2gsIF9vYmo7XG5cdF9vYmogPSBuZXcgT2JqZWN0O1xuXHRfbWF0Y2ggPSBudWxsO1xuXHRmb3IgKGtleSBpbiBpbnB1dCkge1xuXHRcdHZhbHVlID0gaW5wdXRba2V5XTtcblx0XHRpZiAoX2Z1bmN0aW9uLmNhbGwoaW5wdXQsIGtleSwgdmFsdWUpKSB7XG5cdFx0XHRfb2JqW2tleV0gPSB2YWx1ZTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIF9vYmo7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBCaWdCbHVlQnV0dG9uQXBpO1xuXG5maWx0ZXJDdXN0b21QYXJhbWV0ZXJzID0gZnVuY3Rpb24gKHBhcmFtcykge1xuXHR2YXIga2V5LCB2O1xuXHRmb3IgKGtleSBpbiBwYXJhbXMpIHtcblx0XHR2ID0gcGFyYW1zW2tleV07XG5cdFx0aWYgKGtleS5tYXRjaCgvXmN1c3RvbV8vKSkge1xuXHRcdFx0cGFyYW1zW2tleS5yZXBsYWNlKC9eY3VzdG9tXy8sIFwiXCIpXSA9IHY7XG5cdFx0fVxuXHR9XG5cdGZvciAoa2V5IGluIHBhcmFtcykge1xuXHRcdGlmIChrZXkubWF0Y2goL15jdXN0b21fLykpIHtcblx0XHRcdGRlbGV0ZSBwYXJhbXNba2V5XTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHBhcmFtcztcbn07XG5cbm5vQ2hlY2tzdW1NZXRob2RzID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gWydzZXRDb25maWdYTUwnLCAnLycsICdlbnRlcicsICdjb25maWdYTUwnLCAnc2lnbk91dCddO1xufTtcbiJdfQ==
