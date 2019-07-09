'use strict';
const path = require('path');
const os = require('os');
const fs = require('fs');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const dockerCLI = require('docker-cli-js');
const Docker = dockerCLI.Docker;

const docker = new Docker();

jest.setTimeout(30000);

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

const testPath = fs.mkdtempSync(path.join(os.tmpdir(), 'foo-'));

// WORK IN PROGRESS
xdescribe('generator-flask-restful:crud', () => {
  beforeAll(async done => {
    let schemaPath = path.join(__dirname, 'schema.sql');
    console.log(testPath);
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
    return helpers
      .run(path.join(__dirname, '../generators/crud'))
      .inDir(testPath)
      .withPrompts({
        host: 'localhost',
        port: 15432,
        database: 'db',
        user: 'postgres',
        password: 'postgres',
        schema: 'public',
        tables: ['public.user']
      })
      .on('end', done);
  });

  it('creates files', () => {
    console.log('checking created files');
    assert.file(path.join(testPath, 'models/user.py'));
  });
});
