[<%- props.name %>][<%- props.domain %>]
<%- new Array(props.name.length + props.domain.length + 5).join('=') %>

> Powered by [Evolution WordPress][evolution-wordpress] *v<%- pkg.version %>*

<%- readmeFile %>
[<%- props.domain %>]: http://<%- props.domain %>/
[evolution-wordpress]: https://github.com/evolution/wordpress/
