'use strict';
const utils = require('../utils');
const Generator = require('yeoman-generator');
const fs = require('fs');
const chalk = require('chalk');
const yosay = require('yosay');
const changeCase = require('change-case');
const ejs = require('ejs');
const Rx = require('rxjs');
const inquirer = require('inquirer');
const massive = require('massive');
const promptSuggestion = require('yeoman-generator/lib/util/prompt-suggestion');

module.exports = class extends Generator {
  prompting() {
    let questions = [
      {
        type: 'input',
        name: 'primary',
        message: 'Ingrese el nombre del servicio de la tabla principal',
        default: 'user'
      },
      {
        type: 'input',
        name: 'secondary',
        message: 'Ingrese el nombre del servicio de la tabla secundaria',
        default: 'rol'
      },
      {
        type: 'input',
        name: 'secondary_key',
        message: 'Ingrese el nombre del primary key de la tabla secundaria',
        default: 'id'
      },
      {
        type: 'input',
        name: 'association_table',
        message: 'Ingrese la tabla intermedia (con su esquema)',
        default: 'public.user_rol'
      }
    ];

    return this.prompt(questions).then(props => {
      this.props = props;
    });
  }

  writing() {
    let primarySnake = changeCase.snake(this.props.primary);
    let primaryPascal = changeCase.pascal(this.props.primary);
    let secondarySnake = changeCase.snake(this.props.secondary);
    let secondaryPascal = changeCase.pascal(this.props.secondary);
    this.props.primarySnake = primarySnake;
    this.props.primaryPascal = primaryPascal;
    this.props.secondarySnake = secondarySnake;
    this.props.secondaryPascal = secondaryPascal;
    this.props.secondaryKeySnake = changeCase.snake(this.props.secondary_key);

    let resourcePath = this.destinationPath(`resources/${primarySnake}.py`);
    if (fs.existsSync(resourcePath)) {
      var resource = this.fs.read(resourcePath);

      let reqparseInsert = this.fs.read(this.templatePath('reqparse_insert.ejs'));
      resource = utils.insertBefore(resource, '    @jwt_required', reqparseInsert);

      resource = utils.insertAfter(
        resource,
        ` data = ${primaryPascal}.parser.parse_args()`,
        `\n\n        ${secondarySnake}s = data.pop('${secondarySnake}s')`
      );

      let validationInsert = this.fs.read(this.templatePath('validation_insert.ejs'));

      resource = utils.insertAfter(
        resource,
        `        ${primarySnake} = ${primaryPascal}Model(**data)\n`,
        validationInsert
      );

      this.fs.write(this.destinationPath(resourcePath), ejs.render(resource, this.props));
    }

    let modelPath = this.destinationPath(`models/${primarySnake}.py`);
    if (fs.existsSync(modelPath)) {
      var model = this.fs.read(modelPath);
      utils.insertBefore(
        model,
        'def __init__',
        `${secondarySnake}s = db.relationship(${secondaryPascal}Model, secondary="${
          this.props.association_table
        }")\n`
      );
    }
  }
};
