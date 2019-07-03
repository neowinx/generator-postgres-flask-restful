import time

import datetime
import decimal
import hashlib
from flask.json import JSONEncoder, JSONDecoder
# Define custom JSONEncoder for the ISO Datetime format
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

