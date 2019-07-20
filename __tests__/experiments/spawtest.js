const { spawn } = require('child_process');

let ls;

if (/^win/.test(process.platform)) {
  ls = spawn('cmd', ['/s', '/c', 'yo', 'postgres-flask-restful', '--skip-install']);
} else {
  // Linux
  ls = spawn('yo', ['postgres-flask-restful', '--skip-install']);
}

var expectedAnswers = 0;

// STDOUT events
ls.stdout.on('data', data => {
  console.log(`stdout: ${data}`);
  if (data.indexOf('Ingrese el nombre del projecto') > 0) {
    ls.stdin.write('\n');
    expectedAnswers++;
  }
  if (data.indexOf('a) overwrite this and all others') > 0) {
    ls.stdin.write('a\n');
    expectedAnswers++;
  }
  if (expectedAnswers >= 2) {
    ls.stdin.end();
  }
});

ls.stdout.on('error', error => {
  console.log(`stdout error: ${error}`);
});

ls.stdout.on('close', data => {
  console.log(`stdout close: ${data}`);
});

ls.stdout.on('end', data => {
  console.log(`stdout end: ${data}`);
});

// STDERR events
ls.stderr.on('data', data => {
  console.log(`stderr: ${data}`);
});

ls.stderr.on('error', error => {
  console.log(`stderr error: ${error}`);
});

ls.stderr.on('close', data => {
  console.log(`stderr close: ${data}`);
});

ls.stderr.on('end', data => {
  console.log(`stderr end: ${data}`);
});

// ChildProcess events
ls.on('close', code => {
  console.log(`child process closed with code ${code}`);
});

ls.on('exit', code => {
  console.log(`child process exited with code ${code}`);
});

ls.on('disconnect', code => {
  console.log(`child process disconnected with code ${code}`);
});
