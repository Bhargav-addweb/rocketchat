(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:nrr":{"nrr.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_nrr/nrr.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Template;
module.watch(require("meteor/templating"), {
  Template(v) {
    Template = v;
  }

}, 0);
let Blaze;
module.watch(require("meteor/blaze"), {
  Blaze(v) {
    Blaze = v;
  }

}, 1);
let HTML;
module.watch(require("meteor/htmljs"), {
  HTML(v) {
    HTML = v;
  }

}, 2);
let Spacebars;
module.watch(require("meteor/spacebars"), {
  Spacebars(v) {
    Spacebars = v;
  }

}, 3);
let Tracker;
module.watch(require("meteor/tracker"), {
  Tracker(v) {
    Tracker = v;
  }

}, 4);

Blaze.toHTMLWithDataNonReactive = function (content, data) {
  const makeCursorReactive = function (obj) {
    if (obj instanceof Meteor.Collection.Cursor) {
      return obj._depend({
        added: true,
        removed: true,
        changed: true
      });
    }
  };

  makeCursorReactive(data);

  if (data instanceof Spacebars.kw && Object.keys(data.hash).length > 0) {
    Object.keys(data.hash).forEach(key => {
      makeCursorReactive(data.hash[key]);
    });
    data = data.hash;
  }

  return Tracker.nonreactive(() => Blaze.toHTMLWithData(content, data));
};

Blaze.registerHelper('nrrargs', function (...args) {
  return {
    _arguments: args
  };
});

Blaze.renderNonReactive = function (templateName, data) {
  const {
    _arguments
  } = this.parentView.dataVar.get();
  [templateName, data] = _arguments;
  return Tracker.nonreactive(() => {
    const view = new Blaze.View('nrr', () => HTML.Raw(Blaze.toHTMLWithDataNonReactive(Template[templateName], data)));
    view.onViewReady(() => {
      const {
        onViewReady
      } = Template[templateName];
      return onViewReady && onViewReady.call(view, data);
    });

    view._onViewRendered(() => {
      const {
        onViewRendered
      } = Template[templateName];
      return onViewRendered && onViewRendered.call(view, data);
    });

    return view;
  });
};

Blaze.registerHelper('nrr', Blaze.Template('nrr', Blaze.renderNonReactive));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/rocketchat:nrr/nrr.js");

/* Exports */
Package._define("rocketchat:nrr", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_nrr.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpucnIvbnJyLmpzIl0sIm5hbWVzIjpbIlRlbXBsYXRlIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwidiIsIkJsYXplIiwiSFRNTCIsIlNwYWNlYmFycyIsIlRyYWNrZXIiLCJ0b0hUTUxXaXRoRGF0YU5vblJlYWN0aXZlIiwiY29udGVudCIsImRhdGEiLCJtYWtlQ3Vyc29yUmVhY3RpdmUiLCJvYmoiLCJNZXRlb3IiLCJDb2xsZWN0aW9uIiwiQ3Vyc29yIiwiX2RlcGVuZCIsImFkZGVkIiwicmVtb3ZlZCIsImNoYW5nZWQiLCJrdyIsIk9iamVjdCIsImtleXMiLCJoYXNoIiwibGVuZ3RoIiwiZm9yRWFjaCIsImtleSIsIm5vbnJlYWN0aXZlIiwidG9IVE1MV2l0aERhdGEiLCJyZWdpc3RlckhlbHBlciIsImFyZ3MiLCJfYXJndW1lbnRzIiwicmVuZGVyTm9uUmVhY3RpdmUiLCJ0ZW1wbGF0ZU5hbWUiLCJwYXJlbnRWaWV3IiwiZGF0YVZhciIsImdldCIsInZpZXciLCJWaWV3IiwiUmF3Iiwib25WaWV3UmVhZHkiLCJjYWxsIiwiX29uVmlld1JlbmRlcmVkIiwib25WaWV3UmVuZGVyZWQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxRQUFKO0FBQWFDLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxtQkFBUixDQUFiLEVBQTBDO0FBQUNILFdBQVNJLENBQVQsRUFBVztBQUFDSixlQUFTSSxDQUFUO0FBQVc7O0FBQXhCLENBQTFDLEVBQW9FLENBQXBFO0FBQXVFLElBQUlDLEtBQUo7QUFBVUosT0FBT0MsS0FBUCxDQUFhQyxRQUFRLGNBQVIsQ0FBYixFQUFxQztBQUFDRSxRQUFNRCxDQUFOLEVBQVE7QUFBQ0MsWUFBTUQsQ0FBTjtBQUFROztBQUFsQixDQUFyQyxFQUF5RCxDQUF6RDtBQUE0RCxJQUFJRSxJQUFKO0FBQVNMLE9BQU9DLEtBQVAsQ0FBYUMsUUFB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QixNQUFNTCxRQUFOLENBQWUsS0FBZixFQUFzQkssTUFBTTRCLGlCQUE1QixDQUE1QixFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X25yci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludCBuZXctY2FwOjAgKi9cblxuaW1wb3J0IHsgVGVtcGxhdGUgfSBmcm9tICdtZXRlb3IvdGVtcGxhdGluZyc7XG5pbXBvcnQgeyBCbGF6ZSB9IGZyb20gJ21ldGVvci9ibGF6ZSc7XG5pbXBvcnQgeyBIVE1MIH0gZnJvbSAnbWV0ZW9yL2h0bWxqcyc7XG5pbXBvcnQgeyBTcGFjZWJhcnMgfSBmcm9tICdtZXRlb3Ivc3BhY2ViYXJzJztcbmltcG9ydCB7IFRyYWNrZXIgfSBmcm9tICdtZXRlb3IvdHJhY2tlcic7XG5cbkJsYXplLnRvSFRNTFdpdGhEYXRhTm9uUmVhY3RpdmUgPSBmdW5jdGlvbihjb250ZW50LCBkYXRhKSB7XG5cdGNvbnN0IG1ha2VDdXJzb3JSZWFjdGl2ZSA9IGZ1bmN0aW9uKG9iaikge1xuXHRcdGlmIChvYmogaW5zdGFuY2VvZiBNZXRlb3IuQ29sbGVjdGlvbi5DdXJzb3IpIHtcblx0XHRcdHJldHVybiBvYmouX2RlcGVuZCh7XG5cdFx0XHRcdGFkZGVkOiB0cnVlLFxuXHRcdFx0XHRyZW1vdmVkOiB0cnVlLFxuXHRcdFx0XHRjaGFuZ2VkOiB0cnVlLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xuXG5cdG1ha2VDdXJzb3JSZWFjdGl2ZShkYXRhKTtcblxuXHRpZiAoZGF0YSBpbnN0YW5jZW9mIFNwYWNlYmFycy5rdyAmJiBPYmplY3Qua2V5cyhkYXRhLmhhc2gpLmxlbmd0aCA+IDApIHtcblx0XHRPYmplY3Qua2V5cyhkYXRhLmhhc2gpLmZvckVhY2goKGtleSkgPT4ge1xuXHRcdFx0bWFrZUN1cnNvclJlYWN0aXZlKGRhdGEuaGFzaFtrZXldKTtcblx0XHR9KTtcblxuXHRcdGRhdGEgPSBkYXRhLmhhc2g7XG5cdH1cblxuXHRyZXR1cm4gVHJhY2tlci5ub25yZWFjdGl2ZSgoKSA9PiBCbGF6ZS50b0hUTUxXaXRoRGF0YShjb250ZW50LCBkYXRhKSk7XG59O1xuXG5CbGF6ZS5yZWdpc3RlckhlbHBlcignbnJyYXJncycsIGZ1bmN0aW9uKC4uLmFyZ3MpIHtcblx0cmV0dXJuIHtcblx0XHRfYXJndW1lbnRzOiBhcmdzLFxuXHR9O1xufSk7XG5cbkJsYXplLnJlbmRlck5vblJlYWN0aXZlID0gZnVuY3Rpb24odGVtcGxhdGVOYW1lLCBkYXRhKSB7XG5cdGNvbnN0IHsgX2FyZ3VtZW50cyB9ID0gdGhpcy5wYXJlbnRWaWV3LmRhdGFWYXIuZ2V0KCk7XG5cblx0W3RlbXBsYXRlTmFtZSwgZGF0YV0gPSBfYXJndW1lbnRzO1xuXG5cdHJldHVybiBUcmFja2VyLm5vbnJlYWN0aXZlKCgpID0+IHtcblx0XHRjb25zdCB2aWV3ID0gbmV3IEJsYXplLlZpZXcoJ25ycicsICgpID0+IEhUTUwuUmF3KEJsYXplLnRvSFRNTFdpdGhEYXRhTm9uUmVhY3RpdmUoVGVtcGxhdGVbdGVtcGxhdGVOYW1lXSwgZGF0YSkpKTtcblxuXHRcdHZpZXcub25WaWV3UmVhZHkoKCkgPT4ge1xuXHRcdFx0Y29uc3QgeyBvblZpZXdSZWFkeSB9ID0gVGVtcGxhdGVbdGVtcGxhdGVOYW1lXTtcblx0XHRcdHJldHVybiBvblZpZXdSZWFkeSAmJiBvblZpZXdSZWFkeS5jYWxsKHZpZXcsIGRhdGEpO1xuXHRcdH0pO1xuXG5cdFx0dmlldy5fb25WaWV3UmVuZGVyZWQoKCkgPT4ge1xuXHRcdFx0Y29uc3QgeyBvblZpZXdSZW5kZXJlZCB9ID0gVGVtcGxhdGVbdGVtcGxhdGVOYW1lXTtcblx0XHRcdHJldHVybiBvblZpZXdSZW5kZXJlZCAmJiBvblZpZXdSZW5kZXJlZC5jYWxsKHZpZXcsIGRhdGEpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHZpZXc7XG5cdH0pO1xufTtcblxuQmxhemUucmVnaXN0ZXJIZWxwZXIoJ25ycicsIEJsYXplLlRlbXBsYXRlKCducnInLCBCbGF6ZS5yZW5kZXJOb25SZWFjdGl2ZSkpO1xuIl19
