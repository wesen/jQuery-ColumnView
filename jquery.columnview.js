/**
 * jquery.columnview-1.2.js
 *
 * Created by Chris Yates on 2009-02-26.
 * http://christianyates.com
 * Copyright 2009 Christian Yates and ASU Mars Space Flight Facility. All rights reserved.
 *
 * Supported under jQuery 1.2.x or later
 * Keyboard navigation supported under 1.3.x or later
 *
 * Dual licensed under MIT and GPL.
 */

(function($){
  var defaults = {
    multi:      false, // Allow multiple selections
    preview:    true,  // Handler for preview pane
    fixedwidth: false, // Use fixed width columns
    onchange:   false, // Handler for selection change
    addCSS:     true,
    useCanvas:  true
  };

  var settings;

  // Firefox doesn't repeat keydown events when the key is held, so we use
  // keypress with FF/Gecko/Mozilla to enable continuous keyboard scrolling.
  var key_event = $.browser.mozilla ? 'keypress' : 'keydown';

  /* keep a reference to the container object in order to navigate from root */
  var container;
  var origElt;

  var methods = {
    init: function (options) {
      settings = $.extend({}, defaults, options);

      if (settings.addCSS) {
        addCSS();
      }

      // Hide original list
      $(this).hide();
      // Reset the original list's id
      var origid = $(this).attr('id');

      if (origid) {
        $(this).attr('id', origid + "-processed");
      }

      origElt = $(this);

      // Create new top container from top-level LI tags
      var top       = $(this).children('li');
      container = $('<div/>').addClass('containerobj').attr('id', origid).insertAfter(this);
      var topdiv    = $('<div class="top"></div>').appendTo(container);

      // Set column width
      if (settings.fixedwidth || $.browser.msie) { // MSIE doesn't support auto-width
        var width = typeof settings.fixedwidth == "string" ? settings.fixedwidth : '200px';
        $('.top').width(width);
      }

      $.each(top,function(i, item){
        var topitem = $(':eq(0)',item).clone(true).wrapInner("<span/>").
          data('sub',$(item).children('ul'))
          .appendTo(topdiv);
        if (settings.fixedwidth || $.browser.msie) {
          $(topitem).css({'text-overflow':'ellipsis', '-o-text-overflow':'ellipsis','-ms-text-overflow':'ellipsis'});
        }
        if($(topitem).data('sub').length) {
          $(topitem).addClass('hasChildMenu');
          addWidget(topitem);
        }
      });

      $(container).bind("click " + key_event, methods.handleEvent);
    },

    handleClick: function (self, shiftKey, metaKey) {
      $(self).focus();

      var level = $('div',container).index($(self).parents('div'));
      var isleafnode = false;
      // Remove blocks to the right in the tree, and 'deactivate' other
      // links within the same level, if metakey is not being used
      $('div:gt('+level+')',container).remove();
      if (!metaKey && !shiftKey) {
        $('div:eq('+level+') a',container).removeClass('active')
          .removeClass('inpath');
        $('.active',container)            .addClass('inpath');
        $('div:lt('+level+') a',container).removeClass('active');
      }

      // Select intermediate items when shift clicking
      // Sorry, only works with jQuery 1.4 due to changes in the .index() function
      if (shiftKey) {
        var first = $('a.active:first', $(self).parent()).index();
        var cur = $(self).index();
        var range = [first,cur].sort(function(a,b){return a - b;});
        $('div:eq('+level+') a', container).slice(range[0], range[1]).addClass('active');
      }

      $(self).addClass('active');
      if ($(self).data('sub').children('li').length && !metaKey) {
        // Menu has children, so add another submenu
        var w = false;
        if (settings.fixedwidth || $.browser.msie)
          w = typeof settings.fixedwidth == "string" ? settings.fixedwidth : '200px';
        submenu(container,self,w);
      } else if (!metaKey && !shiftKey) {
        // No children, show title instead (if it exists, or a link)
        isleafnode = true;
        var previewcontainer = $('<div/>').addClass('feature').appendTo(container);
        // Fire preview handler function
        if ($.isFunction(settings.preview)) {
          // We're passing the element back to the callback
          var preview = settings.preview($(self));
        }
        // If preview is specifically disabled, do nothing with the previewbox
        else if (!settings.preview) {
        }
        // If no preview function is specificied, use a default behavior
        else {
          var title = $('<a/>').attr({href:$(self).attr('href')}).text($(self).attr('title') ? $(self).attr('title') : $(self).text());
          $(previewcontainer).html(title);
        }
        // Set the width
        var remainingspace = 0;
        $.each($(container).children('div').slice(0,-1),function(i,item){
          remainingspace += $(item).width();
        });
        var fillwidth = $(container).width() - remainingspace;
        $(previewcontainer).css({'top':0,'left':remainingspace}).width(fillwidth).show();
      }

      // Fire onchange handler function, but only if multi-select is off.
      // FIXME Need to deal multiple selections.
      if ($.isFunction(settings.onchange) && !settings.multi) {
        // We're passing the element back to the callback
        var onchange = settings.onchange($(self), isleafnode);
      }
    },

    navigateTo: function (key, attrName) {
      if (!attrName) {
        attrName = "name";
      }

      var origLinks = origElt.find("[" + attrName + "=" + key + "]").parentsUntil(origElt).filter("li").find(":eq(0)");
      var keys = origLinks.map(function (i, elt) { return $(elt).attr(attrName); }).toArray().reverse();

      $.each(keys, function (i, elt) {
        var entry = container.find("[" + attrName + "=" + elt + "]");
        methods.handleClick(entry);
      });
    },
    
    // Event handling functions
    handleEvent: function (event) {
      if ($(event.target).is("a,span")) {
        if ($(event.target).is("span")){
          var self = $(event.target).parent();
        }
        else {
          var self = event.target;
        }

        if (!settings.multi) {
          delete event.shiftKey;
          delete event.metaKey;
        }

        self.focus();

        // Handle clicks
        if (event.type == "click") {
          methods.handleClick(self, event.shiftKey, event.metaKey);
        }

        // Handle Keyboard navigation
        if(event.type == key_event){
          switch(event.keyCode){
          case(37): //left
            $(self).parent().prev().children('.inpath').focus().trigger("click");
            break;
          case(38): //up
            $(self).prev().focus().trigger("click");
            break;
          case(39): //right
            if($(self).hasClass('hasChildMenu')){
              $(self).parent().next().children('a:first').focus().trigger("click");
            }
            break;
          case(40): //down
            $(self).next().focus().trigger("click");
            break;
          case(13): //enter
            $(self).trigger("dblclick");
            break;
          }
        }
        event.preventDefault();
      }

    }
  };


  $.fn.columnview = function(method) {
    if ( methods[method] ) {
      return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
    } else if ( typeof method === 'object' || ! method ) {
      return methods.init.apply( this, arguments );
    } else {
      $.error( 'Method ' +  method + ' does not exist on jQuery.columnview ');
    }
  };

  // Generate deeper level menus
  function submenu(container, item, width){
    var leftPos = 0;
    $.each($(container).children('div'),function(i,mydiv){
      leftPos += $(mydiv).width();
    });

    var submenu = $('<div/>').css({'top':0,'left':leftPos}).appendTo(container);

    // Set column width
    if (width) {
      $(submenu).width(width);
    }

    var subitems = $(item).data('sub').children('li');
    $.each(subitems,function(i,subitem){
      var subsubitem = $(':eq(0)',subitem).clone(true).wrapInner("<span/>")
        .data('sub',$(subitem).children('ul'))
        .appendTo(submenu);

      if (width) {
        $(subsubitem).css({'text-overflow':     'ellipsis',
                           '-o-text-overflow':  'ellipsis',
                           '-ms-text-overflow': 'ellipsis'} );
      }
      if ($(subsubitem).data('sub').length) {
        $(subsubitem).addClass('hasChildMenu');
        addWidget(subsubitem);
      }
    });
  }

  // Uses canvas, if available, to draw a triangle to denote that item is a parent
  function addWidget(item, color){
    var useCss = false;

    if (!settings.useCanvas) {
      useCss = true;
    } else {
      var triheight = $(item).height();
      var canvas = $("<canvas></canvas>").attr({height:triheight,width:10}).addClass('widget').appendTo(item);    if(!color){ color = $(canvas).css('color'); }
      canvas = $(canvas).get(0);
      if (canvas.getContext){
        var context = canvas.getContext('2d');
        context.fillStyle = color;
        context.beginPath();
        context.moveTo(3,(triheight/2 - 3));
        context.lineTo(10,(triheight/2));
        context.lineTo(3,(triheight/2 + 3));
        context.fill();
      } else {
        useCss = true;
      }
    }

    if (useCss) {
      /**
       * Canvas not supported - put something in there anyway that can be
       * suppressed later if desired. We're using a decimal character here
       * representing a "black right-pointing pointer" in Windows since IE
       * is the likely case that doesn't support canvas.
       */
      $("<span>&#9658;</span>").addClass('widget').css({'height':triheight,'width':10}).prependTo(item);
    }

    $('.widget').bind('click', function(event){
      event.preventDefault();
    });
  }

  function addCSS() {
    // Add stylesheet, but only once
    if (!$('.containerobj').get(0)) {
      $('head').prepend('\
      <style type="text/css" media="screen">\
        .containerobj {\
          border: 1px solid #ccc;\
          height:5em;\
          overflow-x:auto;\
          overflow-y:hidden;\
          white-space:nowrap;\
          position:relative;\
        }\
        .containerobj div {\
          height:100%;\
          overflow-y:scroll;\
          overflow-x:hidden;\
          position:absolute;\
        }\
        .containerobj a {\
          display:block;\
          white-space:nowrap;\
          clear:both;\
          padding-right:15px;\
          overflow:hidden;\
          text-decoration:none;\
        }\
        .containerobj a:focus {\
          outline:none;\
        }\
        .containerobj a canvas {\
        }\
        .containerobj .feature {\
          min-width:200px;\
          overflow-y:auto;\
        }\
        .containerobj .feature a {\
          white-space:normal;\
        }\
        .containerobj .hasChildMenu {\
        }\
        .containerobj .active {\
          background-color:#3671cf;\
          color:#fff;\
        }\
        .containerobj .inpath {\
          background-color:#d0d0d0;\
          color:#000;\
        }\
        .containerobj .hasChildMenu .widget {\
          color:black;\
          position:absolute;\
          right:0;\
          text-decoration:none;\
          font-size:0.7em;\
        }\
      </style>');
    }
  }

})(jQuery);