<%_ if(columns.length > 0) { -%>
from resources.<%=snakeCase%> import <%=pascalCase%>, <%=pascalCase%>List, <%=pascalCase%>Search
<%_ } else { -%>
from resources.<%=snakeCase%> import <%=pascalCase%>List
<%_ } -%>
