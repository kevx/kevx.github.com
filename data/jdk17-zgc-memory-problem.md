JDK17中ZGC的内存挑战
===

JDK17正式版已于9月14号发布，这是三年以来首个LTS版本，包含了非常多的重要特性和新功能比如ZGC，虽然ZGC早在JDK11已经可以使用，但在17上有了进一步的优化改进，生产可用程度更高了。

但是ZGC并不是一个省油的灯，高性能往往伴随着某一方面的全新挑战。

根据ZGC的原理描述，其在启动后会对Heap空间执行3次地址空间（Virtual Address Space）映射，所以在top中看到的虚拟地址占用会非常夸张，不过这个基本无影响。

至于说为什么要映射3次，这是由ZGC算法本身的特性决定，请自行查阅相关文档或者阅读源代码，https://github.com/openjdk/jdk/tree/master/src/hotspot/share/gc/z

真正关键的问题在于，不同的Linux内核版本下的Heap空间创建方式是有差别的。

根据ZGC代码看到，如果系统支持memfd_create这个系统调用，则使用它来创建一个虚拟的内存文件，然后使用mmap进行上述的映射过程。

查阅内核文档可知，memfd仅在3.17以上版本可用，在低于该版本的内核中，JDK17使用的是tmpfs技术，这是几乎所有Linux上都具备的一种内存文件系统，默认大小为物理内存的1/2；而memfd则没有这种限制（可见memfd确实”比较高级“）。

例如8G的服务器上，默认tmpfs最大为4GB，倘若把JDK的Xmx设置为5GB，则会导致ZGC的Heap空间创建失败。错误信息如下：

	Not enough space available on the backing filesystem to hold the current max Java heap

常规的垃圾回收器如G1则不存在这个问题。

此外，tmpfs的使用主要体现在Shared Memory指标上，也就是top中看到的SHR，这个值是Xmx的3倍，当然实际物理内存并没有使用这么多，这一点可以通过free命令看出。但这却给系统运维带来了挑战，因为很多监控系统会直接监控主应用的内存使用率指标，在正式生产投产前，这一块必须做特殊处理。



---EOF---