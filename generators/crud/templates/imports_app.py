<%_ if(columns.length > 0) { -%>
from resources.<%=snakeCase%> import <%=pascalCase%>, <%=pascalCase%>List
<%_ } else { -%>
from resources.<%=snakeCase%> import <%=pascalCase%>List
<%_ } -%>