'use strict';
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const fsnode = require('fs');
const changeCase = require('change-case');

module.exports = class extends Generator {

  prompting() {
    this.log(yosay(`Bienvenido al generador ${chalk.red('postgres-flask-restful')}!`));

    const prompts = [
      {
        type: 'input',
        name: 'projectName',
        message: 'Ingrese el nombre del projecto',
        default: 'Mi Super Proyecto'
      }
    ];

    return this.prompt(prompts).then(props => {
      props.projectNameParamCase = changeCase.paramCase(props.projectName);
      this.props = props;
    });
  }

  writing() {
    this.fs.copy(this.templatePath(), this.destinationPath(), {
      globOptions: { dot: true }
    });
    this.fs.copyTpl(
      this.templatePath('app.py'),
      this.destinationPath('app.py'),
      this.props
    );
  }

  install() {
    if (this.options['skip-install']) {
      return;
    }

    if (!fsnode.existsSync(this.destinationPath('venv/'))) {
      switch (process.platform) {
        case 'win32':
          this.log('Instalando dependencias...');
          this.spawnCommand(this.destinationPath('install_dependencies.bat'), []);
          break;
        case 'linux':
          this.log('Instalando dependencias...');
          this.spawnCommand('bash', [
            this.destinationPath('install_dependencies.sh')
          ]);
          break;
        default:
          this.log(
            'Hecho. No olvide instalar las dependencias de sus proyectos generados. ¡Éxitos!'
          );
      }
    }
  }
};
