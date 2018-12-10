const massive = require('massive');

var targetSchema = 'public';

let db = massive(
  {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  },
  {
    allowedSchemas: targetSchema
  }
);

console.log('connecting to target schema:', targetSchema);

db.then(db => {
  console.log('connected!');
  console.log(db);
  db.query('show search_path;').then(testo => {
    console.log(testo);
  });
}).catch(error => {
  console.log('errors ocurred:');
  console.log(error);
});
