XFS底层块设备IOPath分析备注
===

XFS在中间件和数据库应用上广泛使用，而有的时候我们需要对XFS上的IO进行性能诊断，例如数据库IO读写过于缓慢或者发生不符合预期的写入请求。常规的诊断工具如iostat等仅能看到统计型的指标，无法精准定位具体的文件和数据。

要想得到这类信息，可借助blktrace工具，其工作在块设备层，可提供丰富的诊断信息。

一个IO请求进入块设备层后可能有多个处理流程：

* Remap，被DM(Device Mapper)或MD(Multiple Device，如RAID)重映射到其它设备
* Split，因IO请求与扇区边界未对齐或者太大而被分拆成为多次IO
* Merge，因与其它I/O请求的物理位置相邻而合并成一次IO
* 被IO调度器发送给底层驱动程序
* 被驱动程序提交给实际设备，设备完成IO请求之后再发回结果。

一般来说通过下列命令启动分析程序，例如：

```sudo blktrace -d /dev/vda -o - | blkparse -i -```

该程序会将对于```/dev/vda```设备的所有IO请求打印在当前控制台，如下所示

	253,0  0  153  22.820854964 22822  A  W  1671440 + 8 <- (253,2) 850192
	253,2  0  154  22.820858837 22822  Q  W  1671440 + 8 [kworker/u4:1]
	253,2  0  155  22.820862417 22822  G  W  1671440 + 8 [kworker/u4:1]
	253,2  0  156  22.820869028 22822  I  W  1671440 + 8 [kworker/u4:1]
	253,2  0  157  22.820885675   258  D  W  1671440 + 8 [kworker/0:1H]
	253,0  0  158  22.820914903 22822  A  W  1671448 + 8 <- (253,2) 850200
	253,2  0  159  22.820915456 22822  Q  W  1671448 + 8 [kworker/u4:1]
	253,2  0  160  22.820915936 22822  G  W  1671448 + 8 [kworker/u4:1]
	253,0  0  163  22.820936760 22822  A  W  23161992 + 8 <- (253,2) 22340744
	253,2  0  168  22.828410920     0  C  W  1671440 + 8 [0]

主要关注的第4/5/6和最后一列，分别含义是时间戳（单位为秒，小数点精确到纳秒）、进程ID、IO事件类型、起始BlockID和Block数量。重点说明一下IO事件类型，目前常见的类型有下面几个：

* A，IO请求被重映射
* C，IO请求已经完成
* D，IO请求已经提交到驱动
* G，IO请求已经生成
* I，IO请求进入调度队列
* Q，IO请求即将生成

各事件间隔时间的意义：

* I->D，IO请求在调度队列中消耗的时间（跟IO调度策略有关）
* D->C，IO在硬件上消耗的时间
* A/Q->G，生成IO请求的时间，含Remap/Split
* G->I，IO请求进入到调度队列的时间，含Merge
* A/Q->C，即整个IO请求时间，与iostat的await指标接近

然后看一下最后一列，例如```1671440 + 8 <- (253,2) 850192```，这个含义表示当前请求是从1671440(850192)起始的block，当次IO一共操作8个block，这个例子因为有RAID所以还涉及到重映射（由850192映射到1671440）。这里的block定义究竟是什么，网络上并没有明显的信息。

但其实很简单，就是块设备的扇区ID，扇区大小固定为512字节，设备第一个扇区ID为0，第二个扇区ID为1，依此类推。可直接使用dd命令从设备中dump具体的扇区数据，例如```sudo dd if=/dev/vda of=/tmp/test.txt skip=850192 bs=512 count=8```，将从850192号开始的8个扇区数据导出至文件中。

至此块设备层的问题基本上搞定，接下来就是另外一个难题：如何与具体文件系统如XFS上的文件本身关联起来？

仍然以上面的Block:850192为例，对所有可能的文件执行xfs_bmap命令，例如：

```sudo xfs_bmap ./xxx.bin```，其会输出下列结果：

	./xxx.bin:
		0: [0..127]: 850160..850287
		1: [128..383]: 852264..852519
		2: [384..5079]: 824008..828703
		3: [5080..7719]: 774176..776815

很显然，Block:850192恰好位于该文件所关联的扇区段内。




