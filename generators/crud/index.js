'use strict';
const Generator = require('yeoman-generator');
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
    this.log(
      yosay(
        'Generador ' +
          chalk.yellow('crud') +
          ' ' +
          chalk.green('postgresql-flask-vue-coreui') +
          '!'
      )
    );

    let questions = [
      {
        type: 'input',
        name: 'host',
        message: 'Ingrese el host',
        default: 'localhost'
      },
      {
        type: 'input',
        name: 'port',
        message: 'Ingrese el puerto',
        default: 5432
      },
      {
        type: 'input',
        name: 'database',
        message: 'Ingrese el nombre de la base de datos',
        default: 'postgres'
      },
      {
        type: 'input',
        name: 'user',
        message: 'Ingrese el usuario',
        default: 'postgres'
      },
      {
        type: 'input',
        name: 'password',
        message: 'Ingrese el password',
        default: 'postgres'
      },
      {
        type: 'input',
        name: 'schema',
        message: 'Ingrese el esquema al que quiere conectar',
        default: 'public'
      }
    ];

    questions = promptSuggestion.prefillQuestions(this._globalConfig, questions);
    questions = promptSuggestion.prefillQuestions(this.config, questions);

    const prompts = new Rx.Subject();

    let i = 0;

    let prmp = inquirer.prompt(prompts);

    let massiveInst;

    prmp.ui.process.subscribe(answer => {
      if (answer.name === 'continue') {
        if (answer.answer.toUpperCase() === 'N') {
          process.exit(0);
        }
      } else if (answer.name === 'tables') {
        prompts.complete();
      }
      if (i < questions.length) {
        prompts.next(questions[i++]);
      } else {
        console.log('connecting...');
        if (!massiveInst) {
          let opts = prmp.ui.answers;
          opts.excludeFunctions = true;
          massiveInst = massive(opts, { allowedSchemas: prmp.ui.answers.schema });
        }
        massiveInst
          .then(db => {
            this.log('connected.', db);
            this.db = db;
            var tablas =
              prmp.ui.answers.schema === db.currentSchema
                ? db.listTables().map(t => db.currentSchema + '.' + t)
                : db.listTables().filter(t => t.startsWith(prmp.ui.answers.schema));
            if (tablas.length > 0) {
              prompts.next({
                type: 'checkbox',
                name: 'tables',
                message: 'Seleccione las tablas a generar artefactos',
                choices: tablas
              });
            } else {
              prompts.complete();
            }
          })
          .catch(error => {
            this.log('error al conectar la base de datos:' + error);
            prompts.next({
              type: 'input',
              name: 'continue',
              message: '¿Desea intentarlo de nuevo? S/N',
              default: 'S'
            });
          });
      }
    });

    prompts.next(questions[i++]);

    return prmp.then(props => {
      if (!this.options['skip-cache']) {
        let ansprops = Object.assign({}, props);
        delete ansprops.tables;
        delete ansprops.enableFunctions;
        promptSuggestion.storeAnswers(this._globalConfig, questions, ansprops, false);
        promptSuggestion.storeAnswers(this.config, questions, ansprops, true);
      }
      this.props = props;
    });
  }

  writing() {
    function pgToSQLAlchemyType(pgType) {
      if (pgType.startsWith('character varying'))
        return pgType.replace('character varying', 'String');
      if (['int', 'integer'].includes(pgType)) return 'Integer';
      if (pgType === 'bigint') return 'BigInteger';
      if (pgType === 'boolean') return 'Boolean';
      if (pgType === 'date') return 'Date';
      if (pgType.startsWith('timestamp')) return 'DateTime';
    }
    function pgToPythonType(pgType) {
      if (pgType.startsWith('character varying')) return 'str';
      if (['int', 'integer'].includes(pgType)) return 'int';
      if (pgType === 'bigint') return 'int';
      if (pgType === 'boolean') return 'bool';
      if (pgType === 'date') return 'date';
      if (pgType.startsWith('timestamp')) return 'datetime';
    }
    function pgToSwaggType(pgType) {
      if (pgType.startsWith('character varying')) return 'string';
      if (['int', 'integer'].includes(pgType)) return 'int';
      if (pgType === 'bigint') return 'int64';
      if (pgType === 'boolean') return 'boolean';
      if (pgType === 'date') return 'date';
      if (pgType.startsWith('timestamp')) return 'datetime';
    }
    this.props.tables.forEach(tableNameWithSchema => {
      let tableName = tableNameWithSchema.replace(`${this.props.schema}.`, '');
      let paramCase = changeCase.paramCase(tableName);
      let pascalCase = changeCase.pascalCase(tableName);
      let titleCase = changeCase.titleCase(tableName);
      let snakeCase = changeCase.snakeCase(tableName);
      let table =
        this.props.schema === this.db.currentSchema
          ? this.db[tableName]
          : this.db[this.props.schema][tableName];
      console.log('Instrocpecting column types...');
      this.db
        .query(
          `SELECT
          a.attname                                       as "columnName",
          pg_catalog.format_type(a.atttypid, a.atttypmod) as "dataType"
        FROM
          pg_catalog.pg_attribute a
        WHERE
          a.attnum > 0
          AND NOT a.attisdropped
          AND a.attrelid = (
            SELECT c.oid
            FROM pg_catalog.pg_class c
              LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname ~ '^(${tableName})$' AND n.nspname = '${this.props.schema}');`
        )
        .then(colInfo => {
          if (!colInfo && colInfo.length <= 0) return;
          colInfo.forEach(ci => {
            ci.sqlAlchemyType = pgToSQLAlchemyType(ci.dataType);
            if (
              ci.sqlAlchemyType &&
              ci.sqlAlchemyType.startsWith('String') &&
              ci.sqlAlchemyType.indexOf('(') > -1
            ) {
              ci.stringTypeLength = ci.sqlAlchemyType.substring(
                ci.sqlAlchemyType.indexOf('(') + 1,
                ci.sqlAlchemyType.indexOf(')')
              );
            }
            ci.swaggerType = pgToSwaggType(ci.dataType);
            ci.pythonType = pgToPythonType(ci.dataType);
          });
          let templateData = {
            schemaName: this.props.schema,
            tableName: tableName,
            paramCase: paramCase,
            pascalCase: pascalCase,
            titleCase: titleCase,
            snakeCase: snakeCase,
            columns: colInfo ? colInfo : [],
            pk: table ? table.pk : []
          };
          this.fs.copyTpl(
            this.templatePath('model.py'),
            this.destinationPath(`models/${snakeCase}.py`),
            templateData
          );
          this.fs.copyTpl(
            this.templatePath('resource.py'),
            this.destinationPath(`resources/${snakeCase}.py`),
            templateData
          );
          this.fs.copyTpl(
            this.templatePath('list.yaml'),
            this.destinationPath(`swagger/${snakeCase}/list_${snakeCase}.yaml`),
            templateData
          );
          this.fs.copyTpl(
            this.templatePath('get.yaml'),
            this.destinationPath(`swagger/${snakeCase}/get_${snakeCase}.yaml`),
            templateData
          );
          this.fs.copyTpl(
            this.templatePath('post.yaml'),
            this.destinationPath(`swagger/${snakeCase}/post_${snakeCase}.yaml`),
            templateData
          );
          this.fs.copyTpl(
            this.templatePath('put.yaml'),
            this.destinationPath(`swagger/${snakeCase}/put_${snakeCase}.yaml`),
            templateData
          );
          this.fs.copyTpl(
            this.templatePath('delete.yaml'),
            this.destinationPath(`swagger/${snakeCase}/delete_${snakeCase}.yaml`),
            templateData
          );

          if (this.fs.exists(this.destinationPath('app.py'))) {
            var appPy = this.fs.read(this.destinationPath('app.py'));
            let importsApp = this.fs.read(this.templatePath('imports_app.py'));
            let appendResourceApp = this.fs.read(
              this.templatePath('append_resource_app.py')
            );

            if (!this.dbURLChanged) {
              let dbURL =
                `postgresql://${this.props.user}:${this.props.password}` +
                `@${this.props.host}:${this.props.port}/${this.props.database}`;
              let dbURLStart = appPy.indexOf('SQLALCHEMY_DATABASE_URI');
              if (dbURLStart !== -1) {
                let dbURLEnd = appPy.indexOf(')', dbURLStart);
                let dbURLBefore = appPy.substring(0, dbURLStart);
                let dbURLAfter = appPy.substring(dbURLEnd);
                appPy = dbURLBefore + `SQLALCHEMY_DATABASE_URI', '${dbURL}'` + dbURLAfter;
              }
              this.dbURLChanged = true;
            }

            let mainIfIndex = appPy.indexOf(`if __name__ == '__main__'`);

            if (mainIfIndex === -1) {
              mainIfIndex = appPy.length;
            }

            let appPyBefore = appPy.substring(0, mainIfIndex - 1);
            let appPyAfter = appPy.substring(mainIfIndex);

            this.fs.write(
              this.destinationPath('app.py'),
              ejs.render(
                importsApp + appPyBefore + appendResourceApp + appPyAfter,
                templateData
              )
            );
          }
        });
    });
  }
};
