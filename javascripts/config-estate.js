var RES = {
    'item_per_page': 1,
    'items': [
        {
            'file': '20161031.md',
            'title': 'TEST',
            'gmtCreate': '2016/10/31'
        }
    ]
};


function sortByDate(a,b) {
    return Date.parse(b['gmtCreate']) - Date.parse(a['gmtCreate']);
}
