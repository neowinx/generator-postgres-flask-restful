from flask_restful.reqparse import Namespace

from db import db
from utils import _assign_if_something


class <%=pascalCase%>Model(db.Model):
    __tablename__ = '<%=tableName%>'
    <%_ if(schemaName != 'public') { -%>
    __table_args__ = {"schema":"<%=schemaName%>"}
    <%_ } -%>

    <%_ columns.forEach(col => { -%>
    <%_   if(pk.includes(col.columnName)) { -%>
    <%=col.columnName%> = db.Column(db.<%=col.sqlAlchemyType%>, primary_key=True)
    <%_   } else { -%>
    <%=col.columnName%> = db.Column(db.<%=col.sqlAlchemyType%>)
    <%_   } -%>
    <%_ }) -%>

    <%_ if(columns.length > 0) { 
        columnsArgs = columns.map(col => col.columnName).join(', ') -%>
    def __init__(self, <%=columnsArgs%>):
        <%_ columns.forEach(col =>{ -%>
        self.<%=col.columnName%> = <%=col.columnName%>
        <%_ }) -%>
    <%_ } -%>

    def json(self):
        return {
    <%_ columns.forEach(col => { -%>
            '<%=col.columnName%>': self.<%=col.columnName + ','%>
    <%_})-%>
        }

    <%_ if(columns.length > 0) {
        firstColumn = columns[0].columnName -%>
    @classmethod
    def find_by_<%=firstColumn%>(cls, <%=firstColumn%>):
        return cls.query.filter_by(<%=firstColumn%>=<%=firstColumn%>).first()
    <%_ } -%>

    @classmethod
    def find_all(cls):
        return cls.query.all()

    def save_to_db(self):
        db.session.add(self)
        db.session.commit()

    def delete_from_db(self):
        db.session.delete(self)
        db.session.commit()

    def from_reqparse(self, newdata: Namespace):
        for no_pk_key in <%-columns.filter(c => !pk.includes(c.columnName)).map(c => `'${ c.columnName }'`)%>:
            _assign_if_something(self, newdata, no_pk_key)

