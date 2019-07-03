#!/bin/bash
BASEDIR="$(dirname $0)"
virtualenv $BASEDIR/venv
source $BASEDIR/venv/bin/activate
cd $BASEDIR
pip install -r requirements.txt
