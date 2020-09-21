'use strict';
const utils = require('../utils');
const Generator = require('yeoman-generator');
const os = require('os');
const changeCase = require('change-case');
const ejs = require('ejs');

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
        name: 'primaryKey',
        message: 'Ingrese el nombre del primary key de la tabla principal',
        default: 'id'
      },
      {
        type: 'input',
        name: 'secondary',
        message: 'Ingrese el nombre del servicio de la tabla secundaria',
        default: 'rol'
      },
      {
        type: 'input',
        name: 'secondaryKey',
        message: 'Ingrese el nombre del primary key de la tabla secundaria',
        default: 'id'
      },
      {
        type: 'input',
        name: 'associationTable',
        message: 'Ingrese la tabla intermedia',
        default: 'user_rol'
      },
      {
        type: 'input',
        name: 'primaryForeignKey',
        message:
          'Ingrese el nombre de la columna foreign key de la tabla principal (en la tabla intermedia)',
        default: 'user_id'
      },
      {
        type: 'input',
        name: 'secondaryForeignKey',
        message:
          'Ingrese el nombre de la columna foreign key de la tabla secundaria (en la tabla intermedia)',
        default: 'rol_id'
      }
    ];

    return this.prompt(questions).then(props => {
      this.props = props;
    });
  }

  writing() {
    let primarySnake = changeCase.snake(this.props.primary);
    let primaryPascal = changeCase.pascal(this.props.primary);
    let primaryKeySnake = changeCase.snake(this.props.primaryKey);
    let secondarySnake = changeCase.snake(this.props.secondary);
    let secondaryPascal = changeCase.pascal(this.props.secondary);
    let secondaryKeySnake = changeCase.snake(this.props.secondaryKey);
    let associationTableSnake = changeCase.snake(this.props.associationTable);
    let primaryForeignKeySnake = changeCase.snake(this.props.primaryForeignKey);
    let secondaryForeignKeySnake = changeCase.snake(this.props.secondaryForeignKey);
    this.props.primarySnake = primarySnake;
    this.props.primaryPascal = primaryPascal;
    this.props.secondarySnake = secondarySnake;
    this.props.secondaryPascal = secondaryPascal;
    this.props.secondaryKeySnake = secondaryKeySnake;

    let _this = this;

    const modifyExistingDestFile = (filename, withThis) => {
      let filePath = _this.destinationPath(filename);
      if (_this.fs.exists(filePath)) {
        var fileString = _this.fs.read(_this.destinationPath(filename));
        let newFileString = withThis(fileString);
        if (newFileString) {
          _this.fs.write(_this.destinationPath(filename), newFileString);
        }
      } else {
        throw new Error(
          `No se encuentra el archivo ${filePath}. ¿Ha ejecutado el crud generator que genera el mismo?`
        );
      }
    };

    modifyExistingDestFile(`resources/${primarySnake}.py`, primaryResource => {
      var resource = primaryResource;

      resource =
        `from models.${secondarySnake} import ${secondaryPascal}Model\n` + resource;

      let reqparseInsert = _this.fs.read(_this.templatePath('reqparse_insert.ejs'));
      resource = utils.insertBefore(resource, '    @jwt_required', reqparseInsert);

      resource = utils.insertAfter(
        resource,
        ` data = ${primaryPascal}.parser.parse_args()`,
        `\n\n        ${secondarySnake}s = data.pop('${secondarySnake}s')`
      );

      let validationInsert = _this.fs.read(_this.templatePath('validation_insert.ejs'));

      resource = utils.insertAfter(
        resource,
        `        ${primarySnake} = ${primaryPascal}Model(**data)`,
        validationInsert
      );

      return ejs.render(resource, _this.props);
    });

    modifyExistingDestFile(`models/${primarySnake}.py`, primaryModel => {
      var model = primaryModel;

      model = `from models.${secondarySnake} import ${secondaryPascal}Model\n` + model;

      model = utils.insertBefore(
        model,
        '    def __init__',
        `    ${secondarySnake}s = db.relationship(${secondaryPascal}Model, secondary="${
          _this.props.associationTable
        }")\n\n`
      );

      model = utils.insertAfter(
        model,
        `def json(self):${os.EOL}        return {`,
        `\n            '${secondarySnake}s': [i.json() for i in self.${secondarySnake}s],`
      );

      return ejs.render(model, _this.props);
    });

    modifyExistingDestFile(
      `models/${associationTableSnake}.py`,
      associationTableModel => {
        var newAssociationTableModel = associationTableModel;

        newAssociationTableModel = `from models.${primarySnake} import ${primaryPascal}Model\n${newAssociationTableModel}`;
        newAssociationTableModel = `from models.${secondarySnake} import ${secondaryPascal}Model\n${newAssociationTableModel}`;

        const addForeignKeyRef = (snake, pascal, key) => {
          let match = newAssociationTableModel.match(`${snake} = db.Column\\(db.*\\)`);
          let sliced = match[0].slice(0, match[0].length - 1);
          newAssociationTableModel = utils.insertAfter(
            newAssociationTableModel,
            sliced,
            `, db.ForeignKey(${pascal}Model.${key})`
          );
        };

        addForeignKeyRef(primaryForeignKeySnake, primaryPascal, primaryKeySnake);
        addForeignKeyRef(secondaryForeignKeySnake, secondaryPascal, secondaryKeySnake);

        const addRelationship = (snake, pascal) => {
          if (newAssociationTableModel.indexOf(`${snake} = db.relationship`) === -1) {
            newAssociationTableModel = utils.insertBefore(
              newAssociationTableModel,
              '    def __init__',
              `    ${snake} = db.relationship('${pascal}Model', uselist=False)\n\n`
            );
          }
        };

        addRelationship(primarySnake, primaryPascal);
        addRelationship(secondarySnake, secondaryPascal);

        return newAssociationTableModel;
      }
    );
  }
};
