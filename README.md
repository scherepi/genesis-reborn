# Genesis: Reborn

[Genesis](https://genesis.hackclub.com) was one of my first YSWS programs as a [Hack Club](https://hackclub.com) gap year, and now it's back in a whole different capacity. This repo provides the source code for its new website (and webOS), and may in future house the notes for the weekly lectures I'll be giving as part of the program. Thanks for taking a look!

## How to add an application:

I totally overengineered the webOS so that it's trivial to add a new application. All you have to do is either make a new HTML file in `os/apps` or specify an external URL to embed as an iframe, and then add a new entry to `os/data/manifest.json` with the details. Support for stylizing the window and window bars associated with your application is available and will be extended, allowing you to specify CSS-compliant style rules in the manifest entry for your application that will be applied to the relevant elements. Play around and have fun! Feel free to PR or fork this repository for whatever you may need.