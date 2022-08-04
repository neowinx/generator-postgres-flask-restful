import base64

from flask_restful.reqparse import Namespace

from db import db
<%_ var alreadyAdded = [] -%>
<%_ columns.filter(col => col.fkInfo).forEach(col => { -%>
    <%_ if(!alreadyAdded.includes(col.fkInfo.originName)) { -%>
from models.<%= col.fkInfo.originNameSnakeCase %> import <%= col.fkInfo.originNamePascalCase %>Model
        <%_ alreadyAdded.push(col.fkInfo.originName) -%>
    <%_ } -%>
<%_ }) -%>
from utils import _assign_if_something


class <%=pascalCase%>Model(db.Model):
    __tablename__ = '<%=tableName%>'
    <%_ if(schemaName != 'public') { -%>
    __table_args__ = {"schema": "<%=schemaName%>"}
    <%_ } -%>

    <%_ columns.forEach(col => { -%>
    <%_   if(pk.includes(col.columnName)) { -%>
    <%=col.columnNameSnakeCase%> = db.Column(db.<%=col.sqlAlchemyType%>, primary_key=True)
    <%_   } else if(col.fkInfo) { -%>
    <%=col.columnNameSnakeCase%> = db.Column(db.<%=col.sqlAlchemyType%>, db.ForeignKey(<%= col.fkInfo.originNamePascalCase %>Model.<%= col.fkInfo.originColumn %>))
    <%_   } else { -%>
    <%=col.columnNameSnakeCase%> = db.Column(db.<%=col.sqlAlchemyType%>)
    <%_   } -%>
    <%_ }) -%>

    <%_ columns.filter(col => col.fkInfo).forEach(col => { -%>
        <%_ let attrName -%>
        <%_ if(col.fkInfo.hasSiblings) { -%>
            <%_ attrName = `${col.fkInfo.dependentColumnSnakeCase}_${col.fkInfo.originNameSnakeCase}` -%>
        <%_ } else { -%>
            <%_ attrName = col.fkInfo.originNameSnakeCase -%>
        <%_ } -%>
    <%= attrName %> = db.relationship('<%= col.fkInfo.originNamePascalCase %>Model', foreign_keys=[<%= col.fkInfo.dependentColumnSnakeCase %>], uselist=False)
    <%_ }) -%>

    <%_ if(columns.length > 0) {
        columnsArgs = columns.map(col => col.columnNameSnakeCase).join(', ') -%>
    def __init__(self, <%=columnsArgs%>):
        <%_ columns.forEach(col =>{ -%>
        self.<%=col.columnNameSnakeCase%> = <%=col.columnNameSnakeCase%>
        <%_ }) -%>
    <%_ } -%>

    def json(self, jsondepth=0):
        json = {
    <%_ columns.filter(col => !col.fkInfo).forEach(col => { -%>
        <%_ if(col.pythonType === 'bytearray') { -%>
            '<%=col.columnNameSnakeCase%>': base64.b64encode(self.<%=col.columnNameSnakeCase%>).decode() if self.<%=col.columnNameSnakeCase%> else None,
        <%_ } else { -%>
            '<%=col.columnNameSnakeCase%>': self.<%=col.columnNameSnakeCase%>,
        <%_ } -%>
    <%_})-%>
        }

        <%_ columns.filter(col => col.fkInfo).forEach(col => { -%>
        if jsondepth > 0:
            <%_ let attrName -%>
            <%_ if(col.fkInfo.hasSiblings) { -%>
                <%_ attrName = `${col.fkInfo.dependentColumnSnakeCase}_${col.fkInfo.originNameSnakeCase}` -%>
            <%_ } else { -%>
                <%_ attrName = col.fkInfo.originNameSnakeCase -%>
            <%_ } -%>
            if self.<%= attrName %>:
                json['<%= attrName %>'] = self.<%= attrName %>.json(jsondepth - 1)

        <%_ }) -%>
        return json

    <%_ if(columns.length > 0) {
        firstColumn = columns[0].columnNameSnakeCase -%>
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
        for no_pk_key in [<%-columns.filter(c => !pk.includes(c.columnName)).map(c => `'${ c.columnNameSnakeCase }'`)%>]:
            _assign_if_something(self, newdata, no_pk_key)

