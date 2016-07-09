# Caveats for developing themes and plugins in Evolution

When developing themes or plugins yourself, it's important that you understand how Evolution handles the _core wordpress code_.

Traditionally in a wordpress site, _your_ code would be mixed in with wordpress' core files, and any time you upgrade wordpress, you'd see a flood of file changes and deletions...all of which need to be committed to version control.

Evolution takes a different approach, and _isolates_ the wordpress core files into the `web/wp/` directory. Because these files are (1) dynamically pulled in with bower and (2) ignored by git, the core files are _never versioned_ and **should never have to be modified** by you.

> **Sidenote:** This means that, if you upgrade Wordpress through the built-in dashboard, you should either (a) [regenerate your site](./TUTORIAL-UPGRADE.md) or (b) manually update the wordpress version in your `bower.json` file.
> 
> Failing to do this could cause a subsequent deployment to accidentally _downgrade_ your current wordpress installation.

Any themes, plugins, and uploaded content are stored separately in `web/wp-content`:

```
. <- project root
└── web
    ├── wp <- wordpress core files, managed by bower and git-ignored
    └── wp-content
        ├── plugins <- plugins get installed here
        ├── themes <- themes get installed here
        └── uploads <- uploaded content gets saved here
```

Now, what does all of this mean for _developing_ your own themes and plugins?

### Filesystem paths

When you work directly with the filesystem, or include php files, be aware of the separate directories noted above, and _use path constants_ as often as possible:

* `ABSPATH` - This is the filesystem path to the (git-ignored and bower-managed) core wordpress files.
* `WP_CONTENT_DIR` - This is the filesystem path to installed themes/plugins, and stored upload content. **In most cases, this is the one to use in your theme and plugin code.**

Most other constants defined by the core wordpress code (`WP_PLUGIN_DIR`, for example) are built on top of `WP_CONTENT_DIR`.

### Home vs site URLs

The difference between home and site URLs is [thoroughly explained here](http://pressing-matters.io/using-wp_siteurl-and-wp_home-to-migrate-a-wordpress-site/), but the short version goes like this:

* The home url is _where you want visitors to reach your blog_. 
* The site url is literally _where your wordpress core files are installed_.

It may not seem like it, but **this is a very important distinction**.

From within your themes and plugins, you should _always_ use the `WP_HOME` constant or [`home_url()`](http://codex.wordpress.org/Function_Reference/home_url) API function when linking to the user-facing site.