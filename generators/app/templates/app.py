import os
from db import db
from flasgger import Swagger, swag_from
from flask import Flask, jsonify, request, redirect
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, jwt_required, create_access_token,
    get_jwt_identity,
    get_raw_jwt)
from flask_restful import Api, Resource
from utils import JSONEncoder, unique_md5, JSONDecoder

app = Flask(__name__)
CORS(app, supports_credentials=True)
api = Api(app, errors={
    'NoAuthorizationError': {
        "message": "Request does not contain an access token.",
        'error': 'authorization_required',
        'status': 401
    }
})

app.config['RESTFUL_JSON'] = {'cls': JSONEncoder}
app.json_encoder = JSONEncoder
app.json_decoder = JSONDecoder


@app.errorhandler(404)
def handle_auth_error(e):
    return jsonify({
        "description": "You seem lost...",
        'error': 'resource_not_found'
    }), 404


@app.errorhandler(400)
def handle_auth_error(e):
    return jsonify({
        "description": "I don't understand this, please send it right.. appreciated!",
        'error': 'bad_request'
    }), 404


# Function to facilitate the app configuration from environment variables
def env_config(name, default):
    app.config[name] = os.environ.get(name, default=default)


# Database config
env_config('SQLALCHEMY_DATABASE_URI', 'postgresql://postgres:postgres@localhost:5432/database')
# app.config['SQLALCHEMY_BINDS'] = {
#     'anotherdb':        'postgresql://postgres:postgres@localhost:5432/anotherdb'
# }
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PROPAGATE_EXCEPTIONS'] = True
app.config['SQLALCHEMY_ECHO'] = False


# Swagger config
app.config['SWAGGER'] = {
    'title': '<%=projectName%>',
    'version': '2.0.0',
    'description': 'API de servicios REST en Flask',
    'uiversion': 2,
    'tags': [{'name': 'jwt'}]
}
swagger = Swagger(app)


# Setup the Flask-JWT-Extended extension
app.config['JWT_SECRET_KEY'] = 'super-secret'
app.config['JWT_ERROR_MESSAGE_KEY'] = 'error'
app.config['JWT_BLACKLIST_ENABLED'] = True
app.config['JWT_BLACKLIST_TOKEN_CHECKS'] = ['access', 'refresh']
jwt = JWTManager(app)

# tokens blacklist (replace this with database table or a redis cluster in production)
blacklist = set()


@jwt.token_in_blacklist_loader
def check_if_token_in_blacklist(decrypted_token):
    jti = decrypted_token['jti']
    return jti in blacklist


######################
# Application routes #
######################

@app.route('/')
def welcome():
    return redirect("/apidocs", code=302)


# Provide a method to create access tokens. The create_access_token()
# function is used to actually generate the token, and you can return
# it to the caller however you choose.
@app.route('/login', methods=['POST'])
@swag_from('swagger/flask_jwt_extended/login.yaml')
def login():
    if not request.is_json:
        return jsonify({"error": "Bad request"}), 400

    username = request.json.get('username', None)
    password = request.json.get('password', None)
    if not username or not password:
        return jsonify({"error": "Bad username or password. This incident will be registered"}), 400

    if username != 'test' or password != 'test':
        return jsonify({"error": "Bad username or password. This incident will be registered"}), 401

    # Identity can be any data that is json serializable
    access_token = create_access_token(identity=username)
    return jsonify(access_token=access_token), 200


@app.route('/logout', methods=['DELETE'])
@jwt_required
@swag_from('swagger/flask_jwt_extended/logout.yaml')
def logout():
    jti = get_raw_jwt()['jti']
    blacklist.add(jti)
    return jsonify({"msg": "Successfully logged out"}), 200


# Protect a view with jwt_required, which requires a valid access token
# in the request to access.
@app.route('/protected', methods=['GET'])
@jwt_required
@swag_from('swagger/protected/example.yaml')
def protected():
    # Access the identity of the current user with get_jwt_identity
    current_user = get_jwt_identity()
    return jsonify(logged_in_as=current_user), 200


if __name__ == '__main__':
    db.init_app(app)
    app.run(host=os.environ.get("FLASK_HOST", default="localhost"), port=os.environ.get("FLASK_PORT", default=5000))
# ONLY UNCOMMENT THIS IF DEBUGGING THROUGH PYCHARM
# else:
#     db.init_app(app)

