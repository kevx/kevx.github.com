console.log('loaded!');

var h = location.search;
var page = 1;
var pagesz = RES.item_per_page;
var items = RES.items.sort(sortByDate);
var totalpage = Math.ceil(items.length / RES.item_per_page);

if (h != null && h.length > 1) {
    var ps = h.substring(h.indexOf("?page=")+6);
    page = parseInt(ps);
    if (pagesz * page > items.length) {
        page = 1;
    }
}
var start = (page - 1) * pagesz;
var limit = Math.min(start + pagesz, items.length);

for(var i = start; i < limit; i++) {
    $.ajax({
       url: 'data-estate/' + items[i]['file'],
       xhrFields: {
          withCredentials: true
       }
    }).done(function( data ) {
        var s = markdown.toHTML(data);
        var div = '<div>' + s + '</div>';
        $('#content').append(div);
        $('pre code').each(function(i, block) {
            hljs.highlightBlock(block);
        });
    });
}

$('#pagepre').click(function() {
    var p = page - 1;
    if (p <= 0) {
        p = 1;
        return;
    }
    location.replace('detail-estate.html?page=' + p);
});

$('#pagenxt').click(function() {
    var p = page + 1;
    if (p > totalpage) {
        p = totalpage;
        return;
    }
    location.replace('detail-estate.html?page=' + p);
});

$('#total').html(page + '/' + totalpage);
