'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const dockerCLI = require('docker-cli-js');
const Docker = dockerCLI.Docker;

const docker = new Docker();

// WORK IN PROGRESS
xdescribe('generator-flask-restful:crud', () => {
  beforeAll(async () => {
    console.log('stopping ALL postgres running containers...')
    let psdata = await docker.command('ps');
    await psdata.containerList.forEach(async function(container) {
      if (container.image === 'postgres') {
        var stopdata = await docker.command('stop ' + container.names);
      }
    });
    console.log('starting a new postgresql container...')
    await docker.command('run -d -p 15432:5432 postgres');
    return helpers
      .run(path.join(__dirname, '../generators/crud'))
      .withPrompts({ projectName: 'My Super Project' });
  });

  it('creates files', () => {
    assert.file(['app.py']);
  });
});
