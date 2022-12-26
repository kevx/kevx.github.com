LuaJIT在64位环境下的潜在问题
===

#### 问题背景和描述

我们生产环境有一个数据库支持服务端Lua脚本，近段时间在两台不同机器上出现了总共两次出现进程异常退出，好在生成了coredump，得以有机会窥视内在原因

错误时的异常堆栈信息如下图所有：

![](/images/user/lua-jit-1.png) 

结合代码分析，lua库函数lua_open（其实是一个宏，实际函数是luaL_newstate）返回了NULL，这是一个极不寻常的事情，根据官方极为有限的文档可知，lua_open只可能在内存分配失败的时候返回NULL。因此我们首先考虑到机器内存有问题，运维同学检查后并未发现。

#### 问题分析（TL;DR）

此时只能继续深入分析Lua库函数本身的实现，以下代码均来自于LuaJIT的库源代码。

	#define lua_open()  luaL_newstate()
	...
	  
	/**
	 * Creates a new context (lua_State) populating it with default values.
	 *
	 * @return a new lua_State
	 */
	static lua_State * create_state(context * ctx, const char * filename) {
	    lua_State * l   = NULL;
	 
	    l = lua_open();
	    // 这里返回了NULL
	    luaL_openlibs(l);
	 
	    ...
	}
	  
	LUALIB_API lua_State *luaL_newstate(void)
	{
	    lua_State *L;
	    void *ud = lj_alloc_create(); // 实际上是因为这里返回NULL
	    if (ud == NULL) return NULL;
	    ...
	}
	 
	 
	void *lj_alloc_create(void)
	{
	  size_t tsize = DEFAULT_GRANULARITY;
	  char *tbase;
	  INIT_MMAP();
	  tbase = (char *)(CALL_MMAP(tsize));
	  if (tbase != CMFAIL) {
	    ...
	  }
	  return NULL;
	}

经过GDB调试，最终发现mmap返回了-1，errno错误码12，查阅内核文档表示```ENOMEM 12 Cannot allocate memory```，因此这个原因是非常清晰明确的，这里的mmap启用了MAP_32BIT标记，此时内核将只在低32位地址空间内分配内存，尽管32位地址最大寻址允许4GB，但Linux内核当前设计决定了这里实际只有1G地址可用且没有可调性

#### Lua JIT为什么要这么设计？

根据官方说法，Lua针对的是小而美场景，不适合运行大型复杂脚本，更不适合创建大量对象，在64位环境下，若不启用MAP_32BIT则Lua的GC性能会受到严重影响


 