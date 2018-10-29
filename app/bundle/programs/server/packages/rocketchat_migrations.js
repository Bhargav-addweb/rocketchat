(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var ECMAScript = Package.ecmascript.ECMAScript;
var check = Package.check.check;
var Match = Package.check.Match;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:migrations":{"migrations.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/rocketchat_migrations/migrations.js                                                                //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 2);

/*
	Adds migration capabilities. Migrations are defined like:

	Migrations.add({
		up: function() {}, //*required* code to run to migrate upwards
		version: 1, //*required* number to identify migration order
		down: function() {}, //*optional* code to run to migrate downwards
		name: 'Something' //*optional* display name for the migration
	});

	The ordering of migrations is determined by the version you set.

	To run the migrations, set the MIGRATION_VERSION environment variable to either
	'latest' or the version number you want to migrate to. Optionally, append
	',exit' if you want the migrations to exit the meteor process, e.g if you're
	migrating from a script (remember to pass the --once parameter).

	e.g:
	MIGRATION_VERSION="latest" mrt # ensure we'll be at the latest version and run the app
	MIGRATION_VERSION="latest,exit" mrt --once # ensure we'll be at the latest version and exit
	MIGRATION_VERSION="2,exit" mrt --once # migrate to version 2 and exit
	MIGRATION_VERSION="2,rerun,exit" mrt --once # rerun migration script for version 2 and exit

	Note: Migrations will lock ensuring only 1 app can be migrating at once. If
	a migration crashes, the control record in the migrations collection will
	remain locked and at the version it was at previously, however the db could
	be in an inconsistant state.
*/
// since we'll be at version 0 by default, we should have a migration set for it.
const DefaultMigration = {
  version: 0,

  up() {// @TODO: check if collection "migrations" exist
    // If exists, rename and rerun _migrateTo
  }

};
const Migrations = this.Migrations = {
  _list: [DefaultMigration],
  options: {
    // false disables logging
    log: true,
    // null or a function
    logger: null,
    // enable/disable info log "already at latest."
    logIfLatest: true,
    // lock will be valid for this amount of minutes
    lockExpiration: 5,
    // retry interval in seconds
    retryInterval: 10,
    // max number of attempts to retry unlock
    maxAttempts: 30,
    // migrations collection name
    collectionName: 'migrations' // collectionName: "rocketchat_migrations"

  },

  config(opts) {
    this.options = _.extend({}, this.options, opts);
  }

};
Migrations._collection = new Mongo.Collection(Migrations.options.collectionName);
/* Create a box around messages for displaying on a console.log */

function makeABox(message, color = 'red') {
  if (!_.isArray(message)) {
    message = message.split('\n');
  }

  const len = _(message).reduce(function (memo, msg) {
    return Math.max(memo, msg.length);
  }, 0) + 4;
  const text = message.map(msg => '|'[color] + s.lrpad(msg, len)[color] + '|'[color]).join('\n');
  const topLine = '+'[color] + s.pad('', len, '-')[color] + '+'[color];
  const separator = '|'[color] + s.pad('', len, '') + '|'[color];
  const bottomLine = '+'[color] + s.pad('', len, '-')[color] + '+'[color];
  return `\n${topLine}\n${separator}\n${text}\n${separator}\n${bottomLine}\n`;
}
/*
	Logger factory function. Takes a prefix string and options object
	and uses an injected `logger` if provided, else falls back to
	Meteor's `Log` package.
	Will send a log object to the injected logger, on the following form:
		message: String
		level: String (info, warn, error, debug)
		tag: 'Migrations'
*/


function createLogger(prefix) {
  check(prefix, String); // Return noop if logging is disabled.

  if (Migrations.options.log === false) {
    return function () {};
  }

  return function (level, message) {
    check(level, Match.OneOf('info', 'error', 'warn', 'debug'));
    check(message, Match.OneOf(String, [String]));
    const logger = Migrations.options && Migrations.options.logger;

    if (logger && _.isFunction(logger)) {
      logger({
        level,
        message,
        tag: prefix
      });
    } else {
      Log[level]({
        message: `${prefix}: ${message}`
      });
    }
  };
} // collection holding the control record


const log = createLogger('Migrations');
['info', 'warn', 'error', 'debug'].forEach(function (level) {
  log[level] = _.partial(log, level);
}); // if (process.env.MIGRATE)
//   Migrations.migrateTo(process.env.MIGRATE);
// Add a new migration:
// {up: function *required
//  version: Number *required
//  down: function *optional
//  name: String *optional
// }

Migrations.add = function (migration) {
  if (typeof migration.up !== 'function') {
    throw new Meteor.Error('Migration must supply an up function.');
  }

  if (typeof migration.version !== 'number') {
    throw new Meteor.Error('Migration must supply a version number.');
  }

  if (migration.version <= 0) {
    throw new Meteor.Error('Migration version must be greater than 0');
  } // Freeze the migration object to make it hereafter immutable


  Object.freeze(migration);

  this._list.push(migration);

  this._list = _.sortBy(this._list, function (m) {
    return m.version;
  });
}; // Attempts to run the migrations using command in the form of:
// e.g 'latest', 'latest,exit', 2
// use 'XX,rerun' to re-run the migration at that version


Migrations.migrateTo = function (command) {
  if (_.isUndefined(command) || command === '' || this._list.length === 0) {
    throw new Error(`Cannot migrate using invalid command: ${command}`);
  }

  let version;
  let subcommands;

  if (typeof command === 'number') {
    version = command;
  } else {
    version = command.split(',')[0];
    subcommands = command.split(',').slice(1);
  }

  const {
    maxAttempts,
    retryInterval
  } = Migrations.options;
  let migrated;

  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    if (version === 'latest') {
      migrated = this._migrateTo(_.last(this._list).version);
    } else {
      migrated = this._migrateTo(parseInt(version), subcommands.includes('rerun'));
    }

    if (migrated) {
      break;
    } else {
      let willRetry;

      if (attempts < maxAttempts) {
        willRetry = ` Trying again in ${retryInterval} seconds.`;

        Meteor._sleepForMs(retryInterval * 1000);
      } else {
        willRetry = '';
      }

      console.log(`Not migrating, control is locked. Attempt ${attempts}/${maxAttempts}.${willRetry}`.yellow);
    }
  }

  if (!migrated) {
    const control = this._getControl(); // Side effect: upserts control document.


    console.log(makeABox(['ERROR! SERVER STOPPED', '', 'Your database migration control is locked.', 'Please make sure you are running the latest version and try again.', 'If the problem persists, please contact support.', '', `This Rocket.Chat version: ${RocketChat.Info.version}`, `Database locked at version: ${control.version}`, `Database target version: ${version === 'latest' ? _.last(this._list).version : version}`, '', `Commit: ${RocketChat.Info.commit.hash}`, `Date: ${RocketChat.Info.commit.date}`, `Branch: ${RocketChat.Info.commit.branch}`, `Tag: ${RocketChat.Info.commit.tag}`]));
    process.exit(1);
  } // remember to run meteor with --once otherwise it will restart


  if (subcommands.includes('exit')) {
    process.exit(0);
  }
}; // just returns the current version


Migrations.getVersion = function () {
  return this._getControl().version;
}; // migrates to the specific version passed in


Migrations._migrateTo = function (version, rerun) {
  const self = this;

  const control = this._getControl(); // Side effect: upserts control document.


  let currentVersion = control.version;

  if (lock() === false) {
    // log.info('Not migrating, control is locked.');
    // Warning
    return false;
  }

  if (rerun) {
    log.info(`Rerunning version ${version}`);
    migrate('up', this._findIndexByVersion(version));
    log.info('Finished migrating.');
    unlock();
    return true;
  }

  if (currentVersion === version) {
    if (this.options.logIfLatest) {
      log.info(`Not migrating, already at version ${version}`);
    }

    unlock();
    return true;
  }

  const startIdx = this._findIndexByVersion(currentVersion);

  const endIdx = this._findIndexByVersion(version); // log.info('startIdx:' + startIdx + ' endIdx:' + endIdx);


  log.info(`Migrating from version ${this._list[startIdx].version} -> ${this._list[endIdx].version}`); // run the actual migration

  function migrate(direction, idx) {
    const migration = self._list[idx];

    if (typeof migration[direction] !== 'function') {
      unlock();
      throw new Meteor.Error(`Cannot migrate ${direction} on version ${migration.version}`);
    }

    function maybeName() {
      return migration.name ? ` (${migration.name})` : '';
    }

    log.info(`Running ${direction}() on version ${migration.version}${maybeName()}`);

    try {
      migration[direction](migration);
    } catch (e) {
      console.log(makeABox(['ERROR! SERVER STOPPED', '', 'Your database migration failed:', e.message, '', 'Please make sure you are running the latest version and try again.', 'If the problem persists, please contact support.', '', `This Rocket.Chat version: ${RocketChat.Info.version}`, `Database locked at version: ${control.version}`, `Database target version: ${version}`, '', `Commit: ${RocketChat.Info.commit.hash}`, `Date: ${RocketChat.Info.commit.date}`, `Branch: ${RocketChat.Info.commit.branch}`, `Tag: ${RocketChat.Info.commit.tag}`]));
      process.exit(1);
    }
  } // Returns true if lock was acquired.


  function lock() {
    const date = new Date();
    const dateMinusInterval = moment(date).subtract(self.options.lockExpiration, 'minutes').toDate();
    const build = RocketChat.Info ? RocketChat.Info.build.date : date; // This is atomic. The selector ensures only one caller at a time will see
    // the unlocked control, and locking occurs in the same update's modifier.
    // All other simultaneous callers will get false back from the update.

    return self._collection.update({
      _id: 'control',
      $or: [{
        locked: false
      }, {
        lockedAt: {
          $lt: dateMinusInterval
        }
      }, {
        buildAt: {
          $ne: build
        }
      }]
    }, {
      $set: {
        locked: true,
        lockedAt: date,
        buildAt: build
      }
    }) === 1;
  } // Side effect: saves version.


  function unlock() {
    self._setControl({
      locked: false,
      version: currentVersion
    });
  }

  if (currentVersion < version) {
    for (let i = startIdx; i < endIdx; i++) {
      migrate('up', i + 1);
      currentVersion = self._list[i + 1].version;

      self._setControl({
        locked: true,
        version: currentVersion
      });
    }
  } else {
    for (let i = startIdx; i > endIdx; i--) {
      migrate('down', i);
      currentVersion = self._list[i - 1].version;

      self._setControl({
        locked: true,
        version: currentVersion
      });
    }
  }

  unlock();
  log.info('Finished migrating.');
}; // gets the current control record, optionally creating it if non-existant


Migrations._getControl = function () {
  const control = this._collection.findOne({
    _id: 'control'
  });

  return control || this._setControl({
    version: 0,
    locked: false
  });
}; // sets the control record


Migrations._setControl = function (control) {
  // be quite strict
  check(control.version, Number);
  check(control.locked, Boolean);

  this._collection.update({
    _id: 'control'
  }, {
    $set: {
      version: control.version,
      locked: control.locked
    }
  }, {
    upsert: true
  });

  return control;
}; // returns the migration index in _list or throws if not found


Migrations._findIndexByVersion = function (version) {
  for (let i = 0; i < this._list.length; i++) {
    if (this._list[i].version === version) {
      return i;
    }
  }

  throw new Meteor.Error(`Can't find migration version ${version}`);
}; // reset (mainly intended for tests)


Migrations._reset = function () {
  this._list = [{
    version: 0,

    up() {}

  }];

  this._collection.remove({});
};

RocketChat.Migrations = Migrations;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:migrations/migrations.js");

/* Exports */
Package._define("rocketchat:migrations");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_migrations.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptaWdyYXRpb25zL21pZ3JhdGlvbnMuanMiXSwibmFtZXMiOlsiXyIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwicyIsIm1vbWVudCIsIkRlZmF1bHRNaWdyYXRpb24iLCJ2ZXJzaW9uIiwidXAiLCJNaWdyYXRpb25zIiwiX2xpc3QiLCJvcHRpb25zIiwibG9nIiwibG9nZ2VyIiwibG9nSWZMYXRlc3QiLCJsb2NrRXhwaXJhdGlvbiIsInJldHJ5SW50ZXJ2YWwiLCJtYXhBdHRlbXB0cyIsImNvbGxlY3Rpb25OYW1lIiwiY29uZmlnIiwib3B0cyIsImV4dGVuZCIsIl9jb2xsZWN0aW9uIiwiTW9uZ28iLCJDb2xsZWN0aW9uIiwibWFrZUFCb3giLCJtZXNzYWdlIiwiY29sb3IiLCJpc0FycmF5Iiwic3BsaXQiLCJsZW4iLCJyZWR1Y2UiLCJtZW1vIiwibXNnIiwiTWF0aCIsIm1heCIsImxlbmd0aCIsInRleHQiLCJtYXAiLCJscnBhZCIsImpvaW4iLCJ0b3BMaW5lIiwicGFkIiwic2VwYXJhdG9yIiwiYm90dG9tTGluZSIsImNyZWF0ZUxvZ2dlciIsInByZWZpeCIsImNoZWNrIiwiU3RyaW5nIiwibGV2ZWwiLCJNYXRjaCIsIk9uZU9mIiwiaXNGdW5jdGlvbiIsInRhZyIsIkxvZyIsImZvckVhY2giLCJwYXJ0aWFsIiwiYWRkIiwibWlncmF0aW9uIiwiTWV0ZW9yIiwiRXJyb3IiLCJPYmplY3QiLCJmcmVlemUiLCJwdXNoIiwic29ydEJ5IiwibSIsIm1pZ3JhdGVUbyIsImNvbW1hbmQiLCJpc1VuZGVmaW5lZCIsInN1YmNvbW1hbmRzIiwic2xpY2UiLCJtaWdyYXRlZCIsImF0dGVtcHRzIiwiX21pZ3JhdGVUbyIsImxhc3QiLCJwYXJzZUludCIsImluY2x1ZGVzIiwid2lsbFJldHJ5IiwiX3NsZWVwRm9yTXMiLCJjb25zb2xlIiwieWVsbG93IiwiY29udHJvbCIsIl9nZXRDb250cm9sIiwiUm9ja2V0Q2hhdCIsIkluZm8iLCJjb21taXQiLCJoYXNoIiwiZGF0ZSIsImJyYW5jaCIsInByb2Nlc3MiLCJleGl0IiwiZ2V0VmVyc2lvbiIsInJlcnVuIiwic2VsZiIsImN1cnJlbnRWZXJzaW9uIiwibG9jayIsImluZm8iLCJtaWdyYXRlIiwiX2ZpbmRJbmRleEJ5VmVyc2lvbiIsInVubG9jayIsInN0YXJ0SWR4IiwiZW5kSWR4IiwiZGlyZWN0aW9uIiwiaWR4IiwibWF5YmVOYW1lIiwibmFtZSIsImUiLCJEYXRlIiwiZGF0ZU1pbnVzSW50ZXJ2YWwiLCJzdWJ0cmFjdCIsInRvRGF0ZSIsImJ1aWxkIiwidXBkYXRlIiwiX2lkIiwiJG9yIiwibG9ja2VkIiwibG9ja2VkQXQiLCIkbHQiLCJidWlsZEF0IiwiJG5lIiwiJHNldCIsIl9zZXRDb250cm9sIiwiaSIsImZpbmRPbmUiLCJOdW1iZXIiLCJCb29sZWFuIiwidXBzZXJ0IiwiX3Jlc2V0IiwicmVtb3ZlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLENBQUo7O0FBQU1DLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLFFBQUVLLENBQUY7QUFBSTs7QUFBaEIsQ0FBbkMsRUFBcUQsQ0FBckQ7QUFBd0QsSUFBSUMsQ0FBSjtBQUFNTCxPQUFPQyxLQUFQLENBQWFDLFFBQVEsbUJBQVIsQ0FBYixFQUEwQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0MsUUFBRUQsQ0FBRjtBQUFJOztBQUFoQixDQUExQyxFQUE0RCxDQUE1RDtBQUErRCxJQUFJRSxNQUFKO0FBQVdOLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxRQUFSLENBQWIsRUFBK0I7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNFLGFBQU9GLENBQVA7QUFBUzs7QUFBckIsQ0FBL0IsRUFBc0QsQ0FBdEQ7O0FBSzlJOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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Iiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50IG5vLXVzZS1iZWZvcmUtZGVmaW5lOjAgKi9cbi8qIGdsb2JhbHMgTG9nKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnO1xuLypcblx0QWRkcyBtaWdyYXRpb24gY2FwYWJpbGl0aWVzLiBNaWdyYXRpb25zIGFyZSBkZWZpbmVkIGxpa2U6XG5cblx0TWlncmF0aW9ucy5hZGQoe1xuXHRcdHVwOiBmdW5jdGlvbigpIHt9LCAvLypyZXF1aXJlZCogY29kZSB0byBydW4gdG8gbWlncmF0ZSB1cHdhcmRzXG5cdFx0dmVyc2lvbjogMSwgLy8qcmVxdWlyZWQqIG51bWJlciB0byBpZGVudGlmeSBtaWdyYXRpb24gb3JkZXJcblx0XHRkb3duOiBmdW5jdGlvbigpIHt9LCAvLypvcHRpb25hbCogY29kZSB0byBydW4gdG8gbWlncmF0ZSBkb3dud2FyZHNcblx0XHRuYW1lOiAnU29tZXRoaW5nJyAvLypvcHRpb25hbCogZGlzcGxheSBuYW1lIGZvciB0aGUgbWlncmF0aW9uXG5cdH0pO1xuXG5cdFRoZSBvcmRlcmluZyBvZiBtaWdyYXRpb25zIGlzIGRldGVybWluZWQgYnkgdGhlIHZlcnNpb24geW91IHNldC5cblxuXHRUbyBydW4gdGhlIG1pZ3JhdGlvbnMsIHNldCB0aGUgTUlHUkFUSU9OX1ZFUlNJT04gZW52aXJvbm1lbnQgdmFyaWFibGUgdG8gZWl0aGVyXG5cdCdsYXRlc3QnIG9yIHRoZSB2ZXJzaW9uIG51bWJlciB5b3Ugd2FudCB0byBtaWdyYXRlIHRvLiBPcHRpb25hbGx5LCBhcHBlbmRcblx0JyxleGl0JyBpZiB5b3Ugd2FudCB0aGUgbWlncmF0aW9ucyB0byBleGl0IHRoZSBtZXRlb3IgcHJvY2VzcywgZS5nIGlmIHlvdSdyZVxuXHRtaWdyYXRpbmcgZnJvbSBhIHNjcmlwdCAocmVtZW1iZXIgdG8gcGFzcyB0aGUgLS1vbmNlIHBhcmFtZXRlcikuXG5cblx0ZS5nOlxuXHRNSUdSQVRJT05fVkVSU0lPTj1cImxhdGVzdFwiIG1ydCAjIGVuc3VyZSB3ZSdsbCBiZSBhdCB0aGUgbGF0ZXN0IHZlcnNpb24gYW5kIHJ1biB0aGUgYXBwXG5cdE1JR1JBVElPTl9WRVJTSU9OPVwibGF0ZXN0LGV4aXRcIiBtcnQgLS1vbmNlICMgZW5zdXJlIHdlJ2xsIGJlIGF0IHRoZSBsYXRlc3QgdmVyc2lvbiBhbmQgZXhpdFxuXHRNSUdSQVRJT05fVkVSU0lPTj1cIjIsZXhpdFwiIG1ydCAtLW9uY2UgIyBtaWdyYXRlIHRvIHZlcnNpb24gMiBhbmQgZXhpdFxuXHRNSUdSQVRJT05fVkVSU0lPTj1cIjIscmVydW4sZXhpdFwiIG1ydCAtLW9uY2UgIyByZXJ1biBtaWdyYXRpb24gc2NyaXB0IGZvciB2ZXJzaW9uIDIgYW5kIGV4aXRcblxuXHROb3RlOiBNaWdyYXRpb25zIHdpbGwgbG9jayBlbnN1cmluZyBvbmx5IDEgYXBwIGNhbiBiZSBtaWdyYXRpbmcgYXQgb25jZS4gSWZcblx0YSBtaWdyYXRpb24gY3Jhc2hlcywgdGhlIGNvbnRyb2wgcmVjb3JkIGluIHRoZSBtaWdyYXRpb25zIGNvbGxlY3Rpb24gd2lsbFxuXHRyZW1haW4gbG9ja2VkIGFuZCBhdCB0aGUgdmVyc2lvbiBpdCB3YXMgYXQgcHJldmlvdXNseSwgaG93ZXZlciB0aGUgZGIgY291bGRcblx0YmUgaW4gYW4gaW5jb25zaXN0YW50IHN0YXRlLlxuKi9cblxuLy8gc2luY2Ugd2UnbGwgYmUgYXQgdmVyc2lvbiAwIGJ5IGRlZmF1bHQsIHdlIHNob3VsZCBoYXZlIGEgbWlncmF0aW9uIHNldCBmb3IgaXQuXG5jb25zdCBEZWZhdWx0TWlncmF0aW9uID0ge1xuXHR2ZXJzaW9uOiAwLFxuXHR1cCgpIHtcblx0XHQvLyBAVE9ETzogY2hlY2sgaWYgY29sbGVjdGlvbiBcIm1pZ3JhdGlvbnNcIiBleGlzdFxuXHRcdC8vIElmIGV4aXN0cywgcmVuYW1lIGFuZCByZXJ1biBfbWlncmF0ZVRvXG5cdH0sXG59O1xuXG5jb25zdCBNaWdyYXRpb25zID0gdGhpcy5NaWdyYXRpb25zID0ge1xuXHRfbGlzdDogW0RlZmF1bHRNaWdyYXRpb25dLFxuXHRvcHRpb25zOiB7XG5cdFx0Ly8gZmFsc2UgZGlzYWJsZXMgbG9nZ2luZ1xuXHRcdGxvZzogdHJ1ZSxcblx0XHQvLyBudWxsIG9yIGEgZnVuY3Rpb25cblx0XHRsb2dnZXI6IG51bGwsXG5cdFx0Ly8gZW5hYmxlL2Rpc2FibGUgaW5mbyBsb2cgXCJhbHJlYWR5IGF0IGxhdGVzdC5cIlxuXHRcdGxvZ0lmTGF0ZXN0OiB0cnVlLFxuXHRcdC8vIGxvY2sgd2lsbCBiZSB2YWxpZCBmb3IgdGhpcyBhbW91bnQgb2YgbWludXRlc1xuXHRcdGxvY2tFeHBpcmF0aW9uOiA1LFxuXHRcdC8vIHJldHJ5IGludGVydmFsIGluIHNlY29uZHNcblx0XHRyZXRyeUludGVydmFsOiAxMCxcblx0XHQvLyBtYXggbnVtYmVyIG9mIGF0dGVtcHRzIHRvIHJldHJ5IHVubG9ja1xuXHRcdG1heEF0dGVtcHRzOiAzMCxcblx0XHQvLyBtaWdyYXRpb25zIGNvbGxlY3Rpb24gbmFtZVxuXHRcdGNvbGxlY3Rpb25OYW1lOiAnbWlncmF0aW9ucycsXG5cdFx0Ly8gY29sbGVjdGlvbk5hbWU6IFwicm9ja2V0Y2hhdF9taWdyYXRpb25zXCJcblx0fSxcblx0Y29uZmlnKG9wdHMpIHtcblx0XHR0aGlzLm9wdGlvbnMgPSBfLmV4dGVuZCh7fSwgdGhpcy5vcHRpb25zLCBvcHRzKTtcblx0fSxcbn07XG5cbk1pZ3JhdGlvbnMuX2NvbGxlY3Rpb24gPSBuZXcgTW9uZ28uQ29sbGVjdGlvbihNaWdyYXRpb25zLm9wdGlvbnMuY29sbGVjdGlvbk5hbWUpO1xuXG4vKiBDcmVhdGUgYSBib3ggYXJvdW5kIG1lc3NhZ2VzIGZvciBkaXNwbGF5aW5nIG9uIGEgY29uc29sZS5sb2cgKi9cbmZ1bmN0aW9uIG1ha2VBQm94KG1lc3NhZ2UsIGNvbG9yID0gJ3JlZCcpIHtcblx0aWYgKCFfLmlzQXJyYXkobWVzc2FnZSkpIHtcblx0XHRtZXNzYWdlID0gbWVzc2FnZS5zcGxpdCgnXFxuJyk7XG5cdH1cblx0Y29uc3QgbGVuID0gXyhtZXNzYWdlKS5yZWR1Y2UoZnVuY3Rpb24obWVtbywgbXNnKSB7XG5cdFx0cmV0dXJuIE1hdGgubWF4KG1lbW8sIG1zZy5sZW5ndGgpO1xuXHR9LCAwKSArIDQ7XG5cdGNvbnN0IHRleHQgPSBtZXNzYWdlLm1hcCgobXNnKSA9PiAnfCcgW2NvbG9yXSArIHMubHJwYWQobXNnLCBsZW4pW2NvbG9yXSArICd8JyBbY29sb3JdKS5qb2luKCdcXG4nKTtcblx0Y29uc3QgdG9wTGluZSA9ICcrJyBbY29sb3JdICsgcy5wYWQoJycsIGxlbiwgJy0nKVtjb2xvcl0gKyAnKycgW2NvbG9yXTtcblx0Y29uc3Qgc2VwYXJhdG9yID0gJ3wnIFtjb2xvcl0gKyBzLnBhZCgnJywgbGVuLCAnJykgKyAnfCcgW2NvbG9yXTtcblx0Y29uc3QgYm90dG9tTGluZSA9ICcrJyBbY29sb3JdICsgcy5wYWQoJycsIGxlbiwgJy0nKVtjb2xvcl0gKyAnKycgW2NvbG9yXTtcblx0cmV0dXJuIGBcXG4keyB0b3BMaW5lIH1cXG4keyBzZXBhcmF0b3IgfVxcbiR7IHRleHQgfVxcbiR7IHNlcGFyYXRvciB9XFxuJHsgYm90dG9tTGluZSB9XFxuYDtcbn1cblxuLypcblx0TG9nZ2VyIGZhY3RvcnkgZnVuY3Rpb24uIFRha2VzIGEgcHJlZml4IHN0cmluZyBhbmQgb3B0aW9ucyBvYmplY3Rcblx0YW5kIHVzZXMgYW4gaW5qZWN0ZWQgYGxvZ2dlcmAgaWYgcHJvdmlkZWQsIGVsc2UgZmFsbHMgYmFjayB0b1xuXHRNZXRlb3IncyBgTG9nYCBwYWNrYWdlLlxuXHRXaWxsIHNlbmQgYSBsb2cgb2JqZWN0IHRvIHRoZSBpbmplY3RlZCBsb2dnZXIsIG9uIHRoZSBmb2xsb3dpbmcgZm9ybTpcblx0XHRtZXNzYWdlOiBTdHJpbmdcblx0XHRsZXZlbDogU3RyaW5nIChpbmZvLCB3YXJuLCBlcnJvciwgZGVidWcpXG5cdFx0dGFnOiAnTWlncmF0aW9ucydcbiovXG5mdW5jdGlvbiBjcmVhdGVMb2dnZXIocHJlZml4KSB7XG5cdGNoZWNrKHByZWZpeCwgU3RyaW5nKTtcblxuXHQvLyBSZXR1cm4gbm9vcCBpZiBsb2dnaW5nIGlzIGRpc2FibGVkLlxuXHRpZiAoTWlncmF0aW9ucy5vcHRpb25zLmxvZyA9PT0gZmFsc2UpIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7fTtcblx0fVxuXG5cdHJldHVybiBmdW5jdGlvbihsZXZlbCwgbWVzc2FnZSkge1xuXHRcdGNoZWNrKGxldmVsLCBNYXRjaC5PbmVPZignaW5mbycsICdlcnJvcicsICd3YXJuJywgJ2RlYnVnJykpO1xuXHRcdGNoZWNrKG1lc3NhZ2UsIE1hdGNoLk9uZU9mKFN0cmluZywgW1N0cmluZ10pKTtcblxuXHRcdGNvbnN0IGxvZ2dlciA9IE1pZ3JhdGlvbnMub3B0aW9ucyAmJiBNaWdyYXRpb25zLm9wdGlvbnMubG9nZ2VyO1xuXG5cdFx0aWYgKGxvZ2dlciAmJiBfLmlzRnVuY3Rpb24obG9nZ2VyKSkge1xuXG5cdFx0XHRsb2dnZXIoe1xuXHRcdFx0XHRsZXZlbCxcblx0XHRcdFx0bWVzc2FnZSxcblx0XHRcdFx0dGFnOiBwcmVmaXgsXG5cdFx0XHR9KTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRMb2dbbGV2ZWxdKHtcblx0XHRcdFx0bWVzc2FnZTogYCR7IHByZWZpeCB9OiAkeyBtZXNzYWdlIH1gLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xufVxuXG4vLyBjb2xsZWN0aW9uIGhvbGRpbmcgdGhlIGNvbnRyb2wgcmVjb3JkXG5cbmNvbnN0IGxvZyA9IGNyZWF0ZUxvZ2dlcignTWlncmF0aW9ucycpO1xuXG5bJ2luZm8nLCAnd2FybicsICdlcnJvcicsICdkZWJ1ZyddLmZvckVhY2goZnVuY3Rpb24obGV2ZWwpIHtcblx0bG9nW2xldmVsXSA9IF8ucGFydGlhbChsb2csIGxldmVsKTtcbn0pO1xuXG4vLyBpZiAocHJvY2Vzcy5lbnYuTUlHUkFURSlcbi8vICAgTWlncmF0aW9ucy5taWdyYXRlVG8ocHJvY2Vzcy5lbnYuTUlHUkFURSk7XG5cbi8vIEFkZCBhIG5ldyBtaWdyYXRpb246XG4vLyB7dXA6IGZ1bmN0aW9uICpyZXF1aXJlZFxuLy8gIHZlcnNpb246IE51bWJlciAqcmVxdWlyZWRcbi8vICBkb3duOiBmdW5jdGlvbiAqb3B0aW9uYWxcbi8vICBuYW1lOiBTdHJpbmcgKm9wdGlvbmFsXG4vLyB9XG5NaWdyYXRpb25zLmFkZCA9IGZ1bmN0aW9uKG1pZ3JhdGlvbikge1xuXHRpZiAodHlwZW9mIG1pZ3JhdGlvbi51cCAhPT0gJ2Z1bmN0aW9uJykgeyB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdNaWdyYXRpb24gbXVzdCBzdXBwbHkgYW4gdXAgZnVuY3Rpb24uJyk7IH1cblxuXHRpZiAodHlwZW9mIG1pZ3JhdGlvbi52ZXJzaW9uICE9PSAnbnVtYmVyJykgeyB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdNaWdyYXRpb24gbXVzdCBzdXBwbHkgYSB2ZXJzaW9uIG51bWJlci4nKTsgfVxuXG5cdGlmIChtaWdyYXRpb24udmVyc2lvbiA8PSAwKSB7IHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ01pZ3JhdGlvbiB2ZXJzaW9uIG11c3QgYmUgZ3JlYXRlciB0aGFuIDAnKTsgfVxuXG5cdC8vIEZyZWV6ZSB0aGUgbWlncmF0aW9uIG9iamVjdCB0byBtYWtlIGl0IGhlcmVhZnRlciBpbW11dGFibGVcblx0T2JqZWN0LmZyZWV6ZShtaWdyYXRpb24pO1xuXG5cdHRoaXMuX2xpc3QucHVzaChtaWdyYXRpb24pO1xuXHR0aGlzLl9saXN0ID0gXy5zb3J0QnkodGhpcy5fbGlzdCwgZnVuY3Rpb24obSkge1xuXHRcdHJldHVybiBtLnZlcnNpb247XG5cdH0pO1xufTtcblxuLy8gQXR0ZW1wdHMgdG8gcnVuIHRoZSBtaWdyYXRpb25zIHVzaW5nIGNvbW1hbmQgaW4gdGhlIGZvcm0gb2Y6XG4vLyBlLmcgJ2xhdGVzdCcsICdsYXRlc3QsZXhpdCcsIDJcbi8vIHVzZSAnWFgscmVydW4nIHRvIHJlLXJ1biB0aGUgbWlncmF0aW9uIGF0IHRoYXQgdmVyc2lvblxuTWlncmF0aW9ucy5taWdyYXRlVG8gPSBmdW5jdGlvbihjb21tYW5kKSB7XG5cdGlmIChfLmlzVW5kZWZpbmVkKGNvbW1hbmQpIHx8IGNvbW1hbmQgPT09ICcnIHx8IHRoaXMuX2xpc3QubGVuZ3RoID09PSAwKSB7IHRocm93IG5ldyBFcnJvcihgQ2Fubm90IG1pZ3JhdGUgdXNpbmcgaW52YWxpZCBjb21tYW5kOiAkeyBjb21tYW5kIH1gKTsgfVxuXG5cdGxldCB2ZXJzaW9uO1xuXHRsZXQgc3ViY29tbWFuZHM7XG5cdGlmICh0eXBlb2YgY29tbWFuZCA9PT0gJ251bWJlcicpIHtcblx0XHR2ZXJzaW9uID0gY29tbWFuZDtcblx0fSBlbHNlIHtcblx0XHR2ZXJzaW9uID0gY29tbWFuZC5zcGxpdCgnLCcpWzBdO1xuXHRcdHN1YmNvbW1hbmRzID0gY29tbWFuZC5zcGxpdCgnLCcpLnNsaWNlKDEpO1xuXHR9XG5cblx0Y29uc3QgeyBtYXhBdHRlbXB0cywgcmV0cnlJbnRlcnZhbCB9ID0gTWlncmF0aW9ucy5vcHRpb25zO1xuXHRsZXQgbWlncmF0ZWQ7XG5cdGZvciAobGV0IGF0dGVtcHRzID0gMTsgYXR0ZW1wdHMgPD0gbWF4QXR0ZW1wdHM7IGF0dGVtcHRzKyspIHtcblx0XHRpZiAodmVyc2lvbiA9PT0gJ2xhdGVzdCcpIHtcblx0XHRcdG1pZ3JhdGVkID0gdGhpcy5fbWlncmF0ZVRvKF8ubGFzdCh0aGlzLl9saXN0KS52ZXJzaW9uKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bWlncmF0ZWQgPSB0aGlzLl9taWdyYXRlVG8ocGFyc2VJbnQodmVyc2lvbiksIChzdWJjb21tYW5kcy5pbmNsdWRlcygncmVydW4nKSkpO1xuXHRcdH1cblx0XHRpZiAobWlncmF0ZWQpIHtcblx0XHRcdGJyZWFrO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsZXQgd2lsbFJldHJ5O1xuXHRcdFx0aWYgKGF0dGVtcHRzIDwgbWF4QXR0ZW1wdHMpIHtcblx0XHRcdFx0d2lsbFJldHJ5ID0gYCBUcnlpbmcgYWdhaW4gaW4gJHsgcmV0cnlJbnRlcnZhbCB9IHNlY29uZHMuYDtcblx0XHRcdFx0TWV0ZW9yLl9zbGVlcEZvck1zKHJldHJ5SW50ZXJ2YWwgKiAxMDAwKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHdpbGxSZXRyeSA9ICcnO1xuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coYE5vdCBtaWdyYXRpbmcsIGNvbnRyb2wgaXMgbG9ja2VkLiBBdHRlbXB0ICR7IGF0dGVtcHRzIH0vJHsgbWF4QXR0ZW1wdHMgfS4keyB3aWxsUmV0cnkgfWAueWVsbG93KTtcblx0XHR9XG5cdH1cblx0aWYgKCFtaWdyYXRlZCkge1xuXHRcdGNvbnN0IGNvbnRyb2wgPSB0aGlzLl9nZXRDb250cm9sKCk7IC8vIFNpZGUgZWZmZWN0OiB1cHNlcnRzIGNvbnRyb2wgZG9jdW1lbnQuXG5cdFx0Y29uc29sZS5sb2cobWFrZUFCb3goW1xuXHRcdFx0J0VSUk9SISBTRVJWRVIgU1RPUFBFRCcsXG5cdFx0XHQnJyxcblx0XHRcdCdZb3VyIGRhdGFiYXNlIG1pZ3JhdGlvbiBjb250cm9sIGlzIGxvY2tlZC4nLFxuXHRcdFx0J1BsZWFzZSBtYWtlIHN1cmUgeW91IGFyZSBydW5uaW5nIHRoZSBsYXRlc3QgdmVyc2lvbiBhbmQgdHJ5IGFnYWluLicsXG5cdFx0XHQnSWYgdGhlIHByb2JsZW0gcGVyc2lzdHMsIHBsZWFzZSBjb250YWN0IHN1cHBvcnQuJyxcblx0XHRcdCcnLFxuXHRcdFx0YFRoaXMgUm9ja2V0LkNoYXQgdmVyc2lvbjogJHsgUm9ja2V0Q2hhdC5JbmZvLnZlcnNpb24gfWAsXG5cdFx0XHRgRGF0YWJhc2UgbG9ja2VkIGF0IHZlcnNpb246ICR7IGNvbnRyb2wudmVyc2lvbiB9YCxcblx0XHRcdGBEYXRhYmFzZSB0YXJnZXQgdmVyc2lvbjogJHsgdmVyc2lvbiA9PT0gJ2xhdGVzdCcgPyBfLmxhc3QodGhpcy5fbGlzdCkudmVyc2lvbiA6IHZlcnNpb24gfWAsXG5cdFx0XHQnJyxcblx0XHRcdGBDb21taXQ6ICR7IFJvY2tldENoYXQuSW5mby5jb21taXQuaGFzaCB9YCxcblx0XHRcdGBEYXRlOiAkeyBSb2NrZXRDaGF0LkluZm8uY29tbWl0LmRhdGUgfWAsXG5cdFx0XHRgQnJhbmNoOiAkeyBSb2NrZXRDaGF0LkluZm8uY29tbWl0LmJyYW5jaCB9YCxcblx0XHRcdGBUYWc6ICR7IFJvY2tldENoYXQuSW5mby5jb21taXQudGFnIH1gLFxuXHRcdF0pKTtcblx0XHRwcm9jZXNzLmV4aXQoMSk7XG5cdH1cblxuXHQvLyByZW1lbWJlciB0byBydW4gbWV0ZW9yIHdpdGggLS1vbmNlIG90aGVyd2lzZSBpdCB3aWxsIHJlc3RhcnRcblx0aWYgKHN1YmNvbW1hbmRzLmluY2x1ZGVzKCdleGl0JykpIHsgcHJvY2Vzcy5leGl0KDApOyB9XG59O1xuXG4vLyBqdXN0IHJldHVybnMgdGhlIGN1cnJlbnQgdmVyc2lvblxuTWlncmF0aW9ucy5nZXRWZXJzaW9uID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLl9nZXRDb250cm9sKCkudmVyc2lvbjtcbn07XG5cbi8vIG1pZ3JhdGVzIHRvIHRoZSBzcGVjaWZpYyB2ZXJzaW9uIHBhc3NlZCBpblxuTWlncmF0aW9ucy5fbWlncmF0ZVRvID0gZnVuY3Rpb24odmVyc2lvbiwgcmVydW4pIHtcblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdGNvbnN0IGNvbnRyb2wgPSB0aGlzLl9nZXRDb250cm9sKCk7IC8vIFNpZGUgZWZmZWN0OiB1cHNlcnRzIGNvbnRyb2wgZG9jdW1lbnQuXG5cdGxldCBjdXJyZW50VmVyc2lvbiA9IGNvbnRyb2wudmVyc2lvbjtcblxuXHRpZiAobG9jaygpID09PSBmYWxzZSkge1xuXHRcdC8vIGxvZy5pbmZvKCdOb3QgbWlncmF0aW5nLCBjb250cm9sIGlzIGxvY2tlZC4nKTtcblx0XHQvLyBXYXJuaW5nXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0aWYgKHJlcnVuKSB7XG5cdFx0bG9nLmluZm8oYFJlcnVubmluZyB2ZXJzaW9uICR7IHZlcnNpb24gfWApO1xuXHRcdG1pZ3JhdGUoJ3VwJywgdGhpcy5fZmluZEluZGV4QnlWZXJzaW9uKHZlcnNpb24pKTtcblx0XHRsb2cuaW5mbygnRmluaXNoZWQgbWlncmF0aW5nLicpO1xuXHRcdHVubG9jaygpO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0aWYgKGN1cnJlbnRWZXJzaW9uID09PSB2ZXJzaW9uKSB7XG5cdFx0aWYgKHRoaXMub3B0aW9ucy5sb2dJZkxhdGVzdCkge1xuXHRcdFx0bG9nLmluZm8oYE5vdCBtaWdyYXRpbmcsIGFscmVhZHkgYXQgdmVyc2lvbiAkeyB2ZXJzaW9uIH1gKTtcblx0XHR9XG5cdFx0dW5sb2NrKCk7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRjb25zdCBzdGFydElkeCA9IHRoaXMuX2ZpbmRJbmRleEJ5VmVyc2lvbihjdXJyZW50VmVyc2lvbik7XG5cdGNvbnN0IGVuZElkeCA9IHRoaXMuX2ZpbmRJbmRleEJ5VmVyc2lvbih2ZXJzaW9uKTtcblxuXHQvLyBsb2cuaW5mbygnc3RhcnRJZHg6JyArIHN0YXJ0SWR4ICsgJyBlbmRJZHg6JyArIGVuZElkeCk7XG5cdGxvZy5pbmZvKGBNaWdyYXRpbmcgZnJvbSB2ZXJzaW9uICR7IHRoaXMuX2xpc3Rbc3RhcnRJZHhdLnZlcnNpb24gfSAtPiAkeyB0aGlzLl9saXN0W2VuZElkeF0udmVyc2lvbiB9YCk7XG5cblx0Ly8gcnVuIHRoZSBhY3R1YWwgbWlncmF0aW9uXG5cdGZ1bmN0aW9uIG1pZ3JhdGUoZGlyZWN0aW9uLCBpZHgpIHtcblx0XHRjb25zdCBtaWdyYXRpb24gPSBzZWxmLl9saXN0W2lkeF07XG5cblx0XHRpZiAodHlwZW9mIG1pZ3JhdGlvbltkaXJlY3Rpb25dICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHR1bmxvY2soKTtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoYENhbm5vdCBtaWdyYXRlICR7IGRpcmVjdGlvbiB9IG9uIHZlcnNpb24gJHsgbWlncmF0aW9uLnZlcnNpb24gfWApO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIG1heWJlTmFtZSgpIHtcblx0XHRcdHJldHVybiBtaWdyYXRpb24ubmFtZSA/IGAgKCR7IG1pZ3JhdGlvbi5uYW1lIH0pYCA6ICcnO1xuXHRcdH1cblxuXHRcdGxvZy5pbmZvKGBSdW5uaW5nICR7IGRpcmVjdGlvbiB9KCkgb24gdmVyc2lvbiAkeyBtaWdyYXRpb24udmVyc2lvbiB9JHsgbWF5YmVOYW1lKCkgfWApO1xuXG5cdFx0dHJ5IHtcblx0XHRcdG1pZ3JhdGlvbltkaXJlY3Rpb25dKG1pZ3JhdGlvbik7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5sb2cobWFrZUFCb3goW1xuXHRcdFx0XHQnRVJST1IhIFNFUlZFUiBTVE9QUEVEJyxcblx0XHRcdFx0JycsXG5cdFx0XHRcdCdZb3VyIGRhdGFiYXNlIG1pZ3JhdGlvbiBmYWlsZWQ6Jyxcblx0XHRcdFx0ZS5tZXNzYWdlLFxuXHRcdFx0XHQnJyxcblx0XHRcdFx0J1BsZWFzZSBtYWtlIHN1cmUgeW91IGFyZSBydW5uaW5nIHRoZSBsYXRlc3QgdmVyc2lvbiBhbmQgdHJ5IGFnYWluLicsXG5cdFx0XHRcdCdJZiB0aGUgcHJvYmxlbSBwZXJzaXN0cywgcGxlYXNlIGNvbnRhY3Qgc3VwcG9ydC4nLFxuXHRcdFx0XHQnJyxcblx0XHRcdFx0YFRoaXMgUm9ja2V0LkNoYXQgdmVyc2lvbjogJHsgUm9ja2V0Q2hhdC5JbmZvLnZlcnNpb24gfWAsXG5cdFx0XHRcdGBEYXRhYmFzZSBsb2NrZWQgYXQgdmVyc2lvbjogJHsgY29udHJvbC52ZXJzaW9uIH1gLFxuXHRcdFx0XHRgRGF0YWJhc2UgdGFyZ2V0IHZlcnNpb246ICR7IHZlcnNpb24gfWAsXG5cdFx0XHRcdCcnLFxuXHRcdFx0XHRgQ29tbWl0OiAkeyBSb2NrZXRDaGF0LkluZm8uY29tbWl0Lmhhc2ggfWAsXG5cdFx0XHRcdGBEYXRlOiAkeyBSb2NrZXRDaGF0LkluZm8uY29tbWl0LmRhdGUgfWAsXG5cdFx0XHRcdGBCcmFuY2g6ICR7IFJvY2tldENoYXQuSW5mby5jb21taXQuYnJhbmNoIH1gLFxuXHRcdFx0XHRgVGFnOiAkeyBSb2NrZXRDaGF0LkluZm8uY29tbWl0LnRhZyB9YCxcblx0XHRcdF0pKTtcblx0XHRcdHByb2Nlc3MuZXhpdCgxKTtcblx0XHR9XG5cdH1cblxuXHQvLyBSZXR1cm5zIHRydWUgaWYgbG9jayB3YXMgYWNxdWlyZWQuXG5cdGZ1bmN0aW9uIGxvY2soKSB7XG5cdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG5cdFx0Y29uc3QgZGF0ZU1pbnVzSW50ZXJ2YWwgPSBtb21lbnQoZGF0ZSkuc3VidHJhY3Qoc2VsZi5vcHRpb25zLmxvY2tFeHBpcmF0aW9uLCAnbWludXRlcycpLnRvRGF0ZSgpO1xuXHRcdGNvbnN0IGJ1aWxkID0gUm9ja2V0Q2hhdC5JbmZvID8gUm9ja2V0Q2hhdC5JbmZvLmJ1aWxkLmRhdGUgOiBkYXRlO1xuXG5cdFx0Ly8gVGhpcyBpcyBhdG9taWMuIFRoZSBzZWxlY3RvciBlbnN1cmVzIG9ubHkgb25lIGNhbGxlciBhdCBhIHRpbWUgd2lsbCBzZWVcblx0XHQvLyB0aGUgdW5sb2NrZWQgY29udHJvbCwgYW5kIGxvY2tpbmcgb2NjdXJzIGluIHRoZSBzYW1lIHVwZGF0ZSdzIG1vZGlmaWVyLlxuXHRcdC8vIEFsbCBvdGhlciBzaW11bHRhbmVvdXMgY2FsbGVycyB3aWxsIGdldCBmYWxzZSBiYWNrIGZyb20gdGhlIHVwZGF0ZS5cblx0XHRyZXR1cm4gc2VsZi5fY29sbGVjdGlvbi51cGRhdGUoe1xuXHRcdFx0X2lkOiAnY29udHJvbCcsXG5cdFx0XHQkb3I6IFt7XG5cdFx0XHRcdGxvY2tlZDogZmFsc2UsXG5cdFx0XHR9LCB7XG5cdFx0XHRcdGxvY2tlZEF0OiB7XG5cdFx0XHRcdFx0JGx0OiBkYXRlTWludXNJbnRlcnZhbCxcblx0XHRcdFx0fSxcblx0XHRcdH0sIHtcblx0XHRcdFx0YnVpbGRBdDoge1xuXHRcdFx0XHRcdCRuZTogYnVpbGQsXG5cdFx0XHRcdH0sXG5cdFx0XHR9XSxcblx0XHR9LCB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdGxvY2tlZDogdHJ1ZSxcblx0XHRcdFx0bG9ja2VkQXQ6IGRhdGUsXG5cdFx0XHRcdGJ1aWxkQXQ6IGJ1aWxkLFxuXHRcdFx0fSxcblx0XHR9KSA9PT0gMTtcblx0fVxuXG5cblx0Ly8gU2lkZSBlZmZlY3Q6IHNhdmVzIHZlcnNpb24uXG5cdGZ1bmN0aW9uIHVubG9jaygpIHtcblx0XHRzZWxmLl9zZXRDb250cm9sKHtcblx0XHRcdGxvY2tlZDogZmFsc2UsXG5cdFx0XHR2ZXJzaW9uOiBjdXJyZW50VmVyc2lvbixcblx0XHR9KTtcblx0fVxuXG5cdGlmIChjdXJyZW50VmVyc2lvbiA8IHZlcnNpb24pIHtcblx0XHRmb3IgKGxldCBpID0gc3RhcnRJZHg7IGkgPCBlbmRJZHg7IGkrKykge1xuXHRcdFx0bWlncmF0ZSgndXAnLCBpICsgMSk7XG5cdFx0XHRjdXJyZW50VmVyc2lvbiA9IHNlbGYuX2xpc3RbaSArIDFdLnZlcnNpb247XG5cdFx0XHRzZWxmLl9zZXRDb250cm9sKHtcblx0XHRcdFx0bG9ja2VkOiB0cnVlLFxuXHRcdFx0XHR2ZXJzaW9uOiBjdXJyZW50VmVyc2lvbixcblx0XHRcdH0pO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRmb3IgKGxldCBpID0gc3RhcnRJZHg7IGkgPiBlbmRJZHg7IGktLSkge1xuXHRcdFx0bWlncmF0ZSgnZG93bicsIGkpO1xuXHRcdFx0Y3VycmVudFZlcnNpb24gPSBzZWxmLl9saXN0W2kgLSAxXS52ZXJzaW9uO1xuXHRcdFx0c2VsZi5fc2V0Q29udHJvbCh7XG5cdFx0XHRcdGxvY2tlZDogdHJ1ZSxcblx0XHRcdFx0dmVyc2lvbjogY3VycmVudFZlcnNpb24sXG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXHR1bmxvY2soKTtcblx0bG9nLmluZm8oJ0ZpbmlzaGVkIG1pZ3JhdGluZy4nKTtcbn07XG5cbi8vIGdldHMgdGhlIGN1cnJlbnQgY29udHJvbCByZWNvcmQsIG9wdGlvbmFsbHkgY3JlYXRpbmcgaXQgaWYgbm9uLWV4aXN0YW50XG5NaWdyYXRpb25zLl9nZXRDb250cm9sID0gZnVuY3Rpb24oKSB7XG5cdGNvbnN0IGNvbnRyb2wgPSB0aGlzLl9jb2xsZWN0aW9uLmZpbmRPbmUoe1xuXHRcdF9pZDogJ2NvbnRyb2wnLFxuXHR9KTtcblxuXHRyZXR1cm4gY29udHJvbCB8fCB0aGlzLl9zZXRDb250cm9sKHtcblx0XHR2ZXJzaW9uOiAwLFxuXHRcdGxvY2tlZDogZmFsc2UsXG5cdH0pO1xufTtcblxuLy8gc2V0cyB0aGUgY29udHJvbCByZWNvcmRcbk1pZ3JhdGlvbnMuX3NldENvbnRyb2wgPSBmdW5jdGlvbihjb250cm9sKSB7XG5cdC8vIGJlIHF1aXRlIHN0cmljdFxuXHRjaGVjayhjb250cm9sLnZlcnNpb24sIE51bWJlcik7XG5cdGNoZWNrKGNvbnRyb2wubG9ja2VkLCBCb29sZWFuKTtcblxuXHR0aGlzLl9jb2xsZWN0aW9uLnVwZGF0ZSh7XG5cdFx0X2lkOiAnY29udHJvbCcsXG5cdH0sIHtcblx0XHQkc2V0OiB7XG5cdFx0XHR2ZXJzaW9uOiBjb250cm9sLnZlcnNpb24sXG5cdFx0XHRsb2NrZWQ6IGNvbnRyb2wubG9ja2VkLFxuXHRcdH0sXG5cdH0sIHtcblx0XHR1cHNlcnQ6IHRydWUsXG5cdH0pO1xuXG5cdHJldHVybiBjb250cm9sO1xufTtcblxuLy8gcmV0dXJucyB0aGUgbWlncmF0aW9uIGluZGV4IGluIF9saXN0IG9yIHRocm93cyBpZiBub3QgZm91bmRcbk1pZ3JhdGlvbnMuX2ZpbmRJbmRleEJ5VmVyc2lvbiA9IGZ1bmN0aW9uKHZlcnNpb24pIHtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLl9saXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0aWYgKHRoaXMuX2xpc3RbaV0udmVyc2lvbiA9PT0gdmVyc2lvbikgeyByZXR1cm4gaTsgfVxuXHR9XG5cblx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcihgQ2FuJ3QgZmluZCBtaWdyYXRpb24gdmVyc2lvbiAkeyB2ZXJzaW9uIH1gKTtcbn07XG5cbi8vIHJlc2V0IChtYWlubHkgaW50ZW5kZWQgZm9yIHRlc3RzKVxuTWlncmF0aW9ucy5fcmVzZXQgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5fbGlzdCA9IFt7XG5cdFx0dmVyc2lvbjogMCxcblx0XHR1cCgpIHt9LFxuXHR9XTtcblx0dGhpcy5fY29sbGVjdGlvbi5yZW1vdmUoe30pO1xufTtcblxuUm9ja2V0Q2hhdC5NaWdyYXRpb25zID0gTWlncmF0aW9ucztcbiJdfQ==
