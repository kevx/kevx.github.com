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
        if (items[i].id == id) {
            item = items[i];
            currnum = i;
            break;
        }
    }

    nextnum = (currnum == items.length - 1) ? currnum : currnum + 1;
    prenum = (currnum == 0) ? 0 : currnum - 1;

    if (item != null) {
        $.ajax({
           url: 'data/' + items[currnum]['id'] + '.md',
           xhrFields: {
              withCredentials: true
           }
        }).done(function( data ) {
            var s = markdown.toHTML(data);
            $('#content').append('<div>' + s + '</div>');
            $('pre code').each(function(i, block) {
                hljs.highlightBlock(block);
            });
        });
    }
}

$('#pagenxt').click(function() {
    location.replace('detail.html?id=' + items[nextnum]['id']);
});

$('#pagepre').click(function() {
    location.replace('detail.html?id=' + items[prenum]['id']);
});

$('#total').html((currnum + 1) + '/' + items.length);
