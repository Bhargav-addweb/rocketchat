(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var ECMAScript = Package.ecmascript.ECMAScript;
var Random = Package.random.Random;
var Log = Package.logging.Log;
var colors = Package['nooitaf:colors'].colors;
var EventEmitter = Package['raix:eventemitter'].EventEmitter;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var LoggerManager, message, Logger, SystemLogger;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:logger":{"server":{"server.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_logger/server/server.js                                                                   //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
module.export({
  SystemLogger: () => SystemLogger,
  StdOut: () => StdOut,
  LoggerManager: () => LoggerManager,
  processString: () => processString,
  Logger: () => Logger
});

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
// TODO: change this global to import
module.runSetters(LoggerManager = new class extends EventEmitter {
  // eslint-disable-line no-undef
  constructor() {
    super();
    this.enabled = false;
    this.loggers = {};
    this.queue = [];
    this.showPackage = false;
    this.showFileAndLine = false;
    this.logLevel = 0;
  }

  register(logger) {
    if (!logger instanceof Logger) {
      return;
    }

    this.loggers[logger.name] = logger;
    this.emit('register', logger);
  }

  addToQueue(logger, args) {
    this.queue.push({
      logger,
      args
    });
  }

  dispatchQueue() {
    _.each(this.queue, item => item.logger._log.apply(item.logger, item.args));

    this.clearQueue();
  }

  clearQueue() {
    this.queue = [];
  }

  disable() {
    this.enabled = false;
  }

  enable(dispatchQueue = false) {
    this.enabled = true;
    return dispatchQueue === true ? this.dispatchQueue() : this.clearQueue();
  }

}());
const defaultTypes = {
  debug: {
    name: 'debug',
    color: 'blue',
    level: 2
  },
  log: {
    name: 'info',
    color: 'blue',
    level: 1
  },
  info: {
    name: 'info',
    color: 'blue',
    level: 1
  },
  success: {
    name: 'info',
    color: 'green',
    level: 1
  },
  warn: {
    name: 'warn',
    color: 'magenta',
    level: 1
  },
  error: {
    name: 'error',
    color: 'red',
    level: 0
  }
};

class _Logger {
  constructor(name, config = {}) {
    const self = this;
    this.name = name;
    this.config = Object.assign({}, config);

    if (LoggerManager.loggers && LoggerManager.loggers[this.name] != null) {
      LoggerManager.loggers[this.name].warn('Duplicated instance');
      return LoggerManager.loggers[this.name];
    }

    _.each(defaultTypes, (typeConfig, type) => {
      this[type] = function (...args) {
        return self._log.call(self, {
          section: this.__section,
          type,
          level: typeConfig.level,
          method: typeConfig.name,
          arguments: args
        });
      };

      self[`${type}_box`] = function (...args) {
        return self._log.call(self, {
          section: this.__section,
          type,
          box: true,
          level: typeConfig.level,
          method: typeConfig.name,
          arguments: args
        });
      };
    });

    if (this.config.methods) {
      _.each(this.config.methods, (typeConfig, method) => {
        if (this[method] != null) {
          self.warn(`Method ${method} already exists`);
        }

        if (defaultTypes[typeConfig.type] == null) {
          self.warn(`Method type ${typeConfig.type} does not exist`);
        }

        this[method] = function (...args) {
          return self._log.call(self, {
            section: this.__section,
            type: typeConfig.type,
            level: typeConfig.level != null ? typeConfig.level : defaultTypes[typeConfig.type] && defaultTypes[typeConfig.type].level,
            method,
            arguments: args
          });
        };

        this[`${method}_box`] = function (...args) {
          return self._log.call(self, {
            section: this.__section,
            type: typeConfig.type,
            box: true,
            level: typeConfig.level != null ? typeConfig.level : defaultTypes[typeConfig.type] && defaultTypes[typeConfig.type].level,
            method,
            arguments: args
          });
        };
      });
    }

    if (this.config.sections) {
      _.each(this.config.sections, (name, section) => {
        this[section] = {};

        _.each(defaultTypes, (typeConfig, type) => {
          self[section][type] = (...args) => this[type].apply({
            __section: name
          }, args);

          self[section][`${type}_box`] = (...args) => this[`${type}_box`].apply({
            __section: name
          }, args);
        });

        _.each(this.config.methods, (typeConfig, method) => {
          self[section][method] = (...args) => self[method].apply({
            __section: name
          }, args);

          self[section][`${method}_box`] = (...args) => self[`${method}_box`].apply({
            __section: name
          }, args);
        });
      });
    }

    LoggerManager.register(this);
  }

  getPrefix(options) {
    let prefix = `${this.name} ➔ ${options.method}`;

    if (options.section) {
      prefix = `${this.name} ➔ ${options.section}.${options.method}`;
    }

    const details = this._getCallerDetails();

    const detailParts = [];

    if (details.package && (LoggerManager.showPackage === true || options.type === 'error')) {
      detailParts.push(details.package);
    }

    if (LoggerManager.showFileAndLine === true || options.type === 'error') {
      if (details.file != null && details.line != null) {
        detailParts.push(`${details.file}:${details.line}`);
      } else {
        if (details.file != null) {
          detailParts.push(details.file);
        }

        if (details.line != null) {
          detailParts.push(details.line);
        }
      }
    }

    if (defaultTypes[options.type]) {
      // format the message to a colored message
      prefix = prefix[defaultTypes[options.type].color];
    }

    if (detailParts.length > 0) {
      prefix = `${detailParts.join(' ')} ${prefix}`;
    }

    return prefix;
  }

  _getCallerDetails() {
    const getStack = () => {
      // We do NOT use Error.prepareStackTrace here (a V8 extension that gets us a
      // core-parsed stack) since it's impossible to compose it with the use of
      // Error.prepareStackTrace used on the server for source maps.
      const {
        stack
      } = new Error();
      return stack;
    };

    const stack = getStack();

    if (!stack) {
      return {};
    }

    const lines = stack.split('\n').splice(1); // looking for the first line outside the logging package (or an
    // eval if we find that first)

    let line = lines[0];

    for (let index = 0, len = lines.length; index < len, index++; line = lines[index]) {
      if (line.match(/^\s*at eval \(eval/)) {
        return {
          file: 'eval'
        };
      }

      if (!line.match(/packages\/rocketchat_logger(?:\/|\.js)/)) {
        break;
      }
    }

    const details = {}; // The format for FF is 'functionName@filePath:lineNumber'
    // The format for V8 is 'functionName (packages/logging/logging.js:81)' or
    //                      'packages/logging/logging.js:81'

    const match = /(?:[@(]| at )([^(]+?):([0-9:]+)(?:\)|$)/.exec(line);

    if (!match) {
      return details;
    }

    details.line = match[2].split(':')[0]; // Possible format: https://foo.bar.com/scripts/file.js?random=foobar
    // XXX: if you can write the following in better way, please do it
    // XXX: what about evals?

    details.file = match[1].split('/').slice(-1)[0].split('?')[0];
    const packageMatch = match[1].match(/packages\/([^\.\/]+)(?:\/|\.)/);

    if (packageMatch) {
      details.package = packageMatch[1];
    }

    return details;
  }

  makeABox(message, title) {
    if (!_.isArray(message)) {
      message = message.split('\n');
    }

    let len = 0;
    len = Math.max.apply(null, message.map(line => line.length));
    const topLine = `+--${s.pad('', len, '-')}--+`;
    const separator = `|  ${s.pad('', len, '')}  |`;
    let lines = [];
    lines.push(topLine);

    if (title) {
      lines.push(`|  ${s.lrpad(title, len)}  |`);
      lines.push(topLine);
    }

    lines.push(separator);
    lines = [...lines, ...message.map(line => `|  ${s.rpad(line, len)}  |`)];
    lines.push(separator);
    lines.push(topLine);
    return lines;
  }

  _log(options, ...args) {
    if (LoggerManager.enabled === false) {
      LoggerManager.addToQueue(this, [options, ...args]);
      return;
    }

    if (options.level == null) {
      options.level = 1;
    }

    if (LoggerManager.logLevel < options.level) {
      return;
    }

    const prefix = this.getPrefix(options);

    if (options.box === true && _.isString(options.arguments[0])) {
      let color = undefined;

      if (defaultTypes[options.type]) {
        color = defaultTypes[options.type].color;
      }

      const box = this.makeABox(options.arguments[0], options.arguments[1]);
      let subPrefix = '➔';

      if (color) {
        subPrefix = subPrefix[color];
      }

      console.log(subPrefix, prefix);
      box.forEach(line => {
        console.log(subPrefix, color ? line[color] : line);
      });
    } else {
      options.arguments.unshift(prefix);
      console.log.apply(console, options.arguments);
    }
  }

} // TODO: change this global to import


module.runSetters(Logger = global.Logger = _Logger);

const processString = function (string, date) {
  let obj;

  try {
    if (string[0] === '{') {
      obj = EJSON.parse(string);
    } else {
      obj = {
        message: string,
        time: date,
        level: 'info'
      };
    }

    return Log.format(obj, {
      color: true
    });
  } catch (error) {
    return string;
  }
}; // TODO: change this global to import


module.runSetters(SystemLogger = new Logger('System', {
  // eslint-disable-line no-undef
  methods: {
    startup: {
      type: 'success',
      level: 0
    }
  }
}));
const StdOut = new class extends EventEmitter {
  constructor() {
    super();
    const {
      write
    } = process.stdout;
    this.queue = [];

    process.stdout.write = (...args) => {
      write.apply(process.stdout, args);
      const date = new Date();
      const string = processString(args[0], date);
      const item = {
        id: Random.id(),
        string,
        ts: date
      };
      this.queue.push(item);

      if (typeof RocketChat !== 'undefined') {
        const limit = RocketChat.settings.get('Log_View_Limit');

        if (limit && this.queue.length > limit) {
          this.queue.shift();
        }
      }

      this.emit('write', string, item);
    };
  }

}();
Meteor.publish('stdout', function () {
  if (!this.userId || RocketChat.authz.hasPermission(this.userId, 'view-logs') !== true) {
    return this.ready();
  }

  StdOut.queue.forEach(item => {
    this.added('stdout', item.id, {
      string: item.string,
      ts: item.ts
    });
  });
  this.ready();
  StdOut.on('write', (string, item) => {
    this.added('stdout', item.id, {
      string: item.string,
      ts: item.ts
    });
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:logger/server/server.js");

/* Exports */
Package._define("rocketchat:logger", {
  Logger: Logger,
  SystemLogger: SystemLogger,
  LoggerManager: LoggerManager
});

})();

//# sourceURL=meteor://💻app/packages/rocketchat_logger.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsb2dnZXIvc2VydmVyL3NlcnZlci5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJTeXN0ZW1Mb2dnZXIiLCJTdGRPdXQiLCJMb2dnZXJNYW5hZ2VyIiwicHJvY2Vzc1N0cmluZyIsIkxvZ2dlciIsIl8iLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsInMiLCJFdmVudEVtaXR0ZXIiLCJjb25zdHJ1Y3RvciIsImVuYWJsZWQiLCJsb2dnZXJzIiwicXVldWUiLCJzaG93UGFja2FnZSIsInNob3dGaWxlQW5kTGluZSIsImxvZ0xldmVsIiwicmVnaXN0ZXIiLCJsb2dnZXIiLCJuYW1lIiwiZW1pdCIsImFkZFRvUXVldWUiLCJhcmdzIiwicHVzaCIsImRpc3BhdGNoUXVldWUiLCJlYWNoIiwiaXRlbSIsIl9sb2ciLCJhcHBseSIsImNsZWFyUXVldWUiLCJkaXNhYmxlIiwiZW5hYmxlIiwiZGVmYXVsdFR5cGVzIiwiZGVidWciLCJjb2xvciIsImxldmVsIiwibG9nIiwiaW5mbyIsInN1Y2Nlc3MiLCJ3YXJuIiwiZXJyb3IiLCJfTG9nZ2VyIiwiY29uZmlnIiwic2VsZiIsIk9iamVjdCIsImFzc2lnbiIsInR5cGVDb25maWciLCJ0eXBlIiwiY2FsbCIsInNlY3Rpb24iLCJfX3NlY3Rpb24iLCJtZXRob2QiLCJhcmd1bWVudHMiLCJib3giLCJtZXRob2RzIiwic2VjdGlvbnMiLCJnZXRQcmVmaXgiLCJvcHRpb25zIiwicHJlZml4IiwiZGV0YWlscyIsIl9nZXRDYWxsZXJEZXRhaWxzIiwiZGV0YWlsUGFydHMiLCJwYWNrYWdlIiwiZmlsZSIsImxpbmUiLCJsZW5ndGgiLCJqb2luIiwiZ2V0U3RhY2siLCJzdGFjayIsIkVycm9yIiwibGluZXMiLCJzcGxpdCIsInNwbGljZSIsImluZGV4IiwibGVuIiwibWF0Y2giLCJleGVjIiwic2xpY2UiLCJwYWNrYWdlTWF0Y2giLCJtYWtlQUJveCIsIm1lc3NhZ2UiLCJ0aXRsZSIsImlzQXJyYXkiLCJNYXRoIiwibWF4IiwibWFwIiwidG9wTGluZSIsInBhZCIsInNlcGFyYXRvciIsImxycGFkIiwicnBhZCIsImlzU3RyaW5nIiwidW5kZWZpbmVkIiwic3ViUHJlZml4IiwiY29uc29sZSIsImZvckVhY2giLCJ1bnNoaWZ0IiwiZ2xvYmFsIiwic3RyaW5nIiwiZGF0ZSIsIm9iaiIsIkVKU09OIiwicGFyc2UiLCJ0aW1lIiwiTG9nIiwiZm9ybWF0Iiwic3RhcnR1cCIsIndyaXRlIiwicHJvY2VzcyIsInN0ZG91dCIsIkRhdGUiLCJpZCIsIlJhbmRvbSIsInRzIiwiUm9ja2V0Q2hhdCIsImxpbWl0Iiwic2V0dGluZ3MiLCJnZXQiLCJzaGlmdCIsIk1ldGVvciIsInB1Ymxpc2giLCJ1c2VySWQiLCJhdXRoeiIsImhhc1Blcm1pc3Npb24iLCJyZWFkeSIsImFkZGVkIiwib24iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsTUFBUCxDQUFjO0FBQUNDLGdCQUFhLE1BQUlBLFlBQWxCO0FBQStCQyxVQUFPLE1BQUlBLE1BQTFDO0FBQWlEQyxpQkFBYyxNQUFJQSxhQUFuRTtBQUFpRkMsaUJBQWMsTUFBSUEsYUFBbkc7QUFBaUhDLFVBQU8sTUFBSUE7QUFBNUgsQ0FBZDs7QUFBbUosSUFBSUMsQ0FBSjs7QUFBTVAsT0FBT1EsS0FBUCxDQUFhQyxRQUFRLFlBQVIsQ0FBYixFQUFtQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0osUUFBRUksQ0FBRjtBQUFJOztBQUFoQixDQUFuQyxFQUFxRCxDQUFyRDtBQUF3RCxJQUFJQyxDQUFKO0FBQU1aLE9BQU9RLEtBQVAsQ0FBYUMsUUFBUSxtQkFBUixDQUFiLEVBQTBDO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDQyxRQUFFRCxDQUFGO0FBQUk7O0FBQWhCLENBQTFDLEVBQTRELENBQTVEO0FBSXZOO0FBQ0Esa0NBQWdCLElBQUksY0FBY0UsWUFBZCxD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QmUsVUFBSXZGLEtBQUt1RjtBQUZvQixLQUE5QjtBQUlBLEdBTEQ7QUFPQSxPQUFLVyxLQUFMO0FBQ0E3SCxTQUFPK0gsRUFBUCxDQUFVLE9BQVYsRUFBbUIsQ0FBQzVCLE1BQUQsRUFBU3hFLElBQVQsS0FBa0I7QUFDcEMsU0FBS21HLEtBQUwsQ0FBVyxRQUFYLEVBQXFCbkcsS0FBS3FGLEVBQTFCLEVBQThCO0FBQzdCYixjQUFReEUsS0FBS3dFLE1BRGdCO0FBRTdCZSxVQUFJdkYsS0FBS3VGO0FBRm9CLEtBQTlCO0FBSUEsR0FMRDtBQU1BLENBbkJELEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfbG9nZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFscyBFdmVudEVtaXR0ZXIgTG9nZ2VyTWFuYWdlciBTeXN0ZW1Mb2dnZXIgTG9nKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuXG4vLyBUT0RPOiBjaGFuZ2UgdGhpcyBnbG9iYWwgdG8gaW1wb3J0XG5Mb2dnZXJNYW5hZ2VyID0gbmV3IGNsYXNzIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bmRlZlxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuZW5hYmxlZCA9IGZhbHNlO1xuXHRcdHRoaXMubG9nZ2VycyA9IHt9O1xuXHRcdHRoaXMucXVldWUgPSBbXTtcblx0XHR0aGlzLnNob3dQYWNrYWdlID0gZmFsc2U7XG5cdFx0dGhpcy5zaG93RmlsZUFuZExpbmUgPSBmYWxzZTtcblx0XHR0aGlzLmxvZ0xldmVsID0gMDtcblx0fVxuXHRyZWdpc3Rlcihsb2dnZXIpIHtcblx0XHRpZiAoIWxvZ2dlciBpbnN0YW5jZW9mIExvZ2dlcikge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLmxvZ2dlcnNbbG9nZ2VyLm5hbWVdID0gbG9nZ2VyO1xuXHRcdHRoaXMuZW1pdCgncmVnaXN0ZXInLCBsb2dnZXIpO1xuXHR9XG5cdGFkZFRvUXVldWUobG9nZ2VyLCBhcmdzKSB7XG5cdFx0dGhpcy5xdWV1ZS5wdXNoKHtcblx0XHRcdGxvZ2dlciwgYXJncyxcblx0XHR9KTtcblx0fVxuXHRkaXNwYXRjaFF1ZXVlKCkge1xuXHRcdF8uZWFjaCh0aGlzLnF1ZXVlLCAoaXRlbSkgPT4gaXRlbS5sb2dnZXIuX2xvZy5hcHBseShpdGVtLmxvZ2dlciwgaXRlbS5hcmdzKSk7XG5cdFx0dGhpcy5jbGVhclF1ZXVlKCk7XG5cdH1cblx0Y2xlYXJRdWV1ZSgpIHtcblx0XHR0aGlzLnF1ZXVlID0gW107XG5cdH1cblxuXHRkaXNhYmxlKCkge1xuXHRcdHRoaXMuZW5hYmxlZCA9IGZhbHNlO1xuXHR9XG5cblx0ZW5hYmxlKGRpc3BhdGNoUXVldWUgPSBmYWxzZSkge1xuXHRcdHRoaXMuZW5hYmxlZCA9IHRydWU7XG5cdFx0cmV0dXJuIChkaXNwYXRjaFF1ZXVlID09PSB0cnVlKSA/IHRoaXMuZGlzcGF0Y2hRdWV1ZSgpIDogdGhpcy5jbGVhclF1ZXVlKCk7XG5cdH1cbn07XG5cblxuY29uc3QgZGVmYXVsdFR5cGVzID0ge1xuXHRkZWJ1Zzoge1xuXHRcdG5hbWU6ICdkZWJ1ZycsXG5cdFx0Y29sb3I6ICdibHVlJyxcblx0XHRsZXZlbDogMixcblx0fSxcblx0bG9nOiB7XG5cdFx0bmFtZTogJ2luZm8nLFxuXHRcdGNvbG9yOiAnYmx1ZScsXG5cdFx0bGV2ZWw6IDEsXG5cdH0sXG5cdGluZm86IHtcblx0XHRuYW1lOiAnaW5mbycsXG5cdFx0Y29sb3I6ICdibHVlJyxcblx0XHRsZXZlbDogMSxcblx0fSxcblx0c3VjY2Vzczoge1xuXHRcdG5hbWU6ICdpbmZvJyxcblx0XHRjb2xvcjogJ2dyZWVuJyxcblx0XHRsZXZlbDogMSxcblx0fSxcblx0d2Fybjoge1xuXHRcdG5hbWU6ICd3YXJuJyxcblx0XHRjb2xvcjogJ21hZ2VudGEnLFxuXHRcdGxldmVsOiAxLFxuXHR9LFxuXHRlcnJvcjoge1xuXHRcdG5hbWU6ICdlcnJvcicsXG5cdFx0Y29sb3I6ICdyZWQnLFxuXHRcdGxldmVsOiAwLFxuXHR9LFxufTtcblxuY2xhc3MgX0xvZ2dlciB7XG5cdGNvbnN0cnVjdG9yKG5hbWUsIGNvbmZpZyA9IHt9KSB7XG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcblxuXHRcdHRoaXMuY29uZmlnID0gT2JqZWN0LmFzc2lnbih7fSwgY29uZmlnKTtcblx0XHRpZiAoTG9nZ2VyTWFuYWdlci5sb2dnZXJzICYmIExvZ2dlck1hbmFnZXIubG9nZ2Vyc1t0aGlzLm5hbWVdICE9IG51bGwpIHtcblx0XHRcdExvZ2dlck1hbmFnZXIubG9nZ2Vyc1t0aGlzLm5hbWVdLndhcm4oJ0R1cGxpY2F0ZWQgaW5zdGFuY2UnKTtcblx0XHRcdHJldHVybiBMb2dnZXJNYW5hZ2VyLmxvZ2dlcnNbdGhpcy5uYW1lXTtcblx0XHR9XG5cdFx0Xy5lYWNoKGRlZmF1bHRUeXBlcywgKHR5cGVDb25maWcsIHR5cGUpID0+IHtcblx0XHRcdHRoaXNbdHlwZV0gPSBmdW5jdGlvbiguLi5hcmdzKSB7XG5cdFx0XHRcdHJldHVybiBzZWxmLl9sb2cuY2FsbChzZWxmLCB7XG5cdFx0XHRcdFx0c2VjdGlvbjogdGhpcy5fX3NlY3Rpb24sXG5cdFx0XHRcdFx0dHlwZSxcblx0XHRcdFx0XHRsZXZlbDogdHlwZUNvbmZpZy5sZXZlbCxcblx0XHRcdFx0XHRtZXRob2Q6IHR5cGVDb25maWcubmFtZSxcblx0XHRcdFx0XHRhcmd1bWVudHM6IGFyZ3MsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblxuXHRcdFx0c2VsZltgJHsgdHlwZSB9X2JveGBdID0gZnVuY3Rpb24oLi4uYXJncykge1xuXHRcdFx0XHRyZXR1cm4gc2VsZi5fbG9nLmNhbGwoc2VsZiwge1xuXHRcdFx0XHRcdHNlY3Rpb246IHRoaXMuX19zZWN0aW9uLFxuXHRcdFx0XHRcdHR5cGUsXG5cdFx0XHRcdFx0Ym94OiB0cnVlLFxuXHRcdFx0XHRcdGxldmVsOiB0eXBlQ29uZmlnLmxldmVsLFxuXHRcdFx0XHRcdG1ldGhvZDogdHlwZUNvbmZpZy5uYW1lLFxuXHRcdFx0XHRcdGFyZ3VtZW50czogYXJncyxcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdH0pO1xuXHRcdGlmICh0aGlzLmNvbmZpZy5tZXRob2RzKSB7XG5cdFx0XHRfLmVhY2godGhpcy5jb25maWcubWV0aG9kcywgKHR5cGVDb25maWcsIG1ldGhvZCkgPT4ge1xuXHRcdFx0XHRpZiAodGhpc1ttZXRob2RdICE9IG51bGwpIHtcblx0XHRcdFx0XHRzZWxmLndhcm4oYE1ldGhvZCAkeyBtZXRob2QgfSBhbHJlYWR5IGV4aXN0c2ApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChkZWZhdWx0VHlwZXNbdHlwZUNvbmZpZy50eXBlXSA9PSBudWxsKSB7XG5cdFx0XHRcdFx0c2VsZi53YXJuKGBNZXRob2QgdHlwZSAkeyB0eXBlQ29uZmlnLnR5cGUgfSBkb2VzIG5vdCBleGlzdGApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXNbbWV0aG9kXSA9IGZ1bmN0aW9uKC4uLmFyZ3MpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2VsZi5fbG9nLmNhbGwoc2VsZiwge1xuXHRcdFx0XHRcdFx0c2VjdGlvbjogdGhpcy5fX3NlY3Rpb24sXG5cdFx0XHRcdFx0XHR0eXBlOiB0eXBlQ29uZmlnLnR5cGUsXG5cdFx0XHRcdFx0XHRsZXZlbDogdHlwZUNvbmZpZy5sZXZlbCAhPSBudWxsID8gdHlwZUNvbmZpZy5sZXZlbCA6IGRlZmF1bHRUeXBlc1t0eXBlQ29uZmlnLnR5cGVdICYmIGRlZmF1bHRUeXBlc1t0eXBlQ29uZmlnLnR5cGVdLmxldmVsLFxuXHRcdFx0XHRcdFx0bWV0aG9kLFxuXHRcdFx0XHRcdFx0YXJndW1lbnRzOiBhcmdzLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHR0aGlzW2AkeyBtZXRob2QgfV9ib3hgXSA9IGZ1bmN0aW9uKC4uLmFyZ3MpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2VsZi5fbG9nLmNhbGwoc2VsZiwge1xuXHRcdFx0XHRcdFx0c2VjdGlvbjogdGhpcy5fX3NlY3Rpb24sXG5cdFx0XHRcdFx0XHR0eXBlOiB0eXBlQ29uZmlnLnR5cGUsXG5cdFx0XHRcdFx0XHRib3g6IHRydWUsXG5cdFx0XHRcdFx0XHRsZXZlbDogdHlwZUNvbmZpZy5sZXZlbCAhPSBudWxsID8gdHlwZUNvbmZpZy5sZXZlbCA6IGRlZmF1bHRUeXBlc1t0eXBlQ29uZmlnLnR5cGVdICYmIGRlZmF1bHRUeXBlc1t0eXBlQ29uZmlnLnR5cGVdLmxldmVsLFxuXHRcdFx0XHRcdFx0bWV0aG9kLFxuXHRcdFx0XHRcdFx0YXJndW1lbnRzOiBhcmdzLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9O1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmNvbmZpZy5zZWN0aW9ucykge1xuXHRcdFx0Xy5lYWNoKHRoaXMuY29uZmlnLnNlY3Rpb25zLCAobmFtZSwgc2VjdGlvbikgPT4ge1xuXHRcdFx0XHR0aGlzW3NlY3Rpb25dID0ge307XG5cdFx0XHRcdF8uZWFjaChkZWZhdWx0VHlwZXMsICh0eXBlQ29uZmlnLCB0eXBlKSA9PiB7XG5cdFx0XHRcdFx0c2VsZltzZWN0aW9uXVt0eXBlXSA9ICguLi5hcmdzKSA9PiB0aGlzW3R5cGVdLmFwcGx5KHsgX19zZWN0aW9uOiBuYW1lIH0sIGFyZ3MpO1xuXHRcdFx0XHRcdHNlbGZbc2VjdGlvbl1bYCR7IHR5cGUgfV9ib3hgXSA9ICguLi5hcmdzKSA9PiB0aGlzW2AkeyB0eXBlIH1fYm94YF0uYXBwbHkoeyBfX3NlY3Rpb246IG5hbWUgfSwgYXJncyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRfLmVhY2godGhpcy5jb25maWcubWV0aG9kcywgKHR5cGVDb25maWcsIG1ldGhvZCkgPT4ge1xuXHRcdFx0XHRcdHNlbGZbc2VjdGlvbl1bbWV0aG9kXSA9ICguLi5hcmdzKSA9PiBzZWxmW21ldGhvZF0uYXBwbHkoeyBfX3NlY3Rpb246IG5hbWUgfSwgYXJncyk7XG5cdFx0XHRcdFx0c2VsZltzZWN0aW9uXVtgJHsgbWV0aG9kIH1fYm94YF0gPSAoLi4uYXJncykgPT4gc2VsZltgJHsgbWV0aG9kIH1fYm94YF0uYXBwbHkoeyBfX3NlY3Rpb246IG5hbWUgfSwgYXJncyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0TG9nZ2VyTWFuYWdlci5yZWdpc3Rlcih0aGlzKTtcblx0fVxuXHRnZXRQcmVmaXgob3B0aW9ucykge1xuXHRcdGxldCBwcmVmaXggPSBgJHsgdGhpcy5uYW1lIH0g4p6UICR7IG9wdGlvbnMubWV0aG9kIH1gO1xuXHRcdGlmIChvcHRpb25zLnNlY3Rpb24pIHtcblx0XHRcdHByZWZpeCA9IGAkeyB0aGlzLm5hbWUgfSDinpQgJHsgb3B0aW9ucy5zZWN0aW9uIH0uJHsgb3B0aW9ucy5tZXRob2QgfWA7XG5cdFx0fVxuXHRcdGNvbnN0IGRldGFpbHMgPSB0aGlzLl9nZXRDYWxsZXJEZXRhaWxzKCk7XG5cdFx0Y29uc3QgZGV0YWlsUGFydHMgPSBbXTtcblx0XHRpZiAoZGV0YWlscy5wYWNrYWdlICYmIChMb2dnZXJNYW5hZ2VyLnNob3dQYWNrYWdlID09PSB0cnVlIHx8IG9wdGlvbnMudHlwZSA9PT0gJ2Vycm9yJykpIHtcblx0XHRcdGRldGFpbFBhcnRzLnB1c2goZGV0YWlscy5wYWNrYWdlKTtcblx0XHR9XG5cdFx0aWYgKExvZ2dlck1hbmFnZXIuc2hvd0ZpbGVBbmRMaW5lID09PSB0cnVlIHx8IG9wdGlvbnMudHlwZSA9PT0gJ2Vycm9yJykge1xuXHRcdFx0aWYgKChkZXRhaWxzLmZpbGUgIT0gbnVsbCkgJiYgKGRldGFpbHMubGluZSAhPSBudWxsKSkge1xuXHRcdFx0XHRkZXRhaWxQYXJ0cy5wdXNoKGAkeyBkZXRhaWxzLmZpbGUgfTokeyBkZXRhaWxzLmxpbmUgfWApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKGRldGFpbHMuZmlsZSAhPSBudWxsKSB7XG5cdFx0XHRcdFx0ZGV0YWlsUGFydHMucHVzaChkZXRhaWxzLmZpbGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChkZXRhaWxzLmxpbmUgIT0gbnVsbCkge1xuXHRcdFx0XHRcdGRldGFpbFBhcnRzLnB1c2goZGV0YWlscy5saW5lKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoZGVmYXVsdFR5cGVzW29wdGlvbnMudHlwZV0pIHtcblx0XHRcdC8vIGZvcm1hdCB0aGUgbWVzc2FnZSB0byBhIGNvbG9yZWQgbWVzc2FnZVxuXHRcdFx0cHJlZml4ID0gcHJlZml4W2RlZmF1bHRUeXBlc1tvcHRpb25zLnR5cGVdLmNvbG9yXTtcblx0XHR9XG5cdFx0aWYgKGRldGFpbFBhcnRzLmxlbmd0aCA+IDApIHtcblx0XHRcdHByZWZpeCA9IGAkeyBkZXRhaWxQYXJ0cy5qb2luKCcgJykgfSAkeyBwcmVmaXggfWA7XG5cdFx0fVxuXHRcdHJldHVybiBwcmVmaXg7XG5cdH1cblx0X2dldENhbGxlckRldGFpbHMoKSB7XG5cdFx0Y29uc3QgZ2V0U3RhY2sgPSAoKSA9PiB7XG5cdFx0XHQvLyBXZSBkbyBOT1QgdXNlIEVycm9yLnByZXBhcmVTdGFja1RyYWNlIGhlcmUgKGEgVjggZXh0ZW5zaW9uIHRoYXQgZ2V0cyB1cyBhXG5cdFx0XHQvLyBjb3JlLXBhcnNlZCBzdGFjaykgc2luY2UgaXQncyBpbXBvc3NpYmxlIHRvIGNvbXBvc2UgaXQgd2l0aCB0aGUgdXNlIG9mXG5cdFx0XHQvLyBFcnJvci5wcmVwYXJlU3RhY2tUcmFjZSB1c2VkIG9uIHRoZSBzZXJ2ZXIgZm9yIHNvdXJjZSBtYXBzLlxuXHRcdFx0Y29uc3QgeyBzdGFjayB9ID0gbmV3IEVycm9yKCk7XG5cdFx0XHRyZXR1cm4gc3RhY2s7XG5cdFx0fTtcblx0XHRjb25zdCBzdGFjayA9IGdldFN0YWNrKCk7XG5cdFx0aWYgKCFzdGFjaykge1xuXHRcdFx0cmV0dXJuIHt9O1xuXHRcdH1cblx0XHRjb25zdCBsaW5lcyA9IHN0YWNrLnNwbGl0KCdcXG4nKS5zcGxpY2UoMSk7XG5cdFx0Ly8gbG9va2luZyBmb3IgdGhlIGZpcnN0IGxpbmUgb3V0c2lkZSB0aGUgbG9nZ2luZyBwYWNrYWdlIChvciBhblxuXHRcdC8vIGV2YWwgaWYgd2UgZmluZCB0aGF0IGZpcnN0KVxuXHRcdGxldCBsaW5lID0gbGluZXNbMF07XG5cdFx0Zm9yIChsZXQgaW5kZXggPSAwLCBsZW4gPSBsaW5lcy5sZW5ndGg7IGluZGV4IDwgbGVuLCBpbmRleCsrOyBsaW5lID0gbGluZXNbaW5kZXhdKSB7XG5cdFx0XHRpZiAobGluZS5tYXRjaCgvXlxccyphdCBldmFsIFxcKGV2YWwvKSkge1xuXHRcdFx0XHRyZXR1cm4geyBmaWxlOiAnZXZhbCcgfTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFsaW5lLm1hdGNoKC9wYWNrYWdlc1xcL3JvY2tldGNoYXRfbG9nZ2VyKD86XFwvfFxcLmpzKS8pKSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNvbnN0IGRldGFpbHMgPSB7fTtcblx0XHQvLyBUaGUgZm9ybWF0IGZvciBGRiBpcyAnZnVuY3Rpb25OYW1lQGZpbGVQYXRoOmxpbmVOdW1iZXInXG5cdFx0Ly8gVGhlIGZvcm1hdCBmb3IgVjggaXMgJ2Z1bmN0aW9uTmFtZSAocGFja2FnZXMvbG9nZ2luZy9sb2dnaW5nLmpzOjgxKScgb3Jcblx0XHQvLyAgICAgICAgICAgICAgICAgICAgICAncGFja2FnZXMvbG9nZ2luZy9sb2dnaW5nLmpzOjgxJ1xuXHRcdGNvbnN0IG1hdGNoID0gLyg/OltAKF18IGF0ICkoW14oXSs/KTooWzAtOTpdKykoPzpcXCl8JCkvLmV4ZWMobGluZSk7XG5cdFx0aWYgKCFtYXRjaCkge1xuXHRcdFx0cmV0dXJuIGRldGFpbHM7XG5cdFx0fVxuXHRcdGRldGFpbHMubGluZSA9IG1hdGNoWzJdLnNwbGl0KCc6JylbMF07XG5cdFx0Ly8gUG9zc2libGUgZm9ybWF0OiBodHRwczovL2Zvby5iYXIuY29tL3NjcmlwdHMvZmlsZS5qcz9yYW5kb209Zm9vYmFyXG5cdFx0Ly8gWFhYOiBpZiB5b3UgY2FuIHdyaXRlIHRoZSBmb2xsb3dpbmcgaW4gYmV0dGVyIHdheSwgcGxlYXNlIGRvIGl0XG5cdFx0Ly8gWFhYOiB3aGF0IGFib3V0IGV2YWxzP1xuXHRcdGRldGFpbHMuZmlsZSA9IG1hdGNoWzFdLnNwbGl0KCcvJykuc2xpY2UoLTEpWzBdLnNwbGl0KCc/JylbMF07XG5cdFx0Y29uc3QgcGFja2FnZU1hdGNoID0gbWF0Y2hbMV0ubWF0Y2goL3BhY2thZ2VzXFwvKFteXFwuXFwvXSspKD86XFwvfFxcLikvKTtcblx0XHRpZiAocGFja2FnZU1hdGNoKSB7XG5cdFx0XHRkZXRhaWxzLnBhY2thZ2UgPSBwYWNrYWdlTWF0Y2hbMV07XG5cdFx0fVxuXHRcdHJldHVybiBkZXRhaWxzO1xuXHR9XG5cdG1ha2VBQm94KG1lc3NhZ2UsIHRpdGxlKSB7XG5cdFx0aWYgKCFfLmlzQXJyYXkobWVzc2FnZSkpIHtcblx0XHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnNwbGl0KCdcXG4nKTtcblx0XHR9XG5cdFx0bGV0IGxlbiA9IDA7XG5cblx0XHRsZW4gPSBNYXRoLm1heC5hcHBseShudWxsLCBtZXNzYWdlLm1hcCgobGluZSkgPT4gbGluZS5sZW5ndGgpKTtcblxuXHRcdGNvbnN0IHRvcExpbmUgPSBgKy0tJHsgcy5wYWQoJycsIGxlbiwgJy0nKSB9LS0rYDtcblx0XHRjb25zdCBzZXBhcmF0b3IgPSBgfCAgJHsgcy5wYWQoJycsIGxlbiwgJycpIH0gIHxgO1xuXHRcdGxldCBsaW5lcyA9IFtdO1xuXG5cdFx0bGluZXMucHVzaCh0b3BMaW5lKTtcblx0XHRpZiAodGl0bGUpIHtcblx0XHRcdGxpbmVzLnB1c2goYHwgICR7IHMubHJwYWQodGl0bGUsIGxlbikgfSAgfGApO1xuXHRcdFx0bGluZXMucHVzaCh0b3BMaW5lKTtcblx0XHR9XG5cdFx0bGluZXMucHVzaChzZXBhcmF0b3IpO1xuXG5cdFx0bGluZXMgPSBbLi4ubGluZXMsIC4uLm1lc3NhZ2UubWFwKChsaW5lKSA9PiBgfCAgJHsgcy5ycGFkKGxpbmUsIGxlbikgfSAgfGApXTtcblxuXHRcdGxpbmVzLnB1c2goc2VwYXJhdG9yKTtcblx0XHRsaW5lcy5wdXNoKHRvcExpbmUpO1xuXHRcdHJldHVybiBsaW5lcztcblx0fVxuXG5cdF9sb2cob3B0aW9ucywgLi4uYXJncykge1xuXHRcdGlmIChMb2dnZXJNYW5hZ2VyLmVuYWJsZWQgPT09IGZhbHNlKSB7XG5cdFx0XHRMb2dnZXJNYW5hZ2VyLmFkZFRvUXVldWUodGhpcywgW29wdGlvbnMsIC4uLmFyZ3NdKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMubGV2ZWwgPT0gbnVsbCkge1xuXHRcdFx0b3B0aW9ucy5sZXZlbCA9IDE7XG5cdFx0fVxuXG5cdFx0aWYgKExvZ2dlck1hbmFnZXIubG9nTGV2ZWwgPCBvcHRpb25zLmxldmVsKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgcHJlZml4ID0gdGhpcy5nZXRQcmVmaXgob3B0aW9ucyk7XG5cblx0XHRpZiAob3B0aW9ucy5ib3ggPT09IHRydWUgJiYgXy5pc1N0cmluZyhvcHRpb25zLmFyZ3VtZW50c1swXSkpIHtcblx0XHRcdGxldCBjb2xvciA9IHVuZGVmaW5lZDtcblx0XHRcdGlmIChkZWZhdWx0VHlwZXNbb3B0aW9ucy50eXBlXSkge1xuXHRcdFx0XHRjb2xvciA9IGRlZmF1bHRUeXBlc1tvcHRpb25zLnR5cGVdLmNvbG9yO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBib3ggPSB0aGlzLm1ha2VBQm94KG9wdGlvbnMuYXJndW1lbnRzWzBdLCBvcHRpb25zLmFyZ3VtZW50c1sxXSk7XG5cdFx0XHRsZXQgc3ViUHJlZml4ID0gJ+KelCc7XG5cdFx0XHRpZiAoY29sb3IpIHtcblx0XHRcdFx0c3ViUHJlZml4ID0gc3ViUHJlZml4W2NvbG9yXTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc29sZS5sb2coc3ViUHJlZml4LCBwcmVmaXgpO1xuXHRcdFx0Ym94LmZvckVhY2goKGxpbmUpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coc3ViUHJlZml4LCBjb2xvciA/IGxpbmVbY29sb3JdIDogbGluZSk7XG5cdFx0XHR9KTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRvcHRpb25zLmFyZ3VtZW50cy51bnNoaWZ0KHByZWZpeCk7XG5cdFx0XHRjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBvcHRpb25zLmFyZ3VtZW50cyk7XG5cdFx0fVxuXHR9XG59XG4vLyBUT0RPOiBjaGFuZ2UgdGhpcyBnbG9iYWwgdG8gaW1wb3J0XG5Mb2dnZXIgPSBnbG9iYWwuTG9nZ2VyID0gX0xvZ2dlcjtcbmNvbnN0IHByb2Nlc3NTdHJpbmcgPSBmdW5jdGlvbihzdHJpbmcsIGRhdGUpIHtcblx0bGV0IG9iajtcblx0dHJ5IHtcblx0XHRpZiAoc3RyaW5nWzBdID09PSAneycpIHtcblx0XHRcdG9iaiA9IEVKU09OLnBhcnNlKHN0cmluZyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG9iaiA9IHtcblx0XHRcdFx0bWVzc2FnZTogc3RyaW5nLFxuXHRcdFx0XHR0aW1lOiBkYXRlLFxuXHRcdFx0XHRsZXZlbDogJ2luZm8nLFxuXHRcdFx0fTtcblx0XHR9XG5cdFx0cmV0dXJuIExvZy5mb3JtYXQob2JqLCB7IGNvbG9yOiB0cnVlIH0pO1xuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHJldHVybiBzdHJpbmc7XG5cdH1cbn07XG4vLyBUT0RPOiBjaGFuZ2UgdGhpcyBnbG9iYWwgdG8gaW1wb3J0XG5TeXN0ZW1Mb2dnZXIgPSBuZXcgTG9nZ2VyKCdTeXN0ZW0nLCB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW5kZWZcblx0bWV0aG9kczoge1xuXHRcdHN0YXJ0dXA6IHtcblx0XHRcdHR5cGU6ICdzdWNjZXNzJyxcblx0XHRcdGxldmVsOiAwLFxuXHRcdH0sXG5cdH0sXG59KTtcblxuXG5jb25zdCBTdGRPdXQgPSBuZXcgY2xhc3MgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdGNvbnN0IHsgd3JpdGUgfSA9IHByb2Nlc3Muc3Rkb3V0O1xuXHRcdHRoaXMucXVldWUgPSBbXTtcblx0XHRwcm9jZXNzLnN0ZG91dC53cml0ZSA9ICguLi5hcmdzKSA9PiB7XG5cdFx0XHR3cml0ZS5hcHBseShwcm9jZXNzLnN0ZG91dCwgYXJncyk7XG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGU7XG5cdFx0XHRjb25zdCBzdHJpbmcgPSBwcm9jZXNzU3RyaW5nKGFyZ3NbMF0sIGRhdGUpO1xuXHRcdFx0Y29uc3QgaXRlbSA9IHtcblx0XHRcdFx0aWQ6IFJhbmRvbS5pZCgpLFxuXHRcdFx0XHRzdHJpbmcsXG5cdFx0XHRcdHRzOiBkYXRlLFxuXHRcdFx0fTtcblx0XHRcdHRoaXMucXVldWUucHVzaChpdGVtKTtcblxuXHRcdFx0aWYgKHR5cGVvZiBSb2NrZXRDaGF0ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRjb25zdCBsaW1pdCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMb2dfVmlld19MaW1pdCcpO1xuXHRcdFx0XHRpZiAobGltaXQgJiYgdGhpcy5xdWV1ZS5sZW5ndGggPiBsaW1pdCkge1xuXHRcdFx0XHRcdHRoaXMucXVldWUuc2hpZnQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0dGhpcy5lbWl0KCd3cml0ZScsIHN0cmluZywgaXRlbSk7XG5cdFx0fTtcblx0fVxufTtcblxuXG5NZXRlb3IucHVibGlzaCgnc3Rkb3V0JywgZnVuY3Rpb24oKSB7XG5cdGlmICghdGhpcy51c2VySWQgfHwgUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAndmlldy1sb2dzJykgIT09IHRydWUpIHtcblx0XHRyZXR1cm4gdGhpcy5yZWFkeSgpO1xuXHR9XG5cblx0U3RkT3V0LnF1ZXVlLmZvckVhY2goKGl0ZW0pID0+IHtcblx0XHR0aGlzLmFkZGVkKCdzdGRvdXQnLCBpdGVtLmlkLCB7XG5cdFx0XHRzdHJpbmc6IGl0ZW0uc3RyaW5nLFxuXHRcdFx0dHM6IGl0ZW0udHMsXG5cdFx0fSk7XG5cdH0pO1xuXG5cdHRoaXMucmVhZHkoKTtcblx0U3RkT3V0Lm9uKCd3cml0ZScsIChzdHJpbmcsIGl0ZW0pID0+IHtcblx0XHR0aGlzLmFkZGVkKCdzdGRvdXQnLCBpdGVtLmlkLCB7XG5cdFx0XHRzdHJpbmc6IGl0ZW0uc3RyaW5nLFxuXHRcdFx0dHM6IGl0ZW0udHMsXG5cdFx0fSk7XG5cdH0pO1xufSk7XG5cblxuZXhwb3J0IHsgU3lzdGVtTG9nZ2VyLCBTdGRPdXQsIExvZ2dlck1hbmFnZXIsIHByb2Nlc3NTdHJpbmcsIExvZ2dlciB9O1xuIl19
