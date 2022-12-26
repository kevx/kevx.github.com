HDFS原子性与一致性
===


作为一个使用如此广泛的分布式存储，很多人对HDFS文件的一致性和原子性视而不见，就好像不需要考虑这类问题一样。虽然在实际使用上确实较少遇到这些场景，但是本着严谨的态度出发还是有必要了解其工作机制。

### 原子性

在HDFS官方文档上原子操作有这样几种：

* 创建文件/目录
* 删除
* 重命名文件/目录

这些其实都是非常现实的问题，例如两个应用同时对同一个路径进行创建和写入操作，如果发生不一致的情况将是完全不能接受的，幸好HDFS已经从底层保证了这一点。

那么HDFS是如何保证这的，就需要研究源码。

HDFS总体结构是很简约的，由Client和NameNodeRpcServer组成，两者采用Hadoop RPC通信，其中后者就是熟知的NameNode的RPC服务实现，NameNode几乎所有的核心逻辑都在这里。

以下代码版本以2.5.1的Hadoop为准，以create方法为例

     org.apache.hadoop.hdfs.server.namenode.NameNodeRpcServer.create

顺着这个方法往下看，可以看到其最终调用了

     org.apache.hadoop.hdfs.server.namenode.FSNamesystem.startFile

可以看到里面调用了
     
     void org.apache.hadoop.hdfs.server.namenode.FSNamesystem.writeLock

继续看代码

     public void writeLock() {
     this.fsLock.longReadLock().lock();
     this.fsLock.writeLock().lock();
     }

writeLock其实是一个标准的JDK的读写锁，回顾一下读写锁的语义：

* 当写锁未被占用时，reader均可以获取读锁
* 当写锁被占用时，reader均等待直到其释放
* 当读锁被占用时，writer等待写锁直到队列前的读锁均被释放

此时基本上可以得出结论了，这里才是真正发生作用的地方。
可以看到其它方法，如delete/rename等都是类似的操作模式。

