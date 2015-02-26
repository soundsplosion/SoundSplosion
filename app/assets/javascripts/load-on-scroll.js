function loadOnScroll(pages, url, id) {
  var currPage = 2; // Start from second page (first page is loaded already)
  var loading = false;

  $(window).scroll(function() {
    if (shouldLoadMore(loading, currPage, pages)) {
      loading = true;
      // Display loader to indicate tracks are loading
      if ($("#loader").html() == undefined) {
        append_loader(id);
      }

      $.getScript(url + currPage)
        .always(function(jqxhr) {
          var reg;
          var tableHtml;
          if (id == "track-table") {
            reg = "<table.*?>([\\s\\S]*)<\\/table>"
            tableHtml = new RegExp(reg, 'g').exec(jqxhr.responseText)[1];
          } else if (id == "competition-table") {
            reg = "<tbody.*?>([\\s\\S]*)<\\/tbody>"
            tableHtml = new RegExp(reg, 'g').exec(jqxhr.responseText)[1];
          } else {
            reg = id + '"\\).append\\("(.*)"\\);';
            tableHtml = unescape_js(new RegExp(reg, 'g').exec(jqxhr.responseText)[1]);
          }

          $("#" + id).append(tableHtml);
          // Ensure loader is visible during appending
          if (currPage < pages)
            append_loader(id);

          // Remove the loader after appending
          $("#loader").remove();
          currPage++;
          loading = false;
      });
    }
  });
}

function hasReachedBottom() {
  return $(window).scrollTop() > $(document).height() - $(window).height();
}

function unescape_js(js){
  return js.replace(/\\n/g, "\n").replace(/\\"/g, '\"').replace(/ \ /g, '').replace(/\\"/g, '"').replace(/\\'/g, "\'").replace(/<\\/g, "<");
}

function append_loader(id){
  $("#" + id).append('<div id="loader"><img id="loading-img" src="/assets/loading-blue.gif"></div>');
}

function shouldLoadMore(loading, currPage, pages) {
  return hasReachedBottom() && !loading && currPage <= pages;
}
