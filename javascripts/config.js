var RES = {
    'item_per_page': 1,
    'items': [
        {
            'file': 'java_invoke_chain.md',
            'title': 'Java调用链跟踪',
            'gmtCreate': '2014/12/26'
        },
        {
            'file': 'hive_on_yarn.md',
            'title': 'Hive On Yarn',
            'gmtCreate': '2014/12/11'
        },
        {
            'file': 'hadoop_seqfile_append.md',
            'title': 'Hadoop文件追加模式',
            'gmtCreate': '2014/12/02'
        },
        {
            'file': 'services_center.md',
            'title': '堆糖服务化的一些记录',
            'gmtCreate': '2015/02/06'
        },
        {
            'file': 'rt_optmizing.md',
            'title': 'Web应用响应平滑与RPC优化',
            'gmtCreate': '2015/03/16'
        },
    ]
};

function sortByDate(a,b) {
    return Date.parse(b['gmtCreate']) - Date.parse(a['gmtCreate']);
}
