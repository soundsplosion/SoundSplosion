function hasReachedBottom() {
  return $(window).scrollTop() > $(document).height() - $(window).height();
}

function unescape_js(js){
  return js.replace(/\\n/g, "\n").replace(/\\"/g, '\"').replace(/ \ /g, '').replace(/\\"/g, '"').replace(/\\'/g, "\'").replace(/<\\/g, "<");
}

function loadOnScroll(pages, url, id) {
  var page = 1;
  $(window).scroll(function() {
    if (hasReachedBottom()) {
      page++;
      if (page > parseInt(pages))
        return;

      if ($("#loader").html() == undefined) {
        $("#" + id).append('<div id="loader"><img id="loading-img" src="/assets/loading-blue.gif"></div>');
      }

      $.getScript(url + page)
        .always(function(jqxhr) {
          var reg;
          var tableHtml;
          if (id == "track-table") { // different layout in track index page
            reg = "<table.*?>([\\s\\S]*)<\\/table>"
            tableHtml = new RegExp(reg, 'g').exec(jqxhr.responseText)[1];
          } else {
            reg = id + '"\\).append\\("(.*)"\\);';
            tableHtml = unescape_js(new RegExp(reg, 'g').exec(jqxhr.responseText)[1]);
          }

          $("#" + id).append(tableHtml);
          $("#loader").remove();
        });
    }
  });
}