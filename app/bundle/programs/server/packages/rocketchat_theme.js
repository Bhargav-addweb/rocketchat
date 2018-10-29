(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Logger = Package['rocketchat:logger'].Logger;
var SystemLogger = Package['rocketchat:logger'].SystemLogger;
var LoggerManager = Package['rocketchat:logger'].LoggerManager;
var ECMAScript = Package.ecmascript.ECMAScript;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var WebAppHashing = Package['webapp-hashing'].WebAppHashing;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:theme":{"server":{"server.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// packages/rocketchat_theme/server/server.js                                                                //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let less;
module.watch(require("less"), {
  default(v) {
    less = v;
  }

}, 1);
let Autoprefixer;
module.watch(require("less-plugin-autoprefix"), {
  default(v) {
    Autoprefixer = v;
  }

}, 2);
let crypto;
module.watch(require("crypto"), {
  default(v) {
    crypto = v;
  }

}, 3);
const logger = new Logger('rocketchat:theme', {
  methods: {
    stop_rendering: {
      type: 'info'
    }
  }
});
WebApp.rawConnectHandlers.use(function (req, res, next) {
  const path = req.url.split('?')[0];
  const prefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '';

  if (path === `${prefix}/__cordova/theme.css` || path === `${prefix}/theme.css`) {
    const css = RocketChat.theme.getCss();
    const hash = crypto.createHash('sha1').update(css).digest('hex');
    res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    res.setHeader('ETag', `"${hash}"`);
    res.write(css);
    return res.end();
  } else {
    return next();
  }
});
const {
  calculateClientHash
} = WebAppHashing;

WebAppHashing.calculateClientHash = function (manifest, includeFilter, runtimeConfigOverride) {
  const css = RocketChat.theme.getCss();

  if (css.trim() !== '') {
    const hash = crypto.createHash('sha1').update(css).digest('hex');

    let themeManifestItem = _.find(manifest, function (item) {
      return item.path === 'app/theme.css';
    });

    if (themeManifestItem == null) {
      themeManifestItem = {};
      manifest.push(themeManifestItem);
    }

    themeManifestItem.path = 'app/theme.css';
    themeManifestItem.type = 'css';
    themeManifestItem.cacheable = true;
    themeManifestItem.where = 'client';
    themeManifestItem.url = `/theme.css?${hash}`;
    themeManifestItem.size = css.length;
    themeManifestItem.hash = hash;
  }

  return calculateClientHash.call(this, manifest, includeFilter, runtimeConfigOverride);
};

RocketChat.theme = new class {
  constructor() {
    this.variables = {};
    this.packageCallbacks = [];
    this.files = ['server/colors.less'];
    this.customCSS = '';
    RocketChat.settings.add('css', '');
    RocketChat.settings.addGroup('Layout');
    RocketChat.settings.onload('css', Meteor.bindEnvironment((key, value, initialLoad) => {
      if (!initialLoad) {
        Meteor.startup(function () {
          process.emit('message', {
            refresh: 'client'
          });
        });
      }
    }));
    this.compileDelayed = _.debounce(Meteor.bindEnvironment(this.compile.bind(this)), 100);
    Meteor.startup(() => {
      RocketChat.settings.onAfterInitialLoad(() => {
        RocketChat.settings.get(/^theme-./, Meteor.bindEnvironment((key, value) => {
          if (key === 'theme-custom-css' && value != null) {
            this.customCSS = value;
          } else {
            const name = key.replace(/^theme-[a-z]+-/, '');

            if (this.variables[name] != null) {
              this.variables[name].value = value;
            }
          }

          this.compileDelayed();
        }));
      });
    });
  }

  compile() {
    let content = [this.getVariablesAsLess()];
    content.push(...this.files.map(name => Assets.getText(name)));
    content.push(...this.packageCallbacks.map(name => name()));
    content.push(this.customCSS);
    content = content.join('\n');
    const options = {
      compress: true,
      plugins: [new Autoprefixer()]
    };
    const start = Date.now();
    return less.render(content, options, function (err, data) {
      logger.stop_rendering(Date.now() - start);

      if (err != null) {
        return console.log(err);
      }

      RocketChat.settings.updateById('css', data.css);
      return Meteor.startup(function () {
        return Meteor.setTimeout(function () {
          return process.emit('message', {
            refresh: 'client'
          });
        }, 200);
      });
    });
  }

  addColor(name, value, section, properties) {
    const config = {
      group: 'Colors',
      type: 'color',
      editor: 'color',
      public: true,
      properties,
      section
    };
    return RocketChat.settings.add(`theme-color-${name}`, value, config);
  }

  addVariable(type, name, value, section, persist = true, editor, allowedTypes, property) {
    this.variables[name] = {
      type,
      value
    };

    if (persist) {
      const config = {
        group: 'Layout',
        type,
        editor: editor || type,
        section,
        public: true,
        allowedTypes,
        property
      };
      return RocketChat.settings.add(`theme-${type}-${name}`, value, config);
    }
  }

  addPublicColor(name, value, section, editor = 'color', property) {
    return this.addVariable('color', name, value, section, true, editor, ['color', 'expression'], property);
  }

  addPublicFont(name, value) {
    return this.addVariable('font', name, value, 'Fonts', true);
  }

  getVariablesAsObject() {
    return Object.keys(this.variables).reduce((obj, name) => {
      obj[name] = this.variables[name].value;
      return obj;
    }, {});
  }

  getVariablesAsLess() {
    return Object.keys(this.variables).map(name => {
      const variable = this.variables[name];
      return `@${name}: ${variable.value};`;
    }).join('\n');
  }

  addPackageAsset(cb) {
    this.packageCallbacks.push(cb);
    return this.compileDelayed();
  }

  getCss() {
    return RocketChat.settings.get('css') || '';
  }

}();
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"variables.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// packages/rocketchat_theme/server/variables.js                                                             //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
// TODO: Define registers/getters/setters for packages to work with established
// 			heirarchy of colors instead of making duplicate definitions
// TODO: Settings pages to show simple separation of major/minor/addon colors
// TODO: Get major colours as swatches for minor colors in minicolors plugin
// TODO: Minicolors settings to use rgb for alphas, hex otherwise
// TODO: Add setting toggle to use defaults for minor colours and hide settings
// New colors, used for shades on solid backgrounds
// Defined range of transparencies reduces random colour variances
// Major colors form the core of the scheme
// Names changed to reflect usage, comments show pre-refactor names
const reg = /--(rc-color-.*?): (.*?);/igm;
const colors = [...Assets.getText('client/imports/general/variables.css').match(reg)].map(color => {
  const [name, value] = color.split(': ');
  return [name.replace('--', ''), value.replace(';', '')];
});
colors.forEach(([key, color]) => {
  if (/var/.test(color)) {
    const [, value] = color.match(/var\(--(.*?)\)/i);
    return RocketChat.theme.addPublicColor(key, value, 'Colors', 'expression');
  }

  RocketChat.theme.addPublicColor(key, color, 'Colors');
});
const majorColors = {
  'content-background-color': '#FFFFFF',
  'primary-background-color': '#04436A',
  'primary-font-color': '#444444',
  'primary-action-color': '#13679A',
  // was action-buttons-color
  'secondary-background-color': '#F4F4F4',
  'secondary-font-color': '#A0A0A0',
  'secondary-action-color': '#DDDDDD',
  'component-color': '#EAEAEA',
  'success-color': '#4dff4d',
  'pending-color': '#FCB316',
  'error-color': '#BC2031',
  'selection-color': '#02ACEC',
  'attention-color': '#9C27B0'
}; // Minor colours implement major colours by default, but can be overruled

const minorColors = {
  'tertiary-background-color': '@component-color',
  'tertiary-font-color': '@transparent-lightest',
  'link-font-color': '@primary-action-color',
  'info-font-color': '@secondary-font-color',
  'custom-scrollbar-color': '@transparent-darker',
  'status-online': '@success-color',
  'status-away': '@pending-color',
  'status-busy': '@error-color',
  'status-offline': '@transparent-darker'
}; // Bulk-add settings for color scheme

Object.keys(majorColors).forEach(key => {
  const value = majorColors[key];
  RocketChat.theme.addPublicColor(key, value, 'Old Colors');
});
Object.keys(minorColors).forEach(key => {
  const value = minorColors[key];
  RocketChat.theme.addPublicColor(key, value, 'Old Colors (minor)', 'expression');
});
RocketChat.theme.addPublicFont('body-font-family', '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, \'Helvetica Neue\', \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Meiryo UI\', Arial, sans-serif');
RocketChat.settings.add('theme-custom-css', '', {
  group: 'Layout',
  type: 'code',
  code: 'text/css',
  multiline: true,
  section: 'Custom CSS',
  public: true
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:theme/server/server.js");
require("/node_modules/meteor/rocketchat:theme/server/variables.js");

/* Exports */
Package._define("rocketchat:theme");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_theme.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp0aGVtZS9zZXJ2ZXIvc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnRoZW1lL3NlcnZlci92YXJpYWJsZXMuanMiXSwibmFtZXMiOlsiXyIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwibGVzcyIsIkF1dG9wcmVmaXhlciIsImNyeXB0byIsImxvZ2dlciIsIkxvZ2dlciIsIm1ldGhvZHMiLCJzdG9wX3JlbmRlcmluZyIsInR5cGUiLCJXZWJBcHAiLCJyYXdDb25uZWN0SGFuZGxlcnMiLCJ1c2UiLCJyZXEiLCJyZXMiLCJuZXh0IiwicGF0aCIsInVybCIsInNwbGl0IiwicHJlZml4IiwiX19tZXRlb3JfcnVudGltZV9jb25maWdfXyIsIlJPT1RfVVJMX1BBVEhfUFJFRklYIiwiY3NzIiwiUm9ja2V0Q2hhdCIsInRoZW1lIiwiZ2V0Q3NzIiwiaGFzaCIsImNyZWF0ZUhhc2giLCJ1cGRhdGUiLCJkaWdlc3QiLCJzZXRIZWFkZXIiLCJ3cml0ZSIsImVuZCIsImNhbGN1bGF0ZUNsaWVudEhhc2giLCJXZWJBcHBIYXNoaW5nIiwibWFuaWZlc3QiLCJpbmNsdWRlRmlsdGVyIiwicnVudGltZUNvbmZpZ092ZXJyaWRlIiwidHJpbSIsInRoZW1lTWFuaWZlc3RJdGVtIiwiZmluZCIsIml0ZW0iLCJwdXNoIiwiY2FjaGVhYmxlIiwid2hlcmUiLCJzaXplIiwibGVuZ3RoIiwiY2FsbCIsImNvbnN0cnVjdG9yIiwidmFyaWFibGVzIiwicGFja2FnZUNhbGxiYWNrcyIsImZpbGVzIiwiY3VzdG9tQ1NTIiwic2V0dGluZ3MiLCJhZGQiLCJhZGRHcm91cCIsIm9ubG9hZCIsIk1ldGVvciIsImJpbmRFbnZpcm9ubWVudCIsImtleSIsInZhbHVlIiwiaW5pdGlhbExvYWQiLCJzdGFydHVwIiwicHJvY2VzcyIsImVtaXQiLCJyZWZyZXNoIiwiY29tcGlsZURlbGF5ZWQiLCJkZWJvdW5jZSIsImNvbXBpbGUiLCJiaW5kIiwib25BZnRlckluaXRpYWxMb2FkIiwiZ2V0IiwibmFtZSIsInJlcGxhY2UiLCJjb250ZW50IiwiZ2V0VmFyaWFibGVzQXNMZXNzIiwibWFwIiwiQXNzZXRzIiwiZ2V0VGV4dCIsImpvaW4iLCJvcHRpb25zIiwiY29tcHJlc3MiLCJwbHVnaW5zIiwic3RhcnQiLCJEYXRlIiwibm93IiwicmVuZGVyIiwiZXJyIiwiZGF0YSIsImNvbnNvbGUiLCJsb2ciLCJ1cGRhdGVCeUlkIiwic2V0VGltZW91dCIsImFkZENvbG9yIiwic2VjdGlvbiIsInByb3BlcnRpZXMiLCJjb25maWciLCJncm91cCIsImVkaXRvciIsInB1YmxpYyIsImFkZFZhcmlhYmxlIiwicGVyc2lzdCIsImFsbG93ZWRUeXBlcyIsInByb3BlcnR5IiwiYWRkUHVibGljQ29sb3IiLCJhZGRQdWJsaWNGb250IiwiZ2V0VmFyaWFibGVzQXNPYmplY3QiLCJPYmplY3QiLCJrZXlzIiwicmVkdWNlIiwib2JqIiwidmFyaWFibGUiLCJhZGRQYWNrYWdlQXNzZXQiLCJjYiIsInJlZyIsImNvbG9ycyIsIm1hdGNoIiwiY29sb3IiLCJmb3JFYWNoIiwidGVzdCIsIm1ham9yQ29sb3JzIiwibWlub3JDb2xvcnMiLCJjb2RlIiwibXVsdGlsaW5lIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLENBQUo7O0FBQU1DLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLFFBQUVLLENBQUY7QUFBSTs7QUFBaEIsQ0FBbkMsRUFBcUQsQ0FBckQ7QUFBd0QsSUFBSUMsSUFBSjtBQUFTTCxPQUFPQyxLQUFQLENBQWFDLFFBQVEsTUFBUixDQUFiLEVBQTZCO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDQyxXQUFLRCxDQUFMO0FBQU87O0FBQW5CLENBQTdCLEVBQWtELENB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QVgsQ0FBaUJpRixhQUFqQixDQUErQixrQkFBL0IsRUFBbUQsME1BQW5EO0FBRUFsRixXQUFXOEIsUUFBWCxDQUFvQkMsR0FBcEIsQ0FBd0Isa0JBQXhCLEVBQTRDLEVBQTVDLEVBQWdEO0FBQy9DMkMsU0FBTyxRQUR3QztBQUUvQ3hGLFFBQU0sTUFGeUM7QUFHL0NpSCxRQUFNLFVBSHlDO0FBSS9DQyxhQUFXLElBSm9DO0FBSy9DN0IsV0FBUyxZQUxzQztBQU0vQ0ssVUFBUTtBQU51QyxDQUFoRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X3RoZW1lLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFscyBXZWJBcHBIYXNoaW5nICovXG5cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IGxlc3MgZnJvbSAnbGVzcyc7XG5pbXBvcnQgQXV0b3ByZWZpeGVyIGZyb20gJ2xlc3MtcGx1Z2luLWF1dG9wcmVmaXgnO1xuaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xuXG5jb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCdyb2NrZXRjaGF0OnRoZW1lJywge1xuXHRtZXRob2RzOiB7XG5cdFx0c3RvcF9yZW5kZXJpbmc6IHtcblx0XHRcdHR5cGU6ICdpbmZvJyxcblx0XHR9LFxuXHR9LFxufSk7XG5cbldlYkFwcC5yYXdDb25uZWN0SGFuZGxlcnMudXNlKGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG5cdGNvbnN0IHBhdGggPSByZXEudXJsLnNwbGl0KCc/JylbMF07XG5cdGNvbnN0IHByZWZpeCA9IF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVggfHwgJyc7XG5cdGlmIChwYXRoID09PSBgJHsgcHJlZml4IH0vX19jb3Jkb3ZhL3RoZW1lLmNzc2AgfHwgcGF0aCA9PT0gYCR7IHByZWZpeCB9L3RoZW1lLmNzc2ApIHtcblx0XHRjb25zdCBjc3MgPSBSb2NrZXRDaGF0LnRoZW1lLmdldENzcygpO1xuXHRcdGNvbnN0IGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMScpLnVwZGF0ZShjc3MpLmRpZ2VzdCgnaGV4Jyk7XG5cdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ3RleHQvY3NzOyBjaGFyc2V0PVVURi04Jyk7XG5cdFx0cmVzLnNldEhlYWRlcignRVRhZycsIGBcIiR7IGhhc2ggfVwiYCk7XG5cdFx0cmVzLndyaXRlKGNzcyk7XG5cdFx0cmV0dXJuIHJlcy5lbmQoKTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gbmV4dCgpO1xuXHR9XG59KTtcblxuY29uc3QgeyBjYWxjdWxhdGVDbGllbnRIYXNoIH0gPSBXZWJBcHBIYXNoaW5nO1xuXG5XZWJBcHBIYXNoaW5nLmNhbGN1bGF0ZUNsaWVudEhhc2ggPSBmdW5jdGlvbihtYW5pZmVzdCwgaW5jbHVkZUZpbHRlciwgcnVudGltZUNvbmZpZ092ZXJyaWRlKSB7XG5cdGNvbnN0IGNzcyA9IFJvY2tldENoYXQudGhlbWUuZ2V0Q3NzKCk7XG5cdGlmIChjc3MudHJpbSgpICE9PSAnJykge1xuXHRcdGNvbnN0IGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMScpLnVwZGF0ZShjc3MpLmRpZ2VzdCgnaGV4Jyk7XG5cdFx0bGV0IHRoZW1lTWFuaWZlc3RJdGVtID0gXy5maW5kKG1hbmlmZXN0LCBmdW5jdGlvbihpdGVtKSB7XG5cdFx0XHRyZXR1cm4gaXRlbS5wYXRoID09PSAnYXBwL3RoZW1lLmNzcyc7XG5cdFx0fSk7XG5cdFx0aWYgKHRoZW1lTWFuaWZlc3RJdGVtID09IG51bGwpIHtcblx0XHRcdHRoZW1lTWFuaWZlc3RJdGVtID0ge307XG5cdFx0XHRtYW5pZmVzdC5wdXNoKHRoZW1lTWFuaWZlc3RJdGVtKTtcblx0XHR9XG5cdFx0dGhlbWVNYW5pZmVzdEl0ZW0ucGF0aCA9ICdhcHAvdGhlbWUuY3NzJztcblx0XHR0aGVtZU1hbmlmZXN0SXRlbS50eXBlID0gJ2Nzcyc7XG5cdFx0dGhlbWVNYW5pZmVzdEl0ZW0uY2FjaGVhYmxlID0gdHJ1ZTtcblx0XHR0aGVtZU1hbmlmZXN0SXRlbS53aGVyZSA9ICdjbGllbnQnO1xuXHRcdHRoZW1lTWFuaWZlc3RJdGVtLnVybCA9IGAvdGhlbWUuY3NzPyR7IGhhc2ggfWA7XG5cdFx0dGhlbWVNYW5pZmVzdEl0ZW0uc2l6ZSA9IGNzcy5sZW5ndGg7XG5cdFx0dGhlbWVNYW5pZmVzdEl0ZW0uaGFzaCA9IGhhc2g7XG5cdH1cblx0cmV0dXJuIGNhbGN1bGF0ZUNsaWVudEhhc2guY2FsbCh0aGlzLCBtYW5pZmVzdCwgaW5jbHVkZUZpbHRlciwgcnVudGltZUNvbmZpZ092ZXJyaWRlKTtcbn07XG5cblJvY2tldENoYXQudGhlbWUgPSBuZXcgY2xhc3Mge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR0aGlzLnZhcmlhYmxlcyA9IHt9O1xuXHRcdHRoaXMucGFja2FnZUNhbGxiYWNrcyA9IFtdO1xuXHRcdHRoaXMuZmlsZXMgPSBbJ3NlcnZlci9jb2xvcnMubGVzcyddO1xuXHRcdHRoaXMuY3VzdG9tQ1NTID0gJyc7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ2NzcycsICcnKTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdMYXlvdXQnKTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLm9ubG9hZCgnY3NzJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoa2V5LCB2YWx1ZSwgaW5pdGlhbExvYWQpID0+IHtcblx0XHRcdGlmICghaW5pdGlhbExvYWQpIHtcblx0XHRcdFx0TWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cHJvY2Vzcy5lbWl0KCdtZXNzYWdlJywge1xuXHRcdFx0XHRcdFx0cmVmcmVzaDogJ2NsaWVudCcsXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pKTtcblx0XHR0aGlzLmNvbXBpbGVEZWxheWVkID0gXy5kZWJvdW5jZShNZXRlb3IuYmluZEVudmlyb25tZW50KHRoaXMuY29tcGlsZS5iaW5kKHRoaXMpKSwgMTAwKTtcblx0XHRNZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG5cdFx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLm9uQWZ0ZXJJbml0aWFsTG9hZCgoKSA9PiB7XG5cdFx0XHRcdFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KC9edGhlbWUtLi8sIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRpZiAoa2V5ID09PSAndGhlbWUtY3VzdG9tLWNzcycgJiYgdmFsdWUgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0dGhpcy5jdXN0b21DU1MgPSB2YWx1ZTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y29uc3QgbmFtZSA9IGtleS5yZXBsYWNlKC9edGhlbWUtW2Etel0rLS8sICcnKTtcblx0XHRcdFx0XHRcdGlmICh0aGlzLnZhcmlhYmxlc1tuYW1lXSAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMudmFyaWFibGVzW25hbWVdLnZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dGhpcy5jb21waWxlRGVsYXllZCgpO1xuXHRcdFx0XHR9KSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdGNvbXBpbGUoKSB7XG5cdFx0bGV0IGNvbnRlbnQgPSBbdGhpcy5nZXRWYXJpYWJsZXNBc0xlc3MoKV07XG5cblx0XHRjb250ZW50LnB1c2goLi4udGhpcy5maWxlcy5tYXAoKG5hbWUpID0+IEFzc2V0cy5nZXRUZXh0KG5hbWUpKSk7XG5cblx0XHRjb250ZW50LnB1c2goLi4udGhpcy5wYWNrYWdlQ2FsbGJhY2tzLm1hcCgobmFtZSkgPT4gbmFtZSgpKSk7XG5cblx0XHRjb250ZW50LnB1c2godGhpcy5jdXN0b21DU1MpO1xuXHRcdGNvbnRlbnQgPSBjb250ZW50LmpvaW4oJ1xcbicpO1xuXHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRjb21wcmVzczogdHJ1ZSxcblx0XHRcdHBsdWdpbnM6IFtuZXcgQXV0b3ByZWZpeGVyKCldLFxuXHRcdH07XG5cdFx0Y29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuXHRcdHJldHVybiBsZXNzLnJlbmRlcihjb250ZW50LCBvcHRpb25zLCBmdW5jdGlvbihlcnIsIGRhdGEpIHtcblx0XHRcdGxvZ2dlci5zdG9wX3JlbmRlcmluZyhEYXRlLm5vdygpIC0gc3RhcnQpO1xuXHRcdFx0aWYgKGVyciAhPSBudWxsKSB7XG5cdFx0XHRcdHJldHVybiBjb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0fVxuXHRcdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy51cGRhdGVCeUlkKCdjc3MnLCBkYXRhLmNzcyk7XG5cdFx0XHRyZXR1cm4gTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBNZXRlb3Iuc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gcHJvY2Vzcy5lbWl0KCdtZXNzYWdlJywge1xuXHRcdFx0XHRcdFx0cmVmcmVzaDogJ2NsaWVudCcsXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0sIDIwMCk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdGFkZENvbG9yKG5hbWUsIHZhbHVlLCBzZWN0aW9uLCBwcm9wZXJ0aWVzKSB7XG5cdFx0Y29uc3QgY29uZmlnID0ge1xuXHRcdFx0Z3JvdXA6ICdDb2xvcnMnLFxuXHRcdFx0dHlwZTogJ2NvbG9yJyxcblx0XHRcdGVkaXRvcjogJ2NvbG9yJyxcblx0XHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRcdHByb3BlcnRpZXMsXG5cdFx0XHRzZWN0aW9uLFxuXHRcdH07XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoYHRoZW1lLWNvbG9yLSR7IG5hbWUgfWAsIHZhbHVlLCBjb25maWcpO1xuXHR9XG5cblx0YWRkVmFyaWFibGUodHlwZSwgbmFtZSwgdmFsdWUsIHNlY3Rpb24sIHBlcnNpc3QgPSB0cnVlLCBlZGl0b3IsIGFsbG93ZWRUeXBlcywgcHJvcGVydHkpIHtcblx0XHR0aGlzLnZhcmlhYmxlc1tuYW1lXSA9IHtcblx0XHRcdHR5cGUsXG5cdFx0XHR2YWx1ZSxcblx0XHR9O1xuXHRcdGlmIChwZXJzaXN0KSB7XG5cdFx0XHRjb25zdCBjb25maWcgPSB7XG5cdFx0XHRcdGdyb3VwOiAnTGF5b3V0Jyxcblx0XHRcdFx0dHlwZSxcblx0XHRcdFx0ZWRpdG9yOiBlZGl0b3IgfHwgdHlwZSxcblx0XHRcdFx0c2VjdGlvbixcblx0XHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0XHRhbGxvd2VkVHlwZXMsXG5cdFx0XHRcdHByb3BlcnR5LFxuXHRcdFx0fTtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0LnNldHRpbmdzLmFkZChgdGhlbWUtJHsgdHlwZSB9LSR7IG5hbWUgfWAsIHZhbHVlLCBjb25maWcpO1xuXHRcdH1cblxuXHR9XG5cblx0YWRkUHVibGljQ29sb3IobmFtZSwgdmFsdWUsIHNlY3Rpb24sIGVkaXRvciA9ICdjb2xvcicsIHByb3BlcnR5KSB7XG5cdFx0cmV0dXJuIHRoaXMuYWRkVmFyaWFibGUoJ2NvbG9yJywgbmFtZSwgdmFsdWUsIHNlY3Rpb24sIHRydWUsIGVkaXRvciwgWydjb2xvcicsICdleHByZXNzaW9uJ10sIHByb3BlcnR5KTtcblx0fVxuXG5cdGFkZFB1YmxpY0ZvbnQobmFtZSwgdmFsdWUpIHtcblx0XHRyZXR1cm4gdGhpcy5hZGRWYXJpYWJsZSgnZm9udCcsIG5hbWUsIHZhbHVlLCAnRm9udHMnLCB0cnVlKTtcblx0fVxuXG5cdGdldFZhcmlhYmxlc0FzT2JqZWN0KCkge1xuXHRcdHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnZhcmlhYmxlcykucmVkdWNlKChvYmosIG5hbWUpID0+IHtcblx0XHRcdG9ialtuYW1lXSA9IHRoaXMudmFyaWFibGVzW25hbWVdLnZhbHVlO1xuXHRcdFx0cmV0dXJuIG9iajtcblx0XHR9LCB7fSk7XG5cdH1cblxuXHRnZXRWYXJpYWJsZXNBc0xlc3MoKSB7XG5cdFx0cmV0dXJuIE9iamVjdC5rZXlzKHRoaXMudmFyaWFibGVzKS5tYXAoKG5hbWUpID0+IHtcblx0XHRcdGNvbnN0IHZhcmlhYmxlID0gdGhpcy52YXJpYWJsZXNbbmFtZV07XG5cdFx0XHRyZXR1cm4gYEAkeyBuYW1lIH06ICR7IHZhcmlhYmxlLnZhbHVlIH07YDtcblx0XHR9KS5qb2luKCdcXG4nKTtcblx0fVxuXG5cdGFkZFBhY2thZ2VBc3NldChjYikge1xuXHRcdHRoaXMucGFja2FnZUNhbGxiYWNrcy5wdXNoKGNiKTtcblx0XHRyZXR1cm4gdGhpcy5jb21waWxlRGVsYXllZCgpO1xuXHR9XG5cblx0Z2V0Q3NzKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnY3NzJykgfHwgJyc7XG5cdH1cblxufTtcbiIsIlxuLy8gVE9ETzogRGVmaW5lIHJlZ2lzdGVycy9nZXR0ZXJzL3NldHRlcnMgZm9yIHBhY2thZ2VzIHRvIHdvcmsgd2l0aCBlc3RhYmxpc2hlZFxuLy8gXHRcdFx0aGVpcmFyY2h5IG9mIGNvbG9ycyBpbnN0ZWFkIG9mIG1ha2luZyBkdXBsaWNhdGUgZGVmaW5pdGlvbnNcbi8vIFRPRE86IFNldHRpbmdzIHBhZ2VzIHRvIHNob3cgc2ltcGxlIHNlcGFyYXRpb24gb2YgbWFqb3IvbWlub3IvYWRkb24gY29sb3JzXG4vLyBUT0RPOiBHZXQgbWFqb3IgY29sb3VycyBhcyBzd2F0Y2hlcyBmb3IgbWlub3IgY29sb3JzIGluIG1pbmljb2xvcnMgcGx1Z2luXG4vLyBUT0RPOiBNaW5pY29sb3JzIHNldHRpbmdzIHRvIHVzZSByZ2IgZm9yIGFscGhhcywgaGV4IG90aGVyd2lzZVxuLy8gVE9ETzogQWRkIHNldHRpbmcgdG9nZ2xlIHRvIHVzZSBkZWZhdWx0cyBmb3IgbWlub3IgY29sb3VycyBhbmQgaGlkZSBzZXR0aW5nc1xuXG4vLyBOZXcgY29sb3JzLCB1c2VkIGZvciBzaGFkZXMgb24gc29saWQgYmFja2dyb3VuZHNcbi8vIERlZmluZWQgcmFuZ2Ugb2YgdHJhbnNwYXJlbmNpZXMgcmVkdWNlcyByYW5kb20gY29sb3VyIHZhcmlhbmNlc1xuLy8gTWFqb3IgY29sb3JzIGZvcm0gdGhlIGNvcmUgb2YgdGhlIHNjaGVtZVxuLy8gTmFtZXMgY2hhbmdlZCB0byByZWZsZWN0IHVzYWdlLCBjb21tZW50cyBzaG93IHByZS1yZWZhY3RvciBuYW1lc1xuXG5jb25zdCByZWcgPSAvLS0ocmMtY29sb3ItLio/KTogKC4qPyk7L2lnbTtcblxuY29uc3QgY29sb3JzID0gWy4uLkFzc2V0cy5nZXRUZXh0KCdjbGllbnQvaW1wb3J0cy9nZW5lcmFsL3ZhcmlhYmxlcy5jc3MnKS5tYXRjaChyZWcpXS5tYXAoKGNvbG9yKSA9PiB7XG5cdGNvbnN0IFtuYW1lLCB2YWx1ZV0gPSBjb2xvci5zcGxpdCgnOiAnKTtcblx0cmV0dXJuIFtuYW1lLnJlcGxhY2UoJy0tJywgJycpLCB2YWx1ZS5yZXBsYWNlKCc7JywgJycpXTtcbn0pO1xuXG5jb2xvcnMuZm9yRWFjaCgoW2tleSwgY29sb3JdKSA9PiBcdHtcblx0aWYgKC92YXIvLnRlc3QoY29sb3IpKSB7XG5cdFx0Y29uc3QgWywgdmFsdWVdID0gY29sb3IubWF0Y2goL3ZhclxcKC0tKC4qPylcXCkvaSk7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQudGhlbWUuYWRkUHVibGljQ29sb3Ioa2V5LCB2YWx1ZSwgJ0NvbG9ycycsICdleHByZXNzaW9uJyk7XG5cdH1cblx0Um9ja2V0Q2hhdC50aGVtZS5hZGRQdWJsaWNDb2xvcihrZXksIGNvbG9yLCAnQ29sb3JzJyk7XG59KTtcblxuY29uc3QgbWFqb3JDb2xvcnMgPSB7XG5cdCdjb250ZW50LWJhY2tncm91bmQtY29sb3InOiAnI0ZGRkZGRicsXG5cdCdwcmltYXJ5LWJhY2tncm91bmQtY29sb3InOiAnIzA0NDM2QScsXG5cdCdwcmltYXJ5LWZvbnQtY29sb3InOiAnIzQ0NDQ0NCcsXG5cdCdwcmltYXJ5LWFjdGlvbi1jb2xvcic6ICcjMTM2NzlBJywgLy8gd2FzIGFjdGlvbi1idXR0b25zLWNvbG9yXG5cdCdzZWNvbmRhcnktYmFja2dyb3VuZC1jb2xvcic6ICcjRjRGNEY0Jyxcblx0J3NlY29uZGFyeS1mb250LWNvbG9yJzogJyNBMEEwQTAnLFxuXHQnc2Vjb25kYXJ5LWFjdGlvbi1jb2xvcic6ICcjREREREREJyxcblx0J2NvbXBvbmVudC1jb2xvcic6ICcjRUFFQUVBJyxcblx0J3N1Y2Nlc3MtY29sb3InOiAnIzRkZmY0ZCcsXG5cdCdwZW5kaW5nLWNvbG9yJzogJyNGQ0IzMTYnLFxuXHQnZXJyb3ItY29sb3InOiAnI0JDMjAzMScsXG5cdCdzZWxlY3Rpb24tY29sb3InOiAnIzAyQUNFQycsXG5cdCdhdHRlbnRpb24tY29sb3InOiAnIzlDMjdCMCcsXG59O1xuXG4vLyBNaW5vciBjb2xvdXJzIGltcGxlbWVudCBtYWpvciBjb2xvdXJzIGJ5IGRlZmF1bHQsIGJ1dCBjYW4gYmUgb3ZlcnJ1bGVkXG5jb25zdCBtaW5vckNvbG9ycyA9IHtcblx0J3RlcnRpYXJ5LWJhY2tncm91bmQtY29sb3InOiAnQGNvbXBvbmVudC1jb2xvcicsXG5cdCd0ZXJ0aWFyeS1mb250LWNvbG9yJzogJ0B0cmFuc3BhcmVudC1saWdodGVzdCcsXG5cdCdsaW5rLWZvbnQtY29sb3InOiAnQHByaW1hcnktYWN0aW9uLWNvbG9yJyxcblx0J2luZm8tZm9udC1jb2xvcic6ICdAc2Vjb25kYXJ5LWZvbnQtY29sb3InLFxuXHQnY3VzdG9tLXNjcm9sbGJhci1jb2xvcic6ICdAdHJhbnNwYXJlbnQtZGFya2VyJyxcblx0J3N0YXR1cy1vbmxpbmUnOiAnQHN1Y2Nlc3MtY29sb3InLFxuXHQnc3RhdHVzLWF3YXknOiAnQHBlbmRpbmctY29sb3InLFxuXHQnc3RhdHVzLWJ1c3knOiAnQGVycm9yLWNvbG9yJyxcblx0J3N0YXR1cy1vZmZsaW5lJzogJ0B0cmFuc3BhcmVudC1kYXJrZXInLFxufTtcblxuLy8gQnVsay1hZGQgc2V0dGluZ3MgZm9yIGNvbG9yIHNjaGVtZVxuT2JqZWN0LmtleXMobWFqb3JDb2xvcnMpLmZvckVhY2goKGtleSkgPT4ge1xuXHRjb25zdCB2YWx1ZSA9IG1ham9yQ29sb3JzW2tleV07XG5cdFJvY2tldENoYXQudGhlbWUuYWRkUHVibGljQ29sb3Ioa2V5LCB2YWx1ZSwgJ09sZCBDb2xvcnMnKTtcbn0pO1xuXG5PYmplY3Qua2V5cyhtaW5vckNvbG9ycykuZm9yRWFjaCgoa2V5KSA9PiB7XG5cdGNvbnN0IHZhbHVlID0gbWlub3JDb2xvcnNba2V5XTtcblx0Um9ja2V0Q2hhdC50aGVtZS5hZGRQdWJsaWNDb2xvcihrZXksIHZhbHVlLCAnT2xkIENvbG9ycyAobWlub3IpJywgJ2V4cHJlc3Npb24nKTtcbn0pO1xuXG5Sb2NrZXRDaGF0LnRoZW1lLmFkZFB1YmxpY0ZvbnQoJ2JvZHktZm9udC1mYW1pbHknLCAnLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCBcXCdTZWdvZSBVSVxcJywgUm9ib3RvLCBPeHlnZW4sIFVidW50dSwgQ2FudGFyZWxsLCBcXCdIZWx2ZXRpY2EgTmV1ZVxcJywgXFwnQXBwbGUgQ29sb3IgRW1vamlcXCcsIFxcJ1NlZ29lIFVJIEVtb2ppXFwnLCBcXCdTZWdvZSBVSSBTeW1ib2xcXCcsIFxcJ01laXJ5byBVSVxcJywgQXJpYWwsIHNhbnMtc2VyaWYnKTtcblxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ3RoZW1lLWN1c3RvbS1jc3MnLCAnJywge1xuXHRncm91cDogJ0xheW91dCcsXG5cdHR5cGU6ICdjb2RlJyxcblx0Y29kZTogJ3RleHQvY3NzJyxcblx0bXVsdGlsaW5lOiB0cnVlLFxuXHRzZWN0aW9uOiAnQ3VzdG9tIENTUycsXG5cdHB1YmxpYzogdHJ1ZSxcbn0pO1xuXG4iXX0=
