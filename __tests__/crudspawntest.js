const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'foo-'));

console.log(folder);

const ls = spawn('yo', ['postgres-flask-restful:crud'], {
  cwd: folder
});

var expectedAnswers = 0;

// STDOUT events
ls.stdout.on('data', data => {
  console.log(`stdout: ${data}`);
  if (data.indexOf('Ingrese el host (localhost)') > 0) {
    ls.stdin.write('\n');
    expectedAnswers++;
  }
  if (data.indexOf('Ingrese el puerto (5432)') > 0) {
    ls.stdin.write('15432\n');
    expectedAnswers++;
  }
  if (data.indexOf('Ingrese el nombre de la base de datos (postgres)') > 0) {
    ls.stdin.write('db\n');
    expectedAnswers++;
  }
  if (data.indexOf('Ingrese el usuario (postgres)') > 0) {
    ls.stdin.write('\n');
    expectedAnswers++;
  }
  if (data.indexOf('Ingrese el password (postgres)') > 0) {
    ls.stdin.write('\n');
    expectedAnswers++;
  }
  if (data.indexOf('Ingrese el esquema al que quiere conectar (public)') > 0) {
    ls.stdin.write('\n');
    expectedAnswers++;
  }
  if (data.indexOf('Seleccione las tablas a generar artefactos') > 0) {
    ls.stdin.write('a\n');
    expectedAnswers++;
  }
  if (data.indexOf('a) overwrite this and all others') > 0) {
    ls.stdin.write('a\n');
    expectedAnswers++;
  }
  if (expectedAnswers >= 9) {
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
