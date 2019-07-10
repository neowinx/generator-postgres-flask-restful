'use strict';
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const assert = require('yeoman-assert');
const dockerCLI = require('docker-cli-js');
const Docker = dockerCLI.Docker;

const docker = new Docker();

jest.setTimeout(60000);

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

const testPath = fs.mkdtempSync(path.join(os.tmpdir(), 'foo-'));

console.log('testPath: ' + testPath);

// WORK IN PROGRESS
describe('generator-flask-restful:crud', () => {
  beforeAll(async done => {
    let schemaPath = path.join(__dirname, 'schema.sql');
    console.log('stopping ALL postgres running containers...');
    let psdata = await docker.command('ps');
    await psdata.containerList.forEach(async function(container) {
      if (container.image === 'postgres') {
        await docker.command('stop ' + container.names);
      }
    });
    console.log('starting a new postgres container on port 15432...');
    let nucontainer = await docker.command(
      `run --rm -d -p 15432:5432 -v ${schemaPath}:/tmp/schema.sql -e POSTGRES_PASSWORD=postgres postgres`
    );

    console.log('waiting 5 seconds for the database to warm up...');
    await sleep(5000);
    console.log('resuming');
    await docker.command(
      `exec -t ${nucontainer.containerId} bash -c 'psql -U postgres -f /tmp/schema.sql'`
    );
    console.log('database schema restored');

    console.log('spawning yo command...');
    let ls = await spawn('yo', ['postgres-flask-restful:crud'], {
      cwd: testPath
    });

    var expectedAnswers = 0;

    await new Promise(resolve => {
      ls.stdout.on('data', data => {
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
          console.log('ending prompt input');
          ls.stdin.end();
        }
      });
      ls.stdout.on('end', () => {
        resolve();
      });
    });
    done();
  });

  it('creates files', () => {
    console.log('checking created files');
    assert.file(path.join(testPath, 'models/user.py'));
  });
});
