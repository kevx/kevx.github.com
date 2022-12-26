如何编译基于musl-libc的busybox
===

在云原生环境下很多业务会选择alpine作为基础镜像来构建应用，alpine自身没有使用常规的glibc和相应的coreutils，而是基于musl libc + buysbox组合

而busybox本身存在着一些问题，有时候会需要修改其代码；官方的构建手册上并没有明确说明如何基于musl来构建，本文主要介绍一种比较可行的方式


#### 编译机

一般使用常规的x64 linux机器即可，内核版本3.10以上（建议），另外请事先安装好gcc和kernel-header

#### 源码准备

将musl和busybox源码全部下载到目标机器，体积都不大，每个源码包1兆左右，分别解压到/tmp/busybox和/tmp/musl，源码修改请自行进行，随心所欲

#### 构建musl

首先我们构建出musl

	cd /tmp/musl
	./configurre --prefix=/tmp/musl
	make
	make install
	PATH=/tmp/musl/bin:$PATH
	export PATH

一般来说这一步基本不会有什么问题

#### 准备musl交叉编译环境

	cd /tmp/musl
	ln -s `which ar` musl-ar
	ln -s `which strip` musl-strip
	#链接linux的头文件目录
	cd /tmp/musl/include
	ln -s /usr/include/linux linux
	ln -s /usr/include/asm asm
	ln -s /usr/include/asm-generic asm-generic

#### 配置busybox

建议使用make menuconfig进行可视化配置，请去掉misc中nand开头的几个工具以及ubi相关的工具，原因是这几个功能需要安装额外的依赖库且一般没人使用这些功能

（谁会在服务器上使用ubifs呢??）

另外inetd和ifplugd功能也需要关闭

开启静态链接'Build static binary'并修改'Cross compiler prefix'的值为'musl-'

按照官方说法，以下选项也需要确保关闭状态，可在.config中查看

	# CONFIG_EXTRA_COMPAT is not set 
	# CONFIG_SELINUX is not set 
	# CONFIG_FEATURE_HAVE_RPC is not set 
	# CONFIG_WERROR is not set 
	# CONFIG_FEATURE_SYSTEMD is not set 
	# CONFIG_FEATURE_VI_REGEX_SEARCH is not set 
	# CONFIG_PAM is not set 
	# CONFIG_FEATURE_INETD_RPC is not set 
	# CONFIG_SELINUXENABLED is not set 
	# CONFIG_FEATURE_MOUNT_NFS is not set

也可以自定义开启或关闭其它的feature

这样就可以了

#### 编译busybox

执行make即可


