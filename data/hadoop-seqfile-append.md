Hadoop Sequncefile 追加模式
===

Sequncefile（以下简称seqfile）是一种可压缩的二进制文件，支持多种
压缩模式，如Block，Record等，在Hadoop有广泛的使用。但是seqfile
目前是无法支持append模式，何谓append，即首次创建文件后进行close，
然后重新打开写。

这一点是让人匪夷所思的，按照常规思维来说append是非常自然的操作，理应
被支持。
在stackoverflow上有人提议，在createWriter的时候传入一个FSOutputStream
可以规避该问题，事实上该方法是无效的。

通过查阅SequenceFile.Writer的代码可以看到，每次createWriter
之后，会写入文件头，不管之前是否已经有文件头。按照seqfile的规范重写一个
支持append的模块应该也是可行的，不过目前我没有精力做这个事情。

对于需要实时写入的场景，尽量使用纯文本文件方式。或者按照小时批量一次性
写入独立文件，最后统一做一次merge操作。




