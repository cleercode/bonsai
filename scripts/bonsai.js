$(function() {

  // Model: A list/filter of tasks
  window.List = Backbone.Model.extend({
    initialize: function() {
      this.set({ color: this.color()});
      this.bind('destroy', this.destroyTasks, this);
    },

    // Return an array of this list's tasks
    tasks: function() {
      var id = this.id;
      return Tasks.filter(function(task) {
        return task.get('list') == id;
      });
    },

    // Return a hex color string based on this list's name
    color: function() {
      var name = this.get('name')
        , hash = 0;
      for (var i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      var hex = ((hash >> 24) & 0xFF).toString(16) +
                ((hash >> 16) & 0xFF).toString(16) +
                ((hash >> 8)  & 0xFF).toString(16) +
                ((hash)       & 0xFF).toString(16);
      return hex.substr(0, 6);
    },

    // Destroy this list's tasks when it is destroyed
    destroyTasks: function() {
      _.each(this.tasks(), function(task) {
        task.destroy();
      });
    }
  });

  // Collection: a set of lists
  window.ListCollection = Backbone.Collection.extend({
    model: List,

    localStorage: new Store('bonsaiLists')
  });

  window.Lists = new ListCollection;

  // View: the clickable name of a list that displays in the sidebar
  window.ListView = Backbone.View.extend({
    tagName: 'li',

    template: _.template($('#list-template').html()),

    events: {
      'click': 'select'
    },

    initialize: function() {
      this.model.bind('destroy', this.remove, this);   
    },

    // Populate the view based on the model
    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      return this;
    },

    // Mark this list as selected and show/hide the appropriate tasks
    select: function(e) {
      if (e) e.preventDefault();
      var model = this.model;
      $('#sidebar li').removeClass('selected');
      $(this.el).addClass('selected');
      $('h1').text(this.model.get('name'));
      $('#main').removeClass('all');
      Lists.selected = model;
      Tasks.each(function(task) {
        if (task.get('list') == model.id) task.view.show();
        else task.view.hide();
      });
    },

    remove: function() {
      $(this.el).remove();
    }
  });

  // View: a clickable "All lists" item for the sidebar, imitating ListView
  // functionality, but not bound to a list
  window.allListsView = new (Backbone.View.extend({
    el: '#all-lists',

    events: {
      'click': 'select'
    },

    // Mark "all lists" as selected and show all tasks
    select: function(e) {
      if (e) e.preventDefault();
      $('#sidebar li').removeClass('selected');
      $(this.el).addClass('selected');
      $('h1').text('All lists');
      $('#main').addClass('all');
      Lists.selected = null;
      Tasks.each(function(task) {
        task.view.show();
      });
    }
  }));

  // Model: a task item with a due date
  window.Task = Backbone.Model.extend({
    defaults: function() {
      return {
        content: 'Untitled task',
        done: false,
        date: new Date(),
        order: Tasks.nextOrder(),
        list: Lists.selected
      };
    },

    // Toggle this task's completion status
    toggle: function() {
      this.save({ done: !this.get('done') });
    },

    // Return the date range that this task's due date lies in
    dateRange: function() {
      var date = new Date(this.get('date'));
          today = Date.today(),
          days1 = Date.today().add(1).days()
          days2 = Date.today().add(2).days()
          days30 = Date.today().add(30).days()
          days90 = Date.today().add(90).days()
          years1 = Date.today().add(1).years();
      if (!date) return 'none';
      if (date < today) return 'past';
      if (date < days1) return 'days1';
      if (date < days2) return 'days2';
      if (date < days30) return 'days30';
      if (date < days90) return 'days90';
      if (date < years1) return 'years1';
      return 'future';
    }
  });

  // Collection: a set of tasks
  window.TaskCollection = Backbone.Collection.extend({
    model: Task,

    localStorage: new Store('bonsaiTasks'),

    // Return an array of all completed tasks
    done: function() {
      return this.filter(function(task) {
        return task.get('done');
      });
    },

    // Return an array of all not completed tasks
    remaining: function() {
      return this.without.apply(this, this.done());
    },

    // Return the order for a new task
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

    // Order tasks by the `order` property
    comparator: function(task) {
      return task.get('order');
    }
  });

  window.Tasks = new TaskCollection;

  // View: the display of a task in the main task list area
  window.TaskView = Backbone.View.extend({
    tagName: 'li',

    template: _.template($('#task-template').html()),

    events: {
      'dblclick .content': 'editContent',
      'dblclick .date': 'editDate',
      'click .checkbox': 'toggleDone',
      'keydown .content-input': 'commitOnEnter',
      'keydown .date-input': 'commitOnEnter'
    },

    initialize: function() {
      this.model.bind('change', this.render, this);
      this.model.bind('change', AppView.updateSections);
      this.model.bind('destroy', this.remove, this);      
    },

    // Populate the view based on the model and automatically append it to the
    // appropriate date range section
    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      var date = this.model.get('date')
        , formattedDate = new Date(date).toString('M/d/yy');
      this.$('.date').text(formattedDate);
      this.$('.date-input').val(formattedDate);
      this.append();
      return this;
    },
    
    // Append the view to the appropriate date range section
    append: function() {
      var section = $('#' + this.model.dateRange()),
          list = section.find('ul');
      section.show()
      $(this.el).appendTo(list);
    },

    // Toggle the model's completion status
    toggleDone: function(e) {
      this.model.toggle();
    },

    // Turn on editing mode
    edit: function() {
      $(this.el).addClass('editing');
      $('html').bind('click', _.bind(this.commit, this));
      $('li').bind('click', _.bind(this.commit, this));
      $(this.el).bind('click', function(e) { e.stopPropagation(); });
    },

    // Turn on editing mode and focus on content input
    editContent: function() {
      this.edit();
      this.$('.content-input').focus();
    },

    // Turn on editing mode and focus on date input
    editDate: function() {
      this.edit();
      this.$('.date-input').focus();
    },

    // Save editing changes to the model and turn off editing mode
    commit: function() {
      var content = this.$('.content-input').val(),
          date = this.$('.date-input').val()
          parsedDate = Date.parse(date) || this.model.get('date');
      this.model.save({
        content: content,
        date: parsedDate
      });
      this.$('input').blur();
      $(this.el).removeClass('editing');
    },

    // When Enter key is pressed, save editing changes to model and turn off
    // editing mode
    commitOnEnter: function(e) {
      e.stopPropagation();
      if (e.keyCode == 13) this.commit();
    },

    // Hide this task view
    hide: function() {
      $(this.el).hide();
    },

    // Show this task view
    show: function() {
      $(this.el).show();
    },

    // Remove this task view from the document with a sliding animation
    remove: function() {
      $(this.el).slideUp(function() { $(this).remove() });
    },

    // Mark this task as selected for keyboard navigation
    select: function() {
      if (Tasks.selected) $(Tasks.selected.view.el).removeClass('selected');
      Tasks.selected = this.model;
      $(this.el).addClass('selected');
    }
  });

  // View: miscellaneous event bindings for the application
  window.AppView = Backbone.View.extend({
    el: $('body'),

    events: {
      'keydown': 'keydown',
      'keydown #new-list-input': 'createList',
      'click #new-task': 'createTask',
      'click #clear': 'clearDone',
      'click #delete-list': 'deleteList',
    },

    initialize: function() {
      Tasks.bind('add', this.addTaskAndEdit, this);
      Tasks.bind('reset', this.addTasks, this);
      Tasks.bind('all', this.updateCount, this);
      Tasks.fetch();

      Lists.bind('add', this.addList, this);
      Lists.bind('reset', this.addLists, this);
      Lists.bind('reset', this.updateSections, this);
      Lists.fetch();
      this.selectAllLists();
    },

    // Given a task model, create a new view for it and render and append it
    addTask: function(task) {
      var view = new TaskView({ model: task });
      task.view = view;
      view.render();
      return view;
    },

    // Create views for all of the models in the tasks collection,
    // to display tasks fetched from storage
    addTasks: function() {
      Tasks.each(this.addTask);
    },

    // Given a task model, create a new view for it, render and append it,
    // and turn on editing mode
    addTaskAndEdit: function(task) {
      var view = this.addTask(task);
      view.editContent();
    },

    // Given a list model, create a new view for it and render and append it
    addList: function(list) {
      var nav = $('#sidebar ul')
        , view = new ListView({ model: list });
      list.view = view;
      nav.append(view.render().el);
    },

    // Create views for all of the lists in the tasks collection,
    // to display lists fetched from storage
    addLists: function() {
      Lists.each(this.addList);
    },

    // When a key is pressed, activate the appropriate function
    keydown: function(e) {
      switch(e.keyCode) {
        // Enter
        case 13: this.createTask(); break;
        // Up arrow / k
        case 38: case 75: this.selectUp(); break;
        // Down arrow / j
        case 40: case 74: this.selectDown(); break;
        // Tab
        case 9: this.editSelected(e); break;
        // Delete / backspace
        case 46: case 8: this.deleteSelected(); break;
      }
    },

    // Create a task model in the selected list
    createTask: function() {
      Tasks.create({ list: Lists.selected && Lists.selected.id });
    },
    
    // Create a list model based on the new list input
    createList: function(e) {
	    e.stopPropagation();
	    if (e.keyCode != 13) return;
	    var input = $('#new-list-input')
        , name = input.val();
      if (name == '') return;
      var list = Lists.create({ name: name });
      list.view.select();
      input.val('');
      input.blur();
    },

    // Delete the selected list
    deleteList: function() {
      if (!Lists.selected) return;
      Lists.selected.destroy();
      this.selectAllLists();
    },

    // Select the "all lists" faux-list
    selectAllLists: function() {
      allListsView.select();
    },

    // Show/hide date range sections that have tasks in them
    updateSections: function() {
      var sections = $('section');
      sections.each(function() {
        var section = $(this)
          , children = section.find('li')
          , hasChildren = _.any(children, function(child) { 
              return $(child).css('display') != 'none';
            });
        hasChildren ? section.show() : section.hide();
      });
    },

    // Destroy all completed tasks
    clearDone: function(e) {
      e.preventDefault();
      _.each(Tasks.done(), function(task) {
        task.destroy();
      })
    },

    // Update the count of not completed tasks
    updateCount: function() {
      var count = Tasks.remaining().length
        , counter = $('#counter');
      counter.text(count);
      count ? counter.removeClass('zero') : counter.addClass('zero');
    },

    // Select the task above, or the first one if there is no current selection
    selectUp: function() {
      if (Tasks.isEmpty()) return;
      if (Tasks.selected) {
        var index = Tasks.indexOf(Tasks.selected)
          , next = Tasks.at(index - 1) || Tasks.last();
        next.view.select();
      }
      else {
        Tasks.first().view.select();
      }
    },

    // Select the task below, or the last one if there is no current selection
    selectDown: function() {
      if (Tasks.isEmpty()) return;
      if (Tasks.selected) {
        var index = Tasks.indexOf(Tasks.selected)
          , next = Tasks.at(index + 1) || Tasks.first();
        next.view.select();
      }
      else {
        Tasks.last().view.select();
      } 
    },

    // Edit the selected task
    editSelected: function(e) {
      e.preventDefault();
      if (!Tasks.selected) return;
      Tasks.selected.view.editContent();
    },

    // Delete the selected task
    deleteSelected: function() {
      if (!Tasks.selected) return;
      var index = Tasks.indexOf(Tasks.selected);
      Tasks.selected.destroy();
      var next = Tasks.at(index) || Tasks.last();
      if (next) next.view.select();
    }
  });

  window.App = new AppView;
});