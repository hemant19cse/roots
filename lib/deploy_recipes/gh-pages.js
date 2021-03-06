var path = require('path'),
    fs = require('fs'),
    colors = require('colors'),
    readdirp = require('readdirp'),
    shell = require('shelljs');

var gh_pages = module.exports = {};
var original_branch;

gh_pages.check_install_status = function(cb){
  // Verifying the user has Git installed
  if (!shell.which('git')){
    console.error("You must install git. We recommend using homebrew".red);
    return false
  }

  // Make sure there is a remote origin
  if (shell.exec('git remote | grep origin', {silent: true}).output === ''){
    console.error("Make sure you have a remote origin branch for github".red);
    return false
  }

  // save the original branch
  original_branch = shell.exec('git rev-parse --abbrev-ref HEAD', {silent: true});
  if (original_branch.code > 0) {
    console.error('you need to make a commit before deploying'.red);
    return false;
  } else {
    original_branch = original_branch.output.trim();
  }

  options.debug.log('starting on branch ' + original_branch);

  cb();

};

gh_pages.create_project = function(cb){
  if (shell.exec('git branch | grep gh-pages').output === ''){
    options.debug.log('gh-pages branch not found, creating it');
    create_gh_pages_branch(cb);
  } else {
    options.debug.log('sending master to gh-pages branch');
    move_to_gh_pages_branch(cb);
  }
};

gh_pages.push_code = function(cb){
  // Move contents of public folder to the project root
  var public_folder = options.output_folder;
  var target = path.join(public_folder, '*');

  console.log('moving the compiled roots project to the project root'.grey);
  var cmd = shell.mv('-f', path.resolve(target), process.cwd());
  options.debug.log(cmd);
  shell.rm('-rf', 'public');

  // Commit and push
  console.log('commiting and pushing new files to origin/gh-pages branch');
  var commit_msg = "compress and deploy";
  var commit = shell.exec("git add .; git commit -am '" + commit_msg + "'; git push origin gh-pages --force");
  options.debug.log(commit);
  if (commit.code > 0) { console.error(commit); return false; }

  // Switch back to the original branch
  options.debug.log('switching back to the ' + original_branch + ' branch');
  shell.exec('git checkout ' + original_branch, {silent: true});

  // Profit
  console.log('github pages site deployed'.grey);
  cb();
};

//
// @api private
//

function move_to_gh_pages_branch(cb){
  var command = 'git checkout ' + original_branch + '; git merge -s ours gh-pages; git checkout gh-pages; git merge ' + original_branch;
  
  var result = shell.exec(command, {silent: true});
  if (result.code > 0) { console.error(result); return false }
  remove_everything_except_public(cb);
}

function create_gh_pages_branch(cb){
  console.log('creating bare gh-pages branch in project...'.grey);

  // create the gh-pages branch
  var branch = shell.exec('git checkout -b gh-pages', {silent: true});
  if (branch.code > 0) { console.error(branch); return false; }

  remove_everything_except_public(cb);
}

function remove_everything_except_public(cb){
  var opts = { root: '', directoryFilter: ['!' + options.output_folder, '!.git'] };

  readdirp(opts, function(err, res){
    if (err) { return console.error(err) }
    res.files.forEach(function(f){ shell.rm(f.path); });
    res.directories.forEach(function(f){ shell.rm('-rf', f.path); });
    cb();
  });
}
