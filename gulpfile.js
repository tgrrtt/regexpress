(function(){
  var gulp  = require('gulp');
  var $     = require('gulp-load-plugins')({lazy:false});
  var del   = require('del');
  var wiredep = require('wiredep');
  var shell = require('gulp-shell');
  $.livereload();

// Set up paths hashes for client directory
var paths = {
  index: './client/index.html',
  root: './client',
  html: './client/**/*.html',
  scripts: './client/**/*.js',
  stylesStylus: './client/styles/app.styl',
  styles: './client/**/*.css',
  bower: './client/bower_components',
  images: './client/assets/**/*',
  templates: ['./client/**/*.html', '!./client/index.html','!./client/bower_components/**/*.html'],
  server: './server.js',
  railroadDiagrams: './client/railroadDiagrams/regexToRailroad.js',
  browserify: './client/railroadDiagrams',
  packageJson: './package.json',
  nodeModules: './node_modules',
  karmaBin: './node_modules/karma/bin/karma'
};

// Set up paths hashes for paths directory
var dist = {
  root: './dist',
  client: './dist/client',
  index: './dist/client/index.html',
  scripts: './dist/client/scripts',
  styles: './dist/client/styles',
  bower: './dist/client/bower_components',
  images: './dist/client/assets',
  templates: './dist/client/scripts',
  nodeModules: './dist/node_modules'
};

// options that we can easily reference later on.
var options = {
  templates: {
    name: 'templates.js',
    options: {
      module: 'regexpress'
    }
  },
  inject: {
    scripts: {
      relative: true,
      name: 'app',

    },
    styles: {
      relative: true,
      name: 'styles'
    }
  }
};
// Lets declare our actual tasks & what they do below
//=========================================================

// Dev tasks - wont 'build' anything aka doesn't dump into dist folder.
//==================================
gulp.task('default', $.sequence('build:local','server:dev', 'watch:dev'));
// just builds files locally
gulp.task('build:local', $.sequence('stylus', 'browserify', 'wire:dev', 'inject:dev'));
// serves stuff in the client folder
gulp.task('server:dev', startServerDev);
// watches for changes in client folder
gulp.task('watch:dev', startWatchDev);
// browserify stuff
gulp.task('browserify', browserify);
// compiles stylus to css
gulp.task('stylus', stylus);
// injects our css & js into index.html
gulp.task('inject:dev', injectDev);
// injects bower stuff into index.html
gulp.task('wire:dev', wireBower);

// Dist tasks - reads from client folder and shits out stuff into the dist (production ready) folder
//===================================

// builds from client folder -> dist folder
gulp.task('build:dist', $.sequence('clean', 'build:local', 'test', 'copy:all'));
// gulp.task('build', $.sequence('clean','copy', 'stylus', 'browserify', ['templates:dist','styles:dist','scripts:dist','image:dist','bower:dist', 'packagejson:dist'], 'wire:dist', 'inject:dist'));
// default dist task: builds, serves & watches
// gulp.task('dist', $.sequence('build', 'server:dist', 'watch:dist'));
// serve up files from the dist directory
gulp.task('server:dist', startServerProd);
// wire bower deps into index.html
gulp.task('wire:dist', wireBowerDist);
// watch for changes in our dist directory
gulp.task('watch:dist', startWatchDist);
// minify, etc css
gulp.task('styles:dist', stylesDist);
// moves bower stuff over into dist folder
gulp.task('bower:dist', bowerFilesDist);
// copies node_modueles stuff into dist folder
gulp.task('nodemodules:dist', nodeModulesDist);
// injects our css and js files into index.html
gulp.task('inject:dist', injectDist);
// does stuff to our js
gulp.task('scripts:dist', scriptsDist);
// minifyt & moves images
// gulp.task('image:dist', imagesDist);
// copies all other files into the dist folder
gulp.task('copy',copyFiles);
// copy all client files 
gulp.task('copy:client', copyAllClientFiles);
// Copy package.json
gulp.task('copy:packagejson', copyPackageJson);
// copy server file
gulp.task('copy:server', copyServer);
// copy all files
gulp.task('copy:all', $.sequence(['copy:client', 'copy:packagejson', 'copy:server']));
// creates a giant folder of all of our angular partials
gulp.task('templates:dist', templatesDist);
// empties out the entire dist folder, with the exception of any git files (cuz dist is a git repo as well)
gulp.task('clean', del.bind(null, ['./dist/**/*']));
// runs karma 
gulp.task('karma', shell.task([paths.karmaBin + ' start']));
// runs all tests
gulp.task('test', ['karma']);
// runs all tests and watches
gulp.task('test:watch', testWatch);

// ===============================
// The following are what actually happens when a specific gulp task happens
// ===============================

// Server functions
//============================
function startServerDev(){
  // set dev env so dist folder isnt served
  process.env.NODE_ENV = 'development';
  require('./gulpServer');

}

function startServerProd(){
  // set prod env so dist folder is served
  process.env.NODE_ENV = 'production';
  require('./gulpServer');

}
// Watch functions
//============================
function startWatchDev(){
  $.livereload.listen();
  // watch for changes in these files and let livereload know something happened
  // gulp.watch(paths.root + '/**/*.js', ['karma']);
  gulp.watch(paths.root + '/**/*.styl', ['stylus']);
  gulp.watch(paths.browserify + '/**/*.js', ['browserify'] );
  gulp.watch(paths.root + '/**/*.css', $.livereload.changed);
  gulp.watch(paths.root + '/**/*.js', $.livereload.changed);
  gulp.watch(paths.root + '/**/*.html', $.livereload.changed);

}
// test watch
function testWatch() {
 gulp.watch(paths.root + '/**/*.js', ['test']);
}

function startWatchDist(){
  // NOTE THIS CURRENTLY DOESNT WORK
  // it watches the main folder but nothing actually builds :(
  $.livereload.listen();
  gulp.watch(paths.root + '/**/*.styl', ['stylus']);
  gulp.watch(paths.root + '/**/*.css', $.livereload.changed);
  gulp.watch(paths.root + '/**/*.js', $.livereload.changed);
  gulp.watch(paths.root + '/**/*.html', $.livereload.changed);

}
// browserify
function browserify(){
  return gulp.src(paths.railroadDiagrams)
    .pipe($.browserify({insertGlobals : true}))
    .pipe($.rename('bundle.js'))
    .pipe(gulp.dest('./client/bundle'));
}
//inject functions
//===============================
function injectDev(){
  var target  = gulp.src( paths.index );
  var scripts = gulp.src( ['!/**/bower_components/**/*', '!/**/railroadDiagrams/**/*','!/**/*.specs.js', '!/**/*.min.js', paths.scripts], {read:false} );
  var styles  = gulp.src( ['!/**/bower_components/**/*', paths.styles], {read:false} );

  return target
    .pipe( $.inject( scripts,  options.inject.scripts ) )
    .pipe( $.inject( styles,  options.inject.styles ) )
    .pipe( gulp.dest( paths.root ) );
}

function injectDist(){
  var target = gulp.src( dist.index ) ;
  var scripts = gulp.src( dist.scripts , {read: false});
  var styles = gulp.src( dist.styles, {read: false});

  return target
    .pipe( $.inject( scripts,  options.inject.scripts ) )
    .pipe( $.inject( styles,  options.inject.styles ) )
    .pipe(gulp.dest(dist.root));
}
// Wire up bower deps (inject but for bower)
//=============================
function wireBower(){
  var wire = wiredep.stream;
  return gulp.src(paths.index)
    .pipe(wire({
      directory: paths.bower
    }))
    .pipe(gulp.dest(paths.root));

}
function wireBowerDist(){
  var wire = wiredep.stream;
  return gulp.src(dist.index)
    .pipe(wire({directory: dist.bower}))
    .pipe(gulp.dest(dist.root));

}
// compile styl into css
function stylus() {
  return gulp.src(paths.stylesStylus)
    .pipe($.stylus())
    .pipe(gulp.dest('./client/styles'));
}
// Styles 4 Dist
// ============================
function stylesDist() {
  return gulp.src(paths.styles)
    .pipe($.concat('app.min.css'))
    .pipe($.cssmin())
    .pipe(gulp.dest(dist.styles));
}
// Do stuff to our scripts
//=====================================
function scriptsDist() {
  gulp.src(paths.server).pipe(gulp.dest(dist.root));

  return gulp.src(paths.scripts)
    // ngAnnotate makes sure things are declared in a way that they can be minified
    .pipe($.ngAnnotate({add: true}))
    .pipe($.concat('app.min.js'))
    .pipe($.uglify())
    .pipe(gulp.dest(dist.scripts));
}
// Task that copies all files in our client root folder (not anything inside a folder)
// ====================================
function copyFiles() {
  return gulp.src(['!index.html', paths.root + '/*.*'])
    .pipe(gulp.dest(dist.client));
}
// Copy all files. used instead of build
// ========================================
function copyAllClientFiles() {
  return gulp.src(paths.root + '/**/*')
    .pipe(gulp.dest(dist.client));
}

// copy package.json into dist folder
function copyPackageJson() {
  return gulp.src(paths.packageJson)
    .pipe(gulp.dest(dist.root));
}

// copy server file
function copyServer() {
  return gulp.src(paths.server)
    .pipe(gulp.dest(dist.root));
}

// Move all of our bower files over to dist
//======================================
function bowerFilesDist() {
  return $.bower()
  .pipe(gulp.dest(dist.bower));
}

// Move all node_modules over to dist
function nodeModulesDist() {
  return gulp.src(paths.nodeModules)
    .pipe(gulp.dest(dist.nodeModules));
}
// Minify and move all images over
//=====================================
// function imagesDist() {
//   return gulp.src(paths.images)
//     .pipe($.image())
//     .pipe(gulp.dest(dist.images));
// }
// Take all of our angular partials, and put them all in one 'template script'
//=======================================
function templatesDist() {
  return gulp.src(paths.templates)
    .pipe($.angularTemplatecache(options.templates.name, options.templates.options))
    .pipe(gulp.dest(dist.scripts));
}
})();
