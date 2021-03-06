var RES = {
    'item_per_page': 1,
    'items': [
        {
            'id': 'aerospike-tutorial',
            'file': 'asp.md',
            'title': 'Aerospike数据库',
            'gmtCreate': '2017/11/30'
        },
        {
            'id': 'java-invoke-chain',
            'file': 'java_invoke_chain.md',
            'title': 'Java调用链跟踪',
            'gmtCreate': '2014/12/26'
        },
        {
            'id': 'duitang-base-arch',
            'file': 'dt_base_framework.md',
            'title': '技术体系切换与基础框架构建',
            'gmtCreate': '2015/01/10'
        },
        {
            'id': 'hive-on-yarn',
            'file': 'hive_on_yarn.md',
            'title': 'Hive On Yarn',
            'gmtCreate': '2014/12/11'
        },
        {
            'id': 'hadoop-seqfile-append',
            'file': 'hadoop_seqfile_append.md',
            'title': 'Hadoop文件追加模式',
            'gmtCreate': '2014/12/02'
        },
        {
            'id': 'duitang-microservice',
            'file': 'services_center.md',
            'title': '堆糖服务化的一些记录',
            'gmtCreate': '2015/02/06'
        },
        {
            'id': 'webapp-rpc-optimizing',
            'file': 'rt_optmizing.md',
            'title': 'Web应用响应平滑与RPC优化',
            'gmtCreate': '2015/03/16'
        },
        {
            'id': 'duitang-dataplatform',
            'file': 'dt_dp.md',
            'title': '数据平台核心与规划',
            'gmtCreate': '2015/04/01'
        },
        {
            'id': 'hdfs-atomic',
            'file': 'hdfs_atomic.md',
            'title': 'HDFS原子性与一致性',
            'gmtCreate': '2015/03/21'
        }
    ]
};

function sortByDate(a,b) {
    return Date.parse(b['gmtCreate']) - Date.parse(a['gmtCreate']);
}
