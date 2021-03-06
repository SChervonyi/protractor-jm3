'use strict';

var gulp = require('gulp');
var clangFormat = require('clang-format');
var gulpFormat = require('gulp-clang-format');
var runSequence = require('run-sequence');
var spawn = require('child_process').spawn;
var spawnSync = require('child_process').spawnSync;
var tslint = require('gulp-tslint');
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var semver = require('semver');

var runSpawn = function(done, task, opt_arg, opt_io) {
  opt_arg = typeof opt_arg !== 'undefined' ? opt_arg : [];
  var stdio = 'inherit';
  if (opt_io === 'ignore') {
    stdio = 'ignore';
  }
  var child = spawn(task, opt_arg, {stdio: stdio});
  var running = false;
  child.on('close', function() {
    if (!running) {
      running = true;
      done();
    }
  });
  child.on('error', function() {
    if (!running) {
      console.error('gulp encountered a child error');
      running = true;
      done();
    }
  });
};

function tslint() {
  return gulp.src(['lib/**/*.ts', 'spec/**/*.ts', '!spec/install/**/*.ts'])
      .pipe(tslint()).pipe(tslint.report());
};

// prevent contributors from using the wrong version of node
function checkVersion(done) {
  // read minimum node on package.json
  var packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json')));
  var protractorVersion = packageJson.version;
  var nodeVersion = packageJson.engines.node;

  if (semver.satisfies(process.version, nodeVersion)) {
    done();
  } else {
    throw new Error('minimum node version for Protractor ' +
        protractorVersion + ' is node ' + nodeVersion);
  }
};

function builtCopy(done) {
  return gulp.src(['lib/**/*.js'])
      .pipe(gulp.dest('built/'));
  done();
};

function webdriverUpdate(done) {
  runSpawn(done, 'node', ['bin/webdriver-manager', 'update']);
};

function jshint(done) {
  runSpawn(done, 'node', ['node_modules/jshint/bin/jshint', '-c',
      '.jshintrc', 'lib', 'spec', 'scripts',
      '--exclude=lib/selenium-webdriver/**/*.js,lib/webdriver-js-extender/**/*.js,' +
      'spec/dependencyTest/*.js,spec/install/**/*.js']);
};

function formatEnforce() {
  var format = require('gulp-clang-format');
  var clangFormat = require('clang-format');
  return gulp.src(['lib/**/*.ts']).pipe(
    format.checkFormat('file', clangFormat, {verbose: true, fail: true}));
};

function format() {
  var format = require('gulp-clang-format');
  var clangFormat = require('clang-format');
  return gulp.src(['lib/**/*.ts'], { base: '.' }).pipe(
    format.format('file', clangFormat)).pipe(gulp.dest('.'));
};

function tsc(done) {
  runSpawn(done, 'node', ['node_modules/typescript/bin/tsc']);
};

function tscSpec(done) {
  runSpawn(done, 'node', ['node_modules/typescript/bin/tsc', '-p', 'ts_spec_config.json']);
};

function tsc_es5(done) {
  runSpawn(done, './scripts/compile_to_es5.sh');
};

const compile_to_es5 = gulp.series(checkVersion, tsc_es5, builtCopy);

const prepublish = gulp.series(checkVersion, tsc, builtCopy);

const pretest = gulp.series(checkVersion, gulp.series(tslint, format), tsc, builtCopy, tscSpec);

const lint = gulp.series(tslint, jshint, formatEnforce);

exports.default = prepublish;

exports.prepublish = prepublish;
exports.pretest = pretest;
exports.compile_to_es5 = compile_to_es5;
exports.tslint = tslint;
exports.lint = lint;
exports.checkVersion = checkVersion;
exports.webdriverUpdate = webdriverUpdate;
