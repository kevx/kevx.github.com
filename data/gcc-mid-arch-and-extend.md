## GCC编译器前中端架构解析和扩展

GCC本身是三层架构，每层都负责不同的编译逻辑，其中代码生成（CodeGen）和代码优化（Optimize）部分主要由前中端层来完成，也就是本文重点要展开的内容。其中包含了多个子阶段，称之为Pass，目前有如下几种Pass：

* Parsing，对应前端层，解析代码并转换为抽象语法树
* Gimplify，对应前端和中端，将中间抽象语法树转换为GIMPLE流
* Tree SSA（Static Single Assign），对应中端，输入GIMPLE流并执行代码优化，这是最复杂的一个Pass，程序员所熟知的大部分编译器优化技巧都是在这一步中被落实
* RTL，Register Transfer Language，对应中后端，将GIMPLE流进一步优化并构建为RTL流

GCC4.3以上版本提供了接口扩展功能，开发者可按照规范开发动态库并在编译时加上对应参数，随后GCC将会在某个Pass阶段（由动态库自行指定）调用动态库以实现个性化代码优化或生成逻辑。

值得一提的是GCC的三层架构并未做到严格的完全解耦，如果仔细观察代码还是会看到很多相互依赖的地方。

### Front-End，前端层

专注于解析处理具体的语言语法细节并构建输出为一种所谓的"GENERIC"的树状表达式序列。尽管在一开始GCC并未考虑多语言情况，但如今GCC的定义已经由GNU C Compiler变成了GNU Compiler Collection，当前的GCC已经完整支持多种语言前端，但通常来说重点还是C/C++。

使用独立的前端层有一个显著的好处：语法解析无需关心具体的机器架构，这一层的开发者只需专注在语言本身的特性，且生成的中间结果（也就是GENERIC）跟具体的目标机器架构无关，无论是x86或者aarch64都是（基本）相同的。因此移植适配不同的平台时这一层基本不用大改，逻辑都可以直接复用。这一点对于诸如C++这种复杂的语言来说非常重要，毕竟没有人希望仅仅是为了适配一种新的CPU（如RISC-V）就得从头开始实现一遍C++语法解析器。

GENERIC核心数据结构则是```tree```，它本身是一种指针，但其指向的对象千奇百怪，可以是函数定义、表达式等，可以使用```TREE_CODE```宏来获取当前tree的实际类型。大部分的tree code定义可以在源码中的```tree-code.def```文件中找到。可以说在前中端层一切皆为tree。

我们通过build系列函数来构建一个新的tree，从build0到build6，后缀的数字表示操作数的个数，函数基本签名为```code, type, [operands]```。例如构建一个对某变量tree的自增表达式：

	tree pre_incr = build2(
		PREINCREMENT_EXPR, 
		integer_type_node, 
		var1_tree, 
		build_int_cst(integer_type_node, 1)
	);

注意，这里的返回值pre_incr是表达式类型，不可作为左值使用。

### Middle-End，中端层

这一层有的时候可称为优化器（Optimizer），顾名思义就是通过分析GENERIC序列数据，并执行无效代码、无效分支消除等优化措施，更高级一点的还有向量化等现代化优化机制。

中端层最重要的工作之一是将GENERIC进行GIMPLE化。GIMPLE这个词汇本身并没有任何意义，它的设计思想来源于McGill大学的McCAT编译器中使用的SIMPLE IL中间代码，因此GNU+SIMPLE大概就是其最初的名称来源。那么何谓GIMPLE化？首先要了解GIMPLE，这是一种三元操作符组合，每个组合中的操作符不超过三个，其实很好理解，例如下列复杂表达式：

	a = ((b+c)*3) >> d

进行GIMPLE化之后的结果如下：

	t1 = (+, b, c)
	t2 = (*, t1, 3)
	a  = (>>, t2, d)

很显然GIMPLE会引入大量中间临时变量。此外，条件控制语句也会被GIMPLE化为条件化跳转。所有的条件判断都可以抽象为一个或多个if三元操作符，例如(if, cond, dst)，如果cond条件为真则跳转到dst地址。

从GENERIC到GIMPLE的过程一般称为Lower，每经过一层Lower，生成的结果就越接近最终的机器码，跟原始的代码差异就越大。我们可以在编译时通过加上```-fdump-tree-gimple```参数来查看生成的GIMPLE中间数据。

#### Expression和Statement

一个经常令人困惑的问题是：expression和statement有什么区别？大部分编程语言里它们似乎是同样的东西，但在GCC中后者专指赋值操作，而诸如```a+b```则是expression。此外，变量声明、GOTO标签、GOTO语句、返回语句（RETURN）、SWITCH语句、C++对象析构调用，也被认为是statement。当然，无论是哪个其定义方式基本相同，在下文中统一称为表达式。

表达式基本可以分为常量和变量两种类型，其中常量表达式很简单，例如：
	
	tree int_const = build_int_cst(integer_type_node, 1)

常见的变量表达式类型如下，包括一元和二元结构：

* BIT_NOT_EXPR，按位取反
* PREDECREMENT_EXPR/PREINCREMENT_EXPR，前置自增/自减
* POSTDECREMENT_EXPR/POSTINCREMENT_EXPR，后置自增/自减
* FLOAT_EXPR，将整型转化为浮点
* FIX_TRUNC_EXPR，浮点转为整型
* NOP_EXPR，无操作，例如int\*强制转换为int时，本质上并无任何代码产生
* LSHIFT_EXPR/RSHIFT_EXPR，按位左移/右移
* BIT_IOR_EXPR/BIT_XOR_EXPR/BIT_AND_EXPR，按位或/异或/与
* PLUS_EXPR/MINUS_EXPR/MULT_EXPR，数学加减乘
* LT_EXPR/LE_EXPR/GT_EXPR/EQ_EXPR/NE_EXPR，条件判断，小于/小于等于/大于/等于/不等
* MODIFY_EXPR，赋值型表达式

还有很多其它类型这里不一一列举，请查询GCC文档。使用上面的build系函数可构建新的表达式tree，例如：

	tree modify_expr = build2(
		MODIFY_EXPR, integer_type_node, int_var1, int_var2
	);

不同类型的表达式涉及的操作数的数量显然不一样，因此在build时需严格注意。

一旦build完成后需要尽快对tree执行gimple化操作。

#### GIMPLIFIER

应该如何由tree构建出GIMPLE？GCC提供了多种选择。

* gimple_build_assign (tree lhs, tree rhs)
* gimple_build_assign_with_ops (enum tree_code subcode, tree lhs, tree op1, tree op2)
* gimplify_function_tree (tree)

前两个是最常用的assign函数，它们均返回一个GIMPLE_ASSIGN对象而不是赋值后的左值对象，此外函数参数列表中的lhs只能是左值类型，例如一个指向static变量的tree，而rhs可以是一元或二元表达式，也可以是其它的左值，但不能是GIMPLE_ASSIGN对象本身，换句话说如果用户希望构建类似下面的代码逻辑：
	
	a = x << 2;
	b = a;

则需要先使用gimple_build_assign_with_ops构建出第一行代码并使用gimple_assign_lhs获取第一行代码中的左值，然后再次调用gimple_build_assign将该左值赋值给b。

而第三个函数则可以将之前定义过的函数进行gimple化，它本身并不返回任何值。

#### Function，函数

无论是C还是Cxx都可以认为是由一个个的函数组成，而函数可以抽象为4个核心部分：名称、参数、返回值、函数体，GCC提供了多个宏来操作函数定义，它们都以DECL_开头，例如：

* DECL_NAME，获取或设置函数名
* DECL_ARGUMENTS，获取或设置参数
* DECL_RESULT，获取或设置返回值
* DECL_INITIAL，定义函数体，由多个Block组成，Block之间可嵌套或链式关联，Block可以近似对应为C中由花括号包裹的代码区块。

如果开发者希望在Block中加入自定义逻辑则可以考虑使用build3对Block执行BIND_EXPR将一组表达式关联进去。

	tree stmt_list = alloc_stmt_list();
    tree bind_expr = build3(BIND_EXPR, void_type_node, NULL, stmt_list, block);
    tree_stmt_iterator stmt_it = tsi_start(stmt_list);

然后可通过迭代器tree_stmt_iterator逐个关联自定义的表达式。

需要注意的是GCC中还有一个Basic Block（以下简称BB）概念，但BB和上面提到的Block并不是同一种东西，BB是一组线性代码且分别只有一个入口和出口，可见一个函数可以有多个BB；此外所有的BB均已经GIMPLE化，开发者可通过gsi_start_bb函数来迭代获取BB中的每一个GIMPLE表达式，例如：

	gimple_stmt_iterator gsi;
	for (gsi = gsi_start_bb(bb); !gsi_end_p (gsi); gsi_next (&gsi)) {
		gimple g = gsi_stmt (gsi);
		...
	}

而定义一个新的函数可通过build_fn_decl来完成，跟上面的build系函数一脉相承，同样工作在GENERIC阶段，但匪夷所思的是这个函数在GCC文档中似乎并没有任何说明，原型如下：

	tree build_fn_decl (const char *, tree)

其中第二个参数代表函数的输入参数列表，我们可使用build_function_type_list()来生成这样的列表。

此外可定义函数的一些额外属性，例如是否时静态函数、虚函数等，GCC同样提供了另外一组宏操作：

* TREE_PUBLIC，对应C的extern语义
* TREE_STATIC，同理
* TREE_READONLY，函数仅能访问传入的参数
* DECL_PURE_P，函数是否会访问全局变量
* DECL_VIRTUAL_P，是否是虚函数
* DECL_ARTIFICIAL，函数是否由编译器生成（而不是代码显式定义）

函数定义完成后需要尽快对其Gimple化，否则将不起作用。

#### GENERIC or GIMPLE 

从前文中可得知GENERIC和GIMPLE阶段都可以控制具体的CodeGen逻辑，对于需要扩展GCC的场景，我们应该选择在哪一阶段介入呢？两者主要区别在于GENERIC抽象程度更高，而GIMPLE阶段控制粒度更为细腻（换句话说就是繁琐），因此一般来说先通过GENERIC的API来构建出目标逻辑，然后将其GIMPLE化即可。

#### Tree SSA

不要被该Pass的名称所误导，这一Pass的主要逻辑是代码优化，而SSA化仅仅只是开始优化前的第一个步骤。

有的人可能不太了解SSA究竟是个什么过程，下面举个例子，假设有如下代码：

	int a,b;
	a = 1;
	a = b;

很显然，中间这个赋值操作是毫无意义的，任何一个现代的编译器都会将这行无意义的代码给优化掉。GCC的做法很简单，首先将上述代码转换类似下面的形式：

	a.1 = 2;
	a.2 = b;

即每次赋值均产生一个新的变量别名，在后续处理流程中很容易判断a.1未被使用，可直接移除。

在Tree SSA阶段执行的优化措施非常多，例如：

* Remove useless statements，无效语句消除
* OpenMP lowering & expansion，代码并行化生成和优化
* Lower control flow，条件控制（也就是if语句）优化
* Build the control flow graph，拆解函数为block并构建为调用图
* Find all referenced variables，变量引用遍历
* Dead code elimination，无效代码消除
* Loop optimization，循环优化，著名的向量化优化就是在这一步实现
* Tail recursion elimination，尾递归消除
* ...

#### RTL

中端层完成GIMPLE化后下一步便是将这部分数据流转换为RTL，这是一种非常接近汇编的中间语言，本身是一种线性结构。RTL阶段也有较多的优化流程，但本文暂不展开。

### Back-End

这一层用于接收中端优化结果，也就是RTL化的指令序列，并转换为目标架构的机器码，本文暂不展开。
