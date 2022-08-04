<%_  const fkCols = columns.filter(col => col.fkInfo) -%>
import base64

from flask_restful.reqparse import Namespace

from db import db, BaseModel
<%_ var alreadyAdded = [] -%>
<%_ fkCols.filter(col => col.fkInfo).forEach(col => { -%>
    <%_ if(!alreadyAdded.includes(col.fkInfo.originName)) { -%>
from models.<%= col.fkInfo.originNameSnakeCase %> import <%= col.fkInfo.originNamePascalCase %>Model
        <%_ alreadyAdded.push(col.fkInfo.originName) -%>
    <%_ } -%>
<%_ }) -%>


class <%=pascalCase%>Model(BaseModel):
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

    <%_ fkCols.forEach(col => { -%>
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

        <% if(fkCols.length > 0) { %>if jsondepth > 0:<% } %>
        <%_ fkCols.forEach(col => { -%>
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

