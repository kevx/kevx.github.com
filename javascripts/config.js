var RES = {
    'item_per_page': 1,
    'items': [
        {
            'file': 'java_invoke_chain.md',
            'title': 'Java调用链跟踪',
            'gmtCreate': '2014/12/26'
        },
        {
            'file': 'dt_base_framework.md',
            'title': '技术体系切换与基础框架构建',
            'gmtCreate': '2015/01/10'
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
        {
            'file': 'dt_dp.md',
            'title': '数据平台核心与规划',
            'gmtCreate': '2015/04/01'
        },
        {
            'file': 'hdfs_atomic.md',
            'title': 'HDFS原子性与一致性',
            'gmtCreate': '2015/03/21'
        }

    ]
};

function sortByDate(a,b) {
    return Date.parse(b['gmtCreate']) - Date.parse(a['gmtCreate']);
}
