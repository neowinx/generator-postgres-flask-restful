from flasgger import swag_from
from flask_jwt_extended import jwt_required
from flask_restful import Resource, reqparse
import logging 
from datetime import datetime
from models.<%=snakeCase%> import <%=pascalCase%>Model


class <%=pascalCase%>(Resource):

    parser = reqparse.RequestParser()
<%_ columns.forEach(col => { -%>
  <%_ if(col.pythonType === 'date') { -%>
    parser.add_argument('<%=col.columnName%>', type=lambda x: datetime.strptime(x, '%Y-%m-%d').date())
  <%_ } else if(col.pythonType === 'datetime') { -%>
    parser.add_argument('<%=col.columnName%>', type=lambda x: datetime.strptime(x, '%Y-%m-%dT%H:%M:%S'))
  <%_ } else { -%>
    parser.add_argument('<%=col.columnName%>', type=<%=col.pythonType%>)
  <%_ } -%>
<%_ }); -%>

<%_ if(columns.length > 0) { 
    firstColumnName = columns[0].columnName -%>
    @jwt_required
    @swag_from('../swagger/<%=snakeCase%>/get_<%=snakeCase%>.yaml')
    def get(self, <%=firstColumnName%>):
        <%=snakeCase%> = <%=pascalCase%>Model.find_by_<%=firstColumnName%>(<%=firstColumnName%>)
        if <%=snakeCase%>:
            return <%=snakeCase%>.json()
        return {'message': 'No se encuentra <%=titleCase%>'}, 404

    @jwt_required
    @swag_from('../swagger/<%=snakeCase%>/put_<%=snakeCase%>.yaml')
    def put(self, id):
        <%=snakeCase%> = <%=pascalCase%>Model.find_by_id(id)
        if <%=snakeCase%>:
            newdata = <%=pascalCase%>.parser.parse_args()
            <%=snakeCase%>.from_reqparse(newdata)
            <%=snakeCase%>.save_to_db()
            return <%=snakeCase%>.json()
        return {'message': 'No se encuentra <%=titleCase%>'}, 404

    @jwt_required
    @swag_from('../swagger/<%=snakeCase%>/delete_<%=snakeCase%>.yaml')
    def delete(self, <%=firstColumnName%>):
        <%=snakeCase%> = <%=pascalCase%>Model.find_by_<%=firstColumnName%>(<%=firstColumnName%>)
        if <%=snakeCase%>:
            <%=snakeCase%>.delete_from_db()

        return {'message': 'Se ha borrado <%=titleCase%>'}
<%_ } -%>


class <%=pascalCase%>List(Resource):

    @jwt_required
    @swag_from('../swagger/<%=snakeCase%>/list_<%=snakeCase%>.yaml')
    def get(self):
        return [x.json() for x in <%=pascalCase%>Model.find_all()]

<%_ if(columns.length > 0) { 
    firstColumnName = columns[0].columnName -%>
    @jwt_required
    @swag_from('../swagger/<%=snakeCase%>/post_<%=snakeCase%>.yaml')
    def post(self):
        data = <%=pascalCase%>.parser.parse_args()

        <%=firstColumnName%> = data.get('<%=firstColumnName%>')

        if <%=firstColumnName%> is not None and <%=pascalCase%>Model.find_by_<%=firstColumnName%>(<%=firstColumnName%>):
            return {'message': "Ya existe un <%=snakeCase%> con <%=firstColumnName%> '{}'.".format(<%=firstColumnName%>)}, 400

        <%=snakeCase%> = <%=pascalCase%>Model(**data)
        try:
            <%=snakeCase%>.save_to_db()
        except Exception as e:
            logging.error('Ocurrió un error al crear Cliente.', exc_info=e)
            return {"message": "Ocurrió un error al crear <%=titleCase%>."}, 500

        return <%=snakeCase%>.json(), 201
<%_ } -%>
