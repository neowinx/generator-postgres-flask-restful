<%_ if(columns.length > 0) {
    firstColumnName = columns[0].columnNameSnakeCase -%>
api.add_resource(<%=pascalCase%>, '/<%=snakeCase%>/<<%=firstColumnName%>>')
<%_ } -%>
api.add_resource(<%=pascalCase%>List, '/<%=snakeCase%>')
api.add_resource(<%=pascalCase%>Search, '/search/<%=snakeCase%>')

