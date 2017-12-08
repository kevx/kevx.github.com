//2017.12.08

console.log('loaded!');

var h = location.search;
var items = RES.items.sort(sortByDate);
var prenum = 0;
var currnum = 0;
var nextnum = 0;

if (h != null && h.length > 1) {
    var item = null;
    var id = h.substring(h.indexOf("?id=")+4);
    for (var i = 0; i < items.length; i++) {
        if (e.id == id) {
            item = e;
            currnum = i;
            break;
        }
    }

    if (currnum == items.length - 1) {
        nextnum = currnum;
    } else {
        nextnum = currnum + 1;
    }

    if (currnum == 0) {
        prenum = 0;
    } else {
        prenum = currnum + 1;
    }

    if (item != null) {
        $.ajax({
           url: 'data/' + items[currnum]['file'],
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
}

$('#pagepre').click(function() {
    location.replace('index.html?id=' + items[nextnum]['id']);
});

$('#pagenxt').click(function() {
    location.replace('index.html?id=' + items[prenum]['id']);
});

$('#total').html(items.length);
