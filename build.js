#!/usr/bin/env node

var fs         = require('fs');
var path       = require('path');
//var browserify = require('browserify');
//var babelify   = require("babelify");
var RSVP       = require('rsvp');
var glob       = require('glob');
var del        = require('del');
var exec       = require('child_process').exec;
var argv       = require('minimist')(process.argv.slice(2));

var fopen  = RSVP.denodeify(fs.open);
var fread  = RSVP.denodeify(fs.readFile);
var globp  = RSVP.denodeify(glob);

var MODE     = argv.mode || 'dev';
var buildAll = argv.all || false;
var verbose  = argv.verbose || false;

build();

function build() {

  if( buildAll ) {

    del( ['dist/**/*', 'built/**/*'] )
      .then( function (paths) {
          log('Deleted files/folders:', paths );
          var builders = [ 
              bundleVendorJSFiles(), 
              bundleVendorCSSFiles(), 
              publishFontFiles()
            ];
          return RSVP.all(builders);
        })
      .then( () => {
          commonBuild();
          publishSourceMaps();
        });        

  } else {
    commonBuild();
  }

}

function commonBuild() {  

  lintSource();
  RSVP.all( [ 
      bundleAppCSSFiles(),
      publishPublicFiles()
    ]).then( function() {
        generateRouteIndex();
        generateComponentIndex();
        publishServerLibrary();
        bundleBrowserJS();
      });
}

function generateIndexJS(dir,formatter) {
  var str = "// this file is generated by the build process \n\n" +
            "module.exports = { \n"
  del( './app/'+dir+'/index.js' )
    .then( function() {
      return globp('./app/'+dir+'/*');
    }).then( function(files) {
      files.forEach( f => {
        var name = path.parse(f).name;
        var rname = formatter(name);
        str += "  " + rname + ": require('./" + name + "'),\n";
      });
      str += "\n};\n\n";
      log('writing '+dir+'/index.js');
      fs.writeFileSync( './app/'+dir+'/index.js', str, 'utf8' );
    });
}

function generateRouteIndex() {
  generateIndexJS('routes', n => n.replace(/-?(r|R)oute$/,''));
}

function generateComponentIndex() {
  generateIndexJS('components', n => n);
}

function lintSource() {
  log('invoking lint');
  exec('eslint app',function(err, stdout, stderr) {
      if( err ) {
        throw err;
      }
      console.log('eslint results: ',stdout || 'ok');
  });
}

function publishServerLibrary() {
  log('spawing babel for server libs')
  exec('babel app --out-dir built',function(err, stdout, stderr) {
      log('babel results: ')
      log( 'Error: ', err );
      log( 'Output: ', stdout);
  });
}

function publishPublicFiles() {

  mkdir('dist/images');

  return globp('public/{*.html,images/*.*}')
    .then( fnames => fnames.forEach( f => copy( f, f.replace('public/','dist/') ) ) );
}

function bundleAppCSSFiles() {
  return globp( 'public/css/*.css' )
    .then( files => bundleAppFiles(files,'css') );
}

function bundleBrowserJS() {
  log('creating bundle.js');
  mkdir('dist/js');
//var cmd = 'browserify app/**/*.js -e app/browser.js  -t babelify -i http --full-paths -o dist/js/bundle.js --list';
  var cmd = 'browserify app/**/*.js -e app/browser.js  -t babelify --noparse=http -u http -u stream-http  --full-paths -o dist/js/bundle.js';
  exec(cmd,function(_err, stdout, stderr) {
      log('browserify results: ')
      if( _err ) {
        err(_err)
      } else {
        log( "Success. Done. Boom.")
      }
  });
/*
  var opts = { 
    debug: MODE === 'dev',
    loose: 'all'
  };

  var ENTRY_FILE = './app/browser.js';

  browserify( opts )
      .ignore('http')
      .transform(babelify)
      .require( ENTRY_FILE, { entry: true } )
      .bundle()
      .on( "error", err )
      .pipe( fs.createWriteStream("dist/js/bundle.js") );
  */
}

function bundleVendorJSFiles() {  
  
  var vendorJSSources = {
    dev: [
        'node_modules/jquery/dist/jquery.js',
        'node_modules/bootstrap/dist/js/bootstrap.js'
        ],
    prod: [
        'node_modules/jquery/dist/jquery.min.js',
        'node_modules/bootstrap/dist/js/bootstrap.min.js'
    ]
  };
  return bundleVendorFiles(vendorJSSources[MODE],'js');
}

function publishFontFiles() {

  mkdir('dist/fonts');

  var rootd = 'node_modules/font-awesome/';

  return globp( rootd + 'fonts/*.*' )
    .then( fnames => fnames.forEach( f => copy( f, f.replace(rootd,'dist/') ) ) );
}

function publishSourceMaps() {

  mkdir('dist/fonts');

  if( MODE === 'dev' ) {

    var fromTos = [
      {
        from: 'node_modules/bootstrap/dist/css/bootstrap-theme.css.map',
        to: 'dist/css/bootstrap-theme.css.map'
      }
    ];

    fromTos.forEach( ft => copy(ft.from, ft.to) );
  }
}

function bundleVendorCSSFiles() {

  var vendorCSSSources = {
    dev: [
      'node_modules/bootstrap/dist/css/bootstrap.css',
      'node_modules/bootstrap/dist/css/bootstrap-theme.css',
      'node_modules/font-awesome/css/font-awesome.css',
    ],
    prod: [
      'node_modules/bootstrap/dist/css/bootstrap.min.css',
      'node_modules/bootstrap/dist/css/bootstrap-theme.min.css',
      'node_modules/font-awesome/css/font-awesome.min.css',
    ]
  };
  return bundleVendorFiles(vendorCSSSources[MODE],'css');
}

function bundleVendorFiles(arr,outext) {
  var dir = 'dist/' + outext;
  mkdir(dir);
  return bundleFiles(arr, dir + '/vendor.' + outext);
}

function bundleAppFiles(arr,outext) {
  // should be uglify step here
  var dir = 'dist/' + outext;
  mkdir(dir);
  return bundleFiles(arr, dir + '/app.' + outext);
}

function bundleFiles(arr,destination) {
  var fd = null;

  log( 'creating bundle ', destination, arr );

  return fopen(destination, 'w')
    .then( function(fileDescriptor) {
        fd = fileDescriptor;
        var promises = arr.map( n => fread(n,'utf8') );
        return RSVP.all(promises);
      })
    .then( function(datas) {
        fs.write(fd,datas.join("\n/* ccmbuildjoint */\n"));
        fs.close(fd);
      })
    .catch( err );
}

function copy(src,dest) {
  if( verbose ) {
    log('copying ', dest);
  }
  fs.createReadStream(src)
    .on('error', err )
    .pipe(fs.createWriteStream(dest))
}

function err(err) {
  console.log("Error : " + err.message);
}

function mkdir( dir ) {
  try { 
    fs.mkdirSync(dir); 
    log('created directory', dir);
  } catch(e) { }
}

function log() {
  if( verbose ) {
    console.log.apply(console.log,arguments);
  }
}