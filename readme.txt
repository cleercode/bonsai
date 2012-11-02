Bonsai
======
by Chris Lee
12/2011

*Bonsai* is a web-based task/to-do list. It's inspired primarily by the Mac application The Hit List[1], but designed to be web-based so it can be accessed anywhere.

The goals with Bonsai were to produce a task list application that is:
* accessible from desktop and mobile devices with shared data
* completely keyboard-navigable
* based around separate lists that are optional to use
* based around organization by due date of tasks
* as minimalist in design as possible/reasonable given its feature set

This initial version of Bonsai is not feature-complete, but up to a respectable standard. It currently uses the Backbone.js[2] library, which implements a variant of the MVC framework on the client-side. It also uses an extension for Backbone.js that syncs models to the browser's HTML5 local storage. Other libraries used include jQuery[3], Underscore.js[4] (a utility library required for Backbone.js) and Date.js[5] (a date parsing and manipulation library used for due dates).

In future implementations, I hope to extend Bonsai with a server-based back-end, which might be based on Python or Node.js and would simply feature user authentication and allow the Backbone.js models to be synced to a database of some sort instead. This would allow users to view their tasks on multiple devices.

In addition, the keyboard navigation is not fully complete, so finishing it is another goal. Figuring out the user interface to accomodate for features like keyboard navigation was just as much of a challenge as the code itself.

I began implementing a mobile stylesheet (resize the browser to a thin width to see), but was unable to complete it as it also introduces some user interface design issues. For example, the lists sidebar gets hidden, so I need to provide an alternate way to switch between lists. I was thinking of making the list name header a dropdown in this case.

The implementation of an "all lists" feature was a challenge since Backbone.js is designed to accomodate for models and distinct collections. I implemented the feature by placing all task models in a single collection and showing or hiding them depending on which "list" is currently selected.

The interesting aspect of the application is mostly in the organization of the objects into an MVC-like scheme to decouple different parts as much as possible. Much of the functionality is based around events that are activated to communicate between the models and views.

References:
[1] http://www.potionfactory.com/thehitlist/
[2] http://documentcloud.github.com/backbone/
[3] http://jquery.com
[4] http://documentcloud.github.com/underscore/
[5] http://www.datejs.com