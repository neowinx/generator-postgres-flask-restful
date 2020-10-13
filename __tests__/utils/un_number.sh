#!/bin/bash

USER=postgres
DATABASE=akatosh

function exit_if_null {
  if [ "$1" == ""  ]; then
    echo "no se encontro un parametro requerido"
    exit 1
  fi
}
function extract_csv_data {
  exit_if_null $1
  psql -U $USER -c "$1" -d $DATABASE --tuples-only --csv --output $2
}

echo "ejecutar lo siguiente para modificar las tablas de tipo numeric a bigint:"
echo ""

extract_csv_data "\dt" tables.csv

for t in $(cat tables.csv | cut -d, -f2); do	
  extract_csv_data "\d $t" columns.csv
  for c in $(cat columns.csv | grep numeric | cut -d, -f 1); do
    echo "alter table $t alter column $c type bigint;"
  done
done
