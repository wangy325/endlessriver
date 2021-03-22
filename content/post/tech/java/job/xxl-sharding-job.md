---
title: "在xxl-job中使用分片任务"
date: 2021-01-25
lastmod: 2021-01-25
draft: false
tags: [Java,任务调度,开源框架]
categories: [java]
author: "wangy325"

hasJCKLanguage: true

weight: 10
mathjax: true
autoCollapseToc: false

---

[xxl-job](https://www.xuxueli.com/xxl-job/#%E3%80%8A%E5%88%86%E5%B8%83%E5%BC%8F%E4%BB%BB%E5%8A%A1%E8%B0%83%E5%BA%A6%E5%B9%B3%E5%8F%B0XXL-JOB%E3%80%8B)是国内开发者提供的一款轻量级分布式任务调度平台，开发者是大众点评的工程师，其目前维护一个[开源社区](https://www.xuxueli.com/)，里面还有很多已经发布或尚在孵化的开源项目。

本文介绍在如何在xxl-job中使用创建并使用分片任务。

**任务分片**是一个以空间换时间的概念，旨在将耗时任务进行拆分，然后同时执行，拆分之后执行的结果对任务任务原来不分片执行的结果没有影响。

> 比如要核对id从1-1000的用户的邮箱信息，找出无效的邮箱信息。可以将id分成合适的多小段，1-100，101-200，...，901-1000，然后交给不同的任务去执行。这就是任务分片的简单模型。

在阅读此文之前，需要理解xxl-job的基本模型与工作流程，其核心概念有2:

- 调度中心

    负责管理调度信息，按照调度配置发出调度请求，自身**不承担**业务代码。调度系统与任务**解耦**，提高了系统可用性和稳定性，同时调度系统性能不再受限于任务模块；

    支持可视化、简单且动态的管理调度信息，包括任务新建，更新，删除，GLUE开发和任务报警等，所有上述操作都会**实时生效**，同时支持监控调度结果以及执行日志，支持执行器Failover。
- 执行器

    负责接收调度请求并执行任务逻辑。任务模块专注于任务的执行等操作，开发和维护更加简单和高效；接收“调度中心”的**执行请求、终止请求和日志请求**等。

调度中心**自动发现并注册**执行器，并且通过执行器提供的api对任务进行调度（执行/终止等操作）。

<!--more-->

本文测试所使用的xxl-job所有模块基于最新的迭代版本<span id="v">**v2.3.0**</span>，此次迭代中配置分片任务的方式与之前版本有些许不同：

>
- 【新增】新增任务辅助工具 `XxlJobHelper`：提供统一任务辅助能力，包括：任务上下文信息维护获取（任务参数、任务ID、分片参数）、日志输出、任务结果设置……等；
- `ShardingUtil` 组件废弃：改用 `XxlJobHelper.getShardIndex()/getShardTotal();` 获取分片参数；
- `XxlJobLogger` 组件废弃：改用 `XxlJobHelper.log` 进行日志输出；

其他更新日志可以查看该版本的[RELEASE NOTE](https://www.xuxueli.com/xxl-job/#7.31%20%E7%89%88%E6%9C%AC%20v2.3.0%20Release%20Notes[%E8%BF%AD%E4%BB%A3%E4%B8%AD])

在xxl-job中，可以通过两种方式实现分片任务：

1. 单实例多任务执行分片，等效于前文中的例子，将一个大任务拆分成多个小任务；
2. 多实例单任务执行分片，将任务按照一定的方式分配到多个实例上去运行——以多个实例上配置相同的任务为前提；

## 模拟需要完成的工作

在开始之前，我们先模拟需要完成的工作：有100个账户，每个账户有随机1-10条数据需要处理。代码片段如下

```java
private final static Random RAND = new Random(47);

/**
 * 100 ids
 */
private static final List<Integer> CITY_ID_LIST = new ArrayList<Integer>() {{
    for (int i = 1; i <= 100; i++) {
        add(i);
    }
}};

/**
 * task num for each id
 */
private static int task_num_per_id;

/**
 * 任务数据库
 */
private static final Map<Integer, List<String>> TASKS;

static {
    TASKS = new HashMap<>();
    CITY_ID_LIST.forEach(city -> {
        task_num_per_id = RAND.nextInt(10);
        List<String> cityTasks = new ArrayList<>(task_num_per_id);
        IntStream.rangeClosed(1, task_num_per_id).forEach(index -> {
            String orderInfo = city + "------NO." + index;
            cityTasks.add(orderInfo);
        });
        TASKS.put(city, cityTasks);
    });
}
```

## 单实例多任务分片

当使用单执行器实例时，我们可以在调度中心**创建多个任务**，通过分配不同的任务参数来实现任务的分片。任务的实现代码如下所示：

```Java
@XxlJob("singleExecutorMultiThreads")
public void singleExecutorMultiThreadsCityJob() throws Exception {
    // 当不配置参数时，此方法返回空字符串""
    String shards = XxlJobContext.getXxlJobContext().getJobParam();
    XxlJobHelper.log("XXL-JOB, 单机分片任务开始. 分片参数：{}", shards);

    if (StringUtils.isEmpty(shards)) {
//            XxlJobHelper.handleFail("任务参数不能为空！");

        // 不分片，全量执行
        IntStream.range(0, CITY_ID_LIST.size())
                .forEach(i -> {
                    int cityId = CITY_ID_LIST.get(i);
                    List<String> task = TASKS.get(cityId);
                    task.forEach(t -> XxlJobHelper.log("【{}】执行【{}】，任务内容为：{}",
                        Thread.currentThread().getName(), cityId, t));
                });
    } else {
        // 分片执行
        Arrays.stream(shards.split(","))
            .map(String::trim)
            .filter(StringUtils::isNotBlank)
            .map(Integer::parseInt)
                .forEach(cityId -> {
                    List<String> task = TASKS.get(cityId);
                    Optional.ofNullable(task).ifPresent(todoTasks -> {
                        todoTasks.forEach(t ->
                            XxlJobHelper.log("【{}】执行【{}】，任务内容为：{}",
                                Thread.currentThread().getName(), cityId, t));
                    });
                });
    }

}
```

在调度中心，我们可以像这样创建分片任务：

![单实例分片](/img/xxl-job-standalone-sharding.jpg)

可以根据情况创建任务数，来进行单实例复杂任务的分片。

配置完成后的任务列表看起来像这样：

![单实例分片任务列表](/img/xxl-job-standalone-sharding-list.jpg)

这2个任务使用不同的**任务参数**，其他配置可以大体相同甚至完全一致。

这里需要说明的是，[当前版本](#v)对于任务参数的处理做了修改，`JobHandler`中的方法不再直接直接调用含有参数的任务方法，而是通过`XxlJobContext.getXxlJobContext().getJobParam()`直接在任务中获取分片参数。

配置完成之后，我们执行任务，即可以看到调度日志（部分）：

![log1](/img/xxl-job-standalone-sharding-log1.jpg)
![log2](/img/xxl-job-standalone-sharding-log2.jpg)

可以看到，执行器开启了不同的线程分别执行分片任务，这样可以节省任务执行的时间开销。

这就是xxl-job的单实例分片任务创建方法。

需要说明的是，上面的任务如果不设置分片参数，那么将会执行全部的任务。

## 多实例分片广播

在多执行器实例的情况下，分片任务有多种路由策略，此处暂且不讨论路由策略，在**分片广播**的模式下进行测试。分片任务的实现代码如下：

```java
@XxlJob("multiExecutorsSharding")
public void multiExecutorShardingCityJob() throws Exception {
    XxlJobHelper.log("XXL-JOB, 多实例分片任务开始.");
    int shardIndex = XxlJobHelper.getShardIndex();
    int shardTotal = XxlJobHelper.getShardTotal();

    IntStream.range(0, CITY_ID_LIST.size()).forEach(i -> {
        if (i % shardTotal == shardIndex) {
            int cityId = CITY_ID_LIST.get(i);
            List<String> task = TASKS.get(cityId);
            Optional.ofNullable(task).ifPresent(todoTasks -> {
                todoTasks.forEach(t -> XxlJobHelper.log("实例【{}】执行【{}】，任务内容为：{}",
                shardIndex, cityId, t));
            });
        }
    });
}
```

可以看到，实际上是通过对所有**执行器实例id取模**的方式，将任务均匀地分配到所有的执行器上去执行。

调度中心创建任务像这样：

![多实例分片任务](/img/xxl-job-dis-sharding.jpg)

在这个模式下，任务并没有设置分片参数，不过我们需要**额外启动**一个执行器实例：

```
java -jar -Dserver.port=8082 -Dxxl.job.executor.port=9998
    xxl-job-executor-sample-springboot-2.3.0-SNAPSHOT.jar
```
上述指定的端口需要和之前的实例不同即可。

运行任务成功之后，我们可以看到调度日志（部分）：

![dis-log1](/img/xxl-job-dis-sharding-log1.jpg)
![dis-log2](/img/xxl-job-dis-sharding-log2.jpg)

从日志可以看出，任务被规律地分配到了2个执行器实例上。

## 参考

- [XXL-JOB任务分片-伊布拉西莫-csdn](https://blog.csdn.net/it_freshman/article/details/105421781)
