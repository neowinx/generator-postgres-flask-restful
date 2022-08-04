from flask_restful.reqparse import Namespace
from flask_sqlalchemy import SQLAlchemy
from utils import _assign_if_something

db = SQLAlchemy()


class BaseModel(db.Model):
    __abstract__ = True
    __no_pks__ = None

    def save_to_db(self):
        db.session.add(self)
        db.session.commit()

    def delete_from_db(self):
        db.session.delete(self)
        db.session.commit()

    @classmethod
    def from_reqparse(cls, instance, newdata: Namespace):
        if not cls.__no_pks__:
            cls.__no_pks__ = list(map(lambda c: c.name, filter(lambda c: not getattr(c, 'primary_key'), cls.__table__.columns)))
        for no_pk in cls.__no_pks__:
            _assign_if_something(instance, newdata, no_pk)

    @classmethod
    def find_all(cls):
        return cls.query.all()

