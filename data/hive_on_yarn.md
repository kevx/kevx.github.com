***
Hive On YARN
===

## 概述
YARN集群有两种角色：ResourceManager和NodeManager，
其中RM相当于Hadoop 1.x中的JobTracker，负责任务和资源调度；
NM则是具体执行job的节点，相当于Hadoop 1.x中的TaskTracker，
其自身对于每个job所用到的资源做更为细粒度的管理。
Hadoop 2.x以上的版本均是在YARN平台上构建。


## YARN集群关键配置

首先确保每台机器的环境变量
    export YARN_CONF_DIR=$HADOOP_CONF_DIR
然后确保yarn-site.xml文件中含有以下内容

    <property>
        <name>yarn.resourcemanager.hostname</name>
        <value>s4</value>
    </property>
    <property>
        <name>yarn.nodemanager.aux-services</name>
        <value>mapreduce_shuffle</value>
    </property>
    <property>
        <name>yarn.nodemanager.aux-services.mapreduce_shuffle.class</name>
        <value>org.apache.hadoop.mapred.ShuffleHandler</value>
    </property>

最后在RM机器上执行yarn resourcemanager
在NM机器上执行yarn nodemanager
当机器都启动成功后，可以通过http://[RM]:8088/
查看集群运行状态，其中[RM]是RM机器的IP或Hostname。


## Hive
在hive官方文档中并未明确说明如何将其与Hadoop2集成在一起；
如果按照常规方式部署hive，它将以local模式运行，并不能利用
整个集群的计算能力。

如果要启用集群模式，需要在Hive中执行下面指令：

    set mapreduce.framework.name=yarn;
    
可以先省略等号及后面的部分执行，看看当前hive处于哪种模式，
不出意外的话一般都是'local'。

