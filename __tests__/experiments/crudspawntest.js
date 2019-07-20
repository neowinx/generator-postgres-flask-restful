const { spawn } = require('child_process');

const ls = spawn('yo', ['postgres-flask-restful:crud']);

var expectedAnswers = 0;

// STDOUT events
ls.stdout.on('data', data => {
  console.log(`stdout: ${data}`);
  if (data.indexOf('Ingrese el host') > 0 && expectedAnswers === 0) {
    ls.stdin.write('\n');
    expectedAnswers++;
  }
  if (data.indexOf('Ingrese el puerto') > 0 && expectedAnswers === 1) {
    ls.stdin.write('15432\n');
    expectedAnswers++;
  }
  if (data.indexOf('Ingrese el nombre de la base de datos') > 0 && expectedAnswers === 2) {
    ls.stdin.write('db\n');
    expectedAnswers++;
  }
  if (data.indexOf('Ingrese el usuario') > 0 && expectedAnswers === 3) {
    ls.stdin.write('\n');
    expectedAnswers++;
  }
  if (data.indexOf('Ingrese el password') > 0 && expectedAnswers === 4) {
    ls.stdin.write('\n');
    expectedAnswers++;
  }
  if (data.indexOf('Ingrese el esquema al que quiere conectar') > 0 && expectedAnswers === 5) {
    ls.stdin.write('\n');
    expectedAnswers++;
  }
  if (data.indexOf('Seleccione las tablas a generar artefactos') > 0 && expectedAnswers === 6) {
    ls.stdin.write('a\n');
    expectedAnswers++;
  }
  if (data.indexOf('(ynaxdH)') > 0 && expectedAnswers === 7) {
    ls.stdin.write('a\n');
    expectedAnswers++;
  }
  if (data.indexOf('(ynaxdH)') > 0 && expectedAnswers === 8) {
    ls.stdin.write('a\n');
    expectedAnswers++;
  }
  // if (data.indexOf('a) overwrite this and all others') > 0 && expectedAnswers === 9) {
  //   ls.stdin.write('a\n');
  //   expectedAnswers++;
  // }
  console.log(`expectedAnswers: ${expectedAnswers}`);
  if (expectedAnswers >= 8) {
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
