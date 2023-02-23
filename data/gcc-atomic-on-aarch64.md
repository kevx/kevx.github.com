GCC原子操作符在AArch64架构上的指令解析
===

### 原子操作符

对于多线程应用而言原子操作必不可少，最新的C11标准已经加入了stdatomic.h，从语言层面提供了解决方案。在老版本中GCC原子操作通过builtin函数实现，即以```__sync```和以```__atomic```为前缀的函数集，例如：

* ```__sync_lock_test_and_set```，ACQUIRE语义，原子set+get
* ```__sync_lock_release```，RELEASE语义，原子set
* ```__atomic_test_and_set```，单字节类型原子set+get
* ```__atomic_exchange_n```，语义可自定义，任意类型原子set+get
* 等等

其中__atomic系列明显与C11标准更为接近一些，提供了标准的内存序相关的语义：

* ```__ATOMIC_RELAXED```，宽松，可以认为是不做任何特殊处理
* ```__ATOMIC_SEQ_CST```，严格总体有序，保证最终指令严格有序执行，性能会有一定影响
* ```__ATOMIC_ACQUIRE```，happens-after语义读，针对当前内存对象的读写操作必然发生在ACQUIRE动作之后
* ```__ATOMIC_RELEASE```，happens-before语义写，针对当前内存对象的读写操作必然发生在RELEASE动作之前

其中，```__sync_lock_test_and_set```和```__atomic_exchange_n```从功能上几乎相同，那么实际编译结果会有什么区别？GCC文档并未给出明确说明，但从其代码中可知，```__sync```系函数本质上实现的是SEQ_CST语义（但实际的实现存在出入）。

### 多个GCC版本中的结果

众所周知AArch64是一种弱内存序架构，CPU会对代码流中的指令进行重排，若不加以控制则会产生严重的逻辑错误。程序员必须和编译器一起来保证代码的逻辑正确性，手动在代码控制内存顺序。由于GCC内置了上述支持，这部分工作负担得以减轻。下面的示例代码分别演示了GCC两种原子交换操作：

	#include <stdint.h>

	#define xchg(__ptr, __val) __sync_lock_test_and_set(__ptr, __val)
	#define axchg(_target, _value) __atomic_exchange_n(_target, _value, __ATOMIC_RELEASE)

	uint32_t g_var;

	void fn1() {
		xchg(&g_var, 1);
	}

	void fn2() {
		axchg(&g_var, 2);
	}

使用GCCv9版本编译后的汇编结果如下：

	0000000000000000 <fn1>:
	   0:   90000000        adrp    x0, 4 <fn1+0x4>
	   4:   91000000        add     x0, x0, #0x0
	   8:   52800021        mov     w1, #0x1                        // #1
	   c:   885ffc02        ldaxr   w2, [x0]
	  10:   88037c01        stxr    w3, w1, [x0]
	  14:   35ffffc3        cbnz    w3, c <fn1+0xc>
	  18:   d65f03c0        ret

	000000000000001c <fn2>:
	  1c:   90000000        adrp    x0, 4 <fn1+0x4>
	  20:   91000000        add     x0, x0, #0x0
	  24:   52800041        mov     w1, #0x2                        // #2
	  28:   885f7c02        ldxr    w2, [x0]
	  2c:   8803fc01        stlxr   w3, w1, [x0]
	  30:   35ffffc3        cbnz    w3, 28 <fn2+0xc>
	  34:   d65f03c0        ret

两个函数几乎一模一样，关键差异点在于fn1函数中使用```ldaxr+stxr```实现原子交换；而fn2函数则采用```ldxr```和```stlxr```；从ARM官方手册可知，```ldaxr```自身带有Acquire语义；而```stlxr```则带有Release语义（因为代码中显式指定）。跟GCC预期不符，这里并未实现total ordering。

此外，即使是```ldaxr+stlxr```也并不等同于一个完整的内存屏障，因为它们仅对当前所操作的指针指向的目标内存区域有效，而其它内存区域的操作不受影响，仍然可能会被重排。这种情况下并不能把原子操作当作一个完整意义上的内存屏障使用。

如果代码逻辑只关心当前所操作的目标对象的逻辑一致性则没有任何问题，否则还是需要传统屏障。这也是老版内核的原子操作函数中存在的一个BUG。

内核在2014年针对这个问题做过一次修正，详情可以查看 http://lists.infradead.org/pipermail/linux-arm-kernel/2014-February/229588.html

而GCC自己也意识到了这一问题并在v5.0之后版本中做了修复，参考 https://gcc.gnu.org/bugzilla/show_bug.cgi?id=65697

使用GCCv9版本编译后的汇编结果如下：

	0000000000000000 <fn1>:
	   0:   90000000        adrp    x0, 4 <fn1+0x4>
	   4:   91000000        add     x0, x0, #0x0
	   8:   52800021        mov     w1, #0x1                        // #1
	   c:   885f7c02        ldxr    w2, [x0]
	  10:   88037c01        stxr    w3, w1, [x0]
	  14:   35ffffc3        cbnz    w3, c <fn1+0xc>
	  18:   d5033bbf        dmb     ish
	  1c:   d503201f        nop
	  20:   d65f03c0        ret

	0000000000000024 <fn2>:
	  24:   90000000        adrp    x0, 4 <fn1+0x4>
	  28:   91000000        add     x0, x0, #0x0
	  2c:   52800041        mov     w1, #0x2                        // #2
	  30:   885ffc02        ldaxr   w2, [x0]
	  34:   8803fc01        stlxr   w3, w1, [x0]
	  38:   35ffffc3        cbnz    w3, 30 <fn2+0xc>
	  3c:   d503201f        nop
	  40:   d65f03c0        ret

可以看到这里load和store操作的内存序语义则全部去掉了，并显式插入了传统的内存屏障，即```dmb ish```，很显然这会带来一定程度性能上的损耗。

然而```__atomic```系函数仍然保持了跟C11标准语义的一致，未插入完整的屏障，可见在新版GCC中```__sync```系的内存顺序更强，几乎等同于total ordering的效果。

### ARMv8.1的更新

在这个版本的CPU中，ARM增加了原子指令集atomics，我们可以使用lscpu命令查看输出结果Flags中是否包括atomics。注意如果要利用这个指令集，需在编译参数中加入```-march=armv8.1-a```，产生的汇编结果如下：

	0000000000000000 <fn1>:
	   0:   90000000        adrp    x0, 4 <fn1+0x4>
	   4:   91000000        add     x0, x0, #0x0
	   8:   52800021        mov     w1, #0x1                        // #1
	   c:   b8a18001        swpa    w1, w1, [x0]
	  10:   d503201f        nop
	  14:   d65f03c0        ret

	0000000000000018 <fn2>:
	  18:   90000000        adrp    x0, 4 <fn1+0x4>
	  1c:   91000000        add     x0, x0, #0x0
	  20:   52800041        mov     w1, #0x2                        // #2
	  24:   b8618001        swpl    w1, w1, [x0]
	  28:   d503201f        nop
	  2c:   d65f03c0        ret

这里省去了load和store操作，仅一条指令完成原子交换操作。如果将```__atomic_exchange_n```的语义替换为```__ATOMIC_SEQ_CST```则生成的指令会变为swpal，即同时具有Acquire和Release语义。




