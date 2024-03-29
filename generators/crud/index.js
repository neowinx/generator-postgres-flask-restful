'use strict';
const Generator = require('yeoman-generator');
const os = require('os');
const chalk = require('chalk');
const yosay = require('yosay');
const changeCase = require('change-case');
const { titleCase } = require('title-case');
const ejs = require('ejs');
const Rx = require('rxjs');
const inquirer = require('inquirer');
inquirer.registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));
const massive = require('massive');
const promptSuggestion = require('yeoman-generator/lib/util/prompt-suggestion');

module.exports = class extends Generator {
  prompting() {
    this.log(
      yosay(
        'Generador ' +
          chalk.yellow('crud') +
          ' ' +
          chalk.green('postgresql-flask-restful') +
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
        default: 'avalon'
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
        this.log('connecting...');
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
                type: 'checkbox-plus',
                name: 'tables',
                message: 'Seleccione las tablas a generar artefactos',
                searchable: true,
                source: async (_, input) =>
                  tablas.filter(t => t.includes(input ? input : ''))
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

  async writing() {
    function pgToSQLAlchemyType(pgType) {
      if (pgType.startsWith('character varying'))
        return pgType.replace('character varying', 'String');
      if (pgType.startsWith('character')) return 'String';
      if (['text', 'json'].includes(pgType)) return 'String';
      if (['int', 'integer', 'smallint'].includes(pgType)) return 'Integer';
      if (['float', 'double precision'].includes(pgType)) return 'Float';
      if (pgType === 'decimal' || pgType.startsWith('numeric')) return 'Numeric';
      if (pgType === 'bigint') return 'BigInteger';
      if (pgType === 'boolean') return 'Boolean';
      if (pgType === 'date') return 'Date';
      if (pgType === 'bytea') return 'LargeBinary';
      if (pgType.startsWith('timestamp')) return 'DateTime';
    }

    function pgToPythonType(pgType) {
      if (pgType.startsWith('character varying')) return 'str';
      if (pgType.startsWith('character')) return 'str';
      if (['text', 'json'].includes(pgType)) return 'str';
      if (['int', 'integer', 'smallint'].includes(pgType)) return 'int';
      if (
        ['float', 'double precision', 'decimal'].includes(pgType) ||
        pgType.startsWith('numeric')
      )
        return 'float';
      if (pgType === 'bigint') return 'int';
      if (pgType === 'boolean') return 'bool';
      if (pgType === 'date') return 'date';
      if (pgType === 'bytea') return 'bytearray';
      if (pgType.startsWith('timestamp')) return 'datetime';
    }

    function pgToSwaggType(pgType) {
      if (pgType.startsWith('character varying')) return 'string';
      if (pgType.startsWith('character')) return 'string';
      if (['text', 'json'].includes(pgType)) return 'string';
      if (['int', 'integer', 'smallint'].includes(pgType)) return 'int';
      if (
        ['float', 'double precision', 'decimal'].includes(pgType) ||
        pgType.startsWith('numeric')
      )
        return 'float';
      if (pgType === 'bigint') return 'int64';
      if (pgType === 'boolean') return 'boolean';
      if (pgType === 'date') return 'date';
      if (pgType === 'bytea') return 'byte';
      if (pgType.startsWith('timestamp')) return 'datetime';
    }

    function insertBefore(txt, search, insert) {
      let position = txt.indexOf(search);
      return [txt.slice(0, position), insert, txt.slice(position)].join('');
    }

    function insertAfter(txt, search, insert) {
      let position = txt.indexOf(search) + search.length;
      return [txt.slice(0, position), insert, txt.slice(position)].join('');
    }

    function columnInfoQuery(table, schema) {
      return `SELECT
          a.attname                                       as "columnName",
          pg_catalog.format_type(a.atttypid, a.atttypmod) as "dataType",
          a.attnotnull                                    as "notNull"
        FROM
          pg_catalog.pg_attribute a
        WHERE
          a.attnum > 0
          AND NOT a.attisdropped
          AND a.attrelid = (
            SELECT c.oid
            FROM pg_catalog.pg_class c
              LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname ~ '^(${table})$' AND n.nspname = '${schema}');`;
    }

    this.log('instrocpecting column types...');

    for (const tableNameWithSchema of this.props.tables) {
      let tableName = tableNameWithSchema.replace(`${this.props.schema}.`, '');
      let paramCase = changeCase.paramCase(tableName);
      let pascalCase = changeCase.pascalCase(tableName);
      let titleCaseName = titleCase(tableName);

      let snakeCase = changeCase.snakeCase(tableName);
      let table =
        this.props.schema === this.db.currentSchema
          ? this.db[tableName]
          : this.db[this.props.schema][tableName];

      /* eslint-disable no-await-in-loop */
      const colInfo = await this.db.query(columnInfoQuery(tableName, this.props.schema));

      if (!colInfo && colInfo.length <= 0) return;

      for (const ci of colInfo) {
        ci.columnNameSnakeCase = changeCase.snakeCase(ci.columnName);
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

        // Foreign keys info processing
        const fks = table.fks.filter(fk => fk.dependent_columns.includes(ci.columnName));

        // This generator only generates foreign key info for single dependent and
        // origin columns
        const fkss = fks.filter(
          fk => fk.dependent_columns.length === 1 && fk.origin_columns.length === 1
        );
        if (fkss.length > 0) {
          // Exract the dependent column and cases for it
          const originTable = this.db[fkss[0].origin_name];
          const originColumnInfo = await this.db.query(
            columnInfoQuery(originTable.name, fkss[0].origin_schema)
          );
          originTable.columns.forEach(c => {
            const maybeDt = originColumnInfo.filter(cd => cd.columnName === c.name);
            c.dataType = maybeDt.length > 0 ? maybeDt[0].dataType : null;
          });

          const maybeLabels = originTable.columns
            .filter(
              c =>
                !originTable.pk.includes(c.name) && pgToPythonType(c.dataType) === 'str'
            )
            .map(c => c.name);
          ci.fkInfo = {
            dependentColumn: fkss[0].dependent_columns[0],
            originColumn: fkss[0].origin_columns[0],
            originName: fkss[0].origin_name,
            originSchema: fkss[0].origin_schema,
            labelAttr: maybeLabels.length > 0 ? maybeLabels[0] : null
          };
          ci.fkInfo.originColumnSnakeCase = changeCase.snakeCase(ci.fkInfo.originColumn);
          ci.fkInfo.originNamePascalCase = changeCase.pascalCase(ci.fkInfo.originName);
          ci.fkInfo.originNameSnakeCase = changeCase.snakeCase(ci.fkInfo.originName);
          ci.fkInfo.dependentColumnSnakeCase = changeCase.snakeCase(
            ci.fkInfo.dependentColumn
          );
          ci.fkInfo.hasSiblings =
            table.fks.filter(fk => fk.origin_name === ci.fkInfo.originName).length > 1;

          if (ci.fkInfo.hasSiblings) {
            ci.fkInfo.attrName = `${ci.fkInfo.dependentColumnSnakeCase}_${ci.fkInfo.originNameSnakeCase}`;
          } else {
            ci.fkInfo.attrName = ci.fkInfo.originNameSnakeCase;
          }
        }
      }

      let templateData = {
        schemaName: this.props.schema,
        tableName: tableName,
        paramCase: paramCase,
        pascalCase: pascalCase,
        titleCase: titleCaseName,
        snakeCase: snakeCase,
        columns: colInfo ? colInfo : [],
        pk: table ? table.pk : []
      };

      const temps = [
        { src: 'model.py', dest: `models/${snakeCase}.py` },
        { src: 'resource.py', dest: `resources/${snakeCase}.py` },
        { src: 'list.yaml', dest: `swagger/${snakeCase}/list_${snakeCase}.yaml` },
        { src: 'get.yaml', dest: `swagger/${snakeCase}/get_${snakeCase}.yaml` },
        { src: 'post.yaml', dest: `swagger/${snakeCase}/post_${snakeCase}.yaml` },
        { src: 'put.yaml', dest: `swagger/${snakeCase}/put_${snakeCase}.yaml` },
        { src: 'delete.yaml', dest: `swagger/${snakeCase}/delete_${snakeCase}.yaml` },
        { src: 'search.yaml', dest: `swagger/${snakeCase}/search_${snakeCase}.yaml` },
        { src: 'meta.json.ejs', dest: `generator/${snakeCase}.meta.json` }
      ];

      for (const tmp of temps) {
        this.fs.copyTpl(
          this.templatePath(tmp.src),
          this.destinationPath(tmp.dest),
          templateData
        );
      }

      if (this.fs.exists(this.destinationPath('app.py'))) {
        var appPy = this.fs.read(this.destinationPath('app.py'));

        if (appPy.indexOf(`api.add_resource(${pascalCase}List,`) === -1) {
          let appendResourceApp = this.fs.read(
            this.templatePath('append_resource_app.py')
          );
          if (appPy.indexOf(`if __name__ == '__main__'`) > -1) {
            appPy = insertBefore(appPy, `if __name__ == '__main__'`, appendResourceApp);
          }
        }

        let importsApp = this.fs.read(this.templatePath('imports_app.py'));
        let permisionsAppPy = this.fs.read(this.templatePath('permisions_app_py.ejs'));

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

        if (appPy.indexOf('permisions = [') > -1) {
          if (
            appPy
              .substring(appPy.indexOf('permisions = ['))
              .indexOf(`'${snakeCase}_search'`) === -1
          ) {
            appPy = insertAfter(appPy, `permisions = [${os.EOL}`, `${permisionsAppPy}`);
          }
        } else {
          appPy = insertBefore(
            appPy,
            'app = Flask(',
            `\npermisions = [\n${permisionsAppPy}]\n\n\n`
          );
        }

        if (appPy.indexOf('@jwt.additional_claims_loader') === -1) {
          appPy = insertAfter(
            appPy,
            'blacklist = set()',
            this.fs.read(this.templatePath('claim_loader_app_py.ejs'))
          );
        }

        this.fs.write(
          this.destinationPath('app.py'),
          ejs.render(importsApp + appPy, templateData)
        );
      }
    }
  }
};
