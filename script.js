
var module = new (function() {

  var self = this;

  function dataSelector(val) {
    return ['[data-name="', val.replace(/^#/, ''), '"]'].join('');
  };

  function sectionTrigger(name) {
    var selector = dataSelector(name);
    var section = $(self.list).children(selector);
    section && $(section).find('a').trigger('click');
  };

  function checkHash() {
    var hash = getHash();
    !!hash && sectionTrigger(hash);
  };

  function getHash() {
    return window.location.hash;
  };

  function setHash(hash) {
    var sameHash = getHash().indexOf(hash) > 0;
    return sameHash ? false : window.location.hash = hash;
  };

  function updateHash(name, fn) {
    var isString = typeof name === 'string';
    name = isString ? name : $(this).data('name');
    if (setHash(name)) {
      fn && $(window).one('hashchange', fn);
    }else {
      fn && setTimeout(fn, 50);
    };
  };

  function scrollTo(el, _off) {
    if (typeof(el) === 'number') {
      $(document).scrollTop(el);
    } else { 
      var off = $(el).offset().top + _off || 0;
      $(document).scrollTop(off);
    };
  };

  function highlight(el) {
    $(el).addClass('highlight');
    var remove = $(el).removeClass.bind(el, 'highlight');
    setTimeout(remove, 500);
  };

  function openLink(ev) {
    ev.preventDefault();

    var href = $(this).attr('href');
    if (href[0]=='#') {
      sectionTrigger(href);
    } else {
      window.open(href);
    };
  };

  function selectSection(ev) {
    ev.preventDefault();

    var parent = $(this).parent();
    var name = $(parent).data('name');
    var index = $(parent).index();
    var selected = $(parent).siblings('.selected');
    var sIndex = $(selected).index();

    if (sIndex !== index) {
      updateHash(name, function(ev) {
        $(selected).removeClass('selected');
        $(parent).addClass('selected');

        var el = $('#' + name);
        highlight(el);

        if (index > 0) {
          scrollTo(el, -60);
        } else {
          scrollTo(self.lHeight);
        };
      });
    };
  };

  function withinRange(height, range) {
    return height > range[0] && height < range[1];
  };

  function scroll(ev) {
    var list = self.list;
    var height = $(this).scrollTop();

    if (height >= self.lHeight + 40) {
      var stickyCSS = {
        width:self.lWidth,
        left:self.lOffset
      };
      $(list).addClass('sticky').css(stickyCSS);
    } else {
      $(list).removeClass('sticky');
    };
  };

  function createWaypoint() {
    var name     = $(this).attr('id');
    var selector = dataSelector(name);
    var item     = $(self.list).children(selector);
    var index    = $(item).index();

    var waypointOpts = {
      offset:150,
      onlyScroll:true
    };

    function waypointCB() {
      var selected = $(item).siblings('.selected');
      var sInd = $(selected).index();
      if (sInd !== index) {
        $(selected).removeClass('selected');
        $(item).addClass('selected');
      };
    };

    $(this).waypoint(waypointCB, waypointOpts);
  };

  this.init = function() {
    var container = self.container = $('#container');
    var list = self.list = $(container).children('ul');

    self.lHeight  = $(list).offset().top;
    self.lOffset  = $(list).offset().left;
    self.lWidth   = $(list).width();

    $(list).on('click', 'a', selectSection);
    $(document).on('click', 'section a', openLink);
    $(document).on('click', '#forkme a', openLink);
    $(document).on('click', 'h2', updateHash);
    $(document).scroll(scroll);
    $('section').each(createWaypoint);

    checkHash();
  };
});

$(document).ready(module.init);
