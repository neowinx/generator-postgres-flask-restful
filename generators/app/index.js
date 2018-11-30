'use strict';
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const fsnode = require('fs');
const changeCase = require('change-case');

module.exports = class extends Generator {
  prompting() {
    // Have Yeoman greet the user.
    this.log(yosay(`Bienvenido al generador ${chalk.red('postgres-flask-restful')}!`));

    // Let noSpaces = function(validateMe) {
    //   return validateMe.indexOf(' ') < 0;
    // };

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
    this.fs.copy(this.templatePath('flask/'), this.destinationPath('flask/'), {
      globOptions: { dot: true }
    });
    this.fs.copyTpl(
      this.templatePath('flask/app.py'),
      this.destinationPath('flask/app.py'),
      this.props
    );
    this.fs.copy(this.templatePath('bin/'), this.destinationPath('bin/'));
  }

  install() {
    if (this.options['skip-install']) {
      return;
    }

    if (!fsnode.existsSync(this.destinationPath('flask/venv/'))) {
      switch (process.platform) {
        case 'win32':
          this.log('Instalando dependencias...');
          this.spawnCommand(this.destinationPath('bin/install_dependencies.bat'), []);
          break;
        case 'linux':
          this.log('Instalando dependencias...');
          this.spawnCommand('bash', [
            this.destinationPath('bin/install_dependencies.sh')
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
