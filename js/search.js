var lunrIndex, $results, pagesIndex;

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');

    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');

        if (pair[0] === variable) {
            return decodeURIComponent(pair[1].replace(/\+/g, '%20'));
        }
    }
}

var searchTerm = getQueryVariable('query');

// Initialize lunrjs using our generated index file
function initLunr() {
    // First retrieve the index file
    $.getJSON("/index.json")
        .done(function (index) {
            pagesIndex = index;
            lunrIndex = lunr(function () {
                this.field("title", { boost: 10 });
                this.field("tags", { boost: 5 });
                this.field("summary");
                this.ref("uri");

                pagesIndex.forEach(function (page) {
                    this.add(page)
                }, this)
            });
        })
        .fail(function (jqxhr, textStatus, error) {
            var err = textStatus + ", " + error;
            console.error("Error getting Hugo index file:", err);
        });
}

// Nothing crazy here, just hook up a listener on the input field
function initUI() {
    $results = $("#blog-listing-medium");
    $("#searchinput").keyup(function () {
        $results.empty();

        // Only trigger a search when 2 chars. at least have been provided
        var query = $(this).val();
        if (query.length < 2) {
            return;
        }

        var results = search(query);

        renderResults(results);
    });
}

/**
 * Trigger a search in lunr and transform the result
 *
 * @param  {String} query
 * @return {Array}  results
 */
function search(query) {
    return lunrIndex.search(query, {
        wildcard: lunr.Query.wildcard.LEADING | lunr.Query.wildcard.TRAILING
    }).map(function (result) {
        return pagesIndex.filter(function (page) {
            return page.uri === result.ref;
        })[0];
    });
}

/**
 * Display the 10 first results
 *
 * @param  {Array} results to display
 */
function renderResults(results) {
    if (!results.length) {
        $results.append("<p>No results found</p>");
        return;
    }


    results.sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
    });

    // Only show the ten first results
    results.slice(0, 100).forEach(function (result) {


        var $resultstring = "<section class='post'>" +
            "<div  class='row'>" +
            "<div class='col-md-4'> " +
            "<div class='image'>" +
            "<a href='" + result.uri + "'>" +
            "<img src='" + result.banner + "' class='img-responsive' alt=''>" +
            "</a>" +
            "</div>" +
            "</div>" +
            "<div class='col-md-8'>" +
            "<h2><a href='" + result.uri + "'>" + result.title + "</a></h2>" +
            "<div class='clearfix'>" +
            "<p class='author-category'>";
        for (i = 0; i < result.tags.length; i++) {
            $resultstring += "<a href='/tags/" + result.tags[i] + "'>" + result.tags[i] + "</a>";
            if ((i + 1) < result.tags.length) {
                $resultstring += ", ";
            }
        }

        $resultstring += "</p>" +
            "<p class='date-comments'>" +
            "<a href='" + result.uri + "'><i class='fa fa-calendar-o'></i> " + moment(result.date).format('LL') + "</a>" +
            "</p>" +
            "</div>" +
            "<div class='intro'>" + result.summary + "</div>" +
            "<p class='read-more'><a href='" + result.uri + "' class='btn btn-template-main'>Continue reading</a>" +
            "</p>" +
            "</div>" +
            "</div>" +
            "</section>";

        var $result = ($resultstring);
        $results.append($result);
    });
}

initLunr();

$(document).ready(function () {
    initUI();
});
