#!/bin/bash
BASEDIR="$(dirname $0)/.."
virtualenv $BASEDIR/flask/venv
source $BASEDIR/flask/venv/bin/activate
cd $BASEDIR/flask
pip install -r requirements.txt
