const dockerCLI = require('docker-cli-js');
const Docker = dockerCLI.Docker;

const test = async () => {
  try {
    let docker = new Docker();
    console.log('stopping ALL postgres running containers...')
    let psdata = await docker.command('ps');
    await psdata.containerList.forEach(async function(container) {
      if (container.image === 'postgres') {
        var stopdata = await docker.command('stop ' + container.names);
      }
    });
    await docker.command('run -d -p 15432:5432 -e POSTGRES_PASSWORD=postgres postgres');
  } catch(error) {
    console.log(error);
  }
}

test();
