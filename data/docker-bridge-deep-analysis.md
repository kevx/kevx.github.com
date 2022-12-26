## Docker网桥深度分析

我们知道容器间可以相互通信（废话），这里其实涉及到两个问题：

* 同一docker宿主机(host)内部container-container以及container-host的相互通信；
* 不同宿主机上的container相互通信；

可能很多人已经知道后者已经由kube-router解决，解决方案基于内核提供的ipvs机制，相关技术在前期已经由诗军大神做了大量研究和铺垫，wiki上有极为详细的技术方案文档和示例代码，因此这里不再赘述

但是第一个问题反而很少有人会去研究，docker自身已经把这一层通信封装的很好，感觉像是so easy的样子，但直觉告诉我们这事没那么简单，仔细思考一下会有下面这些疑问：

1. docker host上执行ifconfig看到的docker0是什么？
2. container内的eth0网卡又是个什么东西？
3. host上为何看不到container的网卡（eth0）？
4. host与container通信链路是怎么样的？

带着这些问题我们开始研究，注意前方高能预警，以下内容涉及大量linux内核和部分网络相关知识，不熟悉的请自行查阅相关文档

相关知识点：netlink/rtnetlink  | veth tunnel | linux namespace |  mac-bridge

### 第一个问题

先说结论，docker0是一个网桥(network bridge/mac bridge)，可以理解为一个虚拟交换机，而这台机器上所有的container都连到这个交换机

这里并没有什么黑魔法

docker使用标准的linux netlink里的rtnetlink子模块创建出网桥，具体的接口文档可以参考内核官方的 http://man7.org/linux/man-pages/man7/rtnetlink.7.html

这一逻辑是由docker的libnetwork实现，相关代码可在github上找到，需要注意的是它并不是直接调用netlink，而是用了另一个封装过的三方库 github.com/vishvananda/netlink

使用下列命令可清晰看到网桥相关配置

```brctl show```

### 第二&第三&第四个问题

在研究这两问题之前先了解一下linux veth设备，veth全称就是virtual ethernet，这种设备总是成对出现，看起来就像一个普通网卡，内核以人格保证发送到其中一个设备的数据包会立刻被另一个设备收到

相关文档可以在这里找到

http://man7.org/linux/man-pages/man4/veth.4.html

每当一个container被创建出来后，在宿主机上可以看到veth开头的网卡也被创建出来，例如下图

![](/images/user/docker0-1.png) 

但这里只能看到一个veth网卡，既然veth设备总是成对出现，那么另外一个在哪？docker做了什么黑魔法吗？这里就涉及到另一个内核概念：namespace(ns)

linux通过namespace将系统资源如网络、文件系统、IPC、用户等进行相互隔离，但一般情况下不会使用这个功能，默认所有进程共用一个ns；
（这里多说一句，namespace是linux容器的基石之一）

在linux上使用ip netns命令可以看到系统中的网络ns
但直接执行这个命令是看不到任何docker创建的ns，该命令通过读取/var/run/netns获取相关配置，但docker并没有在该目录下注册任何数据，
需要手动创建一个软链接

```ln -s /proc/PID/ns/net /var/run/netns/PID```

如下图，现在终于可以在宿主机上看到容器的虚拟网卡了！

![](/images/user/docker0-2.png)

那么回到我们的问题，宿主机上的veth网卡设备和被namespace隐藏的容器eth0设备是怎么关联上的？其实很简单，对内核而言通过ifindex来唯一标识网络设备，下图可以看到宿主机的veth127792和容器eth0就是一对相匹配的veth（原因在下面）

![](/images/user/docker0-3.png)

细心的同学会发现网卡设备还有一个iflink属性，iflink的含义是标识当前网卡链接到哪个网络设备，如果是物理网卡则它的iflink和ifindex是相同的而对于veth网卡则是奇偶关系，至此，整个链路就已清晰，一图胜千言

![](/images/user/docker0-4.png)


