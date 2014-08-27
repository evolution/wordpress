[<%= props.name %>][<%= props.domain %>]
<%= new Array(props.name.length + props.domain.length + 5).join('=') %>

> Powered by [Evolution WordPress <%= props.evolution %>][evolution-wordpress]

<%= readmeFile %>
[<%= props.domain %>]: http://<%= props.domain %>/
[evolution-wordpress]: https://github.com/evolution/wordpress/
