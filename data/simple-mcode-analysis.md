一个简易机器码程序的解析
===

网上流传着一个极简C代码如下：

	const int main[] = {
	    -443987883, 440, 113408, -1922629632,
	    4149, 899584, 84869120, 15544,
	    266023168, 1818576901, 1461743468, 1684828783,
	    -1017312735
	};

这个代码用gcc可以直接编译通过，只支持Linux平台

程序会输出下列结果

	Hello World!

很多人没有明白它的原理，这里简单做一个分析（没有那么复杂）

gcc在编译时会将main数组直接放在.rodata这个section内
然后c库（我们的glibc）在完成相关初始化流程后跳转到main的地址

为什么.rodata会有可执行权限（executable）？

因为链接器非常“聪明”，它通常会将.text和.rodata合并在一起

---

下面开始分析代码本身

main数组里放的其实就是事先编写好的x86机器码

将这个数组以二进制形式写入到文件中（例如zz.bin）

然后使用 ```objdump -D -Mintel,x86-64 -b binary -m i386  --stop-address=0x25 zz.bin ``` 即可看到可读性较强的汇编代码

	00000000 <.data>:
	   0:	55                   	push   rbp
	   1:	48 89 e5             	mov    rbp,rsp
	   4:	b8 01 00 00 00       	mov    eax,0x1
	   9:	bb 01 00 00 00       	mov    ebx,0x1
	   e:	67 8d 35 10 00 00 00 	lea    esi,[eip+0x10]        # 0x25
	  15:	ba 0d 00 00 00       	mov    edx,0xd
	  1a:	0f 05                	syscall 
	  1c:	b8 3c 00 00 00       	mov    eax,0x3c
	  21:	31 db                	xor    ebx,ebx
	  23:	0f 05                	syscall 
	  25:	48                   	rex.W
	  26:	65                   	gs
	  27:	6c                   	ins    BYTE PTR es:[rdi],dx
	  28:	6c                   	ins    BYTE PTR es:[rdi],dx
	  29:	6f                   	outs   dx,DWORD PTR ds:[rsi]
	  2a:	20 57 6f             	and    BYTE PTR [rdi+0x6f],dl
	  2d:	72 6c                	jb     0x9b
	  2f:	64 21 0a             	and    DWORD PTR fs:[rdx],ecx
	  32:	5d                   	pop    rbp
	  33:	c3                   	ret    

注意lea这一行代码，这里将偏移量0x25开始的数据载入到esi寄存器

而0x25往下的汇编代码其实是无效的（objdump将其误认为代码），它们其实是数据，也就是"Hello World!"字符串ASCII码

代码里还有两处syscall，我们知道Linux的系统调用编号通过eax寄存器传递，第一次syscall的编号是0x1，查询内核文档可知这是一个sys_write，也就是往文件句柄中写入数据，而ebx就是文件句柄的值（0x1指标准输出），esi指向待写入的数据起始地址，edx存放待写入数据的长度，注意这个字符串包含了一个换行符，因此长度就是13（0xd）

第二次syscall(0x3c)则是sys_exit，也就是退出当前进程


