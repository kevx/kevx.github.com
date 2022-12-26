Aerospike主索引基本原理
===

注意以下内容以3.15版本为基准，新版AS可能会有所不同

### Primary Index

无论是内存还是SSD模式，AS每条数据都在内存中对应一个索引，这就是主索引概念

根据AS文档描述所知，主索引的长度固定为64字节（每个副本），因此AS对内存的消耗较大，在海量数据下这很容易变成瓶颈和巨大的成本消耗

查阅源码可看到主索引的定义如下：

	typedef struct as_index_s {
		// offset: 0
		cf_atomic32 rc;
		// offset: 4
		cf_digest keyd;
		// offset: 24
		uint64_t right_h: 40;
		uint64_t left_h: 40;
		// offset: 34
		uint16_t color: 1;
		uint16_t unused_but_unsafe: 15;
		// offset: 36
		uint32_t tombstone: 1;
		uint32_t cenotaph: 1;
		uint32_t void_time: 30;
		// offset: 40
		uint64_t last_update_time: 40;
		uint64_t generation: 16;
		// offset: 47
		// Used by the storage engines.
		uint64_t rblock_id: 34;
		uint64_t n_rblocks: 14;
		uint64_t file_id: 6;
		uint64_t set_id_bits: 10;
		// offset: 55
		uint8_t repl_state: 2;
		uint8_t unused_flag: 1;
		uint8_t key_stored: 1;
		uint8_t single_bin_state: 4;
		// offset: 56
		void* dim;
		// final size: 64
	} __attribute__ ((__packed__)) as_index;

其中，该结构体非常紧凑，固定64字节，几个比较核心的字段如下：

* 偏移量4-24：固定20字节的原始数据主KEY的RIPEMD160算法哈希值
* 偏移量47-55：数据在存储设备（一般是SSD）中的逻辑块ID和SET ID（这就是为什么一个namespace下最多只能有1023个SET）
* 偏移量56-63：即dim，在非内存模式中该字段并未使用
* 偏移量34-35：只用了1个比特，剩下均未使用

如果要做改造也许这些未使用的字段都可以采取某种方式规避掉从而减少单条内存占用

### Primary Index 树结构

细心的人可能已经注意到上述索引结构中有三个字段：```right_h/left_h/color```

没错，AS的主索引在内存中是以红黑树的结构来组织

但并非所有的数据都在一棵树上，AS按照"Namespace-Partition"的维度来切分树结构，每个分区对应多个子树（AS把这个叫做Sprig）

之所以这里再次拆分子树是考虑到两个问题：

* 树的深度过深会严重影响查询性能
* 缩小锁的影响范围从而减少并发的锁竞争

树结构定义如下

	//树的定义，每个分区一个
	typedef struct as_index_tree_s {
		as_index_tree_shared	*shared;
		cf_arenax	*arena;
		// 这里的data其实就是一个as_sprig数组
		uint8_t	data[];
	} as_index_tree;
	//子树定义
	typedef struct as_sprig_s {
		cf_arenax_handle	root_h;
		uint64_t	n_elements;
	} as_sprig;

AS如何定位某个KEY在哪一颗子树中呢

很简单，根据KEY HASH值中的某些位来确定，如下所示：

	uint32_t bits = (((uint32_t)keyd->digest[1] & 0xF0) << 4) | (uint32_t)keyd->digest[2];
	uint32_t lock_i = bits >> tree->shared->locks_shift;
	uint32_t sprig_i = bits >> tree->shared->sprigs_shift;

其中，sprig_i就是目标KEY所在的sprig的数组的下标

Sprig子树的个数可以通过```partition-tree-sprigs```参数来控制，默认256，一般建议设置值为1024/2048/4096/8192

增加子树并非是毫无代价的，需要消耗一定的额外内存，速算方式为子树个数除以32，例如设置为2048颗子树额外消耗内存为64MB（单节点集群）

随着集群规模扩大，每个节点的摊到的分区数变少，单节点额外内存消耗则相应降低

此外，CREATE和DELETE操作需要对子树做加锁（但UPDATE操作不需要，因为这个操作并不影响树结构），
锁的个数由```partition-tree-locks```来控制，若业务场景中存在较多的高并发CREATE等操作则建议增大这个配置

### 总结

根据上述原理总结一下AS的主索引查询流程

1. 客户端根据主KEY计算分区，并根据事先获取的分区-节点映射表找到分区对应节点
2. 将KEY的HASH发送至该节点（是否发送原始KEY是可选的）
3. 服务端根据HASH找到对应的子树（Sprig）并使用红黑树的查找定位到最终的index


