import time
from functools import wraps
import datetime
import decimal
import hashlib

from flask import request
from flask.json import JSONEncoder, JSONDecoder
# Define custom JSONEncoder for the ISO Datetime format
from flask_jwt_extended import get_jwt_identity, get_jwt
from flask_restful.reqparse import Namespace
from json.decoder import WHITESPACE


class JSONEncoder(JSONEncoder):
    def default(self, obj):
        try:
            if isinstance(obj, datetime.date):
                return obj.isoformat()
            elif isinstance(obj, decimal.Decimal):
                return float(obj)
            iterable = iter(obj)
        except TypeError:
            pass
        else:
            return list(iterable)
        return JSONEncoder.default(self, obj)


class JSONDecoder(JSONDecoder):

    unicode_replacements = {
        '\u2018': "'", '\u2019': "'"
    }

    def __init__(self, *args, **kwargs):
        self.orig_obj_hook = kwargs.pop("object_hook", None)
        super(JSONDecoder, self).__init__(*args, object_hook=self.custom_obj_hook, strict=False, **kwargs)

    def decode(self, s, _w=WHITESPACE.match):
        for rk in self.unicode_replacements.keys():
            s = s.replace(rk, self.unicode_replacements.get(rk))
        # if max(s) > u'\u00FF':
        #     print(f'Unicode out of range in {s.index(max(s))}. Deleting that character and continuing')
        return super().decode(s, _w)

    def custom_obj_hook(self, dct):
        # Calling custom decode function:4
        if self.orig_obj_hook:  # Do we have another hook to call?
            return self.orig_obj_hook(dct)  # Yes: then do it
        return dct  # No: just return the decoded dict


# return a long representations of the current time in milliseconds
def current_time_milliseconds():
    return int(round(time.time() * 1000))


# Generate a 'unique' md5 hash adding the current time in milliseconds
# to a string
def unique_md5(string: str):
    m = hashlib.md5()
    m.update(f'{current_time_milliseconds()}{string}'.encode())
    return m.hexdigest()


# Utility function to only execute and assigment to an object if the value from a reqparse.Namespace dict is not None
def _assign_if_something(obj: object, newdata: Namespace, key: str):
    value = newdata.get(key)
    if value is not None:
        obj.__setattr__(key, value)


# Apply filter restrictions
def restrict(query, filters, name, condition):
    f = filters.get(name)
    if f:
        query = query.filter(condition(f))
    return query


# Encrypt password
def sha1_pass(text: str):
    m = hashlib.sha1()
    m.update(text.encode('utf-8'))
    d = m.digest()
    t = ''
    for aux in d:
        c: int = aux & 0xff
        hs = '{:02x}'.format(c)
        t += hs
    return t


def check(permision):
    def wrfunc(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            usuario = get_jwt_identity()
            if usuario is None:
                return {'message': 'No tiene permisos para realizar esta acción'}, 401
            claims = get_jwt()
            if permision not in claims['permisions']:
                return {'message': 'No tiene permisos para realizar esta acción'}, 401
            return fn(*args, **kwargs)
        return wrapper
    return wrfunc


def paginated_results(query):
    pagination = request.args.get('pagination', 'true', str)
    jsondepth = request.args.get('jsondepth', 1, int)
    if pagination == 'true':
        paginated = query.paginate(page=request.args.get('page', 1, int))
        return {
            'page': paginated.page,
            'pages': paginated.pages,
            'items': [x.json(jsondepth) if jsondepth else x.json() for x in paginated.items]
        }
    else:
        return [x.json(jsondepth) if jsondepth else x.json() for x in query.all()]


